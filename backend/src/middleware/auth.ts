import type { NextFunction, Request, Response } from "express";
import { isAuthEnabled, verifyToken } from "../services/auth";

export function requireAuth(req: Request, res: Response, next: NextFunction) {
	if (!isAuthEnabled()) {
		return next();
	}

	const header = req.headers.authorization;

	if (!header?.startsWith("Bearer ")) {
		return res
			.status(401)
			.json({ error: "missing or invalid authorization header" });
	}

	const token = header.slice("Bearer ".length);

	try {
		verifyToken(token);
		next();
	} catch {
		res.status(401).json({ error: "invalid or expired token" });
	}
}
