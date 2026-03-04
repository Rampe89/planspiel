/* MoneyQuest – B (playful) + weniger langweilig
   NEW:
   - HUD + Stabilität (0..100)
   - Notgroschen-Quest Progressbar
   - Jeden Monat 1 Choice Card (2 Optionen) -> echte Entscheidung
   - Achievements (Toasts)
   - Timeline statt „Logbox“
   - Fixkosten + Erklärungen bleiben drin
*/

const el = (id) => document.getElementById(id);

// ------------------ Helpers ------------------
function formatEUR(n){
  const v = Math.round(n);
  const s = v.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${s} €`;
}
function clamp(n, a, b){ return Math.max(a, Math.min(b, n)); }
function uid(){ return Math.random().toString(16).slice(2,10); }

// ------------------ Glossary ------------------
const GLOSSARY = [
  { title:"Fixkosten", text:"Kosten, die jeden Monat (fast) gleich sind (Miete, Internet, Handy…)", small:"Fixkosten laufen auch dann, wenn du nichts kaufst."},
  { title:"Variable Kosten", text:"Kosten, die schwanken (Freizeit, Snacks, Reparaturen…)", small:"Variabel = mehr Kontrolle, aber auch mehr Risiko."},
  { title:"Notgroschen", text:"Geld nur für Notfälle (Waschmaschine, Fahrrad, Arztkosten).", small:"Erst Notgroschen, dann Luxus."},
  { title:"ETF", text:"Ein ETF ist ein Korb aus vielen Aktien. Du kaufst Anteile. Der Wert schwankt.", small:"Kurzfristig wackelig, langfristig oft sinnvoll."},
  { title:"Zinsen", text:"Beim Kredit zahlst du extra Geld für geliehenes Geld.", small:"Kredit-Zinsen sind meistens höher als Spar-Zinsen."},
  { title:"Rate", text:"Betrag, der monatlich für einen Kredit fällig wird (inkl. Zinsen).", small:"Viele kleine Raten = Dauerbelastung."},
  { title:"Stabilität", text:"Spielwert 0–100: wie gut du finanziell aufgestellt bist.", small:"Steigt mit Notgroschen & Planung, sinkt bei Minus & Risiken."},
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

// ------------------ Toast / Achievements ------------------
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

// ------------------ Interview/Profile ------------------
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
  return `Du bist ${pathText} ${fieldText} und wohnst ${livingText}. ${familyText} Ziel: Notgroschen aufbauen & nicht ins Minus rutschen.`;
}

// ------------------ Typewriter (mit Abbruch) ------------------
let typingController = null;
async function typeText(node, text){
  if (typingController) typingController.abort();
  typingController = new AbortController();
  const signal = typingController.signal;

  node.textContent = "";
  const speed = 9;

  for(let i=0;i<text.length;i++){
    if(signal.aborted) return;
    node.textContent += text[i];
    await new Promise(r => setTimeout(r, speed));
  }
}

// ------------------ Avatar (pixel) ------------------
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
  let hair = pick(rng, hairColors);
  let shirt = pick(rng, shirtColors);
  let pants = pick(rng, pantsColors);

  if(profile.field === "it") shirt = "#06B6D4";
  if(profile.field === "pflege") shirt = "#22C55E";
  if(profile.field === "handwerk") shirt = "#F97316";
  if(profile.field === "buero") shirt = "#7C3AED";

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

  if(hairStyle === "short"){
    rect(5,2,6,2,hair); px(5,4,hair); px(10,4,hair);
  } else if(hairStyle === "long"){
    rect(5,2,6,2,hair); rect(4,4,1,4,hair); rect(11,4,1,4,hair); rect(5,4,6,1,hair);
  } else if(hairStyle === "cap"){
    rect(5,2,6,2,"#111827"); rect(4,3,8,1,"#111827");
  } else {
    rect(5,2,6,2,hair); px(4,3,hair); px(11,3,hair); px(6,4,hair); px(9,4,hair);
  }

  rect(5,9,6,4,shirt);
  rect(4,10,1,2,skin); rect(11,10,1,2,skin);
  rect(5,13,6,3,pants);
  px(6,15,"#0B1220"); px(9,15,"#0B1220");
}

// ------------------ Economy ------------------
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

// ------------------ Insurance ------------------
const INSURANCE = [
  { id:"haftpflicht", name:"Haftpflicht", price:6, tier:"good",
    short:"Sinnvoll",
    desc:"Zahlt, wenn du aus Versehen fremde Sachen kaputt machst."
  },
  { id:"hausrat", name:"Hausrat", price:12, tier:"ok",
    short:"Optional",
    desc:"Schützt Dinge in der Wohnung (Einbruch/Brand). In WG oft weniger wichtig."
  },
  { id:"handy", name:"Handyversicherung", price:15, tier:"meh",
    short:"Oft überflüssig",
    desc:"Klingt gut, ist aber oft teuer und hat Ausschlüsse/Selbstbeteiligung."
  },
  { id:"rechtsschutz", name:"Rechtsschutz", price:18, tier:"ok",
    short:"Optional",
    desc:"Kann helfen, wenn es rechtlich knallt. Für Startphase oft nicht nötig."
  },
];

function insuranceSum(g){
  let sum = 0;
  for(const ins of INSURANCE){
    if(g.insurance[ins.id]) sum += ins.price;
  }
  return sum;
}

function renderInsuranceList(g){
  const root = el("insuranceList");
  root.innerHTML = "";
  for(const ins of INSURANCE){
    const on = !!g.insurance[ins.id];
    const badgeClass = ins.tier === "good" ? "good" : (ins.tier === "ok" ? "ok" : "meh");
    const div = document.createElement("div");
    div.className = "insItem";
    div.innerHTML = `
      <div class="insTop">
        <div class="insName">${ins.name}</div>
        <div class="insPrice">${formatEUR(ins.price)}/Monat</div>
      </div>
      <div class="badge ${badgeClass}">${ins.short}</div>
      <div class="insDesc">${ins.desc}</div>
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
      timelineInfo("Versicherung geändert", "Aktive Versicherungen erhöhen Fixkosten – können dich aber vor großen Schäden schützen.");
      renderGame();
    });
  });
}

