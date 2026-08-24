const video = document.getElementById('ekran');

navigator.mediaDevices.getUserMedia({ video: true })
  .then(stream => {
    video.srcObject = stream;
  })
  .catch(err => console.error('Brak dostępu do kamery:', err));

  