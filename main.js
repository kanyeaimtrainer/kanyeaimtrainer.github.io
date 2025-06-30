import * as THREE from 'three';

//================================================================//
// CORE SETUP
//================================================================//

let scene, camera, renderer, clock;
let floor, walls, targets = [];
let keys = {};
const playerSpeed = 10.0;
const playerHeight = 1.0;

// Camera/Scope settings
const defaultFov = 75;
const scopedFov = 25;
let isScoped = false;
const scopedSensitivity = 0.4; // 40% of normal sensitivity when scoped

let textureLoader;
const textureFiles = [
    'textures/kanyewest.jpeg',
    'textures/yeahbear.png',
];
let loadedTextures = [];

// HUD Elements
let weaponImg;
let scopeOverlay;


// Initialize the scene
function init() {
    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb); // Sky blue background

    // Camera
    camera = new THREE.PerspectiveCamera(defaultFov, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, playerHeight, 5); // Start position

    // Renderer
    const canvas = document.getElementById('game-canvas');
    renderer = new THREE.WebGLRenderer({ canvas: canvas });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true; // Enable shadows

    // Clock
    clock = new THREE.Clock();

    // Get HUD elements
    weaponImg = document.getElementById('weapon-img');
    scopeOverlay = document.getElementById('scope-overlay');

    textureLoader = new THREE.TextureLoader();
    textureFiles.forEach(file => {
        const texture = textureLoader.load(file);
        loadedTextures.push(texture);
    });

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(5, 10, 7.5);
    dirLight.castShadow = true;
    scene.add(dirLight);

    //================================================================//
    // WORLD CREATION
    //================================================================//

    // Floor
    const floorGeometry = new THREE.PlaneGeometry(30, 30);
    const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x4a4a4a });
    floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Walls
    walls = createWalls();
    walls.forEach(wall => scene.add(wall));

    // Targets
    for (let i = 0; i < 5; i++) {
        createTarget();
    }
}

// Create walls for the arena
function createWalls() {
    const wallGeometry = new THREE.BoxGeometry(30, 5, 0.5);
    const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x888888 });
    const wallsArray = [];

    const wall1 = new THREE.Mesh(wallGeometry, wallMaterial);
    wall1.position.set(0, 2.5, -15);
    wall1.castShadow = true;
    wall1.receiveShadow = true;
    wallsArray.push(wall1);

    const wall2 = new THREE.Mesh(wallGeometry, wallMaterial);
    wall2.position.set(0, 2.5, 15);
    wall2.castShadow = true;
    wall2.receiveShadow = true;
    wallsArray.push(wall2);
    
    const wall3 = new THREE.Mesh(wallGeometry, wallMaterial);
    wall3.position.set(15, 2.5, 0);
    wall3.rotation.y = Math.PI / 2;
    wall3.castShadow = true;
    wall3.receiveShadow = true;
    wallsArray.push(wall3);

    const wall4 = new THREE.Mesh(wallGeometry, wallMaterial);
    wall4.position.set(-15, 2.5, 0);
    wall4.rotation.y = Math.PI / 2;
    wall4.castShadow = true;
    wall4.receiveShadow = true;
    wallsArray.push(wall4);

    return wallsArray;
}

// Create a new target at a random position
function createTarget() {
    const targetGeometry = new THREE.SphereGeometry(0.5, 32, 32);

    const randomIndex = Math.floor(Math.random() * loadedTextures.length);
    const randomTexture = loadedTextures[randomIndex];

    const targetMaterial = new THREE.MeshStandardMaterial({ map: randomTexture });
    const target = new THREE.Mesh(targetGeometry, targetMaterial);

    target.position.x = Math.random() * 28 - 14;
    target.position.z = Math.random() * 28 - 14;
    target.position.y = Math.random() * 4 + 1; // Random height
    target.castShadow = true;
    target.receiveShadow = true;
    
    targets.push(target);
    scene.add(target);
}

//================================================================//
// PLAYER CONTROLS
//================================================================//

// Lock the pointer (mouse) for FPS controls
document.body.addEventListener('click', () => {
    document.body.requestPointerLock();
});

