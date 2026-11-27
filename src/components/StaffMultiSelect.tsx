import React from 'react';
import type { Player } from '@/types/holdem';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Briefcase, PenTool, X } from 'lucide-react';

export interface StaffMultiSelectProps {
  id?: string;
  label: string;
  role: 'dealer' | 'scribe';
  accounts: Player[];
  selectedNames: string[];
  onChange: (nextNames: string[]) => void;
  disabled?: boolean;
  compact?: boolean;
}

export const StaffMultiSelect: React.FC<StaffMultiSelectProps> = ({
  id,
  label,
  role,
  accounts,
  selectedNames,
  onChange,
  disabled = false,
  compact = false,
}) => {
  const roleLabel = role === 'dealer' ? 'Dealer' : 'Scribe';
  const matchingAccounts = accounts
    .filter((account) => account.role === role && Boolean(account.name))
    .sort((a, b) => (a.name || '').localeCompare(b.name || ''));

  const normalizedSelected = new Set(selectedNames.map((n) => n.trim().toLowerCase()));
  const matchingNameSet = new Set(matchingAccounts.map((a) => a.name.trim().toLowerCase()));
  const availableAccounts = matchingAccounts.filter(
    (account) => !normalizedSelected.has(account.name.trim().toLowerCase())
  );

  const handleAdd = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed || normalizedSelected.has(trimmed.toLowerCase())) return;
    onChange([...selectedNames, trimmed]);
  };

  const handleRemove = (nameToRemove: string) => {
    onChange(selectedNames.filter((n) => n !== nameToRemove));
  };

  const Icon = role === 'dealer' ? Briefcase : PenTool;
  const iconColor = role === 'dealer' ? 'text-emerald-400' : 'text-indigo-400';
  const badgeVariant = role === 'dealer' ? 'success' : 'indigo';
  const selectId = id || `staff-select-${role}`;

  return (
    <div className="space-y-1.5">
      <Label
        htmlFor={selectId}
        className={`${compact ? 'text-[11px] text-slate-400' : 'text-[11px] font-semibold text-slate-300'} flex items-center gap-1.5`}
      >
        <Icon className={`w-3 h-3 ${iconColor}`} />
        <span>{label}</span>
        <span className="text-[10px] font-normal text-slate-500">
          ({matchingAccounts.length} in DB)
        </span>
      </Label>

      {/* Selected staff chips */}
      {selectedNames.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedNames.map((name) => {
            const isInRolePool = matchingNameSet.has(name.trim().toLowerCase());
            return (
              <Badge
                key={name}
                variant={isInRolePool ? badgeVariant : 'secondary'}
                className="pl-2 pr-1 py-0.5 text-[11px] gap-1"
                title={
                  isInRolePool
                    ? `${roleLabel} account`
                    : `Assigned name not currently in the ${roleLabel} role list`
                }
              >
                <span>{name}</span>
                {!disabled && (
                  <button
                    type="button"
                    onClick={() => handleRemove(name)}
                    aria-label={`Remove ${name} from ${label}`}
                    className="rounded-full p-0.5 hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </Badge>
            );
          })}
        </div>
      )}

      {/* Database-backed dropdown */}
      {matchingAccounts.length > 0 ? (
        <select
          id={selectId}
          value=""
          disabled={disabled || availableAccounts.length === 0}
          onChange={(e) => {
            if (e.target.value) {
              handleAdd(e.target.value);
            }
          }}
          className={`w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 disabled:cursor-not-allowed disabled:opacity-50 ${
            compact ? 'h-9 text-xs' : 'h-10 text-xs sm:text-sm rounded-xl px-3'
          }`}
        >
          <option value="">
            {availableAccounts.length === 0
              ? `All ${roleLabel.toLowerCase()}s assigned`
              : `Select ${roleLabel.toLowerCase()}...`}
          </option>
          {availableAccounts.map((account) => (
            <option key={account.$id} value={account.name}>
              {account.name}
              {account.nickname && account.nickname !== account.name ? ` (${account.nickname})` : ''}
            </option>
          ))}
        </select>
      ) : (
        <div className="rounded-lg border border-dashed border-slate-800 bg-slate-950/60 px-2.5 py-2 text-[11px] text-slate-400">
          No {roleLabel.toLowerCase()} accounts in database yet. Assign the {roleLabel} role in
          Admin &rarr; Players.
        </div>
      )}
    </div>
  );
};
