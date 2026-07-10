import {describe, it, expect} from "vitest";
import {parseQuote} from "./finnhub";

describe("parseQuote (traduce la respuesta de Finnhub a nuestro Quote)", () => {
    it("mapea precio, % del dia y arma la fecha desde el timestamp", () => {
         // La respuesta cruda, tal como la manda Finnhub (la simulamos acá).
        const raw = {
            c: 231.5,
            d: 2.7,
            dp: 1.18,
            h: 232.1,
            l: 228.9,
            o: 229.4,
            pc: 228.8,
            t: 1720620000,
        };
        
        const quote = parseQuote("AAPL", raw);

        expect(quote).toEqual({
            symbol: "AAPL",
            price: 231.5,
            changePct: 1.18,
            asOf: new Date(1720620000 * 1000),
        });
    });
});