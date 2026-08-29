import { HandLandmarker, FilesetResolver } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14";


const video = document.getElementById('ekran2');
const canvas = document.getElementById('gra2');
const ctx = canvas.getContext('2d');

let hands = [];
let handLandmarker = null;

let fruits = [];
let lastSpawn = 0;
let spawnInterval = 1500;

const gravity = 0.5;
const fruitsTxt = ['🍎', '🍊', '🍋', '🍉', '🍍'];

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
    ctx.font = '50px serif';
    ctx.textAlign = 'center';
    ctx.textBaseLine = 'middle';

    

}