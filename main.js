import { HandLandmarker, FilesetResolver } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14";

const HAND_CONNECTIONS = [
  [0,1],[1,2],[2,3],[3,4],           // kciuk
  [0,5],[5,6],[6,7],[7,8],           // wskazujący
  [5,9],[9,10],[10,11],[11,12],      // środkowy
  [9,13],[13,14],[14,15],[15,16],    // serdeczny
  [13,17],[17,18],[18,19],[19,20],   // mały palec
  [0,17]                             // nadgarstek 
];

const video = document.getElementById('ekran');

const canvas = document.getElementById('gra');
const ctx = canvas.getContext('2d');

const drawCanvas = document.getElementById('plotno');
const drawCtx = drawCanvas.getContext('2d');

let hands = [];
let handLandmarker = null;

let prevDrawX = null;
let prevDrawY = null;

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  drawCanvas.width = window.innerWidth;
  drawCanvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function isFist(points) {
  const fingerTips = [8, 12, 16, 20];
  const fingerBases = [6, 10, 14, 18];
  return fingerTips.every((tip, i) => points[tip].y > points[fingerBases[i]].y);
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
    numHands: 2
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

function loop() {

  if (video.readyState >= 2) {
    ctx.save();
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    ctx.restore();
  }

  detectHand();

  for (const points of hands) {
    ctx.strokeStyle = 'lime';
    ctx.lineWidth = 3;
    for (const [a, b] of HAND_CONNECTIONS) {
      ctx.beginPath();
      ctx.moveTo(points[a].x, points[a].y);
      ctx.lineTo(points[b].x, points[b].y);
      ctx.stroke();
    }

    ctx.fillStyle = 'red';
    for (const p of points) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
      ctx.fill();
    }

    
    if (isFist(points)) {
      drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
      prevDrawX = null;
      prevDrawY = null;
      continue;
    }

    const thumb = points[4];
    const index = points[8];

    if (distance(thumb, index) < 40) {
      const midX = (thumb.x + index.x) / 2;
      const midY = (thumb.y + index.y) / 2;

      if (prevDrawX !== null) {
        drawCtx.strokeStyle = 'cyan';
        drawCtx.lineWidth = 6;
        drawCtx.lineCap = 'round';
        drawCtx.beginPath();
        drawCtx.moveTo(prevDrawX, prevDrawY);
        drawCtx.lineTo(midX, midY);
        drawCtx.stroke();
      }
      prevDrawX = midX;
      prevDrawY = midY;
    } else {
      prevDrawX = null;
      prevDrawY = null;
    }
  }

  requestAnimationFrame(loop);
}

async function start() {
  await initHandLandmarker();
  await initCamera();
  resizeCanvas();
  loop();
}

start();