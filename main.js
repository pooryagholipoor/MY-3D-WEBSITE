import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

let scene, camera, renderer;
let currentPage = 'home';
const pages = ["home", "notebook", "about", "contact", "cv"];
let selectedPageIndex = 0;

let stars = null;

// اجزای پورتال‌گان
let portalGun = null;
let portalScreen = null;
let portalDialMesh = null;

let isMobile = false;

let pulseMesh = null;
let portalOpen = false;
let portalTimeoutId = null;

init();
animate();

function init() {
    const canvas = document.getElementById('webgl-canvas');

    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(
        60,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );

    updateCameraForDevice();

    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);

    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(5, 5, 5);
    scene.add(light);

    const ambient = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambient);

    setHomeScene();

    const nav = document.getElementById('top-nav');
    nav.addEventListener('click', (e) => {
        if (e.target.tagName.toLowerCase() === 'button') {
            const page = e.target.getAttribute('data-page');
            changePage(page);
        }
    });

    window.addEventListener('resize', () => {
        updateCameraForDevice();
        onWindowResize();
    });
}

function updateCameraForDevice() {
    isMobile = window.innerWidth < 768;

    if (isMobile) {
        camera.position.set(-15, 10, 60);
    } else {
        camera.position.set(-30, 20, 100);
    }
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);

    if (stars) stars.rotation.y += 0.0005;

    updatePortalTextPosition();
    updateDialDomPosition();

    renderer.render(scene, camera);
}

function changePage(page) {
    currentPage = page;

    scene.background = null;

    while (scene.children.length > 0) {
        scene.remove(scene.children[0]);
    }

    if (page === 'home') {
        setHomeScene();
    } else if (page === 'notebook') {
        setNotebookScene();
    } else {
        setPlaceholderScene(page);
    }
}

function setHomeScene() {
    const loader = new THREE.TextureLoader();
    const bgTexture = loader.load('assets/images/space_bg.jpg');
    scene.background = bgTexture;

    stars = addStars();

    loadPortalGun();
}

function addStars() {
    const starGeometry = new THREE.BufferGeometry();
    const starCount = 1500;

    const positions = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount * 3; i++) {
        positions[i] = (Math.random() - 0.5) * 600;
    }

    starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const starMaterial = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.15,
        transparent: true
    });

    const stars = new THREE.Points(starGeometry, starMaterial);
    scene.add(stars);

    return stars;
}

// ---------- پورتال‌گان مبتنی بر مدل GLB ----------

function loadPortalGun() {
    const loader = new GLTFLoader();

    loader.load('assets/models/portal_gun_rick_and_morty.glb', (gltf) => {
        portalGun = gltf.scene;

        const scale = isMobile ? 0.25 : 0.45;
        portalGun.scale.set(scale, scale, scale);

        portalGun.position.set(0, -1.2, 0);
        portalGun.rotation.set(0.1, -1.5, 0);

        scene.add(portalGun);

        addPortalGunParts(portalGun);
    });
}

function addPortalGunParts(model) {

    model.traverse((child) => {
        if (!child.isMesh) return;

        // صفحهٔ قرمز واقعی
        if (child.name === "Body15_Paint_-_Enamel_Glossy_(Red)_0") {
            portalScreen = child;
        }

        // دکمهٔ سیاه واقعی مدل
        if (child.name === "Body23_Steel_-_Satin_0") {
            portalDialMesh = child;
        }
    });

    setupDialDomInteraction();
    updatePortalText("HOME");
}

/* -----------------------
   Long-press interaction
   ----------------------- */
function setupDialDomInteraction() {
    const dialDom = document.getElementById("portal-dial-dom");

    let pressTimer = null;

    dialDom.addEventListener("pointerdown", (e) => {
        // prevent text selection / default
        e.preventDefault();

        pressTimer = setTimeout(() => {
            // long press -> fire portal
            handlePortalShot();
            pressTimer = null;
        }, 420); // 420ms long-press threshold
    });

    dialDom.addEventListener("pointerup", (e) => {
        e.preventDefault();
        if (pressTimer) {
            clearTimeout(pressTimer);
            pressTimer = null;
            // short tap -> change text
            selectedPageIndex = (selectedPageIndex + 1) % pages.length;
            updatePortalText(pages[selectedPageIndex]);
        }
    });

    dialDom.addEventListener("pointerleave", () => {
        if (pressTimer) {
            clearTimeout(pressTimer);
            pressTimer = null;
        }
    });
}

