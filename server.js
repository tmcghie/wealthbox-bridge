import express from "express";
import crypto from "crypto";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const { WEALTHBOX_API_KEY, ASSIGNEE_ID = "28290", PORT = 3000 } = process.env;

// ─── Health check ─────────────────────────────────────────────────────────
app.get("/health", (_, res) => {
  res.json({ status: "ok", service: "Serenity WM – Wealthbox Bridge" });
});

// ─── Save page ─────────────────────────────────────────────────────────────
// Claude links to /save?d=BASE64_JSON — user opens in browser, clicks Save
app.get("/save", (req, res) => {
  let data = {};
  try {
    if (req.query.d) {
      data = JSON.parse(Buffer.from(req.query.d, "base64").toString("utf8"));
    }
  } catch (e) {
    data = {};
  }

  const { client_name = "", meeting_date = "", summary = "", email = "", tasks = [] } = data;

  const tasksJson = JSON.stringify(tasks).replace(/'/g, "\\'");

  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Save Meeting – ${client_name} – Serenity WM</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f5f4f8;min-height:100vh;padding:2rem 1rem}
  .wrap{max-width:640px;margin:0 auto}
  .header{display:flex;align-items:center;gap:14px;margin-bottom:2rem}
  .logo{width:42px;height:42px;border-radius:10px;background:#3D2B57;display:flex;align-items:center;justify-content:center;color:#fff;font-size:20px;font-weight:700;flex-shrink:0}
  .header-text h1{font-size:18px;font-weight:600;color:#1a1a1a}
  .header-text p{font-size:13px;color:#666;margin-top:2px}
  .card{background:#fff;border-radius:12px;border:1px solid #e5e3ec;padding:1.25rem;margin-bottom:16px}
  .card-title{font-size:13px;font-weight:600;color:#3D2B57;margin-bottom:10px;display:flex;align-items:center;gap:6px}
  .meta{display:flex;gap:24px;font-size:13px;color:#555;margin-bottom:16px}
  .meta strong{color:#1a1a1a}
  .preview{font-size:13px;color:#444;line-height:1.65;white-space:pre-wrap;max-height:160px;overflow-y:auto;background:#faf9fc;border-radius:8px;padding:12px;border:1px solid #ede9f5}
  .task-list{list-style:none}
  .task-item{display:flex;align-items:flex-start;gap:10px;padding:7px 0;border-bottom:1px solid #f0eef8}
  .task-item:last-child{border-bottom:none}
  .task-cb{margin-top:2px;accent-color:#3D2B57;width:15px;height:15px;flex-shrink:0}
  .task-title{font-size:13px;font-weight:500;color:#1a1a1a}
  .task-due{font-size:11px;color:#888;margin-top:2px}
  .btn{width:100%;padding:13px;border-radius:10px;background:#3D2B57;color:#fff;border:none;font-size:15px;font-weight:600;cursor:pointer;margin-top:8px;display:flex;align-items:center;justify-content:center;gap:8px}
  .btn:hover{background:#2e2044}
  .btn:disabled{opacity:.5;cursor:not-allowed}
  .btn.suc{background:#1D9E75}
  .status{border-radius:10px;padding:12px 16px;font-size:13px;display:flex;align-items:flex-start;gap:8px;margin-top:12px;line-height:1.5}
  .status.info{background:#e8f0fe;color:#1a56db}
  .status.suc{background:#e8f5f0;color:#0f6e56}
  .status.err{background:#fdecea;color:#a32d2d}
  .badge{display:inline-flex;align-items:center;gap:4px;font-size:11px;padding:2px 10px;border-radius:20px;background:#e8f5f0;color:#0f6e56;font-weight:600}
</style>
</head>
<body>
<div class="wrap">
  <div class="header">
    <div class="logo">S</div>
    <div class="header-text">
      <h1>Save meeting to Wealthbox</h1>
      <p>Serenity Wealth Management · Trevor McGhie CFP®</p>
    </div>
  </div>

  <div class="meta">
    <div><span style="color:#888">Client</span><br><strong>${client_name}</strong></div>
    <div><span style="color:#888">Date</span><br><strong>${meeting_date}</strong></div>
    <div><span style="color:#888">Tasks</span><br><strong>${tasks.length} action items</strong></div>
  </div>

  <div class="card">
    <div class="card-title">📋 Meeting summary</div>
    <div class="preview">${summary.replace(/</g,"&lt;").replace(/>/g,"&gt;")}</div>
  </div>

  <div class="card">
    <div class="card-title">✉️ Follow-up email</div>
    <div class="preview">${email.replace(/</g,"&lt;").replace(/>/g,"&gt;")}</div>
  </div>

  <div class="card">
    <div class="card-title">✅ Action items <span class="badge">Auto-assigned to Trevor</span></div>
    <ul class="task-list" id="taskList">
      ${tasks.map((t,i) => `
      <li class="task-item">
        <input type="checkbox" class="task-cb" id="tc${i}" checked>
        <div>
          <div class="task-title">${t.title}</div>
          <div class="task-due">Due ${t.due}${t.description ? ' · '+t.description : ''}</div>
        </div>
      </li>`).join('')}
    </ul>
  </div>

  <button class="btn" id="saveBtn" onclick="saveAll()">Save to Wealthbox</button>
  <div id="status"></div>
</div>

<script>
const CLIENT = ${JSON.stringify(client_name)};
const DATE = ${JSON.stringify(meeting_date)};
const SUMMARY = ${JSON.stringify(summary)};
const EMAIL = ${JSON.stringify(email)};
const TASKS = ${JSON.stringify(tasks)};
const ASSIGNEE_ID = ${ASSIGNEE_ID};

function setSt(type, msg) {
  document.getElementById('status').innerHTML =
    '<div class="status '+type+'">'+msg+'</div>';
}

async function saveAll() {
  const btn = document.getElementById('saveBtn');
  btn.disabled = true;
  btn.textContent = 'Saving…';

  try {
    setSt('info', 'Looking up '+CLIENT+' in Wealthbox…');
    const sr = await fetch('/api/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_name: CLIENT,
        meeting_date: DATE,
        summary: SUMMARY,
        email: EMAIL,
        tasks: TASKS.filter((_, i) => document.getElementById('tc'+i)?.checked)
      })
    });
    const d = await sr.json();
    if (!sr.ok) throw new Error(d.error || 'Save failed');

    const { results } = d;
    const taskCount = results.tasks.length;
    setSt('suc',
      '✓ Saved to Wealthbox successfully!<br>' +
      'Contact ID: ' + results.contact_id + ' · ' +
      results.notes.length + ' notes saved · ' +
      taskCount + ' task' + (taskCount !== 1 ? 's' : '') + ' created and assigned to Trevor'
    );
    btn.textContent = '✓ Saved!';
    btn.className = 'btn suc';
  } catch(e) {
    setSt('err', 'Error: ' + e.message);
    btn.disabled = false;
    btn.textContent = 'Save to Wealthbox';
  }
}
</script>
</body>
</html>`);
});

// ─── API: Save to Wealthbox ─────────────────────────────────────────────────
app.post("/api/save", async (req, res) => {
  const { client_name, meeting_date, summary, email, tasks = [] } = req.body;
  if (!client_name || !summary) {
    return res.status(400).json({ error: "client_name and summary are required." });
  }

  const [firstName, ...rest] = client_name.trim().split(" ");
  const lastName = rest.join(" ");

  try {
    // Find or create contact
    const sr = await fetch(
      `https://api.crmworkspace.com/v1/contacts?first_name=${encodeURIComponent(firstName)}&last_name=${encodeURIComponent(lastName)}`,
      { headers: { ACCESS_TOKEN: WEALTHBOX_API_KEY } }
    );
    const sd = await sr.json();
    let contactId = sd.contacts?.[0]?.id;

    if (!contactId) {
      const cr = await fetch("https://api.crmworkspace.com/v1/contacts", {
        method: "POST",
        headers: { ACCESS_TOKEN: WEALTHBOX_API_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ contact: { first_name: firstName, last_name: lastName, type: "Person" } }),
      });
      const cd = await cr.json();
      if (!cd.contact?.id) throw new Error("Could not create contact: " + JSON.stringify(cd));
      contactId = cd.contact.id;
    }

    const results = { contact_id: contactId, notes: [], tasks: [] };

    // Save summary note
    const nr = await fetch("https://api.crmworkspace.com/v1/notes", {
      method: "POST",
      headers: { ACCESS_TOKEN: WEALTHBOX_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({
        note: {
          name: `Meeting Summary – ${client_name} – ${meeting_date}`,
          content: summary,
          linked_to: [{ id: contactId, type: "Contact" }],
        },
      }),
    });
    const nd = await nr.json();
    if (nd.note?.id) results.notes.push({ type: "summary", id: nd.note.id });

    // Save email note
    if (email) {
      const er = await fetch("https://api.crmworkspace.com/v1/notes", {
        method: "POST",
        headers: { ACCESS_TOKEN: WEALTHBOX_API_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({
          note: {
            name: `Follow-up Email – ${client_name} – ${meeting_date}`,
            content: email,
            linked_to: [{ id: contactId, type: "Contact" }],
          },
        }),
      });
      const ed = await er.json();
      if (ed.note?.id) results.notes.push({ type: "email", id: ed.note.id });
    }

    // Create tasks
    for (const task of tasks) {
      const tr = await fetch("https://api.crmworkspace.com/v1/tasks", {
        method: "POST",
        headers: { ACCESS_TOKEN: WEALTHBOX_API_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({
          task: {
            name: task.title,
            description: task.description || "",
            due_date: task.due,
            assignee_id: parseInt(ASSIGNEE_ID),
            linked_to: [{ id: contactId, type: "Contact" }],
          },
        }),
      });
      const td = await tr.json();
      if (td.task?.id) results.tasks.push({ title: task.title, id: td.task.id });
    }

    res.json({ success: true, results });
  } catch (err) {
    console.error("Save error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () =>
  console.log(`Serenity WM Wealthbox Bridge running on port ${PORT}`)
);
