export const SIZE = 5;
export const DIRECTIONS = Object.freeze({
  north: [0, -1],
  east: [1, 0],
  south: [0, 1],
  west: [-1, 0],
});
export const DIRECTION_NAMES = {
  north: "위",
  east: "오른쪽",
  south: "아래",
  west: "왼쪽",
};
export const CHARACTERS = Object.freeze([
  {
    id: "scarlet",
    name: "홍련",
    title: "갈대숲의 검객",
    hp: 110,
    energy: 55,
    damage: 3,
    spell: 0,
    color: "#e36562",
    art: 0,
    trait: "검격 +3 · 생명 110",
    story: "봉인된 산문을 열기 위해, 새벽의 검을 뽑는다.",
  },
  {
    id: "reed",
    name: "청우",
    title: "바람을 읽는 궁사",
    hp: 94,
    energy: 75,
    damage: 0,
    spell: 5,
    color: "#a6c8b4",
    art: 1,
    trait: "부적 +5 · 기력 75",
    story: "날아가는 깃털 하나에도 다음 길이 보인다.",
  },
  {
    id: "ember",
    name: "묵진",
    title: "돌산의 떠돌이 승려",
    hp: 125,
    energy: 50,
    damage: 1,
    spell: 0,
    color: "#d2a35c",
    art: 2,
    trait: "생명 125 · 방어 반격 +3",
    story: "흔들리지 않는 발끝이 바람보다 빠르다.",
  },
  {
    id: "storm",
    name: "백야",
    title: "월식의 부적술사",
    hp: 100,
    energy: 70,
    damage: 0,
    spell: 3,
    color: "#cad7e8",
    art: 3,
    trait: "부적 +3 · 기력 70",
    story: "세 번째 부적이 떨어지면, 새벽이 시작된다.",
  },
]);
export const CARDS = Object.freeze({
  move: {
    id: "move",
    name: "발걸음",
    tag: "MOVE",
    cost: 0,
    damage: 0,
    description: "선택 방향으로 1칸 이동",
    glyph: "歩",
    key: "1",
  },
  slash: {
    id: "slash",
    name: "깃검",
    tag: "SLASH",
    cost: 10,
    damage: 22,
    description: "바로 앞 1칸 · 검격 22",
    glyph: "斬",
    key: "2",
  },
  guard: {
    id: "guard",
    name: "금강막",
    tag: "GUARD",
    cost: 0,
    damage: 0,
    description: "정면 피해 80% 감소 · 기력 +8",
    glyph: "守",
    key: "3",
  },
  spell: {
    id: "spell",
    name: "붉은 부적",
    tag: "TALISMAN",
    cost: 24,
    damage: 32,
    description: "직선 3칸 · 부적 32",
    glyph: "符",
    key: "4",
  },
  focus: {
    id: "focus",
    name: "숨 고르기",
    tag: "FOCUS",
    cost: 0,
    damage: 0,
    description: "기력 +26 · 이동하지 않음",
    glyph: "息",
    key: "5",
  },
  dash: {
    id: "dash",
    name: "바람걸음",
    tag: "DASH",
    cost: 12,
    damage: 0,
    description: "선택 방향으로 2칸 이동",
    glyph: "疾",
    key: "6",
  },
});
const clone = (x) => structuredClone(x);
const same = (a, b) => a.x === b.x && a.y === b.y;
export const validCell = ({ x, y }) =>
  Number.isInteger(x) &&
  Number.isInteger(y) &&
  x >= 0 &&
  x < SIZE &&
  y >= 0 &&
  y < SIZE;
