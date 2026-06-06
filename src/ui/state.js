import qrcode from "qrcode-generator";

export const DEFAULT_BANOMS = [
  {
    slug: "muslimat",
    name: "Muslimat NU",
    tagline: "Ibu Umat, Penggerak Keluarga Nahdliyin",
    desc: "Wadah berhimpun perempuan NU dewasa yang bergerak di bidang sosial keagamaan, kesehatan ibu & anak, pendidikan PAUD/TPQ, majelis taklim, dan penguatan ekonomi keluarga.",
    basis: "Perempuan NU (dewasa)",
    color: "#0b6b3a",
    gradient: "linear-gradient(135deg, #0b6b3a 0%, #064e2b 30%, #0a3d2e 60%, #0d1117 100%)",
    heroEmoji: ["🕌", "💚", "🤲", "🌿"],
    sectionTitle: "Majelis & Program Sosial",
    visi: "Terwujudnya perempuan NU yang bertaqwa, berilmu, mandiri, dan bermanfaat bagi keluarga, masyarakat, serta agama.",
    quote: "\"Sebaik-baik manusia adalah yang paling bermanfaat bagi manusia lainnya.\" — HR. Ahmad",
    tags: ["Majelis Taklim", "Posyandu", "Santunan", "Koperasi"],
    icon: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="45" fill="#0b6b3a" stroke="#d8ad45" stroke-width="2"/>
      <ellipse cx="50" cy="50" rx="30" ry="15" stroke="rgba(255,255,255,0.25)" stroke-width="1.5"/>
      <ellipse cx="50" cy="50" rx="15" ry="30" stroke="rgba(255,255,255,0.25)" stroke-width="1.5"/>
      <line x1="15" y1="50" x2="85" y2="50" stroke="rgba(255,255,255,0.25)" stroke-width="1.5"/>
      <line x1="50" y1="15" x2="50" y2="85" stroke="rgba(255,255,255,0.25)" stroke-width="1.5"/>
      <circle cx="50" cy="50" r="35" stroke="#d8ad45" stroke-width="2" stroke-dasharray="4 2"/>
      <polygon points="50,22 52,28 58,28 53,32 55,38 50,34 45,38 47,32 42,28 48,28" fill="#ffffff"/>
      <polygon points="32,27 34,31 38,31 35,34 36,38 32,35 28,38 29,34 26,31 30,31" fill="#d8ad45"/>
      <polygon points="41,24 43,28 47,28 44,31 45,35 41,32 37,35 38,31 35,28 39,28" fill="#d8ad45"/>
      <polygon points="59,24 61,28 65,28 62,31 63,35 59,32 55,35 56,31 53,28 57,28" fill="#d8ad45"/>
      <polygon points="68,27 70,31 74,31 71,34 72,38 68,35 64,38 65,34 62,31 66,31" fill="#d8ad45"/>
      <polygon points="35,68 37,71 40,71 38,73 39,76 35,74 31,76 32,73 30,71 33,71" fill="#d8ad45"/>
      <polygon points="45,71 47,74 50,74 48,76 49,79 45,77 41,79 42,76 40,74 43,74" fill="#d8ad45"/>
      <polygon points="55,71 57,74 60,74 58,76 59,79 55,77 51,79 52,76 50,74 53,74" fill="#d8ad45"/>
      <polygon points="65,68 67,71 70,71 68,73 69,76 65,74 61,76 62,73 60,71 63,71" fill="#d8ad45"/>
      <path d="M30,53 C35,53 45,55 50,55 C55,55 65,53 70,53" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/>
    </svg>`
  },
  {
    slug: "fatayat",
    name: "Fatayat NU",
    tagline: "Perempuan Muda, Agen Perubahan Umat",
    desc: "Organisasi perempuan muda NU (maks. 40 tahun) yang fokus pada kaderisasi, isu keperempuanan, pencegahan stunting, pemberdayaan ekonomi kreatif, dan kepemimpinan perempuan.",
    basis: "Perempuan muda NU (≤40 tahun)",
    color: "#00a859",
    gradient: "linear-gradient(135deg, #00a859 0%, #00875a 30%, #006d4e 60%, #0d1117 100%)",
    heroEmoji: ["🌸", "✨", "💪", "🌺"],
    sectionTitle: "Pemberdayaan & Kepemimpinan Perempuan",
    visi: "Membentuk perempuan muda yang berkarakter, cerdas, mandiri, dan aktif dalam gerakan sosial kemasyarakatan.",
    quote: "\"Perempuan adalah tiang negara. Jika perempuannya baik, maka baiklah negara itu.\" — Pepatah",
    tags: ["Stunting", "Pelatihan UMKM", "Kepemimpinan", "Literasi"],
    icon: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="45" fill="#00a859" stroke="#ffffff" stroke-width="2"/>
      <circle cx="50" cy="50" r="40" stroke="#d8ad45" stroke-width="1.5"/>
      <path d="M50,28 C45,35 42,42 42,50 C42,62 50,72 50,72 C50,72 58,62 58,50 C58,42 55,35 50,28 Z" fill="#ffffff"/>
      <path d="M50,28 C48,34 50,45 50,72" stroke="#00a859" stroke-width="1.5"/>
      <path d="M46,45 C44,52 48,58 50,60" stroke="#00a859" stroke-width="1" stroke-linecap="round"/>
      <path d="M54,45 C56,52 52,58 50,60" stroke="#00a859" stroke-width="1" stroke-linecap="round"/>
      <path d="M50,72 L50,82" stroke="#d8ad45" stroke-width="2" stroke-linecap="round"/>
      <path d="M50,76 C46,76 43,74 41,71" stroke="#d8ad45" stroke-width="1.5" stroke-linecap="round"/>
      <path d="M50,78 C54,78 57,76 59,73" stroke="#d8ad45" stroke-width="1.5" stroke-linecap="round"/>
      <polygon points="50,15 52,19 56,19 53,21 54,25 50,23 46,25 47,21 44,19 48,19" fill="#d8ad45"/>
      <polygon points="38,18 40,21 43,21 41,23 42,26 38,24 34,26 35,23 33,21 36,21" fill="#d8ad45"/>
      <polygon points="62,18 64,21 67,21 65,23 66,26 62,24 58,26 59,23 57,21 60,21" fill="#d8ad45"/>
    </svg>`
  },
  {
    slug: "gp-ansor",
    name: "GP Ansor",
    tagline: "Pemuda Tangguh, Penjaga Tradisi & NKRI",
    desc: "Gerakan kepemudaan NU (maks. 40 tahun) yang membina kader berjiwa pemimpin, menjaga Aswaja, dan aktif dalam bakti sosial. Memiliki sayap Banser untuk keamanan dan kemanusiaan.",
    basis: "Pemuda laki-laki NU (≤40 tahun)",
    color: "#006400",
    gradient: "linear-gradient(160deg, #006400 0%, #004d00 25%, #1a3a1a 50%, #0d1117 100%)",
    heroEmoji: ["🛡️", "⚔️", "💂", "🇮🇩"],
    sectionTitle: "Aksi Nyata & Konsolidasi Kader",
    visi: "Membentuk pemuda tangguh berkarakter Ahlussunnah wal Jama'ah yang siap mengawal NKRI dan membela masyarakat.",
    quote: "\"Hubbul wathon minal iman — Cinta tanah air sebagian dari iman.\" — KH. Hasyim Asy'ari",
    tags: ["Banser", "Bakti Sosial", "Pengamanan", "Kaderisasi"],
    icon: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <polygon points="50,90 12,25 88,25" fill="#006400" stroke="#d8ad45" stroke-width="2.5" stroke-linejoin="round"/>
      <circle cx="50" cy="40" r="8" stroke="#ffffff" stroke-width="2.5"/>
      <line x1="50" y1="48" x2="50" y2="72" stroke="#ffffff" stroke-width="3" stroke-linecap="round"/>
      <line x1="50" y1="62" x2="57" y2="62" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round"/>
      <line x1="50" y1="68" x2="57" y2="68" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round"/>
      <polygon points="50,45 52,49 56,49 53,51 54,55 50,53 46,55 47,51 44,49 48,49" fill="#d8ad45"/>
      <circle cx="30" cy="33" r="2.5" fill="#d8ad45"/>
      <circle cx="40" cy="31" r="2.5" fill="#d8ad45"/>
      <circle cx="60" cy="31" r="2.5" fill="#d8ad45"/>
      <circle cx="70" cy="33" r="2.5" fill="#d8ad45"/>
    </svg>`
  },
  {
    slug: "ipnu",
    name: "IPNU",
    tagline: "Pelajar & Santri, Generasi Penerus NU",
    desc: "Ikatan Pelajar NU untuk pelajar & santri laki-laki (maks. 27 tahun). Fokus pada kaderisasi pelajar, kajian keislaman, literasi, dan pengembangan potensi generasi muda NU.",
    basis: "Pelajar & santri laki-laki (≤27 tahun)",
    color: "#004b87",
    gradient: "linear-gradient(135deg, #004b87 0%, #003a6b 30%, #1a2a4a 60%, #0d1117 100%)",
    heroEmoji: ["📚", "🎓", "✏️", "💡"],
    sectionTitle: "Kajian & Kaderisasi Pelajar",
    visi: "Mencetak generasi pelajar NU yang berilmu, berkarakter, and siap menjadi pemimpin masa depan umat.",
    quote: "\"Tuntutlah ilmu dari buaian hingga liang lahat.\" — Atsar",
    tags: ["Kajian Kitab", "CBP", "Literasi Digital", "Rutinan"],
    icon: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M50,90 C78,72 88,50 88,20 L50,10 L12,20 C12,50 22,72 50,90 Z" fill="#004b87" stroke="#ffffff" stroke-width="2" stroke-linejoin="round"/>
      <path d="M50,83 C72,67 81,47 81,22 L50,14 L19,22 C19,47 28,67 50,83 Z" stroke="#d8ad45" stroke-width="1.5" stroke-linejoin="round"/>
      <line x1="28" y1="20" x2="72" y2="64" stroke="#ffffff" stroke-width="3" stroke-linecap="round"/>
      <line x1="33" y1="17" x2="77" y2="61" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round"/>
      <path d="M40,52 C45,55 50,53 50,53 C50,53 55,55 60,52 L60,65 C55,68 50,66 50,66 C50,66 45,68 40,65 Z" fill="#ffffff"/>
      <line x1="50" y1="53" x2="50" y2="66" stroke="#004b87" stroke-width="1"/>
      <polygon points="50,38 52,41 55,41 53,43 54,46 50,44 46,46 47,43 45,41 48,41" fill="#d8ad45"/>
      <circle cx="35" cy="27" r="2" fill="#d8ad45"/>
      <circle cx="42" cy="24" r="2" fill="#d8ad45"/>
      <circle cx="50" cy="23" r="2.5" fill="#ffffff"/>
      <circle cx="58" cy="24" r="2" fill="#d8ad45"/>
      <circle cx="66" cy="27" r="2" fill="#d8ad45"/>
    </svg>`
  },
  {
    slug: "ippnu",
    name: "IPPNU",
    tagline: "Pelajar Putri Cerdas, Berkarakter Aswaja",
    desc: "Ikatan Pelajar Putri NU untuk pelajar & santri perempuan (maks. 27 tahun). Memperkuat ukhuwah, kaderisasi putri, nilai ke-NU-an, dan pengembangan potensi diri generasi muda.",
    basis: "Pelajar & santri perempuan (≤27 tahun)",
    color: "#009639",
    gradient: "linear-gradient(135deg, #009639 0%, #007a2e 30%, #1a4a2a 60%, #0d1117 100%)",
    heroEmoji: ["🌺", "📖", "🌟", "🎀"],
    sectionTitle: "Ukhuwah & Pengembangan Diri",
    visi: "Membangun generasi pelajar putri NU yang cerdas, mandiri, berakhlaq karimah, dan berkhidmah untuk umat.",
    quote: "\"Didiklah anak-anak perempuanmu, karena mereka akan menjadi ibu yang mendidik generasi.\" — Hikmah",
    tags: ["KPP", "Rutinan Yasin", "Ukhuwah", "Kajian"],
    icon: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M50,90 C78,72 88,50 88,20 L50,10 L12,20 C12,50 22,72 50,90 Z" fill="#009639" stroke="#ffffff" stroke-width="2" stroke-linejoin="round"/>
      <path d="M50,83 C72,67 81,47 81,22 L50,14 L19,22 C19,47 28,67 50,83 Z" stroke="#d8ad45" stroke-width="1.5" stroke-linejoin="round"/>
      <path d="M50,42 C46,47 43,53 43,60 C43,68 50,75 50,75 C50,75 57,68 57,60 C57,53 54,47 50,42 Z" fill="#ffffff"/>
      <circle cx="50" cy="60" r="3" fill="#d8ad45"/>
      <polygon points="50,22 52,25 55,25 53,27 54,30 50,28 46,30 47,27 45,25 48,25" fill="#d8ad45"/>
      <circle cx="34" cy="30" r="2" fill="#d8ad45"/>
      <circle cx="42" cy="26" r="2" fill="#d8ad45"/>
      <circle cx="58" cy="26" r="2" fill="#d8ad45"/>
      <circle cx="66" cy="30" r="2" fill="#d8ad45"/>
    </svg>`
  },
  {
    slug: "pagar-nusa",
    name: "Pagar Nusa",
    tagline: "Benteng Budaya, Seni Bela Diri Nahdliyin",
    desc: "Badan otonom yang melestarikan dan mengembangkan seni beladiri pencak silat khas NU. Berperan dalam pelestarian budaya bangsa dan pembinaan karakter melalui olahraga tradisional.",
    basis: "Penggiat pencak silat & budaya NU",
    color: "#8b0000",
    gradient: "linear-gradient(160deg, #1a1a1a 0%, #2d0a0a 30%, #4a0e0e 50%, #0d1117 100%)",
    heroEmoji: ["🥋", "🔥", "⚡", "🐉"],
    sectionTitle: "Latihan & Kejuaraan Pencak Silat",
    visi: "Melestarikan pencak silat sebagai warisan budaya bangsa, membina karakter kesatria, dan menjaga tradisi beladiri Nahdliyin.",
    quote: "\"Silat bukan untuk menyerang, melainkan untuk menjaga kehormatan dan membela kebenaran.\" — Pepatah Pendekar",
    tags: ["Pencak Silat", "Budaya", "Kejuaraan", "Pelatihan"],
    icon: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M50,90 L15,75 L15,20 L50,10 L85,20 L85,75 Z" fill="#1a1a1a" stroke="#8b0000" stroke-width="2.5" stroke-linejoin="round"/>
      <path d="M50,83 L21,70 L21,24 L50,15 L79,24 L79,70 Z" fill="#8b0000" stroke="#d8ad45" stroke-width="1.5"/>
      <path d="M50,30 L50,70" stroke="#ffffff" stroke-width="3" stroke-linecap="round"/>
      <path d="M40,40 C40,55 50,60 50,60" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round"/>
      <path d="M60,40 C60,55 50,60 50,60" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round"/>
      <polygon points="50,24 47,31 53,31" fill="#ffffff"/>
      <polygon points="40,35 37,42 43,42" fill="#ffffff"/>
      <polygon points="60,35 57,42 63,42" fill="#ffffff"/>
      <polygon points="50,66 52,69 55,69 53,71 54,74 50,72 46,74 47,71 45,69 48,69" fill="#d8ad45"/>
      <circle cx="34" cy="50" r="2" fill="#d8ad45"/>
      <circle cx="42" cy="60" r="2" fill="#d8ad45"/>
      <circle cx="58" cy="60" r="2" fill="#d8ad45"/>
      <circle cx="66" cy="50" r="2" fill="#d8ad45"/>
    </svg>`
  },
  {
    slug: "jatman",
    name: "JATMAN",
    tagline: "Wadah Pengamal Tarekat Mu'tabar NU",
    desc: "Jam'iyyah Ahli Thariqah al-Mu'tabarah an-Nahdliyyah — menghimpun para pengamal dan pengajar tarikat yang mu'tabar (diakui sanadnya) dalam naungan Ahlussunnah wal Jama'ah.",
    basis: "Pengamal & guru tarikat mu'tabar",
    color: "#1b4d3e",
    gradient: "linear-gradient(135deg, #1b4d3e 0%, #0f3a2d 30%, #162b22 50%, #0d1117 100%)",
    heroEmoji: ["📿", "🌙", "🕯️", "☪️"],
    sectionTitle: "Dzikir & Majelis Tarekat",
    visi: "Menjaga kesinambungan sanad ilmu tarekat mu'tabar, membimbing umat dalam perjalanan spiritual, dan melestarikan tradisi dzikir Nahdliyin.",
    quote: "\"Ingatlah, hanya dengan mengingat Allah hati menjadi tenteram.\" — QS. Ar-Ra'd: 28",
    tags: ["Tarikat", "Dzikir", "Sanad Ilmu", "Istighotsah"],
    icon: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="45" fill="#1b4d3e" stroke="#d8ad45" stroke-width="2"/>
      <circle cx="50" cy="50" r="41" stroke="#ffffff" stroke-width="1" stroke-dasharray="2 2"/>
      <path d="M35,38 C35,53 47,65 62,65 C67,65 72,63 76,60 C71,67 61,71 50,71 C36,71 25,60 25,46 C25,37 30,29 37,25 C35,29 35,33 35,38 Z" fill="#ffffff"/>
      <circle cx="50" cy="50" r="32" stroke="rgba(255,255,255,0.15)" stroke-width="1.5"/>
      <circle cx="50" cy="18" r="2" fill="#d8ad45"/><circle cx="66" cy="22" r="2" fill="#d8ad45"/><circle cx="78" cy="34" r="2" fill="#d8ad45"/><circle cx="82" cy="50" r="2" fill="#d8ad45"/><circle cx="78" cy="66" r="2" fill="#d8ad45"/><circle cx="66" cy="78" r="2" fill="#d8ad45"/><circle cx="50" cy="82" r="2" fill="#d8ad45"/><circle cx="34" cy="78" r="2" fill="#d8ad45"/><circle cx="22" cy="66" r="2" fill="#d8ad45"/><circle cx="18" cy="50" r="2" fill="#d8ad45"/><circle cx="22" cy="34" r="2" fill="#d8ad45"/><circle cx="34" cy="22" r="2" fill="#d8ad45"/>
      <polygon points="52,42 54,45 57,45 55,47 56,50 52,48 48,50 49,47 47,45 50,45" fill="#d8ad45"/>
    </svg>`
  },
  {
    slug: "jqh",
    name: "JQH NU",
    tagline: "Penjaga Al-Qur'an, Pelestari Tilawah",
    desc: "Jam'iyyatul Qurra wal Huffazh — wadah para qari'/qari'ah dan hafizh/hafizhah Al-Qur'an NU. Tangguh dalam MTQ, tilawah, tahfizh, dan pembinaan generasi Qur'ani.",
    basis: "Qari', qari'ah, hafizh, hafizhah",
    color: "#097969",
    gradient: "linear-gradient(135deg, #097969 0%, #065e50 30%, #0a4a3e 50%, #0d1117 100%)",
    heroEmoji: ["📖", "✨", "🌟", "🕋"],
    sectionTitle: "Tilawah & Pembinaan Tahfizh",
    visi: "Mencetak generasi Qur'ani yang fasih membaca, menghafal, dan mengamalkan Al-Qur'an di tengah-tengah kehidupan bermasyarakat.",
    quote: "\"Sebaik-baik kalian adalah yang mempelajari Al-Qur'an dan mengajarkannya.\" — HR. Bukhari",
    tags: ["Tilawah", "Tahfizh", "MTQ", "Pembinaan"],
    icon: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="45" fill="#097969" stroke="#d8ad45" stroke-width="2"/>
      <path d="M35,68 L65,48 M65,68 L35,48" stroke="#ffffff" stroke-width="4" stroke-linecap="round"/>
      <path d="M32,45 C38,40 48,46 50,48 C52,46 62,40 68,45 L68,33 C62,28 52,34 50,36 C48,34 38,28 32,33 Z" fill="#ffffff" stroke="#d8ad45" stroke-width="1"/>
      <path d="M35,36 H45 M35,40 H45 M55,36 H65 M55,40 H65" stroke="#097969" stroke-width="1"/>
      <polygon points="50,20 51.5,23 54,23 52,24.5 53,27 50,25.5 47,27 48,24.5 46,23 48.5,23" fill="#d8ad45"/>
      <circle cx="34" cy="25" r="1.5" fill="#ffffff"/>
      <circle cx="42" cy="22" r="1.5" fill="#d8ad45"/>
      <circle cx="58" cy="22" r="1.5" fill="#d8ad45"/>
      <circle cx="66" cy="25" r="1.5" fill="#ffffff"/>
    </svg>`
  },
  {
    slug: "pergunu",
    name: "Pergunu",
    tagline: "Guru NU: Mendidik, Mengabdi, Menginspirasi",
    desc: "Persatuan Guru Nahdlatul Ulama — menghimpun para pendidik dan tenaga pengajar di lingkungan NU. Fokus pada peningkatan kualitas pendidikan Islam dan kesejahteraan guru.",
    basis: "Guru & pendidik di lingkungan NU",
    color: "#0f52ba",
    gradient: "linear-gradient(135deg, #0f52ba 0%, #0a3d8f 30%, #1a2a5a 60%, #0d1117 100%)",
    heroEmoji: ["🎓", "📝", "🏫", "📐"],
    sectionTitle: "Pendidikan & Pelatihan Guru",
    visi: "Meningkatkan kualitas dan profesionalisme guru NU serta mewujudkan pendidikan Islam yang bermutu dan merata.",
    quote: "\"Guru yang baik mengajarkan ilmu, guru yang hebat menginspirasi kehidupan.\" — Hikmah",
    tags: ["Pendidikan", "Pelatihan Guru", "Ma'arif", "Beasiswa"],
    icon: `<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="45" fill="#0f52ba" stroke="#ffffff" stroke-width="2"/>
      <circle cx="50" cy="50" r="41" stroke="#d8ad45" stroke-width="1.5"/>
      <path d="M30,55 C38,50 48,55 50,57 C52,55 62,50 70,55 L70,38 C62,33 52,38 50,40 C48,38 38,33 30,38 Z" fill="#ffffff" stroke="#0f52ba" stroke-width="1"/>
      <path d="M62,24 L48,46 L45,50 L50,48 L52,47 Z" fill="#d8ad45"/>
      <line x1="62" y1="24" x2="48" y2="46" stroke="#ffffff" stroke-width="1.5"/>
      <polygon points="50,23 51.5,26 54,26 52,27.5 53,30 50,28.5 47,30 48,27.5 46,26 48.5,26" fill="#d8ad45"/>
      <circle cx="35" cy="28" r="1.5" fill="#d8ad45"/>
      <circle cx="42" cy="25" r="1.5" fill="#ffffff"/>
      <circle cx="58" cy="25" r="1.5" fill="#ffffff"/>
      <circle cx="66" cy="28" r="1.5" fill="#d8ad45"/>
    </svg>`
  }
];

