function showPage(pageId, event) {
  // Hide all page views
  const pages = document.querySelectorAll(".page-view");
  pages.forEach((page) => {
    page.classList.remove("active");
  });

  // Remove active class from all nav buttons
  const buttons = document.querySelectorAll(".nav-btn");
  buttons.forEach((button) => {
    button.classList.remove("active");
  });

  // Show selected page view
  const targetPage = document.getElementById(pageId);
  if (targetPage) {
    targetPage.classList.add("active");
  }

  // the Orders Section is sized to the screen, so redraw it once it is visible
  if (pageId === "summary" && typeof showSummaryOrders === "function") {
    showSummaryOrders();
  }

  // Highlight clicked button
  if (event && event.currentTarget) {
    event.currentTarget.classList.add("active");
  }
}

// check the customer boxes; if one is empty, tell the user and focus it
// today's date as YYYY-MM-DD in the user's LOCAL time
// (toISOString() uses UTC, which gives yesterday's date in the Philippines before 8 AM)
function todayString() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

// set the earliest pickable due date to today
function updateDueDateMin() {
  const box = document.getElementById("due-date");
  if (box) box.min = todayString();
}
document.addEventListener("DOMContentLoaded", updateDueDateMin);

function customerInfoFilled() {
  const fields = ["cust-name", "cust-number", "cust-address"];
  for (const id of fields) {
    const box = document.getElementById(id);
    if (box.value.trim() === "") {
      alert("Fill up the customer information first.");
      box.focus();
      return false;
    }
  }

  // due date must not be in the past
  updateDueDateMin();
  const dueBox = document.getElementById("due-date");
  const due = dueBox.value;
  if (due) {
    // allow an existing order to keep its original (already saved) due date,
    // otherwise overdue orders could never be paid
    const saved = openOrderId !== null ? findOrder(openOrderId) : null;
    const unchanged = saved && saved.due === due;

    if (due < todayString() && !unchanged) {
      alert("Due date cannot be earlier than today.");
      dueBox.focus();
      return false;
    }
  }
  return true;
}

//-----Print Button------
document.addEventListener("DOMContentLoaded", () => {
  const printBtn = document.querySelector(".print-btn");
  const receiptModal = document.getElementById("receiptModal");
  const closeReceiptBtn = document.getElementById("closeReceiptBtn");
  const confirmPrintBtn = document.getElementById("confirmPrintBtn");

  // Show modal on Print Receipt button click
  if (printBtn) {
    printBtn.addEventListener("click", () => {
      if (currentOrder.length === 0) {
        alert("Add at least one item first.");
        return;
      }
      // customer info is needed before the receipt can be shown or printed
      if (!customerInfoFilled()) return;
      fillReceipt();
      receiptModal.classList.add("active");
    });
  }

  // Hide modal on Back to Order button click
  if (closeReceiptBtn) {
    closeReceiptBtn.addEventListener("click", () => {
      receiptModal.classList.remove("active");
    });
  }

  // Hide modal on clicking background overlay
  if (receiptModal) {
    receiptModal.addEventListener("click", (e) => {
      if (e.target === receiptModal) {
        receiptModal.classList.remove("active");
      }
    });
  }

  // Launch browser printer interface
  if (confirmPrintBtn) {
    confirmPrintBtn.addEventListener("click", () => {
      if (!customerInfoFilled()) return;
      window.print();
    });
  }
});

// =====================================================
// SALES CALCULATOR + CURRENT ORDER
// =====================================================

// pricing config
const VAT_RATE = 0.12;

const PRODUCT_RATES = {
  "Glass Windows": 3000,
  "Sliding Windows": 4500,
  Chair: 2500,
  Cabinet: 5000,
  "Dinner Table": 4000,
  "Sliding Door": 5500,
  Gate: 4800,
  Aquarium: 6000,
};

// Price multiplier per material
const MATERIAL_MULTIPLIERS = {
  Aluminum: 1.0,
  Stainless: 1.4,
  Steel: 1.2,
  "Fiber Glass": 0.9,
  "Float Glass": 0.8,
  "Narra Wood": 1.8,
  "Mahogany Wood": 1.6,
};

const PRODUCT_COMPONENTS = {
  "Glass Windows": [
    { name: "Labor", basis: "piece", price: 800 },
    { name: "Aluminum Frame", basis: "piece", price: 900 },
    { name: "Rubber Gasket", basis: "piece", price: 150 },
    { name: "Nails & Screws", basis: "piece", price: 50 },
  ],
  "Sliding Windows": [
    { name: "Labor", basis: "piece", price: 1000 },
    { name: "Aluminum Frame", basis: "piece", price: 1100 },
    { name: "Rollers & Lock", basis: "piece", price: 350 },
    { name: "Nails & Screws", basis: "piece", price: 50 },
  ],
  Chair: [
    { name: "Labor", basis: "piece", price: 500 },
    { name: "Steel Legs", basis: "piece", price: 450 },
    { name: "Cushion", basis: "piece", price: 350 },
    { name: "Nails & Screws", basis: "piece", price: 40 },
  ],
  Cabinet: [
    { name: "Labor", basis: "piece", price: 1200 },
    { name: "Hinges & Handles", basis: "piece", price: 400 },
    { name: "Edge Banding", basis: "piece", price: 300 },
    { name: "Nails & Screws", basis: "piece", price: 80 },
  ],
  "Dinner Table": [
    { name: "Labor", basis: "piece", price: 1000 },
    { name: "Steel Legs", basis: "piece", price: 1200 },
    { name: "Varnish / Finish", basis: "piece", price: 400 },
    { name: "Nails & Screws", basis: "piece", price: 60 },
  ],
  "Sliding Door": [
    { name: "Labor", basis: "piece", price: 1500 },
    { name: "Aluminum Frame", basis: "piece", price: 1400 },
    { name: "Rollers & Lock", basis: "piece", price: 600 },
    { name: "Nails & Screws", basis: "piece", price: 70 },
  ],
  Gate: [
    { name: "Labor", basis: "piece", price: 1500 },
    { name: "Steel Tubing", basis: "piece", price: 1300 },
    { name: "Paint & Primer", basis: "piece", price: 500 },
    { name: "Hinges & Latch", basis: "piece", price: 350 },
    { name: "Welding Rods", basis: "piece", price: 100 },
  ],
  Aquarium: [
    { name: "Labor", basis: "piece", price: 900 },
    { name: "Silicone Sealant", basis: "piece", price: 250 },
    { name: "Base Stand", basis: "piece", price: 1500 },
  ],
};

