import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import ModalSelector from 'react-native-modal-selector';

interface WicketModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (wicketType: string, runOutBatsman?: string, runOutRuns?: number) => void;
  strikerName: string;
  nonStrikerName: string;
  outBatsmen: string[];
}

export default function WicketModal({
  visible,
  onClose,
  onConfirm,
  strikerName,
  nonStrikerName,
  outBatsmen
}: WicketModalProps) {
  const [wicketType, setWicketType] = useState('bowled');
  const [runOutBatsman, setRunOutBatsman] = useState(strikerName);
  const [runOutRuns, setRunOutRuns] = useState(0);

  const handleConfirm = () => {
    if (wicketType === 'run-out') {
      onConfirm(wicketType, runOutBatsman, runOutRuns);
    } else {
      onConfirm(wicketType);
    }
  };

  const wicketOptions = [
    { key: 0, label: 'Bowled' },
    { key: 1, label: 'Caught' },
    { key: 2, label: 'Stumped' },
    { key: 3, label: 'Run Out' },
    { key: 4, label: 'LBW' },
    { key: 5, label: 'Hit Wicket' },
  ];

  const runOutOptions = [
    { key: 0, label: strikerName },
    { key: 1, label: nonStrikerName },
  ].filter(option => !outBatsmen.includes(option.label));

  return (
    <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          <Text style={styles.modalTitle}>How Out?</Text>

          <View style={styles.wicketTypeRow}>
            {wicketOptions.map(option => {
              const value = option.label.toLowerCase().replace(' ', '-');
              const selected = wicketType === value;
              return (
                <TouchableOpacity
                  key={option.key}
                  style={[styles.wicketTypeButton, selected && styles.wicketTypeButtonSelected]}
                  onPress={() => setWicketType(value)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.wicketTypeButtonText, selected && styles.wicketTypeButtonTextSelected]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {wicketType === 'run-out' && (
            <>
              <Text style={styles.label}>Which batsman?</Text>
              <ModalSelector
                data={runOutOptions}
                initValue="Select Batsman"
                onChange={(option) => setRunOutBatsman(option.label)}
                selectStyle={styles.selector}
                selectTextStyle={styles.selectorText}
                optionContainerStyle={styles.optionContainer}
                optionTextStyle={styles.optionText}
                cancelStyle={styles.cancelButton}
                cancelTextStyle={styles.cancelText}
              />

              <Text style={styles.label}>Runs completed</Text>
              <View style={styles.runsContainer}>
                {[0, 1, 2, 3].map((runs) => (
                  <TouchableOpacity
                    key={runs}
                    style={[
                      styles.runButton,
                      runOutRuns === runs && styles.selectedRun,
                    ]}
                    onPress={() => setRunOutRuns(runs)}
                  >
                    <Text
                      style={[
                        styles.runButtonText,
                        runOutRuns === runs && { color: '#fff' },
                      ]}
                    >
                      {runs}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.confirmButton]}
              onPress={handleConfirm}
            >
              <Text style={styles.buttonText}>Confirm</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.cancelButtonMain]}
              onPress={onClose}
            >
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wicketTypeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 18,
    gap: 10,
  },
  wicketTypeButton: {
    backgroundColor: '#f0f0f0',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginHorizontal: 4,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: '#2196F3',
  },
  wicketTypeButtonSelected: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  wicketTypeButtonText: {
    color: '#333',
    fontWeight: 'bold',
    fontSize: 15,
  },
  wicketTypeButtonTextSelected: {
    color: '#fff',
  },
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalView: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    width: '90%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  selector: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#2196F3',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  selectorText: {
    color: '#2196F3',
    fontWeight: 'bold',
  },
  optionContainer: {
    backgroundColor: '#fff',
  },
  optionText: {
    color: '#333',
    fontSize: 16,
  },
  cancelButton: {
    backgroundColor: '#eee',
    padding: 10,
  },
  cancelText: {
    color: '#F44336',
    fontWeight: 'bold',
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    alignSelf: 'flex-start',
    color: '#333',
  },
  runsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 20,
  },
  runButton: {
    backgroundColor: '#f0f0f0',
    padding: 15,
    borderRadius: 10,
    width: 50,
    alignItems: 'center',
  },
  selectedRun: {
    backgroundColor: '#2196F3',
  },
  runButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 20,
  },
  button: {
    padding: 15,
    borderRadius: 10,
    minWidth: 100,
    alignItems: 'center',
  },
  confirmButton: {
    backgroundColor: '#4CAF50',
  },
  cancelButtonMain: {
    backgroundColor: '#f44336',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
