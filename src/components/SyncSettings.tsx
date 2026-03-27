import { useState, useEffect } from 'react';
import { useSyncStore } from '../store/useSyncStore';
import {
  Cloud, CloudOff, RefreshCw, Check, X, AlertCircle, Zap,
  Database, Server, Shield, Eye, EyeOff, CheckCircle2
} from 'lucide-react';
import { supabaseSyncService } from '../services/supabaseService';
import { syncService as webdavSyncService } from '../services/syncService';

interface SetupStep {
  name: string;
  status: 'pending' | 'running' | 'success' | 'error';
  message: string;
}

export default function SyncSettings() {
  const { config, status, updateConfig, syncNow, disconnect } = useSyncStore();
  const [formData, setFormData] = useState(config);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testSteps, setTestSteps] = useState<SetupStep[]>([]);
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    setFormData(config);
  }, [config]);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      await updateConfig({ ...formData, enabled: true });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to save sync config:', error);
      // Ensure the error is shown in the store's status
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

  const handleDisconnect = () => {
    disconnect();
    setTestSteps([]);
    setSaveSuccess(false);
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestSteps([]);

    try {
      if (formData.mode === 'supabase') {
        const { supabase } = formData;
        const result = await supabaseSyncService.testConnection({
          url: supabase.url,
          anonKey: supabase.anonKey,
          bucket: supabase.bucket,
          enabled: true
        });
        
        // Convert service steps to UI steps if needed, but our UI expects name/status/message
        setTestSteps(result.steps as SetupStep[]);
      } else {
        const { webdav } = formData;
        const result = await webdavSyncService.testConnection({
          url: webdav.url,
          username: webdav.username,
          password: webdav.password,
          remotePath: webdav.remotePath,
          enabled: true
        });
        setTestSteps(result.steps as SetupStep[]);
      }
    } catch (error) {
      setTestSteps([{ name: 'Test Failed', status: 'error', message: String(error) }]);
    } finally {
      setIsTesting(false);
    }
  };

  const formatDate = (date: Date | null) => {
    if (!date) return 'Never';
    return new Intl.DateTimeFormat('en-US', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(date));
  };

  const allTestsPassed = testSteps.length > 0 && testSteps.every(s => s.status === 'success');
  
  // Can we connect? We allow connecting if basic fields are present, even without a test.
  // But we show a better experience if they test first.
  const canConnect = formData.mode === 'supabase' 
    ? (formData.supabase.url && formData.supabase.anonKey)
    : (formData.webdav.url);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {config.enabled ? (
            <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
              <Cloud className="text-primary" size={16} />
            </div>
          ) : (
            <div className="w-8 h-8 rounded-lg bg-surface flex items-center justify-center">
              <CloudOff className="text-text/30" size={16} />
            </div>
          )}
          <div>
            <h3 className="text-sm font-semibold text-text">Cloud Sync</h3>
            <p className="text-[11px] text-text/50">
              {config.enabled
                ? `Connected via ${config.mode === 'supabase' ? 'Supabase Storage' : 'WebDAV'}`
                : 'Sync your notes across devices'}
            </p>
          </div>
        </div>

        {config.enabled && (
          <button
            onClick={handleSync}
            disabled={status.syncing}
            className="flex items-center gap-2 px-3 py-1.5 bg-primary/15 text-primary text-xs font-medium rounded-lg hover:bg-primary/25 disabled:opacity-50 disabled:cursor-not-allowed transition-colors border border-primary/20"
          >
            <RefreshCw size={12} className={status.syncing ? 'animate-spin' : ''} />
            {status.syncing ? 'Syncing...' : 'Sync Now'}
          </button>
        )}
      </div>

      {/* Security Note */}
      <div className="flex items-start gap-2.5 p-3 rounded-lg bg-green-500/5 border border-green-500/15">
        <Shield size={14} className="text-green-400 mt-0.5 flex-shrink-0" />
        <p className="text-[10px] text-text/60 leading-relaxed">
          <span className="text-green-400 font-medium">Secure:</span> Your credentials are stored
          locally on this device only — never pushed to remote or shared. This is an open-source project; your data stays private.
        </p>
      </div>

      {/* Mode Selector */}
      <div className="flex p-1 bg-surface/50 rounded-xl border border-border/50">
        <button
          onClick={() => setFormData({ ...formData, mode: 'supabase' })}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-medium transition-all ${
            formData.mode === 'supabase'
              ? 'bg-surface border border-border text-primary shadow-sm'
              : 'text-text/40 hover:text-text/70'
          }`}
        >
          <Database size={14} />
          Supabase Cloud
        </button>
        <button
          onClick={() => setFormData({ ...formData, mode: 'webdav' })}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-medium transition-all ${
            formData.mode === 'webdav'
              ? 'bg-surface border border-border text-primary shadow-sm'
              : 'text-text/40 hover:text-text/70'
          }`}
        >
          <Server size={14} />
          WebDAV / NAS
        </button>
      </div>

      {/* Sync Status (when connected) */}
      {config.enabled && (
        <div className="p-4 bg-surface/30 rounded-xl border border-border/40 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-text/50">Status</span>
            <span className={`font-medium ${status.error ? 'text-red-400' : 'text-green-400'}`}>
              {status.syncing ? 'Syncing...' : status.error ? 'Error' : 'Connected'}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-text/50">Last Sync</span>
            <span className="text-text/80">{formatDate(status.lastSync)}</span>
          </div>
          {status.lastSync && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-text/50">Last Transfer</span>
              <span className="text-text/80">
                ↑{status.filesUploaded} ↓{status.filesDownloaded} 
                {(status.filesDeletedLocal > 0 || status.filesDeletedRemote > 0) && (
                  <span className="ml-1 text-red-400">
                    🗑️{status.filesDeletedLocal + status.filesDeletedRemote}
                  </span>
                )} files
              </span>
            </div>
          )}
          {status.error && (
            <div className="flex items-start gap-2 text-xs text-red-400 mt-1 p-2 bg-red-500/5 rounded-lg border border-red-500/10">
              <AlertCircle size={12} className="flex-shrink-0 mt-0.5" />
              <span className="break-all">{status.error}</span>
            </div>
          )}
        </div>
      )}

      {/* Configuration Form */}
      <div className="space-y-4">
        {formData.mode === 'supabase' ? (
          <>
            {/* Quick Setup Guide */}
            {!config.enabled && (
              <div className="p-3 bg-primary/5 rounded-lg border border-primary/10 space-y-2">
                <p className="text-[11px] font-medium text-text/80">Quick Setup:</p>
                <ol className="text-[10px] text-text/50 space-y-1 list-decimal list-inside">
                  <li>Go to <span className="text-primary">supabase.com</span> and create a free project</li>
                  <li>In Dashboard → <span className="text-text/70">Storage</span>, create a bucket named <code className="text-primary bg-primary/10 px-1 rounded">jpad-notes</code></li>
                  <li>Copy your <span className="text-text/70">Project URL</span> and <span className="text-text/70">anon key</span> from Settings → API</li>
                  <li>Paste them below and hit <span className="text-text/70">Connect</span></li>
                </ol>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-medium text-text/60 mb-1.5">Project URL</label>
              <input
                type="url"
                value={formData.supabase.url}
                onChange={(e) => setFormData({ ...formData, supabase: { ...formData.supabase, url: e.target.value } })}
                placeholder="https://your-project-id.supabase.co"
                className="w-full px-3 py-2 bg-surface/50 border border-border/50 rounded-lg text-xs text-text placeholder:text-text/20 focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/30 transition-all font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-text/60 mb-1.5">Anon API Key</label>
              <div className="relative">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={formData.supabase.anonKey}
                  onChange={(e) => setFormData({ ...formData, supabase: { ...formData.supabase, anonKey: e.target.value } })}
                  placeholder="eyJhbGciOi..."
                  className="w-full px-3 py-2 pr-9 bg-surface/50 border border-border/50 rounded-lg text-xs text-text placeholder:text-text/20 focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/30 transition-all font-mono"
                />
                <button
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-text/30 hover:text-text/60 transition-colors"
                  title={showKey ? 'Hide key' : 'Show key'}
                >
                  {showKey ? <EyeOff size={12} /> : <Eye size={12} />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-text/60 mb-1.5">Bucket Name</label>
              <input
                type="text"
                value={formData.supabase.bucket}
                onChange={(e) => setFormData({ ...formData, supabase: { ...formData.supabase, bucket: e.target.value } })}
                placeholder="jpad-notes"
                className="w-full px-3 py-2 bg-surface/50 border border-border/50 rounded-lg text-xs text-text placeholder:text-text/20 focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/30 transition-all"
              />
            </div>
          </>
        ) : (
          <>
            <div>
              <label className="block text-[11px] font-medium text-text/60 mb-1.5">WebDAV Server URL</label>
              <input
                type="url"
                value={formData.webdav.url}
                onChange={(e) => setFormData({ ...formData, webdav: { ...formData.webdav, url: e.target.value } })}
                placeholder="https://your-synology.com:5006"
                className="w-full px-3 py-2 bg-surface/50 border border-border/50 rounded-lg text-xs text-text placeholder:text-text/20 focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/30 transition-all"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-text/60 mb-1.5">Username</label>
                <input
                  type="text"
                  value={formData.webdav.username}
                  onChange={(e) => setFormData({ ...formData, webdav: { ...formData.webdav, username: e.target.value } })}
                  className="w-full px-3 py-2 bg-surface/50 border border-border/50 rounded-lg text-xs text-text focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-text/60 mb-1.5">Password</label>
                <input
                  type="password"
                  value={formData.webdav.password}
                  onChange={(e) => setFormData({ ...formData, webdav: { ...formData.webdav, password: e.target.value } })}
                  className="w-full px-3 py-2 bg-surface/50 border border-border/50 rounded-lg text-xs text-text focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all"
                />
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-text/60 mb-1.5">Remote Path</label>
              <input
                type="text"
                value={formData.webdav.remotePath}
                onChange={(e) => setFormData({ ...formData, webdav: { ...formData.webdav, remotePath: e.target.value } })}
                placeholder="/jpad-notes"
                className="w-full px-3 py-2 bg-surface/50 border border-border/50 rounded-lg text-xs text-text placeholder:text-text/20 focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all"
              />
            </div>
          </>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-2">
          <button
            onClick={handleTestConnection}
            disabled={isTesting || !canConnect}
            className="flex items-center gap-1.5 px-3 py-2 bg-surface/50 text-text/80 border border-border/50 rounded-lg hover:bg-surface-hover text-xs font-medium disabled:opacity-30 transition-all"
          >
            {isTesting ? <RefreshCw size={12} className="animate-spin" /> : <Zap size={12} />}
            {isTesting ? 'Testing...' : 'Test Connection'}
          </button>

          <button
            onClick={handleSave}
            disabled={isSaving || !canConnect}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 text-xs font-semibold disabled:opacity-30 transition-all shadow-sm shadow-primary/20"
          >
            {isSaving ? <RefreshCw size={12} className="animate-spin" /> : saveSuccess ? <CheckCircle2 size={12} /> : <Cloud size={12} />}
            {isSaving ? 'Connecting...' : saveSuccess ? 'Connected!' : config.enabled ? 'Save Changes' : 'Connect'}
          </button>

          {config.enabled && (
            <button
              onClick={handleDisconnect}
              className="flex items-center gap-1.5 px-3 py-2 bg-surface/50 border border-border/50 text-text/60 rounded-lg hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 text-xs font-medium transition-all"
            >
              <X size={12} />
              Disconnect
            </button>
          )}
        </div>
      </div>

      {/* Test Results */}
      {testSteps.length > 0 && (
        <div className="p-4 bg-surface/30 rounded-xl border border-border/40 space-y-2">
          <p className="text-[10px] font-medium text-text/40 uppercase tracking-wider mb-2">Connection Test</p>
          {testSteps.map((step, index) => (
            <div key={index} className="flex items-center gap-2.5 text-xs">
              <div className="w-4 flex justify-center">
                {step.status === 'pending' && <div className="w-1.5 h-1.5 rounded-full bg-text/15" />}
                {step.status === 'running' && <RefreshCw size={12} className="text-primary animate-spin" />}
                {step.status === 'success' && <Check size={12} className="text-green-400" />}
                {step.status === 'error' && <X size={12} className="text-red-400" />}
              </div>
              <div className="flex-1 min-w-0">
                <span className={`text-[11px] ${
                  step.status === 'success' ? 'text-green-400' :
                  step.status === 'error' ? 'text-red-400' :
                  step.status === 'running' ? 'text-primary' :
                  'text-text/30'
                }`}>
                  {step.name}
                </span>
                {step.message && (
                  <p className="text-[10px] text-text/40 mt-0.5 break-all">{step.message}</p>
                )}
              </div>
            </div>
          ))}
          {allTestsPassed && (
            <div className="mt-3 pt-3 border-t border-border/30 flex items-center gap-2 text-green-400 text-[11px] font-medium">
              <CheckCircle2 size={14} />
              All checks passed — ready to connect!
            </div>
          )}
        </div>
      )}
    </div>
  );
}
