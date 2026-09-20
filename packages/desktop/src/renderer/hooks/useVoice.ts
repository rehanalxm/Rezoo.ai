import { useState, useRef, useCallback, useEffect } from 'react';

interface VoiceOptions {
  onTranscript?: (text: string, isFinal: boolean) => void;
  onWakeWord?: () => void;
  onUserInterrupted?: () => void;
}

export function useVoice(options?: VoiceOptions) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('rezoo_mic_granted') === 'true') {
      return true;
    }
    return null;
  });
  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const isSpeakingRef = useRef(false);
  const optionsRef = useRef<VoiceOptions | undefined>(options);
  const silenceTimerRef = useRef<any>(null);
  const latestTranscriptRef = useRef<string>('');

  optionsRef.current = options;
  isSpeakingRef.current = isSpeaking;

  // Prompt user for Microphone Permission
  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      if (typeof navigator !== 'undefined' && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((track) => track.stop());
        setHasPermission(true);
        try {
          localStorage.setItem('rezoo_mic_granted', 'true');
        } catch {}
        return true;
      }
      setHasPermission(true);
      return true;
    } catch (err: any) {
      console.warn('Microphone permission check:', err?.message || err);
      setHasPermission(false);
      return false;
    }
  }, []);

  const speakingTimeoutRef = useRef<any>(null);
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const lastSpokeTimestampRef = useRef<number>(0);

  const stopSpeaking = useCallback(() => {
    lastSpokeTimestampRef.current = Date.now();
    if (speakingTimeoutRef.current) {
      clearTimeout(speakingTimeoutRef.current);
      speakingTimeoutRef.current = null;
    }
    currentUtteranceRef.current = null;
    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignored
      }
    }
    setIsSpeaking(false);
    isSpeakingRef.current = false;
  }, []);

  const shouldListenRef = useRef(false);

  const initRecognition = useCallback(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn('SpeechRecognition API not supported in this browser.');
      return null;
    }

    try {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.onend = null;
          recognitionRef.current.abort();
        } catch {}
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      // Support Indian English / multilingual detection
      recognition.lang = navigator.language || 'en-IN';

      recognition.onstart = () => {
        setIsListening(true);
        setHasPermission(true);
      };

      recognition.onresult = (event: any) => {
        // 🛑 Anti-Echo / Anti-Self-Listening: Ignore mic audio if assistant is speaking or just finished within 700ms
        if (isSpeakingRef.current || (Date.now() - lastSpokeTimestampRef.current < 700)) {
          return;
        }

        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const item = event.results[i];
          if (item.isFinal) {
            finalTranscript += item[0].transcript;
          } else {
            interimTranscript += item[0].transcript;
          }
        }

        const currentText = (finalTranscript || interimTranscript).trim();
        if (currentText.length > 0) {
          latestTranscriptRef.current = currentText;

          // Realtime live partial transcript
          optionsRef.current?.onTranscript?.(currentText, false);

          // Silence timer debounce: If user pauses for 800ms, process full speech!
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
          }
          silenceTimerRef.current = setTimeout(() => {
            if (latestTranscriptRef.current) {
              optionsRef.current?.onTranscript?.(latestTranscriptRef.current, true);
              latestTranscriptRef.current = '';
            }
          }, 800);
        }

        if (finalTranscript) {
          if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
          optionsRef.current?.onTranscript?.(finalTranscript.trim(), true);
          latestTranscriptRef.current = '';
        }
      };

      recognition.onerror = (err: any) => {
        if (err.error === 'not-allowed') {
          shouldListenRef.current = false;
          setHasPermission(false);
          setIsListening(false);
        } else if (err.error !== 'no-speech') {
          console.warn('Speech recognition warning:', err.error);
        }
      };

      recognition.onend = () => {
        // 🔄 ALWAYS-ON AUTO-RESTART: If continuous listening is enabled, keep mic alive!
        if (shouldListenRef.current) {
          setTimeout(() => {
            if (shouldListenRef.current) {
              try {
                recognition.start();
                setIsListening(true);
              } catch {
                // Ignore restart overlap
              }
            }
          }, 250);
        } else {
          setIsListening(false);
        }
      };

      recognitionRef.current = recognition;
      return recognition;
    } catch (e) {
      console.error('Failed to init speech recognition:', e);
      return null;
    }
  }, [stopSpeaking]);

  const start = useCallback(async () => {
    shouldListenRef.current = true;
    stopSpeaking();
    await requestPermission();

    let rec = recognitionRef.current;
    if (!rec) {
      rec = initRecognition();
    }

    if (rec) {
      try {
        rec.start();
        setIsListening(true);
      } catch (err: any) {
        try {
          rec = initRecognition();
          rec?.start();
          setIsListening(true);
        } catch (e) {
          console.warn('Recognition start retry failed:', e);
        }
      }
    }
  }, [stopSpeaking, requestPermission, initRecognition]);

  const stop = useCallback(() => {
    shouldListenRef.current = false;
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    setIsListening(false);
  }, []);

  const speakText = useCallback((text: string) => {
    if (!('speechSynthesis' in window)) return;

    try {
      stopSpeaking();
      window.speechSynthesis.resume();

      const utterance = new SpeechSynthesisUtterance(text);
      currentUtteranceRef.current = utterance;
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        const naturalVoice =
          voices.find((v) => v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Zira') || v.name.includes('David') || v.name.includes('Jenny')) ||
          voices.find((v) => v.lang.startsWith('en')) ||
          voices[0];

        if (naturalVoice) {
          utterance.voice = naturalVoice;
        }
      }

      const words = text.split(/\s+/).length;
      const estimatedDurationMs = Math.max(1200, words * 400 + 800);

      utterance.onstart = () => {
        setIsSpeaking(true);
        isSpeakingRef.current = true;
      };
      utterance.onend = () => {
        lastSpokeTimestampRef.current = Date.now();
        if (speakingTimeoutRef.current) clearTimeout(speakingTimeoutRef.current);
        currentUtteranceRef.current = null;
        setIsSpeaking(false);
        isSpeakingRef.current = false;
      };
      utterance.onerror = () => {
        lastSpokeTimestampRef.current = Date.now();
        if (speakingTimeoutRef.current) clearTimeout(speakingTimeoutRef.current);
        currentUtteranceRef.current = null;
        setIsSpeaking(false);
        isSpeakingRef.current = false;
      };

      // Safety timeout in case Chromium drops onend event
      speakingTimeoutRef.current = setTimeout(() => {
        lastSpokeTimestampRef.current = Date.now();
        currentUtteranceRef.current = null;
        setIsSpeaking(false);
        isSpeakingRef.current = false;
      }, estimatedDurationMs);

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.error('Speech synthesis error:', err);
      setIsSpeaking(false);
      isSpeakingRef.current = false;
    }
  }, [stopSpeaking]);

  const playAudio = useCallback(async (base64Audio: string) => {
    stopSpeaking();
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }

    try {
      const binaryStr = atob(base64Audio);
      const len = binaryStr.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }

      const audioBuffer = await audioContextRef.current.decodeAudioData(bytes.buffer);
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);

      setIsSpeaking(true);
      isSpeakingRef.current = true;
      source.onended = () => {
        setIsSpeaking(false);
        isSpeakingRef.current = false;
      };
      source.start();
    } catch (e) {
      console.error('Error playing audio', e);
      setIsSpeaking(false);
      isSpeakingRef.current = false;
    }
  }, [stopSpeaking]);

  return {
    isListening,
    isSpeaking,
    hasPermission,
    requestPermission,
    start,
    stop,
    speakText,
    stopSpeaking,
    playAudio,
  };
}
