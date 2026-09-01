export interface Artist {
    id: string;
    name: string;
    createdAt: string;
}

export interface Music {
    id: string;
    title: string;
    artist: Artist;
    durationSeconds: number;
    createdAt: string;
    thumbnailUrl: string | null;
}

export interface Playlist {
    id: string;
    name: string;
    createdAt: string;
    musics: Music[];
}

export interface PaginatedResponse<T> {
    results: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}
