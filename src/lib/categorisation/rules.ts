/**
 * Built-in keyword rules: common UK merchants and payment words mapped to the
 * seeded system categories (ids from `prisma/seed.ts`). Pure, no database.
 *
 * How a row is matched:
 * - Money out: the first OUT or ANY rule whose pattern matches wins.
 * - Money in: the first IN or ANY rule wins. If none matches but an OUT rule
 *   does, the money came back from a shop or service, so it's a refund.
 * - Nothing matches: `null` ("needs review"). We never guess.
 *
 * Order matters: more specific rules come first ("TESCO MOBILE" is a bill,
 * not groceries; "UBER EATS" is eating out, not transport).
 */

export type SystemCategoryId =
  | "sys_groceries"
  | "sys_eating_out"
  | "sys_transport"
  | "sys_bills"
  | "sys_housing"
  | "sys_subscriptions"
  | "sys_shopping"
  | "sys_entertainment"
  | "sys_personal_care"
  | "sys_health_fitness"
  | "sys_holidays"
  | "sys_family"
  | "sys_education"
  | "sys_gifts"
  | "sys_charity"
  | "sys_finances"
  | "sys_cash"
  | "sys_expenses"
  | "sys_general"
  | "sys_salary"
  | "sys_benefits"
  | "sys_refunds"
  | "sys_other_income"
  | "sys_transfers"
  | "sys_savings";

type Direction = "in" | "out" | "any";

type Rule = { categoryId: SystemCategoryId; direction: Direction; pattern: RegExp };

/** Builds one rule from a list of words or phrases, matched as whole words. */
function rule(
  categoryId: SystemCategoryId,
  direction: Direction,
  words: readonly string[],
): Rule {
  const escaped = words.map((word) =>
    word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/ /g, "\\s*"),
  );
  return {
    categoryId,
    direction,
    pattern: new RegExp(`(?<![A-Z0-9])(?:${escaped.join("|")})(?![A-Z0-9])`),
  };
}

