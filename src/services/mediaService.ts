import { logger } from '../utils/logger.js';
import { config } from '../config.js';

export async function downloadMedia(url: string): Promise<Buffer> {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${config.whatsapp.token}` }
  });
  if (!res.ok) {
    const text = await res.text();
    logger.error('downloadMedia failed', res.status, text);
    throw new Error(`downloadMedia failed: ${res.status}`);
  }
  const arrayBuf = await res.arrayBuffer();
  return Buffer.from(arrayBuf);
}
