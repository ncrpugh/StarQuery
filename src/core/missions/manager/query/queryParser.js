// ---------------- Query Parsing Utilities ----------------
// Provides helper functions to analyse SQL queries for the game engine.
// Includes extracting module name from query and counting fields used in WHERE clauses.


// ---------------- Extract Module Name ----------------
// Extracts a single module (table) name from a SQL query.
// Rejects multi-table queries or invalid syntax.

export function extractModuleName(query, availableModules) {
    if (!query) return null;

    const upperQuery = query.toUpperCase();
    const fromIndex = upperQuery.indexOf("FROM ");
    if (fromIndex === -1) return null;

    // Extract everything after "FROM "
    const afterFrom = query.slice(fromIndex + 5).trim().replace(/;$/, "");

    // Split on whitespace, take first token as table name
    const tokens = afterFrom.split(/\s+/);
    if (tokens.length === 0) return null;

    const tableNameCandidate = tokens[0];

    // Reject if tableNameCandidate contains ',' i.e. multi-table query
    if (tableNameCandidate.includes(",")) return null;

    // Match against available modules (case-insensitive)
    const matched = availableModules.find(
        name => name.toLowerCase() === tableNameCandidate.toLowerCase()
    );

    return matched ?? null;
}

// ---------------- Extract WHERE Fields ----------------
// Counts how many module fields appear in the WHERE clause of a query.

export function extractWhereFields(query, moduleFields) {
    const whereMatch = query.match(/WHERE\s+(.+)/i);
    const whereText = whereMatch ? whereMatch[1] : ""; 
    let count = 0;

    for (const field of moduleFields) {
        const regex = new RegExp(`\\b${field}\\b`, "gi");
        const matches = whereText.match(regex);
        if (matches) count += matches.length;
    }
    
    return count;
}


