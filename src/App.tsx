import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { safeLocalStorage, safeSessionStorage } from '@/lib/storage';
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
import Spaces from '@/pages/Spaces';
import Messages from '@/pages/Messages';
import Admin from '@/pages/Admin';
import Partner from '@/pages/Partner';
import Onboarding from '@/pages/Onboarding';
import Policies from '@/pages/Policies';
import DownloadApp from '@/pages/DownloadApp';
import Advertise from '@/pages/Advertise';
import ReloadPrompt from '@/components/ReloadPrompt';
import InstallPrompt from '@/components/InstallPrompt';
import MessageNotifier from '@/components/MessageNotifier';
import MonetagScript from '@/components/MonetagScript';
import SplashScreen from '@/components/SplashScreen';
import { ErrorBoundary } from '@/components/ErrorBoundary';

function AnalyticsTracker() {
  const location = useLocation();
  
  useEffect(() => {
    // 1. Breadcrumbs telemetry setup for crash analytics
    const originalConsole = {
      log: console.log,
      warn: console.warn,
      error: console.error,
      info: console.info
    };
    
    // Store last 20 breadcrumbs
    const breadcrumbs: { type: string, message: string, time: string }[] = [];
    const MAX_BREADCRUMBS = 20;
    
    const pushBreadcrumb = (type: string, args: any[]) => {
      try {
        const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
        breadcrumbs.push({ type, message: msg.substring(0, 500), time: new Date().toISOString() });
        if (breadcrumbs.length > MAX_BREADCRUMBS) {
          breadcrumbs.shift();
        }
      } catch (e) {}
    };

    console.log = (...args) => { originalConsole.log(...args); pushBreadcrumb('log', args); };
    console.warn = (...args) => { originalConsole.warn(...args); pushBreadcrumb('warn', args); };
    console.info = (...args) => { originalConsole.info(...args); pushBreadcrumb('info', args); };
    console.error = (...args) => { originalConsole.error(...args); pushBreadcrumb('error', args); };

    // Send telemetry before crash
    const sendTelemetry = async (message: string, stack?: string) => {
      try {
        await supabase.from('error_logs').insert({
          message: String(message).substring(0, 1000),
          stack: stack ? String(stack).substring(0, 2000) : null,
          breadcrumbs: breadcrumbs,
          user_agent: navigator.userAgent,
          url: window.location.href
        });
      } catch (e) {
        // Silently fail if table doesn't exist
      }
    };

    const handleWindowError = (event: ErrorEvent) => {
      sendTelemetry(event.message, event.error?.stack);
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      sendTelemetry(reason?.message || String(reason), reason?.stack);
    };

    window.addEventListener('error', handleWindowError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    const trackVisit = async () => {
      // Use a session storage flag to avoid double counting page refreshes during the same session
      const sessionTracked = safeSessionStorage.getItem('fidetv_tracked');
      if (!sessionTracked) {
        // Track locally
        try {
          const localVisits = parseInt(safeLocalStorage.getItem('fidetv_local_visits') || '0', 10);
          safeLocalStorage.setItem('fidetv_local_visits', (localVisits + 1).toString());
        } catch (e) {
          // ignore localStorage failure in private modes
        }

        try {
          const sessionId = (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') 
            ? crypto.randomUUID() 
            : Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
          await supabase.from('site_visits').insert({ session_id: sessionId });
          safeSessionStorage.setItem('fidetv_tracked', 'true');
        } catch (e) {
          // Silently fail if table doesn't exist yet
        }
      }
    };
    trackVisit();

    return () => {
      window.removeEventListener('error', handleWindowError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      console.log = originalConsole.log;
      console.warn = originalConsole.warn;
      console.error = originalConsole.error;
      console.info = originalConsole.info;
    };
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
            <Route path="/spaces" element={<Spaces />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/policies" element={<Policies />} />
            <Route path="/download" element={<DownloadApp />} />
            <Route path="/advertise" element={<Advertise />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </ErrorBoundary>
      <ReloadPrompt />
      <InstallPrompt />
      <MessageNotifier />
      <MonetagScript />
    </Router>
  );
}
