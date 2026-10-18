import React, { useState } from 'react';
import type { Season } from '@/types/holdem';
import { AppwriteService } from '@/services/appwriteService';
import { 
  Trophy, 
  Plus, 
  Calendar, 
  Trash2, 
  Edit3, 
  Check, 
  AlertCircle,
  Sparkles,
  CheckCircle2
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';

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
      setErrorMsg('Season name is required.');
      return;
    }
    if (!formData.startDate || !formData.endDate) {
      setErrorMsg('Start date and end date are required.');
      return;
    }
    if (new Date(formData.endDate) <= new Date(formData.startDate)) {
      setErrorMsg('End date must be after start date.');
      return;
    }

    setIsSaving(true);
    setErrorMsg('');

    try {
      if (isAddingNew) {
        const created = await AppwriteService.createSeason({
          leagueId: '1',
          name: formData.name.trim(),
          startDate: formData.startDate,
          endDate: formData.endDate,
          isActive: formData.isActive || seasons.length === 0,
        });

        let updatedSeasons = [...seasons, created];
        if (created.isActive) {
          updatedSeasons = updatedSeasons.map((s) => ({
            ...s,
            isActive: s.$id === created.$id,
          }));
        }

        onSeasonsChange(updatedSeasons);
        setSuccessMsg(`Created season "${created.name}".`);
        setIsAddingNew(false);
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
              : s
          );

          if (formData.isActive) {
            updatedSeasons = updatedSeasons.map((s) => ({
              ...s,
              isActive: s.$id === editingSeasonId,
            }));
          }

          onSeasonsChange(updatedSeasons);
          setSuccessMsg(`Updated season "${formData.name.trim()}".`);
          setEditingSeasonId(null);
          setTimeout(() => setSuccessMsg(''), 3000);
        } else {
          setErrorMsg('Failed to update season in database.');
        }
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error saving season';
      setErrorMsg(msg);
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
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error updating active season';
      setErrorMsg(msg);
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
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error deleting season';
      setErrorMsg(msg);
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
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-6 overflow-hidden">
        
        {/* Header */}
        <DialogHeader className="border-b border-slate-800 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Trophy className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
                  Championship Seasons Manager
                </DialogTitle>
                <DialogDescription>
                  Configure points races, active seasons, and league timelines
                </DialogDescription>
              </div>
            </div>

            {!isAddingNew && !editingSeasonId && (
              <Button
                variant="default"
                size="sm"
                onClick={handleStartAdd}
                className="mr-6"
              >
                <Plus className="w-4 h-4" /> Add Season
              </Button>
            )}
          </div>
        </DialogHeader>

        {/* Alerts */}
        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto space-y-4 py-1 pr-1 scrollbar-thin">
          
          {/* Add / Edit Form */}
          {(isAddingNew || editingSeasonId) && (
            <Card className="border-amber-500/40 bg-slate-900/90 shadow-lg">
              <form onSubmit={handleSaveSeason}>
                <CardContent className="p-4 space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      {isAddingNew ? 'Create New Season' : 'Edit Season Details'}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleCancelForm}
                      className="text-xs h-7 text-slate-400 hover:text-white"
                    >
                      Cancel
                    </Button>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="seasonName">Season Name *</Label>
                    <Input
                      id="seasonName"
                      type="text"
                      placeholder="e.g. 2026 Crawl 4 or Fall Championship"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="startDate">Start Date *</Label>
                      <Input
                        id="startDate"
                        type="date"
                        value={formData.startDate}
                        onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="endDate">End Date *</Label>
                      <Input
                        id="endDate"
                        type="date"
                        value={formData.endDate}
                        onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  {/* Is Active Toggle */}
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="isActiveSeason"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="rounded bg-slate-950 border-slate-700 text-amber-500 focus:ring-amber-500 w-4 h-4 cursor-pointer"
                    />
                    <Label htmlFor="isActiveSeason" className="cursor-pointer text-xs text-slate-200">
                      Set as current Active Season (used for leaderboards and schedules)
                    </Label>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleCancelForm}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="default"
                      size="sm"
                      disabled={isSaving}
                    >
                      {isSaving ? 'Saving...' : isAddingNew ? 'Create Season' : 'Update Season'}
                    </Button>
                  </div>
                </CardContent>
              </form>
            </Card>
          )}

          {/* Existing Seasons List */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider">
              Existing Seasons ({seasons.length})
            </h4>

            {seasons.map((season) => (
              <Card
                key={season.$id}
                className={
                  season.isActive
                    ? 'border-amber-500/50 bg-amber-500/5'
                    : 'border-slate-800 bg-slate-900/60'
                }
              >
                <div className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h5 className="font-bold text-white text-base">{season.name}</h5>
                      {season.isActive ? (
                        <Badge variant="success">
                          <Check className="w-3 h-3" /> ACTIVE
                        </Badge>
                      ) : (
                        <Badge variant="secondary">ARCHIVED</Badge>
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
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSetActive(season.$id)}
                        disabled={isSaving}
                        className="text-emerald-400 hover:text-emerald-300 hover:border-emerald-500/50"
                      >
                        Make Active
                      </Button>
                    )}

                    <Button
                      variant="outline"
                      size="icon-sm"
                      onClick={() => handleStartEdit(season)}
                      title="Edit Season"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                    </Button>

                    <Button
                      variant="outline"
                      size="icon-sm"
                      onClick={() => handleDeleteSeason(season.$id, season.name)}
                      className="hover:border-rose-500/40 hover:bg-rose-500/20 hover:text-rose-400 text-slate-400"
                      title="Delete Season"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>

        </div>

      </DialogContent>
    </Dialog>
  );
};

export default SeasonManagerModal;
