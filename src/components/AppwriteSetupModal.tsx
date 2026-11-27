import React, { useState } from 'react';
import type { UserRole } from '@/types/holdem';
import { isAppwriteConfigured } from '@/lib/appwrite';
import { AppwriteService } from '@/services/appwriteService';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Copy,
  Database,
  Loader2,
  RotateCcw,
  ShieldCheck,
  Trash2,
} from 'lucide-react';

export interface AppwriteSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  canManageData?: boolean;
  currentUserRole?: UserRole;
  onDataReseeded?: () => Promise<void> | void;
}

export const AppwriteSetupModal: React.FC<AppwriteSetupModalProps> = ({
  isOpen,
  onClose,
  canManageData = false,
  currentUserRole,
  onDataReseeded,
}) => {
  const [endpoint, setEndpoint] = useState<string>(import.meta.env.VITE_APPWRITE_ENDPOINT || '');
  const [projectId, setProjectId] = useState<string>(import.meta.env.VITE_APPWRITE_PROJECT_ID || '');
  const [databaseId, setDatabaseId] = useState<string>(
    import.meta.env.VITE_APPWRITE_DATABASE_ID || 'holdem_db'
  );
  const [copied, setCopied] = useState<boolean>(false);

  const [confirmResetStep, setConfirmResetStep] = useState(false);
  const [isReseeding, setIsReseeding] = useState(false);
  const [progressText, setProgressText] = useState('');
  const [reseedResult, setReseedResult] = useState<string>('');
  const [reseedError, setReseedError] = useState<string>('');

  const envTemplate = `# Jack Ten Poker Appwrite Environment Variables
VITE_APPWRITE_ENDPOINT=${endpoint || 'https://appwrite.yourdomain.com/v1'}
VITE_APPWRITE_PROJECT_ID=${projectId || '64a...'}
VITE_APPWRITE_DATABASE_ID=${databaseId || 'holdem_db'}`;

  const handleCopyEnv = () => {
    void navigator.clipboard.writeText(envTemplate);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClearAndReseed = async () => {
    if (!canManageData || currentUserRole !== 'admin') {
      setReseedError('Only Platform Admins (role: admin) can clear and re-seed data.');
      return;
    }
    setIsReseeding(true);
    setReseedError('');
    setReseedResult('');
    setProgressText('Starting clear & re-seed...');

    try {
      const summary = await AppwriteService.clearAndReseedAppwrite(currentUserRole, (step) => {
        setProgressText(step);
      });
      if (onDataReseeded) {
        setProgressText('Reloading fresh data...');
        await onDataReseeded();
      }
      setConfirmResetStep(false);
      setReseedResult(
        summary.usedAppwrite
          ? `Cleared ${summary.deletedRows} rows and seeded ${summary.seededRows} fresh rows with Appwrite-generated IDs.`
          : 'Cleared local caches and restored fresh Jack Ten Poker demo data.'
      );
    } catch (err: unknown) {
      setReseedError(err instanceof Error ? err.message : 'Failed to clear and re-seed data.');
    } finally {
      setIsReseeding(false);
      setProgressText('');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isReseeding && onClose()}>
      <DialogContent className="max-w-lg max-h-[92dvh] overflow-y-auto bg-slate-950 border-slate-800 p-6">
        <DialogHeader className="text-left pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <DialogTitle className="text-lg font-bold text-white">
                  Appwrite Backend &amp; Data
                </DialogTitle>
                <Badge variant={isAppwriteConfigured ? 'success' : 'secondary'} className="text-[10px]">
                  {isAppwriteConfigured ? 'Connected' : 'Demo Mode'}
                </Badge>
              </div>
              <DialogDescription className="text-xs text-slate-400">
                Inspect connection settings or clear and re-seed league data
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="aw-endpoint" className="text-xs">Appwrite Endpoint URL</Label>
              <Input
                id="aw-endpoint"
                type="text"
                placeholder="https://appwrite.yourdomain.com/v1"
                value={endpoint}
                onChange={(e) => setEndpoint(e.target.value)}
                className="font-mono text-xs"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="aw-project" className="text-xs">Project ID</Label>
                <Input
                  id="aw-project"
                  type="text"
                  placeholder="64a89bc..."
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="font-mono text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="aw-db" className="text-xs">Database ID</Label>
                <Input
                  id="aw-db"
                  type="text"
                  placeholder="holdem_db"
                  value={databaseId}
                  onChange={(e) => setDatabaseId(e.target.value)}
                  className="font-mono text-xs"
                />
              </div>
            </div>
          </div>

          {/* .env Copy Snippet */}
          <div className="bg-slate-900/80 rounded-xl p-3.5 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold text-slate-300">.env Configuration</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleCopyEnv}
                className="h-7 px-2 text-xs text-amber-400"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </div>
            <pre className="text-[11px] font-mono text-emerald-400 overflow-x-auto p-2.5 bg-slate-950 rounded-lg border border-slate-800">
              {envTemplate}
            </pre>
          </div>

          {/* Clear All Data & Re-Seed (Platform Admin Only) */}
          {canManageData && currentUserRole === 'admin' && (
            <div className="rounded-xl border border-rose-500/35 bg-rose-950/20 p-4 space-y-3">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-rose-300">
                      Clear All Data &amp; Re-Seed
                    </span>
                    <Badge variant="destructive" className="text-[9px]">
                      App Admin Only
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Deletes all rows across Appwrite tables and re-seeds fresh{' '}
                    <strong className="text-white">Jack Ten Poker</strong> data using
                    Appwrite-generated IDs. You can also run{' '}
                    <code className="text-amber-300 font-mono">npm run reseed:appwrite</code> from
                    the CLI.
                  </p>
                </div>
              </div>

              {isReseeding && progressText && (
                <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 text-xs text-amber-300 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                  <span>{progressText}</span>
                </div>
              )}

              {reseedResult && (
                <div className="p-2.5 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-xs text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{reseedResult}</span>
                </div>
              )}

              {reseedError && (
                <div
                  role="alert"
                  className="p-2.5 rounded-lg bg-rose-500/15 border border-rose-500/40 text-xs text-rose-300"
                >
                  {reseedError}
                </div>
              )}

              {!confirmResetStep ? (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  disabled={isReseeding}
                  onClick={() => {
                    setReseedResult('');
                    setReseedError('');
                    setConfirmResetStep(true);
                  }}
                  className="w-full h-10 text-xs font-bold"
                >
                  <Trash2 className="w-4 h-4" />
                  Clear All Appwrite Data &amp; Re-Seed
                </Button>
              ) : (
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isReseeding}
                    onClick={() => setConfirmResetStep(false)}
                    className="h-10 text-xs flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    disabled={isReseeding}
                    onClick={() => void handleClearAndReseed()}
                    className="h-10 text-xs font-bold flex-1"
                  >
                    <RotateCcw className="w-4 h-4" />
                    {isReseeding ? 'Re-Seeding...' : 'Yes, Wipe & Re-Seed Now'}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
          <div className="text-xs text-slate-400 flex items-center gap-1.5 mr-auto">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              {isAppwriteConfigured ? 'Live Appwrite + offline cache' : 'Offline demo fallback active'}
            </span>
          </div>
          <Button type="button" onClick={onClose} disabled={isReseeding}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
