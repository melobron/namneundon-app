"""월 단위 반복 출금 후보 탐지 (2판, GPT 검토 반영).

입력은 이체내역의 날짜·계좌·금액·시간대·매체뿐이다.
자금구분(fnd_type)과 거기서 나온 어떤 값도 쓰지 않는다 (수행계획서: 탐지 입력에서 제외).
결과는 「반복 출금 후보」다. 사업 지출이나 고정비로 확정하지 않는다.

한 짝(출금계좌→입금계좌)을 보는 순서
  1. 관측 달 수가 모자라면 제외
  2. 기준일을 찾는다. 「매달 같은 날」과 「매달 말일」 두 방식 중 더 잘 맞는 쪽 (정해진 순서로 고르고, 평가 정답은 보지 않는다)
  3. 기준일 가까이에서 달마다 하나씩 골라 묶음을 만든다. 같은 짝에 묶음이 둘일 수 있다 (예: 5일 월세, 25일 관리비)
  4. 묶음마다 먼저, 하나로 줄이기 전에 그 묶음 금액 범위의 거래가 달마다 몇 건인지 센다(거래 없는 달은 0건).
     가운데 값이 3 이상이면 매주·수시 반복으로 그 묶음을 제외. 시도는 최대 max_attempts번, 인정 묶음은 최대 max_bundles개
  5. 묶음마다: 날짜가 맞는 달 비율, 이어진 달 사이 간격이 한 달인 비율, 빠진 달 비율, 금액이 같은 구간인 비율
  6. 같은 달의 추가 지급은 묶음에 들어가지 않으므로 후보가 되지 않는다
"""
import calendar
import datetime as dt
import math
from collections import Counter, defaultdict

from .common import acct, bucket_index, to_int, ym

ALLOWED = ("_row", "_date", "wd_fc", "wd_ac", "dps_fc", "dps_ac", "amt", "tmrg", "md_type")
MONTH_END = 31  # 기준일 31 = 그 달의 말일 (2월은 28·29일)


def strip_forbidden(rows):
    """탐지에 넘기기 전에 허용된 칸만 남긴다. 자금구분이 섞여 들어갈 길을 코드로 막는다."""
    return [{k: r.get(k) for k in ALLOWED} for r in rows]


def _anchor_date(y, m, day):
    return dt.date(y, m, min(day, calendar.monthrange(y, m)[1]))


def _nearest(d, day):
    """날짜 d에 가장 가까운 기준일 (앞달·이번달·다음달 중). (차이 일수, 그 기준일의 달)"""
    best = None
    for dy in (-1, 0, 1):
        y, m = d.year, d.month + dy
        if m == 0:
            y, m = y - 1, 12
        if m == 13:
            y, m = y + 1, 1
        dev = (d - _anchor_date(y, m, day)).days
        if best is None or abs(dev) < abs(best[0]):
            best = (dev, y * 100 + m)
    return best


