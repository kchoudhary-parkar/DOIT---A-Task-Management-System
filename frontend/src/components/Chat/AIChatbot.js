// export default AIChatbot;
import React, { useState, useRef, useEffect, useCallback } from 'react';

/* ═══════════════════════════════════════════════════════════════════════════
   DOIT-BOT  ·  Voice-Only AI Agent Interface
   Glass Sphere LED Robot → Click to activate → Speak → Agent replies in voice
   Connects to Azure AI Foundry Agent via /api/agent/* endpoints
   ═══════════════════════════════════════════════════════════════════════════ */

/* ─── LED dot-matrix definitions ──────────────────────────────────────────── */
const GAP = 10;  // grid spacing px
const OX  = 22;  // x-origin
const OY  = 52;  // y-origin
const DOT = 4.2; // dot radius

const EXPRESSIONS = {
  idle: {
    leftEye:  [[2,1],[3,0],[4,0],[5,0],[6,1]],
    rightEye: [[10,1],[11,0],[12,0],[13,0],[14,1]],
    mouth:    [[4,3],[5,4],[6,4],[7,4],[8,4],[9,4],[10,4],[11,3]],
  },
  listening: {
    leftEye:  [[2,0],[3,0],[4,0],[5,0],[6,0]],
    rightEye: [[10,0],[11,0],[12,0],[13,0],[14,0]],
    mouth:    [[6,3],[7,3],[8,3],[9,3],[10,3]],
  },
  thinking: {
    leftEye:  [[2,0],[3,1],[4,0],[5,1],[6,0]],
    rightEye: [[10,0],[11,1],[12,0],[13,1],[14,0]],
    mouth:    [[5,3],[6,3],[7,3],[9,3],[10,3],[11,3]],
  },
  speaking: {
    leftEye:  [[2,1],[3,0],[4,0],[5,0],[6,1]],
    rightEye: [[10,1],[11,0],[12,0],[13,0],[14,1]],
    mouth:    [[4,3],[5,3],[6,3],[7,3],[8,3],[9,3],[10,3],[11,3],
               [4,4],[5,4],[6,4],[7,4],[8,4],[9,4],[10,4],[11,4]],
  },
  happy: {
    leftEye:  [[2,1],[3,0],[4,0],[5,0],[6,1]],
    rightEye: [[10,1],[11,0],[12,0],[13,0],[14,1]],
    mouth:    [[3,3],[4,4],[5,4],[6,4],[7,4],[8,4],[9,4],[10,4],[11,4],[12,3]],
  },
  error: {
    leftEye:  [[2,0],[3,0],[4,1],[5,0],[6,0]],
    rightEye: [[10,0],[11,0],[12,1],[13,0],[14,0]],
    mouth:    [[4,4],[5,3],[6,3],[7,3],[8,3],[9,3],[10,3],[11,4]],
  },
};

/* ─── SVG LED Face ────────────────────────────────────────────────────────── */
function LedFace({ expression = 'idle', glowColor = '#38bdf8' }) {
  const expr = EXPRESSIONS[expression] || EXPRESSIONS.idle;
  const dots = [...expr.leftEye, ...expr.rightEye, ...expr.mouth];
  return (
    <>
      {dots.map(([gx, gy], i) => (
        <circle
          key={i}
          cx={OX + gx * GAP}
          cy={OY + gy * GAP}
          r={DOT}
          fill={glowColor}
          style={{
            filter: `drop-shadow(0 0 5px ${glowColor}) drop-shadow(0 0 10px ${glowColor}88)`,
            transition: 'all 0.12s ease',
          }}
        />
      ))}
    </>
  );
}

