import React, { useState, useEffect } from 'react';
import type { Game, Venue, UserProfile, UserRole, Season } from '../types/holdem';
import { AppwriteService } from '../services/appwriteService';
import { AuthService } from '../services/authService';
import { EventScheduleModal } from './EventScheduleModal';
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
  ExternalLink,
  CheckCircle2,
  Users,
  Sparkles,
  ArrowLeft,
  ArrowDown,
  Calendar,
  Trophy,
  Check,
  Search,
  UserPlus,
  PlayCircle,
  Clock,
  Layers,
  ChevronRight,
  DollarSign
} from 'lucide-react';

export type AdminTab = 'flow' | 'seasons' | 'venues' | 'schedules' | 'users' | 'rbac';

interface AdminViewProps {
  games: Game[];
  venues: Venue[];
  seasons: Season[];
  currentUser: UserProfile | null;
  onGamesChange: (games: Game[]) => void;
  onVenuesChange: (venues: Venue[]) => void;
  onSeasonsChange: (seasons: Season[]) => void;
  onRoleChange: (role: UserRole) => void;
  onSelectGame?: (game: Game) => void;
  onBack?: () => void;
  backLabel?: string;
}

export const AdminView: React.FC<AdminViewProps> = ({
  games,
  venues,
  seasons,
  currentUser,
  onGamesChange,
  onVenuesChange,
  onSeasonsChange,
  onRoleChange,
  onSelectGame,
  onBack,
  backLabel = 'Back to Games',
}) => {
  // Default to the full top-to-bottom setup workflow (Seasons -> Venues -> Schedules)
  const [activeTab, setActiveTab] = useState<AdminTab>('flow');

  // Modals state
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [gameToEdit, setGameToEdit] = useState<Game | null>(null);
  const [isVenueModalOpen, setIsVenueModalOpen] = useState(false);
  const [isSeasonModalOpen, setIsSeasonModalOpen] = useState(false);
  const [isInviteUserOpen, setIsInviteUserOpen] = useState(false);

  // Feedback notifications
  const [successMsg, setSuccessMsg] = useState('');

  // Schedules filter state (filtered by season and venue)
  const [selectedScheduleSeason, setSelectedScheduleSeason] = useState<string>('all');
  const [selectedScheduleVenue, setSelectedScheduleVenue] = useState<string>('all');

  // Users & Staff state
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

  const handleDeleteGame = async (gameId: string, gameTitle: string) => {
    if (!window.confirm(`Are you sure you want to cancel and delete "${gameTitle}"?`)) return;
    try {
      await AppwriteService.deleteGame(gameId);
      onGamesChange(games.filter((g) => g.$id !== gameId));
      setSuccessMsg(`Deleted event "${gameTitle}".`);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch {
      alert('Failed to delete event');
    }
  };

  // Filter games based on selected season and venue
  const filteredGames = games.filter((g) => {
    const matchesSeason = selectedScheduleSeason === 'all' || g.seasonId === selectedScheduleSeason;
    const matchesVenue = selectedScheduleVenue === 'all' || g.venueId === selectedScheduleVenue;
    return matchesSeason && matchesVenue;
  });

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

  // ========================================================
  // SUB-SECTION RENDERERS
  // ========================================================

  // 1. Championship Seasons Section (Top Level Hierarchy)
  const renderSeasonsSection = () => (
    <div className="space-y-4">
      <div className="glass-card rounded-2xl p-5 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
              STEP 1: SEASONS
            </span>
            <span className="text-xs text-slate-400">Points Race &amp; Timeline</span>
          </div>
          <h2 className="text-lg font-black text-white flex items-center gap-2 mt-1">
            <Trophy className="w-5 h-5 text-amber-400" /> Championship Seasons Directory ({seasons.length})
          </h2>
          <p className="text-xs text-slate-400">
            Define championship seasons, start/end dates, and select the current active season for the league.
          </p>
        </div>

        <button
          onClick={() => setIsSeasonModalOpen(true)}
          className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-2 transition-all shadow-md self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Create Season
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {seasons.map((season) => (
          <div
            key={season.$id}
            className={`p-5 rounded-2xl border flex flex-col justify-between space-y-4 transition-all ${
              season.isActive
                ? 'bg-amber-500/10 border-amber-500/50 gold-glow'
                : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="space-y-2">
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

              <div className="text-[11px] text-slate-400 pt-1">
                {games.filter((g) => g.seasonId === season.$id).length} tournaments scheduled in this season
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
              {!season.isActive ? (
                <button
                  onClick={() => handleQuickSetActiveSeason(season.$id)}
                  className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                >
                  Make Active Season
                </button>
              ) : (
                <span className="text-xs font-semibold text-amber-400 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Current Active
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
  );

  // 2. Host Venues Section (Mid Level Hierarchy)
  const renderVenuesSection = () => (
    <div className="space-y-4">
      <div className="glass-card rounded-2xl p-5 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              STEP 2: VENUES
            </span>
            <span className="text-xs text-slate-400">Host Locations &amp; Tables</span>
          </div>
          <h2 className="text-lg font-black text-white flex items-center gap-2 mt-1">
            <Building2 className="w-5 h-5 text-emerald-400" /> Host Venues Directory ({venues.length})
          </h2>
          <p className="text-xs text-slate-400">
            Configure partner venues, bar addresses, phone numbers, and locations where tournaments take place.
          </p>
        </div>

        <button
          onClick={() => setIsVenueModalOpen(true)}
          className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-2 transition-all shadow-md self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Add Host Venue
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {venues.map((venue) => (
          <div
            key={venue.$id}
            className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 flex flex-col justify-between space-y-4 transition-all"
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
  );

  // 3. Tournament Schedules Section (Bottom Level Hierarchy, Scoped by Season)
  const renderSchedulesSection = () => (
    <div className="space-y-4">
      <div className="glass-card rounded-2xl p-5 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
              STEP 3: SCHEDULES
            </span>
            <span className="text-xs text-slate-400">Events within Championship Seasons</span>
          </div>
          <h2 className="text-lg font-black text-white flex items-center gap-2 mt-1">
            <Calendar className="w-5 h-5 text-amber-400" /> Tournament Event Schedules ({filteredGames.length})
          </h2>
          <p className="text-xs text-slate-400">
            Schedule tournaments across host venues under the active championship season.
          </p>
        </div>

        {/* Filters & Action */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Season Selector */}
          <select
            value={selectedScheduleSeason}
            onChange={(e) => setSelectedScheduleSeason(e.target.value)}
            className="bg-slate-900 text-white text-xs font-semibold px-3 py-2 rounded-xl border border-slate-800 focus:outline-none focus:border-amber-500"
          >
            <option value="all">All Seasons ({games.length})</option>
            {seasons.map((s) => {
              const count = games.filter((g) => g.seasonId === s.$id).length;
              return (
                <option key={s.$id} value={s.$id}>
                  {s.name} {s.isActive ? '(Active)' : ''} ({count})
                </option>
              );
            })}
          </select>

          {/* Venue Selector */}
          <select
            value={selectedScheduleVenue}
            onChange={(e) => setSelectedScheduleVenue(e.target.value)}
            className="bg-slate-900 text-white text-xs font-semibold px-3 py-2 rounded-xl border border-slate-800 focus:outline-none focus:border-amber-500"
          >
            <option value="all">All Venues</option>
            {venues.map((v) => (
              <option key={v.$id} value={v.$id}>
                {v.name}
              </option>
            ))}
          </select>

          <button
            onClick={() => {
              setGameToEdit(null);
              setIsScheduleModalOpen(true);
            }}
            className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shrink-0"
          >
            <Plus className="w-4 h-4" /> Schedule Tournament
          </button>
        </div>
      </div>

      {filteredGames.length === 0 ? (
        <div className="p-12 text-center glass-card rounded-2xl border border-slate-800 space-y-3">
          <Calendar className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-white">No Tournaments Match Selection</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            No events found for this season or venue filter. Click below to schedule a new tournament.
          </p>
          <button
            onClick={() => {
              setGameToEdit(null);
              setIsScheduleModalOpen(true);
            }}
            className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 text-xs font-bold inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Schedule Event Now
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredGames.map((game) => {
            const venue = venues.find((v) => v.$id === game.venueId);
            const season = seasons.find((s) => s.$id === game.seasonId);
            const isLive = game.status === 'running';
            const isCompleted = game.status === 'completed';

            return (
              <div
                key={game.$id}
                className={`glass-card rounded-2xl p-5 border transition-all relative overflow-hidden flex flex-col justify-between space-y-4 ${
                  isLive ? 'border-emerald-500/50 felt-glow' : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {isLive ? (
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-black uppercase tracking-wider flex items-center gap-1 animate-pulse">
                          <PlayCircle className="w-3 h-3" /> LIVE IN PROGRESS
                        </span>
                      ) : isCompleted ? (
                        <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 text-[10px] font-semibold uppercase tracking-wider">
                          OFFICIAL COMPLETED
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1">
                          <Clock className="w-3 h-3" /> SCHEDULED EVENT
                        </span>
                      )}

                      {/* Season & Venue context badges */}
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                        {season?.name || 'Active Season'}
                      </span>
                    </div>

                    <span className="text-xs text-slate-400 font-medium">
                      {venue?.name || game.venueName}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-white leading-tight">{game.title}</h3>
                    <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        {game.scheduledAt}
                      </span>
                      {game.dealerName && (
                        <span>• TD: {game.dealerName}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Metrics Strip */}
                <div className="grid grid-cols-4 gap-2 py-2 border-y border-slate-800/80 text-center text-xs">
                  <div className="bg-slate-900/60 p-2 rounded-xl border border-slate-800/60">
                    <span className="text-[10px] text-slate-400 block uppercase font-medium">Buy-in</span>
                    <strong className="text-emerald-400">${game.buyinAmount}</strong>
                  </div>
                  <div className="bg-slate-900/60 p-2 rounded-xl border border-slate-800/60">
                    <span className="text-[10px] text-slate-400 block uppercase font-medium">Stack</span>
                    <strong className="text-indigo-300">{(game.startingChips / 1000).toFixed(0)}k</strong>
                  </div>
                  <div className="bg-slate-900/60 p-2 rounded-xl border border-slate-800/60">
                    <span className="text-[10px] text-slate-400 block uppercase font-medium">Rebuys</span>
                    <strong className="text-amber-400">${game.rebuyAmount}</strong>
                  </div>
                  <div className="bg-slate-900/60 p-2 rounded-xl border border-slate-800/60">
                    <span className="text-[10px] text-slate-400 block uppercase font-medium">Players</span>
                    <strong className="text-white">{game.remainingPlayersCount} / {game.totalPlayersCount}</strong>
                  </div>
                </div>

                {/* Actions Strip */}
                <div className="flex items-center justify-between pt-1 text-xs">
                  <div className="flex items-center gap-2">
                    {onSelectGame && (
                      <button
                        onClick={() => onSelectGame(game)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold flex items-center gap-1 transition-all shadow"
                      >
                        <PlayCircle className="w-3.5 h-3.5" /> Launch Director Desk
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setGameToEdit(game);
                        setIsScheduleModalOpen(true);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-semibold flex items-center gap-1 border border-slate-700 transition-all"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-amber-400" /> Edit
                    </button>

                    <button
                      onClick={() => handleDeleteGame(game.$id, game.title)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 border border-slate-700 hover:border-red-500/40 transition-all"
                      title="Delete Event"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  // 4. Users & Staff Section
  const renderUsersSection = () => (
    <div className="space-y-4">
      <div className="glass-card rounded-2xl p-5 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              STEP 4: PERSONNEL
            </span>
            <span className="text-xs text-slate-400">Roles &amp; Access</span>
          </div>
          <h2 className="text-lg font-black text-white flex items-center gap-2 mt-1">
            <Users className="w-5 h-5 text-indigo-400" /> Users &amp; Staff Role Management ({users.length})
          </h2>
          <p className="text-xs text-slate-400">
            Assign and modify roles (Manager, Dealer, Scribe, Player) for league personnel.
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

      {/* Users List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredUsers.map((user) => {
          const isCurrentUser = currentUser?.$id === user.$id;
          return (
            <div
              key={user.$id}
              className={`p-4 rounded-xl border flex flex-col justify-between space-y-3 transition-all ${
                isCurrentUser
                  ? 'bg-indigo-500/10 border-indigo-500/40'
                  : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <h4 className="text-sm font-bold text-white">{user.name}</h4>
                    {isCurrentUser && (
                      <span className="px-1.5 py-0.2 rounded text-[9px] uppercase font-black bg-indigo-500/30 text-indigo-300">
                        You
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400">{user.email}</p>
                </div>

                <div className="shrink-0">
                  <select
                    value={user.role}
                    onChange={(e) => handleChangeUserRole(user.$id, e.target.value as UserRole)}
                    className="bg-slate-950 text-xs font-bold text-amber-400 border border-slate-700 rounded-lg px-2 py-1 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="manager">👑 Manager</option>
                    <option value="dealer">💼 Dealer</option>
                    <option value="scribe">✍️ Scribe</option>
                    <option value="player">🎮 Player</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <span className="text-[11px] text-slate-400">
                  Role: <strong className="text-slate-200 capitalize">{user.role}</strong>
                </span>

                <button
                  onClick={() => handleDeleteUser(user.$id, user.name)}
                  disabled={isCurrentUser}
                  className="text-xs text-slate-500 hover:text-rose-400 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                >
                  Remove User
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  // 5. Role Permissions (RBAC) Section
  const renderRBACSection = () => (
    <div className="space-y-6">
      <div className="glass-card rounded-2xl p-5 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-amber-400" /> Role-Based Access Control (RBAC) Matrix
          </h2>
          <p className="text-xs text-slate-400">
            Preview and test permission capabilities for each user role in the league
          </p>
        </div>

        {/* Quick Role Tester Switcher */}
        <div className="flex items-center gap-1.5 bg-slate-900 p-1.5 rounded-xl border border-slate-800">
          <span className="text-[10px] text-slate-400 font-bold uppercase px-2">Simulate Role:</span>
          {(['manager', 'dealer', 'scribe', 'player'] as const).map((r) => (
            <button
              key={r}
              onClick={() => handleQuickRoleSwitch(r)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                currentUser?.role === r
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {r.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Permissions Breakdown Matrix */}
      <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-4">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider">Operational Permissions Matrix</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="py-2.5 px-3">System Capability</th>
                <th className="py-2.5 px-3">Manager</th>
                <th className="py-2.5 px-3">Dealer</th>
                <th className="py-2.5 px-3">Scribe</th>
                <th className="py-2.5 px-3">Player</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              <tr>
                <td className="py-2.5 px-3 font-semibold text-white">Full League Admin &amp; CRUD (Seasons, Venues, Users)</td>
                <td className="py-2.5 px-3 text-emerald-400 font-bold">✓ Full</td>
                <td className="py-2.5 px-3 text-slate-500">✗ None</td>
                <td className="py-2.5 px-3 text-slate-500">✗ None</td>
                <td className="py-2.5 px-3 text-slate-500">✗ None</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-semibold text-white">Schedule Tournaments</td>
                <td className="py-2.5 px-3 text-emerald-400 font-bold">✓ Full</td>
                <td className="py-2.5 px-3 text-slate-500">✗ None</td>
                <td className="py-2.5 px-3 text-slate-500">✗ None</td>
                <td className="py-2.5 px-3 text-slate-500">✗ None</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-semibold text-white">Director Desk Access (Live Tournament Operator)</td>
                <td className="py-2.5 px-3 text-emerald-400 font-bold">✓ Full</td>
                <td className="py-2.5 px-3 text-emerald-400 font-bold">✓ Full</td>
                <td className="py-2.5 px-3 text-emerald-400 font-bold">✓ Full</td>
                <td className="py-2.5 px-3 text-slate-500">✗ Read-Only</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-semibold text-white">Manage Blind Clock &amp; Levels</td>
                <td className="py-2.5 px-3 text-emerald-400 font-bold">✓ Full</td>
                <td className="py-2.5 px-3 text-emerald-400 font-bold">✓ Full</td>
                <td className="py-2.5 px-3 text-slate-500">✗ View Only</td>
                <td className="py-2.5 px-3 text-slate-500">✗ View Only</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-semibold text-white">Seat Walk-In Players &amp; Add Chips</td>
                <td className="py-2.5 px-3 text-emerald-400 font-bold">✓ Full</td>
                <td className="py-2.5 px-3 text-emerald-400 font-bold">✓ Full</td>
                <td className="py-2.5 px-3 text-emerald-400 font-bold">✓ Full</td>
                <td className="py-2.5 px-3 text-slate-500">✗ None</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-semibold text-white">Record Bust-outs &amp; Assign KO Bounties</td>
                <td className="py-2.5 px-3 text-emerald-400 font-bold">✓ Full</td>
                <td className="py-2.5 px-3 text-emerald-400 font-bold">✓ Full</td>
                <td className="py-2.5 px-3 text-emerald-400 font-bold">✓ Full</td>
                <td className="py-2.5 px-3 text-slate-500">✗ None</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6 pb-24 md:pb-12 animate-fadeIn">
      
      {/* Back Button Header */}
      {onBack && (
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-amber-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> {backLabel}
        </button>
      )}

      {/* 1. Executive Admin Header with KPI Metric Badges */}
      <div className="glass-panel rounded-2xl p-6 border border-amber-500/30 space-y-5">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 shadow-lg">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-black uppercase tracking-wider">
                  MANAGEMENT PORTAL
                </span>
                <span className="text-xs text-slate-400 font-medium">Executive League Console</span>
              </div>
              <h1 className="text-2xl font-black text-white mt-0.5">League Operations &amp; Administration</h1>
            </div>
          </div>

          {/* Quick Contextual Create Action */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <button
              onClick={() => {
                setGameToEdit(null);
                setIsScheduleModalOpen(true);
              }}
              className="w-full md:w-auto px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-lg"
            >
              <Plus className="w-4 h-4" /> Schedule Tournament
            </button>
          </div>
        </div>

        {/* Executive KPI Stats Bar - Ordered in natural setup sequence (Seasons -> Venues -> Schedules -> Users) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-800/80">
          <div 
            onClick={() => setActiveTab('seasons')}
            className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
              activeTab === 'seasons' ? 'bg-amber-500/10 border-amber-500/50' : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5 text-amber-400" /> 1. Active Season
            </div>
            <div className="text-base font-black text-amber-300 mt-1 truncate">{activeSeason?.name || '2026 Crawl 3'}</div>
            <span className="text-[10px] text-slate-500 mt-0.5 block">{seasons.length} Total Seasons</span>
          </div>

          <div 
            onClick={() => setActiveTab('venues')}
            className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
              activeTab === 'venues' ? 'bg-amber-500/10 border-amber-500/50' : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-emerald-400" /> 2. Host Venues
            </div>
            <div className="text-base font-black text-white mt-1">{venues.length} Locations</div>
            <span className="text-[10px] text-slate-500 mt-0.5 block">Partner Bars &amp; Clubs</span>
          </div>

          <div 
            onClick={() => setActiveTab('schedules')}
            className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
              activeTab === 'schedules' ? 'bg-amber-500/10 border-amber-500/50' : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-amber-400" /> 3. Event Schedules
            </div>
            <div className="text-base font-black text-white mt-1">{games.length} Events</div>
            <span className="text-[10px] text-slate-500 mt-0.5 block">Tournaments Scheduled</span>
          </div>

          <div 
            onClick={() => setActiveTab('users')}
            className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
              activeTab === 'users' ? 'bg-amber-500/10 border-amber-500/50' : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-indigo-400" /> 4. Users &amp; Staff
            </div>
            <div className="text-base font-black text-white mt-1">{users.length} Registered</div>
            <span className="text-[10px] text-slate-500 mt-0.5 block">Managers, TDs &amp; Scribes</span>
          </div>
        </div>
      </div>

      {/* Success Notification Alert */}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* 2. Sleek Segmented Admin Tab Navigation Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-slate-800">
        <button
          onClick={() => setActiveTab('flow')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            activeTab === 'flow'
              ? 'bg-amber-500 text-slate-950 shadow-md font-extrabold'
              : 'glass-card text-amber-400/90 hover:bg-slate-800'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Full Setup Flow</span>
          <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-slate-950/20 text-slate-950 font-black uppercase">
            Top-to-Bottom
          </span>
        </button>

        <button
          onClick={() => setActiveTab('seasons')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            activeTab === 'seasons'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'glass-card text-slate-300 hover:bg-slate-800'
          }`}
        >
          <Trophy className="w-4 h-4" />
          <span>1. Championship Seasons</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
            activeTab === 'seasons' ? 'bg-slate-950 text-amber-400' : 'bg-slate-800 text-slate-400'
          }`}>
            {seasons.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('venues')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            activeTab === 'venues'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'glass-card text-slate-300 hover:bg-slate-800'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>2. Host Venues</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
            activeTab === 'venues' ? 'bg-slate-950 text-amber-400' : 'bg-slate-800 text-slate-400'
          }`}>
            {venues.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('schedules')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            activeTab === 'schedules'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'glass-card text-slate-300 hover:bg-slate-800'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>3. Event Schedules (by Season)</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
            activeTab === 'schedules' ? 'bg-slate-950 text-amber-400' : 'bg-slate-800 text-slate-400'
          }`}>
            {games.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            activeTab === 'users'
              ? 'bg-indigo-500 text-white shadow-md'
              : 'glass-card text-slate-300 hover:bg-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>4. Staff &amp; Users</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
            activeTab === 'users' ? 'bg-slate-950 text-indigo-300' : 'bg-slate-800 text-slate-400'
          }`}>
            {users.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('rbac')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            activeTab === 'rbac'
              ? 'bg-slate-800 text-amber-400 border border-amber-500/50 shadow-md'
              : 'glass-card text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-amber-400" />
          <span>5. Role Permissions (RBAC)</span>
        </button>
      </div>

      {/* 3. TAB / FLOW CONTENT VIEWS */}

      {/* FULL TOP-TO-BOTTOM SETUP FLOW */}
      {activeTab === 'flow' && (
        <div className="space-y-8 animate-fadeIn">
          {/* Stage 1: Championship Seasons */}
          <section className="space-y-4">
            {renderSeasonsSection()}
          </section>

          {/* Sequential Flow Indicator 1 -> 2 */}
          <div className="flex items-center justify-center py-1">
            <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs text-slate-400 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span className="font-semibold text-slate-300">Step 1 Configured</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
              <span>Step 2: Assign Host Venues</span>
              <ArrowDown className="w-3.5 h-3.5 text-amber-400 animate-bounce" />
            </div>
          </div>

          {/* Stage 2: Host Venues */}
          <section className="space-y-4">
            {renderVenuesSection()}
          </section>

          {/* Sequential Flow Indicator 2 -> 3 */}
          <div className="flex items-center justify-center py-1">
            <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs text-slate-400 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="font-semibold text-slate-300">Step 2 Configured</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
              <span>Step 3: Schedule Tournaments within each Season</span>
              <ArrowDown className="w-3.5 h-3.5 text-emerald-400 animate-bounce" />
            </div>
          </div>

          {/* Stage 3: Event Schedules Scoped by Season */}
          <section className="space-y-4">
            {renderSchedulesSection()}
          </section>
        </div>
      )}

      {/* FOCUSED TAB VIEWS */}
      {activeTab === 'seasons' && renderSeasonsSection()}
      {activeTab === 'venues' && renderVenuesSection()}
      {activeTab === 'schedules' && renderSchedulesSection()}
      {activeTab === 'users' && renderUsersSection()}
      {activeTab === 'rbac' && renderRBACSection()}

      {/* ======================================================== */}
      {/* MODALS                                                   */}
      {/* ======================================================== */}

      {/* Event Schedule Modal with preselected season support */}
      <EventScheduleModal
        isOpen={isScheduleModalOpen}
        onClose={() => {
          setIsScheduleModalOpen(false);
          setGameToEdit(null);
        }}
        gameToEdit={gameToEdit}
        venues={venues}
        seasons={seasons}
        defaultSeasonId={selectedScheduleSeason !== 'all' ? selectedScheduleSeason : activeSeason?.$id}
        onGameSaved={(savedGame) => {
          if (gameToEdit) {
            onGamesChange(games.map((g) => (g.$id === savedGame.$id ? savedGame : g)));
            setSuccessMsg(`Updated event schedule for "${savedGame.title}".`);
          } else {
            onGamesChange([savedGame, ...games]);
            setSuccessMsg(`Scheduled new tournament event "${savedGame.title}".`);
          }
          setTimeout(() => setSuccessMsg(''), 4000);
        }}
        onGameDeleted={(deletedId) => {
          onGamesChange(games.filter((g) => g.$id !== deletedId));
          setSuccessMsg('Event canceled and deleted.');
          setTimeout(() => setSuccessMsg(''), 4000);
        }}
      />

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

export default AdminView;
