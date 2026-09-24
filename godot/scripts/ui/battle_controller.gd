extends Control

signal battle_finished(won: bool)

const DataLoader := preload("res://scripts/data/data_loader.gd")
const Unit = preload("res://scripts/core/unit.gd")
const TurnScheduler = preload("res://scripts/core/turn_scheduler.gd")

var run_state: Node
var encounter_id := "skeleton_patrol"

var cards := []
var souls_data := []
var enemy_catalog := {}
var encounter := {}
var enemies := []
var ally_units: Array = []
var enemy_units: Array = []
var deck := []
var discard := []
var hand := []
var selected_enemy_index := 0
var turn := 1
var turn_phase := "hero"
var ally_turn_units: Array = []
var current_ally_unit_index := -1
var hero_block := 0
var seal_card_weakened := false
var rng := RandomNumberGenerator.new()

var root: VBoxContainer
var header_label: Label
var party_label: Label
var enemy_row: HBoxContainer
var soul_row: HBoxContainer
var hand_grid: GridContainer
var unit_turn_label: Label
var unit_card_grid: GridContainer
var unit_end_turn_button: Button
var log_label: RichTextLabel
var end_turn_button: Button
var extract_button: Button

func _ready() -> void:
	rng.randomize()
	cards = DataLoader.load_json("res://data/cards.json")
	souls_data = DataLoader.load_json("res://data/souls_chapter_1.json")
	var encounter_data: Dictionary = DataLoader.load_json("res://data/enemies_chapter_1.json")
	_build_enemy_catalog(encounter_data)
	encounter = _resolve_encounter(encounter_data, encounter_id)
	_create_enemies()
	_create_ally_units()
	_reset_deck()
	_start_player_turn()
	_build()
	_log("进入战斗：%s。" % String(encounter.get("name", encounter_id)))
	_refresh()

func _build_enemy_catalog(data: Dictionary) -> void:
	enemy_catalog = {}
	for enemy in data.get("enemies", []):
		enemy_catalog[String(enemy.id)] = enemy

func _resolve_encounter(data: Dictionary, id: String) -> Dictionary:
	for item in data.get("encounters", []):
		if String(item.id) == id:
			return item
	return data.get("encounters", [{}])[0]

func _create_enemies() -> void:
	enemies = []
	enemy_units = []
	var ids: Array = encounter.get("enemy_ids", [])
	for id in ids:
		if not enemy_catalog.has(String(id)):
			continue
		var source: Dictionary = enemy_catalog[String(id)]
		var enemy := source.duplicate(true)
		enemy["max_hp"] = int(enemy.get("hp", 1))
		enemy["block"] = 0
		enemy["seal"] = 0
		enemy["marked"] = 0
		enemy["power"] = 0
		enemy["alive"] = true
		enemy["skill_index"] = rng.randi_range(0, max(0, enemy.get("skills", []).size() - 1))
		enemies.append(enemy)
		var unit_data := enemy.duplicate(true)
		unit_data["faction"] = Unit.FACTION_ENEMY
		unit_data["runtime_index"] = enemies.size() - 1
		enemy_units.append(Unit.new_from_dict(unit_data))

func _create_ally_units() -> void:
	ally_units = []
	if run_state == null:
		return
	for unit in run_state.get_alive_active_units():
		ally_units.append(unit)

func _reset_deck() -> void:
	deck = []
	discard = []
	for card in cards:
		deck.append(card.duplicate(true))
	deck.shuffle()

func _start_player_turn() -> void:
	run_state.hero["energy"] = int(run_state.hero.max_energy)
	hero_block = 0
	hand = []
	var draw_count := 5
	for _i in range(draw_count):
		_draw_card()

func _draw_card() -> void:
	if deck.is_empty():
		deck = discard.duplicate(true)
		discard = []
		deck.shuffle()
	if deck.is_empty():
		return
	hand.append(deck.pop_back())

