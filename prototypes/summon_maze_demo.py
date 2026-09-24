import random
import tkinter as tk
from dataclasses import dataclass, field
from pathlib import Path
from tkinter import messagebox, ttk

from PIL import Image, ImageTk


ROOT = Path(__file__).resolve().parent.parent
ASSET_DIR = ROOT / "游戏图"
CUTOUT_DIR = ASSET_DIR / "generated_cutouts"


@dataclass
class Enemy:
    key: str
    name: str
    image: str
    hp: int
    atk: int
    defense: int
    extract: float
    soul_atk: int
    large: bool = False
    max_hp: int = field(init=False)
    marked: bool = False
    defeated: bool = False

    def __post_init__(self):
        self.max_hp = self.hp


@dataclass
class Soul:
    name: str
    image: str
    soul_atk: int


class SummonMazeDemo:
    def __init__(self, root: tk.Tk):
        self.root = root
        self.root.title("Summon Maze - Python 战斗 Demo")
        self.root.geometry("1280x760")
        self.root.minsize(1060, 680)

        self.images: dict[tuple[str, tuple[int, int]], ImageTk.PhotoImage] = {}
        self.stage_index = 0
        self.enemies: list[Enemy] = []
        self.selected_enemy = 0
        self.souls: list[Soul] = []
        self.busy = False
        self.guarding = False

        self.player = {
            "level": 1,
            "max_hp": 150,
            "hp": 150,
            "max_mp": 100,
            "mp": 100,
            "atk": 22,
            "def": 9,
            "agi": 14,
            "mag": 18,
            "shards": 0,
        }

        self.stages = [
            {
                "title": "第一关：墓穴入口",
                "reward": "你听见第一缕灵魂回应了召唤。",
                "enemies": [
                    Enemy("skel", "骷髅兵", "monster_01_skeleton_soldier.png", 78, 13, 5, 0.72, 9),
                    Enemy("archer", "骷髅弓手", "monster_02_skeleton_archer.png", 62, 15, 3, 0.66, 11),
                ],
            },
            {
                "title": "第二关：深渊低语",
                "reward": "紫色雾气翻涌，军团的影子变得更长。",
                "enemies": [
                    Enemy("eye", "深渊眼魔", "monster_05_abyssal_eye.png", 96, 18, 4, 0.55, 14),
                    Enemy("spider", "暗影蜘蛛", "monster_07_shadow_spider.png", 82, 20, 4, 0.58, 13),
                ],
            },
            {
                "title": "第三关：虚空门前",
                "reward": "虚空门暂时沉默，亡灵军团完成了第一次试炼。",
                "enemies": [
                    Enemy("knight", "骸骨骑士", "monster_04_bone_knight.png", 138, 23, 8, 0.42, 19, True),
                    Enemy("void", "虚空碎片", "monster_10_void_shard.png", 118, 26, 6, 0.36, 20),
                ],
            },
        ]

        self.build_ui()
        self.new_game()

    def build_ui(self):
        self.root.configure(bg="#060814")
        self.canvas = tk.Canvas(self.root, bg="#060814", highlightthickness=0)
        self.canvas.pack(fill=tk.BOTH, expand=True)
        self.canvas.bind("<Configure>", lambda _event: self.render())
        self.canvas.bind("<Button-1>", self.on_canvas_click)

        self.bottom = tk.Frame(self.root, bg="#080b18", highlightbackground="#31566a", highlightthickness=1)
        self.bottom.pack(fill=tk.X, side=tk.BOTTOM)

        self.buttons = tk.Frame(self.bottom, bg="#080b18")
        self.buttons.pack(side=tk.LEFT, padx=12, pady=10)

        self.attack_btn = self.make_button("普通攻击", lambda: self.player_action("attack"))
        self.lash_btn = self.make_button("灵魂鞭笞\nMP 25", lambda: self.player_action("lash"))
        self.arise_btn = self.make_button("Arise\n亡灵助战", lambda: self.player_action("arise"))
        self.guard_btn = self.make_button("防御", lambda: self.player_action("guard"))
        self.stats_btn = self.make_button("属性面板", self.open_stats)
        self.restart_btn = self.make_button("重新开始", self.new_game)

        self.log = tk.Text(
            self.bottom,
            height=7,
            bg="#050712",
            fg="#dcecff",
            insertbackground="#dcecff",
            relief=tk.FLAT,
            wrap=tk.WORD,
            font=("Microsoft YaHei", 10),
        )
        self.log.pack(side=tk.RIGHT, fill=tk.BOTH, expand=True, padx=10, pady=10)
        self.log.configure(state=tk.DISABLED)

    def make_button(self, text: str, command):
        button = tk.Button(
            self.buttons,
            text=text,
            command=command,
            width=12,
            height=2,
            bg="#172039",
            fg="#eef7ff",
            activebackground="#2c3f6e",
            activeforeground="#ffffff",
            relief=tk.FLAT,
            font=("Microsoft YaHei", 10, "bold"),
        )
        button.pack(side=tk.LEFT, padx=4)
        return button

    def load_image(self, relative: str, size: tuple[int, int]) -> ImageTk.PhotoImage:
        key = (relative, size)
        if key in self.images:
            return self.images[key]

        path = ASSET_DIR / relative if (ASSET_DIR / relative).exists() else CUTOUT_DIR / relative
        image = Image.open(path).convert("RGBA")
        if relative == "battle_background_maze_gate.png":
            image = self.cover_resize(image, size)
        else:
            image.thumbnail(size, Image.Resampling.LANCZOS)
        photo = ImageTk.PhotoImage(image)
        self.images[key] = photo
        return photo

    @staticmethod
    def cover_resize(image: Image.Image, size: tuple[int, int]) -> Image.Image:
        target_w, target_h = size
        src_w, src_h = image.size
        scale = max(target_w / src_w, target_h / src_h)
        resized = image.resize((round(src_w * scale), round(src_h * scale)), Image.Resampling.LANCZOS)
        left = max(0, (resized.width - target_w) // 2)
        top = max(0, (resized.height - target_h) // 2)
        return resized.crop((left, top, left + target_w, top + target_h))

    def new_game(self):
        self.stage_index = 0
        self.souls = []
        self.player = {
            "level": 1,
            "max_hp": 150,
            "hp": 150,
            "max_mp": 100,
            "mp": 100,
            "atk": 22,
            "def": 9,
            "agi": 14,
            "mag": 18,
            "shards": 0,
        }
        self.clear_log()
        self.load_stage(0)
        self.add_log("你踏入迷宫，灵魂之火在掌心燃起。")

    def load_stage(self, index: int):
        self.stage_index = index
        stage = self.stages[index]
        self.enemies = [
            Enemy(e.key, e.name, e.image, e.max_hp, e.atk, e.defense, e.extract, e.soul_atk, e.large)
            for e in stage["enemies"]
        ]
        self.selected_enemy = 0
        self.guarding = False
        self.player["mp"] = min(self.player["max_mp"], self.player["mp"] + 18)
        self.add_log(f"{stage['title']} 开始。")
        self.render()

    def render(self):
        width = max(1, self.canvas.winfo_width())
        height = max(1, self.canvas.winfo_height())
        self.canvas.delete("all")

        bg = self.load_image("battle_background_maze_gate.png", (width, height))
        self.canvas.create_image(width // 2, height // 2, image=bg)
        self.canvas.create_rectangle(0, 0, width, height, fill="#02040c", stipple="gray25", outline="")

        self.draw_top_panel(width)
        self.draw_units(width, height)
        self.draw_status(width, height)
        self.update_buttons()

    def draw_top_panel(self, width: int):
        self.canvas.create_rectangle(24, 20, width - 24, 92, fill="#080b18", outline="#31566a")
        self.canvas.create_text(
            46,
            40,
            text="Summon Maze",
            fill="#39d8ff",
            anchor=tk.W,
            font=("Microsoft YaHei", 11, "bold"),
        )
        self.canvas.create_text(
            46,
            68,
            text=self.stages[self.stage_index]["title"],
            fill="#ffffff",
            anchor=tk.W,
            font=("Microsoft YaHei", 22, "bold"),
        )
        target = self.get_target()
        target_name = target.name if target else "无"
        self.canvas.create_text(
            width - 44,
            58,
            text=f"当前目标：{target_name}",
            fill="#d7b65a",
            anchor=tk.E,
            font=("Microsoft YaHei", 13, "bold"),
        )

    def draw_units(self, width: int, height: int):
        ground_y = int(height * 0.78)

        hero_img = self.load_image("protagonist_necromancer.png", (255, 360))
        self.canvas.create_oval(115, ground_y - 18, 345, ground_y + 18, fill="#03050c", outline="")
        self.canvas.create_image(230, ground_y - 158, image=hero_img)
        self.canvas.create_text(230, ground_y + 34, text="死灵召唤师", fill="#ffffff", font=("Microsoft YaHei", 13, "bold"))
        self.draw_bar(125, ground_y + 50, 335, ground_y + 62, self.player["hp"], self.player["max_hp"], "#ff5268")
        self.draw_bar(125, ground_y + 68, 335, ground_y + 78, self.player["mp"], self.player["max_mp"], "#43dfff")
        self.canvas.create_text(
            230,
            ground_y + 98,
            text=f"HP {self.player['hp']}/{self.player['max_hp']}   MP {self.player['mp']}/{self.player['max_mp']}",
            fill="#b9c9de",
            font=("Microsoft YaHei", 10),
        )

        live_count = max(1, len(self.enemies))
        start_x = width - 300 - (live_count - 1) * 180
        self.enemy_boxes = []
        for index, enemy in enumerate(self.enemies):
            x = start_x + index * 250
            max_size = (250, 320) if enemy.large else (205, 265)
            enemy_img = self.load_image(enemy.image, max_size)
            box = (x - 110, ground_y - 310, x + 110, ground_y + 92)
            self.enemy_boxes.append((box, index))

            outline = "#d7b65a" if index == self.selected_enemy and not enemy.defeated else "#31566a"
            fill = "#0a0d1b" if not enemy.defeated else "#090a0f"
            self.canvas.create_rectangle(*box, fill=fill, outline=outline, width=2)
            if enemy.defeated:
                self.canvas.create_text(x, ground_y - 145, text="已击败", fill="#8992a5", font=("Microsoft YaHei", 18, "bold"))
            else:
                self.canvas.create_image(x, ground_y - 145, image=enemy_img)

            label = enemy.name + (" · 标记" if enemy.marked and not enemy.defeated else "")
            self.canvas.create_text(x, ground_y + 16, text=label, fill="#ffffff", font=("Microsoft YaHei", 12, "bold"))
            self.draw_bar(x - 88, ground_y + 34, x + 88, ground_y + 46, enemy.hp, enemy.max_hp, "#ff5268")
            self.canvas.create_text(
                x,
                ground_y + 64,
                text=f"HP {max(0, enemy.hp)}/{enemy.max_hp}",
                fill="#b9c9de",
                font=("Microsoft YaHei", 10),
            )

    def draw_status(self, width: int, height: int):
        panel_y = 104
        self.canvas.create_rectangle(24, panel_y, 300, panel_y + 112, fill="#080b18", outline="#31566a")
        self.canvas.create_text(
            42,
            panel_y + 24,
            text=f"等级 {self.player['level']}   灵魂碎片 {self.player['shards']}",
            fill="#ffffff",
            anchor=tk.W,
            font=("Microsoft YaHei", 12, "bold"),
        )
        self.canvas.create_text(
            42,
            panel_y + 54,
            text=f"ATK {self.player['atk']}  DEF {self.player['def']}  AGI {self.player['agi']}  MAG {self.player['mag']}",
            fill="#c8d7ee",
            anchor=tk.W,
            font=("Microsoft YaHei", 10),
        )
        souls_text = "、".join(soul.name for soul in self.souls) if self.souls else "暂无亡灵"
        self.canvas.create_text(
            42,
            panel_y + 84,
            text=f"亡灵：{souls_text}",
            fill="#b34dff",
            anchor=tk.W,
            font=("Microsoft YaHei", 10, "bold"),
            width=236,
        )

    def draw_bar(self, x1: int, y1: int, x2: int, y2: int, value: int, max_value: int, color: str):
        self.canvas.create_rectangle(x1, y1, x2, y2, fill="#1b2236", outline="")
        ratio = 0 if max_value <= 0 else max(0, min(1, value / max_value))
        self.canvas.create_rectangle(x1, y1, x1 + (x2 - x1) * ratio, y2, fill=color, outline="")

    def update_buttons(self):
        target = self.get_target()
        locked = self.busy or target is None
        for button in (self.attack_btn, self.lash_btn, self.guard_btn):
            button.configure(state=tk.DISABLED if locked else tk.NORMAL)
        self.lash_btn.configure(state=tk.DISABLED if locked or self.player["mp"] < 25 else tk.NORMAL)
        self.arise_btn.configure(state=tk.DISABLED if self.busy or not self.souls else tk.NORMAL)

    def on_canvas_click(self, event):
        if self.busy:
            return
        for box, index in getattr(self, "enemy_boxes", []):
            x1, y1, x2, y2 = box
            if x1 <= event.x <= x2 and y1 <= event.y <= y2 and not self.enemies[index].defeated:
                self.selected_enemy = index
                self.render()
                return

    def get_target(self):
        if self.enemies and 0 <= self.selected_enemy < len(self.enemies):
            enemy = self.enemies[self.selected_enemy]
            if not enemy.defeated:
                return enemy
        for index, enemy in enumerate(self.enemies):
            if not enemy.defeated:
                self.selected_enemy = index
                return enemy
        return None

    def player_action(self, action: str):
        if self.busy:
            return

        target = self.get_target()
        if action not in {"guard", "arise"} and target is None:
            return

        self.busy = True
        self.guarding = False

        if action == "attack":
            damage = random.randint(self.player["atk"] - 3, self.player["atk"] + 5) - target.defense
            self.damage_enemy(target, damage, "普通攻击")
        elif action == "lash":
            self.player["mp"] -= 25
            target.marked = True
            damage = round(self.player["mag"] * 1.65) + random.randint(0, 7) - target.defense // 2
            self.damage_enemy(target, damage, "灵魂鞭笞")
            self.add_log(f"{target.name} 被灵魂标记，提取概率提高。")
        elif action == "arise":
            self.add_log("你低声命令：Arise.")
            self.soul_assist(True)
        elif action == "guard":
            self.guarding = True
            self.add_log("你摆出防御架势，本回合受到的伤害降低。")

        if action != "arise":
            self.soul_assist(False)

        self.player["mp"] = min(self.player["max_mp"], self.player["mp"] + 8)
        self.handle_defeated()
        if self.check_battle_end():
            self.render()
            return

        self.enemy_turn()
        if self.player["hp"] <= 0:
            self.render()
            messagebox.showinfo("战斗失败", "主人公倒下了，迷宫重新吞没一切。")
            self.new_game()
            return

        self.busy = False
        self.render()

    def soul_assist(self, empowered: bool):
        if not self.souls:
            return

        helpers = self.souls if empowered else self.souls[:2]
        for soul in helpers:
            target = self.get_target()
            if target is None:
                return
            multiplier = 1.45 if empowered else 1.0
            damage = round((soul.soul_atk + random.randint(-2, 4)) * multiplier)
            self.damage_enemy(target, damage, f"{soul.name} 的亡灵攻击")

    def damage_enemy(self, enemy: Enemy, amount: int, source: str):
        damage = max(1, amount)
        enemy.hp = max(0, enemy.hp - damage)
        self.add_log(f"{source} 对 {enemy.name} 造成 {damage} 点伤害。")
        if enemy.hp <= 0 and not enemy.defeated:
            enemy.defeated = True
            self.add_log(f"{enemy.name} 倒下了，灵魂正在消散。")

    def handle_defeated(self):
        for enemy in self.enemies:
            if enemy.defeated and not getattr(enemy, "resolved", False):
                enemy.resolved = True
                self.try_extract(enemy)

    def try_extract(self, enemy: Enemy):
        chance = self.extract_chance(enemy)
        if len(self.souls) >= 4:
            self.player["shards"] += 4
            self.add_log(f"亡灵槽位已满，{enemy.name} 化为 4 个灵魂碎片。")
            return

        answer = messagebox.askyesno(
            "提取灵魂",
            f"{enemy.name} 的灵魂仍在震颤。\n当前成功率：{round(chance * 100)}%\n\n是否尝试提取？",
        )
        if not answer:
            self.player["shards"] += 3
            self.add_log(f"{enemy.name} 的残魂被收束为 3 个灵魂碎片。")
            return

        if random.random() <= chance:
            self.souls.append(Soul(enemy.name, enemy.image, enemy.soul_atk))
            self.player["mag"] += 1
            self.player["shards"] += 1
            self.add_log(f"提取成功！{enemy.name} 加入亡灵军团。")
        else:
            shards = 6 if enemy.marked else 4
            self.player["shards"] += shards
            self.add_log(f"提取失败，灵魂破碎为 {shards} 个灵魂碎片。")

    def extract_chance(self, enemy: Enemy) -> float:
        stat_boost = self.player["mag"] * 0.004 + self.player["max_mp"] * 0.001
        mark_boost = 0.16 if enemy.marked else 0
        stage_boost = self.stage_index * 0.04
        return min(0.92, enemy.extract + stat_boost + mark_boost + stage_boost)

    def enemy_turn(self):
        for enemy in self.enemies:
            if enemy.defeated:
                continue
            guard_factor = 0.45 if self.guarding else 1.0
            raw = enemy.atk + random.randint(-3, 5) - int(self.player["def"] * 0.55)
            damage = max(1, round(raw * guard_factor))
            self.player["hp"] = max(0, self.player["hp"] - damage)
            self.add_log(f"{enemy.name} 反击，造成 {damage} 点伤害。")

    def check_battle_end(self) -> bool:
        if not all(enemy.defeated for enemy in self.enemies):
            return False

        stage = self.stages[self.stage_index]
        self.level_up()
        if self.stage_index == len(self.stages) - 1:
            messagebox.showinfo(
                "Demo 通关",
                f"{stage['reward']}\n你完成了三关战斗，并带着 {len(self.souls)} 只亡灵离开迷宫。",
            )
            self.new_game()
        else:
            messagebox.showinfo("关卡胜利", f"{stage['reward']}\n等级提升，属性变强。")
            self.busy = False
            self.load_stage(self.stage_index + 1)
        return True

    def level_up(self):
        self.player["level"] += 1
        self.player["max_hp"] += 12
        self.player["max_mp"] += 8
        self.player["atk"] += 2
        self.player["def"] += 1
        self.player["mag"] += 2
        self.player["hp"] = min(self.player["max_hp"], self.player["hp"] + 45)
        self.player["mp"] = min(self.player["max_mp"], self.player["mp"] + 35)

    def open_stats(self):
        window = tk.Toplevel(self.root)
        window.title("角色属性")
        window.geometry("520x560")
        window.configure(bg="#080b18")
        window.transient(self.root)

        title = tk.Label(
            window,
            text="死灵召唤师",
            bg="#080b18",
            fg="#ffffff",
            font=("Microsoft YaHei", 18, "bold"),
        )
        title.pack(anchor=tk.W, padx=18, pady=(18, 8))

        stats_frame = tk.Frame(window, bg="#080b18")
        stats_frame.pack(fill=tk.X, padx=18)

        stats = [
            ("等级", self.player["level"]),
            ("生命", f"{self.player['hp']}/{self.player['max_hp']}"),
            ("魔力", f"{self.player['mp']}/{self.player['max_mp']}"),
            ("攻击", self.player["atk"]),
            ("防御", self.player["def"]),
            ("敏捷", self.player["agi"]),
            ("魔法强度", self.player["mag"]),
            ("灵魂碎片", self.player["shards"]),
            ("亡灵数量", f"{len(self.souls)}/4"),
        ]

        for row, (label, value) in enumerate(stats):
            card = tk.Frame(stats_frame, bg="#11172a", highlightbackground="#31566a", highlightthickness=1)
            card.grid(row=row // 3, column=row % 3, padx=4, pady=4, sticky="nsew")
            tk.Label(card, text=label, bg="#11172a", fg="#9eb7d6", font=("Microsoft YaHei", 9)).pack(pady=(8, 0))
            tk.Label(card, text=value, bg="#11172a", fg="#ffffff", font=("Microsoft YaHei", 14, "bold")).pack(pady=(0, 8))

        for column in range(3):
            stats_frame.grid_columnconfigure(column, weight=1)

        tk.Label(
            window,
            text="亡灵军团",
            bg="#080b18",
            fg="#b34dff",
            font=("Microsoft YaHei", 14, "bold"),
        ).pack(anchor=tk.W, padx=18, pady=(18, 6))

        list_frame = tk.Frame(window, bg="#080b18")
        list_frame.pack(fill=tk.BOTH, expand=True, padx=18, pady=(0, 18))

        if not self.souls:
            tk.Label(
                list_frame,
                text="还没有亡灵。击败敌人后尝试提取它们的灵魂。",
                bg="#080b18",
                fg="#c8d7ee",
                font=("Microsoft YaHei", 11),
                wraplength=450,
                justify=tk.LEFT,
            ).pack(anchor=tk.W)
        else:
            for soul in self.souls:
                row = tk.Frame(list_frame, bg="#11172a", highlightbackground="#50366f", highlightthickness=1)
                row.pack(fill=tk.X, pady=4)
                tk.Label(
                    row,
                    text=f"{soul.name}   助战伤害 {soul.soul_atk}",
                    bg="#11172a",
                    fg="#ffffff",
                    font=("Microsoft YaHei", 11, "bold"),
                ).pack(anchor=tk.W, padx=10, pady=9)

    def add_log(self, text: str):
        self.log.configure(state=tk.NORMAL)
        self.log.insert("1.0", text + "\n")
        self.log.configure(state=tk.DISABLED)

    def clear_log(self):
        self.log.configure(state=tk.NORMAL)
        self.log.delete("1.0", tk.END)
        self.log.configure(state=tk.DISABLED)


def check_assets():
    required = [
        ASSET_DIR / "battle_background_maze_gate.png",
        CUTOUT_DIR / "protagonist_necromancer.png",
        CUTOUT_DIR / "monster_01_skeleton_soldier.png",
        CUTOUT_DIR / "monster_02_skeleton_archer.png",
        CUTOUT_DIR / "monster_04_bone_knight.png",
        CUTOUT_DIR / "monster_05_abyssal_eye.png",
        CUTOUT_DIR / "monster_07_shadow_spider.png",
        CUTOUT_DIR / "monster_10_void_shard.png",
    ]
    missing = [str(path) for path in required if not path.exists()]
    if missing:
        raise FileNotFoundError("缺少素材：\n" + "\n".join(missing))


if __name__ == "__main__":
    check_assets()
    app_root = tk.Tk()
    style = ttk.Style()
    try:
        style.theme_use("clam")
    except tk.TclError:
        pass
    SummonMazeDemo(app_root)
    app_root.mainloop()
