/* 아무것도 캐시하지 않는 서비스 워커.
   크롬이 [아이콘 만들기] 프롬프트를 주려면 fetch 핸들러가 있어야 해서 둔다.
   respondWith 를 부르지 않으므로 요청은 그대로 네트워크로 가고,
   저장하는 것이 없어 옛 버전이 남을 위험이 없다 */
self.addEventListener('install', function () {
  self.skipWaiting();
});
self.addEventListener('activate', function (e) {
  e.waitUntil(self.clients.claim());
});
self.addEventListener('fetch', function (e) {
  /* 아무것도 안 한다 */
});
