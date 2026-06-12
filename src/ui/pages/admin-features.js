import qrcode from "qrcode-generator";
import { z } from "zod";
import { changePasswordSchema } from "../../lib/validators.js";
import {
  getSession,
  appState,
  brand,
  roles,
  BANOM_DATA,
  syncRowToPostgres,
  deleteRowFromPostgres,
  syncTableToPostgres,
  uploadDocumentationPhoto,
  validateImageFile,
  hasPostgresConfig,
  postgresAuthRequest,
  internalRequest,
  syncSettingsToPostgres,
  syncVerificationAuditToPostgres,
  syncProfileToPostgres,
  isReadOnlyRole,
  isAdminRole,
  canManagePublicContent,
  canManageUsers,
  canAccessPath,
  labelRole,
  canManageDonors,
  canEditPickup,
  canDeletePickup
} from "../state.js";
import {
  escapeHtml,
  formatRupiah,
  formatCompactRupiah,
  getLocalDateString,
  formatDateId,
  formatDateTimeId,
  navigate,
  debounce,
  wrapFormSubmit,
  generateDonorCode,
  createDonorQrPng,
  ensureDonorQr,
  downloadDonorQr,
  generateTransactionNo,
  generateDistributionNo,
  generateOfficerDepositNo,
  generateLazisnuDepositNo
} from "../utils.js";
import {
  renderLazisnuLogo,
  renderBrandFooter,
  renderOfflineAlertBanner,
  renderPhotoPreview,
  bindImagePreview,
  renderBoardAvatar,
  renderBoardPhotoPreview,
  renderIcon
} from "../components.js";
import { getPublishedNews, renderNewsCards } from "./landing.js";
import { renderAppShell } from "./dashboard.js";


// === Constants ===
const distributionCategories = [
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

// === SIKOINNU Core Helper Functions ===
export function getOfficerByName(name) {
  return appState.officers.find((officer) => officer.name === name);
}

export function getOfficerByEmail(email) {
  return appState.officers.find((officer) => officer.username === email);
}

export function getDefaultOfficer(session) {
  return getOfficerByEmail(session?.email) || appState.officers.find((officer) => officer.active) || appState.officers[0];
}

export function resolveOfficerEmail(name, fallback = "") {
  return getOfficerByName(name)?.username || fallback;
}

export function renderOfficerOptions(selectedName = "") {
  return appState.officers.map((officer) => `
    <option value="${escapeHtml(officer.name)}" ${officer.name === selectedName ? "selected" : ""}>
      ${escapeHtml(officer.name)} - ${escapeHtml(officer.area)}
    </option>
  `).join("");
}

export function getDonorQrDataUrl(donor) {
  return ensureDonorQr(donor).qrCodeImage || "";
}

export function renderDonorQr(donor, className = "") {
  const dataUrl = getDonorQrDataUrl(donor);
  return dataUrl
    ? `<img class="donor-qr ${className}" src="${dataUrl}" alt="QR ${escapeHtml(donor.donorCode)}" />`
    : `<div class="qr-placeholder">QR belum tersedia</div>`;
}

export function renderDonorLabel(donor) {
  return `
    <article class="qr-label">
      <header>${renderLazisnuLogo("qr-label-logo")}<strong>SIKOINNU</strong></header>
      ${renderDonorQr(donor, "large")}
      <h2>${escapeHtml(donor.name)}</h2>
      <p>RT ${escapeHtml(donor.rt)} / RW ${escapeHtml(donor.rw)}</p>
      <p>${escapeHtml(donor.address)}</p>
      <strong>${escapeHtml(donor.donorCode)}</strong>
    </article>
  `;
}

export function printDonorQrLabels(donors) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("Popup cetak diblokir browser. Izinkan popup lalu coba lagi.");
    return;
  }
  printWindow.opener = null;
  printWindow.document.write(`<!doctype html><html><head><title>Cetak QR Donatur</title><style>
    body{font-family:Arial,sans-serif;margin:16px;color:#123d29}.labels{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
    .qr-label{break-inside:avoid;text-align:center;border:1px solid #bad7c4;border-radius:12px;padding:14px}.qr-label header{display:flex;align-items:center;justify-content:center;gap:8px}.qr-label-logo{width:42px;height:42px;object-fit:contain}.donor-qr{width:160px;height:160px;margin:8px auto;image-rendering:pixelated}.qr-label h2{font-size:16px;margin:6px 0}.qr-label p{font-size:12px;margin:4px 0}@media print{body{margin:0}}
  </style></head><body><main class="labels">${donors.map(renderDonorLabel).join("")}</main><script>window.onload=()=>window.print()<\/script></body></html>`);
  printWindow.document.close();
}

// === 1. DONORS MANAGEMENT ===
export function getVisibleDonors(session) {
  let donors = [...appState.donors];
  if (session.role === "petugas") {
    donors = donors.filter((donor) => donor.officerEmail === session.email || donor.officerEmail === "petugas@rantingnu.id");
  }
  const search = appState.donorSearch.trim().toLowerCase();
  if (search) {
    donors = donors.filter((donor) => donor.name.toLowerCase().includes(search));
  }
  if (appState.donorRt !== "all") {
    donors = donors.filter((donor) => donor.rt === appState.donorRt);
  }
  if (appState.donorRw !== "all") {
    donors = donors.filter((donor) => donor.rw === appState.donorRw);
  }
  if (appState.donorStatus !== "all") {
    donors = donors.filter((donor) => donor.active === (appState.donorStatus === "active"));
  }
  return donors;
}

export function renderDonorStats(donors) {
  const active = donors.filter((donor) => donor.active).length;
  const inactive = donors.length - active;
  const areas = new Set(donors.map((donor) => `${donor.rt}/${donor.rw}`)).size;
  return `
    <section class="donor-stats">
      <article><span>Total terlihat</span><strong>${donors.length}</strong></article>
      <article><span>Aktif</span><strong>${active}</strong></article>
      <article><span>Tidak aktif</span><strong>${inactive}</strong></article>
      <article><span>Wilayah</span><strong>${areas}</strong></article>
    </section>
  `;
}

const donorImportColumns = ["nama_kk", "alamat", "rt", "rw", "phone", "petugas_penanggung_jawab", "status", "catatan"];
const requiredDonorImportColumns = ["nama_kk", "alamat", "rt", "rw"];

function normalizeImportValue(value) {
  return String(value ?? "").trim();
}
function normalizeAreaValue(value) {
  return normalizeImportValue(value).padStart(2, "0");
}
function normalizeDonorStatus(value) {
  return !["tidak aktif", "tidak_aktif", "nonaktif", "inactive", "false", "0"].includes(normalizeImportValue(value).toLowerCase());
}
function getDonorDuplicateKey(name, rt, rw) {
  return `${normalizeImportValue(name).toLowerCase()}|${normalizeAreaValue(rt)}|${normalizeAreaValue(rw)}`;
}

export function downloadDonorTemplate() {
  const rows = [
    donorImportColumns,
    ["Bapak Ahmad Hasyim", "Jl. Melati No. 10", "01", "03", "081234567890", "Ahmad Fauzi", "aktif", "Contoh donatur aktif"],
    ["Ibu Nur Faizah", "Gang Kenanga RT 02", "02", "03", "085712345678", "Siti Aminah", "aktif", "Contoh pengambilan Jumat sore"]
  ];
  const csv = rows.map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "template-import-donatur.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function parseCsvText(text) {
  const rows = [];
  let row = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"' && quoted && text[index + 1] === '"') {
      value += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === "," && !quoted) {
      row.push(value);
      value = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && text[index + 1] === "\n") index += 1;
      row.push(value);
      if (row.some((cell) => normalizeImportValue(cell))) rows.push(row);
      row = [];
      value = "";
    } else {
      value += character;
    }
  }
  row.push(value);
  if (row.some((cell) => normalizeImportValue(cell))) rows.push(row);
  return rows;
}

async function readDonorImportFile(file) {
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (extension === "csv") return parseCsvText(await file.text());
  if (extension === "xlsx") return readFirstXlsxSheet(await file.arrayBuffer());
  throw new Error("Pilih file dengan format .xlsx atau .csv.");
}

async function inflateZipEntry(bytes) {
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function readZipEntries(buffer) {
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);
  let eocdOffset = bytes.length - 22;
  while (eocdOffset >= 0 && view.getUint32(eocdOffset, true) !== 0x06054b50) eocdOffset -= 1;
  if (eocdOffset < 0) throw new Error("File XLSX tidak valid.");
  const entryCount = view.getUint16(eocdOffset + 10, true);
  let offset = view.getUint32(eocdOffset + 16, true);
  const decoder = new TextDecoder();
  const entries = new Map();
  for (let index = 0; index < entryCount; index += 1) {
    if (view.getUint32(offset, true) !== 0x02014b50) throw new Error("Struktur XLSX tidak dapat dibaca.");
    const method = view.getUint16(offset + 10, true);
    const compressedSize = view.getUint32(offset + 20, true);
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const localOffset = view.getUint32(offset + 42, true);
    const name = decoder.decode(bytes.slice(offset + 46, offset + 46 + nameLength));
    const localNameLength = view.getUint16(localOffset + 26, true);
    const localExtraLength = view.getUint16(localOffset + 28, true);
    const start = localOffset + 30 + localNameLength + localExtraLength;
    const compressed = bytes.slice(start, start + compressedSize);
    entries.set(name, method === 8 ? await inflateZipEntry(compressed) : compressed);
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

function parseXml(bytes, fileName) {
  if (!bytes) throw new Error(`Bagian ${fileName} tidak ditemukan pada file XLSX.`);
  return new DOMParser().parseFromString(new TextDecoder().decode(bytes), "application/xml");
}

function getExcelColumnIndex(reference = "") {
  return [...reference.replace(/\d/g, "")].reduce((total, letter) => total * 26 + letter.charCodeAt(0) - 64, 0) - 1;
}

async function readFirstXlsxSheet(buffer) {
  const entries = await readZipEntries(buffer);
  const sharedStringsXml = entries.get("xl/sharedStrings.xml");
  const sharedStrings = sharedStringsXml
    ? [...parseXml(sharedStringsXml, "sharedStrings.xml").querySelectorAll("si")].map((node) => node.textContent || "")
    : [];
  const workbook = parseXml(entries.get("xl/workbook.xml"), "workbook.xml");
  const relationships = parseXml(entries.get("xl/_rels/workbook.xml.rels"), "workbook.xml.rels");
  const relationshipId = workbook.querySelector("sheets sheet")?.getAttribute("r:id");
  const target = [...relationships.querySelectorAll("Relationship")]
    .find((relationship) => relationship.getAttribute("Id") === relationshipId)
    ?.getAttribute("Target");
  const sheetPath = target ? `xl/${target.replace(/^\/?xl\//, "")}` : "xl/worksheets/sheet1.xml";
  const document = parseXml(entries.get(sheetPath), sheetPath);
  return [...document.querySelectorAll("sheetData row")].map((row) => {
    const values = [];
    row.querySelectorAll("c").forEach((cell) => {
      const index = getExcelColumnIndex(cell.getAttribute("r") || "");
      const type = cell.getAttribute("t");
      const raw = cell.querySelector("v")?.textContent || cell.querySelector("is")?.textContent || "";
      values[index] = type === "s" ? sharedStrings[Number(raw)] || "" : raw;
    });
    return values;
  });
}

function validateDonorImportRows(matrix) {
  const [headerRow = [], ...dataRows] = matrix;
  const headers = headerRow.map((header) => normalizeImportValue(header).replace(/^\uFEFF/, "").toLowerCase());
  const missingColumns = requiredDonorImportColumns.filter((column) => !headers.includes(column));
  if (missingColumns.length) throw new Error(`Kolom wajib belum tersedia: ${missingColumns.join(", ")}.`);
  const indexByColumn = Object.fromEntries(donorImportColumns.map((column) => [column, headers.indexOf(column)]));
  const existingKeys = new Set(appState.donors.map((donor) => getDonorDuplicateKey(donor.name, donor.rt, donor.rw)));
  const fileKeys = new Set();
  return dataRows
    .filter((row) => row.some((cell) => normalizeImportValue(cell)))
    .map((row, index) => {
      const get = (column) => indexByColumn[column] >= 0 ? normalizeImportValue(row[indexByColumn[column]]) : "";
      const officerName = get("petugas_penanggung_jawab");
      const officer = getOfficerByName(officerName);
      const donor = {
        name: get("nama_kk"),
        address: get("alamat"),
        rt: normalizeAreaValue(get("rt")),
        rw: normalizeAreaValue(get("rw")),
        phone: get("phone"),
        officer: officerName,
        officerEmail: officer?.username || "",
        active: normalizeDonorStatus(get("status")),
        note: get("catatan")
      };
      const errors = requiredDonorImportColumns.filter((column) => !get(column)).map((column) => `${column} wajib diisi`);
      const warnings = [];
      const duplicateKey = getDonorDuplicateKey(donor.name, donor.rt, donor.rw);
      if (existingKeys.has(duplicateKey) || fileKeys.has(duplicateKey)) warnings.push("Kemungkinan duplikat nama_kk + RT + RW");
      if (officerName && !officer) warnings.push(`Petugas "${officerName}" belum cocok`);
      if (!officerName) warnings.push("Petugas penanggung jawab belum diisi");
      fileKeys.add(duplicateKey);
      if (officerName && !officer) donor.note = [donor.note, `Petugas impor belum cocok: ${officerName}`].filter(Boolean).join(" | ");
      return { rowNumber: index + 2, donor, errors, warnings };
    });
}

export function renderDonorImportModal() {
  if (!appState.donorImportModalOpen) return "";
  const rows = appState.donorImportRows;
  const invalidRows = rows.filter((row) => row.errors.length);
  const validRows = rows.filter((row) => !row.errors.length);
  const warningCount = rows.filter((row) => row.warnings.length).length;
  return `
    <div class="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="donorImportTitle">
      <section class="donor-import-modal">
        <div class="modal-heading">
          <div><p class="eyebrow">Import Excel Donatur</p><h2 id="donorImportTitle">Preview ${escapeHtml(appState.donorImportFileName)}</h2></div>
          <button class="close-button" data-close-donor-import type="button" aria-label="Tutup">x</button>
        </div>
        <div class="import-summary">
          <article><span>Total baris</span><strong>${rows.length}</strong></article>
          <article class="valid"><span>Data valid</span><strong>${validRows.length}</strong></article>
          <article class="${invalidRows.length ? "invalid" : ""}"><span>Bermasalah</span><strong>${invalidRows.length}</strong></article>
          <article class="${warningCount ? "warning" : ""}"><span>Warning</span><strong>${warningCount}</strong></article>
        </div>
        <p class="import-help">Warning tetap dapat disimpan. Baris dengan error wajib diperbaiki di file lalu diunggah ulang.</p>
        <div class="table-wrap import-preview-table">
          <table>
            <thead><tr><th>Baris</th><th>Nama KK</th><th>Alamat</th><th>RT/RW</th><th>Petugas</th><th>Status</th><th>Catatan validasi</th></tr></thead>
            <tbody>${rows.map((row) => `
              <tr class="${row.errors.length ? "import-row-error" : row.warnings.length ? "import-row-warning" : ""}">
                <td>${row.rowNumber}</td>
                <td>${escapeHtml(row.donor.name || "-")}</td>
                <td>${escapeHtml(row.donor.address || "-")}</td>
                <td>${escapeHtml(row.donor.rt || "-")}/${escapeHtml(row.donor.rw || "-")}</td>
                <td>${escapeHtml(row.donor.officer || "-")}</td>
                <td>${row.donor.active ? "Aktif" : "Tidak aktif"}</td>
                <td>${escapeHtml([...row.errors, ...row.warnings].join("; ") || "Siap diimpor")}</td>
              </tr>
            `).join("")}</tbody>
          </table>
        </div>
        <p class="form-error" id="donorImportError" role="alert"></p>
        <div class="modal-actions">
          <button class="ghost-button" data-close-donor-import type="button">Batal</button>
          <button class="primary-button compact" id="saveDonorImportButton" type="button" ${!rows.length || invalidRows.length ? "disabled" : ""}>Simpan Import (${validRows.length})</button>
        </div>
      </section>
    </div>
  `;
}

export function renderDonorActions(donor, session) {
  const manageButtons = canManageDonors(session.role) ? `
    <button class="icon-button" data-action="edit" data-id="${donor.id}" type="button" aria-label="Edit ${escapeHtml(donor.name)}">Edit</button>
    <button class="icon-button danger" data-action="delete" data-id="${donor.id}" type="button" aria-label="Hapus ${escapeHtml(donor.name)}">Hapus</button>
  ` : "";
  return `
    <div class="row-actions">
      <button class="icon-button soft" data-action="detail" data-id="${donor.id}" type="button" aria-label="Detail ${escapeHtml(donor.name)}">Detail</button>
      <button class="icon-button soft" data-donor-qr-action="download" data-id="${donor.id}" type="button">Download QR</button>
      <button class="icon-button soft" data-donor-qr-action="print" data-id="${donor.id}" type="button">Print QR</button>
      <button class="icon-button soft" data-donor-qr-action="regenerate" data-id="${donor.id}" type="button">Generate Ulang QR</button>
      ${manageButtons}
    </div>
  `;
}

export function renderDonorTable(donors, session) {
  if (!donors.length) return `<div class="empty-state">Data donatur tidak ditemukan. Coba ubah pencarian atau filter wilayah.</div>`;
  const rows = donors.map((donor) => `
    <tr>
      <td><strong>${escapeHtml(donor.name)}</strong><span>${escapeHtml(donor.phone)}</span></td>
      <td>${escapeHtml(donor.address)}</td>
      <td>RT ${donor.rt} / RW ${donor.rw}</td>
      <td>${escapeHtml(donor.officer)}</td>
      <td>${renderDonorQr(donor, "small")}<span>${escapeHtml(ensureDonorQr(donor).donorCode)}</span></td>
      <td><span class="status-pill ${donor.active ? "active" : "inactive"}">${donor.active ? "Aktif" : "Tidak aktif"}</span></td>
      <td>${renderDonorActions(donor, session)}</td>
    </tr>
  `).join("");
  const cards = donors.map((donor) => `
    <article class="donor-card">
      <div><strong>${escapeHtml(donor.name)}</strong><span>${escapeHtml(donor.address)}</span></div>
      <div class="donor-card-meta"><span>RT ${donor.rt}/RW ${donor.rw}</span><span>${escapeHtml(donor.officer)}</span><span class="status-pill ${donor.active ? "active" : "inactive"}">${donor.active ? "Aktif" : "Tidak aktif"}</span></div>
      <div class="donor-card-qr">${renderDonorQr(donor, "small")}<strong>${escapeHtml(ensureDonorQr(donor).donorCode)}</strong></div>
      ${renderDonorActions(donor, session)}
    </article>
  `).join("");
  return `
    <div class="table-wrap donor-table">
      <table>
        <thead><tr><th>Nama</th><th>Alamat</th><th>RT/RW</th><th>Petugas</th><th>QR Donatur</th><th>Status</th><th>Aksi</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <div class="donor-card-list">${cards}</div>
  `;
}

export function renderDonorModal(session) {
  if (!appState.modalMode) return "";
  const donor = appState.donors.find((item) => item.id === appState.selectedDonorId);
  const mode = appState.modalMode;
  const isReadonly = mode === "detail";
  const title = mode === "add" ? "Tambah Donatur" : mode === "edit" ? "Edit Donatur" : mode === "delete" ? "Hapus Donatur" : "Detail Donatur";

  if (mode === "delete") {
    return `
      <div class="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="donorModalTitle">
        <section class="confirm-modal">
          <h2 id="donorModalTitle">${title}</h2>
          <p>Yakin ingin menghapus data <strong>${escapeHtml(donor?.name || "donatur ini")}</strong>? Data demo ini akan hilang dari daftar saat ini.</p>
          <div class="modal-actions">
            <button class="ghost-button" data-close-modal type="button">Batal</button>
            <button class="danger-button" id="confirmDeleteButton" type="button">Hapus</button>
          </div>
        </section>
      </div>
    `;
  }

  const defaultOfficer = getDefaultOfficer(session);
  const values = donor || { name: "", address: "", rt: "", rw: "", phone: "", officer: defaultOfficer?.name || "", active: true, note: "" };

  return `
    <div class="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="donorModalTitle">
      <form class="donor-form-modal" id="donorForm" novalidate>
        <div class="modal-heading">
          <div><p class="eyebrow">Data Donatur</p><h2 id="donorModalTitle">${title}</h2></div>
          <button class="close-button" data-close-modal type="button" aria-label="Tutup">x</button>
        </div>
        <div class="form-grid">
          <label class="field"><span>Nama kepala keluarga</span><input name="name" value="${escapeHtml(values.name)}" ${isReadonly ? "readonly" : ""} required /></label>
          <label class="field"><span>Nomor HP</span><input name="phone" value="${escapeHtml(values.phone)}" ${isReadonly ? "readonly" : ""} /></label>
          <label class="field full"><span>Alamat lengkap</span><input name="address" value="${escapeHtml(values.address)}" ${isReadonly ? "readonly" : ""} required /></label>
          <label class="field"><span>RT</span><input name="rt" value="${escapeHtml(values.rt)}" ${isReadonly ? "readonly" : ""} required /></label>
          <label class="field"><span>RW</span><input name="rw" value="${escapeHtml(values.rw)}" ${isReadonly ? "readonly" : ""} required /></label>
          <label class="field"><span>Petugas penanggung jawab</span>
            <select name="officer" ${isReadonly ? "disabled" : ""} required>${renderOfficerOptions(values.officer)}</select>
            ${isReadonly ? `<input type="hidden" name="officer" value="${escapeHtml(values.officer)}" />` : ""}
          </label>
          <label class="field"><span>Status</span>
            <select name="active" ${isReadonly ? "disabled" : ""}>
              <option value="true" ${values.active ? "selected" : ""}>Aktif</option>
              <option value="false" ${!values.active ? "selected" : ""}>Tidak aktif</option>
            </select>
          </label>
          <label class="field full"><span>Catatan</span><textarea name="note" ${isReadonly ? "readonly" : ""}>${escapeHtml(values.note)}</textarea></label>
          ${isReadonly ? `<div class="full donor-detail-qr">${renderDonorQr(ensureDonorQr(values), "large")}<div><span>Kode donatur</span><strong>${escapeHtml(values.donorCode)}</strong></div></div>` : ""}
        </div>
        <p class="form-error" id="donorFormError" role="alert"></p>
        <div class="modal-actions">
          <button class="ghost-button" data-close-modal type="button">${isReadonly ? "Tutup" : "Batal"}</button>
          ${isReadonly ? "" : `<button class="primary-button compact" type="submit">${mode === "add" ? "Simpan Donatur" : "Simpan Perubahan"}</button>`}
        </div>
      </form>
    </div>
  `;
}

export function renderDonors() {
  const session = getSession();
  if (!session?.role) return navigate("/login");
  const donors = getVisibleDonors(session);
  if (generateAllDonorQrs()) syncTableToPostgres("donatur");
  const rtOptions = [...new Set(appState.donors.map((donor) => donor.rt))].sort();
  const rwOptions = [...new Set(appState.donors.map((donor) => donor.rw))].sort();

  renderAppShell(session, "Data Donatur", `
    <section class="donor-hero">
      <div>
        <p class="eyebrow">Basis Data Ranting</p>
        <h2>Kelola donatur Koin NU per wilayah RT/RW.</h2>
        <p>${session.role === "petugas" ? "Petugas hanya melihat donatur wilayah tanggung jawabnya." : "Admin dan bendahara dapat mengelola data donatur."}</p>
      </div>
      ${canManageDonors(session.role) ? `
        <div class="donor-import-actions">
          <button class="ghost-button" id="downloadDonorTemplateButton" type="button">Download Template Excel</button>
          <button class="ghost-button" id="importDonorButton" type="button">Import Excel Donatur</button>
          <button class="ghost-button" id="printAllDonorQrButton" type="button">Cetak Semua QR Donatur</button>
          <button class="ghost-button" id="generateAllDonorQrButton" type="button">Generate Semua QR Donatur</button>
          <button class="primary-button compact" id="addDonorButton" type="button">Tambah Donatur</button>
          <input class="is-hidden" id="donorImportFile" type="file" accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv" />
        </div>
      ` : ""}
    </section>
    ${renderDonorStats(donors)}
    <section class="panel donor-panel">
      <div class="donor-toolbar">
        <label class="search-field"><span>Cari nama</span><input id="donorSearch" type="search" value="${escapeHtml(appState.donorSearch)}" placeholder="Cari kepala keluarga" /></label>
        <label><span>RT</span><select id="donorRt"><option value="all">Semua RT</option>${rtOptions.map((rt) => `<option value="${rt}" ${appState.donorRt === rt ? "selected" : ""}>RT ${rt}</option>`).join("")}</select></label>
        <label><span>RW</span><select id="donorRw"><option value="all">Semua RW</option>${rwOptions.map((rw) => `<option value="${rw}" ${appState.donorRw === rw ? "selected" : ""}>RW ${rw}</option>`).join("")}</select></label>
        <label><span>Status</span>
          <select id="donorStatus">
            <option value="all" ${appState.donorStatus === "all" ? "selected" : ""}>Semua status</option>
            <option value="active" ${appState.donorStatus === "active" ? "selected" : ""}>Aktif</option>
            <option value="inactive" ${appState.donorStatus === "inactive" ? "selected" : ""}>Tidak aktif</option>
          </select>
        </label>
      </div>
      ${renderDonorTable(donors, session)}
    </section>
    ${renderDonorModal(session)}
    ${renderDonorImportModal()}
  `);
  bindDonorEvents(session);
}

export function bindDonorEvents(session) {
  document.querySelector("#addDonorButton")?.addEventListener("click", () => openDonorModal("add"));
  document.querySelector("#downloadDonorTemplateButton")?.addEventListener("click", downloadDonorTemplate);
  document.querySelector("#importDonorButton")?.addEventListener("click", () => document.querySelector("#donorImportFile")?.click());
  document.querySelector("#printAllDonorQrButton")?.addEventListener("click", () => printDonorQrLabels(getVisibleDonors(session)));
  document.querySelector("#generateAllDonorQrButton")?.addEventListener("click", () => {
    generateAllDonorQrs(true);
    syncTableToPostgres("donatur");
    renderDonors();
  });
  document.querySelector("#donorImportFile")?.addEventListener("change", handleDonorImportFile);
  document.querySelectorAll("[data-close-donor-import]").forEach((button) => button.addEventListener("click", closeDonorImportModal));
  document.querySelector("#saveDonorImportButton")?.addEventListener("click", saveDonorImport);

  document.querySelector("#donorSearch")?.addEventListener("input", debounce((event) => {
    appState.donorSearch = event.target.value;
    renderDonors();
  }, 250));
  document.querySelector("#donorRt")?.addEventListener("change", (event) => {
    appState.donorRt = event.target.value;
    renderDonors();
  });
  document.querySelector("#donorRw")?.addEventListener("change", (event) => {
    appState.donorRw = event.target.value;
    renderDonors();
  });
  document.querySelector("#donorStatus")?.addEventListener("change", (event) => {
    appState.donorStatus = event.target.value;
    renderDonors();
  });

  document.querySelectorAll("[data-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const id = Number(button.dataset.id);
      const action = button.dataset.action;
      if ((action === "edit" || action === "delete") && !canManageDonors(session.role)) return;
      openDonorModal(action, id);
    });
  });
  document.querySelectorAll("[data-donor-qr-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const donor = appState.donors.find((item) => item.id === Number(button.dataset.id));
      if (!donor) return;
      if (button.dataset.donorQrAction === "download") downloadDonorQr(donor);
      if (button.dataset.donorQrAction === "print") printDonorQrLabels([donor]);
      if (button.dataset.donorQrAction === "regenerate") {
        ensureDonorQr(donor, true);
        syncRowToPostgres("donatur", donor);
        renderDonors();
      }
    });
  });
  document.querySelectorAll("[data-close-modal]").forEach((button) => button.addEventListener("click", closeDonorModal));
  document.querySelector("#donorForm")?.addEventListener("submit", handleDonorSubmit);
  document.querySelector("#confirmDeleteButton")?.addEventListener("click", handleDonorDelete);
}

async function handleDonorImportFile(event) {
  const file = event.target.files?.[0];
  event.target.value = "";
  if (!file) return;
  try {
    appState.donorImportRows = validateDonorImportRows(await readDonorImportFile(file));
    appState.donorImportFileName = file.name;
    appState.donorImportModalOpen = true;
    renderDonors();
  } catch (error) {
    alert(error.message);
  }
}

function closeDonorImportModal() {
  appState.donorImportRows = [];
  appState.donorImportFileName = "";
  appState.donorImportModalOpen = false;
  renderDonors();
}

function saveDonorImport() {
  const invalidRows = appState.donorImportRows.filter((row) => row.errors.length);
  if (!appState.donorImportRows.length || invalidRows.length) return;
  const imported = appState.donorImportRows.map((row, index) => ({ id: Date.now() + index, ...row.donor })).map(ensureDonorQr);
  appState.donors = [...imported, ...appState.donors];
  syncTableToPostgres("donatur");
  closeDonorImportModal();
}

export function openDonorModal(mode, id = null) {
  appState.modalMode = mode;
  appState.selectedDonorId = id;
  renderDonors();
}

export function closeDonorModal() {
  appState.modalMode = null;
  appState.selectedDonorId = null;
  renderDonors();
}

export async function handleDonorSubmit(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const payload = {
    name: String(form.get("name") || "").trim(),
    address: String(form.get("address") || "").trim(),
    rt: String(form.get("rt") || "").trim().padStart(2, "0"),
    rw: String(form.get("rw") || "").trim().padStart(2, "0"),
    phone: String(form.get("phone") || "").trim(),
    officer: String(form.get("officer") || "").trim(),
    officerEmail: resolveOfficerEmail(String(form.get("officer") || "").trim(), "petugas@rantingnu.id"),
    active: form.get("active") === "true",
    note: String(form.get("note") || "").trim()
  };
  if (!payload.name || !payload.address || !payload.rt || !payload.rw || !payload.officer) {
    document.querySelector("#donorFormError").textContent = "Nama, alamat, RT, RW, dan petugas wajib diisi.";
    return;
  }
  let targetDonor = null;
  if (appState.modalMode === "edit") {
    appState.donors = appState.donors.map((donor) => {
      if (donor.id === appState.selectedDonorId) {
        targetDonor = ensureDonorQr({ ...donor, ...payload, officerEmail: donor.officerEmail });
        return targetDonor;
      }
      return donor;
    });
  } else {
    targetDonor = ensureDonorQr({ id: Date.now(), ...payload });
    appState.donors = [targetDonor, ...appState.donors];
  }
  const ok = await wrapFormSubmit(event, () => syncRowToPostgres("donatur", targetDonor));
  if (ok) closeDonorModal();
}

export async function handleDonorDelete() {
  if (!await deleteRowFromPostgres("donatur", appState.selectedDonorId)) return;
  appState.donors = appState.donors.filter((donor) => donor.id !== appState.selectedDonorId);
  closeDonorModal();
}