export const BANOM_DATA = [...DEFAULT_BANOMS];

export const sessionKey = "koin-nu-demo-session";
export const authSessionKey = "koin-nu-postgres-auth-session";
export const roles = ["admin", "bendahara", "petugas", "pengurus"];

export const app = document.querySelector("#app");

export const demoData = {
  totals: {
    monthlyCoins: 18450000,
    activeDonors: 326,
    officers: 18,
    pendingDeposits: 7,
    distributedFunds: 12600000
  },
  income: [
    { month: "Des", amount: 10200000 },
    { month: "Jan", amount: 11850000 },
    { month: "Feb", amount: 13200000 },
    { month: "Mar", amount: 14900000 },
    { month: "Apr", amount: 16750000 },
    { month: "Mei", amount: 18450000 }
  ],
  activities: [
    { time: "Hari ini, 09.20", actor: "Siti Aminah", type: "Setoran", detail: "Setoran RT 03 menunggu verifikasi", amount: 1250000, status: "Menunggu" },
    { time: "Hari ini, 08.45", actor: "Ahmad Fauzi", type: "Pengambilan", detail: "Input koin warga RT 06", amount: 680000, status: "Tercatat" },
    { time: "Kemarin, 16.10", actor: "Bendahara", type: "Verifikasi", detail: "Setoran RT 01 disetujui", amount: 940000, status: "Selesai" },
    { time: "Kemarin, 13.30", actor: "Admin", type: "Penyaluran", detail: "Bantuan pendidikan santri", amount: 3200000, status: "Tersalur" },
    { time: "26 Mei, 10.05", actor: "Nur Hasan", type: "Pengambilan", detail: "Jemput koin area musholla", amount: 510000, status: "Tercatat" }
  ],
  donors: [
    { id: 1, name: "KH. Abdul Wahid", address: "Jl. Masjid Al-Hikmah No. 12", rt: "01", rw: "03", phone: "0812-3456-7701", officer: "Ahmad Fauzi", officerEmail: "petugas@rantingnu.id", active: true, note: "Donatur tetap, kotak di teras depan." },
    { id: 2, name: "Ibu Siti Aminah", address: "Gang Melati RT 02 dekat musholla", rt: "02", rw: "03", phone: "0857-1122-3302", officer: "Siti Aminah", officerEmail: "siti@rantingnu.id", active: true, note: "Pengambilan setiap Jumat sore." },
    { id: 3, name: "Bapak H. Munir", address: "Perum Ranting Indah Blok C4", rt: "03", rw: "03", phone: "0821-9090-1203", officer: "Nur Hasan", officerEmail: "nur@rantingnu.id", active: false, note: "Sementara pindah rumah, konfirmasi ulang bulan depan." },
    { id: 4, name: "Ibu Fatimah Zahra", address: "Jl. Pesantren Barat No. 8", rt: "04", rw: "04", phone: "0813-7766-4504", officer: "Ahmad Fauzi", officerEmail: "petugas@rantingnu.id", active: true, note: "Titip ke anak jika rumah kosong." },
    { id: 5, name: "Bapak Slamet Riyadi", address: "Gang Kenanga ujung utara", rt: "05", rw: "04", phone: "0852-6666-5505", officer: "Ahmad Fauzi", officerEmail: "petugas@rantingnu.id", active: true, note: "Kotak diganti bulan lalu." },
    { id: 6, name: "Ibu Lailatul Fitriyah", address: "Jl. Lapangan Selatan No. 21", rt: "06", rw: "05", phone: "0881-2345-9906", officer: "Siti Aminah", officerEmail: "siti@rantingnu.id", active: true, note: "Butuh kuitansi saat pengambilan." },
    { id: 7, name: "Bapak M. Ridwan", address: "Kontrakan Pak Harjo pintu dua", rt: "04", rw: "05", phone: "0819-1010-4107", officer: "Nur Hasan", officerEmail: "nur@rantingnu.id", active: false, note: "Nonaktif atas permintaan keluarga." },
    { id: 8, name: "Ibu Nur Khasanah", address: "Jl. Makam Wali No. 5", rt: "01", rw: "04", phone: "0878-2221-1108", officer: "Ahmad Fauzi", officerEmail: "petugas@rantingnu.id", active: true, note: "Area prioritas petugas demo." }
  ],
  pickups: [
    { id: 101, transactionNo: "TRX-20260530-001", donorId: 1, donorName: "KH. Abdul Wahid", donorAddress: "Jl. Masjid Al-Hikmah No. 12", date: "2026-05-30", amount: 175000, method: "Tunai", status: "Menunggu Verifikasi", note: "Kotak penuh, diterima langsung.", officer: "Ahmad Fauzi", officerEmail: "petugas@rantingnu.id", proofPhotoUrl: "", proofPhotoName: "" },
    { id: 102, transactionNo: "TRX-20260530-002", donorId: 4, donorName: "Ibu Fatimah Zahra", donorAddress: "Jl. Pesantren Barat No. 8", date: "2026-05-30", amount: 125000, method: "QRIS", status: "Disetujui Bendahara", note: "QRIS dari anak beliau.", officer: "Ahmad Fauzi", officerEmail: "petugas@rantingnu.id" },
    { id: 103, transactionNo: "TRX-20260529-001", donorId: 2, donorName: "Ibu Siti Aminah", donorAddress: "Gang Melati RT 02 dekat musholla", date: "2026-05-29", amount: 98000, method: "Tunai", status: "Menunggu Verifikasi", note: "Pengambilan rutin Jumat.", officer: "Siti Aminah", officerEmail: "siti@rantingnu.id" },
    { id: 104, transactionNo: "TRX-20260528-001", donorId: 6, donorName: "Ibu Lailatul Fitriyah", donorAddress: "Jl. Lapangan Selatan No. 21", date: "2026-05-28", amount: 150000, method: "Transfer", status: "Disetujui Bendahara", note: "Transfer ke rekening ranting.", officer: "Siti Aminah", officerEmail: "siti@rantingnu.id" },
    { id: 105, transactionNo: "TRX-20260527-001", donorId: 8, donorName: "Ibu Nur Khasanah", donorAddress: "Jl. Makam Wali No. 5", date: "2026-05-27", amount: 87000, method: "Tunai", status: "Ditolak", note: "Nominal perlu dicek ulang.", officer: "Ahmad Fauzi", officerEmail: "petugas@rantingnu.id" },
    { id: 106, transactionNo: "TRX-20260526-001", donorId: 5, donorName: "Bapak Slamet Riyadi", donorAddress: "Gang Kenanga ujung utara", date: "2026-05-26", amount: 112000, method: "Tunai", status: "Disetujui Bendahara", note: "Kotak diganti kondisi baik.", officer: "Ahmad Fauzi", officerEmail: "petugas@rantingnu.id" },
    { id: 107, transactionNo: "TRX-20260525-001", donorId: 1, donorName: "KH. Abdul Wahid", donorAddress: "Jl. Masjid Al-Hikmah No. 12", date: "2026-05-25", amount: 164000, method: "Transfer", status: "Disetujui Bendahara", note: "Transfer setelah pengambilan.", officer: "Ahmad Fauzi", officerEmail: "petugas@rantingnu.id" },
    { id: 108, transactionNo: "TRX-20260524-001", donorId: 2, donorName: "Ibu Siti Aminah", donorAddress: "Gang Melati RT 02 dekat musholla", date: "2026-05-24", amount: 73000, method: "Tunai", status: "Menunggu Verifikasi", note: "Rumah sedang ramai pengajian.", officer: "Siti Aminah", officerEmail: "siti@rantingnu.id" },
    { id: 109, transactionNo: "TRX-20260523-001", donorId: 4, donorName: "Ibu Fatimah Zahra", donorAddress: "Jl. Pesantren Barat No. 8", date: "2026-05-23", amount: 99000, method: "QRIS", status: "Disetujui Bendahara", note: "Dibayar via QRIS.", officer: "Nur Hasan", officerEmail: "nur@rantingnu.id" },
    { id: 110, transactionNo: "TRX-20260522-001", donorId: 6, donorName: "Ibu Lailatul Fitriyah", donorAddress: "Jl. Lapangan Selatan No. 21", date: "2026-05-22", amount: 141000, method: "Tunai", status: "Disetujui Bendahara", note: "Butuh kuitansi.", officer: "Siti Aminah", officerEmail: "siti@rantingnu.id" },
    { id: 111, transactionNo: "TRX-20260521-001", donorId: 8, donorName: "Ibu Nur Khasanah", donorAddress: "Jl. Makam Wali No. 5", date: "2026-05-21", amount: 88000, method: "Tunai", status: "Menunggu Verifikasi", note: "Titip keluarga.", officer: "Ahmad Fauzi", officerEmail: "petugas@rantingnu.id" },
    { id: 112, transactionNo: "TRX-20260520-001", donorId: 5, donorName: "Bapak Slamet Riyadi", donorAddress: "Gang Kenanga ujung utara", date: "2026-05-20", amount: 106000, method: "Transfer", status: "Ditolak", note: "Bukti transfer belum sesuai.", officer: "Nur Hasan", officerEmail: "nur@rantingnu.id" },
    { id: 113, transactionNo: "TRX-20260519-001", donorId: 1, donorName: "KH. Abdul Wahid", donorAddress: "Jl. Masjid Al-Hikmah No. 12", date: "2026-05-19", amount: 153000, method: "Tunai", status: "Disetujui Bendahara", note: "Diterima langsung.", officer: "Ahmad Fauzi", officerEmail: "petugas@rantingnu.id" },
    { id: 114, transactionNo: "TRX-20260518-001", donorId: 2, donorName: "Ibu Siti Aminah", donorAddress: "Gang Melati RT 02 dekat musholla", date: "2026-05-18", amount: 66000, method: "QRIS", status: "Disetujui Bendahara", note: "QRIS lancar.", officer: "Siti Aminah", officerEmail: "siti@rantingnu.id" },
    { id: 115, transactionNo: "TRX-20260517-001", donorId: 4, donorName: "Ibu Fatimah Zahra", donorAddress: "Jl. Pesantren Barat No. 8", date: "2026-05-17", amount: 132000, method: "Tunai", status: "Menunggu Verifikasi", note: "Input sore hari.", officer: "Ahmad Fauzi", officerEmail: "petugas@rantingnu.id" },
    { id: 116, transactionNo: "TRX-20260516-001", donorId: 6, donorName: "Ibu Lailatul Fitriyah", donorAddress: "Jl. Lapangan Selatan No. 21", date: "2026-05-16", amount: 97000, method: "Tunai", status: "Disetujui Bendahara", note: "Setoran rutin.", officer: "Nur Hasan", officerEmail: "nur@rantingnu.id" },
    { id: 117, transactionNo: "TRX-20260515-001", donorId: 8, donorName: "Ibu Nur Khasanah", donorAddress: "Jl. Makam Wali No. 5", date: "2026-05-15", amount: 79000, method: "Transfer", status: "Disetujui Bendahara", note: "Transfer malam.", officer: "Ahmad Fauzi", officerEmail: "petugas@rantingnu.id" },
    { id: 118, transactionNo: "TRX-20260514-001", donorId: 5, donorName: "Bapak Slamet Riyadi", donorAddress: "Gang Kenanga ujung utara", date: "2026-05-14", amount: 115000, method: "Tunai", status: "Menunggu Verifikasi", note: "Perlu dicek bendahara.", officer: "Siti Aminah", officerEmail: "siti@rantingnu.id" },
    { id: 119, transactionNo: "TRX-20260513-001", donorId: 1, donorName: "KH. Abdul Wahid", donorAddress: "Jl. Masjid Al-Hikmah No. 12", date: "2026-05-13", amount: 121000, method: "QRIS", status: "Disetujui Bendahara", note: "Pembayaran non tunai.", officer: "Ahmad Fauzi", officerEmail: "petugas@rantingnu.id" },
    { id: 120, transactionNo: "TRX-20260512-001", donorId: 2, donorName: "Ibu Siti Aminah", donorAddress: "Gang Melati RT 02 dekat musholla", date: "2026-05-12", amount: 84000, method: "Tunai", status: "Disetujui Bendahara", note: "Aman.", officer: "Nur Hasan", officerEmail: "nur@rantingnu.id" }
  ],
  officerDeposits: [
    { id: 601, depositNo: "STP-20260530-001", officer: "Ahmad Fauzi", officerEmail: "petugas@rantingnu.id", date: "2026-05-30", periodStart: "2026-05-25", periodEnd: "2026-05-30", amount: 4880000, transactionCount: 42, method: "Tunai", status: "Menunggu Verifikasi", note: "Setoran pengambilan akhir bulan.", proofPhotoName: "" },
    { id: 602, depositNo: "STP-20260529-001", officer: "Siti Aminah", officerEmail: "siti@rantingnu.id", date: "2026-05-29", periodStart: "2026-05-22", periodEnd: "2026-05-29", amount: 8462000, transactionCount: 71, method: "Transfer", status: "Diterima Bendahara", note: "Transfer diterima rekening ranting.", proofPhotoName: "transfer-siti.jpg" },
    { id: 603, depositNo: "STP-20260525-001", officer: "Nur Hasan", officerEmail: "nur@rantingnu.id", date: "2026-05-25", periodStart: "2026-05-12", periodEnd: "2026-05-25", amount: 7386000, transactionCount: 64, method: "Tunai", status: "Diterima Bendahara", note: "Sudah dihitung bersama bendahara.", proofPhotoName: "" },
    { id: 604, depositNo: "STP-20260521-001", officer: "Ahmad Fauzi", officerEmail: "petugas@rantingnu.id", date: "2026-05-21", periodStart: "2026-05-13", periodEnd: "2026-05-21", amount: 3441000, transactionCount: 31, method: "QRIS", status: "Dikembalikan Revisi", note: "Mohon unggah ulang bukti QRIS.", proofPhotoName: "" }
  ],
  lazisnuDeposits: [
    { id: 701, depositNo: "LAZ-20260530-001", date: "2026-05-30", destination: "MWC LAZISNU", recipientName: "H. M. Zainuddin", amount: 5500000, method: "Transfer", receiptNo: "KW-MWC-2026-0530", status: "Sudah Disetor", note: "Setoran rutin akhir bulan.", proofPhotoName: "kwitansi-mwc.jpg" },
    { id: 702, depositNo: "LAZ-20260518-001", date: "2026-05-18", destination: "LAZISNU Ranting", recipientName: "Hj. Lailatul Badriyah", amount: 2250000, method: "Tunai", receiptNo: "KW-RANTING-2026-0518", status: "Sudah Disetor", note: "Setoran kas program.", proofPhotoName: "" },
    { id: 703, depositNo: "LAZ-20260531-001", date: "2026-05-31", destination: "PC LAZISNU", recipientName: "Petugas PC LAZISNU", amount: 3000000, method: "Transfer", receiptNo: "", status: "Draft", note: "Menunggu konfirmasi jadwal transfer.", proofPhotoName: "" }
  ],
  distributions: [
    { id: 201, distributionNo: "SLR-20260530-001", date: "2026-05-30", recipientName: "Ananda Fikri Maulana", address: "Gang Melati RT 02", rt: "02", rw: "03", phone: "0812-1111-2301", category: "Santunan Yatim", amount: 750000, source: "Kas Koin NU", status: "Disalurkan", note: "Santunan pendidikan bulanan.", documentationName: "santunan-fikri.jpg", documentationUrl: "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&w=800&q=80" },
    { id: 202, distributionNo: "SLR-20260529-001", date: "2026-05-29", recipientName: "Ibu Salamah", address: "Jl. Makam Wali No. 17", rt: "01", rw: "04", phone: "0857-2222-9902", category: "Bantuan Dhuafa", amount: 500000, source: "Kas Koin NU", status: "Disalurkan", note: "Bantuan sembako dan tunai.", documentationName: "dhuafa-salamah.jpg", documentationUrl: "https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?auto=format&fit=crop&w=800&q=80" },
    { id: 203, distributionNo: "SLR-20260528-001", date: "2026-05-28", recipientName: "TPQ Al-Hikmah", address: "Kompleks Masjid Al-Hikmah", rt: "01", rw: "03", phone: "0813-3333-4403", category: "Pendidikan", amount: 1200000, source: "Kas Pendidikan", status: "Draft", note: "Rencana pembelian kitab dan alat tulis.", documentationName: "" },
    { id: 204, distributionNo: "SLR-20260525-001", date: "2026-05-25", recipientName: "Bapak M. Ridwan", address: "Kontrakan Pak Harjo pintu dua", rt: "04", rw: "05", phone: "0821-4444-5504", category: "Kesehatan", amount: 900000, source: "Kas Koin NU", status: "Disalurkan", note: "Bantuan biaya pemeriksaan.", documentationName: "kesehatan-ridwan.jpg" },
    { id: 205, distributionNo: "SLR-20260523-001", date: "2026-05-23", recipientName: "Keluarga Alm. Pak Hasan", address: "Jl. Pesantren Barat No. 3", rt: "04", rw: "04", phone: "0881-5555-6605", category: "Kematian", amount: 1000000, source: "Kas Sosial", status: "Disalurkan", note: "Takziah dan bantuan keluarga.", documentationName: "" },
    { id: 206, distributionNo: "SLR-20260520-001", date: "2026-05-20", recipientName: "Warga Terdampak Angin", address: "Gang Kenanga ujung utara", rt: "05", rw: "04", phone: "0878-6666-7706", category: "Bencana", amount: 1500000, source: "Kas Darurat", status: "Disalurkan", note: "Perbaikan atap rumah.", documentationName: "bencana-kenanga.jpg" },
    { id: 207, distributionNo: "SLR-20260518-001", date: "2026-05-18", recipientName: "Panitia Maulid Ranting", address: "Balai Ranting NU", rt: "03", rw: "03", phone: "0819-7777-8807", category: "Kegiatan Keagamaan", amount: 800000, source: "Kas Kegiatan", status: "Disalurkan", note: "Dukungan konsumsi pengajian.", documentationName: "" },
    { id: 208, distributionNo: "SLR-20260515-001", date: "2026-05-15", recipientName: "Sekretariat Ranting", address: "Balai Ranting NU", rt: "03", rw: "03", phone: "0852-8888-9908", category: "Operasional Ranting", amount: 650000, source: "Kas Operasional", status: "Disalurkan", note: "ATK dan administrasi.", documentationName: "operasional.jpg" },
    { id: 209, distributionNo: "SLR-20260512-001", date: "2026-05-12", recipientName: "Ibu Nur Khasanah", address: "Jl. Makam Wali No. 5", rt: "01", rw: "04", phone: "0878-2221-1108", category: "Lainnya", amount: 300000, source: "Kas Koin NU", status: "Dibatalkan", note: "Data penerima dialihkan ke program lain.", documentationName: "" },
    { id: 210, distributionNo: "SLR-20260428-001", date: "2026-04-28", recipientName: "Ananda Salsabila", address: "Jl. Lapangan Selatan No. 7", rt: "06", rw: "05", phone: "0812-9999-0010", category: "Pendidikan", amount: 750000, source: "Kas Pendidikan", status: "Disalurkan", note: "Bantuan perlengkapan sekolah.", documentationName: "pendidikan-salsa.jpg" }
  ],
  publicDocumentation: [
    { id: 501, title: "Pengajian Selapanan & Kajian Aswaja", category: "Pengajian", date: "2026-05-26", photoName: "galeri-pengajian-selapanan.jpg", photoUrl: "/galeri-pengajian-selapanan.jpg", organization: "ranting" },
    { id: 502, title: "Penyaluran Sembako & Santunan Dhuafa", category: "Bakti Sosial", date: "2026-05-20", photoName: "galeri-santunan-dhuafa.jpg", photoUrl: "/galeri-santunan-dhuafa.jpg", organization: "ranting" },
    { id: 503, title: "Bakti Sosial GP Ansor — Bersih Masjid", category: "Kepemudaan", date: "2026-05-12", photoName: "galeri-bakti-sosial-ansor.jpg", photoUrl: "/galeri-bakti-sosial-ansor.jpg", organization: "gp-ansor" },
    { id: 504, title: "Rapat Pleno Pengurus Ranting 2026", category: "Kegiatan Ranting", date: "2026-05-16", photoName: "galeri-rapat-pengurus.jpg", photoUrl: "/galeri-rapat-pengurus.jpg", organization: "ranting" },
    { id: 505, title: "Halal Bihalal & Silaturahim Warga Nahdliyin", category: "Kegiatan Ranting", date: "2026-04-10", photoName: "galeri-halal-bihalal.jpg", photoUrl: "/galeri-halal-bihalal.jpg", organization: "ranting" },
    { id: 506, title: "Santunan Anak Yatim Bulanan — Mei 2026", category: "Santunan", date: "2026-05-30", photoName: "galeri-santunan-yatim.jpg", photoUrl: "/galeri-santunan-yatim.jpg", organization: "ranting" },
    { id: 507, title: "Kajian Kitab & Rutinan IPNU-IPPNU", category: "Kepemudaan", date: "2026-04-28", photoName: "galeri-ipnu.jpg", photoUrl: "/galeri-ipnu.jpg", organization: "ipnu" },
    { id: 508, title: "Pengambilan Koin NU dari Rumah Warga", category: "Operasional", date: "2026-05-19", photoName: "galeri-koin-nu-collection.jpg", photoUrl: "/galeri-koin-nu-collection.jpg", organization: "ranting" },
    { id: 509, title: "Pelatihan Kewirausahaan Ibu-ibu Muslimat", category: "Pemberdayaan", date: "2026-05-02", photoName: "galeri-muslimat.jpg", photoUrl: "/galeri-muslimat.jpg", organization: "muslimat" },
    { id: 510, title: "Penyaluran Sembako & Santunan Fatayat", category: "Sosial", date: "2026-05-24", photoName: "galeri-fatayat.jpg", photoUrl: "/galeri-fatayat.jpg", organization: "fatayat" },
    { id: 511, title: "Rutinan Majelis Yasin IPPNU Ranting", category: "Keagamaan", date: "2026-05-16", photoName: "galeri-ippnu.jpg", photoUrl: "/galeri-ippnu.jpg", organization: "ippnu" },
    { id: 512, title: "Latihan Rutin Pencak Silat Pagar Nusa", category: "Olahraga", date: "2026-05-15", photoName: "galeri-pagar-nusa.jpg", photoUrl: "/galeri-pagar-nusa.jpg", organization: "pagar-nusa" },
    { id: 513, title: "Rutinan Istighotsah JATMAN", category: "Keagamaan", date: "2026-05-10", photoName: "galeri-jatman.jpg", photoUrl: "/galeri-jatman.jpg", organization: "jatman" },
    { id: 514, title: "Wisuda Tahfizh Al-Qur'an Juz Amma JQH", category: "Keagamaan", date: "2026-05-05", photoName: "galeri-jqh.jpg", photoUrl: "/galeri-jqh.jpg", organization: "jqh" },
    { id: 515, title: "Workshop Guru Aswaja Ranting NU", category: "Pendidikan", date: "2026-04-28", photoName: "galeri-pergunu.jpg", photoUrl: "/galeri-pergunu.jpg", organization: "pergunu" }
  ],
  news: [
    { id: 801, title: "Lailatul Ijtima' PRNU Karangsalam Kidul II Perkuat Silaturahmi & Koin NU", category: "Kegiatan Ranting", date: "2026-05-26", excerpt: "Kegiatan rutin bulanan Lailatul Ijtima' diisi dengan Istighotsah bersama and penyerahan Koin NU Ranting.", content: "Lailatul Ijtima' kembali digelar oleh Pengurus Ranting Nahdlatul Ulama Karangsalam Kidul II. Bertempat di Masjid Baiturrahman RT 03/RW 03, acara ini dihadiri puluhan warga Nahdliyin. Lailatul Ijtima' bulanan diisi tahlil dan laporan transparansi Koin NU.", imageName: "galeri-pengajian-selapanan.jpg", imageUrl: "/galeri-pengajian-selapanan.jpg", status: "published", organization: "ranting" },
    { id: 802, title: "LAZISNU Ranting Salurkan Santunan Bulanan untuk Anak Yatim dan Lansia", category: "Sosial", date: "2026-05-20", excerpt: "Penyaluran dana Koin NU berupa santunan sembako dan biaya sekolah untuk warga yang membutuhkan.", content: "LAZISNU Ranting Karangsalam Kidul II mendistribusikan santunan bulanan kepada belasan anak yatim dan warga lanjut usia kurang mampu.", imageName: "galeri-santunan-yatim.jpg", imageUrl: "/galeri-santunan-yatim.jpg", status: "published", organization: "ranting" },
    { id: 803, title: "Rutinan Yasin & Tahlil IPNU-IPPNU Karangsalam Kidul II Semakin Semarak", category: "Kepemudaan", date: "2026-05-16", excerpt: "Rekan-rekanita IPNU-IPPNU giatkan rutinan mingguan demi menjaga tradisi Aswaja di kalangan remaja.", content: "Ikatan Pelajar Nahdlatul Ulama (IPNU) dan Ikatan Pelajar Putri Nahdlatul Ulama (IPPNU) Ranting Karangsalam Kidul II mengadakan rutinan yasinan dan tahlilan.", imageName: "galeri-ipnu.jpg", imageUrl: "/galeri-ipnu.jpg", status: "published", organization: "ipnu" },
    { id: 804, title: "GP Ansor & Banser Gotong Royong Aksi Bersih Masjid & Mushola Ranting", category: "Kepemudaan", date: "2026-05-12", excerpt: "Anggota Banser dan GP Ansor bergotong royong membersihkan tempat ibadah menyambut hari-hari besar Islam.", content: "GP Ansor Ranting Karangsalam Kidul II bersama satuan Banser bahu-membahu membersihkan area utama Masjid Baiturrahman dan lima mushola.", imageName: "galeri-bakti-sosial-ansor.jpg", imageUrl: "/galeri-bakti-sosial-ansor.jpg", status: "published", organization: "gp-ansor" },
    { id: 805, title: "SIKOINNU Resmi Diluncurkan: Transparansi Digital Koin NU Ranting", category: "Organisasi", date: "2026-05-08", excerpt: "Digitalisasi administrasi Koin NU resmi digunakan untuk pencatatan donasi yang amanah, transparan, dan akuntabel.", content: "SIKOINNU resmi menjadi platform transparansi pengelolaan infaq warga Nahdliyin.", imageName: "galeri-rapat-pengurus.jpg", imageUrl: "/galeri-rapat-pengurus.jpg", status: "published", organization: "ranting" },
    { id: 806, title: "Muslimat NU Karangsalam Kidul II Gelar Pelatihan UMKM Kuliner Halal", category: "Sosial & Ekonomi", date: "2026-05-02", excerpt: "Ibu-ibu Muslimat NU dilatih membuat produk makanan olahan bernilai jual tinggi dengan pemahaman sertifikasi halal.", content: "Muslimat NU Ranting Karangsalam Kidul II mengadakan pelatihan kuliner halal.", imageName: "galeri-muslimat.jpg", imageUrl: "/galeri-muslimat.jpg", status: "published", organization: "muslimat" },
    { id: 807, title: "Fatayat NU Karangsalam Kidul II Gelar Penyuluhan Pencegahan Stunting", category: "Kesehatan & Sosial", date: "2026-05-24", excerpt: "Edukasi gizi seimbang bagi ibu hamil dan balita.", content: "Fatayat NU Ranting Karangsalam Kidul II menggelar penyuluhan gizi.", imageName: "galeri-fatayat.jpg", imageUrl: "/galeri-fatayat.jpg", status: "published", organization: "fatayat" },
    { id: 808, title: "Latihan Kepemimpinan IPPNU Ranting Lahirkan Kader Putri yang Mandiri & Agamis", category: "Kaderisasi", date: "2026-05-18", excerpt: "LAKMUD melatih kecerdasan berorganisasi.", content: "IPPNU Ranting Karangsalam Kidul II sukses menyelenggarakan LAKMUD.", imageName: "galeri-ippnu.jpg", imageUrl: "/galeri-ippnu.jpg", status: "published", organization: "ippnu" },
    { id: 809, title: "Pagar Nusa Ranting Karangsalam Kidul II Gelar Ujian Kenaikan Tingkat Sabuk", category: "Seni Bela Diri & Olahraga", date: "2026-05-15", excerpt: "UKT materi ketahanan fisik.", content: "Pagar Nusa Ranting Karangsalam Kidul II menyelenggarakan UKT sabuk.", imageName: "galeri-pagar-nusa.jpg", imageUrl: "/galeri-pagar-nusa.jpg", status: "published", organization: "pagar-nusa" },
    { id: 810, title: "Rutinan Istighotsah & Dzikir JATMAN", category: "Keagamaan", date: "2026-05-10", excerpt: "Dzikir bersama demi kedamaian bangsa.", content: "JATMAN Ranting Karangsalam Kidul II mengadakan istighotsah.", imageName: "galeri-jatman.jpg", imageUrl: "/galeri-jatman.jpg", status: "published", organization: "jatman" },
    { id: 811, title: "JQH NU Karangsalam Kidul II Wisuda 15 Santri Hafizh Juz Amma", category: "Pendidikan & Keagamaan", date: "2026-05-05", excerpt: "Wisuda tahfizh santri cilik.", content: "JQH Ranting Karangsalam Kidul II wisuda hafizh Juz Amma.", imageName: "galeri-jqh.jpg", imageUrl: "/galeri-jqh.jpg", status: "published", organization: "jqh" },
    { id: 812, title: "Pergunu Ranting Sukses Selenggarakan Workshop Media Guru", category: "Pendidikan", date: "2026-04-28", excerpt: "Pelatihan pemanfaatan teknologi digital.", content: "Pergunu Ranting Karangsalam Kidul II mengadakan workshop guru.", imageName: "galeri-pergunu.jpg", imageUrl: "/galeri-pergunu.jpg", status: "published", organization: "pergunu" }
  ],
  officers: [
    { id: 301, name: "Ahmad Fauzi", phone: "0812-7000-0101", address: "Jl. Masjid Al-Hikmah No. 4", rt: "01", rw: "03", area: "RT 01/RW 03, RT 04/RW 04, RT 05/RW 04", donorCount: 4, username: "petugas@rantingnu.id", role: "petugas", active: true, note: "Petugas demo utama." },
    { id: 302, name: "Siti Aminah", phone: "0857-7000-0202", address: "Gang Melati Tengah", rt: "02", rw: "03", area: "RT 02/RW 03, RT 06/RW 05", donorCount: 2, username: "siti@rantingnu.id", role: "petugas", active: true, note: "Koordinator area musholla." },
    { id: 303, name: "Nur Hasan", phone: "0821-7000-0303", address: "Perum Ranting Indah Blok A2", rt: "03", rw: "03", area: "RT 03/RW 03, RT 04/RW 05", donorCount: 2, username: "nur@rantingnu.id", role: "petugas", active: true, note: "Aktif pengambilan akhir pekan." },
    { id: 304, name: "Miftahul Huda", phone: "0813-7000-0404", address: "Jl. Pesantren Timur", rt: "04", rw: "04", area: "RT 04/RW 04", donorCount: 18, username: "miftah@rantingnu.id", role: "petugas", active: true, note: "Cadangan verifikasi lapangan." },
    { id: 305, name: "Laili Rohmah", phone: "0881-7000-0505", address: "Gang Kenanga Selatan", rt: "05", rw: "04", area: "RT 05/RW 04", donorCount: 21, username: "laili@rantingnu.id", role: "petugas", active: false, note: "Sementara nonaktif karena pindah domisili." },
    { id: 306, name: "Abdul Karim", phone: "0878-7000-0606", address: "Jl. Lapangan Selatan", rt: "06", rw: "05", area: "RT 06/RW 05", donorCount: 17, username: "karim@rantingnu.id", role: "petugas", active: true, note: "Membantu input data malam hari." },
    { id: 307, name: "Halimatus Sa'diyah", phone: "0852-7000-0707", address: "Jl. Makam Wali", rt: "01", rw: "04", area: "RT 01/RW 04", donorCount: 15, username: "halimah@rantingnu.id", role: "petugas", active: true, note: "Pendamping area ibu muslimat." },
    { id: 308, name: "Rofiq Hidayat", phone: "0819-7000-0808", address: "Kontrakan Pak Harjo", rt: "04", rw: "05", area: "RT 04/RW 05", donorCount: 12, username: "rofiq@rantingnu.id", role: "petugas", active: false, note: "Menunggu pembaruan wilayah tugas." }
  ],
  branchProfile: {
    branchName: "PRNU Karangsalam Kidul II",
    village: "Karangsalam Kidul",
    district: "Kedungbanteng",
    regency: "Banyumas",
    province: "Jawa Tengah",
    secretariatAddress: "Jl. Lapangan Karangsalam Kidul No. 2, Kedungbanteng, Banyumas",
    phone: "0812-7000-0101",
    email: "nu.karangsalamkidul2@gmail.com",
    branchLogo: "",
    nuLogo: "logo-nu-demo.png",
    servicePeriod: "2025 - 2030"
  },
  boardMembers: [
    { id: 401, position: "Rais Syuriah", name: "Kiai Masruri", phone: "0812-8100-0011", address: "Grumbul Kaliputra RT 01/RW 03", photo: "", term: "2025 - 2030", active: true, organization: "ranting" },
    { id: 402, position: "Katib Syuriah", name: "Kiai Ahmad Hambali", phone: "0857-8100-0022", address: "Grumbul Karangtawang RT 02/RW 03", photo: "", term: "2025 - 2030", active: true, organization: "ranting" },
    { id: 403, position: "Ketua Tanfidziyah", name: "KH. Muhammad Sholeh", phone: "0812-8100-0101", address: "Jl. Lapangan Karangsalam Kidul No. 4", photo: "", term: "2025 - 2030", active: true, organization: "ranting" },
    { id: 404, position: "Sekretaris", name: "M. Rasyid Ridho", phone: "0821-8100-0303", address: "Jl. Lapangan Karangsalam Kidul No. 8", photo: "", term: "2025 - 2030", active: true, organization: "ranting" },
    { id: 405, position: "Bendahara", name: "Hj. Lailatul Badriyah", phone: "0881-8100-0505", address: "Gang Kenanga RT 05/RW 04", photo: "", term: "2025 - 2030", active: true, organization: "ranting" },
    { id: 406, position: "Wakil Bendahara", name: "Siti Maimunah", phone: "0878-8100-0606", address: "Jl. Lapangan Selatan RT 06/RW 05", photo: "", term: "2025 - 2030", active: true, organization: "ranting" },
    { id: 407, position: "Admin Sistem", name: "Miftahul Huda", phone: "0819-8100-0707", address: "Balai Ranting NU", photo: "", term: "2025 - 2030", active: true, organization: "ranting" },
    { id: 408, position: "Ketua", name: "Hj. Aminah Zahra", phone: "0812-8200-0101", address: "Grumbul Kaliputra RT 02", photo: "", term: "2025 - 2030", active: true, organization: "muslimat" },
    { id: 409, position: "Sekretaris", name: "Ibu Siti Rohmah", phone: "0821-8200-0202", address: "RT 03 RW 03", photo: "", term: "2025 - 2030", active: true, organization: "muslimat" },
    { id: 410, position: "Ketua", name: "Sahabat Nisa Aulia", phone: "0857-8200-0303", address: "Gang Melati RT 01", photo: "", term: "2025 - 2030", active: true, organization: "fatayat" },
    { id: 411, position: "Ketua PAC/Ranting", name: "Sahabat Faris Maulana", phone: "0812-8200-0404", address: "Jl. Lapangan Barat RT 04", photo: "", term: "2025 - 2030", active: true, organization: "gp-ansor" },
    { id: 412, position: "Kasatkoryan Banser", name: "Komandan Joko Prasetyo", phone: "0856-8200-0505", address: "RT 06 RW 05", photo: "", term: "2025 - 2030", active: true, organization: "gp-ansor" },
    { id: 413, position: "Ketua", name: "Rekan Fahmi Hidayat", phone: "0813-8200-0606", address: "RT 05 RW 04", photo: "", term: "2026 - 2028", active: true, organization: "ipnu" },
    { id: 414, position: "Ketua", name: "Rekanita Aulia Rahma", phone: "0877-8200-0707", address: "RT 02 RW 03", photo: "", term: "2026 - 2028", active: true, organization: "ippnu" },
    { id: 415, position: "Ketua / Pendekar", name: "Kang Ahmad Fauzan", phone: "0819-8200-0808", address: "Padepokan Silat RT 01", photo: "", term: "2025 - 2030", active: true, organization: "pagar-nusa" },
    { id: 416, position: "Mursyid / Ketua", name: "Kiai M. Hamid", phone: "0812-8200-0909", address: "Pesantren Al-Muttaqin RT 03", photo: "", term: "2025 - 2030", active: true, organization: "jatman" },
    { id: 417, position: "Ketua Jam'iyyah", name: "Ustadz H. Syarifuddin", phone: "0821-8200-1010", address: "Masjid Baiturrahman RT 03", photo: "", term: "2025 - 2030", active: true, organization: "jqh" },
    { id: 418, position: "Ketua", name: "Bapak Wahyudi, M.Pd.", phone: "0852-8200-1111", address: "Perum Guru Indah RT 05", photo: "", term: "2025 - 2030", active: true, organization: "pergunu" }
  ],
  systemSettings: {
    appName: "SIKOINNU",
    appSlogan: "Transparan, Amanah, dan Berdampak",
    branchName: "PRNU Karangsalam Kidul II",
    appLogo: "/logo-lazisnu.png",
    primaryColor: "#0b6b3a",
    secretariatAddress: "Jl. Lapangan Karangsalam Kidul No. 2, Kedungbanteng, Banyumas",
    email: "nu.karangsalamkidul2@gmail.com",
    adminPhone: "0812-7000-0101",
    activeYear: "2026",
    activePeriod: "Januari - Desember 2026",
    monthlyCoinTarget: 20000000,
    activeDonorTarget: 350,
    distributionTarget: 8000000,
    safeCashTarget: 5000000,
    pickupNumberFormat: "KOIN-{YYYY}-{0001}",
    distributionNumberFormat: "SALUR-{YYYY}-{0001}",
    reportChairName: "KH. Muhammad Sholeh",
    reportTreasurerName: "Hj. Lailatul Badriyah",
    reportHeaderFormat: "Kop resmi NU Ranting lengkap dengan alamat sekretariat",
    showNuLogo: true,
    showBranchLogo: true,
    reportFooter: "Dikembangkan untuk mendukung pengelolaan Koin NU yang profesional, transparan, dan akuntabel.",
    greenMode: true,
    themeMode: "Terang",
    fontSizeMode: "Normal",
    simpleOfficerMode: true,
    banomList: [...DEFAULT_BANOMS]
  }
};