// ------------------ Loan ------------------
function calcMonthlyRate(amount, months, apr){
  if(amount <= 0) return 0;
  const r = (apr/100) / 12;
  if(r === 0) return amount / months;
  const rate = amount * (r * Math.pow(1+r, months)) / (Math.pow(1+r, months)-1);
  return rate;
}

// ------------------ Events ------------------
const EVENT_DECK = [
  { title:"Waschmaschine kaputt", text:"Klassischer Notfall. Reparatur/Ersatz: 350 €.", delta:-350 },
  { title:"Fahrrad geklaut", text:"Ohne Rücklagen nervig: 180 €.", delta:-180 },
  { title:"Nebenjob", text:"Du hilfst beim Umzug: +120 €.", delta:+120 },
  { title:"Handy-Display", text:"Reparatur: 140 €.", delta:-140 },
  { title:"Geburtstag", text:"+80 € Geschenk.", delta:+80 },
  { title:"Arztkosten", text:"Zuzahlung/Medikamente: 35 €.", delta:-35 },
];

function quarterlyCosts(month){
  if(month % 3 !== 0) return [];
  return [
    { label:"GEZ (Quartal)", amount: -55, why:"Viele Haushalte zahlen quartalsweise." },
    { label:"Periodische Kosten", amount: -120, why:"Stellvertretend für Kosten, die nicht monatlich kommen." },
  ];
}

