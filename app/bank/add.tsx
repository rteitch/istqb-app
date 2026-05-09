import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, SafeAreaView, StatusBar, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { MaterialIcons } from '@expo/vector-icons';
import { ISTQB_LEVELS } from '../../constants/istqb';

export default function AddQuestionScreen() {
  const router = useRouter();
  const db = useSQLiteContext();
  const [qText, setQText] = useState('');
  const [optA, setOptA] = useState('');
  const [optB, setOptB] = useState('');
  const [optC, setOptC] = useState('');
  const [optD, setOptD] = useState('');
  const [expA, setExpA] = useState('');
  const [expB, setExpB] = useState('');
  const [expC, setExpC] = useState('');
  const [expD, setExpD] = useState('');
  const [correctAnswer, setCorrectAnswer] = useState('A');
  const [explanation, setExplanation] = useState('');
  const [language, setLanguage] = useState('id');
  const [selectedLevel, setSelectedLevel] = useState('Foundation');
  const [selectedCategory, setSelectedCategory] = useState('CTFL');

  const currentLevelInfo = ISTQB_LEVELS.find((l) => l.level === selectedLevel);
  const levelColor = currentLevelInfo?.color ?? '#1565C0';

  const handleSave = async () => {
    if (!qText || !optA || !optB || !optC || !optD) {
      if (Platform.OS === 'web') {
        alert('Harap isi pertanyaan dan semua pilihan jawaban!');
      } else {
        Alert.alert('Error', 'Harap isi pertanyaan dan semua pilihan jawaban!');
      }
      return;
    }
    try {
      await db.runAsync(
        `INSERT INTO questions (question_text, option_a, option_b, option_c, option_d, correct_answer, explanation, explanation_a, explanation_b, explanation_c, explanation_d, language, category, level) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [qText, optA, optB, optC, optD, correctAnswer, explanation, expA, expB, expC, expD, language, selectedCategory, selectedLevel]
      );
      if (Platform.OS === 'web') {
        alert('Soal berhasil ditambahkan');
        router.back();
      } else {
        Alert.alert('Sukses', 'Soal berhasil ditambahkan', [{ text: 'OK', onPress: () => router.back() }]);
      }
    } catch (e) {
      if (Platform.OS === 'web') {
        alert('Gagal menyimpan soal');
      } else {
        Alert.alert('Error', 'Gagal menyimpan soal');
      }
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#1E293B" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tambah Soal</Text>
      </View>

      <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
        {/* Level Selection */}
        <Text style={styles.sectionTitle}>Level & Kategori</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.levelRow}>
          {ISTQB_LEVELS.map((l) => (
            <TouchableOpacity key={l.level} style={[styles.levelChip, selectedLevel === l.level && { backgroundColor: l.color, borderColor: l.color }]}
              onPress={() => { setSelectedLevel(l.level); setSelectedCategory(l.categories[0].code); }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <MaterialIcons name="menu-book" size={16} color={selectedLevel === l.level ? 'white' : '#64748B'} style={{ marginRight: 4 }} />
                <Text style={[styles.levelChipText, selectedLevel === l.level && styles.chipTextActive]}>{l.level}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Category Selection */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catRow}>
          {(currentLevelInfo?.categories ?? []).map((c) => (
            <TouchableOpacity key={c.code} style={[styles.catChip, selectedCategory === c.code && { backgroundColor: levelColor, borderColor: levelColor }]}
              onPress={() => setSelectedCategory(c.code)}>
              <Text style={[styles.catChipText, selectedCategory === c.code && styles.chipTextActive]}>{c.shortName}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Language */}
        <Text style={styles.label}>Bahasa Soal</Text>
        <View style={styles.row}>
          {(['id', 'en'] as const).map((lang) => (
            <TouchableOpacity key={lang} style={[styles.btn, language === lang && { backgroundColor: levelColor, borderColor: levelColor }]} onPress={() => setLanguage(lang)}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <MaterialIcons name="language" size={16} color={language === lang ? 'white' : '#64748B'} style={{ marginRight: 6 }} />
                <Text style={[styles.btnText, language === lang && styles.chipTextActive]}>{lang === 'id' ? 'Indonesia' : 'English'}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Question */}
        <Text style={styles.label}>Pertanyaan *</Text>
        <TextInput style={[styles.input, styles.textArea]} multiline value={qText} onChangeText={setQText} placeholder="Tulis pertanyaan di sini..." placeholderTextColor="#94A3B8" />

        {/* Options */}
        {[{ key: 'A', val: optA, set: setOptA, exp: expA, setExp: setExpA },
          { key: 'B', val: optB, set: setOptB, exp: expB, setExp: setExpB },
          { key: 'C', val: optC, set: setOptC, exp: expC, setExp: setExpC },
          { key: 'D', val: optD, set: setOptD, exp: expD, setExp: setExpD },
        ].map(({ key, val, set, exp, setExp }) => (
          <View key={key}>
            <Text style={styles.label}>Pilihan {key} *</Text>
            <TextInput style={styles.input} value={val} onChangeText={set} placeholder={`Tulis pilihan ${key}`} placeholderTextColor="#94A3B8" />
            <Text style={styles.labelSub}>Penjelasan Pilihan {key} (opsional)</Text>
            <TextInput style={[styles.input, styles.inputSub]} value={exp} onChangeText={setExp} placeholder={`Kenapa pilihan ${key} benar/salah...`} placeholderTextColor="#CBD5E1" multiline />
          </View>
        ))}

        {/* Correct Answer */}
        <Text style={styles.label}>Jawaban Benar *</Text>
        <View style={styles.row}>
          {['A', 'B', 'C', 'D'].map((opt) => (
            <TouchableOpacity key={opt} style={[styles.btn, correctAnswer === opt && { backgroundColor: '#22C55E', borderColor: '#22C55E' }]} onPress={() => setCorrectAnswer(opt)}>
              <Text style={[styles.btnText, correctAnswer === opt && styles.chipTextActive]}>{opt}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* General Explanation */}
        <Text style={styles.label}>Pembahasan Umum</Text>
        <TextInput style={[styles.input, styles.textArea]} multiline value={explanation} onChangeText={setExplanation} placeholder="Penjelasan umum mengapa jawaban tersebut benar..." placeholderTextColor="#94A3B8" />

        <TouchableOpacity style={[styles.saveBtn, { backgroundColor: levelColor }]} onPress={handleSave}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <MaterialIcons name="save" size={20} color="white" style={{ marginRight: 8 }} />
            <Text style={styles.saveBtnText}>Simpan Soal</Text>
          </View>
        </TouchableOpacity>
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAFC' },
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
  chipTextActive: { color: 'white' },
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
