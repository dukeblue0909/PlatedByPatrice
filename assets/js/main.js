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
  const validation = document.getElementById("requestValidation");
  const weekOptions = document.getElementById("requestWeeks");
  const selectedWeeks = new Set();
  const states = new Map();
  const draftKey = "patrice-meal-request-v1";
  const menuVersion = JSON.stringify(menus);
  const reference = `PBP-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  let restoring = true;
  let activeMenu;
  const apiOrigin = (() => {
    try {
      const url = new URL(window.PATRICE_ORDER_API);
      return url.protocol === "https:" && url.pathname === "/" && !url.username && !url.password && !url.search && !url.hash ? url.origin : "";
    } catch { return ""; }
  })();
  let pendingSubmission;
  let previousPayload = "";
  const submissionId = (() => {
    try {
      const stored = sessionStorage.getItem("patrice-submission-id-v1");
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(stored || "")) return stored;
      const id = crypto.randomUUID();
      sessionStorage.setItem("patrice-submission-id-v1", id);
      return id;
    } catch { return crypto.randomUUID(); }
  })();
  let savedReceipt;
  const submitOnline = document.getElementById("submitOnlineRequest");
  const onlineStatus = document.getElementById("onlineRequestStatus");
  if (apiOrigin) {
    document.getElementById("onlineRequest").hidden = false;
    const phoneLabel = document.querySelector('label[for="requestPhone"] span');
    phoneLabel.textContent = "(required)";
    document.getElementById("requestPhone").required = true;
    document.querySelector("#order .section-head h2").textContent = "Let's plan your meals";
    document.querySelector("#textRequestForm .request-intro").textContent = "Choose your weeks, build your bundles, and submit one organized request directly to Patrice.";
    document.querySelector("#textRequestForm > .request-disclosure").textContent = "Review your choices first. Nothing is submitted until you choose Submit request to Patrice.";
    document.querySelector("#requestReview > .request-intro").textContent = "Submit your request below. Patrice will confirm availability, pickup, and the final price. Texting is also available as an alternative.";
    const steps = document.querySelectorAll(".request-guide li");
    steps[2].querySelector("strong").textContent = "Submit your request.";
    steps[2].querySelector("span").textContent = "Your request goes into Patrice's order system for review. She'll contact you to confirm.";
    document.querySelector(".request-guide > p").textContent = "Submitting a request does not confirm availability or take payment. Please wait for Patrice's confirmation.";
  }
  function showReceipt(data) {
    onlineStatus.textContent = `Request received: ${data.reference}. Patrice must confirm availability, pickup, and final price before payment. Please keep this reference; no payment has been taken.`;
    submitOnline.textContent = "Request received";
    submitOnline.disabled = true;
    messageField.value = messageField.value.replace(reference, data.reference);
    document.querySelector(".request-reference").textContent = `Request ${data.reference} · ${pendingSubmission.customer.name}`;
    sendLink.href = sendLink.href.replace(encodeURIComponent(reference), encodeURIComponent(data.reference));
    sendLink.textContent = "Text Patrice about this request";
  }
  submitOnline.addEventListener("click", async () => {
    if (!apiOrigin || !pendingSubmission || submitOnline.disabled) return;
    submitOnline.disabled = true;
    document.getElementById("editTextRequest").disabled = true;
    onlineStatus.textContent = "Saving your request…";
    try {
      const result = await fetch(`${apiOrigin}/api/orders`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pendingSubmission), signal: AbortSignal.timeout(20000),
      });
      const data = await result.json();
      if (!result.ok) throw new Error(data.error || "We couldn't save your request. Please retry or text Patrice.");
      if (typeof data.reference !== "string" || data.totalCents !== pendingSubmission.expectedTotalCents) throw new Error("We couldn't verify the saved request. Please retry using this same request.");
      savedReceipt = { ...data, payload: previousPayload };
      showReceipt(data);
    } catch (error) {
      onlineStatus.textContent = error.name === "TimeoutError" || error instanceof TypeError ? "We couldn't verify receipt. Retry here with the same request to avoid duplicates, or text Patrice and mention this attempt." : error.message;
      submitOnline.disabled = false;
    } finally {
      document.getElementById("editTextRequest").disabled = false;
    }
  });


  for (const menu of menus) {
    menuWeek.add(new Option(menu.label, menu.week));
    requestWeek.add(new Option(menu.label, menu.week));
    const label = element("label", "request-week-option");
    const check = element("input");
    check.type = "checkbox";
    check.name = "weeks";
    check.value = menu.week;
    check.id = `include-${menu.week}`;
    label.append(check, element("span", "", menu.label));
    weekOptions.append(label);
    check.addEventListener("change", () => {
      if (check.checked) {
        selectedWeeks.add(menu.week);
        setWeek(menu.week);
      } else {
        selectedWeeks.delete(menu.week);
        showEditor();
        updateEstimate();
      }
      clearValidation();
    });
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

  function createMeal(menu, bundleIndex, mealIndex, copyPrevious) {
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
    node.append(label, select);
    const copyButton = element("button", "request-edit copy-meal", "Copy entree above, including options");
    if (mealIndex > 0) {
      copyButton.type = "button";
      copyButton.addEventListener("click", copyPrevious);
      node.append(copyButton);
    }
    const price = element("p", "meal-price");
    node.append(details, price);
    select.addEventListener("change", () => {
      const entree = menu.entrees.find((item) => item.id === select.value);
      fields = (entree?.fields || []).map((field) => createField(field, prefix));
      details.replaceChildren();
      if (entree) details.append(element("p", "meal-description", entree.description), ...fields.map((field) => field.node));
    });
    return {
      node, copyButton,
      updatePrice() {
        const extras = fields.reduce((sum, field) => sum + field.read().extraCents, 0);
        price.textContent = select.value ? `Entree add-ons: ${money(extras)}` : "";
      },
      read() {
        const entree = menu.entrees.find((item) => item.id === select.value);
        const options = fields.map((field) => field.read());
        return {
          label: entree?.label || "Not selected",
          complete: Boolean(entree) && [...node.querySelectorAll("[required]")].every((control) => control.value),
          extraCents: options.reduce((sum, field) => sum + field.extraCents, 0),
          details: options.flatMap((field) => field.lines),
        };
      },
      snapshot() {
        return [...node.querySelectorAll("select, input[type=checkbox]")].map((control) => ({
          suffix: control.id.slice(prefix.length), value: control.value, checked: control.checked,
        }));
      },
      restore(values) {
        if (!Array.isArray(values)) return;
        const wasRestoring = restoring;
        restoring = true;
        try {
          for (const value of values.slice(0, 60)) {
            if (!value || typeof value.suffix !== "string") continue;
            const control = document.getElementById(`${prefix}${value.suffix}`);
            if (!control || !node.contains(control)) continue;
            if (control.type === "checkbox") control.checked = value.checked === true;
            else if (control.tagName === "SELECT") {
              control.value = [...control.options].some((option) => option.value === value.value) ? value.value : "";
            } else continue;
            control.dispatchEvent(new Event("change", { bubbles: true }));
          }
        } finally { restoring = wasRestoring; }
      },
    };
  }

  function ensureState(menu) {
    if (states.has(menu.week)) return states.get(menu.week);
    const node = element("div", "week-bundles");
    node.hidden = menu.week !== activeMenu.week;
    const bundlesNode = element("div");
    const pickupNode = element("div", "week-pickup");
    const pickup = element("input");
    pickup.id = `pickup-${menu.week}`;
    pickup.maxLength = 120;
    pickup.placeholder = "Preferred day or time; Patrice will confirm";
    const label = element("label", "", `Pickup preference for ${menu.label.toLowerCase()} (optional)`);
    label.htmlFor = pickup.id;
    pickupNode.append(label, pickup);
    node.append(bundlesNode, pickupNode);
    const state = { menu, node, bundlesNode, pickup, count: 1, bundles: [] };
    states.set(menu.week, state);
    selections.append(node);
    updateBundles(1, menu, false);
    return state;
  }

  function updateBundles(count, menu = activeMenu, refresh = true) {
    const state = states.get(menu.week);
    state.count = count;
    while (state.bundles.length < count) {
      const index = state.bundles.length;
      const node = element("fieldset", "bundle-card");
      node.append(element("legend", "", `Bundle ${index + 1} · ${menu.mealCount} entrees`));
      const duplicate = element("button", "request-edit duplicate-bundle", "Duplicate this bundle");
      duplicate.type = "button";
      let meals = [];
      meals = Array.from({ length: menu.mealCount }, (_, mealIndex) => createMeal(menu, index, mealIndex, () => {
        meals[mealIndex].restore(meals[mealIndex - 1].snapshot());
        updateEstimate();
      }));
      duplicate.addEventListener("click", () => {
        if (state.count >= 10) return;
        const snapshot = meals.map((meal) => meal.snapshot());
        updateBundles(state.count + 1, menu, false);
        countInput.value = state.count;
        state.bundles[state.count - 1].meals.forEach((meal, mealIndex) => meal.restore(snapshot[mealIndex]));
        updateEstimate();
      });
      const price = element("p", "bundle-price");
      node.append(duplicate, ...meals.map((meal) => meal.node), price);
      state.bundles.push({ node, meals, duplicate, price });
      state.bundlesNode.append(node);
    }
    state.bundles.forEach((bundle, index) => {
      bundle.node.hidden = index >= count;
      bundle.node.disabled = menu.week !== activeMenu.week || index >= count;
    });
    if (refresh) updateEstimate();
  }

  function readWeek(state) {
    const bundles = state.bundles.slice(0, state.count).map((bundle) => bundle.meals.map((meal) => meal.read()));
    const baseCents = state.menu.priceCents * state.count;
    const extrasCents = bundles.flat().reduce((sum, meal) => sum + meal.extraCents, 0);
    return { menu: state.menu, bundles, baseCents, extrasCents, totalCents: baseCents + extrasCents, pickup: state.pickup.value.trim() };
  }

  function readRequest() {
    const weeks = menus.filter((menu) => selectedWeeks.has(menu.week)).map((menu) => readWeek(ensureState(menu)));
    const bundleCount = weeks.reduce((sum, week) => sum + week.bundles.length, 0);
    const mealCount = weeks.reduce((sum, week) => sum + week.bundles.flat().length, 0);
    const baseCents = weeks.reduce((sum, week) => sum + week.baseCents, 0);
    const extrasCents = weeks.reduce((sum, week) => sum + week.extrasCents, 0);
    return { weeks, bundleCount, mealCount, baseCents, extrasCents, totalCents: baseCents + extrasCents };
  }

  function renderTotals(target, request, editable = false) {
    target.replaceChildren();
    if (!request.weeks.length) {
      target.append(element("p", "", "No weeks included yet. Check the weeks you want to request."));
    }
    for (const week of request.weeks) {
      const row = element("div", "cart-week");
      row.append(element("strong", "", week.menu.label));
      const complete = week.bundles.flat().filter((meal) => meal.complete).length;
      row.append(element("p", "cart-week-count", `${week.bundles.length} bundle${week.bundles.length === 1 ? "" : "s"} · ${week.bundles.flat().length} entrees · ${complete} complete`));
      row.append(element("p", "cart-week-cost", `${money(week.baseCents)} bundles + ${money(week.extrasCents)} upgrades = ${money(week.totalCents)}`));
      if (editable) {
        const actions = element("div", "cart-week-actions");
        const edit = element("button", "request-edit", "Edit week");
        edit.type = "button";
        edit.setAttribute("aria-label", `Edit ${week.menu.label.toLowerCase()}`);
        edit.addEventListener("click", () => { setWeek(week.menu.week); requestWeek.focus(); });
        const remove = element("button", "request-edit", "Remove");
        remove.type = "button";
        remove.setAttribute("aria-label", `Remove ${week.menu.label.toLowerCase()}`);
        remove.addEventListener("click", () => {
          selectedWeeks.delete(week.menu.week);
          showEditor();
          updateEstimate();
        });
        actions.append(edit, remove);
        row.append(actions);
      }
      target.append(row);
    }
    target.append(element("p", "cart-quantity", `${request.weeks.length} week${request.weeks.length === 1 ? "" : "s"} · ${request.bundleCount} bundles · ${request.mealCount} entrees`));
    const breakdown = element("dl", "cart-breakdown");
    breakdown.append(element("dt", "", "Bundle subtotal"), element("dd", "", money(request.baseCents)), element("dt", "", "Menu upgrades"), element("dd", "", money(request.extrasCents)));
    target.append(breakdown, element("p", "cart-grand-total", `Combined estimate: ${money(request.totalCents)}`));
  }

  function saveCart() {
    if (restoring) return;
    const draft = {
      version: menuVersion, selectedWeeks: [...selectedWeeks], activeWeek: activeMenu.week,
      weeks: [...states.values()].map((state) => ({
        week: state.menu.week, count: state.count,
        bundles: state.bundles.map((bundle) => bundle.meals.map((meal) => meal.snapshot())),
      })),
    };
    try { sessionStorage.setItem(draftKey, JSON.stringify(draft)); }
    catch { document.getElementById("requestDraftNotice").textContent = "Your browser couldn't save this draft. Meal choices will stay on this page until you reload; you can download the reviewed summary."; }
  }

  function updateEstimate() {
    if (!activeMenu) return;
    const state = ensureState(activeMenu);
    const week = readWeek(state);
    const included = selectedWeeks.has(activeMenu.week);
    const request = readRequest();
    estimate.textContent = `Combined request estimate: ${money(request.totalCents)} across ${request.weeks.length} week(s). This week's estimate: ${money(week.totalCents)} (${money(week.baseCents)} bundles + ${money(week.extrasCents)} upgrades)${included ? "" : " — not included in your request"}`;
    document.getElementById("activeWeekStatus").textContent = included ? "Included in your request. Customize the bundles below." : "Browsing only. Include this week above to add it to your total.";
    document.getElementById("includeActiveWeek").hidden = included;
    document.getElementById("includeAllWeeks").disabled = selectedWeeks.size === menus.length;
    for (const checkbox of weekOptions.querySelectorAll("input")) checkbox.checked = selectedWeeks.has(checkbox.value);
    for (const item of states.values()) {
      for (const bundle of item.bundles) {
        bundle.duplicate.disabled = item.count >= 10;
        bundle.meals.forEach((meal) => meal.updatePrice());
        const extras = bundle.meals.reduce((sum, meal) => sum + meal.read().extraCents, 0);
        bundle.price.textContent = `Bundle total: ${money(item.menu.priceCents + extras)} · Includes ${money(extras)} in add-ons`;
        bundle.meals.forEach((meal, index) => { if (index > 0) meal.copyButton.disabled = bundle.meals[index - 1].snapshot()[0].value === ""; });
      }
    }
    renderTotals(document.getElementById("requestCart"), request, true);
    saveCart();
  }

  function clearValidation() { validation.hidden = true; validation.textContent = ""; }
  function showError(message, control) {
    validation.textContent = message;
    validation.hidden = false;
    if (control) { control.focus(); control.reportValidity?.(); }
  }
  function showEditor() { requestReview.hidden = true; requestForm.hidden = false; }

  function setWeek(week) {
    activeMenu = menus.find((menu) => menu.week === week);
    if (!activeMenu) return;
    menuWeek.value = requestWeek.value = week;
    renderMenu(activeMenu);
    const state = ensureState(activeMenu);
    for (const item of states.values()) {
      item.node.hidden = item !== state;
      item.bundles.forEach((bundle, index) => { bundle.node.disabled = item !== state || index >= item.count; });
    }
    countInput.value = state.count;
    countInput.setCustomValidity("");
    showEditor();
    updateEstimate();
  }

  menuWeek.addEventListener("change", () => setWeek(menuWeek.value));
  requestWeek.addEventListener("change", () => setWeek(requestWeek.value));
  document.getElementById("includeAllWeeks").addEventListener("click", () => {
    for (const menu of menus) { selectedWeeks.add(menu.week); ensureState(menu); }
    clearValidation();
    updateEstimate();
  });
  document.getElementById("includeActiveWeek").addEventListener("click", () => {
    selectedWeeks.add(activeMenu.week);
    clearValidation();
    updateEstimate();
  });
  countInput.addEventListener("input", () => {
    countInput.setCustomValidity("");
    if (countInput.validity.valid && countInput.value) updateBundles(Number(countInput.value));
  });
  requestForm.addEventListener("change", () => { if (!restoring) updateEstimate(); });
  requestForm.addEventListener("input", (event) => {
    clearValidation();
    if (typeof event.target.setCustomValidity === "function") event.target.setCustomValidity("");
  });

  function renderReview(request, customer) {
    renderTotals(document.getElementById("requestReviewTotals"), request);
    const items = document.getElementById("requestReviewItems");
    items.replaceChildren(element("p", "request-reference", `Request ${reference} · ${customer.name}`));
    if (customer.phone) items.append(element("p", "", `Reply number: ${customer.phone}`));
    if (customer.allergies) items.append(element("p", "request-allergies", `Allergies / dietary needs: ${customer.allergies}`));
    if (customer.notes) items.append(element("p", "review-notes", `Other instructions: ${customer.notes}`));
    for (const week of request.weeks) {
      const section = element("section", "review-week");
      section.append(element("h4", "", week.menu.label), element("p", "", `Pickup preference: ${week.pickup || "Please confirm with Patrice"}`));
      week.bundles.forEach((bundle, index) => {
        const extras = bundle.reduce((sum, meal) => sum + meal.extraCents, 0);
        section.append(element("h5", "", `Bundle ${index + 1} — ${money(week.menu.priceCents + extras)}`));
        const list = element("ol");
        for (const meal of bundle) {
          const line = element("li");
          line.append(element("strong", "", `${meal.label}${meal.extraCents ? ` (+${money(meal.extraCents)} upgrades)` : ""}`));
          if (meal.details.length) line.append(element("p", "", meal.details.join("; ")));
          list.append(line);
        }
        section.append(list);
      });
      items.append(section);
    }
    items.append(element("p", "request-disclosure", "Request only. Patrice must confirm availability, dietary needs, pickup details, any other charges, and the final total before payment."));
  }

  requestForm.addEventListener("submit", (event) => {
    event.preventDefault();
    clearValidation();
    const nameInput = document.getElementById("requestName");
    nameInput.setCustomValidity(nameInput.value.trim() ? "" : "Please enter your name.");
    if (!nameInput.checkValidity()) return showError("Please enter your name.", nameInput);
    const phoneInput = document.getElementById("requestPhone");
    const phone = phoneInput.value.trim();
    const digits = phone.replace(/\D/g, "");
    phoneInput.setCustomValidity((!phone && !apiOrigin) || (/^\+?[\d\s().-]+$/.test(phone) && digits.length >= 7 && digits.length <= 15) ? "" : apiOrigin ? "Please enter a valid reply phone number." : "Please enter a valid reply phone number, or leave it blank.");
    if (!phoneInput.checkValidity()) return showError("Check your reply phone number.", phoneInput);
    if (!selectedWeeks.size) return showError("Include at least one menu week in your request.", weekOptions.querySelector("input"));
    if (selectedWeeks.has(activeMenu.week) && (!countInput.value || !countInput.checkValidity())) return showError("Choose between 1 and 10 whole bundles for this week.", countInput);
    const originalWeek = activeMenu.week;
    for (const menu of menus.filter((item) => selectedWeeks.has(item.week))) {
      setWeek(menu.week);
      const state = states.get(menu.week);
      const invalid = [...state.node.querySelectorAll("[required]")].find((control) => control.willValidate && !control.checkValidity());
      if (invalid) return showError(`Finish the choices for ${menu.label.toLowerCase()}. Every bundle needs four complete entrees, including required sides and options.`, invalid);
    }
    setWeek(originalWeek);
    const request = readRequest();
    const customer = { name: nameInput.value.trim(), phone, allergies: document.getElementById("requestAllergies").value.trim(), notes: document.getElementById("requestNotes").value.trim() };
    renderReview(request, customer);
    const payload = {
      customer,
      expectedTotalCents: request.totalCents,
      weeks: request.weeks.map((week) => ({
        week: week.menu.week, pickup: week.pickup,
        bundles: states.get(week.menu.week).bundles.slice(0, week.bundles.length).map((bundle) => bundle.meals.map((meal) => meal.snapshot())),
      })),
    };
    const serialized = JSON.stringify(payload);
    if (serialized !== previousPayload) {

      previousPayload = serialized;
      submitOnline.disabled = false;
      submitOnline.textContent = "Submit request to Patrice";
      onlineStatus.textContent = "";
    }
    pendingSubmission = { ...payload, id: submissionId };

    const prepared = new Intl.DateTimeFormat("en-US", { timeZone: "America/Detroit", dateStyle: "medium", timeStyle: "short" }).format(new Date());
    const weekLines = request.weeks.flatMap((week) => [
      week.menu.label.toUpperCase(),
      `${week.bundles.length} bundle(s), ${week.bundles.flat().length} entrees`,
      `Pickup preference: ${week.pickup || "Please confirm"}`,
      ...week.bundles.flatMap((bundle, index) => [
        `Bundle ${index + 1} (${money(week.menu.priceCents + bundle.reduce((sum, meal) => sum + meal.extraCents, 0))}):`,
        ...bundle.map((meal, mealIndex) => `  ${mealIndex + 1}. ${meal.label}${meal.details.length ? ` — ${meal.details.join("; ")}` : ""}`),
      ]),
      `Week subtotal: ${money(week.baseCents)} bundles + ${money(week.extrasCents)} upgrades = ${money(week.totalCents)}`, "",
    ]);
    const message = [
      `MEAL PREP REQUEST ${reference}`, `Prepared ${prepared} (Detroit time)`,
      `Hi Patrice! My name is ${customer.name}.`,
      ...(phone ? [`Reply number: ${phone}`] : []),
      ...(customer.allergies ? [`ALLERGIES / DIETARY NEEDS: ${customer.allergies}`] : []),
      ...(customer.notes ? [`Other instructions: ${customer.notes}`] : []), "",
      ...weekLines,
      `TOTAL: ${request.weeks.length} week(s), ${request.bundleCount} bundle(s), ${request.mealCount} entrees`,
      `Bundle subtotal: ${money(request.baseCents)}`, `Menu upgrades: ${money(request.extrasCents)}`,
      `COMBINED ESTIMATE: ${money(request.totalCents)}`, "",
      "This is a request, not a confirmed order. Please confirm availability, dietary needs, pickup for each week, any other charges, and the final total before I pay. Thank you!",
    ].join("\n");
    messageField.value = message;
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    sendLink.href = `sms:+13137271187${isIOS ? "&" : "?"}body=${encodeURIComponent(message)}`;
    if (savedReceipt?.payload === serialized) showReceipt(savedReceipt);
    else sendLink.textContent = "Open Text Message";
    copyStatus.textContent = "";
    requestForm.hidden = true;
    requestReview.hidden = false;
    document.getElementById("requestReviewHeading").focus();
  });

  document.getElementById("editTextRequest").addEventListener("click", () => {
    showEditor();
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
  document.getElementById("downloadTextRequest").addEventListener("click", () => {
    const url = URL.createObjectURL(new Blob([messageField.value], { type: "text/plain;charset=utf-8" }));
    const link = element("a");
    link.href = url;
    link.download = `${reference}-meal-prep-request.txt`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  document.getElementById("printTextRequest").addEventListener("click", () => {
    document.body.classList.add("printing-request");
    window.addEventListener("afterprint", () => document.body.classList.remove("printing-request"), { once: true });
    window.print();
  });

  // Use Detroit's calendar date; Sundays open the upcoming Monday's menu.
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/Detroit", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const part = (type) => parts.find((item) => item.type === type).value;
  const monday = new Date(`${part("year")}-${part("month")}-${part("day")}T12:00:00Z`);
  const day = monday.getUTCDay();
  monday.setUTCDate(monday.getUTCDate() + (day === 0 ? 1 : 1 - day));
  const week = monday.toISOString().slice(0, 10);
  const initialMenu = menus.find((menu) => menu.week === week) || menus.find((menu) => menu.week > week) || menus[menus.length - 1];
  selectedWeeks.add(initialMenu.week);
  let initialWeek = initialMenu.week;
  try {
    const draft = JSON.parse(sessionStorage.getItem(draftKey));
    if (draft?.version === menuVersion && Array.isArray(draft.selectedWeeks) && Array.isArray(draft.weeks)) {
      selectedWeeks.clear();
      for (const key of draft.selectedWeeks) if (menus.some((menu) => menu.week === key)) selectedWeeks.add(key);
      for (const saved of draft.weeks.slice(0, menus.length)) {
        const menu = menus.find((item) => item.week === saved?.week);
        if (!menu || !Number.isInteger(saved.count) || saved.count < 1 || saved.count > 10 || !Array.isArray(saved.bundles)) continue;
        setWeek(menu.week);
        updateBundles(Math.max(saved.count, Math.min(saved.bundles.length, 10)), menu, false);
        const state = states.get(menu.week);
        saved.bundles.slice(0, 10).forEach((bundle, index) => {
          if (Array.isArray(bundle)) bundle.slice(0, menu.mealCount).forEach((values, mealIndex) => state.bundles[index].meals[mealIndex].restore(values));
        });
        updateBundles(saved.count, menu, false);
      }
      if (menus.some((menu) => menu.week === draft.activeWeek)) initialWeek = draft.activeWeek;
    }
  } catch { /* Storage is optional; an unavailable or invalid draft never prevents a new request. */ }
  setWeek(initialWeek);
  restoring = false;
  updateEstimate();
  menuWeek.hidden = false;
}
