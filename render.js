// ===== BANKS — RENDER =====

function getBalance() {
  if (!currentBank || !balances[currentBank]) return 0;
  return balances[currentBank];
}

function getTransactions() {
  if (!currentBank || !transactionsByBank[currentBank]) return [];
  return transactionsByBank[currentBank];
}

function updateBalanceDisplay() {
  var bal = getBalance();
  var f = "$" + bal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  var d1 = document.getElementById("balanceDisplay");
  var d2 = document.getElementById("balanceDisplay2");
  var d3 = document.getElementById("balanceDisplay3");
  if (d1) d1.textContent = f;
  if (d2) d2.textContent = f;
  if (d3) d3.textContent = f;

  var w = document.getElementById("balanceWarning");
  if (w) {
    if (bal < 0) w.classList.add("show");
    else w.classList.remove("show");
  }

  var b = banks[currentBank];
  if (!b) return;

  var ch1 = document.getElementById("cardHolder");
  var ch2 = document.getElementById("cardHolder2");
  var ch3 = document.getElementById("cardHolder3");
  if (ch1) ch1.textContent = b.holder.toUpperCase();
  if (ch2) ch2.textContent = b.holder.toUpperCase();
  if (ch3) ch3.textContent = b.holder.toUpperCase();

  var od = document.getElementById("overdraftInput");
  if (od) od.value = overdraftLimits[currentBank] || 2000;

  var ibFrom = document.getElementById("interbankFrom");
  var ibTo = document.getElementById("interbankTo");
  if (ibFrom) ibFrom.value = b.name + " — " + b.holder;
  if (ibTo) {
    var o = currentBank === "apex" ? "cyber" : "apex";
    ibTo.value = banks[o].name + " — " + banks[o].holder;
  }
}

function txItemHTML(t) {
  var sign = t.type === "in" ? "+" : "-";
  var statusText = t.status === "completed" ? "Completed" : "Pending";
  return '<div class="tx-icon ' + t.type + '">' + (t.type === "in" ? "↓" : "↑") + '</div>' +
    '<div class="tx-info">' +
      '<div class="tx-desc">' + t.desc + '</div>' +
      '<div class="tx-meta">' + t.date + ' <span class="status ' + t.status + '">' + statusText + '</span></div>' +
    '</div>' +
    '<div class="tx-amount ' + t.type + '">' + sign + '$' + t.amount.toFixed(2) + '</div>';
}

function renderRecent() {
  var el = document.getElementById("recentTx");
  if (!el) return;
  el.innerHTML = "";
  var txs = getTransactions();
  if (txs.length === 0) {
    el.innerHTML = '<li style="padding:20px;text-align:center;color:#94a3b8;font-size:13px;">No transactions yet</li>';
    return;
  }
  txs.slice(0, 5).forEach(function(t) {
    var li = document.createElement("li");
    li.className = "tx-item";
    li.innerHTML = txItemHTML(t);
    el.appendChild(li);
  });
}

function renderFull() {
  var el = document.getElementById("fullTx");
  if (!el) return;
  el.innerHTML = "";
  var txs = getTransactions();
  if (txs.length === 0) {
    el.innerHTML = '<p style="padding:20px;text-align:center;color:#94a3b8;font-size:13px;">No transactions yet</p>';
    return;
  }
  var cm = "";
  txs.forEach(function(t) {
    var p = t.date.split(" ");
    var my = p[0] + " " + p[2];
    if (my !== cm) {
      cm = my;
      var d = document.createElement("div");
      d.className = "month-divider";
      d.textContent = my;
      el.appendChild(d);
    }
    var li = document.createElement("li");
    li.className = "tx-item";
    li.innerHTML = txItemHTML(t);
    el.appendChild(li);
  });
}

function updateLoanDisplay() {
  var card = document.getElementById("activeLoanCard");
  var details = document.getElementById("activeLoanDetails");
  if (!card || !details) return;
  var loan = getActiveLoan();
  if (!loan) {
    card.style.display = "none";
    return;
  }
  card.style.display = "block";
  var st = loan.status === "pending" ? "⏳ Processing (~3 min)" : "✅ Active";
  details.innerHTML =
    '<div style="font-size:13px; line-height:1.8; color:#475569;">' +
      '<div><strong>Amount:</strong> $' + loan.amount.toLocaleString() + '</div>' +
      '<div><strong>Interest:</strong> ' + (loan.rate * 100).toFixed(0) + '%</div>' +
      '<div><strong>You repay:</strong> $' + loan.total.toLocaleString() + '</div>' +
      '<div><strong>Status:</strong> ' + st + '</div>' +
    '</div>';
}

function renderLoanHistory() {
  var el = document.getElementById("loanHistoryList");
  if (!el) return;
  el.innerHTML = "";
  var loans = getLoanHistory();
  if (loans.length === 0) {
    el.innerHTML = '<p style="padding:20px;text-align:center;color:#94a3b8;font-size:13px;">No loans yet</p>';
    return;
  }
  loans.slice().reverse().forEach(function(l) {
    var d = document.createElement("div");
    d.style.cssText = "padding:12px 0; border-bottom:1px solid #f1f5f9; font-size:13px;";
    d.innerHTML =
      '<div style="font-weight:600; color:#0f172a;">$' + l.amount.toLocaleString() + ' — ' + l.purpose + '</div>' +
      '<div style="color:#94a3b8; font-size:11.5px; margin-top:3px;">' + l.date + ' · ' + l.status.toUpperCase() + ' · Repay: $' + l.total.toLocaleString() + '</div>';
    el.appendChild(d);
  });
}

function renderNotifications() {
  var el = document.getElementById("notificationsList");
  if (!el) return;
  el.innerHTML = "";
  var notifs = notifications[currentBank] || [];
  if (notifs.length === 0) {
    el.innerHTML = '<p style="padding:20px;text-align:center;color:#94a3b8;font-size:13px;">No notifications</p>';
    return;
  }
  notifs.slice().reverse().forEach(function(n) {
    var d = document.createElement("div");
    d.style.cssText = "padding:12px 0; border-bottom:1px solid #f1f5f9; font-size:13px;";
    d.innerHTML =
      '<div style="font-weight:600; color:#0f172a;">' + n.title + '</div>' +
      '<div style="color:#475569; margin-top:3px;">' + n.body + '</div>' +
      '<div style="color:#94a3b8; font-size:11px; margin-top:5px;">' + n.date + '</div>';
    el.appendChild(d);
  });
}

function todayStr() {
  var now = new Date();
  return now.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
}

function addNotification(bankKey, title, body) {
  if (!notifications[bankKey]) notifications[bankKey] = [];
  notifications[bankKey].push({
    title: title,
    body: body,
    date: todayStr(),
    read: false
  });
  saveState();
}