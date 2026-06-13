/* ═══════════════════════════════════════════════
   INVOXE · _shared.js
   Cursor, Navbar, Scroll Reveal, Lenis Smooth Scroll
═══════════════════════════════════════════════ */

/* ── LENIS SMOOTH SCROLL ────────────────────── */
let lenis;
function initLenis() {
  lenis = new Lenis({
    duration: 1.4,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smooth: true,
    smoothTouch: false,
  });
  function raf(time) {
    lenis.raf(time);
    requestAnimationFrame(raf);
  }
  requestAnimationFrame(raf);

  // hook into GSAP ScrollTrigger if present
  if (window.ScrollTrigger) {
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => { lenis.raf(time * 1000); });
    gsap.ticker.lagSmoothing(0);
  }
}

/* ── CUSTOM CURSOR ──────────────────────────── */
function initCursor() {
  const cur  = document.getElementById('cursor');
  const ring = document.getElementById('cursor-ring');
  if (!cur || !ring) return;

  let mx = window.innerWidth / 2;
  let my = window.innerHeight / 2;
  let rx = mx, ry = my;

  document.addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; });

  // Smooth ring follow
  function loop() {
    rx += (mx - rx) * 0.12;
    ry += (my - ry) * 0.12;
    cur.style.left  = mx + 'px';
    cur.style.top   = my + 'px';
    ring.style.left = rx + 'px';
    ring.style.top  = ry + 'px';
    requestAnimationFrame(loop);
  }
  loop();

  // Hover states
  const hoverEls = document.querySelectorAll(
    'a, button, .tmpl-card, .feat-card, .format-pill, .plan-card, .how-step'
  );
  hoverEls.forEach(el => {
    el.addEventListener('mouseenter', () => { cur.classList.add('hover'); ring.classList.add('hover'); });
    el.addEventListener('mouseleave', () => { cur.classList.remove('hover'); ring.classList.remove('hover'); });
  });

  // Click squish
  document.addEventListener('mousedown', () => cur.classList.add('click'));
  document.addEventListener('mouseup',   () => cur.classList.remove('click'));
}

/* ── NAVBAR SCROLL ──────────────────────────── */
function initNavbar() {
  const nav = document.getElementById('navbar');
  if (!nav) return;
  const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 80);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Active link highlight
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav-links a');
  if (!sections.length || !navLinks.length) return;

  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        navLinks.forEach(a => a.classList.remove('active'));
        const link = document.querySelector(`.nav-links a[href="#${e.target.id}"]`);
        if (link) link.classList.add('active');
      }
    });
  }, { rootMargin: '-40% 0px -55% 0px' });

  sections.forEach(s => obs.observe(s));
}

/* ── SCROLL REVEAL ──────────────────────────── */
function initReveal() {
  const els = document.querySelectorAll('.reveal');
  if (!els.length) return;
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('active');
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -60px 0px' });
  els.forEach(el => obs.observe(el));
}

/* ── DRAG-SCROLL (templates row) ────────────── */
function initDragScroll(selector) {
  const el = document.querySelector(selector);
  if (!el) return;
  let isDown = false, startX, scrollLeft;
  el.addEventListener('mousedown',  e => { isDown = true; el.classList.add('active'); startX = e.pageX - el.offsetLeft; scrollLeft = el.scrollLeft; });
  el.addEventListener('mouseleave', () => { isDown = false; el.classList.remove('active'); });
  el.addEventListener('mouseup',    () => { isDown = false; el.classList.remove('active'); });
  el.addEventListener('mousemove',  e => {
    if (!isDown) return;
    e.preventDefault();
    const x = e.pageX - el.offsetLeft;
    el.scrollLeft = scrollLeft - (x - startX) * 1.5;
  });
}

/* ── FORMAT PILL TOGGLE ─────────────────────── */
function initFormatPills() {
  document.querySelectorAll('.format-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('.format-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
    });
  });
}

/* ── INIT ALL ───────────────────────────────── */
// Cursor + nav boot on DOMContentLoaded
// Lenis is booted from index.js AFTER the intro animation
document.addEventListener('DOMContentLoaded', () => {
  initCursor();
  initNavbar();
  initReveal();
  initDragScroll('.templates-scroll');
  initFormatPills();
});
