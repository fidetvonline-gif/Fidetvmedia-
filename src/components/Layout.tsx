import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Menu, X, PlayCircle, Users, Briefcase, Info, Mail, LayoutDashboard, LogOut, User, Headset, Home as HomeIcon, DownloadCloud, Sun, Moon } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import FideTvLogo from '@/components/FideTvLogo';
import NotificationTray from '@/components/NotificationTray';
import TourGuide from './TourGuide';

export default function Layout({ children }: { children: React.ReactNode }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('fidetv-theme');
      if (saved === 'light' || saved === 'dark') return saved;
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'dark';
  });
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const standsAlone = window.matchMedia('(display-mode: standalone)').matches 
      || (window.navigator as any).standalone 
      || document.referrer.includes('android-app://');
    setIsStandalone(standsAlone);
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('fidetv-theme', theme);
  }, [theme]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        checkProfile(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        checkProfile(session.user.id);
      }
    });

    // Real-time synchronization: refresh on major content changes
    const channel = supabase.channel('content-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public' },
        (payload) => {
          // Exclude high-frequency or non-critical tables to prevent excessive reloading
          const excludedTables = ['comments', 'messages', 'profiles', 'bookings'];
          if (excludedTables.includes(payload.table)) return;

          console.log(`Real-time update in ${payload.table}:`, payload);
          
          // Small delay to allow the DB operation to finish and propagate
          setTimeout(() => {
            window.location.reload();
          }, 1500);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, [location.pathname]);

  const checkProfile = async (userId: string) => {
    // Only check if not on auth or onboarding or policies pages
    const publicPaths = ['/auth', '/onboarding', '/policies', '/about', '/contact', '/services'];
    if (publicPaths.includes(location.pathname)) return;

    const { data, error } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', userId)
      .single();
    
    if (error || !data?.username) {
      navigate('/onboarding');
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const navLinks = [
    { name: 'Home', path: '/', icon: HomeIcon },
    { name: 'Live', path: '/live', icon: PlayCircle, id: 'nav-live' },
    { name: 'Content', path: '/content', icon: LayoutDashboard, id: 'nav-content' },
    { name: 'Blog', path: '/news', icon: LayoutDashboard },
    { name: 'Community', path: '/community', icon: Users, id: 'nav-community' },
    { name: 'Services', path: '/services', icon: Briefcase },
    { name: 'About', path: '/about', icon: Info },
    { name: 'Contact', path: '/contact', icon: Mail },
    { name: 'Messages', path: '/messages', icon: Mail },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* <TourGuide /> */}
      <nav className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-500",
        isScrolled 
          ? "bg-background/80 backdrop-blur-md border-b border-border-custom py-2 shadow-2xl" 
          : "bg-background border-b border-border-custom py-4"
      )}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20 items-center">
            <Link to="/" className="flex items-center space-x-2 group">
              <div className="w-8 h-8 text-foreground flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <FideTvLogo className="w-full h-full" />
              </div>
              <span className="font-display font-bold text-2xl tracking-tighter text-foreground">
                FideTv
              </span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  id={link.id}
                  to={link.path}
                  className={cn(
                    "text-sm font-medium tracking-wide transition-colors duration-200 hover:text-primary relative py-2",
                    location.pathname === link.path ? "text-primary" : "text-foreground/70"
                  )}
                >
                  {link.name}
                  {location.pathname === link.path && (
                    <motion.div
                      layoutId="nav-underline"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                    />
                  )}
                </Link>
              ))}

              <div className="h-6 w-px bg-border-custom mx-2" />

              {!isStandalone && (
                <Link
                  to="/download"
                  className="flex items-center space-x-2 text-text-muted hover:text-primary transition-colors text-xs font-bold uppercase tracking-widest"
                >
                  <DownloadCloud className="w-4 h-4" />
                  <span className="hidden lg:inline">App</span>
                </Link>
              )}

              <button
                onClick={toggleTheme}
                className="p-2 hover:bg-surface-bright rounded-full transition-colors text-foreground"
                title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
              >
                {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
              </button>

              {user ? (
                <div className="flex items-center space-x-4 user-tour-profile">
                  <NotificationTray />
                  <Link to="/profile" className="p-2 hover:bg-foreground/5 rounded-full transition-colors">
                    <User className="w-5 h-5 text-foreground/40" />
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="p-2 hover:bg-foreground/5 rounded-full transition-colors text-foreground/40"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <Link
                  to="/auth"
                  className="px-6 py-2 bg-primary text-white text-sm font-bold rounded-full hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
                >
                  Join Now
                </Link>
              )}
            </div>

            {/* Mobile Menu Button */}
            <div className="flex md:hidden items-center space-x-4">
              {!isStandalone && (
                <Link to="/download" className="p-2 text-text-muted hover:text-primary">
                  <DownloadCloud className="w-5 h-5" />
                </Link>
              )}
              <button
                onClick={toggleTheme}
                className="p-2 hover:bg-surface-bright rounded-full transition-colors text-foreground"
              >
                {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
              </button>
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="text-foreground hover:text-primary p-2"
              >
                {isMenuOpen ? <X /> : <Menu />}
              </button>
            </div>
          </div>
        </div>

                <AnimatePresence>
          {isMenuOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/40 backdrop-blur-sm md:hidden z-40"
                onClick={() => setIsMenuOpen(false)}
              />
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed top-0 right-0 h-full w-4/5 max-w-sm bg-surface-bright border-l border-border-custom z-50 md:hidden p-6 shadow-2xl"
              >
                <div className="flex flex-col h-full">
                  <div className="flex justify-between items-center mb-10">
                    <span className="font-display font-bold text-2xl text-foreground">Menu</span>
                    <button onClick={() => setIsMenuOpen(false)} className="text-foreground p-2 hover:bg-surface-bright rounded-full transition-colors"><X /></button>
                  </div>

                  <div className="flex flex-col space-y-6">
                    {navLinks.map((link) => (
                      <Link
                        key={link.path}
                        to={link.path}
                        onClick={() => setIsMenuOpen(false)}
                        className={cn(
                          "flex items-center space-x-4 text-lg font-bold transition-colors p-4 rounded-2xl mb-2",
                          location.pathname === link.path 
                            ? "bg-primary text-white shadow-lg shadow-primary/20" 
                            : "text-foreground hover:bg-surface"
                        )}
                      >
                        <link.icon className={cn(
                          "w-6 h-6",
                          location.pathname === link.path ? "text-white" : "text-primary"
                        )} />
                        <span>{link.name}</span>
                      </Link>
                    ))}
                  </div>

                  <div className="mt-auto pt-10 border-t border-border-custom space-y-4">
                    {user ? (
                      <>
                        <Link
                          to="/profile"
                          onClick={() => setIsMenuOpen(false)}
                          className="flex items-center space-x-4 text-foreground/80 p-3 rounded-2xl hover:bg-surface-bright"
                        >
                          <User className="w-6 h-6 text-text-muted" />
                          <span>My Profile</span>
                        </Link>
                        <button
                          onClick={handleSignOut}
                          className="flex items-center space-x-4 text-foreground/80 w-full text-left p-3 rounded-2xl hover:bg-surface-bright"
                        >
                          <LogOut className="w-6 h-6 text-text-muted" />
                          <span>Sign Out</span>
                        </button>
                      </>
                    ) : (
                      <Link
                        to="/auth"
                        onClick={() => setIsMenuOpen(false)}
                        className="block w-full py-5 bg-primary text-center text-white font-black uppercase tracking-widest text-xs rounded-2xl shadow-xl shadow-primary/20"
                      >
                        Join Fidetvmedia
                      </Link>
                    )}
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </nav>

      <main className="flex-grow pt-20">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      {location.pathname !== '/messages' && location.pathname !== '/live-chat' && (
        <footer className="bg-surface border-t border-border-custom py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
              <div className="space-y-4">
                <div className="flex items-center space-x-2 cursor-default group">
                  <div className="w-8 h-8 text-foreground flex items-center justify-center transition-transform duration-300 group-hover:scale-105">
                    <FideTvLogo className="w-full h-full" />
                  </div>
                  <span className="font-display font-bold text-xl text-foreground">FideTv</span>
                </div>
                <p className="text-foreground/60 text-sm leading-relaxed italic">
                  Empowering creativity through digital media. Dynamic live streaming, professional content delivery, and interactive media hub.
                </p>
              </div>
              
              <div>
                <h4 className="font-display font-bold text-sm uppercase tracking-widest text-primary mb-6">Explore</h4>
                <ul className="space-y-3 text-sm text-foreground/60">
                  <li><Link to="/live" className="hover:text-primary transition-colors">Live Events</Link></li>
                  <li><Link to="/content" className="hover:text-primary transition-colors">Content Hub</Link></li>
                  <li><Link to="/news" className="hover:text-primary transition-colors">FideTV Blog</Link></li>
                  <li><Link to="/community" className="hover:text-primary transition-colors">Community Hub</Link></li>
                  <li><Link to="/portfolio" className="hover:text-primary transition-colors">Production Portfolio</Link></li>
                </ul>
              </div>

              {!isStandalone && (
                <div>
                  <h4 className="font-display font-bold text-sm uppercase tracking-widest text-primary mb-6">Resources</h4>
                  <ul className="space-y-3 text-sm text-foreground/60">
                    <li><Link to="/services" className="hover:text-primary transition-colors">Services</Link></li>
                    <li><Link to="/download" className="hover:text-primary transition-colors">Download App</Link></li>
                    <li><Link to="/download" className="hover:text-primary transition-colors">FAQ</Link></li>
                  </ul>
                </div>
              )}

              <div>
                <h4 className="font-display font-bold text-sm uppercase tracking-widest text-primary mb-6">Connect</h4>
                <ul className="space-y-3 text-sm text-foreground/60">
                  <li><a href="https://youtube.com/@fidetvmedia?si=JkdixDjpkGPah9ay" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">YouTube Channel</a></li>
                  <li><a href="mailto:fidetvonline@gmail.com" className="hover:text-primary transition-colors">fidetvonline@gmail.com</a></li>
                  <li><a href="https://wa.me/2348108889805" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">WhatsApp: 08108889805</a></li>
                  <li><a href="tel:08124323608" className="hover:text-primary transition-colors">Call: 08124323608</a></li>
                  <li><Link to="/contact" className="hover:text-primary transition-colors">Community Links</Link></li>
                </ul>
              </div>
            </div>
            
            <div className="mt-12 pt-8 border-t border-border-custom flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
              <p className="text-foreground/40 text-[10px] uppercase font-bold tracking-widest text-center md:text-left">
                &copy; {new Date().getFullYear()} Fidetvmedia Creative Platform. All rights reserved.
              </p>
              <div className="flex space-x-6 text-[10px] text-foreground/40 uppercase font-bold tracking-widest">
                <Link to="/profile" className="hover:text-primary transition-colors flex items-center gap-2">
                  <Headset className="w-3 h-3" />
                  Support
                </Link>
                <Link to="/policies" className="hover:text-primary transition-colors">Privacy</Link>
                <Link to="/policies" className="hover:text-primary transition-colors">Terms</Link>
                <button 
                  onClick={() => {
                    localStorage.removeItem('fidetv-tour-seen');
                    window.location.reload();
                  }}
                  className="hover:text-primary transition-colors cursor-pointer"
                >
                  Restart Tour
                </button>
              </div>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