// === 2. COIN PICKUPS ===
export function getVisiblePickups(session) {
  let pickups = [...appState.pickups];
  if (session.role === "petugas") {
    pickups = pickups.filter((pickup) => pickup.officerEmail === session.email || pickup.officerEmail === "petugas@rantingnu.id");
  }
  if (appState.pickupDonor !== "all") {
    pickups = pickups.filter((pickup) => pickup.donorId === Number(appState.pickupDonor));
  }
  const search = appState.pickupSearch.trim().toLowerCase();
  if (search) {
    pickups = pickups.filter((pickup) => pickup.donorName.toLowerCase().includes(search));
  }
  if (appState.pickupDate) {
    pickups = pickups.filter((pickup) => pickup.date === appState.pickupDate);
  }
  if (appState.pickupOfficer !== "all") {
    pickups = pickups.filter((pickup) => pickup.officer === appState.pickupOfficer);
  }
  if (appState.pickupMethod !== "all") {
    pickups = pickups.filter((pickup) => pickup.method === appState.pickupMethod);
  }
  if (appState.pickupNotificationStatus !== "all") {
    pickups = pickups.filter((pickup) => pickup.notificationStatus === appState.pickupNotificationStatus);
  }
  return pickups.sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
}

export function renderPickupStats(pickups) {
  const today = getLocalDateString();
  const month = today.slice(0, 7);
  const totalToday = pickups.filter((pickup) => pickup.date === today).reduce((sum, pickup) => sum + pickup.amount, 0);
  const totalMonth = pickups.filter((pickup) => pickup.date.startsWith(month)).reduce((sum, pickup) => sum + pickup.amount, 0);
  const waiting = pickups.filter((pickup) => pickup.status === "Menunggu Verifikasi").length;
  return `
    <section class="pickup-stats">
      <article><span>Total hari ini</span><strong>${formatRupiah(totalToday)}</strong></article>
      <article><span>Total bulan ini</span><strong>${formatRupiah(totalMonth)}</strong></article>
      <article><span>Jumlah transaksi</span><strong>${pickups.length}</strong></article>
      <article><span>Menunggu verifikasi</span><strong>${waiting}</strong></article>
    </section>
  `;
}

export function renderPickupActions(pickup, session) {
  const verifyButtons = (session.role === "bendahara" || session.role === "admin") && pickup.status === "Menunggu Verifikasi" ? `
    <button class="icon-button approve" data-pickup-action="approve" data-id="${pickup.id}" type="button">Setujui</button>
    <button class="icon-button warning" data-pickup-action="reject" data-id="${pickup.id}" type="button">Tolak</button>
  ` : "";
  const editButton = canEditPickup(session, pickup) ? `
    <button class="icon-button" data-pickup-action="edit" data-id="${pickup.id}" type="button" aria-label="Edit pengambilan ${escapeHtml(pickup.donorName)}">Edit</button>
  ` : "";
  const deleteButton = canDeletePickup(session) ? `
    <button class="icon-button danger" data-pickup-action="delete" data-id="${pickup.id}" type="button" aria-label="Hapus pengambilan ${escapeHtml(pickup.donorName)}">Hapus</button>
  ` : "";
  return `
    <div class="row-actions">
      <button class="icon-button soft" data-pickup-action="detail" data-id="${pickup.id}" type="button" aria-label="Detail pengambilan ${escapeHtml(pickup.donorName)}">Detail</button>
      ${verifyButtons}
      ${editButton}
      ${deleteButton}
    </div>
  `;
}

export function getPickupStatusClass(status) {
  if (status === "Disetujui Bendahara") return "approved";
  if (status === "Ditolak") return "rejected";
  if (status === "Perlu Revisi") return "revision";
  return "waiting";
}

export function getPickupNotificationLabel(status = "belum_dikirim") {
  return {
    belum_dikirim: "Belum dikirim",
    terkirim_wa: "WA Terkirim",
    nomor_kosong: "Nomor kosong",
    cetak_bukti: "Cetak bukti",
    konfirmasi_manual: "Perlu konfirmasi manual"
  }[status] || status;
}

export function getPickupNotificationClass(status = "") {
  if (status === "terkirim_wa") return "approved";
  if (status === "nomor_kosong") return "rejected";
  if (status === "cetak_bukti") return "revision";
  if (status === "konfirmasi_manual") return "waiting";
  return "inactive";
}

export function renderPickupTable(pickups, session) {
  if (!pickups.length) return `<div class="empty-state">Riwayat pengambilan belum ditemukan. Coba ubah filter atau tambah data baru.</div>`;
  const rows = pickups.map((pickup) => `
    <tr>
      <td>
        <strong>${escapeHtml(pickup.transactionNo)} ${pickup._offline ? `<span class="offline-sync-indicator" title="Disimpan secara lokal, belum disinkronkan">Lokal</span>` : ""}</strong>
        <span>${formatDateId(pickup.date)}</span>
      </td>
      <td><strong>${escapeHtml(pickup.donorName)}</strong><span>${escapeHtml(pickup.donorAddress || "-")}</span></td>
      <td>${formatRupiah(pickup.amount)}</td>
      <td><span class="status-pill active">${escapeHtml(pickup.method)}</span></td>
      <td>${escapeHtml(pickup.officer)}</td>
      <td><span class="status-pill ${getPickupStatusClass(pickup.status)}">${escapeHtml(pickup.status)}</span></td>
      <td><span class="status-pill ${getPickupNotificationClass(pickup.notificationStatus)}">${escapeHtml(getPickupNotificationLabel(pickup.notificationStatus))}</span></td>
      <td>${renderPickupActions(pickup, session)}</td>
    </tr>
  `).join("");
  const cards = pickups.map((pickup) => `
    <article class="pickup-card">
      <div>
        <strong>${escapeHtml(pickup.donorName)} ${pickup._offline ? `<span class="offline-sync-indicator" title="Disimpan secara lokal, belum disinkronkan">Lokal</span>` : ""}</strong>
        <span>${escapeHtml(pickup.transactionNo)} - ${formatDateId(pickup.date)}</span>
      </div>
      <div class="pickup-card-meta">
        <span>${formatRupiah(pickup.amount)}</span><span>${escapeHtml(pickup.method)}</span><span>${escapeHtml(pickup.officer)}</span>
        <span class="status-pill ${getPickupStatusClass(pickup.status)}">${escapeHtml(pickup.status)}</span>
        <span class="status-pill ${getPickupNotificationClass(pickup.notificationStatus)}">${escapeHtml(getPickupNotificationLabel(pickup.notificationStatus))}</span>
      </div>
      <p>${pickup.note ? escapeHtml(pickup.note) : "Tidak ada catatan."}</p>
      ${renderPickupActions(pickup, session)}
    </article>
  `).join("");
  return `
    <div class="table-wrap pickup-table">
      <table>
        <thead><tr><th>No. Transaksi</th><th>Donatur</th><th>Nominal</th><th>Metode</th><th>Petugas</th><th>Status</th><th>Notifikasi</th><th>Aksi</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <div class="pickup-card-list">${cards}</div>
  `;
}

export function normalizeWhatsappNumber(value = "") {
  const digits = String(value).replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  if (digits.startsWith("62")) return digits;
  return digits;
}

export function getWhatsappMessage(pickup) {
  return `Assalamu'alaikum Wr. Wb.

Yth. Bapak/Ibu ${pickup.donorName}

Terima kasih. Koin NU/Infaq atas nama ${pickup.donorName} telah diterima oleh petugas SIKOINNU.

Nomor Transaksi: ${pickup.transactionNo}
Tanggal: ${formatDateId(pickup.date)}
Nominal: ${formatRupiah(pickup.amount)}
Metode: ${pickup.method}
Petugas: ${pickup.officer}
Status: Menunggu Verifikasi Bendahara

Dana akan dikelola melalui LAZISNU/Ranting NU secara amanah, transparan, dan berdampak.

Wassalamu'alaikum Wr. Wb.
SIKOINNU
Sistem Informasi Koin Nahdlatul Ulama`;
}

export function addPickupNotificationHistory(pickup, status, note = "") {
  const timestamp = new Date().toISOString();
  pickup.notificationStatus = status;
  pickup.notificationAt = timestamp;
  pickup.notificationNote = note;
  pickup.notificationHistory = [...(pickup.notificationHistory || []), { status, timestamp, note }];
  syncRowToPostgres("pengambilan_koin", pickup);
}

export function renderPickupNotificationHistory(pickup) {
  const history = pickup.notificationHistory || [];
  return `
    <section class="notification-history">
      <div class="notification-history-heading">
        <div><p class="eyebrow">Riwayat Notifikasi</p><h3>Informasi WhatsApp dan bukti transaksi</h3></div>
        <span class="status-pill ${getPickupNotificationClass(pickup.notificationStatus)}">${escapeHtml(getPickupNotificationLabel(pickup.notificationStatus))}</span>
      </div>
      ${pickup.notificationNote ? `<p class="muted">${escapeHtml(pickup.notificationNote)}</p>` : ""}
      ${history.length ? `
        <div class="notification-history-list">
          ${history.slice().reverse().map((item) => `
            <article>
              <strong>${escapeHtml(getPickupNotificationLabel(item.status))}</strong>
              <span>${formatDateTimeId(item.timestamp)}</span>
              ${item.note ? `<p>${escapeHtml(item.note)}</p>` : ""}
            </article>
          `).join("")}
        </div>
      ` : `<p class="muted">Belum ada aktivitas notifikasi.</p>`}
    </section>
  `;
}

export function printPickupReceipt(pickup) {
  const donor = appState.donors.find((item) => item.id === pickup.donorId) || {};
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("Popup cetak diblokir browser. Izinkan popup lalu coba lagi.");
    return;
  }
  printWindow.opener = null;
  printWindow.document.write(`<!doctype html><html><head><title>Bukti ${escapeHtml(pickup.transactionNo)}</title><style>
    body{font-family:Arial,sans-serif;color:#123d29;margin:24px}.receipt{max-width:560px;margin:auto;border:1px solid #bad7c4;border-radius:12px;padding:20px}.brand{display:flex;align-items:center;gap:10px;border-bottom:2px solid #d8ad45;padding-bottom:12px}.brand img{width:54px}.grid{display:grid;grid-template-columns:160px 1fr;gap:8px;margin-top:18px}.footer{margin-top:20px;color:#587363;font-size:12px}@media print{body{margin:0}.receipt{border:0}}
  </style></head><body><main class="receipt"><div class="brand">${renderLazisnuLogo()}<div><strong>SIKOINNU</strong><br><span>Bukti Pengambilan Koin NU</span></div></div><div class="grid">
    <span>Nomor transaksi</span><strong>${escapeHtml(pickup.transactionNo)}</strong>
    <span>Nama donatur</span><strong>${escapeHtml(pickup.donorName)}</strong>
    <span>Alamat</span><strong>${escapeHtml(donor.address || pickup.donorAddress || "-")}</strong>
    <span>Tanggal</span><strong>${formatDateId(pickup.date)}</strong>
    <span>Nominal</span><strong>${formatRupiah(pickup.amount)}</strong>
    <span>Metode</span><strong>${escapeHtml(pickup.method)}</strong>
    <span>Petugas</span><strong>${escapeHtml(pickup.officer)}</strong>
    <span>Status</span><strong>${escapeHtml(pickup.status)}</strong>
  </div><p class="footer">Dana dikelola melalui LAZISNU/Ranting NU secara amanah, transparan, dan berdampak.</p></main><script>window.onload=()=>window.print()<\/script></body></html>`);
  printWindow.document.close();
  addPickupNotificationHistory(pickup, "cetak_bukti", "Bukti transaksi dicetak.");
  renderPickups();
}

export function renderPickupSuccessModal() {
  const pickup = appState.pickups.find((item) => item.id === appState.pickupSuccessId);
  if (!pickup) return "";
  const donor = appState.donors.find((item) => item.id === pickup.donorId) || {};
  const whatsappNumber = normalizeWhatsappNumber(donor.phone);
  return `
    <div class="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="pickupSuccessTitle">
      <section class="pickup-success-modal">
        <div class="modal-heading"><div><p class="eyebrow">Transaksi Tersimpan</p><h2 id="pickupSuccessTitle">Pengambilan Berhasil</h2></div></div>
        <div class="detail-grid">
          <div><span>Nama donatur</span><strong>${escapeHtml(pickup.donorName)}</strong></div>
          <div><span>Tanggal</span><strong>${formatDateId(pickup.date)}</strong></div>
          <div><span>Nominal</span><strong>${formatRupiah(pickup.amount)}</strong></div>
          <div><span>Metode pembayaran</span><strong>${escapeHtml(pickup.method)}</strong></div>
          <div><span>Petugas</span><strong>${escapeHtml(pickup.officer)}</strong></div>
          <div><span>Nomor transaksi</span><strong>${escapeHtml(pickup.transactionNo)}</strong></div>
          <div class="full"><span>Status verifikasi</span><strong>${escapeHtml(pickup.status)}</strong></div>
          <div class="full"><span>Status notifikasi</span><strong><span class="status-pill ${getPickupNotificationClass(pickup.notificationStatus)}">${escapeHtml(getPickupNotificationLabel(pickup.notificationStatus))}</span></strong></div>
        </div>
        ${whatsappNumber ? "" : `<p class="form-error">Nomor WhatsApp donatur belum tersedia.</p>`}
        <div class="modal-actions pickup-success-actions">
          <button class="primary-button compact" id="sendPickupWhatsappButton" type="button" ${whatsappNumber ? "" : "disabled"}>Kirim WhatsApp</button>
          <button class="ghost-button" id="printPickupReceiptButton" type="button">Cetak Bukti</button>
          ${whatsappNumber ? "" : `<button class="ghost-button" id="manualPickupConfirmationButton" type="button">Tandai Perlu Konfirmasi Manual</button><button class="ghost-button" id="sendPickupToOfficerButton" type="button">Kirim ke Petugas/Pengurus</button>`}
          <button class="ghost-button" data-close-pickup-success type="button">Tutup</button>
        </div>
      </section>
    </div>
  `;
}

let donorQrScanner = null;

export function renderPickupScannerModal() {
  if (!appState.pickupScannerOpen) return "";
  return `
    <div class="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="pickupScannerTitle">
      <section class="qr-scanner-modal">
        <div class="modal-heading">
          <div><p class="eyebrow">Scan QR Donatur</p><h2 id="pickupScannerTitle">Arahkan kamera ke QR donatur</h2></div>
          <button class="close-button" data-close-pickup-scanner type="button" aria-label="Tutup">x</button>
        </div>
        <div id="donorQrReader" class="qr-reader"></div>
        <p class="import-help">Izinkan akses kamera saat diminta. Jika kamera tidak tersedia, masukkan kode donatur secara manual.</p>
        <div class="qr-manual-search">
          <label class="field"><span>Kode donatur</span><input id="manualDonorCode" placeholder="Contoh: DON-001-003-0001" /></label>
          <button class="primary-button compact" id="findDonorByCodeButton" type="button">Cari Donatur</button>
        </div>
        <p class="form-error" id="pickupScannerError" role="alert"></p>
      </section>
    </div>
  `;
}

export function loadQrScannerLibrary() {
  if (window.Html5Qrcode) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector("script[data-html5-qrcode]");
    if (existing) {
      existing.addEventListener("load", resolve, { once: true });
      existing.addEventListener("error", reject, { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = "/vendor/html5-qrcode.min.js";
    script.dataset.html5Qrcode = "true";
    script.onload = resolve;
    script.onerror = () => reject(new Error("Pemindai QR gagal dimuat."));
    document.head.append(script);
  });
}

export function findScannableDonor(value, session) {
  const normalized = String(value || "").trim();
  const donor = appState.donors.map(ensureDonorQr).find((item) => item.qrCodeValue === normalized || item.donorCode === normalized);
  if (!donor) throw new Error("Donatur tidak ditemukan");
  if (session.role === "petugas" && donor.officerEmail !== session.email && donor.officerEmail !== "petugas@rantingnu.id") {
    throw new Error("Donatur berada di luar wilayah tugas Anda.");
  }
  if (!donor.active) throw new Error("Donatur tidak aktif. Periksa data donatur sebelum mencatat pengambilan.");
  return donor;
}

export async function stopDonorQrScanner() {
  if (!donorQrScanner) return;
  try {
    if (donorQrScanner.isScanning) await donorQrScanner.stop();
    await donorQrScanner.clear();
  } catch {
    // Scanner may already be stopped.
  }
  donorQrScanner = null;
}

export async function selectDonorFromQr(value, session) {
  const error = document.querySelector("#pickupScannerError");
  try {
    const donor = findScannableDonor(value, session);
    await stopDonorQrScanner();
    appState.pickupScannerOpen = false;
    appState.pickupPresetDonorId = donor.id;
    openPickupModal("add");
  } catch (scanError) {
    if (error) error.textContent = scanError.message;
  }
}

export async function startDonorQrScanner(session) {
  const error = document.querySelector("#pickupScannerError");
  try {
    await loadQrScannerLibrary();
    donorQrScanner = new window.Html5Qrcode("donorQrReader");
    await donorQrScanner.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: { width: 220, height: 220 } },
      (decodedText) => selectDonorFromQr(decodedText, session),
      () => {}
    );
  } catch {
    if (error) error.textContent = "Kamera tidak tersedia atau izin kamera belum diberikan. Gunakan pencarian kode manual.";
  }
}

export function openPickupScanner(session) {
  appState.pickupScannerOpen = true;
  renderPickups();
  startDonorQrScanner(session);
}

export async function closePickupScanner() {
  await stopDonorQrScanner();
  appState.pickupScannerOpen = false;
  renderPickups();
}

export function renderPickupModal(session) {
  if (!appState.pickupModalMode) return "";
  const pickup = appState.pickups.find((item) => item.id === appState.selectedPickupId);
  const mode = appState.pickupModalMode;
  const isReadonly = mode === "detail";
  const title = mode === "add" ? "Tambah Pengambilan" : mode === "edit" ? "Edit Pengambilan" : mode === "delete" ? "Hapus Pengambilan" : "Detail Pengambilan";

  if (mode === "delete") {
    return `
      <div class="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="pickupModalTitle">
        <section class="confirm-modal">
          <h2 id="pickupModalTitle">${title}</h2>
          <p>Yakin ingin menghapus pengambilan dari <strong>${escapeHtml(pickup?.donorName || "donatur ini")}</strong> sebesar <strong>${formatRupiah(pickup?.amount || 0)}</strong>?</p>
          <div class="modal-actions">
            <button class="ghost-button" data-close-pickup-modal type="button">Batal</button>
            <button class="danger-button" id="confirmPickupDeleteButton" type="button">Hapus</button>
          </div>
        </section>
      </div>
    `;
  }

  const donors = getPickupDonorOptions(session);
  const selectedDonor = donors.find((donor) => donor.id === (appState.pickupPresetDonorId || pickup?.donorId)) || donors[0] || appState.donors[0];
  const defaultOfficer = getDefaultOfficer(session);
  const values = pickup || {
    transactionNo: generateTransactionNo(getLocalDateString()),
    donorId: selectedDonor?.id || "",
    donorName: selectedDonor?.name || "",
    donorAddress: selectedDonor?.address || "",
    date: getLocalDateString(),
    amount: "",
    method: "Tunai",
    status: "Menunggu Verifikasi",
    note: "",
    proofPhotoUrl: "",
    proofPhotoName: "",
    officer: selectedDonor?.officer || defaultOfficer?.name || ""
  };

  return `
    <div class="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="pickupModalTitle">
      <form class="donor-form-modal" id="pickupForm" novalidate>
        <div class="modal-heading">
          <div><p class="eyebrow">Pengambilan Koin</p><h2 id="pickupModalTitle">${title}</h2></div>
          <button class="close-button" data-close-pickup-modal type="button" aria-label="Tutup">x</button>
        </div>
        <div class="form-grid">
          <label class="field"><span>Nomor transaksi otomatis</span><input name="transactionNo" id="pickupTransactionNo" value="${escapeHtml(values.transactionNo)}" readonly /></label>
          <label class="field"><span>Tanggal pengambilan</span><input name="date" id="pickupDateInput" type="date" value="${escapeHtml(values.date)}" ${isReadonly ? "readonly" : ""} required /></label>
          <label class="field full"><span>Nama donatur</span>
            <select name="donorId" id="pickupDonorSelect" ${isReadonly ? "disabled" : ""} required>
              ${donors.map((donor) => `<option value="${donor.id}" ${Number(values.donorId) === donor.id ? "selected" : ""}>${escapeHtml(donor.name)} - RT ${donor.rt}/RW ${donor.rw}</option>`).join("")}
            </select>
          </label>
          <label class="field full"><span>Alamat otomatis</span><input name="donorAddress" id="pickupDonorAddress" value="${escapeHtml(values.donorAddress || "")}" readonly /></label>
          <label class="field"><span>RT/RW otomatis</span><input id="pickupDonorArea" value="RT ${escapeHtml(selectedDonor?.rt || "-")} / RW ${escapeHtml(selectedDonor?.rw || "-")}" readonly /></label>
          <label class="field"><span>Petugas pengambil</span>
            <select name="officer" ${session.role === "petugas" || isReadonly ? "disabled" : ""} required>${renderOfficerOptions(values.officer)}</select>
            ${session.role === "petugas" || isReadonly ? `<input type="hidden" name="officer" value="${escapeHtml(values.officer)}" />` : ""}
          </label>
          <label class="field"><span>Nominal yang diterima</span><input name="amount" type="number" min="0" step="1000" value="${escapeHtml(values.amount)}" ${isReadonly ? "readonly" : ""} required /></label>
          <label class="field"><span>Metode pembayaran</span>
            <select name="method" ${isReadonly ? "disabled" : ""}>
              ${["Tunai", "Transfer", "QRIS"].map((method) => `<option value="${method}" ${values.method === method ? "selected" : ""}>${method}</option>`).join("")}
            </select>
          </label>
          <label class="field"><span>Status transaksi</span>
            <select name="status" ${session.role === "petugas" || isReadonly ? "disabled" : ""}>
              ${["Menunggu Verifikasi", "Disetujui Bendahara", "Ditolak"].map((status) => `<option value="${status}" ${values.status === status ? "selected" : ""}>${status}</option>`).join("")}
            </select>
          </label>
          <label class="field full"><span>Catatan</span><textarea name="note" ${isReadonly ? "readonly" : ""}>${escapeHtml(values.note)}</textarea></label>
          <label class="field full"><span>Bukti pengambilan koin</span>
            ${isReadonly ? "" : `<input name="proofPhoto" id="pickupProofPhoto" type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" />`}
            <small>Opsional. Format JPG, PNG, atau WEBP. Maksimal 2 MB.</small>
          </label>
          <div class="full" id="pickupProofPreview">${renderPhotoPreview(values.proofPhotoUrl, values.proofPhotoName || "Bukti pengambilan koin")}</div>
        </div>
        ${isReadonly ? renderPickupNotificationHistory(values) : ""}
        <p class="form-error" id="pickupFormError" role="alert"></p>
        <div class="modal-actions">
          <button class="ghost-button" data-close-pickup-modal type="button">${isReadonly ? "Tutup" : "Batal"}</button>
          ${isReadonly ? "" : `<button class="primary-button compact" type="submit">${mode === "add" ? "Simpan Pengambilan" : "Simpan Perubahan"}</button>`}
        </div>
      </form>
    </div>
  `;
}

export function renderPickups() {
  const session = getSession();
  if (!session?.role) return navigate("/login");
  const pickups = getVisiblePickups(session);
  const donors = getPickupDonorOptions(session);
  const officers = [...new Set((session.role === "petugas" ? pickups : appState.pickups).map((pickup) => pickup.officer))].sort();

  renderAppShell(session, "Pengambilan Koin", `
    <section class="pickup-hero">
      <div>
        <p class="eyebrow">Operasional Lapangan</p>
        <h2>Catat pengambilan koin dari donatur dengan cepat.</h2>
        <p>${session.role === "petugas" ? "Petugas hanya melihat dan mengelola riwayat pengambilan miliknya." : "Admin dan bendahara dapat memantau seluruh riwayat pengambilan petugas."}</p>
      </div>
      <div class="pickup-hero-actions">
        ${!isReadOnlyRole(session.role) ? `<button class="ghost-button" id="scanDonorQrButton" type="button">Scan QR Donatur</button>` : ""}
        ${canEditPickup(session) ? `<button class="primary-button compact" id="addPickupButton" type="button">Tambah Pengambilan</button>` : ""}
      </div>
    </section>
    <div id="offlineAlertBannerContainer">${renderOfflineAlertBanner()}</div>
    ${renderPickupStats(pickups)}
    <section class="panel pickup-panel">
      <div class="pickup-toolbar">
        <label class="search-field"><span>Cari nama donatur</span><input id="pickupSearch" type="search" value="${escapeHtml(appState.pickupSearch)}" placeholder="Cari donatur" /></label>
        <label><span>Tanggal</span><input id="pickupDate" type="date" value="${escapeHtml(appState.pickupDate)}" /></label>
        <label><span>Donatur</span><select id="pickupDonor"><option value="all">Semua donatur</option>${donors.map((donor) => `<option value="${donor.id}" ${appState.pickupDonor === String(donor.id) ? "selected" : ""}>${escapeHtml(donor.name)}</option>`).join("")}</select></label>
        <label><span>Petugas</span><select id="pickupOfficer"><option value="all">Semua petugas</option>${officers.map((officer) => `<option value="${escapeHtml(officer)}" ${appState.pickupOfficer === officer ? "selected" : ""}>${escapeHtml(officer)}</option>`).join("")}</select></label>
        <label><span>Metode</span><select id="pickupMethod"><option value="all" ${appState.pickupMethod === "all" ? "selected" : ""}>Semua metode</option>${["Tunai", "Transfer", "QRIS"].map((method) => `<option value="${method}" ${appState.pickupMethod === method ? "selected" : ""}>${method}</option>`).join("")}</select></label>
        <label><span>Notifikasi</span>
          <select id="pickupNotificationStatus">
            <option value="all" ${appState.pickupNotificationStatus === "all" ? "selected" : ""}>Semua</option>
            <option value="terkirim_wa" ${appState.pickupNotificationStatus === "terkirim_wa" ? "selected" : ""}>WA Terkirim</option>
            <option value="nomor_kosong" ${appState.pickupNotificationStatus === "nomor_kosong" ? "selected" : ""}>Nomor Kosong</option>
            <option value="konfirmasi_manual" ${appState.pickupNotificationStatus === "konfirmasi_manual" ? "selected" : ""}>Perlu Konfirmasi Manual</option>
            <option value="cetak_bukti" ${appState.pickupNotificationStatus === "cetak_bukti" ? "selected" : ""}>Cetak Bukti</option>
          </select>
        </label>
      </div>
      ${renderPickupTable(pickups, session)}
    </section>
    ${renderPickupModal(session)}
    ${renderPickupScannerModal()}
    ${renderPickupSuccessModal()}
  `);
  bindPickupEvents(session);
}

export function bindPickupEvents(session) {
  document.querySelector("#syncOfflineNowButton")?.addEventListener("click", () => {
    window.dispatchEvent(new CustomEvent("sync-offline"));
  });
  document.querySelector("#addPickupButton")?.addEventListener("click", () => {
    appState.pickupPresetDonorId = null;
    openPickupModal("add");
  });
  document.querySelector("#scanDonorQrButton")?.addEventListener("click", () => openPickupScanner(session));
  document.querySelectorAll("[data-close-pickup-scanner]").forEach((button) => button.addEventListener("click", closePickupScanner));
  document.querySelector("#findDonorByCodeButton")?.addEventListener("click", () => selectDonorFromQr(document.querySelector("#manualDonorCode")?.value, session));

  document.querySelector("#pickupSearch")?.addEventListener("input", debounce((event) => {
    appState.pickupSearch = event.target.value;
    renderPickups();
  }, 250));
  document.querySelector("#pickupDate")?.addEventListener("change", (event) => {
    appState.pickupDate = event.target.value;
    renderPickups();
  });
  document.querySelector("#pickupDonor")?.addEventListener("change", (event) => {
    appState.pickupDonor = event.target.value;
    renderPickups();
  });
  document.querySelector("#pickupOfficer")?.addEventListener("change", (event) => {
    appState.pickupOfficer = event.target.value;
    renderPickups();
  });
  document.querySelector("#pickupMethod")?.addEventListener("change", (event) => {
    appState.pickupMethod = event.target.value;
    renderPickups();
  });
  document.querySelector("#pickupNotificationStatus")?.addEventListener("change", (event) => {
    appState.pickupNotificationStatus = event.target.value;
    renderPickups();
  });
  document.querySelectorAll("[data-close-pickup-success]").forEach((button) => button.addEventListener("click", closePickupSuccessModal));
  document.querySelector("#sendPickupWhatsappButton")?.addEventListener("click", sendPickupWhatsapp);
  document.querySelector("#printPickupReceiptButton")?.addEventListener("click", () => {
    const pickup = appState.pickups.find((item) => item.id === appState.pickupSuccessId);
    if (pickup) printPickupReceipt(pickup);
  });
  document.querySelector("#manualPickupConfirmationButton")?.addEventListener("click", () => updatePickupSuccessNotification("konfirmasi_manual", "Perlu konfirmasi manual karena nomor WhatsApp belum tersedia."));
  document.querySelector("#sendPickupToOfficerButton")?.addEventListener("click", sendPickupToOfficer);

  document.querySelectorAll("[data-pickup-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const id = Number(button.dataset.id);
      const pickup = appState.pickups.find((item) => item.id === id);
      const action = button.dataset.pickupAction;
      if (action === "approve" || action === "reject") {
        updatePickupStatus(id, action === "approve" ? "Disetujui Bendahara" : "Ditolak", session);
        return;
      }
      if (action === "edit" && !canEditPickup(session, pickup)) return;
      if (action === "delete" && !canDeletePickup(session)) return;
      openPickupModal(action, id);
    });
  });
  document.querySelectorAll("[data-close-pickup-modal]").forEach((button) => button.addEventListener("click", closePickupModal));
  document.querySelector("#pickupForm")?.addEventListener("submit", (event) => handlePickupSubmit(event, session));
  bindImagePreview("#pickupProofPhoto", "#pickupProofPreview", "#pickupFormError");
  document.querySelector("#confirmPickupDeleteButton")?.addEventListener("click", handlePickupDelete);

  document.querySelector("#pickupDonorSelect")?.addEventListener("change", (event) => {
    const donor = appState.donors.find((item) => item.id === Number(event.target.value));
    const address = document.querySelector("#pickupDonorAddress");
    if (address) address.value = donor?.address || "";
    const area = document.querySelector("#pickupDonorArea");
    if (area) area.value = `RT ${donor?.rt || "-"} / RW ${donor?.rw || "-"}`;
  });
  document.querySelector("#pickupDateInput")?.addEventListener("change", (event) => {
    if (appState.pickupModalMode !== "add") return;
    const transactionNo = document.querySelector("#pickupTransactionNo");
    if (transactionNo) transactionNo.value = generateTransactionNo(event.target.value);
  });
}

export function openPickupModal(mode, id = null) {
  appState.pickupModalMode = mode;
  appState.selectedPickupId = id;
  renderPickups();
}

export function closePickupModal() {
  appState.pickupModalMode = null;
  appState.selectedPickupId = null;
  appState.pickupPresetDonorId = null;
  renderPickups();
}

export function closePickupSuccessModal() {
  appState.pickupSuccessId = null;
  renderPickups();
}

export function updatePickupSuccessNotification(status, note) {
  const pickup = appState.pickups.find((item) => item.id === appState.pickupSuccessId);
  if (!pickup) return;
  addPickupNotificationHistory(pickup, status, note);
  renderPickups();
}

export function sendPickupWhatsapp() {
  const pickup = appState.pickups.find((item) => item.id === appState.pickupSuccessId);
  const donor = appState.donors.find((item) => item.id === pickup?.donorId);
  const whatsappNumber = normalizeWhatsappNumber(donor?.phone);
  if (!pickup || !whatsappNumber) return;
  addPickupNotificationHistory(pickup, "terkirim_wa", `WhatsApp dibuka untuk ${whatsappNumber}.`);
  window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(getWhatsappMessage(pickup))}`, "_blank", "noopener,noreferrer");
  renderPickups();
}

