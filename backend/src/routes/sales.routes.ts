import { Router } from "express";
import { z } from "zod";
import { pool } from "../db/pool";
import { requireAuth } from "../middleware/auth";

export const salesRouter=Router();
salesRouter.use(requireAuth);
const checkoutSchema=z.object({
  customerId:z.string().uuid().optional(),
  idempotencyKey:z.string().min(8).max(120),
  discountAmount:z.number().nonnegative().default(0),
  items:z.array(z.object({variantId:z.string().uuid(),quantity:z.number().int().positive().max(1000)})).min(1).max(100),
  payments:z.array(z.object({method:z.enum(["cash","upi","card","bank_transfer","wallet","gift_card","other"]),amount:z.number().positive(),referenceNumber:z.string().max(120).optional()})).min(1).max(10)
});
salesRouter.get("/sales",async(req,res,next)=>{try{const r=await pool.query("SELECT id,invoice_number,total,subtotal,tax_total,discount_amount,payment_method,status,sale_date FROM sales WHERE shop_id=$1 ORDER BY sale_date DESC LIMIT 200",[req.auth!.shopId]);return res.json({data:r.rows});}catch(e){return next(e);}});

salesRouter.get("/sales/:saleId",async(req,res,next)=>{
 try{
  const sale=await pool.query("SELECT id,invoice_number,total,status,sale_date,warehouse_id FROM sales WHERE id=$1 AND shop_id=$2",[req.params.saleId,req.auth!.shopId]);
  if(!sale.rowCount)return res.status(404).json({error:"Sale not found"});
  const items=await pool.query("SELECT id,product_name,variant_id,quantity,unit_price,total_price FROM sale_items WHERE shop_id=$1 AND sale_id=$2 ORDER BY id",[req.auth!.shopId,req.params.saleId]);
  const returned=await pool.query("SELECT ri.sale_item_id,COALESCE(SUM(ri.quantity),0)::int AS returned_quantity FROM sales_return_items ri JOIN sales_returns r ON r.id=ri.return_id AND r.shop_id=ri.shop_id WHERE ri.shop_id=$1 AND r.sale_id=$2 AND r.status='completed' GROUP BY ri.sale_item_id",[req.auth!.shopId,req.params.saleId]);
  const returnedMap=new Map(returned.rows.map((x:any)=>[x.sale_item_id,Number(x.returned_quantity)]));
  return res.json({data:{...sale.rows[0],items:items.rows.map((x:any)=>({...x,returned_quantity:returnedMap.get(x.id)??0,returnable_quantity:Number(x.quantity)-(returnedMap.get(x.id)??0)}))}});
 }catch(e){return next(e);}
});

