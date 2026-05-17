// ==========================================
// PROJECT SALSETTE : PHYSICS & ANIMATION CORE
// ==========================================

gsap.registerPlugin(ScrollTrigger);

// ------------------------------------------
// 1. NEURAL FLUID DYNAMICS (THREE.JS)
// ------------------------------------------
const canvas = document.getElementById('webgl-canvas');
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0xffffff, 0.015);

// Position camera dynamically to frame the typography
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 12, 28);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    alpha: true,
    antialias: true
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(0xffffff, 0); // Absolute transparency

// Shaders
const vertexShader = `
    uniform float uTime;
    uniform vec3 uMousePos;
    uniform float uRippleTime;
    uniform vec2 uRippleCenter;
    varying float vElevation;
    varying vec3 vViewPosition;
    varying vec3 vNormal;

    // Classic Perlin 3D Noise by Stefan Gustavson
    vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
    vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}
    vec3 fade(vec3 t) {return t*t*t*(t*(t*6.0-15.0)+10.0);}
    
    float cnoise(vec3 P){
        vec3 Pi0 = floor(P); 
        vec3 Pi1 = Pi0 + vec3(1.0); 
        Pi0 = mod(Pi0, 289.0);
        Pi1 = mod(Pi1, 289.0);
        vec3 Pf0 = fract(P); 
        vec3 Pf1 = Pf0 - vec3(1.0); 
        vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x);
        vec4 iy = vec4(Pi0.y, Pi0.y, Pi1.y, Pi1.y);
        vec4 iz0 = Pi0.z * vec4(1.0);
        vec4 iz1 = Pi1.z * vec4(1.0);
        
        vec4 ixy = permute(permute(ix) + iy);
        vec4 ixy0 = permute(ixy + iz0);
        vec4 ixy1 = permute(ixy + iz1);
        
        vec4 gx0 = ixy0 / 7.0;
        vec4 gy0 = fract(floor(gx0) / 7.0) - 0.5;
        gx0 = fract(gx0);
        vec4 gz0 = vec4(0.5) - abs(gx0) - abs(gy0);
        vec4 sz0 = step(gz0, vec4(0.0));
        gx0 -= sz0 * (step(0.0, gx0) - 0.5);
        gy0 -= sz0 * (step(0.0, gy0) - 0.5);
        
        vec4 gx1 = ixy1 / 7.0;
        vec4 gy1 = fract(floor(gx1) / 7.0) - 0.5;
        gx1 = fract(gx1);
        vec4 gz1 = vec4(0.5) - abs(gx1) - abs(gy1);
        vec4 sz1 = step(gz1, vec4(0.0));
        gx1 -= sz1 * (step(0.0, gx1) - 0.5);
        gy1 -= sz1 * (step(0.0, gy1) - 0.5);
        
        vec3 g000 = vec3(gx0.x,gy0.x,gz0.x);
        vec3 g100 = vec3(gx0.y,gy0.y,gz0.y);
        vec3 g010 = vec3(gx0.z,gy0.z,gz0.z);
        vec3 g110 = vec3(gx0.w,gy0.w,gz0.w);
        vec3 g001 = vec3(gx1.x,gy1.x,gz1.x);
        vec3 g101 = vec3(gx1.y,gy1.y,gz1.y);
        vec3 g011 = vec3(gx1.z,gy1.z,gz1.z);
        vec3 g111 = vec3(gx1.w,gy1.w,gz1.w);
        
        vec4 norm0 = taylorInvSqrt(vec4(dot(g000, g000), dot(g010, g010), dot(g100, g100), dot(g110, g110)));
        g000 *= norm0.x;
        g010 *= norm0.y;
        g100 *= norm0.z;
        g110 *= norm0.w;
        vec4 norm1 = taylorInvSqrt(vec4(dot(g001, g001), dot(g011, g011), dot(g101, g101), dot(g111, g111)));
        g001 *= norm1.x;
        g011 *= norm1.y;
        g101 *= norm1.z;
        g111 *= norm1.w;
        
        float n000 = dot(g000, Pf0);
        float n100 = dot(g100, vec3(Pf1.x, Pf0.yz));
        float n010 = dot(g010, vec3(Pf0.x, Pf1.y, Pf0.z));
        float n110 = dot(g110, vec3(Pf1.xy, Pf0.z));
        float n001 = dot(g001, vec3(Pf0.xy, Pf1.z));
        float n101 = dot(g101, vec3(Pf1.x, Pf0.y, Pf1.z));
        float n011 = dot(g011, vec3(Pf0.x, Pf1.yz));
        float n111 = dot(g111, Pf1);
        
        vec3 fade_xyz = fade(Pf0);
        vec4 n_z = mix(vec4(n000, n100, n010, n110), vec4(n001, n101, n011, n111), fade_xyz.z);
        vec2 n_yz = mix(n_z.xy, n_z.zw, fade_xyz.y);
        float n_xyz = mix(n_yz.x, n_yz.y, fade_xyz.x); 
        return 2.2 * n_xyz;
    }

    float getNoiseHeight(vec2 p, float time) {
        float scale = 0.08;
        vec3 noisePos = vec3(p.x * scale, p.y * scale, time * 0.2);
        float h = cnoise(noisePos) * 2.5;
        
        // Mouse repulsion
        float distanceToMouse = distance(p, uMousePos.xz);
        h += exp(-distanceToMouse * distanceToMouse * 0.02) * 5.0;
        
        // Ripple
        if (uRippleTime > 0.0) {
            float dist = distance(p, uRippleCenter);
            float ripplePhase = dist - (uRippleTime * 150.0);
            float rippleAmplitude = exp(-dist * 0.05) * exp(-uRippleTime * 3.0) * 15.0;
            h += sin(ripplePhase * 0.2) * rippleAmplitude;
        }
        return h;
    }

    void main() {
        vec3 newPosition = position;
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        
        float h = getNoiseHeight(worldPosition.xz, uTime);
        newPosition.z = h;
        
        // Compute numerical normal
        float epsilon = 0.1;
        float hx = getNoiseHeight(worldPosition.xz + vec2(epsilon, 0.0), uTime);
        float hz = getNoiseHeight(worldPosition.xz + vec2(0.0, epsilon), uTime);
        
        vec3 tx = vec3(epsilon, 0.0, hx - h);
        vec3 tz = vec3(0.0, epsilon, hz - h);
        vec3 normal = normalize(cross(tx, tz));
        vNormal = normalMatrix * normal;
        
        vElevation = h;
        
        vec4 mvPosition = modelViewMatrix * vec4(newPosition, 1.0);
        vViewPosition = -mvPosition.xyz;
        
        gl_Position = projectionMatrix * mvPosition;
    }
`;

