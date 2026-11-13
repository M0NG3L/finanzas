# Finanzas · Dropshipping & SARL

Aplicación web para centralizar la facturación de una tienda de dropshipping (Shopify) y las finanzas de una SARL luxemburguesa, con un calculador de impuestos que optimiza cómo retirar el dinero de la empresa (remuneración del gérant vs. dividendos).

## Qué hace

- **Panel**: facturación HT, margen bruto, gastos, resultado, TVA recaudada/deducible/a pagar, IS estimado, gráfico mensual y cuenta de resultados por mes.
- **Pedidos**: importación del CSV de pedidos de Shopify (o un CSV genérico), edición manual, costes de proveedor/envío/comisiones por pedido y en bloque, margen por pedido, exportación.
- **Gastos**: publicidad, software, Shopify, proveedores, comisiones, banco, contabilidad… con TVA deducible o no, importación/exportación CSV y duplicado mensual.
- **Impuestos y retiro**: a partir del resultado del ejercicio (o un importe manual), un slider reparte el resultado entre remuneración del gérant y dividendos y muestra:
  - el neto que llega a tu cuenta personal, el total de impuestos y cotizaciones y el tipo efectivo;
  - la curva de neto para todas las estrategias, con el óptimo marcado y un botón para aplicarlo;
  - la cascada completa: IRC (14 % / 16 %) con fondo de empleo, ICC municipal, impuesto sobre el patrimonio mínimo, cotizaciones CCSS del gérant independiente (base mínima y techo), dependencia 1,4 %, IR por clase de impuesto (1 o 2) con fondo de empleo, y dividendos con exención del 50 %;
  - comparativa 100 % dividendos / óptimo / tu selección / 100 % remuneración;
  - TVA, impuestos de sociedad y cotizaciones a provisionar.
- **Ajustes**: empresa (participación, TVA por defecto), situación personal (clase de impuesto, otros ingresos del hogar) y todos los parámetros fiscales editables (tipos, umbrales, ICC del municipio, barème del IR). Copia de seguridad JSON y restauración.

Los datos se guardan en el navegador (`localStorage`); no hay servidor.

## Modelo fiscal (Luxemburgo, SARL al IRC, gérant majoritaire independiente)

El motor está en `src/domain/tax/luxembourg.ts` y se prueba en `luxembourg.test.ts`. Reglas modeladas (parámetros 2025 en `src/domain/tax/defaults.ts`, editables en Ajustes):

- **Empresa**: la remuneración del gérant es deducible. Sobre el resto: IRC 14 % hasta 175 000 €, tramo intermedio hasta 200 000 €, 16 % por encima; fondo de empleo 7 % del IRC; ICC 6,75 % (Luxembourg-Ville) tras exención de 17 500 €; impuesto sobre el patrimonio mínimo 535 €.
- **Remuneración**: cotizaciones CCSS ≈ 25 % (deducibles) sobre una base entre el salario social mínimo y 5 veces ese salario; dependencia 1,4 % (no deducible); deducciones a tanto alzado 1 020 €; barème del IR clase 1 (23 tramos, 0–42 %) o clase 2 (splitting), con fondo de empleo 7 % (9 % por encima de 150 000 / 300 000 €).
- **Dividendos**: 50 % exentos (art. 115 15a LIR), exención de 1 500 € (3 000 € en clase 2), resto al barème; dependencia 1,4 %. La retención del 15 % se imputa en la declaración, por lo que no cambia el neto final.
- No incluye los créditos de impuesto CIS/CII, el impuesto sobre el patrimonio proporcional (0,5 %) ni el caso del gérant minoritario (< 25 %), que tributaría como asalariado.

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
