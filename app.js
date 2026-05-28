const STORAGE_KEY = "tmallWarehouseV4";
const LOW_STOCK_DEFAULT = 10;
const operator = "陈";

const state = readStore() || createDemoState();
let activeInventoryFilter = "all";
let pendingImportType = null;
let editingProductId = null;

function readStore() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY));
  } catch {
    return null;
  }
}

function saveStore() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function uid(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function monthKey(date = today()) {
  return date.slice(0, 7);
}

function money(value) {
  return Number(value || 0).toLocaleString("zh-CN", { style: "currency", currency: "CNY" });
}

function createDemoState() {
  const products = [
    ["短款麂皮绒护肩套｜米白色", "护肩套", "个", 3.2, 23],
    ["腰靠-干邑色", "腰靠", "个", 24.9, 16],
    ["短款麂皮绒护肩套｜墨尔本红", "护肩套", "个", 3.2, 31],
    ["汽车头枕-米白色", "汽车头枕", "个", 23.9, 29],
    ["腰靠-雅黑色", "腰靠", "个", 24.9, 53],
    ["短款麂皮绒护肩套｜爱马仕橙", "护肩套", "个", 3.2, 16],
    ["汽车头枕-干邑色", "汽车头枕", "个", 23.9, 26],
    ["汽车头枕-雅黑色", "汽车头枕", "个", 23.9, 51],
    ["短款麂皮绒护肩套｜雅黑色", "护肩套", "个", 3.2, 28],
    ["长款麂皮绒护肩套｜爱马仕橙", "护肩套", "个", 4.2, 25],
    ["长款麂皮绒护肩套｜雅黑色", "护肩套", "个", 4.2, 30],
    ["汽车头枕-墨尔本红", "汽车头枕", "个", 23.9, 31],
    ["腰靠-浅灰色", "腰靠", "个", 24.9, 17],
    ["腰靠-墨尔本红", "腰靠", "个", 24.9, 5],
    ["汽车头枕-浅灰色", "汽车头枕", "个", 23.9, 19],
    ["长款麂皮绒护肩套｜米白色", "护肩套", "个", 4.2, 33],
    ["长款麂皮绒护肩套｜墨尔本红", "护肩套", "个", 4.2, 38],
    ["腰靠-爱马仕橙", "腰靠", "个", 24.9, 15],
    ["腰靠-米白色", "腰靠", "个", 24.9, 2],
    ["汽车头枕-爱马仕橙", "汽车头枕", "个", 23.9, 30],
  ].map(([name, category, unit, price, stock], index) => ({
    id: uid(`p${index}`),
    code: `SP${String(index + 1).padStart(3, "0")}`,
    name,
    category,
    unit,
    price,
    stock,
    warning: LOW_STOCK_DEFAULT,
    enabled: true,
  }));

  const stockIns = [
    { productId: products[10].id, batch: "000", supplier: "-", quantity: 26, date: "2026-04-17" },
    { productId: products[10].id, batch: "000", supplier: "-", quantity: 26, date: "2026-04-17" },
    { productId: products[10].id, batch: "000", supplier: "-", quantity: 26, date: "2026-04-17" },
    { productId: products[10].id, batch: "000", supplier: "-", quantity: 26, date: "2026-04-17" },
    { productId: products[3].id, batch: "000", supplier: "-", quantity: 30, date: "2026-04-01" },
    { productId: products[3].id, batch: "000", supplier: "-", quantity: 30, date: "2026-04-01" },
  ].map((item) => ({ ...item, id: uid("in"), operator }));

  return {
    products,
    stockIns,
    stockOuts: [],
    costs: [{ id: uid("cost"), type: "代发成本", amount: 27, date: "2026-04-06", operator, note: "汽车坐垫单片代发" }],
  };
}

function byId(id) {
  return state.products.find((product) => product.id === id);
}

function productAmount(product) {
  return product.price * product.stock;
}

function lowProducts() {
  return state.products.filter((product) => product.stock <= product.warning);
}

function recordsInRange(records, start, end) {
  return records.filter((record) => (!start || record.date >= start) && (!end || record.date <= end));
}

function updateText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function setView(view) {
  document.querySelectorAll(".view").forEach((section) => section.classList.toggle("active", section.id === `view-${view}`));
  document.querySelectorAll(".nav-item").forEach((item) => item.classList.toggle("active", item.dataset.view === view));
}

function renderMetrics() {
  const productCount = state.products.length;
  const stockTotal = state.products.reduce((sum, item) => sum + item.stock, 0);
  const inventoryValue = state.products.reduce((sum, item) => sum + productAmount(item), 0);
  const warningCount = lowProducts().length;
  const day = today();
  const currentMonth = monthKey(day);
  const todayIns = state.stockIns.filter((item) => item.date === day);
  const todayOuts = state.stockOuts.filter((item) => item.date === day);
  const monthIns = state.stockIns.filter((item) => monthKey(item.date) === currentMonth);
  const monthOuts = state.stockOuts.filter((item) => monthKey(item.date) === currentMonth);
  const inAmount = (item) => (byId(item.productId)?.price || 0) * item.quantity;
  const outAmount = (item) => (byId(item.productId)?.price || 0) * item.quantity;
  const totalCost = state.costs.reduce((sum, item) => sum + item.amount, 0);

  updateText("updatedAt", new Date().toLocaleString("zh-CN", { hour12: false }));
  ["dashProductCount", "invProductCount"].forEach((id) => updateText(id, productCount));
  ["dashStockTotal", "invStockTotal"].forEach((id) => updateText(id, stockTotal));
  updateText("dashInventoryValue", money(inventoryValue));
  updateText("invAmount", money(inventoryValue));
  ["dashWarningCount", "invWarningCount"].forEach((id) => updateText(id, warningCount));
  updateText("todayInQty", todayIns.reduce((s, i) => s + i.quantity, 0));
  updateText("todayOutQty", todayOuts.reduce((s, i) => s + i.quantity, 0));
  updateText("todayInAmount", money(todayIns.reduce((s, i) => s + inAmount(i), 0)));
  updateText("todayOutAmount", money(todayOuts.reduce((s, i) => s + outAmount(i), 0)));
  updateText("monthInQty", monthIns.reduce((s, i) => s + i.quantity, 0));
  updateText("monthOutQty", monthOuts.reduce((s, i) => s + i.quantity, 0));
  updateText("monthInAmount", money(monthIns.reduce((s, i) => s + inAmount(i), 0)));
  updateText("monthOutAmount", money(monthOuts.reduce((s, i) => s + outAmount(i), 0)));
  updateText("tabAll", productCount);
  updateText("tabLow", warningCount);
  updateText("tabNormal", productCount - warningCount);
  updateText("inRecordCount", state.stockIns.length);
  updateText("inQtyTotal", state.stockIns.reduce((s, i) => s + i.quantity, 0));
  updateText("inAmountTotal", money(state.stockIns.reduce((s, i) => s + inAmount(i), 0)));
  updateText("outRecordCount", state.stockOuts.length);
  updateText("outQtyTotal", state.stockOuts.reduce((s, i) => s + i.quantity, 0));
  updateText("costTotal", money(totalCost));
  updateText("purchaseCost", money(sumCost("采购成本")));
  updateText("expressCost", money(sumCost("快递成本")));
  updateText("agencyCost", money(sumCost("代发成本")));
  updateText("otherCost", money(sumCost("其他成本")));
  updateText("reportInQty", state.stockIns.reduce((s, i) => s + i.quantity, 0));
  updateText("reportOutQty", state.stockOuts.reduce((s, i) => s + i.quantity, 0));
  updateText("reportInAmount", money(state.stockIns.reduce((s, i) => s + inAmount(i), 0)));
  updateText("reportCostTotal", money(totalCost));
}

function sumCost(type) {
  return state.costs.filter((item) => item.type === type).reduce((sum, item) => sum + item.amount, 0);
}

function filteredProducts(inputId = "inventorySearch") {
  const keyword = document.getElementById(inputId).value.trim().toLowerCase();
  return state.products.filter((product) => {
    const matchKeyword = !keyword || [product.name, product.code, product.category].some((value) => value.toLowerCase().includes(keyword));
    const matchFilter = activeInventoryFilter === "all" || (activeInventoryFilter === "low" ? product.stock <= product.warning : product.stock > product.warning);
    return matchKeyword && matchFilter;
  });
}

function renderWarnings() {
  const box = document.getElementById("warningBox");
  const tags = document.getElementById("warningTags");
  const lows = lowProducts();
  box.classList.toggle("hidden", !lows.length);
  tags.innerHTML = lows.map((item) => `<span class="warn-tag">${item.name}（库存: ${item.stock}/${item.warning}）</span>`).join("");
}

function renderInventory() {
  const body = document.getElementById("inventoryBody");
  body.innerHTML = filteredProducts("inventorySearch").map((product) => `
    <tr>
      <td><span class="product-title"><strong>${product.name}</strong><small>${product.code} · 安全库存 ${product.warning}</small></span></td>
      <td><span class="cost-chip">${product.category}</span></td>
      <td>${product.unit}</td>
      <td class="money">${money(product.price)}</td>
      <td><span class="stock-cell"><b>${product.stock}</b><span class="stock-bar"><span style="width:${Math.min(100, product.stock * 2)}%"></span></span></span></td>
      <td class="money">${money(productAmount(product))}</td>
      <td><span class="badge ${product.stock <= product.warning ? "low" : "ok"}">${product.stock <= product.warning ? "需补货" : "库存健康"}</span></td>
      <td><span class="action-row"><button class="link-btn" data-adjust="${product.id}">补货</button><button class="link-btn" data-detail="${product.id}">详情</button></span></td>
    </tr>`).join("");
}

function renderProducts() {
  const keyword = document.getElementById("productSearch").value.trim().toLowerCase();
  const rows = state.products.filter((product) => !keyword || [product.name, product.code, product.category].some((value) => value.toLowerCase().includes(keyword)));
  document.getElementById("productBody").innerHTML = rows.map((product) => `
    <tr>
      <td><span class="product-title"><strong>${product.name}</strong><small>${product.code} · 预警 ${product.warning}</small></span></td><td><span class="cost-chip">${product.category}</span></td><td>${product.unit}</td><td class="money">${money(product.price)}</td>
      <td><span class="badge ${product.stock <= product.warning ? "low" : "ok"}">${product.stock}</span></td><td><span class="badge ok">启用</span></td>
      <td><span class="action-row"><button class="link-btn" data-cost-product="${product.id}">成本</button><button class="link-btn" data-edit-product="${product.id}">编辑</button><button class="delete-btn" data-delete-product="${product.id}">删除</button></span></td>
    </tr>`).join("");
}

function renderStockIns() {
  const keyword = document.getElementById("stockInSearch").value.trim().toLowerCase();
  const start = document.getElementById("stockInStart").value;
  const end = document.getElementById("stockInEnd").value;
  const rows = recordsInRange(state.stockIns, start, end).filter((item) => {
    const product = byId(item.productId);
    return !keyword || item.batch.toLowerCase().includes(keyword) || product?.name.toLowerCase().includes(keyword);
  });
  document.getElementById("stockInBody").innerHTML = rows.map((item) => {
    const product = byId(item.productId);
    return `<tr><td><input type="checkbox" /></td><td>${item.batch || "000"}</td><td>${product?.name || "-"}</td><td>${item.supplier || "-"}</td><td>${item.quantity}</td><td>${money(product?.price || 0)}</td><td>${money((product?.price || 0) * item.quantity)}</td><td>${item.date}</td><td>${item.operator}</td><td><button class="delete-btn" data-delete-in="${item.id}">▢</button></td></tr>`;
  }).join("");
}

function renderStockOuts() {
  const keyword = document.getElementById("stockOutSearch").value.trim().toLowerCase();
  const start = document.getElementById("stockOutStart").value;
  const end = document.getElementById("stockOutEnd").value;
  const rows = recordsInRange(state.stockOuts, start, end).filter((item) => !keyword || byId(item.productId)?.name.toLowerCase().includes(keyword));
  document.getElementById("stockOutBody").innerHTML = rows.length ? rows.map((item) => `<tr><td><input type="checkbox" /></td><td>${item.date}</td><td>${byId(item.productId)?.name || "-"}</td><td>${item.quantity}</td><td>${item.purpose || "销售出库"}</td><td><button class="delete-btn" data-delete-out="${item.id}">▢</button></td></tr>`).join("") : `<tr><td colspan="6" style="text-align:center;color:#64748b;height:86px">暂无数据</td></tr>`;
}

function renderCosts() {
  const type = document.getElementById("costTypeFilter").value;
  const rows = state.costs.filter((item) => type === "all" || item.type === type);
  document.getElementById("costBody").innerHTML = rows.map((item) => `<tr><td><input type="checkbox" /></td><td><span class="cost-chip">${item.type}</span></td><td class="red-text">${money(item.amount)}</td><td>${item.date}</td><td>${item.operator}</td><td>${item.note || "-"}</td><td><button class="delete-btn" data-delete-cost="${item.id}">▢</button></td></tr>`).join("");
}

function renderCharts() {
  renderBarChart("valueTopChart", state.products.slice().sort((a, b) => productAmount(b) - productAmount(a)).slice(0, 5).map((p) => ({ label: p.name, value: productAmount(p) })), money);
  const outGroups = groupOuts();
  renderBarChart("outQtyTopChart", outGroups.slice(0, 5).map((x) => ({ label: x.name, value: x.qty })), (v) => v || "暂无数据");
  renderBarChart("outAmountTopChart", outGroups.slice(0, 5).map((x) => ({ label: x.name, value: x.amount })), money);
  renderReportTopChart();
  drawTrend();
}

function renderBarChart(id, rows, formatter) {
  const root = document.getElementById(id);
  if (!rows.length || rows.every((row) => row.value === 0)) {
    root.className = "empty-chart";
    root.textContent = "暂无数据";
    return;
  }
  root.className = "bar-chart";
  const max = Math.max(...rows.map((row) => row.value), 1);
  root.innerHTML = rows.map((row) => `<div class="bar-row"><span class="bar-label" title="${row.label}">${row.label}</span><span class="bar-track"><span class="bar-fill" style="width:${(row.value / max) * 100}%"></span></span><span class="bar-value">${formatter(row.value)}</span></div>`).join("");
}

function groupRecords(records) {
  const map = new Map();
  records.forEach((item) => {
    const product = byId(item.productId);
    const current = map.get(item.productId) || { name: product?.name || "-", qty: 0, amount: 0 };
    current.qty += item.quantity;
    current.amount += item.quantity * (product?.price || 0);
    map.set(item.productId, current);
  });
  return [...map.values()].sort((a, b) => b.qty - a.qty);
}

function groupOuts() {
  return groupRecords(state.stockOuts);
}

function renderReportTopChart() {
  const root = document.getElementById("reportTopChart");
  const ins = groupRecords(state.stockIns);
  const outs = groupOuts();
  const names = [...new Set([...ins, ...outs].map((item) => item.name))].slice(0, 10);
  if (!names.length) {
    root.className = "empty-frame";
    root.innerHTML = "";
    return;
  }
  const max = Math.max(1, ...names.map((name) => Math.max(ins.find((item) => item.name === name)?.qty || 0, outs.find((item) => item.name === name)?.qty || 0)));
  root.className = "top-frame";
  root.innerHTML = names.map((name) => {
    const inQty = ins.find((item) => item.name === name)?.qty || 0;
    const outQty = outs.find((item) => item.name === name)?.qty || 0;
    return `<div class="top-row"><span title="${name}">${name}</span><b style="width:${(inQty / max) * 100}%"></b><i style="width:${(outQty / max) * 100}%"></i><em>${inQty}/${outQty}</em></div>`;
  }).join("");
}

function drawTrend() {
  const canvas = document.getElementById("trendCanvas");
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "#cbd5e1";
  ctx.setLineDash([3, 3]);
  for (let i = 0; i < 6; i += 1) {
    const y = 20 + i * 40;
    ctx.beginPath(); ctx.moveTo(45, y); ctx.lineTo(canvas.width - 20, y); ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.strokeStyle = "#64748b";
  ctx.beginPath(); ctx.moveTo(45, 220); ctx.lineTo(canvas.width - 20, 220); ctx.stroke();
  ctx.strokeStyle = "#ef4444";
  ctx.beginPath(); ctx.moveTo(45, 220); ctx.lineTo(520, 220); ctx.stroke();
  ctx.fillStyle = "#64748b";
  ctx.font = "14px sans-serif";
  for (let i = 0; i < 31; i += 2) ctx.fillText(`05-${String(i + 1).padStart(2, "0")}`, 45 + i * 42, 242);
  ctx.fillStyle = "#10b981"; ctx.fillText("● 入库", canvas.width / 2 - 40, 258);
  ctx.fillStyle = "#ef4444"; ctx.fillText("● 出库", canvas.width / 2 + 28, 258);
}

function render() {
  saveStore();
  renderMetrics();
  renderWarnings();
  renderInventory();
  renderProducts();
  renderStockIns();
  renderStockOuts();
  renderCosts();
  renderCharts();
}

function exportCsv(filename, headers, rows) {
  const escapeCell = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  const content = [headers, ...rows].map((row) => row.map(escapeCell).join(",")).join("\n");
  const blob = new Blob([`\uFEFF${content}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}-${today()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function openProductDialog(product = null) {
  editingProductId = product?.id || null;
  document.getElementById("productDialogTitle").textContent = product ? "编辑商品" : "添加商品";
  const form = document.getElementById("productForm");
  form.reset();
  form.elements.id.value = product?.id || "";
  form.elements.name.value = product?.name || "";
  form.elements.category.value = product?.category || "";
  form.elements.unit.value = product?.unit || "个";
  form.elements.price.value = product?.price || "";
  form.elements.stock.value = product?.stock || 0;
  form.elements.warning.value = product?.warning ?? LOW_STOCK_DEFAULT;
  document.getElementById("productDialog").showModal();
}

function openMovementDialog(type, productId = "") {
  const form = document.getElementById("movementForm");
  form.reset();
  document.getElementById("movementTitle").textContent = type === "in" ? "添加入库" : "添加出库";
  form.elements.type.value = type;
  form.elements.date.value = today();
  form.elements.productId.innerHTML = state.products.map((product) => `<option value="${product.id}">${product.name}</option>`).join("");
  form.elements.productId.value = productId || state.products[0]?.id || "";
  document.getElementById("batchLabel").style.display = type === "in" ? "grid" : "none";
  document.getElementById("supplierLabel").style.display = type === "in" ? "grid" : "none";
  document.getElementById("movementDialog").showModal();
}

function parseCsv(text) {
  return text.replace(/^\uFEFF/, "").split(/\r?\n/).map((line) => line.split(",").map((cell) => cell.trim())).filter((row) => row.length > 1 && row.some(Boolean));
}

function showProductDetail(productId) {
  const product = byId(productId);
  if (!product) return;
  const inbound = state.stockIns.filter((item) => item.productId === productId).reduce((sum, item) => sum + item.quantity, 0);
  const outbound = state.stockOuts.filter((item) => item.productId === productId).reduce((sum, item) => sum + item.quantity, 0);
  alert(`商品详情

名称：${product.name}
编码：${product.code}
分类：${product.category}
单价：${money(product.price)}
当前库存：${product.stock}${product.unit}
安全库存：${product.warning}${product.unit}
库存金额：${money(productAmount(product))}
累计入库：${inbound}${product.unit}
累计出库：${outbound}${product.unit}`);
}

function openCostDialogForProduct(productId) {
  const product = byId(productId);
  const form = document.getElementById("costForm");
  form.reset();
  form.elements.type.value = "采购成本";
  form.elements.amount.value = product ? product.price : "";
  form.elements.date.value = today();
  form.elements.note.value = product ? `${product.name} 成本登记` : "";
  document.getElementById("costDialog").showModal();
}

document.querySelectorAll(".nav-item").forEach((item) => item.addEventListener("click", () => setView(item.dataset.view)));
document.querySelectorAll("[data-close]").forEach((button) => button.addEventListener("click", () => button.closest("dialog").close()));
document.querySelectorAll("#inventorySearch,#productSearch,#stockInSearch,#stockInStart,#stockInEnd,#stockOutSearch,#stockOutStart,#stockOutEnd,#costTypeFilter").forEach((el) => el.addEventListener("input", render));
document.querySelectorAll(".tabs .tab[data-filter]").forEach((tab) => tab.addEventListener("click", () => { activeInventoryFilter = tab.dataset.filter; document.querySelectorAll(".tabs .tab[data-filter]").forEach((x) => x.classList.toggle("active", x === tab)); renderInventory(); }));

document.getElementById("addProductBtn").addEventListener("click", () => openProductDialog());
document.getElementById("addStockInBtn").addEventListener("click", () => openMovementDialog("in"));
document.getElementById("addStockOutBtn").addEventListener("click", () => openMovementDialog("out"));
document.getElementById("addCostBtn").addEventListener("click", () => { document.getElementById("costForm").reset(); document.getElementById("costForm").elements.date.value = today(); document.getElementById("costDialog").showModal(); });

document.getElementById("productForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const product = { id: editingProductId || uid("p"), code: byId(editingProductId)?.code || `SP${String(state.products.length + 1).padStart(3, "0")}`, name: form.elements.name.value.trim(), category: form.elements.category.value.trim(), unit: form.elements.unit.value.trim(), price: Number(form.elements.price.value), stock: Number.parseInt(form.elements.stock.value, 10), warning: Number.parseInt(form.elements.warning.value, 10), enabled: true };
  if (editingProductId) state.products = state.products.map((item) => item.id === editingProductId ? product : item); else state.products.push(product);
  document.getElementById("productDialog").close();
  render();
});

document.getElementById("movementForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const product = byId(form.elements.productId.value);
  const quantity = Number.parseInt(form.elements.quantity.value, 10);
  if (!product || quantity <= 0) return;
  if (form.elements.type.value === "out" && quantity > product.stock) return alert("出库数量不能超过当前库存。");
  if (form.elements.type.value === "in") {
    product.stock += quantity;
    state.stockIns.unshift({ id: uid("in"), productId: product.id, batch: form.elements.batch.value || "000", supplier: form.elements.supplier.value || "-", quantity, date: form.elements.date.value, operator, purpose: form.elements.purpose.value });
  } else {
    product.stock -= quantity;
    state.stockOuts.unshift({ id: uid("out"), productId: product.id, quantity, date: form.elements.date.value, operator, purpose: form.elements.purpose.value || "销售出库" });
  }
  document.getElementById("movementDialog").close();
  render();
});

document.getElementById("costForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  state.costs.unshift({ id: uid("cost"), type: form.elements.type.value, amount: Number(form.elements.amount.value), date: form.elements.date.value, operator, note: form.elements.note.value });
  document.getElementById("costDialog").close();
  render();
});

document.body.addEventListener("click", (event) => {
  const target = event.target;
  const editProduct = target.dataset.editProduct;
  const deleteProduct = target.dataset.deleteProduct;
  const adjust = target.dataset.adjust;
  const detail = target.dataset.detail;
  const costProduct = target.dataset.costProduct;
  if (editProduct) openProductDialog(byId(editProduct));
  if (adjust) openMovementDialog("in", adjust);
  if (detail) showProductDetail(detail);
  if (costProduct) openCostDialogForProduct(costProduct);
  if (deleteProduct && confirm("确定删除该商品吗？")) { state.products = state.products.filter((item) => item.id !== deleteProduct); render(); }
  if (target.dataset.deleteIn) { state.stockIns = state.stockIns.filter((item) => item.id !== target.dataset.deleteIn); render(); }
  if (target.dataset.deleteOut) { state.stockOuts = state.stockOuts.filter((item) => item.id !== target.dataset.deleteOut); render(); }
  if (target.dataset.deleteCost) { state.costs = state.costs.filter((item) => item.id !== target.dataset.deleteCost); render(); }
});

[
  ["exportInventoryBtn", "库存查询", ["商品名称", "分类", "单位", "单价", "当前库存", "库存金额"], () => state.products.map((p) => [p.name, p.category, p.unit, p.price, p.stock, productAmount(p)])],
  ["exportProductsBtn", "商品管理", ["商品名称", "分类", "单位", "单价", "当前库存"], () => state.products.map((p) => [p.name, p.category, p.unit, p.price, p.stock])],
  ["exportStockInBtn", "入库登记", ["批次号", "商品", "数量", "日期", "操作员"], () => state.stockIns.map((i) => [i.batch, byId(i.productId)?.name, i.quantity, i.date, i.operator])],
  ["exportStockOutBtn", "出库登记", ["商品", "数量", "日期", "用途"], () => state.stockOuts.map((i) => [byId(i.productId)?.name, i.quantity, i.date, i.purpose])],
  ["exportCostsBtn", "成本登记", ["成本类型", "金额", "日期", "操作员", "说明"], () => state.costs.map((i) => [i.type, i.amount, i.date, i.operator, i.note])],
  ["exportReportsBtn", "报表统计", ["指标", "数值"], () => [["总入库量", state.stockIns.reduce((s, i) => s + i.quantity, 0)], ["总出库量", state.stockOuts.reduce((s, i) => s + i.quantity, 0)], ["总成本", sumCost("采购成本") + sumCost("快递成本") + sumCost("代发成本") + sumCost("其他成本")]]],
].forEach(([id, filename, headers, rows]) => document.getElementById(id).addEventListener("click", () => exportCsv(filename, headers, rows())));

["importStockInBtn", "importStockOutBtn"].forEach((id) => document.getElementById(id).addEventListener("click", () => { pendingImportType = id === "importStockInBtn" ? "in" : "out"; document.getElementById("csvFileInput").click(); }));
document.getElementById("csvFileInput").addEventListener("change", async (event) => {
  const [file] = event.target.files;
  if (!file) return;
  const rows = parseCsv(await file.text()).slice(1);
  rows.forEach(([productName, quantity, date]) => {
    const product = state.products.find((item) => item.name === productName);
    const qty = Number.parseInt(quantity, 10);
    if (!product || !qty) return;
    if (pendingImportType === "in") { product.stock += qty; state.stockIns.unshift({ id: uid("in"), productId: product.id, batch: "000", supplier: "-", quantity: qty, date: date || today(), operator }); }
    if (pendingImportType === "out" && product.stock >= qty) { product.stock -= qty; state.stockOuts.unshift({ id: uid("out"), productId: product.id, quantity: qty, date: date || today(), operator, purpose: "批量导入" }); }
  });
  event.target.value = "";
  render();
});

render();
