/* MoneyQuest – vNext
   Added:
   - Dispo limit (hard floor) + "Kontosperre" decision if exceeded
   - Withdrawals from sub-buckets + cash buffer + ETF (sell fee)
   - More game feel: phases, shop offers, risk cards, more achievements
*/

"use strict";

// ---------- helpers ----------
const el = (id) => document.getElementById(id);

function clamp(n, a, b){ return Math.max(a, Math.min(b, n)); }
function rand(a,b){ return a + Math.random()*(b-a); }
function randn(){
  // Box-Muller
  let u=0,v=0;
  while(u===0) u=Math.random();
  while(v===0) v=Math.random();
  return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);
}
function uid(){
  return "b" + Math.random().toString(16).slice(2,10);
}
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
  setTimeout(()=> el("toast").classList.add("hidden"), 2400);
}

// ---------- avatar ----------
function drawAvatar(seed){
  const c = el("avatar");
  const ctx = c.getContext("2d");
  const w = c.width, h = c.height;

  // crisp pixels
  ctx.imageSmoothingEnabled = false;

  // simple seeded RNG
  let s = seed || 1337;
  const r = () => (s = (s*1664525 + 1013904223) >>> 0) / 4294967296;

  const bg = ["#E2E8F0","#DCFCE7","#E0F2FE","#FEF3C7","#FCE7F3"][Math.floor(r()*5)];
  ctx.fillStyle = bg;
  ctx.fillRect(0,0,w,h);

  // face block
  const skin = ["#F2D6C9","#F6E0C6","#DDB7A0","#CFA08A","#EBC7B0"][Math.floor(r()*5)];
  ctx.fillStyle = skin;
  ctx.fillRect(4,4,8,8);

  // hair
  const hair = ["#111827","#1F2937","#3F3F46","#7C2D12","#4B5563"][Math.floor(r()*5)];
  ctx.fillStyle = hair;
  ctx.fillRect(4,4,8,3);

  // eyes
  ctx.fillStyle = "#111827";
  ctx.fillRect(6,7,1,1);
  ctx.fillRect(9,7,1,1);

  // mouth
  ctx.fillRect(7,10,2,1);

  // shirt
  const shirt = ["#2563EB","#16A34A","#F97316","#7C3AED","#0EA5E9"][Math.floor(r()*5)];
  ctx.fillStyle = shirt;
  ctx.fillRect(4,12,8,4);

  // tiny accent
  ctx.fillStyle = "rgba(255,255,255,.85)";
  ctx.fillRect(7,13,2,1);
}

function regenAvatar(){
  state.salt += 1;
  drawAvatar((Date.now() + state.salt) & 0xffffffff);
}

// ---------- data ----------
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

function lifestyleBudgets(profile){
  const food = profile.lifeFood === "sparsam" ? 240 : (profile.lifeFood === "teuer" ? 380 : 300);
  const fun  = profile.lifeFun === "low" ? 70 : (profile.lifeFun === "high" ? 170 : 120);
  const shop = profile.lifeShop === "low" ? 50 : (profile.lifeShop === "high" ? 160 : 100);
  const subs = profile.lifeSubs === "none" ? 0 : (profile.lifeSubs === "many" ? 35 : 18);
  const mobility = profile.lifeMobility === "car" ? 220 : (profile.lifeMobility === "ticket" ? 69 : 20);
  const hasCar = profile.lifeMobility === "car";
  return { food, fun, shop, subs, mobility, hasCar };
}

// ---------- insurance ----------
const INSURANCE = [
  { id:"haftpflicht", name:"Haftpflicht", price:6, cat:"Basis", badge:"base",
    hint:"Schäden an anderen (Details per Ereignis)."
  },
  { id:"hausrat", name:"Hausrat", price:12, cat:"Komfort", badge:"comfort",
    hint:"Dinge in der Wohnung (Details per Ereignis)."
  },
  { id:"handy", name:"Handyversicherung", price:15, cat:"Risiko", badge:"risk",
    hint:"Handy-Schutz (Details per Ereignis)."
  },
  { id:"rechtsschutz", name:"Rechtsschutz", price:18, cat:"Komfort", badge:"comfort",
    hint:"Konflikt/Vertrag/Ärger (Details per Ereignis)."
  },
];

function insuranceSum(g){
  let sum = 0;
  for(const ins of INSURANCE) if(g.insurance[ins.id]) sum += ins.price;
  return sum;
}

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
  root.querySelectorAll('input[type="checkbox"][data-ins]').forEach(cb => {
    cb.addEventListener("change", (e) => {
      const id = e.target.getAttribute("data-ins");
      g.insurance[id] = e.target.checked;
      timelineClear();
      timelineInfo("Versicherung geändert", "Abwägung: laufende Kosten vs. Risiko.");
      renderGame();
    });
  });

  const unlocked = [...g.insuranceHints];
  el("insuranceUnlockedHint").textContent = unlocked.length
    ? "Freigeschaltete Hinweise: " + unlocked.join(" • ")
    : "Hinweise werden durch passende Ereignisse freigeschaltet.";
}

// ---------- credit types (fixed APR) ----------
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

// ---------- modals ----------
function showEventModal(ev, onClose){
  el("eventTitle").textContent = ev.title;
  el("eventText").textContent = ev.text;
  el("eventModal").classList.remove("hidden");
  const ok = el("eventOk");
  const handler = () => {
    ok.removeEventListener("click", handler);
    el("eventModal").classList.add("hidden");
    onClose?.();
  };
  ok.addEventListener("click", handler);
}

function showChoiceModal(choice, onPick){
  el("choiceTitle").textContent = choice.title;
  el("choiceText").textContent = choice.text;

  const wrap = el("choiceActions");
  wrap.innerHTML = "";

  const mkPill = (label, v) => {
    const cls = v > 0 ? "good" : (v < 0 ? "bad" : "neu");
    const sign = v > 0 ? "+" : "";
    return `<span class="pill ${cls}">${label}: ${sign}${v}</span>`;
  };

  const mk = (opt) => {
    const btn = document.createElement("button");
    btn.className = "choiceBtn";
    btn.type = "button";

    const moneyCls = opt.money > 0 ? "good" : (opt.money < 0 ? "bad" : "neu");
    const moneyText = `${opt.money > 0 ? "+" : ""}${formatEUR(opt.money)}`;
    const pills = [];
    pills.push(`<span class="pill ${moneyCls}">${moneyText}</span>`);
    pills.push(mkPill("Stabil", opt.stability));
    pills.push(mkPill("Komfort", opt.comfort));
    pills.push(mkPill("Soziales", opt.social));

    btn.innerHTML = `
      <div class="choiceTitle">${opt.label}</div>
      <div class="choiceMeta">${opt.meta}</div>
      <div class="choiceImpact">${pills.join("")}</div>
    `;
    btn.addEventListener("click", () => {
      el("choiceModal").classList.add("hidden");
      onPick(opt);
    });
    return btn;
  };

  wrap.appendChild(mk(choice.a));
  wrap.appendChild(mk(choice.b));

  el("choiceModal").classList.remove("hidden");
}