function showEventModal(ev, onClose){
  el("eventTitle").textContent = ev.title;
  el("eventText").textContent = `${ev.text} (${ev.delta >= 0 ? "+" : ""}${formatEUR(ev.delta).replace(" €","")} €)`;
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

// ------------------ Choice Cards (jeden Monat) ------------------
const CHOICES = [
  {
    title: "Essen & Trinken",
    text: "Du merkst: Am Ende des Monats wird Essen teuer. Was machst du?",
    a: { label:"Meal Prep", meta:"Du kochst 2× vor. Spart Geld, kostet Zeit.", money:+80, stability:+6 },
    b: { label:"Lieferando", meta:"Bequem, aber teuer.", money:-80, stability:-4 },
  },
  {
    title: "Transport",
    text: "Du brauchst Mobilität. Entscheidung?",
    a: { label:"Monatsticket", meta:"Planbar, sicher.", money:-49, stability:+4 },
    b: { label:"Risiko", meta:"Du sparst, aber 15% Chance auf Strafe (60€).", money:+49, stability:-3, risk:{p:0.15, hit:-60} },
  },
  {
    title: "Handy",
    text: "Dein Handy macht Ärger. Was ist dein Move?",
    a: { label:"Reparieren", meta:"Einmal zahlen, dann Ruhe.", money:-140, stability:+3 },
    b: { label:"Ratenkauf", meta:"12× 14€ (klein, aber dauerhaft).", money:0, stability:-2, recurring:{months:12, amount:-14, label:"Handy-Rate"} },
  },
  {
    title: "Freizeit",
    text: "Du willst raus. Was machst du?",
    a: { label:"Budget-Plan", meta:"Günstig, aber okay.", money:+40, stability:+5 },
    b: { label:"All-in", meta:"Macht Spaß, kostet aber.", money:-60, stability:-3 },
  },
];

function showChoiceModal(choice, onPick){
  el("choiceTitle").textContent = `Entscheidung: ${choice.title}`;
  el("choiceText").textContent = choice.text;

  const wrap = el("choiceActions");
  wrap.innerHTML = "";

  const mk = (optKey, opt) => {
    const btn = document.createElement("button");
    btn.className = "choiceBtn";
    btn.type = "button";
    const impactPills = [];

    if(opt.money !== 0){
      impactPills.push(`<span class="pill ${opt.money>=0?'good':'bad'}">${opt.money>=0?'+':''}${formatEUR(opt.money).replace(' €','')}€</span>`);
    } else {
      impactPills.push(`<span class="pill neu">0€</span>`);
    }
    if(opt.stability){
      impactPills.push(`<span class="pill ${opt.stability>=0?'good':'bad'}">${opt.stability>=0?'+':''}${opt.stability} Stabilität</span>`);
    }
    if(opt.risk){
      impactPills.push(`<span class="pill neu">${Math.round(opt.risk.p*100)}% Risiko</span>`);
    }
    if(opt.recurring){
      impactPills.push(`<span class="pill neu">Rate ${Math.abs(opt.recurring.amount)}€/Monat</span>`);
    }

    btn.innerHTML = `
      <div class="choiceTitle">${opt.label}</div>
      <div class="choiceMeta">${opt.meta}</div>
      <div class="choiceImpact">${impactPills.join("")}</div>
    `;
    btn.addEventListener("click", () => {
      el("choiceModal").classList.add("hidden");
      onPick(optKey, opt);
    });
    return btn;
  };

  wrap.appendChild(mk("a", choice.a));
  wrap.appendChild(mk("b", choice.b));

  el("choiceModal").classList.remove("hidden");
}

// ------------------ Timeline UI ------------------
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

// ------------------ Game State ------------------
const state = { salt:0, profile:null, game:null };

function newGame(profile){
  const income = JOB_NET[profile.field]?.[profile.path] ?? 1700;
  const living = LIVING[profile.living] ?? LIVING.wg;

  return {
    month: 1,
    balance: 350,
    income,

    fixed: {
      rent: living.rent,
      utilities: living.utilities,
      food: 290,
      household: 60,
      phone: 20,
      internet: living.internet,
      transport: (profile.living === "wg" ? 49 : 69),
      clothing: 35,
      family: familyCosts(profile.family),
    },

    insurance: { haftpflicht:true, hausrat:false, handy:false, rechtsschutz:false },

    loan: { active:false, principal:0, monthsLeft:0, rate:0, apr:0 },

    recurring: [], // from choices (e.g. phone installments)

    buckets: {
      cash: 0,
      etf: 0,
      subs: [
        { id:"b1", name:"Urlaub", balance:0, plan:50 },
        { id:"b2", name:"Auto", balance:0, plan:50 },
      ],
    },
    plan: { cash:100, etf:100 },

    hasRunThisMonth:false,
    redMonths:0,

    stability: 55, // start
    achievements: new Set(),

    questTarget: 1000,
  };
}

function computeFixedSum(g){
  const f = g.fixed;
  return (
    f.rent + f.utilities + f.food + f.household + f.phone + f.internet +
    f.transport + f.clothing + f.family
  );
}

function computeLoanMonthly(g){
  return g.loan.active ? Math.round(g.loan.rate) : 0;
}

function recurringSum(g){
  return g.recurring.reduce((s,r)=> s + (r.amount || 0), 0);
}

// Stability model: simple & readable
function recomputeStability(g){
  // Base from cash buffer & negative months
  let s = 40;

  // Notgroschen helps a lot
  s += Math.min(30, Math.floor(g.buckets.cash / 50)); // up to +30

  // If balance is negative: hard penalty
  if(g.balance < 0) s -= 18;

  // Red months penalty
  s -= g.redMonths * 6;

  // Having ETF slightly helps (diversification), but too early no huge
  if(g.buckets.etf >= 200) s += 6;
  if(g.buckets.etf >= 1000) s += 8;

  // Loan active adds stress
  if(g.loan.active) s -= 8;

  // Recurring burdens add stress
  if(g.recurring.length > 0) s -= 5;

  // Insurance: Haftpflicht on slightly improves stability
  if(g.insurance.haftpflicht) s += 3;

  // Clamp and store
  g.stability = clamp(s, 0, 100);
}

function renderQuest(g){
  const pct = clamp((g.buckets.cash / g.questTarget) * 100, 0, 100);
  el("gQuestText").textContent = `Baue Notgroschen auf: ${formatEUR(g.buckets.cash)} / ${formatEUR(g.questTarget)} (${Math.round(pct)}%)`;
  el("gQuestFill").style.width = `${pct}%`;
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

  el("gBalanceHint").textContent = g.balance < 0 ? "⚠ im Minus" : "✅ ok";

  el("inpCash").value = g.plan.cash;
  el("inpEtf").value = g.plan.etf;

  el("btnRunMonth").disabled = g.hasRunThisMonth;
  el("btnNextMonth").disabled = !g.hasRunThisMonth;

  el("loanStatus").textContent = g.loan.active
    ? `Aktiv: Rate ${formatEUR(g.loan.rate)}/Monat, noch ${g.loan.monthsLeft} Monate`
    : "kein Kredit";

  renderBuckets(g);
  renderInsuranceList(g);
  renderQuest(g);

  el("goalNote").innerHTML =
    `Ziel: <strong>Notgroschen ≥ ${formatEUR(g.questTarget)}</strong>. Rote Monate: <strong>${g.redMonths}</strong>. ` +
    `Stabilität: <strong>${g.stability}/100</strong>.`;
}

// ------------------ Buckets ------------------
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
      timelineInfo("Unterkonto-Plan geändert", "Unterkonten sind Spar-Töpfe für Ziele. Du legst einen Monatsbetrag fest.");
    });
  });

  root.querySelectorAll('button[data-del]').forEach(btn => {
    btn.addEventListener("click", (e) => {
      const id = e.target.getAttribute("data-del");
      g.buckets.subs = g.buckets.subs.filter(x => x.id !== id);
      renderBuckets(g);
      timelineClear();
      timelineInfo("Unterkonto gelöscht", "Das ist nur ein Ziel-Topf. (Im echten Leben: getrennte Konten helfen psychologisch.)");
      renderGame();
    });
  });
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
  timelineInfo("Unterkonto angelegt", "Neuer Spar-Topf. Stell daneben einen Monatsbetrag ein.");
}

