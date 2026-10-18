import React, { useState, useEffect } from 'react';
import type { Game, Venue, UserProfile, UserRole, Season } from '@/types/holdem';
import { AppwriteService } from '@/services/appwriteService';
import { AuthService } from '@/services/authService';
import { EventScheduleModal } from './EventScheduleModal';
import { VenueManagerModal } from './VenueManagerModal';
import { SeasonManagerModal } from './SeasonManagerModal';
import { UserInviteModal } from './UserInviteModal';
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
  Sparkles,
  ArrowLeft,
  ArrowDown,
  Calendar,
  Trophy,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

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

  // Schedules filter state (filtered by season, venue, and recurrence)
  const [selectedScheduleSeason, setSelectedScheduleSeason] = useState<string>('all');
  const [selectedScheduleVenue, setSelectedScheduleVenue] = useState<string>('all');
  const [selectedRecurrenceFilter, setSelectedRecurrenceFilter] = useState<'all' | 'recurring' | 'single'>('all');

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

  // Filter games based on selected season, venue, and recurrence
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
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="text-xs text-slate-400 hover:text-amber-400 p-0 h-auto"
        >
          <ArrowLeft className="w-4 h-4 mr-1" /> {backLabel}
        </Button>
      )}

      {/* 1. Executive Admin Header with KPI Metric Badges */}
      <Card className="p-6 border-slate-800 bg-slate-900/60 space-y-5">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 shadow-lg">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="default" className="text-[10px]">
                  MANAGEMENT PORTAL
                </Badge>
                <span className="text-xs text-slate-400 font-medium">Executive League Console</span>
              </div>
              <h1 className="text-2xl font-black text-white mt-0.5">League Operations &amp; Administration</h1>
            </div>
          </div>

          {/* Quick Contextual Create Action */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <Button
              variant="default"
              size="default"
              onClick={() => {
                setGameToEdit(null);
                setIsScheduleModalOpen(true);
              }}
              className="w-full md:w-auto"
            >
              <Plus className="w-4 h-4" /> Schedule Tournament
            </Button>
          </div>
        </div>

        {/* Executive KPI Stats Bar */}
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
      </Card>

      {/* Success Notification Alert */}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* 2. Sleek Segmented Admin Tab Navigation Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-slate-800">
        <Button
          variant={activeTab === 'flow' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveTab('flow')}
          className="text-xs whitespace-nowrap h-9"
        >
          <Sparkles className="w-4 h-4" />
          <span>Full Setup Flow</span>
          <Badge variant="secondary" className="text-[9px] px-1.5 py-0 ml-1">
            Top-to-Bottom
          </Badge>
        </Button>

        <Button
          variant={activeTab === 'seasons' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveTab('seasons')}
          className="text-xs whitespace-nowrap h-9"
        >
          <Trophy className="w-4 h-4" />
          <span>1. Championship Seasons</span>
          <Badge variant="secondary" className="text-[9px] px-1.5 py-0 ml-1">
            {seasons.length}
          </Badge>
        </Button>

        <Button
          variant={activeTab === 'venues' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveTab('venues')}
          className="text-xs whitespace-nowrap h-9"
        >
          <Building2 className="w-4 h-4" />
          <span>2. Host Venues</span>
          <Badge variant="secondary" className="text-[9px] px-1.5 py-0 ml-1">
            {venues.length}
          </Badge>
        </Button>

        <Button
          variant={activeTab === 'schedules' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveTab('schedules')}
          className="text-xs whitespace-nowrap h-9"
        >
          <Calendar className="w-4 h-4" />
          <span>3. Event Schedules (by Season)</span>
          <Badge variant="secondary" className="text-[9px] px-1.5 py-0 ml-1">
            {games.length}
          </Badge>
        </Button>

        <Button
          variant={activeTab === 'users' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveTab('users')}
          className={`text-xs whitespace-nowrap h-9 ${activeTab === 'users' ? 'bg-indigo-500 text-white hover:bg-indigo-400' : ''}`}
        >
          <Users className="w-4 h-4" />
          <span>4. Staff &amp; Users</span>
          <Badge variant="secondary" className="text-[9px] px-1.5 py-0 ml-1">
            {users.length}
          </Badge>
        </Button>

        <Button
          variant={activeTab === 'rbac' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveTab('rbac')}
          className="text-xs whitespace-nowrap h-9"
        >
          <Crown className="w-4 h-4" />
          <span>5. Role Permissions (RBAC)</span>
        </Button>
      </div>

      {/* 3. TAB / FLOW CONTENT VIEWS */}

      {/* FULL TOP-TO-BOTTOM SETUP FLOW */}
      {activeTab === 'flow' && (
        <div className="space-y-8 animate-fadeIn">
          {/* Stage 1: Championship Seasons */}
          <section className="space-y-4">
            <AdminSeasonsSection
              seasons={seasons}
              games={games}
              onOpenSeasonModal={() => setIsSeasonModalOpen(true)}
              onQuickSetActiveSeason={handleQuickSetActiveSeason}
              formatDate={formatDate}
            />
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
            <AdminVenuesSection
              venues={venues}
              games={games}
              onOpenVenueModal={() => setIsVenueModalOpen(true)}
            />
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
            <AdminSchedulesSection
              games={games}
              filteredGames={filteredGames}
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
          </section>
        </div>
      )}

      {/* FOCUSED TAB VIEWS */}
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
          onOpenVenueModal={() => setIsVenueModalOpen(true)}
        />
      )}
      {activeTab === 'schedules' && (
        <AdminSchedulesSection
          games={games}
          filteredGames={filteredGames}
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
        onGamesSaved={(newGames) => {
          onGamesChange([...newGames, ...games]);
          setSuccessMsg(`Scheduled recurring weekly series: ${newGames.length} tournaments created.`);
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
