/* ═══════════════════════════════════════════════
   INVOXE · index.js
   GSAP + ScrollTrigger + SplitText hero
   Anime.js  — ticker, pills, counters
   Three.js  — floating 3D invoice cards
   Vanta.js  — NET background
═══════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {

  /* ─────────────────────────────────────────────
     1. VANTA NET BACKGROUND
  ───────────────────────────────────────────── */
  if (window.VANTA) {
    VANTA.NET({
      el: '#vanta-bg',
      THREE: window.THREE,
      mouseControls: true,
      touchControls: true,
      gyroControls: false,
      minHeight: 200,
      minWidth: 200,
      scale: 1.0,
      scaleMobile: 1.0,
      color: 0xc8a96e,          // gold wires
      backgroundColor: 0x080B0F,
      points: 14,
      maxDistance: 22,
      spacing: 18,
      showDots: true,
    });
  }

  /* ─────────────────────────────────────────────
     2. GSAP HERO SPLIT TEXT ANIMATION
  ───────────────────────────────────────────── */
  gsap.registerPlugin(ScrollTrigger);

  // Split hero title into words manually (no SplitText plugin needed)
  const titleEl = document.querySelector('.hero-title');
  if (titleEl) {
    const lines = titleEl.querySelectorAll('.line');
    gsap.from(lines, {
      yPercent: 110,
      opacity: 0,
      duration: 1.1,
      ease: 'power4.out',
      stagger: 0.12,
      delay: 0.2,
    });
  }

  // Hero sub + actions fade up
  gsap.from('.hero-sub', {
    y: 30, opacity: 0, duration: 1, ease: 'power3.out', delay: 0.5,
  });
  gsap.from('.hero-actions', {
    y: 24, opacity: 0, duration: 0.9, ease: 'power3.out', delay: 0.7,
  });
  gsap.from('.hero-note', {
    y: 16, opacity: 0, duration: 0.8, ease: 'power3.out', delay: 0.85,
  });
  gsap.from('.hero-badge', {
    y: -20, opacity: 0, duration: 0.8, ease: 'power3.out', delay: 0.1,
  });

  // Stats count up with GSAP
  document.querySelectorAll('.stat-num[data-target]').forEach(el => {
    const target = parseFloat(el.dataset.target);
    const isInt  = Number.isInteger(target);
    ScrollTrigger.create({
      trigger: el,
      start: 'top 85%',
      once: true,
      onEnter: () => {
        gsap.fromTo({ val: 0 }, { val: target }, {
          duration: 2,
          ease: 'power2.out',
          onUpdate: function () {
            el.textContent = isInt
              ? Math.floor(this.targets()[0].val) + (el.dataset.suffix || '')
              : this.targets()[0].val.toFixed(1) + (el.dataset.suffix || '');
          },
        });
      },
    });
  });

  // Hero right glow parallax
  gsap.to('.hero-right-glow', {
    y: -60,
    ease: 'none',
    scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 1.5 },
  });

  /* ─────────────────────────────────────────────
     3. THREE.JS — FLOATING INVOICE CARDS (HERO)
  ───────────────────────────────────────────── */
  (function initThreeHero() {
    const canvas = document.getElementById('threejs-hero-canvas');
    if (!canvas || !window.THREE) return;

    const W = canvas.parentElement.clientWidth  || 600;
    const H = canvas.parentElement.clientHeight || 620;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;

    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, W / H, 0.1, 200);
    camera.position.set(0, 0, 9);

    // Lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.25));

    const goldLight = new THREE.PointLight(0xC8A96E, 5, 30);
    goldLight.position.set(4, 4, 4);
    scene.add(goldLight);

    const blueLight = new THREE.PointLight(0x3366ff, 2, 20);
    blueLight.position.set(-4, -3, 3);
    scene.add(blueLight);

    const rimLight = new THREE.DirectionalLight(0xffffff, 0.4);
    rimLight.position.set(0, 10, -5);
    scene.add(rimLight);

    // Card factory
    function makeCard(w, h, d, opacity, tiltZ, tiltY, posX, posY, posZ) {
      const geo = new THREE.BoxGeometry(w, h, d);
      const mat = new THREE.MeshPhongMaterial({
        color: 0x1A1F2E,
        specular: 0xC8A96E,
        shininess: 80,
        transparent: true,
        opacity,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.rotation.set(0, tiltY, tiltZ);
      mesh.position.set(posX, posY, posZ);

      // Gold top strip
      const strip = new THREE.Mesh(
        new THREE.BoxGeometry(w, 0.1, d + 0.01),
        new THREE.MeshPhongMaterial({ color: 0xC8A96E, emissive: 0xC8A96E, emissiveIntensity: 0.4 })
      );
      strip.position.y = h / 2 - 0.05;
      mesh.add(strip);

      // Content lines
      const lineData = [
        { w: w * 0.55, y:  h*0.3,  gold: true  },
        { w: w * 0.8,  y:  h*0.16, gold: false },
        { w: w * 0.65, y:  h*0.04, gold: false },
        { w: w * 0.8,  y: -h*0.1,  gold: false },
        { w: w * 0.5,  y: -h*0.22, gold: false },
        { w: w * 0.8,  y: -h*0.34, gold: false },
        { w: w * 0.4,  y: -h*0.44, gold: true  },
      ];
      lineData.forEach(l => {
        const lMesh = new THREE.Mesh(
          new THREE.BoxGeometry(l.w, 0.055, 0.01),
          new THREE.MeshBasicMaterial({
            color: l.gold ? 0xC8A96E : 0xffffff,
            transparent: true,
            opacity: l.gold ? 0.45 : 0.1,
          })
        );
        lMesh.position.set(0, l.y, d / 2 + 0.005);
        mesh.add(lMesh);
      });

      scene.add(mesh);
      return mesh;
    }

    const card1 = makeCard(3.0, 4.2, 0.08, 0.97,  0.0,   0.0,   0,    0,    0   );
    const card2 = makeCard(2.7, 3.8, 0.07, 0.55,  0.12, -0.18,  1.6, -0.6, -1.8);
    const card3 = makeCard(2.4, 3.4, 0.06, 0.28, -0.15,  0.20, -1.4, -0.8, -3.0);

    // Particle halo
    const pCount = 200;
    const pPos   = new Float32Array(pCount * 3);
    for (let i = 0; i < pCount; i++) {
      const r = 4 + Math.random() * 5;
      const θ = Math.random() * Math.PI * 2;
      const φ = Math.acos(2 * Math.random() - 1);
      pPos[i*3]   = r * Math.sin(φ) * Math.cos(θ);
      pPos[i*3+1] = r * Math.sin(φ) * Math.sin(θ);
      pPos[i*3+2] = r * Math.cos(φ);
    }
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    const particles = new THREE.Points(pGeo,
      new THREE.PointsMaterial({ color: 0xC8A96E, size: 0.06, transparent: true, opacity: 0.5 })
    );
    scene.add(particles);

    // Mouse tracking
    let mx = 0, my = 0;
    document.addEventListener('mousemove', e => {
      mx = (e.clientX / innerWidth  - 0.5) * 2;
      my = (e.clientY / innerHeight - 0.5) * 2;
    });

    let t = 0;
    function animate() {
      requestAnimationFrame(animate);
      t += 0.008;

      card1.position.y  = Math.sin(t * 0.7) * 0.22;
      card1.rotation.y  = Math.sin(t * 0.4) * 0.1 + mx * 0.18;
      card1.rotation.x  = Math.cos(t * 0.3) * 0.05 - my * 0.08;

      card2.position.x  = 1.6 + Math.sin(t * 0.5 + 1) * 0.1;
      card2.position.y  = -0.6 + Math.cos(t * 0.6 + 1) * 0.18;
      card2.rotation.y  = -0.18 + mx * 0.1;

      card3.position.x  = -1.4 + Math.cos(t * 0.55 + 2) * 0.08;
      card3.position.y  = -0.8 + Math.sin(t * 0.5 + 2) * 0.15;

      particles.rotation.y = t * 0.04 + mx * 0.03;
      particles.rotation.x = my * 0.02;

      goldLight.position.x = Math.sin(t * 0.4) * 5;
      goldLight.position.y = Math.cos(t * 0.3) * 4;

      renderer.render(scene, camera);
    }
    animate();

    window.addEventListener('resize', () => {
      const nW = canvas.parentElement.clientWidth;
      const nH = canvas.parentElement.clientHeight || 620;
      renderer.setSize(nW, nH);
      camera.aspect = nW / nH;
      camera.updateProjectionMatrix();
    });
  })();

  /* ─────────────────────────────────────────────
     4. ANIME.JS — TICKER INFINITE SCROLL
  ───────────────────────────────────────────── */
  (function initTicker() {
    const track = document.querySelector('.ticker-track');
    if (!track || !window.anime) return;

    // Clone for seamless loop
    const clone = track.cloneNode(true);
    track.parentElement.appendChild(clone);

    const totalW = track.scrollWidth;

    anime({
      targets: [track, clone],
      translateX: [0, -totalW],
      duration: 28000,
      easing: 'linear',
      loop: true,
    });
  })();

  /* ─────────────────────────────────────────────
     5. ANIME.JS — FEATURES CARD STAGGER ON ENTER
  ───────────────────────────────────────────── */
  ScrollTrigger.create({
    trigger: '.features-grid',
    start: 'top 75%',
    once: true,
    onEnter: () => {
      if (!window.anime) return;
      anime({
        targets: '.feat-card',
        translateY: [60, 0],
        opacity:    [0, 1],
        duration:   900,
        delay:      anime.stagger(100),
        easing:     'easeOutExpo',
      });
    },
  });

  /* ─────────────────────────────────────────────
     6. ANIME.JS — HOW-STEPS STAGGER
  ───────────────────────────────────────────── */
  ScrollTrigger.create({
    trigger: '.how-steps',
    start: 'top 75%',
    once: true,
    onEnter: () => {
      if (!window.anime) return;
      anime({
        targets: '.how-step',
        translateX: [-50, 0],
        opacity:    [0, 1],
        duration:   900,
        delay:      anime.stagger(150),
        easing:     'easeOutExpo',
      });
    },
  });

  /* ─────────────────────────────────────────────
     7. ANIME.JS — FLOATING INVOICE CARDS (DOM)
        Continuous parallax float
  ───────────────────────────────────────────── */
  (function floatInvoices() {
    if (!window.anime) return;

    anime({
      targets: '.inv-card-1',
      translateY: [-18, 0],
      rotate:     [-2, -1],
      duration:   5800,
      direction:  'alternate',
      loop:       true,
      easing:     'easeInOutSine',
    });
    anime({
      targets: '.inv-card-2',
      translateY: [0, -14],
      rotate:     [3, 2],
      duration:   7200,
      direction:  'alternate',
      loop:       true,
      easing:     'easeInOutSine',
    });
    anime({
      targets: '.inv-card-3',
      translateY: [-10, 6],
      rotate:     [-1, 0.5],
      duration:   6400,
      direction:  'alternate',
      loop:       true,
      easing:     'easeInOutSine',
    });
  })();

  /* ─────────────────────────────────────────────
     8. GSAP SCROLLTRIGGER — PINNED HORIZONTAL
        TEMPLATE MARQUEE (subtle parallax)
  ───────────────────────────────────────────── */
  gsap.to('.templates-scroll', {
    x: -80,
    ease: 'none',
    scrollTrigger: {
      trigger: '.templates-section',
      start: 'top bottom',
      end: 'bottom top',
      scrub: 2,
    },
  });

  /* ─────────────────────────────────────────────
     9. GSAP — PRICING CARDS STAGGER
  ───────────────────────────────────────────── */
  ScrollTrigger.create({
    trigger: '.pricing-grid',
    start: 'top 75%',
    once: true,
    onEnter: () => {
      gsap.from('.plan-card', {
        y: 80,
        opacity: 0,
        duration: 1,
        stagger: 0.15,
        ease: 'power4.out',
      });
    },
  });

  /* ─────────────────────────────────────────────
     10. GSAP — CTA TITLE LETTER SHIMMER
  ───────────────────────────────────────────── */
  ScrollTrigger.create({
    trigger: '.cta-section',
    start: 'top 70%',
    once: true,
    onEnter: () => {
      gsap.from('.cta-title', {
        y: 60,
        opacity: 0,
        duration: 1.2,
        ease: 'power4.out',
      });
      gsap.from('.cta-sub', {
        y: 30,
        opacity: 0,
        duration: 1,
        delay: 0.2,
        ease: 'power3.out',
      });
      gsap.from('.cta-actions', {
        y: 24,
        opacity: 0,
        duration: 0.9,
        delay: 0.4,
        ease: 'power3.out',
      });
    },
  });

  /* ─────────────────────────────────────────────
     11. ANIME.JS — GOLD BUTTON PULSE IDLE
  ───────────────────────────────────────────── */
  if (window.anime) {
    anime({
      targets: '.btn-gold',
      boxShadow: [
        '0 0 0px rgba(200,169,110,0)',
        '0 0 28px rgba(200,169,110,0.35)',
        '0 0 0px rgba(200,169,110,0)',
      ],
      duration:  2800,
      loop:      true,
      easing:    'easeInOutSine',
      delay:     anime.stagger(400),
    });
  }

  /* ─────────────────────────────────────────────
     12. GSAP — SECTION TITLE SLIDE-IN
  ───────────────────────────────────────────── */
  document.querySelectorAll('.section-title').forEach(el => {
    gsap.from(el, {
      y: 50,
      opacity: 0,
      duration: 1,
      ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 82%', once: true },
    });
  });

  document.querySelectorAll('.section-label').forEach(el => {
    gsap.from(el, {
      x: -30,
      opacity: 0,
      duration: 0.8,
      ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 85%', once: true },
    });
  });

});
