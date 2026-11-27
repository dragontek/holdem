import React from 'react';
import type { UserProfile, UserRole } from '@/types/holdem';
import { isAppwriteConfigured } from '@/lib/appwrite';
import { AuthService, isSyntheticPlayerEmail } from '@/services/authService';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Briefcase,
  Crown,
  Gamepad2,
  LogOut,
  PenTool,
  ShieldCheck,
} from 'lucide-react';

export interface AccountProfilePanelProps {
  currentUser: UserProfile;
  isLoading: boolean;
  onDemoSwitch: (role: UserRole) => void;
  onLogout: () => void;
}

function getRoleMeta(role: UserRole) {
  switch (role) {
    case 'admin':
      return {
        label: 'Platform Admin',
        variant: 'destructive' as const,
        icon: <ShieldCheck className="w-3.5 h-3.5" />,
        summary: 'Full league administration, season setup, venues, schedules, and permissions.',
      };
    case 'manager':
      return {
        label: 'League Manager',
        variant: 'default' as const,
        icon: <Crown className="w-3.5 h-3.5" />,
        summary: 'Manage leagues, seasons, venues, games, director clocks, and official scoring.',
      };
    case 'dealer':
      return {
        label: 'Dealer',
        variant: 'success' as const,
        icon: <Briefcase className="w-3.5 h-3.5" />,
        summary: 'Run tournament clocks, seat players, and record knockouts and hand bonuses.',
      };
    case 'scribe':
      return {
        label: 'Scribe',
        variant: 'indigo' as const,
        icon: <PenTool className="w-3.5 h-3.5" />,
        summary: 'Check in RSVPs, track knockouts, survivor points, and scorecards.',
      };
    case 'player':
    default:
      return {
        label: 'Player',
        variant: 'secondary' as const,
        icon: <Gamepad2 className="w-3.5 h-3.5" />,
        summary: 'RSVP for upcoming tournaments, follow live clocks, and track season points.',
      };
  }
}

export const AccountProfilePanel: React.FC<AccountProfilePanelProps> = ({
  currentUser,
  isLoading,
  onDemoSwitch,
  onLogout,
}) => {
  const roleMeta = getRoleMeta(currentUser.role);
  const isLiveSession = AuthService.isLiveAppwriteSession();
  const displayIdentifier = isSyntheticPlayerEmail(currentUser.email)
    ? `@${currentUser.nickname || currentUser.name}`
    : currentUser.email;

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white truncate">{currentUser.name}</h3>
              <Badge variant={isLiveSession ? 'success' : 'secondary'} className="text-[10px]">
                {isLiveSession ? 'Appwrite' : 'Demo'}
              </Badge>
            </div>
            <p className="text-xs text-slate-400 truncate mt-0.5">{displayIdentifier}</p>
          </div>
          <Badge variant={roleMeta.variant} className="shrink-0">
            {roleMeta.icon}
            {roleMeta.label}
          </Badge>
        </div>

        <p className="text-xs text-slate-300 pt-2.5 border-t border-slate-800">
          {roleMeta.summary}
        </p>
      </div>

      {/* Role Testing Switcher (offline demo mode only) */}
      {!isAppwriteConfigured && (
        <details className="rounded-xl border border-slate-800 bg-slate-900/40 p-3">
          <summary className="cursor-pointer text-[11px] font-bold uppercase tracking-wider text-slate-400 select-none">
            Quick Role Switcher (Demo Testing)
          </summary>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-3">
            {(
              [
                { role: 'admin', label: 'Admin', icon: <ShieldCheck className="w-3.5 h-3.5" /> },
                { role: 'manager', label: 'Manager', icon: <Crown className="w-3.5 h-3.5" /> },
                { role: 'dealer', label: 'Dealer', icon: <Briefcase className="w-3.5 h-3.5" /> },
                { role: 'scribe', label: 'Scribe', icon: <PenTool className="w-3.5 h-3.5" /> },
                { role: 'player', label: 'Player', icon: <Gamepad2 className="w-3.5 h-3.5" /> },
              ] as const
            ).map((item) => (
              <Button
                key={item.role}
                type="button"
                variant={currentUser.role === item.role ? 'default' : 'outline'}
                size="sm"
                onClick={() => onDemoSwitch(item.role)}
                className="h-9 justify-start text-xs"
              >
                {item.icon}
                {item.label}
              </Button>
            ))}
          </div>
        </details>
      )}

      <Button
        type="button"
        variant="destructive"
        onClick={onLogout}
        disabled={isLoading}
        className="w-full h-11 text-sm font-bold"
      >
        <LogOut className="w-4 h-4" />
        {isLoading ? 'Signing Out...' : 'Sign Out'}
      </Button>
    </div>
  );
};
