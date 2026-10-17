import { test, expect } from '@playwright/test';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import * as acorn from 'acorn';
import { loadCore } from './core/load-core.mjs';
import worker, {
  accessAllowed,
  validSummary,
  nextReset,
  SYSTEM,
  TOPICS,
  kstDay,
  ADMIN,
  weekStart,
  weeklyTopics,
  MODELS
} from '../chat/src/index.js';
import {
  TOPIC_WORDS,
  topicOf,
  checkAnswer,
  fallbackAnswer,
  fixedAnswer
} from '../chat/src/answers.js';

const ORIGIN = 'https://app.namneundon.com';
const token = 'a'.repeat(64);
// 시험용 가짜 비밀값. 실제 TESTER_KEY 는 wrangler secret 으로만 넣는다.
const TESTER = 'fake2server2test2secret';
const convId = '00000000-0000-4000-8000-000000000001';
function month() {
  return {
    month: '2025-04',
    dataEnd: '2025-04-30',
    complete: true,
    earned: 700000,
    spent: 2500000,
    difference: -1800000,
    sales: 700000,
    otherIncome: 0,
    unknown: 0,
    categories: [{ label: '보험', amount: 2500000, ratio: null }],
    materialRatio: null,
    ratioLabel: '매입 비율'
  };
}
// 운영자 확인용 저장을 켠 질문만 convId 를 보낸다. 꺼진 질문은 {question, summary, share:false} 뿐이다.
function body(share = false) {
  return {
    question: '이 뜻은 무엇인가요?',
    summary: { industry: '약국', current: month(), previous: [] },
    share,
    ...(share ? { convId } : {})
  };
}
function setup() {
  const sql = new DatabaseSync(':memory:');
  for (const m of ['0001_init.sql', '0002_topics_notes.sql'])
    sql.exec(readFileSync(new URL('../chat/migrations/' + m, import.meta.url), 'utf8'));
  const DB = {
    prepare(query) {
      let args = [];
      const statement = {
        bind(...values) {
          args = values;
          return statement;
        },
        async first() {
          return sql.prepare(query).get(...args) || null;
        },
        async run() {
          return sql.prepare(query).run(...args);
        },
        async all() {
          return { results: sql.prepare(query).all(...args) };
        }
      };
      return statement;
    },
    async batch(statements) {
      return Promise.all(statements.map((s) => s.run()));
    }
  };
  let calls = 0;
  const env = {
    DB,
    CHAT_MODEL: '@cf/mistralai/mistral-small-3.1-24b-instruct',
    DAILY_NEURONS: '8000',
    ACCESS_TEAM: 'TODO_TEAM',
    ACCESS_AUD: 'TODO_AUD',
    TESTER_KEY: TESTER,
    AI: {
      async run() {
        calls++;
        return {
          response: '2025년 4월 자료 설명입니다.',
          usage: { prompt_tokens: 2000, completion_tokens: 500 }
        };
      }
    }
  };
  return { sql, env, calls: () => calls };
}
function request(data, key = token, tester = TESTER) {
  return new Request('https://chat.namneundon.com/api/chat', {
    method: 'POST',
    headers: {
      Origin: ORIGIN,
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + key,
      ...(tester === null ? {} : { 'X-Namneundon-Tester': tester })
    },
    body: JSON.stringify(data)
  });
}
test('공유 미동의: 대화·요약 미저장, 내용 없는 사용량만 집계', async () => {
  const s = setup();
  const res = await worker.fetch(request(body()), s.env);
  expect(res.status).toBe(200);
  expect(s.sql.prepare('SELECT * FROM conversations').all()).toEqual([]);
  expect(s.sql.prepare('SELECT neurons FROM usage').get().neurons).toBe(89);
  s.sql.close();
});
test('공유 대화 저장과 삭제: 번호만 알거나 다른 키로는 지울 수 없음', async () => {
  const s = setup();
  expect((await worker.fetch(request(body(true)), s.env)).status).toBe(200);
  expect(s.sql.prepare('SELECT question FROM conversations').all()).toHaveLength(1);
  const del = (key) =>
    worker.fetch(
      new Request('https://chat.namneundon.com/api/chat/' + convId, {
        method: 'DELETE',
        headers: { Origin: ORIGIN, Authorization: key, 'X-Namneundon-Tester': TESTER }
      }),
      s.env
    );
  expect((await del('')).status).toBe(403);
  await del('Bearer ' + 'b'.repeat(64));
  expect(s.sql.prepare('SELECT * FROM conversations').all()).toHaveLength(1);
  expect((await del('Bearer ' + token)).status).toBe(200);
  expect(s.sql.prepare('SELECT * FROM conversations').all()).toHaveLength(0);
  s.sql.close();
});
test('요약 이름 칸·임의 항목·긴 질문·잘못된 날짜 거절', async () => {
  const s = setup();
  for (const mutate of [
    (b) => {
      b.summary.payee = '개인 이름';
    },
    (b) => {
      b.summary.current.categories[0].label = '홍길동';
    },
    (b) => {
      b.summary.current.dataEnd = '2025-02-31';
    },
    (b) => {
      b.question = '가'.repeat(301);
    },
    (b) => {
      b.summary.current.earned = 999;
    }
  ]) {
    const b = body();
    mutate(b);
    expect((await worker.fetch(request(b), s.env)).status).toBe(400);
  }
  expect(s.calls()).toBe(0);
  s.sql.close();
});
test('큰 본문은 모델을 부르지 않음', async () => {
  const s = setup();
  const b = body();
  b.question = '가'.repeat(24000);
  expect((await worker.fetch(request(b), s.env)).status).toBe(400);
  expect(s.calls()).toBe(0);
  s.sql.close();
});
test('전체 한도는 호출 전에 검사하고 오전 9시 재개 시각 반환', async () => {
  const s = setup();
  s.sql.prepare('INSERT INTO usage VALUES (?, ?)').run(new Date().toISOString().slice(0, 10), 8000);
  const res = await worker.fetch(request(body()), s.env);
  expect(res.status).toBe(429);
  expect((await res.json()).nextAvailable).toBe(nextReset());
  expect(nextReset(Date.parse('2026-10-16T23:59:00Z'))).toBe('2026-10-17T00:00:00.000Z');
  expect(s.calls()).toBe(0);
  s.sql.close();
});
test('동시 요청도 예약 합계가 한도를 넘으면 거절', async () => {
  const s = setup();
  s.env.DAILY_NEURONS = '500';
  const replies = await Promise.all(
    Array.from({ length: 10 }, () => worker.fetch(request(body()), s.env))
  );
  expect(replies.some((r) => r.status === 429)).toBe(true);
  expect(s.calls()).toBeLessThan(10);
  s.sql.close();
});
test('Access 누락·가짜 서명·자리표시 설정은 관리자 접근 차단', async () => {
  const s = setup();
  for (const path of ['/admin', '/api/admin/list', '/api/admin/' + convId]) {
    expect(
      (await worker.fetch(new Request('https://chat.namneundon.com' + path), s.env)).status
    ).toBe(403);
  }
  expect(
    await accessAllowed(
      new Request('https://chat.namneundon.com/admin', {
        headers: { 'Cf-Access-Jwt-Assertion': 'fake.fake.fake' }
      }),
      { ACCESS_TEAM: 'example', ACCESS_AUD: 'expected' }
    )
  ).toBe(false);
  s.sql.close();
});
test('만료 대화와 지난 날짜 사용량 정리', async () => {
  const s = setup();
  const insert = s.sql.prepare('INSERT INTO conversations VALUES (?, ?, ?, ?, ?, ?, ?)');
  insert.run('old', convId, token, '질문', '답', '약국', Date.now() - 31 * 86400000);
  insert.run('new', convId, token, '질문', '답', '약국', Date.now());
  s.sql.prepare('INSERT INTO usage VALUES (?, ?)').run('2020-01-01', 100);
  await worker.scheduled({}, s.env);
  expect(
    s.sql
      .prepare('SELECT id FROM conversations')
      .all()
      .map((r) => r.id)
  ).toEqual(['new']);
  expect(s.sql.prepare('SELECT * FROM usage').all()).toEqual([]);
  s.sql.close();
});
test('모델 미선택·다른 출처·미완결 비교 달 차단', async () => {
  const s = setup();
  s.env.CHAT_MODEL = 'TODO_MODEL';
  expect((await worker.fetch(request(body()), s.env)).status).toBe(503);
  expect(
    (
      await worker.fetch(
        new Request('https://chat.namneundon.com/api/chat', { method: 'POST' }),
        s.env
      )
    ).status
  ).toBe(403);
  const b = body();
  b.summary.previous.push({ ...month(), month: '2025-03', complete: false });
  expect(validSummary(b.summary)).toBe(false);
  s.sql.close();
});

