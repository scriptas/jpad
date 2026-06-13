import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { syncService, SyncConfig, SyncStatus } from '../services/syncService';
import { supabaseSyncService, SupabaseConfig } from '../services/supabaseService';
import { useStore } from './useStore';

export type SyncMode = 'webdav' | 'supabase';

interface CombinedSyncConfig {
  mode: SyncMode;
  webdav: SyncConfig;
  supabase: SupabaseConfig;
  enabled: boolean;
}

interface SyncStore {
  // Persisted config (stored locally, never pushed to remote)
  config: CombinedSyncConfig;
  autoSyncInterval: number;

  // Transient state (not persisted)
  status: SyncStatus;
  autoSyncTimer: number | null;

  // Actions
  initializeSync: () => Promise<void>;
  updateConfig: (config: Partial<CombinedSyncConfig>) => Promise<void>;
  syncNow: () => Promise<void>;
  startAutoSync: () => void;
  stopAutoSync: () => void;
  getStatus: () => SyncStatus;
  disconnect: () => void;
  updateAutoSyncInterval: (interval: number) => void;
}

const DEFAULT_STATUS: SyncStatus = {
  lastSync: null,
  syncing: false,
  error: null,
  filesUploaded: 0,
  filesDownloaded: 0,
  filesDeletedLocal: 0,
  filesDeletedRemote: 0,
};

export const useSyncStore = create<SyncStore>()(
  persist(
    (set, get) => ({
      config: {
        mode: 'supabase' as SyncMode,
        enabled: false,
        webdav: {
          url: '',
          username: '',
          password: '',
          remotePath: '/jpad-notes',
          enabled: false,
        },
        supabase: {
          url: '',
          anonKey: '',
          bucket: 'jpad-notes',
          enabled: false,
        },
      },
      autoSyncInterval: 60000, // 1 minute (default)

      // Transient (not persisted)
      status: { ...DEFAULT_STATUS },
      autoSyncTimer: null,

      initializeSync: async () => {
        const { config } = get();

        // If not enabled, do nothing
        if (!config.enabled) {
          return;
        }

        try {
          if (config.mode === 'webdav') {
            await syncService.initialize({ ...config.webdav, enabled: config.enabled });
          } else {
            await supabaseSyncService.initialize({ ...config.supabase, enabled: config.enabled });
          }

          set({
            status: config.mode === 'webdav' ? syncService.getStatus() : supabaseSyncService.getStatus()
          });

          if (config.enabled && get().autoSyncInterval > 0) {
            get().startAutoSync();
          }

          // Trigger initial sync in background
          if (config.enabled) {
            get().syncNow().catch(console.error);
          }
        } catch (error) {
          console.error('Failed to initialize sync:', error);
          set({
            status: { ...get().status, error: String(error) }
          });
        }
      },

      updateConfig: async (newConfig) => {
        const { config } = get();
        const updated = { ...config, ...newConfig };

        // Merge nested objects properly
        if (newConfig.webdav) {
          updated.webdav = { ...config.webdav, ...newConfig.webdav };
        }
        if (newConfig.supabase) {
          updated.supabase = { ...config.supabase, ...newConfig.supabase };
        }

        try {
          if (updated.enabled) {
            if (updated.mode === 'webdav') {
              await syncService.initialize({ ...updated.webdav, enabled: updated.enabled });
            } else {
              await supabaseSyncService.initialize({ ...updated.supabase, enabled: updated.enabled });
            }
          }

          set({
            config: updated,
            status: updated.enabled
              ? (updated.mode === 'webdav' ? syncService.getStatus() : supabaseSyncService.getStatus())
              : { ...DEFAULT_STATUS }
          });

          if (updated.enabled && get().autoSyncInterval > 0) {
            get().stopAutoSync();
            get().startAutoSync();
          } else {
            get().stopAutoSync();
          }

          if (updated.enabled) {
            get().syncNow().catch(console.error);
          }
        } catch (error) {
          console.error('Failed to update sync config:', error);
          set({
            status: { ...get().status, error: String(error) }
          });
          throw error;
        }
      },

      syncNow: async () => {
        const { notesRoot } = useStore.getState();
        const { config } = get();

        if (!config.enabled) {
          throw new Error('Sync is not enabled');
        }

        if (get().status.syncing) {
          console.log('Sync already in progress, skipping concurrent sync execution');
          return;
        }

        try {
          set({ status: { ...get().status, syncing: true, error: null } });

          if (config.mode === 'webdav') {
            await syncService.syncAll(notesRoot);
          } else {
            await supabaseSyncService.syncAll(notesRoot);
          }

          set({ status: config.mode === 'webdav' ? syncService.getStatus() : supabaseSyncService.getStatus() });
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

        set({ autoSyncTimer: timer as unknown as number });
      },

      stopAutoSync: () => {
        const { autoSyncTimer } = get();
        if (autoSyncTimer) {
          clearInterval(autoSyncTimer);
          set({ autoSyncTimer: null });
        }
      },

      disconnect: () => {
        get().stopAutoSync();
        set({
          config: { ...get().config, enabled: false },
          status: { ...DEFAULT_STATUS },
        });
      },

      getStatus: () => get().status,

      updateAutoSyncInterval: (interval: number) => {
        set({ autoSyncInterval: interval });
        const { config } = get();
        if (config.enabled && interval > 0) {
          get().stopAutoSync();
          get().startAutoSync();
        } else {
          get().stopAutoSync();
        }
      },
    }),
    {
      name: 'jpad-sync-config',
      // Only persist config and autoSyncInterval, NOT transient state
      partialize: (state) => ({
        config: state.config,
        autoSyncInterval: state.autoSyncInterval,
      }),
    }
  )
);
