import React, { useRef, useEffect } from 'react';
import { Modal, View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions, SafeAreaView } from 'react-native';
import { colors } from '../app/theme';
import { useGameStore } from '../store/gameStore';
import { LinearGradient } from 'expo-linear-gradient';
import { X, LayoutGrid, Circle } from 'lucide-react-native';
import type { OverData, BallRecord } from '../store/gameStore';

const { width } = Dimensions.get('window');

const OversModal = ({ visible, onClose }: { visible: boolean; onClose: () => void }) => {
  const overs = useGameStore(state => state.oversData);
  const firstInningsOvers = useGameStore(state => state.firstInningsOversData);
  const currentInningsNumber = useGameStore(state => state.currentInningsNumber);

  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (visible && scrollRef.current) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [visible]);

  const renderOver = (over: OverData, i: number) => (
    <View key={i} style={styles.overCard}>
      <View style={styles.overHeader}>
        <Text style={styles.overNumberText}>Over {over.overNumber + 1}</Text>
        <LayoutGrid size={14} color={colors.textSecondary} />
      </View>
      <View style={styles.ballsGrid}>
        {over.deliveries.map((ball: BallRecord, idx: number) => {
          const isBoundary = ball.runs === 4 || ball.runs === 6;
          const ballStyles = [
            styles.ballCircle,
            ball.isWicket && styles.wicketBall,
            isBoundary && styles.boundaryBall,
            ball.isExtra && styles.extraBall,
          ];

          const displayText = ball.isExtra
            ? (ball.extraType === 'wide' ? 'wd' : ball.extraType === 'no-ball' ? 'nb' : ball.extraType === 'lb' ? 'lb' : 'b')
            : ball.isWicket
              ? 'W'
              : `${ball.runs}`;

          return (
            <View key={idx} style={styles.ballWrapper}>
              <View style={ballStyles}>
                <Text style={styles.ballText}>{displayText}</Text>
              </View>
              {ball.isExtra && ball.runs > 0 && (
                <Text style={styles.extraRunsText}>+{ball.runs}</Text>
              )}
              {ball.isWicket && ball.wicketType && (
                <Text style={styles.wicketTypeTag}>{ball.wicketType.substring(0, 3)}</Text>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <LinearGradient
          colors={[colors.background, '#0F172A']}
          style={styles.container}
        >
          <SafeAreaView style={styles.safeArea}>
            <View style={styles.header}>
              <View>
                <Text style={styles.headerTitle}>Over History</Text>
                <Text style={styles.headerSubtitle}>Ball-by-ball record</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <X color={colors.text} size={24} />
              </TouchableOpacity>
            </View>

            <ScrollView
              ref={scrollRef}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
            >
              {/* First Innings */}
              <View style={styles.sectionHeader}>
                <Circle size={8} color={colors.accent} fill={colors.accent} />
                <Text style={styles.sectionTitle}>First Innings</Text>
              </View>

              <View style={styles.inningsContainer}>
                {currentInningsNumber === 1 ? (
                  overs.length === 0 ? (
                    <Text style={styles.emptyText}>No data available yet...</Text>
                  ) : (
                    overs.map(renderOver)
                  )
                ) : (
                  firstInningsOvers.length === 0 ? (
                    <Text style={styles.emptyText}>No data recorded.</Text>
                  ) : (
                    firstInningsOvers.map(renderOver)
                  )
                )}
              </View>

              {/* Second Innings */}
              {(currentInningsNumber === 2 || overs.length > 0) && (
                <>
                  <View style={[styles.sectionHeader, { marginTop: 24 }]}>
                    <Circle size={8} color={colors.accentSecondary} fill={colors.accentSecondary} />
                    <Text style={styles.sectionTitle}>Second Innings</Text>
                  </View>
                  <View style={styles.inningsContainer}>
                    {currentInningsNumber === 1 ? (
                      <Text style={styles.emptyText}>Second innings not started.</Text>
                    ) : (
                      overs.length === 0 ? (
                        <Text style={styles.emptyText}>No data available yet...</Text>
                      ) : (
                        overs.map(renderOver)
                      )
                    )}
                  </View>
                </>
              )}
            </ScrollView>
          </SafeAreaView>
        </LinearGradient>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  container: {
    flex: 1,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    marginTop: 50,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.text,
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginTop: 2,
  },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  inningsContainer: {
    gap: 12,
  },
  overCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  overHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.03)',
  },
  overNumberText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  ballsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  ballWrapper: {
    alignItems: 'center',
    minWidth: 36,
  },
  ballCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.cardAlt,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  ballText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '800',
  },
  wicketBall: {
    backgroundColor: colors.accentWarn,
    borderColor: colors.accentWarn,
  },
  boundaryBall: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  extraBall: {
    backgroundColor: colors.accentPurple,
    borderColor: colors.accentPurple,
  },
  extraRunsText: {
    fontSize: 9,
    color: colors.accentYellow,
    fontWeight: '700',
    marginTop: 2,
  },
  wicketTypeTag: {
    fontSize: 9,
    color: colors.accentWarn,
    fontWeight: '700',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  emptyText: {
    color: colors.textSecondary,
    fontStyle: 'italic',
    fontSize: 13,
    paddingLeft: 4,
  },
});

export default OversModal;
