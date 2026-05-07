# FitQuest Web — API Reference

**Base URL:** `http://localhost:3000/api`

## Autenticazione

Tutte le route (eccetto `/api/auth/*` e `/api/health`) richiedono un JWT nel header:

```
Authorization: Bearer <token>
```

Il token ha validita 24 ore e viene restituito da login/register.

---

## Health Check

### `GET /api/health`

| Campo | Valore |
|-------|--------|
| Auth  | No     |

**Response `200`**

```json
{ "status": "ok", "timestamp": "2026-05-05T10:00:00.000Z" }
```

---

## Auth

> Rate limit: 20 richieste / 15 minuti per IP.

### `POST /api/auth/register`

Crea un nuovo account, inizializza progressione (7 gruppi muscolari), boss (tier 1) e streak.

| Campo | Valore |
|-------|--------|
| Auth  | No     |

**Request body**

```json
{
  "username": "mario",
  "email": "mario@example.com",
  "password": "Str0ngPass!"
}
```

| Campo      | Tipo   | Obbligatorio | Vincoli                 |
|------------|--------|:------------:|-------------------------|
| `username` | string | si           | Unico                   |
| `email`    | string | si           | Unico, normalizzato     |
| `password` | string | si           | Minimo 8 caratteri      |

**Response `201`**

```json
{
  "token": "eyJhbG...",
  "user": {
    "id": "uuid",
    "username": "mario",
    "email": "mario@example.com",
    "body_weight_kg": 75,
    "weekly_goal": 3,
    "created_at": "2026-05-05T10:00:00.000Z"
  }
}
```

**Errori**

| Status | Causa |
|--------|-------|
| `400`  | Campi mancanti o password < 8 caratteri |
| `409`  | Username o email gia in uso |

---

### `POST /api/auth/login`

Autentica un utente e ritorna un JWT.

| Campo | Valore |
|-------|--------|
| Auth  | No     |

**Request body**

```json
{
  "email": "mario@example.com",
  "password": "Str0ngPass!"
}
```

**Response `200`**

```json
{
  "token": "eyJhbG...",
  "user": {
    "id": "uuid",
    "username": "mario",
    "email": "mario@example.com",
    "body_weight_kg": 75,
    "weekly_goal": 3
  }
}
```

**Errori**

| Status | Causa |
|--------|-------|
| `400`  | Campi mancanti |
| `401`  | Credenziali non valide (messaggio generico anti-enumeration) |
| `429`  | Rate limit superato |

---

## User

### `GET /api/user/profile`

Ritorna il profilo dell'utente autenticato.

| Campo | Valore |
|-------|--------|
| Auth  | JWT    |

**Response `200`**

```json
{
  "user": {
    "id": "uuid",
    "username": "mario",
    "email": "mario@example.com",
    "body_weight_kg": 75,
    "weekly_goal": 3,
    "created_at": "2026-05-05T10:00:00.000Z"
  }
}
```

---

### `PATCH /api/user/profile`

Aggiorna parzialmente il profilo. I campi omessi restano invariati (COALESCE).

| Campo | Valore |
|-------|--------|
| Auth  | JWT    |

**Request body**

```json
{
  "bodyWeightKg": 80,
  "weeklyGoal": 4
}
```

| Campo         | Tipo   | Obbligatorio | Note                     |
|---------------|--------|:------------:|--------------------------|
| `bodyWeightKg`| number | no           | Peso corporeo in kg      |
| `weeklyGoal`  | number | no           | Obiettivo workout/settimana |

**Response `200`**

```json
{
  "user": {
    "id": "uuid",
    "username": "mario",
    "email": "mario@example.com",
    "body_weight_kg": 80,
    "weekly_goal": 4,
    "updated_at": "2026-05-05T10:00:00.000Z"
  }
}
```

---

## Exercises

### `GET /api/exercises`

Ritorna la libreria esercizi (125 pre-popolati), con filtri opzionali.

| Campo | Valore |
|-------|--------|
| Auth  | JWT    |

**Query parameters**

| Parametro     | Tipo   | Valori ammessi |
|---------------|--------|----------------|
| `muscleGroup` | string | `petto`, `schiena`, `gambe`, `spalle`, `braccia`, `core`, `cardio` |
| `category`    | string | `pesi`, `corpo_libero`, `isometrico`, `cardio` |

**Response `200`**

```json
[
  {
    "id": "uuid",
    "name": "Panca piana",
    "muscle_group": "petto",
    "category": "pesi",
    "difficulty": 2
  }
]
```

---

## Workouts

### `POST /api/workouts`

Inizia un nuovo workout.

| Campo | Valore |
|-------|--------|
| Auth  | JWT    |

**Request body**

```json
{ "notes": "Push day" }
```

| Campo   | Tipo   | Obbligatorio | Note |
|---------|--------|:------------:|------|
| `notes` | string | no           | Note libere |

**Response `201`**

