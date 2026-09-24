// Data catalog: stages, enemy skills, cards, equipment, and player defaults.

const asset = (path) => path;

const stages = [
  {
    title: "第一关：墓穴入口",
    reward: "你听见第一缕灵魂回应了召唤。",
    enemies: [
      {
        id: "skel",
        name: "骷髅兵",
        img: asset("游戏图/generated_cutouts/monster_01_skeleton_soldier.png"),
        hp: 78,
        atk: 13,
        def: 5,
        extract: 0.72,
        soulAtk: 9,
      },
      {
        id: "archer",
        name: "骷髅弓手",
        img: asset("游戏图/generated_cutouts/monster_02_skeleton_archer.png"),
        hp: 62,
        atk: 15,
        def: 3,
        extract: 0.66,
        soulAtk: 11,
      },
    ],
  },
  {
    title: "第二关：深渊低语",
    reward: "紫色雾气翻涌，军团的影子变得更长。",
    enemies: [
      {
        id: "eye",
        name: "深渊眼魔",
        img: asset("游戏图/generated_cutouts/monster_05_abyssal_eye.png"),
        hp: 96,
        atk: 18,
        def: 4,
        extract: 0.55,
        soulAtk: 14,
      },
      {
        id: "spider",
        name: "暗影蜘蛛",
        img: asset("游戏图/generated_cutouts/monster_07_shadow_spider.png"),
        hp: 82,
        atk: 20,
        def: 4,
        extract: 0.58,
        soulAtk: 13,
      },
    ],
  },
  {
    title: "第三关：虚空门前",
    reward: "虚空门暂时沉默，亡灵军团完成了第一次试炼。",
    enemies: [
      {
        id: "knight",
        name: "骸骨骑士",
        img: asset("游戏图/generated_cutouts/monster_04_bone_knight.png"),
        hp: 138,
        atk: 23,
        def: 8,
        extract: 0.42,
        soulAtk: 19,
        large: true,
      },
      {
        id: "void",
        name: "虚空碎片",
        img: asset("游戏图/generated_cutouts/monster_10_void_shard.png"),
        hp: 118,
        atk: 26,
        def: 6,
        extract: 0.36,
        soulAtk: 20,
      },
    ],
  },
];

