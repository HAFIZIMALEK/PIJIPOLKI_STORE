/* ==========================================================
   ShopSphere - Login / Register page logic (index.html)
   ========================================================== */

document.addEventListener("DOMContentLoaded", () => {
  const existing = getSession();
  if (existing) { location.replace(HOME[existing.role]); return; }

  /* ---------- Login ---------- */
  document.getElementById("loginForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const u = document.getElementById("loginUser").value.trim().toLowerCase();
    const p = document.getElementById("loginPass").value;
    if (!u || !p) return showAlert("loginAlert", "Please enter both username and password.", "warning");

    const user = getUsers().find((x) => x.username === u && x.password === p);
    if (!user) return showAlert("loginAlert", "<strong>Invalid username or password.</strong> Please try again.", "danger");

    sessionStorage.setItem(KEY.session, JSON.stringify({ username: user.username, name: user.name, role: user.role }));
    showAlert("loginAlert", `Welcome ${esc(user.name)}! Opening the ${user.role} interface...`, "success");
    setTimeout(() => { location.href = HOME[user.role]; }, 600);
  });

  /* ---------- Register (customers only, saved in localStorage) ---------- */
  const regForm = document.getElementById("registerForm");
  regForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = document.getElementById("regName").value.trim();
    const user = document.getElementById("regUser").value.trim().toLowerCase();
    const pass = document.getElementById("regPass").value;
    const pass2 = document.getElementById("regPass2").value;
    const users = getUsers();

    if (name.length < 2) return showAlert("registerAlert", "Please enter your full name.", "warning");
    if (!/^[a-z0-9_]{4,20}$/.test(user)) return showAlert("registerAlert", "Username must be 4-20 characters: letters, numbers or underscore.", "warning");
    if (pass.length < 6) return showAlert("registerAlert", "Password must be at least 6 characters.", "warning");
    if (pass !== pass2) return showAlert("registerAlert", "Passwords do not match.", "danger");
    if (users.some((x) => x.username === user)) return showAlert("registerAlert", "That username is already taken.", "danger");

    users.push({ username: user, password: pass, name, role: "customer", city: "", email: "", joined: new Date().toISOString() });
    saveUsers(users);
    regForm.reset();
    showAlert("registerAlert", "Account created! Switch to the Login tab and sign in.", "success");
  });

  /* ---------- Show / hide password ---------- */
  document.getElementById("togglePass").addEventListener("click", function () {
    const f = document.getElementById("loginPass");
    const show = f.type === "password";
    f.type = show ? "text" : "password";
    this.innerHTML = `<i class="bi bi-eye${show ? "-slash" : ""}"></i>`;
  });
});
