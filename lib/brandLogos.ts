// Filenames in /public/brand-logos.
const LOGO_FILES: Record<string, string> = {
  "aston-martin": "aston-martin.svg",
  audi: "audi.svg",
  bmw: "bmw.svg",
  citroen: "citroen.svg",
  ferrari: "ferrari.svg",
  honda: "honda.svg",
  hyundai: "hyundai.svg",
  isuzu: "isuzu.svg",
  jaguar: "jaguar.svg",
  jeep: "jeep.svg",
  jlr: "jlr.svg",
  kia: "kia.svg",
  lamborghini: "lamborghini.svg",
  "land-rover": "land-rover.svg",
  lexus: "lexus.svg",
  mahindra: "mahindra.svg",
  "maruti-suzuki": "maruti-suzuki.svg",
  maserati: "maserati.svg",
  mclaren: "mclaren.svg",
  "mercedes-benz": "mercedes-benz.svg",
  "mg-motor": "mg-motor.svg",
  mini: "mini.svg",
  nissan: "nissan.svg",
  porsche: "porsche.svg",
  "range-rover": "range-rover.png",
  renault: "renault.svg",
  "rolls-royce": "rolls-royce.svg",
  skoda: "skoda.svg",
  tata: "tata.svg",
  toyota: "toyota.svg",
  volkswagen: "volkswagen.svg",
  volvo: "volvo.svg",
};

// A brand name typed into the admin form ("Mercedes", "Mercedes-Benz",
// "MG") won't always match the logo file's own slug exactly.
const ALIASES: Record<string, string> = {
  mercedes: "mercedes-benz",
  "mercedes benz": "mercedes-benz",
  "range rover": "range-rover",
  "land rover": "land-rover",
  "rolls royce": "rolls-royce",
  "aston martin": "aston-martin",
  "maruti suzuki": "maruti-suzuki",
  maruti: "maruti-suzuki",
  mg: "mg-motor",
  "mg motor": "mg-motor",
  vw: "volkswagen",
};

// These logo files carry no fill color of their own (or one so dark
// it's the same as the medallion's black face), so they render
// invisible or near-invisible there — confirmed by rendering all 30
// on a black square and eyeballing which ones vanished. Forcing them
// to a flat white silhouette (see needsLightTreatment below) keeps
// them legible; brands not in this set already have their own
// contrast (BMW's colors, Toyota's red, Volkswagen's blue) and would
// just get bleached by the same treatment.
const DARK_LOGOS = new Set([
  "audi",
  "citroen",
  "ferrari",
  "nissan",
  "mclaren",
  "rolls-royce",
  "lexus",
  "maserati",
  "jaguar",
  "jlr",
  "land-rover",
  "lamborghini",
]);

function slugFor(brand: string): string {
  const normalized = brand.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  return ALIASES[normalized] ?? normalized.replace(/\s+/g, "-");
}

/** Returns the /brand-logos path for a brand name, or null if there's
    no matching logo file (caller should fall back to text). */
export function getBrandLogoPath(brand: string): string | null {
  const file = LOGO_FILES[slugFor(brand)];
  return file ? `/brand-logos/${file}` : null;
}

/** True if this brand's logo needs to be forced to a white
    silhouette to stay visible against a black medallion face. */
export function needsLightTreatment(brand: string): boolean {
  return DARK_LOGOS.has(slugFor(brand));
}
