// Player actions and turn sequencing.

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
