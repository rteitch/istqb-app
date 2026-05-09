import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmColor?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  visible,
  title,
  message,
  confirmText = 'OK',
  cancelText = 'Batal',
  confirmColor = '#3B82F6',
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const btnColor = destructive ? '#EF4444' : confirmColor;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.row}>
            <TouchableOpacity style={[styles.btn, styles.cancelBtn]} onPress={onCancel}>
              <Text style={styles.cancelText}>{cancelText}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, { backgroundColor: btnColor }]} onPress={onConfirm}>
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
    onConfirm?: () => void;
  }>({ visible: false, title: '', message: '' });

  const showAlert = (opts: {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    confirmColor?: string;
    destructive?: boolean;
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
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    width: '100%',
    padding: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 10,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  row: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  btn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelBtn: {
    backgroundColor: '#F1F5F9',
  },
  cancelText: {
    color: '#475569',
    fontSize: 16,
    fontWeight: '700',
  },
  confirmText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
});
