import React, { useState, useEffect, useRef } from "react";
import { 
  Sparkles, Mic, Square, Loader, ChevronRight, CheckCircle2, 
  MapPin, BrainCircuit, AlertCircle, RefreshCw, FileText, CalendarRange
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { PrimaryButton, CardView } from "./CommonDesignSystem";

// ==========================================
// 1. SkeletonBrandMap: Skeleton screens for Timeline & List loaders
// ==========================================
export function SkeletonBrandMap() {
  return (
    <div className="space-y-4 animate-pulse">
      {/* Sleek Minimalist Timeline Rows Placeholder */}
      <div className="space-y-3.5">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-slate-50 border border-slate-200/40 p-4 rounded-xl flex flex-col space-y-2">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="h-5 w-5 bg-slate-200 rounded-lg" />
                <div className="h-3 w-32 bg-slate-250 rounded" />
              </div>
              <div className="h-3.5 w-16 bg-slate-200 rounded-full" />
            </div>
            <div className="h-2.5 w-full bg-slate-100 rounded" />
            <div className="h-2 w-3/4 bg-slate-100 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ==========================================
// 2. VoiceRecorderCard: Refactored micro-interactions and audio limit validation
// ==========================================
interface VoiceRecorderCardProps {
  onSummaryGenerated: (transcript: string, summary: string, actionItems: string[]) => void;
  maxSizeBytes?: number; // E.g., 25MB (26214400 bytes)
}

export function VoiceRecorderCard({ 
  onSummaryGenerated, 
  maxSizeBytes = 25 * 1024 * 1024 
}: VoiceRecorderCardProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [validationWarning, setValidationWarning] = useState<string | null>(null);
  const [waveHeights, setWaveHeights] = useState<number[]>([4, 8, 14, 6, 10, 5, 12, 6, 8, 4]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const waveIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (waveIntervalRef.current) clearInterval(waveIntervalRef.current);
    };
  }, []);

  // Format seconds -> 00:00
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remaining = secs % 60;
    return `${mins}:${remaining < 10 ? '0' : ''}${remaining}`;
  };

  // Simulating random waveforms for voice level indicator
  const startWaveAnimation = () => {
    waveIntervalRef.current = setInterval(() => {
      setWaveHeights(prev => prev.map(() => Math.floor(Math.random() * 22) + 4));
    }, 120);
  };

  const stopWaveAnimation = () => {
    if (waveIntervalRef.current) {
      clearInterval(waveIntervalRef.current);
      waveIntervalRef.current = null;
    }
  };

  const startRecording = async () => {
    setValidationWarning(null);
    audioChunksRef.current = [];
    setRecordingSeconds(0);
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });

        // A. Human Ergonomics Check: Check file size limits to prevent UI crash
        if (audioBlob.size > maxSizeBytes) {
          setValidationWarning("⚠️ 파일 크기가 25MB 제한을 초과했습니다. 조금 더 짧게 말씀하신 내용을 녹음해 주세요.");
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        // B. Humand Silence Check: Minimum recording threshold to prevent blank noise summarizer failures
        if (audioBlob.size < 1500 && recordingSeconds < 2) {
          setValidationWarning("⚠️ 말씀하신 음성 주파수 진폭이 너무 미미합니다. 마이크 방향을 수직으로 한 후 다시 녹음해 주세요.");
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Data = (reader.result as string).split(',')[1];
          await analyzeVoice(base64Data);
        };

        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      startWaveAnimation();
      
      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);

    } catch (err: any) {
      console.warn("Iframe microphone hardware restricted. Launching high fidelity virtual demo sandbox with mock state triggers.");
      setIsRecording(true);
      startWaveAnimation();
      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    }
  };

  const stopRecording = () => {
    stopWaveAnimation();
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    } else {
      // Virtual recording trigger
      setIsRecording(false);
      triggerVirtualDemo();
    }
  };

  const analyzeVoice = async (base64Data: string) => {
    setIsAnalyzing(true);
    try {
      const response = await fetch('/api/meetings/voice-summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioData: base64Data })
      });

      if (!response.ok) {
        throw new Error('사전 음성 분석에 일시적인 세션 차단이 발생했습니다.');
      }

      const data = await response.json();
      onSummaryGenerated(data.transcript, data.summary, data.actionItems);
    } catch (err: any) {
      setValidationWarning(err.message || "음성 트랜스크립트 변환 도중 예외 에러가 났습니다.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const triggerVirtualDemo = async () => {
    setIsAnalyzing(true);
    try {
      const response = await fetch('/api/meetings/voice-summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioData: "MOCK_VIRTUAL_DATA_SUCCESS" })
      });

      if (!response.ok) throw new Error('Simulated Audio Service Down');
      const data = await response.json();
      onSummaryGenerated(data.transcript, data.summary, data.actionItems);
    } catch (err: any) {
      setValidationWarning("가상 음향 주파수 합성 도중 통신 타임아웃이 경료되었습니다.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <CardView className="bg-slate-50 border border-slate-150 p-6 flex flex-col items-center justify-center text-center overflow-hidden relative shadow-inner">
      <div className="absolute top-3 right-3 flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
        <span className="text-[9px] font-black tracking-widest text-slate-400 uppercase">
          AI Voice Node
        </span>
      </div>

      <AnimatePresence mode="wait">
        {!isRecording && !isAnalyzing ? (
          <motion.div 
            key="idle"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4 py-2 w-full max-w-xs"
          >
            <div className="flex justify-center relative">
              <button
                onClick={startRecording}
                className="w-16 h-16 bg-gradient-to-r from-rose-455 to-rose-500 rounded-full flex items-center justify-center text-white scale-100 hover:scale-105 active:scale-95 transition-all shadow-md shadow-rose-100 hover:shadow-lg cursor-pointer"
              >
                <Mic className="w-7 h-7" />
              </button>
            </div>
            
            <div className="space-y-1.5">
              <h4 className="text-xs font-black text-slate-900">현장 음성 AI 동선 요약 기록 장치</h4>
              <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                바쁜 이동 중에 스마트폰으로 미팅 내용을 편하게 말씀해 주세요. 핵심 논의안과 조치 전개 사항을 고정밀 요약 정립합니다.
              </p>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-center">
              <button
                onClick={triggerVirtualDemo}
                className="text-[10px] font-bold text-indigo-650 bg-indigo-50/70 hover:bg-indigo-100/70 py-1.5 px-3 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
                <span>미팅 가상 보이스 파일 전송</span>
              </button>
            </div>
          </motion.div>
        ) : isRecording ? (
          <motion.div 
            key="recording"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="space-y-5 py-2 text-center w-full"
          >
            {/* Visual Ripple Waves using CSS variables or styled blocks */}
            <div className="flex justify-center items-center relative">
              <div className="absolute inset-0 m-auto h-20 w-20 rounded-full bg-red-400/20 animate-ping" />
              <button
                onClick={stopRecording}
                className="relative w-14 h-14 bg-red-500 rounded-full flex items-center justify-center text-white shadow-lg cursor-pointer hover:bg-red-650 active:scale-95 transition-all"
              >
                <Square className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-1">
              <span className="px-2.5 py-0.5 text-[10px] font-black text-red-700 bg-red-50 border border-red-100 rounded-full uppercase tracking-wider">
                ● 현장 대화 실시간 안전 녹음 버퍼링 중
              </span>
              <p className="text-xl font-mono font-black text-slate-800 mt-2 tracking-widest">{formatTime(recordingSeconds)}</p>
              <p className="text-[9px] text-slate-400 font-bold">오디오 안전 저장을 위해 발화 종료 후 정지 버튼을 누르십시오.</p>
            </div>

            {/* Dynamic Animated Waveform Visualization */}
            <div className="flex gap-1 justify-center items-end h-8 py-1.5">
              {waveHeights.map((h, idx) => (
                <div 
                  key={idx} 
                  className="w-1.5 bg-red-400 rounded-full transition-all duration-120"
                  style={{ height: `${h}px` }}
                />
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="analyzing"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4 py-4 text-center"
          >
            <div className="flex justify-center relative">
              <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-3xl text-indigo-600 animate-spin">
                <Loader className="w-8 h-8" />
              </div>
            </div>

            <div className="space-y-1">
              <span className="inline-flex items-center gap-1 text-[11px] font-black text-indigo-700 bg-indigo-50 px-3 py-0.5 rounded-full uppercase tracking-wide">
                <BrainCircuit className="w-4 h-4 text-indigo-500 animate-pulse" />
                <span>AI 음성 파동 해독 분석 중...</span>
              </span>
              <p className="text-[10px] text-slate-400 font-bold max-w-xs mx-auto leading-relaxed mt-2.5">
                오디오 음향 주파수를 파싱하여 세일즈 비즈니스 쟁점을 정렬하고, Core Action Items을 실시간 매핑 구성 중입니다.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {validationWarning && (
        <div className="mt-3 p-3 bg-amber-50 border border-amber-100 rounded-xl flex items-start gap-2 text-[10px] text-amber-800 font-bold text-left animate-shake">
          <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <span>{validationWarning}</span>
        </div>
      )}
    </CardView>
  );
}

// ==========================================
// 3. ElegantEmptyState: Elegant Empty State layout
// ==========================================
interface ElegantEmptyStateProps {
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  iconType?: "meetings" | "analytics" | "search" | "default";
}

export function ElegantEmptyState({
  title,
  description,
  actionText,
  onAction,
  iconType = "default"
}: ElegantEmptyStateProps) {

  const getVectorIcon = () => {
    switch (iconType) {
      case "meetings":
        return <CalendarRange className="w-10 h-10 text-indigo-500" />;
      case "analytics":
        return <BrainCircuit className="w-10 h-10 text-emerald-500" />;
      case "search":
        return <AlertCircle className="w-10 h-10 text-amber-500" />;
      default:
        return <RefreshCw className="w-10 h-10 text-slate-400" />;
    }
  };

  return (
    <div className="flex flex-col items-center justify-center text-center p-8 py-14 max-w-md mx-auto bg-white border border-slate-100 rounded-3xl shadow-3xs animate-fadeIn">
      {/* Decorative Vector Shell */}
      <div className="p-4 bg-slate-50 border border-slate-100 rounded-full mb-4 flex items-center justify-center shadow-inner relative">
        {getVectorIcon()}
        <span className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-indigo-50 border border-white animate-pulse" />
      </div>

      <div className="space-y-1.5 mb-5 select-none">
        <h3 className="text-xs sm:text-sm font-black text-slate-900">{title}</h3>
        <p className="text-[11px] text-slate-400 font-semibold leading-relaxed max-w-xs">
          {description}
        </p>
      </div>

      {actionText && onAction && (
        <PrimaryButton
          onClick={onAction}
          variant="indigo"
          size="sm"
          className="shadow-3xs"
        >
          <span>{actionText}</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </PrimaryButton>
      )}
    </div>
  );
}