test('Access 서명·대상·기한 검증, 위조 거절', async () => {
  const pair = await crypto.subtle.generateKey(
    {
      name: 'RSASSA-PKCS1-v1_5',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256'
    },
    true,
    ['sign', 'verify']
  );
  const jwk = { ...(await crypto.subtle.exportKey('jwk', pair.publicKey)), kid: 'test-key' };
  const original = globalThis.fetch;
  globalThis.fetch = async () => Response.json({ keys: [jwk] });
  const env = { ACCESS_TEAM: 'test-team', ACCESS_AUD: 'test-audience' };
  const now = Math.floor(Date.now() / 1000);
  async function signed(overrides = {}, tamper = false) {
    const encode = (v) => Buffer.from(JSON.stringify(v)).toString('base64url');
    const head = encode({ alg: 'RS256', kid: 'test-key' });
    const payload = encode({
      iss: 'https://test-team.cloudflareaccess.com',
      aud: ['test-audience'],
      exp: now + 300,
      iat: now,
      ...overrides
    });
    const sig = new Uint8Array(
      await crypto.subtle.sign(
        'RSASSA-PKCS1-v1_5',
        pair.privateKey,
        new TextEncoder().encode(head + '.' + payload)
      )
    );
    if (tamper) sig[0] ^= 1;
    return new Request('https://chat.namneundon.com/admin', {
      headers: {
        'Cf-Access-Jwt-Assertion':
          head + '.' + payload + '.' + Buffer.from(sig).toString('base64url')
      }
    });
  }
  try {
    expect(await accessAllowed(await signed(), env)).toBe(true);
    expect(await accessAllowed(await signed({ exp: now - 1 }), env)).toBe(false);
    expect(await accessAllowed(await signed({ aud: ['other'] }), env)).toBe(false);
    expect(await accessAllowed(await signed({}, true), env)).toBe(false);
  } finally {
    globalThis.fetch = original;
  }
});

test('빈 항목·빈 비교 달은 서버 오류 대신 400', async () => {
  const s = setup();
  const a = body();
  a.summary.current.categories = [null];
  expect((await worker.fetch(request(a), s.env)).status).toBe(400);
  const b = body();
  b.summary.previous = [null];
  expect((await worker.fetch(request(b), s.env)).status).toBe(400);
  s.sql.close();
});

test('앱 실제 집계 요약을 서버가 수용하고 사용자 항목명은 제외', () => {
  const ctx = loadCore();
  Object.assign(ctx, {
    URLSearchParams,
    location: { search: '' },
    lsGet: () => null,
    UP: {
      month: '2025-04',
      trade: '약국',
      merge: {},
      manual: {},
      baseCats: ctx.UP_CATS.slice(),
      rows: [
        { at: '2025-04-01 09:00:00', payee: '입금개인명', amount: 700000, balance: 700000 },
        { at: '2025-04-30 09:00:00', payee: '출금개인명', amount: -100000, balance: 600000 }
      ],
      byName: {
        입금개인명: { name: '입금개인명', cat: '매출', mixed: false },
        출금개인명: { name: '출금개인명', cat: '홍길동 지급', mixed: false }
      }
    }
  });
  for (const file of ['07-state-categories.js', '14-compute.js']) {
    const source = readFileSync(new URL('../app/src/' + file, import.meta.url), 'utf8');
    for (const node of acorn.parse(source, { ecmaVersion: 'latest' }).body)
      if (
        node.type === 'FunctionDeclaration' &&
        ['baseName', 'tradeNow', 'tradeInfo', 'monthList', 'monthNumbers'].includes(node.id.name)
      )
        vm.runInContext(source.slice(node.start, node.end), ctx);
  }
  vm.runInContext(readFileSync(new URL('../app/src/17-chat.js', import.meta.url), 'utf8'), ctx);
  const summary = JSON.parse(JSON.stringify(ctx.chatSummary()));
  expect(validSummary(summary)).toBe(true);
  expect(summary.current.earned).toBe(700000);
  expect(summary.current.difference).toBe(600000);
  expect(summary.current.complete).toBe(true);
  const serialized = JSON.stringify(summary);
  for (const name of ['입금개인명', '출금개인명', '홍길동 지급'])
    expect(serialized).not.toContain(name);
  expect(summary.current.categories[0].label).toBe('사용자 지정 항목');
});

test('지시문에 차액·잔액 설명 원칙, 요약에 잔액 칸 없음', async () => {
  const s = setup();
  let sent;
  /** @type {any} */ (s.env.AI).run = async (model, input) => {
    sent = input;
    return { response: '설명', usage: { prompt_tokens: 2000, completion_tokens: 500 } };
  };
  expect((await worker.fetch(request(body()), s.env)).status).toBe(200);
  const system = sent.messages.find((m) => m.role === 'system').content;
  expect(system).toBe(SYSTEM);
  for (const rule of [
    "차액은 선택한 기간의 '사업으로 번 돈'에서 '사업에 쓴 돈'을 뺀 값입니다.",
    '그 기간 전에 남아 있던 돈, 대표님이 넣거나 가져간 돈, 대출 등도 반영되어',
    '계좌 간 이체의 영향은 어떤 계좌들을 함께 보는지에 따라 다릅니다.',
    '아직 정하지 않은 거래도 차액에 영향을 줍니다.',
    '대표님 자료에서 확인할 수 없다고 말합니다.',
    '미분류 금액을 입금·출금으로 나눠 계산하거나 날짜를 추정하지 않습니다.'
  ])
    expect(system).toContain(rule);
  // 요약에는 잔액을 넣지 않는다 — 잔액 칸이 붙은 요약은 거절한다.
  const withBalance = body();
  withBalance.summary.current.balance = 1000000;
  expect(validSummary(withBalance.summary)).toBe(false);
  expect((await worker.fetch(request(withBalance), s.env)).status).toBe(400);
  s.sql.close();
});

