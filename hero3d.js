/**
 * Night — 3D Engine
 * A real-time WebGL scene rendered on a single full-viewport, fixed canvas
 * that lives BEHIND the whole page. The chrome "N" logo is a real extruded
 * 3D object that travels to a new position as the visitor scrolls from one
 * section to the next (centre in the hero, to the side further down), over a
 * drifting night-sky particle field with soft bloom.
 *
 * Self-contained ES module. Three.js is resolved through the import map in
 * index.html. Degrades gracefully when WebGL is unavailable or the visitor
 * prefers reduced motion (a static logo is shown instead).
 */

import * as THREE from 'three';
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { LOGO_PATH, LOGO_VIEWBOX } from './logo-path.js';

const canvas = document.getElementById('hero-canvas');

const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isMobile = window.matchMedia('(max-width: 768px)').matches;

/* ---- Capability check ----------------------------------------------------*/
function webglAvailable() {
    try {
        const c = document.createElement('canvas');
        return !!(window.WebGLRenderingContext &&
            (c.getContext('webgl2') || c.getContext('webgl')));
    } catch (e) { return false; }
}

if (!canvas || !webglAvailable() || prefersReduced) {
    document.body.classList.add('no-3d');
} else {
    boot();
}

/* ==========================================================================
   SCENE
   ========================================================================== */
