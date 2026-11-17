/**
 * game.js - Master Game Loop, Camera Controller, HUD & Race State Machine
 * Coordinates 3D Scene, Physics, AI, Items, Minimap, and Speed Lines FX
 */

class MarioKartGame {
  constructor() {
    this.container = document.getElementById('game-container');
    this.canvas = document.getElementById('webgl-canvas');
    this.fxCanvas = document.getElementById('fx-canvas');
    this.fxCtx = this.fxCanvas.getContext('2d');
    this.minimapCanvas = document.getElementById('minimap-canvas');
    this.minimapCtx = this.minimapCanvas.getContext('2d');

    // Race State: 'COUNTDOWN', 'RACING', 'FINISHED'
    this.state = 'COUNTDOWN';
    this.countdownValue = 3;

    // Inputs
    this.inputs = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      drift: false,
      item: false,
    };

    // Camera Modes: 0: Normal Chase, 1: Far Chase, 2: Bumper Cam
    this.cameraMode = 0;
    this.cameraOffsets = [
      { dist: 7.5, height: 3.2, lookH: 1.2 }, // Normal
      { dist: 11.0, height: 4.8, lookH: 1.5 }, // Far
      { dist: 0.8, height: 1.4, lookH: 1.1 },  // Bumper
    ];

    this.clock = new THREE.Clock();
    this.allRacers = [];
    this.playerRank = 1;

    this.initThree();
    this.initWorld();
    this.initRacers();
    this.initListeners();
    this.resize();

    // Start Countdown Sequence
    this.startCountdown();

    // Game Loop
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  initThree() {
    // 1. Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x60a5fa); // Bright Mario Sky Blue
    this.scene.fog = new THREE.FogExp2(0x60a5fa, 0.0035);

    // 2. Camera
    this.camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.2, 800);

    // 3. Renderer with Soft Shadows
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;

    // 4. Lighting (Vibrant Mario World Sun & Ambient)
    const hemiLight = new THREE.HemisphereLight(0xbbe1fa, 0x48bb78, 0.65);
    this.scene.add(hemiLight);

