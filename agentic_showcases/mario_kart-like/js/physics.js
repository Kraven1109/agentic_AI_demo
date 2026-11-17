/**
 * physics.js - Arcade Kart Physics & Drift/Mini-Turbo Engine
 * Implements acceleration, drift hopping, multi-tier sparks, off-road drag, and lap logic
 */

class KartPhysics {
  constructor(track, isPlayer = false) {
    this.track = track;
    this.isPlayer = isPlayer;

    // Position & Orientation
    this.position = new THREE.Vector3(0, 0.48, 0);
    this.velocity = new THREE.Vector3(0, 0, 0);
    this.heading = 0; // Yaw angle (radians)
    this.speed = 0;

    // Handling Attributes
    this.maxSpeed = 38.0;
    this.reverseMaxSpeed = -14.0;
    this.accel = 24.0;
    this.brakeDecel = 38.0;
    this.drag = 0.975;
    this.turnSpeed = 2.4;

    // Drifting & Mini-Turbo
    this.isDrifting = false;
    this.driftDir = 0; // -1: Left drift, +1: Right drift
    this.driftChargeTime = 0;
    this.driftStage = 0; // 0: None, 1: Blue, 2: Orange, 3: Purple

    // Boost state (Mini-turbo, Mushroom, Boost Pad)
    this.isBoosting = false;
    this.boostTimer = 0;
    this.boostMultiplier = 1.0;

    // Hazards / Spin-out
    this.isSpinning = false;
    this.spinTimer = 0;

    // Coins & Speed modifiers
    this.coins = 0;
    this.isOffRoad = false;

    // Track progression & Lap counting
    this.progressU = 0.0;
    this.currentLap = 1;
    this.maxLaps = 3;
    this.lapFinished = false;
    this.raceFinished = false;
    this.hasCrossedHalfway = false;
    this.lapTimes = [0, 0, 0];
    this.totalTime = 0;

    // Initialize to Start Grid position
    this.resetToStart(0);
  }

  resetToStart(gridIndex = 0) {
    const startU = 0.005;
    const pt = this.track.curve.getPointAt(startU);
    const tangent = this.track.curve.getTangentAt(startU).normalize();
    const binormal = new THREE.Vector3().crossVectors(tangent, new THREE.Vector3(0, 1, 0)).normalize();

    // Stagger grid slots across 2 columns
    const row = Math.floor(gridIndex / 2);
    const col = (gridIndex % 2 === 0) ? -3.8 : 3.8;

    this.position.copy(pt)
      .addScaledVector(tangent, -(row * 7.5 + 2.0))
      .addScaledVector(binormal, col);
    this.position.y = 0.48;

    this.heading = Math.atan2(tangent.x, tangent.z);
    this.speed = 0;
    this.velocity.set(0, 0, 0);
    this.currentLap = 1;
    this.progressU = startU;
    this.hasCrossedHalfway = false;
    this.raceFinished = false;
    this.totalTime = 0;
    this.lapTimes = [0, 0, 0];
    this.coins = 0;
  }

