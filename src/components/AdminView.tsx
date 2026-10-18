import React, { useState } from 'react';
import type { Venue, UserProfile, UserRole, Season } from '../types/holdem';
import { AppwriteService } from '../services/appwriteService';
import { AuthService } from '../services/authService';
import { VenueManagerModal } from './VenueManagerModal';
import { 
  Building2, 
  ShieldCheck, 
  Plus, 
  MapPin, 
  Phone, 
  Globe, 
  Edit3, 
  Trash2, 
  Crown, 
  Briefcase, 
  PenTool, 
  Gamepad2, 
  Sliders, 
  ExternalLink,
  CheckCircle2,
  Users,
  Sparkles,
  Award,
  ArrowLeft
} from 'lucide-react';

interface AdminViewProps {
  venues: Venue[];
  seasons: Season[];
  currentUser: UserProfile | null;
  onVenuesChange: (venues: Venue[]) => void;
  onRoleChange: (role: UserRole) => void;
  onBack?: () => void;
}

export const AdminView: React.FC<AdminViewProps> = ({
  venues,
  seasons,
  currentUser,
  onVenuesChange,
  onRoleChange,
  onBack,
}) => {
  const [isVenueModalOpen, setIsVenueModalOpen] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const activeSeason = seasons.find((s) => s.isActive) || seasons[0];

  const handleQuickRoleSwitch = async (role: UserRole) => {
    onRoleChange(role);
    setSuccessMsg(`Switched active session role to: ${role.toUpperCase()}`);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6 pb-24 md:pb-12">
      
      {/* Back Button Header */}
      {onBack && (
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-amber-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
      )}

      {/* 1. Admin Header */}
      <div className="glass-panel rounded-2xl p-6 border border-amber-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-black uppercase tracking-wider">
                ADMINISTRATION PORTAL
              </span>
              <span className="text-xs text-slate-400">Restricted to League Managers</span>
            </div>
            <h1 className="text-2xl font-black text-white mt-1">League Governance &amp; Host Venues</h1>
          </div>
        </div>

        <button
          onClick={() => setIsVenueModalOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-2 transition-all shadow-lg"
        >
          <Plus className="w-4 h-4" /> Add Host Venue
        </button>
      </div>

      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* 2. Venue Management Section (CRUD) */}
      <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <Building2 className="w-5 h-5 text-amber-400" /> Host Venues Management ({venues.length})
            </h2>
            <p className="text-xs text-slate-400">Configure host locations, addresses, contact details, and venue photos</p>
          </div>

          <button
            onClick={() => setIsVenueModalOpen(true)}
            className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-all self-start sm:self-auto"
          >
            <Edit3 className="w-3.5 h-3.5 text-amber-400" /> Manage All Venues
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {venues.map((venue) => (
            <div
              key={venue.$id}
              className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 flex flex-col justify-between space-y-3 transition-all"
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

                <div className="space-y-1">
                  <h3 className="font-bold text-white text-base leading-tight">{venue.name}</h3>
                  <p className="text-xs text-slate-400 flex items-start gap-1">
                    <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                    <span>{venue.address}</span>
                  </p>
                  {venue.phone && (
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                      <Phone className="w-3 h-3 text-slate-500" /> {venue.phone}
                    </p>
                  )}
                </div>
              </div>

              <div className="pt-2.5 border-t border-slate-800 flex items-center justify-between text-xs">
                {venue.website ? (
                  <a
                    href={venue.website}
                    target="_blank"
                    rel="noreferrer"
                    className="text-amber-400 hover:underline flex items-center gap-1 font-semibold"
                  >
                    Website <ExternalLink className="w-3 h-3" />
                  </a>
                ) : (
                  <span className="text-slate-500">No link</span>
                )}

                <button
                  onClick={() => setIsVenueModalOpen(true)}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-semibold flex items-center gap-1 border border-slate-700 transition-all"
                >
                  <Edit3 className="w-3 h-3 text-amber-400" /> Edit
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Role-Based Access Control (RBAC) Governance */}
      <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-5">
        <div>
          <h2 className="text-lg font-black text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-400" /> Role-Based Access Control (RBAC)
          </h2>
          <p className="text-xs text-slate-400">Permissions breakdown across league operations</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Manager */}
          <div className="p-4 rounded-xl bg-slate-900/90 border border-amber-500/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40">
                MANAGER
              </span>
              <Crown className="w-4 h-4 text-amber-400" />
            </div>
            <h4 className="font-bold text-white text-sm">Full League Administration</h4>
            <ul className="text-xs text-slate-400 space-y-1 list-disc list-inside">
              <li>Manage Host Venues (CRUD)</li>
              <li>Schedule &amp; Delete Events</li>
              <li>Director Desk &amp; Clocks</li>
              <li>Finalize &amp; Award Points</li>
              <li>User Role Permissions</li>
            </ul>
            <button
              onClick={() => handleQuickRoleSwitch('manager')}
              className="w-full mt-2 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold transition-all"
            >
              Test as Manager
            </button>
          </div>

          {/* Dealer */}
          <div className="p-4 rounded-xl bg-slate-900/90 border border-emerald-500/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                DEALER
              </span>
              <Briefcase className="w-4 h-4 text-emerald-400" />
            </div>
            <h4 className="font-bold text-white text-sm">Table &amp; Clock Operations</h4>
            <ul className="text-xs text-slate-400 space-y-1 list-disc list-inside">
              <li>Start / Pause / Skip Clocks</li>
              <li>Track Rebuys &amp; Add-ons</li>
              <li>Execute Player Bust-outs</li>
              <li>Table Balancing</li>
              <li>No Venue/Config Access</li>
            </ul>
            <button
              onClick={() => handleQuickRoleSwitch('dealer')}
              className="w-full mt-2 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition-all"
            >
              Test as Dealer
            </button>
          </div>

          {/* Scribe */}
          <div className="p-4 rounded-xl bg-slate-900/90 border border-indigo-500/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                SCRIBE
              </span>
              <PenTool className="w-4 h-4 text-indigo-400" />
            </div>
            <h4 className="font-bold text-white text-sm">Check-in &amp; Scorekeeping</h4>
            <ul className="text-xs text-slate-400 space-y-1 list-disc list-inside">
              <li>Player Walk-in Seating</li>
              <li>Record Player Eliminations</li>
              <li>Award KO Bounties</li>
              <li>Tournament Notes</li>
              <li>View-Only for Clocks</li>
            </ul>
            <button
              onClick={() => handleQuickRoleSwitch('scribe')}
              className="w-full mt-2 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-bold transition-all"
            >
              Test as Scribe
            </button>
          </div>

          {/* Player */}
          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-700 space-y-2">
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700">
                PLAYER
              </span>
              <Gamepad2 className="w-4 h-4 text-slate-400" />
            </div>
            <h4 className="font-bold text-white text-sm">League Member Access</h4>
            <ul className="text-xs text-slate-400 space-y-1 list-disc list-inside">
              <li>View Games &amp; Clocks</li>
              <li>Public Standings &amp; Stats</li>
              <li>QR Mobile Check-in</li>
              <li>Hot Hand Jackpots</li>
              <li>No Director/Admin Desk</li>
            </ul>
            <button
              onClick={() => handleQuickRoleSwitch('player')}
              className="w-full mt-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-bold transition-all"
            >
              Test as Player
            </button>
          </div>

        </div>
      </div>

      {/* 4. Active Season Overview */}
      <div className="glass-card rounded-2xl p-6 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs uppercase tracking-wider text-amber-400 font-bold">Active League Season</span>
          <h3 className="text-xl font-black text-white mt-0.5">{activeSeason?.name || '2026 Crawl 3'}</h3>
          <p className="text-xs text-slate-400 mt-1">
            {activeSeason?.startDate} — {activeSeason?.endDate}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-center">
            <span className="text-[10px] text-slate-400 uppercase font-bold block">Status</span>
            <span className="text-xs font-black text-emerald-400">ACTIVE</span>
          </div>
        </div>
      </div>

      {/* Venue Manager Modal */}
      <VenueManagerModal
        isOpen={isVenueModalOpen}
        onClose={() => setIsVenueModalOpen(false)}
        venues={venues}
        onVenuesChange={onVenuesChange}
      />

    </div>
  );
};
