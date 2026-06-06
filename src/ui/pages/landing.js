import {
  getSession,
  appState,
  brand,
  BANOM_DATA,
  canManagePublicContent,
  internalRequest,
  deleteOfflineQueueItem,
  syncRowToPostgres,
  uploadDocumentationPhoto,
  validateImageFile,
  app
} from "../state.js";
import {
  escapeHtml,
  formatRupiah,
  formatCompactRupiah,
  formatDateId,
  getLocalDateString,
  getSubdomainBanom,
  getMainDomainUrl,
  navigateToBanom,
  navigate,
  loadLeaflet,
  initScrollReveal
} from "../utils.js";
import {
  renderLazisnuLogo,
  renderBrandFooter,
  renderBoardAvatar,
  renderPhotoPreview,
  bindImagePreview
} from "../components.js";

// === Public Dashboard Logic & Renderers ===
export function getPublicMonth() {
  return getLocalDateString().slice(0, 7);
}

export function getPublicApprovedIncome() {
  const month = getPublicMonth();
  return appState.pickups
    .filter((pickup) => pickup.status === "Disetujui Bendahara" && pickup.date.startsWith(month))
    .reduce((sum, pickup) => sum + pickup.amount, 0);
}

export function getPublicDistributionTotal() {
  const month = getPublicMonth();
  return appState.distributions
    .filter((item) => item.status === "Disalurkan" && item.date.startsWith(month))
    .reduce((sum, item) => sum + item.amount, 0);
}

export function getPublicMonthlySeries(type) {
  const labels = ["Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des", "Jan", "Feb", "Mar", "Apr", "Mei"];
  const baseIncome = [8200000, 9100000, 9700000, 10400000, 11200000, 12100000, 12900000, 13600000, 14500000, 15700000, 16900000, 18450000];
  const baseDistribution = [4200000, 4800000, 5100000, 5300000, 5700000, 6200000, 6900000, 7100000, 7600000, 8100000, 8600000, getPublicDistributionTotal()];
  baseIncome[baseIncome.length - 1] = getPublicApprovedIncome();
  return labels.map((label, index) => ({
    label,
    amount: type === "income" ? baseIncome[index] : baseDistribution[index]
  }));
}

export function renderPublicChart(title, items) {
  const max = Math.max(...items.map((item) => item.amount), 1);
  return `
    <article class="public-panel">
      <div class="panel-heading">
        <div>
          <p class="eyebrow">Grafik</p>
          <h2>${title}</h2>
        </div>
      </div>
      <div class="public-chart">
        ${items.map((item) => `
          <div class="public-chart-col">
            <div><span style="height:${Math.max(8, Math.round((item.amount / max) * 100))}%"></span></div>
            <strong>${item.label}</strong>
            <small>${formatCompactRupiah(item.amount)}</small>
          </div>
        `).join("")}
      </div>
    </article>
  `;
}

export function renderPublicPrograms() {
  const categories = [
    { name: "Santunan Yatim", target: 10000000 },
    { name: "Bantuan Dhuafa", target: 15000000 },
    { name: "Pendidikan", target: 8000000 },
    { name: "Kesehatan", target: 6000000 },
    { name: "Bencana", target: 5000000 },
    { name: "Kegiatan Keagamaan", target: 12000000 }
  ];
  return categories.map((cat) => {
    const items = appState.distributions.filter((item) => item.status === "Disalurkan" && item.category === cat.name);
    const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);
    const percentage = Math.min(100, Math.round((totalAmount / cat.target) * 100));
    return `
      <article class="program-card">
        <strong>${cat.name}</strong>
        <span>${new Set(items.map((item) => item.recipientName)).size} penerima manfaat</span>
        <div class="program-progress-container">
          <div class="program-progress-bar">
            <div class="program-progress-fill" style="width: ${percentage}%;"></div>
          </div>
          <div class="program-progress-labels">
            <span>Tersalur: ${formatRupiah(totalAmount)}</span>
            <span>${percentage}% dari target</span>
          </div>
        </div>
      </article>
    `;
  }).join("");
}

export function renderPublicActivities() {
  const pickupActivities = appState.pickups
    .filter((pickup) => pickup.status === "Disetujui Bendahara")
    .map((pickup) => ({
      date: pickup.date,
      type: "Pengambilan Koin",
      title: `Pengambilan dari donatur wilayah RT/RW`,
      amount: pickup.amount
    }));
  const distributionActivities = appState.distributions
    .filter((item) => item.status === "Disalurkan")
    .map((item) => ({
      date: item.date,
      type: "Penyaluran Bantuan",
      title: item.category,
      amount: item.amount
    }));
  const socialActivities = [
    { date: "2026-05-26", type: "Kegiatan Sosial", title: "Bakti sosial dan pendataan penerima manfaat", amount: 0 },
    { date: "2026-05-19", type: "Kegiatan Sosial", title: "Pengajian ranting dan sosialisasi Koin NU", amount: 0 }
  ];
  return [...pickupActivities, ...distributionActivities, ...socialActivities]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 10)
    .map((activity) => `
      <article class="public-activity">
        <div>
          <strong>${escapeHtml(activity.type)}</strong>
          <span>${formatDateId(activity.date)} - ${escapeHtml(activity.title)}</span>
        </div>
        <small>${activity.amount ? formatRupiah(activity.amount) : "Kegiatan"}</small>
      </article>
    `).join("");
}

export function renderPublicGallery() {
  const session = getSession();
  const canDelete = canManagePublicContent(session?.role);
  
  let docs = appState.publicDocumentation;
  if (appState.galleryFilterOrg && appState.galleryFilterOrg !== "all") {
    docs = docs.filter(item => (item.organization || "ranting") === appState.galleryFilterOrg);
  }
  
  return docs.map((item) => `
    <article class="gallery-card" style="position:relative;">
      <img src="${escapeHtml(item.photoUrl)}" alt="${escapeHtml(item.title)}" loading="lazy" style="cursor:pointer;" onclick="openPhotoViewer('${escapeHtml(item.photoUrl)}', '${escapeHtml(item.title)}')" />
      <strong>${escapeHtml(item.category)} · <span style="text-transform:uppercase;color:var(--primary-brand);">${escapeHtml(item.organization || "ranting")}</span></strong>
      <span>${escapeHtml(item.title)} - ${formatDateId(item.date)}</span>
      ${canDelete ? `<button class="danger-button compact" data-delete-gallery="${item.id}" type="button" style="position:absolute; bottom:10px; right:10px; padding:4px 8px; font-size:0.75rem; border-radius:4px; margin-top:0;">Hapus</button>` : ""}
    </article>
  `).join("") || `<div class="photo-empty">Belum ada foto dokumentasi.</div>`;
}

// Jadwal Shalat Widget Logic
let cachedPrayerTimes = null;
let cachedPrayerDate = "";

async function fetchPrayerTimes() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const dateStr = `${year}-${month}-${day}`;

  if (cachedPrayerTimes && cachedPrayerDate === dateStr) {
    return cachedPrayerTimes;
  }

  const fallback = {
    imsak: "04:19",
    subuh: "04:29",
    dzuhur: "11:45",
    ashar: "15:05",
    maghrib: "17:36",
    isya: "18:50",
    lokasi: "KAB. BANYUMAS",
    tanggal: `${day}/${month}/${year}`
  };

  try {
    const response = await fetch(`https://api.myquran.com/v2/sholat/jadwal/1402/${year}/${month}/${day}`);
    if (!response.ok) throw new Error("API response error");
    const json = await response.json();
    if (json && json.status && json.data && json.data.jadwal) {
      const j = json.data.jadwal;
      cachedPrayerTimes = {
        imsak: j.imsak,
        subuh: j.subuh,
        dzuhur: j.dzuhur,
        ashar: j.ashar,
        maghrib: j.maghrib,
        isya: j.isya,
        lokasi: json.data.lokasi || "KAB. BANYUMAS",
        tanggal: j.tanggal
      };
      cachedPrayerDate = dateStr;
      return cachedPrayerTimes;
    }
  } catch (error) {
    console.warn("Gagal mengambil jadwal shalat dari API, menggunakan fallback:", error);
  }

  return fallback;
}

function getActivePrayerIndex(schedule) {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const parseTime = (timeStr) => {
    if (!timeStr) return 0;
    const [h, m] = timeStr.split(":").map(Number);
    return h * 60 + m;
  };

  const prayers = [
    { name: "Imsak", time: parseTime(schedule.imsak) },
    { name: "Subuh", time: parseTime(schedule.subuh) },
    { name: "Dzuhur", time: parseTime(schedule.dzuhur) },
    { name: "Ashar", time: parseTime(schedule.ashar) },
    { name: "Maghrib", time: parseTime(schedule.maghrib) },
    { name: "Isya", time: parseTime(schedule.isya) }
  ];

  for (let i = 0; i < prayers.length; i++) {
    if (prayers[i].time > currentMinutes) {
      return i;
    }
  }
  return -1;
}

export async function updatePrayerWidget(containerId) {
  const container = document.querySelector(containerId);
  if (!container) return;

  container.innerHTML = `
    <div class="prayer-widget-loading" style="padding: 1rem; text-align: center; color: rgba(255,255,255,0.7); font-size: 0.85rem;">
      Memuat Jadwal Shalat...
    </div>
  `;

  const schedule = await fetchPrayerTimes();
  const activeIdx = getActivePrayerIndex(schedule);

  const prayerList = [
    { label: "Imsak", time: schedule.imsak },
    { label: "Subuh", time: schedule.subuh },
    { label: "Dzuhur", time: schedule.dzuhur },
    { label: "Ashar", time: schedule.ashar },
    { label: "Maghrib", time: schedule.maghrib },
    { label: "Isya", time: schedule.isya }
  ];

  container.innerHTML = `
    <div class="prayer-widget-card">
      <div class="prayer-widget-header">
        <div>
          <h4>Jadwal Shalat</h4>
          <small>${escapeHtml(schedule.lokasi)} · ${escapeHtml(schedule.tanggal)}</small>
        </div>
        <span class="prayer-live-dot">Banyumas</span>
      </div>
      <div class="prayer-grid">
        ${prayerList.map((p, idx) => {
          const isNext = idx === activeIdx;
          return `
            <div class="prayer-item ${isNext ? "next-prayer" : ""}">
              <span class="prayer-name">${p.label}</span>
              <span class="prayer-time">${p.time}</span>
              ${isNext ? '<span class="prayer-badge">Selanjutnya</span>' : ""}
            </div>
          `;
        }).join("")}
      </div>
    </div>
  `;
}

export function getPublishedNews() {
  return appState.news.filter((item) => item.status === "published").sort((a, b) => String(b.date).localeCompare(String(a.date)));
}

export function renderNewsCards(items, admin = false) {
  return items.map((item) => `
    <article class="gallery-card news-card">
      ${item.imageUrl ? `<img src="${escapeHtml(item.imageUrl)}" alt="${escapeHtml(item.title)}" loading="lazy" />` : ""}
      <strong>${escapeHtml(item.category)} · ${formatDateId(item.date)}</strong>
      <h3>${escapeHtml(item.title)}</h3>
      <span>${escapeHtml(item.excerpt || item.content.slice(0, 140))}</span>
      ${admin ? `<small>Status: ${escapeHtml(item.status)} | Org: <strong style="text-transform:uppercase;color:var(--primary-brand);">${escapeHtml(item.organization || "ranting")}</strong></small>` : ""}
      ${admin ? `<div class="card-actions"><button class="ghost-button" data-edit-news="${item.id}" type="button">Edit</button><button class="danger-button" data-delete-news="${item.id}" type="button">Hapus</button></div>` : ""}
    </article>
  `).join("") || `<div class="photo-empty">Belum ada berita.</div>`;
}

