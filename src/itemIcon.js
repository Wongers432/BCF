import { getTextureUrl } from "skyblock-assets";
import vanillaPack from "skyblock-assets/matchers/vanilla.json";
import furfskyPack from "skyblock-assets/matchers/furfsky_reborn.json";
import packshqPack from "skyblock-assets/matchers/packshq.json";
import hypixelPlusPack from "skyblock-assets/matchers/hypixel+.json";

function asPack(mod) {
  return mod?.matchers ? mod : mod?.default;
}

const vanilla = asPack(vanillaPack);
const furfsky = asPack(furfskyPack);
const packshq = asPack(packshqPack);
const hypixelPlus = asPack(hypixelPlusPack);

const PACKS = [furfsky, packshq, hypixelPlus, vanilla];
const ERROR_PNG = "https://raw.githubusercontent.com/skyblockstats/skyblock-assets/2.0.11/renders/vanilla/error.png";

/** NEU / Hypixel 1.8 ids that are not the vanilla item name. */
const VANILLA_ALIASES = {
  WOOD: "planks",
  WOOD_STEP: "wooden_slab",
  WOOD_DOUBLE_STEP: "double_wooden_slab",
  INK_SACK: "dye",
  INK_SAC: "dye",
  LOG: "log",
  LOG_2: "log2",
  LEAVES: "leaves",
  LEAVES_2: "leaves2",
  STEP: "stone_slab",
  DOUBLE_STEP: "double_stone_slab",
  SMOOTH_BRICK: "stonebrick",
  THIN_GLASS: "glass_pane",
  STAINED_GLASS: "stained_glass",
  STAINED_GLASS_PANE: "stained_glass_pane",
  STAINED_CLAY: "stained_hardened_clay",
  HARD_CLAY: "hardened_clay",
  SULPHUR: "gunpowder",
  SULFUR: "gunpowder",
  SEEDS: "wheat_seeds",
  SULPHUR_ORE: "gunpowder",
  WATER_LILY: "waterlily",
  WEB: "web",
  PISTON_BASE: "piston",
  PISTON_STICKY_BASE: "sticky_piston",
  REDSTONE_LAMP_OFF: "redstone_lamp",
  REDSTONE_TORCH_ON: "redstone_torch",
  REDSTONE_TORCH_OFF: "unlit_redstone_torch",
  DIODE: "repeater",
  REDSTONE_COMPARATOR: "comparator",
  EXP_BOTTLE: "experience_bottle",
  FIREBALL: "fire_charge",
  SPECKLED_MELON: "speckled_melon",
  RAW_FISH: "fish",
  RAW_BEEF: "beef",
  RAW_CHICKEN: "chicken",
  GRILLED_PORK: "cooked_porkchop",
  PORK: "porkchop",
  POTATO_ITEM: "potato",
  CARROT_ITEM: "carrot",
  NETHER_STALK: "nether_wart",
  NETHER_BRICK_ITEM: "netherbrick",
  SUGAR_CANE: "reeds",
  ENDER_STONE: "end_stone",
  MYCEL: "mycelium",
  WORKBENCH: "crafting_table",
  JACK_O_LANTERN: "lit_pumpkin",
  NOTE_BLOCK: "noteblock",
  IRON_FENCE: "iron_bars",
  FENCE: "fence",
  WOOD_DOOR: "wooden_door",
  IRON_DOOR: "iron_door",
  SPRUCE_DOOR_ITEM: "spruce_door",
  BIRCH_DOOR_ITEM: "birch_door",
  JUNGLE_DOOR_ITEM: "jungle_door",
  ACACIA_DOOR_ITEM: "acacia_door",
  DARK_OAK_DOOR_ITEM: "dark_oak_door",
  SKULL_ITEM: "skull",
  SKULL: "skull",
};

function isLiteralSkyblockId(value) {
  return typeof value === "string" && !/^(regex|pattern|iregex|ipattern):/i.test(value);
}

function buildSkyblockIndex(packs) {
  const index = new Map();
  for (const pack of packs) {
    for (const entry of pack.matchers) {
      const skyblockId = entry.m?.n?.ExtraAttributes?.id;
      if (!isLiteralSkyblockId(skyblockId) || index.has(skyblockId)) continue;
      index.set(skyblockId, {
        minecraftId: entry.m.i?.[0] ?? "skull",
        nbt: entry.m.n ?? { ExtraAttributes: { id: skyblockId } },
      });
    }
  }
  return index;
}

const SKYBLOCK_INDEX = buildSkyblockIndex(PACKS);

export function parseNeuId(raw) {
  const id = String(raw ?? "");
  const dash = id.lastIndexOf("-");
  if (dash > 0) {
    const maybeDamage = Number(id.slice(dash + 1));
    if (Number.isInteger(maybeDamage)) {
      return {
        skyblockId: id,
        base: id.slice(0, dash),
        damage: maybeDamage,
      };
    }
  }
  return { skyblockId: id, base: id, damage: 0 };
}

function textureUrlFromNbt(nbt) {
  const textures = nbt?.SkullOwner?.Properties?.textures;
  const value = Array.isArray(textures) ? textures[0]?.Value : textures?.[0]?.Value;
  if (!value) return null;
  try {
    const json = JSON.parse(atob(value));
    const url = json?.textures?.SKIN?.url;
    if (!url) return null;
    return url;
  } catch {
    return null;
  }
}

function resolveUrl(options) {
  try {
    const url = getTextureUrl({
      ...options,
      packs: PACKS,
      noNullTexture: true,
    });
    if (!url || url.endsWith("error.png")) return null;
    return url;
  } catch {
    return null;
  }
}

const cache = new Map();

export function getItemImageUrl(itemId, providedTexture = null) {
  if (!itemId) return ERROR_PNG;
  const cacheKey = providedTexture ? `${itemId}:${providedTexture}` : itemId;
  if (cache.has(cacheKey)) return cache.get(cacheKey);

  const { skyblockId, base, damage } = parseNeuId(itemId);
  const indexed = SKYBLOCK_INDEX.get(skyblockId) ?? SKYBLOCK_INDEX.get(base);
  
  let rawTextureUrl = null;
  if (providedTexture) {
    try {
      const json = JSON.parse(atob(providedTexture));
      rawTextureUrl = json?.textures?.SKIN?.url || null;
    } catch {}
  }
  if (!rawTextureUrl) {
    rawTextureUrl = indexed ? textureUrlFromNbt(indexed.nbt) : null;
  }

  let url = null;

  if (indexed) {
    if (
      (indexed.minecraftId === "skull" || indexed.minecraftId === "minecraft:skull" || indexed.minecraftId === "minecraft:player_head") &&
      rawTextureUrl
    ) {
      url = rawTextureUrl;
    } else {
      url = resolveUrl({
        id: indexed.minecraftId,
        nbt: indexed.nbt,
      });
    }
  }

  if (!url) {
    const vanillaName = (VANILLA_ALIASES[base] ?? base).toLowerCase();
    url = resolveUrl({
      id: vanillaName,
      damage,
      nbt: { ExtraAttributes: { id: skyblockId } },
    });
  }

  if (!url) {
    url = resolveUrl({
      id: "minecraft:skull",
      nbt: { ExtraAttributes: { id: skyblockId } },
    });
  }

  if (!url && rawTextureUrl) {
    url = rawTextureUrl;
  }

  if (!url) {
    url = getTextureUrl({
      id: (VANILLA_ALIASES[base] ?? base).toLowerCase(),
      damage,
      nbt: {},
      packs: [vanilla],
    });
  }

  cache.set(cacheKey, url || ERROR_PNG);
  return cache.get(cacheKey);
}
