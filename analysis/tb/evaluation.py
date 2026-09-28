"""개발용·평가용 계좌 분리, 동결, 평가표본, 검토, 채점 (3판).

순서 (코드가 막는다. 기록은 「변경 추적」 장치이며 조작을 원천 차단하지는 못한다)
  1. split    : 출금 계좌 단위로 개발용·평가용을 나누고, 그 시점의 평가 계좌 목록 지문을 기록한다.
  2. freeze   : 규칙 숫자·설정·판정 지침·코드 전부·데이터 파일·분할 기록의 지문을 남긴다.
  3. sample   : 동결된 뒤에만. 평가용 계좌의 출금 거래 전체가 모집단(거래 1건 단위).
  4. 1차 검토 : 예측도 보조 근거도 없이 R·N·U를 적는다 → commit-labels
  5. 재검토   : (검토자가 한 사람일 때) 1차 지문 뒤 recheck_min_days가 지나야 지문을 받는다. 표본 일부, 순서 섞음, 1차 판정 없음 → commit-labels --stage recheck
  6. aux-review: 재검토까지 끝난 뒤에만 보조 근거를 연다. 바꾸면 이유 → commit-labels --stage aux
  7. evaluate : 한 번만. 다시 돌리려면 이유를 적어야 하고, 모든 실행이 기록에 남는다.
"""
import datetime as dt
import glob
import hashlib
import json
import os
import random
from collections import Counter, defaultdict

from .common import TABLES, acct, find_table_file, md_table, path, read_csv, sha256_file, write_csv, ym
from .detect import baseline, detect

LABELS = {"R": "반복", "N": "비반복", "U": "판정불가"}
BASES = ("가중", "비가중")


# ---------- 기록 ----------
def _now():
    return dt.datetime.now().isoformat(timespec="seconds")


def history_file(work_dir):
    return os.path.join(work_dir, "freeze", "history.jsonl")


def log_event(work_dir, event, **kw):
    """덧붙이기만 하는 기록. 지우거나 고치는 코드는 없다."""
    f = history_file(work_dir)
    os.makedirs(os.path.dirname(f), exist_ok=True)
    rec = {"at": _now(), "event": event}
    rec.update(kw)
    with open(f, "a", encoding="utf-8") as fh:
        fh.write(json.dumps(rec, ensure_ascii=False) + "\n")
    return rec


def history(work_dir):
    f = history_file(work_dir)
    if not os.path.exists(f):
        return []
    with open(f, encoding="utf-8") as fh:
        return [json.loads(x) for x in fh if x.strip()]


# ---------- 분리 ----------
def split_of(account, salt, ratio):
    h = hashlib.sha256((salt + "|" + account).encode("utf-8")).hexdigest()
    return "eval" if int(h[:8], 16) / 0xFFFFFFFF < ratio else "dev"


def payers(hf_rows):
    return {acct(r.get("wd_fc"), r.get("wd_ac")) for r in hf_rows if acct(r.get("wd_fc"), r.get("wd_ac"))}


def split_accounts(hf_rows, salt, ratio):
    out = {"dev": set(), "eval": set()}
    for a in payers(hf_rows):
        out[split_of(a, salt, ratio)].add(a)
    return out


def _list_hash(accounts):
    return hashlib.sha256("\n".join(sorted(accounts)).encode()).hexdigest()


def record_split(work_dir, salt, sp, note=""):
    """분할 시점의 평가 계좌 목록 지문. 이미 있으면 바뀌지 않았는지만 확인한다."""
    f = os.path.join(work_dir, "split", "split_record.json")
    now = {"salt_sha256": hashlib.sha256(salt.encode()).hexdigest(), "eval_list_sha256": _list_hash(sp["eval"]),
           "dev_list_sha256": _list_hash(sp["dev"]), "n_eval": len(sp["eval"]), "n_dev": len(sp["dev"])}
    if os.path.exists(f):
        old = json.load(open(f, encoding="utf-8"))
        if any(old[k] != now[k] for k in ("salt_sha256", "eval_list_sha256")):
            raise SystemExit("처음 기록한 개발용·평가용 분리와 지금 분리가 다릅니다. 솔트나 데이터가 바뀌었는지 확인하세요.")
        return old, False
    now.update({"recorded_at": _now(), "note": note})
    os.makedirs(os.path.dirname(f), exist_ok=True)
    with open(f, "w", encoding="utf-8") as fh:
        json.dump(now, fh, ensure_ascii=False, indent=2)
    log_event(work_dir, "split", eval_list_sha256=now["eval_list_sha256"], n_eval=now["n_eval"], n_dev=now["n_dev"], note=note)
    return now, True


