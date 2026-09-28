"""원천 거래 전량 추적 (2판, GPT 검토 반영).

두 가지를 따로 만든다.
  1) 원천 행 추적표: 모든 행이 반영·제외·미해결 중 하나로 끝난다. 문제 표시(flags)는 여러 개 붙을 수 있다.
  2) 실제 거래 통합표: 돈이 실제로 움직였다고 볼 수 있는 것만, 한 번씩만 센다.
     반영 행만 들어가고, 그중 「명세 근거 추정」은 따로 나눠 센다.
원칙: 명세로 확정되지 않은 것은 성공으로도 실패로도 보지 않고 미해결로 둔다.
"""
from collections import Counter, defaultdict

from .common import acct, to_int, ym

APPLIED, EXCLUDED, UNRESOLVED = "반영", "제외", "미해결"

# 명세서 코드표에 실린 「불능·실패」 코드만 실패로 본다. 나머지는 미해결.
NJ_FAIL = {"11", "12", "13", "21", "22", "23", "24", "25", "26", "27", "31", "32", "33", "34", "35", "40", "51", "52", "90", "98"}
JC_FAIL = {"01", "02", "03", "04", "05", "06", "07", "10", "13", "14", "15", "16", "31", "32", "39", "44", "99"}
# CD 거래구분코드 중 설명에 「취소」가 없는 것만 방향을 확정해 반영한다.
CD_NO_CANCEL = {"400020": ("out_in", "ATM 입금이체"), "400021": ("out_in", "ATM 입금이체"), "400120": ("out_in", "ATM 입금이체"),
                "500000": ("in", "현금입금"), "500100": ("in", "현금입금"),
                "460000": ("out", "동행지로납부"), "462000": ("out", "동행지로납부")}


class Row:
    __slots__ = ("table", "row", "status", "reason", "flags", "link", "account", "kind")

    def __init__(self, table, row, account):
        self.table, self.row, self.account = table, row, account
        self.status, self.reason, self.flags, self.link, self.kind = None, "", [], "", ""


