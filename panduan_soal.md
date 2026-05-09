# 📚 Panduan Format Soal ISTQB App

## Struktur File

Soal disimpan di folder `data/` sebagai file JSON:

```
data/
├── questions.json              ← soal Bahasa Indonesia (sudah ada, 40 soal CTFL)
├── questions_en_ctfl.json      ← soal Bahasa Inggris CTFL (10 soal contoh)
├── questions_en_ctfl_at.json   ← (anda tambahkan sendiri) CTFL-AT Bahasa Inggris
├── questions_id_ctal_ta.json   ← (anda tambahkan sendiri) CTAL-TA Bahasa Indonesia
└── ...
```

---

## Format JSON (Template Lengkap)

```json
[
  {
    "id": 1,
    "question": "Teks pertanyaan di sini?",
    "options": [
      "Jawaban A",
      "Jawaban B",
      "Jawaban C",
      "Jawaban D"
    ],
    "answer": 1,
    "explanation": "Penjelasan umum mengapa jawaban ini benar.",
    "explanation_a": "Penjelasan kenapa opsi A salah/benar.",
    "explanation_b": "Penjelasan kenapa opsi B salah/benar.",
    "explanation_c": "Penjelasan kenapa opsi C salah/benar.",
    "explanation_d": "Penjelasan kenapa opsi D salah/benar.",
    "language": "id",
    "category": "CTFL",
    "level": "Foundation"
  }
]
```

### Penjelasan Field

| Field | Tipe | Wajib | Keterangan |
|---|---|---|---|
| `id` | number | ✅ | ID unik dalam file ini |
| `question` | string | ✅ | Teks soal |
| `options` | array[4] | ✅ | Tepat 4 pilihan jawaban |
| `answer` | number | ✅ | Index jawaban benar: `0`=A, `1`=B, `2`=C, `3`=D |
| `explanation` | string | 💡 | Penjelasan umum (ditampilkan di review) |
| `explanation_a` | string | 💡 | Penjelasan opsi A (mode Latihan) |
| `explanation_b` | string | 💡 | Penjelasan opsi B (mode Latihan) |
| `explanation_c` | string | 💡 | Penjelasan opsi C (mode Latihan) |
| `explanation_d` | string | 💡 | Penjelasan opsi D (mode Latihan) |
| `language` | string | ✅ | `"id"` atau `"en"` |
| `category` | string | ✅ | Kode kategori (lihat daftar di bawah) |
| `level` | string | ✅ | Level ISTQB (lihat daftar di bawah) |

---

## Daftar Category & Level

### Foundation Level
| `level` | `category` | Nama Lengkap |
|---|---|---|
| `"Foundation"` | `"CTFL"` | Certified Tester Foundation Level v4.0 |
| `"Foundation"` | `"CTFL-AT"` | Foundation Level Agile Tester |
| `"Foundation"` | `"CT-AI-F"` | Foundation Level AI Testing |

### Advanced Level
| `level` | `category` | Nama Lengkap |
|---|---|---|
| `"Advanced"` | `"CTAL-TA"` | Test Analyst v4.0 |
| `"Advanced"` | `"CTAL-TTA"` | Technical Test Analyst |
| `"Advanced"` | `"CTAL-TM"` | Test Management v3.0 |
| `"Advanced"` | `"CTAL-TAE"` | Test Automation Engineering v2.0 |
| `"Advanced"` | `"CTAL-AT"` | Advanced Level Agile Tester v2.0 |
| `"Advanced"` | `"CTAL-ATT"` | Agile Technical Tester |

### Specialist Level
| `level` | `category` | Nama Lengkap |
|---|---|---|
| `"Specialist"` | `"CT-AI"` | AI Testing v2.0 |
| `"Specialist"` | `"CT-GenAI"` | Testing with Generative AI |
| `"Specialist"` | `"CT-TAS"` | Test Automation Strategy |
| `"Specialist"` | `"CT-MBT"` | Model-Based Tester |
| `"Specialist"` | `"CT-MAT"` | Mobile Application Testing |
| `"Specialist"` | `"CT-PT"` | Performance Testing |
| `"Specialist"` | `"CT-SEC"` | Security Tester |
| `"Specialist"` | `"CT-UT"` | Usability Testing |
| `"Specialist"` | `"CT-AuT"` | Automotive Software Tester |

### Expert Level
| `level` | `category` | Nama Lengkap |
|---|---|---|
| `"Expert"` | `"Expert-ITP"` | Improving the Test Process |
| `"Expert"` | `"Expert-TM"` | Test Management |

---

## Cara Menambah Soal Baru

### Opsi 1 — Edit file JSON + seed ulang (Recommended untuk bulk)

1. Tambahkan soal ke file JSON yang sesuai (atau buat file baru)
2. Import file di `DatabaseContext.tsx` dan panggil seed-nya di `seedInitialData`
3. **Hapus database lama**: di browser → DevTools → Application → Storage → Clear site data
4. Refresh → soal otomatis ter-seed ulang

### Opsi 2 — Tambah manual lewat UI Bank Soal

Gunakan halaman **Bank Soal → Tambah** untuk menambah soal satu per satu dari UI.

### Opsi 3 — Generate banyak soal dengan AI

Gunakan prompt berikut untuk generate soal:

```
Buatkan 40 soal ISTQB CTFL v4.0 dalam format JSON berikut:
[
  {
    "id": 1,
    "question": "...",
    "options": ["...", "...", "...", "..."],
    "answer": 0,
    "explanation": "...",
    "explanation_a": "...",
    "explanation_b": "...",
    "explanation_c": "...",
    "explanation_d": "...",
    "language": "en",
    "category": "CTFL",
    "level": "Foundation"
  }
]
Pastikan:
- Tepat 4 pilihan jawaban
- answer adalah index (0-3) dari jawaban benar
- Soal sesuai silabus CTFL v4.0
- Ada explanation untuk setiap opsi
```

---

## Penting: Seed Hanya Berjalan Sekali

Seed otomatis (`seedInitialData`) hanya berjalan **jika tabel `questions` kosong**. Jika soal sudah ada, seed tidak akan berjalan lagi.

**Untuk reset dan seed ulang**:
- **Web**: DevTools → Application → Storage → Clear site data → Refresh
- **Mobile**: Uninstall app atau hapus data app