const fragmentShader = `
    uniform float uTime;
    varying float vElevation;
    varying vec3 vViewPosition;
    varying vec3 vNormal;
    
    vec3 palette( in float t, in vec3 a, in vec3 b, in vec3 c, in vec3 d ) {
        return a + b*cos( 6.28318*(c*t+d) );
    }
    
    void main() {
        vec3 normal = normalize(vNormal);
        vec3 viewDir = normalize(vViewPosition);
        vec3 lightDir = normalize(vec3(0.0, 10.0, 5.0));
        
        // Ambient Occlusion / Shadow (Darken valleys, brighten peaks)
        float shadow = smoothstep(-4.0, 3.5, vElevation);
        shadow = mix(0.1, 1.0, shadow); 
        
        // Oil slick color shift based on time, elevation, and normal
        float colorFactor = vElevation * 0.08 + dot(normal, vec3(0.0, 0.0, 1.0)) * 0.4 + uTime * 0.06;
        vec3 oilColor = palette(colorFactor, 
            vec3(0.5, 0.5, 0.5), 
            vec3(0.5, 0.5, 0.5), 
            vec3(1.0, 1.0, 1.0), 
            vec3(0.0, 0.33, 0.67)
        );
        
        // Specular shine (Blinn-Phong)
        vec3 halfDir = normalize(lightDir + viewDir);
        float specAngle = max(dot(normal, halfDir), 0.0);
        float specular = pow(specAngle, 64.0) * 1.8; // Shiny specular highlights
        
        // Fresnel reflection (edges glow more for liquid glass feel)
        float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 4.0);
        
        // Combine lighting and color
        vec3 finalColor = oilColor * (0.4 + 0.6 * shadow) + vec3(specular);
        
        // Liquidy transparency
        float alpha = mix(0.18, 0.75, fresnel);
        alpha *= (0.3 + 0.7 * shadow); // Extra transparency in valleys
        
        gl_FragColor = vec4(finalColor, alpha);
    }
`;

