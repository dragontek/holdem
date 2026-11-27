import React from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Download, PlusSquare, RefreshCw, Share, Smartphone, WifiOff, X } from 'lucide-react';

export interface PwaStatusBarProps {
  isOffline: boolean;
  updateAvailable: boolean;
  showInstallBanner: boolean;
  isIosSafari: boolean;
  showIosGuide: boolean;
  onCloseIosGuide: () => void;
  onInstall: () => void;
  onDismissInstall: () => void;
  onApplyUpdate: () => void;
}

export const PwaStatusBar: React.FC<PwaStatusBarProps> = ({
  isOffline,
  updateAvailable,
  showInstallBanner,
  isIosSafari,
  showIosGuide,
  onCloseIosGuide,
  onInstall,
  onDismissInstall,
  onApplyUpdate,
}) => {
  return (
    <>
      {/* Offline Indicator Bar */}
      {isOffline && (
        <div
          role="status"
          className="no-print bg-amber-500/15 border-b border-amber-500/30 text-amber-200 px-3 py-2 text-xs font-semibold"
        >
          <div className="max-w-7xl mx-auto flex items-center justify-center gap-2">
            <WifiOff className="w-3.5 h-3.5 text-amber-400 shrink-0" aria-hidden="true" />
            <span>Offline mode — showing cached league data. Live sync will resume automatically.</span>
          </div>
        </div>
      )}

      {/* Service Worker Update Ready Banner */}
      {updateAvailable && (
        <div
          role="status"
          className="no-print bg-emerald-500/15 border-b border-emerald-500/30 text-emerald-200 px-3 py-2 text-xs"
        >
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <RefreshCw className="w-3.5 h-3.5 text-emerald-400 shrink-0" aria-hidden="true" />
              <span className="font-semibold truncate">
                A newer version of Jack Ten Poker is ready.
              </span>
            </div>
            <Button
              type="button"
              size="sm"
              variant="success"
              onClick={onApplyUpdate}
              className="h-8 px-3 text-xs shrink-0"
            >
              Update Now
            </Button>
          </div>
        </div>
      )}

      {/* Subtle Dismissible Install App Banner (mobile-first, unobtrusive) */}
      {showInstallBanner && !isOffline && !updateAvailable && (
        <div className="no-print bg-slate-900/90 border-b border-slate-800 px-3 py-2">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg felt-gradient border border-emerald-500/40 flex items-center justify-center text-amber-400 shrink-0">
                <Smartphone className="w-4 h-4" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-white truncate">Install Jack Ten Poker</p>
                <p className="text-[11px] text-slate-400 truncate">
                  {isIosSafari
                    ? 'Add to your Home Screen for full-screen live clocks'
                    : 'One-tap home screen launch with offline support'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <Button
                type="button"
                size="sm"
                variant="default"
                onClick={onInstall}
                className="h-9 px-3 text-xs font-bold"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Install</span>
              </Button>
              <button
                type="button"
                onClick={onDismissInstall}
                aria-label="Dismiss install prompt"
                className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* iOS Safari Add-to-Home-Screen Guided Dialog */}
      <Dialog open={showIosGuide} onOpenChange={(open) => !open && onCloseIosGuide()}>
        <DialogContent className="max-w-md bg-slate-950 border-slate-800">
          <DialogHeader className="text-left">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl felt-gradient border border-emerald-500/40 flex items-center justify-center text-amber-400 shrink-0">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle>Install on iPhone or iPad</DialogTitle>
                <DialogDescription>
                  Run Jack Ten Poker as a full-screen app from your Home Screen
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <ol className="space-y-3 text-xs text-slate-300 py-1">
            <li className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/80 border border-slate-800">
              <span className="w-6 h-6 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 font-black flex items-center justify-center shrink-0">
                1
              </span>
              <span className="leading-relaxed">
                Tap the <strong className="text-white inline-flex items-center gap-1">
                  <Share className="w-3.5 h-3.5 text-amber-400" /> Share
                </strong>{' '}
                button in Safari&apos;s toolbar.
              </span>
            </li>
            <li className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/80 border border-slate-800">
              <span className="w-6 h-6 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 font-black flex items-center justify-center shrink-0">
                2
              </span>
              <span className="leading-relaxed">
                Scroll down and tap{' '}
                <strong className="text-white inline-flex items-center gap-1">
                  <PlusSquare className="w-3.5 h-3.5 text-emerald-400" /> Add to Home Screen
                </strong>
                .
              </span>
            </li>
            <li className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/80 border border-slate-800">
              <span className="w-6 h-6 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 font-black flex items-center justify-center shrink-0">
                3
              </span>
              <span className="leading-relaxed">
                Tap <strong className="text-white">Add</strong> in the top-right corner to launch Jack Ten Poker like a native app.
              </span>
            </li>
          </ol>

          <DialogFooter>
            <Button type="button" variant="default" onClick={onCloseIosGuide} className="w-full sm:w-auto h-11">
              Got It
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