```json
{
  "workout": {
    "id": "uuid",
    "user_id": "uuid",
    "started_at": "2026-05-05T10:00:00.000Z",
    "completed_at": null,
    "total_xp": 0,
    "notes": "Push day"
  }
}
```

---

### `GET /api/workouts`

Storico workout dell'utente, ordinato per data decrescente.

| Campo | Valore |
|-------|--------|
| Auth  | JWT    |

**Query parameters**

| Parametro | Tipo   | Default | Note |
|-----------|--------|---------|------|
| `limit`   | number | 10      | Max 50 |
| `offset`  | number | 0       | Paginazione |

**Response `200`**

```json
[
  {
    "id": "uuid",
    "user_id": "uuid",
    "started_at": "2026-05-05T10:00:00.000Z",
    "completed_at": "2026-05-05T11:00:00.000Z",
    "total_xp": 450,
    "notes": "Push day"
  }
]
```

---

### `GET /api/workouts/:id`

Dettaglio di un singolo workout con esercizi e set.

| Campo | Valore |
|-------|--------|
| Auth  | JWT    |

**Response `200`**

```json
{
  "workout": {
    "id": "uuid",
    "user_id": "uuid",
    "started_at": "2026-05-05T10:00:00.000Z",
    "completed_at": "2026-05-05T11:00:00.000Z",
    "total_xp": 450,
    "notes": "Push day"
  },
  "exercises": [
    {
      "id": "uuid",
      "workout_id": "uuid",
      "exercise_id": "uuid",
      "order_index": 0,
      "xp_earned": 200,
      "exercise": {
        "id": "uuid",
        "name": "Panca piana",
        "muscle_group": "petto",
        "category": "pesi",
        "difficulty": 2
      },
      "sets": [
        {
          "id": "uuid",
          "workout_exercise_id": "uuid",
          "set_number": 1,
          "reps": 10,
          "weight_kg": 80,
          "seconds": null,
          "ballast_kg": 0,
          "xp_earned": 100
        }
      ]
    }
  ]
}
```

**Errori**

| Status | Causa |
|--------|-------|
| `404`  | Workout non trovato o non appartiene all'utente |

---

### `POST /api/workouts/:id/exercises`

Aggiunge un esercizio dalla libreria al workout.

| Campo | Valore |
|-------|--------|
| Auth  | JWT    |

**Request body**

```json
{ "exerciseId": "uuid" }
```

**Response `201`**

```json
{
  "workoutExercise": {
    "id": "uuid",
    "workout_id": "uuid",
    "exercise_id": "uuid",
    "order_index": 0,
    "xp_earned": 0
  }
}
```

**Errori**

| Status | Causa |
|--------|-------|
| `400`  | `exerciseId` mancante, o workout gia completato |
| `404`  | Workout o esercizio non trovato |

---

### `POST /api/workouts/:id/exercises/:weId/sets`

Logga un set per un esercizio nel workout. L'XP viene calcolato server-side in base a categoria, difficolta, peso corporeo e streak tier.

| Campo | Valore |
|-------|--------|
| Auth  | JWT    |

**Request body**

I campi richiesti dipendono dalla categoria dell'esercizio:

| Categoria       | Campi richiesti     | Campi opzionali |
|-----------------|---------------------|-----------------|
| `pesi`          | `reps`, `weightKg`  | —               |
| `corpo_libero`  | `reps`              | `ballastKg`     |
| `isometrico`    | `seconds`           | —               |
| `cardio`        | `seconds`           | —               |

```json
{
  "reps": 10,
  "weightKg": 80,
  "seconds": null,
  "ballastKg": 0
}
```

**Response `201`**

```json
{
  "set": {
    "id": "uuid",
    "workout_exercise_id": "uuid",
    "set_number": 1,
    "reps": 10,
    "weight_kg": 80,
    "seconds": null,
    "ballast_kg": 0,
    "xp_earned": 100
  },
  "xpEarned": 100
}
```

**Errori**

| Status | Causa |
|--------|-------|
| `400`  | Campi mancanti per la categoria, o workout gia completato |
| `404`  | Workout o esercizio non trovato |

**Formule XP (calcolo server-side)**

| Categoria       | Formula |
|-----------------|---------|
| `pesi`          | `(reps x (weight + bodyWeight x 0.1)) x difficulty x streakBonus` |
| `corpo_libero`  | `(reps x bodyWeight x 0.15) x difficulty x streakBonus` |
| `isometrico`    | `(seconds / 10) x difficulty x streakBonus` |
| `cardio`        | `(seconds / 5) x difficulty x streakBonus` |

Streak bonus: Bronze +0%, Silver +10%, Gold +20%.

---

### `POST /api/workouts/:id/complete`

