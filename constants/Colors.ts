export const Colors = {
  light: {
    background: '#F8FAFC',
    card: '#FFFFFF',
    text: '#1E293B',
    textSecondary: '#64748B',
    textMuted: '#6B7280',           // Fixed: was #94A3B8 (2.5:1), now ~4.6:1 WCAG AA
    primary: '#1565C0',
    primaryHover: '#1E40AF',
    primaryForeground: '#FFFFFF',
    border: '#E2E8F0',
    // Quiz selection states
    selected: '#EEF2FF',
    selectedBorder: '#1565C0',
    selectedText: '#1E40AF',
    // Feedback states
    success: '#22C55E',
    successBg: '#DCFCE7',
    successText: '#15803D',
    danger: '#EF4444',
    dangerBg: '#FEE2E2',
    dangerText: '#B91C1C',
    warning: '#F59E0B',
    warningBg: '#FEF3C7',
    // Info / explanation
    info: '#0EA5E9',
    infoBg: '#F0F9FF',
    // Accent
    purple: '#8B5CF6',
    streak: '#8B5CF6',
    streakBg: '#F3E8FF',
    overlay: 'rgba(0,0,0,0.5)',
  },
  dark: {
    background: '#0F172A',
    card: '#1E293B',
    text: '#F8FAFC',
    textSecondary: '#94A3B8',
    textMuted: '#64748B',
    primary: '#3B82F6',
    primaryHover: '#60A5FA',
    primaryForeground: '#FFFFFF',
    border: '#334155',
    // Quiz selection states
    selected: '#1E3A5F',
    selectedBorder: '#60A5FA',
    selectedText: '#93C5FD',
    // Feedback states
    success: '#22C55E',
    successBg: 'rgba(34, 197, 94, 0.2)',
    successText: '#4ADE80',
    danger: '#EF4444',
    dangerBg: 'rgba(239, 68, 68, 0.2)',
    dangerText: '#F87171',
    warning: '#FBBF24',
    warningBg: 'rgba(251, 191, 36, 0.15)',
    // Info / explanation
    info: '#38BDF8',
    infoBg: 'rgba(14, 165, 233, 0.1)',
    // Accent
    purple: '#A78BFA',
    streak: '#A78BFA',
    streakBg: 'rgba(139, 92, 246, 0.15)',
    overlay: 'rgba(0,0,0,0.7)',
  },
};

export type ThemeColors = typeof Colors.light;
