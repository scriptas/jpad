import { create } from 'zustand';
import { checkForUpdate, getCurrentVersion, getAssetForPlatform, type ReleaseInfo, type ReleaseAsset } from '../services/updateService';
import { platform } from '@tauri-apps/plugin-os';

interface UpdateState {
    // State
    hasUpdate: boolean;
    latestRelease: ReleaseInfo | null;
    currentVersion: string;
    checking: boolean;
    downloading: boolean;
    downloadProgress: number;        // 0-100
    error: string | null;
    lastChecked: string | null;      // ISO date
    dismissed: boolean;              // user dismissed the banner

    // Actions
    checkForUpdates: () => Promise<void>;
    downloadAndInstall: () => Promise<void>;
    dismiss: () => void;
    getDownloadAsset: () => ReleaseAsset | null;
}

// Check interval: 30 minutes
const CHECK_INTERVAL_MS = 30 * 60 * 1000;

export const useUpdateStore = create<UpdateState>()((set, get) => ({
    hasUpdate: false,
    latestRelease: null,
    currentVersion: getCurrentVersion(),
    checking: false,
    downloading: false,
    downloadProgress: 0,
    error: null,
    lastChecked: null,
    dismissed: false,

    checkForUpdates: async () => {
        if (get().checking) return;

        set({ checking: true, error: null });
        try {
            const result = await checkForUpdate();
            set({
                hasUpdate: result.hasUpdate,
                latestRelease: result.release,
                lastChecked: new Date().toISOString(),
                checking: false,
                // Reset dismissed when a new version is found
                dismissed: result.hasUpdate && result.release?.version !== get().latestRelease?.version
                    ? false
                    : get().dismissed,
            });
        } catch (err) {
            set({
                checking: false,
                error: err instanceof Error ? err.message : 'Failed to check for updates',
            });
        }
    },

    downloadAndInstall: async () => {
        const { latestRelease, downloading } = get();
        if (!latestRelease || downloading) return;

        const asset = get().getDownloadAsset();
        if (!asset) {
            set({ error: 'No compatible download found for your platform' });
            return;
        }

        set({ downloading: true, downloadProgress: 0, error: null });

        try {
            const { invoke } = await import('@tauri-apps/api/core');
            await invoke('download_and_install_update', {
                url: asset.downloadUrl,
                filename: asset.name,
            });
            // If we get here on some platforms, the installer may have launched
            // and the app will be replaced. On others, we stay running.
            set({ downloading: false, downloadProgress: 100 });
        } catch (err) {
            set({
                downloading: false,
                downloadProgress: 0,
                error: typeof err === 'string' ? err : (err instanceof Error ? err.message : 'Update failed'),
            });
        }
    },

    dismiss: () => set({ dismissed: true }),

    getDownloadAsset: () => {
        const { latestRelease } = get();
        if (!latestRelease) return null;
        const p = platform();
        const platformKey = p === 'macos' ? 'macos' : p === 'windows' ? 'windows' : 'linux';
        return getAssetForPlatform(latestRelease.assets, platformKey);
    },
}));

/**
 * Initialize periodic update checks.
 * Call once from App.tsx on mount.
 */
export function initializeUpdateChecker(): () => void {
    // Initial check after a short delay to not block startup
    const initialTimeout = setTimeout(() => {
        useUpdateStore.getState().checkForUpdates();
    }, 10_000); // 10 seconds after launch

    // Periodic checks
    const interval = setInterval(() => {
        useUpdateStore.getState().checkForUpdates();
    }, CHECK_INTERVAL_MS);

    return () => {
        clearTimeout(initialTimeout);
        clearInterval(interval);
    };
}
