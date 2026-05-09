import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import * as SQLite from 'expo-sqlite';

type Language = 'id' | 'en';

interface Translations {
  title: string;
  questions: string;
  duration: string;
  passingScore: string;
  start: string;
  prev: string;
  next: string;
  submit: string;
  cancel: string;
  confirmSubmit: string;
  result: string;
  passed: string;
  failed: string;
  passMsg: string;
  failMsg: string;
  backHome: string;
  bank: string;
  addQuestion: string;
  language: string;
  minutes: string;
  questionLang: string;
}

const translations: Record<Language, Translations> = {
  id: {
    title: 'Latihan Ujian ISTQB CTFL 4.0',
    questions: 'Jumlah Soal',
    duration: 'Durasi',
    passingScore: 'Skor Kelulusan',
    start: 'Mulai Ujian',
    prev: 'Sebelumnya',
    next: 'Selanjutnya',
    submit: 'Kumpulkan',
    cancel: 'Batal',
    confirmSubmit: 'Apakah Anda yakin ingin mengumpulkan ujian ini?',
    result: 'Hasil Ujian',
    passed: 'LULUS',
    failed: 'GAGAL',
    passMsg: 'Selamat! Anda telah mencapai skor yang dibutuhkan.',
    failMsg: 'Sayang sekali, Anda belum mencapai skor minimal kelulusan. Teruslah belajar!',
    backHome: 'Kembali ke Beranda',
    bank: 'Bank Soal',
    addQuestion: 'Tambah Soal',
    language: 'Bahasa UI',
    minutes: 'Menit',
    questionLang: 'Bahasa Soal'
  },
  en: {
    title: 'ISTQB CTFL 4.0 Practice Exam',
    questions: 'Total Questions',
    duration: 'Duration',
    passingScore: 'Passing Score',
    start: 'Start Exam',
    prev: 'Previous',
    next: 'Next',
    submit: 'Submit',
    cancel: 'Cancel',
    confirmSubmit: 'Are you sure you want to submit this exam?',
    result: 'Exam Result',
    passed: 'PASSED',
    failed: 'FAILED',
    passMsg: 'Congratulations! You have achieved the required score.',
    failMsg: 'Unfortunately, you did not reach the minimum passing score. Keep studying!',
    backHome: 'Back to Home',
    bank: 'Question Bank',
    addQuestion: 'Add Question',
    language: 'UI Language',
    minutes: 'Minutes',
    questionLang: 'Question Language'
  }
};

interface I18nContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: Translations;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

const SETTINGS_DB = 'istqb_settings.db';

export const I18nProvider = ({ children }: { children: ReactNode }) => {
  const [lang, setLangState] = useState<Language>('id');
  const [loaded, setLoaded] = useState(false);

  // Load saved language on mount
  useEffect(() => {
    (async () => {
      try {
        const db = await SQLite.openDatabaseAsync(SETTINGS_DB);
        await db.execAsync(`CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)`);
        const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM settings WHERE key = ?', ['ui_lang']);
        if (row && (row.value === 'id' || row.value === 'en')) {
          setLangState(row.value);
        }
        await db.closeAsync();
      } catch {
        // fallback to default 'id'
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  const setLang = async (newLang: Language) => {
    setLangState(newLang);
    try {
      const db = await SQLite.openDatabaseAsync(SETTINGS_DB);
      await db.runAsync(
        `INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`,
        ['ui_lang', newLang]
      );
      await db.closeAsync();
    } catch {
      // silently fail
    }
  };

  if (!loaded) return null;

  return (
    <I18nContext.Provider value={{ lang, setLang, t: translations[lang] }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = () => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
};