def _month_add(m, k):
    y, mm = divmod(m, 100)
    t = y * 12 + (mm - 1) + k
    return (t // 12) * 100 + t % 12 + 1


def _month_diff(a, b):
    return (b // 100 - a // 100) * 12 + (b % 100 - a % 100)


def group_pairs(rows):
    pairs = defaultdict(list)
    for r in rows:
        if r["_date"] is None:
            continue
        wd, dps, amt = acct(r["wd_fc"], r["wd_ac"]), acct(r["dps_fc"], r["dps_ac"]), to_int(r["amt"])
        if not wd or not dps or wd == dps or amt is None:
            continue
        pairs[(wd, dps)].append((r["_date"], amt, r["_row"]))
    for v in pairs.values():
        v.sort()
    return pairs


def payer_windows(rows):
    """출금 계좌마다 관측된 첫 달과 끝 달. 첫 달과 끝 달은 일부만 관측됐을 수 있다."""
    w = {}
    for r in rows:
        a = acct(r["wd_fc"], r["wd_ac"])
        if not a or r["_date"] is None:
            continue
        m = ym(r["_date"])
        lo, hi = w.get(a, (m, m))
        w[a] = (min(lo, m), max(hi, m))
    return w


def _schedule(txs, anchor, tol):
    """기준일 가까이에서 달마다 하나씩 고른다. (달, 차이, 날짜, 금액, 행) 목록"""
    by_month = {}
    for d, a, r in txs:
        dev, m = _nearest(d, anchor)
        cur = by_month.get(m)
        if cur is None or abs(dev) < abs(cur[1]):
            by_month[m] = (m, dev, d, a, r)
    return sorted(by_month.values())


def _best_anchor(txs, p):
    """「매달 같은 날」 후보(나온 날짜들)와 「매달 말일」 중 날짜가 맞는 달이 가장 많은 기준일."""
    tol = p["day_tolerance"]
    cands = sorted({d.day for d, _a, _r in txs})
    if p.get("month_end_mode", True):
        cands.append(MONTH_END)
    best = None
    for c in cands:
        s = _schedule(txs, c, tol)
        on = [x for x in s if abs(x[1]) <= tol]
        score = (len(on), -sum(abs(x[1]) for x in on), c == MONTH_END)
        if best is None or score > best[0]:
            best = (score, c)
    return best[1]


def _judge_bundle(txs, p, buckets, window):
    """묶음 하나를 판정. (후보 여부, 양성 행, 이유, 특징, 쓴 행)"""
    tol = p["day_tolerance"]
    adj = p["amount_adjacent_buckets"]
    anchor = _best_anchor(txs, p)
    sched = _schedule(txs, anchor, tol)
    on = [x for x in sched if abs(x[1]) <= tol]
    if on:
        # 두 번째 고르기(보조 기준): 같은 달 기준일 근처에 여러 건이 있으면, 가장 흔한 금액대에 맞는 거래를 먼저 고른다.
        # 월세를 가려내는 근거는 아니다. 매주 소액이 더 흔하면 소액 묶음이 먼저 잡히고, 그 묶음이 매주 확인에서 떨어진 뒤 다음 시도에서 월세를 본다
        c0 = Counter(bucket_index(x[3], buckets) for x in on)
        m0 = max(c0, key=lambda k: (c0[k], -k))
        near = defaultdict(list)
        for d, a, r in txs:
            dev, m = _nearest(d, anchor)
            if abs(dev) <= tol:
                near[m].append((abs(bucket_index(a, buckets) - m0) > adj, abs(dev), (m, dev, d, a, r)))
        sched = sorted([min(v)[2] for v in near.values()] + [x for x in sched if x[0] not in near])
        on = [x for x in sched if abs(x[1]) <= tol]
    feat = {"anchor": "말일" if anchor == MONTH_END else "%d일" % anchor, "months": len(sched), "on_months": len(on)}
    used = [x[4] for x in on]
    if len(on) < p["min_distinct_months"] or len(on) < p["min_occurrences"]:
        return False, [], "날짜가 맞는 달이 모자람", feat, used
    # 매주·수시 확인: 달마다 하나로 줄이기 전에, 이 묶음이 가진 금액 범위의 거래가 달마다 몇 건인지 센다
    #  금액 범위: 고정 금액이면 최빈 구간 ±1, 금액 변동을 허용하면 묶음 거래의 최소~최대 구간 ±1 (두 경우 기준을 맞춤)
    #  세는 달: 묶음의 첫 달~끝 달 전부. 거래가 없는 달은 0건으로 넣는다
    idx_on = [bucket_index(x[3], buckets) for x in on]
    cnt0 = Counter(idx_on)
    mode0 = max(cnt0, key=lambda k: (cnt0[k], -k))
    if p.get("allow_variable_amount", False):
        lo_b, hi_b = min(idx_on) - adj, max(idx_on) + adj
    else:
        lo_b, hi_b = mode0 - adj, mode0 + adj
    first, last = on[0][0], on[-1][0]
    span = [_month_add(first, k) for k in range(_month_diff(first, last) + 1)]
    sset = set(span)
    same = [t for t in txs if lo_b <= bucket_index(t[1], buckets) <= hi_b and ym(t[0]) in sset]
    cm = Counter(ym(t[0]) for t in same)
    per = sorted(cm.get(m, 0) for m in span)
    feat["median_per_month"] = per[len(per) // 2] if per else 0
    if feat["median_per_month"] >= p["weekly_median_per_month"]:
        return False, [], "달마다 여러 번(매주·수시 반복)", feat, [t[2] for t in same]
    feat["on_schedule_ratio"] = round(len(on) / len(sched), 3)
    if len(on) / len(sched) < p["min_on_schedule_ratio"]:
        return False, [], "날짜가 자주 벗어남", feat, used
    # 이어진 달 사이 간격
    gaps = [(on[i + 1][2] - on[i][2]).days for i in range(len(on) - 1) if _month_diff(on[i][0], on[i + 1][0]) == 1]
    reg = [g for g in gaps if p["monthly_interval_lo"] <= g <= p["monthly_interval_hi"]]
    feat["regular_gap_ratio"] = round(len(reg) / len(gaps), 3) if gaps else 0
    if not gaps or len(reg) / len(gaps) < p["min_regular_gap_ratio"]:
        return False, [], "간격이 한 달로 고르지 않음", feat, used
    # 빠진 달: 묶음의 첫 달~끝 달 가운데, 출금 계좌 관측 기간의 첫 달·끝 달(일부만 관측)은 빼고 센다
    present = {x[0] for x in on}
    expected = [_month_add(first, k) for k in range(_month_diff(first, last) + 1)]
    if window:
        expected = [m for m in expected if m in present or (window[0] < m < window[1])]
    missing = [m for m in expected if m not in present]
    feat["missing_month_ratio"] = round(len(missing) / len(expected), 3) if expected else 0
    if expected and len(missing) / len(expected) > p["max_missing_month_ratio"]:
        return False, [], "빠진 달이 많음", feat, used
    # 금액
    idx = [bucket_index(x[3], buckets) for x in on]
    mode = mode0
    stable = [i for i in idx if abs(i - mode) <= adj]
    feat["amount_stable_ratio"] = round(len(stable) / len(idx), 3)
    if len(stable) / len(idx) >= p["min_amount_stable_ratio"]:
        feat["type"] = "고정 금액"
        pos = [x[4] for x in on if abs(bucket_index(x[3], buckets) - mode) <= adj]
    elif p.get("allow_variable_amount", False):
        feat["type"] = "변동 금액"
        pos = [x[4] for x in on]
    else:
        return False, [], "금액 변동이 큼", feat, used
    return True, pos, "월 반복 후보", feat, used


def judge_pair(txs, p, buckets, window=None):
    """한 (출금계좌, 입금계좌) 짝을 판정. (후보 여부, 양성 행 목록, 이유, 특징)
    묶음 찾기를 최대 max_attempts번 시도하고, 통과한 묶음은 최대 max_bundles개까지 인정한다.
    한 시도가 떨어지면 그 시도가 쓴 거래를 빼고 다음 시도를 한다
    (예: 매주 나가는 소액 묶음이 떨어진 뒤 같은 짝의 월세 흐름을 따로 본다).
    「시도가 쓴 거래」의 정의:
      매주·수시로 떨어졌을 때 = 빈도를 센 범위 전체(묶음의 첫 달~끝 달, 묶음 금액 범위 안의 거래 전부)
      그 밖의 이유로 떨어졌을 때 = 달마다 고른 기준일 근처 거래만
    뺀 거래의 원천 행 번호와 이유는 feat["dropped"]에 남아 내부 후보 목록에 기록된다.
    한계: 매주 지급과 월세가 같은·이웃 금액 구간이면 금액만으로 구별하기 어렵고, 지금 규칙에서는 월 반복을 놓칠 수 있다."""
    n = len(txs)
    months = Counter(ym(d) for d, _a, _r in txs)
    feat = {"n": n, "months": len(months)}
    if n < p["min_occurrences"] or len(months) < p["min_distinct_months"]:
        return False, [], "관측 달 수 부족", feat
    remaining = list(txs)
    pos, bundles, first, dropped = [], [], None, []
    for _t in range(p.get("max_attempts", p.get("max_bundles", 1))):
        if len(bundles) >= p.get("max_bundles", 1) or len(remaining) < p["min_occurrences"]:
            break
        ok, rws, reason, bf, used = _judge_bundle(remaining, p, buckets, window)
        if ok:
            bundles.append(bf)
            pos.extend(rws)
        else:
            if first is None:
                first = (reason, bf)
            dropped.append((reason, sorted(used)))
        u = set(used)
        remaining = [t for t in remaining if t[2] not in u]
        if not u:
            break
    if not bundles:
        reason, bf = first or ("관측 달 수 부족", {})
        feat.update({k: v for k, v in bf.items() if k != "months"})
        feat["dropped"] = dropped
        return False, [], reason, feat
    feat["bundles"] = len(bundles)
    feat["dropped"] = dropped
    for k in ("anchor", "median_per_month", "on_schedule_ratio", "regular_gap_ratio", "missing_month_ratio", "amount_stable_ratio", "type"):
        feat[k] = bundles[0].get(k)
    return True, pos, "월 반복 후보" + (" (묶음 %d개)" % len(bundles) if len(bundles) > 1 else ""), feat


def detect(rows, params, buckets, payer_filter=None):
    rows = strip_forbidden(rows)
    pairs = group_pairs(rows)
    windows = payer_windows(rows)
    pos, info = set(), {}
    for key, txs in pairs.items():
        if payer_filter is not None and key[0] not in payer_filter:
            continue
        ok, rws, reason, feat = judge_pair(txs, params, buckets, windows.get(key[0]))
        info[key] = {"candidate": ok, "reason": reason, "feat": feat, "rows": [t[2] for t in txs]}
        if ok:
            pos.update(rws)
    return pos, info, pairs


def baseline(pairs, params, payer_filter=None):
    """단순 기준 규칙: 같은 상대에게 서로 다른 달 N번 이상 보냈으면 전부 반복으로 본다."""
    pos = set()
    for key, txs in pairs.items():
        if payer_filter is not None and key[0] not in payer_filter:
            continue
        if len({ym(d) for d, _a, _r in txs}) >= params["baseline_min_distinct_months"]:
            pos.update(t[2] for t in txs)
    return pos


def thresholds(p, lo=3, hi=12):
    """관측 달 수별로 규칙이 실제로 몇 달을 요구하는지. 비율 숫자를 사람이 읽을 수 있게 바꾼 표."""
    out = []
    for n in range(lo, hi + 1):
        on = max(math.ceil(p["min_on_schedule_ratio"] * n - 1e-9), p["min_distinct_months"])
        gaps = n - 1
        out.append({
            "관측 달": n,
            "날짜가 맞아야 하는 달": "%d 이상" % on,
            "빠져도 되는 달": "%d 이하" % min(math.floor(p["max_missing_month_ratio"] * n + 1e-9), n - p["min_distinct_months"]),
            "한 달 간격이어야 하는 이음": "%d/%d 이상" % (math.ceil(p["min_regular_gap_ratio"] * gaps - 1e-9), gaps),
            "금액 구간이 같아야 하는 달": ("%d 이상" % math.ceil(p["min_amount_stable_ratio"] * on - 1e-9))
            + (" (못 미치면 변동 금액 후보)" if p.get("allow_variable_amount") else ""),
        })
    return out