func _build() -> void:
	# The battle screen is intentionally assembled as a small visual system so every
	# dynamic unit/card keeps the same spacing, colors, and interaction states.
	var background := TextureRect.new()
	background.name = "BattleBackground"
	background.set_anchors_preset(Control.PRESET_FULL_RECT)
	background.texture = load("res://assets/backgrounds/battle_background_maze_gate.png")
	background.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	background.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_COVERED
	background.modulate = Color(0.52, 0.52, 0.62, 1.0)
	background.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(background)

	var shade := ColorRect.new()
	shade.name = "SceneShade"
	shade.set_anchors_preset(Control.PRESET_FULL_RECT)
	shade.color = Color(0.015, 0.02, 0.07, 0.62)
	shade.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(shade)
	var glow := ColorRect.new()
	glow.name = "SceneGlow"
	glow.set_anchors_preset(Control.PRESET_FULL_RECT)
	glow.color = Color(0.05, 0.2, 0.3, 0.12)
	glow.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(glow)

	root = VBoxContainer.new()
	root.name = "BattleViewport"
	root.set_anchors_preset(Control.PRESET_FULL_RECT)
	root.offset_left = 24
	root.offset_top = 18
	root.offset_right = -24
	root.offset_bottom = -18
	root.add_theme_constant_override("separation", 12)
	add_child(root)

	var header_panel := _panel(Color(0.025, 0.04, 0.11, 0.9), Color(0.18, 0.8, 1.0, 0.55), 1, 10)
	header_panel.custom_minimum_size = Vector2(0, 64)
	root.add_child(header_panel)
	var header := HBoxContainer.new()
	header.add_theme_constant_override("separation", 16)
	header_panel.add_child(header)
	var title_box := VBoxContainer.new()
	title_box.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	header.add_child(title_box)
	var eyebrow := Label.new()
	eyebrow.text = "SUMMON MAZE  /  NECROMANCER PROTOCOL"
	eyebrow.add_theme_font_size_override("font_size", 10)
	eyebrow.add_theme_color_override("font_color", Color(0.25, 0.85, 1.0))
	title_box.add_child(eyebrow)
	header_label = Label.new()
	header_label.add_theme_font_size_override("font_size", 24)
	header_label.add_theme_color_override("font_color", Color(0.9, 0.97, 1.0))
	title_box.add_child(header_label)
	var status_box := VBoxContainer.new()
	status_box.custom_minimum_size = Vector2(360, 0)
	status_box.alignment = BoxContainer.ALIGNMENT_CENTER
	header.add_child(status_box)
	party_label = Label.new()
	party_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	party_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	party_label.add_theme_color_override("font_color", Color(0.65, 0.84, 0.94))
	status_box.add_child(party_label)

	var battlefield_panel := _panel(Color(0.015, 0.025, 0.08, 0.7), Color(0.18, 0.8, 1.0, 0.28), 1, 10)
	battlefield_panel.name = "BattlefieldPanel"
	battlefield_panel.size_flags_vertical = Control.SIZE_EXPAND_FILL
	root.add_child(battlefield_panel)
	var battlefield := HBoxContainer.new()
	battlefield.add_theme_constant_override("separation", 18)
	battlefield_panel.add_child(battlefield)

	var ally_panel := _panel(Color(0.08, 0.035, 0.15, 0.78), Color(0.68, 0.3, 1.0, 0.55), 1, 8)
	ally_panel.custom_minimum_size = Vector2(300, 0)
	battlefield.add_child(ally_panel)
	var ally_box := VBoxContainer.new()
	ally_box.add_theme_constant_override("separation", 6)
	ally_panel.add_child(ally_box)
	var ally_title := _section_label("YOUR SUMMONS  //  ACTIVE PARTY", Color(0.8, 0.55, 1.0))
	ally_box.add_child(ally_title)
	soul_row = HBoxContainer.new()
	soul_row.add_theme_constant_override("separation", 8)
	soul_row.size_flags_vertical = Control.SIZE_EXPAND_FILL
	ally_box.add_child(soul_row)

	var enemy_panel := _panel(Color(0.02, 0.04, 0.1, 0.6), Color(0.2, 0.75, 1.0, 0.45), 1, 8)
	enemy_panel.name = "EnemyStage"
	enemy_panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	battlefield.add_child(enemy_panel)
	var enemy_box := VBoxContainer.new()
	enemy_box.add_theme_constant_override("separation", 6)
	enemy_panel.add_child(enemy_box)
	var enemy_title := _section_label("HOSTILE SIGNATURES  //  SELECT TARGET", Color(0.35, 0.88, 1.0))
	enemy_box.add_child(enemy_title)
	enemy_row = HBoxContainer.new()
	enemy_row.name = "EnemyCards"
	enemy_row.add_theme_constant_override("separation", 12)
	enemy_row.alignment = BoxContainer.ALIGNMENT_CENTER
	enemy_row.size_flags_vertical = Control.SIZE_EXPAND_FILL
	enemy_box.add_child(enemy_row)

	var command_panel := _panel(Color(0.02, 0.025, 0.075, 0.94), Color(0.72, 0.36, 1.0, 0.5), 1, 10)
	command_panel.name = "CommandDeck"
	command_panel.custom_minimum_size = Vector2(0, 218)
	root.add_child(command_panel)
	var command := VBoxContainer.new()
	command.add_theme_constant_override("separation", 8)
	command_panel.add_child(command)
	var command_header := HBoxContainer.new()
	command_header.add_theme_constant_override("separation", 10)
	command.add_child(command_header)
	var hand_title := _section_label("RITUAL DECK  //  CHOOSE YOUR ACTION", Color(0.9, 0.72, 0.35))
	hand_title.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	command_header.add_child(hand_title)
	var hint := Label.new()
	hint.text = "TARGET SELECTED  •  PLAY A CARD"
	hint.add_theme_font_size_override("font_size", 10)
	hint.add_theme_color_override("font_color", Color(0.4, 0.7, 0.8))
	command_header.add_child(hint)

	hand_grid = GridContainer.new()
	hand_grid.name = "CardHand"
	hand_grid.columns = 5
	hand_grid.size_flags_vertical = Control.SIZE_EXPAND_FILL
	hand_grid.add_theme_constant_override("h_separation", 10)
	hand_grid.add_theme_constant_override("v_separation", 8)
	command.add_child(hand_grid)

	var unit_panel := VBoxContainer.new()
	unit_panel.name = "AllyTurnPanel"
	unit_panel.add_theme_constant_override("separation", 6)
	command.add_child(unit_panel)
	unit_turn_label = _section_label("", Color(0.4, 0.9, 0.7))
	unit_turn_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	unit_panel.add_child(unit_turn_label)
	unit_card_grid = GridContainer.new()
	unit_card_grid.columns = 2
	unit_card_grid.add_theme_constant_override("h_separation", 8)
	unit_card_grid.add_theme_constant_override("v_separation", 8)
	unit_panel.add_child(unit_card_grid)
	unit_end_turn_button = Button.new()
	unit_end_turn_button.text = "结束单位回合  ›"
	_style_button(unit_end_turn_button, Color(0.18, 0.46, 0.42, 0.9), Color(0.3, 0.95, 0.75, 0.8))
	unit_end_turn_button.pressed.connect(_finish_current_ally_turn)
	unit_panel.add_child(unit_end_turn_button)

	var controls := HBoxContainer.new()
	controls.add_theme_constant_override("separation", 10)
	command.add_child(controls)
	end_turn_button = Button.new()
	end_turn_button.text = "结束回合  ›"
	end_turn_button.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_style_button(end_turn_button, Color(0.34, 0.2, 0.08, 0.95), Color(1.0, 0.72, 0.28, 0.9))
	end_turn_button.pressed.connect(_end_player_turn)
	controls.add_child(end_turn_button)
	extract_button = Button.new()
	extract_button.text = "提取魂印  ◈"
	extract_button.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_style_button(extract_button, Color(0.16, 0.1, 0.28, 0.95), Color(0.8, 0.45, 1.0, 0.85))
	extract_button.pressed.connect(_try_manual_extract)
	controls.add_child(extract_button)

	var log_panel := _panel(Color(0.015, 0.02, 0.05, 0.88), Color(0.2, 0.55, 0.7, 0.35), 1, 8)
	log_panel.name = "CombatLog"
	log_panel.custom_minimum_size = Vector2(0, 82)
	root.add_child(log_panel)
	log_label = RichTextLabel.new()
	log_label.custom_minimum_size = Vector2(0, 72)
	log_label.fit_content = false
	log_label.scroll_following = true
	log_label.bbcode_enabled = true
	log_label.add_theme_font_size_override("normal_font_size", 12)
	log_label.add_theme_color_override("default_color", Color(0.68, 0.82, 0.9))
	log_panel.add_child(log_label)
	unit_panel.visible = false

