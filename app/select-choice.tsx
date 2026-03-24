import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useGameStore } from '../store/gameStore';
import { colors } from './theme';
import { LinearGradient } from 'expo-linear-gradient';
import { Sword, CircleDot } from 'lucide-react-native';

const { width } = Dimensions.get('window');

export default function SelectChoiceScreen() {
  const teams = useGameStore((state) => state.teams);
  const tossWinner = useGameStore((state) => state.tossWinner);
  const setBattingTeam = useGameStore((state) => state.setBattingTeam);
  const setBowlingTeam = useGameStore((state) => state.setBowlingTeam);

  const handleChoice = (choice: 'bat' | 'bowl') => {
    const winningTeam = teams.find(team => team.name === tossWinner);
    const losingTeam = teams.find(team => team.name !== tossWinner);

    if (winningTeam && losingTeam) {
      if (choice === 'bat') {
        setBattingTeam(winningTeam.name);
        setBowlingTeam(losingTeam.name);
      } else {
        setBattingTeam(losingTeam.name);
        setBowlingTeam(winningTeam.name);
      }
      router.push('/select-players');
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={[colors.background, colors.surface]} style={styles.headerBG}>
        <View style={styles.headerContent}>
          <Text style={styles.winnerName}>{tossWinner}</Text>
          <Text style={styles.title}>Won the Toss!</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>CONGRATULATIONS</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>What is your choice?</Text>
        
        <View style={styles.choiceContainer}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => handleChoice('bat')}
            style={styles.choiceCard}
          >
            <LinearGradient
              colors={[colors.accent, colors.accentAlt]}
              style={styles.cardGradient}
            >
              <Sword size={48} color="#fff" />
              <Text style={styles.choiceLabel}>BAT FIRST</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => handleChoice('bowl')}
            style={styles.choiceCard}
          >
            <LinearGradient
              colors={['#8B5CF6', '#6D28D9']}
              style={styles.cardGradient}
            >
              <CircleDot size={48} color="#fff" />
              <Text style={styles.choiceLabel}>BOWL FIRST</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
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
    paddingTop: 80,
    paddingBottom: 50,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    alignItems: 'center',
  },
  headerContent: {
    alignItems: 'center',
  },
  winnerName: {
    fontSize: 24,
    color: colors.accent,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  title: {
    fontSize: 36,
    fontWeight: '900',
    color: colors.text,
    marginVertical: 10,
  },
  badge: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 15,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  badgeText: {
    color: colors.accent,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 30,
    fontWeight: '600',
  },
  choiceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  choiceCard: {
    width: (width - 64) / 2,
    aspectRatio: 0.85,
    borderRadius: 24,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  cardGradient: {
    flex: 1,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  choiceLabel: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
    marginTop: 15,
    textAlign: 'center',
  },
});