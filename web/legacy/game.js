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

const playerBase = {
  name: "死灵召唤师",
  level: 1,
  maxHp: 150,
  hp: 150,
  maxMp: 3,
  mp: 3,
  atk: 22,
  def: 9,
  agi: 14,
  mag: 18,
  shards: 0,
};

const state = {
  player: { ...playerBase },
  stageIndex: 0,
  enemies: [],
  selectedEnemyId: null,
  souls: [],
  pendingExtract: null,
  guarding: false,
  busy: false,
  defeatedQueue: [],
  resultMode: "next",
  turn: 1,
  energy: 3,
  maxEnergy: 3,
  block: 0,
  drawPile: [],
  hand: [],
  discardPile: [],
  playerEffects: {},
  nextDrawPenalty: 0,
  extractPenalty: 0,
  equipment: {
    weapon: null,
    armor: null,
    trinket: null,
  },
  pendingLoot: null,
};

const el = {
  stageTitle: document.querySelector("#stageTitle"),
  enemySide: document.querySelector("#enemySide"),
  heroHpBar: document.querySelector("#heroHpBar"),
  heroMpBar: document.querySelector("#heroMpBar"),
  heroVitals: document.querySelector("#heroVitals"),
  targetName: document.querySelector("#targetName"),
  soulRow: document.querySelector("#soulRow"),
  battleLog: document.querySelector("#battleLog"),
  hand: document.querySelector("#hand"),
  energyText: document.querySelector("#energyText"),
  deckText: document.querySelector("#deckText"),
  turnText: document.querySelector("#turnText"),
  endTurnButton: document.querySelector("#endTurnButton"),
  statsButton: document.querySelector("#statsButton"),
  restartButton: document.querySelector("#restartButton"),
  statsModal: document.querySelector("#statsModal"),
  closeStats: document.querySelector("#closeStats"),
  statsGrid: document.querySelector("#statsGrid"),
  equipmentList: document.querySelector("#equipmentList"),
  soulList: document.querySelector("#soulList"),
  extractModal: document.querySelector("#extractModal"),
  extractImage: document.querySelector("#extractImage"),
  extractText: document.querySelector("#extractText"),
  extractChance: document.querySelector("#extractChance"),
  confirmExtract: document.querySelector("#confirmExtract"),
  skipExtract: document.querySelector("#skipExtract"),
  resultModal: document.querySelector("#resultModal"),
  resultTitle: document.querySelector("#resultTitle"),
  resultText: document.querySelector("#resultText"),
  continueButton: document.querySelector("#continueButton"),
  lootModal: document.querySelector("#lootModal"),
  lootBody: document.querySelector("#lootBody"),
  equipLootButton: document.querySelector("#equipLootButton"),
  salvageLootButton: document.querySelector("#salvageLootButton"),
};

function cloneEnemies(stage) {
  return stage.enemies.map((enemy) => ({
    ...enemy,
    maxHp: enemy.hp,
    hp: enemy.hp,
    shield: 0,
    soulSeal: 0,
    intent: null,
    aimed: false,
    protectTurns: 0,
    dodgeTurns: 0,
    nextDamageBonus: 0,
    weakenedAttack: 0,
    vulnerable: 0,
    extractRiteBonus: 0,
    marked: false,
    defeated: false,
    extracted: false,
  }));
}

function startGame() {
  Object.assign(state.player, playerBase);
  state.stageIndex = 0;
  state.souls = [];
  state.defeatedQueue = [];
  state.pendingExtract = null;
  state.pendingLoot = null;
  state.playerEffects = {};
  state.nextDrawPenalty = 0;
  state.extractPenalty = 0;
  state.equipment = { weapon: null, armor: null, trinket: null };
  state.busy = false;
  el.battleLog.innerHTML = "";
  loadStage(0);
  addLog("你踏入迷宫，第一组卡牌在掌心展开。");
}

