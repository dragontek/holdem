import React, { useEffect, useRef, useState } from 'react';
import type { LiveScoreNotification, ScoreEventVariant } from '@/lib/liveScoreEvents';
import { Award, Crown, Flame, Skull, Sparkles, Star, Trophy, Volume2, VolumeX, X } from 'lucide-react';

export interface LiveScoreNotificationOverlayProps {
  toasts: LiveScoreNotification[];
  soundEnabled: boolean;
  onToggleSound: () => void;
  onDismiss: (id: string) => void;
}

const AUTO_DISMISS_MS = 60_000;

function getVariantPresentation(variant: ScoreEventVariant) {
  switch (variant) {
    case 'royal_flush':
    case 'straight_flush':
    case 'quads':
      return {
        border: 'border-amber-400/70 bg-slate-950/95',
        badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-400/50',
        icon: <Crown className="w-5 h-5 text-amber-400" aria-hidden="true" />,
        tag: 'MONSTER HAND',
      };
    case 'knockout':
    case 'rebuy_ko':
      return {
        border: 'border-rose-500/60 bg-slate-950/95',
        badgeBg: 'bg-rose-500/20 text-rose-300 border-rose-500/50',
        icon: <Flame className="w-5 h-5 text-rose-400" aria-hidden="true" />,
        tag: variant === 'rebuy_ko' ? 'REBUY KO' : 'KNOCKOUT',
      };
    case 'bust':
      return {
        border: 'border-slate-700 bg-slate-950/95',
        badgeBg: 'bg-slate-800 text-slate-300 border-slate-700',
        icon: <Skull className="w-5 h-5 text-slate-400" aria-hidden="true" />,
        tag: 'ELIMINATION',
      };
    case 'hod_suited':
    case 'hod_offsuit':
      return {
        border: 'border-emerald-500/60 bg-slate-950/95',
        badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50',
        icon: <Sparkles className="w-5 h-5 text-emerald-400" aria-hidden="true" />,
        tag: 'HAND OF THE DAY',
      };
    case 'placement':
      return {
        border: 'border-amber-400/70 bg-slate-950/95',
        badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-400/50',
        icon: <Trophy className="w-5 h-5 text-amber-400" aria-hidden="true" />,
        tag: 'OFFICIAL FINISH',
      };
    case 'survivor':
    case 'show_up':
    case 'points':
    default:
      return {
        border: 'border-amber-500/50 bg-slate-950/95',
        badgeBg: 'bg-amber-500/15 text-amber-300 border-amber-500/40',
        icon:
          variant === 'survivor' ? (
            <Star className="w-5 h-5 text-amber-400" aria-hidden="true" />
          ) : (
            <Award className="w-5 h-5 text-emerald-400" aria-hidden="true" />
          ),
        tag:
          variant === 'survivor'
            ? 'SURVIVOR'
            : variant === 'show_up'
            ? 'SHOW UP BONUS'
            : 'POINTS AWARDED',
      };
  }
}

interface ToastCardItemProps {
  item: LiveScoreNotification;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onDismiss: (id: string, wasKeyboardFocused: boolean) => void;
  registerCloseRef: (id: string, el: HTMLButtonElement | null) => void;
}

