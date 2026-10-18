import React, { useState } from 'react';
import type { Venue } from '../types/holdem';
import { AppwriteService } from '../services/appwriteService';
import { 
  Building2, 
  Plus, 
  MapPin, 
  Phone, 
  Globe, 
  Trash2, 
  Edit3, 
  X, 
  Check, 
  AlertCircle,
  Image as ImageIcon
} from 'lucide-react';

interface VenueManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  venues: Venue[];
  onVenuesChange: (venues: Venue[]) => void;
}

export const VenueManagerModal: React.FC<VenueManagerModalProps> = ({
  isOpen,
  onClose,
  venues,
  onVenuesChange,
}) => {
  const [editingVenueId, setEditingVenueId] = useState<string | null>(null);
  const [isAddingNew, setIsAddingNew] = useState<boolean>(false);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    website: '',
    imageUrl: '',
  });
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  if (!isOpen) return null;

  const handleStartAdd = () => {
    setEditingVenueId(null);
    setFormData({
      name: '',
      address: '',
      phone: '',
      website: '',
      imageUrl: '',
    });
    setIsAddingNew(true);
    setErrorMsg('');
  };

  const handleStartEdit = (venue: Venue) => {
    setIsAddingNew(false);
    setEditingVenueId(venue.$id);
    setFormData({
      name: venue.name,
      address: venue.address,
      phone: venue.phone,
      website: venue.website || '',
      imageUrl: venue.imageUrl || '',
    });
    setErrorMsg('');
  };

  const handleCancelForm = () => {
    setIsAddingNew(false);
    setEditingVenueId(null);
    setErrorMsg('');
  };

  const handleSaveVenue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setErrorMsg('Venue name is required');
      return;
    }
    if (!formData.address.trim()) {
      setErrorMsg('Address is required');
      return;
    }

    setIsSaving(true);
    setErrorMsg('');

    try {
      if (isAddingNew) {
        const created = await AppwriteService.createVenue({
          name: formData.name.trim(),
          address: formData.address.trim(),
          phone: formData.phone.trim() || 'N/A',
          website: formData.website.trim(),
          imageUrl: formData.imageUrl.trim() || 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&q=80&w=800',
          leagueId: 'league_1',
        });
        onVenuesChange([...venues, created]);
        setIsAddingNew(false);
      } else if (editingVenueId) {
        const success = await AppwriteService.updateVenue(editingVenueId, {
          name: formData.name.trim(),
          address: formData.address.trim(),
          phone: formData.phone.trim(),
          website: formData.website.trim(),
          imageUrl: formData.imageUrl.trim(),
        });

        if (success) {
          onVenuesChange(
            venues.map((v) =>
              v.$id === editingVenueId
                ? {
                    ...v,
                    name: formData.name.trim(),
                    address: formData.address.trim(),
                    phone: formData.phone.trim(),
                    website: formData.website.trim(),
                    imageUrl: formData.imageUrl.trim(),
                  }
                : v
            )
          );
          setEditingVenueId(null);
        } else {
          setErrorMsg('Failed to update venue in Appwrite. Changes may only be local.');
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error saving venue');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteVenue = async (venueId: string, venueName: string) => {
    if (!window.confirm(`Are you sure you want to remove "${venueName}"?`)) {
      return;
    }

    try {
      await AppwriteService.deleteVenue(venueId);
      onVenuesChange(venues.filter((v) => v.$id !== venueId));
    } catch (err: any) {
      alert(`Could not delete venue: ${err.message || err}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="glass-panel rounded-2xl p-6 border border-slate-700/80 max-w-2xl w-full max-h-[90vh] flex flex-col space-y-5 shadow-2xl relative">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white tracking-tight">League Venues Hub</h2>
              <p className="text-xs text-slate-400">Create, update, or remove partner host locations</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isAddingNew && !editingVenueId && (
              <button
                onClick={handleStartAdd}
                className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 transition-all shadow-md"
              >
                <Plus className="w-4 h-4" /> Add Venue
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Error Notification */}
        {errorMsg && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Create / Edit Form */}
        {(isAddingNew || editingVenueId) && (
          <form onSubmit={handleSaveVenue} className="glass-card rounded-xl p-4 border border-amber-500/40 space-y-4">
            <div className="text-xs font-bold text-amber-400 uppercase tracking-wider">
              {isAddingNew ? 'Create New Venue' : 'Edit Venue Details'}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">Venue Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. River Poker Lounge"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">Phone Number</label>
                <input
                  type="text"
                  placeholder="(555) 012-3456"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">Street Address *</label>
                <input
                  type="text"
                  required
                  placeholder="123 Main St, Suite 100, City, State"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">Website URL</label>
                <input
                  type="text"
                  placeholder="https://example.com"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">Photo Image URL</label>
                <input
                  type="text"
                  placeholder="https://..."
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={handleCancelForm}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 transition-all disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                {isSaving ? 'Saving to Appwrite...' : isAddingNew ? 'Create Venue' : 'Save Changes'}
              </button>
            </div>
          </form>
        )}

        {/* Existing Venues List */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {venues.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-sm">
              No venues registered yet. Click &quot;Add Venue&quot; above to create one.
            </div>
          ) : (
            venues.map((venue) => (
              <div
                key={venue.$id}
                className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all"
              >
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 overflow-hidden shrink-0">
                    {venue.imageUrl ? (
                      <img src={venue.imageUrl} alt={venue.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-500">
                        <ImageIcon className="w-5 h-5" />
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <h3 className="font-bold text-white text-base">{venue.name}</h3>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-amber-400" /> {venue.address}
                      </span>
                      {venue.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5 text-slate-500" /> {venue.phone}
                        </span>
                      )}
                      {venue.website && (
                        <a
                          href={venue.website}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 text-amber-400/90 hover:text-amber-300"
                        >
                          <Globe className="w-3.5 h-3.5" /> Website
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    onClick={() => handleStartEdit(venue)}
                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1 border border-slate-700 transition-all"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-amber-400" /> Edit
                  </button>
                  <button
                    onClick={() => handleDeleteVenue(venue.$id, venue.name)}
                    className="p-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-semibold flex items-center gap-1 border border-rose-500/20 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
};
