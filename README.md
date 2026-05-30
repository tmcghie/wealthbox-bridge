# Serenity WM – Wealthbox Bridge

A lightweight Express server that acts as a bridge between Claude and Wealthbox CRM.

## How it works
Claude fetches your Zoom meeting notes, generates a summary + follow-up email + action items,
then calls this server's /save-meeting endpoint to save everything to Wealthbox in one shot.

## Deploy to Railway

1. Push this folder to a GitHub repo
2. Go to railway.app → New Project → Deploy from GitHub
3. Add these environment variables in Railway:
   - WEALTHBOX_API_KEY — your Wealthbox API key
   - ASSIGNEE_ID — 28290 (Trevor McGhie's Wealthbox user ID)
4. Copy the Railway public URL (e.g. https://serenity-bridge.up.railway.app)
5. Share that URL with Claude — Claude will call /save-meeting automatically

## Endpoints

GET  /health        — confirms server is running
POST /save-meeting  — saves summary, email draft, and tasks to Wealthbox

## POST /save-meeting body
{
  "client_name": "Hugo Alvarez",
  "meeting_date": "April 30, 2026",
  "summary": "Meeting summary text...",
  "email": "Follow-up email text...",
  "tasks": [
    { "title": "Task title", "description": "Detail", "due": "2026-06-05" }
  ]
}
