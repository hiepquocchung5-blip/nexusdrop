// Deterministic gradient art derived from a game's own slug — presentation only,
// so the storefront looks rich without shipping fake catalog data.
const PALETTES = [
  ["#7c5cff", "#22d3ee"],
  ["#ff5d7d", "#ffb648"],
  ["#34e0a1", "#22d3ee"],
  ["#a48bff", "#ff5d7d"],
  ["#ffb648", "#b6f36b"],
  ["#22d3ee", "#7c5cff"],
];

function hash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h << 5) - h + str.charCodeAt(i);
  return Math.abs(h);
}

export function gameArt(slug = "") {
  const h = hash(slug);
  const [a, b] = PALETTES[h % PALETTES.length];
  const angle = (h % 8) * 45;
  return {
    from: a,
    to: b,
    gradient: `linear-gradient(${angle}deg, ${a}, ${b})`,
    initials: slug
      .split("-")
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase() || "")
      .join(""),
  };
}
