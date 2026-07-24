import { nanoid } from "nanoid";
import {
	BeforeInsert,
	Column,
	CreateDateColumn,
	Entity,
	ManyToOne,
	PrimaryColumn,
} from "typeorm";
import { User } from "./User";

@Entity()
export class RefreshToken {
	@PrimaryColumn({ type: "varchar", length: 12 })
	id!: string;

	@Column({ unique: true, type: "varchar" })
	tokenHash!: string;

	@ManyToOne(() => User, { onDelete: "CASCADE" })
	user!: User;

	@Column({ type: "timestamptz" })
	expiresAt!: Date;

	@Column({ default: false, type: "boolean" })
	revoked!: boolean;

	@CreateDateColumn()
	createdAt!: Date;

	@BeforeInsert()
	generateId() {
		this.id = nanoid(12);
	}
}