export function sendPickupToOfficer() {
  const pickup = appState.pickups.find((item) => item.id === appState.pickupSuccessId);
  if (!pickup) return;
  const officer = appState.officers.find((item) => item.name === pickup.officer && item.active);
  const boardMember = appState.boardMembers.find((item) => item.active && normalizeWhatsappNumber(item.phone));
  const recipient = officer && normalizeWhatsappNumber(officer.phone) ? officer : boardMember;
  const whatsappNumber = normalizeWhatsappNumber(recipient?.phone);
  if (!whatsappNumber) {
    alert("Nomor WhatsApp petugas atau pengurus belum tersedia.");
    return;
  }
  const message = `Mohon konfirmasi manual pengambilan Koin NU.

Nomor Transaksi: ${pickup.transactionNo}
Donatur: ${pickup.donorName}
Tanggal: ${formatDateId(pickup.date)}
Nominal: ${formatRupiah(pickup.amount)}

Nomor WhatsApp donatur belum tersedia. Mohon petugas/pengurus melakukan konfirmasi manual.`;
  addPickupNotificationHistory(pickup, "konfirmasi_manual", `Permintaan konfirmasi manual dibuka untuk ${recipient.name}.`);
  window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  renderPickups();
}

export async function handlePickupSubmit(event, session) {
  event.preventDefault();
  const form = event.currentTarget;
  const data = new FormData(form);
  const donorId = Number(data.get("donorId"));
  const donor = appState.donors.find((item) => item.id === donorId);
  const existing = appState.pickups.find((item) => item.id === appState.selectedPickupId);
  const proofPhoto = form.elements.proofPhoto?.files?.[0];
  const photoError = validateImageFile(proofPhoto);
  if (photoError) {
    document.querySelector("#pickupFormError").textContent = photoError;
    return;
  }
  let uploadedPhoto = null;
  try {
    uploadedPhoto = proofPhoto ? await uploadDocumentationPhoto(proofPhoto, "pengambilan") : null;
  } catch (error) {
    document.querySelector("#pickupFormError").textContent = error.message;
    return;
  }
  const payload = {
    transactionNo: String(data.get("transactionNo") || "").trim() || generateTransactionNo(String(data.get("date") || getLocalDateString())),
    donorId,
    donorName: donor?.name || "",
    donorAddress: donor?.address || "",
    date: String(data.get("date") || ""),
    amount: Number(data.get("amount") || 0),
    method: String(data.get("method") || "Tunai"),
    status: session.role === "petugas" ? (existing?.status || "Menunggu Verifikasi") : String(data.get("status") || "Menunggu Verifikasi"),
    note: String(data.get("note") || "").trim(),
    officer: String(data.get("officer") || existing?.officer || getDefaultOfficer(session)?.name || "").trim(),
    officerEmail: resolveOfficerEmail(String(data.get("officer") || existing?.officer || "").trim(), session.role === "petugas" ? session.email : existing?.officerEmail || "petugas@rantingnu.id"),
    proofPhotoPath: uploadedPhoto?.path || existing?.proofPhotoPath || "",
    proofPhotoUrl: uploadedPhoto?.url || existing?.proofPhotoUrl || "",
    proofPhotoName: uploadedPhoto?.name || existing?.proofPhotoName || ""
  };
  if (!payload.donorId || !payload.date || !payload.officer || payload.amount <= 0) {
    document.querySelector("#pickupFormError").textContent = "Pilih donatur, tanggal, petugas, and nominal yang valid.";
    return;
  }
  const isNewPickup = appState.pickupModalMode !== "edit";
  let savedPickupId = appState.selectedPickupId;
  let targetPickup = null;
  if (!isNewPickup) {
    appState.pickups = appState.pickups.map((pickup) => {
      if (pickup.id === appState.selectedPickupId) {
        targetPickup = { ...pickup, ...payload };
        return targetPickup;
      }
      return pickup;
    });
  } else {
    savedPickupId = Date.now();
    const notificationStatus = normalizeWhatsappNumber(donor?.phone) ? "belum_dikirim" : "nomor_kosong";
    targetPickup = {
      id: savedPickupId,
      ...payload,
      notificationStatus,
      notificationAt: notificationStatus === "nomor_kosong" ? new Date().toISOString() : "",
      notificationNote: notificationStatus === "nomor_kosong" ? "Nomor WhatsApp donatur belum tersedia." : "",
      notificationHistory: notificationStatus === "nomor_kosong" ? [{ status: "nomor_kosong", timestamp: new Date().toISOString(), note: "Nomor WhatsApp donatur belum tersedia." }] : []
    };
    appState.pickups = [targetPickup, ...appState.pickups];
  }
  const ok = await wrapFormSubmit(event, () => syncRowToPostgres("pengambilan_koin", targetPickup));
  if (ok) {
    appState.pickupModalMode = null;
    appState.selectedPickupId = null;
    appState.pickupPresetDonorId = null;
    appState.pickupSuccessId = isNewPickup ? savedPickupId : null;
    renderPickups();
  }
}

export async function handlePickupDelete() {
  if (!await deleteRowFromPostgres("pengambilan_koin", appState.selectedPickupId)) return;
  appState.pickups = appState.pickups.filter((pickup) => pickup.id !== appState.selectedPickupId);
  closePickupModal();
}

export function updatePickupStatus(id, status, session) {
  const audit = {
    treasurer: session?.role === "admin" ? "Admin Demo" : "Bendahara Demo",
    verifiedAt: getLocalDateString(),
    status,
    note: status === "Ditolak" ? "Ditolak dari daftar pengambilan." : "Disetujui dari daftar pengambilan."
  };
  let targetPickup = null;
  appState.pickups = appState.pickups.map((pickup) => {
    if (pickup.id === id) {
      targetPickup = { ...pickup, status, verificationAudit: [...(pickup.verificationAudit || []), audit] };
      return targetPickup;
    }
    return pickup;
  });
  syncRowToPostgres("pengambilan_koin", targetPickup);
  renderPickups();
}

// === 3. VERIFICATION ===
export function canVerifyTransactions(session) {
  return session.role === "bendahara" || session.role === "admin";
}

export function getPickupDonor(pickup) {
  return appState.donors.find((donor) => donor.id === pickup.donorId) || {};
}

export function getVerificationBasePickups(session) {
  if (session.role === "petugas") {
    return appState.pickups.filter((pickup) => pickup.officerEmail === session.email || pickup.officerEmail === "petugas@rantingnu.id");
  }
  return [...appState.pickups];
}

export function getVisibleVerifications(session) {
  let pickups = getVerificationBasePickups(session);
  if (appState.verificationTab !== "all") {
    pickups = pickups.filter((pickup) => pickup.status === appState.verificationTab);
  }
  const search = appState.verificationSearch.trim().toLowerCase();
  if (search) {
    pickups = pickups.filter((pickup) => pickup.donorName.toLowerCase().includes(search));
  }
  if (appState.verificationDate) {
    pickups = pickups.filter((pickup) => pickup.date === appState.verificationDate);
  }
  if (appState.verificationOfficer !== "all") {
    pickups = pickups.filter((pickup) => pickup.officer === appState.verificationOfficer);
  }
  if (appState.verificationMethod !== "all") {
    pickups = pickups.filter((pickup) => pickup.method === appState.verificationMethod);
  }
  return pickups.sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
}

export function renderVerificationStats(session) {
  const pickups = getVerificationBasePickups(session);
  const month = getLocalDateString().slice(0, 7);
  const approvedThisMonth = pickups.filter((pickup) => pickup.status === "Disetujui Bendahara" && pickup.date.startsWith(month));
  const rejectedThisMonth = pickups.filter((pickup) => pickup.status === "Ditolak" && pickup.date.startsWith(month));
  const verifiedTotal = approvedThisMonth.reduce((sum, pickup) => sum + pickup.amount, 0);
  return `
    <section class="verification-stats">
      <article><span>Menunggu verifikasi</span><strong>${pickups.filter((pickup) => pickup.status === "Menunggu Verifikasi").length}</strong></article>
      <article><span>Disetujui bulan ini</span><strong>${approvedThisMonth.length}</strong></article>
      <article><span>Ditolak bulan ini</span><strong>${rejectedThisMonth.length}</strong></article>
      <article><span>Nominal terverifikasi</span><strong>${formatRupiah(verifiedTotal)}</strong></article>
    </section>
  `;
}

export function renderVerificationTabs(session) {
  const pickups = getVerificationBasePickups(session);
  const tabs = [
    { label: "Menunggu", value: "Menunggu Verifikasi" },
    { label: "Disetujui", value: "Disetujui Bendahara" },
    { label: "Ditolak", value: "Ditolak" },
    { label: "Revisi", value: "Perlu Revisi" }
  ];
  return `
    <div class="verification-tabs" role="tablist" aria-label="Status verifikasi">
      ${tabs.map((tab) => `
        <button class="${appState.verificationTab === tab.value ? "active" : ""}" data-verification-tab="${tab.value}" type="button">
          <span>${tab.label}</span>
          <strong>${pickups.filter((pickup) => pickup.status === tab.value).length}</strong>
        </button>
      `).join("")}
    </div>
  `;
}

export function renderVerificationActions(pickup, session) {
  if (!canVerifyTransactions(session) || pickup.status !== "Menunggu Verifikasi") {
    return `<button class="icon-button soft" data-verification-action="detail" data-id="${pickup.id}" type="button">Detail</button>`;
  }
  return `
    <div class="row-actions">
      <button class="icon-button soft" data-verification-action="detail" data-id="${pickup.id}" type="button">Detail</button>
      <button class="icon-button approve" data-verification-action="approve" data-id="${pickup.id}" type="button">Setujui</button>
      <button class="icon-button warning" data-verification-action="revise" data-id="${pickup.id}" type="button">Revisi</button>
      <button class="icon-button danger" data-verification-action="reject" data-id="${pickup.id}" type="button">Tolak</button>
    </div>
  `;
}

export function renderVerificationList(pickups, session) {
  if (!pickups.length) return `<div class="empty-state">Tidak ada transaksi pada tab dan filter ini.</div>`;
  const rows = pickups.map((pickup) => {
    const donor = getPickupDonor(pickup);
    return `
      <tr class="clickable-row" data-verification-action="detail" data-id="${pickup.id}">
        <td><strong>${escapeHtml(pickup.transactionNo)}</strong><span>${formatDateId(pickup.date)}</span></td>
        <td><strong>${escapeHtml(pickup.donorName)}</strong><span>RT ${escapeHtml(donor.rt || "-")} / RW ${escapeHtml(donor.rw || "-")}</span></td>
        <td>${escapeHtml(pickup.officer)}</td>
        <td>${formatRupiah(pickup.amount)}</td>
        <td><span class="status-pill active">${escapeHtml(pickup.method)}</span></td>
        <td><span class="status-pill ${getPickupStatusClass(pickup.status)}">${escapeHtml(pickup.status)}</span></td>
        <td onclick="event.stopPropagation()">${renderVerificationActions(pickup, session)}</td>
      </tr>
    `;
  }).join("");
  const cards = pickups.map((pickup) => {
    const donor = getPickupDonor(pickup);
    return `
      <article class="verification-card" data-verification-action="detail" data-id="${pickup.id}">
        <div><strong>${escapeHtml(pickup.donorName)}</strong><span>${escapeHtml(pickup.transactionNo)} - ${formatDateId(pickup.date)}</span></div>
        <div class="pickup-card-meta">
          <span>${formatRupiah(pickup.amount)}</span><span>${escapeHtml(pickup.method)}</span><span>RT ${escapeHtml(donor.rt || "-")}/RW ${escapeHtml(donor.rw || "-")}</span>
          <span class="status-pill ${getPickupStatusClass(pickup.status)}">${escapeHtml(pickup.status)}</span>
        </div>
        <p>${escapeHtml(pickup.officer)} - ${pickup.note ? escapeHtml(pickup.note) : "Tidak ada catatan."}</p>
        <div onclick="event.stopPropagation()">${renderVerificationActions(pickup, session)}</div>
      </article>
    `;
  }).join("");
  return `
    <div class="table-wrap verification-table">
      <table>
        <thead><tr><th>No. Transaksi</th><th>Donatur</th><th>Petugas</th><th>Nominal</th><th>Metode</th><th>Status</th><th>Aksi</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <div class="verification-card-list">${cards}</div>
  `;
}

export function renderVerificationDetailModal(session) {
  const pickup = appState.pickups.find((item) => item.id === appState.selectedVerificationId);
  if (!pickup) return "";
  const donor = getPickupDonor(pickup);
  const auditItems = pickup.verificationAudit?.length ? pickup.verificationAudit : [];
  const actionForm = appState.verificationAction && appState.verificationAction !== "detail";
  const actionTitle = appState.verificationAction === "approve" ? "Setujui transaksi" : appState.verificationAction === "reject" ? "Tolak transaksi" : "Kembalikan untuk revisi";

  return `
    <div class="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="verificationModalTitle">
      <section class="verification-modal">
        <div class="modal-heading">
          <div><p class="eyebrow">Detail Transaksi</p><h2 id="verificationModalTitle">${escapeHtml(pickup.transactionNo)}</h2></div>
          <button class="close-button" data-close-verification-modal type="button" aria-label="Tutup">x</button>
        </div>
        <div class="detail-grid">
          <div><span>Tanggal</span><strong>${formatDateId(pickup.date)}</strong></div>
          <div><span>Nama donatur</span><strong>${escapeHtml(pickup.donorName)}</strong></div>
          <div class="full"><span>Alamat</span><strong>${escapeHtml(pickup.donorAddress || donor.address || "-")}</strong></div>
          <div><span>RT/RW</span><strong>RT ${escapeHtml(donor.rt || "-")} / RW ${escapeHtml(donor.rw || "-")}</strong></div>
          <div><span>Petugas</span><strong>${escapeHtml(pickup.officer)}</strong></div>
          <div><span>Nominal</span><strong>${formatRupiah(pickup.amount)}</strong></div>
          <div><span>Metode</span><strong>${escapeHtml(pickup.method)}</strong></div>
          <div class="full"><span>Catatan petugas</span><strong>${pickup.note ? escapeHtml(pickup.note) : "-"}</strong></div>
          <div class="full"><span>Status transaksi</span><strong><span class="status-pill ${getPickupStatusClass(pickup.status)}">${escapeHtml(pickup.status)}</span></strong></div>
        </div>
        <section class="evidence-panel">
          <h3>Bukti Pengambilan Koin</h3>
          ${renderPhotoPreview(pickup.proofPhotoUrl, pickup.proofPhotoName || "Bukti pengambilan koin")}
        </section>
        ${renderPickupNotificationHistory(pickup)}
        <section class="audit-panel">
          <h3>Catatan Audit</h3>
          ${auditItems.length ? auditItems.map((audit) => `
            <article>
              <strong>${escapeHtml(audit.status)}</strong><span>${escapeHtml(audit.treasurer)} - ${formatDateId(audit.verifiedAt)}</span>
              <p>${escapeHtml(audit.note)}</p>
              ${audit.depositPhotoUrl ? renderPhotoPreview(audit.depositPhotoUrl, audit.depositPhotoName || "Bukti setoran bendahara") : ""}
            </article>
          `).join("") : `<p>Belum ada catatan verifikasi.</p>`}
        </section>
        ${actionForm ? `
          <form class="verification-note-form" id="verificationNoteForm">
            <h3>${actionTitle}</h3>
            <label class="field">
              <span>Catatan bendahara${appState.verificationAction === "approve" ? "" : " wajib"}</span>
              <textarea name="treasurerNote" placeholder="Tulis catatan hasil verifikasi"></textarea>
            </label>
            <label class="field">
              <span>Bukti setoran bendahara</span>
              <input name="depositPhoto" id="verificationDepositPhoto" type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" />
              <small>Opsional. Format JPG, PNG, atau WEBP. Maksimal 2 MB.</small>
            </label>
            <div id="verificationDepositPreview">${renderPhotoPreview("", "Bukti setoran bendahara")}</div>
            <p class="form-error" id="verificationFormError" role="alert"></p>
            <div class="modal-actions">
              <button class="ghost-button" data-cancel-verification-action type="button">Batal</button>
              <button class="primary-button compact" type="submit">Simpan Verifikasi</button>
            </div>
          </form>
        ` : `
          <div class="modal-actions">
            <button class="ghost-button" data-close-verification-modal type="button">Tutup</button>
            ${canVerifyTransactions(session) && pickup.status === "Menunggu Verifikasi" ? `
              <button class="icon-button approve" data-verification-action="approve" data-id="${pickup.id}" type="button">Setujui</button>
              <button class="icon-button warning" data-verification-action="revise" data-id="${pickup.id}" type="button">Kembalikan untuk Revisi</button>
              <button class="danger-button" data-verification-action="reject" data-id="${pickup.id}" type="button">Tolak</button>
            ` : ""}
          </div>
        `}
      </section>
    </div>
  `;
}

export function renderVerification() {
  const session = getSession();
  if (!session?.role) return navigate("/login");
  const pickups = getVisibleVerifications(session);
  const basePickups = getVerificationBasePickups(session);
  const officers = [...new Set(basePickups.map((pickup) => pickup.officer))].sort();

  renderAppShell(session, "Verifikasi", `
    <section class="verification-hero">
      <div>
        <p class="eyebrow">Bendahara Ranting</p>
        <h2>Periksa transaksi pengambilan sebelum masuk laporan resmi.</h2>
        <p>${canVerifyTransactions(session) ? "Setujui, tolak, atau kembalikan transaksi kepada petugas dengan catatan audit yang rapi." : "Petugas dapat memantau status transaksi miliknya tanpa akses verifikasi."}</p>
      </div>
    </section>
    ${renderVerificationStats(session)}
    <section class="panel verification-panel">
      ${renderVerificationTabs(session)}
      <div class="verification-toolbar">
        <label class="search-field"><span>Cari nama donatur</span><input id="verificationSearch" type="search" value="${escapeHtml(appState.verificationSearch)}" placeholder="Cari donatur" /></label>
        <label><span>Tanggal</span><input id="verificationDate" type="date" value="${escapeHtml(appState.verificationDate)}" /></label>
        <label><span>Petugas</span><select id="verificationOfficer"><option value="all">Semua petugas</option>${officers.map((officer) => `<option value="${escapeHtml(officer)}" ${appState.verificationOfficer === officer ? "selected" : ""}>${escapeHtml(officer)}</option>`).join("")}</select></label>
        <label><span>Metode</span><select id="verificationMethod"><option value="all">Semua metode</option>${["Tunai", "Transfer", "QRIS"].map((method) => `<option value="${method}" ${appState.verificationMethod === method ? "selected" : ""}>${method}</option>`).join("")}</select></label>
      </div>
      ${renderVerificationList(pickups, session)}
    </section>
    ${renderVerificationDetailModal(session)}
  `);
  bindVerificationEvents(session);
}

export function bindVerificationEvents(session) {
  document.querySelectorAll("[data-verification-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      appState.verificationTab = button.dataset.verificationTab;
      renderVerification();
    });
  });
  document.querySelector("#verificationSearch")?.addEventListener("input", debounce((event) => {
    appState.verificationSearch = event.target.value;
    renderVerification();
  }, 250));
  document.querySelector("#verificationDate")?.addEventListener("change", (event) => {
    appState.verificationDate = event.target.value;
    renderVerification();
  });
  document.querySelector("#verificationOfficer")?.addEventListener("change", (event) => {
    appState.verificationOfficer = event.target.value;
    renderVerification();
  });
  document.querySelector("#verificationMethod")?.addEventListener("change", (event) => {
    appState.verificationMethod = event.target.value;
    renderVerification();
  });
  document.querySelectorAll("[data-verification-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const id = Number(button.dataset.id);
      const action = button.dataset.verificationAction;
      if (action !== "detail" && !canVerifyTransactions(session)) return;
      appState.selectedVerificationId = id;
      appState.verificationAction = action;
      renderVerification();
    });
  });
  document.querySelectorAll("[data-close-verification-modal]").forEach((button) => button.addEventListener("click", closeVerificationModal));
  document.querySelector("[data-cancel-verification-action]")?.addEventListener("click", () => {
    appState.verificationAction = "detail";
    renderVerification();
  });
  document.querySelector("#verificationNoteForm")?.addEventListener("submit", (event) => handleVerificationSubmit(event, session));
  bindImagePreview("#verificationDepositPhoto", "#verificationDepositPreview", "#verificationFormError");
}

export function closeVerificationModal() {
  appState.selectedVerificationId = null;
  appState.verificationAction = null;
  renderVerification();
}

export async function handleVerificationSubmit(event, session) {
  event.preventDefault();
  const form = event.currentTarget;
  const note = String(new FormData(form).get("treasurerNote") || "").trim();
  if ((appState.verificationAction === "reject" || appState.verificationAction === "revise") && !note) {
    document.querySelector("#verificationFormError").textContent = "Catatan bendahara wajib diisi.";
    return;
  }
  const statusMap = { approve: "Disetujui Bendahara", reject: "Ditolak", revise: "Perlu Revisi" };
  const nextStatus = statusMap[appState.verificationAction];
  const depositPhoto = form.elements.depositPhoto?.files?.[0];
  const photoError = validateImageFile(depositPhoto);
  if (photoError) {
    document.querySelector("#verificationFormError").textContent = photoError;
    return;
  }
  let uploadedPhoto = null;
  try {
    uploadedPhoto = depositPhoto ? await uploadDocumentationPhoto(depositPhoto, "setoran-bendahara") : null;
  } catch (error) {
    document.querySelector("#verificationFormError").textContent = error.message;
    return;
  }
  const audit = {
    treasurer: session.role === "admin" ? "Admin Demo" : "Bendahara Demo",
    verifiedAt: getLocalDateString(),
    status: nextStatus,
    note: note || "Disetujui setelah pengecekan bendahara.",
    depositPhotoPath: uploadedPhoto?.path || "",
    depositPhotoUrl: uploadedPhoto?.url || "",
    depositPhotoName: uploadedPhoto?.name || ""
  };
  appState.pickups = appState.pickups.map((pickup) => pickup.id === appState.selectedVerificationId ? {
    ...pickup,
    status: nextStatus,
    verificationAudit: [...(pickup.verificationAudit || []), audit]
  } : pickup);
  const updatedPickup = appState.pickups.find((p) => p.id === appState.selectedVerificationId);
  const ok = await wrapFormSubmit(event, async () => {
    let success = true;
    if (updatedPickup) success = await syncRowToPostgres("pengambilan_koin", updatedPickup);
    if (success) success = await syncVerificationAuditToPostgres(appState.selectedVerificationId, audit, session);
    return success;
  });
  if (ok) {
    appState.verificationTab = nextStatus;
    closeVerificationModal();
  }
}

// === 4. REPORTS & CASH SUMMARY ===
export function getReportBasePickups(session) {
  if (session.role === "petugas") {
    return appState.pickups.filter((pickup) => pickup.officerEmail === session.email || pickup.officerEmail === "petugas@rantingnu.id");
  }
  return [...appState.pickups];
}

export function enrichReportPickup(pickup) {
  const donor = getPickupDonor(pickup);
  return {
    ...pickup,
    rt: donor.rt || "-",
    rw: donor.rw || "-",
    donorAddress: pickup.donorAddress || donor.address || "-"
  };
}

export function getVisibleReportPickups(session) {
  return getReportBasePickups(session)
    .map(enrichReportPickup)
    .filter((pickup) => {
      const [year, month] = pickup.date.split("-");
      return appState.reportMonth === month &&
        appState.reportYear === year &&
        (appState.reportRt === "all" || pickup.rt === appState.reportRt) &&
        (appState.reportRw === "all" || pickup.rw === appState.reportRw) &&
        (appState.reportOfficer === "all" || pickup.officer === appState.reportOfficer) &&
        (appState.reportStatus === "all" || pickup.status === appState.reportStatus) &&
        (appState.reportMethod === "all" || pickup.method === appState.reportMethod);
    })
    .sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
}

export function groupReportBy(items, getKey) {
  const groups = new Map();
  items.forEach((item) => {
    const key = getKey(item);
    const current = groups.get(key) || { key, count: 0, amount: 0 };
    current.count += 1;
    current.amount += item.amount;
    groups.set(key, current);
  });
  return [...groups.values()].sort((a, b) => b.amount - a.amount || a.key.localeCompare(b.key));
}

export function getReportPeriodLabel() {
  const date = new Date(`${appState.reportYear}-${appState.reportMonth}-01T00:00:00`);
  return new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(date);
}

export function renderReportSummary(pickups, session) {
  const activeDonorIds = new Set(appState.donors.filter((donor) => {
    if (!donor.active) {
      return false;
    }
    if (session.role !== "petugas") {
      return true;
    }
    return donor.officerEmail === session.email || donor.officerEmail === "petugas@rantingnu.id";
  }).map((donor) => donor.id));
  const totalIncome = pickups
    .filter((pickup) => pickup.status === "Disetujui Bendahara")
    .reduce((sum, pickup) => sum + pickup.amount, 0);
  const waiting = pickups.filter((pickup) => pickup.status === "Menunggu Verifikasi").length;
  const approved = pickups.filter((pickup) => pickup.status === "Disetujui Bendahara").length;
  const rejected = pickups.filter((pickup) => pickup.status === "Ditolak").length;
  const totalDistribution = appState.distributions
    .filter((item) => item.status === "Disalurkan" && item.date.startsWith(`${appState.reportYear}-${appState.reportMonth}`))
    .reduce((sum, item) => sum + item.amount, 0);
  const officerDepositTotal = appState.officerDeposits
    .filter((item) => item.status === "Diterima Bendahara" && item.date.startsWith(`${appState.reportYear}-${appState.reportMonth}`))
    .reduce((sum, item) => sum + item.amount, 0);
  const lazisnuDepositTotal = appState.lazisnuDeposits
    .filter((item) => item.status === "Sudah Disetor" && item.date.startsWith(`${appState.reportYear}-${appState.reportMonth}`))
    .reduce((sum, item) => sum + item.amount, 0);

  return `
    <section class="report-summary">
      <article><span>Pemasukan pengambilan koin</span><strong>${formatRupiah(totalIncome)}</strong></article>
      <article><span>Setoran petugas ke bendahara</span><strong>${formatRupiah(officerDepositTotal)}</strong></article>
      <article><span>Setoran ke LAZISNU</span><strong>${formatRupiah(lazisnuDepositTotal)}</strong></article>
      <article><span>Penyaluran dana</span><strong>${formatRupiah(totalDistribution)}</strong></article>
      <article><span>Saldo akhir kas ranting</span><strong>${formatRupiah(officerDepositTotal - lazisnuDepositTotal - totalDistribution)}</strong></article>
      <article><span>Total transaksi</span><strong>${pickups.length}</strong></article>
      <article><span>Donatur aktif</span><strong>${activeDonorIds.size}</strong></article>
      <article><span>Menunggu verifikasi</span><strong>${waiting}</strong></article>
      <article><span>Total disetujui</span><strong>${approved}</strong></article>
      <article><span>Total ditolak</span><strong>${rejected}</strong></article>
    </section>
  `;
}

export function renderReportRecap(title, groups) {
  return `
    <article class="recap-panel">
      <h3>${title}</h3>
      ${groups.length ? groups.map((group) => `
        <div>
          <span>${escapeHtml(group.key)}</span>
          <strong>${formatRupiah(group.amount)}</strong>
          <small>${group.count} transaksi</small>
        </div>
      `).join("") : `<p>Belum ada data.</p>`}
    </article>
  `;
}

export function renderReportTable(pickups) {
  if (!pickups.length) {
    return `<div class="empty-state">Data laporan tidak ditemukan untuk filter ini.</div>`;
  }

  const rows = pickups.map((pickup) => `
    <tr>
      <td>${formatDateId(pickup.date)}</td>
      <td>${escapeHtml(pickup.transactionNo)}</td>
      <td>${escapeHtml(pickup.donorName)}</td>
      <td>RT ${escapeHtml(pickup.rt)} / RW ${escapeHtml(pickup.rw)}</td>
      <td>${escapeHtml(pickup.officer)}</td>
      <td>${formatRupiah(pickup.amount)}</td>
      <td>${escapeHtml(pickup.method)}</td>
      <td><span class="status-pill ${getPickupStatusClass(pickup.status)}">${escapeHtml(pickup.status)}</span></td>
    </tr>
  `).join("");

  const cards = pickups.map((pickup) => `
    <article class="report-card">
      <div>
        <strong>${escapeHtml(pickup.donorName)}</strong>
        <span>${escapeHtml(pickup.transactionNo)} - ${formatDateId(pickup.date)}</span>
      </div>
      <div class="pickup-card-meta">
        <span>${formatRupiah(pickup.amount)}</span>
        <span>RT ${escapeHtml(pickup.rt)}/RW ${escapeHtml(pickup.rw)}</span>
        <span>${escapeHtml(pickup.officer)}</span>
        <span>${escapeHtml(pickup.method)}</span>
        <span class="status-pill ${getPickupStatusClass(pickup.status)}">${escapeHtml(pickup.status)}</span>
      </div>
    </article>
  `).join("");

  return `
    <div class="table-wrap report-table">
      <table>
        <thead>
          <tr>
            <th>Tanggal</th>
            <th>No. Transaksi</th>
            <th>Nama Donatur</th>
            <th>RT/RW</th>
            <th>Petugas</th>
            <th>Nominal</th>
            <th>Metode</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <div class="report-card-list">${cards}</div>
  `;
}

export function renderPrintReport(pickups) {
  const printDate = new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  }).format(new Date());
  const totalApproved = pickups
    .filter((pickup) => pickup.status === "Disetujui Bendahara")
    .reduce((sum, pickup) => sum + pickup.amount, 0);
  const cash = getCashSummary();

  return `
    <section class="print-report" aria-label="Format cetak laporan">
      <header>
        ${renderLazisnuLogo("print-logo")}
        <h1>Laporan ${brand.name}</h1>
        <p>${brand.subtitle}</p>
        <strong>${brand.tagline}</strong>
        <p>Periode laporan: ${getReportPeriodLabel()}</p>
        <p>Tanggal cetak: ${printDate}</p>
      </header>
      <div class="print-summary">
        <span>Pemasukan pengambilan koin: ${formatRupiah(totalApproved)}</span>
        <span>Setoran petugas ke bendahara: ${formatRupiah(cash.collected)}</span>
        <span>Setoran ke LAZISNU: ${formatRupiah(cash.sentToLazisnu)}</span>
        <span>Penyaluran dana: ${formatRupiah(appState.distributions.filter((item) => item.status === "Disalurkan").reduce((sum, item) => sum + item.amount, 0))}</span>
        <span>Saldo akhir kas ranting: ${formatRupiah(cash.cashBalance)}</span>
      </div>
      ${renderReportTable(pickups)}
      <footer class="signature-grid">
        <div>
          <span>Ketua Ranting</span>
          <strong>( ................................ )</strong>
        </div>
        <div>
          <span>Bendahara</span>
          <strong>( ................................ )</strong>
        </div>
      </footer>
      ${renderBrandFooter("print-footer")}
    </section>
  `;
}

