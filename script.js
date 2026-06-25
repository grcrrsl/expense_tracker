/* ============================================================
   EXPENSE TRACKER — APP LOGIC
   Vanilla JS (ES6) — beginner-friendly, well-commented
   ============================================================ */

/* ----------------------------------------------------------
   1. CATEGORY DATA — icon, color, type per category
   ---------------------------------------------------------- */
const CATEGORIES = {
  Food: { icon: "fa-solid fa-utensils", color: "#F59E0B", type: "expense" },
  Transportation: { icon: "fa-solid fa-car", color: "#3B82F6", type: "expense" },
  Shopping: { icon: "fa-solid fa-bag-shopping", color: "#EC4899", type: "expense" },
  Entertainment: { icon: "fa-solid fa-film", color: "#8B5CF6", type: "expense" },
  Bills: { icon: "fa-solid fa-file-invoice-dollar", color: "#EF4444", type: "expense" },
  Health: { icon: "fa-solid fa-heart-pulse", color: "#10B981", type: "expense" },
  Education: { icon: "fa-solid fa-graduation-cap", color: "#06B6D4", type: "expense" },
  Salary: { icon: "fa-solid fa-money-bill-wave", color: "#22C55E", type: "income" },
  Freelance: { icon: "fa-solid fa-laptop-code", color: "#22C55E", type: "income" },
  Investment: { icon: "fa-solid fa-chart-line", color: "#22C55E", type: "income" },
  Others: { icon: "fa-solid fa-folder", color: "#94A3B8", type: "expense" },
};

/* ----------------------------------------------------------
   2. STATE — loaded from Local Storage
   ---------------------------------------------------------- */
let transactions = []; // array of transaction objects
let currentType = "income"; // currently selected form type
let monthlyBudget = 0;
let editingId = null; // id of transaction being edited (null = adding new)
let pendingDeleteId = null; // id queued for delete confirmation

let pieChart, barChart, lineChart;

/* ----------------------------------------------------------
   3. DOM REFERENCES
   ---------------------------------------------------------- */
const form = document.getElementById("transactionForm");
const nameInput = document.getElementById("name");
const amountInput = document.getElementById("amount");
const categorySelect = document.getElementById("category");
const dateInput = document.getElementById("date");
const submitBtn = document.getElementById("submitBtn");
const transactionList = document.getElementById("transactionList");
const emptyState = document.getElementById("emptyState");
const searchInput = document.getElementById("searchInput");
const filterType = document.getElementById("filterType");
const filterCategory = document.getElementById("filterCategory");
const sortBySelect = document.getElementById("sortBy");

/* ============================================================
   4. INITIALIZATION
   ============================================================ */
function init() {
  loadFromLocalStorage();
  populateCategoryDropdowns();
  setDefaultDate();
  bindEvents();
  applyStoredTheme();
  renderAll();
}

function populateCategoryDropdowns() {
  // Main form category select
  categorySelect.innerHTML = "";
  Object.keys(CATEGORIES).forEach((cat) => {
    const opt = document.createElement("option");
    opt.value = cat;
    opt.textContent = cat;
    categorySelect.appendChild(opt);
  });
  filterCategoryByType(currentType);

  // Filter dropdown (all categories)
  Object.keys(CATEGORIES).forEach((cat) => {
    const opt = document.createElement("option");
    opt.value = cat;
    opt.textContent = cat;
    filterCategory.appendChild(opt);
  });
}

// Only show categories relevant to the selected transaction type
function filterCategoryByType(type) {
  Array.from(categorySelect.options).forEach((opt) => {
    const matches = CATEGORIES[opt.value].type === type;
    opt.hidden = !matches;
  });
  const firstVisible = Array.from(categorySelect.options).find(
    (o) => !o.hidden,
  );
  if (firstVisible) categorySelect.value = firstVisible.value;
}

function setDefaultDate() {
  const today = new Date().toISOString().split("T")[0];
  dateInput.value = today;
}

/* ============================================================
   5. EVENT BINDINGS
   ============================================================ */
