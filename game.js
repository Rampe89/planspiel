<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>MoneyQuest – Planspiel</title>
  <link rel="stylesheet" href="style.css" />
</head>
<body>
  <main class="app">
    <!-- TOP HUD -->
    <header class="hud">
      <div class="hudLeft">
        <div class="logo">
          <span class="logoDot"></span>
          <span class="logoText">MoneyQuest</span>
        </div>
        <div class="hudChip" id="hudStep">Interview</div>
      </div>

      <div class="hudRight">
        <button class="hudBtn" id="btnGlossaryTop" type="button" aria-label="Begriffe öffnen">ℹ️ Begriffe</button>
        <button class="hudBtn ghost" id="btnResetTop" type="button" aria-label="Reset">↺ Reset</button>
      </div>
    </header>

    <!-- SCREEN: INTERVIEW -->
    <section class="screen" id="screenInterview">
      <div class="layout">
        <div class="panel side">
          <div class="sideCard">
            <div class="avatarFrame">
              <canvas id="avatar" width="16" height="16" aria-label="Pixel Avatar"></canvas>
            </div>

            <div class="sideButtons">
              <button id="regen" class="btn soft" type="button">🎲 Avatar neu</button>
              <button id="reset" class="btn soft ghost" type="button">↺ Profil Reset</button>
            </div>

            <div class="bubble">
              <div class="bubbleTitle">Dein Start</div>
              <div class="bubbleText" id="storyText"></div>
            </div>
          </div>
        </div>

        <div class="panel main">
          <div class="titleBlock">
            <h1>Erstell dein Profil</h1>
            <p class="sub">
              Kurz & knackig. Daraus machen wir Einkommen + realistische Fixkosten.
            </p>
          </div>

          <div class="formGrid">
            <div class="field">
              <label>Lebensweg</label>
              <select id="path">
                <option value="ausbildung">Ausbildung</option>
                <option value="studium">Studium</option>
                <option value="job">Direkt im Job</option>
              </select>
            </div>

            <div class="field">
              <label>Berufsfeld</label>
              <select id="field">
                <option value="it">IT</option>
                <option value="pflege">Pflege</option>
                <option value="handwerk">Handwerk</option>
                <option value="buero">Büro</option>
                <option value="einzelhandel">Einzelhandel</option>
              </select>
            </div>

            <div class="field">
              <label>Wohnsituation</label>
              <select id="living">
                <option value="wg">WG</option>
                <option value="miete">Mietwohnung</option>
                <option value="eltern">Bei Eltern</option>
                <option value="eigentum">Eigentum</option>
              </select>
            </div>

            <div class="field">
              <label>Familie</label>
              <select id="family">
                <option value="single">Single</option>
                <option value="partner">Partner:in</option>
                <option value="kind">Kind(er)</option>
              </select>
            </div>

            <div class="field">
              <label>Stil</label>
              <select id="style">
                <option value="neutral">Neutral</option>
                <option value="masc">Maskulin</option>
                <option value="fem">Feminin</option>
              </select>
            </div>
          </div>

          <div class="ctaCard">
            <div class="ctaLeft">
              <div class="ctaTitle">Ziel (12 Monate)</div>
              <div class="ctaText">
                <strong>Notgroschen ≥ 1.000 €</strong> & möglichst <strong>keine roten Monate</strong> (Kontostand nie negativ).
              </div>
            </div>
            <button id="start" class="btn primary" type="button">Starten →</button>
          </div>

          <div class="microRow">
            <span class="microPill">💡 Tipp: Begriffe oben öffnen, wenn ETF/Rate/Zinsen unklar sind.</span>
          </div>
        </div>
      </div>
    </section>

    <!-- SCREEN: GAME -->
    <section class="screen hidden" id="screenGame">
      <!-- GAME HUD -->
      <div class="gameHud">
        <div class="statCard">
          <div class="statLabel">Monat</div>
          <div class="statValue"><span id="gMonth">1</span><span class="muted">/12</span></div>
        </div>
        <div class="statCard">
          <div class="statLabel">Kontostand</div>
          <div class="statValue" id="gBalance">0 €</div>
          <div class="statTiny" id="gBalanceHint"></div>
        </div>
        <div class="statCard">
          <div class="statLabel">Netto</div>
          <div class="statValue" id="gIncome">0 €</div>
          <div class="statTiny">Einkommen/Monat</div>
        </div>

        <div class="statCard grow">
          <div class="statLabelRow">
            <span class="statLabel">Stabilität</span>
            <span class="statTiny" id="gStabilityText">—</span>
          </div>
          <div class="meter">
            <div class="meterFill" id="gStabilityFill"></div>
          </div>
          <div class="statTiny">0 = Chaos, 100 = stabil</div>
        </div>
      </div>

      <div class="questRow">
        <div class="questCard">
          <div class="questTitle">Quest</div>
          <div class="questText" id="gQuestText">—</div>
          <div class="questBar">
            <div class="questFill" id="gQuestFill"></div>
          </div>
        </div>

        <div class="kpis">
          <div class="kpi">
            <div class="kpiLabel">Notgroschen</div>
            <div class="kpiValue" id="gCash">0 €</div>
          </div>
          <div class="kpi">
            <div class="kpiLabel">ETF-Depot</div>
            <div class="kpiValue" id="gEtf">0 €</div>
          </div>
        </div>
      </div>

      <div class="layout gameLayout">
        <!-- LEFT: TIMELINE -->
        <div class="panel main">
          <div class="panelHead">
            <h2>Monats-Timeline</h2>
            <div class="panelButtons">
              <button class="btn soft" id="btnRunMonth" type="button">Monat starten</button>
              <button class="btn soft ghost" id="btnNextMonth" type="button" disabled>Nächster Monat →</button>
            </div>
          </div>

          <div class="tinyHelp" id="gExplain">
            Ablauf: Einkommen → Fixkosten → Versicherungen/Kredit → dein Sparplan → Entscheidungskarte → Ereignis → ETF-Schwankung.
          </div>

          <div class="timeline" id="gLog"></div>
        </div>

        <!-- RIGHT: DECISIONS -->
        <div class="panel side">
          <div class="stack">
            <div class="cardBox">
              <div class="boxHead">
                <h3>Sparplan</h3>
                <span class="chip">kurz & klar</span>
              </div>
              <p class="small">
                Du legst Monatsbeträge fest. Wenn nach Fixkosten zu wenig übrig ist, wird automatisch gekürzt.
              </p>

              <div class="field">
                <label>Notgroschen (€/Monat)</label>
                <input id="inpCash" type="number" min="0" step="10" value="100" />
                <div class="hintLine">Notgroschen = sofort verfügbar für Notfälle.</div>
              </div>

              <div class="field">
                <label>ETF (€/Monat)</label>
                <input id="inpEtf" type="number" min="0" step="10" value="100" />
                <div class="hintLine">ETF = „Korb“ aus vielen Aktien. Schwankt monatlich.</div>
              </div>

              <div class="subhead">Unterkonten</div>
              <p class="small">Spar-Töpfe für Ziele (Urlaub, Fahrrad, PC…).</p>

              <div id="bucketList" class="bucketList"></div>

              <div class="bucketAdd">
                <input id="newBucketName" type="text" maxlength="18" placeholder="z. B. Urlaub" />
                <button id="btnAddBucket" class="btn soft ghost" type="button">+ Konto</button>
              </div>

              <button class="btn primary" id="btnApplyPlan" type="button">Plan speichern</button>
            </div>

            <div class="cardBox">
              <div class="boxHead">
                <h3>Versicherungen</h3>
                <span class="chip">Wissen</span>
              </div>
              <p class="small">
                Versicherungen kosten monatlich Geld. Manche sind sinnvoll – manche eher Marketing.
              </p>
              <div id="insuranceList" class="insuranceList"></div>
            </div>

            <div class="cardBox">
              <div class="boxHead">
                <h3>Kredit</h3>
                <span class="chip warn">Risiko</span>
              </div>
              <p class="small">
                Kredit = sofort Geld, aber jeden Monat Rate + Zinsen. Kann helfen – kann dich auch festnageln.
              </p>

              <div class="field">
                <label>Betrag</label>
                <input id="loanAmount" type="number" min="0" step="100" value="0" />
              </div>
              <div class="field">
                <label>Laufzeit (Monate)</label>
                <input id="loanMonths" type="number" min="6" step="6" value="12" />
              </div>
              <div class="field">
                <label>Zins (p. a.)</label>
                <input id="loanApr" type="number" min="0" step="0.5" value="8" />
              </div>

              <button class="btn soft ghost" id="btnTakeLoan" type="button">Kredit aufnehmen</button>
              <div class="small" id="loanStatus">kein Kredit</div>
            </div>
          </div>
        </div>
      </div>

      <div class="footerNote" id="goalNote"></div>
    </section>

    <!-- MODAL: CHOICE -->
    <div class="modal hidden" id="choiceModal" role="dialog" aria-modal="true">
      <div class="modalCard">
        <div class="modalTitle" id="choiceTitle">Entscheidung</div>
        <div class="modalText" id="choiceText"></div>

        <div class="choiceGrid" id="choiceActions"></div>

        <div class="modalTiny" id="choiceTiny">
          Jede Runde hat eine Entscheidung. Das ist der Spaß-Teil 🙂
        </div>
      </div>
    </div>

    <!-- MODAL: EVENT -->
    <div class="modal hidden" id="eventModal" role="dialog" aria-modal="true">
      <div class="modalCard">
        <div class="modalTitle" id="eventTitle">Ereignis</div>
        <div class="modalText" id="eventText"></div>

        <div class="modalActions">
          <button class="btn primary" id="eventOk" type="button">OK</button>
        </div>
      </div>
    </div>

    <!-- DRAWER: GLOSSARY -->
    <div class="drawer hidden" id="glossaryDrawer" aria-hidden="true">
      <div class="drawerCard">
        <div class="drawerHead">
          <strong>Begriffe – kurz erklärt</strong>
          <button class="hudBtn ghost" id="btnCloseGlossary" type="button">✕</button>
        </div>
        <div class="drawerBody" id="glossaryContent"></div>
      </div>
    </div>

    <!-- TOAST -->
    <div class="toast hidden" id="toast">
      <div class="toastTitle" id="toastTitle">Achievement</div>
      <div class="toastText" id="toastText"></div>
    </div>
  </main>

  <script src="game.js"></script>
</body>
</html>
