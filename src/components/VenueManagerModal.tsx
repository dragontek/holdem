import React, { useState } from 'react';
import type { Venue } from '@/types/holdem';
import { AppwriteService } from '@/services/appwriteService';
import { 
  Building2, 
  Plus, 
  MapPin, 
  Phone, 
  Globe, 
  Trash2, 
  Edit3, 
  Check, 
  AlertCircle,
  Image as ImageIcon
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';

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
    if (!formData.name.trim() || !formData.address.trim()) {
      setErrorMsg('Venue name and address are required.');
      return;
    }

    setIsSaving(true);
    setErrorMsg('');

    try {
      if (isAddingNew) {
        const created = await AppwriteService.createVenue({
          leagueId: '1',
          name: formData.name.trim(),
          address: formData.address.trim(),
          phone: formData.phone.trim(),
          website: formData.website.trim() || undefined,
          imageUrl: formData.imageUrl.trim() || undefined,
        });

        onVenuesChange([...venues, created]);
        setIsAddingNew(false);
      } else if (editingVenueId) {
        const success = await AppwriteService.updateVenue(editingVenueId, {
          name: formData.name.trim(),
          address: formData.address.trim(),
          phone: formData.phone.trim(),
          website: formData.website.trim() || undefined,
          imageUrl: formData.imageUrl.trim() || undefined,
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
                    website: formData.website.trim() || undefined,
                    imageUrl: formData.imageUrl.trim() || undefined,
                  }
                : v
            )
          );
          setEditingVenueId(null);
        } else {
          setErrorMsg('Failed to update venue');
        }
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error saving venue';
      setErrorMsg(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteVenue = async (venueId: string, venueName: string) => {
    if (!window.confirm(`Are you sure you want to remove "${venueName}"?`)) {
      return;
    }

    setIsSaving(true);
    setErrorMsg('');

    try {
      const success = await AppwriteService.deleteVenue(venueId);
      if (success) {
        onVenuesChange(venues.filter((v) => v.$id !== venueId));
      } else {
        setErrorMsg('Failed to delete venue');
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error deleting venue';
      setErrorMsg(msg);
    } finally {
      setIsSaving(false);
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
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-white tracking-tight">
                  League Host Venues Hub
                </DialogTitle>
                <DialogDescription>
                  Create, update, or remove partner tournament host locations
                </DialogDescription>
              </div>
            </div>

            {!isAddingNew && !editingVenueId && (
              <Button
                variant="default"
                size="sm"
                onClick={handleStartAdd}
                className="mr-6"
              >
                <Plus className="w-4 h-4" /> Add Venue
              </Button>
            )}
          </div>
        </DialogHeader>

        {/* Error Notification */}
        {errorMsg && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Create / Edit Form */}
        {(isAddingNew || editingVenueId) && (
          <Card className="border-amber-500/40 bg-slate-900/90 shadow-lg">
            <form onSubmit={handleSaveVenue}>
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                    {isAddingNew ? 'Create New Venue' : 'Edit Venue Details'}
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="venueName">Venue Name *</Label>
                    <Input
                      id="venueName"
                      type="text"
                      required
                      placeholder="e.g. River Poker Lounge"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="venuePhone">Phone Number</Label>
                    <Input
                      id="venuePhone"
                      type="text"
                      placeholder="(555) 012-3456"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>

                  <div className="sm:col-span-2 space-y-1.5">
                    <Label htmlFor="venueAddress">Street Address *</Label>
                    <Input
                      id="venueAddress"
                      type="text"
                      required
                      placeholder="123 Main St, Suite 100, City, State"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="venueWebsite">Website URL</Label>
                    <Input
                      id="venueWebsite"
                      type="text"
                      placeholder="https://example.com"
                      value={formData.website}
                      onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="venueImageUrl">Photo Image URL</Label>
                    <Input
                      id="venueImageUrl"
                      type="text"
                      placeholder="https://..."
                      value={formData.imageUrl}
                      onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                    />
                  </div>
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
                    <Check className="w-4 h-4" />
                    {isSaving ? 'Saving...' : isAddingNew ? 'Create Venue' : 'Save Changes'}
                  </Button>
                </div>
              </CardContent>
            </form>
          </Card>
        )}

        {/* Existing Venues List */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-thin">
          {venues.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-sm">
              No venues registered yet. Click &quot;Add Venue&quot; above to create one.
            </div>
          ) : (
            venues.map((venue) => (
              <Card
                key={venue.$id}
                className="hover:border-slate-700 bg-slate-900/60 transition-all"
              >
                <div className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
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
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleStartEdit(venue)}
                    >
                      <Edit3 className="w-3.5 h-3.5 text-amber-400" /> Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteVenue(venue.$id, venue.name)}
                      className="hover:border-rose-500/40 hover:bg-rose-500/20 hover:text-rose-400 text-slate-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>

      </DialogContent>
    </Dialog>
  );
};

export default VenueManagerModal;
