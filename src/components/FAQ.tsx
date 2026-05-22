import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, HelpCircle, Zap, Award, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FAQItem {
  question: string;
  answer: string;
  category: 'services' | 'partnerships';
}

const FAQ_ITEMS: FAQItem[] = [
  {
    category: 'services',
    question: 'What kinds of web and app development (Digital Engineering & Hub Ecosystems) do you specialize in?',
    answer: 'We engineer high-performance, tailor-made digital architectures, custom API layers, and native/cross-platform mobile applications (iOS & Android). Our solutions focus on sophisticated UI/UX design, real-time database synchronization, and scalable cloud-native hosting for enterprise-grade performance.'
  },
  {
    category: 'services',
    question: 'What is the typical project timeline from design to deployment?',
    answer: 'Timeline varies by complexity. High-performing digital platforms and custom website creations typically span 4–8 weeks, while comprehensive hub ecosystems take 8–12 weeks. Cinematic video productions and broadcasting operations are optimized to deploy within 2–4 weeks from proposal approval.'
  },
  {
    category: 'services',
    question: 'Do you provide continuing post-launch structural and operational support?',
    answer: 'Yes. All active digital services we deploy include 30 days of direct post-launch technical support to ensure full structural stability. We also provide yearly or quarterly Service Level Agreements (SLAs) for continuous cloud monitoring, security updates, and performance tuning.'
  },
  {
    category: 'partnerships',
    question: 'How does the FideTV partnership ecosystem function for creators and broadcasters?',
    answer: 'Partners gain access to our live syndication channels, verified profiles on the Creator Spotlights, premium banner placements, and interactive notice walls. We provide elite technological routing and direct connectivity tools, empowering you to scale your content with our broadcasting backbone.'
  },
  {
    category: 'partnerships',
    question: 'What are the criteria for becoming an Approved FideTV Partner?',
    answer: 'We seek professional broadcasters, media creators, and agencies who maintain high production standards and have a defined broadcast format. Every application submitted through the Partner page or Community Hub is carefully peer-reviewed by our executive media team to ensure brand synergy.'
  },
  {
    category: 'partnerships',
    question: 'How does advertising and monetization operate within partnerships?',
    answer: 'Monetization options include strategic ad placement units (such as Google AdSense integrated modules), strategic brand co-sponsorships on signature live streams, and direct booking campaigns. We design transparent and mutually beneficial revenue-sharing structures tailored to your content scale.'
  }
];

export default function FAQ() {
  const [activeCategory, setActiveCategory] = useState<'all' | 'services' | 'partnerships'>('all');
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const filteredItems = FAQ_ITEMS.filter(
    item => activeCategory === 'all' || item.category === activeCategory
  );

  const toggleItem = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="relative overflow-hidden" id="faq-section">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      
      <div className="space-y-16">
        {/* Section Header */}
        <div className="space-y-6 text-center">
          <div className="flex items-center justify-center gap-2">
            <HelpCircle className="w-4 h-4 text-primary animate-pulse" />
            <span className="text-primary font-display font-black uppercase tracking-[0.4em] text-[10px] sm:text-xs">
              Knowledge Base
            </span>
          </div>
          
          <h2 className="text-4xl sm:text-6xl font-display font-bold text-foreground tracking-tighter italic">
            Frequently Asked<br />Questions.
          </h2>
          
          <p className="text-text-muted max-w-2xl mx-auto font-serif font-light text-base sm:text-lg italic leading-relaxed opacity-70">
            Find immediate answers regarding our custom digital engineering solutions, media production workflows, and professional partnership networks.
          </p>
        </div>

        {/* Category Selector Tabs */}
        <div className="flex flex-wrap justify-center gap-3">
          {[
            { id: 'all', name: '🌍 All Questions', icon: MessageSquare },
            { id: 'services', name: '⚡ Services & Solutions', icon: Zap },
            { id: 'partnerships', name: '🏆 Partnerships', icon: Award }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeCategory === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveCategory(tab.id as any);
                  setOpenIndex(null); // Reset open accordion items when switching category
                }}
                className={cn(
                  "px-6 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all duration-300 flex items-center gap-2 border cursor-pointer",
                  isActive
                    ? "bg-primary border-primary text-white shadow-xl shadow-primary/20 scale-105"
                    : "bg-surface border-border-custom text-text-muted hover:text-foreground hover:border-white/10"
                )}
              >
                <Icon className={cn("w-3.5 h-3.5", isActive ? "text-white" : "text-primary")} />
                <span>{tab.name}</span>
              </button>
            );
          })}
        </div>

        {/* Accordion FAQ Grid */}
        <div className="max-w-4xl mx-auto space-y-4 px-4 sm:px-6">
          <AnimatePresence mode="popLayout">
            {filteredItems.map((item, index) => {
              const isOpen = openIndex === index;
              return (
                <motion.div
                  key={item.question}
                  layout="position"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  className={cn(
                    "glass rounded-[1.8rem] transition-all duration-300 overflow-hidden border",
                    isOpen 
                      ? "border-primary/20 bg-primary/5 shadow-2xl shadow-primary/5" 
                      : "border-border-custom hover:border-white/10 bg-surface/40"
                  )}
                >
                  <button
                    onClick={() => toggleItem(index)}
                    className="w-full text-left px-8 py-6 sm:py-7 flex justify-between items-center gap-6 group cursor-pointer"
                  >
                    <span className="text-base sm:text-lg font-display font-medium text-foreground group-hover:text-primary transition-colors leading-snug">
                      {item.question}
                    </span>
                    <div className={cn(
                      "w-10 h-10 rounded-xl bg-background border border-border-custom flex items-center justify-center shrink-0 transition-all duration-300",
                      isOpen ? "border-primary/30 text-primary rotate-180 bg-primary/10" : "text-text-muted hover:text-foreground"
                    )}>
                      <ChevronDown className="w-4 h-4" />
                    </div>
                  </button>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                      >
                        <div className="px-8 pb-7 pt-1 border-t border-border-custom/50">
                          <p className="text-sm sm:text-base text-text-muted leading-relaxed font-serif font-light italic">
                            {item.answer}
                          </p>
                          <div className="mt-4 flex items-center gap-2">
                            <span className="text-[8px] font-mono uppercase bg-primary/10 text-primary px-3 py-1 rounded-full font-black tracking-widest">
                              {item.category}
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