// 124-5 공개: 시험 키 검사를 걷어냈다 — 질문·삭제는 시험 키 없이 처리한다
test('공개: 질문·삭제는 시험 키 없이 처리, 사전 요청 허용 헤더에 시험자 헤더 없음', async () => {
  const s = setup();
  const plain = new Request('https://chat.namneundon.com/api/chat', {
    method: 'POST',
    headers: { Origin: ORIGIN, 'Content-Type': 'application/json' },
    body: JSON.stringify(body(false))
  });
  expect((await worker.fetch(plain, s.env)).status).toBe(200);
  expect(s.calls()).toBe(1);
  // 비밀값이 없어도 된다
  const noSecret = { ...s.env, TESTER_KEY: undefined };
  expect((await worker.fetch(request(body(false), token, null), noSecret)).status).toBe(200);
  // 삭제도 지우기 키만으로
  expect((await worker.fetch(request(body(true), token, null), s.env)).status).toBe(200);
  const del = new Request('https://chat.namneundon.com/api/chat/' + convId, {
    method: 'DELETE',
    headers: { Origin: ORIGIN, Authorization: 'Bearer ' + token }
  });
  expect((await worker.fetch(del, s.env)).status).toBe(200);
  expect(s.sql.prepare('SELECT * FROM conversations').all()).toEqual([]);
  // 다른 출처는 그대로 막는다(CORS 는 앱 주소 하나)
  const other = new Request('https://chat.namneundon.com/api/chat', {
    method: 'POST',
    headers: { Origin: 'https://evil.example', 'Content-Type': 'application/json' },
    body: JSON.stringify(body(false))
  });
  expect((await worker.fetch(other, s.env)).status).toBe(403);
  const pre = await worker.fetch(
    new Request('https://chat.namneundon.com/api/chat', {
      method: 'OPTIONS',
      headers: { Origin: ORIGIN }
    }),
    s.env
  );
  expect(pre.headers.get('Access-Control-Allow-Origin')).toBe(ORIGIN);
  expect(pre.headers.get('Access-Control-Allow-Headers')).toBe('Content-Type, Authorization');
  s.sql.close();
});
test('예약 작업은 1시간마다, 운영자 확인용 원문은 14일 지난 것만 지움', async () => {
  const config = JSON.parse(
    readFileSync(new URL('../chat/wrangler.jsonc', import.meta.url), 'utf8')
  );
  expect(config.triggers.crons).toEqual(['15 * * * *']);
  // 설정 파일에 비밀값을 적지 않는다
  expect(JSON.stringify(config)).not.toContain('TESTER_KEY');
  const s = setup();
  const insert = s.sql.prepare('INSERT INTO conversations VALUES (?, ?, ?, ?, ?, ?, ?)');
  const day = 86400000;
  insert.run('d15', convId, token, '질문', '답', '약국', Date.now() - 15 * day);
  insert.run('d14h1', convId, token, '질문', '답', '약국', Date.now() - 14 * day - 3600000);
  insert.run('d13', convId, token, '질문', '답', '약국', Date.now() - 13 * day);
  insert.run('d14m', convId, token, '질문', '답', '약국', Date.now() - 14 * day + 60000);
  await worker.scheduled({}, s.env);
  expect(
    s.sql
      .prepare('SELECT id FROM conversations ORDER BY id')
      .all()
      .map((r) => r.id)
  ).toEqual(['d13', 'd14m']);
  s.sql.close();
});
// ── 124 정리: 운영자 확인 선택 켜기 · 주제 집계 · 관리 화면 내보내기 ──
test('운영자 확인 꺼진 질문은 지우기 키·convId 없이 처리, 켠 질문만 둘 다 필요', async () => {
  const s = setup();
  // 꺼짐: Authorization 없이, 본문에 convId 없이
  const off = new Request('https://chat.namneundon.com/api/chat', {
    method: 'POST',
    headers: { Origin: ORIGIN, 'Content-Type': 'application/json', 'X-Namneundon-Tester': TESTER },
    body: JSON.stringify(body(false))
  });
  const r = await worker.fetch(off, s.env);
  expect(r.status).toBe(200);
  expect((await r.json()).saved).toBe(false);
  expect(s.sql.prepare('SELECT * FROM conversations').all()).toEqual([]);
  // 꺼졌는데 convId 를 붙이면 받지 않는다
  expect((await worker.fetch(request({ ...body(false), convId }), s.env)).status).toBe(400);
  // 켰는데 convId·지우기 키가 없으면 받지 않는다
  const noConv = body(true);
  delete noConv.convId;
  expect((await worker.fetch(request(noConv), s.env)).status).toBe(400);
  const noKey = new Request('https://chat.namneundon.com/api/chat', {
    method: 'POST',
    headers: { Origin: ORIGIN, 'Content-Type': 'application/json', 'X-Namneundon-Tester': TESTER },
    body: JSON.stringify(body(true))
  });
  expect((await worker.fetch(noKey, s.env)).status).toBe(400);
  expect(s.sql.prepare('SELECT * FROM conversations').all()).toEqual([]);
  // 켜고 둘 다 있으면 저장
  expect((await worker.fetch(request(body(true)), s.env)).status).toBe(200);
  expect(s.sql.prepare('SELECT conv_id FROM conversations').all()).toEqual([{ conv_id: convId }]);
  s.sql.close();
});

const topicRequest = (data, tester = TESTER) =>
  new Request('https://chat.namneundon.com/api/topic', {
    method: 'POST',
    headers: {
      Origin: ORIGIN,
      'Content-Type': 'application/json',
      'CF-Connecting-IP': '203.0.113.7',
      ...(tester === null ? {} : { 'X-Namneundon-Tester': tester })
    },
    body: JSON.stringify(data)
  });