export function renderReports() {
  const session = getSession();
  if (!session?.role) {
    navigate("/login");
    return;
  }

  const pickups = getVisibleReportPickups(session);
  const base = getReportBasePickups(session).map(enrichReportPickup);
  const rtOptions = [...new Set(base.map((pickup) => pickup.rt))].sort();
  const rwOptions = [...new Set(base.map((pickup) => pickup.rw))].sort();
  const officerOptions = [...new Set(base.map((pickup) => pickup.officer))].sort();
  const years = [...new Set(base.map((pickup) => pickup.date.slice(0, 4)))].sort((a, b) => b.localeCompare(a));
  const rtGroups = groupReportBy(pickups, (pickup) => `RT ${pickup.rt} / RW ${pickup.rw}`);
  const officerGroups = groupReportBy(pickups, (pickup) => pickup.officer);
  const methodGroups = groupReportBy(pickups, (pickup) => pickup.method);

  renderAppShell(session, "Laporan", `
    <section class="report-hero">
      <div>
        <p class="eyebrow">Rekap Ranting</p>
        <h2>Laporan pemasukan dan status transaksi ${brand.name}.</h2>
        <p>${session.role === "petugas" ? "Petugas hanya melihat laporan transaksi miliknya." : "Admin dan bendahara dapat melihat seluruh laporan transaksi ranting."}</p>
      </div>
      <div class="report-actions">
        <button class="ghost-button" id="exportExcelButton" type="button">Export Excel</button>
        <button class="primary-button compact" id="printReportButton" type="button">Print laporan</button>
      </div>
    </section>

    <section class="panel report-filter-panel">
      <div class="report-toolbar">
        <label>
          <span>Bulan</span>
          <select id="reportMonth">
            ${Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, "0")).map((month) => `<option value="${month}" ${appState.reportMonth === month ? "selected" : ""}>${new Intl.DateTimeFormat("id-ID", { month: "long" }).format(new Date(`2026-${month}-01T00:00:00`))}</option>`).join("")}
          </select>
        </label>
        <label>
          <span>Tahun</span>
          <select id="reportYear">
            ${years.map((year) => `<option value="${year}" ${appState.reportYear === year ? "selected" : ""}>${year}</option>`).join("")}
          </select>
        </label>
        <label>
          <span>RT</span>
          <select id="reportRt">
            <option value="all">Semua RT</option>
            ${rtOptions.map((rt) => `<option value="${escapeHtml(rt)}" ${appState.reportRt === rt ? "selected" : ""}>RT ${escapeHtml(rt)}</option>`).join("")}
          </select>
        </label>
        <label>
          <span>RW</span>
          <select id="reportRw">
            <option value="all">Semua RW</option>
            ${rwOptions.map((rw) => `<option value="${escapeHtml(rw)}" ${appState.reportRw === rw ? "selected" : ""}>RW ${escapeHtml(rw)}</option>`).join("")}
          </select>
        </label>
        <label>
          <span>Petugas</span>
          <select id="reportOfficer">
            <option value="all">Semua petugas</option>
            ${officerOptions.map((officer) => `<option value="${escapeHtml(officer)}" ${appState.reportOfficer === officer ? "selected" : ""}>${escapeHtml(officer)}</option>`).join("")}
          </select>
        </label>
        <label>
          <span>Status</span>
          <select id="reportStatus">
            <option value="all">Semua status</option>
            ${["Menunggu Verifikasi", "Disetujui Bendahara", "Ditolak", "Perlu Revisi"].map((status) => `<option value="${status}" ${appState.reportStatus === status ? "selected" : ""}>${status}</option>`).join("")}
          </select>
        </label>
        <label>
          <span>Metode</span>
          <select id="reportMethod">
            <option value="all">Semua metode</option>
            ${["Tunai", "Transfer", "QRIS"].map((method) => `<option value="${method}" ${appState.reportMethod === method ? "selected" : ""}>${method}</option>`).join("")}
          </select>
        </label>
      </div>
    </section>

    ${renderReportSummary(pickups, session)}

    <section class="report-grid">
      ${renderReportRecap("Rekap per RT/RW", rtGroups)}
      ${renderReportRecap("Rekap per Petugas", officerGroups)}
      ${renderReportRecap("Rekap per Metode", methodGroups)}
    </section>

    <section class="panel report-detail-panel">
      <div class="panel-heading">
        <div>
          <p class="eyebrow">Detail Laporan</p>
          <h2>${getReportPeriodLabel()}</h2>
        </div>
        <span>${pickups.length} transaksi</span>
      </div>
      ${renderReportTable(pickups)}
    </section>

    ${renderPrintReport(pickups)}
  `);

  bindReportEvents(session);
}

export function bindReportEvents(session) {
  [
    ["#reportMonth", "reportMonth"],
    ["#reportYear", "reportYear"],
    ["#reportRt", "reportRt"],
    ["#reportRw", "reportRw"],
    ["#reportOfficer", "reportOfficer"],
    ["#reportStatus", "reportStatus"],
    ["#reportMethod", "reportMethod"]
  ].forEach(([selector, key]) => {
    document.querySelector(selector)?.addEventListener("change", (event) => {
      appState[key] = event.target.value;
      renderReports();
    });
  });

  document.querySelector("#exportExcelButton")?.addEventListener("click", () => exportReportExcel(session));
  document.querySelector("#printReportButton")?.addEventListener("click", () => window.print());
}

