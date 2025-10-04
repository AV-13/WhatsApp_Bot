export type IncomingMessage =
  | { type: 'text'; from: string; text: string; locale?: string }
  | { type: 'audio'; from: string; mediaId: string; locale?: string }
  | { type: 'image'; from: string; mediaId: string; caption?: string; locale?: string };

export interface IntentResult {
  name: string;
  confidence: number;
  locale: string;
}
