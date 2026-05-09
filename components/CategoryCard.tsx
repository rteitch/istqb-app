import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ISTQBCategory, ISTQBLevel } from '../constants/istqb';
import { useTheme } from '../context/ThemeContext';

interface CategoryCardProps {
  level: ISTQBLevel;
  category: ISTQBCategory;
  onPress: () => void;
  questionCount?: number; // jumlah soal tersedia di DB
}

export default function CategoryCard({
  level,
  category,
  onPress,
  questionCount = 0,
}: CategoryCardProps) {
  const { colors } = useTheme();
  const hasQuestions = questionCount > 0;

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card, borderLeftColor: level.color }]}
      onPress={onPress}
      activeOpacity={0.8}
      disabled={!hasQuestions}
    >
      <View style={styles.row}>
        <View style={styles.textGroup}>
          <Text style={[styles.shortName, { color: colors.text }]}>{category.shortName}</Text>
          <Text style={[styles.fullName, { color: colors.textSecondary }]} numberOfLines={2}>
            {category.name}
          </Text>
        </View>
        <View style={styles.meta}>
          <View style={[styles.levelBadge, { backgroundColor: level.lightColor }]}>
            <Text style={[styles.levelText, { color: level.color }]}>{level.level}</Text>
          </View>
          <Text style={[styles.countText, { color: hasQuestions ? colors.success : colors.textMuted }]}>
            {hasQuestions ? `${questionCount} soal` : 'Belum ada soal'}
          </Text>
        </View>
      </View>

      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        <Text style={[styles.footerItem, { color: colors.textMuted }]}>⏱ {category.defaultDuration} mnt</Text>
        <Text style={[styles.footerItem, { color: colors.textMuted }]}>📝 {category.defaultQuestions} soal</Text>
        <Text style={[styles.footerItem, { color: colors.textMuted }]}>✅ {category.passingScore}% lulus</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderLeftWidth: 4,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  textGroup: {
    flex: 1,
    marginRight: 10,
  },
  shortName: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 2,
  },
  fullName: {
    fontSize: 12,
    lineHeight: 17,
  },
  meta: {
    alignItems: 'flex-end',
    gap: 6,
  },
  levelBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  levelText: {
    fontSize: 11,
    fontWeight: '700',
  },
  countText: {
    fontSize: 11,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  footerItem: {
    fontSize: 11,
  },
});
