/* ══════════════════════════════════════════════════════════════
   منجز — app.js
   Modules: SoundEngine · StorageManager · UserManager ·
            TaskManager · GridManager · ExamManager ·
            Pages · Goals · Achievements · Countdown ·
            Analytics · UI · Onboarding · Admin
══════════════════════════════════════════════════════════════ */

'use strict';

/* ── helpers ── */
const dk = d => d.toISOString().slice(0,10);
const esc = s => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const uid = () => '_'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const timeAgo = ts => {
  if(!ts) return '—';
  const diff = Date.now()-ts, m = Math.floor(diff/60000);
  if(m<1) return I18n.t('now');
  if(m<60) return I18n.t('minsAgo').replace('{n}',m);
  const h = Math.floor(m/60);
  if(h<24) return I18n.t('hoursAgo').replace('{n}',h);
  return I18n.t('daysAgo').replace('{n}',Math.floor(h/24));
};

/* ══════════════════════════════════════════════
   I18N
══════════════════════════════════════════════ */
const I18n = (() => {
  let _lang = 'ar';
  const strings = {
    ar: {
      appName:'منجز', home:'الرئيسية', stats:'الإحصائيات',
      achievements:'الإنجازات', admin:'المدير',
      pages:'المجلدات', newPage:'مجلد جديد', settings:'الإعدادات',
      task:'مهام', visual:'بصري', exam:'اختبارات',
      done:'مكتمل', pending:'قيد التنفيذ', all:'الكل',
      save:'حفظ', cancel:'إلغاء', delete:'حذف', edit:'تعديل',
      add:'إضافة', create:'إنشاء', back:'رجوع',
      name:'الاسم', notes:'ملاحظات', score:'النتيجة',
      difficulty:'الصعوبة', easy:'سهل', medium:'متوسط', hard:'صعب',
      complete:'اكتمل', inProgress:'قيد الدراسة', favorite:'مفضل',
      retry:'إعادة', reset:'إعادة ضبط', open:'فتح',
      now:'الآن', minsAgo:'منذ {n} دقيقة', hoursAgo:'منذ {n} ساعة', daysAgo:'منذ {n} يوم',
      streak:'أيام متتالية', dailyGoal:'الهدف اليومي',
      smartSession:'جلسة ذكية', weakFirst:'الأضعف أولاً',
      random:'عشوائي', analytics:'التحليلات',
      bulkImport:'استيراد دفعي', addExam:'إضافة اختبار',
      examTracker:'متابعة الاختبارات', noExams:'لا توجد اختبارات بعد',
      addFirstExam:'أضف أول اختبار للبدء',
      greetMorning:'صباح الإنتاجية', greetAfternoon:'مساء النجاح', greetEvening:'ليلة الإنجاز',
      welcomeBack:'مرحباً مجدداً', hello:'مرحباً',
      lastOpened:'آخر فتح', link:'الرابط',
      enterLink:'أدخل رابط Google Forms...',
      enterTitle:'عنوان الاختبار...',
      bulkLinksHint:'أدخل كل رابط في سطر منفصل\nيمكنك إضافة عنوان بعد الرابط مفصولاً بـ |',
      sessionComplete:'اكتملت الجلسة!',
      excellent:'ممتاز!', great:'رائع!', good:'جيد',
      noScore:'—', pct:'%',
      confirmDelete:'هل تريد حذف هذا العنصر؟',
    },
    en: {
      appName:'Munajez', home:'Home', stats:'Statistics',
      achievements:'Achievements', admin:'Admin',
      pages:'Folders', newPage:'New Folder', settings:'Settings',
      task:'Tasks', visual:'Visual', exam:'Exams',
      done:'Done', pending:'Pending', all:'All',
      save:'Save', cancel:'Cancel', delete:'Delete', edit:'Edit',
      add:'Add', create:'Create', back:'Back',
      name:'Name', notes:'Notes', score:'Score',
      difficulty:'Difficulty', easy:'Easy', medium:'Medium', hard:'Hard',
      complete:'Complete', inProgress:'In Progress', favorite:'Favorite',
      retry:'Retry', reset:'Reset', open:'Open',
      now:'Now', minsAgo:'{n}m ago', hoursAgo:'{n}h ago', daysAgo:'{n}d ago',
      streak:'day streak', dailyGoal:'Daily Goal',
      smartSession:'Smart Session', weakFirst:'Weakest First',
      random:'Random', analytics:'Analytics',
      bulkImport:'Bulk Import', addExam:'Add Exam',
      examTracker:'Exam Tracker', noExams:'No exams yet',
      addFirstExam:'Add your first exam to get started',
      greetMorning:'Good morning', greetAfternoon:'Good afternoon', greetEvening:'Good evening',
      welcomeBack:'Welcome back', hello:'Hello',
      lastOpened:'Last opened', link:'Link',
      enterLink:'Enter Google Forms link...',
      enterTitle:'Exam title...',
      bulkLinksHint:'Enter each link on a separate line\nYou can add a title after the link separated by |',
      sessionComplete:'Session complete!',
      excellent:'Excellent!', great:'Great!', good:'Good',
      noScore:'—', pct:'%',
      confirmDelete:'Delete this item?',
    }
  };
  function t(key) { return (strings[_lang]||strings.ar)[key] || key; }
  function setLang(lang) {
    _lang = lang;
    document.documentElement.lang = lang;
    document.documentElement.dir = lang==='ar'?'rtl':'ltr';
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const k = el.dataset.i18n;
      if(k) el.textContent = t(k);
    });
    document.querySelectorAll('[data-i18n-ph]').forEach(el => {
      el.placeholder = t(el.dataset.i18nPh);
    });
  }
  function getLang() { return _lang; }
  return { t, setLang, getLang };
})();

/* ══════════════════════════════════════════════
   SOUND ENGINE
══════════════════════════════════════════════ */
const SoundEngine = (() => {
  let ctx = null;
  function _ctx() {
    if(!ctx) { try { ctx = new (window.AudioContext||window.webkitAudioContext)(); } catch(e){} }
    return ctx;
  }
  function _tone(f1,f2,vol,dur,wave='sine') {
    const c = _ctx(); if(!c) return;
    try {
      const osc=c.createOscillator(), gain=c.createGain();
      osc.type=wave; osc.connect(gain); gain.connect(c.destination);
      osc.frequency.setValueAtTime(f1,c.currentTime);
      if(f2!==f1) osc.frequency.exponentialRampToValueAtTime(f2,c.currentTime+dur*.6);
      gain.gain.setValueAtTime(vol,c.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001,c.currentTime+dur);
      osc.start(); osc.stop(c.currentTime+dur);
    } catch(e){}
  }
  function fill()    { _tone(600,950,.12,.06); }
  function unfill()  { _tone(400,260,.10,.04); }
  function taskDone(){ _tone(700,1100,.15,.06); setTimeout(()=>_tone(880,1200,.1,.04),100); }
  function examOpen(){ _tone(440,660,.1,.08); }
  function examDone(){ _tone(660,1100,.18,.08); setTimeout(()=>_tone(880,1320,.12,.06),120); setTimeout(()=>_tone(1100,1500,.08,.05),240); }
  function add()     { _tone(500,650,.08,.04); }
  function nav()     { _tone(350,420,.07,.03); }
  function success() { _tone(660,880,.2,.07); setTimeout(()=>_tone(880,1100,.15,.05),150); setTimeout(()=>_tone(1100,1320,.1,.04),280); }
  function error_s() { _tone(300,200,.15,.05,'square'); }
  function close_s() { _tone(400,320,.07,.03); }
  return { fill, unfill, taskDone, examOpen, examDone, add, nav, success, error:error_s, close:close_s };
})();

/* ══════════════════════════════════════════════
   STORAGE MANAGER
══════════════════════════════════════════════ */
const StorageManager = (() => {
  const KEY = 'mnj_v3';
  const ADMIN_HASH = btoa('Admin@Engaz2026');
  const MASTER_KEY = 'MnJz@Admin2026';

  function defaultUser(name) {
    return {
      id: uid(), name,
      avatar: name.charAt(0).toUpperCase(),
      color: ['#20d6a8','#3d8ef0','#8b5cf6','#f59e0b','#e879a0','#f97316'][Math.floor(Math.random()*6)],
      createdAt: Date.now(), lastActive: Date.now(),
      pages: [],
      soundEnabled: true, darkMode: true,
      lang: 'ar', achievements: {}
    };
  }
  function defaultPage(name, mode, opts={}) {
    const base = {
      id: uid(), name, mode,
      createdAt: Date.now(), activity: {},
      dailyGoal: opts.goal||0, goalStartFrom: 0,
      pin: '', recoveryBook: ''
    };
    if(mode==='task')  return {...base, tasks:[]};
    if(mode==='exam')  return {...base, exams:[], streak:0, lastStudyDate:'', studyHistory:[]};
    return {...base, cells:Array(opts.count||30).fill(0), shape:opts.shape||'circle', showNums:false, numSize:11, customColor:'#ff6b6b'};
  }
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if(raw) {
        const s = JSON.parse(raw);
        if(!s.users) s.users={};
        if(!s.currentUser) s.currentUser=null;
        return s;
      }
    } catch(e){}
    return { users:{}, currentUser:null };
  }
  function save(state) {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch(e){}
  }
  return { load, save, defaultUser, defaultPage, ADMIN_HASH, MASTER_KEY };
})();

/* ══════════════════════════════════════════════
   USER MANAGER
══════════════════════════════════════════════ */
const UserManager = (() => {
  let state = StorageManager.load();
  const getUsers    = () => Object.values(state.users);
  const getCurrent  = () => state.users[state.currentUser]||null;
  const createUser  = name => { const u=StorageManager.defaultUser(name); state.users[u.id]=u; state.currentUser=u.id; _save(); return u; };
  const switchUser  = id => { if(!state.users[id])return false; state.currentUser=id; state.users[id].lastActive=Date.now(); _save(); return true; };
  const updateUser  = patch => { const u=getCurrent(); if(!u)return; Object.assign(u,patch); _save(); };
  const deleteUser  = id => { delete state.users[id]; if(state.currentUser===id){ const k=Object.keys(state.users); state.currentUser=k.length?k[0]:null; } _save(); };
  const getSetting  = (k,def) => { const u=getCurrent(); return u?(u[k]!==undefined?u[k]:def):def; };
  const setSetting  = (k,v) => { const u=getCurrent(); if(u){u[k]=v;_save();} };
  const getState    = () => state;
  function _save() { StorageManager.save(state); }
  return { getUsers, getCurrent, createUser, switchUser, updateUser, deleteUser, getSetting, setSetting, getState };
})();

/* ══════════════════════════════════════════════
   TASK MANAGER
══════════════════════════════════════════════ */
const TaskManager = (() => {
  function _pg(pgId) {
    const u=UserManager.getCurrent(); if(!u) return null;
    return (u.pages||[]).find(p=>p.id===pgId)||null;
  }
  function getTasks(pgId) { const pg=_pg(pgId); return pg?(pg.tasks||[]): []; }
  function addTask(pgId, data) {
    const pg=_pg(pgId); if(!pg||pg.mode!=='task') return null;
    const t = { id:uid(), name:data.name||I18n.t('task'), desc:data.desc||'', priority:data.priority||'low', category:data.category||'', due:data.due||'', done:false, createdAt:Date.now(), completedAt:null };
    pg.tasks.push(t); UserManager.updateUser({}); return t;
  }
  function updateTask(pgId,tid,patch) { const pg=_pg(pgId); if(!pg) return; const t=pg.tasks.find(t=>t.id===tid); if(!t) return; Object.assign(t,patch); if(patch.done!==undefined){t.completedAt=patch.done?Date.now():null;} UserManager.updateUser({}); }
  function deleteTask(pgId,tid) { const pg=_pg(pgId); if(!pg) return; pg.tasks=pg.tasks.filter(t=>t.id!==tid); UserManager.updateUser({}); }
  function toggleTask(pgId,tid) {
    const pg=_pg(pgId); if(!pg) return false;
    const t=pg.tasks.find(t=>t.id===tid); if(!t) return false;
    t.done=!t.done; t.completedAt=t.done?Date.now():null;
    const today=dk(new Date()); pg.activity=pg.activity||{};
    if(t.done) pg.activity[today]=(pg.activity[today]||0)+1;
    UserManager.updateUser({}); return t.done;
  }
  function bulkAdd(pgId, lines) { lines.forEach(name=>{ if(name.trim()) addTask(pgId,{name:name.trim()}); }); }
  function getStats(pgId) {
    const tasks=getTasks(pgId);
    const done=tasks.filter(t=>t.done).length, total=tasks.length;
    return { done, total, pct:total>0?Math.round(done/total*100):0, overdue:tasks.filter(t=>!t.done&&t.due&&new Date(t.due)<new Date()).length, remaining:total-done };
  }
  return { getTasks, addTask, updateTask, deleteTask, toggleTask, bulkAdd, getStats };
})();