export const appState = {
  donors: [...demoData.donors],
  officers: [...demoData.officers],
  branchProfile: { ...demoData.branchProfile },
  boardMembers: [...demoData.boardMembers],
  systemSettings: { ...demoData.systemSettings },
  distributions: [...demoData.distributions],
  officerDeposits: [...demoData.officerDeposits],
  lazisnuDeposits: [...demoData.lazisnuDeposits],
  publicDocumentation: [...demoData.publicDocumentation],
  news: [...demoData.news],
  pickups: demoData.pickups.map((pickup) => ({
    ...pickup,
    verificationAudit: pickup.status === "Menunggu Verifikasi" ? [] : [{
      treasurer: "Bendahara Demo",
      verifiedAt: pickup.date,
      status: pickup.status,
      note: pickup.status === "Ditolak" ? "Perlu perbaikan data transaksi." : "Transaksi sudah sesuai."
    }]
  })),
  donorSearch: "",
  donorRt: "all",
  donorRw: "all",
  donorStatus: "all",
  selectedDonorId: null,
  modalMode: null,
  donorImportRows: [],
  donorImportFileName: "",
  donorImportModalOpen: false,
  pickupDonor: "all",
  pickupSearch: "",
  pickupDate: "",
  pickupOfficer: "all",
  pickupMethod: "all",
  pickupNotificationStatus: "all",
  selectedPickupId: null,
  pickupModalMode: null,
  pickupPresetDonorId: null,
  pickupScannerOpen: false,
  pickupSuccessId: null,
  verificationTab: "Menunggu Verifikasi",
  verificationSearch: "",
  verificationDate: "",
  verificationOfficer: "all",
  verificationMethod: "all",
  selectedVerificationId: null,
  verificationAction: null,
  reportMonth: String(new Date().getMonth() + 1).padStart(2, "0"),
  reportYear: String(new Date().getFullYear()),
  reportRt: "all",
  reportRw: "all",
  reportOfficer: "all",
  reportStatus: "all",
  reportMethod: "all",
  distributionSearch: "",
  distributionCategory: "all",
  distributionDate: "",
  distributionStatus: "all",
  selectedDistributionId: null,
  distributionModalMode: null,
  officerDepositSearch: "",
  officerDepositOfficer: "all",
  officerDepositDate: "",
  officerDepositStatus: "all",
  selectedOfficerDepositId: null,
  officerDepositModalMode: null,
  lazisnuDepositSearch: "",
  lazisnuDepositDestination: "all",
  lazisnuDepositDate: "",
  lazisnuDepositStatus: "all",
  selectedLazisnuDepositId: null,
  lazisnuDepositModalMode: null,
  officerSearch: "",
  officerArea: "all",
  officerStatus: "all",
  selectedOfficerId: null,
  officerModalMode: null,
  profileEditMode: false,
  boardSearch: "",
  boardPosition: "all",
  boardStatus: "all",
  boardOrg: "all",
  galleryFilterOrg: "all",
  selectedBoardId: null,
  boardModalMode: null,
  settingsEditMode: false,
  passwordEditMode: false,
  users: [
    { id: "demo-admin", email: "admin@rantingnu.id", fullName: "Admin Ranting", role: "admin", phone: "0812-9000-1111", status: "aktif", createdAt: "2026-05-01T08:00:00.000Z" },
    { id: "demo-bendahara", email: "bendahara@rantingnu.id", fullName: "Hj. Lailatul Badriyah", role: "bendahara", phone: "0881-8100-0505", status: "aktif", createdAt: "2026-05-01T08:10:00.000Z" },
    { id: "demo-petugas", email: "petugas@rantingnu.id", fullName: "Ahmad Fauzi", role: "petugas", phone: "0812-7000-0101", status: "aktif", createdAt: "2026-05-01T08:20:00.000Z" },
    { id: "demo-pengurus", email: "pengurus@rantingnu.id", fullName: "KH. Muhammad Sholeh", role: "pengurus", phone: "0812-8100-0101", status: "aktif", createdAt: "2026-05-01T08:30:00.000Z" }
  ],
  userSearch: "",
  userRole: "all",
  userStatus: "all",
  selectedUserId: null,
  userModalMode: null,
  dataSource: "demo",
  postgresReady: false,
  isOffline: !navigator.onLine,
  syncingOffline: false,
  pendingSyncCount: 0
};

