const sceneCanvas = document.getElementById("sceneCanvas");
const sceneCtx = sceneCanvas.getContext("2d");
const renderCanvas = document.getElementById("renderCanvas");
const renderCtx = renderCanvas.getContext("2d");

const controls = {
  gaussianCount: document.getElementById("gaussianCount"),
  gaussianCountLabel: document.getElementById("gaussianCountLabel"),
  scenePreset: document.getElementById("scenePreset"),
  regenBtn: document.getElementById("regenBtn"),
  camX: document.getElementById("camX"),
  camY: document.getElementById("camY"),
  camZ: document.getElementById("camZ"),
  camYaw: document.getElementById("camYaw"),
  camPitch: document.getElementById("camPitch"),
  fov: document.getElementById("fov"),
  fovLabel: document.getElementById("fovLabel"),
  near: document.getElementById("near"),
  nearLabel: document.getElementById("nearLabel"),
  far: document.getElementById("far"),
  farLabel: document.getElementById("farLabel"),
  showFrustum: document.getElementById("showFrustum"),
  pointScale: document.getElementById("pointScale"),
  pointScaleLabel: document.getElementById("pointScaleLabel"),
  alphaGain: document.getElementById("alphaGain"),
  alphaGainLabel: document.getElementById("alphaGainLabel"),
  bgMode: document.getElementById("bgMode"),
  renderBtn: document.getElementById("renderBtn"),
  orbitBtn: document.getElementById("orbitBtn"),
};

const stats = {
  total: document.getElementById("statTotal"),
  visible: document.getElementById("statVisible"),
  rendered: document.getElementById("statRendered"),
};

const state = {
  gaussians: [],
  autoOrbit: false,
  renderedCount: 0,
  observer: {
    yaw: -1.0,
    pitch: 0.35,
    distance: 9.5,
    target: { x: 0, y: 0.5, z: 0 },
    dragging: false,
    lastX: 0,
    lastY: 0,
  },
};

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function vec(x = 0, y = 0, z = 0) {
  return { x, y, z };
}

function add(a, b) {
  return vec(a.x + b.x, a.y + b.y, a.z + b.z);
}

function sub(a, b) {
  return vec(a.x - b.x, a.y - b.y, a.z - b.z);
}

function scale(v, s) {
  return vec(v.x * s, v.y * s, v.z * s);
}