/* ══════════════════════════════════════════════
   GRID MANAGER (Visual Mode)
══════════════════════════════════════════════ */
const GridManager = (() => {
  let selColor=1, selShape='circle', gridSz=44, customColor='#ff6b6b';
  let undoStack=[], redoStack=[], undoTimer=null;
  let _isScrolling=false, _scrollTimer=null;
  const COLORS=['#20d6a8','#ef4444','#8b5cf6','#f59e0b','#3d8ef0','#f97316','#06b6d4','#e879a0','#6366f1','#14b8a6','#eab308','#a855f7'];

  function getColors() { return COLORS; }
  function getCells(pg) { return pg?(pg.cells||[]): []; }

  function toggleCell(pg, idx, el) {
    if(_isScrolling) return;
    const cells=pg.cells, prev=cells[idx];
    if(!prev||prev===0) {
      const val=selColor==='custom'?'custom':selColor;
      const before=cells.slice(); cells[idx]=val; _pushUndo(before,pg);
      _applyCell(el,val,pg);
      el.classList.add('filling','glow-anim');
      setTimeout(()=>el.classList.remove('filling','glow-anim'),800);
      const today=dk(new Date()); pg.activity=pg.activity||{}; pg.activity[today]=(pg.activity[today]||0)+1;
      if(UserManager.getSetting('soundEnabled',true)) SoundEngine.fill();
    } else {
      const before=cells.slice(); cells[idx]=0; _pushUndo(before,pg);
      el.className=`si si-${pg.shape||'circle'} unfilling`;
      setTimeout(()=>el.classList.remove('unfilling'),200);
      const nl=el.querySelector('.shape-nl'); if(!nl){const n=document.createElement('span');n.className='shape-nl';n.textContent=idx+1;el.appendChild(n);}
      if(UserManager.getSetting('soundEnabled',true)) SoundEngine.unfill();
    }
    UserManager.updateUser({}); _checkGoal(pg); _checkAllFilled(pg);
    return cells[idx];
  }

  function _applyCell(el, val, pg) {
    const shape=pg.shape||'circle';
    let cls=`si si-${shape} filled `;
    cls+=val==='custom'?'sc-cust':`sc${val}`;
    el.className=cls;
    if(val==='custom') el.style.setProperty('--cust-color',pg.customColor||'#ff6b6b');
    else el.style.removeProperty('--cust-color');
    if(pg.numSize) el.style.setProperty('--num-size',pg.numSize+'px');
  }

  function _pushUndo(before, pg) {
    undoStack.push({snap:before, pgId:pg.id});
    if(undoStack.length>30) undoStack.shift();
    redoStack=[];
    const bar=document.getElementById('undoBar');
    if(bar){ document.getElementById('undoMsg').textContent=I18n.t('done'); bar.classList.add('show'); }
    clearTimeout(undoTimer);
    undoTimer=setTimeout(()=>{ if(bar) bar.classList.remove('show'); },4000);
  }

  function undo() {
    if(!undoStack.length) return;
    const s=undoStack.pop(), u=UserManager.getCurrent(); if(!u) return;
    const pg=u.pages.find(p=>p.id===s.pgId); if(!pg) return;
    redoStack.push({snap:pg.cells.slice(),pgId:s.pgId});
    pg.cells=s.snap; UserManager.updateUser({});
    const grid=document.getElementById('shapeGrid');
    if(grid) renderGrid(pg,grid);
    _updateProgress(pg);
    UI.toast('↩ تم التراجع');
    const bar=document.getElementById('undoBar'); if(bar) bar.classList.remove('show');
  }

  function redo() {
    if(!redoStack.length) return;
    const s=redoStack.pop(), u=UserManager.getCurrent(); if(!u) return;
    const pg=u.pages.find(p=>p.id===s.pgId); if(!pg) return;
    undoStack.push({snap:pg.cells.slice(),pgId:s.pgId});
    pg.cells=s.snap; UserManager.updateUser({});
    const grid=document.getElementById('shapeGrid');
    if(grid) renderGrid(pg,grid);
    _updateProgress(pg);
    UI.toast('↪ تمت الإعادة');
  }

  function renderGrid(pg, container) {
    if(!pg||!container) return;
    container.innerHTML='';
    container.style.setProperty('--gsz',gridSz+'px');
    _applyNumVars(pg);
    const shape=pg.shape||'circle';
    const CHUNK=80;
    function renderChunk(start) {
      const frag=document.createDocumentFragment();
      const end=Math.min(start+CHUNK,pg.cells.length);
      for(let i=start;i<end;i++) frag.appendChild(_makeCell(pg.cells[i],i,shape,pg));
      container.appendChild(frag);
      if(end<pg.cells.length) requestAnimationFrame(()=>renderChunk(end));
      else container.classList.toggle('nums-on',!!pg.showNums);
    }
    renderChunk(0);
    container.addEventListener('touchstart',()=>{_isScrolling=false;},{passive:true});
    container.addEventListener('touchmove',()=>{_isScrolling=true;clearTimeout(_scrollTimer);},{passive:true});
    container.addEventListener('touchend',()=>{_scrollTimer=setTimeout(()=>{_isScrolling=false;},200);},{passive:true});
  }

  /* Apply number CSS variables from page settings to :root */
  function _applyNumVars(pg) {
    const root=document.documentElement;
    root.style.setProperty('--num-size',(pg.numSize||12)+'px');
    root.style.setProperty('--num-color', pg.numColor||'rgba(255,255,255,.70)');
    root.style.setProperty('--num-color-fill', pg.numColorFill||'rgba(0,0,0,.35)');
    root.style.setProperty('--num-weight', pg.numWeight||'700');
    root.style.setProperty('--num-visible', pg.showNums?'1':'0');
  }

  function _makeCell(val, i, shape, pg) {
    const el=document.createElement('div');
    el.dataset.idx=i;
    if(val&&val!==0) _applyCell(el,val,pg);
    else el.className=`si si-${shape}`;
    el.style.opacity='0';
    el.style.animation=`fadeIn .3s ${Math.min(i*2,500)}ms ease forwards`;
    const nl=document.createElement('span');
    nl.className='shape-nl';
    nl.textContent=i+1;
    el.appendChild(nl);
    el.addEventListener('click',()=>{ toggleCell(pg,i,el); _updateProgress(pg); });
    return el;
  }

  function _updateProgress(pg) { UI.updateVisualProgress(pg); }
  function _checkGoal(pg) { Goals.checkProgress(pg); }
  function _checkAllFilled(pg) {
    const cells=pg.cells||[];
    if(cells.length>0 && cells.every(c=>c&&c!==0)) {
      SoundEngine.success(); celebrate(pg.name); Achievements.check();
    }
  }

  function getStats(pg) {
    const cells=pg?pg.cells||[]:[];
    const filled=cells.filter(c=>c&&c!==0).length, total=cells.length;
    return {filled,total,remaining:total-filled,pct:total>0?Math.round(filled/total*100):0};
  }

  function resetCells(pg, container) {
    if(!pg) return;
    const before=pg.cells.slice(); _pushUndo(before,pg);
    pg.cells=pg.cells.map(()=>0); UserManager.updateUser({});
    if(container) renderGrid(pg,container);
    _updateProgress(pg);
  }

  function addCells(pg, n) {
    if(!pg) return;
    const before=pg.cells.slice(); _pushUndo(before,pg);
    for(let i=0;i<n;i++) pg.cells.push(0);
    UserManager.updateUser({});
    const g=document.getElementById('shapeGrid');
    if(g) renderGrid(pg,g);
    _updateProgress(pg);
    UI.toast(`➕ أضيف ${n} عنصر`);
  }

  function setShape(s) { selShape=s; }
  function setSize(sz,el) {
    gridSz=sz;
    document.querySelectorAll('.size-pill').forEach(b=>b.classList.remove('sel'));
    if(el) el.classList.add('sel');
    const g=document.getElementById('shapeGrid');
    if(g) g.style.setProperty('--gsz',sz+'px');
  }
  function setColor(c) {
    selColor=c;
    const dot=document.getElementById('colorPrevDot');
    if(dot){ dot.style.background=c==='custom'?customColor:COLORS[c-1]||'#20d6a8'; }
    if(UserManager.getSetting('soundEnabled',true)) SoundEngine.nav();
  }

  function toggleNums(pg) {
    if(!pg) return;
    pg.showNums=!pg.showNums;
    UserManager.updateUser({});
    const g=document.getElementById('shapeGrid');
    if(g) g.classList.toggle('nums-on',pg.showNums);
    _applyNumVars(pg);
    return pg.showNums;
  }

  /* Live-update num vars without full re-render */
  function applyNumVars(pg) { _applyNumVars(pg); }

  function confirmBulkFill() {
    const n=parseInt(document.getElementById('bulkFillCount').value)||0; if(n<1) return;
    const pg=Pages.getCurrent(); if(!pg) return;
    const before=pg.cells.slice(); _pushUndo(before,pg);
    const val=selColor==='custom'?'custom':selColor;
    const grid=document.getElementById('shapeGrid');
    const els=grid?grid.querySelectorAll('.si'):[];
    let filled=0;
    for(let i=0;i<pg.cells.length&&filled<n;i++) {
      if(!pg.cells[i]||pg.cells[i]===0) {
        pg.cells[i]=val; filled++;
        if(els[i]) { _applyCell(els[i],val,pg); els[i].classList.add('filling'); setTimeout(((j)=>()=>els[j]&&els[j].classList.remove('filling'))(i),400); }
        const today=dk(new Date()); pg.activity=pg.activity||{}; pg.activity[today]=(pg.activity[today]||0)+1;
      }
    }
    UserManager.updateUser({}); UI.updateVisualProgress(pg); UI.closeModal('modalBulkFill');
    UI.toast(`⚡ لوّن ${filled} عنصر`);
    if(UserManager.getSetting('soundEnabled',true)) SoundEngine.success();
    Goals.checkProgress(pg); _checkAllFilled(pg);
  }

  return { getColors, getCells, toggleCell, renderGrid, getStats, resetCells, addCells, setShape, setSize, setColor, toggleNums, applyNumVars, confirmBulkFill, undo, redo };
})();