func _refresh() -> void:
	header_label.text = "%s    回合 %d    能量 %d/%d    抽牌堆 %d / 弃牌堆 %d" % [
		String(encounter.get("name", encounter_id)),
		turn,
		int(run_state.hero.energy),
		int(run_state.hero.max_energy),
		deck.size(),
		discard.size(),
	]
	party_label.text = _party_text()
	_refresh_souls()
	_refresh_enemies()
	_refresh_hand()
	_refresh_unit_turn_controls()
	extract_button.disabled = not _selected_enemy_can_extract()

func _party_text() -> String:
	var soul_text := []
	for soul in run_state.active_souls:
		soul_text.append("%s HP %d/%d" % [String(soul.name), int(soul.hp), int(soul.max_hp)])
	return "主人公 HP %d/%d  格挡 %d  碎片 %d    亡灵：%s" % [
		int(run_state.hero.hp),
		int(run_state.hero.max_hp),
		hero_block,
		int(run_state.hero.shards),
		"；".join(soul_text) if not soul_text.is_empty() else "无",
	]

func _refresh_souls() -> void:
	_clear_children(soul_row)
	var hero_panel := _make_unit_panel("主人公", "HP %d/%d\n仪式牌行动" % [int(run_state.hero.hp), int(run_state.hero.max_hp)], Color(0.24, 0.18, 0.32), "res://assets/sprites/protagonist_necromancer.png")
	soul_row.add_child(hero_panel)
	for soul in run_state.active_souls:
		var skill: Dictionary = soul.get("skills", [{}])[0]
		var text := "HP %d/%d\n%s" % [int(soul.hp), int(soul.max_hp), String(skill.get("name", "亡灵攻击"))]
		soul_row.add_child(_make_unit_panel(String(soul.name), text, Color(0.16, 0.24, 0.22), _soul_sprite_path(String(soul.get("id", "")))))

func _refresh_enemies() -> void:
	_clear_children(enemy_row)
	for i in range(enemies.size()):
		var enemy: Dictionary = enemies[i]
		var button := Button.new()
		button.custom_minimum_size = Vector2(214, 0)
		button.size_flags_vertical = Control.SIZE_EXPAND_FILL
		button.name = "EnemyCard_%d" % i
		var alive := bool(enemy.get("alive", true))
		var skill := _current_enemy_skill(enemy)
		button.text = "%s%s\nHP %d/%d  护盾 %d\n魂印 %d/100\n意图：%s" % [
			"▶ " if i == selected_enemy_index else "",
			String(enemy.name),
			max(0, int(enemy.hp)),
			int(enemy.max_hp),
			int(enemy.block),
			int(enemy.seal),
			String(skill.get("intent", "无")) if alive else "已倒下",
		]
		button.text = ""
		_style_button(button, Color(0.035, 0.055, 0.12, 0.94) if i != selected_enemy_index else Color(0.12, 0.09, 0.2, 0.98), Color(0.25, 0.85, 1.0, 0.85) if i != selected_enemy_index else Color(1.0, 0.72, 0.3, 0.95))
		button.disabled = not alive
		button.pressed.connect(func(index := i): _select_enemy(index))
		_populate_enemy_card(button, enemy, i, skill, alive)
		enemy_row.add_child(button)

func _refresh_hand() -> void:
	_clear_children(hand_grid)
	for i in range(hand.size()):
		var card: Dictionary = hand[i]
		var button := Button.new()
		button.custom_minimum_size = Vector2(0, 122)
		button.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		button.text = "%s  费%d\n%s" % [String(card.name), int(card.cost), String(card.short_text)]
		button.text = ""
		_style_button(button, Color(0.06, 0.07, 0.16, 0.98), _card_color(String(card.get("type", "attack"))))
		button.disabled = turn_phase != "hero" or int(card.cost) > int(run_state.hero.energy) or _living_enemy_indexes().is_empty()
		button.pressed.connect(func(index := i): _play_card(index))
		_populate_card(button, card)
		hand_grid.add_child(button)
	end_turn_button.disabled = turn_phase != "hero"

func _refresh_unit_turn_controls() -> void:
	_clear_children(unit_card_grid)
	unit_turn_label.get_parent().visible = turn_phase == "ally"
	unit_end_turn_button.visible = turn_phase == "ally"
	if turn_phase != "ally" or current_ally_unit_index < 0 or current_ally_unit_index >= ally_turn_units.size():
		unit_turn_label.text = ""
		return
	var unit = ally_turn_units[current_ally_unit_index]
	unit_turn_label.text = "我方单位回合：%s    选择攻击牌或防御牌" % String(unit.display_name)
	for i in range(unit.cards.size()):
		var card = unit.cards[i]
		var button := Button.new()
		button.custom_minimum_size = Vector2(240, 72)
		button.text = "%s\n%s %d" % [String(card.name), "攻击" if card.type == "attack" else "防御", int(card.power)]
		button.pressed.connect(func(index := i): _play_unit_card(index))
		unit_card_grid.add_child(button)

func _select_enemy(index: int) -> void:
	selected_enemy_index = index
	_refresh()

func _play_card(index: int) -> void:
	if turn_phase != "hero":
		return
	if index < 0 or index >= hand.size():
		return
	var card: Dictionary = hand[index]
	var cost := int(card.get("cost", 0))
	if cost > int(run_state.hero.energy):
		_log("能量不足，无法使用 %s。" % String(card.name))
		return
	run_state.hero["energy"] = int(run_state.hero.energy) - cost
	hand.remove_at(index)
	discard.append(card)
	_execute_card(card)
	_check_battle_end()
	_refresh()

