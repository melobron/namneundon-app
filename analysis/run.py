#!/usr/bin/env python3
"""D-테스트베드 분석 도구 (남는돈) 3판. 인터넷 없이 표준 파이썬만으로 돈다.

    python run.py demo                 # 가짜 샘플로 처음부터 끝까지 한 번에 (설치 확인용)
    python run.py selftest             # 자체 점검
    python run.py init                 # 처음 한 번: 분할용 솔트를 정해 둔다
    python run.py profile   --data D   # 2주차 보고용 현황
    python run.py reconcile --data D   # 원천 행 추적표 + 실제 거래 통합표
    python run.py split     --data D   # 개발 시작 때: 개발용·평가용 계좌 분리 + 평가 계좌 목록 지문
    python run.py detect    --data D   # 개발용 계좌에서 반복 출금 후보 (규칙 만들 때)
    python run.py dev-sheet --data D   # 개발용 짝 일부를 사람이 확인할 점검지 (정답 연습·선택지 비교용)
    python run.py compare   --data D   # 개발용에서 규칙 선택지 비교 (점검지가 채워져 있으면 맞음·틀림·놓침까지)
    python run.py thresholds           # 규칙 비율이 관측 달 수별로 실제 몇 달을 뜻하는지
    python run.py freeze --data D --note "..."   # 규칙·판정 지침·코드·데이터 동결 (target_basis 먼저)
    python run.py sample    --data D   # 동결 뒤에만: 평가표본 + 1차 검토지 (CTO용)
    python run.py commit-labels        # 1차 검토지 지문
    python run.py commit-labels --stage recheck   # 1차 지문 14일 뒤: 재검토 지문
    python run.py aux-review --data D  # 재검토 뒤에만: 보조 근거 검토지
    python run.py commit-labels --stage aux
    python run.py evaluate  --data D   # 한 번만 채점. 다시 돌리려면 --rerun-reason
    python run.py history              # 동결·표본·지문·채점 기록 보기
    python run.py app-check --file F   # 같은 규칙을 앱 자료(날짜,상대,출금액)로 다시 검증 (테스트베드 밖)
작업 결과는 --work 폴더(기본 work/)에 쌓인다. 반출 신청 후보는 work/out/반출후보/ 에만 둔다.
"""
import argparse
import json
import os
import secrets
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from tb import evaluation, reconcile  # noqa: E402
from tb.common import acct, load_json, md_table, path, save_json, write_csv  # noqa: E402
from tb.detect import detect, group_pairs, strip_forbidden, thresholds  # noqa: E402
from tb.load import hf_amount_buckets, load_all, profile  # noqa: E402


def is_synthetic(a):
    return os.path.exists(os.path.join(a.data, "_SYNTHETIC"))


def run_cfg_for(a):
    """demo(가짜 데이터)일 때만 솔트와 목표 기준을 임시값으로 채운다. 실제 데이터에서는 설정 파일 그대로."""
    cfg = load_json("config/run.json")
    if getattr(a, "demo", False):
        if not is_synthetic(a):
            raise SystemExit("--demo 는 가짜 샘플 데이터에서만 씁니다.")
        if cfg.get("split_salt") == "CHANGE_ME_ONCE":
            cfg["split_salt"] = "DEMO-ONLY"
        cfg["target_basis"] = cfg.get("target_basis") or "가중"
    elif cfg.get("split_salt") in ("", "CHANGE_ME_ONCE"):
        cfg["_no_salt"] = True
    return cfg


def need_salt(cfg):
    if cfg.get("_no_salt"):
        raise SystemExit("분할용 솔트가 아직 없습니다. 처음 한 번 `python run.py init` 을 실행하세요.")
    return cfg["split_salt"]


