import React from 'react';
import type { Announcement, AnnouncementType } from '@/types/holdem';
import { ANNOUNCEMENT_TYPE_META, normalizeAnnouncementType } from '@/lib/announcements';
import { Button } from '@/components/ui/button';
import {
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  Edit3,
  Info,
  Megaphone,
  Plus,
} from 'lucide-react';

export interface AnnouncementBannerProps {
  announcements: Announcement[];
  canEdit?: boolean;
  onEditAnnouncement?: (announcement: Announcement) => void;
  onCreateAnnouncement?: () => void;
  onNavigateInfo?: () => void;
}

export const AnnouncementIcon: React.FC<{ type: AnnouncementType; className?: string }> = ({
  type,
  className = 'w-5 h-5',
}) => {
  switch (type) {
    case 'warning':
      return <AlertTriangle className={className} />;
    case 'danger':
      return <AlertOctagon className={className} />;
    case 'success':
      return <CheckCircle2 className={className} />;
    case 'promo':
      return <Megaphone className={className} />;
    case 'info':
    default:
      return <Info className={className} />;
  }
};

export const AnnouncementBanner: React.FC<AnnouncementBannerProps> = ({
  announcements,
  canEdit = false,
  onEditAnnouncement,
  onCreateAnnouncement,
  onNavigateInfo,
}) => {
  const activeAnnouncements = announcements.filter((a) => a.isActive !== false);

  if (activeAnnouncements.length === 0) {
    if (!canEdit || !onCreateAnnouncement) return null;
    return (
      <div className="rounded-xl border border-dashed border-slate-800 bg-slate-900/40 px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 text-xs text-slate-400">
          <Megaphone className="w-4 h-4 text-slate-500 shrink-0" />
          <span>No active banner announcement displayed to players.</span>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onCreateAnnouncement}
          className="h-8 text-xs shrink-0"
        >
          <Plus className="w-3.5 h-3.5" /> Post Announcement
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {activeAnnouncements.map((ann) => {
        const normalizedType = normalizeAnnouncementType(ann.type);
        const meta = ANNOUNCEMENT_TYPE_META[normalizedType];

        return (
          <div
            key={ann.$id}
            role="status"
            className={`rounded-2xl border p-4 sm:p-5 transition-colors ${meta.containerClass}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3.5 min-w-0">
                <div
                  className={`p-2.5 rounded-xl border shrink-0 ${meta.iconBoxClass}`}
                  aria-hidden="true"
                >
                  <AnnouncementIcon type={normalizedType} className="w-5 h-5" />
                </div>

                <div className="space-y-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`px-2 py-0.5 text-[10px] uppercase font-extrabold tracking-wider rounded ${meta.badgeClass}`}
                    >
                      {meta.badgeLabel}
                    </span>
                    <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                      {ann.title}
                    </h3>
                  </div>

                  {ann.content && (
                    <p className={`text-sm leading-relaxed max-w-4xl ${meta.bodyTextClass}`}>
                      {ann.content}
                    </p>
                  )}

                  {onNavigateInfo && (
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onNavigateInfo();
                        }}
                        className={`inline-flex items-center gap-1.5 text-xs font-bold underline underline-offset-4 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded ${meta.linkClass}`}
                      >
                        View Official League Rules &amp; Points Structure →
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {canEdit && onEditAnnouncement && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onEditAnnouncement(ann)}
                  className="h-8 px-2.5 text-xs bg-slate-950/60 border-slate-700/80 text-slate-200 hover:text-white shrink-0"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Edit</span>
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