func _execute_card(card: Dictionary) -> void:
	var card_id := String(card.get("id", ""))
	var target_type := String(card.get("target", "enemy_single"))
	var targets := _card_targets(target_type)
	var seal_scale := 0.5 if seal_card_weakened and int(card.get("seal", 0)) > 0 else 1.0
	if seal_card_weakened and int(card.get("seal", 0)) > 0:
		seal_card_weakened = false
		_log("灵魂封缄生效：这张魂印牌的魂印效果减半。")

	if card.has("hp_loss"):
		_damage_hero(int(card.hp_loss), true)
	if card.has("block"):
		var bonus := 0
		var selected := _selected_enemy()
		if not selected.is_empty() and int(selected.get("seal", 0)) >= int(card.get("bonus_block_if_enemy_seal_at_least", 999)):
			bonus = int(card.get("bonus_block", 0))
		hero_block += int(card.block) + bonus
		_log("%s 获得 %d 格挡。" % [String(card.name), int(card.block) + bonus])
	if card.has("energy_gain"):
		run_state.hero["energy"] = int(run_state.hero.energy) + int(card.energy_gain)
	if card.has("draw"):
		var draw := int(card.draw)
		var selected_enemy := _selected_enemy()
		if not selected_enemy.is_empty() and int(selected_enemy.get("seal", 0)) >= int(card.get("bonus_draw_if_enemy_seal_at_least", 999)):
			draw += int(card.get("bonus_draw", 0))
		for _i in range(draw):
			_draw_card()
		_log("%s 抽 %d 张牌。" % [String(card.name), draw])

	if card_id == "undead_command":
		for enemy in targets:
			_add_seal(enemy, int(round(float(card.get("seal", 0)) * seal_scale)))
		_command_souls(int(card.get("max_soul_attacks", 2)), 1.0)
	elif card_id == "arise":
		for enemy in targets:
			_add_seal(enemy, int(round(float(card.get("seal", 0)) * seal_scale)))
		_command_souls(99, float(card.get("soul_damage_multiplier", 1.0)))
	else:
		for enemy in targets:
			var damage := _card_damage(card, enemy)
			if damage > 0:
				_damage_enemy(enemy, damage, String(card.get("damage_type", "physical")), "hero")
			if int(card.get("seal", 0)) > 0:
				var seal_value := int(card.get("seal", 0))
				if card_id == "soul_spark" and int(enemy.get("marked", 0)) > 0:
					seal_value = int(card.get("marked_seal", seal_value))
				if card_id == "death_decay" and int(enemy.get("marked", 0)) > 0:
					seal_value += int(card.get("marked_bonus_seal", 0))
				_add_seal(enemy, int(round(float(seal_value) * seal_scale)))
			if card.has("mark_turns"):
				enemy["marked"] = int(card.mark_turns)
				_log("%s 被灵魂标记。" % String(enemy.name))
			if card.has("enemy_attack_down"):
				enemy["power"] = int(enemy.get("power", 0)) - int(round(float(enemy.get("atk", 0)) * float(card.enemy_attack_down)))
				_log("%s 的下一次攻击被魂链削弱。" % String(enemy.name))

func _card_damage(card: Dictionary, enemy: Dictionary) -> int:
	var damage := int(card.get("damage", 0))
	if String(card.get("id", "")) == "soul_spark" and int(enemy.get("marked", 0)) > 0:
		damage = int(card.get("marked_damage", damage))
	if String(card.get("id", "")) == "execution_rite" and int(enemy.get("seal", 0)) >= int(card.get("high_seal_threshold", 70)):
		damage = int(card.get("high_seal_damage", damage))
	if String(card.get("damage_type", "physical")) == "physical":
		damage += int(run_state.hero.get("attack_bonus", 0))
	elif String(card.get("damage_type", "")) == "magic":
		damage += int(run_state.hero.get("magic_bonus", 0))
	return damage

func _card_targets(target_type: String) -> Array:
	if target_type == "enemy_all":
		var result := []
		for enemy in enemies:
			if bool(enemy.get("alive", true)):
				result.append(enemy)
		return result
	var selected := _selected_enemy()
	return [selected] if not selected.is_empty() else []

func _command_souls(max_count: int, multiplier: float) -> void:
	var count := 0
	for soul in run_state.get_alive_active_souls():
		if count >= max_count:
			break
		var target := _first_living_enemy()
		if target.is_empty():
			return
		var skill: Dictionary = soul.get("skills", [{}])[0]
		var damage := int(round(float(skill.get("damage", soul.get("soul_atk", 1))) * multiplier))
		if damage > 0:
			_damage_enemy(target, damage, String(skill.get("damage_type", "physical")), "soul")
			_log("%s 使用 %s，造成 %d 伤害。" % [String(soul.name), String(skill.get("name", "亡灵攻击")), damage])
		if int(skill.get("seal", 0)) > 0:
			_add_seal(target, int(skill.seal))
		count += 1

func _end_player_turn() -> void:
	if turn_phase != "hero":
		return
	for card in hand:
		discard.append(card)
	hand = []
	_begin_ally_turn_phase()

func _begin_ally_turn_phase() -> void:
	_create_ally_units()
	_sync_unit_liveness()
	ally_turn_units = []
	for unit in ally_units:
		if unit != null and unit.is_alive():
			ally_turn_units.append(unit)
	current_ally_unit_index = 0
	if ally_turn_units.is_empty():
		_begin_enemy_turn_phase()
		return
	turn_phase = "ally"
	_refresh()

func _play_unit_card(index: int) -> void:
	if turn_phase != "ally" or current_ally_unit_index < 0 or current_ally_unit_index >= ally_turn_units.size():
		return
	var unit = ally_turn_units[current_ally_unit_index]
	if index < 0 or index >= unit.cards.size():
		return
	var card = unit.cards[index]
	if card.type == "attack":
		var target := _selected_enemy()
		if target.is_empty():
			return
		_damage_enemy(target, int(card.power), "physical", "ally_unit")
		_log("%s 使用攻击牌 %s。" % [String(unit.display_name), String(card.name)])
	else:
		unit.block += int(card.power)
		_log("%s 使用防御牌 %s，获得 %d 格挡。" % [String(unit.display_name), String(card.name), int(card.power)])
	_finish_current_ally_turn()

