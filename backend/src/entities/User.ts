import { nanoid } from "nanoid";
import {
    BeforeInsert,
    Column,
    CreateDateColumn,
    Entity,
    PrimaryColumn,
} from "typeorm";

@Entity()
export class User {
    @PrimaryColumn({ type: "varchar", length: 12 })
    id!: string;

    @Column({ type: "varchar", unique: true })
    email!: string;

    @Column({ type: "varchar" })
    passwordHash!: string;

    @Column({ type: "varchar", default: "user" })
    role!: "admin" | "user";

    @Column({ type: "boolean", default: false })
    isProtected!: boolean;

    @Column({ type: "varchar", default: "system" })
    theme!: string;

    @Column({ type: "varchar", default: "en" })
    language!: string;

    @Column({ type: "boolean", default: false })
    mustResetPassword!: boolean;

    @CreateDateColumn()
    createdAt!: Date;

    @BeforeInsert()
    generateId() {
        if (!this.id) {
            this.id = nanoid(12);
        }
    }
}