function dot(a, b) {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function cross(a, b) {
  return vec(
    a.y * b.z - a.z * b.y,
    a.z * b.x - a.x * b.z,
    a.x * b.y - a.y * b.x,
  );
}

function length(v) {
  return Math.sqrt(dot(v, v));
}

function normalize(v) {
  const len = length(v) || 1;
  return scale(v, 1 / len);
}

function cameraFromPose() {
  const pos = vec(
    parseFloat(controls.camX.value),
    parseFloat(controls.camY.value),
    parseFloat(controls.camZ.value),
  );

  const yaw = (parseFloat(controls.camYaw.value) * Math.PI) / 180;
  const pitch = (parseFloat(controls.camPitch.value) * Math.PI) / 180;

  const forward = normalize(
    vec(
      Math.sin(yaw) * Math.cos(pitch),
      Math.sin(pitch),
      Math.cos(yaw) * Math.cos(pitch),
    ),
  );

  const worldUp = vec(0, 1, 0);
  let right = cross(forward, worldUp);
  if (length(right) < 1e-5) {
    right = vec(1, 0, 0);
  }
  right = normalize(right);
  const up = normalize(cross(right, forward));

  return { pos, forward, right, up };
}

function observerCamera() {
  const { yaw, pitch, distance, target } = state.observer;
  const pos = vec(
    target.x + distance * Math.cos(pitch) * Math.sin(yaw),
    target.y + distance * Math.sin(pitch),
    target.z + distance * Math.cos(pitch) * Math.cos(yaw),
  );
  const forward = normalize(sub(target, pos));
  let right = normalize(cross(forward, vec(0, 1, 0)));
  if (length(right) < 1e-5) right = vec(1, 0, 0);
  const up = normalize(cross(right, forward));
  return { pos, forward, right, up };
}

function projectPoint(point, cam, width, height, fovDeg) {
  const rel = sub(point, cam.pos);
  const cx = dot(rel, cam.right);
  const cy = dot(rel, cam.up);
  const cz = dot(rel, cam.forward);

  const fov = (fovDeg * Math.PI) / 180;
  const focal = height * 0.5 / Math.tan(fov * 0.5);

  if (cz <= 0.001) return null;

  const sx = width * 0.5 + (cx * focal) / cz;
  const sy = height * 0.5 - (cy * focal) / cz;

  return { sx, sy, depth: cz, focal, cx, cy };
}

function rand(seedObj) {
  seedObj.seed = (1664525 * seedObj.seed + 1013904223) % 4294967296;
  return seedObj.seed / 4294967296;
}

function generateSkeletonGaussians(count, preset) {
  const seedObj = { seed: 123456789 };
  const points = [];

  function pushGaussian(base, jitter, color, alpha, radius, type = "bone") {
    const j = vec(
      (rand(seedObj) - 0.5) * jitter.x,
      (rand(seedObj) - 0.5) * jitter.y,
      (rand(seedObj) - 0.5) * jitter.z,
    );

    points.push({
      position: add(base, j),
      color,
      alpha,
      radius,
      type,
    });
  }

  function line(a, b, n, jitter, color, alpha, radius, type = "bone") {
    for (let i = 0; i < n; i += 1) {
      const t = n <= 1 ? 0 : i / (n - 1);
      const p = vec(lerp(a.x, b.x, t), lerp(a.y, b.y, t), lerp(a.z, b.z, t));
      pushGaussian(p, jitter, color, alpha, radius, type);
    }
  }

  function arc(center, rx, rz, y, start, end, n, jitter, color, alpha, radius) {
    for (let i = 0; i < n; i += 1) {
      const t = n <= 1 ? 0 : i / (n - 1);
      const a = lerp(start, end, t);
      const p = vec(center.x + Math.cos(a) * rx, y, center.z + Math.sin(a) * rz);
      pushGaussian(p, jitter, color, alpha, radius, "bone");
    }
  }

  const boneColor = [148, 219, 255];
  const softColor = [142, 242, 198];

  const targetBoneRatio = preset === "spine" ? 0.9 : preset === "upper" ? 0.75 : 0.7;
  const boneCount = Math.floor(count * targetBoneRatio);
  const softCount = count - boneCount;

  const spineYTop = preset === "spine" ? 1.8 : 1.6;
  line(vec(0, -1.1, 0), vec(0, spineYTop, 0), Math.floor(boneCount * 0.24), vec(0.12, 0.08, 0.12), boneColor, 0.12, 0.12);

  const pelvisN = Math.floor(boneCount * 0.1);
  arc(vec(0, -0.9, 0), 0.9, 0.45, -0.9, Math.PI * 0.15, Math.PI * 0.85, pelvisN, vec(0.12, 0.05, 0.08), boneColor, 0.16, 0.11);
  arc(vec(0, -0.9, 0), 0.9, 0.45, -0.9, Math.PI * 1.15, Math.PI * 1.85, pelvisN, vec(0.12, 0.05, 0.08), boneColor, 0.16, 0.11);

  const ribLayers = preset === "spine" ? 3 : 6;
  const ribPerLayer = Math.floor((boneCount * 0.32) / ribLayers);
  for (let r = 0; r < ribLayers; r += 1) {
    const y = 0.1 + r * 0.24;
    const rx = 0.9 - r * 0.08;
    const rz = 0.55 - r * 0.04;
    arc(vec(0, y, 0), rx, rz, y, Math.PI * 0.18, Math.PI * 0.82, ribPerLayer, vec(0.08, 0.04, 0.07), boneColor, 0.11, 0.1);
    arc(vec(0, y, 0), rx, rz, y, Math.PI * 1.18, Math.PI * 1.82, ribPerLayer, vec(0.08, 0.04, 0.07), boneColor, 0.11, 0.1);
  }

  if (preset !== "spine") {
    line(vec(-0.9, 1.1, 0), vec(-1.9, 0.25, 0), Math.floor(boneCount * 0.06), vec(0.12, 0.12, 0.12), boneColor, 0.1, 0.1);
    line(vec(0.9, 1.1, 0), vec(1.9, 0.25, 0), Math.floor(boneCount * 0.06), vec(0.12, 0.12, 0.12), boneColor, 0.1, 0.1);
  }

  if (preset === "skeleton") {
    const skullN = Math.floor(boneCount * 0.1);
    for (let i = 0; i < skullN; i += 1) {
      const u = rand(seedObj) * Math.PI;
      const v = rand(seedObj) * Math.PI * 2;
      const r = 0.43 + (rand(seedObj) - 0.5) * 0.08;
      const p = vec(
        Math.sin(u) * Math.cos(v) * r,
        2.05 + Math.cos(u) * r,
        Math.sin(u) * Math.sin(v) * r,
      );
      pushGaussian(p, vec(0.03, 0.03, 0.03), boneColor, 0.12, 0.11);
    }
  }

  for (let i = 0; i < softCount; i += 1) {
    const t = rand(seedObj);
    const radiusY = preset === "spine" ? 1.2 : 1.7;
    const y = -0.95 + t * radiusY * 1.7;
    const ang = rand(seedObj) * Math.PI * 2;
    const bodyR = preset === "spine" ? 0.55 : 0.9;
    const rad = bodyR * (0.5 + rand(seedObj) * 0.6);
    const p = vec(Math.cos(ang) * rad, y, Math.sin(ang) * (rad * 0.7));
    pushGaussian(p, vec(0.3, 0.28, 0.3), softColor, 0.06, 0.16, "soft");
  }

  return points.slice(0, count);
}

function updateLabels() {
  controls.gaussianCountLabel.textContent = controls.gaussianCount.value;
  controls.fovLabel.textContent = controls.fov.value;
  controls.nearLabel.textContent = controls.near.value;
  controls.farLabel.textContent = controls.far.value;
  controls.pointScaleLabel.textContent = controls.pointScale.value;
  controls.alphaGainLabel.textContent = controls.alphaGain.value;
}

function drawBackground(ctx, mode, width, height) {
  if (mode === "light") {
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, "#e4edf7");
    grad.addColorStop(1, "#b7c7d8");
    ctx.fillStyle = grad;
  } else if (mode === "xray") {
    const grad = ctx.createRadialGradient(width * 0.55, height * 0.3, 40, width * 0.5, height * 0.5, width * 0.9);
    grad.addColorStop(0, "#12305f");
    grad.addColorStop(1, "#070f1e");
    ctx.fillStyle = grad;
  } else {
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, "#091527");
    grad.addColorStop(1, "#040a12");
    ctx.fillStyle = grad;
  }
  ctx.fillRect(0, 0, width, height);
}