export const RULES: readonly Rule[] = [
  // Moving your own money: never income or spending
  rule("sys_savings", "any", [
    "POT TRANSFER", "MONZO POT", "TO POT", "FROM POT", "SAVINGS POT", "SAVINGS ACCOUNT",
    "TO SAVINGS", "FROM SAVINGS", "ISA", "PREMIUM BONDS", "NS&I", "CHIP", "PLUM", "MONEYBOX",
  ]),
  rule("sys_transfers", "any", [
    "OWN ACCOUNT", "INTERNAL TRANSFER", "BETWEEN ACCOUNTS", "TRANSFER TO CURRENT",
    "TRANSFER FROM CURRENT", "BARCLAYCARD", "AMEX", "AMERICAN EXPRESS",
    "CREDIT CARD PAYMENT", "CREDIT CARD REPAYMENT",
  ]),

  // Income: only ever for money in
  rule("sys_salary", "in", ["SALARY", "PAYROLL", "WAGES", "NET PAY", "SAL"]),
  rule("sys_benefits", "in", [
    "DWP", "UNIVERSAL CREDIT", "CHILD BENEFIT", "HMRC CHILD", "TAX CREDIT", "TAX CREDITS",
    "PIP", "JSA", "ESA", "STATE PENSION", "CARERS ALLOWANCE",
  ]),
  rule("sys_refunds", "in", ["REFUND", "REFUNDED", "REVERSAL", "CHARGEBACK"]),
  rule("sys_other_income", "in", ["INTEREST", "CASHBACK", "DIVIDEND", "VINTED", "DEPOP"]),

  // Bills before groceries and shopping ("TESCO MOBILE", "EON NEXT")
  rule("sys_bills", "out", [
    "COUNCIL TAX", "OCTOPUS ENERGY", "OCTOPUS", "BRITISH GAS", "EDF", "E.ON", "EON",
    "OVO", "SCOTTISH POWER", "SSE", "SO ENERGY", "BULB", "THAMES WATER", "SEVERN TRENT",
    "ANGLIAN WATER", "UNITED UTILITIES", "YORKSHIRE WATER", "SOUTHERN WATER",
    "WESSEX WATER", "WELSH WATER", "VODAFONE", "EE", "O2", "THREE MOBILE", "THREE.CO.UK",
    "HUTCHISON 3G", "GIFFGAFF",
    "TESCO MOBILE", "SMARTY", "VOXI", "LEBARA", "SKY", "VIRGIN MEDIA", "BT", "PLUSNET",
    "TALKTALK", "HYPEROPTIC", "COMMUNITYFIBRE", "TV LICENCE", "TV LICENSING",
  ]),
  rule("sys_housing", "out", [
    "RENT", "LETTINGS", "LETTING", "MORTGAGE", "ESTATE AGENTS", "HOUSING ASSOCIATION",
    "OPENRENT", "SERVICE CHARGE", "GROUND RENT",
  ]),
  rule("sys_subscriptions", "out", [
    "NETFLIX", "SPOTIFY", "DISNEY PLUS", "DISNEYPLUS", "AMAZON PRIME", "PRIME VIDEO",
    "APPLE.COM/BILL", "APPLE.COM", "ITUNES", "ICLOUD", "YOUTUBE PREMIUM", "YOUTUBEPREMIUM",
    "GOOGLE ONE", "GOOGLE STORAGE", "NOW TV", "NOWTV", "AUDIBLE", "PATREON", "DROPBOX",
    "ADOBE", "MICROSOFT", "XBOX", "PLAYSTATION", "PARAMOUNT", "APPLE MUSIC", "DEEZER",
    "TIDAL", "KINDLE UNLIMITED", "THE TIMES", "GUARDIAN",
  ]),

  // Eating out before transport ("UBER EATS"), and before groceries
  rule("sys_eating_out", "out", [
    "PRET", "PRET A MANGER", "COSTA", "STARBUCKS", "CAFFE NERO", "GREGGS", "MCDONALDS",
    "MCDONALD'S", "BURGER KING", "KFC", "NANDOS", "NANDO'S", "DELIVEROO", "UBER EATS",
    "JUST EAT", "JUSTEAT", "WAGAMAMA", "PIZZA EXPRESS", "PIZZAEXPRESS", "DOMINOS",
    "DOMINO'S", "PIZZA HUT", "LEON", "ITSU", "WASABI", "FIVE GUYS", "TIM HORTONS",
    "SUBWAY", "WETHERSPOON", "JD WETHERSPOON", "HONEST BURGERS", "DISHOOM", "TORTILLA",
    "CHIPOTLE", "BURRITO", "RESTAURANT", "CAFE", "COFFEE", "BAKERY", "TAKEAWAY",
  ]),
  rule("sys_transport", "out", [
    "TFL", "TRANSPORT FOR LONDON", "UBER", "BOLT", "FREE NOW", "ADDISON LEE", "TRAINLINE",
    "NATIONAL RAIL", "LNER", "AVANTI", "GWR", "GREAT WESTERN", "NORTHERN", "SOUTHERN",
    "THAMESLINK", "SOUTH WESTERN", "SOUTHEASTERN", "SCOTRAIL", "CROSSCOUNTRY",
    "STAGECOACH", "ARRIVA", "FIRST BUS", "NATIONAL EXPRESS", "MEGABUS", "SHELL", "BP",
    "ESSO", "TEXACO", "PETROL", "JET", "PARKING", "RINGGO", "PAYBYPHONE", "NCP", "DVLA",
    "ZIPCAR", "LIME", "CONGESTION", "DART CHARGE", "TESCO PETROL", "TESCO PFS",
    "SAINSBURYS PETROL",
  ]),

  rule("sys_groceries", "out", [
    "TESCO", "SAINSBURY", "SAINSBURYS", "SAINSBURY'S", "ASDA", "MORRISONS", "ALDI",
    "LIDL", "WAITROSE", "CO-OP", "COOP", "CO OP", "ICELAND", "M&S FOOD", "M&S SIMPLY FOOD",
    "OCADO", "FARMFOODS", "SPAR", "BUDGENS", "NISA", "LONDIS", "COSTCO", "BOOKER",
    "AMAZON FRESH", "GETIR", "GORILLAS",
  ]),
  rule("sys_health_fitness", "out", [
    "PUREGYM", "PURE GYM", "THE GYM", "GYM GROUP", "DAVID LLOYD", "NUFFIELD",
    "VIRGIN ACTIVE", "BETTER GYM", "GLL", "ANYTIME FITNESS", "GYM", "CLASSPASS",
    "STRAVA", "PHARMACY", "CHEMIST", "DENTAL", "DENTIST", "OPTICIAN", "SPECSAVERS",
    "VISION EXPRESS", "NHS", "PHYSIO", "BUPA",
  ]),
  rule("sys_personal_care", "out", [
    "BOOTS", "SUPERDRUG", "SAVERS", "BARBER", "BARBERS", "HAIR", "HAIRDRESSER",
    "SALON", "NAILS", "LUSH", "THE BODY SHOP", "SPACE NK",
  ]),
  rule("sys_holidays", "out", [
    "RYANAIR", "EASYJET", "BRITISH AIRWAYS", "JET2", "WIZZ", "TUI", "AIRBNB",
    "BOOKING.COM", "EXPEDIA", "HOTELS.COM", "PREMIER INN", "TRAVELODGE", "HOTEL",
    "EUROSTAR", "VIRGIN ATLANTIC", "LOVEHOLIDAYS", "SKYSCANNER",
  ]),
  rule("sys_entertainment", "out", [
    "ODEON", "VUE", "CINEWORLD", "EVERYMAN", "PICTUREHOUSE", "CINEMA", "THEATRE",
    "TICKETMASTER", "SEE TICKETS", "EVENTBRITE", "DICE", "STEAM", "NINTENDO",
    "BOWLING", "HOLLYWOOD BOWL", "GOLF", "MUSEUM",
  ]),
  rule("sys_family", "out", [
    "NURSERY", "CHILDCARE", "CHILDMINDER", "SMYTHS", "MOTHERCARE", "PETS AT HOME",
    "VETS", "VET", "SCHOOL DINNERS", "PARENTPAY",
  ]),
  rule("sys_education", "out", [
    "UDEMY", "COURSERA", "SKILLSHARE", "DUOLINGO", "UNIVERSITY", "COLLEGE", "TUITION",
    "OPEN UNIVERSITY", "LINKEDIN LEARNING",
  ]),
  rule("sys_gifts", "out", [
    "MOONPIG", "FUNKY PIGEON", "INTERFLORA", "CARD FACTORY", "PAPERCHASE", "GIFT",
    "BEARDED COLIN",
  ]),
  rule("sys_charity", "out", [
    "JUSTGIVING", "JUST GIVING", "GOFUNDME", "OXFAM", "BRITISH RED CROSS", "RED CROSS",
    "CANCER RESEARCH", "MACMILLAN", "RSPCA", "NSPCC", "BRITISH HEART FOUNDATION",
    "SAVE THE CHILDREN", "UNICEF", "DONATION", "CHARITY",
  ]),
  rule("sys_finances", "out", [
    "INSURANCE", "AVIVA", "ADMIRAL", "DIRECT LINE", "LV=", "AXA", "HASTINGS",
    "CHURCHILL", "LOAN", "KLARNA", "CLEARPAY", "PAYPAL CREDIT", "OVERDRAFT",
    "INTEREST CHARGE", "BANK FEE", "ACCOUNT FEE", "STUDENT LOANS", "HMRC",
    "SELF ASSESSMENT",
  ]),
  rule("sys_cash", "out", ["ATM", "CASH WITHDRAWAL", "CASHPOINT", "LINK ATM", "CASH"]),
  rule("sys_expenses", "out", ["EXPENSES", "EXPENSE CLAIM"]),

  // Shopping last among spending: broad names like "NEXT" and "AMAZON"
  rule("sys_shopping", "out", [
    "AMAZON", "AMZN", "ARGOS", "PRIMARK", "NEXT", "ZARA", "H&M", "ASOS", "JOHN LEWIS",
    "IKEA", "EBAY", "ETSY", "CURRYS", "TK MAXX", "TKMAXX", "M&S", "MARKS & SPENCER",
    "MARKS AND SPENCER", "B&Q", "WICKES", "SCREWFIX", "HOMEBASE", "DUNELM", "SHEIN",
    "UNIQLO", "SPORTS DIRECT", "JD SPORTS", "DECATHLON", "WILKO", "THE WORKS",
    "WATERSTONES", "WHSMITH", "WH SMITH", "APPLE STORE", "HOBBYCRAFT", "POUNDLAND",
    "HOME BARGAINS", "B&M", "THE RANGE", "TEMU", "VERY.CO.UK",
  ]),
  rule("sys_general", "out", ["POST OFFICE", "ROYAL MAIL", "LAUNDRETTE", "DRY CLEANING"]),
];

function normalise(description: string): string {
  return description.normalize("NFKC").toUpperCase().replace(/\s+/g, " ").trim();
}

function firstMatch(text: string, directions: readonly Direction[]): Rule | undefined {
  return RULES.find(
    (candidate) =>
      directions.includes(candidate.direction) && candidate.pattern.test(text),
  );
}

/**
 * The built-in category for one transaction, or `null` when no rule applies.
 * Sign-aware: income categories only for money in; money in from a shop or
 * service becomes a refund.
 */
export function matchBuiltInRule(
  description: string,
  amountMinor: number,
): SystemCategoryId | null {
  const text = normalise(description);

  if (amountMinor < 0) {
    return firstMatch(text, ["out", "any"])?.categoryId ?? null;
  }

  const incoming = firstMatch(text, ["in", "any"]);
  if (incoming) return incoming.categoryId;

  // Money back from somewhere you usually pay: a refund
  return firstMatch(text, ["out"]) ? "sys_refunds" : null;
}
