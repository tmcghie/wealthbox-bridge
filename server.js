import express from "express";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const { WEALTHBOX_API_KEY, ASSIGNEE_ID = "28290", PORT = 3000 } = process.env;

// ─── Health check ─────────────────────────────────────────────────────────
app.get("/health", (_, res) => {
  res.json({ status: "ok", service: "Serenity WM – Wealthbox Bridge" });
});

// ─── Who am I ─────────────────────────────────────────────────────────────
app.get("/whoami", async (_, res) => {
  try {
    const r = await fetch("https://api.crmworkspace.com/v1/users/me", {
      headers: { ACCESS_TOKEN: WEALTHBOX_API_KEY }
    });
    const d = await r.json();
    res.json(d);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── Save page ─────────────────────────────────────────────────────────────
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
  .card-title{font-size:13px;font-weight:600;color:#3D2B57;margin-bottom:10px}
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
  .status{border-radius:10px;padding:12px 16px;font-size:13px;margin-top:12px;line-height:1.6}
  .status.info{background:#e8f0fe;color:#1a56db}
  .status.suc{background:#e8f5f0;color:#0f6e56}
  .status.err{background:#fdecea;color:#a32d2d}
  .badge{display:inline-flex;align-items:center;gap:4px;font-size:11px;padding:2px 10px;border-radius:20px;background:#e8f5f0;color:#0f6e56;font-weight:600;margin-left:8px}
  .user-bar{background:#fff;border:1px solid #e5e3ec;border-radius:10px;padding:10px 14px;margin-bottom:16px;font-size:13px;color:#555;display:flex;align-items:center;justify-content:space-between}
  .user-bar strong{color:#1a1a1a}
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

  <div class="user-bar" id="userBar">Loading your Wealthbox user info…</div>

  <div class="meta">
    <div><span style="color:#888">Client</span><br><strong>${client_name}</strong></div>
    <div><span style="color:#888">Date</span><br><strong>${meeting_date}</strong></div>
    <div><span style="color:#888">Tasks</span><br><strong>${tasks.length} action items</strong></div>
  </div>

  <div class="card">
    <div class="card-title">Meeting summary</div>
    <div class="preview">${summary.replace(/</g,"&lt;").replace(/>/g,"&gt;")}</div>
  </div>

  <div class="card">
    <div class="card-title">Follow-up email</div>
    <div class="preview">${email.replace(/</g,"&lt;").replace(/>/g,"&gt;")}</div>
  </div>

  <div class="card">
    <div class="card-title">Action items <span class="badge">Auto-assigned to you</span></div>
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

// Load user info on page load
fetch('/whoami')
  .then(r => r.json())
  .then(d => {
    const user = d.user || d;
    const id = user.id || '?';
    const name = [user.first_name, user.last_name].filter(Boolean).join(' ') || 'Unknown';
    const email = user.email || '';
    document.getElementById('userBar').innerHTML =
      'Saving as: <strong>' + name + '</strong> · ' + email + ' · User ID: <strong>' + id + '</strong>';
  })
  .catch(() => {
    document.getElementById('userBar').innerHTML = 'Could not load user info — check API key in Railway variables.';
  });

function setSt(type, msg) {
  document.getElementById('status').innerHTML = '<div class="status '+type+'">'+msg+'</div>';
}

async function saveAll() {
  const btn = document.getElementById('saveBtn');
  btn.disabled = true;
  btn.textContent = 'Saving…';
  setSt('info', 'Saving to Wealthbox…');

  try {
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
    setSt('suc',
      '✓ Saved successfully! · Contact ID: ' + results.contact_id +
      ' · ' + results.notes.length + ' notes · ' +
      results.tasks.length + ' tasks created'
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
    const assigneeId = parseInt(ASSIGNEE_ID) || 250553;
    console.log("Assigning tasks to user ID:", assigneeId);

    // Find or create contact
    const sr = await fetch(
      `https://api.crmworkspace.com/v1/contacts?first_name=${encodeURIComponent(firstName)}&last_name=${encodeURIComponent(lastName)}`,
      { headers: { ACCESS_TOKEN: WEALTHBOX_API_KEY } }
    );
    const sd = await sr.json();
    let contactId = sd.contacts?.[0]?.id;
    console.log("Contact search result:", JSON.stringify(sd).substring(0, 200));

    if (!contactId) {
      const cr = await fetch("https://api.crmworkspace.com/v1/contacts", {
        method: "POST",
        headers: { ACCESS_TOKEN: WEALTHBOX_API_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ contact: { first_name: firstName, last_name: lastName, type: "Person" } }),
      });
      const cd = await cr.json();
      console.log("Contact create result:", JSON.stringify(cd).substring(0, 200));
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
    console.log("Note result:", JSON.stringify(nd).substring(0, 200));
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
            assignee_id: assigneeId,
            linked_to: [{ id: contactId, type: "Contact" }],
          },
        }),
      });
      const td = await tr.json();
      console.log("Task result:", JSON.stringify(td).substring(0, 200));
      if (td.task?.id) results.tasks.push({ title: task.title, id: td.task.id });
    }

    res.json({ success: true, results });
  } catch (err) {
    console.error("Save error:", err);
    res.status(500).json({ error: err.message });
  }
});


// ─── Debug endpoint ────────────────────────────────────────────────────────
app.get("/debug", async (_, res) => {
  const results = {};
  try {
    // Test 1: list contacts
    const r1 = await fetch("https://api.crmworkspace.com/v1/contacts?per_page=1", {
      headers: { ACCESS_TOKEN: WEALTHBOX_API_KEY }
    });
    results.contacts_status = r1.status;
    results.contacts_text = await r1.text();
  } catch(e) { results.contacts_error = e.message; }

  try {
    // Test 2: list tasks
    const r2 = await fetch("https://api.crmworkspace.com/v1/tasks?per_page=1", {
      headers: { ACCESS_TOKEN: WEALTHBOX_API_KEY }
    });
    results.tasks_status = r2.status;
    results.tasks_text = await r2.text();
  } catch(e) { results.tasks_error = e.message; }

  res.json(results);
});

app.listen(PORT, () =>
  console.log(`Serenity WM Wealthbox Bridge running on port ${PORT}`)
);
