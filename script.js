/**
 * Night Bot Rental — Main Script
 * Lenis Smooth Scroll + GSAP ScrollTrigger
 */

/* =============================================
   SMOOTH SCROLL — Lenis
   ============================================= */
const lenis = new Lenis({
    duration: 1.35,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smooth: true,
    smoothTouch: false,
});

function raf(time) {
    lenis.raf(time);
    requestAnimationFrame(raf);
}
requestAnimationFrame(raf);

// Anchor links — smooth scroll via Lenis
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
        const targetId = anchor.getAttribute('href');
        if (targetId === '#') return;
        const target = document.querySelector(targetId);
        if (target) {
            e.preventDefault();
            lenis.scrollTo(target, { offset: -80 });
        }
    });
});

/* =============================================
   HEADER — Scroll State
   ============================================= */
const header = document.getElementById('header');
if (header) {
    window.addEventListener('scroll', () => {
        if (window.scrollY > 40) header.classList.add('scrolled');
        else header.classList.remove('scrolled');
    }, { passive: true });
}

/* =============================================
   MOBILE NAV TOGGLE
   ============================================= */
const navToggle = document.getElementById('navToggle');
const navLinks = document.getElementById('navLinks');

if (navToggle && navLinks) {
    navToggle.addEventListener('click', () => {
        navLinks.classList.toggle('open');
        const spans = navToggle.querySelectorAll('span');
        if (navLinks.classList.contains('open')) {
            spans[0].style.transform = 'rotate(45deg) translate(5px, 5px)';
            spans[1].style.opacity = '0';
            spans[2].style.transform = 'rotate(-45deg) translate(5px, -5px)';
        } else {
            spans[0].style.transform = '';
            spans[1].style.opacity = '';
            spans[2].style.transform = '';
        }
    });

    // Close on nav link click
    navLinks.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
            navLinks.classList.remove('open');
            navToggle.querySelectorAll('span').forEach(s => {
                s.style.transform = ''; s.style.opacity = '';
            });
        });
    });
}

/* =============================================
   GSAP ANIMATIONS
   ============================================= */
gsap.registerPlugin(ScrollTrigger);

// Lenis + ScrollTrigger sync
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add((time) => { lenis.raf(time * 1000); });
gsap.ticker.lagSmoothing(0);

