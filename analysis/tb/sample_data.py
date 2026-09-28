"""가짜 샘플 데이터 만들기.

금결원 명세서의 컬럼 이름과 코드 그대로, 실존하지 않는 계좌로 만든다.
실제 데이터가 들어오기 전에 파이프라인 전체가 끝까지 도는지 확인하는 용도다.
정답표(_truth.csv)는 가짜 데이터에만 있다. 실제 데이터의 정답은 CTO의 독립 검토로만 만든다.
"""
import calendar
import datetime as dt
import os
import random

from .common import write_csv

BUCKETS = [10000, 30000, 50000, 100000, 200000, 300000, 500000, 700000,
           1000000, 1500000, 2000000, 3000000, 5000000, 10000000]
COLS = {
    "HF_TRNS_TRAN": ["TRAN_DT", "TRAN_TMRG", "WD_FC_SN", "WD_AC_SN", "DPS_FC_SN", "DPS_AC_SN", "TRAN_AMT", "MD_TYPE", "FND_TYPE", "FF_SP_AI"],
    "CD_TRNS_TRAN": ["TRAN_DT", "TRAN_TMRG", "ATM_SN", "HDL_FC_SN", "WD_FC_SN", "PAY_AC_SN", "DPS_FC_SN", "DPS_AC_SN", "TRAN_CODE", "TRAN_AMT", "FEE", "FF_SP_AI"],
    "OB_TRNS_TRAN": ["TRAN_DT", "TRAN_TMRG", "API_ID", "TRNS_CODE", "UO_NAME", "FC_SN", "AC_SN", "TRNS_AMT", "UO_FC_SN", "UO_AC_SN"],
    "OB_INQR_TRAN": ["TRAN_DT", "TRAN_TMRG", "API_ID", "INQR_CODE", "UO_NAME", "FC_SN", "AC_SN", "INQR_BLNC_AMT"],
    "PI_WD_LEDG": ["FC_SN", "AC_SN", "UO_SN", "PYR_SN", "SVC_KIND", "AGE_RNGE", "GNDR"],
    "GR_JC_TRAN": ["TRAN_DT", "FC_SN", "AC_SN", "UO_SN", "PYR_SN", "CHRG_AMT", "RSLT_CODE", "AMT"],
    "GR_NJ_TRAN": ["TRAN_DT", "DPS_FC_SN", "DPS_AC_SN", "AMT", "WD_FC_SN", "WD_AC_SN", "RSLT_CODE"],
    "CMS_REQ_TRAN": ["TRAN_DT", "FC_SN", "AC_SN", "UO_SN", "PYR_SN", "WD_REQ_AMT", "FND_KIND", "WD_SHP"],
    "CMS_RES_TRAN": ["TRAN_DT", "FC_SN", "AC_SN", "UO_SN", "PYR_SN", "WD_INBL_AMT", "WD_YN", "WD_INBL_CD", "FND_KIND", "WD_SHP"],
}


def _d(y, m, day):
    last = calendar.monthrange(y, m)[1]
    return dt.date(y, m, min(day, last))


def _months(start_y, start_m, n):
    y, m = start_y, start_m
    for _ in range(n):
        yield y, m
        m += 1
        if m == 13:
            y, m = y + 1, 1


def _acct(rng, prefix="2000000"):
    return str(rng.randint(101, 170)), prefix + "%09d" % rng.randint(1, 999999999)


