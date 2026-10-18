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

export type AdminTab = 'schedules' | 'venues' | 'seasons' | 'users' | 'rbac';

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
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('schedules');

  // Modals state
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [gameToEdit, setGameToEdit] = useState<Game | null>(null);
  const [isVenueModalOpen, setIsVenueModalOpen] = useState(false);
  const [isSeasonModalOpen, setIsSeasonModalOpen] = useState(false);
  const [isInviteUserOpen, setIsInviteUserOpen] = useState(false);

  // Feedback notifications
  const [successMsg, setSuccessMsg] = useState('');

  // Schedules filter state
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

  const filteredGames = games.filter((g) => {
    if (selectedScheduleVenue === 'all') return true;
    return g.venueId === selectedScheduleVenue;
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

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6 pb-24 md:pb-12 animate-fadeIn">
      
      {/* Back Button Header */}
      {onBack && (
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-amber-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
      )}

      {/* 1. Executive Admin Header with KPI Metric Badges */}
      <div className="glass-panel rounded-2xl p-6 border border-amber-500/30 space-y-5">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-black uppercase tracking-wider">
                  MANAGEMENT PORTAL
                </span>
                <span className="text-xs text-slate-400">Executive League Console</span>
              </div>
              <h1 className="text-2xl font-black text-white mt-0.5">League Operations &amp; Administration</h1>
            </div>
          </div>

          {/* Contextual Action Button based on Active Tab */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            {activeTab === 'schedules' && (
              <button
                onClick={() => {
                  setGameToEdit(null);
                  setIsScheduleModalOpen(true);
                }}
                className="w-full md:w-auto px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-lg"
              >
                <Plus className="w-4 h-4" /> Schedule New Event
              </button>
            )}

            {activeTab === 'venues' && (
              <button
                onClick={() => setIsVenueModalOpen(true)}
                className="w-full md:w-auto px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-lg"
              >
                <Plus className="w-4 h-4" /> Add Host Venue
              </button>
            )}

            {activeTab === 'seasons' && (
              <button
                onClick={() => setIsSeasonModalOpen(true)}
                className="w-full md:w-auto px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-lg"
              >
                <Plus className="w-4 h-4" /> Create Season
              </button>
            )}

            {activeTab === 'users' && (
              <button
                onClick={() => setIsInviteUserOpen(true)}
                className="w-full md:w-auto px-4 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-lg"
              >
                <UserPlus className="w-4 h-4" /> Add Member / Staff
              </button>
            )}
          </div>
        </div>

        {/* Executive KPI Stats Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-800/80">
          <div 
            onClick={() => setActiveTab('schedules')}
            className={`p-3 rounded-xl border cursor-pointer transition-all ${
              activeTab === 'schedules' ? 'bg-amber-500/10 border-amber-500/50' : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="text-[10px] text-slate-400 uppercase font-semibold flex items-center gap-1">
              <Calendar className="w-3 h-3 text-amber-400" /> Scheduled Events
            </div>
            <div className="text-lg font-black text-white mt-0.5">{games.length} Events</div>
          </div>

          <div 
            onClick={() => setActiveTab('venues')}
            className={`p-3 rounded-xl border cursor-pointer transition-all ${
              activeTab === 'venues' ? 'bg-amber-500/10 border-amber-500/50' : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="text-[10px] text-slate-400 uppercase font-semibold flex items-center gap-1">
              <Building2 className="w-3 h-3 text-emerald-400" /> Host Venues
            </div>
            <div className="text-lg font-black text-white mt-0.5">{venues.length} Locations</div>
          </div>

          <div 
            onClick={() => setActiveTab('seasons')}
            className={`p-3 rounded-xl border cursor-pointer transition-all ${
              activeTab === 'seasons' ? 'bg-amber-500/10 border-amber-500/50' : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="text-[10px] text-slate-400 uppercase font-semibold flex items-center gap-1">
              <Trophy className="w-3 h-3 text-amber-400" /> Active Season
            </div>
            <div className="text-lg font-black text-amber-300 mt-0.5 truncate">{activeSeason?.name || '2026 Crawl 3'}</div>
          </div>

          <div 
            onClick={() => setActiveTab('users')}
            className={`p-3 rounded-xl border cursor-pointer transition-all ${
              activeTab === 'users' ? 'bg-amber-500/10 border-amber-500/50' : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="text-[10px] text-slate-400 uppercase font-semibold flex items-center gap-1">
              <Users className="w-3 h-3 text-indigo-400" /> Users &amp; Staff
            </div>
            <div className="text-lg font-black text-white mt-0.5">{users.length} Registered</div>
          </div>
        </div>
      </div>

      {/* Success Notification Alert */}
      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* 2. Sleek Segmented Admin Tab Navigation Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-slate-800">
        <button
          onClick={() => setActiveTab('schedules')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            activeTab === 'schedules'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'glass-card text-slate-300 hover:bg-slate-800'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Event Schedules</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
            activeTab === 'schedules' ? 'bg-slate-950 text-amber-400' : 'bg-slate-800 text-slate-400'
          }`}>
            {games.length}
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
          <span>Host Venues</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
            activeTab === 'venues' ? 'bg-slate-950 text-amber-400' : 'bg-slate-800 text-slate-400'
          }`}>
            {venues.length}
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
          <span>Championship Seasons</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
            activeTab === 'seasons' ? 'bg-slate-950 text-amber-400' : 'bg-slate-800 text-slate-400'
          }`}>
            {seasons.length}
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
          <span>Staff &amp; Users</span>
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
          <span>Role Permissions (RBAC)</span>
        </button>
      </div>

      {/* 3. TAB CONTENT VIEWS */}

      {/* TAB 1: EVENT SCHEDULES */}
      {activeTab === 'schedules' && (
        <div className="space-y-4">
          <div className="glass-card rounded-2xl p-5 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-amber-400" /> Tournament Event Schedules ({filteredGames.length})
              </h2>
              <p className="text-xs text-slate-400">
                Plan, modify, and schedule poker events across host venues and championship seasons
              </p>
            </div>

            <div className="flex items-center gap-3">
              <select
                value={selectedScheduleVenue}
                onChange={(e) => setSelectedScheduleVenue(e.target.value)}
                className="bg-slate-900 text-white text-xs font-semibold px-3 py-2 rounded-xl border border-slate-800 focus:outline-none focus:border-amber-500"
              >
                <option value="all">All Host Venues</option>
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
                <Plus className="w-4 h-4" /> Schedule Event
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredGames.map((game) => {
              const venue = venues.find((v) => v.$id === game.venueId);
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
                        {game.dealerName && (
                          <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-indigo-300 font-medium border border-slate-700">
                            Dealer: {game.dealerName}
                          </span>
                        )}
                      </div>

                      <span className="text-xs text-amber-400 font-bold flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" /> {game.scheduledAt}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-lg font-bold text-white leading-snug">{game.venueName}</h3>
                      <p className="text-sm text-slate-300 font-medium">{game.title}</p>
                      {venue && (
                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-amber-400" /> {venue.address}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Metrics Strip */}
                  <div className="grid grid-cols-4 gap-2 py-2 border-y border-slate-800/80 text-center text-xs">
                    <div className="bg-slate-900/60 p-2 rounded-xl border border-slate-800/60">
                      <span className="text-[10px] text-slate-400 block uppercase">Buy-in</span>
                      <strong className="text-emerald-400">${game.buyinAmount}</strong>
                    </div>
                    <div className="bg-slate-900/60 p-2 rounded-xl border border-slate-800/60">
                      <span className="text-[10px] text-slate-400 block uppercase">Stack</span>
                      <strong className="text-indigo-300">{(game.startingChips / 1000).toFixed(0)}k</strong>
                    </div>
                    <div className="bg-slate-900/60 p-2 rounded-xl border border-slate-800/60">
                      <span className="text-[10px] text-slate-400 block uppercase">Rebuys</span>
                      <strong className="text-amber-400">${game.rebuyAmount}</strong>
                    </div>
                    <div className="bg-slate-900/60 p-2 rounded-xl border border-slate-800/60">
                      <span className="text-[10px] text-slate-400 block uppercase">Players</span>
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
        </div>
      )}

      {/* TAB 2: HOST VENUES */}
      {activeTab === 'venues' && (
        <div className="space-y-4">
          <div className="glass-card rounded-2xl p-5 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-amber-400" /> Host Venues Directory ({venues.length})
              </h2>
              <p className="text-xs text-slate-400">
                Configure partner venues, bar addresses, phone numbers, websites, and photo assets
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

                  <div className="space-y-1 min-w-0">
                    <h3 className="font-bold text-white text-base leading-tight truncate">{venue.name}</h3>
                    <p className="text-xs text-slate-400 flex items-start gap-1">
                      <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                      <span className="line-clamp-2">{venue.address}</span>
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
                    <Edit3 className="w-3 h-3 text-amber-400" /> Edit Venue
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: CHAMPIONSHIP SEASONS */}
      {activeTab === 'seasons' && (
        <div className="space-y-4">
          <div className="glass-card rounded-2xl p-5 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-400" /> Championship Seasons ({seasons.length})
              </h2>
              <p className="text-xs text-slate-400">
                Configure tournament crawls, active calendar dates, and historical standings
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
      )}

      {/* TAB 4: USERS & STAFF ROLES */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="glass-card rounded-2xl p-5 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
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
      )}

      {/* TAB 5: RBAC PERMISSIONS MATRIX */}
      {activeTab === 'rbac' && (
        <div className="space-y-4">
          <div className="glass-card rounded-2xl p-5 border border-slate-800">
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-indigo-400" /> Role-Based Access Control (RBAC) Governance
            </h2>
            <p className="text-xs text-slate-400">
              Permissions architecture across manager, dealer, scribe, and player tiers
            </p>
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
                <li>Championship Seasons (CRUD)</li>
                <li>User &amp; Staff Roles (CRUD)</li>
                <li>Full Director Desk Access</li>
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
                <li>No Admin/Config Access</li>
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
              <h4 className="font-bold text-white text-sm">Seating &amp; Bust-outs</h4>
              <ul className="text-xs text-slate-400 space-y-1 list-disc list-inside">
                <li>Register Walk-in Seating</li>
                <li>Record Bust-outs &amp; KOs</li>
                <li>Read-only Blind Clock</li>
                <li>Assist League Director</li>
                <li>No Config/Venue Access</li>
              </ul>
              <button
                onClick={() => handleQuickRoleSwitch('scribe')}
                className="w-full mt-2 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-bold transition-all"
              >
                Test as Scribe
              </button>
            </div>

            {/* Player */}
            <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-700/80 space-y-2">
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
      )}

      {/* MODALS */}

      {/* Event Schedule Modal */}
      <EventScheduleModal
        isOpen={isScheduleModalOpen}
        onClose={() => {
          setIsScheduleModalOpen(false);
          setGameToEdit(null);
        }}
        gameToEdit={gameToEdit}
        venues={venues}
        seasons={seasons}
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
