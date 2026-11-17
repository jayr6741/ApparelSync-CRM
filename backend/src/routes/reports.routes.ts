import { Router } from "express";
import { pool } from "../db/pool";
import { requireAuth } from "../middleware/auth";

export const reportsRouter=Router();
reportsRouter.use(requireAuth);
reportsRouter.get("/reports/overview",async(req,res,next)=>{
 try{
  const shopId=req.auth!.shopId;
  const [sales,today,month,products,customers,lowStock,recent]=await Promise.all([
   pool.query("SELECT count(*)::int AS sales_count,COALESCE(sum(total),0)::numeric(14,2) AS revenue FROM sales WHERE shop_id=$1 AND status='completed'",[shopId]),
   pool.query("SELECT COALESCE(sum(total),0)::numeric(14,2) AS revenue FROM sales WHERE shop_id=$1 AND status='completed' AND sale_date::date=current_date",[shopId]),
   pool.query("SELECT COALESCE(sum(total),0)::numeric(14,2) AS revenue FROM sales WHERE shop_id=$1 AND status='completed' AND sale_date>=date_trunc('month',now())",[shopId]),
   pool.query("SELECT count(*)::int AS count FROM products WHERE shop_id=$1",[shopId]),
   pool.query("SELECT count(*)::int AS count FROM customers WHERE shop_id=$1",[shopId]),
   pool.query("SELECT count(*)::int AS count FROM stock_balances WHERE shop_id=$1 AND on_hand-reserved-damaged<=5",[shopId]),
   pool.query("SELECT id,invoice_number,total,status,sale_date FROM sales WHERE shop_id=$1 ORDER BY sale_date DESC LIMIT 8",[shopId])
  ]);
  return res.json({data:{salesCount:sales.rows[0].sales_count,lifetimeRevenue:sales.rows[0].revenue,todayRevenue:today.rows[0].revenue,monthRevenue:month.rows[0].revenue,productCount:products.rows[0].count,customerCount:customers.rows[0].count,lowStockVariants:lowStock.rows[0].count,recentSales:recent.rows}});
 }catch(e){return next(e);}
});
