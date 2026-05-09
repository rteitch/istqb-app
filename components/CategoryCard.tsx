import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ISTQBCategory, ISTQBLevel } from '../constants/istqb';

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
  const hasQuestions = questionCount > 0;

  return (
    <TouchableOpacity
      style={[styles.card, { borderLeftColor: level.color }]}
      onPress={onPress}
      activeOpacity={0.8}
      disabled={!hasQuestions}
    >
      <View style={styles.row}>
        <View style={styles.textGroup}>
          <Text style={styles.shortName}>{category.shortName}</Text>
          <Text style={styles.fullName} numberOfLines={2}>
            {category.name}
          </Text>
        </View>
        <View style={styles.meta}>
          <View style={[styles.levelBadge, { backgroundColor: level.lightColor }]}>
            <Text style={[styles.levelText, { color: level.color }]}>{level.level}</Text>
          </View>
          <Text style={[styles.countText, !hasQuestions && styles.noQuestions]}>
            {hasQuestions ? `${questionCount} soal` : 'Belum ada soal'}
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerItem}>⏱ {category.defaultDuration} mnt</Text>
        <Text style={styles.footerItem}>📝 {category.defaultQuestions} soal</Text>
        <Text style={styles.footerItem}>✅ {category.passingScore}% lulus</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
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
    color: '#1E293B',
    marginBottom: 2,
  },
  fullName: {
    fontSize: 12,
    color: '#64748B',
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
    color: '#22C55E',
    fontWeight: '600',
  },
  noQuestions: {
    color: '#94A3B8',
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  footerItem: {
    fontSize: 11,
    color: '#94A3B8',
  },
});
