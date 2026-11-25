/**
 * Shared UI builders for Canoe & Star-Path Departure panels across
 * `CanoeModalUI` and the walkable shore Vaka POI in `WalkableIslandUI`.
 *
 * Strictly zero cardinal directions or degree numbers in all player-facing copy.
 */

import { Difficulty, departureWindowLabel } from '../core/gameConstants.js';
import {
  CANOE_ROUTE_FILTERS,
  CARGO_CATALOG,
  CREW_CATALOG,
} from '../core/campaignManager.js';
import { ISLANDS } from '../data/islandsData.js';
import { getPlayerCharacterProfile } from '../data/playerCharactersData.js';

/**
 * Render archipelago filter pills inside `.canoe-section-head` once `gs.masterReplayUnlocked` is true.
 */
export function renderCanoeRouteFilterPills({
  containerEl,
  gs,
  activeFilter = 'local',
  onSelectFilter,
}) {
  if (!containerEl) return;
  if (!gs?.masterReplayUnlocked) {
    containerEl.classList.add('hidden');
    containerEl.innerHTML = '';
    return;
  }

  containerEl.classList.remove('hidden');
  containerEl.innerHTML = '';
  for (const filter of CANOE_ROUTE_FILTERS) {
    const isActive = filter.id === activeFilter;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `canoe-filter-pill${isActive ? ' active' : ''}`;
    btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    btn.textContent = filter.label;
    btn.addEventListener('click', () => {
      if (filter.id !== activeFilter) {
        onSelectFilter?.(filter.id);
      }
    });
    containerEl.appendChild(btn);
  }
}

/**
 * Render destination island cards (3D thumbnail once discovered, "?" silhouette before)
 * into `containerEl`, or fallback empty HTML when no routes are available.
 */
export function renderDestinationIslandCards({
  containerEl,
  routes,
  gs,
  getIslandThumbnailUrl,
  isAnthology = false,
  emptyHtml = '',
  onEmptyAction = null,
  emptyActionSelector = null,
  onSelectRoute,
}) {
  if (!containerEl) return;
  containerEl.classList.toggle('anthology-mode', Boolean(isAnthology));

  if (!routes || routes.length === 0) {
    containerEl.innerHTML = emptyHtml;
    if (emptyActionSelector && onEmptyAction) {
      containerEl
        .querySelector(emptyActionSelector)
        ?.addEventListener('click', onEmptyAction);
    }
    return;
  }

  containerEl.innerHTML = '';
  for (const route of routes) {
    const { song, isAnthology: routeAnthology } = route;
    const showSub = Boolean(isAnthology || routeAnthology);
    const dstId = song.toIsland;
    const dst = ISLANDS[dstId];
    const dstName = dst?.name || dstId;
    const fromName = ISLANDS[song.fromIsland]?.name || song.fromIsland;
    const isDiscovered = Boolean(
      gs.discoveredIslands?.[dstId] || (gs.masterReplayUnlocked && !song.isSecret)
    );
    const thumbUrl = isDiscovered ? getIslandThumbnailUrl?.(dstId) : null;

    const songBadge = song.isSecret
      ? 'Secret Chant'
      : song.number === 'R'
        ? 'Return Chant'
        : `Song ${song.number}`;
    const tipText = showSub
      ? `${songBadge}: ${song.title} · From ${fromName} to ${dstName}`
      : `${songBadge}: ${song.title}`;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `canoe-island-card ${isDiscovered ? 'discovered' : 'undiscovered'}`;
    btn.setAttribute('aria-label', showSub ? `${dstName} (${songBadge})` : dstName);
    btn.setAttribute('data-tooltip', tipText);

    const artHtml = isDiscovered
      ? thumbUrl
        ? `<img class="canoe-island-thumb" src="${thumbUrl}" alt="${dstName}" />`
        : `<span class="canoe-island-card-mystery" aria-hidden="true">🏝️</span>`
      : `<span class="canoe-island-card-mystery" aria-hidden="true">?</span>`;

    btn.innerHTML = `
      <div class="canoe-island-card-art">${artHtml}</div>
      <div class="canoe-island-card-name">${dstName}</div>
      ${showSub ? `<div class="canoe-island-card-sub">${songBadge}</div>` : ''}
    `;
    btn.addEventListener('click', () => {
      onSelectRoute?.(song, route);
    });
    containerEl.appendChild(btn);
  }
}

