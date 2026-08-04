import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  collection, query, where, onSnapshot,
  addDoc, updateDoc, deleteDoc, doc, getDocs
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ---------- Estado ----------
let currentUser = null;
let currentDate = new Date();
currentDate.setDate(1);
let unsubscribe = null;

const MESES = [
  "enero","febrero","marzo","abril","mayo","junio",
  "julio","agosto","septiembre","octubre","noviembre","diciembre"
];

const MEDIOS_PAGO = {
  caja_ahorro: "Caja de ahorro",
  tarjeta_credito: "Tarjeta de crédito",
  efectivo: "Efectivo",
  otro: "Otro"
};

function monthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

// ---------- Elementos ----------
const monthLabel = document.getElementById("month-label");
const userEmailEl = document.getElementById("user-email");
const ledgerIngresos = document.getElementById("ledger-ingresos");
const ledgerGastos = document.getElementById("ledger-gastos");
const totalIngresosEl = document.getElementById("total-ingresos");
const totalGastosEl = document.getElementById("total-gastos");
const balanceEl = document.getElementById("balance");
const pendingNote = document.getElementById("pending-note");
const chartSheet = document.getElementById("chart-sheet");
const chartCanvas = document.getElementById("gastos-chart");
let gastosChart = null;

const alertBanner = document.getElementById("alert-banner");
const vencimientosSheet = document.getElementById("vencimientos-sheet");
const vencimientosList = document.getElementById("vencimientos-list");
const comparacionCanvas = document.getElementById("comparacion-chart");
let comparacionChart = null;

const PALETA_GRAFICO = [
  "#1c3a5e", "#2f7d5e", "#b3462c", "#c78a1f", "#4a6483",
  "#7a5ea8", "#3a8fa0", "#a85a7a", "#6b8f3a", "#8a6a3a"
];

const modalBackdrop = document.getElementById("modal-backdrop");
const modalTitle = document.getElementById("modal-title");
const movementForm = document.getElementById("movement-form");
const movTipoInput = document.getElementById("mov-tipo");
const movCategoriaInput = document.getElementById("mov-categoria");
const movMontoInput = document.getElementById("mov-monto");
const movVencimientoField = document.getElementById("mov-vencimiento-field");
const movVencimientoInput = document.getElementById("mov-vencimiento");
const movEstadoField = document.getElementById("mov-estado-field");
const movEstadoInput = document.getElementById("mov-estado");
const movMedioField = document.getElementById("mov-medio-field");
const movMedioInput = document.getElementById("mov-medio");
const movFijoField = document.getElementById("mov-fijo-field");
const movFijoInput = document.getElementById("mov-fijo");

// ---------- Auth ----------
onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }
  currentUser = user;
  userEmailEl.textContent = user.email;
  cargarMes();
  cargarComparacion();
});

document.getElementById("logout-btn").addEventListener("click", () => {
  signOut(auth);
});

// ---------- Navegación de mes ----------
document.getElementById("prev-month").addEventListener("click", () => {
  currentDate.setMonth(currentDate.getMonth() - 1);
  cargarMes();
});

document.getElementById("next-month").addEventListener("click", () => {
  currentDate.setMonth(currentDate.getMonth() + 1);
  cargarMes();
});

