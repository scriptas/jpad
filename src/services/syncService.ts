import { createClient, WebDAVClient, FileStat } from 'webdav';
import { invoke } from '@tauri-apps/api/core';
import { fetch } from '@tauri-apps/plugin-http';
import { platform } from '@tauri-apps/plugin-os';

export interface SyncConfig {
  url: string;
  username: string;
  password: string;
  remotePath: string;
  enabled: boolean;
}

export interface SyncStatus {
  lastSync: Date | null;
  syncing: boolean;
  error: string | null;
  filesUploaded: number;
  filesDownloaded: number;
  filesDeletedLocal: number;
  filesDeletedRemote: number;
}

interface SyncManifestEntry {
  localMtime: number;
  remoteMtime: number;
}

type SyncManifest = Record<string, SyncManifestEntry>;

class SyncService {
  private client: WebDAVClient | null = null;
  private config: SyncConfig | null = null;
  private status: SyncStatus = {
    lastSync: null,
    syncing: false,
    error: null,
    filesUploaded: 0,
    filesDownloaded: 0,
    filesDeletedLocal: 0,
    filesDeletedRemote: 0,
  };

  async initialize(config: SyncConfig): Promise<void> {
    if (!config.enabled || !config.url) {
      this.client = null;
      this.config = null;
      return;
    }

    try {
      this.client = createClient(config.url, {
        username: config.username,
        password: config.password,
        httpAgent: fetch as any, // Use Tauri's HTTP client
      });

      // Test connection
      await this.client.exists(config.remotePath);
      
      // Create remote directory if it doesn't exist
      if (!(await this.client.exists(config.remotePath))) {
        await this.client.createDirectory(config.remotePath);
      }

      this.config = config;
      this.status.error = null;
    } catch (error) {
      this.status.error = `Failed to connect: ${error}`;
      throw error;
    }
  }

  isEnabled(): boolean {
    return this.client !== null && this.config !== null;
  }

  getStatus(): SyncStatus {
    return { ...this.status };
  }

