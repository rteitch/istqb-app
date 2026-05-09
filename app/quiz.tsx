import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator,  StatusBar, Modal, Image
 } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { MaterialIcons } from '@expo/vector-icons';
import { useSession, QuestionData } from '../context/SessionContext';
import { getLevelColor } from '../constants/istqb';
import { useConfirmDialog } from '../components/ConfirmDialog';
import { useTheme } from '../context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';

type QuizMode = 'exam' | 'practice';

export default function QuizScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const db = useSQLiteContext();
  const { colors, isDarkMode } = useTheme();
  const { questions, setQuestions, answers, setAnswers, setActiveSessionId, saveSessionToStorage, loadSessionFromStorage, clearSavedSession } = useSession();
  const { showAlert, Dialog } = useConfirmDialog();

  const isResume = params.resume === 'true';

  const [category, setCategory] = useState(String(params.category ?? 'CTFL'));
  const [level, setLevel] = useState(String(params.level ?? 'Foundation'));
  const [mode, setMode] = useState<QuizMode>((String(params.mode ?? 'exam')) as QuizMode);
  const [passingScore, setPassingScore] = useState(Number(params.passingScore ?? 65));
  const count = Number(params.count ?? 40);
  const durationMins = Number(params.duration ?? 60);
  const qLang = String(params.qLang ?? 'id');

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
  const [showImageModal, setShowImageModal] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isResume) {
      resumeSavedSession();
    } else {
      fetchQuestions();
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const resumeSavedSession = async () => {
    const saved = await loadSessionFromStorage();
    if (saved) {
      setCategory(saved.category);
      setLevel(saved.level);
      setMode(saved.mode as QuizMode);
      setPassingScore(saved.passingScore);
      setQuestions(saved.questions);
      setAnswers(saved.answers);
      setRevealedAnswers(saved.revealedAnswers);
      setCurrentIndex(saved.currentIndex);
      setTimeLeft(saved.timeLeft);
    } else {
      fetchQuestions(); // fallback if not found
    }
    setLoading(false);
  };

  useEffect(() => {
    if (mode === 'exam' && !loading && !isPaused) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
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

  // Auto-submit when time reaches 0
  useEffect(() => {
    if (mode === 'exam' && timeLeft === 0 && !saving) {
      submitExam(true);
    }
  }, [timeLeft]);

  const fetchQuestions = async () => {
    try {
      const data = await db.getAllAsync<QuestionData>(
        `SELECT q.id, q.category, q.level, q.correct_answer, q.image_uri,
           COALESCE(qt_target.locale, qt_fallback.locale) as locale,
           COALESCE(qt_target.question_text, qt_fallback.question_text) as question_text,
           COALESCE(qt_target.option_a, qt_fallback.option_a) as option_a,
           COALESCE(qt_target.option_b, qt_fallback.option_b) as option_b,
           COALESCE(qt_target.option_c, qt_fallback.option_c) as option_c,
           COALESCE(qt_target.option_d, qt_fallback.option_d) as option_d,
           COALESCE(qt_target.explanation, qt_fallback.explanation) as explanation,
           COALESCE(qt_target.explanation_a, qt_fallback.explanation_a) as explanation_a,
           COALESCE(qt_target.explanation_b, qt_fallback.explanation_b) as explanation_b,
           COALESCE(qt_target.explanation_c, qt_fallback.explanation_c) as explanation_c,
           COALESCE(qt_target.explanation_d, qt_fallback.explanation_d) as explanation_d
         FROM questions q
         LEFT JOIN question_translations qt_target 
           ON q.id = qt_target.question_id AND qt_target.locale = ?
         LEFT JOIN question_translations qt_fallback 
           ON q.id = qt_fallback.question_id AND qt_fallback.locale = 'id'
         WHERE q.category = ? 
         ORDER BY RANDOM() LIMIT ?`,
        [qLang, category, count]
      );

      // Mengacak opsi jawaban untuk setiap soal
      const shuffledData = data.map(q => {
        const opts = [
          { opt: q.option_a, exp: q.explanation_a, origIndex: 0 },
          { opt: q.option_b, exp: q.explanation_b, origIndex: 1 },
          { opt: q.option_c, exp: q.explanation_c, origIndex: 2 },
          { opt: q.option_d, exp: q.explanation_d, origIndex: 3 }
        ];

        // Fisher-Yates shuffle
        for (let i = opts.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [opts[i], opts[j]] = [opts[j], opts[i]];
        }

        const newCorrectAnswer = opts.findIndex(o => o.origIndex === q.correct_answer);

        return {
          ...q,
          option_a: opts[0].opt,
          explanation_a: opts[0].exp,
          option_b: opts[1].opt,
          explanation_b: opts[1].exp,
          option_c: opts[2].opt,
          explanation_c: opts[2].exp,
          option_d: opts[3].opt,
          explanation_d: opts[3].exp,
          correct_answer: newCorrectAnswer
        };
      });

      setQuestions(shuffledData);
      setAnswers({});
      setRevealedAnswers({});
    } catch (error) {
      console.error('Error fetching questions', error);
      showAlert({ title: 'Error', message: 'Gagal memuat soal' });
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

  const handleSelectOption = (optionIndex: number) => {
    const newAnswers = { ...answers, [currentIndex]: optionIndex };
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
    if (saving) return;
    setShowSubmitModal(true);
  };

  const saveAndExit = async () => {
    setIsPaused(true);
    setSaving(true);
    await saveSessionToStorage({
      category, level, mode, count, durationMins, qLang, passingScore,
      questions, answers, revealedAnswers, currentIndex, timeLeft,
      savedAt: new Date().toISOString()
    });
    setSaving(false);
    if (timerRef.current) clearInterval(timerRef.current);
    router.back();
  };

  const confirmExit = () => {
    setIsPaused(true);
    setShowExitModal(true);
  };

  const submitExam = async (isTimeUp = false) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setSaving(true);
    await clearSavedSession();
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
        
        const snapshotStr = JSON.stringify({
          question_id: questions[i].id,
          locale: questions[i].locale,
          question_text: questions[i].question_text,
          option_a: questions[i].option_a,
          option_b: questions[i].option_b,
          option_c: questions[i].option_c,
          option_d: questions[i].option_d,
          correct_answer: questions[i].correct_answer,
          explanation: questions[i].explanation,
          explanation_a: questions[i].explanation_a,
          explanation_b: questions[i].explanation_b,
          explanation_c: questions[i].explanation_c,
          explanation_d: questions[i].explanation_d,
          image_uri: questions[i].image_uri,
          snapshot_at: new Date().toISOString()
        });

        await db.runAsync(
          `INSERT INTO exam_session_answers (session_id, question_id, user_answer, is_correct, question_snapshot)
           VALUES (?, ?, ?, ?, ?)`,
          [sessionId, questions[i].id, userAns !== null ? String(userAns) : null, isCorrect, snapshotStr]
        );
      }

      setActiveSessionId(Number(sessionId));
      router.replace({ pathname: '/result', params: { sessionId: Number(sessionId) } } as any);
    } catch (error) {
      console.error('Error saving session', error);
      showAlert({ title: 'Error', message: 'Gagal menyimpan hasil ujian' });
      setSaving(false);
    }
  };

  if (loading || saving) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={levelColor} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>{saving ? 'Menyimpan hasil...' : 'Memuat soal...'}</Text>
      </View>
    );
  }

  if (questions.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <MaterialIcons name="inbox" size={52} color={colors.textMuted} style={{ marginBottom: 16 }} />
        <Text style={[styles.emptyTitle, { color: colors.text }]}>Belum ada soal</Text>
        <Text style={[styles.emptySub, { color: colors.textSecondary }]}>Kategori {category} belum memiliki soal di database.</Text>
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
    { index: 0, text: currentQ.option_a, explanation: currentQ.explanation_a },
    { index: 1, text: currentQ.option_b, explanation: currentQ.explanation_b },
    { index: 2, text: currentQ.option_c, explanation: currentQ.explanation_c },
    { index: 3, text: currentQ.option_d, explanation: currentQ.explanation_d },
  ];

  const getOptionLetter = (idx: number) => String.fromCharCode(65 + idx);

  const getOptionStyle = (optIdx: number) => {
    let baseStyle: any[] = [styles.option, { backgroundColor: colors.card, borderColor: colors.border }];
    if (!isRevealed) {
      return userAnswer === optIdx ? [...baseStyle, styles.optionSelected] : baseStyle;
    }
    if (optIdx === currentQ.correct_answer) return [...baseStyle, styles.optionCorrect];
    if (optIdx === userAnswer) return [...baseStyle, styles.optionWrong];
    return [...baseStyle, styles.optionDimmed];
  };

  const getOptionTextStyle = (optIdx: number) => {
    let baseColor = { color: colors.text };
    if (!isRevealed) return userAnswer === optIdx ? styles.optionTextSelected : [styles.optionText, baseColor];
    if (optIdx === currentQ.correct_answer) return styles.optionTextCorrect;
    if (optIdx === userAnswer) return styles.optionTextWrong;
    return [styles.optionTextDimmed, { color: colors.textMuted }];
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor={levelColor} />

      {/* Header */}
      <LinearGradient colors={[levelColor, levelColor + 'EE', levelColor + 'CC'] as [string, string, string]} style={styles.header}>
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
                <MaterialIcons name={isPaused ? 'play-arrow' : 'pause'} size={14} color="white" style={{ flexShrink: 0 }} />
                <Text style={styles.headerSubmitBtnText} adjustsFontSizeToFit numberOfLines={1}>{isPaused ? ' Resume' : ' Pause'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.headerSubmitBtn, { backgroundColor: colors.danger }]} onPress={confirmSubmit}>
                <Text style={styles.headerSubmitBtnText} adjustsFontSizeToFit numberOfLines={1}>Kumpulkan</Text>
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
      </LinearGradient>

      <View style={{ flex: 1 }}>
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {currentQ.image_uri ? (
            <TouchableOpacity activeOpacity={0.9} onPress={() => setShowImageModal(true)}>
              <Image source={{ uri: currentQ.image_uri }} style={styles.questionImage} />
            </TouchableOpacity>
          ) : null}
          <Text style={[styles.questionText, { color: colors.text }]}>{currentQ.question_text}</Text>

          {optionsMap.map((opt) => (
            <TouchableOpacity
              key={opt.index}
              style={getOptionStyle(opt.index)}
              onPress={() => handleSelectOption(opt.index)}
              disabled={isRevealed}
              activeOpacity={0.8}
            >
              <View style={styles.optionRow}>
                <View style={[
                  styles.optionBadge,
                  { backgroundColor: colors.background },
                  userAnswer === opt.index && !isRevealed && { backgroundColor: levelColor },
                  isRevealed && opt.index === currentQ.correct_answer && styles.optionBadgeCorrect,
                  isRevealed && opt.index === userAnswer && opt.index !== currentQ.correct_answer && styles.optionBadgeWrong,
                ]}>
                  <Text style={[
                    styles.optionBadgeText,
                    { color: colors.textSecondary },
                    (userAnswer === opt.index && !isRevealed) || (isRevealed && opt.index === currentQ.correct_answer) || (isRevealed && opt.index === userAnswer)
                      ? styles.optionBadgeTextLight
                      : null,
                  ]}>
                    {getOptionLetter(opt.index)}
                  </Text>
                </View>
                <Text style={getOptionTextStyle(opt.index)}>{opt.text}</Text>
              </View>

              {/* Practice mode: tampilkan penjelasan per opsi setelah reveal */}
              {isRevealed && opt.explanation && (
                <Text style={[styles.optionExplanation, { color: colors.textSecondary }]}>{opt.explanation}</Text>
              )}
            </TouchableOpacity>
          ))}

          {/* Practice mode: penjelasan umum setelah menjawab */}
          {isRevealed && currentQ.explanation && (
            <View style={[styles.explanationBox, { backgroundColor: colors.infoBg, borderLeftColor: colors.info }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                <MaterialIcons name="lightbulb" size={16} color={colors.info} style={{ marginRight: 4 }} />
                <Text style={[styles.explanationTitle, { color: colors.info }]}>Penjelasan</Text>
              </View>
              <Text style={[styles.explanationText, { color: colors.text }]}>{currentQ.explanation}</Text>
            </View>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>

        {isPaused && !showExitModal && (
          <View style={[styles.pauseOverlay, { backgroundColor: colors.overlay }]}>
            <MaterialIcons name="pause-circle-filled" size={64} color={colors.textSecondary} style={{ marginBottom: 20 }} />
            <Text style={[styles.pauseTitle, { color: colors.text }]}>Ujian Dijeda</Text>
            <Text style={[styles.pauseSub, { color: colors.textSecondary }]}>Waktu berhenti sejenak. Fokus kembali saat Anda siap.</Text>
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
      <View style={[styles.footer, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.navBtn, { backgroundColor: colors.background }, currentIndex === 0 && styles.navBtnDisabled]}
          onPress={handlePrev}
          disabled={currentIndex === 0}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <MaterialIcons name="chevron-left" size={20} color={currentIndex === 0 ? colors.textMuted : colors.textSecondary} style={{ flexShrink: 0 }} />
            <Text style={[styles.navBtnText, { color: currentIndex === 0 ? colors.textMuted : colors.textSecondary }]} adjustsFontSizeToFit numberOfLines={1}>Prev</Text>
          </View>
        </TouchableOpacity>

        {/* Question dot navigator (ringkas) */}
        <TouchableOpacity
          style={[styles.indexBtn, { borderColor: levelColor, backgroundColor: colors.background }]}
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
            <TouchableOpacity style={[styles.navBtn, styles.submitBtn, { backgroundColor: colors.success }]} onPress={() => setShowSubmitModal(true)}>
              <Text style={styles.submitBtnText}>Selesai</Text>
            </TouchableOpacity>
          )
        ) : (
          <TouchableOpacity style={[styles.navBtn, { backgroundColor: levelColor }]} onPress={handleNext}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={[styles.navBtnText, { color: 'white' }]} adjustsFontSizeToFit numberOfLines={1}>Next</Text>
              <MaterialIcons name="chevron-right" size={20} color="white" style={{ flexShrink: 0 }} />
            </View>
          </TouchableOpacity>
        )}
      </View>

      {/* Jump Question Modal */}
      <Modal visible={showJumpModal} transparent animationType="fade" onRequestClose={() => setShowJumpModal(false)}>
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Lompat ke Soal</Text>
            <ScrollView contentContainerStyle={styles.jumpGrid}>
              {questions.map((_, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.jumpBtn,
                    { backgroundColor: colors.background, borderColor: colors.border },
                    answers[idx] !== undefined ? styles.jumpBtnAnswered : null,
                    currentIndex === idx ? { borderColor: levelColor, borderWidth: 2 } : null
                  ]}
                  onPress={() => {
                    setCurrentIndex(idx);
                    setShowJumpModal(false);
                  }}
                >
                  <Text style={[styles.jumpBtnText, { color: colors.textSecondary }, answers[idx] !== undefined ? styles.jumpBtnTextAnswered : null]}>
                    {idx + 1}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={[styles.modalCloseBtn, { backgroundColor: colors.background }]} onPress={() => setShowJumpModal(false)}>
              <Text style={[styles.modalCloseText, { color: colors.text }]}>Tutup</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Submit Confirmation Modal */}
      <Modal visible={showSubmitModal} transparent animationType="fade" onRequestClose={() => setShowSubmitModal(false)}>
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
          <View style={[styles.modalContentSmall, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{mode === 'exam' ? 'Kumpulkan Ujian' : 'Selesaikan Latihan'}</Text>
            <Text style={[styles.modalSub, { color: colors.textSecondary }]}>
              {questions.length - Object.keys(answers).length > 0
                ? `Masih ada ${questions.length - Object.keys(answers).length} soal belum dijawab. Yakin ingin mengakhiri?`
                : 'Yakin ingin menyelesaikan ujian ini?'}
            </Text>
            <View style={styles.modalRow}>
              <TouchableOpacity style={[styles.modalActionBtn, styles.modalCancelBtn, { backgroundColor: colors.background }]} onPress={() => setShowSubmitModal(false)}>
                <Text style={[styles.modalCancelText, { color: colors.text }]}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalActionBtn, { backgroundColor: mode === 'practice' ? colors.success : levelColor }]}
                disabled={saving}
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
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
          <View style={[styles.modalContentSmall, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Keluar Ujian?</Text>
            <Text style={[styles.modalSub, { color: colors.textSecondary }]}>
              Jika Anda keluar sekarang, progress ujian tidak akan disimpan. Yakin ingin keluar?
            </Text>
            <View style={styles.modalRow}>
              <TouchableOpacity
                style={[styles.modalActionBtn, styles.modalCancelBtn, { backgroundColor: colors.background }]}
                onPress={() => {
                  setShowExitModal(false);
                  setIsPaused(false);
                }}
              >
                <Text style={[styles.modalCancelText, { color: colors.text }]}>Lanjut Ujian</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalActionBtn, { backgroundColor: colors.primary }]}
                onPress={() => {
                  setShowExitModal(false);
                  saveAndExit();
                }}
              >
                <Text style={styles.modalConfirmText}>Simpan & Keluar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalActionBtn, { backgroundColor: colors.danger }]}
                onPress={async () => {
                  setShowExitModal(false);
                  await clearSavedSession();
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

      {/* Image Preview Modal */}
      <Modal visible={showImageModal} transparent animationType="fade" onRequestClose={() => setShowImageModal(false)}>
        <TouchableOpacity
          style={[styles.imageModalOverlay, { backgroundColor: colors.overlay }]}
          activeOpacity={1}
          onPress={() => setShowImageModal(false)}
        >
          <View style={styles.imageModalHeader}>
            <TouchableOpacity onPress={() => setShowImageModal(false)} style={styles.imageModalClose}>
              <MaterialIcons name="close" size={28} color="white" />
            </TouchableOpacity>
          </View>
          {currentQ.image_uri ? (
            <Image
              source={{ uri: currentQ.image_uri }}
              style={styles.imageModalFull}
              resizeMode="contain"
            />
          ) : null}
        </TouchableOpacity>
      </Modal>

      {Dialog}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 },
  loadingText: { marginTop: 16, fontSize: 15 },
  emptyTitle: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  emptySub: { fontSize: 14, textAlign: 'center', marginBottom: 24 },
  backBtn: { borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 24, paddingVertical: 10 },
  backBtnText: { fontSize: 15, fontWeight: '700' },
  // Header
  header: { paddingTop: 16, paddingBottom: 16, paddingHorizontal: 20, borderBottomLeftRadius: 20, borderBottomRightRadius: 20, elevation: 4 },
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
    lineHeight: 26,
    marginBottom: 20,
    fontWeight: '500',
  },
  questionImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 16,
    resizeMode: 'contain',
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  option: {
    borderRadius: 12,
    borderWidth: 1.5,
    marginBottom: 10,
    padding: 14,
  },
  optionSelected: { borderColor: '#1565C0', backgroundColor: 'rgba(21, 101, 192, 0.1)' },
  optionCorrect: { borderColor: '#22C55E', backgroundColor: 'rgba(34, 197, 94, 0.1)' },
  optionWrong: { borderColor: '#EF4444', backgroundColor: 'rgba(239, 68, 68, 0.1)' },
  optionDimmed: { opacity: 0.5 },
  optionRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  optionBadge: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    marginTop: 1,
    flexShrink: 0,
  },
  optionBadgeCorrect: { backgroundColor: '#22C55E' },
  optionBadgeWrong: { backgroundColor: '#EF4444' },
  optionBadgeText: { fontSize: 13, fontWeight: '800' },
  optionBadgeTextLight: { color: 'white' },
  optionText: { flex: 1, fontSize: 15, lineHeight: 22 },
  optionTextSelected: { color: '#1565C0', fontWeight: '600', flex: 1, fontSize: 15, lineHeight: 22 },
  optionTextCorrect: { color: '#22C55E', fontWeight: '600', flex: 1, fontSize: 15, lineHeight: 22 },
  optionTextWrong: { color: '#EF4444', fontWeight: '600', flex: 1, fontSize: 15, lineHeight: 22 },
  optionTextDimmed: { flex: 1, fontSize: 15, lineHeight: 22 },
  optionExplanation: { marginTop: 8, fontSize: 12, lineHeight: 18, paddingLeft: 40 },
  explanationBox: {
    borderRadius: 10,
    padding: 14,
    marginTop: 8,
    borderLeftWidth: 3,
  },
  explanationTitle: { fontSize: 13, fontWeight: '700' },
  explanationText: { fontSize: 13, lineHeight: 20 },
  // Footer
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  navBtn: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
  },
  navBtnDisabled: { opacity: 0.4 },
  navBtnText: { fontSize: 14, fontWeight: '700' },
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
    zIndex: 10,
  },
  pauseTitle: { fontSize: 24, fontWeight: '800', marginBottom: 8 },
  pauseSub: { fontSize: 15, textAlign: 'center', marginBottom: 32 },
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    borderRadius: 16,
    width: '100%',
    maxHeight: '80%',
    padding: 20,
  },
  modalContentSmall: {
    borderRadius: 16,
    width: '100%',
    padding: 24,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalSub: {
    fontSize: 15,
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
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  jumpBtnAnswered: {
    backgroundColor: '#1565C0',
    borderColor: '#1E40AF',
  },
  jumpBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
  jumpBtnTextAnswered: {
    color: 'white',
  },
  modalCloseBtn: {
    marginTop: 10,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalCloseText: {
    fontSize: 16,
    fontWeight: '700',
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
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '700',
  },
  modalConfirmText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  // Image preview modal
  imageModalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageModalHeader: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
  },
  imageModalClose: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageModalFull: {
    width: '92%',
    height: '70%',
    borderRadius: 12,
  },
});
