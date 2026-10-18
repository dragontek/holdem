import React from 'react';
import type { UserProfile, UserRole } from '@/types/holdem';
import { Users, UserPlus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

export interface AdminUsersSectionProps {
  users: UserProfile[];
  filteredUsers: UserProfile[];
  currentUser?: UserProfile | null;
  searchUserQuery: string;
  setSearchUserQuery: (val: string) => void;
  selectedRoleFilter: 'all' | UserRole;
  setSelectedRoleFilter: (val: 'all' | UserRole) => void;
  onOpenInviteModal: () => void;
  onChangeUserRole: (userId: string, newRole: UserRole) => void;
  onDeleteUser: (userId: string, userName: string) => void;
}

export const AdminUsersSection: React.FC<AdminUsersSectionProps> = ({
  users,
  filteredUsers,
  currentUser,
  searchUserQuery,
  setSearchUserQuery,
  selectedRoleFilter,
  setSelectedRoleFilter,
  onOpenInviteModal,
  onChangeUserRole,
  onDeleteUser,
}) => {
  return (
    <div className="space-y-4">
      <Card className="p-5 border-slate-800 bg-slate-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="indigo" className="text-[10px]">
              STEP 4: PERSONNEL
            </Badge>
            <span className="text-xs text-slate-400">Roles &amp; Access</span>
          </div>
          <h2 className="text-lg font-black text-white flex items-center gap-2 mt-1">
            <Users className="w-5 h-5 text-indigo-400" /> Users &amp; Staff Role Management ({users.length})
          </h2>
          <p className="text-xs text-slate-400">
            Assign and modify roles (Manager, Dealer, Scribe, Player) for league personnel.
          </p>
        </div>

        <Button
          variant="default"
          size="sm"
          onClick={onOpenInviteModal}
          className="self-start sm:self-auto bg-indigo-500 hover:bg-indigo-400 text-white"
        >
          <UserPlus className="w-4 h-4" /> Add Member / Staff
        </Button>
      </Card>

      {/* Search & Role Filter Tabs */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <Input
            type="text"
            placeholder="Search user by name or email..."
            value={searchUserQuery}
            onChange={(e) => setSearchUserQuery(e.target.value)}
            className="pl-10 text-xs"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {(['all', 'manager', 'dealer', 'scribe', 'player'] as const).map((r) => {
            const count = r === 'all' ? users.length : users.filter((u) => u.role === r).length;
            const isSelected = selectedRoleFilter === r;
            return (
              <Button
                key={r}
                variant={isSelected ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedRoleFilter(r)}
                className={`text-xs whitespace-nowrap h-8 ${
                  isSelected ? 'bg-indigo-500 text-white hover:bg-indigo-400' : 'text-slate-400'
                }`}
              >
                {r === 'all' ? 'All' : r.charAt(0).toUpperCase() + r.slice(1) + 's'} ({count})
              </Button>
            );
          })}
        </div>
      </div>

      {/* Users List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredUsers.map((user) => {
          const isCurrentUser = currentUser?.$id === user.$id;
          return (
            <Card
              key={user.$id}
              className={`p-4 flex flex-col justify-between space-y-3 transition-all ${
                isCurrentUser
                  ? 'border-indigo-500/40 bg-indigo-500/5'
                  : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <h4 className="text-sm font-bold text-white">{user.name}</h4>
                    {isCurrentUser && (
                      <Badge variant="indigo" className="text-[9px] px-1.5 py-0">
                        You
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-slate-400">{user.email}</p>
                </div>

                <div className="shrink-0">
                  <select
                    value={user.role}
                    onChange={(e) => onChangeUserRole(user.$id, e.target.value as UserRole)}
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

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDeleteUser(user.$id, user.name)}
                  disabled={isCurrentUser}
                  className="h-6 text-xs text-slate-500 hover:text-rose-400 p-0"
                >
                  Remove User
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