function buildComponents(product, areaM2, qty) {
  return (PRODUCT_COMPONENTS[product] || []).map((c) => {
    const isArea = c.basis === "m2";
    const pcs = c.pcs || 1; // pieces per product (older saved prices have none)
    return {
      name: c.name,
      qtyLabel: isArea ? `${(areaM2 * qty).toFixed(2)} m²` : String(pcs * qty),
      amount: isArea ? c.price * areaM2 * qty : c.price * pcs * qty,
    };
  });
}

// Product selection.
const PRODUCT_MATERIALS = {
  "Glass Windows": ["Fiber Glass", "Float Glass"],
  "Sliding Windows": ["Fiber Glass", "Float Glass"],
  Chair: ["Narra Wood", "Mahogany Wood"],
  Cabinet: ["Narra Wood", "Mahogany Wood"],
  "Dinner Table": ["Narra Wood", "Mahogany Wood"],
  "Sliding Door": ["Fiber Glass", "Float Glass"],
  Gate: ["Steel", "Stainless"],
  Aquarium: ["Float Glass", "Fiber Glass"],
};

// Gray out (disable) materials that don't fit the selected product
function updateMaterialOptions() {
  const product = document.getElementById("calc-product").value;
  const materialSel = document.getElementById("calc-material");
  const allowed = PRODUCT_MATERIALS[product] || [];

  Array.from(materialSel.options).forEach((opt) => {
    if (opt.value === "") return;
    opt.disabled = !allowed.includes(opt.value);
  });

  if (materialSel.selectedOptions[0]?.disabled) materialSel.value = "";
}

let currentOrder = [];
let nextItemId = 1;

const peso = (n) =>
  n.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

function escapeHTML(str) {
  return String(str).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
}

// Read + validate the calculator form. Returns {error} or {item}
function readCalculatorForm() {
  const width = parseFloat(document.getElementById("calc-width").value);
  const height = parseFloat(document.getElementById("calc-height").value);
  const product = document.getElementById("calc-product").value;
  const rate = PRODUCT_RATES[product];
  const material = document.getElementById("calc-material").value;
  const qty = parseInt(document.getElementById("calc-qty").value, 10);

  if (!(width > 0) || !(height > 0))
    return { error: "Enter a valid width and height (mm)." };
  if (!product) return { error: "Select a product type." };
  if (!(rate > 0)) return { error: "No rate set for this product." };
  if (!material) return { error: "Select a material type." };
  if (!(qty >= 1)) return { error: "Quantity must be at least 1." };

  const areaM2 = (width * height) / 1_000_000;
  const multiplier = MATERIAL_MULTIPLIERS[material] ?? 1;
  const unitPrice = areaM2 * rate * multiplier;
  const price = unitPrice * qty;
  const components = buildComponents(product, areaM2, qty);
  const componentsTotal = components.reduce((s, c) => s + c.amount, 0);

  return {
    item: {
      product,
      material,
      width,
      height,
      qty,
      areaM2,
      unitPrice,
      price,
      components,
      componentsTotal,
      total: price + componentsTotal,
    },
  };
}

function getTotals() {
  const subtotal = currentOrder.reduce((sum, i) => sum + i.total, 0);
  const vat = subtotal * VAT_RATE;
  return { subtotal, vat, total: subtotal + vat };
}

