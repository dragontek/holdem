import React from 'react';
import type { UserProfile, UserRole } from '@/types/holdem';
import { ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export interface AdminRBACSectionProps {
  currentUser?: UserProfile | null;
  onQuickRoleSwitch: (role: UserRole) => void;
}

export const AdminRBACSection: React.FC<AdminRBACSectionProps> = ({
  currentUser,
  onQuickRoleSwitch,
}) => {
  return (
    <div className="space-y-6">
      <Card className="p-5 border-slate-800 bg-slate-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
          {(['manager', 'dealer', 'scribe', 'player'] as const).map((r) => {
            const isCurrent = currentUser?.role === r;
            return (
              <Button
                key={r}
                variant={isCurrent ? 'default' : 'ghost'}
                size="sm"
                onClick={() => onQuickRoleSwitch(r)}
                className={`h-7 px-2.5 text-xs font-bold ${
                  isCurrent ? 'bg-amber-500 text-slate-950' : 'text-slate-400'
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
      </Card>
    </div>
  );
};
