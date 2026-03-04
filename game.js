/* MoneyQuest Prototype
   - Interview -> Avatar + Intro
   - Start -> Game Screen
   - Month loop: income -> fixed costs -> quarterly costs -> decisions -> event -> ETF change
*/

const el = (id) => document.getElementById(id);

// ---------- State ----------
const state = {
  salt: 0,
  profile: null,
  game: null,
};

// ---------- Profile ----------
function getProfile(){
  return {
    path: el("path").value,
    field: el("field").value,
    living: el("living").value,
    family: el("family").value,
    style: el("style").value,
  };
}

function buildStory(p){
  const pathText = p.path === "ausbildung" ? "in der Ausbildung" : (p.path === "studium" ? "im Studium" : "im Job");
  const fieldText = ({it:"in der IT", pflege:"in der Pflege", handwerk:"im Handwerk", buero:"im Büro", einzelhandel:"im Einzelhandel"})[p.field] || "im Beruf";
  const livingText = ({wg:"in einer WG", miete:"in einer Mietwohnung", eltern:"bei deinen Eltern", eigentum:"in deinem Eigentum"})[p.living] || "irgendwo";
  const familyText = (p.family === "single") ? "Du bist allein unterwegs." : (p.family === "partner" ? "Du lebst mit Partner:in." : "Du hast Verantwortung für ein Kind.");
  const hook = "Dein Ziel: stabil bleiben, Rücklagen aufbauen und nicht von Überraschungen zerlegt werden.";
  return `${pathText} ${fieldText} und wohnst ${livingText}. ${familyText} ${hook}`;
}

// ---------- Typewriter (fix for random letters) ----------
let typingController = null;

async function typeText(node, text) {
  if (typingController) typingController.abort();
  typingController = new AbortController();
  const signal = typingController.signal;

  node.textContent = "";
  const speed = 12;

  for (let i = 0; i < text.length; i++) {
    if (signal.aborted) return;
    node.textContent += text[i];
    await new Promise(r => setTimeout(r, speed));
  }
}