// Create the highly detailed plane (Neural Topography) - SUBDIVIDED FOR EXTREME DETAIL
const planeGeometry = new THREE.PlaneGeometry(120, 120, 280, 280);

// Add Prismatic Spectrum Colors (ROYGBIV)
const colors = [
    new THREE.Color(0xff0000), // Red
    new THREE.Color(0xff7f00), // Orange
    new THREE.Color(0xffff00), // Yellow
    new THREE.Color(0x00ff00), // Green
    new THREE.Color(0x0000ff), // Blue
    new THREE.Color(0x4b0082), // Indigo
    new THREE.Color(0x9400d3)  // Violet
];

const vertexCount = planeGeometry.attributes.position.count;
const colorArray = new Float32Array(vertexCount * 3);

for (let i = 0; i < vertexCount; i++) {
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    colorArray[i * 3] = randomColor.r;
    colorArray[i * 3 + 1] = randomColor.g;
    colorArray[i * 3 + 2] = randomColor.b;
}

planeGeometry.setAttribute('aColor', new THREE.BufferAttribute(colorArray, 3));

const shaderMaterial = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
        uTime: { value: 0 },
        uMousePos: { value: new THREE.Vector3(0, -1000, 0) }, // Start mouse far away
        uRippleTime: { value: 0.0 },
        uRippleCenter: { value: new THREE.Vector2(0, 0) }
    },
    transparent: true,
    wireframe: true,
    vertexColors: true,
    depthWrite: false,
    blending: THREE.NormalBlending
});

const fluidMesh = new THREE.Mesh(planeGeometry, shaderMaterial);
fluidMesh.rotation.x = -Math.PI * 0.5; // Lay flat
fluidMesh.position.y = -4; // Shift down slightly
scene.add(fluidMesh);

// ------------------------------------------
// 1.5 HYPER-REALISTIC MOUNTAIN RANGE (fBM)
// ------------------------------------------
const mountainGeo = new THREE.PlaneGeometry(200, 100, 256, 256);

