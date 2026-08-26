let scene, camera, renderer;
let currentPage = 'home';

init();
animate();

function init() {
    const canvas = document.getElementById('webgl-canvas');

    // صحنه
    scene = new THREE.Scene();

    // دوربین
    camera = new THREE.PerspectiveCamera(
        60,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );
    camera.position.set(0, 0, 5);

    // رندرر
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);

    // پس‌زمینهٔ صفحه home (فعلاً یک رنگ، بعداً عکس فضا)
    setHomeScene();

    // لیسنر برای دکمه‌های منو
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
    renderer.render(scene, camera);
}

// تغییر صفحه
function changePage(page) {
    currentPage = page;
    // پاک کردن صحنه قبلی
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

// صفحه home
function setHomeScene() {
    // پس‌زمینه ساده، بعداً عکس فضا و سیاه‌چاله اضافه می‌کنیم
    const geometry = new THREE.SphereGeometry(1, 32, 32);
    const material = new THREE.MeshBasicMaterial({ color: 0x00ff88, wireframe: true });
    const sphere = new THREE.Mesh(geometry, material);
    scene.add(sphere);
}

// صفحه notebook
function setNotebookScene() {
    const geometry = new THREE.BoxGeometry(1.5, 1, 0.1);
    const material = new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true });
    const book = new THREE.Mesh(geometry, material);
    scene.add(book);
}

// صفحات دیگر فعلاً placeholder
function setPlaceholderScene(pageName) {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshBasicMaterial({ color: 0x3333ff, wireframe: true });
    const cube = new THREE.Mesh(geometry, material);
    scene.add(cube);
}
