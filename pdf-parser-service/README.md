# PDF Parser Service

External service for parsing PDFs in AGENTYC. This service runs separately from the Vercel app and uses native `pdf-parse` library, which works reliably in traditional Node.js environments but not in serverless.

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set environment variables:**
   ```bash
   export SUPABASE_URL="your-supabase-url"
   export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
   export PORT=3001  # optional, defaults to 3001
   ```

3. **Run locally:**
   ```bash
   npm start
   # or for development with auto-reload:
   npm run dev
   ```

## Deployment

### Railway

1. Create a new Railway project
2. Connect your GitHub repo or deploy from CLI
3. Set environment variables in Railway dashboard
4. Deploy

### Fly.io

1. Install Fly CLI: `npm i -g @fly/cli`
2. Run `fly launch`
3. Set secrets: `fly secrets set SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=...`
4. Deploy: `fly deploy`

### VPS (Traditional Server)

1. Clone repo and install dependencies
2. Use PM2 or systemd to run as a service
3. Configure environment variables
4. Set up reverse proxy (nginx) if needed

## API

### Health Check

```
GET /health
```

Returns: `{ "status": "ok", "service": "pdf-parser" }`

### Parse PDF

```
POST /parse-pdf
Content-Type: application/json

{
  "storagePath": "default-user/1734672000000-a1b2c3d4-book.pdf"
}
```

**Success Response:**
```json
{
  "text": "extracted text from PDF..."
}
```

**Error Response:**
```json
{
  "error": "error message..."
}
```

Status codes:
- `200`: Success
- `400`: Invalid request (missing storagePath)
- `404`: PDF not found in storage
- `422`: PDF parsed but no text content
- `500`: Internal server error

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key (for storage access) |
| `PORT` | No | Server port (default: 3001) |

## Integration with AGENTYC

In AGENTYC, set the environment variable:

```bash
PDF_PARSER_URL=https://your-pdf-parser-service.railway.app
```

The AGENTYC app will call this service to extract text from PDFs.

