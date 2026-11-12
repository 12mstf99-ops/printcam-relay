// ═══════════════════════════════════════════════════════════════════════════
// PrintCam 3D - ESP32-CAM 7/24 Kesintisiz Ücretsiz Bulut Aktarıcı (Cloud Relay)
// Node.js Dahili HTTP Modülü Kullanır (Ekstra Kütüphane Kurulumu Gerektirmez!)
// ═══════════════════════════════════════════════════════════════════════════

const http = require('http');
const url = require('url');

const PORT = process.env.PORT || 3000;

// Bellek içi durum değişkenleri
let latestFrame = null;
let lastFrameTime = 0;
let lastClientPing = 0;

let currentFlash = 0;
let currentVflip = 1;
let currentHmirror = 1;

// 1x1 şeffaf / siyah yer tutucu JPEG (Kamera henüz bağlanmadıysa sunulur)
const PLACEHOLDER_FRAME = Buffer.from(
  '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=',
  'base64'
);

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // 1. ESP32-CAM'den Gelen Canlı Kare Yüklemesi (POST /upload)
  if (req.method === 'POST' && pathname === '/upload') {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => {
      latestFrame = Buffer.concat(chunks);
      lastFrameTime = Date.now();

      // İstemci (iPhone) son 15 saniyede yayına baktı mı?
      const isClientActive = (Date.now() - lastClientPing) < 15000;

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        active: isClientActive,
        flash: currentFlash,
        vflip: currentVflip,
        hmirror: currentHmirror
      }));
    });
    return;
  }

  // 2. iPhone 16 Pro Max İçin Anlık Kare Akışı (GET /capture)
  if (req.method === 'GET' && pathname === '/capture') {
    lastClientPing = Date.now(); // İstemcinin aktif olduğunu kaydet

    res.writeHead(200, {
      'Content-Type': 'image/jpeg',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Access-Control-Allow-Origin': '*'
    });

    if (latestFrame && (Date.now() - lastFrameTime < 10000)) {
      res.end(latestFrame);
    } else {
      res.end(PLACEHOLDER_FRAME);
    }
    return;
  }

  // 3. Donanım Kontrol Komutları (GET /control?var=flash&val=255)
  if (req.method === 'GET' && pathname === '/control') {
    const query = parsedUrl.query;
    if (query.var === 'flash') currentFlash = parseInt(query.val, 10) || 0;
    if (query.var === 'vflip') currentVflip = parseInt(query.val, 10) || 0;
    if (query.var === 'hmirror') currentHmirror = parseInt(query.val, 10) || 0;

    res.writeHead(200, { 'Access-Control-Allow-Origin': '*' });
    res.end('OK');
    return;
  }

  // 4. Durum Sorgusu (GET /status)
  if (req.method === 'GET' && pathname === '/status') {
    const online = (Date.now() - lastFrameTime) < 10000;
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(JSON.stringify({
      online: online,
      flash: currentFlash,
      vflip: currentVflip,
      hmirror: currentHmirror,
      lastSeenSecondsAgo: Math.round((Date.now() - lastFrameTime) / 1000)
    }));
    return;
  }

  // 5. iPhone 16 Pro Max PWA Mobil Uygulaması (GET /)
  if (req.method === 'GET' && (pathname === '/' || pathname === '/index.html')) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(HTML_PAGE);
    return;
  }

  // 6. Manifest (PWA Kurulumu İçin)
  if (req.method === 'GET' && pathname === '/manifest.json') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      name: "PrintCam 3D",
      short_name: "PrintCam",
      description: "3D Yazıcı Canlı İzleme ve Kontrol",
      start_url: "/",
      display: "standalone",
      background_color: "#0a0e17",
      theme_color: "#0a0e17",
      icons: [{
        src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' rx='20' fill='%2300e5ff'/%3E%3Cpath d='M20 40h60v35H20z' fill='%230a0e17'/%3E%3Ccircle cx='50' cy='55' r='12' fill='%23ff7043'/%3E%3C/svg%3E",
        sizes: "192x192",
        type: "image/svg+xml"
      }]
    }));
    return;
  }

  res.writeHead(404);
  res.end('Not Found');
});

server.listen(PORT, () => {
  console.log(`PrintCam 3D Bulut Aktarıcı Port ${PORT} üzerinde hazır!`);
});

