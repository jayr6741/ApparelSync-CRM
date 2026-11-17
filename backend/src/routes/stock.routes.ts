import {Router} from "express";
import {randomUUID} from "node:crypto";
import {z} from "zod";
import {pool} from "../db/pool";
import {requireAuth} from "../middleware/auth";

export const stockRouter=Router();
stockRouter.use(requireAuth);

stockRouter.get("/warehouses",async(req,res,next)=>{try{const r=await pool.query("SELECT id,name,branch_id,is_active FROM warehouses WHERE shop_id=$1 AND is_active=true ORDER BY name",[req.auth!.shopId]);return res.json({data:r.rows});}catch(e){return next(e);}});
stockRouter.get("/stock",async(req,res,next)=>{try{const warehouseId=String(req.query.warehouseId??"");const r=await pool.query(`SELECT sb.id,sb.warehouse_id,w.name AS warehouse_name,sb.variant_id,v.sku,v.barcode,v.size,v.colour,p.name AS product_name,sb.on_hand,sb.reserved,sb.damaged,(sb.on_hand-sb.reserved-sb.damaged)::int AS available,sb.updated_at FROM stock_balances sb JOIN warehouses w ON w.id=sb.warehouse_id AND w.shop_id=sb.shop_id JOIN product_variants v ON v.id=sb.variant_id AND v.shop_id=sb.shop_id JOIN products p ON p.id=v.product_id AND p.shop_id=v.shop_id WHERE sb.shop_id=$1 AND ($2='' OR sb.warehouse_id::text=$2) ORDER BY p.name,v.colour,v.size LIMIT 1000`,[req.auth!.shopId,warehouseId]);return res.json({data:r.rows});}catch(e){return next(e);}});

const adjustmentSchema=z.object({variantId:z.string().uuid(),warehouseId:z.string().uuid().optional(),quantityDelta:z.number().int().min(-100000).max(100000).refine(v=>v!==0),reason:z.string().trim().min(3).max(500),movementType:z.enum(["opening","adjustment","damage"]).default("adjustment")});
stockRouter.post("/stock/adjustments",async(req,res,next)=>{const p=adjustmentSchema.safeParse(req.body);if(!p.success)return res.status(400).json({error:"Invalid stock adjustment",details:p.error.flatten()});const c=await pool.connect();try{await c.query("BEGIN");const shopId=req.auth!.shopId;let warehouseId=p.data.warehouseId;if(!warehouseId){const w=await c.query("SELECT id FROM warehouses WHERE shop_id=$1 AND is_active=true ORDER BY created_at LIMIT 1",[shopId]);if(!w.rowCount){await c.query("ROLLBACK");return res.status(409).json({error:"No active warehouse configured"});}warehouseId=w.rows[0].id;}const valid=await c.query("SELECT id FROM product_variants WHERE id=$1 AND shop_id=$2 AND is_active=true",[p.data.variantId,shopId]);if(!valid.rowCount){await c.query("ROLLBACK");return res.status(404).json({error:"Product variant not found"});}const warehouse=await c.query("SELECT id FROM warehouses WHERE id=$1 AND shop_id=$2 AND is_active=true",[warehouseId,shopId]);if(!warehouse.rowCount){await c.query("ROLLBACK");return res.status(404).json({error:"Warehouse not found"});}const existing=await c.query("SELECT on_hand,reserved,damaged FROM stock_balances WHERE shop_id=$1 AND warehouse_id=$2 AND variant_id=$3 FOR UPDATE",[shopId,warehouseId,p.data.variantId]);const onHand=existing.rowCount?Number(existing.rows[0].on_hand):0;const reserved=existing.rowCount?Number(existing.rows[0].reserved):0;const damaged=existing.rowCount?Number(existing.rows[0].damaged):0;if(onHand+p.data.quantityDelta<reserved+damaged){await c.query("ROLLBACK");return res.status(409).json({error:"Adjustment would reduce stock below reserved and damaged quantity"});}await c.query(`INSERT INTO stock_balances(shop_id,warehouse_id,variant_id,on_hand) VALUES($1,$2,$3,$4) ON CONFLICT(shop_id,warehouse_id,variant_id) DO UPDATE SET on_hand=stock_balances.on_hand+EXCLUDED.on_hand,updated_at=now()`,[shopId,warehouseId,p.data.variantId,p.data.quantityDelta]);await c.query(`INSERT INTO stock_movements(shop_id,warehouse_id,variant_id,movement_type,quantity_delta,source_type,reason,created_by) VALUES($1,$2,$3,$4,$5,'manual_adjustment',$6,$7)`,[shopId,warehouseId,p.data.variantId,p.data.movementType,p.data.quantityDelta,p.data.reason,req.auth!.userId]);await c.query("INSERT INTO audit_logs(shop_id,user_id,action,entity_type,entity_id,metadata) VALUES($1,$2,'stock.adjusted','product_variant',$3,$4)",[shopId,req.auth!.userId,p.data.variantId,JSON.stringify({warehouseId,quantityDelta:p.data.quantityDelta,reason:p.data.reason})]);const result=await c.query("SELECT on_hand,reserved,damaged,(on_hand-reserved-damaged)::int AS available FROM stock_balances WHERE shop_id=$1 AND warehouse_id=$2 AND variant_id=$3",[shopId,warehouseId,p.data.variantId]);await c.query("COMMIT");return res.json({data:result.rows[0]});}catch(e){await c.query("ROLLBACK");return next(e);}finally{c.release();}});


