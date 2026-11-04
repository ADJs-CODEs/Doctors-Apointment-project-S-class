import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

/**
 * The landing page's 3D story. One glossy heart sits behind the page; the scroll position decides
 * which chapter "owns" the scene, and each chapter fades its own objects in around the heart:
 * 0 opening (features orbit), 1 doctors, 2 medicines, 3 care circle, 4 calls, 5 Wish Well,
 * 6 pharmacy delivery, 7 the end. The page marks its parts with data attributes:
 * [data-stage] canvas host, [data-chapter] sections, [data-orbit] feature labels,
 * [data-love] the emoji layer, [data-progress] the scroll line.
 * onNo3d runs when the device can't do WebGL (the page then shows a flat heart instead).
 * Returns a function that stops everything (call it on unmount).
 */

// where the heart sits for each chapter: +1 right of the text, -1 left, 0 centre
const SIDE = [0, 1, -1, 1, -1, 1, -1, 0];

export function startLandingScene(root: HTMLElement, onNo3d: () => void): () => void {
  const stage = root.querySelector<HTMLElement>('[data-stage]')!;
  const love = root.querySelector<HTMLElement>('[data-love]')!;
  const orbit = root.querySelector<HTMLElement>('[data-orbit]')!;
  const orbitChips = [...orbit.children] as HTMLElement[];
  const progressBar = root.querySelector<HTMLElement>('[data-progress]')!;
  const sections = [...root.querySelectorAll<HTMLElement>('[data-chapter]')];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  } catch {
    onNo3d();
    return () => {};
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  stage.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTexture = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;
  scene.environment = envTexture;
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.set(0, 0, 8);

  scene.add(new THREE.AmbientLight(0xffffff, 0.5));
  const key = new THREE.DirectionalLight(0xffffff, 1.6);
  key.position.set(3, 4, 5);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x9fe3e1, 1.2);
  rim.position.set(-4, -2, -3);
  scene.add(rim);

  const world = new THREE.Group();
  scene.add(world);

  // --- the heart: a glossy, pearly coral ---
  const s = new THREE.Shape();
  s.moveTo(5, 5);
  s.bezierCurveTo(5, 5, 4, 0, 0, 0);
  s.bezierCurveTo(-6, 0, -6, 7, -6, 7);
  s.bezierCurveTo(-6, 11, -3, 15.4, 5, 19);
  s.bezierCurveTo(12, 15.4, 16, 11, 16, 7);
  s.bezierCurveTo(16, 7, 16, 0, 10, 0);
  s.bezierCurveTo(7, 0, 5, 5, 5, 5);
  const heartGeo = new THREE.ExtrudeGeometry(s, { depth: 3.4, bevelEnabled: true, bevelSegments: 10, steps: 1, bevelSize: 2.2, bevelThickness: 2.4, curveSegments: 40 });
  heartGeo.center();
  const heart = new THREE.Mesh(
    heartGeo,
    new THREE.MeshPhysicalMaterial({
      color: 0xf2556d, metalness: 0.05, roughness: 0.16, clearcoat: 1, clearcoatRoughness: 0.03,
      sheen: 0.6, sheenColor: new THREE.Color(0xffd1d9), sheenRoughness: 0.4,
      iridescence: 0.35, iridescenceIOR: 1.4, iridescenceThicknessRange: [120, 380],
    }),
  );
  heart.rotation.z = Math.PI;
  heart.scale.setScalar(0.085);
  const heartHolder = new THREE.Group();
  heartHolder.add(heart);
  world.add(heartHolder);

  const glossy = (color: number) => new THREE.MeshPhysicalMaterial({ color, roughness: 0.18, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.08, transparent: true, opacity: 0 });
  const basic = (color: number) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0 });

  // --- 1 · doctors orbiting on tilted rings ---
  const doctors = new THREE.Group();
  world.add(doctors);
  const ringMats: THREE.MeshBasicMaterial[] = [];
  const docBalls: THREE.Mesh<THREE.SphereGeometry, THREE.MeshPhysicalMaterial>[] = [];
  ([[2.1, 0.5, 0.2], [2.6, -0.4, 0.9], [3.1, 0.25, -0.6]] as const).forEach(([r, tx, tz], i) => {
    const ring = new THREE.Group();
    ring.rotation.set(Math.PI / 2 + tx, 0, tz);
    const m = basic(0x0ea5a4);
    ringMats.push(m);
    ring.add(new THREE.Mesh(new THREE.TorusGeometry(r, 0.006, 8, 160), m));
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.17, 32, 32), glossy(i === 1 ? 0x0b2545 : 0x0ea5a4));
    ball.userData = { r, speed: 0.35 + i * 0.12, phase: i * 2.1 };
    ring.add(ball);
    docBalls.push(ball);
    doctors.add(ring);
  });

  // --- 2 · glossy two-tone pills circling ---
  const halfProfile: THREE.Vector2[] = [];
  const R = 0.11, L = 0.13;
  for (let i = 0; i <= 10; i++) {
    const a = -Math.PI / 2 + (i / 10) * (Math.PI / 2);
    halfProfile.push(new THREE.Vector2(Math.cos(a) * R, Math.sin(a) * R - L));
  }
  halfProfile.push(new THREE.Vector2(R, 0));
  const halfGeo = new THREE.LatheGeometry(halfProfile, 32);
  const pillColors = [0x0ea5a4, 0xf59e0b, 0x3554c4, 0xf26d6d];
  const whiteMat = glossy(0xffffff);
  const pills = Array.from({ length: 16 }, (_, i) => {
    const p = new THREE.Group();
    const top = new THREE.Mesh(halfGeo, glossy(pillColors[i % pillColors.length]));
    const bottom = new THREE.Mesh(halfGeo, whiteMat);
    top.rotation.x = Math.PI;
    p.add(top, bottom);
    p.userData = { a: (i / 16) * Math.PI * 2, spin: new THREE.Vector3(Math.random(), Math.random(), Math.random()).multiplyScalar(1.2), mats: [top.material, whiteMat] };
    world.add(p);
    return p;
  });

  // --- 3 · care circle: people joined to the heart by threads of light ---
  const threadMat = new THREE.LineBasicMaterial({ color: 0x0ea5a4, transparent: true, opacity: 0 });
  const people = Array.from({ length: 6 }, (_, i) => {
    const node = new THREE.Mesh(new THREE.SphereGeometry(0.13, 32, 32), glossy([0xdce3fa, 0xcdefed, 0xfcebc0][i % 3]));
    node.userData = { a: (i / 6) * Math.PI * 2 + 0.4, r: 2.2 + (i % 2) * 0.5, y: ((i % 3) - 1) * 0.6 };
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), threadMat);
    world.add(node, line);
    return { node, line };
  });

  // --- 4 · calls ripple out ---
  const ripples = Array.from({ length: 3 }, (_, i) => {
    const m = basic(0x0ea5a4);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.012, 8, 160), m);
    ring.userData = { phase: i / 3, m };
    world.add(ring);
    return ring;
  });

  // --- 5 · sparkles drifting up for the Wish Well ---
  const sparkN = 70;
  const sparkPos = new Float32Array(sparkN * 3);
  const sparkSeed = Array.from({ length: sparkN }, () => ({ x: (Math.random() - 0.5) * 3.2, z: (Math.random() - 0.5) * 1.5, s: 0.3 + Math.random() * 0.6, o: Math.random() * 4 }));
  const sparkGeo = new THREE.BufferGeometry();
  sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPos, 3));
  const sparkMat = new THREE.PointsMaterial({ color: 0xffc2cc, size: 0.06, transparent: true, opacity: 0, depthWrite: false });
  world.add(new THREE.Points(sparkGeo, sparkMat));

  // --- 6 · delivery: pharmacy pin, a route, a house and a parcel travelling along it ---
  // its own group on the open side of the screen (not tied to the heart), sized to fit there
  const delivery = new THREE.Group();
  scene.add(delivery);
  const ROUTE_WIDTH = 4.65;
  const route = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-2.3, -0.1, 0.2), new THREE.Vector3(-1.2, 0.55, 0.6), new THREE.Vector3(0.2, -0.45, 0.7),
    new THREE.Vector3(1.4, 0.35, 0.4), new THREE.Vector3(2.35, 0.05, 0.1),
  ]);
  const routeMat = basic(0x0ea5a4);
  delivery.add(new THREE.Mesh(new THREE.TubeGeometry(route, 200, 0.022, 10, false), routeMat));
  const dotMat = basic(0x0ea5a4);
  const dotGeo = new THREE.SphereGeometry(0.035, 12, 12);
  for (let i = 1; i < 14; i++) {
    const d = new THREE.Mesh(dotGeo, dotMat);
    d.position.copy(route.getPoint(i / 14)).add(new THREE.Vector3(0, 0.07, 0));
    delivery.add(d);
  }
  const pinMat = glossy(0x0b7c7b);
  const crossMat = glossy(0xffffff);
  const pin = new THREE.Group();
  const pinHead = new THREE.Mesh(new THREE.SphereGeometry(0.2, 32, 32), pinMat);
  pinHead.position.y = 0.45;
  const pinTip = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.32, 32), pinMat);
  pinTip.rotation.x = Math.PI;
  pinTip.position.y = 0.2;
  const crossA = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.06, 0.06), crossMat);
  const crossB = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.2, 0.06), crossMat);
  crossA.position.set(0, 0.45, 0.19);
  crossB.position.set(0, 0.45, 0.19);
  pin.add(pinHead, pinTip, crossA, crossB);
  pin.position.copy(route.getPoint(0));
  delivery.add(pin);
  const wallMat = glossy(0xffffff);
  const roofMat = glossy(0x0b2545);
  const doorMat = glossy(0xf59e0b);
  const house = new THREE.Group();
  const walls = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.36, 0.42), wallMat);
  walls.position.y = 0.18;
  const roof = new THREE.Mesh(new THREE.ConeGeometry(0.4, 0.28, 4), roofMat);
  roof.position.y = 0.5;
  roof.rotation.y = Math.PI / 4;
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.18, 0.02), doorMat);
  door.position.set(0, 0.09, 0.22);
  house.add(walls, roof, door);
  house.position.copy(route.getPoint(1)).add(new THREE.Vector3(0.05, -0.02, 0));
  house.rotation.y = -0.4;
  delivery.add(house);
  const boxMat = glossy(0xf2b95a);
  const bandMat = glossy(0xffffff);
  const parcel = new THREE.Group();
  parcel.add(new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.24, 0.3), boxMat), new THREE.Mesh(new THREE.BoxGeometry(0.31, 0.25, 0.07), bandMat));
  delivery.add(parcel);
  const deliveryMats = [routeMat, dotMat, pinMat, crossMat, wallMat, roofMat, doorMat, boxMat, bandMat];

  // --- sizing ---
  let W = 1, H = 1, halfW = 1, halfH = 1, narrow = false;
  const resize = () => {
    W = innerWidth;
    H = innerHeight;
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
    halfH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z;
    halfW = halfH * camera.aspect;
    narrow = W < 860;
  };
  addEventListener('resize', resize);
  resize();

  // which chapter owns the scene: a soft weight per chapter from how close it is to the screen's middle
  const weights = new Array<number>(SIDE.length).fill(0);
  const readScroll = () => {
    const mid = H / 2;
    sections.forEach((el, i) => {
      const r = el.getBoundingClientRect();
      weights[i] = Math.max(0, 1 - Math.abs(r.top + r.height / 2 - mid) / (H * 0.75));
    });
    if (scrollY < H * 0.15) {
      weights.fill(0);
      weights[0] = 1;
    }
    const sum = weights.reduce((a, b) => a + b, 0) || 1;
    for (let i = 0; i < weights.length; i++) weights[i] /= sum;
    const max = document.documentElement.scrollHeight - H;
    progressBar.style.transform = `scaleX(${max > 0 ? scrollY / max : 0})`;
  };
  addEventListener('scroll', readScroll, { passive: true });
  readScroll();

  let mx = 0, my = 0;
  const onPointer = (e: PointerEvent) => {
    mx = e.clientX / W - 0.5;
    my = e.clientY / H - 0.5;
  };
  addEventListener('pointermove', onPointer, { passive: true });

  const smooth = { x: 0, y: 0, scale: 1, w: weights.slice() };
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  const clock = new THREE.Clock();
  const tmp = new THREE.Vector3();
  const toScreen = (v: THREE.Vector3) => ({ x: (v.x * 0.5 + 0.5) * W, y: (-v.y * 0.5 + 0.5) * H });
  let raf = 0;

  const frame = () => {
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = reduce ? 0 : clock.elapsedTime;
    const ease = 1 - Math.pow(0.0015, dt);
    for (let i = 0; i < SIDE.length; i++) smooth.w[i] = lerp(smooth.w[i], weights[i], ease);
    const w = smooth.w;

    // centred and high in the opening, beside the text after, above it on phones
    let side = 0;
    for (let i = 0; i < SIDE.length; i++) side += SIDE[i] * w[i];
    const tx = narrow ? 0 : side * Math.min(halfW * 0.48, 2.6);
    // opening: high enough to sit above the words, low enough that the orbit clears the header
    const ty = narrow ? halfH * 0.42 : w[0] * halfH * 0.27 + w[6] * halfH * 0.18;
    smooth.x = lerp(smooth.x, tx, ease);
    smooth.y = lerp(smooth.y, ty, ease);
    world.position.set(smooth.x, smooth.y, 0);
    smooth.scale = lerp(smooth.scale, narrow ? 0.62 : 1 - w[0] * 0.18 - w[6] * 0.05, ease);
    world.scale.setScalar(smooth.scale);

    // heartbeat and a slow turn with a little pointer parallax; it shrinks aside for the delivery
    const beat = reduce ? 1 : 1 + 0.045 * Math.pow(Math.max(0, Math.sin(t * 2.4)), 12) + 0.02 * Math.sin(t * 1.2);
    heartHolder.scale.setScalar(beat * (1 - w[6] * 0.4));
    heartHolder.position.y = w[6] * 0.9;
    heartHolder.rotation.y = reduce ? 0.35 : Math.sin(t * 0.4) * 0.45 + mx * 0.5;
    heartHolder.rotation.x = reduce ? 0 : my * 0.3 + Math.sin(t * 0.3) * 0.05;

    // opening: feature labels orbit the heart on a tilted ellipse
    orbit.style.opacity = String(Math.min(1, w[0] * 1.3));
    if (w[0] > 0.02 && !narrow) {
      tmp.set(0, 0, 0).applyMatrix4(heartHolder.matrixWorld).project(camera);
      const c = toScreen(tmp);
      const rx = Math.min(W * 0.36, 470), ry = Math.min(H * 0.17, 150);
      orbitChips.forEach((chip, i) => {
        const a = (i / orbitChips.length) * Math.PI * 2 + t * 0.18;
        const depth = (Math.sin(a) + 1) / 2; // the front of the orbit is bigger and clearer
        chip.style.transform = `translate(-50%, -50%) translate(${c.x + Math.cos(a) * rx}px, ${c.y + Math.sin(a) * ry}px) scale(${0.82 + depth * 0.22})`;
        chip.style.zIndex = depth > 0.5 ? '2' : '0';
        chip.style.opacity = String(0.55 + depth * 0.45);
      });
    }

    // 1 · doctors
    ringMats.forEach((m) => (m.opacity = (w[1] + w[0] * 0.3) * 0.5));
    docBalls.forEach((b) => {
      const a = b.userData.phase + t * b.userData.speed;
      b.position.set(Math.cos(a) * b.userData.r, Math.sin(a) * b.userData.r, 0);
      b.material.opacity = w[1];
    });
    doctors.rotation.y = t * 0.05;

    // 2 · pills orbit and tumble
    pills.forEach((p) => {
      const a = p.userData.a + t * 0.25;
      p.position.set(Math.cos(a) * 2.3, Math.sin(a) * 0.9, Math.sin(a) * 1.4);
      p.rotation.set(t * p.userData.spin.x, t * p.userData.spin.y, t * p.userData.spin.z);
      (p.userData.mats as THREE.MeshPhysicalMaterial[]).forEach((m) => (m.opacity = Math.min(1, w[2] * 1.4)));
    });

    // 3 · care circle
    threadMat.opacity = w[3] * 0.6;
    people.forEach(({ node, line }, i) => {
      const a = node.userData.a + t * 0.12;
      node.position.set(Math.cos(a) * node.userData.r, node.userData.y + Math.sin(t * 1.3 + i) * 0.12, Math.sin(a) * node.userData.r * 0.6);
      node.material.opacity = w[3];
      const pos = line.geometry.attributes.position as THREE.BufferAttribute;
      pos.setXYZ(1, node.position.x, node.position.y, node.position.z);
      pos.needsUpdate = true;
    });

    // 4 · calls ripple
    ripples.forEach((r) => {
      const k = reduce ? 0.5 : (t * 0.45 + r.userData.phase) % 1;
      r.scale.setScalar(0.9 + k * 3);
      r.userData.m.opacity = w[4] * (1 - k) * 0.7;
    });

    // 5 · sparkles
    sparkMat.opacity = w[5] * 0.9;
    sparkSeed.forEach((p, i) => {
      sparkPos[i * 3] = p.x + Math.sin(t + i) * 0.1;
      sparkPos[i * 3 + 1] = ((t * p.s + p.o) % 4) - 1.6;
      sparkPos[i * 3 + 2] = p.z;
    });
    sparkGeo.attributes.position.needsUpdate = true;

    // 6 · the parcel rides the route from the pharmacy to the door, pauses, then starts again
    const wv = w[6];
    delivery.visible = wv > 0.01;
    delivery.scale.setScalar((narrow ? halfW * 1.7 : halfW * 0.82) / ROUTE_WIDTH);
    delivery.position.set(narrow ? 0 : -halfW * 0.47, narrow ? halfH * 0.12 : -halfH * 0.28, 0);
    deliveryMats.forEach((m) => (m.opacity = Math.min(1, wv * 1.5)));
    const u = reduce ? 0.7 : (t * 0.12) % 1;
    const along = u < 0.88 ? u / 0.88 : 1;
    parcel.position.copy(route.getPoint(along)).add(new THREE.Vector3(0, 0.2 + (reduce ? 0 : Math.abs(Math.sin(t * 6)) * 0.05), 0));
    const ahead = route.getTangent(Math.min(along, 0.999));
    parcel.rotation.y = Math.atan2(ahead.x, ahead.z);
    pin.position.y = route.getPoint(0).y + (reduce ? 0 : Math.sin(t * 2) * 0.04);

    // the Wish Well emoji rise from just above the heart
    tmp.set(0, 1.05, 0).applyMatrix4(heartHolder.matrixWorld).project(camera);
    const lp = toScreen(tmp);
    love.style.transform = `translate(${lp.x}px, ${lp.y}px)`;
    love.style.opacity = String(Math.min(1, w[5] * 1.6));

    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);

  return () => {
    cancelAnimationFrame(raf);
    removeEventListener('resize', resize);
    removeEventListener('scroll', readScroll);
    removeEventListener('pointermove', onPointer);
    scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      mesh.geometry?.dispose();
      const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
      (Array.isArray(mat) ? mat : mat ? [mat] : []).forEach((m) => m.dispose());
    });
    envTexture.dispose();
    pmrem.dispose();
    renderer.dispose();
    renderer.domElement.remove();
  };
}