# ---------- 동결 ----------
def fingerprint(run_cfg, data_dir, work_dir=None):
    files = ["config/params.json", "config/run.json", "config/columns.json", "config/guideline.md"]
    files += sorted(os.path.relpath(f, path()) for f in glob.glob(path("tb", "*.py")))
    code = {f.replace(os.sep, "/"): sha256_file(path(f)) for f in files if os.path.exists(path(f))}
    data = {}
    for t in TABLES:
        full = find_table_file(data_dir, t)
        if full:
            data[os.path.basename(full)] = sha256_file(full)
    if work_dir and os.path.exists(os.path.join(work_dir, "split", "split_record.json")):
        code["work/split/split_record.json"] = sha256_file(os.path.join(work_dir, "split", "split_record.json"))
    return {"code_config": code, "data": data,
            "split_salt_sha256": hashlib.sha256(run_cfg["split_salt"].encode()).hexdigest(),
            "eval_ratio": run_cfg["eval_ratio"], "target_basis": run_cfg.get("target_basis")}


def _digest(fp):
    return hashlib.sha256(json.dumps(fp, sort_keys=True, ensure_ascii=False).encode()).hexdigest()


def freeze(work_dir, run_cfg, data_dir, note=""):
    if run_cfg.get("target_basis") not in BASES:
        raise SystemExit("동결 전에 config/run.json의 target_basis를 정하세요: 「가중」(모집단 추정) 또는 「비가중」(표본 그대로). 85%·70%를 어느 값과 견줄지 미리 정하는 것입니다.")
    if not os.path.exists(path("config", "guideline.md")):
        raise SystemExit("판정 지침(config/guideline.md)이 없습니다. 지침을 확정한 뒤 동결합니다.")
    f = os.path.join(work_dir, "freeze", "freeze.json")
    if os.path.exists(f):
        raise SystemExit("이미 동결했습니다. 동결 뒤 수정은 계획서대로 따로 보고하고, 새 작업 폴더에서 다시 시작합니다.")
    if not os.path.exists(os.path.join(work_dir, "split", "split_record.json")):
        raise SystemExit("분할 기록이 없습니다. 개발을 시작할 때 split을 먼저 실행해 평가 계좌 목록 지문을 남기세요.")
    fp = fingerprint(run_cfg, data_dir, work_dir)
    rec = {"frozen_at": _now(), "note": note, "digest": _digest(fp), "fingerprint": fp}
    os.makedirs(os.path.dirname(f), exist_ok=True)
    with open(f, "w", encoding="utf-8") as fh:
        json.dump(rec, fh, ensure_ascii=False, indent=2)
    log_event(work_dir, "freeze", digest=rec["digest"], note=note)
    return rec


def check_freeze(work_dir, run_cfg, data_dir):
    f = os.path.join(work_dir, "freeze", "freeze.json")
    if not os.path.exists(f):
        return False, "동결 기록이 없습니다. 규칙과 판정 지침을 확정하고 freeze를 먼저 실행하세요."
    rec = json.load(open(f, encoding="utf-8"))
    now = fingerprint(run_cfg, data_dir, work_dir)
    old = rec["fingerprint"]
    diff = []
    for k in ("code_config", "data"):
        for name in sorted(set(old[k]) | set(now[k])):
            if old[k].get(name) != now[k].get(name):
                diff.append(name)
    for k in ("split_salt_sha256", "eval_ratio", "target_basis"):
        if old.get(k) != now.get(k):
            diff.append(k)
    if diff:
        return False, "동결 뒤 바뀐 것이 있어 멈춥니다: " + ", ".join(diff)
    return True, rec


# ---------- 평가표본 ----------
def _tier_acct(m):
    return "A<6" if m < 6 else ("A6-11" if m < 12 else "A12+")


def _tier_pair(m):
    return "P1" if m <= 1 else ("P2" if m == 2 else ("P3-5" if m <= 5 else "P6+"))


