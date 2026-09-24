extends SceneTree

func _initialize() -> void:
	var data_loader := load("res://scripts/data/data_loader.gd")
	var cards = data_loader.load_json("res://data/cards.json")
	var enemies = data_loader.load_json("res://data/enemies_chapter_1.json")
	var souls = data_loader.load_json("res://data/souls_chapter_1.json")
	var equipment = data_loader.load_json("res://data/equipment.json")
	var nodes = data_loader.load_json("res://data/map_nodes_chapter_1.json")
	assert(typeof(cards) == TYPE_ARRAY and cards.size() == 10)
	assert(typeof(enemies) == TYPE_DICTIONARY and enemies.has("encounters"))
	assert(typeof(souls) == TYPE_ARRAY and souls.size() >= 6)
	assert(typeof(equipment) == TYPE_ARRAY and equipment.size() == 6)
	assert(typeof(nodes) == TYPE_ARRAY and nodes.size() == 7)

	var main_scene: PackedScene = load("res://scenes/Main.tscn")
	var main := main_scene.instantiate()
	root.add_child(main)
	await process_frame
	assert(main.run_state != null)
	main.run_state.reset_run()
	assert(int(main.run_state.hero.hp) > 0)
	assert(main.run_state.active_units.size() <= 3)
	assert(main.run_state.active_units[0].cards.size() == 2)
	main._start_run()
	await process_frame
	assert(main.current_screen != null)
	assert(main.run_state.node_index == 0)

	var battle_scene: PackedScene = load("res://scenes/Battle.tscn")
	var battle := battle_scene.instantiate()
	battle.run_state = main.run_state
	battle.encounter_id = "skeleton_patrol"
	root.add_child(battle)
	await process_frame
	assert(battle.enemies.size() == 2)
	assert(battle.enemy_units.size() == 2)
	assert(battle.ally_units.size() <= 3)
	assert(battle.hand.size() == 5)
	assert(battle.find_child("BattleViewport", true, false) != null)
	assert(battle.find_child("HeroPortrait", true, false) != null)
	assert(battle.find_child("EnemyStage", true, false) != null)
	assert(battle.find_child("CardHand", true, false) != null)
	for i in range(battle.hand.size()):
		if int(battle.hand[i].get("cost", 0)) <= int(battle.run_state.hero.energy):
			battle._play_card(i)
			break
	await process_frame
	battle._end_player_turn()
	await process_frame

	var prep_scene: PackedScene = load("res://scenes/Prep.tscn")
	main.run_state.last_reward = {
		"shards": 4,
		"stat_options": [
			{"id": "max_hp", "name": "血肉缝合", "text": "主人公最大生命 +8，并回复 8。"}
		],
		"equipment": {}
	}
	var prep := prep_scene.instantiate()
	prep.run_state = main.run_state
	root.add_child(prep)
	await process_frame
	assert(prep.roster_box != null)

	var result_scene: PackedScene = load("res://scenes/Result.tscn")
	var result := result_scene.instantiate()
	result.run_state = main.run_state
	root.add_child(result)
	await process_frame
	print("SMOKE_OK")
	quit(0)