def prepare(a):
    data, meta = load_all(a.data, limit=a.limit)
    if "HF_TRNS_TRAN" not in data:
        raise SystemExit("이체내역(HF_TRNS_TRAN) 파일을 찾지 못했습니다: %s" % a.data)
    cfg = run_cfg_for(a)
    rows, ledger = reconcile.run(data, cfg)
    applied = {x.row for x in rows if x.table == "HF_TRNS_TRAN" and x.status == reconcile.APPLIED}
    hf = data["HF_TRNS_TRAN"]
    hf_applied = [r for r in hf if r["_row"] in applied]
    buckets = hf_amount_buckets(data, cfg)
    # A급: 납부자자동이체 정상입금이 이체내역과 양방향 1:1 로 대응된 이체 행
    a_rows = {int(x.link.split(":")[1]) for x in rows if x.table == "GR_NJ_TRAN" and x.link.startswith("HF:") and "1:1" in x.reason}
    aux = {"A": a_rows, "B": {r["_row"] for r in hf if (r.get("fnd_type") or "") == "04"}}
    return {"data": data, "meta": meta, "cfg": cfg, "rows": rows, "ledger": ledger, "hf": hf,
            "applied": applied, "hf_applied": hf_applied, "buckets": buckets, "aux": aux}


def cmd_init(a):
    cfg = load_json("config/run.json")
    if cfg.get("split_salt") not in ("", "CHANGE_ME_ONCE"):
        print("이미 솔트가 정해져 있습니다. 바꾸면 개발용·평가용 분리가 달라지므로 바꾸지 않습니다.")
        return
    cfg["split_salt"] = secrets.token_hex(16)
    save_json("config/run.json", cfg)
    print("분할용 솔트를 정했습니다. 이제 이 값은 바꾸지 않습니다.")


def cmd_make_sample(a):
    from tb.sample_data import make
    counts = make(a.data)
    print("가짜 샘플을 만들었습니다:", a.data)
    for t, n in counts.items():
        print("  %-14s %7d 줄" % (t, n))


def cmd_profile(a):
    data, meta = load_all(a.data, limit=a.limit)
    p = profile(data, meta)
    out = os.path.join(a.work, "out", "반출후보")
    os.makedirs(out, exist_ok=True)
    with open(os.path.join(out, "2주차_현황.json"), "w", encoding="utf-8") as f:
        json.dump(p, f, ensure_ascii=False, indent=2)
    rows = [[t, v["file"] or "없음", v["rows"], v["date_min"], v["date_max"], v["months"], v["date_missing"], ",".join(v["missing_columns"])]
            for t, v in p["tables"].items()]
    md = "# 2주차 현황\n\n" + md_table(["표", "파일", "행", "첫 날짜", "끝 날짜", "달 수", "날짜 빠짐", "없는 컬럼"], rows)
    md += "\n| 항목 | 값 |\n|---|---|\n"
    for k in ("payer_accounts", "payer_months_median", "payer_months_ge6_ratio", "hf_fnd04_ratio", "hf_amount_values",
              "nj_ok_rows", "nj_link_unique_ratio", "nj_link_multi_ratio", "nj_link_none_ratio"):
        if k in p:
            md += "| %s | %s |\n" % (k, p[k])
    md += "\n금액 값(범주화) 목록 앞부분: %s\n" % ", ".join(str(x[0]) for x in p.get("hf_amount_top", [])[:20])
    with open(os.path.join(out, "2주차_현황.md"), "w", encoding="utf-8") as f:
        f.write(md)
    print(md)


