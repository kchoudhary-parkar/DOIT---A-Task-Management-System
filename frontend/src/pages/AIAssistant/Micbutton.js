/**
 * MicButton.jsx
 * Microphone button for the chat input area — records voice, shows live
 * interim transcript, and fills/appends text to the input on finalisation.
 *
 * Props:
 *   inputText       {string}   - Current value of the text input
 *   setInputText    {fn}       - Setter for the text input
 *   disabled        {boolean}  - Disable while AI is responding
 *   variant         {string}   - 'doit' | 'foundry' | 'local' (for colour theming)
 */

import React, { useState, useEffect, useRef } from 'react';
import { useSTT } from './useVoiceFeatures';
import './Micbutton.css';

const MicIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <line x1="12" y1="19" x2="12" y2="23" />
    <line x1="8" y1="23" x2="16" y2="23" />
  </svg>
);

const StopMicIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="1" y1="1" x2="23" y2="23" />
    <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
    <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
    <line x1="12" y1="19" x2="12" y2="23" />
    <line x1="8" y1="23" x2="16" y2="23" />
  </svg>
);

const MicButton = ({ inputText, setInputText, disabled, variant = 'doit' }) => {
  const [showOverlay, setShowOverlay] = useState(false);
  // Draft text while modal is open — we DON'T flush to inputText until "Done"
  const draftRef = useRef(inputText);

  const stt = useSTT({
    onTranscript: (text) => {
      draftRef.current = text;
    },
  });

  // Sync draftRef when inputText changes externally (user typed)
  useEffect(() => {
    if (!showOverlay) draftRef.current = inputText;
  }, [inputText, showOverlay]);

  const handleOpen = () => {
    if (!stt.isSupported) {
      alert('Speech recognition is not supported in this browser.\nPlease use Chrome, Edge, or Safari 15+.');
      return;
    }
    draftRef.current = inputText; // Start with existing text
    stt.reset();
    setShowOverlay(true);
    // Small delay so the modal renders before mic starts
    setTimeout(() => stt.start(inputText), 200);
  };

  const handleToggleListen = () => {
    if (stt.isListening) {
      stt.stop();
    } else {
      stt.start(draftRef.current);
    }
  };

  const handleDone = () => {
    stt.stop();
    // Merge spoken transcript into the input
    if (draftRef.current) {
      setInputText(draftRef.current);
    }
    setShowOverlay(false);
  };

  const handleDiscard = () => {
    stt.stop();
    setShowOverlay(false);
    // Do NOT change inputText — leave it as it was
  };

  const handleEdit = (e) => {
    draftRef.current = e.target.value;
    stt.reset(); // Reset STT so next recording appends fresh
  };

  const variantClass = `mic-btn--${variant}`;

  return (
    <>
      <button
        className={`mic-btn ${variantClass} ${stt.isListening && showOverlay ? 'mic-btn--listening' : ''}`}
        onClick={handleOpen}
        disabled={disabled || !stt.isSupported}
        title={stt.isSupported ? 'Speak your message' : 'Not supported in this browser'}
        aria-label="Voice input"
        type="button"
      >
        <MicIcon size={18} />
        {stt.isListening && showOverlay && <span className="mic-pulse-ring" />}
      </button>

      {/* ── Voice Input Overlay / Modal ─────────────────────────────────── */}
      {showOverlay && (
        <div className="mic-overlay" onClick={(e) => { if (e.target === e.currentTarget) handleDiscard(); }}>
          <div className={`mic-modal ${variantClass}`}>
            <div className="mic-modal__header">
              <span className="mic-modal__title">Voice Input</span>
              <button className="mic-modal__close" onClick={handleDiscard} aria-label="Close">✕</button>
            </div>

            {/* Live waveform visualiser */}
            <div className={`mic-visualiser ${stt.isListening ? 'mic-visualiser--active' : ''}`}>
              {Array.from({ length: 20 }).map((_, i) => (
                <div
                  key={i}
                  className="mic-bar"
                  style={{ animationDelay: `${i * 0.05}s` }}
                />
              ))}
              {!stt.isListening && (
                <span className="mic-visualiser__idle">
                  {stt.error ? '⚠ Error' : 'Tap mic to start'}
                </span>
              )}
            </div>

            {/* Interim transcript preview */}
            {stt.interimTranscript && (
              <div className="mic-interim">
                <span className="mic-interim__label">Hearing:</span>
                <span className="mic-interim__text">{stt.interimTranscript}</span>
              </div>
            )}

            {/* Error message */}
            {stt.error && (
              <div className="mic-error">{stt.error}</div>
            )}

            {/* Editable transcript area */}
            <div className="mic-draft-area">
              <label className="mic-draft-label">Transcript (edit before sending)</label>
              <textarea
                className="mic-draft-textarea"
                defaultValue={inputText}
                ref={(el) => {
                  if (el) {
                    // Keep textarea in sync with draftRef without causing re-renders
                    el.value = draftRef.current;
                  }
                }}
                onChange={handleEdit}
                placeholder="Your spoken text will appear here…"
                rows={4}
              />
            </div>

            {/* Controls */}
            <div className="mic-modal__actions">
              <button
                className={`mic-listen-btn ${stt.isListening ? 'mic-listen-btn--stop' : ''} ${variantClass}`}
                onClick={handleToggleListen}
                type="button"
              >
                {stt.isListening ? (
                  <><StopMicIcon size={16} /> Stop Listening</>
                ) : (
                  <><MicIcon size={16} /> {draftRef.current ? 'Continue' : 'Start Listening'}</>
                )}
                {stt.isListening && <span className="mic-listen-dot" />}
              </button>

              <div className="mic-modal__right-actions">
                <button className="mic-discard-btn" onClick={handleDiscard} type="button">
                  Discard
                </button>
                <button
                  className={`mic-done-btn ${variantClass}`}
                  onClick={handleDone}
                  type="button"
                  disabled={!draftRef.current && !inputText}
                >
                  Use This Text ↗
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MicButton;