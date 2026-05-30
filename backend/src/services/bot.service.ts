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

const pendingGroups = new Map<string, AITransaction[]>();
const pendingTransactions = new Map<string, AITransaction>();
const editStates = new Map<number, { txnId: string; field: string }>();

function storeGroup(transactions: AITransaction[]): string {
  const id = randomBytes(4).toString('hex');
  pendingGroups.set(id, transactions);
  transactions.forEach((t, i) => {
    const txnId = `${id}_${i}`;
    pendingTransactions.set(txnId, t);
    setTimeout(() => pendingTransactions.delete(txnId), 5 * 60 * 1000);
  });
  setTimeout(() => pendingGroups.delete(id), 5 * 60 * 1000);
  return id;
}

function retrieveGroup(id: string): AITransaction[] | null {
  return pendingGroups.get(id) || null;
}

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

async function handleTransactionInput(ctx: any, transactions: AITransaction[]) {
  if (!transactions.length) {
    await ctx.reply('Tidak ada transaksi yang ditemukan.');
    return;
  }

  const groupId = storeGroup(transactions);

  let text = '*Ringkasan Transaksi*\n';
  transactions.forEach((t, i) => {
    const type = t.type === 'INCOME' ? 'Pemasukan' : 'Pengeluaran';
    const amount = `Rp ${t.amount.toLocaleString('id-ID')}`;
    text += `\n${i + 1}\\. *${escapeMarkdown(type)}*\n`;
    text += `   Jumlah: \`${escapeMarkdown(amount)}\`\n`;
    text += `   Kategori: *${escapeMarkdown(t.category)}*\n`;
    text += `   Catatan: ${escapeMarkdown(t.description)}\n`;
    text += `   Keyakinan: *${Math.round(t.confidenceScore * 100)}%*`;
  });

  const keyboard = [
    [
      { text: 'Simpan Semua', callback_data: `save_group_${groupId}` },
      { text: 'Edit', callback_data: `edit_group_${groupId}` },
      { text: 'Batal', callback_data: `cancel_group_${groupId}` },
    ],
  ];

  await ctx.reply(text, {
    parse_mode: 'MarkdownV2',
    reply_markup: { inline_keyboard: keyboard },
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

      pendingTransactions.set(txnId, updated);
      editStates.delete(userId);

      const amountStr = `Rp ${updated.amount.toLocaleString('id-ID')}`;
      const label = updated.type === 'INCOME' ? 'Pemasukan' : 'Pengeluaran';
      await ctx.reply(
        `*Ringkasan \\(Diperbarui\\)*\n\nJenis: *${label}*\nJumlah: \`${escapeMarkdown(amountStr)}\`\nKategori: *${escapeMarkdown(updated.category)}*\nCatatan: ${escapeMarkdown(updated.description)}`,
        {
          parse_mode: 'MarkdownV2',
          reply_markup: {
            inline_keyboard: [
              [
                { text: 'Simpan', callback_data: `save_txn_${txnId}` },
                { text: 'Batal', callback_data: `cancel_txn_${txnId}` },
              ],
            ],
          },
        }
      );
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
    const transactions = await extractFromText(text);
    await handleTransactionInput(ctx, transactions);
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

    logVoice('Extracting...');
    const transactions = await extractFromText(text);
    logVoice('Extracted: ' + transactions.length + ' items');

    await handleTransactionInput(ctx, transactions);
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

    const transactions = await extractFromImage(base64, 'image/jpeg');
    await handleTransactionInput(ctx, transactions);
  } catch (error) {
    await ctx.reply('Maaf, gagal memproses gambar. Pastikan fotonya jelas.');
  }
});

