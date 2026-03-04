/* MoneyQuest – Unterrichtsversion (12 Monate)
   Fokus:
   - Monat 1 zeigt sofort echte Fixkosten (Miete, Nebenkosten, Essen, Internet, Handy, Transport, Haushalt/Kleidung)
   - Kurze Erklärungen im Log + Glossar
   - Unterkonten + Notgroschen + ETF
   - Versicherungen (mit Sinnvoll/Optional/Überflüssig)
   - Kredit (optional) mit Rate/Zinsen
*/

const el = (id) => document.getElementById(id);

// ------------------ Helpers ------------------
function formatEUR(n){
  const v = Math.round(n);
  const s = v.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${s} €`;
}
function clamp(n, a, b){ return Math.max(a, Math.min(b, n)); }

// ------------------ Glossar ------------------
const GLOSSARY = [
  {
    title: "Fixkosten",
    text: "Kosten, die jeden Monat (fast) gleich sind – z. B. Miete, Internet, Handy.",
    small: "Merksatz: Fixkosten laufen auch dann, wenn du nichts kaufst."
  },
  {
    title: "Variable Kosten",
    text: "Kosten, die schwanken – z. B. Freizeit, Kleidung, Snacks, Reparaturen.",
    small: "Merksatz: Variabel = du hast mehr Kontrolle, aber auch mehr Risiko."
  },
  {
    title: "Notgroschen",
    text: "Geld, das du nicht anfasst. Nur für Notfälle (Waschmaschine, Fahrrad, Arztkosten).",
    small: "Ziel: erst Notgroschen, dann Luxus."
  },
  {
    title: "ETF",
    text: "Ein ETF ist ein „Korb“ aus vielen Aktien. Du kaufst Anteile und profitierst (oder verlierst) je nach Markt.",
    small: "Im Spiel schwankt der ETF monatlich. Langfristig oft sinnvoll – kurzfristig unruhig."
  },
  {
    title: "Zinsen",
    text: "Beim Kredit zahlst du extra Geld dafür, dass du Geld leihst. Beim Sparen bekommst du manchmal Zinsen.",
    small: "Kredit-Zinsen sind meistens höher als Spar-Zinsen."
  },
  {
    title: "Rate",
    text: "Der Betrag, den du jeden Monat für den Kredit zurückzahlst (inkl. Zinsen).",
    small: "Viele kleine Raten können dich dauerhaft „festnageln“."
  }
];

function openGlossary(){
  const wrap = el("glossaryDrawer");
  const content = el("glossaryContent");
  content.innerHTML = GLOSSARY.map(g => `
    <div class="gItem">
      <div class="gTitle">${g.title}</div>
      <div class="gText">${g.text}</div>
      <div class="gSmall">${g.small}</div>
    </div>
  `).join("");
  wrap.classList.remove("hidden");
  wrap.setAttribute("aria-hidden", "false");
}
function closeGlossary(){
  const wrap = el("glossaryDrawer");
  wrap.classList.add("hidden");
  wrap.setAttribute("aria-hidden", "true");
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
  return `Du bist ${pathText} ${fieldText} und wohnst ${livingText}. ${familyText} Ziel: stabil bleiben, Notgroschen aufbauen und nicht von Überraschungen zerlegt werden.`;
}

// ------------------ Typewriter (mit Abbruch) ------------------
let typingController = null;
async function typeText(node, text){
  if (typingController) typingController.abort();
  typingController = new AbortController();
  const signal = typingController.signal;

  node.textContent = "";
  const speed = 10;

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
  const shirtColors = ["#2563EB","#16A34A","#F97316","#111827","#DB2777","#7C3AED"];
  const pantsColors = ["#334155","#0F172A","#475569","#1F2937"];

  const skin = pick(rng, skinTones);
  let hair = pick(rng, hairColors);
  let shirt = pick(rng, shirtColors);
  let pants = pick(rng, pantsColors);

  if(profile.field === "it") shirt = "#2563EB";
  if(profile.field === "pflege") shirt = "#16A34A";
  if(profile.field === "handwerk") shirt = "#F97316";

  const hasBackpack = profile.path !== "job";
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
  if(hasBackpack){ rect(4,9,1,4,"#334155"); rect(11,9,1,4,"#334155"); }
}

// ------------------ Economy: Income + Fixed Costs ------------------
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
    desc:"Zahlt, wenn du aus Versehen fremde Sachen kaputt machst (z. B. Handy fallen lassen)."
  },
  { id:"hausrat", name:"Hausrat", price:12, tier:"ok",
    short:"Optional",
    desc:"Schützt dein Eigentum in der Wohnung (Einbruch/Brand). In WG/kleiner Wohnung oft weniger wichtig."
  },
  { id:"handy", name:"Handyversicherung", price:15, tier:"meh",
    short:"Oft überflüssig",
    desc:"Klingt gut, ist aber oft teuer. Viele Schäden sind ausgeschlossen oder es gibt Selbstbeteiligung."
  },
  { id:"rechtsschutz", name:"Rechtsschutz", price:18, tier:"ok",
    short:"Optional",
    desc:"Kann helfen, wenn’s rechtlich knallt. Für viele Schüler/Startphase nicht nötig."
  },
];

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
      clearLog();
      logInfo("Versicherung geändert", "Aktivierte Versicherungen erhöhen deine monatlichen Fixkosten.");
      renderGame();
    });
  });
}

function insuranceSum(g){
  let sum = 0;
  for(const ins of INSURANCE){
    if(g.insurance[ins.id]) sum += ins.price;
  }
  return sum;
}

// ------------------ Loan ------------------
function calcMonthlyRate(amount, months, apr){
  if(amount <= 0) return 0;
  const r = (apr/100) / 12; // monthly interest
  if(r === 0) return amount / months;
  const rate = amount * (r * Math.pow(1+r, months)) / (Math.pow(1+r, months)-1);
  return rate;
}

// ------------------ Events ------------------
const EVENT_DECK = [
  { title:"Waschmaschine kaputt", text:"Klassischer Notfall. Reparatur/Ersatz kostet 350 €.", delta:-350 },
  { title:"Fahrrad geklaut", text:"Ohne Rücklagen nervig. Du verlierst 180 €.", delta:-180 },
  { title:"Nebenjob", text:"Du hilfst beim Umzug. Du bekommst 120 €.", delta:+120 },
  { title:"Handy-Display", text:"Display kaputt. Reparatur: 140 €.", delta:-140 },
  { title:"Geburtstag", text:"Du bekommst 80 € geschenkt.", delta:+80 },
  { title:"Arztkosten", text:"Medikamente/Zuzahlung: 35 €.", delta:-35 },
];

function quarterlyCosts(month){
  if(month % 3 !== 0) return [];
  return [
    { label:"GEZ (Quartal)", amount: -55, why:"Öffentlich-rechtlicher Rundfunk. Viele Haushalte zahlen quartalsweise." },
    { label:"Kfz/Haushalt (Quartal)", amount: -120, why:"Stellvertretend für periodische Kosten, die nicht monatlich kommen." },
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

// ------------------ UI log ------------------
function clearLog(){ el("gLog").innerHTML = ""; }

function logLine(label, amount, sub=null){
  const div = document.createElement("div");
  div.className = "logLine";

  const left = document.createElement("div");
  left.className = "logLeft";
  const main = document.createElement("div");
  main.textContent = label;
  left.appendChild(main);
  if(sub){
    const s = document.createElement("div");
    s.className = "logSub";
    s.textContent = sub;
    left.appendChild(s);
  }

  const right = document.createElement("div");
  right.textContent = (amount >= 0 ? "+" : "") + formatEUR(amount);

  div.appendChild(left);
  div.appendChild(right);
  el("gLog").appendChild(div);
}

function logInfo(title, text){
  logLine(title, 0, text);
}

// ------------------ Game State ------------------
const state = { salt:0, profile:null, game:null };

function newGame(profile){
  const income = JOB_NET[profile.field]?.[profile.path] ?? 1700;
  const living = LIVING[profile.living] ?? LIVING.wg;

  return {
    month: 1,
    balance: 350, // bewusst knapp
    income,
    fixed: {
      rent: living.rent,
      utilities: living.utilities,
      food: 290,         // Essen/Trinken
      household: 60,     // Drogerie/Kleinkram
      phone: 20,
      internet: living.internet,
      transport: (profile.living === "wg" ? 49 : 69),
      clothing: 35,
      family: familyCosts(profile.family),
    },
    insurance: { haftpflicht:true, hausrat:false, handy:false, rechtsschutz:false }, // Start: Haftpflicht an
    loan: { active:false, principal:0, monthsLeft:0, rate:0, apr:0 },

    buckets: {
      cash: 0,
      etf: 0,
      subs: [
        { id: "b1", name:"Urlaub", balance:0, plan:50 },
        { id: "b2", name:"Auto", balance:0, plan:50 },
      ]
    },
    plan: { cash:100, etf:100 },
    hasRunThisMonth:false,
    redMonths:0
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

function setPhase(tag){
  el("phaseTag").textContent = tag;
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
        <button class="btn ghost small" data-del="${b.id}" type="button">✕</button>
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
      clearLog();
      logInfo("Unterkonto-Plan geändert", "Unterkonten sind Spar-Töpfe (z. B. Urlaub). Du legst einen Monatsbetrag fest.");
    });
  });

  root.querySelectorAll('button[data-del]').forEach(btn => {
    btn.addEventListener("click", (e) => {
      const id = e.target.getAttribute("data-del");
      g.buckets.subs = g.buckets.subs.filter(x => x.id !== id);
      renderBuckets(g);
      clearLog();
      logInfo("Unterkonto gelöscht", "Das ist nur ein Spar-Topf. Geld bleibt insgesamt deins (hier im Spiel).");
      renderGame();
    });
  });
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

  el("loanStatus").textContent = g.loan.active
    ? `${formatEUR(g.loan.principal)} offen, Rate ${formatEUR(g.loan.rate)}/Monat, noch ${g.loan.monthsLeft} Monate`
    : "kein Kredit";

  renderBuckets(g);
  renderInsuranceList(g);

  // Ziel-Note dynamisch
  el("goalNote").innerHTML =
    `Ziel (12 Monate): <strong>Notgroschen ≥ 1.000 €</strong> und <strong>möglichst keine roten Monate</strong>. ` +
    `Rote Monate bisher: <strong>${g.redMonths}</strong>.`;
}

// ------------------ Plan speichern ------------------
function applyPlan(){
  const g = state.game;
  g.plan.cash = Math.max(0, Number(el("inpCash").value || 0));
  g.plan.etf  = Math.max(0, Number(el("inpEtf").value || 0));

  clearLog();
  logInfo("Plan gespeichert", "Du entscheidest, wie viel pro Monat in Notgroschen/ETF/Unterkonten fließt. Wenn zu wenig Geld da ist, wird gekürzt.");
  renderGame();
}

// ------------------ Kredit aufnehmen ------------------
function takeLoan(){
  const g = state.game;
  const amount = Math.max(0, Number(el("loanAmount").value || 0));
  const months = clamp(Number(el("loanMonths").value || 12), 6, 60);
  const apr    = clamp(Number(el("loanApr").value || 8), 0, 25);

  if(amount <= 0){
    clearLog();
    logInfo("Kredit", "Trage einen Betrag > 0 ein, wenn du wirklich einen Kredit aufnehmen willst.");
    return;
  }
  if(g.loan.active){
    clearLog();
    logInfo("Kredit", "Du hast schon einen aktiven Kredit. (Im Prototyp: nur 1 gleichzeitig.)");
    return;
  }

  const rate = calcMonthlyRate(amount, months, apr);
  g.loan = { active:true, principal:amount, monthsLeft:months, rate:rate, apr };

  // Betrag sofort aufs Konto
  g.balance += amount;

  clearLog();
  logLine("Kredit ausgezahlt", +amount, "Sofort mehr Geld – aber ab jetzt jeden Monat Rate + Zinsen.");
  logLine("Neue Rate", -Math.round(rate), `Laufzeit ${months} Monate, Zins ${apr}% p.a.`);
  renderGame();
}

// ------------------ Monat ausführen ------------------
function runMonth(){
  const g = state.game;
  if(g.hasRunThisMonth) return;

  clearLog();
  setPhase("läuft");

  // 1) Einkommen
  g.balance += g.income;
  logLine("Einkommen (Netto)", g.income, "Das ist dein Geld nach Steuern/Abgaben (vereinfacht).");

  // 2) Fixkosten
  const fixedSum = computeFixedSum(g);
  g.balance -= fixedSum;
  logLine("Fixkosten (Summe)", -fixedSum, "Fixkosten laufen jeden Monat: Miete, Essen, Nebenkosten, Internet, ...");

  // Fixkosten breakdown (wichtig fürs Verständnis)
  const f = g.fixed;
  logLine("– Miete", -f.rent, "Wohnkosten (WG/Miete/Eigentum).");
  logLine("– Nebenkosten", -f.utilities, "Strom/Wasser/Heizung (vereinfacht).");
  logLine("– Essen & Trinken", -f.food, "Supermarkt, Getränke, Mensa etc.");
  logLine("– Haushalt/Drogerie", -f.household, "Shampoo, Putzzeug, Kleinkram.");
  logLine("– Internet", -f.internet, "WLAN/Vertrag (bei Eltern manchmal 0).");
  logLine("– Handy", -f.phone, "Handyvertrag/Prepaid.");
  logLine("– Transport", -f.transport, "ÖPNV/Monatsticket (vereinfacht).");
  logLine("– Kleidung/sonstiges", -f.clothing, "Kleine variable Ausgaben, hier als Pauschale.");
  if(f.family > 0) logLine("– Familie", -f.family, "Mehr Personen = mehr laufende Kosten.");

  // 3) Versicherungen (monatlich)
  const insSum = insuranceSum(g);
  if(insSum > 0){
    g.balance -= insSum;
    logLine("Versicherungen", -insSum, "Laufende Kosten. Schutz vor großen Schäden.");
  } else {
    logLine("Versicherungen", 0, "Keine aktiv. Spart Geld – aber kann später teuer werden.");
  }

  // 4) Kreditrate (monatlich)
  const loanPay = computeLoanMonthly(g);
  if(loanPay > 0){
    g.balance -= loanPay;
    g.loan.monthsLeft -= 1;
    logLine("Kreditrate", -loanPay, `Rate inkl. Zinsen. Restlaufzeit: ${g.loan.monthsLeft} Monate.`);
    if(g.loan.monthsLeft <= 0){
      g.loan.active = false;
      logInfo("Kredit beendet", "Du hast den Kredit abbezahlt.");
    }
  }

  // 5) Quartalskosten
  const q = quarterlyCosts(g.month);
  for(const c of q){
    g.balance += c.amount;
    logLine(c.label, c.amount, c.why);
  }

  // 6) Spar-/Invest-Plan anwenden (nur solange Geld da ist)
  const wantSub = g.buckets.subs.reduce((s,b)=> s + (b.plan||0), 0);
  const want = g.plan.cash + g.plan.etf + wantSub;

  const canSpend = Math.max(0, g.balance); // wir investieren/sparen nicht aus dem Minus
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
    logLine("Sparen/Invest (Summe)", -totalPlanPaid, "Du verteilst Geld in Notgroschen/ETF/Unterkonten.");
  } else {
    logInfo("Sparen/Invest", "In diesem Monat blieb nichts übrig. Das ist typisch, wenn Fixkosten zu hoch sind.");
  }

  if(payCash > 0){
    g.buckets.cash += payCash;
    logLine("– Notgroschen", -payCash, "Sofort verfügbar für Notfälle.");
  } else {
    logLine("– Notgroschen", 0, "Kein Geld übrig oder Plan = 0.");
  }

  if(payEtf > 0){
    g.buckets.etf += payEtf;
    logLine("– ETF Kauf", -payEtf, "ETF = Korb aus vielen Aktien. Schwankt monatlich.");
  } else {
    logLine("– ETF Kauf", 0, "Kein ETF-Kauf diesen Monat.");
  }

  if(g.buckets.subs.length > 0){
    logInfo("Unterkonten", "Unterkonten sind Spar-Töpfe (Urlaub/Auto/…). Sie helfen, Ziele sichtbar zu machen.");
  }

  // 7) Ereignis (nach Plan)
  const ev = drawRandomEvent();
  showEventModal(ev, () => {
    g.balance += ev.delta;
    logLine(`Ereignis: ${ev.title}`, ev.delta, "Unerwartete Kosten/Extras passieren im echten Leben ständig.");

    // 8) ETF Schwankung am Ende (monatlich)
    // Range: -1.8% .. +2.2%
    const rnd = (Math.random() * 4.0 - 1.8) / 100;
    const change = Math.round(g.buckets.etf * rnd);
    g.buckets.etf += change;
    logLine("ETF Monatsbewegung", change, "Kurzfristig schwankt es. Langfristig ist die Idee: wachsen.");

    // Rot/Schwarz Monat?
    if(g.balance < 0) g.redMonths += 1;

    g.hasRunThisMonth = true;
    setPhase("fertig");
    renderGame();

    // Ende nach 12 Monaten
    if(g.month >= 12){
      showSummary();
    }
  });
}

function showSummary(){
  const g = state.game;

  const wealth = g.balance + g.buckets.cash + g.buckets.etf + g.buckets.subs.reduce((s,b)=>s+b.balance,0);
  const okCash = g.buckets.cash >= 1000;
  const okRed = g.redMonths === 0;

  clearLog();
  setPhase("abschluss");

  logInfo("Abschluss (12 Monate)", "Du bekommst eine kurze Auswertung. (Im nächsten Schritt können wir daraus PDF export machen.)");
  logLine("Gesamtvermögen (vereinfacht)", wealth, "Kontostand + Notgroschen + ETF + Unterkonten");
  logLine("Notgroschen", g.buckets.cash, okCash ? "✅ Ziel erreicht (≥ 1.000 €)" : "⚠ Ziel verfehlt (unter 1.000 €)");
  logLine("Rote Monate", -g.redMonths, okRed ? "✅ keine roten Monate" : "⚠ du warst mindestens einmal im Minus");

  if(okCash && okRed){
    logInfo("Kurzfazit", "Stabil! Du hast Rücklagen aufgebaut und bist nicht ins Minus gerutscht.");
  } else {
    logInfo("Kurzfazit", "Optimierung: Fixkosten senken, Plan kleiner starten oder zuerst Notgroschen priorisieren.");
  }

  el("btnNextMonth").disabled = true;
  el("btnRunMonth").disabled = true;
}

function nextMonth(){
  const g = state.game;
  if(!g.hasRunThisMonth) return;
  if(g.month >= 12) return;

  g.month += 1;
  g.hasRunThisMonth = false;

  clearLog();
  setPhase("bereit");
  logInfo("Neuer Monat", "Klick wieder auf „Monat starten“.");
  renderGame();
}

// ------------------ Unterkonto hinzufügen ------------------
function addBucket(){
  const g = state.game;
  const name = (el("newBucketName").value || "").trim();
  if(!name){
    clearLog();
    logInfo("Unterkonto", "Gib einen Namen ein (z. B. Urlaub, Fahrrad, PC).");
    return;
  }
  const id = "b" + Math.random().toString(16).slice(2,8);
  g.buckets.subs.push({ id, name, balance:0, plan:30 });
  el("newBucketName").value = "";
  renderBuckets(g);
  clearLog();
  logInfo("Unterkonto angelegt", "Du hast einen neuen Spar-Topf erstellt. Setz einen Monatsbetrag daneben.");
  renderGame();
}

// ------------------ Screens ------------------
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
    el("stepText").textContent = "Monat → Fixkosten → Plan → Ereignis";
  }
}

// ------------------ Refresh Interview ------------------
function refreshInterview(){
  state.profile = getProfile();
  drawAvatar(state.profile, state.salt);
  typeText(el("storyText"), buildStory(state.profile));
}

// ------------------ Init ------------------
function init(){
  // glossary
  el("btnGlossary1").addEventListener("click", openGlossary);
  el("btnGlossary2").addEventListener("click", openGlossary);
  el("btnCloseGlossary").addEventListener("click", closeGlossary);
  el("glossaryDrawer").addEventListener("click", (e) => {
    if(e.target.id === "glossaryDrawer") closeGlossary();
  });

  // interview changes
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
    clearLog();
    setPhase("bereit");
    logInfo("Start", "Monat 1: du siehst jetzt echte Fixkosten. Danach kannst du sparen/investieren.");
    renderGame();
  });

  // game buttons
  el("btnApplyPlan").addEventListener("click", applyPlan);
  el("btnRunMonth").addEventListener("click", runMonth);
  el("btnNextMonth").addEventListener("click", nextMonth);

  el("btnAddBucket").addEventListener("click", addBucket);

  el("btnTakeLoan").addEventListener("click", takeLoan);

  el("btnBackToInterview").addEventListener("click", () => {
    state.game = null;
    showScreen("interview");
    refreshInterview();
  });

  refreshInterview();
}

document.addEventListener("DOMContentLoaded", init);