function actualizarLabelMes() {
  monthLabel.textContent = `${MESES[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
}

// ---------- Carga de movimientos (tiempo real) ----------
function cargarMes() {
  actualizarLabelMes();
  if (unsubscribe) unsubscribe();

  const q = query(
    collection(db, "movimientos"),
    where("uid", "==", currentUser.uid),
    where("mes", "==", monthKey(currentDate))
  );

  unsubscribe = onSnapshot(q, (snapshot) => {
    const movimientos = [];
    snapshot.forEach((d) => movimientos.push({ id: d.id, ...d.data() }));
    renderizar(movimientos);
  });
}

function renderizar(movimientos) {
  const ingresos = movimientos.filter((m) => m.tipo === "ingreso");
  const gastos = movimientos.filter((m) => m.tipo === "gasto");

  renderLedger(ledgerIngresos, ingresos, "No cargaste ingresos este mes todavía.");
  renderLedger(ledgerGastos, gastos, "No cargaste gastos este mes todavía.");

  const totalIngresos = ingresos.reduce((s, m) => s + Number(m.monto), 0);
  const totalGastos = gastos.reduce((s, m) => s + Number(m.monto), 0);
  const pendientes = gastos.filter((m) => m.estado === "pendiente");
  const totalPendiente = pendientes.reduce((s, m) => s + Number(m.monto), 0);

  totalIngresosEl.textContent = formatoMoneda(totalIngresos);
  totalGastosEl.textContent = formatoMoneda(totalGastos);
  balanceEl.textContent = formatoMoneda(totalIngresos - totalGastos);

  pendingNote.innerHTML = pendientes.length
    ? `Te faltan pagar <strong>${pendientes.length}</strong> ítem(s) por un total de <strong>${formatoMoneda(totalPendiente)}</strong>`
    : "";

  renderChart(gastos);
  renderVencimientos(gastos);
  cargarComparacion();
}

function renderChart(gastos) {
  const conMonto = gastos.filter((g) => g.monto > 0);

  if (!conMonto.length) {
    chartSheet.style.display = "none";
    if (gastosChart) { gastosChart.destroy(); gastosChart = null; }
    return;
  }

  chartSheet.style.display = "block";

  const porCategoria = {};
  conMonto.forEach((g) => {
    porCategoria[g.categoria] = (porCategoria[g.categoria] || 0) + Number(g.monto);
  });

  const labels = Object.keys(porCategoria);
  const data = Object.values(porCategoria);
  const colores = labels.map((_, i) => PALETA_GRAFICO[i % PALETA_GRAFICO.length]);

  if (gastosChart) {
    gastosChart.data.labels = labels;
    gastosChart.data.datasets[0].data = data;
    gastosChart.data.datasets[0].backgroundColor = colores;
    gastosChart.update();
    return;
  }

  gastosChart = new Chart(chartCanvas, {
    type: "doughnut",
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: colores,
        borderColor: "#ffffff",
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            font: { family: "IBM Plex Sans", size: 11 },
            color: "#1c3a5e",
            padding: 12,
            boxWidth: 12
          }
        },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const valor = ctx.raw;
              const total = data.reduce((a, b) => a + b, 0);
              const pct = ((valor / total) * 100).toFixed(0);
              return ` ${ctx.label}: ${formatoMoneda(valor)} (${pct}%)`;
            }
          }
        }
      }
    }
  });
}

function renderLedger(container, items, emptyText) {
  if (!items.length) {
    container.innerHTML = `<div class="empty-state">${emptyText}</div>`;
    return;
  }
  container.innerHTML = "";
  items.forEach((m) => {
    const row = document.createElement("div");
    row.className = "ledger-row";

    const catDiv = document.createElement("div");
    catDiv.className = "cat";
    catDiv.textContent = m.categoria;
    if (m.esFijo) {
      const badge = document.createElement("span");
      badge.className = "fijo-badge";
      badge.textContent = "Fijo";
      badge.style.marginLeft = "8px";
      catDiv.appendChild(badge);
    }
    if (m.medioPago && MEDIOS_PAGO[m.medioPago]) {
      const medioSpan = document.createElement("span");
      medioSpan.className = "medio-badge";
      medioSpan.textContent = MEDIOS_PAGO[m.medioPago];
      catDiv.appendChild(medioSpan);
    }
    if (m.vencimiento) {
      const dueSpan = document.createElement("span");
      dueSpan.className = "due";
      dueSpan.textContent = "Vence " + formatoFechaCorta(m.vencimiento);
      catDiv.appendChild(dueSpan);
    }

    const amountDiv = document.createElement("div");
    amountDiv.className = "amount";
    amountDiv.textContent = m.monto ? formatoMoneda(m.monto) : "— completar";
    amountDiv.title = "Tocar para editar el monto";
    amountDiv.style.cursor = "pointer";
    if (!m.monto) amountDiv.style.color = "var(--accent-amber)";
    amountDiv.addEventListener("click", () => editarMonto(m));

    row.appendChild(catDiv);
    row.appendChild(amountDiv);

    if (m.tipo === "gasto") {
      const statusBtn = document.createElement("button");
      statusBtn.className = "status-tag " + m.estado;
      statusBtn.textContent = m.estado === "pagado" ? "Pagado" : "Pendiente";
      statusBtn.title = "Tocar para cambiar estado";
      statusBtn.addEventListener("click", () => toggleEstado(m));
      row.appendChild(statusBtn);
    }

    const delBtn = document.createElement("button");
    delBtn.className = "del-btn";
    delBtn.innerHTML = "&times;";
    delBtn.title = "Eliminar";
    delBtn.addEventListener("click", () => eliminarMovimiento(m.id));
    row.appendChild(delBtn);

    container.appendChild(row);
  });
}

function formatoMoneda(valor) {
  return Number(valor).toLocaleString("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0
  });
}

function formatoFechaCorta(isoDate) {
  const [y, m, d] = isoDate.split("-");
  return `${d}/${m}`;
}

function diasHasta(isoDate) {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const [y, m, d] = isoDate.split("-").map(Number);
  const fecha = new Date(y, m - 1, d);
  return Math.round((fecha - hoy) / 86400000);
}

// ---------- Próximos vencimientos + alerta ----------
function renderVencimientos(gastos) {
  const pendientesConFecha = gastos
    .filter((g) => g.estado === "pendiente" && g.vencimiento)
    .map((g) => ({ ...g, dias: diasHasta(g.vencimiento) }))
    .sort((a, b) => a.dias - b.dias);

  if (!pendientesConFecha.length) {
    vencimientosSheet.style.display = "none";
    alertBanner.style.display = "none";
    return;
  }

  vencimientosSheet.style.display = "block";
  vencimientosList.innerHTML = "";

  pendientesConFecha.forEach((g) => {
    const row = document.createElement("div");
    row.className = "venc-row";

    const cat = document.createElement("div");
    cat.className = "venc-cat";
    cat.textContent = g.categoria;

    const monto = document.createElement("div");
    monto.className = "venc-monto";
    monto.textContent = g.monto ? formatoMoneda(g.monto) : "— sin monto";

    const tag = document.createElement("div");
    let tipoTag, texto;
    if (g.dias < 0) { tipoTag = "vencido"; texto = `Vencido hace ${Math.abs(g.dias)}d`; }
    else if (g.dias === 0) { tipoTag = "hoy"; texto = "Vence hoy"; }
    else if (g.dias <= 5) { tipoTag = "pronto"; texto = `Vence en ${g.dias}d`; }
    else { tipoTag = "normal"; texto = formatoFechaCorta(g.vencimiento); }
    tag.className = "venc-tag " + tipoTag;
    tag.textContent = texto;

    row.appendChild(cat);
    row.appendChild(monto);
    row.appendChild(tag);
    vencimientosList.appendChild(row);
  });

  const urgentes = pendientesConFecha.filter((g) => g.dias <= 3);
  if (urgentes.length) {
    const totalUrgente = urgentes.reduce((s, g) => s + Number(g.monto || 0), 0);
    alertBanner.textContent = `⚠️ Tenés ${urgentes.length} vencimiento(s) vencido(s) o próximo(s) por ${formatoMoneda(totalUrgente)}`;
    alertBanner.style.display = "block";
  } else {
    alertBanner.style.display = "none";
  }
}

// ---------- Comparación mensual ----------
async function cargarComparacion() {
  const meses = [];
  const cursor = new Date();
  cursor.setDate(1);
  for (let i = 5; i >= 0; i--) {
    const d = new Date(cursor);
    d.setMonth(d.getMonth() - i);
    meses.push(d);
  }
  const claves = meses.map(monthKey);

  const q = query(
    collection(db, "movimientos"),
    where("uid", "==", currentUser.uid),
    where("mes", "in", claves)
  );

  const snapshot = await getDocs(q);
  const totales = {};
  claves.forEach((c) => (totales[c] = { ingreso: 0, gasto: 0 }));

  snapshot.forEach((d) => {
    const data = d.data();
    if (totales[data.mes]) {
      totales[data.mes][data.tipo === "ingreso" ? "ingreso" : "gasto"] += Number(data.monto || 0);
    }
  });

  const labels = meses.map((d) => `${MESES[d.getMonth()].slice(0, 3)} '${String(d.getFullYear()).slice(2)}`);
  const dataIngresos = claves.map((c) => totales[c].ingreso);
  const dataGastos = claves.map((c) => totales[c].gasto);

  if (comparacionChart) {
    comparacionChart.data.labels = labels;
    comparacionChart.data.datasets[0].data = dataIngresos;
    comparacionChart.data.datasets[1].data = dataGastos;
    comparacionChart.update();
    return;
  }

  comparacionChart = new Chart(comparacionCanvas, {
    type: "bar",
    data: {
      labels,
      datasets: [
        { label: "Ingresos", data: dataIngresos, backgroundColor: "#2f7d5e", borderRadius: 4 },
        { label: "Gastos", data: dataGastos, backgroundColor: "#b3462c", borderRadius: 4 }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
          labels: { font: { family: "IBM Plex Sans", size: 11 }, color: "#1c3a5e" }
        }
      },
      scales: {
        y: {
          ticks: {
            callback: (v) => v.toLocaleString("es-AR"),
            font: { family: "IBM Plex Mono", size: 10 }
          },
          grid: { color: "#e5e9ed" }
        },
        x: {
          ticks: { font: { family: "IBM Plex Sans", size: 11 } },
          grid: { display: false }
        }
      }
    }
  });
}