function bindEvents() {
  form.addEventListener("submit", handleFormSubmit);

  document.querySelectorAll(".type-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document
        .querySelectorAll(".type-btn")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentType = btn.dataset.type;
      filterCategoryByType(currentType);
    });
  });

  searchInput.addEventListener("input", renderTransactions);
  filterType.addEventListener("change", renderTransactions);
  filterCategory.addEventListener("change", renderTransactions);
  sortBySelect.addEventListener("change", renderTransactions);

  document.getElementById("themeToggle").addEventListener("click", toggleTheme);

  document
    .getElementById("exportCsvBtn")
    .addEventListener("click", exportToCSV);
  document
    .getElementById("importCsvInput")
    .addEventListener("change", importFromCSV);
  document
    .getElementById("exportPdfBtn")
    .addEventListener("click", exportToPDF);

  // Confirm delete modal
  document
    .getElementById("confirmCancel")
    .addEventListener("click", closeConfirmModal);
  document.getElementById("confirmOk").addEventListener("click", confirmDelete);

  // Budget modal
  document
    .getElementById("setBudgetBtn")
    .addEventListener("click", openBudgetModal);
  document
    .getElementById("budgetCancel")
    .addEventListener("click", closeBudgetModal);
  document.getElementById("budgetSave").addEventListener("click", saveBudget);

  // Keyboard shortcuts
  document.addEventListener("keydown", handleKeyboardShortcuts);
}

function handleKeyboardShortcuts(e) {
  // Ctrl/Cmd + K -> focus search
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
    e.preventDefault();
    searchInput.focus();
  }
  // Escape -> close modals
  if (e.key === "Escape") {
    closeConfirmModal();
    closeBudgetModal();
  }
}

/* ============================================================
   6. ADD / EDIT TRANSACTION
   ============================================================ */
function handleFormSubmit(e) {
  e.preventDefault();

  const name = nameInput.value.trim();
  const amount = parseFloat(amountInput.value);
  const category = categorySelect.value;
  const date = dateInput.value;

  // --- VALIDATION ---
  let hasError = false;
  [nameInput, amountInput, dateInput].forEach((el) =>
    el.classList.remove("input-error"),
  );

  if (!name) {
    nameInput.classList.add("input-error");
    hasError = true;
  }
  if (!amount || amount === 0 || isNaN(amount)) {
    amountInput.classList.add("input-error");
    hasError = true;
  }
  if (!date) {
    dateInput.classList.add("input-error");
    hasError = true;
  }

  if (hasError) {
    showToast("Please fill in all fields correctly.", "error");
    return;
  }

  if (editingId) {
    // Update existing transaction
    const tx = transactions.find((t) => t.id === editingId);
    if (tx) {
      tx.name = name;
      tx.amount = Math.abs(amount);
      tx.category = category;
      tx.date = date;
      tx.type = currentType;
    }
    showToast("Transaction updated successfully!", "success");
    editingId = null;
    submitBtn.querySelector("span").textContent = "Add Transaction";
  } else {
    addTransaction({
      name,
      amount: Math.abs(amount),
      category,
      date,
      type: currentType,
    });
    showToast("Transaction added successfully!", "success");
  }

  form.reset();
  setDefaultDate();
  filterCategoryByType(currentType);
  saveToLocalStorage();
  renderAll();
}

function addTransaction(tx) {
  tx.id = Date.now().toString() + Math.random().toString(16).slice(2);
  transactions.push(tx);
}

function editTransaction(id) {
  const tx = transactions.find((t) => t.id === id);
  if (!tx) return;

  nameInput.value = tx.name;
  amountInput.value = tx.amount;
  dateInput.value = tx.date;
  currentType = tx.type;

  document.querySelectorAll(".type-btn").forEach((b) => {
    b.classList.toggle("active", b.dataset.type === tx.type);
  });
  filterCategoryByType(tx.type);
  categorySelect.value = tx.category;

  editingId = id;
  submitBtn.querySelector("span").textContent = "Update Transaction";
  window.scrollTo({ top: 0, behavior: "smooth" });
  nameInput.focus();
}

function deleteTransaction(id) {
  pendingDeleteId = id;
  document.getElementById("confirmModal").classList.add("active");
}

function confirmDelete() {
  if (pendingDeleteId) {
    transactions = transactions.filter((t) => t.id !== pendingDeleteId);
    saveToLocalStorage();
    renderAll();
    showToast("Transaction deleted.", "success");
  }
  closeConfirmModal();
}

