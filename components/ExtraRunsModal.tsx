import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { colors, shadows } from '../app/theme';

interface ExtraRunsModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectRuns: (runs: number) => void;
  extraType: string
}

export default function ExtraRunsModal({ visible, onClose, onSelectRuns, extraType }: ExtraRunsModalProps) {
  const [selected, setSelected] = useState<number | null>(null);
  let runsArr: number[] = extraType === 'no-ball' ? [0, 1, 2, 3, 4, 5, 6] : [0, 1, 2, 3, 4];

  const handleSelect = (runs: number) => {
    setSelected(runs);
    setTimeout(() => onSelectRuns(runs), 120);
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          <Text style={styles.modalTitle}>Select Runs</Text>
          <View style={styles.runsContainer}>
            {runsArr.map((runs) => (
              <TouchableOpacity
                key={runs}
                style={[styles.runButton, selected === runs && styles.selectedButton]}
                onPress={() => handleSelect(runs)}
                activeOpacity={0.8}
              >
                <Text style={[styles.runButtonText, selected === runs && styles.selectedButtonText]}>{runs}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
          >
            <Text style={styles.closeButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(2, 6, 23, 0.9)', // Obsidian overlay
  },
  overCard: {
    backgroundColor: colors.surfaceDeeper,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalView: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 24,
    width: '85%',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.large,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 18,
    color: colors.accent,
    letterSpacing: 1.1,
  },
  runsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 12,
  },
  runButton: {
    backgroundColor: colors.surface,
    paddingVertical: 16,
    paddingHorizontal: 0,
    borderRadius: 12,
    width: 58,
    alignItems: 'center',
    margin: 6,
    borderWidth: 2,
    borderColor: colors.border,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  confirmAction: {
    flex: 2,
    backgroundColor: colors.accent,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    elevation: 4,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  selectedButton: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
    shadowColor: colors.accent,
    shadowOpacity: 0.22,
  },
  runButtonText: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  selectedButtonText: {
    color: colors.textDark,
  },
  closeButton: {
    marginTop: 18,
    padding: 10,
    alignSelf: 'center',
  },
  closeButtonText: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.8,
  },
});