# Guida Presentazione FitQuest Web — 10 minuti

## Struttura (timing consigliato)

| # | Sezione | Tempo | Supporto visivo |
|---|---------|------:|-----------------|
| 1 | Intro + motivazione | 1 min | — |
| 2 | Architettura + stack | 2 min | `docs/architecture.md` |
| 3 | Demo live | 3 min | App su `http://localhost` |
| 4 | Gamification: XP, rank, boss, streak | 2 min | App — pagine Progression e Dashboard |
| 5 | Infrastruttura: Docker, CI/CD | 1 min | `docs/architecture.md` |
| 6 | Scelte progettuali + conclusioni | 1 min | — |

---

## 1 · Intro + motivazione (1 min)

> "FitQuest Web è un fitness tracker che trasforma l'allenamento in un gioco di ruolo. L'idea nasce dal mio progetto mobile FitQuest su React Native: ho voluto riproporla in chiave web full-stack con autenticazione, Docker e CI/CD — i temi principali del corso."

**Punti chiave da toccare:**
- Cosa fa l'app in 2 frasi (tracker gamificato con XP, ranghi, boss, streak)
- Deriva da un progetto personale già funzionante (design e formule XP miei)
- Obiettivo: applicare l'intero stack web end-to-end, non solo il frontend

---

## 2 · Architettura + stack (2 min)

Aprire `docs/architecture.md` su GitHub (o mostrare il diagramma #1 in anteprima Mermaid).

**Script:**
> "L'architettura è three-tier classica: React SPA servita da Nginx, Express API su Node.js, PostgreSQL come database. Tutto containerizzato con Docker Compose — tre servizi, un solo comando per avviare."

**Punti da toccare:**
- Perché **PostgreSQL** e non MongoDB → dati relazionali, transazioni ACID necessarie
- Perché **JWT** e non sessioni → stateless, no session store, header-based (no CSRF)
- Perché **TypeScript** sia frontend che backend → type safety, refactoring sicuro
- Perché **Docker multi-stage** → immagini leggere, stesso ambiente ovunque
- Mostrare il diagramma ER (schema dati: 7 tabelle, relazioni chiare)

---

## 3 · Demo live (3 min)

> **Prima della demo:** `docker compose up -d` deve essere già avviato. Aprire `http://localhost` in Chrome.

### Sequenza demo (step by step)

**Step 1 — Login** (~20 sec)
- Mostrare la pagina login
- Credenziali: `fase4@fitquest.dev` / `Test1234!`
- Enfatizzare: "il token JWT è salvato in localStorage, ogni richiesta lo invia nell'header Authorization"

**Step 2 — Dashboard** (~30 sec)
- Mostrare i 7 gruppi muscolari con badge rango e barra XP
- Mostrare lo StreakBadge in alto (tier corrente, workouts this week)
- "Ogni gruppo ha un livello indipendente — puoi essere Oro al petto e Bronzo alle gambe"

**Step 3 — Nuovo workout** (~60 sec)
- Cliccare "Nuovo Workout"
- Aggiungere un esercizio (es. Panca piana — petto, pesi)
- Loggare 1-2 set: inserire reps e weight_kg
- Mostrare che l'XP appare subito dopo ogni set
- "L'XP è calcolato server-side — non si può manipolare lato client"

**Step 4 — Completare il workout** (~30 sec)
- Cliccare "Completa Workout"
- Mostrare la risposta: xpSummary, eventuali rankUps, bossUpdates
- "Questa è una singola transazione atomica: streak rollover → XP → rank-up → danno boss"

**Step 5 — Progression page** (~20 sec)
- Navigare a /progression
- Mostrare il boss fight di un gruppo a sub-rank III
- "Il boss appare solo quando sei all'ultimo sub-rank: sconfiggerlo fa salire di fascia"

---

## 4 · Gamification: meccaniche di gioco (2 min)

> "Voglio spiegare brevemente il sistema di progressione perché è il cuore del progetto."

### XP e formule (30 sec)
- 4 formule per categoria: pesi, corpo libero, isometrico, cardio
- Esempio: pesi → `reps × (weight + bodyWeight × 0.1) × difficulty × streakBonus`
- Difficoltà 1-3 dall'esercizio, streak bonus 0/+10/+20%

### Ranghi e boss (45 sec)
- 7 gruppi × 6 fasce (Bronzo→Diamante) × 3 sub-rank = 126 stati possibili
- A sub-rank III appare il boss: HP = costo rank-up della fascia corrente
- L'XP infligge danno proporzionale; boss sconfitto → rank-up + nuovo boss

### Streak settimanale (45 sec)
- ISO week (lun-dom), obiettivo personalizzabile in Settings
- Rollover lazy: avviene al primo set/complete/GET della nuova settimana
- Anti-exploit: `goal_at_week_start` snapshottato all'inizio settimana (non si può alzare l'obiettivo a fine settimana per ottenere il tier)

