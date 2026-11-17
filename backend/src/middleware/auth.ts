import type { NextFunction,Request,Response } from "express";
import jwt from "jsonwebtoken";
import { createHash } from "node:crypto";
import { pool } from "../db/pool";
import { env } from "../config/env";

type TokenPayload={sub:string;shopId:string;role:string};
const hashToken=(token:string)=>createHash("sha256").update(token).digest("hex");

export async function requireAuth(req:Request,res:Response,next:NextFunction){
 const header=req.header("authorization"),token=header?.startsWith("Bearer ")?header.slice(7):"";
 if(!token)return res.status(401).json({error:"Authentication required"});
 try{
  const payload=jwt.verify(token,env.authSecret,{issuer:"garmentos-api",audience:"garmentos-app"}) as TokenPayload;
  if(!payload.sub||!payload.shopId)return res.status(401).json({error:"Invalid session token"});
  const membership=await pool.query(`SELECT m.role FROM shop_members m JOIN app_sessions s ON s.user_id=m.user_id WHERE m.shop_id=$1 AND m.user_id=$2 AND s.token_hash=$3 AND s.expires_at>now()`,[payload.shopId,payload.sub,hashToken(token)]);
  if(!membership.rowCount)return res.status(401).json({error:"Session expired or revoked"});
  req.auth={userId:payload.sub,shopId:payload.shopId,role:membership.rows[0].role};
  return next();
 }catch{return res.status(401).json({error:"Invalid or expired session"});}
}
