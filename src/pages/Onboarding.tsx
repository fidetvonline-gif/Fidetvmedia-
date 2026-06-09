import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { User, Camera, Info, ArrowRight, Loader2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Onboarding() {
  const [loading, setLoading] = useState(false);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [fullName, setFullName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [user, setUser] = useState<any>(null);

  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        navigate('/auth');
        return;
      }
      setUser(user);
      checkExistingProfile(user.id);
    });
  }, [navigate]);

  const checkExistingProfile = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', userId)
      .single();
    
    if (data?.username) {
      navigate('/profile');
    }
  };

  const checkUsername = async (val: string) => {
    if (val.length < 3) {
      setUsernameAvailable(null);
      return;
    }
    setCheckingUsername(true);
    const { data } = await supabase
      .from('profiles')
      .select('username')
      .eq('username', val.toLowerCase())
      .single();
    
    setUsernameAvailable(!data);
    setCheckingUsername(false);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (username) checkUsername(username);
    }, 500);
    return () => clearTimeout(timer);
  }, [username]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usernameAvailable) return;
    
    setLoading(true);
    setError(null);

    try {
      const { safeSessionStorage } = await import('@/lib/storage');
      const referredBy = safeSessionStorage.getItem('fidetv_referral') || undefined;

      const { error: profileError } = await supabase.from('profiles').upsert({
        id: user.id,
        username: username.toLowerCase(),
        full_name: fullName,
        bio: bio,
        avatar_url: avatarUrl,
        referred_by: referredBy,
      });

      if (profileError) throw profileError;

      navigate('/profile');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    try {
      setLoading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setAvatarUrl(publicUrl);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(242,125,38,0.05),transparent_50%)]" />
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-xl z-10"
      >
        <div className="glass rounded-[3rem] p-8 sm:p-12 border-border-custom shadow-2xl space-y-8">
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-display font-bold text-foreground tracking-tight">Complete Your Profile</h1>
            <p className="text-gray-500">Pick a unique username and tell us about yourself</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Avatar Upload */}
            <div className="flex flex-col items-center space-y-4">
              <div className="relative group">
                <div className="w-32 h-32 rounded-[2.5rem] bg-surface-bright border-2 border-dashed border-border-custom flex items-center justify-center overflow-hidden">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar Preview" className="w-full h-full object-cover" />
                  ) : (
                    <Camera className="w-8 h-8 text-text-muted" />
                  )}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <div className="absolute -bottom-2 -right-2 bg-primary p-2 rounded-xl shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="w-4 h-4 text-white" />
                </div>
              </div>
              <p className="text-[10px] uppercase font-black tracking-widest text-text-muted">Click to upload photo</p>
            </div>

            <div className="space-y-4">
              {/* Username Input */}
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-black tracking-widest text-text-muted ml-4">Username</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type="text"
                    required
                    placeholder="creator_name"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                    className="w-full bg-surface border border-border-custom rounded-2xl pl-12 pr-12 py-4 focus:outline-none focus:border-primary/30 transition-all text-foreground placeholder-text-muted"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    {checkingUsername ? (
                      <Loader2 className="w-4 h-4 text-text-muted animate-spin" />
                    ) : usernameAvailable === true ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : usernameAvailable === false ? (
                      <span className="text-[10px] text-red-500 font-bold">Taken</span>
                    ) : null}
                  </div>
                </div>
              </div>

              {/* Full Name Input */}
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-black tracking-widest text-text-muted ml-4">Display Name (Optional)</label>
                <div className="relative">
                  <Info className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type="text"
                    placeholder="John Doe"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-surface border border-border-custom rounded-2xl pl-12 pr-4 py-4 focus:outline-none focus:border-primary/30 transition-all text-foreground placeholder-text-muted"
                  />
                </div>
              </div>

              {/* Bio Input */}
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-black tracking-widest text-text-muted ml-4">Bio (Optional)</label>
                <textarea
                  placeholder="Tell us about yourself..."
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                  className="w-full bg-surface border border-border-custom rounded-2xl p-4 focus:outline-none focus:border-primary/30 transition-all text-foreground placeholder-text-muted resize-none"
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-500 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !usernameAvailable}
              className="w-full bg-primary text-white font-black uppercase tracking-[0.2em] py-5 rounded-2xl hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center justify-center space-x-3 shadow-xl shadow-primary/20"
            >
              <span>{loading ? 'Creating Profile...' : 'Launch Application'}</span>
              {!loading && <ArrowRight className="w-5 h-5" />}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
