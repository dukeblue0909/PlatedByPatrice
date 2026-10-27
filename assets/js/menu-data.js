// Menu content and prices from NOVEMBER 2026 MENUS - PLATED BY PATRICE.docx.
// Prices are cents; upgrades apply to the individual entree where selected.
(() => {
  const choice = (id, label, extraCents = 0, fields = []) => ({ id, label, extraCents, fields });
  const select = (id, label, options) => ({ id, label, type: "select", options });
  const checkbox = (id, label, extraCents = 0) => ({ id, label, type: "checkbox", extraCents });
  const choices = (labels) => labels.map((label) => choice(label.toLowerCase().replace(/[^a-z0-9]+/g, "-"), label));
  const dressing = (labels) => select("dressing", "Dressing", choices(labels));
  const rice = () => select("rice", "Rice", choices(["White rice", "Brown rice"]));
  const wings = (flavors, label = "Flavored wings", id = "flavored-wings") =>
    choice(id, label, 0, [select("flavor", "Wing flavor", choices(flavors))]);
  const catfish = () => choice("catfish", "Blackened catfish fillet", 200);
  const salmon = () => choice("salmon", "Salmon", 300);
  const plate = (meats, sides) => ({
    id: "mix-match", label: "Mix & match entree",
    description: "Choose one meat and two sides for this entree.",
    fields: [select("meat", "Meat", meats), select("side-1", "First side", sides), select("side-2", "Second side", sides)],
  });
  const simpleSides = (labels) => choices(labels);
  const seasonedRice = () => choice("seasoned-rice", "Seasoned rice", 0, [rice()]);

  const salmonBites = () => choice("salmon-bites", "Teriyaki salmon bites", 300);
  window.PATRICE_MENUS = [
    {
      week: "2026-11-02", label: "Week of November 2, 2026", priceCents: 6500, mealCount: 4,
      entrees: [
        {
          id: "caesar", label: "Caesar salad",
          description: "Grilled chicken breast or salmon, croutons, and parmesan cheese.",
          fields: [select("protein", "Protein", [choice("chicken", "Grilled chicken breast"), salmon()]), dressing(["Caesar", "Ranch", "Italian", "House vinaigrette"])],
        },
        {
          id: "stir-fry", label: "Chicken or shrimp stir fry",
          description: "Peppers, onions, carrots, snow peas, and broccoli in teriyaki sauce over rice. Mushrooms upon request.",
          fields: [select("protein", "Protein", choices(["Chicken", "Shrimp"])), rice(), select("heat", "Heat", choices(["Mild", "Spicy"])), checkbox("mushrooms", "Add mushrooms")],
        },
        plate(
          [wings(["Buffalo", "BBQ", "Asian", "Garlic Parm", "Hot Honey", "Plain"]), catfish(), salmonBites()],
          [choice("asian-noodles", "Asian garlic noodles"), seasonedRice(), ...simpleSides(["Mixed vegetable medley", "Broccoli", "Baked sweet potatoes with honey butter"])],
        ),
      ],
    },
    {
      week: "2026-11-09", label: "Week of November 9, 2026", priceCents: 6500, mealCount: 4,
      entrees: [
        {
          id: "kale", label: "Fall Kale salad",
          description: "Red onion, colored peppers, cucumbers, fresh herbs, pecans, dried cranberries, and Granny Smith apples. Feta cheese upon request.",
          fields: [dressing(["Cider dressing", "Ranch", "Italian", "House vinaigrette"]), checkbox("feta", "Add feta cheese")],
        },
        { id: "marry-me-chicken", label: "Marry me chicken", description: "Chicken, sundried tomatoes, and spinach in a cream sauce, with mashed potatoes.", fields: [] },
        plate(
          // The source lists "Asian Garlic Parm" as one flavor for this week.
          [wings(["Plain", "Jerk", "Honey Garlic"], "Baked whole wings", "baked-wings"), salmon(), wings(["Buffalo", "Asian Garlic Parm", "Hot Honey", "Plain"]), catfish()],
          [choice("mashed-potatoes", "Mashed potatoes"), seasonedRice(), ...simpleSides(["Side salad", "Green beans", "Corn on the cob"])],
        ),
      ],
    },
    {
      week: "2026-11-16", label: "Week of November 16, 2026", priceCents: 6500, mealCount: 4,
      entrees: [
        {
          id: "greek", label: "Chicken Greek salad",
          description: "Mixed greens, Greek olives, pepperoncini, feta cheese, beets, tomatoes, cucumbers, and grilled chicken.",
          fields: [dressing(["Greek", "Ranch", "Italian", "House vinaigrette"])],
        },
        {
          id: "chili", label: "Loaded chili",
          description: "Turkey or beef chili with all the toppings on the side: sour cream, salsa, green onions, cheddar cheese, and tortilla chips. Black beans upon request.",
          fields: [select("protein", "Chili", choices(["Turkey", "Beef"])), checkbox("black-beans", "Add black beans")],
        },
        plate(
          [wings(["Buffalo", "BBQ", "Asian", "Garlic Parm", "Hot Honey", "Plain"]), catfish(), salmonBites()],
          simpleSides(["Asian garlic noodles", "Broccoli", "Corn on the cob", "Baked sweet potatoes with honey butter"]),
        ),
      ],
    },
  ];
})();
