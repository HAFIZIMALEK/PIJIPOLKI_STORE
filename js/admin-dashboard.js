/* ==========================================================
   ShopSphere - Admin dashboard
   Every figure is computed from the orders/products saved in
   localStorage, so new customer purchases appear here.
   ========================================================== */

document.addEventListener("DOMContentLoaded", () => {
  if (!guardOK("admin")) return;
  const $ = (id) => document.getElementById(id);
  const user = getSession();
  $("welcomeTitle").textContent = `Welcome, ${user.name.split(" ")[0]} 👋`;

  const charts = {};
  function draw(id, config) {
    if (charts[id]) charts[id].destroy();
    charts[id] = new Chart($(id), config);
  }

  function render() {
    const orders = getOrders(), products = getProducts();
    const customers = getUsers().filter((u) => u.role === "customer");
    const paid = orders.filter(isRevenue);
    const revenue = paid.reduce((s, o) => s + o.total, 0);
    const toShip = orders.filter((o) => o.status === "Processing").length;
    $("noOrdersNote").classList.toggle("d-none", orders.length > 0);
    const awaiting = orders.filter((o) => o.status === "Pending Payment").length;

    const cards = [
      { label: "Revenue (paid)", value: rm(revenue), icon: "bi-cash-coin", grad: "bg-grad-1" },
      { label: "Total Orders", value: orders.length, icon: "bi-receipt", grad: "bg-grad-2" },
      { label: "To Ship", value: toShip, icon: "bi-box-seam", grad: "bg-grad-3", sub: awaiting ? `${awaiting} awaiting payment` : "" },
      { label: "Customers", value: customers.length, icon: "bi-people", grad: "bg-grad-4" }
    ];
    $("statCards").innerHTML = cards.map((c) => `
      <div class="col-6 col-lg-3"><div class="card stat-card h-100"><div class="card-body d-flex align-items-center gap-3">
        <div class="icon-box ${c.grad}"><i class="bi ${c.icon}"></i></div>
        <div><div class="value">${c.value}</div><div class="label">${c.label}</div>${c.sub ? `<div class="small text-warning-emphasis">${c.sub}</div>` : ""}</div>
      </div></div></div>`).join("");

    /* Monthly revenue: last 6 months */
    const now = new Date(), months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ key: d.getFullYear() + "-" + d.getMonth(), label: d.toLocaleString("en", { month: "short" }), sum: 0 });
    }
    paid.forEach((o) => {
      const d = new Date(o.createdAt), m = months.find((x) => x.key === d.getFullYear() + "-" + d.getMonth());
      if (m) m.sum += o.total;
    });
    draw("revenueChart", {
      type: "line",
      data: { labels: months.map((m) => m.label), datasets: [{ label: "Revenue (RM)", data: months.map((m) => +m.sum.toFixed(2)),
        borderColor: "#4f46e5", backgroundColor: "rgba(79,70,229,.12)", fill: true, tension: .35, pointRadius: 4, pointBackgroundColor: "#4f46e5" }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false },
        tooltip: { callbacks: { label: (c) => " " + rm(c.parsed.y) } } }, scales: { y: { beginAtZero: true } } }
    });

    /* Order status doughnut */
    const statuses = ["Pending Payment", "Processing", "Shipped", "Delivered", "Cancelled"];
    draw("statusChart", {
      type: "doughnut",
      data: { labels: statuses, datasets: [{ data: statuses.map((s) => orders.filter((o) => o.status === s).length),
        backgroundColor: ["#8b5cf6", "#f59e0b", "#3b82f6", "#10b981", "#ef4444"], borderWidth: 2 }] },
      options: { responsive: true, maintainAspectRatio: false, cutout: "60%", plugins: { legend: { position: "bottom" } } }
    });

    /* Units sold by category (paid orders) */
    const catOf = (id) => (products.find((p) => p.id === id) || {}).category || "Other";
    const units = {};
    products.forEach((p) => { units[p.category] = units[p.category] || 0; });
    paid.forEach((o) => o.items.forEach((l) => { const c = catOf(l.id); units[c] = (units[c] || 0) + l.qty; }));
    draw("categoryChart", {
      type: "bar",
      data: { labels: Object.keys(units), datasets: [{ label: "Units sold", data: Object.values(units),
        backgroundColor: ["#4f46e5", "#ec4899", "#f59e0b", "#10b981", "#06b6d4"], borderRadius: 8 }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } }
    });

    /* Recent orders */
    const recent = [...orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6);
    $("recentOrders").innerHTML = recent.map((o) => `
      <tr><td class="fw-semibold">${esc(o.id)}</td><td>${esc(o.customerName)}</td><td>${rm(o.total)}</td>
      <td>${payPill(o.paymentStatus)}</td><td>${statusPill(o.status)}</td></tr>`).join("");

    /* Low stock */
    const low = products.filter((p) => p.stock <= 10).sort((a, b) => a.stock - b.stock);
    $("lowStock").innerHTML = low.length ? low.map((p) => `
      <li class="list-group-item d-flex justify-content-between align-items-center px-0">
        <span>${esc(p.icon)} ${esc(p.name)}</span>
        <span class="badge ${p.stock === 0 ? "text-bg-danger" : "text-bg-warning"}">${p.stock === 0 ? "Out of stock" : p.stock + " left"}</span></li>`).join("")
      : '<li class="list-group-item px-0 text-muted">All products are well stocked.</li>';
    if (!recent.length) $("recentOrders").innerHTML = '<tr><td colspan="5" class="text-center text-muted py-4">No orders yet.</td></tr>';
  }

  $("resetBtn").addEventListener("click", () => {
    if (confirm("Clear ALL orders and carts and restore product stock? Customer accounts are kept. This cannot be undone.")) {
      clearAllOrders(); location.reload();
    }
  });
  onDataChange(render);
  render();
});
