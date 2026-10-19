// Separate matching variants; never lose allergy information in the combined prep list.
export function prepList(orders, weekFilter = '') {
  const groups = new Map();
  for (const { status, order } of orders) {
    if (!['Confirmed', 'Cooking', 'Ready'].includes(status)) continue;
    for (const week of order.weeks) {
      if (weekFilter && week.week !== weekFilter) continue;
      for (const meal of week.bundles.flat()) {
        const key = JSON.stringify([week.week, meal.label, meal.details, order.customer.allergies]);
        if (!groups.has(key)) groups.set(key, { week: week.label, label: meal.label, details: meal.details, allergies: order.customer.allergies, quantity: 0 });
        groups.get(key).quantity++;
      }
    }
  }
  return [...groups.values()];
}
