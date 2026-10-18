import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';

export interface GalleryItem {
  id: string;
  title: string;
  category: 'champions' | 'events' | 'venues';
  imageUrl: string;
  date: string;
  venueName: string;
  description: string;
}

export const mockGalleryItems: GalleryItem[] = [
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

export const GuideGalleryTab: React.FC = () => {
  const [activePhoto, setActivePhoto] = useState<GalleryItem | null>(null);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {mockGalleryItems.map((item) => (
          <Card 
            key={item.id} 
            className="overflow-hidden group hover:border-amber-500/40 transition-all cursor-pointer"
            onClick={() => setActivePhoto(item)}
          >
            <div className="relative aspect-video overflow-hidden bg-slate-950">
              <img 
                src={item.imageUrl} 
                alt={item.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute top-2 right-2">
                <Badge variant="secondary" className="capitalize bg-slate-950/80 backdrop-blur-md">
                  {item.category}
                </Badge>
              </div>
            </div>
            <CardContent className="p-3 space-y-1">
              <h3 className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors line-clamp-1">
                {item.title}
              </h3>
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>{item.venueName}</span>
                <span>{item.date}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Lightbox Modal */}
      {activePhoto && (
        <div 
          className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setActivePhoto(null)}
        >
          <div 
            className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl relative animate-scaleUp"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setActivePhoto(null)}
              className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-slate-950/80 text-slate-400 hover:text-white flex items-center justify-center border border-slate-700 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <img 
              src={activePhoto.imageUrl} 
              alt={activePhoto.title}
              className="w-full max-h-[60vh] object-cover"
            />
            <div className="p-5 space-y-2">
              <div className="flex items-center justify-between text-xs text-amber-400">
                <span className="font-bold">{activePhoto.venueName}</span>
                <span>{activePhoto.date}</span>
              </div>
              <h3 className="text-lg font-bold text-white">{activePhoto.title}</h3>
              <p className="text-xs text-slate-300 leading-relaxed">{activePhoto.description}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
