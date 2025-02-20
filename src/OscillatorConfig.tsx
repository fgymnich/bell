import React, { useState} from 'react';
import { createBellSound } from './bellSound';

interface OscillatorSettings {
  frequency: number;
  amplitude: number;
  attack: number;
  release: number;
  type: OscillatorType;
}

const DEFAULT_SETTINGS: OscillatorSettings = {
  frequency: 830,
  amplitude: 0.5,
  attack: 0,
  release: 2,
  type: 'sine'
};

interface OscillatorConfigProps {
  onSettingsChange: (settings: OscillatorSettings) => void;
}

export const OscillatorConfig: React.FC<OscillatorConfigProps> = ({ onSettingsChange }) => {
  const [settings, setSettings] = useState<OscillatorSettings>(() => {
    const savedSettings = localStorage.getItem('oscillatorSettings');
    return savedSettings ? JSON.parse(savedSettings) : DEFAULT_SETTINGS;
  });
  const [isOpen, setIsOpen] = useState(false);

  const handleChange = (key: keyof OscillatorSettings, value: number | OscillatorType) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    onSettingsChange(newSettings);
  };

  const saveSettings = () => {
    localStorage.setItem('oscillatorSettings', JSON.stringify(settings));
  };

  const resetToDefault = () => {
    setSettings(DEFAULT_SETTINGS);
    onSettingsChange(DEFAULT_SETTINGS);
    localStorage.removeItem('oscillatorSettings');
  };

  return (
    <div className="oscillator-config">
      <button 
        className="config-toggle"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? 'Hide Sound Settings' : 'Show Sound Settings'}
      </button>

      {isOpen && (
        <div className="config-panel">
          <div className="slider-group">
            <label>
              Frequency (Hz):
              <input
                type="range"
                min="20"
                max="2000"
                value={settings.frequency}
                onChange={(e) => handleChange('frequency', Number(e.target.value))}
              />
              <span>{settings.frequency}Hz</span>
            </label>

            <label>
              Amplitude:
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={settings.amplitude}
                onChange={(e) => handleChange('amplitude', Number(e.target.value))}
              />
              <span>{settings.amplitude}</span>
            </label>

            <label>
              Attack (s):
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={settings.attack}
                onChange={(e) => handleChange('attack', Number(e.target.value))}
              />
              <span>{settings.attack}s</span>
            </label>

            <label>
              Release (s):
              <input
                type="range"
                min="0.1"
                max="5"
                step="0.1"
                value={settings.release}
                onChange={(e) => handleChange('release', Number(e.target.value))}
              />
              <span>{settings.release}s</span>
            </label>

            <label>
              Wave Type:
              <select
                value={settings.type}
                onChange={(e) => handleChange('type', e.target.value as OscillatorType)}
              >
                <option value="sine">Sine</option>
                <option value="square">Square</option>
                <option value="sawtooth">Sawtooth</option>
                <option value="triangle">Triangle</option>
              </select>
            </label>
          </div>

          <div className="config-buttons">
            <button onClick={resetToDefault}>Reset to Default</button>
            <button onClick={saveSettings}>Save Settings</button>
            <button 
              className="test-sound-button"
              onClick={() => createBellSound(settings)}
            >
              Test Sound
            </button>
          </div>
        </div>
      )}
    </div>
  );
}; 