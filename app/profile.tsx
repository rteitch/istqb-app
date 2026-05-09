import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState, useCallback } from 'react';
import { 
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView,  StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { useI18n } from '../context/I18nContext';
import { useConfirmDialog } from '../components/ConfirmDialog';
import { useTheme } from '../context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import questionsData from '../data/questions_id_ctfl.json';
import questionsEnData from '../data/questions_en_ctfl.json';

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
  const { isDarkMode, setTheme, colors } = useTheme();
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
      message: 'Apakah Anda yakin ingin menghapus seluruh soal dan riwayat ujian? Aplikasi perlu dimuat ulang setelahnya.',
      confirmText: 'Ya, Reset',
      destructive: true,
      requireInput: 'RESET',
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
            message: 'Database telah dikosongkan. Silakan tutup dan buka kembali aplikasi ini.' 
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

  const handleImportDefault = () => {
    showConfirm({
      title: 'Import Soal Default',
      message: 'Apakah Anda yakin ingin menambahkan soal-soal bawaan (default) CTFL ke dalam bank soal Anda? Soal yang sudah ada tidak akan terhapus.',
      confirmText: 'Ya, Import',
      onConfirm: async () => {
        try {
          await db.execAsync('BEGIN TRANSACTION;');
          const idMap: number[] = [];
          let importedCount = 0;
          let skippedCount = 0;
          
          for (let i = 0; i < questionsData.length; i++) {
            const q = questionsData[i];
            
            // Cek apakah soal ini sudah ada
            const existing = await db.getFirstAsync(
              `SELECT question_id FROM question_translations WHERE locale = 'id' AND question_text = ? LIMIT 1`,
              [q.question_text]
            );
            
            if (existing) {
              idMap.push(null as any); // Lewati EN translation juga
              skippedCount++;
              continue;
            }

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
                q.explanation ?? null, q.explanation_a ?? null, q.explanation_b ?? null,
                q.explanation_c ?? null, q.explanation_d ?? null, 1
              ]
            );
            importedCount++;
          }

          for (let i = 0; i < questionsEnData.length; i++) {
            const q = questionsEnData[i];
            const questionId = idMap[i];
            if (!questionId) continue;

            await db.runAsync(
              `INSERT INTO question_translations 
                (question_id, locale, question_text, option_a, option_b, option_c, option_d,
                 explanation, explanation_a, explanation_b, explanation_c, explanation_d, is_verified)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                questionId, 'en', q.question_text, q.option_a, q.option_b, q.option_c, q.option_d,
                q.explanation ?? null, q.explanation_a ?? null, q.explanation_b ?? null,
                q.explanation_c ?? null, q.explanation_d ?? null, 1
              ]
            );
          }
          await db.execAsync('COMMIT;');
          
          if (importedCount === 0) {
            showAlert({ title: 'Info', message: 'Semua soal default sudah ada di database.' });
          } else {
            showAlert({ title: 'Berhasil', message: `${importedCount} Soal default berhasil diimpor. (${skippedCount} dilewati karena duplikat)` });
          }
        } catch (e) {
          await db.execAsync('ROLLBACK;');
          console.error(e);
          showAlert({ title: 'Error', message: 'Gagal mengimpor soal default' });
        }
      }
    });
  };

  const gradientHeader: [string, string] = isDarkMode
    ? [colors.card, colors.background]
    : [colors.primary, colors.primaryHover];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor={isDarkMode ? colors.card : colors.primary} />
      
      <LinearGradient colors={gradientHeader} style={styles.headerHero}>
        <View style={styles.headerTop}>
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
          <View style={{ width: 24 }} />
        </View>

        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={[styles.avatarCircle, { backgroundColor: isDarkMode ? colors.primaryHover : 'rgba(255,255,255,0.2)' }]}>
            <Text style={styles.avatarText}>{savedName ? savedName.charAt(0).toUpperCase() : '?'}</Text>
          </View>
          {savedName ? <Text style={styles.savedName}>{savedName}</Text> : null}
        </View>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* Name Input */}
        <View style={[styles.card, { backgroundColor: colors.card }, isDarkMode && styles.darkCard]}>
          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Nama Saya</Text>
          <TextInput
            style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: isDarkMode ? colors.background : '#F8FAFC' }]}
            value={name}
            onChangeText={setName}
            placeholder="Masukkan nama kamu..."
            placeholderTextColor={colors.textMuted}
            returnKeyType="done"
          />
          <TouchableOpacity activeOpacity={0.8} onPress={handleSave}>
             <LinearGradient 
                colors={(isDarkMode ? [colors.primary, '#2563EB'] : [colors.primary, '#3B82F6']) as [string, string]} 
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={styles.saveBtn}
             >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <MaterialIcons name="save" size={20} color="white" style={{ marginRight: 8 }} />
                <Text style={styles.saveBtnText}>Simpan Nama</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Theme Toggle */}
        <View style={[styles.card, { backgroundColor: colors.card }, isDarkMode && styles.darkCard]}>
          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Tema Tampilan</Text>
          <View style={styles.langRow}>
            <TouchableOpacity
              style={[
                styles.langBtn, 
                { backgroundColor: isDarkMode ? colors.background : '#F8FAFC', borderColor: colors.border }, 
                !isDarkMode && { backgroundColor: colors.selected, borderColor: colors.selectedBorder }
              ]}
              onPress={() => setTheme(false)}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <MaterialIcons name="light-mode" size={18} color={!isDarkMode ? colors.selectedText : colors.textMuted} style={{ marginRight: 6 }} />
                <Text style={[styles.langText, { color: colors.textMuted }, !isDarkMode && { color: colors.selectedText }]} adjustsFontSizeToFit numberOfLines={1}>Terang</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.langBtn, 
                { backgroundColor: isDarkMode ? colors.background : '#F8FAFC', borderColor: colors.border }, 
                isDarkMode && { backgroundColor: colors.selected, borderColor: colors.selectedBorder }
              ]}
              onPress={() => setTheme(true)}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <MaterialIcons name="dark-mode" size={18} color={isDarkMode ? colors.selectedText : colors.textMuted} style={{ marginRight: 6 }} />
                <Text style={[styles.langText, { color: colors.textMuted }, isDarkMode && { color: colors.selectedText }]} adjustsFontSizeToFit numberOfLines={1}>Gelap</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Language Toggle */}
        <View style={[styles.card, { backgroundColor: colors.card }, isDarkMode && styles.darkCard]}>
          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Bahasa UI</Text>
          <View style={styles.langRow}>
            {(['id', 'en'] as const).map((l) => (
              <TouchableOpacity
                key={l}
                style={[
                  styles.langBtn, 
                  { backgroundColor: isDarkMode ? colors.background : '#F8FAFC', borderColor: colors.border }, 
                  lang === l && { backgroundColor: colors.selected, borderColor: colors.selectedBorder }
                ]}
                onPress={() => setLang(l)}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <MaterialIcons name="language" size={18} color={lang === l ? colors.selectedText : colors.textMuted} style={{ marginRight: 6, flexShrink: 0 }} />
                  <Text style={[styles.langText, { color: colors.textMuted }, lang === l && { color: colors.selectedText }]} adjustsFontSizeToFit numberOfLines={1}>
                    {l === 'id' ? 'Indonesia' : 'English'}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Stats per Category */}
        {categoryStats.length > 0 && (
          <View style={[styles.card, { backgroundColor: colors.card }, isDarkMode && styles.darkCard]}>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Statistik per Kategori</Text>
            {categoryStats.map((s, idx) => (
              <View key={s.category} style={[styles.statRow, { borderBottomColor: colors.border }, idx === categoryStats.length - 1 && { borderBottomWidth: 0 }]}>
                <View style={styles.statLeft}>
                  <Text style={[styles.statCat, { color: colors.text }]} adjustsFontSizeToFit numberOfLines={1}>{s.category}</Text>
                  <Text style={[styles.statSub, { color: colors.textSecondary }]}>{s.total} ujian • {s.passed} lulus</Text>
                </View>
                <Text style={[styles.statAvg, { color: colors.primary }]} adjustsFontSizeToFit numberOfLines={1}>{Math.round(s.avg_score)}%</Text>
              </View>
            ))}
          </View>
        )}

        {/* Manajemen Data */}
        <View style={[styles.card, { backgroundColor: colors.card }, isDarkMode && styles.darkCard]}>
          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Manajemen Data</Text>
          <Text style={[styles.dangerDesc, { color: colors.textSecondary }]}>
            Kelola bank soal Anda. Mengimpor soal default akan menambahkan 50 soal bawaan CTFL. Reset database akan menghapus seluruh soal dan histori Anda.
          </Text>
          <TouchableOpacity activeOpacity={0.8} onPress={handleImportDefault} style={{ marginBottom: 12 }}>
             <LinearGradient 
                colors={[colors.primary, colors.primaryHover]} 
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={styles.resetBtn}
             >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <MaterialIcons name="file-download" size={20} color="white" style={{ marginRight: 8, flexShrink: 0 }} />
                <Text style={styles.resetBtnText} adjustsFontSizeToFit numberOfLines={1}>Import Soal Default (CTFL)</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.8} onPress={handleResetDatabase}>
             <LinearGradient 
                colors={[colors.danger, '#B91C1C'] as [string, string]} 
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={styles.resetBtn}
             >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <MaterialIcons name="delete-forever" size={20} color="white" style={{ marginRight: 8, flexShrink: 0 }} />
                <Text style={styles.resetBtnText} adjustsFontSizeToFit numberOfLines={1}>Kosongkan Semua Data</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </View>
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textMuted }]}>ISTQB APP v1.0.0</Text>
          <Text style={[styles.footerText, { color: colors.textMuted }]}>Dibuat oleh Rizal TH</Text>
        </View>
      </ScrollView>
      {Dialog}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  headerHero: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 32, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  backBtn: { padding: 4, marginLeft: -4 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: 'white' },
  avatarSection: { alignItems: 'center' },
  avatarCircle: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center', marginBottom: 12, borderWidth: 3, borderColor: 'rgba(255,255,255,0.3)' },
  avatarText: { fontSize: 40, fontWeight: '800', color: 'white' },
  savedName: { fontSize: 20, fontWeight: '800', color: 'white' },
  scrollContent: { paddingTop: 12, paddingBottom: 20 },
  card: { marginHorizontal: 16, marginBottom: 16, borderRadius: 16, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3 },
  darkCard: { borderWidth: 1, shadowOpacity: 0 },
  fieldLabel: { fontSize: 13, fontWeight: '800', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { borderWidth: 1.5, borderRadius: 12, padding: 14, fontSize: 16, marginBottom: 16, fontWeight: '500' },
  saveBtn: { borderRadius: 12, padding: 16, alignItems: 'center', justifyContent: 'center', elevation: 2 },
  saveBtnText: { color: 'white', fontSize: 16, fontWeight: '800' },
  langRow: { flexDirection: 'row', gap: 12 },
  langBtn: { flex: 1, borderWidth: 1.5, borderRadius: 12, padding: 14, alignItems: 'center', justifyContent: 'center' },
  langText: { fontSize: 14, fontWeight: '700' },
  statRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1 },
  statLeft: { flex: 1 },
  statCat: { fontSize: 15, fontWeight: '800', marginBottom: 2 },
  statSub: { fontSize: 13 },
  statAvg: { fontSize: 22, fontWeight: '800' },
  dangerDesc: { fontSize: 14, marginBottom: 16, lineHeight: 22 },
  resetBtn: { borderRadius: 12, padding: 16, alignItems: 'center', justifyContent: 'center', elevation: 2 },
  resetBtnText: { color: 'white', fontSize: 15, fontWeight: '800' },
  footer: { padding: 20, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  footerText: { fontSize: 12, marginBottom: 4, fontWeight: '500' },
});
