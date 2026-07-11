import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Tv, Bell, Calendar, Flame, AlertCircle, Sparkles, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import fidetvWorldCup from '@/assets/images/fidetv_world_cup_1780392851684.png';

export default function LiveEventBanner({ isCardOnly = false }: { isCardOnly?: boolean }) {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false); // Set to false so it doesn't show
  
  const handleTuneIn = () => {
    navigate('/live');
  };

  if (isCardOnly) {
    return null; // Return null to remove the section
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -25 }}
          className="relative bg-gradient-to-r from-background via-[#e0650d]/10 to-background border-b border-white/10 z-[10000] py-3 px-4 shadow-sm"
        >
          {/* Content removed */}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