export function exportReportExcel(session) {
  const pickups = getVisibleReportPickups(session);
  const header = ["Tanggal", "Nomor Transaksi", "Nama Donatur", "RT/RW", "Petugas", "Nominal", "Metode Pembayaran", "Status"];
  const approvedTotal = pickups
    .filter((pickup) => pickup.status === "Disetujui Bendahara")
    .reduce((sum, pickup) => sum + pickup.amount, 0);
  const distributionTotal = appState.distributions
    .filter((item) => item.status === "Disalurkan" && item.date.startsWith(`${appState.reportYear}-${appState.reportMonth}`))
    .reduce((sum, item) => sum + item.amount, 0);
  const officerDepositTotal = appState.officerDeposits
    .filter((item) => item.status === "Diterima Bendahara" && item.date.startsWith(`${appState.reportYear}-${appState.reportMonth}`))
    .reduce((sum, item) => sum + item.amount, 0);
  const lazisnuDepositTotal = appState.lazisnuDeposits
    .filter((item) => item.status === "Sudah Disetor" && item.date.startsWith(`${appState.reportYear}-${appState.reportMonth}`))
    .reduce((sum, item) => sum + item.amount, 0);
  const printDate = new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  }).format(new Date());
  const tableRows = pickups.map((pickup, index) => `
    <tr class="${index % 2 === 0 ? "even" : "odd"}">
      <td class="date">${formatDateId(pickup.date)}</td>
      <td class="trx">${escapeHtml(pickup.transactionNo)}</td>
      <td class="donor">${escapeHtml(pickup.donorName)}</td>
      <td class="area">RT ${escapeHtml(pickup.rt)} / RW ${escapeHtml(pickup.rw)}</td>
      <td class="officer">${escapeHtml(pickup.officer)}</td>
      <td class="money">${pickup.amount}</td>
      <td class="method">${escapeHtml(pickup.method)}</td>
      <td class="status ${getPickupStatusClass(pickup.status)}">${escapeHtml(pickup.status)}</td>
    </tr>
  `).join("");
  const excelHtml = `
    <html>
      <head>
        <meta charset="UTF-8" />
        <style>
          body { font-family: Arial, sans-serif; color: #10251b; }
          table { border-collapse: collapse; width: 100%; }
          .brand { font-size: 13px; color: #0b6b3a; font-weight: 700; text-align: center; }
          .title { font-size: 22px; font-weight: 700; color: #0b6b3a; text-align: center; }
          .subtitle { font-size: 12px; color: #466354; text-align: center; }
          .summary-label { background: #e8f7ed; color: #0b5f37; font-weight: 700; border: 1px solid #9fb7a8; }
          .summary-value { font-weight: 700; border: 1px solid #9fb7a8; }
          th { background: #0b6b3a; color: #ffffff; font-weight: 700; border: 1px solid #7da98e; padding: 10px; text-align: center; }
          td { border: 1px solid #b8c9bf; padding: 8px; vertical-align: top; }
          .even td { background: #f7fcf8; }
          .odd td { background: #ffffff; }
          .date { width: 110px; text-align: center; }
          .trx { width: 150px; }
          .donor { width: 190px; font-weight: 700; }
          .area { width: 95px; text-align: center; }
          .officer { width: 135px; }
          .money { width: 130px; text-align: right; mso-number-format:"Rp #,##0"; }
          .method { width: 110px; text-align: center; }
          .status { width: 150px; text-align: center; font-weight: 700; }
          .approved { color: #0f6d3e; background: #e8f7ed; }
          .waiting { color: #8a3d08; background: #fff3d6; }
          .rejected { color: #9f1d1d; background: #ffe5e5; }
          .revision { color: #17406d; background: #eaf3ff; }
          .signature td { border: 0; height: 90px; text-align: center; vertical-align: bottom; }
        </style>
      </head>
      <body>
        <table>
          <tr><td class="brand" colspan="8">NU CARE-LAZISNU</td></tr>
          <tr><td class="title" colspan="8">Laporan ${brand.name}</td></tr>
          <tr><td class="subtitle" colspan="8">${brand.subtitle} | ${brand.tagline}</td></tr>
          <tr><td class="subtitle" colspan="8">Periode: ${getReportPeriodLabel()} | Tanggal cetak: ${printDate}</td></tr>
          <tr><td colspan="8"></td></tr>
          <tr>
            <td class="summary-label" colspan="2">Total transaksi</td>
            <td class="summary-value" colspan="2">${pickups.length}</td>
            <td class="summary-label" colspan="2">Total terverifikasi</td>
            <td class="summary-value money" colspan="2">${approvedTotal}</td>
          </tr>
          <tr>
            <td class="summary-label" colspan="2">Menunggu verifikasi</td>
            <td class="summary-value" colspan="2">${pickups.filter((pickup) => pickup.status === "Menunggu Verifikasi").length}</td>
            <td class="summary-label" colspan="2">Total penyaluran</td>
            <td class="summary-value money" colspan="2">${distributionTotal}</td>
          </tr>
          <tr>
            <td class="summary-label" colspan="2">Saldo akhir</td>
            <td class="summary-value money" colspan="6">${officerDepositTotal - lazisnuDepositTotal - distributionTotal}</td>
          </tr>
          <tr>
            <td class="summary-label" colspan="2">Setoran petugas ke bendahara</td>
            <td class="summary-value money" colspan="2">${officerDepositTotal}</td>
            <td class="summary-label" colspan="2">Setoran ke LAZISNU</td>
            <td class="summary-value money" colspan="2">${lazisnuDepositTotal}</td>
          </tr>
          <tr><td colspan="8"></td></tr>
          <tr>${header.map((column) => `<th>${escapeHtml(column)}</th>`).join("")}</tr>
          ${tableRows || `<tr><td colspan="8" style="text-align:center;">Tidak ada data laporan.</td></tr>`}
          <tr><td colspan="8"></td></tr>
          <tr class="signature">
            <td colspan="4">Ketua Ranting<br /><br /><br />( ................................ )</td>
            <td colspan="4">Bendahara<br /><br /><br />( ................................ )</td>
          </tr>
          <tr><td class="subtitle" colspan="8">${brand.footer}</td></tr>
        </table>
      </body>
    </html>
  `;
  const blob = new Blob([excelHtml], { type: "application/vnd.ms-excel;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `laporan-sikoinnu-${appState.reportYear}-${appState.reportMonth}.xls`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function getCashSummary() {
  const collected = appState.officerDeposits
    .filter((item) => item.status === "Diterima Bendahara")
    .reduce((sum, item) => sum + item.amount, 0);
  const sentToLazisnu = appState.lazisnuDeposits
    .filter((item) => item.status === "Sudah Disetor")
    .reduce((sum, item) => sum + item.amount, 0);
  const distributed = appState.distributions
    .filter((item) => item.status === "Disalurkan")
    .reduce((sum, item) => sum + item.amount, 0);
  return { collected, sentToLazisnu, notSent: collected - sentToLazisnu, cashBalance: collected - sentToLazisnu - distributed };
}

export function renderCashSummary() {
  const summary = getCashSummary();
  return `
    <section class="cash-summary">
      <article><span>Total terkumpul dari petugas</span><strong>${formatRupiah(summary.collected)}</strong></article>
      <article><span>Total sudah disetor ke LAZISNU</span><strong>${formatRupiah(summary.sentToLazisnu)}</strong></article>
      <article><span>Total belum disetor</span><strong>${formatRupiah(summary.notSent)}</strong></article>
      <article><span>Saldo kas ranting</span><strong>${formatRupiah(summary.cashBalance)}</strong></article>
    </section>
  `;
}

// === 5. OFFICER DEPOSITS ===
export function getDepositStatusClass(status) {
  if (status === "Diterima Bendahara" || status === "Sudah Disetor") return "approved";
  if (status === "Ditolak" || status === "Batal") return "rejected";
  if (status === "Dikembalikan Revisi") return "revision";
  return "waiting";
}

export function canCreateOfficerDeposit(session) {
  return session.role === "admin" || session.role === "petugas";
}

export function canEditOfficerDeposit(session, item) {
  return session.role === "admin" || session.role === "bendahara" || (session.role === "petugas" && item?.officerEmail === session.email && item?.status !== "Diterima Bendahara");
}

export function getVisibleOfficerDeposits(session) {
  let items = session.role === "petugas"
    ? appState.officerDeposits.filter((item) => item.officerEmail === session.email || item.officerEmail === "petugas@rantingnu.id")
    : [...appState.officerDeposits];
  const search = appState.officerDepositSearch.trim().toLowerCase();
  if (search) items = items.filter((item) => item.depositNo.toLowerCase().includes(search) || item.officer.toLowerCase().includes(search));
  if (appState.officerDepositOfficer !== "all") items = items.filter((item) => item.officer === appState.officerDepositOfficer);
  if (appState.officerDepositDate) items = items.filter((item) => item.date === appState.officerDepositDate);
  if (appState.officerDepositStatus !== "all") items = items.filter((item) => item.status === appState.officerDepositStatus);
  return items.sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
}

export function renderOfficerDepositActions(item, session) {
  return `<div class="row-actions">
    <button class="icon-button soft" data-officer-deposit-action="detail" data-id="${item.id}" type="button">Detail</button>
    ${canEditOfficerDeposit(session, item) ? `<button class="icon-button" data-officer-deposit-action="edit" data-id="${item.id}" type="button">${session.role === "bendahara" ? "Verifikasi" : "Edit"}</button>` : ""}
    ${session.role === "admin" ? `<button class="icon-button danger" data-officer-deposit-action="delete" data-id="${item.id}" type="button">Hapus</button>` : ""}
  </div>`;
}

export function renderOfficerDepositList(items, session) {
  if (!items.length) return `<div class="empty-state">Data setoran petugas tidak ditemukan.</div>`;
  const rows = items.map((item) => `<tr>
    <td><strong>${escapeHtml(item.depositNo)}</strong><span>${formatDateId(item.date)}</span></td>
    <td>${escapeHtml(item.officer)}</td>
    <td>${formatDateId(item.periodStart)} - ${formatDateId(item.periodEnd)}</td>
    <td>${item.transactionCount} transaksi</td>
    <td>${formatRupiah(item.amount)}</td>
    <td>${escapeHtml(item.method)}</td>
    <td><span class="status-pill ${getDepositStatusClass(item.status)}">${escapeHtml(item.status)}</span></td>
    <td>${renderOfficerDepositActions(item, session)}</td>
  </tr>`).join("");
  const cards = items.map((item) => `<article class="officer-deposit-card">
    <div><strong>${escapeHtml(item.officer)}</strong><span>${escapeHtml(item.depositNo)} - ${formatDateId(item.date)}</span></div>
    <div class="pickup-card-meta"><span>${formatRupiah(item.amount)}</span><span>${item.transactionCount} transaksi</span><span>${escapeHtml(item.method)}</span><span class="status-pill ${getDepositStatusClass(item.status)}">${escapeHtml(item.status)}</span></div>
    <p>${formatDateId(item.periodStart)} - ${formatDateId(item.periodEnd)}</p>${renderOfficerDepositActions(item, session)}
  </article>`).join("");
  return `<div class="table-wrap officer-deposit-table"><table><thead><tr><th>No. Setoran</th><th>Petugas</th><th>Periode</th><th>Transaksi</th><th>Nominal</th><th>Metode</th><th>Status</th><th>Aksi</th></tr></thead><tbody>${rows}</tbody></table></div><div class="officer-deposit-card-list">${cards}</div>`;
}

export function renderOfficerDepositModal(session) {
  const mode = appState.officerDepositModalMode;
  if (!mode) return "";
  const item = appState.officerDeposits.find((entry) => entry.id === appState.selectedOfficerDepositId);
  const isReadonly = mode === "detail";
  if (mode === "delete") return `<div class="modal-backdrop"><section class="confirm-modal"><h2>Hapus Setoran Petugas</h2><p>Yakin ingin menghapus <strong>${escapeHtml(item?.depositNo || "setoran ini")}</strong>?</p><div class="modal-actions"><button class="ghost-button" data-close-officer-deposit-modal type="button">Batal</button><button class="danger-button" id="confirmOfficerDepositDeleteButton" type="button">Hapus</button></div></section></div>`;
  const officer = getDefaultOfficer(session);
  const values = item || { depositNo: generateOfficerDepositNo(getLocalDateString()), officer: officer?.name || "", date: getLocalDateString(), periodStart: getLocalDateString(), periodEnd: getLocalDateString(), amount: "", transactionCount: "", method: "Tunai", status: "Menunggu Verifikasi", note: "", proofPhotoUrl: "", proofPhotoName: "" };
  const officerLocked = session.role === "petugas" || isReadonly;
  return `<div class="modal-backdrop" role="dialog" aria-modal="true"><form class="donor-form-modal" id="officerDepositForm" novalidate>
    <div class="modal-heading"><div><p class="eyebrow">Setoran Petugas</p><h2>${mode === "add" ? "Tambah Setoran" : isReadonly ? "Detail Setoran" : session.role === "bendahara" ? "Verifikasi Setoran" : "Edit Setoran"}</h2></div><button class="close-button" data-close-officer-deposit-modal type="button">x</button></div>
    <div class="form-grid">
      <label class="field"><span>Nomor setoran</span><input name="depositNo" value="${escapeHtml(values.depositNo)}" readonly /></label>
      <label class="field"><span>Petugas</span><select name="officer" ${officerLocked ? "disabled" : ""}>${renderOfficerOptions(values.officer)}</select>${officerLocked ? `<input type="hidden" name="officer" value="${escapeHtml(values.officer)}" />` : ""}</label>
      <label class="field"><span>Tanggal setor</span><input name="date" type="date" value="${escapeHtml(values.date)}" ${isReadonly ? "readonly" : ""} required /></label>
      <label class="field"><span>Periode mulai</span><input name="periodStart" type="date" value="${escapeHtml(values.periodStart)}" ${isReadonly ? "readonly" : ""} required /></label>
      <label class="field"><span>Periode selesai</span><input name="periodEnd" type="date" value="${escapeHtml(values.periodEnd)}" ${isReadonly ? "readonly" : ""} required /></label>
      <label class="field"><span>Jumlah transaksi terkait</span><input name="transactionCount" type="number" min="1" value="${escapeHtml(values.transactionCount)}" ${isReadonly ? "readonly" : ""} required /></label>
      <label class="field"><span>Total nominal disetor</span><input name="amount" type="number" min="1" step="1000" value="${escapeHtml(values.amount)}" ${isReadonly ? "readonly" : ""} required /></label>
      <label class="field"><span>Metode setor</span><select name="method" ${isReadonly ? "disabled" : ""}>${["Tunai", "Transfer", "QRIS"].map((value) => `<option ${values.method === value ? "selected" : ""}>${value}</option>`).join("")}</select></label>
      <label class="field"><span>Status</span><select name="status" ${session.role === "petugas" || isReadonly ? "disabled" : ""}>${["Menunggu Verifikasi", "Diterima Bendahara", "Dikembalikan Revisi", "Ditolak"].map((value) => `<option ${values.status === value ? "selected" : ""}>${value}</option>`).join("")}</select>${session.role === "petugas" || isReadonly ? `<input type="hidden" name="status" value="${escapeHtml(values.status)}" />` : ""}</label>
      <label class="field full"><span>Catatan petugas</span><textarea name="note" ${isReadonly ? "readonly" : ""}>${escapeHtml(values.note)}</textarea></label>
      <label class="field full"><span>Foto bukti setor</span>${isReadonly ? "" : `<input name="proofPhoto" id="officerDepositProof" type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" />`}<small>Opsional. Maksimal 2 MB.</small></label>
      <div class="full" id="officerDepositPreview">${renderPhotoPreview(values.proofPhotoUrl, values.proofPhotoName || "Bukti setoran petugas")}</div>
    </div><p class="form-error" id="officerDepositFormError"></p><div class="modal-actions"><button class="ghost-button" data-close-officer-deposit-modal type="button">${isReadonly ? "Tutup" : "Batal"}</button>${isReadonly ? "" : `<button class="primary-button compact" type="submit">Simpan Setoran</button>`}</div>
  </form></div>`;
}

export function renderOfficerDeposits() {
  const session = getSession(); if (!session?.role) return navigate("/login");
  const items = getVisibleOfficerDeposits(session);
  const officers = [...new Set(appState.officerDeposits.map((item) => item.officer))].sort();
  renderAppShell(session, "Setoran Petugas", `<section class="officer-deposit-hero"><div><p class="eyebrow">Kas Ranting</p><h2>Catat penyerahan hasil pengambilan petugas ke bendahara.</h2><p>Petugas membuat setoran miliknya. Bendahara memverifikasi penerimaan. Admin dapat mengelola seluruh data.</p></div>${canCreateOfficerDeposit(session) ? `<button class="primary-button compact" id="addOfficerDepositButton" type="button">Tambah Setoran</button>` : ""}</section>${renderCashSummary()}<section class="panel officer-deposit-panel"><div class="officer-deposit-toolbar"><label class="search-field"><span>Cari setoran</span><input id="officerDepositSearch" value="${escapeHtml(appState.officerDepositSearch)}" placeholder="Nomor setoran atau petugas" /></label><label><span>Petugas</span><select id="officerDepositOfficer"><option value="all">Semua petugas</option>${officers.map((value) => `<option ${appState.officerDepositOfficer === value ? "selected" : ""}>${escapeHtml(value)}</option>`).join("")}</select></label><label><span>Tanggal</span><input id="officerDepositDate" type="date" value="${escapeHtml(appState.officerDepositDate)}" /></label><label><span>Status</span><select id="officerDepositStatus"><option value="all">Semua status</option>${["Menunggu Verifikasi", "Diterima Bendahara", "Dikembalikan Revisi", "Ditolak"].map((value) => `<option ${appState.officerDepositStatus === value ? "selected" : ""}>${value}</option>`).join("")}</select></label></div>${renderOfficerDepositList(items, session)}</section>${renderOfficerDepositModal(session)}`);
  bindOfficerDepositEvents(session);
}

export function bindOfficerDepositEvents(session) {
  document.querySelector("#addOfficerDepositButton")?.addEventListener("click", () => { appState.officerDepositModalMode = "add"; renderOfficerDeposits(); });
  [["#officerDepositSearch","officerDepositSearch","input"],["#officerDepositOfficer","officerDepositOfficer","change"],["#officerDepositDate","officerDepositDate","change"],["#officerDepositStatus","officerDepositStatus","change"]].forEach(([selector,key,event]) => document.querySelector(selector)?.addEventListener(event, event === "input" ? debounce((e) => { appState[key] = e.target.value; renderOfficerDeposits(); }, 250) : (e) => { appState[key] = e.target.value; renderOfficerDeposits(); }));
  document.querySelectorAll("[data-officer-deposit-action]").forEach((button) => button.addEventListener("click", () => { appState.officerDepositModalMode = button.dataset.officerDepositAction; appState.selectedOfficerDepositId = Number(button.dataset.id); renderOfficerDeposits(); }));
  document.querySelectorAll("[data-close-officer-deposit-modal]").forEach((button) => button.addEventListener("click", () => { appState.officerDepositModalMode = null; appState.selectedOfficerDepositId = null; renderOfficerDeposits(); }));
  document.querySelector("#officerDepositForm")?.addEventListener("submit", (event) => handleOfficerDepositSubmit(event, session));
  document.querySelector("#confirmOfficerDepositDeleteButton")?.addEventListener("click", handleOfficerDepositDelete);
  bindImagePreview("#officerDepositProof", "#officerDepositPreview", "#officerDepositFormError");
}

export async function handleOfficerDepositSubmit(event, session) {
  event.preventDefault(); const form = event.currentTarget; const data = new FormData(form); const existing = appState.officerDeposits.find((item) => item.id === appState.selectedOfficerDepositId); const proof = form.elements.proofPhoto?.files?.[0];
  const error = validateImageFile(proof); if (error) return document.querySelector("#officerDepositFormError").textContent = error;
  let uploaded = null; try { uploaded = proof ? await uploadDocumentationPhoto(proof, "setoran-petugas") : null; } catch (uploadError) { return document.querySelector("#officerDepositFormError").textContent = uploadError.message; }
  const officer = String(data.get("officer") || existing?.officer || getDefaultOfficer(session)?.name || "").trim();
  const payload = { depositNo: String(data.get("depositNo") || "").trim(), officer, officerEmail: resolveOfficerEmail(officer, existing?.officerEmail || session.email), date: String(data.get("date") || ""), periodStart: String(data.get("periodStart") || ""), periodEnd: String(data.get("periodEnd") || ""), amount: Number(data.get("amount") || 0), transactionCount: Number(data.get("transactionCount") || 0), method: String(data.get("method") || "Tunai"), status: session.role === "petugas" ? existing?.status || "Menunggu Verifikasi" : String(data.get("status") || "Menunggu Verifikasi"), note: String(data.get("note") || "").trim(), proofPhotoPath: uploaded?.path || existing?.proofPhotoPath || "", proofPhotoUrl: uploaded?.url || existing?.proofPhotoUrl || "", proofPhotoName: uploaded?.name || existing?.proofPhotoName || "" };
  if (!payload.officer || !payload.date || !payload.periodStart || !payload.periodEnd || payload.periodStart > payload.periodEnd || payload.amount <= 0 || payload.transactionCount <= 0) return document.querySelector("#officerDepositFormError").textContent = "Lengkapi petugas, tanggal, periode, nominal, dan jumlah transaksi dengan benar.";
  let targetItem = null;
  if (existing) {
    appState.officerDeposits = appState.officerDeposits.map((item) => {
      if (item.id === existing.id) {
        targetItem = { ...item, ...payload };
        return targetItem;
      }
      return item;
    });
  } else {
    targetItem = { id: Date.now(), ...payload };
    appState.officerDeposits = [targetItem, ...appState.officerDeposits];
  }
  const ok = await wrapFormSubmit(event, () => syncRowToPostgres("setoran_petugas", targetItem));
  if (ok) {
    appState.officerDepositModalMode = null;
    appState.selectedOfficerDepositId = null;
    renderOfficerDeposits();
  }
}

export async function handleOfficerDepositDelete() { if (!await deleteRowFromPostgres("setoran_petugas", appState.selectedOfficerDepositId)) return; appState.officerDeposits = appState.officerDeposits.filter((item) => item.id !== appState.selectedOfficerDepositId); appState.officerDepositModalMode = null; appState.selectedOfficerDepositId = null; renderOfficerDeposits(); }

// === 6. LAZISNU DEPOSITS ===
export function canManageLazisnuDeposits(role) { return role === "admin" || role === "bendahara"; }

export function getVisibleLazisnuDeposits() { let items = [...appState.lazisnuDeposits]; const search = appState.lazisnuDepositSearch.trim().toLowerCase(); if (search) items = items.filter((item) => item.depositNo.toLowerCase().includes(search) || item.recipientName.toLowerCase().includes(search)); if (appState.lazisnuDepositDestination !== "all") items = items.filter((item) => item.destination === appState.lazisnuDepositDestination); if (appState.lazisnuDepositDate) items = items.filter((item) => item.date === appState.lazisnuDepositDate); if (appState.lazisnuDepositStatus !== "all") items = items.filter((item) => item.status === appState.lazisnuDepositStatus); return items.sort((a,b) => b.date.localeCompare(a.date) || b.id - a.id); }

export function renderLazisnuDepositActions(item, session) { return `<div class="row-actions"><button class="icon-button soft" data-lazisnu-deposit-action="detail" data-id="${item.id}" type="button">Detail</button>${canManageLazisnuDeposits(session.role) ? `<button class="icon-button" data-lazisnu-deposit-action="edit" data-id="${item.id}" type="button">Edit</button><button class="icon-button danger" data-lazisnu-deposit-action="delete" data-id="${item.id}" type="button">Hapus</button>` : ""}</div>`; }

export function renderLazisnuDepositList(items, session) { if (!items.length) return `<div class="empty-state">Data setor ke LAZISNU tidak ditemukan.</div>`; const rows = items.map((item) => `<tr><td><strong>${escapeHtml(item.depositNo)}</strong><span>${formatDateId(item.date)}</span></td><td>${escapeHtml(item.destination)}</td><td>${escapeHtml(item.recipientName)}</td><td>${formatRupiah(item.amount)}</td><td>${escapeHtml(item.method)}</td><td>${escapeHtml(item.receiptNo || "-")}</td><td><span class="status-pill ${getDepositStatusClass(item.status)}">${escapeHtml(item.status)}</span></td><td>${renderLazisnuDepositActions(item, session)}</td></tr>`).join(""); const cards = items.map((item) => `<article class="lazisnu-deposit-card"><div><strong>${escapeHtml(item.destination)}</strong><span>${escapeHtml(item.depositNo)} - ${formatDateId(item.date)}</span></div><div class="pickup-card-meta"><span>${formatRupiah(item.amount)}</span><span>${escapeHtml(item.recipientName)}</span><span>${escapeHtml(item.method)}</span><span class="status-pill ${getDepositStatusClass(item.status)}">${escapeHtml(item.status)}</span></div><p>${escapeHtml(item.receiptNo || "Nomor bukti belum diisi")}</p>${renderLazisnuDepositActions(item, session)}</article>`).join(""); return `<div class="table-wrap lazisnu-deposit-table"><table><thead><tr><th>No. Setoran</th><th>Tujuan</th><th>Penerima</th><th>Nominal</th><th>Metode</th><th>No. Bukti</th><th>Status</th><th>Aksi</th></tr></thead><tbody>${rows}</tbody></table></div><div class="officer-deposit-card-list">${cards}</div>`; }

export function renderLazisnuDepositModal() {
  const mode = appState.lazisnuDepositModalMode; if (!mode) return ""; const item = appState.lazisnuDeposits.find((entry) => entry.id === appState.selectedLazisnuDepositId); const readonly = mode === "detail";
  if (mode === "delete") return `<div class="modal-backdrop"><section class="confirm-modal"><h2>Hapus Setoran LAZISNU</h2><p>Yakin ingin menghapus <strong>${escapeHtml(item?.depositNo || "setoran ini")}</strong>?</p><div class="modal-actions"><button class="ghost-button" data-close-lazisnu-deposit-modal type="button">Batal</button><button class="danger-button" id="confirmLazisnuDepositDeleteButton" type="button">Hapus</button></div></section></div>`;
  const values = item || { depositNo: generateLazisnuDepositNo(getLocalDateString()), date: getLocalDateString(), destination: "LAZISNU Ranting", recipientName: "", amount: "", method: "Tunai", receiptNo: "", status: "Draft", note: "", proofPhotoUrl: "", proofPhotoName: "" };
  return `<div class="modal-backdrop"><form class="donor-form-modal" id="lazisnuDepositForm"><div class="modal-heading"><div><p class="eyebrow">Setor ke LAZISNU</p><h2>${mode === "add" ? "Tambah Setoran" : readonly ? "Detail Setoran" : "Edit Setoran"}</h2></div><button class="close-button" data-close-lazisnu-deposit-modal type="button">x</button></div><div class="form-grid">
  <label class="field"><span>Nomor setoran</span><input name="depositNo" value="${escapeHtml(values.depositNo)}" readonly /></label><label class="field"><span>Tanggal setor</span><input name="date" type="date" value="${escapeHtml(values.date)}" ${readonly ? "readonly" : ""} required /></label><label class="field"><span>Tujuan setoran</span><select name="destination" ${readonly ? "disabled" : ""}>${["LAZISNU Ranting","MWC LAZISNU","PC LAZISNU"].map((value) => `<option ${values.destination === value ? "selected" : ""}>${value}</option>`).join("")}</select></label><label class="field"><span>Nama penerima/petugas LAZISNU</span><input name="recipientName" value="${escapeHtml(values.recipientName)}" ${readonly ? "readonly" : ""} required /></label><label class="field"><span>Nominal setor</span><input name="amount" type="number" min="1" step="1000" value="${escapeHtml(values.amount)}" ${readonly ? "readonly" : ""} required /></label><label class="field"><span>Metode setor</span><select name="method" ${readonly ? "disabled" : ""}>${["Tunai","Transfer","QRIS"].map((value) => `<option ${values.method === value ? "selected" : ""}>${value}</option>`).join("")}</select></label><label class="field"><span>Nomor bukti/kwitansi</span><input name="receiptNo" value="${escapeHtml(values.receiptNo)}" ${readonly ? "readonly" : ""} /></label><label class="field"><span>Status</span><select name="status" ${readonly ? "disabled" : ""}>${["Draft","Sudah Disetor","Batal"].map((value) => `<option ${values.status === value ? "selected" : ""}>${value}</option>`).join("")}</select></label><label class="field full"><span>Catatan</span><textarea name="note" ${readonly ? "readonly" : ""}>${escapeHtml(values.note)}</textarea></label><label class="field full"><span>Bukti setor</span>${readonly ? "" : `<input name="proofPhoto" id="lazisnuDepositProof" type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" />`}<small>Opsional. Maksimal 2 MB.</small></label><div class="full" id="lazisnuDepositPreview">${renderPhotoPreview(values.proofPhotoUrl, values.proofPhotoName || "Bukti setor LAZISNU")}</div></div><p class="form-error" id="lazisnuDepositFormError"></p><div class="modal-actions"><button class="ghost-button" data-close-lazisnu-deposit-modal type="button">${readonly ? "Tutup" : "Batal"}</button>${readonly ? "" : `<button class="primary-button compact" type="submit">Simpan Setoran</button>`}</div></form></div>`;
}

export function renderLazisnuDeposits() {
  const session = getSession(); if (!session?.role) return navigate("/login");
  const items = getVisibleLazisnuDeposits();
  renderAppShell(session, "Setor ke LAZISNU", `<section class="lazisnu-deposit-hero"><div><p class="eyebrow">Kas Ranting ke LAZISNU</p><h2>Catat dana yang disetorkan ke LAZISNU, MWC, atau PCNU.</h2><p>Bendahara dan admin mengelola bukti penyerahan dana dari kas ranting.</p></div>${canManageLazisnuDeposits(session.role) ? `<button class="primary-button compact" id="addLazisnuDepositButton" type="button">Tambah Setoran</button>` : ""}</section>${renderCashSummary()}<section class="panel lazisnu-deposit-panel"><div class="lazisnu-deposit-toolbar"><label class="search-field"><span>Cari setoran</span><input id="lazisnuDepositSearch" value="${escapeHtml(appState.lazisnuDepositSearch)}" placeholder="Nomor setoran atau penerima" /></label><label class="search-field"><span>Tujuan</span><select id="lazisnuDepositDestination"><option value="all">Semua tujuan</option>${["LAZISNU Ranting","MWC LAZISNU","PC LAZISNU"].map((value) => `<option ${appState.lazisnuDepositDestination === value ? "selected" : ""}>${escapeHtml(value)}</option>`).join("")}</select></label><label><span>Tanggal</span><input id="lazisnuDepositDate" type="date" value="${escapeHtml(appState.lazisnuDepositDate)}" /></label><label><span>Status</span><select id="lazisnuDepositStatus"><option value="all">Semua status</option>${["Draft","Sudah Disetor","Batal"].map((value) => `<option ${appState.lazisnuDepositStatus === value ? "selected" : ""}>${value}</option>`).join("")}</select></label></div>${renderLazisnuDepositList(items, session)}</section>${renderLazisnuDepositModal()}`);
  bindLazisnuDepositEvents();
}

export function bindLazisnuDepositEvents() {
  document.querySelector("#addLazisnuDepositButton")?.addEventListener("click", () => { appState.lazisnuDepositModalMode = "add"; renderLazisnuDeposits(); });
  [["#lazisnuDepositSearch","lazisnuDepositSearch","input"],["#lazisnuDepositDestination","lazisnuDepositDestination","change"],["#lazisnuDepositDate","lazisnuDepositDate","change"],["#lazisnuDepositStatus","lazisnuDepositStatus","change"]].forEach(([selector,key,event]) => document.querySelector(selector)?.addEventListener(event, event === "input" ? debounce((e) => { appState[key] = e.target.value; renderLazisnuDeposits(); }, 250) : (e) => { appState[key] = e.target.value; renderLazisnuDeposits(); }));
  document.querySelectorAll("[data-lazisnu-deposit-action]").forEach((button) => button.addEventListener("click", () => { appState.lazisnuDepositModalMode = button.dataset.lazisnuDepositAction; appState.selectedLazisnuDepositId = Number(button.dataset.id); renderLazisnuDeposits(); }));
  document.querySelectorAll("[data-close-lazisnu-deposit-modal]").forEach((button) => button.addEventListener("click", () => { appState.lazisnuDepositModalMode = null; appState.selectedLazisnuDepositId = null; renderLazisnuDeposits(); }));
  document.querySelector("#lazisnuDepositForm")?.addEventListener("submit", handleLazisnuDepositSubmit);
  document.querySelector("#confirmLazisnuDepositDeleteButton")?.addEventListener("click", handleLazisnuDepositDelete);
  bindImagePreview("#lazisnuDepositProof", "#lazisnuDepositPreview", "#lazisnuDepositFormError");
}

export async function handleLazisnuDepositSubmit(event) {
  event.preventDefault(); const form = event.currentTarget; const data = new FormData(form); const existing = appState.lazisnuDeposits.find((item) => item.id === appState.selectedLazisnuDepositId); const proof = form.elements.proofPhoto?.files?.[0]; const error = validateImageFile(proof); if (error) return document.querySelector("#lazisnuDepositFormError").textContent = error; let uploaded = null; try { uploaded = proof ? await uploadDocumentationPhoto(proof, "setoran-lazisnu") : null; } catch (uploadError) { return document.querySelector("#lazisnuDepositFormError").textContent = uploadError.message; } const payload = { depositNo: String(data.get("depositNo") || "").trim(), date: String(data.get("date") || ""), destination: String(data.get("destination") || "LAZISNU Ranting"), recipientName: String(data.get("recipientName") || "").trim(), amount: Number(data.get("amount") || 0), method: String(data.get("method") || "Tunai"), receiptNo: String(data.get("receiptNo") || "").trim(), status: String(data.get("status") || "Draft"), note: String(data.get("note") || "").trim(), proofPhotoPath: uploaded?.path || existing?.proofPhotoPath || "", proofPhotoUrl: uploaded?.url || existing?.proofPhotoUrl || "", proofPhotoName: uploaded?.name || existing?.proofPhotoName || "" }; if (!payload.date || !payload.recipientName || payload.amount <= 0) return document.querySelector("#lazisnuDepositFormError").textContent = "Lengkapi tanggal, penerima, dan nominal setoran.";
  let targetItem = null;
  if (existing) {
    appState.lazisnuDeposits = appState.lazisnuDeposits.map((item) => {
      if (item.id === existing.id) {
        targetItem = { ...item, ...payload };
        return targetItem;
      }
      return item;
    });
  } else {
    targetItem = { id: Date.now(), ...payload };
    appState.lazisnuDeposits = [targetItem, ...appState.lazisnuDeposits];
  }
  const ok = await wrapFormSubmit(event, () => syncRowToPostgres("setoran_lazisnu", targetItem));
  if (ok) {
    appState.lazisnuDepositModalMode = null;
    appState.selectedLazisnuDepositId = null;
    renderLazisnuDeposits();
  }
}

export async function handleLazisnuDepositDelete() { if (!await deleteRowFromPostgres("setoran_lazisnu", appState.selectedLazisnuDepositId)) return; appState.lazisnuDeposits = appState.lazisnuDeposits.filter((item) => item.id !== appState.selectedLazisnuDepositId); appState.lazisnuDepositModalMode = null; appState.selectedLazisnuDepositId = null; renderLazisnuDeposits(); }

// === 7. DISTRIBUTIONS ===
export function canManageDistribution(role) {
  return role === "admin" || role === "bendahara";
}

export function getDistributionStatusClass(status) {
  if (status === "Disalurkan") return "approved";
  if (status === "Dibatalkan") return "rejected";
  return "waiting";
}

export function getVisibleDistributions() {
  let distributions = [...appState.distributions];
  const search = appState.distributionSearch.trim().toLowerCase();
  if (search) distributions = distributions.filter((item) => item.recipientName.toLowerCase().includes(search));
  if (appState.distributionCategory !== "all") distributions = distributions.filter((item) => item.category === appState.distributionCategory);
  if (appState.distributionDate) distributions = distributions.filter((item) => item.date === appState.distributionDate);
  if (appState.distributionStatus !== "all") distributions = distributions.filter((item) => item.status === appState.distributionStatus);
  return distributions.sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
}

export function renderDistributionSummary(distributions) {
  const month = getLocalDateString().slice(0, 7);
  const deliveredThisMonth = appState.distributions.filter((item) => item.status === "Disalurkan" && item.date.startsWith(month));
  const totalDelivered = deliveredThisMonth.reduce((sum, item) => sum + item.amount, 0);
  const categoryCounts = new Map();
  deliveredThisMonth.forEach((item) => categoryCounts.set(item.category, (categoryCounts.get(item.category) || 0) + 1));
  const topCategory = [...categoryCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "-";
  const approvedIncome = appState.pickups
    .filter((pickup) => pickup.status === "Disetujui Bendahara" && pickup.date.startsWith(month))
    .reduce((sum, pickup) => sum + pickup.amount, 0);

  return `
    <section class="distribution-stats">
      <article><span>Tersalurkan bulan ini</span><strong>${formatRupiah(totalDelivered)}</strong></article>
      <article><span>Penerima bantuan</span><strong>${new Set(deliveredThisMonth.map((item) => item.recipientName)).size}</strong></article>
      <article><span>Kategori terbanyak</span><strong>${escapeHtml(topCategory)}</strong></article>
      <article><span>Saldo akhir sementara</span><strong>${formatRupiah(approvedIncome - totalDelivered)}</strong></article>
    </section>
  `;
}

export function renderDistributionActions(item, session) {
  const manage = canManageDistribution(session.role) ? `
    <button class="icon-button" data-distribution-action="edit" data-id="${item.id}" type="button">Edit</button>
    <button class="icon-button danger" data-distribution-action="delete" data-id="${item.id}" type="button">Hapus</button>
  ` : "";
  return `
    <div class="row-actions">
      <button class="icon-button soft" data-distribution-action="detail" data-id="${item.id}" type="button">Detail</button>
      ${manage}
    </div>
  `;
}

export function renderDistributionList(distributions, session) {
  if (!distributions.length) {
    return `<div class="empty-state">Data penyaluran tidak ditemukan untuk filter ini.</div>`;
  }
  const rows = distributions.map((item) => `
    <tr>
      <td><strong>${escapeHtml(item.distributionNo)}</strong><span>${formatDateId(item.date)}</span></td>
      <td><strong>${escapeHtml(item.recipientName)}</strong><span>RT ${escapeHtml(item.rt)} / RW ${escapeHtml(item.rw)}</span></td>
      <td>${escapeHtml(item.category)}</td>
      <td>${formatRupiah(item.amount)}</td>
      <td>${escapeHtml(item.source)}</td>
      <td><span class="status-pill ${getDistributionStatusClass(item.status)}">${escapeHtml(item.status)}</span></td>
      <td>${renderDistributionActions(item, session)}</td>
    </tr>
  `).join("");
  const cards = distributions.map((item) => `
    <article class="distribution-card">
      <div><strong>${escapeHtml(item.recipientName)}</strong><span>${escapeHtml(item.distributionNo)} - ${formatDateId(item.date)}</span></div>
      <div class="pickup-card-meta">
        <span>${formatRupiah(item.amount)}</span><span>${escapeHtml(item.category)}</span><span>RT ${escapeHtml(item.rt)}/RW ${escapeHtml(item.rw)}</span>
        <span class="status-pill ${getDistributionStatusClass(item.status)}">${escapeHtml(item.status)}</span>
      </div>
      <p>${item.note ? escapeHtml(item.note) : "Tidak ada keterangan."}</p>
      ${renderDistributionActions(item, session)}
    </article>
  `).join("");
  return `
    <div class="table-wrap distribution-table">
      <table>
        <thead>
          <tr>
            <th>No. Penyaluran</th><th>Penerima</th><th>Kategori</th><th>Nominal</th><th>Sumber Dana</th><th>Status</th><th>Aksi</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <div class="distribution-card-list">${cards}</div>
  `;
}

export function renderDistributionModal(session) {
  if (!appState.distributionModalMode) return "";
  const item = appState.distributions.find((distribution) => distribution.id === appState.selectedDistributionId);
  const mode = appState.distributionModalMode;
  const isReadonly = mode === "detail";
  const title = mode === "add" ? "Tambah Penyaluran" : mode === "edit" ? "Edit Penyaluran" : mode === "delete" ? "Hapus Penyaluran" : "Detail Penyaluran";
  if (mode === "delete") {
    return `
      <div class="modal-backdrop" role="dialog" aria-modal="true">
        <section class="confirm-modal">
          <h2>${title}</h2>
          <p>Yakin ingin menghapus penyaluran untuk <strong>${escapeHtml(item?.recipientName || "penerima ini")}</strong>?</p>
          <div class="modal-actions">
            <button class="ghost-button" data-close-distribution-modal type="button">Batal</button>
            <button class="danger-button" id="confirmDistributionDeleteButton" type="button">Hapus</button>
          </div>
        </section>
      </div>
    `;
  }
  const values = item || { distributionNo: generateDistributionNo(getLocalDateString()), date: getLocalDateString(), recipientName: "", address: "", rt: "", rw: "", phone: "", category: "Santunan Yatim", amount: "", source: "Kas Koin NU", status: "Draft", note: "", documentationName: "", documentationUrl: "" };
  return `
    <div class="modal-backdrop" role="dialog" aria-modal="true">
      <form class="donor-form-modal" id="distributionForm" novalidate>
        <div class="modal-heading">
          <div><p class="eyebrow">Penyaluran Dana</p><h2>${title}</h2></div>
          <button class="close-button" data-close-distribution-modal type="button" aria-label="Tutup">x</button>
        </div>
        <div class="form-grid">
          <label class="field"><span>Nomor penyaluran otomatis</span><input name="distributionNo" id="distributionNoInput" value="${escapeHtml(values.distributionNo)}" readonly /></label>
          <label class="field"><span>Tanggal penyaluran</span><input name="date" id="distributionDateInput" type="date" value="${escapeHtml(values.date)}" ${isReadonly ? "readonly" : ""} required /></label>
          <label class="field"><span>Nama penerima</span><input name="recipientName" value="${escapeHtml(values.recipientName)}" ${isReadonly ? "readonly" : ""} required /></label>
          <label class="field"><span>Nomor HP penerima</span><input name="phone" value="${escapeHtml(values.phone)}" ${isReadonly ? "readonly" : ""} /></label>
          <label class="field full"><span>Alamat penerima</span><input name="address" value="${escapeHtml(values.address)}" ${isReadonly ? "readonly" : ""} required /></label>
          <label class="field"><span>RT</span><input name="rt" value="${escapeHtml(values.rt)}" ${isReadonly ? "readonly" : ""} required /></label>
          <label class="field"><span>RW</span><input name="rw" value="${escapeHtml(values.rw)}" ${isReadonly ? "readonly" : ""} required /></label>
          <label class="field"><span>Kategori bantuan</span><select name="category" ${isReadonly ? "disabled" : ""}>
            ${distributionCategories.map((category) => `<option value="${category}" ${values.category === category ? "selected" : ""}>${category}</option>`).join("")}
          </select></label>
          <label class="field"><span>Nominal bantuan</span><input name="amount" type="number" min="0" step="1000" value="${escapeHtml(values.amount)}" ${isReadonly ? "readonly" : ""} required /></label>
          <label class="field"><span>Sumber dana</span><input name="source" value="${escapeHtml(values.source)}" ${isReadonly ? "readonly" : ""} required /></label>
          <label class="field"><span>Status penyaluran</span><select name="status" ${isReadonly ? "disabled" : ""}>
            ${["Draft", "Disalurkan", "Dibatalkan"].map((status) => `<option value="${status}" ${values.status === status ? "selected" : ""}>${status}</option>`).join("")}
          </select></label>
          <label class="field"><span>Dokumentasi/foto</span>
            ${isReadonly ? "" : `<input name="documentation" id="distributionDocumentation" type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" />`}
            <small>${values.documentationName ? `Saat ini: ${escapeHtml(values.documentationName)}. ` : ""}Format JPG, PNG, atau WEBP. Maksimal 2 MB.</small>
          </label>
          <div class="full" id="distributionDocumentationPreview">${renderPhotoPreview(values.documentationUrl, values.documentationName || "Dokumentasi penyaluran dana")}</div>
          <label class="field full"><span>Keterangan</span><textarea name="note" ${isReadonly ? "readonly" : ""}>${escapeHtml(values.note)}</textarea></label>
        </div>
        <p class="form-error" id="distributionFormError" role="alert"></p>
        <div class="modal-actions">
          <button class="ghost-button" data-close-distribution-modal type="button">${isReadonly ? "Tutup" : "Batal"}</button>
          ${isReadonly ? "" : `<button class="primary-button compact" type="submit">${mode === "add" ? "Simpan Penyaluran" : "Simpan Perubahan"}</button>`}
        </div>
      </form>
    </div>
  `;
}

export function renderDistributions() {
  const session = getSession();
  if (!session?.role) return navigate("/login");
  const distributions = getVisibleDistributions();
  renderAppShell(session, "Penyaluran Dana", `
    <section class="distribution-hero">
      <div>
        <p class="eyebrow">Program Sosial Ranting</p>
        <h2>Catat dan pantau penyaluran dana Koin NU.</h2>
        <p>${canManageDistribution(session.role) ? "Admin dan bendahara dapat mengelola penyaluran dana." : "Petugas dapat melihat data penyaluran yang sudah dicatat."}</p>
      </div>
      ${canManageDistribution(session.role) ? `<button class="primary-button compact" id="addDistributionButton" type="button">Tambah Penyaluran</button>` : ""}
    </section>
    ${renderDistributionSummary(distributions)}
    <section class="panel distribution-panel">
      <div class="distribution-toolbar">
        <label class="search-field"><span>Cari penerima</span><input id="distributionSearch" type="search" value="${escapeHtml(appState.distributionSearch)}" placeholder="Cari nama penerima" /></label>
        <label><span>Kategori</span><select id="distributionCategory"><option value="all">Semua kategori</option>${distributionCategories.map((category) => `<option value="${category}" ${appState.distributionCategory === category ? "selected" : ""}>${category}</option>`).join("")}</select></label>
        <label><span>Tanggal</span><input id="distributionDate" type="date" value="${escapeHtml(appState.distributionDate)}" /></label>
        <label><span>Status</span><select id="distributionStatus"><option value="all">Semua status</option>${["Draft", "Disalurkan", "Dibatalkan"].map((status) => `<option value="${status}" ${appState.distributionStatus === status ? "selected" : ""}>${status}</option>`).join("")}</select></label>
      </div>
      ${renderDistributionList(distributions, session)}
    </section>
    ${renderDistributionModal(session)}
  `);
  bindDistributionEvents(session);
}

export function bindDistributionEvents(session) {
  document.querySelector("#addDistributionButton")?.addEventListener("click", () => openDistributionModal("add"));
  [
    ["#distributionSearch", "distributionSearch", "input"],
    ["#distributionCategory", "distributionCategory", "change"],
    ["#distributionDate", "distributionDate", "change"],
    ["#distributionStatus", "distributionStatus", "change"]
  ].forEach(([selector, key, eventName]) => {
    document.querySelector(selector)?.addEventListener(eventName, eventName === "input" ? debounce((event) => {
      appState[key] = event.target.value;
      renderDistributions();
    }, 250) : (event) => {
      appState[key] = event.target.value;
      renderDistributions();
    });
  });
  document.querySelectorAll("[data-distribution-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const action = button.dataset.distributionAction;
      if ((action === "edit" || action === "delete") && !canManageDistribution(session.role)) return;
      openDistributionModal(action, Number(button.dataset.id));
    });
  });
  document.querySelectorAll("[data-close-distribution-modal]").forEach((button) => {
    button.addEventListener("click", closeDistributionModal);
  });
  document.querySelector("#distributionForm")?.addEventListener("submit", handleDistributionSubmit);
  bindImagePreview("#distributionDocumentation", "#distributionDocumentationPreview", "#distributionFormError");
  document.querySelector("#confirmDistributionDeleteButton")?.addEventListener("click", handleDistributionDelete);
  document.querySelector("#distributionDateInput")?.addEventListener("change", (event) => {
    if (appState.distributionModalMode !== "add") return;
    const numberInput = document.querySelector("#distributionNoInput");
    if (numberInput) numberInput.value = generateDistributionNo(event.target.value);
  });
}

export function openDistributionModal(mode, id = null) {
  appState.distributionModalMode = mode;
  appState.selectedDistributionId = id;
  renderDistributions();
}

export function closeDistributionModal() {
  appState.distributionModalMode = null;
  appState.selectedDistributionId = null;
  renderDistributions();
}

export async function handleDistributionSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const data = new FormData(form);
  const existing = appState.distributions.find((item) => item.id === appState.selectedDistributionId);
  const documentation = form.elements.documentation?.files?.[0];
  const photoError = validateImageFile(documentation);
  if (photoError) {
    document.querySelector("#distributionFormError").textContent = photoError;
    return;
  }
  let uploadedPhoto = null;
  try {
    uploadedPhoto = documentation ? await uploadDocumentationPhoto(documentation, "penyaluran") : null;
  } catch (error) {
    document.querySelector("#distributionFormError").textContent = error.message;
    return;
  }
  const payload = {
    distributionNo: String(data.get("distributionNo") || "").trim() || generateDistributionNo(String(data.get("date") || getLocalDateString())),
    date: String(data.get("date") || ""),
    recipientName: String(data.get("recipientName") || "").trim(),
    address: String(data.get("address") || "").trim(),
    rt: String(data.get("rt") || "").trim().padStart(2, "0"),
    rw: String(data.get("rw") || "").trim().padStart(2, "0"),
    phone: String(data.get("phone") || "").trim(),
    category: String(data.get("category") || "Lainnya"),
    amount: Number(data.get("amount") || 0),
    source: String(data.get("source") || "").trim(),
    status: String(data.get("status") || "Draft"),
    note: String(data.get("note") || "").trim(),
    documentationPath: uploadedPhoto?.path || existing?.documentationPath || "",
    documentationName: uploadedPhoto?.name || existing?.documentationName || "",
    documentationUrl: uploadedPhoto?.url || existing?.documentationUrl || ""
  };
  if (!payload.date || !payload.recipientName || !payload.address || !payload.rt || !payload.rw || !payload.source || payload.amount <= 0) {
    document.querySelector("#distributionFormError").textContent = "Lengkapi tanggal, penerima, alamat, RT/RW, sumber dana, dan nominal.";
    return;
  }
  let targetItem = null;
  if (appState.distributionModalMode === "edit") {
    appState.distributions = appState.distributions.map((item) => {
      if (item.id === appState.selectedDistributionId) {
        targetItem = { ...item, ...payload };
        return targetItem;
      }
      return item;
    });
  } else {
    targetItem = { id: Date.now(), ...payload };
    appState.distributions = [targetItem, ...appState.distributions];
  }
  const ok = await wrapFormSubmit(event, () => syncRowToPostgres("penyaluran_dana", targetItem));
  if (ok) closeDistributionModal();
}

export async function handleDistributionDelete() {
  if (!await deleteRowFromPostgres("penyaluran_dana", appState.selectedDistributionId)) return;
  appState.distributions = appState.distributions.filter((item) => item.id !== appState.selectedDistributionId);
  closeDistributionModal();
}

// === 8. OFFICERS ===
export function canManageOfficers(role) {
  return role === "admin";
}

export function getVisibleOfficers(session) {
  let officers = [...appState.officers];
  if (session.role === "petugas") {
    officers = officers.filter((officer) => officer.username === session.email || officer.username === "petugas@rantingnu.id");
  }
  const search = appState.officerSearch.trim().toLowerCase();
  if (search) officers = officers.filter((officer) => officer.name.toLowerCase().includes(search));
  if (appState.officerArea !== "all") officers = officers.filter((officer) => officer.area === appState.officerArea);
  if (appState.officerStatus !== "all") officers = officers.filter((officer) => officer.active === (appState.officerStatus === "active"));
  return officers;
}

export function getOfficerDonors(officer) {
  return appState.donors.filter((donor) => donor.officerEmail === officer.username || (officer.username === "petugas@rantingnu.id" && donor.officerEmail === "petugas@rantingnu.id"));
}

export function getOfficerPickups(officer) {
  return appState.pickups.filter((pickup) => pickup.officerEmail === officer.username || (officer.username === "petugas@rantingnu.id" && pickup.officerEmail === "petugas@rantingnu.id"));
}

export function renderOfficerStats(officers) {
  const active = officers.filter((officer) => officer.active).length;
  const totalDonors = officers.reduce((sum, officer) => sum + getOfficerDonors(officer).length, 0);
  const totalPickups = officers.reduce((sum, officer) => sum + getOfficerPickups(officer).length, 0);
  return `
    <section class="officer-stats">
      <article><span>Total petugas</span><strong>${officers.length}</strong></article>
      <article><span>Petugas aktif</span><strong>${active}</strong></article>
      <article><span>Donatur binaan</span><strong>${totalDonors}</strong></article>
      <article><span>Transaksi terkait</span><strong>${totalPickups}</strong></article>
    </section>
  `;
}

export function renderOfficerActions(officer, session) {
  const manage = canManageOfficers(session.role) ? `
    <button class="icon-button" data-officer-action="edit" data-id="${officer.id}" type="button">Edit</button>
    <button class="icon-button danger" data-officer-action="delete" data-id="${officer.id}" type="button">Hapus</button>
  ` : "";
  return `
    <div class="row-actions">
      <button class="icon-button soft" data-officer-action="detail" data-id="${officer.id}" type="button">Detail</button>
      ${manage}
    </div>
  `;
}

export function renderOfficerList(officers, session) {
  if (!officers.length) return `<div class="empty-state">Data petugas tidak ditemukan untuk filter ini.</div>`;
  const rows = officers.map((officer) => `
    <tr>
      <td><strong>${escapeHtml(officer.name)}</strong><span>${escapeHtml(officer.phone)}</span></td>
      <td>${escapeHtml(officer.area)}</td>
      <td>RT ${escapeHtml(officer.rt)} / RW ${escapeHtml(officer.rw)}</td>
      <td>${getOfficerDonors(officer).length || officer.donorCount}</td>
      <td>${escapeHtml(officer.username)}</td>
      <td><span class="status-pill ${officer.active ? "active" : "inactive"}">${officer.active ? "Aktif" : "Tidak aktif"}</span></td>
      <td>${renderOfficerActions(officer, session)}</td>
    </tr>
  `).join("");
  const cards = officers.map((officer) => `
    <article class="officer-card">
      <div><strong>${escapeHtml(officer.name)}</strong><span>${escapeHtml(officer.phone)} - ${escapeHtml(officer.username)}</span></div>
      <div class="pickup-card-meta">
        <span>${escapeHtml(officer.area)}</span><span>${getOfficerDonors(officer).length || officer.donorCount} donatur</span>
        <span class="status-pill ${officer.active ? "active" : "inactive"}">${officer.active ? "Aktif" : "Tidak aktif"}</span>
      </div>
      ${renderOfficerActions(officer, session)}
    </article>
  `).join("");
  return `
    <div class="table-wrap officer-table">
      <table>
        <thead>
          <tr>
            <th>Petugas</th><th>Wilayah Tugas</th><th>Domisili</th><th>Donatur</th><th>Login</th><th>Status</th><th>Aksi</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <div class="officer-card-list">${cards}</div>
  `;
}

export function renderOfficerDetail(officer) {
  const month = getLocalDateString().slice(0, 7);
  const donors = getOfficerDonors(officer);
  const pickups = getOfficerPickups(officer);
  const monthlyPickups = pickups.filter((pickup) => pickup.date.startsWith(month));
  const monthlyTotal = monthlyPickups.reduce((sum, pickup) => sum + pickup.amount, 0);
  const waiting = pickups.filter((pickup) => pickup.status === "Menunggu Verifikasi").length;
  const activities = pickups.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
  return `
    <section class="officer-detail">
      <div class="detail-grid">
        <div><span>Nama</span><strong>${escapeHtml(officer.name)}</strong></div>
        <div><span>Nomor HP</span><strong>${escapeHtml(officer.phone)}</strong></div>
        <div class="full"><span>Alamat</span><strong>${escapeHtml(officer.address)}</strong></div>
        <div><span>Wilayah tugas</span><strong>${escapeHtml(officer.area)}</strong></div>
        <div><span>Role</span><strong>${escapeHtml(officer.role)}</strong></div>
        <div><span>Donatur tanggung jawab</span><strong>${donors.length || officer.donorCount}</strong></div>
        <div><span>Pengambilan bulan ini</span><strong>${formatRupiah(monthlyTotal)}</strong></div>
        <div><span>Total transaksi</span><strong>${pickups.length}</strong></div>
        <div><span>Menunggu verifikasi</span><strong>${waiting}</strong></div>
        <div><span>Status</span><strong>${officer.active ? "Aktif" : "Tidak aktif"}</strong></div>
      </div>
      <section class="audit-panel">
        <h3>Riwayat Aktivitas Terbaru</h3>
        ${activities.length ? activities.map((pickup) => `
          <article>
            <strong>${escapeHtml(pickup.donorName)} - ${formatRupiah(pickup.amount)}</strong>
            <span>${formatDateId(pickup.date)} - ${escapeHtml(pickup.status)}</span>
            <p>${pickup.note ? escapeHtml(pickup.note) : "Tidak ada catatan."}</p>
          </article>
        `).join("") : `<p>Belum ada aktivitas pengambilan.</p>`}
      </section>
    </section>
  `;
}

export function renderOfficerModal(session) {
  if (!appState.officerModalMode) return "";
  const officer = appState.officers.find((item) => item.id === appState.selectedOfficerId);
  const mode = appState.officerModalMode;
  const isReadonly = mode === "detail";
  const title = mode === "add" ? "Tambah Petugas" : mode === "edit" ? "Edit Petugas" : mode === "delete" ? "Hapus Petugas" : "Detail Petugas";
  if (mode === "delete") {
    return `
      <div class="modal-backdrop" role="dialog" aria-modal="true">
        <section class="confirm-modal">
          <h2>${title}</h2>
          <p>Yakin ingin menghapus data <strong>${escapeHtml(officer?.name || "petugas ini")}</strong>?</p>
          <div class="modal-actions">
            <button class="ghost-button" data-close-officer-modal type="button">Batal</button>
            <button class="danger-button" id="confirmOfficerDeleteButton" type="button">Hapus</button>
          </div>
        </section>
      </div>
    `;
  }
  if (mode === "detail" && officer) {
    return `
      <div class="modal-backdrop" role="dialog" aria-modal="true">
        <section class="verification-modal">
          <div class="modal-heading">
            <div><p class="eyebrow">Profil Juru Koin</p><h2>${escapeHtml(officer.name)}</h2></div>
            <button class="close-button" data-close-officer-modal type="button" aria-label="Tutup">x</button>
          </div>
          ${renderOfficerDetail(officer)}
          <div class="modal-actions"><button class="ghost-button" data-close-officer-modal type="button">Tutup</button></div>
        </section>
      </div>
    `;
  }
  const values = officer || { name: "", phone: "", address: "", rt: "", rw: "", area: "", donorCount: "", username: "", role: "petugas", active: true, note: "" };
  return `
    <div class="modal-backdrop" role="dialog" aria-modal="true">
      <form class="donor-form-modal" id="officerForm" novalidate>
        <div class="modal-heading">
          <div><p class="eyebrow">Data Petugas</p><h2>${title}</h2></div>
          <button class="close-button" data-close-officer-modal type="button" aria-label="Tutup">x</button>
        </div>
        <div class="form-grid">
          <label class="field"><span>Nama lengkap petugas</span><input name="name" value="${escapeHtml(values.name)}" required /></label>
          <label class="field"><span>Nomor HP</span><input name="phone" value="${escapeHtml(values.phone)}" /></label>
          <label class="field full"><span>Alamat</span><input name="address" value="${escapeHtml(values.address)}" required /></label>
          <label class="field"><span>RT</span><input name="rt" value="${escapeHtml(values.rt)}" required /></label>
          <label class="field"><span>RW</span><input name="rw" value="${escapeHtml(values.rw)}" required /></label>
          <label class="field full"><span>Wilayah tugas</span><input name="area" value="${escapeHtml(values.area)}" required /></label>
          <label class="field"><span>Jumlah donatur binaan</span><input name="donorCount" type="number" min="0" value="${escapeHtml(values.donorCount)}" /></label>
          <label class="field"><span>Username/email login</span><input name="username" value="${escapeHtml(values.username)}" required /></label>
          <label class="field"><span>Role petugas</span><select name="role">
            <option value="petugas" ${values.role === "petugas" ? "selected" : ""}>Petugas</option>
            <option value="koordinator" ${values.role === "koordinator" ? "selected" : ""}>Koordinator</option>
          </select></label>
          <label class="field"><span>Status</span><select name="active">
            <option value="true" ${values.active ? "selected" : ""}>Aktif</option>
            <option value="false" ${!values.active ? "selected" : ""}>Tidak aktif</option>
          </select></label>
          <label class="field full"><span>Catatan</span><textarea name="note">${escapeHtml(values.note)}</textarea></label>
        </div>
        <p class="form-error" id="officerFormError" role="alert"></p>
        <div class="modal-actions">
          <button class="ghost-button" data-close-officer-modal type="button">Batal</button>
          <button class="primary-button compact" type="submit">${mode === "add" ? "Simpan Petugas" : "Simpan Perubahan"}</button>
        </div>
      </form>
    </div>
  `;
}

export function renderOfficers() {
  const session = getSession();
  if (!session?.role) return navigate("/login");
  const officers = getVisibleOfficers(session);
  const areaOptions = [...new Set(appState.officers.map((officer) => officer.area))].sort();
  renderAppShell(session, "Data Petugas", `
    <section class="officer-hero">
      <div>
        <p class="eyebrow">Juru Koin Ranting</p>
        <h2>Kelola petugas dan wilayah tanggung jawab pengambilan koin.</h2>
        <p>${session.role === "petugas" ? "Petugas hanya melihat profil dirinya sendiri." : session.role === "bendahara" ? "Bendahara dapat memantau data petugas and performa pengambilan." : "Admin dapat menambah, mengubah, dan menghapus data petugas."}</p>
      </div>
      ${canManageOfficers(session.role) ? `<button class="primary-button compact" id="addOfficerButton" type="button">Tambah Petugas</button>` : ""}
    </section>
    ${renderOfficerStats(officers)}
    <section class="panel officer-panel">
      <div class="officer-toolbar">
        <label class="search-field"><span>Cari petugas</span><input id="officerSearch" type="search" value="${escapeHtml(appState.officerSearch)}" placeholder="Cari nama petugas" /></label>
        <label><span>Wilayah tugas</span><select id="officerArea"><option value="all">Semua wilayah</option>${areaOptions.map((area) => `<option value="${escapeHtml(area)}" ${appState.officerArea === area ? "selected" : ""}>${escapeHtml(area)}</option>`).join("")}</select></label>
        <label><span>Status</span><select id="officerStatus"><option value="all">Semua status</option><option value="active" ${appState.officerStatus === "active" ? "selected" : ""}>Aktif</option><option value="inactive" ${appState.officerStatus === "inactive" ? "selected" : ""}>Tidak aktif</option></select></label>
      </div>
      ${renderOfficerList(officers, session)}
    </section>
    ${renderOfficerModal(session)}
  `);
  bindOfficerEvents(session);
}

export function bindOfficerEvents(session) {
  document.querySelector("#addOfficerButton")?.addEventListener("click", () => openOfficerModal("add"));
  [
    ["#officerSearch", "officerSearch", "input"],
    ["#officerArea", "officerArea", "change"],
    ["#officerStatus", "officerStatus", "change"]
  ].forEach(([selector, key, eventName]) => {
    document.querySelector(selector)?.addEventListener(eventName, eventName === "input" ? debounce((event) => {
      appState[key] = event.target.value;
      renderOfficers();
    }, 250) : (event) => {
      appState[key] = event.target.value;
      renderOfficers();
    });
  });
  document.querySelectorAll("[data-officer-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const action = button.dataset.officerAction;
      if ((action === "edit" || action === "delete") && !canManageOfficers(session.role)) return;
      openOfficerModal(action, Number(button.dataset.id));
    });
  });
  document.querySelectorAll("[data-close-officer-modal]").forEach((button) => button.addEventListener("click", closeOfficerModal));
  document.querySelector("#officerForm")?.addEventListener("submit", handleOfficerSubmit);
  document.querySelector("#confirmOfficerDeleteButton")?.addEventListener("click", handleOfficerDelete);
}

export function openOfficerModal(mode, id = null) {
  appState.officerModalMode = mode;
  appState.selectedOfficerId = id;
  renderOfficers();
}

export function closeOfficerModal() {
  appState.officerModalMode = null;
  appState.selectedOfficerId = null;
  renderOfficers();
}

export function handleOfficerSubmit(event) {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const payload = {
    name: String(data.get("name") || "").trim(),
    phone: String(data.get("phone") || "").trim(),
    address: String(data.get("address") || "").trim(),
    rt: String(data.get("rt") || "").trim().padStart(2, "0"),
    rw: String(data.get("rw") || "").trim().padStart(2, "0"),
    area: String(data.get("area") || "").trim(),
    donorCount: Number(data.get("donorCount") || 0),
    username: String(data.get("username") || "").trim(),
    role: String(data.get("role") || "petugas"),
    active: data.get("active") === "true",
    note: String(data.get("note") || "").trim()
  };
  if (!payload.name || !payload.address || !payload.rt || !payload.rw || !payload.area || !payload.username) {
    document.querySelector("#officerFormError").textContent = "Nama, alamat, RT/RW, wilayah tugas, dan username wajib diisi.";
    return;
  }
  let targetOfficer = null;
  if (appState.officerModalMode === "edit") {
    appState.officers = appState.officers.map((officer) => {
      if (officer.id === appState.selectedOfficerId) {
        targetOfficer = { ...officer, ...payload };
        return targetOfficer;
      }
      return officer;
    });
  } else {
    targetOfficer = { id: Date.now(), ...payload };
    appState.officers = [targetOfficer, ...appState.officers];
  }
  syncRowToPostgres("petugas", targetOfficer);
  closeOfficerModal();
}

export async function handleOfficerDelete() {
  if (!await deleteRowFromPostgres("petugas", appState.selectedOfficerId)) return;
  appState.officers = appState.officers.filter((officer) => officer.id !== appState.selectedOfficerId);
  closeOfficerModal();
}

// === 9. PROFILE & BOARD MEMBERS ===
export function renderOrganizationStats() {
  const beneficiaries = new Set(appState.distributions.filter((item) => item.status === "Disalurkan").map((item) => item.recipientName)).size;
  return `
    <section class="org-stats">
      <article><span>Jumlah pengurus</span><strong>${appState.boardMembers.length}</strong></article>
      <article><span>Jumlah petugas</span><strong>${appState.officers.length}</strong></article>
      <article><span>Jumlah donatur</span><strong>${appState.donors.length}</strong></article>
      <article><span>Penerima manfaat</span><strong>${beneficiaries}</strong></article>
    </section>
  `;
}

export function renderProfile() {
  const session = getSession();
  if (!session?.role) {
    navigate("/login");
    return;
  }
  const profile = appState.branchProfile;
  const canEdit = session.role === "admin";

  renderAppShell(session, "Profil Ranting", `
    <section class="org-hero">
      <div>
        <p class="eyebrow">Identitas Organisasi</p>
        <h2>${escapeHtml(profile.branchName)}</h2>
        <p>${escapeHtml(profile.village)}, ${escapeHtml(profile.district)}, ${escapeHtml(profile.regency)}</p>
      </div>
      <div class="report-actions">
        <button class="ghost-button" id="printStructureButton" type="button">Cetak Struktur</button>
        ${canEdit ? `<button class="primary-button compact" id="editProfileButton" type="button">${appState.profileEditMode ? "Batal Edit" : "Edit Profil"}</button>` : ""}
      </div>
    </section>
    ${renderOrganizationStats()}
    <section class="panel org-panel">
      ${appState.profileEditMode && canEdit ? renderProfileForm(profile) : renderProfileDetail(profile)}
    </section>
    ${renderStructurePrint()}
  `);

  document.querySelector("#printStructureButton")?.addEventListener("click", () => window.print());
  document.querySelector("#editProfileButton")?.addEventListener("click", () => {
    appState.profileEditMode = !appState.profileEditMode;
    renderProfile();
  });
  document.querySelector("#cancelProfileEdit")?.addEventListener("click", () => {
    appState.profileEditMode = false;
    renderProfile();
  });
  document.querySelector("#profileForm")?.addEventListener("submit", handleProfileSubmit);
}

export function renderProfileDetail(profile) {
  return `
    <div class="org-logo-row">
      <div><strong>NU</strong><span>Logo NU: ${escapeHtml(profile.nuLogo)}</span></div>
      <div><strong>R</strong><span>Logo Ranting: ${escapeHtml(profile.branchLogo)}</span></div>
    </div>
    <div class="detail-grid">
      <div><span>Nama ranting</span><strong>${escapeHtml(profile.branchName)}</strong></div>
      <div><span>Masa khidmah</span><strong>${escapeHtml(profile.servicePeriod)}</strong></div>
      <div><span>Desa</span><strong>${escapeHtml(profile.village)}</strong></div>
      <div><span>Kecamatan</span><strong>${escapeHtml(profile.district)}</strong></div>
      <div><span>Kabupaten</span><strong>${escapeHtml(profile.regency)}</strong></div>
      <div><span>Provinsi</span><strong>${escapeHtml(profile.province)}</strong></div>
      <div class="full"><span>Alamat sekretariat</span><strong>${escapeHtml(profile.secretariatAddress)}</strong></div>
      <div><span>Nomor telepon</span><strong>${escapeHtml(profile.phone)}</strong></div>
      <div><span>Email</span><strong>${escapeHtml(profile.email)}</strong></div>
    </div>
  `;
}

export function renderProfileForm(profile) {
  const fields = [
    ["branchName", "Nama ranting"],
    ["village", "Nama desa"],
    ["district", "Kecamatan"],
    ["regency", "Kabupaten"],
    ["province", "Provinsi"],
    ["phone", "Nomor telepon"],
    ["email", "Email"],
    ["branchLogo", "Logo ranting"],
    ["nuLogo", "Logo NU"],
    ["servicePeriod", "Masa khidmah"]
  ];
  return `
    <form id="profileForm" class="profile-form">
      <div class="form-grid">
        ${fields.map(([name, label]) => `
          <label class="field">
            <span>${label}</span>
            <input name="${name}" value="${escapeHtml(profile[name])}" required />
          </label>
        `).join("")}
        <label class="field full">
          <span>Alamat sekretariat</span>
          <input name="secretariatAddress" value="${escapeHtml(profile.secretariatAddress)}" required />
        </label>
      </div>
      <div class="modal-actions">
        <button class="ghost-button" type="button" id="cancelProfileEdit">Batal</button>
        <button class="primary-button compact" type="submit">Simpan Profil</button>
      </div>
    </form>
  `;
}

export function handleProfileSubmit(event) {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  Object.keys(appState.branchProfile).forEach((key) => {
    appState.branchProfile[key] = String(data.get(key) || "").trim();
  });
  appState.profileEditMode = false;
  syncProfileToPostgres();
  renderProfile();
}

export function getVisibleBoardMembers() {
  let members = [...appState.boardMembers];
  const search = appState.boardSearch.trim().toLowerCase();
  if (search) {
    members = members.filter((member) => member.name.toLowerCase().includes(search));
  }
  if (appState.boardPosition !== "all") {
    members = members.filter((member) => member.position === appState.boardPosition);
  }
  if (appState.boardStatus !== "all") {
    members = members.filter((member) => member.active === (appState.boardStatus === "active"));
  }
  const boardOrg = appState.boardOrg || "all";
  if (boardOrg !== "all") {
    members = members.filter((member) => (member.organization || "ranting") === boardOrg);
  }
  return members;
}

export function renderBoardMembers() {
  const session = getSession();
  if (!session?.role) {
    navigate("/login");
    return;
  }
  const canEdit = session.role === "admin";
  const members = getVisibleBoardMembers();
  const positions = ["Ketua", "Wakil Ketua", "Sekretaris", "Wakil Sekretaris", "Bendahara", "Wakil Bendahara", "Admin Sistem"];

  renderAppShell(session, "Data Pengurus", `
    <section class="org-hero">
      <div>
        <p class="eyebrow">Struktur Ranting</p>
        <h2>Data pengurus masa khidmah ${escapeHtml(appState.branchProfile.servicePeriod)}</h2>
        <p>Kelola jabatan inti ranting dan identitas pengurus.</p>
      </div>
      ${canEdit ? `<button class="primary-button compact" id="addBoardButton" type="button">Tambah Pengurus</button>` : ""}
    </section>
    ${renderOrganizationStats()}
    <section class="panel org-panel">
      <div class="board-toolbar">
        <label class="search-field"><span>Cari pengurus</span><input id="boardSearch" type="search" value="${escapeHtml(appState.boardSearch)}" placeholder="Cari nama pengurus" /></label>
        <label><span>Organisasi</span><select id="boardOrg"><option value="all" ${!appState.boardOrg || appState.boardOrg === "all" ? "selected" : ""}>Semua Organisasi</option><option value="ranting" ${appState.boardOrg === "ranting" ? "selected" : ""}>Ranting NU (Umum)</option>${BANOM_DATA.map((item) => `<option value="${item.slug}" ${appState.boardOrg === item.slug ? "selected" : ""}>${item.name}</option>`).join("")}</select></label>
        <label><span>Jabatan</span><select id="boardPosition"><option value="all">Semua jabatan</option>${positions.map((position) => `<option value="${position}" ${appState.boardPosition === position ? "selected" : ""}>${position}</option>`).join("")}</select></label>
        <label><span>Status</span><select id="boardStatus"><option value="all">Semua status</option><option value="active" ${appState.boardStatus === "active" ? "selected" : ""}>Aktif</option><option value="inactive" ${appState.boardStatus === "inactive" ? "selected" : ""}>Tidak aktif</option></select></label>
      </div>
      ${renderBoardList(members, session)}
    </section>
    ${renderBoardModal(session)}
  `);
  bindBoardEvents(session);
}

export function renderBoardList(members, session) {
  if (!members.length) {
    return `<div class="empty-state">Data pengurus tidak ditemukan.</div>`;
  }
  const canEdit = session.role === "admin";
  const rows = members.map((member) => `
    <tr>
      <td><strong>${escapeHtml(member.position)}</strong><span>${escapeHtml(member.term)}</span></td>
      <td><strong>${escapeHtml(member.name)}</strong><span>${escapeHtml(member.phone)}</span></td>
      <td>${escapeHtml(member.address)}</td>
      <td>${renderBoardAvatar(member)}</td>
      <td><span class="status-pill ${member.active ? "active" : "inactive"}">${member.active ? "Aktif" : "Tidak aktif"}</span></td>
      <td><div class="row-actions"><button class="icon-button soft" data-board-action="detail" data-id="${member.id}" type="button">Detail</button>${canEdit ? `<button class="icon-button" data-board-action="edit" data-id="${member.id}" type="button">Edit</button><button class="icon-button danger" data-board-action="delete" data-id="${member.id}" type="button">Hapus</button>` : ""}</div></td>
    </tr>
  `).join("");
  const cards = members.map((member) => `
    <article class="board-card">
      <div class="board-person">${renderBoardAvatar(member)}<div><strong>${escapeHtml(member.position)}</strong><span>${escapeHtml(member.name)} - ${escapeHtml(member.phone)}</span></div></div>
      <div class="pickup-card-meta"><span>${escapeHtml(member.term)}</span><span class="status-pill ${member.active ? "active" : "inactive"}">${member.active ? "Aktif" : "Tidak aktif"}</span></div>
      <div class="row-actions"><button class="icon-button soft" data-board-action="detail" data-id="${member.id}" type="button">Detail</button>${canEdit ? `<button class="icon-button" data-board-action="edit" data-id="${member.id}" type="button">Edit</button><button class="icon-button danger" data-board-action="delete" data-id="${member.id}" type="button">Hapus</button>` : ""}</div>
    </article>
  `).join("");
  return `<div class="table-wrap board-table"><table><thead><tr><th>Jabatan</th><th>Nama</th><th>Alamat</th><th>Foto</th><th>Status</th><th>Aksi</th></tr></thead><tbody>${rows}</tbody></table></div><div class="board-card-list">${cards}</div>`;
}

export function renderBoardModal(session) {
  if (!appState.boardModalMode) return "";
  const member = appState.boardMembers.find((item) => item.id === appState.selectedBoardId);
  const mode = appState.boardModalMode;
  const readonly = mode === "detail";
  if (mode === "delete") {
    return `<div class="modal-backdrop" role="dialog" aria-modal="true"><section class="confirm-modal"><h2>Hapus Pengurus</h2><p>Yakin ingin menghapus <strong>${escapeHtml(member?.name || "pengurus ini")}</strong>?</p><div class="modal-actions"><button class="ghost-button" data-close-board-modal type="button">Batal</button><button class="danger-button" id="confirmBoardDeleteButton" type="button">Hapus</button></div></section></div>`;
  }
  const values = member || { position: "Ketua", name: "", phone: "", address: "", photo: "", term: appState.branchProfile.servicePeriod, active: true, organization: "ranting" };
  return `
    <div class="modal-backdrop" role="dialog" aria-modal="true">
      <form class="donor-form-modal" id="boardForm" novalidate>
        <div class="modal-heading"><div><p class="eyebrow">Data Pengurus</p><h2>${mode === "add" ? "Tambah Pengurus" : mode === "edit" ? "Edit Pengurus" : "Detail Pengurus"}</h2></div><button class="close-button" data-close-board-modal type="button" aria-label="Tutup">x</button></div>
        <div class="form-grid">
          <label class="field"><span>Jabatan</span><select name="position" ${readonly ? "disabled" : ""}>${["Ketua", "Wakil Ketua", "Sekretaris", "Wakil Sekretaris", "Bendahara", "Wakil Bendahara", "Admin Sistem"].map((position) => `<option value="${position}" ${values.position === position ? "selected" : ""}>${position}</option>`).join("")}</select></label>
          <label class="field"><span>Nama lengkap</span><input name="name" value="${escapeHtml(values.name)}" ${readonly ? "readonly" : ""} required /></label>
          <label class="field"><span>Nomor HP</span><input name="phone" value="${escapeHtml(values.phone)}" ${readonly ? "readonly" : ""} /></label>
          <label class="field"><span>Masa jabatan</span><input name="term" value="${escapeHtml(values.term)}" ${readonly ? "readonly" : ""} required /></label>
          <label class="field"><span>Organisasi</span><select name="organization" ${readonly ? "disabled" : ""}>
            <option value="ranting" ${values.organization === "ranting" || !values.organization ? "selected" : ""}>Ranting NU (Umum)</option>
            ${BANOM_DATA.map(item => `
              <option value="${item.slug}" ${values.organization === item.slug ? "selected" : ""}>${item.name}</option>
            `).join("")}
          </select></label>
          <label class="field full"><span>Alamat</span><input name="address" value="${escapeHtml(values.address)}" ${readonly ? "readonly" : ""} required /></label>
          ${readonly ? "" : `<label class="field full"><span>Foto pengurus</span><input name="photo" id="boardPhoto" type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" /><small>Opsional. Format JPG, JPEG, PNG, atau WEBP. Maksimal 2 MB.</small></label>`}
          <div class="full" id="boardPhotoPreview">${renderBoardPhotoPreview(values)}</div>
          <label class="field"><span>Status aktif</span><select name="active" ${readonly ? "disabled" : ""}><option value="true" ${values.active ? "selected" : ""}>Aktif</option><option value="false" ${!values.active ? "selected" : ""}>Tidak aktif</option></select></label>
        </div>
        <p class="form-error" id="boardFormError" role="alert"></p>
        <div class="modal-actions"><button class="ghost-button" data-close-board-modal type="button">${readonly ? "Tutup" : "Batal"}</button>${readonly ? "" : `<button class="primary-button compact" type="submit">Simpan Pengurus</button>`}</div>
      </form>
    </div>
  `;
}

export function renderStructurePrint() {
  const profile = appState.branchProfile;
  return `
    <section class="structure-print">
      <header><h1>Struktur Organisasi ${escapeHtml(profile.branchName)}</h1><p>Masa Khidmah ${escapeHtml(profile.servicePeriod)}</p><p>${escapeHtml(profile.village)}, ${escapeHtml(profile.district)}, ${escapeHtml(profile.regency)}</p></header>
      <table><thead><tr><th>Foto</th><th>Jabatan</th><th>Nama</th><th>Nomor HP</th></tr></thead><tbody>${appState.boardMembers.map((member) => `<tr><td>${renderBoardAvatar(member, "print")}</td><td>${escapeHtml(member.position)}</td><td>${escapeHtml(member.name)}</td><td>${escapeHtml(member.phone)}</td></tr>`).join("")}</tbody></table>
    </section>
  `;
}

export function bindBoardEvents(session) {
  document.querySelector("#addBoardButton")?.addEventListener("click", () => openBoardModal("add"));
  [["#boardSearch", "boardSearch", "input"], ["#boardPosition", "boardPosition", "change"], ["#boardStatus", "boardStatus", "change"], ["#boardOrg", "boardOrg", "change"]].forEach(([selector, key, eventName]) => {
    document.querySelector(selector)?.addEventListener(eventName, eventName === "input" ? debounce((event) => {
      appState[key] = event.target.value;
      renderBoardMembers();
    }, 250) : (event) => {
      appState[key] = event.target.value;
      renderBoardMembers();
    });
  });
  document.querySelectorAll("[data-board-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const action = button.dataset.boardAction;
      if ((action === "edit" || action === "delete") && session.role !== "admin") return;
      openBoardModal(action, Number(button.dataset.id));
    });
  });
  document.querySelectorAll("[data-close-board-modal]").forEach((button) => button.addEventListener("click", closeBoardModal));
  document.querySelector("#boardForm")?.addEventListener("submit", handleBoardSubmit);
  bindBoardPhotoPreview();
  document.querySelector("#confirmBoardDeleteButton")?.addEventListener("click", handleBoardDelete);
}

export function bindBoardPhotoPreview() {
  document.querySelector("#boardPhoto")?.addEventListener("change", (event) => {
    const file = event.target.files?.[0];
    const preview = document.querySelector("#boardPhotoPreview");
    const error = document.querySelector("#boardFormError");
    const message = validateImageFile(file);
    if (error) {
      error.textContent = message;
    }
    if (!preview || !file || message) {
      if (message) event.target.value = "";
      return;
    }
    preview.innerHTML = renderBoardPhotoPreview({
      name: document.querySelector("#boardForm [name=name]")?.value || "Pengurus",
      photo: URL.createObjectURL(file)
    });
  });
}

export function openBoardModal(mode, id = null) {
  appState.boardModalMode = mode;
  appState.selectedBoardId = id;
  renderBoardMembers();
}

export function closeBoardModal() {
  appState.boardModalMode = null;
  appState.selectedBoardId = null;
  renderBoardMembers();
}

export async function handleBoardSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const data = new FormData(form);
  const existing = appState.boardMembers.find((member) => member.id === appState.selectedBoardId);
  const photo = form.elements.photo?.files?.[0];
  const photoError = validateImageFile(photo);
  if (photoError) {
    document.querySelector("#boardFormError").textContent = photoError;
    return;
  }
  let uploadedPhoto = null;
  try {
    uploadedPhoto = photo ? await uploadDocumentationPhoto(photo, "pengurus") : null;
  } catch (error) {
    document.querySelector("#boardFormError").textContent = error.message;
    return;
  }
  const payload = {
    position: String(data.get("position") || "Ketua"),
    name: String(data.get("name") || "").trim(),
    phone: String(data.get("phone") || "").trim(),
    address: String(data.get("address") || "").trim(),
    photo: uploadedPhoto?.url || existing?.photo || "",
    term: String(data.get("term") || "").trim(),
    active: data.get("active") === "true",
    organization: String(data.get("organization") || "ranting")
  };
  if (!payload.name || !payload.address || !payload.term) {
    document.querySelector("#boardFormError").textContent = "Nama, alamat, dan masa jabatan wajib diisi.";
    return;
  }
  let targetItem = null;
  if (appState.boardModalMode === "edit") {
    appState.boardMembers = appState.boardMembers.map((member) => {
      if (member.id === appState.selectedBoardId) {
        targetItem = { ...member, ...payload };
        return targetItem;
      }
      return member;
    });
  } else {
    targetItem = { id: Date.now(), ...payload };
    appState.boardMembers = [targetItem, ...appState.boardMembers];
  }
  syncRowToPostgres("pengurus", targetItem);
  closeBoardModal();
}

export async function handleBoardDelete() {
  if (!await deleteRowFromPostgres("pengurus", appState.selectedBoardId)) return;
  appState.boardMembers = appState.boardMembers.filter((member) => member.id !== appState.selectedBoardId);
  closeBoardModal();
}

// === 10. SYSTEM SETTINGS & BANOM EDITOR ===
export function canAccessSettings(role) {
  return role === "admin";
}

export function renderPermissionTable() {
  const rows = [
    ["Lihat dashboard", true, true, true, true],
    ["Kelola donatur", true, true, false, false],
    ["Input pengambilan", true, false, true, false],
    ["Verifikasi setoran", true, true, false, false],
    ["Setoran petugas ke bendahara", true, true, true, true],
    ["Setor ke LAZISNU", true, true, false, true],
    ["Lihat laporan", true, true, false, true],
    ["Kelola penyaluran dana", true, true, false, false],
    ["Kelola petugas", true, false, false, false],
    ["Kelola pengurus", true, false, false, false],
    ["Pengaturan sistem", true, false, false, false]
  ];
  return `
    <div class="table-wrap settings-table">
      <table>
        <thead><tr><th>Hak akses</th><th>Admin</th><th>Bendahara</th><th>Petugas</th><th>Pengurus/Pemantau</th></tr></thead>
        <tbody>${rows.map((row) => `<tr><td>${row[0]}</td>${row.slice(1).map((allowed) => `<td><span class="status-pill ${allowed ? "approved" : "rejected"}">${allowed ? "Ya" : "Tidak"}</span></td>`).join("")}</tr>`).join("")}</tbody>
      </table>
    </div>
  `;
}

export function previewNumber(format) {
  return format.replace("{YYYY}", appState.systemSettings.activeYear).replace("{0001}", "0001");
}

export function renderSettings() {
  const session = getSession();
  if (!session?.role) {
    navigate("/login");
    return;
  }
  if (!canAccessSettings(session.role)) {
    navigate("/dashboard");
    return;
  }

  const settings = appState.systemSettings;
  const canEdit = session.role === "admin";
  renderAppShell(session, "Pengaturan Sistem", `
    <section class="settings-hero">
      <div>
        <p class="eyebrow">Konfigurasi Aplikasi</p>
        <h2>Atur identitas, target, format nomor, laporan, dan tampilan.</h2>
        <p>${canEdit ? "Admin dapat mengubah seluruh pengaturan sistem." : "Mode lihat saja untuk bendahara dan pengurus/pemantau."}</p>
      </div>
      <div class="modal-actions">
        <button class="ghost-button compact" id="togglePasswordForm" type="button">Ubah Password</button>
        ${canEdit ? `<button class="primary-button compact" id="toggleSettingsEdit" type="button">${appState.settingsEditMode ? "Batal Edit" : "Edit Pengaturan"}</button>` : ""}
      </div>
    </section>

    <section class="panel ${appState.passwordEditMode ? "" : "is-hidden"}">
      <h3>Ubah Password</h3>
      <form id="changePasswordForm" class="settings-form">
        <div class="form-grid">
          <label class="field"><span>Password lama</span><input name="currentPassword" type="password" autocomplete="current-password" required /></label>
          <label class="field"><span>Password baru</span><input name="newPassword" type="password" autocomplete="new-password" minlength="8" required /></label>
          <label class="field"><span>Ulangi password baru</span><input name="confirmPassword" type="password" autocomplete="new-password" minlength="8" required /></label>
        </div>
        <small class="error" id="changePasswordError"></small>
        <small class="success" id="changePasswordSuccess"></small>
        <div class="modal-actions"><button class="primary-button compact" type="submit">Simpan Password</button></div>
      </form>
    </section>

    ${appState.settingsEditMode && canEdit ? renderSettingsForm(settings) : renderSettingsDetail(settings)}
    
    <section class="panel org-panel" style="margin-top: 2rem;">
      <div class="org-hero" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem; border-bottom:1px dashed var(--border-light); padding-bottom:1rem;">
        <div>
          <h3>Manajemen Badan Otonom (Banom) NU</h3>
          <p style="font-size:0.85rem; color:var(--neutral-mid); margin-top:4px;">Kelola profil, slug, warna tema, dan identitas sub-portal untuk masing-masing Banom.</p>
        </div>
        ${canEdit ? `<button class="primary-button compact" id="addBanomButton" type="button">Tambah Banom</button>` : ""}
      </div>
      
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Banom</th><th>Slug / URL</th><th>Warna Tema</th><th>Basis Anggota</th><th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            ${BANOM_DATA.map((item) => `
              <tr>
                <td>
                  <strong style="display:block;">${escapeHtml(item.name)}</strong>
                  <span style="font-size:0.75rem; color:var(--neutral-mid); font-style:italic;">"${escapeHtml(item.tagline)}"</span>
                </td>
                <td><code>/banom/${escapeHtml(item.slug)}</code></td>
                <td>
                  <span style="display:inline-flex; align-items:center; gap:8px;">
                    <span style="display:inline-block; width:16px; height:16px; border-radius:50%; background-color:${escapeHtml(item.color)}; border:1px solid #ccc;"></span>
                    <code>${escapeHtml(item.color)}</code>
                  </span>
                </td>
                <td>${escapeHtml(item.basis)}</td>
                <td>
                  <div class="row-actions">
                    ${canEdit ? `
                      <button class="icon-button" data-banom-action="edit" data-slug="${item.slug}" type="button">Edit</button>
                      <button class="icon-button danger" data-banom-action="delete" data-slug="${item.slug}" type="button">Hapus</button>
                    ` : `<span style="font-size:0.8rem; color:var(--neutral-light);">Tidak ada aksi</span>`}
                  </div>
                </td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </section>

    ${renderBanomEditorModal(canEdit)}
  `);

  document.querySelector("#toggleSettingsEdit")?.addEventListener("click", () => {
    appState.settingsEditMode = !appState.settingsEditMode;
    renderSettings();
  });
  document.querySelector("#cancelSettingsEdit")?.addEventListener("click", () => {
    appState.settingsEditMode = false;
    renderSettings();
  });
  document.querySelector("#settingsForm")?.addEventListener("submit", handleSettingsSubmit);
  document.querySelector("#togglePasswordForm")?.addEventListener("click", () => {
    appState.passwordEditMode = !appState.passwordEditMode;
    renderSettings();
  });
  document.querySelector("#changePasswordForm")?.addEventListener("submit", handleChangePasswordSubmit);
  ["pickupNumberFormat", "distributionNumberFormat", "activeYear"].forEach((name) => {
    document.querySelector(`[name="${name}"]`)?.addEventListener("input", updateSettingsPreview);
  });

  // Banom Modal bindings
  document.querySelector("#addBanomButton")?.addEventListener("click", () => openBanomModal("add"));
  document.querySelector("#closeBanomModalButton")?.addEventListener("click", closeBanomModal);
  document.querySelector("#cancelBanomFormButton")?.addEventListener("click", closeBanomModal);
  document.querySelector("#banomForm")?.addEventListener("submit", handleBanomSubmit);
  document.querySelector("#confirmBanomDeleteButton")?.addEventListener("click", handleBanomDelete);
  
  document.querySelectorAll("[data-banom-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const action = button.dataset.banomAction;
      const slug = button.dataset.slug;
      if (action === "edit") {
        openBanomModal("edit", slug);
      } else if (action === "delete") {
        openBanomModal("delete", slug);
      }
    });
  });

  document.querySelector("#banomFormName")?.addEventListener("input", (e) => {
    if (appState.banomModalMode === "add") {
      const slugInput = document.querySelector("#banomFormSlug");
      if (slugInput) {
        slugInput.value = e.target.value
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, "")
          .replace(/\s+/g, "-")
          .replace(/-+/g, "-");
      }
    }
  });

  document.querySelector("#banomIconPreset")?.addEventListener("change", (e) => {
    const customField = document.querySelector("#banomCustomIconField");
    if (customField) {
      if (e.target.value === "custom") {
        customField.classList.remove("is-hidden");
      } else {
        customField.classList.add("is-hidden");
      }
    }
  });
}

