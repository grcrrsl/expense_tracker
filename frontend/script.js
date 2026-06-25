/* ============================================================
   EXPENSE TRACKER — APP LOGIC (Full-Stack + Auth Version)
   All API calls now include the JWT token in the headers.
   If the token is missing or expired, user is redirected to login.
   ============================================================ */

const API_BASE = "https://expense-tracker-9p2m.onrender.com/api";

/* ----------------------------------------------------------
   AUTH HELPERS — token stored in sessionStorage
   ---------------------------------------------------------- */
function getToken() {
  return sessionStorage.getItem("token");
}

function getUser() {
  try {
    return JSON.parse(sessionStorage.getItem("user"));
  } catch {
    return null;
  }
}

// If not logged in, send to login page
function requireAuth() {
  if (!getToken()) {
    window.location.href = "auth.html";
  }
}

// Attach token to every fetch request
function authHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${getToken()}`,
  };
}

// Handle 401 responses globally (expired token etc.)
function handleAuthError(res) {
  if (res.status === 401) {
    sessionStorage.clear();
    window.location.href = "auth.html";
    return true;
  }
  return false;
}

/* ----------------------------------------------------------
   CATEGORY DATA
   ---------------------------------------------------------- */
const CATEGORIES = {
  Food: { icon: "fa-solid fa-utensils", color: "#F59E0B", type: "expense" },
  Transportation: {
    icon: "fa-solid fa-car",
    color: "#3B82F6",
    type: "expense",
  },
  Shopping: {
    icon: "fa-solid fa-bag-shopping",
    color: "#EC4899",
    type: "expense",
  },
  Entertainment: {
    icon: "fa-solid fa-film",
    color: "#8B5CF6",
    type: "expense",
  },
  Bills: {
    icon: "fa-solid fa-file-invoice-dollar",
    color: "#EF4444",
    type: "expense",
  },
  Health: {
    icon: "fa-solid fa-heart-pulse",
    color: "#10B981",
    type: "expense",
  },
  Education: {
    icon: "fa-solid fa-graduation-cap",
    color: "#06B6D4",
    type: "expense",
  },
  Salary: {
    icon: "fa-solid fa-money-bill-wave",
    color: "#22C55E",
    type: "income",
  },
  Freelance: {
    icon: "fa-solid fa-laptop-code",
    color: "#22C55E",
    type: "income",
  },
  Investment: {
    icon: "fa-solid fa-chart-line",
    color: "#22C55E",
    type: "income",
  },
  Others: { icon: "fa-solid fa-folder", color: "#94A3B8", type: "expense" },
};

/* ----------------------------------------------------------
   STATE
   ---------------------------------------------------------- */
let transactions = [];
let currentType = "income";
let monthlyBudget = 0;
let currentTheme = "dark";
let editingId = null;
let pendingDeleteId = null;
let pieChart, barChart, lineChart;

/* ----------------------------------------------------------
   DOM REFS
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
   INIT
   ============================================================ */
async function init() {
  requireAuth(); // redirect to auth.html if not logged in

  // Show logged-in user's name in the navbar
  const user = getUser();
  if (user) {
    document.getElementById("userDisplayName").textContent = user.username;
    document.getElementById("userAvatar").textContent = user.username
      .charAt(0)
      .toUpperCase();
  }

  // Logout button
  document.getElementById("logoutBtn").addEventListener("click", () => {
    sessionStorage.clear();
    window.location.href = "auth.html";
  });

  populateCategoryDropdowns();
  setDefaultDate();
  bindEvents();
  await loadSettingsFromAPI();
  await loadTransactionsFromAPI();
  renderAll();
}

/* ----------------------------------------------------------
   CATEGORY DROPDOWNS
   ---------------------------------------------------------- */
function populateCategoryDropdowns() {
  categorySelect.innerHTML = "";
  Object.keys(CATEGORIES).forEach((cat) => {
    const opt = document.createElement("option");
    opt.value = cat;
    opt.textContent = cat;
    categorySelect.appendChild(opt);
  });
  filterCategoryByType(currentType);

  Object.keys(CATEGORIES).forEach((cat) => {
    const opt = document.createElement("option");
    opt.value = cat;
    opt.textContent = cat;
    filterCategory.appendChild(opt);
  });
}

function filterCategoryByType(type) {
  Array.from(categorySelect.options).forEach((opt) => {
    opt.hidden = CATEGORIES[opt.value].type !== type;
  });
  const first = Array.from(categorySelect.options).find((o) => !o.hidden);
  if (first) categorySelect.value = first.value;
}

function setDefaultDate() {
  dateInput.value = new Date().toISOString().split("T")[0];
}

/* ----------------------------------------------------------
   EVENTS
   ---------------------------------------------------------- */
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
  document
    .getElementById("confirmCancel")
    .addEventListener("click", closeConfirmModal);
  document.getElementById("confirmOk").addEventListener("click", confirmDelete);
  document
    .getElementById("setBudgetBtn")
    .addEventListener("click", openBudgetModal);
  document
    .getElementById("budgetCancel")
    .addEventListener("click", closeBudgetModal);
  document.getElementById("budgetSave").addEventListener("click", saveBudget);
  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      searchInput.focus();
    }
    if (e.key === "Escape") {
      closeConfirmModal();
      closeBudgetModal();
    }
  });
}

/* ============================================================
   API FUNCTIONS — all include Authorization header
   ============================================================ */

async function loadSettingsFromAPI() {
  try {
    const res = await fetch(`${API_BASE}/settings`, { headers: authHeaders() });
    if (handleAuthError(res)) return;
    const data = await res.json();
    monthlyBudget = data.budget || 0;
    currentTheme = data.theme || "dark";
    applyTheme(currentTheme);
  } catch (err) {
    console.error("loadSettings error:", err);
  }
}

async function saveSettingsToAPI(updates) {
  try {
    await fetch(`${API_BASE}/settings`, {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify(updates),
    });
  } catch (err) {
    console.error("saveSettings error:", err);
  }
}

async function loadTransactionsFromAPI() {
  try {
    const res = await fetch(`${API_BASE}/transactions`, {
      headers: authHeaders(),
    });
    if (handleAuthError(res)) return;
    transactions = await res.json();
  } catch (err) {
    console.error("loadTransactions error:", err);
    transactions = [];
  }
}

async function postTransactionToAPI(tx) {
  const res = await fetch(`${API_BASE}/transactions`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(tx),
  });
  if (handleAuthError(res)) throw new Error("Unauthorized");
  if (!res.ok) {
    const e = await res.json();
    throw new Error(e.error || "Failed to add transaction");
  }
  return await res.json();
}

async function putTransactionToAPI(id, tx) {
  const res = await fetch(`${API_BASE}/transactions/${id}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(tx),
  });
  if (handleAuthError(res)) throw new Error("Unauthorized");
  if (!res.ok) {
    const e = await res.json();
    throw new Error(e.error || "Failed to update transaction");
  }
  return await res.json();
}

