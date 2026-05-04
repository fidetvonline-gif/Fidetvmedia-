import React from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'

export default function ReloadPrompt() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('SW Registered: ', r)
    },
    onRegisterError(error) {
      console.error('SW registration error', error)
    },
  })

  const close = () => {
    setOfflineReady(false)
    setNeedRefresh(false)
  }

  if (!offlineReady && !needRefresh) return null

  return (
    <div className="fixed bottom-24 right-6 z-[9999] pointer-events-none">
      <div className="bg-black/80 backdrop-blur-xl p-6 rounded-[2rem] border border-white/10 shadow-2xl flex flex-col gap-4 min-w-[320px] pointer-events-auto animate-in fade-in slide-in-from-bottom-5 duration-500">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center">
            <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </div>
          <div className="flex-1">
            <h4 className="text-white font-display font-bold text-lg">
              {offlineReady ? 'Ready Offline' : 'Update Available'}
            </h4>
            <p className="text-gray-400 text-sm">
              {offlineReady 
                ? 'App is ready to work offline' 
                : 'New version is available. Click reload to update.'}
            </p>
          </div>
        </div>
        
        <div className="flex gap-3 mt-2">
          {needRefresh && (
            <button
              onClick={() => updateServiceWorker(true)}
              className="flex-1 bg-primary text-white px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-primary/80 transition-all active:scale-95"
            >
              Reload Now
            </button>
          )}
          <button
            onClick={() => close()}
            className="flex-1 bg-white/5 text-gray-300 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-white/10 transition-all"
          >
            Later
          </button>
        </div>
      </div>
    </div>
  )
}