export function renderSettingsDetail(settings) {
  return `
    <section class="settings-grid">
      ${renderSettingsPanel("Identitas Aplikasi", [
        ["Nama aplikasi", settings.appName],
        ["Slogan", settings.appSlogan],
        ["Nama ranting", settings.branchName],
        ["Logo aplikasi", settings.appLogo],
        ["Warna utama", settings.primaryColor],
        ["Alamat sekretariat", settings.secretariatAddress],
        ["Email", settings.email],
        ["Nomor HP admin", settings.adminPhone]
      ])}
      <article class="settings-panel"><h3>Role dan Hak Akses</h3>${renderPermissionTable()}</article>
      ${renderSettingsPanel("Tahun/Periode & Target Koin", [
        ["Tahun aktif", settings.activeYear],
        ["Periode aktif", settings.activePeriod],
        ["Target pemasukan bulanan", formatRupiah(settings.monthlyCoinTarget)],
        ["Target donatur aktif", settings.activeDonorTarget],
        ["Target penyaluran dana", formatRupiah(settings.distributionTarget)],
        ["Target saldo aman kas", formatRupiah(settings.safeCashTarget)]
      ])}
      ${renderSettingsPanel("Format Nomor Transaksi", [
        ["Format pengambilan", settings.pickupNumberFormat],
        ["Preview pengambilan", previewNumber(settings.pickupNumberFormat)],
        ["Format penyaluran", settings.distributionNumberFormat],
        ["Preview penyaluran", previewNumber(settings.distributionNumberFormat)]
      ])}
      ${renderSettingsPanel("Pengaturan Laporan", [
        ["Penanda tangan ketua", settings.reportChairName],
        ["Penanda tangan bendahara", settings.reportTreasurerName],
        ["Format kop laporan", settings.reportHeaderFormat],
        ["Tampilkan logo NU", settings.showNuLogo ? "Ya" : "Tidak"],
        ["Tampilkan logo ranting", settings.showBranchLogo ? "Ya" : "Tidak"],
        ["Footer laporan", settings.reportFooter]
      ])}
      ${renderSettingsPanel("Pengaturan Tampilan", [
        ["Mode hijau NU", settings.greenMode ? "Aktif" : "Nonaktif"],
        ["Mode terang/gelap", settings.themeMode],
        ["Ukuran font", settings.fontSizeMode],
        ["Mode sederhana petugas", settings.simpleOfficerMode ? "Aktif" : "Nonaktif"]
      ])}
    </section>
  `;
}

