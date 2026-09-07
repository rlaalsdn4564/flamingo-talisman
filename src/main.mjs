import "./style.css";
import { openHelp, closeHelp, canAdvanceSession } from "./session.mjs";
import {
  CARDS,
  CHARACTERS,
  DIRECTION_NAMES,
  action,
  createTournament,
  nextMatch,
  retryMatch,
  planPreview,
  targetCells,
  chooseEnemyPlan,
  resolveBeat,
  finishRound,
} from "./engine.mjs";
import {
  WIDTH,
  HEIGHT,
  drawScene,
  keyedSprite,
  cellAt,
  scenePoint,
} from "./render.mjs";
const app = document.querySelector("#app");
const state = {
  screen: "title",
  hero: 0,
  difficulty: "normal",
  tournament: null,
  plan: [],
  enemyPlan: [],
  phase: "planning",
  beat: 0,
  dir: "east",
  hoverCard: "slash",
  hover: null,
  events: [],
  paused: false,
  help: false,
  helpWasPaused: false,
  muted: true,
  elapsed: 0,
  beatTimer: 0,
  message: "세 수를 고르세요. 상대의 첫 수는 공개됩니다.",
  reduced: matchMedia("(prefers-reduced-motion: reduce)").matches,
};
let background = null,
  sprite = null,
  canvas = null,
  ctx = null,
  audio = null,
  last = 0,
  raf = 0;
