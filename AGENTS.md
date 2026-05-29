# AGENT INSTRUCTIONS: AI-POWERED TELEGRAM FINANCE TRACKER (GROQ + GEMINI EDITION)

Anda adalah Senior Full-Stack Engineer, AI Specialist, dan UI/UX Expert yang bekerja di startup fintech top-tier. Misi Anda adalah membangun bot Telegram pintar untuk pencatatan keuangan (pemasukan & pengeluaran) berbasis AI, dilengkapi dengan Web Dashboard minimalis premium.

## 1. PROJECT OVERVIEW
Membangun "Lumina Finance", ekosistem pencatat keuangan yang terdiri dari Telegram Bot dan Web Dashboard. User dapat menginput transaksi melalui Telegram menggunakan Teks biasa, Voice Note (Audio), atau Gambar (Struk belanja). 

Sistem menggunakan kombinasi Multi-AI (Free Tier):
- **Groq API (Whisper Model):** Digunakan untuk melakukan Transkripsi Audio (*Speech-to-Text*) dari Voice Note secara kilat.
- **Google Gemini 2.5 Flash API:** Digunakan untuk memproses input Gambar (*Vision*) dan memproses teks hasil transkripsi/chat biasa untuk diekstrak menjadi data JSON terstruktur.

Stack Teknologi:
- Backend/Bot: Node.js, TypeScript, Telegraf (Telegram Bot Framework)
- Database: Supabase (PostgreSQL - Free Tier)
- Frontend (Dashboard): Next.js 14 (App Router), Tailwind CSS, Shadcn UI, Lucide Icons.

## 2. FEATURE LIST
**Telegram Bot Features:**
- **Multimodal Input Handling:** - **Teks:** Langsung dikirim ke Gemini untuk ekstraksi data.
  - **Voice Note:** Bot mengunduh file `.ogg`/`.mp3` dari Telegram, mengirimkannya ke **Groq Whisper API** untuk diubah menjadi teks, lalu teks tersebut dikirim ke Gemini.
  - **Gambar/Struk:** Foto langsung dikirim ke **Gemini Vision** untuk dianalisis item dan total nominalnya.
- **AI Processing & Extraction:** AI wajib mengekstrak data menjadi komponen: Pemasukan/Pengeluaran, Nominal, Kategori, Catatan, Tanggal.
- **Smart Confirmation:** Bot membalas dengan ringkasan transaksi menggunakan Telegram Inline Keyboard untuk konfirmasi (Simpan/Batal/Edit).
- **Report Generation:** Command `/report` untuk melihat ringkasan harian/mingguan/bulanan dalam format teks rapi.

**Web Dashboard Features:**
- **Overview Metrics:** Total Balance, Income, Expense bulan ini (dengan persentase perbandingan dari bulan lalu).
- **Recent Transactions:** Tabel riwayat transaksi yang bersih dan rapi.
- **Spending Categories:** Visualisasi data pengeluaran (menggunakan Recharts dengan desain minimalis).

## 3. UI/UX STYLE (BOT & DASHBOARD)
**Telegram Bot UI:**
- Gunakan `MarkdownV2` untuk format pesan.
- **Dilarang keras** menggunakan emoji berlebihan (seperti 💸💰🤑). Gunakan format teks yang bersih.
- Angka nominal wajib menggunakan monospaced font (`Rp 25.000`).

**Web Dashboard UI:**
- **Inspirasi:** Vercel, Linear, Stripe, Raycast.
- **Warna:** Monokromatik dengan aksen warna fungsional yang sangat subtle (Soft red untuk expense, Soft green untuk income, di atas *off-white* atau *dark-gray* background).
- **Typography:** Inter atau Geist font. Gunakan hierarki ukuran font yang tegas namun proporsional.

## 4. HUMAN DESIGN RULES (DASHBOARD)
- Design harus *subtle*. Jangan gunakan shadow tebal. Gunakan border 1px solid yang sangat tipis (`border-gray-200` atau `border-white/10`).
- Spacing harus realistis. Beri napas pada layout (gunakan padding besar pada container utama, misal `p-8` atau `p-12`).
- Hierarchy harus natural. Gunakan kontras warna teks (teks utama `text-gray-900`, teks sekunder `text-gray-500`) daripada memperbesar ukuran font secara berlebihan.
- Layout jangan monoton. Jangan gunakan card dengan ukuran identik berjajar secara *grid* kaku. Buat asimetri yang elegan.