/* ─── Glass Sphere Robot SVG ─────────────────────────────────────────────── */
function RobotSphere({ expression, size = 80, glowColor = '#38bdf8', pulsing = false }) {
  const uid = `rs_${size}`;
  return (
    <svg
      width={size} height={size}
      viewBox="0 0 180 200"
      xmlns="http://www.w3.org/2000/svg"
      style={{
        display: 'block',
        filter: pulsing
          ? `drop-shadow(0 0 18px ${glowColor}) drop-shadow(0 8px 24px ${glowColor}66)`
          : `drop-shadow(0 8px 24px ${glowColor}44) drop-shadow(0 2px 8px rgba(0,0,0,0.5))`,
        transition: 'filter 0.35s ease',
      }}
    >
      <defs>
        <linearGradient id={`chrome_${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"   stopColor="#9ca3af" />
          <stop offset="30%"  stopColor="#e5e7eb" />
          <stop offset="60%"  stopColor="#6b7280" />
          <stop offset="100%" stopColor="#374151" />
        </linearGradient>
        <radialGradient id={`sphere_${uid}`} cx="38%" cy="30%" r="65%">
          <stop offset="0%"   stopColor="#1e293b" stopOpacity="0.7" />
          <stop offset="60%"  stopColor="#0f172a" stopOpacity="0.92" />
          <stop offset="100%" stopColor="#020617" />
        </radialGradient>
        <radialGradient id={`sheen_${uid}`} cx="30%" cy="22%" r="50%">
          <stop offset="0%"   stopColor="white" stopOpacity="0.3" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`glow_${uid}`} cx="50%" cy="90%" r="50%">
          <stop offset="0%"   stopColor={glowColor} stopOpacity="0.2" />
          <stop offset="100%" stopColor={glowColor} stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`cap_${uid}`} cx="35%" cy="30%" r="65%">
          <stop offset="0%"   stopColor={glowColor} />
          <stop offset="100%" stopColor={glowColor} stopOpacity="0.4" />
        </radialGradient>
        <linearGradient id={`ear_${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"   stopColor="#374151" />
          <stop offset="100%" stopColor="#111827" />
        </linearGradient>
      </defs>

      {/* Antenna */}
      <line x1="108" y1="8" x2="120" y2="30" stroke="#9ca3af" strokeWidth="2.5" strokeLinecap="round"/>
      <circle cx="120" cy="28" r="5" fill={`url(#cap_${uid})`}
        style={{ filter: `drop-shadow(0 0 6px ${glowColor})` }} />

      {/* Chrome ring */}
      <circle cx="90" cy="98" r="76" fill={`url(#chrome_${uid})`} />

      {/* Dark face plate */}
      <circle cx="90" cy="98" r="68" fill={`url(#sphere_${uid})`} />

      {/* LED face */}
      <LedFace expression={expression} glowColor={glowColor} />

      {/* Glass sheen highlight */}
      <ellipse cx="72" cy="72" rx="46" ry="36" fill={`url(#sheen_${uid})`} />

      {/* Bottom colour glow */}
      <circle cx="90" cy="98" r="68" fill={`url(#glow_${uid})`} />

      {/* Left ear */}
      <ellipse cx="16"  cy="98" rx="10" ry="14" fill={`url(#ear_${uid})`} stroke="#4b5563" strokeWidth="1"/>
      <ellipse cx="16"  cy="98" rx="5"  ry="8"  fill={glowColor} opacity="0.25" />

      {/* Right ear */}
      <ellipse cx="164" cy="98" rx="10" ry="14" fill={`url(#ear_${uid})`} stroke="#4b5563" strokeWidth="1"/>
      <ellipse cx="164" cy="98" rx="5"  ry="8"  fill={glowColor} opacity="0.25" />

      {/* Bow tie */}
      <polygon points="74,170 88,163 88,177" fill="#1e293b" stroke="#374151" strokeWidth="1"/>
      <polygon points="106,170 92,163 92,177" fill="#1e293b" stroke="#374151" strokeWidth="1"/>
      <ellipse cx="90" cy="170" rx="6" ry="5" fill="#374151" stroke="#4b5563" strokeWidth="1"/>
    </svg>
  );
}

/* ─── Expanding voice rings ──────────────────────────────────────────────── */
function VoiceRings({ active, color }) {
  if (!active) return null;
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          position: 'absolute',
          width: `${90 + i * 38}px`, height: `${90 + i * 38}px`,
          borderRadius: '50%',
          border: `1.5px solid ${color}`,
          opacity: 0,
          animation: `ringExpand 2.2s ease-out ${i * 0.55}s infinite`,
        }} />
      ))}
    </div>
  );
}

/* ─── Equalizer bars ─────────────────────────────────────────────────────── */
function EqualizerBars({ active, color }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      gap: '3px', height: '36px',
      opacity: active ? 1 : 0.12,
      transition: 'opacity 0.4s ease',
    }}>
      {Array.from({ length: 20 }).map((_, i) => (
        <div key={i} style={{
          width: '3px', borderRadius: '2px',
          background: color,
          boxShadow: active ? `0 0 6px ${color}88` : 'none',
          height: '6px',
          animation: active ? `eqBar 0.${4 + (i % 5)}s ease-in-out ${i * 0.04}s infinite alternate` : 'none',
        }} />
      ))}
    </div>
  );
}

/* ─── Mic waveform (user speaking) ──────────────────────────────────────── */
function MicWave({ active }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', height: '30px' }}>
      {Array.from({ length: 14 }).map((_, i) => (
        <div key={i} style={{
          width: '3px', borderRadius: '2px',
          background: '#f43f5e',
          boxShadow: active ? '0 0 6px #f43f5e88' : 'none',
          height: active ? `${6 + (i % 5) * 5}px` : '5px',
          animation: active ? `eqBar 0.${3 + (i % 4)}s ease-in-out ${i * 0.05}s infinite alternate` : 'none',
          opacity: active ? 1 : 0.18,
          transition: 'all 0.2s',
        }} />
      ))}
    </div>
  );
}

