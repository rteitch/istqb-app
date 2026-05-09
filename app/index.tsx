import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import React, { useCallback, useState } from 'react';
import { 
  Image, 
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import ProgressBar from '../components/ProgressBar';
import { ExamSessionData } from '../context/SessionContext';
import { useTheme } from '../context/ThemeContext';

export default function HomeScreen() {
  const router = useRouter();
  const db = useSQLiteContext();
  const { colors, isDarkMode } = useTheme();
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

  const gradientHero: [string, string] = isDarkMode
    ? [colors.card, colors.background]
    : [colors.primary, colors.primaryHover];

  const gradientPrimaryBtn: [string, string] = isDarkMode
    ? [colors.primary, '#2563EB']
    : [colors.primary, '#3B82F6'];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor={isDarkMode ? colors.card : colors.primary} />
      <ScrollView showsVerticalScrollIndicator={false}>
        <LinearGradient colors={gradientHero} style={styles.hero}>
          <View style={styles.heroTop}>
            <Image source={require('../assets/images/logo_istqbapp.png')} style={styles.logo} resizeMode="contain" />
            <TouchableOpacity style={styles.avatarBtn} onPress={() => router.push('/profile' as any)}>
              <View style={[styles.avatar, { borderColor: 'rgba(255,255,255,0.5)', backgroundColor: 'rgba(255,255,255,0.25)' }]}>
                <Text style={styles.avatarText}>{userName ? userName.charAt(0).toUpperCase() : '?'}</Text>
              </View>
            </TouchableOpacity>
          </View>
          <Text style={styles.greeting}>{userName ? `Halo, ${userName}!` : 'Selamat Datang!'}</Text>
          <Text style={styles.greetingSub}>Siap berlatih sertifikasi ISTQB hari ini?</Text>
        </LinearGradient>

        {stats.total > 0 ? (
          <View style={styles.statsGrid}>
            {[
              { num: stats.total, label: 'Total Ujian', color: colors.info, icon: 'assessment' },
              { num: stats.passed, label: 'Lulus', color: colors.success, icon: 'emoji-events' },
              { num: `${stats.avgScore}%`, label: 'Rata-rata', color: colors.warning, icon: 'trending-up' },
              { num: `${stats.bestScore}%`, label: 'Terbaik', color: colors.purple, icon: 'star' },
            ].map((s, i) => (
              <View key={i} style={[
                styles.statCard, 
                { backgroundColor: colors.card },
                isDarkMode && { borderWidth: 1, borderColor: colors.border, shadowOpacity: 0 }
              ]}>
                <View style={[styles.statIconWrap, { backgroundColor: s.color + '15' }]}>
                  <MaterialIcons name={s.icon as any} size={20} color={s.color} />
                </View>
                <Text style={[styles.statNum, { color: colors.text }]}>{s.num}</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{s.label}</Text>
              </View>
            ))}
          </View>
        ) : (
          <View style={[
            styles.welcomeCard, 
            { backgroundColor: colors.card },
            isDarkMode && { borderWidth: 1, borderColor: colors.border, shadowOpacity: 0 }
          ]}>
            <View style={[styles.iconCircle, { backgroundColor: colors.infoBg }]}>
               <MaterialIcons name="track-changes" size={32} color={colors.info} />
            </View>
            <Text style={[styles.welcomeTitle, { color: colors.text }]}>Mulai Perjalananmu!</Text>
            <Text style={[styles.welcomeText, { color: colors.textSecondary }]}>Pilih kategori ISTQB dan mulai latihan soal pertamamu.</Text>
          </View>
        )}

        <View style={styles.px}>
          <TouchableOpacity activeOpacity={0.85} onPress={() => router.push('/select-category' as any)}>
            <LinearGradient 
              colors={gradientPrimaryBtn} 
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={[
                styles.primaryBtn,
                !isDarkMode && { shadowColor: colors.primaryHover, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 10 }
              ]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, paddingRight: 10 }}>
                <View style={styles.primaryIconWrap}>
                  <MaterialIcons name="rocket-launch" size={24} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.primaryTitle} adjustsFontSizeToFit numberOfLines={1}>Mulai Ujian / Latihan</Text>
                  <Text style={styles.primarySub} adjustsFontSizeToFit numberOfLines={1}>Pilih sertifikasi ISTQB yang ingin dilatih</Text>
                </View>
              </View>
              <MaterialIcons name="chevron-right" size={28} color="rgba(255,255,255,0.8)" style={{ flexShrink: 0 }} />
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <View style={styles.secondaryGrid}>
          <TouchableOpacity style={[
              styles.secondaryBtn, 
              { backgroundColor: colors.card },
              isDarkMode && { borderWidth: 1, borderColor: colors.border, shadowOpacity: 0 }
            ]} onPress={() => router.push('/history' as any)}>
            <View style={[styles.secIconWrap, { backgroundColor: colors.purple + '15' }]}>
               <MaterialIcons name="history" size={26} color={colors.purple} />
            </View>
            <Text style={[styles.secondaryTitle, { color: colors.text }]} adjustsFontSizeToFit numberOfLines={1}>Histori</Text>
            <Text style={[styles.secondarySub, { color: colors.textSecondary }]} adjustsFontSizeToFit numberOfLines={1}>Lihat progress ujian</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[
              styles.secondaryBtn, 
              { backgroundColor: colors.card },
              isDarkMode && { borderWidth: 1, borderColor: colors.border, shadowOpacity: 0 }
            ]} onPress={() => router.push('/bank' as any)}>
            <View style={[styles.secIconWrap, { backgroundColor: colors.success + '15' }]}>
               <MaterialIcons name="folder" size={26} color={colors.success} />
            </View>
            <Text style={[styles.secondaryTitle, { color: colors.text }]} adjustsFontSizeToFit numberOfLines={1}>Bank Soal</Text>
            <Text style={[styles.secondarySub, { color: colors.textSecondary }]} adjustsFontSizeToFit numberOfLines={1}>Kelola & tambah soal</Text>
          </TouchableOpacity>
        </View>

        {recentSessions.length > 0 && (
          <View style={styles.px}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Ujian Terakhir</Text>
              <TouchableOpacity onPress={() => router.push('/history' as any)} style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={[styles.seeAll, { color: colors.primary }]}>Lihat Semua </Text>
                <MaterialIcons name="arrow-forward" size={16} color={colors.primary} />
              </TouchableOpacity>
            </View>
            {recentSessions.map((s) => {
              const isPassed = s.passed === 1;
              const score = Math.round(s.score_percent);
              return (
                <TouchableOpacity key={s.id} style={[
                    styles.recentCard, 
                    { backgroundColor: colors.card },
                    isDarkMode && { borderWidth: 1, borderColor: colors.border, shadowOpacity: 0 }
                  ]}
                  onPress={() => router.push({ pathname: '/result', params: { sessionId: s.id } } as any)}>
                  <View style={styles.recentRow}>
                    <View style={[styles.dot, { backgroundColor: isPassed ? colors.success : colors.danger }]} />
                    <Text style={[styles.recentCat, { color: colors.text }]}>{s.category}</Text>
                    <View style={[styles.badge, { backgroundColor: isPassed ? colors.successBg : colors.dangerBg }]}>
                      <Text style={[styles.badgeText, { color: isPassed ? colors.successText : colors.dangerText }]}>
                        {isPassed ? 'LULUS' : 'GAGAL'}
                      </Text>
                    </View>
                    <Text style={[styles.recentScore, { color: isPassed ? colors.success : colors.danger }]}>{score}%</Text>
                  </View>
                  <ProgressBar value={score} color={isPassed ? colors.success : colors.danger} height={6} />
                </TouchableOpacity>
              );
            })}
          </View>
        )}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textMuted }]}>ISTQB APP v1.0.0</Text>
          <Text style={[styles.footerText, { color: colors.textMuted }]}>Dibuat oleh Rizal TH</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  hero: { padding: 20, paddingTop: 20, paddingBottom: 36, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  logo: { width: 120, height: 50 },
  avatarBtn: { padding: 4 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  avatarText: { color: 'white', fontSize: 18, fontWeight: '800' },
  greeting: { fontSize: 24, fontWeight: '800', color: 'white', marginBottom: 6 },
  greetingSub: { fontSize: 14, color: 'rgba(255,255,255,0.85)' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingHorizontal: 16, marginTop: -20, marginBottom: 8 },
  statCard: { flex: 1, minWidth: '45%', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3 },
  statIconWrap: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  statNum: { fontSize: 24, fontWeight: '800', marginBottom: 2 },
  statLabel: { fontSize: 12, fontWeight: '600' },
  welcomeCard: { margin: 16, marginTop: -20, borderRadius: 16, padding: 24, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3 },
  iconCircle: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  welcomeTitle: { fontSize: 18, fontWeight: '800', marginBottom: 8 },
  welcomeText: { fontSize: 13, textAlign: 'center', lineHeight: 22 },
  px: { paddingHorizontal: 16, marginBottom: 16 },
  primaryBtn: { borderRadius: 20, padding: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', elevation: 4 },
  primaryIconWrap: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  primaryTitle: { fontSize: 17, fontWeight: '800', color: 'white', marginBottom: 4 },
  primarySub: { fontSize: 12, color: 'rgba(255,255,255,0.9)' },
  secondaryGrid: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, marginBottom: 20, flexWrap: 'wrap' },
  secondaryBtn: { flex: 1, minWidth: '45%', borderRadius: 16, padding: 18, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  secIconWrap: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  secondaryTitle: { fontSize: 15, fontWeight: '800', marginBottom: 4 },
  secondarySub: { fontSize: 12, textAlign: 'center', lineHeight: 18 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle: { fontSize: 17, fontWeight: '800' },
  seeAll: { fontSize: 13, fontWeight: '700' },
  recentCard: { borderRadius: 14, padding: 16, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  recentRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  recentCat: { flex: 1, fontSize: 14, fontWeight: '800' },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 10, fontWeight: '800' },
  recentScore: { fontSize: 17, fontWeight: '800', minWidth: 40, textAlign: 'right' },
  footer: { padding: 20, alignItems: 'center', justifyContent: 'center', marginTop: 10, marginBottom: 20 },
  footerText: { fontSize: 12, marginBottom: 4, fontWeight: '500' },
});
