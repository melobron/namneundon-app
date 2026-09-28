"""데이터 읽기와 2주차 보고용 현황(프로파일)."""
from collections import Counter, defaultdict

from .common import TABLES, acct, amount_buckets, load_json, parse_date, read_table, to_int, ym


def load_all(data_dir, limit=None):
    cols = load_json("config/columns.json")
    data, meta = {}, {}
    for t in TABLES:
        rows, m = read_table(data_dir, t, cols, limit=limit)
        if rows is None:
            meta[t] = {"file": None, "rows": 0, "missing_columns": []}
            continue
        for r in rows:
            r["_date"] = parse_date(r.get("date"))
        data[t] = rows
        m["rows"] = len(rows)
        meta[t] = m
    return data, meta


def hf_amount_buckets(data, run_cfg):
    vals = [to_int(r.get("amt")) for r in data.get("HF_TRNS_TRAN", [])]
    return amount_buckets(vals, run_cfg.get("amount_buckets"))


def match_nj_to_hf(data):
    """납부자자동이체 정상입금(00) 건을 이체내역과 대조한다. 유일 대응·다중 대응·대응 없음."""
    idx = defaultdict(list)
    for r in data.get("HF_TRNS_TRAN", []):
        if r["_date"] is None:
            continue
        k = (acct(r.get("wd_fc"), r.get("wd_ac")), acct(r.get("dps_fc"), r.get("dps_ac")), r["_date"], to_int(r.get("amt")))
        idx[k].append(r["_row"])
    result = {}
    for r in data.get("GR_NJ_TRAN", []):
        if (r.get("rslt") or "").strip() != "00" or r["_date"] is None:
            continue
        k = (acct(r.get("wd_fc"), r.get("wd_ac")), acct(r.get("dps_fc"), r.get("dps_ac")), r["_date"], to_int(r.get("amt")))
        hits = idx.get(k, [])
        result[r["_row"]] = hits
    return result


def profile(data, meta):
    """2주차 종료 보고에 들어갈 숫자: 관측기간, 연결률, 다중대응률, 금액 구간, 자금구분 04 비중."""
    out = {"tables": {}}
    for t, m in meta.items():
        rows = data.get(t, [])
        dates = [r["_date"] for r in rows if r.get("_date")]
        out["tables"][t] = {
            "file": m.get("file"), "rows": len(rows), "missing_columns": m.get("missing_columns", []),
            "date_min": min(dates).isoformat() if dates else "", "date_max": max(dates).isoformat() if dates else "",
            "months": len({ym(d) for d in dates}), "date_missing": sum(1 for r in rows if "date" in r and not r.get("_date")),
        }
    hf = data.get("HF_TRNS_TRAN", [])
    if hf:
        fnd = Counter((r.get("fnd_type") or "") for r in hf)
        out["hf_fnd_type"] = dict(fnd)
        out["hf_fnd04_ratio"] = round(fnd.get("04", 0) / len(hf), 4)
        amts = Counter(to_int(r.get("amt")) for r in hf)
        out["hf_amount_values"] = len(amts)
        out["hf_amount_top"] = [[k, v] for k, v in sorted(amts.items(), key=lambda x: (x[0] is None, x[0]))][:40]
        per_acct = defaultdict(set)
        for r in hf:
            a = acct(r.get("wd_fc"), r.get("wd_ac"))
            if a and r["_date"]:
                per_acct[a].add(ym(r["_date"]))
        spans = sorted(len(v) for v in per_acct.values())
        out["payer_accounts"] = len(spans)
        if spans:
            out["payer_months_median"] = spans[len(spans) // 2]
            out["payer_months_ge6_ratio"] = round(sum(1 for s in spans if s >= 6) / len(spans), 4)
    m = match_nj_to_hf(data)
    if m:
        uniq = sum(1 for v in m.values() if len(v) == 1)
        multi = sum(1 for v in m.values() if len(v) > 1)
        out["nj_ok_rows"] = len(m)
        out["nj_link_unique_ratio"] = round(uniq / len(m), 4)
        out["nj_link_multi_ratio"] = round(multi / len(m), 4)
        out["nj_link_none_ratio"] = round((len(m) - uniq - multi) / len(m), 4)
    return out