test('주제 집계(켰을 때): {topic, source} 만 받아 한국 날짜·주제·출처별로 +1, 목록 밖·다른 칸은 거절', async () => {
  const s = setup();
  s.env.TOPIC_COUNTS = 'on';
  expect(TOPICS).toEqual([
    '운영판단',
    '용어',
    '잔액차이',
    '기간비교',
    '지출구성',
    '지출비율',
    '미분류',
    '자료범위',
    '업종비교',
    '앞으로지출',
    '기타'
  ]);
  expect(
    (await worker.fetch(topicRequest({ topic: '미분류', source: 'chip' }), s.env)).status
  ).toBe(200);
  await worker.fetch(topicRequest({ topic: '미분류', source: 'chip' }), s.env);
  await worker.fetch(topicRequest({ topic: '용어', source: 'typed' }), s.env);
  for (const bad of [
    { topic: '폐업', source: 'chip' },
    { topic: '체납', source: 'typed' },
    { topic: '미분류', source: 'auto' },
    { topic: '미분류', source: 'chip', question: '아직 안 정한 돈은 뭐야?' },
    { topic: '미분류', source: 'chip', convId },
    { topic: '미분류' }
  ])
    expect((await worker.fetch(topicRequest(bad), s.env)).status, JSON.stringify(bad)).toBe(400);
  // 표에는 날짜·주제·출처·횟수만 — IP·헤더·질문 칸이 없다
  expect(
    s.sql
      .prepare('PRAGMA table_info(topic_counts)')
      .all()
      .map((c) => c.name)
  ).toEqual(['day', 'topic', 'source', 'count']);
  expect(s.sql.prepare('SELECT * FROM topic_counts ORDER BY topic DESC').all()).toEqual([
    { day: kstDay(), topic: '용어', source: 'typed', count: 1 },
    { day: kstDay(), topic: '미분류', source: 'chip', count: 2 }
  ]);
  expect(JSON.stringify(s.sql.prepare('SELECT * FROM topic_counts').all())).not.toContain(
    '203.0.113.7'
  );
  expect(s.calls()).toBe(0);
  s.sql.close();
});
test('주제 집계 날짜는 한국 날짜, 예약 작업이 90일 지난 집계만 지움', async () => {
  // 2026-10-16 15:30 UTC = 2026-10-17 00:30 KST
  expect(kstDay(Date.parse('2026-10-16T15:30:00Z'))).toBe('2026-10-17');
  const s = setup();
  const insert = s.sql.prepare('INSERT INTO topic_counts VALUES (?, ?, ?, ?)');
  insert.run(kstDay(Date.now(), 91), '용어', 'chip', 3);
  insert.run(kstDay(Date.now(), 90), '용어', 'chip', 2);
  insert.run(kstDay(), '용어', 'chip', 1);
  await worker.scheduled({}, s.env);
  expect(
    s.sql
      .prepare('SELECT count FROM topic_counts ORDER BY day')
      .all()
      .map((r) => r.count)
  ).toEqual([2, 1]);
  s.sql.close();
});

// 관리 화면 요청 — Access 서명을 시험용 키로 만들어 붙인다(인증서 주소는 가짜 응답).
async function adminSession() {
  const pair = await crypto.subtle.generateKey(
    {
      name: 'RSASSA-PKCS1-v1_5',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256'
    },
    true,
    ['sign', 'verify']
  );
  const jwk = { ...(await crypto.subtle.exportKey('jwk', pair.publicKey)), kid: 'test-key' };
  const original = globalThis.fetch;
  globalThis.fetch = async () => Response.json({ keys: [jwk] });
  const now = Math.floor(Date.now() / 1000);
  const encode = (v) => Buffer.from(JSON.stringify(v)).toString('base64url');
  const head = encode({ alg: 'RS256', kid: 'test-key' });
  const payload = encode({
    iss: 'https://test-team.cloudflareaccess.com',
    aud: ['test-audience'],
    exp: now + 300,
    iat: now
  });
  const sig = Buffer.from(
    await crypto.subtle.sign(
      'RSASSA-PKCS1-v1_5',
      pair.privateKey,
      new TextEncoder().encode(head + '.' + payload)
    )
  ).toString('base64url');
  const jwt = head + '.' + payload + '.' + sig;
  return {
    restore: () => (globalThis.fetch = original),
    req: (path, init = {}) =>
      new Request('https://chat.namneundon.com' + path, {
        ...init,
        headers: { 'Cf-Access-Jwt-Assertion': jwt, ...(init.headers || {}) }
      })
  };
}
const adminEnv = (s) => ({ ...s.env, ACCESS_TEAM: 'test-team', ACCESS_AUD: 'test-audience' });
test('관리 화면: 주제 집계 CSV(UTF-8 BOM, 한국 주 단위 월요일 시작, 3 미만 표시)', async () => {
  const s = setup();
  const a = await adminSession();
  try {
    const insert = s.sql.prepare('INSERT INTO topic_counts VALUES (?, ?, ?, ?)');
    // 2026-10-12(월)~10-18(일) 은 한 주, 10-19(월)부터 다음 주
    insert.run('2026-10-12', '용어', 'chip', 2);
    insert.run('2026-10-18', '용어', 'chip', 1);
    insert.run('2026-10-16', '미분류', 'typed', 1);
    insert.run('2026-10-19', '용어', 'chip', 2);
    insert.run('2026-10-20', '용어', 'typed', 5);
    const res = await worker.fetch(a.req('/api/admin/topics.csv'), adminEnv(s));
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('text/csv; charset=utf-8');
    expect(res.headers.get('Content-Disposition')).toContain('topic_counts_weekly.csv');
    const bytes = new Uint8Array(await res.arrayBuffer());
    expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    expect(new TextDecoder().decode(bytes.slice(3))).toBe(
      'week_start,topic,source,count\r\n' +
        '2026-10-12,미분류,typed,3 미만\r\n' +
        '2026-10-12,용어,chip,3\r\n' +
        '2026-10-19,용어,chip,3 미만\r\n' +
        '2026-10-19,용어,typed,5\r\n'
    );
    // Access 없이는 막힌다
    expect(
      (
        await worker.fetch(
          new Request('https://chat.namneundon.com/api/admin/topics.csv'),
          adminEnv(s)
        )
      ).status
    ).toBe(403);
  } finally {
    a.restore();
    s.sql.close();
  }
});
test('관리 화면: 개선 기록 입력(고정 목록)·CSV, 대화와 연결하지 않음, 수식 칸 막음, 저장 질문은 14일만 보임', async () => {
  const s = setup();
  const a = await adminSession();
  try {
    const env = adminEnv(s);
    const post = (data, headers = {}) =>
      worker.fetch(
        a.req('/api/admin/notes', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Origin: 'https://chat.namneundon.com',
            'X-Admin-Action': 'note',
            ...headers
          },
          body: JSON.stringify(data)
        }),
        env
      );
    expect(
      (await post({ topic: '잔액차이', kind: '숫자 틀림', note: '잔액 설명이 길다' })).status
    ).toBe(200);
    expect((await post({ topic: '용어', kind: '말투', note: '=HYPERLINK("x")' })).status).toBe(200);
    for (const bad of [
      { topic: '폐업', kind: '말투', note: '' },
      { topic: '용어', kind: '모름', note: '' },
      { topic: '용어', kind: '말투', note: '가'.repeat(301) },
      { topic: '용어', kind: '말투', note: '', convId }
    ])
      expect((await post(bad)).status, JSON.stringify(bad)).toBe(400);
    // 같은 사이트 확인 헤더 없이는 받지 않는다
    expect(
      (await post({ topic: '용어', kind: '말투', note: '' }, { 'X-Admin-Action': '' })).status
    ).toBe(404);
    expect(
      s.sql
        .prepare('PRAGMA table_info(improvement_notes)')
        .all()
        .map((c) => c.name)
    ).toEqual(['id', 'day', 'topic', 'kind', 'note']);
    // 시각은 남기지 않는다 — 날짜(한국)만
    expect(
      s.sql
        .prepare('SELECT day FROM improvement_notes')
        .all()
        .map((r) => r.day)
    ).toEqual([kstDay(), kstDay()]);
    const csv = new TextDecoder('utf-8', { ignoreBOM: true }).decode(
      await (await worker.fetch(a.req('/api/admin/notes.csv'), env)).arrayBuffer()
    );
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    const lines = csv.slice(1).trim().split('\r\n');
    expect(lines[0]).toBe('day,topic,kind,note');
    expect(lines[1]).toBe(kstDay() + ',잔액차이,숫자 틀림,잔액 설명이 길다');
    expect(lines[2]).toMatch(/,용어,말투,"'=HYPERLINK\(""x""\)"$/);
    // 예약 작업은 개선 기록을 지우지 않는다
    s.sql.prepare('UPDATE improvement_notes SET day = ?').run('2000-01-03');
    await worker.scheduled({}, s.env);
    expect(s.sql.prepare('SELECT count(*) AS n FROM improvement_notes').get().n).toBe(2);
    // 관리 화면 목록은 14일 안의 저장 질문만
    const insert = s.sql.prepare('INSERT INTO conversations VALUES (?, ?, ?, ?, ?, ?, ?)');
    insert.run('old', convId, token, '질문', '답', '약국', Date.now() - 15 * 86400000);
    insert.run('new', convId, token, '질문', '답', '약국', Date.now());
    const list = await (await worker.fetch(a.req('/api/admin/list'), env)).json();
    expect(list.rows.map((r) => r.id)).toEqual(['new']);
    // 관리 화면 글: 내보내기 두 가지와 개선 기록 안내. 질문 원문 내보내기는 없다
    const page = await (await worker.fetch(a.req('/admin'), env)).text();
    expect(page).toContain('주제 집계 내보내기(CSV)');
    expect(page).toContain('개선 기록 내보내기(CSV)');
    expect(page).toContain('금액·가게 이름·성함·질문 원문 문장을 적지 마세요');
    expect(page).not.toMatch(/conversations\.csv|원문 내보내기/);
    expect(ADMIN).toBe(page);
  } finally {
    a.restore();
    s.sql.close();
  }
});
test('지시문에 주제별 답변 지침', () => {
  for (const rule of [
    '잘했다·못했다고 평가하지 않고, 확인 가능한 변화(사업으로 번 돈·사업에 쓴 돈·차액·비율의 지난달 대비)만 말합니다.',
    '차액은 이번 달 들어오고 나간 돈의 차이이고, 계좌 잔액은 그 전부터 쌓인 돈까지 담긴 금액',
    '이 값은 언제나 「차액」이라고 부릅니다. 순이익·이익·남는 돈·수익 같은 다른 이름을 쓰지 않습니다. 「통장」 대신 「계좌」라고 씁니다.',
    '사업으로 번 돈이 0원이어도 사업에 쓴 돈이나 아직 안 정한 돈이 있는 달은 「자료가 없다」고 말하지 않고',
    "'남는돈에는 같은 업종 비교 자료가 아직 없어 비교해 드릴 수 없습니다'",
    '지출해도 되는지는 정해 드릴 수 없다고 말하고, 보고 계신 달의 숫자만 알려 줍니다.',
    '전체 기간 확보 여부를 먼저 말합니다.',
    '「왜」를 단정하지 말고, 사업으로 번 돈·사업에 쓴 돈·차액과 금액이 가장 큰 항목들을 나란히 보여 줍니다.',
    '두 달을 비교할 때는 차이를 직접 계산하지 말고, 요약에 있는 두 달의 숫자를 나란히 말합니다',
    '「이번 달은 ○일까지의 자료라 지난달 한 달 전체와 바로 비교하기 어렵습니다」를 먼저 말합니다',
    '비율은 소수가 아니라 %로, 소수 첫째 자리까지 말합니다',
    '금액은 쉼표와 「원」을 붙여 말합니다'
  ])
    expect(SYSTEM).toContain(rule);
});

