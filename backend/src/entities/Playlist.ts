import { nanoid } from "nanoid";
import {
	BeforeInsert,
	Column,
	CreateDateColumn,
	Entity,
	JoinTable,
	ManyToMany,
	PrimaryColumn,
} from "typeorm";
import { Music } from "./Music";

@Entity()
export class Playlist {
	@PrimaryColumn({ type: "varchar", length: 12 })
	id!: string;

	@Column()
	name!: string;

	@ManyToMany(() => Music)
	@JoinTable()
	musics!: Music[];

	@CreateDateColumn()
	createdAt!: Date;

	@BeforeInsert()
	generateId() {
		this.id = nanoid(12);
	}
}