def make(out_dir, seed=7, n_payers=400):
    rng = random.Random(seed)
    os.makedirs(out_dir, exist_ok=True)
    rows = {t: [] for t in COLS}
    truth = []
    payees = [_acct(rng) for _ in range(300)]
    others = [_acct(rng) for _ in range(500)]

    def hf(date, wd, dps, amt, fnd="00", md=None, label=None, kind=""):
        rows["HF_TRNS_TRAN"].append({
            "TRAN_DT": date.strftime("%Y%m%d"), "TRAN_TMRG": rng.choice(["09", "12", "15", "18", "21"]),
            "WD_FC_SN": wd[0], "WD_AC_SN": wd[1], "DPS_FC_SN": dps[0], "DPS_AC_SN": dps[1],
            "TRAN_AMT": amt, "MD_TYPE": md or rng.choice(["02", "04", "04", "07"]), "FND_TYPE": fnd, "FF_SP_AI": ""})
        if label:
            truth.append({"row": len(rows["HF_TRNS_TRAN"]), "label": label, "kind": kind})

    for _ in range(n_payers):
        payer = _acct(rng)
        start = (rng.choice([2024, 2025]), rng.randint(1, 12))
        if start[0] == 2025 and start[1] > 8:
            start = (2025, 8)
        n_month = rng.randint(4, 24)
        months = list(_months(start[0], start[1], n_month))
        months = [x for x in months if x <= (2025, 12)]
        # 월 반복 출금
        for _k in range(rng.choice([0, 1, 2, 2, 3, 4, 5])):
            payee = rng.choice(payees)
            day = rng.randint(1, 28)
            b = rng.randint(2, 11)
            varies = rng.random() < 0.4
            fnd = "04" if rng.random() < 0.6 else "00"
            stop_at = len(months) if rng.random() < 0.8 else rng.randint(2, len(months))
            for i, (y, m) in enumerate(months[:stop_at]):
                if rng.random() < 0.08:
                    continue
                shift = 0 if rng.random() < 0.7 else rng.choice([-2, -1, 1, 2, 3])
                date = _d(y, m, day) + dt.timedelta(days=shift)
                bb = min(max(b + (rng.choice([-1, 0, 1]) if varies else 0), 0), len(BUCKETS) - 1)
                hf(date, payer, payee, BUCKETS[bb], fnd=fnd, label="R", kind="monthly")
                if fnd == "04" and rng.random() < 0.5:
                    rows["GR_NJ_TRAN"].append({"TRAN_DT": date.strftime("%Y%m%d"), "DPS_FC_SN": payee[0], "DPS_AC_SN": payee[1],
                                               "AMT": BUCKETS[bb], "WD_FC_SN": payer[0], "WD_AC_SN": payer[1], "RSLT_CODE": "00"})
                if i == 0 and rng.random() < 0.15:  # 첫 달에 보증금 같은 한 번짜리 추가
                    hf(date + dt.timedelta(days=rng.randint(0, 5)), payer, payee, BUCKETS[min(bb + 3, len(BUCKETS) - 1)], label="N", kind="extra_same_payee")
        # 매주 반복 (월 단위 반복이 아님)
        if rng.random() < 0.15:
            payee = rng.choice(payees)
            d0 = _d(*months[0], 1)
            end = _d(*months[-1], 28)
            b = rng.randint(1, 5)
            while d0 <= end:
                hf(d0, payer, payee, BUCKETS[b], label="N", kind="weekly")
                d0 += dt.timedelta(days=7)
        # 불규칙 거래처 (같은 상대에게 들쭉날쭉)
        for _k in range(rng.randint(0, 2)):
            payee = rng.choice(payees)
            for _j in range(rng.randint(2, 8)):
                y, m = rng.choice(months)
                hf(_d(y, m, rng.randint(1, 28)), payer, payee, BUCKETS[rng.randint(1, 9)], label="N", kind="irregular")
        # 한 번짜리 출금
        for _k in range(rng.randint(3, 25)):
            y, m = rng.choice(months)
            hf(_d(y, m, rng.randint(1, 28)), payer, rng.choice(others), BUCKETS[rng.randint(0, 10)], label="N", kind="oneoff")
        # 들어오는 돈 (다른 계좌의 출금)
        for _k in range(rng.randint(5, 30)):
            y, m = rng.choice(months)
            hf(_d(y, m, rng.randint(1, 28)), rng.choice(others), payer, BUCKETS[rng.randint(0, 10)])
        # CD/ATM
        for _k in range(rng.randint(0, 6)):
            y, m = rng.choice(months)
            code = rng.choice(["010000", "010100", "310000", "400020", "500000"])
            rows["CD_TRNS_TRAN"].append({"TRAN_DT": _d(y, m, rng.randint(1, 28)).strftime("%Y%m%d"), "TRAN_TMRG": "15",
                                         "ATM_SN": "8000000000000%05d" % rng.randint(1, 99999), "HDL_FC_SN": str(rng.randint(101, 170)),
                                         "WD_FC_SN": payer[0] if code != "500000" else "", "PAY_AC_SN": payer[1] if code != "500000" else "",
                                         "DPS_FC_SN": payer[0] if code == "500000" else (rng.choice(others)[0] if code == "400020" else ""),
                                         "DPS_AC_SN": payer[1] if code == "500000" else (rng.choice(others)[1] if code == "400020" else ""),
                                         "TRAN_CODE": code, "TRAN_AMT": 0 if code == "310000" else BUCKETS[rng.randint(0, 5)], "FEE": 0, "FF_SP_AI": ""})
        # 오픈뱅킹
        for _k in range(rng.randint(0, 3)):
            y, m = rng.choice(months)
            uo = rng.choice(others)
            rows["OB_TRNS_TRAN"].append({"TRAN_DT": _d(y, m, rng.randint(1, 28)).strftime("%Y%m%d"), "TRAN_TMRG": "12", "API_ID": "100006",
                                         "TRNS_CODE": rng.choice(["WD", "DP"]), "UO_NAME": "O가O업", "FC_SN": payer[0], "AC_SN": payer[1],
                                         "TRNS_AMT": BUCKETS[rng.randint(0, 6)], "UO_FC_SN": uo[0], "UO_AC_SN": uo[1]})
            rows["OB_INQR_TRAN"].append({"TRAN_DT": _d(y, m, rng.randint(1, 28)).strftime("%Y%m%d"), "TRAN_TMRG": "12", "API_ID": "100002",
                                         "INQR_CODE": "1", "UO_NAME": "O가O업", "FC_SN": payer[0], "AC_SN": payer[1],
                                         "INQR_BLNC_AMT": BUCKETS[rng.randint(0, 9)]})
        # 자동이체 청구·CMS (이용기관 기준)
        if rng.random() < 0.5:
            uo, pyr = "30000%05d" % rng.randint(1, 99999), "400000000000%08d" % rng.randint(1, 99999999)
            rows["PI_WD_LEDG"].append({"FC_SN": payer[0], "AC_SN": payer[1], "UO_SN": uo, "PYR_SN": pyr,
                                       "SVC_KIND": rng.choice(["1", "2", "3", "5"]), "AGE_RNGE": rng.choice(["30", "40", "50"]), "GNDR": rng.choice(["1", "2"])})
            day = rng.randint(5, 25)
            for (y, m) in months:
                amt = BUCKETS[rng.randint(1, 5)]
                r = rng.random()
                if r < 0.5:
                    rows["GR_JC_TRAN"].append({"TRAN_DT": _d(y, m, day).strftime("%Y%m%d"), "FC_SN": payer[0], "AC_SN": payer[1], "UO_SN": uo, "PYR_SN": pyr,
                                               "CHRG_AMT": amt, "RSLT_CODE": rng.choice(["", "", "", "01", "09"]), "AMT": 0})
                else:
                    rows["CMS_REQ_TRAN"].append({"TRAN_DT": _d(y, m, day).strftime("%Y%m%d"), "FC_SN": payer[0], "AC_SN": payer[1], "UO_SN": uo, "PYR_SN": pyr,
                                                 "WD_REQ_AMT": amt, "FND_KIND": "HB", "WD_SHP": "1"})
                    if rng.random() < 0.1:
                        rows["CMS_RES_TRAN"].append({"TRAN_DT": _d(y, m, day).strftime("%Y%m%d"), "FC_SN": payer[0], "AC_SN": payer[1], "UO_SN": uo, "PYR_SN": pyr,
                                                     "WD_INBL_AMT": amt, "WD_YN": "N", "WD_INBL_CD": "0021", "FND_KIND": "HB", "WD_SHP": "1"})
    # 실패한 납부자자동이체 (이체내역에는 없음)
    for _k in range(30):
        a, b = rng.choice(others), rng.choice(payees)
        rows["GR_NJ_TRAN"].append({"TRAN_DT": "2025%02d15" % rng.randint(1, 12), "DPS_FC_SN": b[0], "DPS_AC_SN": b[1], "AMT": 100000,
                                   "WD_FC_SN": a[0], "WD_AC_SN": a[1], "RSLT_CODE": rng.choice(["11", "12", "90"])})
    # 검산이 잡아야 하는 예외: 날짜 빠짐, 자기 계좌 이체, 똑같은 줄
    hf_rows = rows["HF_TRNS_TRAN"]
    for i in rng.sample(range(len(hf_rows)), 3):
        hf_rows[i]["TRAN_DT"] = ""
    a = rng.choice(others)
    for _k in range(2):
        hf_rows.append({"TRAN_DT": "20250310", "TRAN_TMRG": "09", "WD_FC_SN": a[0], "WD_AC_SN": a[1], "DPS_FC_SN": a[0], "DPS_AC_SN": a[1],
                        "TRAN_AMT": 100000, "MD_TYPE": "02", "FND_TYPE": "00", "FF_SP_AI": ""})
    for i in rng.sample(range(len(hf_rows)), 5):
        hf_rows.append(dict(hf_rows[i]))
    # 날짜가 빠진 줄은 정답표에서 판정불가로 바꾼다
    blank = {i + 1 for i, r in enumerate(hf_rows) if not r["TRAN_DT"]}
    for t in truth:
        if t["row"] in blank:
            t["label"] = "U"
    for t in truth:  # 검토자도 3%쯤은 판정을 못 내린다고 가정
        if rng.random() < 0.03:
            t["label"] = "U"

    for t, cols in COLS.items():
        write_csv(os.path.join(out_dir, t + ".csv"), rows[t], cols)
    write_csv(os.path.join(out_dir, "_truth.csv"), truth, ["row", "label", "kind"])
    with open(os.path.join(out_dir, "_SYNTHETIC"), "w", encoding="utf-8") as f:
        f.write("가짜 샘플 데이터입니다. 실제 계좌가 아닙니다.\n")
    return {t: len(v) for t, v in rows.items()}
