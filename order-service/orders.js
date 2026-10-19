import '../assets/js/menu-data.js';

export const STATUSES = ['New', 'Confirmed', 'Cooking', 'Ready', 'Picked up', 'Cancelled'];
export const PAYMENTS = ['Unpaid', 'Paid'];
export class InputError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}
const reject = (message) => { throw new InputError(message); };
const text = (value, max, required = false) => {
  if (typeof value !== 'string' || value.length > max || (required && !value.trim())) reject('Please check your contact details and notes.');
  return value.trim();
};
export function validateOrder(body) {
  if (!body || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.id)) reject('Invalid request reference. Please review your request again.');
  const customer = {
    name: text(body.customer?.name, 80, true),
    phone: text(body.customer?.phone, 30, true),
    allergies: text(body.customer?.allergies, 500),
    notes: text(body.customer?.notes, 500),
  };
  if (!/^\+?[\d\s().-]+$/.test(customer.phone) || customer.phone.replace(/\D/g, '').length < 7 || customer.phone.replace(/\D/g, '').length > 15) reject('Please enter a valid reply phone number.');
  if (!Array.isArray(body.weeks) || !body.weeks.length || body.weeks.length > globalThis.PATRICE_MENUS.length) reject('Include at least one available menu week.');
  const seen = new Set();
  let baseCents = 0, extrasCents = 0, bundleCount = 0;
  const weeks = body.weeks.map((week) => {
    const menu = globalThis.PATRICE_MENUS.find((m) => m.week === week?.week);
    if (!menu || seen.has(menu.week)) reject('Unknown or duplicate menu week.');
    seen.add(menu.week);
    if (!Array.isArray(week.bundles) || !week.bundles.length || week.bundles.length > 10) reject('Choose 1–10 bundles per week.');
    const bundles = week.bundles.map((bundle) => {
      if (!Array.isArray(bundle) || bundle.length !== menu.mealCount) reject('Every bundle needs four complete entrees.');
      return bundle.map((snapshot) => {
        if (!Array.isArray(snapshot) || snapshot.length > 60) reject('Invalid entree choices.');
        const values = new Map();
        for (const value of snapshot) {
          if (!value || typeof value.suffix !== 'string' || values.has(value.suffix)) reject('Invalid entree choices.');
          values.set(value.suffix, value);
        }
        const entree = menu.entrees.find((e) => e.id === values.get('')?.value);
        if (!entree) reject('Choose an entree for every meal.');
        values.delete('');
        let extraCents = 0;
        const details = [];
        const read = (field, prefix = '') => {
          const key = `${prefix}-${field.id}`;
          const value = values.get(key);
          if (!value) reject(`Missing ${field.label.toLowerCase()} choice.`);
          values.delete(key);
          if (field.type === 'checkbox') {
            if (typeof value.checked !== 'boolean') reject('Invalid add-on choice.');
            if (value.checked) { extraCents += field.extraCents; details.push(field.label); }
          } else {
            const option = field.options.find((o) => o.id === value.value);
            if (!option) reject(`Choose ${field.label.toLowerCase()}.`);
            extraCents += option.extraCents;
            details.push(`${field.label}: ${option.label}`);
            option.fields.forEach((child) => read(child, `${key}-${option.id}`));
          }
        };
        entree.fields.forEach((field) => read(field));
        if (values.size) reject('Some meal choices are no longer available. Please review your request.');
        return { entreeId: entree.id, label: entree.label, details, extraCents };
      });
    });
    const weekExtras = bundles.flat().reduce((sum, meal) => sum + meal.extraCents, 0);
    const weekBase = menu.priceCents * bundles.length;
    baseCents += weekBase; extrasCents += weekExtras; bundleCount += bundles.length;
    return { week: menu.week, label: menu.label, pickup: text(week.pickup, 120), bundles, baseCents: weekBase, extrasCents: weekExtras, totalCents: weekBase + weekExtras };
  });
  const totalCents = baseCents + extrasCents;
  if (body.expectedTotalCents !== totalCents) throw new InputError('Menu prices have changed. Reload the page and review your request before submitting.', 409);
  const order = { reference: `PBP-${body.id.toUpperCase()}`, customer, weeks, baseCents, extrasCents, totalCents, bundleCount, mealCount: bundleCount * 4 };
  if (JSON.stringify(order).length > 90000) reject('This request is too large. Please submit fewer bundles at a time.');
  return order;
}
