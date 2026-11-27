import React, { useState } from 'react';
import type { UserProfile, UserRole } from '@/types/holdem';
import { AuthService } from '@/services/authService';
import { AccountProfilePanel } from '@/components/auth/AccountProfilePanel';
import { OAuthProvidersBar } from '@/components/auth/OAuthProvidersBar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertCircle,
  Briefcase,
  Crown,
  Eye,
  EyeOff,
  KeyRound,
  LogIn,
  Mail,
  ShieldCheck,
  User,
  UserPlus,
} from 'lucide-react';

export interface AuthModalProps {
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

  // Sign In form state
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Sign Up form state
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const resetForms = () => {
    setLoginPassword('');
    setRegPassword('');
    setRegConfirmPassword('');
    setErrorMsg('');
  };

  const handleClose = () => {
    resetForms();
    onClose();
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');

    const res = await AuthService.login(loginIdentifier, loginPassword);
    setIsLoading(false);

    if (res.user) {
      onUserChange(res.user);
      handleClose();
    } else {
      setErrorMsg(res.error || 'Sign in failed. Check your username/email and password.');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (regUsername.trim().length < 3) {
      setErrorMsg('Username must be at least 3 characters.');
      return;
    }
    if (regPassword.length < 8) {
      setErrorMsg('Password must be at least 8 characters.');
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');

    const res = await AuthService.register({
      username: regUsername.trim(),
      email: regEmail.trim() || undefined,
      password: regPassword,
    });
    setIsLoading(false);

    if (res.user) {
      onUserChange(res.user);
      handleClose();
    } else {
      setErrorMsg(res.error || 'Unable to create account.');
    }
  };

  const handleDemoSwitch = (role: UserRole) => {
    const user = AuthService.switchDemoRole(role);
    onUserChange(user);
    handleClose();
  };

  const handleLogout = async () => {
    setIsLoading(true);
    await AuthService.logout();
    setIsLoading(false);
    onUserChange(null);
    handleClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-md max-h-[92dvh] overflow-y-auto bg-slate-950 border-slate-800 p-6">
        <DialogHeader className="text-left pb-2 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-white">
                {currentUser ? 'Player Account' : 'Sign In to Hold\u2019em Pro'}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400">
                {currentUser
                  ? 'Manage your active session and role'
                  : 'RSVP for games and track your league points'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {currentUser ? (
          <AccountProfilePanel
            currentUser={currentUser}
            isLoading={isLoading}
            onDemoSwitch={handleDemoSwitch}
            onLogout={handleLogout}
          />
        ) : (
          <div className="space-y-4">
            <Tabs
              value={tab}
              onValueChange={(v) => {
                setTab(v as 'login' | 'register');
                setErrorMsg('');
              }}
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Sign In</TabsTrigger>
                <TabsTrigger value="register">Sign Up</TabsTrigger>
              </TabsList>

              {errorMsg && (
                <div
                  role="alert"
                  className="mt-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-start gap-2"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Sign In Form */}
              <TabsContent value="login" className="mt-4">
                <form onSubmit={handleLogin} className="space-y-3.5">
                  <div className="space-y-1.5">
                    <Label htmlFor="login-identifier">Username or Email</Label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <Input
                        id="login-identifier"
                        type="text"
                        autoComplete="username"
                        value={loginIdentifier}
                        onChange={(e) => setLoginIdentifier(e.target.value)}
                        placeholder="e.g. Chip4295 or you@example.com"
                        className="pl-9 h-11"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="login-password">Password</Label>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <Input
                        id="login-password"
                        type={showLoginPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="Enter your password"
                        className="pl-9 pr-10 h-11"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowLoginPassword((s) => !s)}
                        aria-label={showLoginPassword ? 'Hide password' : 'Show password'}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white"
                      >
                        {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <Button type="submit" disabled={isLoading} className="w-full h-11 font-bold">
                    <LogIn className="w-4 h-4" />
                    {isLoading ? 'Signing In...' : 'Sign In'}
                  </Button>
                </form>
              </TabsContent>

              {/* Sign Up Form */}
              <TabsContent value="register" className="mt-4">
                <form onSubmit={handleRegister} className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="reg-username">Username / Player Handle *</Label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <Input
                        id="reg-username"
                        type="text"
                        autoComplete="username"
                        value={regUsername}
                        onChange={(e) => setRegUsername(e.target.value)}
                        placeholder="e.g. Chip4295"
                        className="pl-9 h-11"
                        minLength={3}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="reg-email">
                      Email Address <span className="text-slate-500 font-normal">(Optional)</span>
                    </Label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <Input
                        id="reg-email"
                        type="email"
                        autoComplete="email"
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        placeholder="For account recovery & Google/Apple linking"
                        className="pl-9 h-11"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="reg-password">Password (Min 8 chars) *</Label>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <Input
                        id="reg-password"
                        type={showRegPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        placeholder="Create a password"
                        className="pl-9 pr-10 h-11"
                        minLength={8}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegPassword((s) => !s)}
                        aria-label={showRegPassword ? 'Hide password' : 'Show password'}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white"
                      >
                        {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="reg-confirm-password">Confirm Password *</Label>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <Input
                        id="reg-confirm-password"
                        type={showRegPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        value={regConfirmPassword}
                        onChange={(e) => setRegConfirmPassword(e.target.value)}
                        placeholder="Re-enter your password"
                        className="pl-9 h-11"
                        minLength={8}
                        required
                      />
                    </div>
                  </div>

                  <Button type="submit" disabled={isLoading} className="w-full h-11 font-bold">
                    <UserPlus className="w-4 h-4" />
                    {isLoading ? 'Creating Account...' : 'Create Player Account'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            {/* Future Google & Apple Sign-In (wired to Appwrite OAuth2) */}
            <OAuthProvidersBar onError={setErrorMsg} />

            {/* Subtle Demo Role Testing Switcher */}
            <details className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-3">
              <summary className="cursor-pointer text-[11px] font-bold uppercase tracking-wider text-slate-500 select-none">
                Demo Staff Quick Access
              </summary>
              <div className="grid grid-cols-3 gap-2 pt-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleDemoSwitch('admin')}
                  className="h-9 text-xs"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-rose-400" /> Admin
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleDemoSwitch('manager')}
                  className="h-9 text-xs"
                >
                  <Crown className="w-3.5 h-3.5 text-amber-400" /> Manager
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleDemoSwitch('dealer')}
                  className="h-9 text-xs"
                >
                  <Briefcase className="w-3.5 h-3.5 text-emerald-400" /> Dealer
                </Button>
              </div>
            </details>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
