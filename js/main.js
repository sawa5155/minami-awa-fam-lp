/* =========================================================
   みなみ阿波 FAMツアー LP  スクリプト
   1) 出現アニメーション（スクロール連動 / IntersectionObserver）
   2) エリア紹介カルーセル
   ========================================================= */

/* ---------------------------------------------------------
   1) 出現アニメーション
   - <html> に .js を付与して、CSS 側の初期非表示を有効化
     （JS 無効時はコンテンツが表示されたままになるフォールバック）
   - [data-reveal] / [data-reveal-group] を画面内に入った時点で表示
--------------------------------------------------------- */
(function () {
  var docEl = document.documentElement;
  docEl.classList.add('js');

  function revealAll(targets) {
    Array.prototype.forEach.call(targets, function (el) {
      el.classList.add('is-in');
    });
  }

  function initReveal() {
    var targets = document.querySelectorAll('[data-reveal], [data-reveal-group]');
    if (!targets.length) return;

    // 未対応ブラウザ / モーション低減設定では即時表示
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || !('IntersectionObserver' in window)) {
      revealAll(targets);
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          io.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.15,
      rootMargin: '0px 0px -8% 0px'
    });

    Array.prototype.forEach.call(targets, function (el) {
      io.observe(el);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initReveal);
  } else {
    initReveal();
  }
})();

/* ---------------------------------------------------------
   2) ヘッダーのアンカーリンク：スムーズスクロール
   - ヘッダー内の #〜 リンクをクリックしたとき、即ジャンプではなく
     なめらかにスクロールさせる（固定ヘッダーの高さぶんオフセット）
   - href="#" はページ先頭へスクロール
--------------------------------------------------------- */
(function () {
  var header = document.querySelector('.header');
  var links = document.querySelectorAll('.header a[href^="#"]');
  if (!links.length) return;

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  Array.prototype.forEach.call(links, function (link) {
    link.addEventListener('click', function (e) {
      var href = link.getAttribute('href');
      var target = (href === '#') ? null : document.querySelector(href);

      // href="#" 以外で該当要素が無ければ通常動作に任せる
      if (href !== '#' && !target) return;

      e.preventDefault();

      var headerH = header ? header.offsetHeight : 0;
      var top = target
        ? target.getBoundingClientRect().top + window.pageYOffset - headerH
        : 0;

      window.scrollTo({
        top: Math.max(top, 0),
        behavior: reduce ? 'auto' : 'smooth'
      });
    });
  });
})();

/* ---------------------------------------------------------
   2.5) モバイル用ハンバーガーメニュー
   - .gnav__toggle クリックで .header に .is-open をトグル
   - メニュー内リンククリック / 画面外タップ / Esc で閉じる
--------------------------------------------------------- */
(function () {
  var header = document.querySelector('.header');
  var toggle = document.querySelector('.gnav__toggle');
  var gnav = document.querySelector('.gnav');
  if (!header || !toggle || !gnav) return;

  function setOpen(open) {
    header.classList.toggle('is-open', open);
    document.body.style.overflow = open ? 'hidden' : '';
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    toggle.setAttribute('aria-label', open ? 'メニューを閉じる' : 'メニューを開く');
  }

  toggle.addEventListener('click', function (e) {
    e.stopPropagation();
    setOpen(!header.classList.contains('is-open'));
  });

  // メニュー内のリンクを押したら閉じる
  gnav.addEventListener('click', function (e) {
    if (e.target.closest('a')) setOpen(false);
  });

  // 画面外タップで閉じる
  document.addEventListener('click', function (e) {
    if (!header.classList.contains('is-open')) return;
    if (!e.target.closest('.header')) setOpen(false);
  });

  // Escで閉じる
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') setOpen(false);
  });
})();