def cmd_reconcile(a):
    P = prepare(a)
    mc = P["cfg"]["min_cell"]
    tables, detail, ok = reconcile.summary(P["data"], P["rows"], mc)
    md = "# 원천 거래 추적표\n\n"
    md += "모든 원천 행은 반영·제외·미해결 중 한 곳에만 들어간다. 명세로 확정되지 않은 것은 성공으로도 실패로도 보지 않고 미해결로 둔다.\n"
    md += "작은 칸은 가리고, 합계에서 거꾸로 계산되지 않도록 짝이 되는 칸도 함께 가린다.\n\n"
    md += md_table(["표", "입력", "반영", "제외", "미해결", "검산"], tables)
    md += "\n## 사유별\n\n" + md_table(["표", "구분", "사유", "건수"], detail)
    md += "\n## 실제 거래 통합표\n\n돈이 실제로 움직였다고 볼 수 있는 것만 한 번씩 센다. 「명세 근거 추정」은 명세 설명에 기대어 성공으로 본 것이라 따로 센다.\n\n"
    md += md_table(["원천 표", "방향", "근거", "건수"], reconcile.unified(P["ledger"], mc))
    md += "\n전체 검산: %s\n" % ("맞음" if ok else "안 맞음")
    out = os.path.join(a.work, "out")
    os.makedirs(os.path.join(out, "반출후보"), exist_ok=True)
    with open(os.path.join(out, "반출후보", "추적표.md"), "w", encoding="utf-8") as f:
        f.write(md)
    write_csv(os.path.join(out, "내부전용", "행별상태.csv"),
              [{"table": x.table, "row": x.row, "status": x.status, "reason": x.reason, "flags": "|".join(x.flags), "link": x.link, "kind": x.kind} for x in P["rows"]],
              ["table", "row", "status", "reason", "flags", "link", "kind"])
    agg = reconcile.account_month(P["ledger"])
    write_csv(os.path.join(out, "내부전용", "계좌월집계.csv"),
              [{"account": k[0], "yyyymm": k[1], "in_n": v[0], "in_amt": v[1], "out_n": v[2], "out_amt": v[3], "estimated_n": v[4]} for k, v in sorted(agg.items())],
              ["account", "yyyymm", "in_n", "in_amt", "out_n", "out_amt", "estimated_n"])
    print(md)
    if not ok:
        raise SystemExit(1)


def _split(P):
    return evaluation.split_accounts(P["hf"], need_salt(P["cfg"]), P["cfg"]["eval_ratio"])


def cmd_split(a):
    P = prepare(a)
    sp = _split(P)
    write_csv(os.path.join(a.work, "split", "accounts.csv"),
              [{"account": x, "split": k} for k in ("dev", "eval") for x in sorted(sp[k])], ["account", "split"])
    rec, new = evaluation.record_split(a.work, P["cfg"]["split_salt"], sp, note=a.note)
    print("출금 계좌 %d개 → 개발용 %d · 평가용 %d" % (len(sp["dev"]) + len(sp["eval"]), len(sp["dev"]), len(sp["eval"])))
    print(("평가 계좌 목록 지문을 기록했습니다: %s… (%s)" if new else "처음 기록한 분리와 같습니다: %s… (%s)") % (rec["eval_list_sha256"][:16], rec["recorded_at"]))


def cmd_detect(a):
    P = prepare(a)
    sp = _split(P)
    params = load_json("config/params.json")
    pos, info, _pairs = detect(P["hf_applied"], params, P["buckets"], payer_filter=sp["dev"])
    reasons = {}
    for v in info.values():
        reasons[v["reason"]] = reasons.get(v["reason"], 0) + 1
    fields = ["payer", "payee", "candidate", "reason", "n", "months", "median_per_month", "bundles", "anchor", "type",
              "on_schedule_ratio", "regular_gap_ratio", "missing_month_ratio", "amount_stable_ratio", "dropped"]
    out_rows = []
    for k, v in info.items():
        f = dict(v["feat"])
        f["dropped"] = " / ".join("%s: %s" % (r, ",".join(str(x) for x in rows)) for r, rows in f.get("dropped", []))
        out_rows.append(dict({"payer": k[0], "payee": k[1], "candidate": v["candidate"], "reason": v["reason"]}, **f))
    write_csv(os.path.join(a.work, "out", "내부전용", "후보_개발용.csv"), out_rows, fields)
    print("개발용 계좌만 봤습니다. 짝 %d개 중 후보 %d개, 후보 거래 %d건" % (len(info), sum(1 for v in info.values() if v["candidate"]), len(pos)))
    for k, v in sorted(reasons.items(), key=lambda x: -x[1]):
        print("  %-28s %d" % (k, v))