function renderOrder(filter = "") {
  const q = filter.trim().toLowerCase();

  document.querySelectorAll(".order-items-body").forEach((tbody) => {
    const rows = currentOrder.filter((i) =>
      `${i.product} ${i.material} ${i.components.map((c) => c.name).join(" ")}`
        .toLowerCase()
        .includes(q),
    );

    if (rows.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="empty-order">${
        currentOrder.length === 0 ? "No items added yet." : "No matching items."
      }</td></tr>`;
      return;
    }

    tbody.innerHTML = rows
      .map((i) => {
        const componentRows = i.components
          .map(
            (c) => `
        <tr class="component-row">
          <td>↳ ${escapeHTML(c.name)}</td>
          <td>-</td>
          <td>${c.qtyLabel}</td>
          <td>₱ ${peso(c.amount)}</td>
          <td></td>
        </tr>`,
          )
          .join("");

        return `
        <tr class="main-row">
          <td>
            <strong>${escapeHTML(i.product)}</strong><br />
            <small>${escapeHTML(i.material)}</small>
          </td>
          <td>${i.width}×${i.height} mm</td>
          <td>${i.qty}</td>
          <td>₱ ${peso(i.price)}</td>
          <td>
            <button class="delete-btn" data-id="${i.id}" aria-label="Remove item">
              <img src="assets/trash.svg" alt="delete button" class="delete-icon" />
            </button>
          </td>
        </tr>${componentRows}`;
      })
      .join("");
  });

  renderTotals();
}

// Show the total whenever there are items in the order
function renderTotals() {
  const { subtotal, vat, total } = getTotals();
  const hasItems = currentOrder.length > 0;

  document
    .querySelectorAll(".order-total")
    .forEach((el) => (el.textContent = hasItems ? peso(total) : "0.00"));
  document.querySelectorAll(".order-note").forEach((el) => {
    if (hasItems) {
      el.textContent = `Subtotal ₱ ${peso(subtotal)} + 12% VAT ₱ ${peso(vat)}. Valid for 30 days.`;
    } else {
      el.textContent = "Includes 12% VAT. Valid for 30 days.";
    }
  });
}

function updatePreview() {
  const preview = document.getElementById("calc-preview");
  if (!preview) return;
  const result = readCalculatorForm();
  if (result.item) {
    const i = result.item;
    preview.textContent = `${i.areaM2.toFixed(2)} m² × ${i.qty}: ₱ ${peso(i.price)} + materials/labor ₱ ${peso(i.componentsTotal)} = ₱ ${peso(i.total)}`;
  } else {
    preview.textContent = "";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const productSel = document.getElementById("calc-product");
  const errorEl = document.getElementById("calc-error");
  if (!productSel) return;

  productSel.addEventListener("change", () => {
    updateMaterialOptions();
    updatePreview();
  });
  updateMaterialOptions();

  // Live price preview
  ["calc-width", "calc-height", "calc-material", "calc-qty"].forEach((id) => {
    const el = document.getElementById(id);
    el.addEventListener("input", updatePreview);
    el.addEventListener("change", updatePreview);
  });

  // Add to order
  document.getElementById("addItemBtn").addEventListener("click", () => {
    const result = readCalculatorForm();
    if (result.error) {
      errorEl.textContent = result.error;
      return;
    }
    errorEl.textContent = "";

    // a saved order is on screen, so this item starts a new order
    if (openOrderId !== null) clearSummary();

    currentOrder.push({ id: nextItemId++, ...result.item });
    renderOrder();

    // Reset the form for the next item
    ["calc-width", "calc-height"].forEach(
      (id) => (document.getElementById(id).value = ""),
    );
    productSel.value = "";
    document.getElementById("calc-material").value = "";
    updateMaterialOptions();
    document.getElementById("calc-qty").value = 1;
    updatePreview();
  });

  // Delete item (works on both calculator and summary tables)
  document.addEventListener("click", (e) => {
    const btn = e.target.closest(".order-items-body .delete-btn");
    if (!btn) return;
    // a paid order is final, but a saved unpaid order can still be edited
    if (openOrderId !== null) {
      const saved = findOrder(openOrderId);
      if (saved && saved.balance <= 0) {
        alert("This order is already paid and can no longer be edited.");
        return;
      }
    }
    currentOrder = currentOrder.filter((i) => i.id !== Number(btn.dataset.id));
    renderOrder();
  });

  // Search items
  document.querySelectorAll(".item-search").forEach((input) => {
    input.addEventListener("input", () => renderOrder(input.value));
  });

  // Confirm button: save the order (not paid yet)
  document.getElementById("saveOrderBtn").addEventListener("click", () => {
    const openSaved = openOrderId === null ? null : findOrder(openOrderId);

    // editing an order that was saved earlier (unpaid): keep saving the changes
    if (openSaved && openSaved.balance > 0) {
      const order = saveCurrentOrder(false);
      if (!order) return;
      errorEl.textContent = "";
      showOrderButtons();
      alert(`Order #${order.id} saved. Total: ₱ ${peso(order.total)}`);
      return;
    }

    // new order: Confirm only checks the customer info, it does NOT save the
    // order. The order reaches the Order Summary when payment is confirmed.
    if (!customerInfoFilled()) return;
    infoConfirmed = true;
    showOrderButtons();
  });

  // changing any customer box means the info needs to be confirmed again
  ["cust-name", "cust-number", "cust-address", "due-date"].forEach((id) => {
    document.getElementById(id).addEventListener("input", () => {
      if (!infoConfirmed) return;
      infoConfirmed = false;
      showOrderButtons();
    });
  });

  // Confirm Payment button: save the order AND mark it as paid
  document.getElementById("confirmPaymentBtn").addEventListener("click", () => {
    const order = saveCurrentOrder(true);
    if (!order) return;
    errorEl.textContent = "";
    alert(`Order #${order.id} is paid. Total: ₱ ${peso(order.total)}`);

    // empty the calculator for the next customer, then show the Order Summary
    clearSummary();
    goToSummary();
  });

  renderOrder();
});

//-----Sidebar toggle------
document.addEventListener("DOMContentLoaded", () => {
  const toggleBtn = document.getElementById("sidebarToggle");
  if (!toggleBtn) return;

  // open or close the sidebar and save it
  function setSidebar(closed) {
    if (closed) {
      document.body.classList.add("sidebar-collapsed");
    } else {
      document.body.classList.remove("sidebar-collapsed");
    }
    try {
      localStorage.setItem("ala-sidebar", closed ? "closed" : "open");
    } catch {}
  }

  // use the last saved state
  try {
    if (localStorage.getItem("ala-sidebar") === "closed") {
      document.body.classList.add("sidebar-collapsed");
    }
  } catch {}

  toggleBtn.addEventListener("click", () => {
    const isClosed = document.body.classList.contains("sidebar-collapsed");
    setSidebar(!isClosed);
  });
});

//-----Price management------
const PRICING_KEY = "ala-pricing";

function savePricing() {
  const data = {
    rates: PRODUCT_RATES,
    multipliers: MATERIAL_MULTIPLIERS,
    allowed: PRODUCT_MATERIALS,
    components: PRODUCT_COMPONENTS,
  };
  try {
    localStorage.setItem(PRICING_KEY, JSON.stringify(data));
  } catch {}
}

// empty an object then fill it with the saved values
function copyInto(target, source) {
  for (const key in target) delete target[key];
  for (const key in source) target[key] = source[key];
}

function loadPricing() {
  try {
    const text = localStorage.getItem(PRICING_KEY);
    if (!text) return;
    const data = JSON.parse(text);
    copyInto(PRODUCT_RATES, data.rates);
    copyInto(MATERIAL_MULTIPLIERS, data.multipliers);
    copyInto(PRODUCT_MATERIALS, data.allowed);
    copyInto(PRODUCT_COMPONENTS, data.components);
  } catch {}
}
loadPricing();

function showMessage(text, isError) {
  const msg = document.getElementById("pm-msg");
  msg.textContent = text;
  msg.style.color = isError ? "#b91c1c" : "#15803d";
}

// check if a name is already used (ignores capital letters)
function nameExists(obj, name) {
  for (const key in obj) {
    if (key.toLowerCase() === name.toLowerCase()) return true;
  }
  return false;
}

