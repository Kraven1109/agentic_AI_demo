/**
 * textures.js - Procedural Canvas Texture Generators for Mario Kart
 * Zero external image dependencies - 100% offline & crisp high-DPI rendering
 */

const Textures = {
  // Road Asphalt with Center Line and Tire Marks
  createRoadTexture: function() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');

    // Base asphalt dark slate
    ctx.fillStyle = '#22252c';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Asphalt noise grain
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 22;
      data[i] = Math.min(255, Math.max(0, data[i] + noise));
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
    }
    ctx.putImageData(imgData, 0, 0);

    // Tire wear grooves (racing line rubber)
    ctx.fillStyle = 'rgba(15, 18, 22, 0.45)';
    ctx.fillRect(100, 0, 90, canvas.height);
    ctx.fillRect(322, 0, 90, canvas.height);

    // Outer edge boundary lines (Solid White)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(20, 0, 10, canvas.height);
    ctx.fillRect(canvas.width - 30, 0, 10, canvas.height);

    // Center Dashed White Racing Line
    ctx.fillStyle = '#f8fafc';
    const dashHeight = 70;
    const gapHeight = 55;
    for (let y = 0; y < canvas.height; y += dashHeight + gapHeight) {
      ctx.fillRect((canvas.width / 2) - 6, y, 12, dashHeight);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1, 40);
    return texture;
  },

  // Alternating Red & White Curbs (Rumble Strips)
  createCurbTexture: function() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    const blockHeight = canvas.height / 4;
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = (i % 2 === 0) ? '#e52521' : '#f8f9fa';
      ctx.fillRect(0, i * blockHeight, canvas.width, blockHeight);

      // Bevel shading for 3D tactile curb look
      const grad = ctx.createLinearGradient(0, i * blockHeight, 0, (i + 1) * blockHeight);
      grad.addColorStop(0, 'rgba(255, 255, 255, 0.35)');
      grad.addColorStop(0.5, 'rgba(0, 0, 0, 0)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0.45)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, i * blockHeight, canvas.width, blockHeight);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1, 60);
    return texture;
  },

  // Start / Finish Line Checkered Grid
  createFinishLineTexture: function() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    // Checkerboard squares
    const tileSize = 32;
    for (let y = 0; y < canvas.height; y += tileSize) {
      for (let x = 0; x < canvas.width; x += tileSize) {
        const isWhite = ((x / tileSize) + (y / tileSize)) % 2 === 0;
        ctx.fillStyle = isWhite ? '#ffffff' : '#111827';
        ctx.fillRect(x, y, tileSize, tileSize);
      }
    }

    // Gold finish line header banner
    ctx.fillStyle = '#ffb300';
    ctx.fillRect(0, 0, canvas.width, 18);
    ctx.fillRect(0, canvas.height - 18, canvas.width, 18);

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  },

  // Animated Cyber Neon Boost Pad Texture
  createBoostPadTexture: function() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Dark high-tech base
    ctx.fillStyle = '#0a0e1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Glowing Neon Chevrons pointing forward
    const numArrows = 4;
    const arrowHeight = 90;
    const gap = 35;
    for (let i = 0; i < numArrows; i++) {
      const y = 30 + i * (arrowHeight + gap);

      // Glow outline
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 25;
      ctx.fillStyle = '#00e5ff';

      ctx.beginPath();
      ctx.moveTo(canvas.width / 2, y);
      ctx.lineTo(canvas.width - 25, y + arrowHeight * 0.7);
      ctx.lineTo(canvas.width - 55, y + arrowHeight * 0.7);
      ctx.lineTo(canvas.width / 2, y + arrowHeight * 0.3);
      ctx.lineTo(55, y + arrowHeight * 0.7);
      ctx.lineTo(25, y + arrowHeight * 0.7);
      ctx.closePath();
      ctx.fill();

      // Core bright yellow/orange highlight
      ctx.shadowColor = '#ffd600';
      ctx.shadowBlur = 10;
      ctx.fillStyle = '#fff59d';
      ctx.beginPath();
      ctx.moveTo(canvas.width / 2, y + 10);
      ctx.lineTo(canvas.width - 50, y + arrowHeight * 0.65);
      ctx.lineTo(canvas.width - 70, y + arrowHeight * 0.65);
      ctx.lineTo(canvas.width / 2, y + arrowHeight * 0.35);
      ctx.lineTo(70, y + arrowHeight * 0.65);
      ctx.lineTo(50, y + arrowHeight * 0.65);
      ctx.closePath();
      ctx.fill();
    }

    ctx.shadowBlur = 0; // reset
    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  },

  // Lush Cartoon Grass with Wildflowers
  createGrassTexture: function() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Vibrant Mario emerald green base
    ctx.fillStyle = '#3ca337';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Subtle grass patch mottling
    for (let i = 0; i < 600; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const radius = 6 + Math.random() * 12;
      ctx.fillStyle = Math.random() > 0.5 ? '#48b843' : '#338f2f';
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    // Tiny white and yellow cartoon daisies
    for (let i = 0; i < 90; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      // Petals
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
      // Center
      ctx.fillStyle = '#ffd600';
      ctx.beginPath();
      ctx.arc(x, y, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(40, 40);
    return texture;
  },

  // Item Box Holographic Face (Translucent with bold ?)
  createItemBoxTexture: function() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    // Rainbow glass gradient base
    const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    grad.addColorStop(0, 'rgba(0, 229, 255, 0.85)');
    grad.addColorStop(0.5, 'rgba(255, 64, 129, 0.85)');
    grad.addColorStop(1, 'rgba(255, 214, 0, 0.85)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Inner bright border
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 14;
    ctx.strokeRect(12, 12, canvas.width - 24, canvas.height - 24);

    // Bold Iconic Mario Question Mark '?'
    ctx.font = '900 160px "Impact", "Montserrat", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Black drop shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillText('?', (canvas.width / 2) + 6, (canvas.height / 2) + 8);

    // Bright white with yellow tint
    ctx.fillStyle = '#ffffff';
    ctx.fillText('?', canvas.width / 2, (canvas.height / 2) + 2);

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  },

  // 3D Coin Emblem Texture
  createCoinTexture: function() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    // Golden radial gradient
    const grad = ctx.createRadialGradient(90, 80, 10, 128, 128, 120);
    grad.addColorStop(0, '#fff9c4');
    grad.addColorStop(0.4, '#ffd54f');
    grad.addColorStop(0.8, '#ffb300');
    grad.addColorStop(1, '#ff6f00');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(128, 128, 115, 0, Math.PI * 2);
    ctx.fill();

    ctx.lineWidth = 10;
    ctx.strokeStyle = '#fff8e1';
    ctx.stroke();

    // Inner Star Emblem
    ctx.fillStyle = '#fff8e1';
    ctx.shadowColor = 'rgba(0,0,0,0.3)';
    ctx.shadowBlur = 8;
    this.drawStar(ctx, 128, 128, 5, 45, 22);
    ctx.fill();

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  },

  // Helper to draw star
  drawStar: function(ctx, cx, cy, spikes, outerRadius, innerRadius) {
    let rot = Math.PI / 2 * 3;
    let x = cx;
    let y = cy;
    const step = Math.PI / spikes;

    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);
    for (let i = 0; i < spikes; i++) {
      x = cx + Math.cos(rot) * outerRadius;
      y = cy + Math.sin(rot) * outerRadius;
      ctx.lineTo(x, y);
      rot += step;

      x = cx + Math.cos(rot) * innerRadius;
      y = cy + Math.sin(rot) * innerRadius;
      ctx.lineTo(x, y);
      rot += step;
    }
    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
  },

  // Mario 'M' Kart Decal Emblem
  createMarioDecal: function() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    // White circle with chrome border
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(64, 64, 58, 0, Math.PI * 2);
    ctx.fill();

    ctx.lineWidth = 6;
    ctx.strokeStyle = '#e52521';
    ctx.stroke();

    // Red 'M' letter
    ctx.fillStyle = '#e52521';
    ctx.font = '900 84px "Impact", "Montserrat", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('M', 64, 68);

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  },

  // Procedural Item Icons for HUD (Rendered as DataURLs)
  getItemIconDataURLs: function() {
    const icons = {};
    const size = 128;

    // 1. Mushroom (Super Boost)
    const c1 = document.createElement('canvas');
    c1.width = size; c1.height = size;
    const ctx1 = c1.getContext('2d');
    // Stem
    ctx1.fillStyle = '#fce4ec';
    ctx1.beginPath();
    ctx1.roundRect(42, 65, 44, 45, 12);
    ctx1.fill();
    // Eyes
    ctx1.fillStyle = '#111';
    ctx1.beginPath();
    ctx1.arc(52, 85, 4, 0, Math.PI*2);
    ctx1.arc(76, 85, 4, 0, Math.PI*2);
    ctx1.fill();
    // Red Cap
    ctx1.fillStyle = '#e52521';
    ctx1.beginPath();
    ctx1.arc(64, 62, 50, Math.PI, 0);
    ctx1.fill();
    // White polka dots
    ctx1.fillStyle = '#ffffff';
    ctx1.beginPath();
    ctx1.arc(64, 38, 14, 0, Math.PI*2);
    ctx1.arc(32, 54, 10, 0, Math.PI*2);
    ctx1.arc(96, 54, 10, 0, Math.PI*2);
    ctx1.fill();
    icons.mushroom = c1.toDataURL();

    // 2. Red Shell (Homing Attack)
    const c2 = document.createElement('canvas');
    c2.width = size; c2.height = size;
    const ctx2 = c2.getContext('2d');
    // Rim
    ctx2.fillStyle = '#fff9c4';
    ctx2.beginPath();
    ctx2.ellipse(64, 76, 46, 20, 0, 0, Math.PI*2);
    ctx2.fill();
    // Shell dome
    ctx2.fillStyle = '#e52521';
    ctx2.beginPath();
    ctx2.arc(64, 60, 42, Math.PI, 0);
    ctx2.fill();
    // Hex scutes
    ctx2.strokeStyle = '#ffffff';
    ctx2.lineWidth = 4;
    ctx2.stroke();
    icons.red_shell = c2.toDataURL();

    // 3. Green Shell (Straight Ricochet)
    const c3 = document.createElement('canvas');
    c3.width = size; c3.height = size;
    const ctx3 = c3.getContext('2d');
    ctx3.fillStyle = '#fff9c4';
    ctx3.beginPath();
    ctx3.ellipse(64, 76, 46, 20, 0, 0, Math.PI*2);
    ctx3.fill();
    ctx3.fillStyle = '#00c853';
    ctx3.beginPath();
    ctx3.arc(64, 60, 42, Math.PI, 0);
    ctx3.fill();
    ctx3.strokeStyle = '#ffffff';
    ctx3.lineWidth = 4;
    ctx3.stroke();
    icons.green_shell = c3.toDataURL();

    // 4. Banana Peel (Trap Hazard)
    const c4 = document.createElement('canvas');
    c4.width = size; c4.height = size;
    const ctx4 = c4.getContext('2d');
    ctx4.fillStyle = '#ffd600';
    ctx4.beginPath();
    ctx4.moveTo(64, 18);
    ctx4.quadraticCurveTo(105, 50, 110, 105);
    ctx4.quadraticCurveTo(64, 88, 18, 105);
    ctx4.quadraticCurveTo(25, 50, 64, 18);
    ctx4.fill();
    ctx4.fillStyle = '#4e342e'; // Stem
    ctx4.fillRect(60, 12, 8, 12);
    icons.banana = c4.toDataURL();

    // 5. Star (Super Star Invincibility)
    const c5 = document.createElement('canvas');
    c5.width = size; c5.height = size;
    const ctx5 = c5.getContext('2d');
    ctx5.fillStyle = '#ffea00';
    this.drawStar(ctx5, 64, 64, 5, 52, 26);
    ctx5.fill();
    ctx5.fillStyle = '#000000';
    // Star eyes
    ctx5.fillRect(52, 54, 5, 14);
    ctx5.fillRect(71, 54, 5, 14);
    icons.star = c5.toDataURL();

    return icons;
  }
};
