import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Menu, X, PlayCircle, Users, Briefcase, Info, Mail, LayoutDashboard, LogOut, User, Headset, Home as HomeIcon, DownloadCloud, Sun, Moon, Megaphone } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { safeLocalStorage } from '@/lib/storage';
import { cn } from '@/lib/utils';
import FideTvLogo from '@/components/FideTvLogo';
import NotificationTray from '@/components/NotificationTray';
import TourGuide from './TourGuide';
import LiveEventBanner from '@/components/LiveEventBanner';

export default function Layout({ children }: { children: React.ReactNode }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [totalVisits, setTotalVisits] = useState<number>(18542);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const saved = safeLocalStorage.getItem('fidetv-theme');
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
    const fetchVisitorCount = async () => {
      const baseVisits = 18542;
      try {
        const { count, error } = await supabase
          .from('site_visits')
          .select('*', { count: 'exact', head: true });
        
        const localVisits = parseInt(safeLocalStorage.getItem('fidetv_local_visits') || '0', 10);
        if (!error && count !== null) {
          setTotalVisits(baseVisits + count + localVisits);
        } else {
          setTotalVisits(baseVisits + localVisits);
        }
      } catch (err) {
        const localVisits = parseInt(safeLocalStorage.getItem('fidetv_local_visits') || '1', 10);
        setTotalVisits(baseVisits + localVisits);
      }
    };

    fetchVisitorCount();
    const interval = setInterval(fetchVisitorCount, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    safeLocalStorage.setItem('fidetv-theme', theme);
  }, [theme]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        checkProfile(session.user.id, session.user.email);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        checkProfile(session.user.id, session.user.email);
      }
    });

    // Targeted refetching is handled in individual components
    const channel = supabase.channel('content-sync')
      .subscribe();

    return () => {
      subscription.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, []);

  // Separate effect for path-based profile checking and mobile menu auto-close
  useEffect(() => {
    setIsMenuOpen(false);
    if (user) {
      checkProfile(user.id, user.email);
    }
  }, [location.pathname]);

  const checkProfile = async (userId: string, email?: string) => {
    // Only check if not on auth or onboarding or policies pages
    const publicPaths = ['/auth', '/onboarding', '/policies', '/about', '/contact', '/services', '/admin', '/profile', '/download', '/advertise'];
    if (publicPaths.some(path => location.pathname.startsWith(path))) return;

    // Exempt admin from being forced to onboarding
    if (email === 'fidetvonline@gmail.com') return;

    const { data, error } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', userId)
      .single();
    
    // If no profile or no username, go to onboarding
    // Error code PGRST116 means no rows found
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
    { name: 'Spaces', path: '/spaces', icon: Headset },
    { name: 'Services', path: '/services', icon: Briefcase },
    { name: 'Advertise', path: '/advertise', icon: Megaphone },
    { name: 'About', path: '/about', icon: Info },
    { name: 'Contact', path: '/contact', icon: Mail },
    { name: 'Messages', path: '/messages', icon: Mail },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground overflow-x-hidden">
      {/* <TourGuide /> */}
      <nav className={cn(
        "fixed top-0 left-0 right-0 transition-all duration-500",
        isMenuOpen ? "z-[99999]" : "z-[1000]",
        isScrolled 
          ? "bg-background backdrop-blur-md border-b border-border-custom py-2 shadow-2xl" 
          : "bg-background backdrop-blur-md border-b border-border-custom py-4"
      )}>
        {location.pathname !== '/live' && <LiveEventBanner />}
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
            <div className="hidden md:flex items-center space-x-6">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  id={link.id}
                  to={link.path}
                  className={cn(
                    "text-xs font-bold uppercase tracking-widest transition-colors duration-200 hover:text-primary relative py-2",
                    location.pathname === link.path ? "text-primary" : "text-foreground/70"
                  )}
                >
                  {link.name}
                </Link>
              ))}

              {!isStandalone && (
                <Link
                  to="/download"
                  className="p-2 text-text-muted hover:text-primary transition-colors"
                >
                  <DownloadCloud className="w-5 h-5" />
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
                <div className="flex items-center space-x-2">
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
                  className="px-5 py-2 bg-primary text-white text-xs font-bold rounded-full hover:bg-primary/90 transition-all shadow-lg"
                >
                  Sign In
                </Link>
              )}
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden flex items-center gap-2">
              <button
                onClick={toggleTheme}
                className="p-2 text-foreground"
              >
                {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
              </button>
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-2 text-foreground"
              >
                {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, x: '10%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '10%' }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[9990] bg-background md:hidden pt-40 px-8 flex flex-col gap-8 overflow-y-auto"
          >
            <nav className="flex flex-col gap-6">
              {navLinks.map((link, idx) => (
                <motion.div
                  key={link.path}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                >
                  <Link
                    to={link.path}
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center gap-4 text-3xl font-display font-black text-foreground hover:text-primary transition-all active:scale-95 origin-left"
                  >
                    {link.icon && <link.icon className="w-6 h-6 text-primary" />}
                    {link.name}
                  </Link>
                </motion.div>
              ))}
              
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: navLinks.length * 0.03 }}
                className="pt-8 mt-8 border-t border-border-custom space-y-6"
              >
                {!isStandalone && (
                  <Link
                    to="/download"
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center gap-4 text-xl font-bold text-foreground/70"
                  >
                    <DownloadCloud className="w-6 h-6 text-primary" />
                    Download App
                  </Link>
                )}
                
                {user ? (
                  <>
                    <Link
                      to="/profile"
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center gap-4 text-xl font-bold text-foreground/70"
                    >
                      <User className="w-6 h-6 text-primary" />
                      My Profile
                    </Link>
                    <button
                      onClick={() => {
                        handleSignOut();
                        setIsMenuOpen(false);
                      }}
                      className="flex items-center gap-4 text-xl font-bold text-red-500"
                    >
                      <LogOut className="w-6 h-6" />
                      Sign Out
                    </button>
                  </>
                ) : (
                  <Link
                    to="/auth"
                    onClick={() => setIsMenuOpen(false)}
                    className="w-full py-4 bg-primary text-white font-bold rounded-2xl text-center shadow-lg shadow-primary/20"
                  >
                    Sign In to FideTV
                  </Link>
                )}
              </motion.div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      <main className={cn("flex-grow pt-36 sm:pt-40 lg:pt-36", location.pathname === '/live' && "pt-36 lg:pt-36")}>
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

      {location.pathname !== '/messages' && location.pathname !== '/live-chat' && !location.pathname.startsWith('/community') && (
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
                  <li><Link to="/advertise" className="hover:text-primary transition-colors">Advertise with Us</Link></li>
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
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <p className="text-foreground/40 text-[10px] uppercase font-bold tracking-widest text-center md:text-left">
                  &copy; {new Date().getFullYear()} Fidetvmedia Creative Platform. All rights reserved.
                </p>
                <div className="flex items-center justify-center gap-2 bg-background/50 border border-border-custom px-4 py-1.5 rounded-full shadow-inner select-none w-fit mx-auto md:mx-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shrink-0" />
                  <span className="text-foreground/50 text-[10px] font-mono tracking-wider font-bold">VISITS: </span>
                  <span className="text-primary font-mono text-[10px] font-black">{totalVisits.toLocaleString()}</span>
                </div>
              </div>
              <div className="flex space-x-6 text-[10px] text-foreground/40 uppercase font-bold tracking-widest">
                <Link to="/profile" className="hover:text-primary transition-colors flex items-center gap-2">
                  <Headset className="w-3 h-3" />
                  Support
                </Link>
                <Link to="/policies" className="hover:text-primary transition-colors">Privacy</Link>
                <Link to="/policies" className="hover:text-primary transition-colors">Terms</Link>
                <button 
                  onClick={() => {
                    safeLocalStorage.removeItem('fidetv-tour-seen');
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
