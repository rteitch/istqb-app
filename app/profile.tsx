import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, SafeAreaView, StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { useI18n } from './context/I18nContext';
import { useConfirmDialog } from '../components/ConfirmDialog';

interface CategoryStat {
  category: string;
  total: number;
  passed: number;
  avg_score: number;
}

export default function ProfileScreen() {
  const router = useRouter();
  const db = useSQLiteContext();
  const { lang, setLang } = useI18n();
  const { showAlert, showConfirm, Dialog } = useConfirmDialog();
  const [name, setName] = useState('');
  const [savedName, setSavedName] = useState('');
  const [userId, setUserId] = useState<number | null>(null);
  const [categoryStats, setCategoryStats] = useState<CategoryStat[]>([]);

  useFocusEffect(useCallback(() => { loadProfile(); }, []));

  const loadProfile = async () => {
    try {
      const user = await db.getFirstAsync<{ id: number; name: string }>('SELECT id, name FROM users LIMIT 1');
      if (user) {
        setUserId(user.id);
        setName(user.name);
        setSavedName(user.name);
      }
      const stats = await db.getAllAsync<CategoryStat>(`
        SELECT category, COUNT(*) as total,
               SUM(passed) as passed,
               AVG(score_percent) as avg_score
        FROM exam_sessions GROUP BY category ORDER BY total DESC
      `);
      setCategoryStats(stats);
    } catch (e) { console.error(e); }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      showAlert({ title: 'Error', message: 'Nama tidak boleh kosong' });
      return;
    }
    try {
      if (userId) {
        await db.runAsync('UPDATE users SET name = ? WHERE id = ?', [name.trim(), userId]);
      } else {
        const result = await db.runAsync('INSERT INTO users (name) VALUES (?)', [name.trim()]);
        setUserId(Number(result.lastInsertRowId));
      }
      setSavedName(name.trim());
      showAlert({ title: 'Tersimpan', message: 'Profil berhasil disimpan!' });
    } catch (e) {
      showAlert({ title: 'Error', message: 'Gagal menyimpan profil' });
    }
  };

  const handleResetDatabase = () => {
    showConfirm({
      title: 'Reset Database',
      message: 'Apakah Anda yakin ingin mengembalikan bank soal ke kondisi awal (default)? Semua riwayat ujian juga akan terhapus. Aplikasi perlu dimuat ulang.',
      confirmText: 'Ya, Reset',
      destructive: true,
      onConfirm: async () => {
        try {
          await db.execAsync(`
            PRAGMA foreign_keys = OFF;
            DELETE FROM exam_session_answers;
            DELETE FROM exam_sessions;
            DELETE FROM question_translations;
            DELETE FROM questions;
            PRAGMA foreign_keys = ON;
          `);
          showAlert({ 
            title: 'Berhasil', 
            message: 'Database telah direset. Silakan tutup dan buka kembali aplikasi ini agar soal bawaan (default) dimuat ulang.' 
          });
          if (typeof window !== 'undefined') {
            window.location.reload();
          }
        } catch (e) {
          showAlert({ title: 'Error', message: 'Gagal mereset database' });
        }
      }
    });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#1E293B" />
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/');
            }
          }} 
          style={styles.backBtn}
        >
          <MaterialIcons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profil Saya</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{name ? name.charAt(0).toUpperCase() : '?'}</Text>
          </View>
          {savedName ? <Text style={styles.savedName}>{savedName}</Text> : null}
        </View>

        {/* Name Input */}
        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Nama Saya</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Masukkan nama kamu..."
            placeholderTextColor="#94A3B8"
            returnKeyType="done"
          />
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <MaterialIcons name="save" size={20} color="white" style={{ marginRight: 8 }} />
              <Text style={styles.saveBtnText}>Simpan Nama</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Language Toggle */}
        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Bahasa UI</Text>
          <View style={styles.langRow}>
            {(['id', 'en'] as const).map((l) => (
              <TouchableOpacity
                key={l}
                style={[styles.langBtn, lang === l && styles.langBtnActive]}
                onPress={() => setLang(l)}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <MaterialIcons name="language" size={16} color={lang === l ? '#1D4ED8' : '#94A3B8'} style={{ marginRight: 6 }} />
                  <Text style={[styles.langText, lang === l && styles.langTextActive]}>
                    {l === 'id' ? 'Indonesia' : 'English'}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Stats per Category */}
        {categoryStats.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.fieldLabel}>Statistik per Kategori</Text>
            {categoryStats.map((s) => (
              <View key={s.category} style={styles.statRow}>
                <View style={styles.statLeft}>
                  <Text style={styles.statCat}>{s.category}</Text>
                  <Text style={styles.statSub}>{s.total} ujian • {s.passed} lulus</Text>
                </View>
                <Text style={styles.statAvg}>{Math.round(s.avg_score)}%</Text>
              </View>
            ))}
          </View>
        )}

        {/* Danger Zone */}
        <View style={styles.card}>
          <Text style={[styles.fieldLabel, { color: '#EF4444' }]}>Zona Berbahaya</Text>
          <Text style={styles.dangerDesc}>
            Menghapus seluruh soal tambahan yang pernah Anda buat dan mengembalikan bank soal ke kondisi awal (default 50 soal). Riwayat ujian juga akan terhapus.
          </Text>
          <TouchableOpacity style={styles.resetBtn} onPress={handleResetDatabase}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <MaterialIcons name="warning" size={18} color="white" style={{ marginRight: 8 }} />
              <Text style={styles.resetBtnText}>Reset Database & Bank Soal</Text>
            </View>
          </TouchableOpacity>
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>
      {Dialog}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 14, backgroundColor: '#1E293B', gap: 14 },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: 'white' },
  avatarSection: { alignItems: 'center', paddingVertical: 28, backgroundColor: '#1E293B' },
  avatarCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#3B82F6', alignItems: 'center', justifyContent: 'center', marginBottom: 12, borderWidth: 3, borderColor: 'rgba(255,255,255,0.3)' },
  avatarText: { fontSize: 36, fontWeight: '800', color: 'white' },
  savedName: { fontSize: 18, fontWeight: '700', color: 'white' },
  card: { backgroundColor: 'white', margin: 16, marginBottom: 0, borderRadius: 14, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  fieldLabel: { fontSize: 13, fontWeight: '700', color: '#64748B', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 10, padding: 14, fontSize: 16, color: '#1E293B', backgroundColor: '#F8FAFC', marginBottom: 12 },
  saveBtn: { backgroundColor: '#1565C0', borderRadius: 10, padding: 14, alignItems: 'center', justifyContent: 'center' },
  saveBtnText: { color: 'white', fontSize: 15, fontWeight: '700' },
  langRow: { flexDirection: 'row', gap: 10 },
  langBtn: { flex: 1, borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 10, padding: 12, alignItems: 'center', backgroundColor: '#F8FAFC', justifyContent: 'center' },
  langBtnActive: { borderColor: '#1565C0', backgroundColor: '#EFF6FF' },
  langText: { fontSize: 14, fontWeight: '600', color: '#94A3B8' },
  langTextActive: { color: '#1D4ED8' },
  statRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  statLeft: { flex: 1 },
  statCat: { fontSize: 14, fontWeight: '700', color: '#1E293B' },
  statSub: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  statAvg: { fontSize: 20, fontWeight: '800', color: '#3B82F6' },
  dangerDesc: { fontSize: 13, color: '#64748B', marginBottom: 14, lineHeight: 20 },
  resetBtn: { backgroundColor: '#EF4444', borderRadius: 10, padding: 14, alignItems: 'center', justifyContent: 'center' },
  resetBtnText: { color: 'white', fontSize: 14, fontWeight: '700' },
});
