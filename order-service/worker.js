import chefPage from './chef.html';
import prepSource from './chef-prep.js';
import { validateOrder, InputError, STATUSES, PAYMENTS } from './orders.js';
import { OrderStore } from './database.js';

const encoder = new TextEncoder();
const bytes = (hex) => Uint8Array.from(hex.match(/../g) || [], (s) => parseInt(s, 16));
const hex = (buffer) => [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, '0')).join('');
async function key(secret) { return crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']); }
async function token(env) {
  const expires = String(Date.now() + 8 * 60 * 60 * 1000);
  return `${expires}.${hex(await crypto.subtle.sign('HMAC', await key(env.SESSION_SECRET), encoder.encode(expires)))}`;
}
async function authenticated(request, env) {
  if (!env.SESSION_SECRET || !env.CHEF_PASSWORD) return false;
  const cookie = request.headers.get('Cookie')?.match(/(?:^|;\s*)chef_session=([^;]+)/)?.[1] || '';
  const [expires, signature] = cookie.split('.');
  if (!/^\d{13}$/.test(expires || '') || !/^[a-f0-9]{64}$/.test(signature || '') || Number(expires) < Date.now() || Number(expires) > Date.now() + 8 * 60 * 60 * 1000) return false;
  return crypto.subtle.verify('HMAC', await key(env.SESSION_SECRET), bytes(signature), encoder.encode(expires));
}
async function jsonBody(request) {
  if (!request.headers.get('Content-Type')?.startsWith('application/json')) throw new InputError('Use a JSON request.', 415);
  const reader = request.body?.getReader();
  if (!reader) throw new InputError('Missing request.');
  const chunks = []; let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > 256000) { await reader.cancel(); throw new InputError('Request is too large.', 413); }
    chunks.push(value);
  }
  const all = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { all.set(chunk, offset); offset += chunk.length; }
  try { return JSON.parse(new TextDecoder().decode(all)); } catch { throw new InputError('Invalid JSON request.'); }
}
const security = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'X-Frame-Options': 'DENY' };
function response(body, status = 200, headers = {}) { return new Response(JSON.stringify(body), { status, headers: { ...security, 'Content-Type': 'application/json', ...headers } }); }
async function rateLimit(binding, request) {
  if (!binding) throw new InputError('The service is not configured yet.', 503);
  const { success } = await binding.limit({ key: request.headers.get('CF-Connecting-IP') || 'unknown' });
  if (!success) throw new InputError('Too many attempts. Please wait a minute and try again.', 429);
}
const cookie = (value, age) => `chef_session=${value}; HttpOnly; Secure; SameSite=Strict; Path=/api/chef; Max-Age=${age}`;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin');
    const allowed = (env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
    const publicRoute = url.pathname === '/api/orders';
    const cors = publicRoute && allowed.includes(origin) ? { 'Access-Control-Allow-Origin': origin, 'Vary': 'Origin' } : {};
    try {
      if (publicRoute) {
        if (!origin || !allowed.includes(origin)) return response({ error: 'This website is not allowed to submit requests.' }, 403);
        if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: { ...security, ...cors, 'Access-Control-Allow-Methods': 'POST', 'Access-Control-Allow-Headers': 'Content-Type' } });
        if (request.method !== 'POST') return response({ error: 'Method not allowed.' }, 405, cors);
        await rateLimit(env.SUBMIT_LIMIT, request);
        const order = validateOrder(await jsonBody(request));
        // Bind the public reference to immutable content. Knowing an order number
        // cannot be used to replace that order's contact details or meal choices.
        order.reference = `PBP-${hex(await crypto.subtle.digest('SHA-256', encoder.encode(JSON.stringify(order)))).slice(0, 24).toUpperCase()}`;
        await new OrderStore(env).save(order);
        return response({ reference: order.reference, totalCents: order.totalCents, message: 'Request received. Patrice must confirm availability, pickup, and final price before payment.' }, 201, cors);
      }
      if (url.pathname === '/chef/prep.js' && request.method === 'GET') {
        return new Response(prepSource, { headers: { ...security, 'Content-Type': 'application/javascript;charset=utf-8' } });
      }
      if (url.pathname === '/chef' || url.pathname === '/chef/') {
        if (request.method !== 'GET') return response({ error: 'Method not allowed.' }, 405);
        const nonce = crypto.randomUUID().replaceAll('-', '');
        return new Response(chefPage.replaceAll('__NONCE__', nonce), { headers: { ...security, 'Content-Type': 'text/html;charset=utf-8', 'Content-Security-Policy': `default-src 'none'; script-src 'nonce-${nonce}' 'self'; style-src 'nonce-${nonce}'; connect-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'` } });
      }
      if (!url.pathname.startsWith('/api/chef/')) return response({ error: 'Not found.' }, 404);
      if (!['GET', 'POST', 'PATCH'].includes(request.method)) return response({ error: 'Method not allowed.' }, 405);
      if (request.method !== 'GET' && origin !== url.origin) return response({ error: 'Invalid request origin.' }, 403);
      if (url.pathname === '/api/chef/login' && request.method === 'POST') {
        await rateLimit(env.LOGIN_LIMIT, request);
        if (env.CHEF_PASSWORD?.length < 16 || !env.CHEF_PASSWORD || env.SESSION_SECRET?.length < 32 || !env.SESSION_SECRET) throw new InputError('Chef access has not been configured yet.', 503);
        const body = await jsonBody(request);
        if (typeof body.password !== 'string' || body.password.length > 256) throw new InputError('Invalid password.', 401);
        const passwordKey = await key(env.SESSION_SECRET);
        const expected = await crypto.subtle.sign('HMAC', passwordKey, encoder.encode(env.CHEF_PASSWORD));
        if (!await crypto.subtle.verify('HMAC', passwordKey, expected, encoder.encode(body.password))) throw new InputError('Invalid password.', 401);
        return response({ ok: true }, 200, { 'Set-Cookie': cookie(await token(env), 28800) });
      }
      if (url.pathname === '/api/chef/logout' && request.method === 'POST') return response({ ok: true }, 200, { 'Set-Cookie': cookie('', 0) });
      if (!await authenticated(request, env)) throw new InputError('Please sign in to view orders.', 401);
      if (url.pathname === '/api/chef/orders' && request.method === 'GET') {
        const offset = url.searchParams.get('offset') || '';
        if (offset.length > 500) throw new InputError('Invalid page.');
        return response(await new OrderStore(env).list(offset));
      }
      const match = url.pathname.match(/^\/api\/chef\/orders\/([1-9]\d{0,15})$/);
      if (match && request.method === 'PATCH') {
        const body = await jsonBody(request);
        const changes = {};
        if (body.status !== undefined) { if (!STATUSES.includes(body.status)) throw new InputError('Invalid status.'); changes.Status = body.status; }
        if (body.payment !== undefined) { if (!PAYMENTS.includes(body.payment)) throw new InputError('Invalid payment status.'); changes.Payment = body.payment; }
        if (!Object.keys(changes).length) throw new InputError('No changes supplied.');
        await new OrderStore(env).update(match[1], changes, body.version);
        return response({ ok: true });
      }
      return response({ error: 'Not found.' }, 404);
    } catch (error) {
      return response({ error: error instanceof InputError ? error.message : 'The service is temporarily unavailable. Please try again.' }, error instanceof InputError ? error.status : 503, cors);
    }
  },
};
