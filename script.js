/**
 * Night — Main interactions
 * Native scroll · GSAP/ScrollTrigger reveals · 3D bubble tilt ·
 * showcase triggers · terminal simulation.
 * Everything is feature-guarded so the page still works if a CDN lib fails.
 */
(function () {
    'use strict';

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const finePointer = window.matchMedia('(pointer: fine)').matches;

    /* ---- Preloader -------------------------------------------------------*/
    function hideLoader() { document.body.classList.add('loaded'); }
    window.addEventListener('load', hideLoader);
    setTimeout(hideLoader, 1800);   // safety net if load is slow

    /* ---- Anchor links — native scroll with header offset ----------------*/
    document.querySelectorAll('a[href^="#"]').forEach((a) => {
        a.addEventListener('click', (e) => {
            const id = a.getAttribute('href');
            if (!id || id.length < 2) return;
            const target = document.querySelector(id);
            if (!target) return;
            e.preventDefault();
            const y = target.getBoundingClientRect().top + window.scrollY - 76;
            window.scrollTo({ top: Math.max(0, y), behavior: reduced ? 'auto' : 'smooth' });
        });
    });

    /* ---- Header state + scroll progress ---------------------------------*/
    const header = document.getElementById('header');
    const progress = document.getElementById('scrollProgress');
    function onScroll() {
        const y = window.scrollY;
        if (header) header.classList.toggle('scrolled', y > 40);
        if (progress) {
            const h = document.documentElement.scrollHeight - window.innerHeight;
            progress.style.width = (h > 0 ? (y / h) * 100 : 0) + '%';
        }
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    /* ---- Mobile nav ------------------------------------------------------*/
    const navToggle = document.getElementById('navToggle');
    const navLinks = document.getElementById('navLinks');
    if (navToggle && navLinks) {
        const spans = navToggle.querySelectorAll('span');
        const setBars = (open) => {
            spans[0].style.transform = open ? 'rotate(45deg) translate(5px, 5px)' : '';
            spans[1].style.opacity = open ? '0' : '';
            spans[2].style.transform = open ? 'rotate(-45deg) translate(5px, -5px)' : '';
        };
        navToggle.addEventListener('click', () => setBars(navLinks.classList.toggle('open')));
        navLinks.querySelectorAll('.nav-link').forEach((l) =>
            l.addEventListener('click', () => { navLinks.classList.remove('open'); setBars(false); }));
    }

    /* ---- Feature card 3D tilt + cursor shine ----------------------------*/
    if (!reduced && finePointer) {
        document.querySelectorAll('.tilt').forEach((card) => {
            const MAX = 9;   // degrees — grid ancestor supplies the perspective
            card.addEventListener('pointermove', (e) => {
                const r = card.getBoundingClientRect();
                const px = (e.clientX - r.left) / r.width;
                const py = (e.clientY - r.top) / r.height;
                card.style.setProperty('--ry', ((px - 0.5) * MAX * 2).toFixed(2) + 'deg');
                card.style.setProperty('--rx', (-(py - 0.5) * MAX * 2).toFixed(2) + 'deg');
                card.style.setProperty('--mx', (px * 100).toFixed(1) + '%');
                card.style.setProperty('--my', (py * 100).toFixed(1) + '%');
                card.style.transform =
                    'translateY(-8px) rotateX(var(--rx)) rotateY(var(--ry)) scale(1.03)';
            });
            card.addEventListener('pointerleave', () => { card.style.transform = ''; });
        });
    }

    /* ---- GSAP animations -------------------------------------------------*/
    if (window.gsap) {
        const gsap = window.gsap;
        if (window.ScrollTrigger) gsap.registerPlugin(window.ScrollTrigger);
        const ST = window.ScrollTrigger;

        /* Hero title — per-character reveal */
        const title = document.querySelector('.hero-title[data-split]');
        if (title) {
            const text = title.textContent.trim();
            title.innerHTML = text.split('').map((c) => `<span class="char">${c}</span>`).join('');
            const chars = title.querySelectorAll('.char');
            gsap.set(chars, { yPercent: reduced ? 0 : 90, opacity: 0 });
            gsap.to(chars, { yPercent: 0, opacity: 1, duration: 1.1, ease: 'expo.out', stagger: 0.06, delay: 0.35 });
        }

        /* Hero intro */
        gsap.from('.hero-badge', { y: 20, opacity: 0, duration: 1, ease: 'power3.out', delay: 0.2 });
        gsap.from('.hero-subtitle', { y: 20, opacity: 0, duration: 1, ease: 'power3.out', delay: 0.7 });
        gsap.from('.hero-cta-wrapper', { y: 20, opacity: 0, duration: 1, ease: 'power3.out', delay: 0.9 });

        if (ST) {
            /* Generic reveals */
            gsap.utils.toArray('.gs-reveal').forEach((el) => {
                gsap.from(el, {
                    y: 36, opacity: 0, duration: 1.1, ease: 'power3.out',
                    scrollTrigger: { trigger: el, start: 'top 88%', toggleActions: 'play none none reverse' },
                });
            });

            /* Bubble stagger */
            gsap.from('.gs-feature', {
                y: 40, opacity: 0, scale: 0.8, duration: 1, stagger: 0.08, ease: 'back.out(1.6)',
                scrollTrigger: { trigger: '.bubbles', start: 'top 84%', toggleActions: 'play none none reverse' },
            });

            /* Showcase — interactive (no pin: keeps scrolling smooth) */
            const triggers = document.querySelectorAll('.showcase-triggers li');
            const mockup = document.querySelector('.mockup-container');
            const tilts = [
                'rotateY(-10deg) rotateX(4deg)',
                'rotateY(0deg) rotateX(0deg) scale(1.03)',
                'rotateY(10deg) rotateX(-4deg)',
            ];
            const setActive = (idx) => {
                triggers.forEach((t, i) => t.classList.toggle('active', i === idx));
                if (mockup) mockup.style.transform = tilts[idx];
            };
            triggers.forEach((t, i) => {
                t.addEventListener('click', () => setActive(i));
                t.addEventListener('mouseenter', () => setActive(i));
            });
            setActive(0);
        }
    } else {
        /* No GSAP — ensure content is visible */
        document.querySelectorAll('.gs-reveal, .gs-feature').forEach((el) => { el.style.opacity = 1; });
    }

    /* ---- Terminal simulation --------------------------------------------*/
    (function terminal() {
        const typeBox = document.getElementById('command-typing');
        const chatBox = document.getElementById('chat-simulation');
        const section = document.querySelector('.terminal-section');
        if (!typeBox || !chatBox || !section) return;

        let started = false;
        function run() {
            if (started) return;
            started = true;
            const text = '/play bekya';
            let i = 0;

            const addLine = (html, isBot) => {
                const d = document.createElement('div');
                d.className = 'chat-line' + (isBot ? ' chat-bot' : '');
                d.innerHTML = html;
                chatBox.appendChild(d);
                void d.offsetWidth;
                d.classList.add('show');
                chatBox.scrollTop = chatBox.scrollHeight;
            };

            const iv = setInterval(() => {
                typeBox.textContent += text.charAt(i++);
                if (i >= text.length) {
                    clearInterval(iv);
                    setTimeout(() => {
                        typeBox.textContent = '';
                        addLine('<span style="color:#5a6880">User:</span> <span style="color:#dce8f5">' + text + '</span>', false);
                        setTimeout(() => addLine('<span style="color:#8a9ab8">Finding your track…</span>', true), 700);
                        setTimeout(() => addLine('<strong style="color:#c8d8f0">✔ Now playing — Bekya</strong>', true), 1700);
                    }, 350);
                }
            }, 55);
        }

        if (window.gsap && window.ScrollTrigger) {
            window.ScrollTrigger.create({ trigger: section, start: 'top 45%', once: true, onEnter: run });
        } else {
            const io = new IntersectionObserver((es) => {
                if (es[0].isIntersecting) { run(); io.disconnect(); }
            }, { threshold: 0.2 });
            io.observe(section);
        }
    })();

})();
