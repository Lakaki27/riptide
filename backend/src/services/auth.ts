import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { AppDataSource } from "../data-source";
import { RefreshToken } from "../entities/RefreshToken";
import { User } from "../entities/User";
import { requireEnv } from "../env";

const userRepository = AppDataSource.getRepository(User);
const refreshTokenRepository = AppDataSource.getRepository(RefreshToken);

const ACCESS_TOKEN_TTL = "24h";
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const RESET_TOKEN_TTL = "15m";

export function isAuthEnabled(): boolean {
    return process.env.AUTH_ENABLED === "true";
}

function hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
}

function generateRandomPassword(): string {
    return randomBytes(9).toString("base64").replace(/[+/=]/g, "").slice(0, 12);
}

interface TokenPayload {
    sub: string;
    email: string;
    role: "admin" | "user";
}

function generateAccessToken(user: User): string {
    const payload: TokenPayload = {
        sub: user.id,
        email: user.email,
        role: user.role,
    };
    return jwt.sign(payload, requireEnv("JWT_SECRET"), {
        expiresIn: ACCESS_TOKEN_TTL,
    });
}

async function generateRefreshToken(user: User): Promise<string> {
    await refreshTokenRepository
        .createQueryBuilder()
        .update(RefreshToken)
        .set({ revoked: true })
        .where("userId = :userId", { userId: user.id })
        .andWhere("revoked = false")
        .execute();

    const plainToken = randomBytes(48).toString("hex");

    const refreshToken = refreshTokenRepository.create({
        tokenHash: hashToken(plainToken),
        user,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
        revoked: false,
    });

    await refreshTokenRepository.save(refreshToken);
    return plainToken;
}

interface TokenPair {
    accessToken: string;
    refreshToken: string;
}

export async function registerUser(
    email: string,
    password: string,
    role: "admin" | "user" = "user",
    isProtected = false,
): Promise<User> {
    const existing = await userRepository.findOne({ where: { email } });
    if (existing) throw new Error("email already registered");
    const passwordHash = await bcrypt.hash(password, 12);
    const user = userRepository.create({
        email,
        passwordHash,
        role,
        isProtected,
    });
    await userRepository.save(user);
    return user;
}

export interface LoginResult {
    needsPasswordReset: boolean;
    resetToken?: string;
    accessToken?: string;
    refreshToken?: string;
}

export async function loginUser(
    email: string,
    password: string,
): Promise<LoginResult> {
    const user = await userRepository.findOne({ where: { email } });
    if (!user) {
        throw new Error("invalid credentials");
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
        throw new Error("invalid credentials");
    }

    if (user.mustResetPassword) {
        const resetToken = jwt.sign(
            { sub: user.id, purpose: "password-reset" },
            requireEnv("JWT_SECRET"),
            { expiresIn: RESET_TOKEN_TTL },
        );
        return { needsPasswordReset: true, resetToken };
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = await generateRefreshToken(user);
    return { needsPasswordReset: false, accessToken, refreshToken };
}

export async function completePasswordReset(
    resetToken: string,
    newPassword: string,
): Promise<TokenPair> {
    let payload: { sub: string; purpose: string };
    try {
        payload = jwt.verify(resetToken, requireEnv("JWT_SECRET")) as {
            sub: string;
            purpose: string;
        };
    } catch {
        throw new Error("invalid or expired reset token");
    }
    if (payload.purpose !== "password-reset") {
        throw new Error("invalid reset token");
    }

    const user = await userRepository.findOne({ where: { id: payload.sub } });
    if (!user) {
        throw new Error("user not found");
    }

    user.passwordHash = await bcrypt.hash(newPassword, 12);
    user.mustResetPassword = false;
    await userRepository.save(user);

    const accessToken = generateAccessToken(user);
    const refreshToken = await generateRefreshToken(user);
    return { accessToken, refreshToken };
}

export async function changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
): Promise<void> {
    const user = await userRepository.findOne({ where: { id: userId } });
    if (!user) {
        throw new Error("user not found");
    }
    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) {
        throw new Error("current password is incorrect");
    }
    user.passwordHash = await bcrypt.hash(newPassword, 12);
    await userRepository.save(user);
}

export async function refreshTokens(plainToken: string): Promise<TokenPair> {
    const tokenHash = hashToken(plainToken);
    const stored = await refreshTokenRepository.findOne({
        where: { tokenHash },
        relations: ["user"],
    });
    if (!stored || stored.revoked || stored.expiresAt < new Date()) {
        throw new Error("invalid or expired refresh token");
    }
    stored.revoked = true;
    await refreshTokenRepository.save(stored);

    const accessToken = generateAccessToken(stored.user);
    const newRefreshToken = await generateRefreshToken(stored.user);
    return { accessToken, refreshToken: newRefreshToken };
}

export function verifyToken(token: string): TokenPayload {
    return jwt.verify(token, requireEnv("JWT_SECRET")) as TokenPayload;
}

export async function getUserById(userId: string): Promise<User | null> {
    return userRepository.findOne({ where: { id: userId } });
}

export async function updateUserPreferences(
    userId: string,
    prefs: { theme?: string; language?: string },
): Promise<User> {
    const user = await userRepository.findOne({ where: { id: userId } });
    if (!user) {
        throw new Error("user not found");
    }
    if (prefs.theme) user.theme = prefs.theme;
    if (prefs.language) user.language = prefs.language;
    await userRepository.save(user);
    return user;
}

export async function adminListUsers(): Promise<User[]> {
    return userRepository.find({ order: { createdAt: "ASC" } });
}

export async function adminCreateUser(
    email: string,
    role: "admin" | "user" = "user",
): Promise<{ user: User; password: string }> {
    const existing = await userRepository.findOne({ where: { email } });
    if (existing) {
        throw new Error("email already registered");
    }
    const password = generateRandomPassword();
    const passwordHash = await bcrypt.hash(password, 12);
    const user = userRepository.create({
        email,
        passwordHash,
        role,
        mustResetPassword: true,
    });
    await userRepository.save(user);
    return { user, password };
}

export async function adminResetUserPassword(userId: string): Promise<string> {
    const user = await userRepository.findOne({ where: { id: userId } });
    if (!user) {
        throw new Error("user not found");
    }
    const password = generateRandomPassword();
    user.passwordHash = await bcrypt.hash(password, 12);
    user.mustResetPassword = true;
    await userRepository.save(user);
    return password;
}

export async function adminDeleteUser(
    targetUserId: string,
    requestingUserId: string,
): Promise<void> {
    const user = await userRepository.findOne({ where: { id: targetUserId } });
    if (!user) throw new Error("user not found");
    if (user.isProtected) throw new Error("this account cannot be deleted");
    if (user.id === requestingUserId)
        throw new Error("you cannot delete your own account");
    await userRepository.delete(targetUserId);
}

export function getMinPasswordLength(): number {
    const raw = process.env.PASSWORD_MIN_LENGTH;
    if (!raw) return 0;
    const n = Number(raw);
    if (Number.isNaN(n) || n < 0) return 0;
    return n;
}

export function validatePasswordLength(password: string): string | null {
    const min = getMinPasswordLength();
    if (min > 0 && password.length < min) {
        return `Password must be at least ${min} characters`;
    }
    return null;
}
