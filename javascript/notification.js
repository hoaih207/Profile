document.addEventListener('DOMContentLoaded', () => {
  const notification = document.getElementById('notification');
  const notificationButton = document.getElementById(
    'notification-button'
  );
  const audio = document.getElementById('audio');

  if (!notificationButton || !audio) {
    return;
  }

  notificationButton.addEventListener('click', async () => {
    try {
      audio.volume = 1;
      audio.currentTime = 0;

      await audio.play();

      if (notification) {
        notification.style.display = 'none';
      }
    } catch (error) {
      console.error('Không thể phát nhạc:', error);
      alert('Không thể phát nhạc. Hãy kiểm tra file data/van.mp3.');
    }
  });
});