const enemySkillCatalog = {
  skel: [
    {
      id: "bone_slash",
      name: "破骨斩",
      type: "attack",
      intent: "攻击 13",
      weight: 5,
      execute: (enemy) => dealPlayerDamage(enemy, roll(11, 15), "破骨斩"),
    },
    {
      id: "raise_shield",
      name: "举盾",
      type: "defend",
      intent: "防御 12",
      weight: 3,
      condition: (enemy) => enemy.hp <= enemy.maxHp * 0.72,
      execute: (enemy) => {
        enemy.shield += 12;
        addLog(`<strong>${enemy.name}</strong> 举盾，获得 12 点护盾。`);
      },
    },
    {
      id: "shield_bash",
      name: "盾击",
      type: "control",
      intent: "攻击 8 + 虚弱",
      weight: 3,
      execute: (enemy) => {
        dealPlayerDamage(enemy, roll(7, 10), "盾击");
        state.playerEffects.attackDown = Math.max(state.playerEffects.attackDown, 1);
        addLog("主人公被盾击压制，下回合攻击牌伤害降低。");
      },
    },
    {
      id: "death_guard",
      name: "死守",
      type: "defend",
      intent: "防御 8 + 保护",
      weight: 2,
      condition: (enemy) => liveEnemies().some((ally) => ally.id !== enemy.id && !ally.defeated),
      execute: (enemy) => {
        enemy.shield += 8;
        enemy.protectTurns = 1;
        addLog(`<strong>${enemy.name}</strong> 死守阵线，将保护其他敌人一次。`);
      },
    },
  ],
  archer: [
    {
      id: "bone_arrow",
      name: "骨箭射击",
      type: "attack",
      intent: "攻击 15",
      weight: 5,
      execute: (enemy) => {
        const bonus = consumeEnemyAim(enemy);
        dealPlayerDamage(enemy, roll(13, 17) + bonus, "骨箭射击");
      },
    },
    {
      id: "aim",
      name: "瞄准",
      type: "buff",
      intent: "强化：精准",
      weight: 3,
      condition: (enemy) => !enemy.aimed,
      execute: (enemy) => {
        enemy.aimed = true;
        addLog(`<strong>${enemy.name}</strong> 正在瞄准，下一次攻击伤害提高。`);
      },
    },
    {
      id: "piercing_arrow",
      name: "穿刺箭",
      type: "multi",
      intent: "攻击 10 x2",
      weight: 3,
      execute: (enemy) => {
        const bonus = consumeEnemyAim(enemy);
        dealPlayerDamage(enemy, roll(8, 11) + Math.floor(bonus / 2), "穿刺箭");
        dealPlayerDamage(enemy, roll(8, 11) + Math.floor(bonus / 2), "穿刺箭");
      },
    },
    {
      id: "soul_break_arrow",
      name: "破魂箭",
      type: "control",
      intent: "攻击 9 + 干扰提取",
      weight: 2,
      execute: (enemy) => {
        const bonus = consumeEnemyAim(enemy);
        dealPlayerDamage(enemy, roll(8, 10) + Math.floor(bonus / 2), "破魂箭");
        state.extractPenalty = Math.max(state.extractPenalty, 0.12);
        addLog("破魂箭扰乱灵魂回路，本场下一次提取成功率降低。");
      },
    },
  ],
  eye: [
    {
      id: "gaze_ray",
      name: "凝视射线",
      type: "attack",
      intent: "攻击 18",
      weight: 5,
      execute: (enemy) => dealPlayerDamage(enemy, roll(16, 20), "凝视射线", { defenseScale: 0.16 }),
    },
    {
      id: "all_seeing_gaze",
      name: "全知凝视",
      type: "control",
      intent: "控制：暴露",
      weight: 3,
      execute: (enemy) => {
        state.playerEffects.vulnerable = Math.max(state.playerEffects.vulnerable, 1);
        addLog(`<strong>${enemy.name}</strong> 施加全知凝视，主人公本轮受到的伤害提高。`);
      },
    },
    {
      id: "mind_prick",
      name: "精神刺痛",
      type: "control",
      intent: "攻击 10 + 少抽牌",
      weight: 3,
      execute: (enemy) => {
        dealPlayerDamage(enemy, roll(9, 11), "精神刺痛", { defenseScale: 0.16 });
        state.nextDrawPenalty += 1;
        addLog("精神刺痛扰乱思绪，下回合少抽 1 张牌。");
      },
    },
    {
      id: "mana_backlash",
      name: "魔力反噬",
      type: "special",
      intent: "特殊：反制技能",
      weight: 2,
      execute: (enemy) => {
        state.playerEffects.skillBacklash = Math.max(state.playerEffects.skillBacklash, 1);
        addLog(`<strong>${enemy.name}</strong> 布下魔力反噬，下一张技能牌会反伤主人公。`);
      },
    },
  ],
  spider: [
    {
      id: "shadow_bite",
      name: "暗影咬击",
      type: "attack",
      intent: "攻击 14",
      weight: 5,
      execute: (enemy) => dealPlayerDamage(enemy, roll(12, 16) + consumeEnemyDamageBonus(enemy), "暗影咬击"),
    },
    {
      id: "web",
      name: "织网",
      type: "control",
      intent: "控制：缠绕",
      weight: 3,
      execute: (enemy) => {
        state.playerEffects.blockDown = Math.max(state.playerEffects.blockDown, 1);
        addLog(`<strong>${enemy.name}</strong> 织出暗影蛛网，下回合格挡牌效果降低。`);
      },
    },
    {
      id: "poison_fangs",
      name: "毒牙连击",
      type: "multi",
      intent: "攻击 7 x2 + 中毒",
      weight: 3,
      execute: (enemy) => {
        const bonus = consumeEnemyDamageBonus(enemy);
        dealPlayerDamage(enemy, roll(6, 8) + Math.floor(bonus / 2), "毒牙连击");
        dealPlayerDamage(enemy, roll(6, 8) + Math.floor(bonus / 2), "毒牙连击");
        state.playerEffects.poison = Math.max(state.playerEffects.poison, 2);
        addLog("毒牙刺入血肉，主人公中毒 2 回合。");
      },
    },
    {
      id: "hide",
      name: "潜入阴影",
      type: "defend",
      intent: "防御 10 + 闪避",
      weight: 2,
      condition: (enemy) => enemy.hp <= enemy.maxHp * 0.65,
      execute: (enemy) => {
        enemy.shield += 10;
        enemy.dodgeTurns = 1;
        enemy.nextDamageBonus = 4;
        addLog(`<strong>${enemy.name}</strong> 潜入阴影，获得护盾和闪避，下一次攻击更危险。`);
      },
    },
  ],
  knight: [
    {
      id: "bone_lance_charge",
      name: "骨枪冲锋",
      type: "attack",
      intent: "攻击 23",
      weight: 5,
      execute: (enemy) => dealPlayerDamage(enemy, roll(21, 25), "骨枪冲锋"),
    },
    {
      id: "bone_shield",
      name: "骸骨护盾",
      type: "defend",
      intent: "防御 22",
      weight: 3,
      condition: (enemy) => enemy.hp <= enemy.maxHp * 0.76,
      execute: (enemy) => {
        enemy.shield += 22;
        enemy.protectTurns = Math.max(enemy.protectTurns, 1);
        addLog(`<strong>${enemy.name}</strong> 展开骸骨护盾，获得 22 点护盾并护卫阵线。`);
      },
    },
    {
      id: "knight_suppression",
      name: "骑士压制",
      type: "control",
      intent: "攻击 16 + 少抽牌",
      weight: 3,
      execute: (enemy) => {
        dealPlayerDamage(enemy, roll(14, 18), "骑士压制");
        state.nextDrawPenalty += 1;
        addLog("骸骨骑士的压制打乱节奏，下回合少抽 1 张牌。");
      },
    },
    {
      id: "death_charge",
      name: "死亡冲阵",
      type: "multi",
      intent: "攻击 13 x2 + 易伤",
      weight: 2,
      execute: (enemy) => {
        const beforeBlock = state.block;
        dealPlayerDamage(enemy, roll(11, 14), "死亡冲阵");
        dealPlayerDamage(enemy, roll(11, 14), "死亡冲阵");
        if (beforeBlock <= 0 || state.block <= 0) {
          state.playerEffects.vulnerable = Math.max(state.playerEffects.vulnerable, 1);
          addLog("死亡冲阵击破防线，主人公下回合受到的伤害提高。");
        }
      },
    },
  ],
  void: [
    {
      id: "void_corrosion",
      name: "虚空侵蚀",
      type: "control",
      intent: "攻击 17 + 诅咒",
      weight: 5,
      execute: (enemy) => {
        dealPlayerDamage(enemy, roll(15, 19), "虚空侵蚀", { defenseScale: 0.12 });
        applyRandomVoidCurse();
      },
    },
    {
      id: "shape_shift",
      name: "形态变换",
      type: "special",
      intent: "特殊：变换",
      weight: 3,
      execute: (enemy) => {
        const form = roll(1, 3);
        if (form === 1) {
          enemy.nextDamageBonus = 7;
          addLog(`<strong>${enemy.name}</strong> 变为锋锐形态，下一次攻击伤害提高。`);
        } else if (form === 2) {
          enemy.shield += 16;
          addLog(`<strong>${enemy.name}</strong> 变为坚壳形态，获得 16 点护盾。`);
        } else {
          enemy.dodgeTurns = 1;
          addLog(`<strong>${enemy.name}</strong> 变为虚影形态，下一次受击有概率闪避。`);
        }
      },
    },
    {
      id: "rift_pulse",
      name: "裂隙脉冲",
      type: "multi",
      intent: "攻击 12 AOE",
      weight: 3,
      execute: (enemy) => {
        const pulses = state.souls.length > 1 ? 3 : 2;
        for (let i = 0; i < pulses; i += 1) {
          dealPlayerDamage(enemy, roll(9, 12), "裂隙脉冲", { defenseScale: 0.12 });
        }
        addLog(`裂隙脉冲扫过战场，共震荡 ${pulses} 次。`);
      },
    },
    {
      id: "unstable_burst",
      name: "不稳定爆裂",
      type: "attack",
      intent: "攻击 26，自损",
      weight: 2,
      condition: (enemy) => enemy.hp <= enemy.maxHp * 0.62 || state.turn >= 4,
      execute: (enemy) => {
        dealPlayerDamage(enemy, roll(24, 29), "不稳定爆裂", { defenseScale: 0.12 });
        damageEnemySelf(enemy, 10, "不稳定爆裂");
      },
    },
  ],
};

