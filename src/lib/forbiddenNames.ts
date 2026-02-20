const FORBIDDEN_NAMES: string[] = [
  // Admin / System
  "admin", "administrator", "administrateur", "administrador", "amministratore",
  "verwaltung", "moderator", "moderateur", "root", "superuser", "system",
  "sysadmin", "support", "helpdesk",
  // Brand / Game
  "wep", "worldexplorerprotocol", "world explorer protocol", "jasper",
  "valcourt", "jasper valcourt", "protocole",
  // Roles
  "owner", "creator", "fondateur", "founder", "staff", "team", "official", "officiel",
];

function normalize(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove accents
    .replace(/[^a-z0-9 ]/g, "")     // remove special chars
    .replace(/\s+/g, " ")
    .trim();
}

export function isDisplayNameForbidden(name: string): boolean {
  const normalized = normalize(name);
  if (!normalized) return false;
  // Also check with spaces removed for compound words
  const noSpaces = normalized.replace(/\s/g, "");
  return FORBIDDEN_NAMES.some((forbidden) => {
    const normForbidden = normalize(forbidden);
    const noSpacesForbidden = normForbidden.replace(/\s/g, "");
    return (
      normalized === normForbidden ||
      noSpaces === noSpacesForbidden ||
      normalized.includes(normForbidden) ||
      noSpaces.includes(noSpacesForbidden)
    );
  });
}