const mtnVertexShader = `
    varying vec2 vUv;
    // Classic Perlin 3D Noise
    vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
    vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}
    vec3 fade(vec3 t) {return t*t*t*(t*(t*6.0-15.0)+10.0);}
    
    float cnoise(vec3 P){
        vec3 Pi0 = floor(P); 
        vec3 Pi1 = Pi0 + vec3(1.0); 
        Pi0 = mod(Pi0, 289.0);
        Pi1 = mod(Pi1, 289.0);
        vec3 Pf0 = fract(P); 
        vec3 Pf1 = Pf0 - vec3(1.0); 
        vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x);
        vec4 iy = vec4(Pi0.y, Pi0.y, Pi1.y, Pi1.y);
        vec4 iz0 = Pi0.z * vec4(1.0);
        vec4 iz1 = Pi1.z * vec4(1.0);
        
        vec4 ixy = permute(permute(ix) + iy);
        vec4 ixy0 = permute(ixy + iz0);
        vec4 ixy1 = permute(ixy + iz1);
        
        vec4 gx0 = ixy0 / 7.0;
        vec4 gy0 = fract(floor(gx0) / 7.0) - 0.5;
        gx0 = fract(gx0);
        vec4 gz0 = vec4(0.5) - abs(gx0) - abs(gy0);
        vec4 sz0 = step(gz0, vec4(0.0));
        gx0 -= sz0 * (step(0.0, gx0) - 0.5);
        gy0 -= sz0 * (step(0.0, gy0) - 0.5);
        
        vec4 gx1 = ixy1 / 7.0;
        vec4 gy1 = fract(floor(gx1) / 7.0) - 0.5;
        gx1 = fract(gx1);
        vec4 gz1 = vec4(0.5) - abs(gx1) - abs(gy1);
        vec4 sz1 = step(gz1, vec4(0.0));
        gx1 -= sz1 * (step(0.0, gx1) - 0.5);
        gy1 -= sz1 * (step(0.0, gy1) - 0.5);
        
        vec3 g000 = vec3(gx0.x,gy0.x,gz0.x);
        vec3 g100 = vec3(gx0.y,gy0.y,gz0.y);
        vec3 g010 = vec3(gx0.z,gy0.z,gz0.z);
        vec3 g110 = vec3(gx0.w,gy0.w,gz0.w);
        vec3 g001 = vec3(gx1.x,gy1.x,gz1.x);
        vec3 g101 = vec3(gx1.y,gy1.y,gz1.y);
        vec3 g011 = vec3(gx1.z,gy1.z,gz1.z);
        vec3 g111 = vec3(gx1.w,gy1.w,gz1.w);
        
        vec4 norm0 = taylorInvSqrt(vec4(dot(g000, g000), dot(g010, g010), dot(g100, g100), dot(g110, g110)));
        g000 *= norm0.x;
        g010 *= norm0.y;
        g100 *= norm0.z;
        g110 *= norm0.w;
        vec4 norm1 = taylorInvSqrt(vec4(dot(g001, g001), dot(g011, g011), dot(g101, g101), dot(g111, g111)));
        g001 *= norm1.x;
        g011 *= norm1.y;
        g101 *= norm1.z;
        g111 *= norm1.w;
        
        float n000 = dot(g000, Pf0);
        float n100 = dot(g100, vec3(Pf1.x, Pf0.yz));
        float n010 = dot(g010, vec3(Pf0.x, Pf1.y, Pf0.z));
        float n110 = dot(g110, vec3(Pf1.xy, Pf0.z));
        float n001 = dot(g001, vec3(Pf0.xy, Pf1.z));
        float n101 = dot(g101, vec3(Pf1.x, Pf0.y, Pf1.z));
        float n011 = dot(g011, vec3(Pf0.x, Pf1.yz));
        float n111 = dot(g111, Pf1);
        
        vec3 fade_xyz = fade(Pf0);
        vec4 n_z = mix(vec4(n000, n100, n010, n110), vec4(n001, n101, n011, n111), fade_xyz.z);
        vec2 n_yz = mix(n_z.xy, n_z.zw, fade_xyz.y);
        float n_xyz = mix(n_yz.x, n_yz.y, fade_xyz.x); 
        return 2.2 * n_xyz;
    }

    // 4 Octave fBM
    float fbm(vec3 x) {
        float v = 0.0;
        float a = 0.5;
        vec3 shift = vec3(100.0);
        for (int i = 0; i < 4; ++i) {
            v += a * cnoise(x);
            x = x * 2.0 + shift;
            a *= 0.5;
        }
        return v;
    }

    void main() {
        vUv = uv;
        vec3 newPosition = position;
        
        // Static geographic displacement
        float scale = 0.035;
        float elevation = fbm(vec3(position.x * scale, position.y * scale, 0.0));
        
        // Exaggerate peaks
        elevation = sign(elevation) * pow(abs(elevation), 1.2) * 20.0;
        
        newPosition.z += elevation;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
    }
`;

const mtnFragmentShader = `
    varying vec2 vUv;
    void main() {
        // Output Charcoal Black
        vec3 charcoal = vec3(0.08, 0.08, 0.08);
        
        // The mountain is rotated -Math.PI / 2.2, which means the 'bottom' in UV space corresponds to the near edge.
        // Assuming the bottom of the geometry (vUv.y near 0) blends into the sea.
        // We will fade the opacity to 0 in the bottom 20% (vUv.y < 0.2).
        float alpha = smoothstep(0.0, 0.2, vUv.y);
        
        gl_FragColor = vec4(charcoal, alpha);
    }
`;