const transferSchema=z.object({
  fromWarehouseId:z.string().uuid(),
  toWarehouseId:z.string().uuid(),
  notes:z.string().trim().max(1000).optional(),
  items:z.array(z.object({variantId:z.string().uuid(),quantity:z.number().int().positive().max(100000)})).min(1).max(500)
}).refine(p=>p.fromWarehouseId!==p.toWarehouseId,{message:"Source and destination warehouses must be different",path:["toWarehouseId"]})
.refine(p=>new Set(p.items.map(x=>x.variantId)).size===p.items.length,{message:"A variant can appear only once in a transfer",path:["items"]});

stockRouter.get("/stock/transfers",async(req,res,next)=>{try{
 const r=await pool.query(`SELECT t.id,t.transfer_number,t.status,t.notes,t.created_at,fw.name AS from_warehouse,tw.name AS to_warehouse,COALESCE(sum(i.quantity),0)::int AS total_units FROM stock_transfers t JOIN warehouses fw ON fw.id=t.from_warehouse_id AND fw.shop_id=t.shop_id JOIN warehouses tw ON tw.id=t.to_warehouse_id AND tw.shop_id=t.shop_id LEFT JOIN stock_transfer_items i ON i.transfer_id=t.id AND i.shop_id=t.shop_id WHERE t.shop_id=$1 GROUP BY t.id,fw.name,tw.name ORDER BY t.created_at DESC LIMIT 100`,[req.auth!.shopId]);
 return res.json({data:r.rows});
}catch(e){return next(e);}});

