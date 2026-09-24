extends SceneTree

const RunState = preload("res://scripts/core/run_state.gd")

func _initialize() -> void:
	var run_state = RunState.new()
	run_state.reset_run()
	run_state.add_soul({
		"id": "soul_skeleton_archer",
		"name": "Skeleton Archer",
		"hp": 42,
		"soul_atk": 11,
		"skills": [{"id": "bone_arrow", "name": "Bone Arrow", "damage": 11, "target": "enemy_single"}],
	})
	run_state.add_soul({
		"id": "soul_shadow_wraith",
		"name": "Shadow Wraith",
		"hp": 46,
		"soul_atk": 12,
		"skills": [{"id": "wraith_touch", "name": "Wraith Touch", "damage": 12, "target": "enemy_single"}],
	})

	var battle_scene: PackedScene = load("res://scenes/Battle.tscn")
	var battle = battle_scene.instantiate()
	battle.run_state = run_state
	battle.encounter_id = "skeleton_patrol"
	root.add_child(battle)
	await process_frame

	assert(battle.ally_units.size() == 3)
	var hp_before := int(battle.enemies[0].hp)
	battle._end_player_turn()
	await process_frame
	assert(battle.turn_phase == "ally")
	assert(battle.current_ally_unit_index == 0)
	assert(battle.unit_card_grid.get_child_count() == 2)
	battle._play_unit_card(0)
	await process_frame
	assert(battle.current_ally_unit_index == 1)
	assert(int(battle.enemies[0].hp) < hp_before)
	battle._play_unit_card(0)
	await process_frame
	assert(battle.current_ally_unit_index == 2)
	battle._play_unit_card(0)
	await process_frame
	assert(battle.turn_phase == "hero")
	print("ALLY_TURN_OK")
	quit(0)
