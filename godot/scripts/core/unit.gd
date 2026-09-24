class_name Unit
extends RefCounted

const UnitCard := preload("res://scripts/core/unit_card.gd")

const FACTION_HERO := "hero"
const FACTION_ALLY := "ally"
const FACTION_ENEMY := "enemy"

var id: String
var display_name: String
var faction: String
var role: String
var hp: int
var max_hp: int
var block: int
var power: int
var cards: Array = []
var source_data: Dictionary = {}

static func new_from_dict(data: Dictionary):
	var unit := new()
	unit.id = String(data.get("id", "unit"))
	unit.display_name = String(data.get("name", unit.id))
	unit.faction = String(data.get("faction", FACTION_ENEMY))
	unit.role = String(data.get("role", ""))
	unit.max_hp = max(1, int(data.get("max_hp", data.get("hp", 1))))
	unit.hp = clamp(int(data.get("hp", unit.max_hp)), 0, unit.max_hp)
	unit.block = int(data.get("block", 0))
	unit.power = int(data.get("power", 0))
	unit.source_data = data.duplicate(true)
	unit.cards = _cards_from_dict(unit.id, unit.display_name, data)
	return unit

static func _cards_from_dict(unit_id: String, unit_name: String, data: Dictionary) -> Array:
	var result: Array = []
	var raw_cards: Array = data.get("unit_cards", [])
	for raw_card in raw_cards:
		if raw_card is Dictionary:
			result.append(UnitCard.new(
				String(raw_card.get("id", unit_id + "_card")),
				String(raw_card.get("name", "Unit Card")),
				String(raw_card.get("type", UnitCard.TYPE_ATTACK)),
				int(raw_card.get("cost", 0)),
				int(raw_card.get("power", 0)),
				String(raw_card.get("target", "enemy_single"))
			))
	if result.is_empty():
		var attack_power := int(data.get("unit_attack", data.get("soul_atk", data.get("atk", 1))))
		var defense_power := int(data.get("unit_defense", 5))
		result.append(UnitCard.attack_for(unit_id, unit_name, max(1, attack_power)))
		result.append(UnitCard.defense_for(unit_id, unit_name, max(0, defense_power)))
	return result

func is_alive() -> bool:
	return hp > 0

func has_faction(expected: String) -> bool:
	return faction == expected

func to_dict() -> Dictionary:
	return {
		"id": id,
		"name": display_name,
		"faction": faction,
		"role": role,
		"hp": hp,
		"max_hp": max_hp,
		"block": block,
		"power": power,
		"unit_cards": cards.map(func(card: UnitCard): return card.to_dict()),
	}