function closeConfirmModal() {
  pendingDeleteId = null;
  document.getElementById("confirmModal").classList.remove("active");
}

/* ============================================================
   7. CALCULATIONS
   ============================================================ */
function calcTotalIncome() {
  return transactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);
}
function calcTotalExpenses() {
  return transactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);
}
function calcBalance() {
  return calcTotalIncome() - calcTotalExpenses();
}
function calcSavingsPercent() {
  const income = calcTotalIncome();
  if (income === 0) return 0;
  return Math.max(0, Math.round((calcBalance() / income) * 100));
}

/* ============================================================
   8. RENDER — DASHBOARD / BALANCE
   ============================================================ */
function updateBalance() {
  animateCounter("totalBalance", calcBalance(), true);
  animateCounter("totalIncome", calcTotalIncome(), true);
  animateCounter("totalExpenses", calcTotalExpenses(), true);
  document.getElementById("totalSavings").textContent =
    `${calcSavingsPercent()}%`;
}

// Animated counter for summary cards
function animateCounter(elId, target, isCurrency) {
  const el = document.getElementById(elId);
  const start = parseFloat(el.dataset.target) || 0;
  const duration = 600;
  const startTime = performance.now();

  function step(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    const value = start + (target - start) * progress;
    el.textContent = isCurrency ? formatCurrency(value) : Math.round(value);
    if (progress < 1) requestAnimationFrame(step);
    else el.dataset.target = target;
  }
  requestAnimationFrame(step);
}