// ---------- Deterministic-ish RNG ----------
function xmur3(str){
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++){
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function(){
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}
function mulberry32(a){
  return function(){
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function profileSeed(p, salt=0){
  return `${p.path}|${p.field}|${p.living}|${p.family}|${p.style}|${salt}`;
}
function pick(rng, arr){ return arr[Math.floor(rng()*arr.length)]; }

// ---------- Avatar (16x16) ----------
function drawAvatar(profile, salt=0){
  const canvas = el("avatar");
  const ctx = canvas.getContext("2d", { alpha: true });

  const seedFn = xmur3(profileSeed(profile, salt));
  const rng = mulberry32(seedFn());

  const skinTones = ["#F2D6CB","#E7C0A6","#D7A27F","#B97E57","#8E5A3C"];
  const hairColors = ["#1F2937","#111827","#6B4F3A","#A16207","#7C3AED","#0F766E"];
  const shirtColors = ["#2563EB","#16A34A","#F97316","#111827","#DB2777","#7C3AED"];
  const pantsColors = ["#334155","#0F172A","#475569","#1F2937"];

  const skin = pick(rng, skinTones);
  let hair = pick(rng, hairColors);
  let shirt = pick(rng, shirtColors);
  let pants = pick(rng, pantsColors);

  if(profile.field === "it") shirt = "#2563EB";
  if(profile.field === "pflege") shirt = "#16A34A";
  if(profile.field === "handwerk") shirt = "#F97316";
  if(profile.living === "eltern") pants = "#475569";

  const hasBackpack = profile.path !== "job";
  const hasRing = profile.family === "partner";
  const hasToy = profile.family === "kind";

  const hairStyle =
    (profile.style === "fem") ? "long" :
    (profile.style === "masc" ? "short" :
    pick(rng, ["short","cap","messy"]));

  ctx.clearRect(0,0,16,16);

  function px(x,y,c){ ctx.fillStyle=c; ctx.fillRect(x,y,1,1); }
  function rect(x,y,w,h,c){ ctx.fillStyle=c; ctx.fillRect(x,y,w,h); }

  rect(5,2,6,6,skin); // head
  rect(7,8,2,1,skin); // neck

  px(7,5,"#111827"); px(9,5,"#111827");
  px(8,7,"#7C2D12");

  if(hairStyle === "short"){
    rect(5,2,6,2,hair);
    px(5,4,hair); px(10,4,hair);
  } else if(hairStyle === "long"){
    rect(5,2,6,2,hair);
    rect(4,4,1,4,hair); rect(11,4,1,4,hair);
    rect(5,4,6,1,hair);
  } else if(hairStyle === "cap"){
    rect(5,2,6,2,"#111827");
    rect(4,3,8,1,"#111827");
  } else {
    rect(5,2,6,2,hair);
    px(4,3,hair); px(11,3,hair); px(6,4,hair); px(9,4,hair);
  }

  rect(5,9,6,4,shirt);      // torso
  rect(4,10,1,2,skin);      // arms
  rect(11,10,1,2,skin);

  rect(5,13,6,3,pants);     // pants
  px(6,15,"#0B1220"); px(9,15,"#0B1220"); // shoes

  if(hasBackpack){
    rect(4,9,1,4,"#334155");
    rect(11,9,1,4,"#334155");
  }
  if(hasRing) px(11,11,"#FBBF24");
  if(hasToy)  px(4,11,"#DB2777");

  if(profile.field === "it") px(10,10,"#22C55E");
  if(profile.field === "pflege") px(10,10,"#EF4444");
  if(profile.field === "handwerk") px(10,10,"#FBBF24");
}

// ---------- Economy (simple) ----------
const JOB_NET = {
  it:         { ausbildung: 1550, studium: 2200, job: 2600 },
  pflege:     { ausbildung: 1500, studium: 1900, job: 2300 },
  handwerk:   { ausbildung: 1600, studium: 2000, job: 2400 },
  buero:      { ausbildung: 1450, studium: 2000, job: 2350 },
  einzelhandel:{ ausbildung: 1350, studium: 1850, job: 2100 },
};

const LIVING = {
  wg:       { rent: 450, utilities: 120 },
  miete:    { rent: 750, utilities: 160 },
  eltern:   { rent: 200, utilities: 80  },
  eigentum: { rent: 1150, utilities: 220 },
};

function familyCosts(family){
  if(family === "partner") return 220; // anteilig Haushalt
  if(family === "kind") return 420;    // grob (Essen, Kleidung, etc.)
  return 0;
}

function formatEUR(n){
  const s = Math.round(n).toString();
  return `${s.replace(/\B(?=(\d{3})+(?!\d))/g, ".")} €`;
}

// ---------- Events ----------
const EVENT_DECK = [
  { title:"Waschmaschine kaputt", text:"Reparatur oder Ersatz – kostet dich 350 €.", delta:-350 },
  { title:"Fahrrad geklaut", text:"Ohne Versicherung wird’s teuer: 180 €.", delta:-180 },
  { title:"Nebenjob", text:"Du hilfst jemandem beim Umzug. Du bekommst 120 €.", delta:+120 },
  { title:"Handy-Display", text:"Display gebrochen. Reparatur: 140 €.", delta:-140 },
  { title:"Geburtstag", text:"Du bekommst 80 € geschenkt.", delta:+80 },
];

function showEventModal({title, text, delta}, onClose){
  el("eventTitle").textContent = title;
  el("eventText").textContent = `${text} (${delta >= 0 ? "+" : ""}${formatEUR(delta).replace(" €","")} €)`;

  el("eventModal").classList.remove("hidden");

  const ok = el("eventOk");
  const handler = () => {
    ok.removeEventListener("click", handler);
    el("eventModal").classList.add("hidden");
    onClose?.();
  };
  ok.addEventListener("click", handler);
}

function drawRandomEvent(){
  return EVENT_DECK[Math.floor(Math.random()*EVENT_DECK.length)];
}

function quarterlyCosts(month){
  // alle 3 Monate: GEZ + "Versicherung"
  if(month % 3 !== 0) return [];
  return [
    { label:"GEZ (Quartal)", amount: -55 },
    { label:"Versicherung (Quartal)", amount: -120 },
  ];
}

// ---------- Game ----------
function newGame(profile){
  const income = JOB_NET[profile.field]?.[profile.path] ?? 1700;
  const living = LIVING[profile.living] ?? LIVING.wg;

  const startBalance = 350; // bewusst knapp
  return {
    month: 1,
    balance: startBalance,
    income,
    fixed: {
      rent: living.rent,
      utilities: living.utilities,
      food: 260,
      phone: 20,
      transport: profile.living === "wg" ? 49 : 69,
      family: familyCosts(profile.family),
    },
    buckets: {
      cash: 0,
      etf: 0,
    },
    plan: {
      cash: 100,
      etf: 100,
    },
    hasRunThisMonth: false,
  };
}

function computeFixedSum(g){
  const f = g.fixed;
  return f.rent + f.utilities + f.food + f.phone + f.transport + f.family;
}

function logLine(label, amount){
  const div = document.createElement("div");
  div.className = "logLine";
  const left = document.createElement("div");
  left.textContent = label;
  const right = document.createElement("div");
  right.textContent = (amount >= 0 ? "+" : "") + formatEUR(amount);
  div.appendChild(left);
  div.appendChild(right);
  el("gLog").appendChild(div);
}

function clearLog(){
  el("gLog").innerHTML = "";
}

function renderGame(){
  const g = state.game;
  el("gMonth").textContent = g.month;
  el("gBalance").textContent = formatEUR(g.balance);
  el("gIncome").textContent = formatEUR(g.income);
  el("gCash").textContent = formatEUR(g.buckets.cash);
  el("gEtf").textContent = formatEUR(g.buckets.etf);

  el("inpCash").value = g.plan.cash;
  el("inpEtf").value = g.plan.etf;

  el("btnRunMonth").disabled = g.hasRunThisMonth;
  el("btnNextMonth").disabled = !g.hasRunThisMonth;
}

function applyPlan(){
  const g = state.game;
  const cash = Math.max(0, Number(el("inpCash").value || 0));
  const etf  = Math.max(0, Number(el("inpEtf").value || 0));
  g.plan.cash = cash;
  g.plan.etf = etf;

  clearLog();
  logLine("Plan gespeichert", 0);
  renderGame();
}

function runMonth(){
  const g = state.game;
  if(g.hasRunThisMonth) return;

  clearLog();

  // 1) income
  g.balance += g.income;
  logLine("Einkommen", g.income);

  // 2) fixed costs
  const fixedSum = computeFixedSum(g);
  g.balance -= fixedSum;
  logLine("Fixkosten (Summe)", -fixedSum);

  // 3) quarterly costs
  const q = quarterlyCosts(g.month);
  for(const c of q){
    g.balance += c.amount;
    logLine(c.label, c.amount);
  }

  // 4) apply plan (if possible)
  const want = g.plan.cash + g.plan.etf;
  const canSpend = Math.max(0, g.balance); // nur solange positiv
  const factor = want > 0 ? Math.min(1, canSpend / want) : 0;

  const payCash = Math.floor(g.plan.cash * factor);
  const payEtf  = Math.floor(g.plan.etf * factor);

  if(payCash > 0){
    g.balance -= payCash;
    g.buckets.cash += payCash;
    logLine("Notgroschen", -payCash);
  } else {
    logLine("Notgroschen", 0);
  }

  if(payEtf > 0){
    g.balance -= payEtf;
    g.buckets.etf += payEtf;
    logLine("ETF Kauf", -payEtf);
  } else {
    logLine("ETF Kauf", 0);
  }

  // 5) ETF monthly change (random -1.5% .. +2.0%)
  const rnd = (Math.random() * 3.5 - 1.5) / 100;
  const change = Math.round(g.buckets.etf * rnd);
  g.buckets.etf += change;
  logLine("ETF Monatsbewegung", change);

  // 6) event
  const ev = drawRandomEvent();
  showEventModal(ev, () => {
    g.balance += ev.delta;
    clearLog();
    logLine("Ereignis: " + ev.title, ev.delta);
    logLine("Kontostand jetzt", g.balance);

    g.hasRunThisMonth = true;
    renderGame();
  });
}

function nextMonth(){
  const g = state.game;
  if(!g.hasRunThisMonth) return;

  g.month += 1;
  g.hasRunThisMonth = false;

  clearLog();
  logLine("Neuer Monat gestartet", 0);
  renderGame();
}

// ---------- Screens ----------
function showScreen(which){
  const a = el("screenInterview");
  const b = el("screenGame");
  if(which === "interview"){
    a.classList.remove("hidden");
    b.classList.add("hidden");
    el("stepText").textContent = "Interview → Avatar → Start";
  } else {
    a.classList.add("hidden");
    b.classList.remove("hidden");
    el("stepText").textContent = "Monat → Fixkosten → Entscheidungen";
  }
}

// ---------- Interview refresh ----------
function refreshInterview(){
  state.profile = getProfile();
  drawAvatar(state.profile, state.salt);
  typeText(el("storyText"), buildStory(state.profile));
}

// ---------- Wiring ----------
function init(){
  ["path","field","living","family","style"].forEach(id => {
    el(id).addEventListener("change", refreshInterview);
  });

  el("regen").addEventListener("click", () => {
    state.salt++;
    // Avatar neu, ohne Story neu zu tippen (fühlt sich besser an)
    drawAvatar(getProfile(), state.salt);
  });

  el("reset").addEventListener("click", () => {
    state.salt = 0;
    el("path").value = "ausbildung";
    el("field").value = "buero";
    el("living").value = "miete";
    el("family").value = "single";
    el("style").value = "neutral";
    refreshInterview();
  });

  el("start").addEventListener("click", () => {
    state.profile = getProfile();
    state.game = newGame(state.profile);
    showScreen("game");

    clearLog();
    logLine("Spiel gestartet", 0);
    renderGame();
  });

  el("btnApplyPlan").addEventListener("click", applyPlan);
  el("btnRunMonth").addEventListener("click", runMonth);
  el("btnNextMonth").addEventListener("click", nextMonth);

  el("btnBackToInterview").addEventListener("click", () => {
    // harter Reset fürs Prototype-Feeling
    state.game = null;
    showScreen("interview");
    refreshInterview();
  });

  refreshInterview();
}

document.addEventListener("DOMContentLoaded", init);