def run(data, run_cfg):
    rows = []
    ledger = []  # (account, yyyymm, direction, amount, table, row, kind)  kind = 확정 | 명세 근거 추정

    def new(t, r, a):
        x = Row(t, r["_row"], a)
        rows.append(x)
        return x

    def done(x, st, reason, link=""):
        x.status, x.reason, x.link = st, reason, link

    def post(x, r, a, direction, amount, kind="확정"):
        x.kind = kind
        ledger.append((a, ym(r["_date"]), direction, amount, x.table, x.row, kind))

    # 홈·펌뱅킹 이체
    hf = data.get("HF_TRNS_TRAN", [])
    seen = {}
    dup_rule = run_cfg.get("treat_identical_rows_as_duplicate", False)
    hf_key = defaultdict(list)
    for r in hf:
        wd, dps, amt = acct(r.get("wd_fc"), r.get("wd_ac")), acct(r.get("dps_fc"), r.get("dps_ac")), to_int(r.get("amt"))
        x = new("HF_TRNS_TRAN", r, wd)
        if r["_date"] is None:
            x.flags.append("날짜 없음")
        if not wd or not dps:
            x.flags.append("계좌 없음")
        if amt is None:
            x.flags.append("금액 없음")
        sig = tuple(r.get(k) for k in ("date", "tmrg", "wd_fc", "wd_ac", "dps_fc", "dps_ac", "amt", "md_type", "fnd_type"))
        if sig in seen:
            x.flags.append("똑같은 줄")
        if x.flags:
            if "똑같은 줄" in x.flags and len(x.flags) == 1 and dup_rule:
                done(x, EXCLUDED, "똑같은 줄(중복으로 처리)", link="HF:%d" % seen[sig])
            else:
                done(x, UNRESOLVED, x.flags[0] if x.flags[0] != "똑같은 줄" else "똑같은 줄(중복인지 판정 불가)", link=("HF:%d" % seen[sig]) if sig in seen else "")
        elif wd == dps:
            done(x, EXCLUDED, "같은 일련번호 계좌 안 이동")
        else:
            done(x, APPLIED, "이체")
            post(x, r, wd, "out", amt)
            post(x, r, dps, "in", amt)
            hf_key[(wd, dps, r["_date"], amt)].append(r["_row"])
        seen.setdefault(sig, r["_row"])

    # 납부자자동이체: 양방향 1:1일 때만 같은 거래로 본다
    nj = data.get("GR_NJ_TRAN", [])
    nj_by_key = defaultdict(list)
    for r in nj:
        if (r.get("rslt") or "").strip() == "00" and r["_date"] is not None:
            nj_by_key[(acct(r.get("wd_fc"), r.get("wd_ac")), acct(r.get("dps_fc"), r.get("dps_ac")), r["_date"], to_int(r.get("amt")))].append(r["_row"])
    for r in nj:
        code = (r.get("rslt") or "").strip()
        wd = acct(r.get("wd_fc"), r.get("wd_ac"))
        x = new("GR_NJ_TRAN", r, wd)
        if r["_date"] is None:
            done(x, UNRESOLVED, "날짜 없음")
        elif code in NJ_FAIL:
            done(x, EXCLUDED, "명세상 불능(결과코드 %s)" % code)
        elif code != "00":
            done(x, UNRESOLVED, "명세에 없는 결과코드(%s)" % (code or "빈칸"))
        else:
            k = (wd, acct(r.get("dps_fc"), r.get("dps_ac")), r["_date"], to_int(r.get("amt")))
            hits, back = hf_key.get(k, []), nj_by_key.get(k, [])
            if len(hits) == 1 and len(back) == 1:
                done(x, EXCLUDED, "이체내역과 1:1 대응(이체내역에 반영)", link="HF:%d" % hits[0])
            elif hits:
                x.flags.append("다중 대응")
                done(x, UNRESOLVED, "이체내역과 다중 대응(중복 추정)")
            else:
                x.flags.append("대응 없음")
                done(x, UNRESOLVED, "이체내역과 대응 없음(별도 출금인지 중복인지 모름)")

    # 자동이체 출금청구: 청구 기록은 실제 출금 완료의 증거가 아니다
    for r in data.get("GR_JC_TRAN", []):
        code = (r.get("rslt") or "").strip()
        x = new("GR_JC_TRAN", r, acct(r.get("fc"), r.get("ac")))
        if code in JC_FAIL:
            done(x, EXCLUDED, "명세상 불능(결과코드 %s)" % code)
        elif code == "09":
            done(x, UNRESOLVED, "부분출금(금액의 뜻 미확정)")
        else:
            done(x, UNRESOLVED, "청구 기록만 있음(출금 완료 미확인, 결과코드 %s)" % (code or "빈칸"))

    # CMS 의뢰·결과: 결과표 기간 안에서만 「결과 없음 = 정상」(명세 근거 추정)
    res = defaultdict(list)
    res_dates = [r["_date"] for r in data.get("CMS_RES_TRAN", []) if r["_date"]]
    lo, hi = (min(res_dates), max(res_dates)) if res_dates else (None, None)
    if run_cfg.get("cms_success_if_no_failure", False) and not (run_cfg.get("cms_evidence_note") or "").strip():
        raise SystemExit("cms_success_if_no_failure를 켜려면 cms_evidence_note에 근거(명세의 해당 문구, 결과표 연결 확인, 결과표 완결성 확인)를 먼저 적어야 합니다.")
    for r in data.get("CMS_RES_TRAN", []):
        res[(acct(r.get("fc"), r.get("ac")), r.get("uo"), r.get("pyr"), r["_date"])].append(r)
    used = set()
    for r in data.get("CMS_REQ_TRAN", []):
        a, amt = acct(r.get("fc"), r.get("ac")), to_int(r.get("req_amt"))
        x = new("CMS_REQ_TRAN", r, a)
        if r["_date"] is None or not a or amt is None:
            done(x, UNRESOLVED, "날짜·계좌·금액 없음")
            continue
        hits = res.get((a, r.get("uo"), r.get("pyr"), r["_date"]), [])
        if len(hits) > 1:
            done(x, UNRESOLVED, "결과표 다중 대응")
        elif hits:
            h = hits[0]
            used.add(h["_row"])
            yn = (h.get("wd_yn") or "").strip().upper()
            if yn == "N":
                done(x, EXCLUDED, "CMS 출금불능", link="RES:%d" % h["_row"])
            elif yn == "P":
                done(x, UNRESOLVED, "CMS 부분출금(범주화 금액이라 실제 출금액 모름)", link="RES:%d" % h["_row"])
            else:
                done(x, UNRESOLVED, "모르는 출금여부")
        elif lo and lo <= r["_date"] <= hi and run_cfg.get("cms_success_if_no_failure", False):
            done(x, APPLIED, "CMS 출금(결과표에 실패 없음, 명세 근거 추정)")
            post(x, r, a, "out", amt, kind="명세 근거 추정")
        elif lo and lo <= r["_date"] <= hi:
            x.flags.append("성공 추정 가능")
            done(x, UNRESOLVED, "결과표에 실패 없음(성공 근거 미확정, 이체내역과 중복 여부 모름)")
        else:
            done(x, UNRESOLVED, "결과표 제공 기간 밖(성공 여부 모름)")
    for r in data.get("CMS_RES_TRAN", []):
        x = new("CMS_RES_TRAN", r, acct(r.get("fc"), r.get("ac")))
        if r["_row"] in used:
            done(x, EXCLUDED, "결과표(의뢰 건에서 처리)")
        else:
            done(x, UNRESOLVED, "짝이 되는 의뢰 없음")

    # 오픈뱅킹 이체: 이체내역과 같은 날·같은 금액 범주면 중복 후보로 빼 둔다
    hf_out = {(k[0], k[2], k[3]) for k in hf_key}
    for r in data.get("OB_TRNS_TRAN", []):
        a, amt, code = acct(r.get("fc"), r.get("ac")), to_int(r.get("amt")), (r.get("trns_code") or "").strip().upper()
        x = new("OB_TRNS_TRAN", r, a)
        if r["_date"] is None or not a or amt is None:
            done(x, UNRESOLVED, "날짜·계좌·금액 없음")
        elif code not in ("WD", "DP"):
            done(x, UNRESOLVED, "모르는 이체업무구분")
        elif code == "WD" and (a, r["_date"], amt) in hf_out:
            x.flags.append("교차 중복 후보")
            done(x, UNRESOLVED, "이체내역과 중복 후보")
        else:
            done(x, APPLIED, "오픈뱅킹 출금" if code == "WD" else "오픈뱅킹 입금")
            post(x, r, a, "out" if code == "WD" else "in", amt)

    for r in data.get("OB_INQR_TRAN", []):
        done(new("OB_INQR_TRAN", r, acct(r.get("fc"), r.get("ac"))), EXCLUDED, "조회(돈 이동 없음)")
    for r in data.get("PI_WD_LEDG", []):
        done(new("PI_WD_LEDG", r, acct(r.get("fc"), r.get("ac"))), EXCLUDED, "원장(거래가 아님)")

    # CD/ATM: 지급과 취소가 한 코드에 섞인 것은 미해결
    for r in data.get("CD_TRNS_TRAN", []):
        c = (r.get("tran_code") or "").strip()
        wd, dps, amt = acct(r.get("wd_fc"), r.get("wd_ac")), acct(r.get("dps_fc"), r.get("dps_ac")), to_int(r.get("amt"))
        x = new("CD_TRNS_TRAN", r, wd or dps)
        if r["_date"] is None:
            done(x, UNRESOLVED, "날짜 없음")
        elif c.startswith("3"):
            done(x, EXCLUDED, "조회(돈 이동 없음)")
        elif c in CD_NO_CANCEL and amt is not None:
            how, name = CD_NO_CANCEL[c]
            if how == "in" and dps:
                done(x, APPLIED, name)
                post(x, r, dps, "in", amt)
            elif how in ("out", "out_in") and wd:
                done(x, APPLIED, name)
                post(x, r, wd, "out", amt)
                if how == "out_in" and dps:
                    post(x, r, dps, "in", amt)
            else:
                done(x, UNRESOLVED, "계좌 없음")
        elif len(c) == 6 and c.isdigit():
            done(x, UNRESOLVED, "지급·취소 구분 불가 또는 분류 기준 미정")
        else:
            done(x, UNRESOLVED, "모르는 거래구분코드")

    return rows, ledger