function formatCurrency(value) {
  return (
    "₱" +
    value.toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

/* ============================================================
   9. RENDER — TRANSACTION LIST (filter, search, sort)
   ============================================================ */
function filterTransactions() {
  let list = [...transactions];

  const typeVal = filterType.value;
  const catVal = filterCategory.value;

  if (typeVal !== "all") list = list.filter((t) => t.type === typeVal);
  if (catVal !== "all") list = list.filter((t) => t.category === catVal);

  return list;
}

function searchTransaction(list) {
  const query = searchInput.value.trim().toLowerCase();
  if (!query) return list;
  return list.filter(
    (t) =>
      t.name.toLowerCase().includes(query) ||
      t.category.toLowerCase().includes(query),
  );
}

function sortTransactions(list) {
  const sorted = [...list];
  switch (sortBySelect.value) {
    case "newest":
      sorted.sort((a, b) => new Date(b.date) - new Date(a.date));
      break;
    case "oldest":
      sorted.sort((a, b) => new Date(a.date) - new Date(b.date));
      break;
    case "highest":
      sorted.sort((a, b) => b.amount - a.amount);
      break;
    case "lowest":
      sorted.sort((a, b) => a.amount - b.amount);
      break;
  }
  return sorted;
}

function renderTransactions() {
  let list = filterTransactions();
  list = searchTransaction(list);
  list = sortTransactions(list);

  transactionList.innerHTML = "";

  if (list.length === 0) {
    emptyState.style.display = "block";
  } else {
    emptyState.style.display = "none";
    list.forEach((tx, index) => {
      transactionList.appendChild(createTransactionCard(tx, index));
    });
  }
}

function createTransactionCard(tx, index) {
  const catData = CATEGORIES[tx.category] || CATEGORIES.Others;
  const card = document.createElement("div");
  card.className = "transaction-card";
  card.style.animationDelay = `${index * 0.03}s`;

  card.innerHTML = `
    <div class="tx-icon" style="background:${catData.color}26; color:${catData.color}"> <i class="${catData.icon}"></i></div>
    <div class="tx-info">
      <div class="tx-name">${escapeHTML(tx.name)}</div>
      <div class="tx-meta">
        <span>${tx.category}</span>
        <span class="dot"></span>
        <span>${formatDate(tx.date)}</span>
      </div>
    </div>
    <div class="tx-amount ${tx.type}">${tx.type === "income" ? "+" : "-"}${formatCurrency(tx.amount)}</div>
    <div class="tx-actions">
      <button class="tx-btn edit" title="Edit" aria-label="Edit transaction">✎</button>
      <button class="tx-btn delete" title="Delete" aria-label="Delete transaction">🗑</button>
    </div>
  `;

  card
    .querySelector(".edit")
    .addEventListener("click", () => editTransaction(tx.id));
  card
    .querySelector(".delete")
    .addEventListener("click", () => deleteTransaction(tx.id));

  return card;
}

function escapeHTML(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function formatDate(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/* ============================================================
   10. STATISTICS
   ============================================================ */
function renderStatistics() {
  const expenses = transactions.filter((t) => t.type === "expense");

  // Highest expense
  if (expenses.length) {
    const highest = expenses.reduce(
      (max, t) => (t.amount > max.amount ? t : max),
      expenses[0],
    );
    document.getElementById("highestExpense").textContent =
      `${highest.name} (${formatCurrency(highest.amount)})`;
  } else {
    document.getElementById("highestExpense").textContent = "—";
  }

  // Most used category
  if (transactions.length) {
    const counts = {};
    transactions.forEach(
      (t) => (counts[t.category] = (counts[t.category] || 0) + 1),
    );
    const mostUsed = Object.keys(counts).reduce((a, b) =>
      counts[a] > counts[b] ? a : b,
    );
   document.getElementById("mostUsedCategory").innerHTML =
     `<i class="${CATEGORIES[mostUsed].icon}"></i> ${mostUsed}`;
  } else {
    document.getElementById("mostUsedCategory").textContent = "—";
  }

  // Monthly summary (current month net)
  const now = new Date();
  const monthTx = transactions.filter((t) => {
    const d = new Date(t.date + "T00:00:00");
    return (
      d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    );
  });
  const monthNet = monthTx.reduce(
    (sum, t) => sum + (t.type === "income" ? t.amount : -t.amount),
    0,
  );
  document.getElementById("monthlySummary").textContent = monthTx.length
    ? `${monthNet >= 0 ? "+" : ""}${formatCurrency(monthNet)}`
    : "—";
}

/* ============================================================
   11. BUDGET GOAL
   ============================================================ */
function openBudgetModal() {
  document.getElementById("budgetInput").value = monthlyBudget || "";
  document.getElementById("budgetModal").classList.add("active");
}
function closeBudgetModal() {
  document.getElementById("budgetModal").classList.remove("active");
}
function saveBudget() {
  const val = parseFloat(document.getElementById("budgetInput").value);
  if (!val || val <= 0) {
    showToast("Please enter a valid budget amount.", "error");
    return;
  }
  monthlyBudget = val;
  localStorage.setItem("expenseTracker_budget", val);
  closeBudgetModal();
  renderBudget();
  showToast("Budget goal saved!", "success");
}

function renderBudget() {
  const now = new Date();
  const monthExpenses = transactions
    .filter((t) => t.type === "expense")
    .filter((t) => {
      const d = new Date(t.date + "T00:00:00");
      return (
        d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
      );
    })
    .reduce((sum, t) => sum + t.amount, 0);

  const fill = document.getElementById("budgetProgressFill");
  const subtext = document.getElementById("budgetSubtext");

  if (monthlyBudget > 0) {
    const pct = Math.min(100, (monthExpenses / monthlyBudget) * 100);
    fill.style.width = `${pct}%`;
    fill.classList.toggle("over", monthExpenses > monthlyBudget);
    subtext.textContent =
      monthExpenses > monthlyBudget
        ? "You've exceeded your monthly budget!"
        : "Track your spending against your monthly goal.";
  } else {
    fill.style.width = "0%";
    subtext.textContent = "Set a budget to track your spending limit.";
  }

  document.getElementById("budgetSpentLabel").textContent =
    `Spent ${formatCurrency(monthExpenses)}`;
  document.getElementById("budgetGoalLabel").textContent =
    `of ${formatCurrency(monthlyBudget)}`;
}

/* ============================================================
   12. CHARTS (Chart.js)
   ============================================================ */
function getChartTextColor() {
  return (
    getComputedStyle(document.body)
      .getPropertyValue("--text-secondary")
      .trim() || "#CBD5E1"
  );
}

function updateCharts() {
  const textColor = getChartTextColor();
  updatePieChart(textColor);
  updateBarChart(textColor);
  updateLineChart(textColor);
}

function updatePieChart(textColor) {
  const expenseByCat = {};
  transactions
    .filter((t) => t.type === "expense")
    .forEach((t) => {
      expenseByCat[t.category] = (expenseByCat[t.category] || 0) + t.amount;
    });

  const labels = Object.keys(expenseByCat);
  const data = Object.values(expenseByCat);
  const colors = labels.map((l) => CATEGORIES[l]?.color || "#94A3B8");

  const ctx = document.getElementById("pieChart");
  if (pieChart) pieChart.destroy();
  pieChart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: labels.length ? labels : ["No data"],
      datasets: [
        {
          data: data.length ? data : [1],
          backgroundColor: data.length ? colors : ["#334155"],
          borderWidth: 0,
          hoverOffset: 8,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
          labels: { color: textColor, boxWidth: 10, font: { size: 10 } },
        },
      },
      cutout: "62%",
    },
  });
}

function updateBarChart(textColor) {
  const monthlyTotals = {};
  transactions
    .filter((t) => t.type === "expense")
    .forEach((t) => {
      const d = new Date(t.date + "T00:00:00");
      const key = d.toLocaleDateString("en-US", {
        month: "short",
        year: "2-digit",
      });
      monthlyTotals[key] = (monthlyTotals[key] || 0) + t.amount;
    });

  const labels = Object.keys(monthlyTotals);
  const data = Object.values(monthlyTotals);

  const ctx = document.getElementById("barChart");
  if (barChart) barChart.destroy();
  barChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels.length ? labels : ["No data"],
      datasets: [
        {
          label: "Expenses",
          data: data.length ? data : [0],
          backgroundColor: "#EF4444",
          borderRadius: 6,
          maxBarThickness: 36,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: {
          ticks: { color: textColor, font: { size: 10 } },
          grid: { display: false },
        },
        y: {
          ticks: { color: textColor, font: { size: 10 } },
          grid: { color: "rgba(255,255,255,0.06)" },
        },
      },
    },
  });
}

