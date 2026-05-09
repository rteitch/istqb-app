import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState, useEffect } from 'react';
import {  View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView,  StatusBar, Image, ActivityIndicator, Platform  } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useSQLiteContext } from 'expo-sqlite';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useBankTypes } from '../../context/BankTypeContext';
import { useConfirmDialog } from '../../components/ConfirmDialog';
import { useTheme } from '../../context/ThemeContext';

export default function EditCategoryScreen() {
  const router = useRouter();
  const { id, level_name } = useLocalSearchParams();
  const db = useSQLiteContext();
  const { reloadBankTypes } = useBankTypes();
  const { showAlert, Dialog } = useConfirmDialog();
  const { colors, isDarkMode } = useTheme();

  const isEdit = !!id;

  const [loading, setLoading] = useState(isEdit);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [shortName, setShortName] = useState('');
  const [defaultQuestions, setDefaultQuestions] = useState('40');
  const [defaultDuration, setDefaultDuration] = useState('60');
  const [passingScore, setPassingScore] = useState('65');
  const [imageUri, setImageUri] = useState<string | null>(null);

  useEffect(() => {
    if (isEdit) {
      loadCategory();
    }
  }, [id]);

  const loadCategory = async () => {
    try {
      const cat = await db.getFirstAsync<any>('SELECT * FROM categories WHERE id = ?', [Number(id)]);
      if (cat) {
        setCode(cat.code);
        setName(cat.name);
        setShortName(cat.short_name);
        setDefaultQuestions(String(cat.default_questions));
        setDefaultDuration(String(cat.default_duration));
        setPassingScore(String(cat.passing_score));
        setImageUri(cat.image_uri);
      } else {
        showAlert({ title: 'Error', message: 'Kategori tidak ditemukan', onConfirm: () => router.back() });
      }
    } catch (e) {
      console.error(e);
      showAlert({ title: 'Error', message: 'Gagal memuat kategori' });
    } finally {
      setLoading(false);
    }
  };

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showAlert({ title: 'Akses Ditolak', message: 'Izin akses galeri dibutuhkan untuk memilih gambar.' });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const sourceUri = result.assets[0].uri;
      try {
        if (Platform.OS === 'web') {
          setImageUri(sourceUri);
        } else {
          const filename = sourceUri.split('/').pop() || `img_${Date.now()}.jpg`;
          const destUri = `${FileSystem.documentDirectory}${filename}`;
          await FileSystem.copyAsync({ from: sourceUri, to: destUri });
          setImageUri(destUri);
        }
      } catch (e) {
        console.error(e);
        showAlert({ title: 'Error', message: 'Gagal memproses gambar.' });
      }
    }
  };

  const handleSave = async () => {
    if (!code.trim() || !name.trim() || !shortName.trim()) {
      showAlert({ title: 'Error', message: 'Kode, Nama, dan Nama Singkat wajib diisi!' });
      return;
    }

    const qCount = parseInt(defaultQuestions, 10) || 40;
    const dur = parseInt(defaultDuration, 10) || 60;
    const score = parseInt(passingScore, 10) || 65;

    try {
      if (isEdit) {
        await db.runAsync(
          `UPDATE categories SET code=?, name=?, short_name=?, default_questions=?, default_duration=?, passing_score=?, image_uri=? WHERE id=?`,
          [code.trim(), name.trim(), shortName.trim(), qCount, dur, score, imageUri, Number(id)]
        );
      } else {
        await db.runAsync(
          `INSERT INTO categories (code, level_name, name, short_name, default_questions, default_duration, passing_score, image_uri) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [code.trim(), String(level_name), name.trim(), shortName.trim(), qCount, dur, score, imageUri]
        );
      }
      await reloadBankTypes();
      showAlert({
        title: 'Sukses',
        message: 'Kategori berhasil disimpan',
        onConfirm: () => router.back(),
      });
    } catch (e) {
      console.error(e);
      showAlert({ title: 'Error', message: 'Gagal menyimpan kategori (pastikan Kode unik)' });
    }
  };

  if (loading) {
    return <View style={[styles.center, { backgroundColor: colors.background }]}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={colors.card} />
      <View style={[styles.header, { backgroundColor: colors.card }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{isEdit ? 'Edit Kategori' : 'Tambah Kategori'}</Text>
      </View>

      <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
        <View style={styles.imagePickerContainer}>
          <TouchableOpacity style={[styles.imageBox, { backgroundColor: colors.background, borderColor: colors.border }]} onPress={handlePickImage}>
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={styles.previewImage} />
            ) : (
              <View style={styles.imagePlaceholder}>
                <MaterialIcons name="add-a-photo" size={32} color={colors.textMuted} />
                <Text style={[styles.imagePlaceholderText, { color: colors.textMuted }]}>Pilih Ikon/Gambar</Text>
              </View>
            )}
          </TouchableOpacity>
          {imageUri && (
            <TouchableOpacity style={styles.removeImageBtn} onPress={() => setImageUri(null)}>
              <Text style={[styles.removeImageText, { color: colors.danger }]}>Hapus Gambar</Text>
            </TouchableOpacity>
          )}
        </View>

        <Text style={[styles.label, { color: colors.text }]}>Kode Kategori (cth: CTFL) *</Text>
        <TextInput style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]} value={code} onChangeText={setCode} placeholder="Kode unik" placeholderTextColor={colors.textMuted} />

        <Text style={[styles.label, { color: colors.text }]}>Nama Kategori *</Text>
        <TextInput style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]} value={name} onChangeText={setName} placeholder="Certified Tester Foundation Level" placeholderTextColor={colors.textMuted} />

        <Text style={[styles.label, { color: colors.text }]}>Nama Singkat *</Text>
        <TextInput style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]} value={shortName} onChangeText={setShortName} placeholder="CTFL v4.0" placeholderTextColor={colors.textMuted} />

        <View style={styles.row}>
          <View style={styles.half}>
            <Text style={[styles.label, { color: colors.text }]}>Jumlah Soal</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]} value={defaultQuestions} onChangeText={setDefaultQuestions} keyboardType="numeric" placeholderTextColor={colors.textMuted} />
          </View>
          <View style={styles.half}>
            <Text style={[styles.label, { color: colors.text }]}>Durasi (menit)</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]} value={defaultDuration} onChangeText={setDefaultDuration} keyboardType="numeric" placeholderTextColor={colors.textMuted} />
          </View>
        </View>

        <Text style={[styles.label, { color: colors.text }]}>Skor Lulus (%)</Text>
        <TextInput style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]} value={passingScore} onChangeText={setPassingScore} keyboardType="numeric" placeholderTextColor={colors.textMuted} />

        <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.primary }]} onPress={handleSave}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <MaterialIcons name="save" size={20} color="white" style={{ marginRight: 8 }} />
            <Text style={styles.saveBtnText}>Simpan Kategori</Text>
          </View>
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
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14 },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '800' },
  form: { flex: 1, padding: 16 },
  imagePickerContainer: { alignItems: 'center', marginBottom: 20 },
  imageBox: { width: 100, height: 100, borderRadius: 16, overflow: 'hidden', borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  previewImage: { width: '100%', height: '100%' },
  imagePlaceholder: { alignItems: 'center', justifyContent: 'center' },
  imagePlaceholderText: { fontSize: 11, marginTop: 4 },
  removeImageBtn: { marginTop: 8 },
  removeImageText: { fontSize: 13, fontWeight: '600' },
  label: { fontSize: 14, fontWeight: '700', marginBottom: 6, marginTop: 14 },
  input: { borderWidth: 1.5, borderRadius: 10, padding: 12, fontSize: 15 },
  row: { flexDirection: 'row', gap: 12 },
  half: { flex: 1 },
  saveBtn: { borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 30 },
  saveBtnText: { color: 'white', fontSize: 16, fontWeight: '800' },
});