/**
 * Render the horizontal Crew row (player + assigned crew) and Quest Storage row
 * with `[data-tooltip]` attributes and click callbacks for lightbox inspection.
 */
export function renderCrewAndCargoRows({
  crewContainerEl,
  cargoSectionEl,
  cargoContainerEl,
  gs,
  onPlayerClick,
  onCrewClick,
  onCargoClick,
}) {
  if (!gs) return;

  if (crewContainerEl) {
    crewContainerEl.innerHTML = '';
    const playerProfile = getPlayerCharacterProfile(gs.difficulty);
    const playerPortrait = `./assets/crew/player_${gs.difficulty || 'easy'}.jpg`;
    const playerCard = document.createElement('button');
    playerCard.type = 'button';
    playerCard.className = 'crew-card crew-card-btn';
    playerCard.setAttribute('data-tooltip', playerProfile.title);
    playerCard.innerHTML = `
      <div class="crew-card-art">
        <img src="${playerPortrait}" alt="${playerProfile.title}" />
      </div>
      <div class="crew-card-name">You</div>
      <div class="crew-card-role">${playerProfile.title}</div>
    `;
    playerCard.addEventListener('click', () => onPlayerClick?.(gs.difficulty));
    crewContainerEl.appendChild(playerCard);

    for (const crId of gs.assignedCrew) {
      const cr = CREW_CATALOG[crId];
      if (!cr) continue;
      const homeIsl = ISLANDS[cr.homeIslandId];
      const crewTip = `${cr.name} · ${cr.role}${homeIsl ? ` (${homeIsl.name})` : ''} — ${cr.traitText}`;
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'crew-card crew-card-btn';
      card.setAttribute('data-tooltip', crewTip);
      card.innerHTML = `
        <div class="crew-card-art">
          ${cr.portrait ? `<img src="${cr.portrait}" alt="${cr.name}" />` : ''}
        </div>
        <div class="crew-card-name">${cr.name}</div>
        <div class="crew-card-role">${cr.role}</div>
      `;
      card.addEventListener('click', () => onCrewClick?.(crId));
      crewContainerEl.appendChild(card);
    }
  }

  if (cargoSectionEl && cargoContainerEl) {
    if (gs.cargoItems.length === 0) {
      cargoSectionEl.classList.add('hidden');
      cargoContainerEl.innerHTML = '';
    } else {
      cargoSectionEl.classList.remove('hidden');
      cargoContainerEl.innerHTML = '';
      for (const cid of gs.cargoItems) {
        const item = CARGO_CATALOG[cid] || { name: cid, description: '' };
        const srcIsl = item.sourceIslandId ? ISLANDS[item.sourceIslandId] : null;
        const tip = `${item.name}${srcIsl ? ` (${srcIsl.name})` : ''}${item.description ? ` — ${item.description}` : ''}`;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'cargo-item-card';
        btn.setAttribute('data-tooltip', tip);
        btn.setAttribute('aria-label', item.name);
        btn.innerHTML = `<img class="cargo-item-img" src="./assets/cargo/${cid}.jpg" alt="${item.name}" />`;
        btn.addEventListener('click', () => onCargoClick?.(cid));
        cargoContainerEl.appendChild(btn);
      }
    }
  }
}

/**
 * Create a clamped floating tooltip controller anchored to `getBoundsEl()`
 * (falling back to viewport edges when `getBoundsEl` returns null).
 */
