// 옛 앱 주소(aged-rain-dbc4.ykang2356.workers.dev)로 오면 새 주소로 보낸다.
// 경로와 ?뒤 값은 그대로 붙인다. 실사용자가 없어 자료 옮기기 없이 바로 보낸다 (2026-09-25).
// 되돌리기: npx wrangler rollback --name aged-rain-dbc4  (직전 판 = 요한이 올린 119차 앱)
const TARGET = 'https://app.namneundon.com';

export default {
  fetch(request) {
    const url = new URL(request.url);
    return Response.redirect(TARGET + url.pathname + url.search, 301);
  },
};
