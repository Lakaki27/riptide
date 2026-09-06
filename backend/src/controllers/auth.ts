import { Router } from "express";
import { requireAdmin, requireAuth } from "../middleware/auth";
import {
    adminCreateUser,
    adminDeleteUser,
    adminListUsers,
    adminResetUserPassword,
    changePassword,
    completePasswordReset,
    getMinPasswordLength,
    getUserById,
    loginUser,
    refreshTokens,
    registerUser,
    updateUserPreferences,
    validatePasswordLength,
} from "../services/auth";
import rateLimit from "express-rate-limit";

const router = Router();

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "too many login attempts, try again later" },
});

router.post("/login", loginLimiter, async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res
            .status(400)
            .json({ error: "email and password are required" });
    }
    try {
        const result = await loginUser(email, password);
        res.json(result);
    } catch {
        res.status(401).json({ error: "invalid credentials" });
    }
});

router.post("/complete-reset", async (req, res) => {
    const { resetToken, newPassword } = req.body;
    if (!resetToken || !newPassword) {
        return res
            .status(400)
            .json({ error: "resetToken and newPassword are required" });
    }

    const lengthError = validatePasswordLength(newPassword);

    if (lengthError) {
        return res.status(400).json({ error: lengthError });
    }

    try {
        const tokens = await completePasswordReset(resetToken, newPassword);
        res.json(tokens);
    } catch (err) {
        res.status(401).json({
            error: err instanceof Error ? err.message : "reset failed",
        });
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

router.get("/me", requireAuth, async (req, res) => {
    const userId = req.user?.sub;
    if (!userId) {
        return res.status(401).json({ error: "not authenticated" });
    }
    const user = await getUserById(userId);
    if (!user) {
        return res.status(404).json({ error: "user not found" });
    }
    res.json({
        id: user.id,
        email: user.email,
        role: user.role,
        theme: user.theme,
        language: user.language,
    });
});

router.patch("/me", requireAuth, async (req, res) => {
    const userId = req.user?.sub;
    if (!userId) {
        return res.status(401).json({ error: "not authenticated" });
    }
    const { theme, language } = req.body;
    const user = await updateUserPreferences(userId, { theme, language });
    res.json({
        id: user.id,
        email: user.email,
        role: user.role,
        theme: user.theme,
        language: user.language,
    });
});

router.post("/change-password", requireAuth, async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
        return res
            .status(400)
            .json({ error: "currentPassword and newPassword are required" });
    }

    const lengthError = validatePasswordLength(newPassword);

    if (lengthError) {
        return res.status(400).json({ error: lengthError });
    }

    const userId = req.user?.sub;
    if (!userId) {
        return res.status(401).json({ error: "not authenticated" });
    }
    try {
        await changePassword(userId, currentPassword, newPassword);
        res.sendStatus(204);
    } catch (err) {
        res.status(400).json({
            error:
                err instanceof Error
                    ? err.message
                    : "failed to change password",
        });
    }
});

router.get("/users", requireAuth, requireAdmin, async (_req, res) => {
    const users = await adminListUsers();
    res.json({
        results: users.map((u) => ({
            id: u.id,
            email: u.email,
            role: u.role,
            mustResetPassword: u.mustResetPassword,
            createdAt: u.createdAt,
        })),
    });
});

router.post("/users", requireAuth, requireAdmin, async (req, res) => {
    const { email, role } = req.body;
    if (!email) {
        return res.status(400).json({ error: "email is required" });
    }
    try {
        const { user, password } = await adminCreateUser(
            email,
            role === "admin" ? "admin" : "user",
        );
        res.status(201).json({
            id: user.id,
            email: user.email,
            role: user.role,
            password,
        });
    } catch (err) {
        res.status(409).json({
            error: err instanceof Error ? err.message : "failed to create user",
        });
    }
});

router.post(
    "/users/:id/reset-password",
    requireAuth,
    requireAdmin,
    async (req, res) => {
        try {
            const password = await adminResetUserPassword(req.params.id);
            res.json({ password });
        } catch (err) {
            res.status(404).json({
                error: err instanceof Error ? err.message : "user not found",
            });
        }
    },
);

router.delete("/users/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
        await adminDeleteUser(req.params.id, req.user!.sub);
        res.sendStatus(204);
    } catch (err) {
        res.status(400).json({
            error: err instanceof Error ? err.message : "failed to delete user",
        });
    }
});

router.get("/password-policy", (_req, res) => {
    res.json({ minLength: getMinPasswordLength() });
});

export { router as authRouter };
