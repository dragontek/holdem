import React, { useState } from 'react';
import { Database, X, Check, Copy, ExternalLink, ShieldCheck } from 'lucide-react';
import { isAppwriteConfigured } from '../lib/appwrite';

interface AppwriteSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AppwriteSetupModal: React.FC<AppwriteSetupModalProps> = ({ isOpen, onClose }) => {
  const [endpoint, setEndpoint] = useState<string>(import.meta.env.VITE_APPWRITE_ENDPOINT || '');
  const [projectId, setProjectId] = useState<string>(import.meta.env.VITE_APPWRITE_PROJECT_ID || '');
  const [databaseId, setDatabaseId] = useState<string>(import.meta.env.VITE_APPWRITE_DATABASE_ID || 'holdem_db');
  const [copied, setCopied] = useState<boolean>(false);

  if (!isOpen) return null;

  const envTemplate = `# Hold'em League Pro Appwrite Environment Variables
VITE_APPWRITE_ENDPOINT=${endpoint || 'https://appwrite.yourdomain.com/v1'}
VITE_APPWRITE_PROJECT_ID=${projectId || '64a...'}
VITE_APPWRITE_DATABASE_ID=${databaseId || 'holdem_db'}`;

  const handleCopyEnv = () => {
    navigator.clipboard.writeText(envTemplate);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="glass-panel rounded-3xl p-6 border border-slate-800 max-w-lg w-full relative space-y-5 shadow-2xl">
        
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-white p-1"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-black text-white">Self-Hosted Appwrite Backend</h3>
            <p className="text-xs text-slate-400">Configure your local or self-hosted Appwrite endpoint</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">Appwrite Endpoint URL</label>
            <input
              type="text"
              placeholder="e.g. https://appwrite.yourdomain.com/v1"
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
              className="w-full bg-slate-950 text-xs font-mono text-white p-3 rounded-xl border border-slate-800 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">Project ID</label>
            <input
              type="text"
              placeholder="e.g. 64a89bc..."
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full bg-slate-950 text-xs font-mono text-white p-3 rounded-xl border border-slate-800 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">Database ID</label>
            <input
              type="text"
              placeholder="holdem_db"
              value={databaseId}
              onChange={(e) => setDatabaseId(e.target.value)}
              className="w-full bg-slate-950 text-xs font-mono text-white p-3 rounded-xl border border-slate-800 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        {/* .env Copy Snippet Box */}
        <div className="bg-slate-950 rounded-2xl p-4 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold text-slate-300">Save to .env file:</span>
            <button
              onClick={handleCopyEnv}
              className="flex items-center gap-1 text-amber-400 hover:underline text-xs font-bold"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied!' : 'Copy .env snippet'}
            </button>
          </div>
          <pre className="text-[11px] font-mono text-emerald-400 overflow-x-auto p-2 bg-slate-900 rounded-lg">
            {envTemplate}
          </pre>
        </div>

        <div className="flex items-center justify-between pt-2">
          <div className="text-xs text-slate-400 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Fallback mock database is currently active</span>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all"
          >
            Save & Continue
          </button>
        </div>

      </div>
    </div>
  );
};
