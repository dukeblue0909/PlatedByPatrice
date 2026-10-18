const navToggle = document.getElementById("navToggle");
const navLinks = document.getElementById("navLinks");

if (navToggle && navLinks) {
  navToggle.addEventListener("click", () => {
    const isOpen = navLinks.classList.toggle("open");
    navToggle.setAttribute("aria-expanded", String(isOpen));
  });

  navLinks.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      navLinks.classList.remove("open");
      navToggle.setAttribute("aria-expanded", "false");
    });
  });
}

const menus = window.PATRICE_MENUS || [];
const requestForm = document.getElementById("textRequestForm");
const requestReview = document.getElementById("requestReview");

if (menus.length && requestForm && requestReview) {
  const money = (cents) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
  const upgraded = (item) => `${item.label}${item.extraCents ? ` (+${money(item.extraCents)})` : ""}`;
  const element = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const menuWeek = document.getElementById("menuWeek");
  const requestWeek = document.getElementById("requestWeek");
  const countInput = document.getElementById("requestBundles");
  const selections = document.getElementById("requestSelections");
  const estimate = document.getElementById("requestEstimate");
  const messageField = document.getElementById("requestMessage");
  const sendLink = document.getElementById("sendTextRequest");
  const copyStatus = document.getElementById("requestCopyStatus");
  const states = new Map();
  let activeMenu;

  for (const menu of menus) {
    menuWeek.add(new Option(menu.label, menu.week));
    requestWeek.add(new Option(menu.label, menu.week));
  }

  function renderMenu(menu) {
    document.getElementById("menuBanner").textContent = `${menu.label} | ${money(menu.priceCents)} per bundle | Choose any ${menu.mealCount} entrees`;
    const cards = menu.entrees.map((entree) => {
      const card = element("div", "menu-card");
      card.append(element("h3", "", entree.label), element("p", "", entree.description));
      const list = element("ul");
      for (const field of entree.fields) {
        if (field.id === "side-2") continue;
        if (field.type === "checkbox") {
          list.append(element("li", "", `Optional: ${upgraded(field)}`));
        } else {
          const label = field.id === "side-1" ? "Sides — choose two" : field.label;
          list.append(element("li", "", `${label}: ${field.options.map(upgraded).join(", ")}.`));
          for (const option of field.options) {
            for (const subfield of option.fields) {
              const details = subfield.type === "checkbox" ? upgraded(subfield) : `${subfield.label}: ${subfield.options.map(upgraded).join(", ")}`;
              list.append(element("li", "menu-subchoice", `${option.label} — ${details}.`));
            }
          }
        }
      }
      if (list.children.length) card.append(list);
      return card;
    });
    document.getElementById("weeklyMenuCards").replaceChildren(...cards);
  }

  // Each field reads its own selected option and any dependent choices.
  // This same data drives the estimate and the reviewed SMS message.
  function createField(field, prefix) {
    const node = element("div", field.type === "checkbox" ? "meal-option meal-checkbox" : "meal-option");
    const id = `${prefix}-${field.id}`;
    const label = element("label", "", field.type === "checkbox" ? upgraded(field) : field.label);
    label.htmlFor = id;
    const control = element(field.type === "checkbox" ? "input" : "select");
    control.id = id;
    const childrenNode = element("div", "meal-dependent");
    let children = [];
    if (field.type === "checkbox") {
      control.type = "checkbox";
      node.append(control, label);
    } else {
      control.required = true;
      control.add(new Option(`Choose ${field.label.toLowerCase()}`, ""));
      for (const option of field.options) control.add(new Option(upgraded(option), option.id));
      node.append(label, control, childrenNode);
      control.addEventListener("change", () => {
        const selected = field.options.find((option) => option.id === control.value);
        children = (selected?.fields || []).map((child) => createField(child, `${id}-${selected.id}`));
        childrenNode.replaceChildren(...children.map((child) => child.node));
      });
    }
    return {
      node,
      read() {
        if (field.type === "checkbox") {
          return { extraCents: control.checked ? field.extraCents : 0, lines: control.checked ? [upgraded(field)] : [] };
        }
        const selected = field.options.find((option) => option.id === control.value);
        const nested = children.map((child) => child.read());
        return {
          extraCents: (selected?.extraCents || 0) + nested.reduce((sum, child) => sum + child.extraCents, 0),
          lines: selected ? [`${field.label}: ${upgraded(selected)}`, ...nested.flatMap((child) => child.lines)] : [],
        };
      },
    };
  }

  function createMeal(menu, bundleIndex, mealIndex) {
    const prefix = `${menu.week}-bundle-${bundleIndex + 1}-meal-${mealIndex + 1}`;
    const node = element("fieldset", "meal-card");
    node.append(element("legend", "", `Entree ${mealIndex + 1}`));
    const label = element("label", "", "Choose your entree");
    label.htmlFor = prefix;
    const select = element("select", "entree-select");
    select.id = prefix;
    select.required = true;
    select.add(new Option("Choose an entree", ""));
    for (const entree of menu.entrees) select.add(new Option(entree.label, entree.id));
    const details = element("div", "meal-details");
    let fields = [];
    node.append(label, select, details);
    select.addEventListener("change", () => {
      const entree = menu.entrees.find((item) => item.id === select.value);
      fields = (entree?.fields || []).map((field) => createField(field, prefix));
      details.replaceChildren();
      if (entree) details.append(element("p", "meal-description", entree.description), ...fields.map((field) => field.node));
    });
    return {
      node,
      read() {
        const entree = menu.entrees.find((item) => item.id === select.value);
        const options = fields.map((field) => field.read());
        const extraCents = options.reduce((sum, field) => sum + field.extraCents, 0);
        return { label: entree?.label || "Not selected", extraCents, details: options.flatMap((field) => field.lines) };
      },
    };
  }

  function updateBundles(count) {
    const state = states.get(activeMenu.week);
    state.count = count;
    while (state.bundles.length < count) {
      const index = state.bundles.length;
      const node = element("fieldset", "bundle-card");
      node.append(element("legend", "", `Bundle ${index + 1} · ${activeMenu.mealCount} entrees`));
      const meals = Array.from({ length: activeMenu.mealCount }, (_, mealIndex) => createMeal(activeMenu, index, mealIndex));
      node.append(...meals.map((meal) => meal.node));
      state.bundles.push({ node, meals });
      state.node.append(node);
    }
    state.bundles.forEach((bundle, index) => {
      bundle.node.hidden = index >= count;
      bundle.node.disabled = index >= count;
    });
    updateEstimate();
  }

  function readRequest() {
    const state = states.get(activeMenu.week);
    const bundles = state.bundles.slice(0, state.count).map((bundle) => bundle.meals.map((meal) => meal.read()));
    const baseCents = activeMenu.priceCents * state.count;
    const extrasCents = bundles.flat().reduce((sum, meal) => sum + meal.extraCents, 0);
    return { bundles, baseCents, extrasCents, totalCents: baseCents + extrasCents };
  }

  function updateEstimate() {
    const request = readRequest();
    estimate.textContent = `Estimated total: ${money(request.totalCents)} (${money(request.baseCents)} bundles + ${money(request.extrasCents)} upgrades)`;
  }

  function setWeek(week) {
    activeMenu = menus.find((menu) => menu.week === week);
    if (!activeMenu) return;
    menuWeek.value = requestWeek.value = week;
    renderMenu(activeMenu);
    if (!states.has(week)) {
      const node = element("div", "week-bundles");
      states.set(week, { node, count: 1, bundles: [] });
      selections.append(node);
    }
    for (const [key, state] of states) {
      state.node.hidden = key !== week;
      for (const bundle of state.bundles) bundle.node.disabled = key !== week;
    }
    const state = states.get(week);
    countInput.value = state.count;
    countInput.setCustomValidity("");
    updateBundles(state.count);
    // Browsing another week returns to selections rather than leaving a stale SMS visible.
    requestReview.hidden = true;
    requestForm.hidden = false;
  }

  menuWeek.addEventListener("change", () => setWeek(menuWeek.value));
  requestWeek.addEventListener("change", () => setWeek(requestWeek.value));
  countInput.addEventListener("input", () => {
    if (countInput.validity.valid && countInput.value) updateBundles(Number(countInput.value));
  });
  requestForm.addEventListener("change", updateEstimate);
  requestForm.addEventListener("input", (event) => {
    if (typeof event.target.setCustomValidity === "function") event.target.setCustomValidity("");
  });

  requestForm.addEventListener("submit", (event) => {
    event.preventDefault();
    for (const field of requestForm.querySelectorAll("[required]")) {
      if (field.willValidate) field.setCustomValidity(field.value.trim() ? "" : "Please fill out this field.");
    }
    if (!requestForm.reportValidity()) return;
    const data = new FormData(requestForm);
    const request = readRequest();
    const pickup = data.get("pickup").trim();
    const notes = data.get("notes").trim();
    const mealLines = request.bundles.flatMap((bundle, index) => [
      `Bundle ${index + 1}:`,
      ...bundle.map((meal, mealIndex) => `${mealIndex + 1}. ${meal.label}${meal.details.length ? ` — ${meal.details.join("; ")}` : ""}`),
      "",
    ]);
    const message = [
      `Hi Patrice! My name is ${data.get("name").trim()}. I'd like to request meal prep.`,
      "", activeMenu.label,
      `Bundles requested: ${request.bundles.length} (${activeMenu.mealCount} entrees each)`, "",
      ...mealLines,
      `Bundles: ${money(request.baseCents)}`,
      `Menu upgrades: ${money(request.extrasCents)}`,
      `Estimated total: ${money(request.totalCents)}`,
      ...(pickup ? ["", `Preferred pickup: ${pickup}`] : []),
      ...(notes ? ["", `Allergies or notes: ${notes}`] : []),
      "", "Please confirm availability, final price, and pickup details before I pay. Thank you!",
    ].join("\n");
    messageField.value = message;
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    sendLink.href = `sms:+13137271187${isIOS ? "&" : "?"}body=${encodeURIComponent(message)}`;
    copyStatus.textContent = "";
    requestForm.hidden = true;
    requestReview.hidden = false;
    document.getElementById("requestReviewHeading").focus();
  });

  document.getElementById("editTextRequest").addEventListener("click", () => {
    requestReview.hidden = true;
    requestForm.hidden = false;
    document.getElementById("requestName").focus();
  });
  document.getElementById("copyTextRequest").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(messageField.value);
      copyStatus.textContent = "Message copied. Paste it into a text to 313-727-1187 and send it to Patrice.";
    } catch {
      messageField.focus();
      messageField.select();
      copyStatus.textContent = "Select and copy the message above, then text it to 313-727-1187.";
    }
  });

  // Use Detroit's calendar date; Sundays open the upcoming Monday's menu.
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/Detroit", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const part = (type) => parts.find((item) => item.type === type).value;
  const monday = new Date(`${part("year")}-${part("month")}-${part("day")}T12:00:00Z`);
  const day = monday.getUTCDay();
  monday.setUTCDate(monday.getUTCDate() + (day === 0 ? 1 : 1 - day));
  const week = monday.toISOString().slice(0, 10);
  const initialMenu = menus.find((menu) => menu.week === week) || menus.find((menu) => menu.week > week) || menus[menus.length - 1];
  setWeek(initialMenu.week);
  menuWeek.hidden = false;
}
