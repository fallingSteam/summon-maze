# Unit Turn Architecture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Introduce a shared Unit model, per-unit attack/defense cards, a three-unit active cap, and deterministic extra-turn scheduling.

**Architecture:** Core scripts remain UI-independent. `RunState` owns the active roster, while `TurnScheduler` emits action order and the battle controller adapts legacy dictionaries into units during this migration.

**Tech Stack:** Godot 4.6 GDScript, JSON content data, headless smoke tests.

**Spec:** `docs/superpowers/specs/2026-09-22-unit-turn-architecture-design.md`

## Global Constraints

- Preserve existing `active_souls` compatibility while adding `active_units`.
- Never activate more than 3 allied units.
- Execute turns in the order hero, living allies, living enemies.
- Unit cards must include attack and defense defaults.

---

### Task 1: Add Unit and UnitCard core models

**Files:**
- Create: `godot/scripts/core/unit_card.gd`
- Create: `godot/scripts/core/unit.gd`
- Test: `godot/scripts/tests/unit_test.gd`

- [x] Write tests for default attack/defense cards and faction/living state.
- [x] Run the test and confirm it fails because the scripts do not exist. Initial run was blocked by the missing PATH entry; the failure was later confirmed through Godot compile errors.
- [x] Implement typed model scripts with dictionary serialization and card factory helpers.
- [x] Run the unit test and confirm it passes with Godot 4.6.3 (`UNIT_TEST_OK`).

### Task 2: Add active-unit roster and cap to RunState

**Files:**
- Modify: `godot/scripts/core/run_state.gd`
- Modify: `godot/scripts/tests/unit_test.gd`

- [x] Add `active_units`, `MAX_ACTIVE_UNITS`, and conversion helpers.
- [x] Make `add_soul` register a corresponding ally unit without breaking `active_souls`.
- [x] Enforce the cap when activating units and test the fourth-unit behavior.
- [x] Run the focused test and then the existing smoke test with Godot 4.6.3 (`UNIT_TEST_OK`, `SMOKE_OK`).

### Task 3: Add deterministic turn scheduler

**Files:**
- Create: `godot/scripts/core/turn_scheduler.gd`
- Modify: `godot/scripts/tests/unit_test.gd`

- [x] Write an order test with hero, two allies, and two enemies, including one dead unit.
- [x] Confirm the test fails before implementation. Initial run was blocked by the missing PATH entry; the failure was later confirmed through Godot compile errors.
- [x] Implement `build_round_order()` and `next_unit()` without UI or combat side effects.
- [x] Run focused and smoke tests with Godot 4.6.3 (`UNIT_TEST_OK`, `SMOKE_OK`).

### Task 4: Adapt BattleController to the shared model

**Files:**
- Modify: `godot/scripts/ui/battle_controller.gd`
- Modify: `godot/scripts/tests/smoke_test.gd`

- [x] Initialize ally and enemy `Unit` objects from existing dictionaries.
- [x] Render active ally units from `RunState.active_units` while keeping soul fallback.
- [x] Replace the direct soul-turn entry point with scheduler-driven ally turns, preserving current skill execution as the first adapter.
- [x] Run Godot headless smoke test and verify the existing battle scene still loads (`SMOKE_OK`).
