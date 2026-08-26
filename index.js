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
  { x: 260, y: 20, size: 60, color: 'lime' },
  { x: 340, y: 20, size: 60, color: 'eraser' }
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

const clearButton = {
  x: 0,
  y: 450,
  radius: 30
};
let clearHoverFrames = 0;
const CLEAR_HOLD_FRAMES = 30;

const video = document.getElementById('ekran');

const canvas = document.getElementById('gra');
const ctx = canvas.getContext('2d');

const drawCanvas = document.getElementById('plotno');
const drawCtx = drawCanvas.getContext('2d');

let hands = [];
let handLandmarker = null;

let prevDrawX = null;
let prevDrawY = null;

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

function isFingerExtended(points, tipId, pipId, wristId = 0) {
  const distTip = Math.hypot(points[tipId].x - points[wristId].x, points[tipId].y - points[wristId].y);
  const distPip = Math.hypot(points[pipId].x - points[wristId].x, points[pipId].y - points[wristId].y);
  return distTip > distPip;
}



function isFist(points) {
  return !isFingerExtended(points, 8, 6) &&
  !isFingerExtended(points, 12, 10) &&
  !isFingerExtended(points, 16, 14) &&
  !isFingerExtended(points, 20, 18);
}

function isPointingOnly(points) {
  const indexExtended  = isFingerExtended(points, 8, 6);
  const middleCurled   = !isFingerExtended(points, 12, 10);
  const ringCurled     = !isFingerExtended(points, 16, 14);
  const pinkyCurled    = !isFingerExtended(points, 20, 18);
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

function pointInRect(px, py, rect) {
  return px >= rect.x && px <= rect.x + rect.size &&
         py >= rect.y && py <= rect.y + rect.size;
}

function pointInCircle(px, py, cx, cy, r) {
  return Math.hypot(px - cx, py - cy) < r;
}

function isOverUI(px, py) {
  const overPalette = colors.some(sw => pointInRect(px, py, sw));

  const sliderX = canvas.width - 60;
  const overSlider = px > sliderX - 40 && px < sliderX + 80 &&
                      py > slider.trackTop - 30 && py < slider.trackTop + slider.trackHeight + 70;

  const overClear = pointInCircle(px, py, clearButton.x, clearButton.y, clearButton.radius + 50);

  return overPalette || overSlider || overClear;
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
    if (sw.color === 'eraser') {
      ctx.fillStyle = '#333';
      ctx.fillRect(sw.x, sw.y, sw.size, sw.size);
      ctx.fillStyle = 'white';
      ctx.font = '28px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('E', sw.x + sw.size/2, sw.y + sw.size/2);
    } else {
      ctx.fillStyle = sw.color;
      ctx.fillRect(sw.x, sw.y, sw.size, sw.size);
    }

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

  ctx.fillStyle = currentColor === 'eraser' ? '#333' : currentColor;
  ctx.beginPath();
  ctx.arc(x - 50, slider.handleY, brushSize / 2, 0, Math.PI * 2);
  ctx.fill();

  clearButton.x = x;
  const holdProgress = clearHoverFrames / CLEAR_HOLD_FRAMES;

  ctx.fillStyle = '#c0392b';
  ctx.beginPath();
  ctx.arc(clearButton.x, clearButton.y, clearButton.radius, 0, Math.PI * 2);
  ctx.fill();

  if (holdProgress > 0) {
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(clearButton.x, clearButton.y, clearButton.radius + 6, -Math.PI/2, -Math.PI/2 + holdProgress * Math.PI * 2);
    ctx.stroke();
  }

  ctx.fillStyle = 'white';
  ctx.font = '24px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('C', clearButton.x, clearButton.y);
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

    const overClearButton = pointInCircle(index.x, index.y, clearButton.x, clearButton.y, clearButton.radius);

    if (isDrawingGesture && overClearButton) {
      clearHoverFrames++;
      if (clearHoverFrames >= CLEAR_HOLD_FRAMES) {
        drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
        clearHoverFrames = 0;
      }
    } else {
      clearHoverFrames = 0;
    }

    
    const overUI = isOverUI(index.x, index.y);
    if (overUI) {
      prevDrawX = null;
      prevDrawY = null;
      continue;
    }

    if (isDrawingGesture) {
      if (prevDrawX !== null) {
        if (currentColor === 'eraser') {
          drawCtx.globalCompositeOperation = 'destination-out';
          drawCtx.lineWidth = brushSize * 2;
        } else {
          drawCtx.globalCompositeOperation = 'source-over';
          drawCtx.strokeStyle = currentColor;
          drawCtx.lineWidth = brushSize;
        }
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