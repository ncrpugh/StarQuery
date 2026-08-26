// ---------------- Row Populator ----------------
// Responsible for generating clean rows and injecting faults into module data

export class RowPopulator {
    constructor(rulebook, config, randomiser) {
        this.rulebook = rulebook;
        this.config = config;
        this.random = randomiser;
    }

    // ---------------- Create Clean Row ----------------
    // Generates a row with valid values based on module schema

    createCleanRow(moduleName, rowId) {
        const moduleDetails = this.rulebook.modules.items[moduleName];

        // Base row with default/system fields
        const row = {
            id: rowId,
            issue_detected: 0,
            repaired: 0,
            ship_section: moduleDetails.ship_section,
            severity: this.random.randomInt(1, 5),
            severity_modifier: this.generateSeverityModifier(moduleDetails.ship_section)
        };

        // Populate module-specific fields with valid (non faulty) value
        for (const field of moduleDetails.fields) {
            row[field] = this.generateCleanValue(field);
        }

        return row;
    }

    // ---------------- Inject Fault ----------------
    // Selects a random numeric, module-specifc field and replace it with an out-of-range value
    injectFault(row, moduleName, difficultyParams) {
        const moduleDetails = this.rulebook.modules.items[moduleName];

        // Only include faultable fields by checking if it has min/max values
        const numericFields = moduleDetails.fields.filter(f => {
            const r = this.rulebook.faultRanges.items[f];
            return r && r.min !== null && r.max !== null;
        });

        if (!numericFields.length) return null;

        // Pick a random numeric field and inject a fault into it
        const field = this.random.randomChoice(numericFields);
        row[field] = this.generateFaultValue(field, difficultyParams.ambiguity);

        // Reset detection and repair flags
        row.issue_detected = 0;
        row.repaired = 0;

        // Return faulty row and which field is faulty
        return { row, field };
    }

    // ---------------- Private Helpers ----------------

    // Generate a valid value within min/max range
    generateCleanValue(field) {
        const range = this.rulebook.faultRanges.items[field];
        if (!range) return null;
        if (range.min === null && range.max === null) return "OK";

        return this.random.randomInt(range.min, range.max);
    }

    // Generate an out-of-range value based on ambiguity (difficulty scaling)
    generateFaultValue(field, ambiguity) {
        const range = this.rulebook.faultRanges.items[field];
        const delta = Math.max(1, Math.floor((range.max - range.min) * ambiguity / 2));
        return this.random.chance(0.5)
            ? range.min - this.random.randomInt(1, delta)
            : range.max + this.random.randomInt(1, delta);
    }

    // Generate severity modifier based on ship section configs
    generateSeverityModifier(section) {
        const [min, max] = this.config.severityRanges[section];
        return +(this.random.random() * (max - min) + min).toFixed(2);
    }
}