import express from "express";

const app = express();
app.use(express.json());

const { WEALTHBOX_API_KEY, ASSIGNEE_ID = "28290", PORT = 3000 } = process.env;

// ─── Health check ────────────────────────────────────────────────────────────
app.get("/health", (_, res) => {
  res.json({ status: "ok", service: "Serenity WM – Wealthbox Bridge" });
});

// ─── Find or create contact ──────────────────────────────────────────────────
async function findOrCreateContact(firstName, lastName) {
  const search = await fetch(
    `https://api.crmworkspace.com/v1/contacts?first_name=${encodeURIComponent(firstName)}&last_name=${encodeURIComponent(lastName)}`,
    { headers: { ACCESS_TOKEN: WEALTHBOX_API_KEY } }
  );
  const data = await search.json();
  if (data.contacts?.[0]?.id) return data.contacts[0].id;

  const create = await fetch("https://api.crmworkspace.com/v1/contacts", {
    method: "POST",
    headers: { ACCESS_TOKEN: WEALTHBOX_API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ contact: { first_name: firstName, last_name: lastName, type: "Person" } }),
  });
  const created = await create.json();
  if (!created.contact?.id) throw new Error("Could not create contact: " + JSON.stringify(created));
  return created.contact.id;
}

// ─── POST /save-meeting ──────────────────────────────────────────────────────
// Body: { client_name, meeting_date, summary, email, tasks: [{title, description, due}] }
app.post("/save-meeting", async (req, res) => {
  const { client_name, meeting_date, summary, email, tasks = [] } = req.body;

  if (!client_name || !summary) {
    return res.status(400).json({ error: "client_name and summary are required." });
  }

  const [firstName, ...rest] = client_name.trim().split(" ");
  const lastName = rest.join(" ");

  try {
    const contactId = await findOrCreateContact(firstName, lastName);
    const results = { contact_id: contactId, notes: [], tasks: [] };

    // Save meeting summary note
    const noteRes = await fetch("https://api.crmworkspace.com/v1/notes", {
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
    const noteData = await noteRes.json();
    if (noteData.note?.id) results.notes.push({ type: "summary", id: noteData.note.id });

    // Save follow-up email as note
    if (email) {
      const emailRes = await fetch("https://api.crmworkspace.com/v1/notes", {
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
      const emailData = await emailRes.json();
      if (emailData.note?.id) results.notes.push({ type: "email", id: emailData.note.id });
    }

    // Create tasks
    for (const task of tasks) {
      const taskRes = await fetch("https://api.crmworkspace.com/v1/tasks", {
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
      const taskData = await taskRes.json();
      if (taskData.task?.id) results.tasks.push({ title: task.title, id: taskData.task.id });
    }

    res.json({ success: true, results });
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () =>
  console.log(`Serenity WM Wealthbox Bridge running on port ${PORT}`)
);
