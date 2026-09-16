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
          '<div class="rm-deliver"><strong>阶段成果（勾选后自动存在本机）</strong><ul>' +
            s.deliver.map(function (d, i) {
              var key = k + '-' + i;
              var on = isChecked(key);
              return '<li><label class="dv-item' + (on ? ' is-done' : '') + '">' +
                     '<input type="checkbox" data-k="' + key + '"' + (on ? ' checked' : '') + '>' +
                     '<span>' + d + '</span></label></li>';
            }).join('') +
          '</ul>' +
          '<div class="dv-note">勾选状态只存在这台浏览器里，换设备不同步，清缓存会丢。</div>' +
          '<button class="dv-clear" data-stage="' + k + '">清空本阶段勾选</button>' +
          '</div>' +
          '<div class="rm-ai"><b>AI 接手的部分 · </b>' + s.ai + '</div>' +
        '</div>' +
      '</div>';
  }

  /* ---------- 阶段成果勾选 · localStorage ---------- */
  var KEY_PROG = 'xhs.progress';
  function loadProg() {
    try { return JSON.parse(localStorage.getItem(KEY_PROG) || '{}'); } catch (e) { return {}; }
  }
  function saveProg(p) {
    try { localStorage.setItem(KEY_PROG, JSON.stringify(p)); } catch (e) {}
  }
  function isChecked(key) { return !!loadProg()[key]; }
  function stageDone(k) {
    var p = loadProg(), n = 0;
    (STAGES[k].deliver || []).forEach(function (_, i) { if (p[k + '-' + i]) n++; });
    return n;
  }

  function badges() {
    tabsEl.querySelectorAll('.rm-tab').forEach(function (t) {
      var k = t.dataset.t;
      var done = stageDone(k), total = STAGES[k].deliver.length;
      var b = t.querySelector('.rm-badge');
      if (!b) { b = document.createElement('span'); b.className = 'rm-badge'; t.appendChild(b); }
      b.textContent = done + '/' + total;
    });
  }

  panel.addEventListener('change', function (e) {
    var cb = e.target.closest('input[type="checkbox"]');
    if (!cb) return;
    var p = loadProg();
    if (cb.checked) { p[cb.dataset.k] = 1; } else { delete p[cb.dataset.k]; }
    saveProg(p);
    cb.closest('.dv-item').classList.toggle('is-done', cb.checked);
    badges();
  });

  panel.addEventListener('click', function (e) {
    var btn = e.target.closest('.dv-clear');
    if (!btn) return;
    var p = loadProg(), k = btn.dataset.stage, i;
    for (i = 0; i < STAGES[k].deliver.length; i++) { delete p[k + '-' + i]; }
    saveProg(p);
    renderStage(k);
    badges();
  });

  if (panel && tabsEl) {
    renderStage(1);
    badges();
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

  /* ---------- 指令库 ---------- */
  var PM = [
    {
      g: '入口',
      n: '开始小红书运营',
      d: '让 AI 判断你现在在哪个阶段，只给眼前最该做的一件事。',
      tip: '信息不确定就照实写「不知道」，它会反过来问你，不会瞎猜。',
      t: [
        '你是一位严谨的小红书运营教练。我要开始做小红书账号。',
        '',
        '我的情况：',
        '- 类目：{{类目}}',
        '- 目标人群：{{人群}}',
        '- 要卖的产品/服务：{{产品}}',
        '- 当前进度：{{现状}}',
        '',
        '请这样做：',
        '1. 先判断我当前属于哪个阶段：起步与基线验证 / 产品×内容模型验证 / 爆款复制与稳定转化 / 规模化矩阵。',
        '2. 告诉我眼前【只做一件事】是什么，以及它的完成标准：做到什么程度算完成、要留下什么成果。',
        '3. 列出这一步必须由我人工判断的部分，和你可以先帮我执行的重复动作。',
        '4. 我回复以后，你再判断是进入下一步，还是继续补当前这一步。',
        '',
        '规则：',
        '- 需要真实数据但拿不到时，直接写「未获取」，不要用推测的数字顶替。',
        '- 不承诺涨粉、不承诺流量、不给所谓爆款公式。',
        '- 信息不足时先向我提问，一次最多问 3 个，并给我选项。'
      ]
    },
    {
      g: '采集与盯梢',
      n: '笔记采集器',
      st: 'collect',
      d: '规划本周要采什么、怎么分类，产出可执行的采集清单。',
      tip: '这一步只输出「该采什么」，真实数据请用合规渠道采集或人工整理。',
      t: [
        '你是我的小红书素材助理。请帮我规划本周的爆款素材采集。',
        '',
        '账号背景：类目 {{类目}}，人群 {{人群}}，产品 {{产品}}。',
        '',
        '请输出：',
        '1. 我要采集的 5 组关键词（人群词 / 场景词 / 痛点词 / 商品词 / 长尾词），每组 5 个。',
        '2. 优先追踪的 10 类对标博主（用特征描述，不要编造具体账号名）。',
        '3. 采集字段清单：标题、点赞、收藏、评论数、首图形式、发布时间、话题标签、评论区高频问题。',
        '4. 采集完怎么打标签分类，给我一张标签表的表头和示例行。',
        '5. 提醒我：哪些字段属于「必须真实采集、不可推测」。',
        '',
        '约束：所有需要真实数据的字段一律标注「待采集」，禁止凭空生成假的爆款笔记案例。'
      ]
    },
    {
      g: '采集与盯梢',
      n: '博主笔记记录器',
      st: 'rival',
      d: '搭一张竞争对手监控台账，把 S / A / B 三级对手管起来。',
      tip: '把这张表复制到表格软件，之后每周固定 20 分钟补一次就够。',
      t: [
        '帮我建立一套竞争对手监控台账。',
        '',
        '背景：类目 {{类目}}，人群 {{人群}}，产品 {{产品}}，当前进度 {{现状}}。',
        '',
        '请输出：',
        '1. S / A / B 三级对手的划分标准。S=头部玩家，A=同量级对手，B=快速上升新星。每级给 3 条能直接判断的硬指标（粉丝量级、互动率、更新频率等）。',
        '2. 一张监控表结构：账号、等级、最近更新时间、本周更新篇数、笔记主题、24 小时赞藏、是否触发阈值（>50 赞）、备注。',
        '3. 每周怎么复盘这张表：要盯哪 3 个信号，看到信号后做什么动作。',
        '4. 特别提醒我如何记录「没爆」的笔记，以及如何用它总结市场边界。',
        '',
        '约束：不要生成虚假账号和虚假数据，示例一律用占位符。不要提供违规抓取教程。'
      ]
    },
    {
      g: '采集与盯梢',
      n: '博主粉丝记录器',
      st: 'rival',
      d: '设定增长阈值与报警后的动作，提前发现潜力新星。',
      tip: '阈值别拍脑袋，按粉丝量级分层设定，否则小号永远不报警、大号天天报警。',
      t: [
        '帮我设计一套博主粉丝增长监控方案。类目 {{类目}}，人群 {{人群}}。',
        '',
        '请输出：',
        '1. 监控名单的分层建议：新星几个、同级几个、头部几个，以及选人标准。',
        '2. 日增阈值设定建议：按不同粉丝量级分别给数值，并说明触发报警后我要做的 3 个动作。',
        '3. 增长拐点回溯表模板：日期、当日粉丝增量、当日发布内容、推断原因（标注为「待验证」）、是否跟进。',
        '4. 把新星账号发展成合作对象的 3 种开口方式，附话术要点。',
        '',
        '约束：不提供任何抓取工具教程，只给人工可读的流程、表格和话术。'
      ]
    },
    {
      g: '内容生产',
      n: '标题工坊',
      st: 'title',
      d: '一次给 5 版标题，并说明每版在钓什么人。',
      tip: '把「测试目标」写清楚，标题才有判断标准；不写就只能比谁更顺眼。',
      t: [
        '你是小红书标题编辑。请帮我的笔记起标题。',
        '',
        '【笔记正文】',
        '（粘贴正文）',
        '',
        '【测试目标】（本轮要验证什么：选题反应 / 人群 / 卖点 / 场景）',
        '（填写）',
        '',
        '背景：类目 {{类目}}，人群 {{人群}}，产品 {{产品}}。',
        '',
        '输出要求：',
        '1. 给 5 个标题，每个标明钩子类型（痛点 / 反常识 / 对比 / 数字 / 场景 / 身份）以及关键词埋点位置。',
        '2. 逐条说明它试图吸引什么人点击。',
        '3. 如果我有原标题，先诊断它为什么没被点开，再给具体改法。',
        '4. 最后推荐 1 个作为本轮测试首选，并说明推荐理由。',
        '',
        '约束：标题必须符合商品事实，不做夸大承诺，禁用「震惊 / 速看 / 马上删」这类词。'
      ]
    },
    {
      g: '内容生产',
      n: '主页体检',
      st: 'profile',
      d: '逐项检查主页，并给出可直接替换的简介。',
      tip: '陌生人三秒看不懂你是干嘛的，笔记流量再好也接不住 —— 这是性价比最高的一次改动。',
      t: [
        '请给我的小红书主页做体检并改写。',
        '',
        '我的账号定位 / 提供的服务：（填写）',
        '目标用户：{{人群}}',
        '当前现状：{{现状}}',
        '',
        '第一部分 体检：按 头像 / 昵称 / 简介 / 三条置顶 / 内容风格一致性 五项逐项检查，',
        '每项给出「当前问题 + 会造成什么影响 + 怎么改」。',
        '',
        '第二部分 改写：',
        '- 一句话简介（≤ 20 字，必须说清「服务谁 + 解决什么」）。',
        '- 三条置顶的职责分工：一条负责转化、一条建立信任、一条做人设，各给内容方向。',
        '',
        '第三部分 自查：陌生人打开主页 3 秒能否看懂我是干嘛的，给出你的判断依据。',
        '',
        '约束：不夸大资历，不承诺效果，不改到认不出原来的账号。'
      ]
    },
    {
      g: '内容生产',
      n: '选题策划',
      st: 'topic',
      d: '按产品 × 人群 × 场景组合，排出 7 天计划。',
      tip: '一次只验证一个变量，否则数据出来你不知道是谁起作用了。',
      t: [
        '帮我做内容选题计划。',
        '',
        '产品 / 服务：{{产品}}，人群：{{人群}}，类目：{{类目}}。',
        '已有表现最好的内容角度：（没有就写「暂无」）',
        '',
        '请输出：',
        '1. 先给 3 组「产品 × 人群 × 场景」组合，每组标注这一组要验证的假设。',
        '2. 7 天选题计划表：日期 / 选题 / 角度 / 本条要验证什么 / 成功信号（给方向性的数值区间）。',
        '3. 标出哪几条属于同一系列，方便连续发布形成预期。',
        '4. 给 5 条「评论区高频问题 → 选题」的转化示例。',
        '',
        '约束：同一批选题里只验证一个变量，不要把多个变量混在一起测。'
      ]
    },
    {
      g: '内容生产',
      n: '评论区回复',
      st: 'comment',
      d: '批量处理评论、设计置顶，并把问题转成下一批选题。',
      tip: '评论区是免费的选题矿，也是最容易被浪费的转化位。',
      t: [
        '帮我处理评论区。产品 / 服务：{{产品}}，人群：{{人群}}。',
        '',
        '【评论列表】',
        '（粘贴评论）',
        '',
        '请输出：',
        '1. 逐条回复，每条控制 2 句以内，三种口径分开给：友好答疑 / 引导私信 / 温和转化。语气自然，不要 AI 腔。',
        '2. 设计 1 条置顶评论：目的是引导到商品或私信，给出文案和放置时机。',
        '3. 把高频问题归成 3 类，并各自转成 1 个下一批可发的选题。',
        '',
        '约束：回复不虚构产品功效；涉及价格、售后、敏感问题标注「需人工确认」。'
      ]
    },
    {
      g: '策略与转化',
      n: '成交路径设计',
      st: 'conv',
      d: '按客单价设计从内容到私信到下单的完整链路。',
      tip: '低客单直接成交，高客单先私信建立信任，别用同一条路径打两类产品。',
      t: [
        '帮我设计从小红书内容到成交的路径。',
        '',
        '产品：{{产品}}，客单价：{{客单价}}，人群：{{人群}}。',
        '',
        '请输出：',
        '1. 先判断这个客单价适合的成交方式（直接成交 / 私信建立信任 / 引导至其他触点），并说明理由。',
        '2. 完整路径图：内容 → 钩子 → 承接动作 → 信任建立 → 下单。每一步写明目的和用户在想什么。',
        '3. 针对「有人点商品但没成交」，列出 5 个常见断点，并按排查先后顺序排列。',
        '4. 给我一个 7 天成交测试的判断标准：什么样算跑通，什么样算没跑通。',
        '',
        '约束：不承诺收益，不设计违反平台规则的引流话术。'
      ]
    },
    {
      g: '策略与转化',
      n: '策略专家',
      d: '先追问、再给方案，输出带取舍的几条路。',
      tip: '通用大模型最容易在这个环节胡编，所以要求它先问你要信息。',
      t: [
        '你是小红书营销策略顾问。',
        '',
        '背景：类目 {{类目}}，产品 {{产品}}，人群 {{人群}}，当前进度 {{现状}}。',
        '我的问题：（填写具体问题）',
        '',
        '要求：',
        '1. 回答前先列出你还缺哪些信息，一次最多问 3 个，每个都要给我可选项。',
        '2. 信息足够后，按这个结构输出：判断依据 → 可选方案（2-3 个，各含取舍） → 你推荐哪个 → 执行步骤 → 验收标准。',
        '3. 明确区分「已经能确定的判断」和「还需要数据验证的假设」。',
        '',
        '约束：涉及平台规则，如果超过你的知识范围，标注「需核对最新规则」，不要编造条款或惩罚措施。'
      ]
    },
    {
      g: '情报与复盘',
      n: '情报站',
      d: '搭一套长期盯平台更新的流程和台账。',
      tip: '别让 AI 凭记忆列公告日期和条款，那玩意天天变，信它不如去官方核对。',
      t: [
        '帮我建立一套平台信息更新的跟踪流程。',
        '',
        '我做的是：{{类目}}，产品 {{产品}}。',
        '',
        '请输出：',
        '1. 要长期关注的信息分类（规则公告 / 工具变化 / 类目政策 / 违规红线 / 官方活动），每类给出为什么值得盯。',
        '2. 每条更新进来后的 4 步处理法：摘要 → 是否影响我 → 要改的动作 → 记到哪里。',
        '3. 一张月度信息台账模板：日期、来源、摘要、影响判断、我的动作、完成情况。',
        '4. 哪些变化需要立刻停下手上的动作去调整，给一个判断标准。',
        '',
        '约束：不要凭记忆罗列具体公告日期或条款，需要具体条款时标注「请到官方渠道核对」。'
      ]
    },
    {
      g: '数据与诊断',
      n: '发布回查',
      st: 'diag',
      d: '一条笔记数据不好时，按漏斗找出最上游的那个卡点。',
      tip: '一次只处理一个问题。上游不通的时候去改下游，等于白改还看不出原因。',
      t: [
        '帮我诊断一条已经发布的笔记。',
        '',
        '账号背景：类目 {{类目}}，产品 {{产品}}，人群 {{人群}}。',
        '我自己的账号基线（同类内容平均曝光）：{{基线曝光}}',
        '',
        '【这条笔记的数据】（没看的项就写「没看」）',
        '标题：',
        '曝光：',
        '点击数：',
        '平均阅读时长：',
        '赞 + 藏 + 评总数：',
        '商品点击：',
        '成交：',
        '',
        '请按这个顺序做：',
        '1. 逐层算给我看：曝光相对我自己的基线如何 → 点击率 → 停留时长 → 互动率 → 商品点击率 → 成交率。有基线的层用我的基线比，没有的层用通用参考并注明。',
        '2. 找出【最上游】那个不达标的层级，它就是唯一的瓶颈。下游就算也很难看，这一轮先别动 —— 上游不通，改下游无效。',
        '3. 针对这一个瓶颈给 3 个具体改法，每个改法注明：改完之后下一轮要看哪个数字、看到什么算有效。',
        '4. 明确列出这次【不要】动的地方。',
        '',
        '约束：我写「没看」的项直接判定为数据不足，不要用推测数字填；不要建议我把封面、标题、正文一次性全推翻。'
      ]
    },
    {
      g: '数据与诊断',
      n: '周期复盘',
      st: 'review',
      d: '和自己的基线比，输出加码 / 观察 / 淘汰三张清单。',
      tip: '拿别人的播放量硬套自己的账号，只会得出错误结论。',
      t: [
        '帮我做一次数据复盘。',
        '',
        '账号类目：{{类目}}，产品 {{产品}}，人群 {{人群}}。',
        '我自己的基线曝光（同类内容平均）：{{基线曝光}}',
        '',
        '【本轮数据】',
        '（按行粘贴：笔记标题 / 曝光 / 商品点击 / 成交）',
        '',
        '请输出：',
        '1. 先和我自己账号的同类内容比基线，不要和行业大号比。分成三档：高于基线 / 接近基线 / 连续偏弱。',
        '2. 每一档给动作：继续加码 / 微调观察 / 先停下来。',
        '3. 特别处理一类情况：曝光明显低于基线、但真的带来了成交的内容 —— 不要因为它播放量难看就淘汰，单独列出来并说明理由。',
        '4. 本轮最值得保留的 1 个方法，和最该改掉的 1 个动作，都要说理由。',
        '5. 输出下一轮的 3 条计划，每条带明确的验证目标。',
        '',
        '约束：数据不足就直说「数据不足以判断」，不要用感觉下结论，不要美化结果。'
      ]
    }
  ];

  var KEY_VARS = 'xhs.vars';
  var VAR_INPUTS = {
    '类目': 'vCat', '人群': 'vAud', '产品': 'vProd', '现状': 'vStatus',
    '客单价': 'vPrice', '基线曝光': 'vBase'
  };
  var VARS = {};
  try { VARS = JSON.parse(localStorage.getItem(KEY_VARS) || '{}') || {}; } catch (e) { VARS = {}; }

  var pList = document.getElementById('pmList');
  var pTitle = document.getElementById('pmTitle');
  var pDesc = document.getElementById('pmDesc');
  var pCode = document.getElementById('pmCode');
  var pTip = document.getElementById('pmTip');
  var pCopy = document.getElementById('pmCopy');
  var pReset = document.getElementById('pmReset');
  var cur = 0;

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c];
    });
  }
  function renderHTML(t) {
    var out = t.replace(/\{\{([^}]+)\}\}/g, function (m, k) {
      var v = (VARS[k] || '').trim();
      return v ? '\u0001' + v + '\u0002' : '\u0003' + k + '\u0004';
    });
    out = esc(out);
    return out
      .replace(/\u0001/g, '<span class="ph ok">').replace(/\u0002/g, '</span>')
      .replace(/\u0003/g, '<span class="ph">').replace(/\u0004/g, '</span>');
  }
  function plainText(t) {
    return t.replace(/\{\{([^}]+)\}\}/g, function (m, k) {
      var v = (VARS[k] || '').trim();
      return v || ('{{' + k + '}}');
    });
  }

  function renderList() {
    if (!pList) return;
    var html = '', lastG = '';
    PM.forEach(function (p, i) {
      if (p.g !== lastG) { html += '<div class="pm-group">' + esc(p.g) + '</div>'; lastG = p.g; }
      html += '<button class="pm-item' + (i === cur ? ' is-on' : '') + '" data-i="' + i + '">' +
              '<b>' + esc(p.n) + '</b><span>' + esc(p.g) + '</span></button>';
    });
    pList.innerHTML = html;
  }

  function renderPanel() {
    if (!pCode) return;
    var p = PM[cur];
    pTitle.textContent = p.n;
    pDesc.textContent = p.d;
    pCode.innerHTML = renderHTML(p.t.join('\n'));
    pTip.textContent = p.tip;

    /* 有对应工作台工具时，露出「直接去工作台跑」的入口 */
    var box = document.getElementById('pmStudio');
    var go = document.getElementById('pmGo');
    if (box) {
      if (p.st) {
        box.hidden = false;
        if (go) {
          go.onclick = function () {
            var tab = document.querySelector('.st-tab[data-k="' + p.st + '"]');
            if (tab) tab.click();
            var sec = document.getElementById('studio');
            if (sec && sec.scrollIntoView) sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
            /* 把指令库里已填的变量带过去，省得再敲一遍 */
            try {
              document.dispatchEvent(new CustomEvent('xhs:fill', { detail: VARS }));
            } catch (e) {}
          };
        }
      } else {
        box.hidden = true;
        if (go) go.onclick = null;
      }
    }
  }

  function saveVars() {
    try { localStorage.setItem(KEY_VARS, JSON.stringify(VARS)); } catch (e) {}
  }

  if (pList && pCode) {
    Object.keys(VAR_INPUTS).forEach(function (k) {
      var el = document.getElementById(VAR_INPUTS[k]);
      if (!el) return;
      el.value = VARS[k] || '';
      el.addEventListener('input', function () {
        VARS[k] = el.value;
        saveVars();
        renderPanel();
      });
    });

    renderList();
    renderPanel();

    pList.addEventListener('click', function (e) {
      var btn = e.target.closest('.pm-item');
      if (!btn) return;
      cur = +btn.dataset.i;
      pList.querySelectorAll('.pm-item').forEach(function (b) { b.classList.remove('is-on'); });
      btn.classList.add('is-on');
      renderPanel();
    });

    if (pCopy) {
      pCopy.addEventListener('click', function () {
        var text = plainText(PM[cur].t.join('\n'));
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
        pCopy.textContent = '已复制';
        pCopy.classList.add('is-done');
        setTimeout(function () {
          pCopy.textContent = '复制指令';
          pCopy.classList.remove('is-done');
        }, 1600);
      });
    }

    if (pReset) {
      pReset.addEventListener('click', function () {
        VARS = {};
        saveVars();
        Object.keys(VAR_INPUTS).forEach(function (k) {
          var el = document.getElementById(VAR_INPUTS[k]);
          if (el) el.value = '';
        });
        renderPanel();
      });
    }
  }
})();
