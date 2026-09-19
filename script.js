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
