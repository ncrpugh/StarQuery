// ---------------- Rulebook Panel ----------------
// Handles rulebook sections, content, and navigation

export class RulebookPanel {
    constructor(rulebook) {
        this.rulebook = rulebook;

        this.contentsEl = document.getElementById("section-list");
        this.sectionPagesEl = document.getElementById("section-pages");
        this.backBtn = document.getElementById("back-to-contents");
        this.rightPage = this.sectionPagesEl.parentElement; 

        this.init();
    }

    // ---------------- Initialise ----------------
    // Build contents list and bind events
    init() {
        const sections = [
            { id: "protocols", title: "Protocols", content: this.protocolsContent() },
            { id: "commands", title: "Commands", content: this.commandsContent() },
            { id: "modules", title: "Modules", content: this.modulesContent() },
            { id: "faults", title: "Fault Ranges", content: this.faultRangesContent() },
            { id: "dependencies", title: "Dependencies", content: this.dependenciesContent() },
            { id: "rules", title: "Rules", content: this.rulesContent() }
        ];

        sections.forEach(sec => {
            const li = document.createElement("li");
            li.innerText = sec.title;
            li.addEventListener("click", () => this.showSection(sec));
            this.contentsEl.appendChild(li);
        });

        this.backBtn.addEventListener("click", () => this.showContents());
    }

    // ---------------- Section Navigation ----------------
    // Show a specific section
    showSection(section) {
        
        this.rightPage.classList.remove("centered");
        document.getElementById("rulebook-contents").classList.add("hidden");
        this.sectionPagesEl.classList.remove("hidden");

        this.sectionPagesEl.innerHTML = section.content;
    }

    // Show the main contents view
    showContents() {
        this.rightPage.classList.add("centered");
        document.getElementById("rulebook-contents").classList.remove("hidden");
        this.sectionPagesEl.classList.add("hidden");
    }

    // ---------------- Section Content ----------------
    // Content for corresponding section
    
    commandsContent() {
        return `
            <h3>Commands</h3>

            <p>Use these SQL commands to interact with the ship's systems. <span class="command">SELECT</span> retrieves data, and <span class="command">UPDATE</span> is used to repair components.</p>

            <h4>SELECT</h4>
            <p><strong>Purpose:</strong> Check the status of modules.</p>
            <pre class="command">SELECT &lt;field_name&gt; FROM &lt;module_name&gt;;</pre>
            <p>Example:</p>
            <pre class="command">SELECT temperature, fuel_level FROM Engine;</pre>

            <p><strong>Filtering:</strong> Use <code>WHERE</code> to specify conditions:</p>
            <pre class="command">SELECT temperature FROM Reactor WHERE voltage &gt; 100;</pre>

            <p><strong>Combine conditions:</strong> Use <code>AND</code> / <code>OR</code>:</p>
            <pre class="command">
SELECT temperature, voltage
FROM Reactor
WHERE voltage &gt; 100 AND temperature &gt; 75;
            </pre>

            <p><strong>Aggregate data:</strong> Use <code>GROUP BY</code> and <code>SUM</code> for totals:</p>
            <pre class="command">
SELECT module_id, SUM(repaired)
FROM Engine
GROUP BY module_id;
            </pre>

            <h4>UPDATE</h4>
            <p><strong>Purpose:</strong> Repair components by updating their values.</p>
            <pre class="command">UPDATE &lt;module_name&gt; SET &lt;field_name&gt; = &lt;new_value&gt; WHERE &lt;condition&gt;;</pre>
            <p>Example:</p>
            <pre class="command">UPDATE Engine SET temperature = 70 WHERE id = 3;</pre>

            <h4>Player Tip</h4>
            <p>Always double-check your conditions. Incorrect updates can make issues worse, but correct usage will help complete the Identify → Repair → Logging cycle efficiently.</p>

            <style>
                .command {
                    color: #00ff00;
                    font-family: monospace;
                    font-weight: bold;
                }
                pre.command {
                    background: #111;
                    padding: 8px;
                    border-radius: 4px;
                    overflow-x: auto;
                }
            </style>
        `;
    }