const mountainMat = new THREE.ShaderMaterial({
    vertexShader: mtnVertexShader,
    fragmentShader: mtnFragmentShader,
    wireframe: false,
    transparent: true,
    depthWrite: false
});

const mountainMesh = new THREE.Mesh(mountainGeo, mountainMat);
mountainMesh.rotation.x = -Math.PI / 2.2;
mountainMesh.position.y = 8;
mountainMesh.position.z = -40;
scene.add(mountainMesh);

// Mouse Raycasting & Interaction
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2(0, 0);
let targetRepulsionPos = new THREE.Vector3(0, -1000, 0);
let currentRepulsionPos = new THREE.Vector3(0, -1000, 0);
const dummyPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 4); // Match fluid mesh approx height

let isMouseMoving = false;

const customCursor = document.getElementById('custom-cursor');
let cursorX = window.innerWidth / 2;
let cursorY = window.innerHeight / 2;
let currentCursorX = cursorX;
let currentCursorY = cursorY;

const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

if (!isTouchDevice) {
    window.addEventListener('mousemove', (event) => {
        isMouseMoving = true;
        cursorX = event.clientX;
        cursorY = event.clientY;

        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        
        raycaster.setFromCamera(mouse, camera);
        const intersectPoint = new THREE.Vector3();
        raycaster.ray.intersectPlane(dummyPlane, intersectPoint);
        if(intersectPoint) {
            targetRepulsionPos.copy(intersectPoint);
        }
    });
}

window.addEventListener('click', (event) => {
    // Exclude clicks on interactive HTML elements (buttons, links, inputs, interactive cards, modals)
    if (event.target.closest('button, a, input, [onclick], .showcase-glass-panel, #document-modal')) return;

    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const intersectPoint = new THREE.Vector3();
    raycaster.ray.intersectPlane(dummyPlane, intersectPoint);
    
    if (intersectPoint) {
        // Trigger Ripple
        shaderMaterial.uniforms.uRippleCenter.value.set(intersectPoint.x, intersectPoint.z);
        shaderMaterial.uniforms.uRippleTime.value = 0.0;
        gsap.to(shaderMaterial.uniforms.uRippleTime, {
            value: 1.0,
            duration: 2.0,
            ease: "power2.out"
        });
        
        // Scatter 7 particles
        const sphereGeo = new THREE.SphereGeometry(0.3, 8, 8);
        colors.forEach(col => {
            const mat = new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 1 });
            const mesh = new THREE.Mesh(sphereGeo, mat);
            mesh.position.copy(intersectPoint);
            scene.add(mesh);
            
            // Random explosion direction
            const angle = Math.random() * Math.PI * 2;
            const distance = 10 + Math.random() * 15;
            const targetX = intersectPoint.x + Math.cos(angle) * distance;
            const targetZ = intersectPoint.z + Math.sin(angle) * distance;
            const targetY = intersectPoint.y + Math.random() * 10 + 5;
            
            gsap.to(mesh.position, {
                x: targetX,
                y: targetY,
                z: targetZ,
                duration: 1.5,
                ease: "power2.out"
            });
            
            gsap.to(mat, {
                opacity: 0,
                duration: 1.5,
                ease: "power2.in",
                onComplete: () => {
                    scene.remove(mesh);
                    mat.dispose();
                }
            });
        });
    }
});

