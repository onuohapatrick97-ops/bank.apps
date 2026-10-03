// ===== BANKS — APP LOGIC =====

var currentUser = null;
var currentBank = null;
var balances = { apex: 0, cyber: 0 };
var transactionsByBank = { apex: [], cyber: [] };
var overdraftLimits = { apex: 2000, cyber: 2000 };
var overdraftFeesCharged = { apex: false, cyber: false };
var notifications = { apex: [], cyber: [] };
// Init immediately since data.js already loaded
initState();
var splashScreen = document.getElementById("splashScreen");
var loginScreen = document.getElementById("loginScreen");
var appScreen = document.getElementById("appScreen");
var loginBtn = document.getElementById("loginBtn");
var loginEmail = document.getElementById("loginEmail");
var loginPassword = document.getElementById("loginPassword");
var loginError = document.getElementById("loginError");
var loadingOverlay = document.getElementById("loadingOverlay");
var bankNameEl = document.getElementById("bankName");
var bankNameSide = document.getElementById("bankNameSide");
var userNameEl = document.getElementById("userName");
var userInitials = document.getElementById("userInitials");

setTimeout(function() {
  splashScreen.classList.add("hide");
  loginScreen.classList.remove("hide");
}, 2000);

function initState() {
  try {
    var raw = localStorage.getItem("banksState");
    if (raw) {
      var s = JSON.parse(raw);
      if (s.balances) balances = s.balances;
      if (s.transactionsByBank) transactionsByBank = s.transactionsByBank;
      if (s.overdraftLimits) overdraftLimits = s.overdraftLimits;
      if (s.overdraftFeesCharged) overdraftFeesCharged = s.overdraftFeesCharged;
      if (s.notifications) notifications = s.notifications;
      return;
    }
  } catch (e) {}

  balances.apex = banks.apex.startingBalance;
  balances.cyber = banks.cyber.startingBalance;
  transactionsByBank.apex = apexTransactions.slice();
  transactionsByBank.cyber = cyberTransactions.slice();
  overdraftLimits.apex = DEFAULT_OVERDRAFT_LIMIT;
  overdraftLimits.cyber = DEFAULT_OVERDRAFT_LIMIT;
  overdraftFeesCharged.apex = false;
  overdraftFeesCharged.cyber = false;
  notifications.apex = [];
  notifications.cyber = [];
  saveState();
}

function saveState() {
  try {
    localStorage.setItem("banksState", JSON.stringify({
      balances: balances,
      transactionsByBank: transactionsByBank,
      overdraftLimits: overdraftLimits,
      overdraftFeesCharged: overdraftFeesCharged,
      notifications: notifications
    }));
  } catch (e) {}
}

loginBtn.addEventListener("click", doLogin);
loginPassword.addEventListener("keydown", function(e) { if (e.key === "Enter") doLogin(); });
loginEmail.addEventListener("keydown", function(e) { if (e.key === "Enter") doLogin(); });

function doLogin() {
  var email = loginEmail.value.trim().toLowerCase();
  var pass = loginPassword.value.trim();

  if (!email || !pass) {
    showLoginError("Please enter both email and password");
    return;
  }

  var foundUser = null;
  for (var key in users) {
    if (users[key].email.toLowerCase() === email && users[key].password === pass) {
      foundUser = key;
      break;
    }
  }

  if (!foundUser) {
    showLoginError("Invalid email or password");
    return;
  }

  loginError.classList.remove("show");
  showLoading("Signing in...");

  setTimeout(function() {
    currentUser = foundUser;
    currentBank = users[foundUser].bank;

    loginScreen.classList.add("hide");
    appScreen.classList.add("show");
    hideLoading();

    applyBankTheme();
    updateHeaderInfo();
    renderRecent();
    renderFull();
    updateBalanceDisplay();
    updateLoanDisplay();
    renderNotifications();
    updateFreezeUI();

    if (typeof checkPendingLoan === "function") checkPendingLoan();
    if (typeof renderLoanHistory === "function") renderLoanHistory();
  }, 900);
}