function loadStage(index) {
  const stage = stages[index];
  state.stageIndex = index;
  state.souls = state.souls.filter((soul) => !soul.temporary);
  state.enemies = cloneEnemies(stage);
  state.selectedEnemyId = state.enemies[0].id;
  state.turn = 1;
  state.block = 0;
  state.guarding = false;
  state.playerEffects = {};
  state.nextDrawPenalty = 0;
  state.extractPenalty = 0;
  state.drawPile = shuffle(cards.map((card) => card.id));
  state.hand = [];
  state.discardPile = [];
  state.maxEnergy = 3 + getStat("maxEnergy");
  const startShards = getStat("startShards");
  if (startShards > 0) {
    state.player.shards += startShards;
    addLog(`灵魂指环共鸣：获得 ${startShards} 个灵魂碎片。`);
  }
  startPlayerTurn(false);
  el.stageTitle.textContent = stage.title;
  addLog(`<strong>${stage.title}</strong> 开始。`);
  render();
}

function shuffle(list) {
  const result = [...list];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function startPlayerTurn(logTurn = true) {
  state.busy = false;
  state.maxEnergy = 3 + getStat("maxEnergy");
  state.energy = state.maxEnergy;
  state.block = 0;
  state.guarding = false;
  state.hand = [];
  applyStartOfTurnEffects();
  prepareEnemyIntents();
  const drawCount = Math.max(1, 5 - state.nextDrawPenalty);
  state.nextDrawPenalty = 0;
  drawCards(drawCount);
  if (logTurn) addLog(`<strong>第 ${state.turn} 回合</strong>，抽 ${drawCount} 张牌。`);
  render();
}

function drawCards(count) {
  for (let i = 0; i < count; i += 1) {
    if (!state.drawPile.length) {
      if (!state.discardPile.length) return;
      state.drawPile = shuffle(state.discardPile);
      state.discardPile = [];
      addLog("弃牌堆洗入抽牌堆。");
    }
    state.hand.push(state.drawPile.shift());
  }
}

function render() {
  renderVitals();
  renderEnemies();
  renderSouls();
  renderCards();
  renderStats();
  updateButtons();
}

function renderVitals() {
  const maxHp = getStat("maxHp");
  if (state.player.hp > maxHp) state.player.hp = maxHp;
  const hpPct = Math.max(0, state.player.hp / maxHp) * 100;
  const mpPct = Math.max(0, state.energy / state.maxEnergy) * 100;
  el.heroHpBar.style.width = `${hpPct}%`;
  el.heroMpBar.style.width = `${mpPct}%`;
  el.heroVitals.textContent = `HP ${state.player.hp}/${maxHp} · 格挡 ${state.block} · 能量 ${state.energy}/${state.maxEnergy}`;
}

function renderEnemies() {
  el.enemySide.innerHTML = "";
  state.enemies.forEach((enemy) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = `enemy-card${enemy.large ? " large" : ""}${enemy.id === state.selectedEnemyId ? " selected" : ""}${enemy.defeated ? " defeated" : ""}`;
    card.dataset.enemyId = enemy.id;
    card.innerHTML = `
      <div class="unit">
        <img src="${enemy.img}" alt="${enemy.name}">
      </div>
      <div class="nameplate enemy-plate">
        <strong>${enemy.name}${enemy.marked ? " · 标记" : ""}</strong>
        ${enemy.shield > 0 ? `<span class="enemy-shield">护盾 ${enemy.shield}</span>` : ""}
        <div class="bar hp"><span style="width:${Math.max(0, enemy.hp / enemy.maxHp) * 100}%"></span></div>
        <div class="bar soul-seal"><span style="width:${enemy.soulSeal}%"></span></div>
        <small>魂印 ${enemy.soulSeal}/100</small>
        <small>HP ${Math.max(0, enemy.hp)}/${enemy.maxHp}</small>
        <div class="intent ${enemy.intent ? enemy.intent.type : "attack"}">
          <span>${getIntentIcon(enemy.intent)}</span>
          <strong>${enemy.intent ? enemy.intent.intent : `攻击 ${enemy.atk}`}</strong>
          <small>${enemy.intent ? enemy.intent.name : "普通攻击"}</small>
        </div>
      </div>
    `;
    card.addEventListener("click", () => {
      if (!enemy.defeated && !state.busy) {
        state.selectedEnemyId = enemy.id;
        render();
      }
    });
    el.enemySide.appendChild(card);
  });

  const target = getTarget();
  el.targetName.textContent = target ? target.name : "无";
}

