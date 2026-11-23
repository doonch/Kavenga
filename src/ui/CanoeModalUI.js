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

import { DepartureWindow } from '../core/gameConstants.js';
import {
  getAvailableRoutesFromCurrentIsland,
  getDefaultRouteFromList,
} from '../core/campaignManager.js';
import {
  buildVoyageConfirmModalHtml,
  createClampedTooltipController,
  getCargoLightboxData,
  getCrewLightboxData,
  getPlayerLightboxData,
  populateVoyageConfirmModal,
  renderCrewAndCargoRows,
  renderDestinationIslandCards,
} from './canoePanelWidgets.js';

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
        ${buildVoyageConfirmModalHtml({
          modalId: 'canoeVoyageConfirmModal',
          eyebrowId: 'canoeConfirmEyebrow',
          titleId: 'canoeConfirmTitle',
          closeBtnId: 'btnCloseVoyageConfirmX',
          songPreviewId: 'canoeConfirmSongPreview',
          departureSectionId: 'canoeConfirmDepartureSection',
          recHintId: 'canoeConfirmRecWindowHint',
          depBtnsId: 'canoeConfirmDepartureBtns',
          cancelBtnId: 'btnCancelVoyageModal',
          sailBtnId: 'btnConfirmSailTo',
        })}

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
    this._cardTooltip = createClampedTooltipController({
      tipEl: this.rootEl.querySelector('#canoeCardTooltip'),
      getBoundsEl: () => this.rootEl.querySelector('#canoeModalCard'),
    });
    this._cardTooltip.bindContainer(
      this.rootEl,
      this.rootEl.querySelector('#canoeModalBody')
    );

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

  _hideCardTooltip() {
    this._cardTooltip?.hide();
  }

  _showLightbox(info) {
    if (!info?.src) return;
    this.rootEl.querySelector('#canoeLightboxEyebrow').textContent = info.eyebrow;
    this.rootEl.querySelector('#canoeLightboxName').textContent = info.name;
    this.rootEl.querySelector('#canoeLightboxRole').textContent = info.role;
    const imgEl = this.rootEl.querySelector('#canoeLightboxImg');
    imgEl.src = info.src;
    imgEl.alt = info.alt || info.name;
    this.rootEl.querySelector('#canoeLightboxModal').classList.remove('hidden');
  }

  openCargoModal(cargoId) {
    this._showLightbox(getCargoLightboxData(cargoId));
  }

  openCrewPortraitModal(crewId) {
    this._showLightbox(getCrewLightboxData(crewId));
  }

  openPlayerPortraitModal(difficulty) {
    this._showLightbox(getPlayerLightboxData(difficulty));
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
    return getDefaultRouteFromList(routes);
  }

  getSelectedSongObject() {
    this.syncIslandSession();
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

    if (routes.length > 0) {
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
    }

    renderDestinationIslandCards({
      containerEl: listEl,
      routes,
      gs,
      getIslandThumbnailUrl: this.callbacks.getIslandThumbnailUrl,
      emptyHtml: `
        <div class="empty-route-callout">
          <p>Speak with this island's wayfinder in the <strong>Elder</strong> station first to learn the next route chant.</p>
          <button class="secondary-btn small-btn" id="btnCanoeJumpToElder" type="button">
            🌺 Go to Elder Station →
          </button>
        </div>
      `,
      emptyActionSelector: '#btnCanoeJumpToElder',
      onEmptyAction: () => {
        this.hide();
        this.callbacks.onGoToSanctuary?.();
      },
      onSelectRoute: (song) => {
        this._openVoyageConfirmModal(song);
        this.callbacks.onDepartureChanged?.(this.selectedDeparture);
      },
    });
  }

  _refreshVoyageConfirmModal() {
    const gs = this.callbacks.getGameState();
    const routes = this._getAvailableRoutes();
    const matched = routes.find((r) => r.song.id === this.selectedSongId);
    const activeRoute = matched || this._getDefaultRoute(routes);
    populateVoyageConfirmModal({
      eyebrowEl: this.rootEl.querySelector('#canoeConfirmEyebrow'),
      titleEl: this.rootEl.querySelector('#canoeConfirmTitle'),
      recHintEl: this.rootEl.querySelector('#canoeConfirmRecWindowHint'),
      depBtnsContainerEl: this.rootEl.querySelector('#canoeConfirmDepartureBtns'),
      previewEl: this.rootEl.querySelector('#canoeConfirmSongPreview'),
      sailBtnEl: this.rootEl.querySelector('#btnConfirmSailTo'),
      gs,
      activeRoute,
      selectedDeparture: this.selectedDeparture,
    });
  }

  _refreshCanoeCards() {
    renderCrewAndCargoRows({
      crewContainerEl: this.rootEl.querySelector('#canoeCrewList'),
      cargoSectionEl: this.rootEl.querySelector('#canoeCargoSection'),
      cargoContainerEl: this.rootEl.querySelector('#canoeCargoItems'),
      gs: this.callbacks.getGameState(),
      onPlayerClick: (diff) => this.openPlayerPortraitModal(diff),
      onCrewClick: (crId) => this.openCrewPortraitModal(crId),
      onCargoClick: (cid) => this.openCargoModal(cid),
    });
  }
}