stockRouter.post("/stock/transfers",async(req,res,next)=>{
 const parsed=transferSchema.safeParse(req.body);
 if(!parsed.success)return res.status(400).json({error:"Invalid stock transfer",details:parsed.error.flatten()});
 const client=await pool.connect();
 try{
  await client.query("BEGIN");
  const shopId=req.auth!.shopId,p=parsed.data;
  const warehouses=await client.query("SELECT id FROM warehouses WHERE shop_id=$1 AND is_active=true AND id=ANY($2::uuid[]) ORDER BY id FOR UPDATE",[shopId,[p.fromWarehouseId,p.toWarehouseId]]);
  if(warehouses.rowCount!==2){await client.query("ROLLBACK");return res.status(404).json({error:"One or both warehouses are unavailable"});}
  const transferNumber="TRF-"+new Date().toISOString().slice(0,10).replace(/-/g,"")+"-"+randomUUID().slice(0,8).toUpperCase();
  const normalized=[];
  for(const line of p.items){
   const variant=await client.query("SELECT id,cost_price FROM product_variants WHERE id=$1 AND shop_id=$2 AND is_active=true",[line.variantId,shopId]);
   if(!variant.rowCount)throw new Error("A selected variant does not belong to this shop");
   const source=await client.query("SELECT on_hand,reserved,damaged FROM stock_balances WHERE shop_id=$1 AND warehouse_id=$2 AND variant_id=$3 FOR UPDATE",[shopId,p.fromWarehouseId,line.variantId]);
   const available=source.rowCount?Number(source.rows[0].on_hand)-Number(source.rows[0].reserved)-Number(source.rows[0].damaged):0;
   if(available<line.quantity)throw new Error("Insufficient available stock for variant "+line.variantId+" (available: "+available+")");
   normalized.push({line,cost:Number(variant.rows[0].cost_price)||0});
  }
  const header=await client.query("INSERT INTO stock_transfers(shop_id,transfer_number,from_warehouse_id,to_warehouse_id,notes,created_by) VALUES($1,$2,$3,$4,$5,$6) RETURNING id,transfer_number,status,created_at",[shopId,transferNumber,p.fromWarehouseId,p.toWarehouseId,p.notes??null,req.auth!.userId]);
  for(const item of normalized){
   const {line,cost}=item;
   await client.query("UPDATE stock_balances SET on_hand=on_hand-$4,updated_at=now() WHERE shop_id=$1 AND warehouse_id=$2 AND variant_id=$3",[shopId,p.fromWarehouseId,line.variantId,line.quantity]);
   await client.query("INSERT INTO stock_balances(shop_id,warehouse_id,variant_id,on_hand) VALUES($1,$2,$3,$4) ON CONFLICT(shop_id,warehouse_id,variant_id) DO UPDATE SET on_hand=stock_balances.on_hand+EXCLUDED.on_hand,updated_at=now()",[shopId,p.toWarehouseId,line.variantId,line.quantity]);
   await client.query("INSERT INTO stock_transfer_items(shop_id,transfer_id,variant_id,quantity,unit_cost) VALUES($1,$2,$3,$4,$5)",[shopId,header.rows[0].id,line.variantId,line.quantity,cost]);
   await client.query("INSERT INTO stock_movements(shop_id,warehouse_id,variant_id,movement_type,quantity_delta,unit_cost,source_type,source_id,reason,created_by) VALUES($1,$2,$3,'transfer_out',$4,$5,'stock_transfer',$6,$7,$8),($1,$9,$3,'transfer_in',$10,$5,'stock_transfer',$6,$7,$8)",[shopId,p.fromWarehouseId,line.variantId,-line.quantity,cost,header.rows[0].id,p.notes??"Warehouse transfer",req.auth!.userId,p.toWarehouseId,line.quantity]);
  }
  await client.query("INSERT INTO audit_logs(shop_id,user_id,action,entity_type,entity_id,metadata) VALUES($1,$2,'stock.transferred','stock_transfer',$3,$4)",[shopId,req.auth!.userId,header.rows[0].id,JSON.stringify({fromWarehouseId:p.fromWarehouseId,toWarehouseId:p.toWarehouseId,items:p.items})]);
  await client.query("COMMIT");
  return res.status(201).json({data:{...header.rows[0],fromWarehouseId:p.fromWarehouseId,toWarehouseId:p.toWarehouseId,totalUnits:p.items.reduce((n,x)=>n+x.quantity,0)}});
 }catch(e){
  await client.query("ROLLBACK");
  if(e instanceof Error&&(e.message.startsWith("Insufficient available stock")||e.message==="A selected variant does not belong to this shop"))return res.status(409).json({error:e.message});
  return next(e);
 }finally{client.release();}
});


const reorderLevelSchema=z.object({
 warehouseId:z.string().uuid(),
 variantId:z.string().uuid(),
 reorderLevel:z.number().int().min(0).max(10000000),
 targetStock:z.number().int().min(0).max(10000000)
}).refine(p=>p.targetStock>=p.reorderLevel,{message:"Target stock must be at least the reorder level",path:["targetStock"]});