  async syncAll(notesRoot: string): Promise<void> {
    if (!this.isEnabled() || !this.config) {
      throw new Error('Sync not configured');
    }

    this.status.syncing = true;
    this.status.error = null;
    this.status.filesUploaded = 0;
    this.status.filesDownloaded = 0;
    this.status.filesDeletedLocal = 0;
    this.status.filesDeletedRemote = 0;

    const sep = platform() === 'windows' ? '\\' : '/';
    const manifestPath = notesRoot.endsWith(sep) ? `${notesRoot}.jpad-sync-manifest.json` : `${notesRoot}${sep}.jpad-sync-manifest.json`;

    try {
      // 1. Load manifest
      let manifest: SyncManifest = {};
      try {
        const manifestStr = await invoke<string>('read_file', { path: manifestPath });
        manifest = JSON.parse(manifestStr);
      } catch (e) {
        console.log('No manifest found or failed to read, starting fresh sync');
      }

      // 2. Get local files
      const localFiles = await invoke<string[]>('list_all_files', { path: notesRoot });
      const localMap = new Map<string, number>();
      for (const file of localFiles) {
        const mtime = await invoke<number>('get_file_mtime', { path: file });
        const relativePath = file.replace(notesRoot, '').replace(/\\/g, '/');
        const cleanPath = relativePath.startsWith('/') ? relativePath.slice(1) : relativePath;
        if (cleanPath && !cleanPath.startsWith('.')) {
          localMap.set(cleanPath, mtime);
        }
      }

      // 3. Get remote files recursively
      const remoteFiles = await this.getRemoteFilesRecursive(this.config.remotePath);
      const remoteMap = new Map<string, number>();
      for (const file of remoteFiles) {
        const relPath: string = file.filename.replace(this.config.remotePath, '');
        const cleanRelPath = relPath.startsWith('/') ? relPath.slice(1) : relPath;
        remoteMap.set(cleanRelPath, new Date(file.lastmod).getTime());
      }

      // 4. Combine all paths
      const allPaths = new Set([
        ...localMap.keys(),
        ...remoteMap.keys(),
        ...Object.keys(manifest)
      ]);

      const newManifest: SyncManifest = {};

      // 5. Sync logic
      for (const path of allPaths) {
        const L = localMap.get(path);
        const R = remoteMap.get(path);
        const M = manifest[path];

        const localFilePath = notesRoot.endsWith(sep) ? `${notesRoot}${path.replace(/\//g, sep)}` : `${notesRoot}${sep}${path.replace(/\//g, sep)}`;

        if (M) {
          if (L !== undefined && R !== undefined) {
            const localChanged = Math.abs(L - M.localMtime) > 1000;
            const remoteChanged = Math.abs(R - M.remoteMtime) > 1000;

            if (localChanged && !remoteChanged) {
              await this.uploadFile(notesRoot, path);
              this.status.filesUploaded++;
            } else if (!localChanged && remoteChanged) {
              await this.downloadFile(notesRoot, path);
              this.status.filesDownloaded++;
            } else if (localChanged && remoteChanged) {
              if (L > R) {
                await this.uploadFile(notesRoot, path);
                this.status.filesUploaded++;
              } else {
                await this.downloadFile(notesRoot, path);
                this.status.filesDownloaded++;
              }
            }
          } else if (L !== undefined && R === undefined) {
            const localChanged = Math.abs(L - M.localMtime) > 1000;
            if (localChanged) {
              await this.uploadFile(notesRoot, path);
              this.status.filesUploaded++;
            } else {
              await invoke('delete_path', { path: localFilePath });
              this.status.filesDeletedLocal++;
              continue;
            }
          } else if (L === undefined && R !== undefined) {
            const remoteChanged = Math.abs(R - M.remoteMtime) > 1000;
            if (remoteChanged) {
              await this.downloadFile(notesRoot, path);
              this.status.filesDownloaded++;
            } else {
              await this.deleteRemoteFile(path);
              this.status.filesDeletedRemote++;
              continue;
            }
          } else {
            continue;
          }
        } else {
          if (L !== undefined && R !== undefined) {
            if (L > R) {
              await this.uploadFile(notesRoot, path);
              this.status.filesUploaded++;
            } else {
              await this.downloadFile(notesRoot, path);
              this.status.filesDownloaded++;
            }
          } else if (L !== undefined) {
            await this.uploadFile(notesRoot, path);
            this.status.filesUploaded++;
          } else if (R !== undefined) {
            await this.downloadFile(notesRoot, path);
            this.status.filesDownloaded++;
          }
        }

        // Fresh mtimes for manifest
        const finalL = await invoke<number>('get_file_mtime', { path: localFilePath }).catch(() => 0);
        newManifest[path] = {
          localMtime: finalL,
          remoteMtime: 0 // Will fill after re-listing
        };
      }

      // 6. Refresh remote map for accurate manifest
      const finalRemoteFiles = await this.getRemoteFilesRecursive(this.config.remotePath);
      for (const file of finalRemoteFiles) {
        const relPath: string = file.filename.replace(this.config.remotePath, '');
        const cleanRelPath = relPath.startsWith('/') ? relPath.slice(1) : relPath;
        if (newManifest[cleanRelPath]) {
          newManifest[cleanRelPath].remoteMtime = new Date(file.lastmod).getTime();
        }
      }

      // 7. Save manifest
      await invoke('write_file', {
        path: manifestPath,
        content: JSON.stringify(newManifest, null, 2)
      });

      this.status.lastSync = new Date();
      this.status.error = null;
    } catch (error) {
      this.status.error = `Sync failed: ${error}`;
      throw error;
    } finally {
      this.status.syncing = false;
    }
  }

  private async getRemoteFilesRecursive(remotePath: string): Promise<FileStat[]> {
    if (!this.client) throw new Error('Client not initialized');
    
    let allFiles: FileStat[] = [];
    const contents = await this.client.getDirectoryContents(remotePath) as FileStat[];
    
    for (const item of contents) {
      if (item.type === 'file') {
        allFiles.push(item);
      } else if (item.type === 'directory') {
        const subFiles = await this.getRemoteFilesRecursive(item.filename);
        allFiles = allFiles.concat(subFiles);
      }
    }
    
    return allFiles;
  }