/* ══════════════════════════════════════════════
   NUMBER CONTROLS — size, color, weight of shape labels
══════════════════════════════════════════════ */
const NumberControls = (() => {
  /* Preset color catalog for the number labels */
  const EMPTY_PRESETS = [
    { label:'أبيض',       val:'rgba(255,255,255,.85)', cls:'white'  },
    { label:'فاتح',       val:'rgba(255,255,255,.50)', cls:'light'  },
    { label:'رمادي',      val:'rgba(200,210,230,.65)', cls:''       , bg:'rgba(200,210,230,.65)' },
    { label:'أزرق',       val:'#3d8ef0',               cls:''       , bg:'#3d8ef0'  },
    { label:'أخضر',       val:'#20d6a8',               cls:''       , bg:'#20d6a8'  },
    { label:'بنفسجي',    val:'#8b5cf6',               cls:''       , bg:'#8b5cf6'  },
    { label:'برتقالي',   val:'#f97316',               cls:''       , bg:'#f97316'  },
    { label:'أصفر',       val:'#eab308',               cls:''       , bg:'#eab308'  },
    { label:'وردي',       val:'#e879a0',               cls:''       , bg:'#e879a0'  },
  ];
  const FILL_PRESETS = [
    { label:'أسود',       val:'rgba(0,0,0,.45)',       cls:'dark'   },
    { label:'داكن',       val:'rgba(0,0,0,.22)',       cls:'black'  },
    { label:'أبيض',       val:'rgba(255,255,255,.80)', cls:'white'  },
    { label:'شفاف',       val:'transparent',           cls:''       , bg:'rgba(255,255,255,.08)', dashed:true },
    { label:'أزرق',       val:'#1e3a5f',               cls:''       , bg:'#1e3a5f'  },
    { label:'أخضر',       val:'#0d4a35',               cls:''       , bg:'#0d4a35'  },
    { label:'بنفسجي',    val:'#2d1b69',               cls:''       , bg:'#2d1b69'  },
  ];

  /* Current live state (not persisted between sessions — pg saves it) */
  let _selEmptyIdx = 0;
  let _selFillIdx  = 0;
  let _selWeight   = '700';

  /* ─────────────────────────────────────────
     open() — build and show the panel menu
  ───────────────────────────────────────── */
  function open() {
    const pg = Pages.getCurrent();
    if (!pg || pg.mode !== 'visual') return;

    // Sync local state from page
    _selWeight = pg.numWeight || '700';
    const curEmpty = pg.numColor || EMPTY_PRESETS[0].val;
    const curFill  = pg.numColorFill || FILL_PRESETS[0].val;
    _selEmptyIdx = EMPTY_PRESETS.findIndex(p=>p.val===curEmpty);
    if(_selEmptyIdx<0) _selEmptyIdx=0;
    _selFillIdx = FILL_PRESETS.findIndex(p=>p.val===curFill);
    if(_selFillIdx<0) _selFillIdx=0;

    const menu = document.getElementById('numPanelMenu');
    if (!menu) return;
    menu.innerHTML = _buildHTML(pg);
    menu.classList.add('open');

    // Live slider
    const slider = menu.querySelector('#npmSizeSlider');
    if (slider) {
      slider.addEventListener('input', () => {
        const v = parseInt(slider.value);
        menu.querySelector('#npmSizeVal').textContent = v + 'px';
        _liveApply(pg, { numSize: v });
        _updatePreview(menu, pg);
      });
    }
  }

  function close() {
    document.getElementById('numPanelMenu')?.classList.remove('open');
  }
  function toggle() {
    const m = document.getElementById('numPanelMenu');
    if (m?.classList.contains('open')) close(); else open();
  }

  /* ─────────────────────────────────────────
     _buildHTML — full panel inner HTML
  ───────────────────────────────────────── */
  function _buildHTML(pg) {
    const sz = pg.numSize || 12;
    const shown = !!pg.showNums;

    const emptySwatches = EMPTY_PRESETS.map((p,i)=>{
      const bg = p.bg || p.val;
      const border = i===_selEmptyIdx ? 'border:2px solid var(--text)' : 'border:2px solid transparent';
      return `<div class="npm-col-sw" style="background:${bg};${border}" data-ei="${i}" onclick="NumberControls._pickEmpty(${i})" title="${p.label}"></div>`;
    }).join('');

    const fillSwatches = FILL_PRESETS.map((p,i)=>{
      const bg = p.bg || p.val;
      const dash = p.dashed ? 'border:2px dashed rgba(255,255,255,.3)!important' : '';
      const border = i===_selFillIdx ? 'outline:2px solid var(--text);outline-offset:1px' : '';
      return `<div class="npm-col-sw" style="background:${bg};${dash};${border}" data-fi="${i}" onclick="NumberControls._pickFill(${i})" title="${p.label}"></div>`;
    }).join('');

    const weights = [
      {v:'400', lbl:'عادي'},
      {v:'700', lbl:'عريض'},
      {v:'900', lbl:'أثقل'},
    ];
    const wBtns = weights.map(w=>
      `<div class="npm-wt${_selWeight===w.v?' sel':''}" data-wt="${w.v}" onclick="NumberControls._pickWeight('${w.v}')">${w.lbl}</div>`
    ).join('');

    return `
      <div class="npm-title">🔢 إعدادات الأرقام</div>

      <!-- Visibility -->
      <div class="npm-row" style="margin-bottom:.55rem">
        <div class="npm-row-label">إظهار</div>
        <div style="display:flex;gap:5px;flex:1">
          <div class="npm-wt${shown?' sel':''}" onclick="NumberControls._toggleVis()" id="npmVisBtn" style="flex:1">${shown?'✅ مُظهَر':'👁 إظهار'}</div>
        </div>
      </div>

      <!-- Size slider -->
      <div class="npm-row">
        <div class="npm-row-label">الحجم</div>
        <input type="range" class="npm-slider" id="npmSizeSlider" min="8" max="38" value="${sz}">
        <div class="npm-slider-val" id="npmSizeVal">${sz}px</div>
      </div>

      <!-- Preview -->
      <div class="npm-preview" id="npmPreview">
        <div class="npm-prev-circle" id="npmPrevEmpty" style="background:var(--card2);border:2px solid var(--border2)">
          <span class="npm-prev-label" id="npmPrevEmptyLbl" style="font-size:${sz}px;color:${pg.numColor||EMPTY_PRESETS[0].val};font-weight:${_selWeight}">7</span>
        </div>
        <div style="font-size:.6rem;color:var(--muted);line-height:1.4;text-align:center">فارغ<br>◄</div>
        <div class="npm-prev-circle" id="npmPrevFill" style="background:var(--c1)">
          <span class="npm-prev-label" id="npmPrevFillLbl" style="font-size:${sz}px;color:${pg.numColorFill||FILL_PRESETS[0].val};font-weight:${_selWeight}">7</span>
        </div>
        <div style="font-size:.6rem;color:var(--muted);line-height:1.4;text-align:center">ملوّن<br>◄</div>
      </div>

      <!-- Empty color -->
      <div class="npm-col-label">🔲 لون الرقم على الفارغ</div>
      <div class="npm-col-row" id="npmEmptySwatches" style="margin-bottom:.6rem">${emptySwatches}</div>

      <!-- Fill color -->
      <div class="npm-col-label">🟩 لون الرقم على الملوّن</div>
      <div class="npm-col-row" id="npmFillSwatches" style="margin-bottom:.6rem">${fillSwatches}</div>

      <!-- Weight -->
      <div class="npm-col-label">وزن الخط</div>
      <div class="npm-weight-row" style="margin-bottom:.7rem">${wBtns}</div>

      <!-- Apply -->
      <button class="npm-apply-btn" onclick="NumberControls.apply()">✅ تطبيق</button>
    `;
  }

  /* ─────────────────────────────────────────
     Pickers — called from inline onclick
  ───────────────────────────────────────── */
  function _pickEmpty(i) {
    _selEmptyIdx = i;
    const pg = Pages.getCurrent(); if(!pg) return;
    // Update swatch borders
    document.querySelectorAll('#npmEmptySwatches .npm-col-sw').forEach((sw,idx)=>{
      sw.style.border = idx===i ? '2px solid var(--text)' : '2px solid transparent';
    });
    // Live preview
    const lbl = document.getElementById('npmPrevEmptyLbl');
    if(lbl) lbl.style.color = EMPTY_PRESETS[i].val;
    _liveApply(pg, { numColor: EMPTY_PRESETS[i].val });
  }

  function _pickFill(i) {
    _selFillIdx = i;
    const pg = Pages.getCurrent(); if(!pg) return;
    document.querySelectorAll('#npmFillSwatches .npm-col-sw').forEach((sw,idx)=>{
      sw.style.outline = idx===i ? '2px solid var(--text)' : 'none';
    });
    const lbl = document.getElementById('npmPrevFillLbl');
    if(lbl) lbl.style.color = FILL_PRESETS[i].val;
    _liveApply(pg, { numColorFill: FILL_PRESETS[i].val });
  }

  function _pickWeight(w) {
    _selWeight = w;
    const pg = Pages.getCurrent(); if(!pg) return;
    document.querySelectorAll('.npm-wt[data-wt]').forEach(b=>b.classList.toggle('sel', b.dataset.wt===w));
    [document.getElementById('npmPrevEmptyLbl'), document.getElementById('npmPrevFillLbl')].forEach(el=>{ if(el) el.style.fontWeight=w; });
    _liveApply(pg, { numWeight: w });
  }

  function _toggleVis() {
    const pg = Pages.getCurrent(); if(!pg) return;
    const newVal = !pg.showNums;
    pg.showNums = newVal;
    UserManager.updateUser({});
    const g = document.getElementById('shapeGrid');
    if(g) g.classList.toggle('nums-on', newVal);
    GridManager.applyNumVars(pg);
    const btn = document.getElementById('npmVisBtn');
    if(btn) btn.textContent = newVal ? '✅ مُظهَر' : '👁 إظهار';
    if(btn) btn.classList.toggle('sel', newVal);
    // sync topbar toggle label
    const topLbl = document.getElementById('numsToggleLabel');
    if(topLbl) topLbl.textContent = newVal ? 'إخفاء الأرقام' : '🔢 الأرقام';
  }

  /* Live apply CSS vars without saving */
  function _liveApply(pg, patch) {
    Object.assign(pg, patch);
    GridManager.applyNumVars(pg);
  }

  function _updatePreview(menu, pg) {
    const sz = parseInt(menu.querySelector('#npmSizeSlider')?.value) || pg.numSize || 12;
    [document.getElementById('npmPrevEmptyLbl'), document.getElementById('npmPrevFillLbl')].forEach(el=>{
      if(el) el.style.fontSize = sz+'px';
    });
  }

  /* ─────────────────────────────────────────
     apply() — save all settings to page + persist
  ───────────────────────────────────────── */
  function apply() {
    const pg = Pages.getCurrent(); if(!pg) return;
    const slider = document.getElementById('npmSizeSlider');
    if(slider) pg.numSize = parseInt(slider.value)||12;
    pg.numColor     = EMPTY_PRESETS[_selEmptyIdx].val;
    pg.numColorFill = FILL_PRESETS[_selFillIdx].val;
    pg.numWeight    = _selWeight;
    UserManager.updateUser({});
    GridManager.applyNumVars(pg);
    const g = document.getElementById('shapeGrid');
    if(g) g.classList.toggle('nums-on', !!pg.showNums);
    close();
    if(UserManager.getSetting('soundEnabled',true)) SoundEngine.success();
    UI.toast(`✅ تم تطبيق إعدادات الأرقام`);
  }

  return { open, close, toggle, apply, _pickEmpty, _pickFill, _pickWeight, _toggleVis };
})();

/* ══════════════════════════════════════════════
   EXAM MANAGER
══════════════════════════════════════════════ */
const ExamManager = (() => {
  function _pg(pgId) {
    const u=UserManager.getCurrent(); if(!u) return null;
    return (u.pages||[]).find(p=>p.id===pgId)||null;
  }
  function getExams(pgId) { const pg=_pg(pgId); return pg?(pg.exams||[]): []; }

  function addExam(pgId, data) {
    const pg=_pg(pgId); if(!pg||pg.mode!=='exam') return null;
    const e = {
      id: uid(),
      num: (pg.exams.length+1),
      title: data.title||`اختبار ${pg.exams.length+1}`,
      link: data.link||'',
      notes: data.notes||'',
      score: data.score!==undefined?data.score:null,
      difficulty: data.difficulty||'medium',
      completed: false,
      inProgress: false,
      favorite: false,
      retry: false,
      lastOpened: null,
      createdAt: Date.now()
    };
    pg.exams.push(e); UserManager.updateUser({}); return e;
  }

  function updateExam(pgId, eid, patch) {
    const pg=_pg(pgId); if(!pg) return;
    const e=pg.exams.find(e=>e.id===eid); if(!e) return;
    Object.assign(e,patch); UserManager.updateUser({});
  }

  function deleteExam(pgId, eid) {
    const pg=_pg(pgId); if(!pg) return;
    pg.exams=pg.exams.filter(e=>e.id!==eid);
    // re-number
    pg.exams.forEach((e,i)=>e.num=i+1);
    UserManager.updateUser({});
  }

  function toggleState(pgId, eid, state) {
    const pg=_pg(pgId); if(!pg) return;
    const e=pg.exams.find(e=>e.id===eid); if(!e) return;
    if(state==='complete') {
      e.completed=!e.completed;
      if(e.completed) { e.inProgress=false; _recordActivity(pg); }
    } else if(state==='inProgress') {
      e.inProgress=!e.inProgress;
      if(e.inProgress) e.completed=false;
    } else if(state==='favorite') {
      e.favorite=!e.favorite;
    } else if(state==='retry') {
      e.retry=!e.retry;
    }
    UserManager.updateUser({});
  }

  function openExam(pgId, eid) {
    const pg=_pg(pgId); if(!pg) return;
    const e=pg.exams.find(e=>e.id===eid); if(!e) return;
    e.lastOpened=Date.now();
    if(!e.completed && !e.inProgress) e.inProgress=true;
    UserManager.updateUser({});
    if(e.link) window.open(e.link,'_blank');
    if(UserManager.getSetting('soundEnabled',true)) SoundEngine.examOpen();
  }

  function _recordActivity(pg) {
    const today=dk(new Date()); pg.activity=pg.activity||{}; pg.activity[today]=(pg.activity[today]||0)+1;
    // update streak
    const last=pg.lastStudyDate;
    const yesterday=dk(new Date(Date.now()-86400000));
    if(!last || last===yesterday) {
      pg.streak=(pg.streak||0)+1;
    } else if(last!==today) {
      pg.streak=1;
    }
    pg.lastStudyDate=today;
    if(!pg.studyHistory) pg.studyHistory=[];
    const existing=pg.studyHistory.find(h=>h.date===today);
    if(existing) existing.count++;
    else pg.studyHistory.push({date:today,count:1});
  }

  function bulkImport(pgId, raw) {
    const lines=raw.split('\n').map(l=>l.trim()).filter(Boolean);
    let added=0;
    lines.forEach(line=>{
      const parts=line.split('|');
      const link=parts[0].trim();
      const title=parts[1]?parts[1].trim():'';
      if(link) { addExam(pgId,{link,title:title||undefined}); added++; }
    });
    return added;
  }

  function getStats(pgId) {
    const exams=getExams(pgId);
    const done=exams.filter(e=>e.completed).length;
    const inProg=exams.filter(e=>e.inProgress).length;
    const total=exams.length;
    const scores=exams.filter(e=>e.score!==null&&e.score!==undefined&&e.completed);
    const avg=scores.length>0?Math.round(scores.reduce((a,e)=>a+e.score,0)/scores.length):null;
    return { done, inProg, total, pct:total>0?Math.round(done/total*100):0, avg };
  }

  // Smart ordering: weak exams first (lowest score or never opened)
  function getWeakFirst(pgId) {
    const exams=getExams(pgId).filter(e=>!e.completed);
    return [...exams].sort((a,b)=>{
      const sa=a.score!==null?a.score:101;
      const sb=b.score!==null?b.score:101;
      if(sa!==sb) return sa-sb; // lower score first
      // then by difficulty
      const dw={hard:0,medium:1,easy:2};
      return (dw[a.difficulty]||1)-(dw[b.difficulty]||1);
    });
  }

  function getRandomOrder(pgId) {
    const exams=getExams(pgId).filter(e=>!e.completed);
    return [...exams].sort(()=>Math.random()-.5);
  }

  function getSpacedRepetition(pgId) {
    // Exams not studied recently get priority
    const exams=getExams(pgId);
    const now=Date.now();
    return [...exams].sort((a,b)=>{
      const la=a.lastOpened||0, lb=b.lastOpened||0;
      return la-lb; // least recently opened first
    });
  }

  return { getExams, addExam, updateExam, deleteExam, toggleState, openExam, bulkImport, getStats, getWeakFirst, getRandomOrder, getSpacedRepetition };
})();

/* ══════════════════════════════════════════════
   PAGES MODULE
══════════════════════════════════════════════ */
const Pages = (() => {
  let _currentId = null, _pendingPin = null;

  function getAll() { const u=UserManager.getCurrent(); return u?(u.pages||[]): []; }
  function getCurrent() { const u=UserManager.getCurrent(); if(!u) return null; return (u.pages||[]).find(p=>p.id===_currentId)||null; }
  function setCurrentId(id) { _currentId=id; }

  function create(name, mode, opts={}) {
    const u=UserManager.getCurrent(); if(!u) return null;
    const pg=StorageManager.defaultPage(name,mode,opts);
    u.pages.push(pg); UserManager.updateUser({}); return pg;
  }

  function update(id, patch) {
    const u=UserManager.getCurrent(); if(!u) return;
    const pg=(u.pages||[]).find(p=>p.id===id); if(!pg) return;
    Object.assign(pg,patch); UserManager.updateUser({});
  }

  function deletePage(id) {
    const u=UserManager.getCurrent(); if(!u) return;
    u.pages=(u.pages||[]).filter(p=>p.id!==id);
    if(_currentId===id) _currentId=null;
    UserManager.updateUser({});
  }

  function getStreak(pg) {
    if(!pg||!pg.activity) return 0;
    let streak=0, d=new Date();
    for(let i=0;i<365;i++) {
      const key=dk(new Date(d-i*86400000));
      if(pg.activity[key]>0) streak++;
      else if(i>0) break;
    }
    return streak;
  }

  function tryOpen(id) {
    const u=UserManager.getCurrent(); if(!u) return;
    const pg=(u.pages||[]).find(p=>p.id===id); if(!pg) return;
    if(pg.pin) {
      _pendingPin=id;
      document.getElementById('pinVal').value='';
      document.getElementById('pinErr').style.display='none';
      UI.openModal('modalPin');
    } else {
      _currentId=id;
      UI.openPage(id);
    }
  }

  function confirmPin() {
    const val=document.getElementById('pinVal').value.trim();
    const u=UserManager.getCurrent(); if(!u) return;
    const pg=(u.pages||[]).find(p=>p.id===_pendingPin); if(!pg) return;
    if(val===pg.pin || val===StorageManager.MASTER_KEY) {
      UI.closeModal('modalPin'); _currentId=_pendingPin; _pendingPin=null; UI.openPage(_currentId);
    } else {
      document.getElementById('pinErr').style.display='block';
      if(UserManager.getSetting('soundEnabled',true)) SoundEngine.error();
    }
  }

  function confirmNew() {
    const name=document.getElementById('npName').value.trim(); if(!name){document.getElementById('npName').focus();return;}
    const mode=document.getElementById('npMode').value;
    const pin=document.getElementById('npPin').value.trim();
    const book=document.getElementById('npBook')?.value.trim()||'';
    const opts={goal:parseInt(document.getElementById('npGoal').value)||0};
    if(mode==='visual'){opts.count=parseInt(document.getElementById('npCount').value)||30;opts.shape=document.getElementById('npShape').value||'circle';}
    const pg=create(name,mode,opts);
    if(pin){pg.pin=pin;pg.recoveryBook=book;UserManager.updateUser({});}
    UI.closeModal('modalNewPage');
    UI.renderPagesNav();
    _currentId=pg.id;
    UI.openPage(pg.id);
    if(UserManager.getSetting('soundEnabled',true)) SoundEngine.add();
    UI.toast(`✨ "${name}"`);
    Achievements.check();
  }

  function _toggleVisualOpts() {
    const m=document.getElementById('npMode').value;
    document.getElementById('npVisualOpts').classList.toggle('hidden',m!=='visual');
    document.getElementById('npExamOpts').classList.toggle('hidden',m!=='exam');
  }

  function exportData() {
    const pg=getCurrent(); if(!pg) return;
    const a=document.createElement('a');
    a.href=URL.createObjectURL(new Blob([JSON.stringify(pg,null,2)],{type:'application/json'}));
    a.download=`${pg.name}_${Date.now()}.json`; a.click();
    UI.toast('📥 تم التصدير');
  }

  return { getAll, getCurrent, setCurrentId, create, update, deletePage, getStreak, tryOpen, confirmPin, confirmNew, _toggleVisualOpts, exportData };
})();

