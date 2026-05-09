import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, SafeAreaView, StatusBar, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Image } from 'expo-image';
import { QuestionData } from '../../context/SessionContext';
import { useBankTypes } from '../../context/BankTypeContext';
import { useConfirmDialog } from '../../components/ConfirmDialog';
import { useTheme } from '../../context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';

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
  const sqliteDb = useSQLiteContext();
  const { showAlert, Dialog } = useConfirmDialog();
  const [loading, setLoading] = useState(true);
  const { levels } = useBankTypes();
  const { colors, isDarkMode } = useTheme();

  const [translations, setTranslations] = useState<Record<'id' | 'en', LocaleState>>({
    id: createEmptyLocale(),
    en: createEmptyLocale()
  });

  const [language, setLanguage] = useState<'id' | 'en'>('id');
  const [correctAnswer, setCorrectAnswer] = useState(0);
  const [selectedLevel, setSelectedLevel] = useState('Foundation');
  const [selectedCategory, setSelectedCategory] = useState('CTFL');
  const [isVerified, setIsVerified] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);

  const currentLevelInfo = levels.find((l) => l.level_name === selectedLevel);
  const levelColor = currentLevelInfo?.color ?? colors.primary;

  useEffect(() => {
    if (id) fetchQuestion();
  }, [id]);

  const fetchQuestion = async () => {
    try {
      const qData = await sqliteDb.getFirstAsync<{ correct_answer: number, category: string, level: string, image_uri: string | null }>(
        'SELECT correct_answer, category, level, image_uri FROM questions WHERE id = ?', [Number(id)]
      );
      if (!qData) {
        showAlert({ title: 'Error', message: 'Soal tidak ditemukan', onConfirm: () => router.back() });
        return;
      }

      setCorrectAnswer(qData.correct_answer);
      setSelectedCategory(qData.category ?? 'CTFL');
      setSelectedLevel(qData.level ?? 'Foundation');
      setImageUri(qData.image_uri);
      setImageError(false);

      const transRows = await sqliteDb.getAllAsync<{
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

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showAlert({ title: 'Akses Ditolak', message: 'Izin akses galeri dibutuhkan untuk memilih gambar.' });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      base64: Platform.OS === 'web',
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      const sourceUri = asset.uri;
      try {
        if (Platform.OS === 'web') {
          if (asset.base64) {
            setImageUri(`data:image/jpeg;base64,${asset.base64}`);
          } else {
            setImageUri(sourceUri);
          }
          setImageError(false);
        } else {
          const filename = sourceUri.split('/').pop() || `img_q_${Date.now()}.jpg`;
          const destUri = `${FileSystem.documentDirectory}${filename}`;
          await FileSystem.copyAsync({ from: sourceUri, to: destUri });
          setImageUri(destUri);
          setImageError(false);
        }
      } catch (e) {
        console.error(e);
        showAlert({ title: 'Error', message: 'Gagal memproses gambar.' });
      }
    }
  };

  const handleSave = async () => {
    const t = translations['id'];
    if (!t.question_text.trim() || !t.option_a.trim() || !t.option_b.trim() || !t.option_c.trim() || !t.option_d.trim()) {
      showAlert({ title: 'Error', message: 'Harap isi pertanyaan dan semua pilihan jawaban (Minimal Bahasa Indonesia)!' });
      return;
    }
    try {
      await sqliteDb.withTransactionAsync(async () => {
        await sqliteDb.runAsync(
          `UPDATE questions SET correct_answer=?, category=?, level=?, image_uri=? WHERE id=?`,
          [correctAnswer, selectedCategory, selectedLevel, imageUri, Number(id)]
        );

        for (const loc of ['id', 'en'] as const) {
          const trans = translations[loc];
          const exists = await sqliteDb.getFirstAsync('SELECT id FROM question_translations WHERE question_id=? AND locale=?', [Number(id), loc]);
          if (exists) {
            await sqliteDb.runAsync(
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
            await sqliteDb.runAsync(
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

  if (loading) return <View style={[styles.center, { backgroundColor: colors.background }]}><ActivityIndicator size="large" color={colors.primary} /></View>;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={colors.card} />
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Edit Soal</Text>
      </View>

      <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Level & Kategori</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.levelRow}>
          {levels.map((l) => (
            <TouchableOpacity key={l.level_name} 
              style={[
                styles.levelChip, 
                { borderColor: colors.border, backgroundColor: isDarkMode ? colors.background : '#F8FAFC' }, 
                selectedLevel === l.level_name && { backgroundColor: l.color, borderColor: l.color }
              ]}
              onPress={() => { setSelectedLevel(l.level_name); setSelectedCategory(l.categories[0]?.code ?? ''); }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <MaterialIcons name="menu-book" size={16} color={selectedLevel === l.level_name ? 'white' : colors.textSecondary} style={{ marginRight: 6 }} />
                <Text style={[styles.levelChipText, { color: colors.textSecondary }, selectedLevel === l.level_name && styles.activeText]}>{l.level_name}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catRow}>
          {(currentLevelInfo?.categories ?? []).map((c) => (
            <TouchableOpacity key={c.code} 
              style={[
                styles.catChip, 
                { borderColor: colors.border, backgroundColor: isDarkMode ? colors.background : '#F8FAFC' }, 
                selectedCategory === c.code && { backgroundColor: levelColor, borderColor: levelColor }
              ]}
              onPress={() => setSelectedCategory(c.code)}>
              <Text style={[styles.catChipText, { color: colors.textSecondary }, selectedCategory === c.code && styles.activeText]}>{c.short_name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={[styles.label, { color: colors.text }]}>Bahasa Soal</Text>
        <View style={styles.row}>
          {(['id', 'en'] as const).map((lang) => (
            <TouchableOpacity key={lang} 
              style={[
                styles.btn, 
                { borderColor: colors.border, backgroundColor: isDarkMode ? colors.background : '#F8FAFC' }, 
                language === lang && { backgroundColor: levelColor, borderColor: levelColor }
              ]} 
              onPress={() => setLanguage(lang)}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <MaterialIcons name="language" size={16} color={language === lang ? 'white' : colors.textSecondary} style={{ marginRight: 6 }} />
                <Text style={[styles.btnText, { color: colors.textSecondary }, language === lang && styles.activeText]}>{lang === 'id' ? 'Indonesia' : 'English'}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.label, { color: colors.text }]}>Pertanyaan *</Text>
        <View style={styles.imagePickerContainer}>
          <TouchableOpacity 
            style={[styles.imageBox, { backgroundColor: isDarkMode ? colors.background : '#F1F5F9', borderColor: colors.border }]} 
            onPress={handlePickImage}
            activeOpacity={0.8}
          >
            {imageUri ? (
              imageError ? (
                <View style={styles.imagePlaceholder}>
                  <MaterialIcons name="broken-image" size={32} color={colors.danger} />
                  <Text style={[styles.imagePlaceholderText, { color: colors.danger, marginTop: 8 }]}>Gambar Kedaluwarsa/Gagal</Text>
                  <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 4 }}>Ketuk untuk pilih ulang</Text>
                </View>
              ) : (
                <Image 
                  source={{ uri: imageUri }} 
                  style={styles.previewImage} 
                  contentFit="contain" 
                  onError={() => setImageError(true)}
                />
              )
            ) : (
              <View style={styles.imagePlaceholder}>
                <View style={[styles.iconCircle, { backgroundColor: colors.border }]}>
                  <MaterialIcons name="add-a-photo" size={24} color={colors.textSecondary} />
                </View>
                <Text style={[styles.imagePlaceholderText, { color: colors.textSecondary }]}>Tambah Gambar (Opsional)</Text>
              </View>
            )}
          </TouchableOpacity>
          {imageUri && (
            <TouchableOpacity style={styles.removeImageBtn} onPress={() => { setImageUri(null); setImageError(false); }}>
              <MaterialIcons name="delete" size={16} color={colors.danger} style={{ marginRight: 4 }} />
              <Text style={[styles.removeImageText, { color: colors.danger }]}>Hapus Gambar</Text>
            </TouchableOpacity>
          )}
        </View>

        <TextInput 
          style={[styles.input, styles.textArea, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]} 
          multiline 
          value={currentTrans.question_text} 
          onChangeText={(v) => updateTranslation('question_text', v)} 
          placeholder="Tulis pertanyaan..." 
          placeholderTextColor={colors.textMuted} 
        />

        {[{ key: 'A', idx: 0, val: currentTrans.option_a, field: 'option_a' as const, exp: currentTrans.explanation_a, expField: 'explanation_a' as const },
          { key: 'B', idx: 1, val: currentTrans.option_b, field: 'option_b' as const, exp: currentTrans.explanation_b, expField: 'explanation_b' as const },
          { key: 'C', idx: 2, val: currentTrans.option_c, field: 'option_c' as const, exp: currentTrans.explanation_c, expField: 'explanation_c' as const },
          { key: 'D', idx: 3, val: currentTrans.option_d, field: 'option_d' as const, exp: currentTrans.explanation_d, expField: 'explanation_d' as const },
        ].map(({ key, idx, val, field, exp, expField }) => (
          <View key={key} style={[styles.optionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.optionHeader}>
              <View style={[styles.optionBadge, { backgroundColor: correctAnswer === idx ? colors.success : colors.border }]}>
                <Text style={[styles.optionBadgeText, { color: correctAnswer === idx ? 'white' : colors.text }]}>{key}</Text>
              </View>
              <Text style={[styles.label, { color: colors.text, marginTop: 0, marginBottom: 0 }]}>Pilihan {key} *</Text>
            </View>
            <TextInput style={[styles.input, { backgroundColor: isDarkMode ? colors.background : '#F8FAFC', borderColor: colors.border, color: colors.text }]} value={val} onChangeText={(v) => updateTranslation(field, v)} placeholder={`Teks pilihan ${key}`} placeholderTextColor={colors.textMuted} />
            
            <Text style={[styles.labelSub, { color: colors.textMuted, marginTop: 12 }]}>Penjelasan Pilihan {key} (Opsional)</Text>
            <TextInput style={[styles.input, styles.inputSub, { backgroundColor: isDarkMode ? colors.background : '#F8FAFC', borderColor: colors.border, color: colors.text }]} value={exp} onChangeText={(v) => updateTranslation(expField, v)} placeholder={`Penjelasan pilihan ${key}...`} placeholderTextColor={colors.textMuted} multiline />
          </View>
        ))}

        <Text style={[styles.label, { color: colors.text, marginTop: 24 }]}>Jawaban Benar *</Text>
        <View style={styles.row}>
          {['A', 'B', 'C', 'D'].map((opt, index) => (
            <TouchableOpacity key={opt} 
              style={[
                styles.btn, 
                { borderColor: colors.border, backgroundColor: isDarkMode ? colors.background : '#F8FAFC' }, 
                correctAnswer === index && { backgroundColor: colors.success, borderColor: colors.success }
              ]} 
              onPress={() => setCorrectAnswer(index)}>
              <Text style={[styles.btnText, { color: colors.textSecondary }, correctAnswer === index && styles.activeText]}>{opt}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.label, { color: colors.text, marginTop: 24 }]}>Pembahasan Umum (Opsional)</Text>
        <TextInput style={[styles.input, styles.textArea, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]} multiline value={currentTrans.explanation} onChangeText={(v) => updateTranslation('explanation', v)} placeholder="Penjelasan umum jawaban..." placeholderTextColor={colors.textMuted} />

        <View style={[styles.verifiedCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.label, { marginTop: 0, marginBottom: 2, color: colors.text }]}>Terverifikasi (Verified)</Text>
            <Text style={{ fontSize: 12, color: colors.textMuted }}>Tandai jika soal ini sudah divalidasi kebenarannya.</Text>
          </View>
          <TouchableOpacity onPress={() => setIsVerified(!isVerified)} style={{ padding: 4 }}>
            <MaterialIcons name={isVerified ? 'check-circle' : 'radio-button-unchecked'} size={32} color={isVerified ? colors.success : colors.textMuted} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity activeOpacity={0.8} onPress={handleSave}>
          <LinearGradient 
            colors={[levelColor, levelColor + 'DD'] as [string, string]} 
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={styles.saveBtn}
          >
            <MaterialIcons name="save" size={20} color="white" style={{ marginRight: 8 }} />
            <Text style={styles.saveBtnText}>Simpan Perubahan</Text>
          </LinearGradient>
        </TouchableOpacity>
        <View style={{ height: 40 }} />
      </ScrollView>
      {Dialog}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 16, gap: 14, borderBottomWidth: 1 },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: '800' },
  form: { flex: 1, paddingHorizontal: 16 },
  sectionTitle: { fontSize: 13, fontWeight: '800', marginTop: 20, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  levelRow: { marginBottom: 10 },
  catRow: { marginBottom: 4 },
  levelChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, marginRight: 8 },
  levelChipText: { fontSize: 13, fontWeight: '700' },
  catChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, borderWidth: 1.5, marginRight: 8 },
  catChipText: { fontSize: 12, fontWeight: '600' },
  activeText: { color: 'white' },
  label: { fontSize: 14, fontWeight: '800', marginBottom: 8, marginTop: 16 },
  labelSub: { fontSize: 12, fontWeight: '700', marginBottom: 6, marginTop: 6 },
  input: { borderWidth: 1.5, borderRadius: 12, padding: 14, fontSize: 15 },
  inputSub: { fontSize: 13, minHeight: 60, textAlignVertical: 'top' },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: 10 },
  btn: { flex: 1, padding: 12, borderWidth: 1.5, borderRadius: 12, alignItems: 'center' },
  btnText: { fontSize: 14, fontWeight: '700' },
  imagePickerContainer: { alignItems: 'flex-start', marginBottom: 16 },
  imageBox: { width: '100%', height: 180, borderRadius: 14, overflow: 'hidden', borderWidth: 1, alignItems: 'center', justifyContent: 'center', borderStyle: 'dashed' },
  previewImage: { width: '100%', height: '100%' },
  imagePlaceholder: { alignItems: 'center', justifyContent: 'center' },
  iconCircle: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  imagePlaceholderText: { fontSize: 13, fontWeight: '600' },
  removeImageBtn: { flexDirection: 'row', alignItems: 'center', marginTop: 10, padding: 6 },
  removeImageText: { fontSize: 13, fontWeight: '700' },
  optionCard: { padding: 16, borderRadius: 16, borderWidth: 1, marginTop: 16 },
  optionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 10 },
  optionBadge: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  optionBadgeText: { fontSize: 14, fontWeight: '800' },
  verifiedCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 24, padding: 16, borderRadius: 16, borderWidth: 1 },
  saveBtn: { borderRadius: 14, padding: 18, alignItems: 'center', marginTop: 24, flexDirection: 'row', justifyContent: 'center', elevation: 2 },
  saveBtnText: { color: 'white', fontSize: 16, fontWeight: '800' },
});
