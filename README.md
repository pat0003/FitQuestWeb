# FitQuest Web — Fitness Tracker Gamificato

> Progetto d'esame — Programmazione Web — UNICAM
> Autore: Patrik Rossi — Prof. Lillini

## Descrizione

FitQuest Web e un fitness tracker che trasforma l'allenamento in un'avventura RPG. Ogni serie completata in palestra genera punti esperienza (XP), che fanno avanzare i 7 gruppi muscolari attraverso un sistema di ranghi (da Bronzo a Diamante). A ogni passaggio di fascia un boss blocca la progressione: l'XP accumulato infligge danno e, una volta sconfitto, il giocatore sale di rango. Una streak settimanale premia la costanza con bonus XP crescenti.

## Architettura

Architettura three-tier classica, completamente containerizzata con Docker:

```
Browser  ──▶  Nginx (SPA React)  ──▶  Express API (Node.js)  ──▶  PostgreSQL
  :80                                     :3000                      :5432
```

Diagrammi dettagliati (deploy, ER, flusso workout, progressione, CI/CD): [docs/architecture.md](docs/architecture.md)

## Stack tecnologico

| Layer      | Tecnologia             | Motivazione                                           |
|------------|------------------------|-------------------------------------------------------|
| Frontend   | React 18 + TypeScript  | Component-based UI, type safety                       |
| Styling    | Tailwind CSS 3         | Utility-first, nessun CSS custom da mantenere         |
| Build      | Vite 6                 | HMR veloce, build ottimizzata                         |
| Backend    | Express + JavaScript   | Maturo, ampio ecosistema, esecuzione diretta con Node  |
| Database   | PostgreSQL 16          | Relazionale, transazioni ACID, prepared statements    |
| Auth       | JWT (jsonwebtoken)     | Stateless, nessun session store server-side            |
| Password   | bcrypt (12 rounds)     | Hashing sicuro, resistente a brute-force              |
| Container  | Docker + Compose       | Ambiente riproducibile, deploy semplificato            |
| CI/CD      | GitHub Actions         | Build + Docker build automatici                        |

## Prerequisiti

