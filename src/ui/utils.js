import qrcode from "qrcode-generator";
import { appState } from "./state.js";

// === Utility: Debounce ===
export function debounce(fn, delay = 250) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

// === Utility: Wrap Form Submit (Loading & Double Click Prevention) ===
export async function wrapFormSubmit(event, syncFn) {
  event.preventDefault();
  const form = event.currentTarget;
  const submitBtn = form.querySelector('button[type="submit"]');
  const errorEl = form.querySelector('.form-error') || form.querySelector('#' + form.id + 'Error');

  if (submitBtn) {
    if (submitBtn.classList.contains("btn-loading")) return false;
    submitBtn.classList.add("btn-loading");
    submitBtn.disabled = true;
  }

  try {
    const ok = await syncFn();
    return ok;
  } catch (error) {
    console.error("Submit error:", error);
    if (errorEl) {
      errorEl.textContent = "Terjadi kesalahan sistem. Coba lagi.";
    }
    return false;
  } finally {
    if (submitBtn) {
      submitBtn.classList.remove("btn-loading");
      submitBtn.disabled = false;
    }
  }
}

// === Utility: Load Leaflet.js Dynamically ===
export function loadLeaflet(callback) {
  if (window.L) {
    callback();
    return;
  }

  if (document.getElementById("leaflet-js")) {
    const timer = setInterval(() => {
      if (window.L) {
        clearInterval(timer);
        callback();
      }
    }, 100);
    return;
  }

  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
  link.integrity = "sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=";
  link.crossOrigin = "";
  document.head.appendChild(link);

  const script = document.createElement("script");
  script.id = "leaflet-js";
  script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
  script.integrity = "sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=";
  script.crossOrigin = "";
  script.onload = callback;
  document.head.appendChild(script);
}

// === Toast Notification System ===
let _toastContainer = null;
function getToastContainer() {
  if (!_toastContainer || !_toastContainer.isConnected) {
    _toastContainer = document.createElement("div");
    _toastContainer.className = "toast-container";
    document.body.appendChild(_toastContainer);
  }
  return _toastContainer;
}