export function createClampedTooltipController({ tipEl, getBoundsEl }) {
  const hide = () => {
    tipEl?.classList.add('hidden');
  };

  const show = (target) => {
    const text = target?.getAttribute?.('data-tooltip');
    if (!tipEl || !text) return;

    const boundsEl = getBoundsEl?.();
    const cRect = boundsEl
      ? boundsEl.getBoundingClientRect()
      : {
          left: 0,
          top: 0,
          right: typeof window !== 'undefined' ? window.innerWidth : 1024,
          bottom: typeof window !== 'undefined' ? window.innerHeight : 768,
        };

    tipEl.textContent = text;
    tipEl.classList.remove('hidden');

    const tRect = target.getBoundingClientRect();
    const tipRect = tipEl.getBoundingClientRect();
    const pad = 10;

    let left = tRect.left + (tRect.width - tipRect.width) * 0.5;
    left = Math.max(
      cRect.left + pad,
      Math.min(cRect.right - tipRect.width - pad, left)
    );

    let top = tRect.top - tipRect.height - 8;
    if (top < cRect.top + pad) {
      top = tRect.bottom + 8;
    }
    top = Math.max(
      cRect.top + pad,
      Math.min(cRect.bottom - tipRect.height - pad, top)
    );

    tipEl.style.left = `${Math.round(left)}px`;
    tipEl.style.top = `${Math.round(top)}px`;
  };

  let lastTouchTs = 0;
  const canHover = () =>
    typeof window !== 'undefined' &&
    window.matchMedia?.('(hover: hover) and (pointer: fine)')?.matches !== false &&
    Date.now() - lastTouchTs > 650;

  const bindContainer = (containerEl, scrollEl = null) => {
    if (!containerEl) return;
    containerEl.addEventListener(
      'touchstart',
      () => {
        lastTouchTs = Date.now();
        hide();
      },
      { passive: true }
    );
    containerEl.addEventListener(
      'pointerdown',
      (e) => {
        if (e.pointerType === 'touch') {
          lastTouchTs = Date.now();
          hide();
        }
      },
      { passive: true }
    );
    containerEl.addEventListener('click', hide);
    const onShow = (e) => {
      if (!canHover()) return;
      const target = e.target?.closest?.('[data-tooltip]');
      if (target) show(target);
    };
    const onHide = (e) => {
      const target = e.target?.closest?.('[data-tooltip]');
      if (!target) return;
      if (e.relatedTarget && target.contains(e.relatedTarget)) return;
      hide();
    };
    containerEl.addEventListener('mouseover', onShow);
    containerEl.addEventListener('mouseout', onHide);
    containerEl.addEventListener('focusin', (e) => {
      if (Date.now() - lastTouchTs <= 650) return;
      const target = e.target?.closest?.('[data-tooltip]');
      if (target) show(target);
    });
    containerEl.addEventListener('focusout', onHide);
    scrollEl?.addEventListener('scroll', hide, { passive: true });
  };

  return { show, hide, bindContainer };
}

/**
 * Shared HTML template for the secondary Destination Voyage Confirmation dialog.
 */
export function buildVoyageConfirmModalHtml({
  modalId,
  eyebrowId,
  titleId,
  closeBtnId,
  songPreviewId,
  departureSectionId,
  recHintId,
  depBtnsId,
  cancelBtnId,
  sailBtnId,
}) {
  return `
    <div class="modal-backdrop settings-confirm-backdrop hidden" id="${modalId}">
      <div class="dialog-card canoe-confirm-card" role="dialog" aria-modal="true" aria-labelledby="${titleId}">
        <div class="island-settings-header canoe-modal-header">
          <div>
            <div class="sanctuary-eyebrow" id="${eyebrowId}"></div>
            <h3 id="${titleId}"></h3>
          </div>
          <button class="walkable-close-btn" id="${closeBtnId}" type="button" title="Close (Esc)">✕</button>
        </div>
        <div class="song-preview-box canoe-confirm-song-box" id="${songPreviewId}"></div>
        <div class="departure-picker canoe-confirm-departure" id="${departureSectionId}">
          <div class="dep-label">
            <strong>Departure Tide-Light</strong>
            <span id="${recHintId}"></span>
          </div>
          <div class="dep-buttons" id="${depBtnsId}">
            <button class="dep-btn" data-window="dawn" type="button">Dawn</button>
            <button class="dep-btn" data-window="midday" type="button">Midday</button>
            <button class="dep-btn" data-window="dusk" type="button">Dusk</button>
            <button class="dep-btn" data-window="midnight" type="button">Midnight</button>
          </div>
        </div>
        <div class="canoe-confirm-actions">
          <button class="secondary-btn" id="${cancelBtnId}" type="button">Cancel</button>
          <button class="primary-btn canoe-confirm-sail-btn" id="${sailBtnId}" type="button">Sail</button>
        </div>
      </div>
    </div>
  `;
}

const _confirmPreviewState = new WeakMap();

