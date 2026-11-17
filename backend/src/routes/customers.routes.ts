import { Router } from "express";
import { z } from "zod";
import { pool } from "../db/pool";
import { requireAuth } from "../middleware/auth";

export const customersRouter = Router();
customersRouter.use(requireAuth);

const customerSchema = z.object({
  fullName: z.string().trim().min(2).max(160),
  email: z.string().trim().email().max(254).optional().or(z.literal("")),
  phone: z.string().trim().min(7).max(20).optional().or(z.literal("")),
  address: z.string().trim().max(500).optional(),
  city: z.string().trim().max(100).optional(),
  notes: z.string().trim().max(2000).optional(),
});

customersRouter.get("/customers", async (req,res,next)=>{
  try {
    const q=String(req.query.q??"").trim().slice(0,100);
    const result=await pool.query(
      `SELECT id,full_name,email,phone,address,city,notes,reward_points,tier,created_at
       FROM customers WHERE shop_id=$1 AND ($2='' OR full_name ILIKE '%'||$2||'%' OR coalesce(phone,'') ILIKE '%'||$2||'%' OR coalesce(email,'') ILIKE '%'||$2||'%')
       ORDER BY created_at DESC LIMIT 250`,
      [req.auth!.shopId,q]
    );
    return res.json({data:result.rows});
  } catch(error){return next(error);}
});

customersRouter.post("/customers", async(req,res,next)=>{
  const parsed=customerSchema.safeParse(req.body);
  if(!parsed.success) return res.status(400).json({error:"Invalid customer details",details:parsed.error.flatten()});
  try {
    const c=parsed.data;
    const result=await pool.query(
      `INSERT INTO customers(shop_id,full_name,email,phone,address,city,notes)
       VALUES($1,$2,NULLIF($3,''),NULLIF($4,''),$5,$6,$7)
       RETURNING id,full_name,email,phone,address,city,notes,reward_points,tier,created_at`,
      [req.auth!.shopId,c.fullName,c.email??"",c.phone??"",c.address??null,c.city??null,c.notes??null]
    );
    return res.status(201).json({data:result.rows[0]});
  } catch(error){return next(error);}
});

customersRouter.patch("/customers/:customerId", async(req,res,next)=>{
  const parsed=customerSchema.partial().safeParse(req.body);
  if(!parsed.success || Object.keys(parsed.data??{}).length===0) return res.status(400).json({error:"Provide valid customer fields"});
  try {
    const c=parsed.data;
    const result=await pool.query(
      `UPDATE customers SET
       full_name=COALESCE($3,full_name),email=CASE WHEN $4::boolean THEN NULLIF($5,'') ELSE email END,
       phone=CASE WHEN $6::boolean THEN NULLIF($7,'') ELSE phone END,
       address=COALESCE($8,address),city=COALESCE($9,city),notes=COALESCE($10,notes),updated_at=now()
       WHERE shop_id=$1 AND id=$2
       RETURNING id,full_name,email,phone,address,city,notes,reward_points,tier,created_at`,
      [req.auth!.shopId,req.params.customerId,c.fullName??null,"email" in c,c.email??"","phone" in c,c.phone??"",c.address??null,c.city??null,c.notes??null]
    );
    if(!result.rowCount) return res.status(404).json({error:"Customer not found"});
    return res.json({data:result.rows[0]});
  } catch(error){return next(error);}
});


const pointTransactionSchema=z.object({
  pointsChange:z.number().int().refine(value=>value!==0,"Points change cannot be zero"),
  type:z.enum(["EARNED","REDEEMED","BONUS","ADJUSTMENT"]),
  description:z.string().trim().min(2).max(250),
  orderId:z.string().uuid().optional()
});
customersRouter.post("/customers/:customerId/points",async(req,res,next)=>{
  const parsed=pointTransactionSchema.safeParse(req.body);
  if(!parsed.success)return res.status(400).json({error:"Invalid points transaction",details:parsed.error.flatten()});
  const p=parsed.data;
  if((p.type==="EARNED"||p.type==="BONUS")&&p.pointsChange<0)return res.status(400).json({error:"Earned and bonus points must be positive"});
  if(p.type==="REDEEMED"&&p.pointsChange>0)return res.status(400).json({error:"Redeemed points must be negative"});
  const client=await pool.connect();
  try{
    await client.query("BEGIN");
    const customer=await client.query("SELECT id,reward_points FROM customers WHERE id=$1 AND shop_id=$2 FOR UPDATE",[req.params.customerId,req.auth!.shopId]);
    if(!customer.rowCount){await client.query("ROLLBACK");return res.status(404).json({error:"Customer not found"});}
    if(p.orderId){const order=await client.query("SELECT id FROM sales WHERE id=$1 AND shop_id=$2 AND customer_id=$3",[p.orderId,req.auth!.shopId,req.params.customerId]);if(!order.rowCount){await client.query("ROLLBACK");return res.status(400).json({error:"Order does not belong to this customer"});}}
    const balance=Number(customer.rows[0].reward_points)+p.pointsChange;
    if(balance<0){await client.query("ROLLBACK");return res.status(409).json({error:"Insufficient reward points"});}
    const tier=balance>=1500?"Gold":balance>=500?"Silver":"Bronze";
    const tx=await client.query("INSERT INTO point_transactions(shop_id,customer_id,order_id,points_change,type,description) VALUES($1,$2,$3,$4,$5,$6) RETURNING id,customer_id,order_id,points_change,type,description,created_at",[req.auth!.shopId,req.params.customerId,p.orderId??null,p.pointsChange,p.type,p.description]);
    await client.query("UPDATE customers SET reward_points=$3,tier=$4,updated_at=now() WHERE id=$1 AND shop_id=$2",[req.params.customerId,req.auth!.shopId,balance,tier]);
    await client.query("INSERT INTO audit_logs(shop_id,user_id,action,entity_type,entity_id,metadata) VALUES($1,$2,'customer.points_updated','customer',$3,$4)",[req.auth!.shopId,req.auth!.userId,req.params.customerId,JSON.stringify({pointsChange:p.pointsChange,balance,tier,type:p.type})]);
    await client.query("COMMIT");
    return res.status(201).json({data:{transaction:tx.rows[0],balance,tier}});
  }catch(error){await client.query("ROLLBACK");return next(error);}finally{client.release();}
});