bot.action(/save_group_(.+)/, async (ctx) => {
  try {
    const groupId = ctx.match[1];
    const transactions = retrieveGroup(groupId);
    if (!transactions) {
      await ctx.answerCbQuery('Transaksi kedaluwarsa. Kirim ulang.');
      return;
    }
    const userId = String(ctx.from.id);

    pendingGroups.delete(groupId);
    for (const txn of transactions) {
      await insertTransaction(userId, txn, 'telegram');
    }

    const total = transactions.reduce((sum, t) => sum + t.amount, 0);
    const label = transactions.length > 1
      ? `${transactions.length} transaksi tersimpan\\! Total: Rp ${total.toLocaleString('id-ID')}`
      : `${transactions[0].type === 'INCOME' ? 'Pemasukan' : 'Pengeluaran'} tersimpan\\! Rp ${total.toLocaleString('id-ID')}`;

    await ctx.editMessageText(
      label,
      { parse_mode: 'MarkdownV2', reply_markup: { inline_keyboard: [] } }
    );
  } catch (e: any) {
    console.error('Save error:', e?.message || e);
    await ctx.answerCbQuery('Gagal menyimpan. Coba lagi.');
  }
});

bot.action(/cancel_group_(.+)/, async (ctx) => {
  const groupId = ctx.match[1];
  const transactions = pendingGroups.get(groupId);
  if (transactions) {
    transactions.forEach((_, i) => pendingTransactions.delete(`${groupId}_${i}`));
  }
  pendingGroups.delete(groupId);
  await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
  await ctx.editMessageText('Transaksi dibatalkan.', { reply_markup: { inline_keyboard: [] } });
});

bot.action(/edit_group_(.+)/, async (ctx) => {
  try {
    const groupId = ctx.match[1];
    const transactions = retrieveGroup(groupId);
    if (!transactions) {
      await ctx.answerCbQuery('Transaksi kedaluwarsa. Kirim ulang.');
      return;
    }

    const buttons = transactions.map((_, i) => ({
      text: `${i + 1}`,
      callback_data: `edit_${groupId}_${i}`,
    }));

    await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
    await ctx.reply('Pilih nomor transaksi yang ingin diedit:', {
      reply_markup: {
        inline_keyboard: [buttons],
      },
    });
    await ctx.answerCbQuery();
  } catch (e: any) {
    console.error('Edit group error:', e?.message || e);
    await ctx.answerCbQuery('Gagal memulai edit.');
  }
});

bot.action(/edit_(.+)_(\d+)/, async (ctx) => {
  try {
    const groupId = ctx.match[1];
    const idx = parseInt(ctx.match[2]);
    const txnId = `${groupId}_${idx}`;
    const transaction = retrieveTransaction(txnId);
    if (!transaction) {
      await ctx.answerCbQuery('Transaksi kedaluwarsa. Kirim ulang.');
      return;
    }

    await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
    await ctx.reply(
      'Pilih field yang ingin diedit:',
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
    const txnId = ctx.match[1];
    const field = ctx.match[2];
    const userId = Number(ctx.from.id);
    editStates.set(userId, { txnId, field });

    await ctx.editMessageText(`Kamu sedang mengedit ${getFieldLabel(field)}. Kirim nilai baru.`);
    await ctx.answerCbQuery();
  } catch (e: any) {
    console.error('Field select error:', e?.message || e);
    await ctx.answerCbQuery('Gagal memilih field.');
  }
});

bot.action(/save_txn_(.+)/, async (ctx) => {
  try {
    const txnId = ctx.match[1];
    const transaction = retrieveTransaction(txnId);
    if (!transaction) {
      await ctx.answerCbQuery('Transaksi kedaluwarsa. Kirim ulang.');
      return;
    }
    const userId = String(ctx.from.id);
    pendingTransactions.delete(txnId);
    await insertTransaction(userId, transaction, 'telegram');

    const label = transaction.type === 'INCOME' ? 'Pemasukan' : 'Pengeluaran';
    const amount = `Rp ${transaction.amount.toLocaleString('id-ID')}`;
    await ctx.editMessageText(`Tersimpan: ${label} ${amount}`,
      { reply_markup: { inline_keyboard: [] } }
    );
  } catch (e: any) {
    console.error('Save txn error:', e?.message || e);
    await ctx.answerCbQuery('Gagal menyimpan. Coba lagi.');
  }
});

bot.action(/cancel_txn_(.+)/, async (ctx) => {
  const txnId = ctx.match[1];
  pendingTransactions.delete(txnId);
  await ctx.editMessageText('Dibatalkan.', { reply_markup: { inline_keyboard: [] } });
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
