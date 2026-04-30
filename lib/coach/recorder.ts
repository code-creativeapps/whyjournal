import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { File } from 'expo-file-system';
import * as React from 'react';

export type RecordedAudio = {
  base64: string;
  mimeType: string;
  fileExt: string;
  uri: string;
};

export function useCoachRecorder() {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const state = useAudioRecorderState(recorder);
  const [error, setError] = React.useState<string | null>(null);

  const start = React.useCallback(async () => {
    setError(null);
    try {
      const perm = await AudioModule.requestRecordingPermissionsAsync();
      if (!perm.granted) {
        setError('Microphone permission denied');
        return false;
      }
      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
        shouldPlayInBackground: false,
        interruptionMode: 'mixWithOthers',
      });
      await recorder.prepareToRecordAsync();
      recorder.record();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return false;
    }
  }, [recorder]);

  const stop = React.useCallback(async (): Promise<RecordedAudio | null> => {
    try {
      await recorder.stop();
      const uri = recorder.uri;
      if (!uri) return null;
      const base64 = await new File(uri).base64();
      const fileExt = uri.split('.').pop()?.toLowerCase() ?? 'm4a';
      const mimeType = fileExt === 'wav' ? 'audio/wav' : 'audio/m4a';
      return { base64, mimeType, fileExt, uri };
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return null;
    }
  }, [recorder]);

  return {
    start,
    stop,
    isRecording: state.isRecording,
    durationMs: state.durationMillis ?? 0,
    error,
  };
}