Completa il workout. Operazione atomica (transazione) che:
1. Processa il rollover streak (se settimana cambiata)
2. Incrementa `workouts_this_week`
3. Applica XP alla progressione di ogni gruppo muscolare coinvolto
4. Infligge danno ai boss attivi (se l'utente e a sub-rank 3)
5. Gestisce rank-up e spawn di nuovi boss

| Campo | Valore |
|-------|--------|
| Auth  | JWT    |

**Response `200`**

```json
{
  "workout": {
    "id": "uuid",
    "user_id": "uuid",
    "started_at": "2026-05-05T10:00:00.000Z",
    "completed_at": "2026-05-05T11:00:00.000Z",
    "total_xp": 450,
    "notes": "Push day"
  },
  "xpSummary": {
    "totalXp": 450,
    "perMuscleGroup": {
      "petto": 300,
      "braccia": 150
    }
  },
  "rankUps": [
    {
      "muscle_group": "petto",
      "fromBand": 1,
      "fromSub": 3,
      "toBand": 2,
      "toSub": 1
    }
  ],
  "bossUpdates": [
    {
      "muscle_group": "petto",
      "boss_name": "Guardiano del Petto",
      "tier": 1,
      "current_hp": 800,
      "max_hp": 1600,
      "defeated": false,
      "damage_dealt": 300
    }
  ]
}
```

**Errori**

| Status | Causa |
|--------|-------|
| `400`  | Workout gia completato |
| `404`  | Workout non trovato |

---

## Progression

### `GET /api/progress`

Ritorna la progressione di tutti e 7 i gruppi muscolari, arricchita con info rank e boss.

| Campo | Valore |
|-------|--------|
| Auth  | JWT    |

**Response `200`**

```json
[
  {
    "muscle_group": "petto",
    "total_xp": 3200,
    "current_xp": 400,
    "rank_band": 2,
    "rank_sub": 1,
    "rankInfo": { "name": "Argento I", "band": 2, "sub": 1 },
    "xpToNext": 600,
    "isAtRankUp": false,
    "isMaxRank": false,
    "boss": {
      "tier": 2,
      "boss_name": "Sentinella del Petto",
      "max_hp": 3200,
      "current_hp": 3200,
      "defeated": false
    }
  }
]
```

**Sistema di ranghi**

| Band | Nome      | Sub-rank |
|------|-----------|----------|
| 1    | Bronzo    | I, II, III |
| 2    | Argento   | I, II, III |
| 3    | Oro       | I, II, III |
| 4    | Platino   | I, II, III |
| 5    | Smeraldo  | I, II, III |
| 6    | Diamante  | I, II, III |

---

### `GET /api/progress/:group`

Ritorna la progressione di un singolo gruppo muscolare.

| Campo | Valore |
|-------|--------|
| Auth  | JWT    |

**Path parameters**

| Parametro | Valori ammessi |
|-----------|----------------|
| `group`   | `petto`, `schiena`, `gambe`, `spalle`, `braccia`, `core`, `cardio` |

**Response `200`** — Stesso formato di un singolo elemento dell'array sopra.

**Errori**

| Status | Causa |
|--------|-------|
| `404`  | Gruppo muscolare non trovato |

---

## Bosses

### `GET /api/bosses`

Ritorna tutti i 7 boss dell'utente con stato attivo/dormiente/sconfitto.

| Campo | Valore |
|-------|--------|
| Auth  | JWT    |

**Response `200`**

```json
[
  {
    "muscle_group": "petto",
    "boss_name": "Guardiano del Petto",
    "tier": 1,
    "max_hp": 1600,
    "current_hp": 800,
    "defeated": false,
    "defeated_at": null,
    "rank_band": 1,
    "rank_sub": 3,
    "isActive": true
  }
]
```

**Logica `isActive`:** `rank_sub === 3 AND rank_band < 6 AND !defeated`

Il boss e attivo solo quando l'utente e al sub-rank 3 del suo band corrente e il boss non e ancora sconfitto.

---

## Streak

### `GET /api/streak`

Ritorna lo stato corrente della streak settimanale. Triggera il rollover lazy se la settimana ISO e cambiata.

| Campo | Valore |
|-------|--------|
| Auth  | JWT    |

**Response `200`**

```json
{
  "current_streak": 3,
  "streak_tier": 1,
  "weekly_goal": 3,
  "workouts_this_week": 2,
  "best_streak": 5,
  "bonus_pct": 10,
  "week_start": "2026-05-04"
}
```

**Streak tier**

| Tier | Nome    | Bonus XP |
|------|---------|----------|
| 0    | Bronze  | +0%      |
| 1    | Silver  | +10%     |
| 2    | Gold    | +20%     |
| 3    | —       | +30%     |

La streak si incrementa quando `workouts_this_week >= weekly_goal` al rollover della settimana ISO (lunedi-domenica). Si resetta a 0 se l'obiettivo non viene raggiunto.

---

## Codici di errore comuni

| Status | Significato |
|--------|-------------|
| `400`  | Richiesta malformata o validazione fallita |
| `401`  | JWT mancante, scaduto o non valido |
| `404`  | Risorsa non trovata o non appartiene all'utente |
| `409`  | Conflitto (duplicate key) |
| `429`  | Rate limit superato (solo `/api/auth/*`) |
| `500`  | Errore interno del server |
