import {
  BANOM_DATA,
  appState,
  app
} from "../state.js";
import {
  getSubdomainBanom,
  getMainDomainUrl,
  escapeHtml,
  formatDateId,
  navigateToBanom,
  navigate,
  initScrollReveal
} from "../utils.js";
import {
  renderBoardAvatar
} from "../components.js";

export function renderBanomPortal(slug) {
  const banom = BANOM_DATA.find((item) => item.slug === slug);
  if (!banom) {
    if (getSubdomainBanom()) {
      window.location.href = getMainDomainUrl();
    } else {
      navigate("/");
    }
    return;
  }

  document.title = `${banom.name} | PRNU Karangsalam Kidul II`;
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) {
    metaDesc.setAttribute("content", `Portal resmi ${banom.name} PRNU Karangsalam Kidul II: profil, kepengurusan, warta kegiatan, dan dokumentasi.`);
  }

  const board = appState.boardMembers.filter((m) => m.organization === slug && m.active !== false);
  const newsList = appState.news.filter((n) => n.organization === slug && n.status === "published");
  const gallery = appState.publicDocumentation.filter((d) => d.organization === slug);

  const heroGradient = banom.gradient || `linear-gradient(135deg, ${banom.color} 0%, #0d1117 100%)`;
  const emojis = banom.heroEmoji || [];
  const sectionTitle = banom.sectionTitle || `Program & Kegiatan`;
  const visiText = banom.visi || banom.desc;
  const quoteText = banom.quote || "";

  app.innerHTML = `
    <div class="banom-portal-container banom-theme-${escapeHtml(slug)}" style="--banom-color: ${escapeHtml(banom.color)};">
      <!-- Banom Header -->
      <header class="landing-header banom-header">
        <a class="landing-brand" href="${getMainDomainUrl()}" ${!getSubdomainBanom() ? `onclick="event.preventDefault(); navigate('/');"` : ''} aria-label="Beranda Utama Ranting">
          <img src="/logo-karangsalam-2.png" alt="Logo Karangsalam 2" />
          <span><strong>PRNU</strong><small>Karangsalam Kidul II</small></span>
        </a>
        <div class="banom-nav-right">
          <!-- Banom Switcher Dropdown -->
          <div class="banom-switcher">
            <select id="banomSelect" onchange="navigateToBanom(this.value)" aria-label="Pilih Badan Otonom">
              <option value="" disabled>Pilih Badan Otonom...</option>
              ${BANOM_DATA.map(item => `
                <option value="${escapeHtml(item.slug)}" ${item.slug === slug ? "selected" : ""}>${escapeHtml(item.name)}</option>
              `).join("")}
            </select>
          </div>
          <a class="primary-button compact return-main-btn" href="${getMainDomainUrl()}" ${!getSubdomainBanom() ? `onclick="event.preventDefault(); navigate('/');"` : ''}>
            ← Kembali ke Ranting
          </a>
        </div>
      </header>

      <main>
        <!-- Banom Hero with unique gradient & decorations -->
        <section class="banom-hero" style="background: ${heroGradient};">
          <!-- Floating emoji decorations -->
          <div class="banom-hero-floating" aria-hidden="true">
            ${emojis.map((e, i) => `<span class="banom-float-emoji banom-float-${i}">${e}</span>`).join("")}
          </div>
          <!-- SVG pattern overlay -->
          <div class="banom-hero-pattern" aria-hidden="true"></div>
          <div class="banom-hero-content">
            <div class="banom-icon-large">
              ${banom.icon}
            </div>
            <h1>${escapeHtml(banom.name)}</h1>
            <p class="banom-hero-tagline">"${escapeHtml(banom.tagline)}"</p>
            <div class="banom-basis-badge">
              <span>Basis Anggota: <strong>${escapeHtml(banom.basis)}</strong></span>
            </div>
          </div>
        </section>

        <!-- Visi & Quote Section -->
        <section class="banom-visi-section">
          <div class="banom-visi-inner">
            <div class="banom-visi-icon" style="color: ${escapeHtml(banom.color)};">
              ${banom.icon}
            </div>
            <div class="banom-visi-text">
              <p class="landing-kicker" style="color: ${escapeHtml(banom.color)};">Visi & Misi</p>
              <h2>Arah Perjuangan <span style="color: ${escapeHtml(banom.color)};">${escapeHtml(banom.name)}</span></h2>
              <p class="banom-visi-desc">${escapeHtml(visiText)}</p>
              ${quoteText ? `
                <blockquote class="banom-quote" style="border-left-color: ${escapeHtml(banom.color)};">
                  <p>${escapeHtml(quoteText)}</p>
                </blockquote>
              ` : ""}
            </div>
          </div>
        </section>

        <!-- Banom Profil -->
        <section class="banom-section-content bg-light">
          <div class="banom-grid-two">
            <div class="banom-profile-text">
              <p class="landing-kicker" style="color: ${escapeHtml(banom.color)};">Profil & Gerakan</p>
              <h2>Khidmah Perjuangan <br /><span style="color: ${escapeHtml(banom.color)};">${escapeHtml(banom.name)}</span></h2>
              <p class="banom-desc-p">${escapeHtml(banom.desc)}</p>
              <div class="banom-tags">
                ${banom.tags.map(tag => `<span class="banom-tag" style="background:${escapeHtml(banom.color)}15; color:${escapeHtml(banom.color)}; border: 1px solid ${escapeHtml(banom.color)}25;">${escapeHtml(tag)}</span>`).join("")}
              </div>
            </div>
            <div class="banom-profile-logo-container">
              <div class="banom-logo-wrap" style="border-color: ${escapeHtml(banom.color)}30; background: ${escapeHtml(banom.color)}05;">
                <div style="color: ${escapeHtml(banom.color)}; width: 100px; height: 100px; display:flex; align-items:center; justify-content:center;">
                  ${banom.icon}
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- Susunan Pengurus -->
        <section class="banom-section-content">
          <div class="landing-heading-row">
            <div>
              <p class="landing-kicker" style="color: ${escapeHtml(banom.color)};">Struktur Organisasi</p>
              <h2>Susunan Kepengurusan<br /><span>Khadimul Ummah</span></h2>
            </div>
            <p>Roda perjuangan ${escapeHtml(banom.name)} Karangsalam Kidul II digerakkan secara bergotong royong oleh kepengurusan aktif berikut ini.</p>
          </div>

          ${board.length > 0 ? `
            <div class="banom-board-grid">
              ${board.map((member, index) => `
                <article class="banom-board-card reveal-on-scroll reveal-delay-${(index % 4) * 100}">
                  <div class="banom-board-avatar-wrap">
                    ${renderBoardAvatar(member, 'large')}
                  </div>
                  <h3>${escapeHtml(member.name)}</h3>
                  <p class="banom-board-position" style="color: ${escapeHtml(banom.color)}; background: ${escapeHtml(banom.color)}10;">${escapeHtml(member.position)}</p>
                  ${member.phone ? `<p class="banom-board-detail"><span>📞</span> ${escapeHtml(member.phone)}</p>` : ""}
                  ${member.address ? `<p class="banom-board-detail"><span>📍</span> ${escapeHtml(member.address)}</p>` : ""}
                </article>
              `).join("")}
            </div>
          ` : `
            <div class="banom-empty-state">
              <p>Struktur kepengurusan resmi untuk tingkat Ranting sedang dimutakhirkan.</p>
            </div>
          `}
        </section>

        <!-- Berita & Agenda -->
        <section class="banom-section-content bg-light">
          <div class="landing-heading-row">
            <div>
              <p class="landing-kicker" style="color: ${escapeHtml(banom.color)};">Warta Terkini</p>
              <h2>${escapeHtml(sectionTitle)}<br /><span>Khidmah ${escapeHtml(banom.name)}</span></h2>
            </div>
            <p>Laporan rutin pengajian, aksi sosial kemanusiaan, dan konsolidasi kader di lapangan.</p>
          </div>

          ${newsList.length > 0 ? `
            <div class="banom-news-grid">
              ${newsList.map((news, index) => `
                <article class="banom-news-card reveal-on-scroll reveal-delay-${(index % 3) * 100}" onclick="openNewsReader(${news.id})">
                  <div class="banom-news-img-wrap">
                    <img src="${escapeHtml(news.imageUrl || '/logo-karangsalam-2.png')}" alt="${escapeHtml(news.title)}" loading="lazy" />
                  </div>
                  <div class="banom-news-body">
                    <div class="banom-news-meta">
                      <span class="banom-news-category" style="color: ${escapeHtml(banom.color)}; background: ${escapeHtml(banom.color)}12;">${escapeHtml(news.category)}</span>
                      <span class="banom-news-date">${formatDateId(news.date)}</span>
                    </div>
                    <h3>${escapeHtml(news.title)}</h3>
                    <p>${escapeHtml(news.excerpt)}</p>
                    <span class="banom-read-more" style="color: ${escapeHtml(banom.color)};">Baca selengkapnya <span>→</span></span>
                  </div>
                </article>
              `).join("")}
            </div>
          ` : `
            <div class="banom-empty-state">
              <p>Belum ada warta kegiatan khusus yang diunggah untuk ${escapeHtml(banom.name)} saat ini.</p>
            </div>
          `}
        </section>

        <!-- Dokumentasi Kegiatan -->
        <section class="banom-section-content">
          <div class="landing-heading-row">
            <div>
              <p class="landing-kicker" style="color: ${escapeHtml(banom.color)};">Album Khidmah</p>
              <h2>Galeri Dokumentasi Real<br /><span>Aktivitas Lapangan</span></h2>
            </div>
            <p>Potret kebersamaan dan aksi nyata ${escapeHtml(banom.name)} Karangsalam Kidul II di tengah-tengah warga.</p>
          </div>

          ${gallery.length > 0 ? `
            <div class="banom-gallery-grid">
              ${gallery.map((img, index) => `
                <figure class="banom-gallery-item reveal-on-scroll reveal-delay-${(index % 4) * 100}" onclick="openPhotoViewer('${escapeHtml(img.photoUrl)}', '${escapeHtml(img.title)}')">
                  <img src="${escapeHtml(img.photoUrl)}" alt="${escapeHtml(img.title)}" loading="lazy" />
                  <figcaption>
                    <h4>${escapeHtml(img.title)}</h4>
                    <small>${formatDateId(img.date)}</small>
                  </figcaption>
                </figure>
              `).join("")}
            </div>
          ` : `
            <div class="banom-empty-state">
              <p>Belum ada dokumentasi foto kegiatan khusus untuk ${escapeHtml(banom.name)}.</p>
            </div>
          `}
        </section>
      </main>

      <!-- Footer -->
      <footer class="banom-footer" style="border-top-color: ${escapeHtml(banom.color)}20;">
        <div class="banom-footer-top">
          <div class="banom-footer-brand">
            <img src="/logo-karangsalam-2.png" alt="Logo Ranting" />
            <div>
              <h3>${escapeHtml(banom.name)}</h3>
              <p>Pengurus Ranting NU Karangsalam Kidul II</p>
            </div>
          </div>
          <p class="banom-footer-tagline">"${escapeHtml(banom.tagline)}"</p>
        </div>
        <div class="banom-footer-bottom">
          <p>© 2026 PRNU Karangsalam Kidul II. Jam'iyyah Nahdlatul Ulama.</p>
        </div>
      </footer>

      <!-- Modals -->
      <dialog id="news-reader-dialog" class="news-dialog">
        <button class="news-dialog-close" onclick="this.closest('dialog').close()">&times;</button>
        <div id="news-dialog-body"></div>
      </dialog>

      <dialog id="photo-viewer-dialog" style="border:none; background:transparent; padding:0; outline:none; max-width:90vw; max-height:90vh;">
        <div style="position:relative;">
          <button onclick="this.closest('dialog').close()" style="position:absolute; right:16px; top:16px; background:rgba(0,0,0,0.6); color:#fff; border:none; border-radius:50%; width:36px; height:36px; cursor:pointer; font-size:20px; display:flex; align-items:center; justify-content:center;">&times;</button>
          <img id="photo-viewer-img" src="" alt="" style="max-width:100%; max-height:80vh; object-fit:contain; border-radius:8px; display:block; box-shadow: 0 10px 25px rgba(0,0,0,0.5);" />
          <p id="photo-viewer-caption" style="color:#fff; text-align:center; margin-top:12px; font-weight:600; font-family:var(--font-sans); text-shadow:0 2px 4px rgba(0,0,0,0.8); background:rgba(0,0,0,0.5); padding:6px 12px; border-radius:4px; display:inline-block; position:relative; left:50%; transform:translateX(-50%);"></p>
        </div>
      </dialog>
    </div>
  `;

  window.scrollTo({ top: 0, behavior: "instant" });

  // Trigger animations
  initScrollReveal();
}