- [Docker](https://docs.docker.com/get-docker/) e Docker Compose
- Node.js 20+ (solo per sviluppo locale senza Docker)

## Quick Start (con Docker)

```bash
git clone https://github.com/patrikRossi/FitQuestWeb.git
cd FitQuestWeb
docker compose up --build -d
```

Aprire **http://localhost** nel browser.

Per fermare:

```bash
docker compose down
```

Per reset completo (cancella dati):

```bash
docker compose down -v
docker compose up --build -d
```

## Sviluppo locale (senza Docker)

Richiede Node.js 20+ e PostgreSQL 16 già avviato sulla porta 5432.

**1. Database** — Creare il database e caricare schema + dati:

```bash
createdb -U postgres fitquest
psql -U postgres -d fitquest -f database/init.sql
psql -U postgres -d fitquest -f database/seed_exercises.sql
psql -U postgres -d fitquest -f database/03_alter.sql
psql -U postgres -d fitquest -f database/seed_demo_users.sql
```

**2. Backend**

```bash
cd backend
cp .env.example .env   # i valori di default funzionano per sviluppo locale
npm install
npm run dev
```

Il server parte su `http://localhost:3000` con watch mode (riavvio automatico su modifica).

Il file `.env.example` contiene tutti i valori preconfigurati per l'ambiente locale. L'unica variabile da cambiare in produzione è `JWT_SECRET`.

**3. Frontend**

```bash
cd frontend
npm install
npm run dev
```

Il dev server Vite parte su `http://localhost:5173` con HMR attivo.

## Credenziali di prova

Gli utenti demo sono pre-creati con `docker compose up`:

| Email                    | Password    | Note                        |
|--------------------------|-------------|------------------------------|
| `demo@fitquest.dev`      | `Demo1234!` | Utente demo principale       |
| `fase3@fitquest.dev`     | `Test1234!` | Utente base con workout      |
| `fase4@fitquest.dev`     | `Test1234!` | Utente con progressione      |

Oppure registrare un nuovo account dalla pagina di registrazione.

## Struttura del progetto

```
FitQuestWeb/
├── backend/
│   ├── src/
│   │   ├── index.js              # Entry point Express
│   │   ├── config.js             # Variabili d'ambiente
│   │   ├── db/pool.js            # Connessione PostgreSQL
│   │   ├── middleware/
│   │   │   ├── auth.js           # JWT verification
│   │   │   └── errorHandler.js   # Error handler + asyncHandler
│   │   ├── routes/
│   │   │   ├── auth.js           # Register + Login
│   │   │   ├── user.js           # Profilo utente
│   │   │   ├── exercises.js      # Libreria esercizi
│   │   │   ├── workouts.js       # Workout + Set + Complete
│   │   │   ├── progression.js    # Progressione gruppi muscolari
│   │   │   ├── bosses.js         # Stato boss
│   │   │   └── streak.js         # Streak settimanale
│   │   └── services/
│   │       ├── xpCalculator.js         # Formule XP per categoria
│   │       ├── xpCalculator.test.js    # Unit test
│   │       ├── progressionService.js   # Rank-up logic
│   │       ├── progressionService.test.js # Unit test
│   │       ├── bossService.js          # Boss names + spawn
│   │       ├── streakService.js        # Streak rollover logic
│   │       └── streakService.test.js   # Unit test
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── DashboardPage.tsx  # Overview + streak
│   │   │   ├── WorkoutPage.tsx    # Workout flow
│   │   │   ├── ProgressionPage.tsx # Rank + boss
│   │   │   ├── SettingsPage.tsx   # Profilo utente
│   │   │   ├── LoginPage.tsx      # Login
│   │   │   └── RegisterPage.tsx   # Registrazione
│   │   ├── components/
│   │   │   ├── XPBar.tsx          # Barra XP animata
│   │   │   ├── RankBadge.tsx      # Badge rango
│   │   │   ├── BossCard.tsx       # Card boss fight
│   │   │   ├── StreakBadge.tsx     # Badge streak
│   │   │   ├── ExerciseSelector.tsx
│   │   │   └── SetLogger.tsx      # Form log serie
│   │   ├── api/                   # HTTP client + endpoint wrappers
│   │   ├── auth/                  # AuthContext + PrivateRoute
│   │   └── types/index.ts
│   ├── nginx.conf                 # Configurazione Nginx
│   └── Dockerfile                 # Multi-stage build
├── database/
│   ├── init.sql                   # Schema DDL
│   ├── seed_exercises.sql         # 125 esercizi pre-popolati
│   └── 03_alter.sql               # Migrazioni
├── docs/
│   ├── api.md                     # Documentazione API
│   ├── architecture.md            # Diagrammi Mermaid
│   ├── presentation-guide.md     # Guida presentazione
│   └── reference/                 # Codice originale progetto mobile
├── .github/workflows/ci.yml      # Pipeline CI/CD
├── docker-compose.yml             # Orchestrazione 3 servizi
├── DEPLOY.md                      # Guida deploy locale + cloud
└── README.md
```

## API Documentation

Documentazione completa di tutti gli endpoint REST: **[docs/api.md](docs/api.md)**

Tabella riassuntiva:

| Metodo | Endpoint | Auth | Descrizione |
|--------|----------|:----:|-------------|
| `GET`  | `/api/health` | — | Health check |
| `POST` | `/api/auth/register` | — | Registrazione |
| `POST` | `/api/auth/login` | — | Login |
| `GET`  | `/api/user/profile` | JWT | Profilo utente |
| `PATCH`| `/api/user/profile` | JWT | Aggiorna profilo |
| `GET`  | `/api/exercises` | JWT | Libreria esercizi (filtri opzionali) |
| `POST` | `/api/workouts` | JWT | Inizia workout |
| `GET`  | `/api/workouts` | JWT | Storico workout |
| `GET`  | `/api/workouts/:id` | JWT | Dettaglio workout |
| `POST` | `/api/workouts/:id/exercises` | JWT | Aggiungi esercizio |
| `POST` | `/api/workouts/:id/exercises/:weId/sets` | JWT | Logga set (XP server-side) |
| `POST` | `/api/workouts/:id/complete` | JWT | Completa workout (atomico) |
| `GET`  | `/api/progress` | JWT | Progressione tutti i gruppi |
| `GET`  | `/api/progress/:group` | JWT | Progressione singolo gruppo |
| `GET`  | `/api/bosses` | JWT | Stato boss |
| `GET`  | `/api/streak` | JWT | Streak settimanale |

## Scelte progettuali

### JWT vs Sessioni
JWT stateless: nessun session store lato server, scalabilita orizzontale naturale. Il token (24h) viene inviato nell'header `Authorization: Bearer`, non in cookie — elimina il rischio CSRF.

### PostgreSQL vs MongoDB
Dati fortemente relazionali (utenti → workout → esercizi → set, progressione per gruppo muscolare). Le transazioni ACID sono essenziali per la consistenza del sistema di progressione (rank-up + boss in transazione atomica). Prepared statements eliminano SQL injection.

### Backend JavaScript (no TypeScript)
Il backend usa JavaScript puro con ES modules. Nessun step di compilazione: il codice gira direttamente con `node src/index.js`. In sviluppo, Node.js 20 offre `--watch` nativo per il riavvio automatico. Il frontend mantiene TypeScript perche Vite lo gestisce in modo trasparente senza configurazione aggiuntiva.

### Docker
Dockerfile leggero per il backend (single-stage, copia sorgenti JS + `npm ci`). Multi-stage per il frontend (build React con Vite → serve con Nginx Alpine). Compose orchestra i 3 servizi con healthcheck e dipendenze.

### Calcolo XP server-side
L'XP viene calcolato esclusivamente nel backend per evitare manipolazioni client-side. Quattro formule diverse in base alla categoria dell'esercizio, con moltiplicatore streak.

### Transazioni atomiche
Il completamento di un workout esegue in una singola transazione: rollover streak → incremento contatore settimanale → applicazione XP per gruppo → rank-up → danno boss → spawn nuovo boss. Se un passo fallisce, tutto viene annullato (ROLLBACK). Anche la registrazione utente usa una transazione: creazione utente, inizializzazione progressione (7 gruppi muscolari), spawn boss iniziali (7) e stato streak vengono committati atomicamente.

### Error handling centralizzato
Tutte le route async sono wrappate da un `asyncHandler` che intercetta le Promise rejected e le instrada verso l'error handler centralizzato di Express. Questo evita che un errore non gestito in una route async crashi il processo Node.js (limitazione di Express 4 che non cattura errori da async middleware).

## Diagrammi

Tutti i diagrammi sono in formato Mermaid e renderizzano nativamente su GitHub:

- Architettura three-tier
- Deploy Docker Compose
- Schema ER
- Flusso workout completo
- Sistema di progressione
- Pipeline CI/CD

**[docs/architecture.md](docs/architecture.md)**

## Test

Il backend include unit test per i tre services principali, eseguiti con il test runner nativo di Node.js 20 (`node:test`). Zero dipendenze aggiuntive.

```bash
cd backend
npm test
```

| File test | Service testato | Copertura |
|-----------|----------------|-----------|
| `xpCalculator.test.js` | Formule XP (4 categorie) + validazione input | 17 test |
| `progressionService.test.js` | Costi rank, avanzamento XP, boss fight, immutabilita | 22 test |
| `streakService.test.js` | Coefficienti streak, date ISO, rollover settimanale | 15 test |

## CI/CD

Pipeline GitHub Actions (`.github/workflows/ci.yml`) su ogni push/PR verso `main`:

```
Backend Job          Frontend Job
  npm ci               npm ci
  syntax check         vite build
  unit test (54)
       ↓                    ↓
       └──── Docker Job ────┘
             docker compose build
```

Tutti i job usano Node.js 20 con cache npm.

## Deploy cloud

Guida completa per deploy su Railway (o altro provider): **[DEPLOY.md](DEPLOY.md)**

Include: setup PostgreSQL, variabili d'ambiente, CORS multi-origin, troubleshooting.

## Trasparenza — Uso di AI

Il progetto e stato sviluppato con l'assistenza di Claude (Anthropic) come strumento di sviluppo:

- **Progettazione originale dell'autore**: game design, meccaniche di gioco, formule XP, scelte architetturali, decisioni tecnologiche, struttura dati
- **AI come strumento**: generazione di codice boilerplate, implementazione da specifiche dettagliate, debugging, refactoring
- **Codice derivato**: la logica di gioco (formule XP, progressione, streak) e adattata dal progetto personale FitQuest (app mobile React Native), anch'esso dell'autore

Ogni componente del codice puo essere spiegato all'orale — se un pezzo generato non e chiaro, viene riscritto o studiato prima di includerlo.

## Autore

**Patrik Rossi** — UNICAM
Corso: Programmazione Web — Prof. Lillini