function renderSouls() {
  if (!state.souls.length) {
    el.soulRow.innerHTML = `<small>暂无亡灵。击败敌人后尝试提取灵魂。</small>`;
    return;
  }
  el.soulRow.innerHTML = state.souls
    .map((soul) => `
      <div class="soul-chip">
        <img src="${soul.img}" alt="${soul.name}">
        <div><strong>${soul.name}</strong><small>${soul.temporary ? "临时" : "助战"} ${soul.soulAtk}</small></div>
      </div>
    `)
    .join("");
}

function renderCards() {
  el.energyText.textContent = `${state.energy}/${state.maxEnergy}`;
  el.turnText.textContent = `第 ${state.turn} 回合`;
  el.deckText.textContent = `抽牌堆 ${state.drawPile.length} · 弃牌堆 ${state.discardPile.length}`;
  el.hand.innerHTML = "";

  state.hand.forEach((cardId, index) => {
    const card = getCard(cardId);
    const button = document.createElement("button");
    button.type = "button";
    button.className = `card ${card.className}`;
    button.disabled = state.busy || state.energy < card.cost || (card.needsTarget && !getTarget()) || el.extractModal.open || el.resultModal.open || el.lootModal.open;
    button.innerHTML = `
      <span class="card-cost">${card.cost}</span>
      <span class="card-name">${card.name}</span>
      <span class="card-type">${card.type}</span>
      <span class="card-desc">${card.desc}</span>
    `;
    button.addEventListener("click", () => playCard(index));
    el.hand.appendChild(button);
  });
}

function renderStats() {
  const p = state.player;
  const stats = [
    ["等级", p.level],
    ["生命", `${p.hp}/${getStat("maxHp")}`],
    ["能量", `${state.energy}/${state.maxEnergy}`],
    ["攻击", getStat("atk")],
    ["防御", getStat("def")],
    ["敏捷", p.agi],
    ["魔法强度", getStat("mag")],
    ["灵魂碎片", p.shards],
    ["亡灵数量", `${state.souls.length}/4`],
  ];

  el.statsGrid.innerHTML = stats
    .map(([label, value]) => `<div class="stat"><span>${label}</span><strong>${value}</strong></div>`)
    .join("");

  renderEquipment();

  el.soulList.innerHTML = state.souls.length
    ? state.souls
      .map((soul) => `
        <div class="soul-entry">
          <img src="${soul.img}" alt="${soul.name}">
          <div>
            <strong>${soul.name}</strong>
            <p>${soul.temporary ? "临时召唤物，战斗结束后消散。" : `通过“亡灵号令”或“Arise”触发攻击，造成约 ${soul.soulAtk} 点伤害。`}</p>
          </div>
        </div>
      `)
      .join("")
    : `<p>还没有亡灵。先击败敌人，再尝试提取它们的灵魂。</p>`;
}

function renderEquipment() {
  el.equipmentList.innerHTML = Object.entries(slotNames)
    .map(([slot, label]) => {
      const item = state.equipment[slot];
      return `
        <div class="equipment-slot">
          <span>${label}</span>
          <strong>${item ? item.name : "空"}</strong>
          <small>${item ? `${item.rarity} · ${item.desc}` : "未装备"}</small>
        </div>
      `;
    })
    .join("");
}

function updateButtons() {
  el.endTurnButton.disabled = state.busy || el.extractModal.open || el.resultModal.open || el.lootModal.open;
  renderCards();
}

function getIntentIcon(intent) {
  const icons = {
    attack: "剑",
    multi: "双",
    defend: "盾",
    buff: "强",
    control: "控",
    special: "异",
  };
  return icons[intent?.type] || "剑";
}

function getCard(cardId) {
  return cards.find((card) => card.id === cardId);
}

function getTarget() {
  return state.enemies.find((enemy) => enemy.id === state.selectedEnemyId && !enemy.defeated)
    || state.enemies.find((enemy) => !enemy.defeated)
    || null;
}

function getEquippedItems() {
  return Object.values(state.equipment).filter(Boolean);
}

function getStat(stat) {
  const base = {
    atk: state.player.atk,
    def: state.player.def,
    mag: state.player.mag,
    maxHp: state.player.maxHp,
    attackBonus: 0,
    magicDamageBonus: 0,
    blockBonus: 0,
    damageReduction: 0,
    extractBonus: 0,
    maxEnergy: 0,
    startShards: 0,
  }[stat] ?? 0;

  return getEquippedItems().reduce((sum, item) => sum + (item.stats[stat] || 0), base);
}

