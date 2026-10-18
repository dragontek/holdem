import React, { useState } from 'react';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Images, Trophy, Sparkles, MapPin, Calendar, X } from 'lucide-react';

interface GalleryItem {
  id: string;
  title: string;
  category: 'champions' | 'events' | 'venues';
  imageUrl: string;
  date: string;
  venueName: string;
  description: string;
}

const mockGalleryItems: GalleryItem[] = [
  {
    id: 'g1',
    title: '2026 Crawl 2 Championship Ring Presentation',
    category: 'champions',
    imageUrl: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&q=80&w=800',
    date: 'June 5, 2026',
    venueName: 'Single Barrel',
    description: 'Sarah Connor taking down the Season Finale championship title and custom gold league ring.',
  },
  {
    id: 'g2',
    title: 'Sunday Deepstack Final Table Showdown',
    category: 'events',
    imageUrl: 'https://images.unsplash.com/photo-1511193311914-0346f16efe90?auto=format&fit=crop&q=80&w=800',
    date: 'August 16, 2026',
    venueName: 'Single Barrel',
    description: 'Heads-up action with over 450,000 in chips in play for the triple points trophy.',
  },
  {
    id: 'g3',
    title: 'Single Barrel Poker Lounge & Bar',
    category: 'venues',
    imageUrl: 'https://images.unsplash.com/photo-1543007630-9710e4a00a20?auto=format&fit=crop&q=80&w=800',
    date: 'August 2026',
    venueName: 'Single Barrel',
    description: 'Premier tournament atmosphere with custom felt tables and multi-monitor TV displays.',
  },
  {
    id: 'g4',
    title: 'Quad 6s High Hand Jackpot Winner',
    category: 'champions',
    imageUrl: 'https://images.unsplash.com/photo-1511193311914-0346f16efe90?auto=format&fit=crop&q=80&w=800',
    date: 'July 28, 2026',
    venueName: 'Murray Street Darts',
    description: 'Johnny Chan flopping quad sixes to scoop the progressive Hot Hand cash jackpot.',
  },
  {
    id: 'g5',
    title: 'Murray Street Dart & Poker Arena',
    category: 'venues',
    imageUrl: 'https://images.unsplash.com/photo-1572116469696-31de0f17cc34?auto=format&fit=crop&q=80&w=800',
    date: 'August 2026',
    venueName: 'Murray Street Darts',
    description: 'Electric Friday and Sunday evening crowds competing for seasonal leaderboard seedings.',
  },
  {
    id: 'g6',
    title: 'Saturday Triple Point Knockout Flight',
    category: 'events',
    imageUrl: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&q=80&w=800',
    date: 'August 22, 2026',
    venueName: 'Single Barrel',
    description: '32-player field battling through 8 blind levels with 48 total entries.',
  },
];

export const GalleryView: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'champions' | 'events' | 'venues'>('all');
  const [activePhoto, setActivePhoto] = useState<GalleryItem | null>(null);

  const filteredItems = selectedCategory === 'all' 
    ? mockGalleryItems 
    : mockGalleryItems.filter(item => item.category === selectedCategory);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6 pb-24 md:pb-12 animate-fadeIn">
      {/* Header */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl felt-gradient border border-emerald-500/40 flex items-center justify-center text-amber-400 shrink-0 shadow-lg felt-glow">
              <Images className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">TOURNAMENT MOMENTS</Badge>
                <span className="text-xs text-slate-400 font-semibold">{mockGalleryItems.length} Photographs</span>
              </div>
              <h1 className="text-2xl font-black text-white mt-0.5">League Gallery &amp; Celebrations</h1>
            </div>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {[
            { id: 'all', label: 'All Moments' },
            { id: 'champions', label: 'Champions & Rings' },
            { id: 'events', label: 'Main Events' },
            { id: 'venues', label: 'Host Venues' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id as any)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                selectedCategory === cat.id
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Moments */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredItems.map((item) => (
          <Card
            key={item.id}
            onClick={() => setActivePhoto(item)}
            className="group cursor-pointer overflow-hidden border-slate-800 hover:border-amber-500/50 transition-all bg-slate-900/40"
          >
            <div className="relative aspect-[16/10] overflow-hidden bg-slate-950">
              <img
                src={item.imageUrl}
                alt={item.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90 group-hover:opacity-100"
              />
              <div className="absolute top-2.5 left-2.5">
                <Badge variant={item.category === 'champions' ? 'default' : 'secondary'}>
                  {item.category.toUpperCase()}
                </Badge>
              </div>
            </div>
            <CardContent className="p-4 space-y-1.5">
              <h3 className="font-bold text-white text-sm group-hover:text-amber-400 transition-colors line-clamp-1">
                {item.title}
              </h3>
              <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                {item.description}
              </p>
              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-800/80">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-amber-500/70" /> {item.venueName}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-slate-500" /> {item.date}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Photo Detail Modal */}
      {activePhoto && (
        <div 
          onClick={() => setActivePhoto(null)}
          className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="glass-panel max-w-2xl w-full rounded-2xl border border-slate-800 overflow-hidden shadow-2xl space-y-4"
          >
            <div className="relative aspect-[16/10] bg-slate-950">
              <img src={activePhoto.imageUrl} alt={activePhoto.title} className="w-full h-full object-cover" />
              <button
                onClick={() => setActivePhoto(null)}
                className="absolute top-3 right-3 p-1.5 rounded-full bg-slate-900/80 text-white hover:bg-slate-800 border border-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-2">
              <div className="flex items-center justify-between">
                <Badge variant={activePhoto.category === 'champions' ? 'default' : 'secondary'}>
                  {activePhoto.category.toUpperCase()}
                </Badge>
                <span className="text-xs text-slate-400">{activePhoto.date} • {activePhoto.venueName}</span>
              </div>
              <h2 className="text-lg font-bold text-white">{activePhoto.title}</h2>
              <p className="text-xs text-slate-300 leading-relaxed">{activePhoto.description}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
