import json
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def test_package_entry_and_main_structure_are_modularized():
    package = json.loads(read("package.json"))

    assert package["main"] == "main/index.js"
    assert "dotenv" in package["dependencies"]

    for path in [
        "main/index.js",
        "main/config.js",
        "main/utils.js",
        "main/ipc/file.js",
        "main/ipc/cos.js",
        "main/ipc/ai.js",
        "main/ipc/clipboard.js",
        ".env.example",
    ]:
        assert (ROOT / path).exists(), path


def test_main_process_modules_expose_required_handlers_and_helpers():
    main_index = read("main/index.js")
    config_js = read("main/config.js")
    cos_js = read("main/ipc/cos.js")
    ai_js = read("main/ipc/ai.js")
    preload_js = read("preload.js")

    assert "renderer', 'index.html'" in main_index
    assert "registerFileIpc" in main_index
    assert "registerCosIpc" in main_index
    assert "registerAiIpc" in main_index
    assert "registerClipboardIpc" in main_index

    assert "ENV_KEY_MAP" in config_js
    assert "AI_TEMPERATURE" in config_js
    assert "AI_MAX_TOKENS" in config_js
    assert ".env" in config_js

    for channel in ["cos-upload", "cos-list", "cos-test", "cos-delete", "proxy-image", "cos-proxy-image"]:
        assert f"ipcMain.handle('{channel}'" in cos_js

    for channel in [
        "ai-gen",
        "ai-test",
        "ai-describe-image",
        "ai-generate-title",
        "ai-optimize-title",
        "ai-fill-props",
        "ai-optimize-skus",
        "ai-fill-sku-codes",
    ]:
        assert f"ipcMain.handle('{channel}'" in ai_js

    assert "ai-generate-detail" not in ai_js
    assert "buildTitleContext" not in ai_js
    assert "buildNonSalePropKeywords" in ai_js
    assert '{"optimizedTitle":""}' not in ai_js

    for api_name in [
        "proxyImage",
        "cosProxyImage",
        "aiDescribeImage",
        "aiGenerateTitle",
        "aiOptimizeTitle",
        "aiFillProps",
    ]:
        assert f"{api_name}:" in preload_js

    assert "aiGenerateDetail" not in preload_js


def test_node_can_parse_commonjs_entry_files():
    subprocess.run(["node", "-c", "main/index.js"], cwd=ROOT, check=True)
    subprocess.run(["node", "-c", "main/config.js"], cwd=ROOT, check=True)
    subprocess.run(["node", "-c", "main/utils.js"], cwd=ROOT, check=True)
    subprocess.run(["node", "-c", "main/ipc/file.js"], cwd=ROOT, check=True)
    subprocess.run(["node", "-c", "main/ipc/cos.js"], cwd=ROOT, check=True)
    subprocess.run(["node", "-c", "main/ipc/ai.js"], cwd=ROOT, check=True)
    subprocess.run(["node", "-c", "main/ipc/clipboard.js"], cwd=ROOT, check=True)
    subprocess.run(["node", "-c", "preload.js"], cwd=ROOT, check=True)
