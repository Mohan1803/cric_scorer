import React, { useMemo } from 'react';
import { View, Text, StyleSheet, SectionList, TouchableOpacity, SafeAreaView } from 'react-native';
import { useGameStore } from '../store/gameStore';
import { colors, shadows } from './theme';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, MessageSquare, Zap, Target } from 'lucide-react-native';
import { useRouter } from 'expo-router';

interface CommentaryItem {
  id: string;
  over: number;
  ball: number;
  description: string;
  runs: number;
  isWicket: boolean;
  isExtra: boolean;
  extraType?: string;
  batsman: string;
  bowler: string;
}

export default function CommentaryPage() {
  const router = useRouter();
  const { ballHistory, currentInningsNumber, firstInningsBallHistory } = useGameStore();

  const processInnings = (history: any[]) => {
    let legalBallCount = 0;
    const items: CommentaryItem[] = [];

    history.forEach((ball, index) => {
      const isLegal = !ball.isExtra || (ball.extraType === 'bye' || ball.extraType === 'lb' || ball.extraType === 'penalty');
      if (isLegal) legalBallCount++;

      const overNum = Math.floor((legalBallCount - 1) / 6);
      const ballInOver = isLegal ? ((legalBallCount - 1) % 6) + 1 : (legalBallCount % 6);

      let desc = ball.commentary;
      if (!desc) {
        desc = `${ball.batsmanName} scores ${ball.runs} runs off ${ball.bowlerName}`;
        if (ball.isWicket) desc = `${ball.batsmanName} is OUT! ${ball.dismissalDetail || ''}`;
        if (ball.isExtra) {
          desc = `${ball.bowlerName} bowls a ${ball.extraType}. ${ball.runs > 0 ? ball.runs + ' runs taken' : ''}`;
        }
      }

      items.push({
        id: `ball_${index}`,
        over: overNum,
        ball: ballInOver,
        description: desc,
        runs: ball.runs,
        isWicket: ball.isWicket,
        isExtra: ball.isExtra,
        extraType: ball.extraType,
        batsman: ball.batsmanName,
        bowler: ball.bowlerName
      });
    });

    // Group by over and reverse for reverse chronological order
    const groups: { [key: number]: CommentaryItem[] } = {};
    items.forEach(item => {
      if (!groups[item.over]) groups[item.over] = [];
      groups[item.over].unshift(item); // Latest ball first in over
    });

    return Object.keys(groups)
      .map(over => ({
        title: `Over ${parseInt(over) + 1}`,
        data: groups[parseInt(over)]
      }))
      .reverse(); // Latest over at top
  };

  const sections = useMemo(() => {
    const currentInnings = processInnings(ballHistory);
    // If we want both innings, we can merge or use different headers. 
    // For now, let's show the current innings or both.
    if (currentInningsNumber === 2 && firstInningsBallHistory.length > 0) {
      const firstInnings = processInnings(firstInningsBallHistory);
      return [
        { title: '2nd Innings', data: [], isHeader: true },
        ...currentInnings,
        { title: '1st Innings', data: [], isHeader: true },
        ...firstInnings
      ];
    }
    return currentInnings;
  }, [ballHistory, firstInningsBallHistory, currentInningsNumber]);

  const renderItem = ({ item }: { item: any }) => {
    if (item.isHeader) {
      return (
        <LinearGradient
          colors={[colors.accent, colors.accentSecondary]}
          style={styles.inningsHeader}
        >
          <Text style={styles.inningsHeaderText}>{item.title}</Text>
        </LinearGradient>
      );
    }

    return (
      <View style={styles.ballCard}>
        <View style={styles.ballMeta}>
          <Text style={styles.ballNum}>{item.over}.{item.ball}</Text>
          <View style={[
            styles.runBadge,
            item.isWicket && styles.wicketBadge,
            (item.runs === 4 || item.runs === 6) && styles.boundaryBadge,
            item.isExtra && styles.extraBadge
          ]}>
            <Text style={styles.runText}>
              {item.isWicket ? 'W' : item.isExtra ? item.extraType?.substring(0, 2).toUpperCase() : item.runs}
            </Text>
          </View>
        </View>
        <View style={styles.ballContent}>
          <View style={styles.namesRow}>
            <Text style={styles.bowlerName}>{item.bowler}</Text>
            <Text style={styles.toText}>to</Text>
            <Text style={styles.batsmanName}>{item.batsman}</Text>
          </View>
          <Text style={styles.descriptionText}>{item.description}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ChevronLeft size={24} color={colors.accent} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <MessageSquare size={20} color={colors.accent} style={{ marginRight: 8 }} />
          <Text style={styles.headerTitle}>Commentary</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <SectionList
        sections={sections as any}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        renderSectionHeader={({ section: { title, data } }: any) => {
          if (data.length === 0) return null; // Innings header handled in renderItem
          return (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionHeaderText}>{title}</Text>
              <View style={styles.sectionDivider} />
            </View>
          );
        }}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Target size={48} color={colors.textSecondary} opacity={0.3} />
            <Text style={styles.emptyText}>No commentary available yet</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: 0.5,
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  inningsHeader: {
    marginVertical: 16,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    ...shadows.medium,
  },
  inningsHeaderText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 12,
    gap: 12,
  },
  sectionHeaderText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  sectionDivider: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  ballCard: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceDeeper,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.03)',
    ...shadows.small,
  },
  ballMeta: {
    alignItems: 'center',
    marginRight: 16,
    width: 44,
  },
  ballNum: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 6,
  },
  runBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  boundaryBadge: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  wicketBadge: {
    backgroundColor: colors.accentWarn,
    borderColor: colors.accentWarn,
  },
  extraBadge: {
    backgroundColor: colors.accentGold,
    borderColor: colors.accentGold,
  },
  runText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
  },
  ballContent: {
    flex: 1,
  },
  namesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  bowlerName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.accent,
  },
  toText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginHorizontal: 6,
    fontWeight: '500',
  },
  batsmanName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  descriptionText: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 16,
  },
});
