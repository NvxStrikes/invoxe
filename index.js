/* ═══════════════════════════════════════════════
   INVOXE · index.js  (FIXED)
   All libs loaded via <script> tags in HTML.
   This file only runs AFTER they're all ready.
═══════════════════════════════════════════════ */

/* ─────────────────────────────────────────────
   UTIL: text → particle positions
───────────────────────────────────────────── */
function getTextParticlePositions(lines, count, W, H) {
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Big line
  ctx.font = `900 ${Math.floor(W / 5)}px "Space Grotesk", sans-serif`;
  ctx.globalAlpha = 1;
  ctx.fillText(lines[0], W / 2, H * 0.38);

  // Small line
  ctx.font = `500 ${Math.floor(W / 16)}px "Space Grotesk", sans-serif`;
  ctx.globalAlpha = 0.6;
  ctx.fillText(lines[1], W / 2, H * 0.7);
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
    result[i*3]   = pts[s]   * 2.6 + (Math.random()-.5)*.015;
    result[i*3+1] = pts[s+1] * 1.0 + (Math.random()-.5)*.015;
    result[i*3+2] = 0;
  }
  return result;
}

/* ═══════════════════════════════════════════════
   ① INVOXE PARTICLE BURST INTRO
═══════════════════════════════════════════════ */
class InvoXeIntro {
  constructor(onDone) {
    this.onDone   = onDone;
    this.COUNT    = 10000;
    this.T_GATHER = 1100;
    this.T_HOLD   = 1500;
    this.T_BURST  = 650;
    this.done     = false;

    // Overlay
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
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.setSize(W, H);
    this.renderer.setClearColor(0x080B0F, 1);
    this.overlay.appendChild(this.renderer.domElement);

    const geo = new THREE.BufferGeometry();
    this.posAttr = new THREE.BufferAttribute(new Float32Array(this.COUNT * 3), 3);
    geo.setAttribute('position', this.posAttr);

    this.mat = new THREE.PointsMaterial({
      color: 0xC8A96E, size: 0.025,
      transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    this.points = new THREE.Points(geo, this.mat);
    this.scene.add(this.points);

    // Scatter start positions
    this.scatterPos = new Float32Array(this.COUNT * 3);
    for (let i = 0; i < this.COUNT; i++) {
      const θ = Math.random() * Math.PI * 2;
      const r = 2 + Math.random() * 4;
      this.scatterPos[i*3]   = Math.cos(θ) * r;
      this.scatterPos[i*3+1] = Math.sin(θ) * r;
      this.scatterPos[i*3+2] = (Math.random()-.5) * 2;
    }

    // Text target
    this.textPos = getTextParticlePositions(
      ['INVOXE', 'By NovaStrikes'], this.COUNT, 1200, 280
    );

    // Burst end positions
    this.burstPos = new Float32Array(this.COUNT * 3);
    for (let i = 0; i < this.COUNT; i++) {
      const θ = Math.random() * Math.PI * 2;
      const φ = Math.random() * Math.PI;
      const r = 4 + Math.random() * 6;
      this.burstPos[i*3]   = Math.sin(φ) * Math.cos(θ) * r;
      this.burstPos[i*3+1] = Math.sin(φ) * Math.sin(θ) * r;
      this.burstPos[i*3+2] = Math.cos(φ) * r;
    }

    this.posAttr.array.set(this.scatterPos);
    this.posAttr.needsUpdate = true;

    this._phase     = 'gather';
    this._startTime = performance.now();
    this._raf       = requestAnimationFrame(this._loop.bind(this));
  }

  _ease(t)       { return t < .5 ? 2*t*t : -1+(4-2*t)*t; }
  _lerp(a, b, t) { return a + (b-a) * this._ease(Math.min(Math.max(t,0),1)); }

  _loop(now) {
    if (this.done) return;
    this._raf = requestAnimationFrame(this._loop.bind(this));
    const elapsed = now - this._startTime;
    const pos = this.posAttr.array;

    if (this._phase === 'gather') {
      const t = elapsed / this.T_GATHER;
      for (let i = 0; i < this.COUNT * 3; i++)
        pos[i] = this._lerp(this.scatterPos[i], this.textPos[i], t);
      this.mat.opacity = this._ease(Math.min(t,1)) * 0.92;
      if (t >= 1) { this._phase = 'hold'; this._phaseStart = now; }
    }
    else if (this._phase === 'hold') {
      const t = (now - this._phaseStart) / this.T_HOLD;
      this.mat.opacity = 0.88 + Math.sin(t * Math.PI * 4) * 0.06;
      this.points.rotation.y = Math.sin(t * Math.PI) * 0.05;
      if (t >= 1) { this._phase = 'burst'; this._phaseStart = now; }
    }
    else if (this._phase === 'burst') {
      const t = (now - this._phaseStart) / this.T_BURST;
      for (let i = 0; i < this.COUNT * 3; i++)
        pos[i] = this._lerp(this.textPos[i], this.burstPos[i], t);
      this.mat.opacity = 1 - this._ease(Math.min(t,1));
      this.overlay.style.background = `rgba(8,11,15,${(1 - t).toFixed(3)})`;
      if (t >= 1) { this._finish(); return; }
    }

    this.posAttr.needsUpdate = true;
    this.renderer.render(this.scene, this.camera);
  }

  _finish() {
    this.done = true;
    cancelAnimationFrame(this._raf);
    this.overlay.style.transition   = 'opacity 0.5s ease';
    this.overlay.style.opacity      = '0';
    this.overlay.style.pointerEvents = 'none';
    setTimeout(() => {
      this.overlay.remove();
      this.renderer.dispose();
      this.onDone();
    }, 520);
  }
}

/* ═══════════════════════════════════════════════
   ② 60K PARTICLE MORPH — scroll driven
═══════════════════════════════════════════════ */
class ParticleEngine {
  constructor() {
    this.canvas = document.getElementById('particle-canvas');
    if (!this.canvas) return;
    this.COUNT = 60000;
    this.mouse = { x:0, y:0 };
    this.smooth = { x:0, y:0 };
    this._init();
    this._buildShapes();
    this._buildMesh();
    this._setupScroll();
    this._animate();
    window.addEventListener('mousemove', e => {
      this.mouse.x =  (e.clientX / innerWidth)  * 2 - 1;
      this.mouse.y = -(e.clientY / innerHeight) * 2 + 1;
    });
    window.addEventListener('resize', () => {
      const W = this.canvas.parentElement.clientWidth  || innerWidth;
      const H = this.canvas.parentElement.clientHeight || innerHeight;
      this.renderer.setSize(W, H);
      this.camera.aspect = W / H;
      this.camera.updateProjectionMatrix();
    });
  }

  _init() {
    const W = innerWidth, H = innerHeight;
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias:true, alpha:true });
    this.renderer.setSize(W, H);
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.scene  = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, W/H, 0.1, 1000);
    this.camera.position.z = 8;
  }

  _buildShapes() {
    const N = this.COUNT;

    this.shapeSphere = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const φ = Math.acos(-1 + (2*i) / N);
      const θ = Math.sqrt(N * Math.PI) * φ;
      const r = 3;
      this.shapeSphere[i*3]   = r * Math.cos(θ) * Math.sin(φ);
      this.shapeSphere[i*3+1] = r * Math.sin(θ) * Math.sin(φ);
      this.shapeSphere[i*3+2] = r * Math.cos(φ);
    }

    this.shapeGrid = new Float32Array(N * 3);
    const dim = Math.floor(Math.sqrt(N));
    for (let i = 0; i < N; i++) {
      const x = (i % dim) - dim/2;
      const z = Math.floor(i / dim) - dim/2;
      this.shapeGrid[i*3]   = x * 0.16;
      this.shapeGrid[i*3+1] = Math.sin(x*.22) * Math.cos(z*.22) * 1.8;
      this.shapeGrid[i*3+2] = z * 0.16;
    }

    this.shapeTorus = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const u = Math.random() * Math.PI * 2;
      const v = Math.random() * Math.PI * 2;
      const R = 3.2, r = 1.1;
      this.shapeTorus[i*3]   = (R + r*Math.cos(v)) * Math.cos(u);
      this.shapeTorus[i*3+1] = (R + r*Math.cos(v)) * Math.sin(u);
      this.shapeTorus[i*3+2] = r * Math.sin(v);
    }
  }

  _buildMesh() {
    const geo = new THREE.BufferGeometry();
    this.posAttr = new THREE.BufferAttribute(new Float32Array(this.COUNT * 3), 3);
    this.posAttr.array.set(this.shapeSphere);
    geo.setAttribute('position', this.posAttr);
    this.mat = new THREE.PointsMaterial({
      color: 0xC8A96E, size: 0.018,
      transparent: true, opacity: 0.8,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    this.points = new THREE.Points(geo, this.mat);
    this.scene.add(this.points);
  }

  _setupScroll() {
    const pos = this.posAttr.array;
    const N   = this.COUNT;
    const S   = this.shapeSphere;
    const G   = this.shapeGrid;
    const T   = this.shapeTorus;

    gsap.to({}, {
      scrollTrigger: {
        trigger: '#particle-section',
        start: 'top top',
        end: 'bottom bottom',
        scrub: 1.2,
        onUpdate: self => {
          const p = self.progress;
          for (let i = 0; i < N; i++) {
            const i3 = i * 3;
            if (p < 0.5) {
              const f = p * 2;
              pos[i3]   = S[i3]   + (G[i3]   - S[i3])   * f;
              pos[i3+1] = S[i3+1] + (G[i3+1] - S[i3+1]) * f;
              pos[i3+2] = S[i3+2] + (G[i3+2] - S[i3+2]) * f;
            } else {
              const f = (p - .5) * 2;
              pos[i3]   = G[i3]   + (T[i3]   - G[i3])   * f;
              pos[i3+1] = G[i3+1] + (T[i3+1] - G[i3+1]) * f;
              pos[i3+2] = G[i3+2] + (T[i3+2] - G[i3+2]) * f;
            }
          }
          this.posAttr.needsUpdate = true;
          const r = 0.784 + p * 0.216;
          const g = 0.663 + p * 0.337;
          const b = 0.431 + p * 0.569;
          this.mat.color.setRGB(r, g, b);
        }
      }
    });
  }

  _animate() {
    requestAnimationFrame(this._animate.bind(this));
    this.smooth.x += (this.mouse.x * 1.5 - this.smooth.x) * .04;
    this.smooth.y += (this.mouse.y * 1.5 - this.smooth.y) * .04;
    this.points.rotation.y += .0015;
    this.points.rotation.x  = Math.sin(Date.now()*.0004) * .08;
    this.points.position.x  = this.smooth.x;
    this.points.position.y  = this.smooth.y;
    this.renderer.render(this.scene, this.camera);
  }
}

/* ═══════════════════════════════════════════════
   ③ VANTA NET BACKGROUND
═══════════════════════════════════════════════ */
function initVanta() {
  if (!window.VANTA) return;
  VANTA.NET({
    el: '#vanta-bg',
    THREE: THREE,
    mouseControls: true,
    touchControls: false,
    color: 0xC8A96E,
    backgroundColor: 0x080B0F,
    points: 11,
    maxDistance: 20,
    spacing: 20,
    showDots: true,
  });
}

/* ═══════════════════════════════════════════════
   ④ THREE.JS FLOATING INVOICE CARDS
═══════════════════════════════════════════════ */
function initInvoiceCards() {
  const canvas = document.getElementById('threejs-hero-canvas');
  if (!canvas) return;
  const W = canvas.parentElement.clientWidth  || 600;
  const H = canvas.parentElement.clientHeight || 620;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias:true, alpha:true });
  renderer.setSize(W, H);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));

  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, W/H, 0.1, 200);
  camera.position.set(0, 0, 9);

  scene.add(new THREE.AmbientLight(0xffffff, 0.2));
  const gL = new THREE.PointLight(0xC8A96E, 6, 30);
  gL.position.set(4, 4, 4);
  scene.add(gL);
  scene.add(Object.assign(new THREE.PointLight(0x3355ff, 2, 20), { position: new THREE.Vector3(-4,-3,3) }));

  function makeCard(w, h, d, op, rz, ry, px, py, pz) {
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      new THREE.MeshPhongMaterial({ color:0x1A1F2E, specular:0xC8A96E, shininess:80, transparent:true, opacity:op })
    );
    m.rotation.set(0, ry, rz);
    m.position.set(px, py, pz);
    const bar = new THREE.Mesh(
      new THREE.BoxGeometry(w, .1, d+.01),
      new THREE.MeshPhongMaterial({ color:0xC8A96E, emissive:0xC8A96E, emissiveIntensity:.5 })
    );
    bar.position.y = h/2 - .05;
    m.add(bar);
    [
      { w:w*.55,y:h*.3, g:true }, { w:w*.8,y:h*.16,g:false },
      { w:w*.65,y:h*.04,g:false },{ w:w*.8,y:-h*.1,g:false },
      { w:w*.5,y:-h*.22,g:false },{ w:w*.8,y:-h*.34,g:false },
      { w:w*.4,y:-h*.44,g:true },
    ].forEach(l => {
      const lm = new THREE.Mesh(
        new THREE.BoxGeometry(l.w,.055,.01),
        new THREE.MeshBasicMaterial({ color:l.g?0xC8A96E:0xffffff, transparent:true, opacity:l.g?.45:.1 })
      );
      lm.position.set(0, l.y, d/2+.005);
      m.add(lm);
    });
    scene.add(m);
    return m;
  }

  const c1 = makeCard(3.0, 4.2, .08, .97,  0,    0,    0,   0,    0  );
  const c2 = makeCard(2.7, 3.8, .07, .55,  .12, -.18,  1.6,-.6, -1.8);
  const c3 = makeCard(2.4, 3.4, .06, .28, -.15,  .20, -1.4,-.8, -3.0);

  const pPos = new Float32Array(250*3);
  for (let i=0;i<250;i++){const r=4+Math.random()*5,θ=Math.random()*Math.PI*2,φ=Math.acos(2*Math.random()-1);pPos[i*3]=r*Math.sin(φ)*Math.cos(θ);pPos[i*3+1]=r*Math.sin(φ)*Math.sin(θ);pPos[i*3+2]=r*Math.cos(φ);}
  const pGeo=new THREE.BufferGeometry();pGeo.setAttribute('position',new THREE.BufferAttribute(pPos,3));
  scene.add(new THREE.Points(pGeo,new THREE.PointsMaterial({color:0xC8A96E,size:.07,transparent:true,opacity:.5})));

  let mx=0,my=0;
  document.addEventListener('mousemove',e=>{mx=(e.clientX/innerWidth-.5)*2;my=(e.clientY/innerHeight-.5)*2;});

  let t=0;
  (function loop(){
    requestAnimationFrame(loop); t+=.008;
    c1.position.y=Math.sin(t*.7)*.22;
    c1.rotation.y=Math.sin(t*.4)*.1+mx*.18;
    c1.rotation.x=Math.cos(t*.3)*.05-my*.08;
    c2.position.y=-.6+Math.cos(t*.6+1)*.18;
    c2.rotation.y=-.18+mx*.1;
    c3.position.y=-.8+Math.sin(t*.5+2)*.15;
    gL.position.x=Math.sin(t*.4)*5;
    gL.position.y=Math.cos(t*.3)*4;
    renderer.render(scene,camera);
  })();

  window.addEventListener('resize',()=>{
    const nW=canvas.parentElement.clientWidth, nH=canvas.parentElement.clientHeight||620;
    renderer.setSize(nW,nH); camera.aspect=nW/nH; camera.updateProjectionMatrix();
  });
}

