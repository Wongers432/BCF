const SLOT_KEYS = ["A1", "A2", "A3", "B1", "B2", "B3", "C1", "C2", "C3"];

export function displayName(id) {
  // Strip trailing damage/variant suffix: "ITEM-5" or "ITEM:4"
  const clean = id
    .replace(/[-:]\d+$/, "")   // remove trailing -N or :N
    .replace(/[-:]/g, "_");    // normalise remaining separators to underscore
  return clean
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

export function bazaarKey(itemId) {
  return itemId.replace(/-/g, ":");
}

export function parseIngredient(slot) {
  if (!slot || typeof slot !== "string") return null;
  const lastColon = slot.lastIndexOf(":");
  if (lastColon <= 0) return null;
  const id = slot.slice(0, lastColon);
  const qty = Number(slot.slice(lastColon + 1));
  if (!id || !Number.isFinite(qty) || qty <= 0) return null;
  return { id, qty };
}

export function collectIngredients(recipe) {
  const totals = new Map();
  for (const key of SLOT_KEYS) {
    const parsed = parseIngredient(recipe[key]);
    if (!parsed) continue;
    totals.set(parsed.id, (totals.get(parsed.id) ?? 0) + parsed.qty);
  }
  return totals;
}

/** Instant-buy (what you pay): Bazaar buy_summary / buyPrice. */
export function instaBuyUnit(product) {
  const order = product?.buy_summary?.[0];
  if (order?.pricePerUnit > 0) return order.pricePerUnit;
  const fallback = product?.quick_status?.buyPrice;
  return fallback > 0 ? fallback : null;
}

/** Instant-sell (what you receive immediately): sell_summary / sellPrice. */
export function instaSellUnit(product) {
  const order = product?.sell_summary?.[0];
  if (order?.pricePerUnit > 0) return order.pricePerUnit;
  const fallback = product?.quick_status?.sellPrice;
  return fallback > 0 ? fallback : null;
}

/** Sell-offer revenue: list at the current insta-buy / buy_summary price. */
export function sellOfferUnit(product) {
  const order = product?.buy_summary?.[0];
  if (order?.pricePerUnit > 0) return order.pricePerUnit;
  const fallback = product?.quick_status?.buyPrice;
  return fallback > 0 ? fallback : null;
}

export function lookupProduct(products, itemId) {
  const key = bazaarKey(itemId);
  return products[key] ?? products[itemId] ?? null;
}

export function computeFlips(recipes, products) {
  const rows = [];
  const recipeMap = new Map();
  for (const entry of recipes) {
    if (entry.internalname) recipeMap.set(entry.internalname, entry);
  }

  for (const entry of recipes) {
    const outputId = entry.internalname;
    const recipe = entry.recipe;
    if (!outputId || !recipe) continue;

    const outputProduct = lookupProduct(products, outputId);
    if (!outputProduct) continue;

    const ingredients = collectIngredients(recipe);
    if (ingredients.size === 0) continue;

    let cost = 0;
    let missing = false;
    for (const [id, qty] of ingredients) {
      const product = lookupProduct(products, id);
      const unit = instaBuyUnit(product);
      if (unit == null) {
        missing = true;
        break;
      }
      cost += unit * qty;
    }
    if (missing || cost <= 0) continue;

    const count = Number(recipe.count) > 0 ? Number(recipe.count) : 1;
    const instantUnit = instaSellUnit(outputProduct);
    const offerUnit = sellOfferUnit(outputProduct);
    if (instantUnit == null || offerUnit == null) continue;

    const instantRevenue = instantUnit * count;
    const offerRevenue = offerUnit * count;
    const instantProfit = instantRevenue - cost;
    const offerProfit = offerRevenue - cost;

    const sparkPoints = (outputProduct.sell_summary ?? [])
      .slice(0, 8)
      .map((o) => o.pricePerUnit)
      .filter((p) => p > 0);

    rows.push({
      id: outputId,
      name: displayName(outputId),
      texture: entry.texture,
      count,
      cost,
      ingredients: [...ingredients.entries()].map(([id, qty]) => ({
        id,
        qty,
        name: displayName(id),
        texture: recipeMap.get(id)?.texture || null,
      })),
      instantRevenue,
      instantProfit,
      instantMargin: (instantProfit / cost) * 100,
      offerRevenue,
      offerProfit,
      offerMargin: (offerProfit / cost) * 100,
      sparkPoints,
    });
  }

  return rows;
}

export function formatCoins(value) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(2)}m`;
  if (abs >= 1_000) return `${sign}${(abs / 1_000).toFixed(1)}k`;
  return `${sign}${abs.toFixed(1)}`;
}

export function formatPct(value) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return `${value.toFixed(1)}%`;
}

export async function fetchBazaar() {
  const response = await fetch("/hypixel/v2/skyblock/bazaar");
  if (!response.ok) {
    throw new Error(`Bazaar request failed (${response.status})`);
  }
  const json = await response.json();
  if (!json.success || !json.products) {
    throw new Error("Bazaar API returned an unsuccessful response");
  }
  return json.products;
}
