(() => {
  'use strict';
  const copy = {
    add: ['添加到主屏幕', 'Add to home screen', 'เพิ่มไปยังหน้าจอโฮม'],
    install: ['安装应用', 'Install app', 'ติดตั้งแอป'],
    title: ['把 With 放在手边', 'Keep With close', 'ให้ With อยู่ใกล้คุณ'],
    intro: ['像 App 一样打开，一起出发。', 'One tap closer to going together.', 'แตะเดียว ก็พร้อมไปด้วยกัน'],
    browser: ['请用 Safari 或 Chrome 打开此链接。', 'Open this link in Safari or Chrome.', 'เปิดลิงก์นี้ด้วย Safari หรือ Chrome'],
    ios: ['分享 → 添加到主屏幕 → 添加。如有“作为网页 App 打开”，请开启。', 'Share → Add to Home Screen → Add. Enable “Open as Web App” if shown.', 'แตะ แชร์ → เพิ่มไปยังหน้าจอโฮม → เพิ่ม (หากมี “เปิดเป็นเว็บแอป” ให้เปิดใช้งาน)'],
    android: ['浏览器菜单 → 安装应用 / 添加到主屏幕。', 'Browser menu → Install app / Add to Home screen.', 'เปิดเมนูเบราว์เซอร์ → ติดตั้งแอป หรือ เพิ่มไปยังหน้าจอโฮม'],
    desktop: ['在浏览器地址栏或菜单中选择“安装应用”。', 'Choose “Install app” in your browser’s address bar or menu.', 'เลือก “ติดตั้งแอป” ในแถบที่อยู่หรือเมนูเบราว์เซอร์'],
    ready: ['已可离线打开', 'Ready to open offline', 'แอปพร้อมใช้งานแบบออฟไลน์แล้ว'],
    preparing: ['正在准备离线使用…', 'Preparing for offline use…', 'กำลังเตรียมให้ใช้งานแบบออฟไลน์…'],
    unavailable: ['离线模式暂不可用，请联网使用。', 'Offline mode unavailable. Keep an internet connection.', 'โหมดออฟไลน์ยังไม่พร้อม โปรดเชื่อมต่ออินเทอร์เน็ต'],
    local: ['邀请和计划保存在这台设备，不会同步给其他人。', 'Invitations and plans stay on this device. They are not shared with others.', 'คำเชิญและแผนของคุณจะเก็บไว้ในอุปกรณ์นี้ ไม่ได้แชร์กับผู้อื่น'],
    external: ['活动报名等外部链接需要网络。', 'External event registration links need internet.', 'ลิงก์ลงทะเบียนงานภายนอกต้องใช้อินเทอร์เน็ต'],
    installed: ['已在应用中打开', 'You’re in the app', 'คุณกำลังเปิดใช้งานในแอป'],
    update: ['有新版本', 'Update ready', 'มีเวอร์ชันใหม่พร้อมให้อัปเดต'],
    updateNow: ['更新应用', 'Update now', 'อัปเดตเลย'],
    updateNote: ['更新会重新打开页面；请先保存正在填写的内容。', 'Updating reloads the page. Save any open form first.', 'การอัปเดตจะโหลดหน้าใหม่ โปรดบันทึกแบบฟอร์มก่อน'],
    done: ['知道了', 'Got it', 'เข้าใจแล้ว']
  };
  const text = key => bi(...copy[key]);
  let deferredPrompt = null;
  let registration = null;
  let offlineState = 'preparing';
  let reloadingForUpdate = false;
  let installDialogOpen = false;
  const standalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'pwa-install';
  button.id = 'pwa-install';
  document.querySelector('.demo-bar').append(button);

  function renderButton() {
    button.hidden = standalone() && !registration?.waiting;
    const key = registration?.waiting ? 'update' : deferredPrompt ? 'install' : 'add';
    button.innerHTML = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 2v10m-4-4 4 4 4-4M3 12v5h14v-5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg><span>' + text(key) + '</span>';
  }

  function renderStatus() {
    const status = document.getElementById('pwa-status');
    if (status) {
      status.innerHTML = text(offlineState);
      status.dataset.state = offlineState;
    }
  }

  function showInstall() {
    installDialogOpen = true;
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isAndroid = /Android/.test(navigator.userAgent);
    const platform = isIOS ? 'iPhone · iPad' : isAndroid ? 'Android' : 'Chrome · Edge';
    const steps = isIOS ? 'ios' : isAndroid ? 'android' : 'desktop';
    const instruction = standalone()
      ? '<p class="pwa-steps">' + text('installed') + '</p>'
      : '<div class="pwa-platform">' + platform + '</div><p class="pwa-steps">' + text(steps) + '</p><p class="pwa-caption">' + text('browser') + '</p>';
    let actions = '';
    if (registration?.waiting) actions = '<p class="pwa-caption">' + text('updateNote') + '</p><div class="dialog-actions"><button class="btn light" data-action="close">' + text('done') + '</button><button class="btn" id="pwa-update-now">' + text('updateNow') + '</button></div>';
    else actions = '<div class="dialog-actions">' + (deferredPrompt && !standalone() ? '<button class="btn" id="pwa-install-now">' + text('install') + '</button>' : '<button class="btn" data-action="close">' + text('done') + '</button>') + '</div>';
    openModal(text('title'), '<div class="pwa-hero"><img src="./icons/icon-192.png" width="72" height="72" alt="With CNX"><p>' + text('intro') + '</p></div>' + instruction + '<div class="pwa-info"><p id="pwa-status" role="status"></p><p>' + text('local') + '</p><p>' + text('external') + '</p></div>' + actions);
    renderStatus();
    document.getElementById('pwa-install-now')?.addEventListener('click', async () => {
      const prompt = deferredPrompt;
      if (!prompt) return;
      deferredPrompt = null;
      try { await prompt.prompt(); await prompt.userChoice; } catch { /* The manual steps remain available. */ }
      renderButton();
      if (installDialogOpen) showInstall();
    });
    document.getElementById('pwa-update-now')?.addEventListener('click', () => {
      if (!registration?.waiting) return;
      reloadingForUpdate = true;
      registration.waiting.postMessage({type: 'SKIP_WAITING'});
    });
  }

  button.addEventListener('click', showInstall);
  document.getElementById('modal').addEventListener('close', () => { installDialogOpen = false; });
  document.getElementById('language').addEventListener('change', () => {
    renderButton();
    if (installDialogOpen && document.getElementById('pwa-status')) showInstall();
  });
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    deferredPrompt = event;
    renderButton();
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    renderButton();
    if (installDialogOpen) showInstall();
  });
  matchMedia('(display-mode: standalone)').addEventListener('change', renderButton);
  renderButton();

  if ('serviceWorker' in navigator && window.isSecureContext) {
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (reloadingForUpdate) location.reload();
    });
    navigator.serviceWorker.register('./sw.js', {scope: './', updateViaCache: 'none'})
      .then(async reg => {
        registration = reg;
        renderButton();
        reg.addEventListener('updatefound', () => {
          const worker = reg.installing;
          worker?.addEventListener('statechange', () => {
            if (worker.state === 'installed' || worker.state === 'activated') renderButton();
            if (worker.state === 'redundant' && !reg.active) {
              offlineState = 'unavailable'; renderStatus();
            }
          });
        });
        await navigator.serviceWorker.ready;
        offlineState = 'ready';
        renderStatus();
        renderButton();
      }).catch(() => { offlineState = 'unavailable'; renderStatus(); });
  } else {
    offlineState = 'unavailable';
  }
})();
