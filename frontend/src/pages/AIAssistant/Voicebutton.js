/**
 * VoiceButton.jsx
 * Inline button to speak an AI message aloud (TTS)
 * Place inside the message bubble area.
 * 
 * Props:
 *   text        {string}   - The message text to speak
 *   messageId   {string}   - Unique ID for this message
 *   tts         {object}   - The useTTS() hook return value
 *   size        {number}   - Icon size (default 14)
 */

import React from 'react';
import './Voicebutton.css';

const SpeakIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
    <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
  </svg>
);

const StopIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <rect x="3" y="3" width="18" height="18" rx="2" />
  </svg>
);

const PauseIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <rect x="6" y="4" width="4" height="16" rx="1" />
    <rect x="14" y="4" width="4" height="16" rx="1" />
  </svg>
);

const ResumeIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
);

const VoiceButton = ({ text, messageId, tts, size = 14 }) => {
  if (!tts?.isSupported) return null;

  const isThisSpeaking = tts.speakingMessageId === messageId && tts.isSpeaking;
  const isThisPaused   = tts.speakingMessageId === messageId && tts.isPaused;

  const handleClick = () => {
    if (isThisSpeaking && !isThisPaused) {
      tts.togglePause();
    } else if (isThisPaused) {
      tts.togglePause();
    } else if (tts.isSpeaking) {
      // Another message is speaking — stop it and speak this one
      tts.stop();
      setTimeout(() => tts.speak(text, messageId), 100);
    } else {
      tts.speak(text, messageId);
    }
  };

  const handleStop = (e) => {
    e.stopPropagation();
    tts.stop();
  };

  let title = 'Read aloud';
  if (isThisSpeaking) title = 'Pause';
  if (isThisPaused)   title = 'Resume';

  return (
    <span className="voice-btn-group">
      <button
        className={`voice-btn ${isThisSpeaking || isThisPaused ? 'active' : ''}`}
        onClick={handleClick}
        title={title}
        aria-label={title}
      >
        {isThisSpeaking && !isThisPaused ? (
          <span className="voice-wave-icon">
            <span /><span /><span />
          </span>
        ) : isThisPaused ? (
          <ResumeIcon size={size} />
        ) : (
          <SpeakIcon size={size} />
        )}
      </button>
      {(isThisSpeaking || isThisPaused) && (
        <button
          className="voice-btn voice-stop-btn"
          onClick={handleStop}
          title="Stop"
          aria-label="Stop speaking"
        >
          <StopIcon size={size} />
        </button>
      )}
    </span>
  );
};

export default VoiceButton;