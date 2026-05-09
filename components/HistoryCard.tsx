import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { ExamSessionData } from '../context/SessionContext';
import { useBankTypes } from '../context/BankTypeContext';
import { useTheme } from '../context/ThemeContext';
import ProgressBar from './ProgressBar';

interface HistoryCardProps {
  session: ExamSessionData;
  onPress: () => void;
  onDelete?: () => void;
}

const formatDate = (dateStr: string) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default function HistoryCard({ session, onPress, onDelete }: HistoryCardProps) {
  const { getLevelByCategory } = useBankTypes();
  const { colors } = useTheme();
  const levelInfo = getLevelByCategory(session.category);
  const levelColor = levelInfo?.color ?? colors.primary;
  const isPassed = session.passed === 1;
  const score = Math.round(session.score_percent);
  const modeLabel = session.mode === 'practice' ? '📖 Latihan' : '⏱ Ujian';

  return (
    <TouchableOpacity style={[styles.card, { backgroundColor: colors.card }]} onPress={onPress} activeOpacity={0.85}>
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.levelDot, { backgroundColor: levelColor }]} />
        <Text style={[styles.category, { color: colors.text }]} numberOfLines={1}>
          {session.category}
        </Text>
        <View style={[styles.statusBadge, { backgroundColor: isPassed ? colors.successBg : colors.dangerBg }]}>
          <Text style={[styles.statusText, { color: isPassed ? colors.successText : colors.dangerText }]}>
            {isPassed ? 'LULUS' : 'GAGAL'}
          </Text>
        </View>
      </View>

      {/* Score bar */}
      <View style={styles.scoreRow}>
        <Text style={[styles.scoreNum, { color: isPassed ? colors.success : colors.danger }]}>
          {score}%
        </Text>
        <View style={styles.barWrapper}>
          <ProgressBar value={score} color={isPassed ? colors.success : colors.danger} height={6} />
        </View>
      </View>

      {/* Footer */}
      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        <Text style={[styles.meta, { color: colors.textMuted }]}>{modeLabel}</Text>
        <Text style={[styles.meta, { color: colors.textMuted }]}>
          {session.correct_answers}/{session.total_questions} benar
        </Text>
        <Text style={[styles.meta, { color: colors.textMuted }]}>{formatDate(session.finished_at)}</Text>
        {onDelete && (
          <TouchableOpacity onPress={onDelete} style={styles.deleteBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <MaterialIcons name="delete-outline" size={16} color={colors.danger} />
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 5,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  levelDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  category: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  scoreNum: {
    fontSize: 22,
    fontWeight: '800',
    minWidth: 48,
  },
  barWrapper: {
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    paddingTop: 10,
  },
  meta: {
    fontSize: 11,
  },
  deleteBtn: {
    padding: 2,
  },
});