document.addEventListener('DOMContentLoaded', () => {

    /* --- 1. Hero Cinematic Load --- */
    const heroTl = gsap.timeline({ defaults: { ease: 'expo.out' } });

    heroTl
        .to('.flare-swoosh', { left: '220%', duration: 2, ease: 'power3.inOut' }, 0)
        .to('.hero-badge', { opacity: 1, y: 0, duration: 1 }, 0.1)
        .to('.logo-wrapper', { scale: 1, opacity: 1, duration: 2.2 }, 0.2)
        .to('.hero-title', { y: 0, opacity: 1, duration: 1.6 }, 0.5)
        .to('.hero-subtitle', { opacity: 1, y: 0, duration: 1.3 }, 0.8)
        .to('.hero-cta-wrapper', { opacity: 1, y: 0, duration: 1.2 }, 1.0)
        .to('.hero-stats', { opacity: 1, duration: 1.2 }, 1.3)
        .to('.scroll-indicator', { opacity: 1, duration: 1 }, 1.6);

    /* --- 2. Light Beam --- */
    gsap.to('.light-beam', {
        height: '100%',
        ease: 'none',
        scrollTrigger: {
            trigger: 'body',
            start: 'top top',
            end: 'bottom bottom',
            scrub: 0.3,
        }
    });

    /* --- 3. Generic Reveal --- */
    document.querySelectorAll('.gs-reveal').forEach(el => {
        gsap.from(el, {
            y: 36,
            opacity: 0,
            duration: 1.1,
            ease: 'power3.out',
            scrollTrigger: {
                trigger: el,
                start: 'top 88%',
                toggleActions: 'play none none reverse',
            }
        });
    });

    /* --- 4. Feature Cards Stagger --- */
    gsap.from('.gs-feature', {
        y: 50,
        opacity: 0,
        duration: 1.1,
        stagger: 0.1,
        ease: 'expo.out',
        scrollTrigger: {
            trigger: '.features-grid',
            start: 'top 82%',
            toggleActions: 'play none none reverse',
        }
    });

    /* --- 5. Showcase Pinned Scroll --- */
    const showcaseTl = gsap.timeline({
        scrollTrigger: {
            trigger: '#showcase',
            start: 'top top',
            end: '+=2000',
            scrub: 1,
            pin: true,
        }
    });

    const triggers = document.querySelectorAll('.showcase-triggers li');
    const mockupContainer = document.querySelector('.mockup-container');
    const orb = document.querySelector('.showcase-orb');

    showcaseTl.to({}, {
        duration: 1,
        onUpdate: function () {
            const progress = this.progress();

            if (progress < 0.33) {
                setActive(0);
                if (mockupContainer) {
                    mockupContainer.style.transform = `rotateY(${-12 + (progress * 24)}deg) rotateX(4deg) scale(1)`;
                }
                if (orb) orb.style.background = 'radial-gradient(circle, rgba(30,50,90,0.3), transparent 70%)';
            } else if (progress < 0.66) {
                setActive(1);
                if (mockupContainer) {
                    mockupContainer.style.transform = `rotateY(0deg) rotateX(0deg) scale(1.04)`;
                }
                if (orb) orb.style.background = 'radial-gradient(circle, rgba(40,65,120,0.35), transparent 70%)';
            } else {
                setActive(2);
                if (mockupContainer) {
                    mockupContainer.style.transform = `rotateY(${12 - ((progress - 0.66) * 24)}deg) rotateX(-4deg) scale(1.08)`;
                }
                if (orb) orb.style.background = 'radial-gradient(circle, rgba(20,35,75,0.25), transparent 70%)';
            }
        }
    });

    function setActive(idx) {
        triggers.forEach((t, i) => {
            t.classList.toggle('active', i === idx);
        });
    }

    /* --- 6. Terminal Simulation --- */
    let terminalTriggered = false;

    ScrollTrigger.create({
        trigger: '.terminal-section',
        start: 'top 45%',
        onEnter: () => {
            if (!terminalTriggered) {
                terminalTriggered = true;
                runTerminal();
            }
        }
    });

    function runTerminal() {
        const typeBox = document.getElementById('command-typing');
        const chatBox = document.getElementById('chat-simulation');
        if (!typeBox || !chatBox) return;

        const sequence = [
            { cmd: '/play midnight vibes',     delay: 0 },
            { bot: 'Searching catalog...',     delay: 800 },
            { bot: '✔ Track queued at 384kbps', delay: 1800 },
        ];

        const text = sequence[0].cmd;
        let i = 0;

        const typeInterval = setInterval(() => {
            typeBox.textContent += text.charAt(i);
            i++;
            if (i >= text.length) {
                clearInterval(typeInterval);
                setTimeout(() => {
                    typeBox.textContent = '';
                    addLine(`<span style="color:#5a6880">User:</span> <span style="color:#dce8f5">${text}</span>`, false);
                    setTimeout(() => addLine(`<span style="color:#8a9ab8">${sequence[1].bot}</span>`, true), sequence[1].delay);
                    setTimeout(() => addLine(`<strong style="color:#c8d8f0">${sequence[2].bot}</strong>`, true), sequence[2].delay);
                }, 350);
            }
        }, 55);

        function addLine(html, isBot) {
            const div = document.createElement('div');
            div.className = `chat-line${isBot ? ' chat-bot' : ''}`;
            div.innerHTML = html;
            chatBox.appendChild(div);
            void div.offsetWidth;
            div.classList.add('show');
            chatBox.scrollTop = chatBox.scrollHeight;
        }
    }

});
