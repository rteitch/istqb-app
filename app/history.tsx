import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  SafeAreaView, StatusBar, ScrollView, RefreshControl
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { ExamSessionData } from '../context/SessionContext';
import { LinearGradient } from 'expo-linear-gradient';

import HistoryCard from '../components/HistoryCard';
import EmptyState from '../components/EmptyState';
import { useConfirmDialog } from '../components/ConfirmDialog';
import { useTheme } from '../context/ThemeContext';

export default function HistoryScreen() {
  const router = useRouter();
  const db = useSQLiteContext();
  const { colors, isDarkMode } = useTheme();
  const { showConfirm, showAlert, Dialog } = useConfirmDialog();
  const [sessions, setSessions] = useState<ExamSessionData[]>([]);
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadSessions();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadSessions();
    setRefreshing(false);
  };

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
      requireInput: 'HAPUS',
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

  const usedCategories = ['ALL', ...Array.from(new Set(sessions.map((s) => s.category)))];

  const filtered = filterCategory === 'ALL'
    ? sessions
    : sessions.filter((s) => s.category === filterCategory);

  const totalSessions = sessions.length;
  const passedCount = sessions.filter((s) => s.passed === 1).length;
  const avgScore = totalSessions > 0
    ? Math.round(sessions.reduce((sum, s) => sum + s.score_percent, 0) / totalSessions)
    : 0;
  const bestScore = totalSessions > 0
    ? Math.round(Math.max(...sessions.map((s) => s.score_percent)))
    : 0;

  const gradientHeader: [string, string] = isDarkMode
    ? [colors.card, colors.background]
    : [colors.primary, colors.primaryHover];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor={isDarkMode ? colors.card : colors.primary} />

      <View>
        {/* Header */}
        <LinearGradient colors={gradientHeader} style={styles.headerHero}>
          <View style={styles.headerTop}>
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
            {totalSessions > 0 ? (
              <TouchableOpacity onPress={handleClearAll} style={styles.clearBtn}>
                <MaterialIcons name="delete-sweep" size={22} color="rgba(255,255,255,0.9)" />
              </TouchableOpacity>
            ) : <View style={{ width: 38 }} />}
          </View>

          {/* Stats Banner */}
          {totalSessions > 0 && (
            <View style={[styles.statsBanner, { backgroundColor: isDarkMode ? colors.background : 'rgba(255,255,255,0.15)', borderColor: isDarkMode ? colors.border : 'rgba(255,255,255,0.2)' }]}>
              <View style={styles.statItem}>
                <Text style={[styles.statNum, { color: isDarkMode ? colors.text : 'white' }]}>{totalSessions}</Text>
                <Text style={[styles.statLabel, { color: isDarkMode ? colors.textSecondary : 'rgba(255,255,255,0.8)' }]}>Total Ujian</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: isDarkMode ? colors.border : 'rgba(255,255,255,0.2)' }]} />
              <View style={styles.statItem}>
                <Text style={[styles.statNum, { color: colors.success }]}>{passedCount}</Text>
                <Text style={[styles.statLabel, { color: isDarkMode ? colors.textSecondary : 'rgba(255,255,255,0.8)' }]}>Lulus</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: isDarkMode ? colors.border : 'rgba(255,255,255,0.2)' }]} />
              <View style={styles.statItem}>
                <Text style={[styles.statNum, { color: isDarkMode ? colors.text : 'white' }]}>{avgScore}%</Text>
                <Text style={[styles.statLabel, { color: isDarkMode ? colors.textSecondary : 'rgba(255,255,255,0.8)' }]}>Rata-rata</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: isDarkMode ? colors.border : 'rgba(255,255,255,0.2)' }]} />
              <View style={styles.statItem}>
                <Text style={[styles.statNum, { color: colors.warning }]}>{bestScore}%</Text>
                <Text style={[styles.statLabel, { color: isDarkMode ? colors.textSecondary : 'rgba(255,255,255,0.8)' }]}>Terbaik</Text>
              </View>
            </View>
          )}
        </LinearGradient>

        {/* Category Filter */}
        {totalSessions > 0 && (
          <View style={[styles.filterContainer, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterList}
            >
              {usedCategories.map((item) => (
                <TouchableOpacity
                  key={item}
                  style={[
                    styles.filterChip, 
                    { backgroundColor: isDarkMode ? colors.background : '#F8FAFC', borderColor: colors.border },
                    filterCategory === item && { backgroundColor: isDarkMode ? colors.primary : colors.primaryHover, borderColor: isDarkMode ? colors.primary : colors.primaryHover }
                  ]}
                  onPress={() => setFilterCategory(item)}
                >
                  <Text style={[
                    styles.filterText, 
                    { color: colors.textSecondary },
                    filterCategory === item && { color: 'white' }
                  ]}>
                    {item === 'ALL' ? 'Semua Kategori' : item}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Text style={[styles.filterCounter, { color: colors.textMuted }]}>{filtered.length} dari {sessions.length} ujian</Text>
          </View>
        )}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
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
  safe: { flex: 1 },
  headerHero: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  backBtn: { padding: 4, marginLeft: -4 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: 'white' },
  clearBtn: { padding: 8, marginRight: -8 },
  statsBanner: { flexDirection: 'row', paddingVertical: 18, borderRadius: 16, borderWidth: 1 },
  statItem: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 20, fontWeight: '800' },
  statLabel: { fontSize: 11, marginTop: 4, fontWeight: '600' },
  statDivider: { width: 1, marginVertical: 4 },
  filterContainer: { borderBottomWidth: 1, paddingBottom: 10 },
  filterList: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 6, gap: 10 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5 },
  filterText: { fontSize: 13, fontWeight: '700' },
  filterCounter: { fontSize: 12, paddingHorizontal: 16, marginTop: 6, fontWeight: '500' },
  list: { padding: 16, paddingBottom: 40 },
});
