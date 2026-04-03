const audioCtx = () => new (window.AudioContext || (window as any).webkitAudioContext)();

export function playGavel() {
  const ctx = audioCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = 'square';
  osc.frequency.setValueAtTime(120, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.15);
  gain.gain.setValueAtTime(0.6, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
  osc.start();
  osc.stop(ctx.currentTime + 0.3);
}

export function playObjection() {
  const ctx = audioCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(300, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.1);
  osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.3);
  gain.gain.setValueAtTime(0.5, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
  osc.start();
  osc.stop(ctx.currentTime + 0.5);
}

export function playAmbience() {
  const ctx = audioCtx();
  const bufferSize = ctx.sampleRate * 2;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * 0.02;
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 200;
  const gain = ctx.createGain();
  gain.gain.value = 0.15;
  source.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  source.start();
  return () => { source.stop(); ctx.close(); };
}

export function playScoreUp() {
  const ctx = audioCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = 'sine';
  osc.frequency.setValueAtTime(400, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.2);
  gain.gain.setValueAtTime(0.3, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
  osc.start();
  osc.stop(ctx.currentTime + 0.3);
}

export function playScoreDown() {
  const ctx = audioCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = 'sine';
  osc.frequency.setValueAtTime(400, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.3);
  gain.gain.setValueAtTime(0.3, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
  osc.start();
  osc.stop(ctx.currentTime + 0.4);
}

let voicesCache: SpeechSynthesisVoice[] = [];

function getVoices(): SpeechSynthesisVoice[] {
  if (voicesCache.length > 0) return voicesCache;
  if (!('speechSynthesis' in window)) return [];
  
  voicesCache = window.speechSynthesis.getVoices();
  return voicesCache;
}

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  window.speechSynthesis.onvoiceschanged = () => {
    voicesCache = window.speechSynthesis.getVoices();
  };
}

export function speakText(text: string, voiceRole: 'judge' | 'prosecutor' | 'defender' | string) {
  if (!('speechSynthesis' in window)) return;
  
  setTimeout(() => {
    window.speechSynthesis.cancel();
    
    const utter = new SpeechSynthesisUtterance(text);
    const voices = getVoices();
    
    const preferredVoices = voices.filter(v => v.lang.startsWith('en'));
    const googleUk = preferredVoices.find(v => v.name.includes('Google UK English Male'));
    const googleUs = preferredVoices.find(v => v.name.includes('Google US English'));
    const defaultVoice = googleUk || googleUs || preferredVoices[0] || voices[0];
    
    if (defaultVoice) {
      utter.voice = defaultVoice;
    }

    switch (voiceRole) {
      case 'judge':
        utter.rate = 0.8;
        utter.pitch = 0.7;
        break;
      case 'prosecutor':
        utter.rate = 1.1;
        utter.pitch = 1.1;
        break;
      case 'defender':
        utter.rate = 1.0;
        utter.pitch = 1.0;
        break;
      default:
        utter.rate = 1.0;
        utter.pitch = 1.0;
        break;
    }
    window.speechSynthesis.speak(utter);
  }, 0);
}

export function stopAllSpeech() {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}
