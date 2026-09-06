import { AppDataSource } from "../data-source";
import { User } from "../entities/User";
import { registerUser } from "./auth";

export async function seedAdminUser(): Promise<void> {
    const email = process.env.SEED_ADMIN_EMAIL;
    const password = process.env.SEED_ADMIN_PASSWORD;

    if (!email || !password) {
        return;
    }

    const userRepository = AppDataSource.getRepository(User);
    const existing = await userRepository.findOne({ where: { email } });

    if (existing) {
        return;
    }

    await registerUser(email, password, "admin", true);
    console.log(`seeded admin user: ${email}`);
}
