
"use strict";

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
  if(!el("toast")) return;
  el("toastTitle").textContent = title;
  el("toastText").textContent = text;
  el("toast").classList.remove("hidden");
  setTimeout(()=> el("toast")?.classList.add("hidden"), 2400);
}

// ---------- Avatar ----------
const FIELD_THEMES = {
  it:          { bg:"#DBEAFE", ink:"#1D4ED8", soft:"#EFF6FF", accent:"#38BDF8", label:"IT" },
  pflege:      { bg:"#DCFCE7", ink:"#15803D", soft:"#F0FDF4", accent:"#34D399", label:"Pflege" },
  handwerk:    { bg:"#FFEDD5", ink:"#C2410C", soft:"#FFF7ED", accent:"#FB923C", label:"Handwerk" },
  buero:       { bg:"#E2E8F0", ink:"#475569", soft:"#F8FAFC", accent:"#94A3B8", label:"Büro" },
  einzelhandel:{ bg:"#F3E8FF", ink:"#7E22CE", soft:"#FAF5FF", accent:"#C084FC", label:"Einzelhandel" },
};

const LIVING_ACCENTS = {
  wg: "#22C55E",
  miete: "#2563EB",
  eltern: "#F59E0B",
  eigentum: "#8B5CF6",
};

const PATH_OUTFITS = {
  ausbildung: "hoodie",
  studium: "sweater",
  job: "blazer",
};

