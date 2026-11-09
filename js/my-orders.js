/* ==========================================================
   ShopSphere - Customer "My Orders" page
   Shows the logged-in customer's saved orders, live payment and
   delivery status (updates when admin changes it), pay-later and cancel.
   ========================================================== */

document.addEventListener("DOMContentLoaded", () => {
  if (!guardOK("customer")) return;
  const user = getSession();
  const $ = (id) => document.getElementById(id);
  const FILTERS = ["All", "Pending Payment", "Processing", "Shipped", "Delivered", "Cancelled"];
  let filter = "All";

  const mine = () => getOrders().filter((o) => o.username === user.username)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  function render() {
    const all = mine();
    $("filterChips").innerHTML = FILTERS.map((f) => {
      const n = f === "All" ? all.length : all.filter((o) => o.status === f).length;
      return `<button type="button" class="btn btn-sm ${f === filter ? "btn-primary" : "btn-outline-primary"}" data-filter="${f}">${f} <span class="badge text-bg-light">${n}</span></button>`;
    }).join("");

    const list = filter === "All" ? all : all.filter((o) => o.status === filter);
    $("orderCount").textContent = `${all.length} order${all.length === 1 ? "" : "s"} in total`;
    $("emptyMsg").classList.toggle("d-none", list.length > 0);

    $("orderList").innerHTML = list.map((o) => {
      const canPay = o.status === "Pending Payment";
      const canCancel = o.status === "Pending Payment" || o.status === "Processing";
      const cardCls = o.status === "Cancelled" ? "is-cancelled" : o.status === "Delivered" ? "is-delivered" : "";
      return `
      <article class="card order-card ${cardCls}"><div class="card-body">
        <div class="d-flex flex-wrap justify-content-between gap-2">
          <div><div class="fw-bold">${esc(o.id)}</div><small class="text-muted">${fmtDate(o.createdAt)}</small></div>
          <div class="text-end">${statusPill(o.status)} ${payPill(o.paymentStatus)}<div class="fw-bold text-primary mt-1">${rm(o.total)}</div></div>
        </div>
        <div class="small text-muted my-2">${o.items.map((l) => `${esc(l.icon)} ${esc(l.name)} &times; ${l.qty}`).join(" &nbsp;&middot;&nbsp; ")}</div>
        ${trackerHTML(o)}
        <div class="d-flex flex-wrap gap-2 mt-2">
          ${canPay ? `<button class="btn btn-primary btn-sm" data-act="pay" data-id="${esc(o.id)}"><i class="bi bi-credit-card me-1"></i>Pay now</button>` : ""}
          <button class="btn btn-outline-primary btn-sm" data-act="view" data-id="${esc(o.id)}"><i class="bi bi-eye me-1"></i>View details</button>
          ${canCancel ? `<button class="btn btn-outline-danger btn-sm" data-act="cancel" data-id="${esc(o.id)}"><i class="bi bi-x-circle me-1"></i>Cancel order</button>` : ""}
        </div>
      </div></article>`;
    }).join("");
    updateCartBadge();
  }

  $("filterChips").addEventListener("click", (e) => {
    const b = e.target.closest("[data-filter]");
    if (b) { filter = b.dataset.filter; render(); }
  });

  $("orderList").addEventListener("click", (e) => {
    const b = e.target.closest("[data-act]");
    if (!b) return;
    const id = b.dataset.id;
    if (b.dataset.act === "pay") {
      openPayment(id, (r) => {
        render();
        if (r.paid) showAlert("pageAlert", `Payment received for <strong>${esc(id)}</strong>. Your order is now being processed.`, "success");
      });
    } else if (b.dataset.act === "view") {
      const o = mine().find((x) => x.id === id);
      $("detailBody").innerHTML = orderDetailHTML(o, false);
      $("detailTitle").textContent = "Order " + id;
      bootstrap.Modal.getOrCreateInstance($("detailModal")).show();
    } else if (b.dataset.act === "cancel") {
      const o = mine().find((x) => x.id === id);
      const msg = o.paymentStatus === "Paid" ? `Cancel ${id}? Your payment will be refunded.` : `Cancel ${id}?`;
      if (!confirm(msg)) return;
      const r = updateOrderStatus(id, "Cancelled", "Cancelled by customer", "customer");
      showAlert("pageAlert", r.ok ? `Order <strong>${esc(id)}</strong> was cancelled.` : esc(r.error), r.ok ? "info" : "danger");
      render();
    }
  });

  onDataChange(render);   // live update when admin changes a status
  render();
});
