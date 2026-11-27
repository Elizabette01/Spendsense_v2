import { describe, expect, it } from "vitest";

import { deriveMerchant, merchantKey } from "./merchant";

describe("deriveMerchant", () => {
  it.each([
    // Store numbers, cities and countries
    ["TESCO STORES 4521 LONDON GB", "Tesco Stores"],
    ["ALDI 112 LONDON", "Aldi"],
    ["LIDL GB LONDON", "Lidl"],
    ["SAINSBURYS S/MKTS", "Sainsburys S/Mkts"],
    // Payment-type prefixes
    ["CARD PAYMENT TO PRET A MANGER", "Pret A Manger"],
    ["CONTACTLESS COSTA COFFEE", "Costa Coffee"],
    ["DIRECT DEBIT TO OCTOPUS ENERGY", "Octopus Energy"],
    ["VIS GREGGS PLC", "Greggs"],
    // Processor prefixes
    ["SQ *CORNER CAFE", "Corner Cafe"],
    ["SUMUP *MARKET STALL", "Market Stall"],
    ["PAYPAL *EBAY", "Ebay"],
    ["PAYPAL *EXAMPLE SHOP", "Example Shop"],
    ["PAYPAL*EXAMPLESHOP", "Exampleshop"],
    ["CARD PAYMENT TO PAYPAL *EXAMPLE SHOP", "Example Shop"],
    ["CARD PAYMENT TO SQ *CORNER CAFE", "Corner Cafe"],
    // Reference after a star, domains
    ["AMAZON.CO.UK*MK1AB", "Amazon"],
    ["AMAZON PRIME*UK", "Amazon Prime"],
    ["NETFLIX.COM", "Netflix"],
    ["AMAZON.CO.UK REFUND", "Amazon"],
    // Dates, times, references, card numbers
    ["CASH ATM LINK 07JUL", "Cash ATM Link"],
    ["UBER TRIP 12/03 14:32", "Uber Trip"],
    ["PUREGYM LTD REF 12345", "Puregym"],
    ["COSTA COFFEE CARD 1234", "Costa Coffee"],
    ["BOOTS XXXX1234 ON 12 MAR", "Boots"],
    ["VODAFONE LTD DD", "Vodafone"],
    // Acronyms stay readable
    ["TFL TRAVEL CH", "TfL Travel Ch"],
    ["HMRC TAX REFUND", "HMRC Tax"],
    ["KFC 0421 LEEDS", "KFC"],
  ])("%s → %s", (description, expected) => {
    expect(deriveMerchant(description)).toBe(expected);
  });

  it("is case-insensitive about its input", () => {
    expect(deriveMerchant("tesco stores 4521 london gb")).toBe("Tesco Stores");
  });

  it("falls back to the description when everything looks like noise", () => {
    expect(deriveMerchant("LONDON")).toBe("London");
    expect(deriveMerchant("12345678")).toBe("12345678");
  });

  it("never returns an empty name", () => {
    expect(deriveMerchant("")).toBe("Unknown");
    expect(deriveMerchant("  ***  ")).toBe("Unknown");
  });

  it("caps the length", () => {
    expect(deriveMerchant("A".repeat(300)).length).toBeLessThanOrEqual(100);
  });
});

describe("merchantKey", () => {
  it("lowercases and keeps letters and digits", () => {
    expect(merchantKey("Tesco Stores")).toBe("tesco stores");
    expect(merchantKey("M&S Food")).toBe("m&s food");
    expect(merchantKey("  Pret  A   Manger ")).toBe("pret a manger");
    expect(merchantKey("Sainsbury's")).toBe("sainsbury s");
  });

  it("gives the same key to the same merchant written differently", () => {
    expect(merchantKey(deriveMerchant("TESCO STORES 4521 LONDON GB"))).toBe(
      merchantKey(deriveMerchant("Tesco Stores 9981 Leeds")),
    );
  });
});
