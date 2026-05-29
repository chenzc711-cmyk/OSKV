const STORAGE_KEY = "tmallWarehouseV10";
const LEGACY_STORAGE_KEYS = ["tmallWarehouseV9", "tmallWarehouseV8", "tmallWarehouseV7", "tmallWarehouseV6"];
const LOW_STOCK_DEFAULT = 10;
const operator = "陈";
const DEFAULT_CATEGORIES = ["汽车头枕", "腰靠", "护肩套", "坐垫", "方向盘套", "其他"];
const CHANNELS = { general: "普通渠道商", threeW: "3W品牌渠道", taizhouYiwen: "台州伊文渠道" };

const state = readStore() || createDemoState();
let activeInventoryFilter = "all";
let pendingImportType = null;
let editingProductId = null;
let editingReturnId = null;
let editingStockInId = null;
let editingProfitAdjustId = null;

function normalizeReturnRecord(record) {
  return {
    ...record,
    returnDate: normalizeDate(record.returnDate || record.createdAt || today()),
    refundCreatedAt: normalizeDate(record.refundCreatedAt || record.createdAt || today()),
    logisticsCompany: record.logisticsCompany || "-",
    createdAt: normalizeDate(record.createdAt || record.returnDate || today()),
  };
}

function normalizeChannelFunds(value) {
  const records = value?.records || [];
  const accounts = value?.accounts || { general: Number(value?.amount || 0), threeW: 0, taizhouYiwen: 0 };
  return { accounts: { general: Number(accounts.general || 0), threeW: Number(accounts.threeW || 0), taizhouYiwen: Number(accounts.taizhouYiwen || 0) }, records };
}

function normalizeStockInRecord(record) {
  return { ...record, price: Number(record?.price ?? 0) };
}

function readStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) || LEGACY_STORAGE_KEYS.map((key) => localStorage.getItem(key)).find(Boolean);
    if (!raw) return null;
    const data = JSON.parse(raw);
    return { ...data, stockIns: (data.stockIns || []).map(normalizeStockInRecord), returns: (data.returns || []).map(normalizeReturnRecord), channelFunds: normalizeChannelFunds(data.channelFunds), profitAdjustments: data.profitAdjustments || [] };
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

function normalizeDate(value, fallback = today()) {
  const text = String(value || "").trim();
  if (!text) return fallback;
  if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(text)) {
    const [year, month, day] = text.replaceAll("/", "-").split("-");
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }
  if (/^\d+(\.\d+)?$/.test(text) && Number(text) > 20000) {
    return new Date((Number(text) - 25569) * 86400000).toISOString().slice(0, 10);
  }
  return text;
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
  ].map((item) => ({ ...item, price: products.find((product) => product.id === item.productId)?.price || 0, id: uid("in"), operator }));

  const stockOuts = [
    { productId: products[7].id, quantity: 12, date: "2026-05-02", purpose: "销售出库" },
    { productId: products[3].id, quantity: 9, date: "2026-05-04", purpose: "销售出库" },
    { productId: products[11].id, quantity: 7, date: "2026-05-06", purpose: "销售出库" },
    { productId: products[7].id, quantity: 15, date: "2026-05-09", purpose: "销售出库" },
    { productId: products[14].id, quantity: 6, date: "2026-05-12", purpose: "销售出库" },
    { productId: products[3].id, quantity: 11, date: "2026-05-16", purpose: "销售出库" },
    { productId: products[19].id, quantity: 5, date: "2026-05-20", purpose: "销售出库" },
    { productId: products[7].id, quantity: 8, date: "2026-05-25", purpose: "销售出库" },
  ].map((item) => ({ ...item, id: uid("out"), operator }));

  return {
    products,
    stockIns,
    stockOuts,
    returns: [],
    channelFunds: normalizeChannelFunds(),
    profitAdjustments: [],
    costs: [{ id: uid("cost"), type: "代发成本", amount: 27, date: "2026-04-06", operator, note: "汽车坐垫单片代发" }],
  };
}

function byId(id) {
  return state.products.find((product) => product.id === id);
}

function productAmount(product) {
  return product.price * product.stock;
}

function stockInPrice(item) {
  const value = Number(item?.price);
  return Number.isFinite(value) && value > 0 ? value : Number(byId(item.productId)?.price || 0);
}

function channelTotal() {
  const accounts = state.channelFunds?.accounts || {};
  return Object.keys(CHANNELS).reduce((sum, key) => sum + Number(accounts[key] || 0), 0);
}