/* ══════════════════════════════════════════════
   GOALS MODULE
══════════════════════════════════════════════ */
const Goals = (() => {
  let _gs='fresh';
  function open() {
    const pg=Pages.getCurrent(); if(!pg) return;
    document.getElementById('goalVal').value=pg.dailyGoal||10;
    const isVis=pg.mode==='visual';
    document.getElementById('goalStartLabel').style.display=isVis?'block':'none';
    document.getElementById('goalStartRow').style.display=isVis?'flex':'none';
    document.getElementById('goalHint').style.display='none';
    UI.openModal('modalGoal');
  }
  function selectStart(s,el) {
    _gs=s;
    document.querySelectorAll('.goal-radio').forEach(r=>r.classList.toggle('sel',r.dataset.gs===s));
    const pg=Pages.getCurrent(); if(!pg||pg.mode!=='visual') return;
    const s2=GridManager.getStats(pg);
    const hint=document.getElementById('goalHint');
    if(s==='fresh'){hint.textContent=`سيبدأ العد من الصفر`;hint.style.display='block';}
    else{hint.textContent=`سيُحسب ${s2.filled} عنصر مكتمل`;hint.style.display='block';}
  }
  function confirm() {
    const pg=Pages.getCurrent(); if(!pg) return;
    const goal=parseInt(document.getElementById('goalVal').value)||0;
    pg.dailyGoal=goal;
    if(pg.mode==='visual'&&_gs==='fresh') pg.goalStartFrom=GridManager.getStats(pg).filled;
    else if(pg.mode==='visual') pg.goalStartFrom=0;
    UserManager.updateUser({});
    UI.closeModal('modalGoal');
    UI.toast(`🎯 الهدف: ${goal}`);
  }
  function checkProgress(pg) {
    if(!pg||!pg.dailyGoal) return;
    let cur=0;
    if(pg.mode==='visual') cur=GridManager.getStats(pg).filled-(pg.goalStartFrom||0);
    else if(pg.mode==='task') cur=TaskManager.getStats(pg.id).done;
    else if(pg.mode==='exam') cur=ExamManager.getStats(pg.id).done;
    if(cur>=pg.dailyGoal) { showCelebration('🎯 تحقق الهدف!',`أنجزت ${cur} من ${pg.dailyGoal}!`); }
  }
  return { open, selectStart, confirm, checkProgress };
})();

/* ══════════════════════════════════════════════
   ACHIEVEMENTS
══════════════════════════════════════════════ */
const Achievements = (() => {
  const LIST = [
    {id:'first_fill', name:'أول خطوة', desc:'أكمل عنصراً واحداً', icon:'🌱', check:(u,s)=>s.totalDone>=1},
    {id:'ten',        name:'العشرة',    desc:'أكمل 10 عناصر',     icon:'🔟', check:(u,s)=>s.totalDone>=10},
    {id:'fifty',      name:'النصف مئة', desc:'أكمل 50 عنصراً',   icon:'💪', check:(u,s)=>s.totalDone>=50},
    {id:'hundred',    name:'المئة',     desc:'أكمل 100 عنصر',     icon:'💯', check:(u,s)=>s.totalDone>=100},
    {id:'streak3',    name:'3 أيام',    desc:'3 أيام متواصلة',    icon:'🔥', check:(u,s)=>s.maxStreak>=3},
    {id:'streak7',    name:'أسبوع كامل',desc:'7 أيام متواصلة',   icon:'🏆', check:(u,s)=>s.maxStreak>=7},
    {id:'folders3',   name:'منظّم',     desc:'أنشئ 3 مجلدات',    icon:'📂', check:(u,s)=>s.pageCount>=3},
    {id:'perfectPage',name:'اكتمال تام',desc:'أكمل مجلداً بالكامل',icon:'⭐',check:(u,s)=>s.hasPerfect},
    {id:'exam_done',  name:'اختبار أول',desc:'أكمل اختباراً',    icon:'📝', check:(u,s)=>s.examsDone>=1},
    {id:'exam_ten',   name:'عشرة اختبارات',desc:'أكمل 10 اختبارات',icon:'🎓',check:(u,s)=>s.examsDone>=10},
  ];
  function _calcStats() {
    const u=UserManager.getCurrent(); if(!u) return {};
    let totalDone=0,maxStreak=0,hasPerfect=false,examsDone=0;
    (u.pages||[]).forEach(pg=>{
      const sk=Pages.getStreak(pg); if(sk>maxStreak) maxStreak=sk;
      if(pg.mode==='task'){const s=TaskManager.getStats(pg.id);totalDone+=s.done;if(s.total>0&&s.done===s.total)hasPerfect=true;}
      else if(pg.mode==='visual'){const s=GridManager.getStats(pg);totalDone+=s.filled;if(s.total>0&&s.filled===s.total)hasPerfect=true;}
      else if(pg.mode==='exam'){const s=ExamManager.getStats(pg.id);examsDone+=s.done;totalDone+=s.done;}
    });
    return {totalDone,maxStreak,hasPerfect,examsDone,pageCount:(u.pages||[]).length};
  }
  function check() {
    const u=UserManager.getCurrent(); if(!u) return;
    const stats=_calcStats();
    if(!u.achievements) u.achievements={};
    let newUnlock=false;
    LIST.forEach(a=>{
      if(!u.achievements[a.id]&&a.check(u,stats)) {
        u.achievements[a.id]=Date.now(); newUnlock=true;
        setTimeout(()=>UI.toast(`🏆 إنجاز جديد: ${a.name}`),500);
      }
    });
    if(newUnlock) UserManager.updateUser({});
  }
  function getList() { return LIST; }
  function getUnlocked() { const u=UserManager.getCurrent(); return u?(u.achievements||{}):{} ; }
  return { check, getList, getUnlocked };
})();