test('주 시작(한국 월요일)과 3 미만 묶음 규칙', () => {
  expect(weekStart('2026-10-12')).toBe('2026-10-12'); // 월
  expect(weekStart('2026-10-18')).toBe('2026-10-12'); // 일
  expect(weekStart('2026-10-19')).toBe('2026-10-19'); // 다음 월
  expect(weekStart('2026-01-01')).toBe('2025-12-29'); // 해를 넘는 주
  expect(
    weeklyTopics([
      { day: '2026-10-13', topic: '기타', source: 'typed', count: 1 },
      { day: '2026-10-14', topic: '기타', source: 'typed', count: 1 },
      { day: '2026-10-15', topic: '기타', source: 'chip', count: 2 }
    ])
  ).toEqual([
    { week_start: '2026-10-12', topic: '기타', source: 'chip', count: '3 미만' },
    { week_start: '2026-10-12', topic: '기타', source: 'typed', count: '3 미만' }
  ]);
});

test('배포 설정: 모델은 mistral-small-3.1-24b, 호환 날짜는 wrangler 4.139 지원 범위', () => {
  const config = JSON.parse(
    readFileSync(new URL('../chat/wrangler.jsonc', import.meta.url), 'utf8')
  );
  expect(config.vars.CHAT_MODEL).toBe('@cf/mistralai/mistral-small-3.1-24b-instruct');
  expect(Object.keys(MODELS)).toContain(config.vars.CHAT_MODEL);
  expect(config.compatibility_date).toBe('2026-09-30');
  // Access: 팀은 하위 도메인만(코드가 https://<팀>.cloudflareaccess.com 으로 만든다), AUD 는 64자리 16진수
  expect(config.vars.ACCESS_TEAM).toMatch(/^[a-z0-9-]+$/);
  expect(config.vars.ACCESS_TEAM).not.toContain('.'); // 전체 주소가 아니라 하위 도메인만
  expect(config.vars.ACCESS_AUD).toMatch(/^[0-9a-f]{64}$/);
  expect(config.d1_databases[0].database_id).toMatch(/^[0-9a-f-]{36}$/);
});

test('주제 집계는 기본 꺼짐 — 저장 없이 204, 본문도 보지 않는다', async () => {
  const s = setup();
  for (const data of [
    { topic: '용어', source: 'chip' },
    { topic: '폐업', source: 'x', question: '질문 원문' }
  ]) {
    const res = await worker.fetch(topicRequest(data), s.env);
    expect(res.status).toBe(204);
    expect(await res.text()).toBe('');
  }
  expect(s.sql.prepare('SELECT * FROM topic_counts').all()).toEqual([]);
  s.sql.close();
});

// ── 124-5: 숫자는 코드가 지킨다 ──
const ask = (s, question, share = false) =>
  worker.fetch(request({ ...body(share), question }), s.env).then((r) => r.json());
