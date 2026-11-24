CREATE SCHEMA IF NOT EXISTS scodeconnect;
CREATE TABLE IF NOT EXISTS scodeconnect.workspaces (
  id text PRIMARY KEY,
  instance_id uuid UNIQUE NOT NULL,
  revision bigint NOT NULL DEFAULT 0,
  settings jsonb NOT NULL
);
CREATE TABLE IF NOT EXISTS scodeconnect.candidates (
  workspace_id text REFERENCES scodeconnect.workspaces(id) ON DELETE CASCADE,
  id text NOT NULL,
  data jsonb NOT NULL,
  PRIMARY KEY (workspace_id, id)
);
CREATE TABLE IF NOT EXISTS scodeconnect.calls (
  workspace_id text NOT NULL,
  id text NOT NULL,
  candidate_id text NOT NULL,
  data jsonb NOT NULL,
  PRIMARY KEY (workspace_id, id),
  FOREIGN KEY (workspace_id, candidate_id) REFERENCES scodeconnect.candidates(workspace_id, id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS scodeconnect.reminders (
  workspace_id text NOT NULL,
  id text NOT NULL,
  candidate_id text NOT NULL,
  data jsonb NOT NULL,
  PRIMARY KEY (workspace_id, id),
  FOREIGN KEY (workspace_id, candidate_id) REFERENCES scodeconnect.candidates(workspace_id, id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS scodeconnect.batches (
  workspace_id text REFERENCES scodeconnect.workspaces(id) ON DELETE CASCADE,
  id text NOT NULL,
  data jsonb NOT NULL,
  PRIMARY KEY (workspace_id, id)
);
CREATE TABLE IF NOT EXISTS scodeconnect.recordings (
  workspace_id text REFERENCES scodeconnect.workspaces(id) ON DELETE CASCADE,
  id text NOT NULL,
  mime text NOT NULL,
  audio bytea NOT NULL,
  PRIMARY KEY (workspace_id, id)
);
