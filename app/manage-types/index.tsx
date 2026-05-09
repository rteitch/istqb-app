import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, StatusBar, Image, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useBankTypes, DynamicCategory } from '../../context/BankTypeContext';
import { useSQLiteContext } from 'expo-sqlite';
import { useConfirmDialog } from '../../components/ConfirmDialog';
import { useTheme } from '../../context/ThemeContext';

export default function ManageTypesScreen() {
  const router = useRouter();
  const db = useSQLiteContext();
  const { levels, reloadBankTypes } = useBankTypes();
  const { showConfirm, showAlert, Dialog } = useConfirmDialog();
  const { colors, isDarkMode } = useTheme();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await reloadBankTypes();
    setRefreshing(false);
  };

  const handleDeleteCategory = (cat: DynamicCategory) => {
    showConfirm({
      title: 'Hapus Kategori',
      message: `Yakin ingin menghapus kategori ${cat.code}? Semua pertanyaan dalam kategori ini akan terpengaruh.`,
      confirmText: 'Hapus',
      destructive: true,
      onConfirm: async () => {
        try {
          await db.runAsync('DELETE FROM categories WHERE id = ?', [cat.id]);
          await reloadBankTypes();
          showAlert({ title: 'Terhapus', message: 'Kategori berhasil dihapus' });
        } catch (e) {
          showAlert({ title: 'Error', message: 'Gagal menghapus kategori' });
        }
      },
    });
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={colors.card} />
      <View style={[styles.header, { backgroundColor: colors.card }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Manajemen Kategori</Text>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {levels.map((level) => (
          <View key={level.level_name} style={[styles.levelCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.levelHeader, { backgroundColor: level.color }]}>
              <Text style={styles.levelTitle}>{level.level_name}</Text>
            </View>
            <View style={styles.catList}>
              {level.categories.map((cat) => (
                <View key={cat.id} style={[styles.catItem, { borderBottomColor: colors.border }]}>
                  {cat.image_uri ? (
                    <Image source={{ uri: cat.image_uri }} style={styles.catImage} />
                  ) : (
                    <View style={[styles.catImagePlaceholder, { backgroundColor: colors.background }]}>
                      <MaterialIcons name="image" size={20} color={colors.textMuted} />
                    </View>
                  )}
                  <View style={styles.catInfo}>
                    <Text style={[styles.catCode, { color: colors.text }]}>{cat.code}</Text>
                    <Text style={[styles.catName, { color: colors.textSecondary }]} numberOfLines={1}>{cat.name}</Text>
                  </View>
                  <View style={styles.catActions}>
                    <TouchableOpacity onPress={() => router.push(`/manage-types/category?id=${cat.id}` as any)} style={styles.actionBtn}>
                      <MaterialIcons name="edit" size={20} color={colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDeleteCategory(cat)} style={styles.actionBtn}>
                      <MaterialIcons name="delete" size={20} color={colors.danger} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
              <TouchableOpacity
                style={[styles.addCatBtn, { backgroundColor: colors.selected }]}
                onPress={() => router.push(`/manage-types/category?level_name=${level.level_name}` as any)}
              >
                <MaterialIcons name="add-circle-outline" size={20} color={colors.primary} />
                <Text style={[styles.addCatText, { color: colors.primary }]}>Tambah Kategori di {level.level_name}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
        <View style={{ height: 40 }} />
      </ScrollView>
      {Dialog}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14 },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '800' },
  content: { padding: 16 },
  levelCard: { borderRadius: 12, marginBottom: 16, overflow: 'hidden', borderWidth: 1 },
  levelHeader: { padding: 12 },
  levelTitle: { color: 'white', fontSize: 16, fontWeight: '800' },
  catList: { padding: 12 },
  catItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1 },
  catImage: { width: 40, height: 40, borderRadius: 8, marginRight: 12 },
  catImagePlaceholder: { width: 40, height: 40, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  catInfo: { flex: 1 },
  catCode: { fontSize: 14, fontWeight: '800' },
  catName: { fontSize: 12, marginTop: 2 },
  catActions: { flexDirection: 'row', gap: 12 },
  actionBtn: { padding: 4 },
  addCatBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, marginTop: 8, borderRadius: 8 },
  addCatText: { marginLeft: 8, fontSize: 13, fontWeight: '700' },
});
