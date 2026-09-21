import { createTwelveDataSource } from "./providers/twelvedata";

// Carga packages/back/.env dentro de process.env (nativo de Node 24).
process.loadEnvFile();

const apiKey = process.env.TWELVE_DATA_API_KEY;
if (!apiKey) {
  console.error("❌ Falta TWELVE_DATA_API_KEY en packages/back/.env");
  process.exit(1);
}

// Se llama "source" (genérico), no "twelveData": main elige el proveedor, y el
// resto del programa habla con un MarketDataSource sin saber cuál es.
const source = createTwelveDataSource(apiKey);

const quote = await source.getQuote("AAPL");
console.log(quote);
