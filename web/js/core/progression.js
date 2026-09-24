// Battle completion, loot, result, and restart progression.

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

