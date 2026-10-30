/**
 * Arab Hausa Radio TV - PWA Install & Multi-Language Controller (v11)
 * Guaranteed: First thing shown on pressing the link is the Install Button if not installed.
 * Supports Android Chrome (native prompt + fallback), iOS Safari guide, and instant app shortcut drop.
 */

(function () {
  let deferredPrompt = null;
  const modalOverlay = document.getElementById('installModalOverlay');
  const heroInstallBtn = document.getElementById('heroInstallBtn');
  const headerInstallBtn = document.getElementById('headerInstallBtn');
  const homeInstallQuickBtn = document.getElementById('homeInstallQuickBtn');
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

  // 1. Force register Service Worker for PWA compliance
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js?v=12')
        .then((reg) => {
          reg.update();
        })
        .catch((err) => {
          console.warn('SW registration warning:', err);
        });
    });
  }

  // 2. Capture native beforeinstallprompt (Android Chrome, Edge, Chromium)
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    console.log('⚡ PWA beforeinstallprompt captured and ready');
  });

  // 3. Track successful PWA install
  window.addEventListener('appinstalled', () => {
    console.log('✅ Arab Hausa App installed successfully to device!');
    localStorage.setItem('arab_hausa_pwa_installed', 'true');
    deferredPrompt = null;
    updateInstallUI();
    closeModal();
  });

  // 4. Check if running inside installed standalone PWA
  function isAppInstalled() {
    // A. Check standalone display mode
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      || window.matchMedia('(display-mode: fullscreen)').matches
      || window.matchMedia('(display-mode: minimal-ui)').matches
      || window.navigator.standalone === true // iOS Safari standalone
      || (document.referrer && document.referrer.startsWith('android-app://')); // Android TWA / PWA
    
    if (isStandalone) return true;

    // B. Check persistent installation flag in localStorage
    if (localStorage.getItem('arab_hausa_pwa_installed') === 'true') {
      return true;
    }

    return false;
  }

  // 5. Update UI buttons based on installation state
  function updateInstallUI() {
    const installed = isAppInstalled();
    const headerInstall = document.getElementById('headerInstallBtn');
    const homeInstall = document.getElementById('homeInstallQuickBtn');

    if (installed) {
      if (headerInstall) headerInstall.style.display = 'none';
      if (homeInstall) homeInstall.style.display = 'none';
      if (modalOverlay) modalOverlay.classList.remove('active');
    } else {
      if (headerInstall) headerInstall.style.display = 'inline-flex';
      if (homeInstall) homeInstall.style.display = 'block';
    }
  }

  // 6. Modal View Switchers
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
    document.querySelectorAll('.lang-card').forEach((card) => {
      if (card.getAttribute('data-lang') === selectedLangCandidate) {
        card.classList.add('active');
      } else {
        card.classList.remove('active');
      }
    });
  }

  function closeModal() {
    if (modalOverlay) modalOverlay.classList.remove('active');
  }

  window.openLanguageModal = function () {
    showLangView();
    if (modalOverlay) modalOverlay.classList.add('active');
  };

  window.openInstallModal = function () {
    showInstallView();
    if (modalOverlay) modalOverlay.classList.add('active');
  };

  // 7. Core Behavior on Page Open / Link Pressed:
  // "if a user press the link the first thing it should show him is the install button if he didn't install it"
  document.addEventListener('DOMContentLoaded', () => {
    if (window.setLanguage) {
      window.setLanguage(selectedLangCandidate);
    }

    updateInstallUI();

    // If the user has not installed the app, pop up the install screen first thing!
    if (!isAppInstalled()) {
      showInstallView();
      // Fast smooth reveal
      setTimeout(() => {
        if (!isAppInstalled() && modalOverlay) {
          modalOverlay.classList.add('active');
        }
      }, 100);
    }
  });

  // 8. Trigger phone web-app launcher shortcut download (.html)
  function triggerShortcutDownload() {
    try {
      const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Arab Hausa Radio TV</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="refresh" content="0; url=https://radio-nine-gamma.vercel.app">
  <script>window.location.replace("https://radio-nine-gamma.vercel.app");</script>
</head>
<body style="font-family:sans-serif; text-align:center; padding:40px; background:#050b14; color:#fff;">
  <h2>Opening Arab Hausa Radio & Television...</h2>
  <p><a href="https://radio-nine-gamma.vercel.app" style="color:#00f2fe;">Click here to open if not redirected automatically.</a></p>
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
      console.warn('Shortcut download skipped:', err);
    }
  }

  // 9. Primary Installation Trigger
  function handleInstallClick(e) {
    if (e) e.preventDefault();

    const currentLang = window.currentLang || selectedLangCandidate || 'ha';
    const isEnglish = currentLang === 'en';

    // A. Native PWA prompt available (Android Chrome / Edge / Desktop)
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((choiceResult) => {
          console.log('Install prompt choice:', choiceResult.outcome);
          if (choiceResult.outcome === 'accepted') {
            localStorage.setItem('arab_hausa_pwa_installed', 'true');
            updateInstallUI();
            closeModal();
          }
          deferredPrompt = null;
        });
        return;
      } catch (err) {
        console.warn('Native prompt execution warning:', err);
      }
    }

    // B. Mobile Detection
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    const isIos = /iPad|iPhone|iPod/.test(userAgent) && !window.MSStream;
    const isAndroid = /android/i.test(userAgent);

    if (installInstructionsBox) {
      if (isIos) {
        installInstructionsBox.innerHTML = isEnglish ? `
          <div class="install-guide-card">
            <h4>📲 Tap Share to Install on iPhone:</h4>
            <ol>
              <li>Tap the <strong>Share [⎋ / 📤]</strong> button at the bottom of Safari.</li>
              <li>Scroll down and tap <strong>'Add to Home Screen' [+]</strong>.</li>
              <li>Tap <strong>'Add'</strong> at the top right to drop Arab Hausa on your phone!</li>
            </ol>
            <button type="button" class="done-installing-btn" id="doneIosInstallBtn">I Added to Home Screen ✓</button>
          </div>
        ` : `
          <div class="install-guide-card">
            <h4>📲 Yadda za ka sa manhajar a iPhone:</h4>
            <ol>
              <li>Taɓa maɓallin <strong>Share [⎋ / 📤]</strong> a ƙasan Safari.</li>
              <li>Zaɓi <strong>'Add to Home Screen' [+]</strong>.</li>
              <li>Taɓa <strong>'Add'</strong> a saman dama don ajiye shi a wayarka!</li>
            </ol>
            <button type="button" class="done-installing-btn" id="doneIosInstallBtn">Na Ajiye a Wayata ✓</button>
          </div>
        `;
        installInstructionsBox.style.display = 'block';

        const doneBtn = document.getElementById('doneIosInstallBtn');
        if (doneBtn) {
          doneBtn.addEventListener('click', () => {
            localStorage.setItem('arab_hausa_pwa_installed', 'true');
            updateInstallUI();
            closeModal();
          });
        }
      } else if (isAndroid) {
        installInstructionsBox.innerHTML = isEnglish ? `
          <div class="install-guide-card">
            <h4>📲 Fast Android Installation:</h4>
            <ol>
              <li>Tap the <strong>three dots [⋮]</strong> at the top right of Chrome.</li>
              <li>Select <strong>'Install app'</strong> or <strong>'Add to Home screen'</strong>.</li>
            </ol>
            <button type="button" class="done-installing-btn" id="doneAndroidInstallBtn">Done Installing ✓</button>
          </div>
        ` : `
          <div class="install-guide-card">
            <h4>📲 Yadda za ka ajiye a Android:</h4>
            <ol>
              <li>Taɓa ɗigon nan uku <strong>[⋮]</strong> a saman dama na Chrome.</li>
              <li>Zaɓi <strong>'Install app'</strong> ko <strong>'Add to Home screen'</strong>.</li>
            </ol>
            <button type="button" class="done-installing-btn" id="doneAndroidInstallBtn">Na Gama Sakawa ✓</button>
          </div>
        `;
        installInstructionsBox.style.display = 'block';

        const doneBtn = document.getElementById('doneAndroidInstallBtn');
        if (doneBtn) {
          doneBtn.addEventListener('click', () => {
            localStorage.setItem('arab_hausa_pwa_installed', 'true');
            updateInstallUI();
            closeModal();
          });
        }
        triggerShortcutDownload();
      } else {
        // Desktop Browser
        installInstructionsBox.innerHTML = isEnglish ? `
          <div class="install-guide-card">
            <h4>💻 Install on Desktop:</h4>
            <p>Click the <strong>Install Arab Hausa [⊕]</strong> icon in your browser address bar at the top right.</p>
            <button type="button" class="done-installing-btn" id="doneDesktopInstallBtn">Done ✓</button>
          </div>
        ` : `
          <div class="install-guide-card">
            <h4>💻 Sanya a Kwamfuta:</h4>
            <p>Danna alamar <strong>Install Arab Hausa [⊕]</strong> a saman kusa da adireshin yanar gizo.</p>
            <button type="button" class="done-installing-btn" id="doneDesktopInstallBtn">Na Gama ✓</button>
          </div>
        `;
        installInstructionsBox.style.display = 'block';

        const doneBtn = document.getElementById('doneDesktopInstallBtn');
        if (doneBtn) {
          doneBtn.addEventListener('click', () => {
            localStorage.setItem('arab_hausa_pwa_installed', 'true');
            updateInstallUI();
            closeModal();
          });
        }
        triggerShortcutDownload();
      }
    }
  }

  // 10. Attach event listeners
  if (heroInstallBtn) {
    heroInstallBtn.addEventListener('click', handleInstallClick);
  }

  if (headerInstallBtn) {
    headerInstallBtn.addEventListener('click', (e) => {
      e.preventDefault();
      window.openInstallModal();
    });
  }

  if (homeInstallQuickBtn) {
    homeInstallQuickBtn.addEventListener('click', (e) => {
      e.preventDefault();
      window.openInstallModal();
    });
  }

  // Modal navigation controls
  if (headerLangBtn) {
    headerLangBtn.addEventListener('click', (e) => {
      e.preventDefault();
      window.openLanguageModal();
    });
  }

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

  if (closeModalBtn) {
    closeModalBtn.addEventListener('click', closeModal);
  }

  if (dismissModalBtn) {
    dismissModalBtn.addEventListener('click', (e) => {
      e.preventDefault();
      closeModal();
    });
  }

  if (modalOverlay) {
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) closeModal();
    });
  }

  // Language Card Selection
  document.querySelectorAll('.lang-card').forEach((card) => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.lang-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      selectedLangCandidate = card.getAttribute('data-lang');
      localStorage.setItem('arab_hausa_lang', selectedLangCandidate);

      if (window.setLanguage) {
        window.setLanguage(selectedLangCandidate);
      }
    });
  });

  if (confirmLangBtn) {
    confirmLangBtn.addEventListener('click', () => {
      if (window.setLanguage) {
        window.setLanguage(selectedLangCandidate);
      }
      localStorage.setItem('arab_hausa_lang', selectedLangCandidate);
      closeModal();
    });
  }

  // 11. 3D Magnetic Motion for moving buttons
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
