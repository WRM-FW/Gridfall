/* 深链接：让大厅卡片直接打开对应棋盘/规则/联机大厅 */
(function(){
  "use strict";
  var q;
  try { q = new URLSearchParams(location.search); } catch (e) { return; }
  var game = q.get("game");
  var online = q.get("online") === "1" || q.get("tab") === "online";
  var rule = q.get("rule");
  var opening = q.get("opening");
  var size = q.get("size");
  var opp = q.get("opp");
  var color = q.get("color");

  if (game === "go" || size) {
    switchGame("go");
    if (size && ["9", "13", "19"].indexOf(size) >= 0) { W.size = parseInt(size, 10); segSet("wSizeSeg", size); }
    if (opp === "human" || opp === "ai") {
      W.opp = opp; segSet("wOppSeg", opp);
      document.getElementById("wAiOpts").classList.toggle("hidden", opp !== "ai");
    }
    if (color === "1" || color === "2") { W.playerColor = parseInt(color, 10); segSet("wColorSeg", color); }
    wStart();
  } else if (game === "gomoku" || game === "renju" || rule || opening) {
    switchGame("gomoku");
    if (game === "renju" || rule === "renju") {
      G.rule = "renju"; segSet("gRuleSeg", "renju");
      document.getElementById("gOpeningWrap").classList.remove("hidden");
    }
    if (rule === "free") {
      G.rule = "free"; segSet("gRuleSeg", "free");
      document.getElementById("gOpeningWrap").classList.add("hidden");
    }
    if (opening === "formal" || opening === "free") {
      G.openingMode = opening; segSet("gOpeningSeg", opening);
    }
    if (opp === "human" || opp === "ai") {
      G.opp = opp; segSet("gOppSeg", opp);
      document.getElementById("gAiOpts").classList.toggle("hidden", opp !== "ai");
    }
    if (color === "1" || color === "2") { G.playerColor = parseInt(color, 10); segSet("gColorSeg", color); }
    gStart();
  }

  if (online) {
    switchGame("online");
    var og = q.get("onlineGame") || game;
    if (og === "go" || og === "gomoku") NET.settings.game = og;
    if (rule === "free" || rule === "renju") NET.settings.rule = rule;
    if (opening === "free" || opening === "formal") NET.settings.openingMode = opening;
    if (size && ["9", "13", "19"].indexOf(size) >= 0) NET.settings.size = parseInt(size, 10);
    if (typeof netUpdateLobby === "function") netUpdateLobby();
    if (typeof netRender === "function") netRender();
  }
})();