## 5. FRONTEND REQUIREMENTS
- Framework: Next.js 14 App Router.
- Styling: Tailwind CSS.
- Komponen: Shadcn UI (secara selektif, jangan sekadar copas template).
- Chart: Recharts (styling harus di-override agar menghilangkan grid lines bawaan, gunakan line/bar yang sangat tipis dan elegan).
- State Management: React Context / Zustand.
- Icons: Lucide React (gunakan stroke width 1.5, ukuran 16px - 20px maksimal).

## 6. BACKEND & AI PIPELINE REQUIREMENTS
- **Telegram Webhook/Polling:** Setup menggunakan `telegraf`.
- **Multi-AI Integration Workflow:**
  1. **Jika Input Teks:** Kirim teks ke Gemini 2.5 Flash.
  2. **Jika Input Voice Note:** - Download file audio via Telegram `getFileLink`.
     - Gunakan SDK `@groq/groq-sdk` dengan model `whisper-large-v3` untuk transkripsi menjadi teks.
     - Kirim teks hasil transkripsi Groq ke Gemini 2.5 Flash untuk ekstraksi JSON.
  3. **Jika Input Gambar:** Konversi gambar ke buffer/base64, kirim ke Gemini 2.5 Flash menggunakan fitur *multimodal vision*.
- **Gemini Structured Output Rule:** Wajib menggunakan `responseSchema` atau teknik prompting ketat agar Gemini selalu mengembalikan format JSON murni:
  `{ type: 'income' | 'expense', amount: number, category: string, description: string, confidenceScore: number }`.
- **Error Handling:** Berikan fallback response yang sopan jika API Groq atau Gemini menyentuh *rate limit* gratisan.

## 7. DATABASE STRUCTURE (SUPABASE)
Buat skema PostgreSQL berikut:
- **Table `users`:** `id` (PK, telegram_id), `username`, `created_at`.
- **Table `transactions`:** - `id` (UUID, PK)
  - `user_id` (FK to users)
  - `type` (enum: 'INCOME', 'EXPENSE')
  - `amount` (numeric/decimal)
  - `category` (varchar)
  - `description` (text)
  - `raw_input` (text/json - simpan teks asli atau URL gambar/audio untuk audit log)
  - `created_at` (timestamp)

## 8. RESPONSIVE RULES
- Dashboard harus *mobile-first* namun terlihat premium di desktop.
- Di layar *mobile*, tabel transaksi berubah menjadi *list view* bergaya card horizontal tanpa border yang mengganggu.
- Sidebar di desktop menjadi *bottom navigation* minimalis di mobile.

## 9. ANIMATION RULES
- Dilarang menggunakan animasi *bouncy* atau durasi panjang.
- Gunakan transisi CSS native yang sangat cepat: `transition-all duration-150 ease-in-out`.
- Efek *hover* hanya sebatas perubahan background opacity atau border color yang tipis (contoh: `hover:bg-gray-50`).

## 10. ANTI AI-GENERATED RULES
- **DILARANG:** Gradient background norak (purple ke pink, dsb).
- **DILARANG:** Box-shadow besar bergaya neumorphism atau glassmorphism murahan.
- **DILARANG:** Menggunakan ilustrasi 3D gratisan atau icon dekoratif besar di tengah halaman.
- **DILARANG:** Dashboard yang terlalu ramai data. Fokus pada metrik utama (Balance, Pemasukan, Pengeluaran).
- **WAJIB:** Clean design, premium minimalism, realistic spacing, modern SaaS quality.

## 11. OUTPUT EXPECTATION
- Hasilkan kode yang *production-ready*, rapi, modular, dan di-comment dengan baik.
- Pisahkan logic AI Groq (`groq.service.ts`), Gemini (`gemini.service.ts`), logic Telegram (`bot.service.ts`), dan logic Database (`db.service.ts`).
- Struktur folder frontend dan backend harus jelas.

## 12. DEPLOYMENT TARGET
- Web Dashboard: Vercel.
- Bot & Webhook/Server: Vercel Serverless Functions atau Railway/Render.
- Pastikan kodenya *stateless* agar aman dijalankan di environment *serverless*.

## 13. FINAL INSTRUCTION
Pahami semua instruksi di atas. Integrasikan pipa pemrosesan Groq (Audio) -> Gemini (JSON) dengan mulus. Jangan buat layout dashboard asal jadi. Gunakan prinsip *engineering* terbaik. 
