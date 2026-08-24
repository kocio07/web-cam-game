const video = document.getElementById('ekran');
const canvas = document.getElementById('gra');
const ctx = canvas.getContext('2d');

navigator.mediaDevices.getUserMedia({ video: true })
  .then(stream => {
    video.srcObject = stream;
  })
  .catch(err => console.error('Brak dostępu do kamery:', err));

  function loop() {
    if (video.readyState >= 2) {
        ctx.save();
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        ctx.restore();
    }
    requestAnimationFrame(loop);
  }
  loop();
 