import { HandLandmarker, FilesetResolver } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14";

const video = document.getElementById('ekran');
const canvas = document.getElementById('gra');
const ctx = canvas.getContext('2d');

let handLandmarker = null;
let fingerX = 0, fingerY = 0, fingerVisible = false;

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

  if (result.landmarks && result.landmarks.length > 0) {
    const tip = result.landmarks[0][8]; 
    fingerX = (1 - tip.x) * canvas.width;  
    fingerY = tip.y * canvas.height;
    fingerVisible = true;
  } else {
    fingerVisible = false;
  }
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

  if (fingerVisible) {
    ctx.beginPath();
    ctx.arc(fingerX, fingerY, 20, 0, Math.PI * 2);
    ctx.fillStyle = 'lime';
    ctx.fill();
  }

  requestAnimationFrame(loop);
}


async function start() {
  await initHandLandmarker();
  await initCamera();
  loop();
}

start();