import React from "react";
import {describe,it,expect,vi} from "vitest";
import {render,screen,waitFor} from "@testing-library/react";
import Dashboard from "./page";
vi.mock("@/lib/auth",()=>({readSession:()=>({token:"test-token"})}));
vi.mock("@/lib/api",()=>({apiRequest:vi.fn().mockResolvedValue({data:{salesCount:3,lifetimeRevenue:3000,todayRevenue:500,monthRevenue:1200,productCount:8,customerCount:4,lowStockVariants:2,recentSales:[{id:"s1",invoice_number:"GST/2026/000001",total:500,status:"completed",sale_date:"2026-11-17T08:00:00Z"}]}})}));
describe("PostgreSQL dashboard",()=>{it("renders live shop metrics and recent invoices",async()=>{render(<Dashboard/>);await waitFor(()=>expect(screen.getByText("Today's sales")).toBeDefined());expect(screen.getByText("GST/2026/000001")).toBeDefined();expect(screen.getByText("Low-stock variants")).toBeDefined();});});
