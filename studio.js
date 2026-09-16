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
      if (b.t === 'verdict') {
        return '<div class="st-block"><h5>' + esc(b.h) + '</h5>' +
          '<div class="st-verdict ' + (b.level || 'mid') + '">' +
            '<div class="sv-top"><span class="sv-tag">' + esc(b.levelTxt || '结论') + '</span>' +
            '<b>' + esc(b.body) + '</b></div>' +
            (b.why ? '<div class="sv-why">' + esc(b.why) + '</div>' : '') +
            (b.do ? '<div class="sv-do"><i>下一步只做这一件</i>' + esc(b.do) + '</div>' : '') +
          '</div></div>';
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
      } else if (b.t === 'verdict') {
        out += '【' + (b.levelTxt || '结论') + '】' + b.body + '\n';
        if (b.why) out += '　依据：' + b.why + '\n';
        if (b.do) out += '　下一步：' + b.do + '\n';
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

  /* ================= 第二批：数值与判定工具 ================= */
  function num(s) {
    var t = String(s == null ? '' : s).replace(/[,，\s]/g, '');
    var m = /([\d.]+)\s*(万|w|W|k|K)?/.exec(t);
    if (!m) return NaN;
    var n = parseFloat(m[1]);
    if (!isFinite(n)) return NaN;
    var u = m[2];
    if (u === '万' || u === 'w' || u === 'W') n = n * 10000;
    else if (u === 'k' || u === 'K') n = n * 1000;
    return n;
  }

  function fmtN(n) {
    if (!isFinite(n)) return '未填';
    return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  function pct1(p) { return isFinite(p) ? (Math.round(p * 10) / 10) + '%' : '未填'; }

  function lvl(v, line) {
    if (!isFinite(v) || !isFinite(line) || line <= 0) return 'na';
    var r = v / line;
    return r >= 1.3 ? 'up' : (r >= 0.8 ? 'flat' : 'down');
  }

  var GRADE_TXT = { up: '高于对照线', flat: '接近对照线', down: '低于对照线', na: '数据不足' };
  var DEF_LINE = { ctr: 5, stay: 20, inter: 3, pc: 10, deal: 10 };

  function splitLines(s) {
    return String(s || '').split(/\r?\n/).map(function (x) { return x.trim(); }).filter(function (x) { return x.length > 0; });
  }

  function splitRow(s) {
    return String(s || '').split(/[|｜\t]|[ ]{2,}|[，,](?=\s*\d)/).map(function (x) { return x.trim(); }).filter(function (x) { return x.length > 0; });
  }

  /* ================= 工具四：发布回查 ================= */
  function runDiag(v) {
    var imp = num(v.dg_imp), click = num(v.dg_click), stay = num(v.dg_stay),
      inter = num(v.dg_inter), pc = num(v.dg_pc), deal = num(v.dg_deal),
      bImp = num(v.dg_bimp), bCtr = num(v.dg_bctr);

    var ctrPp = (isFinite(click) && isFinite(imp) && imp > 0) ? click / imp * 100 : NaN;
    var interPp = (isFinite(inter) && isFinite(imp) && imp > 0) ? inter / imp * 100 : NaN;
    var pcPp = (isFinite(pc) && isFinite(click) && click > 0) ? pc / click * 100 : NaN;
    var dealPp = (isFinite(deal) && isFinite(pc) && pc > 0) ? deal / pc * 100 : NaN;
    var ctrLine = (isFinite(bCtr) && bCtr > 0) ? bCtr : DEF_LINE.ctr;

    var layers = [
      {
        k: '① 曝光：系统给不给量', val: fmtN(imp),
        line: (isFinite(bImp) && bImp > 0) ? fmtN(bImp) + '（你的基线）' : '未填基线',
        chk: (isFinite(bImp) && bImp > 0 && isFinite(imp)) ? lvl(imp, bImp) : 'na',
        note: '曝光比账号同类内容低，说明这条在分发阶段就停了，问题在选题方向和首图，不在正文。',
        body: '卡在分发层：曝光明显低于你自己的同类内容，系统没有继续把它推出去。',
        act: '先别改正文。换一个切入场景，或者换一张在小图尺寸下也能一眼看懂的首图，同一个产品再发一条做对照。'
      },
      {
        k: '② 点击：封面 + 标题', val: pct1(ctrPp),
        line: pct1(ctrLine) + (isFinite(bCtr) && bCtr > 0 ? '（你的基线）' : '（通用参考）'),
        chk: lvl(ctrPp, ctrLine),
        note: '曝光有了但点进来的人少，这是典型的封面和标题没在信息流里说清「这条跟你有什么关系」。',
        body: '卡在封标组合：看到的人不少，愿意点开的人不够。',
        act: '只改封面首图和标题，正文一个字别动再发。标题把核心场景词放进前 18 个字，封面换成「使用前后」或「结果特写」。'
      },
      {
        k: '③ 停留：前两秒接不接得住', val: isFinite(stay) ? stay + ' 秒' : '未填',
        line: DEF_LINE.stay + ' 秒（通用参考）', chk: lvl(stay, DEF_LINE.stay),
        note: '点开了却很快划走，多半是开头在自我介绍，或者直接甩参数，用户第一眼没拿到「对我有什么用」。',
        body: '卡在开头承接：人点进来了，但没有留下来。',
        act: '重写开头两行。第一行直接给结果或结论，第二行讲它解决了什么具体问题，把自我介绍删掉。'
      },
      {
        k: '④ 互动：值不值得收藏或说点什么', val: pct1(interPp),
        line: pct1(DEF_LINE.inter) + '（赞藏评/曝光）', chk: lvl(interPp, DEF_LINE.inter),
        note: '看完了没点赞没收藏也没评论，内容讲清楚了，但没给出「值得存下来」或「想问一句」的理由。',
        body: '卡在内容价值：看完了，但没有留下任何动作。',
        act: '在结尾加一个明确的承接：一份清单、一个避坑点、或者一句「我有一个细节没写进来，想知道的评论区扣 1」。'
      },
      {
        k: '⑤ 商品点击：内容有没有把商品接住', val: pct1(pcPp),
        line: pct1(DEF_LINE.pc) + '（商品点击/点击）', chk: lvl(pcPp, DEF_LINE.pc),
        note: '内容有人看但没人点商品，通常是商品出现得太晚，或者讲了半天没说清它到底解决哪一个问题。',
        body: '卡在内容到商品的衔接：内容跑得动，但没有把人送进商品页。',
        act: '把商品的出场位置提前到正文三分之一处，并用一句话点明「就是它解决了前面那个问题」，结尾只留一个动作。'
      },
      {
        k: '⑥ 成交：商品页能不能接住', val: pct1(dealPp),
        line: pct1(DEF_LINE.deal) + '（成交/商品点击）', chk: lvl(dealPp, DEF_LINE.deal),
        note: '点了商品却不买，问题已经不在内容了 —— 是价格、详情页信息、评价和顾虑没有被处理掉。',
        body: '卡在商品承接：愿意点进来的人不少，但没有转化成订单。',
        act: '逐项检查商品页：价格有没有竞争力、主图有没有说清用法、评价和问答里有没有覆盖用户最担心的那件事。'
      }
    ];

    var rows = layers.map(function (l) {
      return [l.k, l.val, l.line, GRADE_TXT[l.chk], l.note];
    });

    var blocks = [];
    var hit = null;
    layers.forEach(function (l) { if (!hit && l.chk === 'down') hit = l; });

    if (hit) {
      blocks.push({
        t: 'verdict', h: '先只处理这一个地方', level: 'high', levelTxt: '最上游的卡点',
        body: hit.body,
        why: '判定依据（' + hit.k.split('：')[0] + '）：' + hit.val + '，对照线 ' + hit.line + '。漏斗上游不通的时候，改下游等于白改。',
        do: hit.act
      });
    } else {
      blocks.push({
        t: 'verdict', h: '这一条的判断', level: 'low', levelTxt: '没有单点硬伤',
        body: '填进来的数据里没有出现明显低于对照线的环节，这一条可以先保持，不要整篇推翻。',
        why: '已经核对的层级都在对照线附近或以上。',
        do: '把它复制到同一个场景里再发一条，验证这个数据是不是能稳定复现 —— 一条跑得好说明不了问题，能重复才算模型。'
      });
    }

    blocks.push({ t: 'table', h: '漏斗逐层对照（跟你自己比，不和行业大号比）', head: ['漏斗层级', '你的数据', '对照线', '判定', '这一层在说什么'], rows: rows });

    var missing = [];
    if (!isFinite(bImp)) missing.push('账号同类内容的平均曝光');
    if (!isFinite(ctrPp)) missing.push('点击数（用来算点击率）');
    if (!isFinite(stay)) missing.push('平均阅读时长');
    if (!isFinite(dealPp)) missing.push('成交数');
    if (missing.length) {
      blocks.push({
        t: 'list', h: '这些地方填了会更准',
        items: missing.map(function (m) {
          return { title: m, desc: '没填的地方本工具按「数据不足」跳过，不会替你猜数字。' };
        })
      });
    }

    blocks.push({
      t: 'para', h: '用这张表的规矩',
      text: '一次只处理一个最明显的问题，改完再发一轮看数据。不要看见数据低就把封面、标题、正文全部推翻 —— 那样就算跑好了，你也不知道是哪一处起了作用。多条内容整体不理想时，才是回到周期复盘去跟你自己的基线比较。'
    });

    return { blocks: blocks, table: { head: ['漏斗层级', '你的数据', '对照线', '判定', '这一层在说什么'], rows: rows } };
  }

  /* ================= 工具五：周期复盘 ================= */
  function runReview(v) {
    var span = v.rv_span === 'month' ? '本月' : '本周';
    var lines = splitLines(v.rv_lines);
    var bImp = num(v.rv_bimp);
    var rows = [], items = [];
    var tally = { up: [], flat: [], down: [] };

    if (!lines.length) {
      return {
        blocks: [{
          t: 'para', h: '没有读到内容',
          text: '至少贴一行内容数据再跑。每行一条，格式：笔记标题 | 曝光 | 商品点击 | 成交。用竖线隔开就行，缺的项可以空着。'
        }], table: null
      };
    }

    lines.forEach(function (ln, i) {
      var p = splitRow(ln);
      var t = p[0] || ('第 ' + (i + 1) + ' 条');
      var imp = num(p[1]), pc = num(p[2]), deal = num(p[3]);
      var hasDeal = isFinite(deal) && deal > 0;
      var hasPc = isFinite(pc) && pc > 0;
      var g = lvl(imp, bImp);

      var decide, why;
      if (g === 'down') {
        if (hasDeal) {
          decide = '观察'; why = '曝光比基线低，但这条真的带来了成交 —— 播放量不好看不等于没价值，别急着淘汰。';
          tally.flat.push(t);
        } else {
          decide = '淘汰'; why = '曝光明显低于自己的基线，也没有商品结果，这个方向先停下来，把精力挪到跑得动的那几条上。';
          tally.down.push(t);
        }
      } else if (g === 'up') {
        decide = '加码'; why = '明显高于自己的基线，' + (hasPc ? '商品点击也起来了，' : '') + '这个组合值得顺着再做一组。';
        tally.up.push(t);
      } else if (g === 'flat') {
        if (hasDeal) {
          decide = '加码'; why = '曝光平平但有成交，是典型的「内容不爆、产品能卖」，值得保留并往这个人群加推。';
          tally.up.push(t);
        } else {
          decide = '观察'; why = '和基线差不多，暂时不动，也不追加投入，等下一轮数据。';
          tally.flat.push(t);
        }
      } else {
        decide = '待补'; why = '没填账号基线曝光，无法和自己比较，这里不下判断。';
      }

      rows.push([String(i + 1), t, fmtN(imp), (isFinite(bImp) && bImp > 0 && isFinite(imp)) ? Math.round(imp / bImp * 100) + '%' : '—', fmtN(pc), fmtN(deal), '**' + decide + '**', why]);
      items.push({ title: t + ' → ' + decide, desc: why });
    });

    var blocks = [];
    blocks.push({
      t: 'verdict', h: span + '的整体判断', level: tally.down.length > tally.up.length ? 'high' : 'mid',
      levelTxt: span + '结论',
      body: '加码 ' + tally.up.length + ' 条、观察 ' + tally.flat.length + ' 条、淘汰 ' + tally.down.length + ' 条。' +
        (isFinite(bImp) && bImp > 0 ? '（对照的是你自己的基线曝光 ' + fmtN(bImp) + '）' : '（没填基线曝光，本次只做了粗判）'),
      why: tally.up.length ? '跑得动的：' + tally.up.slice(0, 3).join('、') : '这一轮没有明显高于基线的内容，先别加量，回去检查选题方向。',
      do: tally.up.length
        ? '把加码的那几条拆开看：是封面、标题、场景还是商品在起作用，下一轮只围绕它做变体，不要同时换方向。'
        : '这一轮先不加码。把淘汰的方向停掉，集中把「观察」的几条改一处再试一轮。'
    });

    blocks.push({ t: 'table', h: span + '内容逐条判定', head: ['#', '笔记', '曝光', '相对基线', '商品点击', '成交', '决定', '理由'], rows: rows });

    blocks.push({
      t: 'list', h: '按结论分组',
      items: [
        { title: '加码（' + tally.up.length + ' 条）', desc: tally.up.length ? tally.up.join('、') : '本轮没有。下轮的重点应该是找出一条能加码的，而不是铺更多内容。' },
        { title: '观察（' + tally.flat.length + ' 条）', desc: tally.flat.length ? tally.flat.join('、') : '本轮没有。' },
        { title: '淘汰（' + tally.down.length + ' 条）', desc: tally.down.length ? tally.down.join('、') : '本轮没有需要停的方向。' }
      ]
    });

    blocks.push({
      t: 'list', h: '写回复盘时还要记下来的',
      items: [
        { title: '内容角度', desc: '哪几个人群和场景的组合反复出现好信号？把它们补进选题库，下次直接调用。' },
        { title: '封面与标题', desc: '点击率高的封面长什么样、标题用的什么钩子？整理成模板，别每次从零想。' },
        { title: '评论里的需求', desc: '评论区反复问的那几件事，就是下一批内容的现成选题。' },
        { title: '人工耗时', desc: '这一周花在重复操作上的时间，哪些可以交给模板或工具，别每周都手抄一遍数据。' }
      ]
    });

    blocks.push({
      t: 'para', h: '这套判定的前提',
      text: '所有比较都是跟你自己的账号基线做的，不拿同行的播放量硬套。' +
        (isFinite(bImp) && bImp > 0 ? '' : '这次没填基线曝光，判定偏粗 —— 补上你近 10 条内容的平均曝光再跑一次会更准。')
    });

    return { blocks: blocks, table: { head: ['#', '笔记', '曝光', '相对基线', '商品点击', '成交', '决定', '理由'], rows: rows } };
  }

  /* ================= 工具六：成交路径 ================= */
  function runConv(v) {
    var prod = v.cv_prod || '这款产品';
    var aud = v.cv_aud || '目标人群';
    var price = num(v.cv_price);
    var way = v.cv_way || '私信';
    var worries = words(v.cv_worry);
    var trust = v.cv_trust || '';

    var tier, tierDesc, steps;
    if (!isFinite(price) || price <= 0) {
      tier = '未填客单价';
      tierDesc = '你没填客单价，下面按中等决策强度给路径。补上价格后，路径长短会自动调整。';
      steps = buildSteps(prod, aud, way, 'mid', worries);
    } else if (price <= 99) {
      tier = '低决策（¥' + price + ' 以内）';
      tierDesc = '这个价位用户不太需要犹豫，路径越短越好。别在中间加太多说服环节，加了反而掉人。';
      steps = buildSteps(prod, aud, way, 'low', worries);
    } else if (price <= 499) {
      tier = '中决策（¥100 - ¥499）';
      tierDesc = '这个价位用户会货比三家。你要做的是「给对比依据」而不是「喊它好」，中间必须有一层信任材料。';
      steps = buildSteps(prod, aud, way, 'mid', worries);
    } else {
      tier = '高决策（¥' + price + ' 以上）';
      tierDesc = '这个价位用户买的是「判断对不对」，不是产品本身。路径会长，但每一层掉的人都值得 —— 急着报价反而把人吓跑。';
      steps = buildSteps(prod, aud, way, 'high', worries);
    }

    var blocks = [];
    blocks.push({
      t: 'verdict', h: '这个客单价该怎么走', level: tier.indexOf('高决策') === 0 ? 'high' : (tier.indexOf('低决策') === 0 ? 'low' : 'mid'),
      levelTxt: tier, body: tierDesc,
      why: '成交方式：' + way + '。路径一共 ' + steps.length + ' 步，每一步只承担一个目的，不要在同一步里既建立信任又报价。',
      do: '先把第 1 步和第 2 步做扎实 —— 大部分漏斗是死在前面两层，而不是死在最后的报价话术。'
    });

    blocks.push({
      t: 'table', h: '从内容到成交的路径',
      head: ['步骤', '这一步的目的', '具体怎么做', '怎么判断这步通不通'],
      rows: steps.map(function (s) { return [s[0], s[1], s[2], s[3]]; })
    });

    blocks.push({
      t: 'list', h: '私信开场：别用「需要吗」当第一句',
      items: [
        { title: '给东西型', desc: '「看到你问的是 XX —— 我把' + prod + '的挑选清单整理好了，直接发你，不用客气。」先给，不索取。' },
        { title: '反问型', desc: '「想先问一下，你主要是想解决 ' + (worries[0] || '哪一个具体场景') + '？」问清楚再说话，比先报价成交率高得多。' },
        { title: '承接评论型', desc: '「你在评论区那条我看到了，情况我大概明白，先说结论：你这个情况更适合…」让人知道你真的看了他的问题。' }
      ]
    });

    if (worries.length) {
      blocks.push({
        t: 'list', h: '你填的顾虑，逐条准备应答',
        items: worries.slice(0, 6).map(function (w) {
          return {
            title: '用户说：' + w,
            desc: '别否认，先承认再解释：' +
              '「你担心的这个很正常，之前也有人问过 —— 当时的情况是…，处理后是…。如果你怕这点，可以先…」' +
              (trust ? '可以拿「' + trust + '」当证据。' : '这里需要一份真实证据（测评、对比图、使用记录），没有就去补，不要用形容词顶。')
          };
        })
      });
    }

    blocks.push({
      t: 'para', h: '这条路径的红线',
      text: '评论区和私信里不要直接甩外部联系方式或站外链接，平台会限流甚至禁言；不要承诺「一定有效」「用了就好」这类绝对化表述；' +
        '私信内容不要群发同一段话，被系统识别为营销信息会掉权重。' + (isFinite(price) && price > 499 ? '高客单价尤其不要在第一次对话就报价 —— 先判断需求，再给方案。' : '')
    });

    return { blocks: blocks, table: { head: ['步骤', '这一步的目的', '具体怎么做', '怎么判断这步通不通'], rows: steps.map(function (s) { return [s[0], s[1], s[2], s[3]]; }) } };
  }

  function buildSteps(prod, aud, way, tier, worries) {
    var w0 = worries[0] || '最常被担心的那件事';
    var s = [];
    s.push(['1 触达：让有这个困扰的人停下来',
      '拿到点击，过滤掉无关人群',
      '封面放使用后的结果或前后对比，标题点名「' + aud + '」和具体场景，不要放产品全称但让人看不懂',
      '看点击率有没有到你自己的基线']);
    s.push([
      '2 承接：让人读下去', '把点击变成读完',
      tier === 'high'
        ? '不要上来介绍产品。先讲「判断这件事的标准是什么」，让人觉得你懂这个领域，而不是急着卖东西'
        : '开头两句直接讲使用后的结果和它解决的具体问题，自我介绍全部删掉',
      '看平均阅读时长有没有到 20 秒'
    ]);
    if (tier === 'mid' || tier === 'high') {
      s.push(['3 主页承担信任',
        '让人确认「这个账号值得信」',
        '简介点名服务的人群和能给什么；三条置顶分别放「测评/对比合集」「真实使用记录」「你是谁」，缺哪类补哪类',
        '看主页访问后的关注转化']);
    }
    if (tier === 'high') {
      s.push(['4 建立专业判断',
        '把「在卖东西」变成「在给建议」',
        '发一条讲方法和判断标准的内容，公开说明你为什么会推荐、什么情况下不推荐',
        '看有没有人主动在评论区描述自己的情况']);
    }
    s.push([(s.length + 1) + ' 钩子：把人接到' + way,
      '创造一次一对一对话的机会',
      tier === 'low'
        ? '结尾只给一个动作：「链接在橱窗 / 看置顶」，别给两个以上的出口'
        : '评论区用统一话术接：「我把清单/对比表整理好了，扣 1 我发你」，一条一条回，别复制粘贴同一句',
      '看评论区和' + way + '的量有没有起来']);
    s.push([(s.length + 1) + ' 对话：先给东西再谈钱',
      '把咨询变成有依据的选择',
      tier === 'high'
        ? '先问清对方的具体情况和使用场景，给出初步判断，报价值放到第二次对话之后'
        : '先给对比清单或选购依据，再问预算和需求，最后才报价',
      '看对话轮次有没有超过 3 轮 —— 聊得越深成交越高']);
    s.push([(s.length + 1) + ' 收口：处理最后一个顾虑',
      '把犹豫变成下单',
      '针对「' + w0 + '」给出具体答案和退路（不合适怎么处理、有没有保障），不要说笼统的「放心吧」',
      '看' + way + '到的成交数']);
    if (tier !== 'low') {
      s.push([(s.length + 1) + ' 复购：一次成交只是开始',
        '让人带来下一个人',
        '成交后给一份使用指引，隔几天问一次真实感受，满意再请他分享到自己的主页',
        '看复购和转介绍的数量']);
    }
    return s;
  }

  /* ================= 工具七：评论回复 ================= */
  var CM_RULES = [
    { n: '价格询问', re: /多少钱|什么价|报价|贵不贵|便宜|预算|性价比|价位|how much/i, top: 3, aim: '把价格话题从评论区接到私信或主页，同时不让别人觉得你在躲' },
    { n: '求链接/求购', re: /链接|哪里买|哪里入手|求购|买哪个|想要|蹲一个|橱窗|店铺|型号|求个/, top: 2, aim: '给一个明确的、平台友好的去处，不要在评论区甩外链' },
    { n: '质疑/担心', re: /真的吗|有用吗|有效吗|靠谱|智商税|假的|不信|有没有用|会不会|副作用|安全/, top: 3, aim: '这是最有置顶价值的一类：承认局限、给证据，不打太极' },
    { n: '具体提问', re: /怎么|如何|可以吗|能不能|请问|求教程|区别|适合|怎么办/, top: 2, aim: '给出能用的一句话答案，把细节留到正文或私信' },
    { n: '表达喜欢', re: /好看|喜欢|爱了|太棒|绝了|谢谢|学到了|收藏|种草|已买|回购/, top: 1, aim: '接住情绪，顺手把对话引向下一层' },
    { n: '闲聊水评', re: /[哈呵嘻]{2,}|来了|打卡|沙发|路过|哈哈|^[\s\S]{0,4}$/, top: 0, aim: '轻巧回一句，维持评论区温度即可，不要硬塞营销信息' }
  ];

  function cmGuess(t) {
    for (var i = 0; i < CM_RULES.length; i++) {
      if (CM_RULES[i].re.test(t)) return CM_RULES[i];
    }
    return { n: '一般性留言', re: null, top: 1, aim: '接住对方放下的问题，再给一个明确的下一步' };
  }

  function runComment(v) {
    var prod = v.cm_prod || '这款产品';
    var list = splitLines(v.cm_list);
    var goal = v.cm_goal || '私信';
    var price = num(v.cm_price);
    var note = v.cm_note || '这条笔记';

    if (!list.length) {
      return {
        blocks: [{ t: 'para', h: '没有读到评论', text: '把评论一行一条贴进来再跑。每行一条，原样复制就行。' }], table: null
      };
    }

    var goalTip = {
      '私信': '这一轮的目标是把人引到私信，所以回复里不报价、不放链接，只给一个「我发你」的动作。',
      '信任': '这一轮的目标是建立信任，所以宁可承认不足，也不要把话说满。',
      '下单': '这一轮的目标是促单，所以每条回复都要落到「下一步做什么」这一个具体动作上。',
      '选题': '这一轮的目标是收集选题，重点看哪些问题被反复问到 —— 它们就是下一批内容。'
    }[goal] || '这一轮的目标是把人引到私信。';

    var rows = [], best = null, bestIdx = -1;
    list.slice(0, 20).forEach(function (t, i) {
      var r = cmGuess(t);
      var reply = cmReply(prod, goal, r.n, price, t);
      rows.push([String(i + 1), t.slice(0, 40), '**' + r.n + '**', reply, r.aim]);
      if (!best || r.top > best.top) { best = r; bestIdx = i; }
    });

    var blocks = [];
    blocks.push({
      t: 'verdict', h: '这一轮评论区怎么打', level: goal === '下单' ? 'mid' : 'low', levelTxt: '目标：' + goal,
      body: goalTip,
      why: '一共读了 ' + list.length + ' 条评论。这一步不追求每条都回出花来，追求的是「每条都有一个明确去处」。',
      do: '先把下面标成「质疑/担心」和「价格询问」的回完 —— 这两类最能影响后面看到这条笔记的人。'
    });

    blocks.push({ t: 'table', h: '逐条回复建议', head: ['#', '原评论', '判定类型', '建议回复', '这样回的用意'], rows: rows });

    blocks.push({
      t: 'list', h: '置顶哪一条',
      items: [
        {
          title: best.top > 0 ? '建议置顶第 ' + (bestIdx + 1) + ' 条（' + best.n + '）' : '暂时没有值得置顶的',
          desc: best.top > 0
            ? '置顶的逻辑不是挑最好听的，而是挑「最能打消后来者顾虑」的那条。' + best.aim + '。置顶后这条回答会被后面每个点进来的人看到。'
            : '这轮评论里没有能打消顾虑的对话。可以在正文里主动埋一个用户最常问的问题并自己抢答（用回复的方式补在评论区），再把那条置顶。'
        },
        {
          title: '置顶之后做什么',
          desc: '隔两小时回来看一次。评论区的回复也是内容，会被算法算进互动，也会给后来的读者第一印象。'
        }
      ]
    });

    if (goal === '选题') {
      blocks.push({
        t: 'list', h: '这批评论能变成什么选题',
        items: dedupeTypes(rows).map(function (n) {
          return { title: '「' + n + '」类问题 → 单开一条笔记', desc: '标题直接拿用户的原话，正文按「先答结论、再给方法、最后说适用边界」的顺序写。' };
        })
      });
    }

    blocks.push({
      t: 'para', h: '评论区的红线',
      text: '不要在评论区直接放微信号、手机号或站外链接，容易被折叠甚至限流；不要回复「私我」两个字就完事 —— 既没给对方理由，也容易被系统判为导流。' +
        '同一个回复别连着复制粘贴十几条，会被识别成营销行为。'
    });

    return { blocks: blocks, table: { head: ['#', '原评论', '判定类型', '建议回复', '这样回的用意'], rows: rows } };
  }

  function dedupeTypes(rows) {
    var seen = {}, out = [];
    rows.forEach(function (r) {
      var n = String(r[2]).replace(/\*/g, '');
      if (!seen[n] && n !== '闲聊水评') { seen[n] = 1; out.push(n); }
    });
    return out;
  }

  function cmReply(prod, goal, type, price, raw) {
    if (type === '价格询问') {
      return price > 0
        ? '「' + prod + '是 ' + price + ' 元档的，不同规格差得挺多 —— 你说下你的情况，我帮你看看哪个划算。」（不在评论区直接说「便宜」，让人自己去比）'
        : '「价格分规格，我把对照表整理好了发你，你按自己的情况挑就行。」';
    }
    if (type === '求链接/求购') {
      return goal === '下单'
        ? '「在橱窗里 / 置顶那条有写，点进去就能看到，还有问题随时问我。」（给一个明确去处，别留「私我」两个字）'
        : '「我把入口整理在置顶那条了，另外挑的时候有个坑我顺便提醒你一句…」（先给点东西，再让人去）';
    }
    if (type === '质疑/担心') {
      return '「你这个担心是对的，它确实不适合所有人 —— 比如 XX 情况就不建议。我自己用下来的情况是…，我发你看看实际的记录。」（先承认边界，比说「放心有效」可信得多）';
    }
    if (type === '具体提问') {
      return '「一句话版：…。完整的我写在置顶那条里了，看完还有卡住的再问我。」（评论区给答案，细节留给正文，别让人白跑一趟）';
    }
    if (type === '表达喜欢') {
      return '「谢谢！你如果也打算试，我提醒一句 XX 别踩。」（接住情绪，顺手给个实用信息，不要回「谢谢支持」四个字）';
    }
    if (type === '闲聊水评') {
      return '一句轻松的回应即可，不带任何引导。不是每条流量都要接住。';
    }
    return '「你说的是 XX 这块吧？我大概是这么处理的…，你的情况如果不一样告诉我，我再帮你看看。」';
  }

  /* ================= 工具八：竞品台账 ================= */
  function runRival(v) {
    var lines = splitLines(v.rb_lines);
    var thresh = num(v.rb_thresh);
    var focus = v.rb_focus || '';

    if (!lines.length) {
      return {
        blocks: [{ t: 'para', h: '没有读到账号', text: '每行一个账号，格式：账号名 | S/A/B | 粉丝数 | 近期平均赞 | 备注。用竖线隔开，没粉丝数可以空着。' }], table: null
      };
    }

    var rows = [], group = { S: [], A: [], B: [] }, noLevel = [];
    lines.slice(0, 40).forEach(function (ln, i) {
      var p = splitRow(ln);
      var name = p[0] || ('账号 ' + (i + 1));
      var lv = String(p[1] || '').toUpperCase();
      if (lv.indexOf('S') === 0) lv = 'S';
      else if (lv.indexOf('A') === 0) lv = 'A';
      else if (lv.indexOf('B') === 0) lv = 'B';
      else lv = '';
      var fans = num(p[2]), likes = num(p[3]);
      var memo = p[4] || '';
      var rate = (isFinite(likes) && isFinite(fans) && fans > 0) ? Math.round(likes / fans * 1000) / 10 : NaN;
      if (lv) group[lv].push(name); else noLevel.push(name);
      rows.push([
        String(i + 1), name, lv ? '**' + lv + ' 级**' : '未分级', fmtN(fans), fmtN(likes),
        pct1(rate) + (isFinite(rate) ? '' : ''), RIVAL_DUTY[lv || 'X'].watch, memo || '—'
      ]);
    });

    var blocks = [];
    blocks.push({
      t: 'verdict', h: '这批对手怎么盯', level: group.S.length ? 'mid' : 'low',
      levelTxt: '共 ' + lines.length + ' 个账号',
      body: 'S 级 ' + group.S.length + ' 个（头部分分钟可能有新动向）、A 级 ' + group.A.length + ' 个（同量级，重点学）、B 级 ' + group.B.length + ' 个（上升期，提前看）。' +
        (noLevel.length ? '另有 ' + noLevel.length + ' 个没标级别，建议补上：' + noLevel.slice(0, 3).join('、') + '。' : ''),
      why: '分级不是为了排场，是为了决定「多久看一次」和「看什么」。没有分级的账号最容易变成无效关注。',
      do: 'S 级每天扫一眼有没有新内容，A 级每周看一次爆款和失败品，B 级每两周看一次涨势 —— 不要对所有账号用同一个频率。'
    });

    blocks.push({ t: 'table', h: '台账明细', head: ['#', '账号', '级别', '粉丝数', '近期平均赞', '赞粉比', '盯什么', '备注'], rows: rows });

    blocks.push({
      t: 'list', h: '三级分工',
      items: [
        { title: 'S 级：' + (group.S.length || 0) + ' 个 —— 死盯', desc: group.S.length ? group.S.join('、') + '：他们的任何新动作都可能代表下一波趋势，重点看他们换了什么新的内容形式或商品。' : '还没有 S 级账号。找 2-3 个类目里明显领先的账号标上。' },
        { title: 'A 级：' + (group.A.length || 0) + ' 个 —— 学突破', desc: group.A.length ? group.A.join('、') + '：和你同量级，重点看他们正在尝试什么新方法，以及哪些尝试没成。' : '还没有 A 级账号。挑 3-5 个跟你体量接近、正在上升的。' },
        { title: 'B 级：' + (group.B.length || 0) + ' 个 —— 挖黑马', desc: group.B.length ? group.B.join('、') + '：涨得快但还没成气候，可以提前关注、找合作，或者拆解他们的崛起路径。' : '还没有 B 级账号。按日增粉丝去捞，比看绝对粉丝数更容易发现黑马。' }
      ]
    });

    blocks.push({
      t: 'list', h: '别只看对手爆了什么',
      items: [
        { title: '失败样本比爆款更值钱', desc: '把对手数据明显低于他平均水平的笔记也记下来 —— 那说明这个方向市场不买账，你可以直接省掉一轮试错。' },
        {
          title: '日增阈值该怎么设',
          desc: isFinite(thresh) && thresh > 0
            ? '你设的日增报警线是 ' + fmtN(thresh) + ' 粉丝。如果连续多日触发，说明这个体量的账号正处于上升期，值得升到更高一级去盯。'
            : '没填日增粉丝阈值。建议按你自己账号体量的 1%~3% 设一条线：触发了才看，不然每天刷一遍根本坚持不下来。'
        },
        { title: '粉丝数不等于价值', desc: '赞粉比低于 1% 的账号，粉丝再多也不值得参考 —— 数据可能是早期堆出来的，互动已经死了。' }
      ]
    });

    if (focus) {
      blocks.push({ t: 'para', h: '本周要盯的事', text: focus + '（记下来：本周结束前回头看一眼有没有答案，没有就说明这个观察项设得不好，下周换一个。）' });
    }

    blocks.push({
      t: 'para', h: '合规提醒',
      text: '监控和采集请走合规渠道：平台自带的创作中心/专业号后台数据、公开可见内容的手动整理，或有授权的数据服务。' +
        '不要用来路不明的爬虫去抓平台数据 —— 账号被限流或封禁的代价，远大于省下来的那点时间。批量绕过平台反爬还可能涉及法律责任。'
    });

    return { blocks: blocks, table: { head: ['#', '账号', '级别', '粉丝数', '近期平均赞', '赞粉比', '盯什么', '备注'], rows: rows } };
  }

  var RIVAL_DUTY = {
    S: { watch: '每天扫一眼：有没有新内容、换了什么形式' },
    A: { watch: '每周看：本周爆了什么、什么没爆' },
    B: { watch: '每两周看：涨势是否还在、能否合作' },
    X: { watch: '未分级，先补级别' }
  };

  /* ================= 工具九：爆款样本采集清单 ================= */
  var CL_SCENES = ['日常使用', '新房入住', '租房改造', '通勤路上', '出差旅行', '换季整理', '节日送礼', '宿舍生活', '小户型', '搬家前后'];
  var CL_PAINS = ['不知道怎么选', '买回来闲置', '用起来麻烦', '怕踩坑', '占地方', '价格不透明'];
  var CL_FIELDS = [
    ['笔记标题', '判断钩子和关键词埋点在哪', '原文照抄，一个字别改', '必采'],
    ['点赞 / 收藏 / 评论', '收藏高说明有用，评论高说明有争议或有需求', '三个数字分开记', '必采'],
    ['首图形式', '封面是最容易被复用的部分', '填：前后对比 / 结果特写 / 清单罗列 / 人出镜 / 场景实拍 / 纯文字', '必采'],
    ['发布时间', '找自己的发布节奏要用', '填日期即可', '必采'],
    ['话题标签', '看流量是从哪个入口进来的', '原文照抄', '必采'],
    ['正文开头两句', '判断第一眼怎么留住人', '概括成一句话', '必采'],
    ['博主粉丝量级', '判断这篇的参考价值 —— 大号和小号的打法不同', '填区间：1万以下 / 1-10万 / 10万+', '建议'],
    ['有没有挂商品', '判断它的商业化程度', '填：无 / 挂链接 / 引导私信 / 置顶有', '建议'],
    ['评论区高频问题', '这是最现成的下一批选题', '摘最多 3 条原话', '建议'],
    ['这篇我不采的理由', '防止样本全是「看起来很厉害但用不上」', '一句话', '建议']
  ];
  var CL_TAGS = [
    ['内容形式', '图文 / 视频 / 合集 / 清单 / 测评 / 教程 / 答疑 / 对比', '判断这类内容在这个类目里的主流形态'],
    ['切入角度', '痛点切入 / 场景切入 / 人群切入 / 价格切入 / 避坑切入', '用来横向对比哪种角度更容易起'],
    ['封面类型', '前后对比 / 结果特写 / 清单罗列 / 人出镜 / 场景实拍', '直接整理成自己的封面模板库'],
    ['商品化程度', '无商品 / 挂链接 / 引导私信 / 置顶有', '判断这条能不能拿来判断转化路径'],
    ['可用性', '可直接改 / 换个场景能用 / 仅参考 / 用不上', '样本库最有价值的一列，逼你每次都做判断']
  ];

  function uniq(a) {
    var seen = {}, out = [];
    a.forEach(function (x) {
      var t = String(x || '').trim();
      if (t && !seen[t]) { seen[t] = 1; out.push(t); }
    });
    return out;
  }

  function runCollect(v) {
    var prod = v.cl_prod || '我的产品';
    var aud = v.cl_aud || '目标人群';
    var seeds = words(v.cl_kw);
    var scenes = words(v.cl_scene);
    if (!scenes.length) scenes = CL_SCENES.slice(0, 6);
    var pains = words(v.cl_pain);
    if (!pains.length) pains = CL_PAINS.slice(0, 4);
    var total = num(v.cl_n);
    if (!isFinite(total) || total < 1) total = 20;
    if (total > 60) total = 60;

    /* 五组关键词 */
    var groups = [
      { n: '人群词', why: '找到「谁在说这件事」，用来圈定说话的人而非商品', ws: [aud, aud + '好物', aud + '必看', '适合' + aud, aud + '避坑'] },
      { n: '场景词', why: '同一个产品在不同场景下的说法完全不同', ws: scenes.slice(0, 5).concat(scenes.length > 5 ? [] : ['']) },
      { n: '痛点词', why: '用户在搜索框里打的是困扰，不是产品名', ws: pains.slice(0, 5).concat(pains.length > 5 ? [] : ['']) },
      { n: '商品词', why: '最接近成交意图，用来找直接竞品', ws: [prod, prod + '推荐', prod + '测评', prod + '怎么选', prod + '避坑'] },
      { n: '长尾词', why: '竞争小、意图明确，新手最容易在这里找到样本', ws: [prod + ' ' + scenes[0], scenes[0] + ' ' + (pains[0] || '怎么选'), aud + '用的' + prod] }
    ];
    groups.forEach(function (g) { g.ws = uniq(g.ws).slice(0, 5); });
    if (seeds.length) {
      groups[3].ws = uniq(seeds.concat(groups[3].ws)).slice(0, 5);
    }

    /* 本周任务 */
    var taskWords = uniq(groups[3].ws.concat(groups[4].ws, groups[1].ws, groups[0].ws));
    var perWord = 3;
    var needWords = Math.max(1, Math.ceil(total / perWord));
    var rows = [], left = total, i;
    for (i = 0; i < needWords && left > 0; i++) {
      var take = Math.min(perWord, left);
      left -= take;
      rows.push([
        String(i + 1),
        '**' + taskWords[i % taskWords.length] + '**',
        take + ' 篇',
        CL_FIELDS.filter(function (f) { return f[3] === '必采'; }).map(function (f) { return f[0]; }).join('、'),
        '☐'
      ]);
    }

    var kwRows = [];
    groups.forEach(function (g) {
      g.ws.forEach(function (w, idx) {
        kwRows.push([idx === 0 ? g.n : '', w, g.why]);
      });
    });

    var blocks = [];
    blocks.push({
      t: 'verdict', h: '这周采什么', level: 'low', levelTxt: '目标 ' + total + ' 篇',
      body: '按每个搜索词采 3 篇算，这周需要 ' + needWords + ' 个词、共 ' + total + ' 篇。别一次铺太多词 —— 采 10 篇能看完的，比采 100 篇堆在表里有用得多。',
      why: '样本库的意义不在于大，在于你回头翻的时候每一条都能说出「它为什么好」。',
      do: '先把「商品词」那组采完，它们离成交最近，最容易看出这个赛道的打法。'
    });

    blocks.push({
      t: 'list', h: '五组关键词',
      items: groups.map(function (g) {
        return { title: g.n + '：' + g.ws.join(' / '), desc: g.why };
      })
    });

    blocks.push({ t: 'table', h: '本周采集任务', head: ['#', '搜索词', '目标篇数', '必须记录的字段', '打勾'], rows: rows });

    blocks.push({
      t: 'table', h: '每条样本要采集哪些字段',
      head: ['字段', '为什么采它', '怎么记', '是否必采'],
      rows: CL_FIELDS.map(function (f) {
        return [f[0], f[1], f[2], f[3] === '必采' ? '**必采**' : f[3]];
      })
    });

    blocks.push({
      t: 'table', h: '采回来怎么打标签',
      head: ['标签维度', '可选值', '打它的用处'],
      rows: CL_TAGS.map(function (t) { return [t[0], t[1], t[2]]; })
    });

    blocks.push({
      t: 'list', h: '采集纪律',
      items: [
        { title: '一次最多扫 20 分钟', desc: '刷着刷着变成看别人内容去了，是这三件事里最常见的翻车方式。定个闹钟，到点就停。' },
        { title: '只采你这个类目近 3 个月的内容', desc: '一年前的爆款现在未必还能跑，平台的推荐逻辑和用户的口味都变了。' },
        { title: '每采 10 篇就回头标一次「可用性」', desc: '攒到 100 篇再判断，你已经忘了当时为什么存它。' },
        { title: '留出 3 成额度给「没爆」的内容', desc: '只看爆款会让你以为每条都能爆。记下对手数据明显偏低的笔记，那才是市场的边界所在。' }
      ]
    });

    blocks.push({
      t: 'para', h: '这一步的边界',
      text: '这张清单只回答「该采什么、采回来怎么记」 —— 它不会替你去平台抓数据，也不需要你登录账号。' +
        '真实数据请用平台自带的创作中心和专业号后台、公开可见内容的手动整理，或有授权的数据服务来完成；' +
        '不要用来路不明的爬虫批量抓取，账号被限流或封禁的代价远大于省下的时间。'
    });

    return {
      blocks: blocks,
      tables: [
        { name: '本周采集任务', head: ['#', '搜索词', '目标篇数', '必须记录的字段', '打勾'], rows: rows },
        { name: '五组关键词', head: ['分组', '关键词', '这组用来干什么'], rows: kwRows },
        { name: '采集字段清单', head: ['字段', '为什么采它', '怎么记', '是否必采'], rows: CL_FIELDS.map(function (f) { return [f[0], f[1], f[2], f[3]]; }) }
      ]
    };
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
    },
    diag: {
      name: '发布回查',
      hint: '数据不好的时候用。填多少算多少，没填的会跳过而不是替你猜。',
      fields: [
        { k: 'dg_title', label: '笔记标题（选填）', ph: '方便你回头认出是哪条' },
        { k: 'dg_imp', label: '曝光 / 展现量', ph: '例：3200', req: true },
        { k: 'dg_click', label: '点击数', ph: '例：160', small: '用来算点击率' },
        { k: 'dg_bimp', label: '账号同类内容平均曝光', ph: '例：4000', small: '这是你自己的基线，不填就没法比' },
        { k: 'dg_bctr', label: '账号平均点击率%（选填）', ph: '例：5', small: '不填就用 5% 通用参考线' },
        { k: 'dg_stay', label: '平均阅读时长（秒，选填）', ph: '例：18' },
        { k: 'dg_inter', label: '互动数（赞+藏+评，选填）', ph: '例：80' },
        { k: 'dg_pc', label: '商品点击数（选填）', ph: '例：12' },
        { k: 'dg_deal', label: '成交数（选填）', ph: '例：1' }
      ],
      run: runDiag
    },
    review: {
      name: '周期复盘',
      hint: '每周或每月跑一次。每行一条内容，用竖线隔开：标题 | 曝光 | 商品点击 | 成交。',
      fields: [
        { k: 'rv_span', label: '周期', type: 'select', opts: ['本周', '本月'] },
        { k: 'rv_bimp', label: '账号基线曝光', ph: '例：3000', req: true, small: '近 10 条内容的平均曝光' },
        { k: 'rv_lines', label: '本期内容数据（每行一条）', type: 'textarea', req: true, ph: '出租屋收纳改造 | 5200 | 46 | 3\n抽屉分隔测评 | 1800 | 9 | 0\n换季整理清单 | 3400 | 21 | 1', small: '格式：标题 | 曝光 | 商品点击 | 成交，后面两项可以空着' }
      ],
      run: runReview
    },
    conv: {
      name: '成交路径',
      hint: '客单价决定路径长短 —— 先填价格，出来的步骤数会不一样。',
      fields: [
        { k: 'cv_prod', label: '产品 / 服务', ph: '例：定制收纳方案', req: true },
        { k: 'cv_aud', label: '目标人群', ph: '例：25-30 岁租房女生', req: true },
        { k: 'cv_price', label: '客单价（元）', ph: '例：89', req: true, small: '99 以内走短路径，500 以上走长路径' },
        { k: 'cv_way', label: '成交方式', type: 'select', opts: ['私信', '店铺下单', '社群沉淀', '线下到店'] },
        { k: 'cv_worry', label: '用户常见顾虑（逗号分隔）', ph: '例：怕不耐用，怕装不上，怕买回来闲置' },
        { k: 'cv_trust', label: '你能提供的信任材料（选填）', ph: '例：50 个真实改造案例、三年质保' }
      ],
      run: runConv
    },
    comment: {
      name: '评论回复',
      hint: '贴评论一行一条，出分类、回复话术和置顶建议。',
      fields: [
        { k: 'cm_list', label: '评论列表（每行一条）', type: 'textarea', req: true, ph: '多少钱呀\n在哪里买的\n这个真的有用吗\n抽屉深度 15 能用吗', small: '最多处理 20 条' },
        { k: 'cm_prod', label: '产品 / 服务', ph: '例：抽屉分隔盒', req: true },
        { k: 'cm_goal', label: '这轮评论区的目标', type: 'select', opts: ['私信', '信任', '下单', '选题'] },
        { k: 'cm_price', label: '客单价（选填）', ph: '例：89', small: '填了才知道价格类评论怎么接' },
        { k: 'cm_note', label: '这条笔记的主题（选填）', ph: '例：出租屋收纳改造' }
      ],
      run: runComment
    },
    rival: {
      name: '竞品台账',
      hint: '每行一个账号：账号名 | S/A/B | 粉丝数 | 近期平均赞 | 备注。没粉丝数可以空着。',
      fields: [
        { k: 'rb_lines', label: '账号列表', type: 'textarea', req: true, ph: '收纳研究所 | S | 320000 | 8500 | 头部，形式变化快\n整理癖阿May | A | 42000 | 1300 | 和我同量级\n小户型日记 | B | 9000 | 620 | 涨得快', small: '最多处理 40 个' },
        { k: 'rb_thresh', label: '日增粉丝报警阈值（选填）', ph: '例：200', small: '建议按自己体量的 1%~3% 设' },
        { k: 'rb_focus', label: '本周要盯的一件事（选填）', ph: '例：S 级账号有没有开始做视频合集' }
      ],
      run: runRival
    },
    collect: {
      name: '采集清单',
      hint: '不替你抓数据，只回答「该采什么、采回来怎么记」。每周开工前先跑一次。',
      fields: [
        { k: 'cl_prod', label: '产品 / 服务', ph: '例：抽屉分隔盒', req: true },
        { k: 'cl_aud', label: '目标人群', ph: '例：租房的年轻女生', req: true },
        { k: 'cl_n', label: '本周目标篇数', ph: '例：20', req: true, small: '建议 15-30 篇，多了看不完' },
        { k: 'cl_kw', label: '已知关键词（逗号分隔，选填）', ph: '例：收纳分区，抽屉整理', small: '会优先塞进商品词组' },
        { k: 'cl_scene', label: '场景词（逗号分隔，选填）', ph: '例：租房改造，换季整理' },
        { k: 'cl_pain', label: '痛点词（逗号分隔，选填）', ph: '例：抽屉一拉就乱' }
      ],
      run: runCollect
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

  /* 指令库同步过来的变量（只用于预填空字段，不写进本地存档） */
  var FILLVARS = null;
  document.addEventListener('xhs:fill', function (e) {
    FILLVARS = e.detail || null;
    renderForm();
  });

  function autoFill(f) {
    var F = FILLVARS || {};
    if (f.k.indexOf('prod') > -1) return F['产品'] || '';
    if (f.k.indexOf('aud') > -1) return F['人群'] || '';
    if (f.k.indexOf('price') > -1) return F['客单价'] || '';
    if (f.k.indexOf('bimp') > -1) return F['基线曝光'] || '';
    if (f.k.indexOf('pain') > -1) return F['痛点'] || '';
    return '';
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
        var saved = load('xhs.form.' + curKey, {})[f.k] || '';
        var val = saved || autoFill(f);
        var head = '<label class="st-field"><span>' + esc(f.label) + (f.req ? ' *' : '') + (f.small ? ' <small>' + esc(f.small) + '</small>' : '') + '</span>';
        if (f.type === 'textarea') {
          return head +
            '<textarea class="st-textarea" id="f_' + f.k + '" placeholder="' + esc(f.ph || '') + '">' + esc(val) + '</textarea></label>';
        }
        if (f.type === 'select') {
          return head + '<select class="st-input st-select" id="f_' + f.k + '">' +
            f.opts.map(function (o) {
              return '<option value="' + esc(o) + '"' + (val === o ? ' selected' : '') + '>' + esc(o) + '</option>';
            }).join('') + '</select></label>';
        }
        return head +
          '<input class="st-input" id="f_' + f.k + '" value="' + esc(val) + '" placeholder="' + esc(f.ph || '') + '"></label>';
      }).join('') +
      '<div class="st-actions">' +
        '<button class="st-run" id="stRun">生成本地方案</button>' +
        '<button class="st-ai-btn' + (hasKey() ? '' : ' lock') + '" id="stAi">' + (hasKey() ? '用 AI 精修' : '用 AI 精修（需先填 key）') + '</button>' +
        '<span class="st-msg" id="stMsg"></span>' +
      '</div>' +
      '<div class="st-status" id="stStatus"></div>';

    function fieldSaver(k) {
      return function () {
        var s = load('xhs.form.' + curKey, {});
        s[k] = ($('f_' + k) || {}).value || '';
        store('xhs.form.' + curKey, s);
      };
    }

    TOOLS[curKey].fields.forEach(function (f) {
      var el = $('f_' + f.k);
      if (!el) return;
      var fn = fieldSaver(f.k);
      el.addEventListener('input', fn);
      el.addEventListener('change', fn);
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

  function tablesOf(res) {
    if (res.tables && res.tables.length) return res.tables;
    if (res.table) return [{ name: '结果', head: res.table.head, rows: res.table.rows }];
    return [];
  }

  function renderResult(res) {
    var tbs = tablesOf(res);
    lastOutput = { text: blocksToText(res.blocks, TOOLS[curKey].name), tables: tbs, title: TOOLS[curKey].name };
    resBox.innerHTML =
      '<h4>' + esc(TOOLS[curKey].name) + ' · 结果</h4><p class="st-hint">本地引擎生成，可直接改改就用；也可以导出成 Markdown 或表格。</p>' +
      '<div class="st-out">' + renderBlocks(res.blocks) + '</div>' +
      '<div class="st-toolbar">' +
        '<button class="st-mini" id="exMd">导出 Markdown</button>' +
        tbs.map(function (tb, i) {
          return '<button class="st-mini"' + (i === 0 ? ' id="exCsv"' : '') + ' data-csv="' + i + '">导出 CSV（' + esc(tb.name) + '）</button>';
        }).join('') +
        '<button class="st-mini" id="exCopy">复制全文</button>' +
        '<button class="st-mini" id="exSave">存入我的记录</button>' +
      '</div>';
    $('exMd').addEventListener('click', function () { download(lastOutput.text, (lastOutput.title || '结果') + '.md', 'text/markdown'); });
    Array.prototype.forEach.call(resBox.querySelectorAll('[data-csv]'), function (btn) {
      btn.addEventListener('click', function () {
        var tb = lastOutput.tables[+btn.getAttribute('data-csv')];
        if (!tb) return;
        download(rowsToCSV(tb.head, tb.rows), (lastOutput.title || '结果') + '-' + tb.name + '.csv', 'text/csv');
      });
    });
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
      lastOutput = { text: txt, tables: tablesOf(res), title: TOOLS[curKey].name + ' · AI 精修版' };
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
