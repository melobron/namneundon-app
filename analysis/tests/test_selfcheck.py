"""자체 점검 (3판 보완). python run.py selftest"""
import datetime as dt
import os
import shutil
import sys
import tempfile
import unittest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)

from tb import reconcile  # noqa: E402
from tb.common import load_json, write_csv  # noqa: E402
from tb.detect import ALLOWED, detect, judge_pair, strip_forbidden  # noqa: E402
from tb.load import load_all  # noqa: E402
from tb.sample_data import BUCKETS, COLS, make  # noqa: E402

P = None


def setUpModule():
    global P, TMP, DATA
    os.chdir(ROOT)
    P = load_json("config/params.json")
    TMP = tempfile.mkdtemp()
    DATA = os.path.join(TMP, "data")
    make(DATA, seed=11, n_payers=120)


def tearDownModule():
    shutil.rmtree(TMP, ignore_errors=True)


def monthly(day, months, amt=500000, year=2025, start=1, shift=None):
    out = []
    for i, m in enumerate(range(start, start + months)):
        y, mm = year + (m - 1) // 12, (m - 1) % 12 + 1
        import calendar
        d = dt.date(y, mm, min(day, calendar.monthrange(y, mm)[1]))
        if shift and i in shift:
            d += dt.timedelta(days=shift[i])
        out.append((d, amt, 1000 * day + i))
    return out


class Reconcile(unittest.TestCase):
    def test_every_row_accounted(self):
        data, _m = load_all(DATA)
        rows, _l = reconcile.run(data, load_json("config/run.json"))
        _t, _d, ok = reconcile.summary(data, rows, 5)
        self.assertTrue(ok, "어떤 표에서 반영+제외+미해결이 입력과 안 맞음")
        keys = [(x.table, x.row) for x in rows]
        self.assertEqual(len(keys), len(set(keys)), "한 행이 두 번 분류됨")

    def _mini(self, extra):
        d = os.path.join(TMP, "mini_%d" % len(os.listdir(TMP)))
        os.makedirs(d)
        base = {"HF_TRNS_TRAN": [{"TRAN_DT": "20250105", "TRAN_TMRG": "09", "WD_FC_SN": "101", "WD_AC_SN": "A1", "DPS_FC_SN": "102", "DPS_AC_SN": "B1",
                                  "TRAN_AMT": 100000, "MD_TYPE": "02", "FND_TYPE": "04", "FF_SP_AI": ""}]}
        base.update(extra)
        for t, cols in COLS.items():
            write_csv(os.path.join(d, t + ".csv"), base.get(t, []), cols)
        data, _m = load_all(d)
        rows, ledger = reconcile.run(data, load_json("config/run.json"))
        return rows, ledger

    def test_claim_is_not_withdrawal(self):
        rows, ledger = self._mini({"GR_JC_TRAN": [{"TRAN_DT": "20250105", "FC_SN": "101", "AC_SN": "A1", "UO_SN": "U", "PYR_SN": "P", "CHRG_AMT": 50000, "RSLT_CODE": "", "AMT": 0}]})
        jc = [x for x in rows if x.table == "GR_JC_TRAN"][0]
        self.assertEqual(jc.status, reconcile.UNRESOLVED, "청구 기록을 출금으로 반영함")
        self.assertFalse([e for e in ledger if e[4] == "GR_JC_TRAN"])

    def test_cms_no_failure_is_not_success_by_default(self):
        req = {"TRAN_DT": "20250110", "FC_SN": "101", "AC_SN": "A1", "UO_SN": "U", "PYR_SN": "P", "WD_REQ_AMT": 50000, "FND_KIND": "HB", "WD_SHP": "1"}
        res = {"TRAN_DT": "20250105", "FC_SN": "101", "AC_SN": "A9", "UO_SN": "U", "PYR_SN": "P", "WD_INBL_AMT": 50000, "WD_YN": "N", "WD_INBL_CD": "0021", "FND_KIND": "HB", "WD_SHP": "1"}
        res2 = dict(res, TRAN_DT="20250120")
        rows, ledger = self._mini({"CMS_REQ_TRAN": [req], "CMS_RES_TRAN": [res, res2]})
        x = [x for x in rows if x.table == "CMS_REQ_TRAN"][0]
        self.assertEqual(x.status, reconcile.UNRESOLVED, "결과표에 실패가 없다는 것만으로 성공 처리함")
        self.assertFalse([e for e in ledger if e[4] == "CMS_REQ_TRAN"])

    def test_nj_needs_one_to_one_both_ways(self):
        nj = {"TRAN_DT": "20250105", "DPS_FC_SN": "102", "DPS_AC_SN": "B1", "AMT": 100000, "WD_FC_SN": "101", "WD_AC_SN": "A1", "RSLT_CODE": "00"}
        rows, _l = self._mini({"GR_NJ_TRAN": [nj]})
        self.assertEqual([x for x in rows if x.table == "GR_NJ_TRAN"][0].status, reconcile.EXCLUDED)
        rows, _l = self._mini({"GR_NJ_TRAN": [nj, dict(nj)]})
        self.assertTrue(all(x.status == reconcile.UNRESOLVED for x in rows if x.table == "GR_NJ_TRAN"), "한쪽만 1:1인데 같은 거래로 봄")