export function renderPublicDashboard() {
  const session = getSession();
  const canUploadDocumentation = canManagePublicContent(session?.role);
  const profile = appState.branchProfile;
  const activeDonors = appState.donors.filter((donor) => donor.active).length;
  const income = getPublicApprovedIncome();
  const distribution = getPublicDistributionTotal();
  const beneficiaries = new Set(appState.distributions.filter((item) => item.status === "Disalurkan").map((item) => item.recipientName)).size;
  const chair = appState.boardMembers.find((member) => member.position === "Ketua");
  const secretary = appState.boardMembers.find((member) => member.position === "Sekretaris");
  const treasurer = appState.boardMembers.find((member) => member.position === "Bendahara");

  document.title = `${brand.name} | Transparansi ${profile.branchName}`;
  app.innerHTML = `
    <section class="public-shell">
      <header class="public-header">
        <div class="public-brand">
          ${renderLazisnuLogo("public-logo")}
          <div>
            <strong>${brand.name}</strong>
            <span>${brand.subtitle}</span>
          </div>
        </div>
        <nav>
          <a href="#ringkasan">Ringkasan</a>
          <a href="#peta-sebaran-container">Peta Sebaran</a>
          <a href="#program">Program</a>
          <a href="#profil">Profil</a>
        </nav>
      </header>

      <section class="public-hero">
        <div class="public-hero-content">
          <p class="eyebrow">Transparansi Publik</p>
          <h1>${brand.name}: koin warga dikelola terbuka untuk maslahat bersama.</h1>
          <strong class="public-tagline">${brand.tagline}</strong>
          <p>Ringkasan ini menampilkan data agregat tanpa nomor HP donatur, alamat detail, atau data pribadi sensitif.</p>
          <div class="public-actions">
            <button class="ghost-button" id="printPublicButton" type="button">Cetak Ringkasan</button>
            <button class="primary-button compact" id="downloadPublicPdfButton" type="button">Simpan sebagai PDF</button>
          </div>
        </div>
        <div class="public-hero-widget">
          <div id="public-prayer-container" style="width: 100%;"></div>
        </div>
      </section>

      <section class="public-summary" id="ringkasan">
        <article><span>Donatur aktif</span><strong>${activeDonors}</strong></article>
        <article><span>Pemasukan bulan berjalan</span><strong>${formatRupiah(income)}</strong></article>
        <article><span>Penyaluran bulan berjalan</span><strong>${formatRupiah(distribution)}</strong></article>
        <article><span>Saldo saat ini</span><strong>${formatRupiah(income - distribution)}</strong></article>
        <article><span>Penerima manfaat</span><strong>${beneficiaries}</strong></article>
      </section>

      <section class="public-chart-grid">
        ${renderPublicChart("Pemasukan 12 Bulan Terakhir", getPublicMonthlySeries("income"))}
        ${renderPublicChart("Penyaluran 12 Bulan Terakhir", getPublicMonthlySeries("distribution"))}
      </section>

      <!-- Peta Sebaran Maslahat -->
      <section class="public-section" id="peta-sebaran-container">
        <div class="public-section-heading">
          <p class="eyebrow">Peta Maslahat</p>
          <h2>Sebaran Penyaluran Dana Sosial</h2>
        </div>
        <div class="public-panel map-panel" style="padding: 1rem;">
          <div id="distribution-map" style="height: 400px; border-radius: var(--radius-md); box-shadow: var(--shadow-sm); z-index: 1; border: 1px solid var(--border-light);"></div>
          <div class="map-legend" style="display: flex; gap: 1.5rem; justify-content: center; margin-top: 1rem; font-size: 0.85rem; color: #555;">
            <span style="display: inline-flex; align-items: center; gap: 0.5rem;"><span style="display: inline-block; background: #10b981; width: 12px; height: 12px; border-radius: 50%;"></span> Sudah Disalurkan</span>
            <span style="display: inline-flex; align-items: center; gap: 0.5rem;"><span style="display: inline-block; background: #d97706; width: 12px; height: 12px; border-radius: 50%;"></span> Rencana Penyaluran (Draft)</span>
          </div>
        </div>
      </section>

      <section class="public-section" id="program">
        <div class="public-section-heading">
          <p class="eyebrow">Program Bantuan</p>
          <h2>Dana tersalur per program</h2>
        </div>
        <div class="program-grid">${renderPublicPrograms()}</div>
      </section>

      <section class="public-grid-two">
        <article class="public-panel">
          <div class="public-section-heading">
            <p class="eyebrow">Aktivitas</p>
            <h2>10 aktivitas terbaru</h2>
          </div>
          <div class="public-activity-list">${renderPublicActivities()}</div>
        </article>
        <article class="public-panel">
          <div class="public-section-heading" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
            <div>
              <p class="eyebrow">Dokumentasi</p>
              <h2>Galeri kegiatan</h2>
            </div>
            <select id="filterGalleryOrganization" class="select-filter" style="padding:0.4rem 0.8rem; border:1px solid var(--border-light); border-radius:4px; font-weight:600; font-size:0.85rem;" onchange="filterGalleryList(this.value)">
              <option value="all" ${!appState.galleryFilterOrg || appState.galleryFilterOrg === "all" ? "selected" : ""}>Semua Organisasi</option>
              <option value="ranting" ${appState.galleryFilterOrg === "ranting" ? "selected" : ""}>Ranting NU (Umum)</option>
              ${BANOM_DATA.map(item => `
                <option value="${item.slug}" ${appState.galleryFilterOrg === item.slug ? "selected" : ""}>${item.name}</option>
              `).join("")}
            </select>
          </div>
          <div class="gallery-grid">${renderPublicGallery()}</div>
          ${canUploadDocumentation ? `
            <form class="public-upload-form" id="publicDocumentationForm">
               <h3>Tambah Dokumentasi Publik</h3>
               <div class="form-grid">
                 <label class="field"><span>Judul kegiatan</span><input name="title" required /></label>
                 <label class="field"><span>Kategori</span><select name="category"><option>Santunan</option><option>Pengajian</option><option>Bakti Sosial</option><option>Kegiatan Ranting</option></select></label>
                 <label class="field"><span>Tanggal</span><input name="date" type="date" value="${getLocalDateString()}" required /></label>
                 <label class="field"><span>Organisasi Target</span><select name="organization">
                   <option value="ranting">Ranting NU (Umum)</option>
                   ${BANOM_DATA.map(item => `
                     <option value="${item.slug}">${item.name}</option>
                   `).join("")}
                 </select></label>
                 <label class="field"><span>Foto kegiatan</span><input name="photo" id="publicDocumentationPhoto" type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" required /></label>
               </div>
               <div id="publicDocumentationPreview">${renderPhotoPreview("", "Preview dokumentasi kegiatan")}</div>
               <p class="form-error" id="publicDocumentationError" role="alert"></p>
               <button class="primary-button compact" type="submit">Upload Foto</button>
             </form>
           ` : ""}
        </article>
      </section>

      <section class="public-profile" id="profil">
        <div>
          <p class="eyebrow">Profil Ranting</p>
          <h2>${escapeHtml(profile.branchName)}</h2>
          <p>${escapeHtml(profile.secretariatAddress)}</p>
        </div>
        <div class="public-profile-list">
          <span>Ketua: ${escapeHtml(chair?.name || "-")}</span>
          <span>Sekretaris: ${escapeHtml(secretary?.name || "-")}</span>
          <span>Bendahara: ${escapeHtml(treasurer?.name || "-")}</span>
          <span>Kontak resmi: ${escapeHtml(profile.phone)} / ${escapeHtml(profile.email)}</span>
        </div>
      </section>
      ${renderBrandFooter("public-footer")}
    </section>
  `;

  document.querySelector("#printPublicButton")?.addEventListener("click", () => window.print());
  document.querySelector("#downloadPublicPdfButton")?.addEventListener("click", () => window.print());
  document.querySelector("#publicDocumentationForm")?.addEventListener("submit", handlePublicDocumentationSubmit);
  bindImagePreview("#publicDocumentationPhoto", "#publicDocumentationPreview", "#publicDocumentationError");

  document.querySelectorAll("[data-delete-gallery]").forEach((button) => {
    button.addEventListener("click", async () => {
      const session = getSession();
      if (!canManagePublicContent(session?.role)) return;
      if (!confirm("Hapus dokumentasi foto ini?")) return;
      const id = Number(button.dataset.deleteGallery);
      // Directly fetch API request inside view or dispatch event, we use state internalRequest
      try {
        await internalRequest(`table/dokumentasi_kegiatan/${id}`, { method: "DELETE" });
        appState.publicDocumentation = appState.publicDocumentation.filter((item) => item.id !== id);
        renderPublicDashboard();
      } catch (err) {
        alert("Gagal menghapus dokumentasi: " + err.message);
      }
    });
  });
  updatePrayerWidget("#public-prayer-container");

  loadLeaflet(() => {
    initializeDistributionMap();
  });
}