const PORTRAIT_BOUNDS = [
  [0, 410],
  [410, 399],
  [822, 328],
  [1150, 386],
];
const portrait = (index, cls = "") => {
  const [x, w] = PORTRAIT_BOUNDS[index];
  return `<div class="portrait portrait-${index} ${cls}" style="--portrait-size:${(1536 / w) * 100}%;--portrait-x:${(x / (1536 - w)) * 100}%" aria-hidden="true"></div>`;
};
const chevrons = { north: "↑", east: "→", south: "↓", west: "←" };
function sound(kind = "click") {
  if (state.muted) return;
  try {
    audio ??= new AudioContext();
    if (audio.state === "suspended") void audio.resume();
    const osc = audio.createOscillator(),
      gain = audio.createGain();
    osc.connect(gain);
    gain.connect(audio.destination);
    osc.type = kind === "strike" ? "triangle" : "sine";
    osc.frequency.setValueAtTime(
      kind === "strike" ? 180 : 440,
      audio.currentTime,
    );
    osc.frequency.exponentialRampToValueAtTime(
      kind === "strike" ? 65 : 660,
      audio.currentTime + 0.09,
    );
    gain.gain.setValueAtTime(0.035, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.16);
    osc.start();
    osc.stop(audio.currentTime + 0.17);
  } catch {
    /* Audio remains optional. */
  }
}
function header() {
  return `<header class="masthead"><a href="#" data-command="title" class="brand">紅鶴 <span>부적대전</span><small>TALISMAN TOURNAMENT</small></a><nav aria-label="게임 메뉴"><button data-command="help">놀이 방법 <kbd>H</kbd></button><button data-command="sound" aria-pressed="${!state.muted}">${state.muted ? "소리 끔" : "소리 켬"}</button>${state.screen === "battle" ? `<button data-command="pause">일시정지 <kbd>P</kbd></button>` : ""}</nav></header>`;
}
function titleScreen() {
  return `<section class="title-scene"><div class="title-copy"><p class="overline">FLAMINGO YOKAI CHRONICLES</p><h1>홍학<br>부적대전<span>세 수 앞에, 승부가 있다.</span></h1><p>검과 부적이 부딪히는 새벽.<br>다섯 줄의 결계 위에서 다음 수를 읽어라.</p><button class="primary title-start" data-command="select">산문에 들어가기 <span>→</span></button><button class="text-button" data-command="help">처음이라면 · 놀이 방법</button></div><div class="title-figures"><div class="title-warrior first">${portrait(0)}</div><div class="title-warrior last">${portrait(3)}</div><span class="vertical-label">첫째 장 · 새벽의 결계</span></div><div class="title-bottom">5 × 5 전술 결계 <span>3장 동시 계획</span> 3연전 토너먼트</div></section>`;
}
function selectScreen() {
  return `<section class="selection"><div class="section-intro"><p class="overline">CHOOSE YOUR WARRIOR</p><h1>산문을 넘을 자.</h1><p>한 전사를 고르면 나머지 세 전사와 차례로 겨룹니다.</p></div><div class="fighters">${CHARACTERS.map((c, i) => `<button class="fighter-option ${state.hero === i ? "chosen" : ""}" data-hero="${i}" aria-pressed="${state.hero === i}">${portrait(i)}<span class="fighter-name"><small>${c.title}</small><strong>${c.name}</strong><em>${c.trait}</em></span></button>`).join("")}</div><div class="select-bottom"><div><label for="difficulty">상대 예측 난이도</label><select id="difficulty"><option value="normal" ${state.difficulty === "normal" ? "selected" : ""}>정식 대전</option><option value="easy" ${state.difficulty === "easy" ? "selected" : ""}>입문 대전</option></select><p>${CHARACTERS[state.hero].story}</p></div><button class="primary" data-command="start">${CHARACTERS[state.hero].name}으로 출전 <span>→</span></button></div></section>`;
}
function hud(f, side) {
  const c = CHARACTERS[f.character];
  return `<div class="fighter-hud ${side}">${portrait(f.character)}<div class="fighter-vitals"><div class="hud-name"><strong>${c.name}</strong><small>${side === "player" ? "PLAYER" : `RIVAL ${state.tournament.stage + 1}`}</small></div><div class="meter-row"><span>생명</span><meter aria-label="${side === "player" ? "내" : "상대"} 생명" min="0" max="${f.maxHp}" value="${f.hp}"></meter><b>${f.hp}<small>/${f.maxHp}</small></b></div><div class="meter-row energy"><span>기력</span><meter aria-label="${side === "player" ? "내" : "상대"} 기력" min="0" max="100" value="${f.energy}"></meter><b>${f.energy}</b></div></div></div>`;
}
function battleScreen() {
  const match = state.tournament.match,
    projected = planPreview(match.player, state.plan),
    canPlan = state.phase === "planning" && !state.paused;
  return `<main class="battle"><section class="battle-hud" aria-label="대전 현황">${hud(match.player, "player")}<div class="round-medallion"><small>ROUND</small><strong>${String(match.round).padStart(2, "0")}</strong><span>${state.tournament.stage + 1} / 3 관문</span></div>${hud(match.enemy, "enemy")}</section><section class="arena"><canvas id="arena" width="${WIDTH}" height="${HEIGHT}" role="img" aria-label="5행 5열 전투판. 내 위치 ${match.player.x + 1}열 ${match.player.y + 1}행, 상대 ${match.enemy.x + 1}열 ${match.enemy.y + 1}행. 방향키로 조준하고 숫자키로 카드를 선택할 수 있습니다." tabindex="0"></canvas><div class="arena-caption"><span>${state.tournament.stage === 0 ? "一 · 안개 낀 산문" : state.tournament.stage === 1 ? "二 · 대나무의 속삭임" : "三 · 월식의 결계"}</span><span>${state.phase === "resolving" ? `${state.beat + 1}번째 수 · 동시 발동` : `상대 첫 수 · ${CARDS[state.enemyPlan[0].id].name} ${chevrons[state.enemyPlan[0].dir]}`}</span></div>${state.phase === "resolving" && state.events.some((e) => e.type === "spell") ? `<div class="cut-in">${portrait(match[state.events.find((e) => e.type === "spell").who].character)}<b>붉은 부적</b><span>${CHARACTERS[match[state.events.find((e) => e.type === "spell").who].character].name} · 결계를 가르는 한 획</span></div>` : ""}</section><section class="planning-bar"><div class="direction-panel"><span class="label">카드 방향</span><div class="d-pad" role="group" aria-label="카드 방향">${Object.entries(
    chevrons,
  )
    .map(
      ([d, g]) =>
        `<button class="dir-${d} ${state.dir === d ? "active" : ""}" data-dir="${d}" aria-label="${DIRECTION_NAMES[d]} 방향" aria-pressed="${state.dir === d}" ${!canPlan ? "disabled" : ""}>${g}</button>`,
    )
    .join(
      "",
    )}<span class="d-center">${chevrons[state.dir]}</span></div></div><div class="queue-panel"><div class="queue-heading"><span class="label">나의 세 수</span><small>예상 기력 <b>${projected.fighter.energy}</b> · 클릭하면 취소</small></div><div class="queue">${Array.from(
    { length: 3 },
    (_, i) => {
      const a = state.plan[i];
      return `<button class="queue-slot ${state.phase === "resolving" && i === state.beat ? "resolving" : ""} ${i < state.beat && state.phase === "resolving" ? "done" : ""}" data-remove="${i}" aria-label="${i + 1}번째 수 ${a ? CARDS[a.id].name : "비어 있음"}" ${!canPlan || !a ? "disabled" : ""}><span>${i + 1}</span>${a ? `<b>${CARDS[a.id].name}</b><em>${chevrons[a.dir]}</em>` : "<small>카드를 고르세요</small>"}</button>`;
    },
  ).join(
    "",
  )}</div></div><div class="enemy-plan"><span class="label">상대 첫 수</span><div><b>${state.enemyPlan[0] ? CARDS[state.enemyPlan[0].id].name : "—"}</b><strong>${state.enemyPlan[0] ? chevrons[state.enemyPlan[0].dir] : "?"}</strong></div><small>${state.phase === "resolving" ? state.enemyPlan.map((a) => CARDS[a.id].name).join(" · ") : "나머지 두 수는 봉인 중"}</small></div><div class="commit-panel"><button class="primary commit" data-command="resolve" ${!canPlan || state.plan.length !== 3 ? "disabled" : ""}>세 수 펼치기 <kbd>Enter</kbd></button><button class="text-button" data-command="clear" ${!canPlan || !state.plan.length ? "disabled" : ""}>선택 비우기 <kbd>⌫</kbd></button></div></section><section class="hand" aria-label="행동 카드">${Object.values(
    CARDS,
  )
    .map((card, i) => {
      const unavailable =
        !canPlan ||
        state.plan.length >= 3 ||
        projected.fighter.energy < card.cost;
      return `<button class="action-card card-${card.id}" data-card="${card.id}" ${unavailable ? "disabled" : ""} aria-label="${card.name}, ${card.description}, 기력 ${card.cost}"><span class="card-top"><kbd>${i + 1}</kbd><strong>${card.name}</strong><span>${card.cost ? `EN ${card.cost}` : "EN 0"}</span></span><span class="card-art">${portrait(match.player.character)}<i>${card.glyph}</i><span class="card-range">${miniRange(card.id)}</span></span><span class="card-bottom"><b>${card.tag}</b><small>${card.description}</small></span></button>`;
    })
    .join(
      "",
    )}</section><div class="battle-status" role="status" aria-live="polite"><span>${state.message}</span><span>방향키 · 1–6 카드 · Enter 확정</span></div><details class="battle-log"><summary>전투 기록 · 최근 ${match.history.length}수</summary><ol>${
    match.history
      .slice()
      .reverse()
      .map(
        (h) =>
          `<li>나: ${CARDS[h.actions[0].id].name} / 상대: ${CARDS[h.actions[1].id].name} — ${
            h.events
              .filter((e) => e.text)
              .map((e) => e.text)
              .join(", ") || "위치 유지"
          }</li>`,
      )
      .join("") || "<li>아직 펼친 부적이 없습니다.</li>"
  }</ol></details></main>`;
}
function miniRange(id) {
  return Array.from(
    { length: 9 },
    (_, i) =>
      `<s class="${i === 4 ? "origin" : (["slash", "move", "guard"].includes(id) && i === 5) || (["spell", "dash"].includes(id) && [5, 3].includes(i)) ? "lit" : ""}"></s>`,
  ).join("");
}
function championScreen() {
  const c = CHARACTERS[state.hero];
  return `<section class="champion"><p class="overline">THE SEAL IS BROKEN</p><h1>산문이 열렸다.</h1>${portrait(state.hero)}<h2>${c.name} · 새벽의 수호자</h2><p>세 전사의 부적을 모두 넘었습니다.</p><div><button class="primary" data-command="start">같은 전사로 다시</button><button data-command="select">다른 전사 고르기</button></div></section>`;
}
function overlay() {
  if (state.help)
    return `<div class="veil"><section class="modal help" role="dialog" aria-modal="true" aria-labelledby="help-title"><p class="overline">HOW TO PLAY</p><h2 id="help-title">먼저 고르고, 함께 펼친다.</h2><ol><li><b>방향부터 고르기</b><p>방향키 또는 방향판으로 조준합니다. 격자를 눌러도 그 방향으로 바뀝니다.</p></li><li><b>세 장의 부적 계획하기</b><p>1–6 또는 카드를 눌러 순서대로 담으세요. 이동 뒤의 위치와 남은 기력이 미리 보입니다. 같은 카드를 여러 번 써도 됩니다.</p></li><li><b>두 전사의 행동이 동시에 발동</b><p>이동 → 방어/회복 → 공격 순서로 한 수를 처리합니다. 같은 칸으로 가면 둘 다 멈춥니다. 상대가 움직이면 공격은 빗나갈 수 있습니다.</p></li><li><b>정면을 막고, 빈틈을 노리기</b><p>방어 방향에서 오는 피해는 80% 감소하고 작은 반격이 생깁니다. 부적은 직선 3칸, 검은 바로 앞 1칸입니다.</p></li></ol><p class="fine-print">매 라운드 기력 +5. 30라운드 뒤에는 남은 생명 비율로 판정합니다. 세 관문 사이에는 생명과 기력이 모두 회복됩니다.</p><button class="primary" data-command="close-help">알겠습니다</button></section></div>`;
  if (state.screen === "battle" && state.tournament.match.result) {
    const r = state.tournament.match.result;
    return `<div class="veil"><section class="modal result" role="dialog" aria-modal="true" aria-labelledby="result-title"><p class="overline">GATE ${state.tournament.stage + 1} / 3</p><h2 id="result-title">${r === "win" ? "결계를 넘었다." : r === "draw" ? "두 부적이 멎었다." : "다시, 칼을 쥐어라."}</h2><p>${r === "win" ? `${CHARACTERS[state.tournament.match.enemy.character].name}의 부적이 잠잠해졌습니다.` : r === "draw" ? "무승부입니다. 같은 관문에서 다시 겨룹니다." : "상대의 첫 수와 공격 방향을 다시 읽어 보세요."}</p><div class="result-buttons">${r === "win" ? `<button class="primary" data-command="next">${state.tournament.stage === 2 ? "산문 열기" : "다음 관문"}</button>` : ""}<button ${r !== "win" ? 'class="primary"' : ""} data-command="rematch">이 대전 다시</button><button data-command="select">전사 바꾸기</button></div></section></div>`;
  }
  if (state.paused)
    return `<div class="veil"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="pause-title"><p class="overline">PAUSED</p><h2 id="pause-title">부적을 잠시 접어 둡니다.</h2><p>창이 비활성화되면 대전도 멈춥니다.<br>계획과 현재 행동은 그대로 보존됩니다.</p><div class="result-buttons"><button class="primary" data-command="resume">계속하기</button><button data-command="rematch">대전 처음부터</button><button data-command="select">전사 선택</button></div></section></div>`;
  return "";
}
function render() {
  app.innerHTML = `<div class="game-shell" ${state.help || state.paused || (state.screen === "battle" && state.tournament.match.result) ? "inert" : ""}>${header()}${state.screen === "title" ? titleScreen() : state.screen === "select" ? selectScreen() : state.screen === "champion" ? championScreen() : battleScreen()}<footer><span>독립 게임 · 원작 자산 없는 홍학 패러디</span><span>FLAMINGO TALISMAN / 2026</span></footer></div>${overlay()}`;
  canvas = document.querySelector("#arena");
  syncCanvas();
  ctx = canvas?.getContext("2d");
  if (canvas) {
    canvas.addEventListener("pointermove", canvasHover);
    canvas.addEventListener("pointerleave", () => (state.hover = null));
    canvas.addEventListener("click", canvasClick);
  }
  document.querySelectorAll("[data-card]").forEach((button) => {
    button.addEventListener(
      "pointerenter",
      () => (state.hoverCard = button.dataset.card),
    );
    button.addEventListener(
      "focus",
      () => (state.hoverCard = button.dataset.card),
    );
  });
  const modal = document.querySelector(".modal");
  if (modal) modal.querySelector("button")?.focus({ preventScroll: true });
  draw();
}
function syncCanvas() {
  if (!canvas) return;
  canvas.width = WIDTH;
  canvas.height = matchMedia("(min-width: 851px) and (max-height: 800px)")
    .matches
    ? Math.round(
        (canvas.getBoundingClientRect().height /
          canvas.getBoundingClientRect().width) *
          WIDTH,
      )
    : HEIGHT;
}
window.addEventListener("resize", () => {
  syncCanvas();
  ctx = canvas?.getContext("2d");
  draw();
});
function prepare() {
  state.plan = [];
  state.enemyPlan = chooseEnemyPlan(state.tournament.match);
  state.phase = "planning";
  state.beat = 0;
  state.beatTimer = 0;
  state.events = [];
  state.paused = false;
  state.dir = "east";
  state.message = "상대 첫 수를 보고, 나의 세 수를 고르세요.";
}
function begin() {
  state.tournament = createTournament(state.hero, state.difficulty);
  state.screen = "battle";
  prepare();
  render();
}
function addCard(id) {
  if (
    state.screen !== "battle" ||
    state.paused ||
    state.help ||
    state.phase !== "planning" ||
    state.plan.length >= 3
  )
    return;
  const p = planPreview(state.tournament.match.player, state.plan).fighter;
  if (p.energy < CARDS[id].cost) {
    state.message = "기력이 모자랍니다. 숨 고르기로 기력을 모으세요.";
    render();
    return;
  }
  state.plan.push(action(id, state.dir));
  state.hoverCard = id;
  state.message =
    state.plan.length === 3
      ? "준비되었습니다. 세 수 펼치기를 누르세요."
      : `${CARDS[id].name} · ${DIRECTION_NAMES[state.dir]} 방향을 ${state.plan.length}번째 수에 담았습니다.`;
  sound();
  render();
}
function executeBeat() {
  const result = resolveBeat(
    state.tournament.match,
    state.plan[state.beat],
    state.enemyPlan[state.beat],
  );
  state.tournament.match = result.match;
  state.events = result.events;
  state.message = `${state.beat + 1}번째 수 — 나: ${CARDS[state.plan[state.beat].id].name} / 상대: ${CARDS[state.enemyPlan[state.beat].id].name}`;
  sound(result.events.some((e) => e.hit) ? "strike" : "click");
  render();
}
function resolve() {
  if (
    state.screen !== "battle" ||
    state.paused ||
    state.help ||
    state.phase !== "planning" ||
    state.plan.length !== 3
  )
    return;
  state.phase = "resolving";
  state.beat = 0;
  state.beatTimer = 0;
  executeBeat();
}
function canvasPosition(event) {
  const r = canvas.getBoundingClientRect();
  const point = scenePoint(
    ((event.clientX - r.left) * WIDTH) / r.width,
    ((event.clientY - r.top) * canvas.height) / r.height,
    canvas.height,
  );
  return cellAt(point.x, point.y);
}
function canvasHover(e) {
  state.hover = canvasPosition(e);
}
function canvasClick(e) {
  if (state.phase !== "planning" || state.paused) return;
  const cell = canvasPosition(e);
  if (!cell) return;
  const p = planPreview(state.tournament.match.player, state.plan).fighter,
    dx = cell.x - p.x,
    dy = cell.y - p.y;
  if (dx || dy) {
    state.dir =
      Math.abs(dx) >= Math.abs(dy)
        ? dx >= 0
          ? "east"
          : "west"
        : dy >= 0
          ? "south"
          : "north";
    render();
  }
}
const commands = {
  title() {
    state.screen = "title";
    state.paused = false;
    state.help = false;
    state.events = [];
    render();
  },
  select() {
    state.screen = "select";
    state.paused = false;
    state.help = false;
    render();
  },
  start: begin,
  help() {
    openHelp(state);
    render();
  },
  "close-help"() {
    closeHelp(state);
    render();
  },
  sound() {
    state.muted = !state.muted;
    sound();
    render();
  },
  pause() {
    if (state.screen === "battle" && !state.tournament.match.result) {
      state.paused = !state.paused;
      render();
    }
  },
  resume() {
    state.paused = false;
    render();
  },
  clear() {
    if (state.phase === "planning") {
      state.plan = [];
      state.message = "세 수를 모두 비웠습니다.";
      render();
    }
  },
  resolve,
  rematch() {
    state.tournament = retryMatch(state.tournament);
    prepare();
    render();
  },
  next() {
    state.tournament = nextMatch(state.tournament);
    if (state.tournament.finished) {
      state.screen = "champion";
      render();
    } else {
      prepare();
      render();
    }
  },
};
app.addEventListener("click", (e) => {
  const button = e.target.closest("button,a[data-command]");
  if (!button || button.disabled) return;
  if (button.dataset.command) {
    e.preventDefault();
    commands[button.dataset.command]?.();
  } else if (button.dataset.hero) {
    state.hero = Number(button.dataset.hero);
    sound();
    render();
  } else if (button.dataset.dir) {
    state.dir = button.dataset.dir;
    sound();
    render();
  } else if (button.dataset.card) addCard(button.dataset.card);
  else if (button.dataset.remove !== undefined && state.phase === "planning") {
    state.plan.splice(Number(button.dataset.remove), 1);
    render();
  }
});
app.addEventListener("change", (e) => {
  if (e.target.id === "difficulty") state.difficulty = e.target.value;
});
window.addEventListener("keydown", (e) => {
  const key = e.key.toLowerCase();
  if (e.target instanceof HTMLSelectElement) return;
  if (key === "escape") {
    if (state.help) commands["close-help"]();
    else if (state.screen === "battle") commands.pause();
    return;
  }
  if (key === "h") {
    commands.help();
    return;
  }
  if (key === "p") {
    commands.pause();
    return;
  }
  if (
    state.screen !== "battle" ||
    state.paused ||
    state.help ||
    state.tournament.match.result
  )
    return;
  if (key === "enter") {
    e.preventDefault();
    resolve();
    return;
  }
  if (state.phase !== "planning") return;
  const directions = {
    arrowup: "north",
    arrowright: "east",
    arrowdown: "south",
    arrowleft: "west",
  };
  if (directions[key]) {
    e.preventDefault();
    state.dir = directions[key];
    render();
  } else if (/^[1-6]$/.test(key)) {
    e.preventDefault();
    addCard(Object.keys(CARDS)[Number(key) - 1]);
  } else if (key === "backspace") {
    e.preventDefault();
    state.plan.pop();
    render();
  }
});
function pauseOnHidden() {
  if (
    state.screen === "battle" &&
    !state.paused &&
    !state.tournament.match.result
  ) {
    state.paused = true;
    render();
  }
}
window.addEventListener("blur", pauseOnHidden);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) pauseOnHidden();
});
window.addEventListener("pagehide", () => {
  cancelAnimationFrame(raf);
  void audio?.suspend();
});
window.addEventListener("pageshow", (e) => {
  if (e.persisted) {
    last = 0;
    raf = requestAnimationFrame(frame);
  }
});
matchMedia("(prefers-reduced-motion: reduce)").addEventListener(
  "change",
  (e) => {
    state.reduced = e.matches;
  },
);
function draw() {
  if (!ctx || state.screen !== "battle") return;
  const preview = planPreview(state.tournament.match.player, state.plan);
  drawScene(ctx, {
    match: state.tournament.match,
    background,
    sprite,
    preview: preview.steps,
    hover: state.hover,
    dir: state.dir,
    hoverCard: state.hoverCard,
    targetCells: targetCells(
      preview.fighter,
      action(state.hoverCard, state.dir),
    ),
    events: state.events,
    elapsed: state.elapsed,
    reduced: state.reduced,
    phase: state.phase,
    beatProgress: state.beatTimer / 1150,
    viewportHeight: canvas.height,
  });
}
function frame(now) {
  const dt = last ? Math.min(now - last, 80) : 0;
  last = now;
  if (canAdvanceSession(state)) {
    state.elapsed += dt;
    if (
      state.screen === "battle" &&
      state.phase === "resolving" &&
      !state.tournament.match.result
    ) {
      state.beatTimer += dt;
      if (state.beatTimer >= 1150) {
        state.beatTimer = 0;
        state.events = [];
        state.beat++;
        if (state.beat >= 3) {
          state.tournament.match = finishRound(state.tournament.match);
          prepare();
          render();
        } else executeBeat();
      }
    }
  }
  draw();
  raf = requestAnimationFrame(frame);
}
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}
Promise.all([loadImage("/art/shrine.png"), loadImage("/art/warriors-key.png")])
  .then(([bg, characters]) => {
    background = bg;
    sprite = keyedSprite(characters);
    draw();
  })
  .catch(() => {
    state.message =
      "그림 파일을 불러오지 못했습니다. 페이지를 새로고침해 주세요.";
    render();
  });
render();
raf = requestAnimationFrame(frame);
