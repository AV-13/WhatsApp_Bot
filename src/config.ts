import 'dotenv/config';

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  appUrl: process.env.APP_URL || '',
  whatsapp: {
    token: process.env.WHATSAPP_TOKEN || '',
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
    verifyToken: process.env.WHATSAPP_VERIFY_TOKEN || '',
    apiBase: process.env.WHATSAPP_API_BASE || 'https://graph.facebook.com/v21.0'
  },
  stt: {
    provider: (process.env.STT_PROVIDER || 'none') as 'none' | 'whisper',
    apiKey: process.env.STT_API_KEY || ''
  },
  i18n: {
    defaultLocale: process.env.DEFAULT_LOCALE || 'fr',
    supported: (process.env.SUPPORTED_LOCALES || 'fr,en').split(',')
  }
};

export function ensureRequiredEnv() {
  const missing: string[] = [];
  if (!config.whatsapp.token) missing.push('WHATSAPP_TOKEN');
  if (!config.whatsapp.phoneNumberId) missing.push('WHATSAPP_PHONE_NUMBER_ID');
  if (!config.whatsapp.verifyToken) missing.push('WHATSAPP_VERIFY_TOKEN');
  if (missing.length) {
    console.warn('[WARN] Missing env variables:', missing.join(', '));
  }
}