  update(delta, inputs) {
    if (this.raceFinished) {
      // Slow to gentle halt on finish
      this.speed *= 0.95;
      this.velocity.set(Math.sin(this.heading) * this.speed, 0, Math.cos(this.heading) * this.speed);
      this.position.addScaledVector(this.velocity, delta);
      return;
    }

    this.totalTime += delta;
    this.lapTimes[this.currentLap - 1] += delta;

    // 1. Check Spin-out State
    if (this.isSpinning) {
      this.spinTimer -= delta;
      this.speed *= 0.88;
      if (this.spinTimer <= 0) {
        this.isSpinning = false;
      }
      this.velocity.set(Math.sin(this.heading) * this.speed, 0, Math.cos(this.heading) * this.speed);
      this.position.addScaledVector(this.velocity, delta);
      return;
    }

    // 2. Process Boost State
    if (this.isBoosting) {
      this.boostTimer -= delta;
      if (this.boostTimer <= 0) {
        this.isBoosting = false;
        this.boostMultiplier = 1.0;
      }
    }

    // 3. Track Off-road check & Coin modifier
    const trackInfo = this.track.getTrackProgress(this.position);
    this.isOffRoad = trackInfo.isOffRoad;

    let effectiveMaxSpeed = this.maxSpeed * (1 + this.coins * 0.008);
    if (this.isBoosting) {
      effectiveMaxSpeed *= this.boostMultiplier;
    } else if (this.isOffRoad) {
      effectiveMaxSpeed *= 0.42; // Heavy grass drag
    }

    // 4. Acceleration & Braking
    if (inputs.forward) {
      const currentAccel = this.isBoosting ? this.accel * 1.5 : this.accel;
      this.speed = Math.min(effectiveMaxSpeed, this.speed + currentAccel * delta);
    } else if (inputs.backward) {
      if (this.speed > 2.0) {
        this.speed = Math.max(0, this.speed - this.brakeDecel * delta);
      } else {
        this.speed = Math.max(this.reverseMaxSpeed, this.speed - (this.accel * 0.7) * delta);
      }
    } else {
      // Natural deceleration / rolling resistance
      this.speed *= Math.pow(this.drag, delta * 60);
      if (Math.abs(this.speed) < 0.2) this.speed = 0;
    }

    // 5. Drifting & Mini-Turbo Logic
    const steerInput = (inputs.left ? 1 : 0) - (inputs.right ? 1 : 0);

    if (inputs.drift && Math.abs(this.speed) > 10 && !this.isDrifting && steerInput !== 0) {
      // Initiate drift hop
      this.isDrifting = true;
      this.driftDir = steerInput;
      this.driftChargeTime = 0;
      this.driftStage = 0;
      if (this.isPlayer) AudioSys.playDriftScreech();
    }

    if (this.isDrifting) {
      if (!inputs.drift || Math.abs(this.speed) < 6) {
        // Release drift -> Trigger Mini-Turbo Boost!
        if (this.driftStage > 0) {
          this.applyMiniTurbo(this.driftStage);
        }
        this.isDrifting = false;
        this.driftStage = 0;
        this.driftChargeTime = 0;
      } else {
        // Accumulate drift charge
        this.driftChargeTime += delta;
        if (this.driftChargeTime > 2.6) {
          this.driftStage = 3; // Purple Ultra Mini-Turbo
        } else if (this.driftChargeTime > 1.5) {
          this.driftStage = 2; // Orange Super Mini-Turbo
        } else if (this.driftChargeTime > 0.65) {
          this.driftStage = 1; // Blue Mini-Turbo
        }

        if (this.isPlayer && Math.random() < 0.15) {
          AudioSys.playDriftScreech();
        }
      }
    }

    // 6. Steering & Drift Slide Angle
    let effectiveTurn = this.turnSpeed * (this.speed / this.maxSpeed);
    if (this.isDrifting) {
      effectiveTurn *= 1.45; // Sharper cornering during power slide
    }

    if (this.isDrifting) {
      // Steer biased towards drift direction
      const counterSteer = steerInput * 0.5;
      this.heading += (this.driftDir * 0.7 + counterSteer) * effectiveTurn * delta;
    } else {
      this.heading += steerInput * effectiveTurn * delta;
    }

    // 7. Calculate Velocity and Displace
    // Visual slide angle during drift
    const driftSlideAngle = this.isDrifting ? (-this.driftDir * 0.35) : 0;
    const moveHeading = this.heading + driftSlideAngle;

    this.velocity.set(
      Math.sin(moveHeading) * this.speed,
      0,
      Math.cos(moveHeading) * this.speed
    );

    this.position.addScaledVector(this.velocity, delta);

    // Keep height aligned with track/ground
    if (trackInfo.closestPoint) {
      this.position.y = THREE.MathUtils.lerp(this.position.y, trackInfo.closestPoint.y + 0.48, 0.2);
    }

    // 8. Lap Progression
    this.updateLapProgression(trackInfo.u);

    // 9. Interactive Object Pickups (Items, Coins, Boost Pads)
    this.checkTrackInteractions();
  }

