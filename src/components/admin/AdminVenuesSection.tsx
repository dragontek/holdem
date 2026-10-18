import React from 'react';
import type { Venue, Game } from '@/types/holdem';
import { Building2, Plus, MapPin, Phone, Edit3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

export interface AdminVenuesSectionProps {
  venues: Venue[];
  games: Game[];
  onOpenVenueModal: () => void;
}

export const AdminVenuesSection: React.FC<AdminVenuesSectionProps> = ({
  venues,
  games,
  onOpenVenueModal,
}) => {
  return (
    <div className="space-y-4">
      <Card className="p-5 border-slate-800 bg-slate-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="indigo" className="text-[10px]">
              STEP 2: VENUES
            </Badge>
            <span className="text-xs text-slate-400">Host Locations &amp; Tables</span>
          </div>
          <h2 className="text-lg font-black text-white flex items-center gap-2 mt-1">
            <Building2 className="w-5 h-5 text-emerald-400" /> Host Venues Directory ({venues.length})
          </h2>
          <p className="text-xs text-slate-400">
            Configure partner venues, bar addresses, phone numbers, and locations where tournaments take place.
          </p>
        </div>

        <Button
          variant="default"
          size="sm"
          onClick={onOpenVenueModal}
          className="self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Add Host Venue
        </Button>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {venues.map((venue) => (
          <Card
            key={venue.$id}
            className="p-5 border-slate-800 bg-slate-900/60 hover:border-slate-700 flex flex-col justify-between space-y-4 transition-all"
          >
            <div className="flex items-start gap-3">
              <div className="w-14 h-14 rounded-xl bg-slate-800 border border-slate-700 overflow-hidden shrink-0">
                {venue.imageUrl ? (
                  <img src={venue.imageUrl} alt={venue.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-500">
                    <Building2 className="w-6 h-6" />
                  </div>
                )}
              </div>

              <div className="space-y-1 flex-1 min-w-0">
                <h3 className="font-bold text-white text-base truncate">{venue.name}</h3>
                <p className="text-xs text-slate-400 flex items-center gap-1 truncate">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="truncate">{venue.address}</span>
                </p>
                {venue.phone && (
                  <p className="text-xs text-slate-400 flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>{venue.phone}</span>
                  </p>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
              <span className="text-[11px] text-slate-400">
                {games.filter((g) => g.venueId === venue.$id).length} Tournaments Hosted
              </span>

              <Button
                variant="outline"
                size="sm"
                onClick={onOpenVenueModal}
                className="h-8 text-xs"
              >
                <Edit3 className="w-3 h-3 text-amber-400" /> Edit
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