/* -----------------------
   Pulse: spinning green sphere
   ----------------------- */
function handlePortalShot() {
    if (!portalGun || portalOpen) return;

    // create a glowing sphere (pulse)
    const geom = new THREE.SphereGeometry(0.9, 32, 32);
    const mat = new THREE.MeshBasicMaterial({
        color: 0x00ff66,
        transparent: true,
        opacity: 1,
        blending: THREE.AdditiveBlending
    });

    pulseMesh = new THREE.Mesh(geom, mat);

    // start position: use dial mesh world position if available, otherwise portalGun
    const startPos = new THREE.Vector3();
    if (portalDialMesh) {
        portalDialMesh.getWorldPosition(startPos);
    } else {
        portalGun.getWorldPosition(startPos);
    }
    // lift a bit so it looks like it's launched from the top
    startPos.y += 0.6;
    startPos.z -= 0.6;

    pulseMesh.position.copy(startPos);
    pulseMesh.scale.set(0.6, 0.6, 0.6);
    scene.add(pulseMesh);

    // end position: a point in front of camera (center of screen) but in world space
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    const endPos = camera.position.clone().add(forward.multiplyScalar(10)); // 10 units in front of camera

    const duration = 420;
    const startTime = performance.now();

    function animatePulse(time) {
        const t = Math.min((time - startTime) / duration, 1);

        // position lerp
        pulseMesh.position.lerpVectors(startPos, endPos, easeOutCubic(t));

        // spin
        pulseMesh.rotation.x += 0.25;
        pulseMesh.rotation.y += 0.35;

        // scale up slightly and fade
        const s = 0.6 + 0.8 * t;
        pulseMesh.scale.set(s, s, s);
        pulseMesh.material.opacity = 1 - t;

        if (t < 1) {
            requestAnimationFrame(animatePulse);
        } else {
            // remove pulse and open portal UI at a screen position slightly above endPos
            scene.remove(pulseMesh);
            pulseMesh = null;

            // compute a screen position slightly above endPos so portal doesn't overlap gun
            const portalAnchor = endPos.clone();
            portalAnchor.y += 0.6;
            openPortalVideoAtWorldPosition(portalAnchor);
        }
    }

    requestAnimationFrame(animatePulse);
}

/* -----------------------
   Open portal video at a world position (so it won't overlap the gun)
   ----------------------- */
function openPortalVideoAtWorldPosition(worldPos) {
    const video = document.getElementById("portal-video");
    if (!video) return;

    portalOpen = true;
    video.currentTime = 0;
    video.play();

    // compute screen coords from worldPos
    const screen = worldToScreen(worldPos, camera);
    // place video centered on that screen point
    const vw = video.offsetWidth || 380;
    const vh = video.offsetHeight || 380;

    // set initial small scale and position
    video.style.left = `${screen.x}px`;
    video.style.top = `${screen.y}px`;
    video.style.transform = `translate(-50%, -50%) scale(0)`;
    video.style.opacity = `0`;
    video.style.display = 'block';

    // animate scale and opacity smoothly to a larger final size
    let scale = 0;
    let opacity = 0;
    const targetScale = 1.25; // final scale multiplier (bigger)
    const duration = 520;
    const startTime = performance.now();

    function animateOpen(time) {
        const t = Math.min((time - startTime) / duration, 1);
        const eased = easeOutCubic(t);

        scale = eased * targetScale;
        opacity = eased;

        video.style.transform = `translate(-50%, -50%) scale(${scale})`;
        video.style.opacity = `${opacity}`;

        if (t < 1) {
            requestAnimationFrame(animateOpen);
        } else {
            // start timeout for auto-close
            portalTimeoutId = setTimeout(() => {
                closePortalVideo();
            }, 15000);
        }
    }

    requestAnimationFrame(animateOpen);

    // click on video -> move camera and change page
    video.onclick = () => {
        clearTimeout(portalTimeoutId);
        moveCameraToPortalAndChangePage(worldPos);
    };
}

/* -----------------------
   Close portal video (scale down)
   ----------------------- */
