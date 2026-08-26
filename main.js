import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

let scene, camera, renderer;
let currentPage = 'home';
const pages = ["home", "notebook", "about", "contact", "cv"];
let selectedPageIndex = 0;

let stars = null;
let blackHole = null;

// اجزای پورتال‌گان
let portalGun = null;
let portalDial = null;
let portalScreen = null;

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
    camera.position.set(-30, 20, 100);

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

    window.addEventListener('resize', onWindowResize);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);

    if (stars) stars.rotation.y += 0.0005;
    if (blackHole) blackHole.rotation.z += 0.002;

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
    blackHole = addBlackHole();

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

function addBlackHole() {
    const geometry = new THREE.RingGeometry(1.2, 2.5, 64);
    const material = new THREE.MeshBasicMaterial({
        color: 0x00ff88,
        side: THREE.DoubleSide
    });

    const ring = new THREE.Mesh(geometry, material);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(0, -1, -2);

    scene.add(ring);

    return ring;
}

// ---------- پورتال‌گان مبتنی بر مدل GLB ----------

function loadPortalGun() {
    const loader = new GLTFLoader();

    loader.load('assets/models/portal_gun_rick_and_morty.glb', (gltf) => {
        portalGun = gltf.scene;

        // اندازه مناسب
        portalGun.scale.set(0.45, 0.45, 0.45);

        // قرار گرفتن در پایین صفحه
        portalGun.position.set(0, -1.2, 0);

        // جهت رو به جلو مثل عکس
        portalGun.rotation.set(0.1, -1.5, 0);

        scene.add(portalGun);

        addPortalGunParts(portalGun);
    });
}

function addPortalGunParts(model) {

    // 1) انتخاب دقیق صفحهٔ قرمز روی بدنه
    model.traverse((child) => {
        if (!child.isMesh) return;

        if (child.name === "Body15_Paint_-_Enamel_Glossy_(Red)_0") {
            // صفحهٔ قرمز اصلی
            portalScreen = child;

            // متریال را clone می‌کنیم تا فقط همین بخش تحت‌تأثیر متن باشد
            portalScreen.material = portalScreen.material.clone();
        }

        // اگر بخش‌های سبز پایه مزاحم‌اند، می‌توانیم مخفی‌شان کنیم:
        if (
            child.name === "Body8_Paint_-_Enamel_Glossy_(Green)_0" ||
            child.name === "Body9_Paint_-_Enamel_Glossy_(Green)_0" ||
            child.name === "Body10_Paint_-_Enamel_Glossy_(Green)_0" ||
            child.name === "Body28_Paint_-_Enamel_Glossy_(Green)_(1)_0"
        ) {
            // اگر می‌خواهی پایه سبز حذف شود:
            // child.visible = false;
        }
    });

    // 2) دکمهٔ گرد سیاه روی بدنه (مخفی ولی قابل کلیک)
    const dialGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.06, 32);
    const dialMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
    const dial = new THREE.Mesh(dialGeo, dialMat);

    dial.rotation.x = Math.PI / 2;
    dial.position.set(-0.25, -0.12, 0.25); // با چشم می‌تونی ریز تنظیمش کنی
    model.add(dial);
    portalDial = dial;

    setupDialInteraction();
    updateScreenText("HOME");
}


function setupDialInteraction() {
    window.addEventListener("click", (event) => {

        // محاسبهٔ برخورد کلیک با دکمهٔ سیاه
        const mouse = new THREE.Vector2(
            (event.clientX / window.innerWidth) * 2 - 1,
            -(event.clientY / window.innerHeight) * 2 + 1
        );

        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, camera);

        const intersects = raycaster.intersectObject(portalDial);

        if (intersects.length === 0) return;

        selectedPageIndex = (selectedPageIndex + 1) % pages.length;

        portalDial.rotation.z += Math.PI / 3;

        updateScreenText(pages[selectedPageIndex]);
    });
}

function updateScreenText(text) {
    if (!portalScreen) return;

    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 128;

    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "red";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "black";
    ctx.font = "bold 40px Arial";
    ctx.textAlign = "center";
    ctx.fillText(text.toUpperCase(), canvas.width / 2, canvas.height / 2 + 15);

    const texture = new THREE.CanvasTexture(canvas);
    portalScreen.material.map = texture;
    portalScreen.material.needsUpdate = true;
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
