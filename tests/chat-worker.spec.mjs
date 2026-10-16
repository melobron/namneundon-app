import { test, expect } from '@playwright/test';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import * as acorn from 'acorn';
import { loadCore } from './core/load-core.mjs';
import worker, { accessAllowed, validSummary, nextReset, SYSTEM } from '../chat/src/index.js';

const ORIGIN = 'https://app.namneundon.com';
const token = 'a'.repeat(64);
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
function body(share = false) {
  return {
    question: '이 뜻은 무엇인가요?',
    summary: { industry: '약국', current: month(), previous: [] },
    share,
    convId
  };
}
function setup() {
  const sql = new DatabaseSync(':memory:');
  sql.exec(readFileSync(new URL('../chat/migrations/0001_init.sql', import.meta.url), 'utf8'));
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
function request(data, key = token) {
  return new Request('https://chat.namneundon.com/api/chat', {
    method: 'POST',
    headers: { Origin: ORIGIN, 'Content-Type': 'application/json', Authorization: 'Bearer ' + key },
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
        headers: { Origin: ORIGIN, Authorization: key }
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
test('30일 만료 대화와 지난 날짜 사용량 정리', async () => {
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
