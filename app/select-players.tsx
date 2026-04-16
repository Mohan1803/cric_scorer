import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, Dimensions } from 'react-native';
import { router, Stack } from 'expo-router';
import { useGameStore } from '../store/gameStore';
import { colors } from './theme';
import { User, Shield, Target, ChevronRight, CheckCircle2, Circle, ChevronLeft } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { BackHandler } from 'react-native';
import { useCallback } from 'react';

const { width } = Dimensions.get('window');

export default function SelectPlayersScreen() {
  const teams = useGameStore((state) => state.teams);
  const battingTeam = useGameStore((state) => state.battingTeam);
  const bowlingTeam = useGameStore((state) => state.bowlingTeam);
  const setStriker = useGameStore((state) => state.setStriker);
  const setNonStriker = useGameStore((state) => state.setNonStriker);
  const setCurrentBowler = useGameStore((state) => state.setCurrentBowler);
  const currentInningsNumber = useGameStore((state) => state.currentInningsNumber);

  const battingTeamObj = teams.find(team => team.name === battingTeam);
  const bowlingTeamObj = teams.find(team => team.name === bowlingTeam);

  const [selectedStrikerId, setSelectedStrikerId] = useState<string | null>(null);
  const [selectedNonStrikerId, setSelectedNonStrikerId] = useState<string | null>(null);
  const [selectedBowlerId, setSelectedBowlerId] = useState<string | null>(null);
  const [roleTab, setRoleTab] = useState<'striker' | 'nonStriker' | 'bowler'>('striker');
  const navigation = useNavigation();
  const isProceeding = React.useRef(false);

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      // If we are legitimately proceeding to the match, don't block
      if (isProceeding.current) {
        return;
      }

      // Prevent default behavior of leaving the screen
      e.preventDefault();

      // Prompt the user before leaving
      Alert.alert(
        'Exit Setup',
        'Do you want to close the current match setup? Your progress will be saved.',
        [
          { text: 'Cancel', style: 'cancel', onPress: () => { } },
          {
            text: 'OK',
            style: 'destructive',
            onPress: () => {
              navigation.dispatch(e.data.action);
            },
          },
        ]
      );
    });

    return unsubscribe;
  }, [navigation]);

  const handleBack = useCallback(() => {
    // Manually trigger the removal which will hit the listener
    navigation.goBack();
    return true;
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => true);
      return () => subscription.remove();
    }, [])
  );

  useEffect(() => {
    setSelectedStrikerId(null);
    setSelectedNonStrikerId(null);
    setSelectedBowlerId(null);
    setRoleTab('striker');
  }, [currentInningsNumber, battingTeam, bowlingTeam]);

  const handleSelect = (playerId: string) => {
    if (roleTab === 'striker') {
      if (playerId === selectedNonStrikerId) {
        Alert.alert('Selection Error', 'This player is already selected as Non-Striker');
        return;
      }
      setSelectedStrikerId(playerId);
      setTimeout(() => setRoleTab('nonStriker'), 200);
    } else if (roleTab === 'nonStriker') {
      if (playerId === selectedStrikerId) {
        Alert.alert('Selection Error', 'This player is already selected as Striker');
        return;
      }
      setSelectedNonStrikerId(playerId);
      setTimeout(() => setRoleTab('bowler'), 200);
    } else {
      setSelectedBowlerId(playerId);
    }
  };

  const handleContinue = () => {
    if (!selectedStrikerId || !selectedNonStrikerId || !selectedBowlerId) {
      Alert.alert('Incomplete Selection', 'Please select a Striker, Non-Striker, and Bowler to continue.');
      return;
    }
    const striker = battingTeamObj?.players.find(p => p.id === selectedStrikerId);
    const nonStriker = battingTeamObj?.players.find(p => p.id === selectedNonStrikerId);
    const bowler = bowlingTeamObj?.players.find(p => p.id === selectedBowlerId);

    if (striker && nonStriker && bowler) {
      console.log('Starting match with:', striker.name, nonStriker.name, bowler.name);
      isProceeding.current = true;
      setStriker(striker);
      setNonStriker(nonStriker);
      setCurrentBowler(bowler);

      // Small timeout to ensure state/ref propagates before navigation on some high-load devices
      setTimeout(() => {
        router.replace('/scorecard');
      }, 50);
    } else {
      console.error('Failed to find player objects for IDs:', { selectedStrikerId, selectedNonStrikerId, selectedBowlerId });
      Alert.alert('Selection Error', 'Could not find the selected players. Please try re-selecting them.');
    }
  };

  const StepIndicator = () => (
    <View style={styles.stepContainer}>
      {[
        { id: 'striker', label: 'Striker', icon: Target },
        { id: 'nonStriker', label: 'Non-Striker', icon: Shield },
        { id: 'bowler', label: 'Bowler', icon: User }
      ].map((step, idx) => {
        const isActive = roleTab === step.id;
        const isCompleted = (step.id === 'striker' && selectedStrikerId) ||
          (step.id === 'nonStriker' && selectedNonStrikerId) ||
          (step.id === 'bowler' && selectedBowlerId);

        return (
          <View key={step.id} style={styles.stepItem}>
            <TouchableOpacity
              onPress={() => setRoleTab(step.id as any)}
              style={[styles.stepCircle, isActive && styles.stepCircleActive]}
            >
              {isCompleted ? (
                <CheckCircle2 size={24} color={colors.accent} />
              ) : (
                <step.icon size={20} color={isActive ? colors.accent : colors.textSecondary} />
              )}
            </TouchableOpacity>
            <Text style={[styles.stepLabel, isActive && styles.stepLabelActive]}>{step.label}</Text>
            {idx < 2 && <View style={styles.stepConnector} />}
          </View>
        );
      })}
    </View>
  );

  const SelectionSummary = () => (
    <View style={styles.summaryBar}>
      <View style={styles.summaryItem}>
        <Text style={styles.summaryLabel}>Batting</Text>
        <Text style={styles.summaryValue} numberOfLines={1}>
          {(battingTeamObj?.players.find(p => p.id === selectedStrikerId)?.name || '?')} & {(battingTeamObj?.players.find(p => p.id === selectedNonStrikerId)?.name || '?')}
        </Text>
      </View>
      <View style={styles.summaryDivider} />
      <View style={styles.summaryItem}>
        <Text style={styles.summaryLabel}>Bowling</Text>
        <Text style={styles.summaryValue} numberOfLines={1}>
          {bowlingTeamObj?.players.find(p => p.id === selectedBowlerId)?.name || '?'}
        </Text>
      </View>
    </View>
  );

  const playersToDisplay = roleTab === 'bowler' ? bowlingTeamObj?.players : battingTeamObj?.players;
  const currentSelectionId = roleTab === 'striker' ? selectedStrikerId : (roleTab === 'nonStriker' ? selectedNonStrikerId : selectedBowlerId);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={styles.topHeader}>
        <TouchableOpacity
          style={styles.headerBackButton}
          onPress={handleBack}
        >
          <ChevronLeft color={colors.accent} size={28} />
          <Text style={styles.headerBackText}>Back</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.container}>
        <Stack.Screen options={{ gestureEnabled: false, headerShown: false }} />
        <View style={styles.topInfo}>
          <Text style={styles.subtitle}>
            {roleTab === 'bowler' ? `Bowling: ${bowlingTeam}` : `Batting: ${battingTeam}`}
          </Text>
        </View>

        <StepIndicator />

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.grid}>
            {playersToDisplay?.map((player, index) => {
              const isSelected = currentSelectionId === player.id;
              const isDisabled = (roleTab === 'striker' && player.id === selectedNonStrikerId) ||
                (roleTab === 'nonStriker' && player.id === selectedStrikerId) ||
                (roleTab === 'bowler' && player.isWicketKeeper);

              return (
                <TouchableOpacity
                  key={player.id}
                  activeOpacity={0.7}
                  onPress={() => handleSelect(player.id)}
                  style={[
                    styles.playerCard,
                    isSelected && styles.playerCardSelected,
                    isDisabled && styles.playerCardDisabled
                  ]}
                  disabled={isDisabled}
                >
                  <View style={[styles.avatar, isSelected && styles.avatarSelected]}>
                    {isSelected ? (
                      <CheckCircle2 size={24} color="#fff" />
                    ) : (
                      <User size={28} color={isDisabled && roleTab === 'bowler' ? colors.disabled : colors.textSecondary} />
                    )}
                  </View>
                  {player.isWicketKeeper ? (
                    <View style={[styles.xiBadge, { backgroundColor: 'rgba(234, 179, 8, 0.1)', borderColor: 'rgba(234, 179, 8, 0.3)' }]}>
                      <Text style={[styles.xiBadgeText, { color: colors.accentSecondary }]}>WK</Text>
                    </View>
                  ) : player.isReserve ? (
                    <View style={styles.subBadge}>
                      <Text style={styles.subBadgeText}>SUB</Text>
                    </View>
                  ) : (
                    <View style={styles.xiBadge}>
                      <Text style={styles.xiBadgeText}>XI</Text>
                    </View>
                  )}
                  <Text style={[styles.playerName, isSelected && styles.playerNameSelected]} numberOfLines={1}>
                    {player.name}
                  </Text>

                  {roleTab !== 'bowler' && (
                    <View style={styles.handBadge}>
                      <Text style={styles.handBadgeText}>
                        {(player as any).battingHand?.toUpperCase() === 'LEFT' ? 'LH' : 'RH'}
                      </Text>
                    </View>
                  )}
                  {roleTab === 'bowler' && (
                    <Text style={[styles.oversText, player.isWicketKeeper && { color: colors.accentWarn }]}>
                      {player.isWicketKeeper ? 'WK - Cannot Bowl' : `${Math.floor(player.ballsBowled / 6)}.${player.ballsBowled % 6} Overs`}
                    </Text>
                  )}
                  {isSelected && (
                    <View style={styles.selectedBadge}>
                      <Text style={styles.selectedBadgeText}>SELECTED</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </View>

      <View style={styles.footer}>
        <SelectionSummary />

        <TouchableOpacity
          style={[styles.continueButton, (!selectedStrikerId || !selectedNonStrikerId || !selectedBowlerId) && styles.continueButtonDisabled]}
          onPress={handleContinue}
        >
          <Text style={styles.continueButtonText}>
            {!selectedStrikerId ? 'Select Striker' :
              !selectedNonStrikerId ? 'Select Non-Striker' :
                !selectedBowlerId ? 'Select Bowler' : 'Start Match'}
          </Text>
          <ChevronRight size={24} color={colors.textDark} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.background,
  },
  headerBackButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerBackText: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 4,
  },
  topInfo: {
    paddingTop: 10,
    paddingBottom: 10,
    alignItems: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: colors.accent,
    fontWeight: '600',
    marginTop: 5,
    textTransform: 'uppercase',
  },
  stepContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 10,
  },
  stepItem: {
    alignItems: 'center',
    width: (width - 40) / 3,
  },
  stepCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.cardAlt,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border,
    zIndex: 1,
  },
  stepCircleActive: {
    borderColor: colors.accent,
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
  },
  stepLabel: {
    marginTop: 8,
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  stepLabelActive: {
    color: colors.accent,
    fontWeight: '700',
  },
  stepConnector: {
    position: 'absolute',
    top: 24,
    right: -width / 6,
    width: width / 3,
    height: 2,
    backgroundColor: colors.border,
    zIndex: 0,
  },
  scrollContent: {
    paddingHorizontal: 15,
    paddingBottom: 200,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  playerCard: {
    width: (width - 45) / 2,
    backgroundColor: colors.surface,
    padding: 15,
    borderRadius: 16,
    marginBottom: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  playerCardSelected: {
    borderColor: colors.accent,
    backgroundColor: 'rgba(6, 182, 212, 0.05)',
  },
  playerCardDisabled: {
    opacity: 0.4,
    backgroundColor: colors.cardAlt,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.cardAlt,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatarSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  playerName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  playerNameSelected: {
    color: colors.accent,
  },
  oversText: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
    fontWeight: '600',
  },
  selectedBadge: {
    marginTop: 8,
    backgroundColor: colors.accent,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  selectedBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.textDark,
  },
  xiBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(225, 26, 34, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(225, 26, 34, 0.3)',
  },
  xiBadgeText: {
    fontSize: 8,
    fontWeight: '900',
    color: colors.accent,
  },
  subBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(148, 163, 184, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.2)',
  },
  subBadgeText: {
    fontSize: 8,
    fontWeight: '900',
    color: colors.textSecondary,
  },
  handBadge: {
    marginTop: 4,
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  handBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.accent,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    padding: 20,
    paddingBottom: 40,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
  },
  summaryBar: {
    flexDirection: 'row',
    backgroundColor: colors.cardAlt,
    borderRadius: 15,
    padding: 12,
    marginBottom: 15,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryDivider: {
    width: 1,
    backgroundColor: colors.border,
    marginVertical: 4,
  },
  summaryLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    fontWeight: '700',
    marginBottom: 2,
  },
  summaryValue: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '700',
  },
  continueButton: {
    backgroundColor: colors.accent,
    flexDirection: 'row',
    height: 60,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
  },
  continueButtonDisabled: {
    backgroundColor: colors.disabled,
    opacity: 0.7,
  },
  continueButtonText: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textDark,
    marginRight: 8,
  },
});