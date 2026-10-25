import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, PlayCircle, Newspaper, Users, LayoutGrid } from 'lucide-react';
import { cn } from '@/lib/utils';

const MOBILE_NAV_ITEMS = [
  { name: 'Home', path: '/', icon: Home },
  { name: 'Live', path: '/live', icon: PlayCircle },
  { name: 'Action', path: '#', isAction: true },
  { name: 'Blog', path: '/news', icon: Newspaper },
  { name: 'Community', path: '/community', icon: Users },
];

export default function MobileBottomNav({ onActionClick }: { onActionClick: () => void }) {
  const location = useLocation();

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-[5000] bg-background/80 backdrop-blur-xl border-t border-border-custom px-4 pb-safe-area-inset-bottom pt-2 h-[calc(70px+env(safe-area-inset-bottom))] shadow-[0_-10px_30px_rgba(0,0,0,0.3)]">
      <div className="max-w-md mx-auto flex items-center justify-around h-full relative">
        {MOBILE_NAV_ITEMS.map((item) => {
          if (item.isAction) {
            return (
              <div key="action-fab" className="relative -top-8">
                <button
                  onClick={onActionClick}
                  className="w-16 h-16 rounded-3xl bg-primary text-white flex items-center justify-center shadow-2xl shadow-primary/40 active:scale-90 transition-all duration-300 ring-8 ring-background"
                  aria-label="Open Menu"
                >
                  <LayoutGrid className="w-8 h-8" />
                </button>
              </div>
            );
          }

          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center justify-center gap-1 min-w-[64px] transition-all duration-300",
                isActive ? "text-primary scale-110" : "text-text-muted hover:text-foreground"
              )}
            >
              <div className={cn(
                "p-1.5 rounded-2xl transition-colors",
                isActive ? "bg-primary/10" : "bg-transparent"
              )}>
                <item.icon className={cn("w-6 h-6", isActive ? "stroke-[2.5px]" : "stroke-2")} />
              </div>
              <span className={cn(
                "text-[10px] font-bold uppercase tracking-widest",
                isActive ? "opacity-100" : "opacity-60"
              )}>
                {item.name}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
