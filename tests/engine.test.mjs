import test from "node:test";
import assert from "node:assert/strict";
import {
  SIZE,
  CHARACTERS,
  CARDS,
  action,
  validCell,
  createMatch,
  createTournament,
  nextMatch,
  retryMatch,
  targetCells,
  planPreview,
  resolveBeat,
  resolvePlans,
  finishRound,
  chooseEnemyPlan,
} from "../src/engine.mjs";
const a = action;
function closeMatch() {
  const s = createMatch();
  s.player.x = 1;
  s.enemy.x = 2;
  return s;
}
test("five rows and five columns, distinct legal initial positions", () => {
  const s = createMatch();
  assert.equal(SIZE, 5);
  assert(validCell(s.player));
  assert(validCell(s.enemy));
  assert.notEqual(s.player.x, s.enemy.x);
});
test("all four playable fighters have distinct original identities and stats", () => {
  assert.equal(new Set(CHARACTERS.map((c) => c.id)).size, 4);
  assert.equal(new Set(CHARACTERS.map((c) => c.hp)).size, 4);
  for (let h = 0; h < 4; h++) {
    const t = createTournament(h);
    assert.equal(t.opponents.length, 3);
    assert(!t.opponents.includes(h));
  }
});
test("invalid fighter and action inputs are rejected", () => {
  assert.throws(() => createMatch(0, 0));
  assert.throws(() => createMatch(10, 1));
  assert.throws(() => a("wrong"));
  assert.throws(() => a("move", "none"));
});
test("grid bounds exclude invalid and fractional positions", () => {
  assert(!validCell({ x: -1, y: 0 }));
  assert(!validCell({ x: 5, y: 1 }));
  assert(!validCell({ x: 1, y: 5 }));
  assert(!validCell({ x: 1.5, y: 3 }));
});
test("movement changes rows, not only one-dimensional distance", () => {
  let s = createMatch();
  s = resolveBeat(s, a("move", "north"), a("focus")).match;
  assert.equal(s.player.y, 1);
  s = resolveBeat(s, a("move", "south"), a("focus")).match;
  assert.equal(s.player.y, 2);
});
test("boundary movement clamps to legal cells", () => {
  const s = createMatch();
  s.player.x = 0;
  s.player.y = 0;
  const r = resolveBeat(s, a("move", "west"), a("focus")).match;
  assert.equal(r.player.x, 0);
  assert.equal(r.player.y, 0);
});
test("dash moves exactly two cells if free and spends energy", () => {
  const s = createMatch();
  const r = resolveBeat(s, a("dash", "north"), a("focus")).match;
  assert.equal(r.player.y, 0);
  assert.equal(r.player.energy, s.player.energy - 12);
});
test("dash cannot tunnel through a standing opponent", () => {
  const s = closeMatch();
  const r = resolveBeat(s, a("dash", "east"), a("focus")).match;
  assert.equal(r.player.x, 1);
});
test("two fighters targeting same cell both stop", () => {
  const s = createMatch();
  const r = resolveBeat(s, a("move", "east"), a("move", "west"));
  assert.equal(r.match.player.x, 1);
  assert.equal(r.match.enemy.x, 3);
  assert(r.events.some((e) => e.type === "clash"));
});
test("adjacent fighters cannot swap through each other", () => {
  const s = closeMatch();
  const r = resolveBeat(s, a("move", "east"), a("move", "west")).match;
  assert.equal(r.player.x, 1);
  assert.equal(r.enemy.x, 2);
});
test("slash only hits the chosen adjacent direction", () => {
  const s = closeMatch();
  assert.equal(
    resolveBeat(s, a("slash", "east"), a("focus")).match.enemy.hp,
    s.enemy.hp - 25,
  );
  assert.equal(
    resolveBeat(s, a("slash", "north"), a("focus")).match.enemy.hp,
    s.enemy.hp,
  );
});
test("move is resolved before attack so dodging changes the outcome", () => {
  const s = closeMatch();
  const r = resolveBeat(s, a("slash", "east"), a("move", "north"));
  assert.equal(r.match.enemy.hp, s.enemy.hp);
  assert(r.events.some((e) => e.type === "slash" && !e.hit));
});
test("spell reaches straight three-cell line and no diagonal", () => {
  const s = createMatch();
  s.enemy.x = 4;
  const hit = resolveBeat(s, a("spell", "east"), a("focus")).match;
  assert.equal(hit.enemy.hp, s.enemy.hp - 32);
  s.enemy.y = 3;
  assert.equal(
    resolveBeat(s, a("spell", "east"), a("focus")).match.enemy.hp,
    s.enemy.hp,
  );
});
test("spell can be dodged by leaving the threatened row", () => {
  const s = createMatch();
  const r = resolveBeat(s, a("spell", "east"), a("move", "north")).match;
  assert.equal(r.enemy.hp, s.enemy.hp);
});
test("facing guard reduces damage by 80 percent and counterattacks", () => {
  const s = closeMatch();
  const r = resolveBeat(s, a("slash", "east"), a("guard", "west")).match;
  assert.equal(r.enemy.hp, s.enemy.hp - 5);
  assert.equal(r.player.hp, s.player.hp - 3);
});
test("guard facing away does not block", () => {
  const s = closeMatch();
  const r = resolveBeat(s, a("slash", "east"), a("guard", "east")).match;
  assert.equal(r.enemy.hp, s.enemy.hp - 25);
});
test("monk guard has its own counterattack bonus", () => {
  const s = createMatch(0, 2);
  s.enemy.x = 2;
  const r = resolveBeat(s, a("slash", "east"), a("guard", "west")).match;
  assert.equal(r.player.hp, s.player.hp - 6);
});
test("attacks are simultaneous including double knockouts", () => {
  const s = closeMatch();
  s.player.hp = 1;
  s.enemy.hp = 1;
  const r = resolveBeat(s, a("slash", "east"), a("slash", "west")).match;
  assert.equal(r.player.hp, 0);
  assert.equal(r.enemy.hp, 0);
  assert.equal(r.result, "draw");
});
test("insufficient energy fails safely without becoming negative", () => {
  const s = closeMatch();
  s.player.energy = 2;
  const r = resolveBeat(s, a("spell", "east"), a("focus"));
  assert.equal(r.match.player.energy, 2);
  assert.equal(r.match.enemy.hp, s.enemy.hp);
  assert(r.events.some((e) => e.type === "exhausted"));
});
test("focus restores energy without exceeding cap", () => {
  const s = createMatch();
  s.player.energy = 90;
  assert.equal(resolveBeat(s, a("focus"), a("focus")).match.player.energy, 100);
});
test("guard restores eight energy", () => {
  const s = createMatch();
  assert.equal(
    resolveBeat(s, a("guard"), a("focus")).match.player.energy,
    s.player.energy + 8,
  );
});
test("archer and storm have independent spell modifiers", () => {
  const s = createMatch(1, 3);
  const r = resolveBeat(s, a("spell", "east"), a("spell", "west")).match;
  assert.equal(r.enemy.hp, s.enemy.hp - 37);
  assert.equal(r.player.hp, s.player.hp - 35);
});
test("three-card preview tracks movement then targets from moved location", () => {
  const s = createMatch();
  const p = planPreview(s.player, [
    a("move", "north"),
    a("spell", "east"),
    a("focus"),
  ]);
  assert.deepEqual(p.steps[1].origin, { x: 1, y: 1 });
  assert.equal(p.fighter.energy, 57);
  assert.equal(p.fighter.y, 1);
  assert.equal(p.steps.length, 3);
});
test("preview marks unaffordable plans without subtracting energy", () => {
  const s = createMatch();
  s.player.energy = 5;
  const p = planPreview(s.player, [a("spell"), a("focus"), a("spell")]);
  assert.equal(p.steps[0].enough, false);
  assert.equal(p.steps[1].energy, 31);
  assert.equal(p.fighter.energy, 7);
});
test("target preview never leaves the 5x5 grid", () => {
  for (let x = 0; x < 5; x++)
    for (let y = 0; y < 5; y++)
      for (const dir of ["north", "east", "south", "west"])
        for (const id of Object.keys(CARDS))
          assert(targetCells({ x, y }, a(id, dir)).every(validCell));
});
test("one round requires exactly three actions from each side", () => {
  assert.throws(() => resolvePlans(createMatch(), [a("focus")], [a("focus")]));
});
test("round end restores five energy and advances counter once", () => {
  const s = createMatch();
  const r = resolvePlans(
    s,
    [a("move", "north"), a("move", "east"), a("move", "south")],
    [a("move", "south"), a("move", "west"), a("move", "south")],
  );
  assert.equal(r.beats.length, 3);
  assert.equal(r.match.round, 2);
  assert.equal(r.match.player.energy, s.player.energy + 5);
});
test("finished match is immutable and does not receive extra actions", () => {
  const s = createMatch();
  s.result = "win";
  const before = structuredClone(s);
  assert.deepEqual(resolveBeat(s, a("spell"), a("focus")).match, before);
  assert.deepEqual(finishRound(s), before);
});
test("resolution never mutates caller state or action queues", () => {
  const s = createMatch(),
    before = structuredClone(s),
    plan = [a("move"), a("focus"), a("spell")],
    planBefore = structuredClone(plan);
  resolvePlans(s, plan, chooseEnemyPlan(s));
  assert.deepEqual(s, before);
  assert.deepEqual(plan, planBefore);
});
test("round limit ends a noncombat match rather than looping forever", () => {
  let s = createMatch();
  for (let n = 0; n < 30; n++)
    s = resolvePlans(
      s,
      [a("focus"), a("focus"), a("focus")],
      [a("focus"), a("focus"), a("focus")],
    ).match;
  assert.equal(s.result, "draw");
  assert.equal(s.round, 31);
});
test("round-limit judgment compares health proportions, not character max HP", () => {
  const s = createMatch(0, 2);
  s.round = 30;
  s.player.hp = 66;
  s.enemy.hp = 62;
  assert.equal(finishRound(s).result, "win");
});
test("AI receives no player queue, chooses finite legal affordable plan", () => {
  const s = createMatch(),
    before = structuredClone(s);
  const plan = chooseEnemyPlan(s);
  assert.equal(plan.length, 3);
  assert.deepEqual(chooseEnemyPlan(s), plan);
  assert.deepEqual(s, before);
  assert(planPreview(s.enemy, plan).steps.every((p) => p.enough));
});
test("AI attacks an exposed adjacent target instead of spamming focus", () => {
  const s = closeMatch();
  const p = chooseEnemyPlan(s);
  assert(p.some((a) => ["slash", "spell"].includes(a.id)));
});
test("AI conserves or regains energy when empty", () => {
  const s = createMatch();
  s.enemy.energy = 0;
  const p = chooseEnemyPlan(s);
  assert(planPreview(s.enemy, p).steps.every((x) => x.enough));
  assert(p.some((x) => ["focus", "guard", "move"].includes(x.id)));
});
test("AI can move between rows to acquire a distant target", () => {
  const s = createMatch();
  s.player.x = 0;
  s.player.y = 0;
  s.enemy.x = 4;
  s.enemy.y = 4;
  const p = chooseEnemyPlan(s);
  assert(p.some((a) => ["move", "dash"].includes(a.id)));
});
test("complete tournament advances exactly three opponents and ends in champion", () => {
  let t = createTournament(0);
  for (let n = 0; n < 3; n++) {
    assert.equal(t.stage, n);
    t.match.result = "win";
    t = nextMatch(t);
  }
  assert(t.finished);
  assert.equal(t.wins, 3);
  assert.equal(t.stage, 3);
});
test("loss cannot skip ahead and rematch preserves selected opponent", () => {
  const t = createTournament(2);
  t.match.result = "lose";
  const same = nextMatch(t);
  assert.equal(same.stage, 0);
  const r = retryMatch(t);
  assert.equal(r.match.result, null);
  assert.equal(r.match.enemy.character, t.opponents[0]);
  assert.equal(r.match.player.hp, 125);
});
test("long-run safety for all twelve matchups and both difficulty modes", () => {
  for (const difficulty of ["easy", "normal"])
    for (let h = 0; h < 4; h++)
      for (let e = 0; e < 4; e++) {
        if (h === e) continue;
        let s = createMatch(h, e, difficulty);
        for (let round = 0; round < 30 && !s.result; round++) {
          const mirrored = {
            ...structuredClone(s),
            player: structuredClone(s.enemy),
            enemy: structuredClone(s.player),
          };
          const p = chooseEnemyPlan(mirrored);
          s = resolvePlans(s, p, chooseEnemyPlan(s)).match;
          for (const f of [s.player, s.enemy]) {
            assert(validCell(f));
            assert(f.hp >= 0 && f.hp <= f.maxHp);
            assert(f.energy >= 0 && f.energy <= 100);
          }
          assert(!(s.player.x === s.enemy.x && s.player.y === s.enemy.y));
        }
        assert(s.result, "every match must terminate");
      }
});
