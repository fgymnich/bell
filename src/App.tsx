import React, { useState, useEffect } from 'react';
import './App.css';
import { createBellSound, OscillatorSettings, DEFAULT_SETTINGS } from './bellSound';
import { OscillatorConfig } from './OscillatorConfig';

interface TimeInput {
  minutes: number;
  seconds: number;
}

function App() {
  const [timeLeft, setTimeLeft] = useState<TimeInput>({ minutes: 0, seconds: 0 });
  const [inputTime, setInputTime] = useState<TimeInput>({ minutes: 0, seconds: 0 });
  const [isRunning, setIsRunning] = useState(false);
  const [mode, setMode] = useState<'once' | 'continuous'>('once');
  const [progress, setProgress] = useState(100);
  const [oscillatorSettings, setOscillatorSettings] = useState<OscillatorSettings>(DEFAULT_SETTINGS);

  const totalSeconds = timeLeft.minutes * 60 + timeLeft.seconds;
  const initialSeconds = inputTime.minutes * 60 + inputTime.seconds;

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isRunning && totalSeconds > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => {
          const newSeconds = prev.seconds - 1;
          if (newSeconds >= 0) {
            return { ...prev, seconds: newSeconds };
          } else {
            const newMinutes = prev.minutes - 1;
            return { minutes: newMinutes, seconds: 59 };
          }
        });

        // Update progress
        const currentTotal = totalSeconds - 1;
        const progressValue = (currentTotal / initialSeconds) * 100;
        setProgress(progressValue);
      }, 1000);
    } else if (totalSeconds === 0 && isRunning) {
      createBellSound(oscillatorSettings);
      if (mode === 'continuous') {
        setTimeLeft({ ...inputTime });
        setProgress(100);
      } else {
        setIsRunning(false);
      }
    }

    return () => clearInterval(interval);
  }, [isRunning, totalSeconds, mode, inputTime, initialSeconds, oscillatorSettings]);

  const handleStart = () => {
    if (!isRunning) {
      setTimeLeft({ ...inputTime });
      setProgress(100);
      setIsRunning(true);
    }
  };

  const handleStop = () => {
    setIsRunning(false);
    setTimeLeft({ ...inputTime });
    setProgress(100);
  };

  const handleInputChange = (field: keyof TimeInput, value: number) => {
    const newValue = Math.max(0, Math.min(59, value));
    setInputTime(prev => ({ ...prev, [field]: newValue }));
    if (!isRunning) {
      setTimeLeft(prev => ({ ...prev, [field]: newValue }));
    }
  };

  const handleIncrement = (field: keyof TimeInput) => {
    handleInputChange(field, inputTime[field] + 1);
  };

  const handleDecrement = (field: keyof TimeInput) => {
    handleInputChange(field, inputTime[field] - 1);
  };

  return (
    <div className="App">
      <div className="timer-container">
        <div className="progress-ring" style={{ '--progress': `${progress}%` } as React.CSSProperties}>
          <div className="time-display">
            {String(timeLeft.minutes).padStart(2, '0')}:{String(timeLeft.seconds).padStart(2, '0')}
          </div>
        </div>

        <div className="time-input">
          <div className="input-group">
            <label>Minutes:</label>
            <button onClick={() => handleDecrement('minutes')}>-</button>
            <input
              type="number"
              value={inputTime.minutes}
              onFocus={(e) => e.target.select()}
              onChange={(e) => {
                const value = e.target.value === '' ? 0 : parseInt(e.target.value);
                handleInputChange('minutes', value);
              }}
              min="0"
              max="59"
            />
            <button onClick={() => handleIncrement('minutes')}>+</button>
          </div>

          <div className="input-group">
            <label>Seconds:</label>
            <button onClick={() => handleDecrement('seconds')}>-</button>
            <input
              type="number"
              value={inputTime.seconds}
              onFocus={(e) => e.target.select()}
              onChange={(e) => {
                const value = e.target.value === '' ? 0 : parseInt(e.target.value);
                handleInputChange('seconds', value);
              }}
              min="0"
              max="59"
            />
            <button onClick={() => handleIncrement('seconds')}>+</button>
          </div>
        </div>

        <div className="mode-selector">
          <label>
            <input
              type="radio"
              value="once"
              checked={mode === 'once'}
              onChange={(e) => setMode(e.target.value as 'once' | 'continuous')}
            />
            Once
          </label>
          <label>
            <input
              type="radio"
              value="continuous"
              checked={mode === 'continuous'}
              onChange={(e) => setMode(e.target.value as 'once' | 'continuous')}
            />
            Continuous
          </label>
        </div>

        <div className="controls">
          <button className={`control-button ${isRunning ? 'stop' : 'start'}`} onClick={isRunning ? handleStop : handleStart}>
            {isRunning ? 'Stop' : 'Start'}
          </button>
        </div>

        <OscillatorConfig onSettingsChange={setOscillatorSettings} />
      </div>
    </div>
  );
}

export default App;
