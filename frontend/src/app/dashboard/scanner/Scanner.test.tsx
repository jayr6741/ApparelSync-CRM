import React from "react";
import {describe,it,expect} from "vitest";
import {render,screen} from "@testing-library/react";
import ScannerPage from "./page";
describe("Barcode sales entry",()=>{it("directs cashier to the PostgreSQL POS workflow",()=>{render(<ScannerPage/>);expect(screen.getByText("Barcode sales")).toBeDefined();expect(screen.getByRole("link",{name:"Open POS"}).getAttribute("href")).toBe("/dashboard/pos");});});
