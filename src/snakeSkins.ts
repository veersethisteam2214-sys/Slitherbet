export type ScalePattern = "smooth" | "diamond" | "keeled";
export type BodyStyle = "slender" | "classic" | "heavy";
export type CosmeticCategory = "scales" | "clothing" | "hat";

export type ClothingStyle = "collar" | "vest" | "scarf" | "bandana" | "chain";
export type HatStyle = "cap" | "crown" | "topper" | "cowboy" | "beanie" | "horns";

/** Fixed multiplayer serpent — cosmetics layer on top of this. */
export const BASE_SNAKE = {
  color: "#1b4332",
  accent: "#40916c",
  belly: "#d8f3dc",
  bodyStyle: "classic" as BodyStyle,
};

export type Cosmetic = {
  id: string;
  category: CosmeticCategory;
  name: string;
  price: number;
  default?: boolean;
  pattern?: ScalePattern;
  tintColor?: string;
  tintAccent?: string;
  tintBelly?: string;
  clothingStyle?: ClothingStyle;
  hatStyle?: HatStyle;
  primary?: string;
  secondary?: string;
};

export type EquippedCosmetics = {
  scales: string;
  clothing: string | null;
  hat: string | null;
};

export const DEFAULT_EQUIPPED: EquippedCosmetics = {
  scales: "scales-natural",
  clothing: null,
  hat: null,
};

export const cosmetics: Cosmetic[] = [
  { id: "scales-natural", category: "scales", name: "Natural", price: 0, pattern: "smooth", default: true },
  { id: "scales-emerald", category: "scales", name: "Emerald Gleam", price: 20, pattern: "smooth", tintColor: "#14532d", tintAccent: "#4ade80", tintBelly: "#dcfce7" },
  { id: "scales-gold", category: "scales", name: "Gold Diamond", price: 35, pattern: "diamond", tintColor: "#78350f", tintAccent: "#fbbf24", tintBelly: "#fef3c7" },
  { id: "scales-obsidian", category: "scales", name: "Obsidian Keel", price: 40, pattern: "keeled", tintColor: "#1c1917", tintAccent: "#57534e", tintBelly: "#a8a29e" },
  { id: "scales-ruby", category: "scales", name: "Ruby Scale", price: 45, pattern: "diamond", tintColor: "#7f1d1d", tintAccent: "#f87171", tintBelly: "#fecaca" },
  { id: "scales-frost", category: "scales", name: "Frost Keel", price: 38, pattern: "keeled", tintColor: "#0c4a6e", tintAccent: "#38bdf8", tintBelly: "#e0f2fe" },

  { id: "cloth-collar", category: "clothing", name: "Gold Collar", price: 28, clothingStyle: "collar", primary: "#ca8a04", secondary: "#fde047" },
  { id: "cloth-vest", category: "clothing", name: "Leather Vest", price: 42, clothingStyle: "vest", primary: "#44403c", secondary: "#78716c" },
  { id: "cloth-scarf", category: "clothing", name: "Crimson Scarf", price: 24, clothingStyle: "scarf", primary: "#b91c1c", secondary: "#fca5a5" },
  { id: "cloth-bandana", category: "clothing", name: "Cave Bandana", price: 22, clothingStyle: "bandana", primary: "#1d4ed8", secondary: "#93c5fd" },
  { id: "cloth-chain", category: "clothing", name: "Silver Chain", price: 32, clothingStyle: "chain", primary: "#94a3b8", secondary: "#e2e8f0" },

  { id: "hat-cap", category: "hat", name: "Snapback", price: 18, hatStyle: "cap", primary: "#171717", secondary: "#63ffe0" },
  { id: "hat-beanie", category: "hat", name: "Knit Beanie", price: 16, hatStyle: "beanie", primary: "#7c2d12", secondary: "#fdba74" },
  { id: "hat-cowboy", category: "hat", name: "Dust Cowboy", price: 38, hatStyle: "cowboy", primary: "#78350f", secondary: "#d97706" },
  { id: "hat-topper", category: "hat", name: "Gentleman Topper", price: 52, hatStyle: "topper", primary: "#0a0a0a", secondary: "#525252" },
  { id: "hat-crown", category: "hat", name: "Royal Crown", price: 85, hatStyle: "crown", primary: "#ca8a04", secondary: "#fde047" },
  { id: "hat-horns", category: "hat", name: "Demon Horns", price: 48, hatStyle: "horns", primary: "#450a0a", secondary: "#ef4444" },
];

