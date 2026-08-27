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

    renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
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

function handlePortalShot() {
    if (!portalGun || portalOpen) return;

    // 1. ساخت پالس سبز
    const geom = new THREE.CylinderGeometry(0.2, 0.2, 40, 16);
    const mat = new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.8 });
    pulseMesh = new THREE.Mesh(geom, mat);

    pulseMesh.rotation.z = Math.PI / 2;
    pulseMesh.position.copy(portalGun.position);
    pulseMesh.position.y += 2;   // کمی بالاتر از بدنه
    scene.add(pulseMesh);

    // 2. انیمیشن کوتاه پالس
    let t = 0;
    const pulseDuration = 400; // میلی‌ثانیه
    const startTime = performance.now();

    function animatePulse(time) {
        t = (time - startTime) / pulseDuration;
        if (t >= 1) {
            scene.remove(pulseMesh);
            pulseMesh = null;
            openPortalVideo();
            return;
        }

        // حرکت به سمت وسط صفحه (محور z)
        pulseMesh.position.z -= 0.8;
        pulseMesh.material.opacity = 0.8 * (1 - t);

        requestAnimationFrame(animatePulse);
    }

    requestAnimationFrame(animatePulse);
}

function openPortalVideo() {
    const video = document.getElementById("portal-video");
    if (!video) return;

    portalOpen = true;
    video.currentTime = 0;
    video.play();

    let scale = 0;
    let opacity = 0;

    function animateOpen() {
        scale += 0.08;
        opacity += 0.08;

        if (scale >= 1) {
            scale = 1;
            opacity = 1;
        } else {
            requestAnimationFrame(animateOpen);
        }

        video.style.transform = `translate(-50%, -50%) scale(${scale})`;
        video.style.opacity = `${opacity}`;
    }

    animateOpen();

    // کلیک روی پرتال → رفتن به صفحه
    video.onclick = () => {
        moveCameraToPortalAndChangePage();
        clearTimeout(portalTimeoutId);
    };

    // اگر ۱۵ ثانیه کلیک نشد → بسته شود
    portalTimeoutId = setTimeout(() => {
        closePortalVideo();
    }, 15000);
}

function closePortalVideo() {
    const video = document.getElementById("portal-video");
    if (!video) return;

    let scale = 1;
    let opacity = 1;

    function animateClose() {
        scale -= 0.08;
        opacity -= 0.08;

        if (scale <= 0) {
            scale = 0;
            opacity = 0;
            video.pause();
            portalOpen = false;
            video.style.transform = `translate(-50%, -50%) scale(0)`;
            video.style.opacity = `0`;
            return;
        } else {
            requestAnimationFrame(animateClose);
        }

        video.style.transform = `translate(-50%, -50%) scale(${scale})`;
        video.style.opacity = `${opacity}`;
    }

    animateClose();
}

function moveCameraToPortalAndChangePage() {
    const target = new THREE.Vector3(0, 0, 0); // وسط صحنه / پرتال
    const startPos = camera.position.clone();
    const endPos = new THREE.Vector3(0, 0, 20);

    const duration = 800;
    const startTime = performance.now();

    function animateCam(time) {
        const t = Math.min((time - startTime) / duration, 1);

        camera.position.lerpVectors(startPos, endPos, t);
        camera.lookAt(target);

        if (t < 1) {
            requestAnimationFrame(animateCam);
        } else {
            // بعد از رسیدن به پرتال → تغییر صفحه
            changePage(pages[selectedPageIndex]);
            closePortalVideo();
        }
    }

    requestAnimationFrame(animateCam);
}


function setupDialDomInteraction() {
    const dialDom = document.getElementById("portal-dial-dom");

    let lastTapTime = 0;

    dialDom.addEventListener("pointerdown", () => {
        const now = Date.now();

        // دابل‌کلیک / دابل‌تاپ
        if (now - lastTapTime < 300) {
            handlePortalShot();
        } else {
            // کلیک معمولی → تغییر متن
            selectedPageIndex = (selectedPageIndex + 1) % pages.length;
            updatePortalText(pages[selectedPageIndex]);
        }

        lastTapTime = now;
    });
}


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

    // تنظیمات دقیق برای قرارگیری روی بخش قرمز
    x -= -30;   // کمی چپ‌تر
    y -= 45;   // کمی بالاتر

    const div = document.getElementById("portal-text");
    div.style.left = `${x}px`;
    div.style.top = `${y}px`;
}

function updateDialDomPosition() {
    if (!portalDialMesh) return;

    const vector = new THREE.Vector3();
    portalDialMesh.getWorldPosition(vector);

    vector.project(camera);

    let x = (vector.x * 0.5 + 0.5) * window.innerWidth;
    let y = (-vector.y * 0.5 + 0.5) * window.innerHeight;

    const dialDom = document.getElementById("portal-dial-dom");
    dialDom.style.left = `${x + 30}px`;
    dialDom.style.top = `${y - 10}px`;
}

// ---------- صفحات دیگر ----------

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
