import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Team } from './gameStore';

interface TeamLibraryState {
  savedTeams: Team[];
  saveTeam: (team: Team) => void;
  deleteTeam: (name: string) => void;
  getTeamsByQuery: (query: string) => Team[];
}

export const useTeamLibraryStore = create<TeamLibraryState>()(
  persist(
    (set, get) => ({
      savedTeams: [],

      saveTeam: (team: Team) => {
        const { savedTeams } = get();
        const existingIndex = savedTeams.findIndex(
          (t) => t.name.toLowerCase() === team.name.toLowerCase()
        );

        if (existingIndex > -1) {
          const updatedTeams = [...savedTeams];
          updatedTeams[existingIndex] = team;
          set({ savedTeams: updatedTeams });
        } else {
          set({ savedTeams: [...savedTeams, team] });
        }
      },

      deleteTeam: (name: string) => {
        const { savedTeams } = get();
        set({
          savedTeams: savedTeams.filter(
            (t) => t.name.toLowerCase() !== name.toLowerCase()
          ),
        });
      },

      getTeamsByQuery: (query: string) => {
        if (!query.trim()) return [];
        const { savedTeams } = get();
        return savedTeams.filter((t) =>
          t.name.toLowerCase().includes(query.toLowerCase())
        );
      },
    }),
    {
      name: 'cric-scorer-team-library',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
