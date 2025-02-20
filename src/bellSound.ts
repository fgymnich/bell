// Bell sound implementation
export interface OscillatorSettings {
  frequency: number;
  amplitude: number;
  attack: number;
  release: number;
  type: OscillatorType;
}

export const DEFAULT_SETTINGS: OscillatorSettings = {
  frequency: 830,
  amplitude: 0.5,
  attack: 0,
  release: 2,
  type: 'sine'
};

export const createBellSound = (settings: OscillatorSettings = DEFAULT_SETTINGS) => {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  oscillator.type = settings.type;
  oscillator.frequency.setValueAtTime(settings.frequency, audioContext.currentTime);
  
  // Attack
  gainNode.gain.setValueAtTime(0, audioContext.currentTime);
  gainNode.gain.linearRampToValueAtTime(settings.amplitude, audioContext.currentTime + settings.attack);
  
  // Release
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + settings.attack + settings.release);

  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + settings.attack + settings.release);
}; 