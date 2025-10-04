import request from 'supertest';
import express from 'express';
import { router } from '../src/webhook';

// Mock WhatsApp client to avoid real API calls
jest.unstable_mockModule('../src/services/whatsappClient', () => ({
  sendText: async (_to: string, _body: string) => {},
  getMediaUrl: async (_id: string) => 'https://example.com/media.ogg'
}));

const app = express();
app.use(express.json());
app.use('/webhook', router);

describe('Webhook', () => {
  it('verifies token', async () => {
    const res = await request(app).get('/webhook')
      .query({ 'hub.verify_token': 'dev-verify-token', 'hub.challenge': '123' });
    expect(res.status).toBe(200);
    expect(res.text).toBe('123');
  });

  it('accepts incoming text message', async () => {
    const payload = {
      entry: [{
        changes: [{
          value: {
            messages: [{
              from: '34123456789',
              type: 'text',
              text: { body: 'bonjour' }
            }]
          }
        }]
      }]
    };
    const res = await request(app).post('/webhook').send(payload);
    expect(res.status).toBe(200);
  });
});
