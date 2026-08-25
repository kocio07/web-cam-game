import { HandLandmarker, FilesetResolver } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14";

const HAND_CONNECTIONS = [
  [0,1],[1,2],[2,3],[3,4],           // kciuk
  [0,5],[5,6],[6,7],[7,8],           // wskazujący
  [5,9],[9,10],[10,11],[11,12],      // środkowy
  [9,13],[13,14],[14,15],[15,16],    // serdeczny
  [13,17],[17,18],[18,19],[19,20],   // mały palec
  [0,17]                             // nadgarstek
];

const colors = [
  { x: 20,  y: 20, size: 60, color: 'cyan' },
  { x: 100, y: 20, size: 60, color: 'magenta' },
  { x: 180, y: 20, size: 60, color: 'yellow' },
  { x: 260, y: 20, size: 60, color: 'lime' }
];
let currentColor = 'cyan';

let brushSize = 30;
const slider = {
  trackTop: 100,
  trackHeight: 300,
  handleY: 100,
  minSize: 5,
  maxSize: 100
};
let isDraggingSlider = false;

const video = document.getElementById('ekran');

const canvas = document.getElementById('gra');
const ctx = canvas.getContext('2d');

const drawCanvas = document.getElementById('plotno');
const drawCtx = drawCanvas.getContext('2d');

let hands = [];
let handLandmarker = null;

let prevDrawX = null;
let prevDrawY = null;

let wasFist = false;
let lastFistTime = 0;
const double_fist_window = 300;


let smoothIndexX = null;
let smoothIndexY = null;
const smoothing = 0.5;

let fistFrameCount = 0;
const fist_confirm_frames = 4;

let pointFrameCount = 0;
const point_confirm_frames = 3;

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  drawCanvas.width = window.innerWidth;
  drawCanvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);

function isFist(points) {
  const fingerTips = [8, 12, 16, 20];
  const fingerBases = [6, 10, 14, 18];
  return fingerTips.every((tip, i) => points[tip].y > points[fingerBases[i]].y);
}

function isPointingOnly(points) {
  const indexExtended = points[8].y < points[6].y;
  const middleCurled  = points[12].y > points[10].y;
  const ringCurled    = points[16].y > points[14].y;
  const pinkyCurled   = points[20].y > points[18].y;
  return indexExtended && middleCurled && ringCurled && pinkyCurled;
}

function getFistCenter(points) {
  const ids = [0, 5, 9, 13, 17];
  let sumX = 0, sumY = 0;
  for (const id of ids) {
    sumX += points[id].x;
    sumY += points[id].y;
  }
  return {
    x: sumX / ids.length,
    y: sumY / ids.length
  };
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function pointInRect(px, py, rect) {
  return px >= rect.x && px <= rect.x + rect.size &&
         py >= rect.y && py <= rect.y + rect.size;
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

function drawPicker() {
  for (const sw of colors) {
    ctx.fillStyle = sw.color;
    ctx.fillRect(sw.x, sw.y, sw.size, sw.size);

    if (sw.color === currentColor) {
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 4;
      ctx.strokeRect(sw.x, sw.y, sw.size, sw.size);
    }
  }
}

function drawSlider() {
  const x = canvas.width - 60;

  ctx.strokeStyle = 'white';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x, slider.trackTop);
  ctx.lineTo(x, slider.trackTop + slider.trackHeight);
  ctx.stroke();

  ctx.fillStyle = isDraggingSlider ? 'orange' : 'white';
  ctx.beginPath();
  ctx.arc(x, slider.handleY, 20, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = currentColor;
  ctx.beginPath();
  ctx.arc(x - 50, slider.handleY, brushSize / 2, 0, Math.PI * 2);
  ctx.fill();
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
  drawPicker();
  drawSlider();

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

    const fistCenter = getFistCenter(points);
    const sliderX = canvas.width - 60;
    const distToHandle = Math.hypot(fistCenter.x - sliderX, fistCenter.y - slider.handleY);

    const fistNowRaw = isFist(points);
    if (fistNowRaw) {
      fistFrameCount++;
    } else {
      fistFrameCount = 0;
    }
    const fistNow = fistFrameCount >= fist_confirm_frames;

    if (fistNow && distToHandle < 100) {
      isDraggingSlider = true;
    }
    if (!fistNow) {
      isDraggingSlider = false;
    }

    if (isDraggingSlider) {
      slider.handleY = Math.min(
        Math.max(fistCenter.y, slider.trackTop),
        slider.trackTop + slider.trackHeight
      );
      const t = (slider.handleY - slider.trackTop) / slider.trackHeight;
      brushSize = slider.minSize + t * (slider.maxSize - slider.minSize);
    }

    if (fistNow && !wasFist && distToHandle > 100) {
      const now = performance.now();
      if (now - lastFistTime < double_fist_window) {
        drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
      }
      lastFistTime = now;
    }
    wasFist = fistNow;

    if (fistNow) {
      prevDrawX = null;
      prevDrawY = null;
      continue;
    }

    const index = points[8];
    

    if (smoothIndexX === null) {
      smoothIndexX = index.x;
      smoothIndexY = index.y;
    } else {
      smoothIndexX += (index.x - smoothIndexX) * (1 - smoothing);
      smoothIndexY += (index.y - smoothIndexY) * (1 - smoothing);
    }

    for (const sw of colors) {
      if (pointInRect(index.x, index.y, sw)) {
        currentColor = sw.color;
      }
    }
     const pointingNowRaw = isPointingOnly(points);
    if (pointingNowRaw) {
      pointFrameCount++;
    } else {
      pointFrameCount = 0;
    }
    const isDrawingGesture = pointFrameCount >= point_confirm_frames;

    if (isDrawingGesture) {
      if (prevDrawX !== null) {
        drawCtx.strokeStyle = currentColor;
        drawCtx.lineWidth = brushSize;
        drawCtx.lineCap = 'round';
        drawCtx.beginPath();
        drawCtx.moveTo(prevDrawX, prevDrawY);
        drawCtx.lineTo(smoothIndexX, smoothIndexY);
        drawCtx.stroke();
      }
      prevDrawX = smoothIndexX;
      prevDrawY = smoothIndexY;
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