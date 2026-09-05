import React, { useState, useRef, useEffect } from "react";
import {
  Mic,
  MicOff,
  Square,
  Play,
  Pause,
  UploadCloud,
  Sparkles,
  RefreshCw,
  Volume2,
  Trash2,
  FileAudio,
  Radio,
  AlertCircle
} from "lucide-react";

interface AudioJournalRecorderProps {
  onTranscriptionComplete: (text: string, autoSubmit?: boolean) => void;
  disabled?: boolean;
}

export const AudioJournalRecorder: React.FC<AudioJournalRecorderProps> = ({
  onTranscriptionComplete,
  disabled = false,
}) => {
  const [mode, setMode] = useState<"mic" | "live_dictation" | "upload">("mic");
  
  // MediaRecorder states
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  
  // Transcribing state
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);

  // Live Speech Recognition states
  const [isLiveListening, setIsLiveListening] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [speechSupported, setSpeechSupported] = useState(false);

  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Check speech recognition support on mount
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSpeechSupported(true);
    }
  }, []);

  // Timer effect for recording
  useEffect(() => {
    if (isRecording && !isPaused) {
      timerRef.current = window.setInterval(() => {
        setRecordDuration((prev) => prev + 1);
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording, isPaused]);

  // Clean up object URLs
  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
    };
  }, [audioUrl]);

  // Format seconds to mm:ss
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // --- Mode 1: MediaRecorder (High quality audio for Gemini) ---
  const startAudioRecording = async () => {
    setAudioError(null);
    setAudioBlob(null);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    setRecordDuration(0);
    audioChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : MediaRecorder.isTypeSupported("audio/mp4")
        ? "audio/mp4"
        : "";

      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const type = recorder.mimeType || "audio/webm";
        const blob = new Blob(audioChunksRef.current, { type });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        // Stop all audio tracks to release microphone
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start(250);
      setIsRecording(true);
      setIsPaused(false);
    } catch (err: any) {
      console.error("Microphone access error:", err);
      setAudioError(
        err.name === "NotAllowedError" || err.name === "PermissionDeniedError"
          ? "Microphone access was denied. Please check browser permissions."
          : "Unable to access microphone: " + (err.message || "Unknown error")
      );
    }
  };

  const stopAudioRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
    }
  };

  const togglePauseRecording = () => {
    if (!mediaRecorderRef.current) return;
    if (isPaused) {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
    } else {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
    }
  };

  const discardRecording = () => {
    if (isRecording) {
      stopAudioRecording();
    }
    setAudioBlob(null);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    setRecordDuration(0);
    setAudioError(null);
  };

  // Convert Blob to base64 and transcribe via Gemini
  const transcribeRecordedAudio = async (blobToTranscribe?: Blob) => {
    const targetBlob = blobToTranscribe || audioBlob;
    if (!targetBlob) return;

    setIsTranscribing(true);
    setAudioError(null);

    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const res = reader.result as string;
          resolve(res);
        };
        reader.onerror = reject;
      });
      reader.readAsDataURL(targetBlob);
      const fullDataUrl = await base64Promise;

      const res = await fetch("/api/transcribe-audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audioBase64: fullDataUrl,
          mimeType: targetBlob.type || "audio/webm",
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Gemini audio transcription failed.");
      }

      if (data.text) {
        onTranscriptionComplete(data.text);
      } else {
        throw new Error("No speech could be recognized. Please speak closer to the mic.");
      }
    } catch (err: any) {
      console.error("Transcription error:", err);
      setAudioError(err.message || "Failed to transcribe audio.");
    } finally {
      setIsTranscribing(false);
    }
  };

  // --- Mode 2: Live Speech Recognition (Web Speech API) ---
  const toggleLiveDictation = () => {
    if (isLiveListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsLiveListening(false);
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setAudioError("Your browser does not support live Web Speech dictation. Try Voice Recording instead!");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onstart = () => {
        setIsLiveListening(true);
        setAudioError(null);
      };

      recognition.onresult = (event: any) => {
        let interimText = "";
        let finalText = "";

        for (let i = 0; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalText += event.results[i][0].transcript + " ";
          } else {
            interimText += event.results[i][0].transcript;
          }
        }

        const combined = (finalText + interimText).trim();
        setLiveTranscript(combined);
        if (combined) {
          onTranscriptionComplete(combined);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn("Speech recognition error:", event.error);
        if (event.error === "not-allowed") {
          setAudioError("Microphone permission denied for speech recognition.");
        }
        setIsLiveListening(false);
      };

      recognition.onend = () => {
        setIsLiveListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      setAudioError("Could not start live dictation: " + err.message);
      setIsLiveListening(false);
    }
  };

  // --- Mode 3: Upload Audio File ---
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit: 10MB
    if (file.size > 10 * 1024 * 1024) {
      setAudioError("Audio file exceeds 10MB limit.");
      return;
    }

    setAudioBlob(file);
    const url = URL.createObjectURL(file);
    setAudioUrl(url);
    transcribeRecordedAudio(file);
  };

  const handleAudioPlaybackToggle = () => {
    if (!audioElementRef.current) return;
    if (isPlayingPreview) {
      audioElementRef.current.pause();
      setIsPlayingPreview(false);
    } else {
      audioElementRef.current.play();
      setIsPlayingPreview(true);
    }
  };

  return (
    <div className="border border-[#16241C] bg-[#F8F7F4] p-3.5 sm:p-4 space-y-3">
      {/* Top Header & Mode Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#16241C]/15 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-[#16241C] text-white flex items-center justify-center">
            <Radio className="w-3.5 h-3.5 text-[#2E7D52] animate-pulse" />
          </div>
          <div>
            <span className="font-serif text-sm font-normal text-[#16241C] block">
              Voice Journal Companion
            </span>
            <span className="font-mono text-[10px] text-[#16241C]/60 uppercase tracking-wider">
              Speak naturally — Gemini transcribes thoughts & converts FX
            </span>
          </div>
        </div>

        {/* Mode Selector */}
        <div className="flex items-center border border-[#16241C] bg-white font-mono text-xs uppercase tracking-wider">
          <button
            type="button"
            onClick={() => {
              setMode("mic");
              discardRecording();
            }}
            className={`px-3 py-1 font-semibold transition-colors cursor-pointer ${
              mode === "mic"
                ? "bg-[#16241C] text-white"
                : "text-[#16241C]/60 hover:text-[#16241C]"
            }`}
          >
            Voice Record
          </button>
          {speechSupported && (
            <button
              type="button"
              onClick={() => {
                setMode("live_dictation");
                discardRecording();
              }}
              className={`px-3 py-1 font-semibold transition-colors cursor-pointer border-l border-[#16241C] ${
                mode === "live_dictation"
                  ? "bg-[#16241C] text-white"
                  : "text-[#16241C]/60 hover:text-[#16241C]"
              }`}
            >
              Live Dictation
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setMode("upload");
              discardRecording();
            }}
            className={`px-3 py-1 font-semibold transition-colors cursor-pointer border-l border-[#16241C] ${
              mode === "upload"
                ? "bg-[#16241C] text-white"
                : "text-[#16241C]/60 hover:text-[#16241C]"
            }`}
          >
            Upload Audio
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {audioError && (
        <div className="p-2.5 border border-rose-300 bg-rose-50 text-rose-900 font-mono text-xs flex items-start gap-2">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-700 mt-0.5" />
          <span className="leading-snug">{audioError}</span>
        </div>
      )}

      {/* Mode 1: Voice Recording with MediaRecorder */}
      {mode === "mic" && (
        <div className="space-y-3">
          {!audioUrl && !isRecording && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-white border border-[#16241C]">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  id="start-mic-record-btn"
                  onClick={startAudioRecording}
                  disabled={disabled || isTranscribing}
                  className="w-10 h-10 bg-[#16241C] hover:bg-[#253E2F] text-white flex items-center justify-center transition-all cursor-pointer disabled:opacity-50"
                  title="Click to start recording your voice"
                >
                  <Mic className="w-5 h-5 text-[#88D4A8]" />
                </button>
                <div>
                  <p className="font-mono text-xs uppercase tracking-wider font-semibold text-[#16241C]">
                    Record a Voice Memo
                  </p>
                  <p className="text-[11px] text-[#16241C]/70">
                    Speak details like: &ldquo;Spent 45 euros on groceries at Carrefour today&rdquo;
                  </p>
                </div>
              </div>
              <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 border border-[#16241C]/30 text-[#16241C]">
                High Fidelity AI
              </span>
            </div>
          )}

          {/* Active Recording State */}
          {isRecording && (
            <div className="p-3.5 bg-white border border-[#16241C] flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 bg-rose-600 animate-ping shrink-0" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs uppercase tracking-wider font-bold text-[#16241C]">
                      {isPaused ? "Recording Paused" : "Listening..."}
                    </span>
                    <span className="font-mono text-xs px-2 py-0.5 bg-white text-[#16241C] border border-[#16241C]">
                      {formatTime(recordDuration)}
                    </span>
                  </div>
                  {/* Visual Soundwave animation */}
                  <div className="flex items-center gap-1 mt-1.5 h-3">
                    <span className="w-1 bg-[#2E7D52] animate-bounce [animation-delay:0ms] h-2"></span>
                    <span className="w-1 bg-[#2E7D52] animate-bounce [animation-delay:150ms] h-3"></span>
                    <span className="w-1 bg-[#2E7D52] animate-bounce [animation-delay:300ms] h-2.5"></span>
                    <span className="w-1 bg-[#2E7D52] animate-bounce [animation-delay:450ms] h-3.5"></span>
                    <span className="w-1 bg-[#2E7D52] animate-bounce [animation-delay:200ms] h-2"></span>
                    <span className="w-1 bg-[#2E7D52] animate-bounce [animation-delay:350ms] h-3"></span>
                  </div>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider">
                <button
                  type="button"
                  onClick={togglePauseRecording}
                  className="px-2.5 py-1.5 bg-white hover:bg-[#F8F7F4] text-[#16241C] border border-[#16241C] cursor-pointer"
                >
                  {isPaused ? "Resume" : "Pause"}
                </button>
                <button
                  type="button"
                  id="stop-mic-record-btn"
                  onClick={stopAudioRecording}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#16241C] hover:bg-[#253E2F] text-white font-semibold cursor-pointer"
                >
                  <Square className="w-3.5 h-3.5 text-rose-300" />
                  <span>Done</span>
                </button>
                <button
                  type="button"
                  onClick={discardRecording}
                  className="p-1.5 text-[#16241C]/60 hover:text-rose-600 transition-colors cursor-pointer"
                  title="Discard recording"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Finished Recording - Review & Transcribe */}
          {audioUrl && !isRecording && (
            <div className="p-3.5 bg-white border border-[#16241C] space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={handleAudioPlaybackToggle}
                    className="w-8 h-8 bg-[#16241C] text-white flex items-center justify-center cursor-pointer hover:bg-[#253E2F] transition-colors"
                  >
                    {isPlayingPreview ? (
                      <Pause className="w-4 h-4" />
                    ) : (
                      <Play className="w-4 h-4 ml-0.5" />
                    )}
                  </button>
                  <div>
                    <span className="font-mono text-xs uppercase tracking-wider font-semibold text-[#16241C] block">
                      Audio Memo Recorded ({formatTime(recordDuration)})
                    </span>
                    <span className="font-mono text-[10px] text-[#16241C]/60">
                      Ready for Gemini AI reflection
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider">
                  <button
                    type="button"
                    onClick={discardRecording}
                    disabled={isTranscribing}
                    className="text-[#16241C]/60 hover:text-rose-600 px-2 py-1 cursor-pointer"
                  >
                    Discard
                  </button>

                  <button
                    type="button"
                    id="transcribe-audio-btn"
                    onClick={() => transcribeRecordedAudio()}
                    disabled={isTranscribing}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#16241C] hover:bg-[#253E2F] text-white font-semibold cursor-pointer disabled:opacity-50"
                  >
                    {isTranscribing ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#88D4A8]" />
                        <span>Transcribing...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-[#2E7D52]" />
                        <span>Transcribe with Gemini</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Hidden audio element for preview */}
              <audio
                ref={audioElementRef}
                src={audioUrl}
                onEnded={() => setIsPlayingPreview(false)}
                className="hidden"
              />
            </div>
          )}
        </div>
      )}

      {/* Mode 2: Live Dictation with Web Speech API */}
      {mode === "live_dictation" && (
        <div className="p-3.5 bg-white border border-[#16241C] space-y-2.5">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                id="toggle-live-dictation-btn"
                onClick={toggleLiveDictation}
                className={`w-10 h-10 flex items-center justify-center transition-all cursor-pointer ${
                  isLiveListening
                    ? "bg-rose-700 text-white animate-pulse"
                    : "bg-[#16241C] hover:bg-[#253E2F] text-white"
                }`}
              >
                {isLiveListening ? (
                  <MicOff className="w-5 h-5" />
                ) : (
                  <Mic className="w-5 h-5 text-[#88D4A8]" />
                )}
              </button>
              <div>
                <p className="font-mono text-xs uppercase tracking-wider font-semibold text-[#16241C]">
                  {isLiveListening ? "Listening Live..." : "Live Dictation Mode"}
                </p>
                <p className="text-[11px] text-[#16241C]/70">
                  {isLiveListening
                    ? "Words will flow directly into the journal input box."
                    : "Click microphone and begin speaking. Browser will transcribe instantly."}
                </p>
              </div>
            </div>

            {isLiveListening && (
              <span className="inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider font-semibold text-rose-700 bg-rose-50 px-2.5 py-1 border border-rose-200">
                <span className="w-2 h-2 bg-rose-600 animate-ping"></span>
                Live Audio Stream
              </span>
            )}
          </div>
        </div>
      )}

      {/* Mode 3: Upload Audio File */}
      {mode === "upload" && (
        <div className="p-3.5 bg-white border border-[#16241C] text-center space-y-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*,.mp3,.wav,.m4a,.webm,.ogg"
            onChange={handleFileUpload}
            className="hidden"
          />

          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-[#16241C]/30 hover:border-[#16241C] hover:bg-[#F8F7F4] p-5 cursor-pointer transition-all flex flex-col items-center justify-center gap-2"
          >
            <div className="w-10 h-10 bg-[#16241C] text-white flex items-center justify-center">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <p className="font-mono text-xs uppercase tracking-wider font-semibold text-[#16241C]">
                Upload Voice Memo or Audio File
              </p>
              <p className="font-mono text-[10px] text-[#16241C]/60 mt-0.5">
                MP3, M4A, WAV, or WebM up to 10MB
              </p>
            </div>
            {isTranscribing && (
              <div className="inline-flex items-center gap-2 font-mono text-xs text-[#2E7D52] font-semibold mt-1">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Transcribing your audio file...</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
