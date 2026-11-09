/* ==========================================================
   ShopSphere - Admin product management (add / edit / delete / stock)
   ========================================================== */

document.addEventListener("DOMContentLoaded", () => {
  if (!guardOK("admin")) return;
  const $ = (id) => document.getElementById(id);
  let editingId = null;

  const soldMap = () => {
    const m = {};
    getOrders().filter(isRevenue).forEach((o) => o.items.forEach((l) => { m[l.id] = (m[l.id] || 0) + l.qty; }));
    return m;
  };
  const stockBadge = (s) => s === 0 ? '<span class="badge text-bg-danger">Out of stock</span>'
    : s <= 10 ? `<span class="badge text-bg-warning">${s}</span>` : `<span class="badge text-bg-success">${s}</span>`;

  function fillCategories() {
    const cats = [...new Set(getProducts().map((p) => p.category))].sort();
    const cur = $("categoryFilter").value;
    $("categoryFilter").innerHTML = '<option value="">All categories</option>' + cats.map((c) => `<option>${esc(c)}</option>`).join("");
    $("categoryFilter").value = cats.includes(cur) ? cur : "";
    $("catList").innerHTML = cats.map((c) => `<option value="${esc(c)}">`).join("");
  }

  function render() {
    fillCategories();
    const q = $("searchBox").value.toLowerCase().trim(), cat = $("categoryFilter").value, sf = $("stockFilter").value;
    const sold = soldMap();
    const all = getProducts();
    const list = all.filter((p) => (!cat || p.category === cat) && (!q || (p.name + p.id).toLowerCase().includes(q))
      && (!sf || (sf === "out" ? p.stock === 0 : p.stock <= 10)));
    $("productCount").textContent = `Showing ${list.length} of ${all.length} products`;
    $("emptyMsg").classList.toggle("d-none", list.length > 0);
    $("productRows").innerHTML = list.map((p) => `
      <tr><td>${esc(p.id)}</td><td>${esc(p.icon)} <strong>${esc(p.name)}</strong></td><td>${esc(p.category)}</td>
      <td class="text-end">${rm(p.price)}</td><td class="text-end">${stockBadge(p.stock)}</td><td class="text-end">${sold[p.id] || 0}</td>
      <td class="text-end text-nowrap">
        <button class="btn btn-sm btn-outline-primary" data-act="edit" data-id="${esc(p.id)}" aria-label="Edit ${esc(p.name)}"><i class="bi bi-pencil"></i></button>
        <button class="btn btn-sm btn-outline-danger" data-act="del" data-id="${esc(p.id)}" aria-label="Delete ${esc(p.name)}"><i class="bi bi-trash"></i></button></td></tr>`).join("");
  }

  function openForm(p) {
    editingId = p ? p.id : null;
    $("productModalTitle").textContent = p ? "Edit " + p.id : "Add product";
    $("fName").value = p ? p.name : ""; $("fIcon").value = p ? p.icon : "📦";
    $("fCategory").value = p ? p.category : ""; $("fPrice").value = p ? p.price : ""; $("fStock").value = p ? p.stock : "";
    $("formAlert").innerHTML = "";
    bootstrap.Modal.getOrCreateInstance($("productModal")).show();
  }

  $("addBtn").addEventListener("click", () => openForm(null));
  $("productRows").addEventListener("click", (e) => {
    const b = e.target.closest("[data-act]");
    if (!b) return;
    const p = getProducts().find((x) => x.id === b.dataset.id);
    if (!p) return;
    if (b.dataset.act === "edit") return openForm(p);
    if (confirm(`Delete "${p.name}"? Past orders keep their own copy of the item.`)) {
      saveProducts(getProducts().filter((x) => x.id !== p.id));
      showAlert("pageAlert", `Deleted <strong>${esc(p.name)}</strong>.`, "info");
      render();
    }
  });

  $("productForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const name = $("fName").value.trim(), category = $("fCategory").value.trim();
    const icon = $("fIcon").value.trim() || "📦";
    const price = parseFloat($("fPrice").value), stock = parseInt($("fStock").value, 10);
    if (name.length < 2) return showAlert("formAlert", "Enter a product name.", "warning");
    if (!category) return showAlert("formAlert", "Enter a category.", "warning");
    if (!(price > 0)) return showAlert("formAlert", "Price must be more than 0.", "warning");
    if (!Number.isInteger(stock) || stock < 0) return showAlert("formAlert", "Stock must be 0 or more.", "warning");

    const products = getProducts();
    if (editingId) {
      Object.assign(products.find((p) => p.id === editingId), { name, category, icon, price: +price.toFixed(2), stock });
    } else {
      const next = products.reduce((m, p) => Math.max(m, parseInt(p.id.slice(1), 10)), 0) + 1;
      products.push({ id: "P" + String(next).padStart(3, "0"), name, category, icon, price: +price.toFixed(2), stock, rating: 4.0 });
    }
    saveProducts(products);
    bootstrap.Modal.getInstance($("productModal")).hide();
    showAlert("pageAlert", `Product <strong>${esc(name)}</strong> saved.`, "success");
    render();
  });

  ["searchBox", "categoryFilter", "stockFilter"].forEach((id) => $(id).addEventListener("input", render));
  onDataChange(render);
  render();
});
