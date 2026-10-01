import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export async function resolve(specifier, context, nextResolve) {
  // If it's a relative path without extension or package-like relative path
  try {
    return await nextResolve(specifier, context);
  } catch (err) {
    if (err.code === 'ERR_MODULE_NOT_FOUND' || err.code === 'ERR_UNSUPPORTED_DIR_IMPORT') {
      const candidates = ['.js', '.json', '/index.js'];
      for (const ext of candidates) {
        try {
          return await nextResolve(specifier + ext, context);
        } catch {}
      }
    }
    throw err;
  }
}

export async function load(url, context, nextLoad) {
  // Ensure .js files inside src/ are recognized as module
  if (url.startsWith('file://') && url.endsWith('.js')) {
    return nextLoad(url, { ...context, format: 'module' });
  }
  return nextLoad(url, context);
}
