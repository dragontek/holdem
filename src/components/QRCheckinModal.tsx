import React, { useState } from 'react';
import { QrCode, X, CheckCircle2, Sparkles, UserCheck } from 'lucide-react';

interface QRCheckinModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QRCheckinModal: React.FC<QRCheckinModalProps> = ({ isOpen, onClose }) => {
  const [pinCode, setPinCode] = useState<string>('');
  const [isCheckedIn, setIsCheckedIn] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleCheckin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinCode.length >= 4) {
      setIsCheckedIn(true);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="glass-panel rounded-3xl p-6 border border-slate-800 max-w-md w-full relative space-y-5 gold-glow">
        
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-white p-1"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center space-y-1">
          <div className="w-12 h-12 mx-auto rounded-2xl felt-gradient border border-emerald-500/40 flex items-center justify-center text-amber-400 mb-2 felt-glow">
            <QrCode className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-black text-white">Express Venue Check-in</h3>
          <p className="text-xs text-slate-400">Scan venue QR code or enter your 4-digit Player PIN</p>
        </div>

        {!isCheckedIn ? (
          <form onSubmit={handleCheckin} className="space-y-4">
            
            {/* Simulated QR Viewfinder */}
            <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800 text-center relative overflow-hidden group">
              <div className="w-32 h-32 mx-auto border-2 border-dashed border-amber-500/60 rounded-xl flex items-center justify-center relative">
                <QrCode className="w-20 h-20 text-amber-400/80 group-hover:scale-105 transition-transform" />
                <div className="absolute inset-x-0 top-0 h-1 bg-amber-500 shadow-[0_0_15px_#f59e0b] animate-pulse" />
              </div>
              <p className="text-[11px] text-slate-400 mt-3">Position QR code inside frame</p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 block">Or Enter Player PIN</label>
              <input
                type="password"
                maxLength={4}
                placeholder="4-Digit PIN (e.g. 2452)"
                value={pinCode}
                onChange={(e) => setPinCode(e.target.value)}
                className="w-full bg-slate-950 text-center text-xl font-mono tracking-widest text-amber-400 placeholder-slate-600 py-3 rounded-xl border border-slate-800 focus:outline-none focus:border-amber-500"
              />
            </div>

            <button
              type="submit"
              disabled={pinCode.length < 4}
              className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 text-sm font-black transition-all shadow-lg"
            >
              Check Into Tonight's Tournament
            </button>
          </form>
        ) : (
          <div className="text-center py-6 space-y-3">
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h4 className="text-lg font-bold text-white">Check-in Confirmed!</h4>
            <p className="text-xs text-slate-300">You are registered for tonight's game at <span className="text-amber-400 font-bold">Single Barrel</span>. Table & seat assignment will appear on TV view shortly.</p>

            <button
              onClick={() => {
                setIsCheckedIn(false);
                setPinCode('');
                onClose();
              }}
              className="mt-4 px-6 py-2.5 rounded-xl bg-slate-800 text-white text-xs font-bold hover:bg-slate-700"
            >
              Done
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
