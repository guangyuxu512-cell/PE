from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def test_gitignore_and_settings_ipc_contract():
    gitignore = read(".gitignore")
    main_index = read("main/index.js")
    preload = read("preload.js")

    assert ".npm-cache/" in gitignore
    assert (ROOT / "main/ipc/settings.js").exists()
    assert "registerSettingsIpc" in main_index
    assert "aiOptimizeSkus" in preload
    assert "aiFillSkuCodes" in preload


def test_main_process_supports_new_ai_and_image_proxy_behavior():
    ai_js = read("main/ipc/ai.js")
    utils_js = read("main/utils.js")

    for channel in ["ai-optimize-skus", "ai-fill-sku-codes"]:
      assert f"ipcMain.handle('{channel}'" in ai_js

    assert "IMAGE_CACHE_LIMIT = 200" in utils_js
    assert "fetchImageWithProxy(redirectUrl" in utils_js


def test_renderer_includes_lightbox_and_image_workflows():
    app_js = read("renderer/app.js")
    pics_js = read("renderer/components/TabPics.js")
    skus_js = read("renderer/components/TabSkus.js")
    props_js = read("renderer/components/TabProps.js")
    detail_js = read("renderer/components/TabDetail.js")
    image_proxy_js = read("renderer/components/shared/ImageProxy.js")

    assert (ROOT / "renderer/components/shared/ImageLightbox.js").exists()
    assert "app.component('image-lightbox'" in app_js
    assert "scrollTabs" in app_js

    assert "本地换图" in pics_js
    assert "SKU图片" in skus_js
    assert "AI 生成标题" in skus_js
    assert "AI 优化 SKU 名称" in skus_js
    assert "AI 批量补全" in skus_js
    assert "换图" in props_js
    assert 'draggable="true"' in detail_js
    assert "replaceDetailImage" in detail_js
    assert "previewDetail" in detail_js

    assert "cosProxyImage" in image_proxy_js
    assert "fallbackToProxy" in image_proxy_js
