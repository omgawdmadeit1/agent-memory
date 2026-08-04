-- agent-memory skill: wallet-scoped KV (plugs into app Postgres / PGLite)
CREATE TABLE IF NOT EXISTS agent_memory (
  path TEXT PRIMARY KEY,
  scope TEXT NOT NULL CHECK (scope IN ('private', 'shared', 'public')),
  owner TEXT NOT NULL,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  bytes INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS agent_memory_owner_idx ON agent_memory (owner);
CREATE INDEX IF NOT EXISTS agent_memory_owner_scope_key_idx ON agent_memory (owner, scope, key);
CREATE INDEX IF NOT EXISTS agent_memory_path_prefix_idx ON agent_memory (path text_pattern_ops);
