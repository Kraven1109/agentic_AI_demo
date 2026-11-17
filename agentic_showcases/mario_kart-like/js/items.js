/**
 * items.js - Mario Kart Items & Projectile System
 * Implements item roulette, homing red shells, green shells, banana traps, mushrooms, and stars
 */

class ItemSystem {
  constructor(scene, track, racers = []) {
    this.scene = scene;
    this.track = track;
    this.racers = racers; // Array of { physics, model, isPlayer, name }

    this.activeShells = [];
    this.activeBananas = [];
    this.playerCurrentItem = null;
    this.isRouletteRunning = false;
  }

  setRacers(racers) {
    this.racers = racers;
  }

  // Trigger HUD Roulette when hitting Item Box
  startRoulette(callback) {
    if (this.isRouletteRunning || this.playerCurrentItem) return;
    this.isRouletteRunning = true;

    const slotElem = document.getElementById('item-slot');
    const iconElem = document.getElementById('item-icon');
    const promptElem = document.getElementById('item-prompt');

    if (slotElem) slotElem.classList.add('roulette');

    const itemTypes = ['mushroom', 'red_shell', 'green_shell', 'banana', 'star'];
    const itemIcons = Textures.getItemIconDataURLs();

    let ticks = 0;
    const maxTicks = 16;
    const rollInterval = setInterval(() => {
      ticks++;
      const randItem = itemTypes[Math.floor(Math.random() * itemTypes.length)];
      if (iconElem && itemIcons[randItem]) {
        iconElem.src = itemIcons[randItem];
      }
      AudioSys.playItemRollTick();

      if (ticks >= maxTicks) {
        clearInterval(rollInterval);
        this.isRouletteRunning = false;
        if (slotElem) {
          slotElem.classList.remove('roulette');
          slotElem.classList.add('active');
        }

        // Mario Kart Probabilistic Selection based on Player Rank
        const playerRank = window.getPlayerRank ? window.getPlayerRank() : 1;
        let chosenItem = 'mushroom';
        const dice = Math.random();

        if (playerRank === 1) {
          // 1st place gets mostly bananas and green shells
          chosenItem = dice < 0.6 ? 'banana' : (dice < 0.85 ? 'green_shell' : 'mushroom');
        } else if (playerRank <= 3) {
          chosenItem = dice < 0.35 ? 'red_shell' : (dice < 0.65 ? 'mushroom' : 'green_shell');
        } else {
          // Lower places get stars and red shells!
          chosenItem = dice < 0.4 ? 'star' : (dice < 0.75 ? 'red_shell' : 'mushroom');
        }

        this.playerCurrentItem = chosenItem;
        if (iconElem) iconElem.src = itemIcons[chosenItem];
        if (promptElem) promptElem.textContent = 'PRESS [E] / [TAP]';

        AudioSys.playItemReady();
        if (callback) callback(chosenItem);
      }
    }, 90);
  }

  // Use current item
  usePlayerItem(playerRacer) {
    if (!this.playerCurrentItem || this.isRouletteRunning) return;

    const item = this.playerCurrentItem;
    this.playerCurrentItem = null;

    // Reset HUD slot
    const slotElem = document.getElementById('item-slot');
    const iconElem = document.getElementById('item-icon');
    const promptElem = document.getElementById('item-prompt');

    if (slotElem) slotElem.classList.remove('active');
    if (iconElem) iconElem.src = '';
    if (promptElem) promptElem.textContent = 'EMPTY';

    if (item === 'mushroom') {
      playerRacer.physics.applyMushroomBoost();
    } else if (item === 'banana') {
      this.dropBanana(playerRacer);
    } else if (item === 'green_shell') {
      this.fireGreenShell(playerRacer);
    } else if (item === 'red_shell') {
      this.fireRedShell(playerRacer);
    } else if (item === 'star') {
      this.applyStarPower(playerRacer);
    }
  }

