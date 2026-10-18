import React, { useState, useEffect } from 'react';
import type { League, UserProfile } from '@/types/holdem';
import { AppwriteService } from '@/services/appwriteService';
import { AuthService } from '@/services/authService';
import { 
  Trophy, 
  Crown, 
  UserCheck, 
  PlusCircle, 
  Sparkles, 
  AlertCircle,
  Building2,
  Mail,
  User
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

export interface LeagueManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  leagueToEdit?: League | null;
  users: UserProfile[];
  onLeagueSaved: (league: League) => void;
}

export const LeagueManagerModal: React.FC<LeagueManagerModalProps> = ({
  isOpen,
  onClose,
  leagueToEdit,
  users,
  onLeagueSaved,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  
  // Manager assignment state
  const [managerMode, setManagerMode] = useState<'existing' | 'new'>('existing');
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [newManagerName, setNewManagerName] = useState('');
  const [newManagerEmail, setNewManagerEmail] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (leagueToEdit) {
      setName(leagueToEdit.name);
      setDescription(leagueToEdit.description);
      setLogoUrl(leagueToEdit.logoUrl || '');
      if (leagueToEdit.managerId) {
        setSelectedUserId(leagueToEdit.managerId);
        setManagerMode('existing');
      }
    } else {
      setName('');
      setDescription('');
      setLogoUrl('');
      // Default to first manager or first user
      const defaultMgr = users.find((u) => u.role === 'manager') || users[0];
      setSelectedUserId(defaultMgr ? defaultMgr.$id : '');
      setManagerMode('existing');
      setNewManagerName('');
      setNewManagerEmail('');
    }
    setErrorMsg('');
  }, [leagueToEdit, isOpen, users]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('League name is required');
      return;
    }
    if (!description.trim()) {
      setErrorMsg('League description is required');
      return;
    }

    let managerId: string | undefined;
    let managerName: string | undefined;
    let managerEmail: string | undefined;

    if (managerMode === 'existing') {
      const selectedUser = users.find((u) => u.$id === selectedUserId);
      if (!selectedUser) {
        setErrorMsg('Please select a League Manager');
        return;
      }
      managerId = selectedUser.$id;
      managerName = selectedUser.name;
      managerEmail = selectedUser.email;

      // Automatically promote to manager role if they are not already manager or admin
      if (selectedUser.role !== 'manager' && selectedUser.role !== 'admin') {
        try {
          await AuthService.updateUserRole(selectedUser.$id, 'manager');
        } catch (err) {
          console.warn('Failed to upgrade assigned user to manager role', err);
        }
      }
    } else {
      if (!newManagerName.trim()) {
        setErrorMsg('Manager name is required');
        return;
      }
      if (!newManagerEmail.trim() || !newManagerEmail.includes('@')) {
        setErrorMsg('Valid manager email is required');
        return;
      }

      try {
        const createdUser = await AuthService.createUser(
          newManagerName.trim(),
          newManagerEmail.trim(),
          'manager'
        );
        managerId = createdUser.$id;
        managerName = createdUser.name;
        managerEmail = createdUser.email;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to create manager user';
        setErrorMsg(msg);
        return;
      }
    }

    setIsLoading(true);
    setErrorMsg('');

    try {
      if (leagueToEdit) {
        const updates: Partial<League> = {
          name: name.trim(),
          description: description.trim(),
          logoUrl: logoUrl.trim() || undefined,
          managerId,
          managerName,
          managerEmail,
        };
        await AppwriteService.updateLeague(leagueToEdit.$id, updates);
        const updatedLeague: League = {
          ...leagueToEdit,
          ...updates,
        };
        onLeagueSaved(updatedLeague);
      } else {
        const createdLeague = await AppwriteService.createLeague({
          name: name.trim(),
          description: description.trim(),
          logoUrl: logoUrl.trim() || undefined,
          ownerId: 'user_admin',
          managerId,
          managerName,
          managerEmail,
        });
        onLeagueSaved(createdLeague);
      }
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save league';
      setErrorMsg(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const selectedUser = users.find((u) => u.$id === selectedUserId);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl max-h-[92vh] flex flex-col p-6 overflow-hidden">
        <DialogHeader className="border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-white tracking-tight">
                {leagueToEdit ? 'Edit League Configuration' : 'Create New League'}
              </DialogTitle>
              <DialogDescription>
                Establish a tournament league and assign a League Manager to oversee operations
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-4 py-1 pr-1">
          {/* League Details */}
          <div className="space-y-1.5">
            <Label htmlFor="leagueName" className="flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-amber-400" /> League Name *
            </Label>
            <Input
              id="leagueName"
              placeholder="e.g. Mile High Poker Circuit"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="leagueDesc">League Mission / Description *</Label>
            <Input
              id="leagueDesc"
              placeholder="e.g. Denver Metro competitive no-limit championship league"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="leagueLogo">Logo URL (Optional)</Label>
            <Input
              id="leagueLogo"
              type="url"
              placeholder="https://example.com/logo.png"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
            />
          </div>

          {/* Assigned League Manager */}
          <div className="pt-2 border-t border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label className="flex items-center gap-1.5 text-white font-bold">
                  <Crown className="w-4 h-4 text-amber-400" /> Assigned League Manager *
                </Label>
                <p className="text-[11px] text-slate-400">
                  Manager configures seasons, host venues, event schedules &amp; staff
                </p>
              </div>

              <div className="flex bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-xs">
                <button
                  type="button"
                  onClick={() => setManagerMode('existing')}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                    managerMode === 'existing'
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Existing User
                </button>
                <button
                  type="button"
                  onClick={() => setManagerMode('new')}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                    managerMode === 'new'
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  + New Manager
                </button>
              </div>
            </div>

            {managerMode === 'existing' ? (
              <div className="space-y-2">
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none"
                >
                  <option value="" disabled>Select user to assign as League Manager...</option>
                  {users.map((u) => (
                    <option key={u.$id} value={u.$id}>
                      {u.name} ({u.email}) — Role: {u.role.toUpperCase()}
                    </option>
                  ))}
                </select>

                {selectedUser && (
                  <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center justify-center font-bold text-xs">
                        👑
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">{selectedUser.name}</div>
                        <div className="text-[11px] text-slate-400">{selectedUser.email}</div>
                      </div>
                    </div>
                    <Badge variant={selectedUser.role === 'manager' ? 'default' : 'secondary'}>
                      {selectedUser.role === 'manager' ? 'Active Manager' : `Will promote from ${selectedUser.role}`}
                    </Badge>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3 bg-slate-900/60 p-3.5 rounded-xl border border-slate-800">
                <div className="space-y-1">
                  <Label htmlFor="newMgrName" className="text-xs flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-amber-400" /> Manager Full Name *
                  </Label>
                  <Input
                    id="newMgrName"
                    placeholder="e.g. Doyle Brunson"
                    value={newManagerName}
                    onChange={(e) => setNewManagerName(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="newMgrEmail" className="text-xs flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-indigo-400" /> Manager Email Address *
                  </Label>
                  <Input
                    id="newMgrEmail"
                    type="email"
                    placeholder="manager@domain.com"
                    value={newManagerEmail}
                    onChange={(e) => setNewManagerEmail(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="pt-3 border-t border-slate-800">
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" variant="default" disabled={isLoading}>
              {isLoading ? 'Saving League...' : leagueToEdit ? 'Save Changes' : 'Create League'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
