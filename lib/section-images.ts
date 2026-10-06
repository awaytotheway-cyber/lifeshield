/**
 * Header photography for the questionnaire sections.
 *
 * One calm, topical image per section, shown as a short banner above the
 * question. The brief for these was "warmth without clutter": they sit at a
 * fixed 120px so the first question still lands above the fold, and none of
 * them are clinical or alarming — this is a questionnaire about cancer risk,
 * and stock imagery of hospitals or distressed people would work against the
 * calm the rest of the design aims for.
 *
 * Images are served from Unsplash's CDN with format and width parameters, so
 * the device downloads roughly a banner-sized JPEG rather than a 5000px
 * original. Each entry carries the photo's blurhash so expo-image can show a
 * matching blur immediately instead of an empty grey box.
 *
 * The Unsplash License does not require attribution, but the photographers
 * are credited here anyway and the ids let anyone trace a photo back.
 */

export type SectionImageKey =
  | "demographics"
  | "reproductive"
  | "radiation"
  | "comorbidities"
  | "familyHistory"
  | "personal"
  | "lifestyle"
  | "diet"
  | "stress"
  | "priorScreening";

export type SectionImage = {
  /** Unsplash photo id, for tracing the original. */
  id: string;
  uri: string;
  blurhash: string;
  /** Describes the picture for screen readers. */
  alt: string;
  photographer: string;
};

function unsplash(slug: string): string {
  // Width 800 covers a full-bleed banner on a 3x phone without overdrawing.
  return `https://images.unsplash.com/${slug}?auto=format&fit=crop&w=800&q=70`;
}

export const SECTION_IMAGES: Record<SectionImageKey, SectionImage> = {
  demographics: {
    id: "u8K28btKe88",
    uri: unsplash("photo-1491929536571-bdbc57e72324"),
    blurhash: "LnG0hF?aoJoy~qxZaxj[aKRkbHay",
    alt: "Still water at first light",
    photographer: "Aleksandr Eremin",
  },
  reproductive: {
    id: "2X6nZA0jmvU",
    uri: unsplash("photo-1526642738196-ad8ed2d50805"),
    blurhash: "L4L=d_PXCT[lG^v}z:F|PDrorWOu",
    alt: "Pale blossom against a clear sky",
    photographer: "Scott Webb",
  },
  radiation: {
    id: "sl0v1Ud9Eqk",
    uri: unsplash("photo-1763518821406-55caf89c01fb"),
    blurhash: "LrHeH;~pp0V|OrogxFaxs.s.RkM|",
    alt: "Sunlight falling through a window onto plants",
    photographer: "Jakayla Toney",
  },
  comorbidities: {
    id: "a-xbE4Tye5c",
    uri: unsplash("photo-1532019333101-b0f43c16a912"),
    blurhash: "LHCbu}~nnPt75FSgn+WW4=N[soa|",
    alt: "Distant mountain range in soft light",
    photographer: "Louis Reed",
  },
  familyHistory: {
    id: "odIhQypCuUk",
    uri: unsplash("photo-1504439268584-b72c5019471e"),
    blurhash: "LAAwF=004n?bM{Rjoft74n?bD%t7",
    alt: "A small hand resting in an adult's palm",
    photographer: "Liv Bruce",
  },
  personal: {
    id: "mRaNok_Ld6s",
    uri: unsplash("photo-1514733670139-4d87a1941d55"),
    blurhash: "LCE_U42r4:Mx$*={I:D%rw-Bt6Nb",
    alt: "A cup of tea on a wooden table",
    photographer: "Lisa Hobbs",
  },
  lifestyle: {
    id: "HS5CLnQbCOc",
    uri: unsplash("photo-1522075782449-e45a34f1ddfb"),
    blurhash: "L]KT6tI;oJay~UWCayayS$s.WBa|",
    alt: "A person sitting quietly, looking out over hills",
    photographer: "Sage Friedman",
  },
  diet: {
    id: "vyHo3nnk8G8",
    uri: unsplash("photo-1575218823251-f9d243b6f720"),
    blurhash: "LMI4wski0*ICs%$*rqKg,uX6KOsp",
    alt: "Fresh tomatoes just picked",
    photographer: "Markus Spiske",
  },
  stress: {
    id: "n7a2OJDSZns",
    uri: unsplash("photo-1474540412665-1cdae210ae6b"),
    blurhash: "LxLgkhNHWBjt}nWXazj@I]oKj@fQ",
    alt: "Calm sea under a soft pink sky",
    photographer: "Harli Marten",
  },
  priorScreening: {
    id: "PypjzKTUqLo",
    uri: unsplash("photo-1493934558415-9d19f0b2b4d2"),
    blurhash: "L#Lh3y~qIUWUo#t7WAV@V@WBofj]",
    alt: "A clear, uncluttered desk",
    photographer: "Roman Bozhko",
  },
};
