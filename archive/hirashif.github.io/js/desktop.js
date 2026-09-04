(function () {
  'use strict';

  var mq = window.matchMedia('(max-width: 820px)');
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var desktop = document.getElementById('desktop');
  var windows = Array.prototype.slice.call(document.querySelectorAll('.window'));
  var zTop = 10;

  // ---------- clock ----------
  var clock = document.getElementById('clock');
  function tick() {
    var now = new Date();
    var days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    var h = now.getHours();
    var ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    var m = String(now.getMinutes()).padStart(2, '0');
    clock.textContent = days[now.getDay()] + ' ' + months[now.getMonth()] + ' ' + now.getDate() +
      '  ' + h + ':' + m + ' ' + ampm + '  ·  Dallas, TX';
  }
  if (clock) { tick(); setInterval(tick, 15000); }

  // ---------- placement (runs on load and whenever the breakpoint flips) ----------
  function place() {
    windows.forEach(function (win) {
      if (mq.matches) {
        win.style.left = '';
        win.style.top = '';
      } else if (win.dataset.x || win.dataset.right) {
        var maxLeft = Math.max(8, desktop.clientWidth - win.offsetWidth - 16);
        var maxTop = Math.max(8, desktop.clientHeight - 120);
        var left = win.dataset.right !== undefined
          ? desktop.clientWidth - win.offsetWidth - parseInt(win.dataset.right, 10)
          : parseInt(win.dataset.x, 10);
        win.style.left = Math.min(Math.max(8, left), maxLeft) + 'px';
        win.style.top = Math.min(parseInt(win.dataset.y, 10), maxTop) + 'px';
        if (!win.style.zIndex) win.style.zIndex = ++zTop;
      }
    });
  }
  place();
  window.addEventListener('resize', place);
  if (mq.addEventListener) mq.addEventListener('change', place);
  else if (mq.addListener) mq.addListener(place);

  windows.forEach(function (win, i) {
    setTimeout(function () { win.classList.add('placed'); }, reducedMotion ? 0 : 120 + i * 110);
  });

  function focusWindow(win) {
    win.style.zIndex = ++zTop;
  }

  function pulse(win) {
    if (reducedMotion) return;
    win.classList.remove('pulse');
    void win.offsetWidth;
    win.classList.add('pulse');
    win.addEventListener('animationend', function handler() {
      win.classList.remove('pulse');
      win.removeEventListener('animationend', handler);
    });
  }

  function hideWindow(win) {
    if (mq.matches) return;
    if (reducedMotion) { win.classList.add('closed'); return; }
    win.classList.add('minimizing');
    setTimeout(function () {
      win.classList.add('closed');
      win.classList.remove('minimizing');
    }, 250);
  }

  function openWindow(id) {
    var win = document.getElementById(id);
    if (!win) return;
    var wasClosed = win.classList.contains('closed');
    win.classList.remove('closed');
    focusWindow(win);
    if (mq.matches) {
      win.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
      return;
    }
    if (wasClosed && !reducedMotion) {
      win.classList.remove('placed');
      void win.offsetWidth;
      win.classList.add('placed');
    } else {
      pulse(win);
    }
  }

  // ---------- dragging ----------
  windows.forEach(function (win) {
    var bar = win.querySelector('.titlebar');
    if (!bar) return;

    win.addEventListener('pointerdown', function () {
      if (!mq.matches) focusWindow(win);
    });

    bar.addEventListener('pointerdown', function (e) {
      if (mq.matches) return;
      if (e.target.closest('[data-close], [data-min], [data-zoom]')) return;
      e.preventDefault();
      focusWindow(win);
      win.classList.add('dragging');

      var startX = e.clientX;
      var startY = e.clientY;
      var origLeft = win.offsetLeft;
      var origTop = win.offsetTop;
      var maxLeft = desktop.clientWidth - 80;
      var maxTop = desktop.clientHeight - 40;

      function onMove(ev) {
        var left = origLeft + (ev.clientX - startX);
        var top = origTop + (ev.clientY - startY);
        win.style.left = Math.min(Math.max(left, 80 - win.offsetWidth), maxLeft) + 'px';
        win.style.top = Math.min(Math.max(top, 0), maxTop) + 'px';
      }
      function onUp() {
        win.classList.remove('dragging');
        document.removeEventListener('pointermove', onMove);
        document.removeEventListener('pointerup', onUp);
      }
      document.addEventListener('pointermove', onMove);
      document.addEventListener('pointerup', onUp);
    });
  });

  // ---------- close / minimize / zoom / reopen ----------
  document.querySelectorAll('[data-close], [data-min]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      hideWindow(btn.closest('.window'));
    });
  });

  // zoom enlarges the window in place (clamped to the desktop) and stays draggable;
  // clicking again restores the geometry it had before.
  document.querySelectorAll('[data-zoom]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      if (mq.matches) return;
      var win = btn.closest('.window');
      focusWindow(win);
      if (win.classList.contains('zoomed')) {
        // restore without animating: the saved width may be a calc() the transition can't interpolate
        win.classList.add('dragging');
        win.style.width = win.dataset.prevWidth;
        win.style.left = win.dataset.prevLeft;
        win.style.top = win.dataset.prevTop;
        win.classList.remove('zoomed');
        void win.offsetWidth;
        win.classList.remove('dragging');
        return;
      }
      win.dataset.prevWidth = win.style.width;
      win.dataset.prevLeft = win.style.left;
      win.dataset.prevTop = win.style.top;
      // snapshot the current size in px so the width transition has a real start value
      win.style.width = win.offsetWidth + 'px';
      void win.offsetWidth;
      // cascade: each additional zoomed window steps 28px down and right so they never stack exactly
      var n = document.querySelectorAll('.window.zoomed').length;
      var step = 28 * n;
      var w = Math.min(1200, desktop.clientWidth - 64) - step;
      var left = Math.max(8 + step, Math.min(win.offsetLeft, desktop.clientWidth - w - 16));
      var top = Math.max(8 + step, Math.min(win.offsetTop, 24 + step));
      win.classList.add('zoomed');
      win.style.width = w + 'px';
      win.style.left = left + 'px';
      win.style.top = top + 'px';
    });
  });

  document.querySelectorAll('[data-open]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      if (!mq.matches && btn.classList.contains('dock-item') && !reducedMotion) {
        btn.classList.remove('bouncing');
        void btn.offsetWidth;
        btn.classList.add('bouncing');
        btn.addEventListener('animationend', function handler() {
          btn.classList.remove('bouncing');
          btn.removeEventListener('animationend', handler);
        });
      }
      openWindow(btn.dataset.open);
    });
  });

  // ---------- terminal typing ----------
  var term = document.getElementById('terminal-body');
  if (term && !reducedMotion && !mq.matches) {
    var lines = Array.prototype.slice.call(term.querySelectorAll('.t-line'));
    term.classList.add('typing');
    lines.forEach(function (line, i) {
      setTimeout(function () {
        line.classList.add('shown');
        if (i === lines.length - 1) term.classList.remove('typing');
      }, 450 + i * 260);
    });
  }

  // ---------- github contributions graph ----------
  var gh = document.getElementById('gh-graph');
  if (gh && window.fetch) {
    fetch('https://github-contributions-api.jogruber.de/v4/hirashif?y=last')
      .then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); })
      .then(function (data) {
        var days = data.contributions || [];
        if (!days.length) throw new Error('empty');
        // align to weeks: pad so the first column starts on a Sunday
        var first = new Date(days[0].date + 'T00:00:00');
        var pad = first.getDay();
        var grid = document.createElement('div');
        grid.className = 'gh-grid';
        for (var i = 0; i < pad; i++) {
          var e = document.createElement('span'); e.className = 'gh-cell'; e.style.visibility = 'hidden'; grid.appendChild(e);
        }
        days.forEach(function (d) {
          var c = document.createElement('span');
          c.className = 'gh-cell' + (d.level ? ' l' + d.level : '');
          c.title = d.count + (d.count === 1 ? ' contribution on ' : ' contributions on ') + d.date;
          grid.appendChild(c);
        });
        var total = (data.total && data.total.lastYear) || days.reduce(function (a, d) { return a + d.count; }, 0);
        var meta = document.createElement('div');
        meta.className = 'gh-meta';
        meta.innerHTML = total.toLocaleString() + ' contributions / last year · <a href="https://github.com/hirashif">github.com/hirashif</a>';
        gh.innerHTML = '';
        gh.appendChild(grid);
        gh.appendChild(meta);
      })
      .catch(function () {
        gh.innerHTML = '<a href="https://github.com/hirashif">github.com/hirashif</a>';
      });
  }
})();
