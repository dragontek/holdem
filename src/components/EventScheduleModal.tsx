import React, { useState } from 'react';
import type { Game, Venue, Season } from '../types/holdem';
import { AppwriteService } from '../services/appwriteService';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  DollarSign, 
  Coins, 
  User, 
  X, 
  Check, 
  AlertCircle
} from 'lucide-react';

interface EventScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameToEdit?: Game | null;
  venues: Venue[];
  seasons: Season[];
  onGameSaved: (game: Game) => void;
  onGameDeleted?: (gameId: string) => void;
}

export const EventScheduleModal: React.FC<EventScheduleModalProps> = ({
  isOpen,
  onClose,
  gameToEdit,
  venues,
  seasons,
  onGameSaved,
  onGameDeleted,
}) => {
  const isEditing = Boolean(gameToEdit);

  const defaultVenueId = venues[0]?.$id || '';
  const defaultSeasonId = seasons.find((s) => s.isActive)?.$id || seasons[0]?.$id || 'season_2026_crawl3';

  const [formData, setFormData] = useState({
    title: gameToEdit?.title || '',
    venueId: gameToEdit?.venueId || defaultVenueId,
    seasonId: gameToEdit?.seasonId || defaultSeasonId,
    scheduledAt: gameToEdit?.scheduledAt || new Date().toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
    dealerName: gameToEdit?.dealerName || 'House Dealer',
    buyinAmount: gameToEdit?.buyinAmount ?? 30,
    rebuyAmount: gameToEdit?.rebuyAmount ?? 20,
    addonAmount: gameToEdit?.addonAmount ?? 10,
    startingChips: gameToEdit?.startingChips ?? 15000,
    hotHandJackpot: gameToEdit?.hotHandJackpot ?? 100,
    status: gameToEdit?.status || 'scheduled',
  });

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setErrorMsg('Event title is required');
      return;
    }
    if (!formData.venueId) {
      setErrorMsg('Please select a venue');
      return;
    }

    setIsSaving(true);
    setErrorMsg('');

    try {
      const selectedVenue = venues.find((v) => v.$id === formData.venueId);

      if (isEditing && gameToEdit) {
        const success = await AppwriteService.updateGame(gameToEdit.$id, {
          title: formData.title.trim(),
          venueId: formData.venueId,
          seasonId: formData.seasonId,
          scheduledAt: formData.scheduledAt,
          dealerName: formData.dealerName,
          buyinAmount: Number(formData.buyinAmount),
          rebuyAmount: Number(formData.rebuyAmount),
          addonAmount: Number(formData.addonAmount),
          startingChips: Number(formData.startingChips),
          hotHandJackpot: Number(formData.hotHandJackpot),
          status: formData.status as any,
        });

        if (success) {
          onGameSaved({
            ...gameToEdit,
            ...formData,
            venueName: selectedVenue?.name || gameToEdit.venueName,
            buyinAmount: Number(formData.buyinAmount),
            rebuyAmount: Number(formData.rebuyAmount),
            addonAmount: Number(formData.addonAmount),
            startingChips: Number(formData.startingChips),
            hotHandJackpot: Number(formData.hotHandJackpot),
          });
          onClose();
        } else {
          setErrorMsg('Failed to update event in Appwrite.');
        }
      } else {
        const created = await AppwriteService.createGame({
          title: formData.title.trim(),
          venueId: formData.venueId,
          venueName: selectedVenue?.name || 'Selected Venue',
          seasonId: formData.seasonId,
          scheduledAt: formData.scheduledAt,
          dealerName: formData.dealerName,
          buyinAmount: Number(formData.buyinAmount),
          rebuyAmount: Number(formData.rebuyAmount),
          addonAmount: Number(formData.addonAmount),
          startingChips: Number(formData.startingChips),
          hotHandJackpot: Number(formData.hotHandJackpot),
          status: 'scheduled',
          totalPlayersCount: 0,
          remainingPlayersCount: 0,
          totalEntriesCount: 0,
          currentLevelIndex: 0,
          secondsRemainingInLevel: 900,
          blindSchedule: gameToEdit?.blindSchedule || [
            { level: 1, smallBlind: 100, bigBlind: 200, ante: 0, durationMinutes: 15, isBreak: false },
            { level: 2, smallBlind: 200, bigBlind: 400, ante: 0, durationMinutes: 15, isBreak: false },
            { level: 3, smallBlind: 300, bigBlind: 600, ante: 600, durationMinutes: 15, isBreak: false },
            { level: 4, smallBlind: 500, bigBlind: 1000, ante: 1000, durationMinutes: 15, isBreak: false },
          ],
        });

        onGameSaved({
          ...created,
          venueName: selectedVenue?.name || created.venueName,
        });
        onClose();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error saving event');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!gameToEdit || !onGameDeleted) return;
    if (!window.confirm(`Are you sure you want to cancel and delete "${gameToEdit.title}"?`)) {
      return;
    }

    try {
      await AppwriteService.deleteGame(gameToEdit.$id);
      onGameDeleted(gameToEdit.$id);
      onClose();
    } catch (err: any) {
      alert(`Could not delete game: ${err.message || err}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="glass-panel rounded-2xl p-6 border border-slate-700/80 max-w-xl w-full max-h-[90vh] flex flex-col space-y-5 shadow-2xl relative">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white tracking-tight">
                {isEditing ? 'Edit Tournament Schedule' : 'Schedule New Tournament'}
              </h2>
              <p className="text-xs text-slate-400">Set event structure, venue, and buy-in rules</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Schedule Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-4 pr-1">
          <div>
            <label className="text-[11px] font-semibold text-slate-300 block mb-1">Tournament Title *</label>
            <input
              type="text"
              required
              placeholder="e.g. Wednesday Night Deepstack Special"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">Host Venue *</label>
              <select
                value={formData.venueId}
                onChange={(e) => setFormData({ ...formData, venueId: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
              >
                {venues.map((v) => (
                  <option key={v.$id} value={v.$id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">Season</label>
              <select
                value={formData.seasonId}
                onChange={(e) => setFormData({ ...formData, seasonId: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
              >
                {seasons.map((s) => (
                  <option key={s.$id} value={s.$id}>
                    {s.name} {s.isActive ? '(Active)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">Date & Time *</label>
              <input
                type="text"
                placeholder="e.g. Thu, Oct 22 • 7:00 PM"
                value={formData.scheduledAt}
                onChange={(e) => setFormData({ ...formData, scheduledAt: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">Assigned Dealer / TD</label>
              <input
                type="text"
                placeholder="House Dealer"
                value={formData.dealerName}
                onChange={(e) => setFormData({ ...formData, dealerName: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
            <div className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5" /> Buy-in & Chip Structure
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Buy-in ($)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.buyinAmount}
                  onChange={(e) => setFormData({ ...formData, buyinAmount: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm text-white font-bold"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Re-buy ($)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.rebuyAmount}
                  onChange={(e) => setFormData({ ...formData, rebuyAmount: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm text-white font-bold"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Add-on ($)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.addonAmount}
                  onChange={(e) => setFormData({ ...formData, addonAmount: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm text-white font-bold"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Starting Chips</label>
                <input
                  type="number"
                  step="1000"
                  min="1000"
                  value={formData.startingChips}
                  onChange={(e) => setFormData({ ...formData, startingChips: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm text-white font-bold"
                />
              </div>
            </div>
          </div>

          {isEditing && (
            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">Event Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400 font-bold"
              >
                <option value="scheduled">Scheduled (Upcoming)</option>
                <option value="running">Running (Live Now)</option>
                <option value="paused">Paused (On Break)</option>
                <option value="completed">Completed (Finalized)</option>
                <option value="canceled">Canceled</option>
              </select>
            </div>
          )}

          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            {isEditing && onGameDeleted ? (
              <button
                type="button"
                onClick={handleDelete}
                className="px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-bold border border-rose-500/30 transition-all"
              >
                Delete Event
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 transition-all disabled:opacity-50 shadow-md"
              >
                <Check className="w-4 h-4" />
                {isSaving ? 'Saving to Appwrite...' : isEditing ? 'Update Tournament' : 'Schedule Tournament'}
              </button>
            </div>
          </div>
        </form>

      </div>
    </div>
  );
};