const ToastCardItem: React.FC<ToastCardItemProps> = ({
  item,
  soundEnabled,
  onToggleSound,
  onDismiss,
  registerCloseRef,
}) => {
  const [paused, setPaused] = useState(false);
  const onDismissRef = useRef(onDismiss);
  const remainingMsRef = useRef<number>(AUTO_DISMISS_MS);
  const startedAtRef = useRef<number>(0);
  const style = getVariantPresentation(item.variant);

  useEffect(() => {
    onDismissRef.current = onDismiss;
  });

  useEffect(() => {
    if (paused) return;
    startedAtRef.current = Date.now();
    const delay = Math.max(0, remainingMsRef.current);
    const timer = setTimeout(() => {
      onDismissRef.current(item.id, false);
    }, delay);
    return () => {
      clearTimeout(timer);
      const elapsed = Date.now() - startedAtRef.current;
      remainingMsRef.current = Math.max(0, remainingMsRef.current - elapsed);
    };
  }, [item.id, paused]);

  return (
    <div
      className={`score-toast-item rounded-2xl border p-4 shadow-2xl backdrop-blur-md ${style.border}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          setPaused(false);
        }
      }}
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0">
          {style.icon}
        </div>

        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={`px-2 py-0.5 rounded-md border text-[10px] font-black uppercase tracking-wider ${style.badgeBg}`}
            >
              {style.tag}
            </span>
            {item.pointsAwarded > 0 && (
              <span className="px-2 py-0.5 rounded-md bg-amber-500 text-slate-950 font-mono text-xs font-black">
                +{item.pointsAwarded.toLocaleString()} pts
              </span>
            )}
          </div>

          <p className="text-sm font-extrabold text-white leading-snug">{item.headline}</p>

          {item.subtext && (
            <p className="text-[11px] text-slate-400 truncate">{item.subtext}</p>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={onToggleSound}
            aria-label={soundEnabled ? 'Mute live score sound effects' : 'Unmute live score sound effects'}
            className="min-h-[32px] min-w-[32px] p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          >
            {soundEnabled ? (
              <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
            ) : (
              <VolumeX className="w-3.5 h-3.5" aria-hidden="true" />
            )}
          </button>
          <button
            ref={(el) => registerCloseRef(item.id, el)}
            type="button"
            onClick={(e) => {
              const keyboardInitiated = e.detail === 0;
              onDismiss(item.id, keyboardInitiated);
            }}
            aria-label={`Dismiss notification: ${item.headline}`}
            className="min-h-[32px] min-w-[32px] p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
};

export const LiveScoreNotificationOverlay: React.FC<LiveScoreNotificationOverlayProps> = ({
  toasts,
  soundEnabled,
  onToggleSound,
  onDismiss,
}) => {
  const regionRef = useRef<HTMLDivElement | null>(null);
  const closeRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const priorFocusRef = useRef<HTMLElement | null>(null);
  const announcedIdsRef = useRef<Set<string>>(new Set());

  const newestToast = toasts[toasts.length - 1];
  const supportsAriaNotify =
    typeof document !== 'undefined' &&
    typeof (document as Document & { ariaNotify?: unknown }).ariaNotify === 'function';
  const fallbackLiveRegionText =
    !supportsAriaNotify && newestToast
      ? newestToast.pointsAwarded > 0
        ? `${newestToast.headline} Plus ${newestToast.pointsAwarded.toLocaleString()} points.`
        : newestToast.headline
      : '';

  // Promote/hide native Top-Layer manual popover when supported
  useEffect(() => {
    const el = regionRef.current as (HTMLDivElement & {
      showPopover?: () => void;
      hidePopover?: () => void;
    }) | null;
    if (!el || typeof HTMLElement === 'undefined' || !Object.hasOwn(HTMLElement.prototype, 'popover')) {
      return;
    }
    try {
      if (toasts.length > 0) {
        if (!el.matches(':popover-open')) {
          el.showPopover?.();
        }
      } else if (el.matches(':popover-open')) {
        el.hidePopover?.();
      }
    } catch {
      // Safe fallback when popover state is already transitioning
    }
  }, [toasts.length]);

  // Announce only visible message text via ariaNotify() when natively supported
  useEffect(() => {
    if (!newestToast || announcedIdsRef.current.has(newestToast.id)) return;
    announcedIdsRef.current.add(newestToast.id);

    const docWithAriaNotify = document as Document & {
      ariaNotify?: (text: string, options?: { priority?: string }) => void;
    };
    if (typeof docWithAriaNotify.ariaNotify === 'function') {
      const announcement =
        newestToast.pointsAwarded > 0
          ? `${newestToast.headline} Plus ${newestToast.pointsAwarded.toLocaleString()} points.`
          : newestToast.headline;
      docWithAriaNotify.ariaNotify(announcement);
    }
  }, [newestToast]);

  const handleDismiss = (id: string, restoreFocus: boolean) => {
    if (restoreFocus) {
      const idx = toasts.findIndex((t) => t.id === id);
      const nextToast = toasts[idx + 1] || toasts[idx - 1];
      onDismiss(id);
      requestAnimationFrame(() => {
        if (nextToast) {
          closeRefs.current.get(nextToast.id)?.focus();
        } else {
          priorFocusRef.current?.focus?.();
        }
      });
      return;
    }
    onDismiss(id);
  };

  return (
    <>
      {/* Pre-populated centralized screen-reader live region fallback */}
      {fallbackLiveRegionText && (
        <p className="visually-hidden">Live tournament score announcements</p>
      )}
      <div aria-live="polite" aria-atomic="true" className="visually-hidden">
        {fallbackLiveRegionText}
      </div>

      {/* Persistent Top-Layer Toast Stack */}
      <div
        ref={regionRef}
        role="region"
        aria-label="Live score notifications"
        data-has-items={toasts.length > 0 ? 'true' : 'false'}
        onFocus={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null) && e.relatedTarget instanceof HTMLElement) {
            priorFocusRef.current = e.relatedTarget;
          }
        }}
        className="score-toast-region no-print"
        {...({ popover: 'manual' } as React.HTMLAttributes<HTMLDivElement>)}
      >
        {toasts.map((item) => (
          <ToastCardItem
            key={item.id}
            item={item}
            soundEnabled={soundEnabled}
            onToggleSound={onToggleSound}
            onDismiss={handleDismiss}
            registerCloseRef={(id, el) => {
              if (el) closeRefs.current.set(id, el);
              else closeRefs.current.delete(id);
            }}
          />
        ))}
      </div>
    </>
  );
};