// refill the calculator dropdowns with the current products and materials
function updateCalculatorDropdowns() {
  const productSel = document.getElementById("calc-product");
  const materialSel = document.getElementById("calc-material");
  const oldProduct = productSel.value;
  const oldMaterial = materialSel.value;

  productSel.innerHTML = '<option value="">Select Product...</option>';
  for (const name in PRODUCT_RATES) {
    productSel.innerHTML += "<option>" + escapeHTML(name) + "</option>";
  }

  materialSel.innerHTML = '<option value="">Select Material...</option>';
  for (const name in MATERIAL_MULTIPLIERS) {
    materialSel.innerHTML += "<option>" + escapeHTML(name) + "</option>";
  }

  if (oldProduct in PRODUCT_RATES) productSel.value = oldProduct;
  if (oldMaterial in MATERIAL_MULTIPLIERS) materialSel.value = oldMaterial;
  updateMaterialOptions();
  updatePreview();
}

// draw the products, materials and components tables
function showPricing() {
  const products = Object.keys(PRODUCT_RATES);
  const materials = Object.keys(MATERIAL_MULTIPLIERS);

  // products table
  let html = "";
  for (let i = 0; i < products.length; i++) {
    const name = products[i];
    const allowed = PRODUCT_MATERIALS[name] || [];

    let boxes = "";
    for (let m = 0; m < materials.length; m++) {
      const checked = allowed.includes(materials[m]) ? "checked" : "";
      boxes += `
        <label class="pm-check">
          <input type="checkbox" class="pm-allow" ${checked}
            onchange="toggleMaterial(${i}, ${m}, this.checked)" />
          ${escapeHTML(materials[m])}
        </label>`;
    }

    html += `
      <tr>
        <td><strong>${escapeHTML(name)}</strong></td>
        <td><input type="number" class="pm-input" id="rate-${i}" min="0" step="0.01" value="${PRODUCT_RATES[name]}" /></td>
        <td><div class="pm-mats">${boxes}</div></td>
        <td class="pm-actions">
          <button class="pm-btn pm-update-product" onclick="updateProduct(${i})">Update</button>
          <button class="pm-btn pm-del pm-remove-product" onclick="removeProduct(${i})">Remove</button>
        </td>
      </tr>`;
  }
  document.getElementById("pm-products-body").innerHTML = html;

  // materials table
  html = "";
  for (let i = 0; i < materials.length; i++) {
    const name = materials[i];
    html += `
      <tr>
        <td><strong>${escapeHTML(name)}</strong></td>
        <td><input type="number" class="pm-input" id="mult-${i}" min="0" step="0.01" value="${MATERIAL_MULTIPLIERS[name]}" /></td>
        <td class="pm-actions">
          <button class="pm-btn pm-update-material" onclick="updateMaterial(${i})">Update</button>
          <button class="pm-btn pm-del pm-remove-material" onclick="removeMaterial(${i})">Remove</button>
        </td>
      </tr>`;
  }
  document.getElementById("pm-materials-body").innerHTML = html;

  // product dropdown for the components table
  const compSel = document.getElementById("pm-comp-product");
  const oldChoice = compSel.value;
  compSel.innerHTML = "";
  for (let i = 0; i < products.length; i++) {
    compSel.innerHTML += "<option>" + escapeHTML(products[i]) + "</option>";
  }
  if (products.includes(oldChoice)) compSel.value = oldChoice;

  showComponents();
}

function showComponents() {
  const product = document.getElementById("pm-comp-product").value;
  const list = PRODUCT_COMPONENTS[product] || [];
  const body = document.getElementById("pm-components-body");

  if (list.length === 0) {
    body.innerHTML =
      '<tr><td colspan="5">No items yet for this product.</td></tr>';
    return;
  }

  let html = "";
  for (let i = 0; i < list.length; i++) {
    const basis = list[i].basis === "m2" ? "per m²" : "per piece";

    // pieces only apply to "per piece" items
    let pcsCell = "-";
    if (list[i].basis !== "m2") {
      pcsCell = `<input type="number" class="pm-input pm-pcs" id="comp-pcs-${i}" min="1" step="1" value="${list[i].pcs || 1}" />`;
    }

    html += `
      <tr>
        <td>${escapeHTML(list[i].name)}</td>
        <td>${basis}</td>
        <td>${pcsCell}</td>
        <td><input type="number" class="pm-input" id="comp-price-${i}" min="0" step="0.01" value="${list[i].price}" /></td>
        <td class="pm-actions">
          <button class="pm-btn pm-update-comp" onclick="updateComponent(${i})">Update</button>
          <button class="pm-btn pm-del pm-remove-comp" onclick="removeComponent(${i})">Remove</button>
        </td>
      </tr>`;
  }
  body.innerHTML = html;
}

// save, redraw everything and show a message
function pricingChanged(message) {
  savePricing();
  showPricing();
  updateCalculatorDropdowns();
  showMessage(message, false);
}

// ----- products -----
function updateProduct(i) {
  const name = Object.keys(PRODUCT_RATES)[i];
  const rate = parseFloat(document.getElementById("rate-" + i).value);
  if (!(rate > 0)) {
    showMessage("Enter a valid rate greater than 0.", true);
    return;
  }
  PRODUCT_RATES[name] = rate;
  pricingChanged(name + " rate updated to ₱ " + peso(rate) + " per m².");
}

function removeProduct(i) {
  const name = Object.keys(PRODUCT_RATES)[i];
  if (!confirm("Remove " + name + "?")) return;
  delete PRODUCT_RATES[name];
  delete PRODUCT_MATERIALS[name];
  delete PRODUCT_COMPONENTS[name];
  pricingChanged(name + " removed.");
}

function addProduct() {
  const name = document.getElementById("pm-new-product").value.trim();
  const rate = parseFloat(document.getElementById("pm-new-product-rate").value);

  if (name === "") return showMessage("Enter a product name.", true);
  if (nameExists(PRODUCT_RATES, name))
    return showMessage("That product already exists.", true);
  if (!(rate > 0))
    return showMessage("Enter a valid rate greater than 0.", true);

  PRODUCT_RATES[name] = rate;
  PRODUCT_MATERIALS[name] = [];
  PRODUCT_COMPONENTS[name] = [];
  document.getElementById("pm-new-product").value = "";
  document.getElementById("pm-new-product-rate").value = "";
  pricingChanged(name + " added. Tick its allowed materials in the table.");
}