def cmd_dev_sheet(a):
    """개발용 계좌에서 짝을 무작위로 골라 사람이 R·N·U를 적는 점검지. 개발용이므로 규칙을 고치는 데 써도 된다."""
    import random
    from tb.common import ym
    P = prepare(a)
    sp = _split(P)
    f = os.path.join(a.work, "dev_check", "dev_sheet.csv")
    if os.path.exists(f):
        raise SystemExit("점검지가 이미 있습니다: %s (채운 내용을 덮어쓰지 않습니다)" % f)
    pairs = group_pairs(strip_forbidden(P["hf_applied"]))
    keys = sorted(k for k, v in pairs.items() if k[0] in sp["dev"] and len({ym(d) for d, _a, _r in v}) >= 3)
    rng = random.Random(P["cfg"]["random_seed"] + 7)
    pick = rng.sample(keys, min(a.n or 60, len(keys)))
    lines = []
    for i, k in enumerate(pick):
        for d, amt, row in pairs[k]:
            lines.append({"짝": "개발짝%04d" % (i + 1), "row": row, "날짜": d.isoformat(), "금액(범주)": amt, "판정(R/N/U)": "", "메모": ""})
    write_csv(f, lines, ["짝", "row", "날짜", "금액(범주)", "판정(R/N/U)", "메모"])
    print("개발용 짝 %d개, 거래 %d줄 점검지를 만들었습니다: %s" % (len(pick), len(lines), f))
    print("줄마다 R(반복 흐름의 한 번)·N·U를 적으면 compare가 선택지별 맞음·틀림·놓침을 셉니다.")


def cmd_compare(a):
    """개발용 계좌에서 규칙 선택지를 바꿔 가며 비교한다. 후보가 많다고 더 정확한 것은 아니므로,
    개발용 점검지가 채워져 있으면 사람이 확인한 맞음·틀림·놓침도 함께 센다. 선택 이유는 문서에 남긴다."""
    from tb.common import read_csv
    P = prepare(a)
    sp = _split(P)
    base = load_json("config/params.json")
    labels = {}
    f = os.path.join(a.work, "dev_check", "dev_sheet.csv")
    if os.path.exists(f):
        for x in read_csv(f):
            lab = (x.get("판정(R/N/U)") or "").strip().upper()
            if lab in ("R", "N"):
                labels[int(x["row"])] = lab
    variants = [("지금 설정", {}), ("금액 변동 후보 켬", {"allow_variable_amount": True}), ("묶음 1개만", {"max_bundles": 1}),
                ("말일 기준 끔", {"month_end_mode": False}), ("매주 판정 기준 4건", {"weekly_median_per_month": 4})]
    rows = []
    for name, over in variants:
        params = dict(base, **over)
        pos, info, _p = detect(P["hf_applied"], params, P["buckets"], payer_filter=sp["dev"])
        cand = [v for v in info.values() if v["candidate"]]
        r = [name, len(cand), len(pos), sum(1 for v in cand if v["feat"].get("bundles", 1) > 1),
             sum(1 for v in cand if v["feat"].get("anchor") == "말일"), sum(1 for v in cand if v["feat"].get("type") == "변동 금액")]
        if labels:
            tp = sum(1 for k, v in labels.items() if v == "R" and k in pos)
            fp = sum(1 for k, v in labels.items() if v == "N" and k in pos)
            fn = sum(1 for k, v in labels.items() if v == "R" and k not in pos)
            r += [tp, fp, fn]
        rows.append(r)
    head = ["선택지", "후보 짝", "후보 거래", "묶음 2개 짝", "말일 기준 짝", "변동 금액 짝"]
    if labels:
        head += ["맞음(R을 잡음)", "틀림(N을 잡음)", "놓침(R을 못 잡음)"]
    md = "# 개발용 규칙 선택지 비교\n\n" + md_table(head, rows)
    md += ("\n점검지에서 사람이 판정한 거래 %d건 기준. 개발용이므로 이 숫자는 평가 성능이 아니다.\n" % len(labels)) if labels else \
          "\n점검지(dev-sheet)가 비어 있어 후보 규모만 보였다. 후보가 많다고 더 정확한 것은 아니다.\n"
    md += "고른 선택지와 이유를 문서에 남긴 뒤 동결한다.\n"
    os.makedirs(os.path.join(a.work, "out", "내부전용"), exist_ok=True)
    with open(os.path.join(a.work, "out", "내부전용", "규칙_선택지_비교.md"), "w", encoding="utf-8") as fh:
        fh.write(md)
    print(md)


