const STORAGE_KEY = "tmallWarehouseProducts";
const RECORD_KEY = "tmallWarehouseRecords";

const productForm = document.querySelector("#productForm");
const inventoryBody = document.querySelector("#inventoryBody");
const rowTemplate = document.querySelector("#inventoryRowTemplate");
const emptyState = document.querySelector("#emptyState");
const searchInput = document.querySelector("#searchInput");
const csvInput = document.querySelector("#csvInput");
const pasteArea = document.querySelector("#pasteArea");
const recordsList = document.querySelector("#recordsList");

let products = readStore(STORAGE_KEY, []);
let records = readStore(RECORD_KEY, []);

function readStore(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}

function saveStore() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
  localStorage.setItem(RECORD_KEY, JSON.stringify(records));
}

function currency(value) {
  return Number(value || 0).toLocaleString("zh-CN", {
    style: "currency",
    currency: "CNY",
  });
}

function normalizeProduct(input) {
  return {
    id: input.id || crypto.randomUUID(),
    name: String(input.name || "").trim(),
    spec: String(input.spec || "").trim(),
    cost: Number(input.cost || 0),
    packingCost: Number(input.packingCost || 0),
    stock: Math.max(0, Number.parseInt(input.stock || 0, 10)),
  };
}

function addRecord(type, product, quantity, note = "") {
  records.unshift({
    id: crypto.randomUUID(),
    type,
    productName: product.name,
    productSpec: product.spec,
    quantity,
    note,
    at: new Date().toISOString(),
  });
  records = records.slice(0, 200);
}

function upsertProduct(product, source = "手动添加") {
  const normalized = normalizeProduct(product);
  if (!normalized.name || !normalized.spec) return false;

  const existing = products.find(
    (item) => item.name === normalized.name && item.spec === normalized.spec,
  );

  if (existing) {
    existing.cost = normalized.cost;
    existing.packingCost = normalized.packingCost;
    existing.stock += normalized.stock;
    addRecord("in", existing, normalized.stock, `${source}并合并库存`);
  } else {
    products.push(normalized);
    addRecord("create", normalized, normalized.stock, source);
  }
  saveStore();
  render();
  return true;
}

function parseCsv(text) {
  const rows = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((row) => row.trim())
    .filter(Boolean)
    .map((row) => row.split(",").map((cell) => cell.trim()));

  if (rows.length < 2) return [];
  const [header, ...data] = rows;
  const expected = ["商品名称", "商品规格", "商品成本", "打包成本", "在库数量"];
  const isValid = expected.every((name, index) => header[index] === name);
  if (!isValid) {
    alert("CSV 表头不正确，请使用模板格式。要求：商品名称,商品规格,商品成本,打包成本,在库数量");
    return [];
  }

  return data.map(([name, spec, cost, packingCost, stock]) => ({
    name,
    spec,
    cost,
    packingCost,
    stock,
  }));
}

function importCsv(text) {
  const items = parseCsv(text);
  let count = 0;
  items.forEach((item) => {
    if (upsertProduct(item, "批量导入")) count += 1;
  });
  if (count) alert(`成功导入 ${count} 条商品信息。`);
}

function updateDashboard() {
  const skuCount = products.length;
  const stockTotal = products.reduce((sum, item) => sum + item.stock, 0);
  const inventoryValue = products.reduce((sum, item) => sum + item.cost * item.stock, 0);
  const packingValue = products.reduce((sum, item) => sum + item.packingCost * item.stock, 0);

  document.querySelector("#skuCount").textContent = skuCount;
  document.querySelector("#stockTotal").textContent = stockTotal;
  document.querySelector("#inventoryValue").textContent = currency(inventoryValue);
  document.querySelector("#packingValue").textContent = currency(packingValue);
}

function filteredProducts() {
  const keyword = searchInput.value.trim().toLowerCase();
  if (!keyword) return products;
  return products.filter(
    (item) => item.name.toLowerCase().includes(keyword) || item.spec.toLowerCase().includes(keyword),
  );
}

