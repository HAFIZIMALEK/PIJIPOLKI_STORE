/* ==========================================================
   ShopSphere - Simulated payment gateway (modal)
   ----------------------------------------------------------
   DEMO ONLY: no real money moves and no payment provider is
   called. Card numbers are validated in the browser and are
   NEVER stored; only the card brand and last 4 digits are kept.
   Test cards:  4242 4242 4242 4242  -> approved
                4000 0000 0000 0002  -> declined
                4000 0000 0000 9995  -> insufficient funds
   ========================================================== */

const BANKS = ["Maybank2u", "CIMB Clicks", "Public Bank", "RHB Now", "Bank Islam", "Hong Leong Connect", "AmBank"];
const WALLETS = ["Touch 'n Go eWallet", "GrabPay", "Boost", "ShopeePay"];

let payState = { order: null, method: "card", paid: false, onFinished: null, modal: null };

function luhnValid(num) {
  let sum = 0, alt = false;
  for (let i = num.length - 1; i >= 0; i--) {
    let d = Number(num[i]);
    if (alt) { d *= 2; if (d > 9) d -= 9; }
    sum += d; alt = !alt;
  }
  return sum % 10 === 0;
}
const cardBrand = (n) => (n.startsWith("4") ? "Visa" : /^5[1-5]/.test(n) ? "Mastercard" : "Card");

function injectPayModal() {
  if (document.getElementById("payModal")) return;
  const wrap = document.createElement("div");
  wrap.innerHTML = `
  <div class="modal fade" id="payModal" tabindex="-1" aria-labelledby="payTitle" aria-hidden="true" data-bs-backdrop="static">
    <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable">
      <div class="modal-content">
        <div class="modal-header">
          <div><h5 class="modal-title" id="payTitle">Secure Payment</h5><small class="text-muted" id="payOrderRef"></small></div>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body">
          <!-- Payment form -->
          <div id="payFormView">
            <div class="pay-amount text-center mb-3"><small class="text-muted">Amount to pay</small><div class="fs-2 fw-bold text-primary" id="payAmount"></div></div>
            <div id="payAlert"></div>
            <ul class="nav nav-pills nav-fill mb-3 pay-methods" role="tablist">
              <li class="nav-item"><button type="button" class="nav-link active" data-method="card"><i class="bi bi-credit-card me-1"></i>Card</button></li>
              <li class="nav-item"><button type="button" class="nav-link" data-method="fpx"><i class="bi bi-bank me-1"></i>FPX</button></li>
              <li class="nav-item"><button type="button" class="nav-link" data-method="wallet"><i class="bi bi-wallet2 me-1"></i>E-Wallet</button></li>
            </ul>
            <div data-pane="card">
              <div class="mb-2"><label class="form-label small" for="cardName">Name on card</label>
                <input id="cardName" class="form-control" autocomplete="cc-name" placeholder="As shown on card"></div>
              <div class="mb-2"><label class="form-label small" for="cardNumber">Card number</label>
                <input id="cardNumber" class="form-control" inputmode="numeric" autocomplete="cc-number" maxlength="19" placeholder="4242 4242 4242 4242"></div>
              <div class="row g-2">
                <div class="col-6"><label class="form-label small" for="cardExp">Expiry (MM/YY)</label>
                  <input id="cardExp" class="form-control" inputmode="numeric" autocomplete="cc-exp" maxlength="5" placeholder="12/29"></div>
                <div class="col-6"><label class="form-label small" for="cardCvv">CVV</label>
                  <input id="cardCvv" type="password" class="form-control" inputmode="numeric" autocomplete="cc-csc" maxlength="3" placeholder="123"></div>
              </div>
              <div class="demo-box mt-3"><i class="bi bi-info-circle me-1"></i>Demo mode. Approved test card <code>4242 4242 4242 4242</code>, any future expiry, any 3-digit CVV. Declined test card: <code>4000 0000 0000 0002</code>.</div>
            </div>
            <div data-pane="fpx" class="d-none">
              <label class="form-label small" for="fpxBank">Choose your bank</label>
              <select id="fpxBank" class="form-select"><option value="">Select bank...</option>${BANKS.map((b) => `<option>${esc(b)}</option>`).join("")}</select>
              <div class="demo-box mt-3"><i class="bi bi-info-circle me-1"></i>Demo mode: you will not be redirected to a real bank.</div>
            </div>
            <div data-pane="wallet" class="d-none">
              <label class="form-label small" for="walletName">Choose your e-wallet</label>
              <select id="walletName" class="form-select"><option value="">Select e-wallet...</option>${WALLETS.map((w) => `<option>${esc(w)}</option>`).join("")}</select>
              <div class="demo-box mt-3"><i class="bi bi-info-circle me-1"></i>Demo mode: no real wallet is charged.</div>
            </div>
          </div>
          <!-- Success view -->
          <div id="paySuccessView" class="text-center py-3 d-none">
            <div class="success-check mb-2"><i class="bi bi-check-circle-fill"></i></div>
            <h4 class="fw-bold">Payment successful</h4>
            <p class="text-muted mb-1">Your order is now <strong>Processing</strong>.</p>
            <p class="small text-muted mb-0">Reference: <span id="payRef" class="fw-semibold"></span></p>
          </div>
        </div>
        <div class="modal-footer" id="payFooter">
          <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal" id="payLaterBtn">Pay later</button>
          <button type="button" class="btn btn-primary" id="payNowBtn"><span id="payNowLabel"><i class="bi bi-lock-fill me-1"></i>Pay now</span></button>
        </div>
      </div>
    </div>
  </div>`;
  document.body.appendChild(wrap.firstElementChild);

  const $ = (id) => document.getElementById(id);
  $("payModal").querySelectorAll(".pay-methods .nav-link").forEach((b) => b.addEventListener("click", () => setPayMethod(b.dataset.method)));
  $("cardNumber").addEventListener("input", (e) => {
    e.target.value = e.target.value.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
  });
  $("cardExp").addEventListener("input", (e) => {
    let v = e.target.value.replace(/\D/g, "").slice(0, 4);
    if (v.length > 2) v = v.slice(0, 2) + "/" + v.slice(2);
    e.target.value = v;
  });
  $("cardCvv").addEventListener("input", (e) => { e.target.value = e.target.value.replace(/\D/g, "").slice(0, 3); });
  $("payNowBtn").addEventListener("click", submitPayment);
  $("payModal").addEventListener("hidden.bs.modal", () => {
    const cb = payState.onFinished;
    // wipe sensitive fields
    ["cardName", "cardNumber", "cardExp", "cardCvv"].forEach((id) => { $(id).value = ""; });
    if (cb) cb({ paid: payState.paid, order: payState.order });
  });
}

