// 앱이 쓰는 바깥 라이브러리 · 브라우저 전역의 타입 (타입 검사 전용 — 배포되지 않는다).
// SheetJS(xlsx.full.min.js) · PDF.js(pdf.min.js) 는 <script> 로 올라와 전역에 붙는다.
declare var XLSX: any;
declare var pdfjsLib: any;
interface Window {
  XLSX: any;
  pdfjsLib: any;
}
// iOS 사파리가 홈 화면에서 열렸는지 알려주는 비표준 속성
interface Navigator {
  standalone?: boolean;
}
