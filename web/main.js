// Browser demo entry point and event wiring.

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
