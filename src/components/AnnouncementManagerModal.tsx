import React, { useState } from 'react';
import type { Announcement, AnnouncementType } from '@/types/holdem';
import {
  ANNOUNCEMENT_TYPE_META,
  ANNOUNCEMENT_TYPE_ORDER,
  normalizeAnnouncementType,
} from '@/lib/announcements';
import { AppwriteService } from '@/services/appwriteService';
import { AnnouncementIcon } from '@/components/AnnouncementBanner';
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
import { AlertCircle, Check, Eye, EyeOff, Megaphone, Trash2 } from 'lucide-react';

export interface AnnouncementManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  announcementToEdit?: Announcement | null;
  onSaved: (announcement: Announcement, isNew: boolean) => void;
  onDeleted?: (announcementId: string) => void;
}

export const AnnouncementManagerModal: React.FC<AnnouncementManagerModalProps> = ({
  isOpen,
  onClose,
  announcementToEdit,
  onSaved,
  onDeleted,
}) => {
  const isEditing = Boolean(announcementToEdit);

  const [title, setTitle] = useState(announcementToEdit?.title || '');
  const [content, setContent] = useState(announcementToEdit?.content || '');
  const [type, setType] = useState<AnnouncementType>(
    announcementToEdit ? normalizeAnnouncementType(announcementToEdit.type) : 'info'
  );
  const [isActive, setIsActive] = useState<boolean>(announcementToEdit?.isActive ?? true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const previewMeta = ANNOUNCEMENT_TYPE_META[type];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg('Announcement headline is required.');
      return;
    }

    setIsSaving(true);
    setErrorMsg('');

    try {
      if (isEditing && announcementToEdit) {
        const updates: Partial<Announcement> = {
          title: title.trim(),
          content: content.trim(),
          type,
          isActive,
        };
        await AppwriteService.updateAnnouncement(announcementToEdit.$id, updates);
        onSaved({ ...announcementToEdit, ...updates }, false);
      } else {
        const created = await AppwriteService.createAnnouncement({
          title: title.trim(),
          content: content.trim(),
          type,
          isActive,
        });
        onSaved(created, true);
      }
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to save announcement.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!announcementToEdit || !onDeleted) return;
    if (!window.confirm(`Delete announcement "${announcementToEdit.title}"?`)) return;

    setIsSaving(true);
    try {
      await AppwriteService.deleteAnnouncement(announcementToEdit.$id);
      onDeleted(announcementToEdit.$id);
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to delete announcement.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl max-h-[92dvh] overflow-y-auto bg-slate-950 border-slate-800 p-6">
        <DialogHeader className="text-left pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <Megaphone className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-white">
                {isEditing ? 'Edit Top Banner Announcement' : 'Post Banner Announcement'}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400">
                Customize the headline, message, visibility, and color style shown at the top of Games.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {errorMsg && (
          <div
            role="alert"
            className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-2"
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Style / Color Selector */}
          <div className="space-y-2">
            <Label>Banner Type &amp; Color</Label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {ANNOUNCEMENT_TYPE_ORDER.map((t) => {
                const meta = ANNOUNCEMENT_TYPE_META[t];
                const selected = type === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className={`h-10 px-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                      selected
                        ? `${meta.containerClass} text-white ring-1 ring-white/30`
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                    }`}
                  >
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${meta.swatchClass}`} />
                    <span>{meta.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Headline */}
          <div className="space-y-1.5">
            <Label htmlFor="ann-title">Headline *</Label>
            <Input
              id="ann-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Double Points Night This Saturday!"
              required
            />
          </div>

          {/* Body Wording */}
          <div className="space-y-1.5">
            <Label htmlFor="ann-content">Message / Details</Label>
            <textarea
              id="ann-content"
              rows={3}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Share schedule updates, weather alerts, special point multipliers, or venue notes..."
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 resize-y"
            />
          </div>

          {/* Visibility Toggle */}
          <button
            type="button"
            onClick={() => setIsActive((prev) => !prev)}
            className={`w-full px-3.5 py-2.5 rounded-xl border text-left flex items-center justify-between gap-3 transition-colors ${
              isActive
                ? 'bg-emerald-500/10 border-emerald-500/40 text-white'
                : 'bg-slate-900 border-slate-800 text-slate-400'
            }`}
          >
            <span className="flex items-center gap-2.5 text-xs font-semibold">
              {isActive ? (
                <Eye className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <EyeOff className="w-4 h-4 text-slate-500 shrink-0" />
              )}
              <span>
                {isActive
                  ? 'Visible — Shown at the top of the Games page'
                  : 'Hidden — Saved as draft and not shown to players'}
              </span>
            </span>
            <Badge variant={isActive ? 'success' : 'secondary'}>
              {isActive ? (
                <>
                  <Check className="w-3 h-3" /> Active
                </>
              ) : (
                'Hidden'
              )}
            </Badge>
          </button>

          {/* Live Banner Preview */}
          <div className="space-y-1.5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Live Preview
            </div>
            <div className={`rounded-xl border p-3.5 ${previewMeta.containerClass}`}>
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg border shrink-0 ${previewMeta.iconBoxClass}`}>
                  <AnnouncementIcon type={type} className="w-4 h-4" />
                </div>
                <div className="space-y-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`px-1.5 py-0.5 text-[9px] uppercase font-extrabold tracking-wider rounded ${previewMeta.badgeClass}`}
                    >
                      {previewMeta.badgeLabel}
                    </span>
                    <span className="text-sm font-bold text-white truncate">
                      {title.trim() || 'Your announcement headline'}
                    </span>
                  </div>
                  <p className={`text-xs leading-relaxed ${previewMeta.bodyTextClass}`}>
                    {content.trim() || 'Your announcement wording will appear here.'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="pt-3 border-t border-slate-800 flex flex-col-reverse sm:flex-row sm:justify-between gap-2">
            {isEditing && onDeleted ? (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={isSaving}
                onClick={handleDelete}
                className="sm:mr-auto"
              >
                <Trash2 className="w-4 h-4" /> Delete
              </Button>
            ) : (
              <div />
            )}

            <div className="flex items-center justify-end gap-2">
              <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? 'Saving...' : isEditing ? 'Save Announcement' : 'Publish Banner'}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
