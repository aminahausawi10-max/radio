/**
 * Arab Hausa Radio TV - PWA Install & Language Selection Flow (v3)
 */

(function () {
  let deferredPrompt = null;
  const modalOverlay = document.getElementById('installModalOverlay');
  const heroInstallBtn = document.getElementById('heroInstallBtn');
  const navInstallBtn = document.getElementById('navInstallBtn');
  const closeModalBtn = document.getElementById('closeModalBtn');
  const dismissModalBtn = document.getElementById('dismissModalBtn');

  // Modal Views
  const installView = document.getElementById('installView');
  const langView = document.getElementById('langView');
  const confirmLangBtn = document.getElementById('confirmLangBtn');

  let selectedLangCandidate = localStorage.getItem('arab_hausa_lang') || 'ha';

  // Force register new Service Worker version
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js?v=3')
        .then((reg) => {
          reg.update();
        })
        .catch((err) => {
          console.warn('SW error:', err);
        });
    });
  }

  // Capture PWA beforeinstallprompt
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
  });

  // Always show modal if user hasn't explicitly chosen their language yet
  document.addEventListener('DOMContentLoaded', () => {
    // Initialize Language from storage
    if (window.setLanguage) {
      window.setLanguage(selectedLangCandidate);
    }

    const hasChosenLang = localStorage.getItem('arab_hausa_lang_chosen') === 'true';

    // Show modal automatically on page open
    setTimeout(() => {
      if (!hasChosenLang) {
        showInstallView();
        if (modalOverlay) modalOverlay.classList.add('active');
      }
    }, 300);
  });

  function showInstallView() {
    if (installView) installView.style.display = 'block';
    if (langView) langView.style.display = 'none';
  }

  function showLangView() {
    if (installView) installView.style.display = 'none';
    if (langView) {
      langView.style.display = 'block';
      langView.classList.add('active');
    }
    // Highlight currently active candidate
    document.querySelectorAll('.lang-card').forEach((card) => {
      if (card.getAttribute('data-lang') === selectedLangCandidate) {
        card.classList.add('active');
      } else {
        card.classList.remove('active');
      }
    });
  }

  window.openLanguageModal = function () {
    showLangView();
    if (modalOverlay) modalOverlay.classList.add('active');
  };

  // STEP 1: User clicks the Moving Install Button
  if (heroInstallBtn) {
    heroInstallBtn.addEventListener('click', (e) => {
      e.preventDefault();
      // Trigger PWA prompt if available
      if (deferredPrompt) {
        try {
          deferredPrompt.prompt();
          deferredPrompt.userChoice.then((choice) => {
            deferredPrompt = null;
          });
        } catch (err) {}
      }
      
      // Immediately show Language Selection Screen as requested:
      // "after he click the install botton then a page will show him to choose the language he want the website to be"
      showLangView();
    });
  }

  // Handle Language Card Taps
  document.querySelectorAll('.lang-card').forEach((card) => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.lang-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      selectedLangCandidate = card.getAttribute('data-lang');
      
      // Apply language instantly to whole website
      if (window.setLanguage) {
        window.setLanguage(selectedLangCandidate);
      }
    });
  });

  // Confirm and close
  if (confirmLangBtn) {
    confirmLangBtn.addEventListener('click', () => {
      if (window.setLanguage) {
        window.setLanguage(selectedLangCandidate);
      }
      localStorage.setItem('arab_hausa_lang_chosen', 'true');
      closeModal();
    });
  }

  function closeModal() {
    if (modalOverlay) modalOverlay.classList.remove('active');
  }

  if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
  if (dismissModalBtn) dismissModalBtn.addEventListener('click', closeModal);

  if (modalOverlay) {
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) closeModal();
    });
  }

  // Header Install Button trigger
  if (navInstallBtn) {
    navInstallBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (deferredPrompt) {
        deferredPrompt.prompt();
      } else {
        showInstallView();
        if (modalOverlay) modalOverlay.classList.add('active');
      }
    });
  }

  // 3D Magnetic Motion for the Moving Button
  const movingBtns = document.querySelectorAll('.liquid-moving-btn');
  movingBtns.forEach((btn) => {
    btn.addEventListener('mousemove', (e) => {
      const rect = btn.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      btn.style.transform = `translate(${x * 0.25}px, ${y * 0.25}px) scale(1.04)`;
    });

    btn.addEventListener('mouseleave', () => {
      btn.style.transform = '';
    });
  });
})();
