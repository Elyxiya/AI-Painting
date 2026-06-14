/**
 * Whisper ASR Service
 *
 * Provides a Transcriber interface for speech-to-text.
 * The default export is a mock implementation suitable for tests and
 * environments without WebAssembly support. In production this can be
 * swapped for a real @xenova/transformers pipeline or a backend API.
 */

export interface Transcriber {
  transcribe(audioBlob: Blob): Promise<string>;
}

const mockTranscriber: Transcriber = {
  async transcribe(_audioBlob: Blob): Promise<string> {
    return '';
  },
};

export function createTranscriber(): Transcriber['transcribe'] {
  return mockTranscriber.transcribe.bind(mockTranscriber);
}

export { mockTranscriber };
export default mockTranscriber;