/* ══════════════════════════════════════════════
   COUNTDOWN TIMER
══════════════════════════════════════════════ */
const Countdown = (() => {
  let _timer=null, _remaining=0, _widget=null;

  function start() {
    const h=parseInt(document.getElementById('cdH').value)||0;
    const m=parseInt(document.getElementById('cdM').value)||0;
    const s=parseInt(document.getElementById('cdS').value)||0;
    _remaining=h*3600+m*60+s;
    if(_remaining<=0) return;
    UI.closeModal('modalCountdown');
    _widget=document.getElementById('cdWidget');
    if(_widget) _widget.classList.add('show');
    clearInterval(_timer);
    _timer=setInterval(_tick,1000);
    _render();
  }
  function _tick() {
    _remaining--;
    if(_remaining<=0) { clearInterval(_timer); _remaining=0; _render(); if(UserManager.getSetting('soundEnabled',true)) SoundEngine.success(); UI.toast('⏰ انتهى الوقت!'); }
    _render();
  }
  function _render() {
    const w=document.getElementById('cdTime'); if(!w) return;
    const h=Math.floor(_remaining/3600), m=Math.floor((_remaining%3600)/60), s=_remaining%60;
    w.textContent=`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    w.classList.toggle('urgent',_remaining>0&&_remaining<=60);
  }
  function stop() { clearInterval(_timer); _remaining=0; const w=document.getElementById('cdWidget'); if(w) w.classList.remove('show'); }
  function cdPreset(h,m,s) { document.getElementById('cdH').value=h; document.getElementById('cdM').value=m; document.getElementById('cdS').value=s; }
  return { start, stop, cdPreset };
})();

/* ══════════════════════════════════════════════
   SMART SESSION (Exam Study Mode)
══════════════════════════════════════════════ */
const SmartSession = (() => {
  let _queue=[], _idx=0, _pgId=null, _mode='weak';

  function start(pgId, mode='weak') {
    _pgId=pgId; _mode=mode; _idx=0;
    if(mode==='weak')   _queue=ExamManager.getWeakFirst(pgId);
    else if(mode==='random') _queue=ExamManager.getRandomOrder(pgId);
    else if(mode==='spaced') _queue=ExamManager.getSpacedRepetition(pgId);
    else _queue=ExamManager.getExams(pgId).filter(e=>!e.completed);

    if(!_queue.length){ UI.toast('✅ جميع الاختبارات مكتملة!'); return; }
    _showPanel();
  }

  function _showPanel() {
    const panel=document.getElementById('sessionPanel');
    if(!panel) return;
    panel.classList.remove('hidden');
    _renderCurrent();
  }

  function _renderCurrent() {
    if(_idx>=_queue.length){ _finish(); return; }
    const e=_queue[_idx];
    document.getElementById('sessionProgress').textContent=`${_idx+1} / ${_queue.length}`;
    document.getElementById('sessionBar').style.width=`${((_idx)/_queue.length)*100}%`;
    document.getElementById('sessionNum').textContent=e.num;
    document.getElementById('sessionTitle').textContent=e.title;
    document.getElementById('sessionNote').textContent=e.notes||'لا توجد ملاحظات';
    const scoreEl=document.getElementById('sessionScore');
    scoreEl.textContent=e.score!==null?`${e.score}%`:'—';
    scoreEl.className='sec-score '+(e.score!==null?(e.score>=70?'high':e.score>=50?'mid':'low'):'');
  }

  function openCurrent() {
    if(_idx>=_queue.length) return;
    const e=_queue[_idx];
    ExamManager.openExam(_pgId,e.id);
    // Re-render page if open
    const pg=Pages.getCurrent();
    if(pg&&pg.id===_pgId) UI.renderExamGrid(pg);
  }

  function markDone(score=null) {
    if(_idx>=_queue.length) return;
    const e=_queue[_idx];
    ExamManager.updateExam(_pgId,e.id,{completed:true,inProgress:false,score:score!==null?parseInt(score):e.score});
    ExamManager.toggleState(_pgId,e.id,'complete'); // triggers activity
    const pg=Pages.getCurrent(); if(pg&&pg.id===_pgId) UI.renderExamGrid(pg);
    _idx++; _renderCurrent();
    Achievements.check();
    if(UserManager.getSetting('soundEnabled',true)) SoundEngine.examDone();
  }

  function skip() { _idx++; _renderCurrent(); }

  function _finish() {
    document.getElementById('sessionPanel').classList.add('hidden');
    showCelebration(I18n.t('sessionComplete'),'أحسنت! واصل التقدم 🚀');
    if(UserManager.getSetting('soundEnabled',true)) SoundEngine.success();
    Achievements.check();
  }

  function close() { document.getElementById('sessionPanel').classList.add('hidden'); }

  return { start, openCurrent, markDone, skip, close };
})();

/* ══════════════════════════════════════════════
   ADMIN
══════════════════════════════════════════════ */
const Admin = (() => {
  let _authed=false;
  function tryLogin() { UI.openModal('modalAdminLogin'); document.getElementById('adminPwInp').value=''; document.getElementById('adminErr').style.display='none'; }
  function confirmLogin() {
    const pw=document.getElementById('adminPwInp').value;
    if(btoa(pw)===StorageManager.ADMIN_HASH||pw===StorageManager.MASTER_KEY) {
      _authed=true; UI.closeModal('modalAdminLogin'); UI.showView('admin');
    } else {
      document.getElementById('adminErr').style.display='block';
      if(UserManager.getSetting('soundEnabled',true)) SoundEngine.error();
    }
  }
  function loadData() {
    if(!_authed) return;
    const users=UserManager.getUsers();
    let rows='';
    users.forEach(u=>{
      const pages=u.pages||[];
      let totalDone=0,totalItems=0;
      pages.forEach(pg=>{
        if(pg.mode==='task'){const s=TaskManager.getStats(pg.id);totalDone+=s.done;totalItems+=s.total;}
        else if(pg.mode==='visual'){const s=GridManager.getStats(pg);totalDone+=s.filled;totalItems+=s.total;}
        else if(pg.mode==='exam'){const s=ExamManager.getStats(pg.id);totalDone+=s.done;totalItems+=s.total;}
      });
      rows+=`<tr>
        <td>${esc(u.name)}</td>
        <td>${pages.length}</td>
        <td>${totalDone}/${totalItems}</td>
        <td>${totalItems>0?Math.round(totalDone/totalItems*100):0}%</td>
        <td>${new Date(u.lastActive).toLocaleDateString('ar-SA')}</td>
        <td><button class="btn btn-danger btn-sm" onclick="Admin.deleteUser('${u.id}')">حذف</button></td>
      </tr>`;
    });
    const c=document.getElementById('content');
    c.innerHTML=`<div class="admin-wrap">
      <div class="admin-section">
        <div class="admin-section-hdr"><span>👥 المستخدمون (${users.length})</span></div>
        <table class="admin-table">
          <thead><tr><th>الاسم</th><th>المجلدات</th><th>الإنجاز</th><th>%</th><th>آخر نشاط</th><th></th></tr></thead>
          <tbody>${rows||'<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:1rem">لا يوجد مستخدمون</td></tr>'}</tbody>
        </table>
      </div>
      <div style="display:flex;gap:.5rem;flex-wrap:wrap;padding:.5rem 0">
        <button class="btn btn-danger" onclick="Admin.clearAll()">🗑 حذف كل البيانات</button>
        <button class="btn" onclick="Admin.exportAll()">📤 تصدير كل البيانات</button>
      </div>
    </div>`;
  }
  function deleteUser(id) {
    if(!confirm('حذف هذا المستخدم؟')) return;
    UserManager.deleteUser(id); loadData();
  }
  function clearAll() {
    if(!confirm('⚠️ حذف جميع البيانات نهائياً؟')) return;
    localStorage.clear(); location.reload();
  }
  function exportAll() {
    const a=document.createElement('a');
    a.href=URL.createObjectURL(new Blob([JSON.stringify(UserManager.getState(),null,2)],{type:'application/json'}));
    a.download=`mnj_backup_${Date.now()}.json`; a.click();
  }
  return { tryLogin, confirmLogin, loadData, deleteUser, clearAll, exportAll };
})();

/* ══════════════════════════════════════════════
   CONFETTI & CELEBRATION
══════════════════════════════════════════════ */
function confetti() {
  const cols=['#20d6a8','#ef4444','#8b5cf6','#f59e0b','#3d8ef0','#e879a0'];
  for(let i=0;i<28;i++){
    const el=document.createElement('div'); el.className='confetti-piece';
    el.style.cssText=`background:${cols[i%cols.length]};width:${5+Math.random()*7}px;height:${5+Math.random()*7}px;left:${10+Math.random()*80}%;top:${25+Math.random()*35}%;border-radius:${Math.random()>.5?'50%':'2px'};animation-delay:${Math.random()*.5}s;animation-duration:${.9+Math.random()*.7}s;`;
    document.body.appendChild(el);
    setTimeout(()=>el.remove(),1600);
  }
}
function showCelebration(title='رائع!',msg='أحسنت!') {
  confetti();
  document.getElementById('celTitle').textContent=title;
  document.getElementById('celMsg').textContent=msg;
  const cel=document.getElementById('celebration'); cel.classList.add('show');
  if(navigator.vibrate) navigator.vibrate([50,50,200]);
  setTimeout(()=>cel.classList.remove('show'),7000);
}
window.celebrate=(name)=>showCelebration('🎉 اكتمل المجلد!',`أنجزت جميع عناصر "${name}"! 🏆`);
function closeCelebration(){ document.getElementById('celebration').classList.remove('show'); }

/* ══════════════════════════════════════════════
   UI MODULE
══════════════════════════════════════════════ */
const UI = (() => {
  let _taskFilter='all', _taskSearch='', _toastTimer=null;
  let _taskSbCollapsed=false, _examView='grid';
  let _ctxMenu=null;

  /* ── Init ── */
  function init() {
    const u=UserManager.getCurrent(); if(!u) return;
    const lang=UserManager.getSetting('lang','ar');
    I18n.setLang(lang);
    _updateUserBadge();
    renderPagesNav();
    applyTheme();
    applySound();
    showView('home');
  }

  function _updateUserBadge() {
    const u=UserManager.getCurrent(); if(!u) return;
    document.getElementById('sbAvatar').textContent=u.avatar||u.name.charAt(0);
    document.getElementById('sbAvatar').style.background=u.color||'var(--accent)';
    document.getElementById('sbUserName').textContent=u.name;
  }

  /* ── Theme & Sound ── */
  function applyTheme() {
    const dark=UserManager.getSetting('darkMode',true);
    document.documentElement.setAttribute('data-theme',dark?'dark':'light');
    const btn=document.getElementById('themeBtn');
    if(btn) btn.textContent=dark?'☀️':'🌙';
  }
  function applySound() {
    const on=UserManager.getSetting('soundEnabled',true);
    const btn=document.getElementById('soundBtn');
    if(btn){ btn.textContent=on?'🔊':'🔇'; btn.classList.toggle('active',on); }
  }
  function toggleTheme() { const d=UserManager.getSetting('darkMode',true); UserManager.setSetting('darkMode',!d); applyTheme(); if(UserManager.getSetting('soundEnabled',true)) SoundEngine.nav(); }
  function toggleSound() { const s=UserManager.getSetting('soundEnabled',true); UserManager.setSetting('soundEnabled',!s); applySound(); }
  function toggleLang() {
    const cur=I18n.getLang(), next=cur==='ar'?'en':'ar';
    UserManager.setSetting('lang',next); I18n.setLang(next);
    const btn=document.getElementById('langBtn'); if(btn) btn.textContent=next==='ar'?'EN':'عر';
    renderPagesNav();
    const pg=Pages.getCurrent();
    if(pg) openPage(pg.id); else showView('home');
  }
  function toggleSidebar() { document.getElementById('sidebar').classList.toggle('collapsed'); }
  function toggleMobileSidebar() { document.getElementById('sidebar').classList.add('mobile-open'); document.getElementById('sidebar-backdrop').classList.add('show'); }
  function closeMobileSidebar() { document.getElementById('sidebar').classList.remove('mobile-open'); document.getElementById('sidebar-backdrop').classList.remove('show'); }

  /* ── Pages Nav ── */
  function renderPagesNav() {
    const pages=Pages.getAll(), nav=document.getElementById('pagesNav'); if(!nav) return;
    nav.innerHTML='';
    pages.forEach(pg=>{
      let pct=0;
      if(pg.mode==='task') pct=TaskManager.getStats(pg.id).pct;
      else if(pg.mode==='visual') pct=GridManager.getStats(pg).pct;
      else if(pg.mode==='exam') pct=ExamManager.getStats(pg.id).pct;
      const d=document.createElement('div');
      d.className='page-nav-item'+(pg.id===Pages.getCurrent()?.id?' active':'');
      const modeClass={'task':'','visual':'visual','exam':'exam'}[pg.mode]||'';
      const icon=pg.pin?'🔒':pg.mode==='task'?'📋':pg.mode==='visual'?'🎨':'📝';
      d.innerHTML=`<span class="pni-icon">${icon}</span><span class="pni-name">${esc(pg.name)}</span><span class="pni-pct">${pct}%</span><span class="pni-mode-dot ${modeClass}"></span>`;
      d.onclick=()=>Pages.tryOpen(pg.id);
      nav.appendChild(d);
    });
  }

  /* ── Views ── */
  function showView(v, anim=true) {
    const c=document.getElementById('content');
    document.querySelectorAll('.nav-item').forEach(el=>el.classList.toggle('active',el.dataset.view===v));
    if(anim){ c.style.opacity='0'; c.style.transform='translateY(8px)'; }
    setTimeout(()=>{
      switch(v) {
        case 'home':         c.innerHTML=_renderHome(); break;
        case 'stats':        c.innerHTML=_renderStats(); break;
        case 'achievements': c.innerHTML=_renderAchievements(); break;
        case 'admin':        Admin.loadData(); break;
        default:             c.innerHTML=_renderHome();
      }
      if(anim){ c.style.transition='opacity .22s,transform .22s'; c.style.opacity='1'; c.style.transform=''; setTimeout(()=>c.style.transition='',250); }
      _setTopbarView(v);
    }, anim?110:0);
  }

  function _setTopbarView(v) {
    const labels={home:I18n.t('home'),stats:I18n.t('stats'),achievements:I18n.t('achievements'),admin:I18n.t('admin')};
    setTopbar(labels[v]||I18n.t('home'),'');
    document.getElementById('topbarActions').innerHTML=`<button class="btn btn-icon btn-sm" onclick="UI.showView('home')">🏠</button>`;
  }

  function openPage(id) {
    Pages.setCurrentId(id);
    const pg=Pages.getCurrent(); if(!pg) return;
    renderPagesNav();
    const c=document.getElementById('content');
    c.style.opacity='0'; c.style.transform='translateX(-8px)';
    setTimeout(()=>{
      if(pg.mode==='task')        _renderTaskView(pg);
      else if(pg.mode==='visual') _renderVisualView(pg);
      else if(pg.mode==='exam')   _renderExamView(pg);
      c.style.transition='opacity .22s,transform .22s';
      c.style.opacity='1'; c.style.transform='';
      setTimeout(()=>c.style.transition='',250);
      _setTopbarPage(pg);
      document.querySelectorAll('.nav-item').forEach(el=>el.classList.remove('active'));
    },110);
  }

  function _setTopbarPage(pg) {
    let stats='';
    if(pg.mode==='task'){ const s=TaskManager.getStats(pg.id); stats=`${s.done}/${s.total} • ${s.pct}%`; }
    else if(pg.mode==='visual'){ const s=GridManager.getStats(pg); stats=`${s.filled}/${s.total} • ${s.pct}%`; }
    else if(pg.mode==='exam'){ const s=ExamManager.getStats(pg.id); stats=`${s.done}/${s.total} • ${s.pct}%`; }
    setTopbar(pg.name, stats);
    document.getElementById('topbarActions').innerHTML=`
      <button class="btn btn-icon btn-sm" onclick="UI.openPageSettings()" title="${I18n.t('settings')}">⚙️</button>
      <button class="btn btn-icon btn-sm" onclick="UI.showView('home')">🏠</button>`;
  }

  function setTopbar(title,sub) {
    document.getElementById('topbarTitle').textContent=title;
    document.getElementById('topbarSub').textContent=sub||'';
  }

  /* ── HOME ── */
  function _renderHome() {
    const u=UserManager.getCurrent(); if(!u) return '<div class="empty-state"><div class="empty-icon">👤</div></div>';
    const pages=Pages.getAll();
    let totalDone=0,totalItems=0;
    pages.forEach(pg=>{
      if(pg.mode==='task'){const s=TaskManager.getStats(pg.id);totalDone+=s.done;totalItems+=s.total;}
      else if(pg.mode==='visual'){const s=GridManager.getStats(pg);totalDone+=s.filled;totalItems+=s.total;}
      else if(pg.mode==='exam'){const s=ExamManager.getStats(pg.id);totalDone+=s.done;totalItems+=s.total;}
    });
    const streak=_calcGlobalStreak(pages);
    const hour=new Date().getHours();
    const greet=hour<12?I18n.t('greetMorning'):hour<18?I18n.t('greetAfternoon'):I18n.t('greetEvening');
    const dateStr=new Date().toLocaleDateString(I18n.getLang()==='ar'?'ar-SA':'en-US',{weekday:'long',year:'numeric',month:'long',day:'numeric'});

    const cardsHtml=pages.map((pg,idx)=>{
      let s={done:0,filled:0,total:0,pct:0};
      if(pg.mode==='task') s=TaskManager.getStats(pg.id);
      else if(pg.mode==='visual') s=GridManager.getStats(pg);
      else if(pg.mode==='exam') { const es=ExamManager.getStats(pg.id); s={done:es.done,filled:es.done,total:es.total,pct:es.pct}; }
      const sk=Pages.getStreak(pg);
      const modeLabel=pg.mode==='task'?I18n.t('task'):pg.mode==='visual'?I18n.t('visual'):I18n.t('exam');
      const modeClass=`pc-mode-${pg.mode}`;
      const icon=pg.mode==='task'?'📋':pg.mode==='visual'?'🎨':'📝';
      return `<div class="page-card anim-${idx%6}" onclick="Pages.tryOpen('${pg.id}')">
        ${pg.pin?`<span class="pc-pin">🔒</span>`:''}
        ${sk>1?`<span class="pc-streak">🔥${sk}</span>`:''}
        <div class="pc-mode ${modeClass}">${icon} ${modeLabel}</div>
        <div class="pc-title">${esc(pg.name)}</div>
        <div class="pc-sub">${s.done||s.filled||0} / ${s.total}</div>
        <div class="pc-bar-bg"><div class="pc-bar-fill" style="width:${s.pct}%"></div></div>
        <div class="pc-bar-label"><span>${s.pct}%</span><span>${pg.dailyGoal?'🎯'+pg.dailyGoal:''}</span></div>
      </div>`;
    }).join('');

    return `<div class="home-wrap">
      <div class="home-greeting">
        <h1>${greet}، ${esc(u.name)} 👋</h1>
        <p>${dateStr}</p>
      </div>
      <div class="stats-row">
        <div class="stat-card anim-0"><div class="stat-icon">📄</div><div class="stat-val">${pages.length}</div><div class="stat-lbl">${I18n.t('pages')}</div></div>
        <div class="stat-card anim-1"><div class="stat-icon">✅</div><div class="stat-val">${totalDone}</div><div class="stat-lbl">${I18n.t('done')}</div></div>
        <div class="stat-card anim-2"><div class="stat-icon">📈</div><div class="stat-val">${totalItems>0?Math.round(totalDone/totalItems*100):0}%</div><div class="stat-lbl">المتوسط</div></div>
        <div class="stat-card anim-3"><div class="stat-icon">🔥</div><div class="stat-val">${streak}</div><div class="stat-lbl">${I18n.t('streak')}</div></div>
      </div>
      <div class="section-hdr"><h2>${I18n.t('pages')}</h2><button class="btn btn-sm btn-primary" onclick="UI.openModal('modalNewPage')" style="gap:4px">+ ${I18n.t('newPage')}</button></div>
      <div class="pages-grid">
        ${cardsHtml}
        <div class="add-page-card" onclick="UI.openModal('modalNewPage')">
          <div style="font-size:1.5rem">+</div>
          <div>${I18n.t('newPage')}</div>
        </div>
      </div>
    </div>`;
  }

  function _calcGlobalStreak(pages) {
    let max=0;
    pages.forEach(pg=>{ const s=Pages.getStreak(pg); if(s>max) max=s; });
    return max;
  }

  /* ── TASK VIEW ── */
  function _renderTaskView(pg) {
    const c=document.getElementById('content');
    c.innerHTML=`
    <div class="task-view">
      <div class="task-main" id="taskMain">
        <div class="task-toolbar">
          <input class="inp task-search" id="taskSearch" placeholder="🔍 بحث..." value="${esc(_taskSearch)}" oninput="UI.filterTasks(this.value)">
          <button class="btn btn-sm btn-primary" onclick="Tasks.openAdd('${pg.id}')">+ ${I18n.t('add')}</button>
          <button class="btn btn-sm" onclick="UI.openModal('modalBulkTasks')">📋 دفعي</button>
          <div class="drop" id="sortDrop">
            <button class="btn btn-sm btn-icon" onclick="UI.toggleDrop('sortDrop')">⋯</button>
            <div class="drop-menu" id="sortDropMenu">
              <div class="drop-item" onclick="Tasks.sortBy('priority');UI.closeAllDrops()">🔴 الأولوية</div>
              <div class="drop-item" onclick="Tasks.sortBy('due');UI.closeAllDrops()">📅 التاريخ</div>
              <div class="drop-item" onclick="Tasks.sortBy('name');UI.closeAllDrops()">🔤 الاسم</div>
              <div class="drop-divider"></div>
              <div class="drop-item" onclick="Tasks.clearDone('${pg.id}');UI.closeAllDrops()">🗑 حذف المكتملة</div>
            </div>
          </div>
        </div>
        <div class="task-content" id="taskContent"></div>
      </div>
      <div class="task-sidebar${_taskSbCollapsed?' collapsed-ts':''}" id="taskSidebar">
        <div class="task-panel-hdr">
          <span class="task-panel-title">الملخص</span>
          <button class="ts-collapse-btn" onclick="UI.toggleTaskSidebar()">←</button>
        </div>
        <div class="task-filters">
          <button class="tf-btn${_taskFilter==='all'?' active':''}" onclick="UI.setTaskFilter('all','${pg.id}')">الكل</button>
          <button class="tf-btn${_taskFilter==='pending'?' active':''}" onclick="UI.setTaskFilter('pending','${pg.id}')">قيد</button>
          <button class="tf-btn${_taskFilter==='done'?' active':''}" onclick="UI.setTaskFilter('done','${pg.id}')">منجز</button>
        </div>
        <div class="task-list-scroll" id="taskListScroll"></div>
      </div>
    </div>`;
    renderTaskContent(pg);
    renderTaskList(pg);
  }

  function renderTaskContent(pg) {
    const el=document.getElementById('taskContent'); if(!el) return;
    let tasks=TaskManager.getTasks(pg.id);
    if(_taskSearch) tasks=tasks.filter(t=>t.name.toLowerCase().includes(_taskSearch.toLowerCase())||t.desc.toLowerCase().includes(_taskSearch.toLowerCase()));
    const s=TaskManager.getStats(pg.id);
    const noTasks=tasks.length===0;
    let html=`<div style="margin-bottom:1rem">
      <div style="display:flex;align-items:center;gap:.6rem;margin-bottom:.5rem">
        <div style="flex:1;background:var(--bg3);border-radius:99px;height:6px;overflow:hidden">
          <div style="width:${s.pct}%;height:100%;background:var(--g-accent);border-radius:99px;transition:width .5s"></div>
        </div>
        <span style="font-size:.7rem;color:var(--muted);white-space:nowrap">${s.done}/${s.total} • ${s.pct}%</span>
      </div>
    </div>`;
    if(noTasks){
      html+=`<div class="empty-state"><div class="empty-icon">📋</div><div class="empty-title">لا توجد مهام</div><div class="empty-sub">ابدأ بإضافة مهمتك الأولى</div><button class="btn btn-primary" style="margin-top:.8rem" onclick="Tasks.openAdd('${pg.id}')">+ إضافة مهمة</button></div>`;
    } else {
      const byCat={};
      tasks.forEach(t=>{const cat=t.category||'عام';if(!byCat[cat])byCat[cat]=[];byCat[cat].push(t);});
      Object.entries(byCat).forEach(([cat,ts])=>{
        if(Object.keys(byCat).length>1) html+=`<div style="font-size:.65rem;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.08em;margin:.7rem 0 .3rem">${esc(cat)}</div>`;
        ts.forEach(t=>{
          const due=t.due?`<span class="ti-due${t.due&&new Date(t.due)<new Date()&&!t.done?' overdue':''}">📅 ${t.due}</span>`:'';
          html+=`<div class="task-item${t.done?' done':''}" id="ti_${t.id}">
            <div class="ti-row">
              <div class="ti-check" onclick="event.stopPropagation();_toggleTaskItem('${pg.id}','${t.id}')">${t.done?'✓':''}</div>
              <div class="ti-info" onclick="Tasks.openEdit('${pg.id}','${t.id}')">
                <div class="ti-name"><span class="ti-prio ${t.priority||'low'}"></span>${esc(t.name)}</div>
                <div class="ti-meta">${t.desc?esc(t.desc.slice(0,60))+' ':''}${due}</div>
              </div>
            </div>
          </div>`;
        });
      });
    }
    el.innerHTML=html;
  }

  function renderTaskList(pg) {
    const el=document.getElementById('taskListScroll'); if(!el) return;
    let tasks=TaskManager.getTasks(pg.id);
    if(_taskFilter==='done') tasks=tasks.filter(t=>t.done);
    else if(_taskFilter==='pending') tasks=tasks.filter(t=>!t.done);
    if(!tasks.length){ el.innerHTML=`<div style="text-align:center;padding:1.5rem;font-size:.72rem;color:var(--muted)">لا توجد مهام</div>`; return; }
    el.innerHTML=tasks.map(t=>`<div class="task-item${t.done?' done':''}" onclick="_toggleTaskItem('${pg.id}','${t.id}')">
      <div class="ti-row">
        <div class="ti-check">${t.done?'✓':''}</div>
        <div class="ti-name" style="font-size:.7rem">${esc(t.name.slice(0,30))}${t.name.length>30?'...':''}</div>
      </div>
    </div>`).join('');
  }

  function filterTasks(q) { _taskSearch=q; const pg=Pages.getCurrent(); if(pg) renderTaskContent(pg); }
  function setTaskFilter(f,pgId) {
    _taskFilter=f;
    document.querySelectorAll('.tf-btn').forEach(b=>b.classList.toggle('active',b.textContent.includes(f==='all'?'الكل':f==='pending'?'قيد':'منجز')));
    const u=UserManager.getCurrent(); const pg=(u?.pages||[]).find(p=>p.id===pgId); if(pg) renderTaskList(pg);
  }
  function toggleTaskSidebar() {
    _taskSbCollapsed=!_taskSbCollapsed;
    const sb=document.getElementById('taskSidebar'); if(sb) sb.classList.toggle('collapsed-ts',_taskSbCollapsed);
  }

  /* ── VISUAL VIEW ── */
  function _renderVisualView(pg) {
    const s=GridManager.getStats(pg);
    const COLORS=GridManager.getColors();
    const colorSwatches=COLORS.map((c,i)=>`<div class="color-sw" data-ci="${i+1}" style="background:${c}" onclick="selectColor(${i+1})" title="${c}"></div>`).join('');
    const numsOn=!!pg.showNums;
    const c=document.getElementById('content');
    c.innerHTML=`
    <div class="visual-view">
      <div class="visual-toolbar">

        <!-- Shape picker -->
        <div class="drop" id="shapeDrop">
          <button class="btn btn-sm" id="shapeLabel" onclick="UI.toggleDrop('shapeDrop')">⬤ الشكل</button>
          <div class="drop-menu" id="shapeDropMenu">
            <div class="shp-opt-card drop-item" onclick="selectShape('circle');UI.closeAllDrops()">⬤ دائرة</div>
            <div class="shp-opt-card drop-item" onclick="selectShape('square');UI.closeAllDrops()">■ مربع</div>
            <div class="shp-opt-card drop-item" onclick="selectShape('star');UI.closeAllDrops()">★ نجمة</div>
            <div class="shp-opt-card drop-item" onclick="selectShape('hex');UI.closeAllDrops()">⬡ سداسي</div>
          </div>
        </div>

        <!-- Fill color picker -->
        <div class="drop" id="colorDrop">
          <button class="btn btn-sm" onclick="UI.toggleDrop('colorDrop')">
            <span id="colorPrevDot" style="width:10px;height:10px;border-radius:50%;background:var(--c1);display:inline-block;vertical-align:middle"></span>
            <span style="margin-right:3px">اللون</span>
          </button>
          <div class="drop-menu" id="colorDropMenu" style="min-width:190px">
            <div style="padding:.4rem .5rem"><div class="color-row">${colorSwatches}</div></div>
          </div>
        </div>

        <!-- Grid size pills -->
        <div style="display:flex;gap:3px;align-items:center">
          <button class="size-pill" onclick="GridManager.setSize(28,this)">XS</button>
          <button class="size-pill sel" onclick="GridManager.setSize(44,this)">S</button>
          <button class="size-pill" onclick="GridManager.setSize(58,this)">M</button>
          <button class="size-pill" onclick="GridManager.setSize(76,this)">L</button>
        </div>

        <!-- ★ Number Controls dropdown -->
        <div class="num-panel drop" id="numPanel">
          <button class="btn btn-sm${numsOn?' btn-primary':''}"
            id="numsToggleLabel"
            onclick="NumberControls.toggle();UI.closeAllDrops()">
            🔢 الأرقام${numsOn?' ✅':''}
          </button>
          <div class="num-panel-menu drop-menu" id="numPanelMenu">
            <!-- filled dynamically by NumberControls.open() -->
          </div>
        </div>

        <!-- Undo / Redo -->
        <button class="btn btn-sm btn-icon" onclick="GridManager.undo()" title="تراجع">↩</button>
        <button class="btn btn-sm btn-icon" onclick="GridManager.redo()" title="إعادة">↪</button>

        <!-- Quick fill -->
        <button class="btn btn-sm" onclick="document.getElementById('bulkFillCount').value=10;UI.openModal('modalBulkFill')">⚡ سريع</button>

        <!-- Add cells -->
        <button class="btn btn-sm" onclick="_openAddCells()">＋ عناصر</button>

      </div>

      <!-- Progress hero bar -->
      <div class="progress-hero">
        <div class="ph-row">
          <div class="ph-pct" id="phPct">${s.pct}%</div>
          <div class="ph-info">
            <div class="ph-label">${esc(pg.name)}</div>
            <div class="ph-bar-bg"><div class="ph-bar-fill" id="phBar" style="width:${s.pct}%"></div></div>
            <div class="ph-sub" id="phSub">${s.filled} / ${s.total} عنصر • ${s.remaining} متبقي</div>
          </div>
        </div>
      </div>

      <!-- Shape grid -->
      <div class="shape-grid${numsOn?' nums-on':''}" id="shapeGrid"></div>
    </div>

    <!-- Undo floating bar -->
    <div class="undo-bar" id="undoBar">
      <span id="undoMsg">تم التغيير</span>
      <button class="btn btn-sm btn-primary" onclick="GridManager.undo()">↩ تراجع</button>
    </div>`;
    GridManager.renderGrid(pg, document.getElementById('shapeGrid'));
  }

  function updateVisualProgress(pg) {
    if(!pg) return;
    const s=GridManager.getStats(pg);
    const pct=document.getElementById('phPct'); if(pct) pct.textContent=s.pct+'%';
    const bar=document.getElementById('phBar'); if(bar) bar.style.width=s.pct+'%';
    const sub=document.getElementById('phSub'); if(sub) sub.textContent=`${s.filled} / ${s.total} عنصر • ${s.remaining} متبقي`;
    _setTopbarPage(pg);
  }

  /* ── EXAM VIEW ── */
  function _renderExamView(pg) {
    const s=ExamManager.getStats(pg.id);
    const streak=pg.streak||0;
    const c=document.getElementById('content');
    c.innerHTML=`
    <div class="exam-view">
      <div class="exam-toolbar">
        <button class="btn btn-sm btn-primary" onclick="Exams.openAdd('${pg.id}')">+ ${I18n.t('addExam')}</button>
        <button class="btn btn-sm" onclick="UI.openModal('modalBulkImport')">📥 ${I18n.t('bulkImport')}</button>
        <div class="drop" id="sessionDrop">
          <button class="btn btn-sm" onclick="UI.toggleDrop('sessionDrop')">🧠 جلسة</button>
          <div class="drop-menu" id="sessionDropMenu">
            <div class="drop-item" onclick="SmartSession.start('${pg.id}','weak');UI.closeAllDrops()">📉 ${I18n.t('weakFirst')}</div>
            <div class="drop-item" onclick="SmartSession.start('${pg.id}','random');UI.closeAllDrops()">🎲 ${I18n.t('random')}</div>
            <div class="drop-item" onclick="SmartSession.start('${pg.id}','spaced');UI.closeAllDrops()">🔁 تكرار متباعد</div>
            <div class="drop-item" onclick="SmartSession.start('${pg.id}','all');UI.closeAllDrops()">📚 جميع المعلق</div>
          </div>
        </div>
        <button class="btn btn-sm" onclick="UI.showExamAnalytics('${pg.id}')">📊 ${I18n.t('analytics')}</button>
        <div style="margin-right:auto;display:flex;gap:4px">
          <button class="btn btn-sm btn-icon${_examView==='grid'?' btn-primary':''}" onclick="UI.setExamView('grid','${pg.id}')" title="شبكة">⊞</button>
          <button class="btn btn-sm btn-icon${_examView==='list'?' btn-primary':''}" onclick="UI.setExamView('list','${pg.id}')" title="قائمة">☰</button>
        </div>
      </div>
      ${streak>0?`<div class="exam-streak-banner"><span class="esb-fire">🔥</span> سلسلة ${streak} ${I18n.t('streak')}</div>`:''}
      <div class="exam-stats-bar">
        <div class="esb-item"><div class="esb-dot" style="background:var(--accent)"></div><span class="esb-val">${s.done}</span> مكتمل</div>
        <div class="esb-item"><div class="esb-dot" style="background:var(--blue)"></div><span class="esb-val">${s.inProg}</span> قيد الدراسة</div>
        <div class="esb-item"><div class="esb-dot" style="background:var(--border2)"></div><span class="esb-val">${s.total-s.done-s.inProg}</span> لم يبدأ</div>
        ${s.avg!==null?`<div class="esb-item" style="margin-right:auto"><div class="esb-dot" style="background:var(--amber)"></div><span class="esb-val">${s.avg}%</span> متوسط النتائج</div>`:''}
      </div>
      <div class="exam-grid${_examView==='list'?' exam-list-mode':''}" id="examGrid"></div>
    </div>`;
    renderExamGrid(pg);
  }

  function renderExamGrid(pg) {
    const el=document.getElementById('examGrid'); if(!el) return;
    const exams=ExamManager.getExams(pg.id);
    if(!exams.length) {
      el.innerHTML=`<div class="empty-state" style="width:100%"><div class="empty-icon">📝</div><div class="empty-title">${I18n.t('noExams')}</div><div class="empty-sub">${I18n.t('addFirstExam')}</div><button class="btn btn-primary" style="margin-top:.8rem" onclick="Exams.openAdd('${pg.id}')">+ ${I18n.t('addExam')}</button></div>`;
      return;
    }
    const isList=_examView==='list';
    let html=exams.map((e,idx)=>{
      const classes=`exam-card${e.completed?' completed':''}${e.inProgress?' in-progress':''}${e.favorite?' favorite':''}${e.retry?' retry':''}${isList?' view-list':''}`;
      const scoreClass=e.score!==null?(e.score>=70?'':e.score>=50?' mid':' low'):'';
      const diff=e.difficulty||'medium';
      return `<div class="${classes}" data-diff="${diff}" data-eid="${e.id}" data-pgid="${pg.id}"
        style="animation-delay:${Math.min(idx*.03,.4)}s"
        onclick="Exams.handleClick('${pg.id}','${e.id}')"
        oncontextmenu="UI.showExamCtx(event,'${pg.id}','${e.id}');return false"
        onmousedown="Exams.startLongPress('${pg.id}','${e.id}')"
        onmouseup="Exams.clearLongPress()"
        ontouchstart="Exams.startLongPress('${pg.id}','${e.id}')"
        ontouchend="Exams.clearLongPress()">
        <div class="ec-num">${e.num}</div>
        <div class="ec-title">${esc(e.title)}</div>
        ${e.score!==null?`<div class="ec-score${scoreClass}">${e.score}%</div>`:''}
        ${isList?`<div class="ec-diff">${diff==='easy'?'سهل':diff==='medium'?'متوسط':'صعب'}</div>`:''}
        ${isList?`<div class="ec-time">${timeAgo(e.lastOpened)}</div>`:''}
      </div>`;
    }).join('');
    // Add card
    html+=`<div class="exam-add-card${isList?' view-list':''}" onclick="Exams.openAdd('${pg.id}')">
      <div class="plus">+</div>
      <div>${I18n.t('addExam')}</div>
    </div>`;
    el.innerHTML=html;
  }

  function setExamView(v, pgId) {
    _examView=v;
    const pg=Pages.getCurrent(); if(pg&&pg.mode==='exam') {
      document.querySelectorAll('.exam-grid').forEach(g=>{
        g.classList.toggle('exam-list-mode',v==='list');
      });
      renderExamGrid(pg);
    }
    document.querySelectorAll('[onclick*="setExamView"]').forEach(b=>{
      b.classList.toggle('btn-primary',b.getAttribute('onclick').includes(`'${v}'`));
    });
  }

  function showExamCtx(e, pgId, eid) {
    e.preventDefault();
    closeCtxMenu();
    const exam=ExamManager.getExams(pgId).find(ex=>ex.id===eid); if(!exam) return;
    const menu=document.createElement('div');
    menu.className='ctx-menu'; menu.id='ctxMenuEl';
    const items=[
      {icon:'🔗',label:I18n.t('open'),    action:`Exams.handleClick('${pgId}','${eid}')`, cls:'accent'},
      {icon:'✅',label:exam.completed?'إلغاء الاكتمال':I18n.t('complete'), action:`ExamManager.toggleState('${pgId}','${eid}','complete');UI.renderExamGrid(Pages.getCurrent());UI.closeCtxMenu()`},
      {icon:'⏳',label:exam.inProgress?'إيقاف الدراسة':I18n.t('inProgress'), action:`ExamManager.toggleState('${pgId}','${eid}','inProgress');UI.renderExamGrid(Pages.getCurrent());UI.closeCtxMenu()`},
      {icon:'★', label:exam.favorite?'إزالة المفضلة':I18n.t('favorite'), action:`ExamManager.toggleState('${pgId}','${eid}','favorite');UI.renderExamGrid(Pages.getCurrent());UI.closeCtxMenu()`},
      {icon:'🔄',label:exam.retry?'إلغاء الإعادة':I18n.t('retry'), action:`ExamManager.toggleState('${pgId}','${eid}','retry');UI.renderExamGrid(Pages.getCurrent());UI.closeCtxMenu()`},
      {icon:'✏️',label:I18n.t('edit'),    action:`Exams.openEdit('${pgId}','${eid}');UI.closeCtxMenu()`},
      null,
      {icon:'🗑',label:I18n.t('delete'),  action:`Exams.deleteExam('${pgId}','${eid}')`, cls:'danger'},
    ];
    menu.innerHTML=items.map(it=>it===null?'<div class="ctx-separator"></div>':`<div class="ctx-item${it.cls?' '+it.cls:''}" onclick="${it.action}"><span class="ctx-icon">${it.icon}</span>${it.label}</div>`).join('');
    // position
    let x=e.clientX, y=e.clientY;
    document.body.appendChild(menu);
    const mw=menu.offsetWidth, mh=menu.offsetHeight;
    if(x+mw>window.innerWidth) x=window.innerWidth-mw-8;
    if(y+mh>window.innerHeight) y=window.innerHeight-mh-8;
    menu.style.left=x+'px'; menu.style.top=y+'px';
    _ctxMenu=menu;
  }

  function closeCtxMenu() {
    if(_ctxMenu){ _ctxMenu.remove(); _ctxMenu=null; }
  }

  function showExamAnalytics(pgId) {
    const pg=Pages.getCurrent(); if(!pg) return;
    const exams=ExamManager.getExams(pgId);
    const s=ExamManager.getStats(pgId);
    const scored=exams.filter(e=>e.score!==null&&e.completed);
    const barsHtml=scored.sort((a,b)=>b.score-a.score).slice(0,10).map(e=>{
      const color=e.score>=70?'var(--accent)':e.score>=50?'var(--amber)':'var(--red)';
      return `<div class="perf-bar-row">
        <div class="pb-label">${esc(e.title.slice(0,18))}</div>
        <div class="pb-bg"><div class="pb-fill" style="width:${e.score}%;background:${color}"></div></div>
        <div class="pb-val">${e.score}%</div>
      </div>`;
    }).join('');

    const heatDays=_buildHeatmap(pg);
    const c=document.getElementById('content');
    c.innerHTML=`<div class="analytics-wrap">
      <div style="display:flex;align-items:center;gap:.7rem;margin-bottom:1.2rem">
        <button class="btn btn-sm" onclick="UI.openPage('${pgId}')">← رجوع</button>
        <h2 style="font-family:var(--font-display);font-size:1rem;font-weight:800">تحليلات: ${esc(pg.name)}</h2>
      </div>
      <div class="stats-row" style="margin-bottom:1.2rem">
        <div class="stat-card"><div class="stat-icon">📝</div><div class="stat-val">${s.total}</div><div class="stat-lbl">إجمالي</div></div>
        <div class="stat-card"><div class="stat-icon">✅</div><div class="stat-val">${s.done}</div><div class="stat-lbl">مكتمل</div></div>
        <div class="stat-card"><div class="stat-icon">📈</div><div class="stat-val">${s.pct}%</div><div class="stat-lbl">نسبة الإكمال</div></div>
        ${s.avg!==null?`<div class="stat-card"><div class="stat-icon">🏅</div><div class="stat-val">${s.avg}%</div><div class="stat-lbl">متوسط النتائج</div></div>`:''}
      </div>
      ${scored.length>0?`<div class="analytics-section">
        <h3>أفضل الأداءات</h3>
        <div class="chart-card"><div class="perf-bars">${barsHtml}</div></div>
      </div>`:''}
      <div class="analytics-section">
        <h3>خريطة النشاط (آخر 7 أسابيع)</h3>
        <div class="chart-card"><div class="heatmap-grid" id="heatmapGrid">${heatDays}</div></div>
      </div>
    </div>`;
  }

  function _buildHeatmap(pg) {
    const activity=pg.activity||{};
    let html='';
    for(let i=48;i>=0;i--) {
      const d=new Date(Date.now()-i*86400000);
      const key=dk(d);
      const val=activity[key]||0;
      const lv=val===0?'':val<3?'lv1':val<6?'lv2':val<10?'lv3':'lv4';
      html+=`<div class="hm-day${lv?' '+lv:''}" title="${key}: ${val}"></div>`;
    }
    return html;
  }

  /* ── STATS VIEW ── */
  function _renderStats() {
    const pages=Pages.getAll();
    let rows='';
    pages.forEach(pg=>{
      let s={done:0,total:0,pct:0};
      if(pg.mode==='task') s=TaskManager.getStats(pg.id);
      else if(pg.mode==='visual'){const vs=GridManager.getStats(pg);s={done:vs.filled,total:vs.total,pct:vs.pct};}
      else if(pg.mode==='exam'){const es=ExamManager.getStats(pg.id);s={done:es.done,total:es.total,pct:es.pct};}
      const sk=Pages.getStreak(pg);
      rows+=`<div class="page-card" onclick="Pages.tryOpen('${pg.id}')">
        <div class="pc-mode pc-mode-${pg.mode}">${pg.mode==='task'?'📋':pg.mode==='visual'?'🎨':'📝'} ${pg.mode}</div>
        <div class="pc-title">${esc(pg.name)}</div>
        <div class="pc-bar-bg"><div class="pc-bar-fill" style="width:${s.pct}%"></div></div>
        <div class="pc-bar-label"><span>${s.done}/${s.total}</span><span>${s.pct}%</span></div>
        ${sk>0?`<div style="font-size:.6rem;color:var(--amber);margin-top:.3rem">🔥 ${sk} يوم</div>`:''}
      </div>`;
    });
    if(!rows) rows=`<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">📊</div><div class="empty-title">لا توجد بيانات</div></div>`;
    return `<div class="stats-wrap">
      <h2 style="font-family:var(--font-display);font-size:1rem;font-weight:800;margin-bottom:1rem">الإحصائيات</h2>
      <div class="pages-grid">${rows}</div>
    </div>`;
  }

  /* ── ACHIEVEMENTS ── */
  function _renderAchievements() {
    const list=Achievements.getList(), unlocked=Achievements.getUnlocked();
    const items=list.map(a=>{
      const u=unlocked[a.id];
      return `<div class="ach-card${u?' unlocked':' ach-locked'}">
        <div class="ach-icon">${a.icon}</div>
        <div class="ach-name">${a.name}</div>
        <div class="ach-desc">${a.desc}</div>
        ${u?`<div style="font-size:.58rem;color:var(--accent);margin-top:.3rem">${new Date(u).toLocaleDateString('ar-SA')}</div>`:''}
      </div>`;
    }).join('');
    return `<div class="achievements-wrap">
      <h2 style="font-family:var(--font-display);font-size:1rem;font-weight:800;margin-bottom:1rem">الإنجازات (${Object.keys(unlocked).length}/${list.length})</h2>
      <div class="ach-grid">${items}</div>
    </div>`;
  }

  /* ── PAGE SETTINGS ── */
  function openPageSettings() {
    const pg=Pages.getCurrent(); if(!pg) return;
    let s='';
    if(pg.mode==='task') s=TaskManager.getStats(pg.id);
    else if(pg.mode==='visual') s=GridManager.getStats(pg);
    else if(pg.mode==='exam') s=ExamManager.getStats(pg.id);
    document.getElementById('sheetPageName').value=pg.name;
    document.getElementById('sheetPageStats').textContent=`${s.done||s.filled||s.done||0} / ${s.total} • ${s.pct||0}%`;
    document.getElementById('sheetPageSettings').classList.add('open');
  }

  function savePageSettings() {
    const pg=Pages.getCurrent(); if(!pg) return;
    const name=document.getElementById('sheetPageName').value.trim();
    if(name) pg.name=name;
    UserManager.updateUser({});
    document.getElementById('sheetPageSettings').classList.remove('open');
    renderPagesNav(); _setTopbarPage(pg); toast('✅ تم الحفظ');
  }

  /* ── MODALS / SHEETS / DROPS ── */
  function openModal(id) {
    const m=document.getElementById(id); if(!m) return;
    m.classList.add('open');
    if(UserManager.getSetting('soundEnabled',true)) SoundEngine.nav();
  }
  function closeModal(id) { const m=document.getElementById(id); if(m) m.classList.remove('open'); }
  function toggleDrop(id) {
    const menu=document.getElementById(id+'Menu'); if(!menu) return;
    const wasOpen=menu.classList.contains('open');
    closeAllDrops();
    if(!wasOpen) menu.classList.add('open');
  }
  function closeAllDrops() {
    document.querySelectorAll('.drop-menu.open').forEach(m=>m.classList.remove('open'));
    // Also close number panel
    document.getElementById('numPanelMenu')?.classList.remove('open');
  }

  /* ── TOAST ── */
  function toast(msg) {
    let t=document.querySelector('.toast');
    if(t){ t.classList.add('out'); setTimeout(()=>t?.remove(),250); }
    t=document.createElement('div'); t.className='toast'; t.textContent=msg;
    document.body.appendChild(t);
    clearTimeout(_toastTimer);
    _toastTimer=setTimeout(()=>{ if(t){ t.classList.add('out'); setTimeout(()=>t?.remove(),250); } },2800);
  }

  return {
    init, renderPagesNav, showView, openPage, setTopbar,
    renderTaskContent, renderTaskList, filterTasks, setTaskFilter, toggleTaskSidebar,
    updateVisualProgress, renderExamGrid, setExamView, showExamCtx, closeCtxMenu, showExamAnalytics,
    openPageSettings, savePageSettings,
    openModal, closeModal, toggleDrop, closeAllDrops,
    toggleTheme, toggleSound, toggleLang, toggleSidebar, toggleMobileSidebar, closeMobileSidebar,
    toast
  };
})();