---

## 5 · Infrastruttura (1 min)

> "Due aspetti infrastrutturali rilevanti per il corso."

**Docker** (30 sec)
- `docker compose up --build` → 3 container pronti
- Multi-stage build: immagini ~150 MB
- Volume PostgreSQL persistente; healthcheck prima di avviare il backend

**CI/CD GitHub Actions** (30 sec)
- Pipeline su ogni push/PR a main
- 3 job: backend lint+build, frontend lint+build, docker compose build (gating)
- Se lint o TypeScript fallisce, il push viene bloccato

---

## 6 · Scelte progettuali + conclusioni (1 min)

> "Tre decisioni che mi sembrano interessanti da discutere."

1. **Transazione atomica su `/complete`** — rollover streak, XP, rank-up e boss in un unico `BEGIN/COMMIT`. Se un passo fallisce, `ROLLBACK` totale. Garantisce consistenza anche con richieste concorrenti (SELECT FOR UPDATE).

2. **Calcolo XP server-side** — il client invia solo reps/weight/seconds. Il server legge categoria, difficoltà e streak tier dal DB e calcola l'XP. Nessun dato critico arriva dal frontend.

3. **Rollover streak lazy** — invece di un cron job, il rollover avviene alla prima interazione della nuova settimana. Più semplice, nessuna dipendenza da scheduler esterno.

> "Il progetto mi ha permesso di mettere insieme tutto quello che ho imparato: architettura REST, autenticazione JWT, transazioni PostgreSQL, Docker, CI/CD. Domande?"

---

## Domande probabili dal professore

| Domanda | Risposta breve |
|---------|----------------|
| "Perché JWT e non cookie di sessione?" | Stateless, no CSRF (token in header), facile da usare con SPA |
| "Come proteggi da SQL injection?" | Prepared statements via `pg` driver — mai concatenazione di stringhe |
| "Cosa fa il middleware auth?" | Verifica JWT, estrae `userId` e lo aggiunge a `req`, altrimenti 401 |
| "Perché Docker multi-stage?" | Stage builder ha dev deps (tsc, eslint); stage runtime solo prod deps — immagine più piccola e sicura |
| "Come funziona il boss?" | Esiste una riga per utente+gruppo; HP = costo rank-up della fascia; XP del workout completato infligge danno proporzionale |
| "Cosa succede se il token scade durante una sessione?" | Il client riceve 401, `AuthContext` fa logout automatico e reindirizza al login |
| "Hai testato il codice?" | Lint + TypeScript strict su ogni commit via CI. Test unitari non inclusi (fuori scope del corso) ma `progressionService` e `streakService` sono pure functions testabili |

---

## Checklist pre-presentazione

- [ ] `docker compose up -d` avviato e `http://localhost` raggiungibile
- [ ] `http://localhost:3000/api/health` risponde `{"status":"ok"}`
- [ ] Utente `fase4@fitquest.dev` / `Test1234!` funziona (o demo@fitquest.dev)
- [ ] `docs/architecture.md` aperto su GitHub per i diagrammi
- [ ] Browser con due tab: app + architecture.md
- [ ] Font size browser aumentato per visibilità da proiettore
