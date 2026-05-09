import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';

interface ProgressBarProps {
  value: number;   // 0–100
  color?: string;
  height?: number;
  showLabel?: boolean;
}

export default function ProgressBar({
  value,
  color,
  height = 8,
  showLabel = false,
}: ProgressBarProps) {
  const { colors } = useTheme();
  const clamped = Math.min(100, Math.max(0, value));
  const activeColor = color || colors.primary;

  return (
    <View style={styles.wrapper}>
      <View style={[styles.track, { backgroundColor: colors.border, height }]}>
        {clamped > 0 && (
          <LinearGradient
            colors={[activeColor, activeColor + 'DD']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[
              styles.fill,
              { width: `${clamped}%`, height },
            ]}
          />
        )}
      </View>
      {showLabel && (
        <Text style={[styles.label, { color: activeColor }]}>{Math.round(clamped)}%</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  track: {
    flex: 1,
    borderRadius: 99,
    overflow: 'hidden',
  },
  fill: {
    borderRadius: 99,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    minWidth: 36,
    textAlign: 'right',
  },
});
