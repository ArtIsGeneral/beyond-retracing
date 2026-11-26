(() => {
  const groups = [
    ['unseen', 'Goal unseen up to the key step'],
    ['earlier', 'Goal seen earlier, out of view at the key step'],
    ['visible', 'Goal in view at the key step']
  ];
  const rows = document.getElementById('shortcut-rows');
  const dialog = document.getElementById('expanded-replay');
  const largePlayer = dialog.querySelector('video');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const visible = new Set();
  let expandedFrom;

  function element(tag, className, text) {
    const node = document.createElement(tag);
    node.className = className;
    if (text) node.textContent = text;
    return node;
  }
  function load(video) {
    if (!video.hasAttribute('src')) video.src = video.dataset.src;
  }
  function preview(video) {
    if (document.hidden || dialog.open) return;
    load(video);
    if (!motion.matches) video.play().catch(() => {});
  }
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      const video = entry.target;
      if (entry.isIntersecting && entry.intersectionRatio >= .48) {
        visible.add(video);
        preview(video);
      } else {
        visible.delete(video);
        video.pause();
      }
    }
  }, {threshold:[0, .48]});
  document.addEventListener('visibilitychange', () => {
    for (const video of visible) document.hidden ? video.pause() : preview(video);
  });

  function caseCard(item) {
    const number = String(item.id).padStart(2,'0');
    const path = 'assets/shortcuts/' + number;
    const card = element('article','clip');
    const video = element('video','case-video');
    video.defaultMuted = video.muted = true;
    video.controls = video.loop = video.playsInline = true;
    video.preload = 'none';
    video.poster = path + '.jpg';
    video.dataset.src = path + '.mp4';
    video.setAttribute('aria-label','Case ' + number + ', goal ' + item.goal);
    const caption = element('div','clip-caption');
    const name = 'Case ' + number + ' · Key step ' + item.keyStep;
    const expand = element('button','expand','Expand ↗');
    expand.type = 'button';
    expand.setAttribute('aria-label','Expand ' + name);
    card.dataset.title = name;
    caption.append(element('span','',name),expand);
    card.append(video,caption);
    return card;
  }

  rows.addEventListener('click', event => {
    const button = event.target.closest('.expand');
    if (!button) return;
    const card = button.closest('.clip');
    expandedFrom = card.querySelector('video');
    for (const video of visible) video.pause();
    document.getElementById('expanded-title').textContent = card.dataset.title;
    largePlayer.src = expandedFrom.dataset.src;
    largePlayer.currentTime = expandedFrom.currentTime;
    dialog.showModal();
    largePlayer.play().catch(() => {});
  });
  document.getElementById('close-replay').onclick = () => dialog.close();
  dialog.addEventListener('close', () => {
    largePlayer.pause();
    if (Number.isFinite(largePlayer.duration)) expandedFrom.currentTime = largePlayer.currentTime;
    largePlayer.removeAttribute('src');
    largePlayer.load();
    visible.forEach(preview);
  });

  for (const [id,title] of groups) {
    const cases = window.shortcutCases.filter(item => item.group === id).sort((a,b) => a.id-b.id);
    const row = element('section','gallery-row');
    const heading = element('h3','','' + title);
    heading.id = 'title-' + id;
    heading.append(element('span','case-count',cases.length + ' cases'));
    row.setAttribute('aria-labelledby',heading.id);
    const rail = element('div','case-carousel');
    rail.append(...cases.map(caseCard));
    row.append(heading,rail);
    rows.append(row);

    // Slick recreates cloned slides at breakpoints. Only run clips visible on screen.
    const $rail = $(rail);
    let observed = [];
    function observeSlides() {
      for (const video of observed) {
        observer.unobserve(video);
        visible.delete(video);
        video.pause();
      }
      observed = Array.from(rail.querySelectorAll('video'));
      observed.forEach(video => observer.observe(video));
    }
    $rail.on('init reInit breakpoint',observeSlides);
    $rail.slick({
      slidesToShow:3, slidesToScroll:1, infinite:true, autoplay:false,
      dots:true, draggable:false, touchMove:true, speed:motion.matches ? 0 : 330,
      prevArrow:'<button type="button" class="slick-prev" aria-label="Previous case">‹</button>',
      nextArrow:'<button type="button" class="slick-next" aria-label="Next case">›</button>',
      responsive:[{breakpoint:900,settings:{slidesToShow:2}},
                  {breakpoint:500,settings:{slidesToShow:1}}]
    });
  }
})();
