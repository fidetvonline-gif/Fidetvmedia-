import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Lock, User, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        checkProfile(session.user.id);
      }
    });
  }, [navigate]);

  const checkProfile = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', userId)
      .single();
    
    const params = new URLSearchParams(window.location.search);
    const redirectUrl = params.get('redirect');

    if (redirectUrl) {
      navigate(redirectUrl);
    } else if (data?.username) {
      navigate('/profile');
    } else {
      navigate('/onboarding');
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        if (data.user) checkProfile(data.user.id);
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        
        setSuccess(true);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[90vh] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Accents */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[120px] -z-10" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[120px] -z-10" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-lg"
      >
        <div className="glass rounded-[3rem] p-8 sm:p-12 border-white/5 shadow-2xl space-y-10">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-primary/20 mb-8">
              <span className="text-white font-display font-bold text-2xl">F</span>
            </div>
            <h1 className="text-4xl font-display font-bold text-foreground tracking-tight">
              {isLogin ? 'Welcome Back' : 'Create Account'}
            </h1>
            <p className="text-text-muted font-medium">
              {isLogin ? 'Enter your details to access FideTV' : 'Join our creative media community today'}
            </p>
          </div>

          <AnimatePresence mode="wait">
            {success ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-green-500/10 border border-green-500/20 rounded-2xl p-8 text-center space-y-4"
              >
                <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto" />
                <h3 className="text-xl font-bold text-foreground">Check Your Email</h3>
                <p className="text-sm text-muted">
                  We've sent a verification link to <span className="text-foreground font-medium">{email}</span>. Please verify your account to continue.
                </p>
                <button
                  onClick={() => {
                    setSuccess(false);
                    setIsLogin(true);
                  }}
                  className="text-primary font-bold uppercase tracking-widest text-xs hover:underline"
                >
                  Back to Login
                </button>
              </motion.div>
            ) : (
              <motion.div
                key={isLogin ? 'login' : 'signup'}
                initial={{ opacity: 0, x: isLogin ? -20 : 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: isLogin ? 20 : -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center space-x-3 text-red-500 text-sm">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <form onSubmit={handleAuth} className="space-y-4">
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                    <input
                      type="email"
                      required
                      placeholder="Email Address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-surface border border-border-custom rounded-2xl pl-12 pr-4 py-4 focus:outline-none focus:border-primary/30 transition-all text-foreground placeholder-text-muted"
                    />
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                    <input
                      type="password"
                      required
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-surface border border-border-custom rounded-2xl pl-12 pr-4 py-4 focus:outline-none focus:border-primary/30 transition-all text-foreground placeholder-text-muted"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-primary text-white font-black uppercase tracking-[0.2em] py-5 rounded-2xl hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center justify-center space-x-3 shadow-xl shadow-primary/20"
                  >
                    <span>{loading ? 'Processing...' : isLogin ? 'Sign In' : 'Create Account'}</span>
                    {!loading && <ArrowRight className="w-5 h-5" />}
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-text-muted text-sm font-medium hover:text-foreground transition-colors"
            >
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <span className="text-primary font-bold uppercase tracking-widest ml-1 hover:underline">
                {isLogin ? 'Sign Up' : 'Log In'}
              </span>
            </button>
          </div>
        </div>
        
        <p className="text-center mt-8 text-xs text-text-muted font-medium">
          By continuing, you agree to FideTV's <Link to="/policies" className="hover:text-primary underline">Terms of Service</Link>
        </p>
      </motion.div>
    </div>
  );
}
