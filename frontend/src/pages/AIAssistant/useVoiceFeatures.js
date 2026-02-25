/**
 * useVoiceFeatures.js
 * Custom React hook for Text-to-Speech and Speech-to-Text functionality
 * 
 * Usage:
 *   import { useVoiceFeatures } from '../hooks/useVoiceFeatures';
 *   const { tts, stt } = useVoiceFeatures();
 */

import { useState, useRef, useCallback, useEffect } from 'react';

// ─── Text-to-Speech Hook ───────────────────────────────────────────────────────
export function useTTS() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState(null);
  const [isPaused, setIsPaused] = useState(false);
  const utteranceRef = useRef(null);
  const [voices, setVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState(null);
  const [rate, setRate] = useState(1.0);
  const [pitch, setPitch] = useState(1.0);

  // Load available voices
  useEffect(() => {
    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      if (availableVoices.length > 0) {
        setVoices(availableVoices);
        // Prefer a natural English voice
        const preferred = availableVoices.find(v =>
          (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Neural')) &&
          v.lang.startsWith('en')
        ) || availableVoices.find(v => v.lang.startsWith('en')) || availableVoices[0];
        setSelectedVoice(preferred);
      }
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => { window.speechSynthesis.onvoiceschanged = null; };
  }, []);

  // Clean up markdown for speech (remove symbols that shouldn't be spoken)
  const cleanTextForSpeech = (text) => {
    return text
      .replace(/```[\s\S]*?```/g, 'code block') // replace code blocks
      .replace(/`([^`]+)`/g, '$1')               // inline code
      .replace(/\*\*([^*]+)\*\*/g, '$1')         // bold
      .replace(/\*([^*]+)\*/g, '$1')             // italic
      .replace(/#{1,6}\s/g, '')                  // headers
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')   // links
      .replace(/[-*]\s/g, '')                    // list bullets
      .replace(/\d+\.\s/g, '')                   // numbered lists
      .replace(/---+/g, ' ')                      // horizontal rules
      .replace(/\n{3,}/g, '. ')                  // excessive newlines
      .replace(/\n/g, ' ')                        // single newlines
      .replace(/\s{2,}/g, ' ')                   // multiple spaces
      .trim();
  };

  const speak = useCallback((text, messageId = null) => {
    if (!window.speechSynthesis) {
      console.warn('Speech synthesis not supported');
      return;
    }

    // Stop any current speech
    window.speechSynthesis.cancel();

    const cleaned = cleanTextForSpeech(text);
    if (!cleaned) return;

    const utterance = new SpeechSynthesisUtterance(cleaned);
    utterance.voice = selectedVoice;
    utterance.rate = rate;
    utterance.pitch = pitch;
    utterance.volume = 1.0;

    utterance.onstart = () => {
      setIsSpeaking(true);
      setIsPaused(false);
      setSpeakingMessageId(messageId);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      setIsPaused(false);
      setSpeakingMessageId(null);
    };

    utterance.onerror = (e) => {
      if (e.error !== 'interrupted') {
        console.error('TTS error:', e.error);
      }
      setIsSpeaking(false);
      setIsPaused(false);
      setSpeakingMessageId(null);
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [selectedVoice, rate, pitch]);

  const stop = useCallback(() => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setIsPaused(false);
    setSpeakingMessageId(null);
  }, []);

  const togglePause = useCallback(() => {
    if (isPaused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
    } else {
      window.speechSynthesis.pause();
      setIsPaused(true);
    }
  }, [isPaused]);

  const isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  return {
    speak,
    stop,
    togglePause,
    isSpeaking,
    isPaused,
    speakingMessageId,
    isSupported,
    voices,
    selectedVoice,
    setSelectedVoice,
    rate,
    setRate,
    pitch,
    setPitch,
  };
}

// ─── Speech-to-Text Hook ───────────────────────────────────────────────────────
export function useSTT({ onTranscript, onInterimTranscript } = {}) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState(null);
  const recognitionRef = useRef(null);

  const isSupported = typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  const start = useCallback((existingText = '') => {
    if (!isSupported) {
      setError('Speech recognition is not supported in this browser. Try Chrome or Edge.');
      return;
    }

    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
    };

    recognition.onresult = (event) => {
      let finalText = '';
      let interimText = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalText += result[0].transcript;
        } else {
          interimText += result[0].transcript;
        }
      }

      if (finalText) {
        const newTranscript = existingText
          ? `${existingText} ${finalText}`.trim()
          : finalText.trim();
        setTranscript(newTranscript);
        setInterimTranscript('');
        onTranscript?.(newTranscript);
        // Update existing text for next chunk
        existingText = newTranscript;
      }

      if (interimText) {
        setInterimTranscript(interimText);
        onInterimTranscript?.(interimText);
      }
    };

    recognition.onerror = (event) => {
      if (event.error === 'no-speech') {
        setError('No speech detected. Please try again.');
      } else if (event.error === 'not-allowed') {
        setError('Microphone access denied. Please allow microphone permissions.');
      } else if (event.error !== 'aborted') {
        setError(`Speech recognition error: ${event.error}`);
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      setInterimTranscript('');
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [isSupported, onTranscript, onInterimTranscript]);

  const stop = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
    setInterimTranscript('');
  }, []);

  const reset = useCallback(() => {
    stop();
    setTranscript('');
    setInterimTranscript('');
    setError(null);
  }, [stop]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  return {
    start,
    stop,
    reset,
    isListening,
    transcript,
    interimTranscript,
    error,
    isSupported,
  };
}

export default { useTTS, useSTT };