export const distance = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
export function action(id, dir = "east") {
  if (!CARDS[id] || !DIRECTIONS[dir]) throw new Error("Invalid action");
  return { id, dir };
}
export function createMatch(hero = 0, opponent = 1, difficulty = "normal") {
  if (!CHARACTERS[hero] || !CHARACTERS[opponent] || hero === opponent)
    throw new Error("Invalid fighters");
  const fighter = (index, x, dir) => ({
    character: index,
    x,
    y: 2,
    hp: CHARACTERS[index].hp,
    maxHp: CHARACTERS[index].hp,
    energy: CHARACTERS[index].energy,
    maxEnergy: 100,
    dir,
  });
  return {
    player: fighter(hero, 1, "east"),
    enemy: fighter(opponent, 3, "west"),
    round: 1,
    result: null,
    history: [],
    difficulty,
  };
}
export function createTournament(hero = 0, difficulty = "normal") {
  const opponents = [0, 1, 2, 3].filter((i) => i !== hero);
  return {
    hero,
    opponents,
    stage: 0,
    wins: 0,
    difficulty,
    finished: false,
    match: createMatch(hero, opponents[0], difficulty),
  };
}
export function nextMatch(tournament) {
  if (tournament.match.result !== "win" || tournament.finished)
    return tournament;
  const t = clone(tournament);
  t.wins++;
  t.stage++;
  if (t.stage >= t.opponents.length) {
    t.finished = true;
    return t;
  }
  t.match = createMatch(t.hero, t.opponents[t.stage], t.difficulty);
  return t;
}
export function retryMatch(tournament) {
  return {
    ...clone(tournament),
    match: createMatch(
      tournament.hero,
      tournament.opponents[tournament.stage],
      tournament.difficulty,
    ),
  };
}
export function targetCells(fighter, a) {
  const [dx, dy] = DIRECTIONS[a.dir],
    n = a.id === "spell" ? 3 : a.id === "dash" ? 2 : 1;
  if (a.id === "focus") return [{ x: fighter.x, y: fighter.y }];
  return Array.from({ length: n }, (_, i) => ({
    x: fighter.x + dx * (i + 1),
    y: fighter.y + dy * (i + 1),
  })).filter(validCell);
}
export function planPreview(fighter, plan) {
  const f = clone(fighter);
  const steps = [];
  for (const a of plan) {
    if (!CARDS[a.id] || !DIRECTIONS[a.dir]) throw new Error("Invalid plan");
    const card = CARDS[a.id],
      enough = f.energy >= card.cost;
    const origin = { x: f.x, y: f.y };
    if (enough) {
      f.energy -= card.cost;
      if (a.id === "focus") f.energy = Math.min(100, f.energy + 26);
      if (a.id === "guard") f.energy = Math.min(100, f.energy + 8);
      if (a.id === "move" || a.id === "dash") {
        const cells = targetCells(f, a);
        if (cells.length) Object.assign(f, cells.at(-1));
      }
    }
    f.dir = a.dir;
    steps.push({
      action: a,
      origin,
      position: { x: f.x, y: f.y },
      energy: f.energy,
      enough,
      targets: targetCells({ ...f, ...origin }, a),
    });
  }
  return { fighter: f, steps };
}
function facingThreat(defender, attacker, dir) {
  const [dx, dy] = DIRECTIONS[dir];
  const ax = attacker.x - defender.x,
    ay = attacker.y - defender.y;
  return dx
    ? Math.sign(ax) === dx && Math.abs(ax) >= Math.abs(ay)
    : Math.sign(ay) === dy && Math.abs(ay) >= Math.abs(ax);
}
export function resolveBeat(match, playerAction, enemyAction) {
  if (match.result) return { match: clone(match), events: [] };
  const s = clone(match),
    actors = [s.player, s.enemy],
    actions = [playerAction, enemyAction],
    events = [];
  const names = ["player", "enemy"];
  for (const a of actions)
    if (!CARDS[a.id] || !DIRECTIONS[a.dir]) throw new Error("Invalid action");
  const active = actors.map((f, i) => f.energy >= CARDS[actions[i].id].cost);
  actors.forEach((f, i) => {
    f.dir = actions[i].dir;
    if (active[i]) f.energy -= CARDS[actions[i].id].cost;
    else events.push({ type: "exhausted", who: names[i], text: "기력 부족" });
  });
  const starts = actors.map((f) => ({ x: f.x, y: f.y }));
  const desired = actors.map((f, i) => {
    if (!active[i] || !["move", "dash"].includes(actions[i].id))
      return { ...starts[i] };
    const [dx, dy] = DIRECTIONS[actions[i].dir],
      count = actions[i].id === "dash" ? 2 : 1;
    let p = { ...starts[i] };
    for (let n = 0; n < count; n++) {
      const next = { x: p.x + dx, y: p.y + dy };
      if (!validCell(next) || same(next, starts[1 - i])) break;
      p = next;
    }
    return p;
  });
  if (same(desired[0], desired[1])) {
    desired[0] = starts[0];
    desired[1] = starts[1];
    events.push({ type: "clash", text: "길이 겹쳤다!" });
  }
  actors.forEach((f, i) => {
    Object.assign(f, desired[i]);
    if (!same(starts[i], f))
      events.push({
        type: "move",
        who: names[i],
        from: starts[i],
        to: desired[i],
      });
  });
  const damage = [0, 0];
  actors.forEach((f, i) => {
    if (!active[i]) return;
    const a = actions[i],
      other = 1 - i,
      foe = actors[other],
      stats = CHARACTERS[f.character];
    if (a.id === "focus") {
      f.energy = Math.min(100, f.energy + 26);
      events.push({ type: "focus", who: names[i], text: "+26 기력" });
    }
    if (a.id === "guard") {
      f.energy = Math.min(100, f.energy + 8);
      events.push({ type: "guard", who: names[i], text: "금강막" });
    }
    if (["slash", "spell"].includes(a.id)) {
      const cells = targetCells(f, a),
        hit = cells.some((p) => same(p, foe));
      let amount = 0,
        blocked = false;
      if (hit) {
        amount =
          CARDS[a.id].damage + (a.id === "slash" ? stats.damage : stats.spell);
        blocked =
          active[other] &&
          actions[other].id === "guard" &&
          facingThreat(foe, f, actions[other].dir);
        if (blocked) {
          amount = Math.max(1, Math.round(amount * 0.2));
          damage[i] += CHARACTERS[foe.character].id === "ember" ? 6 : 3;
        }
        damage[other] += amount;
      }
      events.push({
        type: a.id,
        who: names[i],
        target: names[other],
        cells,
        hit,
        blocked,
        amount,
        text: hit ? `${blocked ? "방어 · " : ""}-${amount}` : "빗나감",
      });
    }
  });
  actors.forEach((f, i) => {
    f.hp = Math.max(0, f.hp - damage[i]);
  });
  if (!s.player.hp && !s.enemy.hp) s.result = "draw";
  else if (!s.enemy.hp) s.result = "win";
  else if (!s.player.hp) s.result = "lose";
  s.history = [
    ...s.history,
    { actions: clone(actions), events: clone(events) },
  ].slice(-12);
  return { match: s, events };
}
export function finishRound(match) {
  const s = clone(match);
  if (s.result) return s;
  s.player.energy = Math.min(100, s.player.energy + 5);
  s.enemy.energy = Math.min(100, s.enemy.energy + 5);
  s.round++;
  if (s.round > 30) {
    const p = s.player.hp / s.player.maxHp,
      e = s.enemy.hp / s.enemy.maxHp;
    s.result = Math.abs(p - e) < 0.001 ? "draw" : p > e ? "win" : "lose";
  }
  return s;
}
export function resolvePlans(match, playerPlan, enemyPlan) {
  if (playerPlan.length !== 3 || enemyPlan.length !== 3)
    throw new Error("Exactly three actions required");
  let state = clone(match);
  const beats = [];
  for (let i = 0; i < 3; i++) {
    const beat = resolveBeat(state, playerPlan[i], enemyPlan[i]);
    state = beat.match;
    beats.push(beat);
    if (state.result) break;
  }
  return { match: finishRound(state), beats };
}
const allActions = () =>
  Object.keys(CARDS).flatMap((id) =>
    id === "focus"
      ? [action(id)]
      : Object.keys(DIRECTIONS).map((dir) => action(id, dir)),
  );