// ------------------ Plan / Loan ------------------
function applyPlan(){
  const g = state.game;
  g.plan.cash = Math.max(0, Number(el("inpCash").value || 0));
  g.plan.etf  = Math.max(0, Number(el("inpEtf").value || 0));
  timelineClear();
  timelineInfo("Plan gespeichert", "Wenn nach Fixkosten zu wenig übrig ist, wird der Plan automatisch gekürzt.");
  renderGame();
}

function takeLoan(){
  const g = state.game;
  const amount = Math.max(0, Number(el("loanAmount").value || 0));
  const months = clamp(Number(el("loanMonths").value || 12), 6, 60);
  const apr    = clamp(Number(el("loanApr").value || 8), 0, 25);

  if(amount <= 0){
    timelineClear();
    timelineInfo("Kredit", "Trage einen Betrag > 0 ein, wenn du wirklich einen Kredit aufnehmen willst.");
    return;
  }
  if(g.loan.active){
    timelineClear();
    timelineInfo("Kredit", "Du hast schon einen Kredit aktiv (Prototype: nur 1 gleichzeitig).");
    return;
  }

  const rate = calcMonthlyRate(amount, months, apr);
  g.loan = { active:true, principal:amount, monthsLeft:months, rate:rate, apr };
  g.balance += amount;

  timelineClear();
  timelineItem("Kredit ausgezahlt", +amount, "Sofort mehr Geld – ab jetzt monatlich Rate + Zinsen.", "#F97316");
  timelineItem("Monatsrate", -Math.round(rate), `Laufzeit ${months} Monate, Zins ${apr}% p.a.`, "#F97316");
  renderGame();

  award(g, "loan_taken", "Kredit", "Du hast einen Kredit aufgenommen. Beobachte die monatliche Belastung.");
}

