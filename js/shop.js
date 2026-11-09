/* ==========================================================
   ShopSphere - Customer shop page
   ========================================================== */

document.addEventListener("DOMContentLoaded", () => {
  if (!guardOK("customer")) return;
  const user = getSession();
  const $ = (id) => document.getElementById(id);

  $("welcomeTitle").textContent = `Hi ${user.name.split(" ")[0]}, happy shopping! 🛍️`;

  /* Account summary strip */
  function renderSummary() {
    const mine = getOrders().filter((o) => o.username === user.username);
    const active = mine.filter((o) => ["Pending Payment", "Processing", "Shipped"].includes(o.status)).length;
    const spent = mine.filter(isRevenue).reduce((s, o) => s + o.total, 0);
    const box = (v, l) => `<div class="col-4"><div class="bg-white bg-opacity-10 rounded-3 py-2"><div class="fs-5 fw-bold">${v}</div><small class="opacity-75">${l}</small></div></div>`;
    $("summaryStrip").innerHTML = box(mine.length, "Orders") + box(active, "In progress") + box(rm(spent), "Total spent");
  }

  const catSel = $("categoryFilter");
  [...new Set(getProducts().map((p) => p.category))].forEach((c) => catSel.add(new Option(c, c)));

  const stars = (r) => "★".repeat(Math.round(r)) + "☆".repeat(5 - Math.round(r));
  const stockBadge = (s) => s === 0 ? '<span class="badge text-bg-danger">Out of stock</span>'
    : s <= 10 ? `<span class="badge text-bg-warning">Only ${s} left</span>` : '<span class="badge text-bg-success">In stock</span>';

  function render() {
    const q = $("searchBox").value.toLowerCase().trim();
    const cat = catSel.value;
    const sorters = {
      name: (a, b) => a.name.localeCompare(b.name), priceAsc: (a, b) => a.price - b.price,
      priceDesc: (a, b) => b.price - a.price, rating: (a, b) => b.rating - a.rating
    };
    const list = getProducts()
      .filter((p) => (!cat || p.category === cat) && (!q || (p.name + p.category).toLowerCase().includes(q)))
      .sort(sorters[$("sortSelect").value]);

    $("productCount").textContent = `Showing ${list.length} products`;
    $("emptyMsg").classList.toggle("d-none", list.length > 0);
    $("gridView").innerHTML = list.map((p) => `
      <div class="col-6 col-md-4 col-xl-3">
        <article class="card product-card">
          <div class="product-thumb" role="img" aria-label="${esc(p.name)}">${esc(p.icon)}</div>
          <div class="card-body d-flex flex-column">
            <small class="text-muted">${esc(p.category)}</small>
            <h3 class="h6 fw-bold mb-1">${esc(p.name)}</h3>
            <div class="rating mb-2">${stars(p.rating)} <span class="text-muted">${p.rating}</span></div>
            <div class="price mb-2">${rm(p.price)}</div>
            <div class="mb-3">${stockBadge(p.stock)}</div>
            <button class="btn btn-primary btn-sm mt-auto add-cart" data-id="${esc(p.id)}" ${p.stock === 0 ? "disabled" : ""}>
              <i class="bi bi-cart-plus me-1"></i>Add to cart</button>
          </div>
        </article>
      </div>`).join("");
  }

  function toast(msg, ok) {
    const t = $("toast");
    t.className = `toast align-items-center border-0 text-bg-${ok ? "success" : "danger"}`;
    $("toastMsg").textContent = msg;
    bootstrap.Toast.getOrCreateInstance(t).show();
  }

  $("gridView").addEventListener("click", (e) => {
    const btn = e.target.closest(".add-cart");
    if (!btn) return;
    const r = addToCart(user.username, btn.dataset.id, 1);
    if (!r.ok) return toast(r.error, false);
    const p = getProducts().find((x) => x.id === btn.dataset.id);
    updateCartBadge();
    toast(`${p.name} added to your cart`, true);
  });

  ["searchBox", "categoryFilter", "sortSelect"].forEach((id) => $(id).addEventListener("input", render));
  onDataChange(() => { render(); renderSummary(); updateCartBadge(); });
  render(); renderSummary();
});