function hashString(str){
  let h = 2166136261 >>> 0;
  for(let i=0;i<str.length;i++){
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function seededRng(seed){
  let s = seed || 1337;
  return () => (s = (s*1664525 + 1013904223) >>> 0) / 4294967296;
}

function choose(arr, rng){
  return arr[Math.floor(rng() * arr.length)];
}

let avatarSalt = 0;

function getProfileSeed(profile){
  if(!profile) return 1337 + avatarSalt;
  return hashString([
    profile.style,
    profile.field,
    profile.path,
    profile.living,
    profile.family,
    avatarSalt
  ].join("|"));
}

function buildAvatarFromProfile(profile){
  const seed = getProfileSeed(profile);
  const rng = seededRng(seed);
  const theme = FIELD_THEMES[profile?.field] ?? FIELD_THEMES.it;
  const styleKey = profile?.style ?? "neutral";
  const skin = choose(["#F8D7C4","#F0C6AA","#E8BC9D","#DCA98A","#C98D6D"], rng);

  const hairPools = {
    masc: ["buzz","crop","side"],
    fem: ["bob","wave","long"],
    neutral: ["crop","bob","side"]
  };

  const jawPools = {
    masc: "square",
    fem: "soft",
    neutral: "mid"
  };

  const browPools = {
    masc: "strong",
    fem: "soft",
    neutral: rng() > 0.5 ? "soft" : "strong"
  };

  const eyePools = {
    masc: "almond",
    fem: "round",
    neutral: rng() > 0.5 ? "almond" : "round"
  };

  const nosePools = {
    masc: "straight",
    fem: "small",
    neutral: rng() > 0.5 ? "small" : "straight"
  };

  const hair = choose(hairPools[styleKey] ?? hairPools.neutral, rng);
  const hairColor = choose(
    styleKey === "fem"
      ? ["#111827","#3F3F46","#6B7280","#7C2D12"]
      : styleKey === "masc"
      ? ["#111827","#1F2937","#4B5563","#7C2D12"]
      : ["#111827","#374151","#6B7280","#7C2D12"],
    rng
  );

  const outfit = PATH_OUTFITS[profile?.path] ?? "hoodie";
  const accessory =
    profile?.lifeMobility === "bike" ? "strap" :
    profile?.lifeMobility === "car" ? "keys" :
    profile?.lifeMobility === "ticket" ? "card" : "none";

  return {
    seed,
    theme,
    skin,
    hair,
    hairColor,
    brow: browPools[styleKey] ?? "soft",
    jaw: jawPools[styleKey] ?? "mid",
    eyeShape: eyePools[styleKey] ?? "almond",
    noseShape: nosePools[styleKey] ?? "small",
    outfit,
    accessory,
    accent: LIVING_ACCENTS[profile?.living] ?? "#2563EB",
    family: profile?.family ?? "single",
    styleKey
  };
}

const state = {
  profile: null,
  game: null,
  avatarData: buildAvatarFromProfile({
    style:"neutral", field:"it", path:"ausbildung", living:"wg", family:"single",
    lifeFood:"normal", lifeFun:"mid", lifeShop:"mid", lifeSubs:"few", lifeMobility:"ticket"
  }),
  previewMood: "neutral"
};

function regenAvatar(){
  avatarSalt = (avatarSalt + 1) % 4;
  const profile = state.profile || readProfile();
  state.avatarData = buildAvatarFromProfile(profile);
  renderAvatarPreview();
  if(state.game) renderGameAvatar();
}

function deriveAvatarMood(g){
  if(!g) return "neutral";
  if(g.balance <= g.dispoFloor || g.redMonths >= 3) return "stressed";

  const score =
    (g.balance >= 250 ? 2 : g.balance >= 0 ? 1 : -2) +
    (g.buckets.cash >= 1000 ? 2 : g.buckets.cash >= 300 ? 1 : -1) +
    (g.stability >= 70 ? 1 : g.stability <= 35 ? -1 : 0) +
    (g.social >= 62 ? 1 : g.social <= 30 ? -1 : 0) +
    (g.comfort >= 62 ? 1 : g.comfort <= 30 ? -1 : 0);

  if(score >= 3) return "happy";
  if(score <= -2) return "sad";
  return "neutral";
}

function drawRoundedRect(ctx, x, y, w, h, r, fill){
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(x+r,y);
  ctx.arcTo(x+w,y,x+w,y+h,r);
  ctx.arcTo(x+w,y+h,x,y+h,r);
  ctx.arcTo(x,y+h,x,y,r);
  ctx.arcTo(x,y,x+w,y,r);
  ctx.closePath();
  ctx.fill();
}

function drawAvatarOnCanvas(canvasId, avatarData, mood="neutral"){
  const c = el(canvasId);
  if(!c) return;

  const size = 160;
  const scale = Math.max(2, Math.floor(window.devicePixelRatio || 2));

  c.width = size * scale;
  c.height = size * scale;
  c.style.width = size + "px";
  c.style.height = size + "px";

  const ctx = c.getContext("2d");
  ctx.setTransform(scale,0,0,scale,0,0);
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0,0,size,size);

  const theme = avatarData.theme;
  const moodMap = {
    happy: { mouth: "smile", brow: -4, eye: 0, aura: "#DCFCE7" },
    neutral: { mouth: "flat", brow: 0, eye: 0, aura: theme.soft },
    sad: { mouth: "sad", brow: 3, eye: -1, aura: "#E5E7EB" },
    stressed: { mouth: "tense", brow: 6, eye: -2, aura: "#FEE2E2" },
  };
  const moodCfg = moodMap[mood] ?? moodMap.neutral;

  drawRoundedRect(ctx, 8, 8, 144, 144, 24, "#FFFFFF");
  drawRoundedRect(ctx, 12, 12, 136, 136, 22, theme.soft);

  ctx.fillStyle = moodCfg.aura;
  ctx.beginPath();
  ctx.arc(80, 68, 44, 0, Math.PI*2);
  ctx.fill();

  ctx.strokeStyle = theme.accent;
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.arc(80, 68, 48, 0.2, Math.PI * 1.85);
  ctx.stroke();

  const outfitColor =
    avatarData.outfit === "blazer" ? "#334155" :
    avatarData.outfit === "sweater" ? "#4F46E5" : "#0F766E";

  drawRoundedRect(ctx, 40, 102, 80, 38, 18, outfitColor);

  if(avatarData.outfit === "blazer"){
    ctx.fillStyle = "#E2E8F0";
    ctx.beginPath(); ctx.moveTo(80,106); ctx.lineTo(68,140); ctx.lineTo(92,140); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#1E293B";
    ctx.fillRect(78,118,4,18);
  }else if(avatarData.outfit === "hoodie"){
    ctx.fillStyle = "#CCFBF1";
    ctx.beginPath(); ctx.arc(80,110,12,0,Math.PI*2); ctx.fill();
  }else{
    ctx.fillStyle = "#C7D2FE";
    ctx.fillRect(68,114,24,10);
  }

  if(avatarData.accessory === "card"){
    drawRoundedRect(ctx, 101, 116, 16, 12, 3, "#FEF3C7");
    ctx.fillStyle = "#F59E0B";
    ctx.fillRect(104,119,10,2);
  }else if(avatarData.accessory === "keys"){
    ctx.strokeStyle = "#F59E0B";
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(110,120,5,0,Math.PI*2); ctx.stroke();
    ctx.fillStyle = "#F59E0B";
    ctx.fillRect(113,119,7,3);
  }else if(avatarData.accessory === "strap"){
    ctx.strokeStyle = "#93C5FD";
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(52,105); ctx.lineTo(95,140); ctx.stroke();
  }

  drawRoundedRect(ctx, 70, 84, 20, 18, 8, avatarData.skin);

  const jawRadius =
    avatarData.jaw === "square" ? 12 :
    avatarData.jaw === "soft" ? 20 : 16;

  drawRoundedRect(ctx, 48, 28, 64, 64, jawRadius, avatarData.skin);
  ctx.fillStyle = avatarData.skin;
  ctx.fillRect(44,52,6,14);
  ctx.fillRect(110,52,6,14);

  ctx.fillStyle = avatarData.hairColor;
  if(avatarData.hair === "buzz"){
    drawRoundedRect(ctx, 50, 26, 60, 18, 12, avatarData.hairColor);
  }else if(avatarData.hair === "crop"){
    drawRoundedRect(ctx, 46, 22, 68, 26, 14, avatarData.hairColor);
    ctx.fillRect(46,36,10,26);
    ctx.fillRect(104,36,10,22);
  }else if(avatarData.hair === "side"){
    drawRoundedRect(ctx, 46, 22, 68, 24, 14, avatarData.hairColor);
    ctx.fillRect(46,34,12,32);
    ctx.beginPath(); ctx.moveTo(58,26); ctx.lineTo(96,26); ctx.lineTo(76,44); ctx.closePath(); ctx.fill();
  }else if(avatarData.hair === "bob"){
    drawRoundedRect(ctx, 44, 22, 72, 24, 16, avatarData.hairColor);
    ctx.fillRect(44,36,14,38);
    ctx.fillRect(102,36,14,38);
  }else if(avatarData.hair === "wave"){
    drawRoundedRect(ctx, 42, 22, 76, 26, 16, avatarData.hairColor);
    ctx.beginPath(); ctx.moveTo(44,42); ctx.quadraticCurveTo(58,58,52,76); ctx.lineTo(42,78); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(116,42); ctx.quadraticCurveTo(102,58,108,78); ctx.lineTo(118,78); ctx.closePath(); ctx.fill();
  }else if(avatarData.hair === "long"){
    drawRoundedRect(ctx, 42, 22, 76, 24, 16, avatarData.hairColor);
    ctx.fillRect(42,36,16,48);
    ctx.fillRect(102,36,16,48);
  }

  const browY = 52 + moodCfg.eye;
  const eyeY = 63 + moodCfg.eye;

  ctx.strokeStyle = "#0F172A";
  ctx.lineWidth = avatarData.brow === "strong" ? 4 : 3;
  ctx.beginPath();
  ctx.moveTo(60, browY + moodCfg.brow); ctx.lineTo(72, browY);
  ctx.moveTo(88, browY); ctx.lineTo(100, browY + moodCfg.brow);
  ctx.stroke();

  ctx.fillStyle = "#0F172A";
  if(avatarData.eyeShape === "round"){
    ctx.beginPath(); ctx.ellipse(66, eyeY, 4.5, 5.5, 0, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(94, eyeY, 4.5, 5.5, 0, 0, Math.PI*2); ctx.fill();
  }else{
    ctx.beginPath(); ctx.ellipse(66, eyeY, 5.2, 4.2, 0, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(94, eyeY, 5.2, 4.2, 0, 0, Math.PI*2); ctx.fill();
  }

  ctx.strokeStyle = "rgba(15,23,42,.25)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  if(avatarData.noseShape === "straight"){
    ctx.moveTo(80,66); ctx.lineTo(79,77); ctx.lineTo(82,77);
  }else{
    ctx.moveTo(80,68); ctx.lineTo(77,75); ctx.lineTo(82,76);
  }
  ctx.stroke();

  ctx.strokeStyle = "#7C2D12";
  ctx.lineWidth = 3;
  ctx.beginPath();
  if(moodCfg.mouth === "smile"){
    ctx.arc(80, 82, 10, 0.15, Math.PI - 0.15, false);
  }else if(moodCfg.mouth === "sad"){
    ctx.arc(80, 92, 10, Math.PI + 0.2, (Math.PI*2) - 0.2, false);
  }else if(moodCfg.mouth === "tense"){
    ctx.moveTo(71,84); ctx.lineTo(89,84);
  }else{
    ctx.moveTo(72,84); ctx.lineTo(88,84);
  }
  ctx.stroke();

  if(mood === "stressed"){
    ctx.fillStyle = "#60A5FA";
    ctx.beginPath(); ctx.moveTo(112,52); ctx.lineTo(118,66); ctx.lineTo(108,66); ctx.closePath(); ctx.fill();
  }else if(mood === "happy"){
    ctx.fillStyle = "#FACC15";
    ctx.beginPath(); ctx.arc(116,54,4,0,Math.PI*2); ctx.fill();
    ctx.fillRect(115,46,2,5); ctx.fillRect(115,57,2,5); ctx.fillRect(108,53,5,2); ctx.fillRect(119,53,5,2);
  }

  drawRoundedRect(ctx, 22, 22, 42, 18, 9, theme.bg);
  ctx.fillStyle = theme.ink;
  ctx.font = "bold 10px system-ui";
  ctx.fillText(theme.label, 30, 34);

  ctx.fillStyle = avatarData.accent;
  ctx.beginPath(); ctx.arc(126, 126, 10, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 10px system-ui";
  const livingLetter = ({
    wg:"W", miete:"M", eltern:"E", eigentum:"H"
  })[(state.profile?.living) || (readProfile()?.living)] || "W";
  ctx.fillText(livingLetter, 123, 129);

  if(avatarData.family === "partner"){
    ctx.fillStyle = "#F472B6";
    ctx.fillRect(25,118,10,10);
  }else if(avatarData.family === "kind"){
    ctx.fillStyle = "#22C55E";
    ctx.beginPath(); ctx.arc(30,123,6,0,Math.PI*2); ctx.fill();
  }
}

function applyAvatarTheme(target, theme, mood){
  const box = target ? target.closest(".avatarGameBox") : null;
  if(!box || !theme) return;
  box.style.setProperty("--avatar-bg", theme.soft);
  box.style.setProperty("--avatar-accent", theme.accent);
  box.style.setProperty("--avatar-ink", theme.ink);
  box.setAttribute("data-mood", mood || "neutral");
}

function renderAvatarPreview(){
  drawAvatarOnCanvas("avatar", state.avatarData, state.previewMood || "neutral");
  applyAvatarTheme(el("avatar"), state.avatarData.theme, state.previewMood || "neutral");
}

function renderGameAvatar(){
  if(!state.game) return;
  const mood = deriveAvatarMood(state.game);
  drawAvatarOnCanvas("gameAvatar", state.avatarData, mood);
  applyAvatarTheme(el("gameAvatar"), state.avatarData.theme, mood);
  if(el("avatarMoodLabel")) el("avatarMoodLabel").textContent =
    mood === "happy" ? "stabil" :
    mood === "sad" ? "gedrückt" :
    mood === "stressed" ? "gestresst" : "neutral";
  if(el("avatarMoodText")) el("avatarMoodText").textContent =
    mood === "happy" ? "Man sieht es sofort: genug Luft, ruhiger Blick, ordentliche Reserven." :
    mood === "sad" ? "Die Lage zieht sichtbar runter. Wenig Puffer und wenig Leichtigkeit." :
    mood === "stressed" ? "Viele Warnsignale gleichzeitig: angespannter Blick, harte Monatssituation." :
    "Gerade ist die Lage gemischt. Noch nicht schlimm, aber auch nicht komplett entspannt.";
}

// ---------- Model ----------
const JOB_NET = {
  it:          { ausbildung: 1220, studium: 1020, job: 2500 },
  pflege:      { ausbildung: 1250, studium: 1050, job: 2300 },
  handwerk:    { ausbildung: 1180, studium: 980,  job: 2400 },
  buero:       { ausbildung: 1120, studium: 980,  job: 2100 },
  einzelhandel:{ ausbildung: 1080, studium: 930,  job: 2000 },
};

const LIVING = {
  wg:       { rent: 430, utilities: 110, internet: 18 },
  miete:    { rent: 650, utilities: 160, internet: 25 },
  eltern:   { rent: 0,   utilities: 80,  internet: 0  },
  eigentum: { rent: 380, utilities: 210, internet: 25 },
};

function familyCosts(family){
  if(family === "partner") return 130;
  if(family === "kind") return 260;
  return 0;
}

function lifestyleBudgets(p){
  const food = p.lifeFood === "sparsam" ? 240 : (p.lifeFood === "teuer" ? 360 : 290);
  const fun  = p.lifeFun === "low" ? 55 : (p.lifeFun === "high" ? 150 : 100);
  const shop = p.lifeShop === "low" ? 35 : (p.lifeShop === "high" ? 125 : 75);
  const subs = p.lifeSubs === "none" ? 0 : (p.lifeSubs === "many" ? 35 : 18);
  const mobility = p.lifeMobility === "car" ? 190 : (p.lifeMobility === "ticket" ? 69 : 20);
  return { food, fun, shop, subs, mobility };
}

const INSURANCE = [
  { id:"haftpflicht", name:"Haftpflicht", price:6,  cat:"Basis",   badge:"base",    hint:"Hilft, wenn du aus Versehen jemand anderem Schaden machst." },
  { id:"hausrat",     name:"Hausrat",     price:12, cat:"Komfort", badge:"comfort", hint:"Kann Dinge in deiner Wohnung absichern." },
  { id:"handy",       name:"Handyversicherung", price:15, cat:"Risiko", badge:"risk", hint:"Kann bei einem kaputten Handy helfen." },
  { id:"rechtsschutz",name:"Rechtsschutz",price:18, cat:"Komfort", badge:"comfort", hint:"Kann bei Streit oder Verträgen helfen." },
];

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

function initialComfort(p){
  let c = 55;
  if(p.living === "eltern") c += 10;
  if(p.living === "wg") c += 4;
  if(p.living === "miete") c += 6;
  if(p.living === "eigentum") c += 8;
  if(p.lifeMobility === "car") c += 8;
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

function newGame(profile){
  const income = JOB_NET[profile.field]?.[profile.path] ?? 1700;
  const living = LIVING[profile.living] ?? LIVING.wg;
  const life = lifestyleBudgets(profile);
  return {
    month: 1,
    balance: 800,
    income,
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
    plan: { cash:80, etf:30 },
    buckets: {
      cash: 0,
      etf: 0,
      subs: [
        { id:"b1", name:"Urlaub", balance:0, plan:30 },
        { id:"b2", name:"Puffer", balance:0, plan:30 },
      ],
    },
    redMonths: 0,
    stability: 58,
    comfort: initialComfort(profile),
    social: initialSocial(profile),
    historyBalance: [800],
    historyEtf: [0],
    hasRunThisMonth: false,
    lastReceipt: null,
    effects: [],
    sceneNote: "Monat startet ruhig. Noch ist alles offen.",
    sideJob: false,
    sideJobUsed: false,
    soldClothesCooldown: 0,
    movedToWG: profile.living === "wg",
    emergencyHelpUsed: false,
    advisorHint: "",
    fixedActionsUsedThisMonth: 0
  };
}

// ---------- Interview preview ----------
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

function updateInterviewPreview(){
  const p = readProfile();
  state.profile = p;
  state.avatarData = buildAvatarFromProfile(p);
  const comfort = initialComfort(p);
  const social = initialSocial(p);
  let mood = "neutral";
  if(comfort + social >= 130) mood = "happy";
  if(comfort + social <= 85) mood = "sad";
  state.previewMood = mood;
  renderAvatarPreview();

  const parts = [];
  if(p.living === "eltern") parts.push("Du wohnst noch bei deinen Eltern. Das spart oft Miete, kann aber auch weniger Freiheit bedeuten.");
  if(p.living === "wg") parts.push("Du wohnst in einer WG. Das ist oft günstiger als allein wohnen.");
  if(p.living === "miete") parts.push("Du wohnst zur Miete. Das ist für viele ein realistischer Alltag.");
  if(p.living === "eigentum") parts.push("Du wohnst im Eigentum. Das heißt nicht automatisch: billig.");
  if(p.lifeMobility === "car") parts.push("Ein Auto macht vieles bequem, kostet aber oft spürbar Geld.");
  if(p.lifeMobility === "ticket") parts.push("Mit Ticket bist du meist günstiger unterwegs als mit einem Auto.");
  if(p.lifeMobility === "bike") parts.push("Fahrrad ist günstig, aber nicht immer bequem.");
  if(p.lifeFun === "high") parts.push("Du gibst eher mehr für Freizeit aus. Das kann Spaß bringen, drückt aber aufs Budget.");
  if(p.lifeFun === "low") parts.push("Du gibst wenig für Freizeit aus. Das spart Geld, kann aber sozial etwas bremsen.");
  if(p.path === "ausbildung") parts.push("In der Ausbildung ist das Einkommen oft deutlich kleiner als später.");
  if(p.path === "studium") parts.push("Im Studium ist Geld oft knapper. Gute Planung wird wichtig.");
  if(p.path === "job") parts.push("Im direkten Job kommt meist mehr Geld rein, aber die Ausgaben verschwinden trotzdem nicht.");
  if(el("storyText")) el("storyText").textContent = parts.join(" ");
}

// ---------- Timeline ----------
function timelineClear(){ if(el("gLog")) el("gLog").innerHTML = ""; }

function timelineItem(title, amount, sub){
  if(!el("gLog")) return;
  const item = document.createElement("div");
  item.className = "tItem";
  item.innerHTML = `
    <div class="tDot"></div>
    <div class="tMain">
      <div class="tTitle">${title}</div>
      ${sub ? `<div class="tSub">${sub}</div>` : ""}
    </div>
    <div class="tAmt ${amount === 0 ? "neu" : amount > 0 ? "pos" : "neg"}">${amount > 0 ? "+" : ""}${formatEUR(amount)}</div>
  `;
  el("gLog").appendChild(item);
}

function timelineInfo(title, sub){ timelineItem(title, 0, sub); }

// ---------- Derived ----------
function recomputeStability(g){
  let s = 42;
  s += Math.min(30, Math.floor(g.buckets.cash / 60));
  if(g.balance < 0) s -= 14;
  s -= g.redMonths * 5;
  if(g.buckets.etf >= 200) s += 6;
  if(g.buckets.etf >= 1000) s += 8;
  if(g.loan.active) s -= 6;
  if(g.insurance.haftpflicht) s += 3;
  if(g.sideJob) s -= 1;
  g.stability = clamp(s, 0, 100);
}

function insuranceSum(g){
  let sum = 0;
  for(const ins of INSURANCE) if(g.insurance[ins.id]) sum += ins.price;
  return sum;
}

function computeQuest(g){
  let text = "";
  let goal = 0;
  let current = 0;

  if(g.month <= 3){
    goal = 300;
    current = g.buckets.cash;
    text = `Mini-Notgroschen ≥ 300 € • aktuell: ${formatEUR(g.buckets.cash)}`;
  }else if(g.month <= 6){
    goal = 600;
    current = g.buckets.cash;
    text = `Rücklage ≥ 600 € • aktuell: ${formatEUR(g.buckets.cash)}`;
  }else if(g.month <= 9){
    goal = 1000;
    current = g.buckets.cash;
    text = `Notgroschen ≥ 1.000 € • aktuell: ${formatEUR(g.buckets.cash)}`;
  }else{
    goal = 1400;
    current = g.buckets.cash + Math.max(0, g.buckets.etf * 0.35);
    text = `Sicherheit + erster Vermögensaufbau ≥ 1.400 € • aktuell: ${formatEUR(current)}`;
  }

  const prog = clamp(current / goal, 0, 1);
  if(el("gQuestText")) el("gQuestText").textContent = text;
  if(el("gQuestFill")) el("gQuestFill").style.width = `${Math.round(prog*100)}%`;
}

// ---------- Receipt ----------
function renderReceipt(g){
  if(!el("receiptMonth")) return;
  el("receiptMonth").textContent = `Monat ${g.month}`;
  if(!g.lastReceipt){
    el("receiptBody").textContent = "Noch kein Monat gespielt.";
    el("receiptFoot").textContent = "Erst Monat starten, dann erscheint hier der „Kassenbon“.";
    return;
  }
  const r = g.lastReceipt;
  const lines = [
    ["Einkommen", r.income], ["Miete", -r.rent], ["Nebenkosten", -r.utilities], ["Internet", -r.internet],
    ["Handy", -r.phone], ["Familie", -r.family], ["Essen/Trinken", -r.food], ["Freizeit", -r.fun],
    ["Shopping", -r.shop], ["Abos", -r.subs], ["Mobilität", -r.mobility], ["Versicherungen", -r.insurance], ["Kreditrate", -r.loan]
  ];
  el("receiptBody").innerHTML = lines.map(([label,val]) => `
    <div class="receiptLine"><span>${label}</span><span>${val > 0 ? "+" : ""}${formatEUR(val)}</span></div>
  `).join("") + `
    <div class="receiptLine total"><strong>Ergebnis nach Fixkosten</strong><strong>${formatEUR(r.afterFixed)}</strong></div>
    <div class="receiptLine"><span>Sparen / ETF / Unterkonten</span><span>${formatEUR(-r.planTotal)}</span></div>
    <div class="receiptLine total"><strong>Zwischenstand vor Entscheidung/Event</strong><strong>${formatEUR(r.afterPlan)}</strong></div>
  `;
  el("receiptFoot").textContent = "Das zeigt grob, wie ein echter Monat aussehen kann: Erst feste Kosten, dann bleibt der Rest.";
}

function renderWarnings(g){
  const root = el("warningStrip");
  if(!root) return;
  root.innerHTML = "";
  const lamps = [];
  if(g.balance >= 0) lamps.push({ cls:"good", text:"● Konto im Plus" });
  else if(g.balance > g.dispoFloor) lamps.push({ cls:"warn", text:"● Konto im Minus" });
  else lamps.push({ cls:"bad", text:"● Dispo-Limit erreicht" });

  if(g.buckets.cash >= 1000) lamps.push({ cls:"good", text:"● Notgroschen-Ziel erreicht" });
  else if(g.buckets.cash >= 300) lamps.push({ cls:"warn", text:"● Rücklage wächst" });
  else lamps.push({ cls:"bad", text:"● Kaum Rücklage" });

  const planned = g.plan.cash + g.plan.etf + g.buckets.subs.reduce((s,b)=> s + (b.plan || 0), 0);
  if(planned > 0.35 * g.income) lamps.push({ cls:"warn", text:"● Sparplan evtl. zu hoch" });
  if(g.variable.subs >= 35) lamps.push({ cls:"warn", text:"● Viele Abos" });
  if(g.redMonths >= 2) lamps.push({ cls:"bad", text:"● Mehrere Minus-Monate" });
  if(g.loan.active) lamps.push({ cls:"warn", text:"● Laufender Kredit" });
  if(g.effects?.length) lamps.push({ cls:"warn", text:`● ${g.effects.length} Nachwirkung(en)` });

  lamps.forEach(lamp=>{
    const div = document.createElement("div");
    div.className = `warnLamp ${lamp.cls}`;
    div.textContent = lamp.text;
    root.appendChild(div);
  });
}

// ---------- Renders ----------
function renderInsuranceList(g){
  const root = el("insuranceList");
  if(!root) return;
  root.innerHTML = "";
  for(const ins of INSURANCE){
    const on = !!g.insurance[ins.id];
    const div = document.createElement("div");
    div.className = "insItem";
    div.innerHTML = `
      <div class="insTop"><div class="insName">${ins.name}</div><div class="insPrice">${formatEUR(ins.price)}/Monat</div></div>
      <div class="badge ${ins.badge}">${ins.cat}</div>
      <div class="insDesc">${ins.hint}</div>
      <label class="insToggle"><input type="checkbox" data-ins="${ins.id}" ${on ? "checked" : ""}/> Aktivieren</label>
    `;
    root.appendChild(div);
  }
  root.querySelectorAll('input[type="checkbox"][data-ins]').forEach(cb => {
    cb.addEventListener("change", (e)=>{
      const id = e.target.getAttribute("data-ins");
      g.insurance[id] = e.target.checked;
      timelineInfo("Versicherung geändert", "Versicherungen kosten jeden Monat Geld, können aber in Notfällen helfen.");
      renderAll();
    });
  });
  if(el("insuranceUnlockedHint")){
    const unlocked = [...g.insuranceHints];
    el("insuranceUnlockedHint").textContent = unlocked.length ? "Freigeschaltete Hinweise: " + unlocked.join(" • ") : "Hinweise werden durch passende Ereignisse freigeschaltet.";
  }
}

function renderBuckets(g){
  const root = el("bucketList");
  if(!root) return;
  root.innerHTML = "";
  for(const b of g.buckets.subs){
    const row = document.createElement("div");
    row.className = "bucketRow";
    row.innerHTML = `
      <div><div class="bucketName">${b.name}</div><div class="bucketMeta">Stand: ${formatEUR(b.balance)}</div></div>
      <div class="bucketInput"><input type="number" min="0" step="10" value="${b.plan}" data-bucket="${b.id}" /></div>
      <div class="bucketActions">
        <button class="btn soft" data-withdraw="${b.id}" type="button">↩</button>
        <button class="btn soft ghost" data-del="${b.id}" type="button">✕</button>
      </div>
    `;
    root.appendChild(row);
  }
  root.querySelectorAll('input[data-bucket]').forEach(inp => {
    inp.addEventListener("change", (e)=>{
      const id = e.target.getAttribute("data-bucket");
      const val = Math.max(0, Number(e.target.value || 0));
      const b = g.buckets.subs.find(x=>x.id === id);
      if(b) b.plan = val;
      renderAll();
    });
  });
  root.querySelectorAll('button[data-del]').forEach(btn => {
    btn.addEventListener("click", (e)=>{
      const id = e.target.getAttribute("data-del");
      g.buckets.subs = g.buckets.subs.filter(x=>x.id !== id);
      timelineInfo("Unterkonto gelöscht", "Ein Unterkonto ist praktisch für ein bestimmtes Ziel.");
      renderAll();
    });
  });
  root.querySelectorAll('button[data-withdraw]').forEach(btn => {
    btn.addEventListener("click", (e)=>{
      const id = e.target.getAttribute("data-withdraw");
      const b = g.buckets.subs.find(x=>x.id === id);
      if(!b) return;
      if(b.balance <= 0){ toast("Entnahme", "In diesem Topf ist nichts drin."); return; }
      const raw = prompt(`Wie viel € aus "${b.name}" entnehmen? (max. ${Math.round(b.balance)} €)`, "50");
      if(raw === null) return;
      const amount = Math.floor(Number(raw));
      if(!Number.isFinite(amount) || amount <= 0){ toast("Entnahme", "Bitte Zahl > 0."); return; }
      if(amount > b.balance){ toast("Entnahme", "Zu hoch."); return; }
      b.balance -= amount;
      g.balance += amount;
      timelineItem(`Entnahme: ${b.name}`, +amount, "Im echten Leben kann man Geld wieder aus einem Spartopf holen.");
      renderAll();
    });
  });
}

function drawLineChart(canvas, values){
  if(!canvas) return;
  const ctx = canvas.getContext("2d");
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0,0,w,h);
  if(!values || values.length < 2) return;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pad = 14;
  ctx.globalAlpha = 0.5;
  ctx.beginPath();
  ctx.moveTo(pad, h-pad);
  ctx.lineTo(w-pad, h-pad);
  ctx.stroke();
  ctx.globalAlpha = 1;
  const normY = (v)=>{
    if(max === min) return h/2;
    const t = (v - min) / (max - min);
    return (h-pad) - t * (h - pad*2);
  };
  const stepX = (w - pad*2) / (values.length - 1);
  ctx.beginPath();
  ctx.moveTo(pad, normY(values[0]));
  for(let i=1;i<values.length;i++) ctx.lineTo(pad + i*stepX, normY(values[i]));
  ctx.stroke();
}

function renderCharts(g){
  drawLineChart(el("chartBalance"), g.historyBalance);
  drawLineChart(el("chartEtf"), g.historyEtf);
}

function updateAdvisor(g){
  const tips = [];
  if(g.balance < 0) tips.push("Du bist im Minus. Prüfe direkt feste Optionen wie Abos, WG oder Nebenjob.");
  if(g.variable.subs > 0) tips.push("Abos sind oft kleiner als Miete, nerven aber dauerhaft.");
  if(g.buckets.cash < 300 && g.month <= 4) tips.push("Im frühen Spiel ist Notgroschen wichtiger als ETF.");
  if(g.loan.active) tips.push("Läuft ein Kredit, kann Umschulden sinnvoll sein.");
  if(g.balance > 250 && g.buckets.cash < 600) tips.push("Du hast Luft. Nutze sie eher für Rücklage als für alles auf einmal.");
  if(g.variable.shop >= 100) tips.push("Shopping ist ein guter Hebel, wenn es knapp wird.");
  g.advisorHint = tips[0] || "Gerade keine rote Warnung. Halte den Kurs.";
}

function renderStats(g){
  recomputeStability(g);
  computeQuest(g);
  updateAdvisor(g);

  if(el("gMonth")) el("gMonth").textContent = g.month;
  if(el("gBalance")) el("gBalance").textContent = formatEUR(g.balance);
  if(el("gIncome")) el("gIncome").textContent = formatEUR(g.income);
  if(el("gCash")) el("gCash").textContent = formatEUR(g.buckets.cash);
  if(el("gEtf")) el("gEtf").textContent = formatEUR(g.buckets.etf);

  if(el("gBalanceHint")){
    el("gBalanceHint").textContent = g.sceneNote || (g.balance < g.dispoFloor ? "Kontosperre (Limit erreicht)" : (g.balance < 0 ? "Im Minus" : "OK"));
  }

  if(el("gStabilityFill")) el("gStabilityFill").style.width = `${g.stability}%`;
  if(el("gComfortFill")) el("gComfortFill").style.width = `${g.comfort}%`;
  if(el("gSocialFill")) el("gSocialFill").style.width = `${g.social}%`;
  if(el("gStabilityText")) el("gStabilityText").textContent = `${g.stability}/100`;
  if(el("gComfortText")) el("gComfortText").textContent = `${g.comfort}/100`;
  if(el("gSocialText")) el("gSocialText").textContent = `${g.social}/100`;

  if(el("inpCash")) el("inpCash").value = g.plan.cash;
  if(el("inpEtf")) el("inpEtf").value = g.plan.etf;

  if(el("loanStatus")) el("loanStatus").textContent = g.loan.active ? `Aktiv: ${LOAN_TYPES[g.loan.type]?.label ?? "Kredit"} • Rate ${formatEUR(g.loan.rate)}/Monat • noch ${g.loan.monthsLeft} Monate` : "kein Kredit";
  if(el("goalNote")) el("goalNote").innerHTML = `Minus-Monate: <strong>${g.redMonths}</strong> • Dispo-Limit: <strong>${formatEUR(g.dispoFloor)}</strong> • Stabilität <strong>${g.stability}</strong> • Komfort <strong>${g.comfort}</strong> • Soziales <strong>${g.social}</strong>.`;
  if(el("advisorText")) el("advisorText").textContent = g.advisorHint;
}

function applyCrisisState(g){
  const root = el("screenGame");
  if(!root) return;
  const crisis = g.balance < 0 || g.redMonths >= 2;
  root.classList.toggle("is-crisis", crisis);
  document.body.classList.toggle("is-crisis", crisis);
}

function renderAll(){
  const g = state.game;
  if(!g) return;
  renderStats(g);
  renderBuckets(g);
  renderInsuranceList(g);
  renderReceipt(g);
  renderWarnings(g);
  renderCharts(g);
  renderGameAvatar();
  renderActionCenter();
  applyCrisisState(g);
  if(el("btnRunMonth")) el("btnRunMonth").disabled = g.hasRunThisMonth;
  if(el("btnNextMonth")) el("btnNextMonth").disabled = !g.hasRunThisMonth;
}

// ---------- Modals ----------
function closeChoiceModal(){ el("choiceModal")?.classList.add("hidden"); }

function openChoiceModal({ title, text, options }){
  if(!el("choiceModal")) return;
  el("choiceTitle").textContent = title;
  el("choiceText").textContent = text;
  const root = el("choiceActions");
  root.innerHTML = "";
  for(const opt of options){
    const btn = document.createElement("button");
    btn.className = "choiceBtn";
    btn.type = "button";
    btn.innerHTML = `
      <div class="choiceTitle">${opt.label}</div>
      <div class="choiceMeta">${opt.meta || ""}</div>
      <div class="choiceImpact">${(opt.impacts || []).map(p=>`<span class="pill ${p.cls}">${p.text}</span>`).join("")}</div>
    `;
    btn.addEventListener("click", ()=>{ closeChoiceModal(); opt.onPick?.(); });
    root.appendChild(btn);
  }
  el("choiceModal").classList.remove("hidden");
}

function openEventModal({ title, text, onOk }){
  if(!el("eventModal")) return onOk?.();
  el("eventTitle").textContent = title;
  el("eventText").textContent = text;
  el("eventModal").classList.remove("hidden");
  el("eventOk").onclick = ()=>{ el("eventModal").classList.add("hidden"); onOk?.(); };
}

function openEndModal(title, body){
  if(!el("endModal")) return;
  el("endTitle").textContent = title;
  el("endBody").textContent = body;
  el("endModal").classList.remove("hidden");
  el("endOk").onclick = ()=> el("endModal").classList.add("hidden");
}

// ---------- Actions ----------
function applyPlan(){
  const g = state.game;
  g.plan.cash = Math.max(0, Number(el("inpCash").value || 0));
  g.plan.etf  = Math.max(0, Number(el("inpEtf").value || 0));
  timelineInfo("Plan gespeichert", "Erst Fixkosten, dann Sparen – so denken viele Haushalte im echten Leben.");
  renderAll();
}

function addBucket(){
  const g = state.game;
  const name = (el("newBucketName").value || "").trim();
  if(!name){ toast("Unterkonto", "Bitte Name eingeben."); return; }
  const id = "b" + Math.random().toString(16).slice(2,8);
  g.buckets.subs.push({ id, name, balance:0, plan:30 });
  if(el("newBucketName")) el("newBucketName").value = "";
  timelineInfo("Unterkonto angelegt", "Ein Ziel spart sich oft leichter, wenn es einen eigenen Topf hat.");
  renderAll();
}

function withdrawFromCash(){
  const g = state.game;
  if(g.buckets.cash <= 0){ toast("Notgroschen", "Da ist nichts drin."); return; }
  const raw = prompt(`Wie viel € aus Notgroschen entnehmen? (max. ${Math.round(g.buckets.cash)} €)`, "100");
  if(raw === null) return;
  const amount = Math.floor(Number(raw));
  if(!Number.isFinite(amount) || amount <= 0){ toast("Notgroschen", "Bitte Zahl > 0."); return; }
  if(amount > g.buckets.cash){ toast("Notgroschen", "Zu hoch."); return; }
  g.buckets.cash -= amount;
  g.balance += amount;
  timelineItem("Notgroschen-Entnahme", +amount, "Im echten Leben ist genau dafür ein Notgroschen da.");
  renderAll();
}

const ETF_SELL_FEE_PCT = 0.01;
const ETF_SELL_FEE_MIN = 2;

function sellEtf(){
  const g = state.game;
  if(g.buckets.etf <= 0){ toast("ETF", "Du hast kein ETF-Guthaben."); return; }
  const raw = prompt(`Wie viel € ETF verkaufen? (max. ${Math.round(g.buckets.etf)} €)`, "200");
  if(raw === null) return;
  const amount = Math.floor(Number(raw));
  if(!Number.isFinite(amount) || amount <= 0){ toast("ETF", "Bitte Zahl > 0."); return; }
  if(amount > g.buckets.etf){ toast("ETF", "Zu hoch."); return; }
  const fee = Math.max(ETF_SELL_FEE_MIN, Math.round(amount * ETF_SELL_FEE_PCT));
  const payout = Math.max(0, amount - fee);
  g.buckets.etf -= amount;
  g.balance += payout;
  timelineItem("ETF verkauft", +payout, `Verkauf ${formatEUR(amount)} • Gebühr ${formatEUR(fee)}. Im echten Leben kosten Verkäufe manchmal Gebühren oder Steuern.`);
  renderAll();
}

function takeLoan(){
  const g = state.game;
  const loanType = el("loanType").value;
  const cfg = LOAN_TYPES[loanType] ?? LOAN_TYPES.konsum;
  const amount = Math.max(0, Number(el("loanAmount").value || 0));
  const months = clamp(Number(el("loanMonths").value || 12), cfg.minMonths, cfg.maxMonths);
  if(amount <= 0){ toast("Kredit", "Betrag > 0 eingeben."); return; }
  if(g.loan.active){ toast("Kredit", "Hier ist nur ein Kredit gleichzeitig möglich."); return; }
  const rate = calcMonthlyRate(amount, months, cfg.apr);
  g.loan = { active:true, principal:amount, monthsLeft:months, rate, apr:cfg.apr, type:loanType };
  g.balance += amount;
  timelineItem("Kredit ausgezahlt", +amount, `${cfg.label} • ${cfg.apr}% p.a.`);
  timelineInfo("Echtes Leben", "Ein Kredit hilft sofort, macht die nächsten Monate aber enger.");
  renderAll();
}

// ---------- Permanent action center ----------
function actionUseGuard(limit = 2){
  const g = state.game;
  if(!g || g.hasRunThisMonth) return true;
  if(g.fixedActionsUsedThisMonth >= limit){
    toast("Aktion", "Diesen Monat hast du schon genug Sofortaktionen genutzt.");
    return false;
  }
  return true;
}

function cancelSubscriptions(){
  const g = state.game;
  if(!actionUseGuard()) return;
  if(g.variable.subs <= 0){
    toast("Abos", "Du hast keine Abos mehr.");
    return;
  }
  const saved = Math.min(18, g.variable.subs);
  g.variable.subs = Math.max(0, g.variable.subs - saved);
  g.fixedActionsUsedThisMonth += 1;
  g.stability = clamp(g.stability + 2, 0, 100);
  g.comfort = clamp(g.comfort - 1, 0, 100);
  timelineItem("Abos gekündigt", +saved, "Du hast Verträge überprüft und laufende Kosten gesenkt.");
  setSceneNote(g, "Weniger Bequemlichkeit, aber der Monat wird spürbar klarer.");
  renderAll();
}

function sellClothes(){
  const g = state.game;
  if(!actionUseGuard()) return;
  if(g.soldClothesCooldown > 0){
    toast("Verkaufen", "Gerade hast du nichts Sinnvolles mehr zum Verkaufen.");
    return;
  }
  const money = 110;
  g.balance += money;
  g.soldClothesCooldown = 2;
  g.fixedActionsUsedThisMonth += 1;
  g.comfort = clamp(g.comfort - 1, 0, 100);
  timelineItem("Klamotten verkauft", +money, "Second-Hand Verkauf bringt kurzfristig Luft.");
  setSceneNote(g, "Kurzfristig clever. Dauerhaft rettet das aber keinen schiefen Monat.");
  renderAll();
}

function startSideJob(){
  const g = state.game;
  if(!actionUseGuard(1)) return;
  if(g.sideJob){
    toast("Nebenjob","Du hast bereits einen Nebenjob.");
    return;
  }
  if(g.sideJobUsed){
    toast("Nebenjob","Du hast diese Option schon genutzt.");
    return;
  }
  g.sideJob = true;
  g.sideJobUsed = true;
  g.income += 180;
  g.fixedActionsUsedThisMonth += 1;
  g.comfort = clamp(g.comfort - 4, 0, 100);
  g.social = clamp(g.social - 2, 0, 100);
  timelineInfo("Nebenjob gestartet", "Mehr Geld pro Monat, aber weniger Freizeit und Energie.");
  setSceneNote(g, "Der Monat bekommt Luft – dein Alltag aber auch mehr Druck.");
  renderAll();
}

function moveToWG(){
  const g = state.game;
  if(!actionUseGuard(1)) return;
  if(g.movedToWG || state.profile?.living === "wg"){
    toast("WG", "Du wohnst bereits in einer WG.");
    return;
  }
  const oldRent = g.fixed.rent + g.fixed.utilities + g.fixed.internet;
  const newRent = LIVING.wg.rent + LIVING.wg.utilities + LIVING.wg.internet;
  const delta = oldRent - newRent;
  g.fixed.rent = LIVING.wg.rent;
  g.fixed.utilities = LIVING.wg.utilities;
  g.fixed.internet = LIVING.wg.internet;
  g.movedToWG = true;
  state.profile.living = "wg";
  state.avatarData = buildAvatarFromProfile(state.profile);
  g.fixedActionsUsedThisMonth += 1;
  g.comfort = clamp(g.comfort - 3, 0, 100);
  g.social = clamp(g.social + 2, 0, 100);
  timelineItem("In WG gezogen", +delta, "Deine Wohnkosten sinken deutlich ab dem nächsten Abrechnungsgefühl sofort.");
  setSceneNote(g, "Mehr finanzieller Puffer – dafür etwas weniger Ruhe und Privatsphäre.");
  renderAll();
}

function refinanceLoan(){
  const g = state.game;
  if(!actionUseGuard()) return;
  if(!g.loan.active){
    toast("Kredit", "Kein Kredit aktiv.");
    return;
  }
  const oldRate = g.loan.rate;
  g.loan.apr = Math.max(2.5, g.loan.apr - 1.5);
  g.loan.rate = calcMonthlyRate(g.loan.principal, Math.max(1, g.loan.monthsLeft), g.loan.apr);
  g.fixedActionsUsedThisMonth += 1;
  g.stability = clamp(g.stability + 3, 0, 100);
  timelineItem("Kredit umgeschuldet", Math.round(oldRate - g.loan.rate), "Die Rate sinkt etwas. Nicht magisch, aber hilfreich.");
  setSceneNote(g, "Du gewinnst etwas Luft – Schulden verschwinden dadurch aber nicht.");
  renderAll();
}

function emergencyHelp(){
  const g = state.game;
  if(!g) return;
  if(g.emergencyHelpUsed){
    toast("Hilfe", "Diese Hilfe gab es schon.");
    return;
  }
  if(!(g.balance < 0 || g.redMonths >= 2)){
    toast("Hilfe", "Gerade ist diese Notfallhilfe noch nicht freigeschaltet.");
    return;
  }
  g.emergencyHelpUsed = true;
  g.balance += 220;
  g.stability = clamp(g.stability - 1, 0, 100);
  timelineItem("Notfallhilfe", +220, "Familie / Umfeld hilft einmal aus. Das rettet, löst aber nicht das Grundproblem.");
  setSceneNote(g, "Du kommst über Wasser – jetzt musst du die Struktur fixen.");
  renderAll();
}

// ---------- Decisions / events ----------
function impactPills({money=0, stability=0, comfort=0, social=0}){
  const mk = (cls,text)=>({cls,text});
  return [
    mk(money>0?"good":money<0?"bad":"neu", `${money>0?"+":""}${formatEUR(money)}`),
    mk(stability>0?"good":stability<0?"bad":"neu", `Stabil ${stability>0?"+":""}${stability}`),
    mk(comfort>0?"good":comfort<0?"bad":"neu", `Komfort ${comfort>0?"+":""}${comfort}`),
    mk(social>0?"good":social<0?"bad":"neu", `Soz. ${social>0?"+":""}${social}`)
  ];
}

function addEffect(g, effect){
  g.effects.push({
    id: "fx_" + Math.random().toString(16).slice(2,8),
    name: effect.name,
    months: effect.months || 1,
    money: effect.money || 0,
    stability: effect.stability || 0,
    comfort: effect.comfort || 0,
    social: effect.social || 0,
    text: effect.text || ""
  });
}

function processEffects(g){
  if(!g.effects.length) return;
  const stillActive = [];
  for(const fx of g.effects){
    if(fx.money){
      g.balance += fx.money;
      timelineItem(`Nachwirkung: ${fx.name}`, fx.money, fx.text || "Eine frühere Entscheidung wirkt weiter.");
    }else{
      timelineInfo(`Nachwirkung: ${fx.name}`, fx.text || "Eine frühere Entscheidung wirkt weiter.");
    }
    g.stability = clamp(g.stability + (fx.stability || 0), 0, 100);
    g.comfort = clamp(g.comfort + (fx.comfort || 0), 0, 100);
    g.social = clamp(g.social + (fx.social || 0), 0, 100);
    fx.months -= 1;
    if(fx.months > 0) stillActive.push(fx);
  }
  g.effects = stillActive;
}

function setSceneNote(g, text){
  g.sceneNote = text;
  if(el("gBalanceHint")) el("gBalanceHint").textContent = text;
}

function applyOption(g, opt, title){
  g.balance += opt.money;
  g.stability = clamp(g.stability + opt.stability, 0, 100);
  g.comfort = clamp(g.comfort + opt.comfort, 0, 100);
  g.social = clamp(g.social + opt.social, 0, 100);
  if(opt.effect) addEffect(g, opt.effect);
  if(opt.scene) setSceneNote(g, opt.scene);
  timelineItem(title, opt.money, `${opt.label}: ${opt.meta}`);
}

function scaleCost(g, amount){
  if(g.balance < 100) return Math.round(amount * 0.55);
  if(g.balance < 300) return Math.round(amount * 0.75);
  return amount;
}

const DECISIONS = [
  {
    title:"Essen & Trinken",
    text:"Du merkst: Essen kippt den Monat. Was machst du?",
    a:{ label:"Meal Prep", meta:"Planen und vorkochen.", money:+70, stability:+6, comfort:-1, social:0, effect:{ name:"Meal-Prep-Routine", months:2, money:+20, stability:+1, text:"Du kaufst geplanter ein und gibst in den nächsten Monaten etwas weniger aus." }, scene:"Mehr Kontrolle im Alltag. Nicht glamourös, aber wirksam." },
    b:{ label:"To-Go / Lieferung", meta:"Bequemer, aber teurer.", money:-70, stability:-2, comfort:+2, social:+1, effect:{ name:"Bequemlichkeitskosten", months:2, money:-20, stability:-1, text:"Spontane Bestellungen summieren sich weiter." }, scene:"Sehr bequem – aber das Budget merkt es sofort." },
  },
  {
    title:"Freizeit",
    text:"Freunde fragen: Kino heute?",
    a:{ label:"Mitgehen", meta:"Kostet, aber du bist dabei.", money:-25, stability:-1, comfort:+1, social:+6, effect:{ name:"Sozialer Rückenwind", months:1, social:+2, text:"Du fühlst dich noch im nächsten Monat etwas verbundener." }, scene:"Teurer Abend, aber sozial ein klarer Gewinn." },
    b:{ label:"Absagen", meta:"Du sparst, bist aber weniger dabei.", money:+10, stability:+2, comfort:0, social:-4, effect:{ name:"Rückzug", months:1, social:-2, text:"Weniger Teilhabe wirkt oft noch etwas nach." }, scene:"Finanziell vernünftig, sozial aber eher dünn." },
  },
  {
    title:"Abos prüfen",
    text:"Du merkst: Abos summieren sich.",
    a:{ label:"Kündigen", meta:"2 Abos weg.", money:+18, stability:+3, comfort:-2, social:-1, effect:{ name:"Dauerhaft aufgeräumt", months:3, money:+18, stability:+1, text:"Weniger laufende Verträge entlasten auch die nächsten Monate." }, scene:"Weniger Komfort, aber deutlich klarerer Monatsplan." },
    b:{ label:"Behalten", meta:"Bleibt bequem, kostet aber weiter.", money:0, stability:-1, comfort:+1, social:0, effect:{ name:"Abo zieht weiter", months:3, money:-18, stability:-1, text:"Kleine Beträge nerven auch später." }, scene:"Es bleibt bequem – und dauerhaft etwas enger." },
  },
];

const EVENTS = [
  {
    title:"Handy kaputt",
    text:"Dein Handy fällt runter. Das musst du jetzt beachten.",
    after(g){
      g.insuranceHints.add("Handy: Eine Versicherung kann helfen, ist aber nicht immer automatisch sinnvoll.");
      openChoiceModal({
        title:"Handy kaputt",
        text:"Was machst du?",
        options:[
          {
            label:"Reparieren",
            meta:"Billiger, aber nicht perfekt.",
            impacts:impactPills({money:-scaleCost(g,120), stability:-1, comfort:-1, social:-1}),
            onPick:()=>{
              applyOption(g, {
                label:"Reparieren",
                meta:"Billiger.",
                money:-scaleCost(g,120),
                stability:-1,
                comfort:-1,
                social:-1,
                effect:{ name:"Wackeliges Handy", months:2, comfort:-1, text:"Das reparierte Handy nervt noch etwas nach." },
                scene:"Gerettet, aber nicht wirklich elegant."
              }, "Ereignis");
              finalizeMonth(g);
            }
          },
          {
            label:"Neu kaufen",
            meta:"Teurer, aber bequemer.",
            impacts:impactPills({money:-scaleCost(g,420), stability:-2, comfort:+2, social:+2}),
            onPick:()=>{
              applyOption(g, {
                label:"Neu kaufen",
                meta:"Teurer.",
                money:-scaleCost(g,420),
                stability:-2,
                comfort:+2,
                social:+2,
                effect:{ name:"Neues Gerät, neue Rate im Kopf", months:1, stability:-1, text:"Große Anschaffungen drücken oft noch kurz nach." },
                scene:"Technisch entspannt, finanziell aber ein echter Schlag."
              }, "Ereignis");
              finalizeMonth(g);
            }
          }
        ]
      });
    }
  },
  {
    title:"Bonus",
    text:"Du bekommst einen kleinen Bonus.",
    after(g){
      openChoiceModal({
        title:"Bonus",
        text:"Was machst du mit dem Extra-Geld?",
        options:[
          {
            label:"Einfach behalten",
            meta:"Mehr Luft auf dem Konto.",
            impacts:impactPills({money:+120, stability:+2, comfort:+1, social:+1}),
            onPick:()=>{
              applyOption(g, {
                label:"Behalten",
                meta:"Mehr Luft.",
                money:+120,
                stability:+2,
                comfort:+1,
                social:+1,
                scene:"Ein seltener ruhiger Moment: einmal nicht sofort knapp."
              }, "Ereignis");
              finalizeMonth(g);
            }
          },
          {
            label:"Teil sparen",
            meta:"Etwas direkt in den Notgroschen.",
            impacts:impactPills({money:+120, stability:+3, comfort:0, social:0}),
            onPick:()=>{
              applyOption(g, {
                label:"Teil sparen",
                meta:"Du legst direkt was weg.",
                money:+120,
                stability:+3,
                comfort:0,
                social:0,
                scene:"Nicht spektakulär, aber sehr stark: Reserve wächst sichtbar."
              }, "Ereignis");
              g.buckets.cash += 80;
              g.balance -= 80;
              timelineItem("Bonus → Notgroschen", -80, "Direkt Rücklage erhöht.");
              finalizeMonth(g);
            }
          }
        ]
      });
    }
  }
];

function maybePick(arr, chance){
  if(Math.random() > chance) return null;
  return arr[Math.floor(Math.random()*arr.length)];
}

// ---------- ETF ----------
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

// ---------- Month logic ----------
function runMonth(){
  const g = state.game;
  if(g.hasRunThisMonth) return;

  g.fixedActionsUsedThisMonth = 0;
  timelineClear();
  timelineInfo(`Monat ${g.month} startet`, "Du siehst jetzt Schritt für Schritt, wo das Geld hingeht.");

  if(g.soldClothesCooldown > 0) g.soldClothesCooldown -= 1;
  processEffects(g);

  g.balance += g.income;
  timelineItem("Einkommen (Netto)", g.income, "Das ist dein Geld für diesen Monat.");

  const f = g.fixed;
  const v = g.variable;
  const ins = insuranceSum(g);

  let loanPay = 0;
  if(g.loan.active){
    loanPay = Math.round(g.loan.rate);
    g.loan.monthsLeft -= 1;
    if(g.loan.monthsLeft <= 0){
      g.loan.active = false;
      timelineInfo("Kredit beendet", "Die letzte Rate ist bezahlt.");
    }
  }

  timelineItem("Miete", -f.rent, "Wohnen ist oft der größte feste Kostenblock.");
  timelineItem("Nebenkosten", -f.utilities, "Zum Beispiel Strom, Wasser, Heizung.");
  timelineItem("Internet", -f.internet, "Fester Vertrag.");
  timelineItem("Handy", -f.phone, "Monatlicher Tarif.");
  if(f.family>0) timelineItem("Familie", -f.family, "Mehr Menschen im Haushalt kosten oft mehr.");
  timelineItem("Essen/Trinken", -v.food, "Hier kann man oft sparen oder mehr ausgeben.");
  timelineItem("Freizeit", -v.fun, "Spaß kostet manchmal Geld, gehört aber zum Leben.");
  timelineItem("Shopping", -v.shop, "Nicht immer nötig, aber oft verlockend.");
  timelineItem("Abos", -v.subs, "Viele kleine Beträge summieren sich.");
  timelineItem("Mobilität", -v.mobility, "Zur Schule, Arbeit oder zu Freunden.");
  if(ins>0) timelineItem("Versicherungen", -ins, "Sicherheit kostet jeden Monat etwas.");
  if(loanPay>0) timelineItem("Kreditrate", -loanPay, "Ein Kredit belastet auch die Zukunft.");

  const total = f.rent + f.utilities + f.internet + f.phone + f.family + v.food + v.fun + v.shop + v.subs + v.mobility + ins + loanPay;
  g.balance -= total;
  timelineItem("Kosten (Summe)", -total, "Das ist alles zusammen für diesen Monat.");

  g.lastReceipt = {
    income: g.income, rent: f.rent, utilities: f.utilities, internet: f.internet, phone: f.phone, family: f.family,
    food: v.food, fun: v.fun, shop: v.shop, subs: v.subs, mobility: v.mobility, insurance: ins, loan: loanPay,
    afterFixed: g.balance, planTotal: 0, afterPlan: g.balance
  };

  if(g.balance < g.dispoFloor){
    const diff = g.dispoFloor - g.balance;
    g.balance = g.dispoFloor;
    timelineItem("Kontosperre", -diff, "Du bist unter dem Dispo-Limit. Im echten Leben wäre das ein echtes Warnsignal.");
    toast("Kontosperre", "Du bist unter dem Dispo-Limit.");
  }

  if(g.balance > 0){
    const wantSub = g.buckets.subs.reduce((s,b)=> s + (b.plan || 0), 0);

    const safeCashTarget = g.buckets.cash < 400 ? g.plan.cash : g.plan.cash;
    const rawEtf = g.buckets.cash < 300 ? Math.floor(g.plan.etf * 0.25) : g.plan.etf;
    const want = safeCashTarget + rawEtf + wantSub;
    const can = Math.max(0, g.balance);

    const safeLimit = Math.floor(g.balance * 0.30);
    const cappedWant = Math.min(want, safeLimit);

    const factor = cappedWant > 0 ? Math.min(1, can / cappedWant) : 0;

    const payCash = Math.floor(safeCashTarget * factor);
    const payEtf = Math.floor(rawEtf * factor);

    let paidSubs = 0;
    for(const b of g.buckets.subs){
      const pay = Math.floor((b.plan || 0) * factor);
      if(pay > 0){ b.balance += pay; paidSubs += pay; }
    }

    const totalPaid = payCash + payEtf + paidSubs;
    g.balance -= totalPaid;

    if(payCash>0) timelineItem("Notgroschen", -payCash, "Rücklage für echte Notfälle.");
    if(payEtf>0) timelineItem("ETF Kauf", -payEtf, "Langfristiges Investieren.");
    if(paidSubs>0) timelineItem("Unterkonten", -paidSubs, "Sparen für konkrete Ziele.");
    timelineItem("Plan angewendet", -totalPaid, `Du konntest ${Math.round(factor*100)}% deines Plans umsetzen.`);

    g.buckets.cash += payCash;
    g.buckets.etf += payEtf;
    g.lastReceipt.planTotal = totalPaid;
    g.lastReceipt.afterPlan = g.balance;
  } else {
    timelineInfo("Plan", "Im Minus oder bei 0 € wird nicht gespart oder investiert.");
    g.lastReceipt.planTotal = 0;
    g.lastReceipt.afterPlan = g.balance;
  }

  renderAll();

  const d = DECISIONS[(g.month - 1) % DECISIONS.length];
  openChoiceModal({
    title: d.title,
    text: d.text,
    options: [
      { label: d.a.label, meta: d.a.meta, impacts: impactPills(d.a), onPick: ()=>{ applyOption(g, d.a, "Entscheidung"); continueAfterDecision(g); } },
      { label: d.b.label, meta: d.b.meta, impacts: impactPills(d.b), onPick: ()=>{ applyOption(g, d.b, "Entscheidung"); continueAfterDecision(g); } }
    ]
  });

  g.hasRunThisMonth = true;
  if(el("btnRunMonth")) el("btnRunMonth").disabled = true;
}

function continueAfterDecision(g){
  const chance = g.month <= 2 ? 0.20 : g.month <= 4 ? 0.35 : 0.50;
  const ev = maybePick(EVENTS, chance);
  if(ev){
    openEventModal({ title: ev.title, text: ev.text, onOk: ()=> ev.after(g) });
    return;
  }
  finalizeMonth(g);
}

function finalizeMonth(g){
  const mv = applyEtfMovement(g);
  timelineItem("ETF Bewegung", mv.change, `Monatsrendite: ${mv.pct>=0?"+":""}${mv.pct}%`);

  if(g.balance < 0){
    g.redMonths += 1;
    g.social = clamp(g.social - 2, 0, 100);
    g.comfort = clamp(g.comfort - 1, 0, 100);
    setSceneNote(g, "Monatsende mit Druck: Konto angespannt, Stimmung kippt leicht.");
  } else if(g.buckets.cash >= 1000) {
    g.redMonths = Math.max(0, g.redMonths - 1);
    g.social = clamp(g.social + 1, 0, 100);
    setSceneNote(g, "Monatsende wirkt stabil. Rücklage gibt sichtbar Sicherheit.");
  } else {
    g.redMonths = Math.max(0, g.redMonths - 1);
    g.social = clamp(g.social + 1, 0, 100);
    setSceneNote(g, "Monatsende okay – nicht luxuriös, aber unter Kontrolle.");
  }

  g.historyBalance.push(g.balance);
  g.historyEtf.push(g.buckets.etf);

  if(el("btnNextMonth")) el("btnNextMonth").disabled = false;
  renderAll();
  timelineInfo("Monat beendet", "Du kannst jetzt zum nächsten Monat wechseln.");
}

function nextMonth(){
  const g = state.game;
  if(!g.hasRunThisMonth) return;

  if(g.month >= 12){
    const wealth = g.balance + g.buckets.cash + g.buckets.etf + g.buckets.subs.reduce((s,b)=> s + b.balance, 0);
    openEndModal(
      "Auswertung",
      `Kontostand: ${formatEUR(g.balance)}\nNotgroschen: ${formatEUR(g.buckets.cash)}\nETF: ${formatEUR(g.buckets.etf)}\nUnterkonten: ${formatEUR(g.buckets.subs.reduce((s,b)=> s + b.balance, 0))}\n\nVermögen (vereinfacht): ${formatEUR(wealth)}\nMinus-Monate: ${g.redMonths}\nStabilität / Komfort / Soziales: ${g.stability} / ${g.comfort} / ${g.social}`
    );
    return;
  }

  g.month += 1;
  g.hasRunThisMonth = false;
  g.fixedActionsUsedThisMonth = 0;
  if(el("btnNextMonth")) el("btnNextMonth").disabled = true;
  timelineClear();
  timelineInfo(`Monat ${g.month}`, "Bereit? Jetzt wieder Einkommen, Kosten und Entscheidungen.");
  renderAll();
}

// ---------- Glossary ----------
function showGlossary(){
  if(!el("glossaryContent")) return;
  el("glossaryContent").innerHTML = `
    <div class="gItem"><div class="gTitle">Notgroschen</div><div class="gText">Rücklage für Notfälle wie kaputte Waschmaschine, Handy oder Jobverlust.</div><div class="gSmall">Idee: Erst Rücklage, dann größere Extras.</div></div>
    <div class="gItem"><div class="gTitle">ETF</div><div class="gText">Eine Form von langfristigem Investieren. Der Wert kann steigen oder fallen.</div><div class="gSmall">Im Spiel siehst du diese Schwankung jeden Monat.</div></div>
    <div class="gItem"><div class="gTitle">Dispo</div><div class="gText">Du bist im Minus auf dem Konto. Das ist oft teuer.</div><div class="gSmall">Im Spiel gibt es deshalb ein Dispo-Limit.</div></div>
    <div class="gItem"><div class="gTitle">Fixkosten</div><div class="gText">Kosten, die fast jeden Monat wiederkommen, zum Beispiel Miete oder Internet.</div><div class="gSmall">Die sollte man zuerst im Blick haben.</div></div>
  `;
  el("glossaryDrawer").classList.remove("hidden");
  el("glossaryDrawer").setAttribute("aria-hidden", "false");
}

function closeGlossary(){
  el("glossaryDrawer")?.classList.add("hidden");
  el("glossaryDrawer")?.setAttribute("aria-hidden", "true");
}

// ---------- Tooltips ----------
function bindTooltips(){
  document.querySelectorAll('.tipBtn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const box = btn.parentElement.querySelector('.tipBox');
      if(!box) return;
      const isOpen = box.classList.contains('is-open');
      document.querySelectorAll('.tipBox.is-open').forEach(x => x.classList.remove('is-open'));
      if(!isOpen) box.classList.add('is-open');
    });
  });
  document.addEventListener('click', () => {
    document.querySelectorAll('.tipBox.is-open').forEach(box => box.classList.remove('is-open'));
  });
}

