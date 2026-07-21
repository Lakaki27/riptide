import { nanoid } from "nanoid";
import {
	BeforeInsert,
	Column,
	CreateDateColumn,
	Entity,
	ManyToOne,
	PrimaryColumn,
} from "typeorm";
import { Artist } from "./Artist";

@Entity()
export class Music {
	@PrimaryColumn({ type: "varchar", length: 12 })
	id!: string;

	@Column()
	title!: string;

	@ManyToOne(
		() => Artist,
		(artist) => artist.musics,
	)
	artist!: Artist;

	@Column({ type: "int" })
	durationSeconds!: number;

	@Column()
	fileKey!: string;

	@CreateDateColumn()
	createdAt!: Date;

	@BeforeInsert()
	generateId() {
		this.id = nanoid(12);
	}
}
