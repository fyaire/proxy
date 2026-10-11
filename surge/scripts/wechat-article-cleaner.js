const marker = 'data-wechat-article-cleaner="1"';
const css = `<style ${marker}>
#js_bottom_ad_area,
#js_bottom_ad_area_wrp,
#js_bottom_ad_area_wrap,
.js_bottom_ad_area,
#js_ad_control,
.js_ad_control {
  display: none !important;
  height: 0 !important;
  min-height: 0 !important;
  margin: 0 !important;
  padding: 0 !important;
  border: 0 !important;
  overflow: hidden !important;
}
</style>`;

try {
  const body = $response.body;

  if (typeof body !== 'string' || body.length === 0 || body.includes(marker)) {
    $done({});
  } else if (/<\/head\s*>/i.test(body)) {
    $done({ body: body.replace(/<\/head\s*>/i, `${css}$&`) });
  } else {
    $done({ body: `${css}${body}` });
  }
} catch (_) {
  $done({});
}
