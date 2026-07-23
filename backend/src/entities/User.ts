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

	@Column({ unique: true })
	email!: string;

	@Column()
	passwordHash!: string;

	@CreateDateColumn()
	createdAt!: Date;

	@BeforeInsert()
	generateId() {
		this.id = nanoid(12);
	}
}
