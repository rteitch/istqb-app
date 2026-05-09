import React, { Component, ReactNode, useEffect, useState, useCallback } from 'react';
import {
  Platform, View, Text, ActivityIndicator,
  TouchableOpacity, StyleSheet,
} from 'react-native';
import * as SQLite from 'expo-sqlite';
import questionsData from '../../data/questions.json';
import questionsEnData from '../../data/questions_en_ctfl.json';

// ─── Migrations ───────────────────────────────────────────────────────────────

const runMigrations = async (db: SQLite.SQLiteDatabase) => {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      question_text TEXT NOT NULL,
      option_a TEXT NOT NULL,
      option_b TEXT NOT NULL,
      option_c TEXT NOT NULL,
      option_d TEXT NOT NULL,
      correct_answer TEXT NOT NULL,
      explanation TEXT,
      explanation_a TEXT,
      explanation_b TEXT,
      explanation_c TEXT,
      explanation_d TEXT,
      language TEXT DEFAULT 'id',
      category TEXT DEFAULT 'CTFL',
      level TEXT DEFAULT 'Foundation',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS exam_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      category TEXT NOT NULL,
      level TEXT NOT NULL,
      mode TEXT NOT NULL DEFAULT 'exam',
      total_questions INTEGER NOT NULL,
      correct_answers INTEGER NOT NULL,
      score_percent REAL NOT NULL,
      passed INTEGER NOT NULL,
      duration_seconds INTEGER,
      finished_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
    CREATE TABLE IF NOT EXISTS exam_session_answers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,
      question_id INTEGER NOT NULL,
      user_answer TEXT,
      is_correct INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (session_id) REFERENCES exam_sessions(id)
    );
  `);
  const cols = [
    `ALTER TABLE questions ADD COLUMN category TEXT DEFAULT 'CTFL'`,
    `ALTER TABLE questions ADD COLUMN level TEXT DEFAULT 'Foundation'`,
    `ALTER TABLE questions ADD COLUMN explanation_a TEXT`,
    `ALTER TABLE questions ADD COLUMN explanation_b TEXT`,
    `ALTER TABLE questions ADD COLUMN explanation_c TEXT`,
    `ALTER TABLE questions ADD COLUMN explanation_d TEXT`,
  ];
  for (const sql of cols) {
    try { await db.execAsync(sql); } catch { /* kolom sudah ada */ }
  }
};

const seedInitialData = async (db: SQLite.SQLiteDatabase) => {
  const r = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM questions');
  if (r && r.count === 0) {
    const answerMap = ['A', 'B', 'C', 'D'];

    // ── Seed soal Bahasa Indonesia (CTFL Foundation) ──
    for (const q of questionsData) {
      await db.runAsync(
        `INSERT INTO questions
          (question_text, option_a, option_b, option_c, option_d,
           correct_answer, explanation, language, category, level)
         VALUES (?,?,?,?,?,?,?,?,?,?)`,
        [
          q.question, q.options[0], q.options[1], q.options[2], q.options[3],
          answerMap[q.answer],
          (q as any).explanation ?? 'Penjelasan belum tersedia.',
          'id', 'CTFL', 'Foundation',
        ]
      );
    }

    // ── Seed soal Bahasa Inggris (CTFL Foundation) ──
    for (const q of questionsEnData) {
      await db.runAsync(
        `INSERT INTO questions
          (question_text, option_a, option_b, option_c, option_d,
           correct_answer, explanation,
           explanation_a, explanation_b, explanation_c, explanation_d,
           language, category, level)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          q.question, q.options[0], q.options[1], q.options[2], q.options[3],
          answerMap[q.answer],
          (q as any).explanation ?? '',
          (q as any).explanation_a ?? null,
          (q as any).explanation_b ?? null,
          (q as any).explanation_c ?? null,
          (q as any).explanation_d ?? null,
          'en', 'CTFL', 'Foundation',
        ]
      );
    }
  }
};

// ─── Error Boundary ───────────────────────────────────────────────────────────

interface BoundaryProps { children: ReactNode; onOPFSError: () => void }
interface BoundaryState { caught: boolean }

class SQLiteErrorBoundary extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { caught: false };
  static getDerivedStateFromError(): BoundaryState { return { caught: true }; }
  componentDidCatch(error: Error) {
    if (error?.message?.includes('createSyncAccessHandle') ||
        error?.message?.includes('Access Handle')) {
      setTimeout(() => this.props.onOPFSError(), 0);
    }
  }
  render() {
    if (this.state.caught) return null;
    return this.props.children;
  }
}