function initializeDistributionMap() {
  const mapEl = document.getElementById("distribution-map");
  if (!mapEl) return;

  const centerLat = -7.3770;
  const centerLng = 109.2205;

  const map = window.L.map("distribution-map").setView([centerLat, centerLng], 15);

  window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);

  const items = appState.distributions.filter((item) => item.status === "Disalurkan" || item.status === "Draft");

  if (items.length === 0) {
    window.L.marker([centerLat, centerLng])
      .addTo(map)
      .bindPopup("<b>Sekretariat PRNU Karangsalam Kidul II</b><br>Belum ada data penyaluran bantuan terdaftar.")
      .openPopup();
    return;
  }

  items.forEach((item) => {
    const rt = Number(item.rt) || 1;
    const rw = Number(item.rw) || 1;

    const seed = (rt * 7) + (rw * 13) + (item.id % 17);
    const angle = (seed * 22.5) * (Math.PI / 180);
    const radius = 0.0012 + ((item.id % 5) * 0.0004);

    const lat = centerLat + (Math.sin(angle) * radius * 0.4);
    const lng = centerLng + (Math.cos(angle) * radius);

    const markerColor = item.status === "Disalurkan" ? "#10b981" : "#d97706";

    const customIcon = window.L.divIcon({
      className: "custom-map-pin",
      html: `<div style="background-color: ${markerColor}; width: 14px; height: 14px; border-radius: 50%; border: 2.5px solid #fff; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
      iconSize: [14, 14],
      iconAnchor: [7, 7]
    });

    const popupContent = `
      <div class="map-popup-card" style="min-width: 180px;">
        <h4 style="margin:0 0 4px; color:#15803d; font-size: 0.9rem; font-weight: bold;">${escapeHtml(item.category)}</h4>
        <div style="font-size:0.7rem; color:#666; margin-bottom:6px;">No: ${escapeHtml(item.distributionNo)}</div>
        <table style="width:100%; border-collapse:collapse; font-size:0.75rem; text-align:center;">
          <tr>
            <th style="padding:2px 0; color:#888; font-weight:normal; width:45%;">Penerima</th>
            <td style="padding:2px 0; font-weight:bold;">${escapeHtml(item.recipientName)}</td>
          </tr>
          <tr>
            <th style="padding:2px 0; color:#888; font-weight:normal;">Wilayah</th>
            <td style="padding:2px 0;">RT ${escapeHtml(item.rt)} / RW ${escapeHtml(item.rw)}</td>
          </tr>
          <tr>
            <th style="padding:2px 0; color:#888; font-weight:normal;">Nominal</th>
            <td style="padding:2px 0; font-weight:bold; color:#15803d;">${formatRupiah(item.amount)}</td>
          </tr>
          <tr>
            <th style="padding:2px 0; color:#888; font-weight:normal;">Tanggal</th>
            <td style="padding:2px 0;">${formatDateId(item.date)}</td>
          </tr>
        </table>
        ${item.note ? `<p style="margin:6px 0 0; font-size:0.7rem; color:#555; border-top:1px dashed #eee; padding-top:4px; font-style:italic;">"${escapeHtml(item.note)}"</p>` : ""}
      </div>
    `;

    window.L.marker([lat, lng], { icon: customIcon })
      .addTo(map)
      .bindPopup(popupContent);
  });
}

async function handlePublicDocumentationSubmit(event) {
  event.preventDefault();
  const session = getSession();
  if (!canManagePublicContent(session?.role)) return;
  const form = event.currentTarget;
  const data = new FormData(form);
  const photo = form.elements.photo?.files?.[0];
  const error = document.querySelector("#publicDocumentationError");
  if (!photo) {
    error.textContent = "Pilih foto kegiatan terlebih dahulu.";
    return;
  }
  const photoError = validateImageFile(photo);
  if (photoError) {
    error.textContent = photoError;
    return;
  }
  let uploadedPhoto;
  try {
    uploadedPhoto = await uploadDocumentationPhoto(photo, "kegiatan-publik");
  } catch (uploadError) {
    error.textContent = uploadError.message;
    return;
  }
  const targetItem = {
    id: Date.now(),
    title: String(data.get("title") || "").trim(),
    category: String(data.get("category") || "Kegiatan Ranting"),
    date: String(data.get("date") || getLocalDateString()),
    photoPath: uploadedPhoto.path || "",
    photoName: uploadedPhoto.name,
    photoUrl: uploadedPhoto.url,
    organization: String(data.get("organization") || "ranting")
  };
  appState.publicDocumentation = [targetItem, ...appState.publicDocumentation];
  syncRowToPostgres("dokumentasi_kegiatan", targetItem);
  renderPublicDashboard();
}

window.filterGalleryList = function(val) {
  appState.galleryFilterOrg = val;
  renderPublicDashboard();
};

// === Main Landing Page Renderer ===
export function renderLandingPage() {
  const totalIncome = getPublicApprovedIncome();
  const totalTarget = 50000000;
  const totalPercentage = Math.min(100, Math.round((totalIncome / totalTarget) * 100));
  const activeDonors = appState.donors.filter((item) => item.active !== false).length;
  const activeOfficers = appState.officers.filter((item) => item.active !== false).length;
  const distributedFunds = appState.distributions
    .filter((item) => item.status === "Disalurkan")
    .reduce((sum, item) => sum + item.amount, 0);
  const portalAnnouncements = [
    { title: "Pendataan layanan warga dan UMKM dimulai", copy: "Pengurus membuka pendataan UMKM, masjid/mushola, dan kebutuhan layanan warga Karangsalam Kidul II.", tag: "Layanan Warga" },
    { title: "Setoran Koin NU dicatat transparan", copy: "Warga dapat memantau ringkasan pemasukan dan penyaluran melalui halaman transparansi.", tag: "Koin NU" }
  ];
  const citizenServices = [
    { title: "Layanan Kematian", copy: "Informasi rumah duka, jadwal tahlil, dan kontak keluarga.", href: "#kontak" },
    { title: "Pengajuan Bantuan", copy: "Sampaikan kebutuhan bantuan sosial kepada pengurus ranting.", href: "#kontak" },
    { title: "Data Masjid & Mushola", copy: "Pendataan tempat ibadah dan takmir di wilayah ranting.", href: "#kontak" },
    { title: "Kontak Pengurus", copy: "Hubungi pengurus untuk kegiatan, Koin NU, dan layanan warga.", href: "#kontak" }
  ];
  const featuredUmkm = [
    { name: "Warung Berkah Bu Aminah", category: "Kuliner", owner: "Siti Aminah", product: "Jajanan pasar dan nasi box", phone: "6281270000101" },
    { name: "Mitra Tani Kaliputra", category: "Pertanian", owner: "Ahmad Fauzi", product: "Sayur, bibit, dan hasil kebun", phone: "6281270000202" },
    { name: "Konveksi Santri Mandiri", category: "Jasa", owner: "Miftahul Huda", product: "Seragam banom dan bordir", phone: "6281270000303" }
  ];

  const programs = [
    ["Aswaja", "Merawat amaliyah Aswaja An-Nahdliyah dalam kehidupan berjamaah.", `<svg class="lucide-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`],
    ["Dakwah", "Menguatkan majelis ilmu, pengajian, dan syiar Islam rahmatan lil alamin.", `<svg class="lucide-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>`],
    ["Sosial", "Hadir bersama warga melalui kepedulian dan gotong royong.", `<svg class="lucide-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></svg>`],
    ["Ekonomi Umat", "Mendorong kemandirian warga dan penguatan usaha lokal.", `<svg class="lucide-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>`],
    ["Digitalisasi", "Merapikan layanan, informasi, dan transparansi organisasi.", `<svg class="lucide-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect><line x1="12" y1="2" x2="12" y2="22"></line><line x1="2" y1="12" x2="22" y2="12"></line></svg>`]
  ];
  const institutions = BANOM_DATA;
  const events = [
    { day: "05", month: "Jun", title: "Pengajian Selapanan & Kajian Kitab Nashaihul Ibad", time: "19:30 - 22:00 WIB", location: "Serambi Masjid Baiturrahman RT 03" },
    { day: "12", month: "Jun", title: "Santunan Anak Yatim & Dhuafa Bulanan", time: "16:00 - 18:00 WIB", location: "Sekretariat PRNU Karangsalam Kidul II" },
    { day: "19", month: "Jun", title: "Lailatul Ijtima' & Istighotsah Bersama", time: "20:00 - 22:30 WIB", location: "Mushola Al-Ikhlas RT 03 RW 03" },
    { day: "26", month: "Jun", title: "Rapat Pleno Syuriyah & Tanfidziyah", time: "09:00 - 12:00 WIB", location: "Sekretariat PRNU" },
    { day: "03", month: "Jul", title: "Pengajian Selapanan — Kajian Rutin Bulanan", time: "19:30 - 22:00 WIB", location: "Serambi Masjid Baiturrahman" },
    { day: "10", month: "Jul", title: "Santunan & Penyaluran Dana Sosial RT 01-06", time: "15:30 - 17:30 WIB", location: "Balai RT 03 RW 03" },
    { day: "17", month: "Jul", title: "Lailatul Ijtima' & Laporan Koin NU Ranting", time: "20:00 - 22:30 WIB", location: "Mushola Al-Barokah RT 01" },
    { day: "24", month: "Jul", title: "Pelatihan Digitalisasi UMKM Muslimat NU", time: "09:00 - 13:00 WIB", location: "Sekretariat PRNU" }
  ];
  const sermons = [
    { title: "Kewajiban Zakat & Khidmah Koin NU dalam Perspektif Fiqih", speaker: "KH. Muhammad Sholeh", duration: "35:10", audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3", date: "2026-05-26" },
    { title: "Fadhilah Lailatul Ijtima' dan Amaliyah Aswaja An-Nahdliyah", speaker: "Kiai Masruri", duration: "42:15", audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3", date: "2026-04-24" },
    { title: "Sedekah Subuh, Kepedulian Sosial, dan Gerakan Koin NU", speaker: "Ustadz KH. Ahmad Hambali", duration: "28:40", audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3", date: "2026-03-19" },
    { title: "Ukhuwah Islamiyah dan Nilai Kebangsaan dalam Tradisi NU", speaker: "KH. M. Yusuf Chudlori", duration: "52:12", audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3", date: "2026-02-15" },
    { title: "Thariqah Aswaja: Mengenal Mazhab dan Amaliyah Nahdliyin", speaker: "Kiai Masruri", duration: "38:55", audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3", date: "2026-01-16" },
    { title: "Maulid Nabi: Mencintai Rasulullah SAW dengan Karya & Amal", speaker: "KH. Muhammad Sholeh", duration: "46:30", audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3", date: "2025-09-16" }
  ];
  const news = getPublishedNews().slice(0, 6);

  document.title = "PRNU Karangsalam Kidul II | Merawat Tradisi, Menguatkan Khidmah";
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) {
    metaDesc.setAttribute("content", "Website resmi Pengurus Ranting Nahdlatul Ulama Karangsalam Kidul II: profil, program, berita, galeri, Koin NU, dan layanan umat.");
  }
  app.innerHTML = `
    <div class="landing-page">
      <!-- Header Topbar -->
      <div class="landing-topbar">
        <div class="landing-topbar-content">
          <div class="landing-topbar-info">
            <span>
              <svg class="lucide-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 9.24v7.68z"/></svg>
              +62 812-7000-0101
            </span>
            <span>
              <svg class="lucide-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
              admin@rantingnu.id
            </span>
          </div>
          <div class="landing-topbar-actions">
            <a href="/admin" class="landing-topbar-link landing-topbar-link-admin">
              <svg class="lucide-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" x2="3" y1="12" y2="12"/></svg>
              Login Admin
            </a>
            <a href="/login" class="landing-topbar-link">Masuk SIKOINNU</a>
          </div>
        </div>
      </div>

      <!-- Main Header -->
      <header class="landing-header">
        <a class="landing-brand" href="#beranda" aria-label="PRNU Karangsalam Kidul II">
          <img src="/logo-karangsalam-2.png" alt="Logo Karangsalam 2" />
          <span><strong>PRNU</strong><small>Karangsalam Kidul II</small></span>
        </a>
        <button class="landing-menu" id="landingMenuButton" aria-expanded="false" aria-controls="landingNav">Menu</button>
        <nav class="landing-nav" id="landingNav">
          <a href="#beranda">Beranda</a>
          <a href="#profil">Profil</a>
          <a href="#jadwal-shalat">Jadwal Shalat</a>
          <a href="#program">Program</a>
          <a href="#layanan-warga">Layanan</a>
          <a href="#umkm">UMKM</a>
          <a href="#agenda">Agenda</a>
          <div class="nav-dropdown-wrapper">
            <span class="nav-dropdown-trigger">Banom NU ▾</span>
            <div class="nav-dropdown-content">
              ${BANOM_DATA.map(item => `
                <a href="/banom/${item.slug}" onclick="event.preventDefault(); navigateToBanom('${item.slug}');">${item.name}</a>
              `).join("")}
            </div>
          </div>
          <a href="#berita">Berita</a>
          <a href="#donasi">Donasi</a>
          <a href="#kontak">Hubungi</a>
        </nav>
      </header>

      <main>
        <!-- Hero Section -->
        <section class="landing-hero" id="beranda">
          <div class="landing-hero-content">
            <div class="hero-kicker-badge">
              <span>Nahdlatul Ulama</span>
              <span>Ranting Karangsalam Kidul II</span>
            </div>
            <h1>Merawat Tradisi,<br /><em>Menguatkan Khidmah</em></h1>
            <p class="landing-tagline">Membangun Umat Dari Tingkatan Ranting</p>
            <p class="landing-hero-copy">Bergerak bersama warga menjaga amalan Ahlussunnah wal Jama'ah, menata layanan sosial-keumatan, dan mengelola infaq/sedekah secara amanah, profesional, dan terbuka.</p>
            <div class="landing-badges">
              <span class="landing-hero-tag">Aswaja An-Nahdliyah</span>
              <span class="landing-hero-tag">Khidmah Jama'ah</span>
              <span class="landing-hero-tag">Transparansi Koin NU</span>
            </div>
            <div class="landing-actions">
              <a class="landing-button landing-button-gold" href="#program">Lihat Program</a>
              <a class="landing-button landing-button-outline" href="#kontak">Hubungi Kami</a>
            </div>
          </div>
          <aside class="landing-hero-card">
            <div class="hero-card-pattern-overlay"></div>
            <div class="hero-card-branding">
              <img src="/logo-karangsalam-2.png" alt="Logo Karangsalam 2" />
              <div>
                <strong>SIKOINNU</strong>
                <small id="hero-clock-panel">Waktu: <span id="hero-clock">--:--:--</span> WIB</small>
              </div>
            </div>
            <div class="hero-card-welcome-message" style="margin-top: 1rem; text-align: center; width: 100%;">
              <p style="font-size: 0.88rem; line-height: 1.5; color: rgba(255,255,255,0.85); font-style: italic; border-left: 2px solid var(--gold); padding-left: 0.75rem;">
                "Merawat Tradisi, Menguatkan Khidmah, Membangun Umat. Sistem Informasi Pengelolaan Kotak Infaq Nahdlatul Ulama."
              </p>
              <div style="margin-top: 1.5rem; display: flex; justify-content: space-between; font-size: 0.75rem; color: var(--gold-light); font-weight: 700;">
                <span>MASA KHIDMAH: 2025-2030</span>
                <span>KAB. BANYUMAS</span>
              </div>
            </div>
          </aside>
        </section>

        <!-- Hero Quick Features Grid Overlay -->
        <div class="hero-quick-features-container">
          <div class="hero-quick-features">
            <div class="quick-feature-card">
              <div class="quick-feature-icon">
                <svg class="lucide-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
              </div>
              <div class="quick-feature-info">
                <h4>Shalat Berikutnya</h4>
                <p id="hero-next-prayer">Memuat...</p>
              </div>
            </div>
            <div class="quick-feature-card">
              <div class="quick-feature-icon">
                <svg class="lucide-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
              </div>
              <div class="quick-feature-info">
                <h4>Koin NU Ranting</h4>
                <p>Terkumpul: ${totalPercentage}% target</p>
              </div>
            </div>
            <div class="quick-feature-card">
              <div class="quick-feature-icon">
                <svg class="lucide-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
              </div>
              <div class="quick-feature-info">
                <h4>Kajian & Khutbah</h4>
                <p>2 Audio Kajian Aktif</p>
              </div>
            </div>
            <div class="quick-feature-card">
              <div class="quick-feature-icon">
                <svg class="lucide-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              </div>
              <div class="quick-feature-info">
                <h4>Badan Otonom</h4>
                <p>4 Banom & Lembaga</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Portal Warga Highlights -->
        <section class="portal-overview landing-section" id="layanan-warga">
          <div class="landing-heading-row">
            <div>
              <p class="landing-kicker">Portal Layanan Warga</p>
              <h2>Satu pintu informasi,<br /><span>layanan, dan pemberdayaan.</span></h2>
            </div>
            <p>Beranda kini disiapkan sebagai pusat informasi warga NU Karangsalam Kidul II: mudah dibaca di HP, dekat dengan kebutuhan warga, dan tetap terhubung dengan SIKOINNU.</p>
          </div>

          <div class="portal-alert-grid">
            ${portalAnnouncements.map((item) => `
              <article class="portal-alert-card">
                <small>${escapeHtml(item.tag)}</small>
                <h3>${escapeHtml(item.title)}</h3>
                <p>${escapeHtml(item.copy)}</p>
              </article>
            `).join("")}
          </div>

          <div class="portal-stats-grid">
            <article><span>Donatur Aktif</span><strong>${activeDonors.toLocaleString("id-ID")}</strong><small>Basis warga Koin NU</small></article>
            <article><span>Petugas Koin</span><strong>${activeOfficers.toLocaleString("id-ID")}</strong><small>Koordinasi lapangan</small></article>
            <article><span>Koin Tervalidasi</span><strong>${formatCompactRupiah(totalIncome)}</strong><small>Masuk sistem</small></article>
            <article><span>Dana Tersalur</span><strong>${formatCompactRupiah(distributedFunds)}</strong><small>Program sosial</small></article>
          </div>

          <div class="citizen-service-grid">
            ${citizenServices.map((item) => `
              <a class="citizen-service-card" href="${item.href}">
                <strong>${escapeHtml(item.title)}</strong>
                <span>${escapeHtml(item.copy)}</span>
              </a>
            `).join("")}
          </div>
        </section>

        <!-- About Section Redesign -->
        <section class="landing-intro landing-section landing-pattern-bg" id="profil">
          <div class="landing-intro-left">
            <p class="landing-kicker">Tentang Kami</p>
            <h2>Menjaga tradisi.<br /><span>Menyapa zaman.</span></h2>
            <p class="landing-intro-desc">PRNU Karangsalam Kidul II hadir sebagai wadah khidmah jam'iyyah Nahdlatul Ulama dalam bidang dakwah, pendidikan, sosial, ekonomi umat, dan penguatan amaliyah Aswaja An-Nahdliyah.</p>
            <ul class="landing-checklist">
              <li>
                <span class="checklist-icon">
                  <svg class="lucide-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                </span>
                <div>
                  <strong>Kemandirian Umat:</strong>
                  <span>Pengelolaan dana sosial/Koin NU secara amanah, terbuka, dan berdampak maslahat.</span>
                </div>
              </li>
              <li>
                <span class="checklist-icon">
                  <svg class="lucide-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                </span>
                <div>
                  <strong>Dakwah Aswaja:</strong>
                  <span>Menjaga keutuhan aqidah Ahlussunnah wal Jama'ah melalui pengajian dan kajian keilmuan.</span>
                </div>
              </li>
              <li>
                <span class="checklist-icon">
                  <svg class="lucide-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                </span>
                <div>
                  <strong>Sinergi Ranting:</strong>
                  <span>Kolaborasi aktif bersama Banom (Muslimat, Ansor, Fatayat, IPNU-IPPNU) di Karangsalam Kidul II.</span>
                </div>
              </li>
            </ul>
            <a class="landing-text-link" href="#lembaga">Kenali gerakan kami <span>→</span></a>
          </div>
          <div class="landing-intro-right">
            <div class="arched-image-wrapper">
              <img src="https://images.unsplash.com/photo-1564507592333-c60657eea523?auto=format&fit=crop&w=900&q=80" alt="Arsitektur Islam Ranting" class="arched-image" loading="lazy" />
              <div class="arched-image-border"></div>
            </div>
          </div>
        </section>

        <!-- Dedicated Prayer Times Section -->
        <section class="landing-prayer-section landing-section" id="jadwal-shalat">
          <div class="landing-heading-row">
            <div>
              <p class="landing-kicker">Waktu Ibadah</p>
              <h2>Jadwal Shalat Hari Ini<br /><span>Kabupaten Banyumas</span></h2>
            </div>
            <p class="prayer-section-tagline">Waktu shalat sinkron otomatis dengan jadwal resmi Kemenag RI untuk kemudahan ibadah jamaah Ranting.</p>
          </div>
          <div id="landing-prayer-container"></div>
        </section>

        <!-- Program Section -->
        <section class="landing-program-section landing-section" id="program">
          <div class="landing-heading-row">
            <div><p class="landing-kicker">Program Utama</p><h2>Khidmah yang tumbuh<br /><span>bersama warga.</span></h2></div>
            <p>Lima arah gerak untuk menguatkan kehidupan berjamaah dan memberi manfaat yang terasa dekat.</p>
          </div>
          <div class="landing-program-grid">
            ${programs.map(([title, copy, svgIcon], index) => `
              <article class="landing-program-card reveal-on-scroll reveal-delay-${(index % 4) * 100}">
                <span>${String(index + 1).padStart(2, "0")}</span>
                <b class="program-vector-icon">${svgIcon}</b>
                <h3>${title}</h3>
                <p>${copy}</p>
              </article>
            `).join("")}
          </div>
        </section>

        <!-- Banom & Lembaga -->
        <section class="landing-institutions landing-section landing-pattern-bg" id="lembaga">
          <div class="landing-heading-row">
            <div>
              <p class="landing-kicker">Badan Otonom (Banom) NU</p>
              <h2>Satu Jam'iyyah,<br /><span>Banyak Sayap Khidmah.</span></h2>
            </div>
            <p>Banom NU adalah "kamar-kamar" dalam satu rumah besar Nahdlatul Ulama — masing-masing bergerak sesuai basis dan keahliannya, namun berjalan dalam satu garis akidah Aswaja.</p>
          </div>
          <div class="landing-institution-grid">
            ${institutions.map((inst, index) => `
              <article class="landing-institution-card reveal-on-scroll reveal-delay-${(index % 4) * 100}" style="--inst-color: ${inst.color}; cursor: pointer;" onclick="navigateToBanom('${inst.slug}')">
                <div class="inst-card-header">
                  <div class="inst-icon-wrap" style="background: ${inst.color}15; color: ${inst.color}; border-color: ${inst.color}30;">
                    ${inst.icon}
                  </div>
                  <div>
                    <h3>${inst.name}</h3>
                    <small class="inst-tagline">${inst.tagline}</small>
                  </div>
                </div>
                <p class="inst-desc">${inst.desc}</p>
                <div class="inst-basis">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:12px;height:12px;flex-shrink:0;"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                  <span>${inst.basis}</span>
                </div>
                <div class="inst-tags">
                  ${inst.tags.map(tag => `<span class="inst-tag" style="background:${inst.color}12; color:${inst.color}; border-color:${inst.color}25;">${tag}</span>`).join("")}
                </div>
              </article>
            `).join("")}
          </div>
        </section>

        <!-- Agenda Section -->
        <section class="landing-events landing-section" id="agenda">
          <div class="landing-heading-row">
            <div><p class="landing-kicker">Agenda Ranting</p><h2>Kegiatan terdekat<br /><span>di Karangsalam Kidul II.</span></h2></div>
            <p>Jadwal berkumpul, ngaji bersama, and konsolidasi khidmah jam'iyyah.</p>
          </div>
          <div class="landing-events-grid">
            ${events.map((ev, index) => `
              <article class="event-card reveal-on-scroll reveal-delay-${(index % 3) * 100}">
                <div class="event-date-badge">
                  <span class="event-day">${ev.day}</span>
                  <span class="event-month">${ev.month}</span>
                </div>
                <div class="event-details">
                  <h3>${ev.title}</h3>
                  <div class="event-meta">
                    <span>🕒 ${ev.time}</span>
                    <span>📍 ${ev.location}</span>
                  </div>
                </div>
              </article>
            `).join("")}
          </div>
        </section>

        <!-- UMKM Warga -->
        <section class="landing-umkm-section landing-section landing-pattern-bg" id="umkm">
          <div class="landing-heading-row">
            <div>
              <p class="landing-kicker">UMKM Warga</p>
              <h2>Ekonomi umat tumbuh<br /><span>dari tetangga sendiri.</span></h2>
            </div>
            <p>Direktori UMKM disiapkan untuk membantu warga menemukan produk, jasa, dan mitra usaha di lingkungan NU Karangsalam Kidul II.</p>
          </div>
          <div class="umkm-card-grid">
            ${featuredUmkm.map((item) => `
              <article class="umkm-card">
                <span>${escapeHtml(item.category)}</span>
                <h3>${escapeHtml(item.name)}</h3>
                <p>${escapeHtml(item.product)}</p>
                <small>Pemilik: ${escapeHtml(item.owner)}</small>
                <a href="https://wa.me/${escapeHtml(item.phone)}" target="_blank" rel="noreferrer">Hubungi via WhatsApp</a>
              </article>
            `).join("")}
          </div>
        </section>

        <!-- Kajian / Media Section -->
        <section class="landing-sermons landing-section landing-pattern-bg" id="kajian">
          <div class="landing-heading-row">
            <div><p class="landing-kicker">Kajian & Khutbah</p><h2>Mendengar ilmu,<br /><span>merawat sanad.</span></h2></div>
            <p>Rekaman pengajian dan kajian keislaman moderat khas warga Nahdliyin.</p>
          </div>
          <audio id="global-sermon-player" style="display: none;"></audio>
          <div class="landing-sermons-grid">
            ${sermons.map((ser, index) => `
              <article class="sermon-card">
                <div class="sermon-info">
                  <span class="sermon-number">${String(index + 1).padStart(2, "0")}</span>
                  <div>
                    <h3>${ser.title}</h3>
                    <small>Narasumber: <b>${ser.speaker}</b> · Durasi: ${ser.duration}${ser.date ? ` · <span style="color:var(--gold-dark)">${formatDateId(ser.date)}</span>` : ""}</small>
                  </div>
                </div>
                <div class="sermon-player-controls">
                  <button class="sermon-play-btn" data-audio="${ser.audioUrl}">
                    <svg class="lucide-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="6 3 20 12 6 21 6 3"/></svg>
                    Putar
                  </button>
                  <div class="sermon-progress-bar-container">
                    <div class="sermon-progress-track"><div class="sermon-progress-filled" style="width: 0%;"></div></div>
                  </div>
                  <a href="#" class="sermon-download-btn" title="Download Catatan PDF" onclick="event.preventDefault(); alert('Ringkasan PDF Kajian akan segera disediakan oleh sekretaris.');">
                    <svg class="lucide-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                    PDF
                  </a>
                </div>
              </article>
            `).join("")}
          </div>
        </section>

        <!-- News Section -->
        <section class="landing-news landing-section" id="berita">
          <div class="landing-heading-row">
            <div><p class="landing-kicker">Berita Terbaru</p><h2>Kabar dari<br /><span>ranting.</span></h2></div>
            <p>Catatan kegiatan dan gerak khidmah PRNU Karangsalam Kidul II.</p>
          </div>
          <div class="landing-news-grid">
            ${news.length ? news.map((item, index) => `
              <article class="news-item-card reveal-on-scroll reveal-delay-${(index % 3) * 100}" data-id="${item.id}" style="cursor: pointer;">
                <div class="news-img-container">
                  <img src="${escapeHtml(item.imageUrl)}" alt="${escapeHtml(item.title)}" loading="lazy" />
                </div>
                <div class="news-card-content">
                  <small>${escapeHtml(item.category)} · ${formatDateId(item.date)}</small>
                  <h3>${escapeHtml(item.title)}</h3>
                  <p>${escapeHtml(item.excerpt)}</p>
                  <span class="news-readmore-btn">Baca kabar lengkap <span>→</span></span>
                </div>
              </article>
            `).join("") : `<div class="photo-empty" style="grid-column: 1 / -1;">Belum ada berita yang diterbitkan.</div>`}
          </div>
        </section>

        <section class="landing-gallery landing-section landing-pattern-bg" id="galeri">
          <div class="landing-heading-row">
            <div><p class="landing-kicker">Galeri Khidmah</p><h2>Yang dikerjakan bersama,<br /><span>menjadi cerita bersama.</span></h2></div>
            <p>Rangkaian dokumentasi kegiatan keagamaan, sosial, dan koordinasi jam'iyyah pengurus ranting.</p>
          </div>
          <div class="landing-gallery-grid">
            ${appState.publicDocumentation.slice(0, 8).map((doc, index) => `
              <figure class="gallery-fig reveal-on-scroll reveal-delay-${(index % 4) * 100}" title="${escapeHtml(doc.title)}">
                <img src="${escapeHtml(doc.photoUrl)}" alt="${escapeHtml(doc.title)}" loading="lazy" />
                <figcaption>
                  <span class="gallery-cat">${escapeHtml(doc.category)}</span>
                  <span>${escapeHtml(doc.title)}</span>
                </figcaption>
              </figure>
            `).join("")}
          </div>
        </section>

        <!-- Donation Campaign Cause Section -->
        <section class="landing-donation landing-section" id="donasi">
          <div>
            <p class="landing-kicker">Koin NU & Donasi</p>
            <h2>Sedikit demi sedikit,<br /><span>manfaat terus mengalir.</span></h2>
            <p>Mari bersama menguatkan khidmah NU untuk umat melalui Koin NU and donasi program sosial.</p>
            <div class="landing-actions">
              <a class="landing-button landing-button-gold" href="/transparansi">Lihat Transparansi Koin NU</a>
              <button class="landing-button landing-button-outline" id="copyDonationButton" type="button">Donasi Sekarang</button>
            </div>
          </div>
          <div class="landing-donation-stat">
            <small>Gerakan bersama</small>
            <strong>Koin NU Ranting</strong>
            <div class="program-progress-container" style="width: 100%; margin: 1.25rem 0 0.75rem; text-align: center;">
              <div class="program-progress-bar" style="background: rgba(255,255,255,0.12);">
                <div class="program-progress-fill" style="width: ${totalPercentage}%;"></div>
              </div>
              <div class="program-progress-labels" style="margin-top: 0.5rem; display: flex; justify-content: space-between;">
                <span style="color: var(--gold-light); font-size: 0.72rem; font-weight: 700;">Terkumpul: ${formatRupiah(totalIncome)}</span>
                <span style="color: var(--gold); font-size: 0.72rem; font-weight: 700;">${totalPercentage}% dari target</span>
              </div>
            </div>
            <span>Amanah · Terbuka · Berdampak</span>
          </div>
        </section>

        <!-- Zakat Calculator Section -->
        <section class="landing-calculator-section landing-section" id="kalkulator-zakat">
          <div class="calculator-container reveal-on-scroll" style="max-width: 1100px; margin: 0 auto; width: 100%;">
            <div class="landing-heading-row" style="margin-bottom: 2.5rem; text-align: center; display: block;">
              <p class="landing-kicker">Layanan Hitung Syariah</p>
              <h2>Kalkulator Zakat<br /><span>Zakat Profesi, Maal, & Fitrah</span></h2>
              <p style="max-width: 650px; margin: 1rem auto 0; font-size: 0.95rem; line-height: 1.6; color: var(--neutral-mid);">
                Hitung kewajiban zakat Anda berdasarkan nishab resmi (setara 85 gram emas). Hasil perhitungan dapat disalurkan langsung melalui QRIS atau transfer rekening.
              </p>
            </div>
            
            <div class="calc-tabs" style="display: flex; justify-content: center; gap: 0.75rem; margin-bottom: 2.5rem; flex-wrap: wrap;">
              <button class="landing-button calc-tab-btn active" id="calc-tab-profesi" type="button" style="border-radius: var(--radius-pill); font-size: 0.9rem; font-weight: 700; cursor: pointer;">Zakat Profesi (Penghasilan)</button>
              <button class="landing-button calc-tab-btn" id="calc-tab-maal" type="button" style="border-radius: var(--radius-pill); font-size: 0.9rem; font-weight: 700; cursor: pointer;">Zakat Maal (Harta)</button>
              <button class="landing-button calc-tab-btn" id="calc-tab-fitrah" type="button" style="border-radius: var(--radius-pill); font-size: 0.9rem; font-weight: 700; cursor: pointer;">Zakat Fitrah</button>
            </div>

            <div class="calc-card" style="background: rgba(255,255,255,0.03); border: 1.5px solid rgba(255,255,255,0.08); border-radius: var(--radius-lg); padding: 2.5rem; box-shadow: var(--shadow-md); backdrop-filter: blur(8px);">
              
              <!-- TAB 1: ZAKAT PROFESI -->
              <div id="calc-content-profesi" class="calc-tab-content">
                <div class="calc-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 2.5rem; align-items: start;">
                  <div class="calc-inputs" style="display: flex; flex-direction: column; gap: 1.25rem;">
                    <label class="field" style="margin: 0; display: flex; flex-direction: column; gap: 0.4rem;">
                      <span style="color: rgba(255,255,255,0.85); font-size: 0.88rem; font-weight: 700;">Pendapatan Bersih per Bulan (Rp)</span>
                      <input type="number" id="calc-profesi-salary" value="10000000" min="0" placeholder="Masukkan gaji bulanan..." style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.15); color: #fff; width: 100%; padding: 0.75rem 1rem; border-radius: var(--radius-sm); font-size: 0.9rem;" />
                    </label>
                    <label class="field" style="margin: 0; display: flex; flex-direction: column; gap: 0.4rem;">
                      <span style="color: rgba(255,255,255,0.85); font-size: 0.88rem; font-weight: 700;">Pendapatan Lain-lain per Bulan (Rp)</span>
                      <input type="number" id="calc-profesi-other" value="0" min="0" placeholder="0" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.15); color: #fff; width: 100%; padding: 0.75rem 1rem; border-radius: var(--radius-sm); font-size: 0.9rem;" />
                    </label>
                    <label class="field" style="margin: 0; display: flex; flex-direction: column; gap: 0.4rem;">
                      <span style="color: rgba(255,255,255,0.85); font-size: 0.88rem; font-weight: 700;">Harga Emas per Gram Saat Ini (Rp)</span>
                      <input type="number" id="calc-gold-price-profesi" value="1400000" min="0" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.15); color: #fff; width: 100%; padding: 0.75rem 1rem; border-radius: var(--radius-sm); font-size: 0.9rem;" />
                      <small style="color: rgba(255,255,255,0.45); font-size: 0.75rem; margin-top: 0.15rem;">Acuan nishab emas 85 gram / tahun (1/12 per bulan).</small>
                    </label>
                  </div>
                  
                  <div class="calc-results" style="background: rgba(11,107,58,0.15); border: 1px solid rgba(11,107,58,0.3); border-radius: var(--radius-md); padding: 1.75rem; display: flex; flex-direction: column; gap: 1rem; text-align: center;">
                    <h3 style="margin: 0 0 0.5rem; font-size: 1.15rem; color: var(--gold-light); font-family: var(--font-serif); font-weight: 700;">Hasil Perhitungan</h3>
                    <div style="display: flex; justify-content: space-between; font-size: 0.9rem; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 0.5rem;">
                      <span style="color: rgba(255,255,255,0.7);">Total Pendapatan:</span>
                      <strong id="calc-profesi-total-income" style="color: #fff;">-</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between; font-size: 0.9rem; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 0.5rem;">
                      <span style="color: rgba(255,255,255,0.7);">Nishab Bulanan:</span>
                      <strong id="calc-profesi-nisab" style="color: #fff;">-</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between; font-size: 0.9rem; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 0.5rem;">
                      <span style="color: rgba(255,255,255,0.7);">Status Kewajiban:</span>
                      <strong id="calc-profesi-status" style="color: var(--gold-light); font-weight: 700;">-</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.5rem; padding: 0.75rem 0; border-top: 2px solid rgba(11,107,58,0.35);">
                      <span style="color: rgba(255,255,255,0.9); font-weight: 700; font-size: 0.95rem;">Zakat Wajib Disalurkan:</span>
                      <strong id="calc-profesi-result" style="color: #fff; font-size: 1.5rem; font-weight: 800;">-</strong>
                    </div>
                    <button class="landing-button landing-button-gold calc-donate-btn" id="calc-profesi-donate" type="button" style="width: 100%; padding: 0.75rem; border-radius: var(--radius-sm); font-size: 0.95rem; font-weight: 700; cursor: pointer;">Salurkan Zakat Penghasilan</button>
                  </div>
                </div>
              </div>

              <!-- TAB 2: ZAKAT MAAL -->
              <div id="calc-content-maal" class="calc-tab-content is-hidden">
                <div class="calc-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 2.5rem; align-items: start;">
                  <div class="calc-inputs" style="display: flex; flex-direction: column; gap: 1rem;">
                    <label class="field" style="margin: 0; display: flex; flex-direction: column; gap: 0.4rem;">
                      <span style="color: rgba(255,255,255,0.85); font-size: 0.88rem; font-weight: 700;">Tabungan / Kas / Deposito (Rp)</span>
                      <input type="number" id="calc-maal-cash" value="150000000" min="0" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.15); color: #fff; width: 100%; padding: 0.75rem 1rem; border-radius: var(--radius-sm); font-size: 0.9rem;" />
                    </label>
                    <label class="field" style="margin: 0; display: flex; flex-direction: column; gap: 0.4rem;">
                      <span style="color: rgba(255,255,255,0.85); font-size: 0.88rem; font-weight: 700;">Emas / Perak / Investasi / Saham (Rp)</span>
                      <input type="number" id="calc-maal-gold" value="0" min="0" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.15); color: #fff; width: 100%; padding: 0.75rem 1rem; border-radius: var(--radius-sm); font-size: 0.9rem;" />
                    </label>
                    <label class="field" style="margin: 0; display: flex; flex-direction: column; gap: 0.4rem;">
                      <span style="color: rgba(255,255,255,0.85); font-size: 0.88rem; font-weight: 700;">Aset Usaha / Stok Dagang (Rp)</span>
                      <input type="number" id="calc-maal-trade" value="0" min="0" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.15); color: #fff; width: 100%; padding: 0.75rem 1rem; border-radius: var(--radius-sm); font-size: 0.9rem;" />
                    </label>
                    <label class="field" style="margin: 0; display: flex; flex-direction: column; gap: 0.4rem;">
                      <span style="color: rgba(255,255,255,0.85); font-size: 0.88rem; font-weight: 700;">Hutang / Kewajiban Jatuh Tempo (Rp)</span>
                      <input type="number" id="calc-maal-debt" value="0" min="0" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.15); color: #fff; width: 100%; padding: 0.75rem 1rem; border-radius: var(--radius-sm); font-size: 0.9rem;" />
                    </label>
                    <label class="field" style="margin: 0; display: flex; flex-direction: column; gap: 0.4rem;">
                      <span style="color: rgba(255,255,255,0.85); font-size: 0.88rem; font-weight: 700;">Harga Emas per Gram Saat Ini (Rp)</span>
                      <input type="number" id="calc-gold-price-maal" value="1400000" min="0" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.15); color: #fff; width: 100%; padding: 0.75rem 1rem; border-radius: var(--radius-sm); font-size: 0.9rem;" />
                    </label>
                  </div>
                  
                  <div class="calc-results" style="background: rgba(11,107,58,0.15); border: 1px solid rgba(11,107,58,0.3); border-radius: var(--radius-md); padding: 1.75rem; display: flex; flex-direction: column; gap: 1rem; text-align: center;">
                    <h3 style="margin: 0 0 0.5rem; font-size: 1.15rem; color: var(--gold-light); font-family: var(--font-serif); font-weight: 700;">Hasil Perhitungan</h3>
                    <div style="display: flex; justify-content: space-between; font-size: 0.9rem; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 0.5rem;">
                      <span style="color: rgba(255,255,255,0.7);">Total Harta Bersih:</span>
                      <strong id="calc-maal-total-net" style="color: #fff;">-</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between; font-size: 0.9rem; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 0.5rem;">
                      <span style="color: rgba(255,255,255,0.7);">Nishab Maal (Emas 85g):</span>
                      <strong id="calc-maal-nisab" style="color: #fff;">-</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between; font-size: 0.9rem; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 0.5rem;">
                      <span style="color: rgba(255,255,255,0.7);">Status Kewajiban:</span>
                      <strong id="calc-maal-status" style="color: var(--gold-light); font-weight: 700;">-</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.5rem; padding: 0.75rem 0; border-top: 2px solid rgba(11,107,58,0.35);">
                      <span style="color: rgba(255,255,255,0.9); font-weight: 700; font-size: 0.95rem;">Zakat Wajib Disalurkan:</span>
                      <strong id="calc-maal-result" style="color: #fff; font-size: 1.5rem; font-weight: 800;">-</strong>
                    </div>
                    <button class="landing-button landing-button-gold calc-donate-btn" id="calc-maal-donate" type="button" style="width: 100%; padding: 0.75rem; border-radius: var(--radius-sm); font-size: 0.95rem; font-weight: 700; cursor: pointer;">Salurkan Zakat Maal</button>
                  </div>
                </div>
              </div>

              <!-- TAB 3: ZAKAT FITRAH -->
              <div id="calc-content-fitrah" class="calc-tab-content is-hidden">
                <div class="calc-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 2.5rem; align-items: start;">
                  <div class="calc-inputs" style="display: flex; flex-direction: column; gap: 1.25rem;">
                    <label class="field" style="margin: 0; display: flex; flex-direction: column; gap: 0.4rem;">
                      <span style="color: rgba(255,255,255,0.85); font-size: 0.88rem; font-weight: 700;">Jumlah Anggota Keluarga (Jiwa)</span>
                      <input type="number" id="calc-fitrah-members" value="1" min="1" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.15); color: #fff; width: 100%; padding: 0.75rem 1rem; border-radius: var(--radius-sm); font-size: 0.9rem;" />
                    </label>
                    <label class="field" style="margin: 0; display: flex; flex-direction: column; gap: 0.4rem;">
                      <span style="color: rgba(255,255,255,0.85); font-size: 0.88rem; font-weight: 700;">Harga Beras per Kilogram (Rp)</span>
                      <input type="number" id="calc-fitrah-rice-price" value="16000" min="0" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.15); color: #fff; width: 100%; padding: 0.75rem 1rem; border-radius: var(--radius-sm); font-size: 0.9rem;" />
                      <small style="color: rgba(255,255,255,0.45); font-size: 0.75rem; margin-top: 0.15rem;">Setara 2,5 kg beras per jiwa.</small>
                    </label>
                  </div>
                  
                  <div class="calc-results" style="background: rgba(11,107,58,0.15); border: 1px solid rgba(11,107,58,0.3); border-radius: var(--radius-md); padding: 1.75rem; display: flex; flex-direction: column; gap: 1rem; text-align: center;">
                    <h3 style="margin: 0 0 0.5rem; font-size: 1.15rem; color: var(--gold-light); font-family: var(--font-serif); font-weight: 700;">Hasil Perhitungan</h3>
                    <div style="display: flex; justify-content: space-between; font-size: 0.9rem; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 0.5rem;">
                      <span style="color: rgba(255,255,255,0.7);">Kebutuhan Beras:</span>
                      <strong id="calc-fitrah-total-rice" style="color: #fff;">-</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between; font-size: 0.9rem; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 0.5rem;">
                      <span style="color: rgba(255,255,255,0.7);">Status Kewajiban:</span>
                      <strong style="color: var(--gold-light); font-weight: 700;">Wajib (Setiap Jiwa)</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.5rem; padding: 0.75rem 0; border-top: 2px solid rgba(11,107,58,0.35);">
                      <span style="color: rgba(255,255,255,0.9); font-weight: 700; font-size: 0.95rem;">Setara Nilai Tunai:</span>
                      <strong id="calc-fitrah-result" style="color: #fff; font-size: 1.5rem; font-weight: 800;">-</strong>
                    </div>
                    <button class="landing-button landing-button-gold calc-donate-btn" id="calc-fitrah-donate" type="button" style="width: 100%; padding: 0.75rem; border-radius: var(--radius-sm); font-size: 0.95rem; font-weight: 700; cursor: pointer;">Salurkan Zakat Fitrah</button>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>

        <!-- Contact & Maps Section -->
        <section class="landing-contact landing-section landing-pattern-bg" id="kontak">
          <div class="landing-contact-info">
            <p class="landing-kicker">Kontak Kami</p>
            <h2>Mari terhubung<br /><span>dan berkhidmah.</span></h2>
            <p style="margin-top: 1rem; font-size: 0.95rem;">Hubungi pengurus untuk informasi kegiatan, setoran Koin NU, pendaftaran donatur baru, atau saran program khidmah.</p>
            
            <div class="landing-contact-form-wrapper" style="margin-top: 2rem;">
              <form class="landing-contact-form" onsubmit="event.preventDefault(); window.confetti({particleCount:100, spread:70}); alert('Terima kasih. Pesan Anda telah terkirim ke sistem pengurus Ranting.'); this.reset();">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
                  <input type="text" placeholder="Nama Lengkap" required style="padding:0.75rem 1rem; border-radius:var(--radius-sm); border:1px solid var(--border-light); background:#fff; font-size:0.85rem;" />
                  <input type="tel" placeholder="Nomor WhatsApp" required style="padding:0.75rem 1rem; border-radius:var(--radius-sm); border:1px solid var(--border-light); background:#fff; font-size:0.85rem;" />
                </div>
                <textarea placeholder="Tulis pesan atau saran program..." required rows="4" style="width:100%; padding:0.75rem 1rem; border-radius:var(--radius-sm); border:1px solid var(--border-light); background:#fff; font-size:0.85rem; margin-bottom:1rem; resize:vertical; font-family:inherit;"></textarea>
                <button type="submit" class="landing-button landing-button-gold" style="border:none; cursor:pointer; width:100%; justify-content:center;">Kirim Pesan Ke Pengurus</button>
              </form>
            </div>
          </div>
          <div class="landing-contact-grid">
            <article>
              <small>Alamat sekretariat</small>
              <strong>PRNU Karangsalam Kidul II<br />Gg. Melati RT 02 / RW 03, Kec. Kedungbanteng, Kab. Banyumas, Jawa Tengah</strong>
            </article>
            <article>
              <small>Informasi & Layanan</small>
              <strong>WhatsApp: +62 812-7000-0101<br />Email: admin@rantingnu.id</strong>
            </article>
            <article>
              <small>Akses cepat</small>
              <a href="https://www.google.com/maps/search/?api=1&query=Karangsalam+Kidul+Kedungbanteng+Banyumas" target="_blank" rel="noreferrer" class="maps-link">
                <svg class="lucide-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                Buka Google Maps
              </a>
              <a href="/login" class="system-link">
                <svg class="lucide-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" x2="3" y1="12" y2="12"/></svg>
                Masuk Sistem Koin NU
              </a>
            </article>
          </div>
        </section>
      </main>

      <!-- Multi-column Premium Footer -->
      <footer class="landing-footer-premium">
        <div class="landing-footer-grid">
          <div class="footer-col brand-col">
            <div class="landing-brand">
              <img src="/logo-karangsalam-2.png" alt="Logo Karangsalam 2" />
              <span><strong>PRNU</strong><small>Karangsalam Kidul II</small></span>
            </div>
            <p class="footer-brand-desc">Merawat tradisi Ahlussunnah wal Jama'ah An-Nahdliyah, menguatkan khidmah keumatan, and membangun kemandirian ekonomi umat di tingkatan Ranting.</p>
            <div class="footer-socials">
              <a href="#" aria-label="Facebook"><svg class="lucide-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg></a>
              <a href="#" aria-label="Instagram"><svg class="lucide-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg></a>
              <a href="#" aria-label="Youtube"><svg class="lucide-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"/><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"/></svg></a>
            </div>
          </div>
          <div class="footer-col links-col">
            <h3>Navigasi Cepat</h3>
            <ul>
              <li><a href="#beranda">Beranda</a></li>
              <li><a href="#profil">Profil Ranting</a></li>
              <li><a href="#jadwal-shalat">Jadwal Shalat</a></li>
              <li><a href="#program">Program Utama</a></li>
              <li><a href="#agenda">Agenda Ranting</a></li>
              <li><a href="#kajian">Audio Kajian</a></li>
              <li><a href="#berita">Kabar Ranting</a></li>
            </ul>
          </div>
          <div class="footer-col contact-col">
            <h3>Sekretariat & Hubungi</h3>
            <p>
              <strong>Pengurus Ranting Nahdlatul Ulama</strong><br />
              Desa Karangsalam Kidul, RT 02 / RW 03<br />
              Kecamatan Kedungbanteng, Kabupaten Banyumas<br />
              Jawa Tengah, Indonesia
            </p>
            <p style="margin-top: 1rem;">
              <strong>Layanan Koin NU:</strong> +62 812-7000-0101<br />
              <strong>Email:</strong> admin@rantingnu.id
            </p>
          </div>
        </div>
        <div class="landing-footer-bottom">
          <p>&copy; 2026 SIKOINNU - PRNU Karangsalam Kidul II. Hak Cipta Dilindungi.</p>
          <p>Membangun Umat Dari Tingkatan Ranting</p>
        </div>
      </footer>

      <!-- Modals (Donation Dialog & News Reader Dialog) -->
      <dialog id="donation-dialog" class="donation-dialog">
        <div class="donation-dialog-content" id="donation-dialog-content-wrapper">
        </div>
      </dialog>

      <dialog id="news-reader-dialog" class="news-dialog">
        <div class="news-dialog-content">
          <button class="dialog-close-btn" id="close-news-dialog" aria-label="Tutup">&times;</button>
          <div id="news-dialog-body"></div>
        </div>
      </dialog>
    </div>`;

  document.querySelector("#landingMenuButton")?.addEventListener("click", (event) => {
    const expanded = event.currentTarget.getAttribute("aria-expanded") === "true";
    event.currentTarget.setAttribute("aria-expanded", String(!expanded));
    document.querySelector("#landingNav")?.classList.toggle("open", !expanded);
  });
  document.querySelectorAll(".landing-nav a").forEach((link) => link.addEventListener("click", () => {
    document.querySelector("#landingMenuButton")?.setAttribute("aria-expanded", "false");
    document.querySelector("#landingNav")?.classList.remove("open");
  }));

  // Functional Audio Player Control
  const audioPlayer = document.querySelector("#global-sermon-player");
  let currentPlayingBtn = null;
  let currentProgressTrack = null;

  document.querySelectorAll(".sermon-play-btn").forEach((btn) => {
    btn.addEventListener("click", (event) => {
      const button = event.currentTarget;
      const audioUrl = button.dataset.audio;
      const card = button.closest(".sermon-card");
      const progressFilled = card.querySelector(".sermon-progress-filled");

      if (currentPlayingBtn === button) {
        if (audioPlayer.paused) {
          audioPlayer.play();
          button.innerHTML = '<svg class="lucide-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="14" y="4" width="4" height="16" rx="1"/><rect x="6" y="4" width="4" height="16" rx="1"/></svg> Jeda';
        } else {
          audioPlayer.pause();
          button.innerHTML = '<svg class="lucide-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="6 3 20 12 6 21 6 3"/></svg> Putar';
        }
      } else {
        if (currentPlayingBtn) {
          currentPlayingBtn.innerHTML = '<svg class="lucide-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="6 3 20 12 6 21 6 3"/></svg> Putar';
          if (currentProgressTrack) currentProgressTrack.style.width = "0%";
        }

        currentPlayingBtn = button;
        currentProgressTrack = progressFilled;
        audioPlayer.src = audioUrl;
        audioPlayer.play().catch(e => console.warn("Audio playback issue:", e));
        button.innerHTML = '<svg class="lucide-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="14" y="4" width="4" height="16" rx="1"/><rect x="6" y="4" width="4" height="16" rx="1"/></svg> Jeda';
      }
    });
  });

  if (audioPlayer) {
    audioPlayer.addEventListener("timeupdate", () => {
      if (audioPlayer.duration && currentProgressTrack) {
        const percentage = (audioPlayer.currentTime / audioPlayer.duration) * 100;
        currentProgressTrack.style.width = `${percentage}%`;
      }
    });

    audioPlayer.addEventListener("ended", () => {
      if (currentPlayingBtn) {
        currentPlayingBtn.innerHTML = '<svg class="lucide-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="6 3 20 12 6 21 6 3"/></svg> Putar';
      }
      if (currentProgressTrack) {
        currentProgressTrack.style.width = "0%";
      }
      currentPlayingBtn = null;
      currentProgressTrack = null;
    });
  }

  // Interactive Donation Dialog
  const donationDialog = document.querySelector("#donation-dialog");
  document.querySelector("#copyDonationButton")?.addEventListener("click", (e) => {
    e.preventDefault();
    if (donationDialog) {
      initDonationDialogFlow();
      donationDialog.showModal();
      window.confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 }
      });
    }
  });

  // Interactive News Reader Modal
  const newsDialog = document.querySelector("#news-reader-dialog");
  document.querySelectorAll(".landing-news-grid article.news-item-card").forEach((card) => {
    card.addEventListener("click", () => {
      const id = Number(card.dataset.id);
      const item = appState.news.find((n) => n.id === id);
      if (!item) return;

      const body = document.querySelector("#news-dialog-body");
      if (body) {
        body.innerHTML = `
          <div class="news-dialog-header" style="text-align: center; margin-bottom: 1.5rem;">
            <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.75rem; font-weight:700; color:var(--gold-dark); text-transform:uppercase; margin-bottom:0.5rem;">
              <span>${escapeHtml(item.category)}</span>
              <span>${formatDateId(item.date)}</span>
            </div>
            <h2 style="font-family:var(--font-serif); font-size:1.8rem; line-height:1.3; color:var(--neutral-dark); margin:0;">${escapeHtml(item.title)}</h2>
          </div>
          <img src="${escapeHtml(item.imageUrl)}" alt="${escapeHtml(item.title)}" style="width:100%; height:280px; object-fit:cover; border-radius:var(--radius-md); margin-bottom:1.5rem; box-shadow:var(--shadow-sm);" />
          <div class="news-dialog-text" style="font-size:0.95rem; line-height:1.7; color:var(--neutral-mid); text-align:center;">
            ${item.content.split("\n").filter(Boolean).map(p => `<p style="margin-bottom:1rem;">${escapeHtml(p)}</p>`).join("")}
          </div>
        `;
        if (newsDialog) newsDialog.showModal();
      }
    });
  });

  document.querySelector("#close-news-dialog")?.addEventListener("click", () => {
    newsDialog?.close();
  });

  updatePrayerWidget("#landing-prayer-container");

  // Real-time ticking clock
  const updateClock = () => {
    const clockEl = document.querySelector("#hero-clock");
    if (!clockEl) return;
    const now = new Date();
    clockEl.textContent = now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  };
  updateClock();
  if (window.heroClockInterval) clearInterval(window.heroClockInterval);
  window.heroClockInterval = setInterval(updateClock, 1000);

  // Bind zakat calculator events
  bindCalculatorEvents();

  // Initialize IntersectionObserver scroll reveal animations
  initScrollReveal();
}

// === Interactive QRIS Donation Simulator & Digital Receipt Helpers ===
let qrisTimerInterval = null;

const ZAKAT_INTENTIONS = {
  "Zakat Profesi": {
    arabic: "نَوَيْتُ أَنْ أُخْرِجَ زَكَاةَ مَالِيْ فَرْضًا لِلّٰهِ تَعَالَى",
    transliteration: "Nawaytu an ukhrija zakaata maalee fardhan lillaahi ta'aala.",
    translation: "Aku niat mengeluarkan zakat hartaku (profesi) fardhu karena Allah Ta'ala."
  },
  "Zakat Maal": {
    arabic: "نَوَيْتُ أَنْ أُخْرِجَ زَكَاةَ مَالِيْ فَرْضًا لِلّٰهِ تَعَالَى",
    transliteration: "Nawaytu an ukhrija zakaata maalee fardhan lillaahi ta'aala.",
    translation: "Aku niat mengeluarkan zakat hartaku (maal) fardhu karena Allah Ta'ala."
  },
  "Zakat Fitrah": {
    arabic: "نَوَيْتُ أَنْ أُخْرِجَ زَكَاةَ الْفِطْرِ عَنِّيْ وَعَنْ جَمِيْعِ مَا يَلْزَمُنِيْ نَفَقَتُهُمْ شَرْعًا فَرْضًا لِلّٰهِ تَعَالَى",
    transliteration: "Nawaytu an ukhrija zakaatal fitri 'annee wa 'an jamee'i maa yalzamunee nafaqatuhum shar'an fardhan lillaahi ta'aala.",
    translation: "Aku niat mengeluarkan zakat fitrah untuk diriku dan seluruh keluarga yang nafkahnya menjadi tanggung jawabku secara syariat, fardhu karena Allah Ta'ala."
  }
};

function getZakatNiatHtml(category) {
  const niat = ZAKAT_INTENTIONS[category];
  if (!niat) return "";

  return `
    <div class="zakat-niat-container" style="background: #fafaf9; border: 1.5px solid var(--gold-light); border-radius: var(--radius-md); padding: 1.25rem; margin-bottom: 1.25rem; text-align: center; box-shadow: var(--shadow-sm);">
      <details style="width: 100%; cursor: pointer;" open>
        <summary style="font-size: 0.9rem; font-weight: 700; color: var(--primary-dark); display: flex; justify-content: space-between; align-items: center; user-select: none;">
          <span style="display: flex; align-items: center; gap: 0.5rem;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px; height:16px; color:var(--gold-dark);"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            Lafadz Niat & Doa Zakat (${category})
          </span>
          <span class="details-icon" style="font-size: 0.72rem; font-weight: 700; background: var(--gold-light); color: var(--primary-dark); padding: 0.2rem 0.5rem; border-radius: var(--radius-sm);">Tutup</span>
        </summary>
        <div style="margin-top: 0.85rem; border-top: 1px dashed var(--border-light); padding-top: 0.85rem; display: flex; flex-direction: column; gap: 0.65rem;">
          <p style="font-family: 'Amiri', 'Traditional Arabic', serif; font-size: 1.45rem; text-align: right; direction: rtl; margin: 0 0 0.5rem 0; line-height: 1.8; color: var(--neutral-dark);">
            ${niat.arabic}
          </p>
          <p style="font-style: italic; font-size: 0.85rem; color: var(--neutral-mid); margin: 0;">
            <strong>Transliterasi:</strong> "${niat.transliteration}"
          </p>
          <p style="font-size: 0.88rem; color: var(--neutral-dark); margin: 0; line-height: 1.4;">
            <strong>Artinya:</strong> "${niat.translation}"
          </p>
          <div style="margin-top: 0.75rem; background: #faf5ff; border: 1px solid #f3e8ff; border-radius: var(--radius-sm); padding: 0.75rem; font-size: 0.82rem; color: #6b21a8; line-height: 1.5;">
            <strong style="display: flex; align-items: center; gap: 0.35rem; margin-bottom: 0.25rem;">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px; height:14px;"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
              Doa Penerima Zakat (Amil / Mustahik):
            </strong>
            <span style="font-family: 'Amiri', 'Traditional Arabic', serif; font-size: 1.25rem; display: block; margin: 0.35rem 0; direction: rtl; text-align: right; color: var(--neutral-dark);">
              آجَرَكَ اللهُ فِيْمَا أَعْطَيْتَ، وَبَارَكَ فِيْمَا أَبْقَيْتَ وَجَعَلَهُ لَكَ طَهُوْرًا
            </span>
            <em>"Semoga Allah memberi pahala atas apa yang engkau berikan, memberikan berkah atas apa yang engkau sisakan, dan menjadikannya sebagai penyuci bagimu."</em>
          </div>
        </div>
      </details>
    </div>
  `;
}

function initDonationDialogFlow(presetAmount = null, presetType = "Bank", category = "Infaq / Sedekah") {
  if (qrisTimerInterval) clearInterval(qrisTimerInterval);
  const wrapper = document.querySelector("#donation-dialog-content-wrapper");
  if (!wrapper) return;

  const isQris = presetType === "QRIS" || presetAmount !== null;

  wrapper.innerHTML = `
    <button class="dialog-close-btn" id="close-donation-dialog" aria-label="Tutup">&times;</button>
    <div class="dialog-header">
      <img src="/logo-karangsalam-2.png" alt="Logo NU" />
      <h3>Layanan ${category}</h3>
      <p>Salurkan ${category.toLowerCase().includes('zakat') ? 'kewajiban zakat' : 'infaq terbaik'} Anda secara aman dan transparan.</p>
    </div>
    
    ${getZakatNiatHtml(category)}

    <div class="donation-payment-tabs">
      <button class="tab-btn ${!isQris ? 'active' : ''}" id="tab-bank" type="button">Transfer Bank</button>
      <button class="tab-btn ${isQris ? 'active' : ''}" id="tab-qris" type="button">QRIS Instan</button>
    </div>

    <div class="dialog-body" id="donation-dialog-body">
      ${isQris ? getQrisSetupTabHtml() : getBankTransferTabHtml()}
    </div>
    
    <div class="dialog-footer">
      <p>Pengurus Ranting NU Karangsalam Kidul II - Transparan & Amanah</p>
    </div>
  `;

  // Bind close button
  document.querySelector("#close-donation-dialog")?.addEventListener("click", () => {
    if (qrisTimerInterval) clearInterval(qrisTimerInterval);
    document.querySelector("#donation-dialog")?.close();
  });

  if (isQris) {
    bindQrisSetupEvents(presetAmount);
  } else {
    bindBankTransferEvents();
  }

  // Tab switching
  const tabBank = document.querySelector("#tab-bank");
  const tabQris = document.querySelector("#tab-qris");
  const dialogBody = document.querySelector("#donation-dialog-body");

  tabBank?.addEventListener("click", () => {
    if (qrisTimerInterval) clearInterval(qrisTimerInterval);
    tabBank.classList.add("active");
    tabQris.classList.remove("active");
    dialogBody.innerHTML = getBankTransferTabHtml();
    bindBankTransferEvents();
  });

  tabQris?.addEventListener("click", () => {
    tabQris.classList.add("active");
    tabBank.classList.remove("active");
    dialogBody.innerHTML = getQrisSetupTabHtml();
    bindQrisSetupEvents();
  });
}

function getBankTransferTabHtml() {
  return `
    <div class="donation-method-card">
      <div class="method-header">Bank Rakyat Indonesia (BRI)</div>
      <div class="method-body">
        <strong>0023-01-000888-53-0</strong>
        <span>a.n. PRNU Karangsalam Kidul II</span>
        <button class="copy-btn" id="copy-bank-acc" data-copy="002301000888530" type="button">
          <svg class="lucide-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg> Salin Rekening
        </button>
      </div>
    </div>
  `;
}

function bindBankTransferEvents() {
  const btn = document.querySelector("#copy-bank-acc");
  btn?.addEventListener("click", () => {
    const text = btn.dataset.copy;
    navigator.clipboard.writeText(text).then(() => {
      btn.innerHTML = 'Tersalin!';
      btn.classList.add("copied");
      window.confetti({
        particleCount: 50,
        angle: 60,
        spread: 55,
        origin: { x: 0.2, y: 0.6 }
      });
      setTimeout(() => {
        btn.innerHTML = `<svg class="lucide-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg> Salin Rekening`;
        btn.classList.remove("copied");
      }, 3000);
    });
  });
}

function getQrisSetupTabHtml() {
  return `
    <form id="qris-setup-form" style="display:flex; flex-direction:column; gap:1.2rem; text-align:center;">
      <label class="form-group-label" style="display:flex; flex-direction:column; gap:0.4rem;">
        <span style="font-size:0.85rem; font-weight:700; color:var(--neutral-dark);">Nama Donatur (Opsional)</span>
        <input type="text" id="qris-donor-name" placeholder="Hamba Allah" style="padding:0.7rem; border:1px solid var(--border-light); border-radius:var(--radius-sm); font-size:0.9rem;" />
      </label>
      <label class="form-group-label" style="display:flex; flex-direction:column; gap:0.4rem;">
        <span style="font-size:0.85rem; font-weight:700; color:var(--neutral-dark);">Nomor WhatsApp (Opsional)</span>
        <input type="tel" id="qris-donor-phone" placeholder="Contoh: 08123456789" style="padding:0.7rem; border:1px solid var(--border-light); border-radius:var(--radius-sm); font-size:0.9rem;" />
      </label>
      
      <div style="display:flex; flex-direction:column; gap:0.4rem;">
        <span style="font-size:0.85rem; font-weight:700; color:var(--neutral-dark);">Pilih Nominal Donasi</span>
        <div class="qris-nominal-grid">
          <button type="button" class="nominal-card" data-val="10000">Rp 10.000</button>
          <button type="button" class="nominal-card active" data-val="25000">Rp 25.000</button>
          <button type="button" class="nominal-card" data-val="50000">Rp 50.000</button>
          <button type="button" class="nominal-card" data-val="100000">Rp 100.000</button>
        </div>
      </div>

      <label class="form-group-label" style="display:flex; flex-direction:column; gap:0.4rem;">
        <span style="font-size:0.85rem; font-weight:700; color:var(--neutral-dark);">Nominal Kustom (Rp)</span>
        <input type="number" id="qris-custom-amount" min="1000" step="1000" placeholder="Masukkan nominal lain..." style="padding:0.7rem; border:1px solid var(--border-light); border-radius:var(--radius-sm); font-size:0.9rem;" />
      </label>

      <button type="submit" class="primary-button" style="width:100%; padding:0.85rem; font-size:1rem; margin-top:0.5rem;">Lanjut Pembayaran</button>
    </form>
  `;
}

function bindQrisSetupEvents(presetAmount = null) {
  const form = document.querySelector("#qris-setup-form");
  const nominalCards = document.querySelectorAll(".nominal-card");
  const customAmountInput = document.querySelector("#qris-custom-amount");
  let selectedNominal = 25000;

  if (presetAmount) {
    const match = Array.from(nominalCards).find(c => Number(c.dataset.val) === presetAmount);
    if (match) {
      nominalCards.forEach(c => c.classList.remove("active"));
      match.classList.add("active");
      selectedNominal = presetAmount;
    } else {
      nominalCards.forEach(c => c.classList.remove("active"));
      if (customAmountInput) customAmountInput.value = presetAmount;
      selectedNominal = presetAmount;
    }
  }

  nominalCards.forEach((card) => {
    card.addEventListener("click", () => {
      nominalCards.forEach((c) => c.classList.remove("active"));
      card.classList.add("active");
      selectedNominal = Number(card.dataset.val);
      if (customAmountInput) customAmountInput.value = "";
    });
  });

  customAmountInput?.addEventListener("input", () => {
    nominalCards.forEach((c) => c.classList.remove("active"));
    selectedNominal = Number(customAmountInput.value || 0);
  });

  form?.addEventListener("submit", (e) => {
    e.preventDefault();
    const donorName = document.querySelector("#qris-donor-name")?.value.trim() || "Hamba Allah";
    const donorPhone = document.querySelector("#qris-donor-phone")?.value.trim() || "";
    const finalAmount = customAmountInput?.value ? Number(customAmountInput.value) : selectedNominal;

    if (finalAmount < 1000) {
      window.dispatchEvent(new CustomEvent("show-toast", { detail: { message: "Minimal donasi adalah Rp 1.000.", type: "error" } }));
      return;
    }

    startQrisInvoice(finalAmount, donorName, donorPhone);
  });
}

function calculateCrc16(str) {
  let crc = 0xFFFF;
  for (let c = 0; c < str.length; c++) {
    let charCode = str.charCodeAt(c);
    crc ^= (charCode << 8);
    for (let i = 0; i < 8; i++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xFFFF;
      } else {
        crc = (crc << 1) & 0xFFFF;
      }
    }
  }
  let hex = crc.toString(16).toUpperCase();
  return hex.padStart(4, "0");
}

function startQrisInvoice(amount, donorName, donorPhone) {
  const wrapper = document.querySelector("#donation-dialog-content-wrapper");
  if (!wrapper) return;

  if (qrisTimerInterval) clearInterval(qrisTimerInterval);

  const transactionId = `TRX-QRIS-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const payloadWithoutCrc = `00020101021226300016ID.CO.SIKOINNU.0118${transactionId}5204000053033605405${amount}5802ID5925PRNU KARANGSALAM KIDUL II6012BANYUMAS6304`;
  const crc = calculateCrc16(payloadWithoutCrc);
  const qrString = payloadWithoutCrc + crc;

  const qrFn = typeof qrcodeGenerator === "function" ? qrcodeGenerator : window.qrcode;
  const qr = qrFn(4, 'M');
  qr.addData(qrString);
  qr.make();
  const qrCodeDataUrl = qr.createDataURL(6);

  wrapper.innerHTML = `
    <button class="dialog-close-btn" id="close-donation-dialog" aria-label="Tutup">&times;</button>
    <div class="dialog-header">
      <img src="/logo-karangsalam-2.png" alt="Logo NU" />
      <h3>Pindai QRIS Infaq</h3>
      <p>Silakan scan QRIS di bawah ini untuk menyelesaikan infaq Anda.</p>
    </div>
    
    <div class="dialog-body" style="display:flex; flex-direction:column; align-items:center; gap:1.2rem; text-align:center;">
      
      <div class="qris-invoice-card" style="display:flex; flex-direction:column; align-items:center; background:#fff; border:1.5px dashed var(--primary-light); border-radius:var(--radius-md); padding:1.2rem; width:100%; max-width:320px; box-shadow:var(--shadow-sm);">
        <div style="font-size:0.75rem; font-weight:700; letter-spacing:0.1em; color:#1e3a8a; margin-bottom:0.6rem;">QRIS NASIONAL</div>
        <img src="${qrCodeDataUrl}" alt="QRIS Code" style="width:200px; height:200px; padding:0.5rem; border:1px solid #e2e8f0; border-radius:var(--radius-sm); margin-bottom:0.5rem;" />
        <div style="font-family:var(--font-serif); font-size:1.15rem; font-weight:700; color:var(--primary-dark);">${escapeHtml(donorName)}</div>
        <div style="font-size:1.35rem; font-weight:800; color:var(--gold-dark); margin:0.25rem 0;">${formatRupiah(amount)}</div>
        <div style="font-size:0.75rem; color:var(--neutral-mid); font-family:var(--font-mono);">${transactionId}</div>
      </div>

      <div class="qris-timer-wrapper" style="width:100%; display:flex; flex-direction:column; align-items:center; gap:0.25rem;">
        <span class="qris-timer" id="qris-countdown-text">15:00</span>
        <span style="font-size:0.8rem; color:var(--neutral-mid);">Selesaikan pembayaran sebelum waktu habis</span>
        <div style="width:100%; max-width:260px; height:4px; background:#e2e8f0; border-radius:2px; overflow:hidden; margin-top:0.4rem;">
          <div id="qris-progress-bar" style="width:100%; height:100%; background:var(--primary); transition: width 1s linear;"></div>
        </div>
      </div>

      <div style="display:flex; flex-direction:column; gap:0.6rem; width:100%; max-width:280px; margin-top:0.5rem;">
        <button type="button" class="primary-button" id="btn-simulate-qris-success" style="background:#10b981; border-color:#10b981;">Simulasi Bayar (Sukses)</button>
        <button type="button" class="ghost-button" id="btn-cancel-qris" style="font-size:0.85rem;">Batalkan</button>
      </div>

    </div>

    <div class="dialog-footer">
      <p>Gerbang Donasi Digital Karangsalam Kidul II | Menunggu Pembayaran...</p>
    </div>
  `;

  // Bind close button
  document.querySelector("#close-donation-dialog")?.addEventListener("click", () => {
    if (qrisTimerInterval) clearInterval(qrisTimerInterval);
    document.querySelector("#donation-dialog")?.close();
  });

  // Countdown timer logic (15 minutes = 900 seconds)
  let timeLeft = 900;
  const countdownText = document.querySelector("#qris-countdown-text");
  const progressBar = document.querySelector("#qris-progress-bar");

  qrisTimerInterval = setInterval(() => {
    timeLeft--;
    if (timeLeft <= 0) {
      clearInterval(qrisTimerInterval);
      window.dispatchEvent(new CustomEvent("show-toast", { detail: { message: "Batas waktu pembayaran habis.", type: "error" } }));
      initDonationDialogFlow();
      return;
    }

    const mins = String(Math.floor(timeLeft / 60)).padStart(2, "0");
    const secs = String(timeLeft % 60).padStart(2, "0");
    if (countdownText) countdownText.textContent = `${mins}:${secs}`;
    if (progressBar) progressBar.style.width = `${(timeLeft / 900) * 100}%`;
  }, 1000);

  // Bind simulate success
  document.querySelector("#btn-simulate-qris-success")?.addEventListener("click", () => {
    if (qrisTimerInterval) clearInterval(qrisTimerInterval);
    triggerQrisPaymentSuccess(transactionId, amount, donorName);
  });

  // Bind cancel
  document.querySelector("#btn-cancel-qris")?.addEventListener("click", () => {
    if (qrisTimerInterval) clearInterval(qrisTimerInterval);
    initDonationDialogFlow();
  });
}

function triggerQrisPaymentSuccess(trxId, amount, donorName) {
  window.confetti({ particleCount: 80, spread: 60, origin: { x: 0.1, y: 0.6 } });
  window.confetti({ particleCount: 80, spread: 60, origin: { x: 0.9, y: 0.6 } });
  setTimeout(() => {
    window.confetti({ particleCount: 100, spread: 80, origin: { y: 0.5 } });
  }, 350);

  const wrapper = document.querySelector("#donation-dialog-content-wrapper");
  if (!wrapper) return;

  const dateStr = new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date());

  wrapper.innerHTML = `
    <button class="dialog-close-btn" id="close-donation-dialog" aria-label="Tutup">&times;</button>
    <div class="dialog-header no-print">
      <img src="/logo-karangsalam-2.png" alt="Logo NU" />
      <h3 style="color:#10b981;">Pembayaran Berhasil!</h3>
      <p>Terima kasih atas infaq/sedekah yang Anda berikan. Semoga berkah dan bermanfaat.</p>
    </div>

    <div class="dialog-body" style="display:flex; flex-direction:column; align-items:center; gap:1.2rem;">
      
      <div class="digital-receipt-card" id="donation-receipt-print-area">
        <div class="receipt-header">
          <img src="/logo-karangsalam-2.png" alt="Logo NU" />
          <div>
            <h4>PENGURUS RANTING NAHDLATUL ULAMA</h4>
            <h5>KARANGSALAM KIDUL II - KEDUNGBANTENG</h5>
            <p>KUITANSI DONASI DIGITAL SIKOINNU</p>
          </div>
        </div>

        <div class="receipt-divider"></div>

        <div class="receipt-status-stamp">LUNAS</div>

        <table class="receipt-table">
          <tr>
            <th>Nomor Transaksi</th>
            <td>: <strong>${escapeHtml(trxId)}</strong></td>
          </tr>
          <tr>
            <th>Tanggal / Waktu</th>
            <td>: ${dateStr} WIB</td>
          </tr>
          <tr>
            <th>Nama Donatur</th>
            <td>: ${escapeHtml(donorName)}</td>
          </tr>
          <tr>
            <th>Metode Pembayaran</th>
            <td>: QRIS Instan (Simulasi)</td>
          </tr>
          <tr>
            <th>Status Pembayaran</th>
            <td>: <span style="color:#10b981; font-weight:700;">SUKSES / LUNAS</span></td>
          </tr>
          <tr class="receipt-amount-row">
            <th>Jumlah Donasi</th>
            <td>: <span>${formatRupiah(amount)}</span></td>
          </tr>
        </table>

        <div class="receipt-divider"></div>

        <div class="receipt-footer">
          <p>Teriring Doa Jazaakumullaahu Khairan Katsiran</p>
          <p>Semoga Allah SWT melimpahkan berkah, kesehatan, dan kelapangan rezeki untuk Anda sekeluarga. Aamiin.</p>
        </div>
      </div>

      <div class="receipt-actions no-print" style="display:flex; gap:0.8rem; width:100%; max-width:320px; justify-content:center; margin-top:0.5rem;">
        <button type="button" class="primary-button" id="btn-print-receipt" style="display:flex; align-items:center; justify-content:center; gap:0.4rem; flex:1;">
          <svg class="lucide-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9V2h12v7"></path><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect width="12" height="8" x="6" y="14"></rect></svg>
          Cetak Kuitansi
        </button>
        <button type="button" class="ghost-button" id="btn-receipt-done" style="flex:1;">Selesai</button>
      </div>

    </div>

    <div class="dialog-footer no-print">
      <p>Data donasi ini akan tercatat dalam portal transparansi keuangan Ranting.</p>
    </div>
  `;

  // Bind close button
  document.querySelector("#close-donation-dialog")?.addEventListener("click", () => {
    document.querySelector("#donation-dialog")?.close();
  });

  // Bind print receipt
  document.querySelector("#btn-print-receipt")?.addEventListener("click", () => {
    window.print();
  });

  // Bind done
  document.querySelector("#btn-receipt-done")?.addEventListener("click", () => {
    document.querySelector("#donation-dialog")?.close();
  });
}

function bindCalculatorEvents() {
  const tabs = ["profesi", "maal", "fitrah"];
  tabs.forEach(tab => {
    document.querySelector(`#calc-tab-${tab}`)?.addEventListener("click", () => {
      tabs.forEach(t => {
        document.querySelector(`#calc-tab-${t}`)?.classList.remove("active");
        document.querySelector(`#calc-content-${t}`)?.classList.add("is-hidden");
      });
      document.querySelector(`#calc-tab-${tab}`)?.classList.add("active");
      document.querySelector(`#calc-content-${tab}`)?.classList.remove("is-hidden");
    });
  });

  const formatInputRupiah = (val) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0
    }).format(val);
  };

  const calcProfesi = () => {
    const salary = Number(document.querySelector("#calc-profesi-salary")?.value || 0);
    const other = Number(document.querySelector("#calc-profesi-other")?.value || 0);
    const goldPrice = Number(document.querySelector("#calc-gold-price-profesi")?.value || 1400000);
    
    const totalIncome = salary + other;
    const monthlyNisab = (85 * goldPrice) / 12;
    const isWajib = totalIncome >= monthlyNisab;
    const zakatDue = isWajib ? Math.round(totalIncome * 0.025) : 0;

    const totalIncomeEl = document.querySelector("#calc-profesi-total-income");
    const nisabEl = document.querySelector("#calc-profesi-nisab");
    const statusEl = document.querySelector("#calc-profesi-status");
    const resultEl = document.querySelector("#calc-profesi-result");
    const donateBtn = document.querySelector("#calc-profesi-donate");

    if (totalIncomeEl) totalIncomeEl.textContent = formatInputRupiah(totalIncome);
    if (nisabEl) nisabEl.textContent = formatInputRupiah(monthlyNisab);
    
    if (statusEl) {
      statusEl.textContent = isWajib ? "WAJIB ZAKAT" : "BELUM WAJIB";
      statusEl.style.color = isWajib ? "var(--gold-light)" : "rgba(255,255,255,0.45)";
    }
    if (resultEl) resultEl.textContent = formatInputRupiah(zakatDue);

    if (donateBtn) {
      donateBtn.disabled = zakatDue <= 0;
      donateBtn.dataset.amount = zakatDue;
    }
  };

  const calcMaal = () => {
    const cash = Number(document.querySelector("#calc-maal-cash")?.value || 0);
    const gold = Number(document.querySelector("#calc-maal-gold")?.value || 0);
    const trade = Number(document.querySelector("#calc-maal-trade")?.value || 0);
    const debt = Number(document.querySelector("#calc-maal-debt")?.value || 0);
    const goldPrice = Number(document.querySelector("#calc-gold-price-maal")?.value || 1400000);

    const netAssets = (cash + gold + trade) - debt;
    const nisab = 85 * goldPrice;
    const isWajib = netAssets >= nisab;
    const zakatDue = isWajib ? Math.round(netAssets * 0.025) : 0;

    const totalNetEl = document.querySelector("#calc-maal-total-net");
    const nisabEl = document.querySelector("#calc-maal-nisab");
    const statusEl = document.querySelector("#calc-maal-status");
    const resultEl = document.querySelector("#calc-maal-result");
    const donateBtn = document.querySelector("#calc-maal-donate");

    if (totalNetEl) totalNetEl.textContent = formatInputRupiah(netAssets);
    if (nisabEl) nisabEl.textContent = formatInputRupiah(nisab);
    
    if (statusEl) {
      statusEl.textContent = isWajib ? "WAJIB ZAKAT" : "BELUM WAJIB";
      statusEl.style.color = isWajib ? "var(--gold-light)" : "rgba(255,255,255,0.45)";
    }
    if (resultEl) resultEl.textContent = formatInputRupiah(zakatDue);

    if (donateBtn) {
      donateBtn.disabled = zakatDue <= 0;
      donateBtn.dataset.amount = zakatDue;
    }
  };

  const calcFitrah = () => {
    const members = Number(document.querySelector("#calc-fitrah-members")?.value || 1);
    const ricePrice = Number(document.querySelector("#calc-fitrah-rice-price")?.value || 16000);

    const totalRice = members * 2.5;
    const zakatDue = members * 2.5 * ricePrice;

    const totalRiceEl = document.querySelector("#calc-fitrah-total-rice");
    const resultEl = document.querySelector("#calc-fitrah-result");
    const donateBtn = document.querySelector("#calc-fitrah-donate");

    if (totalRiceEl) totalRiceEl.textContent = `${totalRice.toLocaleString("id-ID")} kg`;
    if (resultEl) resultEl.textContent = formatInputRupiah(zakatDue);

    if (donateBtn) {
      donateBtn.disabled = zakatDue <= 0;
      donateBtn.dataset.amount = zakatDue;
    }
  };

  ["calc-profesi-salary", "calc-profesi-other", "calc-gold-price-profesi"].forEach(id => {
    document.querySelector(`#${id}`)?.addEventListener("input", calcProfesi);
  });
  ["calc-maal-cash", "calc-maal-gold", "calc-maal-trade", "calc-maal-debt", "calc-gold-price-maal"].forEach(id => {
    document.querySelector(`#${id}`)?.addEventListener("input", calcMaal);
  });
  ["calc-fitrah-members", "calc-fitrah-rice-price"].forEach(id => {
    document.querySelector(`#${id}`)?.addEventListener("input", calcFitrah);
  });

  document.querySelectorAll(".calc-donate-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const amt = Number(btn.dataset.amount || 0);
      if (amt <= 0) return;
      let category = "Infaq / Sedekah";
      if (btn.id === "calc-profesi-donate") {
        category = "Zakat Profesi";
      } else if (btn.id === "calc-maal-donate") {
        category = "Zakat Maal";
      } else if (btn.id === "calc-fitrah-donate") {
        category = "Zakat Fitrah";
      }
      const donationDialog = document.querySelector("#donation-dialog");
      if (donationDialog) {
        initDonationDialogFlow(amt, "QRIS", category);
        donationDialog.showModal();
        window.confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
      }
    });
  });

  calcProfesi();
  calcMaal();
  calcFitrah();
}

