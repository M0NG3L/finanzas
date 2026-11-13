# Finanzas · Dropshipping & SARL

Aplicación web para centralizar la facturación de una tienda de dropshipping (Shopify) y las finanzas de una SARL francesa, con un calculador de impuestos que optimiza cómo retirar el dinero de la empresa (remuneración del gérant vs. dividendos).

## Qué hace

- **Panel**: facturación HT, margen bruto, gastos, resultado, TVA recaudada/deducible/a pagar, IS estimado, gráfico mensual y cuenta de resultados por mes.
- **Pedidos**: importación del CSV de pedidos de Shopify (o un CSV genérico), edición manual, costes de proveedor/envío/comisiones por pedido y en bloque, margen por pedido, exportación.
- **Gastos**: publicidad, software, Shopify, proveedores, comisiones, banco, contabilidad… con TVA deducible o no, importación/exportación CSV y duplicado mensual.
- **Impuestos y retiro**: a partir del resultado del ejercicio (o un importe manual), un slider reparte el resultado entre remuneración del gérant y dividendos y muestra:
  - el neto que llega a tu cuenta personal, el total de impuestos y cotizaciones y el tipo efectivo;
  - la curva de neto para todas las estrategias, con el óptimo marcado y un botón para aplicarlo;
  - la cascada completa: cotizaciones TNS, IS (15 % / 25 %), prélèvements sociaux, TNS sobre dividendos por encima del 10 % del capital, IR (barème con cociente familiar y décote), PFU o opción barème;
  - comparativa 100 % dividendos / óptimo / tu selección / 100 % remuneración;
  - TVA, IS y cotizaciones a provisionar.
- **Ajustes**: datos de la empresa (capital, CCA, participación), situación personal (partes, otros ingresos del hogar) y todos los parámetros fiscales editables (tipos, umbrales, barème del IR). Copia de seguridad JSON y restauración.

Los datos se guardan en el navegador (`localStorage`); no hay servidor.

## Modelo fiscal (Francia, SARL al IS, gérant majoritaire TNS)

El motor está en `src/domain/tax/france.ts` y se prueba en `france.test.ts`. Simplificaciones:

- Cotizaciones TNS = porcentaje fijo del neto (45 % por defecto) con un mínimo anual.
- Dividendos: PFU 12,8 % + 17,2 % de PS en la parte ≤ 10 % de (capital + primas + CCA); la parte superior paga cotizaciones TNS en lugar de PS.
- IR por barème progresivo con abattement del 10 %, cociente familiar y décote.
- No incluye CFE, contribución social sobre el IS ni la deducibilidad de las cotizaciones sobre dividendos.

Los parámetros por defecto corresponden al barème 2025 (`src/domain/tax/defaults.ts`) y se actualizan desde Ajustes.

## Importar pedidos de Shopify

Shopify → Pedidos → Exportar → "Pedidos por fecha" en CSV. La app detecta las columnas `Name`, `Created at`, `Total`, `Taxes`, `Refunded Amount`, `Financial Status`, `Email` y `Shipping Country`, y omite las filas repetidas por línea de producto. Como Shopify no exporta tus costes, usa **Costes en bloque** para aplicar un % de coste de producto, envío y comisiones a los pedidos sin coste.

CSV genérico de pedidos: `date, orderNumber, totalTTC, tvaCollected, refunds, cogs, shippingCost, paymentFees, status, customer, country`.
CSV genérico de gastos: `date, category, vendor, amountHT, tvaRate, deductible, notes` (categorías: `ads, software, shopify, supplier, fees, bank, accounting, salary, other`).

## Desarrollo

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # motor fiscal y agregaciones
npm run build      # genera dist/
```
