import { useState, useEffect, useRef } from "react";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface VoiceInputButtonProps {
  language: string; // e.g. "English", "मराठी (Marathi)", "हिन्दी (Hindi)"
  onTranscript: (text: string) => void;
  className?: string;
}

export default function VoiceInputButton({
  language,
  onTranscript,
  className = "",
}: VoiceInputButtonProps) {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Map user interface language to BCP 47 language code for Web Speech API
  const getLanguageCode = (lang: string) => {
    if (lang.includes("मराठी") || lang.toLowerCase().includes("marathi")) return "mr-IN";
    if (lang.includes("हिन्दी") || lang.toLowerCase().includes("hindi")) return "hi-IN";
    return "en-IN";
  };

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = getLanguageCode(language);

    recognition.onresult = (event: any) => {
      let currentTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          currentTranscript += event.results[i][0].transcript + " ";
        }
      }
      if (currentTranscript.trim()) {
        onTranscript(currentTranscript.trim());
      }
    };

    recognition.onerror = (event: any) => {
      console.warn("Speech recognition error", event.error);
      if (event.error !== "no-speech") {
        toast.error(`Voice input error: ${event.error}`);
        setIsListening(false);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
    };
  }, [language, onTranscript]);

  const toggleListening = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      toast.error("Voice input is not supported in this browser. Please use Chrome/Edge.");
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      toast.info("Voice input stopped");
    } else {
      try {
        if (recognitionRef.current) {
          recognitionRef.current.lang = getLanguageCode(language);
          recognitionRef.current.start();
          setIsListening(true);
          const langLabel = language.includes("मराठी")
            ? "मराठी (Marathi)"
            : language.includes("हिन्दी")
            ? "हिन्दी (Hindi)"
            : "English";
          toast.success(`Listening in ${langLabel}... Speak now!`);
        }
      } catch (err: any) {
        console.error("Failed to start speech recognition", err);
        setIsListening(false);
      }
    }
  };

  return (
    <button
      type="button"
      onClick={toggleListening}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
        isListening
          ? "bg-red-500 text-white animate-pulse shadow-md"
          : "bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200"
      } ${className}`}
      title={isListening ? "Click to stop listening" : `Dictate in ${language}`}
    >
      {isListening ? (
        <>
          <MicOff size={14} className="animate-spin text-white" />
          <span>Listening ({language.split(" ")[0]})...</span>
        </>
      ) : (
        <>
          <Mic size={14} className="text-blue-600" />
          <span>Voice Input ({language.split(" ")[0]})</span>
        </>
      )}
    </button>
  );
}
