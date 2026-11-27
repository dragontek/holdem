import React, { useState } from 'react';
import { QrCode, CheckCircle2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface QRCheckinModalProps {
  isOpen: boolean;
  onClose: () => void;
  venueName?: string;
}

export const QRCheckinModal: React.FC<QRCheckinModalProps> = ({
  isOpen,
  onClose,
  venueName,
}) => {
  const [pinCode, setPinCode] = useState<string>('');
  const [isCheckedIn, setIsCheckedIn] = useState<boolean>(false);

  const handleClose = () => {
    setIsCheckedIn(false);
    setPinCode('');
    onClose();
  };

  const handleCheckin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinCode.length >= 4) {
      setIsCheckedIn(true);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-md max-h-[92dvh] overflow-y-auto bg-slate-950 border-slate-800 p-5 sm:p-6">
        <DialogHeader className="text-center sm:text-center space-y-2">
          <div className="w-12 h-12 mx-auto rounded-2xl felt-gradient border border-emerald-500/40 flex items-center justify-center text-amber-400">
            <QrCode className="w-6 h-6" />
          </div>
          <DialogTitle className="text-xl font-black text-white">
            Express Venue Check-in
          </DialogTitle>
          <DialogDescription>
            Scan venue QR code or enter your 4-digit Player PIN
          </DialogDescription>
        </DialogHeader>

        {!isCheckedIn ? (
          <form onSubmit={handleCheckin} className="space-y-4">
            {/* Simulated QR Viewfinder */}
            <div className="bg-slate-900 rounded-2xl p-5 border border-slate-800 text-center relative overflow-hidden group">
              <div className="w-28 h-28 sm:w-32 sm:h-32 mx-auto border-2 border-dashed border-amber-500/60 rounded-xl flex items-center justify-center relative">
                <QrCode className="w-16 h-16 sm:w-20 sm:h-20 text-amber-400/80 group-hover:scale-105 transition-transform" />
                <div className="absolute inset-x-0 top-0 h-1 bg-amber-500 animate-pulse" />
              </div>
              <p className="text-[11px] text-slate-400 mt-3">Position QR code inside frame</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="checkin-pin" className="text-xs font-semibold text-slate-300 block">
                Or Enter Player PIN
              </Label>
              <Input
                id="checkin-pin"
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                placeholder="4-Digit PIN (e.g. 2452)"
                value={pinCode}
                onChange={(e) => setPinCode(e.target.value)}
                className="h-12 bg-slate-900 text-center text-xl font-mono tracking-widest text-amber-400 placeholder:text-slate-600"
              />
            </div>

            <Button
              type="submit"
              variant="default"
              disabled={pinCode.length < 4}
              className="w-full h-12 text-sm font-black"
            >
              Check Into Tonight&apos;s Tournament
            </Button>
          </form>
        ) : (
          <div className="text-center py-4 space-y-3">
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h4 className="text-lg font-bold text-white">Check-in Confirmed!</h4>
            <p className="text-xs text-slate-300">
              You are registered for tonight&apos;s game
              {venueName ? (
                <>
                  {' '}at <span className="text-amber-400 font-bold">{venueName}</span>
                </>
              ) : null}
              . Table &amp; seat assignment will appear on TV view shortly.
            </p>

            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="mt-2 w-full sm:w-auto h-11 px-6 text-xs font-bold"
            >
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