// ---------- Dynamic action center + extra UI ----------
function injectActionCenterStyles(){
  if(document.getElementById("mqActionCenterStyles")) return;
  const style = document.createElement("style");
  style.id = "mqActionCenterStyles";
  style.textContent = `
    .mqActionCenter{
      margin:16px 0;
      padding:14px;
      border:1px solid rgba(15,23,42,.08);
      border-radius:18px;
      background:#fff;
      box-shadow:0 10px 30px rgba(15,23,42,.06);
    }
    .mqActionHead{display:flex;justify-content:space-between;gap:12px;align-items:center;margin-bottom:10px;flex-wrap:wrap}
    .mqActionTitle{font-weight:700}
    .mqActionSub{font-size:12px;opacity:.7}
    .mqActionGrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px}
    .mqActionBtn{
      border:1px solid rgba(15,23,42,.08);
      border-radius:14px;
      background:#fff;
      padding:12px;
      text-align:left;
      cursor:pointer;
      transition:transform .12s ease, box-shadow .12s ease, border-color .12s ease;
    }
    .mqActionBtn:hover{transform:translateY(-1px);box-shadow:0 8px 20px rgba(15,23,42,.08)}
    .mqActionBtn strong{display:block;margin-bottom:4px}
    .mqActionBtn span{font-size:12px;opacity:.75;display:block}
    .mqActionBtn[disabled]{opacity:.45;cursor:not-allowed;transform:none;box-shadow:none}
    .mqAdvisor{
      margin:12px 0 0;
      padding:10px 12px;
      border-radius:14px;
      background:#F8FAFC;
      border:1px solid rgba(15,23,42,.06);
      font-size:14px;
    }
    .mqAdvisor strong{display:block;margin-bottom:4px}
    .is-crisis .mqActionCenter{
      border-color:rgba(239,68,68,.25);
      box-shadow:0 12px 32px rgba(239,68,68,.12);
    }
  `;
  document.head.appendChild(style);
}

