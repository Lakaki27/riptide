export type JobStatus =
	| "pending"
	| "processing"
	| "uploading"
	| "done"
	| "failed";

export interface Job {
	status: JobStatus;
	musicId?: string;
	error?: string;
}

const jobs = new Map<string, Job>();

export function createJob(jobId: string): void {
	jobs.set(jobId, { status: "pending" });
}

export function updateJob(jobId: string, job: Job): void {
	jobs.set(jobId, job);
}

export function getJobStatus(jobId: string): Job | undefined {
	return jobs.get(jobId);
}
