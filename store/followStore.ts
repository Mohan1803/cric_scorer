import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface FollowState {
  followedPlayers: string[]; // List of followed player names
  followPlayer: (name: string) => void;
  unfollowPlayer: (name: string) => void;
  isFollowing: (name: string) => boolean;
}

export const useFollowStore = create<FollowState>()(
  persist(
    (set, get) => ({
      followedPlayers: [],
      
      followPlayer: (name: string) => {
        const { followedPlayers } = get();
        if (!followedPlayers.includes(name)) {
          set({ followedPlayers: [...followedPlayers, name] });
        }
      },
      
      unfollowPlayer: (name: string) => {
        const { followedPlayers } = get();
        set({ followedPlayers: followedPlayers.filter(n => n !== name) });
      },
      
      isFollowing: (name: string) => {
        return get().followedPlayers.includes(name);
      },
    }),
    {
      name: 'cric-scorer-follow-state',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