function profitAdjustmentTotal(type, productId = "") {
  return (state.profitAdjustments || []).filter((item) => item.type === type && (!productId || item.productId === productId)).reduce((sum, item) => sum + Number(item.amount || 0), 0);
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
  const inAmount = (item) => stockInPrice(item) * item.quantity;
  const outAmount = (item) => (byId(item.productId)?.price || 0) * item.quantity;
  const totalCost = state.costs.reduce((sum, item) => sum + item.amount, 0);

  updateText("updatedAt", new Date().toLocaleString("zh-CN", { hour12: false }));
  ["dashProductCount", "invProductCount"].forEach((id) => updateText(id, productCount));
  ["dashStockTotal", "invStockTotal"].forEach((id) => updateText(id, stockTotal));
  updateText("dashInventoryValue", money(inventoryValue));
  updateText("invAmount", money(inventoryValue));
  ["dashWarningCount", "invWarningCount"].forEach((id) => updateText(id, warningCount));
  updateText("dashChannelFunds", money(channelTotal()));
  updateText("channelGeneralFunds", money(state.channelFunds?.accounts?.general || 0));
  updateText("channelThreeWFunds", money(state.channelFunds?.accounts?.threeW || 0));
  updateText("channelTaizhouFunds", money(state.channelFunds?.accounts?.taizhouYiwen || 0));
  updateText("dashChannelNote", state.channelFunds?.records?.[0]?.note || "可分别登记渠道金额和备注");
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
  updateText("returnRecordCount", state.returns.length);
  updateText("returnQtyTotal", state.returns.reduce((s, i) => s + i.quantity, 0));
  updateText("returnOrderCount", new Set(state.returns.map((i) => i.orderNo)).size);
  updateText("costTotal", money(totalCost));
  updateText("purchaseCost", money(sumCost("采购成本")));
  updateText("expressCost", money(sumCost("快递成本")));
  updateText("agencyCost", money(sumCost("代发成本")));
  updateText("otherCost", money(sumCost("其他成本")));
  updateText("profitRevenue", money(totalRevenue()));
  updateText("profitPurchaseCost", money(totalPurchaseCost()));
  updateText("profitExpenseCost", money(totalExpenseCost()));
  updateText("profitNet", money(totalRevenue() - totalPurchaseCost() - totalExpenseCost()));
  updateText("profitRevenueBase", `自动出库 ${money(autoRevenue())} / 手动 ${money(profitAdjustmentTotal("revenue"))}`);
  updateText("profitPurchaseBase", `入库成本 ${money(autoPurchaseCost())} / 手动 ${money(profitAdjustmentTotal("purchase"))}`);
  updateText("profitExpenseBase", `成本登记 ${money(totalCost)} / 手动 ${money(profitAdjustmentTotal("expense"))}`);
}

function sumCost(type) {
  return state.costs.filter((item) => item.type === type).reduce((sum, item) => sum + item.amount, 0);
}

function autoRevenue() {
  return state.stockOuts.reduce((sum, item) => sum + item.quantity * (byId(item.productId)?.price || 0), 0);
}

function autoPurchaseCost() {
  return state.stockIns.reduce((sum, item) => sum + item.quantity * stockInPrice(item), 0);
}

function totalRevenue() {
  return autoRevenue() + profitAdjustmentTotal("revenue");
}

function totalPurchaseCost() {
  return autoPurchaseCost() + profitAdjustmentTotal("purchase");
}

function totalExpenseCost() {
  return state.costs.reduce((sum, item) => sum + item.amount, 0) + profitAdjustmentTotal("expense");
}

function baseProductName(name) {
  return String(name || "").split(/[｜|-]/)[0].trim();
}

function sortedProducts(items) {
  return [...items].sort((a, b) => baseProductName(a.name).localeCompare(baseProductName(b.name), "zh-CN") || a.category.localeCompare(b.category, "zh-CN") || a.name.localeCompare(b.name, "zh-CN"));
}

function productOptionsHtml(selectedId = "") {
  const groups = new Map();
  sortedProducts(state.products).forEach((product) => {
    const groupName = baseProductName(product.name) || "其他商品";
    if (!groups.has(groupName)) groups.set(groupName, []);
    groups.get(groupName).push(product);
  });
  return [...groups.entries()].map(([group, products]) => `<optgroup label="${group}">${products.map((product) => `<option value="${product.id}" ${product.id === selectedId ? "selected" : ""}>${product.name}</option>`).join("")}</optgroup>`).join("");
}

function categoryList() {
  return [...new Set([...DEFAULT_CATEGORIES, ...state.products.map((product) => product.category).filter(Boolean)])];
}

function categoryMatches(product, selectId) {
  const select = document.getElementById(selectId);
  return !select || select.value === "all" || product.category === select.value;
}

function renderCategorySelects() {
  const options = categoryList().map((category) => `<option value="${category}">${category}</option>`).join("");
  ["inventoryCategoryFilter", "stockInCategoryFilter", "stockOutCategoryFilter", "productCategoryFilter"].forEach((id) => {
    const select = document.getElementById(id);
    if (!select) return;
    const value = select.value || "all";
    select.innerHTML = `<option value="all">全部规格分类</option>${options}`;
    select.value = categoryList().includes(value) ? value : "all";
  });
}

function fillProductCategorySelect(value = "") {
  const select = document.querySelector('#productForm select[name="category"]');
  if (!select) return;
  const categories = categoryList();
  select.innerHTML = categories.map((category) => `<option value="${category}">${category}</option>`).join("");
  select.value = categories.includes(value) ? value : categories[0];
}

