/* ==========================================================
   ShopSphere - Cart & checkout page
   Flow: edit cart -> "Place order & pay" creates a saved order
   (Pending Payment, stock reserved) -> payment modal -> Processing
   ========================================================== */

document.addEventListener("DOMContentLoaded", () => {
  if (!guardOK("customer")) return;
  const user = getSession();
  const $ = (id) => document.getElementById(id);
  const addrKey = KEY.addr + user.username;

  // Prefill delivery form with the last used address
  const saved = load(addrKey, { name: user.name, phone: "", line: "" });
  $("shipName").value = saved.name; $("shipPhone").value = saved.phone; $("shipAddress").value = saved.line;

  function render() {
    const products = getProducts();
    // keep only lines whose product still exists, and cap qty to stock
    let cart = getCart(user.username).filter((c) => products.some((p) => p.id === c.id));
    cart.forEach((c) => { const p = products.find((x) => x.id === c.id); if (c.qty > p.stock) c.qty = p.stock; });
    cart = cart.filter((c) => c.qty > 0);
    saveCart(user.username, cart);
    updateCartBadge();

    const empty = cart.length === 0;
    $("emptyCart").classList.toggle("d-none", !empty);
    $("cartLayout").classList.toggle("d-none", empty);
    if (empty) return;

    $("cartLines").innerHTML = cart.map((c) => {
      const p = products.find((x) => x.id === c.id);
      return `<div class="cart-line">
        <div class="cart-thumb">${esc(p.icon)}</div>
        <div class="flex-grow-1"><div class="fw-semibold">${esc(p.name)}</div><small class="text-muted">${rm(p.price)} each &middot; ${p.stock} in stock</small></div>
        <div class="qty-ctrl btn-group btn-group-sm align-items-center" role="group" aria-label="Quantity">
          <button class="btn btn-outline-secondary" data-act="dec" data-id="${esc(p.id)}" aria-label="Decrease">&minus;</button>
          <span>${c.qty}</span>
          <button class="btn btn-outline-secondary" data-act="inc" data-id="${esc(p.id)}" aria-label="Increase" ${c.qty >= p.stock ? "disabled" : ""}>+</button>
        </div>
        <div class="text-end" style="min-width:90px"><div class="fw-bold">${rm(p.price * c.qty)}</div>
          <button class="btn btn-link btn-sm text-danger p-0" data-act="del" data-id="${esc(p.id)}"><i class="bi bi-trash"></i> Remove</button></div>
      </div>`;
    }).join("");

    const sub = cart.reduce((s, c) => s + products.find((p) => p.id === c.id).price * c.qty, 0);
    const ship = sub >= FREE_SHIPPING_OVER ? 0 : SHIPPING_FEE;
    $("sumSub").textContent = rm(sub);
    $("sumShip").textContent = ship ? rm(ship) : "FREE";
    $("shipHint").textContent = ship ? `Spend ${rm(FREE_SHIPPING_OVER - sub)} more for free shipping.` : "You get free shipping!";
    $("sumTotal").textContent = rm(sub + ship);
  }

  $("cartLines").addEventListener("click", (e) => {
    const b = e.target.closest("[data-act]");
    if (!b) return;
    const cart = getCart(user.username);
    const line = cart.find((c) => c.id === b.dataset.id);
    if (!line) return;
    if (b.dataset.act === "inc") line.qty += 1;
    if (b.dataset.act === "dec") line.qty -= 1;
    saveCart(user.username, b.dataset.act === "del" ? cart.filter((c) => c !== line) : cart.filter((c) => c.qty > 0));
    render();
  });

  $("checkoutForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const name = $("shipName").value.trim(), phone = $("shipPhone").value.trim(), line = $("shipAddress").value.trim();
    if (name.length < 2) return showAlert("formAlert", "Please enter the receiver's name.", "warning");
    if (!/^\+?[0-9\- ]{9,15}$/.test(phone)) return showAlert("formAlert", "Please enter a valid phone number (9-15 digits).", "warning");
    if (line.length < 10) return showAlert("formAlert", "Please enter your full delivery address.", "warning");
    $("formAlert").innerHTML = "";

    const address = { name, phone, line };
    save(addrKey, address);
    const res = placeOrder(user, address);
    if (!res.ok) { render(); return showAlert("formAlert", esc(res.error), "danger"); }
    updateCartBadge();

    openPayment(res.order.id, (result) => {
      if (result.paid) { location.href = "my-orders.html"; return; }
      render();
      showAlert("pageAlert", `Order <strong>${esc(res.order.id)}</strong> is saved but <strong>not paid yet</strong>. You can pay from <a href="my-orders.html">My Orders</a>.`, "warning");
    });
  });

  render();
});