function boot() {
    document.body.classList.add('has-3d');

    const quality = {
        bloom: !isMobile,
        particles: isMobile ? 500 : 1200,
        dpr: Math.min(window.devicePixelRatio || 1, isMobile ? 1.25 : 1.5),
        curveSegments: isMobile ? 6 : 12,
        bevelSegments: isMobile ? 2 : 4,
    };
    const travel = isMobile ? 0 : 1;           // mobile: keep logo centred (content stacks)
    const scaleFactor = isMobile ? 0.85 : 1;   // global size multiplier
    const BAND = 1240;                         // centred layout band width (px)

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x05060b);
    scene.fog = new THREE.FogExp2(0x05060b, 0.085);

    const camera = new THREE.PerspectiveCamera(36, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 0, 8.4);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: !isMobile,
        powerPreference: 'high-performance',
        alpha: false,
    });
    renderer.setPixelRatio(quality.dpr);
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.86;        // softer overall brightness
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    // Visible frustum dimensions on the z=0 plane (for placing the logo by
    // fraction of the screen). Recomputed on resize.
    let halfH = 1, halfW = 1;
    function computeFrustum() {
        halfH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z;
        halfW = halfH * camera.aspect;
    }
    computeFrustum();

    /* ---- Environment for realistic chrome reflections --------------------*/
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

    /* ---- Lighting --------------------------------------------------------*/
    const key = new THREE.DirectionalLight(0xffffff, 1.7);
    key.position.set(4, 6, 6);
    scene.add(key);

    const rim = new THREE.DirectionalLight(0x6f9bff, 2.0);   // cold steel-blue rim
    rim.position.set(-6, 2, -4);
    scene.add(rim);

    const fill = new THREE.DirectionalLight(0xaecbff, 0.6);
    fill.position.set(0, -5, 3);
    scene.add(fill);

    // A roaming highlight that sweeps across the metal as it turns.
    const spark = new THREE.PointLight(0xdae6ff, 9, 24, 2);
    spark.position.set(3, 3, 4);
    scene.add(spark);

    scene.add(new THREE.AmbientLight(0x223047, 0.6));

    /* ---- The 3D logo -----------------------------------------------------*/
    const logo = new THREE.Group();
    scene.add(logo);
    let logoMesh = null;
    buildLogo();

    function buildLogo() {
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${LOGO_VIEWBOX.w} ${LOGO_VIEWBOX.h}"><path d="${LOGO_PATH}"/></svg>`;
        const data = new SVGLoader().parse(svg);
        const shapes = [];
        data.paths.forEach((p) => {
            SVGLoader.createShapes(p).forEach((s) => shapes.push(s));
        });

        const depth = LOGO_VIEWBOX.w * 0.16;
        const geo = new THREE.ExtrudeGeometry(shapes, {
            depth,
            bevelEnabled: true,
            bevelThickness: depth * 0.18,
            bevelSize: LOGO_VIEWBOX.w * 0.012,
            bevelSegments: quality.bevelSegments,
            curveSegments: quality.curveSegments,
            steps: 1,
        });

        // SVG space is Y-down with origin at the top-left → centre it and
        // rotate 180° about X so it stands upright (rigid: normals stay valid).
        geo.center();
        geo.rotateX(Math.PI);
        geo.computeBoundingBox();

        const size = new THREE.Vector3();
        geo.boundingBox.getSize(size);
        const fit = 3.5 / Math.max(size.x, size.y);   // normalise to world units

        const material = new THREE.MeshPhysicalMaterial({
            color: 0xdde7f6,
            metalness: 1.0,
            roughness: 0.34,          // softer, less blown-out reflections
            clearcoat: 0.4,
            clearcoatRoughness: 0.32,
            envMapIntensity: 1.05,
            side: THREE.DoubleSide,
        });

        logoMesh = new THREE.Mesh(geo, material);
        logoMesh.scale.setScalar(fit);
        logo.add(logoMesh);
    }

    /* ---- Section waypoints — where the logo sits per section -------------
       xf / yf are fractions of half the visible frustum (−1..1). scale is the
       group size. The active waypoint is whichever section is nearest the
       centre of the viewport; the logo glides toward it.                   */
    // xf: horizontal position (fraction of half-frustum). flip: number of 180°
    // turns — the logo does a clean horizontal flip on each section change.
    // Logo alternates sides; section content sits on the opposite side.
    // side: which half the section's content occupies. The logo fills the
    // opposite half of a centred BAND, so it stays next to the content on any
    // width. flip: number of 180° turns (a clean horizontal flip per section).
    const anchorDefs = [
        { sel: '.hero',        side: 'center', scale: 1.0,  flip: 0, yf: 0.04 },
        { sel: '#bots',        side: 'left',   contentSel: '#bots .content-left',     scale: 0.56, flip: 1, yf: 0 },
        { sel: '#showcase',    side: 'center', scale: 0.5,  flip: 2, yf: 0 },
        { sel: '#commands',    side: 'right',  contentSel: '#commands .content-right', scale: 0.56, flip: 3, yf: 0 },
        { sel: '.cta-section', side: 'center', scale: 0.82, flip: 4, yf: 0.06 },
    ];
    const anchors = anchorDefs
        .map((a) => ({ ...a, el: document.querySelector(a.sel), contentEl: a.contentSel ? document.querySelector(a.contentSel) : null }))
        .filter((a) => a.el);

    // Start the logo at the hero waypoint immediately.
    logo.scale.setScalar((anchors[0] ? anchors[0].scale : 1) * scaleFactor);

    /* ---- Night-sky particles --------------------------------------------*/
    const stars = buildStars(quality.particles);
    scene.add(stars.points);

    function buildStars(count) {
        const positions = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
            // Distant shell only — no near particles cluttering the foreground.
            const r = 34 + Math.random() * 30;          // far field: 34..64
            const th = Math.random() * Math.PI * 2;
            const ph = Math.acos(2 * Math.random() - 1);
            let z = r * Math.cos(ph);
            if (z > 0) z = -z;                            // keep them away from the camera
            positions[i * 3]     = r * Math.sin(ph) * Math.cos(th);
            positions[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th) * 0.55;
            positions[i * 3 + 2] = z;
        }
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const m = new THREE.PointsMaterial({
            color: 0xcfe0ff,
            size: 0.09,
            sizeAttenuation: true,
            transparent: true,
            opacity: 0.75,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
        });
        return { points: new THREE.Points(g, m) };
    }

    /* ---- Post-processing (bloom) ----------------------------------------*/
    let composer = null;
    if (quality.bloom) {
        try {
            composer = new EffectComposer(renderer);
            composer.addPass(new RenderPass(scene, camera));
            const bloom = new UnrealBloomPass(
                new THREE.Vector2(window.innerWidth, window.innerHeight), 0.22, 0.5, 0.95);
            composer.addPass(bloom);
            composer.addPass(new OutputPass());
            composer.setPixelRatio(quality.dpr);
            composer.setSize(window.innerWidth, window.innerHeight);
        } catch (e) {
            composer = null;   // fall back to direct render
        }
    }

    /* ==========================================================================
       INTERACTION + LOOP
       ========================================================================== */
    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
    let rafId = null;
    const clock = new THREE.Clock();

    window.addEventListener('pointermove', (e) => {
        pointer.tx = (e.clientX / window.innerWidth) * 2 - 1;
        pointer.ty = (e.clientY / window.innerHeight) * 2 - 1;
    }, { passive: true });

    window.addEventListener('deviceorientation', (e) => {
        if (e.gamma == null) return;
        pointer.tx = THREE.MathUtils.clamp(e.gamma / 35, -1, 1);
        pointer.ty = THREE.MathUtils.clamp((e.beta - 45) / 35, -1, 1);
    }, { passive: true });

    document.addEventListener('visibilitychange', () => { if (!document.hidden) start(); });
    window.addEventListener('resize', debounce(onResize, 150));

    function start() {
        if (rafId == null && !document.hidden) {
            clock.getDelta();              // drop the paused interval
            rafId = requestAnimationFrame(tick);
        }
    }

    function onResize() {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        computeFrustum();
        renderer.setSize(window.innerWidth, window.innerHeight, false);
        if (composer) composer.setSize(window.innerWidth, window.innerHeight);
    }

    // Returns the waypoint whose section centre is closest to the viewport centre.
    function activeAnchor() {
        const vc = window.innerHeight * 0.5;
        let best = anchors[0], bestD = Infinity;
        for (const a of anchors) {
            const r = a.el.getBoundingClientRect();
            const d = Math.abs(r.top + r.height * 0.5 - vc);
            if (d < bestD) { bestD = d; best = a; }
        }
        return best;
    }

    function tick() {
        if (document.hidden) { rafId = null; return; }
        rafId = requestAnimationFrame(tick);

        // NOTE: getDelta() advances the clock; read elapsedTime AFTER it
        // (calling getElapsedTime() here would consume the delta → dt≈0).
        const dt = Math.min(clock.getDelta(), 0.05);
        const t = clock.elapsedTime;

        pointer.x += (pointer.tx - pointer.x) * Math.min(dt * 4, 1);
        pointer.y += (pointer.ty - pointer.y) * Math.min(dt * 4, 1);

        // Glide the logo toward the active section's waypoint.
        const a = activeAnchor();
        if (a) {
            let tx = 0;
            if (a.side !== 'center' && a.contentEl) {
                const vw = window.innerWidth;
                const r = a.contentEl.getBoundingClientRect();
                const bandLeft = Math.max(0, (vw - BAND) / 2);
                const bandRight = vw - bandLeft;
                // sit ~42% into the free half, biased toward the content edge
                const centerPx = a.side === 'left'
                    ? r.right + (bandRight - r.right) * 0.5
                    : r.left - (r.left - bandLeft) * 0.5;
                tx = (2 * (centerPx / vw) - 1) * halfW;
            }
            tx = tx * travel + pointer.x * 0.22;
            const ty = a.yf * halfH + Math.sin(t * 0.8) * 0.12 + pointer.y * -0.14;
            const ts = a.scale * scaleFactor;
            const k = Math.min(dt * 2.4, 1);
            logo.position.x += (tx - logo.position.x) * k;
            logo.position.y += (ty - logo.position.y) * k;
            const s = logo.scale.x + (ts - logo.scale.x) * k;
            logo.scale.setScalar(s);
        }

        if (logoMesh && a) {
            // Professional horizontal flip: drive the mesh toward index×180°.
            const flipTarget = a.flip * Math.PI;
            logoMesh.rotation.y += (flipTarget - logoMesh.rotation.y) * Math.min(dt * 1.8, 1);
            // Subtle pointer parallax on the group (composes with the flip).
            const k = Math.min(dt * 3, 1);
            logo.rotation.x += (pointer.y * 0.16 - logo.rotation.x) * k;
            logo.rotation.y += (pointer.x * 0.18 - logo.rotation.y) * k;
            spark.position.x = Math.cos(t * 0.6) * 4.5;
            spark.position.y = Math.sin(t * 0.45) * 3.5;
        }

        stars.points.rotation.y += dt * 0.012;
        stars.points.rotation.x = pointer.y * 0.05;

        if (composer) composer.render();
        else renderer.render(scene, camera);
    }

    start();
    requestAnimationFrame(() => document.body.classList.add('hero-3d-ready'));
}

/* ==========================================================================
   helpers
   ========================================================================== */
function debounce(fn, ms) {
    let id;
    return (...a) => { clearTimeout(id); id = setTimeout(() => fn(...a), ms); };
}