// Global modal helpers assigned to window to preserve inline html action bindings
window.openNewsReader = function(id) {
  const item = appState.news.find((n) => Number(n.id) === Number(id));
  if (!item) return;
  const newsDialog = document.querySelector("#news-reader-dialog");
  const body = document.querySelector("#news-dialog-body");
  if (body && newsDialog) {
    body.innerHTML = `
      <div class="news-dialog-header" style="text-align: center; margin-bottom: 1.5rem;">
        <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.75rem; font-weight:700; color:var(--gold-dark); text-transform:uppercase; margin-bottom:0.5rem;">
          <span>${escapeHtml(item.category)}</span>
          <span>${formatDateId(item.date)}</span>
        </div>
        <h2 style="font-family:var(--font-serif); font-size:1.8rem; line-height:1.3; color:var(--neutral-dark); margin:0;">${escapeHtml(item.title)}</h2>
      </div>
      <img src="${escapeHtml(item.imageUrl)}" alt="${escapeHtml(item.title)}" style="width:100%; height:280px; object-fit:cover; border-radius:var(--radius-md); margin-bottom:1.5rem; box-shadow:var(--shadow-sm);" />
      <div class="news-dialog-text" style="font-size:0.95rem; line-height:1.7; color:var(--neutral-mid); text-align:center;">
        ${item.content.split("\n").filter(Boolean).map(p => `<p style="margin-bottom:1rem;">${escapeHtml(p)}</p>`).join("")}
      </div>
    `;
    newsDialog.showModal();
  }
};

window.openPhotoViewer = function(url, title) {
  const dialog = document.querySelector("#photo-viewer-dialog");
  const img = document.querySelector("#photo-viewer-img");
  const caption = document.querySelector("#photo-viewer-caption");
  if (dialog && img) {
    img.src = url;
    if (caption) caption.textContent = title;
    dialog.showModal();
  }
};
