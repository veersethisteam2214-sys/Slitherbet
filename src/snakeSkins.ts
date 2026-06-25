export type ScalePattern = "smooth" | "diamond" | "keeled";
export type BodyStyle = "slender" | "classic" | "heavy";

export type SnakeSkin = {
  id: string;
  name: string;
  price: number;
  color: string;
  accent: string;
  belly: string;
  scalePattern: ScalePattern;
  bodyStyle: BodyStyle;
  default?: boolean;
};

export const DEFAULT_SKIN_ID = "wild-green";

export const snakeSkins: SnakeSkin[] = [
  { id: "wild-green", name: "Wild Green", price: 0, color: "#1b4332", accent: "#40916c", belly: "#d8f3dc", scalePattern: "smooth", bodyStyle: "classic", default: true },
  { id: "copper-king", name: "Copper King", price: 25, color: "#7f2d12", accent: "#c2410c", belly: "#fed7aa", scalePattern: "diamond", bodyStyle: "classic" },
  { id: "obsidian-viper", name: "Obsidian Viper", price: 45, color: "#1c1917", accent: "#44403c", belly: "#78716c", scalePattern: "keeled", bodyStyle: "slender" },
  { id: "royal-cobra", name: "Royal Cobra", price: 60, color: "#4c1d95", accent: "#7c3aed", belly: "#ddd6fe", scalePattern: "diamond", bodyStyle: "heavy" },
  { id: "sand-asp", name: "Sand Asp", price: 35, color: "#78350f", accent: "#d97706", belly: "#fef3c7", scalePattern: "keeled", bodyStyle: "slender" },
  { id: "frost-python", name: "Frost Python", price: 55, color: "#0c4a6e", accent: "#0284c7", belly: "#e0f2fe", scalePattern: "smooth", bodyStyle: "heavy" },
  { id: "crimson-mamba", name: "Crimson Mamba", price: 40, color: "#7f1d1d", accent: "#dc2626", belly: "#fecaca", scalePattern: "diamond", bodyStyle: "slender" },
  { id: "jade-emperor", name: "Jade Emperor", price: 80, color: "#14532d", accent: "#22c55e", belly: "#bbf7d0", scalePattern: "keeled", bodyStyle: "heavy" },
];

export function skinById(id: string): SnakeSkin {
  return snakeSkins.find((s) => s.id === id) ?? snakeSkins[0];
}

export function defaultOwnedSkins(): string[] {
  return snakeSkins.filter((s) => s.default || s.price === 0).map((s) => s.id);
}

export function loadOwnedSkins(): string[] {
  try {
    const raw = localStorage.getItem("sb_skins_owned");
    if (!raw) return defaultOwnedSkins();
    const parsed = JSON.parse(raw) as string[];
    return [...new Set([...defaultOwnedSkins(), ...parsed])];
  } catch {
    return defaultOwnedSkins();
  }
}

export function loadEquippedSkin(): string {
  return localStorage.getItem("sb_skin_equipped") ?? DEFAULT_SKIN_ID;
}

export function saveEquippedSkin(id: string) {
  localStorage.setItem("sb_skin_equipped", id);
}

export function saveOwnedSkins(ids: string[]) {
  localStorage.setItem("sb_skins_owned", JSON.stringify(ids));
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