def draw_sample(hf_all, applied_rows, eval_accounts, run_cfg, data_dir, work_dir):
    """동결 뒤에만. 예측을 전혀 쓰지 않고 층화 추출한다.
    모집단 = 평가용 계좌에서 날짜와 출금계좌가 있는 이체 거래 전부 (거래 1건 단위).
    상대 계좌가 없거나 검산에서 반영되지 않은 거래는 P0 층 (규칙이 볼 수 없으므로 놓침으로 셈)."""
    ok, rec = check_freeze(work_dir, run_cfg, data_dir)
    if not ok:
        raise SystemExit("평가표본은 규칙과 판정 지침을 동결한 뒤에만 뽑습니다. " + rec)
    priv = os.path.join(work_dir, "eval_private")
    if os.path.exists(os.path.join(priv, "sample_frame.csv")):
        raise SystemExit("평가표본이 이미 있습니다. 다시 뽑지 않습니다.")
    acct_months, pair_months, pair_rows = defaultdict(set), defaultdict(set), defaultdict(list)
    pop_rows = []
    for r in hf_all:
        wd = acct(r.get("wd_fc"), r.get("wd_ac"))
        if wd not in eval_accounts or r["_date"] is None:
            continue
        pop_rows.append(r)
        acct_months[wd].add(ym(r["_date"]))
        dps = acct(r.get("dps_fc"), r.get("dps_ac"))
        if dps and r["_row"] in applied_rows:
            pair_months[(wd, dps)].add(ym(r["_date"]))
            pair_rows[(wd, dps)].append(r)
    strata = defaultdict(list)
    for r in pop_rows:
        wd, dps = acct(r.get("wd_fc"), r.get("wd_ac")), acct(r.get("dps_fc"), r.get("dps_ac"))
        key = (wd, dps)
        tier = _tier_pair(len(pair_months[key])) if (dps and r["_row"] in applied_rows) else "P0"
        strata[_tier_acct(len(acct_months[wd])) + "·" + tier].append((key, r))
    rng = random.Random(run_cfg["random_seed"])
    k = run_cfg["sample_per_stratum"]
    show_aux = run_cfg.get("review_show_aux_evidence", False)
    frame, sheet = [], []
    pair_code, payer_code = {}, {}
    for s in sorted(strata):
        pop = strata[s]
        pick = rng.sample(pop, min(k, len(pop)))
        prob = len(pick) / len(pop)
        for key, r in pick:
            review_id = "R%05d" % (len(frame) + 1)
            yc = payer_code.setdefault(key[0], "계좌%05d" % (len(payer_code) + 1))
            pc = pair_code.setdefault(key, "짝%05d" % (len(pair_code) + 1))
            frame.append({"review_id": review_id, "row": r["_row"], "stratum": s, "cluster": yc,
                          "N_h": len(pop), "n_h": len(pick), "prob": round(prob, 8)})
            ctx = sorted(pair_rows.get(key, []) or [r], key=lambda x: x["_date"])
            if r not in ctx:
                ctx = sorted(ctx + [r], key=lambda x: x["_date"])
            for c in ctx:
                line = {"review_id": review_id, "대상": "★" if c["_row"] == r["_row"] else "", "출금계좌": yc,
                        "상대짝": pc if key[1] else "(상대 없음)", "날짜": c["_date"].isoformat(), "시간대": c.get("tmrg"),
                        "금액(범주)": c.get("amt"), "매체": c.get("md_type")}
                if show_aux:
                    line["자금구분"] = c.get("fnd_type")
                line["판정(R/N/U)"] = ""
                line["근거메모"] = ""
                sheet.append(line)
    fields = ["review_id", "대상", "출금계좌", "상대짝", "날짜", "시간대", "금액(범주)", "매체"] + (["자금구분"] if show_aux else []) + ["판정(R/N/U)", "근거메모"]
    write_csv(os.path.join(priv, "sample_frame.csv"), frame, ["review_id", "row", "stratum", "cluster", "N_h", "n_h", "prob"])
    write_csv(os.path.join(priv, "review_sheet.csv"), sheet, fields)
    # 재검토(검토자가 한 사람) 또는 두 번째 검토자: 표본 일부를 미리 무작위로 정하고 순서를 섞는다
    ratio = run_cfg.get("recheck_ratio", 0) or 0
    second = rng.sample([f["review_id"] for f in frame], int(round(ratio * len(frame)))) if ratio > 0 else []
    if second:
        rng.shuffle(second)
        blocks = defaultdict(list)
        for x in sheet:
            blocks[x["review_id"]].append(x)
        out, seq = [], {}
        for i, rid in enumerate(second):
            seq[rid] = "Q%05d" % (i + 1)
            for x in blocks[rid]:
                y = dict(x)
                y["review_id"], y["판정(R/N/U)"], y["근거메모"] = seq[rid], "", ""
                out.append(y)
        write_csv(os.path.join(priv, "review_sheet_recheck.csv"), out, fields)
        write_csv(os.path.join(priv, "recheck_map.csv"), [{"q": q, "review_id": r} for r, q in seq.items()], ["q", "review_id"])
    log_event(work_dir, "sample", n=len(frame), strata=len(strata), recheck=len(second))
    return frame, Counter(f["stratum"] for f in frame), len(second)