    protocolsContent() {
        return `
            <h3>Guidelines</h3>

            <p>Follow the three stages to keep the ship running:</p>

            <ol>
                <li><strong>Identify</strong> — Look for any faults in the modules. Use <span class="command">SELECT</span> to inspect specific fields. Example:
                    <pre class="command">SELECT * FROM Airlock WHERE pressure &gt; 60;</pre>
                </li>
                <li><strong>Repair</strong> — Fix any problems you found using <span class="command">UPDATE</span>. Example:
                    <pre class="command">UPDATE Airlock SET pressure = 25 WHERE pressure &gt; 60;</pre>
                </li>
                <li><strong>Logging</strong> — Record the repairs and summarise their impact:
                    <pre class="command">
SELECT
    ship_section,
    SUM(severity * severity_modifier) AS repairs
FROM Airlock
WHERE repaired = 1
GROUP BY ship_section;

UPDATE logs SET repairs = &lt;repairs&gt; WHERE ship_section = 'front';
                    </pre>
                </li>
            </ol>
        `;
    }

    rulesContent() {
        return `
            <h3>Rules</h3>

            <p>Follow these rules to avoid cascading problems:</p>

            <h4>Critical Repair Order</h4>
            <p>Always repair the highest-impact faults first. Ignoring them can trigger new faults elsewhere. Impact is defined by severity * severity_modifier</p>

            <h4>Cascading Faults</h4>
            <p>Some modules and fields rely on others. See Dependencies page in rulebook for details. Repair them in the correct order to prevent chain reactions:</p>
            <ul>
                <li>Example: Reactor → Engine, Airlock, Spectral_Scanner</li>
                <li>Fields: Engine.temperature → Engine.fuel_level → Engine.thrust</li>
            </ul>
        `;
    }

    modulesContent() {
        return `
            <h3>Modules</h3>
            <p>These are the main modules you can inspect and repair:</p>
            <ul>
                ${Object.entries(this.rulebook.modules.items)
                    .map(([name, mod]) => `
                        <li>
                            <strong>${name}</strong>: ${mod.fields.join(", ")}
                        </li>
                    `).join("")}
            </ul>
        `;
    }

    faultRangesContent() {
        return `
            <h3>Fault Ranges</h3>
            <p>Each field has a safe range. Values outside these are faults:</p>

            <table class="fault-table">
                <thead>
                    <tr><th>Field</th><th>Min</th><th>Max</th></tr>
                </thead>
                <tbody>
                    ${Object.entries(this.rulebook.faultRanges.items)
                        .map(([field, range]) => `
                            <tr>
                                <td>${field}</td>
                                <td>${range.min}</td>
                                <td>${range.max}</td>
                            </tr>
                        `).join("")}
                </tbody>
            </table>

            <style>
                .fault-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 10px;
                }
                .fault-table th, .fault-table td {
                    border: 1px solid #ccc;
                    padding: 6px 12px;
                    text-align: center;
                    background: inherit; 
                    color: inherit;        
                }
                .fault-table th {
                    font-weight: bold;
                }
            </style>
        `;
    }

    dependenciesContent() {
        const moduleDeps = this.rulebook.dependencies.modules;
        const fieldDeps = this.rulebook.dependencies.fields;

        return `
            <h3>Dependencies</h3>
            <p>Some modules and fields affect others. Fix them in order to avoid new faults:</p>

            <h4>Module Dependencies</h4>
            <ul>
                ${Object.entries(moduleDeps)
                    .map(([mod, deps]) => `
                        <li><strong>${mod}</strong> ${deps.length ? `→ ${deps.join(", ")}` : "(independent)"}</li>
                    `).join("")}
            </ul>

            <h4>Field Dependencies</h4>
            <ul>
                ${Object.entries(fieldDeps)
                    .map(([mod, fields]) => `
                        <li>
                            <strong>${mod}</strong>
                            <ul>
                                ${Object.entries(fields)
                                    .map(([field, deps]) => `
                                        <li>${field} ${deps.length ? `→ ${deps.join(", ")}` : "(independent)"}</li>
                                    `).join("")}
                            </ul>
                        </li>
                    `).join("")}
            </ul>
        `;
    }
}