// ---------- modal helpers (promise) ----------
function showEventModalAsync(ev){
  return new Promise(resolve => showEventModal(ev, resolve));
}
function showChoiceModalAsync(choice){
  return new Promise(resolve => showChoiceModal(choice, resolve));
}
function sleep(ms){ return new Promise(r => setTimeout(r, ms)); }

function showEndModal(html){
  el("endTitle").textContent = "Auswertung";
  el("endBody").innerHTML = html;
  el("endModal").classList.remove("hidden");
  const ok = el("endOk");
  const handler = () => {
    ok.removeEventListener("click", handler);
    el("endModal").classList.add("hidden");
  };
  ok.addEventListener("click", handler);
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

// ---------- charts ----------
function drawLineChart(canvasId, values){
  const c = el(canvasId);
  const ctx = c.getContext("2d");
  const w = c.width, h = c.height;

  ctx.clearRect(0,0,w,h);

  const padL = 34, padR = 10, padT = 14, padB = 18;
  const plotW = w - padL - padR;
  const plotH = h - padT - padB;

  const minV = Math.min(...values, 0);
  const maxV = Math.max(...values, 1);
  const range = (maxV - minV) || 1;

  ctx.lineWidth = 1;
  ctx.strokeStyle = "rgba(15,23,42,.08)";
  for(let i=0;i<=4;i++){
    const y = padT + (plotH * i/4);
    ctx.beginPath();
    ctx.moveTo(padL, y);
    ctx.lineTo(padL + plotW, y);
    ctx.stroke();
  }

  ctx.fillStyle = "rgba(15,23,42,.55)";
  ctx.font = "12px system-ui";
  ctx.fillText(`${Math.round(maxV)}`, 6, padT+10);
  ctx.fillText(`${Math.round(minV)}`, 6, padT+plotH);

  ctx.strokeStyle = "rgba(79,70,229,.95)";
  ctx.lineWidth = 3;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  const xAt = (i)=> padL + (plotW * (values.length === 1 ? 0 : i/(values.length-1)));
  const yAt = (v)=> padT + plotH - ((v - minV)/range)*plotH;

  ctx.beginPath();
  values.forEach((v,i)=>{
    const x = xAt(i);
    const y = yAt(v);
    if(i===0) ctx.moveTo(x,y);
    else ctx.lineTo(x,y);
  });
  ctx.stroke();

  values.forEach((v,i)=>{
    const x = xAt(i);
    const y = yAt(v);
    ctx.fillStyle = "rgba(22,163,74,.95)";
    ctx.beginPath();
    ctx.arc(x,y,4,0,Math.PI*2);
    ctx.fill();
  });

  if(minV < 0 && maxV > 0){
    const y0 = yAt(0);
    ctx.strokeStyle = "rgba(220,38,38,.35)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padL, y0);
    ctx.lineTo(padL+plotW, y0);
    ctx.stroke();
  }
}

// ---------- state ----------
const state = { salt:0, profile:null, game:null };

// ---------- comfort/social ----------
function initialComfort(profile){
  let c = 55;
  if(profile.living === "eltern") c += 10;
  if(profile.living === "wg") c += 4;
  if(profile.living === "miete") c += 6;
  if(profile.living === "eigentum") c += 8;

  if(profile.lifeMobility === "car") c += 10;
  if(profile.lifeMobility === "ticket") c += 4;
  if(profile.lifeMobility === "bike") c += 2;

  if(profile.lifeSubs === "many") c += 4;
  if(profile.lifeSubs === "none") c -= 2;

  return clamp(c, 0, 100);
}
function initialSocial(profile){
  let s = 52;
  if(profile.lifeFun === "high") s += 12;
  if(profile.lifeFun === "mid") s += 6;
  if(profile.lifeFun === "low") s -= 2;

  if(profile.family === "single") s += 2;
  if(profile.family === "kind") s -= 3;

  return clamp(s, 0, 100);
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

    // HARD RULE: Dispo floor (no infinite minus)
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
    hasCar: life.hasCar,

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

    hasRunThisMonth:false,
    redMonths:0,

    stability: 55,
    comfort: initialComfort(profile),
    social: initialSocial(profile),

    achievements: new Set(),
    questTarget: 1000,

    historyBalance: [350],
    historyEtf: [0],

    furnished: (profile.living === "eltern"),
    bab: { eligible: profile.path === "ausbildung", active:false, amount:0 },

    moveOutChoicePending: (profile.living !== "eltern"),
    babChoicePending: (profile.path === "ausbildung"),

    // meta for behavior
    askedParentsEver: false,
    refusedParentsEver: false,
  };
}

function computeFixedSum(g){
  const f = g.fixed;
  const v = g.variable;
  const babIncome = g.bab.active ? g.bab.amount : 0;
  return (
    f.rent + f.utilities + f.internet + f.phone + f.family +
    v.food + v.fun + v.shop + v.subs + v.mobility
  ) - babIncome;
}

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

