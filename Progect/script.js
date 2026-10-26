const today = new Date();
today.setHours(0, 0, 0, 0);

const firstShowDate = new Date(2026, 10, 14);
const millisecondsPerDay = 1000 * 60 * 60 * 24;
const daysUntilShow = Math.ceil((firstShowDate - today) / millisecondsPerDay);
const countdown = document.getElementById('倒數');

if (countdown) {
  if (daysUntilShow > 0) {
    countdown.textContent = `還有 ${daysUntilShow} 天`;
  } else if (daysUntilShow === 0) {
    countdown.textContent = '今天首演！';
  } else {
    countdown.textContent = '巡演現正進行中';
  }
}

const previewDuration = 32;
const beatDuration = 0.5;
const playButton = document.getElementById('play-toggle');
const playIcon = document.getElementById('play-icon');
const seekSlider = document.getElementById('track-seek');
const currentTimeLabel = document.getElementById('current-time');
const playerStatus = document.getElementById('player-status');
const waveform = document.getElementById('waveform');

function formatTime(seconds) {
  const wholeSeconds = Math.floor(seconds);
  return `${Math.floor(wholeSeconds / 60)}:${String(wholeSeconds % 60).padStart(2, '0')}`;
}

function renderWaveform() {
  if (!waveform) return;

  for (let index = 0; index < 48; index += 1) {
    const bar = document.createElement('span');
    const height = 20 + Math.abs(Math.sin(index * 2.13) * Math.cos(index * 0.39)) * 78;
    bar.style.setProperty('--bar-height', `${height}%`);
    waveform.append(bar);
  }
}

renderWaveform();

if (playButton && playIcon && seekSlider && currentTimeLabel && playerStatus && waveform) {
  let audioContext;
  let playbackTimer;
  let playbackStartedAt = 0;
  let playbackOffset = 0;
  let isPlaying = false;
  let lastBeat = -1;

  function updateProgress(seconds) {
    const boundedTime = Math.max(0, Math.min(previewDuration, seconds));
    seekSlider.value = String(boundedTime);
    currentTimeLabel.textContent = formatTime(boundedTime);

    const playedBars = Math.floor((boundedTime / previewDuration) * waveform.children.length);
    Array.from(waveform.children).forEach((bar, index) => {
      bar.classList.toggle('is-played', index < playedBars);
    });
  }

  function playNote(frequency, beatIndex) {
    const startTime = audioContext.currentTime;
    const duration = 0.34;
    const noteGain = audioContext.createGain();
    const oscillator = audioContext.createOscillator();

    oscillator.type = beatIndex % 4 === 0 ? 'sine' : 'triangle';
    oscillator.frequency.setValueAtTime(frequency, startTime);
    noteGain.gain.setValueAtTime(0.0001, startTime);
    noteGain.gain.exponentialRampToValueAtTime(0.095, startTime + 0.025);
    noteGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
    oscillator.connect(noteGain);
    noteGain.connect(audioContext.destination);
    oscillator.start(startTime);
    oscillator.stop(startTime + duration);
  }

  function playBeat(beatIndex) {
    const melody = [220, 261.63, 329.63, 392, 329.63, 293.66, 261.63, 196];
    playNote(melody[beatIndex % melody.length], beatIndex);

    if (beatIndex % 4 === 0) {
      const bassNotes = [110, 130.81, 98, 146.83];
      playNote(bassNotes[Math.floor(beatIndex / 4) % bassNotes.length], beatIndex);
    }
  }

  function currentPosition() {
    return playbackOffset + (performance.now() - playbackStartedAt) / 1000;
  }

  function stopPlaybackTimer() {
    window.clearInterval(playbackTimer);
    playbackTimer = undefined;
  }

  function tickPlayback() {
    const position = currentPosition();

    if (position >= previewDuration) {
      playbackOffset = previewDuration;
      stopPlaybackTimer();
      isPlaying = false;
      playIcon.textContent = '▶';
      playButton.setAttribute('aria-label', '重新播放新曲試聽');
      playButton.setAttribute('aria-pressed', 'false');
      updateProgress(previewDuration);
      playerStatus.textContent = '試聽結束，按播放即可從頭再聽。';
      return;
    }

    const beatIndex = Math.floor(position / beatDuration);
    while (lastBeat < beatIndex) {
      lastBeat += 1;
      playBeat(lastBeat);
    }
    updateProgress(position);
  }

  function startPlaybackTimer() {
    stopPlaybackTimer();
    playbackTimer = window.setInterval(tickPlayback, 50);
  }

  function pausePreview() {
    playbackOffset = Math.min(previewDuration, currentPosition());
    stopPlaybackTimer();
    isPlaying = false;
    playIcon.textContent = '▶';
    playButton.setAttribute('aria-label', '播放新曲試聽');
    playButton.setAttribute('aria-pressed', 'false');
    updateProgress(playbackOffset);
    playerStatus.textContent = '已暫停試聽。';
  }

  async function startPreview() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;

    if (!AudioContextClass) {
      playerStatus.textContent = '此瀏覽器不支援音訊播放，請改用最新版瀏覽器。';
      return;
    }

    try {
      audioContext ??= new AudioContextClass();
      await audioContext.resume();

      if (playbackOffset >= previewDuration) {
        playbackOffset = 0;
        updateProgress(0);
      }

      playbackStartedAt = performance.now();
      lastBeat = Math.floor(playbackOffset / beatDuration) - 1;
      isPlaying = true;
      playIcon.textContent = 'Ⅱ';
      playButton.setAttribute('aria-label', '暫停新曲試聽');
      playButton.setAttribute('aria-pressed', 'true');
      playerStatus.textContent = '正在播放〈夜行星〉旋律草稿。';
      startPlaybackTimer();
    } catch (error) {
      isPlaying = false;
      playButton.setAttribute('aria-pressed', 'false');
      playerStatus.textContent = '無法啟動音訊播放，請檢查瀏覽器的音訊設定後重試。';
      console.error('Unable to start the audio preview:', error);
    }
  }

  playButton.addEventListener('click', () => {
    if (isPlaying) {
      pausePreview();
    } else {
      void startPreview();
    }
  });

  seekSlider.addEventListener('input', () => {
    playbackOffset = Number(seekSlider.value);
    updateProgress(playbackOffset);

    if (isPlaying) {
      stopPlaybackTimer();
      playbackStartedAt = performance.now();
      lastBeat = Math.floor(playbackOffset / beatDuration) - 1;
      startPlaybackTimer();
    }
  });
}