// ------------------ Choice apply ------------------
function applyChoice(g, opt){
  // base effect
  g.balance += opt.money;
  g.stability = clamp(g.stability + (opt.stability || 0), 0, 100);

  timelineItem("Entscheidung", opt.money, `Stabilität ${opt.stability>=0?'+':''}${opt.stability} (kurzfristig).`, "#7C3AED");

  // risk handling
  if(opt.risk){
    const hit = Math.random() < opt.risk.p;
    if(hit){
      g.balance += opt.risk.hit;
      timelineItem("Risiko trifft dich", opt.risk.hit, "Manchmal ist „billig“ am Ende teurer.", "#EF4444");
      g.redMonths += (g.balance < 0) ? 1 : 0;
    } else {
      timelineInfo("Risiko ging gut", "Dieses Mal keine Strafe. (Aber Risiko bleibt Risiko.)");
    }
  }

  // recurring add
  if(opt.recurring){
    g.recurring.push({
      id: uid(),
      label: opt.recurring.label,
      amount: opt.recurring.amount, // negative
      monthsLeft: opt.recurring.months,
    });
    timelineItem("Neue Rate", opt.recurring.amount, `Dauer: ${opt.recurring.months} Monate. Kleine Raten nerven langfristig.`, "#F97316");
  }
}

