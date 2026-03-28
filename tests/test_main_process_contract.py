import json
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def test_package_and_main_process_use_dotenv_env_mapping():
    package = json.loads(read("package.json"))
    main_js = read("main.js")

    assert "dotenv" in package["dependencies"]
    assert "app.getAppPath()" in main_js
    assert "__dirname" in main_js
    assert "path.join(app.isPackaged ? app.getAppPath() : __dirname, '.env')" in main_js
    assert "dotenv.config({ path: CFG_PATH, override: true })" in main_js
    assert "dotenv.parse(fs.readFileSync(CFG_PATH, 'utf-8'))" in main_js
    assert "AI_TEMPERATURE" in main_js
    assert "AI_MAX_TOKENS" in main_js
    assert "COS_SECRET_ID" in main_js
    assert "COS_SECRET_KEY" in main_js


def test_main_process_and_preload_expose_required_ipc_handlers():
    main_js = read("main.js")
    preload_js = read("preload.js")

    for channel in ["copy-text", "cos-test", "cos-delete", "ai-test", "cfg-load", "cfg-save"]:
        assert f"ipcMain.handle('{channel}'" in main_js

    for api_name in ["copyText", "cosTest", "cosDelete", "aiTest", "cfgLoad", "cfgSave"]:
        assert f"{api_name}:" in preload_js

    assert "temperature: Number(cfg.ai_temperature ?? 0.9)" in main_js
    assert "max_tokens: Number(cfg.ai_max_tokens ?? 2048)" in main_js


def test_node_can_parse_main_and_preload_files():
    subprocess.run(["node", "-c", "main.js"], cwd=ROOT, check=True)
    subprocess.run(["node", "-c", "preload.js"], cwd=ROOT, check=True)
