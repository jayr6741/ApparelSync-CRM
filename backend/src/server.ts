import cors from "cors";
import express from "express";
import {env} from "./config/env";
import {pool} from "./db/pool";
import {healthRouter} from "./routes/health.routes";
import {authRouter} from "./routes/auth.routes";
import {catalogRouter} from "./routes/catalog.routes";
import {customersRouter} from "./routes/customers.routes";
import {purchasingRouter} from "./routes/purchasing.routes";
import {salesRouter} from "./routes/sales.routes";
import {reportsRouter} from "./routes/reports.routes";
import {stockRouter} from "./routes/stock.routes";

const app=express();app.disable("x-powered-by");app.use(cors({origin:env.corsOrigin.split(",").map(x=>x.trim())}));app.use(express.json({limit:"1mb"}));
app.get("/",(_req,res)=>res.json({name:"GARMENTOS API",version:"0.6.0"}));
app.use("/api/health",healthRouter);app.use("/api/v1/auth",authRouter);app.use("/api/v1",catalogRouter);app.use("/api/v1",customersRouter);app.use("/api/v1",purchasingRouter);app.use("/api/v1",salesRouter);app.use("/api/v1",reportsRouter);app.use("/api/v1",stockRouter);
app.use((error:unknown,_req:express.Request,res:express.Response,_next:express.NextFunction)=>{console.error("GARMENTOS API error:",error);res.status(500).json({error:"Internal server error"});});
const server=app.listen(env.port,()=>console.log(`GARMENTOS API listening on http://localhost:${env.port}`));
async function shutdown(){server.close(async()=>{await pool.end();process.exit(0);});}
process.on("SIGINT",shutdown);process.on("SIGTERM",shutdown);