function liveEnemies() {
  return state.enemies.filter((enemy) => !enemy.defeated);
}

function addSoulSeal(enemy, amount, source) {
  if (!enemy || enemy.defeated) return;
  const before = enemy.soulSeal || 0;
  enemy.soulSeal = Math.min(100, before + amount);
  const gained = enemy.soulSeal - before;
  if (gained > 0) {
    addLog(`${source} 为 <strong>${enemy.name}</strong> 叠加 ${gained} 点魂印（${enemy.soulSeal}/100）。`);
  }
}

function applyStartOfTurnEffects() {
  const effects = state.playerEffects;
  if (effects.poison > 0) {
    const poisonDamage = 5;
    state.player.hp = Math.max(0, state.player.hp - poisonDamage);
    effects.poison -= 1;
    addLog(`毒素蔓延，主人公受到 ${poisonDamage} 点伤害。`);
  }
}

function prepareEnemyIntents() {
  liveEnemies().forEach((enemy) => {
    enemy.intent = chooseEnemySkill(enemy);
  });
}

function chooseEnemySkill(enemy) {
  const skills = enemySkillCatalog[enemy.id] || [];
  if (!skills.length) {
    return {
      id: "basic_attack",
      name: "普通攻击",
      type: "attack",
      intent: `攻击 ${enemy.atk}`,
      execute: (actingEnemy) => {
        dealPlayerDamage(actingEnemy, actingEnemy.atk + roll(-3, 5), "普通攻击");
      },
    };
  }

  const usable = skills.filter((skill) => !skill.condition || skill.condition(enemy));
  const pool = usable.length ? usable : skills;
  const total = pool.reduce((sum, skill) => sum + (skill.weight || 1), 0);
  let pick = Math.random() * total;
  for (const skill of pool) {
    pick -= skill.weight || 1;
    if (pick <= 0) return skill;
  }
  return pool[0];
}

function getPlayerAttackMultiplier() {
  return state.playerEffects.attackDown > 0 ? 0.7 : 1;
}

function resolveSkillBacklash(card) {
  if (card.type !== "技能" || state.playerEffects.skillBacklash <= 0) return;
  state.playerEffects.skillBacklash = 0;
  const backlashDamage = 6;
  state.player.hp = Math.max(0, state.player.hp - backlashDamage);
  addLog(`魔力反噬触发，主人公受到 ${backlashDamage} 点伤害。`);
}

function consumeEnemyAim(enemy) {
  if (!enemy.aimed) return 0;
  enemy.aimed = false;
  return 7;
}

function consumeEnemyDamageBonus(enemy) {
  const bonus = enemy.nextDamageBonus || 0;
  enemy.nextDamageBonus = 0;
  return bonus;
}

function dealPlayerDamage(enemy, amount, source, options = {}) {
  const defenseScale = options.defenseScale ?? 0.35;
  const guardFactor = state.guarding ? 0.45 : 1;
  const enemyWeakenFactor = enemy.weakenedAttack > 0 ? 0.75 : 1;
  const vulnerableFactor = state.playerEffects.vulnerable > 0 ? 1.25 : 1;
  const raw = amount - Math.floor(getStat("def") * defenseScale) - getStat("damageReduction");
  let damage = Math.max(1, Math.round(raw * guardFactor * vulnerableFactor * enemyWeakenFactor));
  if (enemy.weakenedAttack > 0) enemy.weakenedAttack -= 1;
  const blocked = Math.min(state.block, damage);
  state.block -= blocked;
  damage -= blocked;
  state.player.hp = Math.max(0, state.player.hp - damage);
  addLog(`<strong>${enemy.name}</strong> 的 ${source} 命中，格挡 ${blocked}，受到 ${damage} 点伤害。`);
}

function applyRandomVoidCurse() {
  const curses = [
    () => {
      state.playerEffects.attackDown = Math.max(state.playerEffects.attackDown, 1);
      addLog("虚空诅咒削弱了主人公的攻击牌伤害。");
    },
    () => {
      state.playerEffects.blockDown = Math.max(state.playerEffects.blockDown, 1);
      addLog("虚空诅咒腐蚀了骨盾，下回合格挡牌效果降低。");
    },
    () => {
      state.playerEffects.vulnerable = Math.max(state.playerEffects.vulnerable, 1);
      addLog("虚空诅咒撕开防线，主人公受到的伤害提高。");
    },
    () => {
      state.nextDrawPenalty += 1;
      addLog("虚空诅咒扰乱意识，下回合少抽 1 张牌。");
    },
  ];
  curses[roll(0, curses.length - 1)]();
}

