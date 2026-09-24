// Run lifecycle, stage setup, and deck lifecycle.

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
