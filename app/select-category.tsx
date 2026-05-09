import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Modal, SafeAreaView, StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { MaterialIcons } from '@expo/vector-icons';
import { ISTQB_LEVELS, ISTQBLevel, ISTQBCategory } from '../constants/istqb';
import ModeSelector from '../components/ModeSelector';

type QuizMode = 'exam' | 'practice';

interface CategoryCount {
  category: string;
  count: number;
}

export default function SelectCategoryScreen() {
  const router = useRouter();
  const db = useSQLiteContext();
  const [expandedLevel, setExpandedLevel] = useState<string | null>('Foundation');
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState<ISTQBLevel | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<ISTQBCategory | null>(null);
  const [mode, setMode] = useState<QuizMode>('exam');
  const [questionCount, setQuestionCount] = useState('40');
  const [duration, setDuration] = useState('60');
  const [qLang, setQLang] = useState<'id' | 'en'>('id');

  useEffect(() => {
    loadCategoryCounts();
  }, []);

  const loadCategoryCounts = async () => {
    try {
      const rows = await db.getAllAsync<CategoryCount>(
        'SELECT category, COUNT(*) as count FROM questions GROUP BY category'
      );
      const map: Record<string, number> = {};
      for (const r of rows) map[r.category] = r.count;
      setCategoryCounts(map);
    } catch (e) {
      console.error(e);
    }
  };

  const openModal = (level: ISTQBLevel, category: ISTQBCategory) => {
    setSelectedLevel(level);
    setSelectedCategory(category);
    setMode('exam');
    setQuestionCount(String(category.defaultQuestions));
    setDuration(String(category.defaultDuration));
    setQLang('id');
    setModalVisible(true);
  };

  const handleStart = () => {
    if (!selectedCategory || !selectedLevel) return;
    const count = parseInt(questionCount, 10);
    const dur = parseInt(duration, 10);
    if (isNaN(count) || count <= 0) return;
    setModalVisible(false);
    router.push({
      pathname: '/quiz',
      params: {
        category: selectedCategory.code,
        level: selectedLevel.level,
        mode,
        count,
        duration: dur,
        qLang,
        passingScore: selectedCategory.passingScore,
      },
    } as any);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => {
            if (router.canGoBack()) router.back();
            else router.replace('/');
          }} 
          style={styles.backBtn}
        >
          <MaterialIcons name="arrow-back" size={24} color="#1E293B" />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Pilih Kategori</Text>
          <Text style={styles.headerSub}>Sertifikasi ISTQB</Text>
        </View>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {ISTQB_LEVELS.map((levelInfo) => {
          const isExpanded = expandedLevel === levelInfo.level;
          const totalInLevel = levelInfo.categories.reduce(
            (sum, cat) => sum + (categoryCounts[cat.code] ?? 0), 0
          );

          return (
            <View key={levelInfo.level} style={styles.levelSection}>
              {/* Level Header */}
              <TouchableOpacity
                style={[styles.levelHeader, { borderLeftColor: levelInfo.color }]}
                onPress={() => setExpandedLevel(isExpanded ? null : levelInfo.level)}
                activeOpacity={0.8}
              >
                <View style={styles.levelLeft}>
                  <MaterialIcons name="menu-book" size={24} color={levelInfo.color} style={{ marginRight: 8 }} />
                  <View>
                    <Text style={[styles.levelName, { color: levelInfo.color }]}>
                      {levelInfo.level}
                    </Text>
                    <Text style={styles.levelDesc} numberOfLines={1}>
                      {levelInfo.description}
                    </Text>
                  </View>
                </View>
                <View style={styles.levelRight}>
                  <Text style={[styles.levelCount, { color: levelInfo.color }]}>
                    {totalInLevel} soal
                  </Text>
                  <MaterialIcons name={isExpanded ? 'keyboard-arrow-up' : 'keyboard-arrow-down'} size={20} color="#94A3B8" />
                </View>
              </TouchableOpacity>

              {/* Categories */}
              {isExpanded && (
                <View style={styles.categoryList}>
                  {levelInfo.categories.map((cat) => {
                    const count = categoryCounts[cat.code] ?? 0;
                    const hasQ = count > 0;
                    return (
                      <TouchableOpacity
                        key={cat.code}
                        style={[styles.catCard, !hasQ && styles.catCardDisabled]}
                        onPress={() => openModal(levelInfo, cat)}
                        activeOpacity={0.85}
                        disabled={!hasQ}
                      >
                        <View style={styles.catRow}>
                          <View style={styles.catText}>
                            <Text style={[styles.catCode, { color: levelInfo.color }]}>
                              {cat.shortName}
                            </Text>
                            <Text style={styles.catName} numberOfLines={2}>
                              {cat.name}
                            </Text>
                          </View>
                          <View style={styles.catMeta}>
                            <Text style={[styles.catCount, !hasQ && styles.catCountEmpty]}>
                              {hasQ ? `${count} soal` : 'Belum ada'}
                            </Text>
                            {hasQ && (
                              <View style={[styles.startBtn, { backgroundColor: levelInfo.color, flexDirection: 'row', alignItems: 'center' }]}>
                                <Text style={styles.startBtnText}>Mulai </Text>
                                <MaterialIcons name="arrow-forward" size={12} color="white" />
                              </View>
                            )}
                          </View>
                        </View>
                        <View style={styles.catFooter}>
                          <View style={styles.catStatWrap}>
                            <MaterialIcons name="timer" size={12} color="#94A3B8" style={{ marginRight: 4 }} />
                            <Text style={styles.catStat}>{cat.defaultDuration} mnt</Text>
                          </View>
                          <View style={styles.catStatWrap}>
                            <MaterialIcons name="assignment" size={12} color="#94A3B8" style={{ marginRight: 4 }} />
                            <Text style={styles.catStat}>{cat.defaultQuestions} soal</Text>
                          </View>
                          <View style={styles.catStatWrap}>
                            <MaterialIcons name="check-circle" size={12} color="#94A3B8" style={{ marginRight: 4 }} />
                            <Text style={styles.catStat}>{cat.passingScore}% lulus</Text>
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
          );
        })}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Config Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        />
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />

          <Text style={styles.modalTitle}>
            {selectedCategory?.shortName}
          </Text>
          <Text style={styles.modalSub}>{selectedCategory?.name}</Text>

          <Text style={styles.fieldLabel}>Mode</Text>
          <ModeSelector value={mode} onChange={setMode} />

          <View style={styles.fieldRow}>
            <View style={styles.fieldHalf}>
              <Text style={styles.fieldLabel}>Jumlah Soal</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={questionCount}
                onChangeText={setQuestionCount}
              />
            </View>
            {mode === 'exam' && (
              <View style={styles.fieldHalf}>
                <Text style={styles.fieldLabel}>Durasi (menit)</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={duration}
                  onChangeText={setDuration}
                />
              </View>
            )}
          </View>

          <Text style={styles.fieldLabel}>Bahasa Soal</Text>
          <View style={styles.langRow}>
            {(['id', 'en'] as const).map((lng) => (
              <TouchableOpacity
                key={lng}
                style={[styles.langBtn, qLang === lng && styles.langBtnActive]}
                onPress={() => setQLang(lng)}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <MaterialIcons name="language" size={16} color={qLang === lng ? '#1D4ED8' : '#94A3B8'} style={{ marginRight: 6 }} />
                  <Text style={[styles.langText, qLang === lng && styles.langTextActive]}>
                    {lng === 'id' ? 'Indonesia' : 'English'}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[
              styles.startFullBtn,
              selectedLevel && { backgroundColor: selectedLevel.color },
            ]}
            onPress={handleStart}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <MaterialIcons name={mode === 'practice' ? 'menu-book' : 'timer'} size={20} color="white" style={{ marginRight: 8 }} />
              <Text style={styles.startFullText}>
                {mode === 'practice' ? 'Mulai Latihan' : 'Mulai Ujian'}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </Modal>
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
    paddingBottom: 12,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    gap: 14,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#1E293B' },
  headerSub: { fontSize: 12, color: '#94A3B8', marginTop: 1 },
  scroll: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
  levelSection: { marginBottom: 10 },
  levelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderLeftWidth: 4,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  levelLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  levelName: { fontSize: 16, fontWeight: '800' },
  levelDesc: { fontSize: 11, color: '#94A3B8', marginTop: 2, maxWidth: 200 },
  levelRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  levelCount: { fontSize: 12, fontWeight: '700' },
  categoryList: { marginTop: 6, paddingLeft: 8 },
  catCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  catCardDisabled: { opacity: 0.5 },
  catRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  catText: { flex: 1, marginRight: 10 },
  catCode: { fontSize: 14, fontWeight: '800', marginBottom: 2 },
  catName: { fontSize: 12, color: '#64748B', lineHeight: 17 },
  catMeta: { alignItems: 'flex-end', gap: 6 },
  catCount: { fontSize: 12, fontWeight: '600', color: '#22C55E' },
  catCountEmpty: { color: '#CBD5E1' },
  startBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 },
  startBtnText: { color: 'white', fontSize: 12, fontWeight: '700' },
  catFooter: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  catStatWrap: { flexDirection: 'row', alignItems: 'center' },
  catStat: { fontSize: 11, color: '#94A3B8' },
  // Modal
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalHandle: {
    width: 36,
    height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#1E293B', marginBottom: 4 },
  modalSub: { fontSize: 13, color: '#64748B', marginBottom: 20 },
  fieldLabel: { fontSize: 13, fontWeight: '700', color: '#475569', marginBottom: 8, marginTop: 16 },
  fieldRow: { flexDirection: 'row', gap: 12 },
  fieldHalf: { flex: 1 },
  input: {
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    textAlign: 'center',
    backgroundColor: '#F8FAFC',
  },
  langRow: { flexDirection: 'row', gap: 12 },
  langBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  langBtnActive: { borderColor: '#3B82F6', backgroundColor: '#EFF6FF' },
  langText: { fontSize: 13, fontWeight: '600', color: '#94A3B8' },
  langTextActive: { color: '#1D4ED8' },
  startFullBtn: {
    marginTop: 24,
    backgroundColor: '#1565C0',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startFullText: { color: 'white', fontSize: 16, fontWeight: '800' },
});
