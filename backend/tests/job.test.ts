import { describe, expect, it } from "vitest";
import { createJob, getJobStatus, updateJob } from "../src/services/job";

describe("job service", () => {
    it("creates a job with pending status", () => {
        const jobId = "test-job-progress";
        createJob(jobId);
        expect(getJobStatus(jobId)).toEqual({ status: "pending" });
    });

    it("tracks processed/total progress fields", () => {
        const jobId = "test-job-progress-2";
        createJob(jobId);
        updateJob(jobId, { status: "processing", processed: 3, total: 10 });
        expect(getJobStatus(jobId)).toEqual({
            status: "processing",
            processed: 3,
            total: 10,
        });
    });

    it("marks done with final counts", () => {
        const jobId = "test-job-progress-3";
        createJob(jobId);
        updateJob(jobId, { status: "done", processed: 10, total: 10 });
        expect(getJobStatus(jobId)?.status).toBe("done");
    });
});
