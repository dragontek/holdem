import React, { useState } from 'react';
import type { Venue } from '../types/holdem';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import {
  formatBlindInThousands,
  HAND_BONUS_CODE_LIST,
  HAND_BONUS_DEFINITIONS,
  KO_CODE_LIST,
  KO_DEFINITIONS,
  NO_GAME_SHOW_UP_POINTS,
  OFFICIAL_BLIND_SCHEDULE,
  PLACEMENT_POINTS,
  SHOW_UP_POINTS,
  SURVIVOR_POINTS,
} from '@/lib/scoring';
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
  Star,
  Sun,
  Ban
} from 'lucide-react';

interface InfoViewProps {
  venues: Venue[];
  seasonName: string;
}

type InfoTab = 'rules' | 'scoring' | 'blinds' | 'contacts';

export const InfoView: React.FC<InfoViewProps> = ({ venues, seasonName }) => {
  const [activeTab, setActiveTab] = useState<InfoTab>('rules');

  const standardBlinds = OFFICIAL_BLIND_SCHEDULE;

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

      {/* Tab 2: Jack Ten Poker Official Scoring & Points */}
      {activeTab === 'scoring' && (
        <div className="space-y-4">
          {/* A. Attendance & Survival */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-amber-400 flex items-center gap-2">
                  <Award className="w-4 h-4" /> Show Up Points
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-2xl font-black text-white">+{SHOW_UP_POINTS.toLocaleString()} base</div>
                <p className="text-xs text-slate-400">
                  Awarded automatically to any non-mucked player seated by the <strong className="text-slate-200">1:15 mark</strong> (after Break 1 and the first blind of Hour 2).
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-emerald-400 flex items-center gap-2">
                  <Star className="w-4 h-4" /> Survivor Points (☆)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-2xl font-black text-white">+{SURVIVOR_POINTS.toLocaleString()} base each</div>
                <p className="text-xs text-slate-400">
                  Marked with <span className="font-mono text-amber-300">☆</span> in the HD bonus row each time a player goes all-in and survives without busting.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-indigo-400 flex items-center gap-2">
                  <Ban className="w-4 h-4" /> No-Game Show Up
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-2xl font-black text-white">+{NO_GAME_SHOW_UP_POINTS.toLocaleString()} flat</div>
                <p className="text-xs text-slate-400">
                  Awarded when a scheduled session does not run due to low turnout (DG carryover preserved).
                </p>
              </CardContent>
            </Card>
          </div>

          {/* B. Final Table Placements (Top 5) */}
          <Card>
            <CardHeader>
              <CardTitle>Final Table Placements (Top 5 Base Points)</CardTitle>
              <CardDescription>Added to Base Points before session and Day Game multipliers apply</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
                {[
                  { pos: '1st Place', pts: PLACEMENT_POINTS[1], color: 'text-amber-400 border-amber-500/40 bg-amber-500/10' },
                  { pos: '2nd Place', pts: PLACEMENT_POINTS[2], color: 'text-slate-200 border-slate-600 bg-slate-800/70' },
                  { pos: '3rd Place', pts: PLACEMENT_POINTS[3], color: 'text-amber-500 border-amber-700/60 bg-amber-950/30' },
                  { pos: '4th Place', pts: PLACEMENT_POINTS[4], color: 'text-slate-300 border-slate-800 bg-slate-900/60' },
                  { pos: '5th Place', pts: PLACEMENT_POINTS[5], color: 'text-slate-300 border-slate-800 bg-slate-900/60' },
                ].map((item) => (
                  <div key={item.pos} className={`p-3.5 rounded-xl border ${item.color}`}>
                    <div className="text-xs font-bold">{item.pos}</div>
                    <div className="text-lg font-mono font-black mt-1">
                      +{item.pts.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* C & D. Knockouts & Hand Bonuses */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Flame className="w-4 h-4 text-rose-400" /> Knockouts (KO Row)
                </CardTitle>
                <CardDescription>Cross-checked against &quot;Knocked out by #&quot; seat audit records</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {KO_CODE_LIST.map((code) => {
                  const def = KO_DEFINITIONS[code];
                  return (
                    <div
                      key={code}
                      className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800"
                    >
                      <div className="flex items-center gap-2.5">
                        <Badge variant={code === 'R' ? 'purple' : 'destructive'} className="font-mono">
                          {def.symbol}
                        </Badge>
                        <div>
                          <div className="text-xs font-bold text-white">{def.label}</div>
                          <div className="text-[11px] text-slate-400">{def.description}</div>
                        </div>
                      </div>
                      <span className="text-sm font-mono font-black text-amber-400">
                        +{def.points.toLocaleString()}
                      </span>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Award className="w-4 h-4 text-emerald-400" /> Hand Bonuses (HD Row)
                </CardTitle>
                <CardDescription>Recorded per qualifying hand won during the session</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {HAND_BONUS_CODE_LIST.map((code) => {
                  const def = HAND_BONUS_DEFINITIONS[code];
                  return (
                    <div
                      key={code}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-800"
                    >
                      <div className="flex items-center gap-2.5">
                        <Badge variant="success" className="font-mono min-w-[2rem] justify-center">
                          {def.symbol}
                        </Badge>
                        <div>
                          <div className="text-xs font-bold text-white">{def.label}</div>
                          <div className="text-[11px] text-slate-400">{def.description}</div>
                        </div>
                      </div>
                      <span className="text-sm font-mono font-black text-emerald-400">
                        +{def.points.toLocaleString()}
                      </span>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>

          {/* Multipliers, DG Carryover & Muck Override */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Sun className="w-4 h-4 text-indigo-400" /> Session Multipliers, Day Game (DG) Stacking &amp; Muck Rule
              </CardTitle>
              <CardDescription>
                Final Score = Base Points × (Session Multiplier × DG 2x Carryover). Playing a Day Game grants a 2x carryover for your next game.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                {[
                  { session: 'Single Points (1x)', withoutDg: '1x Total', withDg: '2x Total' },
                  { session: 'Double Points (2x)', withoutDg: '2x Total', withDg: '4x Total' },
                  { session: 'Triple Points (3x)', withoutDg: '3x Total', withDg: '6x Total' },
                ].map((row) => (
                  <div
                    key={row.session}
                    className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1"
                  >
                    <div className="font-bold text-white">{row.session}</div>
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Standard:</span>
                      <span className="font-mono font-semibold text-slate-200">{row.withoutDg}</span>
                    </div>
                    <div className="flex items-center justify-between text-indigo-300">
                      <span>With DG (2x):</span>
                      <span className="font-mono font-black text-amber-400">{row.withDg}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-3 rounded-xl bg-rose-950/20 border border-rose-900/50 text-xs text-slate-300">
                <strong className="text-rose-300">Muck (M) Forfeiture:</strong> Players marked{' '}
                <span className="font-mono text-rose-300">M</span> / <span className="font-mono text-rose-300">Muck</span>{' '}
                forfeit all points for that session (<strong className="text-white">0 pts</strong>) and do not earn a new DG
                carryover, while their elimination record is preserved so the eliminating player retains their{' '}
                <span className="font-mono text-amber-300">K</span> / <span className="font-mono text-purple-300">R</span> bonus.
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab 3: Blind Structure */}
      {activeTab === 'blinds' && (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-400" /> Official Jack Ten Poker Blind Schedule (In Thousands)
              </CardTitle>
              <Badge variant="indigo">Manual Time Overrides Supported</Badge>
            </div>
            <CardDescription>
              Hour 1: 20-min blinds + 10m break • Hour 2: 15-min blinds + 10m break • Hour 3: 10-min blinds
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                <div className="font-bold text-amber-400">1st Hour • 20 Min Blinds</div>
                <div className="text-slate-300 font-mono mt-1">1/2 • 2/4 • 4/8 <span className="text-slate-500">(+10m break)</span></div>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                <div className="font-bold text-emerald-400">2nd Hour • 15 Min Blinds</div>
                <div className="text-slate-300 font-mono mt-1">5/10 • 10/20 • 20/40 • 40/80 <span className="text-slate-500">(+10m break)</span></div>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                <div className="font-bold text-rose-400">3rd Hour • 10 Min Blinds</div>
                <div className="text-slate-300 font-mono mt-1">50/100 • 100/200 • 200/400 • 400/800</div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                    <th className="py-2.5 px-3">Stage</th>
                    <th className="py-2.5 px-3">In Thousands</th>
                    <th className="py-2.5 px-3">Small Blind</th>
                    <th className="py-2.5 px-3">Big Blind</th>
                    <th className="py-2.5 px-3">Duration</th>
                    <th className="py-2.5 px-3">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {(() => {
                    let playLevel = 0;
                    return standardBlinds.map((lvl) => {
                      if (!lvl.isBreak) playLevel += 1;
                      const hourLabel =
                        lvl.durationMinutes === 20
                          ? '1st Hour'
                          : lvl.durationMinutes === 15
                          ? '2nd Hour'
                          : lvl.isBreak
                          ? 'Break'
                          : '3rd Hour';
                      return (
                        <tr
                          key={lvl.level}
                          className={
                            lvl.isBreak
                              ? 'bg-amber-500/10 font-bold text-amber-300'
                              : 'hover:bg-slate-900/50'
                          }
                        >
                          <td className="py-2.5 px-3 font-bold">
                            {lvl.isBreak ? 'BREAK' : `Level ${playLevel}`}
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-amber-300">
                            {lvl.isBreak
                              ? '—'
                              : `${formatBlindInThousands(lvl.smallBlind)} / ${formatBlindInThousands(lvl.bigBlind)}`}
                          </td>
                          <td className="py-2.5 px-3 font-mono">
                            {lvl.isBreak ? '—' : lvl.smallBlind.toLocaleString()}
                          </td>
                          <td className="py-2.5 px-3 font-mono">
                            {lvl.isBreak ? '—' : lvl.bigBlind.toLocaleString()}
                          </td>
                          <td className="py-2.5 px-3 font-semibold">{lvl.durationMinutes} min</td>
                          <td className="py-2.5 px-3 text-slate-400">
                            {lvl.breakTitle || `${hourLabel} • Manually overridable`}
                          </td>
                        </tr>
                      );
                    });
                  })()}
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