/* ══════════════════════════════════════════════
   TASKS (UI glue)
══════════════════════════════════════════════ */
const Tasks = (() => {
  let _pgId=null, _editId=null, _prio='low';

  function openAdd(pgId) {
    _pgId=pgId; _editId=null; _prio='low';
    document.getElementById('taskModalTitle').textContent='+ مهمة جديدة';
    document.getElementById('etName').value='';
    document.getElementById('etDesc').value='';
    document.getElementById('etCat').value='';
    document.getElementById('etDue').value='';
    document.getElementById('deleteTaskBtn').style.display='none';
    selectPrio('low');
    UI.openModal('modalTask');
  }
  function openEdit(pgId, tid) {
    _pgId=pgId; _editId=tid;
    const tasks=TaskManager.getTasks(pgId);
    const t=tasks.find(t=>t.id===tid); if(!t) return;
    document.getElementById('taskModalTitle').textContent='✏️ تعديل المهمة';
    document.getElementById('etName').value=t.name;
    document.getElementById('etDesc').value=t.desc||'';
    document.getElementById('etCat').value=t.category||'';
    document.getElementById('etDue').value=t.due||'';
    document.getElementById('deleteTaskBtn').style.display='inline-flex';
    selectPrio(t.priority||'low');
    UI.openModal('modalTask');
  }
  function selectPrio(p) {
    _prio=p;
    ['low','med','high'].forEach(x=>{ const b=document.querySelector(`.prio-btn[data-p="${x}"]`); if(b) b.className=`prio-btn${p===x?' sel-'+x:''}`; });
  }
  function saveEdit() {
    const name=document.getElementById('etName').value.trim(); if(!name){document.getElementById('etName').focus();return;}
    const data={name,desc:document.getElementById('etDesc').value,priority:_prio,category:document.getElementById('etCat').value,due:document.getElementById('etDue').value};
    if(_editId) TaskManager.updateTask(_pgId,_editId,data);
    else TaskManager.addTask(_pgId,data);
    UI.closeModal('modalTask');
    const pg=Pages.getCurrent(); if(pg){ UI.renderTaskContent(pg); UI.renderTaskList(pg); }
    if(UserManager.getSetting('soundEnabled',true)) SoundEngine.add();
    UI.toast(_editId?'✅ تم التعديل':'✅ تمت الإضافة');
    Achievements.check();
  }
  function deleteFromModal() {
    if(!_editId) return;
    TaskManager.deleteTask(_pgId,_editId);
    UI.closeModal('modalTask');
    const pg=Pages.getCurrent(); if(pg){ UI.renderTaskContent(pg); UI.renderTaskList(pg); }
    UI.toast('🗑 تم الحذف');
  }
  function confirmBulkAdd() {
    const pg=Pages.getCurrent(); if(!pg) return;
    const lines=document.getElementById('bulkText').value.split('\n').filter(l=>l.trim());
    TaskManager.bulkAdd(pg.id,lines);
    UI.closeModal('modalBulkTasks');
    UI.renderTaskContent(pg); UI.renderTaskList(pg);
    UI.toast(`✅ أضيف ${lines.length} مهمة`);
    if(UserManager.getSetting('soundEnabled',true)) SoundEngine.add();
    Achievements.check();
  }
  function sortBy(by) {
    const pg=Pages.getCurrent(); if(!pg||pg.mode!=='task') return;
    const tasks=TaskManager.getTasks(pg.id);
    if(by==='priority'){const pw={high:0,med:1,low:2};tasks.sort((a,b)=>(pw[a.priority]||2)-(pw[b.priority]||2));}
    else if(by==='due'){tasks.sort((a,b)=>{if(!a.due&&!b.due)return 0;if(!a.due)return 1;if(!b.due)return -1;return new Date(a.due)-new Date(b.due);});}
    else if(by==='name'){tasks.sort((a,b)=>a.name.localeCompare(b.name,'ar'));}
    pg.tasks=tasks; UserManager.updateUser({});
    UI.renderTaskContent(pg); UI.renderTaskList(pg);
  }
  function clearDone(pgId) {
    const u=UserManager.getCurrent(); const pg=(u?.pages||[]).find(p=>p.id===pgId); if(!pg) return;
    const before=pg.tasks.length;
    pg.tasks=pg.tasks.filter(t=>!t.done); UserManager.updateUser({});
    UI.renderTaskContent(pg); UI.renderTaskList(pg);
    UI.toast(`🗑 حذف ${before-pg.tasks.length} مهمة مكتملة`);
  }
  return { openAdd, openEdit, selectPrio, saveEdit, deleteFromModal, confirmBulkAdd, sortBy, clearDone };
})();

