"""공통 도구. 표준 라이브러리만 쓴다 (인터넷 없는 환경에서 바로 돈다)."""
import csv
import datetime as dt
import hashlib
import io
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TABLES = ["HF_TRNS_TRAN", "CD_TRNS_TRAN", "OB_TRNS_TRAN", "OB_INQR_TRAN", "PI_WD_LEDG",
          "GR_JC_TRAN", "GR_NJ_TRAN", "CMS_REQ_TRAN", "CMS_RES_TRAN"]


def path(*p):
    return os.path.join(ROOT, *p)


def load_json(rel):
    with open(path(rel), encoding="utf-8") as f:
        return json.load(f)


def save_json(rel, obj):
    full = path(rel)
    os.makedirs(os.path.dirname(full), exist_ok=True)
    with open(full, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=2)


def sha256_file(full):
    h = hashlib.sha256()
    with open(full, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def _open_text(full):
    import codecs
    raw = open(full, "rb").read(65536)
    for enc in ("utf-8-sig", "cp949"):
        try:
            codecs.getincrementaldecoder(enc)().decode(raw, final=False)
            return open(full, encoding=enc, newline="")
        except UnicodeDecodeError:
            continue
    return open(full, encoding="utf-8", errors="replace", newline="")


def find_table_file(data_dir, table):
    """data_dir 안에서 테이블 이름이 들어간 파일을 찾는다 (csv, txt, tsv)."""
    if not os.path.isdir(data_dir):
        return None
    for name in sorted(os.listdir(data_dir)):
        low = name.lower()
        if table.lower() in low and low.rsplit(".", 1)[-1] in ("csv", "txt", "tsv"):
            return os.path.join(data_dir, name)
    return None


def read_table(data_dir, table, columns_cfg, limit=None):
    """테이블을 읽어 내부 이름으로 바꾼 dict 목록을 돌려준다. 행 번호(_row)를 붙인다."""
    full = find_table_file(data_dir, table)
    if not full:
        return None, None
    mapping = columns_cfg.get(table, {})
    rev = {v: k for k, v in mapping.items()}
    with _open_text(full) as f:
        head = f.read(8192)
        f.seek(0)
        try:
            dialect = csv.Sniffer().sniff(head, delimiters=",|\t;")
        except csv.Error:
            dialect = csv.excel
        reader = csv.DictReader(f, dialect=dialect)
        missing = [c for c in mapping.values() if c not in (reader.fieldnames or [])]
        rows = []
        for i, r in enumerate(reader):
            if limit and i >= limit:
                break
            d = {"_row": i + 1, "_table": table}
            for k, v in r.items():
                if k is None:
                    continue
                d[rev.get(k.strip(), k.strip())] = (v or "").strip()
            rows.append(d)
    return rows, {"file": os.path.basename(full), "missing_columns": missing}


def parse_date(s):
    s = (s or "").strip().replace("-", "")
    if len(s) != 8 or not s.isdigit():
        return None
    try:
        return dt.date(int(s[:4]), int(s[4:6]), int(s[6:]))
    except ValueError:
        return None


def ym(d):
    return d.year * 100 + d.month


def to_int(s):
    try:
        return int(str(s).strip().replace(",", ""))
    except (ValueError, TypeError):
        return None


def acct(fc, ac):
    fc, ac = (fc or "").strip(), (ac or "").strip()
    if not fc or not ac:
        return None
    return fc + ":" + ac


def write_csv(full, rows, fields):
    os.makedirs(os.path.dirname(full), exist_ok=True)
    with open(full, "w", encoding="utf-8-sig", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fields, extrasaction="ignore")
        w.writeheader()
        for r in rows:
            w.writerow(r)


def read_csv(full):
    with _open_text(full) as f:
        return list(csv.DictReader(f))


def suppress(n, min_cell):
    """반출표용: 작은 칸은 숫자 대신 '<N'으로 가린다."""
    if n is None:
        return ""
    return "<%d" % min_cell if 0 < n < min_cell else str(n)


def md_table(header, rows):
    out = io.StringIO()
    out.write("| " + " | ".join(header) + " |\n")
    out.write("|" + "---|" * len(header) + "\n")
    for r in rows:
        out.write("| " + " | ".join(str(x) for x in r) + " |\n")
    return out.getvalue()


def amount_buckets(values, cfg_buckets=None):
    """범주화된 금액 값의 순서 목록. 설정에 없으면 데이터에 나온 값을 정렬해 쓴다."""
    if cfg_buckets:
        return sorted(cfg_buckets)
    return sorted({v for v in values if v is not None})


def bucket_index(v, buckets):
    import bisect
    if v is None or not buckets:
        return None
    i = bisect.bisect_left(buckets, v)
    if i < len(buckets) and buckets[i] == v:
        return i
    if i == 0:
        return 0
    if i >= len(buckets):
        return len(buckets) - 1
    return i if buckets[i] - v < v - buckets[i - 1] else i - 1
