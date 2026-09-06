import type { NextFunction, Request, Response } from "express";
import { getUserById, verifyToken } from "../services/auth";

export async function requireAuth(
    req: Request,
    res: Response,
    next: NextFunction,
) {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
        return res
            .status(401)
            .json({ error: "missing or invalid authorization header" });
    }
    const token = header.slice("Bearer ".length);
    try {
        const payload = verifyToken(token);
        const user = await getUserById(payload.sub);
        if (!user) {
            return res.status(401).json({ error: "user no longer exists" });
        }
        req.user = { sub: user.id, email: user.email, role: user.role };
        next();
    } catch {
        res.status(401).json({ error: "invalid or expired token" });
    }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
    if (!req.user || req.user.role !== "admin") {
        return res.status(403).json({ error: "admin access required" });
    }
    next();
}
