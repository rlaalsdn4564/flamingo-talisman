export const WIDTH = 1200,
  HEIGHT = 480;
export function scenePoint(x, y, height = HEIGHT) {
  const scale = Math.min(1, height / HEIGHT);
  return { x: (x - 600 * (1 - scale)) / scale, y: y / scale };
}
export const SPRITE_RECTS = [
  [0, 0, 410, 1024],
  [410, 0, 395, 1024],
  [802, 0, 350, 1024],
  [1150, 0, 386, 1024],
];
export function tileRect(x, y) {
  const top = 153 + y * 49,
    spread = 0.83 + y * 0.047;
  return { x: 600 + (x - 2.5) * 155 * spread, y: top, w: 155 * spread, h: 49 };
}
export function cellAt(x, y) {
  for (let row = 0; row < 5; row++)
    for (let col = 0; col < 5; col++) {
      const r = tileRect(col, row);
      if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h)
        return { x: col, y: row };
    }
  return null;
}
export function foot(x, y) {
  const r = tileRect(x, y);
  return { x: r.x + r.w / 2, y: r.y + r.h * 0.8 };
}
export function isKeyColor(r, g, b) {
  return r > 170 && b > 145 && g < 130 && r - g > 95 && b - g > 80;
}
export function keyedSprite(image) {
  const c = document.createElement("canvas");
  c.width = image.width;
  c.height = image.height;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(image, 0, 0);
  const pixels = ctx.getImageData(0, 0, c.width, c.height),
    d = pixels.data;
  for (let i = 0; i < d.length; i += 4)
    if (isKeyColor(d[i], d[i + 1], d[i + 2])) d[i + 3] = 0;
  ctx.putImageData(pixels, 0, 0);
  return c;
}
function tile(ctx, p, fill, stroke) {
  const r = tileRect(p.x, p.y);
  ctx.fillStyle = fill;
  ctx.fillRect(r.x + 2, r.y + 2, r.w - 4, r.h - 4);
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 2;
    ctx.strokeRect(r.x + 2, r.y + 2, r.w - 4, r.h - 4);
  }
}
function drawFighter(ctx, f, sprite, who, time, events, reduced, beatProgress) {
  let p = foot(f.x, f.y);
  const movement = events.find((e) => e.who === who && e.type === "move");
  if (movement && !reduced) {
    const from = foot(movement.from.x, movement.from.y),
      t = Math.min(1, beatProgress / 0.4),
      ease = 1 - (1 - t) ** 3;
    p = {
      x: from.x + (p.x - from.x) * ease,
      y: from.y + (p.y - from.y) * ease,
    };
  }
  const scale = 0.9 + f.y * 0.05,
    rect = SPRITE_RECTS[f.character],
    h = 225 * scale,
    w = (rect[2] / rect[3]) * h;
  const damaged = events.some((e) => e.target === who && e.hit),
    attacking = events.find(
      (e) => e.who === who && ["slash", "spell"].includes(e.type),
    );
  const pulse = reduced ? 0 : Math.sin(time * 0.003) * 1.8;
  let lean = 0;
  if (attacking && !reduced)
    lean = Math.sin(Math.min(1, beatProgress / 0.6) * Math.PI) * 15;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.fillStyle = "#0008";
  ctx.beginPath();
  ctx.ellipse(0, 0, w * 0.55, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = who === "player" ? "#ffb0a2" : "#a7d9dd";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(0, 0, w * 0.63, 11, 0, 0, Math.PI * 2);
  ctx.stroke();
  const face =
    f.dir === "west" ? -1 : f.dir === "east" ? 1 : who === "enemy" ? -1 : 1;
  ctx.scale(face, 1);
  ctx.translate(lean, pulse);
  if (damaged) ctx.globalAlpha = 0.82;
  if (sprite) ctx.drawImage(sprite, ...rect, -w * 0.5, -h, w, h);
  ctx.restore();
  ctx.save();
  ctx.font = "bold 13px Galmuri, sans-serif";
  ctx.textAlign = "center";
  ctx.fillStyle = who === "player" ? "#ffbdac" : "#b4e5ec";
  ctx.shadowColor = "#000";
  ctx.shadowBlur = 4;
  ctx.fillText(who === "player" ? "나" : "상대", p.x, p.y + 29);
  ctx.restore();
}
export function drawScene(
  ctx,
  {
    match,
    background,
    sprite,
    preview = [],
    hover = null,
    dir = "east",
    hoverCard = "slash",
    targetCells = [],
    events = [],
    elapsed = 0,
    reduced = false,
    phase = "planning",
    beatProgress = 0,
    viewportHeight = HEIGHT,
  },
) {
  ctx.clearRect(0, 0, WIDTH, viewportHeight);
  if (background)
    ctx.drawImage(background, 0, 90, 1536, 820, 0, 0, WIDTH, viewportHeight);
  else {
    ctx.fillStyle = "#293b40";
    ctx.fillRect(0, 0, WIDTH, viewportHeight);
  }
  ctx.fillStyle = "#111b2730";
  ctx.fillRect(0, 0, WIDTH, viewportHeight);
  const sceneScale = Math.min(1, viewportHeight / HEIGHT);
  ctx.save();
  ctx.translate(600 * (1 - sceneScale), 0);
  ctx.scale(sceneScale, sceneScale);
  for (let y = 0; y < 5; y++)
    for (let x = 0; x < 5; x++) {
      const r = tileRect(x, y);
      ctx.fillStyle = (x + y) % 2 ? "#0a293c2b" : "#bcdde816";
      ctx.fillRect(r.x + 1, r.y + 1, r.w - 2, r.h - 2);
      ctx.strokeStyle = "#e7e4c261";
      ctx.lineWidth = 1;
      ctx.strokeRect(r.x, r.y, r.w, r.h);
    }
  if (phase === "planning") {
    for (const p of targetCells)
      tile(
        ctx,
        p,
        ["slash", "spell"].includes(hoverCard) ? "#d4325f80" : "#d9d08255",
        "#f9e3a3",
      );
    preview.forEach((step, i) => {
      tile(ctx, step.position, "#95e1dd35");
      const p = foot(step.position.x, step.position.y);
      ctx.fillStyle = "#112d38";
      ctx.beginPath();
      ctx.arc(p.x, p.y - 8, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#e1fff3";
      ctx.font = "bold 14px Galmuri";
      ctx.textAlign = "center";
      ctx.fillText(String(i + 1), p.x, p.y - 3);
    });
    if (hover) tile(ctx, hover, "#fff1", "#fff9");
  }
  if (match) {
    const actors = [
      { f: match.player, who: "player" },
      { f: match.enemy, who: "enemy" },
    ].sort((a, b) => a.f.y - b.f.y);
    for (const { f, who } of actors)
      drawFighter(ctx, f, sprite, who, elapsed, events, reduced, beatProgress);
    for (const e of events) {
      const f = match[e.who],
        op = match[e.target];
      if (!f) continue;
      const from = foot(f.x, f.y),
        to = op ? foot(op.x, op.y) : from;
      if (e.type === "guard") {
        ctx.strokeStyle = "#f2d271";
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.ellipse(
          from.x,
          from.y - 75,
          60,
          90,
          0,
          Math.PI * 0.7,
          Math.PI * 2.3,
        );
        ctx.stroke();
      }
      if (e.type === "slash") {
        ctx.strokeStyle = e.hit ? "#fff8dc" : "#f1ded488";
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.moveTo(from.x - 30, from.y - 150);
        ctx.quadraticCurveTo(to.x + 70, to.y - 140, to.x + 45, to.y - 35);
        ctx.stroke();
        ctx.strokeStyle = "#e49b75";
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      if (e.type === "spell") {
        for (const cell of e.cells) tile(ctx, cell, "#d648765e");
        ctx.strokeStyle = "#edb3ab";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(from.x, from.y - 105);
        const last = e.cells.at(-1);
        if (last) {
          const p = foot(last.x, last.y);
          ctx.lineTo(p.x, p.y - 105);
        }
        ctx.stroke();
        for (let n = 0; n < 3; n++) {
          const t = (n + 1) / 4,
            p = {
              x: from.x + (to.x - from.x) * t,
              y: from.y - 120 + (to.y - from.y) * t,
            };
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(-0.18 + n * 0.2);
          ctx.fillStyle = "#f9e7b4";
          ctx.fillRect(-10, -23, 20, 46);
          ctx.fillStyle = "#a2373a";
          ctx.font = "18px serif";
          ctx.textAlign = "center";
          ctx.fillText("封", 0, 6);
          ctx.restore();
        }
      }
      if (e.text) {
        const p = e.target ? to : from;
        ctx.save();
        ctx.font = "bold 22px Galmuri";
        ctx.textAlign = "center";
        ctx.strokeStyle = "#162027";
        ctx.lineWidth = 5;
        ctx.strokeText(e.text, p.x, p.y - 210);
        ctx.fillStyle = e.hit ? "#ffdad0" : "#f7e5b1";
        ctx.fillText(e.text, p.x, p.y - 210);
        ctx.restore();
      }
    }
  }
  ctx.font = "12px Galmuri";
  ctx.fillStyle = "#fff9";
  ctx.textAlign = "left";
  ctx.fillText("5 × 5 결계", 32, HEIGHT - 25);
  ctx.textAlign = "right";
  ctx.fillText(
    phase === "planning"
      ? "격자를 누르면 카드의 방향을 바꿉니다"
      : "두 전사의 행동이 동시에 처리됩니다",
    WIDTH - 32,
    HEIGHT - 25,
  );
  ctx.restore();
}