stockRouter.get("/stock/reorder-alerts",async(req,res,next)=>{try{
 const r=await pool.query(`SELECT rl.id,rl.warehouse_id,w.name AS warehouse_name,rl.variant_id,v.sku,v.barcode,v.size,v.colour,p.name AS product_name,rl.reorder_level,rl.target_stock,COALESCE(sb.on_hand,0)::int AS on_hand,COALESCE(sb.reserved,0)::int AS reserved,COALESCE(sb.damaged,0)::int AS damaged,(COALESCE(sb.on_hand,0)-COALESCE(sb.reserved,0)-COALESCE(sb.damaged,0))::int AS available,GREATEST(rl.target_stock-(COALESCE(sb.on_hand,0)-COALESCE(sb.reserved,0)-COALESCE(sb.damaged,0)),0)::int AS suggested_replenishment FROM stock_reorder_levels rl JOIN warehouses w ON w.id=rl.warehouse_id AND w.shop_id=rl.shop_id JOIN product_variants v ON v.id=rl.variant_id AND v.shop_id=rl.shop_id JOIN products p ON p.id=v.product_id AND p.shop_id=v.shop_id LEFT JOIN stock_balances sb ON sb.shop_id=rl.shop_id AND sb.warehouse_id=rl.warehouse_id AND sb.variant_id=rl.variant_id WHERE rl.shop_id=$1 AND (COALESCE(sb.on_hand,0)-COALESCE(sb.reserved,0)-COALESCE(sb.damaged,0))<=rl.reorder_level ORDER BY (COALESCE(sb.on_hand,0)-COALESCE(sb.reserved,0)-COALESCE(sb.damaged,0)) ASC,p.name LIMIT 500`,[req.auth!.shopId]);
 return res.json({data:r.rows});
}catch(e){return next(e);}});

stockRouter.get("/stock/reorder-levels",async(req,res,next)=>{try{
 const r=await pool.query(`SELECT rl.id,rl.warehouse_id,w.name AS warehouse_name,rl.variant_id,v.sku,v.size,v.colour,p.name AS product_name,rl.reorder_level,rl.target_stock FROM stock_reorder_levels rl JOIN warehouses w ON w.id=rl.warehouse_id AND w.shop_id=rl.shop_id JOIN product_variants v ON v.id=rl.variant_id AND v.shop_id=rl.shop_id JOIN products p ON p.id=v.product_id AND p.shop_id=v.shop_id WHERE rl.shop_id=$1 ORDER BY p.name,v.size,v.colour`,[req.auth!.shopId]);
 return res.json({data:r.rows});
}catch(e){return next(e);}});

stockRouter.put("/stock/reorder-levels",async(req,res,next)=>{
 const p=reorderLevelSchema.safeParse(req.body);
 if(!p.success)return res.status(400).json({error:"Invalid reorder level",details:p.error.flatten()});
 try{
  const shopId=req.auth!.shopId;
  const [warehouse,variant]=await Promise.all([
   pool.query("SELECT id FROM warehouses WHERE id=$1 AND shop_id=$2 AND is_active=true",[p.data.warehouseId,shopId]),
   pool.query("SELECT id FROM product_variants WHERE id=$1 AND shop_id=$2 AND is_active=true",[p.data.variantId,shopId])
  ]);
  if(!warehouse.rowCount||!variant.rowCount)return res.status(404).json({error:"Warehouse or product variant not found"});
  const r=await pool.query(`INSERT INTO stock_reorder_levels(shop_id,warehouse_id,variant_id,reorder_level,target_stock) VALUES($1,$2,$3,$4,$5) ON CONFLICT(shop_id,warehouse_id,variant_id) DO UPDATE SET reorder_level=EXCLUDED.reorder_level,target_stock=EXCLUDED.target_stock,updated_at=now() RETURNING id,warehouse_id,variant_id,reorder_level,target_stock,updated_at`,[shopId,p.data.warehouseId,p.data.variantId,p.data.reorderLevel,p.data.targetStock]);
  await pool.query("INSERT INTO audit_logs(shop_id,user_id,action,entity_type,entity_id,metadata) VALUES($1,$2,'stock.reorder_level.updated','stock_reorder_level',$3,$4)",[shopId,req.auth!.userId,r.rows[0].id,JSON.stringify({warehouseId:p.data.warehouseId,variantId:p.data.variantId,reorderLevel:p.data.reorderLevel,targetStock:p.data.targetStock})]);
  return res.json({data:r.rows[0]});
 }catch(e){return next(e);}
});