function _renderConfirmVersePreview(previewEl, state) {
  const { song, gs, warnMismatch, verseIdx } = state;
  const verses = Array.isArray(song?.verses) ? song.verses : [];
  const total = verses.length;
  if (!total) {
    previewEl.innerHTML = '';
    return;
  }

  const idx = Math.max(0, Math.min(total - 1, verseIdx));
  state.verseIdx = idx;
  const verse = verses[idx];
  const eyebrowText = total > 1 ? 'Full Chant Memorized Ashore' : 'Chant Memorized Ashore';
  const showEasyCue = gs.difficulty === Difficulty.EASY && Boolean(verse.easyCueText);

  const dotsHtml = verses
    .map(
      (_, i) =>
        `<button class="verse-step-dot${i === idx ? ' active' : ''}" type="button" role="tab" aria-selected="${i === idx}" aria-label="Verse ${i + 1} of ${total}" data-verse-idx="${i}"></button>`
    )
    .join('');

  const navHtml =
    total > 1
      ? `
        <div class="preview-verse-nav">
          <button class="verse-nav-btn" type="button" data-verse-nav="-1" aria-label="Previous verse"${idx === 0 ? ' disabled' : ''}>&lt;</button>
          <div class="verse-step-dots" role="tablist" aria-label="Chant verses">${dotsHtml}</div>
          <button class="verse-nav-btn" type="button" data-verse-nav="1" aria-label="Next verse"${idx === total - 1 ? ' disabled' : ''}>&gt;</button>
        </div>
      `
      : '';

  previewEl.innerHTML = `
    <div class="preview-verse-header">
      <div class="preview-eyebrow">${eyebrowText}</div>
      <span class="preview-verse-count">Verse ${idx + 1} of ${total}</span>
    </div>
    <div class="preview-verse-body">
      <blockquote>"${verse.lyrics}"</blockquote>
      ${showEasyCue ? `<div class="preview-easy-cue">${verse.easyCueText}</div>` : ''}
    </div>
    ${navHtml}
    ${warnMismatch}
  `;
}

function _stepConfirmVerse(previewEl, delta) {
  const state = _confirmPreviewState.get(previewEl);
  const total = state?.song?.verses?.length || 0;
  if (!state || total <= 1) return;
  const next = Math.max(0, Math.min(total - 1, state.verseIdx + delta));
  if (next === state.verseIdx) return;
  state.verseIdx = next;
  _renderConfirmVersePreview(previewEl, state);
}

function _bindConfirmPreviewInteractions(previewEl) {
  if (previewEl.dataset.verseBound === '1') return;
  previewEl.dataset.verseBound = '1';

  previewEl.addEventListener('click', (e) => {
    const navBtn = e.target.closest('[data-verse-nav]');
    if (navBtn) {
      const dir = Number(navBtn.getAttribute('data-verse-nav')) || 0;
      _stepConfirmVerse(previewEl, dir);
      return;
    }
    const dotBtn = e.target.closest('[data-verse-idx]');
    if (dotBtn) {
      const state = _confirmPreviewState.get(previewEl);
      if (!state) return;
      const targetIdx = Number(dotBtn.getAttribute('data-verse-idx'));
      if (Number.isInteger(targetIdx) && targetIdx !== state.verseIdx) {
        state.verseIdx = targetIdx;
        _renderConfirmVersePreview(previewEl, state);
      }
    }
  });

  previewEl.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') {
      _stepConfirmVerse(previewEl, -1);
    } else if (e.key === 'ArrowRight') {
      _stepConfirmVerse(previewEl, 1);
    }
  });

  let swipeStart = null;
  previewEl.addEventListener('pointerdown', (e) => {
    if (e.button && e.button !== 0) return;
    if (e.target.closest('button')) return;
    swipeStart = { id: e.pointerId, x: e.clientX, y: e.clientY };
  });
  previewEl.addEventListener('pointerup', (e) => {
    if (!swipeStart || swipeStart.id !== e.pointerId) return;
    const dx = e.clientX - swipeStart.x;
    const dy = e.clientY - swipeStart.y;
    swipeStart = null;
    if (Math.abs(dx) >= 32 && Math.abs(dx) > Math.abs(dy) * 1.15) {
      _stepConfirmVerse(previewEl, dx < 0 ? 1 : -1);
    }
  });
  previewEl.addEventListener('pointercancel', () => {
    swipeStart = null;
  });
}

