function showPage(pageId, event) {
    // Hide all page views
    const pages = document.querySelectorAll('.page-view');
    pages.forEach(page => {
        page.classList.remove('active');
    });

    // Remove active class from all nav buttons
    const buttons = document.querySelectorAll('.nav-btn');
    buttons.forEach(button => {
        button.classList.remove('active');
    });

    // Show selected page view
    const targetPage = document.getElementById(pageId);
    if (targetPage) {
        targetPage.classList.add('active');
    }

    // Highlight clicked button
    if (event && event.currentTarget) {
        event.currentTarget.classList.add('active');
    }
}