/* ---------------------------------------------------------
   3) エリア紹介カルーセル（transform方式の無限ループ／揺れなし）
--------------------------------------------------------- */
(function () {
  var viewport = document.querySelector('.area__viewport');
  var track = document.querySelector('.area__track');
  var prev = document.querySelector('.area__arrow--prev');
  var next = document.querySelector('.area__arrow--next');
  if (!viewport || !track) return;

  var originals = Array.prototype.slice.call(track.querySelectorAll('.area-card'));
  var N = originals.length;
  if (N === 0) return;

  // 前後に原本を複製してループ用バッファを作る（[複製N][原本N][複製N]）
  var before = document.createDocumentFragment();
  var after = document.createDocumentFragment();
  originals.forEach(function (c) {
    before.appendChild(c.cloneNode(true));
    after.appendChild(c.cloneNode(true));
  });
  track.insertBefore(before, track.firstChild);
  track.appendChild(after);

  var cards = Array.prototype.slice.call(track.querySelectorAll('.area-card'));
  var index = N + 2;   // 初期表示は3つ目の原本を中央に
  var curTx = 0;
  var EASE = 'transform .45s cubic-bezier(.22,.61,.36,1)';

  // カード i を中央に置くための translateX
  function txFor(i) {
    var c = cards[i];
    return viewport.clientWidth / 2 - (c.offsetLeft + c.offsetWidth / 2);
  }
  function apply(tx, animate) {
    curTx = tx;
    track.style.transition = animate ? EASE : 'none';
    track.style.transform = 'translate3d(' + tx + 'px,0,0)';
  }
  // 複製ゾーンにいたら、対応する原本へ「静止状態・アニメ無し」で瞬間移動（＝不可視）
  function normalize() {
    if (index < N) index += N;
    else if (index >= 2 * N) index -= N;
    apply(txFor(index), false);
  }
  // 1枚送る：先に原本へ正規化（不可視）→ 1枚ぶんだけアニメ
  function step(dir) {
    normalize();
    void track.offsetWidth; // 正規化を確定させてからアニメ開始
    index += dir;
    apply(txFor(index), true);
  }

  next && next.addEventListener('click', function () { step(1); });
  prev && prev.addEventListener('click', function () { step(-1); });

  // アニメ終了後、複製ゾーンに入っていたら原本へ補正（静止中なので揺れない）
  track.addEventListener('transitionend', function (e) {
    if (e.propertyName === 'transform') normalize();
  });

  // ---- 自由移動（ドラッグ／横ホイール）共通ヘルパー ----
  function pWidth() { return cards[N].offsetLeft - cards[0].offsetLeft; } // 1セット幅
  function setTx(tx) { // アニメ無しで反映
    curTx = tx;
    track.style.transition = 'none';
    track.style.transform = 'translate3d(' + tx + 'px,0,0)';
  }
  function nearestToCenter() {
    var vc = viewport.clientWidth / 2, ni = 0, best = Infinity;
    for (var i = 0; i < cards.length; i++) {
      var cc = cards[i].offsetLeft + cards[i].offsetWidth / 2 + curTx;
      var d = Math.abs(cc - vc);
      if (d < best) { best = d; ni = i; }
    }
    return ni;
  }
  // 移動中：中央カードが複製ゾーンに入ったら1セット分ずらして原本へ（同一絵柄なので不可視）
  function wrap() {
    var ni = nearestToCenter();
    if (ni < N) curTx -= pWidth();
    else if (ni >= 2 * N) curTx += pWidth();
    else return;
    track.style.transform = 'translate3d(' + curTx + 'px,0,0)';
  }
  function snap() {
    index = nearestToCenter();
    apply(txFor(index), true);
  }

  // ドラッグ / スワイプ（増分方式で連続追従）
  // dxTotal: 指の総移動量（符号付き）／ indexDown: ドラッグ開始時に中央だったカード
  var dragging = false, lastX = 0, movedDist = 0, moved = false, dxTotal = 0, indexDown = 0;
  var FLICK = 30; // これ以上の横移動は「フリック」とみなし1枚送る（半カード未満でもスライド）
  function down(e) {
    dragging = true; movedDist = 0; moved = false; dxTotal = 0;
    indexDown = nearestToCenter();
    lastX = (e.touches ? e.touches[0].clientX : e.clientX);
    track.style.transition = 'none';
  }
  function moveDrag(e) {
    if (!dragging) return;
    var x = (e.touches ? e.touches[0].clientX : e.clientX);
    var dx = x - lastX; lastX = x;
    dxTotal += dx;
    movedDist += Math.abs(dx);
    if (movedDist > 3) moved = true;
    setTx(curTx + dx);
    wrap();
    if (e.touches && e.cancelable) e.preventDefault();
  }
  function up() {
    if (!dragging) return;
    dragging = false;
    var ni = nearestToCenter();
    // 半カードに届かず中央カードが変わらなかった場合でも、
    // ある程度の横フリックがあれば指の向きに1枚送る（＝ボタンと同じ挙動）
    if (ni === indexDown && Math.abs(dxTotal) > FLICK) {
      index = indexDown + (dxTotal < 0 ? 1 : -1); // 左スワイプ=次 / 右スワイプ=前
      apply(txFor(index), true);
    } else {
      snap();
    }
  }
  track.addEventListener('mousedown', down);
  window.addEventListener('mousemove', moveDrag);
  window.addEventListener('mouseup', up);
  track.addEventListener('touchstart', down, { passive: true });
  track.addEventListener('touchmove', moveDrag, { passive: false });
  track.addEventListener('touchend', up);
  // ドラッグ直後のリンク誤クリックを抑止
  track.addEventListener('click', function (e) { if (moved) { e.preventDefault(); e.stopPropagation(); } }, true);

  // 横ホイール／トラックパッド横スワイプ：指の動きに連続追従 → 停止で最寄りにスナップ
  var wheelIdle;
  viewport.addEventListener('wheel', function (e) {
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return; // 横方向の意図のみ
    e.preventDefault();
    setTx(curTx - e.deltaX);
    wrap();
    clearTimeout(wheelIdle);
    wheelIdle = setTimeout(snap, 110);
  }, { passive: false });

  // 初期配置（レイアウト確定後）
  requestAnimationFrame(function () { apply(txFor(index), false); });
  window.addEventListener('resize', function () { apply(txFor(index), false); });
})();
