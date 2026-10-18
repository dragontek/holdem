import React, { useState } from 'react';
import type { Venue, BlindLevel } from '@/types/holdem';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  Images
} from 'lucide-react';
import { GuideGalleryTab } from './GuideGalleryTab';

interface LeagueGuideViewProps {
  venues: Venue[];
  seasonName: string;
  initialTab?: 'rules' | 'scoring' | 'blinds' | 'venues' | 'gallery';
}

type GuideTab = 'rules' | 'scoring' | 'blinds' | 'venues' | 'gallery';

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

export const LeagueGuideView: React.FC<LeagueGuideViewProps> = ({ 
  venues, 
  seasonName,
  initialTab = 'rules' 
}) => {
  const [activeTab, setActiveTab] = useState<GuideTab>(initialTab);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6 pb-24 md:pb-12 animate-fadeIn">
      {/* Header & Unified Tab Bar */}
      <div className="bg-slate-900/60 rounded-2xl p-6 border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">LEAGUE GUIDE &amp; INFO</Badge>
                <span className="text-xs text-slate-400 font-semibold">{seasonName}</span>
              </div>
              <h1 className="text-xl font-bold text-white mt-0.5">Rules, Scoring &amp; Tournament Resources</h1>
            </div>
          </div>
        </div>

        {/* Tab Navigator */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 p-1 bg-slate-950/80 rounded-xl border border-slate-800/80">
          {[
            { id: 'rules' as const, label: 'Rules & Etiquette', icon: ShieldCheck },
            { id: 'scoring' as const, label: 'Points Engine', icon: Award },
            { id: 'blinds' as const, label: 'Blind Schedule', icon: Clock },
            { id: 'venues' as const, label: 'Host Venues', icon: MapPin },
            { id: 'gallery' as const, label: 'Photo Gallery', icon: Images },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-3.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab 1: Rules & Etiquette */}
      {activeTab === 'rules' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldCheck className="w-4 h-4 text-amber-400" /> Official TDA Standard Rules
              </CardTitle>
              <CardDescription>Rules governing live table operations and showdowns</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-xs text-slate-300">
              <div className="p-3 rounded-lg bg-slate-950/50 border border-slate-800/80 space-y-1">
                <span className="font-bold text-amber-400 uppercase tracking-wider text-[11px]">Verbal Declarations</span>
                <p className="text-slate-400">Verbal declarations in turn are binding. Any verbal bet takes precedence over chip movements.</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-950/50 border border-slate-800/80 space-y-1">
                <span className="font-bold text-amber-400 uppercase tracking-wider text-[11px]">No String Bets</span>
                <p className="text-slate-400">Chips must be released into the pot in a single forward motion unless preceded by a verbal raise declaration.</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-950/50 border border-slate-800/80 space-y-1">
                <span className="font-bold text-amber-400 uppercase tracking-wider text-[11px]">Cards Speak at Showdown</span>
                <p className="text-slate-400">Cards speak for themselves. The dealer and players identify winning hands according to standard poker ranks.</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <HelpCircle className="w-4 h-4 text-emerald-400" /> League Etiquette &amp; Sportsmanship
              </CardTitle>
              <CardDescription>Standards for player conduct, fair play, and hospitality</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-xs text-slate-300">
              <div className="p-3 rounded-lg bg-slate-950/50 border border-slate-800/80 space-y-1">
                <span className="font-bold text-emerald-400 uppercase tracking-wider text-[11px]">No Table Talk in Multi-Way Pots</span>
                <p className="text-slate-400">Players may not discuss folded hands or advise other players during an active hand.</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-950/50 border border-slate-800/80 space-y-1">
                <span className="font-bold text-emerald-400 uppercase tracking-wider text-[11px]">Electronic Devices</span>
                <p className="text-slate-400">Phones are permitted at the table, but players must step back from the felt while taking calls.</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-950/50 border border-slate-800/80 space-y-1">
                <span className="font-bold text-emerald-400 uppercase tracking-wider text-[11px]">Support Host Venues</span>
                <p className="text-slate-400">Please support host venue bar &amp; food staff. Tip your tournament directors and volunteer dealers!</p>
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
                <CardTitle className="text-sm text-amber-400 flex items-center gap-2">
                  <Award className="w-4 h-4" /> Attendance Points
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">+500 pts</div>
                <p className="text-xs text-slate-400 mt-1">Awarded to every registered player checked in before Level 1 completes.</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-rose-400 flex items-center gap-2">
                  <Flame className="w-4 h-4" /> Knockout Bounties
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">+200 pts / KO</div>
                <p className="text-xs text-slate-400 mt-1">Earned immediately when you eliminate an opponent from the tournament flight.</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-emerald-400 flex items-center gap-2">
                  <Flame className="w-4 h-4" /> Hot Hand Jackpot
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">Full Pool Cash</div>
                <p className="text-xs text-slate-400 mt-1">Awarded to the player tabling the designated Hot Hand (e.g. Quad 6s) at showdown.</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Final Table Position Scale</CardTitle>
              <CardDescription>Championship points awarded based on final table finish placement</CardDescription>
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
                  <div key={idx} className={`p-3 rounded-lg border ${item.color}`}>
                    <div className="text-xs font-semibold">{item.pos}</div>
                    <div className="text-sm font-bold mt-1">{item.pts}</div>
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
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="w-4 h-4 text-amber-400" /> Standard Deepstack Tournament Blinds
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
                      <td className="py-2.5 px-3 font-semibold">{lvl.level}</td>
                      <td className="py-2.5 px-3">{lvl.smallBlind.toLocaleString()}</td>
                      <td className="py-2.5 px-3">{lvl.bigBlind.toLocaleString()}</td>
                      <td className="py-2.5 px-3">{lvl.ante ? lvl.ante.toLocaleString() : '—'}</td>
                      <td className="py-2.5 px-3">{lvl.durationMinutes} min</td>
                      <td className="py-2.5 px-3 text-slate-400">{lvl.breakTitle || 'Standard level'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tab 4: Host Venues Directory */}
      {activeTab === 'venues' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {venues.map((venue) => (
            <Card key={venue.$id} className="hover:border-slate-700 transition-all">
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
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
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 font-semibold transition-all"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Call: {venue.phone}</span>
                  </a>
                  {venue.website && (
                    <a
                      href={venue.website}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 text-slate-300 border border-slate-800 hover:text-white transition-all font-medium"
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

      {/* Tab 5: Photo Gallery (Modular Subcomponent) */}
      {activeTab === 'gallery' && (
        <GuideGalleryTab />
      )}
    </div>
  );
};
