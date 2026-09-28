"""실제 자료 없이 분석 패키지와 로컬 Jupyter 커널을 점검한다."""
import json
import os
from pathlib import Path
import secrets
import socket
import subprocess
import sys
import tempfile
import time
import urllib.request

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from scipy import stats
import statsmodels.api as sm
from jupyter_client import KernelManager


def check_packages(folder):
    # 라이브러리 연산은 인터넷 연결 없이 실행되어야 한다.
    connect = socket.socket.connect

    def local_only(sock, address):
        if isinstance(address, tuple) and address[0] not in ("127.0.0.1", "::1", "localhost"):
            raise AssertionError("외부 연결 시도: " + str(address))
        return connect(sock, address)

    socket.socket.connect = local_only
    try:
        frame = pd.DataFrame({"sample": [1, 2, 3], "amount": [10.0, 20.0, 30.0]})
        for suffix in ("xlsx", "parquet"):
            path = folder / ("sample." + suffix)
            if suffix == "xlsx":
                frame.to_excel(path, index=False)
                restored = pd.read_excel(path)
            else:
                frame.to_parquet(path, index=False)
                restored = pd.read_parquet(path)
            pd.testing.assert_frame_equal(frame, restored, check_dtype=False)
        assert np.isclose(stats.linregress(frame["sample"], frame["amount"]).slope, 10)
        model = sm.OLS(frame["amount"], sm.add_constant(frame["sample"])).fit()
        assert np.isclose(model.params["sample"], 10)
        plt.plot(frame["sample"], frame["amount"])
        plt.savefig(folder / "sample.png")
        plt.close()
        assert (folder / "sample.png").stat().st_size > 0
    finally:
        socket.socket.connect = connect


def check_kernel():
    manager = KernelManager(kernel_name="python3")
    manager.start_kernel()
    client = manager.client()
    try:
        client.start_channels()
        client.wait_for_ready(timeout=30)
        client.execute("import sys, pandas; print(sys.prefix); print(pandas.Series([1,2,3]).sum())")
        text = ""
        while True:
            message = client.get_iopub_msg(timeout=30)
            kind = message["header"]["msg_type"]
            if kind == "error":
                raise AssertionError(message["content"])
            if kind == "stream":
                text += message["content"]["text"]
            if kind == "status" and message["content"]["execution_state"] == "idle":
                break
        assert sys.prefix in text, text
        assert "6\n" in text, text
    finally:
        client.stop_channels()
        manager.shutdown_kernel(now=True)


def check_notebook(folder):
    with socket.socket() as server:
        server.bind(("127.0.0.1", 0))
        port = server.getsockname()[1]
    token = secrets.token_hex(24)
    env = dict(os.environ, JUPYTER_TOKEN=token)
    with (folder / "jupyter.log").open("w", encoding="utf-8") as log:
        process = subprocess.Popen([
            sys.executable, "-X", "utf8", "-m", "jupyterlab", "--no-browser",
            "--ip=127.0.0.1", "--port=" + str(port), "--ServerApp.port_retries=0",
            "--ServerApp.root_dir=" + str(folder),
            "--LabApp.check_for_updates_class=jupyterlab.NeverCheckForUpdate",
            "--LabApp.extension_manager=readonly",
        ], env=env, stdout=log, stderr=log)
        try:
            url = "http://127.0.0.1:%d/lab?token=%s" % (port, token)
            for _ in range(60):
                if process.poll() is not None:
                    raise AssertionError("Jupyter 시작 실패: " + (folder / "jupyter.log").read_text(encoding="utf-8"))
                try:
                    with urllib.request.urlopen(url, timeout=1) as response:
                        assert "jupyter" in response.read().decode().lower()
                    break
                except OSError:
                    time.sleep(0.5)
            else:
                raise AssertionError("Jupyter 응답 대기 시간 초과")
            with urllib.request.urlopen(url.replace("/lab?", "/api/kernelspecs?")) as response:
                assert "python3" in json.load(response)["kernelspecs"]
        finally:
            # Windows 가상 환경의 python.exe 는 실제 Python 을 자식으로 실행한다.
            # 부모만 종료하면 서버가 남아 로그 파일을 계속 잡으므로 서버에 종료를 요청한다.
            try:
                request = urllib.request.Request(
                    "http://127.0.0.1:%d/api/shutdown?token=%s" % (port, token),
                    data=b"", method="POST",
                )
                with urllib.request.urlopen(request, timeout=5):
                    pass
                process.wait(timeout=15)
            except (OSError, subprocess.TimeoutExpired):
                if os.name == "nt":
                    subprocess.run(
                        ["taskkill", "/PID", str(process.pid), "/T", "/F"],
                        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=False,
                    )
                else:
                    process.kill()
                process.wait(timeout=10)



with tempfile.TemporaryDirectory(prefix="analysis-check-") as temp:
    root = Path(temp)
    check_packages(root)
    check_kernel()
    check_notebook(root)
print("분석 확인 완료: Excel · Parquet · 통계 · 그래프 · 전용 Python 커널 · Jupyter 화면")
