extends Control

signal restart_requested

var run_state: Node

func _ready() -> void:
	_build()

func _build() -> void:
	var root := VBoxContainer.new()
	root.set_anchors_preset(Control.PRESET_CENTER)
	root.custom_minimum_size = Vector2(620, 360)
	root.alignment = BoxContainer.ALIGNMENT_CENTER
	root.add_theme_constant_override("separation", 14)
	add_child(root)

	var title := Label.new()
	title.text = "墓穴已被肃清" if run_state.victory else "探索失败"
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	title.add_theme_font_size_override("font_size", 34)
	root.add_child(title)

	var summary := Label.new()
	summary.text = _summary_text()
	summary.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	summary.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	root.add_child(summary)

	var roster := Label.new()
	roster.text = _roster_text()
	roster.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	roster.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	root.add_child(roster)

	var restart := Button.new()
	restart.text = "重新开始"
	restart.pressed.connect(func(): restart_requested.emit())
	root.add_child(restart)

func _summary_text() -> String:
	return "到达节点 %d/%d    主人公 HP %d/%d    灵魂碎片 %d    战斗次数 %d" % [
		run_state.node_index + 1,
		run_state.max_nodes,
		max(0, int(run_state.hero.hp)),
		int(run_state.hero.max_hp),
		int(run_state.hero.shards),
		int(run_state.battle_count),
	]

func _roster_text() -> String:
	if run_state.roster.is_empty():
		return "最终亡灵队伍：无"
	var names := []
	for soul in run_state.roster:
		names.append("%s HP %d/%d" % [String(soul.name), max(0, int(soul.hp)), int(soul.max_hp)])
	return "最终亡灵队伍：" + "；".join(names)
