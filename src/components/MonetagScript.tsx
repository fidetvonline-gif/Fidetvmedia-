import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function MonetagScript() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    let unmounted = false;

    const checkAndInjectAd = async () => {
      try {
        const { data, error } = await supabase
          .from('site_settings')
          .select('value')
          .eq('key', 'enable_monetag_ads')
          .single();

        if (!error && data && data.value === 'true' && !unmounted) {
          // It's enabled, inject script if not in sandbox
          const isSandbox = window.location.hostname.includes('run.app') || 
                            window.location.hostname.includes('localhost') || 
                            window.location.hostname.includes('127.0.0.1');
          
          if (!isSandbox) {
            setEnabled(true);
          }
        }
      } catch (e) {
        console.error('Error fetching monetag settings', e);
      }
    };

    checkAndInjectAd();

    return () => {
      unmounted = true;
    };
  }, []);

  if (!enabled) return null;

  const iframeContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="monetag" content="2d71963211b85402661e72ae5efec30e">
        <script src="https://5gvci.com/act/files/tag.min.js?z=11059845" data-cfasync="false" async></script>
      </head>
      <body>
        <script>
          try {
            (function(s){s.dataset.zone='11059847';s.src='https://al5sm.com/tag.min.js'})([document.documentElement, document.body].filter(Boolean).pop().appendChild(document.createElement('script')));
          } catch(e) { console.warn(e); }
          try {
            (function(s){s.dataset.zone='11059908';s.src='https://nap5k.com/tag.min.js'})([document.documentElement, document.body].filter(Boolean).pop().appendChild(document.createElement('script')));
          } catch(e) { console.warn(e); }
        </script>
      </body>
    </html>
  `;

  return (
    <ErrorBoundary>
      <iframe
        title="Advertisement"
        srcDoc={iframeContent}
        sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox allow-same-origin"
        style={{ width: 0, height: 0, border: 'none', position: 'absolute', visibility: 'hidden' }}
      />
    </ErrorBoundary>
  );
}
