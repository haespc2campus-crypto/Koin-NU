import {
  getSession,
  setSession,
  clearSession,
  clearAuthSession,
  roles,
  labelRole,
  brand,
  internalRequest,
  hasPostgresConfig,
  postgresAuthRequest,
  loadInternalData,
  app
} from "../state.js";
import { navigate, initScrollReveal } from "../utils.js";
import { renderLazisnuLogo, renderBrandFooter } from "../components.js";

export function renderShell(content) {
  document.title = `${brand.name} | Login`;
  app.innerHTML = `
    <section class="page-shell">
      <div class="brand-panel reveal-on-scroll" aria-label="${brand.name}">
        ${renderLazisnuLogo("login-logo")}
        <p class="eyebrow">${brand.subtitle}</p>
        <h1>${brand.name}</h1>
        <p class="brand-tagline">${brand.tagline}</p>
        <p class="brand-copy">Kelola koin warga dengan rapi, ringan, dan mudah dipakai.</p>
        ${renderBrandFooter("brand-footer-light")}
      </div>
      ${content}
    </section>
  `;
}

export function renderLogin(options = {}) {
  const adminOnly = Boolean(options.adminOnly);
  const saved = getSession();
  if (saved?.role) {
    navigate(saved.role === "admin" || !adminOnly ? "/dashboard" : "/login");
    return;
  }

  const postgresMode = true;

  renderShell(`
    <form class="login-card reveal-on-scroll reveal-delay-200" id="loginForm" novalidate>
      <div class="form-heading">
        <p class="eyebrow">${adminOnly ? "akses admin" : postgresMode ? "database internal" : "Mode Demo"}</p>
        <h2>${adminOnly ? "Login Admin" : `Masuk ${brand.name}`}</h2>
        <strong class="login-subtitle">${brand.subtitle}</strong>
        <p>${adminOnly ? "Halaman ini khusus administrator website dan sistem SIKOINNU." : postgresMode ? "Gunakan akun database internal." : "Database internal aktif."}</p>
      </div>

      <label class="field">
        <span>Email</span>
        <input id="email" type="email" autocomplete="email" placeholder="nama@rantingnu.id" />
        <small class="error" id="emailError"></small>
      </label>

      <label class="field">
        <span>Password</span>
        <input id="password" type="password" autocomplete="current-password" placeholder="Masukkan password" />
        <small class="error" id="passwordError"></small>
      </label>

      <fieldset class="role-group ${postgresMode ? "is-hidden" : ""}">
        <legend>Role Demo</legend>
        <div class="role-options">
          ${roles.map((role, index) => `
            <label class="role-option">
              <input type="radio" name="role" value="${role}" ${index === 0 ? "checked" : ""} />
              <span>${labelRole(role)}</span>
            </label>
          `).join("")}
        </div>
        <small class="error" id="roleError"></small>
      </fieldset>

      <p class="form-error" id="formError" role="alert"></p>
      <p class="form-success" id="formSuccess" role="status"></p>
      <button class="primary-button" id="loginButton" type="submit">Masuk</button>
      ${adminOnly ? `<a class="link-button admin-login-back" href="/">Kembali ke website</a>` : ""}
      <button class="link-button" id="forgotPasswordButton" type="button">Lupa password?</button>
    </form>
  `);

  document.querySelector("#loginForm").addEventListener("submit", (event) => handleLogin(event, { adminOnly }));
  document.querySelector("#forgotPasswordButton").addEventListener("click", handleForgotPassword);
  
  // Trigger animations
  initScrollReveal();
}

async function handleLogin(event, options = {}) {
  event.preventDefault();
  const adminOnly = Boolean(options.adminOnly);

  const email = document.querySelector("#email");
  const password = document.querySelector("#password");
  const role = document.querySelector("input[name='role']:checked");
  const postgresMode = true;
  const errors = {
    email: email.value.trim() ? "" : "Email wajib diisi.",
    password: password.value.trim() ? "" : "Password wajib diisi.",
    role: postgresMode || role ? "" : "Pilih role terlebih dahulu."
  };

  document.querySelector("#emailError").textContent = errors.email;
  document.querySelector("#passwordError").textContent = errors.password;
  document.querySelector("#roleError").textContent = errors.role;
  document.querySelector("#formSuccess").textContent = "";

  if (errors.email || errors.password || errors.role) {
    document.querySelector("#formError").textContent = "Lengkapi data masuk terlebih dahulu.";
    return;
  }

  const button = document.querySelector("#loginButton");
  button.disabled = true;
  button.textContent = "Memeriksa akun...";
  document.querySelector("#formError").textContent = "";

  try {
    if (postgresMode) {
      const auth = await internalRequest("login", { method: "POST", body: JSON.stringify({ email: email.value.trim(), password: password.value }) });
      if (adminOnly && auth.user?.role !== "admin") {
        throw new Error("ADMIN_ONLY");
      }
      const appSession = { ...auth.user, id: auth.user.id, email: auth.user.email, name: auth.user.fullName || auth.user.full_name || auth.user.email, role: auth.user.role, phone: auth.user.phone || "", token: auth.token, authProvider: "internal", loggedInAt: new Date().toISOString() };
      setSession(appSession);
      await loadInternalData();
    } else {
      setSession({
        id: `demo-${role.value}`,
        email: email.value.trim(),
        name: labelRole(role.value),
        role: role.value,
        authProvider: "demo",
        loggedInAt: new Date().toISOString()
      });
    }
    navigate("/dashboard");
  } catch (error) {
    clearAuthSession();
    clearSession();
    document.querySelector("#formError").textContent = parseAuthError(error, { adminOnly });
  } finally {
    button.disabled = false;
    button.textContent = "Masuk";
  }
}

function parseAuthError(error, options = {}) {
  const message = String(error?.message || error || "");
  if (message.includes("ADMIN_ONLY")) {
    return "Halaman ini khusus admin. Gunakan akun administrator.";
  }
  if (message.includes("Invalid login credentials")) {
    return "Email atau password tidak sesuai.";
  }
  if (message.includes("Email not confirmed")) {
    return "Email belum dikonfirmasi.";
  }
  if (message.includes("profil belum dibuat") || message.includes("Akun belum aktif")) {
    return "Akun sudah ada, tetapi profil aplikasi belum aktif. Hubungi admin.";
  }
  return "Login belum berhasil. Periksa email, password, atau koneksi server.";
}

async function handleForgotPassword() {
  const email = document.querySelector("#email").value.trim();
  const error = document.querySelector("#formError");
  const success = document.querySelector("#formSuccess");
  error.textContent = "";
  success.textContent = "";

  if (!email) {
    error.textContent = "Isi email terlebih dahulu untuk reset password.";
    return;
  }

  if (!hasPostgresConfig()) {
    success.textContent = "Reset password belum tersedia di auth internal. Hubungi admin.";
    return;
  }

  try {
    await postgresAuthRequest("recover", {
      method: "POST",
      body: JSON.stringify({ email })
    });
    success.textContent = "Instruksi reset password sudah dikirim jika email terdaftar.";
  } catch {
    error.textContent = "Instruksi reset belum bisa dikirim. Hubungi admin.";
  }
}