// ---------- Editar monto ----------
async function editarMonto(m) {
  const nuevo = prompt(`Monto para "${m.categoria}":`, m.monto || "");
  if (nuevo === null) return;
  const valor = Number(nuevo);
  if (isNaN(valor) || valor < 0) {
    alert("Ingresá un monto válido.");
    return;
  }
  await updateDoc(doc(db, "movimientos", m.id), { monto: valor });
}

// ---------- Cambiar estado pagado/pendiente ----------
async function toggleEstado(m) {
  const nuevoEstado = m.estado === "pagado" ? "pendiente" : "pagado";
  await updateDoc(doc(db, "movimientos", m.id), { estado: nuevoEstado });
}

// ---------- Eliminar ----------
async function eliminarMovimiento(id) {
  if (!confirm("¿Eliminar este movimiento?")) return;
  await deleteDoc(doc(db, "movimientos", id));
}

// ---------- Modal: agregar movimiento ----------
document.querySelectorAll(".add-btn").forEach((btn) => {
  btn.addEventListener("click", () => abrirModal(btn.dataset.tipo));
});

function abrirModal(tipo) {
  movTipoInput.value = tipo;
  modalTitle.textContent = tipo === "ingreso" ? "Nuevo ingreso" : "Nuevo gasto";
  movEstadoField.style.display = tipo === "gasto" ? "block" : "none";
  movVencimientoField.style.display = tipo === "gasto" ? "block" : "none";
  movMedioField.style.display = tipo === "gasto" ? "block" : "none";
  movFijoField.style.display = tipo === "gasto" ? "block" : "none";
  movCategoriaInput.value = "";
  movMontoInput.value = "";
  movVencimientoInput.value = "";
  movEstadoInput.value = "pendiente";
  movMedioInput.value = "caja_ahorro";
  movFijoInput.checked = false;
  modalBackdrop.classList.add("open");
  movCategoriaInput.focus();
}