function updateLineChart(textColor) {
  const byDate = {};
  transactions.forEach((t) => {
    if (!byDate[t.date]) byDate[t.date] = { income: 0, expense: 0 };
    byDate[t.date][t.type] += t.amount;
  });

  const sortedDates = Object.keys(byDate).sort(
    (a, b) => new Date(a) - new Date(b),
  );
  const incomeData = sortedDates.map((d) => byDate[d].income);
  const expenseData = sortedDates.map((d) => byDate[d].expense);
  const labels = sortedDates.map((d) => formatDate(d));

  const ctx = document.getElementById("lineChart");
  if (lineChart) lineChart.destroy();
  lineChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels.length ? labels : ["No data"],
      datasets: [
        {
          label: "Income",
          data: incomeData.length ? incomeData : [0],
          borderColor: "#22C55E",
          backgroundColor: "rgba(34,197,94,0.12)",
          fill: true,
          tension: 0.35,
          pointRadius: 3,
        },
        {
          label: "Expenses",
          data: expenseData.length ? expenseData : [0],
          borderColor: "#EF4444",
          backgroundColor: "rgba(239,68,68,0.12)",
          fill: true,
          tension: 0.35,
          pointRadius: 3,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
          labels: { color: textColor, font: { size: 10 } },
        },
      },
      scales: {
        x: {
          ticks: { color: textColor, font: { size: 9 } },
          grid: { display: false },
        },
        y: {
          ticks: { color: textColor, font: { size: 10 } },
          grid: { color: "rgba(255,255,255,0.06)" },
        },
      },
    },
  });
}

/* ============================================================
   13. LOCAL STORAGE
   ============================================================ */
function saveToLocalStorage() {
  localStorage.setItem(
    "expenseTracker_transactions",
    JSON.stringify(transactions),
  );
}

function loadFromLocalStorage() {
  const stored = localStorage.getItem("expenseTracker_transactions");
  transactions = stored ? JSON.parse(stored) : [];

  const storedBudget = localStorage.getItem("expenseTracker_budget");
  monthlyBudget = storedBudget ? parseFloat(storedBudget) : 0;
}

/* ============================================================
   14. THEME TOGGLE
   ============================================================ */
function toggleTheme() {
  document.body.classList.toggle("light");
  const isLight = document.body.classList.contains("light");
  localStorage.setItem("expenseTracker_theme", isLight ? "light" : "dark");
  document.getElementById("themeIcon").textContent = isLight ? "☀️" : "🌙";
  updateCharts(); // refresh chart text colors
}

