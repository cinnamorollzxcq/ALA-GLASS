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
