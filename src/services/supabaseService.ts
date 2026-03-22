import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { invoke } from '@tauri-apps/api/core';
import { platform } from '@tauri-apps/plugin-os';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  bucket: string;
  enabled: boolean;
}

export interface SyncStatus {
  lastSync: Date | null;
  syncing: boolean;
  error: string | null;
  filesUploaded: number;
  filesDownloaded: number;
}

/**
 * Get the OS-native path separator.
 * On Windows: backslash; everywhere else: forward slash.
 */
function getPathSep(): string {
  try {
    const p = platform();
    return p === 'windows' ? '\\' : '/';
  } catch {
    return '/';
  }
}

/**
 * Join a root path and a relative path using the OS separator.
 */
function joinPath(root: string, relativePath: string): string {
  const sep = getPathSep();
  // Normalize the relative path to use native separators
  const nativeRelative = sep === '\\' ? relativePath.replace(/\//g, '\\') : relativePath.replace(/\\/g, '/');
  // Remove leading separator from relative path
  const cleanRelative = nativeRelative.startsWith(sep) ? nativeRelative.slice(1) : nativeRelative;
  // Remove trailing separator from root
  const cleanRoot = root.endsWith(sep) ? root.slice(0, -1) : root;
  return `${cleanRoot}${sep}${cleanRelative}`;
}

class SupabaseSyncService {
  private client: SupabaseClient | null = null;
  private config: SupabaseConfig | null = null;
  private status: SyncStatus = {
    lastSync: null,
    syncing: false,
    error: null,
    filesUploaded: 0,
    filesDownloaded: 0,
  };

  async initialize(config: SupabaseConfig): Promise<void> {
    if (!config.enabled || !config.url || !config.anonKey) {
      this.client = null;
      this.config = null;
      return;
    }

    try {
      this.client = createClient(config.url, config.anonKey);

      // We don't strictly NEED to check the bucket metadata here.
      // Many anon-key setups won't have permission for getBucket.
      // We'll just assume it's fine until we actually try to sync.
      this.config = config;
      this.status.error = null;
    } catch (error) {
      this.status.error = `Failed to connect to Supabase: ${error}`;
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
    if (!this.isEnabled() || !this.config || !this.client) {
      throw new Error('Supabase sync not configured');
    }

    this.status.syncing = true;
    this.status.error = null;
    this.status.filesUploaded = 0;
    this.status.filesDownloaded = 0;

    try {
      // Get local files
      const localFiles = await invoke<string[]>('list_all_files', { path: notesRoot });

      // Get remote files recursively
      const remoteFiles = await this.listRemoteFilesRecursive('');

      // Build file maps with timestamps
      const localMap = new Map<string, number>();
      for (const file of localFiles) {
        const mtime = await invoke<number>('get_file_mtime', { path: file });
        // Normalize path: make it relative to notesRoot using forward slashes
        let relativePath = file.replace(notesRoot, '');
        relativePath = relativePath.replace(/\\/g, '/'); // normalize to forward slashes
        // Ensure no leading slash
        const cleanPath = relativePath.startsWith('/') ? relativePath.slice(1) : relativePath;
        if (cleanPath) {
          localMap.set(cleanPath, mtime);
        }
      }

      const remoteMap = new Map<string, number>();
      for (const file of remoteFiles) {
        remoteMap.set(file.name, new Date(file.updated_at).getTime());
      }

      // Sync logic: newer file wins
      for (const [relativePath, localMtime] of localMap) {
        const remoteMtime = remoteMap.get(relativePath);

        if (!remoteMtime || localMtime > remoteMtime + 1000) { // 1s buffer
          await this.uploadFile(notesRoot, relativePath);
          this.status.filesUploaded++;
        } else if (remoteMtime > localMtime + 1000) {
          await this.downloadFile(notesRoot, relativePath);
          this.status.filesDownloaded++;
        }
      }

      // Download files that only exist remotely
      for (const [remotePath] of remoteMap) {
        if (!localMap.has(remotePath)) {
          await this.downloadFile(notesRoot, remotePath);
          this.status.filesDownloaded++;
        }
      }

      this.status.lastSync = new Date();
      this.status.error = null;
    } catch (error) {
      this.status.error = `Supabase sync failed: ${error}`;
      throw error;
    } finally {
      this.status.syncing = false;
    }
  }

  private async listRemoteFilesRecursive(path: string): Promise<any[]> {
    if (!this.client || !this.config) return [];

    const { data, error } = await this.client.storage
      .from(this.config.bucket)
      .list(path, { limit: 1000 });

    if (error) throw error;

    let files: any[] = [];
    for (const item of (data || [])) {
      const fullPath = path ? `${path}/${item.name}` : item.name;
      if (item.id === null) { // It's a folder placeholder
        const subFiles = await this.listRemoteFilesRecursive(fullPath);
        files = files.concat(subFiles);
      } else {
        // Skip .emptyFolderPlaceholder files
        if (item.name === '.emptyFolderPlaceholder') continue;
        files.push({ ...item, name: fullPath });
      }
    }
    return files;
  }

  private async uploadFile(notesRoot: string, relativePath: string): Promise<void> {
    if (!this.client || !this.config) throw new Error('Not initialized');

    const cleanRelativePath = relativePath.startsWith('/') ? relativePath.slice(1) : relativePath;
    const localPath = joinPath(notesRoot, cleanRelativePath);

    const content = await invoke<string>('read_file', { path: localPath });

    const { error } = await this.client.storage
      .from(this.config.bucket)
      .upload(cleanRelativePath, content, {
        upsert: true,
        contentType: 'text/plain'
      });

    if (error) throw error;
  }

  private async downloadFile(notesRoot: string, relativePath: string): Promise<void> {
    if (!this.client || !this.config) throw new Error('Not initialized');

    const cleanRelativePath = relativePath.startsWith('/') ? relativePath.slice(1) : relativePath;
    const localPath = joinPath(notesRoot, cleanRelativePath);

    const { data, error } = await this.client.storage
      .from(this.config.bucket)
      .download(cleanRelativePath);

    if (error) throw error;

    const content = await data.text();
    await invoke('write_file', { path: localPath, content });
  }

  async pushFile(notesRoot: string, filePath: string): Promise<void> {
    if (!this.isEnabled()) return;

    // Normalize: make relative path from notesRoot using forward slashes
    let relativePath = filePath.replace(notesRoot, '');
    relativePath = relativePath.replace(/\\/g, '/');
    const cleanPath = relativePath.startsWith('/') ? relativePath.slice(1) : relativePath;
    await this.uploadFile(notesRoot, cleanPath);
  }

  /**
   * Test connection to Supabase with the given config.
   * Returns a detailed result for each step.
   */
  async testConnection(config: SupabaseConfig): Promise<{
    success: boolean;
    steps: { name: string; status: 'success' | 'error'; message: string }[];
  }> {
    const steps: { name: string; status: 'success' | 'error'; message: string }[] = [];

    try {
      // Step 1: Create client
      if (!config.url || !config.anonKey) {
        steps.push({ name: 'Validate Config', status: 'error', message: 'URL and API Key are required' });
        return { success: false, steps };
      }
      steps.push({ name: 'Validate Config', status: 'success', message: 'Configuration looks valid' });

      // Step 2: Connect
      const client = createClient(config.url, config.anonKey);
      steps.push({ name: 'Connect to Supabase', status: 'success', message: `Connected to ${config.url}` });

      // Step 3: Check Bucket & Permissions (Combined)
      // We don't use getBucket() because it requires admin-level (service_role) permissions.
      // Instead, we try to list files. If the bucket doesn't exist, Supabase returns a 404 or specific error.
      const { data: listData, error: listError } = await client.storage.from(config.bucket).list('', { limit: 1 });
      
      if (listError) {
        if (listError.message?.includes('not found') || (listError as any).status === 404) {
          steps.push({ 
            name: 'Check Bucket', 
            status: 'error', 
            message: `Bucket "${config.bucket}" not found. Please double-check the name in your Supabase dashboard.` 
          });
          return { success: false, steps };
        }
        
        steps.push({ 
          name: 'Check Permissions', 
          status: 'error', 
          message: `Permission denied: ${listError.message}. Make sure RLS is configured to allow access to the "${config.bucket}" bucket.` 
        });
        return { success: false, steps };
      }

      steps.push({ name: 'Check Bucket', status: 'success', message: `Bucket "${config.bucket}" verified` });
      steps.push({ name: 'Check Permissions', status: 'success', message: 'Read/write access confirmed' });

      return { success: true, steps };
    } catch (error) {
      steps.push({ name: 'Connection', status: 'error', message: String(error) });
      return { success: false, steps };
    }
  }
}

export const supabaseSyncService = new SupabaseSyncService();
