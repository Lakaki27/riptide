export type JobStatus = "pending" | "processing" | "uploading" | "done" | "failed";

export interface Job {
    status: JobStatus;
    musicId?: string;
    error?: string;
    processed: number;
    total: number;
}

const jobs = new Map<string, Job>();

export function createJob(jobId: string): void {
    jobs.set(jobId, {
        status: "pending",
        processed: 0,
        total: 0,
    });
}

export function updateJob(jobId: string, updates: Partial<Job>): void {
    const current = jobs.get(jobId);

    if (!current) {
        throw new Error(`Job ${jobId} not found`);
    }

    jobs.set(jobId, {
        ...current,
        ...updates,
    });
}

export function getJobStatus(jobId: string): Job | undefined {
    return jobs.get(jobId);
}
