process.loadEnvFile();
import {createFinnhubSource} from "./providers/finnhub";

const apiKey = process.env.FINNHUB_API_KEY;

if (!apiKey) {
    console.error("❌ Falta FINNHUB_API_KEY en packages/back/.env");
    process.exit(1);
}

console.log(`✅ API key de Finnhub cargada (${apiKey.length} caracteres)`);

const finnhub = createFinnhubSource(apiKey);
const quote = await finnhub.getQuote("AAPL");
console.log(quote);