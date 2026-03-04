// --- deterministic-ish random helper (seeded by profile + optional salt) ---
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

const el = (id) => document.getElementById(id);
const canvas = el("avatar");
const ctx = canvas.getContext("2d", { alpha: true });

const state = {
  salt: 0,
  profile: getProfile(),
};

function getProfile(){
  return {
    path: el("path")?.value ?? "ausbildung",
    field: el("field")?.value ?? "it",
    living: el("living")?.value ?? "wg",
    family: el("family")?.value ?? "single",
    style: el("style")?.value ?? "neutral",
  };
}

function profileSeed(p, salt=0){
  return `${p.path}|${p.field}|${p.living}|${p.family}|${p.style}|${salt}`;
}

function pick(rng, arr){ return arr[Math.floor(rng()*arr.length)]; }

// --- Pixel avatar renderer (16x16) ---
function drawAvatar(profile, salt=0){
  const seedFn = xmur3(profileSeed(profile, salt));
  const rng = mulberry32(seedFn());

  // palettes
  const skinTones = ["#F2D6CB","#E7C0A6","#D7A27F","#B97E57","#8E5A3C"];
  const hairColors = ["#1F2937","#111827","#6B4F3A","#A16207","#7C3AED","#0F766E"];
  const shirtColors = ["#2563EB","#16A34A","#F97316","#111827","#DB2777","#7C3AED"];
  const pantsColors = ["#334155","#0F172A","#475569","#1F2937"];

  const skin = pick(rng, skinTones);
  let hair = pick(rng, hairColors);
  let shirt = pick(rng, shirtColors);
  let pants = pick(rng, pantsColors);

  // style influences
  if(profile.field === "it") shirt = "#2563EB";
  if(profile.field === "pflege") shirt = "#16A34A";
  if(profile.field === "handwerk") shirt = "#F97316";
  if(profile.living === "eltern") pants = "#475569";

  // accessories influenced by family/path
  const hasBackpack = profile.path !== "job";
  const hasRing = profile.family === "partner";
  const hasToy = profile.family === "kind";

  // hair shape by style
  const hairStyle = (profile.style === "fem") ? "long" : (profile.style === "masc" ? "short" : pick(rng, ["short","cap","messy"]));

  // clear
  ctx.clearRect(0,0,16,16);

  // helpers
  function px(x,y,c){ ctx.fillStyle=c; ctx.fillRect(x,y,1,1); }
  function rect(x,y,w,h,c){ ctx.fillStyle=c; ctx.fillRect(x,y,w,h); }

  // body base (simple chibi)
  // head
  rect(5,2,6,6,skin);
  // neck
  rect(7,8,2,1,skin);

  // eyes
  px(7,5,"#111827"); px(9,5,"#111827");
  // mouth
  px(8,7,"#7C2D12");

  // hair
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
  } else { // messy
    rect(5,2,6,2,hair);
    px(4,3,hair); px(11,3,hair); px(6,4,hair); px(9,4,hair);
  }

  // torso
  rect(5,9,6,4,shirt);
  // arms
  rect(4,10,1,2,skin); rect(11,10,1,2,skin);

  // pants
  rect(5,13,6,3,pants);
  // shoes
  px(6,15,"#0B1220"); px(9,15,"#0B1220");

  // accessories
  if(hasBackpack){
    rect(4,9,1,4,"#334155");
    rect(11,9,1,4,"#334155");
  }
  if(hasRing){
    px(11,11,"#FBBF24");
  }
  if(hasToy){
    px(4,11,"#DB2777");
  }

  // little badge by field
  if(profile.field === "it") px(10,10,"#22C55E");
  if(profile.field === "pflege") px(10,10,"#EF4444");
  if(profile.field === "handwerk") px(10,10,"#FBBF24");
}

// --- Story generator + typewriter ---
function buildStory(p){
  const pathText = p.path === "ausbildung" ? "in der Ausbildung" : (p.path === "studium" ? "im Studium" : "im Job");
  const fieldText = ({it:"in der IT", pflege:"in der Pflege", handwerk:"im Handwerk", buero:"im Büro", einzelhandel:"im Einzelhandel"})[p.field] || "im Beruf";
  const livingText = ({wg:"in einer WG", miete:"in einer Mietwohnung", eltern:"bei deinen Eltern", eigentum:"in deinem Eigentum"})[p.living] || "irgendwo";
  const familyText = (p.family === "single") ? "Du bist allein unterwegs." : (p.family === "partner" ? "Du lebst mit Partner:in." : "Du hast Verantwortung für ein Kind.");
  const hook = "Dein Ziel: stabil bleiben, Rücklagen aufbauen und nicht von Überraschungen zerlegt werden.";

  return [
    `Du bist ${pathText} ${fieldText} und wohnst ${livingText}.`,
    familyText,
    hook
  ].join(" ");
}

let typingController = null;

async function typeText(node, text) {

  if (typingController) {
    typingController.abort();
  }

  typingController = new AbortController();
  const signal = typingController.signal;

  node.textContent = "";

  const speed = 14;

  for (let i = 0; i < text.length; i++) {

    if (signal.aborted) return;

    node.textContent += text[i];

    await new Promise(r => setTimeout(r, speed));
  }
}

function refresh(){
  state.profile = getProfile();
  drawAvatar(state.profile, state.salt);
  typeText(el("storyText"), buildStory(state.profile));
}

// wiring
["path","field","living","family","style"].forEach(id => {
  el(id).addEventListener("change", refresh);
});
el("regen").addEventListener("click", () => {
  state.salt++;
  refresh();
});
el("start").addEventListener("click", () => {
  // später: in die Spielphase wechseln
  alert("Next step: Monats-Dashboard + Fixkosten + Entscheidungen (kommt als nächster Baustein).");
});

// init
refresh();
