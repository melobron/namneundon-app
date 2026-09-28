"""앱 자료로 같은 규칙을 다시 검증하기 (테스트베드 밖에서 쓴다).

금결원 자료에서 정한 규칙 숫자를 앱에 넣기 전에, 앱이 읽는 은행 파일에서도 통하는지 본다.
입력은 세 칸짜리 CSV 하나: 날짜(YYYYMMDD 또는 YYYY-MM-DD), 상대(앱이 정리한 거래처 글자), 출금액(원).
은행 파일에는 계좌 일련번호가 없으므로 「상대」 글자를 입금계좌 자리에 넣는다 (계획서 Ⅲ.1.바).
"""
from .common import parse_date, read_csv, to_int
from .detect import detect

DEFAULT_BUCKETS = [10000, 30000, 50000, 100000, 200000, 300000, 500000, 700000,
                   1000000, 1500000, 2000000, 3000000, 5000000, 10000000]


def load_app_csv(full):
    rows = []
    for i, r in enumerate(read_csv(full)):
        vals = list(r.values())
        d = parse_date(vals[0] if vals else "")
        amt = to_int(vals[2]) if len(vals) > 2 else None
        cp = (vals[1] if len(vals) > 1 else "").strip()
        rows.append({"_row": i + 1, "_date": d, "wd_fc": "APP", "wd_ac": "FILE", "dps_fc": "CP", "dps_ac": cp,
                     "amt": abs(amt) if amt is not None else None, "tmrg": "", "md_type": ""})
    return rows


def check(full, params, buckets=None):
    rows = load_app_csv(full)
    b = buckets or DEFAULT_BUCKETS
    # 원 단위 금액을 가장 가까운 구간 값으로 바꿔 금결원 자료와 같은 조건으로 맞춘다
    import bisect
    for r in rows:
        v = r["amt"]
        if v is None:
            continue
        i = min(max(bisect.bisect_left(b, v), 0), len(b) - 1)
        if i > 0 and abs(b[i - 1] - v) <= abs(b[i] - v):
            i -= 1
        r["amt"] = b[i]
    pos, info, _p = detect(rows, params, b)
    return rows, pos, info
