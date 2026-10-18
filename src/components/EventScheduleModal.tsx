import React, { useState, useEffect } from 'react';
import type { Game, Venue, Season } from '../types/holdem';
import { AppwriteService } from '../services/appwriteService';
import { 
  Calendar, 
  DollarSign, 
  X, 
  Check, 
  AlertCircle,
  RotateCcw,
  Clock,
  Sparkles,
  Layers,
  ChevronRight
} from 'lucide-react';

interface EventScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameToEdit?: Game | null;
  venues: Venue[];
  seasons: Season[];
  defaultSeasonId?: string;
  onGameSaved: (game: Game) => void;
  onGamesSaved?: (games: Game[]) => void;
  onGameDeleted?: (gameId: string) => void;
}

const DAYS_OF_WEEK = [
  { key: 'monday', label: 'Mon', dayIndex: 1 },
  { key: 'tuesday', label: 'Tue', dayIndex: 2 },
  { key: 'wednesday', label: 'Wed', dayIndex: 3 },
  { key: 'thursday', label: 'Thu', dayIndex: 4 },
  { key: 'friday', label: 'Fri', dayIndex: 5 },
  { key: 'saturday', label: 'Sat', dayIndex: 6 },
  { key: 'sunday', label: 'Sun', dayIndex: 0 },
];

const TIME_PRESETS = [
  '11:00 AM',
  '1:00 PM',
  '2:00 PM',
  '6:00 PM',
  '7:00 PM',
  '7:30 PM',
];

export function calculateRecurringDates(
  dayKey: string,
  timeString: string,
  season?: Season,
  scope: 'season' | 'weeks' = 'season',
  weeksCount: number = 8
): { date: Date; displayStr: string }[] {
  const targetDayObj = DAYS_OF_WEEK.find((d) => d.key === dayKey) || DAYS_OF_WEEK[5]; // default Saturday
  const targetDayIndex = targetDayObj.dayIndex;

  // Determine starting point
  let start = new Date();
  if (season?.startDate) {
    const seasonStart = new Date(season.startDate + 'T00:00:00');
    // If season hasn't started yet, start from season start date
    if (seasonStart > start) {
      start = seasonStart;
    }
  }

  // Advance start date to the next occurrence of the target day
  let current = new Date(start);
  while (current.getDay() !== targetDayIndex) {
    current.setDate(current.getDate() + 1);
  }

  let seasonEnd: Date | null = null;
  if (scope === 'season' && season?.endDate) {
    seasonEnd = new Date(season.endDate + 'T23:59:59');
  }

  const results: { date: Date; displayStr: string }[] = [];
  const maxOccurrences = scope === 'weeks' ? weeksCount : 24;

  while (results.length < maxOccurrences) {
    if (seasonEnd && current > seasonEnd) {
      break;
    }

    const monthStr = current.toLocaleString('en-US', { month: 'short' });
    const dayNum = current.getDate();
    const weekdayStr = current.toLocaleString('en-US', { weekday: 'short' });
    const displayStr = `${weekdayStr}, ${monthStr} ${dayNum} • ${timeString}`;

    results.push({
      date: new Date(current),
      displayStr,
    });

    current.setDate(current.getDate() + 7);
  }

  // Fallback: If range was empty, generate upcoming occurrences starting from the next matching day
  if (results.length === 0) {
    let fallbackCurrent = new Date();
    while (fallbackCurrent.getDay() !== targetDayIndex) {
      fallbackCurrent.setDate(fallbackCurrent.getDate() + 1);
    }
    for (let i = 0; i < (scope === 'weeks' ? weeksCount : 8); i++) {
      const monthStr = fallbackCurrent.toLocaleString('en-US', { month: 'short' });
      const dayNum = fallbackCurrent.getDate();
      const weekdayStr = fallbackCurrent.toLocaleString('en-US', { weekday: 'short' });
      const displayStr = `${weekdayStr}, ${monthStr} ${dayNum} • ${timeString}`;
      results.push({
        date: new Date(fallbackCurrent),
        displayStr,
      });
      fallbackCurrent.setDate(fallbackCurrent.getDate() + 7);
    }
  }

  return results;
}

