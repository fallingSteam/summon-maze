# Summon Maze

Summon Maze 是一个黑暗奇幻卡牌战斗原型。仓库目前保留一条主线和两个早期原型：

- `godot/`：当前主线，使用 Godot 4 制作的章节探索 + 战斗切片。
- 根目录 `index.html` + `web/`：早期浏览器演示，用于快速验证卡牌和魂印机制，不参与 Godot 运行时。
- `prototypes/summon_maze_demo.py`：早期 Tk/Python 原型，仅用于试验战斗交互和素材，不参与 Godot 运行时。

## 架构总览

Godot 主线按职责拆分为五层。依赖只允许从上层指向下层，数据和领域状态不反向依赖 UI。

```text
godot/scenes/*.tscn
    │
    ▼
godot/scripts/app/main.gd           应用编排：切换 Map/Battle/Prep/Result
    │                    │
    ▼                    ▼
godot/scripts/ui/*.gd       godot/scripts/core/run_state.gd
界面控制器与交互              一局游戏的领域状态、奖励、队伍和装备规则
    │                         │
    └──────────────┬──────────┘
                   ▼
           godot/scripts/data/data_loader.gd
                   │
                   ▼
              godot/data/*.json
```

### 目录职责

当前代码目录如下（设计文档和美术素材目录略去展开）：

```text
.
├── index.html                  浏览器演示入口
├── web/
│   ├── js/data/               浏览器演示数据
│   ├── js/core/               浏览器演示逻辑
│   ├── js/ui/                 浏览器演示界面
│   └── main.js                浏览器演示入口
├── prototypes/                 早期 Tk/Python 原型
└── godot/
    ├── project.godot           Godot 工程配置
    ├── scenes/                 场景挂载
    ├── scripts/
    │   ├── app/               应用编排
    │   ├── core/              领域状态
    │   ├── data/              数据访问
    │   ├── ui/                页面控制器
    │   └── tests/             smoke test
    ├── data/                  JSON 内容数据
    └── assets/                运行时素材
```

| 目录 | 职责 | 可以依赖 |
| --- | --- | --- |
| `godot/scenes/` | 场景壳和脚本挂载点，不放游戏规则 | `godot/scripts/` |
| `godot/scripts/app/` | 应用入口和流程编排；决定当前显示哪个场景 | `core`、`ui`、场景 |
| `godot/scripts/core/` | 与画面无关的单局状态和领域规则（`run_state.gd`） | `data` |
| `godot/scripts/ui/` | Map、Battle、Prep、Result 的界面构建、按钮和信号 | `core`、`data`、资源 |
| `godot/scripts/data/` | JSON 读取等基础设施 | Godot 文件 API |
| `godot/scripts/tests/` | smoke test 和集成验证 | 所有被测层 |
| `godot/data/` | 卡牌、敌人、亡灵、装备、地图节点等可调数据 | 无代码依赖 |
| `godot/assets/` | 精灵、背景等资源 | 无代码依赖 |
| `web/` | 早期浏览器演示的 JavaScript 和 CSS；以根目录 `index.html` 作为入口 | 根目录素材 |
| `web/js/data/` | 浏览器演示的静态卡牌、敌人、装备和关卡数据 | 无 |
| `web/js/core/` | 浏览器演示的状态、回合、战斗和结算逻辑 | `data`、`ui` 回调 |
| `web/js/ui/` | DOM 引用、渲染和提取弹窗 | `core` 状态 |
| `web/legacy/` | 拆分前的单文件快照，仅供历史对照，不被入口加载 | 无 |
| `prototypes/` | Tk/Python 交互原型和一次性验证脚本 | 根目录素材 |
| `策划书/`、`新策划书/` | 设计文档和机制资料，不被运行时代码读取 | 无 |

### 核心依赖关系

- `app/main.gd` 创建并持有唯一的 `RunState`，将它注入各 UI 控制器。
- `core/run_state.gd` 是跨场景共享状态的唯一来源：主人公、亡灵花名册、装备、节点进度、奖励和胜负状态都在这里维护。
- `ui/battle_controller.gd` 负责当前切片的战斗场景显示、输入和场景内战斗编排，并通过 `RunState` 读写跨场景结果；卡牌和敌人定义来自 `data/*.json`。
- `ui/map_controller.gd`、`ui/prep_controller.gd`、`ui/result_controller.gd` 分别负责地图选择、战后整备和结算展示，不复制状态规则。
- `data/data_loader.gd` 是 JSON 的唯一读取入口。新增数据文件时，优先在数据层接入，不要在 UI 控制器中直接散落文件读取。

## 运行与验证

### 一键启动

双击项目根目录下的 `启动游戏.bat`，即可直接启动 Godot 游戏。脚本默认使用 Godot 4.6.3 路径：

```text
D:\Godot_v4.6.3-stable_win64.exe\Godot_v4.6.3-stable_win64.exe
```

如果你的 Godot 安装位置不同，修改 `启动游戏.bat` 中的 `GODOT_EXE` 即可。

### Godot 主线

1. 用 Godot 4.6 或兼容的 Godot 4.x 打开 `godot/project.godot`。
2. 运行项目，入口场景是 `godot/scenes/Main.tscn`。
3. 运行 smoke test：

   ```text
   godot --headless --path godot --script res://scripts/tests/smoke_test.gd
   ```

   预期输出 `SMOKE_OK`。

### 浏览器演示

直接打开根目录 `index.html` 即可运行早期浏览器演示。它按“数据 → 状态/生命周期 → DOM → 渲染 → 战斗 → 提取/结算 → 入口”的顺序加载 `web/js/` 模块，并加载 `web/styles.css`。它与 Godot 主线的数据和进度状态相互独立；修改 Godot 代码不会自动改变该演示。

浏览器原型仍使用经典脚本的共享作用域，因此 `index.html` 中的加载顺序就是它的依赖声明；`web/legacy/game.js` 不再被入口加载。

## 修改指南

- 调整数值、卡牌、敌人、装备或地图节点：修改 `godot/data/*.json`。
- 修改跨场景规则或持久状态：修改 `godot/scripts/core/run_state.gd`，并补充 smoke test。
- 修改单个页面的布局和输入：只改对应的 `godot/scripts/ui/*_controller.gd` 或场景文件。
- 修改页面切换、开始/结束流程：改 `godot/scripts/app/main.gd`。
- 新增能力时先判断它属于数据、领域规则还是 UI，避免把规则写进控制器。

当前切片的战斗回合循环仍集中在 `ui/battle_controller.gd`，因为它和战斗画面刷新高度耦合；后续规则稳定后，再将纯战斗规则抽到 `core/battle_rules.gd`，控制器只保留输入和展示适配。

## 当前边界

浏览器演示是早期原型，Godot 版本是后续的主线实现。两者暂不共享运行时代码，以便各自快速迭代；若未来只保留一条实现，应以 Godot 的 `core` + `data` 为规则来源，再为需要的客户端提供适配层。
