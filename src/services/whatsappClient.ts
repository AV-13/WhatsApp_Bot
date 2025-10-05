import { config } from '../config.js';
import { logger } from '../utils/logger.js';
import fetch from 'node-fetch';
const base = config.whatsapp.apiBase;
const phoneNumberId = config.whatsapp.phoneNumberId;
const authHeader = { Authorization: `Bearer ${config.whatsapp.token}` };

export async function sendText(to: string, body: string) {
  const url = `${base}/${phoneNumberId}/messages`;
  const payload = {
    messaging_product: 'whatsapp',
    to,
    type: 'text',
    text: { body }
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const text = await res.text();
    logger.error('sendText failed', res.status, text);
    throw new Error(`WhatsApp sendText failed: ${res.status}`);
  }
  logger.info('Sent text to', to);
}

export async function markRead(messageId: string) {
  const url = `${base}/${phoneNumberId}/messages`;
  const payload = {
    messaging_product: 'whatsapp',
    status: 'read',
    message_id: messageId
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const text = await res.text();
    logger.warn('markRead failed', res.status, text);
  }
}

export async function getMediaUrl(mediaId: string): Promise<string> {
  const url = `${config.whatsapp.apiBase}/${mediaId}`;
  const res = await fetch(url, { headers: authHeader });
  if (!res.ok) throw new Error(`getMediaUrl failed: ${res.status}`);
  const j = await res.json();
  if (!j || !j.url) throw new Error('No media url returned');
  return j.url as string;
}