const cards = [
  {
    id: "slash",
    name: "暗影斩",
    type: "攻击",
    className: "attack",
    cost: 1,
    desc: "18物理伤害。击杀魂印≥40目标时获得2碎片。",
    needsTarget: true,
    play: ({ target }) => {
      const killed = damageEnemy(target, Math.round((18 + getStat("attackBonus") - target.def) * getPlayerAttackMultiplier()), "暗影斩");
      if (killed && target.soulSeal >= 40) {
        state.player.shards += 2;
        addLog("暗影斩完成魂印收割，额外获得 2 个灵魂碎片。");
      }
    },
  },
  {
    id: "guard",
    name: "骨盾防御",
    type: "技能",
    className: "power",
    cost: 1,
    desc: "16格挡；若敌人魂印≥70，额外+4。",
    needsTarget: false,
    play: () => {
      const blockPenalty = state.playerEffects.blockDown > 0 ? 0.65 : 1;
      const sealBonus = liveEnemies().some((enemy) => enemy.soulSeal >= 70) ? 4 : 0;
      const blockGain = Math.round((16 + sealBonus + getStat("blockBonus")) * blockPenalty);
      state.block += blockGain;
      state.guarding = true;
      addLog(`骨盾升起，你获得 ${blockGain} 点格挡。`);
    },
  },
  {
    id: "blood_pact",
    name: "鲜血契约",
    type: "技能",
    className: "skill-card",
    cost: 1,
    desc: "失去8HP，抽2张，获得1能量；若敌人魂印≥70，抽3张。",
    needsTarget: false,
    play: () => {
      state.player.hp = Math.max(1, state.player.hp - 8);
      state.energy += 1;
      const drawCount = liveEnemies().some((enemy) => enemy.soulSeal >= 70) ? 3 : 2;
      drawCards(drawCount);
      addLog(`鲜血契约生效：失去 8 HP，抽 ${drawCount} 张牌并获得 1 点能量。`);
    },
  },
  {
    id: "soul_lash",
    name: "灵魂鞭笞",
    type: "技能",
    className: "skill-card",
    cost: 1,
    desc: "24魔法伤害，+28魂印并施加灵魂标记。",
    needsTarget: true,
    play: ({ target }) => {
      target.marked = true;
      addSoulSeal(target, 28, "灵魂鞭笞");
      damageEnemy(target, 24 + getStat("magicDamageBonus") - Math.floor(target.def / 2), "灵魂鞭笞");
      addLog(`<strong>${target.name}</strong> 被灵魂标记，后续魂印更容易锚定。`);
    },
  },
  {
    id: "soul_spark",
    name: "灵魂火花",
    type: "攻击",
    className: "attack",
    cost: 0,
    desc: "7魔法伤害，+10魂印；标记目标变13伤害，+16魂印。",
    needsTarget: true,
    play: ({ target }) => {
      const marked = target.marked;
      addSoulSeal(target, marked ? 16 : 10, "灵魂火花");
      damageEnemy(target, (marked ? 13 : 7) + getStat("magicDamageBonus") - Math.floor(target.def / 2), "灵魂火花");
    },
  },
  {
    id: "soul_chain",
    name: "魂链束缚",
    type: "技能",
    className: "skill-card",
    cost: 1,
    desc: "+22魂印，目标下次攻击-25%；魂印≥70时施加易伤。",
    needsTarget: true,
    play: ({ target }) => {
      addSoulSeal(target, 22, "魂链束缚");
      target.weakenedAttack = Math.max(target.weakenedAttack || 0, 1);
      if (target.soulSeal >= 70) {
        target.vulnerable = Math.max(target.vulnerable || 0, 1);
        addLog(`<strong>${target.name}</strong> 魂印达到 70，被魂链撕开弱点。`);
      }
      addLog(`<strong>${target.name}</strong> 被魂链束缚，下次攻击伤害降低。`);
    },
  },
  {
    id: "decay",
    name: "死亡凋零",
    type: "技能",
    className: "skill-card",
    cost: 2,
    desc: "全体12魔法伤害，全体+8魂印；标记目标额外+4。",
    needsTarget: false,
    play: () => {
      liveEnemies().forEach((enemy) => {
        addSoulSeal(enemy, enemy.marked ? 12 : 8, "死亡凋零");
        damageEnemy(enemy, 12 + getStat("magicDamageBonus") - Math.floor(enemy.def / 2), "死亡凋零");
      });
    },
  },
  {
    id: "command",
    name: "亡灵号令",
    type: "技能",
    className: "power",
    cost: 1,
    desc: "目标+12魂印；最多2名亡灵攻击。无亡灵时获得1碎片。",
    needsTarget: false,
    play: () => {
      const target = getTarget();
      if (!state.souls.length) {
        state.player.shards += 1;
        addLog("没有亡灵响应号令，你凝聚了 1 个灵魂碎片。");
        return;
      }
      if (target) addSoulSeal(target, 12, "亡灵号令");
      soulAssist(false);
    },
  },
  {
    id: "execution_rite",
    name: "处刑仪式",
    type: "攻击",
    className: "attack",
    cost: 2,
    desc: "+10魂印后32物理伤害；魂印≥70时43伤害并提升提取率。",
    needsTarget: true,
    play: ({ target }) => {
      addSoulSeal(target, 10, "处刑仪式");
      const highSeal = target.soulSeal >= 70;
      if (highSeal) target.extractRiteBonus = Math.max(target.extractRiteBonus || 0, 0.15);
      const baseDamage = highSeal ? 43 : 32;
      damageEnemy(target, Math.round((baseDamage + getStat("attackBonus") - target.def) * getPlayerAttackMultiplier()), "处刑仪式");
      if (highSeal) addLog("处刑仪式完成高魂印收束，本次击杀后的提取率额外提高。");
    },
  },
  {
    id: "arise",
    name: "Arise",
    type: "能力",
    className: "power",
    cost: 2,
    desc: "全体+8魂印；亡灵强化攻击。无亡灵时召临时骷髅。",
    needsTarget: false,
    play: () => {
      addLog("你低声命令：<strong>Arise.</strong>");
      liveEnemies().forEach((enemy) => addSoulSeal(enemy, 8, "Arise"));
      if (!state.souls.length) summonTemporarySkeleton();
      soulAssist(true);
    },
  },
];

