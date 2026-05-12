import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, ChevronLeft, X, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Step {
  title: string;
  description: string;
  target?: string;
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
}

const steps: Step[] = [
  {
    title: "Welcome to FideTV!",
    description: "Your ultimate hub for professional media, live streaming, and creative production. Let's take a quick look around.",
    position: 'center'
  },
  {
    title: "Live Broadcasting",
    description: "Watch live events, church services, and exclusive broadcasts in real-time. Don't forget to join the live chat!",
    target: "nav a[href='/live']",
    position: 'bottom'
  },
  {
    title: "Creative Services",
    description: "From video editing to live event coverage, explore how our studio ecosystem can elevate your brand.",
    target: "nav a[href='/services']",
    position: 'bottom'
  },
  {
    title: "Community Circles",
    description: "Join specialized hubs, collaborate with other creators, and grow your presence in our specialized communities.",
    target: "nav a[href='/community']",
    position: 'bottom'
  },
  {
    title: "Global Content Hub",
    description: "Access premium digital assets, exclusive shows, and media archives in our content marketplace.",
    target: "nav a[href='/content']",
    position: 'bottom'
  },
  {
    title: "Your Identity",
    description: "Manage your profile, track your interactions, and stay connected with the FideTV ecosystem.",
    target: "nav .user-tour-profile",
    position: 'left'
  }
];

export default function TourGuide() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const updateTargetRect = () => {
    if (isVisible && steps[currentStep].target) {
      const element = document.querySelector(steps[currentStep].target!);
      if (element && (element as HTMLElement).offsetWidth > 0) {
        setTargetRect(element.getBoundingClientRect());
      } else {
        setTargetRect(null);
      }
    } else {
      setTargetRect(null);
    }
  };

  useEffect(() => {
    const hasSeenTour = localStorage.getItem('fidetv-tour-seen');
    if (!hasSeenTour) {
      const timer = setTimeout(() => setIsVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    updateTargetRect();
    window.addEventListener('resize', updateTargetRect);
    window.addEventListener('scroll', updateTargetRect, true);
    return () => {
      window.removeEventListener('resize', updateTargetRect);
      window.removeEventListener('scroll', updateTargetRect, true);
    };
  }, [currentStep, isVisible]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleComplete = () => {
    setIsVisible(false);
    localStorage.setItem('fidetv-tour-seen', 'true');
  };

  if (!isVisible) return null;

  const step = steps[currentStep];
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;
  
  // Use center position on mobile if the target is likely hidden or desktop-oriented
  const effectivePosition = isMobile && step.target ? 'bottom' : step.position || 'center';

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none overflow-hidden">
      {/* Dim Overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 pointer-events-auto transition-all duration-300"
        style={{
          clipPath: targetRect 
            ? `polygon(0% 0%, 0% 100%, ${targetRect.left}px 100%, ${targetRect.left}px ${targetRect.top}px, ${targetRect.right}px ${targetRect.top}px, ${targetRect.right}px ${targetRect.bottom}px, ${targetRect.left}px ${targetRect.bottom}px, ${targetRect.left}px 100%, 100% 100%, 100% 0%)` 
            : 'none'
        }}
        onClick={handleComplete}
      />

      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className={cn(
            "fixed z-[101] w-[calc(100%-2rem)] max-w-[320px] sm:max-w-[340px] pointer-events-auto",
            (!targetRect || effectivePosition === 'center') && "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          )}
          style={targetRect && effectivePosition !== 'center' ? {
            left: effectivePosition === 'bottom' || effectivePosition === 'top' 
              ? Math.max(16, Math.min(window.innerWidth - (window.innerWidth < 400 ? 336 : 356), targetRect.left + (targetRect.width / 2) - 170)) 
              : undefined,
            top: effectivePosition === 'bottom' 
              ? Math.min(window.innerHeight - 300, targetRect.bottom + 20) 
              : undefined,
            bottom: effectivePosition === 'top' 
              ? Math.max(16, window.innerHeight - targetRect.top + 20) 
              : undefined,
            right: effectivePosition === 'left' 
              ? Math.max(16, window.innerWidth - targetRect.left + 20) 
              : undefined,
          } : undefined}
        >
          <div className="glass-morphism bg-surface-bright/95 border border-primary/20 p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] space-y-4 md:space-y-6">
            <div className="flex justify-between items-start">
              <div className="p-2 md:p-3 bg-primary/10 rounded-2xl">
                <Sparkles className="w-5 h-5 md:w-6 md:h-6 text-primary" />
              </div>
              <button 
                onClick={handleComplete}
                className="p-2 hover:bg-foreground/5 rounded-full transition-colors text-text-muted"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-center">
              <h3 className="text-lg md:text-xl font-display font-bold text-foreground">{step.title}</h3>
              <p className="text-xs md:text-sm text-text-muted leading-relaxed italic">{step.description}</p>
            </div>

            <div className="flex items-center justify-between pt-2 md:pt-4">
              <div className="flex space-x-1">
                {steps.map((_, i) => (
                  <div 
                    key={i} 
                    className={cn(
                      "h-1 transition-all duration-300 rounded-full",
                      i === currentStep ? "w-4 md:w-6 bg-primary" : "w-1 bg-border-custom"
                    )} 
                  />
                ))}
              </div>

              <div className="flex space-x-2 md:space-x-3">
                {currentStep > 0 && (
                  <button
                    onClick={handleBack}
                    className="p-2 md:p-3 border border-border-custom text-foreground rounded-xl hover:bg-surface transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4 md:w-5 md:h-5" />
                  </button>
                )}
                <button
                  onClick={handleNext}
                  className="px-4 py-2 md:px-6 md:py-3 bg-primary text-white font-black uppercase tracking-widest text-[9px] md:text-[10px] rounded-xl shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all flex items-center space-x-2"
                >
                  <span>{currentStep === steps.length - 1 ? "Finish" : "Next"}</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