def _suppress_group(vals, mc):
    """작은 칸 가리기 + 짝 가리기: 한 묶음에서 가린 칸이 하나뿐이면 다음으로 작은 칸도 가린다 (합계에서 거꾸로 계산 못 하게)."""
    shown = ["<%d" % mc if 0 < v < mc else str(v) for v in vals]
    hidden = [i for i, v in enumerate(vals) if 0 < v < mc]
    if len(hidden) == 1:
        rest = sorted((v, i) for i, v in enumerate(vals) if i not in hidden and v > 0)
        if rest:
            shown[rest[0][1]] = "가림"
    return shown


def summary(data, rows, mc):
    by = defaultdict(Counter)
    reasons = defaultdict(Counter)
    accts = defaultdict(set)
    for x in rows:
        by[x.table][x.status] += 1
        reasons[(x.table, x.status)][x.reason] += 1
        if x.account:
            accts[(x.table, x.status, x.reason)].add(x.account)
    tables, ok_all = [], True
    for t, rs in data.items():
        c = by[t]
        ok = len(rs) == c[APPLIED] + c[EXCLUDED] + c[UNRESOLVED] and all(x.status for x in rows if x.table == t)
        ok_all &= ok
        vals = _suppress_group([c[APPLIED], c[EXCLUDED], c[UNRESOLVED]], mc)
        tables.append([t, len(rs)] + vals + ["맞음" if ok else "안 맞음"])
    detail = []
    for (t, st), cc in sorted(reasons.items()):
        items = cc.most_common()
        vals = _suppress_group([n for _r, n in items], mc)
        for (rs, n), v in zip(items, vals):
            na = len(accts[(t, st, rs)])
            if 0 < na < mc and v not in ("가림",) and not v.startswith("<"):
                v = "가림(계좌 %s곳 미만)" % mc
            detail.append([t, st, rs, v])
    return tables, detail, ok_all


def unified(ledger, mc):
    """실제 거래 통합표: 반영된 돈의 움직임만, 확정과 추정을 나눠 센다."""
    c = Counter()
    a = defaultdict(set)
    for acc, _m, d, _amt, t, _r, kind in ledger:
        c[(t, d, kind)] += 1
        a[(t, d, kind)].add(acc)
    out = []
    for k in sorted(c):
        n = c[k]
        shown = "<%d" % mc if n < mc else str(n)
        if len(a[k]) < mc:
            shown = "가림(계좌 %d곳 미만)" % mc
        out.append([k[0], "출금" if k[1] == "out" else "입금", k[2], shown])
    return out


def account_month(ledger):
    agg = defaultdict(lambda: [0, 0, 0, 0, 0])  # 입금건, 입금액, 출금건, 출금액 (확정만), 추정건 (합산하지 않음)
    for a, m, d, amt, _t, _r, kind in ledger:
        x = agg[(a, m)]
        if kind != "확정":
            x[4] += 1
            continue
        if d == "in":
            x[0] += 1
            x[1] += amt
        else:
            x[2] += 1
            x[3] += amt
    return agg
