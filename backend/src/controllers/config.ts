import { Router } from "express";
import { isAuthEnabled } from "../services/auth";

const router = Router();

router.get("/", (_req, res) => {
    res.json({ authEnabled: true });
});

export { router as configRouter };
