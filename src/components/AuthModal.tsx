import React, { useState } from 'react';
import type { UserProfile, UserRole } from '../types/holdem';
import { AuthService, DEMO_USERS } from '../services/authService';
import { 
  ShieldCheck, 
  LogIn, 
  UserPlus, 
  LogOut, 
  X, 
  KeyRound, 
  Mail, 
  User, 
  AlertCircle,
  Crown,
  Briefcase,
  PenTool,
  Gamepad2
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  onUserChange: (user: UserProfile | null) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUserChange,
}) => {
  const [tab, setTab] = useState<'login' | 'register'>('login');

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register form state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regRole, setRegRole] = useState<UserRole>('player');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');

    const res = await AuthService.login(loginEmail, loginPassword);
    setIsLoading(false);

    if (res.user) {
      onUserChange(res.user);
      onClose();
    } else {
      setErrorMsg(res.error || 'Login failed. Check your email and password.');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim()) {
      setErrorMsg('Full Name is required');
      return;
    }
    if (regPassword.length < 8) {
      setErrorMsg('Password must be at least 8 characters');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');

    const res = await AuthService.register(regName.trim(), regEmail.trim(), regPassword, regRole);
    setIsLoading(false);

    if (res.user) {
      onUserChange(res.user);
      onClose();
    } else {
      setErrorMsg(res.error || 'Registration failed');
    }
  };

  const handleDemoSwitch = (role: UserRole) => {
    const user = AuthService.switchDemoRole(role);
    onUserChange(user);
    onClose();
  };

  const handleLogout = async () => {
    setIsLoading(true);
    await AuthService.logout();
    setIsLoading(false);
    onUserChange(null);
    onClose();
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-rose-400" /> Platform Admin
          </span>
        );
      case 'manager':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
            <Crown className="w-3.5 h-3.5 text-amber-400" /> Manager (Admin)
          </span>
        );
      case 'dealer':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
            <Briefcase className="w-3.5 h-3.5 text-emerald-400" /> Dealer
          </span>
        );
      case 'scribe':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 flex items-center gap-1">
            <PenTool className="w-3.5 h-3.5 text-indigo-400" /> Scribe
          </span>
        );
      case 'player':
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1">
            <Gamepad2 className="w-3.5 h-3.5 text-slate-400" /> Player
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div className="glass-panel w-full max-w-md rounded-3xl border border-emerald-500/40 p-6 shadow-2xl relative felt-glow max-h-[92vh] flex flex-col">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 rounded-2xl felt-gradient border border-emerald-500/50 flex items-center justify-center text-amber-400 shadow-md shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              Hold&apos;em Pro <span className="gold-gradient-text">Identity</span>
            </h2>
            <p className="text-xs text-slate-400">Account login, registration &amp; role security</p>
          </div>
        </div>

        {/* If Logged In: Show Profile Card */}
        {currentUser ? (
          <div className="space-y-4 py-3 flex-1 overflow-y-auto">
            <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white">{currentUser.name}</h3>
                  <p className="text-xs text-slate-400">{currentUser.email}</p>
                </div>
                {getRoleBadge(currentUser.role)}
              </div>

              <div className="text-xs text-slate-300 pt-2 border-t border-slate-800/80">
                {currentUser.role === 'admin' && (
                  <p className="text-rose-400/90">
                    Platform Administrator: Create leagues, assign designated League Managers, and oversee all league operations.
                  </p>
                )}
                {currentUser.role === 'manager' && (
                  <p className="text-amber-400/90">
                    Full Manager Privileges: Admin section, Venue CRUD, Tournament creation, Clock &amp; Payouts.
                  </p>
                )}
                {currentUser.role === 'dealer' && (
                  <p className="text-emerald-400/90">
                    Dealer Privileges: Active tournament clocks, Table Dealing, Rebuys, Add-ons &amp; Bust-outs.
                  </p>
                )}
                {currentUser.role === 'scribe' && (
                  <p className="text-indigo-400/90">
                    Scribe Privileges: Seating check-in, Bust-outs, Knockouts &amp; Points tracking.
                  </p>
                )}
                {currentUser.role === 'player' && (
                  <p className="text-slate-400">
                    Player Membership: Live leaderboard, tournament schedules &amp; player statistics.
                  </p>
                )}
              </div>
            </div>

            {/* Quick Demo Switcher */}
            <div className="space-y-2 pt-2">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
                Quick Role Switcher (Testing):
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <button
                  onClick={() => handleDemoSwitch('admin')}
                  className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold text-left flex items-center gap-1.5"
                >
                  <ShieldCheck className="w-3.5 h-3.5" /> Super Admin
                </button>
                <button
                  onClick={() => handleDemoSwitch('manager')}
                  className="p-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold text-left flex items-center gap-1.5"
                >
                  <Crown className="w-3.5 h-3.5" /> Manager
                </button>
                <button
                  onClick={() => handleDemoSwitch('dealer')}
                  className="p-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold text-left flex items-center gap-1.5"
                >
                  <Briefcase className="w-3.5 h-3.5" /> Dealer
                </button>
                <button
                  onClick={() => handleDemoSwitch('scribe')}
                  className="p-2 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-bold text-left flex items-center gap-1.5"
                >
                  <PenTool className="w-3.5 h-3.5" /> Scribe
                </button>
                <button
                  onClick={() => handleDemoSwitch('player')}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-bold text-left flex items-center gap-1.5"
                >
                  <Gamepad2 className="w-3.5 h-3.5" /> Player
                </button>
              </div>
            </div>

            <button
              onClick={handleLogout}
              disabled={isLoading}
              className="w-full py-3 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 font-semibold border border-rose-500/40 flex items-center justify-center gap-2 transition-all mt-4"
            >
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          </div>
        ) : (
          /* Authentication Forms */
          <div className="flex-1 overflow-y-auto space-y-4">
            {/* Tab Selector */}
            <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setTab('login');
                  setErrorMsg('');
                }}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  tab === 'login' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setTab('register');
                  setErrorMsg('');
                }}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  tab === 'register' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                Create Account
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {tab === 'login' ? (
              <form onSubmit={handleLogin} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none transition-all"
                      placeholder="manager@holdempro.com"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none transition-all"
                      placeholder="••••••••"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50"
                >
                  <LogIn className="w-4 h-4" /> {isLoading ? 'Authenticating...' : 'Sign In'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Full Name *
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:outline-none transition-all"
                      placeholder="e.g. Doyle Brunson"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Email Address *
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:outline-none transition-all"
                      placeholder="doyle@example.com"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Password (Min 8 chars) *
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:outline-none transition-all"
                      placeholder="••••••••"
                      minLength={8}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    System Role
                  </label>
                  <select
                    value={regRole}
                    onChange={(e) => setRegRole(e.target.value as UserRole)}
                    className="w-full bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-xl px-3 py-2 text-sm text-white focus:outline-none font-semibold"
                  >
                    <option value="player">Player (League Member)</option>
                    <option value="scribe">Scribe (Check-in &amp; Bust-outs)</option>
                    <option value="dealer">Dealer (Live Clock &amp; Tables)</option>
                    <option value="manager">Manager (League Admin)</option>
                    <option value="admin">Admin (Platform Super Administrator)</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50"
                >
                  <UserPlus className="w-4 h-4" /> {isLoading ? 'Creating Account...' : 'Register'}
                </button>
              </form>
            )}

            {/* Quick Demo Logins Divider */}
            <div className="pt-2">
              <div className="relative my-3 text-center">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-800" /></div>
                <span className="relative px-3 bg-slate-900 text-[10px] text-slate-500 uppercase font-extrabold tracking-wider">
                  Quick Demo Access
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleDemoSwitch('admin')}
                  className="p-2 rounded-xl glass-card text-rose-300 hover:bg-slate-800 border border-rose-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-rose-400" /> Demo Admin
                </button>
                <button
                  type="button"
                  onClick={() => handleDemoSwitch('manager')}
                  className="p-2 rounded-xl glass-card text-amber-300 hover:bg-slate-800 border border-amber-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all"
                >
                  <Crown className="w-3.5 h-3.5 text-amber-400" /> Demo Manager
                </button>
                <button
                  type="button"
                  onClick={() => handleDemoSwitch('dealer')}
                  className="p-2 rounded-xl glass-card text-emerald-300 hover:bg-slate-800 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all"
                >
                  <Briefcase className="w-3.5 h-3.5 text-emerald-400" /> Demo Dealer
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
