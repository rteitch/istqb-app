import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Image, SafeAreaView, StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { ExamSessionData } from './context/SessionContext';
import ProgressBar from '../components/ProgressBar';

export default function HomeScreen() {
  const router = useRouter();
  const db = useSQLiteContext();
  const [userName, setUserName] = useState('');
  const [stats, setStats] = useState({ total: 0, passed: 0, avgScore: 0, bestScore: 0 });
  const [recentSessions, setRecentSessions] = useState<ExamSessionData[]>([]);

  useFocusEffect(useCallback(() => { loadData(); }, []));

  const loadData = async () => {
    try {
      const user = await db.getFirstAsync<{ name: string }>('SELECT name FROM users LIMIT 1');
      setUserName(user?.name ?? '');
      const recent = await db.getAllAsync<ExamSessionData>('SELECT * FROM exam_sessions ORDER BY finished_at DESC LIMIT 5');
      setRecentSessions(recent);
      const all = await db.getAllAsync<{ score_percent: number; passed: number }>('SELECT score_percent, passed FROM exam_sessions');
      if (all.length > 0) {
        const total = all.length;
        const passed = all.filter((s) => s.passed === 1).length;
        const avg = all.reduce((sum, s) => sum + s.score_percent, 0) / total;
        const best = Math.max(...all.map((s) => s.score_percent));
        setStats({ total, passed, avgScore: Math.round(avg), bestScore: Math.round(best) });
      }
    } catch (e) { console.error(e); }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#1565C0" />
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={styles.heroTop}>
            <Image source={require('../assets/images/logo_istqbapp.png')} style={styles.logo} resizeMode="contain" />
            <TouchableOpacity style={styles.avatarBtn} onPress={() => router.push('/profile' as any)}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{userName ? userName.charAt(0).toUpperCase() : '?'}</Text>
              </View>
            </TouchableOpacity>
          </View>
          <Text style={styles.greeting}>{userName ? `Halo, ${userName}!` : 'Selamat Datang!'}</Text>
          <Text style={styles.greetingSub}>Siap berlatih sertifikasi ISTQB hari ini?</Text>
        </View>

        {stats.total > 0 ? (
          <View style={styles.statsGrid}>
            {[
              { num: stats.total, label: 'Total Ujian', color: '#3B82F6' },
              { num: stats.passed, label: 'Lulus', color: '#22C55E' },
              { num: `${stats.avgScore}%`, label: 'Rata-rata', color: '#F59E0B' },
              { num: `${stats.bestScore}%`, label: 'Terbaik', color: '#8B5CF6' },
            ].map((s, i) => (
              <View key={i} style={[styles.statCard, { borderTopColor: s.color }]}>
                <Text style={[styles.statNum, { color: s.color }]}>{s.num}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.welcomeCard}>
            <MaterialIcons name="track-changes" size={40} color="#1565C0" style={{ marginBottom: 12 }} />
            <Text style={styles.welcomeTitle}>Mulai Perjalananmu!</Text>
            <Text style={styles.welcomeText}>Pilih kategori ISTQB dan mulai latihan soal pertamamu.</Text>
          </View>
        )}

        <View style={styles.px}>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => router.push('/select-category' as any)} activeOpacity={0.85}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <MaterialIcons name="rocket-launch" size={24} color="white" style={{ marginRight: 12 }} />
              <View>
                <Text style={styles.primaryTitle}>Mulai Ujian / Latihan</Text>
                <Text style={styles.primarySub}>Pilih sertifikasi ISTQB yang ingin dilatih</Text>
              </View>
            </View>
            <MaterialIcons name="chevron-right" size={28} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>
        </View>

        <View style={styles.secondaryGrid}>
          <TouchableOpacity style={styles.secondaryBtn} onPress={() => router.push('/history' as any)}>
            <MaterialIcons name="history" size={28} color="#1E293B" style={{ marginBottom: 8 }} />
            <Text style={styles.secondaryTitle}>Histori</Text>
            <Text style={styles.secondarySub}>Lihat progress ujian</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryBtn} onPress={() => router.push('/bank' as any)}>
            <MaterialIcons name="folder" size={28} color="#1E293B" style={{ marginBottom: 8 }} />
            <Text style={styles.secondaryTitle}>Bank Soal</Text>
            <Text style={styles.secondarySub}>Kelola & tambah soal</Text>
          </TouchableOpacity>
        </View>

        {recentSessions.length > 0 && (
          <View style={styles.px}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Ujian Terakhir</Text>
              <TouchableOpacity onPress={() => router.push('/history' as any)} style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={styles.seeAll}>Lihat Semua </Text>
                <MaterialIcons name="arrow-forward" size={16} color="#3B82F6" />
              </TouchableOpacity>
            </View>
            {recentSessions.map((s) => {
              const isPassed = s.passed === 1;
              const score = Math.round(s.score_percent);
              return (
                <TouchableOpacity key={s.id} style={styles.recentCard}
                  onPress={() => router.push({ pathname: '/result', params: { sessionId: s.id } } as any)}>
                  <View style={styles.recentRow}>
                    <View style={[styles.dot, { backgroundColor: isPassed ? '#22C55E' : '#EF4444' }]} />
                    <Text style={styles.recentCat}>{s.category}</Text>
                    <View style={[styles.badge, isPassed ? styles.badgePass : styles.badgeFail]}>
                      <Text style={[styles.badgeText, { color: isPassed ? '#15803D' : '#B91C1C' }]}>
                        {isPassed ? 'LULUS' : 'GAGAL'}
                      </Text>
                    </View>
                    <Text style={[styles.recentScore, { color: isPassed ? '#22C55E' : '#EF4444' }]}>{score}%</Text>
                  </View>
                  <ProgressBar value={score} color={isPassed ? '#22C55E' : '#EF4444'} height={4} />
                </TouchableOpacity>
              );
            })}
          </View>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAFC' },
  hero: { backgroundColor: '#1565C0', padding: 20, paddingTop: 20, paddingBottom: 32 },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  logo: { width: 120, height: 50 },
  avatarBtn: { padding: 4 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)' },
  avatarText: { color: 'white', fontSize: 18, fontWeight: '800' },
  greeting: { fontSize: 22, fontWeight: '800', color: 'white', marginBottom: 4 },
  greetingSub: { fontSize: 14, color: 'rgba(255,255,255,0.75)' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, padding: 16, marginTop: -8 },
  statCard: { flex: 1, minWidth: '45%', backgroundColor: 'white', borderRadius: 14, padding: 16, alignItems: 'center', borderTopWidth: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  statNum: { fontSize: 26, fontWeight: '800' },
  statLabel: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  welcomeCard: { backgroundColor: 'white', margin: 16, marginTop: 0, borderRadius: 16, padding: 24, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  welcomeTitle: { fontSize: 17, fontWeight: '800', color: '#1E293B', marginBottom: 6 },
  welcomeText: { fontSize: 13, color: '#64748B', textAlign: 'center', lineHeight: 20 },
  px: { paddingHorizontal: 16, marginBottom: 12 },
  primaryBtn: { backgroundColor: '#1565C0', borderRadius: 16, padding: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', shadowColor: '#1565C0', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  primaryTitle: { fontSize: 17, fontWeight: '800', color: 'white', marginBottom: 4 },
  primarySub: { fontSize: 12, color: 'rgba(255,255,255,0.75)' },
  secondaryGrid: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, marginBottom: 16 },
  secondaryBtn: { flex: 1, backgroundColor: 'white', borderRadius: 14, padding: 16, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  secondaryTitle: { fontSize: 14, fontWeight: '700', color: '#1E293B', marginBottom: 2 },
  secondarySub: { fontSize: 11, color: '#94A3B8', textAlign: 'center' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#1E293B' },
  seeAll: { fontSize: 13, color: '#3B82F6', fontWeight: '600' },
  recentCard: { backgroundColor: 'white', borderRadius: 12, padding: 14, marginBottom: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1 },
  recentRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  recentCat: { flex: 1, fontSize: 14, fontWeight: '700', color: '#1E293B' },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  badgePass: { backgroundColor: '#DCFCE7' },
  badgeFail: { backgroundColor: '#FEE2E2' },
  badgeText: { fontSize: 10, fontWeight: '800' },
  recentScore: { fontSize: 16, fontWeight: '800', minWidth: 40, textAlign: 'right' },
});
