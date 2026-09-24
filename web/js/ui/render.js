// Rendering and presentation updates.

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

