import express from 'express';
import { config, ensureRequiredEnv } from './config.js';
import { router as webhookRouter } from './webhook.js';
import { logger } from './utils/logger.js';

ensureRequiredEnv();
const app = express();
app.use(express.json({ limit: '10mb' }));

app.get('/_health', (_req, res) => res.status(200).json({ ok: true, version: '0.1.0' }));
app.use('/webhook', webhookRouter);

app.listen(config.port, () => {
  logger.info(`SmartDuck bot listening on :${config.port}`);
});