func _finish_current_ally_turn() -> void:
	if turn_phase != "ally":
		return
	current_ally_unit_index += 1
	if current_ally_unit_index >= ally_turn_units.size():
		_begin_enemy_turn_phase()
	else:
		_refresh()

func _begin_enemy_turn_phase() -> void:
	turn_phase = "enemy"
	current_ally_unit_index = -1
	_refresh_unit_turn_controls()
	_run_enemy_turns()
	if int(run_state.hero.hp) <= 0:
		return
	_decay_marks()
	turn += 1
	turn_phase = "hero"
	_start_player_turn()
	_refresh()

func _run_extra_unit_turns() -> void:
	_create_ally_units()
	_sync_unit_liveness()
	var order := TurnScheduler.build_extra_turn_order(ally_units, enemy_units)
	for unit in order:
		if unit.faction == Unit.FACTION_ALLY:
			_run_single_ally_unit_turn(unit)
		elif unit.faction == Unit.FACTION_ENEMY:
			var enemy := _enemy_for_unit(unit)
			if enemy.is_empty() or not bool(enemy.get("alive", true)):
				continue
			var skill := _current_enemy_skill(enemy)
			_execute_enemy_skill(enemy, skill)
			enemy["skill_index"] = (int(enemy.get("skill_index", 0)) + 1) % max(1, enemy.get("skills", []).size())
			if int(run_state.hero.hp) <= 0:
				_log("主人公倒下，战斗失败。")
				battle_finished.emit(false)
				return
	run_state.remove_dead_souls()

func _run_single_ally_unit_turn(unit) -> void:
	var soul := _find_soul(String(unit.id))
	if soul.is_empty() or int(soul.get("hp", 0)) <= 0:
		return
	var target := _first_living_enemy()
	if target.is_empty():
		return
	var skills: Array = soul.get("skills", [])
	var skill: Dictionary = skills[(turn + ally_units.find(unit) - 1) % max(1, skills.size())] if not skills.is_empty() else {}
	var damage := int(skill.get("damage", soul.get("soul_atk", 1)))
	if String(skill.get("target", "enemy_single")) == "enemy_all":
		for enemy in enemies:
			if bool(enemy.get("alive", true)):
				_damage_enemy(enemy, damage, String(skill.get("damage_type", "physical")), "soul")
				if int(skill.get("seal", 0)) > 0:
					_add_seal(enemy, int(skill.seal))
		_log("%s 使用 %s，攻击全体敌人。" % [String(soul.name), String(skill.get("name", "单位技能"))])
	elif damage > 0:
		_damage_enemy(target, damage, String(skill.get("damage_type", "physical")), "soul")
		if int(skill.get("seal", 0)) > 0:
			_add_seal(target, int(skill.seal))
		_log("%s 使用 %s。" % [String(soul.name), String(skill.get("name", "单位技能"))])
	elif int(skill.get("block", 0)) > 0:
		hero_block += int(skill.block)
		_log("%s 使用 %s，给主人公 %d 格挡。" % [String(soul.name), String(skill.get("name", "单位技能")), int(skill.block)])

func _sync_unit_liveness() -> void:
	for unit in ally_units:
		var soul := _find_soul(String(unit.id))
		if not soul.is_empty():
			unit.hp = int(soul.get("hp", 0))
	for unit in enemy_units:
		var enemy := _enemy_for_unit(unit)
		if not enemy.is_empty():
			unit.hp = int(enemy.get("hp", 0))

func _enemy_for_unit(unit) -> Dictionary:
	var index := int(unit.source_data.get("runtime_index", -1))
	if index >= 0 and index < enemies.size():
		return enemies[index]
	return {}

func _run_soul_turns() -> void:
	var index := 0
	for soul in run_state.get_alive_active_souls():
		index += 1
		var target := _first_living_enemy()
		if target.is_empty():
			return
		var skills: Array = soul.get("skills", [])
		var skill: Dictionary = skills[(turn + index - 1) % max(1, skills.size())] if not skills.is_empty() else {}
		var damage := int(skill.get("damage", soul.get("soul_atk", 1)))
		if String(skill.get("target", "enemy_single")) == "enemy_all":
			for enemy in enemies:
				if bool(enemy.get("alive", true)):
					_damage_enemy(enemy, damage, String(skill.get("damage_type", "physical")), "soul")
					if int(skill.get("seal", 0)) > 0:
						_add_seal(enemy, int(skill.seal))
			_log("%s 使用 %s，攻击全体敌人。" % [String(soul.name), String(skill.get("name", "亡灵技能"))])
		elif damage > 0:
			_damage_enemy(target, damage, String(skill.get("damage_type", "physical")), "soul")
			if int(skill.get("seal", 0)) > 0:
				_add_seal(target, int(skill.seal))
			_log("%s 使用 %s。" % [String(soul.name), String(skill.get("name", "亡灵技能"))])
		elif int(skill.get("block", 0)) > 0:
			hero_block += int(skill.block)
			_log("%s 使用 %s，给主人公 %d 格挡。" % [String(soul.name), String(skill.get("name", "亡灵技能")), int(skill.block)])

func _run_enemy_turns() -> void:
	for enemy in enemies:
		if not bool(enemy.get("alive", true)):
			continue
		var skill := _current_enemy_skill(enemy)
		_execute_enemy_skill(enemy, skill)
		enemy["skill_index"] = (int(enemy.skill_index) + 1) % max(1, enemy.get("skills", []).size())
		if int(run_state.hero.hp) <= 0:
			_log("主人公倒下，战斗失败。")
			battle_finished.emit(false)
			return
	run_state.remove_dead_souls()