function renderInventory() {
  inventoryBody.innerHTML = "";
  const visibleProducts = filteredProducts();

  visibleProducts.forEach((product) => {
    const row = rowTemplate.content.firstElementChild.cloneNode(true);
    row.querySelector(".name").textContent = product.name;
    row.querySelector(".spec").textContent = product.spec;
    row.querySelector(".cost").textContent = currency(product.cost);
    row.querySelector(".packingCost").textContent = currency(product.packingCost);
    row.querySelector(".stock").innerHTML = `<span class="badge">${product.stock}</span>`;

    row.querySelector(".inbound").addEventListener("click", () => adjustStock(product.id, "in"));
    row.querySelector(".outbound").addEventListener("click", () => adjustStock(product.id, "out"));
    row.querySelector(".delete").addEventListener("click", () => deleteProduct(product.id));
    inventoryBody.appendChild(row);
  });

  emptyState.style.display = visibleProducts.length ? "none" : "block";
}

function renderRecords() {
  recordsList.innerHTML = "";
  if (!records.length) {
    recordsList.innerHTML = '<p class="empty-state">暂无出入库记录。</p>';
    return;
  }

  records.forEach((record) => {
    const item = document.createElement("article");
    item.className = "record-item";
    const typeText = { in: "入库", out: "出库", create: "新增" }[record.type];
    const date = new Date(record.at).toLocaleString("zh-CN");
    item.innerHTML = `
      <div>
        <strong>${record.productName}｜${record.productSpec}</strong>
        <small>${date} · ${record.note}</small>
      </div>
      <span class="record-type ${record.type}">${typeText} ${record.quantity}</span>
    `;
    recordsList.appendChild(item);
  });
}

function render() {
  updateDashboard();
  renderInventory();
  renderRecords();
}

function adjustStock(productId, type) {
  const product = products.find((item) => item.id === productId);
  if (!product) return;
  const label = type === "in" ? "入库" : "出库";
  const raw = prompt(`请输入${label}数量`, "1");
  const quantity = Number.parseInt(raw, 10);
  if (!Number.isInteger(quantity) || quantity <= 0) return;
  if (type === "out" && quantity > product.stock) {
    alert("出库数量不能超过当前库存。请先补充入库。");
    return;
  }
  product.stock += type === "in" ? quantity : -quantity;
  addRecord(type, product, quantity, `手动${label}`);
  saveStore();
  render();
}

function deleteProduct(productId) {
  const product = products.find((item) => item.id === productId);
  if (!product || !confirm(`确定删除「${product.name}｜${product.spec}」吗？`)) return;
  products = products.filter((item) => item.id !== productId);
  saveStore();
  render();
}

function download(filename, content) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function exportCsv() {
  const header = "商品名称,商品规格,商品成本,打包成本,在库数量";
  const body = products
    .map((item) => [item.name, item.spec, item.cost, item.packingCost, item.stock].join(","))
    .join("\n");
  download(`天猫仓库库存-${new Date().toISOString().slice(0, 10)}.csv`, `${header}\n${body}`);
}

function seedDemoData() {
  const demo = [
    { name: "宠物航空箱", spec: "M 号 / 米白", cost: 68, packingCost: 5.8, stock: 42 },
    { name: "猫砂除臭珠", spec: "500g / 绿茶味", cost: 11.5, packingCost: 1.2, stock: 180 },
    { name: "猫爬架", spec: "四层 / 原木色", cost: 125, packingCost: 12, stock: 16 },
  ];
  demo.forEach((item) => upsertProduct(item, "演示数据"));
}

productForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(productForm);
  upsertProduct(Object.fromEntries(formData.entries()));
  productForm.reset();
});

csvInput.addEventListener("change", async (event) => {
  const [file] = event.target.files;
  if (!file) return;
  importCsv(await file.text());
  csvInput.value = "";
});

searchInput.addEventListener("input", renderInventory);
document.querySelector("#pasteImportBtn").addEventListener("click", () => importCsv(pasteArea.value));
document.querySelector("#downloadTemplateBtn").addEventListener("click", () => download("天猫仓库导入模板.csv", "商品名称,商品规格,商品成本,打包成本,在库数量\n示例商品,标准款,10.00,1.00,100"));
document.querySelector("#exportBtn").addEventListener("click", exportCsv);
document.querySelector("#seedDemoBtn").addEventListener("click", seedDemoData);
document.querySelector("#clearBtn").addEventListener("click", () => {
  if (!confirm("确定清空所有商品和记录吗？")) return;
  products = [];
  records = [];
  saveStore();
  render();
});
document.querySelector("#clearRecordsBtn").addEventListener("click", () => {
  if (!confirm("确定清空出入库记录吗？")) return;
  records = [];
  saveStore();
  render();
});

render();
