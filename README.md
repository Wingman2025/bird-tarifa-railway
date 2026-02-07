# Bird Tarifa (Backend + Web)

Bird Tarifa is a lightweight birdwatching app for Tarifa:
- Register sightings (camera/file photo + notes).
- Get simple bird predictions (zone + month + hour bucket).

## Project layout

- `app/` FastAPI backend (Railway + Postgres)
- `web/` React + Vite frontend (Railway web service)
- `sql/` seed SQL utilities

## Backend setup

1. Create and activate a virtual environment.
2. Install dependencies:

```bash
pip install -r requirements.txt
```

3. Create `.env` from `.env.example` and fill values.
4. Run API:

```bash
uvicorn app.main:app --reload
```

## Backend env vars

- `DATABASE_URL`
- `APP_ENV`
- `APP_NAME`
- `CORS_ORIGINS`
- `AWS_REGION`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `S3_BUCKET_NAME`
- `S3_PUBLIC_BASE_URL` (optional)
- `MAX_UPLOAD_MB` (default `8`)

## API quick test

- `GET /health`
- `POST /uploads/photo` (`multipart/form-data`, field: `file`)
- `DELETE /uploads/photo`
- `POST /prediction-rules/seed`
- `POST /sightings`
- `GET /sightings`
- `GET /predictions?zone=Tarifa%20Centro&month=10&hour_bucket=dawn`

## Web setup

1. Go to frontend folder:

```bash
cd web
```

2. Install dependencies:

```bash
npm install
```

3. Create `web/.env` from `web/.env.example`.
4. Run dev server:

```bash
npm run dev
```

5. Build production:

```bash
npm run build
```

## Railway deploy

Use two services under one Railway project.

1. Backend service (`bird-api`)
- root: repository root
- start command from `railway.json` / `Procfile`
- set backend env vars above

2. Frontend service (`bird-web`)
- root directory: `web`
- build command: `npm install && npm run build`
- start command: `npm run start`
- env var: `VITE_API_BASE_URL=https://<bird-api-domain>`

3. Set backend `CORS_ORIGINS` to the frontend public domain.

## Notes

- No authentication is included yet (MVP speed).
- Photo uploads are validated by type and size in backend.
- If sighting creation fails after upload, the frontend calls delete cleanup.
