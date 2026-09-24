extends Control

signal prep_finished

var run_state: Node
var chosen_stat := false
var chosen_equipment := false
var status_label: Label
var roster_box: VBoxContainer

func _ready() -> void:
	run_state.remove_dead_souls()
	_build()

func _build() -> void:
	var root := VBoxContainer.new()
	root.set_anchors_preset(Control.PRESET_FULL_RECT)
	root.offset_left = 44
	root.offset_top = 30
	root.offset_right = -44
	root.offset_bottom = -30
	root.add_theme_constant_override("separation", 12)
	add_child(root)

	var title := Label.new()
	title.text = "战后整备"
	title.add_theme_font_size_override("font_size", 30)
	root.add_child(title)

	status_label = Label.new()
	status_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	root.add_child(status_label)

	if not run_state.current_event_text.is_empty():
		var event_text := Label.new()
		event_text.text = run_state.current_event_text
		event_text.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		root.add_child(event_text)
		run_state.current_event_text = ""

	if not run_state.last_extracted_soul.is_empty():
		var soul_text := Label.new()
		soul_text.text = "本场提取：%s 已加入亡灵花名册。" % String(run_state.last_extracted_soul.name)
		root.add_child(soul_text)
		run_state.last_extracted_soul = {}

	var reward_row := HBoxContainer.new()
	reward_row.add_theme_constant_override("separation", 14)
	root.add_child(reward_row)

	var stat_panel := VBoxContainer.new()
	stat_panel.custom_minimum_size = Vector2(420, 170)
	stat_panel.add_theme_constant_override("separation", 6)
	reward_row.add_child(stat_panel)
	var stat_title := Label.new()
	stat_title.text = "属性加点（三选一）"
	stat_panel.add_child(stat_title)
	for option in run_state.last_reward.get("stat_options", []):
		var button := Button.new()
		button.text = "%s\n%s" % [String(option.name), String(option.text)]
		button.custom_minimum_size = Vector2(390, 54)
		button.set_meta("reward_id", String(option.id))
		button.pressed.connect(_on_stat_button_pressed.bind(button))
		stat_panel.add_child(button)

	var equipment_panel := VBoxContainer.new()
	equipment_panel.custom_minimum_size = Vector2(360, 170)
	equipment_panel.add_theme_constant_override("separation", 6)
	reward_row.add_child(equipment_panel)
	var equipment_title := Label.new()
	equipment_title.text = "装备掉落"
	equipment_panel.add_child(equipment_title)
	var item: Dictionary = run_state.last_reward.get("equipment", {})
	if item.is_empty():
		var no_item := Label.new()
		no_item.text = "这次没有掉落装备。"
		equipment_panel.add_child(no_item)
		chosen_equipment = true
	else:
		var item_button := Button.new()
		item_button.text = "%s [%s]\n%s" % [String(item.name), _slot_name(String(item.slot)), String(item.text)]
		item_button.custom_minimum_size = Vector2(330, 70)
		item_button.set_meta("reward_item", item)
		item_button.pressed.connect(_on_equipment_button_pressed.bind(item_button))
		equipment_panel.add_child(item_button)
		var skip_button := Button.new()
		skip_button.text = "分解为 3 个灵魂碎片"
		skip_button.pressed.connect(_skip_equipment)
		equipment_panel.add_child(skip_button)

	var roster_title := Label.new()
	roster_title.text = "选择出战亡灵（最多 3 个，死亡永久消失）"
	root.add_child(roster_title)
	roster_box = VBoxContainer.new()
	roster_box.add_theme_constant_override("separation", 6)
	root.add_child(roster_box)

	var continue_button := Button.new()
	continue_button.text = "继续探索"
	continue_button.pressed.connect(_finish_prep)
	root.add_child(continue_button)

	_refresh()

func _choose_stat(id: String) -> void:
	if chosen_stat:
		return
	run_state.apply_stat_reward(id)
	chosen_stat = true
	_refresh()

func _equip_reward(item: Dictionary) -> void:
	if chosen_equipment:
		return
	run_state.equip_item(item)
	chosen_equipment = true
	_refresh()

func _skip_equipment() -> void:
	if chosen_equipment:
		return
	run_state.hero["shards"] = int(run_state.hero.shards) + 3
	chosen_equipment = true
	_refresh()

func _finish_prep() -> void:
	if not chosen_stat and not run_state.last_reward.get("stat_options", []).is_empty():
		var first: Dictionary = run_state.last_reward.stat_options[0]
		run_state.apply_stat_reward(String(first.id))
	if not chosen_equipment and not run_state.last_reward.get("equipment", {}).is_empty():
		run_state.hero["shards"] = int(run_state.hero.shards) + 3
	run_state.last_reward = {}
	prep_finished.emit()

func _refresh() -> void:
	status_label.text = "主人公 HP %d/%d    灵魂碎片 %d    已选加点：%s    已处理装备：%s" % [
		int(run_state.hero.hp),
		int(run_state.hero.max_hp),
		int(run_state.hero.shards),
		"是" if chosen_stat else "否",
		"是" if chosen_equipment else "否",
	]
	_refresh_roster()

func _refresh_roster() -> void:
	for child in roster_box.get_children():
		child.queue_free()
	if run_state.roster.is_empty():
		var empty := Label.new()
		empty.text = "没有可出战亡灵。"
		roster_box.add_child(empty)
		return
	for soul in run_state.roster:
		var row := HBoxContainer.new()
		row.add_theme_constant_override("separation", 10)
		roster_box.add_child(row)
		var check := CheckBox.new()
		check.button_pressed = run_state.active_souls.has(soul)
		check.text = "%s  HP %d/%d  %s" % [
			String(soul.name),
			int(soul.hp),
			int(soul.max_hp),
			_skill_text(soul),
		]
		check.disabled = not check.button_pressed and run_state.active_souls.size() >= 3
		check.set_meta("soul_id", String(soul.id))
		check.toggled.connect(_on_soul_toggled.bind(check))
		row.add_child(check)

func _on_stat_button_pressed(button: Button) -> void:
	_choose_stat(String(button.get_meta("reward_id", "")))

func _on_equipment_button_pressed(button: Button) -> void:
	_equip_reward(button.get_meta("reward_item", {}))

func _on_soul_toggled(enabled: bool, check: CheckBox) -> void:
	_toggle_soul(String(check.get_meta("soul_id", "")), enabled)

func _toggle_soul(soul_id: String, enabled: bool) -> void:
	run_state.set_active_soul(soul_id, enabled)
	_refresh()

func _skill_text(soul: Dictionary) -> String:
	var names := []
	for skill in soul.get("skills", []):
		names.append(String(skill.name))
	return " / ".join(names)

func _slot_name(slot: String) -> String:
	if slot == "weapon":
		return "武器"
	if slot == "armor":
		return "护甲"
	if slot == "trinket":
		return "饰品"
	return slot