    this.dirLight = new THREE.DirectionalLight(0xfff8e7, 1.25);
    this.dirLight.position.set(100, 160, 80);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.width = 2048;
    this.dirLight.shadow.mapSize.height = 2048;
    this.dirLight.shadow.camera.near = 0.5;
    this.dirLight.shadow.camera.far = 400;
    const d = 120;
    this.dirLight.shadow.camera.left = -d;
    this.dirLight.shadow.camera.right = d;
    this.dirLight.shadow.camera.top = d;
    this.dirLight.shadow.camera.bottom = -d;
    this.dirLight.shadow.bias = -0.0005;
    this.scene.add(this.dirLight);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.35);
    this.scene.add(ambientLight);
  }

  initWorld() {
    this.track = new RaceTrack(this.scene);
  }

  initRacers() {
    // 1. Player Racer (Mario)
    this.playerModel = new KartModel(this.scene, {
      primaryColor: 0xe52521,
      driverCapColor: 0xe52521,
      driverShirtColor: 0xe52521,
      isPlayer: true,
    });
    this.playerPhysics = new KartPhysics(this.track, true);
    this.playerPhysics.resetToStart(0); // Pole position

    this.playerRacer = {
      name: 'Mario',
      model: this.playerModel,
      physics: this.playerPhysics,
      isPlayer: true,
    };

    // 2. Item System
    this.itemSystem = new ItemSystem(this.scene, this.track, []);

    // 3. AI Opponents (Luigi, Peach, Bowser, Toad, Yoshi)
    this.aiManager = new AIRacerManager(this.scene, this.track, this.itemSystem);

    this.allRacers = [this.playerRacer, ...this.aiManager.rivals];
    this.itemSystem.setRacers(this.allRacers);

    // Initial transform sync
    this.playerModel.setTransform(this.playerPhysics.position, this.playerPhysics.heading);

    // Position camera immediately behind Mario
    const cfg = this.cameraOffsets[this.cameraMode];
    const behindVec = new THREE.Vector3(-Math.sin(this.playerPhysics.heading), 0, -Math.cos(this.playerPhysics.heading));
    this.camera.position.copy(this.playerPhysics.position).addScaledVector(behindVec, cfg.dist);
    this.camera.position.y += cfg.height;
    const lookTarget = new THREE.Vector3().copy(this.playerPhysics.position);
    lookTarget.y += cfg.lookH;
    this.camera.lookAt(lookTarget);

    // Connect globals for HUD actions
    window.getPlayerRank = () => this.playerRank;
    window.triggerItemRoulette = () => this.itemSystem.startRoulette();
    window.triggerActionBanner = (type, text) => this.showActionBanner(type, text);
    window.triggerLapBanner = (lap) => this.showLapBanner(lap);
    window.triggerRaceFinish = () => this.finishRace();
  }

  // Countdown 3 - 2 - 1 - GO!
  startCountdown() {
    this.state = 'COUNTDOWN';
    const banner = document.getElementById('center-banner');
    const lights = [
      document.getElementById('light-1'),
      document.getElementById('light-2'),
      document.getElementById('light-3'),
    ];

    let count = 3;
    const countText = document.getElementById('countdown-text');

    const tick = () => {
      if (count > 0) {
        if (countText) countText.textContent = count;
        if (lights[3 - count]) lights[3 - count].classList.add('active');
        AudioSys.playCountdownBeep(false);
        count--;
        setTimeout(tick, 950);
      } else {
        if (countText) {
          countText.textContent = 'GO!!';
          countText.classList.add('go');
        }
        lights.forEach(l => {
          l.classList.remove('active', 'red');
          l.classList.add('green', 'active');
        });
        AudioSys.playCountdownBeep(true);
        AudioSys.startBGM();
        this.state = 'RACING';

        setTimeout(() => {
          if (banner) banner.style.display = 'none';
        }, 1200);
      }
    };

    setTimeout(tick, 600);
  }

  initListeners() {
    window.addEventListener('resize', () => this.resize());

    // Keyboard controls
    const onKey = (e, isDown) => {
      AudioSys.init();
      AudioSys.resume();

      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          this.inputs.forward = isDown;
          break;
        case 'KeyS':
        case 'ArrowDown':
          this.inputs.backward = isDown;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          this.inputs.left = isDown;
          break;
        case 'KeyD':
        case 'ArrowRight':
          this.inputs.right = isDown;
          break;
        case 'Space':
        case 'ShiftLeft':
        case 'ShiftRight':
          this.inputs.drift = isDown;
          break;
        case 'KeyE':
        case 'Enter':
          if (isDown) this.itemSystem.usePlayerItem(this.playerRacer);
          break;
        case 'KeyC':
          if (isDown) this.toggleCamera();
          break;
        case 'KeyR':
          if (isDown) this.restartRace();
          break;
      }
    };

    window.addEventListener('keydown', (e) => onKey(e, true));
    window.addEventListener('keyup', (e) => onKey(e, false));

    // Touch Controls
    const bindTouch = (id, key, triggerFunc) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('touchstart', (e) => {
        e.preventDefault();
        AudioSys.init();
        AudioSys.resume();
        if (triggerFunc) triggerFunc();
        else this.inputs[key] = true;
      });
      el.addEventListener('touchend', (e) => {
        e.preventDefault();
        if (!triggerFunc) this.inputs[key] = false;
      });
    };

    bindTouch('btn-gas', 'forward');
    bindTouch('btn-brake', 'backward');
    bindTouch('btn-left', 'left');
    bindTouch('btn-right', 'right');
    bindTouch('btn-drift', 'drift');
    bindTouch('btn-item', null, () => this.itemSystem.usePlayerItem(this.playerRacer));

    // Audio & View toggle buttons
    const audioBtn = document.getElementById('btn-audio');
    if (audioBtn) {
      audioBtn.addEventListener('click', () => {
        const isMuted = AudioSys.toggleMute();
        audioBtn.textContent = isMuted ? '🔇' : '🔊';
      });
    }

    const camBtn = document.getElementById('btn-camera');
    if (camBtn) {
      camBtn.addEventListener('click', () => this.toggleCamera());
    }

    const restartBtn = document.getElementById('btn-restart');
    if (restartBtn) {
      restartBtn.addEventListener('click', () => this.restartRace());
    }
  }

  toggleCamera() {
    this.cameraMode = (this.cameraMode + 1) % this.cameraOffsets.length;
  }

  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);

    this.fxCanvas.width = w;
    this.fxCanvas.height = h;

    this.minimapCanvas.width = 170;
    this.minimapCanvas.height = 170;
  }

  // Action Banners (MINI-TURBO!, SPIN OUT!, etc.)
  showActionBanner(type, text) {
    const banner = document.getElementById('action-banner');
    if (!banner) return;
    banner.className = `action-notification show ${type}`;
    banner.textContent = text;
    clearTimeout(this.bannerTimeout);
    this.bannerTimeout = setTimeout(() => {
      banner.classList.remove('show');
    }, 1500);
  }

  showLapBanner(lap) {
    const lapBox = document.getElementById('lap-box');
    if (lap === 3) {
      if (lapBox) {
        lapBox.classList.add('final-lap');
        lapBox.textContent = 'FINAL LAP!';
      }
      this.showActionBanner('boost', '⚡ FINAL LAP! ⚡');
    } else {
      if (lapBox) lapBox.textContent = `LAP ${lap}/3`;
      this.showActionBanner('boost', `LAP ${lap}!`);
    }
  }

  // Finish Race Screen
  finishRace() {
    this.state = 'FINISHED';
    AudioSys.stopBGM();
    AudioSys.playTurboBoost(3);

    const modal = document.getElementById('finish-modal');
    if (modal) modal.classList.add('active');

    // Build Leaderboard rows
    const tbody = document.getElementById('leaderboard-body');
    if (tbody) {
      tbody.innerHTML = '';
      this.allRacers.forEach((r, idx) => {
        const row = document.createElement('tr');
        if (r.isPlayer) row.classList.add('player-row');

        const mins = Math.floor(r.physics.totalTime / 60);
        const secs = (r.physics.totalTime % 60).toFixed(2);
        const timeStr = `${mins.toString().padStart(2, '0')}:${secs.padStart(5, '0')}`;

        row.innerHTML = `
          <td>#${idx + 1}</td>
          <td>${r.name}</td>
          <td>${timeStr}</td>
        `;
        tbody.appendChild(row);
      });
    }
  }

  restartRace() {
    const modal = document.getElementById('finish-modal');
    if (modal) modal.classList.remove('active');
    const banner = document.getElementById('center-banner');
    if (banner) banner.style.display = 'flex';

    this.playerPhysics.resetToStart(0);
    this.aiManager.rivals.forEach((r, idx) => r.physics.resetToStart(idx + 1));
    this.state = 'COUNTDOWN';
    this.startCountdown();
  }

  // Update Dynamic Camera
  updateCamera(delta) {
    const p = this.playerPhysics;
    const cfg = this.cameraOffsets[this.cameraMode];

    // FOV Speed Push effect
    const targetFOV = p.isBoosting ? 74 : (p.isOffRoad ? 58 : 62);
    this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, targetFOV, delta * 4);
    this.camera.updateProjectionMatrix();

    if (this.cameraMode === 2) {
      // Bumper / First-Person Cam
      const forwardVec = new THREE.Vector3(Math.sin(p.heading), 0, Math.cos(p.heading));
      const eyePos = new THREE.Vector3().copy(p.position).addScaledVector(forwardVec, 1.2);
      eyePos.y += cfg.height;
      this.camera.position.copy(eyePos);
      const lookTarget = new THREE.Vector3().copy(eyePos).addScaledVector(forwardVec, 15);
      this.camera.lookAt(lookTarget);
      return;
    }

    // Third-person chase camera
    const behindVec = new THREE.Vector3(-Math.sin(p.heading), 0, -Math.cos(p.heading));
    const targetCamPos = new THREE.Vector3().copy(p.position)
      .addScaledVector(behindVec, cfg.dist);
    targetCamPos.y += cfg.height;

    // Smooth lerp
    this.camera.position.lerp(targetCamPos, delta * 9);

    const lookTarget = new THREE.Vector3().copy(p.position);
    lookTarget.y += cfg.lookH;
    this.camera.lookAt(lookTarget);

    // Roll camera slightly during drift
    if (p.isDrifting) {
      this.camera.rotation.z = THREE.MathUtils.lerp(this.camera.rotation.z, -p.driftDir * 0.08, delta * 6);
    } else {
      this.camera.rotation.z = THREE.MathUtils.lerp(this.camera.rotation.z, 0, delta * 6);
    }
  }

  // Draw Speed Lines on 2D Overlay
  renderSpeedLines() {
    this.fxCtx.clearRect(0, 0, this.fxCanvas.width, this.fxCanvas.height);
    if (!this.playerPhysics.isBoosting) return;

    const w = this.fxCanvas.width;
    const h = this.fxCanvas.height;
    const cx = w / 2;
    const cy = h / 2;

    this.fxCtx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    this.fxCtx.lineWidth = 2.5;

    for (let i = 0; i < 28; i++) {
      const angle = Math.random() * Math.PI * 2;
      const innerDist = 180 + Math.random() * 120;
      const length = 120 + Math.random() * 200;

      const x1 = cx + Math.cos(angle) * innerDist;
      const y1 = cy + Math.sin(angle) * innerDist;
      const x2 = cx + Math.cos(angle) * (innerDist + length);
      const y2 = cy + Math.sin(angle) * (innerDist + length);

      this.fxCtx.beginPath();
      this.fxCtx.moveTo(x1, y1);
      this.fxCtx.lineTo(x2, y2);
      this.fxCtx.stroke();
    }
  }

  // Draw 2D Minimap Radar
  renderMinimap() {
    const ctx = this.minimapCtx;
    const w = this.minimapCanvas.width;
    const h = this.minimapCanvas.height;
    ctx.clearRect(0, 0, w, h);

    // Track coordinates bounds approx: X: [-180, 230], Z: [-120, 220]
    const mapScale = 0.32;
    const offsetX = w / 2 - 10;
    const offsetY = h / 2 - 10;

    const toMapX = (worldX) => offsetX + worldX * mapScale;
    const toMapY = (worldZ) => offsetY + worldZ * mapScale;

    // Draw Track Line
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();

    const samplePts = this.track.samples;
    for (let i = 0; i < samplePts.length; i++) {
      const pt = samplePts[i].point;
      const mx = toMapX(pt.x);
      const my = toMapY(pt.z);
      if (i === 0) ctx.moveTo(mx, my);
      else ctx.lineTo(mx, my);
    }
    ctx.closePath();
    ctx.stroke();

    // Inner asphalt fill line
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Draw Hazards (Bananas)
    this.itemSystem.activeBananas.forEach(b => {
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.arc(toMapX(b.pos.x), toMapY(b.pos.z), 3, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw AI Rivals
    this.aiManager.rivals.forEach(r => {
      ctx.fillStyle = '#' + r.model.primaryColor.toString(16).padStart(6, '0');
      ctx.beginPath();
      ctx.arc(toMapX(r.physics.position.x), toMapY(r.physics.position.z), 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });

    // Draw Player Blip (Red Mario Circle with White Center)
    const pPos = this.playerPhysics.position;
    const pmx = toMapX(pPos.x);
    const pmy = toMapY(pPos.z);

    ctx.fillStyle = '#e52521';
    ctx.beginPath();
    ctx.arc(pmx, pmy, 6.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(pmx, pmy, 3.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(pmx, pmy, 6.5, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Update HUD
  updateHUD() {
    // 1. Sort Racers to Determine Current Ranking
    this.allRacers.sort((a, b) => {
      if (a.physics.currentLap !== b.physics.currentLap) {
        return b.physics.currentLap - a.physics.currentLap;
      }
      return b.physics.progressU - a.physics.progressU;
    });

    const rankIdx = this.allRacers.findIndex(r => r.isPlayer);
    this.playerRank = rankIdx + 1;

    // Rank Number & Suffix
    const rankNumElem = document.getElementById('rank-number');
    const rankSufElem = document.getElementById('rank-suffix');
    if (rankNumElem) rankNumElem.textContent = this.playerRank;
    if (rankSufElem) {
      const suffixes = ['st', 'nd', 'rd', 'th', 'th', 'th'];
      rankSufElem.textContent = suffixes[this.playerRank - 1] || 'th';
    }

    // 2. Speedometer
    const speedKmH = Math.round(Math.abs(this.playerPhysics.speed) * 2.8);
    const speedValElem = document.getElementById('speedo-value');
    if (speedValElem) speedValElem.textContent = speedKmH;

    // 3. Drift Spark Gauge
    const driftFill = document.getElementById('drift-fill');
    if (driftFill) {
      if (this.playerPhysics.isDrifting) {
        const pct = Math.min(100, (this.playerPhysics.driftChargeTime / 2.8) * 100);
        driftFill.style.width = `${pct}%`;
        driftFill.className = 'drift-fill ' + (
          this.playerPhysics.driftStage === 3 ? 'stage-purple' :
          (this.playerPhysics.driftStage === 2 ? 'stage-orange' : 'stage-blue')
        );
      } else {
        driftFill.style.width = '0%';
      }
    }

    // 4. Timer Display
    const timerElem = document.getElementById('timer-display');
    if (timerElem) {
      const t = this.playerPhysics.totalTime;
      const mins = Math.floor(t / 60);
      const secs = (t % 60).toFixed(2);
      timerElem.textContent = `${mins.toString().padStart(2, '0')}:${secs.padStart(5, '0')}`;
    }

    // 5. Coin Count
    const coinElem = document.getElementById('coin-count');
    if (coinElem) coinElem.textContent = this.playerPhysics.coins;
  }

  // Master Render Frame
  animate() {
    requestAnimationFrame(this.animate);

    const delta = Math.min(this.clock.getDelta(), 0.05); // Cap delta to prevent physics explosions
    const time = this.clock.getElapsedTime();

    // 1. Physics & Logic Updates
    if (this.state === 'RACING') {
      this.playerPhysics.update(delta, this.inputs);
      this.aiManager.update(delta, this.playerRacer);
      this.itemSystem.update(delta);
    }

    // Update Player Model
    const steer = (this.inputs.left ? 1 : 0) - (this.inputs.right ? 1 : 0);
    this.playerModel.setTransform(this.playerPhysics.position, this.playerPhysics.heading);
    this.playerModel.update(
      delta,
      this.playerPhysics.speed,
      steer,
      this.playerPhysics.driftStage,
      this.playerPhysics.isBoosting,
      this.playerPhysics.isSpinning
    );

    // Track Animation (Item Box Spin, Coins)
    this.track.update(delta, time);

    // Update Sound Engine
    AudioSys.updateEngine(this.playerPhysics.speed, this.playerPhysics.maxSpeed, this.inputs.forward);

    // Dynamic Camera Follow
    this.updateCamera(delta);

    // Directional Light follow player for consistent shadow coverage
    this.dirLight.position.set(
      this.playerPhysics.position.x + 80,
      this.playerPhysics.position.y + 120,
      this.playerPhysics.position.z + 60
    );
    this.dirLight.target.position.copy(this.playerPhysics.position);
    this.dirLight.target.updateMatrixWorld();

    // Render 3D Scene
    this.renderer.render(this.scene, this.camera);

    // Render 2D Overlays & HUD
    this.renderSpeedLines();
    this.renderMinimap();
    this.updateHUD();
  }
}

// Start Game on Load
window.addEventListener('DOMContentLoaded', () => {
  window.game = new MarioKartGame();
});
