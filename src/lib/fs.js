import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { dirname } from 'node:path';

export async function readJSON(file) {
  const raw = await readFile(file, 'utf8');
  return JSON.parse(raw);
}

export async function writeJSON(file, value) {
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(value, null, 2) + '\n');
}

export async function exists(file) {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

export async function readJSONIfExists(file) {
  return (await exists(file)) ? readJSON(file) : null;
}
