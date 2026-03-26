import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useGameStore } from '../store/gameStore';
import { colors } from './theme';
import { LinearGradient } from 'expo-linear-gradient';
import { Trophy, ChevronLeft } from 'lucide-react-native';

const { width } = Dimensions.get('window');

export default function TossScreen() {
  const teams = useGameStore((state) => state.teams);
  const setTossWinner = useGameStore((state) => state.setTossWinner);

  const handleTossWinner = (teamName: string) => {
    setTossWinner(teamName);
    router.push('/select-choice');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={styles.topHeader}>
        <TouchableOpacity 
          style={styles.headerBackButton} 
          onPress={() => router.back()}
        >
          <ChevronLeft color={colors.accent} size={28} />
          <Text style={styles.headerBackText}>Back</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.container}>
      <View style={styles.topInfo}>
        <Text style={styles.subtitle}>Who won the coin flip?</Text>
      </View>

      <View style={styles.content}>
        {teams.map((team, index) => (
          <TouchableOpacity
            key={index}
            activeOpacity={0.8}
            onPress={() => handleTossWinner(team.name)}
            style={styles.teamCardWrapper}
          >
            <LinearGradient
              colors={index === 0 ? [colors.accent, colors.accentAlt] : [colors.accentPurple, '#6D28D9']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.teamCard}
            >
              <Text style={styles.teamInitial}>{team.name.charAt(0)}</Text>
              <Text style={styles.teamName}>{team.name}</Text>
              <View style={styles.selectBadge}>
                <Text style={styles.selectBadgeText}>WINNER</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        ))}
        </View>
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
    paddingBottom: 20,
    alignItems: 'center',
  },
  headerContent: {
    alignItems: 'center',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.2)',
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '500',
    marginTop: 5,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  teamCardWrapper: {
    marginBottom: 20,
    borderRadius: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  teamCard: {
    padding: 30,
    borderRadius: 20,
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  teamInitial: {
    fontSize: 60,
    fontWeight: '900',
    color: 'rgba(255, 255, 255, 0.2)',
    position: 'absolute',
    right: -10,
    top: -10,
  },
  teamName: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
  },
  selectBadge: {
    marginTop: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  selectBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
});