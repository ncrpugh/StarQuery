# StarQuery

StarQuery is an educational browser-based game that teaches SQL through spaceship maintenance and problem solving. Players use SQL queries to identify faults, repair ship systems, and record the impact of their repairs.

[Play StarQuery](https://devweb2025.cis.strath.ac.uk/~yfb21159/CS408Project/)

## Overview

StarQuery is an educational simulation game designed to help players develop practical SQL skills through an interactive problem-solving environment.

Players take the role of a crew officer responsible for maintaining a spaceship. Each mission presents the player with faults in the ship's systems, which they must investigate and resolve using SQL queries. Rather than requiring a specific query, the game evaluates the changes made to the underlying database state, allowing different valid approaches to solving a problem.

Missions are divided into three stages:

Identify — use SELECT queries to investigate the ship and identify faulty data.
Repair — use UPDATE queries to repair the identified faults.
Logging — record the impact of the repairs in the ship's logs.

Missions can be procedurally generated and can include additional rules that introduce dependencies and consequences between repairs.

## How It Works

Each mission is split into three stages, with the player using SQL to investigate and maintain the ship.

1. Identify

Players inspect the ship's modules and use SELECT queries to identify faulty fields and rows.

The Rulebook provides information about valid operating ranges, allowing players to reason about which values represent faults.

2. Repair

Once faults have been identified, players use UPDATE queries to repair the affected systems.

Repairs are evaluated based on the resulting database state rather than requiring one specific SQL query. This allows players to solve problems using different valid approaches.

Additional rules such as Critical Repair Order and Cascading Faults can introduce dependencies between repairs, creating consequences when faults are repaired incorrectly.

3. Logging

After repairs are complete, players use SQL to record their impact in the ship's logs.

The impact of repairs is calculated from the severity of the repaired faults and used to update the relevant ship sections.

## Technical Highlights

Rulebook-driven architecture
A central Rulebook acts as the source of truth for the game's modules, valid operating ranges, dependencies and gameplay rules. The same definitions are consumed by mission generation, fault detection, repair validation, cascading faults, repair-order rules and contextual hints, keeping the behaviour of the different systems consistent.

State-based SQL evaluation
Rather than requiring players to produce one predetermined SQL query, StarQuery evaluates the effect of their commands. The system captures the database state before a mutation, executes the player's SQL, then compares the resulting state against the previous state. The Repair Reconciler uses these changes together with the Rulebook to determine which faults were repaired, which fields were incorrectly modified and what gameplay consequences should occur.

Procedural mission generation
Missions are constructed dynamically from the player's progression, available ship modules and difficulty. Valid rows and fault values are generated from the Rulebook, while fault density and ambiguity are adjusted as difficulty increases, allowing the game to produce varied missions without relying entirely on predefined scenarios.

Rule-based fault escalation
Repairs can have consequences beyond simply changing a value. Dependency relationships and special rules such as Critical Repair Order and Cascading Faults can cause additional faults to appear when the player violates the system's constraints.

Client-side SQL execution
SQL.js/WebAssembly provides an in-browser SQLite database, allowing player queries to execute immediately without requiring a backend database or server-side query processing.

## Architecture

StarQuery is organised as a set of modular components responsible for different parts of the game. The main systems communicate through defined responsibilities, while the Rulebook provides shared definitions and rules used throughout the application.

![StarQuery Architecture](docs/images/architecture.png)

Reconstructing the Project

To run the project from a fresh environment:

1. Ensure Python 3 and Node.js are installed: Node is not needed if you are just using the application, it is only needed when attempting to run the tests

2. Install dependencies for testing:
   npm install
3. Ensure the dist/ folder contains:
   - sql-wasm.js
   - sql-wasm.wasm
4. Run the game:
   python -m http.server 8000


Running the game
The game is hosted on devweb, follow the link to open: https://devweb2025.cis.strath.ac.uk/~yfb21159/CS408Project/ 

Further instructions details how to run the code locally

1. Open a terminal and navigate to the project root (where index.html is located)
2. Start a simple local server using Python: 
    python -m http.server 8000

3. Open your browser and go to:
    http://localhost:8000/

4. The game should load and be playable in your browser


Running the Tests
1. Open a terminal in the project root
2. Install required Node packages (only needed for running tests):
    npm install 

3. Run the automated tests: 
    npm test


## How the Game Works
In StarQuery, players act as a crew officer maintaining a spaceship by interacting with ship systems using SQL commands. 

We recommend starting with the tutorial: Click Start Tutorial to begin
Follow the tutorial text to complete each stage.

Start Campaign button starts a series of 10 increasingly difficult procedurally generated missions

Start Campaign (<rule>) does the same but with the rule active

Other buttons should be self-explanatory

To apply settings save must be clicked

Gameplay is split into three stages for each mission:

1. Identify Stage 
- Inspect modules and their fields issues using SELECT queries.
- Use the Rulebook -> Fault Ranges page to see what values are considered faulty. 
- Click the Identify Faults button to confirm your query.

## Efficiency penalties
- +1 for each row returned that is not faulty or already identified
- +1 for each extra field in the WHERE clause compared to newly identified faults 

## Example 

SELECT * FROM Airlock 
WHERE pressure < 50 OR pressure > 50 OR temperature < 50 OR temperature > 50;

- Returns 5 rows, only 1 is faulty -> 4 penalties for extra rows
- WHERE has 4 fields vs 1 new fault -> 3 penalties for excess WHERE clauses
- Total penalty: (4 + 3) * 5 = 35 -> efficiency reduced to 65

- Note: Clicking Identify Faults again without changing the query reruns the previous query and this time applies 5 penalties for extra rows and 4 for excess WHERE clauses since the faulty row is already identified.

This stage continues until all faults in the database are identified

2. Repair Stage 
- Repair detected faults using UPDATE commands.
- Refer to the Rulebook -> Fault Ranges page to find safe values. 

## Efficiency penalties
- +1 for each field updated that was not faulty
- +1 for each field updated that is still faulty after update
- Additional faults can spawn if Critical Repair Order or Cascading Faults rules are violated (+10 penalty per spawned fault)

## Example

UPDATE Airlock SET pressure = 400, temperature = 400;

- Updates 2 fields in 4 rows -> 8 penalties if values as 400 is faulty value
- Efficiency reduced by 8 * 5 = 40

Spawning an additional fault happens when you play with the additional rules (Critical Repair Order & Cascading Faults) see the Rulebook's Rules page for more info. If these rules are active and you do not follow them a new fault will be spawned for each row correctly repaired when violating the correct repair order. 

This stage continues until all faults are repaired.


3. Logging stage
- Record the impact of all repairs into the Logs table.
- Impact is calculated as: severity of fault * severity_modifier
- Sum the impact of all repaired rows in each ship section.

## Example

SELECT
    ship_section,
    SUM(severity * severity_modifier) AS repairs
FROM Airlock
WHERE repaired = 1
GROUP BY ship_section;

UPDATE Logs SET repairs = <repairs> 
WHERE ship_section = 'front'

This stage continues until all Logs reflect the repairs made.

## Tip
If you get stuck at any stage:
- Use the Tutorial
- Consult the Rulebook
- Click the Hint button for guidance


## Maintenance Guide

Project Structure
The project is organised into modular components:

index.html – Entry point for the application
src/script.js – Initialises the game
core/ – Core game logic (Managers / controllers, campaign, missions, player systems)
ui/ – UI components (Main Menu, Modals, Rulebook, Tutorial, etc.)
api/sql.js – Handles SQL.js database initialisation and queries
missions/ – Mission data and mission-related logic
dist/ – Contains SQL.js (sql-wasm.js, sql-wasm.wasm) required for database functionality

## Key Components

GameManager

Central controller for the application
Handles game lifecycle (start, mission transitions), UI coordination, and campaign progression
Most high-level changes should go through this class

MissionManager

Controls current mission state and stage progression (Identify -> Repair -> Logging)
Interacts with the query engine and rulebook
Responsible for updating and rendering mission state

QueryEngine

Executes SQL commands using SQL.js
Handles SELECT (data inspection) and UPDATE (repairs)
Integrates with repair systems such as RepairReconciler and RepairEfficiencyTracker

UI System

Each UI element is implemented as its own class (e.g. MainMenu, VictoryModal)
UI updates are triggered via GameManager, MissionManager or Display
Visibility is controlled using the "hidden" CSS class

Database (SQL.js)

Uses SQL.js (WebAssembly) for an in-browser database
Requires the following files in the dist/ folder:
sql-wasm.js
sql-wasm.wasm

These files must be included or the game will not function correctly

## Adding New Features

Adding a New Mission

Create a new mission JSON file in the missions/ folder
Follow the existing mission structure (modules, fields, fault ranges)
Load the mission using the existing loadMission system

Adding a New Rule

Extend the rulebook data structure
Add logic in MissionManager or QueryEngine depending on behaviour
Update the Rulebook UI if needed

Adding UI Elements

Create a new UI class similar to existing components
Attach it to GameManager
Control visibility using the "hidden" class

Running and Testing Changes

To run the game locally:
python -m http.server 8000

To run tests:
npm install
npm test

Tests use Jest and cover query execution, repair logic, and efficiency tracking

## Common Issues

Game not loading

Ensure the Python server is running (do not open index.html directly)

Database errors

Ensure sql-wasm.js and sql-wasm.wasm are present in the dist/ folder

Tests not running

Run npm install to install dependencies

UI not updating correctly

Check usage of the "hidden" class and any z-index conflicts

## Notes for Developers

Code is written using modular ES6 JavaScript
Avoid modifying multiple systems at once, as this can introduce bugs
Prefer extending existing managers rather than duplicating logic
