// ===== BANKS — BANK OPERATIONS =====

function checkFrozen() {
  var f = localStorage.getItem("frozen_" + currentBank);
  if (f === "true") {
    showToast("❄️ Account is frozen — unfreeze in Settings");
    return true;
  }
  return false;
}

function otherBankKey() {
  return currentBank === "apex" ? "cyber" : "apex";
}

function doDeposit() {
  if (checkFrozen()) return;
  var amt = parseFloat(document.getElementById("depositAmount").value);
  if (isNaN(amt) || amt <= 0) { showToast("Enter a valid amount"); return; }

  balances[currentBank] = balances[currentBank] + amt;
  transactionsByBank[currentBank].unshift({
    date: todayStr(), desc: "Deposit", amount: amt,
    type: "in", status: "completed", category: "Income"
  });

  addNotification(currentBank, "Deposit Successful", "$" + amt.toFixed(2) + " deposited");

  saveState();
  updateBalanceDisplay();
  renderRecent();
  renderFull();
  renderNotifications();
  document.getElementById("depositAmount").value = "";
  showToast("$" + amt.toFixed(2) + " deposited");
}

function doWithdraw() {
  if (checkFrozen()) return;
  var amt = parseFloat(document.getElementById("withdrawAmount").value);
  if (isNaN(amt) || amt <= 0) { showToast("Enter a valid amount"); return; }
  processOutgoing(amt, "Withdrawal", "withdrawAmount");
}

function doTransfer() {
  if (checkFrozen()) return;
  var name = document.getElementById("transferName").value.trim();
  var acct = document.getElementById("transferAcct").value.trim();
  var bankName = document.getElementById("transferBank").value;
  var amt = parseFloat(document.getElementById("transferAmount").value);
  var note = document.getElementById("transferNote").value.trim();

  if (!name || !acct) { showToast("Fill in beneficiary details"); return; }
  if (isNaN(amt) || amt <= 0) { showToast("Enter a valid amount"); return; }

  var desc = "Transfer to " + name + " (" + bankName + ")" + (note ? " — " + note : "");
  if (processOutgoing(amt, desc, null)) {
    document.getElementById("transferName").value = "";
    document.getElementById("transferAcct").value = "";
    document.getElementById("transferAmount").value = "";
    document.getElementById("transferNote").value = "";
    showToast("$" + amt.toFixed(2) + " sent to " + name);
  }
}

function doInterbank() {
  if (checkFrozen()) return;
  var amt = parseFloat(document.getElementById("interbankAmount").value);
  var note = document.getElementById("interbankNote").value.trim();
  if (isNaN(amt) || amt <= 0) { showToast("Enter a valid amount"); return; }

  var fromKey = currentBank;
  var toKey = otherBankKey();
  var fromBank = banks[fromKey];
  var toBank = banks[toKey];

  var newBalance = balances[fromKey] - amt;
  var minAllowed = -overdraftLimits[fromKey];
  if (newBalance < minAllowed) {
    showToast("❌ Exceeds overdraft limit");
    return;
  }

  balances[fromKey] = newBalance;
  transactionsByBank[fromKey].unshift({
    date: todayStr(),
    desc: "Transfer to " + toBank.name + (note ? " — " + note : ""),
    amount: amt, type: "out", status: "completed", category: "Transfer"
  });

  balances[toKey] = balances[toKey] + amt;
  transactionsByBank[toKey].unshift({
    date: todayStr(),
    desc: "Credit from " + fromBank.name + (note ? " — " + note : ""),
    amount: amt, type: "in", status: "completed", category: "Transfer"
  });

  addNotification(fromKey, "💸 Transfer Sent", "$" + amt.toFixed(2) + " sent to " + toBank.name);
  addNotification(toKey, "💰 Credit Alert", "$" + amt.toFixed(2) + " received from " + fromBank.name);

  saveState();
  updateBalanceDisplay();
  renderRecent();
  renderFull();
  renderNotifications();
  document.getElementById("interbankAmount").value = "";
  document.getElementById("interbankNote").value = "";
  showToast("$" + amt.toFixed(2) + " sent to " + toBank.name);
}

function doWire() {
  if (checkFrozen()) return;
  var method = document.getElementById("wireMethod").value;
  var recipient = document.getElementById("wireRecipient").value.trim();
  var amt = parseFloat(document.getElementById("wireAmount").value);

  if (!recipient) { showToast("Enter recipient"); return; }
  if (isNaN(amt) || amt <= 0) { showToast("Enter a valid amount"); return; }

  var desc = method + " to " + recipient;
  if (processOutgoing(amt, desc, null)) {
    document.getElementById("wireRecipient").value = "";
    document.getElementById("wireAmount").value = "";
    showToast("$" + amt.toFixed(2) + " sent via " + method);
  }
}

