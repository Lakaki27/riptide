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

export function isAuthEnabled(): boolean {
	return process.env.AUTH_ENABLED === "true";
}

function hashToken(token: string): string {
	return createHash("sha256").update(token).digest("hex");
}

function generateAccessToken(user: User): string {
	return jwt.sign(
		{ sub: user.id, email: user.email },
		requireEnv("JWT_SECRET"),
		{
			expiresIn: ACCESS_TOKEN_TTL,
		},
	);
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
): Promise<User> {
	const existing = await userRepository.findOne({ where: { email } });

	if (existing) {
		throw new Error("email already registered");
	}

	const passwordHash = await bcrypt.hash(password, 12);
	const user = userRepository.create({ email, passwordHash });
	await userRepository.save(user);
	return user;
}

export async function loginUser(
	email: string,
	password: string,
): Promise<TokenPair> {
	const user = await userRepository.findOne({ where: { email } });

	if (!user) {
		throw new Error("invalid credentials");
	}

	const valid = await bcrypt.compare(password, user.passwordHash);

	if (!valid) {
		throw new Error("invalid credentials");
	}

	const accessToken = generateAccessToken(user);
	const refreshToken = await generateRefreshToken(user);

	return { accessToken, refreshToken };
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

export function verifyToken(token: string): { sub: string; email: string } {
	return jwt.verify(token, requireEnv("JWT_SECRET")) as {
		sub: string;
		email: string;
	};
}