export const brand = {
  name: "SIKOINNU",
  subtitle: "Sistem Informasi Koin Nahdlatul Ulama",
  tagline: "Transparan, Amanah, dan Berdampak",
  footer: "Dikembangkan untuk mendukung pengelolaan Koin NU yang profesional, transparan, dan akuntabel.",
  logo: "/logo-lazisnu.png",
  fallbackLogo: "/lazisnu-logo.svg"
};

export const navigationItems = [
  { label: "Dashboard", path: "/dashboard", icon: "grid" },
  { label: "Profil Ranting", path: "/profil-ranting", icon: "report" },
  { label: "Pengurus Ranting", path: "/pengurus", icon: "users" },
  { label: "Data Donatur", path: "/donatur", icon: "users" },
  { label: "Petugas Lapangan", path: "/petugas", icon: "users" },
  { label: "Pengambilan Koin", path: "/pengambilan-koin", icon: "coin" },
  { label: "Verifikasi", path: "/verifikasi", icon: "check" },
  { label: "Setoran Petugas", path: "/setoran-petugas", icon: "coin" },
  { label: "Setor ke LAZISNU", path: "/setor-lazisnu", icon: "report" },
  { label: "Penyaluran Dana", path: "/penyaluran-dana", icon: "report" },
  { label: "Berita", path: "/berita", icon: "report" },
  { label: "Laporan", path: "/laporan", icon: "report" },
  { label: "Kelola User", path: "/users", icon: "users" },
  { label: "Pengaturan", path: "/pengaturan", icon: "check" }
];