// Render Loop
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    
    // Custom cursor lerp
    currentCursorX += (cursorX - currentCursorX) * 0.2;
    currentCursorY += (cursorY - currentCursorY) * 0.2;
    if (customCursor) {
        customCursor.style.left = currentCursorX + 'px';
        customCursor.style.top = currentCursorY + 'px';
    }
    
    const elapsedTime = clock.getElapsedTime();
    
    // Smooth mouse interpolation for repulsion
    if(isMouseMoving) {
        currentRepulsionPos.lerp(targetRepulsionPos, 0.08);
    }
    
    // Camera Parallax Smoothing (subtle)
    camera.position.x += (mouse.x * 2.0 - camera.position.x) * 0.05;
    camera.lookAt(0, 0, 0);
    
    shaderMaterial.uniforms.uTime.value = elapsedTime;
    shaderMaterial.uniforms.uMousePos.value.copy(currentRepulsionPos);
    
    // Ambient slow rotation
    fluidMesh.rotation.z = elapsedTime * 0.02;

    renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    
    if (typeof ScrollTrigger !== 'undefined') {
        ScrollTrigger.refresh();
    }
});

// ------------------------------------------
// 2. KINETIC SCROLL TRIGGER (GSAP)
// ------------------------------------------

// Reset visibility before GSAP takes over
gsap.set('.gsap-reveal', { autoAlpha: 0, y: 60 });

const sections = document.querySelectorAll('section');

sections.forEach((section) => {
    const reveals = section.querySelectorAll('.gsap-reveal');
    
    ScrollTrigger.create({
        trigger: section,
        // Trigger earlier: changed from "top 85%" to "top 70%" so it finishes by center
        start: "top 70%", 
        onEnter: () => {
            gsap.to(reveals, {
                autoAlpha: 1,
                y: 0,
                duration: 1.6,
                stagger: 0.15,
                ease: "power4.out", // Heavy, smooth physics curve
                overwrite: "auto"
            });
        }
    });
});

// ------------------------------------------
// 3. LIVE TELEMETRY DAEMON (OPEN-METEO API)
// ------------------------------------------
(function() {
    // Open-Meteo Current Weather endpoint for Mumbai
    const API_URL = 'https://api.open-meteo.com/v1/forecast?latitude=19.0760&longitude=72.8777&current=temperature_2m,precipitation,surface_pressure,wind_speed_10m,relative_humidity_2m';
    
    async function fetchTelemetry() {
        try {
            const response = await fetch(API_URL);
            if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
            
            const data = await response.json();
            const current = data.current;
            
            // Map direct API values
            document.getElementById('live-temp').innerText = current.temperature_2m.toFixed(1);
            document.getElementById('live-precip').innerText = current.precipitation.toFixed(2);
            document.getElementById('live-pressure').innerText = current.surface_pressure.toFixed(1);
            document.getElementById('live-wind').innerText = current.wind_speed_10m.toFixed(1);
            
            const humidity = current.relative_humidity_2m;
            document.getElementById('live-humidity').innerText = humidity;
            
            // Map simulated values based on real ambient data
            const soilMoisture = (humidity * 0.003 + current.precipitation * 0.015).toFixed(3);
            document.getElementById('live-soil').innerText = soilMoisture;
            
            const runoff = (current.precipitation * 0.85).toFixed(2);
            document.getElementById('live-runoff').innerText = runoff;
            
        } catch (error) {
            console.error('Telemetry Fetch Failed:', error);
            
            // Graceful Fallback Protocol: Prevent "NaN" or empty UI elements
            const fallbacks = {
                'live-temp': '32.4',
                'live-precip': '0.00',
                'live-pressure': '1008.2',
                'live-wind': '14.5',
                'live-soil': '0.142',
                'live-runoff': '0.00',
                'live-humidity': '78'
            };
            
            Object.keys(fallbacks).forEach(id => {
                const el = document.getElementById(id);
                // Only inject fallback if the node is in its initial or NaN state
                if (el && (el.innerText === '--' || el.innerText === 'NaN')) {
                    el.innerText = fallbacks[id];
                }
            });
        }
    }

    // Execute immediately on load
    fetchTelemetry();
    
    // Poll exactly every 10,000ms
    setInterval(fetchTelemetry, 10000);
})();

// ------------------------------------------
// 4. SECURE TERMINAL (MARKDOWN MODAL) LOGIC
// ------------------------------------------

