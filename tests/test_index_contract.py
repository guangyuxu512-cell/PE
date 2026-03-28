import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "index.html"


def read_index() -> str:
    return INDEX.read_text(encoding="utf-8")


def test_index_contains_required_tabs_and_settings_fields():
    html = read_index()

    assert 'name="cos-gallery"' in html
    assert 'name="settings"' in html
    assert html.index('name="detail"') < html.index('name="cos-gallery"') < html.index('name="json"')
    assert html.index('name="json"') < html.index('name="settings"')

    for marker in [
        "cfg.ai_temperature",
        "cfg.ai_max_tokens",
        "testAiConnection",
        "testCosConnection",
        "saveCfg",
        "gallery.view",
        "deleteSelectedCos",
        "addSelectedCosPics",
        "copyUrl",
        "openCfg",
    ]:
        assert marker in html

    assert "cfgDlg" not in html


def test_index_inline_script_is_valid_javascript():
    script = """
const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const match = html.match(/<script>\\n([\\s\\S]*)<\\/script>\\n<\\/body>/);
if (!match) throw new Error('inline script not found');
new Function(match[1]);
"""
    subprocess.run(["node", "-e", script], cwd=ROOT, check=True)
