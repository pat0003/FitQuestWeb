# Deploy Guide — FitQuest Web

Questo documento descrive come deployare FitQuest Web in due scenari:
1. **Locale** (Docker Compose) — per sviluppo e demo
2. **Cloud** (Railway) — deploy production

---

## 1. Deploy locale

### Prerequisiti
- Docker Desktop installato e in esecuzione
- Git
- Porte libere: `80` (frontend), `3000` (backend), `5432` (PostgreSQL)

### Avvio
```bash
git clone https://github.com/pat0003/FitQuestWeb.git
cd FitQuestWeb
docker compose up --build -d
```

L'applicazione è disponibile su:
- Frontend: <http://localhost>
- API: <http://localhost:3000/api>
- Health check: <http://localhost:3000/api/health>

### Reset DB (cancella tutti i dati)
```bash
docker compose down -v
docker compose up -d
```

### Stop senza perdere i dati
```bash
docker compose stop
# riprendere con:
docker compose start
```

---

## 2. Deploy cloud (Railway)

[Railway](https://railway.app) è una piattaforma PaaS che supporta deploy diretto da Dockerfile.

### Setup iniziale
1. Crea un account su Railway (login con GitHub)
2. Connetti il repository GitHub `pat0003/FitQuestWeb`
3. Crea un nuovo progetto → "Deploy from GitHub repo"

### Architettura
Tre servizi separati, tutti nello stesso progetto Railway:

| Servizio | Tipo | Sorgente |
|----------|------|----------|
| `db` | PostgreSQL plugin | Add-on Railway |
| `backend` | Docker | `./backend/Dockerfile` |
| `frontend` | Docker | `./frontend/Dockerfile` |

### Step 1: PostgreSQL
1. Add → "Database" → "PostgreSQL"
2. Railway crea automaticamente la variabile `DATABASE_URL` nel progetto
3. Le tabelle vanno create manualmente (o via script di migrazione):
   - Apri il PostgreSQL da Railway → "Connect" → copia stringa di connessione
   - Esegui in locale:
     ```bash
     psql "$DATABASE_URL_RAILWAY" -f database/init.sql
     psql "$DATABASE_URL_RAILWAY" -f database/seed_exercises.sql
     psql "$DATABASE_URL_RAILWAY" -f database/03_alter.sql
     ```

### Step 2: Backend
1. Add → "GitHub Repo" → seleziona `FitQuestWeb`
2. Settings → "Root Directory": `backend`
3. Settings → "Builder": Dockerfile
4. Variables:
   ```
   DATABASE_URL=${{Postgres.DATABASE_URL}}    # reference al servizio PG
   JWT_SECRET=<genera con: openssl rand -hex 32>
   CORS_ORIGIN=https://<dominio-frontend>.up.railway.app
   PORT=3000
   NODE_ENV=production
   ```
5. Settings → "Networking" → "Generate Domain" (per il pubblico)

> ⚠️ **JWT_SECRET**: il backend si rifiuta di partire in `NODE_ENV=production` se questa variabile manca o è uguale al default. Genera una stringa casuale di almeno 32 caratteri.

### Step 3: Frontend
1. Add → "GitHub Repo" → stesso repo
2. Settings → "Root Directory": `frontend`
3. Settings → "Builder": Dockerfile
4. Variables: nessuna richiesta (il frontend usa path relativo `/api`)
5. Settings → "Networking" → "Generate Domain"

> ⚠️ Il frontend in produzione assume che `/api` sia raggiungibile sullo stesso host.
> Per Railway, dato che frontend e backend hanno domini diversi, devi:
> - **Opzione A** (raccomandato): proxy nginx del frontend già configurato (`proxy_pass http://backend:3000`) — funziona se i container sono nella stessa network. Su Railway questo NON funziona out-of-the-box: i servizi non condividono network.
> - **Opzione B** (semplice per cloud): setta in `frontend/src/api/client.ts` `BASE_URL = import.meta.env.VITE_API_URL ?? '/api'`, costruisci con `VITE_API_URL=https://<backend-domain>/api` come build arg, e aggiungi al `Dockerfile` frontend `ARG VITE_API_URL` + `ENV VITE_API_URL=$VITE_API_URL` prima del `npm run build`.

### Step 4: CORS
Una volta noti entrambi i domini Railway, aggiorna `CORS_ORIGIN` sul backend con il dominio frontend:
```
CORS_ORIGIN=https://fitquestweb-frontend.up.railway.app
```
Per supportare anche localhost in dev (multi-origine):
```
CORS_ORIGIN=https://fitquestweb-frontend.up.railway.app,http://localhost
```
Il backend supporta liste CSV (vedi `backend/src/config.ts`).

### Step 5: Auto-deploy
Railway è già collegato al repo: ogni push su `main` triggera un rebuild automatico di entrambi i servizi.

---

## 3. Verifica deploy

```bash
# Health check backend
curl https://<backend-domain>.up.railway.app/api/health
# Atteso: { "status": "ok", "timestamp": "..." }

# Frontend
open https://<frontend-domain>.up.railway.app
# Dovrebbe caricarsi la pagina di login
```

### Credenziali demo (per dimostrazione esame)
Crea un account dalla pagina `/register`. In alternativa, l'utente di test in locale è:
- Email: `fase4@fitquest.dev`
- Password: `Test1234!`

---

## 4. Troubleshooting

| Sintomo | Causa probabile | Fix |
|---------|----------------|-----|
| `JWT_SECRET non impostato in produzione` | Variabile mancante | Settare nel pannello Railway |
| Frontend mostra "Errore di rete" | CORS rifiuta origin | Aggiungere dominio frontend a `CORS_ORIGIN` |
| `503` sul backend | DB non raggiungibile | Verifica `DATABASE_URL` punti al plugin Postgres |
| Container backend in restart loop | Tabelle DB mancanti | Esegui `init.sql` + `seed_exercises.sql` + `03_alter.sql` |
| `npm ci` fallisce in CI | Lock file disallineato | `cd backend && npm install` localmente, committa `package-lock.json` |
