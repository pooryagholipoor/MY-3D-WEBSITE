let scene, camera, renderer;
let currentPage = 'home';

let stars = null;
let blackHole = null;

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
    camera.position.set(0, 0, 5);

    renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);

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

    scene.background = null; // مهم

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
