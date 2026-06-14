/**
 * Whisper ASR Service with real implementation.
 *
 * Priority order:
 * 1. @xenova/transformers (local WASM, privacy-first, fast)
 * 2. Web Speech API (browser built-in, no setup)
 * 3. Mock (fallback for environments without either)
 */

export interface Transcriber {
  transcribe(audioBlob: Blob): Promise<string>;
  readonly engine: 'transformers' | 'webspeech' | 'mock';
}

// ── Transformers-based Whisper ────────────────────────────────────────────────
async function createTransformersTranscriber(): Promise<Transcriber | null> {
  try {
    const { pipeline, env } = await import('@xenova/transformers');
    env.backends.onnx.wasm.numThreads = 4;
    const transcriber = await pipeline('automatic-speech-recognition', 'Xenova/whisper-base');
    return {
      engine: 'transformers' as const,
      async transcribe(audioBlob: Blob): Promise<string> {
        const arrayBuffer = await audioBlob.arrayBuffer();
        const audioData = new Float32Array(arrayBuffer);
        const result = await transcriber(audioData, {
          task: 'transcribe',
          language: 'auto',
          chunk_length_s: 30,
          return_timestamps: false,
        }) as { text?: string };
        return (result.text ?? '').trim();
      },
    };
  } catch {
    return null;
  }
}

// ── Web Speech API ───────────────────────────────────────────────────────────
// Using `any` because the Web Speech API types are incomplete in TypeScript's DOM lib.
function createWebSpeechTranscriber(): Transcriber {
  return {
    engine: 'webspeech' as const,
    async transcribe(_audioBlob: Blob): Promise<string> {
      return new Promise((resolve, reject) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const win = window as any;
        const SpeechRecognitionCtor = win.SpeechRecognition ?? win.webkitSpeechRecognition;
        if (!SpeechRecognitionCtor) {
          reject(new Error('Web Speech API not supported'));
          return;
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const recognition = new SpeechRecognitionCtor() as any;
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'zh-CN,en-US;q=0.9';
        recognition.onresult = (event: { results: Array<Array<{ transcript: string }>> }) => {
          resolve(event.results[0]?.[0]?.transcript?.trim() ?? '');
        };
        recognition.onerror = (event: { error: string }) => {
          reject(new Error(`Web Speech error: ${event.error}`));
        };
        recognition.onend = () => {
          resolve('');
        };
        recognition.start();
        setTimeout(() => {
          recognition.stop();
        }, 10000);
      });
    },
  };
}

// ── Mock fallback ───────────────────────────────────────────────────────────
const mockTranscriber: Transcriber = {
  engine: 'mock' as const,
  async transcribe(_audioBlob: Blob): Promise<string> {
    return '';
  },
};

// ── Factory ──────────────────────────────────────────────────────────────────
let _cachedTranscriber: Transcriber | null = null;

export async function createTranscriber(): Promise<Transcriber> {
  if (_cachedTranscriber) return _cachedTranscriber;

  const transformersTranscriber = await createTransformersTranscriber();
  if (transformersTranscriber) {
    _cachedTranscriber = transformersTranscriber;
    console.warn('[WhisperService] Using @xenova/transformers engine');
    return _cachedTranscriber;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const win = window as any;
  const SpeechRecognitionCtor = win.SpeechRecognition ?? win.webkitSpeechRecognition;
  if (SpeechRecognitionCtor) {
    _cachedTranscriber = createWebSpeechTranscriber();
    console.warn('[WhisperService] Using Web Speech API engine');
    return _cachedTranscriber;
  }

  console.warn('[WhisperService] No transcription engine available, using mock');
  _cachedTranscriber = mockTranscriber;
  return _cachedTranscriber;
}

export function getTranscriberEngine(): Transcriber['engine'] {
  return _cachedTranscriber?.engine ?? 'mock';
}

export { mockTranscriber };
export default mockTranscriber;