// ─── Provider ─────────────────────────────────────────────────────────────────
// Strategi untuk web:
// 1. Tunggu 800ms (cukup untuk hot-reload biasa)
// 2. Mount SQLiteProvider dalam Error Boundary
// 3. Jika OPFS error → auto page reload (pakai sessionStorage untuk hitung attempt)
// 4. Jika sudah reload 2x masih error → tampil layar terkunci

const RELOAD_COUNT_KEY = '__istqb_db_reload__';

type Phase = 'loading' | 'ready' | 'locked';

export const AppDatabaseProvider = ({ children }: { children: ReactNode }) => {
  const [phase, setPhase] = useState<Phase>(
    Platform.OS === 'web' ? 'loading' : 'ready'
  );
  const [mountKey, setMountKey] = useState(0);

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    // Bersihkan reload counter jika kita berhasil load sebelumnya
    // (kita simpan sementara, nanti dihapus saat DB berhasil init)
    const timer = setTimeout(() => setPhase('ready'), 800);
    return () => clearTimeout(timer);
  }, [mountKey]);

  const handleOPFSError = useCallback(() => {
    if (typeof window === 'undefined' || typeof sessionStorage === 'undefined') return;

    const attempts = parseInt(sessionStorage.getItem(RELOAD_COUNT_KEY) ?? '0', 10);
    if (attempts < 2) {
      // Auto-reload halaman — cara paling reliabel untuk lepas OPFS lock
      sessionStorage.setItem(RELOAD_COUNT_KEY, String(attempts + 1));
      window.location.reload();
    } else {
      // Sudah reload 2x masih error → tampil layar terkunci
      sessionStorage.removeItem(RELOAD_COUNT_KEY);
      setPhase('locked');
    }
  }, []);

  const handleManualRetry = useCallback(() => {
    if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem(RELOAD_COUNT_KEY);
    setMountKey((k) => k + 1);
    setPhase('loading');
  }, []);

  if (phase === 'loading') {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={s.loadTitle}>Mempersiapkan database...</Text>
        <Text style={s.loadSub}>Mohon tunggu sebentar</Text>
      </View>
    );
  }

  if (phase === 'locked') {
    return (
      <View style={s.center}>
        <Text style={s.lockIcon}>⚠️</Text>
        <Text style={s.lockTitle}>Database Tidak Bisa Dibuka</Text>
        <Text style={s.lockDesc}>
          Ada tab browser lain yang masih membuka aplikasi ini.{'\n'}
          Tutup semua tab lain, lalu klik "Coba Lagi".
        </Text>
        <TouchableOpacity style={s.retryBtn} onPress={handleManualRetry}>
          <Text style={s.retryBtnText}>🔄 Coba Lagi</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={s.reloadBtn}
          onPress={() => { if (typeof window !== 'undefined') window.location.reload(); }}
        >
          <Text style={s.reloadBtnText}>Muat Ulang Halaman</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SQLiteErrorBoundary key={mountKey} onOPFSError={handleOPFSError}>
      <SQLite.SQLiteProvider
        databaseName="istqb.db"
        onInit={async (db) => {
          // DB berhasil → bersihkan reload counter
          if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem(RELOAD_COUNT_KEY);
          await runMigrations(db);
          await seedInitialData(db);
        }}
      >
        {children}
      </SQLite.SQLiteProvider>
    </SQLiteErrorBoundary>
  );
};

const s = StyleSheet.create({
  center: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#F8FAFC', padding: 32,
  },
  loadTitle: { marginTop: 16, fontSize: 16, fontWeight: '700', color: '#1E293B' },
  loadSub: { marginTop: 6, fontSize: 13, color: '#94A3B8', textAlign: 'center' },
  lockIcon: { fontSize: 56, marginBottom: 16 },
  lockTitle: { fontSize: 20, fontWeight: '800', color: '#1E293B', marginBottom: 10, textAlign: 'center' },
  lockDesc: { fontSize: 14, color: '#64748B', textAlign: 'center', lineHeight: 22, marginBottom: 28 },
  retryBtn: {
    backgroundColor: '#3B82F6', borderRadius: 12,
    paddingHorizontal: 32, paddingVertical: 14,
    marginBottom: 10, width: '100%', alignItems: 'center',
  },
  retryBtnText: { color: 'white', fontSize: 15, fontWeight: '700' },
  reloadBtn: {
    borderWidth: 1.5, borderColor: '#CBD5E1', borderRadius: 12,
    paddingHorizontal: 32, paddingVertical: 12,
    width: '100%', alignItems: 'center',
  },
  reloadBtnText: { color: '#64748B', fontSize: 14, fontWeight: '600' },
});