function damageEnemySelf(enemy, amount, source) {
  enemy.hp = Math.max(0, enemy.hp - amount);
  showDamage(enemy.id, amount);
  addLog(`<strong>${enemy.name}</strong> 被 ${source} 反噬，损失 ${amount} 点生命。`);
  if (enemy.hp <= 0 && !enemy.defeated) {
    enemy.defeated = true;
    enemy.shield = 0;
    enemy.intent = null;
    enemy.protectTurns = 0;
    enemy.dodgeTurns = 0;
    state.defeatedQueue.push(enemy);
    addLog(`<strong>${enemy.name}</strong> 在虚空反噬中崩解。`);
  }
}

function expirePlayerRoundEffects() {
  ["attackDown", "blockDown", "vulnerable", "skillBacklash"].forEach((key) => {
    if (state.playerEffects[key] > 0) state.playerEffects[key] -= 1;
  });
}

function addLog(message) {
  const line = document.createElement("p");
  line.className = "log-line";
  line.innerHTML = message;
  el.battleLog.prepend(line);
}

function roll(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function playCard(index) {
  if (state.busy) return;
  const cardId = state.hand[index];
  const card = getCard(cardId);
  const target = getTarget();
  if (!card || state.energy < card.cost || (card.needsTarget && !target)) return;

  state.busy = true;
  state.energy -= card.cost;
  state.hand.splice(index, 1);
  state.discardPile.push(cardId);
  addLog(`打出 <strong>${card.name}</strong>。`);
  resolveSkillBacklash(card);
  card.play({ target });
  render();

  await resolveDefeatedQueue();
  if (checkBattleEnd()) return;

  state.busy = false;
  render();
}

function damageEnemy(enemy, amount, source) {
  enemy = getProtectedEnemy(enemy);
  if (enemy.dodgeTurns > 0 && Math.random() < 0.45) {
    enemy.dodgeTurns = 0;
    addLog(`<strong>${enemy.name}</strong> 借阴影闪避了 ${source}。`);
    return false;
  }

  const final = Math.max(1, Math.round(amount * (enemy.vulnerable > 0 ? 1.25 : 1)));
  if (enemy.vulnerable > 0) enemy.vulnerable -= 1;
  const blocked = Math.min(enemy.shield || 0, final);
  enemy.shield = Math.max(0, (enemy.shield || 0) - blocked);
  const hpDamage = final - blocked;
  enemy.hp -= hpDamage;
  showDamage(enemy.id, hpDamage || blocked, hpDamage ? "damage" : "shield");
  addLog(`${source} 对 <strong>${enemy.name}</strong> 造成 ${final} 点伤害${blocked ? `，护盾吸收 ${blocked}` : ""}。`);
  if (enemy.hp <= 0 && !enemy.defeated) {
    enemy.hp = 0;
    enemy.defeated = true;
    enemy.shield = 0;
    enemy.intent = null;
    enemy.protectTurns = 0;
    enemy.dodgeTurns = 0;
    state.defeatedQueue.push(enemy);
    addLog(`<strong>${enemy.name}</strong> 倒下了，灵魂正在消散。`);
    if (enemy.soulSeal >= 100) {
      addLog(`<strong>${enemy.name}</strong> 的魂印已经圆满，提取仪式获得额外稳定加成。`);
    }
    return true;
  }
  return false;
}

function getProtectedEnemy(enemy) {
  const protector = liveEnemies().find((ally) => ally.id !== enemy.id && ally.protectTurns > 0);
  if (!protector) return enemy;
  protector.protectTurns = 0;
  addLog(`<strong>${protector.name}</strong> 死守阵线，替 ${enemy.name} 承受攻击。`);
  return protector;
}

function showDamage(enemyId, amount, type = "damage") {
  const card = el.enemySide.querySelector(`[data-enemy-id="${enemyId}"]`);
  if (!card) return;
  const pop = document.createElement("div");
  pop.className = `damage-pop ${type}`;
  pop.textContent = type === "shield" ? `-${amount}盾` : `-${amount}`;
  card.appendChild(pop);
  setTimeout(() => pop.remove(), 800);
}

function soulAssist(empowered) {
  if (!state.souls.length) return;
  const helpers = empowered ? state.souls : state.souls.slice(0, 2);
  helpers.forEach((soul) => {
    const liveTarget = getTarget();
    if (!liveTarget) return;
    const multiplier = empowered ? 1.45 : 1;
    const damage = Math.round((soul.soulAtk + roll(-2, 4)) * multiplier);
    damageEnemy(liveTarget, damage, `${soul.name} 的亡灵攻击`);
  });
}

function summonTemporarySkeleton() {
  const skeleton = {
    name: "临时骷髅",
    img: asset("游戏图/generated_cutouts/monster_01_skeleton_soldier.png"),
    soulAtk: 8,
    temporary: true,
  };
  state.souls.push(skeleton);
  addLog("Arise 唤起一具临时骷髅，战斗结束后会消散。");
  renderSouls();
}

async function endTurn() {
  if (state.busy) return;
  state.busy = true;
  state.discardPile.push(...state.hand);
  state.hand = [];
  addLog("你结束了回合。");
  expirePlayerRoundEffects();
  enemyTurn();
  render();
  if (state.player.hp <= 0) {
    gameOver();
    return;
  }
  state.turn += 1;
  startPlayerTurn();
}

function enemyTurn() {
  const enemies = liveEnemies();
  enemies.forEach((enemy) => {
    const skill = enemy.intent || chooseEnemySkill(enemy);
    addLog(`<strong>${enemy.name}</strong> 使用 ${skill.name}。`);
    skill.execute(enemy);
    enemy.intent = null;
  });
  liveEnemies().forEach((enemy) => {
    if (enemy.protectTurns > 0) enemy.protectTurns -= 1;
    if (enemy.dodgeTurns > 0) enemy.dodgeTurns -= 1;
  });
}

async function resolveDefeatedQueue() {
  while (state.defeatedQueue.length) {
    const enemy = state.defeatedQueue.shift();
    render();
    await openExtract(enemy);
  }
}

function openExtract(enemy) {
  return new Promise((resolve) => {
    state.pendingExtract = { enemy, resolve };
    const chance = getExtractChance(enemy);
    el.extractImage.src = enemy.img;
    el.extractText.innerHTML = `<strong>${enemy.name}</strong> 的灵魂仍在震颤。魂印越高，提取越稳定。`;
    el.extractChance.textContent = `魂印：${enemy.soulSeal}/100 · 当前成功率：${Math.round(chance * 100)}%`;
    el.extractModal.showModal();
    updateButtons();
  });
}

function getExtractChance(enemy) {
  const base = enemy.extract;
  const statBoost = getStat("mag") * 0.004 + getStat("maxHp") * 0.0002;
  const markBoost = enemy.marked ? 0.16 : 0;
  const stageBoost = state.stageIndex * 0.04;
  const sealBoost = (enemy.soulSeal || 0) * 0.005;
  const perfectSealBoost = enemy.soulSeal >= 100 ? 0.12 : 0;
  return Math.min(0.96, base + statBoost + markBoost + stageBoost + sealBoost + perfectSealBoost + (enemy.extractRiteBonus || 0) + getStat("extractBonus") - state.extractPenalty);
}

function finishExtract() {
  const pending = state.pendingExtract;
  state.pendingExtract = null;
  if (el.extractModal.open) el.extractModal.close();
  pending.resolve();
}

function extractSoul() {
  const pending = state.pendingExtract;
  if (!pending) return;
  const enemy = pending.enemy;
  const chance = getExtractChance(enemy);
  const success = Math.random() <= chance && state.souls.length < 4;

  if (success) {
    const soul = {
      name: enemy.name,
      img: enemy.img,
      soulAtk: enemy.soulAtk,
    };
    state.souls.push(soul);
    state.player.mag += 1;
    state.player.shards += 1;
    addLog(`提取成功！<strong>${enemy.name}</strong> 加入亡灵军团。`);
  } else {
    const shards = enemy.marked ? 6 : 4;
    state.player.shards += shards;
    addLog(`提取失败，灵魂破碎为 ${shards} 个灵魂碎片。`);
  }
  finishExtract();
  render();
}

function skipExtract() {
  const pending = state.pendingExtract;
  if (!pending) return;
  state.player.shards += 3;
  addLog(`${pending.enemy.name} 的残魂被收束为 3 个灵魂碎片。`);
  finishExtract();
  render();
}

function checkBattleEnd() {
  const won = state.enemies.every((enemy) => enemy.defeated);
  if (!won) return false;

  state.busy = true;
  state.souls = state.souls.filter((soul) => !soul.temporary);
  const stage = stages[state.stageIndex];
  state.player.level += 1;
  state.player.maxHp += 12;
  state.player.atk += 2;
  state.player.def += 1;
  state.player.mag += 2;
  state.player.hp = Math.min(getStat("maxHp"), state.player.hp + 45);

  if (state.stageIndex === stages.length - 1) {
    maybeDropEquipment(() => {
      openResult("Demo 通关", `${stage.reward} 你完成了三关卡牌战斗，并带着 ${state.souls.length} 只亡灵离开迷宫。`, "再来一局", "restart");
    });
  } else {
    maybeDropEquipment(() => {
      openResult("关卡胜利", `${stage.reward} 等级提升，属性变强。`, "进入下一关", "next");
    });
  }
  render();
  return true;
}

function maybeDropEquipment(afterLoot) {
  const dropChance = 1;
  if (Math.random() > dropChance) {
    addLog("本场没有装备掉落。");
    afterLoot();
    return;
  }

  const item = rollEquipment();
  state.pendingLoot = { item, afterLoot };
  el.lootBody.innerHTML = `
    <div class="loot-card">
      <span>${slotNames[item.slot]} · ${item.rarity}</span>
      <strong>${item.name}</strong>
      <small>${item.desc}</small>
    </div>
  `;
  el.lootModal.showModal();
  updateButtons();
}

function rollEquipment() {
  const currentStage = state.stageIndex;
  const pool = equipmentCatalog.filter((item) => currentStage > 0 || item.rarity !== "稀有");
  return { ...pool[roll(0, pool.length - 1)] };
}

function equipPendingLoot() {
  const pending = state.pendingLoot;
  if (!pending) return;
  const oldItem = state.equipment[pending.item.slot];
  state.equipment[pending.item.slot] = pending.item;
  const maxHp = getStat("maxHp");
  state.player.hp = Math.min(maxHp, state.player.hp);
  addLog(`装备 <strong>${pending.item.name}</strong>${oldItem ? `，替换了 ${oldItem.name}` : ""}。`);
  finishLoot();
}

function salvagePendingLoot() {
  const pending = state.pendingLoot;
  if (!pending) return;
  const shards = pending.item.rarity === "稀有" ? 8 : pending.item.rarity === "精良" ? 5 : 3;
  state.player.shards += shards;
  addLog(`分解 ${pending.item.name}，获得 ${shards} 个灵魂碎片。`);
  finishLoot();
}

function finishLoot() {
  const pending = state.pendingLoot;
  state.pendingLoot = null;
  if (el.lootModal.open) el.lootModal.close();
  render();
  pending.afterLoot();
}

function openResult(title, text, buttonText, mode) {
  state.resultMode = mode;
  el.resultTitle.textContent = title;
  el.resultText.textContent = text;
  el.continueButton.textContent = buttonText;
  el.resultModal.showModal();
  updateButtons();
}

function continueResult() {
  if (el.resultModal.open) el.resultModal.close();
  if (state.resultMode === "restart") {
    startGame();
    return;
  }
  state.busy = false;
  loadStage(state.stageIndex + 1);
}

function gameOver() {
  state.busy = true;
  openResult("战斗失败", "主人公倒下了，迷宫重新吞没一切。", "重新开始", "restart");
}

el.endTurnButton.addEventListener("click", endTurn);
el.confirmExtract.addEventListener("click", extractSoul);
el.skipExtract.addEventListener("click", skipExtract);
el.continueButton.addEventListener("click", continueResult);
el.equipLootButton.addEventListener("click", equipPendingLoot);
el.salvageLootButton.addEventListener("click", salvagePendingLoot);
el.restartButton.addEventListener("click", startGame);
el.statsButton.addEventListener("click", () => {
  renderStats();
  el.statsModal.showModal();
});
el.closeStats.addEventListener("click", () => el.statsModal.close());

startGame();