function filteredProducts(inputId = "inventorySearch", categorySelectId = "") {
  const keyword = document.getElementById(inputId).value.trim().toLowerCase();
  return sortedProducts(state.products.filter((product) => {
    const matchKeyword = !keyword || [product.name, product.code, product.category].some((value) => value.toLowerCase().includes(keyword));
    const matchFilter = activeInventoryFilter === "all" || (activeInventoryFilter === "low" ? product.stock <= product.warning : product.stock > product.warning);
    return matchKeyword && matchFilter && categoryMatches(product, categorySelectId);
  }));
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
  body.innerHTML = filteredProducts("inventorySearch", "inventoryCategoryFilter").map((product) => `
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
  const rows = sortedProducts(state.products.filter((product) => (!keyword || [product.name, product.code, product.category].some((value) => value.toLowerCase().includes(keyword))) && categoryMatches(product, "productCategoryFilter")));
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
    return product && (!keyword || product.name.toLowerCase().includes(keyword) || product.category.toLowerCase().includes(keyword) || String(item.purpose || "").toLowerCase().includes(keyword)) && categoryMatches(product, "stockInCategoryFilter");
  });
  document.getElementById("stockInBody").innerHTML = rows.map((item) => {
    const product = byId(item.productId);
    return `<tr><td><input class="stock-in-check" type="checkbox" data-id="${item.id}" /></td><td>${product?.name || "-"}</td><td>${item.supplier || "-"}</td><td>${item.quantity}</td><td>${money(stockInPrice(item))}</td><td>${money(stockInPrice(item) * item.quantity)}</td><td>${item.date}</td><td>${item.operator}</td><td>${item.purpose || "-"}</td><td><span class="action-row"><button class="link-btn" data-edit-in="${item.id}">编辑</button><button class="delete-btn" data-delete-in="${item.id}">删除</button></span></td></tr>`;
  }).join("");
  const selectAll = document.getElementById("stockInSelectAll");
  if (selectAll) selectAll.checked = false;
}

function renderStockOuts() {
  const keyword = document.getElementById("stockOutSearch").value.trim().toLowerCase();
  const start = document.getElementById("stockOutStart").value;
  const end = document.getElementById("stockOutEnd").value;
  const rows = recordsInRange(state.stockOuts, start, end).filter((item) => {
    const product = byId(item.productId);
    return product && (!keyword || product.name.toLowerCase().includes(keyword) || product.category.toLowerCase().includes(keyword)) && categoryMatches(product, "stockOutCategoryFilter");
  });
  document.getElementById("stockOutBody").innerHTML = rows.length ? rows.map((item) => `<tr><td><input type="checkbox" /></td><td>${item.date}</td><td>${byId(item.productId)?.name || "-"}</td><td>${item.quantity}</td><td>${item.purpose || "销售出库"}</td><td><button class="delete-btn" data-delete-out="${item.id}">删除</button></td></tr>`).join("") : `<tr><td colspan="6" style="text-align:center;color:#64748b;height:86px">暂无数据</td></tr>`;
}

function renderReturns() {
  const keyword = document.getElementById("returnSearch").value.trim().toLowerCase();
  const start = document.getElementById("returnStart").value;
  const end = document.getElementById("returnEnd").value;
  const rows = state.returns.filter((item) => {
    const product = byId(item.productId);
    const matchDate = (!start || item.returnDate >= start) && (!end || item.returnDate <= end);
    const matchKeyword = !keyword || [item.orderNo, item.trackingNo, item.logisticsCompany, product?.name, item.productName, item.operator, item.note].some((value) => String(value || "").toLowerCase().includes(keyword));
    return matchDate && matchKeyword;
  });
  document.getElementById("returnBody").innerHTML = rows.length ? rows.map((item) => {
    const product = byId(item.productId);
    return `<tr><td>${item.returnDate}</td><td>${item.refundCreatedAt}</td><td>${item.orderNo}</td><td>${item.logisticsCompany || "-"}</td><td>${item.trackingNo}</td><td>${product?.name || item.productName || "-"}</td><td>${item.quantity}</td><td>${item.operator}</td><td>${item.note || "-"}</td><td><span class="action-row"><button class="link-btn" data-edit-return="${item.id}">编辑</button><button class="delete-btn" data-delete-return="${item.id}">删除</button></span></td></tr>`;
  }).join("") : `<tr><td colspan="10" style="text-align:center;color:#64748b;height:86px">暂无退货入库记录</td></tr>`;
}

function renderCosts() {
  const type = document.getElementById("costTypeFilter").value;
  const rows = state.costs.filter((item) => type === "all" || item.type === type);
  document.getElementById("costBody").innerHTML = rows.map((item) => `<tr><td><input type="checkbox" /></td><td><span class="cost-chip">${item.type}</span></td><td class="red-text">${money(item.amount)}</td><td>${item.date}</td><td>${item.operator}</td><td>${item.note || "-"}</td><td><button class="delete-btn" data-delete-cost="${item.id}">删除</button></td></tr>`).join("");
}

function renderProfits() {
  const rows = sortedProducts(state.products).map((product) => {
    const outQty = state.stockOuts.filter((item) => item.productId === product.id).reduce((sum, item) => sum + item.quantity, 0);
    const inItems = state.stockIns.filter((item) => item.productId === product.id);
    const inQty = inItems.reduce((sum, item) => sum + item.quantity, 0);
    const returnQty = state.returns.filter((item) => item.productId === product.id).reduce((sum, item) => sum + item.quantity, 0);
    const manualRevenue = profitAdjustmentTotal("revenue", product.id);
    const manualPurchase = profitAdjustmentTotal("purchase", product.id);
    const manualExpense = profitAdjustmentTotal("expense", product.id);
    const revenue = outQty * product.price + manualRevenue;
    const purchase = inItems.reduce((sum, item) => sum + item.quantity * stockInPrice(item), 0) + manualPurchase;
    return { product, outQty, inQty, returnQty, revenue, purchase, gross: revenue - purchase - manualExpense };
  }).filter((row) => row.outQty || row.inQty || row.returnQty || row.revenue || row.purchase);
  const body = document.getElementById("profitBody");
  if (!body) return;
  body.innerHTML = rows.length ? rows.map((row) => `<tr><td>${row.product.name}</td><td>${row.outQty}</td><td class="money">${money(row.revenue)}</td><td>${row.inQty}</td><td class="money">${money(row.purchase)}</td><td>${row.returnQty}</td><td class="${row.gross >= 0 ? "green-text" : "red-text"}">${money(row.gross)}</td><td><button class="link-btn" data-profit-product="${row.product.id}">登记调整</button></td></tr>`).join("") : `<tr><td colspan="8" style="text-align:center;color:#64748b;height:86px">暂无利润数据</td></tr>`;
  renderProfitAdjustments();
}

function renderProfitAdjustments() {
  const body = document.getElementById("profitAdjustBody");
  if (!body) return;
  const typeNames = { revenue: "销售收入调整", purchase: "入库采购成本调整", expense: "费用成本调整" };
  const rows = state.profitAdjustments || [];
  body.innerHTML = rows.length ? rows.map((item) => `<tr><td><span class="cost-chip">${typeNames[item.type] || item.type}</span></td><td class="money">${money(item.amount)}</td><td>${item.date}</td><td>${byId(item.productId)?.name || "不关联商品"}</td><td>${item.note || "-"}</td><td><span class="action-row"><button class="link-btn" data-edit-profit="${item.id}">编辑</button><button class="delete-btn" data-delete-profit="${item.id}">删除</button></span></td></tr>`).join("") : `<tr><td colspan="6" style="text-align:center;color:#64748b;height:86px">暂无利润调整记录</td></tr>`;
}

function renderCharts() {
  if (document.getElementById("reportTopChart")) renderReportTopChart();
  if (document.getElementById("trendCanvas")) drawTrend();
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
  const outs = groupOuts().slice(0, 5);
  if (!outs.length) {
    root.className = "empty-frame";
    root.innerHTML = "";
    return;
  }
  const max = Math.max(1, ...outs.map((item) => item.qty));
  root.className = "top-frame outbound-only";
  root.innerHTML = outs.map((item, index) => `<div class="top-row"><span title="${item.name}">${index + 1}. ${item.name}</span><i style="width:${(item.qty / max) * 100}%"></i><em>${item.qty}</em></div>`).join("");
}

function drawTrend() {
  const canvas = document.getElementById("trendCanvas");
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  ctx.clearRect(0, 0, width, height);
  const padding = { left: 54, right: 28, top: 24, bottom: 42 };
  const days = Array.from({ length: 31 }, (_, index) => `2026-05-${String(index + 1).padStart(2, "0")}`);
  const values = days.map((date) => state.stockOuts.filter((item) => item.date === date).reduce((sum, item) => sum + item.quantity, 0));
  const max = Math.max(8, ...values);
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const points = values.map((value, index) => ({
    x: padding.left + (chartWidth / (days.length - 1)) * index,
    y: padding.top + chartHeight - (value / max) * chartHeight,
    value,
  }));

  ctx.strokeStyle = "#dbe7f3";
  ctx.lineWidth = 1;
  ctx.setLineDash([5, 7]);
  for (let i = 0; i <= 4; i += 1) {
    const y = padding.top + (chartHeight / 4) * i;
    ctx.beginPath(); ctx.moveTo(padding.left, y); ctx.lineTo(width - padding.right, y); ctx.stroke();
  }
  ctx.setLineDash([]);

  const gradient = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
  gradient.addColorStop(0, "rgba(239, 68, 68, 0.22)");
  gradient.addColorStop(1, "rgba(239, 68, 68, 0.02)");
  ctx.beginPath();
  points.forEach((point, index) => index ? ctx.lineTo(point.x, point.y) : ctx.moveTo(point.x, point.y));
  ctx.lineTo(width - padding.right, height - padding.bottom);
  ctx.lineTo(padding.left, height - padding.bottom);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();

  ctx.beginPath();
  points.forEach((point, index) => index ? ctx.lineTo(point.x, point.y) : ctx.moveTo(point.x, point.y));
  ctx.strokeStyle = "#ef4444";
  ctx.lineWidth = 3;
  ctx.stroke();

  points.forEach((point) => {
    if (!point.value) return;
    ctx.beginPath();
    ctx.arc(point.x, point.y, 4, 0, Math.PI * 2);
    ctx.fillStyle = "#fff";
    ctx.fill();
    ctx.strokeStyle = "#ef4444";
    ctx.lineWidth = 2;
    ctx.stroke();
  });

  ctx.fillStyle = "#64748b";
  ctx.font = "14px sans-serif";
  for (let i = 0; i < days.length; i += 3) ctx.fillText(days[i].slice(5), points[i].x - 14, height - 16);
  ctx.fillStyle = "#ef4444";
  ctx.fillText("● 出库量", width / 2 - 28, height - 16);
}

function render() {
  saveStore();
  renderCategorySelects();
  renderMetrics();
  renderWarnings();
  renderInventory();
  renderProducts();
  renderStockIns();
  renderStockOuts();
  renderReturns();
  renderCosts();
  renderProfits();
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
  fillProductCategorySelect(product?.category || "");
  form.elements.unit.value = product?.unit || "个";
  form.elements.price.value = product?.price || "";
  form.elements.stock.value = product?.stock || 0;
  form.elements.warning.value = product?.warning ?? LOW_STOCK_DEFAULT;
  document.getElementById("productDialog").showModal();
}

function openMovementDialog(type, productId = "", record = null) {
  const form = document.getElementById("movementForm");
  form.reset();
  editingStockInId = type === "in" && record ? record.id : null;
  document.getElementById("movementTitle").textContent = record ? "编辑入库" : type === "in" ? "添加入库" : "添加出库";
  form.elements.id.value = record?.id || "";
  form.elements.type.value = type;
  form.elements.date.value = record?.date || today();
  form.elements.productId.innerHTML = productOptionsHtml(productId || record?.productId || "");
  form.elements.productId.value = productId || record?.productId || sortedProducts(state.products)[0]?.id || "";
  form.elements.quantity.value = record?.quantity || "";
  form.elements.batch.value = record?.batch || "000";
  form.elements.supplier.value = record?.supplier || "";
  form.elements.purpose.value = record?.purpose || "";
  form.elements.price.value = record ? stockInPrice(record) : byId(form.elements.productId.value)?.price || "";
  document.getElementById("batchLabel").style.display = type === "in" ? "grid" : "none";
  document.getElementById("supplierLabel").style.display = type === "in" ? "grid" : "none";
  document.getElementById("movementPriceLabel").style.display = type === "in" ? "grid" : "none";
  document.getElementById("movementDialog").showModal();
}

function openReturnDialog(record = null) {
  editingReturnId = record?.id || null;
  const form = document.getElementById("returnForm");
  form.reset();
  document.getElementById("returnDialogTitle").textContent = record ? "编辑退货入库" : "添加退货入库";
  form.elements.id.value = record?.id || "";
  form.elements.returnDate.value = record?.returnDate || today();
  form.elements.refundCreatedAt.value = record?.refundCreatedAt || today();
  form.elements.orderNo.value = record?.orderNo || "";
  form.elements.logisticsCompany.value = record?.logisticsCompany || "";
  form.elements.trackingNo.value = record?.trackingNo || "";
  form.elements.operator.value = record?.operator || operator;
  form.elements.note.value = record?.note || "";
  form.elements.quantity.value = record?.quantity || "";
  form.elements.productId.innerHTML = productOptionsHtml(record?.productId || "");
  form.elements.productId.value = record?.productId || sortedProducts(state.products)[0]?.id || "";
  document.getElementById("returnDialog").showModal();
}

function parseCsv(text) {
  return text.replace(/^\uFEFF/, "").split(/\r?\n/).map((line) => line.split(",").map((cell) => cell.trim())).filter((row) => row.length > 1 && row.some(Boolean));
}



function decodeXml(value = "") {
  return value.replaceAll("&lt;", "<").replaceAll("&gt;", ">").replaceAll("&amp;", "&").replaceAll("&quot;", '"').replaceAll("&apos;", "'");
}

function columnIndex(cellRef = "A") {
  const letters = String(cellRef).match(/[A-Z]+/)?.[0] || "A";
  return [...letters].reduce((sum, letter) => sum * 26 + letter.charCodeAt(0) - 64, 0) - 1;
}

async function inflateRaw(bytes) {
  if (typeof DecompressionStream === "undefined") throw new Error("当前浏览器不支持读取压缩的 XLSX，请另存为 CSV 后导入。");
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function unzipEntries(buffer) {
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);
  let eocd = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65558); i -= 1) {
    if (view.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error("XLSX 文件结构不完整，请确认文件未损坏。");
  const total = view.getUint16(eocd + 10, true);
  let offset = view.getUint32(eocd + 16, true);
  const entries = new Map();
  const decoder = new TextDecoder();
  for (let i = 0; i < total; i += 1) {
    if (view.getUint32(offset, true) !== 0x02014b50) break;
    const method = view.getUint16(offset + 10, true);
    const compressedSize = view.getUint32(offset + 20, true);
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const localOffset = view.getUint32(offset + 42, true);
    const name = decoder.decode(bytes.slice(offset + 46, offset + 46 + nameLength));
    const localNameLength = view.getUint16(localOffset + 26, true);
    const localExtraLength = view.getUint16(localOffset + 28, true);
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;
    const compressed = bytes.slice(dataStart, dataStart + compressedSize);
    const data = method === 0 ? compressed : await inflateRaw(compressed);
    entries.set(name, decoder.decode(data));
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

function parseSharedStrings(xml = "") {
  return [...xml.matchAll(/<si[^>]*>([\s\S]*?)<\/si>/g)].map((match) => decodeXml([...match[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((part) => part[1]).join("")));
}

async function parseXlsx(file) {
  const entries = await unzipEntries(await file.arrayBuffer());
  const shared = parseSharedStrings(entries.get("xl/sharedStrings.xml") || "");
  const sheetName = [...entries.keys()].find((name) => /^xl\/worksheets\/sheet\d+\.xml$/.test(name));
  const sheet = entries.get(sheetName || "") || "";
  const rows = [];
  for (const rowMatch of sheet.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)) {
    const row = [];
    for (const cellMatch of rowMatch[1].matchAll(/<c([^>]*)>([\s\S]*?)<\/c>/g)) {
      const attrs = cellMatch[1];
      const body = cellMatch[2];
      const ref = attrs.match(/r="([A-Z]+)\d+"/)?.[1] || "A";
      const type = attrs.match(/t="([^"]+)"/)?.[1] || "";
      const raw = body.match(/<v[^>]*>([\s\S]*?)<\/v>/)?.[1] || body.match(/<t[^>]*>([\s\S]*?)<\/t>/)?.[1] || "";
      const value = type === "s" ? (shared[Number(raw)] || "") : decodeXml(raw);
      row[columnIndex(ref)] = value;
    }
    if (row.some((cell) => String(cell || "").trim())) rows.push(row.map((cell) => String(cell || "").trim()));
  }
  return rows;
}

async function parseImportFile(file) {
  return file.name.toLowerCase().endsWith(".xlsx") ? parseXlsx(file) : parseCsv(await file.text());
}

function findProductByName(name) {
  const keyword = String(name || "").trim();
  return state.products.find((item) => item.name === keyword || item.code === keyword) || state.products.find((item) => item.name.includes(keyword));
}

function showProductDetail(productId) {
  const product = byId(productId);
  if (!product) return;
  const inbound = state.stockIns.filter((item) => item.productId === productId).reduce((sum, item) => sum + item.quantity, 0);
  const outbound = state.stockOuts.filter((item) => item.productId === productId).reduce((sum, item) => sum + item.quantity, 0);
  alert(`商品详情

名称：${product.name}
编码：${product.code}
规格分类：${product.category}
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

function openProfitAdjustDialog(record = null, productId = "") {
  const form = document.getElementById("profitAdjustForm");
  form.reset();
  editingProfitAdjustId = record?.id || null;
  document.getElementById("profitAdjustTitle").textContent = record ? "编辑利润调整" : "登记利润调整";
  form.elements.id.value = record?.id || "";
  form.elements.type.value = record?.type || "revenue";
  form.elements.productId.innerHTML = `<option value="">不关联商品</option>${productOptionsHtml(record?.productId || productId)}`;
  form.elements.productId.value = record?.productId || productId || "";
  form.elements.amount.value = record?.amount ?? "";
  form.elements.date.value = record?.date || today();
  form.elements.note.value = record?.note || "";
  document.getElementById("profitAdjustDialog").showModal();
}

document.querySelectorAll(".nav-item").forEach((item) => item.addEventListener("click", () => setView(item.dataset.view)));
document.querySelectorAll("[data-close]").forEach((button) => button.addEventListener("click", () => button.closest("dialog").close()));
document.querySelectorAll("#inventorySearch,#inventoryCategoryFilter,#productSearch,#productCategoryFilter,#stockInSearch,#stockInCategoryFilter,#stockInStart,#stockInEnd,#stockOutSearch,#stockOutCategoryFilter,#stockOutStart,#stockOutEnd,#returnSearch,#returnStart,#returnEnd,#costTypeFilter").forEach((el) => el.addEventListener("input", render));
document.querySelectorAll(".tabs .tab[data-filter]").forEach((tab) => tab.addEventListener("click", () => { activeInventoryFilter = tab.dataset.filter; document.querySelectorAll(".tabs .tab[data-filter]").forEach((x) => x.classList.toggle("active", x === tab)); renderInventory(); }));

document.getElementById("addProductBtn").addEventListener("click", () => openProductDialog());
document.getElementById("stockInSelectAll").addEventListener("change", (event) => document.querySelectorAll(".stock-in-check").forEach((checkbox) => { checkbox.checked = event.target.checked; }));
document.getElementById("importProductsBtn").addEventListener("click", () => { pendingImportType = "products"; document.getElementById("csvFileInput").click(); });
document.getElementById("addStockInBtn").addEventListener("click", () => openMovementDialog("in"));
document.getElementById("addStockOutBtn").addEventListener("click", () => openMovementDialog("out"));
document.getElementById("addReturnBtn").addEventListener("click", openReturnDialog);
document.getElementById("addCostBtn").addEventListener("click", () => { document.getElementById("costForm").reset(); document.getElementById("costForm").elements.date.value = today(); document.getElementById("costDialog").showModal(); });
document.getElementById("addProfitAdjustBtn").addEventListener("click", () => openProfitAdjustDialog());
document.querySelector('#movementForm select[name="productId"]').addEventListener("change", (event) => { const form = document.getElementById("movementForm"); if (form.elements.type.value === "in") form.elements.price.value = byId(event.target.value)?.price || ""; });

document.getElementById("channelForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const amount = Number(form.elements.amount.value || 0);
  const mode = form.elements.mode.value;
  const channel = form.elements.channel.value;
  state.channelFunds = normalizeChannelFunds(state.channelFunds);
  const before = state.channelFunds.accounts[channel] || 0;
  const after = mode === "set" ? amount : before + amount;
  state.channelFunds.accounts[channel] = after;
  state.channelFunds.records.unshift({ id: uid("fund"), channel, channelName: CHANNELS[channel], mode, amount, before, after, note: form.elements.note.value.trim(), date: today(), operator });
  document.getElementById("channelDialog").close();
  render();
});

document.getElementById("profitAdjustForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const record = { id: editingProfitAdjustId || uid("profit"), type: form.elements.type.value, productId: form.elements.productId.value, amount: Number(form.elements.amount.value || 0), date: normalizeDate(form.elements.date.value), note: form.elements.note.value.trim(), operator };
  if (editingProfitAdjustId) state.profitAdjustments = state.profitAdjustments.map((item) => item.id === editingProfitAdjustId ? record : item); else state.profitAdjustments.unshift(record);
  editingProfitAdjustId = null;
  document.getElementById("profitAdjustDialog").close();
  render();
});

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
    const previous = editingStockInId ? state.stockIns.find((item) => item.id === editingStockInId) : null;
    if (previous) {
      const oldProduct = byId(previous.productId);
      if (oldProduct) oldProduct.stock = Math.max(0, oldProduct.stock - previous.quantity);
    }
    product.stock += quantity;
    const record = { id: editingStockInId || uid("in"), productId: product.id, batch: form.elements.batch.value || "000", supplier: form.elements.supplier.value || "-", price: Number(form.elements.price.value || product.price || 0), quantity, date: normalizeDate(form.elements.date.value), operator, purpose: form.elements.purpose.value.trim() };
    if (editingStockInId) state.stockIns = state.stockIns.map((item) => item.id === editingStockInId ? record : item); else state.stockIns.unshift(record);
    editingStockInId = null;
  } else {
    product.stock -= quantity;
    state.stockOuts.unshift({ id: uid("out"), productId: product.id, quantity, date: normalizeDate(form.elements.date.value), operator, purpose: form.elements.purpose.value || "销售出库" });
  }
  document.getElementById("movementDialog").close();
  render();
});

