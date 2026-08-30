import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";
import {
  createGoal,
  deleteGoal,
  listGoals,
  logToday,
  undoToday,
  updateGoal,
} from "../controllers/goalsController";

const router = Router();

router.use(requireAuth);

router.get("/", asyncHandler(listGoals));
router.post("/", asyncHandler(createGoal));
router.put("/:id", asyncHandler(updateGoal));
router.delete("/:id", asyncHandler(deleteGoal));
router.post("/:id/log", asyncHandler(logToday));
router.delete("/:id/log", asyncHandler(undoToday));

export default router;