// ------------------ Month loop ------------------
function runMonth(){
  const g = state.game;
  if(g.hasRunThisMonth) return;

  timelineClear();

  // 1) Income
  g.balance += g.income;
  timelineItem("Einkommen (Netto)", g.income, "Geld nach Steuern/Abgaben (vereinfacht).", "#22C55E");

  // 2) Fix costs
  const fixedSum = computeFixedSum(g);
  g.balance -= fixedSum;
  timelineItem("Fixkosten (Summe)", -fixedSum, "Miete, Nebenkosten, Essen, Internet, Handy, Transport …", "#111827");

  // quick breakdown (but not too long – game feel)
  const f = g.fixed;
  timelineItem("– Miete", -f.rent, "Wohnkosten.", "#111827");
  timelineItem("– Nebenkosten", -f.utilities, "Strom/Wasser/Heizung (vereinfacht).", "#111827");
  timelineItem("– Essen & Trinken", -f.food, "Supermarkt/Mensa/Lebensmittel.", "#111827");

  // 3) Insurance
  const insSum = insuranceSum(g);
  if(insSum > 0){
    g.balance -= insSum;
    timelineItem("Versicherungen", -insSum, "Schutz gegen große Schäden – kostet monatlich.", "#06B6D4");
  } else {
    timelineInfo("Versicherungen", "Keine aktiv. Spart Geld – kann später teuer werden.");
  }

  // 4) Loan
  const loanPay = computeLoanMonthly(g);
  if(loanPay > 0){
    g.balance -= loanPay;
    g.loan.monthsLeft -= 1;
    timelineItem("Kreditrate", -loanPay, `Noch ${g.loan.monthsLeft} Monate.`, "#F97316");
    if(g.loan.monthsLeft <= 0){
      g.loan.active = false;
      timelineInfo("Kredit beendet", "Du hast abbezahlt. Nice.");
      award(g, "loan_done", "Abbezahlt", "Du hast einen Kredit komplett abbezahlt.");
    }
  }

  // 5) Recurring from choices (installments)
  if(g.recurring.length > 0){
    let sum = 0;
    for(const r of g.recurring){
      if(r.monthsLeft > 0){
        g.balance += r.amount;
        sum += r.amount;
        r.monthsLeft -= 1;
      }
    }
    g.recurring = g.recurring.filter(r => r.monthsLeft > 0);
    if(sum !== 0){
      timelineItem("Raten/Abos", sum, "Kleine Beträge, die jeden Monat nerven.", "#F97316");
    }
  }

  // 6) Quarterly costs
  const q = quarterlyCosts(g.month);
  for(const c of q){
    g.balance += c.amount;
    timelineItem(c.label, c.amount, c.why, "#111827");
  }

  // 7) Apply saving plan (only from positive balance)
  const wantSub = g.buckets.subs.reduce((s,b)=> s + (b.plan||0), 0);
  const want = g.plan.cash + g.plan.etf + wantSub;

  const canSpend = Math.max(0, g.balance);
  const factor = want > 0 ? Math.min(1, canSpend / want) : 0;

  const payCash = Math.floor(g.plan.cash * factor);
  const payEtf  = Math.floor(g.plan.etf  * factor);

  let paidSubs = 0;
  for(const b of g.buckets.subs){
    const pay = Math.floor((b.plan||0) * factor);
    if(pay > 0){
      b.balance += pay;
      paidSubs += pay;
    }
  }

  const totalPlanPaid = payCash + payEtf + paidSubs;
  if(totalPlanPaid > 0){
    g.balance -= totalPlanPaid;
    timelineItem("Sparen/Invest", -totalPlanPaid, "Du verteilst Geld in Notgroschen, ETF und Ziele.", "#7C3AED");
  } else {
    timelineInfo("Sparen/Invest", "Dieses Mal blieb nichts übrig. Fixkosten sind der Boss-Gegner.");
  }

  if(payCash > 0){
    g.buckets.cash += payCash;
    timelineItem("– Notgroschen", -payCash, "Für Notfälle. Sofort verfügbar.", "#22C55E");
  }
  if(payEtf > 0){
    g.buckets.etf += payEtf;
    timelineItem("– ETF Kauf", -payEtf, "ETF schwankt monatlich.", "#06B6D4");
  }

  // achievements: first savings
  if(g.buckets.cash >= 200) award(g, "cash_200", "Rücklagen!", "Du hast erste Rücklagen aufgebaut.");
  if(g.buckets.etf >= 200) award(g, "etf_200", "Depot gestartet", "Du hast dein erstes ETF-Depot.");

  // 8) Mandatory Choice (fun part)
  const choice = CHOICES[(g.month - 1) % CHOICES.length];
  showChoiceModal(choice, (key, opt) => {
    applyChoice(g, opt);

    // 9) Event
    const ev = drawRandomEvent();
    showEventModal(ev, () => {
      g.balance += ev.delta;
      timelineItem(`Ereignis: ${ev.title}`, ev.delta, "Unerwartete Kosten/Extras passieren ständig.", "#EF4444");

      // 10) ETF monthly movement end
      const rnd = (Math.random() * 4.0 - 1.8) / 100;
      const change = Math.round(g.buckets.etf * rnd);
      g.buckets.etf += change;
      timelineItem("ETF Bewegung", change, "Kurzfristig schwankt es. Langfristig ist die Idee: wachsen.", "#06B6D4");

      // red month
      if(g.balance < 0) g.redMonths += 1;

      // stability recalculated in render
      g.hasRunThisMonth = true;

      // achievements: no negative months streak
      if(g.redMonths === 0 && g.month >= 3) award(g, "no_red_3", "Stabil", "3 Monate nicht im Minus. Stark!");
      if(g.buckets.cash >= 1000) award(g, "cash_1000", "Notgroschen!", "Ziel erreicht: 1.000 € Notgroschen.");

      renderGame();

      // End of game after 12
      if(g.month >= 12){
        endGame();
      }
    });
  });
}

