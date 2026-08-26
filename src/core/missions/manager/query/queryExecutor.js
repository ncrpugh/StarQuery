// ---------------- Query Executor ----------------
// Handles sending SQL queries to the backend API and returning results.
// Wraps the API call with error handling and a consistent response format.

import { runQuery } from "../../../api/sql.js";

export class QueryExecutor {

    // ---------------- Execute Query ----------------
    // Executes the provided SQL query via the backend API.
    // Returns a consistent object, catching network or unexpected errors
    
    async execute(query) {
        try {
            const result = await runQuery(query);
            if (!result.success) {
                return { success: false, error: result.error || "Unknown error" };
            }
            return { success: true, result };
        } catch (err) {
            return { success: false, error: err.message || err };
        }
    }
}