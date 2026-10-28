/**
 * Arab Hausa Radio TV - PWA Install & Language Selection Flow
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

  // Register Service Worker
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('✅ ServiceWorker registered:', reg.scope);
        })
        .catch((err) => {
          console.warn('ServiceWorker error:', err);
        });
    });
  }

  // Capture PWA beforeinstallprompt
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
  });

  // Show Install Modal on first visit
  document.addEventListener('DOMContentLoaded', () => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    const hasSeenPrompt = sessionStorage.getItem('arab_hausa_modal_shown') === 'true';

    // Initialize Language from storage
    if (window.setLanguage) {
      window.setLanguage(selectedLangCandidate);
    }

    if (!isStandalone && !hasSeenPrompt) {
      setTimeout(() => {
        showInstallView();
        if (modalOverlay) modalOverlay.classList.add('active');
        sessionStorage.setItem('arab_hausa_modal_shown', 'true');
      }, 400);
    }
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
    heroInstallBtn.addEventListener('click', () => {
      // Trigger PWA prompt if available
      if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((choice) => {
          console.log('Install prompt result:', choice.outcome);
          deferredPrompt = null;
        });
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
      // Apply immediately
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
      closeModal();
    });
  }

  function closeModal() {
    if (modalOverlay) modalOverlay.classList.remove('active');
    sessionStorage.setItem('arab_hausa_install_dismissed', 'true');
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
