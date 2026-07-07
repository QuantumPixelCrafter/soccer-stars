import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import authRouter from "./auth.js";
import inventoryRouter from "./inventory.js";
import shopRouter from "./shop.js";

const router: IRouter = Router();

// Health check (unauthenticated)
router.use(healthRouter);

// Auth — register, login, daily-claim, logout
router.use("/auth", authRouter);

// Inventory — balance, player list, summary
router.use("/inventory", inventoryRouter);

// Shop — pack catalogue, purchase
router.use("/shop", shopRouter);

export default router;