document.getElementById("modal-cancel").addEventListener("click", () => {
  modalBackdrop.classList.remove("open");
});

modalBackdrop.addEventListener("click", (e) => {
  if (e.target === modalBackdrop) modalBackdrop.classList.remove("open");
});

movementForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const tipo = movTipoInput.value;

  await addDoc(collection(db, "movimientos"), {
    uid: currentUser.uid,
    mes: monthKey(currentDate),
    tipo,
    categoria: movCategoriaInput.value.trim(),
    monto: movMontoInput.value === "" ? 0 : Number(movMontoInput.value),
    vencimiento: (tipo === "gasto" && movVencimientoInput.value) ? movVencimientoInput.value : null,
    estado: tipo === "ingreso" ? "pagado" : movEstadoInput.value,
    medioPago: tipo === "gasto" ? movMedioInput.value : null,
    esFijo: tipo === "gasto" ? movFijoInput.checked : false,
    creado: Date.now()
  });

  modalBackdrop.classList.remove("open");
});

// ---------- Repetir gastos fijos del mes anterior ----------
document.getElementById("repeat-btn").addEventListener("click", async () => {
  const mesAnterior = new Date(currentDate);
  mesAnterior.setMonth(mesAnterior.getMonth() - 1);

  const q = query(
    collection(db, "movimientos"),
    where("uid", "==", currentUser.uid),
    where("mes", "==", monthKey(mesAnterior)),
    where("tipo", "==", "gasto"),
    where("esFijo", "==", true)
  );

  const snapshot = await getDocs(q);
  if (snapshot.empty) {
    alert("No hay gastos fijos cargados en el mes anterior para repetir.");
    return;
  }

  if (!confirm(`Se van a copiar ${snapshot.size} gasto(s) fijo(s) del mes anterior como pendientes. ¿Continuar?`)) return;

  const copias = [];
  snapshot.forEach((d) => {
    const data = d.data();
    let nuevoVencimiento = null;
    if (data.vencimiento) {
      const [y, mo, di] = data.vencimiento.split("-").map(Number);
      const fecha = new Date(y, mo - 1, di);
      fecha.setMonth(fecha.getMonth() + 1);
      nuevoVencimiento = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}-${String(fecha.getDate()).padStart(2, "0")}`;
    }
    copias.push(addDoc(collection(db, "movimientos"), {
      uid: currentUser.uid,
      mes: monthKey(currentDate),
      tipo: "gasto",
      categoria: data.categoria,
      monto: 0,
      vencimiento: nuevoVencimiento,
      estado: "pendiente",
      medioPago: data.medioPago || null,
      esFijo: true,
      creado: Date.now()
    }));
  });

  await Promise.all(copias);
});