export function showToast(message, type = "info") {
  const icons = { error: "❌", success: "✅", warning: "⚠️", info: "ℹ️" };
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span class="toast-icon">${icons[type] || icons.info}</span><span class="toast-message">${message}</span><button class="toast-close" aria-label="Tutup">&times;</button>`;
  toast.querySelector(".toast-close").addEventListener("click", () => toast.remove());
  getToastContainer().appendChild(toast);
  setTimeout(() => toast.remove(), 4200);
}

// === IndexedDB & Offline Helpers ===
export function isNetworkError(error) {
  if (error instanceof TypeError || 
      error.message?.includes("Failed to fetch") || 
      error.message?.includes("NetworkError") || 
      error.message?.includes("Load failed") ||
      error.message?.includes("API 502") ||
      error.message?.includes("API 503") ||
      error.message?.includes("API 504") ||
      error.message?.includes("API 500")) {
    return true;
  }
  return false;
}

export function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function generateDonorCode(donor) {
  return `DON-${String(donor.rt || "0").padStart(3, "0")}-${String(donor.rw || "0").padStart(3, "0")}-${String(donor.id || "0").padStart(4, "0")}`;
}

export function createDonorQrPng(value, cellSize = 6, margin = 3) {
  // Try using imported qrcode first, fallback to window.qrcode
  const qrFn = typeof qrcode === "function" ? qrcode : window.qrcode;
  if (typeof qrFn !== "function") return "";
  const qr = qrFn(0, "M");
  qr.addData(value);
  qr.make();
  const moduleCount = qr.getModuleCount();
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = (moduleCount + margin * 2) * cellSize;
  const context = canvas.getContext("2d");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#000000";
  for (let row = 0; row < moduleCount; row += 1) {
    for (let column = 0; column < moduleCount; column += 1) {
      if (qr.isDark(row, column)) {
        context.fillRect((column + margin) * cellSize, (row + margin) * cellSize, cellSize, cellSize);
      }
    }
  }
  return canvas.toDataURL("image/png");
}

export function ensureDonorQr(donor, force = false) {
  donor.donorCode = force || !donor.donorCode ? generateDonorCode(donor) : donor.donorCode;
  donor.qrCodeValue = force || !donor.qrCodeValue ? donor.donorCode : donor.qrCodeValue;
  donor.qrCodeImage = force || !donor.qrCodeImage ? createDonorQrPng(donor.qrCodeValue) : donor.qrCodeImage;
  return donor;
}

export function generateAllDonorQrs(force = false) {
  let generatedCount = 0;
  appState.donors.forEach((donor) => {
    const previousImage = donor.qrCodeImage;
    ensureDonorQr(donor, force);
    if (!previousImage && donor.qrCodeImage) generatedCount += 1;
  });
  return generatedCount;
}

export function getDonorQrDataUrl(donor) {
  return ensureDonorQr(donor).qrCodeImage || "";
}

export function downloadDonorQr(donor) {
  const link = document.createElement("a");
  link.href = ensureDonorQr(donor, true).qrCodeImage;
  link.download = `${donor.donorCode}.png`;
  link.click();
}

export function formatRupiah(value) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(value);
}

export function formatCompactRupiah(value) {
  return `Rp${new Intl.NumberFormat("id-ID", {
    notation: "compact",
    maximumFractionDigits: 1
  }).format(value)}`;
}

export function getLocalDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function generateTransactionNo(date) {
  const normalizedDate = (date || getLocalDateString()).replaceAll("-", "");
  const sameDateCount = appState.pickups.filter((pickup) => pickup.date === date).length + 1;
  return `TRX-${normalizedDate}-${String(sameDateCount).padStart(3, "0")}`;
}

export const distributionCategories = [
  "Santunan Yatim",
  "Bantuan Dhuafa",
  "Pendidikan",
  "Kesehatan",
  "Kematian",
  "Bencana",
  "Kegiatan Keagamaan",
  "Operasional Ranting",
  "Lainnya"
];

export function generateDistributionNo(date) {
  const normalizedDate = (date || getLocalDateString()).replaceAll("-", "");
  const sameDateCount = appState.distributions.filter((distribution) => distribution.date === date).length + 1;
  return `SLR-${normalizedDate}-${String(sameDateCount).padStart(3, "0")}`;
}

export function generateOfficerDepositNo(date) {
  const normalizedDate = (date || getLocalDateString()).replaceAll("-", "");
  const sameDateCount = appState.officerDeposits.filter((item) => item.date === date).length + 1;
  return `STP-${normalizedDate}-${String(sameDateCount).padStart(3, "0")}`;
}

export function generateLazisnuDepositNo(date) {
  const normalizedDate = (date || getLocalDateString()).replaceAll("-", "");
  const sameDateCount = appState.lazisnuDeposits.filter((item) => item.date === date).length + 1;
  return `LAZ-${normalizedDate}-${String(sameDateCount).padStart(3, "0")}`;
}

export function formatDateId(value) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(`${value}T00:00:00`));
}

export function formatDateTimeId(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

// === Routing Helpers ===
export function getSubdomainBanom() {
  const hostname = window.location.hostname.toLowerCase();
  const slugs = ["muslimat", "fatayat", "gp-ansor", "ipnu", "ippnu", "pagar-nusa", "jatman", "jqh", "pergunu"];
  const parts = hostname.split('.');
  if (parts.length > 1) {
    const firstPart = parts[0];
    if (slugs.includes(firstPart)) {
      return firstPart;
    }
  }
  return null;
}

export function getMainDomainUrl() {
  const hostname = window.location.hostname.toLowerCase();
  const port = window.location.port;
  const protocol = window.location.protocol;
  const slugs = ["muslimat", "fatayat", "gp-ansor", "ipnu", "ippnu", "pagar-nusa", "jatman", "jqh", "pergunu"];
  const parts = hostname.split('.');
  
  if (parts.length > 1 && slugs.includes(parts[0])) {
    const mainParts = parts.slice(1);
    const mainHost = mainParts.join('.');
    return `${protocol}//${mainHost}${port ? ':' + port : ''}`;
  }
  return '/';
}

export function navigateToBanom(slug) {
  const subdomain = getSubdomainBanom();
  if (subdomain) {
    const hostname = window.location.hostname.toLowerCase();
    const port = window.location.port;
    const protocol = window.location.protocol;
    const parts = hostname.split('.');
    
    parts[0] = slug;
    const newHost = parts.join('.');
    window.location.href = `${protocol}//${newHost}${port ? ':' + port : ''}/`;
  } else {
    navigate('/banom/' + slug);
  }
}

export function navigate(path) {
  window.history.pushState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

export function initScrollReveal() {
  const observerOptions = {
    root: null,
    rootMargin: "0px 0px -50px 0px",
    threshold: 0.1
  };

  const observer = new IntersectionObserver((entries, self) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("revealed");
        self.unobserve(entry.target);
      }
    });
  }, observerOptions);

  document.querySelectorAll(".reveal-on-scroll").forEach(el => {
    observer.observe(el);
  });
}
