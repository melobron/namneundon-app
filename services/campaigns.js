// 홍보 글 목록 — 운영자가 관리한다 (NAM-20·22, 2026-09-29).
// 짧은 링크(/t/<코드>)의 도착지와 팀 대시보드의 제목 · 원문 링크를 여기서만 가져온다.
// ★ 고객 요청에 실린 제목 · 주소는 믿지 않는다. 여기에 없는 코드는 짧은 링크가 404 를 낸다.
// ★ 아직 비어 있다 — 글 코드 · 제목 · 원문 링크 · 게시일은 요한이 정해 주는 값만 넣는다.
//   넣은 뒤 npm test 가 모양(https 링크 · 도착지 · 코드 중복)을 검사한다 (tests/usage/rules.spec.mjs).
//
// 한 줄 모양:
//   { code: 'D08', title: '글 제목', postUrl: 'https://…', publishedAt: '2026-10-01',
//     destination: 'https://namneundon.com/' }   ← destination 을 빼면 소개 페이지 첫 화면

/** 짧은 링크가 보낼 수 있는 곳 — 소개 페이지 하나뿐이다 */
export const LANDING_ORIGIN = 'https://namneundon.com';

/** @type {Array<{ code: string, title: string, postUrl?: string | null, publishedAt?: string | null, destination?: string }>} */
export const CAMPAIGNS = [];
