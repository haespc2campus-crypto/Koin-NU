import qrcode from "qrcode-generator";
import confetti from "canvas-confetti";
import { initModals } from "./src/ui/modal.js";
import {
  appState,
  getSession,
  canAccessPath,
  restorePostgresSession,
  updatePendingSyncCount,
  loadInternalData,
  syncOfflineData
} from "./src/ui/state.js";
import {
  getSubdomainBanom,
  getMainDomainUrl,
  navigate,
  showToast
} from "./src/ui/utils.js";
import {
  updateOfflineIndicator
} from "./src/ui/components.js";
import {
  renderLandingPage,
  renderPublicDashboard
} from "./src/ui/pages/landing.js";
import {
  renderLogin
} from "./src/ui/pages/auth.js";
import {
  renderBanomPortal
} from "./src/ui/pages/banom-portal.js";
import {
  renderDashboard
} from "./src/ui/pages/dashboard.js";
import {
  renderDonors,
  renderPickups,
  renderVerification,
  renderReports,
  renderOfficerDeposits,
  renderLazisnuDeposits,
  renderDistributions,
  renderUmkmAdmin,
  renderCitizenServicesAdmin,
  renderNewsAdmin,
  renderProfile,
  renderBoardMembers,
  renderUsers,
  renderSettings,
  renderOfficers
} from "./src/ui/pages/admin-features.js";

// Bind libraries to window for compatibility with inline/onclick scripts
window.qrcode = qrcode;
window.confetti = confetti;

// Initialize micromodal
initModals();

// Global routing coordinator
function render() {
  const path = window.location.pathname;
  if (path.startsWith("/banom/")) {
    const slug = path.substring(7);
    renderBanomPortal(slug);
    return;
  }
  const subdomain = getSubdomainBanom();
  if (subdomain && (path === "/" || path === "")) {
    renderBanomPortal(subdomain);
    return;
  }
  if (path === "/publik" || path === "/transparansi") {
    renderPublicDashboard();
    return;
  }
  if (path === "/") {
    renderLandingPage();
    return;
  }
  if (path === "/login") {
    renderLogin();
    return;
  }
  if (path === "/admin") {
    renderLogin({ adminOnly: true });
    return;
  }

  const session = getSession();
  if (!session?.role) {
    navigate("/login");
    return;
  }
  if (!canAccessPath(session, path)) {
    navigate("/dashboard");
    return;
  }

  if (path === "/dashboard") {
    renderDashboard();
    return;
  }
  if (path === "/profil-ranting") {
    renderProfile();
    return;
  }
  if (path === "/pengurus") {
    renderBoardMembers();
    return;
  }
  if (path === "/donatur") {
    renderDonors();
    return;
  }
  if (path === "/petugas") {
    renderOfficers();
    return;
  }
  if (path === "/pengambilan-koin") {
    renderPickups();
    return;
  }
  if (path === "/verifikasi") {
    renderVerification();
    return;
  }
  if (path === "/setoran-petugas") {
    renderOfficerDeposits();
    return;
  }
  if (path === "/setor-lazisnu") {
    renderLazisnuDeposits();
    return;
  }
  if (path === "/penyaluran-dana") {
    renderDistributions();
    return;
  }
  if (path === "/umkm-warga") {
    renderUmkmAdmin();
    return;
  }
  if (path === "/layanan-warga") {
    renderCitizenServicesAdmin();
    return;
  }
  if (path === "/berita") {
    renderNewsAdmin();
    return;
  }
  if (path === "/laporan") {
    renderReports();
    return;
  }
  if (path === "/users") {
    renderUsers();
    return;
  }
  if (path === "/pengaturan") {
    renderSettings();
    return;
  }
  navigate("/dashboard");
}

// Register Service Worker for PWA
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js")
      .then((reg) => console.log("Service Worker registered with scope:", reg.scope))
      .catch((err) => console.error("Service Worker registration failed:", err));
  });
}

// Network Status Observers
window.addEventListener("online", () => {
  appState.isOffline = false;
  updateOfflineIndicator();
  syncOfflineData();
});

window.addEventListener("offline", () => {
  appState.isOffline = true;
  updateOfflineIndicator();
});

// Event Delegation for Network Badge Manual Click Trigger
document.addEventListener("click", (event) => {
  const badge = event.target.closest("#networkStatusBadge");
  if (badge) {
    if (appState.syncingOffline) {
      showToast("Sedang menyelaraskan data...", "info");
    } else if (appState.isOffline) {
      showToast("Anda sedang offline. Tidak dapat menyelaraskan data.", "warning");
    } else if (appState.pendingSyncCount > 0) {
      syncOfflineData();
    } else {
      showToast("Koneksi online. Semua data telah diselaraskan.", "success");
    }
  }
});

// Sync offline data custom event
window.addEventListener("sync-offline", () => {
  syncOfflineData();
});

window.addEventListener("popstate", render);

async function initApp() {
  const appElement = document.querySelector("#app");
  if (appElement) {
    appElement.innerHTML = `
      <section class="placeholder-panel">
        <p class="eyebrow">Memuat</p>
        <h2>Menyiapkan aplikasi</h2>
        <p>Jika PostgreSQL belum dikonfigurasi, aplikasi akan berjalan dalam mode demo.</p>
      </section>
    `;
  }
  await restorePostgresSession();
  
  // Initialize offline queue from IndexedDB
  try {
    await updatePendingSyncCount();
  } catch (err) {
    console.warn("Gagal inisialisasi antrean offline:", err);
  }
  
  await loadInternalData();
  render();
}

initApp();