/* ══════════════════════════════════════════════
   EXAMS (UI glue)
══════════════════════════════════════════════ */
const Exams = (() => {
  let _pgId=null, _eid=null, _lpTimer=null;

  function openAdd(pgId) {
    _pgId=pgId; _eid=null;
    document.getElementById('examModalTitle').textContent='+ '+I18n.t('addExam');
    document.getElementById('eeTitle').value='';
    document.getElementById('eeLink').value='';
    document.getElementById('eeNotes').value='';
    document.getElementById('eeScore').value='';
    document.getElementById('eeDiff').value='medium';
    document.getElementById('deleteExamBtn').style.display='none';
    UI.openModal('modalExam');
  }
  function openEdit(pgId, eid) {
    _pgId=pgId; _eid=eid;
    const exams=ExamManager.getExams(pgId);
    const e=exams.find(e=>e.id===eid); if(!e) return;
    document.getElementById('examModalTitle').textContent='✏️ '+I18n.t('edit');
    document.getElementById('eeTitle').value=e.title;
    document.getElementById('eeLink').value=e.link||'';
    document.getElementById('eeNotes').value=e.notes||'';
    document.getElementById('eeScore').value=e.score!==null?e.score:'';
    document.getElementById('eeDiff').value=e.difficulty||'medium';
    document.getElementById('deleteExamBtn').style.display='inline-flex';
    UI.openModal('modalExam');
  }
  function saveExam() {
    const title=document.getElementById('eeTitle').value.trim()||`اختبار`;
    const link=document.getElementById('eeLink').value.trim();
    const notes=document.getElementById('eeNotes').value.trim();
    const scoreRaw=document.getElementById('eeScore').value;
    const score=scoreRaw!==''?Math.max(0,Math.min(100,parseInt(scoreRaw))):null;
    const difficulty=document.getElementById('eeDiff').value||'medium';
    if(_eid) {
      ExamManager.updateExam(_pgId,_eid,{title,link,notes,score,difficulty});
    } else {
      ExamManager.addExam(_pgId,{title,link,notes,score,difficulty});
    }
    UI.closeModal('modalExam');
    const pg=Pages.getCurrent(); if(pg) UI.renderExamGrid(pg);
    if(UserManager.getSetting('soundEnabled',true)) SoundEngine.add();
    UI.toast(_eid?'✅ تم التعديل':'✅ تمت الإضافة');
    Achievements.check();
  }
  function deleteExam(pgId, eid) {
    ExamManager.deleteExam(pgId,eid);
    UI.closeCtxMenu();
    const pg=Pages.getCurrent(); if(pg) UI.renderExamGrid(pg);
    UI.toast('🗑 تم الحذف');
  }
  function deleteFromModal() {
    if(!_eid) return;
    ExamManager.deleteExam(_pgId,_eid);
    UI.closeModal('modalExam');
    const pg=Pages.getCurrent(); if(pg) UI.renderExamGrid(pg);
    UI.toast('🗑 تم الحذف');
  }
  function confirmBulkImport() {
    const raw=document.getElementById('bulkImportText').value.trim();
    if(!raw) return;
    const pgId=document.getElementById('bulkImportPgId').value;
    const added=ExamManager.bulkImport(pgId,raw);
    UI.closeModal('modalBulkImport');
    const pg=Pages.getCurrent(); if(pg) UI.renderExamGrid(pg);
    UI.toast(`📥 أضيف ${added} اختبار`);
    Achievements.check();
  }

  function handleClick(pgId, eid) {
    ExamManager.openExam(pgId, eid);
    const pg=Pages.getCurrent(); if(pg) UI.renderExamGrid(pg);
    _setTopbarPage(pg);
  }
  function _setTopbarPage(pg){ if(pg){ const s=ExamManager.getStats(pg.id); UI.setTopbar(pg.name,`${s.done}/${s.total} • ${s.pct}%`); } }

  function startLongPress(pgId, eid) {
    _lpTimer=setTimeout(()=>{ clearTimeout(_lpTimer); _lpTimer=null; /* show ctx */ const el=document.querySelector(`[data-eid="${eid}"]`); if(el){const r=el.getBoundingClientRect();UI.showExamCtx({clientX:r.right,clientY:r.top,preventDefault:()=>{}},pgId,eid);} },600);
  }
  function clearLongPress() { clearTimeout(_lpTimer); _lpTimer=null; }

  return { openAdd, openEdit, saveExam, deleteExam, deleteFromModal, confirmBulkImport, handleClick, startLongPress, clearLongPress };
})();

