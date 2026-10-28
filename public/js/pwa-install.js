/**
 * Arab Hausa Radio TV - PWA Install & Multi-Language Selection Flow (v7)
 * Handles phone app drop/installation, iOS & Android guides, and live language switching
 */

(function () {
  let deferredPrompt = null;
  const modalOverlay = document.getElementById('installModalOverlay');
  const heroInstallBtn = document.getElementById('heroInstallBtn');
  const closeModalBtn = document.getElementById('closeModalBtn');
  const dismissModalBtn = document.getElementById('dismissModalBtn');

  // Modal Views
  const installView = document.getElementById('installView');
  const langView = document.getElementById('langView');
  const confirmLangBtn = document.getElementById('confirmLangBtn');
  const goToLangViewBtn = document.getElementById('goToLangViewBtn');
  const backToInstallBtn = document.getElementById('backToInstallBtn');
  const installInstructionsBox = document.getElementById('installInstructionsBox');
  const headerLangBtn = document.getElementById('headerLangBtn');

  let selectedLangCandidate = localStorage.getItem('arab_hausa_lang') || 'ha';

  // Force register Service Worker
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js?v=7')
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

  // Track app installation
  window.addEventListener('appinstalled', () => {
    console.log('Arab Hausa Web App installed successfully!');
    deferredPrompt = null;
    showLangView();
  });

  // Always initialize language on load
  document.addEventListener('DOMContentLoaded', () => {
    if (window.setLanguage) {
      window.setLanguage(selectedLangCandidate);
    }

    const hasChosenLang = localStorage.getItem('arab_hausa_lang_chosen') === 'true';

    // Show modal automatically on first open if user hasn't chosen language
    setTimeout(() => {
      if (!hasChosenLang) {
        showInstallView();
        if (modalOverlay) modalOverlay.classList.add('active');
      }
    }, 250);
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
    // Highlight currently active candidate card
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

  window.openInstallModal = function () {
    showInstallView();
    if (modalOverlay) modalOverlay.classList.add('active');
  };

  // Bind Header Language Pill
  if (headerLangBtn) {
    headerLangBtn.addEventListener('click', (e) => {
      e.preventDefault();
      window.openLanguageModal();
    });
  }

  // Bind Switch Buttons inside Modal
  if (goToLangViewBtn) {
    goToLangViewBtn.addEventListener('click', (e) => {
      e.preventDefault();
      showLangView();
    });
  }

  if (backToInstallBtn) {
    backToInstallBtn.addEventListener('click', (e) => {
      e.preventDefault();
      showInstallView();
    });
  }

  // Function to drop a shortcut file directly into the phone's downloads
  function triggerShortcutDownload() {
    try {
      const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Arab Hausa Radio TV</title>
  <meta http-equiv="refresh" content="0; url=https://radio-nine-gamma.vercel.app">
  <script>window.location.replace("https://radio-nine-gamma.vercel.app");</script>
</head>
<body style="font-family:sans-serif; text-align:center; padding:40px;">
  <h2>Opening Arab Hausa Radio & Television...</h2>
  <p><a href="https://radio-nine-gamma.vercel.app">Click here if you are not redirected automatically.</a></p>
</body>
</html>`;
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'ArabHausaRadioTV.html';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch (err) {
      console.warn('Direct shortcut drop skipped:', err);
    }
  }

  // STEP 1: User clicks the Moving Install Button
  if (heroInstallBtn) {
    heroInstallBtn.addEventListener('click', (e) => {
      e.preventDefault();

      const currentLang = window.currentLang || selectedLangCandidate || 'ha';
      const isEnglish = currentLang === 'en';

      let promptFired = false;

      // 1. Native PWA beforeinstallprompt if available (Android Chrome / Edge)
      if (deferredPrompt) {
        try {
          deferredPrompt.prompt();
          deferredPrompt.userChoice.then((choiceResult) => {
            console.log('Install prompt result:', choiceResult.outcome);
            deferredPrompt = null;
          });
          promptFired = true;
        } catch (err) {
          console.warn('Native prompt failed:', err);
        }
      }

      // 2. Mobile Detection (iOS vs Android)
      const userAgent = navigator.userAgent || navigator.vendor || window.opera;
      const isIos = /iPad|iPhone|iPod/.test(userAgent) && !window.MSStream;
      const isAndroid = /android/i.test(userAgent);

      if (installInstructionsBox) {
        if (isIos) {
          installInstructionsBox.innerHTML = isEnglish ? `
            <strong>📲 How to Drop Arab Hausa on your iPhone:</strong>
            <ol>
              <li>Tap the <strong>Share button [⎋ / 📤]</strong> at the bottom of Safari.</li>
              <li>Scroll down and tap <strong>'Add to Home Screen' [+]</strong>.</li>
              <li>Tap <strong>'Add'</strong> in the top-right corner to drop it on your phone!</li>
            </ol>
          ` : `
            <strong>📲 Yadda za ka sa manhajar a iPhone:</strong>
            <ol>
              <li>Taɓa maɓallin <strong>Share [⎋ / 📤]</strong> a ƙasan Safari.</li>
              <li>Zaɓi <strong>'Add to Home Screen' [+]</strong>.</li>
              <li>Taɓa <strong>'Add'</strong> a saman dama don ajiye shi a wayarka!</li>
            </ol>
          `;
          installInstructionsBox.style.display = 'block';
        } else if (isAndroid && !promptFired) {
          installInstructionsBox.innerHTML = isEnglish ? `
            <strong>📲 To Install on your Android Phone:</strong>
            <ol>
              <li>Tap the <strong>three dots [⋮]</strong> at the top right of Chrome.</li>
              <li>Select <strong>'Install app'</strong> or <strong>'Add to Home screen'</strong>.</li>
            </ol>
          ` : `
            <strong>📲 Don ajiye manhaja a wayarka ta Android:</strong>
            <ol>
              <li>Taɓa ɗigon nan uku <strong>[⋮]</strong> a saman dama na Chrome.</li>
              <li>Zaɓi <strong>'Install app'</strong> ko <strong>'Add to Home screen'</strong>.</li>
            </ol>
          `;
          installInstructionsBox.style.display = 'block';
          triggerShortcutDownload();
        } else {
          triggerShortcutDownload();
        }
      }

      // Automatically transition to Language Selection view
      setTimeout(() => {
        showLangView();
      }, 1600);
    });
  }

  // Handle Language Card Taps in Modal
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
  if (dismissModalBtn) {
    dismissModalBtn.addEventListener('click', (e) => {
      e.preventDefault();
      showLangView();
    });
  }

  if (modalOverlay) {
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) closeModal();
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
