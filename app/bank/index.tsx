import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState, useCallback } from 'react';
import { 
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput,  StatusBar, ScrollView, RefreshControl
 } from 'react-native';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { MaterialIcons } from '@expo/vector-icons';
import { QuestionData } from '../../context/SessionContext';
import { useFocusEffect } from '@react-navigation/native';
import { useBankTypes } from '../../context/BankTypeContext';
import { useConfirmDialog } from '../../components/ConfirmDialog';
import { useTheme } from '../../context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';

export default function BankScreen() {
  const router = useRouter();
  const db = useSQLiteContext();
  const { colors, isDarkMode } = useTheme();
  const { showConfirm, showAlert, Dialog } = useConfirmDialog();
  const { levels, getLevelColor } = useBankTypes();
  const [questions, setQuestions] = useState<QuestionData[]>([]);
  const [search, setSearch] = useState('');
  const [filterLevel, setFilterLevel] = useState('ALL');
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(useCallback(() => { fetchQuestions(); }, []));

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchQuestions();
    setRefreshing(false);
  };

  const fetchQuestions = async () => {
    try {
      const data = await db.getAllAsync<QuestionData>(
        `SELECT q.id, q.category, q.level, q.correct_answer, q.image_uri,
           COALESCE(qt_id.question_text, qt_en.question_text) as question_text,
           CASE WHEN qt_id.id IS NOT NULL AND qt_en.id IS NOT NULL THEN 'id, en'
                WHEN qt_id.id IS NOT NULL THEN 'id'
                WHEN qt_en.id IS NOT NULL THEN 'en'
                ELSE 'unknown' END as locale
         FROM questions q
         LEFT JOIN question_translations qt_id ON q.id = qt_id.question_id AND qt_id.locale = 'id'
         LEFT JOIN question_translations qt_en ON q.id = qt_en.question_id AND qt_en.locale = 'en'
         ORDER BY q.id DESC`
      );
      setQuestions(data);
    } catch (e) { console.error(e); }
  };

  const handleDelete = (id: number) => {
    showConfirm({
      title: 'Hapus Soal',
      message: 'Menghapus soal ini akan ikut menghapus SEMUA terjemahannya. Yakin ingin melanjutkan?',
      confirmText: 'Hapus',
      destructive: true,
      onConfirm: async () => {
        try {
          await db.runAsync('DELETE FROM questions WHERE id = ?', [id]);
          fetchQuestions();
          showAlert({ title: 'Terhapus', message: 'Soal berhasil dihapus' });
        } catch (e) {
          showAlert({ title: 'Error', message: 'Gagal menghapus soal' });
        }
      },
    });
  };

  const allLevels = ['ALL', ...levels.map((l) => l.level_name)];
  const allCategories = filterLevel === 'ALL'
    ? ['ALL', ...Array.from(new Set(questions.map((q) => q.category)))]
    : ['ALL', ...(levels.find((l) => l.level_name === filterLevel)?.categories.map((c) => c.code) ?? [])];

  const filtered = questions.filter((q) => {
    const matchSearch = q.question_text.toLowerCase().includes(search.toLowerCase());
    const matchLevel = filterLevel === 'ALL' || q.level === filterLevel;
    const matchCat = filterCategory === 'ALL' || q.category === filterCategory;
    return matchSearch && matchLevel && matchCat;
  });

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={colors.card} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card }]}>
        <TouchableOpacity onPress={() => router.replace('/')} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Bank Soal</Text>
          <Text style={[styles.headerSub, { color: colors.textMuted }]}>{questions.length} soal tersedia</Text>
        </View>
        <TouchableOpacity activeOpacity={0.8} onPress={() => router.push('/bank/add' as any)}>
          <LinearGradient 
            colors={(isDarkMode ? [colors.primary, '#2563EB'] : [colors.primary, '#3B82F6']) as [string, string]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={styles.addBtn}
          >
            <MaterialIcons name="add" size={18} color="white" />
            <Text style={styles.addBtnText}>Tambah</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Toolbar */}
      <View style={[styles.toolbar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={[
            styles.searchRow, 
            { backgroundColor: isDarkMode ? colors.background : '#F1F5F9' },
            isDarkMode && { borderWidth: 1, borderColor: colors.border }
          ]}>
          <MaterialIcons name="search" size={20} color={colors.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Cari soal..."
            value={search}
            onChangeText={setSearch}
            placeholderTextColor={colors.textMuted}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <MaterialIcons name="cancel" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Level */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          style={styles.filterScroll} contentContainerStyle={styles.filterContent}>
          {allLevels.map((item) => {
            const color = item === 'ALL' ? colors.primary : getLevelColor(item);
            const active = filterLevel === item;
            return (
              <TouchableOpacity key={item}
                style={[
                  styles.chip, 
                  { backgroundColor: isDarkMode ? colors.background : '#F8FAFC', borderColor: colors.border },
                  active && { backgroundColor: color, borderColor: color }
                ]}
                onPress={() => { setFilterLevel(item); setFilterCategory('ALL'); }}>
                <Text style={[styles.chipText, { color: colors.textSecondary }, active && styles.chipActive]}>
                  {item === 'ALL' ? 'Semua Level' : item}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Filter Kategori */}
        {filterLevel !== 'ALL' && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            style={styles.filterScroll} contentContainerStyle={styles.filterContent}>
            {allCategories.map((item) => {
              const active = filterCategory === item;
              const color = getLevelColor(filterLevel);
              return (
                <TouchableOpacity key={item}
                  style={[
                    styles.chipSm, 
                    { backgroundColor: isDarkMode ? colors.background : '#F8FAFC', borderColor: colors.border }, 
                    active && { backgroundColor: color, borderColor: color }
                  ]}
                  onPress={() => setFilterCategory(item)}>
                  <Text style={[styles.chipSmText, { color: colors.textSecondary }, active && styles.chipActive]}>
                    {item === 'ALL' ? 'Semua' : item}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        <Text style={[styles.counter, { color: colors.textMuted }]}>{filtered.length} dari {questions.length} soal</Text>
      </View>

      {/* List soal */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <View style={[styles.emptyIconCircle, { backgroundColor: colors.background }]}>
              <MaterialIcons name="search-off" size={40} color={colors.textMuted} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Soal tidak ditemukan</Text>
            <Text style={[styles.emptySub, { color: colors.textSecondary }]}>Coba ubah kata kunci pencarian atau filter.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const lvlColor = getLevelColor(item.level);
          return (
            <View style={[
                styles.card, 
                { backgroundColor: colors.card, borderLeftColor: lvlColor },
                isDarkMode && { borderWidth: 1, borderColor: colors.border, borderLeftWidth: 4 }
              ]}>
              <View style={styles.cardHeader}>
                <View style={[styles.catBadge, { backgroundColor: lvlColor + '15' }]}>
                  <Text style={[styles.catBadgeText, { color: lvlColor }]}>{item.category}</Text>
                </View>
                <Text style={[styles.langTag, { color: colors.textMuted, backgroundColor: isDarkMode ? colors.background : '#F1F5F9' }]}>
                  {item.locale?.toUpperCase()}
                </Text>
                {item.image_uri && (
                  <MaterialIcons name="image" size={16} color={colors.textMuted} />
                )}
                <View style={{ flex: 1 }} />
                <Text style={[styles.cardId, { color: colors.textMuted }]}>#{item.id}</Text>
              </View>
              <Text style={[styles.qText, { color: colors.text }]} numberOfLines={3}>{item.question_text}</Text>
              <View style={[styles.cardActions, { borderTopColor: isDarkMode ? colors.border : '#F1F5F9' }]}>
                <TouchableOpacity style={styles.actionBtn}
                  onPress={() => router.push(`/bank/${item.id}` as any)}>
                  <MaterialIcons name="edit" size={16} color={colors.primary} />
                  <Text style={[styles.editText, { color: colors.primary }]}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(item.id)}>
                  <MaterialIcons name="delete-outline" size={16} color={colors.danger} />
                  <Text style={[styles.deleteText, { color: colors.danger }]}>Hapus</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      />
      {Dialog}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 14, gap: 12,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: '800' },
  headerSub: { fontSize: 12, marginTop: 2 },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10,
  },
  addBtnText: { color: 'white', fontSize: 14, fontWeight: '700' },
  toolbar: {
    borderBottomWidth: 1,
    paddingTop: 12, paddingBottom: 12, gap: 10,
  },
  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: 12,
    paddingHorizontal: 14, marginHorizontal: 16,
  },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 15, fontWeight: '500' },
  filterScroll: { flexGrow: 0 },
  filterContent: { paddingHorizontal: 16, gap: 8, paddingVertical: 2 },
  chip: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1.5,
  },
  chipText: { fontSize: 13, fontWeight: '700' },
  chipSm: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16,
    borderWidth: 1.5,
  },
  chipSmText: { fontSize: 12, fontWeight: '600' },
  chipActive: { color: 'white' },
  counter: { fontSize: 12, paddingHorizontal: 16, fontWeight: '500' },
  list: { padding: 16, paddingBottom: 40 },
  emptyWrap: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyIconCircle: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: '800' },
  emptySub: { fontSize: 14 },
  card: {
    borderRadius: 14, padding: 16,
    marginBottom: 12, borderLeftWidth: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 },
  catBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  catBadgeText: { fontSize: 11, fontWeight: '800' },
  langTag: {
    fontSize: 10, fontWeight: '800',
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6,
  },
  cardId: { fontSize: 12, fontWeight: '700' },
  qText: { fontSize: 15, lineHeight: 22, marginBottom: 14, fontWeight: '500' },
  cardActions: {
    flexDirection: 'row', justifyContent: 'flex-end', gap: 16,
    paddingTop: 12, borderTopWidth: 1,
  },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 4 },
  editText: { fontSize: 14, fontWeight: '700' },
  deleteText: { fontSize: 14, fontWeight: '700' },
});
