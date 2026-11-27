import React from 'react';
import { AUTH_PROVIDERS } from '@/lib/appwrite';
import { AuthService } from '@/services/authService';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export interface OAuthProvidersBarProps {
  onError: (message: string) => void;
}

export const OAuthProvidersBar: React.FC<OAuthProvidersBarProps> = ({ onError }) => {
  const handleProviderClick = (provider: 'google' | 'apple') => {
    const res = AuthService.loginWithOAuth(provider);
    if (!res.ok && res.error) {
      onError(res.error);
    }
  };

  return (
    <div className="space-y-2.5">
      <div className="relative flex items-center justify-center">
        <div className="absolute inset-0 flex items-center" aria-hidden="true">
          <div className="w-full border-t border-slate-800" />
        </div>
        <span className="relative bg-slate-950 px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
          Or continue with
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={!AUTH_PROVIDERS.google}
          onClick={() => handleProviderClick('google')}
          className="h-11 justify-between px-3.5 border-slate-800 bg-slate-900/70 text-slate-200 disabled:opacity-60"
        >
          <span className="inline-flex items-center gap-2 text-xs font-semibold">
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="currentColor"
                d="M21.35 11.1h-9.18v2.98h5.27c-.23 1.47-1.69 4.3-5.27 4.3-3.17 0-5.76-2.63-5.76-5.88s2.59-5.88 5.76-5.88c1.81 0 3.02.77 3.71 1.43l2.53-2.45C16.79 4.09 14.69 3.2 12.17 3.2 7.12 3.2 3.03 7.31 3.03 12.5s4.09 9.3 9.14 9.3c5.27 0 8.77-3.71 8.77-8.94 0-.6-.06-1.06-.15-1.76z"
              />
            </svg>
            Google
          </span>
          {!AUTH_PROVIDERS.google && (
            <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
              Soon
            </Badge>
          )}
        </Button>

        <Button
          type="button"
          variant="outline"
          disabled={!AUTH_PROVIDERS.apple}
          onClick={() => handleProviderClick('apple')}
          className="h-11 justify-between px-3.5 border-slate-800 bg-slate-900/70 text-slate-200 disabled:opacity-60"
        >
          <span className="inline-flex items-center gap-2 text-xs font-semibold">
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="currentColor"
                d="M16.37 12.65c-.02-2.02 1.65-2.99 1.72-3.04-.94-1.37-2.4-1.56-2.92-1.58-1.24-.13-2.42.73-3.05.73-.63 0-1.6-.71-2.63-.69-1.35.02-2.6.79-3.3 2-.14.24-1.26 2.2-.36 5.26.44 1.5 1.15 3.14 2.13 4.55.69 1 1.51 2.12 2.59 2.08 1.04-.04 1.43-.67 2.69-.67 1.25 0 1.61.67 2.71.65 1.12-.02 1.83-1.01 2.51-2.02.79-1.16 1.12-2.29 1.14-2.35-.03-.01-2.21-.85-2.23-3.92zM14.37 6.38c.57-.69.95-1.65.85-2.61-.82.03-1.81.55-2.4 1.24-.53.61-.99 1.59-.87 2.53.91.07 1.85-.47 2.42-1.16z"
              />
            </svg>
            Apple
          </span>
          {!AUTH_PROVIDERS.apple && (
            <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
              Soon
            </Badge>
          )}
        </Button>
      </div>
    </div>
  );
};
