// Extraction flow and its modal presentation.

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