func _execute_enemy_skill(enemy: Dictionary, skill: Dictionary) -> void:
	if skill.has("summon"):
		_summon_enemy(String(skill.summon))
		_log("%s 使用 %s，召唤了新的骷髅。" % [String(enemy.name), String(skill.name)])
	if skill.has("block"):
		enemy["block"] = int(enemy.block) + int(skill.block)
		_log("%s 使用 %s，获得 %d 护盾。" % [String(enemy.name), String(skill.name), int(skill.block)])
	if skill.has("heal"):
		enemy["hp"] = min(int(enemy.max_hp), int(enemy.hp) + int(skill.heal))
		_log("%s 回复 %d 生命。" % [String(enemy.name), int(skill.heal)])
	if skill.has("self_power"):
		enemy["power"] = int(enemy.power) + int(skill.self_power)
		_log("%s 正在瞄准，下一次攻击增强。" % String(enemy.name))
	if skill.has("energy_down"):
		run_state.hero["energy"] = max(0, int(run_state.hero.energy) - int(skill.energy_down))
		_log("%s 让主人公下回合节奏变慢。" % String(enemy.name))
	if skill.has("seal_card_down"):
		seal_card_weakened = true
		_log("%s 封缄灵魂，下一张魂印牌效果减半。" % String(enemy.name))
	if int(skill.get("seal_down", 0)) > 0:
		var target := _highest_seal_enemy()
		if not target.is_empty():
			target["seal"] = max(0, int(target.seal) - int(skill.seal_down))
			_log("%s 干扰魂印，%s 魂印降低。" % [String(enemy.name), String(target.name)])
	if skill.has("damage"):
		var hits := int(skill.get("hits", 1))
		var damage := int(skill.damage) + int(enemy.get("power", 0))
		enemy["power"] = 0
		for _i in range(hits):
			if int(skill.get("aoe", 0)) == 1:
				_damage_party(damage, int(skill.get("pierce", 0)) == 1)
			else:
				_damage_front_party(damage, int(skill.get("pierce", 0)) == 1)
		_log("%s 使用 %s。" % [String(enemy.name), String(skill.name)])

func _damage_front_party(amount: int, pierce: bool) -> void:
	var souls: Array = run_state.get_alive_active_souls()
	if not souls.is_empty() and rng.randf() < 0.55:
		var soul: Dictionary = souls[0]
		soul["hp"] = int(soul.hp) - amount
		_log("%s 承受 %d 伤害。" % [String(soul.name), amount])
		if int(soul.hp) <= 0:
			_log("%s 被击溃，永久消失。" % String(soul.name))
	else:
		_damage_hero(amount, pierce)

func _damage_party(amount: int, pierce: bool) -> void:
	_damage_hero(amount, pierce)
	for soul in run_state.get_alive_active_souls():
		soul["hp"] = int(soul.hp) - amount
		_log("%s 承受 %d 范围伤害。" % [String(soul.name), amount])
		if int(soul.hp) <= 0:
			_log("%s 被击溃，永久消失。" % String(soul.name))

func _damage_hero(amount: int, pierce: bool) -> void:
	var damage := amount
	if not pierce:
		var blocked: int = min(hero_block, damage)
		hero_block -= blocked
		damage -= blocked
	if damage > 0:
		run_state.hero["hp"] = int(run_state.hero.hp) - damage
		_log("主人公承受 %d 伤害。" % damage)

func _damage_enemy(enemy: Dictionary, amount: int, damage_type: String, source: String) -> void:
	if not bool(enemy.get("alive", true)):
		return
	var damage := amount
	var blocked: int = min(int(enemy.block), damage)
	enemy["block"] = int(enemy.block) - blocked
	damage -= blocked
	if damage <= 0:
		_log("%s 的护盾吸收了伤害。" % String(enemy.name))
		return
	enemy["hp"] = int(enemy.hp) - damage
	_log("%s 受到 %d 点%s伤害。" % [String(enemy.name), damage, "魔法" if damage_type == "magic" else "物理"])
	if int(enemy.hp) <= 0:
		_enemy_defeated(enemy, source)

func _enemy_defeated(enemy: Dictionary, source: String) -> void:
	enemy["alive"] = false
	enemy["hp"] = 0
	_log("%s 被击杀。" % String(enemy.name))
	if int(enemy.get("seal", 0)) >= 40:
		run_state.hero["shards"] = int(run_state.hero.shards) + 2
	if source == "hero":
		_try_extract(enemy, false)

func _try_manual_extract() -> void:
	var enemy := _selected_enemy()
	if enemy.is_empty():
		return
	_try_extract(enemy, true)
	_refresh()

func _try_extract(enemy: Dictionary, manual: bool) -> void:
	if not run_state.last_extracted_soul.is_empty():
		_log("本场已经成功提取过一个亡灵。")
		return
	if bool(enemy.get("alive", true)) and manual:
		_log("只能对已倒下且魂印 40+ 的目标尝试提取。")
		return
	if int(enemy.get("seal", 0)) < 40:
		_log("%s 魂印不足，无法稳定提取。" % String(enemy.name))
		return
	var chance := float(enemy.get("extract", 0.5)) + float(run_state.hero.get("extract_bonus", 0.0))
	if int(enemy.seal) >= 70:
		chance += 0.15
	if int(enemy.seal) >= 100:
		chance += 0.1
	chance = clamp(chance, 0.05, 0.98)
	if rng.randf() <= chance:
		var soul := _find_soul(String(enemy.get("soul_id", "")))
		if not soul.is_empty():
			run_state.add_soul(soul)
			run_state.last_extracted_soul = soul
			_log("提取成功：获得 %s。" % String(soul.name))
		else:
			_log("提取成功，但没有找到亡灵数据。")
	else:
		_log("提取失败，魂印散逸。成功率约 %d%%。" % int(chance * 100.0))

func _selected_enemy_can_extract() -> bool:
	var enemy := _selected_enemy()
	return not enemy.is_empty() and not bool(enemy.get("alive", true)) and int(enemy.get("seal", 0)) >= 40 and run_state.last_extracted_soul.is_empty()

func _find_soul(soul_id: String) -> Dictionary:
	for soul in souls_data:
		if String(soul.id) == soul_id:
			return soul
	return {}

