export const JOB_SEARCH_CONFIG = {
  postedWithinDays: 1,
  requestDelayMs: 2000,

  remoteOnly: true,

  countries: [
    "Austria",
    "Belgium",
    "France",
    "Germany",
    "Liechtenstein",
    "Luxembourg",
    "Monaco",
    "Netherlands",
    "Switzerland",

    // Northern Europe
    "Denmark",
    "Estonia",
    "Finland",
    "Iceland",
    "Ireland",
    "Latvia",
    "Lithuania",
    "Norway",
    "Sweden",
    "United Kingdom",

    // Southern Europe
    "Albania",
    "Andorra",
    "Bosnia and Herzegovina",
    "Croatia",
    "Greece",
    "Italy",
    "Malta",
    "Montenegro",
    "North Macedonia",
    "Portugal",
    "San Marino",
    "Serbia",
    "Slovenia",
    "Spain",
    "Vatican City",

    // Eastern Europe
    "Belarus",
    "Bulgaria",
    "Czech Republic",
    "Hungary",
    "Moldova",
    "Poland",
    "Romania",
    "Russia",
    "Slovakia",
    "Ukraine",

    // Transcontinental
    "Azerbaijan",
    "Cyprus",
    "Georgia",
    "Kazakhstan",
    "Turkey",
  ],

  searchTerms: [
    "frontend developer",
    "backend developer",
    "full stack developer",
    "software engineer",
  ],

  // Companies you do not want
  excludedCompanies: [
    "codekeeper",
    "work and travel guide",
    "elevenlabs",
    "qonto",
    "turing",
    "viavi solutions",
    "bling",
    "wikimedia",
    "mozilla",
    "gitlab",
    "elastic",
    "chainguard",
    "alan",
    "kraken",
    "accesa",
    "alpaca",
    "nvidia",
    "nagarro",
    "system1 Group",
  ],

  // Job titles to reject
  excludedTitlePatterns: [
    /\bprincipal\b/i,
    /\bstaff\b/i,
    /\bjunior\b/i,
    /\bapplied[\s-]*ai\b/i,
    /\bplatform engineer(?:ing)?\b/i,
    /\bforward[\s-]*deployed\b/i,
    /\bdev[\s-]*ops\b/i,
    /\bdevops\b/i,
    /\bsite reliability\b/i,
    /\bsre\b/i,
  ],

  // Job titles you want
  allowedTitlePatterns: [
    /\bfront[\s-]*end\b/i,
    /\bback[\s-]*end\b/i,
    /\bfull[\s-]*stack\b/i,
    /\bsoftware engineer\b/i,
    /\bsoftware developer\b/i,
    /\breact\b/i,
    /\bnode(?:\.js|js)?\b/i,
  ],
} as const;
