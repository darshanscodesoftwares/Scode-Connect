import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import pg from "pg";
import { postgresStore } from "../backend/postgres.js";
import { seed } from "../app/seed.js";
import { removeCandidate } from "../app/model.js";

const url = process.env.SCODECONNECT_TEST_DATABASE_URL;
test(
  "shared records and recordings commit together, survive reopen and reject stale writes",
  { skip: !url },
  async () => {
    const workspace = "test-" + randomUUID();
    const first = postgresStore(url, workspace),
      second = postgresStore(url, workspace);
    try {
      const config = await first.config(),
        initial = await first.read();
      assert.equal(initial.candidates.length, 0);
      const s = seed(new Date(2026, 10, 24));
      const id = randomUUID(),
        call = s.calls[0];
      call.audioId = id;
      const audio = {
        id,
        mime: "audio/wav",
        base64: Buffer.from("sample audio").toString("base64"),
      };
      await first.save(config.instance, s, audio);
      const reopened = await second.read();
      assert.equal(reopened.revision, 1);
      assert.equal(reopened.candidates.length, 18);
      assert.equal((await second.audio(id)).audio.toString(), "sample audio");
      const saved = structuredClone(reopened);
      reopened.threshold = 4;
      await second.save(config.instance, reopened);
      await assert.rejects(first.save(config.instance, saved), { status: 409 });
      const invalid = await first.read();
      invalid.calls[0].audioId = randomUUID();
      await assert.rejects(first.save(config.instance, invalid), {
        status: 400,
      });
      assert.equal((await first.read()).revision, 2);
      const next = await first.read();
      removeCandidate(next, call.candidateId);
      await first.save(config.instance, next);
      await assert.rejects(second.audio(id), { status: 404 });
      assert.equal((await second.read()).candidates.length, 17);
    } finally {
      await first.close();
      await second.close();
      const pool = new pg.Pool({ connectionString: url });
      try {
        await pool.query("DELETE FROM scodeconnect.workspaces WHERE id=$1", [
          workspace,
        ]);
      } finally {
        await pool.end();
      }
    }
  },
);