func _add_seal(enemy: Dictionary, amount: int) -> void:
	if enemy.is_empty() or not bool(enemy.get("alive", true)):
		return
	enemy["seal"] = clamp(int(enemy.seal) + amount, 0, 100)
	_log("%s 魂印 +%d（%d/100）。" % [String(enemy.name), amount, int(enemy.seal)])

func _current_enemy_skill(enemy: Dictionary) -> Dictionary:
	var skills: Array = enemy.get("skills", [])
	if skills.is_empty():
		return {}
	var index := int(enemy.get("skill_index", 0)) % skills.size()
	if String(enemy.get("id", "")) == "crypt_lich" and int(enemy.hp) <= int(enemy.max_hp) * 0.35:
		for skill in skills:
			if String(skill.get("id", "")) == "crypt_finale":
				return skill
	return skills[index]

func _summon_enemy(enemy_id: String) -> void:
	if enemies.size() >= 4 or not enemy_catalog.has(enemy_id):
		return
	var source: Dictionary = enemy_catalog[enemy_id]
	var enemy := source.duplicate(true)
	enemy["max_hp"] = int(enemy.get("hp", 1))
	enemy["hp"] = int(enemy.max_hp)
	enemy["block"] = 0
	enemy["seal"] = 0
	enemy["marked"] = 0
	enemy["power"] = 0
	enemy["alive"] = true
	enemy["skill_index"] = 0
	enemies.append(enemy)
	var unit_data := enemy.duplicate(true)
	unit_data["faction"] = Unit.FACTION_ENEMY
	unit_data["runtime_index"] = enemies.size() - 1
	enemy_units.append(Unit.new_from_dict(unit_data))

func _check_battle_end() -> void:
	if _living_enemy_indexes().is_empty():
		_log("战斗胜利。")
		run_state.remove_dead_souls()
		battle_finished.emit(true)

func _living_enemy_indexes() -> Array:
	var indexes := []
	for i in range(enemies.size()):
		if bool(enemies[i].get("alive", true)):
			indexes.append(i)
	return indexes

func _selected_enemy() -> Dictionary:
	if selected_enemy_index >= 0 and selected_enemy_index < enemies.size() and bool(enemies[selected_enemy_index].get("alive", true)):
		return enemies[selected_enemy_index]
	return _first_living_enemy()

func _first_living_enemy() -> Dictionary:
	for enemy in enemies:
		if bool(enemy.get("alive", true)):
			return enemy
	return {}

func _highest_seal_enemy() -> Dictionary:
	var best := {}
	var best_seal := -1
	for enemy in enemies:
		if int(enemy.get("seal", 0)) > best_seal:
			best = enemy
			best_seal = int(enemy.seal)
	return best

func _decay_marks() -> void:
	for enemy in enemies:
		enemy["block"] = 0
		if int(enemy.get("marked", 0)) > 0:
			enemy["marked"] = int(enemy.marked) - 1

func _panel(fill: Color, border: Color, width: int, radius: int) -> PanelContainer:
	var panel := PanelContainer.new()
	var style := StyleBoxFlat.new()
	style.bg_color = fill
	style.border_color = border
	style.set_border_width_all(width)
	style.set_corner_radius_all(radius)
	style.content_margin_left = 12
	style.content_margin_right = 12
	style.content_margin_top = 10
	style.content_margin_bottom = 10
	panel.add_theme_stylebox_override("panel", style)
	return panel

func _section_label(text: String, color: Color) -> Label:
	var label := Label.new()
	label.text = text
	label.add_theme_font_size_override("font_size", 11)
	label.add_theme_color_override("font_color", color)
	return label

func _style_button(button: Button, fill: Color, border: Color) -> void:
	var normal := StyleBoxFlat.new()
	normal.bg_color = fill
	normal.border_color = border
	normal.set_border_width_all(1)
	normal.set_corner_radius_all(7)
	normal.content_margin_left = 10
	normal.content_margin_right = 10
	normal.content_margin_top = 8
	normal.content_margin_bottom = 8
	var hover := normal.duplicate()
	hover.bg_color = fill.lightened(0.12)
	hover.border_color = border.lightened(0.18)
	hover.shadow_color = Color(border.r, border.g, border.b, 0.28)
	hover.shadow_size = 8
	var disabled := normal.duplicate()
	disabled.bg_color = Color(fill.r, fill.g, fill.b, 0.42)
	disabled.border_color = Color(border.r, border.g, border.b, 0.3)
	button.add_theme_stylebox_override("normal", normal)
	button.add_theme_stylebox_override("hover", hover)
	button.add_theme_stylebox_override("pressed", hover)
	button.add_theme_stylebox_override("disabled", disabled)
	button.add_theme_color_override("font_color", Color(0.86, 0.94, 1.0))
	button.add_theme_color_override("font_hover_color", Color(1.0, 1.0, 1.0))
	button.add_theme_font_size_override("font_size", 12)

func _meter(value: float, maximum: float, color: Color) -> ProgressBar:
	var meter := ProgressBar.new()
	meter.min_value = 0
	meter.max_value = maximum
	meter.value = value
	meter.show_percentage = false
	meter.custom_minimum_size = Vector2(0, 7)
	var background := StyleBoxFlat.new()
	background.bg_color = Color(0.02, 0.03, 0.07, 0.9)
	background.set_corner_radius_all(4)
	var fill := StyleBoxFlat.new()
	fill.bg_color = color
	fill.set_corner_radius_all(4)
	meter.add_theme_stylebox_override("background", background)
	meter.add_theme_stylebox_override("fill", fill)
	return meter

func _card_color(card_type: String) -> Color:
	if card_type == "attack":
		return Color(1.0, 0.32, 0.42)
	if card_type == "skill":
		return Color(0.72, 0.4, 1.0)
	return Color(0.3, 0.85, 1.0)

