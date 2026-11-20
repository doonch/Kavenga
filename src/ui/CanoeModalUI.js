/**
 * Dedicated Canoe & Set Sail Modal UI for Kavenga: Songs of the Star Path.
 *
 * Replaces the former Island Hub "Set Sail" tab with a dedicated floating Canoe
 * button above Walk Shore. Clicking it opens a unified modal displaying:
 *  1. Top: Visual destination island cards ("?" before first landfall, 2D 3D-model
 *     rendering after landing); clicking an island opens a secondary voyage modal
 *     with the route chant, Departure Tide-Light selection, Cancel, and Sail to X.
 *  2. Bottom (side-by-side): Voyaging Crew Aboard & Quest Items Aboard with tooltips
 *     and full-view lightbox showing the island where each item/crewmate joined.
 *
 * Strictly zero cardinal directions or degree numbers in all player-facing copy.
 */

import {
  DepartureWindow,
  Difficulty,
  departureWindowLabel,
} from '../core/gameConstants.js';
import {
  CARGO_CATALOG,
  CREW_CATALOG,
  getAvailableRoutesFromCurrentIsland,
} from '../core/campaignManager.js';
import { ISLANDS } from '../data/islandsData.js';
import { getPlayerCharacterProfile } from '../data/playerCharactersData.js';

export class CanoeModalUI {
  constructor(rootEl, callbacks) {
    this.rootEl = rootEl;
    this.callbacks = callbacks;
    this.open = false;
    this.selectedSongId = null;
    this.selectedDeparture = DepartureWindow.DAWN;
    this._currentIslandSessionId = null;
    this._userPickedRoute = false;
    this._userPickedDeparture = false;

    this._buildDOM();
  }

