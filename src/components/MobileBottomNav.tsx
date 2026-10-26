import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, PlayCircle, Newspaper, Users, LayoutGrid, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'motion/react';

const MOBILE_NAV_ITEMS = [
  { name: 'Home', path: '/', icon: Home },
  { name: 'Live', path: '/live', icon: PlayCircle },
  { name: 'Action', path: '#', isAction: true },
  { name: 'Journal', path: '/news', icon: Newspaper },
  { name: 'Community', path: '/community', icon: Users },
];

export default function MobileBottomNav({ onActionClick }: { onActionClick: () => void }) {
  const location = useLocation();

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-[5000] pb-safe-area-inset-bottom">
      {/* Premium Glass Background */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-2xl border-t border-border-custom shadow-[0_-10px_40px_rgba(0,0,0,0.4)]" />
      
      <div className="max-w-md mx-auto flex items-center justify-around h-[70px] relative px-2">
        {MOBILE_NAV_ITEMS.map((item) => {
          if (item.isAction) {
            return (
              <div key="action-fab" className="relative -top-7">
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  whileHover={{ scale: 1.05 }}
                  onClick={onActionClick}
                  className="w-16 h-16 rounded-[1.75rem] bg-gradient-to-br from-primary to-emerald-500 text-white flex items-center justify-center shadow-[0_8px_30px_rgb(16,185,129,0.4)] relative group overflow-hidden"
                  aria-label="Open Studio Menu"
                >
                  <div className="absolute inset-0 bg-white/10 opacity-0 group-active:opacity-100 transition-opacity" />
                  <LayoutGrid className="w-8 h-8 relative z-10" />
                  
                  {/* Subtle pulsing ring */}
                  <div className="absolute inset-0 rounded-[1.75rem] border-2 border-white/20 animate-ping opacity-20" />
                </motion.button>
              </div>
            );
          }

          const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center justify-center gap-1.5 min-w-[64px] relative py-1",
                "transition-all duration-300"
              )}
            >
              <div className="relative">
                {isActive && (
                  <motion.div
                    layoutId="active-pill"
                    className="absolute inset-x-[-12px] inset-y-[-4px] bg-primary/15 rounded-full"
                    transition={{ type: "spring", bounce: 0.25, duration: 0.5 }}
                  />
                )}
                <item.icon 
                  className={cn(
                    "w-6 h-6 relative z-10 transition-colors duration-300",
                    isActive ? "text-primary stroke-[2.5px]" : "text-text-muted stroke-2"
                  )} 
                />
              </div>
              
              <span className={cn(
                "text-[9px] font-black uppercase tracking-[0.15em] transition-all duration-300",
                isActive ? "text-primary opacity-100 scale-105" : "text-text-muted opacity-40"
              )}>
                {item.name}
              </span>
              
              {isActive && (
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 right-2 w-1 h-1 bg-primary rounded-full shadow-[0_0_8px_rgba(16,185,129,0.8)]"
                />
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
