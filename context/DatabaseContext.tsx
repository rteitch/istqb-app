import React, { Component, ReactNode, useEffect, useState, useCallback } from 'react';
import {
  Platform, View, Text, ActivityIndicator,
  TouchableOpacity, StyleSheet
} from 'react-native';
import { Image } from 'expo-image';
import * as SQLite from 'expo-sqlite';
import questionsData from '../data/questions_id_ctfl.json';
import questionsEnData from '../data/questions_en_ctfl.json';
import { ISTQB_LEVELS } from '../constants/istqb';

// ─── Migrations ───────────────────────────────────────────────────────────────

const runMigrations = async (db: SQLite.SQLiteDatabase) => {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY);
  `);

  let currentVersion = 0;
  try {
    const res = await db.getFirstAsync<{ version: number }>('SELECT MAX(version) as version FROM schema_migrations');
    if (res && res.version) currentVersion = res.version;
  } catch (e) {}

  if (currentVersion < 1) {
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
      CREATE TABLE IF NOT EXISTS app_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
      INSERT INTO schema_migrations (version) VALUES (1);
    `);
  }

  if (currentVersion < 2) {
    await db.execAsync('PRAGMA foreign_keys = OFF;');
    try {
      await db.execAsync(`
        BEGIN TRANSACTION;
        
        CREATE TABLE questions_v2 (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          category TEXT DEFAULT 'CTFL',
          level TEXT DEFAULT 'Foundation',
          correct_answer INTEGER NOT NULL DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE question_translations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          question_id INTEGER NOT NULL,
          locale TEXT NOT NULL,
          question_text TEXT NOT NULL,
          option_a TEXT NOT NULL,
          option_b TEXT NOT NULL,
          option_c TEXT NOT NULL,
          option_d TEXT NOT NULL,
          explanation TEXT,
          explanation_a TEXT,
          explanation_b TEXT,
          explanation_c TEXT,
          explanation_d TEXT,
          translated_by TEXT,
          reviewed_by TEXT,
          is_verified INTEGER DEFAULT 0,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (question_id) REFERENCES questions_v2(id) ON DELETE CASCADE,
          UNIQUE(question_id, locale)
        );

        CREATE INDEX IF NOT EXISTS idx_qt_question_locale ON question_translations(question_id, locale);
        CREATE INDEX IF NOT EXISTS idx_questions_category ON questions_v2(category, level);

        CREATE TRIGGER IF NOT EXISTS update_qt_timestamp 
        AFTER UPDATE OF question_text, option_a, option_b, option_c, option_d,
          explanation, explanation_a, explanation_b, explanation_c, explanation_d,
          translated_by, reviewed_by, is_verified
        ON question_translations
        BEGIN
          UPDATE question_translations SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
        END;

        ALTER TABLE exam_session_answers ADD COLUMN question_snapshot TEXT;

        UPDATE exam_session_answers SET question_id = question_id - 40 WHERE question_id > 40;

        DROP TABLE IF EXISTS questions;
        ALTER TABLE questions_v2 RENAME TO questions;

        INSERT INTO schema_migrations (version) VALUES (2);
        
        COMMIT;
      `);
    } catch (e) {
      await db.execAsync('ROLLBACK;');
      console.error('Migration v2 failed:', e);
      throw e;
    } finally {
      await db.execAsync('PRAGMA foreign_keys = ON;');
      await db.execAsync('PRAGMA foreign_key_check;');
    }
  }

  if (currentVersion < 3) {
    await db.execAsync('PRAGMA foreign_keys = OFF;');
    try {
      await db.execAsync(`
        BEGIN TRANSACTION;
        
        CREATE TABLE IF NOT EXISTS levels (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          level_name TEXT UNIQUE NOT NULL,
          description TEXT,
          color TEXT,
          light_color TEXT,
          icon TEXT,
          image_uri TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS categories (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          code TEXT UNIQUE NOT NULL,
          level_name TEXT NOT NULL,
          name TEXT NOT NULL,
          short_name TEXT NOT NULL,
          default_questions INTEGER,
          default_duration INTEGER,
          passing_score INTEGER,
          image_uri TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (level_name) REFERENCES levels(level_name) ON DELETE CASCADE
        );
      `);

      // Seed initial dynamic levels & categories from constants
      for (const level of ISTQB_LEVELS) {
        await db.runAsync(
          `INSERT OR IGNORE INTO levels (level_name, description, color, light_color, icon) VALUES (?, ?, ?, ?, ?)`,
          [level.level, level.description, level.color, level.lightColor, level.icon]
        );
        for (const cat of level.categories) {
          await db.runAsync(
            `INSERT OR IGNORE INTO categories (code, level_name, name, short_name, default_questions, default_duration, passing_score) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [cat.code, level.level, cat.name, cat.shortName, cat.defaultQuestions, cat.defaultDuration, cat.passingScore]
          );
        }
      }

      await db.execAsync(`
        INSERT INTO schema_migrations (version) VALUES (3);
        COMMIT;
      `);
    } catch (e) {
      await db.execAsync('ROLLBACK;');
      console.error('Migration v3 failed:', e);
      throw e;
    } finally {
      await db.execAsync('PRAGMA foreign_keys = ON;');
      await db.execAsync('PRAGMA foreign_key_check;');
    }
  }

  if (currentVersion < 4) {
    await db.execAsync('PRAGMA foreign_keys = OFF;');
    try {
      await db.execAsync(`
        BEGIN TRANSACTION;
        ALTER TABLE questions ADD COLUMN image_uri TEXT;
        INSERT INTO schema_migrations (version) VALUES (4);
        COMMIT;
      `);
    } catch (e) {
      await db.execAsync('ROLLBACK;');
      console.error('Migration v4 failed:', e);
      throw e;
    } finally {
      await db.execAsync('PRAGMA foreign_keys = ON;');
      await db.execAsync('PRAGMA foreign_key_check;');
    }
  }
};

const seedInitialData = async (db: SQLite.SQLiteDatabase) => {
  const r = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM questions');
  
  if (r && r.count === 0) {
    await db.execAsync('BEGIN TRANSACTION;');
    try {
      const idMap: number[] = [];
      
      // Seed ID
      for (let i = 0; i < questionsData.length; i++) {
        const q = questionsData[i];
        const qRes = await db.runAsync(
          `INSERT INTO questions (category, level, correct_answer) VALUES (?, ?, ?)`,
          [q.category ?? 'CTFL', q.level ?? 'Foundation', q.correct_answer]
        );
        const questionId = Number(qRes.lastInsertRowId);
        idMap.push(questionId);
        
        await db.runAsync(
          `INSERT INTO question_translations 
            (question_id, locale, question_text, option_a, option_b, option_c, option_d,
             explanation, explanation_a, explanation_b, explanation_c, explanation_d, is_verified)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            questionId, 'id', q.question_text, q.option_a, q.option_b, q.option_c, q.option_d,
            q.explanation ?? null,
            q.explanation_a ?? null,
            q.explanation_b ?? null,
            q.explanation_c ?? null,
            q.explanation_d ?? null,
            1
          ]
        );
      }

      // Seed EN
      for (let i = 0; i < questionsEnData.length; i++) {
        const q = questionsEnData[i];
        const questionId = idMap[i]; // Link directly to matching ID question index
        if (!questionId) continue;

        await db.runAsync(
          `INSERT INTO question_translations 
            (question_id, locale, question_text, option_a, option_b, option_c, option_d,
             explanation, explanation_a, explanation_b, explanation_c, explanation_d, is_verified)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            questionId, 'en', q.question_text, q.option_a, q.option_b, q.option_c, q.option_d,
            q.explanation ?? null,
            q.explanation_a ?? null,
            q.explanation_b ?? null,
            q.explanation_c ?? null,
            q.explanation_d ?? null,
            1
          ]
        );
      }
      
      await db.execAsync('COMMIT;');
    } catch (e) {
      await db.execAsync('ROLLBACK;');
      console.error('Seed error:', e);
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
        error?.message?.includes('Access Handle') ||
        error?.message?.includes('Invalid VFS state') ||
        error?.message?.includes('VFS')) {
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
        <Image 
          source={require('../assets/images/logo_istqbapp.png')} 
          style={s.loadingLogo} 
          contentFit="contain" 
          transition={300}
        />
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
  loadingLogo: { width: 120, height: 120, marginBottom: 24 },
});
