/* ==========================================================
  PIJIPOLKI_STORE - Data layer (localStorage "database")
   ----------------------------------------------------------
   Everything the shop needs is saved in the browser's
   localStorage, so purchases, stock, carts and order status
   survive page reloads and are shared between tabs
   (e.g. a customer tab and an admin tab on the same browser).
   NOTE: this is a front-end demo. localStorage is per browser,
   so data is NOT shared between different computers.
   ========================================================== */

/* ---------- Config & helpers ---------- */
const ROOT = /\/(admin|customer)\//.test(location.pathname) ? "../" : "";
const KEY = {
  users: "ss_users", products: "ss_products", orders: "ss_orders",
  seed: "ss_seed", cart: "ss_cart_", addr: "ss_addr_", session: "ss_session"
};
const SEED_VERSION = "4";
const SHIPPING_FEE = 8;
const FREE_SHIPPING_OVER = 300;

/** Escape text before putting it into innerHTML (prevents HTML injection). */
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const rm = (n) => "RM " + Number(n).toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtDate = (iso) => new Date(iso).toLocaleString("en-MY",
  { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

function load(key, fallback) {
  try { const raw = localStorage.getItem(key); return raw === null ? fallback : JSON.parse(raw); }
  catch (e) { return fallback; }
}
function save(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; }
  catch (e) { console.error("Could not save", key, e); return false; }
}

/* ---------- Table accessors ---------- */
const getUsers = () => load(KEY.users, []);
const saveUsers = (v) => save(KEY.users, v);
const getProducts = () => load(KEY.products, []);
const saveProducts = (v) => save(KEY.products, v);
const getOrders = () => load(KEY.orders, []);
const saveOrders = (v) => save(KEY.orders, v);
const getCart = (user) => load(KEY.cart + user, []);
const saveCart = (user, v) => save(KEY.cart + user, v);
const cartCount = (user) => getCart(user).reduce((s, c) => s + c.qty, 0);

/* ---------- Demo seed data ---------- */
function buildSeed() {
  const now = new Date();
  const mk = (username, password, name, city, role, monthsAgo) => ({
    username, password, name, role, city,
    email: username + "@example.com",
    joined: new Date(now.getFullYear(), now.getMonth() - monthsAgo, 10).toISOString()
  });
  const users = [
    mk("admin_baru", "admin1234", "Admin User", "Kuala Lumpur", "admin", 12),
    mk("customer", "customer123", "Muhammad Hafizi", "Kuala Lumpur", "customer", 11)
  ];

  const products = [
    { id: "P001", name: "Wireless Headphones", category: "Electronics", price: 189.9, stock: 42, rating: 4.6, icon: "🎧" },
    { id: "P002", name: "Smart Watch Series 5", category: "Electronics", price: 449.0, stock: 18, rating: 4.4, icon: "⌚" },
    { id: "P003", name: "Running Shoes", category: "Fashion", price: 259.0, stock: 65, rating: 4.7, icon: "👟" },
    { id: "P004", name: "Denim Jacket", category: "Fashion", price: 139.9, stock: 30, rating: 4.2, icon: "🧥" },
    { id: "P005", name: "Coffee Maker", category: "Home", price: 219.0, stock: 12, rating: 4.5, icon: "☕" },
    { id: "P006", name: "Ergonomic Chair", category: "Home", price: 599.0, stock: 8, rating: 4.8, icon: "🪑" },
    { id: "P007", name: "Yoga Mat", category: "Sports", price: 59.9, stock: 120, rating: 4.3, icon: "🧘" },
    { id: "P008", name: "Badminton Racket", category: "Sports", price: 169.0, stock: 25, rating: 4.6, icon: "🏸" },
    { id: "P009", name: "Mechanical Keyboard", category: "Electronics", price: 299.0, stock: 0, rating: 4.7, icon: "⌨️" },
    { id: "P010", name: "Backpack 25L", category: "Fashion", price: 119.0, stock: 54, rating: 4.1, icon: "🎒" },
    { id: "P011", name: "Air Fryer", category: "Home", price: 329.0, stock: 22, rating: 4.6, icon: "🍟" },
    { id: "P012", name: "Water Bottle 1L", category: "Sports", price: 39.9, stock: 200, rating: 4.4, icon: "🥤" }
  ];

  // No sample orders: the admin only sees real orders placed from the customer pages.
  return { users, products, orders: [] };
}

function resetDemoData() {
  const seed = buildSeed();
  saveUsers(seed.users); saveProducts(seed.products); saveOrders(seed.orders);
  Object.keys(localStorage).filter((k) => k.startsWith(KEY.cart) || k.startsWith(KEY.addr))
    .forEach((k) => localStorage.removeItem(k));
  localStorage.setItem(KEY.seed, SEED_VERSION);
}
function seedIfNeeded() {
  const v = localStorage.getItem(KEY.seed);
  if (v === SEED_VERSION) return;
  if (v === "2") {
    // Upgrade from the earlier version: drop the fake sample orders/customers
    // but keep anything a real customer did (their orders, accounts, stock).
    const orders = getOrders().filter((o) => !String(o.paymentRef || "").startsWith("TXN-DEMO"));
    const sampleUsers = ["daniel", "aina", "kumar", "sarah", "weijie", "priya"];
    saveOrders(orders);
    saveUsers(getUsers().filter((u) => !sampleUsers.includes(u.username) || orders.some((o) => o.username === u.username)));
    localStorage.setItem(KEY.seed, SEED_VERSION);
    return;
  }
  resetDemoData();
}

/* ---------- Cart ---------- */
function addToCart(username, productId, qty = 1) {
  const p = getProducts().find((x) => x.id === productId);
  if (!p) return { ok: false, error: "Product not found." };
  const cart = getCart(username);
  const line = cart.find((c) => c.id === productId);
  const next = (line ? line.qty : 0) + qty;
  if (next > p.stock) return { ok: false, error: `Only ${p.stock} of "${p.name}" in stock.` };
  if (line) line.qty = next; else cart.push({ id: productId, qty });
  saveCart(username, cart);
  return { ok: true };
}

/* ---------- Orders ---------- */
const newOrderId = (orders) => "ORD-" + (orders.reduce((m, o) => Math.max(m, parseInt(o.id.slice(4), 10)), 1000) + 1);

/** Turns the cart into an order (status "Pending Payment") and reserves stock. */
function placeOrder(user, address) {
  const cart = getCart(user.username);
  if (!cart.length) return { ok: false, error: "Your cart is empty." };
  const products = getProducts();
  const lines = [];
  for (const c of cart) {
    const p = products.find((x) => x.id === c.id);
    if (!p) return { ok: false, error: "A product in your cart is no longer available." };
    if (p.stock < c.qty) return { ok: false, error: `Only ${p.stock} of "${p.name}" left in stock. Please update your cart.` };
    lines.push({ id: p.id, name: p.name, icon: p.icon, price: p.price, qty: c.qty });
  }
  lines.forEach((l) => { products.find((p) => p.id === l.id).stock -= l.qty; });
  const subtotal = lines.reduce((s, l) => s + l.price * l.qty, 0);
  const shipping = subtotal >= FREE_SHIPPING_OVER ? 0 : SHIPPING_FEE;
  const orders = getOrders();
  const now = new Date().toISOString();
  const order = {
    id: newOrderId(orders), username: user.username, customerName: user.name, createdAt: now,
    items: lines, subtotal, shipping, total: subtotal + shipping, address,
    paymentStatus: "Unpaid", paymentMethod: null, paymentRef: null, paidAt: null,
    status: "Pending Payment",
    history: [{ status: "Pending Payment", at: now, note: "Order placed, waiting for payment" }]
  };
  orders.push(order);
  if (!saveProducts(products) || !saveOrders(orders)) return { ok: false, error: "Could not save your order (browser storage is full or blocked)." };
  saveCart(user.username, []);
  return { ok: true, order };
}

/** Marks an order as paid (called only after the payment step succeeds). */
function markOrderPaid(orderId, username, method, ref) {
  const orders = getOrders();
  const o = orders.find((x) => x.id === orderId && x.username === username);
  if (!o) return { ok: false, error: "Order not found." };
  if (o.status !== "Pending Payment") return { ok: false, error: `This order is already "${o.status}".` };
  const now = new Date().toISOString();
  o.paymentStatus = "Paid"; o.paymentMethod = method; o.paymentRef = ref; o.paidAt = now;
  o.status = "Processing";
  o.history.push({ status: "Processing", at: now, note: "Payment received (" + method + ")" });
  saveOrders(orders);
  return { ok: true, order: o };
}

const ADMIN_NEXT = {
  "Pending Payment": ["Cancelled"],
  "Processing": ["Shipped", "Cancelled"],
  "Shipped": ["Delivered", "Cancelled"],
  "Delivered": [], "Cancelled": []
};

/** Changes an order's status, restocks and refunds when cancelled. */
function updateOrderStatus(orderId, newStatus, note, actor) {
  const orders = getOrders();
  const o = orders.find((x) => x.id === orderId);
  if (!o) return { ok: false, error: "Order not found." };
  const allowed = actor === "customer"
    ? { "Pending Payment": ["Cancelled"], "Processing": ["Cancelled"] }[o.status] || []
    : ADMIN_NEXT[o.status] || [];
  if (!allowed.includes(newStatus)) return { ok: false, error: `Cannot change from "${o.status}" to "${newStatus}".` };

  const now = new Date().toISOString();
  let msg = note;
  if (newStatus === "Cancelled") {
    const products = getProducts();
    o.items.forEach((l) => { const p = products.find((x) => x.id === l.id); if (p) p.stock += l.qty; });
    saveProducts(products);
    if (o.paymentStatus === "Paid") { o.paymentStatus = "Refunded"; msg = (note || "Cancelled") + " (payment refunded)"; }
  }
  o.status = newStatus;
  o.history.push({ status: newStatus, at: now, note: msg || "" });
  saveOrders(orders);
  return { ok: true, order: o };
}

/** Revenue only counts orders that are actually paid (not refunded). */
const isRevenue = (o) => o.paymentStatus === "Paid";

seedIfNeeded();

/** Admin tool: removes every order and cart and puts reserved stock back. Accounts are kept. */
function clearAllOrders() {
  const products = getProducts();
  getOrders().filter((o) => o.status !== "Cancelled").forEach((o) => o.items.forEach((l) => {
    const p = products.find((x) => x.id === l.id); if (p) p.stock += l.qty;
  }));
  saveProducts(products);
  saveOrders([]);
  Object.keys(localStorage).filter((k) => k.startsWith(KEY.cart)).forEach((k) => localStorage.removeItem(k));
}
