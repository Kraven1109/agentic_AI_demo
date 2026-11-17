/**
 * track.js - 3D Mario Kart Grand Prix Circuit & Scenery
 * Builds wide procedural spline race track, curbs, boost pads, item boxes, coins, and Mario decor
 */

class RaceTrack {
  constructor(scene) {
    this.scene = scene;
    this.trackWidth = 20; // Wide arcade track for thrilling overtakes & drifting
    this.itemBoxes = [];
    this.coins = [];
    this.boostPads = [];

    // Perfectly balanced, flowing Grand Prix Circuit
    // Starts with a long straightaway along +Z for authentic starting grid!
    this.controlPoints = [
      new THREE.Vector3(0, 0, 0),         // Start Grid line
      new THREE.Vector3(0, 0, 70),        // Grand Archway & Finish Banner
      new THREE.Vector3(0, 0, 170),       // Main Straight (Grandstands on both sides)
      new THREE.Vector3(30, 1, 250),      // Sweeping Right turn entry
      new THREE.Vector3(100, 3, 290),     // High-speed sweeping curve apex
      new THREE.Vector3(180, 2, 270),     // Sweeping curve exit
      new THREE.Vector3(230, 1, 200),     // Fast straight towards Hairpin
      new THREE.Vector3(250, 0, 110),     // Downhill approach
      new THREE.Vector3(250, 0, 20),      // Hairpin entry
      new THREE.Vector3(200, 0, -50),     // Banked Hairpin turn (around Giant Red Mushroom)
      new THREE.Vector3(140, 1, -50),     // Hairpin exit
      new THREE.Vector3(90, 3, -20),      // S-curve chicane entry
      new THREE.Vector3(40, 4, -40),      // Hill peak
      new THREE.Vector3(-20, 2, -70),     // Chicane exit & lake bridge approach
      new THREE.Vector3(-90, 1, -110),    // Lake water curve
      new THREE.Vector3(-160, 0, -70),    // West straight entry
      new THREE.Vector3(-170, 0, 30),     // West straight with boost pads
      new THREE.Vector3(-140, 0, 130),    // South-West curve
      new THREE.Vector3(-80, 0, 130),     // Corner turn
      new THREE.Vector3(-30, 0, 70),      // Final chicane
      new THREE.Vector3(0, 0, -60),       // Alignment straight entering start line
    ];

    this.curve = new THREE.CatmullRomCurve3(this.controlPoints, true, 'centripetal');
    this.curveLength = this.curve.getLength();

    // Cache road samples for physics & collision queries
    this.sampleCount = 400;
    this.samples = [];
    for (let i = 0; i <= this.sampleCount; i++) {
      const u = i / this.sampleCount;
      const point = this.curve.getPointAt(u);
      const tangent = this.curve.getTangentAt(u).normalize();
      const normal = new THREE.Vector3(0, 1, 0);
      const binormal = new THREE.Vector3().crossVectors(tangent, normal).normalize();
      this.samples.push({ u, point, tangent, binormal });
    }

    this.buildTrackMesh();
    this.buildCurbs();
    this.buildGuardrails();
    this.buildStartFinishArch();
    this.buildScenery();
    this.spawnInteractiveElements();
  }

