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

    @Column({ type: "varchar" })
    title!: string;

    @ManyToOne(() => Artist, (artist) => artist.musics)
    artist!: Artist;

    @Column({ type: "int" })
    durationSeconds!: number;

    @Column({ type: "varchar" })
    fileKey!: string;

    @Column({ type: "varchar" })
    thumbnailKey!: string;

    @Column({ type: "varchar", nullable: true })
    codec?: string;

    @Column({ type: "int", nullable: true })
    bitrateKbps?: number;

    @Column({ type: "int", nullable: true })
    sampleRateHz?: number;

    @CreateDateColumn()
    createdAt!: Date;

    @BeforeInsert()
    generateId() {
        if (!this.id) {
            this.id = nanoid(12);
        }
    }
}
