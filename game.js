"use strict";

/* =========================================================
   MoneyQuest – vNext (Card Mode + Shop Screen + Inventory + Achievements)
   - Card-mode month loop (phase cards)
   - Separate Shop screen with buyable assets
   - Inventory assets persist + can give passive perks
   - Achievements overlay + mini badges
   ========================================================= */

// ---------- helpers ----------
const el = (id) => document.getElementById(id);
const clamp = (n,a,b)=> Math.max(a, Math.min(b,n));

function formatEUR(x){
  const n = Math.round(x);
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  const s = abs.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${sign}${s} €`;
}
function toast(title, text){
  el("toastTitle").textContent = title;
  el("toastText").textContent = text;
  el("toast").classList.remove("hidden");
  setTimeout(()=> el("toast").classList.add("hidden"), 2200);
}
function sleep(ms){ return new Promise(r=>setTimeout(r, ms)); }

// ---------- avatar ----------
function drawAvatar(seed){
  const c = el("avatar");
  const ctx = c.getContext("2d");
  ctx.imageSmoothingEnabled = false;

  let s = seed || 1337;
  const r = () => (s = (s*1664525 + 1013904223) >>> 0) / 4294967296;

  const bg = ["#E2E8F0","#DCFCE7","#E0F2FE","#FEF3C7","#FCE7F3"][Math.floor(r()*5)];
  ctx.fillStyle = bg;
  ctx.fillRect(0,0,16,16);

  const skin = ["#F2D6C9","#F6E0C6","#DDB7A0","#CFA08A","#EBC7B0"][Math.floor(r()*5)];
  ctx.fillStyle = skin;
  ctx.fillRect(4,4,8,8);

  const hair = ["#111827","#1F2937","#3F3F46","#7C2D12","#4B5563"][Math.floor(r()*5)];
  ctx.fillStyle = hair;
  ctx.fillRect(4,4,8,3);

  ctx.fillStyle = "#111827";
  ctx.fillRect(6,7,1,1);
  ctx.fillRect(9,7,1,1);
  ctx.fillRect(7,10,2,1);

  const shirt = ["#2563EB","#16A34A","#F97316","#7C3AED","#0EA5E9"][Math.floor(r()*5)];
  ctx.fillStyle = shirt;
  ctx.fillRect(4,12,8,4);
  ctx.fillStyle = "rgba(255,255,255,.85)";
  ctx.fillRect(7,13,2,1);
}
function regenAvatar(){
  state.salt++;
  drawAvatar((Date.now() + state.salt) & 0xffffffff);
}

// ---------- economy model ----------
const JOB_NET = {
  it:         { ausbildung: 1100, studium: 950, job: 2500 },
  pflege:     { ausbildung: 1150, studium: 1000, job: 2300 },
  handwerk:   { ausbildung: 1050, studium: 900, job: 2400 },
  buero:      { ausbildung: 1000, studium: 900, job: 2100 },
  einzelhandel:{ ausbildung: 980, studium: 850, job: 2000 },
};

const LIVING = {
  wg:      { rent: 430, utilities: 110, internet: 18 },
  miete:   { rent: 650, utilities: 160, internet: 25 },
  eltern:  { rent: 0,   utilities: 80,  internet: 0  },
  eigentum:{ rent: 380, utilities: 210, internet: 25 },
};

function familyCosts(family){
  if(family === "partner") return 130;
  if(family === "kind") return 260;
  return 0;
}

function lifestyleBudgets(p){
  const food = p.lifeFood === "sparsam" ? 240 : (p.lifeFood === "teuer" ? 380 : 300);
  const fun  = p.lifeFun === "low" ? 70 : (p.lifeFun === "high" ? 170 : 120);
  const shop = p.lifeShop === "low" ? 50 : (p.lifeShop === "high" ? 160 : 100);
  const subs = p.lifeSubs === "none" ? 0 : (p.lifeSubs === "many" ? 35 : 18);
  const mobility = p.lifeMobility === "car" ? 220 : (p.lifeMobility === "ticket" ? 69 : 20);
  return { food, fun, shop, subs, mobility, hasCar: p.lifeMobility === "car" };
}

// ---------- insurance ----------
const INSURANCE = [
  { id:"haftpflicht", name:"Haftpflicht", price:6, cat:"Basis", badge:"base", hint:"Schäden an anderen (Details per Ereignis)." },
  { id:"hausrat", name:"Hausrat", price:12, cat:"Komfort", badge:"comfort", hint:"Dinge in der Wohnung (Details per Ereignis)." },
  { id:"handy", name:"Handyversicherung", price:15, cat:"Risiko", badge:"risk", hint:"Handy-Schutz (Details per Ereignis)." },
  { id:"rechtsschutz", name:"Rechtsschutz", price:18, cat:"Komfort", badge:"comfort", hint:"Konflikt/Vertrag/Ärger (Details per Ereignis)." },
];

function insuranceSum(g){
  let sum = 0;
  for(const ins of INSURANCE) if(g.insurance[ins.id]) sum += ins.price;
  return sum;
}
function unlockInsuranceHint(g, hint){
  if(g.insuranceHints.has(hint)) return;
  g.insuranceHints.add(hint);
  toast("Hinweis", hint);
}

// ---------- loans ----------
const LOAN_TYPES = {
  konsum: { label:"Konsum", apr: 6.0, minMonths: 12, maxMonths: 48 },
  auto:   { label:"Auto",   apr: 4.0, minMonths: 12, maxMonths: 60 },
  dispo:  { label:"Dispo",  apr: 11.0, minMonths: 6,  maxMonths: 24 },
};
function calcMonthlyRate(amount, months, apr){
  if(amount <= 0) return 0;
  const r = (apr/100) / 12;
  if(r === 0) return amount / months;
  return amount * (r * Math.pow(1+r, months)) / (Math.pow(1+r, months)-1);
}

// ---------- assets (shop + inventory) ----------
const ASSETS = [
  {
    id:"bike",
    icon:"🚲",
    name:"Fahrrad",
    cost:400,
    desc:"Flexibler Alltag. Spart langfristig Mobilitätskosten.",
    impact:{ comfort:+6, social:+1, stability:+1 },
    passive:{ mobilityMinus:20 }
  },
  {
    id:"laptop",
    icon:"💻",
    name:"Laptop (Refurb)",
    cost:450,
    desc:"Hilft für Schule/Job. Gibt Stabilität durch bessere Organisation.",
    impact:{ comfort:+3, social:+1, stability:+3 },
    passive:{}
  },
  {
    id:"furniture",
    icon:"🛋️",
    name:"Möbel-Upgrade",
    cost:500,
    desc:"Wohnen wird deutlich nicer.",
    impact:{ comfort:+10, social:+1, stability:0 },
    passive:{}
  },
  {
    id:"phone",
    icon:"📱",
    name:"Neues Handy",
    cost:800,
    desc:"Praktisch, social boost – aber teuer.",
    impact:{ comfort:+4, social:+6, stability:-1 },
    passive:{}
  },
  {
    id:"kitchen",
    icon:"🍳",
    name:"Meal-Prep Setup",
    cost:120,
    desc:"Bessere Essensplanung: reduziert Essen-Budget leicht.",
    impact:{ comfort:+1, social:0, stability:+3 },
    passive:{ foodMinus:20 }
  },
  {
    id:"course",
    icon:"🏋️",
    name:"Sportkurs (Abo)",
    cost:90,
    desc:"Stabilisiert Wohlbefinden. Kleiner Social Boost.",
    impact:{ comfort:+2, social:+3, stability:+2 },
    passive:{}
  }
];

function assetById(id){ return ASSETS.find(a=>a.id===id); }

// ---------- achievements ----------
const ACH = [
  { id:"cash_1000", icon:"🧯", name:"Notgroschen 1k", text:"Du hast 1.000 € Notgroschen erreicht.", check:(g)=> g.buckets.cash >= 1000 },
  { id:"cash_2000", icon:"🛡️", name:"Puffer-Profi", text:"2.000 € Notgroschen – stabil.", check:(g)=> g.buckets.cash >= 2000 },
  { id:"etf_2000",  icon:"📈", name:"Investor", text:"ETF-Depot über 2.000 €.", check:(g)=> g.buckets.etf >= 2000 },
  { id:"no_red_6",  icon:"✨", name:"Clean Run", text:"6 Monate ohne Minus!", check:(g)=> g.month >= 6 && g.redMonths === 0 },
  { id:"red_3",     icon:"🧱", name:"Überlebt", text:"3 Minus-Monate überstanden.", check:(g)=> g.redMonths >= 3 },
  { id:"stable_80", icon:"🗿", name:"Fels", text:"Stabilität ≥ 80.", check:(g)=> g.stability >= 80 },
  { id:"social_80", icon:"🫶", name:"Social Pro", text:"Soziales ≥ 80.", check:(g)=> g.social >= 80 },
  { id:"buy_3",     icon:"🎒", name:"Ausgerüstet", text:"3 Assets im Inventar.", check:(g)=> g.assets.length >= 3 },
];

function achUnlock(g, ach){
  if(g.achievements.has(ach.id)) return;
  g.achievements.add(ach.id);

  // overlay mini
  renderAchievements(g);

  // toast
  el("achToastTitle").textContent = `🏆 ${ach.name}`;
  el("achToastText").textContent = ach.text;
  el("achToast").classList.remove("hidden");
  setTimeout(()=> el("achToast").classList.add("hidden"), 2600);
}

function checkAchievements(g){
  for(const a of ACH){
    if(a.check(g)) achUnlock(g, a);
  }
}

// ---------- state ----------
const state = {
  salt: 0,
  profile: null,
  game: null,
  view: "interview", // interview | game | shop
  cardQueue: [],
  cardLocked: false,
};

// ---------- initial stats ----------
function initialComfort(p){
  let c = 55;
  if(p.living === "eltern") c += 10;
  if(p.living === "wg") c += 4;
  if(p.living === "miete") c += 6;
  if(p.living === "eigentum") c += 8;
  if(p.lifeMobility === "car") c += 10;
  if(p.lifeMobility === "ticket") c += 4;
  if(p.lifeMobility === "bike") c += 2;
  if(p.lifeSubs === "many") c += 4;
  if(p.lifeSubs === "none") c -= 2;
  return clamp(c,0,100);
}
function initialSocial(p){
  let s = 52;
  if(p.lifeFun === "high") s += 12;
  if(p.lifeFun === "mid") s += 6;
  if(p.lifeFun === "low") s -= 2;
  if(p.family === "single") s += 2;
  if(p.family === "kind") s -= 3;
  return clamp(s,0,100);
}

// ---------- new game ----------
function newGame(profile){
  const income = JOB_NET[profile.field]?.[profile.path] ?? 1700;
  const living = LIVING[profile.living] ?? LIVING.wg;
  const life = lifestyleBudgets(profile);

  return {
    month: 1,
    balance: 350,
    income,

    // hard rule: dispo floor
    dispoFloor: -500,

    fixed: {
      rent: living.rent,
      utilities: living.utilities,
      internet: living.internet,
      phone: 20,
      family: familyCosts(profile.family),
    },
    variable: {
      food: life.food,
      fun: life.fun,
      shop: life.shop,
      subs: life.subs,
      mobility: life.mobility,
    },

    insurance: { haftpflicht:true, hausrat:false, handy:false, rechtsschutz:false },
    insuranceHints: new Set(),

    loan: { active:false, principal:0, monthsLeft:0, rate:0, apr:0, type:"" },

    buckets: {
      cash: 0,
      etf: 0,
      subs: [
        { id:"b1", name:"Urlaub", balance:0, plan:50 },
        { id:"b2", name:"Puffer", balance:0, plan:50 },
      ],
    },
    plan: { cash:100, etf:100 },

    redMonths: 0,
    stability: 55,
    comfort: initialComfort(profile),
    social: initialSocial(profile),

    achievements: new Set(),
    assets: [], // array of asset ids

    historyBalance: [350],
    historyEtf: [0],

    hasRunThisMonth: false,
  };
}

// ---------- derived / stability ----------
function recomputeStability(g){
  let s = 40;
  s += Math.min(30, Math.floor(g.buckets.cash / 50));
  if(g.balance < 0) s -= 18;
  s -= g.redMonths * 6;
  if(g.buckets.etf >= 200) s += 6;
  if(g.buckets.etf >= 1000) s += 8;
  if(g.loan.active) s -= 8;
  if(g.insurance.haftpflicht) s += 3;
  g.stability = clamp(s, 0, 100);
}

function computeFixedSum(g){
  const f = g.fixed, v = g.variable;
  return f.rent + f.utilities + f.internet + f.phone + f.family + v.food + v.fun + v.shop + v.subs + v.mobility;
}

// ---------- passive asset effects ----------
function applyPassivePerks(g){
  // reset variable baselines from profile? (simplified: only apply deltas once per month before costs)
  // We apply perks as reductions to certain budget categories.
  let foodMinus = 0;
  let mobilityMinus = 0;

  for(const id of g.assets){
    const a = assetById(id);
    if(!a?.passive) continue;
    foodMinus += (a.passive.foodMinus || 0);
    mobilityMinus += (a.passive.mobilityMinus || 0);
  }

  g._passive = { foodMinus, mobilityMinus };
}

// ---------- timeline ----------
function timelineClear(){ el("gLog").innerHTML = ""; }
function timelineItem(title, amount, sub, dotColor=null){
  const item = document.createElement("div");
  item.className = "tItem";

  const dot = document.createElement("div");
  dot.className = "tDot";
  if(dotColor) dot.style.background = dotColor;

  const main = document.createElement("div");
  main.className = "tMain";
  const t = document.createElement("div");
  t.className = "tTitle";
  t.textContent = title;
  main.appendChild(t);
  if(sub){
    const s = document.createElement("div");
    s.className = "tSub";
    s.textContent = sub;
    main.appendChild(s);
  }

  const amt = document.createElement("div");
  amt.className = "tAmt";
  if(amount === 0) amt.classList.add("neu");
  else if(amount > 0) amt.classList.add("pos");
  else amt.classList.add("neg");
  amt.textContent = (amount > 0 ? "+" : "") + formatEUR(amount);

  item.appendChild(dot);
  item.appendChild(main);
  item.appendChild(amt);
  el("gLog").appendChild(item);
}
function timelineInfo(title, sub){
  timelineItem(title, 0, sub, "#0EA5E9");
}

// ---------- render helpers ----------
function setView(view){
  state.view = view;

  el("screenInterview").classList.toggle("hidden", view !== "interview");
  el("screenGame").classList.toggle("hidden", view !== "game");
  el("screenShop").classList.toggle("hidden", view !== "shop");

  el("hudStep").textContent = view === "interview" ? "Interview" : (view === "shop" ? "Shop" : "Spiel");
}

// ---------- render game stats / panels ----------
function renderInsuranceList(g){
  const root = el("insuranceList");
  root.innerHTML = "";
  for(const ins of INSURANCE){
    const on = !!g.insurance[ins.id];
    const div = document.createElement("div");
    div.className = "insItem";
    div.innerHTML = `
      <div class="insTop">
        <div class="insName">${ins.name}</div>
        <div class="insPrice">${formatEUR(ins.price)}/Monat</div>
      </div>
      <div class="badge ${ins.badge}">${ins.cat}</div>
      <div class="insDesc">${ins.hint}</div>
      <label class="insToggle">
        <input type="checkbox" data-ins="${ins.id}" ${on ? "checked":""}/>
        Aktivieren
      </label>
    `;
    root.appendChild(div);
  }

  root.querySelectorAll('input[type="checkbox"][data-ins]').forEach(cb=>{
    cb.addEventListener("change",(e)=>{
      const id = e.target.getAttribute("data-ins");
      g.insurance[id] = e.target.checked;
      timelineClear();
      timelineInfo("Versicherung geändert", "Laufende Kosten vs. Risiko.");
      renderAll();
    });
  });

  const unlocked = [...g.insuranceHints];
  el("insuranceUnlockedHint").textContent = unlocked.length
    ? "Freigeschaltete Hinweise: " + unlocked.join(" • ")
    : "Hinweise werden durch passende Ereignisse freigeschaltet.";
}

function renderBuckets(g){
  const root = el("bucketList");
  root.innerHTML = "";

  for(const b of g.buckets.subs){
    const row = document.createElement("div");
    row.className = "bucketRow";
    row.innerHTML = `
      <div>
        <div class="bucketName">${b.name}</div>
        <div class="bucketMeta">Stand: ${formatEUR(b.balance)}</div>
      </div>
      <div class="bucketInput">
        <input type="number" min="0" step="10" value="${b.plan}" data-bucket="${b.id}" />
      </div>
      <div class="bucketActions">
        <button class="btn soft" data-withdraw="${b.id}" type="button" title="Entnehmen">↩</button>
        <button class="btn soft ghost" data-del="${b.id}" type="button" title="Löschen">✕</button>
      </div>
    `;
    root.appendChild(row);
  }

  root.querySelectorAll('input[data-bucket]').forEach(inp=>{
    inp.addEventListener("change",(e)=>{
      const id = e.target.getAttribute("data-bucket");
      const val = Math.max(0, Number(e.target.value || 0));
      const b = g.buckets.subs.find(x=>x.id===id);
      if(b) b.plan = val;
      timelineClear();
      timelineInfo("Unterkonto geändert", "Planbetrag angepasst.");
      renderAll();
    });
  });

  root.querySelectorAll('button[data-del]').forEach(btn=>{
    btn.addEventListener("click",(e)=>{
      const id = e.target.getAttribute("data-del");
      g.buckets.subs = g.buckets.subs.filter(x=>x.id!==id);
      timelineClear();
      timelineInfo("Unterkonto gelöscht", "Topf entfernt.");
      renderAll();
    });
  });

  root.querySelectorAll('button[data-withdraw]').forEach(btn=>{
    btn.addEventListener("click",(e)=>{
      const id = e.target.getAttribute("data-withdraw");
      const b = g.buckets.subs.find(x=>x.id===id);
      if(!b) return;
      if(b.balance <= 0){ toast("Entnahme", "In diesem Topf ist nichts drin."); return; }

      const raw = prompt(`Wie viel € aus "${b.name}" entnehmen? (max. ${Math.round(b.balance)} €)`, "50");
      if(raw === null) return;
      const amount = Math.floor(Number(raw));
      if(!Number.isFinite(amount) || amount<=0){ toast("Entnahme","Bitte Zahl > 0."); return; }
      if(amount > b.balance){ toast("Entnahme","Zu hoch."); return; }

      b.balance -= amount;
      g.balance += amount;
      timelineItem(`Entnahme: ${b.name}`, +amount, `Neuer Topf-Stand: ${formatEUR(b.balance)}.`, "#7C3AED");
      renderAll();
    });
  });
}

function renderInventory(g){
  const root = el("invGrid");
  root.innerHTML = "";

  if(!g.assets.length){
    el("invHint").textContent = "Noch leer. Im Shop kannst du Assets kaufen.";
    return;
  }
  el("invHint").textContent = "";

  for(const id of g.assets){
    const a = assetById(id);
    if(!a) continue;

    const tags = [];
    const mkTag = (label, v) => {
      const cls = v>0 ? "good" : (v<0 ? "bad" : "neu");
      const sign = v>0 ? "+" : "";
      return `<span class="tag ${cls}">${label} ${sign}${v}</span>`;
    };
    tags.push(mkTag("Stabil", a.impact.stability||0));
    tags.push(mkTag("Komfort", a.impact.comfort||0));
    tags.push(mkTag("Soz.", a.impact.social||0));

    const div = document.createElement("div");
    div.className = "invItem";
    div.innerHTML = `
      <div class="invTop">
        <div class="invName">${a.name}</div>
        <div class="invIcon" aria-hidden="true">${a.icon}</div>
      </div>
      <div class="invDesc">${a.desc}</div>
      <div class="invTags">${tags.join("")}</div>
    `;
    root.appendChild(div);
  }
}

function renderAchievements(g){
  el("achCount").textContent = String(g.achievements.size);

  // show up to 6 mini badges (most recent-ish)
  const row = el("achMiniRow");
  row.innerHTML = "";
  const unlocked = [...g.achievements].slice(-6);
  for(const id of unlocked){
    const a = ACH.find(x=>x.id===id);
    const pill = document.createElement("div");
    pill.className = "achMini";
    pill.textContent = a ? `${a.icon} ${a.name}` : `🏆 ${id}`;
    row.appendChild(pill);
  }
}

function renderStats(g){
  recomputeStability(g);

  el("gMonth").textContent = g.month;
  el("gBalance").textContent = formatEUR(g.balance);
  el("gCash").textContent = formatEUR(g.buckets.cash);
  el("gEtf").textContent = formatEUR(g.buckets.etf);

  const hint = g.balance < g.dispoFloor ? "Kontosperre (Dispo-Limit)" : (g.balance < 0 ? "Im Minus (Dispo)" : "OK");
  el("gBalanceHint").textContent = hint;

  el("gStabilityFill").style.width = `${g.stability}%`;
  el("gComfortFill").style.width = `${g.comfort}%`;
  el("gSocialFill").style.width = `${g.social}%`;

  el("gStabilityText").textContent = `${g.stability}/100`;
  el("gComfortText").textContent = `${g.comfort}/100`;
  el("gSocialText").textContent = `${g.social}/100`;

  el("inpCash").value = g.plan.cash;
  el("inpEtf").value = g.plan.etf;

  el("loanStatus").textContent = g.loan.active
    ? `Aktiv: ${LOAN_TYPES[g.loan.type]?.label ?? "Kredit"} • Rate ${formatEUR(g.loan.rate)}/Monat • noch ${g.loan.monthsLeft} Monate`
    : "kein Kredit";

  el("goalNote").innerHTML =
    `Minus-Monate: <strong>${g.redMonths}</strong> • Dispo-Limit: <strong>${formatEUR(g.dispoFloor)}</strong> • ` +
    `Stabilität <strong>${g.stability}</strong> • Komfort <strong>${g.comfort}</strong> • Soziales <strong>${g.social}</strong>.`;
}

function renderAll(){
  const g = state.game;
  if(!g) return;

  renderStats(g);
  renderBuckets(g);
  renderInventory(g);
  renderInsuranceList(g);
  renderAchievements(g);

  if(state.view === "shop"){
    renderShop(g);
  }
}

// ---------- card system ----------
function setCard({ badge, title, text, impacts = [], choices = [], footer = "" }){
  el("cardBadge").textContent = badge || "—";
  el("cardTitle").textContent = title || "—";
  el("cardText").textContent = text || "—";
  el("cardFooter").textContent = footer || "";

  const imp = el("cardImpacts");
  imp.innerHTML = "";
  for(const p of impacts){
    const div = document.createElement("div");
    div.className = `impactPill ${p.cls || "neu"}`;
    div.textContent = p.text;
    imp.appendChild(div);
  }

  const wrap = el("cardChoices");
  wrap.innerHTML = "";

  for(const c of choices){
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "choiceCardBtn";
    btn.disabled = !!c.disabled;

    const impactTags = (c.impacts || []).map(p=>`<span class="impactPill ${p.cls||"neu"}">${p.text}</span>`).join("");

    btn.innerHTML = `
      <div class="choiceCardTitle">${c.label}</div>
      <div class="choiceCardMeta">${c.meta || ""}</div>
      <div class="choiceCardImpacts">${impactTags}</div>
    `;
    btn.addEventListener("click", ()=> c.onPick?.());
    wrap.appendChild(btn);
  }
}

function pushCard(card){ state.cardQueue.push(card); }

async function nextCard(){
  if(state.cardLocked) return;
  const card = state.cardQueue.shift();
  if(!card){
    // no cards queued -> show idle
    setCard({
      badge: "Bereit",
      title: "Monat starten",
      text: "Du spielst im Karten-Modus: 1 Karte = 1 Schritt. Starte den Monat, dann triff Entscheidungen.",
      choices: [
        { label:"▶ Monat starten", meta:"Spielt Einkommen → Kosten → Sparen → Events → Monatsende.",
          impacts: [{cls:"neu",text:"12 Karten / max"}],
          onPick: ()=> runMonthCardMode()
        }
      ],
      footer: "Tipp: Log ist optional – falls man’s nachverfolgen will."
    });
    return;
  }

  state.cardLocked = true;
  setCard(card);
  state.cardLocked = false;
}

// ---------- withdrawals (cash + ETF) ----------
const ETF_SELL_FEE_PCT = 0.01;
const ETF_SELL_FEE_MIN = 2;

function withdrawFromCash(){
  const g = state.game;
  if(g.buckets.cash <= 0){ toast("Notgroschen","Da ist nichts drin."); return; }
  const raw = prompt(`Wie viel € aus Notgroschen entnehmen? (max. ${Math.round(g.buckets.cash)} €)`, "100");
  if(raw === null) return;
  const amount = Math.floor(Number(raw));
  if(!Number.isFinite(amount) || amount<=0){ toast("Notgroschen","Bitte Zahl > 0."); return; }
  if(amount > g.buckets.cash){ toast("Notgroschen","Zu hoch."); return; }

  g.buckets.cash -= amount;
  g.balance += amount;
  timelineItem("Notgroschen-Entnahme", +amount, `Neuer Stand: ${formatEUR(g.buckets.cash)}.`, "#16A34A");
  renderAll();
}

function sellEtf(){
  const g = state.game;
  if(g.buckets.etf <= 0){ toast("ETF","Du hast kein ETF-Guthaben."); return; }
  const raw = prompt(`Wie viel € ETF verkaufen? (max. ${Math.round(g.buckets.etf)} €)`, "200");
  if(raw === null) return;
  const amount = Math.floor(Number(raw));
  if(!Number.isFinite(amount) || amount<=0){ toast("ETF","Bitte Zahl > 0."); return; }
  if(amount > g.buckets.etf){ toast("ETF","Zu hoch."); return; }

  const fee = Math.max(ETF_SELL_FEE_MIN, Math.round(amount * ETF_SELL_FEE_PCT));
  const payout = Math.max(0, amount - fee);

  g.buckets.etf -= amount;
  g.balance += payout;

  timelineItem("ETF verkauft", +payout, `Verkauf ${formatEUR(amount)} • Gebühr ${formatEUR(fee)}.`, "#0EA5E9");
  renderAll();
}

// ---------- plan / buckets ----------
function applyPlan(){
  const g = state.game;
  g.plan.cash = Math.max(0, Number(el("inpCash").value || 0));
  g.plan.etf  = Math.max(0, Number(el("inpEtf").value || 0));
  timelineInfo("Plan gespeichert", "Wird im Monat automatisch angewendet.");
  renderAll();
}
function addBucket(){
  const g = state.game;
  const name = (el("newBucketName").value || "").trim();
  if(!name){ toast("Unterkonto","Bitte Name eingeben."); return; }
  const id = "b" + Math.random().toString(16).slice(2,8);
  g.buckets.subs.push({ id, name, balance:0, plan:30 });
  el("newBucketName").value = "";
  timelineInfo("Unterkonto angelegt", name);
  renderAll();
}

// ---------- shop ----------
function renderShop(g){
  el("shopBalance").textContent = formatEUR(g.balance);

  const root = el("shopGrid");
  root.innerHTML = "";

  for(const a of ASSETS){
    const owned = g.assets.includes(a.id);
    const canBuy = !owned && g.balance >= a.cost;

    const tags = [];
    const mk = (label, v) => {
      const cls = v>0 ? "good" : (v<0 ? "bad" : "neu");
      const sign = v>0 ? "+" : "";
      return `<span class="tag ${cls}">${label} ${sign}${v}</span>`;
    };
    tags.push(mk("Stabil", a.impact.stability||0));
    tags.push(mk("Komfort", a.impact.comfort||0));
    tags.push(mk("Soz.", a.impact.social||0));

    const card = document.createElement("div");
    card.className = "shopCard";
    card.innerHTML = `
      <div class="shopCardHead">
        <div class="shopCardTop">
          <div class="shopCardName">${a.name}</div>
          <div class="shopCardIcon" aria-hidden="true">${a.icon}</div>
        </div>
      </div>
      <div class="shopCardBody">
        <div class="shopCardDesc">${a.desc}</div>
        <div class="shopCardTags">${tags.join("")}</div>
      </div>
      <div class="shopCardFoot">
        <div class="pricePill">${formatEUR(a.cost)}</div>
        <button class="btn ${owned ? "soft" : "primary"}" ${owned ? "disabled":""} ${(!owned && !canBuy) ? "disabled":""} type="button">
          ${owned ? "Gekauft" : (canBuy ? "Kaufen" : "Zu teuer")}
        </button>
      </div>
    `;

    const btn = card.querySelector("button");
    btn.addEventListener("click", ()=>{
      if(owned) return;
      if(g.balance < a.cost){ toast("Shop","Nicht genug Geld."); return; }
      buyAsset(g, a.id);
    });

    root.appendChild(card);
  }
}

function buyAsset(g, assetId){
  const a = assetById(assetId);
  if(!a) return;
  if(g.assets.includes(assetId)) return;

  g.balance -= a.cost;
  g.assets.push(assetId);

  // apply immediate stat impact
  g.stability = clamp(g.stability + (a.impact.stability||0), 0, 100);
  g.comfort = clamp(g.comfort + (a.impact.comfort||0), 0, 100);
  g.social = clamp(g.social + (a.impact.social||0), 0, 100);

  timelineItem("Shop: gekauft", -a.cost, `${a.name} ${a.icon}`, "#1D4ED8");

  // Achievement checks (buy_3)
  checkAchievements(g);

  toast("Shop", `Gekauft: ${a.name}`);
  renderAll();
}

// ---------- events & decisions (card mode) ----------
function effectPillsFromDelta({ money=0, stability=0, comfort=0, social=0 }){
  const pills = [];
  const moneyCls = money>0 ? "good" : (money<0 ? "bad" : "neu");
  pills.push({ cls: moneyCls, text: `${money>0?"+":""}${formatEUR(money)}` });

  const mk = (label, v)=>{
    const cls = v>0 ? "good" : (v<0 ? "bad" : "neu");
    const sign = v>0 ? "+" : "";
    return { cls, text: `${label} ${sign}${v}` };
  };
  pills.push(mk("Stabil", stability));
  pills.push(mk("Komfort", comfort));
  pills.push(mk("Soz.", social));
  return pills;
}

function applyOption(g, opt, label){
  g.balance += opt.money;
  g.stability = clamp(g.stability + opt.stability, 0, 100);
  g.comfort = clamp(g.comfort + opt.comfort, 0, 100);
  g.social = clamp(g.social + opt.social, 0, 100);
  timelineItem(label, opt.money, `${opt.label}: ${opt.meta}`, "#7C3AED");
}

function enforceDispoFloorCard(g){
  if(g.balance >= g.dispoFloor) return null;

  // snap to dispo floor
  const delta = g.dispoFloor - g.balance;
  g.balance = g.dispoFloor;
  timelineItem("Kontosperre", -delta, "Du bist unter dem Dispo-Limit. Zahlungen gestoppt.", "#DC2626");

  return {
    badge:"Notfall",
    title:"Kontosperre!",
    text:"Du bist unter dem Dispo-Limit. Du musst handeln.",
    impacts:[{cls:"bad",text:`Limit ${formatEUR(g.dispoFloor)}`}],
    choices:[
      {
        label:"Eltern um Hilfe bitten (+250 €)",
        meta:"Einmalige Hilfe. Unangenehm, aber effektiv.",
        impacts: effectPillsFromDelta({ money:+250, stability:+3, comfort:0, social:-1 }),
        onPick: ()=>{
          applyOption(g,{label:"Hilfe",meta:"Einmalige Hilfe.",money:+250,stability:+3,comfort:0,social:-1},"Notfall");
          checkAchievements(g);
          renderAll();
          nextCard();
        }
      },
      {
        label:"Streng sparen (2 Monate)",
        meta:"Du kürzt Freizeit/Shopping/Abos. Tut weh, hilft aber.",
        impacts: effectPillsFromDelta({ money:0, stability:+2, comfort:-2, social:-3 }),
        onPick: ()=>{
          applyOption(g,{label:"Sparmodus",meta:"Du kürzt hart.",money:0,stability:+2,comfort:-2,social:-3},"Notfall");
          g.variable.fun = Math.max(20, Math.round(g.variable.fun * 0.6));
          g.variable.shop = Math.max(20, Math.round(g.variable.shop * 0.6));
          g.variable.subs = Math.max(0, Math.round(g.variable.subs * 0.6));
          checkAchievements(g);
          renderAll();
          nextCard();
        }
      }
    ],
    footer:"Tipp: Entnahme aus Notgroschen / ETF kann auch retten."
  };
}

// decision pools
const DECISIONS = [
  {
    badge:"Entscheidung",
    title:"Essen & Trinken",
    text:"Du merkst: Essen kippt den Monat. Was machst du?",
    a:{ label:"Meal Prep", meta:"Planen & vorkochen.", money:+70, stability:+6, comfort:-1, social:0 },
    b:{ label:"To-Go/Lieferung", meta:"Bequem, aber teuer.", money:-70, stability:-2, comfort:+2, social:+1 },
  },
  {
    badge:"Entscheidung",
    title:"Freizeit",
    text:"Freunde fragen: Kino heute?",
    a:{ label:"Mitgehen", meta:"Kostet, aber du bist dabei.", money:-25, stability:-1, comfort:+1, social:+6 },
    b:{ label:"Absagen", meta:"Sparen, aber Isolation steigt.", money:+10, stability:+2, comfort:0, social:-4 },
  },
  {
    badge:"Entscheidung",
    title:"Abo-Check",
    text:"Du merkst: Abos fressen Geld.",
    a:{ label:"Kündigen", meta:"2 Abos weg.", money:+18, stability:+3, comfort:-2, social:-1 },
    b:{ label:"Behalten", meta:"Bleibt so.", money:0, stability:-1, comfort:+1, social:0 },
  },
];

const GOAL_CONFLICTS = [
  {
    badge:"Zielkonflikt",
    title:"Freundeskreis",
    text:"Deine Leute planen einen Abend. Du bist knapp bei Kasse.",
    a:{ label:"Dabei sein", meta:"Teurer, aber du bleibst drin.", money:-45, stability:-2, comfort:+1, social:+7 },
    b:{ label:"Aussetzen", meta:"Günstig, aber du ziehst dich zurück.", money:+10, stability:+2, comfort:0, social:-6 },
  },
  {
    badge:"Zielkonflikt",
    title:"Komfort vs Kosten",
    text:"Du könntest dir etwas kaufen, das vieles einfacher macht.",
    a:{ label:"Kaufen", meta:"Bequemer Alltag.", money:-80, stability:-2, comfort:+6, social:+1 },
    b:{ label:"Warten", meta:"Du ziehst durch.", money:+20, stability:+3, comfort:-1, social:0 },
  },
];

const EVENTS = [
  {
    badge:"Ereignis",
    title:"Handy kaputt",
    text:"Dein Handy fällt runter. Reparatur oder neu?",
    a:{ label:"Reparieren", meta:"Günstiger.", money:-120, stability:-1, comfort:-1, social:-1 },
    b:{ label:"Neu kaufen", meta:"Teurer, aber nicer.", money:-420, stability:-2, comfort:+2, social:+2 },
    after(g){
      unlockInsuranceHint(g, "Handy: Versicherung kann helfen – kostet aber monatlich.");
    }
  },
  {
    badge:"Ereignis",
    title:"Haftpflicht-Fall",
    text:"Du beschädigst aus Versehen etwas bei jemandem.",
    a:{ label:"Mit Haftpflicht (wenn aktiv)", meta:"Wenn aktiv, wird’s übernommen.", money:0, stability:+1, comfort:0, social:0 },
    b:{ label:"Ohne Haftpflicht zahlen", meta:"Du zahlst selbst (wenn Haftpflicht aus).", money:0, stability:-1, comfort:0, social:0 },
    after(g){
      unlockInsuranceHint(g, "Haftpflicht: kann dich vor hohen Einmal-Kosten schützen.");
      if(!g.insurance.haftpflicht){
        g.balance -= 220;
        timelineItem("Schaden bezahlt", -220, "Ohne Haftpflicht zahlst du selbst.", "#DC2626");
        g.stability = clamp(g.stability - 4, 0, 100);
      } else {
        timelineInfo("Haftpflicht greift", "Schaden wurde übernommen (vereinfacht).");
        g.stability = clamp(g.stability + 1, 0, 100);
      }
    }
  },
  {
    badge:"Ereignis",
    title:"Bonus",
    text:"Du bekommst einen kleinen Bonus.",
    a:{ label:"Nice!", meta:"Du nimmst ihn mit.", money:+120, stability:+2, comfort:+1, social:+1 },
    b:{ label:"In Notgroschen", meta:"Du packst direkt was weg.", money:+120, stability:+3, comfort:0, social:0 },
    after(g, pickedLabel){
      if(pickedLabel === "In Notgroschen"){
        g.buckets.cash += 80;
        g.balance -= 80;
        timelineItem("Bonus → Notgroschen", -80, "Direkt Rücklage erhöht.", "#16A34A");
      }
    }
  },
];

function maybePick(arr, chance){
  if(Math.random() > chance) return null;
  return arr[Math.floor(Math.random()*arr.length)];
}

// ETF movement (simple)
function randn(){
  let u=0,v=0;
  while(u===0) u=Math.random();
  while(v===0) v=Math.random();
  return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);
}
function applyEtfMovement(g){
  let r = 0.004 + randn() * 0.045;
  if(Math.random() < 0.10) r += (Math.random()*0.16 - 0.08);
  r = clamp(r, -0.20, 0.20);
  const before = g.buckets.etf;
  const change = Math.round(before * r);
  g.buckets.etf += change;
  const pct = Math.round(r*1000)/10;
  return { change, pct };
}

// ---------- month runner (card mode) ----------
async function runMonthCardMode(){
  const g = state.game;
  if(g.hasRunThisMonth){
    toast("Monat","Schon gespielt. Nächster Monat.");
    return;
  }

  timelineClear();
  applyPassivePerks(g);

  // Build card sequence for the month
  state.cardQueue = [];

  // Card 1: Income
  pushCard({
    badge:"Phase 1/5",
    title:"Einkommen",
    text:`Du erhältst dein Netto-Einkommen.`,
    impacts:[{cls:"good",text:`+ ${formatEUR(g.income)}`}],
    choices:[{
      label:"Weiter",
      meta:"Einnahmen werden gebucht.",
      impacts:[{cls:"good",text:`Kontostand +${formatEUR(g.income)}`}],
      onPick: ()=>{
        g.balance += g.income;
        timelineItem("Einkommen (Netto)", g.income, "Vereinfacht.", "#16A34A");
        renderAll();
        // check dispo clamp card if needed (unlikely)
        const clampCard = enforceDispoFloorCard(g);
        if(clampCard){ state.cardQueue.unshift(clampCard); }
        nextCard();
      }
    }],
    footer:"Game-Loop: Einkommen → Kosten → Sparen → Ereignisse → Monatsende"
  });

  // Card 2: Costs
  pushCard({
    badge:"Phase 2/5",
    title:"Fixkosten & Budgets",
    text:`Jetzt kommen die monatlichen Kosten. Passive Vorteile (Assets) können Budgets leicht reduzieren.`,
    impacts:[
      {cls:"bad", text:`- ${formatEUR(computeFixedSum(g))} (ca.)`}
    ],
    choices:[{
      label:"Kosten zahlen",
      meta:"Miete, Budgets, Versicherungen, Kreditrate …",
      impacts:[{cls:"bad",text:"Kosten werden abgezogen"}],
      onPick: ()=>{
        // apply passive reductions
        const foodMinus = g._passive?.foodMinus || 0;
        const mobMinus = g._passive?.mobilityMinus || 0;

        const v = g.variable;
        const foodEff = Math.max(0, v.food - foodMinus);
        const mobEff  = Math.max(0, v.mobility - mobMinus);

        // detailed logging
        const f = g.fixed;

        // insurance
        const ins = insuranceSum(g);

        // loan
        let loanPay = 0;
        if(g.loan.active){
          loanPay = Math.round(g.loan.rate);
          g.loan.monthsLeft -= 1;
          if(g.loan.monthsLeft <= 0){
            g.loan.active = false;
            timelineInfo("Kredit beendet", "Abbezahlt.");
          }
        }

        const total =
          f.rent + f.utilities + f.internet + f.phone + f.family +
          foodEff + v.fun + v.shop + v.subs + mobEff +
          ins + loanPay;

        g.balance -= total;

        timelineItem("Kosten (Summe)", -total, "Monatliche Belastung.", "#0F172A");
        timelineItem("Miete", -f.rent, "Wohnen.", "#0F172A");
        timelineItem("Nebenkosten", -f.utilities, "Strom/Wasser/Heizung.", "#0F172A");
        timelineItem("Internet", -f.internet, "Vertrag.", "#0F172A");
        timelineItem("Handy", -f.phone, "Tarif.", "#0F172A");
        if(f.family>0) timelineItem("Familie", -f.family, "Mehr Personen = mehr Kosten.", "#0F172A");

        timelineItem("Essen/Trinken", -foodEff, foodMinus>0 ? `Asset-Bonus: -${formatEUR(foodMinus)}` : "Lifestyle.", "#0F172A");
        timelineItem("Freizeit", -v.fun, "Lifestyle.", "#0F172A");
        timelineItem("Shopping", -v.shop, "Lifestyle.", "#0F172A");
        timelineItem("Abos", -v.subs, "Lifestyle.", "#0F172A");
        timelineItem("Mobilität", -mobEff, mobMinus>0 ? `Asset-Bonus: -${formatEUR(mobMinus)}` : "Lifestyle.", "#0F172A");

        if(ins>0) timelineItem("Versicherungen", -ins, "Laufend.", "#0EA5E9");
        if(loanPay>0) timelineItem("Kreditrate", -loanPay, "Laufend.", "#EA580C");

        const clampCard = enforceDispoFloorCard(g);
        renderAll();
        if(clampCard){ state.cardQueue.unshift(clampCard); }
        nextCard();
      }
    }],
    footer:"Tipp: Assets können Budgets leicht drücken (z. B. Meal Prep / Fahrrad)."
  });

  // Card 3: Saving plan
  pushCard({
    badge:"Phase 3/5",
    title:"Sparen & Investieren",
    text:"Wenn du im Plus bist, wird dein Plan angewendet: Notgroschen + ETF + Unterkonten.",
    impacts:[{cls:"neu",text:"Auto-Plan"}],
    choices:[{
      label:"Plan anwenden",
      meta:"Wenn nicht genug übrig ist, wird gekürzt. Im Minus: kein Invest.",
      impacts:[{cls:"neu",text:"Notgroschen/ETF/Unterkonten"}],
      onPick: ()=>{
        if(g.balance <= 0){
          timelineInfo("Sparen", "Im Minus/Null: kein Sparen möglich.");
          g.stability = clamp(g.stability - 2, 0, 100);
          renderAll();
          nextCard();
          return;
        }

        const wantSub = g.buckets.subs.reduce((s,b)=>s + (b.plan||0), 0);
        const want = g.plan.cash + g.plan.etf + wantSub;
        const can = Math.max(0, g.balance);
        const factor = want > 0 ? Math.min(1, can / want) : 0;

        const payCash = Math.floor(g.plan.cash * factor);
        const payEtf  = Math.floor(g.plan.etf  * factor);
        let paidSubs = 0;

        for(const b of g.buckets.subs){
          const pay = Math.floor((b.plan||0) * factor);
          if(pay>0){ b.balance += pay; paidSubs += pay; }
        }

        const totalPaid = payCash + payEtf + paidSubs;
        g.balance -= totalPaid;

        if(payCash>0){ g.buckets.cash += payCash; timelineItem("Notgroschen", -payCash, "Rücklage.", "#16A34A"); }
        if(payEtf>0){ g.buckets.etf  += payEtf;  timelineItem("ETF Kauf", -payEtf, "Invest.", "#0EA5E9"); }
        if(paidSubs>0){ timelineItem("Unterkonten", -paidSubs, "Ziele.", "#7C3AED"); }

        timelineItem("Sparen/Invest (Summe)", -totalPaid, "Plan angewendet.", "#1D4ED8");

        // small stat feel
        g.stability = clamp(g.stability + 1, 0, 100);
        g.comfort = clamp(g.comfort - 1, 0, 100);

        renderAll();
        checkAchievements(g);
        nextCard();
      }
    }],
    footer:"Notgroschen ist für Notfälle. ETF ist langfristig – Verkauf kostet Gebühr."
  });

  // Card 4: Decision (always)
  const decision = DECISIONS[(g.month-1) % DECISIONS.length];
  pushChoiceCard(g, decision);

  // Card 5: Goal conflict sometimes
  const goal = maybePick(GOAL_CONFLICTS, 0.55);
  if(goal) pushChoiceCard(g, goal);

  // Card 6: Event sometimes
  const ev = maybePick(EVENTS, 0.50);
  if(ev) pushEventChoiceCard(g, ev);

  // Card 7: ETF movement
  pushCard({
    badge:"Phase 4/5",
    title:"Marktbewegung",
    text:"Dein ETF schwankt. Das ist normal.",
    impacts:[{cls:"neu",text:"ETF bewegt sich"}],
    choices:[{
      label:"ETF berechnen",
      meta:"Monatsrendite wird angewendet.",
      impacts:[{cls:"neu",text:"Chance/Risiko"}],
      onPick: ()=>{
        const mv = applyEtfMovement(g);
        const cls = mv.change >= 0 ? "good" : "bad";
        timelineItem("ETF Bewegung", mv.change, `Rendite: ${mv.pct>=0?"+":""}${mv.pct}%`, "#0EA5E9");
        renderAll();
        setCard({
          badge:"Phase 4/5",
          title:"ETF Ergebnis",
          text:`ETF-Veränderung diesen Monat: ${mv.change>=0?"+":""}${formatEUR(mv.change)} (${mv.pct>=0?"+":""}${mv.pct}%).`,
          impacts:[{cls, text:`${mv.change>=0?"+":""}${formatEUR(mv.change)}`}],
          choices:[{
            label:"Weiter",
            meta:"Weiter zum Monatsende.",
            impacts:[],
            onPick: ()=> nextCard()
          }],
          footer:"Langfristig kann das gut sein – kurzfristig schwankt es."
        });
      }
    }],
    footer:"Wenn du verkaufst, fällt eine kleine Gebühr an."
  });

  // Card 8: Month end
  pushCard({
    badge:"Phase 5/5",
    title:"Monatsende",
    text:"Monat abgeschlossen. Wie lief’s?",
    impacts:[],
    choices:[
      {
        label:"Nächster Monat →",
        meta:"Du startest den nächsten Turn.",
        impacts:[{cls:"neu",text:"Monat +1"}],
        onPick: ()=>{
          // month end bookkeeping
          if(g.balance < 0){
            g.redMonths += 1;
            g.social = clamp(g.social - 2, 0, 100);
            g.comfort = clamp(g.comfort - 1, 0, 100);
          } else {
            g.social = clamp(g.social + 1, 0, 100);
          }

          g.historyBalance.push(g.balance);
          g.historyEtf.push(g.buckets.etf);

          g.hasRunThisMonth = true;
          checkAchievements(g);
          renderAll();

          // advance month
          if(g.month >= 12){
            // end summary card
            state.cardQueue = [];
            pushCard(makeEndSummaryCard(g));
            g.hasRunThisMonth = false; // allow “restart flow” if desired
            nextCard();
            return;
          }

          g.month += 1;
          g.hasRunThisMonth = false;

          // new queue empty -> idle card will show
          state.cardQueue = [];
          renderAll();
          nextCard();
        }
      }
    ],
    footer:"Tipp: Log hilft beim Nachvollziehen, ist aber optional."
  });

  renderAll();
  await nextCard();
}

function pushChoiceCard(g, cfg){
  pushCard({
    badge: cfg.badge || "Entscheidung",
    title: cfg.title,
    text: cfg.text,
    impacts: [],
    choices: [
      {
        label: cfg.a.label,
        meta: cfg.a.meta,
        impacts: effectPillsFromDelta(cfg.a),
        onPick: ()=>{
          applyOption(g, cfg.a, cfg.badge || "Entscheidung");
          const clampCard = enforceDispoFloorCard(g);
          renderAll();
          checkAchievements(g);
          if(clampCard){ state.cardQueue.unshift(clampCard); }
          nextCard();
        }
      },
      {
        label: cfg.b.label,
        meta: cfg.b.meta,
        impacts: effectPillsFromDelta(cfg.b),
        onPick: ()=>{
          applyOption(g, cfg.b, cfg.badge || "Entscheidung");
          const clampCard = enforceDispoFloorCard(g);
          renderAll();
          checkAchievements(g);
          if(clampCard){ state.cardQueue.unshift(clampCard); }
          nextCard();
        }
      }
    ],
    footer:"Jede Entscheidung hat messbare Effekte."
  });
}

function pushEventChoiceCard(g, ev){
  pushCard({
    badge: ev.badge || "Ereignis",
    title: ev.title,
    text: ev.text,
    impacts: [],
    choices: [
      {
        label: ev.a.label,
        meta: ev.a.meta,
        impacts: effectPillsFromDelta(ev.a),
        onPick: ()=>{
          applyOption(g, ev.a, ev.badge || "Ereignis");
          ev.after?.(g, ev.a.label);
          const clampCard = enforceDispoFloorCard(g);
          renderAll();
          checkAchievements(g);
          if(clampCard){ state.cardQueue.unshift(clampCard); }
          nextCard();
        }
      },
      {
        label: ev.b.label,
        meta: ev.b.meta,
        impacts: effectPillsFromDelta(ev.b),
        onPick: ()=>{
          applyOption(g, ev.b, ev.badge || "Ereignis");
          ev.after?.(g, ev.b.label);
          const clampCard = enforceDispoFloorCard(g);
          renderAll();
          checkAchievements(g);
          if(clampCard){ state.cardQueue.unshift(clampCard); }
          nextCard();
        }
      }
    ],
    footer:"Ereignisse schalten auch Versicherungs-Hinweise frei."
  });
}

function makeEndSummaryCard(g){
  const wealth =
    g.balance + g.buckets.cash + g.buckets.etf + g.buckets.subs.reduce((s,b)=>s+b.balance,0);

  const text =
    `Du hast 12 Monate gespielt.\n\n` +
    `Kontostand: ${formatEUR(g.balance)}\n` +
    `Notgroschen: ${formatEUR(g.buckets.cash)}\n` +
    `ETF: ${formatEUR(g.buckets.etf)}\n` +
    `Unterkonten: ${formatEUR(g.buckets.subs.reduce((s,b)=>s+b.balance,0))}\n\n` +
    `Vermögen (vereinfachte Summe): ${formatEUR(wealth)}\n` +
    `Minus-Monate: ${g.redMonths}\n` +
    `Stabilität/Komfort/Soziales: ${g.stability}/${g.comfort}/${g.social}\n` +
    `Achievements: ${g.achievements.size}`;

  return {
    badge:"Finish",
    title:"Auswertung",
    text,
    impacts:[
      {cls:"neu",text:`Vermögen: ${formatEUR(wealth)}`},
      {cls: g.redMonths>0 ? "bad":"good", text:`Minus-Monate: ${g.redMonths}`}
    ],
    choices:[
      {
        label:"Nochmal spielen",
        meta:"Reset und neue Entscheidungen testen.",
        impacts:[],
        onPick: ()=> location.reload()
      }
    ],
    footer:"Das ist ein Lern-Spiel: vereinfacht echte Lebensrealitäten."
  };
}

// ---------- interview/profile ----------
function readProfile(){
  return {
    path: el("path").value,
    field: el("field").value,
    living: el("living").value,
    family: el("family").value,
    style: el("style").value,
    lifeFood: el("lifeFood").value,
    lifeFun: el("lifeFun").value,
    lifeShop: el("lifeShop").value,
    lifeSubs: el("lifeSubs").value,
    lifeMobility: el("lifeMobility").value,
  };
}

function startGame(){
  const profile = readProfile();
  state.profile = profile;
  state.game = newGame(profile);

  el("storyText").textContent =
    "Du startest frisch in dein erstes eigenes Budget. 12 Monate. Ziel: Notgroschen ≥ 1.000 €. " +
    "Im Karten-Modus erlebst du jeden Monat Schritt für Schritt.";

  setView("game");
  timelineClear();
  timelineInfo("Start", "Bereit? Starte den Monat im Karten-Modus.");
  renderAll();
  state.cardQueue = [];
  nextCard();
}

// ---------- glossary ----------
function showGlossary(){
  el("glossaryContent").innerHTML = `
    <div class="gItem">
      <div class="gTitle">Notgroschen</div>
      <div class="gText">Rücklage für Notfälle (Auto, Waschmaschine, Jobverlust).</div>
      <div class="gSmall">Im Spiel: Du kannst entnehmen, wenn es brennt.</div>
    </div>
    <div class="gItem">
      <div class="gTitle">ETF</div>
      <div class="gText">Ein Fonds, der viele Aktien bündelt. Schwankt. Chance & Risiko.</div>
      <div class="gSmall">Im Spiel: Verkauf kostet Gebühr.</div>
    </div>
    <div class="gItem">
      <div class="gTitle">Dispo</div>
      <div class="gText">Kurzfristiger Kreditrahmen am Konto. Zinsen hoch.</div>
      <div class="gSmall">Im Spiel: Dispo-Limit = -500 €. Darunter Sperre.</div>
    </div>
  `;
  el("glossaryDrawer").classList.remove("hidden");
  el("glossaryDrawer").setAttribute("aria-hidden","false");
}
function closeGlossary(){
  el("glossaryDrawer").classList.add("hidden");
  el("glossaryDrawer").setAttribute("aria-hidden","true");
}

// ---------- log toggle ----------
function toggleLog(){
  el("logWrap").classList.toggle("hidden");
}

// ---------- credit ----------
function takeLoan(){
  const g = state.game;
  const loanType = el("loanType").value;
  const cfg = LOAN_TYPES[loanType] ?? LOAN_TYPES.konsum;

  const amount = Math.max(0, Number(el("loanAmount").value || 0));
  const months = clamp(Number(el("loanMonths").value || 12), cfg.minMonths, cfg.maxMonths);

  if(amount <= 0){ toast("Kredit","Betrag > 0 eingeben."); return; }
  if(g.loan.active){ toast("Kredit","Prototype: nur 1 Kredit gleichzeitig."); return; }

  const rate = calcMonthlyRate(amount, months, cfg.apr);

  g.loan = { active:true, principal:amount, monthsLeft:months, rate, apr:cfg.apr, type:loanType };
  g.balance += amount;

  timelineItem("Kredit ausgezahlt", +amount, `${cfg.label} • ${cfg.apr}% p.a.`, "#EA580C");
  renderAll();
  toast("Kredit", "Auszahlung erfolgt.");
}

// ---------- shop nav ----------
function openShop(){
  if(!state.game) return;
  setView("shop");
  renderAll();
}
function closeShop(){
  setView("game");
  renderAll();
}

// ---------- wire up ----------
function bind(){
  // top HUD
  el("btnGlossaryTop").addEventListener("click", showGlossary);
  el("btnCloseGlossary").addEventListener("click", closeGlossary);
  el("btnResetTop").addEventListener("click", () => location.reload());

  // interview
  el("regen").addEventListener("click", regenAvatar);
  el("reset").addEventListener("click", () => location.reload());
  el("start").addEventListener("click", startGame);

  // game ui
  el("btnApplyPlan").addEventListener("click", applyPlan);
  el("btnAddBucket").addEventListener("click", addBucket);
  el("btnTakeLoan").addEventListener("click", takeLoan);

  // card area actions
  el("btnShop").addEventListener("click", openShop);
  el("btnToggleLog").addEventListener("click", toggleLog);

  // shop screen
  el("btnShopBack").addEventListener("click", closeShop);

  // KPI clicks
  const cash = el("gCash");
  const etf = el("gEtf");
  const bindKpi = (node, fn) => {
    node.setAttribute("role","button");
    node.setAttribute("tabindex","0");
    node.addEventListener("click", fn);
    node.addEventListener("keydown",(e)=>{
      if(e.key==="Enter"||e.key===" "){ e.preventDefault(); fn(); }
    });
  };
  bindKpi(cash, withdrawFromCash);
  bindKpi(etf, sellEtf);

  // initial avatar
  regenAvatar();
}
bind();
setView("interview");
