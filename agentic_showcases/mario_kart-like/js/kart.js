/**
 * kart.js - 3D Mario Kart Vehicle & Driver Generator
 * Creates detailed stylized go-kart, animated wheels, steering driver, and particle effects
 */

class KartModel {
  constructor(scene, options = {}) {
    this.scene = scene;
    this.primaryColor = options.primaryColor || 0xe52521; // Mario Red
    this.secondaryColor = options.secondaryColor || 0xffffff;
    this.driverCapColor = options.driverCapColor || 0xe52521;
    this.driverShirtColor = options.driverShirtColor || 0xe52521;
    this.isPlayer = options.isPlayer || false;

    this.group = new THREE.Group();
    this.frontWheels = [];
    this.allWheels = [];
    this.exhaustPipes = [];
    this.driftSparks = [];
    this.exhaustParticles = [];
    this.dizzyStars = [];

    this.buildKart();
    this.buildDriver();
    this.buildParticleSystems();

    this.scene.add(this.group);
  }

  buildKart() {
    // 1. Chassis Body Group
    this.chassisGroup = new THREE.Group();

    // Main low-profile aerodynamic body
    const bodyGeo = new THREE.BoxGeometry(2.0, 0.55, 3.2);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: this.primaryColor,
      roughness: 0.25,
      metalness: 0.35,
    });
    const mainBody = new THREE.Mesh(bodyGeo, bodyMat);
    mainBody.position.y = 0.5;
    mainBody.castShadow = true;
    mainBody.receiveShadow = true;
    this.chassisGroup.add(mainBody);

    // Sloped Nose Cone
    const noseGeo = new THREE.BoxGeometry(1.6, 0.38, 1.2);
    const nose = new THREE.Mesh(noseGeo, bodyMat);
    nose.position.set(0, 0.42, 1.9);
    nose.rotation.x = -0.15;
    nose.castShadow = true;
    this.chassisGroup.add(nose);

    // Front Bumper (Heavy black rubber bumper)
    const bumperMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });
    const bumper = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.25, 0.4), bumperMat);
    bumper.position.set(0, 0.32, 2.5);
    bumper.castShadow = true;
    this.chassisGroup.add(bumper);

    // Front Headlights
    const lightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const leftLight = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.08, 16), lightMat);
    leftLight.rotation.x = Math.PI / 2;
    leftLight.position.set(-0.6, 0.45, 2.5);
    this.chassisGroup.add(leftLight);

    const rightLight = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.08, 16), lightMat);
    rightLight.rotation.x = Math.PI / 2;
    rightLight.position.set(0.6, 0.45, 2.5);
    this.chassisGroup.add(rightLight);

    // Mario 'M' Decal on the Hood
    if (this.isPlayer) {
      const decalGeo = new THREE.CircleGeometry(0.42, 24);
      const decalMat = new THREE.MeshBasicMaterial({
        map: Textures.createMarioDecal(),
        transparent: true,
      });
      const decal = new THREE.Mesh(decalGeo, decalMat);
      decal.rotation.x = -Math.PI / 2 + 0.15;
      decal.position.set(0, 0.63, 1.7);
      this.chassisGroup.add(decal);
    }

    // Cockpit Tub & Racing Seat
    const seatMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.9 });
    const seatBack = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.1, 0.25), seatMat);
    seatBack.position.set(0, 1.05, -0.4);
    seatBack.rotation.x = 0.2;
    seatBack.castShadow = true;
    this.chassisGroup.add(seatBack);

    // Steering Column & Wheel
    const column = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.8, 8), bumperMat);
    column.position.set(0, 0.85, 0.65);
    column.rotation.x = -0.55;
    this.chassisGroup.add(column);

    this.steeringWheel = new THREE.Group();
    const wheelRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.3, 0.05, 12, 24),
      new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.3 })
    );
    this.steeringWheel.add(wheelRing);
    this.steeringWheel.position.set(0, 1.15, 0.45);
    this.steeringWheel.rotation.x = -0.55;
    this.chassisGroup.add(this.steeringWheel);

    // Rear Engine Block
    const engineMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8, roughness: 0.3 });
    const engineBlock = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.7, 0.9), engineMat);
    engineBlock.position.set(0, 0.75, -1.2);
    engineBlock.castShadow = true;
    this.chassisGroup.add(engineBlock);

    // Chrome Dual Exhaust Pipes
    const exhaustMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.95, roughness: 0.1 });
    [-0.45, 0.45].forEach(xOff => {
      const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.7, 16), exhaustMat);
      pipe.rotation.x = Math.PI / 2;
      pipe.position.set(xOff, 0.55, -1.8);
      pipe.castShadow = true;
      this.chassisGroup.add(pipe);
      this.exhaustPipes.push(pipe);
    });

    // Rear Spoiler / Wing
    const strutMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.5 });
    const leftStrut = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.9, 8), strutMat);
    leftStrut.position.set(-0.7, 1.1, -1.4);
    this.chassisGroup.add(leftStrut);

    const rightStrut = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.9, 8), strutMat);
    rightStrut.position.set(0.7, 1.1, -1.4);
    this.chassisGroup.add(rightStrut);

    const wing = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.12, 0.55), bodyMat);
    wing.position.set(0, 1.55, -1.4);
    wing.rotation.x = 0.1;
    wing.castShadow = true;
    this.chassisGroup.add(wing);

    this.group.add(this.chassisGroup);

    // 2. 4 Chunky Go-Kart Wheels
    const tireGeo = new THREE.CylinderGeometry(0.48, 0.48, 0.42, 20);
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.85 });
    const rimMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.5, roughness: 0.3 });

    const wheelOffsets = [
      { name: 'FL', x: -1.25, y: 0.48, z: 1.25, isFront: true },
      { name: 'FR', x: 1.25, y: 0.48, z: 1.25, isFront: true },
      { name: 'RL', x: -1.28, y: 0.52, z: -1.25, isFront: false },
      { name: 'RR', x: 1.28, y: 0.52, z: -1.25, isFront: false },
    ];

    wheelOffsets.forEach(cfg => {
      const wheelMount = new THREE.Group();
      wheelMount.position.set(cfg.x, cfg.y, cfg.z);

      const wheelSpinGroup = new THREE.Group();

      // Tire
      const tire = new THREE.Mesh(tireGeo, tireMat);
      tire.rotation.z = Math.PI / 2;
      tire.castShadow = true;
      wheelSpinGroup.add(tire);

      // Gold Rim
      const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.44, 16), rimMat);
      rim.rotation.z = Math.PI / 2;
      wheelSpinGroup.add(rim);

      // Hubcap
      const hub = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), new THREE.MeshStandardMaterial({ color: 0xffffff }));
      hub.position.x = cfg.x > 0 ? 0.22 : -0.22;
      wheelSpinGroup.add(hub);

      wheelMount.add(wheelSpinGroup);
      this.group.add(wheelMount);

      const wheelObj = { mount: wheelMount, spinGroup: wheelSpinGroup, isFront: cfg.isFront };
      this.allWheels.push(wheelObj);
      if (cfg.isFront) {
        this.frontWheels.push(wheelObj);
      }
    });
  }

  buildDriver() {
    this.driverGroup = new THREE.Group();

    // Torso / Overalls
    const torsoMat = new THREE.MeshStandardMaterial({ color: this.driverShirtColor, roughness: 0.6 });
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.85, 0.55), torsoMat);
    torso.position.set(0, 1.25, 0.05);
    torso.castShadow = true;
    this.driverGroup.add(torso);

    // Blue Overalls straps
    const overallsMat = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.7 });
    const overalls = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.45, 0.56), overallsMat);
    overalls.position.set(0, 1.05, 0.05);
    this.driverGroup.add(overalls);

    // Arms & White Gloves holding steering wheel
    const gloveMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });
    [-0.38, 0.38].forEach(xOff => {
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.55, 8), torsoMat);
      arm.position.set(xOff, 1.28, 0.28);
      arm.rotation.x = Math.PI / 3;
      this.driverGroup.add(arm);

      const glove = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), gloveMat);
      glove.position.set(xOff * 0.75, 1.15, 0.45);
      this.driverGroup.add(glove);
    });

    // Head
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xfcd34d, roughness: 0.6 });
    this.head = new THREE.Group();
    const face = new THREE.Mesh(new THREE.SphereGeometry(0.36, 16, 16), skinMat);
    face.position.y = 1.88;
    face.castShadow = true;
    this.head.add(face);

    // Big Mario Nose
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 12), skinMat);
    nose.position.set(0, 1.84, 0.35);
    this.head.add(nose);

    // Mustache
    const mustacheMat = new THREE.MeshStandardMaterial({ color: 0x3e2723, roughness: 0.8 });
    const mustache = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.12, 0.15), mustacheMat);
    mustache.position.set(0, 1.76, 0.34);
    this.head.add(mustache);

    // Iconic Racing Cap
    const capMat = new THREE.MeshStandardMaterial({ color: this.driverCapColor, roughness: 0.4 });
    const capDome = new THREE.Mesh(new THREE.SphereGeometry(0.38, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.6), capMat);
    capDome.position.set(0, 1.94, -0.02);
    this.head.add(capDome);

    // Cap Visor
    const visor = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.06, 16, 1, false, 0, Math.PI), capMat);
    visor.position.set(0, 1.94, 0.18);
    visor.rotation.x = 0.25;
    this.head.add(visor);

    this.driverGroup.add(this.head);
    this.chassisGroup.add(this.driverGroup);
  }

  buildParticleSystems() {
    // 1. Nitro Flame Jets from Exhaust
    this.flameJets = [];
    const flameMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.0,
    });
    this.exhaustPipes.forEach(pipe => {
      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.24, 1.2, 8), flameMat.clone());
      flame.rotation.x = -Math.PI / 2;
      flame.position.set(pipe.position.x, pipe.position.y, pipe.position.z - 0.65);
      this.chassisGroup.add(flame);
      this.flameJets.push(flame);
    });

    // 2. Drift Spark Particles Pool (3D glowing sparks)
    this.sparkPool = [];
    const sparkGeo = new THREE.TetrahedronGeometry(0.18);
    for (let i = 0; i < 24; i++) {
      const sparkMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0 });
      const spark = new THREE.Mesh(sparkGeo, sparkMat);
      spark.visible = false;
      this.scene.add(spark);
      this.sparkPool.push({
        mesh: spark,
        active: false,
        life: 0,
        maxLife: 0.25,
        velocity: new THREE.Vector3(),
      });
    }

    // 3. Exhaust Smoke Puffs Pool
    this.smokePool = [];
    const smokeGeo = new THREE.SphereGeometry(0.18, 6, 6);
    for (let i = 0; i < 16; i++) {
      const smokeMat = new THREE.MeshStandardMaterial({
        color: 0xcccccc,
        transparent: true,
        opacity: 0,
        roughness: 0.9,
      });
      const smoke = new THREE.Mesh(smokeGeo, smokeMat);
      smoke.visible = false;
      this.scene.add(smoke);
      this.smokePool.push({
        mesh: smoke,
        active: false,
        life: 0,
        maxLife: 0.4,
        scale: 1,
      });
    }
  }

  // Spawn drift spark from rear wheel
  spawnDriftSpark(stage, wheelPos) {
    const sparkObj = this.sparkPool.find(s => !s.active);
    if (!sparkObj) return;

    sparkObj.active = true;
    sparkObj.life = 0;
    sparkObj.mesh.visible = true;
    sparkObj.mesh.position.copy(wheelPos);
    sparkObj.mesh.position.y += 0.1;

    // Spark color based on Mini-Turbo stage
    const colorHex = stage === 3 ? 0xe040fb : (stage === 2 ? 0xff9100 : 0x00d2ff);
    sparkObj.mesh.material.color.setHex(colorHex);
    sparkObj.mesh.material.opacity = 1.0;

    // Burst outwards and backwards
    sparkObj.velocity.set(
      (Math.random() - 0.5) * 4.0,
      1.5 + Math.random() * 3.5,
      (Math.random() - 0.5) * 4.0
    );
  }

  // Spawn smoke puff from exhaust pipe
  spawnSmokePuff(pipePos) {
    const smokeObj = this.smokePool.find(s => !s.active);
    if (!smokeObj) return;

    smokeObj.active = true;
    smokeObj.life = 0;
    smokeObj.scale = 0.5;
    smokeObj.mesh.visible = true;
    smokeObj.mesh.position.copy(pipePos);
    smokeObj.mesh.material.opacity = 0.45;
  }

  // Animate Kart Elements every frame
  update(delta, speed, steeringInput, driftStage = 0, isBoosting = false, isSpinning = false) {
    // 1. Wheel rotation based on linear speed
    const wheelSpinRate = (speed / 0.48) * delta * 2.5;
    this.allWheels.forEach(w => {
      w.spinGroup.rotation.x -= wheelSpinRate;
    });

    // 2. Front wheel steering angle
    const targetSteerAngle = -steeringInput * 0.45;
    this.frontWheels.forEach(w => {
      w.mount.rotation.y = THREE.MathUtils.lerp(w.mount.rotation.y, targetSteerAngle, 0.25);
    });

    // 3. Steering wheel turning
    if (this.steeringWheel) {
      this.steeringWheel.rotation.z = THREE.MathUtils.lerp(this.steeringWheel.rotation.z, -steeringInput * 1.2, 0.25);
    }

    // 4. Driver leaning into turns & drifting
    if (this.driverGroup) {
      const targetRoll = -steeringInput * 0.25 + (driftStage > 0 ? -steeringInput * 0.18 : 0);
      this.driverGroup.rotation.z = THREE.MathUtils.lerp(this.driverGroup.rotation.z, targetRoll, 0.2);

      if (this.head) {
        this.head.rotation.y = THREE.MathUtils.lerp(this.head.rotation.y, -steeringInput * 0.5, 0.2);
      }
    }

    // 5. Chassis tilt & bounce
    this.chassisGroup.position.y = THREE.MathUtils.lerp(
      this.chassisGroup.position.y,
      Math.sin(Date.now() * 0.02) * (speed > 1 ? 0.03 : 0.005),
      0.2
    );

    // 6. Nitro Flame Effect when boosting
    this.flameJets.forEach(flame => {
      if (isBoosting) {
        flame.material.opacity = 0.95;
        flame.scale.set(1 + Math.random() * 0.4, 1.2 + Math.random() * 0.8, 1 + Math.random() * 0.4);
        flame.material.color.setHex(Math.random() > 0.5 ? 0x00f0ff : 0xff9100);
      } else {
        flame.material.opacity = 0.0;
      }
    });

    // 7. Drift Sparks emission
    if (driftStage > 0 && Math.abs(speed) > 5) {
      // Get rear wheels world positions
      this.allWheels.filter(w => !w.isFront).forEach(w => {
        const wWorldPos = new THREE.Vector3();
        w.mount.getWorldPosition(wWorldPos);
        if (Math.random() < 0.6) {
          this.spawnDriftSpark(driftStage, wWorldPos);
        }
      });
    }

    // Update active sparks
    this.sparkPool.forEach(s => {
      if (s.active) {
        s.life += delta;
        s.mesh.position.addScaledVector(s.velocity, delta);
        s.velocity.y -= delta * 9.8; // gravity
        s.mesh.material.opacity = 1.0 - (s.life / s.maxLife);
        s.mesh.rotation.x += delta * 15;
        if (s.life >= s.maxLife) {
          s.active = false;
          s.mesh.visible = false;
        }
      }
    });

    // 8. Exhaust smoke puffs when driving
    if (Math.abs(speed) > 2 && Math.random() < 0.2) {
      this.exhaustPipes.forEach(p => {
        const pWorldPos = new THREE.Vector3();
        p.getWorldPosition(pWorldPos);
        this.spawnSmokePuff(pWorldPos);
      });
    }

    // Update smoke puffs
    this.smokePool.forEach(smk => {
      if (smk.active) {
        smk.life += delta;
        smk.scale += delta * 2.5;
        smk.mesh.scale.set(smk.scale, smk.scale, smk.scale);
        smk.mesh.position.y += delta * 0.8;
        smk.mesh.material.opacity = 0.45 * (1.0 - smk.life / smk.maxLife);
        if (smk.life >= smk.maxLife) {
          smk.active = false;
          smk.mesh.visible = false;
        }
      }
    });

    // 9. Spin-out animation if hit by shell/banana
    if (isSpinning) {
      this.chassisGroup.rotation.y += delta * 15;
    } else {
      this.chassisGroup.rotation.y = THREE.MathUtils.lerp(this.chassisGroup.rotation.y, 0, 0.15);
    }
  }

  // Set position & heading from physics
  setTransform(pos, headingAngle, rollAngle = 0, pitchAngle = 0) {
    this.group.position.copy(pos);
    this.group.rotation.set(pitchAngle, headingAngle, rollAngle, 'YXZ');
  }
}