const usageRows = (s) => s.sql.prepare('SELECT * FROM usage').all();
test('정해진 답(인건비·월세·공과금·가장 많이 쓴 항목·아직 안 정한 돈)은 AI 를 부르지 않고 요약에서 바로', async () => {
  const s = setup();
  const sum = body().summary;
  sum.current.unknown = 300000;
  sum.current.sales = 1000000;
  sum.current.otherIncome = 0;
  sum.current.earned = 1000000;
  sum.current.spent = 2800000;
  sum.current.difference = -1800000;
  sum.current.categories = [
    { label: '인건비', amount: 1200000, ratio: 1.2 },
    { label: '월세', amount: 500000, ratio: 0.5 },
    { label: '전기·가스·수도', amount: 100000, ratio: 0.1 },
    { label: '보험', amount: 1000000, ratio: null }
  ];
  const q = (question) =>
    worker.fetch(request({ question, summary: sum, share: false }), s.env).then((r) => r.json());
  expect(await q('인건비는 매출의 몇 %야?')).toEqual({
    answer: '4월 인건비는 1,200,000원, 매출의 120.0%입니다.',
    saved: false,
    source: 'fixed'
  });
  expect((await q('월세·공과금은 얼마 나갔어?')).answer).toBe(
    '4월 월세·공과금으로 정한 금액입니다.\n- 월세 500,000원(매출의 50.0%)\n- 전기·가스·수도 100,000원(매출의 10.0%)\n아직 안 정한 돈 300,000원은 넣지 않았습니다.'
  );
  expect((await q('어느 항목에 가장 많이 썼어?')).answer).toBe(
    '4월 금액이 큰 항목입니다.\n1. 인건비 1,200,000원(매출의 120.0%)\n2. 보험 1,000,000원(매출 대비 비율 확인 보류)\n3. 월세 500,000원(매출의 50.0%)\n아직 안 정한 돈 300,000원은 이 순서에 넣지 않았습니다.'
  );
  expect((await q('아직 안 정한 돈은 뭐야?')).answer).toBe(
    '4월 아직 안 정한 돈은 300,000원입니다. 거래처를 정하시면 항목별 금액과 비율이 더 정확해집니다.'
  );
  // 없는 항목이면 그렇다고 말하고 아직 안 정한 돈을 알려 준다
  sum.current.categories = [{ label: '보험', amount: 2800000, ratio: null }];
  expect((await q('인건비는 매출의 몇 %야?')).answer).toBe(
    '이번 요약에는 인건비로 정한 거래가 없습니다. 아직 안 정한 돈 300,000원 안에 들어 있을 수 있습니다.'
  );
  expect((await q('월세·공과금은 얼마 나갔어?')).answer).toBe(
    '이번 요약에는 월세·공과금으로 정한 거래가 없습니다. 아직 안 정한 돈 300,000원 안에 들어 있을 수 있습니다.'
  );
  // AI 호출 0, 사용량 예약도 0 — 모델 설정이 없어도 된다
  expect(s.calls()).toBe(0);
  expect(usageRows(s)).toEqual([]);
  s.env.CHAT_MODEL = 'TODO_MODEL';
  expect((await q('아직 안 정한 돈은 뭐야?')).source).toBe('fixed');
  s.sql.close();
});
test('AI 답 숫자 검사: 요약에 없는 금액·비율·날짜나 「가장 큰 항목은 미분류」면 버리고 대체 답(원문은 저장하지 않음)', async () => {
  const s = setup();
  let reply = '';
  /** @type {any} */ (s.env.AI).run = async () => ({
    response: reply,
    usage: { prompt_tokens: 1000, completion_tokens: 100 }
  });
  const FALLBACK =
    '2025년 4월: 사업으로 번 돈 700,000원, 사업에 쓴 돈 2,500,000원, 차액 −1,800,000원\n자세한 설명을 만들지 못해 확인된 숫자만 보여 드립니다.';
  for (const bad of [
    '4월 사업으로 번 돈은 7,000,000원입니다.',
    '4월 보험은 매출의 35.7%입니다.',
    '사업에 쓴 돈은 350만 원입니다.',
    '4월 31일까지의 자료입니다.',
    '5월 사업으로 번 돈은 700,000원입니다.',
    '4월 사업에 쓴 돈은 25,00,000원입니다.', // 값은 맞지만 쉼표 자리가 틀림(백테스트 3차)
    '가장 큰 항목은 미분류 금액입니다.'
  ]) {
    reply = bad;
    expect(await ask(s, '이번 달은 어때?'), bad).toEqual({
      answer: FALLBACK,
      saved: false,
      source: 'fallback'
    });
  }
  reply = '4월 사업으로 번 돈은 700,000원, 사업에 쓴 돈은 2,500,000원, 차액은 −1,800,000원입니다.';
  expect(await ask(s, '이번 달은 어때?')).toEqual({ answer: reply, saved: false, source: 'ai' });
  // 운영자 확인을 켜도 버린 답 원문은 저장하지 않고 대체 답만 저장한다
  reply = '4월 사업으로 번 돈은 9,999,999원입니다.';
  expect((await ask(s, '이번 달은 어때?', true)).source).toBe('fallback');
  const saved = s.sql.prepare('SELECT answer FROM conversations').all();
  expect(saved).toEqual([{ answer: FALLBACK }]);
  expect(JSON.stringify(saved)).not.toContain('9,999,999');
  s.sql.close();
});
test('대체 답: 중간 달이면 바로 앞 달과 나란히 + 기준일 안내', () => {
  const sum = body().summary;
  const cur = { ...sum.current, month: '2025-05', dataEnd: '2025-05-22', complete: false };
  const prev = { ...sum.current, dataEnd: '2025-05-22' };
  expect(fallbackAnswer({ ...sum, current: cur, previous: [prev] })).toBe(
    '2025년 5월: 사업으로 번 돈 700,000원, 사업에 쓴 돈 2,500,000원, 차액 −1,800,000원\n' +
      '2025년 4월: 사업으로 번 돈 700,000원, 사업에 쓴 돈 2,500,000원, 차액 −1,800,000원\n' +
      '이번 달은 22일까지의 자료라 지난달 한 달 전체와 바로 비교하기 어렵습니다.\n' +
      '자세한 설명을 만들지 못해 확인된 숫자만 보여 드립니다.'
  );
  // 「5월 22일」·「22일까지」는 마지막 거래일이라 통과, 요약의 4월·5월 숫자도 통과
  expect(
    checkAnswer('이번 달은 5월 22일까지의 자료입니다. 4월 700,000원, 5월 2,500,000원', {
      ...sum,
      current: cur,
      previous: [prev]
    }).ok
  ).toBe(true);
});
test('주제 낱말 규칙은 앱(17-chat.js)과 서버(answers.js)가 같다', () => {
  const ctx = vm.createContext({
    URLSearchParams,
    location: { search: '' },
    lsGet: () => null,
    lsSet: () => true,
    lsDel: () => {},
    history: {}
  });
  vm.runInContext(readFileSync(new URL('../app/src/17-chat.js', import.meta.url), 'utf8'), ctx);
  expect(JSON.parse(JSON.stringify(ctx.CHAT_TOPIC_WORDS))).toEqual(TOPIC_WORDS);
  for (const [q, t] of [
    ['인건비는 매출의 몇 %야?', '지출비율'],
    ['월세·공과금은 얼마 나갔어?', '지출구성'],
    ['어느 항목에 가장 많이 썼어?', '지출구성'],
    ['아직 안 정한 돈은 뭐야?', '미분류'],
    ['번 돈은 느는데 왜 남는 게 적어?', '운영판단']
  ])
    expect(topicOf(q)).toBe(t);
});

