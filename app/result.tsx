import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, SafeAreaView, StatusBar, Image
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { MaterialIcons } from '@expo/vector-icons';
import { ExamSessionData, SessionAnswerData } from '../context/SessionContext';
import { useBankTypes } from '../context/BankTypeContext';
import ScoreRing from '../components/ScoreRing';
import { useTheme } from '../context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';

interface AnswerWithQuestion extends SessionAnswerData {
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: number;
  explanation: string | null;
  explanation_a: string | null;
  explanation_b: string | null;
  explanation_c: string | null;
  explanation_d: string | null;
  image_uri?: string | null;
}

export default function ResultScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const db = useSQLiteContext();
  const { colors, isDarkMode } = useTheme();
  const sessionId = params.sessionId ? Number(params.sessionId) : null;

  const [session, setSession] = useState<ExamSessionData | null>(null);
  const [answers, setAnswers] = useState<AnswerWithQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const { getLevelByCategory, getCategoryByCode } = useBankTypes();

  useEffect(() => {
    if (sessionId) loadFromDB(sessionId);
  }, [sessionId]);

  const loadFromDB = async (sid: number) => {
    try {
      const s = await db.getFirstAsync<ExamSessionData>(
        'SELECT * FROM exam_sessions WHERE id = ?', [sid]
      );
      if (!s) return;
      setSession(s);

      const rows = await db.getAllAsync<SessionAnswerData>(`
        SELECT * FROM exam_session_answers WHERE session_id = ? ORDER BY id ASC
      `, [sid]);
      
      const mappedAnswers: AnswerWithQuestion[] = rows.map(r => {
        let snap: any = null;
        try { 
          if (r.question_snapshot) snap = JSON.parse(r.question_snapshot); 
        } catch(e) {
          console.error(`Failed to parse question snapshot for answer ID ${r.id}`, e);
        }

        const qTextFallback = '⚠️ Soal tidak dapat dimuat (data snapshot korup atau hilang).';
        
        return {
          ...r,
          question_text: snap?.question_text || qTextFallback,
          option_a: snap?.option_a || 'Pilihan tidak tersedia',
          option_b: snap?.option_b || 'Pilihan tidak tersedia',
          option_c: snap?.option_c || 'Pilihan tidak tersedia',
          option_d: snap?.option_d || 'Pilihan tidak tersedia',
          correct_answer: snap?.correct_answer ?? 0,
          explanation: snap?.explanation || null,
          explanation_a: snap?.explanation_a || null,
          explanation_b: snap?.explanation_b || null,
          explanation_c: snap?.explanation_c || null,
          explanation_d: snap?.explanation_d || null,
          image_uri: snap?.image_uri || null,
        }
      });
      setAnswers(mappedAnswers);
    } catch (e) {
      console.error('Error loading result from DB', e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!session) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.textSecondary }]}>Hasil tidak ditemukan</Text>
        <TouchableOpacity activeOpacity={0.8} onPress={() => router.replace('/')}>
          <LinearGradient colors={[colors.primary, colors.primaryHover] as [string, string]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.homeBtn}>
            <Text style={styles.homeBtnText}>Kembali ke Beranda</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  }

  const levelInfo = getLevelByCategory(session.category);
  const categoryInfo = getCategoryByCode(session.category);
  const levelColor = levelInfo?.color ?? colors.primary;
  const passingScore = categoryInfo?.passing_score ?? 65;
  const isPassed = session.passed === 1;
  const score = Math.round(session.score_percent);

  const getOptionLetter = (idx: number) => String.fromCharCode(65 + idx);
  const getOptionText = (ans: AnswerWithQuestion, idx: number) => {
    const map = [ans.option_a, ans.option_b, ans.option_c, ans.option_d];
    return map[idx] ?? '';
  };
  const getExplanationForOption = (ans: AnswerWithQuestion, idx: number) => {
    const map = [ans.explanation_a, ans.explanation_b, ans.explanation_c, ans.explanation_d];
    return map[idx];
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor={levelColor} />

      {/* Result Header */}
      <LinearGradient colors={[levelColor, levelColor + 'EE', levelColor + 'CC'] as [string, string, string]} style={styles.header}>
        <Text style={styles.headerCategory}>{session.category} — {session.level}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
          <MaterialIcons name={session.mode === 'practice' ? 'menu-book' : 'timer'} size={14} color="rgba(255,255,255,0.7)" style={{ marginRight: 6 }} />
          <Text style={styles.headerMode}>{session.mode === 'practice' ? 'Mode Latihan' : 'Mode Ujian'}</Text>
        </View>

        <View style={styles.scoreArea}>
          <ScoreRing score={score} size={140} isPassed={isPassed} />
          <View style={styles.scoreStats}>
            <View style={styles.statRow}>
              <View style={styles.statIconWrap}>
                <MaterialIcons name="check-circle" size={16} color="rgba(255,255,255,0.9)" />
              </View>
              <View>
                <Text style={styles.statLabel}>Benar</Text>
                <Text style={styles.statValue}>{session.correct_answers}</Text>
              </View>
            </View>
            <View style={styles.statRow}>
              <View style={styles.statIconWrap}>
                <MaterialIcons name="format-list-numbered" size={16} color="rgba(255,255,255,0.9)" />
              </View>
              <View>
                <Text style={styles.statLabel}>Total Soal</Text>
                <Text style={styles.statValue}>{session.total_questions}</Text>
              </View>
            </View>
            <View style={styles.statRow}>
              <View style={styles.statIconWrap}>
                <MaterialIcons name="flag" size={16} color="rgba(255,255,255,0.9)" />
              </View>
              <View>
                <Text style={styles.statLabel}>Skor Minimal</Text>
                <Text style={styles.statValue}>{passingScore}%</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={[styles.verdictWrap, { backgroundColor: isPassed ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)' }]}>
          <MaterialIcons name={isPassed ? 'emoji-events' : 'sentiment-dissatisfied'} size={20} color={isPassed ? '#D1FAE5' : '#FEE2E2'} style={{ marginRight: 8 }} />
          <Text style={[styles.verdict, isPassed ? styles.verdictPass : styles.verdictFail]}>
            {isPassed
              ? 'Selamat! Kamu lulus ujian ini.'
              : 'Belum lulus. Terus semangat belajar!'}
          </Text>
        </View>
      </LinearGradient>

      {/* Action Buttons */}
      <View style={[styles.actions, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.actionBtnFlex}
          onPress={() => router.replace('/select-category' as any)}
        >
          <LinearGradient colors={[levelColor, levelColor + 'DD'] as [string, string]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.actionBtnPrimary}>
            <MaterialIcons name="refresh" size={18} color="white" style={{ marginRight: 6 }} />
            <Text style={styles.actionBtnText}>Ulangi Kategori Ini</Text>
          </LinearGradient>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtnSecondary, { backgroundColor: isDarkMode ? colors.background : '#F8FAFC', borderColor: colors.border }]}
          onPress={() => router.replace('/history' as any)}
        >
          <MaterialIcons name="history" size={18} color={colors.textSecondary} style={{ marginRight: 6 }} />
          <Text style={[styles.actionBtnTextSecondary, { color: colors.textSecondary }]}>Histori</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtnSecondary, { backgroundColor: isDarkMode ? colors.background : '#F8FAFC', borderColor: colors.border }]}
          onPress={() => router.replace('/')}
        >
          <MaterialIcons name="home" size={18} color={colors.textSecondary} style={{ marginRight: 6 }} />
          <Text style={[styles.actionBtnTextSecondary, { color: colors.textSecondary }]}>Home</Text>
        </TouchableOpacity>
      </View>

      {/* Pembahasan */}
      <ScrollView style={styles.review} showsVerticalScrollIndicator={false}>
        <Text style={[styles.reviewTitle, { color: colors.text }]}>Pembahasan Soal ({answers.length})</Text>

        {answers.map((ans, index) => {
          const isCorrect = ans.is_correct === 1;
          const userKey = ans.user_answer;
          const correctKey = ans.correct_answer;

          return (
            <View key={ans.id} style={[
                styles.card, 
                { backgroundColor: colors.card, borderLeftColor: isCorrect ? colors.success : colors.danger },
                isDarkMode && { borderWidth: 1, borderColor: colors.border, borderLeftWidth: 4, shadowOpacity: 0 }
              ]}>
              <View style={styles.cardHeader}>
                <View style={[styles.numBadge, { backgroundColor: isCorrect ? colors.successBg : colors.dangerBg }]}>
                  <Text style={[styles.numBadgeText, { color: isCorrect ? colors.successText : colors.dangerText }]}>{index + 1}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <MaterialIcons name={isCorrect ? "check-circle" : "cancel"} size={16} color={isCorrect ? colors.success : colors.danger} style={{ marginRight: 4 }} />
                  <Text style={[styles.cardStatus, isCorrect ? { color: colors.success } : { color: colors.danger }]}>
                    {isCorrect ? 'Benar' : 'Salah'}
                  </Text>
                </View>
              </View>

              {ans.image_uri ? (
                <Image source={{ uri: ans.image_uri }} style={styles.questionImage} />
              ) : null}
              <Text style={[styles.questionText, { color: colors.text }]}>{ans.question_text}</Text>

              {/* Options */}
              {[0, 1, 2, 3].map((idx) => {
                const isCorrectOpt = idx === correctKey;
                const isUserOpt = String(idx) === String(userKey);
                const optExp = getExplanationForOption(ans, idx);

                return (
                  <View key={idx} style={[
                    styles.optionItem,
                    isCorrectOpt && { backgroundColor: isDarkMode ? 'rgba(34,197,94,0.1)' : colors.successBg },
                    isUserOpt && !isCorrectOpt && { backgroundColor: isDarkMode ? 'rgba(239,68,68,0.1)' : colors.dangerBg },
                  ]}>
                    <Text style={[
                      styles.optionKey,
                      { color: colors.textMuted },
                      isCorrectOpt && { color: colors.success },
                      isUserOpt && !isCorrectOpt && { color: colors.danger },
                    ]}>
                      {getOptionLetter(idx)}.
                    </Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[
                        styles.optionText,
                        { color: colors.textSecondary },
                        isCorrectOpt && { color: colors.success, fontWeight: '700' },
                        isUserOpt && !isCorrectOpt && { color: colors.danger, fontWeight: '600' },
                      ]}>
                        {getOptionText(ans, idx)}
                        {isCorrectOpt && ' ✓'}
                        {isUserOpt && !isCorrectOpt && ' ✗ (jawabanmu)'}
                      </Text>
                      {optExp && (
                        <Text style={[styles.optExp, { color: colors.textMuted }]}>{optExp}</Text>
                      )}
                    </View>
                  </View>
                );
              })}

              {!userKey && (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10 }}>
                  <MaterialIcons name="warning" size={16} color={colors.warning} style={{ marginRight: 6 }} />
                  <Text style={[styles.notAnswered, { color: colors.warning }]}>Tidak dijawab</Text>
                </View>
              )}

              {ans.explanation && (
                <View style={[styles.expBox, { backgroundColor: isDarkMode ? colors.background : colors.infoBg, borderLeftColor: colors.info, borderWidth: isDarkMode ? 1 : 0, borderColor: colors.border }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                    <MaterialIcons name="lightbulb" size={16} color={colors.info} style={{ marginRight: 6 }} />
                    <Text style={[styles.expTitle, { color: colors.info }]}>Penjelasan Umum</Text>
                  </View>
                  <Text style={[styles.expText, { color: colors.text }]}>{ans.explanation}</Text>
                </View>
              )}
            </View>
          );
        })}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  errorText: { fontSize: 16, marginBottom: 20, fontWeight: '600' },
  homeBtn: { paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12 },
  homeBtnText: { color: 'white', fontWeight: '800', fontSize: 15 },
  header: { padding: 20, paddingTop: 16, paddingBottom: 24, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, elevation: 5 },
  headerCategory: { fontSize: 14, color: 'rgba(255,255,255,0.9)', fontWeight: '800', marginBottom: 4 },
  headerMode: { fontSize: 13, color: 'rgba(255,255,255,0.75)', fontWeight: '500' },
  scoreArea: { flexDirection: 'row', alignItems: 'center', gap: 24, marginBottom: 20 },
  scoreStats: { flex: 1, gap: 12 },
  statRow: { flexDirection: 'row', alignItems: 'center' },
  statIconWrap: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  statLabel: { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginBottom: 2 },
  statValue: { fontSize: 16, fontWeight: '800', color: 'white' },
  verdictWrap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12 },
  verdict: { fontSize: 14, fontWeight: '700' },
  verdictPass: { color: '#D1FAE5' },
  verdictFail: { color: '#FEE2E2' },
  actions: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  actionBtnFlex: { flex: 2 },
  actionBtnPrimary: { paddingVertical: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', elevation: 2 },
  actionBtnSecondary: { flex: 1.2, paddingVertical: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', borderWidth: 1 },
  actionBtnText: { fontSize: 14, fontWeight: '800', color: 'white' },
  actionBtnTextSecondary: { fontSize: 13, fontWeight: '700' },
  review: { flex: 1, paddingHorizontal: 16, paddingTop: 20 },
  reviewTitle: { fontSize: 18, fontWeight: '800', marginBottom: 16 },
  card: { borderRadius: 14, padding: 16, marginBottom: 16, borderLeftWidth: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 12 },
  numBadge: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  numBadgeText: { fontSize: 14, fontWeight: '800' },
  cardStatus: { fontSize: 14, fontWeight: '800' },
  questionImage: { width: '100%', height: 180, borderRadius: 10, marginBottom: 12, resizeMode: 'contain', backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0' },
  questionText: { fontSize: 15, lineHeight: 22, marginBottom: 14, fontWeight: '600' },
  optionItem: { flexDirection: 'row', gap: 10, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, marginBottom: 6 },
  optionKey: { fontSize: 14, fontWeight: '800', minWidth: 20 },
  optionText: { fontSize: 14, lineHeight: 21 },
  optExp: { fontSize: 12, marginTop: 6, lineHeight: 18 },
  notAnswered: { fontSize: 14, fontWeight: '700' },
  expBox: { borderRadius: 10, padding: 14, marginTop: 14, borderLeftWidth: 4 },
  expTitle: { fontSize: 13, fontWeight: '800' },
  expText: { fontSize: 13, lineHeight: 20 },
});
