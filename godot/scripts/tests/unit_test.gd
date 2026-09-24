extends SceneTree

const Unit = preload("res://scripts/core/unit.gd")
const UnitCard = preload("res://scripts/core/unit_card.gd")
const TurnScheduler = preload("res://scripts/core/turn_scheduler.gd")
const RunState = preload("res://scripts/core/run_state.gd")

func _initialize() -> void:
	var ally = Unit.new_from_dict({
		"id": "ally_a",
		"name": "Ally A",
		"faction": Unit.FACTION_ALLY,
		"hp": 20,
		"max_hp": 20,
	})
	assert(ally.is_alive())
	assert(ally.faction == Unit.FACTION_ALLY)
	assert(ally.cards.size() == 2)
	assert(ally.cards[0].type == UnitCard.TYPE_ATTACK)
	assert(ally.cards[1].type == UnitCard.TYPE_DEFENSE)

	var dead_enemy = Unit.new_from_dict({
		"id": "enemy_dead",
		"name": "Dead",
		"faction": Unit.FACTION_ENEMY,
		"hp": 0,
		"max_hp": 10,
	})
	var hero = Unit.new_from_dict({"id": "hero", "faction": Unit.FACTION_HERO, "hp": 10})
	var enemy = Unit.new_from_dict({"id": "enemy", "faction": Unit.FACTION_ENEMY, "hp": 10})
	var order = TurnScheduler.build_round_order(hero, [ally], [enemy, dead_enemy])
	assert(order.size() == 3)
	assert(order[0] == hero)
	assert(order[1] == ally)
	assert(order[2] == enemy)

	var run_state = RunState.new()
	run_state.reset_run()
	for index in range(3):
		run_state.add_soul({
			"id": "extra_%d" % index,
			"name": "Extra %d" % index,
			"hp": 10,
			"soul_atk": 2,
		})
	assert(run_state.roster.size() == 4)
	assert(run_state.active_souls.size() == 3)
	assert(run_state.active_units.size() == 3)
	print("UNIT_TEST_OK")
	quit(0)
