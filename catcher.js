import { HandLandmarker, FilesetResolver } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14";

const video = document.getElementById('ekran1');
const canvas = document.getElementById('gra1');
const ctx = canvas.getContext('2d');

let hands = [];
let handLandmarker = null;

let fallingItems = [];
let score = 0;
let lastSpawn = 0;
let spawnInterval = 1000;

const goodItems = ['🍎', '🍊', '🍋', '🍇'];
const bomb = '💣';

let hp = 3;
let gameOver = false;

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);

function isFist(points) {
  const fingerTips = [8, 12, 16, 20];
  const fingerBases = [6, 10, 14, 18];
  return fingerTips.every((tip, i) => {
    const tipDist = Math.hypot(points[tip].x - points[0].x, points[tip].y - points[0].y);
    const baseDist = Math.hypot(points[fingerBases[i]].x - points[0].x, points[fingerBases[i]].y - points[0].y);
    return tipDist < baseDist;
  });
}

function resetGame() {
  score = 0;
  hp = 3;
  gameOver = false;
  fallingItems = [];
  lastSpawn = performance.now();
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

function drawBasket(x, y) {
  ctx.font = '200px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🧺', x, y);
}

function spawnItem() {
  const isBomb = Math.random() < 0.2;

  fallingItems.push({
    x: 50 + Math.random() * (canvas.width - 100),
    y: -40,
    vy: 2 + Math.random() * 2,
    letter: isBomb ? bomb : goodItems[Math.floor(Math.random() * goodItems.length)],
    isBomb: isBomb,
    radius: 30
  });
}

function updateAndDrawItems() {
  ctx.font = '100px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (let i = fallingItems.length - 1; i >= 0; i--) {
    const item = fallingItems[i];
    item.y += item.vy;
    ctx.fillText(item.letter, item.x, item.y);

    if (item.y > canvas.height + 40) {
      fallingItems.splice(i, 1);
    }
  }
}

function checkCatch(basketX, basketY) {
  for (let i = fallingItems.length - 1; i >= 0; i--) {
    const item = fallingItems[i];
    const dist = Math.hypot(item.x - basketX, item.y - basketY);
    if (dist < item.radius + 40) {
      fallingItems.splice(i, 1);
      if (item.isBomb) {
        hp--;
        if (hp <= 0) {
          gameOver = true;
        }
      } else {
        score++;
      }
    }
  }
}

function drawUI() {
  ctx.font = '32px sans-serif';
  ctx.fillStyle = 'white';
  ctx.textAlign = 'left';
  ctx.fillText('Score: ' + score, 20, 50);

  ctx.font = '32px sans-serif';
  ctx.fillStyle = 'red';
  ctx.textAlign = 'right';
  ctx.fillText('❤️'.repeat(Math.max(hp, 0)), canvas.width - 20, 50);
}

function drawGameOver() {
  ctx.fillStyle = 'rgba(0,0,0,0.75)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = 'white';
  ctx.textAlign = 'center';
  ctx.font = '60px sans-serif';
  ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 40);

  ctx.font = '36px sans-serif';
  ctx.fillText('Score: ' + score, canvas.width / 2, canvas.height / 2 + 20);

  ctx.font = '24px sans-serif';
  ctx.fillText('Show ur fist to play again', canvas.width / 2, canvas.height / 2 + 70);
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

  if (!gameOver) {
    if (now - lastSpawn > spawnInterval) {
      spawnItem();
      lastSpawn = now;
    }

    updateAndDrawItems();

    for (const points of hands) {
      const palmCenter = points[9];
      drawBasket(palmCenter.x, palmCenter.y);
      checkCatch(palmCenter.x, palmCenter.y);
    }

    drawUI();
  } else {
    drawGameOver();

    for (const points of hands) {
      if (isFist(points)) {
        resetGame();
      }
    }
  }

  requestAnimationFrame(loop);
}

async function start() {
  await initHandLandmarker();
  await initCamera();
  resizeCanvas();
  requestAnimationFrame(loop);
}

start();