function directionToward(from, to) {
  const dx = to.x - from.x,
    dy = to.y - from.y;
  return Math.abs(dx) >= Math.abs(dy)
    ? dx >= 0
      ? "east"
      : "west"
    : dy >= 0
      ? "south"
      : "north";
}
function guessedAction(player, enemy, step) {
  const dir = directionToward(player, enemy),
    d = distance(player, enemy);
  if (player.energy < 10) return action("focus", dir);
  if (d === 1) return action(step === 1 ? "guard" : "slash", dir);
  if (
    (player.x === enemy.x || player.y === enemy.y) &&
    d <= 3 &&
    player.energy >= 24
  )
    return action("spell", dir);
  return action("move", dir);
}
export function chooseEnemyPlan(match) {
  // A bounded, deterministic three-ply greedy forecast. It never receives the player's queue.
  let forecast = clone(match);
  const plan = [];
  for (let step = 0; step < 3; step++) {
    const predicted = guessedAction(forecast.player, forecast.enemy, step);
    let best = null,
      bestValue = -Infinity;
    for (const a of allActions()) {
      if (CARDS[a.id].cost > forecast.enemy.energy) continue;
      const result = resolveBeat(forecast, predicted, a).match;
      const dealt = forecast.player.hp - result.player.hp,
        received = forecast.enemy.hp - result.enemy.hp;
      const distanceValue = -distance(result.player, result.enemy) * 1.9;
      const desiredEnergy = forecast.enemy.energy < 30 ? 1 : 0.25;
      let value =
        dealt * 1.5 -
        received * (match.difficulty === "easy" ? 0.55 : 1.35) +
        distanceValue +
        (result.enemy.energy - forecast.enemy.energy) * desiredEnergy;
      if (a.id === "focus" && forecast.enemy.energy > 75) value -= 25;
      if (a.id === "move" || a.id === "dash") {
        if (same(result.enemy, forecast.enemy)) value -= 10;
        else value += 0.5;
      }
      if (a.id === "guard" && dealt === 0 && received === 0) value -= 7;
      if (result.result === "lose") value += 1000;
      // A tiny changing preference prevents identical stalemate scripts without unbounded search.
      value += ((match.round + step + a.id.length + a.dir.length) % 7) * 0.015;
      if (value > bestValue) {
        bestValue = value;
        best = a;
      }
    }
    plan.push(best || action("focus"));
    forecast = resolveBeat(forecast, predicted, plan.at(-1)).match;
    if (forecast.result) forecast.result = null;
  }
  return plan;
}
