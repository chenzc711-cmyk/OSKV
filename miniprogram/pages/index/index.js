const app = getApp();
const channels = [
  { key: "general", name: "普通渠道商" },
  { key: "threeW", name: "3W品牌渠道" },
  { key: "taizhouYiwen", name: "台州伊文渠道" }
];
const profitTypes = [
  { key: "revenue", name: "销售收入调整" },
  { key: "purchase", name: "入库采购成本调整" },
  { key: "expense", name: "费用成本调整" }
];
const views = [
  { key: "dashboard", name: "总览", icon: "⌂", title: "仓储总览", desc: "库存、渠道款项与风险提醒" },
  { key: "inventory", name: "库存", icon: "◎", title: "库存查询", desc: "查看商品库存、单价和安全线" },
  { key: "stockIn", name: "入库", icon: "↙", title: "入库登记", desc: "采购补货、供应商、单价和备注" },
  { key: "stockOut", name: "出库", icon: "↗", title: "出库登记", desc: "销售发货、用途和库存扣减" },
  { key: "returns", name: "退货", icon: "↩", title: "退货入库", desc: "退货订单、物流和补回库存" },
  { key: "costs", name: "成本", icon: "¥", title: "成本登记", desc: "采购、快递、代发和其他成本" },
  { key: "products", name: "商品", icon: "□", title: "商品管理", desc: "维护商品档案、分类和预警库存" },
  { key: "profits", name: "利润", icon: "▣", title: "利润计算", desc: "收入、成本、退款与利润调整" }
];