def _labels(sheet_file):
    out = {}
    for line in read_csv(sheet_file):
        if line.get("대상") == "★":
            lab = (line.get("판정(R/N/U)") or line.get("최종판정(R/N/U)") or "").strip().upper()
            out[line["review_id"]] = lab if lab in LABELS else ""
    return out


def aux_sheet(work_dir, hf_by_row, aux):
    """1차 검토 지문이 남은 뒤에만. 보조 근거를 보여 주고, 판정을 바꾸면 이유를 적게 한다."""
    priv = os.path.join(work_dir, "eval_private")
    c = _load_commit(work_dir)
    if "stage1" not in c:
        raise SystemExit("1차 검토지 지문이 없습니다. 1차 검토를 끝내고 commit-labels를 먼저 실행하세요.")
    if os.path.exists(os.path.join(priv, "review_sheet_recheck.csv")) and "recheck" not in c:
        raise SystemExit("재검토가 끝나기 전에는 보조 근거를 열지 않습니다. 재검토 후 commit-labels --stage recheck 를 먼저 하세요.")
    first = _labels(os.path.join(priv, "review_sheet.csv"))
    out = []
    for f in read_csv(os.path.join(priv, "sample_frame.csv")):
        r = hf_by_row.get(int(f["row"]), {})
        out.append({"review_id": f["review_id"], "대상": "★", "1차판정": first.get(f["review_id"], ""),
                    "자금구분": r.get("fnd_type", ""), "납부자자동이체_1:1대응": "예" if int(f["row"]) in aux.get("A", set()) else "",
                    "최종판정(R/N/U)": first.get(f["review_id"], ""), "바꾼이유": ""})
    write_csv(os.path.join(priv, "review_sheet_aux.csv"), out,
              ["review_id", "대상", "1차판정", "자금구분", "납부자자동이체_1:1대응", "최종판정(R/N/U)", "바꾼이유"])
    log_event(work_dir, "aux_sheet", n=len(out))
    return len(out)


def _load_commit(work_dir):
    f = os.path.join(work_dir, "eval_private", "labels_commit.json")
    return json.load(open(f, encoding="utf-8")) if os.path.exists(f) else {}


def commit_labels(work_dir, stage="1", min_days=14, allow_early=False):
    priv = os.path.join(work_dir, "eval_private")
    c = _load_commit(work_dir)
    key = {"1": "stage1", "recheck": "recheck", "aux": "aux"}[stage]
    if key in c:
        raise SystemExit("이 단계의 지문은 이미 남겼습니다. 검토지를 다시 고치지 않습니다.")
    if key != "stage1" and "stage1" not in c:
        raise SystemExit("1차 검토지 지문을 먼저 남기세요.")
    if key == "recheck":
        days = (dt.datetime.now() - dt.datetime.fromisoformat(c["stage1"]["at"])).days
        if days < min_days and not allow_early:
            raise SystemExit("1차 지문 뒤 %d일이 지나야 재검토 지문을 받습니다 (지금 %d일)." % (min_days, days))
    files = {"stage1": ["review_sheet.csv"], "recheck": ["review_sheet_recheck.csv"], "aux": ["review_sheet_aux.csv"]}[key]
    rec = {"at": _now()}
    for name in files:
        full = os.path.join(priv, name)
        if os.path.exists(full):
            rec[name] = sha256_file(full)
    if key == "aux":
        blank = [x["review_id"] for x in read_csv(os.path.join(priv, "review_sheet_aux.csv"))
                 if x["최종판정(R/N/U)"] != x["1차판정"] and not (x.get("바꾼이유") or "").strip()]
        if blank:
            raise SystemExit("판정을 바꾼 줄에 바꾼이유가 비어 있습니다: " + ", ".join(blank[:10]))
    c[key] = rec
    with open(os.path.join(priv, "labels_commit.json"), "w", encoding="utf-8") as fh:
        json.dump(c, fh, ensure_ascii=False, indent=2)
    log_event(work_dir, "commit_" + key, **{k: v for k, v in rec.items() if k != "at"})
    return rec