// tick or untick a material for a product
function toggleMaterial(productIndex, materialIndex, isChecked) {
  const product = Object.keys(PRODUCT_RATES)[productIndex];
  const material = Object.keys(MATERIAL_MULTIPLIERS)[materialIndex];
  const list = PRODUCT_MATERIALS[product] || [];

  if (isChecked && !list.includes(material)) {
    list.push(material);
  }
  if (!isChecked && list.includes(material)) {
    list.splice(list.indexOf(material), 1);
  }

  PRODUCT_MATERIALS[product] = list;
  savePricing();
  updateCalculatorDropdowns();
  showMessage("Materials for " + product + " updated.", false);
}

// ----- materials -----
function updateMaterial(i) {
  const name = Object.keys(MATERIAL_MULTIPLIERS)[i];
  const mult = parseFloat(document.getElementById("mult-" + i).value);
  if (!(mult > 0)) {
    showMessage("Enter a valid multiplier greater than 0.", true);
    return;
  }
  MATERIAL_MULTIPLIERS[name] = mult;
  pricingChanged(name + " multiplier updated to " + mult + ".");
}

function removeMaterial(i) {
  const name = Object.keys(MATERIAL_MULTIPLIERS)[i];
  if (!confirm("Remove " + name + "?")) return;
  delete MATERIAL_MULTIPLIERS[name];
  // also take it out of every product's allowed list
  for (const product in PRODUCT_MATERIALS) {
    PRODUCT_MATERIALS[product] = PRODUCT_MATERIALS[product].filter(
      (m) => m !== name,
    );
  }
  pricingChanged(name + " removed.");
}

function addMaterial() {
  const name = document.getElementById("pm-new-material").value.trim();
  const mult = parseFloat(
    document.getElementById("pm-new-material-mult").value,
  );

  if (name === "") return showMessage("Enter a material name.", true);
  if (nameExists(MATERIAL_MULTIPLIERS, name))
    return showMessage("That material already exists.", true);
  if (!(mult > 0))
    return showMessage("Enter a valid multiplier greater than 0.", true);

  MATERIAL_MULTIPLIERS[name] = mult;
  document.getElementById("pm-new-material").value = "";
  document.getElementById("pm-new-material-mult").value = "";
  pricingChanged(name + " added. Tick the products that can use it.");
}

// ----- components (labor, frames, screws...) -----
function updateComponent(i) {
  const product = document.getElementById("pm-comp-product").value;
  const price = parseFloat(document.getElementById("comp-price-" + i).value);
  if (!(price >= 0)) {
    showMessage("Enter a valid price.", true);
    return;
  }
  const item = PRODUCT_COMPONENTS[product][i];

  // pieces only exist for "per piece" items
  if (item.basis !== "m2") {
    const pcs = parseInt(document.getElementById("comp-pcs-" + i).value, 10);
    if (!(pcs >= 1)) {
      showMessage("Pieces must be at least 1.", true);
      return;
    }
    item.pcs = pcs;
  }

  item.price = price;
  pricingChanged(
    item.name +
      " updated: " +
      (item.pcs || 1) +
      " pc(s) at ₱ " +
      peso(price) +
      ".",
  );
}

function removeComponent(i) {
  const product = document.getElementById("pm-comp-product").value;
  const removed = PRODUCT_COMPONENTS[product].splice(i, 1);
  pricingChanged(removed[0].name + " removed from " + product + ".");
}

function addComponent() {
  const product = document.getElementById("pm-comp-product").value;
  const name = document.getElementById("pm-new-comp").value.trim();
  const basis = document.getElementById("pm-new-comp-basis").value;
  const price = parseFloat(document.getElementById("pm-new-comp-price").value);
  let pcs = parseInt(document.getElementById("pm-new-comp-pcs").value, 10);

  if (product === "") return showMessage("Add a product first.", true);
  if (name === "") return showMessage("Enter an item name.", true);
  if (!(price >= 0)) return showMessage("Enter a valid price.", true);

  // empty pieces box means 1 piece; per m² items don't use pieces
  if (isNaN(pcs)) pcs = 1;
  if (!(pcs >= 1)) return showMessage("Pieces must be at least 1.", true);
  if (basis === "m2") pcs = 1;

  if (!PRODUCT_COMPONENTS[product]) PRODUCT_COMPONENTS[product] = [];
  PRODUCT_COMPONENTS[product].push({
    name: name,
    basis: basis,
    pcs: pcs,
    price: price,
  });
  document.getElementById("pm-new-comp").value = "";
  document.getElementById("pm-new-comp-pcs").value = "";
  document.getElementById("pm-new-comp-price").value = "";
  pricingChanged(name + " added to " + product + ".");
}

function resetPrices() {
  if (!confirm("Reset all prices back to the default values?")) return;
  try {
    localStorage.removeItem(PRICING_KEY);
  } catch {}
  location.reload();
}

// connect the add / reset buttons and draw the tables
document.addEventListener("DOMContentLoaded", () => {
  if (!document.getElementById("pricing")) return;

  document.getElementById("pm-add-product").onclick = addProduct;
  document.getElementById("pm-add-material").onclick = addMaterial;
  document.getElementById("pm-add-comp").onclick = addComponent;
  document.getElementById("pm-reset").onclick = resetPrices;
  document.getElementById("pm-comp-product").onchange = showComponents;

  showPricing();
  updateCalculatorDropdowns();
});

//-----Unpaid orders------
const ORDERS_KEY = "ala-orders";
let savedOrders = [];

function loadOrders() {
  try {
    const text = localStorage.getItem(ORDERS_KEY);
    if (text) savedOrders = JSON.parse(text);
  } catch {}
}
loadOrders();

function storeOrders() {
  try {
    localStorage.setItem(ORDERS_KEY, JSON.stringify(savedOrders));
  } catch {}
  showDeadlines();
  showSummaryOrders();
}

