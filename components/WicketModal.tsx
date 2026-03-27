import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, Dimensions, ScrollView } from 'react-native';
import { colors } from '../app/theme';
import { Shield, User, X } from 'lucide-react-native';

const { width } = Dimensions.get('window');

interface WicketModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (wicketType: string, runOutBatsman?: string, runOutBatsmanId?: string, runOutRuns?: number, fielderName?: string, fielderId?: string) => void;
  strikerName: string;
  strikerId: string;
  nonStrikerName: string;
  nonStrikerId: string;
  outBatsmen: string[];
  fielders: { id: string, name: string }[];
  wicketKeeper?: { id: string, name: string };
}

export default function WicketModal({
  visible,
  onClose,
  onConfirm,
  strikerName,
  strikerId,
  nonStrikerName,
  nonStrikerId,
  outBatsmen,
  fielders,
  wicketKeeper
}: WicketModalProps) {
  const [wicketType, setWicketType] = useState('bowled');
  const [runOutBatsmanId, setRunOutBatsmanId] = useState(strikerId);
  const [runOutRuns, setRunOutRuns] = useState(0);
  const [selectedFielderId, setSelectedFielderId] = useState<string | null>(null);

  const handleConfirm = () => {
    let finalFielderName = fielders.find(f => f.id === selectedFielderId)?.name;
    let finalFielderId = selectedFielderId || undefined;

    if (wicketType === 'stumped' && wicketKeeper) {
      finalFielderName = wicketKeeper.name;
      finalFielderId = wicketKeeper.id;
    } else if (wicketType === 'caught-and-bowled') {
      finalFielderName = undefined;
      finalFielderId = undefined;
    }

    if (wicketType === 'run-out') {
      const name = runOutBatsmanId === strikerId ? strikerName : nonStrikerName;
      onConfirm(wicketType, name, runOutBatsmanId, runOutRuns, finalFielderName, finalFielderId);
    } else {
      onConfirm(wicketType, undefined, undefined, undefined, finalFielderName, finalFielderId);
    }
  };

  const wicketOptions = [
    { key: 0, label: 'Bowled' },
    { key: 1, label: 'Caught' },
    { key: 2, label: 'Stumped' },
    { key: 3, label: 'Run Out' },
    { key: 4, label: 'LBW' },
    { key: 5, label: 'Hit Wicket' },
    { key: 6, label: 'Caught & Bowled' },
  ];

  return (
    <Modal animationType="fade" transparent={true} visible={visible} onRequestClose={onClose}>
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          <View style={styles.modalHeader}>
            <View style={styles.iconCircle}>
              <Shield size={24} color={colors.accent} />
            </View>
            <Text style={styles.modalTitle}>Dismissal</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            <Text style={styles.sectionLabel}>How Out?</Text>
            <View style={styles.wicketTypeGrid}>
              {wicketOptions.map(option => {
                const value = option.label.toLowerCase().replace(/\s/g, '-');
                const selected = wicketType === value;
                return (
                  <TouchableOpacity
                    key={option.key}
                    style={[styles.wicketTypeBtn, selected && styles.wicketTypeBtnSelected]}
                    onPress={() => setWicketType(value)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.wicketTypeBtnText, selected && styles.wicketTypeBtnTextSelected]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {wicketType === 'run-out' && (
              <View style={styles.runOutSection}>
                <Text style={styles.sectionLabel}>Who got out?</Text>
                <View style={styles.batsmanSelectionRow}>
                  {[
                    { name: strikerName, id: strikerId, role: 'Striker' },
                    { name: nonStrikerName, id: nonStrikerId, role: 'Non-Striker' }
                  ].map((player, idx) => (
                    <TouchableOpacity
                      key={player.id}
                      style={[
                        styles.batsmanBtn,
                        runOutBatsmanId === player.id && styles.batsmanBtnSelected
                      ]}
                      onPress={() => setRunOutBatsmanId(player.id)}
                    >
                      <User size={18} color={runOutBatsmanId === player.id ? colors.textDark : colors.textSecondary} />
                      <Text style={[
                        styles.batsmanBtnText,
                        runOutBatsmanId === player.id && styles.batsmanBtnTextSelected
                      ]}>
                        {player.name}
                      </Text>
                      <Text style={styles.batsmanRoleText}>
                        {player.role}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.sectionLabel}>Runs Completed</Text>
                <View style={styles.runsGrid}>
                  {[0, 1, 2, 3].map((runs) => (
                    <TouchableOpacity
                      key={runs}
                      style={[
                        styles.runBtn,
                        runOutRuns === runs && styles.runBtnSelected,
                      ]}
                      onPress={() => setRunOutRuns(runs)}
                    >
                      <Text style={[
                        styles.runBtnText,
                        runOutRuns === runs && styles.runBtnTextSelected,
                      ]}>
                        {runs}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {(wicketType === 'caught' || wicketType === 'run-out') && (
              <View style={styles.fielderSection}>
                <Text style={styles.sectionLabel}>Fielder involved</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.fielderScroll}>
                  {fielders.map(fielder => (
                    <TouchableOpacity
                      key={fielder.id}
                      style={[
                        styles.fielderBtn,
                        selectedFielderId === fielder.id && styles.fielderBtnSelected
                      ]}
                      onPress={() => setSelectedFielderId(selectedFielderId === fielder.id ? null : fielder.id)}
                    >
                      <Text style={[
                        styles.fielderBtnText,
                        selectedFielderId === fielder.id && styles.fielderBtnTextSelected
                      ]}>
                        {fielder.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.cancelAction}
              onPress={onClose}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.confirmAction}
              onPress={handleConfirm}
            >
              <Text style={styles.confirmText}>Confirm Out</Text>
            </TouchableOpacity>
          </View>
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
    backgroundColor: 'rgba(0,0,0,0.85)',
  },
  modalView: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 16,
    width: width * 0.9,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    maxHeight: Dimensions.get('window').height * 0.8,
  },
  modalBody: {
    marginBottom: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    flex: 1,
  },
  closeBtn: {
    padding: 8,
  },
  sectionLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  wicketTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  wicketTypeBtn: {
    flexBasis: '31%',
    backgroundColor: colors.cardAlt,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  wicketTypeBtnSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  wicketTypeBtnText: {
    color: colors.textSecondary,
    fontWeight: '600',
    fontSize: 14,
  },
  wicketTypeBtnTextSelected: {
    color: colors.textDark,
    fontWeight: '700',
  },
  runOutSection: {
    marginBottom: 16,
  },
  batsmanSelectionRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  batsmanBtn: {
    flex: 1,
    backgroundColor: colors.cardAlt,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  batsmanBtnSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  batsmanBtnText: {
    color: colors.textSecondary,
    fontWeight: '700',
    fontSize: 14,
    marginTop: 8,
  },
  batsmanBtnTextSelected: {
    color: colors.textDark,
  },
  batsmanRoleText: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.4)',
    fontWeight: '600',
    marginTop: 2,
  },
  runsGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  runBtn: {
    flex: 1,
    backgroundColor: colors.cardAlt,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  runBtnSelected: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  runBtnText: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textSecondary,
  },
  runBtnTextSelected: {
    color: '#fff',
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelAction: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
  },
  cancelText: {
    color: colors.textSecondary,
    fontWeight: '700',
    fontSize: 16,
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
  confirmText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 16,
  },
  fielderSection: {
    marginBottom: 24,
  },
  fielderScroll: {
    flexDirection: 'row',
  },
  fielderBtn: {
    backgroundColor: colors.cardAlt,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  fielderBtnSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  fielderBtnText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  fielderBtnTextSelected: {
    color: colors.textDark,
    fontWeight: '700',
  },
});