# ---------- 채점 ----------
def _metrics(tp, fp, fn):
    p = tp / (tp + fp) if tp + fp else None
    r = tp / (tp + fn) if tp + fn else None
    f1 = 2 * p * r / (p + r) if p and r else None
    return p, r, f1


def _score(items, pos, u_as=None, weighted=True):
    """items: (row, label, weight, stratum, cluster). u_as: U를 무엇으로 볼지 (None이면 뺀다)."""
    c = Counter()
    for row, lab, wt, _s, _c in items:
        if lab == "U" and u_as:
            lab = u_as
        if lab not in ("R", "N"):
            continue
        pred = row in pos
        k = ("TP" if pred else "FN") if lab == "R" else ("FP" if pred else "TN")
        c[k] += wt if weighted else 1
    return c


def _boot(items, pos, iters, seed, weighted):
    """계좌 묶음 재표본: 같은 계좌의 거래를 함께 뽑는다 (한 계좌 거래끼리 닮아서 구간이 좁게 나오는 것을 막음)."""
    by = defaultdict(list)
    for it in items:
        by[it[4]].append(it)
    keys = sorted(by)
    rng = random.Random(seed)
    res = {"p": [], "r": [], "f1": []}
    for _ in range(iters):
        s = []
        for _k in keys:
            s.extend(by[rng.choice(keys)])
        c = _score(s, pos, weighted=weighted)
        for k, x in zip(("p", "r", "f1"), _metrics(c["TP"], c["FP"], c["FN"])):
            if x is not None:
                res[k].append(x)

    def ci(v):
        if len(v) < 20:
            return (None, None)
        v = sorted(v)
        return (v[int(0.025 * len(v))], v[int(0.975 * len(v)) - 1])
    return {k: ci(v) for k, v in res.items()}


def _kappa(a, b):
    ids = [k for k in a if k in b and a[k] and b[k]]
    if not ids:
        return None, None, 0
    agree = sum(1 for k in ids if a[k] == b[k]) / len(ids)
    ca, cb = Counter(a[k] for k in ids), Counter(b[k] for k in ids)
    pe = sum(ca[x] * cb[x] for x in LABELS) / (len(ids) ** 2)
    kappa = (agree - pe) / (1 - pe) if pe < 1 else None
    return agree, kappa, len(ids)


def _pct(x):
    return "" if x is None else "%.1f%%" % (100 * x)


def _sg(vals, mc):
    from .reconcile import _suppress_group
    return _suppress_group(vals, mc)


