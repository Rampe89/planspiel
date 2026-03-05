/* MoneyQuest – Life Layers Update
   Added:
   - Comfort + Social meters
   - Move-out furnishing (month 1) with choices
   - Event decisions (car breakdown etc.)
   - Fixed APR credit types (no manual APR)
   - BAB (Berufsausbildungsbeihilfe) option for Ausbildung
*/

const el = (id) => document.getElementById(id);

// ---------- helpers ----------
function formatEUR(n){
  const v = Math.round(n);
  const s = v.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${s} €`;
}
function clamp(n,a,b){ return Math.max(a, Math.min(b,n)); }
function uid(){ return Math.random().toString(16).slice(2,10); }
function rand(min,max){ return min + Math.random()*(max-min); }

// Box-Muller normal
function randn(){
  let u = 0, v = 0;
  while(u === 0) u = Math.random();
  while(v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

// ---------- glossary ----------
const GLOSSARY = [
  { title:"Fixkosten", text:"Kosten, die jeden Monat (fast) gleich sind (Miete, Internet, Handy…).", small:"Fixkosten laufen auch dann, wenn du nichts kaufst."},
  { title:"Variable Kosten", text:"Kosten, die schwanken (Freizeit, Snacks, Reparaturen…).", small:"Variabel = mehr Kontrolle, aber auch mehr Risiko."},
  { title:"Notgroschen", text:"Geld nur für Notfälle (Waschmaschine, Auto, Arzt).", small:"Erst Notgroschen, dann Luxus."},
  { title:"ETF", text:"ETF = Korb aus vielen Aktien. Du kaufst Anteile, der Wert schwankt.", small:"Schwankt sichtbar, auch negativ."},
  { title:"Zinsen", text:"Kredit kostet extra Geld (Zinsen).", small:"Zinsen machen Kredite langfristig teuer."},
  { title:"Komfort", text:"Bequemlichkeit im Alltag (Auto, Einrichtung, Abo-Komfort).", small:"Komfort kostet oft laufend Geld."},
  { title:"Soziales", text:"Privatleben/soziale Teilhabe (Kino, Freunde, rausgehen).", small:"Zu viel sparen kann soziale Isolation fördern."},
];

function openGlossary(){
  el("glossaryContent").innerHTML = GLOSSARY.map(g => `
    <div class="gItem">
      <div class="gTitle">${g.title}</div>
      <div class="gText">${g.text}</div>
      <div class="gSmall">${g.small}</div>
    </div>
  `).join("");
  el("glossaryDrawer").classList.remove("hidden");
  el("glossaryDrawer").setAttribute("aria-hidden","false");
}
function closeGlossary(){
  el("glossaryDrawer").classList.add("hidden");
  el("glossaryDrawer").setAttribute("aria-hidden","true");
}

// ---------- toast ----------
let toastTimer = null;
function toast(title, text){
  el("toastTitle").textContent = title;
  el("toastText").textContent = text;
  el("toast").classList.remove("hidden");
  if(toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(()=> el("toast").classList.add("hidden"), 2600);
}
function award(g, id, title, text){
  if(g.achievements.has(id)) return;
  g.achievements.add(id);
  toast(`🏆 ${title}`, text);
}

// ---------- interview ----------
function getProfile(){
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
function buildStory(p){
  const pathText = p.path === "ausbildung" ? "in der Ausbildung" : (p.path === "studium" ? "im Studium" : "im Job");
  const fieldText = ({it:"in der IT", pflege:"in der Pflege", handwerk:"im Handwerk", buero:"im Büro", einzelhandel:"im Einzelhandel"})[p.field] || "im Beruf";
  const livingText = ({wg:"in einer WG", miete:"in einer Mietwohnung", eltern:"bei deinen Eltern", eigentum:"in deinem Eigentum"})[p.living] || "irgendwo";
  const familyText = (p.family === "single") ? "Solo unterwegs." : (p.family === "partner" ? "Mit Partner:in." : "Mit Kind-Verantwortung.");
  return `Du bist ${pathText} ${fieldText} und wohnst ${livingText}. ${familyText} Komfort & Soziales reagieren auf deine Entscheidungen – nicht nur das Geld.`;
}

// ---------- avatar ----------
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
  return `${p.path}|${p.field}|${p.living}|${p.family}|${p.style}|${p.lifeFood}|${p.lifeFun}|${p.lifeShop}|${p.lifeSubs}|${p.lifeMobility}|${salt}`;
}
function pick(rng, arr){ return arr[Math.floor(rng()*arr.length)]; }

function drawAvatar(profile, salt=0){
  const canvas = el("avatar");
  const ctx = canvas.getContext("2d", { alpha: true });

  const seedFn = xmur3(profileSeed(profile, salt));
  const rng = mulberry32(seedFn());

  const skinTones = ["#F2D6CB","#E7C0A6","#D7A27F","#B97E57","#8E5A3C"];
  const hairColors = ["#1F2937","#111827","#6B4F3A","#A16207","#7C3AED","#0F766E"];
  const shirtColors = ["#7C3AED","#22C55E","#F97316","#111827","#06B6D4","#DB2777"];
  const pantsColors = ["#334155","#0F172A","#475569","#1F2937"];

  const skin = pick(rng, skinTones);
  const hair = pick(rng, hairColors);
  const shirt = pick(rng, shirtColors);
  const pants = pick(rng, pantsColors);

  const hairStyle =
    (profile.style === "fem") ? "long" :
    (profile.style === "masc" ? "short" :
    pick(rng, ["short","cap","messy"]));

  ctx.clearRect(0,0,16,16);
  const px = (x,y,c)=>{ ctx.fillStyle=c; ctx.fillRect(x,y,1,1); };
  const rect=(x,y,w,h,c)=>{ ctx.fillStyle=c; ctx.fillRect(x,y,w,h); };

  rect(5,2,6,6,skin);
  rect(7,8,2,1,skin);
  px(7,5,"#111827"); px(9,5,"#111827");
  px(8,7,"#7C2D12");

  if(hairStyle === "short"){ rect(5,2,6,2,hair); px(5,4,hair); px(10,4,hair); }
  else if(hairStyle === "long"){ rect(5,2,6,2,hair); rect(4,4,1,4,hair); rect(11,4,1,4,hair); rect(5,4,6,1,hair); }
  else if(hairStyle === "cap"){ rect(5,2,6,2,"#111827"); rect(4,3,8,1,"#111827"); }
  else { rect(5,2,6,2,hair); px(4,3,hair); px(11,3,hair); px(6,4,hair); px(9,4,hair); }

  rect(5,9,6,4,shirt);
  rect(4,10,1,2,skin); rect(11,10,1,2,skin);
  rect(5,13,6,3,pants);
  px(6,15,"#0B1220"); px(9,15,"#0B1220");
}

// ---------- economy ----------
const JOB_NET = {
  it:          { ausbildung: 1600, studium: 2300, job: 2800 },
  pflege:      { ausbildung: 1550, studium: 2000, job: 2450 },
  handwerk:    { ausbildung: 1650, studium: 2050, job: 2550 },
  buero:       { ausbildung: 1500, studium: 2050, job: 2450 },
  einzelhandel:{ ausbildung: 1400, studium: 1900, job: 2200 },
};

const LIVING = {
  wg:       { rent: 480, utilities: 130, internet: 20 },
  miete:    { rent: 780, utilities: 170, internet: 35 },
  eltern:   { rent: 220, utilities: 90,  internet: 0  },
  eigentum: { rent: 1150, utilities: 240, internet: 35 },
};

function familyCosts(family){
  if(family === "partner") return 220;
  if(family === "kind") return 450;
  return 0;
}

function lifestyleBudgets(p){
  const food = (p.lifeFood === "sparsam") ? 230 : (p.lifeFood === "teuer" ? 380 : 290);
  const fun  = (p.lifeFun === "low") ? 60 : (p.lifeFun === "high" ? 220 : 120);
  const shop = (p.lifeShop === "low") ? 20 : (p.lifeShop === "high" ? 140 : 60);
  const subs = (p.lifeSubs === "none") ? 0 : (p.lifeSubs === "many" ? 45 : 18);

  let mobility = 0;
  let hasCar = false;
  if(p.lifeMobility === "ticket") mobility = 49;
  if(p.lifeMobility === "bike") mobility = 12;
  if(p.lifeMobility === "car"){
    hasCar = true;
    mobility = 190;
  }
  return { food, fun, shop, subs, mobility, hasCar };
}

// ---------- insurance (no spoiler labels) ----------
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
      timelineInfo("Versicherung geändert", "Abwägung: laufende Kosten vs. Risiko. Hinweise kommen durch Ereignisse.");
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

    const pills = [];
    pills.push(`<span class="pill ${opt.money>=0?'good':'bad'}">${opt.money>=0?'+':''}${formatEUR(opt.money).replace(' €','')}€</span>`);
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
  timelineItem(title, 0, sub, "#06B6D4");
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

  ctx.strokeStyle = "rgba(124,58,237,.95)";
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
    ctx.fillStyle = "rgba(34,197,94,.95)";
    ctx.beginPath();
    ctx.arc(x,y,4,0,Math.PI*2);
    ctx.fill();
  });

  if(minV < 0 && maxV > 0){
    const y0 = yAt(0);
    ctx.strokeStyle = "rgba(239,68,68,.35)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padL, y0);
    ctx.lineTo(padL+plotW, y0);
    ctx.stroke();
  }
}

// ---------- state ----------
const state = { salt:0, profile:null, game:null };

// ---------- comfort/social model ----------
function initialComfort(profile){
  // baseline from living + mobility + subs (more convenience)
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

  // single can be more flexible, kind can reduce spontaneity
  if(profile.family === "single") s += 2;
  if(profile.family === "kind") s -= 3;

  return clamp(s, 0, 100);
}

function newGame(profile){
  const income = JOB_NET[profile.field]?.[profile.path] ?? 1700;
  const living = LIVING[profile.living] ?? LIVING.wg;

  const life = lifestyleBudgets(profile);

  return {
    month: 1,
    balance: 350,
    income,

    // fixed
    fixed: {
      rent: living.rent,
      utilities: living.utilities,
      internet: living.internet,
      phone: 20,
      family: familyCosts(profile.family),
    },

    // variable budgets (from interview)
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

    // flags
    furnished: (profile.living === "eltern"), // at parents: assume already furnished
    bab: { eligible: profile.path === "ausbildung", active:false, amount:0 },

    // month 1 special hooks
    moveOutChoicePending: (profile.living !== "eltern"),
    babChoicePending: (profile.path === "ausbildung"),
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

function computeLoanMonthly(g){
  return g.loan.active ? Math.round(g.loan.rate) : 0;
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
        <button class="btn soft ghost" data-del="${b.id}" type="button">✕</button>
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

  el("gStabilityFill").style.width = `${g.stability}%`;
  el("gStabilityText").textContent = `${g.stability}/100`;

  el("gComfortFill").style.width = `${g.comfort}%`;
  el("gComfortText").textContent = `${g.comfort}/100`;

  el("gSocialFill").style.width = `${g.social}%`;
  el("gSocialText").textContent = `${g.social}/100`;

  el("gBalanceHint").textContent = g.balance < 0 ? "⚠ im Minus" : "✅ ok";

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
    `Rote Monate: <strong>${g.redMonths}</strong> • ` +
    `Stabilität: <strong>${g.stability}</strong> • Komfort: <strong>${g.comfort}</strong> • Soziales: <strong>${g.social}</strong>.`;

  drawLineChart("chartBalance", g.historyBalance);
  drawLineChart("chartEtf", g.historyEtf);
}

// ---------- plan/buckets ----------
function applyPlan(){
  const g = state.game;
  g.plan.cash = Math.max(0, Number(el("inpCash").value || 0));
  g.plan.etf  = Math.max(0, Number(el("inpEtf").value || 0));
  timelineClear();
  timelineInfo("Plan gespeichert", "Wenn zu wenig übrig ist, wird automatisch gekürzt (kein Invest aus dem Minus).");
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
  toast("ℹ️ Hinweis", hint);
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

// ---------- choices ----------
const CHOICES = [
  {
    title: "Essen & Trinken",
    text: "Du merkst: Essen kippt den Monat. Was machst du?",
    a: { label:"Meal Prep", meta:"Planen & vorkochen.", money:+70, stability:+6, comfort:-1, social:0 },
    b: { label:"To-Go/Lieferung", meta:"Bequem, teuer.", money:-70, stability:-2, comfort:+2, social:+1 },
  },
  {
    title: "Freizeit",
    text: "Freunde fragen: Kino heute?",
    a: { label:"Mitgehen", meta:"Kosten, aber du bist dabei.", money:-25, stability:-1, comfort:+1, social:+6 },
    b: { label:"Absagen", meta:"Sparen, aber du isolierst dich etwas.", money:+10, stability:+2, comfort:0, social:-4 },
  },
  {
    title: "Shopping",
    text: "Sale everywhere. Was passiert?",
    a: { label:"Wunschliste", meta:"Nur 1 Teil kaufen.", money:+30, stability:+3, comfort:0, social:0 },
    b: { label:"Spontan", meta:"3 Teile + Accessoires.", money:-90, stability:-3, comfort:+3, social:+1 },
  },
  {
    title: "Abo-Falle",
    text: "Du merkst: Abos fressen Geld. Move?",
    a: { label:"Kündigen", meta:"2 Abos weg.", money:+18, stability:+3, comfort:-2, social:-1 },
    b: { label:"Behalten", meta:"Bleibt so.", money:0, stability:-1, comfort:+1, social:0 },
  },
];

// ---------- Month 1: move-out furnishing decision ----------
function doMoveOutFurnishing(g, after){
  const title = "Auszug & Einrichtung";
  const text = "Du ziehst aus. Bei WG/Mietwohnung brauchst du Einrichtung (Bett, Tisch, Basics). Wie gehst du’s an?";

  showChoiceModal({
    title, text,
    a: {
      label:"Gebraucht & Basics",
      meta:"Kleinanzeigen/IKEA-Startset.",
      money:-900, stability:+2, comfort:-1, social:0
    },
    b: {
      label:"Neu kaufen",
      meta:"Bequemer, aber teuer.",
      money:-2500, stability:-4, comfort:+6, social:0
    }
  }, (opt) => {
    // apply chosen
    g.balance += opt.money;
    g.stability = clamp(g.stability + opt.stability, 0, 100);
    g.comfort = clamp(g.comfort + opt.comfort, 0, 100);
    g.social = clamp(g.social + opt.social, 0, 100);

    timelineItem("Einrichtung", opt.money, "Einmalige Kosten durch Auszug.", "#F97316");

    // follow-up: parent support option as micro decision (simple)
    if(opt.money < 0){
      showChoiceModal({
        title:"Eltern-Zuschuss?",
        text:"Du kannst um Unterstützung bitten (realistisch, aber nicht immer angenehm).",
        a:{ label:"Ja, um Hilfe bitten", meta:"Einmalig +1000€.", money:+1000, stability:+1, comfort:+1, social:-1 },
        b:{ label:"Nein", meta:"Du regelst es selbst.", money:0, stability:+1, comfort:0, social:+1 }
      }, (opt2) => {
        g.balance += opt2.money;
        g.stability = clamp(g.stability + opt2.stability, 0, 100);
        g.comfort = clamp(g.comfort + opt2.comfort, 0, 100);
        g.social = clamp(g.social + opt2.social, 0, 100);
        if(opt2.money !== 0) timelineItem("Eltern-Zuschuss", opt2.money, "Einmalige Unterstützung.", "#22C55E");
        g.furnished = true;
        g.moveOutChoicePending = false;
        after?.();
      });
    } else {
      g.furnished = true;
      g.moveOutChoicePending = false;
      after?.();
    }
  });
}

// ---------- Ausbildung: BAB decision ----------
function doBABDecision(g, after){
  const title = "BAB (Ausbildungsbeihilfe)";
  const text = "Du bist in Ausbildung. Du kannst einen Zuschuss beantragen (vereinfachtes Modell).";

  showChoiceModal({
    title, text,
    a:{ label:"Beantragen", meta:"+250€/Monat, ggf. Papierkram.", money:0, stability:+3, comfort:+1, social:0 },
    b:{ label:"Nicht beantragen", meta:"Kein Zuschuss, weniger Aufwand.", money:0, stability:-1, comfort:0, social:0 }
  }, (opt) => {
    g.stability = clamp(g.stability + opt.stability, 0, 100);
    g.comfort = clamp(g.comfort + opt.comfort, 0, 100);
    g.social = clamp(g.social + opt.social, 0, 100);

    if(opt.label.startsWith("Beantragen")){
      g.bab.active = true;
      g.bab.amount = 250;
      timelineItem("BAB bewilligt", +250, "Ab jetzt -250€ bei deinen monatlichen Kosten (vereinfachtes Modell).", "#22C55E");
      unlockInsuranceHint(g, "Staatliche Unterstützung: Antrag stellen kann sich lohnen – aber nicht jeder weiß davon.");
    } else {
      g.bab.active = false;
      g.bab.amount = 0;
      timelineInfo("BAB", "Du nutzt keinen Zuschuss.");
    }

    g.babChoicePending = false;
    after?.();
  });
}

// ---------- events with decisions ----------
function doCarBreakdown(g, after){
  const title = "Ereignis: Auto kaputt";
  const text = "Dein Auto streikt. Werkstatt sagt: Reparatur kostet 1.200 €.";

  showChoiceModal({
    title, text,
    a:{ label:"Reparieren", meta:"Auto bleibt. Teuer, aber Komfort hoch.", money:-1200, stability:-3, comfort:+2, social:0 },
    b:{ label:"Umsteigen", meta:"Auto weg. Fahrrad/ÖPNV, weniger Komfort, mehr Stabilität.", money:-300, stability:+3, comfort:-8, social:-1 },
  }, (opt) => {
    g.balance += opt.money;
    g.stability = clamp(g.stability + opt.stability, 0, 100);
    g.comfort = clamp(g.comfort + opt.comfort, 0, 100);
    g.social = clamp(g.social + opt.social, 0, 100);

    if(opt.label === "Reparieren"){
      timelineItem("Auto repariert", -1200, "Einmaliger Schaden.", "#EF4444");
      g.hasCar = true;
      g.variable.mobility = 190;
    } else {
      timelineItem("Umstieg", opt.money, "Fahrrad gekauft, Auto wird nicht genutzt.", "#F97316");
      g.hasCar = false;
      g.variable.mobility = 49; // ticket
      unlockInsuranceHint(g, "Komfort vs Stabilität: weniger Fixkosten kann langfristig sehr entlasten.");
    }
    after?.();
  });
}

function doRandomEvent(g, after){
  // pick one of a few meaningful events; some are just +/- money, some are decisions
  const r = Math.random();

  if(g.hasCar && r < 0.25){
    return doCarBreakdown(g, after);
  }

  // simple events
  const pool = [
    { title:"Waschmaschine kaputt", text:"Reparatur/Ersatz: 350 €.", delta:-350, color:"#EF4444",
      after: () => unlockInsuranceHint(g, "Hausrat kann bei bestimmten Schäden helfen – hängt vom Fall ab.")
    },
    { title:"Nebenjob", text:"+120 € (Umzug helfen).", delta:+120, color:"#22C55E" },
    { title:"Handy-Display", text:"Reparatur: 140 €.", delta:-140, color:"#EF4444",
      after: () => unlockInsuranceHint(g, "Handyversicherung: prüfe Selbstbeteiligung/Ausschlüsse – lohnt nicht automatisch.")
    },
    { title:"Geburtstag", text:"+80 € Geschenk.", delta:+80, color:"#22C55E" },
    { title:"Arztkosten", text:"Zuzahlung: 35 €.", delta:-35, color:"#EF4444" },
  ];
  const ev = pool[Math.floor(Math.random()*pool.length)];

  showEventModal(ev, () => {
    g.balance += ev.delta;
    timelineItem(`Ereignis: ${ev.title}`, ev.delta, ev.text, ev.color);
    ev.after?.();
    after?.();
  });
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
    timelineInfo("Kredit", "Trage einen Betrag > 0 ein, wenn du einen Kredit willst.");
    return;
  }
  if(g.loan.active){
    timelineClear();
    timelineInfo("Kredit", "Du hast schon einen Kredit aktiv (Prototype: 1 gleichzeitig).");
    return;
  }

  const apr = cfg.apr;
  const rate = calcMonthlyRate(amount, months, apr);

  g.loan = { active:true, principal:amount, monthsLeft:months, rate, apr, type:loanType };
  g.balance += amount;

  timelineClear();
  timelineItem("Kredit ausgezahlt", +amount, `${cfg.label}-Kredit • Zins fest: ${apr}% p.a.`, "#F97316");
  timelineItem("Monatsrate", -Math.round(rate), `Laufzeit ${months} Monate.`, "#F97316");
  renderGame();

  award(g, "loan_taken", "Kredit", "Du hast einen Kredit aufgenommen. Beobachte die monatliche Belastung.");
}

// ---------- month loop ----------
function runMonth(){
  const g = state.game;
  if(g.hasRunThisMonth) return;

  timelineClear();

  const runCore = () => {
    // 1) income
    g.balance += g.income;
    timelineItem("Einkommen (Netto)", g.income, "Vereinfacht.", "#22C55E");

    // 2) costs (fixed + variable; BAB reduces costs)
    const fixedSum = computeFixedSum(g);
    g.balance -= fixedSum;

    const f = g.fixed, v = g.variable;
    timelineItem("Kosten (Summe)", -fixedSum, "Fixkosten + deine Lifestyle-Budgets (BAB reduziert).", "#111827");

    timelineItem("– Miete", -f.rent, "Wohnen.", "#111827");
    timelineItem("– Nebenkosten", -f.utilities, "Strom/Wasser/Heizung.", "#111827");
    timelineItem("– Essen/Trinken", -v.food, "Aus dem Interview.", "#111827");
    timelineItem("– Freizeit/Feiern", -v.fun, "Aus dem Interview.", "#111827");
    timelineItem("– Shopping/Kleidung", -v.shop, "Aus dem Interview.", "#111827");
    timelineItem("– Abos", -v.subs, "Streaming/Apps.", "#111827");
    timelineItem("– Mobilität", -v.mobility, g.hasCar ? "Auto-Basis." : "Ticket/Fahrrad.", "#111827");
    timelineItem("– Internet", -f.internet, "WLAN/Vertrag.", "#111827");
    timelineItem("– Handy", -f.phone, "Tarif.", "#111827");
    if(f.family>0) timelineItem("– Familie", -f.family, "Mehr Personen = mehr Kosten.", "#111827");
    if(g.bab.active) timelineItem("– BAB Zuschuss", +g.bab.amount, "Reduziert effektiv deine Kosten (vereinfacht).", "#22C55E");

    // 3) insurance
    const insSum = insuranceSum(g);
    if(insSum > 0){
      g.balance -= insSum;
      timelineItem("Versicherungen", -insSum, "Monatliche Kosten. Schutz gegen Risiken.", "#06B6D4");
      // tiny comfort bump (feels safe)
      g.comfort = clamp(g.comfort + 1, 0, 100);
    } else {
      timelineInfo("Versicherungen", "Keine aktiv. Spart Geld – Risiko bleibt bei dir.");
    }

    // 4) loan
    const loanPay = g.loan.active ? Math.round(g.loan.rate) : 0;
    if(loanPay > 0){
      g.balance -= loanPay;
      g.loan.monthsLeft -= 1;
      timelineItem("Kreditrate", -loanPay, `Noch ${g.loan.monthsLeft} Monate.`, "#F97316");
      if(g.loan.monthsLeft <= 0){
        g.loan.active = false;
        timelineInfo("Kredit beendet", "Du hast abbezahlt.");
        award(g, "loan_done", "Abbezahlt", "Kredit komplett abbezahlt.");
      }
    }

    // 5) quarterly
    for(const c of quarterlyCosts(g.month)){
      g.balance += c.amount;
      timelineItem(c.label, c.amount, c.why, "#111827");
    }

    // 6) saving plan
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
      timelineItem("Sparen/Invest", -totalPlanPaid, "Notgroschen/ETF/Ziele.", "#7C3AED");
      // saving often reduces comfort/social a tiny bit
      g.comfort = clamp(g.comfort - 1, 0, 100);
    } else {
      timelineInfo("Sparen/Invest", "Nichts übrig. Das passiert bei hohen Kosten.");
      g.stability = clamp(g.stability - 2, 0, 100);
    }

    if(payCash > 0){ g.buckets.cash += payCash; timelineItem("– Notgroschen", -payCash, "Puffer für Notfälle.", "#22C55E"); }
    if(payEtf > 0){ g.buckets.etf += payEtf; timelineItem("– ETF Kauf", -payEtf, "Du kaufst ETF-Anteile.", "#06B6D4"); }

    if(g.buckets.cash >= 200) award(g, "cash_200", "Rücklagen", "Erste Rücklagen aufgebaut.");
    if(g.buckets.etf >= 200) award(g, "etf_200", "Depot gestartet", "Dein ETF-Depot ist live.");

    // 7) monthly choice
    const choice = CHOICES[(g.month - 1) % CHOICES.length];
    showChoiceModal(choice, (opt) => {
      g.balance += opt.money;
      g.stability = clamp(g.stability + opt.stability, 0, 100);
      g.comfort = clamp(g.comfort + opt.comfort, 0, 100);
      g.social = clamp(g.social + opt.social, 0, 100);

      timelineItem(
        "Entscheidung",
        opt.money,
        `Stabil ${opt.stability>=0?'+':''}${opt.stability} • Komfort ${opt.comfort>=0?'+':''}${opt.comfort} • Soziales ${opt.social>=0?'+':''}${opt.social}`,
        "#7C3AED"
      );

      // 8) event (some are decisions)
      doRandomEvent(g, () => {

        // 9) ETF movement
        const mv = applyEtfMovement(g);
        timelineItem(
          "ETF Marktbewegung",
          mv.change,
          `Monatsrendite: ${mv.pct >= 0 ? "+" : ""}${mv.pct}% (Volatilität ist normal).`,
          "#06B6D4"
        );

        // red month check
        if(g.balance < 0){
          g.redMonths += 1;
          g.social = clamp(g.social - 2, 0, 100);   // Stress → weniger Bock auf Social
          g.comfort = clamp(g.comfort - 1, 0, 100);
        }

        // keep some drift toward "mid" so it doesn't hit 0 too fast
        g.social = clamp(g.social + (g.variable.fun >= 120 ? 1 : 0), 0, 100);

        // update history
        g.historyBalance.push(g.balance);
        g.historyEtf.push(g.buckets.etf);

        g.hasRunThisMonth = true;

        if(g.redMonths === 0 && g.month >= 3) award(g, "no_red_3", "Stabil", "3 Monate nicht im Minus.");
        if(g.buckets.cash >= g.questTarget) award(g, "cash_1000", "Notgroschen!", "Ziel erreicht: 1.000 €.");

        renderGame();

        if(g.month >= 12){
          endGame();
        }
      });
    });
  };

  // Month 1 specials before core loop
  const specials = () => {
    if(g.month === 1 && g.babChoicePending){
      return doBABDecision(g, () => specials());
    }
    if(g.month === 1 && g.moveOutChoicePending){
      return doMoveOutFurnishing(g, () => specials());
    }
    runCore();
  };

  specials();
}

function endGame(){
  const g = state.game;
  timelineInfo("Abschluss", "12 Monate sind rum. Ergebnis:");
  const wealth = g.balance + g.buckets.cash + g.buckets.etf + g.buckets.subs.reduce((s,b)=>s+b.balance,0);
  timelineItem("Gesamtvermögen", wealth, "Kontostand + Notgroschen + ETF + Ziele.", "#22C55E");
  timelineItem("Rote Monate", -g.redMonths, g.redMonths === 0 ? "✅ kein Minus" : "⚠ mindestens einmal Minus", "#111827");
  timelineItem("Komfort", 0, `Endwert: ${g.comfort}/100`, "#F97316");
  timelineItem("Soziales", 0, `Endwert: ${g.social}/100`, "#06B6D4");
  toast("🎉 Ende", "Wenn du willst: als nächstes PDF-Export + Auswertungs-Screen.");
  el("btnRunMonth").disabled = true;
  el("btnNextMonth").disabled = true;
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

// ---------- screens ----------
function showScreen(which){
  const a = el("screenInterview");
  const b = el("screenGame");
  if(which === "interview"){
    a.classList.remove("hidden");
    b.classList.add("hidden");
    el("hudStep").textContent = "Interview";
  } else {
    a.classList.add("hidden");
    b.classList.remove("hidden");
    el("hudStep").textContent = "Spiel";
  }
}

// ---------- interview refresh ----------
let typingController = null;
async function typeText(node, text){
  if (typingController) typingController.abort();
  typingController = new AbortController();
  const signal = typingController.signal;
  node.textContent = "";
  for(let i=0;i<text.length;i++){
    if(signal.aborted) return;
    node.textContent += text[i];
    await new Promise(r => setTimeout(r, 8));
  }
}

function refreshInterview(){
  state.profile = getProfile();
  drawAvatar(state.profile, state.salt);
  typeText(el("storyText"), buildStory(state.profile));
}

// ---------- init ----------
function init(){
  // glossary
  el("btnGlossaryTop").addEventListener("click", openGlossary);
  el("btnCloseGlossary").addEventListener("click", closeGlossary);
  el("glossaryDrawer").addEventListener("click", (e) => {
    if(e.target.id === "glossaryDrawer") closeGlossary();
  });

  // reset top
  el("btnResetTop").addEventListener("click", () => {
    state.game = null;
    showScreen("interview");
    el("path").value = "ausbildung";
    el("field").value = "buero";
    el("living").value = "miete";
    el("family").value = "single";
    el("style").value = "neutral";
    el("lifeFood").value = "normal";
    el("lifeFun").value = "mid";
    el("lifeShop").value = "mid";
    el("lifeSubs").value = "few";
    el("lifeMobility").value = "ticket";
    state.salt = 0;
    refreshInterview();
    toast("Reset", "Zurück zum Interview.");
  });

  // interview changes
  ["path","field","living","family","style","lifeFood","lifeFun","lifeShop","lifeSubs","lifeMobility"].forEach(id => {
    el(id).addEventListener("change", refreshInterview);
  });

  el("regen").addEventListener("click", () => {
    state.salt++;
    drawAvatar(getProfile(), state.salt);
  });

  el("reset").addEventListener("click", () => {
    state.salt = 0;
    el("path").value = "ausbildung";
    el("field").value = "buero";
    el("living").value = "miete";
    el("family").value = "single";
    el("style").value = "neutral";
    el("lifeFood").value = "normal";
    el("lifeFun").value = "mid";
    el("lifeShop").value = "mid";
    el("lifeSubs").value = "few";
    el("lifeMobility").value = "ticket";
    refreshInterview();
  });

  el("start").addEventListener("click", () => {
    state.profile = getProfile();
    state.game = newGame(state.profile);
    showScreen("game");
    timelineClear();
    timelineInfo("Start", "Budgets kommen aus deinem Interview. Monat 1 hat ggf. Auszug/BAB-Entscheidungen.");
    renderGame();
  });

  // game actions
  el("btnApplyPlan").addEventListener("click", applyPlan);
  el("btnAddBucket").addEventListener("click", addBucket);
  el("btnTakeLoan").addEventListener("click", takeLoan);
  el("btnRunMonth").addEventListener("click", runMonth);
  el("btnNextMonth").addEventListener("click", nextMonth);

  refreshInterview();
}

document.addEventListener("DOMContentLoaded", init);
