extends Control

const RunStateScript := preload("res://scripts/core/run_state.gd")
const MapScene := preload("res://scenes/Map.tscn")
const BattleScene := preload("res://scenes/Battle.tscn")
const PrepScene := preload("res://scenes/Prep.tscn")
const ResultScene := preload("res://scenes/Result.tscn")

var run_state: Node
var current_screen: Control

func _ready() -> void:
	run_state = RunStateScript.new()
	add_child(run_state)
	show_title()

func show_title() -> void:
	_clear_screen()
	var root := _make_panel()
	var title := Label.new()
	title.text = "Summon Maze"
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	title.add_theme_font_size_override("font_size", 42)
	root.add_child(title)

	var subtitle := Label.new()
	subtitle.text = "Godot 4.x 原型 - 第一章：墓穴入口"
	subtitle.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	root.add_child(subtitle)

	var start_button := Button.new()
	start_button.text = "开始新局"
	start_button.pressed.connect(_start_run)
	root.add_child(start_button)

	var note := Label.new()
	note.text = "主人公使用死灵仪式牌叠魂印，亡灵队友独立行动。亡灵死亡永久消失。"
	note.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	note.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	root.add_child(note)
	current_screen = root
	add_child(root)

func _start_run() -> void:
	run_state.reset_run()
	show_map()

func show_map() -> void:
	if not run_state.can_continue():
		show_result()
		return
	_clear_screen()
	var map := MapScene.instantiate()
	map.run_state = run_state
	map.node_selected.connect(_on_node_selected)
	current_screen = map
	add_child(map)

func show_battle(encounter_id: String = "skeleton_patrol") -> void:
	_clear_screen()
	var battle := BattleScene.instantiate()
	battle.run_state = run_state
	battle.encounter_id = encounter_id
	battle.battle_finished.connect(_on_battle_finished)
	current_screen = battle
	add_child(battle)

func show_prep() -> void:
	if run_state.run_over:
		show_result()
		return
	_clear_screen()
	var prep := PrepScene.instantiate()
	prep.run_state = run_state
	prep.prep_finished.connect(_on_prep_finished)
	current_screen = prep
	add_child(prep)

func show_result() -> void:
	_clear_screen()
	var result := ResultScene.instantiate()
	result.run_state = run_state
	result.restart_requested.connect(_start_run)
	current_screen = result
	add_child(result)

func _on_node_selected(node: Dictionary) -> void:
	run_state.selected_node = node
	var node_type := String(node.get("type", "battle"))
	if node_type == "battle" or node_type == "elite" or node_type == "boss":
		show_battle(String(node.get("encounter", "skeleton_patrol")))
	elif node_type == "event":
		run_state.resolve_event(node)
		show_prep()
	elif node_type == "rest":
		run_state.rest_party()
		run_state.current_event_text = "%s：队伍在冷灰祭坛旁短暂休整，主人公和亡灵回复生命。" % String(node.get("name", "休息点"))
		show_prep()

func _on_battle_finished(won: bool) -> void:
	run_state.last_battle_won = won
	if not won:
		run_state.run_over = true
		run_state.victory = false
		show_result()
		return
	var node_type := String(run_state.selected_node.get("type", "battle"))
	run_state.add_reward_after_battle(node_type == "elite", node_type == "boss")
	if node_type == "boss":
		run_state.run_over = true
		run_state.victory = true
		show_result()
	else:
		show_prep()

func _on_prep_finished() -> void:
	run_state.node_index += 1
	if run_state.node_index >= run_state.max_nodes:
		run_state.run_over = true
		run_state.victory = true
		show_result()
	else:
		show_map()

func _clear_screen() -> void:
	if current_screen and is_instance_valid(current_screen):
		current_screen.queue_free()
	current_screen = null

func _make_panel() -> VBoxContainer:
	var root := VBoxContainer.new()
	root.set_anchors_preset(Control.PRESET_CENTER)
	root.custom_minimum_size = Vector2(620, 280)
	root.alignment = BoxContainer.ALIGNMENT_CENTER
	root.add_theme_constant_override("separation", 16)
	return root
