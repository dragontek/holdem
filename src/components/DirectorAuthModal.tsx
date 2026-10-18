import React, { useState } from 'react';
import { ShieldCheck, LogIn, LogOut, X, KeyRound, Mail, Sparkles, CheckCircle2 } from 'lucide-react';
import { AuthService } from '../services/authService';

interface DirectorAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDirector: boolean;
  onAuthChange: (isDirector: boolean) => void;
}

export const DirectorAuthModal: React.FC<DirectorAuthModalProps> = ({
  isOpen,
  onClose,
  isDirector,
  onAuthChange,
}) => {
  const [email, setEmail] = useState('director@holdempro.com');
  const [password, setPassword] = useState('director123');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');

    const res = await AuthService.loginDirector(email, password);
    setIsLoading(false);

    if (res.isDirector) {
      onAuthChange(true);
      onClose();
    } else {
      setErrorMsg(res.error || 'Authentication failed. Please check credentials.');
    }
  };

  const handleDemoLogin = async () => {
    setIsLoading(true);
    setErrorMsg('');
    const res = await AuthService.loginDirector('director@holdempro.com', 'director123');
    setIsLoading(false);
    onAuthChange(true);
    onClose();
  };

  const handleLogout = async () => {
    setIsLoading(true);
    await AuthService.logout();
    setIsLoading(false);
    onAuthChange(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="glass-panel w-full max-w-md rounded-3xl border border-emerald-500/40 p-6 shadow-2xl relative felt-glow">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl felt-gradient border border-emerald-500/50 flex items-center justify-center text-amber-400 shadow-md">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              Director Desk <span className="gold-gradient-text">Auth</span>
            </h2>
            <p className="text-xs text-slate-400">Tournament Director Control Panel Access</p>
          </div>
        </div>

        {isDirector ? (
          /* Logged In View */
          <div className="space-y-4 text-center py-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-white">Director Session Active</h3>
              <p className="text-xs text-slate-400 mt-1">
                You have full administrative privileges for tournament clocks, seating balancing, and payouts.
              </p>
            </div>

            <button
              onClick={handleLogout}
              disabled={isLoading}
              className="w-full py-3 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 font-semibold border border-rose-500/40 flex items-center justify-center gap-2 transition-all mt-4"
            >
              <LogOut className="w-4 h-4" /> Log Out Director Session
            </button>
          </div>
        ) : (
          /* Login Form */
          <form onSubmit={handleLogin} className="space-y-4">
            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold">
                {errorMsg}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Director Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-900/90 border border-slate-700 focus:border-amber-400 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none transition-all"
                  placeholder="director@holdempro.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-900/90 border border-slate-700 focus:border-amber-400 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none transition-all"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all"
            >
              <LogIn className="w-4 h-4" /> {isLoading ? 'Authenticating...' : 'Sign In as Director'}
            </button>

            <div className="relative my-4 text-center">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-800" /></div>
              <span className="relative px-3 bg-slate-900 text-[10px] text-slate-500 uppercase font-extrabold tracking-wider">or</span>
            </div>

            <button
              type="button"
              onClick={handleDemoLogin}
              className="w-full py-2.5 rounded-xl glass-card text-emerald-400 hover:text-emerald-300 border border-emerald-500/30 text-xs font-semibold flex items-center justify-center gap-2 transition-all"
            >
              <Sparkles className="w-4 h-4 text-emerald-400" /> Quick Demo Director Login
            </button>
          </form>
        )}

      </div>
    </div>
  );
};