function closePortalVideo() {
    const video = document.getElementById("portal-video");
    if (!video) return;

    let startScale = parseFloat(getComputedStyle(video).transform.split(',')[0].replace('matrix(', '')) || 1;
    // fallback if parsing fails
    if (!startScale || startScale <= 0) startScale = 1.25;

    const duration = 420;
    const startTime = performance.now();

    function animateClose(time) {
        const t = Math.min((time - startTime) / duration, 1);
        const eased = easeInCubic(1 - t);

        const scale = startScale * eased;
        const opacity = eased;

        video.style.transform = `translate(-50%, -50%) scale(${scale})`;
        video.style.opacity = `${opacity}`;

        if (t < 1) {
            requestAnimationFrame(animateClose);
        } else {
            video.pause();
            video.style.display = 'none';
            portalOpen = false;
        }
    }

    requestAnimationFrame(animateClose);
}

/* -----------------------
   Camera move: from current camera position to a point near the portal worldPos
   with FOV stretch effect
   ----------------------- */
function moveCameraToPortalAndChangePage(portalWorldPos) {
    // portalWorldPos is the world anchor where the portal video opened
    const startPos = camera.position.clone();   // current camera position
    // compute an end position slightly behind the portalWorldPos along camera->portal direction
    const dir = portalWorldPos.clone().sub(startPos).normalize();
    const endPos = portalWorldPos.clone().sub(dir.multiplyScalar(6)); // stop 6 units before portal center

    const startFov = camera.fov;
    const endFov = Math.min(110, startFov + 40); // stretch effect

    const duration = 900;
    const startTime = performance.now();

    function animateCam(time) {
        const t = Math.min((time - startTime) / duration, 1);
        const eased = easeInOutCubic(t);

        camera.position.lerpVectors(startPos, endPos, eased);
        camera.fov = startFov + (endFov - startFov) * (0.6 * eased); // partial FOV change for effect
        camera.updateProjectionMatrix();
        camera.lookAt(portalWorldPos);

        if (t < 1) {
            requestAnimationFrame(animateCam);
        } else {
            // restore FOV smoothly
            const restoreStart = performance.now();
            const restoreDur = 300;
            function restore(time2) {
                const tt = Math.min((time2 - restoreStart) / restoreDur, 1);
                camera.fov = endFov + (startFov - endFov) * easeOutCubic(tt);
                camera.updateProjectionMatrix();
                if (tt < 1) requestAnimationFrame(restore);
                else {
                    // finally change page and close portal
                    changePage(pages[selectedPageIndex]);
                    closePortalVideo();
                }
            }
            requestAnimationFrame(restore);
        }
    }

    requestAnimationFrame(animateCam);
}

/* -----------------------
   Helpers
   ----------------------- */
function worldToScreen(pos, camera) {
    const vector = pos.clone();
    vector.project(camera);

    const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-vector.y * 0.5 + 0.5) * window.innerHeight;
    return { x, y };
}

function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
}
function easeInCubic(t) {
    return t * t * t;
}
function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/* -----------------------
   Portal text & dial DOM positioning
   ----------------------- */
function updatePortalText(text) {
    const div = document.getElementById("portal-text");
    div.innerText = text.toUpperCase();
}

function updatePortalTextPosition() {
    if (!portalScreen) return;

    const vector = new THREE.Vector3();
    portalScreen.getWorldPosition(vector);

    vector.project(camera);

    let x = (vector.x * 0.5 + 0.5) * window.innerWidth;
    let y = (-vector.y * 0.5 + 0.5) * window.innerHeight;

    // fine tuning: move a bit right and down so it sits nicely
    x += 30;   // right
    y += -50;   // down

    const div = document.getElementById("portal-text");
    div.style.left = `${x}px`;
    div.style.top = `${y}px`;
    // slight rotation already in CSS
}

function updateDialDomPosition() {
    if (!portalDialMesh) return;

    const vector = new THREE.Vector3();
    portalDialMesh.getWorldPosition(vector);

    vector.project(camera);

    let x = (vector.x * 0.5 + 0.5) * window.innerWidth;
    let y = (-vector.y * 0.5 + 0.5) * window.innerHeight;

    const dialDom = document.getElementById("portal-dial-dom");

    // offset so the DOM circle sits visually over the model button
    dialDom.style.left = `${x + 15}px`;
    dialDom.style.top = `${y - 20}px`;
}

/* -----------------------
   Placeholder pages
   ----------------------- */
function setNotebookScene() {
    const geometry = new THREE.BoxGeometry(1.5, 1, 0.1);
    const material = new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true });
    const book = new THREE.Mesh(geometry, material);
    scene.add(book);
}

function setPlaceholderScene(pageName) {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshBasicMaterial({ color: 0x3333ff, wireframe: true });
    const cube = new THREE.Mesh(geometry, material);
    scene.add(cube);
}
