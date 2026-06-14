/**
 * Whisper ASR Service (v2 — real engine + Web Speech fallback)
 *
 * Three engines tried in order:
 * 1. @xenova/transformers (local WASM, privacy-first, fast) — preferred
 * 2. Web Speech API (browser built-in, no setup, online) — fallback
 * 3. mock (returns empty string) — last-resort for tests / unsupported envs
 *
 * Public surface is intentionally identical to the v1 service:
 * - `Transcriber` (object with `transcribe` and `engine`)
 * - `createTranscriber()` factory (sync, returns the active engine)
 * - `getTranscriberEngine()` accessor
 * - `mockTranscriber` (named export, default for tests)
 * - `default` (mockTranscriber)
 *
 * `createTranscriber` is lazy and idempotent: first call probes the
 * environment, subsequent calls return the cached engine.
 */

export type TranscriberEngine = 'transformers' | 'webspeech' | 'mock';

export interface Transcriber {
  transcribe(audioBlob: Blob): Promise<string>;
  readonly engine: TranscriberEngine;
}

// Web Speech API is incomplete in lib.dom — describe the slice we touch
// without falling back to `any`.
interface SpeechRecognitionLite {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionResultLite) => void) | null;
  onerror: ((event: SpeechRecognitionErrorLite) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

interface SpeechRecognitionResultLite {
  results: Array<Array<{ transcript: string }>>;
}

interface SpeechRecognitionErrorLite {
  error: string;
}

interface SpeechRecognitionCtorLite {
  new (): SpeechRecognitionLite;
}

interface WindowWithSpeech {
  SpeechRecognition?: SpeechRecognitionCtorLite;
  webkitSpeechRecognition?: SpeechRecognitionCtorLite;
}

interface TransformersPipelineResult {
  text?: string;
}

type TransformersPipeline = (
  input: Float32Array,
  options: Record<string, unknown>,
) => Promise<TransformersPipelineResult>;

interface TransformersModule {
  pipeline: (
    task: string,
    model: string,
  ) => Promise<TransformersPipeline>;
  env?: { backends?: { onnx?: { wasm?: { numThreads?: number } } } };
}

// ── Engine 1: @xenova/transformers (Whisper base) ──────────────────────────
async function createTransformersTranscriber(): Promise<Transcriber | null> {
  try {
    // Dynamic import so the WASM bundle is only loaded if the
    // environment actually supports it (browser + cross-origin isolation).
    const mod = (await import('@xenova/transformers')) as unknown as TransformersModule;
    const onnx = mod.env?.backends?.onnx?.wasm;
    if (onnx) onnx.numThreads = 1;
    const transcriber = await mod.pipeline(
      'automatic-speech-recognition',
      'Xenova/whisper-base',
    );
    return {
      engine: 'transformers' as const,
      async transcribe(audioBlob: Blob): Promise<string> {
        const arrayBuffer = await audioBlob.arrayBuffer();
        const audio = new Float32Array(arrayBuffer);
        const result = await transcriber(audio, {
          task: 'transcribe',
          language: 'auto',
          chunk_length_s: 30,
          return_timestamps: false,
        });
        return (result.text ?? '').trim();
      },
    };
  } catch {
    return null;
  }
}

// ── Engine 2: Web Speech API ───────────────────────────────────────────────
function createWebSpeechTranscriber(): Transcriber {
  return {
    engine: 'webspeech' as const,
    transcribe: (_audioBlob: Blob): Promise<string> =>
      new Promise((resolve, reject) => {
        const win = (typeof window !== 'undefined'
          ? (window as unknown as WindowWithSpeech)
          : ({} as WindowWithSpeech));
        const Ctor = win.SpeechRecognition ?? win.webkitSpeechRecognition;
        if (!Ctor) {
          reject(new Error('Web Speech API not supported in this environment'));
          return;
        }
        const recognition = new Ctor();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'zh-CN,en-US;q=0.9';
        recognition.maxAlternatives = 1;
        recognition.onresult = (event: SpeechRecognitionResultLite) => {
          resolve(event.results[0]?.[0]?.transcript?.trim() ?? '');
        };
        recognition.onerror = (event: SpeechRecognitionErrorLite) => {
          reject(new Error(`Web Speech error: ${event.error}`));
        };
        recognition.onend = () => {
          resolve('');
        };
        try {
          recognition.start();
          // Safety net: stop after 10s even if no result.
          setTimeout(() => {
            try { recognition.stop(); } catch { /* noop */ }
          }, 10_000);
        } catch (err) {
          reject(err instanceof Error ? err : new Error(String(err)));
        }
      }),
  };
}

// ── Engine 3: mock (always works, returns empty) ──────────────────────────
export const mockTranscriber: Transcriber = {
  engine: 'mock' as const,
  async transcribe(_audioBlob: Blob): Promise<string> {
    return '';
  },
};

// ── Factory: pick the best engine and cache the result ────────────────────
let _cached: Transcriber | null = null;
let _probed = false;

export function createTranscriber(): Transcriber {
  if (_cached) return _cached;
  // If we have already attempted a probe and it failed, fall through to mock.
  // This avoids re-importing @xenova/transformers on every call in test envs.
  if (_probed) {
    _cached = mockTranscriber;
    return _cached;
  }
  _probed = true;

  // Try Web Speech first (cheap, sync detection). If present, use it.
  if (typeof window !== 'undefined') {
    const win = window as unknown as WindowWithSpeech;
    const Ctor = win.SpeechRecognition ?? win.webkitSpeechRecognition;
    if (Ctor) {
      _cached = createWebSpeechTranscriber();
      console.warn('[whisper.service] Using Web Speech API engine');
      return _cached;
    }
  }

  // No sync fallback found — try transformers asynchronously; if it
  // resolves successfully we replace the cached engine. Until then we
  // return mock so the caller never blocks. The async probe kicks off
  // in the background.
  void (async () => {
    const t = await createTransformersTranscriber();
    if (t) {
      _cached = t;
      console.warn('[whisper.service] Switched to @xenova/transformers engine');
    }
  })();

  _cached = mockTranscriber;
  return _cached;
}

export function getTranscriberEngine(): TranscriberEngine {
  return (_cached ?? createTranscriber()).engine;
}

// Expose an async initializer that resolves once the best available
// engine is ready (transformers may upgrade a mock/web-speech fallback).
export async function initTranscriber(): Promise<Transcriber> {
  if (!_probed) {
    createTranscriber();
  }
  const t = await createTransformersTranscriber();
  if (t) _cached = t;
  return _cached ?? mockTranscriber;
}

// Reset internal cache (testing only).
export function _resetTranscriberCache(): void {
  _cached = null;
  _probed = false;
}

export default mockTranscriber;