func _populate_card(button: Button, card: Dictionary) -> void:
	var box := VBoxContainer.new()
	box.mouse_filter = Control.MOUSE_FILTER_IGNORE
	box.add_theme_constant_override("separation", 3)
	button.add_child(box)
	var cost := _section_label("◈  %d ENERGY" % int(card.cost), Color(0.32, 0.88, 1.0))
	box.add_child(cost)
	var name_label := Label.new()
	name_label.text = String(card.name)
	name_label.add_theme_font_size_override("font_size", 16)
	name_label.add_theme_color_override("font_color", Color(0.97, 0.98, 1.0))
	box.add_child(name_label)
	var type_label := _section_label(String(card.get("type", "skill")).to_upper(), _card_color(String(card.get("type", "skill"))))
	box.add_child(type_label)
	var desc := Label.new()
	desc.text = String(card.short_text)
	desc.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	desc.add_theme_font_size_override("font_size", 11)
	desc.add_theme_color_override("font_color", Color(0.66, 0.75, 0.85))
	box.add_child(desc)

func _populate_enemy_card(button: Button, enemy: Dictionary, index: int, skill: Dictionary, alive: bool) -> void:
	var box := VBoxContainer.new()
	box.mouse_filter = Control.MOUSE_FILTER_IGNORE
	box.add_theme_constant_override("separation", 4)
	button.add_child(box)
	var title := Label.new()
	title.text = ("◈ SELECTED  " if index == selected_enemy_index else "") + String(enemy.name)
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	title.add_theme_font_size_override("font_size", 15)
	title.add_theme_color_override("font_color", Color(1.0, 0.83, 0.43) if index == selected_enemy_index else Color(0.82, 0.93, 1.0))
	box.add_child(title)
	var sprite := TextureRect.new()
	sprite.texture = _texture_from_path(_enemy_sprite_path(String(enemy.get("id", ""))))
	sprite.custom_minimum_size = Vector2(0, 128)
	sprite.size_flags_vertical = Control.SIZE_EXPAND_FILL
	sprite.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	sprite.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	sprite.mouse_filter = Control.MOUSE_FILTER_IGNORE
	box.add_child(sprite)
	box.add_child(_meter(float(max(0, int(enemy.hp))), float(enemy.max_hp), Color(1.0, 0.25, 0.37)))
	box.add_child(_meter(float(enemy.seal), 100.0, Color(0.78, 0.32, 1.0)))
	var stats := _section_label("HP %d/%d    护盾 %d    魂印 %d/100" % [max(0, int(enemy.hp)), int(enemy.max_hp), int(enemy.block), int(enemy.seal)], Color(0.6, 0.75, 0.84))
	stats.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	box.add_child(stats)
	var intent := _section_label(("意图  //  %s" % String(skill.get("intent", "无"))) if alive else "STATUS  //  DEFEATED", Color(1.0, 0.55, 0.55) if alive else Color(0.5, 0.55, 0.62))
	intent.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	box.add_child(intent)

func _enemy_sprite_path(enemy_id: String) -> String:
	match enemy_id:
		"skeleton_soldier": return "res://assets/sprites/monster_01_skeleton_soldier.png"
		"skeleton_archer": return "res://assets/sprites/monster_02_skeleton_archer.png"
		"shadow_wraith": return "res://assets/sprites/monster_03_shadow_wraith.png"
		"bone_knight": return "res://assets/sprites/monster_04_bone_knight.png"
		"stitched_corpse": return "res://assets/sprites/monster_06_abyssal_tentacle_brute.png"
		"abyssal_tentacle_brute": return "res://assets/sprites/monster_06_abyssal_tentacle_brute.png"
		"crypt_lich": return "res://assets/sprites/monster_bonus_lich.png"
	return ""

func _make_unit_panel(title: String, body: String, color: Color, sprite_path: String = "") -> PanelContainer:
	var panel := _panel(color, Color(0.65, 0.35, 1.0, 0.55), 1, 7)
	panel.custom_minimum_size = Vector2(128, 0)
	var style := StyleBoxFlat.new()
	style.bg_color = color
	style.border_color = Color(0.55, 0.5, 0.45)
	style.border_width_left = 1
	style.border_width_right = 1
	style.border_width_top = 1
	style.border_width_bottom = 1
	panel.add_theme_stylebox_override("panel", style)
	var box := VBoxContainer.new()
	box.add_theme_constant_override("separation", 4)
	panel.add_child(box)
	var name_label := Label.new()
	name_label.text = title
	name_label.add_theme_font_size_override("font_size", 15)
	box.add_child(name_label)
	var sprite_texture := _texture_from_path(sprite_path)
	if sprite_texture != null:
		var sprite := TextureRect.new()
		sprite.name = "HeroPortrait" if title == "主人公" else "SoulPortrait"
		sprite.texture = sprite_texture
		sprite.custom_minimum_size = Vector2(112, 128)
		sprite.size_flags_vertical = Control.SIZE_EXPAND_FILL
		sprite.expand_mode = TextureRect.EXPAND_FIT_WIDTH_PROPORTIONAL
		sprite.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
		box.add_child(sprite)
	var body_label := Label.new()
	body_label.text = body
	body_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	box.add_child(body_label)
	return panel

func _texture_from_path(path: String) -> Texture2D:
	if path.is_empty() or not FileAccess.file_exists(path):
		return null
	return load(path) as Texture2D

func _soul_sprite_path(soul_id: String) -> String:
	if soul_id == "soul_skeleton_soldier":
		return "res://assets/sprites/monster_01_skeleton_soldier.png"
	if soul_id == "soul_skeleton_archer":
		return "res://assets/sprites/monster_02_skeleton_archer.png"
	if soul_id == "soul_shadow_wraith":
		return "res://assets/sprites/monster_03_shadow_wraith.png"
	if soul_id == "soul_stitched_corpse":
		return "res://assets/sprites/monster_06_abyssal_tentacle_brute.png"
	if soul_id == "soul_bone_knight":
		return "res://assets/sprites/monster_04_bone_knight.png"
	if soul_id == "soul_crypt_lich":
		return "res://assets/sprites/monster_bonus_lich.png"
	return ""

func _clear_children(node: Node) -> void:
	for child in node.get_children():
		child.queue_free()

func _log(text: String) -> void:
	if log_label == null:
		return
	log_label.append_text(text + "\n")
