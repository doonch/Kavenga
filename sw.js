/**
 * Kavenga: Songs of the Star Path — Two-Tier PWA Service Worker.
 *
 * Tier 1 (`CORE_CACHE`):
 *   - Precaches the ~7.5 MB player-facing app shell, ES2022 modules, Three.js,
 *     stylesheets, icons, banners, and character portraits on `install`.
 *   - Serves HTML navigations Network-First (falling back to precache offline)
 *     and static modules/images Exact-Cache -> Network -> Precache (`ignoreSearch: true`),
 *     staying compatible with `<script type="importmap">` `?v=...` cache-busting.
 *
 * Tier 2 (`AUDIO_CACHE`):
 *   - Caches music and elder voice MP3s on demand (and via optional background warm-up)
 *     without blocking initial PWA installation.
 *   - Implements full HTTP `206 Partial Content` byte-range slicing so WebKit / Safari
 *     `<audio>` elements play seamlessly from cache on iPadOS, iOS, and macOS.
 */

const CORE_CACHE = 'kavenga-core-v19';
const AUDIO_CACHE = 'kavenga-audio-v1';
const VALID_CACHES = new Set([CORE_CACHE, AUDIO_CACHE]);

const CORE_PRECACHE_URLS = [
  './',
  './index.html',
  './intro.html',
  './styles.css',
  './manifest.webmanifest',
  './favicon.ico',
  './vendor/three.module.min.js',

  // Entry & PWA helper modules
  './src/main.js',
  './src/intro.js',
  './src/pwa.js',

  // Core state & managers
  './src/core/achievementsManager.js',
  './src/core/campaignManager.js',
  './src/core/gameConstants.js',
  './src/core/gameState.js',
  './src/core/objectivesManager.js',

  // Declarative data catalogs
  './src/data/achievementsData.js',
  './src/data/constellationLessonsData.js',
  './src/data/constellationSilhouettesData.js',
  './src/data/constellationsData.js',
  './src/data/islandsData.js',
  './src/data/objectivesData.js',
  './src/data/playerCharactersData.js',
  './src/data/sandDiagramsData.js',
  './src/data/skyVigilData.js',
  './src/data/songsData.js',
  './src/data/voiceLinesData.js',
  './src/data/walkableIslandsData.js',

  // Simulation
  './src/simulation/celestialSim.js',
  './src/simulation/hullPhysics.js',
  './src/simulation/oceanSim.js',
  './src/simulation/shadowCraft.js',

  // 3D Rendering
  './src/rendering/CameraController.js',
  './src/rendering/CloudSculptBuilder.js',
  './src/rendering/CrewCharacterBuilder.js',
  './src/rendering/IslandAct1RemainBuilder.js',
  './src/rendering/IslandAct2Builder.js',
  './src/rendering/IslandAct3Builder.js',
  './src/rendering/IslandPropsBuilder.js',
  './src/rendering/IslandRapaNuiBuilder.js',
  './src/rendering/IslandSculptToolkit.js',
  './src/rendering/IslandTerrainBuilder.js',
  './src/rendering/OceanRenderer.js',
  './src/rendering/PlayerCharacterBuilder.js',
  './src/rendering/ShoreDioramaRenderer.js',
  './src/rendering/SkyDomeRenderer.js',
  './src/rendering/StarRingRenderer.js',
  './src/rendering/VakaCargoPropsBuilder.js',
  './src/rendering/VakaRenderer.js',
  './src/rendering/WalkableIslandScene.js',
  './src/rendering/WorldCuesRenderer.js',

  // Audio engines
  './src/audio/BackgroundMusicEngine.js',
  './src/audio/ChantAndDrumEngine.js',
  './src/audio/SpatialSeaAudio.js',
  './src/audio/VoiceOverEngine.js',

  // UI components
  './src/ui/AchievementsUI.js',
  './src/ui/CanoeModalUI.js',
  './src/ui/canoePanelWidgets.js',
  './src/ui/CrewSplashUI.js',
  './src/ui/ElderVigilPromptUI.js',
  './src/ui/IslandHubUI.js',
  './src/ui/IslandSettingsUI.js',
  './src/ui/OnboardingTourUI.js',
  './src/ui/SailingHUD.js',
  './src/ui/SandCanvas.js',
  './src/ui/SkyVigilUI.js',
  './src/ui/WalkableIslandUI.js',

  // Icons & key artwork
  './assets/banner.png',
  './assets/vaka_moana.jpg',
  './assets/icons/apple-touch-icon.png',
  './assets/icons/favicon-32.png',
  './assets/icons/favicon-64.png',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/icon-maskable-512.png',
  './assets/icons/vaka_button_1sail.jpg',
  './assets/icons/vaka_button_2sails.jpg',
  './assets/icons/walk_button.jpg',

  // Crew & player portraits
  './assets/crew/adam.png',
  './assets/crew/dan.png',
  './assets/crew/kahu.webp',
  './assets/crew/moana.webp',
  './assets/crew/player_easy.jpg',
  './assets/crew/player_hard.jpg',
  './assets/crew/player_master_navigator.jpg',
  './assets/crew/player_medium.jpg',
  './assets/crew/tama.webp',

  // Mentor portraits
  './assets/mentors/arii.webp',
  './assets/mentors/council_ancestral_wayfinders.webp',
  './assets/mentors/elder_manu.webp',
  './assets/mentors/elder_metua.webp',
  './assets/mentors/elder_rongo.webp',
  './assets/mentors/first_master_terai.webp',
  './assets/mentors/hina.webp',
  './assets/mentors/keeper_akura.webp',
  './assets/mentors/master_teiki.webp',
  './assets/mentors/oihanu.webp',
  './assets/mentors/swell_master_pohaku.webp',
  './assets/mentors/tahia.webp',
  './assets/mentors/tane.webp',
  './assets/mentors/vaea.webp',
  './assets/mentors/vaihere.webp',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CORE_CACHE);
      await cache.addAll(CORE_PRECACHE_URLS);
      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => !VALID_CACHES.has(key))
          .map((key) => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

function isAudioAssetPathname(pathname) {
  return pathname.includes('/assets/audio/') && pathname.endsWith('.mp3');
}

async function buildRangeAudioResponse(request, fullResponse) {
  const rangeHeader = request.headers.get('range');
  if (!rangeHeader) {
    const headers = new Headers(fullResponse.headers);
    if (!headers.has('Accept-Ranges')) {
      headers.set('Accept-Ranges', 'bytes');
    }
    return new Response(fullResponse.body, {
      status: 200,
      statusText: 'OK',
      headers,
    });
  }

  const buffer = await fullResponse.arrayBuffer();
  const total = buffer.byteLength;
  const match = /bytes=(\d*)-(\d*)/i.exec(rangeHeader);
  if (!match || total === 0) {
    return new Response(null, {
      status: 416,
      statusText: 'Range Not Satisfiable',
      headers: { 'Content-Range': `bytes */${total}` },
    });
  }

  let start = match[1] ? parseInt(match[1], 10) : 0;
  let end = match[2] ? parseInt(match[2], 10) : total - 1;
  if (!match[1] && match[2]) {
    const suffixLen = parseInt(match[2], 10);
    start = Math.max(0, total - suffixLen);
    end = total - 1;
  }
  if (end >= total) {
    end = total - 1;
  }
  if (Number.isNaN(start) || Number.isNaN(end) || start > end || start >= total) {
    return new Response(null, {
      status: 416,
      statusText: 'Range Not Satisfiable',
      headers: { 'Content-Range': `bytes */${total}` },
    });
  }

  const chunk = buffer.slice(start, end + 1);
  return new Response(chunk, {
    status: 206,
    statusText: 'Partial Content',
    headers: {
      'Content-Type': fullResponse.headers.get('Content-Type') || 'audio/mpeg',
      'Content-Length': String(chunk.byteLength),
      'Content-Range': `bytes ${start}-${end}/${total}`,
      'Accept-Ranges': 'bytes',
    },
  });
}

async function handleAudioFetch(request, url) {
  const cleanUrl = url.origin + url.pathname;
  const cache = await caches.open(AUDIO_CACHE);
  let cached = await cache.match(cleanUrl);

  if (!cached) {
    try {
      // Fetch full un-ranged body so Cache API receives a complete 200 OK file
      const netRes = await fetch(cleanUrl);
      if (netRes && netRes.status === 200) {
        await cache.put(cleanUrl, netRes.clone());
        cached = netRes;
      } else if (netRes) {
        return netRes;
      }
    } catch {
      // Offline & uncached: fall through to native network error for graceful audio skip
      return fetch(request);
    }
  }

  return buildRangeAudioResponse(request, cached);
}

async function handleNavigationFetch(request) {
  const cache = await caches.open(CORE_CACHE);
  try {
    const netRes = await fetch(request);
    if (netRes && netRes.ok) {
      await cache.put(request, netRes.clone());
      return netRes;
    }
  } catch {
    // Offline: serve precached HTML shell
  }
  const fallback =
    (await cache.match(request, { ignoreSearch: true })) ||
    (await cache.match('./index.html'));
  return fallback || Response.error();
}

async function handleCoreAssetFetch(request) {
  const cache = await caches.open(CORE_CACHE);

  // 1. Exact URL match (respects ?v=... query string bumps!)
  const exact = await cache.match(request);
  if (exact) return exact;

  // 2. Online fetch and store under exact URL
  try {
    const netRes = await fetch(request);
    if (netRes && netRes.status === 200) {
      await cache.put(request, netRes.clone());
    }
    return netRes;
  } catch {
    // 3. Offline fallback: match precached asset ignoring ?v=... query suffix
    const fallback = await cache.match(request, { ignoreSearch: true });
    if (fallback) return fallback;
    throw new Error('Offline and asset not in precache');
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Tier 2: Runtime + Range-aware Audio Cache
  if (isAudioAssetPathname(url.pathname)) {
    event.respondWith(handleAudioFetch(request, url));
    return;
  }

  // HTML Document Navigations
  if (
    request.mode === 'navigate' ||
    request.destination === 'document' ||
    url.pathname.endsWith('.html')
  ) {
    event.respondWith(handleNavigationFetch(request));
    return;
  }

  // Tier 1: Core App Shell, ES Modules, Styles & Portraits
  event.respondWith(handleCoreAssetFetch(request));
});

self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data) return;

  if (data.type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }

  if (data.type === 'WARM_AUDIO' && Array.isArray(data.urls)) {
    event.waitUntil(
      (async () => {
        const cache = await caches.open(AUDIO_CACHE);
        for (const relUrl of data.urls) {
          try {
            const absUrl = new URL(relUrl, self.location.href);
            const cleanUrl = absUrl.origin + absUrl.pathname;
            const exists = await cache.match(cleanUrl);
            if (!exists) {
              const res = await fetch(cleanUrl);
              if (res && res.status === 200) {
                await cache.put(cleanUrl, res);
              }
            }
          } catch {
            // Best-effort background warm-up; ignore network errors
          }
        }
      })()
    );
  }
});
