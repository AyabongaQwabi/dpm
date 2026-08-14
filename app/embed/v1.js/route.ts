import { NextResponse } from 'next/server'
import { SITE_URL } from '@/lib/seo'

export const runtime = 'nodejs'

// Shared embed runtime, served as a script tag: <script src=".../embed/v1.js"
// data-provider="..." data-mode="services|card|reviews" data-accent="#..."
// data-radius="12" async></script>. Renders into the script's own position
// (a container div inserted right after it).
//
// No iframe delivery path in this pass — next.config.ts's global
// X-Frame-Options: SAMEORIGIN (source: '/(.*)') would block any page on this
// site, including a purpose-built /embed route, from being framed on a
// third-party origin, and relaxing that is a separate, deliberate decision
// this pass didn't make. Platforms that can't run a script tag are
// unsupported until that's revisited.
//
// Booking/quote CTAs always open SITE_URL in a new top-level tab, carrying
// source=embed&originDomain=... through to checkout so the customer
// completes the exact same on-platform booking flow — see the Step 0 finding
// that cross-origin cookies won't carry a session into an iframe either way.
function scriptBody(siteUrl: string): string {
  return `(function () {
  var SITE = ${JSON.stringify(siteUrl)};
  var scripts = document.getElementsByTagName('script');
  var thisScript = document.currentScript || scripts[scripts.length - 1];

  var providerId = thisScript.getAttribute('data-provider');
  var mode = thisScript.getAttribute('data-mode') || 'services';
  var variant = thisScript.getAttribute('data-variant') || 'default';
  var accent = thisScript.getAttribute('data-accent') || '#0F3329';
  var radius = thisScript.getAttribute('data-radius') || '12';
  if (!providerId) return;

  var container = document.createElement('div');
  container.className = 'sp-embed sp-embed-' + mode;
  container.style.fontFamily = 'system-ui, -apple-system, sans-serif';
  thisScript.parentNode.insertBefore(container, thisScript.nextSibling);

  function originDomain() {
    try {
      return window.location.hostname;
    } catch (e) {
      return null;
    }
  }

  function sessionId() {
    var key = 'sp_embed_session';
    try {
      var existing = window.sessionStorage.getItem(key);
      if (existing) return existing;
      var created = 'embed-' + Math.random().toString(36).slice(2) + Date.now();
      window.sessionStorage.setItem(key, created);
      return created;
    } catch (e) {
      return 'embed-' + Date.now();
    }
  }

  function logEvent(eventType, metadata) {
    var body = JSON.stringify({
      eventType: eventType,
      providerId: providerId,
      originDomain: originDomain(),
      sessionId: sessionId(),
      metadata: metadata || { mode: mode },
    });
    try {
      if (navigator.sendBeacon) {
        navigator.sendBeacon(SITE + '/api/funnel-events', new Blob([body], { type: 'application/json' }));
        return;
      }
    } catch (e) {}
    fetch(SITE + '/api/funnel-events', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: body,
      keepalive: true,
    }).catch(function () {});
  }

  function bookingUrl(serviceId) {
    var url = SITE + '/services/' + encodeURIComponent(serviceId) + '?source=embed';
    var od = originDomain();
    if (od) url += '&originDomain=' + encodeURIComponent(od);
    return url;
  }

  function el(tag, props, children) {
    var node = document.createElement(tag);
    if (props) {
      Object.keys(props).forEach(function (key) {
        if (key === 'style') Object.assign(node.style, props.style);
        else if (key === 'text') node.textContent = props.text;
        else node.setAttribute(key, props[key]);
      });
    }
    (children || []).forEach(function (child) {
      if (child) node.appendChild(child);
    });
    return node;
  }

  function formatPrice(amount) {
    return 'R' + Math.round(amount).toLocaleString('en-ZA');
  }

  function renderError(message) {
    container.appendChild(el('p', { style: { fontSize: '13px', color: '#666' }, text: message }));
  }

  function trackClick(kind, extra) {
    logEvent('embed_interaction', Object.assign({ mode: mode, kind: kind }, extra || {}));
  }

  function renderServices(data) {
    var wrap = el('div', { style: { display: 'grid', gap: '12px' } });
    (data.services || []).forEach(function (service) {
      var card = el('div', {
        style: {
          border: '1px solid #e5e5e5',
          borderRadius: radius + 'px',
          padding: '14px 16px',
        },
      });
      card.appendChild(el('p', { style: { fontWeight: '600', margin: '0 0 4px', fontSize: '14px' }, text: service.title }));
      if (service.description) {
        card.appendChild(el('p', { style: { margin: '0 0 8px', fontSize: '12px', color: '#666' }, text: service.description }));
      }

      var footer = el('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' } });

      if (service.priceFrom !== null && service.priceFrom !== undefined) {
        footer.appendChild(el('span', { style: { fontWeight: '700', fontSize: '14px' }, text: 'From ' + formatPrice(service.priceFrom) }));
        var bookBtn = el('a', {
          href: bookingUrl(service.id),
          target: '_blank',
          rel: 'noopener noreferrer',
          style: {
            background: accent,
            color: '#fff',
            padding: '8px 14px',
            borderRadius: (parseInt(radius, 10) - 4 > 0 ? parseInt(radius, 10) - 4 : radius) + 'px',
            fontSize: '13px',
            fontWeight: '600',
            textDecoration: 'none',
          },
          text: 'Book',
        });
        bookBtn.addEventListener('click', function () {
          trackClick('book_click', { serviceId: service.id });
        });
        footer.appendChild(bookBtn);
      } else if (service.acceptsCustomQuotes) {
        footer.appendChild(el('span', { style: { fontStyle: 'italic', fontSize: '13px', color: '#666' }, text: 'Custom quote' }));
        var quoteBtn = el('a', {
          href: bookingUrl(service.id),
          target: '_blank',
          rel: 'noopener noreferrer',
          style: {
            background: 'transparent',
            color: accent,
            border: '1px solid ' + accent,
            padding: '7px 14px',
            borderRadius: (parseInt(radius, 10) - 4 > 0 ? parseInt(radius, 10) - 4 : radius) + 'px',
            fontSize: '13px',
            fontWeight: '600',
            textDecoration: 'none',
          },
          text: 'Get a custom quote',
        });
        quoteBtn.addEventListener('click', function () {
          trackClick('quote_click', { serviceId: service.id });
        });
        footer.appendChild(quoteBtn);
      } else {
        footer.appendChild(el('span', { style: { fontSize: '12px', color: '#999' }, text: 'Not currently bookable' }));
      }

      card.appendChild(footer);
      wrap.appendChild(card);
    });
    container.appendChild(wrap);
  }

  function renderCard(data) {
    var p = data.provider;
    var card = el('div', {
      style: { border: '1px solid #e5e5e5', borderRadius: radius + 'px', padding: '16px', maxWidth: '360px' },
    });
    card.appendChild(el('p', { style: { fontWeight: '700', fontSize: '16px', margin: '0 0 4px' }, text: p.businessName }));
    var meta = [];
    if (p.locationCity) meta.push(p.locationCity);
    if (p.avgRating) meta.push('★ ' + p.avgRating.toFixed(1) + ' (' + p.reviewCount + ')');
    meta.push(p.serviceCount + ' service' + (p.serviceCount === 1 ? '' : 's'));
    card.appendChild(el('p', { style: { fontSize: '12px', color: '#666', margin: '0 0 12px' }, text: meta.join(' · ') }));

    var link = el('a', {
      href: SITE + '/providers/' + encodeURIComponent(p.slug || p.id) + '?source=embed&originDomain=' + encodeURIComponent(originDomain() || ''),
      target: '_blank',
      rel: 'noopener noreferrer',
      style: {
        display: 'inline-block',
        background: accent,
        color: '#fff',
        padding: '8px 14px',
        borderRadius: (parseInt(radius, 10) - 4 > 0 ? parseInt(radius, 10) - 4 : radius) + 'px',
        fontSize: '13px',
        fontWeight: '600',
        textDecoration: 'none',
      },
      text: 'View profile',
    });
    link.addEventListener('click', function () {
      trackClick('profile_click');
    });
    card.appendChild(link);
    container.appendChild(card);
  }

  function renderReviewsBadge(data) {
    var p = data.provider;
    var link = el('a', {
      href: SITE + '/providers/' + encodeURIComponent(p.slug || p.id) + '?source=embed&originDomain=' + encodeURIComponent(originDomain() || ''),
      target: '_blank',
      rel: 'noopener noreferrer',
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        border: '1px solid #e5e5e5',
        borderRadius: radius + 'px',
        padding: '6px 10px',
        textDecoration: 'none',
        color: 'inherit',
      },
    });
    if (p.avgRating) {
      link.appendChild(el('span', { style: { fontWeight: '700', fontSize: '13px' }, text: '★ ' + p.avgRating.toFixed(1) }));
      link.appendChild(el('span', { style: { fontSize: '11px', color: '#666' }, text: '(' + p.reviewCount + ')' }));
    } else {
      link.appendChild(el('span', { style: { fontSize: '12px', color: '#666' }, text: 'No reviews yet' }));
    }
    link.addEventListener('click', function () {
      trackClick('reviews_badge_click');
    });
    container.appendChild(link);
  }

  function renderReviews(data) {
    var p = data.provider;
    var badge = el('div', { style: { display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' } });
    if (p.avgRating) {
      badge.appendChild(el('span', { style: { fontWeight: '700', fontSize: '14px' }, text: '★ ' + p.avgRating.toFixed(1) }));
      badge.appendChild(el('span', { style: { fontSize: '12px', color: '#666' }, text: '(' + p.reviewCount + ' reviews)' }));
    }
    container.appendChild(badge);

    var list = el('div', { style: { display: 'grid', gap: '10px', maxHeight: '360px', overflowY: 'auto' } });
    (data.reviews || []).forEach(function (review) {
      var item = el('div', { style: { borderBottom: '1px solid #eee', paddingBottom: '10px' } });
      item.appendChild(el('p', { style: { margin: '0 0 2px', fontSize: '13px', fontWeight: '600' }, text: '★'.repeat(review.rating) + ' ' + review.reviewerName }));
      if (review.comment) {
        item.appendChild(el('p', { style: { margin: 0, fontSize: '13px', color: '#444' }, text: review.comment }));
      }
      list.appendChild(item);
    });
    container.appendChild(list);

    var link = el('a', {
      href: SITE + '/providers/' + encodeURIComponent(p.slug || p.id) + '?source=embed&originDomain=' + encodeURIComponent(originDomain() || ''),
      target: '_blank',
      rel: 'noopener noreferrer',
      style: { display: 'inline-block', marginTop: '10px', fontSize: '12px', color: accent, fontWeight: '600', textDecoration: 'none' },
      text: 'See all reviews on ServicePros',
    });
    link.addEventListener('click', function () {
      trackClick('reviews_link_click');
    });
    container.appendChild(link);
  }

  var url = SITE + '/api/embed/' + encodeURIComponent(providerId) + '/data?mode=' + encodeURIComponent(mode);
  var od = originDomain();
  if (od) url += '&originDomain=' + encodeURIComponent(od);

  fetch(url)
    .then(function (res) { return res.json(); })
    .then(function (data) {
      if (data.error === 'unavailable') {
        renderError('This provider is temporarily unavailable.');
        return;
      }
      if (data.error) {
        renderError('Unable to load right now.');
        return;
      }
      if (mode === 'services') renderServices(data);
      else if (mode === 'card') renderCard(data);
      else if (mode === 'reviews' && variant === 'badge') renderReviewsBadge(data);
      else if (mode === 'reviews') renderReviews(data);
    })
    .catch(function () {
      renderError('Unable to load right now.');
    });
})();
`
}

export async function GET() {
  return new NextResponse(scriptBody(SITE_URL), {
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
      'Access-Control-Allow-Origin': '*',
    },
  })
}
