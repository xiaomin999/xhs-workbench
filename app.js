/* 红算子 · 小红书运营 AI 工作台 —— 交互脚本 */
(function () {
  'use strict';

  /* ---------- 移动端菜单 ---------- */
  var nav = document.getElementById('nav');
  var navToggle = document.getElementById('navToggle');
  if (navToggle) {
    navToggle.addEventListener('click', function () {
      nav.classList.toggle('is-open');
    });
    nav.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') nav.classList.remove('is-open');
    });
  }

  /* ---------- 滚动进场 ---------- */
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (en.isIntersecting) {
        en.target.classList.add('in');
        io.unobserve(en.target);
      }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('.reveal').forEach(function (el, i) {
    el.style.transitionDelay = (i % 6) * 55 + 'ms';
    io.observe(el);
  });

  /* ---------- 工具筛选 ---------- */
  var filters = document.getElementById('filters');
  if (filters) {
    filters.addEventListener('click', function (e) {
      var btn = e.target.closest('.chip');
      if (!btn) return;
      var f = btn.dataset.f;
      filters.querySelectorAll('.chip').forEach(function (c) { c.classList.remove('is-on'); });
      btn.classList.add('is-on');
      document.querySelectorAll('#toolGrid .tool').forEach(function (t) {
        t.classList.toggle('hide', f !== 'all' && t.dataset.c !== f);
      });
    });
  }

  /* ---------- 四阶段路线图 ---------- */
  var STAGES = {
    1: {
      title: '第一阶段 · 起步与基线验证',
      desc: '先把账号和店铺基础弄好，想清楚账号服务谁，再建立对标账号库和爆款样本库。' +
            '然后从候选方向里选出第一批测试商品，给内容定好测试目标，完成两轮测试，' +
            '最后记下属于自己账号的曝光、点击、互动和转化起点。',
      goal: '不是马上找到所谓“必爆品”，而是留下账号定位、样本库、测试商品池、两轮测试记录和一份数据基线。',
      do: [
        '确定账号服务谁：类目、人群、场景三件套写清楚',
        '建立对标账号库：20 个高价值账号，先检查近期是否活跃',
        '建立爆款样本库：20 篇垂直样本，逐条打标签',
        '选出 3~5 个第一批测试商品，并写明为什么测它',
        '给内容定测试目标，完成两轮测试',
        '记录曝光、点击、互动、转化四项起点数据'
      ],
      deliver: ['账号定位一句话', '20 个对标档案', '20 篇垂直样本', '3~5 个测试商品清单', '两轮测试记录', '账号数据基线表'],
      ai: 'AI 可以按类目、人群、场景批量搜集候选账号、整理样本标签、写测试内容初稿；但“够不够同类目、同人群、够不够高价值”，由你确认。'
    },
    2: {
      title: '第二阶段 · 产品 × 内容模型验证',
      desc: '不是重新找一批商品从头来过。先看第一阶段测过的商品，分别标记继续测试、观察或暂停，' +
            '再去验证具体人群、使用场景、用户痛点、内容角度、封面和标题。',
      goal: '找到第一套可以继续跑的组合：什么商品适合这个账号，哪类人愿意看，什么场景和痛点更容易把内容和商品连接起来。',
      do: [
        '给已测商品重新分级：继续测试 / 观察 / 暂停',
        '一次只改一个变量，才能知道是什么起了作用',
        '分清“内容没把商品接住”还是“商品页、价格、用户顾虑没处理好”',
        '某个方向连续表现弱就先停',
        '重复出现好信号的组合才值得继续投入'
      ],
      deliver: ['有效组合清单', '暂停方向清单', '变量对照记录', '场景与痛点池'],
      ai: 'AI 生成多版本封面与标题、整理每轮数据对照表；什么时候该停、什么时候加码，只能你来拍板。'
    },
    3: {
      title: '第三阶段 · 爆款复制与稳定转化',
      desc: '一条内容跑得好，可能只是碰巧。这一阶段要把它拆开，看清到底是封面、标题、内容角度、商品，' +
            '还是某个具体场景起了作用，之后每次只改一个地方继续测试。',
      goal: '让结果可以反复出现，而不是留下一张偶然跑好的数据截图。',
      do: [
        '拆解那条跑好的内容：哪一部分真起了作用',
        '每次只改一处，继续跑下一轮',
        '有效封面整理成模板，点击好的标题留下写法',
        '跑得动的选题、人群、场景放进自己的选题库',
        '评论区反复出现的问题，变成下一批内容',
        '检查商品为什么有点击却没有继续成交'
      ],
      deliver: ['内容模板库', '素材库', '选题库', '转化方法手记'],
      ai: 'AI 拆解结构、批量出变体、整理评论需求；哪条配得上“跑出来了”，用你自己的基线数据说话。'
    },
    4: {
      title: '第四阶段 · 规模化矩阵',
      desc: '单账号还没跑稳，不要急着开一堆新号。先检查现有模型能不能复制，' +
            '再给不同账号分清人群、内容和商品职责，安排内容节奏、人员分工和共享素材。',
      goal: '把已验证的方法，变成多人、多账号也能稳定执行的流程。规模化不是把同一条内容多发几遍。',
      do: [
        '先确认现有模型具备可复制性',
        '给不同账号分派人群、内容、商品职责',
        '安排内容节奏、人员分工与共享素材',
        '定期检查账号、内容、商品、售后异常',
        '每周看整体表现，每月决定加码 / 优化 / 暂停'
      ],
      deliver: ['账号地图', '商品分配表', '内容排期', '岗位 SOP', '共享素材库', '经营复盘'],
      ai: 'AI 做排期、处理重复素材、巡检异常并提醒；账号风险和最终取舍，永远由人负责。'
    }
  };

  var panel = document.getElementById('rmPanel');
  var tabsEl = document.getElementById('rmTabs');

  function renderStage(k) {
    var s = STAGES[k];
    if (!s) return;
    panel.innerHTML =
      '<div class="rm-top">' +
        '<div class="rm-title"><h3>' + s.title + '</h3><p>' + s.desc + '</p></div>' +
        '<div class="rm-goal"><b>这一阶段要留下什么</b>' + s.goal + '</div>' +
      '</div>' +
      '<div class="rm-body">' +
        '<div class="rm-block"><h5>按顺序执行</h5><ul class="rm-do">' +
          s.do.map(function (d, i) {
            return '<li><span class="n">' + (i + 1) + '</span><span>' + d + '</span></li>';
          }).join('') +
        '</ul></div>' +
        '<div class="rm-block">' +
          '<div class="rm-deliver"><strong>阶段成果（未留档不算完成）</strong><ul>' +
            s.deliver.map(function (d) { return '<li>' + d + '</li>'; }).join('') +
          '</ul></div>' +
          '<div class="rm-ai"><b>AI 接手的部分 · </b>' + s.ai + '</div>' +
        '</div>' +
      '</div>';
  }

  if (panel && tabsEl) {
    renderStage(1);
    tabsEl.addEventListener('click', function (e) {
      var btn = e.target.closest('.rm-tab');
      if (!btn) return;
      tabsEl.querySelectorAll('.rm-tab').forEach(function (t) { t.classList.remove('is-on'); });
      btn.classList.add('is-on');
      renderStage(btn.dataset.t);
    });
  }

  /* ---------- Hero 控制台演示 ---------- */
  var runBtn = document.getElementById('runBtn');
  var cmdText = document.getElementById('cmdText');
  var rows = document.querySelectorAll('#logList .log-row');
  var bar = document.querySelector('.pc-bar i');
  var pcNum = document.querySelector('.pc-num');
  var aiReply = document.querySelector('.ai-reply');

  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  if (runBtn) {
    runBtn.addEventListener('click', async function () {
      runBtn.disabled = true;
      var label = runBtn.innerHTML;
      runBtn.innerHTML = '<svg viewBox="0 0 16 16"><path d="M4 3l9 5-9 5z" fill="currentColor"/></svg> 执行中…';
      cmdText.textContent = '帮我补齐 14 个对标账号';

      // 逐个高亮任务行
      for (var i = 0; i < rows.length; i++) {
        rows.forEach(function (r) { r.classList.remove('active'); });
        rows[i].classList.add('active');
        await sleep(700);
      }

      // 进度推进
      var from = 6, to = 20;
      if (bar && pcNum) {
        var cur = from;
        while (cur < to) {
          cur = Math.min(to, cur + 2);
          pcNum.textContent = cur + ' / 20';
          bar.style.width = (cur / 20 * 100) + '%';
          await sleep(90);
        }
      }

      // AI 追加结论（明确标注为待人工确认）
      if (aiReply) {
        var line = document.createElement('div');
        line.className = 'ai-line';
        line.innerHTML = '<span class="tag tag-red">AI</span>' +
          '<p>已补到 20 个候选账号，其中 <b>14 个近 30 天活跃</b>。' +
          '标黄的 4 个类目接近但人群不同，<b>需要你确认是否保留</b>，再进入下一项。</p>';
        aiReply.appendChild(line);
      }

      runBtn.innerHTML = label;
      runBtn.disabled = false;
    });
  }

  /* ---------- 复制指令 ---------- */
  var copyBtn = document.getElementById('copyBtn');
  if (copyBtn) {
    copyBtn.addEventListener('click', function () {
      var text = '开始小红书运营';
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text);
      } else {
        var ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      copyBtn.textContent = '已复制';
      setTimeout(function () { copyBtn.textContent = '复制'; }, 1600);
    });
  }
})();
