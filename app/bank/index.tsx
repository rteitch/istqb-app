import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, SafeAreaView, StatusBar, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { MaterialIcons } from '@expo/vector-icons';
import { QuestionData } from '../context/SessionContext';
import { useFocusEffect } from '@react-navigation/native';
import { ISTQB_LEVELS, getLevelColor } from '../../constants/istqb';
import { useConfirmDialog } from '../../components/ConfirmDialog';

export default function BankScreen() {
  const router = useRouter();
  const db = useSQLiteContext();
  const { showConfirm, showAlert, Dialog } = useConfirmDialog();
  const [questions, setQuestions] = useState<QuestionData[]>([]);
  const [search, setSearch] = useState('');
  const [filterLevel, setFilterLevel] = useState('ALL');
  const [filterCategory, setFilterCategory] = useState('ALL');

  useFocusEffect(useCallback(() => { fetchQuestions(); }, []));

  const fetchQuestions = async () => {
    try {
      const data = await db.getAllAsync<QuestionData>(
        `SELECT q.id, q.category, q.level, q.correct_answer,
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
      message: 'Menghapus soal ini akan ikut menghapus SEMUA terjemahannya (Cascade Delete). Yakin ingin melanjutkan?',
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

  const allLevels = ['ALL', ...ISTQB_LEVELS.map((l) => l.level)];
  const allCategories = filterLevel === 'ALL'
    ? ['ALL', ...Array.from(new Set(questions.map((q) => q.category)))]
    : ['ALL', ...(ISTQB_LEVELS.find((l) => l.level === filterLevel)?.categories.map((c) => c.code) ?? [])];

  const filtered = questions.filter((q) => {
    const matchSearch = q.question_text.toLowerCase().includes(search.toLowerCase());
    const matchLevel = filterLevel === 'ALL' || q.level === filterLevel;
    const matchCat = filterCategory === 'ALL' || q.category === filterCategory;
    return matchSearch && matchLevel && matchCat;
  });

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#1E293B" />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.replace('/')} style={s.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Bank Soal</Text>
          <Text style={s.headerSub}>{questions.length} soal tersedia</Text>
        </View>
        <TouchableOpacity style={s.addBtn} onPress={() => router.push('/bank/add' as any)}>
          <MaterialIcons name="add" size={18} color="white" />
          <Text style={s.addBtnText}>Tambah</Text>
        </TouchableOpacity>
      </View>

      {/* Toolbar tetap (search + filter) — tidak ikut scroll */}
      <View style={s.toolbar}>
        <View style={s.searchRow}>
          <MaterialIcons name="search" size={18} color="#94A3B8" />
          <TextInput
            style={s.searchInput}
            placeholder="Cari soal..."
            value={search}
            onChangeText={setSearch}
            placeholderTextColor="#94A3B8"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <MaterialIcons name="close" size={16} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Level */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          style={s.filterScroll} contentContainerStyle={s.filterContent}>
          {allLevels.map((item) => {
            const color = item === 'ALL' ? '#1E293B' : getLevelColor(item);
            const active = filterLevel === item;
            return (
              <TouchableOpacity key={item}
                style={[s.chip, active && { backgroundColor: color, borderColor: color }]}
                onPress={() => { setFilterLevel(item); setFilterCategory('ALL'); }}>
                <Text style={[s.chipText, active && s.chipActive]}>
                  {item === 'ALL' ? 'Semua Level' : item}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Filter Kategori (kondisional) */}
        {filterLevel !== 'ALL' && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            style={s.filterScroll} contentContainerStyle={s.filterContent}>
            {allCategories.map((item) => {
              const active = filterCategory === item;
              const color = getLevelColor(filterLevel);
              return (
                <TouchableOpacity key={item}
                  style={[s.chipSm, active && { backgroundColor: color, borderColor: color }]}
                  onPress={() => setFilterCategory(item)}>
                  <Text style={[s.chipSmText, active && s.chipActive]}>
                    {item === 'ALL' ? 'Semua' : item}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        <Text style={s.counter}>{filtered.length} dari {questions.length} soal</Text>
      </View>

      {/* List soal */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={s.emptyWrap}>
            <MaterialIcons name="search-off" size={48} color="#CBD5E1" />
            <Text style={s.emptyTitle}>Soal tidak ditemukan</Text>
            <Text style={s.emptySub}>Coba ubah kata kunci atau filter</Text>
          </View>
        }
        renderItem={({ item }) => {
          const lvlColor = getLevelColor(item.level);
          return (
            <View style={[s.card, { borderLeftColor: lvlColor }]}>
              <View style={s.cardHeader}>
                <View style={[s.catBadge, { backgroundColor: lvlColor + '20' }]}>
                  <Text style={[s.catBadgeText, { color: lvlColor }]}>{item.category}</Text>
                </View>
                <Text style={s.langTag}>{item.locale?.toUpperCase()}</Text>
                <View style={{ flex: 1 }} />
                <Text style={s.cardId}>#{item.id}</Text>
              </View>
              <Text style={s.qText} numberOfLines={3}>{item.question_text}</Text>
              <View style={s.cardActions}>
                <TouchableOpacity style={s.actionBtn}
                  onPress={() => router.push(`/bank/${item.id}` as any)}>
                  <MaterialIcons name="edit" size={14} color="#3B82F6" />
                  <Text style={s.editText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.actionBtn} onPress={() => handleDelete(item.id)}>
                  <MaterialIcons name="delete-outline" size={14} color="#EF4444" />
                  <Text style={s.deleteText}>Hapus</Text>
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

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 14,
    backgroundColor: '#1E293B', gap: 12,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: 'white' },
  headerSub: { fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 1 },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#3B82F6', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8,
  },
  addBtnText: { color: 'white', fontSize: 13, fontWeight: '700' },
  toolbar: {
    backgroundColor: 'white',
    borderBottomWidth: 1, borderBottomColor: '#E2E8F0',
    paddingTop: 10, paddingBottom: 8, gap: 6,
  },
  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#F1F5F9', borderRadius: 10,
    paddingHorizontal: 12, marginHorizontal: 14,
  },
  searchInput: { flex: 1, paddingVertical: 9, fontSize: 14, color: '#1E293B' },
  filterScroll: { flexGrow: 0 },
  filterContent: { paddingHorizontal: 14, gap: 8, paddingVertical: 2 },
  chip: {
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20,
    borderWidth: 1.5, borderColor: '#E2E8F0', backgroundColor: '#F8FAFC',
  },
  chipText: { fontSize: 12, fontWeight: '600', color: '#64748B' },
  chipSm: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 16,
    borderWidth: 1.5, borderColor: '#E2E8F0', backgroundColor: '#F8FAFC',
  },
  chipSmText: { fontSize: 11, fontWeight: '600', color: '#64748B' },
  chipActive: { color: 'white' },
  counter: { fontSize: 11, color: '#94A3B8', paddingHorizontal: 14 },
  list: { padding: 14, paddingBottom: 40 },
  emptyWrap: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#94A3B8' },
  emptySub: { fontSize: 13, color: '#CBD5E1' },
  card: {
    backgroundColor: 'white', borderRadius: 12, padding: 14,
    marginBottom: 10, borderLeftWidth: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 3, elevation: 1,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
  catBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  catBadgeText: { fontSize: 11, fontWeight: '700' },
  langTag: {
    fontSize: 10, fontWeight: '700', color: '#94A3B8',
    backgroundColor: '#F1F5F9', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4,
  },
  cardId: { fontSize: 11, color: '#CBD5E1', fontWeight: '600' },
  qText: { fontSize: 14, color: '#334155', lineHeight: 20, marginBottom: 10 },
  cardActions: {
    flexDirection: 'row', justifyContent: 'flex-end', gap: 12,
    paddingTop: 8, borderTopWidth: 1, borderTopColor: '#F1F5F9',
  },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 4 },
  editText: { fontSize: 13, fontWeight: '600', color: '#3B82F6' },
  deleteText: { fontSize: 13, fontWeight: '600', color: '#EF4444' },
});
