import { Router } from "express";

const router = Router();

router.get("/", (_req, res) => {
    res.json({ authEnabled: true });
});

export { router as configRouter };