function ensureActionCenter(){
  if(!el("screenGame")) return;
  injectActionCenterStyles();
  let box = document.getElementById("mqActionCenter");
  if(box) return box;

  box = document.createElement("section");
  box.id = "mqActionCenter";
  box.className = "mqActionCenter";
  box.innerHTML = `
    <div class="mqActionHead">
      <div>
        <div class="mqActionTitle">Jederzeit-Aktionen</div>
        <div class="mqActionSub">Kein Event nötig: Kosten senken, Luft schaffen, Struktur ändern.</div>
      </div>
      <div class="mqActionSub" id="mqActionMeta">Vor Monatsstart nutzbar</div>
    </div>

    <div class="mqActionGrid">
      <button class="mqActionBtn" id="actCancelSubs" type="button">
        <strong>Abos kündigen</strong>
        <span>Laufende Kosten senken</span>
      </button>

      <button class="mqActionBtn" id="actSellClothes" type="button">
        <strong>Klamotten verkaufen</strong>
        <span>Einmalig Geld reinholen</span>
      </button>

      <button class="mqActionBtn" id="actSideJob" type="button">
        <strong>Nebenjob suchen</strong>
        <span>Mehr Einkommen, weniger Freizeit</span>
      </button>

      <button class="mqActionBtn" id="actWG" type="button">
        <strong>In WG ziehen</strong>
        <span>Wohnkosten drücken</span>
      </button>

      <button class="mqActionBtn" id="actRefi" type="button">
        <strong>Kredit umschulden</strong>
        <span>Rate verbessern</span>
      </button>

      <button class="mqActionBtn" id="actEmergency" type="button">
        <strong>Notfallhilfe</strong>
        <span>Einmalige Rettung im Krisenmodus</span>
      </button>
    </div>

    <div class="mqAdvisor">
      <strong>Finanz-Coach</strong>
      <div id="advisorText">Gerade keine rote Warnung. Halte den Kurs.</div>
    </div>
  `;

  const target = el("screenGame");
  target.prepend(box);

  document.getElementById("actCancelSubs").addEventListener("click", cancelSubscriptions);
  document.getElementById("actSellClothes").addEventListener("click", sellClothes);
  document.getElementById("actSideJob").addEventListener("click", startSideJob);
  document.getElementById("actWG").addEventListener("click", moveToWG);
  document.getElementById("actRefi").addEventListener("click", refinanceLoan);
  document.getElementById("actEmergency").addEventListener("click", emergencyHelp);

  return box;
}

