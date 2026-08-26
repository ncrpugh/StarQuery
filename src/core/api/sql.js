let db;
//Using SQL.js (https://sql.js.org/) for in-memory database operations


// ---------------- Initialise SQL.js ----------------
// Configure and initialise the in-memory SQL.js database

// After encountering issues running SQL.js in Jest tests we changed this section to check environment
// as Jest runs in Node which doens't support 'window' calls

const isNode = typeof process !== 'undefined' && process.versions?.node;

async function createSqlConfig() {
  if (isNode) {
    const path = await import('path');
    const url = await import('url');

    const baseDir = path.dirname(url.fileURLToPath(import.meta.url));
    return {
      locateFile: (file) => path.resolve(baseDir, '../../../node_modules/sql.js/dist/', file),
    };
  } else {
    return {
      locateFile: (file) => `./dist/${file}`,
    };
  }
}

export async function initialiseDB() {
  let initSqlJsFunc;

  if (isNode) {
    
    initSqlJsFunc = await import('sql.js/dist/sql-wasm.js').then(m => m.default);
  } else {
    
    if (!isNode) {
        if (!window.initSqlJs) throw new Error("sql.js not loaded in browser");
        initSqlJsFunc = window.initSqlJs;
    }
  }

  const SQL = await initSqlJsFunc(await createSqlConfig());
  db = new SQL.Database(); 
}

// ---------------- Run any SQL query ----------------
// Execute arbitrary SQL query and return results or error

export async function runQuery(query) {
    if (!db) throw new Error("DB not initialised");

    try {
        const stmt = db.prepare(query);
        const rows = [];
        while (stmt.step()) {
            rows.push(stmt.getAsObject());
        }
        stmt.free();
        return { success: true, rows };
    } catch (err) {
        console.error("Error running query: ", err);
        return { success: false, error: err.message };
    }
}

// ---------------- Helper: Create table ----------------
// Generates table schema based on fields and their types using typeMap, and creates table

function createTable(tableName, fields, typeMap) {
    const columns = ['id INTEGER PRIMARY KEY AUTOINCREMENT'];

    for (const field of fields) {
        if (field === 'id') continue;
        let type = typeMap[field];
        if (type === 'BOOLEAN') type = 'INTEGER';
        columns.push(`${field} ${type}`);
    }

    db.run(`DROP TABLE IF EXISTS ${tableName};`);
    db.run(`CREATE TABLE ${tableName} (${columns.join(", ")});`);
}

// ---------------- Helper: Insert Rows ----------------
// Insert rows into a table with type conversion

function insertRows(tableName, fields, rows, typeMap) {
    const keys = fields.filter(field => field !== 'id');
    const placeholders = keys.map(_ => '?').join(',');

    for (const row of rows) {
        const values = keys.map(key => {
            const val = row[key];
            if (val === undefined || val === null) return null;
            switch (typeMap[key]) {
                case 'BOOLEAN': return val ? 1 : 0;
                case 'INTEGER':
                case 'REAL': return Number(val);
                default: return String(val);
            }
        });
        db.run(`INSERT INTO ${tableName} (${keys.join(",")}) VALUES (${placeholders});`, values);
    }
}

// ---------------- Fetch module rows ----------------
// Returns all rows from a table and converts field types 

async function fetchModuleRowsFromDB(moduleName, typeMap) {
    const stmt = db.prepare(`SELECT * FROM ${moduleName};`);
    const rows = [];

    while (stmt.step()) {
        const row = stmt.getAsObject();

        Object.keys(row).forEach(key => {
            if (key === "id") {
                row[key] = Number(row[key]);
                return;
            }
            const type = typeMap?.[key] || 'TEXT';
            switch (type) {
                case 'BOOLEAN':
                    row[key] = row[key] === 1;
                    break;
                case 'INTEGER':
                case 'REAL':
                    row[key] = Number(row[key]);
                    break;
                default:
                    row[key] = row[key] === null ? null : String(row[key]);
            }
        });

        rows.push(row);
    }

    stmt.free();
    return rows;
}

// ---------------- Load Mission ----------------
// Sets up database tables for mission modules, inserts rows, and returns an initialised mission object

export async function loadMission(mission) {
    if (!db) throw new Error("DB not initialised");

    try {
        const hasLoggingStage = mission.stages?.some(stage => stage.name === "Logging");

        // Create tables and inserts row data
        for (const module of mission.modules) {
            const isLogs = module.name === "Logs";

            // Add standard fields to all modules except Logs
            if (!isLogs) {
                if (!module.fields.includes('issue_detected')) {
                    module.fields.push('issue_detected');
                } 
                if (!module.fields.includes('repaired')) { 
                    module.fields.push('repaired');
                }
            }

            // Ensure typeMap is defined
            if (!module.typeMap) module.typeMap = {};
            for (const field of module.fields) {
                if (!module.typeMap[field]) {
                    const sampleValue = module.rows.find(row => row[field] !== undefined)?.[field];
                    if (typeof sampleValue === "boolean") {
                        module.typeMap[field] = "BOOLEAN";
                    } else if (typeof sampleValue === "number") {
                        module.typeMap[field] = "REAL";
                    } else {
                        module.typeMap[field] = "TEXT";
                    }
                }
            }

            createTable(module.name, module.fields, module.typeMap);
            insertRows(module.name, module.fields, module.rows, module.typeMap);
        }

        // Create Logs table if Logging stage exists
        if (hasLoggingStage && !mission.modules.some(module => module.name === "Logs")) {
            const sections = new Set();
            for (const module of mission.modules) {
                for (const row of module.rows) {
                    if (row.ship_section) sections.add(row.ship_section);
                }
            }

            const logRows = Array.from(sections).map(section => ({ ship_section: section, repairs: 0 }));

            const logsModule = {
                name: "Logs",
                fields: ["ship_section", "repairs"],
                typeMap: { ship_section: "TEXT", repairs: "INTEGER" },
                rows: logRows
            };

            createTable("Logs", logsModule.fields, logsModule.typeMap);
            insertRows("Logs", logsModule.fields, logsModule.rows, logsModule.typeMap);

            mission.modules.push(logsModule);
        }

        // ---------------- Prepare runtime mission ----------------
        // Populate mission modules with rows and standard flags for use at runtime

        const runtimeMission = JSON.parse(JSON.stringify(mission));
        for (const module of runtimeMission.modules) {
            const rows = await fetchModuleRowsFromDB(module.name, module.typeMap);
            module.rows = rows.map(row => ({
                ...row,
                // only non-logs modules get issue_detected
                ...(module.name !== "Logs" && { issue_detected: row.issue_detected ?? false }),
                ...(module.name !== "Logs" && { repaired: row.repaired ?? false })
            }));
        }

        return { success: true, mission: runtimeMission };
    } catch (err) {
        console.error("Error Loading mission: ", err);
        return { success: false, error: err.message };
    }
}