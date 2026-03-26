import { create } from 'zustand';

interface SyncState {
  isOnline: boolean;
  pendingCount: number;
  isSyncing: boolean;
  setOnlineStatus: (status: boolean) => void;
  setPendingCount: (count: number) => void;
  setSyncing: (syncing: boolean) => void;
}

export const useSyncStore = create<SyncState>((set) => ({
  isOnline: navigator.onLine,
  pendingCount: 0,
  isSyncing: false,
  setOnlineStatus: (status) => set({ isOnline: status }),
  setPendingCount: (count) => set({ pendingCount: count }),
  setSyncing: (syncing) => set({ isSyncing: syncing }),
}));