// Pending Orders table on the dashboard (paid orders only)
const STATUS_LIST = [
  ["No status", "no-status"],
  ["Cutting", "badge-cutting"],
  ["Assembly", "badge-assembly"],
  ["Installing", "badge-installing"],
  ["Pick up", "badge-pickup"],
  ["Done", "badge-done"],
];

// ----- Approaching Deadlines (dashboard) -----
const URGENT_DAYS = 3; // due in this many days or less = red card

// turn the saved due date into a Date (or null when it can't be read)
function parseDue(text) {
  if (!text) return null;
  const d = /^\d{4}-\d{2}-\d{2}$/.test(text)
    ? new Date(text + "T00:00:00")
    : new Date(text);
  return isNaN(d) ? null : d;
}

// days from today until the due date (negative = overdue)
function daysLeft(due) {
  const d = parseDue(due);
  if (!d) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return Math.round((d - today) / 86400000);
}

function dueLabel(days) {
  if (days === null) return "Due: not set";
  if (days < 0) {
    const n = -days;
    return "Overdue: " + n + (n === 1 ? " day" : " days");
  }
  if (days === 0) return "Due: today";
  return "Due: " + days + (days === 1 ? " day" : " days");
}

// the due date shown in the details popup
function formatDueText(text) {
  const d = parseDue(text);
  return d ? formatDate(d.toISOString()) : text;
}

// paid orders that are not finished yet, closest deadline first
function getDeadlineOrders() {
  const search = document.getElementById("dashSearch");
  const q = search ? search.value.trim().toLowerCase() : "";

  const list = savedOrders.filter((o) => {
    if (o.balance > 0 || o.status === "Done") return false;
    if (q === "") return true;
    const products = o.items.map((i) => i.product).join(" ");
    return `#${o.id} ${o.name} ${products}`.toLowerCase().includes(q);
  });

  list.sort((a, b) => {
    const da = daysLeft(a.due);
    const db = daysLeft(b.due);
    if (da === null && db === null) return a.id - b.id;
    if (da === null) return 1;
    if (db === null) return -1;
    return da - db || a.id - b.id;
  });
  return list;
}

function showDeadlines() {
  const track = document.getElementById("deadlineTrack");
  if (!track) return;

  const orders = getDeadlineOrders();
  let urgent = 0;
  let html = "";

  for (const order of orders) {
    const days = daysLeft(order.due);
    const isUrgent = days !== null && days <= URGENT_DAYS;
    if (isUrgent) urgent++;

    const names = [];
    order.items.forEach((it) => {
      if (!names.includes(it.product)) names.push(it.product);
    });

    const items = order.items
      .map(
        (it) =>
          `<li><strong>${it.qty}x</strong> ${escapeHTML(it.product)} (${escapeHTML(it.material)}, ${it.width}×${it.height} mm)</li>`,
      )
      .join("");

    const status = order.status || "No status";
    const tagClass =
      (STATUS_LIST.find((s) => s[0] === status) || [])[1] || "no-status";

    html += `
      <article class="dl-card${isUrgent ? " urgent" : ""}">
        <div class="dl-top">
          <span class="dl-id">ID:#${order.id}</span>
          <span class="dl-tag ${tagClass}">${escapeHTML(status)}</span>
        </div>
        <p class="dl-name">${escapeHTML(order.name)}</p>
        <p class="dl-sub">${escapeHTML(names.join(", "))}</p>
        <ul class="dl-items">${items}</ul>
        <div class="dl-due">${dueLabel(days)}</div>
        <div class="dl-actions">
          <button class="dl-details" data-id="${order.id}">Customer Details</button>
          <button class="dl-done" data-id="${order.id}">Done</button>
        </div>
      </article>`;
  }

  if (html === "") {
    html = `<p class="dl-empty">No approaching deadlines. Paid orders that are not done yet will show up here.</p>`;
  }

  track.innerHTML = html;
  document.getElementById("deadlineCount").textContent = urgent;
  updateDeadlineArrows();
  showDashboardStats();
}

// Today's Revenue + Orders Completed cards
function showDashboardStats() {
  const revenueEl = document.getElementById("revenueToday");
  const doneEl = document.getElementById("completedCount");
  if (!revenueEl || !doneEl) return;

  const today = new Date().toDateString();
  let revenue = 0;
  let done = 0;
  savedOrders.forEach((o) => {
    if (o.balance > 0) return;
    if (new Date(o.date).toDateString() === today) revenue += o.total;
    if (o.status === "Done") done++;
  });

  revenueEl.textContent = "₱ " + peso(revenue);
  doneEl.textContent = String(done).padStart(2, "0");
}

// show the left / right arrows only when there is more to scroll
function updateDeadlineArrows() {
  const track = document.getElementById("deadlineTrack");
  const prev = document.getElementById("deadlinePrev");
  const next = document.getElementById("deadlineNext");
  if (!track || !prev || !next) return;

  const max = track.scrollWidth - track.clientWidth;
  prev.hidden = track.scrollLeft <= 4;
  next.hidden = max <= 4 || track.scrollLeft >= max - 4;
}

document.addEventListener("DOMContentLoaded", () => {
  const track = document.getElementById("deadlineTrack");
  if (!track) return;

  showDeadlines();

  document
    .getElementById("dashSearch")
    .addEventListener("input", showDeadlines);

  // scroll arrows
  const step = () => Math.max(track.clientWidth * 0.8, 300);
  document.getElementById("deadlineNext").addEventListener("click", () => {
    track.scrollBy({ left: step(), behavior: "smooth" });
  });
  document.getElementById("deadlinePrev").addEventListener("click", () => {
    track.scrollBy({ left: -step(), behavior: "smooth" });
  });
  track.addEventListener("scroll", updateDeadlineArrows);
  window.addEventListener("resize", updateDeadlineArrows);

  // Customer Details = same popup as the "view" button; Done = finish order
  track.addEventListener("click", (e) => {
    const detailsBtn = e.target.closest(".dl-details");
    if (detailsBtn) {
      openOrderDetail(Number(detailsBtn.dataset.id));
      return;
    }
    const doneBtn = e.target.closest(".dl-done");
    if (doneBtn) {
      const order = findOrder(Number(doneBtn.dataset.id));
      if (!order) return;
      if (!confirm("Mark order #" + order.id + " as done?")) return;
      order.status = "Done";
      storeOrders();
    }
  });
});

