import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import pg from "pg";
import { seed } from "../app/seed.js";
import { phoneKey, statuses, batchStatuses } from "../app/model.js";

const tables = ["candidates", "calls", "reminders", "batches"];
export function httpError(status, message) {
  return Object.assign(new Error(message), { status });
}
const invalid = (message) => {
  throw httpError(400, message);
};
function validate(s) {
  if (
    !s ||
    s.version !== 1 ||
    !Number.isSafeInteger(s.revision) ||
    s.revision < 0
  )
    invalid("Invalid workspace revision.");
  if (
    !Number.isInteger(s.threshold) ||
    s.threshold < 2 ||
    s.threshold > 100 ||
    !Array.isArray(s.dismissed) ||
    s.dismissed.some((id) => typeof id !== "string")
  )
    invalid("Invalid workspace settings.");
  for (const table of tables) {
    const rows = s[table];
    if (
      !Array.isArray(rows) ||
      rows.some(
        (r) => !r || typeof r.id !== "string" || !r.id || r.id.length > 160,
      ) ||
      new Set(rows.map((r) => r.id)).size !== rows.length
    )
      invalid("Invalid " + table + " records.");
  }
  const ids = new Set(s.candidates.map((c) => c.id)),
    phones = new Set();
  for (const c of s.candidates) {
    if (
      ![c.name, c.phone, c.college, c.technology, c.createdAt].every(
        (v) => typeof v === "string" && v.trim(),
      ) ||
      !statuses.includes(c.status)
    )
      invalid("Incomplete candidate record.");
    const phone = phoneKey(c.phone);
    if (phones.has(phone))
      invalid("A candidate already uses this phone number.");
    phones.add(phone);
    if (
      c.availableFrom &&
      c.availableUntil &&
      c.availableFrom > c.availableUntil
    )
      invalid("Invalid availability window.");
  }
  for (const r of [...s.calls, ...s.reminders])
    if (!ids.has(r.candidateId) || typeof r.createdAt !== "string")
      invalid("Candidate reference is missing.");
  for (const r of s.reminders)
    if (!r.title || !Number.isFinite(Date.parse(r.scheduledAt)))
      invalid("Invalid follow-up.");
  for (const b of s.batches)
    if (
      !b.name ||
      !b.technology ||
      !b.startDate ||
      !batchStatuses.includes(b.status) ||
      !Array.isArray(b.candidateIds) ||
      b.candidateIds.some((id) => !ids.has(id)) ||
      new Set(b.candidateIds).size !== b.candidateIds.length ||
      (b.capacity && Number(b.capacity) < b.candidateIds.length)
    )
      invalid("Invalid batch details.");
}
async function writeRows(client, workspace, s) {
  // Table and column names come exclusively from this fixed server-side list.
  for (const name of tables) {
    const linked = name === "calls" || name === "reminders";
    const columns = linked ? ",candidate_id" : "";
    const values = linked ? ",item->>'candidateId'" : "";
    const update = linked ? ",candidate_id=EXCLUDED.candidate_id" : "";
    await client.query(
      `INSERT INTO scodeconnect.${name} AS current (workspace_id,id,data${columns})
      SELECT $1,item->>'id',item${values} FROM jsonb_array_elements($2::jsonb) AS item
      ON CONFLICT(workspace_id,id) DO UPDATE SET data=EXCLUDED.data${update}
      WHERE current.data IS DISTINCT FROM EXCLUDED.data`,
      [workspace, JSON.stringify(s[name])],
    );
    await client.query(
      `DELETE FROM scodeconnect.${name} WHERE workspace_id=$1 AND NOT(id=ANY($2::text[]))`,
      [workspace, s[name].map((x) => x.id)],
    );
  }
}
export function postgresStore(connectionString, workspace) {
  const pool = new pg.Pool({
    connectionString,
    max: 5,
    connectionTimeoutMillis: 4500,
  });
  pool.on("error", () => console.error("PostgreSQL connection interrupted."));
  let ready;
  async function transact(fn) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const value = await fn(client);
      await client.query("COMMIT");
      return value;
    } catch (err) {
      await client.query("ROLLBACK").catch(() => {});
      throw err;
    } finally {
      client.release();
    }
  }
  async function setup() {
    const sql = await readFile(
      new URL("./schema.sql", import.meta.url),
      "utf8",
    );
    return transact(async (client) => {
      await client.query(
        "SELECT pg_advisory_xact_lock(hashtext('scode.scodeconnect.schema.v1'))",
      );
      await client.query(sql);
      const inserted = await client.query(
        "INSERT INTO scodeconnect.workspaces(id,instance_id,settings) VALUES($1,$2,$3) ON CONFLICT DO NOTHING RETURNING instance_id",
        [workspace, randomUUID(), { threshold: 3, dismissed: [] }],
      );
      if (inserted.rowCount && workspace === "demo")
        await writeRows(client, workspace, seed());
      const {
        rows: [row],
      } = await client.query(
        "SELECT instance_id FROM scodeconnect.workspaces WHERE id=$1",
        [workspace],
      );
      return row.instance_id;
    });
  }
  const init = () =>
    (ready ||= setup().catch((error) => {
      ready = null;
      throw error;
    }));
  return {
    async config() {
      return { mode: "postgres", workspace, instance: await init() };
    },
    async read() {
      await init();
      const lists = tables.map(
        (t) =>
          `(SELECT coalesce(jsonb_agg(t.data ORDER BY t.id),'[]'::jsonb) FROM scodeconnect.${t} t WHERE t.workspace_id=w.id) AS ${t}`,
      );
      const {
        rows: [row],
      } = await pool.query(
        `SELECT revision,settings,${lists.join(",")} FROM scodeconnect.workspaces w WHERE w.id=$1`,
        [workspace],
      );
      const { settings, revision, ...records } = row;
      return {
        version: 1,
        revision: Number(revision),
        ...settings,
        ...records,
      };
    },
    async save(instance, s, audio) {
      const expected = await init();
      if (instance !== expected)
        throw httpError(
          409,
          "The database workspace changed. Reload before saving.",
        );
      validate(s);
      await transact(async (client) => {
        const {
          rows: [row],
        } = await client.query(
          "SELECT revision FROM scodeconnect.workspaces WHERE id=$1 FOR UPDATE",
          [workspace],
        );
        if (Number(row.revision) !== s.revision)
          throw httpError(
            409,
            "Another user updated this workspace. Reload and review your changes.",
          );
        if (audio) {
          if (
            typeof audio.id !== "string" ||
            typeof audio.base64 !== "string" ||
            typeof audio.mime !== "string" ||
            !s.calls.some((c) => c.audioId === audio.id)
          )
            invalid("Invalid voice note.");
          const bytes = Buffer.from(audio.base64, "base64");
          if (!bytes.length || bytes.length > 16 * 1024 * 1024)
            invalid("Voice notes must be between 1 byte and 16 MB.");
          await client.query(
            "INSERT INTO scodeconnect.recordings(workspace_id,id,mime,audio) VALUES($1,$2,$3,$4)",
            [workspace, audio.id, audio.mime.slice(0, 100), bytes],
          );
        }
        const audioIds = s.calls.map((c) => c.audioId).filter(Boolean);
        const { rowCount } = await client.query(
          "SELECT id FROM scodeconnect.recordings WHERE workspace_id=$1 AND id=ANY($2::text[])",
          [workspace, audioIds],
        );
        if (rowCount !== new Set(audioIds).size)
          invalid("A call references a missing recording.");
        await writeRows(client, workspace, s);
        await client.query(
          "DELETE FROM scodeconnect.recordings WHERE workspace_id=$1 AND NOT(id=ANY($2::text[]))",
          [workspace, audioIds],
        );
        await client.query(
          "UPDATE scodeconnect.workspaces SET revision=revision+1,settings=$2 WHERE id=$1",
          [workspace, { threshold: s.threshold, dismissed: s.dismissed }],
        );
      });
      return { revision: s.revision + 1 };
    },
    async audio(id) {
      await init();
      const {
        rows: [item],
      } = await pool.query(
        "SELECT mime,audio FROM scodeconnect.recordings WHERE workspace_id=$1 AND id=$2",
        [workspace, id],
      );
      if (!item) throw httpError(404, "Recording unavailable.");
      return item;
    },
    close: () => pool.end(),
  };
}