// ── 124-6: 칸 문구 존댓말 · 「왜 남는 게 적나요」 정해진 답 · 달-숫자 짝 검사 · AI 에는 바로 앞 달 하나 ──
const mon = (m, o = {}) => {
  const x = { ...month(), month: m, dataEnd: m + '-28', ...o };
  x.sales = x.earned;
  x.difference = x.earned - x.spent;
  return x;
};
const FEB = mon('2025-02', {
  earned: 600000,
  spent: 400000,
  categories: [{ label: '인건비', amount: 400000, ratio: null }]
});
const MAR = mon('2025-03', {
  earned: 800000,
  spent: 500000,
  categories: [
    { label: '인건비', amount: 300000, ratio: null },
    { label: '월세', amount: 200000, ratio: null }
  ]
});
const APR = mon('2025-04', {
  dataEnd: '2025-04-30',
  earned: 1000000,
  spent: 950000,
  unknown: 200000,
  categories: [
    { label: '인건비', amount: 500000, ratio: null },
    { label: '월세', amount: 300000, ratio: null },
    { label: '보험', amount: 150000, ratio: null }
  ]
});
const sum6 = (current = APR, previous = [FEB, MAR]) => ({ industry: '약국', current, previous });
test('질문 칸(존댓말)과 옛 반말 문구, 직접 친 질문 모두 같은 주제·같은 정해진 답', () => {
  const ctx = vm.createContext({
    URLSearchParams,
    location: { search: '' },
    lsGet: () => null,
    lsSet: () => true,
    lsDel: () => {},
    history: {}
  });
  vm.runInContext(readFileSync(new URL('../app/src/17-chat.js', import.meta.url), 'utf8'), ctx);
  const summary = sum6();
  expect(JSON.parse(JSON.stringify(ctx.chatFirstChips(summary)))).toEqual([
    { topic: '운영판단', text: '번 돈은 느는데 왜 남는 게 적나요?' },
    { topic: '지출비율', text: '인건비는 매출의 몇 %인가요?' },
    { topic: '지출구성', text: '월세·공과금은 얼마 나갔나요?' },
    { topic: '기간비교', text: '지난달보다 뭐가 달라졌나요?' },
    { topic: '미분류', text: '아직 안 정한 돈은 무엇인가요?' }
  ]);
  expect(ctx.CHAT_TOPIC_CHIPS.지출구성).toBe('어느 항목에 가장 많이 썼나요?');
  expect(ctx.CHAT_TOPIC_CHIPS.용어).toBe('차액은 무슨 뜻인가요?');
  for (const [topic, fixed, ...texts] of [
    [
      '운영판단',
      '왜 남는 게 적은지',
      '번 돈은 느는데 왜 남는 게 적나요?',
      '번 돈은 느는데 왜 남는 게 적어?',
      '왜 이렇게 남는 게 적지'
    ],
    [
      '지출비율',
      '인건비',
      '인건비는 매출의 몇 %인가요?',
      '인건비는 매출의 몇 %야?',
      '인건비 비율 알려줘'
    ],
    [
      '지출구성',
      '월세·공과금',
      '월세·공과금은 얼마 나갔나요?',
      '월세·공과금은 얼마 나갔어?',
      '월세 얼마 나갔지'
    ],
    [
      '지출구성',
      '가장 많이 쓴 항목',
      '어느 항목에 가장 많이 썼나요?',
      '어느 항목에 가장 많이 썼어?',
      '어디에 썼는지 알려줘'
    ],
    [
      '미분류',
      '아직 안 정한 돈',
      '아직 안 정한 돈은 무엇인가요?',
      '아직 안 정한 돈은 뭐야?',
      '미분류가 뭐예요'
    ],
    [
      '기간비교',
      null,
      '지난달보다 뭐가 달라졌나요?',
      '지난달보다 뭐가 달라졌어?',
      '전달이랑 비교해 줘'
    ],
    ['용어', null, '차액은 무슨 뜻인가요?', '차액은 무슨 뜻이야?']
  ])
    for (const q of texts) {
      expect(topicOf(q), q).toBe(topic);
      expect(ctx.chatTopicOf(q).topic, q).toBe(topic); // 앱도 같은 주제
      expect(fixedAnswer(q, summary)?.kind ?? null, q).toBe(fixed);
    }
  // 운영판단이라도 「나아졌나요」는 AI 로 간다
  expect(fixedAnswer('이번 달 결과, 지난달보다 나아졌나요?', summary)).toBe(null);
});
test('「번 돈은 느는데 왜 남는 게 적나요?」는 정해진 답 — 전제 확인, 두 달 나란히, 많이 늘어난 지출 둘, AI 0', async () => {
  const s = setup();
  const q = (summary, question = '번 돈은 느는데 왜 남는 게 적나요?') =>
    worker.fetch(request({ question, summary, share: false }), s.env).then((r) => r.json());
  // 전제가 맞음(번 돈 늘고 차액 줄음). 앞 달은 가장 늦은 3월. 아직 안 정한 돈이 쓴 돈의 10% 이상이면 적는다
  const ok = await q(sum6());
  expect(ok).toEqual({
    answer:
      '4월 사업으로 번 돈은 3월보다 늘었고, 차액은 줄었습니다.\n' +
      '- 4월: 사업으로 번 돈 1,000,000원, 사업에 쓴 돈 950,000원, 차액 50,000원\n' +
      '- 3월: 사업으로 번 돈 800,000원, 사업에 쓴 돈 500,000원, 차액 300,000원\n' +
      '3월보다 많이 늘어난 지출 항목입니다.\n' +
      '- 인건비: 4월 500,000원, 3월 300,000원\n' +
      '- 보험: 4월 150,000원, 3월 0원\n' +
      '4월 아직 안 정한 돈 200,000원이 있어, 거래처를 정하시면 항목별 금액이 달라질 수 있습니다.',
    saved: false,
    source: 'fixed'
  });
  expect(ok.answer).not.toContain('때문');
  expect(ok.answer).not.toMatch(/가장\s*큰[^\n]*아직 안 정한/);
  expect(checkAnswer(ok.answer, sum6()).ok).toBe(true);
  // 반말 옛 문구도 같은 답
  expect((await q(sum6(), '번 돈은 느는데 왜 남는 게 적어?')).answer).toBe(ok.answer);
  // 전제가 다르면 실제 움직임을 그대로. 아직 안 정한 돈이 작으면 적지 않는다
  const down = mon('2025-04', { earned: 700000, spent: 950000, categories: APR.categories });
  const other = (await q(sum6(down))).answer;
  expect(other.split('\n')[0]).toBe(
    '질문과 달리 4월 사업으로 번 돈은 3월보다 줄었고, 차액은 줄었습니다.'
  );
  expect(other).not.toContain('아직 안 정한 돈');
  // 중간 달이면 기준일 안내를 먼저, 이번 달 줄에 기준일
  const mid = { ...APR, dataEnd: '2025-04-22', complete: false };
  const midAnswer = (await q(sum6(mid))).answer.split('\n');
  expect(midAnswer[0]).toBe(
    '이번 달은 22일까지의 자료라 지난달 한 달 전체와 바로 비교하기 어렵습니다.'
  );
  expect(midAnswer[2]).toBe(
    '- 4월(22일까지): 사업으로 번 돈 1,000,000원, 사업에 쓴 돈 950,000원, 차액 50,000원'
  );
  expect(checkAnswer(midAnswer.join('\n'), sum6(mid)).ok).toBe(true);
  // 비교할 앞 달이 없으면 이번 달 숫자만
  expect((await q(sum6(APR, []))).answer.split('\n').slice(0, 2)).toEqual([
    '비교할 앞 달(한 달 전체 자료)이 요약에 없어 4월 숫자만 보여 드립니다.',
    '- 4월: 사업으로 번 돈 1,000,000원, 사업에 쓴 돈 950,000원, 차액 50,000원'
  ]);
  expect(s.calls()).toBe(0);
  expect(usageRows(s)).toEqual([]);
  s.sql.close();
});
test('AI 에는 선택한 달과 바로 앞 달 하나만 보내고, 검사·대체 답도 그 요약으로', async () => {
  const s = setup();
  let sent;
  let reply = '';
  /** @type {any} */ (s.env.AI).run = async (model, input) => {
    sent = input;
    return { response: reply, usage: { prompt_tokens: 1000, completion_tokens: 100 } };
  };
  const send = (question) =>
    worker.fetch(request({ question, summary: sum6(), share: false }), s.env).then((r) => r.json());
  reply = '지난달과 비교했을 때, 사업으로 번 돈은 800,000원에서 1,000,000원으로 늘었습니다.';
  expect(await send('지난달보다 뭐가 달라졌나요?')).toEqual({
    answer: reply,
    saved: false,
    source: 'ai'
  });
  const user = JSON.parse(sent.messages.find((m) => m.role === 'user').content);
  expect(user.summary.previous.map((m) => m.month)).toEqual(['2025-03']);
  expect(user.summary.current).toEqual(APR);
  // AI 가 보지 못한 2월 숫자를 쓰면 버린다
  reply = '2월 사업으로 번 돈은 600,000원입니다.';
  const fb = await send('지난달보다 뭐가 달라졌나요?');
  expect(fb.source).toBe('fallback');
  expect(fb.answer.split('\n').slice(0, 2)).toEqual([
    '2025년 4월: 사업으로 번 돈 1,000,000원, 사업에 쓴 돈 950,000원, 차액 50,000원',
    '2025년 3월: 사업으로 번 돈 800,000원, 사업에 쓴 돈 500,000원, 차액 300,000원'
  ]);
  s.sql.close();
});
test('달-숫자 짝 검사: 「지난달」「○월」과 함께 쓴 번 돈·쓴 돈·차액이 그 달 값이 아니면 버린다', () => {
  const summary = sum6();
  // 백테스트 2차 #3·#5 꼴 — 「지난달」(3월)이라며 2월 숫자
  for (const bad of [
    '지난달과 비교했을 때, 사업으로 번 돈은 600,000원에서 1,000,000원으로 늘었습니다.',
    '지난달 사업으로 번 돈은 600,000원, 사업에 쓴 돈은 400,000원이었습니다.',
    '3월 사업에 쓴 돈은 950,000원입니다.',
    '이번 달 차액은 300,000원입니다.',
    '사업으로 번 돈은 3월 600,000원에서 4월 1,000,000원으로 늘었습니다.'
  ]) {
    const r = checkAnswer(bad, summary);
    expect(r.ok, bad).toBe(false);
    expect(
      r.problems.some((p) => p.startsWith('달-숫자')),
      bad
    ).toBe(true);
  }
  for (const good of [
    '지난달과 비교했을 때, 사업으로 번 돈은 800,000원에서 1,000,000원으로 늘었습니다. 사업에 쓴 돈은 500,000원에서 950,000원으로 늘었습니다.',
    '사업으로 번 돈은 3월 800,000원에서 4월 1,000,000원으로 늘었습니다.',
    '4월 1,000,000원 사업으로 번 돈, 950,000원 사업에 쓴 돈, 50,000원 차액입니다.',
    '3월:\n- 사업으로 번 돈: 800,000원\n- 차액: 300,000원\n\n4월:\n- 사업으로 번 돈: 1,000,000원\n- 차액: 50,000원',
    '4월 사업으로 번 돈 1,000,000원, 보험 150,000원, 인건비 500,000원입니다.',
    '2월 사업으로 번 돈은 600,000원, 3월은 800,000원입니다.'
  ])
    expect(checkAnswer(good, summary), good).toEqual({ ok: true, problems: [] });
  // 확정 용어: 차액을 다른 이름으로 부르거나 「통장」을 쓰면 버린다. 서비스 이름 「남는돈」은 괜찮다
  for (const bad of [
    '4월 사업으로 남는 돈은 50,000원입니다.',
    '4월 순이익은 50,000원입니다.',
    '4월 이익은 50,000원입니다.',
    '차액과 통장 잔액은 다를 수 있습니다.'
  ])
    expect(
      checkAnswer(bad, summary).problems.some((p) => p.startsWith('용어')),
      bad
    ).toBe(true);
  expect(
    checkAnswer(
      '남는돈에는 같은 업종 비교 자료가 아직 없어 비교해 드릴 수 없습니다. 4월 차액은 50,000원입니다.',
      summary
    )
  ).toEqual({ ok: true, problems: [] });
  // 1월의 지난달은 앞 해 12월
  const jan = sum6(mon('2025-01', { earned: 1000000, spent: 950000 }), [
    mon('2024-12', { earned: 800000, spent: 500000 })
  ]);
  expect(checkAnswer('지난달 사업으로 번 돈은 800,000원입니다.', jan).ok).toBe(true);
  expect(checkAnswer('지난달 사업으로 번 돈은 1,000,000원입니다.', jan).ok).toBe(false);
  // 바로 앞 달이 요약에 없으면 「지난달」 금액은 틀린 것으로 본다
  expect(checkAnswer('지난달 사업으로 번 돈은 600,000원입니다.', sum6(APR, [FEB])).ok).toBe(false);
});
test('Workers AI 하루 무료 한도 소진(4006)은 마감(429) — 그날 남은 시간은 AI 를 다시 부르지 않고, 정해진 답은 그대로', async () => {
  const s = setup();
  let calls = 0;
  const error = new Error(
    "4006: you have used up your daily free allocation of 10,000 neurons, please upgrade to Cloudflare's Workers Paid plan if you would like to continue usage."
  );
  /** @type {any} */ (s.env.AI).run = async () => {
    calls++;
    throw error;
  };
  const send = (question) =>
    worker
      .fetch(request({ ...body(), question }), s.env)
      .then(async (r) => [r.status, await r.json()]);
  const [status, data] = await send('이번 달은 어때?');
  expect(status).toBe(429);
  expect(data).toEqual({ error: 'daily_limit', nextAvailable: nextReset() });
  expect(usageRows(s)[0].neurons).toBe(8000);
  expect((await send('이번 달은 어때?'))[0]).toBe(429);
  expect(calls).toBe(1);
  expect((await send('아직 안 정한 돈은 무엇인가요?'))[1].source).toBe('fixed');
  // 다른 오류는 지금처럼 503 이고 마감으로 보지 않는다
  const t = setup();
  /** @type {any} */ (t.env.AI).run = async () => {
    throw new Error('5000: internal');
  };
  const res = await worker.fetch(request(body()), t.env);
  expect(res.status).toBe(503);
  expect(t.sql.prepare('SELECT neurons FROM usage').get().neurons).toBeLessThan(8000);
  s.sql.close();
  t.sql.close();
});