function renderActionCenter(){
  const g = state.game;
  const box = ensureActionCenter();
  if(!box || !g) return;

  const preMonth = !g.hasRunThisMonth;
  const inCrisis = g.balance < 0 || g.redMonths >= 2;

  const setDisabled = (id, disabled) => {
    const btn = document.getElementById(id);
    if(btn) btn.disabled = !!disabled;
  };

  setDisabled("actCancelSubs", !preMonth || g.variable.subs <= 0 || g.fixedActionsUsedThisMonth >= 2);
  setDisabled("actSellClothes", !preMonth || g.soldClothesCooldown > 0 || g.fixedActionsUsedThisMonth >= 2);
  setDisabled("actSideJob", !preMonth || g.sideJob || g.sideJobUsed || g.fixedActionsUsedThisMonth >= 1);
  setDisabled("actWG", !preMonth || g.movedToWG || state.profile?.living === "wg" || g.fixedActionsUsedThisMonth >= 1);
  setDisabled("actRefi", !preMonth || !g.loan.active || g.fixedActionsUsedThisMonth >= 2);
  setDisabled("actEmergency", !preMonth || !inCrisis || g.emergencyHelpUsed);

  const meta = document.getElementById("mqActionMeta");
  if(meta){
    meta.textContent = preMonth
      ? `Aktionen vor Monat ${g.month} • genutzt: ${g.fixedActionsUsedThisMonth}/2`
      : "Aktionen sind wieder vor dem nächsten Monatsstart verfügbar";
  }
}

