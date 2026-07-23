import { describe, expect, it } from "vitest";
import { createJob, getJobStatus, updateJob } from "../src/services/job";

describe("job service", () => {
	it("creates a job with pending status", () => {
		const jobId = "test-job-1";
		createJob(jobId);

		const job = getJobStatus(jobId);
		expect(job).toEqual({ status: "pending" });
	});

	it("returns undefined for an unknown job", () => {
		expect(getJobStatus("does-not-exist")).toBeUndefined();
	});

	it("updates job status and preserves fields", () => {
		const jobId = "test-job-2";
		createJob(jobId);
		updateJob(jobId, { status: "done", musicId: "abc123" });

		const job = getJobStatus(jobId);
		expect(job).toEqual({ status: "done", musicId: "abc123" });
	});
});
