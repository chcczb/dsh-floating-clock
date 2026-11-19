/**
 * Host half of the floating-clock bundle.
 *
 * Owns one durable JSON store for the Client widget (settings + per-day
 * schedules) so the data survives DSH restarts, port changes, browser
 * switches, and reboots. The store lives under $DSH_HOME and is exposed to
 * the browser through one exact webServer route guarded to local,
 * same-origin requests only.
 */
import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { homedir } from 'node:os';

const ENDPOINT = '/plugins/floating-clock-store';
const MAX_BODY_BYTES = 512 * 1024;

function storeFile() {
  const home = process.env.DSH_HOME || join(homedir(), '.dsh');
  return join(home, 'plugin-data', 'floating-clock', 'store.json');
}

function jsonResponse(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'content-length': Buffer.byteLength(payload),
  });
  res.end(payload);
}

function bareAddress(address) {
  if (typeof address !== 'string') return '';
  const zone = address.indexOf('%');
  const value = zone === -1 ? address : address.slice(0, zone);
  return value.startsWith('::ffff:') ? value.slice('::ffff:'.length) : value;
}

/** Loopback peer + loopback Host header + same-origin Origin (DNS-rebinding and cross-site guard). */
function localRequestOk(req) {
  const peer = bareAddress(req.socket && req.socket.remoteAddress);
  if (peer !== '127.0.0.1' && peer !== '::1') return false;
  const host = (req.headers && req.headers.host) || '';
  if (!/^(127\.0\.0\.1|localhost|\[::1\])(:\d+)?$/.test(host)) return false;
  const origin = req.headers && req.headers.origin;
  if (origin) {
    try {
      if (new URL(origin).host !== host) return false;
    } catch (e) {
      return false;
    }
  }
  return true;
}

async function readBodyText(req) {
  const chunks = [];
  let bytes = 0;
  for await (const chunk of req) {
    bytes += chunk.length;
    if (bytes > MAX_BODY_BYTES) throw new Error('request body is too large');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}

async function readStore() {
  try {
    return await readFile(storeFile(), 'utf8');
  } catch (error) {
    if (error && error.code === 'ENOENT') return null;
    throw error;
  }
}

async function writeStore(text) {
  const file = storeFile();
  await mkdir(dirname(file), { recursive: true });
  const tmp = file + '.tmp';
  await writeFile(tmp, text, 'utf8');
  try {
    await rename(tmp, file);
  } catch (error) {
    try { await unlink(tmp); } catch (e) { /* best effort */ }
    throw error;
  }
}

export function apply(ctx) {
  ctx.inject(['webServer'], (httpCtx) => {
    const handler = async (req, res) => {
      try {
        if (!localRequestOk(req)) {
          jsonResponse(res, 403, { error: 'local access only' });
          return;
        }
        if (req.method === 'GET') {
          const text = await readStore();
          if (text === null) {
            jsonResponse(res, 404, { error: 'not found' });
            return;
          }
          res.writeHead(200, {
            'content-type': 'application/json; charset=utf-8',
            'cache-control': 'no-store',
            'content-length': Buffer.byteLength(text),
          });
          res.end(text);
          return;
        }
        if (req.method === 'PUT') {
          const text = await readBodyText(req);
          let doc;
          try {
            doc = JSON.parse(text);
          } catch (e) {
            jsonResponse(res, 400, { error: 'body must be valid JSON' });
            return;
          }
          if (!doc || typeof doc !== 'object' || Array.isArray(doc)) {
            jsonResponse(res, 400, { error: 'document must be a JSON object' });
            return;
          }
          await writeStore(JSON.stringify(doc));
          jsonResponse(res, 200, { ok: true });
          return;
        }
        jsonResponse(res, 405, { error: 'method not allowed' });
      } catch (error) {
        jsonResponse(res, 500, { error: error instanceof Error ? error.message : String(error) });
      }
    };
    httpCtx.effect(() => httpCtx.webServer.register({ kind: 'exact', path: ENDPOINT, handler }));
  });
}