export function renderSettingsPanel(title, items) {
  return `<article class="settings-panel"><h3>${title}</h3>${items.map(([label, value]) => `<div><span>${label}</span><strong>${escapeHtml(value)}</strong></div>`).join("")}</article>`;
}

export function openBanomModal(mode, slug = null) {
  appState.banomModalMode = mode;
  appState.selectedBanomSlug = slug;
  renderSettings();
}

export function closeBanomModal() {
  appState.banomModalMode = null;
  appState.selectedBanomSlug = null;
  renderSettings();
}

export async function handleBanomSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const data = new FormData(form);
  
  const name = String(data.get("name") || "").trim();
  const slug = String(data.get("slug") || "").trim().toLowerCase();
  const tagline = String(data.get("tagline") || "").trim();
  const color = String(data.get("color") || "#0b6b3a").trim();
  const basis = String(data.get("basis") || "").trim();
  const desc = String(data.get("desc") || "").trim();
  
  const tags = String(data.get("tags") || "")
    .split(",")
    .map(t => t.trim())
    .filter(Boolean);
    
  const presetVal = data.get("iconPreset");
  let icon = "";
  if (presetVal === "custom") {
    icon = String(data.get("iconCustom") || "").trim();
  } else {
    const iconPresets = [
      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`,
      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M12 14c-6 0-9 3-9 4v1h18v-1c0-1-3-4-9-4z"/></svg>`,
      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`,
      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a5 5 0 1 0 0 10 5 5 0 0 0 0-10z"/><path d="M12 14c-5 0-9 2.5-9 4v2h18v-2c0-1.5-4-4-9-4z"/></svg>`,
      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>`,
      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>`,
      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>`,
      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`
    ];
    icon = iconPresets[Number(presetVal)] || iconPresets[9];
  }

  const errorText = document.querySelector("#banomFormError");
  if (!name || !slug || !tagline || !basis || !desc || !color) {
    if (errorText) errorText.textContent = "Semua field wajib diisi.";
    return;
  }
  
  if (slug === "ranting" || slug === "all") {
    if (errorText) errorText.textContent = "Slug ini diproteksi oleh sistem.";
    return;
  }
  
  if (appState.banomModalMode === "add") {
    const exists = BANOM_DATA.some(b => b.slug === slug);
    if (exists) {
      if (errorText) errorText.textContent = `Banom dengan slug "${slug}" sudah ada.`;
      return;
    }
  }

  const payload = { slug, name, tagline, desc, basis, color, tags, icon };

  if (appState.banomModalMode === "edit") {
    BANOM_DATA.length = 0;
    BANOM_DATA.push(...BANOM_DATA.map((b) => b.slug === appState.selectedBanomSlug ? payload : b));
  } else {
    BANOM_DATA.push(payload);
  }

  appState.systemSettings.banomList = BANOM_DATA;
  await syncSettingsToPostgres();
  closeBanomModal();
}

export async function handleBanomDelete() {
  const slug = appState.selectedBanomSlug;
  if (!slug) return;
  
  const filtered = BANOM_DATA.filter((b) => b.slug !== slug);
  BANOM_DATA.length = 0;
  BANOM_DATA.push(...filtered);
  appState.systemSettings.banomList = BANOM_DATA;
  await syncSettingsToPostgres();
  closeBanomModal();
}

