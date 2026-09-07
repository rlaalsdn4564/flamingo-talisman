import test from "node:test";
import assert from "node:assert/strict";
import {
  tileRect,
  cellAt,
  foot,
  isKeyColor,
  SPRITE_RECTS,
  scenePoint,
} from "../src/render.mjs";
test("compact battle coordinates preserve exact logical targeting", () => {
  for (const h of [240, 300, 480]) {
    const scale = h / 480;
    for (let y = 0; y < 5; y++)
      for (let x = 0; x < 5; x++) {
        const p = foot(x, y),
          q = scenePoint(p.x * scale + 600 * (1 - scale), p.y * scale, h);
        assert.deepEqual(cellAt(q.x, q.y), { x, y });
      }
  }
});
test("all 25 projected cell centers map back to their exact cell", () => {
  for (let y = 0; y < 5; y++)
    for (let x = 0; x < 5; x++) {
      const r = tileRect(x, y);
      assert.deepEqual(cellAt(r.x + r.w / 2, r.y + r.h / 2), { x, y });
    }
});
test("portrait foot anchors stay inside corresponding cells", () => {
  for (let y = 0; y < 5; y++)
    for (let x = 0; x < 5; x++) {
      const p = foot(x, y);
      assert.deepEqual(cellAt(p.x, p.y), { x, y });
    }
});
test("coordinates outside tactical board produce no phantom clicks", () => {
  assert.equal(cellAt(0, 0), null);
  assert.equal(cellAt(1200, 480), null);
});
test("chroma key removes the generated magenta but preserves pale feathers and red clothing", () => {
  assert(isKeyColor(255, 0, 255));
  assert(isKeyColor(235, 20, 219));
  assert(!isKeyColor(245, 240, 233));
  assert(!isKeyColor(234, 97, 91));
  assert(!isKeyColor(16, 25, 34));
});
test("all four sprite frames fit original generated atlas", () => {
  for (const [x, y, w, h] of SPRITE_RECTS) {
    assert(x >= 0 && y >= 0);
    assert(w > 0 && h > 0);
    assert(x + w <= 1536 && y + h <= 1024);
  }
});
