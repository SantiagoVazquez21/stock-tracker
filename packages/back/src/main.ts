// "Hello TS" del back. Solo sirve para verificar que la cadena entera corre:
//   TypeScript  ->  tsx (lo ejecuta sin compilar)  ->  import desde @stock-tracker/shared
// Importar SHARED_OK prueba que npm workspaces cableó bien el paquete shared.
import { SHARED_OK } from "@stock-tracker/shared";

console.log(`Hello TS 👋  — ${SHARED_OK}`);
