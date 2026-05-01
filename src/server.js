import express from 'express';
import { env } from './config/env.js';
import { DOCS_DIR } from './lib/paths.js';

const app = express();

app.use('/', express.static(DOCS_DIR));

app.get('/dev/fetch', async (_req, res, next) => {
  try {
    const { fetchEarningsWindow } = await import('./fetch/earnings.js');
    const result = await fetchEarningsWindow();
    res.json({ ok: true, ...result });
  } catch (err) {
    next(err);
  }
});

app.get('/dev/fetch-indices', async (_req, res, next) => {
  try {
    const { fetchAllIndices } = await import('./fetch/indices.js');
    const result = await fetchAllIndices();
    res.json({ ok: true, result });
  } catch (err) {
    next(err);
  }
});

app.get('/dev/gen', async (_req, res, next) => {
  try {
    await import(`./cli/gen.js?ts=${Date.now()}`);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

app.listen(env.port, () => {
  console.log(`Dev server: http://localhost:${env.port}`);
  console.log('Endpoints: GET /dev/fetch  /dev/fetch-indices  /dev/gen');
});