export function cosmeticById(id: string): Cosmetic | undefined {
  return cosmetics.find((c) => c.id === id);
}

export function cosmeticsByCategory(cat: CosmeticCategory): Cosmetic[] {
  return cosmetics.filter((c) => c.category === cat);
}

export function resolveSnakeLook(equipped: EquippedCosmetics) {
  const scale = cosmeticById(equipped.scales) ?? cosmetics[0];
  return {
    color: scale.tintColor ?? BASE_SNAKE.color,
    accent: scale.tintAccent ?? BASE_SNAKE.accent,
    belly: scale.tintBelly ?? BASE_SNAKE.belly,
    bodyStyle: BASE_SNAKE.bodyStyle,
    scalePattern: scale.pattern ?? "smooth",
    clothing: equipped.clothing ? cosmeticById(equipped.clothing) : null,
    hat: equipped.hat ? cosmeticById(equipped.hat) : null,
  };
}

export function defaultOwnedCosmetics(): string[] {
  return cosmetics.filter((c) => c.default || c.price === 0).map((c) => c.id);
}

/** Maps old full-skin IDs to nearest scale cosmetic. */
const LEGACY_SKIN_MAP: Record<string, string> = {
  "wild-green": "scales-natural",
  "copper-king": "scales-gold",
  "obsidian-viper": "scales-obsidian",
  "royal-cobra": "scales-ruby",
  "sand-asp": "scales-gold",
  "frost-python": "scales-frost",
  "crimson-mamba": "scales-ruby",
  "jade-emperor": "scales-emerald",
};

function normalizeCosmeticId(id: string): string {
  if (cosmeticById(id)) return id;
  return LEGACY_SKIN_MAP[id] ?? id;
}

export function loadOwnedCosmetics(): string[] {
  try {
    const raw = localStorage.getItem("sb_cosmetics_owned");
    let parsed: string[] = raw ? JSON.parse(raw) : [];
    if (!raw) {
      const legacy = localStorage.getItem("sb_skins_owned");
      if (legacy) parsed = JSON.parse(legacy) as string[];
    }
    const ids = [...new Set([...defaultOwnedCosmetics(), ...parsed.map(normalizeCosmeticId).filter((id) => cosmeticById(id))])];
    saveOwnedCosmetics(ids);
    return ids;
  } catch {
    return defaultOwnedCosmetics();
  }
}

export function loadEquippedCosmetics(): EquippedCosmetics {
  try {
    const raw = localStorage.getItem("sb_cosmetics_equipped");
    if (raw) {
      const parsed = JSON.parse(raw) as EquippedCosmetics;
      return {
        scales: normalizeCosmeticId(parsed.scales ?? DEFAULT_EQUIPPED.scales),
        clothing: parsed.clothing && cosmeticById(parsed.clothing) ? parsed.clothing : null,
        hat: parsed.hat && cosmeticById(parsed.hat) ? parsed.hat : null,
      };
    }
    const legacy = localStorage.getItem("sb_skin_equipped");
    if (legacy) {
      const mapped = normalizeCosmeticId(legacy);
      if (cosmeticById(mapped)?.category === "scales") {
        return { ...DEFAULT_EQUIPPED, scales: mapped };
      }
    }
    return { ...DEFAULT_EQUIPPED };
  } catch {
    return { ...DEFAULT_EQUIPPED };
  }
}

export function saveEquippedCosmetics(eq: EquippedCosmetics) {
  localStorage.setItem("sb_cosmetics_equipped", JSON.stringify(eq));
}

export function saveOwnedCosmetics(ids: string[]) {
  localStorage.setItem("sb_cosmetics_owned", JSON.stringify(ids));
}

export function loadUsername(): string {
  return localStorage.getItem("sb_username") ?? "";
}

export function saveUsername(name: string) {
  localStorage.setItem("sb_username", name.trim());
}

export function isValidUsername(name: string) {
  const t = name.trim();
  return t.length >= 3 && t.length <= 16 && /^[a-zA-Z0-9_]+$/.test(t);
}

export function equippedSummary(eq: EquippedCosmetics): string {
  const parts: string[] = [];
  const s = cosmeticById(eq.scales);
  if (s) parts.push(s.name);
  if (eq.clothing) {
    const c = cosmeticById(eq.clothing);
    if (c) parts.push(c.name);
  }
  if (eq.hat) {
    const h = cosmeticById(eq.hat);
    if (h) parts.push(h.name);
  }
  return parts.join(" · ");
}
