-- 124차 주제 집계와 개선 기록. 0001 은 고치지 않는다.
-- 주제 집계: 한국 날짜·주제 코드·출처(chip|typed)별 횟수만. 질문 글·IP·식별값 없음. 90일 지나면 예약 작업이 지운다.
CREATE TABLE topic_counts (
  day TEXT NOT NULL,
  topic TEXT NOT NULL,
  source TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, topic, source)
);
-- 개선 기록: 운영자가 적는 날짜(KST, 시각 없음)·주제·틀린 유형·메모. 대화 번호·업종과 연결하지 않고 자동 삭제하지 않는다.
CREATE TABLE improvement_notes (
  id TEXT PRIMARY KEY,
  day TEXT NOT NULL,
  topic TEXT NOT NULL,
  kind TEXT NOT NULL,
  note TEXT NOT NULL
);
