import { Router, type IRouter } from "express";
import healthRouter from "./health";
import dashboardRouter from "./dashboard";
import casesRouter from "./cases";
import complaintsRouter from "./complaints";
import suspectsRouter from "./suspects";
import alertsRouter from "./alerts";
import osintRouter from "./osint";
import crimePatternsRouter from "./crime_patterns";

const router: IRouter = Router();

router.use(healthRouter);
router.use(dashboardRouter);
router.use(casesRouter);
router.use(complaintsRouter);
router.use(suspectsRouter);
router.use(alertsRouter);
router.use(osintRouter);
router.use(crimePatternsRouter);

export default router;