async function deleteTransactionFromAPI(id) {
  const res = await fetch(`${API_BASE}/transactions/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (handleAuthError(res)) throw new Error("Unauthorized");
  if (!res.ok) throw new Error("Failed to delete transaction");
}

/* ============================================================
   FORM SUBMIT
   ============================================================ */
async function handleFormSubmit(e) {
  e.preventDefault();
  const name = nameInput.value.trim();
  const amount = parseFloat(amountInput.value);
  const category = categorySelect.value;
  const date = dateInput.value;

  let hasError = false;
  [nameInput, amountInput, dateInput].forEach((el) =>
    el.classList.remove("input-error"),
  );
  if (!name) {
    nameInput.classList.add("input-error");
    hasError = true;
  }
  if (!amount || amount <= 0 || isNaN(amount)) {
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

  submitBtn.disabled = true;
  try {
    if (editingId) {
      const updated = await putTransactionToAPI(editingId, {
        name,
        amount: Math.abs(amount),
        category,
        date,
        type: currentType,
      });
      const idx = transactions.findIndex((t) => t.id == editingId);
      if (idx !== -1) transactions[idx] = updated;
      showToast("Transaction updated successfully!", "success");
      editingId = null;
      submitBtn.querySelector("span").textContent = "Add Transaction";
    } else {
      const newTx = await postTransactionToAPI({
        name,
        amount: Math.abs(amount),
        category,
        date,
        type: currentType,
      });
      transactions.push(newTx);
      showToast("Transaction added successfully!", "success");
    }
    form.reset();
    setDefaultDate();
    filterCategoryByType(currentType);
    renderAll();
  } catch (err) {
    showToast(err.message || "Something went wrong.", "error");
  } finally {
    submitBtn.disabled = false;
  }
}

function editTransaction(id) {
  const tx = transactions.find((t) => t.id == id);
  if (!tx) return;
  nameInput.value = tx.name;
  amountInput.value = tx.amount;
  dateInput.value = tx.date;
  currentType = tx.type;
  document
    .querySelectorAll(".type-btn")
    .forEach((b) => b.classList.toggle("active", b.dataset.type === tx.type));
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

async function confirmDelete() {
  if (pendingDeleteId) {
    try {
      await deleteTransactionFromAPI(pendingDeleteId);
      transactions = transactions.filter((t) => t.id != pendingDeleteId);
      renderAll();
      showToast("Transaction deleted.", "success");
    } catch (err) {
      showToast("Failed to delete transaction.", "error");
    }
  }
  closeConfirmModal();
}

function closeConfirmModal() {
  pendingDeleteId = null;
  document.getElementById("confirmModal").classList.remove("active");
}

/* ============================================================
   CALCULATIONS
   ============================================================ */
const calcTotalIncome = () =>
  transactions
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + t.amount, 0);
const calcTotalExpenses = () =>
  transactions
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + t.amount, 0);
const calcBalance = () => calcTotalIncome() - calcTotalExpenses();
const calcSavingsPct = () => {
  const i = calcTotalIncome();
  return i === 0 ? 0 : Math.max(0, Math.round((calcBalance() / i) * 100));
};

/* ============================================================
   RENDER
   ============================================================ */
function updateBalance() {
  animateCounter("totalBalance", calcBalance(), true);
  animateCounter("totalIncome", calcTotalIncome(), true);
  animateCounter("totalExpenses", calcTotalExpenses(), true);
  document.getElementById("totalSavings").textContent = `${calcSavingsPct()}%`;
}

function animateCounter(elId, target, isCurrency) {
  const el = document.getElementById(elId);
  const start = parseFloat(el.dataset.target) || 0;
  const startTime = performance.now();
  function step(now) {
    const p = Math.min((now - startTime) / 600, 1);
    const v = start + (target - start) * p;
    el.textContent = isCurrency ? formatCurrency(v) : Math.round(v);
    if (p < 1) requestAnimationFrame(step);
    else el.dataset.target = target;
  }
  requestAnimationFrame(step);
}

function formatCurrency(v) {
  return (
    "₱" +
    v.toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

function filterTransactions() {
  let list = [...transactions];
  if (filterType.value !== "all")
    list = list.filter((t) => t.type === filterType.value);
  if (filterCategory.value !== "all")
    list = list.filter((t) => t.category === filterCategory.value);
  return list;
}

function searchTransaction(list) {
  const q = searchInput.value.trim().toLowerCase();
  return q
    ? list.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q),
      )
    : list;
}

function sortTransactions(list) {
  const s = [...list];
  switch (sortBySelect.value) {
    case "newest":
      s.sort((a, b) => new Date(b.date) - new Date(a.date));
      break;
    case "oldest":
      s.sort((a, b) => new Date(a.date) - new Date(b.date));
      break;
    case "highest":
      s.sort((a, b) => b.amount - a.amount);
      break;
    case "lowest":
      s.sort((a, b) => a.amount - b.amount);
      break;
  }
  return s;
}

function renderTransactions() {
  let list = sortTransactions(searchTransaction(filterTransactions()));
  transactionList.innerHTML = "";
  emptyState.style.display = list.length === 0 ? "block" : "none";
  list.forEach((tx, i) =>
    transactionList.appendChild(createTransactionCard(tx, i)),
  );
}

function createTransactionCard(tx, index) {
  const cat = CATEGORIES[tx.category] || CATEGORIES.Others;
  const card = document.createElement("div");
  card.className = "transaction-card";
  card.style.animationDelay = `${index * 0.03}s`;
  card.innerHTML = `
    <div class="tx-icon" style="background:${cat.color}26;color:${cat.color}"><i class="${cat.icon}"></i></div>
    <div class="tx-info">
      <div class="tx-name">${escapeHTML(tx.name)}</div>
      <div class="tx-meta"><span>${tx.category}</span><span class="dot"></span><span>${formatDate(tx.date)}</span></div>
    </div>
    <div class="tx-amount ${tx.type}">${tx.type === "income" ? "+" : "-"}${formatCurrency(tx.amount)}</div>
    <div class="tx-actions">
      <button class="tx-btn edit" title="Edit">✎</button>
      <button class="tx-btn delete" title="Delete">🗑</button>
    </div>`;
  card
    .querySelector(".edit")
    .addEventListener("click", () => editTransaction(tx.id));
  card
    .querySelector(".delete")
    .addEventListener("click", () => deleteTransaction(tx.id));
  return card;
}

function escapeHTML(str) {
  const d = document.createElement("div");
  d.textContent = str;
  return d.innerHTML;
}
function formatDate(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function renderStatistics() {
  const expenses = transactions.filter((t) => t.type === "expense");
  if (expenses.length) {
    const h = expenses.reduce(
      (m, t) => (t.amount > m.amount ? t : m),
      expenses[0],
    );
    document.getElementById("highestExpense").textContent =
      `${h.name} (${formatCurrency(h.amount)})`;
  } else {
    document.getElementById("highestExpense").textContent = "—";
  }

  if (transactions.length) {
    const counts = {};
    transactions.forEach(
      (t) => (counts[t.category] = (counts[t.category] || 0) + 1),
    );
    const top = Object.keys(counts).reduce((a, b) =>
      counts[a] > counts[b] ? a : b,
    );
    document.getElementById("mostUsedCategory").innerHTML =
      `<i class="${CATEGORIES[top].icon}"></i> ${top}`;
  } else {
    document.getElementById("mostUsedCategory").textContent = "—";
  }

  const now = new Date();
  const month = transactions.filter((t) => {
    const d = new Date(t.date + "T00:00:00");
    return (
      d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    );
  });
  const net = month.reduce(
    (s, t) => s + (t.type === "income" ? t.amount : -t.amount),
    0,
  );
  document.getElementById("monthlySummary").textContent = month.length
    ? `${net >= 0 ? "+" : ""}${formatCurrency(net)}`
    : "—";
}

function openBudgetModal() {
  document.getElementById("budgetInput").value = monthlyBudget || "";
  document.getElementById("budgetModal").classList.add("active");
}
function closeBudgetModal() {
  document.getElementById("budgetModal").classList.remove("active");
}

async function saveBudget() {
  const val = parseFloat(document.getElementById("budgetInput").value);
  if (!val || val <= 0) {
    showToast("Please enter a valid budget amount.", "error");
    return;
  }
  monthlyBudget = val;
  await saveSettingsToAPI({ budget: val });
  closeBudgetModal();
  renderBudget();
  showToast("Budget goal saved!", "success");
}

function renderBudget() {
  const now = new Date();
  const spent = transactions
    .filter((t) => t.type === "expense")
    .filter((t) => {
      const d = new Date(t.date + "T00:00:00");
      return (
        d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
      );
    })
    .reduce((s, t) => s + t.amount, 0);
  const fill = document.getElementById("budgetProgressFill");
  if (monthlyBudget > 0) {
    fill.style.width = `${Math.min(100, (spent / monthlyBudget) * 100)}%`;
    fill.classList.toggle("over", spent > monthlyBudget);
    document.getElementById("budgetSubtext").textContent =
      spent > monthlyBudget
        ? "You've exceeded your monthly budget!"
        : "Track your spending against your monthly goal.";
  } else {
    fill.style.width = "0%";
    document.getElementById("budgetSubtext").textContent =
      "Set a budget to track your spending limit.";
  }
  document.getElementById("budgetSpentLabel").textContent =
    `Spent ${formatCurrency(spent)}`;
  document.getElementById("budgetGoalLabel").textContent =
    `of ${formatCurrency(monthlyBudget)}`;
}

/* ============================================================
   CHARTS
   ============================================================ */
function getTextColor() {
  return (
    getComputedStyle(document.body)
      .getPropertyValue("--text-secondary")
      .trim() || "#CBD5E1"
  );
}

function updateCharts() {
  const c = getTextColor();
  updatePieChart(c);
  updateBarChart(c);
  updateLineChart(c);
}

function updatePieChart(tc) {
  const byCat = {};
  transactions
    .filter((t) => t.type === "expense")
    .forEach((t) => {
      byCat[t.category] = (byCat[t.category] || 0) + t.amount;
    });
  const labels = Object.keys(byCat),
    data = Object.values(byCat),
    colors = labels.map((l) => CATEGORIES[l]?.color || "#94A3B8");
  if (pieChart) pieChart.destroy();
  pieChart = new Chart(document.getElementById("pieChart"), {
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
          labels: { color: tc, boxWidth: 10, font: { size: 10 } },
        },
      },
      cutout: "62%",
    },
  });
}

function updateBarChart(tc) {
  const m = {};
  transactions
    .filter((t) => t.type === "expense")
    .forEach((t) => {
      const d = new Date(t.date + "T00:00:00");
      const k = d.toLocaleDateString("en-US", {
        month: "short",
        year: "2-digit",
      });
      m[k] = (m[k] || 0) + t.amount;
    });
  const labels = Object.keys(m),
    data = Object.values(m);
  if (barChart) barChart.destroy();
  barChart = new Chart(document.getElementById("barChart"), {
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
          ticks: { color: tc, font: { size: 10 } },
          grid: { display: false },
        },
        y: {
          ticks: { color: tc, font: { size: 10 } },
          grid: { color: "rgba(255,255,255,0.06)" },
        },
      },
    },
  });
}

function updateLineChart(tc) {
  const byDate = {};
  transactions.forEach((t) => {
    if (!byDate[t.date]) byDate[t.date] = { income: 0, expense: 0 };
    byDate[t.date][t.type] += t.amount;
  });
  const dates = Object.keys(byDate).sort((a, b) => new Date(a) - new Date(b));
  if (lineChart) lineChart.destroy();
  lineChart = new Chart(document.getElementById("lineChart"), {
    type: "line",
    data: {
      labels: dates.length ? dates.map(formatDate) : ["No data"],
      datasets: [
        {
          label: "Income",
          data: dates.length ? dates.map((d) => byDate[d].income) : [0],
          borderColor: "#22C55E",
          backgroundColor: "rgba(34,197,94,0.12)",
          fill: true,
          tension: 0.35,
          pointRadius: 3,
        },
        {
          label: "Expenses",
          data: dates.length ? dates.map((d) => byDate[d].expense) : [0],
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
          labels: { color: tc, font: { size: 10 } },
        },
      },
      scales: {
        x: {
          ticks: { color: tc, font: { size: 9 } },
          grid: { display: false },
        },
        y: {
          ticks: { color: tc, font: { size: 10 } },
          grid: { color: "rgba(255,255,255,0.06)" },
        },
      },
    },
  });
}

/* ============================================================
   THEME
   ============================================================ */
async function toggleTheme() {
  document.body.classList.toggle("light");
  const isLight = document.body.classList.contains("light");
  currentTheme = isLight ? "light" : "dark";
  document.getElementById("themeIcon").textContent = isLight ? "☀️" : "🌙";
  await saveSettingsToAPI({ theme: currentTheme });
  updateCharts();
}

function applyTheme(theme) {
  if (theme === "light") {
    document.body.classList.add("light");
    document.getElementById("themeIcon").textContent = "☀️";
  } else {
    document.body.classList.remove("light");
    document.getElementById("themeIcon").textContent = "🌙";
  }
}

/* ============================================================
   TOAST
   ============================================================ */
function showToast(message, type = "success") {
  const t = document.createElement("div");
  t.className = `toast ${type}`;
  t.textContent = message;
  document.getElementById("toastContainer").appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

/* ============================================================
   CSV / PDF
   ============================================================ */
function exportToCSV() {
  if (!transactions.length) {
    showToast("No transactions to export.", "error");
    return;
  }
  const rows = transactions
    .map(
      (t) =>
        `${csvE(t.name)},${t.amount},${csvE(t.category)},${t.type},${t.date}`,
    )
    .join("\n");
  const blob = new Blob(["Name,Amount,Category,Type,Date\n" + rows], {
    type: "text/csv",
  });
  const a = Object.assign(document.createElement("a"), {
    href: URL.createObjectURL(blob),
    download: "expense_tracker.csv",
  });
  a.click();
  URL.revokeObjectURL(a.href);
  showToast("Exported to CSV!", "success");
}
function csvE(s) {
  return s.includes(",") ? `"${s}"` : s;
}

async function importFromCSV(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async (ev) => {
    const lines = ev.target.result.split("\n").filter((l) => l.trim());
    const rows = lines[0].toLowerCase().startsWith("name")
      ? lines.slice(1)
      : lines;
    let count = 0;
    for (const line of rows) {
      const [name, amount, category, type, date] = line.split(",");
      if (!name || !amount || !date) continue;
      try {
        const tx = await postTransactionToAPI({
          name: name.trim(),
          amount: Math.abs(parseFloat(amount)),
          category: CATEGORIES[category?.trim()] ? category.trim() : "Others",
          type: type?.trim() === "income" ? "income" : "expense",
          date: date.trim(),
        });
        transactions.push(tx);
        count++;
      } catch {}
    }
    renderAll();
    showToast(`Imported ${count} transaction(s)!`, "success");
  };
  reader.readAsText(file);
  e.target.value = "";
}

function exportToPDF() {
  const w = window.open("", "_blank");
  const rows = transactions
    .map(
      (t) =>
        `<tr><td>${escapeHTML(t.name)}</td><td>${t.category}</td><td>${t.type}</td><td>${formatDate(t.date)}</td><td style="text-align:right">${formatCurrency(t.amount)}</td></tr>`,
    )
    .join("");
  w.document.write(
    `<html><head><title>Expense Report</title><style>body{font-family:Arial,sans-serif;padding:40px;color:#111}.s{display:flex;gap:24px;margin:20px 0}.s div{background:#f1f5f9;padding:14px 18px;border-radius:10px}table{width:100%;border-collapse:collapse;margin-top:20px}th,td{padding:8px 10px;border-bottom:1px solid #e2e8f0;font-size:13px;text-align:left}th{background:#f8fafc}</style></head><body><h1>Expense Tracker — Report</h1><p>Generated ${new Date().toLocaleDateString()}</p><div class="s"><div><strong>Income</strong><br>${formatCurrency(calcTotalIncome())}</div><div><strong>Expenses</strong><br>${formatCurrency(calcTotalExpenses())}</div><div><strong>Balance</strong><br>${formatCurrency(calcBalance())}</div></div><table><thead><tr><th>Name</th><th>Category</th><th>Type</th><th>Date</th><th>Amount</th></tr></thead><tbody>${rows}</tbody></table></body></html>`,
  );
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 400);
}

/* ============================================================
   RENDER ALL
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
