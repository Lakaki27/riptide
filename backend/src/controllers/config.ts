import { Router } from "express";
import { isAuthEnabled } from "../services/auth";

const router = Router();

router.get("/", (_req, res) => {
	res.json({ authEnabled: isAuthEnabled() });
});

export { router as configRouter };