  public async deleteRemoteFile(relativePath: string): Promise<void> {
    if (!this.client || !this.config) throw new Error('Not initialized');
    const remotePath = `${this.config.remotePath}${relativePath.startsWith('/') ? relativePath : '/' + relativePath}`;
    await this.client.deleteFile(remotePath);
  }

  private async uploadFile(notesRoot: string, relativePath: string): Promise<void> {
    if (!this.client || !this.config) throw new Error('Not initialized');

    const sep = platform() === 'windows' ? '\\' : '/';
    const nativeRelative = sep === '\\' ? relativePath.replace(/\//g, '\\') : relativePath.replace(/\\/g, '/');
    const cleanRelative = nativeRelative.startsWith(sep) ? nativeRelative.slice(1) : nativeRelative;
    const cleanRoot = notesRoot.endsWith(sep) ? notesRoot.slice(0, -1) : notesRoot;
    const localPath = `${cleanRoot}${sep}${cleanRelative}`;
    const remotePath = `${this.config.remotePath}${relativePath}`;
    
    const content = await invoke<string>('read_file', { path: localPath });
    await this.client.putFileContents(remotePath, content, { overwrite: true });
  }

  private async downloadFile(notesRoot: string, relativePath: string): Promise<void> {
    if (!this.client || !this.config) throw new Error('Not initialized');

    const sep = platform() === 'windows' ? '\\' : '/';
    const nativeRelative = sep === '\\' ? relativePath.replace(/\//g, '\\') : relativePath.replace(/\\/g, '/');
    const cleanRelative = nativeRelative.startsWith(sep) ? nativeRelative.slice(1) : nativeRelative;
    const cleanRoot = notesRoot.endsWith(sep) ? notesRoot.slice(0, -1) : notesRoot;
    const localPath = `${cleanRoot}${sep}${cleanRelative}`;
    const remotePath = `${this.config.remotePath}${relativePath}`;
    
    const content = await this.client.getFileContents(remotePath, { format: 'text' }) as string;
    await invoke('write_file', { path: localPath, content });
  }

  async pushFile(notesRoot: string, filePath: string): Promise<void> {
    if (!this.isEnabled()) return;

    let relativePath = filePath.replace(notesRoot, '');
    relativePath = relativePath.replace(/\\/g, '/');
    await this.uploadFile(notesRoot, relativePath);
  }

  async testConnection(config: SyncConfig): Promise<{
    success: boolean;
    steps: { name: string; status: 'success' | 'error'; message: string }[];
  }> {
    const steps: { name: string; status: 'success' | 'error'; message: string }[] = [];

    try {
      if (!config.url) {
        steps.push({ name: 'Verify URL', status: 'error', message: 'URL is required' });
        return { success: false, steps };
      }
      steps.push({ name: 'Verify URL', status: 'success', message: 'Ready to connect' });

      const client = createClient(config.url, {
        username: config.username,
        password: config.password,
        httpAgent: fetch as any,
      });

      // Test root access
      try {
        await client.exists('/');
        steps.push({ name: 'Connect', status: 'success', message: 'Connection established' });
      } catch (error) {
        steps.push({ name: 'Connect', status: 'error', message: `Could not connect: ${error}` });
        return { success: false, steps };
      }

      // Check path
      const exists = await client.exists(config.remotePath);
      if (exists) {
        steps.push({ name: 'Verify Path', status: 'success', message: `Path "${config.remotePath}" is ready` });
      } else {
        steps.push({ name: 'Verify Path', status: 'success', message: `Path "${config.remotePath}" will be created` });
      }

      return { success: true, steps };
    } catch (error) {
      steps.push({ name: 'Error', status: 'error', message: String(error) });
      return { success: false, steps };
    }
  }
}

export const syncService = new SyncService();