export const EventScheduleModal: React.FC<EventScheduleModalProps> = ({
  isOpen,
  onClose,
  gameToEdit,
  venues,
  seasons,
  defaultSeasonId,
  onGameSaved,
  onGamesSaved,
  onGameDeleted,
}) => {
  const isEditing = Boolean(gameToEdit);

  const defaultVenueId = venues[0]?.$id || '';
  const initialSeasonId = defaultSeasonId || seasons.find((s) => s.isActive)?.$id || seasons[0]?.$id || 'season_2026_crawl3';

  // Recurrence schedule states
  const [scheduleType, setScheduleType] = useState<'single' | 'recurring'>('single');
  const [recurringDay, setRecurringDay] = useState<string>('saturday');
  const [recurringTime, setRecurringTime] = useState<string>('11:00 AM');
  const [recurringScope, setRecurringScope] = useState<'season' | 'weeks'>('season');
  const [recurringWeeks, setRecurringWeeks] = useState<number>(8);
  const [appendWeekNumber, setAppendWeekNumber] = useState<boolean>(true);

  const [formData, setFormData] = useState({
    title: gameToEdit?.title || '',
    venueId: gameToEdit?.venueId || defaultVenueId,
    seasonId: gameToEdit?.seasonId || initialSeasonId,
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

  useEffect(() => {
    if (isOpen) {
      const targetSeasonId = gameToEdit?.seasonId || defaultSeasonId || seasons.find((s) => s.isActive)?.$id || seasons[0]?.$id || '';
      setFormData({
        title: gameToEdit?.title || (scheduleType === 'recurring' ? 'Saturday Morning Deepstack' : ''),
        venueId: gameToEdit?.venueId || venues[0]?.$id || '',
        seasonId: targetSeasonId,
        scheduledAt: gameToEdit?.scheduledAt || new Date().toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
        dealerName: gameToEdit?.dealerName || 'House Dealer',
        buyinAmount: gameToEdit?.buyinAmount ?? 30,
        rebuyAmount: gameToEdit?.rebuyAmount ?? 20,
        addonAmount: gameToEdit?.addonAmount ?? 10,
        startingChips: gameToEdit?.startingChips ?? 15000,
        hotHandJackpot: gameToEdit?.hotHandJackpot ?? 100,
        status: gameToEdit?.status || 'scheduled',
      });
      if (gameToEdit?.isRecurring) {
        setScheduleType('single');
      }
      setErrorMsg('');
    }
  }, [isOpen, gameToEdit, defaultSeasonId]);

  if (!isOpen) return null;

  const selectedSeason = seasons.find((s) => s.$id === formData.seasonId);
  const recurringDates = calculateRecurringDates(
    recurringDay,
    recurringTime,
    selectedSeason,
    recurringScope,
    recurringWeeks
  );

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

      // CASE 1: Updating an existing event
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
        return;
      }

      // CASE 2: Creating a Recurring Weekly Tournament Series
      if (scheduleType === 'recurring') {
        const seriesId = `series_${Date.now()}`;
        const dayCapitalized = recurringDay.charAt(0).toUpperCase() + recurringDay.slice(1);
        const recurrenceRule = `Every ${dayCapitalized} at ${recurringTime}`;

        const createdGames: Game[] = [];
        for (let i = 0; i < recurringDates.length; i++) {
          const dateItem = recurringDates[i];
          const eventTitle = appendWeekNumber 
            ? `${formData.title.trim()} (Week ${i + 1})`
            : formData.title.trim();

          const created = await AppwriteService.createGame({
            title: eventTitle,
            venueId: formData.venueId,
            venueName: selectedVenue?.name || 'Selected Venue',
            seasonId: formData.seasonId,
            scheduledAt: dateItem.displayStr,
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
            isRecurring: true,
            recurrenceRule,
            seriesId,
            blindSchedule: [
              { level: 1, smallBlind: 100, bigBlind: 200, ante: 0, durationMinutes: 15, isBreak: false },
              { level: 2, smallBlind: 200, bigBlind: 400, ante: 0, durationMinutes: 15, isBreak: false },
              { level: 3, smallBlind: 300, bigBlind: 600, ante: 600, durationMinutes: 15, isBreak: false },
              { level: 4, smallBlind: 500, bigBlind: 1000, ante: 1000, durationMinutes: 15, isBreak: false },
            ],
          });

          createdGames.push({
            ...created,
            venueName: selectedVenue?.name || created.venueName,
            isRecurring: true,
            recurrenceRule,
            seriesId,
          });
        }

        if (onGamesSaved) {
          onGamesSaved(createdGames);
        } else {
          createdGames.forEach((g) => onGameSaved(g));
        }
        onClose();
        return;
      }

      // CASE 3: Creating a Single Tournament Event
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
        isRecurring: false,
        blindSchedule: [
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
      <div className="glass-panel rounded-2xl p-6 border border-slate-700/80 max-w-xl w-full max-h-[92vh] flex flex-col space-y-5 shadow-2xl relative">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white tracking-tight">
                {isEditing ? 'Edit Tournament Schedule' : 'Schedule Tournament Event'}
              </h2>
              <p className="text-xs text-slate-400">
                {isEditing ? 'Update event structure and venue' : 'Create a single tournament or recurring weekly series'}
              </p>
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

        {/* Schedule Mode Selector (Only for new events) */}
        {!isEditing && (
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-900 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => {
                setScheduleType('single');
                if (formData.title === 'Saturday Morning Deepstack') {
                  setFormData({ ...formData, title: '' });
                }
              }}
              className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                scheduleType === 'single'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>One-Time Event</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setScheduleType('recurring');
                if (!formData.title) {
                  setFormData({ ...formData, title: 'Saturday Morning Deepstack' });
                }
              }}
              className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                scheduleType === 'recurring'
                  ? 'bg-indigo-500 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Recurring Weekly Series</span>
            </button>
          </div>
        )}

        {/* Schedule Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin">
          
          {/* Base Tournament Title */}
          <div>
            <label className="text-[11px] font-semibold text-slate-300 block mb-1">
              Tournament Title {scheduleType === 'recurring' ? 'Base Name *' : '*'}
            </label>
            <input
              type="text"
              required
              placeholder={scheduleType === 'recurring' ? 'e.g. Saturday Morning Deepstack' : 'e.g. Wednesday Night Deepstack Special'}
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
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">Championship Season *</label>
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
          </div>

          {/* ======================================================== */}
          {/* RECURRING SCHEDULE CONFIGURATION PANEL                  */}
          {/* ======================================================== */}
          {scheduleType === 'recurring' && !isEditing ? (
            <div className="p-4 rounded-xl bg-indigo-950/30 border border-indigo-500/40 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                  <RotateCcw className="w-3.5 h-3.5 text-indigo-400" /> Weekly Recurrence Settings
                </span>
                <span className="text-[10px] text-indigo-400 font-semibold">
                  Generates {recurringDates.length} events
                </span>
              </div>

              {/* Day of the Week Selector */}
              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1.5">
                  Recurring Day of the Week
                </label>
                <div className="grid grid-cols-7 gap-1">
                  {DAYS_OF_WEEK.map((d) => (
                    <button
                      key={d.key}
                      type="button"
                      onClick={() => {
                        setRecurringDay(d.key);
                        if (!formData.title || formData.title.includes('Deepstack')) {
                          const dayCap = d.label;
                          setFormData({ ...formData, title: `${d.label} Morning Deepstack` });
                        }
                      }}
                      className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                        recurringDay === d.key
                          ? 'bg-indigo-500 text-white shadow'
                          : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Time Selector & Presets */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                    Tournament Start Time *
                  </label>
                  <input
                    type="text"
                    value={recurringTime}
                    onChange={(e) => setRecurringTime(e.target.value)}
                    placeholder="e.g. 11:00 AM"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-bold focus:outline-none focus:border-indigo-400"
                  />
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {TIME_PRESETS.map((tp) => (
                      <button
                        key={tp}
                        type="button"
                        onClick={() => setRecurringTime(tp)}
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                          recurringTime === tp
                            ? 'bg-indigo-500 text-white border-indigo-400'
                            : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                        }`}
                      >
                        {tp}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Recurrence Scope (Season or Weeks) */}
                <div>
                  <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                    Recurrence Duration
                  </label>
                  <select
                    value={recurringScope}
                    onChange={(e) => setRecurringScope(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-400"
                  >
                    <option value="season">Through End of Season ({selectedSeason?.name || 'Active'})</option>
                    <option value="weeks">For specific number of weeks</option>
                  </select>

                  {recurringScope === 'weeks' && (
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs text-slate-400">Weeks:</span>
                      {[4, 8, 10, 12].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => setRecurringWeeks(num)}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            recurringWeeks === num
                              ? 'bg-indigo-500 text-white'
                              : 'bg-slate-900 text-slate-400 border border-slate-800'
                          }`}
                        >
                          {num} Wks
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Append Week Number Checkbox */}
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer pt-1 select-none">
                <input
                  type="checkbox"
                  checked={appendWeekNumber}
                  onChange={(e) => setAppendWeekNumber(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-900 text-indigo-500 focus:ring-0"
                />
                <span>Append week number to tournament titles (e.g. &quot;{formData.title || 'Tournament'} (Week 1)&quot;)</span>
              </label>

              {/* Dynamic Series Preview */}
              <div className="pt-2 border-t border-indigo-500/20 space-y-1.5">
                <div className="text-[11px] font-bold text-slate-300 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-400" /> Scheduled Dates Preview:
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                  {recurringDates.map((d, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded-lg bg-slate-900/90 border border-slate-800 text-[10px] text-indigo-200"
                    >
                      #{idx + 1}: {d.displayStr}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* Single Event Date & Dealer Input */
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">Date &amp; Time *</label>
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
          )}

          {/* Buy-in & Chip Structure */}
          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
            <div className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5" /> Buy-in &amp; Chip Structure
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

          {/* Footer Actions */}
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
                className={`px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all disabled:opacity-50 shadow-md ${
                  scheduleType === 'recurring' && !isEditing
                    ? 'bg-indigo-500 hover:bg-indigo-400 text-white'
                    : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                }`}
              >
                {scheduleType === 'recurring' && !isEditing ? (
                  <>
                    <RotateCcw className="w-4 h-4" />
                    {isSaving ? 'Generating Tournaments...' : `Schedule Series (${recurringDates.length} Events)`}
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    {isSaving ? 'Saving to Appwrite...' : isEditing ? 'Update Tournament' : 'Schedule Tournament'}
                  </>
                )}
              </button>
            </div>
          </div>
        </form>

      </div>
    </div>
  );
};