export function getSession() {
  try {
    return JSON.parse(localStorage.getItem(sessionKey));
  } catch {
    return null;
  }
}

export function setSession(session) {
  localStorage.setItem(sessionKey, JSON.stringify(session));
}

export function clearSession() {
  localStorage.removeItem(sessionKey);
}

export function isReadOnlyRole(role) {
  return role === "pengurus";
}

export function canManagePublicContent(role) {
  return role === "admin" || role === "bendahara" || role === "pengurus";
}

export function canManageUsers(role) {
  return role === "admin";
}

export function canAccessPath(session, path) {
  if (!session?.role) {
    return false;
  }
  if (path === "/users") {
    return session.role === "admin";
  }
  if (path === "/pengaturan") {
    return session.role === "admin";
  }
  if (session.role === "pengurus") {
    return ["/dashboard", "/profil-ranting", "/pengurus", "/donatur", "/petugas", "/pengambilan-koin", "/verifikasi", "/setoran-petugas", "/setor-lazisnu", "/penyaluran-dana", "/berita", "/laporan"].includes(path);
  }
  return true;
}

export function labelRole(role) {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

export function canManageDonors(role) {
  if (isReadOnlyRole(role)) {
    return false;
  }
  return role === "admin" || role === "bendahara";
}

export function canManagePickup(session, pickup = null) {
  if (isReadOnlyRole(session.role) || session.role === "bendahara") {
    return false;
  }
  if (session.role === "admin") {
    return true;
  }
  return !pickup || pickup.officerEmail === session.email || pickup.officerEmail === "petugas@rantingnu.id";
}

export function canEditPickup(session, pickup = null) {
  return session.role === "admin" || (session.role === "petugas" && canManagePickup(session, pickup));
}

export function canDeletePickup(session) {
  return session.role === "admin";
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

export function initOfflineDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("sikoinnu_offline_db", 1);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains("db_cache")) {
        db.createObjectStore("db_cache");
      }
      if (!db.objectStoreNames.contains("pending_sync")) {
        db.createObjectStore("pending_sync", { keyPath: "id", autoIncrement: true });
      }
    };
    request.onsuccess = (event) => resolve(event.target.result);
    request.onerror = (event) => reject(event.target.error);
  });
}

