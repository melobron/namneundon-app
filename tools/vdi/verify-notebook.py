"""이동한 Python 에서 노트북 화면과 실제 계산 커널을 검사한다."""
import os
from pathlib import Path
import subprocess
import sys
import time
from urllib.request import urlopen

from jupyterlab.commands import get_app_dir
from jupyter_client import KernelManager

assert (Path(get_app_dir()) / 'static' / 'index.html').is_file(), get_app_dir()
os.environ['PATH'] = str(Path(sys.executable).parent) + os.pathsep + os.environ['PATH']
server = subprocess.Popen(
    [sys.executable, '-X', 'utf8', '-m', 'jupyterlab', '--no-browser', '--ip=127.0.0.1', '--port=8899', '--ServerApp.port_retries=0'],
    stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
)
try:
    for _ in range(45):
        if server.poll() is not None:
            raise RuntimeError('Notebook server exited')
        try:
            with urlopen('http://127.0.0.1:8899/login', timeout=2) as response:
                assert response.status == 200
            break
        except OSError:
            time.sleep(1)
    else:
        raise RuntimeError('Notebook server did not start')
finally:
    server.terminate()
    server.wait(timeout=15)

kernel = KernelManager(kernel_name='python3')
try:
    kernel.start_kernel()
    client = kernel.blocking_client()
    client.start_channels()
    try:
        client.wait_for_ready(timeout=45)
        result = client.execute_interactive('import pandas as pd; assert pd.Series([1, 2]).sum() == 3', timeout=30)
        assert result['content']['status'] == 'ok', result['content']
    finally:
        client.stop_channels()
finally:
    if kernel.has_kernel:
        kernel.shutdown_kernel(now=True)
print('PASS: notebook login + relocated Python kernel + pandas calculation')
