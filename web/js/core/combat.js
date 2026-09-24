// Combat rules, effects, targeting, and shared helpers.

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