function showLoginError(msg) {
  loginError.textContent = msg;
  loginError.classList.add("show");
}

function logout() {
  showLoading("Logging out...");
  setTimeout(function() {
    appScreen.classList.remove("show");
    loginScreen.classList.remove("hide");
    loginEmail.value = "";
    loginPassword.value = "";
    currentUser = null;
    currentBank = null;
    goTo("dashboard", true);
    hideLoading();
  }, 700);
}

function applyBankTheme() {
  var bank = banks[currentBank];
  var header = document.getElementById("mainHeader");
  var sidebar = document.getElementById("sidebar");
  var vCards = document.querySelectorAll(".virtual-card");

  if (header) header.style.background = bank.gradient;
  if (sidebar) sidebar.style.background = "linear-gradient(180deg, #0f172a, " + bank.accent + ")";
  vCards.forEach(function(vc) {
    if (!vc.classList.contains("alt-card")) vc.style.background = bank.gradient;
  });

  var minis = document.querySelectorAll(".mini-balance");
  minis.forEach(function(m) { m.style.background = bank.gradient; });

  document.documentElement.style.setProperty("--accent", bank.accent);
}

function updateHeaderInfo() {
  var u = users[currentUser];
  var b = banks[currentBank];
  if (bankNameEl) bankNameEl.textContent = b.name;
  if (bankNameSide) bankNameSide.textContent = b.name;
  if (userNameEl) userNameEl.textContent = u.name;
  if (userInitials) userInitials.textContent = u.initials;

  var acctEl = document.getElementById("accountNumber");
  if (acctEl) acctEl.textContent = b.accountNumber;
  var holderEl = document.getElementById("accountHolder");
  if (holderEl) holderEl.textContent = b.holder;
}

function showLoading(text) {
  var t = document.querySelector(".loading-text");
  if (t) t.textContent = text || "Loading...";
  loadingOverlay.classList.add("show");
}
function hideLoading() { loadingOverlay.classList.remove("show"); }

var sidebar = document.getElementById("sidebar");
var overlay = document.getElementById("overlay");

document.getElementById("menuBtn").addEventListener("click", function() {
  sidebar.classList.add("show");
  overlay.classList.add("show");
});

overlay.addEventListener("click", function() {
  sidebar.classList.remove("show");
  overlay.classList.remove("show");
});

function goTo(page, instant) {
  if (!instant) showLoading("Loading...");
  var delay = instant ? 0 : 300;

  setTimeout(function() {
    document.querySelectorAll(".page").forEach(function(p) {
      p.classList.remove("active");
    });
    var target = document.getElementById("page-" + page);
    if (target) target.classList.add("active");

    document.querySelectorAll(".nav-item").forEach(function(n) {
      n.classList.remove("active");
      if (n.getAttribute("data-page") === page) n.classList.add("active");
    });

    sidebar.classList.remove("show");
    overlay.classList.remove("show");
    window.scrollTo({ top: 0, behavior: "smooth" });
    hideLoading();
  }, delay);
}

document.querySelectorAll(".nav-item").forEach(function(item) {
  item.addEventListener("click", function() {
    goTo(item.getAttribute("data-page"));
  });
});

document.querySelectorAll("[data-goto]").forEach(function(el) {
  el.addEventListener("click", function() {
    goTo(el.getAttribute("data-goto"));
  });
});

function showToast(msg) {
  var toast = document.getElementById("toast");
  toast.textContent = msg;
  toast.classList.add("show");
  setTimeout(function() { toast.classList.remove("show"); }, 2200);
}

function getActiveLoan() {
  var key = "activeLoan_" + currentBank;
  try {
    var raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (e) { return null; }
}

function getLoanHistory() {
  var key = "loanHistory_" + currentBank;
  try {
    var raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch (e) { return []; }
}
