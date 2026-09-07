import swaggerUi from "swagger-ui-express";
import type { Express } from "express";
import spec from "./docs/openapi.json";

export function setupDocs(app: Express) {
    if (process.env.NODE_ENV === "production") return;
    app.use("/docs", swaggerUi.serve, swaggerUi.setup(spec));
}
