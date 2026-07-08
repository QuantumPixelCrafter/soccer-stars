import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import authRouter from "./auth.js";
import inventoryRouter from "./inventory.js";
import shopRouter from "./shop.js";
import squadRouter from "./squad.js";
import marketRouter from "./market.js";
import dailyObjectiveRouter from "./daily-objective.js";

const router: IRouter = Router();

// Health check (unauthenticated)
router.use(healthRouter);

// Auth — register, login, daily-claim, logout
router.use("/auth", authRouter);

// Inventory — balance, player list, summary, exchange
router.use("/inventory", inventoryRouter);

// Shop — pack catalogue, purchase
router.use("/shop", shopRouter);

// Squad management — main & daily_objective squads
router.use("/squad", squadRouter);

// Global Transfer Market
router.use("/market", marketRouter);

// Daily Objective
router.use("/daily-objective", dailyObjectiveRouter);

export default router;
