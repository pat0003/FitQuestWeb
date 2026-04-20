# FIT QUEST WEB — Specifica Tecnica di Sviluppo v1.0

> **Autore**: [Il tuo nome]
> **Versione**: 1.0 — Aprile 2026
> **Scopo**: Documento di progettazione e istruzioni di sviluppo per il progetto d'esame.
> Serve come specifica per l'implementazione (Claude Code) e come documentazione di consegna.
> **Origine**: Versione cloud-native derivata dal progetto personale FitQuest (app mobile React Native).
> La logica di gioco, le formule XP, e lo schema dati sono adattati dal progetto originale.

---

## INDICE

1. [Overview e obiettivi](#1-overview-e-obiettivi)
2. [Trasparenza e policy AI](#2-trasparenza-e-policy-ai)
3. [Stack tecnologico](#3-stack-tecnologico)
4. [Architettura](#4-architettura)
5. [Data model — PostgreSQL](#5-data-model--postgresql)
6. [Autenticazione — JWT](#6-autenticazione--jwt)
7. [API REST — Endpoints](#7-api-rest--endpoints)
8. [Meccaniche di gioco](#8-meccaniche-di-gioco)
9. [Frontend — React SPA](#9-frontend--react-spa)
10. [Docker e configurazione YAML](#10-docker-e-configurazione-yaml)
11. [CI/CD — GitHub Actions](#11-cicd--github-actions)
12. [Deploy — Locale e Cloud](#12-deploy--locale-e-cloud)
13. [Fasi di sviluppo](#13-fasi-di-sviluppo)
14. [Template README per consegna](#14-template-readme-per-consegna)
15. [Regole per Claude Code](#15-regole-per-claude-code)

---

## 1. OVERVIEW E OBIETTIVI

- **Nome**: FIT QUEST WEB
- **Tipo**: Fitness tracker gamificato con sistema RPG — versione web cloud-native
- **Contesto**: Progetto d'esame individuale per il corso di [Nome corso] — UNICAM
- **Professore**: Christian Lillini (christian.lillini@unicam.it)
- **Piattaforma**: Applicazione web (browser desktop e mobile)
- **Architettura**: Three-tier (Frontend SPA + Backend API + Database)
- **Deployment**: Locale via Docker Compose + Cloud (Railway/Fly.io)

### 1.1 Cosa fa l'app

FitQuest Web è un fitness tracker che trasforma l'allenamento in un'esperienza RPG. L'utente registra i propri workout e guadagna XP (punti esperienza) calcolati in base al volume di lavoro reale. Gli XP alimentano un sistema di progressione per 7 gruppi muscolari, ciascuno con ranghi da Bronzo a Diamante. Un sistema di streak settimanale premia la costanza con bonus XP, e boss da sconfiggere forniscono obiettivi a medio termine.

### 1.2 Scope per l'esame (Medium)

Meccaniche incluse:
- Registrazione/login utente con JWT
- Libreria esercizi pre-popolata (125 esercizi)
- Logging workout con calcolo XP automatico (4 formule: pesi, corpo libero, isometrico, cardio)
- Progressione 7 gruppi muscolari × 18 ranghi (6 fasce × 3 sotto-livelli)
- Streak settimanale con 3 tier di bonus
- Boss semplificati (7 boss, uno per gruppo muscolare, legati al rank-up)
- Dashboard con overview progressi

Meccaniche escluse (presenti nel progetto mobile ma fuori scope):
- Sistema medaglie/achievement (48 medaglie)
- Personal record tracking
- Mobilità/stretching e punti zen
- Notifiche push
- Asset SVG elaborati e animazioni complesse

---

## 2. TRASPARENZA E POLICY AI

> **REGOLA FISSA DEL PROGETTO**: Ogni uso di AI deve essere dichiarato e compreso.

### 2.1 Dichiarazione per il README

Il progetto è stato sviluppato con l'assistenza di Claude (Anthropic) come strumento di sviluppo. In particolare:

- **Progettazione originale dell'autore**: game design, meccaniche di gioco, formule XP, scelte architetturali, decisioni tecnologiche, struttura dati
- **AI come strumento**: generazione di codice boilerplate, implementazione da specifiche dettagliate, debugging, refactoring
- **Codice derivato**: la logica di gioco (formule XP, progressione, streak) è adattata dal progetto personale FitQuest (app mobile React Native), anch'esso dell'autore

### 2.2 Regola di comprensione

Ogni componente del codice deve poter essere spiegato all'orale. Se un pezzo di codice generato non è chiaro, va riscritto o studiato prima di includerlo. L'obiettivo non è solo che il codice funzioni, ma che l'autore sappia:
- **Perché** ogni tecnologia è stata scelta
- **Come** ogni componente funziona
- **Cosa** succede ad ogni livello dell'architettura

### 2.3 Crediting nel codice

```
// Adattato dal progetto personale FitQuest (React Native)
// Formula originale dell'autore — vedi Game Design Spec v1.5
```

Usare commenti di questo tipo dove il codice è derivato dal progetto mobile.

---

## 3. STACK TECNOLOGICO

| Layer | Tecnologia | Motivazione |
|-------|-----------|-------------|
| Frontend | React 18 + Vite + TypeScript | SPA moderna, hot reload veloce, tipizzazione forte |
| Styling | Tailwind CSS | Utility-first, dark mode nativo, prototipazione rapida |
| Backend | Node.js + Express + TypeScript | Stessa lingua del frontend, framework maturo per API REST |
| Database | PostgreSQL 16 | Standard cloud-native, SQL relazionale, supporto JSONB |
| ORM/Query | pg (node-postgres) | Driver diretto, prepared statements per sicurezza |
| Auth | JWT (jsonwebtoken) + bcrypt | Stateless, scalabile, argomento del corso |
| Container | Docker + docker-compose | Ambiente riproducibile, deployment standard |
| CI/CD | GitHub Actions | Integrazione nativa con repo, YAML declarativo |
| Cloud | Railway oppure Fly.io | Free tier sufficiente per demo, deploy da Dockerfile |

### 3.1 Struttura cartelle del progetto

```
fitquest-web/
├── README.md                    # Documentazione principale
├── docs/
│   ├── architecture.md          # Diagrammi architettura
│   ├── api.md                   # Documentazione API
│   └── screenshots/             # Screenshot per README
├── docker-compose.yml           # Orchestrazione locale
├── docker-compose.prod.yml      # Variante produzione (opzionale)
├── .github/
│   └── workflows/
│       └── ci.yml               # Pipeline CI/CD
│
├── frontend/
│   ├── Dockerfile
│   ├── nginx.conf               # Configurazione Nginx per SPA
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   ├── index.html
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── api/                 # Client HTTP, interceptor JWT
│       │   └── client.ts
│       ├── auth/                # Context, hook, guard
│       │   ├── AuthContext.tsx
│       │   └── PrivateRoute.tsx
│       ├── components/          # Componenti riutilizzabili
│       │   ├── Layout.tsx
│       │   ├── Navbar.tsx
│       │   ├── XPBar.tsx
│       │   ├── BossCard.tsx
│       │   ├── StreakBadge.tsx
│       │   └── ExerciseSelector.tsx
│       ├── pages/               # Schermate principali
│       │   ├── LoginPage.tsx
│       │   ├── RegisterPage.tsx
│       │   ├── DashboardPage.tsx
│       │   ├── WorkoutPage.tsx
│       │   ├── ProgressionPage.tsx
│       │   └── SettingsPage.tsx
│       ├── hooks/               # Custom hooks
│       │   └── useWorkout.ts
│       ├── types/               # Tipi TypeScript condivisi
│       │   └── index.ts
│       └── utils/               # Utility pure
│           └── xp.ts
│
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts             # Entry point, setup Express
│       ├── config.ts            # Variabili ambiente, costanti
│       ├── middleware/
│       │   ├── auth.ts          # Middleware JWT
│       │   ├── cors.ts          # Configurazione CORS
│       │   └── errorHandler.ts  # Error handling centralizzato
│       ├── routes/
│       │   ├── auth.ts          # POST /auth/register, /auth/login
│       │   ├── exercises.ts     # GET /exercises
│       │   ├── workouts.ts      # CRUD workout + sets
│       │   ├── progress.ts      # GET progressione gruppi
│       │   ├── streak.ts        # GET streak corrente
│       │   └── bosses.ts        # GET boss attivi
│       ├── services/            # Business logic
│       │   ├── xpCalculator.ts  # Formule XP (da FitQuest)
│       │   ├── progressionService.ts
│       │   ├── streakService.ts
│       │   └── bossService.ts
│       ├── db/
│       │   ├── pool.ts          # Connection pool PostgreSQL
│       │   ├── migrations/      # SQL migrations
│       │   │   └── 001_init.sql
│       │   └── seed.ts          # Seed libreria esercizi
│       └── types/
│           └── index.ts         # Tipi condivisi
│
└── database/
    └── init.sql                 # Script inizializzazione DB (usato da Docker)
```

---

## 4. ARCHITETTURA

### 4.1 Architettura three-tier

```
┌─────────────┐     HTTP/REST      ┌──────────────┐       SQL        ┌──────────────┐
│             │    (JSON + JWT)     │              │   (pg driver)    │              │
│  Frontend   │ ◄───────────────► │   Backend    │ ◄──────────────► │  PostgreSQL  │
│  (React)    │    porta 5173      │  (Express)   │    porta 5432    │              │
│  Nginx :80  │    (dev) / :80     │   :3000      │                  │              │
│             │                    │              │                  │              │
└─────────────┘                    └──────────────┘                  └──────────────┘
     Docker                              Docker                          Docker
   container 1                         container 2                     container 3
```

### 4.2 Flusso di una richiesta tipica

1. L'utente interagisce con la SPA React nel browser
2. Il frontend invia una richiesta HTTP con JWT nell'header `Authorization: Bearer <token>`
3. Il backend Express riceve la richiesta, il middleware `auth.ts` verifica il JWT
4. Il route handler chiama il service appropriato (es. `xpCalculator.ts`)
5. Il service esegue query parametrizzate (prepared statements) verso PostgreSQL
6. La risposta JSON torna al frontend, che aggiorna lo stato React

### 4.3 Sicurezza (argomenti del corso coperti)

| Minaccia | Contromisura | Implementazione |
|----------|-------------|-----------------|
| Password in chiaro | Hashing con salt | bcrypt (12 rounds) |
| SQL Injection | Prepared statements | Query parametrizzate pg |
| XSS | Sanitizzazione | React escaping nativo + DOMPurify se necessario |
| CSRF | Token-based auth | JWT in header (non cookie) |
| CORS | Whitelist origini | Middleware cors con origini specificate |
| Brute force login | Rate limiting | express-rate-limit |

---

## 5. DATA MODEL — POSTGRESQL

### 5.1 Schema (adattato da FitQuest schema.sql)

```sql
-- ============================================================
-- FIT QUEST WEB — Database Schema
-- Adattato dal progetto personale FitQuest (React Native)
-- ============================================================

-- Utenti (NUOVO — non presente nel progetto mobile)
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username        VARCHAR(50) UNIQUE NOT NULL,
    email           VARCHAR(255) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,  -- bcrypt
    body_weight_kg  REAL NOT NULL DEFAULT 75.0,
    weekly_goal     INTEGER NOT NULL DEFAULT 3,  -- workout a settimana
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Libreria esercizi (pre-popolata, condivisa tra tutti gli utenti)
CREATE TABLE exercises (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(100) NOT NULL,
    muscle_group    VARCHAR(20) NOT NULL
                    CHECK (muscle_group IN (
                        'petto','schiena','gambe','spalle','braccia','core','cardio'
                    )),
    category        VARCHAR(20) NOT NULL
                    CHECK (category IN (
                        'pesi','corpo_libero','isometrico','cardio'
                    )),
    difficulty      SMALLINT NOT NULL CHECK (difficulty BETWEEN 1 AND 3)
);

-- Workout (sessioni di allenamento)
CREATE TABLE workouts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at    TIMESTAMPTZ,
    total_xp        INTEGER NOT NULL DEFAULT 0,
    notes           TEXT
);
CREATE INDEX idx_workouts_user ON workouts(user_id, started_at DESC);

-- Esercizi all'interno di un workout
CREATE TABLE workout_exercises (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workout_id      UUID NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
    exercise_id     UUID NOT NULL REFERENCES exercises(id),
    order_index     SMALLINT NOT NULL DEFAULT 0,
    xp_earned       INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_we_workout ON workout_exercises(workout_id);

-- Serie (set) per ogni esercizio nel workout
CREATE TABLE exercise_sets (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workout_exercise_id UUID NOT NULL REFERENCES workout_exercises(id) ON DELETE CASCADE,
    set_number      SMALLINT NOT NULL,
    reps            SMALLINT,           -- per pesi e corpo libero
    weight_kg       REAL,               -- per pesi
    seconds         INTEGER,            -- per isometrici e cardio
    ballast_kg      REAL DEFAULT 0,     -- zavorra corpo libero
    xp_earned       INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_sets_we ON exercise_sets(workout_exercise_id);

-- Progressione per gruppo muscolare (per utente)
CREATE TABLE muscle_group_progress (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    muscle_group    VARCHAR(20) NOT NULL,
    total_xp        BIGINT NOT NULL DEFAULT 0,
    current_xp      INTEGER NOT NULL DEFAULT 0,  -- XP nel rango corrente
    rank_band       SMALLINT NOT NULL DEFAULT 1,  -- 1=Bronzo ... 6=Diamante
    rank_sub        SMALLINT NOT NULL DEFAULT 1,  -- 1, 2, 3
    UNIQUE(user_id, muscle_group)
);

-- Streak settimanale
CREATE TABLE streak_state (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    current_streak  INTEGER NOT NULL DEFAULT 0,
    streak_tier     SMALLINT NOT NULL DEFAULT 0 CHECK (streak_tier BETWEEN 0 AND 3),
    week_start      DATE NOT NULL DEFAULT CURRENT_DATE,
    workouts_this_week INTEGER NOT NULL DEFAULT 0,
    best_streak     INTEGER NOT NULL DEFAULT 0
);

-- Boss attivi (uno per gruppo muscolare per utente)
CREATE TABLE bosses (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    muscle_group    VARCHAR(20) NOT NULL,
    boss_name       VARCHAR(100) NOT NULL,
    tier            SMALLINT NOT NULL DEFAULT 1,  -- 1-5 (Guardiano..Titano)
    max_hp          INTEGER NOT NULL,
    current_hp      INTEGER NOT NULL,
    defeated        BOOLEAN NOT NULL DEFAULT FALSE,
    defeated_at     TIMESTAMPTZ,
    UNIQUE(user_id, muscle_group)
);
```

### 5.2 Seed data

La libreria esercizi (125 esercizi) viene importata dal file Excel del progetto originale FitQuest. Il seed script converte i dati in INSERT SQL e li carica al primo avvio del database.

---

## 6. AUTENTICAZIONE — JWT

### 6.1 Flusso

1. **Registrazione** (`POST /api/auth/register`): l'utente invia username, email, password. Il backend hashata la password con bcrypt (12 salt rounds) e salva l'utente. Ritorna il JWT.

2. **Login** (`POST /api/auth/login`): l'utente invia email + password. Il backend verifica con `bcrypt.compare()`. Se valido, genera e ritorna un JWT.

3. **Richieste autenticate**: il frontend include il JWT nell'header `Authorization: Bearer <token>`. Il middleware `auth.ts` verifica la firma e estrae `userId`.

### 6.2 Struttura del JWT

```json
{
  "header": { "alg": "HS256", "typ": "JWT" },
  "payload": {
    "userId": "uuid-dell-utente",
    "username": "nome",
    "iat": 1234567890,
    "exp": 1234654290
  }
}
```

- **Scadenza**: 24 ore (configurabile via env)
- **Secret**: variabile d'ambiente `JWT_SECRET` (mai nel codice)
- **Refresh token**: fuori scope per l'esame — alla scadenza l'utente rifà login

### 6.3 Middleware auth

```typescript
// Pseudocodice — il middleware da implementare
export function authMiddleware(req, res, next) {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'Token mancante' });

    try {
        const payload = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET);
        req.userId = payload.userId;
        next();
    } catch {
        return res.status(401).json({ error: 'Token non valido' });
    }
}
```

---

## 7. API REST — ENDPOINTS

Base URL: `/api`

### 7.1 Auth (pubbliche)

| Metodo | Endpoint | Body | Risposta | Descrizione |
|--------|----------|------|----------|-------------|
| POST | `/auth/register` | `{ username, email, password }` | `{ token, user }` | Registrazione |
| POST | `/auth/login` | `{ email, password }` | `{ token, user }` | Login |

### 7.2 User (autenticate)

| Metodo | Endpoint | Body | Risposta | Descrizione |
|--------|----------|------|----------|-------------|
| GET | `/user/profile` | — | `{ user }` | Profilo utente |
| PATCH | `/user/profile` | `{ bodyWeightKg?, weeklyGoal? }` | `{ user }` | Aggiorna profilo |

### 7.3 Exercises (autenticate)

| Metodo | Endpoint | Query | Risposta | Descrizione |
|--------|----------|-------|----------|-------------|
| GET | `/exercises` | `?muscleGroup=petto&category=pesi` | `[exercises]` | Libreria esercizi |

### 7.4 Workouts (autenticate)

| Metodo | Endpoint | Body | Risposta | Descrizione |
|--------|----------|------|----------|-------------|
| POST | `/workouts` | `{ notes? }` | `{ workout }` | Inizia workout |
| GET | `/workouts` | `?limit=10&offset=0` | `[workouts]` | Storico |
| GET | `/workouts/:id` | — | `{ workout, exercises, sets }` | Dettaglio |
| POST | `/workouts/:id/exercises` | `{ exerciseId }` | `{ workoutExercise }` | Aggiungi esercizio |
| POST | `/workouts/:id/exercises/:weId/sets` | `{ reps?, weightKg?, seconds?, ballastKg? }` | `{ set, xpEarned }` | Registra serie |
| POST | `/workouts/:id/complete` | — | `{ workout, xpSummary, rankUps, bossUpdates }` | Completa workout |

### 7.5 Progression (autenticate)

| Metodo | Endpoint | Risposta | Descrizione |
|--------|----------|----------|-------------|
| GET | `/progress` | `[{ muscleGroup, totalXp, rankBand, rankSub, ... }]` | Tutti i gruppi |
| GET | `/progress/:group` | `{ muscleGroup, totalXp, currentXp, xpToNext, ... }` | Dettaglio gruppo |

### 7.6 Streak (autenticate)

| Metodo | Endpoint | Risposta | Descrizione |
|--------|----------|----------|-------------|
| GET | `/streak` | `{ currentStreak, tier, weeklyGoal, workoutsThisWeek, ... }` | Stato streak |

### 7.7 Bosses (autenticate)

| Metodo | Endpoint | Risposta | Descrizione |
|--------|----------|----------|-------------|
| GET | `/bosses` | `[{ muscleGroup, bossName, tier, currentHp, maxHp, defeated }]` | Boss attivi |

---

## 8. MECCANICHE DI GIOCO

> Adattate dal Game Design Spec v1.5 del progetto FitQuest originale.
> Le formule sono IDENTICHE — cambiano solo il contesto (web) e lo scope (ridotto).

### 8.1 Sistema XP — Formule

Quattro categorie di esercizi, stessa struttura, parametri diversi.

**Costanti base:**
- `Cw = 0.08` (coefficiente pesi)
- `Cb = 0.10` (coefficiente corpo libero / isometrico / cardio)

**Pesi:**
```
XP = difficoltà × serie × reps × peso_kg × Cw_effettivo
```

**Corpo libero:**
```
XP = difficoltà × serie × reps × (peso_corporeo + zavorra_kg) × Cb_effettivo
```

**Isometrico:**
```
XP = difficoltà × serie × (secondi / 5) × (peso_corporeo + zavorra_kg) × Cb_effettivo
```

**Cardio:**
```
XP = difficoltà × serie × (secondi / 60) × peso_corporeo × Cb_effettivo
```

I coefficienti "effettivi" includono il bonus streak (sezione 8.3).

### 8.2 Progressione e ranghi

Ogni gruppo muscolare ha 18 livelli: 6 fasce × 3 sotto-livelli.

| Fascia | Sotto-livelli | Colore | Hex |
|--------|--------------|--------|-----|
| Bronzo | 1, 2, 3 | Bronzo | #CD7F32 |
| Argento | 1, 2, 3 | Argento | #A0A0A0 |
| Oro | 1, 2, 3 | Oro | #B8960C |
| Giada | 1, 2, 3 | Verde | #00A86B |
| Platino | 1, 2, 3 | Grigio | #7B7B7B |
| Diamante | 1, 2, 3 | Ciano | #3FACC6 |

**Costi di progressione:**
- Step intra-rango (1→2, 2→3): `XP_base = 800` con scaling per fascia
- Rank-up (3→nuovo 1): `XP_base × 2.0` (moltiplicatore)
- Scaling per fascia: `+15%` per ogni fascia dopo Bronzo

```
Costo step = XP_base × (1 + 0.15 × (fascia_index - 1))
Costo rank-up = Costo step × 2.0
```

La barra XP si azzera ad ogni avanzamento (non è cumulativa visivamente).

### 8.3 Streak e bonus settimanale

L'utente imposta quanti workout a settimana vuole fare. Se li completa tutti → streak +1. Se ne salta uno → streak reset a 0.

| Tier | Condizione | Bonus |
|------|-----------|-------|
| 0 | Default / streak interrotta | Cw = 0.08, Cb = 0.10 |
| 1 | 1 settimana perfetta | +10% (Cw = 0.088, Cb = 0.110) |
| 2 | 2 settimane di fila | +20% (Cw = 0.096, Cb = 0.120) |
| 3 | 3+ settimane di fila | +30% (Cw = 0.104, Cb = 0.130) |

Il tier 3 è il massimo. Il contatore settimane continua ma il bonus non sale oltre +30%.

**Edge case**: cambio obiettivo settimanale → si applica dalla settimana successiva (anti-exploit).

### 8.4 Boss semplificati

Un boss per gruppo muscolare, legato al rank-up. Quando l'utente raggiunge la fase di rank-up (sotto-livello 3 → fascia successiva), il boss si attiva.

- **HP del boss** = costo XP del rank-up
- **Danno** = XP guadagnati in quel gruppo muscolare durante il workout
- Boss sconfitto → rank-up completato → nuovo boss della fascia successiva

Nomi boss (un nome per fascia, semplificato):

| Fascia | Nome generico |
|--------|--------------|
| 1 (Bronzo→Argento) | Guardiano |
| 2 (Argento→Oro) | Sentinella |
| 3 (Oro→Giada) | Campione |
| 4 (Giada→Platino) | Signore |
| 5 (Platino→Diamante) | Titano |

---

## 9. FRONTEND — REACT SPA

### 9.1 Pagine

| Pagina | Route | Descrizione |
|--------|-------|-------------|
| Login | `/login` | Form email + password |
| Registrazione | `/register` | Form username + email + password + peso |
| Dashboard | `/` | Overview: streak, boss attivi, progressi gruppi, ultimo workout |
| Workout | `/workout` | Flusso: seleziona esercizi → registra serie → completa |
| Progressione | `/progression` | 7 gruppi muscolari con barra XP e rango |
| Dettaglio gruppo | `/progression/:group` | Storico XP, rango attuale, boss |
| Impostazioni | `/settings` | Peso corporeo, obiettivo settimanale |

### 9.2 Design system (semplificato)

Stile dark mode RPG, adattato per il web con Tailwind.

```
Colori principali (Tailwind custom):
- bg-primary:    #0D1117  (sfondo)
- bg-card:       #161B22  (card)
- bg-input:      #1C2128  (input)
- accent:        #7C3AED  (viola — accent primario)
- accent-cyan:   #06B6D4  (ciano — secondario)
- accent-gold:   #F59E0B  (oro — streak/achievement)
- success:       #10B981  (verde)
- danger:        #EF4444  (rosso)
- text-primary:  #F0F6FC  (bianco)
- text-secondary:#8B949E  (grigio)
```

### 9.3 Componenti chiave

- **Layout**: sidebar/navbar con navigazione, avatar utente, livello
- **XPBar**: barra di progressione animata con colore della fascia
- **BossCard**: nome boss, HP bar, gruppo muscolare
- **StreakBadge**: fiamma + contatore + tier
- **ExerciseSelector**: ricerca/filtro dalla libreria, selezione multipla
- **SetLogger**: form per registrare una serie (reps, peso/tempo)

---

## 10. DOCKER E CONFIGURAZIONE YAML

### 10.1 docker-compose.yml

```yaml
version: '3.8'

services:
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "80:80"
    depends_on:
      - backend
    environment:
      - VITE_API_URL=http://localhost:3000/api

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    depends_on:
      db:
        condition: service_healthy
    environment:
      - DATABASE_URL=postgresql://fitquest:fitquest@db:5432/fitquest
      - JWT_SECRET=dev-secret-change-in-production
      - CORS_ORIGIN=http://localhost
      - PORT=3000

  db:
    image: postgres:16-alpine
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_USER=fitquest
      - POSTGRES_PASSWORD=fitquest
      - POSTGRES_DB=fitquest
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./database/init.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U fitquest"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  pgdata:
```

### 10.2 Dockerfile backend

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

### 10.3 Dockerfile frontend

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

### 10.4 nginx.conf (per SPA routing)

```nginx
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://backend:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## 11. CI/CD — GITHUB ACTIONS

### 11.1 Pipeline `.github/workflows/ci.yml`

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  lint-and-test-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - name: Install dependencies
        working-directory: ./backend
        run: npm ci
      - name: Lint
        working-directory: ./backend
        run: npm run lint
      - name: Build
        working-directory: ./backend
        run: npm run build
      - name: Test
        working-directory: ./backend
        run: npm test

  lint-and-build-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - name: Install dependencies
        working-directory: ./frontend
        run: npm ci
      - name: Lint
        working-directory: ./frontend
        run: npm run lint
      - name: Build
        working-directory: ./frontend
        run: npm run build

  docker-build:
    needs: [lint-and-test-backend, lint-and-build-frontend]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build Docker images
        run: docker compose build
```

---

## 12. DEPLOY — LOCALE E CLOUD

### 12.1 Deploy locale

```bash
git clone https://github.com/[username]/fitquest-web.git
cd fitquest-web
docker compose up --build
# App disponibile su http://localhost
# API disponibile su http://localhost:3000
```

### 12.2 Deploy cloud (Railway)

Railway supporta deploy da Dockerfile. Configurazione:
1. Collegare il repo GitHub a Railway
2. Creare 3 servizi: frontend, backend, PostgreSQL
3. Configurare variabili d'ambiente (DATABASE_URL, JWT_SECRET, CORS_ORIGIN)
4. Railway costruisce e deploya automaticamente ad ogni push su main

Alternativa: Fly.io con `fly.toml` per backend e frontend separati.

Le istruzioni dettagliate vanno nel README finale.

---

## 13. FASI DI SVILUPPO

### FASE 0 — Setup progetto (fondamenta)

- [ ] Inizializzare repo GitHub
- [ ] Creare struttura cartelle
- [ ] Setup backend: Express + TypeScript + nodemon
- [ ] Setup frontend: Vite + React + TypeScript + Tailwind
- [ ] Setup docker-compose con PostgreSQL
- [ ] Creare `database/init.sql` con lo schema
- [ ] Verificare: `docker compose up` funziona, frontend e backend raggiungibili

### FASE 1 — Auth + User

- [ ] Implementare `POST /auth/register` con bcrypt
- [ ] Implementare `POST /auth/login` con JWT
- [ ] Middleware auth per route protette
- [ ] Configurare CORS
- [ ] Frontend: pagine Login e Register
- [ ] Frontend: AuthContext + PrivateRoute
- [ ] Verificare: registrazione, login, accesso protetto funzionano

### FASE 2 — Libreria esercizi + Workout core

- [ ] Seed script: importare 125 esercizi dal file Excel
- [ ] Implementare `GET /exercises` con filtri
- [ ] Implementare flusso workout: create → add exercise → log set → complete
- [ ] Implementare `xpCalculator.ts` (4 formule, da FitQuest)
- [ ] Frontend: pagina Workout con ExerciseSelector e SetLogger
- [ ] Verificare: workflow completo workout → XP calcolati

### FASE 3 — Progressione + Boss

- [ ] Implementare `progressionService.ts` (costi, avanzamento ranghi)
- [ ] Implementare `bossService.ts` (attivazione, danno, sconfitta)
- [ ] Aggiornare endpoint `/workouts/:id/complete` per processare XP → progressione → boss
- [ ] Frontend: pagina Progressione con 7 gruppi, XPBar, ranghi
- [ ] Frontend: BossCard nella Dashboard
- [ ] Verificare: XP → progressione → rank-up → boss sconfitto

### FASE 4 — Streak + Dashboard

- [ ] Implementare `streakService.ts` (logica settimanale, tier, reset)
- [ ] Implementare cron job o check al completamento workout
- [ ] Frontend: Dashboard completa (streak, boss, progressi, ultimo workout)
- [ ] Frontend: pagina Impostazioni (peso, obiettivo settimanale)
- [ ] Verificare: streak sale/scende correttamente, bonus XP applicati

### FASE 5 — Docker + CI/CD + Deploy

- [ ] Scrivere Dockerfile frontend (multi-stage con Nginx)
- [ ] Scrivere Dockerfile backend (multi-stage)
- [ ] Testare `docker compose up --build` da zero
- [ ] Scrivere pipeline GitHub Actions (ci.yml)
- [ ] Verificare pipeline su push
- [ ] Deploy su Railway/Fly.io
- [ ] Testare deploy cloud funzionante

### FASE 6 — Documentazione + Polish

- [ ] Scrivere README completo (vedi sezione 14)
- [ ] Creare diagrammi architettura (draw.io o Mermaid)
- [ ] Screenshot per il README
- [ ] Documentazione API (docs/api.md)
- [ ] Credenziali di prova nel README
- [ ] Review finale codice e pulizia
- [ ] Preparare presentazione (10 min pitch + demo)

---

## 14. TEMPLATE README PER CONSEGNA

Il README deve contenere (da specifica dell'esame):

```markdown
# FitQuest Web — Fitness Tracker Gamificato

## Descrizione
[Cosa fa l'app, 3-4 righe]

## Architettura
[Diagramma three-tier, spiegazione delle scelte]

## Stack tecnologico
[Tabella tecnologie con motivazione]

## Prerequisiti
- Docker e Docker Compose
- Node.js 20+ (per sviluppo locale senza Docker)

## Quick Start (locale con Docker)
git clone ...
docker compose up --build
# Aprire http://localhost

## Sviluppo locale (senza Docker)
[Istruzioni per frontend e backend separati]

## Credenziali di prova
- Email: demo@fitquest.dev
- Password: Demo1234!

## Struttura del progetto
[Albero cartelle con spiegazione]

## API Documentation
[Link a docs/api.md o sezione con tabella endpoint]

## Scelte progettuali
[Perché JWT e non sessioni, perché PostgreSQL, perché Docker multi-stage, ecc.]

## Diagrammi
[Link a docs/architecture.md con diagrammi deploy e architettura]

## CI/CD
[Spiegazione pipeline GitHub Actions]

## Deploy cloud
[Link al deployment pubblico + istruzioni]

## Trasparenza — Uso di AI
[Sezione 2.1 di questo documento]

## Autore
[Nome, matricola, corso]
```

---

## 15. REGOLE PER CLAUDE CODE

Quando implementi questo progetto:

1. **Leggi questo documento per intero** prima di scrivere codice
2. **Segui le fasi in ordine** — ogni fase dipende dalla precedente
3. Le formule XP nella sezione 8.1 sono DEFINITIVE — implementale esattamente
4. **Prepared statements OVUNQUE** — mai concatenare input utente nelle query SQL
5. **bcrypt per le password** — mai salvare in chiaro, mai usare MD5/SHA
6. Il JWT secret viene da variabile d'ambiente — mai hardcodato nel codice
7. Ogni endpoint autenticato passa per il middleware `auth.ts`
8. Il CORS deve specificare le origini esatte — mai `*` in produzione
9. I Dockerfile devono essere multi-stage (build + runtime)
10. Il docker-compose deve funzionare con un solo `docker compose up --build`
11. Aggiungi commenti `// Adattato da FitQuest (progetto personale)` dove il codice è derivato
12. TypeScript strict mode attivo — no `any` impliciti
13. Ogni route handler deve avere error handling con try/catch
14. Le risposte API seguono il formato `{ data }` per successo, `{ error: "messaggio" }` per errori
15. Il seed degli esercizi deve eseguirsi automaticamente al primo avvio
16. **NON implementare** medaglie, personal record, mobilità, notifiche push — fuori scope
