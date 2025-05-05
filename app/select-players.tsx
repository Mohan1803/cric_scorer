import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { router } from 'expo-router';
import { useGameStore } from '../store/gameStore';
import { colors } from './theme';

export default function SelectPlayersScreen() {
  const teams = useGameStore((state) => state.teams);
  const battingTeam = useGameStore((state) => state.battingTeam);
  const bowlingTeam = useGameStore((state) => state.bowlingTeam);
  const setStriker = useGameStore((state) => state.setStriker);
  const setNonStriker = useGameStore((state) => state.setNonStriker);
  const setCurrentBowler = useGameStore((state) => state.setCurrentBowler);

  const battingTeamObj = teams.find(team => team.name === battingTeam);
  const bowlingTeamObj = teams.find(team => team.name === bowlingTeam);

  const [selectedStriker, setSelectedStriker] = useState<string | null>(null);
  const [selectedNonStriker, setSelectedNonStriker] = useState<string | null>(null);
  const [selectedBowler, setSelectedBowler] = useState<string | null>(null);
  const [roleTab, setRoleTab] = useState<'striker' | 'nonStriker' | 'bowler'>('striker');

  const handleContinue = () => {
    if (!selectedStriker || !selectedNonStriker || !selectedBowler) {
      Alert.alert('Error', 'Please select all players');
      return;
    }

    const striker = battingTeamObj!.players.find(p => p.name === selectedStriker);
    const nonStriker = battingTeamObj!.players.find(p => p.name === selectedNonStriker);
    const bowler = bowlingTeamObj!.players.find(p => p.name === selectedBowler);

    setStriker(striker!);
    setNonStriker(nonStriker!);
    setCurrentBowler(bowler!);

    router.push('/scorecard');
  };

  return (
    <View style={{flex: 1, backgroundColor: colors.background}}>
      {/* Role Tabs */}
      <View style={{
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 28,
        marginBottom: 22,
        backgroundColor: colors.cardAlt,
        borderRadius: 32,
        padding: 6,
        shadowColor: colors.shadow,
        shadowOpacity: 0.12,
        shadowRadius: 12,
        elevation: 4,
        alignSelf: 'center',
        width: '96%',
        maxWidth: 420,
      }}>
        {['striker', 'nonStriker', 'bowler'].map((tab, idx) => (
          <TouchableOpacity
            key={tab}
            style={{
              flex: 1,
              paddingVertical: 10,
              marginHorizontal: 4,
              borderRadius: 24,
              backgroundColor: roleTab === tab ? colors.accent : 'transparent',
              ...(roleTab === tab
                ? {
                    elevation: 6,
                    shadowColor: colors.accentAlt,
                    shadowOpacity: 0.22,
                  }
                : {
                    borderWidth: 1.5,
                    borderColor: colors.accent,
                  }),
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: 90,
              transitionProperty: 'background-color',
              transitionDuration: '200ms',
            }}
            onPress={() => setRoleTab(tab as 'striker' | 'nonStriker' | 'bowler')}
            accessibilityRole="button"
            accessibilityLabel={`Select ${tab}`}
            accessible
          >
            <Text style={{
              color: roleTab === tab ? colors.textPrimary : colors.textSecondary,
              fontWeight: 'bold',
              fontSize: 15,
              letterSpacing: 0.16,
              textAlign: 'center',
              paddingHorizontal: 2,
            }}>
              {tab === 'striker' ? 'Striker' : tab === 'nonStriker' ? 'Non-Striker' : 'Bowler'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <ScrollView style={{ flex: 1, paddingHorizontal: 20 }}>
        {roleTab === 'striker' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Select Striker</Text>
            {battingTeamObj?.players.map((player, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.playerButton,
                  selectedStriker === player.name && styles.selected,
                  player.name === selectedNonStriker && styles.disabledButton,
                ]}
                onPress={() => setSelectedStriker(player.name)}
                disabled={player.name === selectedNonStriker}
              >
                <Text style={styles.playerButtonText}>{player.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        {roleTab === 'nonStriker' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Select Non-Striker</Text>
            {battingTeamObj?.players.map((player, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.playerButton,
                  selectedNonStriker === player.name && styles.selected,
                  player.name === selectedStriker && styles.disabledButton,
                ]}
                onPress={() => setSelectedNonStriker(player.name)}
                disabled={player.name === selectedStriker}
              >
                <Text style={styles.playerButtonText}>{player.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        {roleTab === 'bowler' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Select Bowler</Text>
            {bowlingTeamObj?.players.map((player, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.playerButton,
                  selectedBowler === player.name && styles.selected,
                ]}
                onPress={() => setSelectedBowler(player.name)}
              >
                <Text style={styles.playerButtonText}>{player.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        <TouchableOpacity
          style={styles.continueButton}
          onPress={handleContinue}
        >
          <Text style={styles.continueButtonText}>Start Match</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 20,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 21,
    fontWeight: 'bold',
    marginBottom: 13,
    color: colors.textPrimary,
    letterSpacing: 0.1,
  },
  searchBarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardAlt,
    borderRadius: 8,
    marginBottom: 14,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.textPrimary,
    backgroundColor: 'transparent',
    paddingVertical: 7,
    paddingHorizontal: 6,
  },
  roleFilterRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 12,
    gap: 6,
  },
  roleFilterBtn: {
    backgroundColor: colors.surface,
    borderRadius: 15,
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginHorizontal: 2,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  roleFilterBtnActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accentAlt,
  },
  roleFilterText: {
    color: colors.textPrimary,
    fontWeight: 'bold',
    fontSize: 15,
    letterSpacing: 0.08,
  },
  playerButton: {
    backgroundColor: colors.surface,
    paddingVertical: 18,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 13,
    marginHorizontal: 2,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'flex-start',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selected: {
    backgroundColor: colors.accent,
  },
  disabledButton: {
    backgroundColor: colors.disabled,
    opacity: 0.5,
  },
  playerButtonText: {
    fontSize: 18,
    color: colors.textPrimary,
    fontWeight: 'bold',
    
    
    
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  continueButton: {
    backgroundColor: colors.accent,
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 28,
    minWidth: 180,
    shadowColor: colors.shadow,
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  continueButtonText: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '900',
    
    
    
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
});