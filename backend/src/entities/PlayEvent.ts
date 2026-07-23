import { nanoid } from "nanoid";
import {
	BeforeInsert,
	CreateDateColumn,
	Entity,
	Index,
	ManyToOne,
	PrimaryColumn,
} from "typeorm";
import { Music } from "./Music";

@Entity()
export class PlayEvent {
	@PrimaryColumn({ type: "varchar", length: 12 })
	id!: string;

	@ManyToOne(() => Music, { onDelete: "CASCADE" })
	@Index()
	music!: Music;

	@CreateDateColumn()
	playedAt!: Date;

	@BeforeInsert()
	generateId() {
		if (!this.id) {
			this.id = nanoid(12);
		}
	}
}