function drawAxes(ctx, cam, width, height) {
  const axes = [
    { to: vec(1.4, 0, 0), color: "#ff7a7a", name: "X" },
    { to: vec(0, 1.4, 0), color: "#91ffb3", name: "Y" },
    { to: vec(0, 0, 1.4), color: "#79b2ff", name: "Z" },
  ];
  const origin = projectPoint(vec(0, 0, 0), cam, width, height, 55);
  if (!origin) return;

  ctx.save();
  ctx.font = "12px sans-serif";
  ctx.lineWidth = 1.5;
  for (const axis of axes) {
    const p = projectPoint(axis.to, cam, width, height, 55);
    if (!p) continue;
    ctx.strokeStyle = axis.color;
    ctx.beginPath();
    ctx.moveTo(origin.sx, origin.sy);
    ctx.lineTo(p.sx, p.sy);
    ctx.stroke();
    ctx.fillStyle = axis.color;
    ctx.fillText(axis.name, p.sx + 4, p.sy - 3);
  }
  ctx.restore();
}

function drawFrustum(ctx, obsCam, inferCam, width, height, fovDeg, near, far) {
  const tanHalf = Math.tan((fovDeg * Math.PI) / 360);
  const aspect = width / height;

  const nH = tanHalf * near;
  const nW = nH * aspect;
  const fH = tanHalf * far;
  const fW = fH * aspect;

  const cNear = add(inferCam.pos, scale(inferCam.forward, near));
  const cFar = add(inferCam.pos, scale(inferCam.forward, far));

  const corners = {
    ntl: add(add(cNear, scale(inferCam.up, nH)), scale(inferCam.right, -nW)),
    ntr: add(add(cNear, scale(inferCam.up, nH)), scale(inferCam.right, nW)),
    nbl: add(add(cNear, scale(inferCam.up, -nH)), scale(inferCam.right, -nW)),
    nbr: add(add(cNear, scale(inferCam.up, -nH)), scale(inferCam.right, nW)),
    ftl: add(add(cFar, scale(inferCam.up, fH)), scale(inferCam.right, -fW)),
    ftr: add(add(cFar, scale(inferCam.up, fH)), scale(inferCam.right, fW)),
    fbl: add(add(cFar, scale(inferCam.up, -fH)), scale(inferCam.right, -fW)),
    fbr: add(add(cFar, scale(inferCam.up, -fH)), scale(inferCam.right, fW)),
  };

  const lines = [
    ["ntl", "ntr"], ["ntr", "nbr"], ["nbr", "nbl"], ["nbl", "ntl"],
    ["ftl", "ftr"], ["ftr", "fbr"], ["fbr", "fbl"], ["fbl", "ftl"],
    ["ntl", "ftl"], ["ntr", "ftr"], ["nbl", "fbl"], ["nbr", "fbr"],
  ];

  ctx.save();
  ctx.strokeStyle = "rgba(255,177,107,0.9)";
  ctx.lineWidth = 1.3;

  for (const [a, b] of lines) {
    const p1 = projectPoint(corners[a], obsCam, width, height, 55);
    const p2 = projectPoint(corners[b], obsCam, width, height, 55);
    if (!p1 || !p2) continue;
    ctx.beginPath();
    ctx.moveTo(p1.sx, p1.sy);
    ctx.lineTo(p2.sx, p2.sy);
    ctx.stroke();
  }

  const camDot = projectPoint(inferCam.pos, obsCam, width, height, 55);
  if (camDot) {
    ctx.fillStyle = "#ffb16b";
    ctx.beginPath();
    ctx.arc(camDot.sx, camDot.sy, 4.6, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawSceneExplorer() {
  const w = sceneCanvas.width;
  const h = sceneCanvas.height;

  drawBackground(sceneCtx, "black", w, h);

  const obsCam = observerCamera();
  const inferCam = cameraFromPose();
  const fov = parseFloat(controls.fov.value);
  const near = parseFloat(controls.near.value);
  const far = parseFloat(controls.far.value);
  const pointScale = parseFloat(controls.pointScale.value);

  drawAxes(sceneCtx, obsCam, w, h);

  const projected = [];
  let visibleCount = 0;

  for (const g of state.gaussians) {
    const inferProj = projectPoint(g.position, inferCam, renderCanvas.width, renderCanvas.height, fov);
    const isVisible = !!inferProj && inferProj.depth >= near && inferProj.depth <= far;
    if (isVisible) visibleCount += 1;

    const p = projectPoint(g.position, obsCam, w, h, 55);
    if (!p) continue;

    projected.push({
      ...p,
      g,
      isVisible,
    });
  }

  projected.sort((a, b) => b.depth - a.depth);

  for (const p of projected) {
    const rad = clamp((p.g.radius * pointScale * 42) / p.depth, 0.3, 5.5);
    const [r, g, b] = p.g.color;
    const alpha = p.isVisible ? 0.8 : 0.14;

    sceneCtx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
    sceneCtx.beginPath();
    sceneCtx.arc(p.sx, p.sy, rad, 0, Math.PI * 2);
    sceneCtx.fill();
  }

  if (controls.showFrustum.checked) {
    drawFrustum(sceneCtx, obsCam, inferCam, w, h, fov, near, far);
  }

  sceneCtx.fillStyle = "rgba(231,240,255,0.92)";
  sceneCtx.font = "13px sans-serif";
  sceneCtx.fillText("Observer View", 12, 20);

  stats.total.textContent = `${state.gaussians.length}`;
  stats.visible.textContent = `${visibleCount}`;
  stats.rendered.textContent = `${state.renderedCount}`;
}

function renderInferenceFrame() {
  const w = renderCanvas.width;
  const h = renderCanvas.height;

  const fov = parseFloat(controls.fov.value);
  const near = parseFloat(controls.near.value);
  const far = parseFloat(controls.far.value);
  const pointScale = parseFloat(controls.pointScale.value);
  const alphaGain = parseFloat(controls.alphaGain.value);

  if (near >= far) {
    controls.far.value = (near + 0.5).toFixed(1);
    updateLabels();
  }

  drawBackground(renderCtx, controls.bgMode.value, w, h);

  const inferCam = cameraFromPose();
  const splats = [];

  for (const gaussian of state.gaussians) {
    const p = projectPoint(gaussian.position, inferCam, w, h, fov);
    if (!p) continue;
    if (p.depth < near || p.depth > far) continue;

    const screenR = clamp((gaussian.radius * pointScale * p.focal) / p.depth, 0.8, 38);
    if (p.sx < -screenR || p.sx > w + screenR || p.sy < -screenR || p.sy > h + screenR) continue;

    splats.push({ ...p, gaussian, screenR });
  }

  splats.sort((a, b) => b.depth - a.depth);

  for (const s of splats) {
    const [r, g, b] = s.gaussian.color;
    const localAlpha = clamp(s.gaussian.alpha * alphaGain * (0.8 + 0.4 / (1 + s.depth * 0.07)), 0.01, 0.65);

    const grad = renderCtx.createRadialGradient(s.sx, s.sy, 0, s.sx, s.sy, s.screenR);
    grad.addColorStop(0, `rgba(${r},${g},${b},${localAlpha})`);
    grad.addColorStop(1, `rgba(${r},${g},${b},0)`);

    renderCtx.fillStyle = grad;
    renderCtx.beginPath();
    renderCtx.arc(s.sx, s.sy, s.screenR, 0, Math.PI * 2);
    renderCtx.fill();
  }

  renderCtx.fillStyle = "rgba(255,255,255,0.8)";
  renderCtx.font = "12px sans-serif";
  renderCtx.fillText(`FOV ${fov}deg | Near ${near.toFixed(1)} | Far ${far.toFixed(1)} | Splats ${splats.length}`, 12, 20);

  state.renderedCount = splats.length;
}

function regenerateGaussians() {
  const count = parseInt(controls.gaussianCount.value, 10);
  const preset = controls.scenePreset.value;
  state.gaussians = generateSkeletonGaussians(count, preset);
  state.renderedCount = 0;
}

function bindEvents() {
  const rangeInputs = [
    controls.gaussianCount,
    controls.fov,
    controls.near,
    controls.far,
    controls.pointScale,
    controls.alphaGain,
  ];

  for (const input of rangeInputs) {
    input.addEventListener("input", () => {
      if (input === controls.near && parseFloat(controls.near.value) >= parseFloat(controls.far.value)) {
        controls.far.value = (parseFloat(controls.near.value) + 0.5).toFixed(1);
      }
      updateLabels();
    });
  }

  controls.regenBtn.addEventListener("click", () => {
    regenerateGaussians();
    renderInferenceFrame();
  });

  controls.renderBtn.addEventListener("click", () => {
    renderInferenceFrame();
  });

  controls.scenePreset.addEventListener("change", () => {
    regenerateGaussians();
    renderInferenceFrame();
  });

  controls.orbitBtn.addEventListener("click", () => {
    state.autoOrbit = !state.autoOrbit;
    controls.orbitBtn.textContent = `Auto Orbit: ${state.autoOrbit ? "On" : "Off"}`;
  });

  window.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") controls.camYaw.value = `${parseFloat(controls.camYaw.value) - 2}`;
    if (e.key === "ArrowRight") controls.camYaw.value = `${parseFloat(controls.camYaw.value) + 2}`;
    if (e.key === "ArrowUp") controls.camPitch.value = `${parseFloat(controls.camPitch.value) + 2}`;
    if (e.key === "ArrowDown") controls.camPitch.value = `${parseFloat(controls.camPitch.value) - 2}`;
  });

  sceneCanvas.addEventListener("mousedown", (e) => {
    state.observer.dragging = true;
    state.observer.lastX = e.clientX;
    state.observer.lastY = e.clientY;
  });

  window.addEventListener("mouseup", () => {
    state.observer.dragging = false;
  });

  window.addEventListener("mousemove", (e) => {
    if (!state.observer.dragging) return;
    const dx = e.clientX - state.observer.lastX;
    const dy = e.clientY - state.observer.lastY;
    state.observer.lastX = e.clientX;
    state.observer.lastY = e.clientY;

    state.observer.yaw += dx * 0.005;
    state.observer.pitch = clamp(state.observer.pitch + dy * -0.004, -1.45, 1.45);
  });

  sceneCanvas.addEventListener("wheel", (e) => {
    e.preventDefault();
    state.observer.distance = clamp(state.observer.distance + e.deltaY * 0.01, 3.2, 24);
  }, { passive: false });
}

function tick() {
  if (state.autoOrbit) {
    const yaw = parseFloat(controls.camYaw.value) + 0.25;
    const radius = Math.max(2.5, Math.hypot(parseFloat(controls.camX.value), parseFloat(controls.camZ.value)));
    const y = parseFloat(controls.camY.value);
    const yawRad = (yaw * Math.PI) / 180;

    controls.camYaw.value = yaw.toFixed(2);
    controls.camX.value = (Math.sin(yawRad) * radius).toFixed(2);
    controls.camZ.value = (Math.cos(yawRad) * radius).toFixed(2);
    controls.camY.value = y.toFixed(2);
  }

  drawSceneExplorer();
  requestAnimationFrame(tick);
}

function init() {
  updateLabels();
  regenerateGaussians();
  bindEvents();
  renderInferenceFrame();
  tick();
}

init();
