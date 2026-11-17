/**
 * ai.js - Autonomous AI Rival Racers
 * Controls 5 distinct rivals with spline navigation, corner drifting, dynamic racing line offsets, and rubber-banding
 */

class AIRacerManager {
  constructor(scene, track, itemSystem) {
    this.scene = scene;
    this.track = track;
    this.itemSystem = itemSystem;
    this.rivals = [];

    this.rivalConfigs = [
      { name: 'Luigi', color: 0x2e7d32, capColor: 0x2e7d32, shirtColor: 0x2e7d32, speedMod: 0.98, laneOffset: -2.2 },
      { name: 'Peach', color: 0xf472b6, capColor: 0xf472b6, shirtColor: 0xfbcfe8, speedMod: 0.99, laneOffset: 2.4 },
      { name: 'Bowser', color: 0xf59e0b, capColor: 0x15803d, shirtColor: 0xd97706, speedMod: 1.02, laneOffset: 0.0 },
      { name: 'Toad', color: 0x06b6d4, capColor: 0xffffff, shirtColor: 0x0284c7, speedMod: 0.97, laneOffset: -3.5 },
      { name: 'Yoshi', color: 0x84cc16, capColor: 0x84cc16, shirtColor: 0xffffff, speedMod: 1.00, laneOffset: 3.2 },
    ];

    this.initRivals();
  }

  initRivals() {
    this.rivalConfigs.forEach((cfg, idx) => {
      const model = new KartModel(this.scene, {
        primaryColor: cfg.color,
        driverCapColor: cfg.capColor,
        driverShirtColor: cfg.shirtColor,
        isPlayer: false,
      });

      const physics = new KartPhysics(this.track, false);
      physics.maxSpeed *= cfg.speedMod;
      physics.resetToStart(idx + 1); // Grid slots 1 to 5

      this.rivals.push({
        name: cfg.name,
        model,
        physics,
        laneOffset: cfg.laneOffset,
        isPlayer: false,
        lookaheadU: 0.035,
        aiTimer: Math.random() * 5,
      });
    });
  }

  // Update AI Rivals logic each frame
  update(delta, playerRacer) {
    this.rivals.forEach(rival => {
      const p = rival.physics;

      if (p.raceFinished) {
        p.speed *= 0.96;
        modelUpdate(rival, delta);
        return;
      }

      rival.aiTimer += delta;

      // 1. Spline Lookahead Navigation
      // Calculate target point ahead along track spline
      let targetU = (p.progressU + rival.lookaheadU) % 1.0;
      const targetPt = this.track.curve.getPointAt(targetU);
      const tangent = this.track.curve.getTangentAt(targetU).normalize();
      const binormal = new THREE.Vector3().crossVectors(tangent, new THREE.Vector3(0, 1, 0)).normalize();

      // Desired position with lateral lane offset
      const desiredPos = new THREE.Vector3().copy(targetPt).addScaledVector(binormal, rival.laneOffset);

      // 2. Compute Steering Angle towards target
      const toTarget = new THREE.Vector3().subVectors(desiredPos, p.position);
      const desiredHeading = Math.atan2(toTarget.x, toTarget.z);

      let angleDiff = desiredHeading - p.heading;
      // Normalize angle difference to [-PI, PI]
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

      const steerInput = Math.max(-1.0, Math.min(1.0, angleDiff * 1.8));

      // 3. Dynamic Rubber-banding (keeps race fiercely competitive)
      let distToPlayer = playerRacer.physics.progressU - p.progressU;
      if (distToPlayer < -0.5) distToPlayer += 1.0;
      if (distToPlayer > 0.5) distToPlayer -= 1.0;

      let speedBoostFactor = 1.0;
      if (distToPlayer > 0.05) {
        // Player is ahead -> Catch-up boost!
        speedBoostFactor = 1.06;
      } else if (distToPlayer < -0.15) {
        // Player is far behind -> Ease up slightly
        speedBoostFactor = 0.94;
      }

      // 4. Input simulation
      const aiInputs = {
        forward: true,
        backward: false,
        left: steerInput > 0.1,
        right: steerInput < -0.1,
        drift: Math.abs(steerInput) > 0.65, // Drift on tight turns!
      };

      p.maxSpeed = 38.0 * speedBoostFactor;
      p.update(delta, aiInputs);

      // 5. Update 3D Model
      rival.model.setTransform(p.position, p.heading);
      rival.model.update(delta, p.speed, steerInput, p.driftStage, p.isBoosting, p.isSpinning);

      // 6. Occasional AI item drop (if near opponents)
      if (rival.aiTimer > 8.0 && Math.random() < 0.08) {
        rival.aiTimer = 0;
        if (Math.random() < 0.5) {
          this.itemSystem.dropBanana(rival);
        } else {
          this.itemSystem.fireGreenShell(rival);
        }
      }
    });
  }
}