def cmd_thresholds(a):
    t = thresholds(load_json("config/params.json"))
    md = "# 규칙 숫자를 달 수로 풀어 쓴 표\n\n" + md_table(list(t[0].keys()), [list(x.values()) for x in t])
    os.makedirs(os.path.join(a.work, "out", "반출후보"), exist_ok=True)
    with open(os.path.join(a.work, "out", "반출후보", "규칙_달수표.md"), "w", encoding="utf-8") as f:
        f.write(md)
    print(md)


def cmd_freeze(a):
    cfg = run_cfg_for(a)
    need_salt(cfg)
    rec = evaluation.freeze(a.work, cfg, a.data, note=a.note)
    print("동결했습니다: %s… (%s). 규칙 숫자·설정·판정 지침·코드 %d개·데이터 파일 %d개의 지문을 남겼습니다."
          % (rec["digest"][:16], rec["frozen_at"], len(rec["fingerprint"]["code_config"]), len(rec["fingerprint"]["data"])))


def cmd_sample(a):
    P = prepare(a)
    sp = _split(P)
    frame, strata, n2 = evaluation.draw_sample(P["hf"], P["applied"], sp["eval"], P["cfg"], a.data, a.work)
    print("평가표본 %d건을 뽑았습니다 (층 %d개, 두 번째 검토자 몫 %d건). 검토지: %s"
          % (len(frame), len(strata), n2, os.path.join(a.work, "eval_private", "review_sheet.csv")))
    print("검토지에는 예측도, 보조 근거도 실려 있지 않습니다. CTO가 ★ 줄에 R·N·U를 적습니다.")


def cmd_simulate_review(a):
    """가짜 데이터 전용 연습: 정답표로 검토지를 채운다. 두 번째 검토자는 가끔 다르게, 보조 근거 단계는 몇 건만 바꾼다."""
    if not is_synthetic(a):
        raise SystemExit("가짜 샘플 데이터에서만 쓸 수 있습니다. 실제 데이터의 정답은 CTO가 직접 적습니다.")
    import random
    from tb.common import read_csv
    rng = random.Random(3)
    truth = {int(t["row"]): t["label"] for t in read_csv(os.path.join(a.data, "_truth.csv"))}
    priv = os.path.join(a.work, "eval_private")
    frame = {f["review_id"]: int(f["row"]) for f in read_csv(os.path.join(priv, "sample_frame.csv"))}
    stage = getattr(a, "stage", "1")
    if stage == "recheck":
        f = os.path.join(priv, "review_sheet_recheck.csv")
        qmap = {x["q"]: x["review_id"] for x in read_csv(os.path.join(priv, "recheck_map.csv"))}
        lines = read_csv(f)
        for x in lines:
            if x["대상"] == "★":
                lab = truth.get(frame[qmap[x["review_id"]]], "N")
                if rng.random() < 0.08:
                    lab = rng.choice(["R", "N", "U"])
                x["판정(R/N/U)"], x["근거메모"] = lab, "가짜 데이터 자동 재판정"
        write_csv(f, lines, list(lines[0].keys()))
        print("가짜 정답으로 재검토지를 채웠습니다 (연습용, 8%는 일부러 다르게).")
        return
    if stage == "aux":
        f = os.path.join(priv, "review_sheet_aux.csv")
        lines = read_csv(f)
        for x in lines:
            if x["1차판정"] == "U" and rng.random() < 0.3:
                x["최종판정(R/N/U)"], x["바꾼이유"] = truth.get(frame[x["review_id"]], "N"), "보조 근거로 판단 가능(연습)"
        write_csv(f, lines, list(lines[0].keys()))
        print("가짜 정답으로 보조 근거 검토지를 채웠습니다 (연습용).")
        return
    for name, noise in (("review_sheet.csv", 0.0),):
        f = os.path.join(priv, name)
        if not os.path.exists(f):
            continue
        lines = read_csv(f)
        for x in lines:
            if x["대상"] == "★":
                lab = truth.get(frame[x["review_id"]], "N")
                if rng.random() < noise:
                    lab = rng.choice(["R", "N", "U"])
                x["판정(R/N/U)"], x["근거메모"] = lab, "가짜 데이터 자동 판정"
        write_csv(f, lines, list(lines[0].keys()))
    print("가짜 정답으로 1차 검토지를 채웠습니다 (연습용).")


