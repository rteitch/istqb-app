import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';

type QuizMode = 'exam' | 'practice';

interface ModeSelectorProps {
  value: QuizMode;
  onChange: (mode: QuizMode) => void;
}

export default function ModeSelector({ value, onChange }: ModeSelectorProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.btn,
          { borderColor: colors.border, backgroundColor: colors.background },
          value === 'practice' && { borderColor: colors.success, backgroundColor: colors.successBg },
        ]}
        onPress={() => onChange('practice')}
        activeOpacity={0.8}
      >
        <Text style={styles.icon}>📖</Text>
        <Text style={[styles.label, { color: colors.textMuted }, value === 'practice' && { color: colors.text }]}>
          Latihan
        </Text>
        <Text style={[styles.sub, { color: colors.textMuted }, value === 'practice' && { color: colors.textSecondary }]}>
          Feedback langsung
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.btn,
          { borderColor: colors.border, backgroundColor: colors.background },
          value === 'exam' && { borderColor: colors.primary, backgroundColor: colors.selected },
        ]}
        onPress={() => onChange('exam')}
        activeOpacity={0.8}
      >
        <Text style={styles.icon}>⏱️</Text>
        <Text style={[styles.label, { color: colors.textMuted }, value === 'exam' && { color: colors.text }]}>
          Ujian
        </Text>
        <Text style={[styles.sub, { color: colors.textMuted }, value === 'exam' && { color: colors.textSecondary }]}>
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
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  icon: {
    fontSize: 24,
    marginBottom: 6,
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
  },
  sub: {
    fontSize: 11,
    marginTop: 2,
    textAlign: 'center',
  },
});