// Aug-09-26 style date
function formatDate(isoText) {
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const d = new Date(isoText);
  const day = String(d.getDate()).padStart(2, "0");
  const year = String(d.getFullYear()).slice(2);
  return months[d.getMonth()] + "-" + day + "-" + year;
}

function addSavedOrder(
  name,
  contact,
  address,
  items,
  subtotal,
  vat,
  total,
  due,
) {
  // new order id = highest id + 1 (starts at 1001)
  let nextId = 1001;
  for (let i = 0; i < savedOrders.length; i++) {
    if (savedOrders[i].id >= nextId) nextId = savedOrders[i].id + 1;
  }

  const roundedTotal = Math.round(total * 100) / 100;
  savedOrders.push({
    id: nextId,
    name: name,
    contact: contact,
    address: address,
    due: due || "",
    items: items,
    subtotal: subtotal,
    vat: vat,
    total: roundedTotal,
    balance: roundedTotal,
    date: new Date().toISOString(),
  });
  storeOrders();
  showSummaryOrders();
  return nextId;
}

// draw the Orders Section table on the Order Summary page
function showSummaryOrders() {
  const body = document.getElementById("unpaid-body");
  if (!body) return;

  const search = document
    .getElementById("unpaid-search")
    .value.trim()
    .toLowerCase();
  let html = "";
  let rows = 0;

  // newest order first
  for (let i = savedOrders.length - 1; i >= 0; i--) {
    const order = savedOrders[i];

    // product names without repeats
    const names = [];
    for (let k = 0; k < order.items.length; k++) {
      if (!names.includes(order.items[k].product))
        names.push(order.items[k].product);
    }

    const text = (
      order.name +
      " #" +
      order.id +
      " " +
      names.join(", ")
    ).toLowerCase();
    if (!text.includes(search)) continue;

    // status dropdown (same options as the dashboard)
    const current = order.status || "No status";
    let options = "";
    for (let k = 0; k < STATUS_LIST.length; k++) {
      const selected = STATUS_LIST[k][0] === current ? " selected" : "";
      options += `<option class="${STATUS_LIST[k][1]}"${selected}>${STATUS_LIST[k][0]}</option>`;
    }

    html += `
      <tr>
        <td class="remove-cell" title="Remove order" onclick="deleteSavedOrder(${order.id})">x</td>
        <td>#${order.id}</td>
        <td>${escapeHTML(order.name)}</td>
        <td>${formatDate(order.date)}</td>
        <td>
          <select class="badge status-select" data-id="${order.id}">${options}</select>
        </td>
        <td><button class="view-btn" onclick="openOrderDetail(${order.id})">view</button></td>
      </tr>`;
    rows++;
  }

  // fill the rest of the screen with empty rows (at least 10)
  const target = fitSummaryRows();
  for (let i = rows; i < target; i++) {
    html += "<tr><td></td><td></td><td></td><td></td><td></td><td></td></tr>";
  }
  body.innerHTML = html;
}

// one row = 58px pill + 8px gap (keep in sync with .unpaid-tables td in style.css)
const SUMMARY_ROW_PITCH = 66;
const SUMMARY_MIN_ROWS = 10;

// sizes the scroll box down to the bottom of the screen and returns
// how many rows are needed to fill it (never less than SUMMARY_MIN_ROWS)
function fitSummaryRows() {
  const box = document.querySelector(".unpaid-scroll");
  // page is hidden (not measurable yet): just use the minimum
  if (!box || box.offsetParent === null) return SUMMARY_MIN_ROWS;

  const top = box.getBoundingClientRect().top + window.scrollY;
  const available = Math.max(300, window.innerHeight - top - 40);
  box.style.maxHeight = available + "px";

  const header = box.querySelector("thead").offsetHeight;
  const fit = Math.ceil((available - header) / SUMMARY_ROW_PITCH);
  return Math.max(SUMMARY_MIN_ROWS, fit);
}

// redraw when the window size changes
window.addEventListener("resize", () => showSummaryOrders());

function findOrder(id) {
  for (let i = 0; i < savedOrders.length; i++) {
    if (savedOrders[i].id === id) return savedOrders[i];
  }
  return null;
}

// set to an order id while a saved order is loaded for payment
let openOrderId = null;

// go to the Order Summary page and light up its menu button
function goToSummary() {
  showPage("summary");
  document.getElementById("navSummary").classList.add("active");
}

// go to the Sales Calculator page and light up its menu button
function goToCalculator() {
  showPage("calculator");
  document.getElementById("navCalculator").classList.add("active");
}

// the left button says "Save Changes" while editing a saved (unpaid) order
// true after the user pressed Confirm and the customer info is complete
let infoConfirmed = false;

function showOrderButtons() {
  const order = openOrderId === null ? null : findOrder(openOrderId);
  const saveBtn = document.getElementById("saveOrderBtn");

  saveBtn.classList.toggle("confirmed", infoConfirmed);
  if (order !== null && order.balance > 0) {
    saveBtn.textContent = "Save Changes";
  } else if (infoConfirmed) {
    saveBtn.textContent = "✓ Confirmed";
  } else {
    saveBtn.textContent = "Confirm";
  }
}

// Save what is on the screen into the Order Summary list.
// markAsPaid = true  -> the order is saved as PAID
// markAsPaid = false -> the order is saved as UNPAID
// Returns the saved order, or null if something is missing.
function saveCurrentOrder(markAsPaid) {
  if (currentOrder.length === 0) {
    alert("Add at least one item first.");
    return null;
  }
  if (!customerInfoFilled()) return null;

  const name = document.getElementById("cust-name").value.trim();
  const contact = document.getElementById("cust-number").value.trim();
  const address = document.getElementById("cust-address").value.trim();
  const due = document.getElementById("due-date").value.trim();
  const { subtotal, vat, total } = getTotals();
  const roundedTotal = Math.round(total * 100) / 100;

  let order = openOrderId === null ? null : findOrder(openOrderId);

  if (order && order.balance <= 0) {
    alert("This order is already paid and can no longer be edited.");
    return null;
  }

  if (order) {
    // already saved before: update it
    order.name = name;
    order.contact = contact;
    order.address = address;
    order.due = due;
    order.items = currentOrder.slice();
    order.subtotal = subtotal;
    order.vat = vat;
    order.total = roundedTotal;
  } else {
    // brand new order
    openOrderId = addSavedOrder(
      name,
      contact,
      address,
      currentOrder.slice(),
      subtotal,
      vat,
      total,
      due,
    );
    order = findOrder(openOrderId);
  }

  // balance 0 means paid
  order.balance = markAsPaid ? 0 : roundedTotal;
  storeOrders();
  return order;
}

