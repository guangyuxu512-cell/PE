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
    assert "aiGenerateTitle" in preload


def test_main_process_supports_title_updates_and_image_proxy_behavior():
    ai_js = read("main/ipc/ai.js")
    utils_js = read("main/utils.js")

    for channel in ["ai-generate-title", "ai-optimize-title", "ai-optimize-skus", "ai-fill-sku-codes"]:
        assert f"ipcMain.handle('{channel}'" in ai_js

    assert "buildNonSalePropKeywords" in ai_js
    assert "原标题：" in ai_js
    assert "核心属性关键词" in ai_js
    assert "不要在标题中包含价格、数量、库存" in ai_js
    assert "JSON 数组" in ai_js
    assert '{"optimizedTitle":""}' not in ai_js
    assert "buildTitleContext" not in ai_js
    assert "IMAGE_CACHE_LIMIT = 200" in utils_js
    assert "fetchImageWithProxy(redirectUrl" in utils_js
    assert "https://detail.1688.com/" in utils_js
    assert "Chrome/122.0.0.0" in utils_js


def test_renderer_includes_lightbox_and_title_list_workflows():
    app_js = read("renderer/app.js")
    basic_js = read("renderer/components/TabBasicInfo.js")
    pics_js = read("renderer/components/TabPics.js")
    skus_js = read("renderer/components/TabSkus.js")
    props_js = read("renderer/components/TabProps.js")
    detail_js = read("renderer/components/TabDetail.js")
    gallery_js = read("renderer/components/TabGallery.js")
    image_proxy_js = read("renderer/components/shared/ImageProxy.js")
    main_css = read("renderer/styles/main.css")

    assert (ROOT / "renderer/components/shared/ImageLightbox.js").exists()
    assert "app.component('image-lightbox'" in app_js
    assert "scrollTabs" in app_js

    assert "AI 生成标题" in basic_js
    assert "AI 优化标题" in basic_js
    assert "titleState.generatedTitles.length" in basic_js
    assert "titleState.mode === 'optimize' ? '优化结果' : '候选标题'" in basic_js
    assert "title-ai-list__item" in basic_js
    assert "title-ai-compare" not in basic_js
    assert "本地换图" in pics_js
    assert "SKU图片" in skus_js
    assert "AI 优化 SKU 名称" in skus_js
    assert "AI 批量补全" in skus_js
    assert "AI 生成标题" not in skus_js
    assert "换图" in props_js
    assert 'draggable="true"' in detail_js
    assert "replaceDetailImage" in detail_js
    assert "previewDetail" in detail_js
    assert "AI 生成详情" not in detail_js
    assert "openLightbox" in gallery_js
    assert "title-ai-panel" in main_css
    assert "title-ai-list__item" in main_css
    assert "title-ai-compare" in main_css

    assert "cosProxyImage" in image_proxy_js
    assert "fallbackToProxy" in image_proxy_js
    assert "getProxyApiName" in image_proxy_js
    assert "isCosImage(src) ? 'cosProxyImage' : 'proxyImage'" in image_proxy_js