  // Mini-Turbo boost upon releasing drift
  applyMiniTurbo(stage) {
    this.isBoosting = true;
    if (stage === 1) {
      this.boostTimer = 0.9;
      this.boostMultiplier = 1.25;
      this.speed = Math.max(this.speed, this.maxSpeed * 1.15);
    } else if (stage === 2) {
      this.boostTimer = 1.5;
      this.boostMultiplier = 1.4;
      this.speed = Math.max(this.speed, this.maxSpeed * 1.3);
    } else if (stage === 3) {
      this.boostTimer = 2.2;
      this.boostMultiplier = 1.55;
      this.speed = Math.max(this.speed, this.maxSpeed * 1.45);
    }

    if (this.isPlayer) {
      AudioSys.playTurboBoost(stage);
      if (window.triggerActionBanner) {
        window.triggerActionBanner('boost', stage === 3 ? 'ULTRA MINI-TURBO!!' : (stage === 2 ? 'SUPER MINI-TURBO!' : 'MINI-TURBO!'));
      }
    }
  }

  // Mushroom Super Boost
  applyMushroomBoost() {
    this.isBoosting = true;
    this.boostTimer = 3.2;
    this.boostMultiplier = 1.6;
    this.speed = Math.max(this.speed, this.maxSpeed * 1.5);
    if (this.isPlayer) {
      AudioSys.playMushroom();
      if (window.triggerActionBanner) {
        window.triggerActionBanner('boost', 'MUSHROOM BOOST!');
      }
    }
  }

  // Boost Pad surge
  applyBoostPadSurge() {
    this.isBoosting = true;
    this.boostTimer = 1.8;
    this.boostMultiplier = 1.65;
    this.speed = Math.max(this.speed, this.maxSpeed * 1.55);
    if (this.isPlayer) {
      AudioSys.playMushroom();
      if (window.triggerActionBanner) {
        window.triggerActionBanner('boost', 'BOOST PAD TURBO!');
      }
    }
  }

  // Spin out on banana / shell hazard
  spinOut() {
    if (this.isSpinning) return;
    this.isSpinning = true;
    this.spinTimer = 1.2;
    this.isBoosting = false;
    this.isDrifting = false;
    this.coins = Math.max(0, this.coins - 2); // Drop 2 coins
    if (this.isPlayer) {
      AudioSys.playBananaSlip();
      if (window.triggerActionBanner) {
        window.triggerActionBanner('spin', 'SPIN OUT!');
      }
    }
  }

  // Track progress & Lap counting
  updateLapProgression(newU) {
    this.progressU = newU;

    if (newU > 0.45 && newU < 0.65) {
      this.hasCrossedHalfway = true;
    }

    // Crossed Finish Line
    if (this.hasCrossedHalfway && newU < 0.08) {
      this.hasCrossedHalfway = false;
      this.currentLap++;

      if (this.currentLap > this.maxLaps) {
        this.currentLap = this.maxLaps;
        this.raceFinished = true;
        if (window.triggerRaceFinish) {
          window.triggerRaceFinish();
        }
      } else {
        if (this.isPlayer && window.triggerLapBanner) {
          window.triggerLapBanner(this.currentLap);
        }
      }
    }
  }

  // Check collision with Item Boxes, Coins, and Boost Pads
  checkTrackInteractions() {
    // 1. Boost Pads
    this.track.boostPads.forEach(pad => {
      if (this.position.distanceTo(pad.pos) < 6.0) {
        this.applyBoostPadSurge();
      }
    });

    // 2. Item Boxes
    this.track.itemBoxes.forEach(item => {
      if (item.active && this.position.distanceTo(item.mesh.position) < 2.5) {
        item.active = false;
        item.mesh.visible = false;
        item.respawnTimer = 4.0;
        if (this.isPlayer) {
          AudioSys.playItemBoxHit();
          if (window.triggerItemRoulette) {
            window.triggerItemRoulette();
          }
        }
      }
    });

    // 3. Gold Coins
    this.track.coins.forEach(coin => {
      if (coin.active && this.position.distanceTo(coin.mesh.position) < 2.2) {
        coin.active = false;
        coin.mesh.visible = false;
        coin.respawnTimer = 6.0;
        this.coins = Math.min(10, this.coins + 1);
        if (this.isPlayer) {
          AudioSys.playCoin();
        }
      }
    });
  }
}
