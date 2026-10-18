import React, { useState } from 'react';
import type { Season } from '../types/holdem';
import { AppwriteService } from '../services/appwriteService';
import { 
  Trophy, 
  Plus, 
  Calendar, 
  Trash2, 
  Edit3, 
  X, 
  Check, 
  AlertCircle,
  Sparkles,
  CheckCircle2,
  Clock
} from 'lucide-react';

interface SeasonManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  seasons: Season[];
  onSeasonsChange: (seasons: Season[]) => void;
}

export const SeasonManagerModal: React.FC<SeasonManagerModalProps> = ({
  isOpen,
  onClose,
  seasons,
  onSeasonsChange,
}) => {
  const [editingSeasonId, setEditingSeasonId] = useState<string | null>(null);
  const [isAddingNew, setIsAddingNew] = useState<boolean>(false);
  const [formData, setFormData] = useState({
    name: '',
    startDate: '',
    endDate: '',
    isActive: false,
  });
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  if (!isOpen) return null;

  const handleStartAdd = () => {
    setEditingSeasonId(null);
    setFormData({
      name: '',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      isActive: seasons.length === 0,
    });
    setIsAddingNew(true);
    setErrorMsg('');
    setSuccessMsg('');
  };

  const handleStartEdit = (season: Season) => {
    setIsAddingNew(false);
    setEditingSeasonId(season.$id);
    setFormData({
      name: season.name,
      startDate: season.startDate,
      endDate: season.endDate,
      isActive: season.isActive,
    });
    setErrorMsg('');
    setSuccessMsg('');
  };

  const handleCancelForm = () => {
    setIsAddingNew(false);
    setEditingSeasonId(null);
    setErrorMsg('');
  };

  const handleSaveSeason = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setErrorMsg('Season name is required');
      return;
    }
    if (!formData.startDate) {
      setErrorMsg('Start date is required');
      return;
    }
    if (!formData.endDate) {
      setErrorMsg('End date is required');
      return;
    }
    if (new Date(formData.startDate) > new Date(formData.endDate)) {
      setErrorMsg('End date must be after start date');
      return;
    }

    setIsSaving(true);
    setErrorMsg('');

    try {
      if (isAddingNew) {
        const created = await AppwriteService.createSeason({
          name: formData.name.trim(),
          startDate: formData.startDate,
          endDate: formData.endDate,
          isActive: formData.isActive,
          leagueId: 'league_1',
        });

        let updatedSeasons = [created, ...seasons];
        if (formData.isActive) {
          updatedSeasons = updatedSeasons.map((s) => ({
            ...s,
            isActive: s.$id === created.$id,
          }));
        }

        onSeasonsChange(updatedSeasons);
        setIsAddingNew(false);
        setSuccessMsg(`Created season "${created.name}" successfully.`);
        setTimeout(() => setSuccessMsg(''), 3000);
      } else if (editingSeasonId) {
        const success = await AppwriteService.updateSeason(editingSeasonId, {
          name: formData.name.trim(),
          startDate: formData.startDate,
          endDate: formData.endDate,
          isActive: formData.isActive,
        });

        if (success) {
          let updatedSeasons = seasons.map((s) =>
            s.$id === editingSeasonId
              ? {
                  ...s,
                  name: formData.name.trim(),
                  startDate: formData.startDate,
                  endDate: formData.endDate,
                  isActive: formData.isActive,
                }
              : formData.isActive
              ? { ...s, isActive: false }
              : s
          );

          onSeasonsChange(updatedSeasons);
          setEditingSeasonId(null);
          setSuccessMsg('Season updated successfully.');
          setTimeout(() => setSuccessMsg(''), 3000);
        } else {
          setErrorMsg('Failed to update season in database');
        }
      }
    } catch (e: any) {
      setErrorMsg(e.message || 'Error saving season');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSetActive = async (seasonId: string) => {
    setIsSaving(true);
    setErrorMsg('');
    try {
      const updated = await AppwriteService.setActiveSeason(seasonId, seasons);
      onSeasonsChange(updated);
      setSuccessMsg('Active season updated.');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (e: any) {
      setErrorMsg(e.message || 'Error updating active season');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteSeason = async (seasonId: string, seasonName: string) => {
    if (seasons.length <= 1) {
      setErrorMsg('Cannot delete the only season in the league.');
      return;
    }
    if (!window.confirm(`Are you sure you want to delete season "${seasonName}"?`)) {
      return;
    }

    setIsSaving(true);
    setErrorMsg('');

    try {
      const success = await AppwriteService.deleteSeason(seasonId);
      if (success) {
        const remaining = seasons.filter((s) => s.$id !== seasonId);
        // If we deleted the active season, activate the first remaining
        const hasActive = remaining.some((s) => s.isActive);
        if (!hasActive && remaining.length > 0) {
          remaining[0].isActive = true;
        }
        onSeasonsChange(remaining);
        setSuccessMsg(`Deleted season "${seasonName}".`);
        setTimeout(() => setSuccessMsg(''), 3000);
      } else {
        setErrorMsg('Failed to delete season');
      }
    } catch (e: any) {
      setErrorMsg(e.message || 'Error deleting season');
    } finally {
      setIsSaving(false);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr + 'T00:00:00');
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div className="glass-panel w-full max-w-2xl rounded-3xl border border-amber-500/40 p-6 shadow-2xl relative felt-glow max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                Championship Seasons Manager
              </h3>
              <p className="text-xs text-slate-400">Add, edit, or set active league seasons</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isAddingNew && !editingSeasonId && (
              <button
                onClick={handleStartAdd}
                className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 transition-all shadow-md"
              >
                <Plus className="w-4 h-4" /> Add Season
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Alerts */}
        {errorMsg && (
          <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          
          {/* Add / Edit Form */}
          {(isAddingNew || editingSeasonId) && (
            <form onSubmit={handleSaveSeason} className="p-4 rounded-2xl bg-slate-900 border border-amber-500/40 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  {isAddingNew ? 'Create New Season' : 'Edit Season Details'}
                </span>
                <button
                  type="button"
                  onClick={handleCancelForm}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Season Name *</label>
                <input
                  type="text"
                  placeholder="e.g. 2026 Crawl 4 or Fall Championship"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-slate-950 text-white text-xs px-3 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Start Date *</label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full bg-slate-950 text-white text-xs px-3 py-2 rounded-xl border border-slate-800 focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">End Date *</label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full bg-slate-950 text-white text-xs px-3 py-2 rounded-xl border border-slate-800 focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>
              </div>

              {/* Is Active Toggle */}
              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="rounded bg-slate-950 border-slate-700 text-amber-500 focus:ring-0 w-4 h-4"
                />
                <span className="text-xs font-semibold text-white">
                  Set as current Active Season (will be used for leaderboards and schedules)
                </span>
              </label>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleCancelForm}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : isAddingNew ? 'Create Season' : 'Update Season'}
                </button>
              </div>
            </form>
          )}

          {/* Existing Seasons List */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider">
              Existing Seasons ({seasons.length})
            </h4>

            {seasons.map((season) => (
              <div
                key={season.$id}
                className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                  season.isActive
                    ? 'bg-amber-500/10 border-amber-500/50 gold-glow'
                    : 'bg-slate-900/80 border-slate-800'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h5 className="font-bold text-white text-base">{season.name}</h5>
                    {season.isActive ? (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                        <Check className="w-3 h-3" /> ACTIVE
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 text-[10px] font-semibold uppercase tracking-wider">
                        ARCHIVED
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>
                      {formatDate(season.startDate)} — {formatDate(season.endDate)}
                    </span>
                  </p>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  {!season.isActive && (
                    <button
                      onClick={() => handleSetActive(season.$id)}
                      disabled={isSaving}
                      className="px-2.5 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition-all disabled:opacity-50"
                      title="Set as Active Season"
                    >
                      Make Active
                    </button>
                  )}

                  <button
                    onClick={() => handleStartEdit(season)}
                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-all"
                    title="Edit Season"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                  </button>

                  <button
                    onClick={() => handleDeleteSeason(season.$id, season.name)}
                    className="p-2 rounded-lg bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 border border-slate-700 hover:border-red-500/40 transition-all"
                    title="Delete Season"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

        </div>

      </div>
    </div>
  );
};

export default SeasonManagerModal;
