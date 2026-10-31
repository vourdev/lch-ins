import "server-only"

/** Label lama di data contoh yang namanya berbeda di master data. */
const LEGACY_COB_NAMES: Record<string, string> = {
  "personal accident": "general accident",
}

/**
 * Kunci pencarian COB di master, dalam huruf kecil. Label tampilan ("Marine
 * Cargo") dan nama master ("MARINE CARGO") sama bila dibandingkan huruf kecil,
 * jadi cukup satu kunci; label lama ditambah nama master padanannya.
 */
export function cobLookupKeys(value: string): string[] {
  const key = value.trim().toLowerCase()
  const legacy = LEGACY_COB_NAMES[key]
  return legacy ? [key, legacy] : [key]
}
