import { nanoid } from "nanoid";
import {
	BeforeInsert,
	Column,
	CreateDateColumn,
	Entity,
	OneToMany,
	PrimaryColumn,
} from "typeorm";
import { Music } from "./Music";

@Entity()
export class Artist {
	@PrimaryColumn({ type: "varchar", length: 12 })
	id!: string;

	@Column({ unique: true, type: "varchar" })
	name!: string;

	@OneToMany(
		() => Music,
		(music) => music.artist,
	)
	musics!: Music[];

	@CreateDateColumn()
	createdAt!: Date;

	@BeforeInsert()
	generateId() {
		this.id = nanoid(12);
	}
}
