import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, SafeAreaView, StatusBar,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { MaterialIcons } from '@expo/vector-icons';
import { ExamSessionData, QuestionData, SessionAnswerData } from './context/SessionContext';
import { getLevelColor, getLevelByCategory, getCategoryByCode } from '../constants/istqb';
import ScoreRing from '../components/ScoreRing';

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
}

export default function ResultScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const db = useSQLiteContext();
  const sessionId = params.sessionId ? Number(params.sessionId) : null;

  const [session, setSession] = useState<ExamSessionData | null>(null);
  const [answers, setAnswers] = useState<AnswerWithQuestion[]>([]);
  const [loading, setLoading] = useState(true);

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
        let snap: any = {};
        try { if (r.question_snapshot) snap = JSON.parse(r.question_snapshot); } catch(e) {}
        return {
          ...r,
          question_text: snap.question_text || 'Soal tidak tersedia (Snapshot hilang)',
          option_a: snap.option_a || '',
          option_b: snap.option_b || '',
          option_c: snap.option_c || '',
          option_d: snap.option_d || '',
          correct_answer: snap.correct_answer ?? 0,
          explanation: snap.explanation || null,
          explanation_a: snap.explanation_a || null,
          explanation_b: snap.explanation_b || null,
          explanation_c: snap.explanation_c || null,
          explanation_d: snap.explanation_d || null,
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
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  if (!session) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Hasil tidak ditemukan</Text>
        <TouchableOpacity onPress={() => router.replace('/')} style={styles.homeBtn}>
          <Text style={styles.homeBtnText}>Kembali ke Beranda</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const levelInfo = getLevelByCategory(session.category);
  const categoryInfo = getCategoryByCode(session.category);
  const levelColor = levelInfo?.color ?? '#1565C0';
  const passingScore = categoryInfo?.passingScore ?? 65;
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
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={levelColor} />

      {/* Result Header */}
      <View style={[styles.header, { backgroundColor: levelColor }]}>
        <Text style={styles.headerCategory}>{session.category} — {session.level}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
          <MaterialIcons name={session.mode === 'practice' ? 'menu-book' : 'timer'} size={14} color="rgba(255,255,255,0.65)" style={{ marginRight: 4 }} />
          <Text style={styles.headerMode}>{session.mode === 'practice' ? 'Mode Latihan' : 'Mode Ujian'}</Text>
        </View>

        <View style={styles.scoreArea}>
          <ScoreRing score={score} size={130} isPassed={isPassed} />
          <View style={styles.scoreStats}>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Benar</Text>
              <Text style={styles.statValue}>{session.correct_answers}</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Total Soal</Text>
              <Text style={styles.statValue}>{session.total_questions}</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Skor Minimal</Text>
              <Text style={styles.statValue}>{passingScore}%</Text>
            </View>
          </View>
        </View>

        <Text style={[styles.verdict, isPassed ? styles.verdictPass : styles.verdictFail]}>
          {isPassed
            ? 'Selamat! Kamu lulus ujian ini.'
            : 'Belum lulus. Terus semangat belajar!'}
        </Text>
      </View>

      {/* Action Buttons */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: levelColor }]}
          onPress={() => {
            if (router.canGoBack()) router.back();
            else router.replace('/');
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <MaterialIcons name="refresh" size={16} color="white" style={{ marginRight: 6 }} />
            <Text style={styles.actionBtnText}>Ulangi</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, styles.actionBtnOutline]}
          onPress={() => router.replace('/history' as any)}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <MaterialIcons name="history" size={16} color="#475569" style={{ marginRight: 6 }} />
            <Text style={[styles.actionBtnText, { color: '#475569' }]}>Histori</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, styles.actionBtnOutline]}
          onPress={() => router.replace('/')}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <MaterialIcons name="home" size={16} color="#475569" style={{ marginRight: 6 }} />
            <Text style={[styles.actionBtnText, { color: '#475569' }]}>Home</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Pembahasan */}
      <ScrollView style={styles.review} showsVerticalScrollIndicator={false}>
        <Text style={styles.reviewTitle}>Pembahasan Soal ({answers.length})</Text>

        {answers.map((ans, index) => {
          const isCorrect = ans.is_correct === 1;
          const userKey = ans.user_answer;
          const correctKey = ans.correct_answer;

          return (
            <View key={ans.id} style={[styles.card, isCorrect ? styles.cardCorrect : styles.cardWrong]}>
              {/* Question number + status */}
              <View style={styles.cardHeader}>
                <View style={[styles.numBadge, isCorrect ? styles.numBadgeCorrect : styles.numBadgeWrong]}>
                  <Text style={styles.numBadgeText}>{index + 1}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <MaterialIcons name={isCorrect ? "check-circle" : "cancel"} size={16} color={isCorrect ? "#15803D" : "#B91C1C"} style={{ marginRight: 4 }} />
                  <Text style={[styles.cardStatus, isCorrect ? styles.statusCorrect : styles.statusWrong]}>
                    {isCorrect ? 'Benar' : 'Salah'}
                  </Text>
                </View>
              </View>

              <Text style={styles.questionText}>{ans.question_text}</Text>

              {/* Options */}
              {[0, 1, 2, 3].map((idx) => {
                const isCorrectOpt = idx === correctKey;
                const isUserOpt = String(idx) === String(userKey);
                const optExp = getExplanationForOption(ans, idx);

                return (
                  <View key={idx} style={[
                    styles.optionItem,
                    isCorrectOpt && styles.optionItemCorrect,
                    isUserOpt && !isCorrectOpt && styles.optionItemWrong,
                  ]}>
                    <Text style={[
                      styles.optionKey,
                      isCorrectOpt && { color: '#15803D' },
                      isUserOpt && !isCorrectOpt && { color: '#B91C1C' },
                    ]}>
                      {getOptionLetter(idx)}.
                    </Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[
                        styles.optionText,
                        isCorrectOpt && { color: '#15803D', fontWeight: '600' },
                        isUserOpt && !isCorrectOpt && { color: '#B91C1C' },
                      ]}>
                        {getOptionText(ans, idx)}
                        {isCorrectOpt && ' ✓'}
                        {isUserOpt && !isCorrectOpt && ' ✗ (jawabanmu)'}
                      </Text>
                      {optExp && (
                        <Text style={styles.optExp}>{optExp}</Text>
                      )}
                    </View>
                  </View>
                );
              })}

              {!userKey && (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                  <MaterialIcons name="warning" size={14} color="#F59E0B" style={{ marginRight: 4 }} />
                  <Text style={styles.notAnswered}>Tidak dijawab</Text>
                </View>
              )}

              {ans.explanation && (
                <View style={styles.expBox}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                    <MaterialIcons name="lightbulb" size={14} color="#0369A1" style={{ marginRight: 4 }} />
                    <Text style={styles.expTitle}>Penjelasan</Text>
                  </View>
                  <Text style={styles.expText}>{ans.explanation}</Text>
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
  safe: { flex: 1, backgroundColor: '#F8FAFC' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  errorText: { fontSize: 16, color: '#64748B', marginBottom: 20 },
  homeBtn: { backgroundColor: '#3B82F6', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 },
  homeBtnText: { color: 'white', fontWeight: '700' },
  header: { padding: 20, paddingTop: 16, paddingBottom: 24 },
  headerCategory: { fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: '700', marginBottom: 2 },
  headerMode: { fontSize: 12, color: 'rgba(255,255,255,0.65)' },
  scoreArea: { flexDirection: 'row', alignItems: 'center', gap: 20, marginBottom: 16 },
  scoreStats: { flex: 1, gap: 8 },
  statRow: { flexDirection: 'row', justifyContent: 'space-between' },
  statLabel: { fontSize: 13, color: 'rgba(255,255,255,0.75)' },
  statValue: { fontSize: 15, fontWeight: '800', color: 'white' },
  verdict: {
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '600',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
    overflow: 'hidden',
  },
  verdictPass: { backgroundColor: 'rgba(34,197,94,0.25)', color: '#D1FAE5' },
  verdictFail: { backgroundColor: 'rgba(239,68,68,0.25)', color: '#FEE2E2' },
  actions: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnOutline: { backgroundColor: '#F1F5F9' },
  actionBtnText: { fontSize: 13, fontWeight: '700', color: 'white' },
  review: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },
  reviewTitle: { fontSize: 16, fontWeight: '800', color: '#1E293B', marginBottom: 14 },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    borderLeftWidth: 4,
  },
  cardCorrect: { borderLeftColor: '#22C55E' },
  cardWrong: { borderLeftColor: '#EF4444' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 10 },
  numBadge: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  numBadgeCorrect: { backgroundColor: '#DCFCE7' },
  numBadgeWrong: { backgroundColor: '#FEE2E2' },
  numBadgeText: { fontSize: 12, fontWeight: '800', color: '#334155' },
  cardStatus: { fontSize: 13, fontWeight: '700' },
  statusCorrect: { color: '#15803D' },
  statusWrong: { color: '#B91C1C' },
  questionText: { fontSize: 14, color: '#334155', lineHeight: 21, marginBottom: 12, fontWeight: '500' },
  optionItem: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 4,
  },
  optionItemCorrect: { backgroundColor: '#F0FDF4' },
  optionItemWrong: { backgroundColor: '#FEF2F2' },
  optionKey: { fontSize: 13, fontWeight: '800', color: '#64748B', minWidth: 20 },
  optionText: { fontSize: 13, color: '#475569', lineHeight: 20 },
  optExp: { fontSize: 11, color: '#64748B', marginTop: 3, lineHeight: 16 },
  notAnswered: { fontSize: 13, color: '#F59E0B', fontWeight: '600' },
  expBox: {
    backgroundColor: '#F0F9FF',
    borderRadius: 8,
    padding: 12,
    marginTop: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#0EA5E9',
  },
  expTitle: { fontSize: 12, fontWeight: '700', color: '#0369A1' },
  expText: { fontSize: 12, color: '#334155', lineHeight: 19 },
});
