import React, { useState } from 'react';
import type { UserProfile, UserRole } from '@/types/holdem';
import { isAppwriteConfigured } from '@/lib/appwrite';
import type { ActorRole } from '@/lib/permissions';
import { ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export interface AdminRBACSectionProps {
  currentUser?: UserProfile | null;
  onQuickRoleSwitch: (role: UserRole) => void;
}

const MATRIX_ROLES: { id: ActorRole; label: string; headerClass: string }[] = [
  { id: 'admin', label: 'Admin', headerClass: 'text-rose-400 font-bold' },
  { id: 'manager', label: 'Manager', headerClass: 'text-amber-400 font-bold' },
  { id: 'dealer', label: 'Dealer', headerClass: 'text-emerald-400 font-bold' },
  { id: 'scribe', label: 'Scribe', headerClass: 'text-indigo-400 font-bold' },
  { id: 'player', label: 'Player', headerClass: 'text-slate-200 font-semibold' },
  { id: 'guest', label: 'Guest', headerClass: 'text-slate-400 font-semibold' },
];

interface MatrixRow {
  capability: string;
  values: Record<ActorRole, { text: string; granted: boolean; adminOnly?: boolean }>;
}

const PERMISSION_ROWS: MatrixRow[] = [
  {
    capability: 'Create / Edit Leagues & Assign League Managers',
    values: {
      admin: { text: '✓ Full', granted: true, adminOnly: true },
      manager: { text: '✗ Read-Only', granted: false },
      dealer: { text: '✗ None', granted: false },
      scribe: { text: '✗ None', granted: false },
      player: { text: '✗ None', granted: false },
      guest: { text: '✗ None', granted: false },
    },
  },
  {
    capability: 'Clear & Reseed Appwrite Database / Assign Admin Role',
    values: {
      admin: { text: '✓ Full', granted: true, adminOnly: true },
      manager: { text: '✗ None', granted: false },
      dealer: { text: '✗ None', granted: false },
      scribe: { text: '✗ None', granted: false },
      player: { text: '✗ None', granted: false },
      guest: { text: '✗ None', granted: false },
    },
  },
  {
    capability: 'Configure Seasons, Host Venues & Announcements',
    values: {
      admin: { text: '✓ Full', granted: true, adminOnly: true },
      manager: { text: '✓ Full', granted: true },
      dealer: { text: '✗ None', granted: false },
      scribe: { text: '✗ None', granted: false },
      player: { text: '✗ None', granted: false },
      guest: { text: '✗ None', granted: false },
    },
  },
  {
    capability: 'Schedule, Edit, Delete & Finalize Tournaments',
    values: {
      admin: { text: '✓ Full', granted: true, adminOnly: true },
      manager: { text: '✓ Full', granted: true },
      dealer: { text: '✗ None', granted: false },
      scribe: { text: '✗ None', granted: false },
      player: { text: '✗ None', granted: false },
      guest: { text: '✗ None', granted: false },
    },
  },
  {
    capability: 'Manage Users & Assign Non-Admin Staff Roles',
    values: {
      admin: { text: '✓ Full', granted: true, adminOnly: true },
      manager: { text: '✓ Non-Admin', granted: true },
      dealer: { text: '✗ None', granted: false },
      scribe: { text: '✗ None', granted: false },
      player: { text: '✗ None', granted: false },
      guest: { text: '✗ None', granted: false },
    },
  },
  {
    capability: 'Manage Blind Clock & Levels (Backend Source of Truth)',
    values: {
      admin: { text: '✓ Full', granted: true, adminOnly: true },
      manager: { text: '✓ Full', granted: true },
      dealer: { text: '✓ Full', granted: true },
      scribe: { text: '✗ View Only', granted: false },
      player: { text: '✗ View Only', granted: false },
      guest: { text: '✗ View Only', granted: false },
    },
  },
  {
    capability: 'Seat Walk-In Players, Check In RSVPs & Add Rebuys/Add-ons',
    values: {
      admin: { text: '✓ Full', granted: true, adminOnly: true },
      manager: { text: '✓ Full', granted: true },
      dealer: { text: '✓ Full', granted: true },
      scribe: { text: '✓ Full', granted: true },
      player: { text: '✗ None', granted: false },
      guest: { text: '✗ None', granted: false },
    },
  },
  {
    capability: 'Record Bust-outs, Knockouts, Hand Bonuses & Scorecard Rules',
    values: {
      admin: { text: '✓ Full', granted: true, adminOnly: true },
      manager: { text: '✓ Full', granted: true },
      dealer: { text: '✓ Full', granted: true },
      scribe: { text: '✓ Full', granted: true },
      player: { text: '✗ View Only', granted: false },
      guest: { text: '✗ View Only', granted: false },
    },
  },
  {
    capability: 'RSVP to Tournaments',
    values: {
      admin: { text: '✓ Full', granted: true, adminOnly: true },
      manager: { text: '✓ Full', granted: true },
      dealer: { text: '✓ Full', granted: true },
      scribe: { text: '✓ Full', granted: true },
      player: { text: '✓ Self', granted: true },
      guest: { text: '✗ Sign In', granted: false },
    },
  },
  {
    capability: 'Browse Games, Standings, Live Clock & Venue TV Display',
    values: {
      admin: { text: '✓ Full', granted: true, adminOnly: true },
      manager: { text: '✓ Full', granted: true },
      dealer: { text: '✓ Full', granted: true },
      scribe: { text: '✓ Full', granted: true },
      player: { text: '✓ Full', granted: true },
      guest: { text: '✓ Read-Only', granted: true },
    },
  },
];

export const AdminRBACSection: React.FC<AdminRBACSectionProps> = ({
  currentUser,
  onQuickRoleSwitch,
}) => {
  const [highlightedRole, setHighlightedRole] = useState<ActorRole>(
    currentUser?.role || 'player'
  );

  return (
    <div className="space-y-6">
      <Card className="p-5 border-slate-800 bg-slate-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-amber-400" /> Role-Based Access Control (RBAC) Matrix
          </h2>
          <p className="text-xs text-slate-400">
            {isAppwriteConfigured
              ? 'Enforced across UI controls, service mutations, and Appwrite authenticated writes.'
              : 'Preview and simulate permission capabilities for each user role in demo mode.'}
          </p>
        </div>

        {/* Role Highlighter (live Appwrite) or Demo Role Switcher (offline demo only) */}
        <div className="flex items-center gap-1.5 bg-slate-900 p-1.5 rounded-xl border border-slate-800 overflow-x-auto">
          <span className="text-[10px] text-slate-400 font-bold uppercase px-2 shrink-0">
            {isAppwriteConfigured ? 'Inspect Role:' : 'Simulate Role:'}
          </span>
          {(isAppwriteConfigured
            ? (['admin', 'manager', 'dealer', 'scribe', 'player', 'guest'] as const)
            : (['admin', 'manager', 'dealer', 'scribe', 'player'] as const)
          ).map((r) => {
            const isSelected = isAppwriteConfigured
              ? highlightedRole === r
              : currentUser?.role === r;
            return (
              <Button
                key={r}
                type="button"
                variant={isSelected ? 'default' : 'ghost'}
                size="sm"
                onClick={() => {
                  setHighlightedRole(r);
                  if (!isAppwriteConfigured && r !== 'guest') {
                    onQuickRoleSwitch(r);
                  }
                }}
                className={`h-7 px-2.5 text-xs font-bold ${
                  isSelected
                    ? r === 'admin'
                      ? 'bg-rose-500 text-white'
                      : 'bg-amber-500 text-slate-950'
                    : 'text-slate-400'
                }`}
              >
                {r.toUpperCase()}
              </Button>
            );
          })}
        </div>
      </Card>

      {/* Permissions Breakdown Matrix */}
      <Card className="p-6 border-slate-800 bg-slate-900/60 space-y-4">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider">
          Operational Permissions Matrix
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="py-2.5 px-3">System Capability</th>
                {MATRIX_ROLES.map((roleCol) => (
                  <th
                    key={roleCol.id}
                    className={`py-2.5 px-3 ${roleCol.headerClass} ${
                      highlightedRole === roleCol.id ? 'bg-slate-800/70 rounded-t-lg' : ''
                    }`}
                  >
                    {roleCol.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {PERMISSION_ROWS.map((row) => (
                <tr key={row.capability}>
                  <td className="py-2.5 px-3 font-semibold text-white">{row.capability}</td>
                  {MATRIX_ROLES.map((roleCol) => {
                    const cell = row.values[roleCol.id];
                    const tone = cell.granted
                      ? roleCol.id === 'admin'
                        ? 'text-rose-400 font-bold'
                        : 'text-emerald-400 font-bold'
                      : 'text-slate-500';
                    return (
                      <td
                        key={roleCol.id}
                        className={`py-2.5 px-3 ${tone} ${
                          highlightedRole === roleCol.id ? 'bg-slate-800/40' : ''
                        }`}
                      >
                        {cell.text}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
