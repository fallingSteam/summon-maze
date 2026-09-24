// Runtime state shared by the browser demo modules.

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