export async function saveDbCache(data) {
  try {
    const db = await initOfflineDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("db_cache", "readwrite");
      const store = tx.objectStore("db_cache");
      store.put(data, "db_data");
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error("Gagal menyimpan cache ke IndexedDB:", err);
    return false;
  }
}

export async function getDbCache() {
  try {
    const db = await initOfflineDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("db_cache", "readonly");
      const store = tx.objectStore("db_cache");
      const req = store.get("db_data");
      tx.oncomplete = () => resolve(req.result);
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error("Gagal mengambil cache dari IndexedDB:", err);
    return null;
  }
}

export async function queueOfflineAction(table, action, data) {
  try {
    const db = await initOfflineDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("pending_sync", "readwrite");
      const store = tx.objectStore("pending_sync");
      store.add({
        table,
        action,
        data,
        timestamp: new Date().toISOString()
      });
      tx.oncomplete = async () => {
        await updatePendingSyncCount();
        resolve(true);
      };
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error("Gagal menambahkan antrean offline:", err);
    return false;
  }
}

export async function getOfflineQueue() {
  try {
    const db = await initOfflineDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("pending_sync", "readonly");
      const store = tx.objectStore("pending_sync");
      const req = store.getAll();
      tx.oncomplete = () => resolve(req.result || []);
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error("Gagal mengambil antrean offline:", err);
    return [];
  }
}

export async function deleteOfflineQueueItem(id) {
  try {
    const db = await initOfflineDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("pending_sync", "readwrite");
      const store = tx.objectStore("pending_sync");
      store.delete(id);
      tx.oncomplete = async () => {
        await updatePendingSyncCount();
        resolve(true);
      };
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error("Gagal menghapus antrean offline:", err);
    return false;
  }
}

export async function updatePendingSyncCount() {
  const queue = await getOfflineQueue();
  appState.pendingSyncCount = queue.length;
  window.dispatchEvent(new CustomEvent("pending-sync-count-updated"));
}

export function getPostgresConfig() { return { url: '', anonKey: '' }; }
export function hasPostgresConfig() { return false; }
export function getAuthSession() { return getSession(); }
export function setAuthSession(session) { setSession(session); }
export function clearAuthSession() {}
export function isPostgresSessionValid(session) { return Boolean(session?.token); }
export function getApiToken() { return getSession()?.token || ''; }

