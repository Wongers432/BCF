import { createRequire } from "module";
import { getItemImageUrl } from "../src/itemIcon.js";

const ids = [
  "ENCHANTED_COBBLESTONE",
  "STICK",
  "WOOD-4",
  "REVENANT_VISCERA",
  "GOLD_INGOT",
  "AATROX_BATPHONE",
];

for (const id of ids) {
  console.log(id, getItemImageUrl(id));
}
