import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, SafeAreaView, StatusBar } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { MaterialIcons } from '@expo/vector-icons';
import { QuestionData } from '../context/SessionContext';
import { ISTQB_LEVELS } from '../../constants/istqb';
import { useConfirmDialog } from '../../components/ConfirmDialog';

interface LocaleState {
  question_text: string;
  option_a: string; option_b: string; option_c: string; option_d: string;
  explanation: string;
  explanation_a: string; explanation_b: string; explanation_c: string; explanation_d: string;
}

const createEmptyLocale = (): LocaleState => ({
  question_text: '', option_a: '', option_b: '', option_c: '', option_d: '',
  explanation: '', explanation_a: '', explanation_b: '', explanation_c: '', explanation_d: '',
});

export default function EditQuestionScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const db = useSQLiteContext();
  const { showAlert, Dialog } = useConfirmDialog();
  const [loading, setLoading] = useState(true);

  const [translations, setTranslations] = useState<Record<'id' | 'en', LocaleState>>({
    id: createEmptyLocale(),
    en: createEmptyLocale()
  });
  
  const [language, setLanguage] = useState<'id' | 'en'>('id');
  const [correctAnswer, setCorrectAnswer] = useState(0);
  const [selectedLevel, setSelectedLevel] = useState('Foundation');
  const [selectedCategory, setSelectedCategory] = useState('CTFL');
  const [isVerified, setIsVerified] = useState(false);

  const currentLevelInfo = ISTQB_LEVELS.find((l) => l.level === selectedLevel);
  const levelColor = currentLevelInfo?.color ?? '#1565C0';

  useEffect(() => {
    if (id) fetchQuestion();
  }, [id]);

  const fetchQuestion = async () => {
    try {
      const qData = await db.getFirstAsync<{ correct_answer: number, category: string, level: string }>(
        'SELECT correct_answer, category, level FROM questions WHERE id = ?', [Number(id)]
      );
      if (!qData) {
        showAlert({ title: 'Error', message: 'Soal tidak ditemukan', onConfirm: () => router.back() });
        return;
      }
      
      setCorrectAnswer(qData.correct_answer);
      setSelectedCategory(qData.category ?? 'CTFL');
      setSelectedLevel(qData.level ?? 'Foundation');

      const transRows = await db.getAllAsync<{
        locale: string; question_text: string; option_a: string; option_b: string; option_c: string; option_d: string;
        explanation: string | null; explanation_a: string | null; explanation_b: string | null; explanation_c: string | null; explanation_d: string | null;
        is_verified: number;
      }>('SELECT * FROM question_translations WHERE question_id = ?', [Number(id)]);

      const newTrans = { id: createEmptyLocale(), en: createEmptyLocale() };
      let verified = false;

      transRows.forEach(row => {
        if (row.locale === 'id' || row.locale === 'en') {
           newTrans[row.locale] = {
             question_text: row.question_text,
             option_a: row.option_a, option_b: row.option_b, option_c: row.option_c, option_d: row.option_d,
             explanation: row.explanation ?? '',
             explanation_a: row.explanation_a ?? '', explanation_b: row.explanation_b ?? '',
             explanation_c: row.explanation_c ?? '', explanation_d: row.explanation_d ?? '',
           };
           if (row.is_verified === 1) verified = true;
        }
      });
      setTranslations(newTrans);
      setIsVerified(verified);

    } catch (e) {
      showAlert({ title: 'Error', message: 'Gagal memuat soal' });
    }
    finally { setLoading(false); }
  };

  const handleSave = async () => {
    const t = translations['id'];
    if (!t.question_text.trim() || !t.option_a.trim() || !t.option_b.trim() || !t.option_c.trim() || !t.option_d.trim()) {
      showAlert({ title: 'Error', message: 'Harap isi pertanyaan dan semua pilihan jawaban (Minimal Bahasa Indonesia)!' });
      return;
    }
    try {
      await db.withTransactionAsync(async () => {
        await db.runAsync(
          `UPDATE questions SET correct_answer=?, category=?, level=? WHERE id=?`,
          [correctAnswer, selectedCategory, selectedLevel, Number(id)]
        );
        
        for (const loc of ['id', 'en'] as const) {
          const trans = translations[loc];
          // Hanya simpan jika ada isi (atau update jika sudah ada)
          const exists = await db.getFirstAsync('SELECT id FROM question_translations WHERE question_id=? AND locale=?', [Number(id), loc]);
          if (exists) {
            await db.runAsync(
              `UPDATE question_translations SET 
                question_text=?, option_a=?, option_b=?, option_c=?, option_d=?,
                explanation=?, explanation_a=?, explanation_b=?, explanation_c=?, explanation_d=?,
                is_verified=?
               WHERE question_id=? AND locale=?`,
              [
                trans.question_text.trim(), trans.option_a.trim(), trans.option_b.trim(), trans.option_c.trim(), trans.option_d.trim(),
                trans.explanation.trim(), trans.explanation_a.trim(), trans.explanation_b.trim(), trans.explanation_c.trim(), trans.explanation_d.trim(),
                isVerified ? 1 : 0, Number(id), loc
              ]
            );
          } else if (trans.question_text.trim() !== '') {
            await db.runAsync(
              `INSERT INTO question_translations (question_id, locale, question_text, option_a, option_b, option_c, option_d, explanation, explanation_a, explanation_b, explanation_c, explanation_d, is_verified)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                Number(id), loc,
                trans.question_text.trim(), trans.option_a.trim(), trans.option_b.trim(), trans.option_c.trim(), trans.option_d.trim(),
                trans.explanation.trim(), trans.explanation_a.trim(), trans.explanation_b.trim(), trans.explanation_c.trim(), trans.explanation_d.trim(),
                isVerified ? 1 : 0
              ]
            );
          }
        }
      });
      showAlert({
        title: 'Sukses',
        message: 'Soal berhasil diubah',
        onConfirm: () => router.back(),
      });
    } catch (e) {
      console.error(e);
      showAlert({ title: 'Error', message: 'Gagal menyimpan soal' });
    }
  };

  const updateTranslation = (field: keyof LocaleState, value: string) => {
    setTranslations(prev => ({
      ...prev,
      [language]: { ...prev[language], [field]: value }
    }));
  };

  const currentTrans = translations[language];

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" /></View>;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#1E293B" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Soal</Text>
      </View>

      <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>Level & Kategori</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.levelRow}>
          {ISTQB_LEVELS.map((l) => (
            <TouchableOpacity key={l.level} style={[styles.levelChip, selectedLevel === l.level && { backgroundColor: l.color, borderColor: l.color }]}
              onPress={() => { setSelectedLevel(l.level); setSelectedCategory(l.categories[0].code); }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <MaterialIcons name="menu-book" size={16} color={selectedLevel === l.level ? 'white' : '#64748B'} style={{ marginRight: 4 }} />
                <Text style={[styles.levelChipText, selectedLevel === l.level && styles.activeText]}>{l.level}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catRow}>
          {(currentLevelInfo?.categories ?? []).map((c) => (
            <TouchableOpacity key={c.code} style={[styles.catChip, selectedCategory === c.code && { backgroundColor: levelColor, borderColor: levelColor }]}
              onPress={() => setSelectedCategory(c.code)}>
              <Text style={[styles.catChipText, selectedCategory === c.code && styles.activeText]}>{c.shortName}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={styles.label}>Bahasa Soal</Text>
        <View style={styles.row}>
          {(['id', 'en'] as const).map((lang) => (
            <TouchableOpacity key={lang} style={[styles.btn, language === lang && { backgroundColor: levelColor, borderColor: levelColor }]} onPress={() => setLanguage(lang)}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <MaterialIcons name="language" size={16} color={language === lang ? 'white' : '#64748B'} style={{ marginRight: 6 }} />
                <Text style={[styles.btnText, language === lang && styles.activeText]}>{lang === 'id' ? 'Indonesia' : 'English'}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Pertanyaan *</Text>
        <TextInput style={[styles.input, styles.textArea]} multiline value={currentTrans.question_text} onChangeText={(v) => updateTranslation('question_text', v)} placeholder="Tulis pertanyaan..." placeholderTextColor="#94A3B8" />

        {[{ key: 'A', idx: 0, val: currentTrans.option_a, field: 'option_a' as const, exp: currentTrans.explanation_a, expField: 'explanation_a' as const },
          { key: 'B', idx: 1, val: currentTrans.option_b, field: 'option_b' as const, exp: currentTrans.explanation_b, expField: 'explanation_b' as const },
          { key: 'C', idx: 2, val: currentTrans.option_c, field: 'option_c' as const, exp: currentTrans.explanation_c, expField: 'explanation_c' as const },
          { key: 'D', idx: 3, val: currentTrans.option_d, field: 'option_d' as const, exp: currentTrans.explanation_d, expField: 'explanation_d' as const },
        ].map(({ key, idx, val, field, exp, expField }) => (
          <View key={key}>
            <Text style={styles.label}>Pilihan {key} *</Text>
            <TextInput style={styles.input} value={val} onChangeText={(v) => updateTranslation(field, v)} placeholder={`Pilihan ${key}`} placeholderTextColor="#94A3B8" />
            <Text style={styles.labelSub}>Penjelasan Pilihan {key}</Text>
            <TextInput style={[styles.input, styles.inputSub]} value={exp} onChangeText={(v) => updateTranslation(expField, v)} placeholder={`Penjelasan pilihan ${key}...`} placeholderTextColor="#CBD5E1" multiline />
          </View>
        ))}

        <Text style={styles.label}>Jawaban Benar *</Text>
        <View style={styles.row}>
          {['A', 'B', 'C', 'D'].map((opt, index) => (
            <TouchableOpacity key={opt} style={[styles.btn, correctAnswer === index && { backgroundColor: '#22C55E', borderColor: '#22C55E' }]} onPress={() => setCorrectAnswer(index)}>
              <Text style={[styles.btnText, correctAnswer === index && styles.activeText]}>{opt}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Pembahasan Umum</Text>
        <TextInput style={[styles.input, styles.textArea]} multiline value={currentTrans.explanation} onChangeText={(v) => updateTranslation('explanation', v)} placeholder="Penjelasan umum jawaban..." placeholderTextColor="#94A3B8" />

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 24, marginBottom: 8, paddingHorizontal: 4 }}>
          <Text style={[styles.label, { marginTop: 0, marginBottom: 0 }]}>Terverifikasi (Verified)</Text>
          <TouchableOpacity onPress={() => setIsVerified(!isVerified)} style={{ padding: 4 }}>
            <MaterialIcons name={isVerified ? 'check-circle' : 'radio-button-unchecked'} size={28} color={isVerified ? '#22C55E' : '#94A3B8'} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={[styles.saveBtn, { backgroundColor: levelColor }]} onPress={handleSave}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <MaterialIcons name="save" size={20} color="white" style={{ marginRight: 8 }} />
            <Text style={styles.saveBtnText}>Simpan Perubahan</Text>
          </View>
        </TouchableOpacity>
        <View style={{ height: 40 }} />
      </ScrollView>
      {Dialog}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAFC' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 14, backgroundColor: '#1E293B', gap: 14 },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: 'white' },
  form: { flex: 1, paddingHorizontal: 16 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#64748B', marginTop: 20, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  levelRow: { marginBottom: 8 },
  catRow: { marginBottom: 4 },
  levelChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5, borderColor: '#E2E8F0', backgroundColor: '#F8FAFC', marginRight: 8 },
  levelChipText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  catChip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 16, borderWidth: 1.5, borderColor: '#E2E8F0', backgroundColor: '#F8FAFC', marginRight: 8 },
  catChipText: { fontSize: 12, fontWeight: '600', color: '#64748B' },
  activeText: { color: 'white' },
  label: { fontSize: 14, fontWeight: '700', color: '#334155', marginBottom: 6, marginTop: 14 },
  labelSub: { fontSize: 12, fontWeight: '600', color: '#94A3B8', marginBottom: 4, marginTop: 6 },
  input: { backgroundColor: 'white', borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 10, padding: 12, fontSize: 15, color: '#1E293B' },
  inputSub: { fontSize: 13, backgroundColor: '#F8FAFC', borderColor: '#F1F5F9', minHeight: 50, textAlignVertical: 'top' },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: 10 },
  btn: { flex: 1, padding: 10, borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 10, alignItems: 'center', backgroundColor: '#F8FAFC' },
  btnText: { fontSize: 13, fontWeight: '700', color: '#64748B' },
  saveBtn: { borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 24, justifyContent: 'center' },
  saveBtnText: { color: 'white', fontSize: 16, fontWeight: '800' },
});
