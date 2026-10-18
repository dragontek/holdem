import React, { useState, useEffect } from 'react';
import type { Venue, UserProfile, UserRole, Season } from '../types/holdem';
import { AppwriteService } from '../services/appwriteService';
import { AuthService } from '../services/authService';
import { VenueManagerModal } from './VenueManagerModal';
import { SeasonManagerModal } from './SeasonManagerModal';
import { UserInviteModal } from './UserInviteModal';
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
  ArrowLeft,
  Calendar,
  Trophy,
  Check,
  Search,
  UserPlus
} from 'lucide-react';

interface AdminViewProps {
  venues: Venue[];
  seasons: Season[];
  currentUser: UserProfile | null;
  onVenuesChange: (venues: Venue[]) => void;
  onSeasonsChange: (seasons: Season[]) => void;
  onRoleChange: (role: UserRole) => void;
  onBack?: () => void;
}

export const AdminView: React.FC<AdminViewProps> = ({
  venues,
  seasons,
  currentUser,
  onVenuesChange,
  onSeasonsChange,
  onRoleChange,
  onBack,
}) => {
  const [isVenueModalOpen, setIsVenueModalOpen] = useState(false);
  const [isSeasonModalOpen, setIsSeasonModalOpen] = useState(false);
  const [isInviteUserOpen, setIsInviteUserOpen] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // User & Staff Management state
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [searchUserQuery, setSearchUserQuery] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<'all' | UserRole>('all');

  const activeSeason = seasons.find((s) => s.isActive) || seasons[0];

  useEffect(() => {
    async function loadUsers() {
      const allUsers = await AuthService.getAllUsers();
      setUsers(allUsers);
    }
    loadUsers();
  }, []);

  const handleQuickRoleSwitch = async (role: UserRole) => {
    onRoleChange(role);
    setSuccessMsg(`Switched active session role to: ${role.toUpperCase()}`);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleQuickSetActiveSeason = async (seasonId: string) => {
    const updated = await AppwriteService.setActiveSeason(seasonId, seasons);
    onSeasonsChange(updated);
    setSuccessMsg('Active season updated.');
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleChangeUserRole = async (userId: string, newRole: UserRole) => {
    const targetUser = users.find((u) => u.$id === userId);
    if (!targetUser) return;

    // Safety: check if demoting the only manager
    if (targetUser.role === 'manager' && newRole !== 'manager') {
      const managerCount = users.filter((u) => u.role === 'manager').length;
      if (managerCount <= 1) {
        alert('Cannot demote the only manager. Please promote another user to manager first.');
        return;
      }
    }

    const updated = await AuthService.updateUserRole(userId, newRole, currentUser);
    setUsers(updated);

    if (currentUser && currentUser.$id === userId) {
      onRoleChange(newRole);
    }

    setSuccessMsg(`Updated ${targetUser.name}'s role to ${newRole.toUpperCase()}`);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (currentUser && currentUser.$id === userId) {
      alert('You cannot delete your own active user account.');
      return;
    }
    const targetUser = users.find((u) => u.$id === userId);
    if (targetUser?.role === 'manager') {
      const managerCount = users.filter((u) => u.role === 'manager').length;
      if (managerCount <= 1) {
        alert('Cannot delete the only manager in the league.');
        return;
      }
    }

    if (!window.confirm(`Are you sure you want to remove user "${userName}"?`)) return;

    const updated = await AuthService.deleteUser(userId);
    setUsers(updated);
    setSuccessMsg(`User "${userName}" has been removed.`);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleUserCreated = (newUser: UserProfile) => {
    setUsers((prev) => [newUser, ...prev]);
    setSuccessMsg(`Added user "${newUser.name}" as ${newUser.role.toUpperCase()}`);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchUserQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchUserQuery.toLowerCase());
    const matchesRole = selectedRoleFilter === 'all' || u.role === selectedRoleFilter;
    return matchesSearch && matchesRole;
  });

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr + 'T00:00:00');
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
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
            <h1 className="text-2xl font-black text-white mt-1">League Governance &amp; Administration</h1>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <button
            onClick={() => setIsSeasonModalOpen(true)}
            className="flex-1 md:flex-none px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-400 border border-amber-500/40 text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md"
          >
            <Trophy className="w-4 h-4" /> Manage Seasons
          </button>
          <button
            onClick={() => setIsVenueModalOpen(true)}
            className="flex-1 md:flex-none px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-lg"
          >
            <Plus className="w-4 h-4" /> Add Venue
          </button>
        </div>
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

      {/* 3. Users & Staff Role Management */}
      <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 text-[10px] font-black uppercase tracking-wider">
                STAFF ACCESS &amp; ROLES
              </span>
            </div>
            <h2 className="text-lg font-black text-white flex items-center gap-2 mt-1">
              <Users className="w-5 h-5 text-indigo-400" /> Users &amp; Staff Role Management ({users.length})
            </h2>
            <p className="text-xs text-slate-400">
              Assign and modify roles (Manager, Dealer, Scribe, Player) for league personnel
            </p>
          </div>

          <button
            onClick={() => setIsInviteUserOpen(true)}
            className="px-4 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-bold flex items-center gap-2 transition-all shadow-md self-start sm:self-auto"
          >
            <UserPlus className="w-4 h-4" /> Add Member / Staff
          </button>
        </div>

        {/* Search & Role Filter Tabs */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search user by name or email..."
              value={searchUserQuery}
              onChange={(e) => setSearchUserQuery(e.target.value)}
              className="w-full bg-slate-900/90 text-xs text-white placeholder-slate-500 pl-10 pr-4 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {(['all', 'manager', 'dealer', 'scribe', 'player'] as const).map((r) => {
              const count = r === 'all' ? users.length : users.filter((u) => u.role === r).length;
              return (
                <button
                  key={r}
                  onClick={() => setSelectedRoleFilter(r)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    selectedRoleFilter === r
                      ? 'bg-indigo-500 text-white font-bold shadow'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  {r === 'all' ? 'All' : r.charAt(0).toUpperCase() + r.slice(1) + 's'} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Users Roster List */}
        <div className="space-y-2.5">
          {filteredUsers.length === 0 ? (
            <div className="p-8 rounded-xl bg-slate-900/50 border border-slate-800 text-center text-slate-400 text-xs">
              No users match your search criteria.
            </div>
          ) : (
            filteredUsers.map((user) => {
              const isSelf = Boolean(currentUser && currentUser.$id === user.$id);
              return (
                <div
                  key={user.$id}
                  className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-sm font-black text-amber-400 shrink-0">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-white text-sm truncate">{user.name}</h4>
                        {isSelf && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/40">
                            YOU
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 truncate">{user.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
                    {/* Role Selector Dropdown */}
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase text-slate-400 hidden sm:inline">Role:</span>
                      <select
                        value={user.role}
                        onChange={(e) => handleChangeUserRole(user.$id, e.target.value as UserRole)}
                        className={`text-xs font-bold px-3 py-1.5 rounded-xl border focus:outline-none transition-all cursor-pointer ${
                          user.role === 'manager'
                            ? 'bg-amber-500/10 text-amber-300 border-amber-500/40'
                            : user.role === 'dealer'
                            ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/40'
                            : user.role === 'scribe'
                            ? 'bg-indigo-500/10 text-indigo-300 border-indigo-500/40'
                            : 'bg-slate-800 text-slate-300 border-slate-700'
                        }`}
                      >
                        <option value="manager" className="bg-slate-900 text-amber-300">👑 Manager (Admin)</option>
                        <option value="dealer" className="bg-slate-900 text-emerald-300">💼 Dealer (Clocks)</option>
                        <option value="scribe" className="bg-slate-900 text-indigo-300">🖊️ Scribe (Seating)</option>
                        <option value="player" className="bg-slate-900 text-slate-300">🎮 Player (Public)</option>
                      </select>
                    </div>

                    {/* Delete User Button */}
                    <button
                      onClick={() => handleDeleteUser(user.$id, user.name)}
                      disabled={isSelf}
                      className="p-2 rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/30 transition-all disabled:opacity-20 disabled:hover:bg-transparent disabled:hover:text-slate-500 disabled:hover:border-transparent"
                      title={isSelf ? 'Cannot delete yourself' : 'Remove user'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 4. Role-Based Access Control (RBAC) Governance */}
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

      {/* 4. Championship Seasons Management (CRUD) */}
      <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-400" /> League Championship Seasons ({seasons.length})
            </h2>
            <p className="text-xs text-slate-400">Configure championship crawls, active calendar dates, and historical standings</p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={() => setIsSeasonModalOpen(true)}
              className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-all"
            >
              <Edit3 className="w-3.5 h-3.5 text-amber-400" /> Manage Seasons
            </button>
            <button
              onClick={() => setIsSeasonModalOpen(true)}
              className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 transition-all shadow-md"
            >
              <Plus className="w-3.5 h-3.5" /> New Season
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {seasons.map((season) => (
            <div
              key={season.$id}
              className={`p-4 rounded-xl border flex flex-col justify-between space-y-3 transition-all ${
                season.isActive
                  ? 'bg-amber-500/10 border-amber-500/50 gold-glow'
                  : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-bold text-white text-base leading-tight">{season.name}</h3>
                  {season.isActive ? (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shrink-0">
                      <Check className="w-3 h-3" /> ACTIVE
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 text-[10px] font-semibold uppercase tracking-wider shrink-0">
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

              <div className="pt-2.5 border-t border-slate-800 flex items-center justify-between text-xs">
                {!season.isActive ? (
                  <button
                    onClick={() => handleQuickSetActiveSeason(season.$id)}
                    className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                  >
                    Make Active Season
                  </button>
                ) : (
                  <span className="text-xs font-semibold text-amber-400 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> Current Season
                  </span>
                )}

                <button
                  onClick={() => setIsSeasonModalOpen(true)}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-semibold flex items-center gap-1 border border-slate-700 transition-all"
                >
                  <Edit3 className="w-3 h-3 text-amber-400" /> Edit
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Venue Manager Modal */}
      <VenueManagerModal
        isOpen={isVenueModalOpen}
        onClose={() => setIsVenueModalOpen(false)}
        venues={venues}
        onVenuesChange={onVenuesChange}
      />

      {/* Season Manager Modal */}
      <SeasonManagerModal
        isOpen={isSeasonModalOpen}
        onClose={() => setIsSeasonModalOpen(false)}
        seasons={seasons}
        onSeasonsChange={onSeasonsChange}
      />

      {/* User Invite / Staff Creation Modal */}
      <UserInviteModal
        isOpen={isInviteUserOpen}
        onClose={() => setIsInviteUserOpen(false)}
        onUserCreated={handleUserCreated}
      />

    </div>
  );
};
