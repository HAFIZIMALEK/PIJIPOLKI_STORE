/* ==========================================================
   ShopSphere - Admin customers page (computed from users + orders)
   ========================================================== */

document.addEventListener("DOMContentLoaded", () => {
  if (!guardOK("admin")) return;
  const $ = (id) => document.getElementById(id);
  let chart;

  function render() {
    const orders = getOrders();
    const rows = getUsers().filter((u) => u.role === "customer").map((u) => {
      const mine = orders.filter((o) => o.username === u.username);
      return { ...u, orders: mine.length, spent: mine.filter(isRevenue).reduce((s, o) => s + o.total, 0) };
    }).sort((a, b) => b.spent - a.spent);

    $("custCount").textContent = `${rows.length} registered customers (from the customer register page)`;
    const initials = (n) => n.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
    $("customerRows").innerHTML = rows.map((c) => `
      <tr><td><div class="d-flex align-items-center gap-2">
        <span class="rounded-circle bg-primary text-white d-inline-flex align-items-center justify-content-center fw-bold flex-none" style="width:36px;height:36px;font-size:.8rem">${esc(initials(c.name))}</span>
        <div><div class="fw-semibold">${esc(c.name)}</div><small class="text-muted">@${esc(c.username)}${c.city ? " &middot; " + esc(c.city) : ""}</small></div></div></td>
      <td>${new Date(c.joined).toLocaleDateString("en-MY", { day: "2-digit", month: "short", year: "numeric" })}</td>
      <td class="text-end">${c.orders}</td><td class="text-end">${rm(c.spent)}</td></tr>`).join("");

    const top = rows.filter((c) => c.spent > 0).slice(0, 8);
    if (chart) chart.destroy();
    chart = new Chart($("customerChart"), {
      type: "bar",
      data: { labels: top.map((c) => c.name), datasets: [{ label: "Spent (RM)", data: top.map((c) => +c.spent.toFixed(2)), backgroundColor: "#4f46e5", borderRadius: 6 }] },
      options: { indexAxis: "y", responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => " " + rm(c.parsed.x) } } } }
    });
  }
  onDataChange(render);
  render();
});