/* ─── Status pill ────────────────────────────────────────────────────────── */
function StatusPill({ label, color, pulse }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: '7px',
      padding: '5px 16px', borderRadius: '100px',
      background: `${color}12`, border: `1px solid ${color}35`,
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: '11px', fontWeight: 600, color, letterSpacing: '0.07em',
    }}>
      <div style={{
        width: '7px', height: '7px', borderRadius: '50%',
        background: color, boxShadow: `0 0 8px ${color}`,
        animation: pulse ? 'dotPulse 1s ease-in-out infinite' : 'none',
      }} />
      {label}
    </div>
  );
}

/* ─── Transcript bubble ──────────────────────────────────────────────────── */
function TranscriptBubble({ text, role }) {
  if (!text) return null;
  const isUser = role === 'user';
  return (
    <div style={{
      padding: '9px 13px',
      borderRadius: isUser ? '14px 14px 3px 14px' : '3px 14px 14px 14px',
      background: isUser ? 'rgba(244,63,94,0.1)' : 'rgba(56,189,248,0.07)',
      border: `1px solid ${isUser ? 'rgba(244,63,94,0.22)' : 'rgba(56,189,248,0.18)'}`,
      color: isUser ? '#fda4af' : '#bae6fd',
      fontSize: '12.5px', lineHeight: '1.6',
      fontFamily: "'Syne', sans-serif",
      wordBreak: 'break-word',
      animation: 'fadeSlideIn 0.25s ease',
    }}>
      <span style={{ fontSize: '9px', opacity: 0.5, display: 'block', marginBottom: '3px', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.06em' }}>
        {isUser ? '👤 YOU' : '🤖 DOIT-AI'}
      </span>
      {text}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   INCREMENTAL TTS - Speak as words arrive
   ═══════════════════════════════════════════════════════════════════════════ */
class IncrementalSpeaker {
  constructor(onAllSpeechEnd = null) {
    this.utteranceQueue = [];
    this.speaking = false;
    this.fullText = "";
    this.spokenText = "";
    this.minSentenceLength = 5;  // Lower threshold for faster response
    this.onAllSpeechEnd = onAllSpeechEnd;
    this.streamComplete = false;
  }

  // Add text chunk and speak immediately
  addChunk(text) {
    this.fullText += text;
    console.log('[Speaker] Chunk received:', text);
    
    // More aggressive sentence splitting - split on punctuation even without space
    const sentences = this.fullText.split(/([.!?:;]+)/);
    
    // Reconstruct complete sentences with their punctuation
    const completeParts = [];
    for (let i = 0; i < sentences.length - 2; i += 2) {
      if (sentences[i]) {
        completeParts.push(sentences[i] + (sentences[i + 1] || ''));
      }
    }
    
    // Keep the last incomplete part
    this.fullText = sentences[sentences.length - 1] || "";
    
    for (const sentence of completeParts) {
      const clean = sentence.trim();
      if (clean.length >= this.minSentenceLength) {
        console.log('[Speaker] Queuing sentence:', clean);
        this.spokenText += clean + " ";
        this.queueSpeech(clean);
      }
    }
  }

  // Queue speech utterance
  queueSpeech(text) {
    if (!text.trim()) return;
    
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 1.0;  // Normal speed for clarity
    utter.pitch = 1.05;
    
    // CRITICAL: Select fastest voice
    const voices = window.speechSynthesis.getVoices();
    const fast = voices.find(v => 
      v.lang.startsWith('en') && v.localService  // Local voices are faster
    ) || voices[0];
    if (fast) utter.voice = fast;
    
    utter.onend = () => {
      console.log('[Speaker] Utterance ended');
      this.speaking = false;
      this.processQueue();
    };
    
    utter.onerror = (e) => {
      console.warn('[TTS] Error:', e);
      this.speaking = false;
      this.processQueue();
    };
    
    this.utteranceQueue.push(utter);
    console.log('[Speaker] Queue size:', this.utteranceQueue.length);
    
    // Start speaking if not already
    if (!this.speaking) {
      this.processQueue();
    }
  }

  // Process speech queue
  processQueue() {
    if (this.utteranceQueue.length === 0) {
      this.speaking = false;
      console.log('[Speaker] Queue empty, stream complete:', this.streamComplete);
      
      // If stream is complete and queue is empty, we're done
      if (this.streamComplete && this.onAllSpeechEnd) {
        console.log('[Speaker] All speech finished!');
        this.onAllSpeechEnd();
      }
      return;
    }
    
    this.speaking = true;
    const utter = this.utteranceQueue.shift();
    console.log('[Speaker] Speaking utterance, remaining:', this.utteranceQueue.length);
    window.speechSynthesis.speak(utter);
  }

  // Flush remaining text
  flush() {
    console.log('[Speaker] Flushing remaining text:', this.fullText);
    this.streamComplete = true;
    
    if (this.fullText.trim()) {
      this.spokenText += this.fullText;
      this.queueSpeech(this.fullText);
      this.fullText = "";
    } else if (this.utteranceQueue.length === 0 && !this.speaking) {
      // Nothing to flush and nothing playing, we're done
      if (this.onAllSpeechEnd) {
        console.log('[Speaker] No remaining text, calling onAllSpeechEnd');
        this.onAllSpeechEnd();
      }
    }
  }

  // Stop all speech
  stop() {
    window.speechSynthesis.cancel();
    this.utteranceQueue = [];
    this.speaking = false;
    this.fullText = "";
    this.spokenText = "";
  }

  // Get all spoken text
  getSpokenText() {
    return this.spokenText;
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   STREAMING API CALL
   ═══════════════════════════════════════════════════════════════════════════ */
const useStreamingChat = (onChunk, onComplete, onError, onSpeechEnd) => {
  const sendStreamingMessage = useCallback(async (message, conversationHistory = []) => {
    const speaker = new IncrementalSpeaker(() => {
      // Called when ALL speech has finished
      console.log('[Stream] Speech completely finished');
      if (onSpeechEnd) onSpeechEnd();
    });
    let fullResponse = "";
    
    try {
      const token = localStorage.getItem('token');
      const tabKey = sessionStorage.getItem('tab_session_key');
      
      const response = await fetch('http://localhost:8000/api/chat/ask/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-Tab-Session-Key': tabKey || '',
        },
        body: JSON.stringify({
          message,
          conversationHistory,
          persona: 'friendly',
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;

          try {
            const data = JSON.parse(line.slice(6));

            if (data.type === 'start') {
              console.log('[Stream] Started:', data.mode);
            }
            else if (data.type === 'chunk') {
              const text = data.content;
              fullResponse += text;
              
              console.log('[Stream] Chunk:', text);
              
              // Speak immediately
              speaker.addChunk(text);
              
              // Update UI
              if (onChunk) onChunk(text);
            }
            else if (data.type === 'done') {
              console.log('[Stream] Complete');
              
              // Flush remaining text to speech
              speaker.flush();
              
              if (onComplete) {
                onComplete(data.full_response || fullResponse, data.insights);
              }
            }
            else if (data.type === 'error') {
              throw new Error(data.message);
            }
          } catch (parseErr) {
            console.warn('[Stream] Parse error:', parseErr);
          }
        }
      }
    } catch (err) {
      console.error('[Stream] Error:', err);
      speaker.stop();
      if (onError) onError(err);
    }

    return speaker;
  }, [onChunk, onComplete, onError, onSpeechEnd]);
  return { sendStreamingMessage };
};

/* ─── Conversation scroll log ────────────────────────────────────────────── */
function ConversationLog({ turns }) {
  const logRef = useRef(null);
  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' });
  }, [turns]);
  if (!turns.length) return null;
  return (
    <div ref={logRef} style={{
      width: '100%', maxHeight: '150px', overflowY: 'auto',
      display: 'flex', flexDirection: 'column', gap: '8px',
      padding: '0 1px',
      scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.08) transparent',
    }}>
      {turns.slice(-5).map((t, i) => (
        <TranscriptBubble key={i} text={t.text} role={t.role} />
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */
const AIChatbot = ({ user }) => {
  const [isOpen,      setIsOpen]      = useState(false);
  const [mode,        setMode]        = useState('idle');
  // mode: 'idle' | 'listening' | 'processing' | 'speaking' | 'error'
  const [expression,  setExpression]  = useState('idle');
  const [statusLabel, setStatusLabel] = useState('Tap mic to speak');
  const [transcript,  setTranscript]  = useState('');
  const [botText,     setBotText]     = useState('');
  const [turns,       setTurns]       = useState([]);
  const [convId,      setConvId]      = useState(null);
  const [errorMsg,    setErrorMsg]    = useState('');
  const [hasUnread,   setHasUnread]   = useState(false);

  const sttRef       = useRef(null);
  const exprTimer    = useRef(null);
  const listeningRef = useRef(false);
  const speakerRef   = useRef(null);  // For incremental TTS control

  /* ── Color per mode ──────────────────────────────────────────────── */
  const modeColor = {
    idle:       '#38bdf8',
    listening:  '#f43f5e',
    processing: '#f59e0b',
    speaking:   '#10b981',
    error:      '#ef4444',
  }[mode] || '#38bdf8';

  /* ── Expression helper ──────────────────────────────────────────── */
  const setExpr = useCallback((expr, ttl) => {
    clearTimeout(exprTimer.current);
    setExpression(expr);
    if (ttl) exprTimer.current = setTimeout(() => setExpression('idle'), ttl);
  }, []);

  /* ── Streaming chat hook ──────────────────────────────────────────── */
  const { sendStreamingMessage } = useStreamingChat(
    // onChunk
    (chunk) => {
      setBotText(prev => prev + chunk);
    },
    // onComplete (streaming finished, but speech may still be playing)
    (fullText, insights) => {
      console.log('[Chat] Stream complete, saving to conversation history');
      setTurns(prev => [...prev, { role: 'bot', text: fullText }]);
      // Don't set mode to idle yet - let onSpeechEnd handle it
    },
    // onError
    (err) => {
      setErrorMsg(err.message || 'Stream failed');
      setMode('error');
      setExpr('error', 3500);
      setStatusLabel('Error — tap to retry');
      setTimeout(() => {
        setMode('idle');
        setStatusLabel('Tap mic to speak');
        setErrorMsg('');
      }, 4500);
    },
    // onSpeechEnd (ALL speech finished)
    () => {
      console.log('[Chat] All speech finished, returning to idle');
      setMode('idle');
      setExpr('happy', 2500);
      setStatusLabel('Tap mic to speak');
      setBotText('');
      if (!isOpen) setHasUnread(true);
    }
  );

  /* ── Ensure AI Assistant conversation exists ─────────────────────── */
  const ensureConversation = useCallback(async () => {
    if (convId) return convId;
    try {
      const tabKey = sessionStorage.getItem('tab_session_key');
      const res = await fetch('http://localhost:8000/api/ai-assistant/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          'X-Tab-Session-Key': tabKey || '',
        },
        body: JSON.stringify({ title: `Voice Session — ${new Date().toLocaleTimeString()}` }),
      });
      const data = await res.json();
      if (data.success && data.conversation?._id) {
        const id = data.conversation._id;
        setConvId(id);
        return id;
      }
    } catch (e) {
      console.error('[DOIT-AI] Failed to create conversation:', e);
    }
    return null;
  }, [convId]);
  /* ── TTS: speak the agent reply ─────────────────────────────────── */
  const speakReply = useCallback((text) => {
    window.speechSynthesis?.cancel();
    setMode('speaking');
    setExpr('speaking');
    setStatusLabel('Speaking…');
    setBotText(text);

    const utter = new SpeechSynthesisUtterance(text);
    utter.rate  = 0.94;
    utter.pitch = 1.05;

    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v =>
      v.lang.startsWith('en') &&
      (v.name.includes('Samantha') || v.name.includes('Google') ||
       v.name.includes('Neural') || v.name.includes('Natural') || v.name.includes('Zira'))
    ) || voices.find(v => v.lang.startsWith('en'));
    if (preferred) utter.voice = preferred;

    utter.onend = () => {
      setMode('idle');
      setExpr('happy', 2500);
      setStatusLabel('Tap mic to speak');
      setBotText('');
      if (!isOpen) setHasUnread(true);
    };
    utter.onerror = () => {
      setMode('idle');
      setExpr('idle');
      setStatusLabel('Tap mic to speak');
      setBotText('');
    };

    window.speechSynthesis.speak(utter);
  }, [isOpen, setExpr]);

  /* ── Send transcript to DOIT-AI Assistant (GPT-5.2) ───────────── */
  /* ── Send to agent (STREAMING VERSION) ────────────────────────────── */
  const sendToAgent = useCallback(async (text) => {
    setMode('speaking');  // Start speaking mode immediately
    setExpr('speaking');
    setStatusLabel('Speaking…');
    setBotText('');  // Clear previous text

    try {
      // Start streaming request
      const speaker = await sendStreamingMessage(text, turns);
      speakerRef.current = speaker;
    } catch (err) {
      console.error('[DOIT-AI] Stream error:', err);
      setErrorMsg(err.message || 'Agent unreachable');
      setMode('error');
      setExpr('error', 3500);
      setStatusLabel('Error — tap to retry');
      setTimeout(() => {
        setMode('idle');
        setStatusLabel('Tap mic to speak');
        setErrorMsg('');
      }, 4500);
    }
  }, [sendStreamingMessage, turns, setExpr]);

  /* ── STT: start recognition ─────────────────────────────────────── */
  const startListening = useCallback(() => {
    if (mode === 'listening' || mode === 'processing') return;

    // Stop any ongoing speech
    if (mode === 'speaking') window.speechSynthesis?.cancel();

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setErrorMsg('Speech recognition requires Chrome or Edge browser.');
      setMode('error');
      setExpr('error', 4000);
      setStatusLabel('Browser not supported');
      setTimeout(() => { setMode('idle'); setStatusLabel('Tap mic to speak'); }, 4500);
      return;
    }

    const rec = new SR();
    rec.continuous      = false;
    rec.interimResults  = true;
    rec.lang            = 'en-US';
    rec.maxAlternatives = 1;
    sttRef.current = rec;
    listeningRef.current = true;

    let finalText = '';

    rec.onstart = () => {
      setMode('listening');
      setExpr('listening');
      setStatusLabel('Listening… speak now');
      setTranscript('');
      finalText = '';
    };

    rec.onresult = (e) => {
      let interim = '';
      for (const r of e.results) {
        if (r.isFinal) finalText += r[0].transcript + ' ';
        else interim += r[0].transcript;
      }
      setTranscript(finalText || interim);
    };

    rec.onend = () => {
      listeningRef.current = false;
      const cleaned = finalText.trim();
      setTranscript('');
      if (cleaned) {
        setTurns(prev => [...prev, { role: 'user', text: cleaned }]);
        sendToAgent(cleaned);
      } else {
        setMode('idle');
        setExpr('idle');
        setStatusLabel('No speech detected — tap to retry');
        setTimeout(() => setStatusLabel('Tap mic to speak'), 2500);
      }
    };

    rec.onerror = (e) => {
      listeningRef.current = false;
      if (e.error === 'no-speech') {
        setMode('idle');
        setExpr('idle');
        setStatusLabel('No speech — tap to retry');
        setTimeout(() => setStatusLabel('Tap mic to speak'), 2500);
        return;
      }
      if (e.error === 'aborted') return; // user stopped
      setMode('error');
      setExpr('error', 3000);
      setStatusLabel(`Mic: ${e.error}`);
      setTimeout(() => { setMode('idle'); setStatusLabel('Tap mic to speak'); }, 3500);
    };

    rec.start();
  }, [mode, sendToAgent, setExpr]);

  /* ── Stop listening ──────────────────────────────────────────────── */
  const stopListening = useCallback(() => {
    if (sttRef.current && listeningRef.current) sttRef.current.stop();
  }, []);

  /* ── Stop everything ─────────────────────────────────────────────── */
  /* ── Stop everything ─────────────────────────────────────────────── */
  const stopAll = useCallback(() => {
    if (speakerRef.current) {
      speakerRef.current.stop();
      speakerRef.current = null;
    }
    window.speechSynthesis?.cancel();
    if (sttRef.current) { try { sttRef.current.abort(); } catch(e){} sttRef.current = null; }
    listeningRef.current = false;
    clearTimeout(exprTimer.current);
    setMode('idle');
    setExpression('idle');
    setStatusLabel('Tap mic to speak');
    setTranscript('');
    setBotText('');
  }, []);

  /* ── Toggle popup ────────────────────────────────────────────────── */
  const toggleOpen = useCallback(() => {
    setIsOpen(prev => {
      const next = !prev;
      if (next) {
        setHasUnread(false);
        setExpr('happy', 1800);
        setStatusLabel('Tap mic to speak');
      } else {
        stopAll();
      }
      return next;
    });
  }, [stopAll, setExpr]);

  /* ── Mic button handler ──────────────────────────────────────────── */
  const handleMicPress = () => {
    if (mode === 'listening')  { stopListening(); return; }
    if (mode === 'speaking')   { stopAll(); return; }
    if (mode === 'processing') return;
    startListening();
  };

  /* ── Cleanup ─────────────────────────────────────────────────────── */
  useEffect(() => () => stopAll(), []);

  /* ── Mic button appearance per mode ─────────────────────────────── */
  const MicIconSVG = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
      <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
      <line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
    </svg>
  );
  const StopIconSVG = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
      <rect x="4" y="4" width="16" height="16" rx="3"/>
    </svg>
  );
  const SpinnerSVG = () => (
    <div style={{ width: '22px', height: '22px', border: '2px solid transparent', borderTopColor: '#f59e0b', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
  );

  const micCfg = {
    idle:       { icon: <MicIconSVG  />, label: 'SPEAK',    color: '#38bdf8', bg: 'rgba(56,189,248,0.1)',  border: 'rgba(56,189,248,0.3)' },
    listening:  { icon: <StopIconSVG />, label: 'STOP',     color: '#f43f5e', bg: 'rgba(244,63,94,0.12)',  border: 'rgba(244,63,94,0.35)' },
    processing: { icon: <SpinnerSVG  />, label: 'WAIT',     color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.25)' },
    speaking:   { icon: <StopIconSVG />, label: 'STOP',     color: '#10b981', bg: 'rgba(16,185,129,0.1)',  border: 'rgba(16,185,129,0.3)' },
    error:      { icon: <MicIconSVG  />, label: 'RETRY',    color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.3)' },
  }[mode];

  /* ─────────────────────────────────────────────────────────────────
     RENDER
  ────────────────────────────────────────────────────────────────── */
  return (
    <>
      {/* ── Global keyframes + font ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');

        @keyframes robotFloat {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-7px); }
        }
        @keyframes ringExpand {
          0%   { transform: scale(0.45); opacity: 0.8; }
          100% { transform: scale(1.7);  opacity: 0; }
        }
        @keyframes eqBar {
          0%   { height: 5px; }
          100% { height: 30px; }
        }
        @keyframes dotPulse {
          0%, 100% { opacity: 1;   box-shadow: 0 0 10px currentColor; }
          50%       { opacity: 0.4; box-shadow: 0 0 3px  currentColor; }
        }
        @keyframes ping {
          0%   { transform: scale(1);   opacity: 0.9; }
          80%  { transform: scale(2.4); opacity: 0; }
          100% { transform: scale(2.8); opacity: 0; }
        }
        @keyframes popupIn {
          from { opacity: 0; transform: translateY(18px) scale(0.93); }
          to   { opacity: 1; transform: translateY(0)    scale(1); }
        }
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes processPulse {
          0%, 100% { opacity: 0.5; transform: scale(0.96); }
          50%       { opacity: 1;   transform: scale(1.04); }
        }

        .doit-log-scroll::-webkit-scrollbar { width: 3px; }
        .doit-log-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 3px; }

        .doit-mic-btn {
          transition: transform 0.18s ease, box-shadow 0.18s ease, filter 0.18s ease !important;
        }
        .doit-mic-btn:hover:not(:disabled) {
          transform: scale(1.07) !important;
          filter: brightness(1.18) !important;
        }
        .doit-mic-btn:active:not(:disabled) {
          transform: scale(0.95) !important;
        }

        .doit-float-btn:hover { filter: brightness(1.1); }
      `}</style>

      {/* ══════════════════════════════════════════════════════════════
          FLOATING ROBOT ICON
      ══════════════════════════════════════════════════════════════ */}
      <button
        className="doit-float-btn"
        onClick={toggleOpen}
        title="DOIT-AI Voice Assistant"
        aria-label="Open DOIT AI Voice Assistant"
        style={{
          position: 'fixed', bottom: '24px', right: '24px',
          width: '84px', height: '84px',
          borderRadius: '50%', border: 'none',
          background: 'transparent', cursor: 'pointer',
          padding: 0, zIndex: 1001, outline: 'none',
          animation: 'robotFloat 3.8s ease-in-out infinite',
          transition: 'filter 0.2s ease',
        }}
      >
        <RobotSphere
          expression={isOpen ? 'happy' : expression}
          size={84}
          glowColor={modeColor}
          pulsing={mode === 'listening' || mode === 'speaking'}
        />
        {hasUnread && !isOpen && (
          <span style={{
            position: 'absolute', top: '6px', right: '6px',
            width: '13px', height: '13px',
            background: '#f43f5e', borderRadius: '50%',
            border: '2px solid #0c0f1a',
            animation: 'ping 1.3s ease infinite',
          }} />
        )}
      </button>

      {/* ══════════════════════════════════════════════════════════════
          VOICE POPUP
      ══════════════════════════════════════════════════════════════ */}
      {isOpen && (
        <div style={{
          position: 'fixed',
          bottom: '120px', right: '20px',
          width: '340px',
          maxWidth: 'calc(100vw - 40px)',
          borderRadius: '24px',
          overflow: 'hidden',
          background: 'linear-gradient(165deg, #08101f 0%, #0d1529 40%, #111e38 100%)',
          border: '1px solid rgba(56,189,248,0.15)',
          boxShadow: `
            0 40px 90px rgba(0,0,0,0.75),
            0 0 0 1px rgba(255,255,255,0.04),
            inset 0 1px 0 rgba(255,255,255,0.06),
            0 0 80px ${modeColor}0a
          `,
          zIndex: 1000,
          animation: 'popupIn 0.3s cubic-bezier(0.34,1.4,0.64,1)',
          fontFamily: "'Syne', sans-serif",
          transition: 'box-shadow 0.5s ease',
        }}>

          {/* ── Header ── */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '12px',
            padding: '14px 16px 10px',
            borderBottom: '1px solid rgba(255,255,255,0.045)',
            background: 'rgba(0,0,0,0.2)',
          }}>
            <RobotSphere expression={expression} size={38} glowColor={modeColor} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#f1f5f9', letterSpacing: '-0.02em' }}>
                DOIT-AI
              </div>
              <div style={{ fontSize: '9.5px', color: '#334155', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.1em', marginTop: '1px' }}>
                AZURE FOUNDRY · VOICE AGENT
              </div>
            </div>
            {/* Close */}
            <button
              onClick={toggleOpen}
              style={{
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: '9px', width: '30px', height: '30px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: '#475569', fontSize: '15px',
                transition: 'all 0.15s', outline: 'none',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.09)'; e.currentTarget.style.color = '#94a3b8'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = '#475569'; }}
            >✕</button>
          </div>

          {/* ── Body ── */}
          <div style={{ padding: '22px 18px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>

            {/* ── Large Robot with rings ── */}
            <div style={{ position: 'relative', width: '158px', height: '158px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <VoiceRings active={mode === 'listening'} color="#f43f5e" />
              <VoiceRings active={mode === 'speaking'}  color="#10b981" />
              <RobotSphere
                expression={expression}
                size={148}
                glowColor={modeColor}
                pulsing={mode === 'listening' || mode === 'processing' || mode === 'speaking'}
              />
              {/* Processing spinner */}
              {mode === 'processing' && (
                <div style={{
                  position: 'absolute', inset: '4px', borderRadius: '50%',
                  border: '2px solid transparent',
                  borderTopColor: '#f59e0b',
                  borderRightColor: '#f59e0b33',
                  animation: 'spin 1.1s linear infinite',
                  pointerEvents: 'none',
                }} />
              )}
            </div>

            {/* ── Status pill ── */}
            <StatusPill
              label={statusLabel}
              color={modeColor}
              pulse={mode !== 'idle'}
            />

            {/* ── Bot speaking equalizer ── */}
            <EqualizerBars active={mode === 'speaking'} color="#10b981" />

            {/* ── Mic waveform + live transcript (listening) ── */}
            {mode === 'listening' && (
              <div style={{ width: '100%', animation: 'fadeSlideIn 0.2s ease' }}>
                <MicWave active />
                {transcript && (
                  <div style={{
                    marginTop: '10px', padding: '8px 12px', borderRadius: '10px',
                    background: 'rgba(244,63,94,0.07)', border: '1px solid rgba(244,63,94,0.18)',
                    color: '#fda4af', fontSize: '12px', fontStyle: 'italic', lineHeight: '1.55',
                  }}>
                    {transcript}
                  </div>
                )}
              </div>
            )}

            {/* ── Bot text while speaking ── */}
            {mode === 'speaking' && botText && (
              <div style={{
                width: '100%', padding: '10px 14px', borderRadius: '12px',
                background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.18)',
                color: '#6ee7b7', fontSize: '12.5px', lineHeight: '1.65',
                maxHeight: '82px', overflowY: 'auto',
                animation: 'fadeSlideIn 0.3s ease',
              }}>
                {botText}
              </div>
            )}

            {/* ── Error ── */}
            {mode === 'error' && errorMsg && (
              <div style={{
                width: '100%', padding: '8px 12px', borderRadius: '10px',
                background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.22)',
                color: '#fca5a5', fontSize: '12px',
                animation: 'fadeSlideIn 0.2s ease',
              }}>
                ⚠ {errorMsg}
              </div>
            )}

            {/* ── Conversation log (idle with history) ── */}
            {turns.length > 0 && mode === 'idle' && (
              <div className="doit-log-scroll" style={{ width: '100%', animation: 'fadeSlideIn 0.3s ease' }}>
                <div style={{
                  fontSize: '9px', fontFamily: "'JetBrains Mono', monospace",
                  color: '#1e3a5f', letterSpacing: '0.1em', textTransform: 'uppercase',
                  marginBottom: '8px',
                }}>
                  Conversation
                </div>
                <ConversationLog turns={turns} />
              </div>
            )}

            {/* ── BIG MIC BUTTON ── */}
            <button
              className="doit-mic-btn"
              onClick={handleMicPress}
              disabled={mode === 'processing'}
              aria-label={micCfg.label}
              style={{
                width: '76px', height: '76px', borderRadius: '50%',
                border: `2px solid ${micCfg.border}`,
                background: micCfg.bg, color: micCfg.color,
                cursor: mode === 'processing' ? 'not-allowed' : 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: '4px',
                boxShadow: `0 0 28px ${micCfg.color}20, inset 0 1px 0 rgba(255,255,255,0.06)`,
                outline: 'none',
                animation: mode === 'listening' ? 'dotPulse 1.2s ease infinite' : 'none',
              }}
            >
              {micCfg.icon}
              <span style={{
                fontSize: '8.5px', fontFamily: "'JetBrains Mono', monospace",
                fontWeight: 700, letterSpacing: '0.1em',
              }}>
                {micCfg.label}
              </span>
            </button>

            {/* ── Reset conversation ── */}
            {turns.length > 0 && (
              <button
                onClick={() => { stopAll(); setTurns([]); setConvId(null); setErrorMsg(''); }}
                style={{
                  background: 'none', border: 'none',
                  color: '#1e3a5f', fontSize: '10.5px',
                  fontFamily: "'JetBrains Mono', monospace",
                  cursor: 'pointer', letterSpacing: '0.04em',
                  padding: '3px 8px', borderRadius: '6px',
                  transition: 'color 0.15s', outline: 'none',
                }}
                onMouseEnter={e => e.currentTarget.style.color = '#475569'}
                onMouseLeave={e => e.currentTarget.style.color = '#1e3a5f'}
              >
                ↺ New conversation
              </button>
            )}
          </div>

          {/* ── Footer ── */}
          <div style={{
            padding: '7px 16px 10px',
            borderTop: '1px solid rgba(255,255,255,0.035)',
            textAlign: 'center',
            fontSize: '9px', fontFamily: "'JetBrains Mono', monospace",
            color: '#0f2035', letterSpacing: '0.07em',
          }}>
            DOIT-AI · Azure AI Foundry · Voice Only Interface
          </div>
        </div>
      )}
    </>
  );
};

export default AIChatbot;