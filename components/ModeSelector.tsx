import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

type QuizMode = 'exam' | 'practice';

interface ModeSelectorProps {
  value: QuizMode;
  onChange: (mode: QuizMode) => void;
}

export default function ModeSelector({ value, onChange }: ModeSelectorProps) {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.btn, value === 'practice' && styles.btnActivePractice]}
        onPress={() => onChange('practice')}
        activeOpacity={0.8}
      >
        <Text style={styles.icon}>📖</Text>
        <Text style={[styles.label, value === 'practice' && styles.labelActive]}>
          Latihan
        </Text>
        <Text style={[styles.sub, value === 'practice' && styles.subActive]}>
          Feedback langsung
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.btn, value === 'exam' && styles.btnActiveExam]}
        onPress={() => onChange('exam')}
        activeOpacity={0.8}
      >
        <Text style={styles.icon}>⏱️</Text>
        <Text style={[styles.label, value === 'exam' && styles.labelActive]}>
          Ujian
        </Text>
        <Text style={[styles.sub, value === 'exam' && styles.subActive]}>
          Ada timer + submit
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 12,
  },
  btn: {
    flex: 1,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  btnActivePractice: {
    borderColor: '#22C55E',
    backgroundColor: '#F0FDF4',
  },
  btnActiveExam: {
    borderColor: '#3B82F6',
    backgroundColor: '#EFF6FF',
  },
  icon: {
    fontSize: 24,
    marginBottom: 6,
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
    color: '#94A3B8',
  },
  labelActive: {
    color: '#1E293B',
  },
  sub: {
    fontSize: 11,
    color: '#CBD5E1',
    marginTop: 2,
    textAlign: 'center',
  },
  subActive: {
    color: '#64748B',
  },
});
