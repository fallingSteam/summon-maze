extends Control

signal node_selected(node: Dictionary)

const DataLoader := preload("res://scripts/data/data_loader.gd")

var run_state: Node
var nodes := []

func _ready() -> void:
	nodes = DataLoader.load_json("res://data/map_nodes_chapter_1.json")
	if typeof(nodes) != TYPE_ARRAY:
		nodes = []
	run_state.max_nodes = nodes.size()
	_build()

func _build() -> void:
	var root := VBoxContainer.new()
	root.set_anchors_preset(Control.PRESET_FULL_RECT)
	root.offset_left = 48
	root.offset_top = 34
	root.offset_right = -48
	root.offset_bottom = -34
	root.add_theme_constant_override("separation", 16)
	add_child(root)

	var title := Label.new()
	title.text = "第一章：墓穴入口"
	title.add_theme_font_size_override("font_size", 32)
	root.add_child(title)

	var status := Label.new()
	status.text = _status_text()
	status.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	root.add_child(status)

	var equipment := Label.new()
	equipment.text = _equipment_text()
	equipment.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	root.add_child(equipment)

	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 10)
	root.add_child(row)

	for i in range(nodes.size()):
		var node: Dictionary = nodes[i]
		var button := Button.new()
		button.custom_minimum_size = Vector2(150, 96)
		button.text = "%d\n%s\n%s" % [i + 1, _type_name(String(node.type)), String(node.name)]
		if i < run_state.node_index:
			button.disabled = true
			button.text += "\n已完成"
		elif i > run_state.node_index:
			button.disabled = true
			button.text += "\n未抵达"
		else:
			button.tooltip_text = "进入节点"
			button.pressed.connect(func(n := node): node_selected.emit(n))
		row.add_child(button)

	var roster := Label.new()
	roster.text = _roster_text()
	roster.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	root.add_child(roster)

	var hint := Label.new()
	hint.text = "目标：在墓穴里叠魂印、提取亡灵、保护队伍，击败第 7 个节点的墓穴巫妖。"
	hint.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	root.add_child(hint)

func _status_text() -> String:
	return "节点 %d / %d    主人公 HP %d/%d    灵魂碎片 %d    出战亡灵 %d/3" % [
		run_state.node_index + 1,
		max(1, nodes.size()),
		int(run_state.hero.hp),
		int(run_state.hero.max_hp),
		int(run_state.hero.shards),
		run_state.active_souls.size(),
	]

func _equipment_text() -> String:
	var names := []
	for slot in ["weapon", "armor", "trinket"]:
		var item = run_state.equipment.get(slot)
		if item == null:
			names.append("%s：空" % _slot_name(slot))
		else:
			names.append("%s：%s" % [_slot_name(slot), String(item.name)])
	return "装备栏    " + "    ".join(names)

func _roster_text() -> String:
	if run_state.roster.is_empty():
		return "亡灵花名册：暂无亡灵"
	var parts := []
	for soul in run_state.roster:
		var active := "出战" if run_state.active_souls.has(soul) else "待命"
		parts.append("%s HP %d/%d [%s]" % [String(soul.name), int(soul.hp), int(soul.max_hp), active])
	return "亡灵花名册：" + "；".join(parts)

func _type_name(value: String) -> String:
	if value == "battle":
		return "普通战斗"
	if value == "elite":
		return "精英小boss"
	if value == "event":
		return "事件"
	if value == "rest":
		return "休息"
	if value == "boss":
		return "章节 Boss"
	return value

func _slot_name(slot: String) -> String:
	if slot == "weapon":
		return "武器"
	if slot == "armor":
		return "护甲"
	if slot == "trinket":
		return "饰品"
	return slot