function endGame(){
  const g = state.game;

  timelineInfo("Abschluss", "12 Monate sind rum. Hier ist dein Ergebnis:");
  const wealth = g.balance + g.buckets.cash + g.buckets.etf + g.buckets.subs.reduce((s,b)=>s+b.balance,0);
  timelineItem("Gesamtvermögen", wealth, "Kontostand + Notgroschen + ETF + Ziele (vereinfacht).", "#22C55E");
  timelineItem("Rote Monate", -g.redMonths, g.redMonths === 0 ? "✅ kein Monat im Minus" : "⚠ mindestens einmal im Minus", "#111827");

  const okCash = g.buckets.cash >= g.questTarget;
  if(okCash){
    timelineInfo("Fazit", "Stabil! Notgroschen-Ziel erreicht. Du hast dir Puffer gebaut.");
  } else {
    timelineInfo("Fazit", "Du bist noch nicht stabil genug. Hebel: Fixkosten senken oder Plan kleiner starten (erst Notgroschen).");
  }

  el("btnRunMonth").disabled = true;
  el("btnNextMonth").disabled = true;

  toast("🎉 Ende", "Wenn du willst: als nächstes bauen wir PDF-Export + Scam-Events (Phishing).");
}

function nextMonth(){
  const g = state.game;
  if(!g.hasRunThisMonth) return;
  if(g.month >= 12) return;

  g.month += 1;
  g.hasRunThisMonth = false;

  timelineClear();
  timelineInfo("Neuer Monat", "Bereit? Klick auf „Monat starten“.");
  renderGame();
}

// ------------------ Screens ------------------
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

// ------------------ Interview refresh ------------------
function refreshInterview(){
  state.profile = getProfile();
  drawAvatar(state.profile, state.salt);
  typeText(el("storyText"), buildStory(state.profile));
}

// ------------------ Init ------------------
function init(){
  // Glossary
  el("btnGlossaryTop").addEventListener("click", openGlossary);
  el("btnCloseGlossary").addEventListener("click", closeGlossary);
  el("glossaryDrawer").addEventListener("click", (e) => {
    if(e.target.id === "glossaryDrawer") closeGlossary();
  });

  // Reset top
  el("btnResetTop").addEventListener("click", () => {
    state.game = null;
    showScreen("interview");
    el("path").value = "ausbildung";
    el("field").value = "buero";
    el("living").value = "miete";
    el("family").value = "single";
    el("style").value = "neutral";
    state.salt = 0;
    refreshInterview();
    toast("Reset", "Zurück zum Interview.");
  });

  // Interview changes
  ["path","field","living","family","style"].forEach(id => {
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
    refreshInterview();
  });

  el("start").addEventListener("click", () => {
    state.profile = getProfile();
    state.game = newGame(state.profile);
    showScreen("game");
    timelineClear();
    timelineInfo("Start", "Monat 1: Fixkosten sind sofort sichtbar. Danach kommt deine Entscheidungskarte.");
    renderGame();
  });

  // Game actions
  el("btnApplyPlan").addEventListener("click", applyPlan);
  el("btnAddBucket").addEventListener("click", addBucket);
  el("btnTakeLoan").addEventListener("click", takeLoan);

  el("btnRunMonth").addEventListener("click", runMonth);
  el("btnNextMonth").addEventListener("click", nextMonth);

  refreshInterview();
}

document.addEventListener("DOMContentLoaded", init);