function applyStoredTheme() {
  const theme = localStorage.getItem("expenseTracker_theme");
  if (theme === "light") {
    document.body.classList.add("light");
    document.getElementById("themeIcon").textContent = "☀️";
  }
}

/* ============================================================
   15. TOAST NOTIFICATIONS
   ============================================================ */
function showToast(message, type = "success") {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.getElementById("toastContainer").appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

/* ============================================================
   16. CSV EXPORT / IMPORT
   ============================================================ */
function exportToCSV() {
  if (!transactions.length) {
    showToast("No transactions to export.", "error");
    return;
  }
  const header = "Name,Amount,Category,Type,Date\n";
  const rows = transactions
    .map(
      (t) =>
        `${csvEscape(t.name)},${t.amount},${csvEscape(t.category)},${t.type},${t.date}`,
    )
    .join("\n");
  const blob = new Blob([header + rows], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "expense_tracker_transactions.csv";
  a.click();
  URL.revokeObjectURL(url);
  showToast("Transactions exported to CSV!", "success");
}

function csvEscape(str) {
  if (str.includes(",")) return `"${str}"`;
  return str;
}

function importFromCSV(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const lines = event.target.result.split("\n").filter((l) => l.trim());
      const dataLines = lines[0].toLowerCase().startsWith("name")
        ? lines.slice(1)
        : lines;

      let importedCount = 0;
      dataLines.forEach((line) => {
        const parts = line.split(",");
        if (parts.length < 5) return;
        const [name, amount, category, type, date] = parts;
        if (!name || !amount || !date) return;
        addTransaction({
          name: name.trim(),
          amount: Math.abs(parseFloat(amount)),
          category: CATEGORIES[category.trim()] ? category.trim() : "Others",
          type: type.trim() === "income" ? "income" : "expense",
          date: date.trim(),
        });
        importedCount++;
      });

      saveToLocalStorage();
      renderAll();
      showToast(
        `Imported ${importedCount} transaction(s) successfully!`,
        "success",
      );
    } catch (err) {
      showToast("Failed to import CSV. Please check the file format.", "error");
    }
  };
  reader.readAsText(file);
  e.target.value = "";
}

/* ============================================================
   17. PDF REPORT (simple printable report via browser print)
   ============================================================ */
function exportToPDF() {
  const reportWindow = window.open("", "_blank");
  const income = calcTotalIncome();
  const expense = calcTotalExpenses();
  const balance = calcBalance();

  const rows = transactions
    .map(
      (t) => `<tr>
        <td>${escapeHTML(t.name)}</td>
        <td>${t.category}</td>
        <td>${t.type}</td>
        <td>${formatDate(t.date)}</td>
        <td style="text-align:right">${formatCurrency(t.amount)}</td>
      </tr>`,
    )
    .join("");

  reportWindow.document.write(`
    <html>
    <head>
      <title>Expense Tracker Report</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 40px; color: #111; }
        h1 { margin-bottom: 4px; }
        .summary { display: flex; gap: 24px; margin: 20px 0; }
        .summary div { background: #f1f5f9; padding: 14px 18px; border-radius: 10px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 13px; text-align: left; }
        th { background: #f8fafc; }
      </style>
    </head>
    <body>
      <h1>Expense Tracker — Financial Report</h1>
      <p>Generated on ${new Date().toLocaleDateString()}</p>
      <div class="summary">
        <div><strong>Total Income</strong><br>${formatCurrency(income)}</div>
        <div><strong>Total Expenses</strong><br>${formatCurrency(expense)}</div>
        <div><strong>Balance</strong><br>${formatCurrency(balance)}</div>
      </div>
      <table>
        <thead><tr><th>Name</th><th>Category</th><th>Type</th><th>Date</th><th>Amount</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </body>
    </html>
  `);
  reportWindow.document.close();
  reportWindow.focus();
  setTimeout(() => reportWindow.print(), 400);
}

/* ============================================================
   18. RENDER ALL — master refresh
   ============================================================ */
function renderAll() {
  updateBalance();
  renderTransactions();
  renderStatistics();
  renderBudget();
  updateCharts();
}

/* ============================================================
   START
   ============================================================ */
document.addEventListener("DOMContentLoaded", init);
