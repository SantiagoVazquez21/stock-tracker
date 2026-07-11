import type {Quote, MarketDataSource} from "@stock-tracker/shared";

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

const BASE_URL = "https://finnhub.io/api/v1";

export function createFinnhubSource(apiKey: string): MarketDataSource {
    return{
        name: "Finnhub",

        supports(_symbol) {
            throw new Error("supports: todavia no implementado");
        },

        async getQuote(symbol) {
            const url = `${BASE_URL}/quote?symbol=${symbol}&token=${apiKey}`;
            const res = await fetch(url);

            if (!res.ok) {
                throw new Error(`Finnhub respondio ${res.status} al pedir ${symbol}`);
            }

            // "as" = le afirmamos a TS "confiá, esto tiene forma de FinnhubQuoteRaw".
            // OJO: es una PROMESA nuestra, NO valida en runtime. Si Finnhub manda otra
            // cosa, TS no se entera. En la Semana 2 esto lo reemplaza Zod (validación real).
            const raw = (await res.json()) as FinnhubQuoteRaw;
            return parseQuote(symbol, raw);
        },
        
        getHistory(_symbol, _range) {
            throw new Error("getHistory: todavia no implementado");
        },
    };
}