function setPayMethod(m) {
  payState.method = m;
  document.querySelectorAll("#payModal .pay-methods .nav-link").forEach((b) => b.classList.toggle("active", b.dataset.method === m));
  document.querySelectorAll("#payModal [data-pane]").forEach((p) => p.classList.toggle("d-none", p.dataset.pane !== m));
  document.getElementById("payAlert").innerHTML = "";
}

function runGateway(method, d) {
  return new Promise((resolve) => setTimeout(() => {
    if (method === "card") {
      if (d.number === "4000000000000002") return resolve({ ok: false, message: "Your card was declined by the issuer." });
      if (d.number === "4000000000009995") return resolve({ ok: false, message: "Payment failed: insufficient funds." });
    }
    resolve({ ok: true });
  }, 1500));
}

function setPayBusy(busy) {
  const btn = document.getElementById("payNowBtn");
  btn.disabled = busy;
  document.getElementById("payLaterBtn").disabled = busy;
  document.getElementById("payNowLabel").innerHTML = busy
    ? '<span class="spinner-border spinner-border-sm me-2"></span>Processing...'
    : '<i class="bi bi-lock-fill me-1"></i>Pay now';
}

async function submitPayment() {
  const s = getSession();
  const order = payState.order;
  const $ = (id) => document.getElementById(id);
  const fail = (msg) => showAlert("payAlert", msg, "danger");
  let details = {}, label = "";

  if (payState.method === "card") {
    const name = $("cardName").value.trim();
    const number = $("cardNumber").value.replace(/\s/g, "");
    const exp = $("cardExp").value;
    const cvv = $("cardCvv").value;
    if (name.length < 2) return fail("Enter the name on the card.");
    if (!/^\d{13,16}$/.test(number) || !luhnValid(number)) return fail("Enter a valid card number.");
    const m = /^(\d{2})\/(\d{2})$/.exec(exp);
    if (!m || +m[1] < 1 || +m[1] > 12) return fail("Enter the expiry as MM/YY.");
    const now = new Date();
    if (new Date(2000 + +m[2], +m[1], 1) <= new Date(now.getFullYear(), now.getMonth(), 1)) return fail("This card has expired.");
    if (!/^\d{3}$/.test(cvv)) return fail("Enter the 3-digit CVV.");
    details = { number };
    label = `Credit/Debit Card (${cardBrand(number)} ending ${number.slice(-4)})`;
  } else if (payState.method === "fpx") {
    const bank = $("fpxBank").value;
    if (!bank) return fail("Please choose a bank.");
    label = `FPX Online Banking (${bank})`;
  } else {
    const w = $("walletName").value;
    if (!w) return fail("Please choose an e-wallet.");
    label = `E-Wallet (${w})`;
  }

  $("payAlert").innerHTML = "";
  setPayBusy(true);
  const r = await runGateway(payState.method, details);
  setPayBusy(false);
  if (!r.ok) return fail(`<strong>${esc(r.message)}</strong> Your order is still waiting for payment, so you can try again.`);

  const ref = "TXN-" + Date.now().toString(36).toUpperCase() + Math.floor(Math.random() * 90 + 10);
  const res = markOrderPaid(order.id, s.username, label, ref);
  if (!res.ok) return fail(esc(res.error));

  payState.paid = true; payState.order = res.order;
  $("payFormView").classList.add("d-none");
  $("paySuccessView").classList.remove("d-none");
  $("payRef").textContent = ref;
  $("payFooter").innerHTML = `<button type="button" class="btn btn-primary w-100" data-bs-dismiss="modal">Done</button>`;
}

/** Opens the payment modal for an unpaid order owned by the logged-in customer. */
function openPayment(orderId, onFinished) {
  injectPayModal();
  const s = getSession();
  const order = getOrders().find((o) => o.id === orderId && o.username === s.username);
  if (!order || order.status !== "Pending Payment") { if (onFinished) onFinished({ paid: false, order }); return; }

  payState = { order, method: "card", paid: false, onFinished, modal: payState.modal };
  const $ = (id) => document.getElementById(id);
  $("payOrderRef").textContent = "Order " + order.id;
  $("payAmount").textContent = rm(order.total);
  $("payFormView").classList.remove("d-none");
  $("paySuccessView").classList.add("d-none");
  $("payFooter").innerHTML = `
    <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal" id="payLaterBtn">Pay later</button>
    <button type="button" class="btn btn-primary" id="payNowBtn"><span id="payNowLabel"><i class="bi bi-lock-fill me-1"></i>Pay now</span></button>`;
  $("payNowBtn").addEventListener("click", submitPayment);
  $("payAlert").innerHTML = "";
  setPayMethod("card");
  bootstrap.Modal.getOrCreateInstance($("payModal")).show();
}
