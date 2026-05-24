"use client";

import { useState, useRef } from "react";
import { Mic, MicOff, Loader2 } from "lucide-react";

interface MicrophoneButtonProps {
  onTranscript: (text: string) => void;
  disabled?: boolean;
}

export default function MicrophoneButton({ onTranscript, disabled }: MicrophoneButtonProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
        await transcribeAudio(audioBlob);
        
        // Detener todos los tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Error al acceder al micrófono:", error);
      alert("No se pudo acceder al micrófono. Por favor verifica los permisos.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const transcribeAudio = async (audioBlob: Blob) => {
    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append("audio", audioBlob, "audio.webm");

      const response = await fetch("/api/speech-to-text", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Error al transcribir el audio");
      }

      const data = await response.json();
      if (data.text) {
        onTranscript(data.text);
      }
    } catch (error) {
      console.error("Error al transcribir audio:", error);
      alert("Error al transcribir el audio. Por favor intenta de nuevo.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || isProcessing}
      className={`p-2 rounded-xl transition-all ${
        isRecording
          ? "bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20"
          : "bg-zinc-800 text-zinc-400 border border-zinc-700 hover:bg-zinc-700 hover:text-zinc-300"
      } ${disabled || isProcessing ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
      title={isRecording ? "Detener grabación" : "Grabar nota de voz"}
    >
      {isProcessing ? (
        <Loader2 size={16} className="animate-spin" />
      ) : isRecording ? (
        <MicOff size={16} />
      ) : (
        <Mic size={16} />
      )}
    </button>
  );
}
