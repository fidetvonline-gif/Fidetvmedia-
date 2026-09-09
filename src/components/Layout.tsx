import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Menu, X, PlayCircle, Users, Briefcase, Info, Mail, LayoutDashboard, LogOut, User, Headset, Home as HomeIcon, DownloadCloud, Sun, Moon, Megaphone, Construction } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { safeLocalStorage } from '@/lib/storage';
import { cn } from '@/lib/utils';
import FideTvLogo from '@/components/FideTvLogo';
import NotificationTray from '@/components/NotificationTray';
import TourGuide from './TourGuide';
import LiveEventBanner from '@/components/LiveEventBanner';
import PromotionPopup from '@/components/PromotionPopup';
import FeaturedChannelPopup from '@/components/FeaturedChannelPopup';

export default function Layout({ children }: { children: React.ReactNode }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [hasProfileSet, setHasProfileSet] = useState<boolean | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [totalVisits, setTotalVisits] = useState<number>(18542);
  const [showEventBanner, setShowEventBanner] = useState(true);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const saved = safeLocalStorage.getItem('fidetv-theme');
      if (saved === 'light' || saved === 'dark') return saved;
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'dark';
  });
  const [showComingSoon, setShowComingSoon] = useState(false);
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
    
    // Subscribe to real-time updates for site visits
    const visitChannel = supabase
      .channel('public-site-visits')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'site_visits' }, () => {
        fetchVisitorCount();
      })
      .subscribe();

    const fetchEventBannerStatus = async () => {
      try {
        const { data, error } = await supabase
          .from('site_settings')
          .select('*')
          .eq('key', 'enable_event_banner')
          .single();
        
        if (!error && data) {
          setShowEventBanner(data.value !== 'false');
        }
      } catch (err) {
        console.error('Error fetching banner status:', err);
      }
    };
    fetchEventBannerStatus();

    return () => {
      supabase.removeChannel(visitChannel);
    };
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
      } else {
        setHasProfileSet(null);
        setIsAdmin(false);
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
      // Small delay to ensure session is fully processed
      checkProfile(user.id, user.email);
    }
  }, [location.pathname, user]);

  const checkProfile = async (userId: string, email?: string) => {
    // Only check if not on public paths
    const publicPaths = ['/', '/news', '/auth', '/onboarding', '/policies', '/about', '/contact', '/services', '/admin', '/profile', '/download', '/advertise', '/spaces', '/community', '/content'];
    const isPublicPath = publicPaths.some(path => location.pathname === path || (path !== '/' && location.pathname.startsWith(path)));
    
    // Update Admin status always if it's the admin email
    if (email === 'fidetvonline@gmail.com') setIsAdmin(true);

    // If we already know the profile state and it's a public path, don't re-check everything
    if (hasProfileSet !== null && isPublicPath) {
      return;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('username, role')
      .eq('id', userId)
      .single();
      
    if (data?.role === 'blogger' || data?.role === 'admin') {
      setIsAdmin(true);
    }

    // If we found a username, remember it
    if (data?.username) {
      setHasProfileSet(true);
    } else {
      setHasProfileSet(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const handleNavClick = (e: React.MouseEvent, link: any) => {
    setIsMenuOpen(false);
  };

  const navLinks = [
    { name: 'Home', path: '/', icon: HomeIcon },
    { name: 'Live', path: '/live', icon: PlayCircle, id: 'nav-live' },
    { name: 'Content', path: '/content', icon: LayoutDashboard, id: 'nav-content' },
    { name: 'Blog', path: '/news', icon: LayoutDashboard },
    { name: 'Community', path: '/community', icon: Users, id: 'nav-community' },
    { name: 'Spaces', path: '/spaces', icon: Headset },
    { name: 'Services', path: '/services', icon: Briefcase },
    { name: 'Fidesave', path: '/fidesave', icon: DownloadCloud },
    { name: 'Advertise', path: '/advertise', icon: Megaphone },
    { name: 'About', path: '/about', icon: Info },
    { name: 'Contact', path: '/contact', icon: Mail },
  ];

  if (isAdmin) {
    navLinks.push({ name: 'Admin', path: '/admin', icon: LayoutDashboard, id: 'nav-admin' });
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground overflow-x-clip selection:bg-primary/30">
      <PromotionPopup />
      <FeaturedChannelPopup />
      {/* <TourGuide /> */}
      <nav className={cn(
        "fixed top-0 left-0 right-0 transition-all duration-500",
        isMenuOpen ? "z-[99999]" : "z-[1000]",
        isScrolled 
          ? "bg-background backdrop-blur-md border-b border-border-custom py-2 shadow-2xl" 
          : "bg-background backdrop-blur-md border-b border-border-custom py-4"
      )}>
        {location.pathname !== '/live' && showEventBanner && <LiveEventBanner />}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20 items-center">
            <Link to="/" className="flex items-center group mr-8 shrink-0 gap-3">
              <div className="w-10 h-10 text-foreground flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <FideTvLogo className="w-full h-full" />
              </div>
              <span className="font-display font-black text-2xl tracking-tighter text-foreground hidden sm:block">
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
                    onClick={() => {
                      setIsMenuOpen(false);
                    }}
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

      <main className={cn("flex-grow pt-[88px] lg:pt-[88px]", location.pathname === '/live' && "pt-[80px] lg:pt-[80px]")}>
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
                  <li><Link to="/fidesave" className="hover:text-primary transition-colors">Fidesave Downloader</Link></li>
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
      {/* Coming Soon Modal */}
      <AnimatePresence>
        {showComingSoon && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100000] bg-background/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowComingSoon(false)}
          >
            <div className="bg-surface border border-border-custom p-8 rounded-3xl max-w-sm text-center shadow-2xl" onClick={e => e.stopPropagation()}>
              <Construction className="w-12 h-12 text-primary mx-auto mb-6" />
              <h2 className="text-2xl font-display font-black text-foreground mb-2">Coming Soon</h2>
              <p className="text-foreground/60 mb-6 font-medium">We're working hard on these updates. Check back soon!</p>
              <button onClick={() => setShowComingSoon(false)} className="w-full py-3 bg-primary text-white font-bold rounded-xl">Got it</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
