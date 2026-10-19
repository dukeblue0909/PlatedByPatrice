import { InputError } from './orders.js';
export class OrderStore {
  constructor(env) {
    if (!env.DB) throw new InputError('Online requests are temporarily unavailable. Please text Patrice instead.', 503);
    this.db = env.DB;
  }
  async save(order) {
    const created = new Date().toISOString();
    // Each week is independently tracked. UNIQUE references and an atomic batch
    // make retries harmless, including after an ambiguous network timeout.
    const statements = order.weeks.map((week) => {
      const weekly = { ...order, reference: `${order.reference}/${week.week}`, requestReference: order.reference, weeks: [week], baseCents: week.baseCents, extrasCents: week.extrasCents, totalCents: week.totalCents, bundleCount: week.bundles.length, mealCount: week.bundles.length * 4 };
      return this.db.prepare('INSERT INTO orders (reference, request_reference, created, details) VALUES (?, ?, ?, ?) ON CONFLICT(reference) DO NOTHING').bind(weekly.reference, order.reference, created, JSON.stringify(weekly));
    });
    const results = await this.db.batch(statements);
    if (results.length !== statements.length || results.some((r) => !r.success)) throw new InputError('We could not verify that your request was saved. Retry using this same request.', 503);
    return order.reference;
  }
  async list(offset = '') {
    if (offset && !/^[1-9]\d{0,15}$/.test(offset)) throw new InputError('Invalid page.');
    const statement = offset
      ? this.db.prepare('SELECT * FROM orders WHERE id < ? ORDER BY id DESC LIMIT 101').bind(Number(offset))
      : this.db.prepare('SELECT * FROM orders ORDER BY id DESC LIMIT 101');
    const result = await statement.all();
    if (!result.success) throw new InputError('Could not load orders. Please retry.', 503);
    const records = result.results.slice(0, 100);
    const orders = records.map((record) => ({ id: String(record.id), created: record.created, status: record.status, payment: record.payment, version: record.version, order: JSON.parse(record.details) }));
    return { orders, offset: result.results.length > 100 ? String(records.at(-1).id) : null };
  }
  async update(id, changes, version) {
    if (!Number.isSafeInteger(version) || version < 1) throw new InputError('Refresh this order before saving changes.', 409);
    const assignments = Object.keys(changes).map((name) => `${name.toLowerCase()} = ?`).join(', ');
    const result = await this.db.prepare(`UPDATE orders SET ${assignments}, version = version + 1 WHERE id = ? AND version = ?`).bind(...Object.values(changes), Number(id), version).run();
    if (!result.success) throw new InputError('Could not save this order. Please retry.', 503);
    if (!result.meta.changes) throw new InputError('This order changed in another window. Refresh orders before saving again.', 409);
  }
}