/**
 * Populate the secondary Destination Voyage Confirmation dialog for the active route.
 */
export function populateVoyageConfirmModal({
  eyebrowEl,
  titleEl,
  recHintEl,
  depBtnsContainerEl,
  previewEl,
  sailBtnEl,
  gs,
  activeRoute,
  selectedDeparture,
}) {
  if (!gs || !activeRoute?.song) return;
  const { song, isReturn } = activeRoute;
  const dst = ISLANDS[song.toIsland];
  const dstName = dst?.name || song.toIsland;
  const fromName = ISLANDS[song.fromIsland]?.name || song.fromIsland;
  const isCrossShore = Boolean(
    song.fromIsland && song.fromIsland !== gs.currentIslandId
  );

  if (eyebrowEl) {
    const badge = song.isSecret
      ? 'Secret Chant'
      : isReturn && song.number === 'R'
        ? 'Return Chant'
        : `Song ${song.number}`;
    eyebrowEl.textContent = `${badge} · ${song.title}`;
  }
  if (titleEl) {
    titleEl.textContent = isCrossShore
      ? `${fromName} → ${dstName}`
      : `Voyage to ${dstName}`;
  }
  if (recHintEl) {
    recHintEl.textContent = `(Sung for ${departureWindowLabel(song.recommendedDeparture)})`;
  }

  depBtnsContainerEl?.querySelectorAll('.dep-btn').forEach((btn) => {
    const w = btn.getAttribute('data-window');
    btn.classList.toggle('selected', w === selectedDeparture);
    btn.classList.toggle('recommended', w === song.recommendedDeparture);
  });

  if (previewEl) {
    _bindConfirmPreviewInteractions(previewEl);
    const prevState = _confirmPreviewState.get(previewEl);
    const modalOpening = Boolean(
      previewEl.closest('.modal-backdrop')?.classList.contains('hidden')
    );
    const shouldReset =
      modalOpening || !prevState || prevState.song?.id !== song.id;
    const warnMismatch =
      selectedDeparture !== song.recommendedDeparture
        ? `<div class="dep-warning">Note: This chant expects ${departureWindowLabel(song.recommendedDeparture)} skies; launching at ${departureWindowLabel(selectedDeparture)} shifts sun and stars out of phase!</div>`
        : '';
    const nextState = {
      song,
      gs,
      warnMismatch,
      verseIdx: shouldReset ? 0 : prevState.verseIdx,
    };
    _confirmPreviewState.set(previewEl, nextState);
    _renderConfirmVersePreview(previewEl, nextState);
  }
  if (sailBtnEl) {
    sailBtnEl.textContent = `⛵ Sail to ${dstName}`;
  }
}

/** Lightbox metadata descriptors shared across CanoeModalUI and WalkableIslandUI. */
export function getCargoLightboxData(cargoId) {
  const item = CARGO_CATALOG[cargoId] || { name: cargoId, description: '' };
  const srcIsl = item.sourceIslandId ? ISLANDS[item.sourceIslandId] : null;
  return {
    eyebrow: srcIsl
      ? `Quest Item Aboard · Found on ${srcIsl.name}`
      : 'Quest Item Aboard',
    name: item.name,
    role: item.description,
    src: `./assets/cargo/${cargoId}.jpg`,
    alt: item.name,
  };
}

export function getCrewLightboxData(crewId) {
  const cr = CREW_CATALOG[crewId];
  if (!cr?.portrait) return null;
  const homeIsl = ISLANDS[cr.homeIslandId];
  return {
    eyebrow: homeIsl
      ? `Voyaging Companion · Recruited on ${homeIsl.name}`
      : 'Voyaging Companion',
    name: cr.name,
    role: `${cr.role} — ${cr.traitText}`,
    src: cr.portrait,
    alt: `${cr.name} (${cr.role})`,
  };
}

export function getPlayerLightboxData(difficulty) {
  const profile = getPlayerCharacterProfile(difficulty);
  return {
    eyebrow: 'Wayfinder at the Helm',
    name: 'You',
    role: profile.title,
    src: `./assets/crew/player_${difficulty || 'easy'}.jpg`,
    alt: profile.title,
  };
}