// Listen for key presses
document.addEventListener('keydown', (event) => {
    keys[event.key.toLowerCase()] = true;
});
document.addEventListener('keyup', (event) => {
    keys[event.key.toLowerCase()] = false;
});

// Listen for mouse movement
let euler = new THREE.Euler(0, 0, 0, 'YXZ');
const baseSensitivity = 0.002;
document.addEventListener('mousemove', (event) => {
    if (document.pointerLockElement === document.body) {
        const currentSensitivity = isScoped ? baseSensitivity * scopedSensitivity : baseSensitivity;
        euler.y -= event.movementX * currentSensitivity;
        euler.x -= event.movementY * currentSensitivity;
        euler.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, euler.x)); // Clamp vertical rotation
        camera.quaternion.setFromEuler(euler);
    }
});

// Update player position based on keys pressed
function updatePlayer(deltaTime) {
    let moveDirection = new THREE.Vector3();
    let forward = new THREE.Vector3();
    let right = new THREE.Vector3();

    camera.getWorldDirection(forward);
    right.crossVectors(camera.up, forward).normalize();

    if (keys['w']) moveDirection.add(forward);
    if (keys['s']) moveDirection.sub(forward);
    if (keys['a']) moveDirection.add(right);
    if (keys['d']) moveDirection.sub(right);

    moveDirection.y = 0; // Prevent flying
    moveDirection.normalize();

    if (moveDirection.length() > 0 && !isScoped) { // Don't show bobbing while scoped
        // Weapon bobbing animation
        if (!weaponImg.classList.contains('walking')) {
            weaponImg.classList.add('walking');
        }
        
        const moveStep = moveDirection.multiplyScalar(playerSpeed * deltaTime);
        
        // Basic collision detection
        const newPosition = camera.position.clone().add(moveStep);
        if (!isColliding(newPosition)) {
            camera.position.add(moveStep);
        }
    } else {
        // Stop weapon bobbing animation
        if (weaponImg.classList.contains('walking')) {
            weaponImg.classList.remove('walking');
        }
    }
}

// Check for collision with walls
function isColliding(position) {
    const playerBox = new THREE.Box3().setFromCenterAndSize(position, new THREE.Vector3(1, playerHeight, 1));
    for (let wall of walls) {
        const wallBox = new THREE.Box3().setFromObject(wall);
        if (playerBox.intersectsBox(wallBox)) {
            return true;
        }
    }
    return false;
}

//================================================================//
// SHOOTING & SCOPING MECHANIC
//================================================================//

// Prevent context menu on right-click
document.addEventListener('contextmenu', event => event.preventDefault());

document.addEventListener('mousedown', (event) => {
    if (document.pointerLockElement === document.body) {
        if (event.button === 0) { // Left click
            shoot();
        } else if (event.button === 2) { // Right click
            toggleScope();
        }
    }
});

function toggleScope() {
    isScoped = !isScoped;
    document.body.classList.toggle('scoped-in');

    if (isScoped) {
        camera.fov = scopedFov;
    } else {
        camera.fov = defaultFov;
    }
    // IMPORTANT: Update projection matrix after changing FOV
    camera.updateProjectionMatrix();
}

function shoot() {
    // Weapon recoil animation (only if not scoped)
    if (!isScoped) {
        weaponImg.classList.add('recoil');
        setTimeout(() => {
            weaponImg.classList.remove('recoil');
        }, 150);
    }

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera({ x: 0, y: 0 }, camera); // Fire from center of the screen

    const intersects = raycaster.intersectObjects(targets);

    if (intersects.length > 0) {
        const hitTarget = intersects[0].object;
        
        // Remove the target
        scene.remove(hitTarget);
        targets = targets.filter(t => t !== hitTarget);

        // Respawn a new target after a delay
        setTimeout(createTarget, 1000); 
    }
}

//================================================================//
// GAME LOOP
//================================================================//

function animate() {
    requestAnimationFrame(animate);

    const deltaTime = clock.getDelta();
    updatePlayer(deltaTime);

    renderer.render(scene, camera);
}

//================================================================//
// EVENT LISTENERS & INITIALIZATION
//================================================================//

// Handle window resizing
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Start the game
init();
animate();