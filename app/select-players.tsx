import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, Dimensions } from 'react-native';
import { router } from 'expo-router';
import { useGameStore } from '../store/gameStore';
import { colors } from './theme';
import { User, Shield, Target, ChevronRight, CheckCircle2, Circle } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

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

  const [selectedStriker, setSelectedStriker] = useState<string | null>(null);
  const [selectedNonStriker, setSelectedNonStriker] = useState<string | null>(null);
  const [selectedBowler, setSelectedBowler] = useState<string | null>(null);
  const [roleTab, setRoleTab] = useState<'striker' | 'nonStriker' | 'bowler'>('striker');

  useEffect(() => {
    setSelectedStriker(null);
    setSelectedNonStriker(null);
    setSelectedBowler(null);
    setRoleTab('striker');
  }, [currentInningsNumber, battingTeam, bowlingTeam]);

  const handleSelect = (playerName: string) => {
    if (roleTab === 'striker') {
      if (playerName === selectedNonStriker) {
        Alert.alert('Selection Error', 'This player is already selected as Non-Striker');
        return;
      }
      setSelectedStriker(playerName);
      setTimeout(() => setRoleTab('nonStriker'), 200);
    } else if (roleTab === 'nonStriker') {
      if (playerName === selectedStriker) {
        Alert.alert('Selection Error', 'This player is already selected as Striker');
        return;
      }
      setSelectedNonStriker(playerName);
      setTimeout(() => setRoleTab('bowler'), 200);
    } else {
      setSelectedBowler(playerName);
    }
  };

  const handleContinue = () => {
    if (!selectedStriker || !selectedNonStriker || !selectedBowler) {
      Alert.alert('Incomplete Selection', 'Please select a Striker, Non-Striker, and Bowler to continue.');
      return;
    }
    const striker = battingTeamObj?.players.find(p => p.name === selectedStriker);
    const nonStriker = battingTeamObj?.players.find(p => p.name === selectedNonStriker);
    const bowler = bowlingTeamObj?.players.find(p => p.name === selectedBowler);
    
    if (striker && nonStriker && bowler) {
      setStriker(striker);
      setNonStriker(nonStriker);
      setCurrentBowler(bowler);
      router.replace('/scorecard');
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
        const isCompleted = (step.id === 'striker' && selectedStriker) || 
                            (step.id === 'nonStriker' && selectedNonStriker) ||
                            (step.id === 'bowler' && selectedBowler);
        
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
          {selectedStriker || '?'} & {selectedNonStriker || '?'}
        </Text>
      </View>
      <View style={styles.summaryDivider} />
      <View style={styles.summaryItem}>
        <Text style={styles.summaryLabel}>Bowling</Text>
        <Text style={styles.summaryValue} numberOfLines={1}>
          {selectedBowler || '?'}
        </Text>
      </View>
    </View>
  );

  const playersToDisplay = roleTab === 'bowler' ? bowlingTeamObj?.players : battingTeamObj?.players;
  const currentSelection = roleTab === 'striker' ? selectedStriker : (roleTab === 'nonStriker' ? selectedNonStriker : selectedBowler);

  return (
    <View style={styles.container}>
      <LinearGradient colors={[colors.background, colors.surface]} style={styles.headerBG}>
        <View style={styles.headerContent}>
          <Text style={styles.title}>Match Setup</Text>
          <Text style={styles.subtitle}>
            {roleTab === 'bowler' ? `Bowling: ${bowlingTeam}` : `Batting: ${battingTeam}`}
          </Text>
        </View>
      </LinearGradient>

      <StepIndicator />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.grid}>
          {playersToDisplay?.map((player, index) => {
            const isSelected = currentSelection === player.name;
            const isDisabled = (roleTab === 'striker' && player.name === selectedNonStriker) ||
                               (roleTab === 'nonStriker' && player.name === selectedStriker);
            
            return (
              <TouchableOpacity
                key={index}
                activeOpacity={0.7}
                onPress={() => handleSelect(player.name)}
                style={[
                  styles.playerCard,
                  isSelected && styles.playerCardSelected,
                  isDisabled && styles.playerCardDisabled
                ]}
                disabled={isDisabled}
              >
                <View style={[styles.avatar, isSelected && styles.avatarSelected]}>
                  {isSelected ? (
                    <CheckCircle2 size={20} color="#fff" />
                  ) : (
                    <Text style={styles.avatarText}>{player.name.charAt(0)}</Text>
                  )}
                </View>
                <Text style={[styles.playerName, isSelected && styles.playerNameSelected]} numberOfLines={2}>
                  {player.name}
                </Text>
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

      <View style={styles.footer}>
        <SelectionSummary />
        <TouchableOpacity 
          style={[styles.continueButton, (!selectedStriker || !selectedNonStriker || !selectedBowler) && styles.continueButtonDisabled]} 
          onPress={handleContinue}
        >
          <Text style={styles.continueButtonText}>Start Match</Text>
          <ChevronRight size={24} color={colors.textDark} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerBG: {
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerContent: {
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: 1,
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
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
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
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
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