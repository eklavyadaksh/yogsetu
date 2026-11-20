import React, { useState, useRef, useEffect } from 'react';
import {
  Mic,
  Plus,
  ArrowUp,
  X,
  Sparkles,
} from 'lucide-react';

/**
 * Single sacred Shloka: "योगः कर्मसु कौशलम्" (Bhagavad Gita 2.50)
 * Alternates serenely in a single clean line every 30 seconds:
 * 1) Sanskrit (Devanagari): योगः कर्मसु कौशलम्
 * 2) 3 Native Meaning Terms separated by dots: Yoga • Action • Excellence
 */
const KARMASU_STAGES = [
  {
    text: "योगः कर्मसु कौशलम्",
    fontClass: "font-serif font-black tracking-tight",
  },
  {
    text: "Yoga • Action • Excellence",
    fontClass: "font-instrument italic font-normal tracking-wide sm:text-6xl md:text-7xl text-4xl",
  },
];

interface AiConsultationHeroProps {
  onSubmit: (data: { text: string; imageFile: File | null }) => void;
  isLoading?: boolean;
}

export const AiConsultationHero: React.FC<AiConsultationHeroProps> = ({ onSubmit, isLoading }) => {
  const [promptText, setPromptText] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [speechFeedback, setSpeechFeedback] = useState<string | null>(null);
  const [stageIndex, setStageIndex] = useState(0);

  // Changes serenely after 30 seconds (not 'jaldi jaldi')
  useEffect(() => {
    const timer = setInterval(() => {
      setStageIndex((prev) => (prev + 1) % KARMASU_STAGES.length);
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const recognitionRef = useRef<any>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechSupported(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-IN'; // defaults to English-India / Hinglish friendly

      recognition.onstart = () => {
        setIsListening(true);
        setSpeechFeedback('Listening to your voice... Speak your symptom or goal now');
      };

      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((r: any) => r[0].transcript)
          .join('');
        setPromptText(transcript);
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech error:', event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          setSpeechFeedback('Microphone permission was denied. Please allow mic access.');
        } else {
          setSpeechFeedback('Voice recognition paused. You can also type your message.');
        }
        setTimeout(() => setSpeechFeedback(null), 4000);
      };

      recognition.onend = () => {
        setIsListening(false);
        setTimeout(() => setSpeechFeedback(null), 2500);
      };

      recognitionRef.current = recognition;
    } catch (e) {
      console.warn('Speech initialization failed', e);
      setSpeechSupported(false);
    }
  }, []);

  // Clean up object URL
  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  const toggleListening = () => {
    if (!speechSupported || !recognitionRef.current) {
      setSpeechFeedback('Speech recognition is not supported in this browser. Please type directly.');
      setTimeout(() => setSpeechFeedback(null), 3000);
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        setSpeechFeedback('Starting microphone...');
        recognitionRef.current.start();
      } catch (err) {
        console.warn('Recognition start error:', err);
      }
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Please choose an image file (PNG, JPG, WEBP).');
        return;
      }
      setSelectedImage(file);
      const url = URL.createObjectURL(file);
      setImagePreview(url);
    }
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
      setImagePreview(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!promptText.trim() && !selectedImage) return;

    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }

    onSubmit({
      text: promptText.trim(),
      imageFile: selectedImage,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const applyPreset = (preset: string) => {
    setPromptText(preset);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const canSubmit = (promptText.trim().length > 0 || selectedImage !== null) && !isLoading;

  return (
    <div className="w-full relative flex flex-col items-center justify-center pt-8 pb-12 px-4 sm:px-6 lg:px-8">
      {/* Background Ambient Glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden flex justify-center -z-10">
        <div className="w-[600px] h-[350px] bg-gradient-to-tr from-teal-500/10 via-emerald-600/10 to-teal-400/5 blur-3xl rounded-full transform -translate-y-12"></div>
      </div>

      <div className="w-full max-w-3xl mx-auto flex flex-col items-center text-center space-y-6">
        {/* Hackathon / Gemma Tag */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/80 text-teal-300 text-xs font-semibold backdrop-blur-md shadow-sm">
          <Sparkles className="w-3.5 h-3.5 text-teal-400 animate-pulse" />
          <span>YogSetu AI Therapy • Gemma 4 Vision</span>
        </div>

        {/* Single Sacred Shloka in ONE clean line, transitioning every 30s:
            1) Sanskrit: योगः कर्मसु कौशलम् (Fraunces serif)
            2) English: Yoga • Action • Excellence (Instrument Serif) */}
        {(() => {
          const currentStage = KARMASU_STAGES[stageIndex];
          return (
            <div className="w-full flex items-center justify-center max-w-4xl mx-auto py-1">
              <h1
                key={stageIndex}
                className={`text-3xl sm:text-5xl md:text-6xl text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-teal-100 to-cyan-300 drop-shadow-md text-center py-4 px-2 leading-relaxed animate-fade-in transition-all duration-700 select-none ${currentStage.fontClass}`}
              >
                {currentStage.text}
              </h1>
            </div>
          );
        })()}

        {/* Multi-modal Prompt Capsule Card */}
        <div className="w-full bg-[#1e232d] border border-slate-700/70 hover:border-slate-600/90 rounded-3xl p-3 sm:p-4 shadow-2xl transition-all duration-200">
          {/* Selected Image Preview Bar (if any) */}
          {imagePreview && (
            <div className="mb-3 p-2.5 bg-slate-900/80 rounded-2xl border border-slate-700/60 flex items-center justify-between text-left animate-fade-in">
              <div className="flex items-center gap-3 overflow-hidden">
                <img
                  src={imagePreview}
                  alt={selectedImage?.name ? `User attached photo: ${selectedImage.name}` : "User uploaded posture or prescription image"}
                  className="w-12 h-12 rounded-xl object-cover border border-slate-700 flex-shrink-0"
                />
                <div className="truncate text-xs">
                  <span className="font-semibold text-slate-200 block truncate">
                    {selectedImage?.name || 'Attached Photo'}
                  </span>
                  <span className="text-slate-400 text-[11px]">
                    {selectedImage ? `${(selectedImage.size / 1024).toFixed(0)} KB • Ready for Gemma analysis` : ''}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleRemoveImage}
                className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition"
                title="Remove image"
                aria-label="Remove image"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Speech Feedback Banner */}
          {speechFeedback && (
            <div
              role="status"
              aria-live="polite"
              className="mb-2.5 px-3 py-1.5 rounded-xl bg-teal-950/80 border border-teal-800/80 text-teal-300 text-xs flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-teal-400 animate-ping"></div>
                <span>{speechFeedback}</span>
              </div>
              {isListening && (
                <button
                  type="button"
                  onClick={toggleListening}
                  className="underline text-[11px] text-teal-200 font-bold"
                  aria-label="Stop microphone recording"
                >
                  Stop Mic
                </button>
              )}
            </div>
          )}

          {/* Input Textarea Area */}
          <div className="relative">
            <textarea
              ref={textareaRef}
              rows={2}
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              onKeyDown={handleKeyDown}
              aria-label="How can YogSetu help your body today?"
              placeholder="How can YogSetu help your body today? e.g. 'Lower back pain after 8 hours of sitting', '10 min morning posture'..."
              className="w-full bg-transparent text-slate-100 placeholder-slate-400 text-sm sm:text-base resize-none focus:outline-none px-2 pt-1 pb-1 font-sans leading-relaxed"
            />
          </div>

          {/* Action Row Inside the Capsule */}
          <div className="pt-2 mt-2 border-t border-slate-800/80 flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
            {/* Left Actions: Attachment + Mode */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* File upload button */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                aria-label="Upload prescription or posture photo"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={`p-2 rounded-xl transition flex items-center gap-1.5 text-xs font-medium ${
                  selectedImage
                    ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                }`}
                title="Attach photo or prescription note"
                aria-label="Attach photo or prescription note"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Attach</span>
              </button>

              {/* Mode indicator pill */}
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                <span>Gemma 4 Vision</span>
              </div>
            </div>

            {/* Right Actions: Voice Mic + Submit Button */}
            <div className="flex items-center gap-2 ml-auto">
              {/* Microphone Voice Button */}
              <button
                type="button"
                onClick={toggleListening}
                className={`p-2 rounded-xl transition flex items-center gap-1 text-xs font-semibold ${
                  isListening
                    ? 'bg-rose-500 text-white animate-pulse shadow-lg shadow-rose-500/40 ring-2 ring-rose-400'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                }`}
                title={isListening ? 'Stop listening' : 'Speak with your voice (Speech-to-Text)'}
                aria-label={isListening ? 'Stop listening' : 'Speak with your voice (Speech-to-Text)'}
              >
                {isListening ? (
                  <>
                    <Mic className="w-4 h-4 animate-bounce" />
                    <span className="text-[11px] hidden sm:inline">Listening...</span>
                  </>
                ) : (
                  <Mic className="w-4 h-4" />
                )}
              </button>

              {/* Submit Button */}
              <button
                type="button"
                onClick={() => handleSubmit()}
                disabled={!canSubmit}
                className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all ${
                  canSubmit
                    ? 'bg-teal-600 hover:bg-teal-500 text-white shadow-lg shadow-teal-600/30 active:scale-95 cursor-pointer'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
                title="Send query"
                aria-label="Generate AI yoga therapy plan"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <ArrowUp className="w-5 h-5 stroke-[2.5]" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Quick Suggestion Chips below capsule (Horizontal scroll on mobile, wrap on desktop) */}
        <div className="w-full flex items-center gap-2 overflow-x-auto no-scrollbar py-1 justify-start sm:justify-center flex-nowrap sm:flex-wrap text-xs">
          <span className="text-slate-400 font-medium text-[11px] whitespace-nowrap pl-1 sm:pl-0">
            Suggested:
          </span>
          {[
            { label: '💻 Desk Worker Relief', query: 'Lower back stiffness and neck pain from prolonged desk sitting' },
            { label: '🧘 Posture & Spine Alignment', query: 'Slouching posture alignment and spine flexibility' },
            { label: '⚡ 10-Min Morning Energy', query: 'Gentle 10-minute full body morning wake-up routine' },
            { label: '🌙 Stress & Deep Sleep', query: 'Calming bedtime yoga for stress and restorative sleep' },
            { label: '🦵 Knee & Joint Mobility', query: 'Gentle low-impact joint mobility without knee pressure' },
          ].map((item, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => applyPreset(item.query)}
              className="px-3 py-1.5 rounded-full bg-slate-800/70 hover:bg-slate-700/80 text-slate-300 hover:text-white border border-slate-700/60 whitespace-nowrap transition active:scale-95 text-xs flex-shrink-0"
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
