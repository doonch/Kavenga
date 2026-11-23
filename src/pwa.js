/**
 * Progressive Web App runtime helpers for Kavenga: Songs of the Star Path.
 * - Registers the two-tier `./sw.js` Service Worker
 * - Requests persistent browser storage for save data & cached assets
 * - Gently warms base audio tracks into Tier-2 `AUDIO_CACHE` after idle boot
 * - Manages Screen Wake Lock during active voyages, Sky Vigils, and the intro sequence
 */

let _wakeLockSentinel = null;
let _wakeLockDesired = false;
let _visibilityBound = false;

async function _syncWakeLock() {
  if (typeof navigator === 'undefined' || !navigator.wakeLock?.request) return;
  if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
    return;
  }

  if (_wakeLockDesired && !_wakeLockSentinel) {
    try {
      const sentinel = await navigator.wakeLock.request('screen');
      _wakeLockSentinel = sentinel;
      sentinel.addEventListener('release', () => {
        if (_wakeLockSentinel === sentinel) {
          _wakeLockSentinel = null;
        }
      });
    } catch {
      // Ignore if battery saver or OS policy declines wake lock
    }
  } else if (!_wakeLockDesired && _wakeLockSentinel) {
    const sentinel = _wakeLockSentinel;
    _wakeLockSentinel = null;
    try {
      await sentinel.release();
    } catch {
      // Ignore release errors
    }
  }
}

export function setScreenWakeLock(active) {
  _wakeLockDesired = Boolean(active);
  if (!_visibilityBound && typeof document !== 'undefined') {
    _visibilityBound = true;
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && _wakeLockDesired) {
        _syncWakeLock();
      }
    });
  }
  _syncWakeLock();
}

export function initPWA({ warmAudioUrls = [] } = {}) {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return;

  // Prevent iPadOS / iOS long-press text selection and callout menus on non-input UI
  const isEditable = (el) => {
    const tag = el?.tagName;
    return (
      tag === 'INPUT' ||
      tag === 'TEXTAREA' ||
      tag === 'SELECT' ||
      Boolean(el?.isContentEditable)
    );
  };
  document.addEventListener('selectstart', (e) => {
    if (!isEditable(e.target)) {
      e.preventDefault();
    }
  });
  document.addEventListener('contextmenu', (e) => {
    if (!isEditable(e.target) && !e.target?.closest?.('a[href]')) {
      e.preventDefault();
    }
  });
  document.addEventListener(
    'dblclick',
    (e) => {
      if (!isEditable(e.target)) {
        e.preventDefault();
      }
    },
    { passive: false }
  );

  // Request persistent storage on first user gesture so iPadOS / browsers retain saves & caches
  const requestPersistenceOnce = () => {
    window.removeEventListener('pointerdown', requestPersistenceOnce);
    window.removeEventListener('keydown', requestPersistenceOnce);
    try {
      navigator.storage?.persist?.().catch?.(() => {});
    } catch {
      // Ignore unsupported environments
    }
  };
  window.addEventListener('pointerdown', requestPersistenceOnce, { passive: true });
  window.addEventListener('keydown', requestPersistenceOnce, { passive: true });

  const isSecureContextForSW =
    window.location.protocol === 'https:' ||
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1';

  if (!isSecureContextForSW || !('serviceWorker' in navigator)) return;

  const registerSW = async () => {
    try {
      const reg = await navigator.serviceWorker.register('./sw.js', {
        scope: './',
      });

      if (
        warmAudioUrls.length > 0 &&
        navigator.onLine !== false &&
        !navigator.connection?.saveData
      ) {
        const scheduleIdle =
          window.requestIdleCallback || ((cb) => window.setTimeout(cb, 4500));
        scheduleIdle(() => {
          const sw = reg.active || navigator.serviceWorker.controller;
          sw?.postMessage?.({
            type: 'WARM_AUDIO',
            urls: warmAudioUrls,
          });
        });
      }
    } catch {
      // Service worker registration failed or restricted; app continues normally
    }
  };

  if (document.readyState === 'complete') {
    registerSW();
  } else {
    window.addEventListener('load', registerSW, { once: true });
  }
}