// ---------- View ----------
function setView(view){
  el("screenInterview")?.classList.toggle("hidden", view !== "interview");
  el("screenGame")?.classList.toggle("hidden", view !== "game");
  if(el("hudStep")) el("hudStep").textContent = view === "interview" ? "Interview" : "Spiel";
}

function startGame(){
  const profile = readProfile();
  state.profile = profile;
  avatarSalt = 0;
  state.avatarData = buildAvatarFromProfile(profile);
  state.game = newGame(profile);
  setView("game");
  ensureActionCenter();
  timelineClear();
  timelineInfo("Start", "Klick auf „Monat starten“. Dann siehst du alles Schritt für Schritt.");
  renderAll();
}

// ---------- Bind ----------
function bindInterviewLive(){
  ["path","field","living","family","style","lifeFood","lifeFun","lifeShop","lifeSubs","lifeMobility"].forEach(id => {
    const node = el(id);
    if(!node) return;
    node.addEventListener("change", updateInterviewPreview);
    node.addEventListener("input", updateInterviewPreview);
  });
}

function bind(){
  el("btnGlossaryTop")?.addEventListener("click", showGlossary);
  el("btnCloseGlossary")?.addEventListener("click", closeGlossary);
  el("btnResetTop")?.addEventListener("click", ()=> location.reload());
  el("regen")?.addEventListener("click", regenAvatar);
  el("reset")?.addEventListener("click", ()=> location.reload());
  el("start")?.addEventListener("click", startGame);
  el("btnRunMonth")?.addEventListener("click", runMonth);
  el("btnNextMonth")?.addEventListener("click", nextMonth);
  el("btnApplyPlan")?.addEventListener("click", applyPlan);
  el("btnAddBucket")?.addEventListener("click", addBucket);
  el("btnWithdrawCash")?.addEventListener("click", withdrawFromCash);
  el("btnSellEtf")?.addEventListener("click", sellEtf);
  el("btnTakeLoan")?.addEventListener("click", takeLoan);
  bindInterviewLive();
  bindTooltips();
  updateInterviewPreview();
  renderAvatarPreview();
}

document.addEventListener("DOMContentLoaded", () => {
  bind();
  setView("interview");
});