// PAY button: load the customer info and items into the Order Summary
function loadOrderForPayment(id) {
  const order = findOrder(id);
  if (!order) return;

  // don't throw away an order that is still being made
  if (openOrderId === null && currentOrder.length > 0) {
    if (!confirm("This will replace the order you are working on. Continue?"))
      return;
  }

  openOrderId = id;
  infoConfirmed = false;
  currentOrder = order.items.slice();

  document.getElementById("cust-name").value = order.name;
  document.getElementById("cust-number").value = order.contact;
  document.getElementById("cust-address").value = order.address;
  document.getElementById("due-date").value = order.due || "";

  renderOrder();
  showOrderButtons();
  goToCalculator();
}

// empty the summary page (after paying or cancelling)
function clearSummary() {
  openOrderId = null;
  infoConfirmed = false;
  currentOrder = [];

  document.getElementById("cust-name").value = "";
  document.getElementById("cust-number").value = "";
  document.getElementById("cust-address").value = "";
  document.getElementById("due-date").value = "";

  renderOrder();
  showOrderButtons();
  showSummaryOrders();
}

function deleteSavedOrder(id) {
  if (!confirm("Remove order #" + id + "?")) return;
  savedOrders = savedOrders.filter((o) => o.id !== id);
  storeOrders();
  if (id === openOrderId) clearSummary();
  showSummaryOrders();
}

document.addEventListener("DOMContentLoaded", () => {
  const searchBox = document.getElementById("unpaid-search");
  if (!searchBox) return;
  searchBox.addEventListener("input", showSummaryOrders);

  // remember the status picked in the Orders Section
  document.getElementById("unpaid-body").addEventListener("change", (e) => {
    const order = findOrder(Number(e.target.dataset.id));
    if (!order) return;
    order.status = e.target.value;
    storeOrders();
  });
  showSummaryOrders();
});

//-----Receipt------
// put the real order details inside the receipt
function fillReceipt() {
  const order = openOrderId === null ? null : findOrder(openOrderId);
  const totals = getTotals();

  let orderIdText = "Not saved yet";
  let date = new Date();
  if (order) {
    orderIdText = "#" + order.id;
    date = new Date(order.date);
  }

  const name = document.getElementById("cust-name").value.trim();

  document.getElementById("receipt-order-id").textContent = orderIdText;
  document.getElementById("receipt-date").textContent = date.toLocaleDateString(
    "en-PH",
    {
      year: "numeric",
      month: "long",
      day: "numeric",
    },
  );
  document.getElementById("receipt-customer").textContent =
    name === "" ? "-" : name;

  // one row for each item
  let html = "";
  for (let i = 0; i < currentOrder.length; i++) {
    const item = currentOrder[i];
    html += `
      <div class="receipt-item">
        <div>
          ${escapeHTML(item.product)} (${escapeHTML(item.material)})
          <small>${item.width}×${item.height} mm × ${item.qty}</small>
        </div>
        <div class="receipt-item-price">₱ ${peso(item.total)}</div>
      </div>`;
  }
  document.getElementById("receipt-items").innerHTML = html;

  document.getElementById("receipt-subtotal").textContent =
    "₱ " + peso(totals.subtotal);
  document.getElementById("receipt-vat").textContent = "₱ " + peso(totals.vat);
  document.getElementById("receipt-total").textContent =
    "₱ " + peso(totals.total);
}

//-----Order details popup (view button on Order Summary)------
function openOrderDetail(id) {
  const order = findOrder(id);
  if (!order) return;
  const modal = document.getElementById("orderDetailModal");
  modal.dataset.orderId = id;

  document.getElementById("od-id").textContent = "Order ID: " + order.id;
  document.getElementById("od-date").textContent =
    "Order Date: " + formatDate(order.date);
  document.getElementById("od-due").textContent =
    "Order Due: " + (order.due ? formatDueText(order.due) : "Not set");
  document.getElementById("od-name").textContent = order.name;
  document.getElementById("od-contact").textContent = order.contact;
  document.getElementById("od-address").textContent = order.address;
  document.getElementById("od-total").textContent = "₱ " + peso(order.total);

  let html = "";
  for (let i = 0; i < order.items.length; i++) {
    const item = order.items[i];
    html += `
      <div class="od-item">
        <div>
          ${escapeHTML(item.product)} (${escapeHTML(item.material)})
          <small>${item.width}×${item.height} mm × ${item.qty}</small>
        </div>
        <div>₱ ${peso(item.total)}</div>
      </div>`;
  }
  document.getElementById("od-items").innerHTML = html;

  const paid = order.balance <= 0;
  const state = document.getElementById("od-state");
  state.textContent = paid
    ? "PAID"
    : "UNPAID · Balance ₱ " + peso(order.balance);
  state.className = "od-state " + (paid ? "paid" : "unpaid");
  document.getElementById("odPayBtn").style.display = paid ? "none" : "";

  modal.classList.add("active");
}

document.addEventListener("DOMContentLoaded", () => {
  const modal = document.getElementById("orderDetailModal");
  if (!modal) return;
  const close = () => modal.classList.remove("active");

  document
    .getElementById("closeOrderDetailBtn")
    .addEventListener("click", close);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) close();
  });
  // unpaid order: open it in the calculator to pay or edit
  document.getElementById("odPayBtn").addEventListener("click", () => {
    const id = Number(modal.dataset.orderId);
    close();
    loadOrderForPayment(id);
  });
});
