class_name UnitCard
extends RefCounted

const TYPE_ATTACK := "attack"
const TYPE_DEFENSE := "defense"

var id: String
var name: String
var type: String
var cost: int
var power: int
var target: String

func _init(
		card_id: String = "",
		card_name: String = "",
		card_type: String = TYPE_ATTACK,
		card_cost: int = 0,
		card_power: int = 0,
		card_target: String = "enemy_single"
	) -> void:
	id = card_id
	name = card_name
	type = card_type
	cost = card_cost
	power = card_power
	target = card_target

static func attack_for(unit_id: String, unit_name: String, power_value: int):
	return new(
		unit_id + "_attack",
		unit_name + " Attack",
		TYPE_ATTACK,
		0,
		power_value,
		"enemy_single"
	)

static func defense_for(unit_id: String, unit_name: String, power_value: int):
	return new(
		unit_id + "_defense",
		unit_name + " Defense",
		TYPE_DEFENSE,
		0,
		power_value,
		"self"
	)

func to_dict() -> Dictionary:
	return {
		"id": id,
		"name": name,
		"type": type,
		"cost": cost,
		"power": power,
		"target": target,
	}
