import { Router } from "express";
import { z } from "zod";
import { pool } from "../db/pool";
import { requireAuth } from "../middleware/auth";

export const returnsRouter = Router();
returnsRouter.use(requireAuth);

const createReturnSchema = z.object({
  saleId: z.string().uuid(),
  idempotencyKey: z.string().min(8).max(120),
  reason: z.string().trim().min(3).max(500),
  refundMethod: z.enum(["cash", "upi", "card", "bank_transfer", "wallet", "other"]).default("cash"),
  items: z.array(z.object({
    saleItemId: z.string().uuid(),
    quantity: z.number().int().positive().max(1000),
    restock: z.boolean().default(true)
  })).min(1).max(100)
});

returnsRouter.get("/returns", async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT r.id, r.return_number, r.sale_id, r.status, r.reason, r.refund_total,
              r.refund_method, r.created_at, s.invoice_number
       FROM sales_returns r
       JOIN sales s ON s.id = r.sale_id AND s.shop_id = r.shop_id
       WHERE r.shop_id = $1
       ORDER BY r.created_at DESC LIMIT 200`,
      [req.auth!.shopId]
    );
    return res.json({ data: result.rows });
  } catch (error) { return next(error); }
});

returnsRouter.post("/returns", async (req, res, next) => {
  const parsed = createReturnSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid return", details: parsed.error.flatten() });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const shopId = req.auth!.shopId;
    const input = parsed.data;

    const replay = await client.query(
      "SELECT id, return_number, refund_total, status FROM sales_returns WHERE shop_id=$1 AND idempotency_key=$2",
      [shopId, input.idempotencyKey]
    );
    if (replay.rowCount) {
      await client.query("COMMIT");
      return res.json({ data: replay.rows[0], replayed: true });
    }

    const sale = await client.query(
      "SELECT id, invoice_number, warehouse_id, status FROM sales WHERE id=$1 AND shop_id=$2 FOR UPDATE",
      [input.saleId, shopId]
    );
    if (!sale.rowCount) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Sale not found" });
    }
    if (sale.rows[0].status === "cancelled" || sale.rows[0].status === "refunded") {
      await client.query("ROLLBACK");
      return res.status(409).json({ error: "This sale cannot be returned" });
    }

    const uniqueIds = [...new Set(input.items.map(item => item.saleItemId))];
    if (uniqueIds.length !== input.items.length) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Each sale line can appear only once per return" });
    }

    let refundTotal = 0;
    const lines: Array<{ saleItemId: string; variantId: string | null; quantity: number; refund: number; restock: boolean }> = [];
    for (const item of input.items) {
      const line = await client.query(
        `SELECT si.id, si.variant_id, si.quantity, si.total_price
         FROM sale_items si
         WHERE si.id=$1 AND si.sale_id=$2 AND si.shop_id=$3
         FOR UPDATE`,
        [item.saleItemId, input.saleId, shopId]
      );
      if (!line.rowCount) throw new Error("A selected sale item does not belong to this sale");
      const already = await client.query(
        "SELECT COALESCE(SUM(ri.quantity),0)::int AS returned FROM sales_return_items ri JOIN sales_returns r ON r.id=ri.return_id AND r.shop_id=ri.shop_id WHERE ri.shop_id=$1 AND ri.sale_item_id=$2 AND r.status='completed'",
        [shopId, item.saleItemId]
      );
      const remaining = Number(line.rows[0].quantity) - Number(already.rows[0].returned);
      if (item.quantity > remaining) throw new Error(`Return quantity exceeds remaining sold quantity (${remaining})`);
      const amount = Number((Number(line.rows[0].total_price) * item.quantity / Number(line.rows[0].quantity)).toFixed(2));
      refundTotal += amount;
      lines.push({ saleItemId: item.saleItemId, variantId: line.rows[0].variant_id, quantity: item.quantity, refund: amount, restock: item.restock });
    }

    const returnNumber = `RET-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
    const created = await client.query(
      `INSERT INTO sales_returns(shop_id,sale_id,return_number,status,reason,refund_total,refund_method,idempotency_key,created_by)
       VALUES($1,$2,$3,'completed',$4,$5,$6,$7,$8)
       RETURNING id,return_number,sale_id,status,refund_total,refund_method,created_at`,
      [shopId, input.saleId, returnNumber, input.reason, Number(refundTotal.toFixed(2)), input.refundMethod, input.idempotencyKey, req.auth!.userId]
    );

    for (const line of lines) {
      await client.query(
        "INSERT INTO sales_return_items(shop_id,return_id,sale_item_id,variant_id,quantity,refund_amount,restocked) VALUES($1,$2,$3,$4,$5,$6,$7)",
        [shopId, created.rows[0].id, line.saleItemId, line.variantId, line.quantity, line.refund, line.restock]
      );
      if (line.restock && line.variantId && sale.rows[0].warehouse_id) {
        await client.query(
          `INSERT INTO stock_balances(shop_id,warehouse_id,variant_id,on_hand)
           VALUES($1,$2,$3,$4)
           ON CONFLICT(shop_id,warehouse_id,variant_id)
           DO UPDATE SET on_hand=stock_balances.on_hand+EXCLUDED.on_hand,updated_at=now()`,
          [shopId, sale.rows[0].warehouse_id, line.variantId, line.quantity]
        );
        await client.query(
          `INSERT INTO stock_movements(shop_id,warehouse_id,variant_id,movement_type,quantity_delta,source_type,source_id,created_by)
           VALUES($1,$2,$3,'return',$4,'sales_return',$5,$6)`,
          [shopId, sale.rows[0].warehouse_id, line.variantId, line.quantity, created.rows[0].id, req.auth!.userId]
        );
      }
    }

    await client.query(
      "INSERT INTO sales_return_payments(shop_id,return_id,method,amount) VALUES($1,$2,$3,$4)",
      [shopId, created.rows[0].id, input.refundMethod, Number(refundTotal.toFixed(2))]
    );
    const returned = await client.query(
      "SELECT COALESCE(SUM(refund_total),0) AS amount FROM sales_returns WHERE shop_id=$1 AND sale_id=$2 AND status='completed'",
      [shopId, input.saleId]
    );
    const original = await client.query("SELECT total FROM sales WHERE shop_id=$1 AND id=$2", [shopId, input.saleId]);
    if (Number(returned.rows[0].amount) >= Number(original.rows[0].total)) {
      await client.query("UPDATE sales SET status='refunded' WHERE shop_id=$1 AND id=$2", [shopId, input.saleId]);
    }
    await client.query(
      "INSERT INTO audit_logs(shop_id,user_id,action,entity_type,entity_id,metadata) VALUES($1,$2,'sale.returned','sales_return',$3,$4)",
      [shopId, req.auth!.userId, created.rows[0].id, JSON.stringify({ saleId: input.saleId, refundTotal, itemCount: lines.length })]
    );
    await client.query("COMMIT");
    return res.status(201).json({ data: created.rows[0] });
  } catch (error) {
    await client.query("ROLLBACK");
    if (error instanceof Error && (error.message.startsWith("Return quantity exceeds") || error.message.startsWith("A selected sale item"))) {
      return res.status(409).json({ error: error.message });
    }
    return next(error);
  } finally { client.release(); }
});
