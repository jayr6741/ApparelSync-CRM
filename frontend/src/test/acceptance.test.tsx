import React from "react";
import {describe,it,expect,vi} from "vitest";
import {render,screen,waitFor} from "@testing-library/react";
import Dashboard from "@/app/dashboard/page";
import CustomersPage from "@/app/dashboard/customers/page";
vi.mock("@/lib/auth",()=>({readSession:()=>({token:"test-token"})}));
vi.mock("@/lib/api",()=>({apiRequest:vi.fn(async(path:string)=>path==="/reports/overview"?{data:{salesCount:2,lifetimeRevenue:2500,todayRevenue:1000,monthRevenue:2000,productCount:5,customerCount:1,lowStockVariants:1,recentSales:[]}}:{data:[{id:"c1",full_name:"Aarav Patel",phone:"9999999999",email:null,city:"Surat",reward_points:0,tier:"Bronze"}]})}));
describe("GARMENTOS PostgreSQL acceptance smoke tests",()=>{it("loads tenant dashboard metrics through backend API",async()=>{render(<Dashboard/>);await waitFor(()=>expect(screen.getByText("Total sales")).toBeDefined());expect(screen.getByText("Products")).toBeDefined();});it("loads customer records through backend API",async()=>{render(<CustomersPage/>);await waitFor(()=>expect(screen.getByText("Aarav Patel")).toBeDefined());});});
