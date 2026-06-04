import {
  getSession,
  appState,
  brand,
  navigationItems,
  canAccessPath,
  labelRole,
  logout,
  demoData,
  app
} from "../state.js";
import {
  navigate,
  formatRupiah,
  formatCompactRupiah,
  escapeHtml
} from "../utils.js";
import {
  renderLazisnuLogo,
  renderBrandFooter,
  renderIcon
} from "../components.js";

// === Static Role Configuration ===
export const roleContent = {
  admin: {
    title: "Pantau seluruh gerak Koin NU melalui SIKOINNU",
    description: "Semua ringkasan, pemasukan, petugas, setoran, dan penyaluran dana tampil lengkap untuk pengawasan ranting.",
    quickActions: ["Kelola Donatur", "Kelola Petugas", "Lihat Laporan"]
  },
  bendahara: {
    title: "Fokus verifikasi setoran dan arus dana",
    description: "Ringkasan ditata untuk mengecek setoran masuk, status verifikasi, dan dana tersalurkan.",
    quickActions: ["Verifikasi Setoran", "Catat Penyaluran", "Unduh Rekap"]
  },
  petugas: {
    title: "Input pengambilan koin lebih cepat",
    description: "Tampilan petugas menonjolkan aksi input pengambilan, aktivitas lapangan, dan setoran yang perlu dikirim.",
    quickActions: ["Input Pengambilan", "Lihat Rute", "Kirim Setoran"]
  },
  pengurus: {
    title: "Pantau gerakan Koin NU secara ringkas",
    description: "Mode pemantau menampilkan laporan, profil ranting, dan perkembangan program tanpa akses ubah data.",
    quickActions: ["Lihat Laporan", "Profil Ranting", "Transparansi Publik"]
  }
};

export const quickActionRoutes = {
  "Kelola Donatur": "/donatur",
  "Kelola Petugas": "/petugas",
  "Lihat Laporan": "/laporan",
  "Verifikasi Setoran": "/verifikasi",
  "Catat Penyaluran": "/penyaluran-dana",
  "Unduh Rekap": "/laporan",
  "Input Pengambilan": "/pengambilan-koin",
  "Lihat Rute": "/donatur",
  "Kirim Setoran": "/verifikasi",
  "Profil Ranting": "/profil-ranting",
  "Transparansi Publik": "/transparansi"
};

// === Dashboard Helpers & Renderers ===
export function getSummaryCards(role) {
  const now = new Date();
  const currentYm = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  let monthlyCoins = appState.pickups
    .filter((p) => p.date.startsWith(currentYm) && p.status === "Disetujui Bendahara")
    .reduce((sum, p) => sum + p.amount, 0);
  
  if (monthlyCoins === 0) {
    const months = [...new Set(appState.pickups.map((p) => p.date.substring(0, 7)))].sort();
    if (months.length > 0) {
      const latestMonth = months[months.length - 1];
      monthlyCoins = appState.pickups
        .filter((p) => p.date.startsWith(latestMonth) && p.status === "Disetujui Bendahara")
        .reduce((sum, p) => sum + p.amount, 0);
    }
  }

  const activeDonors = appState.donors.filter((d) => d.active).length;
  const totalOfficers = appState.officers.filter((o) => o.active).length;
  const pendingDeposits = appState.officerDeposits.filter((d) => d.status === "Menunggu Verifikasi").length;
  const distributedFunds = appState.distributions
    .filter((d) => d.status === "Disalurkan")
    .reduce((sum, d) => sum + d.amount, 0);

  const cards = [
    { label: "Total koin bulan ini", value: formatRupiah(monthlyCoins), hint: "Tervalidasi Bendahara", accent: "green" },
    { label: "Donatur aktif", value: activeDonors.toLocaleString("id-ID"), hint: "Basis data ranting", accent: "blue" },
    { label: "Total petugas", value: totalOfficers.toLocaleString("id-ID"), hint: "Petugas aktif lapangan", accent: "teal" },
    { label: "Setoran menunggu verifikasi", value: pendingDeposits.toLocaleString("id-ID"), hint: "Perlu cek Bendahara", accent: "amber" },
    { label: "Dana tersalurkan", value: formatRupiah(distributedFunds), hint: "Penyaluran aktif", accent: "emerald" }
  ];

  if (role === "bendahara") {
    return [cards[3], cards[0], cards[4], cards[1]];
  }

  if (role === "petugas") {
    const session = getSession();
    const myEmail = session?.email || "petugas@rantingnu.id";
    const myName = appState.officers.find((o) => o.username === myEmail)?.name || "Petugas Demo";

    let myMonthlyCoins = appState.pickups
      .filter((p) => p.officer === myName && p.date.startsWith(currentYm) && p.status === "Disetujui Bendahara")
      .reduce((sum, p) => sum + p.amount, 0);
    if (myMonthlyCoins === 0) {
      const months = [...new Set(appState.pickups.map((p) => p.date.substring(0, 7)))].sort();
      if (months.length > 0) {
        const latestMonth = months[months.length - 1];
        myMonthlyCoins = appState.pickups
          .filter((p) => p.officer === myName && p.date.startsWith(latestMonth) && p.status === "Disetujui Bendahara")
          .reduce((sum, p) => sum + p.amount, 0);
      }
    }

    const myDonors = appState.donors.filter((d) => d.officer === myName && d.active).length;
    const myPendingPickups = appState.pickups.filter((p) => p.officer === myName && p.status === "Menunggu Verifikasi").length;

    return [
      { label: "Koin diambil bulan ini", value: formatRupiah(myMonthlyCoins), hint: "Area dampingan saya", accent: "green" },
      { label: "Donatur aktif area saya", value: myDonors.toLocaleString("id-ID"), hint: "Tanggung jawab saya", accent: "blue" },
      { label: "Setoran belum diverifikasi", value: myPendingPickups.toLocaleString("id-ID"), hint: "Menunggu bendahara", accent: "amber" },
      { label: "Total petugas ranting", value: totalOfficers.toLocaleString("id-ID"), hint: "Koordinasi aktif", accent: "teal" }
    ];
  }

  return cards;
}

