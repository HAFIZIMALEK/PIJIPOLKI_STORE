/* ==========================================================
   ShopSphere - Authentication & role guard
   Users live in localStorage (see store.js). The logged-in
   session is kept in sessionStorage (cleared when tab closes).
   ========================================================== */

const HOME = { admin: "admin/dashboard.html", customer: "customer/shop.html" };

function getSession() {
  try { return JSON.parse(sessionStorage.getItem(KEY.session)); } catch (e) { return null; }
}

/** Redirects away if not logged in, or logged in with the wrong role. */
function requireRole(role) {
  const s = getSession();
  if (!s) { location.replace(ROOT + "index.html"); return null; }
  if (s.role !== role) { location.replace(ROOT + HOME[s.role]); return null; }
  return s;
}
/** True when the current session may use this page (use inside page scripts). */
const guardOK = (role) => { const s = getSession(); return !!s && s.role === role; };

function logout() {
  sessionStorage.removeItem(KEY.session);
  location.href = ROOT + "index.html";
}

function showAlert(containerId, message, type) {
  document.getElementById(containerId).innerHTML =
    `<div class="alert alert-${type} alert-dismissible fade show py-2" role="alert">
       ${message}<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button></div>`;
}
