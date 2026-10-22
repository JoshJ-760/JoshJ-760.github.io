export const IONS = [
  { symbol: "Na", name: "Sodium", charge: 1, color: "#f2a35e", tint: "#fff3e6" },
  { symbol: "K", name: "Potassium", charge: 1, color: "#e98674", tint: "#fff0ed" },
  { symbol: "Mg", name: "Magnesium", charge: 2, color: "#5e9b9a", tint: "#eaf5f3" },
  { symbol: "Ca", name: "Calcium", charge: 2, color: "#6884c4", tint: "#eef1fb" },
  { symbol: "Al", name: "Aluminum", charge: 3, color: "#bf8062", tint: "#fbf0ea" },
  { symbol: "Cl", name: "Chlorine", charge: -1, color: "#85a96b", tint: "#f0f6e9" },
  { symbol: "F", name: "Fluorine", charge: -1, color: "#4d9c88", tint: "#eaf6f2" },
  { symbol: "O", name: "Oxygen", charge: -2, color: "#a477b6", tint: "#f5eff8" },
  { symbol: "N", name: "Nitrogen", charge: -3, color: "#6585ad", tint: "#edf2f8" },
  { symbol: "S", name: "Sulfur", charge: -2, color: "#d1a247", tint: "#fbf5e8" }
];

const LIGHT_COLORS = {
  ink: "#203137",
  muted: "#748184",
  faint: "#a6aeaa",
  line: "#e3e5df",
  paper: "#fffefa",
  canvas: "#f5f4ef",
  sidebar: "#fcfbf7",
  green: "#4f8975",
  darkGreen: "#356858",
  paleGreen: "#eaf3ed",
  empty: "#e9eee8",
  dots: "#e7e8e1",
  subtle: "#f1f4ef",
  control: "#f1f2ed",
  paletteHover: null
};

const DARK_COLORS = {
  ink: "#e8eee8",
  muted: "#a2b0a9",
  faint: "#83918a",
  line: "#3a4844",
  paper: "#202a27",
  canvas: "#151d1b",
  sidebar: "#1b2421",
  green: "#88c6aa",
  darkGreen: "#a3d9bf",
  paleGreen: "#263f34",
  empty: "#26332d",
  dots: "#2d3935",
  subtle: "#26332d",
  control: "#2d3935",
  paletteHover: "#2d3935"
};

export const COLORS = { ...LIGHT_COLORS };

export function setColorTheme(theme) {
  Object.assign(COLORS, theme === "dark" ? DARK_COLORS : LIGHT_COLORS);
}

export const CARD = { width: 150, unitHeight: 87 };

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function chargeLabel(charge) {
  return `${Math.abs(charge)}${charge > 0 ? "+" : "−"}`;
}
