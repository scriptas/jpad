import { createClient, WebDAVClient, FileStat } from 'webdav';
import { invoke } from '@tauri-apps/api/core';
import { fetch } from '@tauri-apps/plugin-http';

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
}

class SyncService {
  private client: WebDAVClient | null = null;
  private config: SyncConfig | null = null;
  private status: SyncStatus = {
    lastSync: null,
    syncing: false,
    error: null,
    filesUploaded: 0,
    filesDownloaded: 0,
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

    try {
      // Get local files
      const localFiles = await invoke<string[]>('list_all_files', { path: notesRoot });
      
      // Get remote files
      const remoteFiles = await this.getRemoteFiles(this.config.remotePath);
      
      // Build file maps with timestamps
      const localMap = new Map<string, number>();
      for (const file of localFiles) {
        const mtime = await invoke<number>('get_file_mtime', { path: file });
        const relativePath = file.replace(notesRoot, '').replace(/\\/g, '/');
        localMap.set(relativePath, mtime);
      }

      const remoteMap = new Map<string, number>();
      for (const file of remoteFiles) {
        remoteMap.set(file.filename, new Date(file.lastmod).getTime());
      }

      // Sync logic: newer file wins
      for (const [relativePath, localMtime] of localMap) {
        const remoteMtime = remoteMap.get(relativePath);
        
        if (!remoteMtime) {
          // File only exists locally - upload
          await this.uploadFile(notesRoot, relativePath);
          this.status.filesUploaded++;
        } else if (localMtime > remoteMtime) {
          // Local is newer - upload
          await this.uploadFile(notesRoot, relativePath);
          this.status.filesUploaded++;
        } else if (remoteMtime > localMtime) {
          // Remote is newer - download
          await this.downloadFile(notesRoot, relativePath);
          this.status.filesDownloaded++;
        }
      }

      // Download files that only exist remotely
      for (const [remotePath, _] of remoteMap) {
        if (!localMap.has(remotePath)) {
          await this.downloadFile(notesRoot, remotePath);
          this.status.filesDownloaded++;
        }
      }

      this.status.lastSync = new Date();
      this.status.error = null;
    } catch (error) {
      this.status.error = `Sync failed: ${error}`;
      throw error;
    } finally {
      this.status.syncing = false;
    }
  }

  private async getRemoteFiles(remotePath: string): Promise<FileStat[]> {
    if (!this.client) throw new Error('Client not initialized');
    
    const contents = await this.client.getDirectoryContents(remotePath) as FileStat[];
    return contents.filter(item => item.type === 'file');
  }

  private async uploadFile(notesRoot: string, relativePath: string): Promise<void> {
    if (!this.client || !this.config) throw new Error('Not initialized');

    const localPath = `${notesRoot}${relativePath.replace(/\//g, '\\')}`;
    const remotePath = `${this.config.remotePath}${relativePath}`;
    
    const content = await invoke<string>('read_file', { path: localPath });
    await this.client.putFileContents(remotePath, content, { overwrite: true });
  }

  private async downloadFile(notesRoot: string, relativePath: string): Promise<void> {
    if (!this.client || !this.config) throw new Error('Not initialized');

    const localPath = `${notesRoot}${relativePath.replace(/\//g, '\\')}`;
    const remotePath = `${this.config.remotePath}${relativePath}`;
    
    const content = await this.client.getFileContents(remotePath, { format: 'text' }) as string;
    await invoke('write_file', { path: localPath, content });
  }

  async pushFile(notesRoot: string, filePath: string): Promise<void> {
    if (!this.isEnabled()) return;

    const relativePath = filePath.replace(notesRoot, '').replace(/\\/g, '/');
    await this.uploadFile(notesRoot, relativePath);
  }
}

export const syncService = new SyncService();
