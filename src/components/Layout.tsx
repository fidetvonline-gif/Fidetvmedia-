import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Menu, X, PlayCircle, Users, Briefcase, Info, Mail, LayoutDashboard, LogOut, User, Headset, Home as HomeIcon } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import FideTvLogo from '@/components/FideTvLogo';

export default function Layout({ children }: { children: React.ReactNode }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [user, setUser] = useState<any>(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const navLinks = [
    { name: 'Home', path: '/', icon: HomeIcon },
    { name: 'Live', path: '/live', icon: PlayCircle },
    { name: 'Content', path: '/content', icon: LayoutDashboard },
    { name: 'News', path: '/news', icon: LayoutDashboard },
    { name: 'Community', path: '/community', icon: Users },
    { name: 'Services', path: '/services', icon: Briefcase },
    { name: 'About', path: '/about', icon: Info },
    { name: 'Contact', path: '/contact', icon: Mail },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <nav className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-500",
        isScrolled 
          ? "bg-[#050505] border-b border-white/5 py-2 shadow-2xl" 
          : "bg-[#050505] border-b border-white/5 py-4"
      )}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20 items-center">
            <Link to="/" className="flex items-center space-x-2 group">
              <div className="w-8 h-8 text-white flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <FideTvLogo className="w-full h-full" />
              </div>
              <span className="font-display font-bold text-2xl tracking-tighter text-white">
                FideTv
              </span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={cn(
                    "text-sm font-medium tracking-wide transition-colors duration-200 hover:text-primary relative py-2",
                    location.pathname === link.path ? "text-primary" : "text-gray-400"
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

              <div className="h-6 w-px bg-white/10 mx-2" />

              {user ? (
                <div className="flex items-center space-x-4">
                  <Link to="/profile" className="p-2 hover:bg-white/5 rounded-full transition-colors">
                    <User className="w-5 h-5 text-gray-400" />
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="p-2 hover:bg-white/5 rounded-full transition-colors text-gray-400"
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
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="text-gray-400 hover:text-white p-2"
              >
                {isMenuOpen ? <X /> : <Menu />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Sidebar */}
        <AnimatePresence>
          {isMenuOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm md:hidden"
                onClick={() => setIsMenuOpen(false)}
              />
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed top-0 right-0 h-full w-4/5 max-w-sm bg-surface border-l border-white/5 z-50 md:hidden p-6"
              >
                <div className="flex flex-col h-full">
                  <div className="flex justify-between items-center mb-10">
                    <span className="font-display font-bold text-2xl text-white">Menu</span>
                    <button onClick={() => setIsMenuOpen(false)} className="text-gray-400"><X /></button>
                  </div>

                  <div className="flex flex-col space-y-6">
                    {navLinks.map((link) => (
                      <Link
                        key={link.path}
                        to={link.path}
                        onClick={() => setIsMenuOpen(false)}
                        className="flex items-center space-x-4 text-lg font-medium text-gray-400 hover:text-primary transition-colors"
                      >
                        <link.icon className="w-6 h-6" />
                        <span>{link.name}</span>
                      </Link>
                    ))}
                  </div>

                  <div className="mt-auto pt-10 border-t border-white/5 space-y-4">
                    {user ? (
                      <>
                        <Link
                          to="/profile"
                          onClick={() => setIsMenuOpen(false)}
                          className="flex items-center space-x-4 text-gray-400"
                        >
                          <User className="w-6 h-6" />
                          <span>My Profile</span>
                        </Link>
                        <button
                          onClick={handleSignOut}
                          className="flex items-center space-x-4 text-gray-400 w-full text-left"
                        >
                          <LogOut className="w-6 h-6" />
                          <span>Sign Out</span>
                        </button>
                      </>
                    ) : (
                      <Link
                        to="/auth"
                        onClick={() => setIsMenuOpen(false)}
                        className="block w-full py-4 bg-primary text-center text-white font-bold rounded-xl"
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

      <footer className="bg-surface border-t border-white/5 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
            <div className="space-y-4">
              <div className="flex items-center space-x-2 cursor-default group">
                <div className="w-8 h-8 text-white flex items-center justify-center transition-transform duration-300 group-hover:scale-105">
                  <FideTvLogo className="w-full h-full" />
                </div>
                <span className="font-display font-bold text-xl text-white">FideTv</span>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed">
                Empowering creativity through digital media. Live streaming, professional event coverage, and creative production.
              </p>
            </div>
            
            <div>
              <h4 className="font-display font-bold text-sm uppercase tracking-widest text-primary mb-6">Explore</h4>
              <ul className="space-y-3 text-sm text-gray-400">
                <li><Link to="/live" className="hover:text-white transition-colors">Live Events</Link></li>
                <li><Link to="/content" className="hover:text-white transition-colors">Content Hub</Link></li>
                <li><Link to="/news" className="hover:text-white transition-colors">Platform News</Link></li>
                <li><Link to="/community" className="hover:text-white transition-colors">Community</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-display font-bold text-sm uppercase tracking-widest text-primary mb-6">Services</h4>
              <ul className="space-y-3 text-sm text-gray-400">
                <li><Link to="/services" className="hover:text-white transition-colors">Video Production</Link></li>
                <li><Link to="/services" className="hover:text-white transition-colors">Event Coverage</Link></li>
                <li><Link to="/services" className="hover:text-white transition-colors">Live Streaming</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-display font-bold text-sm uppercase tracking-widest text-primary mb-6">Connect</h4>
              <ul className="space-y-3 text-sm text-gray-400">
                <li><a href="https://youtube.com/@fidetvmedia?si=JkdixDjpkGPah9ay" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">YouTube Channel</a></li>
                <li><a href="mailto:fidetvonline@gmail.com" className="hover:text-white transition-colors">fidetvonline@gmail.com</a></li>
                <li><a href="https://wa.me/2348108889805" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">WhatsApp: 08108889805</a></li>
                <li><a href="tel:08124323608" className="hover:text-white transition-colors">Call: 08124323608</a></li>
                <li><Link to="/contact" className="hover:text-white transition-colors">Community Links</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="mt-12 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <p className="text-gray-500 text-xs text-center md:text-left">
              &copy; {new Date().getFullYear()} Fidetvmedia Creative Platform. All rights reserved.
            </p>
            <div className="flex space-x-6 text-xs text-gray-500 uppercase tracking-widest">
              <Link to="/profile" className="hover:text-primary transition-colors flex items-center gap-2">
                <Headset className="w-3 h-3" />
                Support
              </Link>
              <Link to="/policies" className="hover:text-primary transition-colors">Privacy</Link>
              <Link to="/policies" className="hover:text-primary transition-colors">Terms</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
