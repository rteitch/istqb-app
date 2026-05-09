import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Alert, ActivityIndicator, SafeAreaView, StatusBar, Platform, Modal,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { MaterialIcons } from '@expo/vector-icons';
import { useSession, QuestionData } from './context/SessionContext';
import { getLevelColor } from '../constants/istqb';

type QuizMode = 'exam' | 'practice';

export default function QuizScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const db = useSQLiteContext();
  const { questions, setQuestions, answers, setAnswers, setActiveSessionId } = useSession();

  const category = String(params.category ?? 'CTFL');
  const level = String(params.level ?? 'Foundation');
  const mode = (String(params.mode ?? 'exam')) as QuizMode;
  const count = Number(params.count ?? 40);
  const durationMins = Number(params.duration ?? 60);
  const qLang = String(params.qLang ?? 'id');
  const passingScore = Number(params.passingScore ?? 65);

  const levelColor = getLevelColor(level);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(durationMins * 60);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [revealedAnswers, setRevealedAnswers] = useState<Record<number, boolean>>({});
  const [isPaused, setIsPaused] = useState(false);
  const [showJumpModal, setShowJumpModal] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetchQuestions();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (mode === 'exam' && !loading && !isPaused) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            submitExam(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [loading, mode, isPaused]);

  const fetchQuestions = async () => {
    try {
      const data = await db.getAllAsync<QuestionData>(
        `SELECT * FROM questions WHERE category = ? AND language = ? ORDER BY RANDOM() LIMIT ?`,
        [category, qLang, count]
      );
      setQuestions(data);
      setAnswers({});
      setRevealedAnswers({});
    } catch (error) {
      console.error('Error fetching questions', error);
      if (Platform.OS === 'web') alert('Gagal memuat soal'); else Alert.alert('Error', 'Gagal memuat soal');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const isTimeCritical = mode === 'exam' && timeLeft <= 300; // 5 menit terakhir

  const handleSelectOption = (optionKey: string) => {
    const newAnswers = { ...answers, [currentIndex]: optionKey };
    setAnswers(newAnswers);

    // Practice mode: langsung reveal feedback
    if (mode === 'practice') {
      setRevealedAnswers((prev) => ({ ...prev, [currentIndex]: true }));
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) setCurrentIndex(currentIndex + 1);
  };
  const handlePrev = () => {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
  };

  const confirmSubmit = () => {
    setShowSubmitModal(true);
  };

  const confirmExit = () => {
    setIsPaused(true);
    setShowExitModal(true);
  };

  const submitExam = async (isTimeUp = false) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setSaving(true);
    try {
      let correct = 0;
      for (let i = 0; i < questions.length; i++) {
        if (answers[i] === questions[i].correct_answer) correct++;
      }
      const scorePercent = questions.length > 0 ? (correct / questions.length) * 100 : 0;
      const passed = scorePercent >= passingScore ? 1 : 0;
      const durationUsed = mode === 'exam' ? durationMins * 60 - timeLeft : null;

      // Ambil user_id (single user)
      const user = await db.getFirstAsync<{ id: number }>('SELECT id FROM users LIMIT 1');
      const userId = user?.id ?? null;

      // Simpan exam_session
      const sessionResult = await db.runAsync(
        `INSERT INTO exam_sessions (user_id, category, level, mode, total_questions, correct_answers, score_percent, passed, duration_seconds)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [userId, category, level, mode, questions.length, correct, scorePercent, passed, durationUsed]
      );
      const sessionId = sessionResult.lastInsertRowId;

      // Simpan jawaban per soal
      for (let i = 0; i < questions.length; i++) {
        const userAns = answers[i] ?? null;
        const isCorrect = userAns === questions[i].correct_answer ? 1 : 0;
        await db.runAsync(
          `INSERT INTO exam_session_answers (session_id, question_id, user_answer, is_correct)
           VALUES (?, ?, ?, ?)`,
          [sessionId, questions[i].id, userAns, isCorrect]
        );
      }

      setActiveSessionId(Number(sessionId));
      router.replace({ pathname: '/result', params: { sessionId: Number(sessionId) } } as any);
    } catch (error) {
      console.error('Error saving session', error);
      if (Platform.OS === 'web') alert('Gagal menyimpan hasil ujian'); else Alert.alert('Error', 'Gagal menyimpan hasil ujian');
    } finally {
      setSaving(false);
    }
  };

  if (loading || saving) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={levelColor} />
        <Text style={styles.loadingText}>{saving ? 'Menyimpan hasil...' : 'Memuat soal...'}</Text>
      </View>
    );
  }

  if (questions.length === 0) {
    return (
      <View style={styles.center}>
        <MaterialIcons name="inbox" size={52} color="#94A3B8" style={{ marginBottom: 16 }} />
        <Text style={styles.emptyTitle}>Belum ada soal</Text>
        <Text style={styles.emptySub}>Kategori {category} belum memiliki soal di database.</Text>
        <TouchableOpacity style={[styles.backBtn, { borderColor: levelColor }]} onPress={() => router.back()}>
          <Text style={[styles.backBtnText, { color: levelColor }]}>Kembali</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const currentQ = questions[currentIndex];
  const userAnswer = answers[currentIndex];
  const isRevealed = mode === 'practice' && revealedAnswers[currentIndex];
  const answeredCount = Object.keys(answers).length;
  const progress = (answeredCount / questions.length) * 100;

  const optionsMap = [
    { key: 'A', text: currentQ.option_a, explanation: currentQ.explanation_a },
    { key: 'B', text: currentQ.option_b, explanation: currentQ.explanation_b },
    { key: 'C', text: currentQ.option_c, explanation: currentQ.explanation_c },
    { key: 'D', text: currentQ.option_d, explanation: currentQ.explanation_d },
  ];

  const getOptionStyle = (optKey: string) => {
    if (!isRevealed) {
      return userAnswer === optKey ? [styles.option, styles.optionSelected] : styles.option;
    }
    if (optKey === currentQ.correct_answer) return [styles.option, styles.optionCorrect];
    if (optKey === userAnswer) return [styles.option, styles.optionWrong];
    return [styles.option, styles.optionDimmed];
  };

  const getOptionTextStyle = (optKey: string) => {
    if (!isRevealed) return userAnswer === optKey ? styles.optionTextSelected : styles.optionText;
    if (optKey === currentQ.correct_answer) return styles.optionTextCorrect;
    if (optKey === userAnswer) return styles.optionTextWrong;
    return styles.optionTextDimmed;
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={levelColor} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: levelColor }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={confirmExit} style={styles.headerBackBtn}>
            <MaterialIcons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.categoryLabel}>{category} — {level}</Text>
          <View style={styles.modeBadgeWrap}>
            <MaterialIcons name={mode === 'practice' ? 'menu-book' : 'timer'} size={14} color="rgba(255,255,255,0.85)" />
            <Text style={styles.modeBadgeText}>{mode === 'practice' ? ' Latihan' : ' Ujian'}</Text>
          </View>
          {mode === 'exam' && (
            <View style={styles.headerRight}>
              <Text style={[styles.timer, isTimeCritical && styles.timerCritical]}>
                {formatTime(timeLeft)}
              </Text>
              <TouchableOpacity
                style={styles.headerSubmitBtn}
                onPress={() => setIsPaused(!isPaused)}
              >
                <MaterialIcons name={isPaused ? 'play-arrow' : 'pause'} size={14} color="white" />
                <Text style={styles.headerSubmitBtnText}>{isPaused ? ' Resume' : ' Pause'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.headerSubmitBtn, { backgroundColor: '#EF4444' }]} onPress={confirmSubmit}>
                <Text style={styles.headerSubmitBtnText}>Kumpulkan</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
        <Text style={styles.progressLabel}>
          Soal {currentIndex + 1} / {questions.length} • {answeredCount} dijawab
        </Text>
      </View>

      <View style={{ flex: 1 }}>
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.questionText}>{currentQ.question_text}</Text>

          {optionsMap.map((opt) => (
            <TouchableOpacity
              key={opt.key}
              style={getOptionStyle(opt.key)}
              onPress={() => handleSelectOption(opt.key)}
              disabled={isRevealed}
              activeOpacity={0.8}
            >
              <View style={styles.optionRow}>
                <View style={[
                  styles.optionBadge,
                  userAnswer === opt.key && !isRevealed && { backgroundColor: levelColor },
                  isRevealed && opt.key === currentQ.correct_answer && styles.optionBadgeCorrect,
                  isRevealed && opt.key === userAnswer && opt.key !== currentQ.correct_answer && styles.optionBadgeWrong,
                ]}>
                  <Text style={[
                    styles.optionBadgeText,
                    (userAnswer === opt.key && !isRevealed) || (isRevealed && opt.key === currentQ.correct_answer) || (isRevealed && opt.key === userAnswer)
                      ? styles.optionBadgeTextLight
                      : null,
                  ]}>
                    {opt.key}
                  </Text>
                </View>
                <Text style={getOptionTextStyle(opt.key)}>{opt.text}</Text>
              </View>

              {/* Practice mode: tampilkan penjelasan per opsi setelah reveal */}
              {isRevealed && opt.explanation && (
                <Text style={styles.optionExplanation}>{opt.explanation}</Text>
              )}
            </TouchableOpacity>
          ))}

          {/* Practice mode: penjelasan umum setelah menjawab */}
          {isRevealed && currentQ.explanation && (
            <View style={styles.explanationBox}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                <MaterialIcons name="lightbulb" size={16} color="#0369A1" style={{ marginRight: 4 }} />
                <Text style={styles.explanationTitle}>Penjelasan</Text>
              </View>
              <Text style={styles.explanationText}>{currentQ.explanation}</Text>
            </View>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>

        {isPaused && !showExitModal && (
          <View style={styles.pauseOverlay}>
            <MaterialIcons name="pause-circle-filled" size={64} color="#64748B" style={{ marginBottom: 20 }} />
            <Text style={styles.pauseTitle}>Ujian Dijeda</Text>
            <Text style={styles.pauseSub}>Waktu berhenti sejenak. Fokus kembali saat Anda siap.</Text>
            <TouchableOpacity
              style={[styles.resumeBtn, { backgroundColor: levelColor }]}
              onPress={() => setIsPaused(false)}
            >
              <Text style={styles.resumeBtnText}>Lanjutkan Ujian</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Footer Navigation */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.navBtn, currentIndex === 0 && styles.navBtnDisabled]}
          onPress={handlePrev}
          disabled={currentIndex === 0}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <MaterialIcons name="chevron-left" size={20} color={currentIndex === 0 ? '#94A3B8' : '#475569'} />
            <Text style={styles.navBtnText}>Prev</Text>
          </View>
        </TouchableOpacity>

        {/* Question dot navigator (ringkas) */}
        <TouchableOpacity
          style={[styles.indexBtn, { borderColor: levelColor }]}
          onPress={() => setShowJumpModal(true)}
        >
          <Text style={[styles.indexBtnText, { color: levelColor }]}>
            {currentIndex + 1}/{questions.length}
          </Text>
        </TouchableOpacity>

        {currentIndex === questions.length - 1 ? (
          mode === 'exam' ? (
            <TouchableOpacity style={[styles.navBtn, styles.submitBtn, { backgroundColor: levelColor }]} onPress={confirmSubmit}>
              <Text style={styles.submitBtnText}>Kumpulkan</Text>
            </TouchableOpacity>
          ) : (
            // Practice mode: tombol lihat hasil di akhir
            <TouchableOpacity style={[styles.navBtn, styles.submitBtn, { backgroundColor: '#22C55E' }]} onPress={() => setShowSubmitModal(true)}>
              <Text style={styles.submitBtnText}>Selesai</Text>
            </TouchableOpacity>
          )
        ) : (
          <TouchableOpacity style={[styles.navBtn, { backgroundColor: levelColor }]} onPress={handleNext}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={[styles.navBtnText, { color: 'white' }]}>Next</Text>
              <MaterialIcons name="chevron-right" size={20} color="white" />
            </View>
          </TouchableOpacity>
        )}
      </View>

      {/* Jump Question Modal */}
      <Modal visible={showJumpModal} transparent animationType="fade" onRequestClose={() => setShowJumpModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Lompat ke Soal</Text>
            <ScrollView contentContainerStyle={styles.jumpGrid}>
              {questions.map((_, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.jumpBtn,
                    answers[idx] ? styles.jumpBtnAnswered : null,
                    currentIndex === idx ? { borderColor: levelColor, borderWidth: 2 } : null
                  ]}
                  onPress={() => {
                    setCurrentIndex(idx);
                    setShowJumpModal(false);
                  }}
                >
                  <Text style={[styles.jumpBtnText, answers[idx] ? styles.jumpBtnTextAnswered : null]}>
                    {idx + 1}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowJumpModal(false)}>
              <Text style={styles.modalCloseText}>Tutup</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Submit Confirmation Modal */}
      <Modal visible={showSubmitModal} transparent animationType="fade" onRequestClose={() => setShowSubmitModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContentSmall}>
            <Text style={styles.modalTitle}>{mode === 'exam' ? 'Kumpulkan Ujian' : 'Selesaikan Latihan'}</Text>
            <Text style={styles.modalSub}>
              {questions.length - Object.keys(answers).length > 0
                ? `Masih ada ${questions.length - Object.keys(answers).length} soal belum dijawab. Yakin ingin mengakhiri?`
                : 'Yakin ingin menyelesaikan ujian ini?'}
            </Text>
            <View style={styles.modalRow}>
              <TouchableOpacity style={[styles.modalActionBtn, styles.modalCancelBtn]} onPress={() => setShowSubmitModal(false)}>
                <Text style={styles.modalCancelText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalActionBtn, { backgroundColor: mode === 'practice' ? '#22C55E' : levelColor }]}
                onPress={() => {
                  setShowSubmitModal(false);
                  submitExam(false);
                }}
              >
                <Text style={styles.modalConfirmText}>{mode === 'exam' ? 'Kumpulkan' : 'Selesai'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Exit Confirmation Modal */}
      <Modal visible={showExitModal} transparent animationType="fade" onRequestClose={() => setShowExitModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContentSmall}>
            <Text style={styles.modalTitle}>Keluar Ujian?</Text>
            <Text style={styles.modalSub}>
              Jika Anda keluar sekarang, progress ujian tidak akan disimpan. Yakin ingin keluar?
            </Text>
            <View style={styles.modalRow}>
              <TouchableOpacity
                style={[styles.modalActionBtn, styles.modalCancelBtn]}
                onPress={() => {
                  setShowExitModal(false);
                  setIsPaused(false);
                }}
              >
                <Text style={styles.modalCancelText}>Lanjut Ujian</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalActionBtn, { backgroundColor: '#EF4444' }]}
                onPress={() => {
                  setShowExitModal(false);
                  if (timerRef.current) clearInterval(timerRef.current);
                  router.back();
                }}
              >
                <Text style={styles.modalConfirmText}>Keluar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAFC' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30, backgroundColor: '#F8FAFC' },
  loadingText: { marginTop: 16, fontSize: 15, color: '#64748B' },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#1E293B', marginBottom: 8 },
  emptySub: { fontSize: 14, color: '#64748B', textAlign: 'center', marginBottom: 24 },
  backBtn: { borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 24, paddingVertical: 10 },
  backBtnText: { fontSize: 15, fontWeight: '700' },
  // Header
  header: { paddingTop: 16, paddingBottom: 12, paddingHorizontal: 20 },
  headerTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  headerBackBtn: { padding: 4, marginRight: 8, marginLeft: -4 },
  categoryLabel: { flex: 1, fontSize: 12, color: 'rgba(255,255,255,0.85)', fontWeight: '700' },
  modeBadgeWrap: { flexDirection: 'row', alignItems: 'center', marginRight: 12 },
  modeBadgeText: { fontSize: 12, color: 'rgba(255,255,255,0.85)' },
  timer: { fontSize: 18, color: 'white', fontWeight: '800', fontVariant: ['tabular-nums'] },
  timerCritical: { color: '#FDE68A' },
  progressTrack: { height: 4, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 2, marginBottom: 8, overflow: 'hidden' },
  progressFill: { height: 4, backgroundColor: 'white', borderRadius: 2 },
  progressLabel: { fontSize: 11, color: 'rgba(255,255,255,0.75)' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerSubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  headerSubmitBtnText: { color: 'white', fontSize: 11, fontWeight: '700' },
  // Content
  content: { flex: 1, padding: 20 },
  questionText: {
    fontSize: 17,
    color: '#1E293B',
    lineHeight: 26,
    marginBottom: 20,
    fontWeight: '500',
  },
  option: {
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    marginBottom: 10,
    padding: 14,
  },
  optionSelected: { borderColor: '#3B82F6', backgroundColor: '#EFF6FF' },
  optionCorrect: { borderColor: '#22C55E', backgroundColor: '#F0FDF4' },
  optionWrong: { borderColor: '#EF4444', backgroundColor: '#FEF2F2' },
  optionDimmed: { opacity: 0.5 },
  optionRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  optionBadge: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center', justifyContent: 'center',
    marginTop: 1,
    flexShrink: 0,
  },
  optionBadgeCorrect: { backgroundColor: '#22C55E' },
  optionBadgeWrong: { backgroundColor: '#EF4444' },
  optionBadgeText: { fontSize: 13, fontWeight: '800', color: '#64748B' },
  optionBadgeTextLight: { color: 'white' },
  optionText: { flex: 1, fontSize: 15, color: '#334155', lineHeight: 22 },
  optionTextSelected: { color: '#1D4ED8', fontWeight: '600', flex: 1, fontSize: 15, lineHeight: 22 },
  optionTextCorrect: { color: '#15803D', fontWeight: '600', flex: 1, fontSize: 15, lineHeight: 22 },
  optionTextWrong: { color: '#B91C1C', fontWeight: '600', flex: 1, fontSize: 15, lineHeight: 22 },
  optionTextDimmed: { color: '#94A3B8', flex: 1, fontSize: 15, lineHeight: 22 },
  optionExplanation: { marginTop: 8, fontSize: 12, color: '#64748B', lineHeight: 18, paddingLeft: 40 },
  explanationBox: {
    backgroundColor: '#F0F9FF',
    borderRadius: 10,
    padding: 14,
    marginTop: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#0EA5E9',
  },
  explanationTitle: { fontSize: 13, fontWeight: '700', color: '#0369A1' },
  explanationText: { fontSize: 13, color: '#334155', lineHeight: 20 },
  // Footer
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  navBtn: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  navBtnDisabled: { opacity: 0.4 },
  navBtnText: { fontSize: 14, fontWeight: '700', color: '#475569' },
  submitBtn: {},
  submitBtnText: { fontSize: 14, fontWeight: '800', color: 'white' },
  indexBtn: {
    borderWidth: 1.5,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  indexBtnText: { fontSize: 13, fontWeight: '700' },
  pauseOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(248, 250, 252, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
    zIndex: 10,
  },
  pauseTitle: { fontSize: 24, fontWeight: '800', color: '#1E293B', marginBottom: 8 },
  pauseSub: { fontSize: 15, color: '#64748B', textAlign: 'center', marginBottom: 32 },
  resumeBtn: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  resumeBtnText: { color: 'white', fontSize: 16, fontWeight: '700' },
  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    width: '100%',
    maxHeight: '80%',
    padding: 20,
  },
  modalContentSmall: {
    backgroundColor: 'white',
    borderRadius: 16,
    width: '100%',
    padding: 24,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalSub: {
    fontSize: 15,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  jumpGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    paddingBottom: 20,
  },
  jumpBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  jumpBtnAnswered: {
    backgroundColor: '#3B82F6',
    borderColor: '#2563EB',
  },
  jumpBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#64748B',
  },
  jumpBtnTextAnswered: {
    color: 'white',
  },
  modalCloseBtn: {
    marginTop: 10,
    paddingVertical: 14,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    alignItems: 'center',
  },
  modalCloseText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#475569',
  },
  modalRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  modalActionBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalCancelBtn: {
    backgroundColor: '#F1F5F9',
  },
  modalCancelText: {
    color: '#475569',
    fontSize: 16,
    fontWeight: '700',
  },
  modalConfirmText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
});