salesRouter.post("/sales/checkout",async(req,res,next)=>{
 const p=checkoutSchema.safeParse(req.body);if(!p.success)return res.status(400).json({error:"Invalid checkout",details:p.error.flatten()});
 const c=await pool.connect();
 try{
  await c.query("BEGIN");const shopId=req.auth!.shopId;
  const prior=await c.query("SELECT id,invoice_number,total,status FROM sales WHERE shop_id=$1 AND idempotency_key=$2",[shopId,p.data.idempotencyKey]);
  if(prior.rowCount){await c.query("COMMIT");return res.json({data:prior.rows[0],replayed:true});}
  let customerId=p.data.customerId??null;
  let customerPoints=0,customerTier="Bronze";
  if(customerId){const customer=await c.query("SELECT id,reward_points,tier FROM customers WHERE id=$1 AND shop_id=$2 FOR UPDATE",[customerId,shopId]);if(!customer.rowCount){await c.query("ROLLBACK");return res.status(400).json({error:"Customer does not belong to this shop"});}customerPoints=Number(customer.rows[0].reward_points)||0;customerTier=customer.rows[0].tier||"Bronze";}
  const warehouse=await c.query("SELECT w.id,w.branch_id FROM warehouses w WHERE w.shop_id=$1 AND w.is_active=true ORDER BY w.created_at LIMIT 1",[shopId]);
  if(!warehouse.rowCount){await c.query("ROLLBACK");return res.status(409).json({error:"No active warehouse is configured"});}
  const lines=[];let subtotal=0,taxTotal=0;
  for(const item of p.data.items){
    const v=await c.query("SELECT v.id,v.product_id,v.size,v.colour,v.price,v.tax_rate,p.name FROM product_variants v JOIN products p ON p.id=v.product_id AND p.shop_id=v.shop_id WHERE v.id=$1 AND v.shop_id=$2 AND v.is_active=true FOR UPDATE OF v",[item.variantId,shopId]);
    if(!v.rowCount)throw new Error("A selected variant is unavailable");
    const stock=await c.query("SELECT on_hand,reserved,damaged FROM stock_balances WHERE shop_id=$1 AND warehouse_id=$2 AND variant_id=$3 FOR UPDATE",[shopId,warehouse.rows[0].id,item.variantId]);
    const available=stock.rowCount?Number(stock.rows[0].on_hand)-Number(stock.rows[0].reserved)-Number(stock.rows[0].damaged):0;
    if(available<item.quantity)throw new Error(`Insufficient stock for ${v.rows[0].name} (${v.rows[0].size}/${v.rows[0].colour}); available: ${available}`);
    const unit=Number(v.rows[0].price),rate=Number(v.rows[0].tax_rate),base=unit*item.quantity,tax=base*rate/100;
    subtotal+=base;taxTotal+=tax;lines.push({item,variant:v.rows[0],base,tax,rate,unit});
  }
  const gross=subtotal+taxTotal,discount=p.data.discountAmount;
  if(discount>gross)throw new Error("Discount cannot exceed the bill total");
  const total=Number((gross-discount).toFixed(2));
  const tender=Number(p.data.payments.reduce((sum,x)=>sum+x.amount,0).toFixed(2));
  if(Math.abs(tender-total)>0.01)throw new Error("Payment total must exactly match the bill total");
  const fyStart=new Date().getMonth()>=3?new Date().getFullYear():new Date().getFullYear()-1;
  const fy=`${fyStart}-${String(fyStart+1).slice(-2)}`;
  await c.query("INSERT INTO invoice_sequences(shop_id,financial_year,last_number) VALUES($1,$2,0) ON CONFLICT(shop_id,financial_year) DO NOTHING",[shopId,fy]);
  const seq=await c.query("UPDATE invoice_sequences SET last_number=last_number+1 WHERE shop_id=$1 AND financial_year=$2 RETURNING last_number",[shopId,fy]);
  const invoice=`GST/${fy}/${String(seq.rows[0].last_number).padStart(6,"0")}`;
  const method=p.data.payments.length===1?p.data.payments[0].method:"other";
  const sale=await c.query(`INSERT INTO sales(shop_id,customer_id,total,payment_method,status,subtotal,tax_total,discount_amount,invoice_number,branch_id,warehouse_id,idempotency_key,created_by) VALUES($1,$2,$3,$4,'completed',$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id,invoice_number,total,status,sale_date`,[shopId,customerId,total,method,subtotal,taxTotal,discount,invoice,warehouse.rows[0].branch_id,warehouse.rows[0].id,p.data.idempotencyKey,req.auth!.userId]);
  for(const line of lines){
    const lineDiscount=gross>0?discount*(line.base+line.tax)/gross:0;
    const lineTotal=line.base+line.tax-lineDiscount;
    await c.query(`INSERT INTO sale_items(shop_id,sale_id,product_id,variant_id,product_name,quantity,unit_price,total_price,tax_rate,tax_amount,discount_amount) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,[shopId,sale.rows[0].id,line.variant.product_id,line.item.variantId,line.variant.name,line.item.quantity,line.unit,lineTotal,line.rate,line.tax,lineDiscount]);
    await c.query("UPDATE stock_balances SET on_hand=on_hand-$4,updated_at=now() WHERE shop_id=$1 AND warehouse_id=$2 AND variant_id=$3",[shopId,warehouse.rows[0].id,line.item.variantId,line.item.quantity]);
    await c.query(`INSERT INTO stock_movements(shop_id,warehouse_id,variant_id,movement_type,quantity_delta,source_type,source_id,created_by) VALUES($1,$2,$3,'sale',$4,'sale',$5,$6)`,[shopId,warehouse.rows[0].id,line.item.variantId,-line.item.quantity,sale.rows[0].id,req.auth!.userId]);
  }
  let pointsEarned=0;
  if(customerId){
    const multiplier=customerTier==="Gold"?1.5:customerTier==="Silver"?1.2:1;
    pointsEarned=Math.floor(total/10*multiplier);
    if(pointsEarned>0){
      const newBalance=customerPoints+pointsEarned;
      const newTier=newBalance>=1500?"Gold":newBalance>=500?"Silver":"Bronze";
      await c.query("UPDATE customers SET reward_points=$3,tier=$4,updated_at=now() WHERE id=$1 AND shop_id=$2",[customerId,shopId,newBalance,newTier]);
      await c.query("UPDATE sales SET points_earned=$3 WHERE id=$1 AND shop_id=$2",[sale.rows[0].id,shopId,pointsEarned]);
      await c.query("INSERT INTO point_transactions(shop_id,customer_id,order_id,points_change,type,description) VALUES($1,$2,$3,$4,'EARNED',$5)",[shopId,customerId,sale.rows[0].id,pointsEarned,"Earned on invoice "+invoice]);
    }
  }
  for(const payment of p.data.payments)await c.query("INSERT INTO sale_payments(shop_id,sale_id,method,amount,reference_number) VALUES($1,$2,$3,$4,$5)",[shopId,sale.rows[0].id,payment.method,payment.amount,payment.referenceNumber??null]);
  await c.query("INSERT INTO audit_logs(shop_id,user_id,action,entity_type,entity_id,metadata) VALUES($1,$2,'sale.checkout','sale',$3,$4)",[shopId,req.auth!.userId,sale.rows[0].id,JSON.stringify({invoiceNumber:invoice,items:lines.length,total,customerId,pointsEarned})]);
  await c.query("COMMIT");return res.status(201).json({data:sale.rows[0]});
 }catch(e){await c.query("ROLLBACK");if(e instanceof Error&&(e.message.startsWith("Insufficient stock")||e.message==="Discount cannot exceed the bill total"||e.message==="Payment total must exactly match the bill total"||e.message==="A selected variant is unavailable"))return res.status(409).json({error:e.message});return next(e);}finally{c.release();}
});
