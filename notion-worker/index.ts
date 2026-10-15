// Landing Literacy: website leads -> Notion
//
// One webhook. The site's inquiry form and the free-resource download gate both POST
// a small JSON payload here, and each one becomes a row in the "Website Leads" database
// in the Mulvey's workspace.
//
// Needs one secret on the deployed worker: NOTION_API_TOKEN, from a Notion connection
// that has access to the "Landing Literacy" page. setup.sh handles it.

import { Worker } from "@notionhq/workers";

const DATABASE_ID = "a7e512005520457dba6b19c0b496108c";
const DATA_SOURCE_ID = "8bc55fbe-dca2-410e-961d-86b0b509c89e";

const STATES = ["NJ", "NY", "CT", "PA", "Other"];
const GRADES = ["K-2", "3-5", "Not sure yet"];
const SERVICES = [
  "Foundational Reading PD",
  "Assessment & Intervention",
  "Curriculum Design",
  "Program Selection & Rollout",
  "Instructional Coaching",
  "Ready-to-Use Resources",
];
const TIMELINES = ["This school year", "Summer planning", "Next school year", "Just exploring"];

type Lead = Record<string, unknown>;

const worker = new Worker();
export default worker;

worker.webhook("websiteLead", {
  title: "Website lead",
  description: "Adds landingliteracy.com inquiries and resource downloads to Website Leads",
  execute: async (events, { notion }) => {
    for (const event of events) {
      const lead = parse(event.body, event.rawBody);

      // Quietly drop bots (honeypot filled) and anything without a real email.
      if (str(lead._gotcha)) continue;
      const email = str(lead.email).toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200) continue;

      const isDownload = str(lead.source) === "resource-download";
      const properties: Record<string, unknown> = {
        Name: { title: richText(str(lead.name) || email, 200) },
        Type: { select: { name: isDownload ? "Resource download" : "Inquiry" } },
        Status: { status: { name: "New" } },
        Email: { email },
      };

      setText(properties, "Role", lead.role);
      setText(properties, "District", lead.district);
      setText(properties, "Resource", lead.resource);
      setText(properties, "Message", lead.message);
      setText(properties, "Fit check", lead.fit_check);

      const state = str(lead.state);
      if (STATES.includes(state)) properties.State = { select: { name: state } };

      const timeline = str(lead.timeline);
      if (TIMELINES.includes(timeline)) properties.Timeline = { select: { name: timeline } };

      const schools = Number(str(lead.schools));
      if (Number.isFinite(schools) && schools > 0 && schools < 1000) properties.Schools = { number: Math.round(schools) };

      const grades = pick(lead.grades, GRADES);
      if (grades.length) properties.Grades = { multi_select: grades.map((name) => ({ name })) };

      const services = pick(lead.services, SERVICES);
      if (services.length) properties.Services = { multi_select: services.map((name) => ({ name })) };

      await createRow(notion, properties);
    }
  },
});

// Newer Notion API versions parent rows by data source; older ones by database.
async function createRow(notion: any, properties: Record<string, unknown>) {
  try {
    await notion.pages.create({ parent: { type: "data_source_id", data_source_id: DATA_SOURCE_ID }, properties });
  } catch (first) {
    try {
      await notion.pages.create({ parent: { database_id: DATABASE_ID }, properties });
    } catch {
      throw first;
    }
  }
}

function parse(body: Record<string, unknown>, raw: string): Lead {
  if (body && Object.keys(body).length) return body;
  try {
    const parsed = JSON.parse(raw || "{}");
    if (parsed && typeof parsed === "object") return parsed as Lead;
  } catch {
    // not JSON
  }
  return Object.fromEntries(new URLSearchParams(raw || ""));
}

function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim();
}

function pick(value: unknown, allowed: string[]): string[] {
  const items = Array.isArray(value) ? value.map(str) : str(value).split(",").map((s) => s.trim());
  return [...new Set(items.filter((item) => allowed.includes(item)))];
}

// Notion caps each text chunk at 2,000 characters.
function richText(text: string, max = 6000) {
  const clipped = text.slice(0, max);
  const chunks = [];
  for (let i = 0; i < clipped.length; i += 1900) chunks.push({ text: { content: clipped.slice(i, i + 1900) } });
  return chunks;
}

function setText(properties: Record<string, unknown>, name: string, value: unknown) {
  const text = str(value);
  if (text) properties[name] = { rich_text: richText(text) };
}
