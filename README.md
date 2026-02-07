# Bird Tarifa API (Railway + Postgres + Python)

Backend for:
- Sighting log
- Lightweight bird predictions (zone + month + hour bucket)

## Stack

- FastAPI
- PostgreSQL
- SQLAlchemy
- Railway deployment

## Local run

1. Create and activate a virtual environment.
2. Install deps:

```bash
pip install -r requirements.txt
```

3. Create `.env` from `.env.example`.
4. Run:

```bash
uvicorn app.main:app --reload
```

App creates tables on startup.

## API quick test

- `GET /health`
- `POST /prediction-rules/seed`
- `POST /sightings`
- `GET /sightings`
- `GET /predictions?zone=Tarifa%20Centro&month=10&hour_bucket=dawn`

## Railway deploy

1. Push this folder to a GitHub repo.
2. In Railway, create a new project from that repo.
3. Add a PostgreSQL service.
4. Set env vars in the app service:
- `DATABASE_URL` = Railway Postgres connection string
- `APP_ENV` = `production`
- `CORS_ORIGINS` = your frontend origin(s), comma separated
5. Deploy. Railway uses `Procfile` / `railway.json` start command.

## Notes

- This MVP keeps auth out for speed.
- Next step is user auth + ownership-based access rules.
