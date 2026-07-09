/* Full recipes: meal + drink with ingredients, steps, and links */
(function (global) {
  const recipes = [
    {
      id: "r1",
      nationality: "Italian",
      meal: "Lemon ricotta pasta with basil",
      drink: "Sparkling blood orange spritz (non-alcoholic option)",
      time: "25 min",
      servings: "2",
      mealIngredients: [
        "8 oz spaghetti or bucatini",
        "1 cup whole-milk ricotta",
        "Zest + juice of 1 large lemon",
        "1/3 cup grated Parmesan",
        "2 tbsp olive oil",
        "Handful fresh basil, torn",
        "Salt, black pepper, pinch red pepper flakes"
      ],
      mealSteps: [
        "Boil pasta in well-salted water until al dente; reserve 1 cup pasta water.",
        "Whisk ricotta, lemon zest, lemon juice, Parmesan, olive oil, salt, and pepper.",
        "Toss hot pasta with ricotta mixture, loosening with pasta water until creamy.",
        "Fold in basil and red pepper flakes. Serve immediately with extra Parmesan."
      ],
      drinkIngredients: [
        "3 oz blood orange juice (fresh if possible)",
        "1 oz fresh lemon juice",
        "4–6 oz sparkling water or prosecco",
        "Ice, orange slice, optional rosemary sprig"
      ],
      drinkSteps: [
        "Fill a wine glass with ice.",
        "Add blood orange and lemon juice; top with sparkling water (or prosecco).",
        "Stir gently; garnish with orange and rosemary."
      ],
      mealLink: "https://www.bonappetit.com/recipe/pasta-with-ricotta-and-lemon",
      drinkLink: "https://www.bbcgoodfood.com/recipes/collection/mocktail-recipes"
    },
    {
      id: "r2",
      nationality: "Japanese",
      meal: "Miso-glazed salmon with cucumber salad",
      drink: "Iced genmaicha",
      time: "30 min",
      servings: "2",
      mealIngredients: [
        "2 salmon fillets (5–6 oz each)",
        "2 tbsp white miso",
        "1 tbsp mirin",
        "1 tbsp soy sauce or tamari",
        "1 tsp honey or maple",
        "1 cucumber, thinly sliced",
        "1 tbsp rice vinegar, 1 tsp sesame oil, sesame seeds"
      ],
      mealSteps: [
        "Mix miso, mirin, soy, and honey. Pat salmon dry; brush with glaze.",
        "Broil or pan-sear salmon 6–8 minutes until just cooked and glaze caramelizes.",
        "Toss cucumber with rice vinegar, sesame oil, pinch of salt, and sesame seeds.",
        "Plate salmon with cucumber salad and steamed rice if you like."
      ],
      drinkIngredients: ["2 tsp genmaicha (or 2 bags)", "16 oz hot water", "Ice", "Optional honey"],
      drinkSteps: [
        "Steep genmaicha 3–4 minutes in hot water; remove leaves/bags.",
        "Cool slightly, pour over ice; sweeten lightly if desired."
      ],
      mealLink: "https://www.justonecookbook.com/miso-salmon/",
      drinkLink: "https://www.justonecookbook.com/genmaicha/"
    },
    {
      id: "r3",
      nationality: "Mexican",
      meal: "Street-style elote bowls with avocado",
      drink: "Chili-lime agua fresca",
      time: "20 min",
      servings: "2",
      mealIngredients: [
        "3 cups corn kernels (fresh, frozen, or canned drained)",
        "2 tbsp mayo or Greek yogurt",
        "1/4 cup crumbled cotija or feta",
        "1 lime (zest + juice)",
        "1/2 tsp chili powder or Tajín",
        "1 ripe avocado, cubed",
        "Cilantro, salt"
      ],
      mealSteps: [
        "Char corn in a hot skillet with a little oil until blistered.",
        "Off heat, stir in mayo, lime zest/juice, chili powder, salt, and most of the cheese.",
        "Top with avocado, remaining cheese, and cilantro. Serve warm."
      ],
      drinkIngredients: [
        "2 cups watermelon or cucumber chunks",
        "Juice of 2 limes",
        "1–2 tsp honey or agave",
        "Pinch chili powder / Tajín, ice, water to thin"
      ],
      drinkSteps: [
        "Blend fruit, lime, sweetener, and 1 cup water until smooth.",
        "Strain if desired; pour over ice; dust with chili powder."
      ],
      mealLink: "https://www.simplyrecipes.com/recipes/mexican_street_corn_salad_esquites/",
      drinkLink: "https://www.simplyrecipes.com/recipes/agua_fresca/"
    },
    {
      id: "r4",
      nationality: "French",
      meal: "Herbed mushroom galette",
      drink: "Peach sparkling water (or light rosé)",
      time: "45 min",
      servings: "2–3",
      mealIngredients: [
        "1 sheet store-bought pie dough or puff pastry",
        "12 oz mixed mushrooms, sliced",
        "1 small shallot, sliced",
        "2 tbsp butter or olive oil",
        "1 tsp thyme, 1 garlic clove",
        "2 oz soft goat cheese or crème fraîche",
        "1 egg for wash (optional), salt, pepper"
      ],
      mealSteps: [
        "Sauté shallot and mushrooms in butter until browned; add garlic, thyme, salt, pepper.",
        "Roll dough into a rough circle; spread cheese in center, leaving a 2-inch border.",
        "Pile mushrooms on cheese; fold edges over. Brush crust with egg if using.",
        "Bake at 400°F / 200°C for 25–30 min until golden. Rest 5 min before slicing."
      ],
      drinkIngredients: ["Sparkling water", "2 tbsp peach nectar or muddled peach", "Ice", "Optional mint"],
      drinkSteps: [
        "Add peach nectar to a glass with ice; top with sparkling water.",
        "Stir gently; mint optional. (Or pour a chilled glass of light rosé.)"
      ],
      mealLink: "https://smittenkitchen.com/2014/10/mushroom-galette/",
      drinkLink: "https://www.bonappetit.com/story/how-to-make-a-spritz"
    },
    {
      id: "r5",
      nationality: "Thai",
      meal: "Coconut green curry with jasmine rice",
      drink: "Thai iced tea (light)",
      time: "35 min",
      servings: "2–3",
      mealIngredients: [
        "1 can (14 oz) coconut milk",
        "2–3 tbsp green curry paste",
        "8 oz chicken, tofu, or shrimp",
        "1 cup mixed veg (bell pepper, zucchini, snap peas)",
        "1 tbsp fish sauce or soy, 1 tsp brown sugar",
        "Thai basil or regular basil, lime",
        "Jasmine rice for serving"
      ],
      mealSteps: [
        "Simmer 1/2 can coconut milk with curry paste until fragrant and oil separates slightly.",
        "Add protein; cook through. Add remaining coconut milk, veg, fish sauce, and sugar.",
        "Simmer until veg are tender-crisp. Finish with basil and lime. Serve over rice."
      ],
      drinkIngredients: [
        "2 tbsp Thai tea mix or strong black tea + star anise pinch",
        "1 cup hot water",
        "2–3 tbsp sweetened condensed milk (or less for light)",
        "Ice, splash of milk"
      ],
      drinkSteps: [
        "Steep tea 4–5 min; strain and cool.",
        "Stir in condensed milk; pour over ice; top with a little milk."
      ],
      mealLink: "https://hot-thai-kitchen.com/green-curry/",
      drinkLink: "https://hot-thai-kitchen.com/thai-iced-tea/"
    },
    {
      id: "r6",
      nationality: "Indian",
      meal: "Chana masala with warm flatbread",
      drink: "Mango lassi",
      time: "40 min",
      servings: "2–3",
      mealIngredients: [
        "1 can chickpeas, drained",
        "1 onion, diced; 2 garlic cloves; 1 tsp ginger",
        "1 can crushed tomatoes",
        "1.5 tsp garam masala, 1 tsp cumin, 1/2 tsp turmeric, chili to taste",
        "2 tbsp oil, salt, cilantro",
        "Naan or roti for serving"
      ],
      mealSteps: [
        "Sauté onion in oil until golden; add garlic, ginger, and spices 30 seconds.",
        "Add tomatoes; simmer 8 min. Stir in chickpeas + splash of water; simmer 10–15 min.",
        "Mash a few chickpeas for body. Finish with cilantro; serve with warm flatbread."
      ],
      drinkIngredients: [
        "1 cup frozen or fresh mango chunks",
        "1/2 cup plain yogurt",
        "1/4 cup milk or water",
        "1–2 tsp honey, pinch cardamom (optional), ice"
      ],
      drinkSteps: ["Blend all until smooth and frothy. Adjust thickness with milk/water."],
      mealLink: "https://www.cookwithmanali.com/chana-masala/",
      drinkLink: "https://www.cookwithmanali.com/mango-lassi/"
    },
    {
      id: "r7",
      nationality: "Greek",
      meal: "Lemon herb chicken with orzo",
      drink: "Mint lemonade",
      time: "35 min",
      servings: "2",
      mealIngredients: [
        "2 chicken thighs or breasts",
        "1 cup orzo",
        "2 cups chicken broth or water",
        "Juice + zest of 1 lemon",
        "2 tbsp olive oil, oregano, garlic",
        "Handful spinach or parsley, feta optional"
      ],
      mealSteps: [
        "Season chicken with salt, pepper, oregano; sear in olive oil until golden and cooked.",
        "In same pan, toast orzo briefly; add broth, lemon, garlic; simmer until orzo is tender.",
        "Fold in greens and lemon zest; nestle chicken on top. Finish with feta if using."
      ],
      drinkIngredients: ["1/2 cup lemon juice", "2–3 tbsp sugar or honey", "2 cups water", "Mint leaves", "Ice"],
      drinkSteps: [
        "Dissolve sweetener in a little warm water; combine with lemon juice and cold water.",
        "Muddle mint gently; serve over ice."
      ],
      mealLink: "https://www.themediterraneandish.com/lemon-chicken-orzo-soup/",
      drinkLink: "https://www.themediterraneandish.com/fresh-mint-lemonade/"
    },
    {
      id: "r8",
      nationality: "Korean",
      meal: "Gochujang tofu bowls with pickled veg",
      drink: "Honey citron tea (hot or iced)",
      time: "30 min",
      servings: "2",
      mealIngredients: [
        "14 oz firm tofu, cubed",
        "2 tbsp gochujang, 1 tbsp soy, 1 tbsp sesame oil, 1 tsp sugar",
        "2 cups cooked rice",
        "Quick pickles: cucumber + carrot + rice vinegar + sugar + salt",
        "Green onion, sesame seeds"
      ],
      mealSteps: [
        "Press tofu lightly; pan-fry until crisp on edges.",
        "Whisk gochujang, soy, sesame oil, sugar; toss tofu to glaze.",
        "Quick-pickle sliced veg 10 min. Build bowls: rice, tofu, pickles, green onion, sesame."
      ],
      drinkIngredients: ["1–2 tbsp yuzu/citron tea concentrate or honey + lemon", "Hot water or cold water + ice"],
      drinkSteps: ["Stir concentrate (or honey + lemon) into hot water; or shake with cold water and ice."],
      mealLink: "https://www.koreanbapsang.com/dubu-jorim-braised-tofu/",
      drinkLink: "https://www.maangchi.com/recipe/yuja-cha"
    },
    {
      id: "r9",
      nationality: "Moroccan",
      meal: "Vegetable tagine with couscous",
      drink: "Fresh mint tea",
      time: "50 min",
      servings: "3–4",
      mealIngredients: [
        "1 onion, 2 carrots, 1 zucchini, 1 can chickpeas",
        "1 can diced tomatoes",
        "1 tsp each cumin, cinnamon, paprika; ginger; garlic",
        "2 cups vegetable broth, dried apricots optional",
        "Couscous, olive oil, cilantro, lemon"
      ],
      mealSteps: [
        "Sauté onion and spices in olive oil. Add veg, tomatoes, broth, chickpeas; simmer 25–35 min.",
        "Season with salt, lemon, cilantro. Steam couscous per package; fluff with oil.",
        "Serve tagine over couscous."
      ],
      drinkIngredients: ["2 tsp green tea", "Large handful fresh mint", "Sugar to taste", "Hot water"],
      drinkSteps: [
        "Steep green tea briefly; add mint (and sugar if using); pour from height for foam if you like."
      ],
      mealLink: "https://www.bbcgoodfood.com/recipes/moroccan-tagine",
      drinkLink: "https://www.bbcgoodfood.com/recipes/moroccan-mint-tea"
    },
    {
      id: "r10",
      nationality: "American",
      meal: "Sheet-pan maple mustard chicken & veg",
      drink: "Homemade iced tea",
      time: "40 min",
      servings: "2–3",
      mealIngredients: [
        "4 bone-in or boneless chicken pieces",
        "2 tbsp Dijon, 1 tbsp maple syrup, 1 tbsp olive oil",
        "Broccoli, potatoes or carrots, cubed",
        "Salt, pepper, garlic powder, fresh thyme optional"
      ],
      mealSteps: [
        "Heat oven to 425°F / 220°C. Toss veg with oil, salt, pepper; spread on sheet pan.",
        "Mix Dijon, maple, oil, seasonings; coat chicken. Nestle on pan with veg.",
        "Roast 25–35 min until chicken is cooked and veg are browned. Rest 5 min."
      ],
      drinkIngredients: ["2 black tea bags", "2 cups hot water", "Ice", "Lemon, honey optional"],
      drinkSteps: [
        "Steep tea 5 min; cool. Pour over ice; sweeten and add lemon to taste."
      ],
      mealLink: "https://www.budgetbytes.com/sheet-pan-honey-mustard-chicken/",
      drinkLink: "https://www.simplyrecipes.com/recipes/how_to_make_basic_iced_tea/"
    }
  ];

  global.CL = global.CL || {};
  global.CL.data = global.CL.data || {};
  global.CL.data.recipes = recipes;
})(window);
