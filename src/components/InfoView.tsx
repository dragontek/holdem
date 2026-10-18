import React, { useState } from 'react';
import type { Venue, BlindLevel } from '../types/holdem';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { 
  BookOpen, 
  Award, 
  Clock, 
  MapPin, 
  Phone, 
  ExternalLink, 
  ShieldCheck, 
  Flame, 
  HelpCircle,
  FileText
} from 'lucide-react';

interface InfoViewProps {
  venues: Venue[];
  seasonName: string;
}

type InfoTab = 'rules' | 'scoring' | 'blinds' | 'contacts';

export const InfoView: React.FC<InfoViewProps> = ({ venues, seasonName }) => {
  const [activeTab, setActiveTab] = useState<InfoTab>('rules');

  const standardBlinds: BlindLevel[] = [
    { level: 1, smallBlind: 100, bigBlind: 100, ante: 0, durationMinutes: 15, isBreak: false },
    { level: 2, smallBlind: 100, bigBlind: 200, ante: 200, durationMinutes: 15, isBreak: false },
    { level: 3, smallBlind: 200, bigBlind: 400, ante: 400, durationMinutes: 15, isBreak: false },
    { level: 4, smallBlind: 300, bigBlind: 600, ante: 600, durationMinutes: 15, isBreak: false },
    { level: 5, smallBlind: 400, bigBlind: 800, ante: 800, durationMinutes: 15, isBreak: false },
    { level: 6, smallBlind: 500, bigBlind: 1000, ante: 1000, durationMinutes: 15, isBreak: true, breakTitle: '10-Min Chip Race & Color Up' },
    { level: 7, smallBlind: 1000, bigBlind: 1500, ante: 1500, durationMinutes: 15, isBreak: false },
    { level: 8, smallBlind: 1000, bigBlind: 2000, ante: 2000, durationMinutes: 15, isBreak: false },
    { level: 9, smallBlind: 1500, bigBlind: 3000, ante: 3000, durationMinutes: 15, isBreak: false },
    { level: 10, smallBlind: 2000, bigBlind: 4000, ante: 4000, durationMinutes: 15, isBreak: false },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6 pb-24 md:pb-12 animate-fadeIn">
      {/* Header Panel */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl felt-gradient border border-emerald-500/40 flex items-center justify-center text-amber-400 shrink-0 shadow-lg felt-glow">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">LEAGUE INFO CENTER</Badge>
                <span className="text-xs text-slate-400 font-semibold">{seasonName}</span>
              </div>
              <h1 className="text-2xl font-black text-white mt-0.5">Rules, Scoring &amp; Tournament Structure</h1>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 p-1 bg-slate-950 rounded-xl border border-slate-800 mt-2">
          <button
            onClick={() => setActiveTab('rules')}
            className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'rules' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>League Rules</span>
          </button>
          <button
            onClick={() => setActiveTab('scoring')}
            className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'scoring' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>Points &amp; Scoring</span>
          </button>
          <button
            onClick={() => setActiveTab('blinds')}
            className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'blinds' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Blind Structure</span>
          </button>
          <button
            onClick={() => setActiveTab('contacts')}
            className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'contacts' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Phone className="w-3.5 h-3.5" />
            <span>Venues &amp; Contacts</span>
          </button>
        </div>
      </div>

      {/* Tab 1: Rules & Etiquette */}
      {activeTab === 'rules' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-amber-400" /> Official TDA Standard Rules
              </CardTitle>
              <CardDescription>Rules governing live table operations and hand resolutions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-300">
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                <span className="font-bold text-white text-xs uppercase tracking-wider text-amber-400">Verbal Declarations</span>
                <p className="text-xs text-slate-400">Verbal declarations in turn are binding. Any verbal bet takes precedence over chip movements.</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                <span className="font-bold text-white text-xs uppercase tracking-wider text-amber-400">No String Bets</span>
                <p className="text-xs text-slate-400">Chips must be released into the pot in a single forward motion unless preceded by a verbal raise declaration.</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                <span className="font-bold text-white text-xs uppercase tracking-wider text-amber-400">Cards Speak at Showdown</span>
                <p className="text-xs text-slate-400">Cards speak for themselves. The dealer and players must properly identify the winning hand according to standard poker ranks.</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-emerald-400" /> League Etiquette &amp; Integrity
              </CardTitle>
              <CardDescription>Standards for player conduct, fairness, and sportsmanship</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-300">
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                <span className="font-bold text-white text-xs uppercase tracking-wider text-emerald-400">No Table Talk in Multi-Way Pots</span>
                <p className="text-xs text-slate-400">Players may not discuss folded hands or advise other players during an active hand.</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                <span className="font-bold text-white text-xs uppercase tracking-wider text-emerald-400">Electronic Devices</span>
                <p className="text-xs text-slate-400">Phones and headphones are permitted, but players must step back from the felt while taking phone calls.</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                <span className="font-bold text-white text-xs uppercase tracking-wider text-emerald-400">Respect Host Venues &amp; Staff</span>
                <p className="text-xs text-slate-400">Please support host venue bar &amp; food staff. Tip your tournament directors and volunteer dealers!</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab 2: Scoring & Points */}
      {activeTab === 'scoring' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-amber-400 flex items-center gap-2">
                  <Award className="w-4 h-4" /> Attendance Points
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-2xl font-black text-white">+500 pts</div>
                <p className="text-xs text-slate-400">Awarded to every registered player who checks in and takes a seat before Level 1 completes.</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-rose-400 flex items-center gap-2">
                  <Flame className="w-4 h-4" /> Knockout Bounties
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-2xl font-black text-white">+200 pts / KO</div>
                <p className="text-xs text-slate-400">Earned immediately when you eliminate an opponent from the tournament flight.</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-emerald-400 flex items-center gap-2">
                  <Flame className="w-4 h-4" /> Hot Hand Jackpot
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-2xl font-black text-white">Full Pool Cash</div>
                <p className="text-xs text-slate-400">Awarded to the player who tables the designated Hot Hand (e.g. Quad 6s) during showdown.</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Final Table Finishing Position Scale</CardTitle>
              <CardDescription>Points awarded based on final table position at tournament conclusion</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2 text-center">
                {[
                  { pos: '1st', pts: '2,500', color: 'text-amber-400 border-amber-500/40 bg-amber-500/10' },
                  { pos: '2nd', pts: '1,800', color: 'text-slate-200 border-slate-600 bg-slate-800' },
                  { pos: '3rd', pts: '1,400', color: 'text-amber-600 border-amber-700 bg-amber-950/40' },
                  { pos: '4th', pts: '1,100', color: 'text-slate-300 border-slate-800 bg-slate-900/60' },
                  { pos: '5th', pts: '850', color: 'text-slate-300 border-slate-800 bg-slate-900/60' },
                  { pos: '6th', pts: '650', color: 'text-slate-300 border-slate-800 bg-slate-900/60' },
                  { pos: '7th', pts: '500', color: 'text-slate-300 border-slate-800 bg-slate-900/60' },
                  { pos: '8th-9th', pts: '350', color: 'text-slate-300 border-slate-800 bg-slate-900/60' },
                ].map((item, idx) => (
                  <div key={idx} className={`p-3 rounded-xl border ${item.color}`}>
                    <div className="text-xs font-bold">{item.pos}</div>
                    <div className="text-sm font-black mt-1">{item.pts}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab 3: Blind Structure */}
      {activeTab === 'blinds' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-400" /> Standard Deepstack Tournament Blinds
            </CardTitle>
            <CardDescription>20,000 Starting Chips • 15-Minute Blind Levels • Big Blind Ante</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                    <th className="py-2.5 px-3">Level</th>
                    <th className="py-2.5 px-3">Small Blind</th>
                    <th className="py-2.5 px-3">Big Blind</th>
                    <th className="py-2.5 px-3">Ante</th>
                    <th className="py-2.5 px-3">Duration</th>
                    <th className="py-2.5 px-3">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {standardBlinds.map((lvl) => (
                    <tr key={lvl.level} className={lvl.isBreak ? 'bg-amber-500/10 font-bold text-amber-300' : 'hover:bg-slate-900/50'}>
                      <td className="py-2.5 px-3 font-bold">{lvl.level}</td>
                      <td className="py-2.5 px-3">{lvl.smallBlind.toLocaleString()}</td>
                      <td className="py-2.5 px-3">{lvl.bigBlind.toLocaleString()}</td>
                      <td className="py-2.5 px-3">{lvl.ante ? lvl.ante.toLocaleString() : '—'}</td>
                      <td className="py-2.5 px-3">{lvl.durationMinutes} min</td>
                      <td className="py-2.5 px-3 text-slate-400">{lvl.breakTitle || 'Standard play'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tab 4: Host Venues & Tap-to-Call Directory */}
      {activeTab === 'contacts' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {venues.map((venue) => (
            <Card key={venue.$id} className="hover:border-slate-700 transition-all">
              <CardHeader>
                <CardTitle className="text-lg flex items-center justify-between">
                  <span>{venue.name}</span>
                  <Badge variant="indigo">Host Partner</Badge>
                </CardTitle>
                <CardDescription className="flex items-center gap-1.5 pt-1">
                  <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>{venue.address}</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
                  <a
                    href={`tel:${venue.phone}`}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 font-bold transition-all"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Call: {venue.phone}</span>
                  </a>
                  {venue.website && (
                    <a
                      href={venue.website}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-900 text-slate-300 border border-slate-800 hover:text-white transition-all font-semibold"
                    >
                      <span>Website</span>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
