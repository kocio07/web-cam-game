import { HandLandmarker, FilesetResolver } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14";

const HAND_CONNECTIONS = [
  [0,1],[1,2],[2,3],[3,4],           // kciuk
  [0,5],[5,6],[6,7],[7,8],           // wskazujący
  [5,9],[9,10],[10,11],[11,12],      // środkowy
  [9,13],[13,14],[14,15],[15,16],    // serdeczny
  [13,17],[17,18],[18,19],[19,20],   // mały palec
  [0,17]                             // nadgarstek
];

const palmCenter = points[9];

const video = document.getElementById('ekran1');

const canvas = document.getElementById('gra1');
const ctx = canvas.getContext('2d');

const drawCanvas = document.getElementById('plotno1');
const drawCtx = drawCanvas.getContext('2d');