const equipmentCatalog = [
  {
    id: "soul_iron_sword",
    name: "魂铁长剑",
    slot: "weapon",
    rarity: "普通",
    desc: "攻击牌伤害 +4。",
    stats: { attackBonus: 4 },
  },
  {
    id: "necromancer_staff",
    name: "死灵法杖",
    slot: "weapon",
    rarity: "精良",
    desc: "MAG +4，魔法牌伤害 +3，提取概率小幅提升。",
    stats: { mag: 4, magicDamageBonus: 3, extractBonus: 0.06 },
  },
  {
    id: "bone_plate",
    name: "骸骨胸甲",
    slot: "armor",
    rarity: "普通",
    desc: "最大 HP +20，防御 +2。",
    stats: { maxHp: 20, def: 2 },
  },
  {
    id: "void_cloak",
    name: "虚空斗篷",
    slot: "armor",
    rarity: "稀有",
    desc: "格挡牌 +6，敌人伤害 -2。",
    stats: { blockBonus: 6, damageReduction: 2 },
  },
  {
    id: "soul_ring",
    name: "灵魂指环",
    slot: "trinket",
    rarity: "精良",
    desc: "提取概率 +10%，每场战斗开始获得 1 灵魂碎片。",
    stats: { extractBonus: 0.1, startShards: 1 },
  },
  {
    id: "arcane_core",
    name: "奥术核心",
    slot: "trinket",
    rarity: "稀有",
    desc: "每回合最大能量 +1，但最大 HP -10。",
    stats: { maxEnergy: 1, maxHp: -10 },
  },
];

const slotNames = {
  weapon: "武器",
  armor: "防具",
  trinket: "饰品",
};