def evaluate(hf_applied, pairs_all, params, buckets, eval_accounts, run_cfg, data_dir, work_dir, aux, rerun_reason=""):
    ok, rec = check_freeze(work_dir, run_cfg, data_dir)
    if not ok:
        raise SystemExit(rec)
    prior = [h for h in history(work_dir) if h["event"] == "evaluate"]
    if prior and not rerun_reason.strip():
        raise SystemExit("이미 %d번 채점했습니다 (처음: %s). 다시 돌리려면 --rerun-reason \"이유\"를 적으세요. 모든 실행이 기록에 남습니다." % (len(prior), prior[0]["at"]))
    priv = os.path.join(work_dir, "eval_private")
    c = _load_commit(work_dir)
    if "stage1" not in c:
        raise SystemExit("1차 검토지 지문이 없습니다. CTO가 commit-labels를 먼저 실행해야 합니다.")
    if os.path.exists(os.path.join(priv, "review_sheet_recheck.csv")) and "recheck" not in c:
        raise SystemExit("재검토 지문이 없습니다. 재검토를 끝내고 commit-labels --stage recheck 를 먼저 하세요.")
    for stage in ("stage1", "recheck", "aux"):
        for name, h in c.get(stage, {}).items():
            if name != "at" and sha256_file(os.path.join(priv, name)) != h:
                raise SystemExit("%s가 지문을 남긴 뒤 바뀌었습니다. 채점을 멈춥니다." % name)

    frame = read_csv(os.path.join(priv, "sample_frame.csv"))
    lab1 = _labels(os.path.join(priv, "review_sheet.csv"))
    items = [(int(f["row"]), lab1.get(f["review_id"]) or "U", 1.0 / float(f["prob"]), f["stratum"], f["cluster"]) for f in frame]

    pos, info, _pairs = detect(hf_applied, params, buckets, payer_filter=eval_accounts)
    base = baseline(pairs_all, params, payer_filter=eval_accounts)
    iters, seed, mc = run_cfg["bootstrap_iterations"], run_cfg["random_seed"], run_cfg["min_cell"]
    basis = run_cfg["target_basis"]
    weighted = basis == "가중"

    out = {}
    for name, pset in (("규칙", pos), ("단순 기준(같은 상대·여러 달)", base)):
        m = {}
        for wname, wflag in (("가중", True), ("비가중", False)):
            cc = _score(items, pset, weighted=wflag)
            m[wname] = _metrics(cc["TP"], cc["FP"], cc["FN"])
        m["ci"] = _boot(items, pset, iters, seed, weighted)
        m["u_as_R"] = _metrics(*[_score(items, pset, "R", weighted)[k] for k in ("TP", "FP", "FN")])
        m["u_as_N"] = _metrics(*[_score(items, pset, "N", weighted)[k] for k in ("TP", "FP", "FN")])
        out[name] = m

    n_total = len(items)
    n_u = sum(1 for it in items if it[1] == "U")
    n_p0 = sum(1 for it in items if it[3].endswith("P0"))

    # 오탐·미탐 유형
    row_pair = {}
    for v in info.values():
        for rw in v["rows"]:
            row_pair[rw] = v
    err = Counter()
    for row, lab, _w, s, _c in items:
        v = row_pair.get(row)
        if lab == "R" and row not in pos:
            if s.endswith("P0") or v is None:
                err[("미탐", "상대 계좌가 없거나 검산에서 반영되지 않은 거래")] += 1
            elif not v["candidate"]:
                err[("미탐", v["reason"])] += 1
            else:
                err[("미탐", "짝은 후보인데 이 거래는 묶음 밖(날짜·금액이 벗어남)")] += 1
        if lab == "N" and row in pos:
            f = v["feat"] if v else {}
            if f.get("months", 0) <= 4:
                err[("오탐", "관측이 짧은 짝(4달 이하)")] += 1
            elif f.get("bundles", 1) > 1:
                err[("오탐", "묶음이 둘로 잡힌 짝")] += 1
            elif (f.get("amount_stable_ratio") or 1) < 1:
                err[("오탐", "금액이 조금씩 바뀌는 짝")] += 1
            else:
                err[("오탐", "규칙은 월 반복, 검토는 비반복(메모 확인)")] += 1

    # 재검토(또는 두 번째 검토자)
    k_line = None
    f2 = os.path.join(priv, "review_sheet_recheck.csv")
    if os.path.exists(f2):
        qmap = {x["q"]: x["review_id"] for x in read_csv(os.path.join(priv, "recheck_map.csv"))}
        lab2 = {qmap[q]: v for q, v in _labels(f2).items()}
        agree, kappa, nk = _kappa(lab1, lab2)
        moves = Counter((lab1.get(k) or "U") + "→" + (lab2.get(k) or "U") for k in lab2 if (lab1.get(k) or "U") != (lab2.get(k) or "U"))
        k_line = (nk, agree, kappa, moves)

    # 보조 근거 2차 검토
    aux_line = None
    if "aux" in c:
        rows = read_csv(os.path.join(priv, "review_sheet_aux.csv"))
        final = {x["review_id"]: (x["최종판정(R/N/U)"] or "").strip().upper() for x in rows}
        changed = sum(1 for x in rows if x["최종판정(R/N/U)"] != x["1차판정"])
        items2 = [(it[0], final.get(f["review_id"]) or "U", it[2], it[3], it[4]) for it, f in zip(items, frame)]
        cc = _score(items2, pos, weighted=weighted)
        aux_line = (changed, _metrics(cc["TP"], cc["FP"], cc["FN"]))

    # A·B 보조: 평가용 계좌 전체에서
    eval_rows = aux.get("eval_rows", set())
    a_rows = [rw for rw in aux.get("A", set()) if rw in eval_rows]
    b_rows = [rw for rw in aux.get("B", set()) if rw in eval_rows]
    a_rate = sum(1 for rw in a_rows if rw in pos) / len(a_rows) if a_rows else None
    b_rate = sum(1 for rw in b_rows if rw in pos) / len(b_rows) if b_rows else None

    self_mode = run_cfg.get("reviewer_mode", "self") == "self"
    L = ["# 반복 출금 후보 평가표\n\n"]
    if self_mode:
        L.append("> **내부 평가입니다.** 규칙을 만든 사람과 정답을 판정한 사람이 같습니다. 독립 검증 결과가 아닙니다.\n\n")
    L.append("- 동결 시각: %s · 동결 지문 %s…\n" % (rec["frozen_at"], rec["digest"][:12]))
    L.append("- **무엇을 쟀나**: 과거 이체 기록에서 「사람이 판정한 월 반복 패턴」과 규칙이 얼마나 일치하는지. 앞으로의 출금을 예측하는 성능이 아니다.\n")
    L.append("- **측정 단위**: 거래 1건. 모집단은 평가용 계좌의 출금 거래 전체.\n")
    L.append("- 정밀도 85%%·재현율 70%%는 **사전 목표값**이다. 목표와 견주는 값은 동결 때 정한 **%s 점추정치**다. 아래 숫자는 이 표본의 측정값이며 안정적으로 달성했다고 단정하지 않는다. 구간과 판정 불가 비율을 함께 본다.\n" % basis)
    L.append("- 쉬운 뜻: **U** = 사람이 봐도 반복인지 모르겠는 거래. **P0** = 상대 계좌가 없는 등 규칙이 처리하지 못한 거래(사람이 R로 판정한 것만 놓침으로 센다).\n")
    L.append("- 결과는 「반복 출금 후보」에 대한 것이다. 사업 지출이나 고정비로 확정한다는 뜻이 아니다.\n")
    if prior:
        L.append("- **재채점 %d번째**. 이유: %s\n" % (len(prior) + 1, rerun_reason))
    L.append("\n## 표본\n\n")
    v = _sg([n_total - n_u, n_u], mc)
    L.append(md_table(["구분", "건수"], [["평가표본", str(n_total) if n_total >= mc else "<%d" % mc], ["판정 가능(R·N)", v[0]], ["판정 불가(U)", v[1]],
                                        ["판정 불가 비율", _pct(n_u / n_total) if n_total else ""],
                                        ["규칙이 볼 수 없는 거래(P0 층) 비율", _pct(n_p0 / n_total) if n_total else ""]]))
    L.append("\n## 판정 가능한 거래(R·N)에서의 성능\n\n")
    rows = []
    for name, m in out.items():
        p, r, f1 = m[basis]
        ci = m["ci"]
        rows.append([name + " (%s)" % basis, _pct(p), "%s ~ %s" % (_pct(ci["p"][0]), _pct(ci["p"][1])),
                     _pct(r), "%s ~ %s" % (_pct(ci["r"][0]), _pct(ci["r"][1])), _pct(f1), "%s ~ %s" % (_pct(ci["f1"][0]), _pct(ci["f1"][1]))])
    L.append(md_table(["방식", "정밀도", "참고 구간", "재현율", "참고 구간", "F1", "참고 구간"], rows))
    L.append("\n참고 구간은 계좌를 통째로 다시 뽑아(%d번, 같은 계좌의 거래는 여러 층에 걸쳐도 함께) 구한 근사값이다. 층별 추출 설계를 완전히 반영한 검증된 95%% 신뢰구간이 아니며, 정답 판정의 치우침은 이 구간이 잡아내지 못한다.\n" % iters)
    rg, bs = out["규칙"], out["단순 기준(같은 상대·여러 달)"]
    if rg[basis][2] is not None and bs[basis][2] is not None:
        L.append("\n단순 기준 대비 F1 차이: %+.1f%%p\n" % (100 * (rg[basis][2] - bs[basis][2])))
    other = "비가중" if basis == "가중" else "가중"
    L.append("\n참고, %s 값: 정밀도 %s · 재현율 %s · F1 %s\n" % ((other,) + tuple(_pct(x) for x in rg[other])))
    L.append("\n## 판정 불가(U)를 다르게 볼 때 (규칙, %s. 최악·최선의 경계가 아니라 두 가지 가정)\n\n" % basis)
    L.append(md_table(["U 처리", "정밀도", "재현율", "F1"],
                      [["U를 뺌 (본 결과)"] + [_pct(x) for x in rg[basis]],
                       ["U를 모두 반복으로"] + [_pct(x) for x in rg["u_as_R"]],
                       ["U를 모두 비반복으로"] + [_pct(x) for x in rg["u_as_N"]]]))
    L.append("\n## 오탐·미탐 유형\n\n")
    items_err = sorted(err.items())
    ev = _sg([n for _k, n in items_err], mc)
    L.append(md_table(["구분", "유형", "건수"], [[k[0], k[1], x] for (k, _n), x in zip(items_err, ev)]))
    L.append("\n## 검토 품질\n\n")
    if k_line:
        what = "같은 검토자의 재판정(자기 일치도, 독립 검증 아님)" if self_mode else "두 번째 검토자와의 일치도"
        L.append("- %s %s건: 일치율 %s, 카파 %s. 일치도가 높아도 답이 정확하다는 뜻은 아니다\n" % (
            what, k_line[0] if k_line[0] >= mc else "<%d" % mc, _pct(k_line[1]), "" if k_line[2] is None else "%.2f" % k_line[2]))
        if k_line[3]:
            mv = sorted(k_line[3].items())
            L.append("- 판정이 바뀐 방향: " + ", ".join("%s %s건" % (k, v if v >= mc else "<%d" % mc) for k, v in mv) + "\n")
        L.append("- 본 점수는 1차 판정으로 고정하고, 재판정은 위 숫자로만 보고한다\n")
    else:
        L.append("- 재판정 없음\n")
    if aux_line:
        L.append("- 보조 근거를 본 뒤 판정을 바꾼 건수: %s. 바꾼 판정으로 잰 규칙(%s): 정밀도 %s · 재현율 %s · F1 %s (참고, 본 결과 아님)\n"
                 % (((aux_line[0] if aux_line[0] >= mc or aux_line[0] == 0 else "<%d" % mc), basis) + tuple(_pct(x) for x in aux_line[1])))
    L.append("\n## 보조 결과 (평가용 계좌 전체, 채점 근거 아님)\n\n")
    va = _sg([len(a_rows), len(b_rows)], mc)
    L.append(md_table(["근거", "대상 건수", "후보로 잡힌 비율"],
                      [["A급: 납부자자동이체 정상입금과 양방향 1:1 대응", va[0], _pct(a_rate)],
                       ["B급: 자금구분 04(타행 자동이체)", va[1], _pct(b_rate)]]))
    L.append("\n## 층별 표본\n\n")
    st = sorted(Counter(it[3] for it in items).items())
    sv = _sg([n for _s, n in st], mc)
    L.append(md_table(["층", "표본"], [[s, x] for (s, _n), x in zip(st, sv)]))
    outdir = os.path.join(work_dir, "out", "반출후보")
    os.makedirs(outdir, exist_ok=True)
    with open(os.path.join(outdir, "평가표.md"), "w", encoding="utf-8") as fh:
        fh.write("".join(L))
    det = [{"review_id": f["review_id"], "row": it[0], "stratum": it[3], "cluster": it[4], "label": it[1],
            "pred": int(it[0] in pos), "base": int(it[0] in base)} for it, f in zip(items, frame)]
    write_csv(os.path.join(work_dir, "out", "내부전용", "평가_상세.csv"), det, ["review_id", "row", "stratum", "cluster", "label", "pred", "base"])
    log_event(work_dir, "evaluate", digest=rec["digest"], rerun_reason=rerun_reason, basis=basis,
              result={k: [None if x is None else round(x, 4) for x in out["규칙"][basis]] for k in ("p_r_f1",)})
    return out
