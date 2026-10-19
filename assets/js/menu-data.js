// Menu content and prices from OCTOBER MENUS (1).docx.
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

  globalThis.PATRICE_MENUS = [
    {
      week: "2026-10-05", label: "Week of October 5, 2026", priceCents: 6500, mealCount: 4,
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
          [wings(["Buffalo", "BBQ", "Asian", "Garlic Parm", "Hot Honey", "Plain"]), catfish(), salmon()],
          simpleSides(["Roasted red potatoes", "Green beans", "Broccoli", "Corn on the cob", "Baked sweet potato with honey butter"]),
        ),
      ],
    },
    {
      week: "2026-10-12", label: "Week of October 12, 2026", priceCents: 6500, mealCount: 4,
      entrees: [
        {
          id: "kale", label: "Fall Kale salad",
          description: "Red onion, colored peppers, cucumbers, fresh herbs, pecans, dried cranberries, and Granny Smith apples. Feta cheese upon request.",
          fields: [dressing(["Cider dressing", "Ranch", "Italian", "House vinaigrette"]), checkbox("feta", "Add feta cheese")],
        },
        { id: "ziti", label: "Cheesy baked ziti", description: "With meat sauce and garlic bread.", fields: [] },
        plate(
          // The source lists "Asian Garlic Parm" as one flavor for this week.
          [choice("baked-wings", "Baked whole wings"), salmon(), wings(["Buffalo", "Asian Garlic Parm", "Hot Honey", "Plain"]), catfish()],
          [choice("baked-potato", "Baked potato", 0, [checkbox("loaded", "Make it loaded", 150)]), seasonedRice(), ...simpleSides(["Side salad", "Broccoli", "Corn on the cob"])],
        ),
      ],
    },
    {
      week: "2026-10-19", label: "Week of October 19, 2026", priceCents: 6500, mealCount: 4,
      entrees: [
        {
          id: "greek", label: "Chicken Greek salad",
          description: "Mixed greens, Greek olives, pepperoncini, feta cheese, tomatoes, cucumbers, and grilled chicken.",
          fields: [dressing(["Greek", "Ranch", "Italian", "House vinaigrette"])],
        },
        {
          id: "chipotle", label: "Chicken chipotle bowl",
          description: "Cilantro lime rice, grilled fajita vegetables, and cheese. Black beans upon request; choose any of the options on the side.",
          fields: [
            checkbox("black-beans", "Add black beans"),
            checkbox("sour-cream", "Sour cream on the side"),
            checkbox("salsa", "Salsa on the side"),
            checkbox("corn-salsa", "Corn salsa on the side"),
            checkbox("pico", "Pico de gallo on the side"),
            checkbox("chips", "Tortilla chips on the side"),
            checkbox("guacamole", "Homemade guacamole on the side", 200),
          ],
        },
        plate(
          [choice("steak", "Steak bites with mushrooms & onions"), catfish(), choice("kabobs", "Chicken kabobs"), wings(["Buffalo", "Asian Garlic Parm", "Hot Honey", "Plain"])],
          [...simpleSides(["Baked sweet potato with honey butter", "Creamy mashed potatoes"]), seasonedRice(), ...simpleSides(["Side salad", "Green beans", "Mixed vegetable medley"])],
        ),
      ],
    },
    {
      week: "2026-10-26", label: "Week of October 26, 2026", priceCents: 6500, mealCount: 4,
      entrees: [
        {
          id: "chef", label: "Chef salad",
          description: "Turkey, cucumbers, tomato, green onions, shredded cheese, boiled egg, and croutons. Ham and bacon upon request.",
          fields: [dressing(["Ranch", "Italian", "House vinaigrette"]), checkbox("ham", "Add ham"), checkbox("bacon", "Add bacon")],
        },
        {
          id: "alfredo", label: "Alfredo pasta",
          description: "Grilled vegetables with peppers, onions, spinach, and garlic bread. Mushrooms upon request.",
          fields: [select("protein", "Protein", [choice("chicken", "Grilled chicken"), choice("shrimp", "Grilled shrimp"), choice("both", "Grilled chicken & grilled shrimp", 400)]), checkbox("mushrooms", "Add mushrooms")],
        },
        plate(
          [wings(["Plain", "Jerk", "Honey Garlic"], "Baked whole wings", "baked-wings"), salmon(), wings(["Buffalo", "Asian", "Garlic Parm", "Hot Honey", "Plain"]), catfish()],
          simpleSides(["Creamy mashed potatoes", "Mac & cheese", "Green beans", "Broccoli", "Side salad"]),
        ),
      ],
    },
  ];
})();
