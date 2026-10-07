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

  // Highlight clicked button
  if (event && event.currentTarget) {
    event.currentTarget.classList.add("active");
  }
}

// --- ORDER TRACKER MODAL HANDLER ---
document.addEventListener("DOMContentLoaded", () => {
  const openBtn = document.getElementById("openTrackerBtn");
  const closeBtn = document.getElementById("closeTrackerBtn");
  const modal = document.getElementById("trackerModal");

  // Open Modal when "View all" is clicked
  if (openBtn && modal) {
    openBtn.addEventListener("click", () => {
      modal.classList.add("active");
    });
  }

  // Close Modal when "X" button is clicked
  if (closeBtn && modal) {
    closeBtn.addEventListener("click", () => {
      modal.classList.remove("active");
    });
  }

  // Close Modal when clicking outside the modal box on the dark overlay
  if (modal) {
    window.addEventListener("click", (event) => {
      if (event.target === modal) {
        modal.classList.remove("active");
      }
    });
  }
});

//-----Print Button------
document.addEventListener("DOMContentLoaded", () => {
  const printBtn = document.querySelector(".print-btn");
  const receiptModal = document.getElementById("receiptModal");
  const closeReceiptBtn = document.getElementById("closeReceiptBtn");
  const confirmPrintBtn = document.getElementById("confirmPrintBtn");

  // Show modal on Print Receipt button click
  if (printBtn) {
    printBtn.addEventListener("click", () => {
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
    return {
      name: c.name,
      qtyLabel: isArea ? `${(areaM2 * qty).toFixed(2)} m²` : String(qty),
      amount: isArea ? c.price * areaM2 * qty : c.price * qty,
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
let totalsCalculated = false;

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

// Show the total only after the Calculate button has been pressed
function renderTotals() {
  const { subtotal, vat, total } = getTotals();
  const show = totalsCalculated && currentOrder.length > 0;

  document
    .querySelectorAll(".order-total")
    .forEach((el) => (el.textContent = show ? peso(total) : "0.00"));
  document.querySelectorAll(".order-note").forEach((el) => {
    if (show) {
      el.textContent = `Subtotal ₱ ${peso(subtotal)} + 12% VAT ₱ ${peso(vat)}. Valid for 30 days.`;
    } else {
      el.textContent =
        currentOrder.length === 0
          ? "Includes 12% VAT. Valid for 30 days."
          : "Press Calculate to see the total.";
    }
  });
}

function updatePreview() {
  const preview = document.getElementById("calc-preview");
  const result = readCalculatorForm();
  if (result.item) {
    const i = result.item;
    preview.textContent = `${i.areaM2.toFixed(2)} m² × ${i.qty}: ₱ ${peso(i.price)} + materials/labor ₱ ${peso(i.componentsTotal)} = ₱ ${peso(i.total)}`;
  } else {
    preview.textContent = "";
  }
}

// ----- Today's sale (saved orders, stored per day in localStorage) -----
const todayKey = () => "ala-sales-" + new Date().toISOString().slice(0, 10);

function getTodaySale() {
  try {
    return parseFloat(localStorage.getItem(todayKey())) || 0;
  } catch {
    return 0;
  }
}

function renderTodaySale() {
  const el = document.getElementById("todaySale");
  if (el) el.textContent = "₱ " + peso(getTodaySale());
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
    currentOrder.push({ id: nextItemId++, ...result.item });
    totalsCalculated = false;
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
    currentOrder = currentOrder.filter((i) => i.id !== Number(btn.dataset.id));
    totalsCalculated = false;
    renderOrder();
  });

  // Search items
  document.querySelectorAll(".item-search").forEach((input) => {
    input.addEventListener("input", () => renderOrder(input.value));
  });

  // Calculate button: compute and show the total
  const calcBtn = document.getElementById("calcTotalBtn");
  if (calcBtn) {
    calcBtn.addEventListener("click", () => {
      if (currentOrder.length === 0) {
        errorEl.textContent = "Add at least one item before calculating.";
        return;
      }
      errorEl.textContent = "";
      totalsCalculated = true;
      renderTotals();
    });
  }

  // Save order: add total to today's sale and clear the order
  const saveBtn = document.getElementById("saveOrderBtn");
  if (saveBtn) {
    saveBtn.addEventListener("click", () => {
      if (currentOrder.length === 0) {
        errorEl.textContent = "Add at least one item before saving.";
        return;
      }
      if (!totalsCalculated) {
        errorEl.textContent = "Press Calculate before saving the order.";
        return;
      }
      errorEl.textContent = "";
      const { total } = getTotals();
      try {
        localStorage.setItem(todayKey(), getTodaySale() + total);
      } catch {}
      currentOrder = [];
      totalsCalculated = false;
      renderOrder();
      renderTodaySale();
      alert(`Order saved. Total: ₱ ${peso(total)}`);
    });
  }

  renderOrder();
  renderTodaySale();
});
