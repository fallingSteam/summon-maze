extends Node

const DataLoader := preload("res://scripts/data/data_loader.gd")
const Unit = preload("res://scripts/core/unit.gd")

const MAX_ACTIVE_UNITS := 3

var chapter := 1
var node_index := 0
var selected_node := {}
var max_nodes := 7
var battle_count := 0
var last_battle_won := false
var last_extracted_soul := {}
var last_reward := {}
var current_event_text := ""
var run_over := false
var victory := false

var hero := {}
var roster := []
var active_souls := []
var active_units: Array = []
var equipment := {
	"weapon": null,
	"armor": null,
	"trinket": null,
}

var rng := RandomNumberGenerator.new()

func _ready() -> void:
	rng.randomize()

func reset_run() -> void:
	chapter = 1
	node_index = 0
	selected_node = {}
	max_nodes = 7
	battle_count = 0
	last_battle_won = false
	last_extracted_soul = {}
	last_reward = {}
	current_event_text = ""
	run_over = false
	victory = false
	hero = {
		"name": "死灵召唤师",
		"hp": 86,
		"max_hp": 86,
		"energy": 3,
		"max_energy": 3,
		"block": 0,
		"attack_bonus": 0,
		"magic_bonus": 0,
		"extract_bonus": 0.0,
		"shards": 0,
	}
	roster = [
		{
			"id": "soul_skeleton_soldier",
			"name": "骷髅兵亡灵",
			"role": "tank",
			"hp": 58,
			"max_hp": 58,
			"soul_atk": 9,
			"skills": [{"id": "undead_slash", "name": "亡灵斩击", "damage": 9}],
		}
	]
	active_souls = [roster[0]]
	active_units = [_unit_from_soul(roster[0])]
	equipment = {
		"weapon": null,
		"armor": null,
		"trinket": null,
	}

func get_alive_active_souls() -> Array:
	var alive := []
	for soul in active_souls:
		if int(soul.get("hp", 0)) > 0:
			alive.append(soul)
	return alive

func get_alive_active_units() -> Array:
	var alive: Array = []
	for unit in active_units:
		if unit != null and unit.is_alive():
			alive.append(unit)
	return alive

func add_soul(soul: Dictionary) -> void:
	var new_soul := soul.duplicate(true)
	new_soul["max_hp"] = int(new_soul.get("hp", new_soul.get("max_hp", 1)))
	new_soul["hp"] = int(new_soul.get("max_hp", new_soul.get("hp", 1)))
	roster.append(new_soul)
	if active_souls.size() < MAX_ACTIVE_UNITS:
		active_souls.append(new_soul)
	if active_units.size() < MAX_ACTIVE_UNITS:
		active_units.append(_unit_from_soul(new_soul))

func remove_dead_souls() -> void:
	var living_roster := []
	for soul in roster:
		if int(soul.get("hp", 0)) > 0:
			living_roster.append(soul)
	roster = living_roster
	var living_active := []
	for soul in active_souls:
		if int(soul.get("hp", 0)) > 0 and roster.has(soul):
			living_active.append(soul)
	active_souls = living_active
	var living_units: Array = []
	for unit in active_units:
		if unit != null and unit.is_alive():
			living_units.append(unit)
	active_units = living_units

func set_active_soul(soul_id: String, enabled: bool) -> void:
	var soul := _find_roster_soul(soul_id)
	if soul.is_empty():
		return
	if enabled:
		if active_souls.size() < MAX_ACTIVE_UNITS and not active_souls.has(soul):
			active_souls.append(soul)
			if not _has_active_unit(soul.id):
				active_units.append(_unit_from_soul(soul))
	else:
		active_souls.erase(soul)
		_remove_active_unit(String(soul.get("id", "")))

func _unit_from_soul(soul: Dictionary):
	var data := soul.duplicate(true)
	data["faction"] = Unit.FACTION_ALLY
	data["unit_attack"] = int(data.get("soul_atk", data.get("atk", 1)))
	data["unit_defense"] = int(data.get("unit_defense", 5))
	return Unit.new_from_dict(data)

func _has_active_unit(unit_id: String) -> bool:
	for unit in active_units:
		if unit != null and unit.id == unit_id:
			return true
	return false

func _remove_active_unit(unit_id: String) -> void:
	for index in range(active_units.size() - 1, -1, -1):
		if active_units[index] != null and active_units[index].id == unit_id:
			active_units.remove_at(index)

