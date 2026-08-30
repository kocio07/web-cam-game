import { HandLandmarker, FilesetResolver } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14";

const video = document.getElementById('ekran2');
const canvas = document.getElementById('gra2');
const ctx = canvas.getContext('2d');

let hands = [];
let handLandmarker = null;

let prevFingerX = null;
let prevFingerY = null;
let score = 0;
let bladeTrail = [];

let fruits = [];
let lastSpawn = 0;
let spawnInterval = 1500;

const gravity = 0.25;
const fruitsTxt = ['🍎', '🍊', '🍋', '🍍', '🍓'];

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);

function spawnFruits() {
  const startX = 100 + Math.random() * (canvas.width - 200);
  fruits.push({
    x: startX,
    y: canvas.height + 40,
    vx: (Math.random() - 0.5) * 4,      
    vy: -14 - Math.random() * 4,        
    emoji: fruitsTxt[Math.floor(Math.random() * fruitsTxt.length)],
    radius: 35,
    sliced: false
  });
}

function updateAndDrawFruits() {
  ctx.font = '60px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (let i = fruits.length - 1; i >= 0; i--) {
    const f = fruits[i];
    f.x += f.vx;
    f.y += f.vy;
    f.vy += gravity; 

    ctx.fillText(f.emoji, f.x, f.y);

    
    if (f.y > canvas.height + 100) {
      fruits.splice(i, 1);
    }
  }
}

function lineCircleIntersect(x1, y1, x2, y2, cx, cy, r) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lengthSq = dx * dx + dy * dy;

    if (lengthSq === 0) {
        return Math.hypot(cx - x1, cy - y1) < r;
    }

    let t =  ((cx - x1) * dx + (cy - y1) * dy) / lengthSq;
    t = Math.max(0, Math.min(1, t));

    const closestX = x1 + t * dx;
    const closestY = y1 + t * dy;

    return Math.hypot(cx - closestX, cy - closestY) < r;

    

}

function checkSlice(x1, y1, x2, y2) {
  for (let i = fruits.length - 1; i >= 0; i--) {
    const f = fruits[i];
    if (lineCircleIntersect(x1, y1, x2, y2, f.x, f.y, f.radius)) {
      fruits.splice(i, 1);
      score++;
    }
  }
}

function updateAndDrawBladeTrail() {
  ctx.strokeStyle = 'white';
  ctx.lineWidth = 10;
  ctx.lineCap = 'round';

  for (let i = bladeTrail.length - 1; i >= 1; i--) {
    const p1 = bladeTrail[i];
    const p2 = bladeTrail[i - 1];
    ctx.globalAlpha = i / bladeTrail.length;
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  if (bladeTrail.length > 15) {
    bladeTrail.shift();
  }
}

async function initHandLandmarker() {
  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
  );
  handLandmarker = await HandLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
      delegate: "GPU"
    },
    runningMode: "VIDEO",
    numHands: 1
  });
}

async function initCamera() {
  const stream = await navigator.mediaDevices.getUserMedia({ video: true });
  video.srcObject = stream;
  return new Promise(resolve => {
    video.onloadeddata = () => resolve();
  });
}

function detectHand() {
  if (!handLandmarker || video.readyState < 2) return;

  const result = handLandmarker.detectForVideo(video, performance.now());

  hands = result.landmarks.map(landmarks =>
    landmarks.map(point => ({
      x: (1 - point.x) * canvas.width,
      y: point.y * canvas.height
    }))
  );
}

function loop(now) {
  if (video.readyState >= 2) {
    ctx.save();
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    ctx.restore();
  }

  detectHand();

  if (now - lastSpawn > spawnInterval) {
    spawnFruits();
    lastSpawn = now;
  }


    for (const points of hands) {
    const indexTip = points[8];

    if (prevFingerX !== null) {
      checkSlice(prevFingerX, prevFingerY, indexTip.x, indexTip.y);
    }

    bladeTrail.push({ x: indexTip.x, y: indexTip.y });

    prevFingerX = indexTip.x;
    prevFingerY = indexTip.y;
  }

  updateAndDrawBladeTrail();
  updateAndDrawFruits();

  ctx.font = '32px sans-serif';
  ctx.fillStyle = 'white';
  ctx.textAlign = 'left';
  ctx.fillText('Score: ' + score, 20, 50);

  requestAnimationFrame(loop);
}

async function start() {
  await initHandLandmarker();
  await initCamera();
  resizeCanvas();
  requestAnimationFrame(loop);
}

start();