export function renderBanomEditorModal(canEdit) {
  if (!appState.banomModalMode || !canEdit) return "";
  const banom = BANOM_DATA.find((item) => item.slug === appState.selectedBanomSlug);
  const mode = appState.banomModalMode;
  if (mode === "delete") {
    return `
      <div class="modal-backdrop" role="dialog" aria-modal="true">
        <section class="confirm-modal">
          <h2>Hapus Badan Otonom</h2>
          <p>Yakin ingin menghapus Banom <strong>${escapeHtml(banom?.name || "")}</strong>? Seluruh data berita, pengurus, dan galeri yang terhubung dengan slug <code>${escapeHtml(banom?.slug || "")}</code> tidak akan muncul lagi di halaman sub-portal.</p>
          <div class="modal-actions">
            <button class="ghost-button" id="closeBanomModalButton" type="button">Batal</button>
            <button class="danger-button" id="confirmBanomDeleteButton" type="button">Hapus Permanen</button>
          </div>
        </section>
      </div>
    `;
  }
  const values = banom || { name: "", slug: "", tagline: "", desc: "", basis: "", color: "#0b6b3a", tags: [], icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>` };
  const iconPresets = [
    { name: "Benteng / Perisai (GP Ansor)", svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>` },
    { name: "Kasih Sayang / Hati (Muslimat)", svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>` },
    { name: "Kepemudaan / Profil (Fatayat)", svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M12 14c-6 0-9 3-9 4v1h18v-1c0-1-3-4-9-4z"/></svg>` },
    { name: "Buku Pelajar (IPNU)", svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>` },
    { name: "Kader Putri / Perempuan (IPPNU)", svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a5 5 0 1 0 0 10 5 5 0 0 0 0-10z"/><path d="M12 14c-5 0-9 2.5-9 4v2h18v-2c0-1.5-4-4-9-4z"/></svg>` },
    { name: "Kilat / Seni Bela Diri (Pagar Nusa)", svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>` },
    { name: "Waktu / Dzikir (JATMAN)", svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>` },
    { name: "Al-Qur'an / Membaca (JQH)", svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>` },
    { name: "Topi Toga / Pendidikan (Pergunu)", svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>` },
    { name: "Default (Bintang)", svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>` }
  ];
  const activePresetIdx = iconPresets.findIndex(p => p.svg.trim() === values.icon.trim());
  const selectedPreset = activePresetIdx >= 0 ? activePresetIdx : "custom";
  return `
    <div class="modal-backdrop" role="dialog" aria-modal="true">
      <form class="donor-form-modal" id="banomForm" style="max-width: 600px;" novalidate>
        <div class="modal-heading">
          <div><p class="eyebrow">Organisasi Banom</p><h2>${mode === "add" ? "Tambah Badan Otonom" : "Edit Badan Otonom"}</h2></div>
          <button class="close-button" id="closeBanomModalButton" type="button" aria-label="Tutup">x</button>
        </div>
        <div class="form-grid">
          <label class="field"><span>Nama Banom</span><input name="name" id="banomFormName" value="${escapeHtml(values.name)}" placeholder="Contoh: Muslimat NU" required /></label>
          <label class="field"><span>Slug URL (huruf kecil, tanpa spasi)</span><input name="slug" id="banomFormSlug" value="${escapeHtml(values.slug)}" placeholder="Contoh: muslimat" ${mode === "edit" ? "readonly style='background:var(--border-light);'" : ""} required /></label>
          <label class="field"><span>Tagline</span><input name="tagline" value="${escapeHtml(values.tagline)}" placeholder="Contoh: Ibu Umat, Penggerak Keluarga" required /></label>
          <label class="field"><span>Warna Tema (HEX)</span>
            <div style="display:flex; gap:8px;">
              <input type="color" name="color_picker" value="${values.color.startsWith("#") ? values.color : "#0b6b3a"}" onchange="document.getElementById('banomColorInput').value = this.value" style="width:40px; height:40px; border-radius:4px; padding:0; border:1px solid var(--border-light); cursor:pointer;" />
              <input name="color" id="banomColorInput" value="${escapeHtml(values.color)}" placeholder="#0b6b3a" style="flex:1;" required />
            </div>
          </label>
          <label class="field full"><span>Basis Anggota</span><input name="basis" value="${escapeHtml(values.basis)}" placeholder="Contoh: Perempuan NU dewasa" required /></label>
          <label class="field full"><span>Deskripsi / Profil Lengkap</span><textarea name="desc" style="height:100px;" required>${escapeHtml(values.desc)}</textarea></label>
          <label class="field full"><span>Tags / Kategori Kegiatan (pisahkan dengan koma)</span><input name="tags" value="${escapeHtml(Array.isArray(values.tags) ? values.tags.join(", ") : "")}" placeholder="Contoh: Majelis Taklim, Posyandu, Santunan" required /></label>
          <label class="field full"><span>Ikon Representatif</span><select name="iconPreset" id="banomIconPreset">
            ${iconPresets.map((p, idx) => `<option value="${idx}" ${selectedPreset === idx ? "selected" : ""}>${p.name}</option>`).join("")}
            <option value="custom" ${selectedPreset === "custom" ? "selected" : ""}>Kustom Kode SVG</option>
          </select></label>
          <label class="field full ${selectedPreset === "custom" ? "" : "is-hidden"}" id="banomCustomIconField"><span>Kode SVG Ikon Kustom</span><textarea name="iconCustom" style="height:80px; font-family:monospace; font-size:0.8rem;">${escapeHtml(values.icon)}</textarea></label>
        </div>
        <p class="form-error" id="banomFormError" role="alert"></p>
        <div class="modal-actions">
          <button class="ghost-button" id="cancelBanomFormButton" type="button">Batal</button>
          <button class="primary-button compact" type="submit">Simpan Banom</button>
        </div>
      </form>
    </div>
  `;
}

export function renderSettingsForm(settings) {
  return `
    <form id="settingsForm" class="settings-form">
      <section class="settings-grid">
        <article class="settings-panel"><h3>Identitas Aplikasi</h3><div class="form-grid">
          ${[
            ["appName", "Nama aplikasi"], ["appSlogan", "Slogan aplikasi"], ["branchName", "Nama ranting"], ["appLogo", "Logo aplikasi"], ["primaryColor", "Warna utama"], ["email", "Email"], ["adminPhone", "Nomor HP admin"]
          ].map(([name, label]) => `<label class="field"><span>${label}</span><input name="${name}" value="${escapeHtml(settings[name])}" required /></label>`).join("")}
          <label class="field full"><span>Alamat sekretariat</span><input name="secretariatAddress" value="${escapeHtml(settings.secretariatAddress)}" required /></label>
        </div></article>
        <article class="settings-panel"><h3>Role dan Hak Akses</h3>${renderPermissionTable()}</article>
        <article class="settings-panel"><h3>Tahun/Periode & Target Koin</h3><div class="form-grid">
          <label class="field"><span>Tahun aktif</span><input name="activeYear" value="${escapeHtml(settings.activeYear)}" required /></label>
          <label class="field"><span>Periode aktif</span><input name="activePeriod" value="${escapeHtml(settings.activePeriod)}" required /></label>
          <label class="field"><span>Target pemasukan bulanan</span><input name="monthlyCoinTarget" type="number" value="${settings.monthlyCoinTarget}" /></label>
          <label class="field"><span>Target jumlah donatur aktif</span><input name="activeDonorTarget" type="number" value="${settings.activeDonorTarget}" /></label>
          <label class="field"><span>Target penyaluran dana</span><input name="distributionTarget" type="number" value="${settings.distributionTarget}" /></label>
          <label class="field"><span>Target saldo aman kas</span><input name="safeCashTarget" type="number" value="${settings.safeCashTarget}" /></label>
        </div></article>
        <article class="settings-panel"><h3>Format Nomor Transaksi</h3><div class="form-grid">
          <label class="field"><span>Format pengambilan</span><input name="pickupNumberFormat" value="${escapeHtml(settings.pickupNumberFormat)}" /></label>
          <label class="field"><span>Preview pengambilan</span><input id="pickupNumberPreview" value="${escapeHtml(previewNumber(settings.pickupNumberFormat))}" readonly /></label>
          <label class="field"><span>Format penyaluran</span><input name="distributionNumberFormat" value="${escapeHtml(settings.distributionNumberFormat)}" /></label>
          <label class="field"><span>Preview penyaluran</span><input id="distributionNumberPreview" value="${escapeHtml(previewNumber(settings.distributionNumberFormat))}" readonly /></label>
        </div></article>
        <article class="settings-panel"><h3>Pengaturan Laporan</h3><div class="form-grid">
          <label class="field"><span>Nama penanda tangan ketua</span><input name="reportChairName" value="${escapeHtml(settings.reportChairName)}" /></label>
          <label class="field"><span>Nama penanda tangan bendahara</span><input name="reportTreasurerName" value="${escapeHtml(settings.reportTreasurerName)}" /></label>
          <label class="field full"><span>Format kop laporan</span><input name="reportHeaderFormat" value="${escapeHtml(settings.reportHeaderFormat)}" /></label>
          <label class="field"><span>Tampilkan logo NU</span><select name="showNuLogo"><option value="true" ${settings.showNuLogo ? "selected" : ""}>Ya</option><option value="false" ${!settings.showNuLogo ? "selected" : ""}>Tidak</option></select></label>
          <label class="field"><span>Tampilkan logo ranting</span><select name="showBranchLogo"><option value="true" ${settings.showBranchLogo ? "selected" : ""}>Ya</option><option value="false" ${!settings.showBranchLogo ? "selected" : ""}>Tidak</option></select></label>
          <label class="field full"><span>Footer laporan</span><input name="reportFooter" value="${escapeHtml(settings.reportFooter)}" /></label>
        </div></article>
        <article class="settings-panel"><h3>Pengaturan Tampilan</h3><div class="form-grid">
          <label class="field"><span>Mode hijau NU</span><select name="greenMode"><option value="true" ${settings.greenMode ? "selected" : ""}>Aktif</option><option value="false" ${!settings.greenMode ? "selected" : ""}>Nonaktif</option></select></label>
          <label class="field"><span>Mode terang/gelap</span><select name="themeMode"><option ${settings.themeMode === "Terang" ? "selected" : ""}>Terang</option><option ${settings.themeMode === "Gelap" ? "selected" : ""}>Gelap</option></select></label>
          <label class="field"><span>Ukuran font</span><select name="fontSizeMode"><option ${settings.fontSizeMode === "Normal" ? "selected" : ""}>Normal</option><option ${settings.fontSizeMode === "Besar" ? "selected" : ""}>Besar</option></select></label>
          <label class="field"><span>Mode sederhana petugas</span><select name="simpleOfficerMode"><option value="true" ${settings.simpleOfficerMode ? "selected" : ""}>Aktif</option><option value="false" ${!settings.simpleOfficerMode ? "selected" : ""}>Nonaktif</option></select></label>
        </div></article>
      </section>
      <div class="modal-actions"><button class="ghost-button" id="cancelSettingsEdit" type="button">Batal</button><button class="primary-button compact" type="submit">Simpan Pengaturan</button></div>
    </form>
  `;
}

export function updateSettingsPreview() {
  const year = document.querySelector('[name="activeYear"]')?.value || appState.systemSettings.activeYear;
  const pickupFormat = document.querySelector('[name="pickupNumberFormat"]')?.value || "";
  const distributionFormat = document.querySelector('[name="distributionNumberFormat"]')?.value || "";
  const pickupPreview = document.querySelector("#pickupNumberPreview");
  const distributionPreview = document.querySelector("#distributionNumberPreview");
  if (pickupPreview) pickupPreview.value = pickupFormat.replace("{YYYY}", year).replace("{0001}", "0001");
  if (distributionPreview) distributionPreview.value = distributionFormat.replace("{YYYY}", year).replace("{0001}", "0001");
}

export function handleSettingsSubmit(event) {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const numericFields = ["monthlyCoinTarget", "activeDonorTarget", "distributionTarget", "safeCashTarget"];
  Object.keys(appState.systemSettings).forEach((key) => {
    if (numericFields.includes(key)) {
      appState.systemSettings[key] = Number(data.get(key) || 0);
    } else if (["showNuLogo", "showBranchLogo", "greenMode", "simpleOfficerMode"].includes(key)) {
      appState.systemSettings[key] = data.get(key) === "true";
    } else {
      appState.systemSettings[key] = String(data.get(key) || "").trim();
    }
  });
  appState.settingsEditMode = false;
  syncSettingsToPostgres();
  renderSettings();
}

export async function handleChangePasswordSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const data = new FormData(form);
  const error = document.querySelector("#changePasswordError");
  const success = document.querySelector("#changePasswordSuccess");
  if (error) error.textContent = "";
  if (success) success.textContent = "";
  const payload = {
    currentPassword: String(data.get("currentPassword") || ""),
    newPassword: String(data.get("newPassword") || ""),
    confirmPassword: String(data.get("confirmPassword") || "")
  };
  const parsed = changePasswordSchema.safeParse(payload);
  if (!parsed.success) { if (error) error.textContent = parsed.error.issues[0]?.message || "Password tidak valid."; return; }
  try {
    await internalRequest("change-password", { method: "POST", body: JSON.stringify({ currentPassword: parsed.data.currentPassword, newPassword: parsed.data.newPassword }) });
    form.reset();
    if (success) success.textContent = "Password berhasil diubah.";
  } catch (err) {
    if (error) error.textContent = err.message || "Password gagal diubah.";
  }
}

// === 11. USER MANAGEMENT ===
export function getVisibleUsers() {
  return appState.users.filter((user) => {
    const search = appState.userSearch.toLowerCase();
    const matchesSearch = user.fullName.toLowerCase().includes(search) || String(user.username || "").toLowerCase().includes(search) || user.email.toLowerCase().includes(search);
    const matchesRole = appState.userRole === "all" || user.role === appState.userRole;
    const matchesStatus = appState.userStatus === "all" || user.status === appState.userStatus;
    return matchesSearch && matchesRole && matchesStatus;
  });
}

export function renderUsers() {
  const session = getSession();
  if (!session?.role) {
    navigate("/login");
    return;
  }
  if (!canManageUsers(session.role)) {
    navigate("/dashboard");
    return;
  }

  const users = getVisibleUsers();
  renderAppShell(session, "Kelola User", `
    <section class="settings-hero">
      <div>
        <p class="eyebrow">database internal</p>
        <h2>Kelola profil user, role, dan status akses.</h2>
        <p>Password tetap dikelola oleh database internal. Halaman ini hanya menyimpan profil dan hak akses aplikasi.</p>
      </div>
      <button class="primary-button compact" id="addUserButton" type="button">Tambah User</button>
    </section>

    <section class="panel officer-panel">
      <div class="officer-toolbar">
        <label class="search-field">
          <span>Cari user</span>
          <input id="userSearch" type="search" value="${escapeHtml(appState.userSearch)}" placeholder="Cari nama, username, atau email" />
        </label>
        <label>
          <span>Role</span>
          <select id="userRole">
            <option value="all">Semua role</option>
            ${roles.map((role) => `<option value="${role}" ${appState.userRole === role ? "selected" : ""}>${labelRole(role)}</option>`).join("")}
          </select>
        </label>
        <label>
          <span>Status</span>
          <select id="userStatus">
            <option value="all">Semua status</option>
            <option value="aktif" ${appState.userStatus === "aktif" ? "selected" : ""}>Aktif</option>
            <option value="tidak_aktif" ${appState.userStatus === "tidak_aktif" ? "selected" : ""}>Tidak aktif</option>
          </select>
        </label>
      </div>
      ${renderUserTable(users)}
    </section>
    ${renderUserModal()}
  `);

  bindUserEvents();
}

export function renderUserTable(users) {
  return `
    <div class="table-wrap officer-table">
      <table>
        <thead><tr><th>Nama</th><th>Username</th><th>Email</th><th>HP</th><th>Role</th><th>Status</th><th>Dibuat</th><th>Aksi</th></tr></thead>
        <tbody>
          ${users.map((user) => `
            <tr>
              <td><strong>${escapeHtml(user.fullName)}</strong></td>
              <td>${escapeHtml(user.username || user.id)}</td>
              <td>${escapeHtml(user.email)}</td>
              <td>${escapeHtml(user.phone || "-")}</td>
              <td>${labelRole(user.role)}</td>
              <td><span class="status-pill ${user.status === "aktif" ? "approved" : "rejected"}">${user.status === "aktif" ? "Aktif" : "Tidak aktif"}</span></td>
              <td>${formatDateId(String(user.createdAt || "").slice(0, 10))}</td>
              <td class="row-actions">
                <button class="ghost-button small" data-user-action="edit" data-id="${user.id}" type="button">Edit</button>
                <button class="ghost-button small" data-user-action="reset" data-id="${user.id}" type="button">Reset</button>
              </td>
            </tr>
          `).join("") || `<tr><td colspan="8">Belum ada user sesuai filter.</td></tr>`}
        </tbody>
      </table>
    </div>
    <div class="officer-card-list">
      ${users.map((user) => `
        <article class="officer-card">
          <div><strong>${escapeHtml(user.fullName)}</strong><span>${escapeHtml(user.username || user.id)} - ${escapeHtml(user.email)}</span></div>
          <p>${escapeHtml(user.phone || "-")} - ${labelRole(user.role)}</p>
          <div class="card-meta"><span>${user.status === "aktif" ? "Aktif" : "Tidak aktif"}</span><span>${formatDateId(String(user.createdAt || "").slice(0, 10))}</span></div>
          <div class="card-actions">
            <button class="ghost-button small" data-user-action="edit" data-id="${user.id}" type="button">Edit</button>
            <button class="ghost-button small" data-user-action="reset" data-id="${user.id}" type="button">Reset Password</button>
          </div>
        </article>
      `).join("") || `<article class="officer-card"><strong>Belum ada user</strong><span>Ubah filter atau tambah user baru.</span></article>`}
    </div>
  `;
}

export function renderUserModal() {
  const mode = appState.userModalMode;
  if (!mode) return "";
  const user = appState.users.find((item) => item.id === appState.selectedUserId);
  const values = user || { id: "", username: "", fullName: "", email: "", phone: "", role: "petugas", status: "aktif" };
  const title = mode === "add" ? "Tambah User" : "Edit User";
  return `
    <div class="modal-backdrop">
      <form class="donor-form-modal" id="userForm">
        <div class="modal-heading">
          <div>
            <p class="eyebrow">Kelola User</p>
            <h2>${title}</h2>
            <p>Kelola profil user internal. Password awal dibuat server jika belum diisi.</p>
          </div>
          <button class="icon-button" data-close-user-modal type="button" aria-label="Tutup">x</button>
        </div>
        <div class="form-grid">
          <label class="field full">
            <span>User ID</span>
            <input name="id" value="${escapeHtml(values.id)}" ${mode === "edit" ? "readonly" : ""} placeholder="UUID user dari database internal" required />
          </label>
          <label class="field"><span>Username Login</span><input name="username" value="${escapeHtml(values.username || values.id)}" placeholder="admin" required /></label>
          <label class="field"><span>Nama lengkap</span><input name="fullName" value="${escapeHtml(values.fullName)}" required /></label>
          <label class="field"><span>Email Kontak</span><input name="email" type="email" value="${escapeHtml(values.email)}" /></label>
          <label class="field"><span>Nomor HP</span><input name="phone" value="${escapeHtml(values.phone || "")}" /></label>
          <label class="field"><span>Role</span><select name="role">${roles.map((role) => `<option value="${role}" ${values.role === role ? "selected" : ""}>${labelRole(role)}</option>`).join("")}</select></label>
          <label class="field"><span>Status</span><select name="status"><option value="aktif" ${values.status === "aktif" ? "selected" : ""}>Aktif</option><option value="tidak_aktif" ${values.status === "tidak_aktif" ? "selected" : ""}>Tidak aktif</option></select></label>
        </div>
        <p class="form-error" id="userFormError" role="alert"></p>
        <div class="modal-actions">
          <button class="ghost-button" data-close-user-modal type="button">Batal</button>
          <button class="primary-button compact" type="submit">Simpan User</button>
        </div>
      </form>
    </div>
  `;
}

export function bindUserEvents() {
  document.querySelector("#addUserButton")?.addEventListener("click", () => openUserModal("add"));
  document.querySelector("#userSearch")?.addEventListener("input", debounce((event) => {
    appState.userSearch = event.target.value;
    renderUsers();
  }, 250));
  document.querySelector("#userRole")?.addEventListener("change", (event) => {
    appState.userRole = event.target.value;
    renderUsers();
  });
  document.querySelector("#userStatus")?.addEventListener("change", (event) => {
    appState.userStatus = event.target.value;
    renderUsers();
  });
  document.querySelectorAll("[data-user-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const action = button.dataset.userAction;
      const id = button.dataset.id;
      if (action === "edit") {
        openUserModal("edit", id);
      }
      if (action === "reset") {
        handleUserReset(id);
      }
    });
  });
  document.querySelectorAll("[data-close-user-modal]").forEach((button) => button.addEventListener("click", closeUserModal));
  document.querySelector("#userForm")?.addEventListener("submit", handleUserSubmit);
}

export function openUserModal(mode, id = null) {
  appState.userModalMode = mode;
  appState.selectedUserId = id;
  renderUsers();
}

export function closeUserModal() {
  appState.userModalMode = null;
  appState.selectedUserId = null;
  renderUsers();
}

export function handleUserSubmit(event) {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const payload = {
    id: String(data.get("id") || "").trim(),
    username: String(data.get("username") || "").trim().toLowerCase(),
    fullName: String(data.get("fullName") || "").trim(),
    email: String(data.get("email") || "").trim(),
    phone: String(data.get("phone") || "").trim(),
    role: String(data.get("role") || "petugas"),
    status: String(data.get("status") || "aktif"),
    createdAt: new Date().toISOString()
  };

  if (!payload.id || !payload.username || !payload.fullName) {
    document.querySelector("#userFormError").textContent = "User ID, username, dan nama wajib diisi.";
    return;
  }

  const duplicate = appState.users.some((user) => {
    if (user.id === appState.selectedUserId) return false;
    const sameId = user.id === payload.id;
    const sameUsername = String(user.username || "").toLowerCase() === payload.username;
    const sameEmail = payload.email && user.email === payload.email;
    return sameId || sameUsername || sameEmail;
  });
  if (duplicate) {
    document.querySelector("#userFormError").textContent = "User ID, username, atau email sudah dipakai.";
    return;
  }

  let targetUser = null;
  if (appState.userModalMode === "edit") {
    appState.users = appState.users.map((user) => {
      if (user.id === appState.selectedUserId) {
        targetUser = { ...user, ...payload, createdAt: user.createdAt };
        return targetUser;
      }
      return user;
    });
  } else {
    targetUser = payload;
    appState.users = [targetUser, ...appState.users];
  }
  syncRowToPostgres("profiles", targetUser);
  closeUserModal();
}

export async function handleUserReset(id) {
  const user = appState.users.find((item) => item.id === id);
  if (!user) return;
  if (!hasPostgresConfig()) {
    alert(`Reset password internal belum tersedia untuk ${user.email}.`);
    return;
  }
  try {
    await postgresAuthRequest("recover", {
      method: "POST",
      body: JSON.stringify({ email: user.email })
    });
    alert(`Instruksi reset password dikirim ke ${user.email} jika email terdaftar.`);
  } catch {
    alert("Reset password belum berhasil. Cek konfigurasi email database internal.");
  }
}

// === 12. NEWS MANAGEMENT ===
// Expose filterNewsList globally as it is called from inline HTML attributes
window.filterNewsList = function(val) {
  appState.newsFilterOrg = val;
  renderNewsAdmin();
};

export function renderNewsAdmin() {
  const session = getSession();
  if (!session?.role) return navigate("/login");
  const canManage = canManagePublicContent(session.role);
  const editing = appState.news.find((item) => String(item.id) === String(appState.selectedNewsId));
  
  let filteredNews = appState.news;
  if (appState.newsFilterOrg && appState.newsFilterOrg !== "all") {
    filteredNews = filteredNews.filter(item => (item.organization || "ranting") === appState.newsFilterOrg);
  }

  renderAppShell(session, "Berita", `
    <section class="public-panel">
      <div class="panel-heading">
        <div><p class="eyebrow">Publikasi</p><h2>Kelola berita landing page</h2></div>
        <div style="display:flex; gap:10px; align-items:center;">
          <select id="filterNewsOrganization" class="select-filter" style="padding:0.4rem 0.8rem; border:1px solid var(--border-light); border-radius:4px; font-weight:600; font-size:0.85rem;" onchange="filterNewsList(this.value)">
            <option value="all" ${!appState.newsFilterOrg || appState.newsFilterOrg === "all" ? "selected" : ""}>Semua Organisasi</option>
            <option value="ranting" ${appState.newsFilterOrg === "ranting" ? "selected" : ""}>Ranting NU (Umum)</option>
            ${BANOM_DATA.map(item => `
              <option value="${item.slug}" ${appState.newsFilterOrg === item.slug ? "selected" : ""}>${item.name}</option>
            `).join("")}
          </select>
          ${canManage ? `<button class="primary-button compact" id="addNewsButton" type="button">Tambah Berita</button>` : ""}
        </div>
      </div>
      <div class="gallery-grid">${renderNewsCards(filteredNews.sort((a, b) => String(b.date).localeCompare(String(a.date))), canManage)}</div>
    </section>
    ${canManage && appState.newsModalOpen ? `
      <section class="public-panel">
        <div class="panel-heading"><div><p class="eyebrow">Form Berita</p><h2>${editing ? "Edit" : "Tambah"} Berita</h2></div></div>
        <form class="public-upload-form" id="newsForm">
          <div class="form-grid">
            <label class="field"><span>Judul</span><input name="title" value="${escapeHtml(editing?.title || "")}" required /></label>
            <label class="field"><span>Kategori</span><input name="category" value="${escapeHtml(editing?.category || "Kegiatan Ranting")}" required /></label>
            <label class="field"><span>Tanggal</span><input name="date" type="date" value="${escapeHtml(editing?.date || getLocalDateString())}" required /></label>
            <label class="field"><span>Organisasi Target</span><select name="organization">
              <option value="ranting" ${editing?.organization === "ranting" || !editing?.organization ? "selected" : ""}>Ranting NU (Umum)</option>
              ${BANOM_DATA.map(item => `
                <option value="${item.slug}" ${editing?.organization === item.slug ? "selected" : ""}>${item.name}</option>
              `).join("")}
            </select></label>
            <label class="field"><span>Status</span><select name="status"><option value="published" ${editing?.status !== "draft" ? "selected" : ""}>published</option><option value="draft" ${editing?.status === "draft" ? "selected" : ""}>draft</option></select></label>
            <label class="field"><span>Gambar</span><input name="image" id="newsImage" type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" /></label>
          </div>
          <label class="field"><span>Ringkasan</span><textarea name="excerpt" required>${escapeHtml(editing?.excerpt || "")}</textarea></label>
          <label class="field"><span>Konten</span><textarea name="content" required>${escapeHtml(editing?.content || "")}</textarea></label>
          <div id="newsImagePreview">${renderPhotoPreview(editing?.imageUrl || "", editing?.title || "Preview gambar berita")}</div>
          <p class="form-error" id="newsFormError" role="alert"></p>
          <button class="primary-button compact" type="submit">Simpan Berita</button>
          <button class="ghost-button" id="cancelNewsButton" type="button">Batal</button>
        </form>
      </section>` : ""}
  `);
  document.querySelector("#addNewsButton")?.addEventListener("click", () => { appState.selectedNewsId = null; appState.newsModalOpen = true; renderNewsAdmin(); });
  document.querySelector("#cancelNewsButton")?.addEventListener("click", () => { appState.newsModalOpen = false; appState.selectedNewsId = null; renderNewsAdmin(); });
  document.querySelectorAll("[data-edit-news]").forEach((button) => button.addEventListener("click", () => { if (!canManagePublicContent(session.role)) return; appState.selectedNewsId = button.dataset.editNews; appState.newsModalOpen = true; renderNewsAdmin(); }));
  document.querySelectorAll("[data-delete-news]").forEach((button) => button.addEventListener("click", async () => { if (!canManagePublicContent(session.role)) return; if (!confirm("Hapus berita ini?")) return; if (!await deleteRowFromPostgres("berita", button.dataset.deleteNews)) return; appState.news = appState.news.filter((item) => String(item.id) !== String(button.dataset.deleteNews)); renderNewsAdmin(); }));
  document.querySelector("#newsForm")?.addEventListener("submit", handleNewsSubmit);
  bindImagePreview("#newsImage", "#newsImagePreview", "#newsFormError");
}

export async function handleNewsSubmit(event) {
  event.preventDefault();
  const session = getSession();
  if (!canManagePublicContent(session?.role)) return;
  const form = event.currentTarget;
  const data = new FormData(form);
  const existing = appState.news.find((item) => String(item.id) === String(appState.selectedNewsId));
  const image = form.elements.image?.files?.[0];
  let uploaded = null;
  try { uploaded = image ? await uploadDocumentationPhoto(image, "berita") : null; } catch (error) { document.querySelector("#newsFormError").textContent = error.message; return; }
  const item = {
    id: existing?.id || Date.now(),
    title: String(data.get("title") || "").trim(),
    category: String(data.get("category") || "Kegiatan Ranting").trim(),
    date: String(data.get("date") || getLocalDateString()),
    excerpt: String(data.get("excerpt") || "").trim(),
    content: String(data.get("content") || "").trim(),
    imagePath: uploaded?.path || existing?.imagePath || "",
    imageName: uploaded?.name || existing?.imageName || "",
    imageUrl: uploaded?.url || existing?.imageUrl || "",
    status: String(data.get("status") || "draft"),
    organization: String(data.get("organization") || "ranting")
  };
  if (!item.title || !item.excerpt || !item.content) { document.querySelector("#newsFormError").textContent = "Judul, ringkasan, dan konten wajib diisi."; return; }
  appState.news = [item, ...appState.news.filter((news) => String(news.id) !== String(item.id))];
  await syncRowToPostgres("berita", item);
  appState.newsModalOpen = false;
  appState.selectedNewsId = null;
  renderNewsAdmin();
}

function createPortalSlug(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function portalStatusOptions(current, values = ["published", "draft"]) {
  return values.map((value) => `<option value="${value}" ${current === value ? "selected" : ""}>${value}</option>`).join("");
}

function requirePortalAdmin(session) {
  if (!session?.role) {
    navigate("/login");
    return false;
  }
  return isAdminRole(session.role);
}

function renderPortalActionButtons(id, editAttr, deleteAttr) {
  return `
    <div class="action-buttons">
      <button class="ghost-button compact" type="button" ${editAttr}="${escapeHtml(id)}">Edit</button>
      <button class="danger-button compact" type="button" ${deleteAttr}="${escapeHtml(id)}">Hapus</button>
    </div>
  `;
}

function renderUmkmRows(items) {
  if (!items.length) return `<div class="empty-state">Belum ada data UMKM warga.</div>`;
  const rows = items.map((item) => `
    <tr>
      <td><strong>${escapeHtml(item.businessName)}</strong><span>${escapeHtml(item.owner || "-")}</span></td>
      <td>${escapeHtml(item.category || "-")}</td>
      <td>${escapeHtml(item.products || "-")}</td>
      <td>${escapeHtml(item.whatsapp || "-")}</td>
      <td><span class="status-pill ${item.status === "published" ? "success" : "warning"}">${escapeHtml(item.status)}</span></td>
      <td>${renderPortalActionButtons(item.id, "data-edit-umkm", "data-delete-umkm")}</td>
    </tr>
  `).join("");
  return `<div class="table-wrap"><table><thead><tr><th>Usaha</th><th>Kategori</th><th>Produk</th><th>WhatsApp</th><th>Status</th><th>Aksi</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

export function renderUmkmAdmin() {
  const session = getSession();
  if (!requirePortalAdmin(session)) return navigate("/dashboard");
  const editing = appState.portalUmkm.find((item) => String(item.id) === String(appState.selectedUmkmId));
  const items = [...appState.portalUmkm].sort((a, b) => String(a.businessName).localeCompare(String(b.businessName)));

  renderAppShell(session, "UMKM Warga", `
    <section class="public-panel">
      <div class="panel-heading">
        <div><p class="eyebrow">Portal Layanan Warga</p><h2>Kelola direktori UMKM</h2></div>
        <button class="primary-button compact" id="addUmkmButton" type="button">Tambah UMKM</button>
      </div>
      ${renderUmkmRows(items)}
    </section>
    ${appState.umkmModalOpen ? `
      <section class="public-panel">
        <div class="panel-heading"><div><p class="eyebrow">Form UMKM</p><h2>${editing ? "Edit" : "Tambah"} UMKM Warga</h2></div></div>
        <form class="public-upload-form" id="umkmForm">
          <div class="form-grid">
            <label class="field"><span>Nama Usaha</span><input name="businessName" value="${escapeHtml(editing?.businessName || "")}" required /></label>
            <label class="field"><span>Pemilik</span><input name="owner" value="${escapeHtml(editing?.owner || "")}" /></label>
            <label class="field"><span>Kategori</span><input name="category" value="${escapeHtml(editing?.category || "")}" placeholder="Kuliner, jasa, toko, dll" /></label>
            <label class="field"><span>Produk/Jasa</span><input name="products" value="${escapeHtml(editing?.products || "")}" /></label>
            <label class="field"><span>WhatsApp</span><input name="whatsapp" value="${escapeHtml(editing?.whatsapp || "")}" /></label>
            <label class="field"><span>Status</span><select name="status">${portalStatusOptions(editing?.status || "draft")}</select></label>
          </div>
          <label class="field"><span>Alamat</span><textarea name="address">${escapeHtml(editing?.address || "")}</textarea></label>
          <label class="field"><span>Deskripsi</span><textarea name="description">${escapeHtml(editing?.description || "")}</textarea></label>
          <label class="field"><span>URL Foto</span><input name="photoUrl" value="${escapeHtml(editing?.photoUrl || "")}" placeholder="/uploads/umkm/foto.jpg" /></label>
          <p class="form-error" id="umkmFormError" role="alert"></p>
          <button class="primary-button compact" type="submit">Simpan UMKM</button>
          <button class="ghost-button" id="cancelUmkmButton" type="button">Batal</button>
        </form>
      </section>` : ""}
  `);

  document.querySelector("#addUmkmButton")?.addEventListener("click", () => { appState.selectedUmkmId = null; appState.umkmModalOpen = true; renderUmkmAdmin(); });
  document.querySelector("#cancelUmkmButton")?.addEventListener("click", () => { appState.selectedUmkmId = null; appState.umkmModalOpen = false; renderUmkmAdmin(); });
  document.querySelectorAll("[data-edit-umkm]").forEach((button) => button.addEventListener("click", () => { appState.selectedUmkmId = button.dataset.editUmkm; appState.umkmModalOpen = true; renderUmkmAdmin(); }));
  document.querySelectorAll("[data-delete-umkm]").forEach((button) => button.addEventListener("click", async () => {
    if (!confirm("Hapus data UMKM ini?")) return;
    if (!await deleteRowFromPostgres("umkm", button.dataset.deleteUmkm)) return;
    appState.portalUmkm = appState.portalUmkm.filter((item) => String(item.id) !== String(button.dataset.deleteUmkm));
    renderUmkmAdmin();
  }));
  document.querySelector("#umkmForm")?.addEventListener("submit", handleUmkmSubmit);
}

export async function handleUmkmSubmit(event) {
  event.preventDefault();
  const session = getSession();
  if (!isAdminRole(session?.role)) return;
  const form = event.currentTarget;
  const data = new FormData(form);
  const existing = appState.portalUmkm.find((item) => String(item.id) === String(appState.selectedUmkmId));
  const item = {
    id: existing?.id || `umkm-${Date.now()}`,
    businessName: String(data.get("businessName") || "").trim(),
    owner: String(data.get("owner") || "").trim(),
    category: String(data.get("category") || "").trim(),
    products: String(data.get("products") || "").trim(),
    whatsapp: String(data.get("whatsapp") || "").trim(),
    address: String(data.get("address") || "").trim(),
    description: String(data.get("description") || "").trim(),
    photoUrl: String(data.get("photoUrl") || "").trim(),
    status: String(data.get("status") || "draft")
  };
  item.slug = existing?.slug || createPortalSlug(item.businessName);
  if (!item.businessName) {
    document.querySelector("#umkmFormError").textContent = "Nama usaha wajib diisi.";
    return;
  }
  appState.portalUmkm = [item, ...appState.portalUmkm.filter((row) => String(row.id) !== String(item.id))];
  await syncRowToPostgres("umkm", item);
  appState.selectedUmkmId = null;
  appState.umkmModalOpen = false;
  renderUmkmAdmin();
}

function renderSimplePortalRows(items, columns, editAttr, deleteAttr, emptyText) {
  if (!items.length) return `<div class="empty-state">${emptyText}</div>`;
  const rows = items.map((item) => `
    <tr>
      ${columns.map((column) => `<td>${column.render(item)}</td>`).join("")}
      <td>${renderPortalActionButtons(item.id, editAttr, deleteAttr)}</td>
    </tr>
  `).join("");
  return `<div class="table-wrap"><table><thead><tr>${columns.map((column) => `<th>${escapeHtml(column.label)}</th>`).join("")}<th>Aksi</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

export function renderCitizenServicesAdmin() {
  const session = getSession();
  if (!requirePortalAdmin(session)) return navigate("/dashboard");
  const editingDeath = appState.deathServices.find((item) => String(item.id) === String(appState.selectedDeathServiceId));
  const editingAid = appState.aidRequests.find((item) => String(item.id) === String(appState.selectedAidRequestId));
  const editingMosque = appState.mosques.find((item) => String(item.id) === String(appState.selectedMosqueId));

  renderAppShell(session, "Layanan Warga", `
    <section class="public-panel">
      <div class="panel-heading">
        <div><p class="eyebrow">Layanan Warga</p><h2>Berita duka</h2></div>
        <button class="primary-button compact" id="addDeathServiceButton" type="button">Tambah Berita Duka</button>
      </div>
      ${renderSimplePortalRows(appState.deathServices, [
        { label: "Nama", render: (item) => `<strong>${escapeHtml(item.name)}</strong><span>${escapeHtml(item.address || "-")}</span>` },
        { label: "Hari Wafat", render: (item) => escapeHtml(item.deathDate || "-") },
        { label: "Rumah Duka", render: (item) => escapeHtml(item.funeralHome || "-") },
        { label: "Status", render: (item) => `<span class="status-pill ${item.status === "published" ? "success" : "warning"}">${escapeHtml(item.status)}</span>` }
      ], "data-edit-death", "data-delete-death", "Belum ada berita duka.")}
    </section>
    ${appState.deathServiceModalOpen ? renderDeathServiceForm(editingDeath) : ""}

    <section class="public-panel">
      <div class="panel-heading">
        <div><p class="eyebrow">Layanan Warga</p><h2>Pengajuan bantuan</h2></div>
        <button class="primary-button compact" id="addAidRequestButton" type="button">Tambah Pengajuan</button>
      </div>
      ${renderSimplePortalRows(appState.aidRequests, [
        { label: "Nama", render: (item) => `<strong>${escapeHtml(item.name)}</strong><span>${escapeHtml(item.address || "-")}</span>` },
        { label: "Jenis", render: (item) => escapeHtml(item.aidType || "-") },
        { label: "WhatsApp", render: (item) => escapeHtml(item.whatsapp || "-") },
        { label: "Status", render: (item) => `<span class="status-pill warning">${escapeHtml(item.status)}</span>` }
      ], "data-edit-aid", "data-delete-aid", "Belum ada pengajuan bantuan.")}
    </section>
    ${appState.aidRequestModalOpen ? renderAidRequestForm(editingAid) : ""}

    <section class="public-panel">
      <div class="panel-heading">
        <div><p class="eyebrow">Direktori Ibadah</p><h2>Masjid dan mushola</h2></div>
        <button class="primary-button compact" id="addMosqueButton" type="button">Tambah Tempat Ibadah</button>
      </div>
      ${renderSimplePortalRows(appState.mosques, [
        { label: "Nama", render: (item) => `<strong>${escapeHtml(item.name)}</strong><span>${escapeHtml(item.type || "-")}</span>` },
        { label: "Alamat", render: (item) => escapeHtml(item.address || "-") },
        { label: "Takmir", render: (item) => escapeHtml(item.caretaker || "-") },
        { label: "Status", render: (item) => `<span class="status-pill ${item.status === "published" ? "success" : "warning"}">${escapeHtml(item.status)}</span>` }
      ], "data-edit-mosque", "data-delete-mosque", "Belum ada data masjid/mushola.")}
    </section>
    ${appState.mosqueModalOpen ? renderMosqueForm(editingMosque) : ""}
  `);
  bindCitizenServiceEvents();
}

function renderDeathServiceForm(editing) {
  return `
    <section class="public-panel">
      <div class="panel-heading"><div><p class="eyebrow">Form</p><h2>${editing ? "Edit" : "Tambah"} Berita Duka</h2></div></div>
      <form class="public-upload-form" id="deathServiceForm">
        <div class="form-grid">
          <label class="field"><span>Nama Almarhum/Almarhumah</span><input name="name" value="${escapeHtml(editing?.name || "")}" required /></label>
          <label class="field"><span>Hari/Tanggal Wafat</span><input name="deathDate" value="${escapeHtml(editing?.deathDate || getLocalDateString())}" /></label>
          <label class="field"><span>Rumah Duka</span><input name="funeralHome" value="${escapeHtml(editing?.funeralHome || "")}" /></label>
          <label class="field"><span>Kontak Keluarga</span><input name="familyContact" value="${escapeHtml(editing?.familyContact || "")}" /></label>
          <label class="field"><span>Status</span><select name="status">${portalStatusOptions(editing?.status || "draft")}</select></label>
        </div>
        <label class="field"><span>Alamat</span><textarea name="address">${escapeHtml(editing?.address || "")}</textarea></label>
        <p class="form-error" id="deathServiceFormError" role="alert"></p>
        <button class="primary-button compact" type="submit">Simpan Berita Duka</button>
        <button class="ghost-button" id="cancelDeathServiceButton" type="button">Batal</button>
      </form>
    </section>`;
}

function renderAidRequestForm(editing) {
  return `
    <section class="public-panel">
      <div class="panel-heading"><div><p class="eyebrow">Form</p><h2>${editing ? "Edit" : "Tambah"} Pengajuan Bantuan</h2></div></div>
      <form class="public-upload-form" id="aidRequestForm">
        <div class="form-grid">
          <label class="field"><span>Nama</span><input name="name" value="${escapeHtml(editing?.name || "")}" required /></label>
          <label class="field"><span>WhatsApp</span><input name="whatsapp" value="${escapeHtml(editing?.whatsapp || "")}" /></label>
          <label class="field"><span>Jenis Bantuan</span><input name="aidType" value="${escapeHtml(editing?.aidType || "")}" /></label>
          <label class="field"><span>Status</span><select name="status">${portalStatusOptions(editing?.status || "baru", ["baru", "diproses", "selesai", "ditolak"])}</select></label>
        </div>
        <label class="field"><span>Alamat</span><textarea name="address">${escapeHtml(editing?.address || "")}</textarea></label>
        <label class="field"><span>Keterangan</span><textarea name="note">${escapeHtml(editing?.note || "")}</textarea></label>
        <p class="form-error" id="aidRequestFormError" role="alert"></p>
        <button class="primary-button compact" type="submit">Simpan Pengajuan</button>
        <button class="ghost-button" id="cancelAidRequestButton" type="button">Batal</button>
      </form>
    </section>`;
}

function renderMosqueForm(editing) {
  return `
    <section class="public-panel">
      <div class="panel-heading"><div><p class="eyebrow">Form</p><h2>${editing ? "Edit" : "Tambah"} Masjid/Mushola</h2></div></div>
      <form class="public-upload-form" id="mosqueForm">
        <div class="form-grid">
          <label class="field"><span>Nama</span><input name="name" value="${escapeHtml(editing?.name || "")}" required /></label>
          <label class="field"><span>Jenis</span><select name="type"><option value="Masjid" ${editing?.type !== "Mushola" ? "selected" : ""}>Masjid</option><option value="Mushola" ${editing?.type === "Mushola" ? "selected" : ""}>Mushola</option></select></label>
          <label class="field"><span>Takmir</span><input name="caretaker" value="${escapeHtml(editing?.caretaker || "")}" /></label>
          <label class="field"><span>Kontak</span><input name="contact" value="${escapeHtml(editing?.contact || "")}" /></label>
          <label class="field"><span>Status</span><select name="status">${portalStatusOptions(editing?.status || "draft")}</select></label>
        </div>
        <label class="field"><span>Alamat</span><textarea name="address">${escapeHtml(editing?.address || "")}</textarea></label>
        <p class="form-error" id="mosqueFormError" role="alert"></p>
        <button class="primary-button compact" type="submit">Simpan Tempat Ibadah</button>
        <button class="ghost-button" id="cancelMosqueButton" type="button">Batal</button>
      </form>
    </section>`;
}

function bindCitizenServiceEvents() {
  document.querySelector("#addDeathServiceButton")?.addEventListener("click", () => { appState.selectedDeathServiceId = null; appState.deathServiceModalOpen = true; renderCitizenServicesAdmin(); });
  document.querySelector("#cancelDeathServiceButton")?.addEventListener("click", () => { appState.selectedDeathServiceId = null; appState.deathServiceModalOpen = false; renderCitizenServicesAdmin(); });
  document.querySelectorAll("[data-edit-death]").forEach((button) => button.addEventListener("click", () => { appState.selectedDeathServiceId = button.dataset.editDeath; appState.deathServiceModalOpen = true; renderCitizenServicesAdmin(); }));
  document.querySelectorAll("[data-delete-death]").forEach((button) => button.addEventListener("click", async () => {
    if (!confirm("Hapus berita duka ini?")) return;
    if (!await deleteRowFromPostgres("layanan_kematian", button.dataset.deleteDeath)) return;
    appState.deathServices = appState.deathServices.filter((item) => String(item.id) !== String(button.dataset.deleteDeath));
    renderCitizenServicesAdmin();
  }));

  document.querySelector("#addAidRequestButton")?.addEventListener("click", () => { appState.selectedAidRequestId = null; appState.aidRequestModalOpen = true; renderCitizenServicesAdmin(); });
  document.querySelector("#cancelAidRequestButton")?.addEventListener("click", () => { appState.selectedAidRequestId = null; appState.aidRequestModalOpen = false; renderCitizenServicesAdmin(); });
  document.querySelectorAll("[data-edit-aid]").forEach((button) => button.addEventListener("click", () => { appState.selectedAidRequestId = button.dataset.editAid; appState.aidRequestModalOpen = true; renderCitizenServicesAdmin(); }));
  document.querySelectorAll("[data-delete-aid]").forEach((button) => button.addEventListener("click", async () => {
    if (!confirm("Hapus pengajuan bantuan ini?")) return;
    if (!await deleteRowFromPostgres("pengajuan_bantuan", button.dataset.deleteAid)) return;
    appState.aidRequests = appState.aidRequests.filter((item) => String(item.id) !== String(button.dataset.deleteAid));
    renderCitizenServicesAdmin();
  }));

  document.querySelector("#addMosqueButton")?.addEventListener("click", () => { appState.selectedMosqueId = null; appState.mosqueModalOpen = true; renderCitizenServicesAdmin(); });
  document.querySelector("#cancelMosqueButton")?.addEventListener("click", () => { appState.selectedMosqueId = null; appState.mosqueModalOpen = false; renderCitizenServicesAdmin(); });
  document.querySelectorAll("[data-edit-mosque]").forEach((button) => button.addEventListener("click", () => { appState.selectedMosqueId = button.dataset.editMosque; appState.mosqueModalOpen = true; renderCitizenServicesAdmin(); }));
  document.querySelectorAll("[data-delete-mosque]").forEach((button) => button.addEventListener("click", async () => {
    if (!confirm("Hapus data masjid/mushola ini?")) return;
    if (!await deleteRowFromPostgres("masjid_mushola", button.dataset.deleteMosque)) return;
    appState.mosques = appState.mosques.filter((item) => String(item.id) !== String(button.dataset.deleteMosque));
    renderCitizenServicesAdmin();
  }));

  document.querySelector("#deathServiceForm")?.addEventListener("submit", handleDeathServiceSubmit);
  document.querySelector("#aidRequestForm")?.addEventListener("submit", handleAidRequestSubmit);
  document.querySelector("#mosqueForm")?.addEventListener("submit", handleMosqueSubmit);
}

export async function handleDeathServiceSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const data = new FormData(form);
  const existing = appState.deathServices.find((item) => String(item.id) === String(appState.selectedDeathServiceId));
  const item = {
    id: existing?.id || `duka-${Date.now()}`,
    name: String(data.get("name") || "").trim(),
    address: String(data.get("address") || "").trim(),
    deathDate: String(data.get("deathDate") || "").trim(),
    funeralHome: String(data.get("funeralHome") || "").trim(),
    familyContact: String(data.get("familyContact") || "").trim(),
    status: String(data.get("status") || "draft")
  };
  if (!item.name) { document.querySelector("#deathServiceFormError").textContent = "Nama almarhum/almarhumah wajib diisi."; return; }
  appState.deathServices = [item, ...appState.deathServices.filter((row) => String(row.id) !== String(item.id))];
  await syncRowToPostgres("layanan_kematian", item);
  appState.selectedDeathServiceId = null;
  appState.deathServiceModalOpen = false;
  renderCitizenServicesAdmin();
}

export async function handleAidRequestSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const data = new FormData(form);
  const existing = appState.aidRequests.find((item) => String(item.id) === String(appState.selectedAidRequestId));
  const item = {
    id: existing?.id || `bantuan-${Date.now()}`,
    name: String(data.get("name") || "").trim(),
    address: String(data.get("address") || "").trim(),
    whatsapp: String(data.get("whatsapp") || "").trim(),
    aidType: String(data.get("aidType") || "").trim(),
    note: String(data.get("note") || "").trim(),
    status: String(data.get("status") || "baru")
  };
  if (!item.name) { document.querySelector("#aidRequestFormError").textContent = "Nama pemohon wajib diisi."; return; }
  appState.aidRequests = [item, ...appState.aidRequests.filter((row) => String(row.id) !== String(item.id))];
  await syncRowToPostgres("pengajuan_bantuan", item);
  appState.selectedAidRequestId = null;
  appState.aidRequestModalOpen = false;
  renderCitizenServicesAdmin();
}

export async function handleMosqueSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const data = new FormData(form);
  const existing = appState.mosques.find((item) => String(item.id) === String(appState.selectedMosqueId));
  const item = {
    id: existing?.id || `masjid-${Date.now()}`,
    name: String(data.get("name") || "").trim(),
    type: String(data.get("type") || "Masjid"),
    address: String(data.get("address") || "").trim(),
    caretaker: String(data.get("caretaker") || "").trim(),
    contact: String(data.get("contact") || "").trim(),
    status: String(data.get("status") || "draft")
  };
  if (!item.name) { document.querySelector("#mosqueFormError").textContent = "Nama masjid/mushola wajib diisi."; return; }
  appState.mosques = [item, ...appState.mosques.filter((row) => String(row.id) !== String(item.id))];
  await syncRowToPostgres("masjid_mushola", item);
  appState.selectedMosqueId = null;
  appState.mosqueModalOpen = false;
  renderCitizenServicesAdmin();
}
