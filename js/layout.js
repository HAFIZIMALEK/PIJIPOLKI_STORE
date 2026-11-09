/* ==========================================================
   ShopSphere - Shared layout & UI helpers
   Renders a role-specific navbar + footer on every page, plus
   small helpers for status badges, order tracker and details.
   ========================================================== */

const NAV = {
  admin: [
    { key: "dashboard", label: "Dashboard", href: "admin/dashboard.html", icon: "bi-speedometer2" },
    { key: "products", label: "Products", href: "admin/products.html", icon: "bi-box-seam" },
    { key: "orders", label: "Orders", href: "admin/orders.html", icon: "bi-receipt" },
    { key: "customers", label: "Customers", href: "admin/customers.html", icon: "bi-people" }
  ],
  customer: [
    { key: "shop", label: "Shop", href: "customer/shop.html", icon: "bi-shop" },
    { key: "cart", label: "Cart", href: "customer/cart.html", icon: "bi-cart3" },
    { key: "orders", label: "My Orders", href: "customer/my-orders.html", icon: "bi-bag-check" }
  ]
};

function updateCartBadge() {
  const s = getSession();
  const el = document.getElementById("cartBadge");
  if (!s || !el) return;
  const n = cartCount(s.username);
  el.textContent = n;
  el.classList.toggle("d-none", n === 0);
}

function renderNavbar() {
  const host = document.getElementById("app-navbar");
  const s = getSession();
  if (!host || !s) return;
  const active = host.dataset.active;
  const isAdmin = s.role === "admin";

  const links = NAV[s.role].map((n) => `
    <li class="nav-item">
      <a class="nav-link ${n.key === active ? "active" : ""}" href="${ROOT + n.href}" ${n.key === active ? 'aria-current="page"' : ""}>
        <i class="bi ${n.icon} me-1"></i>${n.label}
        ${n.key === "cart" ? '<span id="cartBadge" class="badge rounded-pill bg-warning text-dark cart-badge d-none">0</span>' : ""}
      </a></li>`).join("");

  host.innerHTML = `
  <nav class="navbar navbar-expand-lg navbar-dark ss-navbar ${isAdmin ? "ss-navbar-admin" : ""} sticky-top shadow-sm">
    <div class="container">
      <a class="navbar-brand" href="${ROOT + HOME[s.role]}">
        <i class="bi bi-bag-heart-fill me-2"></i>POLKI_STORE
        <span class="badge ${isAdmin ? "text-bg-warning" : "text-bg-light"} ms-1 fw-semibold role-tag">${isAdmin ? "ADMIN" : "STORE"}</span>
      </a>
      <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#mainNav"
              aria-controls="mainNav" aria-expanded="false" aria-label="Toggle navigation"><span class="navbar-toggler-icon"></span></button>
      <div class="collapse navbar-collapse" id="mainNav">
        <ul class="navbar-nav me-auto mb-2 mb-lg-0">${links}</ul>
        <div class="dropdown">
          <a class="btn btn-sm btn-light dropdown-toggle" href="#" role="button" data-bs-toggle="dropdown" aria-expanded="false">
            <i class="bi bi-person-circle me-1"></i>${esc(s.name)}</a>
          <ul class="dropdown-menu dropdown-menu-end">
            <li><span class="dropdown-item-text small text-muted text-capitalize">${s.role} account</span></li>
            <li><hr class="dropdown-divider"></li>
            <li><a class="dropdown-item text-danger" href="#" id="logoutBtn"><i class="bi bi-box-arrow-right me-2"></i>Logout</a></li>
          </ul>
        </div>
      </div>
    </div>
  </nav>`;
  document.getElementById("logoutBtn").addEventListener("click", (e) => { e.preventDefault(); logout(); });
  updateCartBadge();
}

function renderFooter() {
  const host = document.getElementById("app-footer");
  const s = getSession();
  if (!host || !s) return;
  host.innerHTML = `
  <footer class="ss-footer pt-4 pb-3">
    <div class="container">
      <div class="row g-4">
        <div class="col-md-5">
          <h6><i class="bi bi-bag-heart-fill me-2"></i>POLKI_STORE</h6>
          <p class="small mb-0"> Payments are simulated and no real money is charged.</p>
        </div>
        <div class="col-6 col-md-3">
          <h6>${s.role === "admin" ? "Admin pages" : "Shop pages"}</h6>
          <ul class="list-unstyled small mb-0">${NAV[s.role].map((n) => `<li><a href="${ROOT + n.href}">${n.label}</a></li>`).join("")}</ul>
        </div>
        <div class="col-6 col-md-4">
          <h6>Built With</h6>
          <ul class="list-unstyled small mb-0"><li>Bootstrap 5.3 &amp; Bootstrap Icons</li><li>Chart.js 4</li><li>Vanilla JavaScript + localStorage</li></ul>
        </div>
      </div>
      <hr class="border-secondary my-3">
      <div class="d-flex flex-column flex-md-row justify-content-between small">
        <span>&copy; 2026 ShopSphere. All rights reserved.</span>
        <span>Demo project &middot; data saved in your browser</span>
      </div>
    </div>
  </footer>`;
}

