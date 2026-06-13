/* ═══════════════════════════════════════════════
   INVOXE · index.js
   ① NvxTransition  — "INVOXE / By NovaStrikes" particle burst intro
   ② ParticleEngine — 60k particle morph (sphere→grid→torus) on scroll
   ③ Vanta NET      — gold wire background
   ④ Three.js hero  — floating 3D invoice cards
   ⑤ GSAP           — all scroll animations, magnetic buttons
   ⑥ Anime.js       — ticker, stagger, button glow
   ⑦ Lenis          — smooth scroll properly hooked to ScrollTrigger
═══════════════════════════════════════════════ */

/* ─────────────────────────────────────────────
   UTIL: load a script dynamically
───────────────────────────────────────────── */
function loadScript(src) {
  return new Promise(resolve => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const s = document.createElement('script');
    s.src = src; s.onload = resolve; s.onerror = resolve;
    document.head.appendChild(s);
  });
}

/* ─────────────────────────────────────────────
   UTIL: text → particle positions (canvas raster)
───────────────────────────────────────────── */
function getTextParticlePositions(lines, count, W, H) {
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  // Line 1 — INVOXE (big)
  ctx.fillStyle = '#fff';
  ctx.font = `900 ${Math.floor(W / 5.5)}px "Space Grotesk", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(lines[0], W / 2, H * 0.38);

  // Line 2 — By NovaStrikes (smaller)
  ctx.globalAlpha = 0.55;
  ctx.font = `500 ${Math.floor(W / 18)}px "Space Grotesk", sans-serif`;
  ctx.fillText(lines[1], W / 2, H * 0.68);
  ctx.globalAlpha = 1;

  const data = ctx.getImageData(0, 0, W, H).data;
  const pts  = [];
  const step = 3;
  for (let y = 0; y < H; y += step)
    for (let x = 0; x < W; x += step)
      if (data[(y * W + x) * 4 + 3] > 100)
        pts.push((x / W) * 2 - 1, -((y / H) * 2 - 1), 0);

  const result = new Float32Array(count * 3);
  const total  = pts.length / 3;
  for (let i = 0; i < count; i++) {
    const s = (i % total) * 3;
    result[i*3]   = pts[s]   * 2.8 + (Math.random()-.5)*.01;
    result[i*3+1] = pts[s+1] * 1.1 + (Math.random()-.5)*.01;
    result[i*3+2] = 0;
  }
  return result;
}

/* ═══════════════════════════════════════════════
   ① INTRO TRANSITION — INVOXE particle burst
═══════════════════════════════════════════════ */
class InvoXeTransition {
  constructor(onDone) {
    this.onDone   = onDone;
    this.COUNT    = 12000;
    this.T_GATHER = 1000;
    this.T_HOLD   = 1600;
    this.T_BURST  = 700;
    this.done     = false;

    this.overlay = document.createElement('div');
    Object.assign(this.overlay.style, {
      position:'fixed', inset:'0', zIndex:'999999',
      background:'#080B0F', pointerEvents:'all',
    });
    document.body.appendChild(this.overlay);
    this._build();
  }

  _build() {
    const W = innerWidth, H = innerHeight;
    this.scene    = new THREE.Scene();
    this.camera   = new THREE.PerspectiveCamera(60, W/H, 0.1, 100);
    this.camera.position.z = 3;

    this.renderer = new THREE.WebGLRenderer({ antialias:true, alpha:true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,2));
    this.renderer.setSize(W, H);
    this.renderer.setClearColor(0x080B0F, 1);
    this.overlay.appendChild(this.renderer.domElement);

    const geo = new THREE.BufferGeometry();
    this.posAttr = new THREE.BufferAttribute(new Float32Array(this.COUNT*3), 3);
    geo.setAttribute('position', this.posAttr);

    this.mat = new THREE.PointsMaterial({
      color: 0xC8A96E,
      size: 0.022,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.points = new THREE.Points(geo, this.mat);
    this.scene.add(this.points);

    // Scatter start
    this.scatterPos = new Float32Array(this.COUNT*3);
    for (let i=0; i<this.COUNT; i++) {
      const θ = Math.random()*Math.PI*2;
      const r = 2.5 + Math.random()*3;
      this.scatterPos[i*3]   = Math.cos(θ)*r;
      this.scatterPos[i*3+1] = Math.sin(θ)*r;
      this.scatterPos[i*3+2] = (Math.random()-.5)*2;
    }

    // Text target — INVOXE + By NovaStrikes
    this.textPos = getTextParticlePositions(['INVOXE','By NovaStrikes'], this.COUNT, 1400, 320);

    // Burst end
    this.burstPos = new Float32Array(this.COUNT*3);
    for (let i=0; i<this.COUNT; i++) {
      const θ = Math.random()*Math.PI*2;
      const φ = Math.random()*Math.PI;
      const r = 4 + Math.random()*6;
      this.burstPos[i*3]   = Math.sin(φ)*Math.cos(θ)*r;
      this.burstPos[i*3+1] = Math.sin(φ)*Math.sin(θ)*r;
      this.burstPos[i*3+2] = Math.cos(φ)*r;
    }

    this.posAttr.array.set(this.scatterPos);
    this.posAttr.needsUpdate = true;
    this._phase = 'gather';
    this._startTime = performance.now();
    requestAnimationFrame(this._loop.bind(this));
  }

  _ease(t) { return t<.5 ? 2*t*t : -1+(4-2*t)*t; }
  _lerp(a,b,t) { const e=this._ease(Math.min(Math.max(t,0),1)); return a+(b-a)*e; }

  _loop(now) {
    if (this.done) return;
    requestAnimationFrame(this._loop.bind(this));
    const elapsed = now - this._startTime;
    const pos = this.posAttr.array;

    if (this._phase === 'gather') {
      const t = elapsed / this.T_GATHER;
      for (let i=0; i<this.COUNT*3; i++)
        pos[i] = this._lerp(this.scatterPos[i], this.textPos[i], t);
      this.mat.opacity = this._ease(Math.min(t,1)) * 0.95;
      if (t>=1) { this._phase='hold'; this._phaseStart=now; }
    }
    else if (this._phase === 'hold') {
      const t = (now-this._phaseStart)/this.T_HOLD;
      this.mat.opacity = 0.9 + Math.sin(t*Math.PI*4)*0.05;
      this.points.rotation.y = Math.sin(t*Math.PI)*0.06;
      if (t>=1) { this._phase='burst'; this._phaseStart=now; }
    }
    else if (this._phase === 'burst') {
      const t = (now-this._phaseStart)/this.T_BURST;
      for (let i=0; i<this.COUNT*3; i++)
        pos[i] = this._lerp(this.textPos[i], this.burstPos[i], t);
      this.mat.opacity = 1 - this._ease(Math.min(t,1));
      this.overlay.style.background = `rgba(8,11,15,${1-t*0.95})`;
      if (t>=1) { this._finish(); return; }
    }

    this.posAttr.needsUpdate = true;
    this.renderer.render(this.scene, this.camera);
  }

  _finish() {
    this.done = true;
    this.overlay.style.transition = 'opacity 0.5s ease';
    this.overlay.style.opacity    = '0';
    this.overlay.style.pointerEvents = 'none';
    setTimeout(() => { this.overlay.remove(); this.renderer.dispose(); }, 560);
    this.onDone();
  }
}

/* ═══════════════════════════════════════════════
   ② PARTICLE ENGINE — 60k morph on scroll
═══════════════════════════════════════════════ */
class ParticleEngine {
  constructor() {
    this.canvas = document.getElementById('particle-canvas');
    if (!this.canvas || !window.THREE) return;

    this.COUNT = 60000;
    this.mouse = { x:0, y:0 };
    this.targetPos = { x:0, y:0 };

    const W = this.canvas.parentElement.clientWidth  || innerWidth;
    const H = this.canvas.parentElement.clientHeight || innerHeight;

    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias:true, alpha:true });
    this.renderer.setSize(W, H);
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,2));

    this.scene  = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, W/H, 0.1, 1000);
    this.camera.position.z = 8;

    this._buildShapes();
    this._buildMesh();
    this._setupScroll();
    this._animate();

    window.addEventListener('mousemove', e => {
      this.mouse.x =  (e.clientX/innerWidth )*2-1;
      this.mouse.y = -(e.clientY/innerHeight)*2+1;
    });
    window.addEventListener('resize', () => {
      const nW = this.canvas.parentElement.clientWidth;
      const nH = this.canvas.parentElement.clientHeight || innerHeight;
      this.renderer.setSize(nW, nH);
      this.camera.aspect = nW/nH;
      this.camera.updateProjectionMatrix();
    });
  }

  _buildShapes() {
    const N = this.COUNT;

    // Sphere
    this.shapeSphere = new Float32Array(N*3);
    for (let i=0; i<N; i++) {
      const φ = Math.acos(-1+(2*i)/N);
      const θ = Math.sqrt(N*Math.PI)*φ;
      const r = 3;
      this.shapeSphere[i*3]   = r*Math.cos(θ)*Math.sin(φ);
      this.shapeSphere[i*3+1] = r*Math.sin(θ)*Math.sin(φ);
      this.shapeSphere[i*3+2] = r*Math.cos(φ);
    }

    // Wave grid
    this.shapeGrid = new Float32Array(N*3);
    const dim = Math.floor(Math.sqrt(N));
    for (let i=0; i<N; i++) {
      const x = (i%dim)-dim/2;
      const z = Math.floor(i/dim)-dim/2;
      this.shapeGrid[i*3]   = x*0.16;
      this.shapeGrid[i*3+1] = Math.sin(x*.22)*Math.cos(z*.22)*1.8;
      this.shapeGrid[i*3+2] = z*0.16;
    }

    // Torus / Nova
    this.shapeTorus = new Float32Array(N*3);
    for (let i=0; i<N; i++) {
      const u = Math.random()*Math.PI*2;
      const v = Math.random()*Math.PI*2;
      const R=3.2, r=1.1;
      this.shapeTorus[i*3]   = (R+r*Math.cos(v))*Math.cos(u);
      this.shapeTorus[i*3+1] = (R+r*Math.cos(v))*Math.sin(u);
      this.shapeTorus[i*3+2] = r*Math.sin(v);
    }
  }

  _buildMesh() {
    const geo = new THREE.BufferGeometry();
    this.posAttr = new THREE.BufferAttribute(new Float32Array(this.COUNT*3), 3);
    this.posAttr.array.set(this.shapeSphere);
    geo.setAttribute('position', this.posAttr);

    this.mat = new THREE.PointsMaterial({
      color: 0xC8A96E,
      size: 0.018,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.points = new THREE.Points(geo, this.mat);
    this.scene.add(this.points);
  }

  _setupScroll() {
    if (!window.ScrollTrigger) return;
    const pos = this.posAttr.array;
    const N   = this.COUNT;

    gsap.to({}, {
      scrollTrigger: {
        trigger: '#particle-section',
        start: 'top top',
        end: 'bottom bottom',
        scrub: 1.5,
        onUpdate: self => {
          const p = self.progress;
          for (let i=0; i<N; i++) {
            const i3 = i*3;
            if (p < 0.5) {
              const f = p*2;
              pos[i3]   = this.shapeSphere[i3]   + (this.shapeGrid[i3]   - this.shapeSphere[i3])  *f;
              pos[i3+1] = this.shapeSphere[i3+1] + (this.shapeGrid[i3+1] - this.shapeSphere[i3+1])*f;
              pos[i3+2] = this.shapeSphere[i3+2] + (this.shapeGrid[i3+2] - this.shapeSphere[i3+2])*f;
            } else {
              const f = (p-.5)*2;
              pos[i3]   = this.shapeGrid[i3]   + (this.shapeTorus[i3]   - this.shapeGrid[i3])  *f;
              pos[i3+1] = this.shapeGrid[i3+1] + (this.shapeTorus[i3+1] - this.shapeGrid[i3+1])*f;
              pos[i3+2] = this.shapeGrid[i3+2] + (this.shapeTorus[i3+2] - this.shapeGrid[i3+2])*f;
            }
          }
          this.posAttr.needsUpdate = true;
          // Color shift gold → white as torus forms
          const r = 0.784 + p*0.216;
          const g = 0.663 + p*0.337;
          const b = 0.431 + p*0.569;
          this.mat.color.setRGB(r,g,b);
        },
      }
    });
  }

  _animate() {
    requestAnimationFrame(this._animate.bind(this));
    const t = Date.now()*.001;
    this.points.rotation.y += 0.0015;
    this.points.rotation.x  = Math.sin(t*.4)*.08;
    this.targetPos.x += (this.mouse.x*1.5 - this.targetPos.x)*.04;
    this.targetPos.y += (this.mouse.y*1.5 - this.targetPos.y)*.04;
    this.points.position.x = this.targetPos.x;
    this.points.position.y = this.targetPos.y;
    this.renderer.render(this.scene, this.camera);
  }
}

/* ═══════════════════════════════════════════════
   ③ VANTA NET BACKGROUND
═══════════════════════════════════════════════ */
function initVanta() {
  if (!window.VANTA || !window.THREE) return;
  VANTA.NET({
    el: '#vanta-bg',
    THREE,
    mouseControls: true,
    touchControls: false,
    color: 0xC8A96E,
    backgroundColor: 0x080B0F,
    points: 12,
    maxDistance: 20,
    spacing: 20,
    showDots: true,
  });
}

/* ═══════════════════════════════════════════════
   ④ THREE.JS — FLOATING INVOICE CARDS (HERO)
═══════════════════════════════════════════════ */
function initInvoiceCards() {
  const canvas = document.getElementById('threejs-hero-canvas');
  if (!canvas || !window.THREE) return;

  const W = canvas.parentElement.clientWidth  || 600;
  const H = canvas.parentElement.clientHeight || 620;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias:true, alpha:true });
  renderer.setSize(W, H);
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));

  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, W/H, 0.1, 200);
  camera.position.set(0,0,9);

  scene.add(new THREE.AmbientLight(0xffffff, 0.2));
  const goldLight = new THREE.PointLight(0xC8A96E, 6, 30);
  goldLight.position.set(4,4,4);
  scene.add(goldLight);
  const blueLight = new THREE.PointLight(0x3355ff, 2, 20);
  blueLight.position.set(-4,-3,3);
  scene.add(blueLight);

  function makeCard(w, h, d, opacity, tiltZ, tiltY, px, py, pz) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(w,h,d),
      new THREE.MeshPhongMaterial({ color:0x1A1F2E, specular:0xC8A96E, shininess:80, transparent:true, opacity })
    );
    mesh.rotation.set(0, tiltY, tiltZ);
    mesh.position.set(px, py, pz);

    // Gold top bar
    const bar = new THREE.Mesh(
      new THREE.BoxGeometry(w, 0.1, d+.01),
      new THREE.MeshPhongMaterial({ color:0xC8A96E, emissive:0xC8A96E, emissiveIntensity:.5 })
    );
    bar.position.y = h/2 - .05;
    mesh.add(bar);

    // Content lines
    [
      { w:w*.55, y:h*.3,  g:true  },
      { w:w*.8,  y:h*.16, g:false },
      { w:w*.65, y:h*.04, g:false },
      { w:w*.8,  y:-h*.1, g:false },
      { w:w*.5,  y:-h*.22,g:false },
      { w:w*.8,  y:-h*.34,g:false },
      { w:w*.4,  y:-h*.44,g:true  },
    ].forEach(l => {
      const lm = new THREE.Mesh(
        new THREE.BoxGeometry(l.w, .055, .01),
        new THREE.MeshBasicMaterial({ color:l.g?0xC8A96E:0xffffff, transparent:true, opacity:l.g?.45:.1 })
      );
      lm.position.set(0, l.y, d/2+.005);
      mesh.add(lm);
    });

    scene.add(mesh);
    return mesh;
  }

  const card1 = makeCard(3.0, 4.2, .08, .97,  0,    0,    0,    0,    0   );
  const card2 = makeCard(2.7, 3.8, .07, .55,  .12, -.18,  1.6, -.6, -1.8);
  const card3 = makeCard(2.4, 3.4, .06, .28, -.15,  .20, -1.4, -.8, -3.0);

  // Particle halo
  const pPos = new Float32Array(250*3);
  for (let i=0; i<250; i++) {
    const r=4+Math.random()*5, θ=Math.random()*Math.PI*2, φ=Math.acos(2*Math.random()-1);
    pPos[i*3]   = r*Math.sin(φ)*Math.cos(θ);
    pPos[i*3+1] = r*Math.sin(φ)*Math.sin(θ);
    pPos[i*3+2] = r*Math.cos(φ);
  }
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos,3));
  scene.add(new THREE.Points(pGeo, new THREE.PointsMaterial({ color:0xC8A96E, size:.07, transparent:true, opacity:.5 })));

  let mx=0, my=0;
  document.addEventListener('mousemove', e => {
    mx = (e.clientX/innerWidth -.5)*2;
    my = (e.clientY/innerHeight-.5)*2;
  });

  let t=0;
  ;(function animate() {
    requestAnimationFrame(animate);
    t += .008;
    card1.position.y  = Math.sin(t*.7)*.22;
    card1.rotation.y  = Math.sin(t*.4)*.1 + mx*.18;
    card1.rotation.x  = Math.cos(t*.3)*.05 - my*.08;
    card2.position.y  = -.6 + Math.cos(t*.6+1)*.18;
    card2.rotation.y  = -.18 + mx*.1;
    card3.position.y  = -.8 + Math.sin(t*.5+2)*.15;
    goldLight.position.x = Math.sin(t*.4)*5;
    goldLight.position.y = Math.cos(t*.3)*4;
    renderer.render(scene, camera);
  })();

  window.addEventListener('resize', () => {
    const nW = canvas.parentElement.clientWidth;
    const nH = canvas.parentElement.clientHeight || 620;
    renderer.setSize(nW,nH);
    camera.aspect=nW/nH;
    camera.updateProjectionMatrix();
  });
}

/* ═══════════════════════════════════════════════
   ⑤ LENIS + GSAP SCROLLTRIGGER (FIXED HOOKUP)
═══════════════════════════════════════════════ */
function initLenis() {
  if (!window.Lenis) return;

  const lenis = new Lenis({
    duration: 1.4,
    easing: t => Math.min(1, 1.001-Math.pow(2,-10*t)),
    smoothTouch: false,
  });

  // CRITICAL — this is what was missing before bro
  // Lenis must drive RAF, NOT compete with it
  gsap.ticker.add(time => lenis.raf(time*1000));
  gsap.ticker.lagSmoothing(0);

  // ScrollTrigger must use Lenis scroll position
  lenis.on('scroll', ScrollTrigger.update);

  return lenis;
}

/* ═══════════════════════════════════════════════
   ⑤ GSAP SCROLL ANIMATIONS
═══════════════════════════════════════════════ */
function initGSAP() {
  gsap.registerPlugin(ScrollTrigger);

  // Hero title lines
  const lines = document.querySelectorAll('.hero-title .line');
  if (lines.length) {
    gsap.from(lines, {
      yPercent: 110, opacity:0, duration:1.2,
      ease:'power4.out', stagger:.12, delay:.3,
    });
  }

  gsap.from('.hero-badge',   { y:-24, opacity:0, duration:.9, ease:'power3.out', delay:.15 });
  gsap.from('.hero-sub',     { y:30,  opacity:0, duration:1,  ease:'power3.out', delay:.6  });
  gsap.from('.hero-actions', { y:24,  opacity:0, duration:.9, ease:'power3.out', delay:.8  });
  gsap.from('.hero-note',    { y:16,  opacity:0, duration:.8, ease:'power3.out', delay:.95 });

  // Hero stats count-up
  document.querySelectorAll('.stat-num[data-target]').forEach(el => {
    const target = parseFloat(el.dataset.target);
    const suffix = el.dataset.suffix || '';
    ScrollTrigger.create({
      trigger: el, start:'top 85%', once:true,
      onEnter: () => {
        gsap.fromTo({v:0},{v:target},{
          duration:2, ease:'power2.out',
          onUpdate() {
            el.textContent = Math.floor(this.targets()[0].v) + suffix;
          }
        });
      }
    });
  });

  // Section titles
  document.querySelectorAll('.section-title').forEach(el => {
    gsap.from(el, {
      y:50, opacity:0, duration:1, ease:'power3.out',
      scrollTrigger:{ trigger:el, start:'top 82%', once:true },
    });
  });

  document.querySelectorAll('.section-label').forEach(el => {
    gsap.from(el, {
      x:-30, opacity:0, duration:.8, ease:'power3.out',
      scrollTrigger:{ trigger:el, start:'top 85%', once:true },
    });
  });

  // Feature cards
  ScrollTrigger.create({
    trigger:'.features-grid', start:'top 78%', once:true,
    onEnter: () => {
      gsap.from('.feat-card', {
        y:70, opacity:0, duration:1, stagger:.1, ease:'power4.out',
      });
    }
  });

  // How steps
  ScrollTrigger.create({
    trigger:'.how-steps', start:'top 78%', once:true,
    onEnter: () => {
      gsap.from('.how-step', {
        x:-50, opacity:0, duration:1, stagger:.15, ease:'power4.out',
      });
    }
  });

  // Pricing cards
  ScrollTrigger.create({
    trigger:'.pricing-grid', start:'top 78%', once:true,
    onEnter: () => {
      gsap.from('.plan-card', {
        y:80, opacity:0, duration:1, stagger:.15, ease:'power4.out',
      });
    }
  });

  // CTA
  ScrollTrigger.create({
    trigger:'.cta-section', start:'top 72%', once:true,
    onEnter: () => {
      gsap.from('.cta-title', { y:60, opacity:0, duration:1.2, ease:'power4.out' });
      gsap.from('.cta-sub',   { y:30, opacity:0, duration:1,   ease:'power3.out', delay:.2 });
      gsap.from('.cta-actions',{ y:24, opacity:0, duration:.9, ease:'power3.out', delay:.4 });
    }
  });

  // Templates subtle parallax
  gsap.to('.templates-scroll', {
    x:-60, ease:'none',
    scrollTrigger:{
      trigger:'.templates-section', start:'top bottom', end:'bottom top', scrub:2,
    }
  });

  // Magnetic buttons
  document.querySelectorAll('.btn-gold, .btn-outline').forEach(btn => {
    btn.addEventListener('mousemove', e => {
      const r = btn.getBoundingClientRect();
      const x = e.clientX - r.left - r.width/2;
      const y = e.clientY - r.top  - r.height/2;
      gsap.to(btn, { x:x*.25, y:y*.25, duration:.3, ease:'power2.out' });
    });
    btn.addEventListener('mouseleave', () => {
      gsap.to(btn, { x:0, y:0, duration:.6, ease:'elastic.out(1,.4)' });
    });
  });
}

/* ═══════════════════════════════════════════════
   ⑥ ANIME.JS — TICKER + STAGGER + GLOW
═══════════════════════════════════════════════ */
function initAnime() {
  if (!window.anime) return;

  // Ticker
  const track = document.querySelector('.ticker-track');
  if (track) {
    const clone = track.cloneNode(true);
    track.parentElement.appendChild(clone);
    const totalW = track.scrollWidth;
    anime({
      targets: [track, clone],
      translateX: [0, -totalW],
      duration: 30000,
      easing: 'linear',
      loop: true,
    });
  }

  // Floating invoice cards (DOM)
  anime({ targets:'.inv-card-1', translateY:[-18,0], rotate:[-2,-1], duration:5800, direction:'alternate', loop:true, easing:'easeInOutSine' });
  anime({ targets:'.inv-card-2', translateY:[0,-14], rotate:[3,2],   duration:7200, direction:'alternate', loop:true, easing:'easeInOutSine' });
  anime({ targets:'.inv-card-3', translateY:[-10,6], rotate:[-1,.5], duration:6400, direction:'alternate', loop:true, easing:'easeInOutSine' });

  // Gold button pulse glow
  anime({
    targets: '.btn-gold',
    boxShadow: ['0 0 0px rgba(200,169,110,0)','0 0 30px rgba(200,169,110,0.4)','0 0 0px rgba(200,169,110,0)'],
    duration: 2800, loop:true, easing:'easeInOutSine', delay:anime.stagger(400),
  });

  // Format pill click
  document.querySelectorAll('.format-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('.format-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      anime({ targets:pill, scale:[1.08,1], duration:300, easing:'easeOutElastic(1,.5)' });
    });
  });
}

/* ═══════════════════════════════════════════════
   BOOT — everything in order
═══════════════════════════════════════════════ */
async function boot() {
  // Load all libs first
  await loadScript('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js');
  await loadScript('https://cdn.jsdelivr.net/npm/vanta@latest/dist/vanta.net.min.js');
  await loadScript('https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js');
  await loadScript('https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js');
  await loadScript('https://cdnjs.cloudflare.com/ajax/libs/animejs/3.2.2/anime.min.js');
  await loadScript('https://cdn.jsdelivr.net/npm/@studio-freight/lenis@1.0.42/dist/lenis.min.js');

  // ① Intro burst — fires first, page hidden behind it
  new InvoXeTransition(() => {
    // Revealed after burst — now boot everything else
    initLenis();
    initVanta();
    initInvoiceCards();
    initGSAP();
    initAnime();
    new ParticleEngine();

    // Page enter animation
    gsap.from('body', { opacity:0, duration:.6, ease:'power2.out' });
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