def cmd_commit(a):
    cfg = run_cfg_for(a)
    rec = evaluation.commit_labels(a.work, stage=a.stage, min_days=cfg.get("recheck_min_days", 14), allow_early=getattr(a, "demo", False))
    for k, v in rec.items():
        if k != "at":
            print("지문 %s: %s" % (k, v))
    print("이 지문을 팀 기록에 남기세요. 채점 때 검토지가 바뀌었으면 멈춥니다.")


def cmd_aux_review(a):
    P = prepare(a)
    n = evaluation.aux_sheet(a.work, {r["_row"]: r for r in P["hf"]}, P["aux"])
    print("보조 근거 검토지 %d줄을 만들었습니다: %s" % (n, os.path.join(a.work, "eval_private", "review_sheet_aux.csv")))
    print("판정을 바꾸면 바꾼이유를 꼭 적습니다. 끝나면 commit-labels --stage aux")


def cmd_evaluate(a):
    P = prepare(a)
    sp = _split(P)
    P["aux"]["eval_rows"] = {r["_row"] for r in P["hf_applied"] if acct(r.get("wd_fc"), r.get("wd_ac")) in sp["eval"]}
    params = load_json("config/params.json")
    pairs = group_pairs(strip_forbidden(P["hf_applied"]))
    evaluation.evaluate(P["hf_applied"], pairs, params, P["buckets"], sp["eval"], P["cfg"], a.data, a.work, P["aux"], rerun_reason=a.rerun_reason)
    f = os.path.join(a.work, "out", "반출후보", "평가표.md")
    if is_synthetic(a):
        body = open(f, encoding="utf-8").read()
        body = body.replace("# 반복 출금 후보 평가표\n", "# 반복 출금 후보 평가표\n\n> **가짜 샘플 데이터로 돌린 결과입니다. 숫자는 도구가 끝까지 도는지 확인하는 용도이고 아무 의미가 없습니다.**\n", 1)
        open(f, "w", encoding="utf-8").write(body)
    print(open(f, encoding="utf-8").read())


def cmd_history(a):
    for h in evaluation.history(a.work):
        print(json.dumps(h, ensure_ascii=False))


def _fill_dev_sheet_demo(a):
    from tb.common import read_csv
    truth = {int(t["row"]): t["label"] for t in read_csv(os.path.join(a.data, "_truth.csv"))}
    f = os.path.join(a.work, "dev_check", "dev_sheet.csv")
    lines = read_csv(f)
    for x in lines:
        x["판정(R/N/U)"] = truth.get(int(x["row"]), "N")
    write_csv(f, lines, list(lines[0].keys()))