document.addEventListener("DOMContentLoaded", () => {
  if (!getSession()) return;
  renderNavbar(); renderFooter();
});

/* ---------- Shared UI helpers ---------- */
const cls = (s) => String(s).replace(/\s+/g, "-");
const statusPill = (s) => `<span class="status-pill st-${cls(s)}">${esc(s)}</span>`;
const payPill = (s) => `<span class="status-pill pay-${cls(s)}">${esc(s)}</span>`;

/** Four-step progress tracker for an order. */
function trackerHTML(o) {
  if (o.status === "Cancelled") {
    return `<div class="alert alert-danger py-2 small mb-0"><i class="bi bi-x-octagon me-1"></i>This order was cancelled${o.paymentStatus === "Refunded" ? " and the payment was refunded" : ""}.</div>`;
  }
  const done = { "Pending Payment": 1, "Processing": 2, "Shipped": 3, "Delivered": 4 }[o.status] || 1;
  const steps = [["Placed", "bi-bag"], ["Paid", "bi-credit-card"], ["Shipped", "bi-truck"], ["Delivered", "bi-house-check"]];
  return `<div class="tracker">${steps.map((st, i) =>
    `<div class="step ${i < done ? "done" : ""} ${i === done && done < 4 ? "current" : ""}">
       <div class="dot"><i class="bi ${i < done ? "bi-check-lg" : st[1]}"></i></div>${st[0]}</div>`).join("")}</div>`;
}

/** Full order details (used inside Bootstrap modals). */
function orderDetailHTML(o, adminView) {
  const rows = o.items.map((l) => `
    <tr><td>${esc(l.icon)} ${esc(l.name)}</td><td class="text-end">${rm(l.price)}</td>
    <td class="text-end">${l.qty}</td><td class="text-end">${rm(l.price * l.qty)}</td></tr>`).join("");
  const hist = [...o.history].reverse().map((h) => `
    <li class="list-group-item px-0 d-flex justify-content-between gap-2">
      <div>${statusPill(h.status)} <span class="small text-muted ms-1">${esc(h.note || "")}</span></div>
      <small class="text-muted text-nowrap">${fmtDate(h.at)}</small></li>`).join("");
  return `
    <div class="d-flex flex-wrap justify-content-between gap-2 mb-3">
      <div><div class="fw-bold fs-5">${esc(o.id)}</div><small class="text-muted">Placed ${fmtDate(o.createdAt)}</small></div>
      <div class="text-end">${statusPill(o.status)} ${payPill(o.paymentStatus)}</div>
    </div>
    ${trackerHTML(o)}
    <div class="row g-3 mt-1">
      <div class="col-md-6"><div class="small text-muted text-uppercase fw-semibold">${adminView ? "Customer &amp; delivery" : "Delivery address"}</div>
        ${adminView ? `<div>${esc(o.customerName)} <span class="text-muted">(@${esc(o.username)})</span></div>` : ""}
        <div>${esc(o.address.name)} &middot; ${esc(o.address.phone)}</div><div>${esc(o.address.line)}</div></div>
      <div class="col-md-6"><div class="small text-muted text-uppercase fw-semibold">Payment</div>
        <div>${o.paymentMethod ? esc(o.paymentMethod) : "<span class='text-muted'>Not paid yet</span>"}</div>
        ${o.paymentRef ? `<div class="small text-muted">Ref: ${esc(o.paymentRef)}${o.paidAt ? " &middot; " + fmtDate(o.paidAt) : ""}</div>` : ""}</div>
    </div>
    <div class="table-responsive mt-3"><table class="table table-sm align-middle mb-0">
      <thead><tr><th>Item</th><th class="text-end">Price</th><th class="text-end">Qty</th><th class="text-end">Subtotal</th></tr></thead>
      <tbody>${rows}</tbody>
      <tfoot>
        <tr><td colspan="3" class="text-end text-muted">Subtotal</td><td class="text-end">${rm(o.subtotal)}</td></tr>
        <tr><td colspan="3" class="text-end text-muted">Shipping</td><td class="text-end">${o.shipping ? rm(o.shipping) : "FREE"}</td></tr>
        <tr class="fw-bold"><td colspan="3" class="text-end">Total</td><td class="text-end">${rm(o.total)}</td></tr>
      </tfoot></table></div>
    <h6 class="mt-3 mb-1">Status history</h6><ul class="list-group list-group-flush">${hist}</ul>`;
}

/** Re-render a page when another tab changes the shared data. */
function onDataChange(fn) {
  window.addEventListener("storage", (e) => { if (e.key && e.key.startsWith("ss_")) fn(); });
}