function processOutgoing(amt, desc, clearFieldId) {
  var newBalance = balances[currentBank] - amt;
  var minAllowed = -overdraftLimits[currentBank];

  if (newBalance < minAllowed) {
    showToast("❌ Exceeds overdraft limit of -$" + overdraftLimits[currentBank].toLocaleString());
    return false;
  }

  var dateStr = todayStr();

  if (newBalance < 0 && balances[currentBank] >= 0 && !overdraftFeesCharged[currentBank]) {
    balances[currentBank] = newBalance - OVERDRAFT_FEE;
    overdraftFeesCharged[currentBank] = true;

    transactionsByBank[currentBank].unshift({
      date: dateStr, desc: desc, amount: amt,
      type: "out", status: "completed", category: "Transfer"
    });
    transactionsByBank[currentBank].unshift({
      date: dateStr, desc: "Overdraft Fee", amount: OVERDRAFT_FEE,
      type: "out", status: "completed", category: "Bills"
    });

    addNotification(currentBank, "⚠️ Overdraft Used", "$" + OVERDRAFT_FEE + " fee applied");

    saveState();
    updateBalanceDisplay();
    renderRecent();
    renderFull();
    renderNotifications();
    if (clearFieldId) document.getElementById(clearFieldId).value = "";
    showToast("⚠️ Overdraft! $" + OVERDRAFT_FEE + " fee applied");
    return true;
  }

  balances[currentBank] = newBalance;
  transactionsByBank[currentBank].unshift({
    date: dateStr, desc: desc, amount: amt,
    type: "out", status: "completed", category: "Transfer"
  });

  addNotification(currentBank, "Transaction Alert", "$" + amt.toFixed(2) + " — " + desc);

  saveState();
  updateBalanceDisplay();
  renderRecent();
  renderFull();
  renderNotifications();
  if (clearFieldId) document.getElementById(clearFieldId).value = "";
  return true;
}

function saveOverdraft() {
  var amt = parseFloat(document.getElementById("overdraftInput").value);
  if (isNaN(amt) || amt < 0) { showToast("Enter a valid limit"); return; }
  overdraftLimits[currentBank] = amt;
  overdraftFeesCharged[currentBank] = false;
  saveState();
  showToast("Overdraft limit set to $" + amt.toLocaleString());
}

function freezeAccount() {
  localStorage.setItem("frozen_" + currentBank, "true");
  localStorage.setItem("frozenUntil_" + currentBank, Date.now() + (3 * 60 * 1000));
  document.body.classList.add("frozen");
  var banner = document.getElementById("frozenBanner");
  if (banner) banner.classList.add("show");
  var fb = document.getElementById("freezeBtn");
  var ub = document.getElementById("unfreezeBtn");
  if (fb) fb.style.display = "none";
  if (ub) ub.style.display = "none";
  startFreezeTimer();
  showToast("❄️ Account frozen for 3 minutes");
}

function unfreezeAccount() {
  localStorage.removeItem("frozen_" + currentBank);
  localStorage.removeItem("frozenUntil_" + currentBank);
  document.body.classList.remove("frozen");
  var banner = document.getElementById("frozenBanner");
  if (banner) banner.classList.remove("show");
  var fb = document.getElementById("freezeBtn");
  var ub = document.getElementById("unfreezeBtn");
  if (fb) fb.style.display = "block";
  if (ub) ub.style.display = "none";
  showToast("🔓 Account unfrozen");
}

function startFreezeTimer() {
  var timerId = "freezeTimer_" + currentBank;
  if (window[timerId]) clearInterval(window[timerId]);

  window[timerId] = setInterval(function() {
    var until = parseInt(localStorage.getItem("frozenUntil_" + currentBank));
    if (!until) { clearInterval(window[timerId]); return; }
    var r = until - Date.now();
    if (r <= 0) {
      clearInterval(window[timerId]);
      var banner = document.getElementById("frozenBanner");
      if (banner) banner.classList.remove("show");
      var ub = document.getElementById("unfreezeBtn");
      if (ub) ub.style.display = "block";
      showToast("✅ You can now unfreeze");
      return;
    }
    var m = Math.floor(r / 60000);
    var s = Math.floor((r % 60000) / 1000);
    var el = document.getElementById("freezeTimer");
    if (el) el.textContent = m + ":" + (s < 10 ? "0" : "") + s;
  }, 1000);
}

function updateFreezeUI() {
  var frozen = localStorage.getItem("frozen_" + currentBank) === "true";
  var until = parseInt(localStorage.getItem("frozenUntil_" + currentBank));
  var banner = document.getElementById("frozenBanner");
  var fb = document.getElementById("freezeBtn");
  var ub = document.getElementById("unfreezeBtn");

  if (frozen && until && Date.now() < until) {
    document.body.classList.add("frozen");
    if (banner) banner.classList.add("show");
    if (fb) fb.style.display = "none";
    if (ub) ub.style.display = "none";
    startFreezeTimer();
  } else if (frozen && until && Date.now() >= until) {
    document.body.classList.add("frozen");
    if (banner) banner.classList.remove("show");
    if (fb) fb.style.display = "none";
    if (ub) ub.style.display = "block";
  } else {
    document.body.classList.remove("frozen");
    if (banner) banner.classList.remove("show");
    if (fb) fb.style.display = "block";
    if (ub) ub.style.display = "none";
  }
}

function resetApp() {
  if (!confirm("Reset all demo data?")) return;
  localStorage.removeItem("banksState");
  localStorage.removeItem("frozen_apex");
  localStorage.removeItem("frozen_cyber");
  localStorage.removeItem("frozenUntil_apex");
  localStorage.removeItem("frozenUntil_cyber");
  localStorage.removeItem("activeLoan_apex");
  localStorage.removeItem("activeLoan_cyber");
  localStorage.removeItem("loanHistory_apex");
  localStorage.removeItem("loanHistory_cyber");

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
  updateBalanceDisplay();
  renderRecent();
  renderFull();
  renderNotifications();
  updateFreezeUI();
  showToast("Demo reset");
}