class Detect(unittest.TestCase):
    def test_fund_type_not_used(self):
        data, _m = load_all(DATA)
        hf = data["HF_TRNS_TRAN"]
        self.assertNotIn("fnd_type", ALLOWED)
        a, _i, _p = detect(hf, P, BUCKETS)
        b, _i, _p = detect([dict(r, fnd_type="04" if r["_row"] % 2 else "00") for r in hf], P, BUCKETS)
        self.assertEqual(a, b, "자금구분을 바꿨더니 탐지 결과가 바뀜")
        self.assertTrue(all("fnd_type" not in r for r in strip_forbidden(hf)))

    def test_holiday_shift(self):
        ok, pos, reason, _f = judge_pair(monthly(10, 8, shift={3: 2}), P, BUCKETS)
        self.assertTrue(ok, reason)
        self.assertEqual(len(pos), 8)

    def test_month_end(self):
        ok, pos, reason, f = judge_pair(monthly(31, 8), P, BUCKETS)
        self.assertTrue(ok, reason)
        self.assertEqual(f["anchor"], "말일")
        self.assertEqual(len(pos), 8)

    def test_two_bundles(self):
        txs = sorted(monthly(5, 6, 1000000) + monthly(25, 6, 100000))
        ok, pos, reason, f = judge_pair(txs, P, BUCKETS)
        self.assertTrue(ok, reason)
        self.assertEqual(f["bundles"], 2)
        self.assertEqual(len(pos), 12)

    def test_rent_survives_frequent_other_payments(self):
        txs = monthly(5, 6, 1000000)
        for m in range(1, 7):
            for k, day in enumerate(((m * 7 + 3) % 27 + 1, (m * 11 + 9) % 27 + 1, (m * 5 + 17) % 27 + 1)):
                txs.append((dt.date(2025, m, day), BUCKETS[(m * 3 + k * 5) % 7], 500 + m * 10 + k))  # 날짜·금액이 들쭉날쭉한 수시 지급
        ok, pos, reason, _f = judge_pair(sorted(txs), P, BUCKETS)
        self.assertTrue(ok, "월세에 수시 지급이 섞였다고 월세까지 떨어짐: " + reason)
        self.assertTrue(all(r < 500 or r >= 1000 for r in pos) and len([r for r in pos if r >= 1000]) == 6)

    def test_rent_with_weekly_small_payments(self):
        # 매월 5일 200만 원 + 매주 5만 원: 소액 묶음은 매주로 떨어지고 월세는 남아야 한다
        txs = monthly(5, 6, 2000000)
        d = dt.date(2025, 1, 3)
        i = 0
        while d <= dt.date(2025, 6, 28):
            txs.append((d, 50000, 700 + i))
            d += dt.timedelta(days=7)
            i += 1
        ok, pos, reason, _f = judge_pair(sorted(txs), P, BUCKETS)
        self.assertTrue(ok, reason)
        self.assertEqual(sorted(r for r in pos), sorted(t[2] for t in monthly(5, 6, 2000000)))

    def test_weekly_scattered_amount_with_variable_on(self):
        # 금액이 여러 구간으로 흩어진 매주 지급은 금액 변동을 허용해도 월 반복이 아니다
        q = dict(P, allow_variable_amount=True)
        txs = [(dt.date(2025, 1, 2) + dt.timedelta(days=7 * i), BUCKETS[(i * 3) % 6], 900 + i) for i in range(26)]
        ok, _pos, reason, _f = judge_pair(txs, q, BUCKETS)
        self.assertFalse(ok, "흩어진 금액의 매주 지급을 월 반복으로 봄")

    def test_weekly_not_monthly(self):
        txs = [(dt.date(2025, 1, 1) + dt.timedelta(days=7 * i), 50000, i + 1) for i in range(20)]
        ok, _pos, reason, _f = judge_pair(txs, P, BUCKETS)
        self.assertFalse(ok)
        self.assertIn("여러 번", reason)

    def test_extra_payment_same_month_not_positive(self):
        txs = monthly(5, 6, 1000000) + [(dt.date(2025, 1, 12), 5000000, 99)]
        ok, pos, _r, _f = judge_pair(sorted(txs), P, BUCKETS)
        self.assertTrue(ok)
        self.assertNotIn(99, pos)

    def test_many_missing_months(self):
        txs = [t for i, t in enumerate(monthly(5, 12)) if i in (0, 1, 2, 7, 11)]
        ok, _p, reason, _f = judge_pair(txs, P, BUCKETS)
        self.assertFalse(ok, "12달 중 7달이 빠졌는데 후보로 봄")

    def test_too_few_months(self):
        ok, _p, reason, _f = judge_pair(monthly(5, 2), P, BUCKETS)
        self.assertFalse(ok)
        self.assertEqual(reason, "관측 달 수 부족")


