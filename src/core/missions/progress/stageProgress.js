// ---------------- Stage progress ----------------
// Tracks stage completion & progress

// Calculate progress for Identify stage
export function getIdentifyProgress(summary) {
    if (!summary.identify) return 0;
    const done = summary.identify.totalNewlyIdentified || 0;
    const total = summary.identify.totalFaultyRows || 0;
    return total === 0 ? 1 : done / total;
}

// Calculate progress for Repair stage
export function getRepairProgress(mission, stage) {
    if(stage === "Identify") {
        return 0;
    }
    let total = 0;
    let repaired = 0;

    // Count identified rows and how many are repaired
    for (const module of mission.modules) {
        for (const row of module.rows) {
    
            if (row.issue_detected) {
                total += 1;

                if (row.repaired) {
                    repaired += 1;
                }
            }
        }
    }

    return total === 0 ? 1 : repaired / total;
}

// Calculate progress for Logging stage
export function getLoggingProgress(mission, stage) {
    if(stage !== "Logging") {
        return 0;
    }
    const logs = mission.modules.find(m => m.name === "Logs");
    if (!logs) return 0;

    // Get all ship sections
    const sections = new Set(
        mission.modules.flatMap(m =>
            m.rows.map(r => r.ship_section).filter(Boolean)
        )
    );

    let total = sections.size;
    let correct = 0;

    for (const section of sections) {
        let expectedImpact = 0;

        // Calculate expected repair impact for section
        for (const m of mission.modules) {
            for (const r of m.rows) {
                if (r.ship_section === section && r.repaired) {
                    expectedImpact += (r.severity || 1) * (r.severity_modifier || 1);
                }
            }
        }

        const logEntry = logs.rows.find(r => r.ship_section === section);

        // Check if logged value matches expected impact
        if (logEntry && Math.abs(logEntry.repairs - expectedImpact) <= 0.01) {
            correct++;
        }
    }

    return total === 0 ? 1 : correct / total;
}

// Return progress for all stages
export function getStageProgress(mission, stage) {
    const summary = mission.summary || {};
    return {
        Identify: getIdentifyProgress(summary),
        Repair: getRepairProgress(mission, stage),
        Logging: getLoggingProgress(mission, stage)
    };
}