  _buildDOM() {
    this.rootEl.innerHTML = `
      <div class="modal-backdrop canoe-modal-backdrop" id="canoeModalBackdrop">
        <div class="dialog-card canoe-modal-card" id="canoeModalCard" role="dialog" aria-modal="true" aria-labelledby="canoeModalTitle">
          <div class="island-settings-header canoe-modal-header">
            <h3 id="canoeModalTitle">🛶 Vaka &amp; Star-Path Departure</h3>
            <button class="walkable-close-btn" id="btnCloseCanoeModal" type="button" title="Close (Esc)">✕</button>
          </div>

          <div class="canoe-modal-body" id="canoeModalBody">
            <!-- 1. TOP: DESTINATION ISLAND CARDS -->
            <section class="canoe-modal-section canoe-routes-section">
              <div class="canoe-section-head">
                <h4>Where to?</h4>
              </div>
              <div class="canoe-island-cards-row" id="canoeRouteList"></div>
            </section>

            <!-- 2. BOTTOM (SIDE-BY-SIDE): CREW & STORAGE -->
            <section class="canoe-modal-section canoe-roster-cargo-row" id="canoeRosterCargoRow">
              <div class="canoe-roster-col">
                <strong class="canoe-section-title">Crew</strong>
                <div class="crew-cards-grid" id="canoeCrewList"></div>
              </div>
              <div class="canoe-cargo-col hidden" id="canoeCargoSection">
                <strong class="canoe-section-title">Storage</strong>
                <div class="cargo-cards-grid" id="canoeCargoItems"></div>
              </div>
            </section>
          </div>
        </div>

        <!-- Floating Clamped Card Tooltip -->
        <div class="hub-card-tooltip hidden" id="canoeCardTooltip" role="tooltip"></div>

        <!-- Secondary Destination Voyage Modal (Song + Departure + Cancel / Sail to X) -->
        <div class="modal-backdrop settings-confirm-backdrop hidden" id="canoeVoyageConfirmModal">
          <div class="dialog-card canoe-confirm-card" role="dialog" aria-modal="true" aria-labelledby="canoeConfirmTitle">
            <div class="island-settings-header canoe-modal-header">
              <div>
                <div class="sanctuary-eyebrow" id="canoeConfirmEyebrow"></div>
                <h3 id="canoeConfirmTitle"></h3>
              </div>
              <button class="walkable-close-btn" id="btnCloseVoyageConfirmX" type="button" title="Close (Esc)">✕</button>
            </div>
            <div class="song-preview-box canoe-confirm-song-box" id="canoeConfirmSongPreview"></div>
            <div class="departure-picker canoe-confirm-departure" id="canoeConfirmDepartureSection">
              <div class="dep-label">
                <strong>Departure Tide-Light</strong>
                <span id="canoeConfirmRecWindowHint"></span>
              </div>
              <div class="dep-buttons" id="canoeConfirmDepartureBtns">
                <button class="dep-btn" data-window="dawn" type="button">Dawn</button>
                <button class="dep-btn" data-window="midday" type="button">Midday</button>
                <button class="dep-btn" data-window="dusk" type="button">Dusk</button>
                <button class="dep-btn" data-window="midnight" type="button">Midnight</button>
              </div>
            </div>
            <div class="canoe-confirm-actions">
              <button class="secondary-btn" id="btnCancelVoyageModal" type="button">Cancel</button>
              <button class="primary-btn canoe-confirm-sail-btn" id="btnConfirmSailTo" type="button">Sail</button>
            </div>
          </div>
        </div>

        <!-- Full-View Item / Crew Lightbox -->
        <div class="modal-backdrop settings-confirm-backdrop hidden" id="canoeLightboxModal">
          <div class="mentor-lightbox-card">
            <div class="mentor-lightbox-header">
              <div>
                <div class="sanctuary-eyebrow" id="canoeLightboxEyebrow"></div>
                <h3 id="canoeLightboxName"></h3>
                <p class="mentor-lightbox-role" id="canoeLightboxRole"></p>
              </div>
              <button class="secondary-btn small-btn" id="btnCloseCanoeLightbox" type="button">Close</button>
            </div>
            <div class="mentor-lightbox-stage">
              <img class="mentor-lightbox-img" id="canoeLightboxImg" alt="" />
            </div>
          </div>
        </div>
      </div>
    `;

    const backdrop = this.rootEl.querySelector('#canoeModalBackdrop');
    const closeBtn = this.rootEl.querySelector('#btnCloseCanoeModal');
    closeBtn.addEventListener('click', (e) => {
      e.currentTarget.blur();
      this.hide();
    });
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) {
        this.hide();
      }
    });

    const lightbox = this.rootEl.querySelector('#canoeLightboxModal');
    this.rootEl
      .querySelector('#btnCloseCanoeLightbox')
      .addEventListener('click', () => this.closeLightbox());
    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox) this.closeLightbox();
    });

    const confirmBackdrop = this.rootEl.querySelector('#canoeVoyageConfirmModal');
    this.rootEl
      .querySelector('#btnCloseVoyageConfirmX')
      .addEventListener('click', () => this.closeVoyageConfirmModal());
    this.rootEl
      .querySelector('#btnCancelVoyageModal')
      .addEventListener('click', () => this.closeVoyageConfirmModal());
    confirmBackdrop.addEventListener('click', (e) => {
      if (e.target === confirmBackdrop) this.closeVoyageConfirmModal();
    });

    // Departure Tide-Light buttons in the secondary voyage confirmation modal
    this.rootEl
      .querySelectorAll('#canoeConfirmDepartureBtns .dep-btn')
      .forEach((btn) => {
        btn.addEventListener('click', () => {
          this._userPickedDeparture = true;
          this.selectedDeparture = btn.getAttribute('data-window');
          this._refreshVoyageConfirmModal();
          this.callbacks.onDepartureChanged?.(this.selectedDeparture);
        });
      });

    this.rootEl
      .querySelector('#btnConfirmSailTo')
      .addEventListener('click', () => {
        const song = this.getSelectedSongObject();
        if (!song) return;
        this.hide({ silent: true });
        this.callbacks.onLaunchVoyage?.(song, this.selectedDeparture);
      });

    // Clamped floating tooltips inside .canoe-modal-card
    const showTip = (e) => {
      const target = e.target?.closest?.('[data-tooltip]');
      if (!target) return;
      this._showCardTooltip(target);
    };
    const hideTip = (e) => {
      const target = e.target?.closest?.('[data-tooltip]');
      if (!target) return;
      if (e.relatedTarget && target.contains(e.relatedTarget)) return;
      this._hideCardTooltip();
    };
    this.rootEl.addEventListener('mouseover', showTip);
    this.rootEl.addEventListener('mouseout', hideTip);
    this.rootEl.addEventListener('focusin', showTip);
    this.rootEl.addEventListener('focusout', hideTip);
    this.rootEl
      .querySelector('#canoeModalBody')
      ?.addEventListener('scroll', () => this._hideCardTooltip(), {
        passive: true,
      });

    if (typeof window !== 'undefined') {
      window.addEventListener(
        'keydown',
        (e) => {
          if (!this.open || e.code !== 'Escape') return;
          e.stopImmediatePropagation();
          const lb = this.rootEl.querySelector('#canoeLightboxModal');
          const confirmModal = this.rootEl.querySelector('#canoeVoyageConfirmModal');
          if (lb && !lb.classList.contains('hidden')) {
            this.closeLightbox();
          } else if (confirmModal && !confirmModal.classList.contains('hidden')) {
            this.closeVoyageConfirmModal();
          } else {
            this.hide();
          }
        },
        true
      );
    }
  }

  _showCardTooltip(target) {
    const tipEl = this.rootEl.querySelector('#canoeCardTooltip');
    const card = this.rootEl.querySelector('#canoeModalCard');
    const text = target?.getAttribute('data-tooltip');
    if (!tipEl || !card || !text) return;

    tipEl.textContent = text;
    tipEl.classList.remove('hidden');

    const tRect = target.getBoundingClientRect();
    const cRect = card.getBoundingClientRect();
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
  }

  _hideCardTooltip() {
    this.rootEl.querySelector('#canoeCardTooltip')?.classList.add('hidden');
  }

  _showLightbox({ eyebrow, name, role, portrait, alt }) {
    if (!portrait) return;
    this.rootEl.querySelector('#canoeLightboxEyebrow').textContent = eyebrow;
    this.rootEl.querySelector('#canoeLightboxName').textContent = name;
    this.rootEl.querySelector('#canoeLightboxRole').textContent = role;
    const imgEl = this.rootEl.querySelector('#canoeLightboxImg');
    imgEl.src = portrait;
    imgEl.alt = alt || name;
    this.rootEl.querySelector('#canoeLightboxModal').classList.remove('hidden');
  }

  openCargoModal(cargoId) {
    const item = CARGO_CATALOG[cargoId] || { name: cargoId, description: '' };
    const srcIsl = item.sourceIslandId ? ISLANDS[item.sourceIslandId] : null;
    this._showLightbox({
      eyebrow: srcIsl
        ? `Quest Item Aboard · Found on ${srcIsl.name}`
        : 'Quest Item Aboard',
      name: item.name,
      role: item.description,
      portrait: `./assets/cargo/${cargoId}.jpg`,
      alt: item.name,
    });
  }

  openCrewPortraitModal(crewId) {
    const cr = CREW_CATALOG[crewId];
    if (!cr?.portrait) return;
    const homeIsl = ISLANDS[cr.homeIslandId];
    this._showLightbox({
      eyebrow: homeIsl
        ? `Voyaging Companion · Recruited on ${homeIsl.name}`
        : 'Voyaging Companion',
      name: cr.name,
      role: `${cr.role} — ${cr.traitText}`,
      portrait: cr.portrait,
      alt: `${cr.name} (${cr.role})`,
    });
  }

  openPlayerPortraitModal(difficulty) {
    const profile = getPlayerCharacterProfile(difficulty);
    this._showLightbox({
      eyebrow: 'Wayfinder at the Helm',
      name: 'You',
      role: profile.title,
      portrait: `./assets/crew/player_${difficulty || 'easy'}.jpg`,
      alt: profile.title,
    });
  }

  closeLightbox() {
    this.rootEl.querySelector('#canoeLightboxModal')?.classList.add('hidden');
  }

  syncIslandSession() {
    const gs = this.callbacks.getGameState();
    const curIslId = gs?.currentIslandId || 'raiatea';
    if (this._currentIslandSessionId !== curIslId) {
      this._currentIslandSessionId = curIslId;
      this.selectedSongId = null;
      this._userPickedRoute = false;
      this._userPickedDeparture = false;
    }

    const routes = this._getAvailableRoutes();
    const defaultRoute = this._getDefaultRoute(routes);
    if (defaultRoute && !this._userPickedRoute) {
      const changedSong = this.selectedSongId !== defaultRoute.song.id;
      this.selectedSongId = defaultRoute.song.id;
      if (changedSong || !this._userPickedDeparture) {
        this.selectedDeparture = defaultRoute.song.recommendedDeparture;
      }
    }
  }

  show() {
    this.syncIslandSession();
    this.open = true;
    this.closeLightbox();
    this.closeVoyageConfirmModal();
    this._hideCardTooltip();
    this.rootEl.classList.remove('hidden');
    this.refresh();
    this.callbacks.onOpen?.(this.selectedDeparture);
  }

  hide({ silent = false } = {}) {
    if (!this.open && this.rootEl.classList.contains('hidden')) return;
    this.open = false;
    this._hideCardTooltip();
    this.closeLightbox();
    this.closeVoyageConfirmModal();
    this.rootEl.classList.add('hidden');
    if (!silent) {
      this.callbacks.onClose?.();
    }
  }

  _openVoyageConfirmModal(song) {
    if (!song) return;
    this._hideCardTooltip();
    this.selectedSongId = song.id;
    this.selectedDeparture = song.recommendedDeparture;
    this._userPickedRoute = true;
    this._userPickedDeparture = false;
    this._refreshVoyageConfirmModal();
    this.rootEl
      .querySelector('#canoeVoyageConfirmModal')
      ?.classList.remove('hidden');
  }

  closeVoyageConfirmModal() {
    this.rootEl
      .querySelector('#canoeVoyageConfirmModal')
      ?.classList.add('hidden');
  }

  isOpen() {
    return this.open;
  }

  _getAvailableRoutes() {
    const gs = this.callbacks.getGameState();
    return gs ? getAvailableRoutesFromCurrentIsland(gs) : [];
  }

  _getDefaultRoute(routes) {
    if (!routes || routes.length === 0) return null;
    const forwardRoutes = routes.filter((r) => !r.isReturn);
    return forwardRoutes.length > 0
      ? forwardRoutes[forwardRoutes.length - 1]
      : routes[0];
  }

  getSelectedSongObject() {
    const routes = this._getAvailableRoutes();
    if (!routes.length) return null;
    const match = routes.find((r) => r.song.id === this.selectedSongId);
    return match ? match.song : this._getDefaultRoute(routes)?.song || null;
  }

  refresh() {
    const gs = this.callbacks.getGameState();
    if (!gs) return;

    this.syncIslandSession();
    this._refreshRoutePanel();
    this._refreshVoyageConfirmModal();
    this._refreshCanoeCards();
  }

  _refreshRoutePanel() {
    const gs = this.callbacks.getGameState();
    if (!gs) return;

    const routes = this._getAvailableRoutes();
    const listEl = this.rootEl.querySelector('#canoeRouteList');

    if (!routes.length) {
      listEl.innerHTML = `
        <div class="empty-route-callout">
          <p>Speak with this island's wayfinder in the <strong>Elder</strong> station first to learn the next route chant.</p>
          <button class="secondary-btn small-btn" id="btnCanoeJumpToElder" type="button">
            🌺 Go to Elder Station →
          </button>
        </div>
      `;
      listEl
        .querySelector('#btnCanoeJumpToElder')
        ?.addEventListener('click', () => {
          this.hide();
          this.callbacks.onGoToSanctuary?.();
        });
      return;
    }

    const defaultRoute = this._getDefaultRoute(routes);
    if (
      !this._userPickedRoute ||
      !this.selectedSongId ||
      !routes.some((r) => r.song.id === this.selectedSongId)
    ) {
      this._userPickedRoute = false;
      const changedSong = this.selectedSongId !== defaultRoute.song.id;
      this.selectedSongId = defaultRoute.song.id;
      if (changedSong || !this._userPickedDeparture) {
        this.selectedDeparture = defaultRoute.song.recommendedDeparture;
      }
    }

    listEl.innerHTML = '';
    for (const { song } of routes) {
      const dstId = song.toIsland;
      const dst = ISLANDS[dstId];
      const dstName = dst?.name || dstId;
      const isDiscovered = Boolean(gs.discoveredIslands?.[dstId]);
      const thumbUrl = isDiscovered
        ? this.callbacks.getIslandThumbnailUrl?.(dstId)
        : null;

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `canoe-island-card ${isDiscovered ? 'discovered' : 'undiscovered'}`;
      btn.setAttribute('aria-label', dstName);

      const artHtml = isDiscovered
        ? thumbUrl
          ? `<img class="canoe-island-thumb" src="${thumbUrl}" alt="${dstName}" />`
          : `<span class="canoe-island-card-mystery" aria-hidden="true">🏝️</span>`
        : `<span class="canoe-island-card-mystery" aria-hidden="true">?</span>`;

      btn.innerHTML = `
        <div class="canoe-island-card-art">${artHtml}</div>
        <div class="canoe-island-card-name">${dstName}</div>
      `;
      btn.addEventListener('click', () => {
        this._openVoyageConfirmModal(song);
        this.callbacks.onDepartureChanged?.(this.selectedDeparture);
      });
      listEl.appendChild(btn);
    }
  }

  _refreshVoyageConfirmModal() {
    const gs = this.callbacks.getGameState();
    const routes = this._getAvailableRoutes();
    const matched = routes.find((r) => r.song.id === this.selectedSongId);
    const activeRoute = matched || this._getDefaultRoute(routes);
    if (!gs || !activeRoute?.song) return;

    const { song, isReturn } = activeRoute;
    const dst = ISLANDS[song.toIsland];
    const dstName = dst?.name || song.toIsland;

    const eyebrowEl = this.rootEl.querySelector('#canoeConfirmEyebrow');
    const titleEl = this.rootEl.querySelector('#canoeConfirmTitle');
    const recHintEl = this.rootEl.querySelector('#canoeConfirmRecWindowHint');
    const previewEl = this.rootEl.querySelector('#canoeConfirmSongPreview');
    const sailBtnEl = this.rootEl.querySelector('#btnConfirmSailTo');

    if (eyebrowEl) {
      eyebrowEl.textContent =
        isReturn && song.number === 'R'
          ? `Return Chant · ${song.title}`
          : `Song ${song.number} · ${song.title}`;
    }
    if (titleEl) {
      titleEl.textContent = `Voyage to ${dstName}`;
    }
    if (recHintEl) {
      recHintEl.textContent = `(Sung for ${departureWindowLabel(song.recommendedDeparture)})`;
    }

    this.rootEl
      .querySelectorAll('#canoeConfirmDepartureBtns .dep-btn')
      .forEach((btn) => {
        const w = btn.getAttribute('data-window');
        btn.classList.toggle('selected', w === this.selectedDeparture);
        btn.classList.toggle(
          'recommended',
          w === song.recommendedDeparture
        );
      });

    if (previewEl) {
      const v1 = song.verses[0];
      const warnMismatch =
        this.selectedDeparture !== song.recommendedDeparture
          ? `<div class="dep-warning">Note: This chant expects ${departureWindowLabel(song.recommendedDeparture)} skies; launching at ${departureWindowLabel(this.selectedDeparture)} shifts sun and stars out of phase!</div>`
          : '';
      previewEl.innerHTML = `
        <div class="preview-eyebrow">Opening Verse Memorized Ashore</div>
        <blockquote>"${v1.lyrics}"</blockquote>
        ${gs.difficulty === Difficulty.EASY ? `<div class="preview-easy-cue">${v1.easyCueText}</div>` : ''}
        ${warnMismatch}
      `;
    }
    if (sailBtnEl) {
      sailBtnEl.textContent = `⛵ Sail to ${dstName}`;
    }
  }

  _refreshCanoeCards() {
    const gs = this.callbacks.getGameState();
    if (!gs) return;

    // Voyaging Crew Cards
    const crewContainer = this.rootEl.querySelector('#canoeCrewList');
    crewContainer.innerHTML = '';
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
    playerCard.addEventListener('click', () => {
      this.openPlayerPortraitModal(gs.difficulty);
    });
    crewContainer.appendChild(playerCard);

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
      card.addEventListener('click', () => {
        this.openCrewPortraitModal(crId);
      });
      crewContainer.appendChild(card);
    }

    // Quest Item Cards (side-by-side in matching visual tile style)
    const cargoSection = this.rootEl.querySelector('#canoeCargoSection');
    const cargoContainer = this.rootEl.querySelector('#canoeCargoItems');
    if (gs.cargoItems.length === 0) {
      cargoSection.classList.add('hidden');
      cargoContainer.innerHTML = '';
    } else {
      cargoSection.classList.remove('hidden');
      cargoContainer.innerHTML = '';
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
        btn.addEventListener('click', () => {
          this.openCargoModal(cid);
        });
        cargoContainer.appendChild(btn);
      }
    }
  }
}
