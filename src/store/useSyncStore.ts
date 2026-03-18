import { create } from 'zustand';
import { syncService, SyncConfig, SyncStatus } from '../services/syncService';
import { useStore } from './useStore';

interface SyncStore {
  config: SyncConfig;
  status: SyncStatus;
  autoSyncInterval: number;
  autoSyncTimer: number | null;

  // Actions
  initializeSync: () => Promise<void>;
  updateConfig: (config: Partial<SyncConfig>) => Promise<void>;
  syncNow: () => Promise<void>;
  startAutoSync: () => void;
  stopAutoSync: () => void;
  getStatus: () => SyncStatus;
}

export const useSyncStore = create<SyncStore>((set, get) => ({
  config: {
    url: import.meta.env.VITE_WEBDAV_URL || '',
    username: import.meta.env.VITE_WEBDAV_USERNAME || '',
    password: import.meta.env.VITE_WEBDAV_PASSWORD || '',
    remotePath: import.meta.env.VITE_WEBDAV_PATH || '/jpad-notes',
    enabled: false,
  },
  status: {
    lastSync: null,
    syncing: false,
    error: null,
    filesUploaded: 0,
    filesDownloaded: 0,
  },
  autoSyncInterval: parseInt(import.meta.env.VITE_SYNC_INTERVAL || '300') * 1000,
  autoSyncTimer: null,

  initializeSync: async () => {
    const { config } = get();
    
    // Check if sync is configured
    if (!config.url || !config.username || !config.password) {
      set({ config: { ...config, enabled: false } });
      return;
    }

    try {
      await syncService.initialize({ ...config, enabled: true });
      set({ 
        config: { ...config, enabled: true },
        status: syncService.getStatus()
      });
      
      // Start auto-sync if configured
      if (get().autoSyncInterval > 0) {
        get().startAutoSync();
      }
    } catch (error) {
      console.error('Failed to initialize sync:', error);
      set({ 
        config: { ...config, enabled: false },
        status: { ...get().status, error: String(error) }
      });
    }
  },

  updateConfig: async (newConfig) => {
    const { config } = get();
    const updated = { ...config, ...newConfig };
    
    try {
      await syncService.initialize(updated);
      set({ config: updated, status: syncService.getStatus() });
      
      // Restart auto-sync if enabled
      if (updated.enabled && get().autoSyncInterval > 0) {
        get().stopAutoSync();
        get().startAutoSync();
      }
    } catch (error) {
      console.error('Failed to update sync config:', error);
      throw error;
    }
  },

  syncNow: async () => {
    const { notesRoot } = useStore.getState();
    
    try {
      set({ status: { ...get().status, syncing: true, error: null } });
      await syncService.syncAll(notesRoot);
      set({ status: syncService.getStatus() });
      
      // Refresh file list after sync
      await useStore.getState().refreshFiles();
    } catch (error) {
      console.error('Sync failed:', error);
      set({ status: { ...get().status, syncing: false, error: String(error) } });
      throw error;
    }
  },

  startAutoSync: () => {
    const { autoSyncTimer, autoSyncInterval } = get();
    
    // Clear existing timer
    if (autoSyncTimer) {
      clearInterval(autoSyncTimer);
    }

    // Start new timer
    const timer = setInterval(() => {
      const { config } = get();
      if (config.enabled && !get().status.syncing) {
        get().syncNow().catch(console.error);
      }
    }, autoSyncInterval);

    set({ autoSyncTimer: timer });
  },

  stopAutoSync: () => {
    const { autoSyncTimer } = get();
    if (autoSyncTimer) {
      clearInterval(autoSyncTimer);
      set({ autoSyncTimer: null });
    }
  },

  getStatus: () => get().status,
}));
