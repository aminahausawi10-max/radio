/**
 * Arab Hausa Radio TV - PWA Immediate Install Handler & Liquid Magnetic Moving Button
 */

(function () {
  let deferredPrompt = null;
  const modalOverlay = document.getElementById('installModalOverlay');
  const installBtn = document.getElementById('heroInstallBtn');
  const navInstallBtn = document.getElementById('navInstallBtn');
  const closeModalBtn = document.getElementById('closeModalBtn');
  const dismissModalBtn = document.getElementById('dismissModalBtn');

  // Register Service Worker
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('✅ ServiceWorker registered successfully:', reg.scope);
        })
        .catch((err) => {
          console.warn('ServiceWorker registration error:', err);
        });
    });
  }

  // Capture PWA beforeinstallprompt event
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    showInstallModal();
  });

  // Function to show install modal
  function showInstallModal() {
    if (sessionStorage.getItem('arab_hausa_install_dismissed') === 'true') {
      return;
    }
    if (modalOverlay) {
      modalOverlay.classList.add('active');
    }
  }

  // Force show on first user load immediately (Requirement: "the first thing user sees")
  document.addEventListener('DOMContentLoaded', () => {
    // Check if running in standalone mode (already installed)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    if (!isStandalone) {
      setTimeout(() => {
        if (modalOverlay) {
          modalOverlay.classList.add('active');
        }
      }, 400); // 400ms smooth fluid entrance
    }
  });

  // Handle Install Button Click
  function triggerInstall() {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('User accepted the Arab Hausa install prompt');
        }
        deferredPrompt = null;
        closeModal();
      });
    } else {
      // Fallback instruction for iOS / browsers without beforeinstallprompt
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
      if (isIOS) {
        alert("Domin sauke manhajar a wayar iPhone:\n1. Danna alamar raba (Share icon)\n2. Zabi 'Add to Home Screen' (Sanya a allon waya)");
      } else {
        alert("Don sanya manhajar Arab Hausa Radio TV kai tsaye a allon wayarka, danna alamar Menu a burauzarka sannan ka zabi 'Install App' ko 'Add to Home Screen'.");
      }
      closeModal();
    }
  }

  if (installBtn) {
    installBtn.addEventListener('click', triggerInstall);
  }

  if (navInstallBtn) {
    navInstallBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (deferredPrompt) {
        triggerInstall();
      } else {
        if (modalOverlay) modalOverlay.classList.add('active');
      }
    });
  }

  function closeModal() {
    if (modalOverlay) {
      modalOverlay.classList.remove('active');
    }
    sessionStorage.setItem('arab_hausa_install_dismissed', 'true');
  }

  if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
  if (dismissModalBtn) dismissModalBtn.addEventListener('click', closeModal);

  // Close when clicking outside card
  if (modalOverlay) {
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) closeModal();
    });
  }

  // =========================================================================
  // Liquid 3D Magnetic Motion for the Moving Button
  // =========================================================================
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