/* ═══════════════════════════════════════════════
   ⑤ LENIS SMOOTH SCROLL (FIXED)
═══════════════════════════════════════════════ */
function initLenis() {
  if (!window.Lenis) return;
  const lenis = new Lenis({
    duration: 1.4,
    easing: t => Math.min(1, 1.001 - Math.pow(2, -10*t)),
    smoothTouch: false,
  });
  // THIS is the correct hookup — drives Lenis via GSAP ticker
  gsap.ticker.add(time => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
  lenis.on('scroll', ScrollTrigger.update);
}

/* ═══════════════════════════════════════════════
   ⑥ ALL GSAP ANIMATIONS
═══════════════════════════════════════════════ */
function initGSAP() {
  gsap.registerPlugin(ScrollTrigger);

  // Hero
  gsap.from('.hero-title .line', { yPercent:110, opacity:0, duration:1.2, ease:'power4.out', stagger:.12, delay:.2 });
  gsap.from('.hero-badge',       { y:-24, opacity:0, duration:.9, ease:'power3.out', delay:.1  });
  gsap.from('.hero-sub',         { y:30,  opacity:0, duration:1,  ease:'power3.out', delay:.55 });
  gsap.from('.hero-actions',     { y:24,  opacity:0, duration:.9, ease:'power3.out', delay:.75 });
  gsap.from('.hero-note',        { y:16,  opacity:0, duration:.8, ease:'power3.out', delay:.9  });
  gsap.from('.hero-right',       { x:60,  opacity:0, duration:1.2,ease:'power4.out', delay:.3  });

  // Stats countup
  document.querySelectorAll('.stat-num[data-target]').forEach(el => {
    const target = parseFloat(el.dataset.target);
    const suffix = el.dataset.suffix || '';
    ScrollTrigger.create({
      trigger:el, start:'top 85%', once:true,
      onEnter:() => gsap.fromTo({v:0},{v:target},{
        duration:2, ease:'power2.out',
        onUpdate() { el.textContent = Math.floor(this.targets()[0].v) + suffix; }
      })
    });
  });

  // Section labels + titles
  document.querySelectorAll('.section-label').forEach(el => {
    gsap.from(el,{ x:-30, opacity:0, duration:.8, ease:'power3.out', scrollTrigger:{ trigger:el, start:'top 85%', once:true }});
  });
  document.querySelectorAll('.section-title').forEach(el => {
    gsap.from(el,{ y:50, opacity:0, duration:1, ease:'power3.out', scrollTrigger:{ trigger:el, start:'top 82%', once:true }});
  });

  // Features
  ScrollTrigger.create({ trigger:'.features-grid', start:'top 78%', once:true,
    onEnter:() => gsap.from('.feat-card',{ y:70, opacity:0, duration:1, stagger:.1, ease:'power4.out' })
  });

  // How steps
  ScrollTrigger.create({ trigger:'.how-steps', start:'top 78%', once:true,
    onEnter:() => gsap.from('.how-step',{ x:-50, opacity:0, duration:1, stagger:.15, ease:'power4.out' })
  });

  // Pricing
  ScrollTrigger.create({ trigger:'.pricing-grid', start:'top 78%', once:true,
    onEnter:() => gsap.from('.plan-card',{ y:80, opacity:0, duration:1, stagger:.15, ease:'power4.out' })
  });

  // CTA
  ScrollTrigger.create({ trigger:'.cta-section', start:'top 72%', once:true,
    onEnter:() => {
      gsap.from('.cta-title',  { y:60, opacity:0, duration:1.2, ease:'power4.out'       });
      gsap.from('.cta-sub',    { y:30, opacity:0, duration:1,   ease:'power3.out', delay:.2 });
      gsap.from('.cta-actions',{ y:24, opacity:0, duration:.9,  ease:'power3.out', delay:.4 });
    }
  });

  // Magnetic buttons
  document.querySelectorAll('.btn-gold, .btn-outline').forEach(btn => {
    btn.addEventListener('mousemove', e => {
      const r = btn.getBoundingClientRect();
      gsap.to(btn,{ x:(e.clientX-r.left-r.width/2)*.25, y:(e.clientY-r.top-r.height/2)*.25, duration:.3, ease:'power2.out' });
    });
    btn.addEventListener('mouseleave', () => {
      gsap.to(btn,{ x:0, y:0, duration:.6, ease:'elastic.out(1,.4)' });
    });
  });
}

/* ═══════════════════════════════════════════════
   ⑦ ANIME.JS
═══════════════════════════════════════════════ */
function initAnime() {
  if (!window.anime) return;

  // Ticker
  const track = document.querySelector('.ticker-track');
  if (track) {
    const clone = track.cloneNode(true);
    track.parentElement.appendChild(clone);
    anime({ targets:[track,clone], translateX:[0,-track.scrollWidth], duration:28000, easing:'linear', loop:true });
  }

  // Floating invoice DOM cards
  anime({ targets:'.inv-card-1', translateY:[-18,0], rotate:[-2,-1], duration:5800, direction:'alternate', loop:true, easing:'easeInOutSine' });
  anime({ targets:'.inv-card-2', translateY:[0,-14], rotate:[3,2],   duration:7200, direction:'alternate', loop:true, easing:'easeInOutSine' });
  anime({ targets:'.inv-card-3', translateY:[-10,6], rotate:[-1,.5], duration:6400, direction:'alternate', loop:true, easing:'easeInOutSine' });

  // Button glow pulse
  anime({ targets:'.btn-gold',
    boxShadow:['0 0 0px rgba(200,169,110,0)','0 0 28px rgba(200,169,110,0.4)','0 0 0px rgba(200,169,110,0)'],
    duration:2800, loop:true, easing:'easeInOutSine', delay:anime.stagger(400)
  });
}

/* ═══════════════════════════════════════════════
   BOOT — runs after ALL scripts loaded
═══════════════════════════════════════════════ */
window.addEventListener('load', () => {
  // Fire intro first — everything else boots in the callback
  new InvoXeIntro(() => {
    initLenis();
    initVanta();
    initInvoiceCards();
    initGSAP();
    initAnime();
    new ParticleEngine();
  });
});