  // Generate 3D Extruded Road Surface with UVs
  buildTrackMesh() {
    const segments = 500;
    const geometry = new THREE.BufferGeometry();
    const vertices = [];
    const uvs = [];
    const indices = [];

    const halfWidth = this.trackWidth / 2;

    for (let i = 0; i <= segments; i++) {
      const u = i / segments;
      const point = this.curve.getPointAt(u);
      const tangent = this.curve.getTangentAt(u).normalize();
      const normal = new THREE.Vector3(0, 1, 0);
      const binormal = new THREE.Vector3().crossVectors(tangent, normal).normalize();

      const left = new THREE.Vector3().copy(point).addScaledVector(binormal, -halfWidth);
      const right = new THREE.Vector3().copy(point).addScaledVector(binormal, halfWidth);

      vertices.push(left.x, left.y + 0.05, left.z);
      vertices.push(right.x, right.y + 0.05, right.z);

      uvs.push(0, u * 50);
      uvs.push(1, u * 50);

      if (i < segments) {
        const row1 = i * 2;
        const row2 = (i + 1) * 2;
        indices.push(row1, row1 + 1, row2);
        indices.push(row1 + 1, row2 + 1, row2);
      }
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    const roadMaterial = new THREE.MeshStandardMaterial({
      map: Textures.createRoadTexture(),
      roughness: 0.8,
      metalness: 0.1,
    });

    this.roadMesh = new THREE.Mesh(geometry, roadMaterial);
    this.roadMesh.receiveShadow = true;
    this.scene.add(this.roadMesh);
  }

  // Build Red & White 3D Rumble Curbs on track edges
  buildCurbs() {
    const segments = 500;
    const curbWidth = 2.2;
    const curbHeight = 0.25;
    const halfWidth = this.trackWidth / 2;

    const buildSide = (isLeft) => {
      const geo = new THREE.BufferGeometry();
      const vertices = [];
      const uvs = [];
      const indices = [];

      for (let i = 0; i <= segments; i++) {
        const u = i / segments;
        const point = this.curve.getPointAt(u);
        const tangent = this.curve.getTangentAt(u).normalize();
        const normal = new THREE.Vector3(0, 1, 0);
        const binormal = new THREE.Vector3().crossVectors(tangent, normal).normalize();

        const offsetDir = isLeft ? -1 : 1;
        const innerOffset = halfWidth * offsetDir;
        const outerOffset = (halfWidth + curbWidth) * offsetDir;

        const inner = new THREE.Vector3().copy(point).addScaledVector(binormal, innerOffset);
        const outer = new THREE.Vector3().copy(point).addScaledVector(binormal, outerOffset);

        vertices.push(inner.x, inner.y + curbHeight, inner.z);
        vertices.push(outer.x, outer.y + 0.05, outer.z);

        uvs.push(0, u * 80);
        uvs.push(1, u * 80);

        if (i < segments) {
          const row1 = i * 2;
          const row2 = (i + 1) * 2;
          indices.push(row1, row1 + 1, row2);
          indices.push(row1 + 1, row2 + 1, row2);
        }
      }

      geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      geo.setIndex(indices);
      geo.computeVertexNormals();

      const curbMat = new THREE.MeshStandardMaterial({
        map: Textures.createCurbTexture(),
        roughness: 0.6,
        metalness: 0.1,
      });

      const curbMesh = new THREE.Mesh(geo, curbMat);
      curbMesh.receiveShadow = true;
      curbMesh.castShadow = true;
      this.scene.add(curbMesh);
    };

    buildSide(true);
    buildSide(false);
  }

  // Guardrails with Red & White Checkered Barriers along outer curves
  buildGuardrails() {
    const barrierMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      roughness: 0.4,
      metalness: 0.2,
    });
    const postMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.8 });

    // Place barriers at key corner curves
    const cornerSpans = [
      { start: 0.12, end: 0.28, isLeft: false }, // Sweeping curve outer barrier
      { start: 0.38, end: 0.52, isLeft: false }, // Hairpin outer barrier
      { start: 0.72, end: 0.88, isLeft: true },  // West curve barrier
    ];

    cornerSpans.forEach(span => {
      const step = 0.01;
      for (let u = span.start; u <= span.end; u += step) {
        const pt = this.curve.getPointAt(u);
        const tangent = this.curve.getTangentAt(u).normalize();
        const binormal = new THREE.Vector3().crossVectors(tangent, new THREE.Vector3(0, 1, 0)).normalize();

        const offsetDir = span.isLeft ? -1 : 1;
        const bPos = new THREE.Vector3().copy(pt).addScaledVector(binormal, (this.trackWidth / 2 + 3.2) * offsetDir);

        // Barrier Post
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 2.2, 8), postMat);
        post.position.copy(bPos);
        post.position.y += 1.1;
        post.castShadow = true;
        this.scene.add(post);

        // Barrier Rail Section
        const rail = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.9, 7.5), barrierMat);
        rail.position.copy(bPos);
        rail.position.y += 1.3;
        rail.rotation.y = Math.atan2(tangent.x, tangent.z);
        rail.castShadow = true;
        this.scene.add(rail);
      }
    });
  }

  // Starting Grid & Grand Finish Arch
  buildStartFinishArch() {
    // Finish Line is placed at u = 0.04 (approx Z = 60 on the straightaway)
    const finishU = 0.04;
    const startPoint = this.curve.getPointAt(finishU);
    const tangent = this.curve.getTangentAt(finishU).normalize();
    const binormal = new THREE.Vector3().crossVectors(tangent, new THREE.Vector3(0, 1, 0)).normalize();

    // Checkered Finish Line Patch on Track
    const finishGeo = new THREE.PlaneGeometry(this.trackWidth, 6.0);
    const finishMat = new THREE.MeshStandardMaterial({
      map: Textures.createFinishLineTexture(),
      roughness: 0.5,
      polygonOffset: true,
      polygonOffsetFactor: -1.0,
      polygonOffsetUnits: -4.0,
    });
    const finishLine = new THREE.Mesh(finishGeo, finishMat);
    finishLine.position.copy(startPoint);
    finishLine.position.y += 0.08;
    finishLine.rotation.x = -Math.PI / 2;
    finishLine.rotation.z = Math.atan2(tangent.x, tangent.z);
    finishLine.receiveShadow = true;
    this.scene.add(finishLine);

    // Grand Archway Columns
    const archGroup = new THREE.Group();
    const poleMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.3,
      metalness: 0.8,
    });

    const leftCol = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.8, 12, 16), poleMat);
    leftCol.position.copy(startPoint).addScaledVector(binormal, -(this.trackWidth / 2 + 2.5));
    leftCol.position.y += 6.0;
    leftCol.castShadow = true;
    archGroup.add(leftCol);

    const rightCol = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.8, 12, 16), poleMat);
    rightCol.position.copy(startPoint).addScaledVector(binormal, (this.trackWidth / 2 + 2.5));
    rightCol.position.y += 6.0;
    rightCol.castShadow = true;
    archGroup.add(rightCol);

    // Crossbar Arch
    const crossbarGeo = new THREE.BoxGeometry(this.trackWidth + 6.0, 2.4, 1.8);
    const crossbarMat = new THREE.MeshStandardMaterial({
      color: 0xe52521,
      metalness: 0.3,
      roughness: 0.4,
    });
    const crossbar = new THREE.Mesh(crossbarGeo, crossbarMat);
    crossbar.position.copy(startPoint);
    crossbar.position.y += 11.0;
    crossbar.rotation.y = Math.atan2(binormal.z, binormal.x);
    crossbar.castShadow = true;
    archGroup.add(crossbar);

    // UTH MARIO KART GP Banner Canvas
    const bannerCanvas = document.createElement('canvas');
    bannerCanvas.width = 1024;
    bannerCanvas.height = 256;
    const bctx = bannerCanvas.getContext('2d');
    bctx.fillStyle = '#ffeb3b';
    bctx.fillRect(0, 0, 1024, 256);
    // Red border
    bctx.strokeStyle = '#e52521';
    bctx.lineWidth = 16;
    bctx.strokeRect(10, 10, 1004, 236);
    // Text
    bctx.fillStyle = '#e52521';
    bctx.font = '900 104px "Impact", "Montserrat", sans-serif';
    bctx.textAlign = 'center';
    bctx.textBaseline = 'middle';
    bctx.fillText('MARIO KART GP', 512, 95);
    bctx.fillStyle = '#0d47a1';
    bctx.font = '800 64px "Impact", "Montserrat", sans-serif';
    bctx.fillText('★ UTH CIRCUIT ★', 512, 190);

    const bannerTex = new THREE.CanvasTexture(bannerCanvas);
    const bannerGeo = new THREE.PlaneGeometry(this.trackWidth + 5.5, 2.2);
    const bannerMat = new THREE.MeshBasicMaterial({ map: bannerTex });
    const bannerMesh = new THREE.Mesh(bannerGeo, bannerMat);
    bannerMesh.position.copy(crossbar.position);
    bannerMesh.position.addScaledVector(tangent, -1.0);
    bannerMesh.rotation.y = Math.atan2(-tangent.x, -tangent.z);
    archGroup.add(bannerMesh);

    this.scene.add(archGroup);
  }

  // Mario World Decorative Scenery
  buildScenery() {
    // 1. Rolling Green Hills Ground Plane
    const groundGeo = new THREE.PlaneGeometry(800, 800, 48, 48);
    const groundMat = new THREE.MeshStandardMaterial({
      map: Textures.createGrassTexture(),
      roughness: 0.9,
      metalness: 0.05,
    });
    const posAttr = groundGeo.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const vx = posAttr.getX(i);
      const vy = posAttr.getY(i);
      const distFromCenter = Math.sqrt(vx * vx + vy * vy);
      if (distFromCenter > 140) {
        posAttr.setZ(i, Math.sin(vx * 0.015) * Math.cos(vy * 0.015) * 22);
      }
    }
    groundGeo.computeVertexNormals();

    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.05;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // 2. Lake / Water Pond
    const waterGeo = new THREE.CircleGeometry(65, 32);
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x00bcd4,
      roughness: 0.1,
      metalness: 0.8,
      transparent: true,
      opacity: 0.85,
    });
    const water = new THREE.Mesh(waterGeo, waterMat);
    water.rotation.x = -Math.PI / 2;
    water.position.set(-90, -0.02, -80);
    this.scene.add(water);

    // 3. Green Warp Pipes
    this.createWarpPipe(28, 0, 100);
    this.createWarpPipe(-28, 0, 100);
    this.createWarpPipe(145, 2, 210);
    this.createWarpPipe(200, 0, 10);
    this.createWarpPipe(-60, 2, -40);
    this.createWarpPipe(-130, 0, 50);

    // 4. Giant Mario Mushrooms
    this.createGiantMushroom(200, 0, -50, 0xe52521, 14); // Giant Red Mushroom at Hairpin center!
    this.createGiantMushroom(70, 0, 190, 0x00e676, 9);   // Green 1-Up Mushroom
    this.createGiantMushroom(-110, 0, -110, 0x2979ff, 10); // Blue Mushroom near lake

    // 5. Stylized Cartoon Trees (scattered around circuit perimeter)
    const treePositions = [
      [-35, 30], [35, 30], [-35, 80], [35, 80], [-35, 140], [35, 140],
      [70, 230], [150, 280], [220, 250], [270, 170], [280, 50],
      [230, -90], [160, -90], [80, -70], [-20, -120], [-180, -40],
      [-200, 40], [-170, 160], [-80, 170]
    ];
    treePositions.forEach(([x, z]) => {
      this.createCartoonTree(x, 0, z);
    });

    // 6. Cheering Spectator Grandstands parallel to the Main Straight
    this.createGrandstand(-26, 0, 110, false);
    this.createGrandstand(26, 0, 110, true);

    // 7. Fluffy Puffy 3D Cartoon Clouds in Azure Sky
    for (let i = 0; i < 22; i++) {
      const angle = (i / 22) * Math.PI * 2;
      const radius = 180 + Math.random() * 90;
      const cx = Math.cos(angle) * radius;
      const cz = Math.sin(angle) * radius;
      const cy = 65 + Math.random() * 40;
      this.createCartoonCloud(cx, cy, cz);
    }
  }

  // Iconic Mario Green Warp Pipe
  createWarpPipe(x, y, z) {
    const pipeGroup = new THREE.Group();
    const pipeMat = new THREE.MeshStandardMaterial({
      color: 0x2e7d32,
      roughness: 0.3,
      metalness: 0.3,
    });

    const base = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, 5.5, 24), pipeMat);
    base.position.y = 2.75;
    base.castShadow = true;
    base.receiveShadow = true;
    pipeGroup.add(base);

    const collar = new THREE.Mesh(new THREE.CylinderGeometry(3.1, 3.1, 1.5, 24), pipeMat);
    collar.position.y = 5.2;
    collar.castShadow = true;
    pipeGroup.add(collar);

    const inner = new THREE.Mesh(new THREE.CircleGeometry(2.4, 24), new THREE.MeshBasicMaterial({ color: 0x051b08 }));
    inner.rotation.x = -Math.PI / 2;
    inner.position.y = 5.96;
    pipeGroup.add(inner);

    pipeGroup.position.set(x, y, z);
    this.scene.add(pipeGroup);
  }

  // Giant Mario Mushroom with Polka Dots
  createGiantMushroom(x, y, z, capColor = 0xe52521, scale = 10) {
    const mGroup = new THREE.Group();

    const stemMat = new THREE.MeshStandardMaterial({ color: 0xfff9c4, roughness: 0.5 });
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(scale * 0.32, scale * 0.42, scale * 0.95, 24), stemMat);
    stem.position.y = (scale * 0.95) / 2;
    stem.castShadow = true;
    mGroup.add(stem);

    const capMat = new THREE.MeshStandardMaterial({ color: capColor, roughness: 0.3 });
    const capGeo = new THREE.SphereGeometry(scale * 0.8, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    const cap = new THREE.Mesh(capGeo, capMat);
    cap.position.y = scale * 0.95;
    cap.castShadow = true;
    mGroup.add(cap);

    const dotMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const dot1 = new THREE.Mesh(new THREE.CircleGeometry(scale * 0.24, 16), dotMat);
    dot1.position.set(0, scale * 1.76, 0);
    dot1.rotation.x = -Math.PI / 2;
    mGroup.add(dot1);

    const sideAngles = [0, Math.PI / 2, Math.PI, Math.PI * 1.5];
    sideAngles.forEach(ang => {
      const dot = new THREE.Mesh(new THREE.CircleGeometry(scale * 0.18, 16), dotMat);
      dot.position.set(Math.cos(ang) * scale * 0.62, scale * 1.35, Math.sin(ang) * scale * 0.62);
      dot.lookAt(new THREE.Vector3(Math.cos(ang) * scale * 2, scale * 1.35, Math.sin(ang) * scale * 2));
      mGroup.add(dot);
    });

    mGroup.position.set(x, y, z);
    this.scene.add(mGroup);
  }

  // Tiered Cartoon Tree
  createCartoonTree(x, y, z) {
    const tree = new THREE.Group();
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5d4037, roughness: 0.8 });
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.8, 4.0, 8), trunkMat);
    trunk.position.y = 2.0;
    trunk.castShadow = true;
    tree.add(trunk);

    const leavesMat = new THREE.MeshStandardMaterial({ color: 0x2e7d32, roughness: 0.5 });
    const c1 = new THREE.Mesh(new THREE.ConeGeometry(3.0, 3.8, 8), leavesMat);
    c1.position.y = 4.8;
    c1.castShadow = true;
    tree.add(c1);

    const c2 = new THREE.Mesh(new THREE.ConeGeometry(2.4, 3.0, 8), leavesMat);
    c2.position.y = 6.6;
    c2.castShadow = true;
    tree.add(c2);

    const c3 = new THREE.Mesh(new THREE.ConeGeometry(1.6, 2.4, 8), leavesMat);
    c3.position.y = 8.2;
    c3.castShadow = true;
    tree.add(c3);

    tree.position.set(x, y, z);
    this.scene.add(tree);
  }

  // Cheering Spectator Grandstand
  createGrandstand(x, y, z, faceLeft = true) {
    const gs = new THREE.Group();
    const bleacherMat = new THREE.MeshStandardMaterial({ color: 0x90a4ae, roughness: 0.6 });
    for (let tier = 0; tier < 4; tier++) {
      const step = new THREE.Mesh(new THREE.BoxGeometry(32, 1.0, 2.5), bleacherMat);
      step.position.set(0, tier * 1.0 + 0.5, (tier * 2.2 - 3.5) * (faceLeft ? -1 : 1));
      step.castShadow = true;
      gs.add(step);

      for (let s = -14; s <= 14; s += 2.2) {
        const specColor = [0xe52521, 0x1e88e5, 0xffb300, 0x43a047, 0x8e24aa][Math.floor(Math.random() * 5)];
        const spec = new THREE.Mesh(
          new THREE.SphereGeometry(0.48, 10, 10),
          new THREE.MeshStandardMaterial({ color: specColor })
        );
        spec.position.set(s + (Math.random() - 0.5) * 0.4, tier * 1.0 + 1.5, step.position.z);
        gs.add(spec);
      }
    }

    gs.position.set(x, y, z);
    if (!faceLeft) gs.rotation.y = Math.PI;
    this.scene.add(gs);
  }

  // Fluffy 3D Cloud
  createCartoonCloud(x, y, z) {
    const cloud = new THREE.Group();
    const cloudMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.4,
      metalness: 0.1,
    });

    const puffGeos = [
      { r: 9, x: 0, y: 0, z: 0 },
      { r: 7, x: -8, y: -1, z: 0 },
      { r: 7.5, x: 8, y: -0.5, z: 0 },
      { r: 6, x: -3, y: 4, z: 1 },
      { r: 6.5, x: 4, y: 3.5, z: -1 },
    ];

    puffGeos.forEach(p => {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(p.r, 12, 12), cloudMat);
      puff.position.set(p.x, p.y, p.z);
      cloud.add(puff);
    });

    cloud.position.set(x, y, z);
    this.scene.add(cloud);
  }

  // Interactive Spawns: Item Boxes, Coins, and Boost Pads
  spawnInteractiveElements() {
    // 1. Spawning Boost Pads along key straights
    const boostUSamples = [0.08, 0.35, 0.76];
    boostUSamples.forEach(u => {
      const pt = this.curve.getPointAt(u);
      const tangent = this.curve.getTangentAt(u).normalize();
      const padGeo = new THREE.PlaneGeometry(10, 11);
      const padMat = new THREE.MeshBasicMaterial({
        map: Textures.createBoostPadTexture(),
        transparent: true,
      });
      const pad = new THREE.Mesh(padGeo, padMat);
      pad.position.copy(pt);
      pad.position.y += 0.09;
      pad.rotation.x = -Math.PI / 2;
      pad.rotation.z = Math.atan2(tangent.x, tangent.z);
      this.scene.add(pad);
      this.boostPads.push({ u, mesh: pad, pos: pt });
    });

    // 2. Holographic Question Mark Item Box Clusters
    const itemBoxU = [0.15, 0.45, 0.82];
    const boxTexture = Textures.createItemBoxTexture();
    const boxMat = new THREE.MeshStandardMaterial({
      map: boxTexture,
      roughness: 0.2,
      metalness: 0.1,
      transparent: true,
      opacity: 0.9,
    });

    itemBoxU.forEach(u => {
      const pt = this.curve.getPointAt(u);
      const tangent = this.curve.getTangentAt(u).normalize();
      const binormal = new THREE.Vector3().crossVectors(tangent, new THREE.Vector3(0, 1, 0)).normalize();

      // Cluster of 4 item boxes across track width
      const offsets = [-6.0, -2.0, 2.0, 6.0];
      offsets.forEach(offset => {
        const boxGeo = new THREE.BoxGeometry(1.8, 1.8, 1.8);
        const box = new THREE.Mesh(boxGeo, boxMat);
        const boxPos = new THREE.Vector3().copy(pt).addScaledVector(binormal, offset);
        boxPos.y += 1.5;
        box.position.copy(boxPos);
        box.castShadow = true;
        this.scene.add(box);

        this.itemBoxes.push({
          u,
          mesh: box,
          baseY: boxPos.y,
          active: true,
          respawnTimer: 0,
        });
      });
    });

    // 3. Rotating Gold Coins along the track
    const coinU = [0.03, 0.05, 0.26, 0.28, 0.60, 0.62, 0.90, 0.92];
    const coinTex = Textures.createCoinTexture();
    const coinMat = new THREE.MeshStandardMaterial({
      map: coinTex,
      metalness: 0.8,
      roughness: 0.2,
    });

    coinU.forEach(u => {
      const pt = this.curve.getPointAt(u);
      const coinGeo = new THREE.CylinderGeometry(0.9, 0.9, 0.18, 20);
      const coin = new THREE.Mesh(coinGeo, coinMat);
      coin.position.copy(pt);
      coin.position.y += 1.2;
      coin.rotation.x = Math.PI / 2;
      coin.castShadow = true;
      this.scene.add(coin);

      this.coins.push({
        u,
        mesh: coin,
        baseY: coin.position.y,
        active: true,
        respawnTimer: 0,
      });
    });
  }

  // Update animated item boxes & coins
  update(delta, time) {
    this.itemBoxes.forEach(item => {
      if (item.active) {
        item.mesh.rotation.y += delta * 2.4;
        item.mesh.rotation.x = Math.sin(time * 3) * 0.15;
        item.mesh.position.y = item.baseY + Math.sin(time * 4) * 0.2;
      } else {
        item.respawnTimer -= delta;
        if (item.respawnTimer <= 0) {
          item.active = true;
          item.mesh.visible = true;
          item.mesh.scale.set(1, 1, 1);
        }
      }
    });

    this.coins.forEach(coin => {
      if (coin.active) {
        coin.mesh.rotation.z += delta * 3.5;
        coin.mesh.position.y = coin.baseY + Math.sin(time * 4 + coin.u * 10) * 0.15;
      } else {
        coin.respawnTimer -= delta;
        if (coin.respawnTimer <= 0) {
          coin.active = true;
          coin.mesh.visible = true;
        }
      }
    });
  }

  // Get nearest track progress (u from 0 to 1) and distance from track centerline
  getTrackProgress(pos) {
    let closestU = 0;
    let minDistSq = Infinity;
    let closestPt = null;

    for (let i = 0; i < this.samples.length; i++) {
      const s = this.samples[i];
      const dSq = pos.distanceToSquared(s.point);
      if (dSq < minDistSq) {
        minDistSq = dSq;
        closestU = s.u;
        closestPt = s.point;
      }
    }

    const distFromCenter = Math.sqrt(minDistSq);
    return {
      u: closestU,
      distanceFromCenter: distFromCenter,
      isOffRoad: distFromCenter > (this.trackWidth / 2 + 0.8),
      closestPoint: closestPt,
    };
  }
}
