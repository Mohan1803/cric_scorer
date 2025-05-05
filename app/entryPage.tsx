import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { colors } from './theme';
import { router } from 'expo-router';
import { useGameStore } from '../store/gameStore';

export default function TeamEntry() {
  const [team1Name, setTeam1Name] = useState('');
  const [team2Name, setTeam2Name] = useState('');
  const [overs, setOvers] = useState('');
  const setTeams = useGameStore((state) => state.setTeams);
  const setTotalOvers = useGameStore((state) => state.setTotalOvers);

  const handleContinue = () => {
    if (!team1Name.trim() || !team2Name.trim() || !overs.trim()) {
      Alert.alert('Error', 'Please enter both team names and number of overs');
      return;
    }

    if (team1Name.trim() === team2Name.trim()) {
      Alert.alert('Error', 'Team names must be different');
      return;
    }

    const numOvers = parseInt(overs);
    if (isNaN(numOvers) || numOvers < 1) {
      Alert.alert('Error', 'Please enter a valid number of overs');
      return;
    }

    setTeams([
      { name: team1Name, players: [] },
      { name: team2Name, players: [] },
    ]);
    setTotalOvers(numOvers);
    
    router.push('/players');
  };

  return (
    <>
      <View style={styles.container}>
        <Text style={styles.title}>Enter Match Details</Text>
      
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Team 1 Name</Text>
        <TextInput
          style={styles.input}
          value={team1Name}
          onChangeText={setTeam1Name}
          placeholder="Enter team 1 name"
          placeholderTextColor={colors.textSecondary}
          maxLength={30}
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Team 2 Name</Text>
        <TextInput
          style={styles.input}
          value={team2Name}
          onChangeText={setTeam2Name}
          placeholder="Enter team 2 name"
          placeholderTextColor={colors.textSecondary}
          maxLength={30}
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Number of Overs</Text>
        <TextInput
          style={styles.input}
          value={overs}
          onChangeText={setOvers}
          placeholder="Enter number of overs"
          placeholderTextColor={colors.textSecondary}
          keyboardType="numeric"
          maxLength={2}
        />
      </View>

      <TouchableOpacity style={styles.button} onPress={handleContinue}>
        <Text style={styles.buttonText}>Continue</Text>
      </TouchableOpacity>
      </View>
    </>
  );
}

const styles = StyleSheet.create({

  container: {
    flex: 1,
    padding: 20,
    backgroundColor: colors.background,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
    color: colors.accent,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    color: colors.textDark,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: colors.surface,
    color: colors.textPrimary,
  },
  button: {
    backgroundColor: colors.accent,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonText: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: 'bold',
    
    
    
  },
});