document.getElementById("returnForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const product = byId(form.elements.productId.value);
  const quantity = Number.parseInt(form.elements.quantity.value, 10);
  if (!product || quantity <= 0) return;
  const previous = editingReturnId ? state.returns.find((item) => item.id === editingReturnId) : null;
  if (previous) {
    const oldProduct = byId(previous.productId);
    if (oldProduct) oldProduct.stock = Math.max(0, oldProduct.stock - previous.quantity);
  }
  product.stock += quantity;
  const record = normalizeReturnRecord({
    id: editingReturnId || uid("ret"),
    orderNo: form.elements.orderNo.value.trim(),
    trackingNo: form.elements.trackingNo.value.trim(),
    logisticsCompany: form.elements.logisticsCompany.value.trim(),
    refundCreatedAt: normalizeDate(form.elements.refundCreatedAt.value),
    returnDate: normalizeDate(form.elements.returnDate.value),
    productId: product.id,
    productName: product.name,
    quantity,
    operator: form.elements.operator.value.trim() || operator,
    note: form.elements.note.value.trim(),
    createdAt: previous?.createdAt || today(),
  });
  if (editingReturnId) state.returns = state.returns.map((item) => item.id === editingReturnId ? record : item); else state.returns.unshift(record);
  editingReturnId = null;
  document.getElementById("returnDialog").close();
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
  const editReturn = target.dataset.editReturn;
  const editIn = target.dataset.editIn;
  const editProfit = target.dataset.editProfit;
  const profitProduct = target.dataset.profitProduct;
  if (editProduct) openProductDialog(byId(editProduct));
  if (adjust) openMovementDialog("in", adjust);
  if (detail) showProductDetail(detail);
  if (costProduct) openCostDialogForProduct(costProduct);
  if (editReturn) openReturnDialog(state.returns.find((item) => item.id === editReturn));
  if (editIn) openMovementDialog("in", "", state.stockIns.find((item) => item.id === editIn));
  if (editProfit) openProfitAdjustDialog(state.profitAdjustments.find((item) => item.id === editProfit));
  if (profitProduct) openProfitAdjustDialog(null, profitProduct);
  if (target.id === "adjustChannelBtn") { document.getElementById("channelForm").reset(); document.getElementById("channelDialog").showModal(); }
  if (deleteProduct && confirm("确定删除该商品吗？")) { state.products = state.products.filter((item) => item.id !== deleteProduct); render(); }
  if (target.dataset.deleteIn) { const item = state.stockIns.find((record) => record.id === target.dataset.deleteIn); const product = item && byId(item.productId); if (product) product.stock = Math.max(0, product.stock - item.quantity); state.stockIns = state.stockIns.filter((item) => item.id !== target.dataset.deleteIn); render(); }
  if (target.dataset.deleteOut) { state.stockOuts = state.stockOuts.filter((item) => item.id !== target.dataset.deleteOut); render(); }
  if (target.dataset.deleteReturn) { const item = state.returns.find((record) => record.id === target.dataset.deleteReturn); const product = item && byId(item.productId); if (product) product.stock = Math.max(0, product.stock - item.quantity); state.returns = state.returns.filter((record) => record.id !== target.dataset.deleteReturn); render(); }
  if (target.dataset.deleteCost) { state.costs = state.costs.filter((item) => item.id !== target.dataset.deleteCost); render(); }
  if (target.dataset.deleteProfit) { state.profitAdjustments = state.profitAdjustments.filter((item) => item.id !== target.dataset.deleteProfit); render(); }
});

