// ===== BANKS — LOANS =====

function getLoanRate(amount) {
  for (var i = 0; i < loanTiers.length; i++) {
    if (amount >= loanTiers[i].min && amount <= loanTiers[i].max) {
      return loanTiers[i].rate;
    }
  }
  return 0.18;
}

function requestLoan() {
  if (checkFrozen()) return;

  var existing = getActiveLoan();
  if (existing) {
    showToast("❌ You already have an active loan. Repay it first.");
    return;
  }

  var amt = parseFloat(document.getElementById("loanAmount").value);
  var purpose = document.getElementById("loanPurpose").value;

  if (isNaN(amt) || amt < 100 || amt > 100000) {
    showToast("Loan must be between $100 and $100,000");
    return;
  }

  var rate = getLoanRate(amt);
  var total = amt + (amt * rate);

  var loan = {
    amount: amt,
    rate: rate,
    total: total,
    purpose: purpose,
    status: "pending",
    date: todayStr(),
    disbursedAt: null
  };

  localStorage.setItem("activeLoan_" + currentBank, JSON.stringify(loan));
  localStorage.setItem("loanStart_" + currentBank, Date.now());

  addNotification(currentBank, "💰 Loan Requested",
    "$" + amt.toLocaleString() + " — processing. Money arrives in ~3 minutes.");

  transactionsByBank[currentBank].unshift({
    date: todayStr(),
    desc: "Loan Request — " + purpose,
    amount: amt,
    type: "in",
    status: "pending",
    category: "Loan"
  });

  saveState();
  updateBalanceDisplay();
  renderRecent();
  renderFull();
  renderNotifications();
  updateLoanDisplay();

  document.getElementById("loanAmount").value = "";
  showToast("✅ Loan request submitted — funds in ~3 min");

  scheduleDisbursement();
}

function scheduleDisbursement() {
  var loan = getActiveLoan();
  if (!loan || loan.status !== "pending") return;

  var timerId = "loanTimer_" + currentBank;
  if (window[timerId]) clearInterval(window[timerId]);

  var checkKey = "loanStart_" + currentBank;
  var startTime = parseInt(localStorage.getItem(checkKey));
  if (!startTime) {
    startTime = Date.now();
    localStorage.setItem(checkKey, startTime);
  }

  window[timerId] = setInterval(function() {
    var l = getActiveLoan();
    if (!l || l.status !== "pending") {
      clearInterval(window[timerId]);
      return;
    }
    var s = parseInt(localStorage.getItem(checkKey));
    if (Date.now() - s >= LOAN_DELAY_MS) {
      clearInterval(window[timerId]);
      localStorage.removeItem(checkKey);
      disburseLoan();
    }
  }, 1000);
}

function disburseLoan() {
  var loan = getActiveLoan();
  if (!loan || loan.status !== "pending") return;

  loan.status = "active";
  loan.disbursedAt = todayStr();
  localStorage.setItem("activeLoan_" + currentBank, JSON.stringify(loan));

  balances[currentBank] = balances[currentBank] + loan.amount;

  var txs = transactionsByBank[currentBank];
  for (var i = 0; i < txs.length; i++) {
    if (txs[i].status === "pending" && txs[i].category === "Loan") {
      txs[i].status = "completed";
      txs[i].desc = "Loan Disbursed — " + loan.purpose;
      break;
    }
  }

  var history = getLoanHistory();
  history.push({
    amount: loan.amount,
    rate: loan.rate,
    total: loan.total,
    purpose: loan.purpose,
    status: "active",
    date: loan.date,
    disbursedAt: loan.disbursedAt
  });
  localStorage.setItem("loanHistory_" + currentBank, JSON.stringify(history));

  addNotification(currentBank, "✅ Loan Disbursed",
    "$" + loan.amount.toLocaleString() + " added to your balance");

  saveState();
  updateBalanceDisplay();
  renderRecent();
  renderFull();
  renderNotifications();
  updateLoanDisplay();
  if (typeof renderLoanHistory === "function") renderLoanHistory();

  showToast("✅ Loan of $" + loan.amount.toLocaleString() + " disbursed");
}

function repayLoan() {
  if (checkFrozen()) return;

  var loan = getActiveLoan();
  if (!loan) { showToast("No active loan"); return; }
  if (loan.status !== "active") { showToast("Loan is still processing"); return; }

  var total = loan.total;

  if (balances[currentBank] < total) {
    showToast("❌ Insufficient funds. Need $" + total.toLocaleString());
    return;
  }

  if (!confirm("Repay $" + total.toLocaleString() + "? Includes $" +
    (total - loan.amount).toLocaleString() + " interest.")) return;

  balances[currentBank] = balances[currentBank] - total;

  transactionsByBank[currentBank].unshift({
    date: todayStr(),
    desc: "Loan Repayment — " + loan.purpose,
    amount: total,
    type: "out",
    status: "completed",
    category: "Loan"
  });

  var history = getLoanHistory();
  for (var i = history.length - 1; i >= 0; i--) {
    if (history[i].status === "active") {
      history[i].status = "repaid";
      break;
    }
  }
  localStorage.setItem("loanHistory_" + currentBank, JSON.stringify(history));

  localStorage.removeItem("activeLoan_" + currentBank);

  addNotification(currentBank, "✅ Loan Repaid",
    "$" + total.toLocaleString() + " repaid. You can borrow again.");

  saveState();
  updateBalanceDisplay();
  renderRecent();
  renderFull();
  renderNotifications();
  updateLoanDisplay();
  if (typeof renderLoanHistory === "function") renderLoanHistory();

  showToast("✅ Loan repaid: $" + total.toLocaleString());
}

function checkPendingLoan() {
  var loan = getActiveLoan();
  if (loan && loan.status === "pending") {
    scheduleDisbursement();
  }
  updateLoanDisplay();
  if (typeof renderLoanHistory === "function") renderLoanHistory();
}