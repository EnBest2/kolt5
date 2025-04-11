// Alap kategóriák (built-in)
const defaultCategories = [
  { value: "bevétel", label: "💰 Bevétel" },
  { value: "kiadás", label: "🛒 Kiadás" },
  { value: "megtakarítás", label: "🏦 Megtakarítás" }
];

// Egyéni kategóriák tárolása
let customCategories = JSON.parse(localStorage.getItem("customCategories")) || [];

// Tranzakciók tárolása; minden tranzakció tartalmazza:
// description, amount, category, year, month
let transactions = JSON.parse(localStorage.getItem("transactions")) || [];

// Aktuális idő: év és hónap
let currentDate = new Date();
let currentYear = currentDate.getFullYear();
let currentMonth = currentDate.getMonth(); // 0-index: 0 = január

// Magyar hónap nevek
const monthNames = [
  "Január", "Február", "Március", "Április", "Május", "Június",
  "Július", "Augusztus", "Szeptember", "Október", "November", "December"
];

// Segédfüggvény az adatok mentéséhez
function saveData() {
  localStorage.setItem("transactions", JSON.stringify(transactions));
  localStorage.setItem("customCategories", JSON.stringify(customCategories));
}

// Frissíti a kategória listát a <select> elemben
function updateCategoryList() {
  const categorySelect = document.getElementById("category");
  categorySelect.innerHTML = "";
  // Beépített kategóriák
  defaultCategories.forEach(cat => {
    const option = document.createElement("option");
    option.value = cat.value;
    option.textContent = cat.label;
    categorySelect.appendChild(option);
  });
  // Egyéni kategóriák (ikon: 📌)
  customCategories.forEach(cat => {
    const option = document.createElement("option");
    option.value = cat;
    option.textContent = `📌 ${cat}`;
    categorySelect.appendChild(option);
  });
}

// Új egyéni kategória hozzáadása
function addCategory() {
  const newCatInput = document.getElementById("newCategory").value.trim();
  if (newCatInput === "") return;
  // Ellenőrzés: nem szerepel-e már a beépített vagy egyéni listában
  const existsDefault = defaultCategories.some(cat => cat.value === newCatInput.toLowerCase());
  const existsCustom = customCategories.includes(newCatInput);
  if (existsDefault || existsCustom) return;
  // Hozzáadás, elmentés, majd a lista frissítése
  customCategories.push(newCatInput);
  saveData();
  updateCategoryList();
  document.getElementById("newCategory").value = "";
}

// Ha az adott kategória az egyéni kategóriák között szerepel, tekintjük kiadásnak.
// Emellett a beépített "kiadás" kategória is kiadás.
function isExpense(category) {
  return category === "kiadás" || customCategories.includes(category);
}

// Új tranzakció hozzáadása
function addTransaction() {
  const description = document.getElementById("description").value.trim();
  const amountInput = document.getElementById("amount").value.trim();
  const amount = parseFloat(amountInput);
  const category = document.getElementById("category").value;

  if (!description || isNaN(amount)) return;

  // Tranzakció objektum: tartalmazza a jelenlegi év és hónap értékeit is
  const transaction = {
    description,
    amount,
    category,
    year: currentYear,
    month: currentMonth
  };
  transactions.push(transaction);
  saveData();
  updateUI();

  // Űrlap mezők ürítése
  document.getElementById("description").value = "";
  document.getElementById("amount").value = "";
}

// Frissíti az UI-t: tranzakció lista, összegzés és aktuális hónap kijelzése
function updateUI() {
  const list = document.getElementById("transactions");
  list.innerHTML = "";
  let total = 0;
  // Csak az aktuális év és hónap tranzakciói
  const monthlyTransactions = transactions.filter(t => t.year === currentYear && t.month === currentMonth);
  monthlyTransactions.forEach(t => {
    const li = document.createElement("li");
    let displayAmount = t.amount;
    if (isExpense(t.category)) {
      // Kiadásként jelenítjük meg negatív értékként és levonjuk az összegből
      displayAmount = -t.amount;
      total -= t.amount;
    } else {
      total += t.amount;
    }
    li.textContent = `${t.description} – ${displayAmount} Ft (${t.category})`;
    list.appendChild(li);
  });

  document.getElementById("total").textContent = total;
  document.getElementById("currentMonth").textContent = `Aktuális hónap: ${monthNames[currentMonth]} ${currentYear}`;
  updateChart();
}

// Lapozás az előző hónapra
function previousMonth() {
  if (currentMonth === 0) {
    currentMonth = 11;
    currentYear--;
  } else {
    currentMonth--;
  }
  updateUI();
}

// Lapozás a következő hónapra
function nextMonth() {
  if (currentMonth === 11) {
    currentMonth = 0;
    currentYear++;
  } else {
    currentMonth++;
  }
  updateUI();
}

// Frissíti a grafikont, mely a költési szokásokat jeleníti meg
function updateChart() {
  const canvas = document.getElementById("chart");
  const ctx = canvas.getContext("2d");
  // A canvas méretének beállítása – mobilon ajánlott dinamikusan méretezni
  canvas.width = Math.min(400, window.innerWidth - 40);
  canvas.height = canvas.width; // Négyzet alakú diagram
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Szűrés: csak az aktuális év és hónap tranzakciói, majd a kiadások
  const monthlyTransactions = transactions.filter(t => t.year === currentYear && t.month === currentMonth);
  const spendingTransactions = monthlyTransactions.filter(t => isExpense(t.category));

  // Összegzés kategóriánként
  let totals = {};
  spendingTransactions.forEach(t => {
    if (totals[t.category]) {
      totals[t.category] += t.amount;
    } else {
      totals[t.category] = t.amount;
    }
  });

  // A teljes kiadás összege
  let totalExpense = 0;
  for (let cat in totals) {
    totalExpense += totals[cat];
  }

  if (totalExpense === 0) {
    ctx.font = "16px Arial";
    ctx.fillStyle = "#333";
    ctx.textAlign = "center";
    ctx.fillText("Nincs elég adat a grafikonhoz", canvas.width / 2, canvas.height / 2);
    return;
  }

  // Kördiagram rajzolása
  let startAngle = 0;
  const colors = ["#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", "#9966FF", "#FF9F40", "#66FF66", "#FF6666"];
  let colorIndex = 0;
  for (let cat in totals) {
    let sliceAngle = (2 * Math.PI * totals[cat]) / totalExpense;
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, canvas.height / 2);
    ctx.arc(canvas.width / 2, canvas.height / 2,
            Math.min(canvas.width / 2, canvas.height / 2) - 20,
            startAngle, startAngle + sliceAngle);
    ctx.closePath();
    ctx.fillStyle = colors[colorIndex % colors.length];
    ctx.fill();

    // Felirat a szeletek közepére
    let midAngle = startAngle + sliceAngle / 2;
    let labelX = canvas.width / 2 + (Math.min(canvas.width, canvas.height) / 4) * Math.cos(midAngle);
    let labelY = canvas.height / 2 + (Math.min(canvas.width, canvas.height) / 4) * Math.sin(midAngle);
    ctx.fillStyle = "#000";
    ctx.font = "14px Arial";
    ctx.textAlign = "center";
    ctx.fillText(cat, labelX, labelY);

    startAngle += sliceAngle;
    colorIndex++;
  }
}

// Sötét mód váltása gombbal
document.getElementById("toggleMode").addEventListener("click", function () {
  document.body.classList.toggle("dark-mode");
});

// Inicializálás: kategória lista feltöltése és UI frissítése
updateCategoryList();
updateUI();
