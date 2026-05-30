import { Telegraf, Markup } from 'telegraf';
import { message } from 'telegraf/filters';
import { config } from '../config';
import { transcribeAudio } from './groq.service';
import { extractFromText, extractFromImage } from './groq-extraction.service';
import { getOrCreateUser, insertTransaction, getTransactions, getMonthNetBalance, supabase } from './db.service';
import { AITransaction } from '../types';
import { createWriteStream, appendFileSync } from 'fs';
import { randomBytes } from 'crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const bot = new Telegraf(config.botToken);

const pendingTransactions = new Map<string, AITransaction>();
const editStates = new Map<number, { txnId: string; field: string }>();

function storeTransaction(t: AITransaction): string {
  const id = randomBytes(4).toString('hex');
  pendingTransactions.set(id, t);
  setTimeout(() => pendingTransactions.delete(id), 5 * 60 * 1000);
  return id;
}

function retrieveTransaction(id: string): AITransaction | null {
  return pendingTransactions.get(id) || null;
}

function escapeMarkdown(text: string): string {
  return text.replace(/([_*[\]()~`>#+\-=|{}.!])/g, '\\$1');
}

function logVoice(msg: string) {
  try { appendFileSync('voice_errors.log', `[${new Date().toISOString()}] ${msg}\n`); } catch {}
}

bot.start(async (ctx) => {
  const user = ctx.from;
  await getOrCreateUser(String(user.id), user.username || null);

  const userId = String(user.id);
  const balance = await getMonthNetBalance(userId);
  const balanceStr = `Rp ${balance.toLocaleString('id-ID')}`;

  const raw = `Selamat datang! Saya akan mencatat keuangan Anda.

Sisa saldo Anda : Rp ${balanceStr}

Kirim:
• Teks
• Voice Note
• Foto struk

Gunakan /report untuk laporan lengkap.`;

  await ctx.reply(escapeMarkdown(raw), { parse_mode: 'MarkdownV2' });
});

async function handleTransactionInput(ctx: any, transaction: AITransaction) {
  const txnId = storeTransaction(transaction);
  await sendConfirmation(ctx, txnId, transaction, false);
}

async function sendConfirmation(
  ctx: any,
  txnId: string,
  transaction: AITransaction,
  isEdit: boolean = false
) {
  const amountStr = `Rp ${transaction.amount.toLocaleString('id-ID')}`;
  const title = isEdit ? 'Ringkasan Transaksi \\(Diperbarui\\)' : 'Ringkasan Transaksi';
  const escapedCategory = escapeMarkdown(transaction.category);
  const escapedDesc = escapeMarkdown(transaction.description);

  const text =
    `*${title}*\n\n` +
    `Jenis: *${transaction.type === 'INCOME' ? 'Pemasukan' : 'Pengeluaran'}*\n` +
    `Jumlah: \`${amountStr}\`\n` +
    `Kategori: *${escapedCategory}*\n` +
    `Catatan: ${escapedDesc}\n` +
    `Keyakinan: *${Math.round(transaction.confidenceScore * 100)}%*`;

  await ctx.reply(text, {
    parse_mode: 'MarkdownV2',
    reply_markup: {
      inline_keyboard: [
        [
          { text: 'Simpan', callback_data: `save_${txnId}` },
          { text: 'Edit', callback_data: `edit_${txnId}` },
          { text: 'Batal', callback_data: 'cancel' },
        ],
      ],
    },
  });
}

bot.on(message('text'), async (ctx, next) => {
  const userId = Number(ctx.from.id);
  const editState = editStates.get(userId);

  if (editState) {
    try {
      const { txnId, field } = editState;
      const transaction = retrieveTransaction(txnId);
      if (!transaction) {
        await ctx.reply('Transaksi kedaluwarsa. Kirim ulang.');
        editStates.delete(userId);
        return;
      }

      const newValue = ctx.message.text.trim();
      let updated = { ...transaction };

      switch (field) {
        case 'type':
          const lower = newValue.toLowerCase();
          if (lower === 'pemasukan' || lower === 'income' || lower === 'in') {
            updated.type = 'INCOME';
          } else if (lower === 'pengeluaran' || lower === 'expense' || lower === 'ex') {
            updated.type = 'EXPENSE';
          } else {
            await ctx.reply('Jenis tidak valid. Gunakan "Pemasukan" atau "Pengeluaran". Coba lagi.\\.\\.\\.');
            return;
          }
          break;
        case 'amount':
          const amount = Number(newValue.replace(/[^0-9]/g, ''));
          if (!amount || amount <= 0 || isNaN(amount)) {
            await ctx.reply('Jumlah tidak valid. Masukkan angka positif. Coba lagi.\\.\\.\\.');
            return;
          }
          updated.amount = amount;
          break;
        case 'category':
          if (!newValue) {
            await ctx.reply('Kategori tidak boleh kosong. Coba lagi.\\.\\.\\.');
            return;
          }
          updated.category = newValue;
          break;
        case 'description':
          updated.description = newValue || 'Tanpa catatan';
          break;
        default:
          await ctx.reply('Field tidak dikenali.');
          editStates.delete(userId);
          return;
      }

      // Update stored transaction
      pendingTransactions.set(txnId, updated);
      editStates.delete(userId);

      // Show updated confirmation
      await sendConfirmation(ctx, txnId, updated, true);
    } catch (e: any) {
      console.error('Edit processing error:', e?.message || e);
      editStates.delete(userId);
      await ctx.reply('Gagal mengedit. Coba lagi.');
    }
    return;
  }

  const text = ctx.message.text;
  if (text.startsWith('/')) return next();

  try {
    const transaction = await extractFromText(text);
    await handleTransactionInput(ctx, transaction);
  } catch (error: any) {
    console.error('Text extraction error:', error?.message || error);
    await ctx.reply('Maaf, saya tidak bisa memproses teks tersebut. Coba lagi dengan format yang lebih jelas.');
  }
});

bot.on(message('voice'), async (ctx) => {
  const voice = ctx.message.voice;
  logVoice('Received: ' + voice.file_id);

  try {
    logVoice('Getting file link...');
    const link = await ctx.telegram.getFileLink(voice.file_id);
    logVoice('Link: ' + link.href);

    logVoice('Downloading...');
    const response = await fetch(link.href);
    if (!response.ok) throw new Error('Download failed: ' + response.status);
    const buffer = Buffer.from(await response.arrayBuffer());
    logVoice('Downloaded: ' + buffer.length + ' bytes');

    const filePath = `temp_${voice.file_id}.ogg`;
    const ws = createWriteStream(filePath);
    ws.write(buffer);
    ws.end();
    await new Promise<void>((resolve) => ws.on('finish', () => resolve()));
    logVoice('File saved');

    logVoice('Groq transcribing...');
    const text = await transcribeAudio(filePath);
    logVoice('Groq: ' + text);

    logVoice('Gemini extracting...');
    const transaction = await extractFromText(text);
    logVoice('Gemini: OK');

    await handleTransactionInput(ctx, transaction);
    const escapedText = text.replace(/([_*[\]()~`>#+\-=|{}.!])/g, '\\$1');
    await ctx.reply('*Transkripsi:* ' + escapedText, { parse_mode: 'MarkdownV2' });
  } catch (error: any) {
    const msg = error?.message || String(error);
    logVoice('FAILED: ' + msg);
    console.error('Voice error:', msg);
    await ctx.reply('Maaf, gagal memproses voice note. Coba lagi.');
  }
});

bot.on(message('photo'), async (ctx) => {
  try {
    const photos = ctx.message.photo;
    const largest = photos[photos.length - 1];
    const link = await ctx.telegram.getFileLink(largest.file_id);
    const response = await fetch(link.href);
    const buffer = Buffer.from(await response.arrayBuffer());
    const base64 = buffer.toString('base64');

    const transaction = await extractFromImage(base64, 'image/jpeg');
    await handleTransactionInput(ctx, transaction);
  } catch (error) {
    await ctx.reply('Maaf, gagal memproses gambar. Pastikan fotonya jelas.');
  }
});

bot.action(/save_(.+)/, async (ctx) => {
  try {
    const txnId = ctx.match[1];
    const transaction = retrieveTransaction(txnId);
    if (!transaction) {
      await ctx.answerCbQuery('Transaksi kedaluwarsa. Kirim ulang.');
      return;
    }
    const userId = String(ctx.from.id);

    await insertTransaction(userId, transaction, 'telegram');

    const label = transaction.type === 'INCOME' ? 'Pemasukan' : 'Pengeluaran';
    const amount = `Rp ${transaction.amount.toLocaleString('id-ID')}`;

    await ctx.editMessageText(
      `Transaksi tersimpan\n${label}: ${amount} - ${transaction.category}`,
      { reply_markup: { inline_keyboard: [] } }
    );
  } catch (e: any) {
    console.error('Save error:', e?.message || e);
    await ctx.answerCbQuery('Gagal menyimpan. Coba lagi.');
  }
});

bot.action('cancel', async (ctx) => {
  await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
  await ctx.editMessageText('Transaksi dibatalkan.', { reply_markup: { inline_keyboard: [] } });
});

bot.action(/edit_(.+)/, async (ctx) => {
  try {
    const txnId = ctx.match[1];
    const transaction = retrieveTransaction(txnId);
    if (!transaction) {
      await ctx.answerCbQuery('Transaksi kedaluwarsa. Kirim ulang.');
      return;
    }

    const userId = Number(ctx.from.id);
    editStates.set(userId, { txnId, field: '' });

    await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
    const editMsg =
      'Pilih field yang ingin diedit:\n\n' +
      '- Jenis\n' +
      '- Jumlah\n' +
      '- Kategori\n' +
      '- Catatan';

    await ctx.reply(
      editMsg + '\nKlik tombol di bawah untuk memilih field:',
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: 'Jenis', callback_data: `field_${txnId}_type` }],
            [{ text: 'Jumlah', callback_data: `field_${txnId}_amount` }],
            [{ text: 'Kategori', callback_data: `field_${txnId}_category` }],
            [{ text: 'Catatan', callback_data: `field_${txnId}_description` }],
          ],
        },
      }
    );
    await ctx.answerCbQuery();
  } catch (e: any) {
    console.error('Edit start error:', e?.message || e);
    await ctx.answerCbQuery('Gagal memulai edit.');
  }
});

bot.action(/field_(.+)_(.+)/, async (ctx) => {
  try {
    const [, txnId, field] = ctx.match;
    const userId = Number(ctx.from.id);
    editStates.set(userId, { txnId, field });

    const label = escapeMarkdown(getFieldLabel(field));
    await ctx.editMessageText(`Kamu sedang mengedit ${getFieldLabel(field)}. Kirim nilai baru.`);
    await ctx.answerCbQuery();
  } catch (e: any) {
    console.error('Field select error:', e?.message || e);
    await ctx.answerCbQuery('Gagal memilih field.');
  }
});

function getFieldLabel(field: string): string {
  switch (field) {
    case 'type': return 'Jenis (Pemasukan/Pengeluaran)';
    case 'amount': return 'Jumlah (angka)';
    case 'category': return 'Kategori';
    case 'description': return 'Catatan';
    default: return field;
  }
}

bot.command('setpin', async (ctx) => {
  const pin = ctx.message.text.split(' ')[1];
  if (!pin || pin.length < 6) {
    await ctx.reply('❌ PIN minimal 6 karakter. Gunakan perintah: /setpin <6-digit-pin>');
    return;
  }
  try {
    const userId = String(ctx.from.id);
    const pinHash = await bcrypt.hash(pin, 10);
    const { error } = await supabase
      .from('users')
      .update({ pin_hash: pinHash })
      .eq('id', userId);
    if (error) throw error;
    await ctx.reply(`✅ PIN berhasil diubah!\n\nTelegram ID: ${ctx.from.id}`);
  } catch (err) {
    await ctx.reply('❌ Gagal mengubah PIN.');
  }
});

bot.command('login', async (ctx) => {
  const userId = String(ctx.from.id);
  const token = jwt.sign({ userId }, config.jwtSecret, { expiresIn: '5m' });
  const dashboardUrl = config.dashboardUrl;
  const link = `${dashboardUrl}?token=${token}`;

  await ctx.reply(
    `Klik link di bawah untuk masuk ke dashboard (berlaku 5 menit):\n${link}`,
    { link_preview_options: { is_disabled: true } }
  );
});

bot.command('report', async (ctx) => {
  const userId = String(ctx.from.id);

  try {
    const [daily, weekly, monthly] = await Promise.all([
      getTransactions(userId, 1),
      getTransactions(userId, 7),
      getTransactions(userId, 30),
    ]);

    const calc = (txns: Record<string, unknown>[]) => {
      const income = txns.filter((t) => t.type === 'INCOME').reduce((s, t) => s + Number(t.amount), 0);
      const expense = txns.filter((t) => t.type === 'EXPENSE').reduce((s, t) => s + Number(t.amount), 0);
      return { income, expense, balance: income - expense, count: txns.length };
    };

    const d = calc(daily ?? []);
    const w = calc(weekly ?? []);
    const m = calc(monthly ?? []);

    const toId = (n: number) => n.toLocaleString('id-ID');

    const report =
      `*Laporan Keuangan*\n\n` +
      `*Hari Ini*\n` +
      `Pemasukan: \`Rp ${toId(d.income)}\`\n` +
      `Pengeluaran: \`Rp ${toId(d.expense)}\`\n` +
      `Saldo: \`Rp ${toId(d.balance)}\`\n\n` +
      `*7 Hari*\n` +
      `Pemasukan: \`Rp ${toId(w.income)}\`\n` +
      `Pengeluaran: \`Rp ${toId(w.expense)}\`\n` +
      `${w.count} transaksi\n\n` +
      `*30 Hari*\n` +
      `Pemasukan: \`Rp ${toId(m.income)}\`\n` +
      `Pengeluaran: \`Rp ${toId(m.expense)}\`\n` +
      `${m.count} transaksi`;

    await ctx.replyWithMarkdownV2(report);
  } catch (e: any) {
    console.error('Report error:', e?.message || e);
    await ctx.reply('Maaf, gagal mengambil laporan.');
  }
});

export async function startBot(retries = 5) {
  if (!config.botToken) {
    console.log('[bot]: BOT_TOKEN not set. Skipping bot startup.');
    return;
  }
  for (let i = 0; i < retries; i++) {
    try {
      await bot.launch();
      console.log('[bot]: Bot running...');
      return;
    } catch (err: any) {
      console.error(`[bot]: Bot launch failed (${i + 1}/${retries}):`, err.message || err);
      if (i < retries - 1) {
        const delay = 2000 * Math.pow(2, i);
        console.log(`[bot]: Retrying in ${delay}ms...`);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      throw err;
    }
  }
}

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
