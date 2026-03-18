import { useState, useEffect } from 'react';
import { useSyncStore } from '../store/useSyncStore';
import { Cloud, CloudOff, RefreshCw, Check, X, AlertCircle, Zap } from 'lucide-react';

interface TestResult {
  step: string;
  status: 'pending' | 'success' | 'error';
  message: string;
}

export default function SyncSettings() {
  const { config, status, updateConfig, syncNow } = useSyncStore();
  const [formData, setFormData] = useState(config);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);

  useEffect(() => {
    setFormData(config);
  }, [config]);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    
    try {
      await updateConfig(formData);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to save sync config:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSync = async () => {
    try {
      await syncNow();
    } catch (error) {
      console.error('Sync failed:', error);
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResults([]);

    const results: TestResult[] = [
      { step: 'Validating URL format', status: 'pending', message: '' },
      { step: 'Testing connection', status: 'pending', message: '' },
      { step: 'Verifying credentials', status: 'pending', message: '' },
      { step: 'Checking remote folder', status: 'pending', message: '' },
      { step: 'Listing files', status: 'pending', message: '' },
    ];

    setTestResults([...results]);

    try {
      // Step 1: Validate URL
      await new Promise(resolve => setTimeout(resolve, 300));
      if (!formData.url || !formData.url.startsWith('http')) {
        results[0].status = 'error';
        results[0].message = 'Invalid URL format. Must start with http:// or https://';
        setTestResults([...results]);
        setIsTesting(false);
        return;
      }
      results[0].status = 'success';
      results[0].message = 'URL format is valid';
      setTestResults([...results]);

      // Step 2: Test connection
      await new Promise(resolve => setTimeout(resolve, 300));
      const { createClient } = await import('webdav');
      const { fetch: tauriFetch } = await import('@tauri-apps/plugin-http');
      const client = createClient(formData.url, {
        username: formData.username,
        password: formData.password,
        httpAgent: tauriFetch as any,
      });

      try {
        await client.exists('/');
        results[1].status = 'success';
        results[1].message = 'Successfully connected to WebDAV server';
        setTestResults([...results]);
      } catch (error) {
        results[1].status = 'error';
        results[1].message = `Connection failed: ${error}`;
        setTestResults([...results]);
        setIsTesting(false);
        return;
      }

      // Step 3: Verify credentials
      await new Promise(resolve => setTimeout(resolve, 300));
      try {
        await client.getDirectoryContents('/');
        results[2].status = 'success';
        results[2].message = 'Credentials are valid';
        setTestResults([...results]);
      } catch (error) {
        results[2].status = 'error';
        results[2].message = 'Authentication failed. Check username/password';
        setTestResults([...results]);
        setIsTesting(false);
        return;
      }

      // Step 4: Check/create remote folder
      await new Promise(resolve => setTimeout(resolve, 300));
      try {
        const folderExists = await client.exists(formData.remotePath);
        if (!folderExists) {
          await client.createDirectory(formData.remotePath);
          results[3].status = 'success';
          results[3].message = `Folder created: ${formData.remotePath}`;
        } else {
          results[3].status = 'success';
          results[3].message = `Folder exists: ${formData.remotePath}`;
        }
        setTestResults([...results]);
      } catch (error) {
        results[3].status = 'error';
        results[3].message = `Failed to access/create folder: ${error}`;
        setTestResults([...results]);
        setIsTesting(false);
        return;
      }

      // Step 5: List files
      await new Promise(resolve => setTimeout(resolve, 300));
      try {
        const contents = await client.getDirectoryContents(formData.remotePath);
        const fileCount = Array.isArray(contents) ? contents.filter((item: any) => item.type === 'file').length : 0;
        results[4].status = 'success';
        if (fileCount === 0) {
          results[4].message = 'Folder is empty (ready for first sync)';
        } else {
          results[4].message = `Found ${fileCount} file(s) in remote folder`;
        }
        setTestResults([...results]);
      } catch (error) {
        results[4].status = 'error';
        results[4].message = `Failed to list files: ${error}`;
        setTestResults([...results]);
        setIsTesting(false);
        return;
      }

      setIsTesting(false);
    } catch (error) {
      console.error('Test failed:', error);
      setIsTesting(false);
    }
  };

  const formatDate = (date: Date | null) => {
    if (!date) return 'Never';
    return new Intl.DateTimeFormat('en-US', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(date);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {config.enabled ? (
            <Cloud className="text-primary" size={24} />
          ) : (
            <CloudOff className="text-text/30" size={24} />
          )}
          <div>
            <h3 className="text-lg font-semibold text-text">Cloud Sync</h3>
            <p className="text-sm text-text/50">
              {config.enabled ? 'Connected to WebDAV server' : 'Not configured'}
            </p>
          </div>
        </div>
        
        {config.enabled && (
          <button
            onClick={handleSync}
            disabled={status.syncing}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <RefreshCw size={16} className={status.syncing ? 'animate-spin' : ''} />
            {status.syncing ? 'Syncing...' : 'Sync Now'}
          </button>
        )}
      </div>

      {/* Sync Status */}
      {config.enabled && (
        <div className="p-4 bg-surface rounded-lg border border-border space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-text/70">Last Sync:</span>
            <span className="text-text">{formatDate(status.lastSync)}</span>
          </div>
          {status.lastSync && (
            <>
              <div className="flex items-center justify-between text-sm">
                <span className="text-text/70">Files Uploaded:</span>
                <span className="text-text">{status.filesUploaded}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-text/70">Files Downloaded:</span>
                <span className="text-text">{status.filesDownloaded}</span>
              </div>
            </>
          )}
          {status.error && (
            <div className="flex items-start gap-2 text-sm text-red-500 mt-2">
              <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
              <span>{status.error}</span>
            </div>
          )}
        </div>
      )}

      {/* Configuration Form */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-text/70 mb-2">
            WebDAV Server URL
          </label>
          <input
            type="url"
            value={formData.url}
            onChange={(e) => setFormData({ ...formData, url: e.target.value })}
            placeholder="https://your-synology.com:5006"
            className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text placeholder:text-text/30 focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <p className="text-xs text-text/50 mt-1">
            Enable WebDAV on your Synology: Control Panel → File Services → WebDAV
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-text/70 mb-2">
            Username
          </label>
          <input
            type="text"
            value={formData.username}
            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            placeholder="your-username"
            className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text placeholder:text-text/30 focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text/70 mb-2">
            Password
          </label>
          <input
            type="password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            placeholder="••••••••"
            className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text placeholder:text-text/30 focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text/70 mb-2">
            Remote Path
          </label>
          <input
            type="text"
            value={formData.remotePath}
            onChange={(e) => setFormData({ ...formData, remotePath: e.target.value })}
            placeholder="/jpad-notes"
            className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text placeholder:text-text/30 focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <p className="text-xs text-text/50 mt-1">
            Folder path on your WebDAV server (will be created if it doesn't exist)
          </p>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={handleTestConnection}
            disabled={isTesting || !formData.url || !formData.username || !formData.password}
            className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary border border-primary/20 rounded-lg hover:bg-primary/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isTesting ? (
              <RefreshCw size={16} className="animate-spin" />
            ) : (
              <Zap size={16} />
            )}
            {isTesting ? 'Testing...' : 'Test Connection'}
          </button>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSaving ? (
              <RefreshCw size={16} className="animate-spin" />
            ) : saveSuccess ? (
              <Check size={16} />
            ) : null}
            {isSaving ? 'Saving...' : saveSuccess ? 'Saved!' : 'Save & Connect'}
          </button>
          
          {config.enabled && (
            <button
              onClick={() => updateConfig({ enabled: false })}
              className="flex items-center gap-2 px-4 py-2 bg-surface border border-border text-text rounded-lg hover:bg-surface-hover transition-colors"
            >
              <X size={16} />
              Disconnect
            </button>
          )}
        </div>
      </div>

      {/* Test Results */}
      {testResults.length > 0 && (
        <div className="p-4 bg-surface rounded-lg border border-border space-y-2">
          <h4 className="text-sm font-semibold text-text mb-3">Connection Test Results</h4>
          {testResults.map((result, index) => (
            <div key={index} className="flex items-start gap-3 text-sm">
              <div className="flex-shrink-0 mt-0.5">
                {result.status === 'pending' && (
                  <RefreshCw size={16} className="text-text/30 animate-spin" />
                )}
                {result.status === 'success' && (
                  <Check size={16} className="text-green-500" />
                )}
                {result.status === 'error' && (
                  <X size={16} className="text-red-500" />
                )}
              </div>
              <div className="flex-1">
                <div className={`font-medium ${
                  result.status === 'success' ? 'text-green-500' :
                  result.status === 'error' ? 'text-red-500' :
                  'text-text/50'
                }`}>
                  {result.step}
                </div>
                {result.message && (
                  <div className="text-xs text-text/60 mt-0.5">{result.message}</div>
                )}
              </div>
            </div>
          ))}
          
          {!isTesting && testResults.every(r => r.status === 'success') && (
            <div className="mt-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
              <div className="flex items-center gap-2 text-green-500 text-sm font-medium">
                <Check size={16} />
                All tests passed! You can now save and start syncing.
              </div>
            </div>
          )}
          
          {!isTesting && testResults.some(r => r.status === 'error') && (
            <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <div className="flex items-start gap-2 text-red-500 text-sm">
                <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-medium">Connection test failed</div>
                  <div className="text-xs mt-1 text-red-400">
                    Please fix the errors above and try again.
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Setup Instructions */}
      <div className="p-4 bg-surface/50 rounded-lg border border-border/50 space-y-2">
        <h4 className="text-sm font-semibold text-text">Setup Instructions:</h4>
        <ol className="text-xs text-text/70 space-y-1 list-decimal list-inside">
          <li>Enable WebDAV on Synology: Control Panel → File Services → WebDAV</li>
          <li>Note the port (usually 5005 for HTTP or 5006 for HTTPS)</li>
          <li>Create a shared folder for JPad notes (optional)</li>
          <li>Enter your Synology credentials above</li>
          <li>Click "Save & Connect" to start syncing</li>
        </ol>
      </div>
    </div>
  );
}
