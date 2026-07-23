import { Router } from "express";
import { loginUser, refreshTokens, registerUser } from "../services/auth";

const router = Router();

router.post("/register", async (req, res) => {
	const { email, password } = req.body;

	if (!email || !password) {
		return res.status(400).json({ error: "email and password are required" });
	}

	try {
		const user = await registerUser(email, password);
		res.status(201).json({ id: user.id, email: user.email });
	} catch (err) {
		res.status(409).json({
			error: err instanceof Error ? err.message : "registration failed",
		});
	}
});

router.post("/login", async (req, res) => {
	const { email, password } = req.body;

	if (!email || !password) {
		return res.status(400).json({ error: "email and password are required" });
	}

	try {
		const tokens = await loginUser(email, password);
		res.json(tokens);
	} catch {
		res.status(401).json({ error: "invalid credentials" });
	}
});

router.post("/refresh", async (req, res) => {
	const { refreshToken } = req.body;

	if (!refreshToken) {
		return res.status(400).json({ error: "refreshToken is required" });
	}

	try {
		const tokens = await refreshTokens(refreshToken);
		res.json(tokens);
	} catch {
		res.status(401).json({ error: "invalid or expired refresh token" });
	}
});

export { router as authRouter };