def cmd_demo(a):
    a.data = a.data if a.data != "data" else os.path.join("data", "sample")
    a.work = a.work if a.work != "work" else "work_demo"
    a.demo = True
    import shutil
    shutil.rmtree(a.work, ignore_errors=True)
    print("== 1. 가짜 샘플 만들기"); cmd_make_sample(a)
    print("\n== 2. 2주차 현황"); cmd_profile(a)
    print("\n== 3. 전량 추적"); cmd_reconcile(a)
    a.note = "demo"
    print("\n== 4. 개발용·평가용 분리 (평가 계좌 목록 지문)"); cmd_split(a)
    print("\n== 5. 개발용에서 후보 탐지"); cmd_detect(a)
    print("\n== 6. 개발용 점검지 (연습: 가짜 정답으로 채움)"); cmd_dev_sheet(a); _fill_dev_sheet_demo(a)
    print("\n== 6-2. 개발용 규칙 선택지 비교"); cmd_compare(a)
    print("\n== 7. 규칙 달수표"); cmd_thresholds(a)
    print("\n== 8. 동결 (표본보다 먼저)"); cmd_freeze(a)
    print("\n== 9. 평가표본"); cmd_sample(a)
    a.stage = "1"
    print("\n== 10. (연습) 1차 검토 채우기"); cmd_simulate_review(a)
    print("\n== 11. 1차 지문"); cmd_commit(a)
    a.stage = "recheck"
    print("\n== 12. (연습) 재검토. 실제로는 1차 지문 14일 뒤"); cmd_simulate_review(a); cmd_commit(a)
    print("\n== 13. 보조 근거 검토지"); cmd_aux_review(a)
    a.stage = "aux"
    cmd_simulate_review(a)
    print("\n== 14. 보조 근거 지문"); cmd_commit(a)
    print("\n== 15. 채점"); cmd_evaluate(a)
    print("\n끝. 결과 폴더:", a.work)


def cmd_app_check(a):
    from tb.app_adapter import check
    if not a.file:
        raise SystemExit("--file 로 세 칸짜리 CSV(날짜, 상대, 출금액)를 주세요.")
    params = load_json("config/params.json")
    rows, pos, info = check(a.file, params)
    out = [{"상대": k[1], "후보": "예" if v["candidate"] else "", "이유": v["reason"], "건수": v["feat"]["n"], "달수": v["feat"]["months"],
            "유형": v["feat"].get("type", "")} for k, v in sorted(info.items(), key=lambda x: (not x[1]["candidate"], x[0][1]))]
    write_csv(os.path.join(a.work, "app_check", "후보.csv"), out, ["상대", "후보", "이유", "건수", "달수", "유형"])
    print("앱 자료 %d건, 상대 %d곳 중 반복 출금 후보 %d곳 (후보 거래 %d건)" % (len(rows), len(info), sum(1 for v in info.values() if v["candidate"]), len(pos)))
    print("결과:", os.path.join(a.work, "app_check", "후보.csv"), "  ※ 후보일 뿐, 사업 지출·고정비로 확정하지 않습니다.")


def cmd_selftest(a):
    import unittest
    suite = unittest.defaultTestLoader.discover(path("tests"))
    r = unittest.TextTestRunner(verbosity=2).run(suite)
    raise SystemExit(0 if r.wasSuccessful() else 1)


CMDS = {"demo": cmd_demo, "init": cmd_init, "make-sample": cmd_make_sample, "profile": cmd_profile, "reconcile": cmd_reconcile,
        "split": cmd_split, "detect": cmd_detect, "dev-sheet": cmd_dev_sheet, "compare": cmd_compare, "thresholds": cmd_thresholds, "freeze": cmd_freeze, "sample": cmd_sample,
        "simulate-review": cmd_simulate_review, "commit-labels": cmd_commit, "aux-review": cmd_aux_review, "evaluate": cmd_evaluate,
        "history": cmd_history, "app-check": cmd_app_check, "selftest": cmd_selftest}


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("cmd", choices=list(CMDS))
    ap.add_argument("--data", default="data", help="데이터 폴더 (테이블 이름이 들어간 csv/txt 파일들)")
    ap.add_argument("--work", default="work", help="결과 폴더")
    ap.add_argument("--limit", type=int, default=None, help="표마다 앞에서 N줄만 (시험용)")
    ap.add_argument("--note", default="", help="분할·동결 메모")
    ap.add_argument("--stage", default="1", choices=["1", "recheck", "aux"], help="commit-labels 단계")
    ap.add_argument("--rerun-reason", default="", help="evaluate를 다시 돌리는 이유 (기록에 남음)")
    ap.add_argument("--file", default="", help="app-check용 세 칸 CSV")
    ap.add_argument("--n", type=int, default=0, help="dev-sheet 짝 수 (기본 60)")
    ap.add_argument("--demo", action="store_true", help=argparse.SUPPRESS)
    a = ap.parse_args(argv)
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    CMDS[a.cmd](a)


if __name__ == "__main__":
    main()
