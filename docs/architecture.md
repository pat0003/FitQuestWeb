# FitQuest Web — Architettura

## 1. Architettura Three-Tier

```mermaid
graph TB
    subgraph Client
        B[Browser]
    end

    subgraph Frontend["Frontend (Nginx :80)"]
        SPA[React SPA<br/>React 18 + TypeScript + Tailwind]
    end

    subgraph Backend["Backend (Node.js :3000)"]
        API[Express API<br/>JWT Auth + Rate Limiting]
        MW[Middleware<br/>CORS · Auth · Error Handler]
        SVC[Services<br/>XP Calculator · Progression<br/>Streak · Boss]
    end

    subgraph Database["Database (PostgreSQL :5432)"]
        PG[(PostgreSQL 16<br/>Prepared Statements)]
    end

    B -->|HTTP| SPA
    SPA -->|REST API /api/*| API
    API --> MW
    MW --> SVC
    SVC -->|SQL parametrizzato| PG
```

## 2. Deployment Docker Compose

```mermaid
graph LR
    subgraph Docker["Docker Compose"]
        subgraph FE["frontend"]
            NGINX[Nginx Alpine<br/>porta 80:80]
            REACT[React build statica<br/>multi-stage]
        end

        subgraph BE["backend"]
            NODE[Node.js 20 Alpine<br/>porta 3000:3000]
            ENV1["DATABASE_URL<br/>JWT_SECRET<br/>CORS_ORIGIN"]
        end

        subgraph DB["db"]
            POSTGRES[PostgreSQL 16 Alpine<br/>porta 5432:5432]
            VOL[(pgdata volume)]
            INIT["init.sql<br/>seed_exercises.sql<br/>03_alter.sql"]
        end
    end

    NGINX --> NODE
    NODE --> POSTGRES
    INIT -.->|auto-eseguiti<br/>al primo avvio| POSTGRES
    POSTGRES --- VOL
```

## 3. Schema ER (semplificato)

```mermaid
erDiagram
    users ||--o{ workouts : "ha"
    users ||--o{ muscle_group_progress : "ha"
    users ||--o{ bosses : "ha"
    users ||--|| streak_state : "ha"

    workouts ||--o{ workout_exercises : "contiene"
    workout_exercises ||--o{ exercise_sets : "contiene"
    exercises ||--o{ workout_exercises : "usato in"

    users {
        uuid id PK
        varchar username UK
        varchar email UK
        varchar password_hash
        real body_weight_kg
        int weekly_goal
    }

    exercises {
        uuid id PK
        varchar name
        varchar muscle_group
        varchar category
        smallint difficulty
    }

    workouts {
        uuid id PK
        uuid user_id FK
        timestamptz started_at
        timestamptz completed_at
        int total_xp
        text notes
    }

    workout_exercises {
        uuid id PK
        uuid workout_id FK
        uuid exercise_id FK
        smallint order_index
        int xp_earned
    }

    exercise_sets {
        uuid id PK
        uuid workout_exercise_id FK
        smallint set_number
        smallint reps
        real weight_kg
        int seconds
        real ballast_kg
        int xp_earned
    }

    muscle_group_progress {
        uuid id PK
        uuid user_id FK
        varchar muscle_group
        bigint total_xp
        int current_xp
        smallint rank_band
        smallint rank_sub
    }

    bosses {
        uuid id PK
        uuid user_id FK
        varchar muscle_group
        varchar boss_name
        smallint tier
        int max_hp
        int current_hp
        boolean defeated
    }

    streak_state {
        uuid id PK
        uuid user_id FK
        int current_streak
        smallint streak_tier
        date week_start
        int workouts_this_week
        int best_streak
        int goal_at_week_start
    }
```

## 4. Flusso Workout

```mermaid
flowchart TD
    A[Utente apre Workout Page] --> B["POST /api/workouts<br/>Crea workout"]
    B --> C["GET /api/exercises<br/>Carica libreria esercizi"]
    C --> D{Seleziona esercizio}
    D --> E["POST /api/workouts/:id/exercises<br/>Aggiunge esercizio al workout"]
    E --> F{Logga set}
    F --> G["POST /api/.../sets<br/>Calcola XP server-side"]
    G --> H{Altri set?}
    H -->|Si| F
    H -->|No| I{Altri esercizi?}
    I -->|Si| D
    I -->|No| J["POST /api/workouts/:id/complete"]

    J --> K[Transazione atomica]

    subgraph TX["Transazione Complete"]
        K --> L[1. Streak rollover]
        L --> M["2. workouts_this_week++"]
        M --> N[3. XP per gruppo muscolare]
        N --> O[4. Progressione rank]
        O --> P{Boss attivo?}
        P -->|Si| Q[5. Danno al boss]
        P -->|No| R[Skip boss]
        Q --> S{Boss sconfitto?}
        S -->|Si| T[6. Spawn boss tier+1]
        S -->|No| R
        T --> R
    end

    R --> U["Response:<br/>xpSummary + rankUps + bossUpdates"]
```

## 5. Sistema di Progressione

```mermaid
graph LR
    subgraph Ranks["Fasce di Rango (rank_band)"]
        B1["1 — Bronzo"]
        B2["2 — Argento"]
        B3["3 — Oro"]
        B4["4 — Platino"]
        B5["5 — Smeraldo"]
        B6["6 — Diamante"]
    end

    subgraph SubRanks["Sub-rank (rank_sub)"]
        S1["I → II → III"]
    end

    subgraph Boss["Boss Fight"]
        BOSS["Boss appare a sub III<br/>HP = costo rank-up<br/>XP infligge danno<br/>Sconfitto → rank-up"]
    end

    B1 --> B2 --> B3 --> B4 --> B5 --> B6
    S1 -.-> BOSS
    BOSS -.->|"Sconfitto"| B2
```

## 6. Pipeline CI/CD

```mermaid
flowchart LR
    subgraph Trigger["Trigger"]
        PUSH["Push su main"]
        PR["Pull Request"]
    end

    subgraph Jobs["GitHub Actions"]
        BE_JOB["Backend Job<br/>npm install → lint → build"]
        FE_JOB["Frontend Job<br/>npm install → lint → build"]
        DOCKER_JOB["Docker Job<br/>docker compose build"]
    end

    PUSH --> BE_JOB
    PUSH --> FE_JOB
    PR --> BE_JOB
    PR --> FE_JOB
    BE_JOB --> DOCKER_JOB
    FE_JOB --> DOCKER_JOB
```
