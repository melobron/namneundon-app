CREATE TABLE conversations (
  id TEXT PRIMARY KEY,
  conv_id TEXT NOT NULL,
  delete_hash TEXT NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  industry TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX conversations_expiry ON conversations(created_at);
CREATE INDEX conversations_owner ON conversations(conv_id, delete_hash);
-- 본문·식별자를 넣지 않는 UTC 일별 사용량. 실행 중인 호출도 미리 예약한다.
CREATE TABLE usage (day TEXT PRIMARY KEY, neurons REAL NOT NULL DEFAULT 0);
