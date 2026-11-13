import { describe, expect, it } from 'vitest'
import { importShopifyOrders } from './csv'

const sample = `Name,Email,Financial Status,Paid at,Fulfillment Status,Currency,Subtotal,Shipping,Taxes,Total,Discount Code,Discount Amount,Shipping Method,Created at,Lineitem quantity,Lineitem name,Lineitem price,Refunded Amount,Shipping Country
#1001,a@b.com,paid,2025-03-02 10:00:00 +0100,fulfilled,EUR,49.90,0.00,8.32,49.90,,0.00,Standard,2025-03-02 09:58:00 +0100,1,Producto A,49.90,0.00,FR
#1001,,,,,,,,,,,,,,1,Producto B,0.00,,
#1002,c@d.com,refunded,2025-03-03 10:00:00 +0100,fulfilled,EUR,59.90,0.00,9.98,59.90,,0.00,Standard,2025-03-03 09:58:00 +0100,1,Producto A,59.90,59.90,BE`

describe('importShopifyOrders', () => {
  it('agrupa líneas por pedido y lee totales', () => {
    const o = importShopifyOrders(sample)
    expect(o).toHaveLength(2)
    expect(o[0].orderNumber).toBe('#1001')
    expect(o[0].totalTTC).toBeCloseTo(49.9)
    expect(o[0].tvaCollected).toBeCloseTo(8.32)
    expect(o[0].date).toBe('2025-03-02')
    expect(o[0].country).toBe('FR')
    expect(o[1].status).toBe('refunded')
    expect(o[1].refunds).toBeCloseTo(59.9)
  })
})
