import { nanoid } from "nanoid";
import {
	BeforeInsert,
	Column,
	Entity,
	OneToMany,
	PrimaryColumn,
} from "typeorm";
import { Music } from "./Music";

@Entity()
export class Artist {
	@PrimaryColumn({ type: "varchar", length: 12 })
	id!: string;

	@Column()
	name!: string;

	@OneToMany(
		() => Music,
		(music) => music.artist,
	)
	musics!: Music[];

	@BeforeInsert()
	generateId() {
		this.id = nanoid(12);
	}
}
