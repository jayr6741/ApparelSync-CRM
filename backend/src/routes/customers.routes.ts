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
