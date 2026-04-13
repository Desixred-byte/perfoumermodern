import type { Locale } from "@/lib/i18n";

const NOTE_NAME_AZ_MAP: Record<string, string> = {
  oud: "Ud",
  amber: "Ənbər",
  musk: "Müşk",
  bergamot: "Berqamot",
  lemon: "Limon",
  jasmine: "Yasəmən",
  rose: "Qızılgül",
  cedar: "Sidr",
  sandalwood: "Səndəl ağacı",
  vanilla: "Vanil",
  patchouli: "Paçuli",
  vetiver: "Vetiver",
  tobacco: "Tütün",
  incense: "Buxur",
  leather: "Dəri",
  lavender: "Lavanda",
  neroli: "Neroli",
  peony: "Pion",
  iris: "İris",
  violet: "Bənövşə",
  grapefruit: "Qreypfrut",
  mandarin: "Mandarin",
  marine: "Dəniz notu",
  aquatic: "Su notu",
  cinnamon: "Darçın",
  tonka: "Tonka",
  benzoin: "Benzoe",
};

function normalize(value: string) {
  return value.trim().toLowerCase();
}

export function humanizeNoteToken(value: string) {
  return value
    .split("-")
    .map((part) => (part ? `${part[0]?.toUpperCase() || ""}${part.slice(1)}` : part))
    .join(" ");
}

export function localizeNoteLabel(input: { slug?: string; name?: string }, locale: Locale) {
  const slug = normalize(input.slug || "");
  const name = (input.name || "").trim();

  if (locale !== "az") {
    return name || humanizeNoteToken(slug);
  }

  return (
    NOTE_NAME_AZ_MAP[slug] ||
    NOTE_NAME_AZ_MAP[normalize(name)] ||
    name ||
    humanizeNoteToken(slug)
  );
}
