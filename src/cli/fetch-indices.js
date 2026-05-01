import { fetchAllIndices } from '../fetch/indices.js';

const summary = await fetchAllIndices();
const failed = summary.filter((s) => s.status === 'failed');
if (failed.length > 0) {
  console.error('[indices] some indices failed:', failed);
  process.exitCode = 1;
}
