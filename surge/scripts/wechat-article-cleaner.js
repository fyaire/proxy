const marker = 'data-wechat-article-cleaner="4"';
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

const runtime = String.raw`(function () {
  'use strict';

  var articleSelector = '#js_content,.rich_media_content';
  var actionPattern = /(?:查看详情|进入小程序|去看看|了解详情|立即查看|立即打开|立即下载|打开应用|领取优惠|立即购买)/;
  var scheduled = false;

  function normalize(value) {
    return (value || '').replace(/\s+/g, ' ').trim();
  }

  function parentOf(element) {
    if (!element) return null;
    if (element.parentElement) return element.parentElement;
    var root = element.getRootNode && element.getRootNode();
    return root && root.host ? root.host : null;
  }

  function isInsideArticle(element) {
    var current = element;
    for (var i = 0; current && i < 20; i += 1) {
      if (current.matches && current.matches(articleSelector)) return true;
      current = parentOf(current);
    }
    return false;
  }

  function hide(element) {
    if (!element || element === document.body || element === document.documentElement) return false;
    element.setAttribute('data-wechat-ad-hidden', '1');
    element.setAttribute('aria-hidden', 'true');
    element.style.setProperty('display', 'none', 'important');
    element.style.setProperty('height', '0', 'important');
    element.style.setProperty('min-height', '0', 'important');
    element.style.setProperty('margin', '0', 'important');
    element.style.setProperty('padding', '0', 'important');
    element.style.setProperty('border', '0', 'important');
    element.style.setProperty('overflow', 'hidden', 'important');
    return true;
  }

  function findCard(seed) {
    var element = seed;
    var minimumWidth = Math.min(Math.max(window.innerWidth * 0.58, 280), 680);

    for (var i = 0; element && i < 12; i += 1) {
      if (element === document.body || element === document.documentElement) break;
      if (!isInsideArticle(element)) {
        var rect = element.getBoundingClientRect();
        var text = normalize(element.innerText || element.textContent);
        if (
          rect.width >= minimumWidth &&
          rect.height >= 70 &&
          rect.height <= 480 &&
          text.length <= 800 &&
          text.indexOf('广告') !== -1 &&
          actionPattern.test(text)
        ) {
          return element;
        }
      }
      element = parentOf(element);
    }
    return null;
  }

  function scanRoot(root) {
    if (!root || !root.querySelectorAll) return false;
    var hidden = false;
    var known = root.querySelectorAll('#js_bottom_ad_area,#js_bottom_ad_area_wrp,#js_bottom_ad_area_wrap,.js_bottom_ad_area,#js_ad_control,.js_ad_control');
    for (var i = 0; i < known.length; i += 1) hidden = hide(known[i]) || hidden;

    var textNodes = root.querySelectorAll('span,div,p,a,button,label');
    for (var j = 0; j < textNodes.length; j += 1) {
      var ownText = normalize(textNodes[j].innerText || textNodes[j].textContent);
      if (ownText === '广告' || actionPattern.test(ownText)) {
        var card = findCard(textNodes[j]);
        if (card) hidden = hide(card) || hidden;
      }
    }

    var frames = root.querySelectorAll('iframe');
    for (var k = 0; k < frames.length; k += 1) {
      var frame = frames[k];
      try {
        if (frame.contentDocument) hidden = scanRoot(frame.contentDocument) || hidden;
      } catch (_) {}

      var src = frame.getAttribute('src') || '';
      var rect = frame.getBoundingClientRect();
      if (
        !isInsideArticle(frame) &&
        /(?:wxs\.qq\.com|\/ad(?:[/?#]|$)|advert)/i.test(src) &&
        rect.width >= Math.min(Math.max(window.innerWidth * 0.58, 280), 680) &&
        rect.height >= 70 &&
        rect.height <= 480
      ) {
        hidden = hide(findCard(frame) || frame) || hidden;
      }
    }

    var all = root.querySelectorAll('*');
    for (var m = 0; m < all.length; m += 1) {
      if (all[m].shadowRoot) hidden = scanRoot(all[m].shadowRoot) || hidden;
    }
    return hidden;
  }

  function inspectElement(element) {
    if (!element || element.nodeType !== 1) return false;
    var hidden = false;
    if (
      element.matches &&
      element.matches('#js_bottom_ad_area,#js_bottom_ad_area_wrp,#js_bottom_ad_area_wrap,.js_bottom_ad_area,#js_ad_control,.js_ad_control')
    ) {
      hidden = hide(element) || hidden;
    }

    var elements = [element];
    if (element.querySelectorAll) {
      var descendants = element.querySelectorAll('span,div,p,a,button,label');
      for (var i = 0; i < descendants.length; i += 1) elements.push(descendants[i]);
    }

    for (var j = 0; j < elements.length; j += 1) {
      var text = normalize(elements[j].innerText || elements[j].textContent);
      if (text === '广告' || actionPattern.test(text)) {
        var card = findCard(elements[j]);
        if (card) hidden = hide(card) || hidden;
      }
    }
    return hidden;
  }

  function scan() {
    scheduled = false;
    scanRoot(document);
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(scan);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', schedule, { once: true });
  } else {
    schedule();
  }

  new MutationObserver(function (mutations) {
    for (var i = 0; i < mutations.length; i += 1) {
      var mutation = mutations[i];
      var target = mutation.target && mutation.target.nodeType === 1
        ? mutation.target
        : parentOf(mutation.target);
      if (target) inspectElement(target);

      for (var j = 0; j < mutation.addedNodes.length; j += 1) {
        var node = mutation.addedNodes[j];
        var element = node.nodeType === 1 ? node : parentOf(node);
        if (element) inspectElement(element);
      }
    }
    schedule();
  }).observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true
  });

  var attempts = 0;
  var timer = window.setInterval(function () {
    schedule();
    attempts += 1;
    if (attempts >= 80) window.clearInterval(timer);
  }, 750);
})();`;

try {
  const body = $response.body;

  if (typeof body !== 'string' || body.length === 0 || body.includes(marker)) {
    $done({});
  } else {
    const headers = $response.headers || {};
    const csp = headers['content-security-policy'] || headers['Content-Security-Policy'] || '';
    const nonceMatch = csp.match(/'nonce-([^']+)'/) || body.match(/<script[^>]+nonce=["']([^"']+)["']/i);
    const nonce = nonceMatch ? nonceMatch[1] : '';
    const runtimeTag = nonce
      ? `<script nonce="${nonce}" ${marker}>${runtime}</script>`
      : '';
    const injection = `${css}${runtimeTag}`;
    const modified = /<\/head\s*>/i.test(body)
      ? body.replace(/<\/head\s*>/i, `${injection}$&`)
      : `${injection}${body}`;
    $done({ body: modified });
  }
} catch (_) {
  $done({});
}
