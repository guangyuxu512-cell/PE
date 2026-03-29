from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def test_renderer_index_is_minimal_shell():
    html = read("renderer/index.html")

    assert '<div id="app"></div>' in html
    assert '<script type="module" src="./app.js"></script>' in html
    assert "element-plus/dist/index.css" in html
    assert "./styles/main.css" in html
    assert "./styles/toolbar.css" in html
    assert "./styles/settings.css" in html
    assert "./styles/gallery.css" in html


def test_renderer_modules_and_components_exist():
    for path in [
        "renderer/app.js",
        "renderer/constants.js",
        "renderer/composables/useProductData.js",
        "renderer/composables/useConfig.js",
        "renderer/composables/useGallery.js",
        "renderer/composables/useLogger.js",
        "renderer/composables/useAi.js",
        "renderer/components/TabBasicInfo.js",
        "renderer/components/TabPics.js",
        "renderer/components/TabSkus.js",
        "renderer/components/TabProps.js",
        "renderer/components/TabDetail.js",
        "renderer/components/TabGallery.js",
        "renderer/components/TabJson.js",
        "renderer/components/TabSettings.js",
        "renderer/components/shared/ImageProxy.js",
        "renderer/components/shared/LogPanel.js",
    ]:
        assert (ROOT / path).exists(), path


def test_app_and_components_include_required_features():
    app_js = read("renderer/app.js")
    detail_js = read("renderer/components/TabDetail.js")
    basic_js = read("renderer/components/TabBasicInfo.js")
    use_ai_js = read("renderer/composables/useAi.js")
    product_data_js = read("renderer/composables/useProductData.js")
    props_js = read("renderer/components/TabProps.js")
    image_proxy_js = read("renderer/components/shared/ImageProxy.js")

    for marker in [
        "app.component('tab-basic-info'",
        "app.component('tab-detail'",
        "app.component('tab-gallery'",
        "app.component('tab-settings'",
        'name="cos-gallery"',
        'name="settings"',
        "AI 批量生成",
    ]:
        assert marker in app_js

    for marker in [
        "图片列表模式",
        "HTML 源码模式",
        "从存储桶选择",
        "updateDetailSource",
        "replaceDetailImage",
    ]:
        assert marker in detail_js

    assert "AI 生成详情" not in detail_js
    assert "AI 生成标题" in basic_js
    assert "AI 优化标题" in basic_js
    assert "titleState" in use_ai_js
    assert "generatedTitles" in use_ai_js
    assert "optimizedTitle" in use_ai_js
    assert "shortTitle" in product_data_js
    assert "priceRange" in product_data_js
    assert "skuSpecNames" in product_data_js
    assert "AI 补全属性" in props_js
    assert "window.api.proxyImage" in image_proxy_js
