import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface ScoreRingProps {
  score: number;      // 0–100
  size?: number;
  isPassed?: boolean;
}

export default function ScoreRing({ score, size = 120, isPassed }: ScoreRingProps) {
  const clamped = Math.min(100, Math.max(0, score));
  const color = isPassed !== undefined
    ? (isPassed ? '#22C55E' : '#EF4444')
    : clamped >= 65 ? '#22C55E' : '#EF4444';

  const fontSize = size * 0.28;
  const subFontSize = size * 0.12;

  return (
    <View
      style={[
        styles.ring,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderColor: color,
          borderWidth: size * 0.055,
        },
      ]}
    >
      <Text style={[styles.score, { fontSize, color }]}>
        {Math.round(clamped)}%
      </Text>
      <Text style={[styles.label, { fontSize: subFontSize }]}>
        {isPassed === undefined
          ? clamped >= 65 ? 'LULUS' : 'GAGAL'
          : isPassed ? 'LULUS' : 'GAGAL'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  ring: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  score: {
    fontWeight: '800',
    lineHeight: undefined,
  },
  label: {
    fontWeight: '700',
    color: '#64748B',
    marginTop: 2,
  },
});
