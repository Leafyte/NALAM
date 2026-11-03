import { RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder, useAudioRecorderState } from 'expo-audio';
import { useCallback, useRef } from 'react';

export function useRecorder() {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const state = useAudioRecorderState(recorder);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stop = useCallback(async (): Promise<string | null> => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    try {
      await recorder.stop();
      await setAudioModeAsync({ allowsRecording: false });
      return recorder.uri;
    } catch {
      return null;
    }
  }, [recorder]);

  const start = useCallback(async (): Promise<boolean> => {
    try {
      const perm = await requestRecordingPermissionsAsync();
      if (!perm.granted) return false;
      await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      // Auto-stop after 60 seconds as a safety ceiling
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        stop();
      }, 60000);
      return true;
    } catch {
      return false;
    }
  }, [recorder, stop]);

  return { start, stop, isRecording: state.isRecording };
}
