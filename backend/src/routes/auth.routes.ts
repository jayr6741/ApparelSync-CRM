import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { createHash } from "node:crypto";
import { z } from "zod";
import { pool } from "../db/pool";
import { env } from "../config/env";
import { requireAuth } from "../middleware/auth";

export const authRouter=Router();
const registerSchema=z.object({fullName:z.string().trim().min(2).max(120),email:z.string().trim().email().max(254),password:z.string().min(10).max(128),shopName:z.string().trim().min(2).max(120)});
const loginSchema=z.object({email:z.string().trim().email(),password:z.string().min(1).max(128)});
const slugify=(value:string)=>value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,48)||"shop";
const tokenHash=(token:string)=>createHash("sha256").update(token).digest("hex");
function issueToken(userId:string,shopId:string,role:string){return jwt.sign({shopId,role},env.authSecret,{subject:userId,expiresIn:"12h",issuer:"garmentos-api",audience:"garmentos-app"});}
async function persistSession(userId:string,token:string){await pool.query("INSERT INTO app_sessions(user_id,token_hash,expires_at) VALUES($1,$2,now()+interval '12 hours')",[userId,tokenHash(token)]);}

authRouter.post("/register",async(req,res,next)=>{
 const p=registerSchema.safeParse(req.body);if(!p.success)return res.status(400).json({error:"Invalid registration details",details:p.error.flatten()});
 const c=await pool.connect();
 try{
  await c.query("BEGIN");const {fullName,email,password,shopName}=p.data;const hash=await bcrypt.hash(password,12);
  const user=await c.query("INSERT INTO app_users(email,password_hash,full_name) VALUES(lower($1),$2,$3) RETURNING id,email,full_name",[email,hash,fullName]);
  const shop=await c.query("INSERT INTO shops(name,slug) VALUES($1,$2 || '-' || substr(gen_random_uuid()::text,1,8)) RETURNING id,name,slug,currency_code,timezone",[shopName,slugify(shopName)]);
  await c.query("INSERT INTO shop_members(shop_id,user_id,role) VALUES($1,$2,'owner')",[shop.rows[0].id,user.rows[0].id]);
  const branch=await c.query("INSERT INTO branches(shop_id,code,name) VALUES($1,'MAIN','Main Branch') RETURNING id",[shop.rows[0].id]);
  await c.query("INSERT INTO warehouses(shop_id,branch_id,name) VALUES($1,$2,'Main Warehouse')",[shop.rows[0].id,branch.rows[0].id]);
  await c.query("INSERT INTO pos_registers(shop_id,branch_id,name,code) VALUES($1,$2,'Main Register','MAIN')",[shop.rows[0].id,branch.rows[0].id]);
  await c.query("INSERT INTO price_lists(shop_id,name,channel,is_default) VALUES($1,'Retail','retail',true)",[shop.rows[0].id]);
  const token=issueToken(user.rows[0].id,shop.rows[0].id,"owner");
  await c.query("INSERT INTO app_sessions(user_id,token_hash,expires_at) VALUES($1,$2,now()+interval '12 hours')",[user.rows[0].id,tokenHash(token)]);
  await c.query("COMMIT");
  return res.status(201).json({token,user:user.rows[0],shop:shop.rows[0],role:"owner"});
 }catch(e:any){await c.query("ROLLBACK");if(e?.code==="23505")return res.status(409).json({error:"An account with this email already exists"});return next(e);}finally{c.release();}
});

authRouter.post("/login",async(req,res,next)=>{
 const p=loginSchema.safeParse(req.body);if(!p.success)return res.status(400).json({error:"Invalid login details"});
 try{
  const r=await pool.query(`SELECT u.id,u.email,u.full_name,u.password_hash,m.shop_id,m.role,s.name AS shop_name,s.slug FROM app_users u JOIN shop_members m ON m.user_id=u.id JOIN shops s ON s.id=m.shop_id WHERE lower(u.email)=lower($1) AND u.is_active=true ORDER BY m.created_at LIMIT 1`,[p.data.email]);
  if(!r.rowCount||!(await bcrypt.compare(p.data.password,r.rows[0].password_hash)))return res.status(401).json({error:"Email or password is incorrect"});
  const row=r.rows[0],token=issueToken(row.id,row.shop_id,row.role);await persistSession(row.id,token);
  return res.json({token,user:{id:row.id,email:row.email,fullName:row.full_name},shop:{id:row.shop_id,name:row.shop_name,slug:row.slug},role:row.role});
 }catch(e){return next(e);}
});

authRouter.post("/logout",requireAuth,async(req,res,next)=>{
 try{const token=req.header("authorization")!.slice(7);await pool.query("DELETE FROM app_sessions WHERE user_id=$1 AND token_hash=$2",[req.auth!.userId,tokenHash(token)]);return res.json({message:"Session revoked"});}catch(e){return next(e);}
});