export async function internalRequest(path, options = {}) {
  const response = await fetch(`/api/${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...(getApiToken() ? { Authorization: `Bearer ${getApiToken()}` } : {}), ...(options.headers || {}) } });
  if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || `API ${response.status}`);
  return response.status === 204 ? null : response.json();
}

export const privateEvidenceBucket = 'local-private-evidence';
export const publicDocumentationBucket = 'local-public-documentation';
export const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp'];
export const allowedImageExtensions = ['jpg', 'jpeg', 'png', 'webp'];
export const maxImageSize = 2 * 1024 * 1024;

export function validateImageFile(file) { if (!file) return ''; const extension = file.name.split('.').pop()?.toLowerCase() || ''; if (!allowedImageExtensions.includes(extension) || !allowedImageTypes.includes(file.type)) return 'Format foto harus JPG, PNG, atau WEBP.'; if (file.size > maxImageSize) return 'Ukuran foto maksimal 2 MB.'; return ''; }
export function sanitizeStorageName(name) { return name.toLowerCase().replace(/[^a-z0-9.]+/g, '-').replace(/^-+|-+$/g, ''); }
export function fileToDataUrl(file) { return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(new Error('Preview foto gagal dibuat.')); reader.readAsDataURL(file); }); }

export async function uploadDocumentationPhoto(file, folder = "dokumentasi") { const validationError = validateImageFile(file); if (validationError) throw new Error(validationError); if (!file) return null; const dataUrl = await fileToDataUrl(file); return internalRequest("upload", { method: "POST", body: JSON.stringify({ name: file.name, type: file.type, folder, dataUrl }) }); }
export async function createSignedPhotoUrl(bucket, path) { return path || ''; }
export async function hydratePrivatePhotoUrls() {}

export async function postgresAuthRequest() { throw new Error('Reset password belum tersedia di auth internal.'); }
export async function fetchProfileForAuthUser(authUser) { return authUser; }

export async function restorePostgresSession() { const session = getSession(); if (session?.token) await loadInternalData(); return session; }
export function mapStatusToActive(status) {
  return status === true || status === "aktif" || status === "active";
}

export function mapActiveToStatus(active) {
  return active ? "aktif" : "tidak_aktif";
}

export function generateDonorCode(donor) {
  return `DON-${String(donor.rt || "0").padStart(3, "0")}-${String(donor.rw || "0").padStart(3, "0")}-${String(donor.id || "0").padStart(4, "0")}`;
}

export function createDonorQrPng(value, cellSize = 6, margin = 3) {
  if (typeof qrcode !== "function") return "";
  const qr = qrcode(0, "M");
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

export function mapDbToAppState(data) {
  const petugasById = new Map((data.petugas || []).map((item) => [item.id, item]));
  const donaturById = new Map((data.donatur || []).map((item) => [item.id, item]));
  const settings = { ...demoData.systemSettings };

  (data.settings || []).forEach((item) => {
    try {
      settings[item.key] = JSON.parse(item.value);
    } catch {
      settings[item.key] = item.value;
    }
  });

  if (data.ranting_profile?.[0]) {
    const profile = data.ranting_profile[0];
    appState.branchProfile = {
      branchName: profile.nama_ranting || "",
      village: profile.desa || "",
      district: profile.kecamatan || "",
      regency: profile.kabupaten || "",
      province: profile.provinsi || "",
      secretariatAddress: profile.alamat_sekretariat || "",
      phone: profile.phone || "",
      email: profile.email || "",
      branchLogo: profile.logo_url || "",
      nuLogo: appState.branchProfile.nuLogo,
      servicePeriod: profile.masa_khidmah || ""
    };
  }

  appState.users = (data.profiles || []).map((item) => ({
    id: item.id,
    email: item.email,
    fullName: item.full_name,
    role: item.role,
    phone: item.phone || "",
    status: item.status,
    createdAt: item.created_at
  }));
  appState.systemSettings = settings;
  if (Array.isArray(settings.banomList) && settings.banomList.length > 0) {
    BANOM_DATA.length = 0;
    BANOM_DATA.push(...settings.banomList);
  } else {
    BANOM_DATA.length = 0;
    BANOM_DATA.push(...DEFAULT_BANOMS);
  }
  appState.officers = (data.petugas || []).map((item) => ({
    id: item.id,
    name: item.nama,
    phone: item.phone || "",
    address: item.alamat || "",
    rt: item.rt || "",
    rw: item.rw || "",
    area: item.wilayah_tugas || "",
    donorCount: 0,
    username: item.username || item.email || "",
    role: "petugas",
    active: mapStatusToActive(item.status),
    note: ""
  }));
  appState.donors = (data.donatur || []).map((item) => {
    const officer = petugasById.get(item.petugas_id);
    return {
      id: item.id,
      name: item.nama_kk,
      address: item.alamat || "",
      rt: item.rt || "",
      rw: item.rw || "",
      phone: item.phone || "",
      officer: officer?.nama || "",
      officerEmail: officer?.username || officer?.email || "",
      active: mapStatusToActive(item.status),
      note: item.catatan || "",
      donorCode: item.kode_donatur || "",
      qrCodeValue: item.qr_code_value || "",
      qrCodeImage: item.qr_code_image || ""
    };
  });
  appState.pickups = (data.pengambilan_koin || []).map((item) => {
    const donor = donaturById.get(item.donatur_id);
    const officer = petugasById.get(item.petugas_id);
    const audits = (data.verifikasi_setoran || [])
      .filter((audit) => audit.pengambilan_id === item.id)
      .map((audit) => ({
        treasurer: "Bendahara",
        verifiedAt: audit.tanggal_verifikasi || audit.created_at?.slice(0, 10) || item.tanggal,
        status: audit.status,
        note: audit.catatan_bendahara || "",
        depositPhotoPath: audit.bukti_setoran_path || "",
        depositPhotoUrl: audit.bukti_setoran_url || "",
        depositPhotoName: audit.bukti_setoran_nama || ""
      }));
    return {
      id: item.id,
      transactionNo: item.nomor_transaksi,
      donorId: item.donatur_id,
      donorName: donor?.nama_kk || "",
      donorAddress: donor?.alamat || "",
      date: item.tanggal,
      amount: Number(item.nominal || 0),
      method: item.metode_pembayaran,
      status: item.status_verifikasi,
      note: item.catatan_petugas || "",
      proofPhotoPath: item.bukti_foto_path || "",
      proofPhotoUrl: item.bukti_foto_url || "",
      proofPhotoName: item.bukti_foto_nama || "",
      officer: officer?.nama || "",
      officerEmail: officer?.username || officer?.email || "",
      verificationAudit: audits,
      notificationStatus: item.status_notifikasi || "belum_dikirim",
      notificationAt: item.waktu_notifikasi || "",
      notificationNote: item.catatan_notifikasi || "",
      notificationHistory: item.riwayat_notifikasi || []
    };
  });
  appState.distributions = (data.penyaluran_dana || []).map((item) => ({
    id: item.id,
    distributionNo: item.nomor_penyaluran,
    date: item.tanggal,
    recipientName: item.nama_penerima,
    address: item.alamat || "",
    rt: item.rt || "",
    rw: item.rw || "",
    phone: item.phone || "",
    category: item.kategori_bantuan,
    amount: Number(item.nominal || 0),
    source: item.sumber_dana || "",
    status: item.status,
    note: item.keterangan || "",
    documentationPath: item.dokumentasi_path || "",
    documentationName: item.dokumentasi_nama || "",
    documentationUrl: item.dokumentasi_url || ""
  }));
  appState.officerDeposits = (data.setoran_petugas || []).map((item) => {
    const officer = petugasById.get(item.petugas_id);
    return {
      id: item.id,
      depositNo: item.nomor_setoran,
      officer: officer?.nama || "",
      officerEmail: officer?.username || officer?.email || "",
      date: item.tanggal_setor,
      periodStart: item.periode_mulai,
      periodEnd: item.periode_selesai,
      amount: Number(item.nominal || 0),
      transactionCount: Number(item.jumlah_transaksi || 0),
      method: item.metode_setor,
      status: item.status,
      note: item.catatan_petugas || "",
      proofPhotoPath: item.bukti_setor_path || "",
      proofPhotoUrl: item.bukti_setor_url || "",
      proofPhotoName: item.bukti_setor_nama || ""
    };
  });
  appState.lazisnuDeposits = (data.setoran_lazisnu || []).map((item) => ({
    id: item.id,
    depositNo: item.nomor_setoran,
    date: item.tanggal_setor,
    destination: item.tujuan_setoran,
    recipientName: item.nama_penerima || "",
    amount: Number(item.nominal || 0),
    method: item.metode_setor,
    receiptNo: item.nomor_bukti || "",
    status: item.status,
    note: item.catatan || "",
    proofPhotoPath: item.bukti_setor_path || "",
    proofPhotoUrl: item.bukti_setor_url || "",
    proofPhotoName: item.bukti_setor_nama || ""
  }));
  appState.publicDocumentation = (data.dokumentasi_kegiatan || []).map((item) => ({
    id: item.id,
    title: item.judul,
    category: item.kategori,
    date: item.tanggal,
    photoPath: item.photoPath || "",
    photoName: item.photoName || "",
    photoUrl: item.photoUrl || "",
    organization: item.organisasi || item.organization || "ranting"
  }));
  appState.news = (data.berita?.length ? data.berita : demoData.news).map((item) => ({
    id: item.id,
    title: item.judul || item.title || "",
    category: item.kategori || item.category || "Kegiatan Ranting",
    date: item.tanggal || item.date || new Date().toISOString().slice(0, 10),
    excerpt: item.ringkasan || item.excerpt || "",
    content: item.konten || item.content || "",
    imagePath: item.gambar_path || item.imagePath || "",
    imageName: item.gambar_nama || item.imageName || "",
    imageUrl: item.gambar_url || item.imageUrl || "",
    status: item.status || "draft",
    organization: item.organisasi || item.organization || "ranting"
  }));
  appState.boardMembers = (data.pengurus?.length ? data.pengurus : demoData.boardMembers).map((item) => ({
    id: item.id,
    position: item.jabatan || item.position,
    name: item.nama,
    phone: item.phone || "",
    address: item.alamat || "",
    photo: item.foto_url || item.photo || "",
    term: item.term || appState.branchProfile.servicePeriod,
    active: mapStatusToActive(item.status),
    organization: item.organisasi || item.organization || "ranting"
  }));
}

export function toDbRows(table) {
  const officerIdByEmail = new Map(appState.officers.map((officer) => [officer.username, officer.id]));

  if (table === "donatur") {
    return appState.donors.map((item) => ({
      id: item.id,
      nama_kk: item.name,
      alamat: item.address,
      rt: item.rt,
      rw: item.rw,
      phone: item.phone,
      petugas_id: officerIdByEmail.get(item.officerEmail) || null,
      status: mapActiveToStatus(item.active),
      catatan: item.note,
      kode_donatur: ensureDonorQr(item).donorCode,
      qr_code_value: item.qrCodeValue,
      qr_code_image: item.qrCodeImage || null
    }));
  }

  if (table === "petugas") {
    return appState.officers.map((item) => ({
      id: item.id,
      nama: item.name,
      phone: item.phone,
      alamat: item.address,
      rt: item.rt,
      rw: item.rw,
      username: item.username,
      wilayah_tugas: item.area,
      status: mapActiveToStatus(item.active)
    }));
  }

  if (table === "pengurus") {
    return appState.boardMembers.map((item) => ({
      id: item.id,
      nama: item.name,
      jabatan: item.position,
      phone: item.phone,
      alamat: item.address,
      foto_url: item.photo,
      status: mapActiveToStatus(item.active),
      organisasi: item.organization || "ranting"
    }));
  }

  if (table === "penyaluran_dana") {
    return appState.distributions.map((item) => ({
      id: item.id,
      nomor_penyaluran: item.distributionNo,
      tanggal: item.date,
      nama_penerima: item.recipientName,
      alamat: item.address,
      rt: item.rt,
      rw: item.rw,
      phone: item.phone,
      kategori_bantuan: item.category,
      nominal: item.amount,
      sumber_dana: item.source,
      status: item.status,
      keterangan: item.note,
      dokumentasi_path: item.documentationPath || null,
      dokumentasi_url: item.documentationPath ? null : item.documentationUrl || null,
      dokumentasi_nama: item.documentationName || null
    }));
  }

  if (table === "pengambilan_koin") {
    return appState.pickups.map((item) => ({
      id: item.id,
      nomor_transaksi: item.transactionNo,
      tanggal: item.date,
      donatur_id: item.donorId,
      petugas_id: officerIdByEmail.get(item.officerEmail) || null,
      nominal: item.amount,
      metode_pembayaran: item.method,
      catatan_petugas: item.note,
      bukti_foto_path: item.proofPhotoPath || null,
      bukti_foto_url: item.proofPhotoPath ? null : item.proofPhotoUrl || null,
      bukti_foto_nama: item.proofPhotoName || null,
      status_verifikasi: item.status,
      status_notifikasi: item.notificationStatus || "belum_dikirim",
      waktu_notifikasi: item.notificationAt || null,
      catatan_notifikasi: item.notificationNote || null,
      riwayat_notifikasi: item.notificationHistory || []
    }));
  }

  if (table === "setoran_petugas") {
    return appState.officerDeposits.map((item) => ({
      id: item.id,
      nomor_setoran: item.depositNo,
      petugas_id: officerIdByEmail.get(item.officerEmail) || null,
      tanggal_setor: item.date,
      periode_mulai: item.periodStart,
      periode_selesai: item.periodEnd,
      nominal: item.amount,
      jumlah_transaksi: item.transactionCount,
      metode_setor: item.method,
      catatan_petugas: item.note,
      bukti_setor_path: item.proofPhotoPath || null,
      bukti_setor_url: item.proofPhotoPath ? null : item.proofPhotoUrl || null,
      bukti_setor_nama: item.proofPhotoName || null,
      status: item.status
    }));
  }

  if (table === "setoran_lazisnu") {
    return appState.lazisnuDeposits.map((item) => ({
      id: item.id,
      nomor_setoran: item.depositNo,
      tanggal_setor: item.date,
      tujuan_setoran: item.destination,
      nama_penerima: item.recipientName,
      nominal: item.amount,
      metode_setor: item.method,
      nomor_bukti: item.receiptNo,
      catatan: item.note,
      bukti_setor_path: item.proofPhotoPath || null,
      bukti_setor_url: item.proofPhotoPath ? null : item.proofPhotoUrl || null,
      bukti_setor_nama: item.proofPhotoName || null,
      status: item.status
    }));
  }

  if (table === "dokumentasi_kegiatan") {
    return appState.publicDocumentation.map((item) => ({
      id: item.id,
      judul: item.title,
      kategori: item.category,
      tanggal: item.date,
      foto_path: item.photoPath || null,
      foto_url: item.photoUrl,
      foto_nama: item.photoName,
      organisasi: item.organization || "ranting"
    }));
  }

  if (table === "berita") {
    return appState.news.map((item) => ({
      id: item.id,
      judul: item.title,
      kategori: item.category,
      tanggal: item.date,
      ringkasan: item.excerpt,
      konten: item.content,
      gambar_path: item.imagePath || null,
      gambar_url: item.imageUrl,
      gambar_nama: item.imageName,
      status: item.status || "draft",
      organisasi: item.organization || "ranting"
    }));
  }

  if (table === "profiles") {
    return appState.users.map((item) => ({
      id: item.id,
      email: item.email,
      full_name: item.fullName,
      role: item.role,
      phone: item.phone,
      status: item.status
    }));
  }

  return [];
}

export async function syncTableToPostgres(table) {
  if (!appState.postgresReady) {
    return true;
  }

  const rows = toDbRows(table);
  if (!rows.length) {
    return true;
  }

  try {
    await internalRequest(`table/${table}`, { method: "POST", body: JSON.stringify(rows) });
    return true;
  } catch (error) {
    console.warn(`Gagal sinkron ${table}`, error);
    window.dispatchEvent(new CustomEvent("show-toast", { detail: { message: `Gagal menyimpan data ${table}. Perubahan mungkin belum tersimpan.`, type: "error" } }));
    return false;
  }
}

export async function syncRowToPostgres(table, item) {
  if (!appState.postgresReady && !appState.isOffline) {
    return true;
  }
  const rows = toDbRows(table);
  const dbRow = rows.find((r) => String(r.id) === String(item.id));
  if (!dbRow) {
    return true;
  }

  // If already offline, queue and return true immediately
  if (appState.isOffline) {
    await queueOfflineAction(table, "POST", dbRow);
    window.dispatchEvent(new CustomEvent("show-toast", { detail: { message: `Offline: Transaksi disimpan secara lokal.`, type: "warning" } }));
    return true;
  }

  try {
    await internalRequest(`table/${table}`, { method: "POST", body: JSON.stringify(dbRow) });
    return true;
  } catch (error) {
    if (isNetworkError(error)) {
      appState.isOffline = true;
      await queueOfflineAction(table, "POST", dbRow);
      window.dispatchEvent(new CustomEvent("show-toast", { detail: { message: `Koneksi terputus. Transaksi disimpan secara lokal.`, type: "warning" } }));
      return true;
    }
    console.warn(`Gagal sinkron baris ${table} id ${item.id}`, error);
    window.dispatchEvent(new CustomEvent("show-toast", { detail: { message: `Gagal menyimpan perubahan: ${error.message}`, type: "error" } }));
    return false;
  }
}

export async function deleteRowFromPostgres(table, id) {
  if (!appState.postgresReady && !appState.isOffline) {
    return true;
  }

  if (appState.isOffline) {
    await queueOfflineAction(table, "DELETE", { id });
    window.dispatchEvent(new CustomEvent("show-toast", { detail: { message: `Offline: Penghapusan disimpan secara lokal.`, type: "warning" } }));
    return true;
  }

  try {
    await internalRequest(`table/${table}/${encodeURIComponent(id)}`, { method: "DELETE" });
    return true;
  } catch (error) {
    if (isNetworkError(error)) {
      appState.isOffline = true;
      await queueOfflineAction(table, "DELETE", { id });
      window.dispatchEvent(new CustomEvent("show-toast", { detail: { message: `Koneksi terputus. Penghapusan disimpan secara lokal.`, type: "warning" } }));
      return true;
    }
    console.warn(`Gagal menghapus ${table}`, error);
    window.dispatchEvent(new CustomEvent("show-toast", { detail: { message: `Gagal menghapus data: ${error.message}`, type: "error" } }));
    return false;
  }
}

export async function syncVerificationAuditToPostgres(pickupId, audit, session) {
  if (!appState.postgresReady) {
    return true;
  }
  try {
    await internalRequest("table/verifikasi_setoran", {
      method: "POST",
      body: JSON.stringify([{
        pengambilan_id: pickupId,
        bendahara_id: session.id || null,
        status: audit.status,
        catatan_bendahara: audit.note,
        tanggal_verifikasi: audit.verifiedAt,
        bukti_setoran_path: audit.depositPhotoPath || null,
        bukti_setoran_url: audit.depositPhotoPath ? null : audit.depositPhotoUrl || null,
        bukti_setoran_nama: audit.depositPhotoName || null
      }])
    });
    return true;
  } catch (error) {
    console.warn("Gagal menyimpan audit verifikasi", error);
    return false;
  }
}

export async function syncProfileToPostgres() {
  if (!appState.postgresReady) {
    return;
  }

  const profile = appState.branchProfile;
  try {
    await internalRequest("table/ranting_profile", {
      method: "POST",
      body: JSON.stringify([{
        id: 1,
        nama_ranting: profile.branchName,
        desa: profile.village,
        kecamatan: profile.district,
        kabupaten: profile.regency,
        provinsi: profile.province,
        alamat_sekretariat: profile.secretariatAddress,
        email: profile.email,
        phone: profile.phone,
        masa_khidmah: profile.servicePeriod,
        logo_url: profile.branchLogo
      }])
    });
  } catch (error) {
    console.warn("Gagal sinkron profil ranting", error);
  }
}

export async function syncSettingsToPostgres() {
  if (!appState.postgresReady) {
    return;
  }

  const now = new Date().toISOString();
  const rows = Object.entries(appState.systemSettings).map(([key, value]) => ({
    id: key,
    key,
    value: JSON.stringify(value),
    updated_at: now
  }));

  try {
    await internalRequest("table/settings", {
      method: "POST",
      body: JSON.stringify(rows)
    });
  } catch (error) {
    console.warn("Gagal sinkron settings", error);
  }
}

export async function loadInternalData() {
  try {
    const data = await internalRequest("db");
    mapDbToAppState(data);
    await hydratePrivatePhotoUrls();
    appState.dataSource = "internal";
    appState.postgresReady = true;
    appState.isOffline = false;
    
    // Save to offline cache
    await saveDbCache(data);
    
    // Process pending sync in the background if we have any
    const queue = await getOfflineQueue();
    if (queue.length > 0) {
      window.dispatchEvent(new CustomEvent("sync-offline"));
    }
  } catch (error) {
    if (isNetworkError(error)) {
      console.warn("Koneksi offline, mencoba memuat database dari cache IndexedDB.");
      const cached = await getDbCache();
      if (cached) {
        mapDbToAppState(cached);
        await hydratePrivatePhotoUrls();
        appState.dataSource = "internal";
        appState.postgresReady = true;
        appState.isOffline = true;
        
        // Merge offline pending pickups and filter out offline deleted pickups
        const queue = await getOfflineQueue();
        const pendingPickups = queue.filter((x) => x.table === "pengambilan_koin" && x.action === "POST");
        const deletedIds = new Set(queue.filter((x) => x.table === "pengambilan_koin" && x.action === "DELETE").map((x) => x.data.id));
        
        if (deletedIds.size > 0) {
          appState.pickups = appState.pickups.filter((p) => !deletedIds.has(p.id));
        }
        
        if (pendingPickups.length > 0) {
          const pet = new Map(appState.officers.map((o) => [o.id, o]));
          const don = new Map(appState.donors.map((d) => [d.id, d]));
          const mappedPending = pendingPickups.map((p) => {
            const item = p.data;
            const donor = don.get(item.donatur_id);
            const officer = pet.get(item.petugas_id);
            return {
              id: item.id,
              transactionNo: item.nomor_transaksi,
              donorId: item.donatur_id,
              donorName: donor?.name || "Donatur",
              donorAddress: donor?.address || "",
              date: item.tanggal,
              amount: Number(item.nominal || 0),
              method: item.metode_pembayaran,
              status: item.status_verifikasi,
              note: item.catatan_petugas || "",
              proofPhotoPath: item.bukti_foto_path || "",
              proofPhotoUrl: item.bukti_foto_path ? null : item.bukti_foto_url || null,
              proofPhotoName: item.bukti_foto_nama || "",
              officer: officer?.name || "",
              officerEmail: officer?.username || "",
              verificationAudit: [],
              notificationStatus: item.status_notifikasi || "belum_dikirim",
              notificationAt: item.waktu_notifikasi || "",
              notificationNote: item.catatan_notifikasi || "",
              notificationHistory: item.riwayat_notifikasi || [],
              _offline: true
            };
          });
          appState.pickups = [...mappedPending, ...appState.pickups];
        }
        
        window.dispatchEvent(new CustomEvent("show-toast", { detail: { message: "Mode Offline: Menggunakan data lokal terakhir.", type: "warning" } }));
      }
    }
  }
}

export async function syncOfflineData() {
  if (appState.syncingOffline) return;
  const queue = await getOfflineQueue();
  const { updateOfflineIndicator } = await import("./components.js");
  
  if (queue.length === 0) {
    appState.isOffline = false;
    updateOfflineIndicator();
    return;
  }

  if (!navigator.onLine) {
    window.dispatchEvent(new CustomEvent("show-toast", { detail: { message: "Gagal sinkronisasi. Perangkat masih offline.", type: "error" } }));
    return;
  }

  appState.syncingOffline = true;
  updateOfflineIndicator();
  window.dispatchEvent(new CustomEvent("show-toast", { detail: { message: `Sedang menyelaraskan ${queue.length} transaksi offline...`, type: "info" } }));

  let successCount = 0;
  let failCount = 0;

  for (const item of queue) {
    try {
      if (item.action === "POST") {
        await internalRequest(`table/${item.table}`, {
          method: "POST",
          body: JSON.stringify(item.data)
        });
      } else if (item.action === "DELETE") {
        await internalRequest(`table/${item.table}/${encodeURIComponent(item.data.id)}`, {
          method: "DELETE"
        });
      }
      await deleteOfflineQueueItem(item.id);
      successCount++;
    } catch (err) {
      if (isNetworkError(err)) {
        console.warn("Koneksi terputus saat sinkronisasi offline:", err);
        failCount = queue.length - successCount;
        break;
      } else {
        console.error("Gagal sinkronisasi item, dilewati:", err);
        await deleteOfflineQueueItem(item.id);
        window.dispatchEvent(new CustomEvent("show-toast", { detail: { message: `Item dilewati karena error: ${err.message}`, type: "error" } }));
      }
    }
  }

  appState.syncingOffline = false;
  appState.isOffline = !navigator.onLine;

  if (successCount > 0) {
    window.dispatchEvent(new CustomEvent("show-toast", { detail: { message: `Berhasil menyelaraskan ${successCount} transaksi offline.`, type: "success" } }));
    await loadInternalData();
    window.dispatchEvent(new PopStateEvent("popstate"));
  } else if (failCount > 0) {
    window.dispatchEvent(new CustomEvent("show-toast", { detail: { message: `Gagal menyelaraskan ${failCount} transaksi. Periksa koneksi Anda.`, type: "error" } }));
    updateOfflineIndicator();
  } else {
    updateOfflineIndicator();
  }
}

export async function logout() {
  if (getSession()?.token) {
    try {
      await internalRequest("logout", { method: "POST" });
    } catch (error) {
      console.warn("Logout server gagal, session lokal tetap dibersihkan.", error);
    }
  }
  clearAuthSession();
  clearSession();
}
