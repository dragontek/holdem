import React, { useState } from 'react';
import type { UserProfile, UserRole } from '../types/holdem';
import { AuthService } from '../services/authService';
import { 
  UserPlus, 
  X, 
  Mail, 
  User, 
  Crown, 
  Briefcase, 
  PenTool, 
  Gamepad2, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';

interface UserInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUserCreated: (newUser: UserProfile) => void;
}

export const UserInviteModal: React.FC<UserInviteModalProps> = ({
  isOpen,
  onClose,
  onUserCreated,
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('player');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Full Name is required');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('Valid email address is required');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');

    try {
      const created = await AuthService.createUser(name.trim(), email.trim(), role);
      onUserCreated(created);
      onClose();
    } catch (e: any) {
      setErrorMsg(e.message || 'Failed to create user');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div className="glass-panel w-full max-w-lg rounded-3xl border border-indigo-500/40 p-6 shadow-2xl relative felt-glow max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white">Add League Member / Staff</h3>
              <p className="text-xs text-slate-400">Register new staff or player and assign initial permission role</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto py-4 space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-amber-400" /> Full Name *
            </label>
            <input
              type="text"
              placeholder="e.g. Phil Ivey or Alex Dealer"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-900 text-white text-xs px-3.5 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-indigo-400" /> Email Address *
            </label>
            <input
              type="email"
              placeholder="user@holdempro.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-900 text-white text-xs px-3.5 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500"
              required
            />
          </div>

          {/* Role Selection */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 block">
              Assign League Role &amp; Access Level *
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              
              {/* Manager */}
              <div
                onClick={() => setRole('manager')}
                className={`p-3 rounded-xl border cursor-pointer transition-all ${
                  role === 'manager'
                    ? 'bg-amber-500/15 border-amber-500/60 ring-1 ring-amber-500'
                    : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs text-amber-300 flex items-center gap-1.5">
                    <Crown className="w-4 h-4 text-amber-400" /> Manager
                  </span>
                  {role === 'manager' && <CheckCircle2 className="w-4 h-4 text-amber-400" />}
                </div>
                <p className="text-[10px] text-slate-400 leading-tight">
                  Full admin: Venues, Seasons, User Roles &amp; Game Management
                </p>
              </div>

              {/* Dealer */}
              <div
                onClick={() => setRole('dealer')}
                className={`p-3 rounded-xl border cursor-pointer transition-all ${
                  role === 'dealer'
                    ? 'bg-emerald-500/15 border-emerald-500/60 ring-1 ring-emerald-500'
                    : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs text-emerald-300 flex items-center gap-1.5">
                    <Briefcase className="w-4 h-4 text-emerald-400" /> Dealer
                  </span>
                  {role === 'dealer' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                </div>
                <p className="text-[10px] text-slate-400 leading-tight">
                  Tournament desk: Timer controls, rebuys, addons, bust-outs
                </p>
              </div>

              {/* Scribe */}
              <div
                onClick={() => setRole('scribe')}
                className={`p-3 rounded-xl border cursor-pointer transition-all ${
                  role === 'scribe'
                    ? 'bg-indigo-500/15 border-indigo-500/60 ring-1 ring-indigo-500'
                    : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs text-indigo-300 flex items-center gap-1.5">
                    <PenTool className="w-4 h-4 text-indigo-400" /> Scribe
                  </span>
                  {role === 'scribe' && <CheckCircle2 className="w-4 h-4 text-indigo-400" />}
                </div>
                <p className="text-[10px] text-slate-400 leading-tight">
                  Seating desk: Walk-in registration, bust-outs &amp; KO bounty awards
                </p>
              </div>

              {/* Player */}
              <div
                onClick={() => setRole('player')}
                className={`p-3 rounded-xl border cursor-pointer transition-all ${
                  role === 'player'
                    ? 'bg-slate-800 border-slate-600 ring-1 ring-slate-400'
                    : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs text-slate-300 flex items-center gap-1.5">
                    <Gamepad2 className="w-4 h-4 text-slate-400" /> Player
                  </span>
                  {role === 'player' && <CheckCircle2 className="w-4 h-4 text-slate-300" />}
                </div>
                <p className="text-[10px] text-slate-400 leading-tight">
                  Public member: Standings, schedules, QR check-in &amp; TV display
                </p>
              </div>

            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-bold transition-all shadow-md disabled:opacity-50"
            >
              {isLoading ? 'Creating...' : 'Add Member'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};

export default UserInviteModal;
