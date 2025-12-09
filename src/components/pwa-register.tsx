'use client'

import { useEffect } from 'react'

export function useServiceWorker() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      // Register service worker
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('[PWA] Service Worker registered:', registration.scope)
          
          // Check for updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // New version available
                  console.log('[PWA] New version available!')
                  // You can show a toast/notification here
                }
              })
            }
          })
        })
        .catch((error) => {
          console.error('[PWA] Service Worker registration failed:', error)
        })
    }
  }, [])
}

// Component version (add to your layout or page)
export function PWARegister() {
  useServiceWorker()
  return null
}

// Install prompt hook
export function useInstallPrompt() {
  useEffect(() => {
    let deferredPrompt: any = null

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault()
      deferredPrompt = e
      console.log('[PWA] Install prompt available')
      
      // You can show your own install button here
      // and call deferredPrompt.prompt() when clicked
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstall)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
    }
  }, [])
}
