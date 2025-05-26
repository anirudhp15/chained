"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Mic, MicOff, Square, Play, Pause, Trash2 } from "lucide-react";

interface VoiceRecorderProps {
  onRecordingComplete: (
    audioBlob: Blob,
    duration: number,
    transcription: string
  ) => void;
  onRecordingCancel?: () => void;
  disabled?: boolean;
  className?: string;
}

interface AudioVisualizerProps {
  audioData: number[];
  isRecording: boolean;
}

function AudioVisualizer({ audioData, isRecording }: AudioVisualizerProps) {
  return (
    <div className="flex items-center justify-center h-16 px-4">
      <div className="flex items-end space-x-1 h-12">
        {audioData.map((amplitude, index) => (
          <div
            key={index}
            className={`w-1 bg-gradient-to-t from-lavender-500 to-lavender-300 rounded-full transition-all duration-75 ${
              isRecording ? "animate-pulse" : ""
            }`}
            style={{
              height: `${Math.max(2, amplitude * 48)}px`,
              opacity: isRecording ? 1 : 0.6,
            }}
          />
        ))}
      </div>
    </div>
  );
}

export function VoiceRecorder({
  onRecordingComplete,
  onRecordingCancel,
  disabled = false,
  className = "",
}: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioData, setAudioData] = useState<number[]>(new Array(40).fill(0));
  const [hasRecording, setHasRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const animationRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recordingStartTimeRef = useRef<number>(0);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
  }, []);

  // Audio visualization
  const updateAudioData = useCallback(() => {
    if (!analyserRef.current || !isRecording) return;

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyserRef.current.getByteFrequencyData(dataArray);

    // Process audio data for visualization
    const newAudioData = new Array(40).fill(0);
    const chunkSize = Math.floor(bufferLength / 40);

    for (let i = 0; i < 40; i++) {
      let sum = 0;
      for (let j = 0; j < chunkSize; j++) {
        sum += dataArray[i * chunkSize + j];
      }
      newAudioData[i] = sum / chunkSize / 255;
    }

    setAudioData(newAudioData);
    animationRef.current = requestAnimationFrame(updateAudioData);
  }, [isRecording]);

  // Start recording
  const startRecording = async () => {
    if (disabled) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Set up audio context for visualization
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      analyserRef.current.fftSize = 256;

      // Set up media recorder
      mediaRecorderRef.current = new MediaRecorder(stream);
      chunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
        const duration = (Date.now() - recordingStartTimeRef.current) / 1000;
        onRecordingComplete(audioBlob, duration, "");
        setHasRecording(true);
      };

      // Start recording
      mediaRecorderRef.current.start();
      recordingStartTimeRef.current = Date.now();
      setIsRecording(true);
      setIsPaused(false);
      setRecordingTime(0);
      setHasRecording(false);

      // Start timer
      intervalRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);

      // Start visualization
      updateAudioData();
    } catch (error) {
      console.error("Error starting recording:", error);
    }
  };

  // Stop recording
  const stopRecording = useCallback(async () => {
    if (!mediaRecorderRef.current || !isRecording) return;

    setIsRecording(false);
    setIsProcessing(true);

    mediaRecorderRef.current.stop();

    // Stop all tracks to release microphone
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }

    // Wait for the audio blob to be available
    const audioBlob = await new Promise<Blob>((resolve) => {
      const handleDataAvailable = (event: BlobEvent) => {
        if (event.data.size > 0) {
          resolve(event.data);
        }
      };

      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.addEventListener(
          "dataavailable",
          handleDataAvailable,
          { once: true }
        );
      }
    });

    try {
      // Create form data for transcription
      const formData = new FormData();
      formData.append("audio", audioBlob, "recording.webm");

      // Call transcription API
      const response = await fetch("/api/transcribe-audio", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();

        // Call the callback with both audio blob and transcription
        onRecordingComplete(
          audioBlob,
          (Date.now() - recordingStartTimeRef.current) / 1000,
          result.transcription
        );

        // Show success feedback
        setError(null);
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Transcription failed");

        // Still provide the audio blob even if transcription failed
        onRecordingComplete(
          audioBlob,
          (Date.now() - recordingStartTimeRef.current) / 1000,
          ""
        );
      }
    } catch (error) {
      console.error("Transcription error:", error);
      setError("Failed to transcribe audio");

      // Still provide the audio blob even if transcription failed
      onRecordingComplete(
        audioBlob,
        (Date.now() - recordingStartTimeRef.current) / 1000,
        ""
      );
    } finally {
      setIsProcessing(false);
    }
  }, [isRecording, onRecordingComplete]);

  // Cancel recording
  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      setRecordingTime(0);
      setHasRecording(false);
      cleanup();
      onRecordingCancel?.();
    }
  };

  // Format time display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return (
    <div
      className={`bg-gray-800 rounded-lg border border-gray-700 ${className}`}
    >
      {/* Recording Interface */}
      {isRecording ? (
        <div className="p-4 space-y-4">
          {/* Waveform Visualization */}
          <AudioVisualizer audioData={audioData} isRecording={isRecording} />

          {/* Recording Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                <span className="text-sm font-medium text-gray-300">
                  {formatTime(recordingTime)}
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={cancelRecording}
                className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                title="Cancel recording"
              >
                <Trash2 size={18} />
              </button>
              <button
                onClick={stopRecording}
                className="p-3 bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors"
                title="Stop recording"
              >
                <Square size={18} />
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Start Recording Button */
        <div className="p-4">
          <button
            onClick={startRecording}
            disabled={disabled}
            className={`
              w-full flex items-center justify-center space-x-2 p-3 rounded-lg transition-all
              ${
                disabled
                  ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                  : "bg-lavender-600 hover:bg-lavender-700 text-white"
              }
            `}
          >
            <Mic size={18} />
            <span className="font-medium">Start Recording</span>
          </button>
        </div>
      )}
    </div>
  );
}
