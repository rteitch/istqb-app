import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { ExamSessionData } from '../app/context/SessionContext';
import { getLevelByCategory } from '../constants/istqb';
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
  const levelInfo = getLevelByCategory(session.category);
  const levelColor = levelInfo?.color ?? '#1565C0';
  const isPassed = session.passed === 1;
  const score = Math.round(session.score_percent);
  const modeLabel = session.mode === 'practice' ? '📖 Latihan' : '⏱ Ujian';

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.levelDot, { backgroundColor: levelColor }]} />
        <Text style={styles.category} numberOfLines={1}>
          {session.category}
        </Text>
        <View style={[styles.statusBadge, isPassed ? styles.passedBg : styles.failedBg]}>
          <Text style={[styles.statusText, { color: isPassed ? '#15803D' : '#B91C1C' }]}>
            {isPassed ? 'LULUS' : 'GAGAL'}
          </Text>
        </View>
      </View>

      {/* Score bar */}
      <View style={styles.scoreRow}>
        <Text style={[styles.scoreNum, { color: isPassed ? '#22C55E' : '#EF4444' }]}>
          {score}%
        </Text>
        <View style={styles.barWrapper}>
          <ProgressBar value={score} color={isPassed ? '#22C55E' : '#EF4444'} height={6} />
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.meta}>{modeLabel}</Text>
        <Text style={styles.meta}>
          {session.correct_answers}/{session.total_questions} benar
        </Text>
        <Text style={styles.meta}>{formatDate(session.finished_at)}</Text>
        {onDelete && (
          <TouchableOpacity onPress={onDelete} style={styles.deleteBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <MaterialIcons name="delete-outline" size={16} color="#EF4444" />
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
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
    color: '#1E293B',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
  },
  passedBg: { backgroundColor: '#DCFCE7' },
  failedBg: { backgroundColor: '#FEE2E2' },
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
    borderTopColor: '#F1F5F9',
    paddingTop: 10,
  },
  meta: {
    fontSize: 11,
    color: '#94A3B8',
  },
  deleteBtn: {
    padding: 2,
  },
});