/* ══════════════════════════════════════════════
   ONBOARDING
══════════════════════════════════════════════ */
const Onboarding = (() => {
  let _mode='task';
  function check() {
    const users=UserManager.getUsers();
    if(!users.length) {
      document.getElementById('existingUsers').classList.add('hidden');
      document.getElementById('scrName').classList.remove('hidden');
      return;
    }
    if(!UserManager.getCurrent()) {
      // show user list
      const ul=document.getElementById('userList');
      ul.innerHTML=users.map(u=>`<div class="user-list-item" onclick="Onboarding.login('${u.id}')">
        <div class="uli-avatar" style="background:${u.color}">${u.avatar}</div>
        <div><div class="uli-name">${esc(u.name)}</div><div class="uli-meta">${(u.pages||[]).length} مجلد • ${new Date(u.lastActive).toLocaleDateString('ar-SA')}</div></div>
        <div class="uli-arrow">←</div>
      </div>`).join('');
      document.getElementById('existingUsers').classList.remove('hidden');
      document.getElementById('scrName').classList.remove('hidden');
    } else {
      UI.init();
    }
  }
  function login(id) { UserManager.switchUser(id); hide(); UI.init(); }
  function submitName() {
    const name=document.getElementById('nameInput').value.trim();
    if(!name){document.getElementById('nameInput').focus();return;}
    UserManager.createUser(name);
    document.getElementById('scrName').classList.add('hidden');
    document.getElementById('scrMode').classList.remove('hidden');
    document.getElementById('firstPageName').value='';
  }
  function selectMode(mode,el) {
    _mode=mode;
    document.querySelectorAll('.mode-card').forEach(c=>c.classList.remove('selected'));
    el.classList.add('selected');
  }
  function finishSetup() {
    const pgName=document.getElementById('firstPageName').value.trim()||(_mode==='task'?'مهامي':_mode==='visual'?'تقدمي البصري':'اختباراتي');
    const opts=_mode==='visual'?{count:30,shape:'circle'}:{};
    Pages.create(pgName,_mode,opts);
    hide(); UI.init();
  }
  function hide() { document.getElementById('scrName').classList.add('hidden'); document.getElementById('scrMode').classList.add('hidden'); }
  return { check, login, submitName, selectMode, finishSetup };
})();

/* ══════════════════════════════════════════════
   GLOBAL HANDLERS
══════════════════════════════════════════════ */
function selectShape(sh) {
  const pg=Pages.getCurrent(); if(!pg) return;
  GridManager.setShape(sh); pg.shape=sh; UserManager.updateUser({});
  document.getElementById('shapeLabel').textContent={circle:'⬤ دائرة',square:'■ مربع',star:'★ نجمة',hex:'⬡ سداسي'}[sh]||'الشكل';
  UI.closeAllDrops();
  const grid=document.getElementById('shapeGrid');
  if(grid) GridManager.renderGrid(pg,grid);
  if(UserManager.getSetting('soundEnabled',true)) SoundEngine.nav();
}

function selectColor(ci) {
  GridManager.setColor(ci);
  document.querySelectorAll('.color-sw').forEach(sw=>sw.classList.toggle('sel',parseInt(sw.dataset.ci)===ci));
  UI.closeAllDrops();
}

function _toggleNumsUI(pg) {
  if(!pg) return;
  NumberControls._toggleVis();
}

function _toggleTaskItem(pageId, taskId) {
  const done=TaskManager.toggleTask(pageId,taskId);
  if(done){
    if(UserManager.getSetting('soundEnabled',true)) SoundEngine.taskDone();
    confetti(); Achievements.check();
    Goals.checkProgress(Pages.getCurrent());
  } else {
    if(UserManager.getSetting('soundEnabled',true)) SoundEngine.unfill();
  }
  const pg=Pages.getCurrent();
  if(pg){ UI.renderTaskContent(pg); UI.renderTaskList(pg); }
}

function _openAddCells() {
  const pg=Pages.getCurrent(); if(!pg) return;
  const n=parseInt(prompt('عدد العناصر المراد إضافتها:','10')||'0');
  if(n>0) GridManager.addCells(pg,n);
}

function cdPreset(h,m,s) { Countdown.cdPreset(h,m,s); }

/* ══ EVENT DELEGATION ══ */
document.addEventListener('click', e => {
  // Ripple effect
  const btn=e.target.closest('.btn,.nav-item,.page-card');
  if(btn&&!btn.classList.contains('no-ripple')){
    const r=document.createElement('span'); r.className='rpl';
    const rect=btn.getBoundingClientRect();
    const sz=Math.max(rect.width,rect.height);
    r.style.cssText=`width:${sz}px;height:${sz}px;left:${e.clientX-rect.left-sz/2}px;top:${e.clientY-rect.top-sz/2}px;`;
    btn.appendChild(r); setTimeout(()=>r.remove(),500);
  }
  // Close dropdowns & context menu on outside click
  if(!e.target.closest('.drop')) UI.closeAllDrops();
  if(!e.target.closest('.ctx-menu')) UI.closeCtxMenu();
  // Close num panel on outside click
  if(!e.target.closest('.num-panel')) {
    document.getElementById('numPanelMenu')?.classList.remove('open');
  }
});

document.addEventListener('keydown', e => {
  if(e.key==='Escape'){
    document.querySelectorAll('.modal-overlay.open').forEach(m=>m.classList.remove('open'));
    document.querySelectorAll('.sheet-overlay.open').forEach(m=>m.classList.remove('open'));
    UI.closeAllDrops(); UI.closeCtxMenu(); closeCelebration();
    SmartSession.close();
  }
  if((e.ctrlKey||e.metaKey)&&e.key==='z'){e.preventDefault();GridManager.undo();}
  if((e.ctrlKey||e.metaKey)&&e.key==='y'){e.preventDefault();GridManager.redo();}
});

document.querySelectorAll('.modal-overlay').forEach(o=>o.addEventListener('click',e=>{if(e.target===o)o.classList.remove('open');}));
document.querySelectorAll('.sheet-overlay').forEach(o=>o.addEventListener('click',e=>{if(e.target===o)o.classList.remove('open');}));

document.getElementById('nameInput')?.addEventListener('keydown',e=>{if(e.key==='Enter')Onboarding.submitName();});

/* open bulk import: inject page id */
function openBulkImport(pgId) {
  document.getElementById('bulkImportPgId').value=pgId||Pages.getCurrent()?.id||'';
  document.getElementById('bulkImportText').value='';
  UI.openModal('modalBulkImport');
}

/* ══ BOOT ══ */
window.addEventListener('DOMContentLoaded', () => { Onboarding.check(); });