export function getVisibleActivities(role) {
  if (role === "bendahara") {
    return demoData.activities.filter((activity) => ["Setoran", "Verifikasi", "Penyaluran"].includes(activity.type));
  }

  if (role === "petugas") {
    return demoData.activities.filter((activity) => ["Pengambilan", "Setoran"].includes(activity.type));
  }

  return demoData.activities;
}

export function getIncomeHistory() {
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"];
  const now = new Date();
  const history = [];

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const amount = appState.pickups
      .filter((p) => p.date.startsWith(ym) && p.status === "Disetujui Bendahara")
      .reduce((sum, p) => sum + p.amount, 0);
    
    history.push({
      ym,
      month: monthNames[d.getMonth()],
      amount
    });
  }

  const totalAmount = history.reduce((sum, item) => sum + item.amount, 0);
  if (totalAmount === 0) {
    return demoData.income;
  }

  return history;
}

export function renderSummaryCards(role) {
  return getSummaryCards(role).map((card) => `
    <article class="metric-card accent-${card.accent}">
      <span>${card.label}</span>
      <strong>${card.value}</strong>
      <small>${card.hint}</small>
    </article>
  `).join("");
}

export function renderIncomeChart() {
  const history = getIncomeHistory();
  const max = Math.max(...history.map((item) => item.amount)) || 1;

  return history.map((item) => `
    <div class="chart-column">
      <div class="bar-track">
        <span class="bar-fill" style="height: ${Math.round((item.amount / max) * 100)}%"></span>
      </div>
      <strong>${item.month}</strong>
      <small>${formatCompactRupiah(item.amount)}</small>
    </div>
  `).join("");
}

export function renderActivities(role) {
  return getVisibleActivities(role).map((activity) => `
    <tr>
      <td>
        <strong>${activity.type}</strong>
        <span>${activity.time}</span>
      </td>
      <td>${activity.actor}</td>
      <td>${activity.detail}</td>
      <td>${formatRupiah(activity.amount)}</td>
      <td><span class="status-pill">${activity.status}</span></td>
    </tr>
  `).join("");
}

export function renderQuickActions(role) {
  return (roleContent[role] || roleContent.admin).quickActions.map((action) => `
    <button class="action-button" data-quick-nav="${quickActionRoutes[action] || "/dashboard"}" type="button">${action}</button>
  `).join("");
}

