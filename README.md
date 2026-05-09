# ISTQB Simulator App 🎓

Aplikasi latihan ujian sertifikasi ISTQB (International Software Testing Qualifications Board) yang komprehensif, cepat, dan bekerja secara offline (Local First). Aplikasi ini dibangun dengan framework **React Native (Expo)** menggunakan SQLite untuk penyimpanan datanya.

## ✨ Fitur Utama

- **Offline-First & Cepat:** Semua soal dan histori disimpan secara lokal menggunakan `expo-sqlite`. Tidak membutuhkan koneksi internet untuk berlatih!
- **Bank Soal:**
  - Aplikasi sudah dilengkapi dengan Bank Soal *built-in* dari file `questions.json` yang akan langsung dimuat (seeded) ke dalam database saat pertama kali aplikasi dijalankan.
  - Tersedia UI CRUD lengkap untuk mengelola bank soal Anda sendiri (Tambah, Edit, Hapus, dan Cari Soal).
- **Dua Mode Utama:**
  - **Mode Latihan (Practice Mode):** Cocok untuk belajar santai tanpa timer. Setiap pilihan ganda yang dijawab akan langsung menampilkan penjelasan (Kunci Jawaban & Alasan).
  - **Mode Ujian (Exam Mode):** Simulasi ujian sesungguhnya menggunakan pengatur waktu mundur (Timer) dan batas waktu layaknya ujian sertifikasi resmi.
- **Navigasi Cepat (Lompat Soal):** Tersedia *Jump Modal* dalam bentuk grid yang sangat mempermudah Anda untuk melihat soal mana saja yang belum atau sudah terjawab, dan melompat langsung ke soal yang diinginkan.
- **Skoring Lengkap & Histori:** Lacak persentase kelulusan Anda dan lihat ulang detail pembahasan jawaban benar dan salah di fitur riwayat (History).
- **Cross-Platform:** Berjalan optimal di Web, Android, maupun iOS.

---

## 🛠 Teknologi yang Digunakan

Aplikasi ini menggunakan teknologi React Native modern:
- **Framework:** Expo SDK 54 (React Native 0.81)
- **Routing:** Expo Router v6 (File-based routing)
- **Database:** `expo-sqlite` (dengan sistem OPFS/Origin Private File System untuk dukungan Web)
- **State Management:** React Context API (untuk meminimalkan dependencies eksternal)
- **Iconography:** Material Icons via `@expo/vector-icons`

---

## 🚀 Panduan Instalasi & Menjalankan Aplikasi

Aplikasi ini adalah proyek standar Expo. Ikuti langkah berikut untuk menjalankannya secara lokal:

### 1. Persiapan Awal
Pastikan Anda sudah menginstal **Node.js** (rekomendasi: versi 20+ LTS).

### 2. Instalasi Dependensi
Buka terminal dan navigasikan ke root direktori proyek (`istqb-app`), lalu jalankan perintah berikut:

```bash
npm install
# atau
yarn install
```

### 3. Menjalankan Aplikasi
Anda dapat memilih platform mana yang ingin dijalankan:

**Untuk Web (Browser):**
```bash
npm run web
# atau
npx expo start --web
```
*Catatan Web: Kami merekomendasikan menggunakan Google Chrome atau browser berbasis Chromium terbaru karena SQLite di Web sangat bergantung pada teknologi File System Access API (OPFS).*

**Untuk Android / iOS (Emulator atau Perangkat Fisik):**
```bash
npm start
# lalu scan QR Code dengan aplikasi Expo Go di HP Anda, atau tekan 'a' untuk Android Emulator, dan 'i' untuk iOS Simulator.
```

---

## 🐞 Penanganan Masalah Umum (Troubleshooting)

### Error OPFS Lock di Web (`NoModificationAllowedError`)
Saat melakukan pengembangan aktif dan memicu *hot-reload* (fitur auto-refresh setelah Anda menyimpan file), browser mungkin masih menahan akses ke file database SQLite (`istqb.db`).
Hal ini menyebabkan error berbunyi *"Failed to execute 'createSyncAccessHandle' on 'FileSystemFileHandle'"*.

**Solusi:** 
Aplikasi ini sudah dipasangi sistem *delay render* sejenak untuk menunggu akses dilepas. Namun, jika error ini tetap muncul saat hot-reload:
1. Cukup abaikan error di layar.
2. Lakukan **Hard Refresh** di browser Anda (Tekan `Ctrl + F5` di Windows/Linux atau `Cmd + Shift + R` di Mac).

### Menyetel Ulang Database
Jika Anda ingin mengatur ulang seluruh aplikasi (menghapus histori ujian dan mengembalikan soal seperti awal/segar dari file `.json`), Anda bisa membersihkan cache/storage di Browser Anda (jika di Web) atau melakukan clear data aplikasi (jika di Android/iOS).

---

## 📂 Struktur Direktori Utama

```
📁 app/
   📄 _layout.tsx      # Entry point Expo Router, memuat semua Provider (DB, Session, I18n)
   📄 index.tsx        # Layar Beranda (Dashboard & Menu)
   📄 quiz.tsx         # Layar Utama untuk Kuis (Latihan / Ujian)
   📄 result.tsx       # Layar Hasil (Skor & Pembahasan)
   📄 history.tsx      # Layar Histori Kelulusan
   📄 select-category.tsx # Layar Pemilihan Topik & Setting Kuis (Jumlah Soal & Waktu)
   📄 profile.tsx      # Layar Profil (Nama, Ganti Bahasa UI, Statistik)
   📁 bank/            # Fitur Manajemen CRUD Bank Soal
   📁 context/         # File Context State (DB, Session, dll)
📁 components/         # Komponen UI Reusable (ScoreRing, ProgressBar, Modal, dll)
📁 constants/          # Aturan Bisnis (List Kategori ISTQB, Aturan Passing Score)
📁 data/
   📄 questions.json   # Seed Data (Bank soal bawaan aplikasi)
```

## 📝 Lisensi
Bebas untuk dimodifikasi dan dikembangkan lebih lanjut untuk keperluan pembelajaran. Selamat berlatih dan semoga lulus sertifikasi! 🎯
