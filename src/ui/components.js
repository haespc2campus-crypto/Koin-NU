import { brand, appState, validateImageFile } from "./state.js";
import { escapeHtml } from "./utils.js";

export function renderLazisnuLogo(className = "") {
  return `<img class="lazisnu-logo ${className}" src="${brand.logo}" data-fallback-src="${brand.fallbackLogo}" onerror="if(this.src.endsWith('${brand.fallbackLogo}'))return;this.src=this.dataset.fallbackSrc;" alt="Logo NU Care LAZISNU" />`;
}

export function renderBrandFooter(className = "") {
  return `<footer class="brand-footer ${className}">${brand.footer}</footer>`;
}

export function renderIcon(name) {
  const icons = {
    grid: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z"/></svg>',
    users: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm8-1a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM2.5 20.5c.8-4.1 3-6.5 5.5-6.5s4.7 2.4 5.5 6.5H2.5Zm10.2-5c.9-.9 2-1.5 3.3-1.5 2.4 0 4.5 2.3 5.3 6.5h-5.7a11 11 0 0 0-2.9-5Z"/></svg>',
    coin: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3C7 3 3 5 3 7.5v9C3 19 7 21 12 21s9-2 9-4.5v-9C21 5 17 3 12 3Zm0 2c4.1 0 7 1.4 7 2.5S16.1 10 12 10 5 8.6 5 7.5 7.9 5 12 5Zm0 14c-4.1 0-7-1.4-7-2.5v-1.8C6.6 15.7 9.1 16.4 12 16.4s5.4-.7 7-1.7v1.8c0 1.1-2.9 2.5-7 2.5Zm0-4.6c-4.1 0-7-1.4-7-2.5v-1.7c1.6 1 4.1 1.8 7 1.8s5.4-.8 7-1.8v1.7c0 1.1-2.9 2.5-7 2.5Z"/></svg>',
    check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9.2 16.6-4.1-4.1-1.5 1.5 5.6 5.6L20.7 8.1l-1.5-1.5z"/></svg>',
    report: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h9l4 4v14H6V3Zm8 1.8V8h3.2L14 4.8ZM8 11v2h8v-2H8Zm0 4v2h8v-2H8Zm0-8v2h4V7H8Z"/></svg>',
    logout: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h8v2H7v12h6v2H5V4Zm10.6 4.4L19.2 12l-3.6 3.6-1.4-1.4 1.2-1.2H10v-2h5.4l-1.2-1.2 1.4-1.4Z"/></svg>'
  };

  return icons[name] || icons.grid;
}

export function getNameInitials(name = '') {
  return String(name).trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || '?';
}

export function isDisplayablePhotoUrl(url = '') {
  return /^(https?:\/\/|data:image\/|blob:|\/)/i.test(String(url).trim());
}

export function renderBoardAvatar(member, size = '') {
  const name = member?.name || 'Pengurus';
  const photo = isDisplayablePhotoUrl(member?.photo) ? String(member.photo).trim() : '';
  return `<span class="board-avatar ${size}" aria-label="Foto ${escapeHtml(name)}"><span class="board-avatar-fallback">${escapeHtml(getNameInitials(name))}</span>${photo ? `<img src="${escapeHtml(photo)}" alt="Foto ${escapeHtml(name)}" loading="lazy" onerror="this.remove()" />` : ''}</span>`;
}

export function renderBoardPhotoPreview(member) {
  return `<div class="board-photo-preview">${renderBoardAvatar(member, 'large')}<span>${member?.photo && isDisplayablePhotoUrl(member.photo) ? 'Foto pengurus saat ini' : 'Avatar inisial digunakan jika foto belum tersedia.'}</span></div>`;
}

export function renderOfflineAlertBanner() {
  if (appState.pendingSyncCount > 0) {
    return `
      <div class="offline-alert-banner">
        <div>
          <strong>${appState.pendingSyncCount} transaksi disimpan secara lokal</strong>
          <p>Koneksi internet Anda sedang terganggu. Transaksi akan disinkronkan otomatis ketika online, atau klik "Sinkronkan Sekarang".</p>
        </div>
        <button class="primary-button compact" id="syncOfflineNowButton" type="button" ${appState.syncingOffline ? "disabled" : ""}>
          ${appState.syncingOffline ? "Menghubungkan..." : "Sinkronkan Sekarang"}
        </button>
      </div>
    `;
  }
  return "";
}

export function updateOfflineAlertBanner() {
  const container = document.querySelector("#offlineAlertBannerContainer");
  if (container) {
    container.innerHTML = renderOfflineAlertBanner();
    document.querySelector("#syncOfflineNowButton")?.addEventListener("click", () => {
      window.dispatchEvent(new CustomEvent("sync-offline"));
    });
  }
}

export function updateOfflineIndicator() {
  const badge = document.querySelector("#networkStatusBadge");
  if (!badge) return;

  badge.className = "network-badge";
  const label = badge.querySelector("span:not(.dot)");
  
  if (appState.syncingOffline) {
    badge.classList.add("syncing");
    if (label) label.textContent = "Menyelaraskan...";
  } else if (appState.isOffline) {
    badge.classList.add("offline");
    if (label) label.textContent = `Offline (${appState.pendingSyncCount || 0} tertunda)`;
  } else {
    badge.classList.add("online");
    if (label) label.textContent = "Online";
  }

  updateOfflineAlertBanner();
}

export function renderPhotoPreview(url, alt, emptyText = 'Belum ada foto.') {
  return url ? `<figure class="photo-preview"><img src="${escapeHtml(url)}" alt="${escapeHtml(alt)}" loading="lazy" /><figcaption>${escapeHtml(alt)}</figcaption></figure>` : `<div class="photo-empty">${emptyText}</div>`;
}

export function bindImagePreview(inputSelector, previewSelector, errorSelector) {
  document.querySelector(inputSelector)?.addEventListener('change', (event) => {
    const file = event.target.files?.[0];
    const preview = document.querySelector(previewSelector);
    const error = document.querySelector(errorSelector);
    const message = validateImageFile(file);
    if (error) error.textContent = message;
    if (!preview || !file || message) {
      if (message) event.target.value = '';
      return;
    }
    const prevImg = preview.querySelector('img[src^="blob:"]');
    if (prevImg) URL.revokeObjectURL(prevImg.src);
    const blobUrl = URL.createObjectURL(file);
    preview.innerHTML = renderPhotoPreview(blobUrl, file.name);
  });
}

