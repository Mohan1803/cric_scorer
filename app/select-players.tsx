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
    <ScrollView style={styles.container}>
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

      <TouchableOpacity
        style={styles.continueButton}
        onPress={handleContinue}
      >
        <Text style={styles.continueButtonText}>Start Match</Text>
      </TouchableOpacity>
    </ScrollView>
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
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: colors.textPrimary,
  },
  playerButton: {
    backgroundColor: colors.surface,
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  selected: {
    backgroundColor: colors.accent,
  },
  disabledButton: {
    backgroundColor: colors.disabled,
    opacity: 0.5,
  },
  playerButtonText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  continueButton: {
    backgroundColor: colors.accent,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  continueButtonText: {
    color: colors.textSecondary,
    fontSize: 18,
    fontWeight: 'bold',
  },
});