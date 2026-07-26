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

  // ---- iOS Safari 対策（重要）----
  // 実機 iPhone では、document 側にタッチリスナが無いと Safari が
  // スクロールをコンポジタスレッドの「高速パス」で処理し、track の
  // 非passive touchmove の preventDefault が効かず横スワイプが奪われる。
  // document / capture 段階に（空でよいので）タッチリスナを張ると
  // タッチ処理がメインスレッド経由になり、スワイプ移動が機能する。
  // （実機で挙動確認済み。パネル無しでも効くよう本体へ移植）
  var noop = function () {};
  document.addEventListener('touchstart', noop, { capture: true, passive: true });
  document.addEventListener('touchmove', noop, { capture: true, passive: true });
  document.addEventListener('touchend', noop, { capture: true, passive: true });

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

/* =========================================================
   AREA MODAL  エリア詳細モーダル
   ※ lead / data のテキストは仮原稿。後で差し替え可。
   ========================================================= */
(function () {
  var AREAS = {
    naka: {
      name: '那賀町',
      img: 'img/nalp10.jpg',
      lead: [
        '徳島県南部の山間に位置する那賀町は、町の面積の約95％を森林が占める、自然に抱かれた町です。清流・那賀川が町の中央を流れ、四季折々の表情を見せてくれます。',
        'キャンプやカヌー、釣りといったアウトドアが日常の延長にあり、子どもをのびのびと育てたい家族に選ばれています。',
        '小さな集落ごとに人と人の距離が近く、移住後も地域の輪に自然と入っていける温かさがあります。'
      ],
      list: [
        '面積の約95％が森林の自然環境',
        '清流・那賀川でのアウトドアが身近',
        '子育て世代への移住支援が充実',
        '集落単位で地域との距離が近い',
        '星空や紅葉など四季の景観が美しい'
      ],
      data: [
        ['人口', '約7,600人'],
        ['アクセス', '徳島市中心部から車で約1時間'],
        ['主な施設', 'こども園・小中学校・診療所・道の駅'],
        ['特色', '林業・ゆず・アウトドア観光']
      ]
    },
    anan: {
      name: '阿南市',
      img: 'img/nalp21.jpg',
      lead: [
        '徳島県南部で最大の都市・阿南市は、暮らしに必要なものがひととおり揃う、移住初心者にも安心のエリアです。',
        'スーパーや病院、商業施設が充実し、徳島市へのアクセスも良好。海に面した立地で、休日には海辺の暮らしも楽しめます。',
        '都市の利便性と自然の豊かさのバランスがよく、はじめての地方移住の一歩として選ばれています。'
      ],
      list: [
        '徳島県南部で最大の都市',
        'スーパー・病院・商業施設が充実',
        '徳島市へのアクセスが良好',
        '海辺の暮らしも楽しめる立地',
        '子育て・医療環境が整っている'
      ],
      data: [
        ['人口', '約6.7万人'],
        ['アクセス', '徳島市中心部から車で約40分'],
        ['主な施設', '総合病院・大型商業施設・各種学校'],
        ['特色', '光関連産業・漁業・温暖な気候']
      ]
    },
    minami: {
      name: '美波町',
      img: 'img/nalp1.jpg',
      lead: [
        'ウミガメが産卵に訪れる大浜海岸で知られる美波町は、海とともに暮らす日々が叶う町です。',
        'サーフィンや釣りが身近にあり、歴史ある町並みが残る一方で、医療・教育環境も整っています。',
        'サテライトオフィスの誘致など新しい働き方の受け入れも進み、移住者コミュニティが育っています。'
      ],
      list: [
        'ウミガメが産卵する大浜海岸',
        'サーフィン・釣りが日常の一部に',
        '情緒ある歴史的な町並み',
        '医療・教育環境も充実',
        'サテライトオフィスなど新しい働き方'
      ],
      data: [
        ['人口', '約6,300人'],
        ['アクセス', '徳島市中心部から車で約1時間'],
        ['主な施設', '病院・小中学校・図書館・道の駅'],
        ['特色', '漁業・サーフィン文化・IT誘致']
      ]
    },
    mugi: {
      name: '牟岐町',
      img: 'img/nalp9.jpg',
      lead: [
        '牟岐町は、美しい漁村の風景とゆったりとした時間が流れる、コンパクトで暮らしやすい町です。',
        '水揚げされたばかりの新鮮な魚介が食卓に並び、海の恵みを日々感じられます。',
        '町がコンパクトなぶん顔の見える関係が築きやすく、地域コミュニティの活動も活発です。'
      ],
      list: [
        '心和む美しい漁村風景',
        '水揚げしたての新鮮な魚介',
        'コンパクトで暮らしやすい町',
        '地域コミュニティが活発',
        '出羽島など離島の魅力も身近'
      ],
      data: [
        ['人口', '約3,700人'],
        ['アクセス', '徳島市中心部から車で約1時間10分'],
        ['主な施設', '診療所・小中学校・漁協・港'],
        ['特色', '漁業・離島観光・移住交流']
      ]
    },
    kaiyo: {
      name: '海陽町',
      img: 'img/nalp12.jpg',
      lead: [
        '徳島県の最南端に位置する海陽町は、豊かな自然を楽しみながら、新しいことに挑戦できる環境が魅力です。',
        '国内有数のサーフスポットとして知られる宍喰エリアの海が広がり、全国から人が集まります。',
        '線路と道路の両方を走るDMVの運行エリアでもあり、若い移住者や起業を志す人も増えています。'
      ],
      list: [
        '全国屈指のサーフスポット',
        '透明度の高い宍喰エリアの海',
        'DMV（世界初の実用運行）エリア',
        '若い移住者・起業家が増加中',
        '山と海の両方の自然を満喫'
      ],
      data: [
        ['人口', '約8,600人'],
        ['アクセス', '徳島市中心部から車で約1時間20分'],
        ['主な施設', '病院・高校・道の駅・サーフ施設'],
        ['特色', 'サーフィン・DMV・海洋レジャー']
      ]
    }
  };

  var modal   = document.getElementById('areaModal');
  if (!modal) return;
  var elImg   = document.getElementById('areaModalImg');
  var elTitle = document.getElementById('areaModalTitle');
  var elLead  = document.getElementById('areaModalLead');
  var elList  = document.getElementById('areaModalList');
  var elData  = document.getElementById('areaModalData');
  var dialog  = modal.querySelector('.area-modal__dialog');
  var lastFocused = null;

  function render(area) {
    elImg.src = area.img;
    elImg.alt = area.name;
    elTitle.textContent = area.name;

    elLead.innerHTML = '';
    area.lead.forEach(function (p) {
      var el = document.createElement('p');
      el.textContent = p;
      elLead.appendChild(el);
    });

    elList.innerHTML = '';
    area.list.forEach(function (item) {
      var li = document.createElement('li');
      li.textContent = item;
      elList.appendChild(li);
    });

    elData.innerHTML = '';
    area.data.forEach(function (row) {
      var dt = document.createElement('dt');
      dt.textContent = row[0];
      var dd = document.createElement('dd');
      dd.textContent = row[1];
      elData.appendChild(dt);
      elData.appendChild(dd);
    });
  }

  function open(area) {
    render(area);
    lastFocused = document.activeElement;
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-lock');
    dialog.scrollTop = 0;
    modal.querySelector('.area-modal__close').focus();
  }

  function close() {
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-lock');
    if (lastFocused && lastFocused.focus) lastFocused.focus();
  }

  // カード（複製カード含む）のボタンをイベント委譲で拾う
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('.area-card__link[data-area]');
    if (btn) {
      var area = AREAS[btn.getAttribute('data-area')];
      if (area) open(area);
      return;
    }
    if (e.target.closest('[data-modal-close]')) close();
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && modal.classList.contains('is-open')) close();
  });
})();