const docModal = document.getElementById('document-modal');
const mdContent = document.getElementById('markdown-content');

async function openDocumentModal(filePath) {
    // Show Modal Loading State
    mdContent.innerHTML = '<p class="font-mono text-gray-500 tracking-widest text-center py-32">[ ESTABLISHING SECURE CONNECTION... ]</p>';
    docModal.classList.add('active');
    
    // Disable background scrolling behind the modal
    document.body.style.overflow = 'hidden';

    try {
        let text;
        
        // Try to fetch normally (works under http/https servers or supported browsers)
        try {
            const response = await fetch(filePath);
            if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
            text = await response.text();
        } catch (fetchError) {
            console.warn("Fetch failed, attempting local fallback for file:// protocol:", fetchError);
            
            // Map the filePath to the corresponding embedded script tag id
            let fallbackId = '';
            if (filePath.includes('konkan_aegis_llm_audit.md')) {
                fallbackId = 'asset-konkan-aegis-llm-audit';
            } else if (filePath.includes('PROJECT_ARCHITECTURE.md')) {
                fallbackId = 'asset-project-architecture';
            }
            
            const fallbackEl = document.getElementById(fallbackId);
            if (fallbackEl) {
                text = fallbackEl.textContent;
            } else {
                throw fetchError; // Re-throw if fallback is also missing
            }
        }
        
        // Parse Markdown using Marked.js
        const html = marked.parse(text);
        
        // Inject with slight delay for dramatic loading effect
        setTimeout(() => {
            mdContent.innerHTML = html;
        }, 400);

    } catch (error) {
        console.error('Failed to load document:', error);
        mdContent.innerHTML = '<p class="font-mono text-brand tracking-widest text-center py-32">[ ERROR: REPOSITORY UNREACHABLE ]</p>';
    }
}

function closeDocumentModal() {
    docModal.classList.remove('active');
    
    // Re-enable background scrolling
    document.body.style.overflow = 'auto';
    
    // Clear content after transition ends (prevent visual glitching on close)
    setTimeout(() => {
        mdContent.innerHTML = '';
    }, 400);
}

// Global listener: Close modal on Escape key
window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && docModal.classList.contains('active')) {
        closeDocumentModal();
    }
});

// JSON Document Terminal Loader Function
async function openJsonModal(filePath) {
    // Show Modal Loading State
    mdContent.innerHTML = '<p class="font-mono text-gray-500 tracking-widest text-center py-32">[ ESTABLISHING SECURE CONNECTION... ]</p>';
    docModal.classList.add('active');
    
    // Disable background scrolling behind the modal
    document.body.style.overflow = 'hidden';

    try {
        let data;
        
        // Try to fetch normally (works under http/https servers or supported browsers)
        try {
            const response = await fetch(filePath);
            if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
            data = await response.json();
        } catch (fetchError) {
            console.warn("Fetch failed, attempting local fallback for file:// protocol:", fetchError);
            const fallbackEl = document.getElementById('asset-v7-best-brain-topology');
            if (fallbackEl) {
                data = JSON.parse(fallbackEl.textContent);
            } else {
                throw fetchError; // Re-throw if fallback is also missing
            }
        }
        
        // Escape HTML to prevent injection and rendering issues, wrap in formatted pre/code block
        const formattedJson = JSON.stringify(data, null, 4);
        const escapedJson = formattedJson
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
            
        const html = `<pre class="font-mono text-xs text-green-400 overflow-x-auto p-6 bg-[#0a0a0c] rounded border border-white/10 shadow-inner leading-relaxed select-all">${escapedJson}</pre>`;
        
        // Inject with a micro-delay for realistic secure terminal loading effect
        setTimeout(() => {
            mdContent.innerHTML = html;
        }, 400);

    } catch (error) {
        console.error('Failed to load JSON asset:', error);
        mdContent.innerHTML = '<p class="font-mono text-brand tracking-widest text-center py-32">[ ERROR: SECURE REPOSITORY UNREACHABLE ]</p>';
    }
}