// === App Shell Layout Renders ===
export function renderAppShell(session, title, content) {
  const path = window.location.pathname;
  document.title = `${brand.name} | ${title}`;

  // Preserve focus and cursor position
  const activeId = document.activeElement ? document.activeElement.id : null;
  const selectionStart = document.activeElement ? document.activeElement.selectionStart : null;
  const selectionEnd = document.activeElement ? document.activeElement.selectionEnd : null;

  app.innerHTML = `
    <section class="app-layout">
      <aside class="sidebar" aria-label="Navigasi utama">
        <div class="sidebar-brand">
          ${renderLazisnuLogo("sidebar-logo")}
          <div>
            <strong>${brand.name}</strong>
            <span>${brand.subtitle}</span>
          </div>
        </div>
        <nav class="sidebar-nav">
          ${navigationItems.filter((item) => canAccessPath(session, item.path)).map((item) => `
            <button class="nav-item ${path === item.path ? "active" : ""}" data-nav="${item.path}" type="button">
              ${renderIcon(item.icon)}
              <span>${item.label}</span>
            </button>
          `).join("")}
        </nav>
        <button class="nav-item logout-nav" id="logoutButton" type="button">
          ${renderIcon("logout")}
          <span>Logout</span>
        </button>
      </aside>

      <section class="content-shell">
        <header class="topbar">
          <div>
            <p class="eyebrow">${brand.name} | ${brand.tagline}</p>
            <h1>${title}</h1>
          </div>
          <div class="topbar-user">
            <button id="networkStatusBadge" class="network-badge ${appState.syncingOffline ? "syncing" : appState.isOffline ? "offline" : "online"}" type="button" title="Klik untuk sinkronisasi manual">
              <span class="dot"></span>
              <span>
                ${appState.syncingOffline 
                  ? "Menyelaraskan..." 
                  : appState.isOffline 
                    ? `Offline (${appState.pendingSyncCount || 0})` 
                    : "Online"
                }
              </span>
            </button>
            <span>${labelRole(session.role)}</span>
            <strong>${escapeHtml(session.email)}</strong>
          </div>
        </header>
        ${content}
        ${renderBrandFooter("content-footer")}
      </section>
    </section>
  `;

  // Restore focus and cursor position
  if (activeId) {
    const el = document.getElementById(activeId);
    if (el) {
      el.focus();
      if (selectionStart !== null && selectionEnd !== null && (el.type === "text" || el.type === "search" || el.type === "textarea")) {
        el.setSelectionRange(selectionStart, selectionEnd);
      }
    }
  }

  document.querySelectorAll("[data-nav]").forEach((button) => {
    button.addEventListener("click", () => navigate(button.dataset.nav));
  });

  document.querySelector("#logoutButton").addEventListener("click", async () => {
    await logout();
    navigate("/login");
  });
}

// === Dashboard View Panel ===
export function renderDashboard() {
  const session = getSession();
  if (!session?.role) {
    navigate("/login");
    return;
  }

  const content = roleContent[session.role] || roleContent.admin;

  renderAppShell(session, "Dashboard", `
    <section class="welcome-panel role-${session.role}">
      <div class="welcome-copy">
        <div class="dashboard-brand">
          ${renderLazisnuLogo("dashboard-logo")}
          <div>
            <p class="eyebrow">${brand.name}</p>
            <strong>${brand.tagline}</strong>
          </div>
        </div>
        <h2>${content.title}</h2>
        <p>${content.description}</p>
        <div class="identity-row">
          <span>${labelRole(session.role)}</span>
          <span>${escapeHtml(session.email)}</span>
        </div>
      </div>
      <div class="quick-actions" aria-label="Aksi cepat">
        ${renderQuickActions(session.role)}
      </div>
    </section>

    <section class="summary-grid" aria-label="Ringkasan dashboard">
      ${renderSummaryCards(session.role)}
    </section>

    <section class="dashboard-grid">
      <article class="panel chart-panel">
        <div class="panel-heading">
          <div>
            <p class="eyebrow">Pemasukan</p>
            <h2>6 bulan terakhir</h2>
          </div>
          <span>${formatRupiah(demoData.totals.monthlyCoins)}</span>
        </div>
        <div class="income-chart" aria-label="Grafik pemasukan 6 bulan terakhir">
          ${renderIncomeChart()}
        </div>
      </article>

      <article class="panel focus-panel">
        <p class="eyebrow">Prioritas ${labelRole(session.role)}</p>
        <h2>${session.role === "petugas" ? "Pengambilan hari ini" : session.role === "bendahara" ? "Antrian verifikasi" : "Status operasional"}</h2>
        <div class="focus-list">
          <div>
            <strong>${session.role === "petugas" ? "14" : session.role === "bendahara" ? "7" : "31"}</strong>
            <span>${session.role === "petugas" ? "rumah target" : session.role === "bendahara" ? "setoran perlu dicek" : "aktivitas minggu ini"}</span>
          </div>
          <div>
            <strong>${session.role === "petugas" ? formatRupiah(850000) : session.role === "bendahara" ? formatRupiah(4150000) : "96%"}</strong>
            <span>${session.role === "petugas" ? "estimasi koin" : session.role === "bendahara" ? "nominal menunggu" : "data sudah lengkap"}</span>
          </div>
        </div>
      </article>
    </section>

    <section class="panel activity-panel">
      <div class="panel-heading">
        <div>
          <p class="eyebrow">Aktivitas</p>
          <h2>Terbaru</h2>
        </div>
        <span>${getVisibleActivities(session.role).length} catatan</span>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Jenis</th>
              <th>Petugas</th>
              <th>Detail</th>
              <th>Nominal</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${renderActivities(session.role)}
          </tbody>
        </table>
      </div>
    </section>
  `);

  document.querySelectorAll("[data-quick-nav]").forEach((button) => {
    button.addEventListener("click", () => navigate(button.dataset.quickNav));
  });
}