  // Drop Banana behind racer
  dropBanana(racer) {
    const behindVec = new THREE.Vector3(
      -Math.sin(racer.physics.heading),
      0,
      -Math.cos(racer.physics.heading)
    );
    const dropPos = new THREE.Vector3().copy(racer.physics.position).addScaledVector(behindVec, 3.5);
    dropPos.y = 0.35;

    // Build 3D Banana Mesh
    const bananaGroup = new THREE.Group();
    const bananaMat = new THREE.MeshStandardMaterial({ color: 0xffeb3b, roughness: 0.4 });
    const stemMat = new THREE.MeshStandardMaterial({ color: 0x4e342e });

    // Curved Peel
    for (let i = 0; i < 3; i++) {
      const angle = (i / 3) * Math.PI * 2;
      const peel = new THREE.Mesh(new THREE.ConeGeometry(0.3, 1.1, 8), bananaMat);
      peel.position.set(Math.cos(angle) * 0.35, 0.25, Math.sin(angle) * 0.35);
      peel.rotation.x = Math.PI / 4;
      peel.rotation.y = angle;
      peel.castShadow = true;
      bananaGroup.add(peel);
    }

    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.4, 8), stemMat);
    stem.position.y = 0.65;
    bananaGroup.add(stem);

    bananaGroup.position.copy(dropPos);
    this.scene.add(bananaGroup);

    this.activeBananas.push({
      mesh: bananaGroup,
      pos: dropPos,
      dropper: racer,
      life: 45, // Seconds
    });

    if (racer.isPlayer) {
      AudioSys.playShellShoot();
    }
  }

  // Fire Green Shell straight ahead
  fireGreenShell(racer) {
    const forwardVec = new THREE.Vector3(
      Math.sin(racer.physics.heading),
      0,
      Math.cos(racer.physics.heading)
    );
    const spawnPos = new THREE.Vector3().copy(racer.physics.position).addScaledVector(forwardVec, 3.5);
    spawnPos.y = 0.55;

    const shell = this.buildShellMesh(0x00c853);
    shell.position.copy(spawnPos);
    this.scene.add(shell);

    this.activeShells.push({
      mesh: shell,
      pos: spawnPos,
      velocity: forwardVec.clone().multiplyScalar(58.0),
      isHoming: false,
      shooter: racer,
      life: 8.0,
    });

    if (racer.isPlayer) {
      AudioSys.playShellShoot();
    }
  }

  // Fire Homing Red Shell targeting opponent directly ahead
  fireRedShell(racer) {
    const forwardVec = new THREE.Vector3(
      Math.sin(racer.physics.heading),
      0,
      Math.cos(racer.physics.heading)
    );
    const spawnPos = new THREE.Vector3().copy(racer.physics.position).addScaledVector(forwardVec, 3.5);
    spawnPos.y = 0.55;

    const shell = this.buildShellMesh(0xe52521);
    shell.position.copy(spawnPos);
    this.scene.add(shell);

    // Find nearest target ahead along track
    let targetRacer = null;
    let minProgressDiff = Infinity;
    this.racers.forEach(r => {
      if (r !== racer) {
        let diff = r.physics.progressU - racer.physics.progressU;
        if (diff < 0) diff += 1.0;
        if (diff > 0.01 && diff < minProgressDiff) {
          minProgressDiff = diff;
          targetRacer = r;
        }
      }
    });

    this.activeShells.push({
      mesh: shell,
      pos: spawnPos,
      velocity: forwardVec.clone().multiplyScalar(52.0),
      isHoming: true,
      target: targetRacer,
      shooter: racer,
      life: 10.0,
    });

    if (racer.isPlayer) {
      AudioSys.playShellShoot();
    }
  }

  // Build 3D Mario Shell Mesh
  buildShellMesh(shellColor) {
    const shellGroup = new THREE.Group();
    const domeMat = new THREE.MeshStandardMaterial({ color: shellColor, roughness: 0.3 });
    const rimMat = new THREE.MeshStandardMaterial({ color: 0xfff9c4, roughness: 0.5 });

    // Dome
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.7, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), domeMat);
    dome.position.y = 0.25;
    dome.castShadow = true;
    shellGroup.add(dome);

    // Rim Collar
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.68, 0.12, 10, 20), rimMat);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.22;
    shellGroup.add(rim);

    return shellGroup;
  }

  // Star Super Invincibility
  applyStarPower(racer) {
    racer.physics.isBoosting = true;
    racer.physics.boostTimer = 6.0;
    racer.physics.boostMultiplier = 1.5;
    racer.isStar = true;

    if (racer.isPlayer) {
      AudioSys.playTurboBoost(3);
      if (window.triggerActionBanner) {
        window.triggerActionBanner('boost', 'SUPER STAR POWER!');
      }
    }

    setTimeout(() => {
      racer.isStar = false;
    }, 6000);
  }

  // Update Projectiles and check collisions with racers
  update(delta) {
    // 1. Update Shells
    for (let i = this.activeShells.length - 1; i >= 0; i--) {
      const shell = this.activeShells[i];
      shell.life -= delta;
      shell.mesh.rotation.y += delta * 12; // Spin

      if (shell.isHoming && shell.target) {
        // Steer towards target position
        const toTarget = new THREE.Vector3().subVectors(shell.target.physics.position, shell.pos);
        toTarget.y = 0;
        toTarget.normalize();
        shell.velocity.lerp(toTarget.multiplyScalar(62.0), delta * 4.5);
      }

      shell.pos.addScaledVector(shell.velocity, delta);
      shell.mesh.position.copy(shell.pos);

      // Check hit with racers
      let hit = false;
      for (const racer of this.racers) {
        if (racer !== shell.shooter && shell.pos.distanceTo(racer.physics.position) < 2.4) {
          racer.physics.spinOut();
          hit = true;
          break;
        }
      }

      if (hit || shell.life <= 0) {
        this.scene.remove(shell.mesh);
        this.activeShells.splice(i, 1);
      }
    }

    // 2. Update Bananas
    for (let i = this.activeBananas.length - 1; i >= 0; i--) {
      const banana = this.activeBananas[i];
      banana.life -= delta;

      // Check hit with any racer
      let hit = false;
      for (const racer of this.racers) {
        if (banana.pos.distanceTo(racer.physics.position) < 1.9) {
          racer.physics.spinOut();
          hit = true;
          break;
        }
      }

      if (hit || banana.life <= 0) {
        this.scene.remove(banana.mesh);
        this.activeBananas.splice(i, 1);
      }
    }
  }
}