function uid(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
function today() {
  return new Date().toISOString().slice(0, 10);
}
function money(value) {
  return `¥${Number(value || 0).toFixed(2)}`;
}
function seedState() {
  const products = [
    ["汽车头枕-米白色", "汽车头枕", "只", 23.9, 29, 10],
    ["汽车头枕-雅黑色", "汽车头枕", "只", 23.9, 51, 10],
    ["腰靠-雅黑色", "腰靠", "个", 24.9, 16, 10],
    ["短款麂皮绒护肩套｜米白色", "护肩套", "个", 3.2, 23, 10]
  ].map((item, index) => ({ id: uid("p"), code: `SP${String(index + 1).padStart(3, "0")}`, name: item[0], category: item[1], unit: item[2], price: item[3], stock: item[4], warning: item[5] }));
  return {
    products,
    stockIns: [],
    stockOuts: [],
    returns: [],
    costs: [],
    profitAdjustments: [],
    channelFunds: { accounts: { general: 0, threeW: 0, taizhouYiwen: 0 }, records: [] }
  };
}

Page({
  data: {
    views,
    activeView: "dashboard",
    currentView: views[0],
    channels,
    profitTypes,
    channelNames: channels.map((item) => item.name),
    profitTypeNames: profitTypes.map((item) => item.name),
    productNames: [],
    state: seedState(),
    metrics: {},
    inventoryRows: [],
    profitRows: [],
    stockInForm: { productIndex: 0, supplier: "", price: "", quantity: "", date: today(), note: "", editingId: "" },
    stockOutForm: { productIndex: 0, quantity: "", date: today(), purpose: "销售出库" },
    returnForm: { productIndex: 0, orderNo: "", trackingNo: "", logisticsCompany: "", quantity: "", date: today(), note: "" },
    costForm: { type: "代发成本", amount: "", date: today(), note: "" },
    productForm: { name: "", category: "汽车头枕", unit: "只", price: "", stock: "", warning: "10" },
    channelForm: { channelIndex: 0, mode: "add", amount: "", note: "" },
    profitForm: { typeIndex: 0, productIndex: 0, amount: "", date: today(), note: "", editingId: "" }
  },
  onLoad() {
    const saved = wx.getStorageSync(app.globalData.storageKey);
    if (saved) this.setData({ state: saved });
    this.refresh();
  },
  save() {
    wx.setStorageSync(app.globalData.storageKey, this.data.state);
  },
  refresh() {
    const state = this.data.state;
    const productNames = state.products.map((product) => product.name);
    const stockTotal = state.products.reduce((sum, item) => sum + Number(item.stock || 0), 0);
    const inventoryValue = state.products.reduce((sum, item) => sum + Number(item.stock || 0) * Number(item.price || 0), 0);
    const warningCount = state.products.filter((item) => Number(item.stock || 0) <= Number(item.warning || 0)).length;
    const stockInCost = state.stockIns.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.price || 0), 0);
    const revenue = state.stockOuts.reduce((sum, item) => {
      const product = state.products.find((p) => p.id === item.productId);
      return sum + Number(item.quantity || 0) * Number(product?.price || 0);
    }, 0) + this.adjustTotal("revenue");
    const purchase = stockInCost + this.adjustTotal("purchase");
    const expenses = state.costs.reduce((sum, item) => sum + Number(item.amount || 0), 0) + this.adjustTotal("expense");
    const channelTotal = Object.values(state.channelFunds.accounts || {}).reduce((sum, value) => sum + Number(value || 0), 0);
    const profitRows = state.products.map((product) => {
      const outQty = state.stockOuts.filter((item) => item.productId === product.id).reduce((sum, item) => sum + Number(item.quantity || 0), 0);
      const inCost = state.stockIns.filter((item) => item.productId === product.id).reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.price || 0), 0);
      const returnQty = state.returns.filter((item) => item.productId === product.id).reduce((sum, item) => sum + Number(item.quantity || 0), 0);
      const productRevenue = outQty * Number(product.price || 0) + this.adjustTotal("revenue", product.id);
      const productPurchase = inCost + this.adjustTotal("purchase", product.id);
      const productExpense = this.adjustTotal("expense", product.id);
      return { ...product, outQty, returnQty, revenueText: money(productRevenue), purchaseText: money(productPurchase), grossText: money(productRevenue - productPurchase - productExpense) };
    }).filter((row) => row.outQty || row.returnQty || row.revenueText !== "¥0.00" || row.purchaseText !== "¥0.00");
    this.setData({
      productNames,
      inventoryRows: state.products,
      profitRows,
      metrics: {
        productCount: state.products.length,
        stockTotal,
        inventoryValue: money(inventoryValue),
        warningCount,
        stockInCost: money(stockInCost),
        revenue: money(revenue),
        purchase: money(purchase),
        expenses: money(expenses),
        netProfit: money(revenue - purchase - expenses),
        channelTotal: money(channelTotal),
        generalFunds: money(state.channelFunds.accounts?.general || 0),
        threeWFunds: money(state.channelFunds.accounts?.threeW || 0),
        taizhouFunds: money(state.channelFunds.accounts?.taizhouYiwen || 0)
      }
    });
    this.save();
  },
  adjustTotal(type, productId = "") {
    return (this.data.state.profitAdjustments || []).filter((item) => item.type === type && (!productId || item.productId === productId)).reduce((sum, item) => sum + Number(item.amount || 0), 0);
  },
  switchView(event) {
    const view = event.currentTarget.dataset.view;
    this.setData({
      activeView: view,
      currentView: views.find((item) => item.key === view) || views[0]
    });
  },
  updateForm(event) {
    const { form, field } = event.currentTarget.dataset;
    this.setData({ [`${form}.${field}`]: event.detail.value });
  },
  chooseProduct(event) {
    const form = event.currentTarget.dataset.form;
    const product = this.data.state.products[Number(event.detail.value)];
    const updates = { [`${form}.productIndex`]: Number(event.detail.value) };
    if (form === "stockInForm") updates[`${form}.price`] = product?.price || "";
    this.setData(updates);
  },
  chooseChannel(event) {
    this.setData({ "channelForm.channelIndex": Number(event.detail.value) });
  },
  chooseProfitType(event) {
    this.setData({ "profitForm.typeIndex": Number(event.detail.value) });
  },
  addProduct() {
    const form = this.data.productForm;
    if (!form.name) return wx.showToast({ title: "请填写商品名", icon: "none" });
    const state = this.data.state;
    state.products.unshift({ id: uid("p"), code: `SP${String(state.products.length + 1).padStart(3, "0")}`, name: form.name, category: form.category, unit: form.unit || "只", price: Number(form.price || 0), stock: Number(form.stock || 0), warning: Number(form.warning || 0) });
    this.setData({ state, productForm: { name: "", category: "汽车头枕", unit: "只", price: "", stock: "", warning: "10" } });
    this.refresh();
  },
  addStockIn() {
    const form = this.data.stockInForm;
    const product = this.data.state.products[Number(form.productIndex)];
    if (!product || !Number(form.quantity)) return wx.showToast({ title: "请选择商品和数量", icon: "none" });
    const state = this.data.state;
    const old = form.editingId ? state.stockIns.find((item) => item.id === form.editingId) : null;
    if (old) {
      const oldProduct = state.products.find((item) => item.id === old.productId);
      if (oldProduct) oldProduct.stock = Math.max(0, Number(oldProduct.stock || 0) - Number(old.quantity || 0));
    }
    product.stock = Number(product.stock || 0) + Number(form.quantity || 0);
    const record = { id: form.editingId || uid("in"), productId: product.id, supplier: form.supplier || "-", price: Number(form.price || product.price || 0), quantity: Number(form.quantity || 0), date: form.date || today(), note: form.note || "" };
    state.stockIns = form.editingId ? state.stockIns.map((item) => item.id === form.editingId ? record : item) : [record, ...state.stockIns];
    this.setData({ state, stockInForm: { productIndex: 0, supplier: "", price: "", quantity: "", date: today(), note: "", editingId: "" } });
    this.refresh();
  },
  editStockIn(event) {
    const record = this.data.state.stockIns.find((item) => item.id === event.currentTarget.dataset.id);
    const productIndex = this.data.state.products.findIndex((item) => item.id === record.productId);
    this.setData({ stockInForm: { productIndex, supplier: record.supplier, price: record.price, quantity: record.quantity, date: record.date, note: record.note, editingId: record.id }, activeView: "stockIn", currentView: views.find((item) => item.key === "stockIn") || views[0] });
  },
  addStockOut() {
    const form = this.data.stockOutForm;
    const product = this.data.state.products[Number(form.productIndex)];
    if (!product || !Number(form.quantity)) return wx.showToast({ title: "请选择商品和数量", icon: "none" });
    if (Number(form.quantity) > Number(product.stock || 0)) return wx.showToast({ title: "库存不足", icon: "none" });
    const state = this.data.state;
    product.stock -= Number(form.quantity || 0);
    state.stockOuts.unshift({ id: uid("out"), productId: product.id, quantity: Number(form.quantity), date: form.date || today(), purpose: form.purpose || "销售出库" });
    this.setData({ state, stockOutForm: { productIndex: 0, quantity: "", date: today(), purpose: "销售出库" } });
    this.refresh();
  },
  addReturn() {
    const form = this.data.returnForm;
    const product = this.data.state.products[Number(form.productIndex)];
    if (!product || !Number(form.quantity)) return wx.showToast({ title: "请选择商品和数量", icon: "none" });
    const state = this.data.state;
    product.stock += Number(form.quantity || 0);
    state.returns.unshift({ id: uid("ret"), productId: product.id, orderNo: form.orderNo, trackingNo: form.trackingNo, logisticsCompany: form.logisticsCompany, quantity: Number(form.quantity), date: form.date || today(), note: form.note || "" });
    this.setData({ state, returnForm: { productIndex: 0, orderNo: "", trackingNo: "", logisticsCompany: "", quantity: "", date: today(), note: "" } });
    this.refresh();
  },
  addCost() {
    const form = this.data.costForm;
    if (!Number(form.amount)) return wx.showToast({ title: "请填写金额", icon: "none" });
    const state = this.data.state;
    state.costs.unshift({ id: uid("cost"), type: form.type || "其他成本", amount: Number(form.amount), date: form.date || today(), note: form.note || "" });
    this.setData({ state, costForm: { type: "代发成本", amount: "", date: today(), note: "" } });
    this.refresh();
  },
  adjustChannel() {
    const form = this.data.channelForm;
    const channel = channels[Number(form.channelIndex)].key;
    const state = this.data.state;
    const before = Number(state.channelFunds.accounts[channel] || 0);
    const after = form.mode === "set" ? Number(form.amount || 0) : before + Number(form.amount || 0);
    state.channelFunds.accounts[channel] = after;
    state.channelFunds.records.unshift({ id: uid("fund"), channel, amount: Number(form.amount || 0), before, after, note: form.note || "", date: today() });
    this.setData({ state, channelForm: { channelIndex: 0, mode: "add", amount: "", note: "" } });
    this.refresh();
  },
  saveProfitAdjust() {
    const form = this.data.profitForm;
    const state = this.data.state;
    const type = profitTypes[Number(form.typeIndex)].key;
    const product = state.products[Number(form.productIndex)];
    const record = { id: form.editingId || uid("profit"), type, productId: product?.id || "", amount: Number(form.amount || 0), date: form.date || today(), note: form.note || "" };
    state.profitAdjustments = form.editingId ? state.profitAdjustments.map((item) => item.id === form.editingId ? record : item) : [record, ...state.profitAdjustments];
    this.setData({ state, profitForm: { typeIndex: 0, productIndex: 0, amount: "", date: today(), note: "", editingId: "" } });
    this.refresh();
  },
  deleteRecord(event) {
    const { list, id } = event.currentTarget.dataset;
    const state = this.data.state;
    state[list] = state[list].filter((item) => item.id !== id);
    this.setData({ state });
    this.refresh();
  }
});
