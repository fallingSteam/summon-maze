class_name TurnScheduler
extends RefCounted

static func build_round_order(hero, allies: Array, enemies: Array) -> Array:
	var order: Array = []
	if hero != null and hero.is_alive():
		order.append(hero)
	for unit in allies:
		if unit != null and unit.has_method("is_alive") and unit.is_alive():
			order.append(unit)
	for unit in enemies:
		if unit != null and unit.has_method("is_alive") and unit.is_alive():
			order.append(unit)
	return order

static func build_extra_turn_order(allies: Array, enemies: Array) -> Array:
	var order: Array = []
	for unit in allies:
		if unit != null and unit.has_method("is_alive") and unit.is_alive():
			order.append(unit)
	for unit in enemies:
		if unit != null and unit.has_method("is_alive") and unit.is_alive():
			order.append(unit)
	return order
