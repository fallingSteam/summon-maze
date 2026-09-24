# Unit Turn Architecture Design

## Goal

将战斗中的敌人和可召唤单位统一为 `Unit` 数据模型，并为每个自有单位提供独立的攻击牌、防御牌和额外行动回合；编队最多同时激活 3 个自有单位。

## Architecture

- `godot/scripts/core/unit.gd` 定义无 UI 依赖的单位状态、阵营、生命、护盾、行动牌和运行时状态。
- `godot/scripts/core/unit_card.gd` 定义单位行动牌的最小数据结构和攻击/防御执行结果。
- `godot/scripts/core/turn_scheduler.gd` 只负责回合顺序：主人公行动结束后，依次执行存活自有单位，再依次执行存活敌人。
- `run_state.gd` 维护自有单位 roster/active_units，并保留 `active_souls` 兼容接口；现有 `battle_controller.gd` 先用适配方法创建和调度单位。
- JSON 数据继续作为内容来源。现有敌人和亡灵数据通过工厂方法转换成统一 `Unit`，不会在此阶段删除旧字段。

## Rules

1. `Unit.faction` 取 `hero`、`ally` 或 `enemy`。
2. 每个单位有 `unit_cards`，默认至少包含一张攻击牌和一张防御牌。
3. 主人公结束回合后，存活 `ally` 单位各执行一次额外回合，再执行存活 `enemy` 单位回合。
4. `active_units` 最多 3 个；死亡单位不能占用有效行动，但在结算前仍可由战斗 UI 显示。
5. 单位牌的执行先输出结构化 action dictionary；具体伤害、目标选择和日志仍由战斗控制器适配，以降低迁移风险。

## Testing

- 单元测试验证 `Unit` 的初始化和默认攻击/防御牌。
- `RunState` 测试验证 active unit 上限为 3，第四个单位保留在 roster 但不自动激活。
- 调度器测试验证行动顺序和死亡单位跳过规则。
- 现有 smoke test 继续验证场景可实例化、牌组可抽取、战斗可结束。