function renderQuest(g){
  const pct = clamp((g.buckets.cash / g.questTarget) * 100, 0, 100);
  el("gQuestText").textContent = `Notgroschen: ${formatEUR(g.buckets.cash)} / ${formatEUR(g.questTarget)} (${Math.round(pct)}%)`;
  el("gQuestFill").style.width = `${pct}%`;
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
        <button class="btn soft" data-withdraw="${b.id}" type="button" title="Geld aus dem Topf ins Konto zurückholen">↩</button>
        <button class="btn soft ghost" data-del="${b.id}" type="button" title="Topf löschen">✕</button>
      </div>
    `;
    root.appendChild(row);
  }

  root.querySelectorAll('input[data-bucket]').forEach(inp => {
    inp.addEventListener("change", (e) => {
      const id = e.target.getAttribute("data-bucket");
      const val = Math.max(0, Number(e.target.value || 0));
      const b = g.buckets.subs.find(x => x.id === id);
      if(b) b.plan = val;
      timelineClear();
      timelineInfo("Unterkonto-Plan geändert", "Unterkonten sind Spar-Töpfe. Du steuerst den Monatsbetrag.");
    });
  });

  root.querySelectorAll('button[data-del]').forEach(btn => {
    btn.addEventListener("click", (e) => {
      const id = e.target.getAttribute("data-del");
      g.buckets.subs = g.buckets.subs.filter(x => x.id !== id);
      renderGame();
      timelineClear();
      timelineInfo("Unterkonto gelöscht", "Spar-Topf entfernt.");
    });
  });

  root.querySelectorAll('button[data-withdraw]').forEach(btn => {
    btn.addEventListener("click", (e) => {
      const id = e.target.getAttribute("data-withdraw");
      const b = g.buckets.subs.find(x => x.id === id);
      if(!b) return;
      if(b.balance <= 0){
        toast("Entnahme", "In diesem Topf ist gerade nichts drin.");
        return;
      }

      const raw = prompt(`Wie viel € willst du aus "${b.name}" entnehmen? (max. ${Math.round(b.balance)} €)`, "50");
      if(raw === null) return;

      const amount = Math.floor(Number(raw));
      if(!Number.isFinite(amount) || amount <= 0){
        toast("Entnahme", "Bitte eine Zahl > 0 eingeben.");
        return;
      }
      if(amount > b.balance){
        toast("Entnahme", "Geht nicht: Betrag ist höher als der Stand im Topf.");
        return;
      }

      b.balance -= amount;
      g.balance += amount;

      timelineClear();
      timelineItem(`Entnahme: ${b.name}`, +amount, `Du holst Geld aus dem Topf zurück aufs Konto. Neuer Stand: ${formatEUR(b.balance)}.`, "#7C3AED");
      renderGame();
    });
  });
}

function renderGame(){
  const g = state.game;

  recomputeStability(g);

  el("hudStep").textContent = "Spiel";
  el("gMonth").textContent = g.month;
  el("gBalance").textContent = formatEUR(g.balance);
  el("gIncome").textContent = formatEUR(g.income);
  el("gCash").textContent = formatEUR(g.buckets.cash);
  el("gEtf").textContent = formatEUR(g.buckets.etf);

  // make KPIs actionable (withdraw/sell)
  el("gCash").setAttribute("title","Klicken: Geld aus dem Notgroschen aufs Konto holen");
  el("gEtf").setAttribute("title","Klicken: ETF-Anteile verkaufen (mit Gebühr)");
  el("gCash").setAttribute("role","button");
  el("gEtf").setAttribute("role","button");
  el("gCash").setAttribute("tabindex","0");
  el("gEtf").setAttribute("tabindex","0");

  el("gStabilityFill").style.width = `${g.stability}%`;
  el("gStabilityText").textContent = `${g.stability}/100`;

  el("gComfortFill").style.width = `${g.comfort}%`;
  el("gComfortText").textContent = `${g.comfort}/100`;

  el("gSocialFill").style.width = `${g.social}%`;
  el("gSocialText").textContent = `${g.social}/100`;

  const hint =
    g.balance < g.dispoFloor ? "Kontosperre (unter Dispo-Limit)" :
    (g.balance < 0 ? "Im Minus (Dispo)" : "OK");
  el("gBalanceHint").textContent = hint;

  el("inpCash").value = g.plan.cash;
  el("inpEtf").value = g.plan.etf;

  el("btnRunMonth").disabled = g.hasRunThisMonth;
  el("btnNextMonth").disabled = !g.hasRunThisMonth;

  el("loanStatus").textContent = g.loan.active
    ? `Aktiv: ${LOAN_TYPES[g.loan.type]?.label ?? "Kredit"} • Rate ${formatEUR(g.loan.rate)}/Monat • noch ${g.loan.monthsLeft} Monate`
    : "kein Kredit";

  renderBuckets(g);
  renderInsuranceList(g);
  renderQuest(g);

  el("goalNote").innerHTML =
    `Minus-Monate: <strong>${g.redMonths}</strong> • ` +
    `Dispo-Limit: <strong>${formatEUR(g.dispoFloor)}</strong> • ` +
    `Stabilität <strong>${g.stability}</strong> • Komfort <strong>${g.comfort}</strong> • Soziales <strong>${g.social}</strong>.`;

  drawLineChart("chartBalance", g.historyBalance);
  drawLineChart("chartEtf", g.historyEtf);
}

// ---------- withdrawals (cash buffer / ETF) ----------
const ETF_SELL_FEE_PCT = 0.01;   // 1% selling fee
const ETF_SELL_FEE_MIN = 2;      // min fee in €

function promptAmount(title, max, preset="100"){
  const raw = prompt(`${title} (max. ${Math.round(max)} €)`, preset);
  if(raw === null) return null;
  const amount = Math.floor(Number(raw));
  if(!Number.isFinite(amount) || amount <= 0) return NaN;
  return amount;
}

function withdrawFromCash(){
  const g = state.game;
  if(!g) return;
  if(g.buckets.cash <= 0){
    toast("Notgroschen", "Da ist gerade nichts drin.");
    return;
  }

  const amount = promptAmount("Wie viel € willst du aus dem Notgroschen entnehmen?", g.buckets.cash, "100");
  if(amount === null) return;
  if(Number.isNaN(amount)){
    toast("Notgroschen", "Bitte eine Zahl > 0 eingeben.");
    return;
  }
  if(amount > g.buckets.cash){
    toast("Notgroschen", "Geht nicht: Betrag ist höher als dein Notgroschen.");
    return;
  }

  g.buckets.cash -= amount;
  g.balance += amount;

  timelineClear();
  timelineItem(
    "Notgroschen-Entnahme",
    +amount,
    `Du nutzt Rücklagen. Neuer Notgroschen-Stand: ${formatEUR(g.buckets.cash)}.`,
    "#16A34A"
  );
  renderGame();
}

function sellEtf(){
  const g = state.game;
  if(!g) return;
  if(g.buckets.etf <= 0){
    toast("ETF", "Du hast aktuell kein ETF-Guthaben.");
    return;
  }

  const amount = promptAmount("Wie viel € ETF willst du verkaufen?", g.buckets.etf, "200");
  if(amount === null) return;
  if(Number.isNaN(amount)){
    toast("ETF", "Bitte eine Zahl > 0 eingeben.");
    return;
  }
  if(amount > g.buckets.etf){
    toast("ETF", "Geht nicht: Betrag ist höher als dein ETF-Depot.");
    return;
  }

  const fee = Math.max(ETF_SELL_FEE_MIN, Math.round(amount * ETF_SELL_FEE_PCT));
  const payout = Math.max(0, amount - fee);

  g.buckets.etf -= amount;
  g.balance += payout;

  timelineClear();
  timelineItem(
    "ETF verkauft",
    +payout,
    `Verkauf ${formatEUR(amount)} • Gebühr ${formatEUR(fee)} • Auszahlung ${formatEUR(payout)}. Neuer Depot-Stand: ${formatEUR(g.buckets.etf)}.`,
    "#0EA5E9"
  );
  renderGame();
}

// ---------- plan/buckets ----------
function applyPlan(){
  const g = state.game;
  g.plan.cash = Math.max(0, Number(el("inpCash").value || 0));
  g.plan.etf  = Math.max(0, Number(el("inpEtf").value || 0));
  timelineClear();
  timelineInfo("Plan gespeichert", "Wenn zu wenig übrig ist, wird automatisch gekürzt. Kein Invest aus dem Minus.");
  renderGame();
}

function addBucket(){
  const g = state.game;
  const name = (el("newBucketName").value || "").trim();
  if(!name){
    timelineClear();
    timelineInfo("Unterkonto", "Gib einen Namen ein (z. B. Urlaub, Fahrrad, PC).");
    return;
  }
  g.buckets.subs.push({ id: uid(), name, balance:0, plan:30 });
  el("newBucketName").value = "";
  renderGame();
  timelineClear();
  timelineInfo("Unterkonto angelegt", "Neuer Spar-Topf.");
}

// ---------- insurance hint unlock ----------
function unlockInsuranceHint(g, hint){
  if(g.insuranceHints.has(hint)) return;
  g.insuranceHints.add(hint);
  toast("Hinweis", hint);
}

// ---------- ETF movement ----------
function applyEtfMovement(g){
  let r = 0.004 + randn() * 0.045;
  if(Math.random() < 0.10){
    r += rand(-0.08, 0.08);
  }
  r = clamp(r, -0.20, 0.20);

  const before = g.buckets.etf;
  const change = Math.round(before * r);
  g.buckets.etf += change;

  const pct = Math.round(r*1000)/10;
  return { change, pct };
}

// ---------- monthly choice pool ----------
const CHOICES = [
  {
    title: "Essen & Trinken",
    text: "Du merkst: Essen kippt den Monat. Was machst du?",
    a: { label:"Meal Prep", meta:"Planen & vorkochen.", money:+70, stability:+6, comfort:-1, social:0 },
    b: { label:"To-Go/Lieferung", meta:"Bequem, aber teuer.", money:-70, stability:-2, comfort:+2, social:+1 },
  },
  {
    title: "Freizeit",
    text: "Freunde fragen: Kino heute?",
    a: { label:"Mitgehen", meta:"Kostet, aber du bist dabei.", money:-25, stability:-1, comfort:+1, social:+6 },
    b: { label:"Absagen", meta:"Sparen, aber Isolation steigt.", money:+10, stability:+2, comfort:0, social:-4 },
  },
  {
    title: "Shopping",
    text: "Sale. Was passiert?",
    a: { label:"Wunschliste", meta:"Nur 1 Teil kaufen.", money:+30, stability:+3, comfort:0, social:0 },
    b: { label:"Spontan", meta:"3 Teile + Extras.", money:-90, stability:-3, comfort:+3, social:+1 },
  },
  {
    title: "Abo-Check",
    text: "Du merkst: Abos fressen Geld.",
    a: { label:"Kündigen", meta:"2 Abos weg.", money:+18, stability:+3, comfort:-2, social:-1 },
    b: { label:"Behalten", meta:"Bleibt so.", money:0, stability:-1, comfort:+1, social:0 },
  },
];

// ---------- shop (one-time purchases) ----------
const SHOP_ITEMS = [
  { id:"bike", name:"Fahrrad", cost:400, comfort:+6, social:+1, stability:+1, desc:"Günstiger als Auto, flexibler Alltag." },
  { id:"phone", name:"Neues Handy", cost:800, comfort:+4, social:+4, stability:-1, desc:"Praktisch, aber teuer." },
  { id:"furniture", name:"Möbel-Upgrade", cost:500, comfort:+8, social:+1, stability:0, desc:"Wohnung fühlt sich besser an." },
  { id:"laptop", name:"Laptop (Refurb)", cost:450, comfort:+3, social:+1, stability:+2, desc:"Hilft für Schule/Job, sinnvoll." },
  { id:"gym", name:"Sportkurs (3 Monate)", cost:90, comfort:+1, social:+3, stability:+2, desc:"Gesundheit/Stress – wirkt indirekt." },
  { id:"trip", name:"Mini-Trip", cost:180, comfort:+2, social:+6, stability:-2, desc:"Erlebnis + Social, kostet Budget." },
];

function pickTwoDistinct(arr){
  if(arr.length <= 2) return arr.slice(0,2);
  const a = arr[Math.floor(Math.random()*arr.length)];
  let b = arr[Math.floor(Math.random()*arr.length)];
  let guard = 0;
  while(b.id === a.id && guard++ < 8){
    b = arr[Math.floor(Math.random()*arr.length)];
  }
  return [a,b];
}

function shopChoiceForMonth(g){
  // avoid repeating too often: 45% chance
  if(Math.random() > 0.45) return null;
  const [a] = pickTwoDistinct(SHOP_ITEMS);

  const optFrom = (it)=>({
    label:`${it.name} (${formatEUR(it.cost)})`,
    meta: it.desc,
    money: -it.cost,
    stability: it.stability,
    comfort: it.comfort,
    social: it.social,
    _shopId: it.id,
  });

  return {
    title: "Shop / Upgrade",
    text: "Du siehst etwas, das deinen Alltag verbessern könnte. Kaufst du es?",
    a: optFrom(a),
    b: { label:"Nichts kaufen", meta:"Du sparst dieses Mal.", money:0, stability:+1, comfort:0, social:0 },
  };
}

// ---------- risk cards ----------
const RISK_CARDS = [
  {
    title:"Risiko: Krypto-Hype",
    text:"Ein Freund schwört auf einen Coin. Chance oder Falle?",
    a:{ label:"Nein", meta:"Du lässt es.", money:0, stability:+1, comfort:0, social:0 },
    b:{ label:"500 € investieren", meta:"50/50: Rückzahlung 800 € oder 300 €", money:0, stability:-2, comfort:+1, social:+1,
        _risk:{ stake:500, returnWin:800, returnLose:300, pWin:0.5, labelWin:"Krypto pumpt", labelLose:"Krypto crasht" } },
  },
  {
    title:"Risiko: Gebrauchtwagen-Deal",
    text:"Ein günstiges Auto-Angebot – aber unklarer Zustand.",
    a:{ label:"Nein", meta:"Zu unsicher.", money:0, stability:+1, comfort:0, social:0 },
    b:{ label:"Kaufen (700 €)", meta:"40% ok, 60% Reparatur 350 €", money:-700, stability:-3, comfort:+3, social:+1,
        _risk:{ pWin:0.40, win:0, lose:350, labelWin:"Glücksgriff", labelLose:"Reparatur" } },
  },
];

function riskChoiceForMonth(g){
  // 25% chance
  if(Math.random() > 0.25) return null;
  return RISK_CARDS[Math.floor(Math.random()*RISK_CARDS.length)];
}

function resolveRisk(g, risk){
  const p = risk.pWin ?? 0.5;

  // stake/return mode (deduct stake, then add back return)
  if(Number.isFinite(risk.stake) && (Number.isFinite(risk.returnWin) || Number.isFinite(risk.returnLose))){
    const stake = Math.max(0, Math.round(risk.stake));
    if(stake > 0){
      g.balance -= stake;
      timelineItem("Einsatz", -stake, "Risiko-Entscheidung.", "#EA580C");
    }

    const win = Math.random() < p;
    const ret = Math.max(0, Math.round(win ? (risk.returnWin ?? 0) : (risk.returnLose ?? 0)));
    if(ret > 0){
      g.balance += ret;
      timelineItem(win ? (risk.labelWin || "Ausgang") : (risk.labelLose || "Ausgang"), ret - stake, "Zufallsausgang.", win ? "#16A34A" : "#DC2626");
    } else {
      timelineInfo(win ? (risk.labelWin || "Ausgang") : (risk.labelLose || "Ausgang"), "Kein Return.");
    }

    if(win){
      g.stability = clamp(g.stability + 2, 0, 100);
    } else {
      g.stability = clamp(g.stability - 4, 0, 100);
      g.comfort = clamp(g.comfort - 1, 0, 100);
    }
    return;
  }

  // delta mode
  const win = Math.random() < p;
  if(win){
    const gain = Math.round(risk.win ?? 0);
    if(gain){
      g.balance += gain;
      timelineItem(risk.labelWin || "Risk: Gewinn", +gain, "Zufallsausgang.", "#16A34A");
    } else {
      timelineInfo(risk.labelWin || "Risk: Glück gehabt", "Dieses Mal keine Zusatzkosten.");
    }
    g.stability = clamp(g.stability + 2, 0, 100);
  } else {
    const loss = Math.round(risk.lose ?? 0);
    if(loss){
      g.balance -= loss;
      timelineItem(risk.labelLose || "Risk: Verlust", -loss, "Zufallsausgang.", "#DC2626");
    } else {
      timelineInfo(risk.labelLose || "Risk: Pech", "Negatives Ergebnis.");
    }
    g.stability = clamp(g.stability - 4, 0, 100);
    g.comfort = clamp(g.comfort - 1, 0, 100);
  }
}

function checkAchievements(g){
  if(g.buckets.cash >= 1000) award(g, "ach_cash_1000", "Achievement: Notgroschen", "Du hast 1.000 € Notgroschen erreicht.");
  if(g.buckets.cash >= 2000) award(g, "ach_cash_2000", "Achievement: Puffer-Profi", "2.000 € Notgroschen – sehr stabil.");
  if(g.buckets.etf >= 2000) award(g, "ach_etf_2000", "Achievement: Investor", "ETF-Depot über 2.000 €.");
  if(g.social >= 80) award(g, "ach_social_80", "Achievement: Sozialprofi", "Soziales ≥ 80 – du bleibst verbunden.");
  if(g.stability >= 80) award(g, "ach_stable_80", "Achievement: Fels", "Stabilität ≥ 80 – stark geplant.");
  if(g.redMonths >= 3) award(g, "ach_red_3", "Achievement: Überlebt", "3 Minus-Monate überstanden.");
  if(g.redMonths === 0 && g.month >= 6) award(g, "ach_no_red_6", "Achievement: Clean Run", "6 Monate ohne Minus!");
}

// ---------- goal conflict cards ----------
const GOAL_CONFLICTS = [
  {
    title:"Zielkonflikt: Freundeskreis",
    text:"Deine Leute planen einen Abend (Essen + Aktivität). Du bist knapp bei Kasse.",
    a:{ label:"Dabei sein", meta:"Teurer, aber du bleibst drin.", money:-45, stability:-2, comfort:+1, social:+7 },
    b:{ label:"Aussetzen", meta:"Günstig, aber du ziehst dich zurück.", money:+10, stability:+2, comfort:0, social:-6 },
  },
  {
    title:"Zielkonflikt: Komfort vs Kosten",
    text:"Dein Alltag nervt. Du könntest dir etwas kaufen, das vieles einfacher macht.",
    a:{ label:"Kaufen", meta:"Bequemer Alltag.", money:-80, stability:-2, comfort:+6, social:+1 },
    b:{ label:"Warten", meta:"Du ziehst durch.", money:+20, stability:+3, comfort:-1, social:0 },
  },
  {
    title:"Zielkonflikt: Beziehung/Familie",
    text:"Du wirst eingeladen. Kleines Geschenk / Fahrtkosten.",
    a:{ label:"Hingehen", meta:"Du zeigst Präsenz.", money:-25, stability:-1, comfort:0, social:+6 },
    b:{ label:"Absagen", meta:"Sparen, aber du wirkst abwesend.", money:+10, stability:+2, comfort:0, social:-5 },
  },
  {
    title:"Zielkonflikt: Gesundheit",
    text:"Sportkurs/Bewegung oder du lässt es diesen Monat.",
    a:{ label:"Mitmachen", meta:"Kostet, aber tut gut.", money:-30, stability:+1, comfort:+1, social:+3 },
    b:{ label:"Lassen", meta:"Spart Geld, aber Energie sinkt.", money:+10, stability:-1, comfort:-1, social:-1 },
  },
];

function maybeGoalConflict(g, done){
  // every 2 months roughly
  if(g.month % 2 !== 0) return done?.();
  const c = GOAL_CONFLICTS[Math.floor(Math.random()*GOAL_CONFLICTS.length)];
  showChoiceModal(c, (opt) => {
    applyOption(g, opt, "Zielkonflikt");
    done?.();
  });
}

// ---------- events ----------
function applyOption(g, opt, label){
  g.balance += opt.money;
  g.stability = clamp(g.stability + opt.stability, 0, 100);
  g.comfort = clamp(g.comfort + opt.comfort, 0, 100);
  g.social = clamp(g.social + opt.social, 0, 100);

  timelineItem(label, opt.money, `${opt.label}: ${opt.meta}`, "#7C3AED");
}

function enforceDispoFloor(g, cb){
  if(g.balance >= g.dispoFloor) return cb?.();

  // Hard floor: can't go lower than dispoFloor.
  const delta = g.dispoFloor - g.balance;
  g.balance = g.dispoFloor;
  timelineItem("Kontosperre", -delta, "Du bist unter dem Dispo-Limit. Zahlungen wurden gestoppt.", "#DC2626");

  const choice = {
    title:"Kontosperre",
    text:"Du bist unter dem Dispo-Limit. Du musst handeln.",
    a:{ label:"Eltern um Hilfe bitten", meta:"Einmalige Hilfe, aber es fühlt sich abhängig an.", money:+250, stability:+3, comfort:0, social:-1 },
    b:{ label:"Streng sparen", meta:"Du kürzt Freizeit/Shopping/Abos für 2 Monate.", money:+0, stability:+2, comfort:-2, social:-3 },
  };

  showChoiceModal(choice, (opt) => {
    applyOption(g, opt, "Notfall");
    if(opt.label.includes("Eltern")){
      g.askedParentsEver = true;
      award(g, "parents_help", "Achievement: Hilfe annehmen", "Du hast aktiv Hilfe organisiert.");
    } else {
      g.refusedParentsEver = true;
      // apply a temporary austerity effect
      g.variable.fun = Math.max(20, Math.round(g.variable.fun * 0.6));
      g.variable.shop = Math.max(20, Math.round(g.variable.shop * 0.6));
      g.variable.subs = Math.max(0, Math.round(g.variable.subs * 0.6));
      award(g, "austerity", "Achievement: Disziplin", "Du hast dich für Sparen statt Hilfe entschieden.");
    }
    cb?.();
  });
}

function award(g, id, title, text){
  if(g.achievements.has(id)) return;
  g.achievements.add(id);
  toast(title, text);
}

// --- specific month 1 specials ---
function doBABDecision(g, done){
  g.babChoicePending = false;

  const c = {
    title:"BAB (Berufsausbildungsbeihilfe)",
    text:"Du bist in Ausbildung. Prüfst du BAB? (vereinfacht)",
    a:{ label:"Beantragen", meta:"Du bekommst Unterstützung (wenn berechtigt).", money:0, stability:+2, comfort:+1, social:0 },
    b:{ label:"Nicht beantragen", meta:"Du regelst es ohne Antrag.", money:0, stability:-1, comfort:0, social:0 },
  };

  showChoiceModal(c, (opt) => {
    applyOption(g, opt, "Entscheidung");
    if(opt.label === "Beantragen"){
      g.bab.active = true;
      g.bab.amount = 180;
      timelineInfo("BAB aktiv", `Du bekommst ${formatEUR(g.bab.amount)}/Monat (vereinfacht).`);
      award(g, "bab", "Achievement: Förderung", "Du hast eine Förderung genutzt.");
    } else {
      g.bab.active = false;
      g.bab.amount = 0;
    }
    done?.();
  });
}

function doMoveOutFurnishing(g, done){
  g.moveOutChoicePending = false;
  if(g.furnished) return done?.();

  const c = {
    title:"Einrichtung",
    text:"Du ziehst nicht mehr bei Eltern. Einrichtung kostet.",
    a:{ label:"Günstig einrichten", meta:"Second-hand, gebraucht.", money:-250, stability:-1, comfort:+2, social:0 },
    b:{ label:"Neu kaufen", meta:"Schön, aber teuer.", money:-650, stability:-2, comfort:+6, social:+1 },
  };

  showChoiceModal(c, (opt) => {
    applyOption(g, opt, "Startkosten");
    g.furnished = true;
    done?.();
  });
}

// ---------- random event pool ----------
const EVENTS = [
  {
    title:"Handy kaputt",
    text:"Dein Handy fällt runter. Reparatur oder neu?",
    choice:{
      title:"Handy kaputt",
      text:"Was machst du?",
      a:{ label:"Reparieren", meta:"Günstiger.", money:-120, stability:-1, comfort:-1, social:-1 },
      b:{ label:"Neu kaufen", meta:"Teurer, aber nice.", money:-420, stability:-2, comfort:+2, social:+2 },
    },
    after(g){
      unlockInsuranceHint(g, "Handy: Versicherung kann helfen – aber kostet monatlich.");
    }
  },
  {
    title:"Haftpflicht-Fall",
    text:"Du beschädigst aus Versehen etwas bei jemandem.",
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
    title:"Job/Schichtbonus",
    text:"Du bekommst einen kleinen Bonus.",
    after(g){
      g.balance += 120;
      timelineItem("Bonus", +120, "Glück gehabt.", "#16A34A");
      g.stability = clamp(g.stability + 2, 0, 100);
    }
  },
  {
    title:"Hausrat-Schaden",
    text:"Etwas in der Wohnung geht kaputt.",
    after(g){
      unlockInsuranceHint(g, "Hausrat: kann bei Schäden an Dingen helfen.");
      if(!g.insurance.hausrat){
        g.balance -= 160;
        timelineItem("Ersatz", -160, "Ohne Hausrat zahlst du selbst.", "#DC2626");
        g.comfort = clamp(g.comfort - 2, 0, 100);
      } else {
        timelineInfo("Hausrat greift", "Ersatz übernommen (vereinfacht).");
        g.comfort = clamp(g.comfort + 1, 0, 100);
      }
    }
  },
];

function doRandomEvent(g, done){
  // 50% chance
  if(Math.random() > 0.5) return done?.();

  const ev = EVENTS[Math.floor(Math.random()*EVENTS.length)];
  if(ev.choice){
    showChoiceModal(ev.choice, (opt) => {
      applyOption(g, opt, "Ereignis");
      ev.after?.(g);
      enforceDispoFloor(g, () => done?.());
    });
  } else {
    showEventModal({ title: ev.title, text: ev.text }, () => {
      ev.after?.(g);
      enforceDispoFloor(g, () => done?.());
    });
  }
}

// ---------- quarterly ----------
function quarterlyCosts(month){
  if(month % 3 !== 0) return [];
  return [
    { label:"GEZ (Quartal)", amount: -55, why:"Viele Haushalte zahlen quartalsweise." },
    { label:"Periodische Kosten", amount: -120, why:"Kosten, die nicht monatlich kommen." },
  ];
}

// ---------- loan ----------
function takeLoan(){
  const g = state.game;
  const loanType = el("loanType").value;
  const cfg = LOAN_TYPES[loanType] ?? LOAN_TYPES.konsum;

  const amount = Math.max(0, Number(el("loanAmount").value || 0));
  const months = clamp(Number(el("loanMonths").value || 12), cfg.minMonths, cfg.maxMonths);

  if(amount <= 0){
    timelineClear();
    timelineInfo("Kredit", "Trage einen Betrag > 0 ein.");
    return;
  }
  if(g.loan.active){
    timelineClear();
    timelineInfo("Kredit", "Prototype: nur 1 Kredit gleichzeitig.");
    return;
  }

  const apr = cfg.apr;
  const rate = calcMonthlyRate(amount, months, apr);

  g.loan = { active:true, principal:amount, monthsLeft:months, rate, apr, type:loanType };
  g.balance += amount;

  timelineClear();
  timelineItem("Kredit ausgezahlt", +amount, `${cfg.label} • ${apr}% p.a.`, "#EA580C");
  timelineInfo("Monatsrate", `~${formatEUR(rate)}/Monat für ${months} Monate.`);
  renderGame();

  award(g, "loan_taken", "Achievement: Kredit", "Du hast einen Kredit aufgenommen. Beobachte die Belastung.");
  enforceDispoFloor(g, () => renderGame());
}

// ---------- month loop ----------
function runMonth(){
  const g = state.game;
  if(!g || g.hasRunThisMonth) return;

  const setPhase = (txt)=>{ const e = el("gExplain"); if(e) e.textContent = txt; };

  const doSpecialsAsync = async () => {
    if(g.month === 1 && g.babChoicePending){
      await new Promise(resolve => doBABDecision(g, resolve));
    }
    if(g.month === 1 && g.moveOutChoicePending){
      await new Promise(resolve => doMoveOutFurnishing(g, resolve));
    }
  };

  const coreAsync = async () => {
    timelineClear();

    // PHASE 1: Income
    setPhase("Phase 1/5: Einkommen");
    await sleep(200);
    g.balance += g.income;
    timelineItem("Einkommen (Netto)", g.income, "Vereinfacht.", "#16A34A");

    // PHASE 2: Costs
    setPhase("Phase 2/5: Fixkosten & Budgets");
    await sleep(200);

    const fixedSum = computeFixedSum(g);
    g.balance -= fixedSum;
    timelineItem("Kosten (Summe)", -fixedSum, "Fixkosten + Budgets (BAB reduziert).", "#0F172A");

    const f = g.fixed, v = g.variable;
    timelineItem("Miete", -f.rent, "Wohnen.", "#0F172A");
    timelineItem("Nebenkosten", -f.utilities, "Strom/Wasser/Heizung.", "#0F172A");
    timelineItem("Essen/Trinken", -v.food, "Lifestyle.", "#0F172A");
    timelineItem("Freizeit", -v.fun, "Lifestyle.", "#0F172A");
    timelineItem("Shopping", -v.shop, "Lifestyle.", "#0F172A");
    timelineItem("Abos", -v.subs, "Streaming/Apps.", "#0F172A");
    timelineItem("Mobilität", -v.mobility, g.hasCar ? "Auto-Basis." : "Ticket/Fahrrad.", "#0F172A");
    timelineItem("Internet", -f.internet, "Vertrag.", "#0F172A");
    timelineItem("Handy", -f.phone, "Tarif.", "#0F172A");
    if(f.family>0) timelineItem("Familie", -f.family, "Mehr Personen = mehr Kosten.", "#0F172A");
    if(g.bab.active) timelineItem("BAB Entlastung", +g.bab.amount, "Vereinfachtes Modell.", "#16A34A");

    // insurance
    const insSum = insuranceSum(g);
    if(insSum > 0){
      g.balance -= insSum;
      timelineItem("Versicherungen", -insSum, "Laufende Kosten.", "#0EA5E9");
      g.comfort = clamp(g.comfort + 1, 0, 100);
    } else {
      timelineInfo("Versicherungen", "Keine aktiv. Spart Geld – Risiko bleibt bei dir.");
    }

    // loan
    if(g.loan.active){
      const pay = Math.round(g.loan.rate);
      g.balance -= pay;
      g.loan.monthsLeft -= 1;
      timelineItem("Kreditrate", -pay, `Noch ${g.loan.monthsLeft} Monate.`, "#EA580C");
      if(g.loan.monthsLeft <= 0){
        g.loan.active = false;
        timelineInfo("Kredit beendet", "Abbezahlt.");
        award(g, "loan_done", "Achievement: Schuldenfrei", "Kredit komplett abbezahlt.");
      }
    }

    // quarterly
    for(const c of quarterlyCosts(g.month)){
      g.balance += c.amount;
      timelineItem(c.label, c.amount, c.why, "#0F172A");
    }

    await new Promise(resolve => enforceDispoFloor(g, resolve));

    // PHASE 3: Planning (auto-apply plan)
    setPhase("Phase 3/5: Sparplan");
    await sleep(200);

    const wantSub = g.buckets.subs.reduce((s,b)=> s + (b.plan||0), 0);
    const want = g.plan.cash + g.plan.etf + wantSub;

    const canSpend = Math.max(0, g.balance);
    const factor = want > 0 ? Math.min(1, canSpend / want) : 0;

    const payCash = Math.floor(g.plan.cash * factor);
    const payEtf  = Math.floor(g.plan.etf  * factor);

    let paidSubs = 0;
    for(const b of g.buckets.subs){
      const pay = Math.floor((b.plan||0) * factor);
      if(pay > 0){ b.balance += pay; paidSubs += pay; }
    }

    const totalPlanPaid = payCash + payEtf + paidSubs;
    if(totalPlanPaid > 0){
      g.balance -= totalPlanPaid;
      timelineItem("Sparen/Invest", -totalPlanPaid, "Notgroschen/ETF/Ziele.", "#4F46E5");
      g.comfort = clamp(g.comfort - 1, 0, 100);
    } else {
      timelineInfo("Sparen/Invest", "Nichts übrig.");
      g.stability = clamp(g.stability - 2, 0, 100);
    }

    if(payCash > 0){ g.buckets.cash += payCash; timelineItem("Notgroschen", -payCash, "Puffer.", "#16A34A"); }
    if(payEtf > 0){ g.buckets.etf += payEtf; timelineItem("ETF Kauf", -payEtf, "Anteile.", "#0EA5E9"); }

    // PHASE 4: Event / Decision chain
    setPhase("Phase 4/5: Ereignis & Entscheidungen");
    await sleep(200);

    const choice = CHOICES[(g.month - 1) % CHOICES.length];
    const picked = await showChoiceModalAsync(choice);
    applyOption(g, picked, "Entscheidung");
    await new Promise(resolve => enforceDispoFloor(g, resolve));

    // optional shop
    const shop = shopChoiceForMonth(g);
    if(shop){
      const sp = await showChoiceModalAsync(shop);
      applyOption(g, sp, "Shop");
      await new Promise(resolve => enforceDispoFloor(g, resolve));
    }

    // goal conflict
    await new Promise(resolve => maybeGoalConflict(g, resolve));

    // optional risk
    const risk = riskChoiceForMonth(g);
    if(risk){
      const rp = await showChoiceModalAsync(risk);
      applyOption(g, rp, "Risiko");
      if(rp && rp._risk) resolveRisk(g, rp._risk);
      await new Promise(resolve => enforceDispoFloor(g, resolve));
    }

    // random event
    await new Promise(resolve => doRandomEvent(g, resolve));

    // ETF movement
    const mv = applyEtfMovement(g);
    timelineItem("ETF Bewegung", mv.change, `Monatsrendite: ${mv.pct >= 0 ? "+" : ""}${mv.pct}%`, "#0EA5E9");

    if(g.balance < 0) {
      g.redMonths += 1;
      g.social = clamp(g.social - 2, 0, 100);
      g.comfort = clamp(g.comfort - 1, 0, 100);
    }
    g.social = clamp(g.social + (g.variable.fun >= 120 ? 1 : 0), 0, 100);

    g.historyBalance.push(g.balance);
    g.historyEtf.push(g.buckets.etf);

    g.hasRunThisMonth = true;

    checkAchievements(g);

    // PHASE 5: End
    setPhase("Phase 5/5: Monatsende");
    await sleep(180);

    renderGame();

    if(g.month >= 12){
      endGame();
    } else {
      setPhase("Monat fertig. Klick auf „Nächster Monat“.");
    }
  };

  (async ()=>{
    await doSpecialsAsync();
    await coreAsync();
  })();
}

function nextMonth(){
  const g = state.game;
  if(!g.hasRunThisMonth) return;
  if(g.month >= 12) return;

  g.month += 1;
  g.hasRunThisMonth = false;

  timelineClear();
  timelineInfo("Neuer Monat", "Bereit? Monat starten.");
  renderGame();
}

// ---------- end game ----------
function computeWealth(g){
  return g.balance
    + g.buckets.cash
    + g.buckets.etf
    + g.buckets.subs.reduce((s,b)=>s+b.balance,0);
}

function classifyProfile(g){
  const wealth = computeWealth(g);
  const stable = g.stability;
  const comfy = g.comfort;
  const social = g.social;
  const red = g.redMonths;

  if(stable >= 75 && red <= 1) return { name:"Der Stratege", line:"Du planst solide und fängst Risiken früh ab." };
  if(comfy >= 75 && wealth < 800) return { name:"Der Genießer", line:"Komfort ist dir wichtig – kostet aber dauerhaft." };
  if(g.buckets.etf >= 1200 && stable < 60) return { name:"Der Risiko-Spieler", line:"Du investierst stark, aber schwankst spürbar." };
  if(red >= 4) return { name:"Der Überlebenskünstler", line:"Du kommst durch – aber oft am Limit." };
  if(social >= 75 && stable < 60) return { name:"Der Connector", line:"Du bist viel unterwegs – Budget braucht Grenzen." };
  return { name:"Der Balancierer", line:"Du hältst mehrere Ziele gleichzeitig im Blick." };
}

function endGame(){
  const g = state.game;
  const wealth = computeWealth(g);
  const prof = classifyProfile(g);

  const ach = [...g.achievements].length;

  const html = `
    <p><strong>Profil:</strong> ${prof.name} – ${prof.line}</p>
    <p><strong>Kontostand:</strong> ${formatEUR(g.balance)}</p>
    <p><strong>Notgroschen:</strong> ${formatEUR(g.buckets.cash)} • <strong>ETF:</strong> ${formatEUR(g.buckets.etf)}</p>
    <p><strong>Unterkonten:</strong> ${formatEUR(g.buckets.subs.reduce((s,b)=>s+b.balance,0))}</p>
    <p><strong>Vermögen (vereinfachte Summe):</strong> ${formatEUR(wealth)}</p>
    <p><strong>Minus-Monate:</strong> ${g.redMonths}</p>
    <p><strong>Stabilität/Komfort/Soziales:</strong> ${g.stability}/${g.comfort}/${g.social}</p>
    <p><strong>Achievements:</strong> ${ach}</p>
    <hr/>
    <p class="muted">Hinweis: Das ist ein Lern-Spiel. Es vereinfacht viele Dinge (Steuern, Verträge, Lebensrealitäten).</p>
  `;
  showEndModal(html);
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

  // story text (small flavor)
  const story = [
    "Du startest frisch in dein erstes eigenes Budget. Klingt easy – bis die ersten Fixkosten kommen.",
    "Du hast 12 Monate. Ziel: Notgroschen ≥ 1.000 € und möglichst wenige Minus-Monate.",
    "Tipp: Komfort & Soziales sind echte Werte – nicht nur Euro."
  ].join(" ");
  el("storyText").textContent = story;

  el("screenInterview").classList.add("hidden");
  el("screenGame").classList.remove("hidden");

  timelineClear();
  timelineInfo("Los geht's", "Klick auf „Monat starten“.");
  renderGame();
}

// ---------- glossary ----------
function showGlossary(){
  const html = `
    <div class="gItem">
      <div class="gTitle">Notgroschen</div>
      <div class="gText">Rücklage für Notfälle (Auto, Waschmaschine, Jobverlust).</div>
      <div class="gSmall">Im Spiel: Du kannst entnehmen, wenn es brennt.</div>
    </div>
    <div class="gItem">
      <div class="gTitle">ETF</div>
      <div class="gText">Ein Fonds, der viele Aktien bündelt. Schwankt. Chance & Risiko.</div>
      <div class="gSmall">Im Spiel: Du kannst verkaufen – mit Gebühr.</div>
    </div>
    <div class="gItem">
      <div class="gTitle">Dispo</div>
      <div class="gText">Kurzfristiger Kreditrahmen am Konto. Zinsen hoch.</div>
      <div class="gSmall">Im Spiel: Dispo-Limit = -500 €. Darunter sperrt das Konto.</div>
    </div>
  `;
  el("glossaryContent").innerHTML = html;
  el("glossaryDrawer").classList.remove("hidden");
  el("glossaryDrawer").setAttribute("aria-hidden","false");
}

function closeGlossary(){
  el("glossaryDrawer").classList.add("hidden");
  el("glossaryDrawer").setAttribute("aria-hidden","true");
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

  // game controls
  el("btnRunMonth").addEventListener("click", runMonth);
  el("btnNextMonth").addEventListener("click", nextMonth);
  el("btnApplyPlan").addEventListener("click", applyPlan);
  el("btnAddBucket").addEventListener("click", addBucket);
  el("btnTakeLoan").addEventListener("click", takeLoan);

  // KPI withdrawals
  const cash = el("gCash");
  const etf = el("gEtf");
  const bindKpi = (node, fn) => {
    node.addEventListener("click", fn);
    node.addEventListener("keydown", (e)=>{ if(e.key==="Enter"||e.key===" "){ e.preventDefault(); fn(); } });
  };
  bindKpi(cash, withdrawFromCash);
  bindKpi(etf, sellEtf);

  // initial avatar
  regenAvatar();
}

bind();
