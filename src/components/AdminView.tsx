import React, { useState, useEffect } from 'react';
import type { Announcement, Game, Venue, Player, UserProfile, UserRole, Season, TournamentEvent, League } from '@/types/holdem';
import { AppwriteService } from '@/services/appwriteService';
import { AuthService } from '@/services/authService';
import { EventScheduleModal } from './EventScheduleModal';
import { VenueManagerModal } from './VenueManagerModal';
import { SeasonManagerModal } from './SeasonManagerModal';
import { UserInviteModal } from './UserInviteModal';
import { LeagueManagerModal } from './LeagueManagerModal';
import {
  AdminDashboardOverview,
  type DashboardSectionKey,
} from './admin/AdminDashboardOverview';
import { AdminLeaguesSection } from './admin/AdminLeaguesSection';
import { AdminSeasonsSection } from './admin/AdminSeasonsSection';
import { AdminVenuesSection } from './admin/AdminVenuesSection';
import { AdminSchedulesSection } from './admin/AdminSchedulesSection';
import { AdminUsersSection } from './admin/AdminUsersSection';
import { AdminRBACSection } from './admin/AdminRBACSection';
import {
  Building2,
  ShieldCheck,
  Plus,
  Crown,
  CheckCircle2,
  Users,
  ArrowLeft,
  Calendar,
  Trophy,
  LayoutGrid,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export type AdminTab = DashboardSectionKey;

interface AdminViewProps {
  games: Game[];
  venues: Venue[];
  seasons: Season[];
  players?: Player[];
  events?: TournamentEvent[];
  leagues?: League[];
  announcements?: Announcement[];
  currentUser: UserProfile | null;
  onGamesChange: (games: Game[]) => void;
  onVenuesChange: (venues: Venue[]) => void;
  onSeasonsChange: (seasons: Season[]) => void;
  onPlayersChange?: (players: Player[]) => void;
  onEventsChange?: (events: TournamentEvent[]) => void;
  onLeaguesChange?: (leagues: League[]) => void;
  onEditAnnouncement?: (announcement: Announcement) => void;
  onCreateAnnouncement?: () => void;
  onRoleChange: (role: UserRole) => void;
  onSelectGame?: (game: Game) => void;
  onBack?: () => void;
  backLabel?: string;
}

export const AdminView: React.FC<AdminViewProps> = ({
  games,
  venues,
  seasons,
  players = [],
  events = [],
  leagues: initialLeagues = [],
  announcements = [],
  currentUser,
  onGamesChange,
  onVenuesChange,
  onSeasonsChange,
  onPlayersChange,
  onLeaguesChange,
  onEditAnnouncement,
  onCreateAnnouncement,
  onRoleChange,
  onSelectGame,
  onBack,
  backLabel = 'Back to Games',
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');

  // Modals state
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [gameToEdit, setGameToEdit] = useState<Game | null>(null);
  const [isVenueModalOpen, setIsVenueModalOpen] = useState(false);
  const [venueToEdit, setVenueToEdit] = useState<Venue | null>(null);
  const [isSeasonModalOpen, setIsSeasonModalOpen] = useState(false);
  const [isInviteUserOpen, setIsInviteUserOpen] = useState(false);
  const [isLeagueModalOpen, setIsLeagueModalOpen] = useState(false);
  const [leagueToEdit, setLeagueToEdit] = useState<League | null>(null);

  // Leagues & Users state
  const [leagues, setLeagues] = useState<League[]>(initialLeagues);
  const [users, setUsers] = useState<UserProfile[]>(players);
  const [successMsg, setSuccessMsg] = useState('');

  // Filters
  const [selectedScheduleSeason, setSelectedScheduleSeason] = useState<string>('all');
  const [selectedScheduleVenue, setSelectedScheduleVenue] = useState<string>('all');
  const [selectedRecurrenceFilter, setSelectedRecurrenceFilter] = useState<'all' | 'recurring' | 'single'>('all');
  const [searchUserQuery, setSearchUserQuery] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<'all' | UserRole>('all');

  const activeSeason = seasons.find((s) => s.isActive) || seasons[0];
  const actorRole = currentUser?.role;
  const canAccessAdmin = AuthService.canAccessAdmin(actorRole);
  const canManageLeagues = AuthService.canManageLeagues(actorRole);
  const canAssignAdmin = AuthService.canAccessPlatformAdmin(actorRole);

  useEffect(() => {
    if (!initialLeagues || initialLeagues.length === 0) {
      AppwriteService.getLeagues().then(setLeagues);
    }
  }, [initialLeagues]);

  useEffect(() => {
    let active = true;
    AuthService.getAllUsers().then((loaded) => {
      if (active) setUsers(loaded);
    });
    return () => {
      active = false;
    };
  }, []);

  if (!canAccessAdmin) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
          <ShieldCheck className="w-7 h-7" />
        </div>
        <h1 className="text-2xl font-black text-white">Admin Access Required</h1>
        <p className="text-sm text-slate-400">
          This console is restricted to Platform Admins and League Managers.
        </p>
        {onBack && (
          <Button variant="default" onClick={onBack}>
            <ArrowLeft className="w-4 h-4" /> {backLabel}
          </Button>
        )}
      </div>
    );
  }

  const showToast = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleQuickRoleSwitch = async (role: UserRole) => {
    onRoleChange(role);
    showToast(`Switched demo session role to: ${role.toUpperCase()}`);
  };

  const handleQuickSetActiveSeason = async (seasonId: string) => {
    const updated = await AppwriteService.setActiveSeason(seasonId, seasons);
    onSeasonsChange(updated);
    showToast('Active season updated.');
  };

  const handleQuickAssignManager = async (
    leagueId: string,
    manager: { id: string; name: string; email: string }
  ) => {
    if (!canManageLeagues) {
      alert('Only Platform Admins can assign League Managers.');
      return;
    }
    await AppwriteService.assignLeagueManager(leagueId, manager);
    const updated = leagues.map((l) =>
      l.$id === leagueId
        ? { ...l, managerId: manager.id, managerName: manager.name, managerEmail: manager.email }
        : l
    );
    setLeagues(updated);
    if (onLeaguesChange) onLeaguesChange(updated);

    const targetUser = users.find((u) => u.$id === manager.id);
    if (targetUser && targetUser.role !== 'manager' && targetUser.role !== 'admin') {
      const updatedUsers = await AuthService.updateUserRole(manager.id, 'manager', currentUser);
      setUsers(updatedUsers);
      if (onPlayersChange) onPlayersChange(updatedUsers);
    }
    showToast(`Designated ${manager.name} as League Manager.`);
  };

  const handleLeagueSaved = (savedLeague: League) => {
    const exists = leagues.some((l) => l.$id === savedLeague.$id);
    const updated = exists
      ? leagues.map((l) => (l.$id === savedLeague.$id ? savedLeague : l))
      : [savedLeague, ...leagues];
    setLeagues(updated);
    if (onLeaguesChange) onLeaguesChange(updated);
    showToast(`Saved league "${savedLeague.name}".`);
  };

  const handleChangeUserRole = async (userId: string, newRole: UserRole) => {
    const targetUser = users.find((u) => u.$id === userId);
    if (!targetUser) return;

    if (!AuthService.canAssignRole(actorRole, newRole)) {
      alert('Only Platform Admins can assign the Admin role.');
      return;
    }
    if (!AuthService.canModifyUser(actorRole, targetUser.role)) {
      alert('Only Platform Admins can modify an Admin account.');
      return;
    }

    if (targetUser.role === 'admin' && newRole !== 'admin') {
      const adminCount = users.filter((u) => u.role === 'admin').length;
      if (adminCount <= 1) {
        alert('Cannot demote the only Platform Admin.');
        return;
      }
    }

    if (targetUser.role === 'manager' && newRole !== 'manager') {
      const managerCount = users.filter((u) => u.role === 'manager').length;
      if (managerCount <= 1) {
        alert('Cannot demote the only manager. Please promote another user to manager first.');
        return;
      }
    }

    try {
      const updated = await AuthService.updateUserRole(userId, newRole, currentUser);
      setUsers(updated);
      if (onPlayersChange) onPlayersChange(updated);
      if (currentUser && currentUser.$id === userId) {
        onRoleChange(newRole);
      }
      showToast(`Updated ${targetUser.name}'s role to ${newRole.toUpperCase()}`);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to update user role. Please try again.';
      alert(message);
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (currentUser && currentUser.$id === userId) {
      alert('You cannot delete your own active user account.');
      return;
    }
    const targetUser = users.find((u) => u.$id === userId);
    if (targetUser && !AuthService.canModifyUser(actorRole, targetUser.role)) {
      alert('Only Platform Admins can remove an Admin account.');
      return;
    }
    if (targetUser?.role === 'manager') {
      const managerCount = users.filter((u) => u.role === 'manager').length;
      if (managerCount <= 1) {
        alert('Cannot delete the only manager in the league.');
        return;
      }
    }
    if (!window.confirm(`Are you sure you want to remove user "${userName}"?`)) return;

    const updated = await AuthService.deleteUser(userId, actorRole);
    setUsers(updated);
    if (onPlayersChange) onPlayersChange(updated);
    showToast(`User "${userName}" has been removed.`);
  };

  const handleUserCreated = (newUser: UserProfile) => {
    const nextUsers = [newUser, ...users];
    setUsers(nextUsers);
    if (onPlayersChange) onPlayersChange(nextUsers);
    showToast(`Added user "${newUser.name}" as ${newUser.role.toUpperCase()}`);
  };

  const handleDeleteGame = async (gameId: string, gameTitle: string) => {
    if (!window.confirm(`Are you sure you want to cancel and delete "${gameTitle}"?`)) return;
    try {
      await AppwriteService.deleteGame(gameId);
      onGamesChange(games.filter((g) => g.$id !== gameId));
      showToast(`Deleted event "${gameTitle}".`);
    } catch {
      alert('Failed to delete event');
    }
  };

  const filteredGames = games.filter((g) => {
    const matchesSeason = selectedScheduleSeason === 'all' || g.seasonId === selectedScheduleSeason;
    const matchesVenue = selectedScheduleVenue === 'all' || g.venueId === selectedScheduleVenue;
    const matchesRecurrence =
      selectedRecurrenceFilter === 'all' ||
      (selectedRecurrenceFilter === 'recurring' && g.isRecurring) ||
      (selectedRecurrenceFilter === 'single' && !g.isRecurring);
    return matchesSeason && matchesVenue && matchesRecurrence;
  });

  const filteredUsers = users.filter((u) => {
    const query = searchUserQuery.toLowerCase();
    const matchesSearch =
      (u.name || '').toLowerCase().includes(query) ||
      (u.email || '').toLowerCase().includes(query);
    const matchesRole = selectedRoleFilter === 'all' || (u.role || 'player') === selectedRoleFilter;
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

  const navTabs: { id: AdminTab; label: string; count?: number; icon: React.ReactNode; visible: boolean }[] = [
    { id: 'overview', label: 'Dashboard', icon: <LayoutGrid className="w-4 h-4" />, visible: true },
    { id: 'leagues', label: 'Leagues', count: leagues.length, icon: <Crown className="w-4 h-4" />, visible: true },
    { id: 'seasons', label: 'Seasons', count: seasons.length, icon: <Trophy className="w-4 h-4" />, visible: true },
    { id: 'venues', label: 'Venues', count: venues.length, icon: <Building2 className="w-4 h-4" />, visible: true },
    { id: 'schedules', label: 'Games', count: games.length, icon: <Calendar className="w-4 h-4" />, visible: true },
    { id: 'users', label: 'Players', count: users.length, icon: <Users className="w-4 h-4" />, visible: true },
    { id: 'rbac', label: 'Permissions', icon: <ShieldCheck className="w-4 h-4" />, visible: true },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-5 pb-24 md:pb-12 animate-fadeIn">
      {onBack && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="text-xs text-slate-400 hover:text-amber-400 p-0 h-auto"
        >
          <ArrowLeft className="w-4 h-4 mr-1" /> {backLabel}
        </Button>
      )}

      {/* Compact Dashboard Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-white">Admin Dashboard</h1>
              {activeSeason && <Badge variant="secondary">{activeSeason.name}</Badge>}
            </div>
            <p className="text-xs text-slate-400">
              Manage leagues, seasons, venues, games, players, and permissions
            </p>
          </div>
        </div>

        <Button
          variant="default"
          onClick={() => {
            setGameToEdit(null);
            setIsScheduleModalOpen(true);
          }}
          className="h-10 w-full sm:w-auto"
        >
          <Plus className="w-4 h-4" /> Schedule Game
        </Button>
      </div>

      {/* Data Type Switcher Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-slate-800">
        {navTabs
          .filter((t) => t.visible)
          .map((tab) => {
            const isSelected = activeTab === tab.id;
            return (
              <Button
                key={tab.id}
                type="button"
                variant={isSelected ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveTab(tab.id)}
                className="h-10 px-3.5 text-xs whitespace-nowrap shrink-0"
              >
                {tab.icon}
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span
                    className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold leading-none ${
                      isSelected ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </Button>
            );
          })}
      </div>

      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Active Data Type View */}
      {activeTab === 'overview' && (
        <AdminDashboardOverview
          leagues={leagues}
          seasons={seasons}
          venues={venues}
          games={games}
          users={users}
          announcements={announcements}
          canManageLeagues={canManageLeagues}
          onOpenSection={setActiveTab}
          onCreateGame={() => {
            setGameToEdit(null);
            setIsScheduleModalOpen(true);
          }}
          onCreateSeason={() => setIsSeasonModalOpen(true)}
          onCreateVenue={() => setIsVenueModalOpen(true)}
          onInviteUser={() => setIsInviteUserOpen(true)}
          onCreateLeague={
            canManageLeagues
              ? () => {
                  setLeagueToEdit(null);
                  setIsLeagueModalOpen(true);
                }
              : undefined
          }
          onEditGame={(game) => {
            setGameToEdit(game);
            setIsScheduleModalOpen(true);
          }}
          onSelectGame={onSelectGame}
          onEditAnnouncement={onEditAnnouncement}
          onCreateAnnouncement={onCreateAnnouncement}
        />
      )}

      {activeTab === 'leagues' && (
        <AdminLeaguesSection
          leagues={leagues}
          users={users}
          canManageLeagues={canManageLeagues}
          onOpenCreateLeague={() => {
            if (!canManageLeagues) return;
            setLeagueToEdit(null);
            setIsLeagueModalOpen(true);
          }}
          onEditLeague={(league) => {
            if (!canManageLeagues) return;
            setLeagueToEdit(league);
            setIsLeagueModalOpen(true);
          }}
          onQuickAssignManager={handleQuickAssignManager}
        />
      )}

      {activeTab === 'seasons' && (
        <AdminSeasonsSection
          seasons={seasons}
          games={games}
          onOpenSeasonModal={() => setIsSeasonModalOpen(true)}
          onQuickSetActiveSeason={handleQuickSetActiveSeason}
          formatDate={formatDate}
        />
      )}

      {activeTab === 'venues' && (
        <AdminVenuesSection
          venues={venues}
          games={games}
          onOpenVenueModal={(venue) => {
            setVenueToEdit(venue || null);
            setIsVenueModalOpen(true);
          }}
        />
      )}

      {activeTab === 'schedules' && (
        <AdminSchedulesSection
          games={games}
          filteredGames={filteredGames}
          events={events}
          venues={venues}
          seasons={seasons}
          selectedScheduleSeason={selectedScheduleSeason}
          setSelectedScheduleSeason={setSelectedScheduleSeason}
          selectedScheduleVenue={selectedScheduleVenue}
          setSelectedScheduleVenue={setSelectedScheduleVenue}
          selectedRecurrenceFilter={selectedRecurrenceFilter}
          setSelectedRecurrenceFilter={setSelectedRecurrenceFilter}
          onOpenScheduleModal={(game) => {
            setGameToEdit(game || null);
            setIsScheduleModalOpen(true);
          }}
          onDeleteGame={handleDeleteGame}
          onSelectGame={onSelectGame}
        />
      )}

      {activeTab === 'users' && (
        <AdminUsersSection
          users={users}
          filteredUsers={filteredUsers}
          currentUser={currentUser}
          canAssignAdmin={canAssignAdmin}
          searchUserQuery={searchUserQuery}
          setSearchUserQuery={setSearchUserQuery}
          selectedRoleFilter={selectedRoleFilter}
          setSelectedRoleFilter={setSelectedRoleFilter}
          onOpenInviteModal={() => setIsInviteUserOpen(true)}
          onChangeUserRole={handleChangeUserRole}
          onDeleteUser={handleDeleteUser}
        />
      )}

      {activeTab === 'rbac' && (
        <AdminRBACSection
          currentUser={currentUser}
          onQuickRoleSwitch={handleQuickRoleSwitch}
        />
      )}

      {/* Modals */}
      <EventScheduleModal
        isOpen={isScheduleModalOpen}
        onClose={() => {
          setIsScheduleModalOpen(false);
          setGameToEdit(null);
        }}
        gameToEdit={gameToEdit}
        venues={venues}
        seasons={seasons}
        players={users.length > 0 ? users : players}
        defaultSeasonId={selectedScheduleSeason !== 'all' ? selectedScheduleSeason : activeSeason?.$id}
        onGameSaved={(savedGame) => {
          if (gameToEdit) {
            onGamesChange(games.map((g) => (g.$id === savedGame.$id ? savedGame : g)));
            showToast(`Updated "${savedGame.title}".`);
          } else {
            onGamesChange([savedGame, ...games]);
            showToast(`Scheduled "${savedGame.title}".`);
          }
        }}
        onGamesSaved={(newGames) => {
          onGamesChange([...newGames, ...games]);
          showToast(`Scheduled recurring series (${newGames.length} games).`);
        }}
        onGameDeleted={(deletedId) => {
          onGamesChange(games.filter((g) => g.$id !== deletedId));
          showToast('Event canceled and deleted.');
        }}
      />

      {isVenueModalOpen && (
        <VenueManagerModal
          key={venueToEdit?.$id ?? 'venues-hub'}
          isOpen={isVenueModalOpen}
          onClose={() => {
            setIsVenueModalOpen(false);
            setVenueToEdit(null);
          }}
          venues={venues}
          onVenuesChange={onVenuesChange}
          initialVenueToEdit={venueToEdit}
        />
      )}

      <SeasonManagerModal
        isOpen={isSeasonModalOpen}
        onClose={() => setIsSeasonModalOpen(false)}
        seasons={seasons}
        onSeasonsChange={onSeasonsChange}
      />

      <UserInviteModal
        isOpen={isInviteUserOpen}
        onClose={() => setIsInviteUserOpen(false)}
        canAssignAdmin={canAssignAdmin}
        actorRole={actorRole}
        onUserCreated={handleUserCreated}
      />

      {canManageLeagues && (
        <LeagueManagerModal
          isOpen={isLeagueModalOpen}
          onClose={() => {
            setIsLeagueModalOpen(false);
            setLeagueToEdit(null);
          }}
          leagueToEdit={leagueToEdit}
          users={users}
          onLeagueSaved={handleLeagueSaved}
        />
      )}
    </div>
  );
};

export default AdminView;