[
  ["exportInventoryBtn", "库存查询", ["商品名称", "规格分类", "单位", "单价", "当前库存", "库存金额"], () => state.products.map((p) => [p.name, p.category, p.unit, p.price, p.stock, productAmount(p)])],
  ["exportProductsBtn", "商品管理", ["商品名称", "规格分类", "单位", "单价", "当前库存", "预警库存"], () => state.products.map((p) => [p.name, p.category, p.unit, p.price, p.stock, p.warning])],
  ["exportStockInBtn", "入库登记", ["商品", "供应商", "数量", "单价", "总金额", "日期", "操作员", "备注"], () => state.stockIns.map((i) => { const product = byId(i.productId); return [product?.name, i.supplier, i.quantity, stockInPrice(i), stockInPrice(i) * i.quantity, i.date, i.operator, i.purpose]; })],
  ["exportStockOutBtn", "出库登记", ["商品", "数量", "日期", "用途"], () => state.stockOuts.map((i) => [byId(i.productId)?.name, i.quantity, i.date, i.purpose])],
  ["exportReturnsBtn", "退货入库", ["退货日期", "退款创建时间", "订单号", "物流公司", "物流单号", "物品名称", "物品数量", "操作人", "备注", "登记时间"], () => state.returns.map((i) => [i.returnDate, i.refundCreatedAt, i.orderNo, i.logisticsCompany, i.trackingNo, byId(i.productId)?.name || i.productName, i.quantity, i.operator, i.note, i.createdAt])],
  ["exportCostsBtn", "成本登记", ["成本类型", "金额", "日期", "操作员", "说明"], () => state.costs.map((i) => [i.type, i.amount, i.date, i.operator, i.note])],
  ["exportProfitsBtn", "利润计算", ["类型", "商品", "金额", "日期", "备注"], () => [["销售收入合计", "", totalRevenue(), today(), "自动出库+手动调整"], ["入库采购成本合计", "", totalPurchaseCost(), today(), "入库单价+手动调整"], ["费用成本合计", "", totalExpenseCost(), today(), "成本登记+手动调整"], ["预估利润", "", totalRevenue() - totalPurchaseCost() - totalExpenseCost(), today(), "收入-成本"], ...state.profitAdjustments.map((i) => [i.type, byId(i.productId)?.name || "", i.amount, i.date, i.note])]],
].forEach(([id, filename, headers, rows]) => { const button = document.getElementById(id); if (button) button.addEventListener("click", () => exportCsv(filename, headers, rows())); });

