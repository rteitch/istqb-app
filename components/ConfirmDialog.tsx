import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, TextInput } from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmColor?: string;
  destructive?: boolean;
  requireInput?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  visible,
  title,
  message,
  confirmText = 'OK',
  cancelText = 'Batal',
  confirmColor,
  destructive = false,
  requireInput,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const { colors } = useTheme();
  const [inputText, setInputText] = React.useState('');
  const btnColor = destructive ? colors.danger : (confirmColor ?? colors.primary);
  const isConfirmDisabled = requireInput ? inputText !== requireInput : false;

  // Reset input when modal opens
  React.useEffect(() => {
    if (visible) setInputText('');
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>

          {requireInput && (
            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Ketik "{requireInput}" untuk konfirmasi:</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
                value={inputText}
                onChangeText={setInputText}
                placeholder={requireInput}
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
              />
            </View>
          )}

          <View style={styles.row}>
            <TouchableOpacity style={[styles.btn, { backgroundColor: colors.background }]} onPress={onCancel}>
              <Text style={[styles.cancelText, { color: colors.textSecondary }]}>{cancelText}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: btnColor }, isConfirmDisabled && styles.btnDisabled]}
              onPress={onConfirm}
              disabled={isConfirmDisabled}
            >
              <Text style={styles.confirmText}>{confirmText}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// Helper hook untuk mempermudah penggunaan
export function useConfirmDialog() {
  const [state, setState] = React.useState<{
    visible: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    confirmColor?: string;
    destructive?: boolean;
    requireInput?: string;
    onConfirm?: () => void;
  }>({ visible: false, title: '', message: '' });

  const showAlert = (opts: {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    confirmColor?: string;
    destructive?: boolean;
    requireInput?: string;
    onConfirm?: () => void;
  }) => {
    setState({ ...opts, visible: true });
  };

  const showConfirm = (opts: {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    confirmColor?: string;
    destructive?: boolean;
    requireInput?: string;
    onConfirm: () => void;
  }) => {
    setState({ ...opts, visible: true });
  };

  const hide = () => setState((s) => ({ ...s, visible: false }));

  const Dialog = (
    <ConfirmDialog
      visible={state.visible}
      title={state.title}
      message={state.message}
      confirmText={state.confirmText}
      cancelText={state.cancelText}
      confirmColor={state.confirmColor}
      destructive={state.destructive}
      requireInput={state.requireInput}
      onConfirm={() => {
        hide();
        state.onConfirm?.();
      }}
      onCancel={hide}
    />
  );

  return { showAlert, showConfirm, Dialog };
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    borderRadius: 16,
    width: '100%',
    padding: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 10,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  row: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  inputContainer: {
    width: '100%',
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1.5,
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
  },
  btn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  btnDisabled: {
    opacity: 0.5,
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '700',
  },
  confirmText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
});