// Gömülü iPhone 16 Pro Max PWA Arayüzü
const HTML_PAGE = `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
  <title>PrintCam 3D</title>
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
  <meta name="apple-mobile-web-app-title" content="PrintCam" />
  <meta name="theme-color" content="#0a0e17" />
  <link rel="manifest" href="/manifest.json" />
  <style>
    :root {
      --bg: #0a0e17;
      --card: rgba(22, 30, 48, 0.85);
      --border: rgba(255, 255, 255, 0.08);
      --cyan: #00e5ff;
      --orange: #ff7043;
      --green: #10b981;
      --red: #ef4444;
      --safe-top: env(safe-area-inset-top, 48px);
      --safe-bottom: env(safe-area-inset-bottom, 24px);
    }
    * { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif;
      background: var(--bg);
      color: #f0f4fc;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      user-select: none;
      -webkit-user-select: none;
    }
    header {
      position: sticky; top: 0; z-index: 100;
      padding-top: calc(var(--safe-top) + 6px);
      padding-bottom: 12px; padding-left: 16px; padding-right: 16px;
      background: rgba(15, 22, 36, 0.9);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border-bottom: 1px solid var(--border);
      display: flex; align-items: center; justify-content: space-between;
    }
    .status-badge {
      display: flex; align-items: center; gap: 6px;
      background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.3);
      padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; color: var(--green);
    }
    .status-badge.offline {
      background: rgba(239, 68, 68, 0.15); border-color: rgba(239, 68, 68, 0.3); color: var(--red);
    }
    .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--green); }
    .dot.pulsing { animation: pulse 1.6s infinite; }
    .dot.offline { background: var(--red); animation: none; }
    @keyframes pulse { 0% { transform: scale(0.95); opacity: 0.8; } 50% { transform: scale(1.1); opacity: 1; } 100% { transform: scale(0.95); opacity: 0.8; } }
    .title { font-weight: 700; font-size: 16px; display: flex; align-items: center; gap: 6px; }
    .icon-btn {
      background: rgba(255,255,255,0.08); border: 1px solid var(--border); color: #fff;
      width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
      cursor: pointer;
    }
    main {
      flex: 1; padding: 16px; display: flex; flex-direction: column; gap: 16px;
      max-width: 580px; margin: 0 auto; width: 100%;
    }
    .viewport {
      position: relative; border-radius: 24px; overflow: hidden; background: #000;
      aspect-ratio: 4/3; border: 1px solid var(--border); box-shadow: 0 12px 32px rgba(0,0,0,0.6);
      display: flex; align-items: center; justify-content: center; touch-action: none;
    }
    #streamImg {
      width: 100%; height: 100%; object-fit: contain; transition: transform 0.08s ease-out;
    }
    .stream-overlay {
      position: absolute; inset: 0; background: rgba(10,14,23,0.92);
      display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px;
      z-index: 10;
    }
    .stream-overlay.hidden { display: none; }
    .spinner {
      width: 32px; height: 32px; border: 3px solid rgba(0,229,255,0.2);
      border-top-color: var(--cyan); border-radius: 50%; animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .floating-bar {
      position: absolute; bottom: 12px; right: 12px; display: flex; gap: 8px; z-index: 5;
    }
    .fab {
      width: 42px; height: 42px; border-radius: 50%;
      background: rgba(20,28,45,0.85); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
      border: 1px solid rgba(255,255,255,0.15); color: #fff;
      display: flex; align-items: center; justify-content: center; cursor: pointer;
    }
    .fab.active { background: var(--orange); border-color: var(--orange); }
    .card {
      background: var(--card); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
      border: 1px solid var(--border); border-radius: 18px; padding: 16px;
      display: flex; flex-direction: column; gap: 12px;
    }
    .card-head { display: flex; justify-content: space-between; align-items: center; }
    .card-head h3 { font-size: 14px; font-weight: 600; }
    .badge { font-size: 12px; font-weight: 700; color: var(--cyan); background: rgba(0,229,255,0.1); padding: 2px 8px; border-radius: 12px; }
    .slider-row { display: flex; align-items: center; gap: 10px; }
    input[type=range] {
      flex: 1; -webkit-appearance: none; height: 8px; border-radius: 4px; background: rgba(255,255,255,0.15); outline: none;
    }
    input[type=range]::-webkit-slider-thumb {
      -webkit-appearance: none; width: 26px; height: 26px; border-radius: 50%; background: #fff; cursor: pointer;
    }
    .presets { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
    .preset-btn {
      background: rgba(255,255,255,0.06); border: 1px solid var(--border); color: #94a3b8;
      padding: 6px 0; border-radius: 8px; font-size: 11px; font-weight: 600; cursor: pointer;
    }
    .preset-btn.active { background: rgba(0,229,255,0.18); color: var(--cyan); border-color: var(--cyan); }
    .btn-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .btn {
      display: flex; align-items: center; justify-content: center; gap: 6px;
      padding: 10px 14px; border-radius: 12px; font-size: 13px; font-weight: 600;
      border: 1px solid var(--border); background: rgba(255,255,255,0.06); color: #fff; cursor: pointer;
    }
    .btn.active { background: rgba(0,229,255,0.2); border-color: var(--cyan); color: var(--cyan); }
    .btn-full { grid-column: span 2; background: linear-gradient(135deg, #00b4d8, #0077b6); border: none; }
    .modal {
      position: fixed; inset: 0; z-index: 200; background: rgba(0,0,0,0.7); backdrop-filter: blur(8px);
      display: none; align-items: flex-end; justify-content: center;
    }
    .modal.active { display: flex; }
    .sheet {
      width: 100%; max-width: 520px; background: #161e30; border-top-left-radius: 24px; border-top-right-radius: 24px;
      padding: 20px 20px calc(var(--safe-bottom) + 20px); display: flex; flex-direction: column; gap: 14px;
    }
    .sheet-head { display: flex; justify-content: space-between; align-items: center; }
    .sheet-head h4 { font-size: 16px; }
    .close-btn { background: rgba(255,255,255,0.1); border: none; color: #fff; width: 28px; height: 28px; border-radius: 50%; cursor: pointer; }
    .tip-box { background: rgba(0,229,255,0.08); border: 1px solid rgba(0,229,255,0.2); border-radius: 12px; padding: 12px; font-size: 12px; line-height: 1.5; color: var(--cyan); }
    footer { padding-bottom: calc(var(--safe-bottom) + 8px); text-align: center; font-size: 11px; color: #64748b; }
  </style>
</head>
<body>

  <header>
    <div class="status-badge" id="connStatus">
      <div class="dot pulsing" id="statusDot"></div>
      <span id="statusTxt">BULUT CANLI</span>
    </div>
    <div class="title">🖨️ PrintCam 3D</div>
    <button class="icon-btn" id="infoBtn">ℹ️</button>
  </header>

  <main>
    <div class="viewport" id="viewport">
      <img id="streamImg" src="" alt="Yayın" />
      <div class="stream-overlay" id="overlay">
        <div class="spinner"></div>
        <p id="overlayMsg">Kamera Akışı Bekleniyor...</p>
        <button class="btn" id="retryBtn" style="margin-top:8px;">Yeniden Bağlan</button>
      </div>
      <div class="floating-bar">
        <button class="fab" id="snapFab" title="Fotoğraf İndir">📷</button>
        <button class="fab" id="flashFab" title="Flaş">⚡</button>
      </div>
    </div>

    <div class="card">
      <div class="card-head">
        <h3>Flaş LED Aydınlatma (Tabla Işığı)</h3>
        <span class="badge" id="flashBadge">%0</span>
      </div>
      <div class="slider-row">
        <span>🌑</span>
        <input type="range" id="flashRange" min="0" max="255" value="0" />
        <span>💡</span>
      </div>
      <div class="presets">
        <button class="preset-btn" data-v="0">Kapalı</button>
        <button class="preset-btn" data-v="64">%25</button>
        <button class="preset-btn" data-v="128">%50</button>
        <button class="preset-btn" data-v="255">%100</button>
      </div>
      <div class="btn-grid">
        <button class="btn" id="vflipBtn">↕️ Dikey Çevir</button>
        <button class="btn" id="hmirrorBtn">↔️ Yatay Ayna</button>
        <button class="btn btn-full" id="captureBtn">📸 Yüksek Çözünürlüklü İndir</button>
      </div>
    </div>
  </main>

  <div class="modal" id="infoModal">
    <div class="sheet">
      <div class="sheet-head">
        <h4>iPhone 16'ya Yerel Uygulama Olarak Yükleyin</h4>
        <button class="close-btn" id="closeInfo">✕</button>
      </div>
      <div class="tip-box">
        <strong>1.</strong> Safari'nin altındaki <strong>Paylaş</strong> (yukarı ok) simgesine dokunun.<br/>
        <strong>2.</strong> Menüden <strong>"Ana Ekrana Ekle"</strong> (Add to Home Screen) seçin.<br/>
        <strong>3.</strong> Sağ üstten <strong>"Ekle"</strong>ye dokunun.<br/><br/>
        ✨ Artık Dynamic Island ve tam ekran ile gerçek bir iPhone uygulaması olarak kullanabilirsiniz!
      </div>
      <button class="btn btn-full" id="dismissInfo">Tamam</button>
    </div>
  </div>

  <footer>PrintCam 3D • 7/24 Kesintisiz Bulut Aktarıcı</footer>

  <script>
    (function(){
      const streamImg = document.getElementById('streamImg');
      const overlay = document.getElementById('overlay');
      const connStatus = document.getElementById('connStatus');
      const statusDot = document.getElementById('statusDot');
      const statusTxt = document.getElementById('statusTxt');
      const flashRange = document.getElementById('flashRange');
      const flashBadge = document.getElementById('flashBadge');
      const flashFab = document.getElementById('flashFab');
      const vflipBtn = document.getElementById('vflipBtn');
      const hmirrorBtn = document.getElementById('hmirrorBtn');

      let vflip = false, hmirror = false;
      let snapRunning = true;

      function startStream() {
        overlay.classList.add('hidden');
        statusDot.className = 'dot pulsing';
        statusTxt.textContent = 'BULUT CANLI';
        connStatus.classList.remove('offline');

        function pollNext() {
          if (!snapRunning) return;
          const frame = new Image();
          frame.onload = () => {
            if (!snapRunning) return;
            streamImg.src = frame.src;
            overlay.classList.add('hidden');
            statusDot.className = 'dot pulsing';
            statusTxt.textContent = 'BULUT CANLI';
            connStatus.classList.remove('offline');
            setTimeout(pollNext, 120); // ~8 FPS akıcı canlı yayın
          };
          frame.onerror = () => {
            if (!snapRunning) return;
            setTimeout(pollNext, 800);
          };
          frame.src = '/capture?_t=' + Date.now();
        }
        pollNext();
      }

      function sendCmd(variable, val) {
        fetch('/control?var=' + encodeURIComponent(variable) + '&val=' + encodeURIComponent(val) + '&_t=' + Date.now()).catch(()=>{});
      }

      let fTimeout;
      function setFlash(val) {
        val = parseInt(val, 10);
        flashRange.value = val;
        flashBadge.textContent = '%' + Math.round((val/255)*100);
        flashFab.classList.toggle('active', val > 0);
        document.querySelectorAll('.preset-btn').forEach(b => {
          b.classList.toggle('active', parseInt(b.dataset.v, 10) === val);
        });
        clearTimeout(fTimeout);
        fTimeout = setTimeout(() => sendCmd('flash', val), 40);
      }

      flashRange.oninput = (e) => setFlash(e.target.value);
      document.querySelectorAll('.preset-btn').forEach(b => {
        b.onclick = () => setFlash(b.dataset.v);
      });
      flashFab.onclick = () => setFlash(flashRange.value > 0 ? 0 : 128);

      vflipBtn.onclick = () => {
        vflip = !vflip;
        vflipBtn.classList.toggle('active', vflip);
        sendCmd('vflip', vflip ? 1 : 0);
      };
      hmirrorBtn.onclick = () => {
        hmirror = !hmirror;
        hmirrorBtn.classList.toggle('active', hmirror);
        sendCmd('hmirror', hmirror ? 1 : 0);
      };

      function capturePhoto() {
        const u = '/capture?_t=' + Date.now();
        const a = document.createElement('a');
        a.href = u;
        a.download = 'katman_foto_' + Date.now() + '.jpg';
        a.target = '_blank';
        a.click();
      }
      document.getElementById('snapFab').onclick = capturePhoto;
      document.getElementById('captureBtn').onclick = capturePhoto;
      document.getElementById('retryBtn').onclick = startStream;

      // Bilgi Modalı
      const modal = document.getElementById('infoModal');
      document.getElementById('infoBtn').onclick = () => modal.classList.add('active');
      document.getElementById('closeInfo').onclick = () => modal.classList.remove('active');
      document.getElementById('dismissInfo').onclick = () => modal.classList.remove('active');

      startStream();
    })();
  </script>
</body>
</html>
`;
