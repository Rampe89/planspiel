/* MoneyQuest – vNext
   Added:
   - Dispo limit (hard floor) + "Kontosperre" decision if exceeded
   - Goal conflict cards every 2 months (choices)
   - Endscreen modal with profile label + compact feedback
   - Style: less emoji dependency in UI texts
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
  { title:"Fixkosten", text:"Kosten, die regelmäßig anfallen (Miete, Internet, Handy…).", small:"Fixkosten laufen auch dann, wenn du nichts kaufst."},
  { title:"Variable Kosten", text:"Kosten, die du stärker steuern kannst (Freizeit, Snacks, Shopping…).", small:"Variabel = Kontrolle, aber auch Versuchung."},
  { title:"Notgroschen", text:"Geld nur für Notfälle (Reparaturen, Arzt, Ersatzgeräte).", small:"Erst Puffer, dann Luxus."},
  { title:"ETF", text:"ETF = Korb aus vielen Aktien. Du kaufst Anteile, der Wert schwankt.", small:"Kurzfristig kann es runtergehen. Langfristig oft Wachstum – aber nie garantiert."},
  { title:"Zinsen", text:"Kredit kostet extra Geld (Zinsen).", small:"Zinsen machen Kredite langfristig teuer."},
  { title:"Dispo-Limit", text:"Untergrenze für dein Konto. Darunter geht’s nicht ohne Konsequenzen.", small:"Wenn du drüber bist: Zwangsentscheidung (Kredit, verkaufen, Kosten senken…)."},
  { title:"Komfort", text:"Bequemlichkeit im Alltag (Auto, Einrichtung, Abos).", small:"Mehr Komfort kostet oft laufend Geld."},
  { title:"Soziales", text:"Privatleben/Teilhabe (Kino, Freunde, rausgehen).", small:"Zu stark sparen kann Isolation fördern."},
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
  toast(title, text);
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
  return `Du bist ${pathText} ${fieldText} und wohnst ${livingText}. ${familyText} Entscheidungen wirken auf Geld, Komfort und Soziales.`;
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
  const hairColors = ["#1F2937","#111827","#6B4F3A","#A16207","#4F46E5","#0F766E"];
  const shirtColors = ["#4F46E5","#16A34A","#EA580C","#111827","#0EA5E9","#BE185D"];
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

      // Simple UX for now: prompt.
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

      // Log + render
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
    b:{ label:"Skippen", meta:"Sparen, aber du fühlst dich schlechter.", money:+10, stability:-1, comfort:-1, social:-1 },
  },
];

function maybeGoalConflict(g, after){
  // every 2 months AFTER main decision, BEFORE random event
  if(g.month % 2 !== 0) return after?.();
  const idx = (Math.floor((g.month-1)/2)) % GOAL_CONFLICTS.length;
  const card = GOAL_CONFLICTS[idx];
  showChoiceModal(card, (opt) => {
    applyOption(g, opt, "Zielkonflikt");
    after?.();
  });
}

// ---------- apply option helper ----------
function applyOption(g, opt, label="Entscheidung"){
  g.balance += opt.money;
  g.stability = clamp(g.stability + opt.stability, 0, 100);
  g.comfort  = clamp(g.comfort + opt.comfort, 0, 100);
  g.social   = clamp(g.social + opt.social, 0, 100);

  timelineItem(
    label,
    opt.money,
    `Stabil ${opt.stability>=0?'+':''}${opt.stability} • Komfort ${opt.comfort>=0?'+':''}${opt.comfort} • Soziales ${opt.social>=0?'+':''}${opt.social}`,
    "#4F46E5"
  );
}

// ---------- Month 1: furnishing + parent support ----------
function doMoveOutFurnishing(g, after){
  showChoiceModal({
    title: "Auszug & Einrichtung",
    text: "Du ziehst aus. Du brauchst Basics (Bett, Tisch, Küchenkram). Wie startest du?",
    a: { label:"Gebraucht & Basics", meta:"Kleinanzeigen/IKEA Start.", money:-900, stability:+2, comfort:-1, social:0 },
    b: { label:"Neu kaufen", meta:"Bequemer, aber teuer.", money:-2500, stability:-4, comfort:+6, social:0 },
  }, (opt) => {
    applyOption(g, opt, "Einrichtung");
    g.furnished = true;
    g.moveOutChoicePending = false;

    // follow-up: parent support as explicit decision
    showChoiceModal({
      title:"Unterstützung?",
      text:"Du kannst um Hilfe bitten. Es ist okay, aber hat soziale/psychologische Nebenwirkungen.",
      a:{ label:"Eltern fragen", meta:"+1000€ einmalig.", money:+1000, stability:+1, comfort:+1, social:-1 },
      b:{ label:"Selbst regeln", meta:"Keine Hilfe. Risiko steigt, wenn du ins Minus rutschst.", money:0, stability:+1, comfort:0, social:+1 },
    }, (opt2) => {
      g.askedParentsEver = opt2.label.startsWith("Eltern");
      g.refusedParentsEver = opt2.label.startsWith("Selbst");
      applyOption(g, opt2, "Unterstützung");

      after?.();
    });
  });
}

// ---------- Ausbildung: BAB decision ----------
function doBABDecision(g, after){
  showChoiceModal({
    title: "BAB (Ausbildungsbeihilfe)",
    text: "Du bist in Ausbildung. Du könntest einen Zuschuss beantragen (vereinfachtes Modell).",
    a:{ label:"Beantragen", meta:"+250€/Monat (vereinfacht).", money:0, stability:+3, comfort:+1, social:0 },
    b:{ label:"Nicht beantragen", meta:"Kein Zuschuss, weniger Aufwand.", money:0, stability:-1, comfort:0, social:0 }
  }, (opt) => {
    g.stability = clamp(g.stability + opt.stability, 0, 100);
    g.comfort  = clamp(g.comfort + opt.comfort, 0, 100);
    g.social   = clamp(g.social + opt.social, 0, 100);

    if(opt.label.startsWith("Beantragen")){
      g.bab.active = true;
      g.bab.amount = 250;
      timelineInfo("BAB", "Zuschuss aktiv (+250€/Monat als Kosten-Entlastung).");
      unlockInsuranceHint(g, "Staatliche Unterstützung: Antrag stellen kann sich lohnen – aber nicht jeder kennt’s.");
    } else {
      g.bab.active = false;
      g.bab.amount = 0;
      timelineInfo("BAB", "Kein Zuschuss genutzt.");
    }
    g.babChoicePending = false;
    after?.();
  });
}

// ---------- Dispo / floor enforcement ----------
function enforceDispoFloor(g, after){
  if(g.balance >= g.dispoFloor) return after?.();

  // Hard floor triggered -> force decision
  const deficit = g.dispoFloor - g.balance; // positive amount needed to reach floor
  showChoiceModal({
    title:"Kontosperre (Dispo-Limit erreicht)",
    text:`Du bist unter dem Dispo-Limit (${formatEUR(g.dispoFloor)}). Dir fehlen ${formatEUR(deficit)} bis zur Freigabe. Was machst du?`,
    a:{
      label:"Mini-Kredit",
      meta:"Kurzfristig lösen. Langfristig Rate+Zinsen.",
      money:+(deficit + 300), stability:-2, comfort:+1, social:0
    },
    b:{
      label:"Sofortmaßnahmen",
      meta:"Sachen verkaufen / Budgets senken (spürbar).",
      money:+deficit, stability:+2, comfort:-4, social:-3
    }
  }, (opt) => {
    applyOption(g, opt, "Kontosperre");

    if(opt.label === "Mini-Kredit"){
      // auto-create small konsum loan if none active
      if(!g.loan.active){
        const amount = deficit + 300;
        const months = 12;
        const apr = LOAN_TYPES.konsum.apr;
        const rate = calcMonthlyRate(amount, months, apr);
        g.loan = { active:true, principal:amount, monthsLeft:months, rate, apr, type:"konsum" };
        timelineInfo("Kredit", `Automatisch: Konsumkredit ${formatEUR(amount)} • Rate ~${formatEUR(rate)}/Monat.`);
      } else {
        timelineInfo("Kredit", "Du hast schon einen Kredit. (Prototype: nur 1 aktiv) – hier wäre später Umschuldung möglich.");
      }
    } else {
      // apply immediate budget cuts next months to prevent instant relapse
      g.variable.fun = Math.max(20, g.variable.fun - 40);
      g.variable.shop = Math.max(0, g.variable.shop - 20);
      timelineInfo("Sofortmaßnahmen", "Freizeit/Shopping-Budgets wurden für die nächsten Monate reduziert.");
    }

    // clamp to floor (never below after enforcement)
    g.balance = Math.max(g.balance, g.dispoFloor);
    after?.();
  });
}

// ---------- events ----------
function doCarBreakdown(g, after){
  showChoiceModal({
    title: "Ereignis: Auto kaputt",
    text: "Dein Auto streikt. Werkstatt sagt: Reparatur kostet 1.200 €.",
    a:{ label:"Reparieren", meta:"Auto bleibt. Komfort hoch, teuer.", money:-1200, stability:-3, comfort:+2, social:0 },
    b:{ label:"Umsteigen", meta:"Auto weg. Ticket/Fahrrad.", money:-300, stability:+3, comfort:-8, social:-1 },
  }, (opt) => {
    applyOption(g, opt, "Ereignis");

    if(opt.label === "Reparieren"){
      g.hasCar = true;
      g.variable.mobility = 190;
      unlockInsuranceHint(g, "Mobilität: Auto kann Komfort erhöhen – aber Risiken/Einmalkosten sind real.");
    } else {
      g.hasCar = false;
      g.variable.mobility = 49;
      unlockInsuranceHint(g, "Komfort vs Stabilität: weniger Fixkosten kann langfristig entlasten.");
    }

    enforceDispoFloor(g, after);
  });
}

function doRandomEvent(g, after){
  const r = Math.random();

  if(g.hasCar && r < 0.22){
    return doCarBreakdown(g, after);
  }

  const pool = [
    { title:"Waschmaschine kaputt", text:"Reparatur/Ersatz: 350 €.", delta:-350,
      after: () => unlockInsuranceHint(g, "Hausrat kann bei bestimmten Schäden helfen – hängt vom Vertrag ab.")
    },
    { title:"Nebenjob", text:"+120 € (Umzug helfen).", delta:+120 },
    { title:"Handy-Display", text:"Reparatur: 140 €.", delta:-140,
      after: () => unlockInsuranceHint(g, "Handyversicherung: Nicht automatisch sinnvoll. Bedingungen checken.")
    },
    { title:"Geburtstag", text:"+80 € Geschenk.", delta:+80 },
    { title:"Arztkosten", text:"Zuzahlung: 35 €.", delta:-35 },
  ];
  const ev = pool[Math.floor(Math.random()*pool.length)];

  showEventModal({ title: ev.title, text: ev.text }, () => {
    g.balance += ev.delta;
    timelineItem(`Ereignis: ${ev.title}`, ev.delta, ev.text, "#0EA5E9");
    ev.after?.();
    enforceDispoFloor(g, after);
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
  if(g.hasRunThisMonth) return;

  timelineClear();

  const runCore = () => {
    // income
    g.balance += g.income;
    timelineItem("Einkommen (Netto)", g.income, "Vereinfacht.", "#16A34A");

    // costs
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

    // enforce floor BEFORE planning (so you can't invest while frozen)
    enforceDispoFloor(g, () => {
      // savings plan
      const wantSub = g.buckets.subs.reduce((s,b)=> s + (b.plan||0), 0);
      const want = g.plan.cash + g.plan.etf + wantSub;

      // if negative: don't invest
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

      if(g.buckets.cash >= 200) award(g, "cash_200", "Achievement: Rücklagen", "Erste Rücklagen aufgebaut.");
      if(g.buckets.etf >= 200) award(g, "etf_200", "Achievement: Depot", "ETF-Depot gestartet.");

      // monthly choice
      const choice = CHOICES[(g.month - 1) % CHOICES.length];
      showChoiceModal(choice, (opt) => {
        applyOption(g, opt, "Entscheidung");
        enforceDispoFloor(g, () => {
          // goal conflict
          maybeGoalConflict(g, () => {
            // random event
            doRandomEvent(g, () => {
              // ETF movement
              const mv = applyEtfMovement(g);
              timelineItem("ETF Bewegung", mv.change, `Monatsrendite: ${mv.pct >= 0 ? "+" : ""}${mv.pct}%`, "#0EA5E9");

              // red month check (still possible but bounded)
              if(g.balance < 0) {
                g.redMonths += 1;
                g.social = clamp(g.social - 2, 0, 100);
                g.comfort = clamp(g.comfort - 1, 0, 100);
              }

              // gentle drift: if fun budget exists, social recovers slightly
              g.social = clamp(g.social + (g.variable.fun >= 120 ? 1 : 0), 0, 100);

              // history
              g.historyBalance.push(g.balance);
              g.historyEtf.push(g.buckets.etf);

              g.hasRunThisMonth = true;

              if(g.redMonths === 0 && g.month >= 3) award(g, "no_red_3", "Achievement: Stabil", "3 Monate nicht im Minus.");
              if(g.buckets.cash >= g.questTarget) award(g, "cash_1000", "Achievement: Notgroschen", "Ziel erreicht: 1.000 €.");

              renderGame();

              if(g.month >= 12){
                endGame();
              }
            });
          });
        });
      });
    });
  };

  // Month 1 specials before core
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
  // simple scoring
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

  // compact advice (non-spoilery)
  const tips = [];
  if(g.buckets.cash < 500) tips.push("Notgroschen ist dein Airbag: zuerst Puffer, dann Luxus.");
  if(g.redMonths >= 2) tips.push("Minus-Monate sind teuer (Stress + Zwang). Fixkosten/Variabel prüfen.");
  if(g.social < 35) tips.push("Soziales ist auch ein „Budget“. Totalsparen kann isolieren.");
  if(g.comfort < 35) tips.push("Komfort ist nicht „falsch“ – aber oft ein Abo-Problem (laufend).");
  if(g.buckets.etf > 0 && g.historyEtf[g.historyEtf.length-1] < g.buckets.etf) tips.push("ETF schwankt. Kurzfristig normal, langfristig planbar – aber nie garantiert.");
  if(tips.length === 0) tips.push("Solider Lauf: du hast das System verstanden.");

  const html = `
    <div style="margin-top:8px">
      <div style="font-weight:950; font-size:16px; margin-bottom:6px;">Finanzprofil: ${prof.name}</div>
      <div style="color:rgba(15,23,42,.75); margin-bottom:10px; line-height:1.5;">${prof.line}</div>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin:12px 0;">
        <div style="border:1px solid rgba(15,23,42,.10); border-radius:16px; padding:10px; background:rgba(255,255,255,.85)">
          <div style="color:rgba(15,23,42,.65); font-size:12px; font-weight:900;">Gesamtvermögen</div>
          <div style="font-size:18px; font-weight:950;">${formatEUR(wealth)}</div>
        </div>
        <div style="border:1px solid rgba(15,23,42,.10); border-radius:16px; padding:10px; background:rgba(255,255,255,.85)">
          <div style="color:rgba(15,23,42,.65); font-size:12px; font-weight:900;">Minus-Monate</div>
          <div style="font-size:18px; font-weight:950;">${g.redMonths}</div>
        </div>
      </div>

      <div style="border:1px solid rgba(15,23,42,.10); border-radius:16px; padding:10px; background:rgba(255,255,255,.85)">
        <div style="font-weight:950; margin-bottom:6px;">3 Feedback-Sätze</div>
        <ul style="margin:0; padding-left:18px; color:rgba(15,23,42,.80); line-height:1.55;">
          ${tips.slice(0,3).map(t => `<li>${t}</li>`).join("")}
        </ul>
      </div>
    </div>
  `;
  showEndModal(html);

  el("btnRunMonth").disabled = true;
  el("btnNextMonth").disabled = true;

  timelineInfo("Spielende", "Auswertung geöffnet (oben).");
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
    timelineInfo("Start", "Budgets kommen aus dem Interview. Monat 1 hat ggf. Auszug/BAB.");
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
