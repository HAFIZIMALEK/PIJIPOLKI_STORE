/* ==========================================================
   ShopSphere - Admin order management
   Admin moves orders: Processing -> Shipped -> Delivered, or Cancel.
   Orders still "Pending Payment" cannot be shipped until the
   customer has paid. Cancelling restocks items and refunds paid orders.
   ========================================================== */

document.addEventListener("DOMContentLoaded", () => {
  if (!guardOK("admin")) return;
  const $ = (id) => document.getElementById(id);
  let sortKey = "createdAt", sortDir = -1;
  const NEXT_LABEL = { Shipped: "Mark shipped", Delivered: "Mark delivered" };

  function render() {
    const q = $("searchBox").value.toLowerCase().trim(), st = $("statusFilter").value, pf = $("payFilter").value;
    const all = getOrders();
    const list = all
      .filter((o) => (!st || o.status === st) && (!pf || o.paymentStatus === pf) && (!q || (o.id + o.customerName + o.username).toLowerCase().includes(q)))
      .sort((a, b) => {
        const x = a[sortKey], y = b[sortKey];
        return (typeof x === "number" ? x - y : String(x).localeCompare(String(y))) * sortDir;
      });

    $("orderCount").textContent = `Showing ${list.length} of ${all.length} orders`;
    $("emptyMsg").classList.toggle("d-none", list.length > 0);
    $("orderRows").innerHTML = list.map((o) => {
      const next = (ADMIN_NEXT[o.status] || []).filter((s) => s !== "Cancelled")[0];
      const canCancel = (ADMIN_NEXT[o.status] || []).includes("Cancelled");
      return `<tr>
        <td class="fw-semibold">${esc(o.id)}</td>
        <td>${esc(o.customerName)}<div class="small text-muted">@${esc(o.username)}</div></td>
        <td class="text-nowrap">${fmtDate(o.createdAt)}</td><td>${rm(o.total)}</td>
        <td>${payPill(o.paymentStatus)}<div class="small text-muted">${o.paymentMethod ? esc(o.paymentMethod) : ""}</div></td>
        <td>${statusPill(o.status)}</td>
        <td class="text-end text-nowrap">
          <button class="btn btn-sm btn-outline-secondary" data-act="view" data-id="${esc(o.id)}" aria-label="View ${esc(o.id)}"><i class="bi bi-eye"></i></button>
          ${next ? `<button class="btn btn-sm btn-primary" data-act="next" data-next="${next}" data-id="${esc(o.id)}">${NEXT_LABEL[next]}</button>` : ""}
          ${canCancel ? `<button class="btn btn-sm btn-outline-danger" data-act="cancel" data-id="${esc(o.id)}">Cancel</button>` : ""}
        </td></tr>`;
    }).join("");
    $("sumCell").textContent = rm(list.filter(isRevenue).reduce((s, o) => s + o.total, 0));
  }

  $("orderRows").addEventListener("click", (e) => {
    const b = e.target.closest("[data-act]");
    if (!b) return;
    const id = b.dataset.id;
    if (b.dataset.act === "view") {
      $("detailBody").innerHTML = orderDetailHTML(getOrders().find((o) => o.id === id), true);
      $("detailTitle").textContent = "Order " + id;
      bootstrap.Modal.getOrCreateInstance($("detailModal")).show();
      return;
    }
    let newStatus, note;
    if (b.dataset.act === "next") { newStatus = b.dataset.next; note = newStatus === "Shipped" ? "Parcel handed to courier" : "Parcel delivered"; }
    else {
      if (!confirm(`Cancel ${id}? Items go back to stock and any payment is refunded.`)) return;
      newStatus = "Cancelled"; note = "Cancelled by admin";
    }
    const r = updateOrderStatus(id, newStatus, note, "admin");
    showAlert("pageAlert", r.ok ? `<strong>${esc(id)}</strong> is now <strong>${esc(newStatus)}</strong>.` : esc(r.error), r.ok ? "success" : "danger");
    render();
  });

  document.querySelectorAll("th.sortable").forEach((th) => th.addEventListener("click", () => {
    const k = th.dataset.key;
    sortDir = sortKey === k ? -sortDir : 1; sortKey = k; render();
  }));
  ["searchBox"].forEach((id) => $(id).addEventListener("input", render));
  ["statusFilter", "payFilter"].forEach((id) => $(id).addEventListener("change", render));
  onDataChange(render);   // new customer orders / payments appear automatically
  render();
});
