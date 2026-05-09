import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  SafeAreaView, StatusBar, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { ExamSessionData } from './context/SessionContext';
import { ISTQB_LEVELS } from '../constants/istqb';
import HistoryCard from '../components/HistoryCard';
import EmptyState from '../components/EmptyState';
import { useConfirmDialog } from '../components/ConfirmDialog';

export default function HistoryScreen() {
  const router = useRouter();
  const db = useSQLiteContext();
  const { showConfirm, showAlert, Dialog } = useConfirmDialog();
  const [sessions, setSessions] = useState<ExamSessionData[]>([]);
  const [filterCategory, setFilterCategory] = useState<string>('ALL');

  useFocusEffect(
    useCallback(() => {
      loadSessions();
    }, [])
  );

  const loadSessions = async () => {
    try {
      const data = await db.getAllAsync<ExamSessionData>(
        'SELECT * FROM exam_sessions ORDER BY finished_at DESC'
      );
      setSessions(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = (id: number) => {
    showConfirm({
      title: 'Hapus Histori',
      message: 'Yakin ingin menghapus histori ujian ini?',
      confirmText: 'Hapus',
      destructive: true,
      onConfirm: async () => {
        try {
          await db.runAsync('DELETE FROM exam_session_answers WHERE session_id = ?', [id]);
          await db.runAsync('DELETE FROM exam_sessions WHERE id = ?', [id]);
          loadSessions();
          showAlert({ title: 'Terhapus', message: 'Histori berhasil dihapus' });
        } catch (e) {
          showAlert({ title: 'Error', message: 'Gagal menghapus histori' });
        }
      },
    });
  };

  const handleClearAll = () => {
    showConfirm({
      title: 'Hapus Semua Histori',
      message: 'Yakin ingin menghapus semua histori ujian? Tindakan ini tidak dapat dibatalkan.',
      confirmText: 'Hapus Semua',
      destructive: true,
      onConfirm: async () => {
        try {
          await db.runAsync('DELETE FROM exam_session_answers');
          await db.runAsync('DELETE FROM exam_sessions');
          loadSessions();
          showAlert({ title: 'Berhasil', message: 'Semua histori berhasil dihapus' });
        } catch (e) {
          showAlert({ title: 'Error', message: 'Gagal menghapus histori' });
        }
      },
    });
  };

  // Ambil daftar kategori unik dari sessions yang ada
  const usedCategories = ['ALL', ...Array.from(new Set(sessions.map((s) => s.category)))];

  const filtered = filterCategory === 'ALL'
    ? sessions
    : sessions.filter((s) => s.category === filterCategory);

  // Stats
  const totalSessions = sessions.length;
  const passedCount = sessions.filter((s) => s.passed === 1).length;
  const avgScore = totalSessions > 0
    ? Math.round(sessions.reduce((sum, s) => sum + s.score_percent, 0) / totalSessions)
    : 0;
  const bestScore = totalSessions > 0
    ? Math.round(Math.max(...sessions.map((s) => s.score_percent)))
    : 0;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#1E293B" />

      {/* Area tetap: header + stats + filter */}
      <View>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => {
              if (router.canGoBack()) router.back();
              else router.replace('/');
            }} 
            style={styles.backBtn}
          >
            <MaterialIcons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Histori Ujian</Text>
          <View style={{ flex: 1 }} />
          {totalSessions > 0 && (
            <TouchableOpacity onPress={handleClearAll} style={styles.clearBtn}>
              <MaterialIcons name="delete-sweep" size={20} color="#FCA5A5" />
            </TouchableOpacity>
          )}
        </View>

        {/* Stats Banner */}
        {totalSessions > 0 && (
          <View style={styles.statsBanner}>
            <View style={styles.statItem}>
              <Text style={styles.statNum}>{totalSessions}</Text>
              <Text style={styles.statLabel}>Total Ujian</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statNum, { color: '#22C55E' }]}>{passedCount}</Text>
              <Text style={styles.statLabel}>Lulus</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNum}>{avgScore}%</Text>
              <Text style={styles.statLabel}>Rata-rata</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statNum, { color: '#F59E0B' }]}>{bestScore}%</Text>
              <Text style={styles.statLabel}>Terbaik</Text>
            </View>
          </View>
        )}

        {/* Category Filter */}
        {totalSessions > 0 && (
          <View style={styles.filterContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterList}
            >
              {usedCategories.map((item) => (
                <TouchableOpacity
                  key={item}
                  style={[styles.filterChip, filterCategory === item && styles.filterChipActive]}
                  onPress={() => setFilterCategory(item)}
                >
                  <Text style={[styles.filterText, filterCategory === item && styles.filterTextActive]}>
                    {item === 'ALL' ? 'Semua' : item}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Text style={styles.filterCounter}>{filtered.length} dari {sessions.length} ujian</Text>
          </View>
        )}
      </View>

      {/* List (flex: 1 mengisi sisa ruang) */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState
            icon="history"
            title="Belum ada histori ujian"
            subtitle="Mulai ujian pertamamu dan lacak perkembanganmu di sini"
          />
        }
        renderItem={({ item }) => (
          <HistoryCard
            session={item}
            onPress={() =>
              router.push({
                pathname: '/result',
                params: { sessionId: item.id },
              } as any)
            }
            onDelete={() => handleDelete(item.id)}
          />
        )}
      />
      {Dialog}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
    backgroundColor: '#1E293B',
    gap: 14,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: 'white' },
  clearBtn: { padding: 8 },
  statsBanner: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  statItem: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 22, fontWeight: '800', color: '#1E293B' },
  statLabel: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
  statDivider: { width: 1, backgroundColor: '#E2E8F0', marginVertical: 4 },
  filterContainer: {
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingBottom: 8,
  },
  filterList: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 4, gap: 8 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterChipActive: {
    backgroundColor: '#1E293B',
    borderColor: '#1E293B',
  },
  filterText: { fontSize: 12, fontWeight: '600', color: '#64748B' },
  filterTextActive: { color: 'white' },
  filterCounter: { fontSize: 11, color: '#94A3B8', paddingHorizontal: 16, marginTop: 4 },
  list: { padding: 16, paddingBottom: 40 },
});
