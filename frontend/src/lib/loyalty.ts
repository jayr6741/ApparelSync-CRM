import { apiRequest } from "./api";
import { readSession } from "./auth";

export type CustomerTier="Bronze"|"Silver"|"Gold";
export interface PointTransaction{id:string;customerId:string;orderId?:string|null;pointsChange:number;type:"EARNED"|"REDEEMED"|"BONUS"|"ADJUSTMENT";description:string;createdAt:string}
export interface LoyaltySettings{dollarsPerPoint:number;pointsPerDiscount:number;discountValue:number;silverThreshold:number;goldThreshold:number;silverMultiplier:number;goldMultiplier:number}
const DEFAULT_SETTINGS:LoyaltySettings={dollarsPerPoint:10,pointsPerDiscount:100,discountValue:5,silverThreshold:500,goldThreshold:1500,silverMultiplier:1.2,goldMultiplier:1.5};
export function getLoyaltySettings():LoyaltySettings{if(typeof window==="undefined")return DEFAULT_SETTINGS;try{const saved=localStorage.getItem("apparel_loyalty_settings");return saved?{...DEFAULT_SETTINGS,...JSON.parse(saved)}:DEFAULT_SETTINGS;}catch{return DEFAULT_SETTINGS;}}
export function saveLoyaltySettings(settings:Partial<LoyaltySettings>):LoyaltySettings{const updated={...getLoyaltySettings(),...settings};if(typeof window!=="undefined")try{localStorage.setItem("apparel_loyalty_settings",JSON.stringify(updated));}catch{}return updated;}
export function getCustomerTier(points:number,settings=getLoyaltySettings()):CustomerTier{return points>=settings.goldThreshold?"Gold":points>=settings.silverThreshold?"Silver":"Bronze";}
export function getTierMultiplier(tier:CustomerTier,settings=getLoyaltySettings()):number{return tier==="Gold"?settings.goldMultiplier:tier==="Silver"?settings.silverMultiplier:1;}
export function getTierBadgeClass(tier:CustomerTier):string{return tier==="Gold"?"bg-amber-500/20 text-amber-300 border-amber-500/40":tier==="Silver"?"bg-slate-300/20 text-slate-200 border-slate-300/40":"bg-amber-700/20 text-amber-500 border-amber-700/40";}
export function calculateEarnedPoints(amount:number,tier:CustomerTier="Bronze",bonus=0,settings=getLoyaltySettings()):number{return amount<=0||settings.dollarsPerPoint<=0?Math.max(0,bonus):Math.max(0,Math.floor(Math.floor(amount/settings.dollarsPerPoint)*getTierMultiplier(tier,settings))+bonus);}
export function calculateDiscountFromPoints(points:number,settings=getLoyaltySettings()):number{return points<=0||settings.pointsPerDiscount<=0?0:Number(((points/settings.pointsPerDiscount)*settings.discountValue).toFixed(2));}
export function getMaxRedeemablePoints(total:number,available:number,settings=getLoyaltySettings()):number{return settings.discountValue<=0?0:Math.min(available,Math.floor(total/settings.discountValue*settings.pointsPerDiscount));}
/** Persist reward points through the tenant-scoped PostgreSQL API. */
export async function recordPointTransaction(customerId:string,pointsChange:number,type:"EARNED"|"REDEEMED"|"BONUS"|"ADJUSTMENT",description:string,orderId?:string):Promise<boolean>{
 const session=readSession();if(!session)return false;
 try{
  await apiRequest("/customers/"+encodeURIComponent(customerId)+"/points",{method:"POST",body:JSON.stringify({pointsChange,type,description,orderId})},session.token);
  return true;
 }catch(error){console.error("Unable to record customer reward points:",error);return false;}
}
