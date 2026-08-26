import { FaultRanges } from '../../../rules/rulebook/faultRanges.js'
// ---------------- Helper class ----------------

// ---------------- Check if Row is Faulty ----------------
// Returns true if any field in the row is considered faulty
// according to the current rulebook
export function isRowFaulty(row, rulebook) {
    return Object.keys(row).some(f => rulebook.isFieldFaulty(f, row[f]));
}

// ---------------- Infer Field Type ----------------
// Determines the type of a field for query processing purposes
const faultRanges = new FaultRanges();
export function inferType(fieldName) {
    if (fieldName === 'issue_detected' || fieldName === 'repaired') return 'BOOLEAN';
    if (fieldName === 'id') return 'INTEGER';

    // If field has a defined fault range, infer type based on min value
    if (fieldName in faultRanges.items) {
        return Number.isInteger(faultRanges.items[fieldName].min) ? 'INTEGER' : 'REAL';
    }

    // Default to TEXT for any other fields
    return 'TEXT';
}
