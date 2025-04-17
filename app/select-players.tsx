import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { router } from 'expo-router';
import { useGameStore } from '../store/gameStore';

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
              selectedStriker === player.name && styles.selectedButton,
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
              selectedNonStriker === player.name && styles.selectedButton,
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
              selectedBowler === player.name && styles.selectedButton,
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
    padding: 20,
    backgroundColor: '#fff',
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  playerButton: {
    backgroundColor: '#f0f0f0',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  selectedButton: {
    backgroundColor: '#2196F3',
  },
  disabledButton: {
    backgroundColor: '#ddd',
    opacity: 0.5,
  },
  playerButtonText: {
    fontSize: 16,
  },
  continueButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 30,
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});