class Guard(unittest.TestCase):
    def test_order_and_guards(self):
        import run
        work = os.path.join(TMP, "work_guard")

        def go(*args):
            run.main(list(args) + ["--data", DATA, "--work", work, "--demo"])

        def blocked(*args):
            with self.assertRaises(SystemExit) as c:
                go(*args)
            self.assertNotIn(c.exception.code, (0, None))

        blocked("freeze")  # 분할 기록 전 동결 금지
        go("split")
        blocked("sample")  # 동결 전 표본 금지
        go("freeze", "--note", "t")
        blocked("freeze")  # 두 번 동결 금지
        go("sample")
        blocked("sample")  # 다시 뽑기 금지
        blocked("aux-review")  # 1차 지문 전 보조 근거 금지
        go("simulate-review")
        go("commit-labels")
        blocked("commit-labels")  # 지문 덮어쓰기 금지
        blocked("evaluate")  # 재검토 전 채점 금지
        blocked("aux-review")  # 재검토 전 보조 근거 금지
        with self.assertRaises(SystemExit):  # 14일 전 재검토 지문 금지
            run.evaluation.commit_labels(work, stage="recheck", min_days=14, allow_early=False)
        go("simulate-review", "--stage", "recheck")
        go("commit-labels", "--stage", "recheck")
        go("evaluate")
        blocked("evaluate")  # 이유 없는 재채점 금지
        go("evaluate", "--rerun-reason", "점검")
        sheet = os.path.join(work, "eval_private", "review_sheet.csv")
        with open(sheet, "a", encoding="utf-8") as f:
            f.write("\n")
        blocked("evaluate", "--rerun-reason", "점검2")  # 검토지 변경
        events = [h["event"] for h in run.evaluation.history(work)]
        self.assertEqual(events.count("evaluate"), 2)

    def test_params_change_after_freeze(self):
        import subprocess
        # 사용 중인 설정을 수정·복원하지 않고 임시 사본에서 변경 감지를 검증한다.
        # 텍스트 복원은 Windows 에서 원본의 LF 를 CRLF 로 바꾸기도 한다.
        tool = os.path.join(TMP, "tool_guard")
        os.makedirs(tool)
        for folder in ("config", "tb"):
            shutil.copytree(os.path.join(ROOT, folder), os.path.join(tool, folder),
                            ignore=shutil.ignore_patterns("__pycache__"))
        shutil.copyfile(os.path.join(ROOT, "run.py"), os.path.join(tool, "run.py"))
        work = os.path.join(TMP, "work_guard2")

        def go(command):
            return subprocess.run(
                [sys.executable, "-X", "utf8", os.path.join(tool, "run.py"), command,
                 "--data", DATA, "--work", work, "--demo"],
                capture_output=True, encoding="utf-8", check=False,
            )

        for command in ("split", "freeze"):
            result = go(command)
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        with open(os.path.join(tool, "config", "guideline.md"), "ab") as guide:
            guide.write(b"\n")
        result = go("sample")
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("동결", result.stdout + result.stderr)



if __name__ == "__main__":
    unittest.main()
