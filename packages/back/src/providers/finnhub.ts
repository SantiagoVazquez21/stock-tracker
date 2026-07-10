import type {Quote} from "@stock-tracker/shared";

interface FinnhubQuoteRaw {
    c: number;
    d: number;
    dp: number;
    h: number;
    l: number;
    o: number;
    pc: number;
    t: number;
}

export function parseQuote(symbol: string, raw: FinnhubQuoteRaw): Quote {
    return {
        symbol,
        price: raw.c,
        changePct: raw.dp,
        asOf: new Date(raw.t * 1000),
    };
}