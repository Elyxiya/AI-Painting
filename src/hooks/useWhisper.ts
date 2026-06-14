import { useCallback, useRef } from 'react';
import { useVoiceStore } from '@/stores/voice.store';
import { default as transcriber } from '@/services/whisper.service';
import type { VoiceCommand } from '@/shared/types';

export interface UseWhisperReturn {
  status: string;
  interimText: string;
  finalText: string;
  isRecording: boolean;
  error: string | undefined;
  language: string;
  continuousMode: boolean;
  commandQueue: VoiceCommand[];

  startRecording: () => void;
  stopRecording: () => void;
  setInterimText: (text: string) => void;
  setTranscript: (text: string) => void;
  setError: (message: string) => void;
  addCommand: (text: string) => string;
  executeCommand: (id: string) => void;
  rejectCommand: (id: string) => void;
  clearCommands: () => void;
  setLanguage: (language: string) => void;
  setContinuousMode: (enabled: boolean) => void;
  reset: () => void;
}

export function useWhisper(): UseWhisperReturn {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const transcription = useVoiceStore((s) => s.transcription);
  const commandQueue = useVoiceStore((s) => s.commandQueue);
  const settings = useVoiceStore((s) => s.settings);
  const error = useVoiceStore((s) => s.error);
  const startRecordingAction = useVoiceStore((s) => s.startRecording);
  const stopRecordingAction = useVoiceStore((s) => s.stopRecording);
  const setInterimText = useVoiceStore((s) => s.setInterimText);
  const setTranscript = useVoiceStore((s) => s.setTranscript);
  const setErrorAction = useVoiceStore((s) => s.setError);
  const addCommand = useVoiceStore((s) => s.addCommand);
  const executeCommand = useVoiceStore((s) => s.executeCommand);
  const rejectCommand = useVoiceStore((s) => s.rejectCommand);
  const clearCommands = useVoiceStore((s) => s.clearCommands);
  const setLanguage = useVoiceStore((s) => s.setLanguage);
  const setContinuousMode = useVoiceStore((s) => s.setContinuousMode);
  const resetAction = useVoiceStore((s) => s.reset);
  const setStatus = useVoiceStore((s) => s.setStatus);

  const startRecording = useCallback(() => {
    audioChunksRef.current = [];

    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });

          try {
            const text = await transcriber.transcribe(audioBlob);
            setTranscript(text);
            setStatus('idle');
          } catch (err) {
            setErrorAction(err instanceof Error ? err.message : 'Transcription failed');
          }
        };

        mediaRecorder.start();
        startRecordingAction();
      })
      .catch((err) => {
        setErrorAction(err instanceof Error ? err.message : 'Failed to access microphone');
      });
  }, [startRecordingAction, setTranscript, setErrorAction, setStatus]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
      stopRecordingAction();
    }
  }, [stopRecordingAction]);

  return {
    status: transcription.status,
    interimText: transcription.interimText,
    finalText: transcription.finalText,
    isRecording: transcription.status === 'recording',
    error,
    language: settings.language,
    continuousMode: settings.continuousMode,
    commandQueue,

    startRecording,
    stopRecording,
    setInterimText,
    setTranscript,
    setError: setErrorAction,
    addCommand,
    executeCommand,
    rejectCommand,
    clearCommands,
    setLanguage,
    setContinuousMode,
    reset: resetAction,
  };
}
