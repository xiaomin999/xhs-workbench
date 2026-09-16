/* 红算子 · 工作台 —— 本地引擎 + 可选 AI 精修 */
(function () {
  'use strict';

  var KEY_AI = 'xhs.ai';
  var KEY_REC = 'xhs.studio.records';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c];
    });
  }
  function store(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function load(k, def) { try { var r = JSON.parse(localStorage.getItem(k) || 'null'); return r == null ? def : r; } catch (e) { return def; } }

  function words(s) {
    return String(s || '').split(/[,，、;；\/|\s]+/).map(function (x) { return x.trim(); }).filter(Boolean);
  }
  function pick(a, i, def) { return (a && a.length) ? a[i % a.length] : def; }
  function sub(str, s, d) {
    return str.replace(new RegExp('\\{' + s + '\\}', 'g'), d || '');
  }
  function len(s) { return String(s || '').replace(/\s/g, '').length; }

  var BAN = ['震惊', '惊呆', '速看', '马上删', '秒删', '绝了', '千万别错过', '必买', '100%有效', '永久有效', '第一品牌'];
  function banHit(s) {
    var hits = [];
    BAN.forEach(function (w) { if (String(s || '').indexOf(w) > -1) hits.push(w); });
    return hits;
  }

  /* ================= 统一结果渲染 ================= */
  function renderBlocks(blocks) {
    return blocks.map(function (b) {
      if (b.t === 'titles') {
        return '<div class="st-block"><h5>' + esc(b.h) + '</h5>' + b.items.map(function (it) {
          var pills = it.pills.map(function (p) { return '<span class="ti-pill ' + (p.cls || '') + '">' + esc(p.txt) + '</span>'; }).join('');
          return '<div class="st-bio-wrap" style="margin-bottom:14px">' +
            '<div class="ti-title">' + esc(it.title) + (it.rec ? '<span class="ti-rec">推荐首发</span>' : '') + '</div>' +
            '<div class="ti-meta">' + pills + '</div>' +
            (it.note ? '<div class="ti-note">' + esc(it.note) + '</div>' : '') +
            '</div>';
        }).join('') + '</div>';
      }
      if (b.t === 'check') {
        return '<div class="st-block"><h5>' + esc(b.h) + '</h5>' + b.items.map(function (it) {
          var mark = it.flag === 'pass' ? '✓' : (it.flag === 'warn' ? '!' : '×');
          return '<div class="dg-item"><span class="dg-flag ' + it.flag + '">' + mark + '</span>' +
            '<span class="dg-body"><b>' + esc(it.title) + '</b><span>' + esc(it.desc) + '</span>' +
            (it.fix ? '<em>改法：' + esc(it.fix) + '</em>' : '') + '</span></div>';
        }).join('') + '</div>';
      }
      if (b.t === 'bio') {
        return '<div class="st-block"><h5>' + esc(b.h) + '</h5>' + b.items.map(function (it) {
          return '<div class="st-bio"><i>' + esc(it.label) + '</i>' + esc(it.value) + '</div>';
        }).join('') + '</div>';
      }
      if (b.t === 'table') {
        return '<div class="st-block"><h5>' + esc(b.h) + '</h5><div style="overflow-x:auto"><table class="st-table"><thead><tr>' +
          b.head.map(function (h) { return '<th>' + esc(h) + '</th>'; }).join('') + '</tr></thead><tbody>' +
          b.rows.map(function (r) {
            return '<tr>' + r.map(function (c) {
              return '<td>' + esc(c).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\[(\d+)\]/g, '<span class="st-series">$1</span>') + '</td>';
            }).join('') + '</tr>';
          }).join('') + '</tbody></table></div></div>';
      }
      if (b.t === 'list') {
        return '<div class="st-block"><h5>' + esc(b.h) + '</h5>' + b.items.map(function (it) {
          return '<div class="dg-item"><span class="dg-flag pass">·</span><span class="dg-body"><b>' + esc(it.title) +
            '</b><span>' + esc(it.desc) + '</span></span></div>';
        }).join('') + '</div>';
      }
      return '<div class="st-block"><h5>' + esc(b.h) + '</h5><div class="ti-note">' + esc(b.text) + '</div></div>';
    }).join('');
  }

  function blocksToText(blocks, title) {
    var out = '# ' + title + '\n\n';
    blocks.forEach(function (b) {
      out += '## ' + b.h + '\n';
      if (b.t === 'titles') {
        b.items.forEach(function (it, i) {
          out += (i + 1) + '. ' + it.title + '（' + it.pills.map(function (p) { return p.txt; }).join(' / ') + '）\n';
          if (it.note) out += '   ' + it.note + '\n';
        });
      } else if (b.t === 'check') {
        b.items.forEach(function (it) {
          out += '- [' + it.flag + '] ' + it.title + '：' + it.desc + (it.fix ? '｜改法：' + it.fix : '') + '\n';
        });
      } else if (b.t === 'bio') {
        b.items.forEach(function (it) { out += '- ' + it.label + '：' + it.value + '\n'; });
      } else if (b.t === 'table') {
        out += '| ' + b.head.join(' | ') + ' |\n|' + b.head.map(function () { return ' --- |'; }).join('') + '\n';
        b.rows.forEach(function (r) {
          out += '| ' + r.map(function (c) { return String(c).replace(/\*\*/g, '').replace(/\[(\d+)\]/g, '（系列$1）'); }).join(' | ') + ' |\n';
        });
      } else if (b.t === 'list') {
        b.items.forEach(function (it) { out += '- ' + it.title + '：' + it.desc + '\n'; });
      } else if (b.text) {
        out += b.text + '\n';
      }
      out += '\n';
    });
    return out;
  }

  function rowsToCSV(head, rows) {
    var cell = function (c) {
      var s = String(c).replace(/\*\*/g, '').replace(/\[(\d+)\]/g, '（系列$1）');
      return '"' + s.replace(/"/g, '""') + '"';
    };
    return '\ufeff' + [head.map(cell).join(',')].concat(rows.map(function (r) { return r.map(cell).join(','); })).join('\n');
  }

  /* ================= 工具一：标题工坊 ================= */
  function runTitle(v) {
    var ctx = {
      prod: v.tp_prod || '这款产品',
      aud: v.tp_aud || '和我一样的人',
      kws: words(v.tp_kw),
      pains: words(v.tp_pain),
      old: v.tp_old || ''
    };
    ctx.pain = ctx.pains[0] || (ctx.kws[0] || '这个痛点') ;
    ctx.kw = ctx.kws[0] || ctx.prod;
    var blocks = [];

    /* 原标题诊断 */
    if (ctx.old) {
      var items = [];
      var hasKey = ctx.old.indexOf(ctx.prod) > -1 || ctx.kws.some(function (k) { return ctx.old.indexOf(k) > -1; });
      items.push({
        flag: hasKey ? 'pass' : 'bad',
        title: '是否含可搜索的关键词',
        desc: hasKey ? '标题里能被用户搜到的词已经在了。' : '标题里找不到「' + ctx.prod + '」或你给的关键词，用户搜不到你。',
        fix: hasKey ? '' : '把商品词或核心关键词放进前 18 个字里。'
      });
      var hasPain = ctx.pains.some(function (p) { return ctx.old.indexOf(p) > -1; });
      items.push({
        flag: hasPain ? 'pass' : 'warn',
        title: '是否点出痛点或利益',
        desc: hasPain ? '已经戳到用户在意的事。' : '没有出现痛点词，读者不知道这篇跟自己有什么关系。',
        fix: hasPain ? '' : '标题里直接写出「' + ctx.pain + '」这类用户会说出口的困扰。'
      });
      var yyNum = /[0-9０-９]/.test(ctx.old), yyAsk = /[?？]/.test(ctx.old), yyCmp = /(vs|VS|对比|还是|之前|之后|前后)/.test(ctx.old);
      var hasHook = yyNum || yyAsk || yyCmp || hasPain;
      items.push({
        flag: hasHook ? 'pass' : 'warn',
        title: '是否有点击钩子',
        desc: hasHook ? '数字/疑问/对比/痛点里至少占了一项。' : '四种钩子一个都没有，标题太平。',
        fix: hasHook ? '' : '加一个数字，或改成一句问句，或做成前后对比。'
      });
      var n = len(ctx.old);
      items.push({
        flag: n <= 20 ? 'pass' : (n <= 26 ? 'warn' : 'bad'),
        title: '字数 ' + n + ' 字',
        desc: n <= 20 ? '在舒适区，手机上不会被截断。' : (n <= 26 ? '略长，后半段可能看不到。' : '偏长，关键信息容易被折叠。'),
        fix: n <= 20 ? '' : '把修饰词砍掉，控制在 20 字以内。'
      });
      var ban = banHit(ctx.old);
      items.push({
        flag: ban.length ? 'bad' : 'pass',
        title: ban.length ? '含平台不友好词：' + ban.join('、') : '无违规/夸张词',
        desc: ban.length ? '这类词容易被判定为标题党。' : '用词干净。',
        fix: ban.length ? '换成中性的具体描述。' : ''
      });
      blocks.push({ t: 'check', h: '原标题诊断', items: items });
    }

    /* 生成标题 */
    var gens = [
      { hook: '痛点型', f: function (c) { return c.aud + c.pain + '？我用' + c.prod + '解决了'; }, note: '直接对着用户会说出口的困扰喊话，点击人群最准。' },
      { hook: '数字型', f: function (c) { return c.kws.length >= 3 ? ('5 个' + c.kw + '技巧｜' + c.aud + '都在用') : ('3 步搞定' + c.pain + '｜' + c.aud + '适用'); }, note: '数字是最省事的钩子，适合教程、清单类内容。' },
      { hook: '场景型', f: function (c) { return (c.scenes && c.scenes[0] ? c.scenes[0] : '日常生活') + '这样用' + c.prod + '，' + c.pain + '没了'; }, note: '把产品塞进具体场景，适合容易被质疑「我用不上」的商品。' },
      { hook: '对比型', f: function (c) { return '用前 vs 用后：' + c.prod + '把' + c.pain + '治好了'; }, note: '视觉反差强，适合前后对比图，点击与收藏都好用。' },
      { hook: '身份型', f: function (c) { return c.aud + '看过来｜' + c.prod + '才是正解'; }, note: '点名人群，粉丝画像不精准时用它做清洗。' },
      { hook: '避坑型', f: function (c) { return '别再瞎买了｜' + c.prod + '挑错一次就白花钱'; }, note: '负向框架更容易被点开，但别写成标题党。' },
      { hook: '清单型', f: function (c) { return c.prod + '清单｜' + c.aud + '迟早用得上'; }, note: '收藏率通常高于点击率，适合做合集。' },
      { hook: '疑问型', f: function (c) { return c.aud + '到底该不该入' + c.prod + '？我的答案是'; }, note: '开放式疑问适合评论区讨论，能拉互动。' }
    ];
    ctx.scenes = words(v.tp_scene);
    var titles = gens.map(function (g, i) {
      var s = g.f(ctx);
      var w = len(s);
      var anchor = ctx.prod;
      var pos = s.indexOf(anchor);
      var early = pos > -1 && pos < 18;
      return {
        title: s,
        rec: i === 0,
        pills: [
          { txt: g.hook, cls: 'hook' },
          { txt: w <= 20 ? w + ' 字 · 不会被截断' : (w <= 26 ? w + ' 字 · 略长' : w + ' 字 · 建议精简'), cls: w <= 20 ? 'ok' : 'warn' },
          { txt: pos > -1 ? (early ? '关键词在前段' : '关键词靠后') : '缺关键词', cls: early ? 'ok' : 'warn' }
        ],
        note: g.note
      };
    });
    blocks.push({ t: 'titles', h: '8 个标题方案（按钩子类型各一版）', items: titles });

    var advices = [
      '一次只发一条，别同时改封面和标题，否则数据出来你不知道是谁的功劳。',
      '同一商品最多连测 3 版标题，还起不来就该改封面或内容角度了。',
      '商品词尽量放前 18 个字，那是搜索和推荐两处都要读的位置。'
    ];
    blocks.push({ t: 'para', h: '怎么用这批标题', text: advices.join('；') + '。' });

    return { blocks: blocks, table: null };
  }

  /* ================= 工具二：主页体检 ================= */
  function whichTop(s) {
    var t = String(s || '');
    if (/买|链接|店铺|价格|多少钱|怎么买|清单|推荐款/.test(t)) return '转化';
    if (/实测|对比|前后|效果|案例|数据|拆解|用了|天/.test(t)) return '信任';
    if (/我的|为什么|心得|故事|经历|日常|踩过|转行/.test(t)) return '人设';
    return '待明确';
  }

  function runProfile(v) {
    var bio = v.pf_bio || '';
    var name = v.pf_name || '';
    var aud = v.pf_aud || '';
    var offer = v.pf_offer || '';
    var money = v.pf_money || '';
    var tops = [v.pf_top1, v.pf_top2, v.pf_top3].filter(function (x) { return String(x || '').trim(); });
    var blocks = [];
    var items = [];

    var bl = len(bio);
    items.push({
      flag: bl === 0 ? 'bad' : (bl < 12 ? 'warn' : (bl > 60 ? 'warn' : 'pass')),
      title: '简介长度',
      desc: bl === 0 ? '还没写简介，主页等于没有招牌。' : (bl < 12 ? '只有 ' + bl + ' 字，信息量不够，陌生人看完还是不知道你是谁。' : (bl > 60 ? bl + ' 字偏长，重点会被稀释。' : bl + ' 字，长度合适。')),
      fix: (bl < 12 || bl > 60) ? '控制在 20-40 字，一句话说清「服务谁 + 解决什么」。' : ''
    });

    var audWords = words(aud);
    var hasAud = audWords.some(function (w) { return bio.indexOf(w) > -1; }) || (aud && bio.indexOf(aud) > -1);
    items.push({
      flag: hasAud ? 'pass' : 'bad',
      title: '简介里有没有点名人群',
      desc: hasAud ? '目标人群能被认出来。' : '简介没提「' + (aud || '你的目标人群') + '」，用户判断不了这是不是给自己的。',
      fix: hasAud ? '' : '把人群词写进简介第一句，比写品类词更有效。'
    });

    var VAL = ['教你', '带你', '清单', '方案', '整理', '避坑', '攻略', '从 0', '手把手', '实测', '测评', '挑选', '搭配', '指南'];
    var hasVal = VAL.some(function (w) { return bio.indexOf(w) > -1; });
    items.push({
      flag: hasVal ? 'pass' : 'warn',
      title: '有没有给出明确价值',
      desc: hasVal ? '读者能预期会得到什么。' : '只说了是什么，没说能给我什么。',
      fix: hasVal ? '' : '加一个动作词，比如「帮你挑」或「避坑清单」。'
    });

    var EMPTY = ['分享日常', '记录生活', '爱生活', '随手记', '随便发发', '佛系', '随便看看', '一枚'];
    var hitEmpty = EMPTY.filter(function (w) { return bio.indexOf(w) > -1; });
    items.push({
      flag: hitEmpty.length ? 'warn' : 'pass',
      title: hitEmpty.length ? '有空洞词：' + hitEmpty.join('、') : '无空洞词',
      desc: hitEmpty.length ? '这类词谁都能用，等于没说。' : '没有占位性质的废话。',
      fix: hitEmpty.length ? '换成具体的服务或人群描述。' : ''
    });

    var nl = len(name);
    items.push({
      flag: nl === 0 ? 'bad' : (nl <= 8 ? 'pass' : 'warn'),
      title: '昵称长度 ' + (nl || 0) + ' 字',
      desc: nl === 0 ? '没填昵称。' : (nl <= 8 ? '好记，容易被搜到。' : '偏长，别人 @ 你和记住你的成本都高。'),
      fix: nl > 8 ? '砍到 8 字以内，最好带一个品类词。' : ''
    });

    var offerWords = words(offer);
    var nameHasOffer = offerWords.some(function (w) { return name.indexOf(w) > -1; });
    items.push({
      flag: nameHasOffer ? 'pass' : 'warn',
      title: '昵称里有没有品类线索',
      desc: nameHasOffer ? '看到名字就知道大概做什么。' : '名字和做的事对不上，搜品类时吃亏。',
      fix: nameHasOffer ? '' : '在昵称里塞一个「' + (offerWords[0] || '品类') + '」这类能被搜到的词。'
    });

    var types = tops.map(whichTop);
    var covered = {};
    types.forEach(function (t) { covered[t] = 1; });
    var lack = ['转化', '信任', '人设'].filter(function (t) { return !covered[t]; });
    items.push({
      flag: lack.length === 0 ? 'pass' : (lack.length >= 2 ? 'bad' : 'warn'),
      title: '置顶三条的职责分工',
      desc: tops.length
        ? '当前三条分别是：' + tops.map(function (t, i) { return '「' + t + '」→ ' + types[i]; }).join('；') + '。' + (lack.length ? '缺' + lack.join('、') + '这块。' : '三类齐了。')
        : '还没规划置顶，主页白白浪费了最好的三个位置。',
      fix: lack.length ? '补一条' + lack[0] + '向的内容，把它置顶。' : ''
    });

    if (money) {
      var guide = /(私信|主页链接|店铺|清单|置顶|评论)/.test(bio);
      items.push({
        flag: guide ? 'pass' : 'warn',
        title: '变现路径有没有在简介里露出来',
        desc: guide ? '简介里有引导动作。' : '你在做「' + money + '」，但简介没告诉用户下一步去哪。',
        fix: guide ? '' : '在简介最后加一句行动指引，比如「完整清单在置顶第一条」。'
      });
    }
    blocks.push({ t: 'check', h: '主页体检（共 ' + items.length + ' 项）', items: items });

    var ao = aud || '目标人群';
    var oo = offer || '我要提供的内容';
    var kk = offerWords[0] || '这块内容';
    var bios = [
      { label: '方案 A · 人群 + 服务（最稳）', value: ao + '的' + oo + '｜帮你一次看懂怎么选' },
      { label: '方案 B · 痛点 + 结果（更容易被点）', value: (words(v.pf_pain)[0] || '挑花了眼') + '到不纠结｜' + ao + '的' + kk + '清单' },
      { label: '方案 C · 身份 + 定位（适合做个人号）', value: '专注' + oo + '｜只写给' + ao + '看的实在话' }
    ];
    blocks.push({ t: 'bio', h: '简介改写候选', items: bios.concat([
      { label: '行动指引（加到任意一条末尾）', value: '↓ 完整清单在置顶第一条' },
      { label: '置顶三条职责建议', value: '第一条转化（最好卖的那篇）· 第二条信任（实测/前后对比）· 第三条人设（为什么做这个号）' }
    ]) });

    blocks.push({
      t: 'list', h: '改完之后自查三件事', items: [
        { title: '三秒测试', desc: '让一个不了解你的朋友打开主页，看他能不能说出你是干嘛的、给谁看的。' },
        { title: '搜索测试', desc: '在小红书搜你的品类关键词，看自己的账号会不会出现在候选里。' },
        { title: '一致性测试', desc: '简介承诺的东西，置顶三条和最近 6 篇内容是否真的兑现了。' }
      ]
    });
    return { blocks: blocks, table: null };
  }

  /* ================= 工具三：选题策划 ================= */
  var DEFAULT_SCENES = ['新房入住', '租房改造', '通勤路上', '出差旅行', '换季整理', '节日送礼', '宿舍生活', '厨房台面', '搬家前后', '小户型扩容'];
  var ANGLES = [
    { n: '清单盘点', v: '这一类人家愿不愿意收藏', s: '收藏率高于你近期平均水平', t: function (c) { return c.scene + '必备清单｜' + c.prod + '排第几'; } },
    { n: '教程步骤', v: '流程是不是足够简单到愿意照做', s: '收藏 + 评论提问都出现', t: function (c) { return c.scene + '怎么用' + c.prod + '？3 步讲清'; } },
    { n: '前后对比', v: '反差够不够大到让人停住看', s: '点击率明显高于同类内容', t: function (c) { return c.prod + '前后对比｜' + c.scene + '差别有多大'; } },
    { n: '测评实测', v: '大家是不是在犹豫买哪款', s: '评论区出现「怎么买」「多少钱」', t: function (c) { return '实测后我劝' + c.aud + '｜' + c.prod + '到底值不值'; } },
    { n: '避坑踩雷', v: '痛点是不是真实存在', s: '评论出现共鸣式回复', t: function (c) { return c.prod + '别乱买｜' + c.scene + '的 3 个坑'; } },
    { n: '答疑解惑', v: '这个问题是不是高频', s: '评论区继续追问新题', t: function (c) { return '被问最多的 3 个问题｜' + c.aud + '买' + c.prod + '前看'; } },
    { n: '场景故事', v: '人设能不能拉近距离', s: '涨粉数高于平均', t: function (c) { return c.scene + '实录｜' + c.aud + '和' + c.prod + '的一周'; } },
    { n: '好物合辑', v: '能不能串起多条产品线', s: '多条内容同时被翻看', t: function (c) { return c.scene + '好物合辑｜值得回购的 5 件'; } }
  ];

  function runTopic(v) {
    var prod = v.tb_prod || '我的产品';
    var aud = v.tb_aud || '目标人群';
    var scenes = words(v.tb_scene);
    if (!scenes.length) scenes = DEFAULT_SCENES.slice();
    var pains = words(v.tb_pain);
    var blocks = [];

    /* 三组合 */
    var combos = [0, 1, 2].map(function (i) {
      return { title: '组合 ' + (i + 1) + '：' + prod + ' × ' + aud + ' × ' + scenes[i % scenes.length], desc: '要验证的假设：在「' + scenes[i % scenes.length] + '」这个场景下，' + aud + '会为「' + (pains[i % (pains.length || 1)] || '省事/变好看') + '」买单。' };
    });
    blocks.push({ t: 'list', h: '产品 × 人群 × 场景组合', items: combos });

    /* 7 天表 */
    var rows = [], i;
    var seriesIdx = [0, 0, 0, 1, 2, 3, 4];
    var angleIdx = [0, 1, 2, 3, 4, 5, 6];
    for (i = 0; i < 7; i++) {
      var c = { scene: scenes[seriesIdx[i] % scenes.length], prod: prod, aud: aud };
      var a = ANGLES[angleIdx[i] % ANGLES.length];
      rows.push([
        '第 ' + (i + 1) + ' 天',
        '**' + a.t(c) + '**' + (i < 3 ? '[1]' : ''),
        a.n + '｜' + c.scene,
        a.v,
        a.s
      ]);
    }
    blocks.push({ t: 'table', h: '7 天选题排期（前 3 天同一场景，组成系列）', head: ['日期', '选题', '角度/场景', '本条要验证什么', '成功信号'], rows: rows });

    /* 评论转选题 */
    var qTopics = (pains.length ? pains : ['不知道怎么挑', '用起来麻不麻烦', '值不值这个价', '买回来会不会闲置', '和别的有啥区别']).slice(0, 5).map(function (p, idx) {
      return {
        title: '「' + p + '」→ 一条答疑笔记',
        desc: '标题示意：' + p + '怎么办？我用' + prod + '的答案是…（场景取「' + scenes[idx % scenes.length] + '」）'
      };
    });
    blocks.push({ t: 'list', h: '评论区问题 → 下一批选题', items: qTopics });

    blocks.push({
      t: 'para', h: '跑这一批之前先看清楚',
      text: '这批选题里只验证一件事，不要在 7 天里同时改封面风格、发布时间和选题方向。数据回来以后，跟你自己账号的同类内容比，不要拿别人的播放量当标准。'
    });

    return { blocks: blocks, table: { head: ['日期', '选题', '角度/场景', '本条要验证什么', '成功信号'], rows: rows } };
  }

  /* ================= 工具定义 ================= */
  var TOOLS = {
    title: {
      name: '标题工坊',
      hint: '左边填得越具体，出来的标题越能用。不填就出通用句式。',
      fields: [
        { k: 'tp_prod', label: '产品 / 服务', ph: '例：抽屉分隔盒', req: true },
        { k: 'tp_aud', label: '目标人群', ph: '例：租房的年轻女生', req: true },
        { k: 'tp_kw', label: '关键词（逗号分隔）', ph: '例：收纳分区，抽屉整理', small: '用户会拿来搜的词' },
        { k: 'tp_pain', label: '痛点词（逗号分隔）', ph: '例：抽屉一拉就乱', small: '用户会说出口的困扰' },
        { k: 'tp_scene', label: '场景词（选填）', ph: '例：出租屋，换季' },
        { k: 'tp_old', label: '原标题（选填）', ph: '填了会先诊断原标题', small: '不填就跳过诊断' }
      ],
      run: runTitle
    },
    profile: {
      name: '主页体检',
      hint: '按真实内容填。留空的项会被判定为「还没做」。',
      fields: [
        { k: 'pf_name', label: '昵称', ph: '例：小敏的收纳本子' },
        { k: 'pf_bio', label: '当前简介原文', ph: '把简介一字不改地粘过来', type: 'textarea', req: true },
        { k: 'pf_aud', label: '目标人群', ph: '例：25-30 岁租房女生', req: true },
        { k: 'pf_offer', label: '你提供什么', ph: '例：收纳方案 / 好物测评', req: true },
        { k: 'pf_pain', label: '你解决的痛点（选填）', ph: '例：家里越收拾越乱' },
        { k: 'pf_top1', label: '第一条置顶', ph: '例：10 件必买收纳好物' },
        { k: 'pf_top2', label: '第二条置顶', ph: '例：出租屋改造前后对比' },
        { k: 'pf_top3', label: '第三条置顶', ph: '例：我为什么开始做收纳' },
        { k: 'pf_money', label: '变现方式（选填）', ph: '例：带货 / 接单设计' }
      ],
      run: runProfile
    },
    topic: {
      name: '选题策划',
      hint: '场景词和痛点词建议自己填，不填就用通用库。',
      fields: [
        { k: 'tb_prod', label: '产品 / 服务', ph: '例：抽屉分隔盒套装', req: true },
        { k: 'tb_aud', label: '目标人群', ph: '例：租房的年轻女生', req: true },
        { k: 'tb_scene', label: '场景词（逗号分隔，选填）', ph: '例：租房改造，换季整理，送礼', small: '不超过 10 个，多了反而散' },
        { k: 'tb_pain', label: '痛点词（逗号分隔，选填）', ph: '例：抽屉乱，找不到东西', small: '用来生成答疑类选题' }
      ],
      run: runTopic
    }
  };

  /* ================= 工作台主体 ================= */
  var $ = function (id) { return document.getElementById(id); };
  var tabBox = $('stTabs'), formBox = $('stForm'), resBox = $('stResult');
  if (!tabBox || !formBox || !resBox) return;

  var curKey = 'title';
  var lastOutput = { text: '', table: null, title: '' };

  function cfg() { return load(KEY_AI, { base: 'https://api.deepseek.com', model: 'deepseek-chat', key: '' }); }
  function hasKey() { return !!(cfg().key || '').trim(); }

  function status(msg, ok) {
    var box = $('stStatus');
    if (!box) return;
    box.textContent = msg;
    box.className = 'st-status on' + (ok ? ' ok' : '');
  }

  function renderTabs() {
    tabBox.innerHTML = Object.keys(TOOLS).map(function (k) {
      return '<button class="st-tab' + (k === curKey ? ' is-on' : '') + '" data-k="' + k + '">' + esc(TOOLS[k].name) + '</button>';
    }).join('');
  }

  function renderForm() {
    var t = TOOLS[curKey];
    formBox.innerHTML =
      '<h4>' + esc(t.name) + '</h4><p class="st-hint">' + esc(t.hint) + '</p>' +
      t.fields.map(function (f) {
        var val = load('xhs.form.' + curKey, {})[f.k] || '';
        if (f.type === 'textarea') {
          return '<label class="st-field"><span>' + esc(f.label) + (f.req ? ' *' : '') + (f.small ? ' <small>' + esc(f.small) + '</small>' : '') + '</span>' +
            '<textarea class="st-textarea" id="f_' + f.k + '" placeholder="' + esc(f.ph || '') + '">' + esc(val) + '</textarea></label>';
        }
        return '<label class="st-field"><span>' + esc(f.label) + (f.req ? ' *' : '') + (f.small ? ' <small>' + esc(f.small) + '</small>' : '') + '</span>' +
          '<input class="st-input" id="f_' + f.k + '" value="' + esc(val) + '" placeholder="' + esc(f.ph || '') + '"></label>';
      }).join('') +
      '<div class="st-actions">' +
        '<button class="st-run" id="stRun">生成本地方案</button>' +
        '<button class="st-ai-btn' + (hasKey() ? '' : ' lock') + '" id="stAi">' + (hasKey() ? '用 AI 精修' : '用 AI 精修（需先填 key）') + '</button>' +
        '<span class="st-msg" id="stMsg"></span>' +
      '</div>' +
      '<div class="st-status" id="stStatus"></div>';

    TOOLS[curKey].fields.forEach(function (f) {
      var el = $('f_' + f.k);
      if (!el) return;
      el.addEventListener('input', function () {
        var s = load('xhs.form.' + curKey, {});
        s[f.k] = el.value;
        store('xhs.form.' + curKey, s);
      });
    });

    $('stRun').addEventListener('click', function () { generate(false); });
    $('stAi').addEventListener('click', function () {
      if (!hasKey()) {
        var box = $('stSetupBody');
        if (box) { box.hidden = false; box.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
        status('先在 AI 设置里填上你的 key，再点「用 AI 精修」。', false);
        return;
      }
      generate(true);
    });
  }

  function collect() {
    var v = {};
    TOOLS[curKey].fields.forEach(function (f) {
      var el = $('f_' + f.k);
      v[f.k] = el ? el.value.trim() : '';
    });
    return v;
  }

  function renderResult(res) {
    lastOutput = { text: blocksToText(res.blocks, TOOLS[curKey].name), table: res.table, title: TOOLS[curKey].name };
    resBox.innerHTML =
      '<h4>' + esc(TOOLS[curKey].name) + ' · 结果</h4><p class="st-hint">本地引擎生成，可直接改改就用；也可以导出成 Markdown 或表格。</p>' +
      '<div class="st-out">' + renderBlocks(res.blocks) + '</div>' +
      '<div class="st-toolbar">' +
        '<button class="st-mini" id="exMd">导出 Markdown</button>' +
        (res.table ? '<button class="st-mini" id="exCsv">导出 CSV（排期表）</button>' : '') +
        '<button class="st-mini" id="exCopy">复制全文</button>' +
        '<button class="st-mini" id="exSave">存入我的记录</button>' +
      '</div>';
    $('exMd').addEventListener('click', function () { download(lastOutput.text, (lastOutput.title || '结果') + '.md', 'text/markdown'); });
    if (res.table) $('exCsv').addEventListener('click', function () { download(rowsToCSV(res.table.head, res.table.rows), (lastOutput.title || '结果') + '.csv', 'text/csv'); });
    $('exCopy').addEventListener('click', function () { copy(lastOutput.text, this); });
    $('exSave').addEventListener('click', function () {
      saveRecord(curKey, lastOutput.title, lastOutput.text);
      this.textContent = '已存入';
      var self = this;
      setTimeout(function () { self.textContent = '存入我的记录'; }, 1500);
      renderRecords();
    });
  }

  function generate(useAI) {
    var v = collect();
    var miss = TOOLS[curKey].fields.filter(function (f) { return f.req && !v[f.k]; });
    if (miss.length) {
      status('先填必填项：' + miss.map(function (f) { return f.label.replace(' *', ''); }).join('、'), false);
      return;
    }
    var res = TOOLS[curKey].run(v);
    renderResult(res);
    status(useAI ? '本地方案好了，正在让 AI 精修…' : '已生成。可以直接改，也可以导出。', !useAI);
    if (useAI) polish(v, res);
    else resBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  /* ================= AI 精修 ================= */
  function endpoint(base) {
    var u = String(base || '').trim().replace(/\/+$/, '');
    if (!u) u = 'https://api.deepseek.com';
    if (/\/chat\/completions$/.test(u)) return u;
    if (/\/v\d+$/i.test(u)) return u + '/chat/completions';
    return u + '/v1/chat/completions';
  }

  function polish(v, res) {
    var c = cfg();
    var inputSummary = TOOLS[curKey].fields.map(function (f) { return f.label + '：' + (v[f.k] || '未填'); }).join('\n');
    var body = {
      model: c.model || 'deepseek-chat',
      stream: false,
      temperature: 0.7,
      messages: [
        {
          role: 'system',
          content: '你是小红书运营助手，中文输出。铁律：1) 不编造数据，缺信息写「待补」；2) 不承诺涨粉、流量和收益；3) 不用震惊体与夸张词；4) 严格保持我给的条目数量与结构，不要增删条目；5) 输出纯文本，不要解释你的思路。'
        },
        {
          role: 'user',
          content: '我的输入：\n' + inputSummary + '\n\n下面是基于模板生成的现有结果：\n' + blocksToText(res.blocks, TOOLS[curKey].name) +
            '\n\n请结合我的真实情况，把每一条改得更自然、更贴我的产品和人群。保持同样的条目数量与结构。'
        }
      ]
    };
    var ctrl = new AbortController();
    var timer = setTimeout(function () { ctrl.abort(); }, 90000);
    fetch(endpoint(c.base), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + (c.key || '').trim() },
      body: JSON.stringify(body),
      signal: ctrl.signal
    }).then(function (r) {
      clearTimeout(timer);
      if (r.status === 401) throw new Error('key 无效或已过期，去 AI 设置里换一个。');
      if (r.status === 429) throw new Error('被限流了，等半分钟再试。');
      if (!r.ok) throw new Error('接口返回 ' + r.status + '，检查 Base URL 和模型名对不对。');
      return r.json();
    }).then(function (j) {
      var txt = j && j.choices && j.choices[0] && (j.choices[0].message ? j.choices[0].message.content : j.choices[0].text);
      if (!txt) throw new Error('没拿到返回内容，换个模型名试试。');
      resBox.innerHTML =
        '<h4>' + esc(TOOLS[curKey].name) + ' · AI 精修版</h4><p class="st-hint">下面是 AI 输出，务必通读一遍再用 —— 特别是涉及数字和承诺的地方。</p>' +
        '<div class="st-out"><div class="st-block"><div class="ti-note" style="white-space:pre-wrap">' + esc(txt) + '</div></div></div>' +
        '<div class="st-toolbar"><button class="st-mini" id="aiCopy">复制全文</button><button class="st-mini" id="aiSave">存入我的记录</button><button class="st-mini" id="aiBack">回到本地方案</button></div>';
      lastOutput = { text: txt, table: res.table, title: TOOLS[curKey].name + ' · AI 精修版' };
      $('aiCopy').addEventListener('click', function () { copy(txt, this); });
      $('aiSave').addEventListener('click', function () { saveRecord(curKey, lastOutput.title, txt); renderRecords(); this.textContent = '已存入'; });
      $('aiBack').addEventListener('click', function () { renderResult(res); });
      status('AI 精修完成，内容已替换。记得核对数字和商品事实。', true);
    }).catch(function (e) {
      clearTimeout(timer);
      var msg = String(e && e.message || e);
      if (/Failed to fetch|NetworkError|Network request/i.test(msg)) msg = '请求被浏览器拦了：多半是这个接口不允许网页直连（CORS）。换一家支持跨域调用的服务商试试。';
      if (/aborted/i.test(msg)) msg = '超过 90 秒没返回，已中断。可以换个更快的模型再试。';
      status('AI 精修失败：' + msg, false);
    });
  }

  /* ================= 导出 / 记录 ================= */
  function copy(text, btn) {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text);
    } else {
      var ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); } catch (e) {}
      document.body.removeChild(ta);
    }
    if (btn) {
      var old = btn.textContent;
      btn.textContent = '已复制';
      setTimeout(function () { btn.textContent = old; }, 1500);
    }
  }

  function download(text, name, type) {
    var blob = new Blob([text], { type: type + ';charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
  }

  function saveRecord(toolKey, title, text) {
    var list = load(KEY_REC, []);
    list.unshift({
      id: Date.now(),
      tool: TOOLS[toolKey] ? TOOLS[toolKey].name : toolKey,
      title: title,
      time: new Date().toLocaleString('zh-CN', { hour12: false }),
      text: text
    });
    store(KEY_REC, list.slice(0, 50));
  }

  function renderRecords() {
    var box = $('stRecList');
    if (!box) return;
    var list = load(KEY_REC, []);
    if (!list.length) {
      box.innerHTML = '<div class="st-rec-none">还没有记录。生成结果后点「存入我的记录」，就会留在这里。</div>';
      return;
    }
    box.innerHTML = list.map(function (r) {
      return '<div class="st-rec"><span class="st-rec-t">' + esc(r.tool + ' · ' + r.title) + '</span>' +
        '<span class="st-rec-d">' + esc(r.time) + '</span>' +
        '<button class="st-mini" data-view="' + r.id + '">查看</button>' +
        '<button class="st-mini danger" data-del="' + r.id + '">删除</button></div>';
    }).join('');
  }

  var recBox = $('stRecList');
  if (recBox) {
    recBox.addEventListener('click', function (e) {
      var v = e.target.closest('[data-view]'), d = e.target.closest('[data-del]');
      var list = load(KEY_REC, []);
      if (v) {
        var r = list.filter(function (x) { return String(x.id) === v.getAttribute('data-view'); })[0];
        if (!r) return;
        resBox.innerHTML = '<h4>' + esc(r.tool + ' · ' + r.title) + '</h4><p class="st-hint">' + esc(r.time) + '</p>' +
          '<div class="st-out"><div class="st-block"><div class="ti-note" style="white-space:pre-wrap">' + esc(r.text) + '</div></div></div>' +
          '<div class="st-toolbar"><button class="st-mini" id="rcCopy">复制</button><button class="st-mini" id="rcMd">导出 Markdown</button></div>';
        $('rcCopy').addEventListener('click', function () { copy(r.text, this); });
        $('rcMd').addEventListener('click', function () { download(r.text, r.tool + '.md', 'text/markdown'); });
        resBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      if (d) {
        store(KEY_REC, list.filter(function (x) { return String(x.id) !== d.getAttribute('data-del'); }));
        renderRecords();
      }
    });
    renderRecords();
  }

  var recExport = $('stRecExport');
  if (recExport) {
    recExport.addEventListener('click', function () {
      var list = load(KEY_REC, []);
      if (!list.length) { copy('（暂无记录）', this); return; }
      var md = '# 红算子工作台记录\n\n' + list.map(function (r) {
        return '## ' + r.tool + ' · ' + r.title + '\n' + r.time + '\n\n' + r.text + '\n';
      }).join('\n---\n\n');
      download(md, '工作台记录.md', 'text/markdown');
    });
  }

  /* ================= AI 设置 ================= */
  var setBtn = $('stSetupToggle'), setBody = $('stSetupBody');
  if (setBtn && setBody) {
    var c = cfg();
    $('aiBase').value = c.base || 'https://api.deepseek.com';
    $('aiModel').value = c.model || 'deepseek-chat';
    $('aiKey').value = c.key || '';
    if (hasKey()) setBtn.classList.add('is-on');

    function saveCfg() {
      store(KEY_AI, { base: $('aiBase').value.trim(), model: $('aiModel').value.trim(), key: $('aiKey').value.trim() });
      setBtn.classList.toggle('is-on', hasKey());
      var ai = $('stAi');
      if (ai) {
        ai.classList.toggle('lock', !hasKey());
        ai.textContent = hasKey() ? '用 AI 精修' : '用 AI 精修（需先填 key）';
      }
    }
    ['aiBase', 'aiModel', 'aiKey'].forEach(function (id) {
      $(id).addEventListener('change', saveCfg);
    });
    $('aiSave').addEventListener('click', function () {
      saveCfg();
      this.textContent = '已保存';
      var self = this;
      setTimeout(function () { self.textContent = '保存设置'; }, 1500);
    });
    $('aiClear').addEventListener('click', function () {
      $('aiKey').value = '';
      saveCfg();
      this.textContent = '已删除';
      var self = this;
      setTimeout(function () { self.textContent = '删除 key'; }, 1500);
    });
    setBtn.addEventListener('click', function () {
      setBody.hidden = !setBody.hidden;
      if (!setBody.hidden) setBody.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  }

  /* ================= 启动 ================= */
  tabBox.addEventListener('click', function (e) {
    var b = e.target.closest('.st-tab');
    if (!b) return;
    curKey = b.getAttribute('data-k');
    renderTabs();
    renderForm();
    resBox.innerHTML = '<div class="st-empty">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 7h16M4 12h10M4 17h13" stroke-linecap="round"/></svg>' +
      '左边填内容，点「生成本地方案」<br>结果会出现在这里</div>';
  });

  renderTabs();
  renderForm();
})();