func _find_roster_soul(soul_id: String) -> Dictionary:
	for soul in roster:
		if String(soul.get("id", "")) == soul_id:
			return soul
	return {}

func add_reward_after_battle(is_elite: bool, is_boss: bool) -> void:
	battle_count += 1
	var shard_gain := 4
	if is_elite:
		shard_gain += 3
	if is_boss:
		shard_gain += 5
	hero["shards"] = int(hero.get("shards", 0)) + shard_gain
	last_reward = {
		"shards": shard_gain,
		"stat_options": _make_stat_options(),
		"equipment": _roll_equipment(is_elite or is_boss),
	}

func apply_stat_reward(reward_id: String) -> void:
	if reward_id == "max_hp":
		hero["max_hp"] = int(hero.max_hp) + 8
		hero["hp"] = min(int(hero.hp) + 8, int(hero.max_hp))
	elif reward_id == "energy":
		hero["max_energy"] = min(int(hero.max_energy) + 1, 5)
	elif reward_id == "attack":
		hero["attack_bonus"] = int(hero.attack_bonus) + 2
	elif reward_id == "extract":
		hero["extract_bonus"] = float(hero.extract_bonus) + 0.05

func equip_item(item: Dictionary) -> void:
	if item.is_empty():
		return
	var slot := String(item.get("slot", ""))
	if not equipment.has(slot):
		return
	equipment[slot] = item
	_recalculate_equipment_stats()

func rest_party() -> void:
	hero["hp"] = min(int(hero.hp) + 24, int(hero.max_hp))
	for soul in roster:
		soul["hp"] = min(int(soul.get("hp", 0)) + 16, int(soul.get("max_hp", soul.get("hp", 0))))

func resolve_event(node: Dictionary) -> void:
	var event_name := String(node.get("name", "无名墓室"))
	var roll := rng.randi_range(0, 2)
	if roll == 0:
		hero["shards"] = int(hero.shards) + 5
		current_event_text = "%s：你从破碎魂瓮里收集到 5 个灵魂碎片。" % event_name
	elif roll == 1:
		hero["extract_bonus"] = float(hero.extract_bonus) + 0.05
		current_event_text = "%s：残缺铭文让本局提取成功率 +5%。" % event_name
	else:
		var loss := 7
		hero["hp"] = max(1, int(hero.hp) - loss)
		hero["shards"] = int(hero.shards) + 8
		current_event_text = "%s：你献出 %d 点生命，换来 8 个灵魂碎片。" % [event_name, loss]

func can_continue() -> bool:
	return int(hero.get("hp", 0)) > 0 and not run_over

func _make_stat_options() -> Array:
	return [
		{"id": "max_hp", "name": "血肉缝合", "text": "主人公最大生命 +8，并回复 8。"},
		{"id": "attack", "name": "骨刃打磨", "text": "物理仪式牌伤害 +2。"},
		{"id": "extract", "name": "魂瓶校准", "text": "本局提取成功率 +5%。"},
	]

func _roll_equipment(force_drop: bool) -> Dictionary:
	var drop_chance := 0.65
	if force_drop:
		drop_chance = 0.95
	if rng.randf() > drop_chance:
		return {}
	var items: Variant = DataLoader.load_json("res://data/equipment.json")
	if typeof(items) != TYPE_ARRAY or items.is_empty():
		return {}
	return items[rng.randi_range(0, items.size() - 1)]

func _recalculate_equipment_stats() -> void:
	var base_max_hp := 86
	var bonus_max_hp := 0
	var attack_bonus := 0
	var magic_bonus := 0
	var extract_bonus := 0.0
	for item in equipment.values():
		if item == null:
			continue
		var stats: Dictionary = item.get("stats", {})
		bonus_max_hp += int(stats.get("max_hp", 0))
		attack_bonus += int(stats.get("attack_bonus", 0))
		magic_bonus += int(stats.get("magic_bonus", 0))
		extract_bonus += float(stats.get("extract_bonus", 0.0))
	hero["max_hp"] = max(int(hero.get("max_hp", base_max_hp)), base_max_hp + bonus_max_hp)
	hero["hp"] = min(int(hero.hp), int(hero.max_hp))
	hero["attack_bonus"] = max(int(hero.get("attack_bonus", 0)), attack_bonus)
	hero["magic_bonus"] = max(int(hero.get("magic_bonus", 0)), magic_bonus)
	hero["extract_bonus"] = max(float(hero.get("extract_bonus", 0.0)), extract_bonus)
