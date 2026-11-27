import type { Announcement, AnnouncementType } from '@/types/holdem';

export interface AnnouncementTypeMeta {
  type: AnnouncementType;
  label: string;
  badgeLabel: string;
  containerClass: string;
  iconBoxClass: string;
  badgeClass: string;
  bodyTextClass: string;
  linkClass: string;
  swatchClass: string;
}

export const ANNOUNCEMENT_TYPE_ORDER: readonly AnnouncementType[] = [
  'info',
  'warning',
  'danger',
  'success',
  'promo',
];

export const ANNOUNCEMENT_TYPE_META: Readonly<Record<AnnouncementType, AnnouncementTypeMeta>> = {
  info: {
    type: 'info',
    label: 'Info',
    badgeLabel: 'INFO',
    containerClass: 'bg-sky-950/55 border-sky-500/40',
    iconBoxClass: 'bg-sky-500/15 text-sky-400 border-sky-500/35',
    badgeClass: 'bg-sky-500 text-slate-950',
    bodyTextClass: 'text-sky-100/90',
    linkClass: 'text-sky-300 hover:text-sky-200',
    swatchClass: 'bg-sky-500',
  },
  warning: {
    type: 'warning',
    label: 'Warning',
    badgeLabel: 'WARNING',
    containerClass: 'bg-amber-950/55 border-amber-500/45',
    iconBoxClass: 'bg-amber-500/15 text-amber-400 border-amber-500/35',
    badgeClass: 'bg-amber-500 text-slate-950',
    bodyTextClass: 'text-amber-100/90',
    linkClass: 'text-amber-300 hover:text-amber-200',
    swatchClass: 'bg-amber-500',
  },
  danger: {
    type: 'danger',
    label: 'Danger',
    badgeLabel: 'ALERT',
    containerClass: 'bg-rose-950/60 border-rose-500/45',
    iconBoxClass: 'bg-rose-500/15 text-rose-400 border-rose-500/35',
    badgeClass: 'bg-rose-500 text-white',
    bodyTextClass: 'text-rose-100/90',
    linkClass: 'text-amber-300 hover:text-amber-200',
    swatchClass: 'bg-rose-500',
  },
  success: {
    type: 'success',
    label: 'Success',
    badgeLabel: 'UPDATE',
    containerClass: 'bg-emerald-950/55 border-emerald-500/40',
    iconBoxClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/35',
    badgeClass: 'bg-emerald-500 text-slate-950',
    bodyTextClass: 'text-emerald-100/90',
    linkClass: 'text-emerald-300 hover:text-emerald-200',
    swatchClass: 'bg-emerald-500',
  },
  promo: {
    type: 'promo',
    label: 'Special',
    badgeLabel: 'SPECIAL',
    containerClass: 'bg-indigo-950/60 border-indigo-500/45',
    iconBoxClass: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/35',
    badgeClass: 'bg-indigo-500 text-white',
    bodyTextClass: 'text-indigo-100/90',
    linkClass: 'text-indigo-300 hover:text-indigo-200',
    swatchClass: 'bg-indigo-500',
  },
};

export function normalizeAnnouncementType(raw?: Announcement['type'] | string): AnnouncementType {
  if (raw === 'urgent' || raw === 'danger') return 'danger';
  if (raw === 'warning') return 'warning';
  if (raw === 'success') return 'success';
  if (raw === 'promo') return 'promo';
  return 'info';
}
