import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Modal, SafeAreaView, StatusBar, Image
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { MaterialIcons } from '@expo/vector-icons';
import { useBankTypes, DynamicLevel, DynamicCategory } from '../context/BankTypeContext';
import ModeSelector from '../components/ModeSelector';
import { useTheme } from '../context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';

type QuizMode = 'exam' | 'practice';

interface CategoryCount {
  category: string;
  count: number;
}

export default function SelectCategoryScreen() {
  const router = useRouter();
  const db = useSQLiteContext();
  const { levels } = useBankTypes();
  const { colors, isDarkMode } = useTheme();
  const [expandedLevel, setExpandedLevel] = useState<string | null>('Foundation');
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState<DynamicLevel | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<DynamicCategory | null>(null);
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

  const openModal = (level: DynamicLevel, category: DynamicCategory) => {
    setSelectedLevel(level);
    setSelectedCategory(category);
    setMode('exam');
    setQuestionCount(String(category.default_questions));
    setDuration(String(category.default_duration));
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
        level: selectedLevel.level_name,
        mode,
        count,
        duration: dur,
        qLang,
        passingScore: selectedCategory.passing_score,
      },
    } as any);
  };

  const gradientHeader: [string, string] = isDarkMode
    ? [colors.card, colors.background]
    : [colors.primary, colors.primaryHover];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor={isDarkMode ? colors.card : colors.primary} />

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
          <Text style={styles.headerTitle}>Pilih Kategori</Text>
          <View style={{ width: 32 }} />
        </View>
        <Text style={styles.headerSub}>Pilih tingkat sertifikasi ISTQB yang ingin dilatih</Text>
      </LinearGradient>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {levels.map((levelInfo) => {
          const isExpanded = expandedLevel === levelInfo.level_name;
          const totalInLevel = levelInfo.categories.reduce(
            (sum, cat) => sum + (categoryCounts[cat.code] ?? 0), 0
          );

          return (
            <View key={levelInfo.level_name} style={styles.levelSection}>
              {/* Level Header */}
              <TouchableOpacity
                style={[
                  styles.levelHeader, 
                  { backgroundColor: colors.card, borderLeftColor: levelInfo.color },
                  isDarkMode && { borderWidth: 1, borderColor: colors.border, borderLeftWidth: 4, shadowOpacity: 0 }
                ]}
                onPress={() => setExpandedLevel(isExpanded ? null : levelInfo.level_name)}
                activeOpacity={0.8}
              >
                <View style={styles.levelLeft}>
                  {levelInfo.image_uri ? (
                    <Image source={{ uri: levelInfo.image_uri }} style={{ width: 32, height: 32, marginRight: 10, borderRadius: 6 }} />
                  ) : (
                    <View style={[styles.levelIconCircle, { backgroundColor: levelInfo.color + '15' }]}>
                      <MaterialIcons name="menu-book" size={20} color={levelInfo.color} />
                    </View>
                  )}
                  <View>
                    <Text style={[styles.levelName, { color: levelInfo.color }]}>
                      {levelInfo.level_name}
                    </Text>
                    <Text style={[styles.levelDesc, { color: colors.textSecondary }]} numberOfLines={1}>
                      {levelInfo.description}
                    </Text>
                  </View>
                </View>
                <View style={styles.levelRight}>
                  <View style={[styles.levelBadge, { backgroundColor: isDarkMode ? colors.background : '#F1F5F9' }]}>
                    <Text style={[styles.levelCount, { color: levelInfo.color }]}>{totalInLevel} soal</Text>
                  </View>
                  <MaterialIcons name={isExpanded ? 'keyboard-arrow-up' : 'keyboard-arrow-down'} size={24} color={colors.textMuted} />
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
                        style={[
                          styles.catCard, 
                          { backgroundColor: colors.card, borderColor: colors.border }, 
                          !hasQ && styles.catCardDisabled
                        ]}
                        onPress={() => openModal(levelInfo, cat)}
                        activeOpacity={0.85}
                        disabled={!hasQ}
                      >
                        <View style={styles.catRow}>
                          <View style={styles.catText}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                              {cat.image_uri && (
                                <Image source={{ uri: cat.image_uri }} style={{ width: 18, height: 18, marginRight: 6, borderRadius: 4 }} />
                              )}
                              <Text style={[styles.catCode, { color: levelInfo.color }]}>
                                {cat.short_name}
                              </Text>
                            </View>
                            <Text style={[styles.catName, { color: colors.textSecondary }]} numberOfLines={2}>
                              {cat.name}
                            </Text>
                          </View>
                          <View style={styles.catMeta}>
                            <Text style={[styles.catCount, { color: hasQ ? colors.success : colors.textMuted }]}>
                              {hasQ ? `${count} soal` : 'Belum ada'}
                            </Text>
                            {hasQ && (
                              <LinearGradient 
                                colors={[levelInfo.color, levelInfo.color + 'DD'] as [string, string]} 
                                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                                style={styles.startBtn}
                              >
                                <Text style={styles.startBtnText}>Mulai </Text>
                                <MaterialIcons name="arrow-forward" size={12} color="white" />
                              </LinearGradient>
                            )}
                          </View>
                        </View>
                        <View style={[styles.catFooter, { borderTopColor: colors.border }]}>
                          <View style={styles.catStatWrap}>
                            <MaterialIcons name="timer" size={14} color={colors.textMuted} style={{ marginRight: 4 }} />
                            <Text style={[styles.catStat, { color: colors.textMuted }]}>{cat.default_duration} mnt</Text>
                          </View>
                          <View style={styles.catStatWrap}>
                            <MaterialIcons name="assignment" size={14} color={colors.textMuted} style={{ marginRight: 4 }} />
                            <Text style={[styles.catStat, { color: colors.textMuted }]}>{cat.default_questions} soal</Text>
                          </View>
                          <View style={styles.catStatWrap}>
                            <MaterialIcons name="check-circle" size={14} color={colors.textMuted} style={{ marginRight: 4 }} />
                            <Text style={[styles.catStat, { color: colors.textMuted }]}>{cat.passing_score}% lulus</Text>
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
          style={[styles.overlay, { backgroundColor: colors.overlay }]}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        />
        <View style={[styles.modalSheet, { backgroundColor: colors.card, borderTopColor: colors.border, borderTopWidth: isDarkMode ? 1 : 0 }]}>
          <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />

          <Text style={[styles.modalTitle, { color: colors.text }]}>
            {selectedCategory?.short_name}
          </Text>
          <Text style={[styles.modalSub, { color: colors.textSecondary }]}>{selectedCategory?.name}</Text>

          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Mode Latihan</Text>
          <ModeSelector value={mode} onChange={setMode} />

          <View style={styles.fieldRow}>
            <View style={styles.fieldHalf}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Jumlah Soal</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: isDarkMode ? colors.background : '#F8FAFC' }]}
                keyboardType="numeric"
                value={questionCount}
                onChangeText={setQuestionCount}
              />
            </View>
            {mode === 'exam' && (
              <View style={styles.fieldHalf}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Durasi (menit)</Text>
                <TextInput
                  style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: isDarkMode ? colors.background : '#F8FAFC' }]}
                  keyboardType="numeric"
                  value={duration}
                  onChangeText={setDuration}
                />
              </View>
            )}
          </View>

          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Bahasa Soal</Text>
          <View style={styles.langRow}>
            {(['id', 'en'] as const).map((lng) => (
              <TouchableOpacity
                key={lng}
                style={[
                  styles.langBtn, 
                  { borderColor: colors.border, backgroundColor: isDarkMode ? colors.background : '#F8FAFC' }, 
                  qLang === lng && { borderColor: selectedLevel?.color ?? colors.primary, backgroundColor: (selectedLevel?.color ?? colors.primary) + '15' }
                ]}
                onPress={() => setQLang(lng)}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <MaterialIcons name="language" size={16} color={qLang === lng ? (selectedLevel?.color ?? colors.primary) : colors.textMuted} style={{ marginRight: 6 }} />
                  <Text style={[styles.langText, { color: colors.textMuted }, qLang === lng && { color: selectedLevel?.color ?? colors.primary }]}>
                    {lng === 'id' ? 'Indonesia' : 'English'}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity activeOpacity={0.8} onPress={handleStart} style={{ marginTop: 24 }}>
            <LinearGradient
              colors={(selectedLevel ? [selectedLevel.color, selectedLevel.color + 'DD'] : [colors.primary, colors.primaryHover]) as [string, string]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={styles.startFullBtn}
            >
              <MaterialIcons name={mode === 'practice' ? 'menu-book' : 'timer'} size={22} color="white" style={{ marginRight: 8 }} />
              <Text style={styles.startFullText}>
                {mode === 'practice' ? 'Mulai Latihan' : 'Mulai Ujian'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  headerHero: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  backBtn: { padding: 4, marginLeft: -4 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: 'white' },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.85)', textAlign: 'center' },
  scroll: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },
  levelSection: { marginBottom: 14 },
  levelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderLeftWidth: 5,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  levelLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  levelIconCircle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: 4 },
  levelName: { fontSize: 16, fontWeight: '800' },
  levelDesc: { fontSize: 12, marginTop: 2, maxWidth: 200 },
  levelRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  levelBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  levelCount: { fontSize: 11, fontWeight: '800' },
  categoryList: { marginTop: 10, paddingLeft: 8 },
  catCard: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
  },
  catCardDisabled: { opacity: 0.5 },
  catRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  catText: { flex: 1, marginRight: 10 },
  catCode: { fontSize: 15, fontWeight: '800', marginBottom: 2 },
  catName: { fontSize: 13, lineHeight: 18, fontWeight: '500' },
  catMeta: { alignItems: 'flex-end', gap: 8 },
  catCount: { fontSize: 12, fontWeight: '700' },
  startBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, flexDirection: 'row', alignItems: 'center' },
  startBtnText: { color: 'white', fontSize: 12, fontWeight: '800' },
  catFooter: {
    flexDirection: 'row',
    gap: 14,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  catStatWrap: { flexDirection: 'row', alignItems: 'center' },
  catStat: { fontSize: 12, fontWeight: '500' },
  overlay: { flex: 1 },
  modalSheet: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
  },
  modalHandle: { width: 40, height: 5, borderRadius: 2.5, alignSelf: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 22, fontWeight: '800', marginBottom: 4 },
  modalSub: { fontSize: 14, marginBottom: 20, fontWeight: '500' },
  fieldLabel: { fontSize: 13, fontWeight: '800', marginBottom: 10, marginTop: 16, textTransform: 'uppercase', letterSpacing: 0.5 },
  fieldRow: { flexDirection: 'row', gap: 12 },
  fieldHalf: { flex: 1 },
  input: {
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  langRow: { flexDirection: 'row', gap: 12 },
  langBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  langText: { fontSize: 14, fontWeight: '700' },
  startFullBtn: {
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    elevation: 3,
  },
  startFullText: { color: 'white', fontSize: 17, fontWeight: '800' },
});