["importStockInBtn", "importStockOutBtn", "importReturnsBtn"].forEach((id) => document.getElementById(id).addEventListener("click", () => { pendingImportType = id === "importStockInBtn" ? "in" : id === "importStockOutBtn" ? "out" : "returns"; document.getElementById("csvFileInput").click(); }));
document.getElementById("csvFileInput").addEventListener("change", async (event) => {
  const [file] = event.target.files;
  if (!file) return;
  try {
    const rows = (await parseImportFile(file)).slice(1);
    rows.forEach((row) => {
      if (pendingImportType === "products") {
        const [name, category = "未分类", unit = "只", price = 0, stock = 0, warning = LOW_STOCK_DEFAULT] = row;
        if (!name) return;
        const categoryName = String(category || "").trim();
        if (!categoryList().includes(categoryName)) return;
        const existing = state.products.find((item) => item.name === name && item.category === categoryName);
        const product = { id: existing?.id || uid("p"), code: existing?.code || `SP${String(state.products.length + 1).padStart(3, "0")}`, name: name.trim(), category: categoryName, unit: unit.trim() || "只", price: Number(price || 0), stock: Number.parseInt(stock || 0, 10), warning: Number.parseInt(warning || LOW_STOCK_DEFAULT, 10), enabled: true };
        if (existing) state.products = state.products.map((item) => item.id === existing.id ? product : item); else state.products.push(product);
        return;
      }
      if (pendingImportType === "returns") {
        const [orderNo, trackingNo, logisticsCompany, productName, quantity, rowOperator = operator, note = "", returnDate = today(), refundCreatedAt = returnDate] = row;
        const product = findProductByName(productName);
        const qty = Number.parseInt(quantity, 10);
        if (!orderNo || !product || !qty) return;
        product.stock += qty;
        state.returns.unshift(normalizeReturnRecord({ id: uid("ret"), orderNo, trackingNo, logisticsCompany, productId: product.id, productName: product.name, quantity: qty, operator: rowOperator || operator, note, returnDate: normalizeDate(returnDate), refundCreatedAt: normalizeDate(refundCreatedAt || returnDate), createdAt: today() }));
        return;
      }
      const [productName, quantity, date, extra = "", remark = "", importPrice = ""] = row;
      const product = findProductByName(productName);
      const qty = Number.parseInt(quantity, 10);
      if (!product || !qty) return;
      if (pendingImportType === "in") { product.stock += qty; state.stockIns.unshift({ id: uid("in"), productId: product.id, batch: "000", supplier: extra || "-", price: Number(importPrice || product.price || 0), quantity: qty, date: normalizeDate(date), operator, purpose: remark || "批量导入" }); }
      if (pendingImportType === "out" && product.stock >= qty) { product.stock -= qty; state.stockOuts.unshift({ id: uid("out"), productId: product.id, quantity: qty, date: normalizeDate(date), operator, purpose: extra || "批量导入" }); }
    });
    render();
  } catch (error) {
    alert(error.message || "导入失败，请检查文件格式。");
  } finally {
    event.target.value = "";
  }
});

render();
