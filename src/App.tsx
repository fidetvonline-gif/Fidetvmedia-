import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import Layout from '@/components/Layout';
import Home from '@/pages/Home';
import About from '@/pages/About';
import Services from '@/pages/Services';
import Content from '@/pages/Content';
import Contact from '@/pages/Contact';
import Live from '@/pages/Live';
import Community from '@/pages/Community';
import CommunityDetail from '@/pages/CommunityDetail';
import News from '@/pages/News';
import NewsDetail from '@/pages/NewsDetail';
import Booking from '@/pages/Booking';
import Auth from '@/pages/Auth';
import Profile from '@/pages/Profile';
import Messages from '@/pages/Messages';
import Admin from '@/pages/Admin';
import Partner from '@/pages/Partner';
import Onboarding from '@/pages/Onboarding';
import Policies from '@/pages/Policies';
import DownloadApp from '@/pages/DownloadApp';
import ReloadPrompt from '@/components/ReloadPrompt';
import InstallPrompt from '@/components/InstallPrompt';
import MessageNotifier from '@/components/MessageNotifier';
import SplashScreen from '@/components/SplashScreen';
import { ErrorBoundary } from '@/components/ErrorBoundary';

function AnalyticsTracker() {
  const location = useLocation();
  
  useEffect(() => {
    const trackVisit = async () => {
      // Use a session storage flag to avoid double counting page refreshes during the same session
      const sessionTracked = sessionStorage.getItem('fidetv_tracked');
      if (!sessionTracked) {
        // Track locally
        try {
          const localVisits = parseInt(localStorage.getItem('fidetv_local_visits') || '0', 10);
          localStorage.setItem('fidetv_local_visits', (localVisits + 1).toString());
        } catch (e) {
          // ignore localStorage failure in private modes
        }

        try {
          await supabase.from('site_visits').insert({ session_id: crypto.randomUUID() });
          sessionStorage.setItem('fidetv_tracked', 'true');
        } catch (e) {
          // Silently fail if table doesn't exist yet
        }
      }
    };
    trackVisit();
  }, []); // Only track once per app load/session

  return null;
}

export default function App() {
  return (
    <Router>
      <AnalyticsTracker />
      <ErrorBoundary>
        <SplashScreen />
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/services" element={<Services />} />
            <Route path="/content" element={<Content />} />
            <Route path="/portfolio" element={<Navigate to="/content" replace />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/live" element={<Live />} />
            <Route path="/community" element={<Community />} />
            <Route path="/community/:id" element={<CommunityDetail />} />
            <Route path="/news" element={<News />} />
            <Route path="/news/:slug" element={<NewsDetail />} />
            <Route path="/booking" element={<Booking />} />
            <Route path="/partner" element={<Partner />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/profile/:username" element={<Profile />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/policies" element={<Policies />} />
            <Route path="/download" element={<DownloadApp />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </ErrorBoundary>
      <ReloadPrompt />
      <InstallPrompt />
      <MessageNotifier />
    </Router>
  );
}
