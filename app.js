'use strict';
/* ══════════════════════════════════════════════
   منجز — app.js  نسخة نظيفة كاملة
══════════════════════════════════════════════ */

/* ── helpers ── */
const dk=d=>d.toISOString().slice(0,10);
const esc=s=>String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const uid=()=>'_'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const timeAgo=ts=>{if(!ts)return'—';const d=Date.now()-ts,m=Math.floor(d/60000);if(m<1)return'الآن';if(m<60)return`${m}د`;const h=Math.floor(m/60);if(h<24)return`${h}س`;return`${Math.floor(h/24)}ي`;};

/* ══ I18N ══ */
const I18n=(()=>{
  let _l='ar';
  const S={ar:{appName:'منجز',home:'الرئيسية',stats:'الإحصائيات',achievements:'الإنجازات',admin:'المدير',pages:'المجلدات',newPage:'مجلد جديد',task:'مهام',visual:'بصري',exam:'اختبارات',done:'مكتمل',pending:'قيد التنفيذ',all:'الكل',save:'حفظ',cancel:'إلغاء',delete:'حذف',edit:'تعديل',add:'إضافة',addExam:'إضافة اختبار',noExams:'لا توجد اختبارات',addFirstExam:'أضف أول اختبار للبدء',streak:'أيام متتالية',greetMorning:'صباح الإنتاجية',greetAfternoon:'مساء النجاح',greetEvening:'ليلة الإنجاز',bulkImport:'استيراد دفعي',analytics:'التحليلات',weakFirst:'الأضعف أولاً',random:'عشوائي',sessionComplete:'اكتملت الجلسة!',settings:'الإعدادات'},en:{appName:'Munajez',home:'Home',stats:'Stats',achievements:'Achievements',admin:'Admin',pages:'Folders',newPage:'New Folder',task:'Tasks',visual:'Visual',exam:'Exams',done:'Done',pending:'Pending',all:'All',save:'Save',cancel:'Cancel',delete:'Delete',edit:'Edit',add:'Add',addExam:'Add Exam',noExams:'No exams yet',addFirstExam:'Add your first exam',streak:'day streak',greetMorning:'Good morning',greetAfternoon:'Good afternoon',greetEvening:'Good evening',bulkImport:'Bulk Import',analytics:'Analytics',weakFirst:'Weakest First',random:'Random',sessionComplete:'Session complete!',settings:'Settings'}};
  const t=k=>(S[_l]||S.ar)[k]||k;
  const setLang=l=>{_l=l;document.documentElement.lang=l;document.documentElement.dir=l==='ar'?'rtl':'ltr';document.querySelectorAll('[data-i18n]').forEach(el=>{el.textContent=t(el.dataset.i18n);});};
  const getLang=()=>_l;
  return{t,setLang,getLang};
})();

/* ══ SOUND ══ */
const SoundEngine=(()=>{
  let ctx=null;
  const _c=()=>{if(!ctx)try{ctx=new(window.AudioContext||window.webkitAudioContext)();}catch(e){}return ctx;};
  const _t=(f1,f2,vol,dur,wave='sine')=>{const c=_c();if(!c)return;try{const o=c.createOscillator(),g=c.createGain();o.type=wave;o.connect(g);g.connect(c.destination);o.frequency.setValueAtTime(f1,c.currentTime);if(f2!==f1)o.frequency.exponentialRampToValueAtTime(f2,c.currentTime+dur*.6);g.gain.setValueAtTime(vol,c.currentTime);g.gain.exponentialRampToValueAtTime(.001,c.currentTime+dur);o.start();o.stop(c.currentTime+dur);}catch(e){}};
  return{fill:()=>_t(600,950,.12,.06),unfill:()=>_t(400,260,.1,.04),taskDone:()=>{_t(700,1100,.15,.06);setTimeout(()=>_t(880,1200,.1,.04),100);},examOpen:()=>_t(440,660,.1,.08),examDone:()=>{_t(660,1100,.18,.08);setTimeout(()=>_t(880,1320,.12,.06),120);},add:()=>_t(500,650,.08,.04),nav:()=>_t(350,420,.07,.03),success:()=>{_t(660,880,.2,.07);setTimeout(()=>_t(880,1100,.15,.05),150);},error:()=>_t(300,200,.15,.05,'square'),close:()=>_t(400,320,.07,.03)};
})();

/* ══ STORAGE ══ */
const StorageManager=(()=>{
  const KEY='mnj_v4';
  const ADMIN_HASH=btoa('Admin@Engaz2026');
  const MASTER_KEY='MnJz@Admin2026';
  const defUser=name=>({id:uid(),name,avatar:name.charAt(0).toUpperCase(),color:['#20d6a8','#3d8ef0','#8b5cf6','#f59e0b','#e879a0','#f97316'][Math.floor(Math.random()*6)],createdAt:Date.now(),lastActive:Date.now(),pages:[],soundEnabled:true,darkMode:true,lang:'ar',achievements:{}});
  const defPage=(name,mode,opts={})=>{const b={id:uid(),name,mode,createdAt:Date.now(),activity:{},dailyGoal:opts.goal||0,goalStartFrom:0,pin:'',recoveryBook:''};if(mode==='task')return{...b,tasks:[]};if(mode==='exam')return{...b,exams:[],streak:0,lastStudyDate:'',studyHistory:[]};return{...b,cells:Array(opts.count||30).fill(0),shape:opts.shape||'circle',showNums:false,numSize:13,numColor:'rgba(255,255,255,.78)',numColorFill:'rgba(0,0,0,.42)',numWeight:'700',customColor:'#ff6b6b'};};
  const load=()=>{try{const r=localStorage.getItem(KEY);if(r){const s=JSON.parse(r);if(!s.users)s.users={};if(!s.currentUser)s.currentUser=null;return s;}}catch(e){}return{users:{},currentUser:null};};
  const save=s=>{try{localStorage.setItem(KEY,JSON.stringify(s));}catch(e){}};
  return{load,save,defUser,defPage,ADMIN_HASH,MASTER_KEY};
})();

/* ══ USER MANAGER ══ */
const UserManager=(()=>{
  let state=StorageManager.load();
  const getUsers=()=>Object.values(state.users);
  const getCurrent=()=>state.users[state.currentUser]||null;
  const createUser=name=>{const u=StorageManager.defUser(name);state.users[u.id]=u;state.currentUser=u.id;_save();return u;};
  const switchUser=id=>{if(!state.users[id])return false;state.currentUser=id;state.users[id].lastActive=Date.now();_save();return true;};
  const updateUser=()=>{_save();};
  const deleteUser=id=>{delete state.users[id];if(state.currentUser===id){const k=Object.keys(state.users);state.currentUser=k.length?k[0]:null;}_save();};
  const getSetting=(k,def)=>{const u=getCurrent();return u?(u[k]!==undefined?u[k]:def):def;};
  const setSetting=(k,v)=>{const u=getCurrent();if(u){u[k]=v;_save();}};
  const getState=()=>state;
  const _save=()=>StorageManager.save(state);
  return{getUsers,getCurrent,createUser,switchUser,updateUser,deleteUser,getSetting,setSetting,getState};
})();

/* ══ TASK MANAGER ══ */
const TaskManager=(()=>{
  const _pg=id=>{const u=UserManager.getCurrent();return u?(u.pages||[]).find(p=>p.id===id)||null:null;};
  const getTasks=id=>{const p=_pg(id);return p?(p.tasks||[]):[];};
  const addTask=(pgId,data)=>{const p=_pg(pgId);if(!p||p.mode!=='task')return null;const t={id:uid(),name:data.name||'مهمة',desc:data.desc||'',priority:data.priority||'low',category:data.category||'',due:data.due||'',done:false,createdAt:Date.now(),completedAt:null};p.tasks.push(t);UserManager.updateUser();return t;};
  const updateTask=(pgId,tid,patch)=>{const p=_pg(pgId);if(!p)return;const t=p.tasks.find(t=>t.id===tid);if(!t)return;Object.assign(t,patch);if(patch.done!==undefined)t.completedAt=patch.done?Date.now():null;UserManager.updateUser();};
  const deleteTask=(pgId,tid)=>{const p=_pg(pgId);if(!p)return;p.tasks=p.tasks.filter(t=>t.id!==tid);UserManager.updateUser();};
  const toggleTask=(pgId,tid)=>{const p=_pg(pgId);if(!p)return false;const t=p.tasks.find(t=>t.id===tid);if(!t)return false;t.done=!t.done;t.completedAt=t.done?Date.now():null;const day=dk(new Date());p.activity=p.activity||{};if(t.done)p.activity[day]=(p.activity[day]||0)+1;UserManager.updateUser();return t.done;};
  const bulkAdd=(pgId,lines)=>lines.forEach(name=>{if(name.trim())addTask(pgId,{name:name.trim()});});
  const getStats=pgId=>{const tasks=getTasks(pgId);const done=tasks.filter(t=>t.done).length,total=tasks.length;return{done,total,pct:total>0?Math.round(done/total*100):0,overdue:tasks.filter(t=>!t.done&&t.due&&new Date(t.due)<new Date()).length,remaining:total-done};};
  return{getTasks,addTask,updateTask,deleteTask,toggleTask,bulkAdd,getStats};
})();

/* ══ GRID MANAGER ══ */
const GridManager=(()=>{
  let selColor=1,gridSz=44,_scrolling=false,_scrollTimer=null;
  let undoStack=[],redoStack=[],undoTimer=null;
  const COLORS=['#20d6a8','#ef4444','#8b5cf6','#f59e0b','#3d8ef0','#f97316','#06b6d4','#e879a0','#6366f1','#14b8a6','#eab308','#a855f7'];
  const getColors=()=>COLORS;

  const applyNumVars=pg=>{
    const r=document.documentElement;
    r.style.setProperty('--num-size',(pg.numSize||13)+'px');
    r.style.setProperty('--num-color',pg.numColor||'rgba(255,255,255,.78)');
    r.style.setProperty('--num-color-fill',pg.numColorFill||'rgba(0,0,0,.42)');
    r.style.setProperty('--num-weight',pg.numWeight||'700');
    r.style.setProperty('--num-visible',pg.showNums?'1':'0');
  };

  const _applyCell=(el,val,pg)=>{
    const shape=pg.shape||'circle';
    el.className=`si si-${shape} filled `+(val==='custom'?'sc-cust':`sc${val}`);
    if(val==='custom')el.style.setProperty('--cust-color',pg.customColor||'#ff6b6b');
    else el.style.removeProperty('--cust-color');
  };

  const _makeCell=(val,i,shape,pg)=>{
    const el=document.createElement('div');
    el.dataset.idx=i;
    if(val&&val!==0)_applyCell(el,val,pg);
    else el.className=`si si-${shape}`;
    el.style.opacity='0';
    el.style.animation=`fadeIn .3s ${Math.min(i*2,500)}ms ease forwards`;
    const nl=document.createElement('span');nl.className='shape-nl';nl.textContent=i+1;el.appendChild(nl);
    el.addEventListener('click',()=>{if(_scrolling)return;toggleCell(pg,i,el);});
    return el;
  };

  const renderGrid=(pg,container)=>{
    if(!pg||!container)return;
    container.innerHTML='';
    container.style.setProperty('--gsz',gridSz+'px');
    applyNumVars(pg);
    const shape=pg.shape||'circle';
    const CHUNK=80;
    const renderChunk=start=>{
      const frag=document.createDocumentFragment();
      const end=Math.min(start+CHUNK,pg.cells.length);
      for(let i=start;i<end;i++)frag.appendChild(_makeCell(pg.cells[i],i,shape,pg));
      container.appendChild(frag);
      if(end<pg.cells.length)requestAnimationFrame(()=>renderChunk(end));
      else container.classList.toggle('nums-on',!!pg.showNums);
    };
    renderChunk(0);
    container.addEventListener('touchstart',()=>{_scrolling=false;},{passive:true});
    container.addEventListener('touchmove',()=>{_scrolling=true;clearTimeout(_scrollTimer);},{passive:true});
    container.addEventListener('touchend',()=>{_scrollTimer=setTimeout(()=>{_scrolling=false;},200);},{passive:true});
  };

  const toggleCell=(pg,idx,el)=>{
    const cells=pg.cells,prev=cells[idx];
    if(!prev||prev===0){
      const val=selColor==='custom'?'custom':selColor;
      const before=cells.slice();cells[idx]=val;_pushUndo(before,pg);
      _applyCell(el,val,pg);
      el.classList.add('filling','glow-anim');
      setTimeout(()=>el.classList.remove('filling','glow-anim'),800);
      const day=dk(new Date());pg.activity=pg.activity||{};pg.activity[day]=(pg.activity[day]||0)+1;
      if(UserManager.getSetting('soundEnabled',true))SoundEngine.fill();
    }else{
      const before=cells.slice();cells[idx]=0;_pushUndo(before,pg);
      el.className=`si si-${pg.shape||'circle'} unfilling`;
      setTimeout(()=>el.classList.remove('unfilling'),200);
      const nl=document.createElement('span');nl.className='shape-nl';nl.textContent=idx+1;el.appendChild(nl);
      if(UserManager.getSetting('soundEnabled',true))SoundEngine.unfill();
    }
    UserManager.updateUser();
    UI.updateVisualProgress(pg);
    Goals.checkProgress(pg);
    if(pg.cells.every(c=>c&&c!==0)){SoundEngine.success();celebrate(pg.name);Achievements.check();}
  };

  const _pushUndo=(snap,pg)=>{
    undoStack.push({snap,pgId:pg.id});if(undoStack.length>30)undoStack.shift();redoStack=[];
    const bar=document.getElementById('undoBar');if(bar){document.getElementById('undoMsg').textContent='تم التغيير';bar.classList.add('show');}
    clearTimeout(undoTimer);undoTimer=setTimeout(()=>{const b=document.getElementById('undoBar');if(b)b.classList.remove('show');},4000);
  };

  const undo=()=>{
    if(!undoStack.length)return;
    const s=undoStack.pop(),u=UserManager.getCurrent();if(!u)return;
    const pg=(u.pages||[]).find(p=>p.id===s.pgId);if(!pg)return;
    redoStack.push({snap:pg.cells.slice(),pgId:s.pgId});
    pg.cells=s.snap;UserManager.updateUser();
    const g=document.getElementById('shapeGrid');if(g)renderGrid(pg,g);
    UI.updateVisualProgress(pg);UI.toast('↩ تراجع');
    const bar=document.getElementById('undoBar');if(bar)bar.classList.remove('show');
  };

  const redo=()=>{
    if(!redoStack.length)return;
    const s=redoStack.pop(),u=UserManager.getCurrent();if(!u)return;
    const pg=(u.pages||[]).find(p=>p.id===s.pgId);if(!pg)return;
    undoStack.push({snap:pg.cells.slice(),pgId:s.pgId});
    pg.cells=s.snap;UserManager.updateUser();
    const g=document.getElementById('shapeGrid');if(g)renderGrid(pg,g);
    UI.updateVisualProgress(pg);UI.toast('↪ إعادة');
  };

  const getStats=pg=>{const cells=pg?(pg.cells||[]):[];const filled=cells.filter(c=>c&&c!==0).length,total=cells.length;return{filled,total,remaining:total-filled,pct:total>0?Math.round(filled/total*100):0};};
  const resetCells=(pg,container)=>{if(!pg)return;const before=pg.cells.slice();_pushUndo(before,pg);pg.cells=pg.cells.map(()=>0);UserManager.updateUser();if(container)renderGrid(pg,container);UI.updateVisualProgress(pg);};
  const addCells=(pg,n)=>{if(!pg)return;const before=pg.cells.slice();_pushUndo(before,pg);for(let i=0;i<n;i++)pg.cells.push(0);UserManager.updateUser();const g=document.getElementById('shapeGrid');if(g)renderGrid(pg,g);UI.updateVisualProgress(pg);UI.toast(`➕ أضيف ${n} عنصر`);};
  const setSize=(sz,el)=>{gridSz=sz;document.querySelectorAll('.td-sz-pill').forEach(b=>b.classList.remove('active'));if(el)el.classList.add('active');const g=document.getElementById('shapeGrid');if(g)g.style.setProperty('--gsz',sz+'px');};
  const setColor=c=>{selColor=c;const dot=document.getElementById('colorPrevDot');if(dot)dot.style.background=COLORS[c-1]||'var(--c1)';};
  const toggleNums=pg=>{if(!pg)return;pg.showNums=!pg.showNums;UserManager.updateUser();const g=document.getElementById('shapeGrid');if(g)g.classList.toggle('nums-on',pg.showNums);applyNumVars(pg);return pg.showNums;};

  const confirmBulkFill=()=>{
    const n=parseInt(document.getElementById('bulkFillCount').value)||0;if(n<1)return;
    const pg=Pages.getCurrent();if(!pg)return;
    const before=pg.cells.slice();_pushUndo(before,pg);
    const val=selColor==='custom'?'custom':selColor;
    const grid=document.getElementById('shapeGrid');
    const els=grid?grid.querySelectorAll('.si'):[];
    let filled=0;
    for(let i=0;i<pg.cells.length&&filled<n;i++){
      if(!pg.cells[i]||pg.cells[i]===0){
        pg.cells[i]=val;filled++;
        if(els[i]){_applyCell(els[i],val,pg);els[i].classList.add('filling');setTimeout((j=>()=>els[j]&&els[j].classList.remove('filling'))(i),400);}
        const day=dk(new Date());pg.activity=pg.activity||{};pg.activity[day]=(pg.activity[day]||0)+1;
      }
    }
    UserManager.updateUser();UI.updateVisualProgress(pg);UI.closeModal('modalBulkFill');
    UI.toast(`⚡ لوّن ${filled} عنصر`);
    if(UserManager.getSetting('soundEnabled',true))SoundEngine.success();
    Goals.checkProgress(pg);
    if(pg.cells.every(c=>c&&c!==0)){SoundEngine.success();celebrate(pg.name);Achievements.check();}
  };

  return{getColors,toggleCell,renderGrid,getStats,resetCells,addCells,setSize,setColor,toggleNums,applyNumVars,confirmBulkFill,undo,redo};
})();

/* ══ NUMBER CONTROLS ══ */
const NumberControls=(()=>{
  const CE=[
    {l:'أبيض',    v:'rgba(255,255,255,.92)'},
    {l:'فاتح',    v:'rgba(255,255,255,.55)'},
    {l:'رمادي',   v:'rgba(190,205,230,.70)'},
    {l:'أزرق',    v:'#60a5fa'},
    {l:'سماوي',   v:'#22d3ee'},
    {l:'أخضر',    v:'#34d399'},
    {l:'نعناعي',  v:'#20d6a8'},
    {l:'أصفر',    v:'#fbbf24'},
    {l:'برتقالي', v:'#fb923c'},
    {l:'وردي',    v:'#f472b6'},
    {l:'بنفسجي',  v:'#a78bfa'},
    {l:'أحمر',    v:'#f87171'},
  ];
  const CF=[
    {l:'أسود 50%', v:'rgba(0,0,0,.50)'},
    {l:'أسود 25%', v:'rgba(0,0,0,.25)'},
    {l:'أبيض',     v:'rgba(255,255,255,.88)'},
    {l:'شفاف',     v:'transparent',dashed:true},
    {l:'كحلي',     v:'#1e3a5f'},
    {l:'زيتي',     v:'#14532d'},
    {l:'بنفسجي',  v:'#2e1065'},
    {l:'رمادي',    v:'rgba(30,40,60,.65)'},
  ];
  const WEIGHTS=[{v:'300',l:'رفيع'},{v:'400',l:'عادي'},{v:'600',l:'متوسط'},{v:'700',l:'عريض'},{v:'900',l:'أثقل'}];
  let _ei=0,_fi=0,_wt='700';

  const _sync=pg=>{
    _wt=pg.numWeight||'700';
    const ei=CE.findIndex(c=>c.v===(pg.numColor||CE[0].v));_ei=ei<0?0:ei;
    const fi=CF.findIndex(c=>c.v===(pg.numColorFill||CF[0].v));_fi=fi<0?0:fi;
  };

  const _parseAlpha=v=>{if(!v||v==='transparent')return 1;const m=v.match(/rgba?\([^,]+,[^,]+,[^,]+,\s*([\d.]+)\)/);return m?parseFloat(m[1]):1;};
  const _applyAlpha=(base,a)=>{if(!base||base==='transparent')return'transparent';if(base.startsWith('rgba'))return base.replace(/rgba?\(([^,]+),([^,]+),([^,]+),[^)]+\)/,(_,r,g,b)=>`rgba(${r.trim()},${g.trim()},${b.trim()},${a.toFixed(2)})`);if(base.startsWith('#')){const h=base.slice(1);const r=parseInt(h.slice(0,2),16),g=parseInt(h.slice(2,4),16),b=parseInt(h.slice(4,6),16);return`rgba(${r},${g},${b},${a.toFixed(2)})`;}return base;};

  const _live=(pg,patch)=>{Object.assign(pg,patch);GridManager.applyNumVars(pg);_refreshPrev();};

  const _refreshPrev=()=>{
    const pg=Pages.getCurrent();if(!pg)return;
    const sz=pg.numSize||13,wt=pg.numWeight||'700';
    const ec=pg.numColor||CE[0].v,fc=pg.numColorFill||CF[0].v;
    const pe=document.getElementById('ncPrevE'),pf=document.getElementById('ncPrevF');
    if(pe){pe.style.fontSize=sz+'px';pe.style.color=ec;pe.style.fontWeight=wt;}
    if(pf){pf.style.fontSize=sz+'px';pf.style.color=fc;pf.style.fontWeight=wt;}
    const sb=document.getElementById('ncSzBadge');if(sb)sb.textContent=sz+'px';
    document.querySelectorAll('.nc-preset-btn').forEach(b=>b.classList.toggle('active',parseInt(b.textContent)===sz));
    const eChip=document.querySelector('#numControlsWrap .nc-color-dot');if(eChip)eChip.style.background=ec==='transparent'?'transparent':ec;
  };

  const render=pg=>{
    const wrap=document.getElementById('numControlsWrap');if(!wrap)return;
    _sync(pg);
    const sz=pg.numSize||13,show=!!pg.showNums;
    const ec=pg.numColor||CE[0].v,fc=pg.numColorFill||CF[0].v;
    const alpha=Math.round(_parseAlpha(ec)*100);

    const eSwatches=CE.map((c,i)=>{
      const bg=c.v==='transparent'?'repeating-linear-gradient(45deg,#555 0,#555 3px,transparent 3px,transparent 6px)':c.v;
      return`<button class="nc-sw${i===_ei?' sel':''}" style="background:${bg}" title="${c.l}" onclick="NumberControls.pickEmpty(${i})"></button>`;
    }).join('');
    const fSwatches=CF.map((c,i)=>{
      const bg=c.v==='transparent'?'repeating-linear-gradient(45deg,#555 0,#555 3px,transparent 3px,transparent 6px)':c.v;
      const d=c.dashed?'border:1.5px dashed rgba(255,255,255,.4)':'';
      return`<button class="nc-sw${i===_fi?' sel':''}" style="background:${bg};${d}" title="${c.l}" onclick="NumberControls.pickFill(${i})"></button>`;
    }).join('');
    const wBtns=WEIGHTS.map(w=>`<button class="nc-wt-btn${_wt===w.v?' active':''}" data-wv="${w.v}" style="font-weight:${w.v}" onclick="NumberControls.pickWeight('${w.v}')">${w.l}</button>`).join('');

    wrap.innerHTML=`
      <!-- VISIBILITY -->
      <div class="nc-vis-row">
        <span class="nc-vis-label">إظهار الأرقام</span>
        <button class="nc-toggle${show?' on':''}" id="ncToggle" onclick="NumberControls.toggleVis()">
          <span class="nc-toggle-knob"></span>
        </button>
      </div>

      <!-- PREVIEW -->
      <div class="nc-preview-row">
        <div class="nc-preview-cell">
          <div class="nc-prev-circle" style="background:var(--card2);border:2px solid var(--border2)">
            <span id="ncPrevE" style="font-family:var(--font-num);font-size:${sz}px;color:${ec};font-weight:${_wt};text-shadow:0 1px 4px rgba(0,0,0,.5)">٧</span>
          </div>
          <span class="nc-prev-lbl-text">فارغ</span>
        </div>
        <div class="nc-preview-cell">
          <div class="nc-prev-circle" style="background:var(--c1)">
            <span id="ncPrevF" style="font-family:var(--font-num);font-size:${sz}px;color:${fc};font-weight:${_wt};text-shadow:0 1px 4px rgba(0,0,0,.3)">٧</span>
          </div>
          <span class="nc-prev-lbl-text">ملوّن</span>
        </div>
      </div>

      <!-- SIZE -->
      <div class="nc-block">
        <div class="nc-block-hdr">
          <span class="nc-block-title">حجم الرقم</span>
          <span class="nc-val-badge" id="ncSzBadge">${sz}px</span>
        </div>
        <div class="nc-size-track">
          <span class="nc-sz-a">أ</span>
          <input type="range" class="nc-slider" id="ncSzSlider" min="8" max="42" step="1" value="${sz}"
            oninput="NumberControls.liveSize(this.value)">
          <span class="nc-sz-b">أ</span>
        </div>
        <div class="nc-presets">
          ${[8,10,12,14,16,18,22,28,36].map(n=>`<button class="nc-preset-btn${sz===n?' active':''}" onclick="NumberControls.setSize(${n})">${n}</button>`).join('')}
        </div>
      </div>

      <!-- COLOR EMPTY -->
      <div class="nc-block">
        <div class="nc-block-hdr">
          <span class="nc-block-title">لون الرقم — فارغ</span>
          <div class="nc-color-dot" style="background:${ec==='transparent'?'repeating-linear-gradient(45deg,#888 0,#888 3px,transparent 3px,transparent 6px)':ec}"></div>
        </div>
        <div class="nc-sw-grid" id="ncSwE">${eSwatches}</div>
        <div class="nc-opacity-row">
          <span class="nc-op-label">شفافية</span>
          <input type="range" class="nc-slider" id="ncOpSlider" min="5" max="100" step="5" value="${alpha}"
            oninput="NumberControls.liveOpacity(this.value)">
          <span class="nc-val-badge" id="ncOpBadge">${alpha}%</span>
        </div>
      </div>

      <!-- COLOR FILLED -->
      <div class="nc-block">
        <div class="nc-block-hdr">
          <span class="nc-block-title">لون الرقم — ملوّن</span>
          <div class="nc-color-dot" style="background:${fc==='transparent'?'repeating-linear-gradient(45deg,#888 0,#888 3px,transparent 3px,transparent 6px)':fc}"></div>
        </div>
        <div class="nc-sw-grid" id="ncSwF">${fSwatches}</div>
      </div>

      <!-- WEIGHT -->
      <div class="nc-block">
        <div class="nc-block-hdr"><span class="nc-block-title">وزن الخط</span></div>
        <div class="nc-wt-row">${wBtns}</div>
      </div>

      <!-- SAVE -->
      <button class="nc-save-btn" id="ncSaveBtn" onclick="NumberControls.save()">💾 حفظ الإعدادات</button>
    `;
  };

  const pickEmpty=i=>{
    _ei=i;const pg=Pages.getCurrent();if(!pg)return;
    document.querySelectorAll('#ncSwE .nc-sw').forEach((s,j)=>s.classList.toggle('sel',j===i));
    const alpha=parseInt(document.getElementById('ncOpSlider')?.value||'100')/100;
    _live(pg,{numColor:_applyAlpha(CE[i].v,alpha)});
  };
  const pickFill=i=>{
    _fi=i;const pg=Pages.getCurrent();if(!pg)return;
    document.querySelectorAll('#ncSwF .nc-sw').forEach((s,j)=>s.classList.toggle('sel',j===i));
    _live(pg,{numColorFill:CF[i].v});
  };
  const pickWeight=w=>{
    _wt=w;const pg=Pages.getCurrent();if(!pg)return;
    document.querySelectorAll('.nc-wt-btn').forEach(b=>b.classList.toggle('active',b.dataset.wv===w));
    _live(pg,{numWeight:w});
  };
  const liveSize=v=>{
    v=parseInt(v);const pg=Pages.getCurrent();if(!pg)return;
    const b=document.getElementById('ncSzBadge');if(b)b.textContent=v+'px';
    document.querySelectorAll('.nc-preset-btn').forEach(b=>b.classList.toggle('active',parseInt(b.textContent)===v));
    _live(pg,{numSize:v});
  };
  const setSize=n=>{const sl=document.getElementById('ncSzSlider');if(sl)sl.value=n;liveSize(n);};
  const liveOpacity=v=>{
    const pg=Pages.getCurrent();if(!pg)return;
    const b=document.getElementById('ncOpBadge');if(b)b.textContent=v+'%';
    const base=CE[_ei]?.v||pg.numColor||CE[0].v;
    _live(pg,{numColor:_applyAlpha(base,parseInt(v)/100)});
  };
  const toggleVis=()=>{
    const pg=Pages.getCurrent();if(!pg)return;
    pg.showNums=!pg.showNums;UserManager.updateUser();
    const g=document.getElementById('shapeGrid');if(g)g.classList.toggle('nums-on',pg.showNums);
    GridManager.applyNumVars(pg);
    const btn=document.getElementById('ncToggle');if(btn)btn.classList.toggle('on',pg.showNums);
    if(UserManager.getSetting('soundEnabled',true))SoundEngine.nav();
  };
  const save=()=>{
    const pg=Pages.getCurrent();if(!pg)return;
    UserManager.updateUser();
    if(UserManager.getSetting('soundEnabled',true))SoundEngine.success();
    UI.toast('✅ حُفظت إعدادات الأرقام');
    const b=document.querySelector('#ncSaveBtn');if(b){b.textContent='✅ تم الحفظ!';setTimeout(()=>{if(b)b.textContent='💾 حفظ الإعدادات';},1500);}
  };

  return{render,pickEmpty,pickFill,pickWeight,liveSize,setSize,liveOpacity,toggleVis,save};
})();

/* ══ EXAM MANAGER ══ */
const ExamManager=(()=>{
  const _pg=id=>{const u=UserManager.getCurrent();return u?(u.pages||[]).find(p=>p.id===id)||null:null;};
  const getExams=id=>{const p=_pg(id);return p?(p.exams||[]):[];};
  const addExam=(pgId,data)=>{const p=_pg(pgId);if(!p||p.mode!=='exam')return null;const e={id:uid(),num:(p.exams.length+1),title:data.title||`اختبار ${p.exams.length+1}`,link:data.link||'',notes:data.notes||'',score:data.score!==undefined?data.score:null,difficulty:data.difficulty||'medium',completed:false,inProgress:false,favorite:false,retry:false,lastOpened:null,createdAt:Date.now()};p.exams.push(e);UserManager.updateUser();return e;};
  const updateExam=(pgId,eid,patch)=>{const p=_pg(pgId);if(!p)return;const e=p.exams.find(e=>e.id===eid);if(!e)return;Object.assign(e,patch);UserManager.updateUser();};
  const deleteExam=(pgId,eid)=>{const p=_pg(pgId);if(!p)return;p.exams=p.exams.filter(e=>e.id!==eid);p.exams.forEach((e,i)=>e.num=i+1);UserManager.updateUser();};
  const toggleState=(pgId,eid,state)=>{const p=_pg(pgId);if(!p)return;const e=p.exams.find(e=>e.id===eid);if(!e)return;if(state==='complete'){e.completed=!e.completed;if(e.completed){e.inProgress=false;_recActivity(p);}}else if(state==='inProgress'){e.inProgress=!e.inProgress;if(e.inProgress)e.completed=false;}else if(state==='favorite'){e.favorite=!e.favorite;}else if(state==='retry'){e.retry=!e.retry;}UserManager.updateUser();};
  const openExam=(pgId,eid)=>{const p=_pg(pgId);if(!p)return;const e=p.exams.find(e=>e.id===eid);if(!e)return;e.lastOpened=Date.now();if(!e.completed&&!e.inProgress)e.inProgress=true;UserManager.updateUser();if(e.link)window.open(e.link,'_blank');if(UserManager.getSetting('soundEnabled',true))SoundEngine.examOpen();};
  const _recActivity=p=>{const day=dk(new Date());p.activity=p.activity||{};p.activity[day]=(p.activity[day]||0)+1;const last=p.lastStudyDate,yesterday=dk(new Date(Date.now()-86400000));if(!last||last===yesterday)p.streak=(p.streak||0)+1;else if(last!==day)p.streak=1;p.lastStudyDate=day;if(!p.studyHistory)p.studyHistory=[];const ex=p.studyHistory.find(h=>h.date===day);if(ex)ex.count++;else p.studyHistory.push({date:day,count:1});};
  const bulkImport=(pgId,raw)=>{const lines=raw.split('\n').map(l=>l.trim()).filter(Boolean);let added=0;lines.forEach(line=>{const parts=line.split('|');const link=parts[0].trim();const title=parts[1]?parts[1].trim():'';if(link){addExam(pgId,{link,title:title||undefined});added++;}});return added;};
  const getStats=pgId=>{const exams=getExams(pgId);const done=exams.filter(e=>e.completed).length,inProg=exams.filter(e=>e.inProgress).length,total=exams.length;const scores=exams.filter(e=>e.score!==null&&e.completed);const avg=scores.length?Math.round(scores.reduce((a,e)=>a+e.score,0)/scores.length):null;return{done,inProg,total,pct:total?Math.round(done/total*100):0,avg};};
  const getWeakFirst=pgId=>[...getExams(pgId).filter(e=>!e.completed)].sort((a,b)=>{const sa=a.score!==null?a.score:101,sb=b.score!==null?b.score:101;if(sa!==sb)return sa-sb;const dw={hard:0,medium:1,easy:2};return(dw[a.difficulty]||1)-(dw[b.difficulty]||1);});
  const getRandomOrder=pgId=>[...getExams(pgId).filter(e=>!e.completed)].sort(()=>Math.random()-.5);
  const getSpacedRepetition=pgId=>[...getExams(pgId)].sort((a,b)=>(a.lastOpened||0)-(b.lastOpened||0));
  return{getExams,addExam,updateExam,deleteExam,toggleState,openExam,bulkImport,getStats,getWeakFirst,getRandomOrder,getSpacedRepetition};
})();

/* ══ PAGES ══ */
const Pages=(()=>{
  let _cid=null,_pendingPin=null;
  const getAll=()=>{const u=UserManager.getCurrent();return u?(u.pages||[]):[];};
  const getCurrent=()=>{const u=UserManager.getCurrent();return u?(u.pages||[]).find(p=>p.id===_cid)||null:null;};
  const setCurrentId=id=>{_cid=id;};
  const create=(name,mode,opts={})=>{const u=UserManager.getCurrent();if(!u)return null;const pg=StorageManager.defPage(name,mode,opts);u.pages.push(pg);UserManager.updateUser();return pg;};
  const update=(id,patch)=>{const u=UserManager.getCurrent();if(!u)return;const pg=(u.pages||[]).find(p=>p.id===id);if(pg){Object.assign(pg,patch);UserManager.updateUser();}};
  const deletePage=id=>{const u=UserManager.getCurrent();if(!u)return;u.pages=(u.pages||[]).filter(p=>p.id!==id);if(_cid===id)_cid=null;UserManager.updateUser();};
  const getStreak=pg=>{if(!pg||!pg.activity)return 0;let streak=0;for(let i=0;i<365;i++){if(pg.activity[dk(new Date(Date.now()-i*86400000))]>0)streak++;else if(i>0)break;}return streak;};
  const tryOpen=id=>{const u=UserManager.getCurrent();if(!u)return;const pg=(u.pages||[]).find(p=>p.id===id);if(!pg)return;if(pg.pin){_pendingPin=id;document.getElementById('pinVal').value='';document.getElementById('pinErr').style.display='none';UI.openModal('modalPin');}else{_cid=id;UI.openPage(id);}};
  const confirmPin=()=>{const val=document.getElementById('pinVal').value.trim();const u=UserManager.getCurrent();if(!u)return;const pg=(u.pages||[]).find(p=>p.id===_pendingPin);if(!pg)return;if(val===pg.pin||val===StorageManager.MASTER_KEY){UI.closeModal('modalPin');_cid=_pendingPin;_pendingPin=null;UI.openPage(_cid);}else{document.getElementById('pinErr').style.display='block';if(UserManager.getSetting('soundEnabled',true))SoundEngine.error();}};
  const confirmNew=()=>{
    const name=document.getElementById('npName').value.trim();if(!name){document.getElementById('npName').focus();return;}
    const mode=document.getElementById('npMode').value;
    const pin=document.getElementById('npPin').value.trim();
    const book=document.getElementById('npBook')?.value.trim()||'';
    const opts={goal:parseInt(document.getElementById('npGoal').value)||0};
    if(mode==='visual'){opts.count=parseInt(document.getElementById('npCount').value)||30;opts.shape=document.getElementById('npShape').value||'circle';}
    const pg=create(name,mode,opts);
    if(pin){pg.pin=pin;pg.recoveryBook=book;UserManager.updateUser();}
    UI.closeModal('modalNewPage');UI.renderPagesNav();_cid=pg.id;UI.openPage(pg.id);
    if(UserManager.getSetting('soundEnabled',true))SoundEngine.add();
    UI.toast(`✨ "${name}"`);Achievements.check();
  };
  const _toggleVisualOpts=()=>{const m=document.getElementById('npMode').value;document.getElementById('npVisualOpts').classList.toggle('hidden',m!=='visual');document.getElementById('npExamOpts').classList.toggle('hidden',m!=='exam');};
  const exportData=()=>{const pg=getCurrent();if(!pg)return;const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(pg,null,2)],{type:'application/json'}));a.download=`${pg.name}_${Date.now()}.json`;a.click();UI.toast('📥 تم التصدير');};
  return{getAll,getCurrent,setCurrentId,create,update,deletePage,getStreak,tryOpen,confirmPin,confirmNew,_toggleVisualOpts,exportData};
})();

/* ══ GOALS ══ */
const Goals=(()=>{
  let _gs='include';
  const open=()=>{const pg=Pages.getCurrent();if(!pg)return;document.getElementById('goalVal').value=pg.dailyGoal||10;const isV=pg.mode==='visual';document.getElementById('goalStartLabel').style.display=isV?'block':'none';document.getElementById('goalStartRow').style.display=isV?'flex':'none';document.getElementById('goalHint').style.display='none';UI.openModal('modalGoal');};
  const selectStart=(s,el)=>{_gs=s;document.querySelectorAll('.goal-radio').forEach(r=>r.classList.toggle('sel',r.dataset.gs===s));};
  const confirm=()=>{const pg=Pages.getCurrent();if(!pg)return;const goal=parseInt(document.getElementById('goalVal').value)||0;pg.dailyGoal=goal;if(pg.mode==='visual'&&_gs==='fresh')pg.goalStartFrom=GridManager.getStats(pg).filled;else if(pg.mode==='visual')pg.goalStartFrom=0;UserManager.updateUser();UI.closeModal('modalGoal');UI.toast(`🎯 الهدف: ${goal}`);};
  const checkProgress=pg=>{if(!pg||!pg.dailyGoal)return;let cur=0;if(pg.mode==='visual')cur=GridManager.getStats(pg).filled-(pg.goalStartFrom||0);else if(pg.mode==='task')cur=TaskManager.getStats(pg.id).done;else if(pg.mode==='exam')cur=ExamManager.getStats(pg.id).done;if(cur>=pg.dailyGoal)showCelebration('🎯 تحقق الهدف!',`أنجزت ${cur} من ${pg.dailyGoal}!`);};
  return{open,selectStart,confirm,checkProgress};
})();

/* ══ ACHIEVEMENTS ══ */
const Achievements=(()=>{
  const LIST=[
    {id:'first',name:'أول خطوة',desc:'أكمل عنصراً واحداً',icon:'🌱',check:(u,s)=>s.totalDone>=1},
    {id:'ten',name:'العشرة',desc:'أكمل 10 عناصر',icon:'🔟',check:(u,s)=>s.totalDone>=10},
    {id:'fifty',name:'النصف مئة',desc:'أكمل 50 عنصراً',icon:'💪',check:(u,s)=>s.totalDone>=50},
    {id:'hundred',name:'المئة',desc:'أكمل 100 عنصر',icon:'💯',check:(u,s)=>s.totalDone>=100},
    {id:'streak3',name:'3 أيام',desc:'3 أيام متواصلة',icon:'🔥',check:(u,s)=>s.maxStreak>=3},
    {id:'streak7',name:'أسبوع كامل',desc:'7 أيام متواصلة',icon:'🏆',check:(u,s)=>s.maxStreak>=7},
    {id:'folders3',name:'منظّم',desc:'أنشئ 3 مجلدات',icon:'📂',check:(u,s)=>s.pageCount>=3},
    {id:'perfect',name:'اكتمال تام',desc:'أكمل مجلداً بالكامل',icon:'⭐',check:(u,s)=>s.hasPerfect},
    {id:'exam1',name:'أول اختبار',desc:'أكمل اختباراً',icon:'📝',check:(u,s)=>s.examsDone>=1},
    {id:'exam10',name:'عشرة اختبارات',desc:'أكمل 10 اختبارات',icon:'🎓',check:(u,s)=>s.examsDone>=10},
  ];
  const _stats=()=>{const u=UserManager.getCurrent();if(!u)return{};let td=0,ms=0,hp=false,ed=0;(u.pages||[]).forEach(pg=>{const sk=Pages.getStreak(pg);if(sk>ms)ms=sk;if(pg.mode==='task'){const s=TaskManager.getStats(pg.id);td+=s.done;if(s.total>0&&s.done===s.total)hp=true;}else if(pg.mode==='visual'){const s=GridManager.getStats(pg);td+=s.filled;if(s.total>0&&s.filled===s.total)hp=true;}else if(pg.mode==='exam'){const s=ExamManager.getStats(pg.id);ed+=s.done;td+=s.done;}});return{totalDone:td,maxStreak:ms,hasPerfect:hp,examsDone:ed,pageCount:(u.pages||[]).length};};
  const check=()=>{const u=UserManager.getCurrent();if(!u)return;const stats=_stats();if(!u.achievements)u.achievements={};let nu=false;LIST.forEach(a=>{if(!u.achievements[a.id]&&a.check(u,stats)){u.achievements[a.id]=Date.now();nu=true;setTimeout(()=>UI.toast(`🏆 إنجاز: ${a.name}`),500);}});if(nu)UserManager.updateUser();};
  const getList=()=>LIST;
  const getUnlocked=()=>{const u=UserManager.getCurrent();return u?(u.achievements||{}):{};}; 
  return{check,getList,getUnlocked};
})();

/* ══ COUNTDOWN ══ */
const Countdown=(()=>{
  let _timer=null,_rem=0;
  const start=()=>{const h=parseInt(document.getElementById('cdH').value)||0,m=parseInt(document.getElementById('cdM').value)||0,s=parseInt(document.getElementById('cdS').value)||0;_rem=h*3600+m*60+s;if(_rem<=0)return;UI.closeModal('modalCountdown');const w=document.getElementById('cdWidget');if(w)w.classList.add('show');clearInterval(_timer);_timer=setInterval(_tick,1000);_render();};
  const _tick=()=>{_rem--;if(_rem<=0){clearInterval(_timer);_rem=0;if(UserManager.getSetting('soundEnabled',true))SoundEngine.success();UI.toast('⏰ انتهى الوقت!');}  _render();};
  const _render=()=>{const w=document.getElementById('cdTime');if(!w)return;const h=Math.floor(_rem/3600),m=Math.floor((_rem%3600)/60),s=_rem%60;w.textContent=`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;w.classList.toggle('urgent',_rem>0&&_rem<=60);};
  const stop=()=>{clearInterval(_timer);_rem=0;const w=document.getElementById('cdWidget');if(w)w.classList.remove('show');};
  const cdPreset=(h,m,s)=>{document.getElementById('cdH').value=h;document.getElementById('cdM').value=m;document.getElementById('cdS').value=s;};
  return{start,stop,cdPreset};
})();

/* ══ SMART SESSION ══ */
const SmartSession=(()=>{
  let _queue=[],_idx=0,_pgId=null;
  const start=(pgId,mode='weak')=>{_pgId=pgId;_idx=0;if(mode==='weak')_queue=ExamManager.getWeakFirst(pgId);else if(mode==='random')_queue=ExamManager.getRandomOrder(pgId);else if(mode==='spaced')_queue=ExamManager.getSpacedRepetition(pgId);else _queue=ExamManager.getExams(pgId).filter(e=>!e.completed);if(!_queue.length){UI.toast('✅ جميع الاختبارات مكتملة!');return;}_showPanel();};
  const _showPanel=()=>{const p=document.getElementById('sessionPanel');if(p){p.classList.remove('hidden');_renderCurrent();}};
  const _renderCurrent=()=>{if(_idx>=_queue.length){_finish();return;}const e=_queue[_idx];document.getElementById('sessionProgress').textContent=`${_idx+1} / ${_queue.length}`;document.getElementById('sessionBar').style.width=`${(_idx/_queue.length)*100}%`;document.getElementById('sessionNum').textContent=e.num;document.getElementById('sessionTitle').textContent=e.title;document.getElementById('sessionNote').textContent=e.notes||'لا توجد ملاحظات';const se=document.getElementById('sessionScore');se.textContent=e.score!==null?`${e.score}%`:'—';};
  const openCurrent=()=>{if(_idx>=_queue.length)return;const e=_queue[_idx];ExamManager.openExam(_pgId,e.id);const pg=Pages.getCurrent();if(pg&&pg.id===_pgId)UI.renderExamGrid(pg);};
  const markDone=(score=null)=>{if(_idx>=_queue.length)return;const e=_queue[_idx];ExamManager.updateExam(_pgId,e.id,{completed:true,inProgress:false,score:score!==null?parseInt(score):e.score});const pg=Pages.getCurrent();if(pg&&pg.id===_pgId)UI.renderExamGrid(pg);_idx++;_renderCurrent();Achievements.check();if(UserManager.getSetting('soundEnabled',true))SoundEngine.examDone();};
  const skip=()=>{_idx++;_renderCurrent();};
  const _finish=()=>{document.getElementById('sessionPanel').classList.add('hidden');showCelebration(I18n.t('sessionComplete'),'أحسنت! واصل التقدم 🚀');if(UserManager.getSetting('soundEnabled',true))SoundEngine.success();Achievements.check();};
  const close=()=>{document.getElementById('sessionPanel').classList.add('hidden');};
  return{start,openCurrent,markDone,skip,close};
})();

/* ══ ADMIN ══ */
const Admin=(()=>{
  let _authed=false;
  const tryLogin=()=>{UI.openModal('modalAdminLogin');document.getElementById('adminPwInp').value='';document.getElementById('adminErr').style.display='none';};
  const confirmLogin=()=>{const pw=document.getElementById('adminPwInp').value;if(btoa(pw)===StorageManager.ADMIN_HASH||pw===StorageManager.MASTER_KEY){_authed=true;UI.closeModal('modalAdminLogin');loadData();}else{document.getElementById('adminErr').style.display='block';if(UserManager.getSetting('soundEnabled',true))SoundEngine.error();}};
  const loadData=()=>{if(!_authed)return;const users=UserManager.getUsers();let rows='';users.forEach(u=>{const pages=u.pages||[];let td=0,ti=0;pages.forEach(pg=>{if(pg.mode==='task'){const s=TaskManager.getStats(pg.id);td+=s.done;ti+=s.total;}else if(pg.mode==='visual'){const s=GridManager.getStats(pg);td+=s.filled;ti+=s.total;}else if(pg.mode==='exam'){const s=ExamManager.getStats(pg.id);td+=s.done;ti+=s.total;}});rows+=`<tr><td>${esc(u.name)}</td><td>${pages.length}</td><td>${td}/${ti}</td><td>${ti>0?Math.round(td/ti*100):0}%</td><td>${new Date(u.lastActive).toLocaleDateString('ar-SA')}</td><td><button class="btn btn-danger btn-sm" onclick="Admin.deleteUser('${u.id}')">حذف</button></td></tr>`;});const c=document.getElementById('content');c.innerHTML=`<div class="admin-wrap"><div class="admin-section"><div class="admin-section-hdr"><span>👥 المستخدمون (${users.length})</span></div><table class="admin-table"><thead><tr><th>الاسم</th><th>المجلدات</th><th>الإنجاز</th><th>%</th><th>آخر نشاط</th><th></th></tr></thead><tbody>${rows||'<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:1rem">لا يوجد مستخدمون</td></tr>'}</tbody></table></div><div style="display:flex;gap:.5rem;flex-wrap:wrap;padding:.5rem 0"><button class="btn btn-danger" onclick="Admin.clearAll()">🗑 حذف كل البيانات</button><button class="btn" onclick="Admin.exportAll()">📤 تصدير</button></div></div>`;};
  const deleteUser=id=>{if(!confirm('حذف هذا المستخدم؟'))return;UserManager.deleteUser(id);loadData();};
  const clearAll=()=>{if(!confirm('⚠️ حذف جميع البيانات نهائياً؟'))return;localStorage.clear();location.reload();};
  const exportAll=()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(UserManager.getState(),null,2)],{type:'application/json'}));a.download=`mnj_backup_${Date.now()}.json`;a.click();};
  return{tryLogin,confirmLogin,loadData,deleteUser,clearAll,exportAll};
})();

/* ══ CONFETTI & CELEBRATION ══ */
function confetti(){const cols=['#20d6a8','#ef4444','#8b5cf6','#f59e0b','#3d8ef0','#e879a0'];for(let i=0;i<28;i++){const el=document.createElement('div');el.className='confetti-piece';el.style.cssText=`background:${cols[i%cols.length]};width:${5+Math.random()*7}px;height:${5+Math.random()*7}px;left:${10+Math.random()*80}%;top:${25+Math.random()*35}%;border-radius:${Math.random()>.5?'50%':'2px'};animation-delay:${Math.random()*.5}s;animation-duration:${.9+Math.random()*.7}s;`;document.body.appendChild(el);setTimeout(()=>el.remove(),1600);}}
function showCelebration(title='رائع!',msg='أحسنت!'){confetti();document.getElementById('celTitle').textContent=title;document.getElementById('celMsg').textContent=msg;const c=document.getElementById('celebration');c.classList.add('show');if(navigator.vibrate)navigator.vibrate([50,50,200]);setTimeout(()=>c.classList.remove('show'),7000);}
window.celebrate=name=>showCelebration('🎉 اكتمل المجلد!',`أنجزت جميع عناصر "${name}"! 🏆`);
function closeCelebration(){document.getElementById('celebration').classList.remove('show');}

/* ══ UI MODULE ══ */
const UI=(()=>{
  let _taskFilter='all',_taskSearch='',_toastTimer=null,_drawerOpen=true,_examView='grid';
  let _ctxMenu=null;

  /* Init */
  const init=()=>{const u=UserManager.getCurrent();if(!u)return;I18n.setLang(UserManager.getSetting('lang','ar'));_updateBadge();renderPagesNav();applyTheme();applySound();showView('home');};
  const _updateBadge=()=>{const u=UserManager.getCurrent();if(!u)return;const av=document.getElementById('sbAvatar'),nm=document.getElementById('sbUserName');if(av){av.textContent=u.avatar||u.name.charAt(0);av.style.background=u.color||'var(--accent)';}if(nm)nm.textContent=u.name;};

  /* Theme/Sound/Lang */
  const applyTheme=()=>{const dark=UserManager.getSetting('darkMode',true);document.documentElement.setAttribute('data-theme',dark?'dark':'light');const btn=document.getElementById('themeBtn');if(btn)btn.textContent=dark?'☀️':'🌙';};
  const applySound=()=>{const on=UserManager.getSetting('soundEnabled',true);const btn=document.getElementById('soundBtn');if(btn){btn.textContent=on?'🔊':'🔇';btn.classList.toggle('active',on);}};
  const toggleTheme=()=>{UserManager.setSetting('darkMode',!UserManager.getSetting('darkMode',true));applyTheme();};
  const toggleSound=()=>{const s=UserManager.getSetting('soundEnabled',true);UserManager.setSetting('soundEnabled',!s);applySound();};
  const toggleLang=()=>{const next=I18n.getLang()==='ar'?'en':'ar';UserManager.setSetting('lang',next);I18n.setLang(next);const btn=document.getElementById('langBtn');if(btn)btn.textContent=next==='ar'?'EN':'عر';renderPagesNav();const pg=Pages.getCurrent();if(pg)openPage(pg.id);else showView('home');};
  const toggleSidebar=()=>document.getElementById('sidebar').classList.toggle('collapsed');
  const toggleMobileSidebar=()=>{document.getElementById('sidebar').classList.add('mobile-open');document.getElementById('sidebar-backdrop').classList.add('show');};
  const closeMobileSidebar=()=>{document.getElementById('sidebar').classList.remove('mobile-open');document.getElementById('sidebar-backdrop').classList.remove('show');};

  /* Pages Nav */
  const renderPagesNav=()=>{
    const pages=Pages.getAll(),nav=document.getElementById('pagesNav');if(!nav)return;
    nav.innerHTML='';
    pages.forEach(pg=>{let pct=0;if(pg.mode==='task')pct=TaskManager.getStats(pg.id).pct;else if(pg.mode==='visual')pct=GridManager.getStats(pg).pct;else if(pg.mode==='exam')pct=ExamManager.getStats(pg.id).pct;const d=document.createElement('div');d.className='page-nav-item'+(pg.id===Pages.getCurrent()?.id?' active':'');const icon=pg.pin?'🔒':pg.mode==='task'?'📋':pg.mode==='visual'?'🎨':'📝';d.innerHTML=`<span class="pni-icon">${icon}</span><span class="pni-name">${esc(pg.name)}</span><span class="pni-pct">${pct}%</span><span class="pni-mode-dot ${pg.mode==='visual'?'visual':pg.mode==='exam'?'exam':''}"></span>`;d.onclick=()=>Pages.tryOpen(pg.id);nav.appendChild(d);});
  };

  /* Views */
  const showView=(v,anim=true)=>{
    const c=document.getElementById('content');
    document.querySelectorAll('.nav-item').forEach(el=>el.classList.toggle('active',el.dataset.view===v));
    if(anim){c.style.opacity='0';c.style.transform='translateY(8px)';}
    setTimeout(()=>{
      switch(v){case 'home':c.innerHTML=_renderHome();break;case 'stats':c.innerHTML=_renderStats();break;case 'achievements':c.innerHTML=_renderAchievements();break;case 'admin':Admin.loadData();break;default:c.innerHTML=_renderHome();}
      if(anim){c.style.transition='opacity .22s,transform .22s';c.style.opacity='1';c.style.transform='';setTimeout(()=>c.style.transition='',250);}
      _setTopbarView(v);
    },anim?110:0);
  };

  const _setTopbarView=v=>{const labels={home:I18n.t('home'),stats:I18n.t('stats'),achievements:I18n.t('achievements'),admin:I18n.t('admin')};setTopbar(labels[v]||I18n.t('home'),'');document.getElementById('topbarActions').innerHTML=`<button class="btn btn-icon btn-sm" onclick="UI.showView('home')">🏠</button>`;};

  const openPage=id=>{
    Pages.setCurrentId(id);const pg=Pages.getCurrent();if(!pg)return;
    renderPagesNav();
    const c=document.getElementById('content');c.style.opacity='0';c.style.transform='translateX(-8px)';
    setTimeout(()=>{
      if(pg.mode==='task')_renderTaskView(pg);
      else if(pg.mode==='visual')_renderVisualView(pg);
      else if(pg.mode==='exam')_renderExamView(pg);
      c.style.transition='opacity .22s,transform .22s';c.style.opacity='1';c.style.transform='';
      setTimeout(()=>c.style.transition='',250);
      _setTopbarPage(pg);
      document.querySelectorAll('.nav-item').forEach(el=>el.classList.remove('active'));
    },110);
  };

  const _setTopbarPage=pg=>{let s='';if(pg.mode==='task'){const st=TaskManager.getStats(pg.id);s=`${st.done}/${st.total} • ${st.pct}%`;}else if(pg.mode==='visual'){const st=GridManager.getStats(pg);s=`${st.filled}/${st.total} • ${st.pct}%`;}else if(pg.mode==='exam'){const st=ExamManager.getStats(pg.id);s=`${st.done}/${st.total} • ${st.pct}%`;}setTopbar(pg.name,s);document.getElementById('topbarActions').innerHTML=`<button class="btn btn-icon btn-sm" onclick="UI.openPageSettings()" title="${I18n.t('settings')}">⚙️</button><button class="btn btn-icon btn-sm" onclick="UI.showView('home')">🏠</button>`;};

  const setTopbar=(title,sub)=>{document.getElementById('topbarTitle').textContent=title;document.getElementById('topbarSub').textContent=sub||'';};

  /* HOME */
  const _renderHome=()=>{
    const u=UserManager.getCurrent();if(!u)return'';
    const pages=Pages.getAll();let td=0,ti=0;
    pages.forEach(pg=>{if(pg.mode==='task'){const s=TaskManager.getStats(pg.id);td+=s.done;ti+=s.total;}else if(pg.mode==='visual'){const s=GridManager.getStats(pg);td+=s.filled;ti+=s.total;}else if(pg.mode==='exam'){const s=ExamManager.getStats(pg.id);td+=s.done;ti+=s.total;}});
    const sk=Math.max(0,...pages.map(p=>Pages.getStreak(p)));
    const hour=new Date().getHours();
    const greet=hour<12?I18n.t('greetMorning'):hour<18?I18n.t('greetAfternoon'):I18n.t('greetEvening');
    const dateStr=new Date().toLocaleDateString(I18n.getLang()==='ar'?'ar-SA':'en-US',{weekday:'long',year:'numeric',month:'long',day:'numeric'});
    const cards=pages.map((pg,idx)=>{let s={done:0,filled:0,total:0,pct:0};if(pg.mode==='task')s=TaskManager.getStats(pg.id);else if(pg.mode==='visual')s=GridManager.getStats(pg);else if(pg.mode==='exam'){const es=ExamManager.getStats(pg.id);s={done:es.done,filled:es.done,total:es.total,pct:es.pct};}const sk2=Pages.getStreak(pg);return`<div class="page-card anim-${idx%6}" onclick="Pages.tryOpen('${pg.id}')"><span class="pc-mode pc-mode-${pg.mode}">${pg.mode==='task'?'📋 مهام':pg.mode==='visual'?'🎨 بصري':'📝 اختبارات'}</span>${sk2>1?`<span class="pc-streak">🔥${sk2}</span>`:''}<div class="pc-title">${esc(pg.name)}</div><div class="pc-sub">${s.done||s.filled||0} / ${s.total}</div><div class="pc-bar-bg"><div class="pc-bar-fill" style="width:${s.pct}%"></div></div><div class="pc-bar-label"><span>${s.pct}%</span><span>${pg.dailyGoal?'🎯'+pg.dailyGoal:''}</span></div></div>`;}).join('');
    return`<div class="home-wrap"><div class="home-greeting"><h1>${greet}، ${esc(u.name)} 👋</h1><p>${dateStr}</p></div><div class="stats-row"><div class="stat-card anim-0"><div class="stat-icon">📄</div><div class="stat-val">${pages.length}</div><div class="stat-lbl">${I18n.t('pages')}</div></div><div class="stat-card anim-1"><div class="stat-icon">✅</div><div class="stat-val">${td}</div><div class="stat-lbl">${I18n.t('done')}</div></div><div class="stat-card anim-2"><div class="stat-icon">📈</div><div class="stat-val">${ti>0?Math.round(td/ti*100):0}%</div><div class="stat-lbl">المتوسط</div></div><div class="stat-card anim-3"><div class="stat-icon">🔥</div><div class="stat-val">${sk}</div><div class="stat-lbl">${I18n.t('streak')}</div></div></div><div class="section-hdr"><h2>${I18n.t('pages')}</h2><button class="btn btn-sm btn-primary" onclick="UI.openModal('modalNewPage')">+ ${I18n.t('newPage')}</button></div><div class="pages-grid">${cards}<div class="add-page-card" onclick="UI.openModal('modalNewPage')"><div style="font-size:1.5rem">+</div><div>${I18n.t('newPage')}</div></div></div></div>`;
  };

  /* TASK VIEW */
  const _renderTaskView=pg=>{
    const c=document.getElementById('content');
    c.innerHTML=`<div class="task-view"><div class="task-main" id="taskMain"><div class="task-toolbar"><input class="inp task-search" id="taskSearch" placeholder="🔍 بحث..." value="${esc(_taskSearch)}" oninput="UI.filterTasks(this.value)"><button class="btn btn-sm btn-primary" onclick="Tasks.openAdd('${pg.id}')">+ ${I18n.t('add')}</button><button class="btn btn-sm" onclick="UI.openModal('modalBulkTasks')">📋 دفعي</button><div class="drop" id="sortDrop"><button class="btn btn-sm btn-icon" onclick="UI.toggleDrop('sortDrop')">⋯</button><div class="drop-menu" id="sortDropMenu"><div class="drop-item" onclick="Tasks.sortBy('priority');UI.closeAllDrops()">🔴 الأولوية</div><div class="drop-item" onclick="Tasks.sortBy('due');UI.closeAllDrops()">📅 التاريخ</div><div class="drop-item" onclick="Tasks.sortBy('name');UI.closeAllDrops()">🔤 الاسم</div><div class="drop-divider"></div><div class="drop-item" onclick="Tasks.clearDone('${pg.id}');UI.closeAllDrops()">🗑 حذف المكتملة</div></div></div></div><div class="task-content" id="taskContent"></div></div><div class="task-sidebar" id="taskSidebar"><div class="task-panel-hdr"><span class="task-panel-title">الملخص</span></div><div class="task-filters"><button class="tf-btn${_taskFilter==='all'?' active':''}" onclick="UI.setTaskFilter('all','${pg.id}')">الكل</button><button class="tf-btn${_taskFilter==='pending'?' active':''}" onclick="UI.setTaskFilter('pending','${pg.id}')">قيد</button><button class="tf-btn${_taskFilter==='done'?' active':''}" onclick="UI.setTaskFilter('done','${pg.id}')">منجز</button></div><div class="task-list-scroll" id="taskListScroll"></div></div></div>`;
    renderTaskContent(pg);renderTaskList(pg);
  };

  const renderTaskContent=pg=>{
    const el=document.getElementById('taskContent');if(!el)return;
    let tasks=TaskManager.getTasks(pg.id);
    if(_taskSearch)tasks=tasks.filter(t=>t.name.toLowerCase().includes(_taskSearch.toLowerCase()));
    const s=TaskManager.getStats(pg.id);
    let html=`<div style="margin-bottom:1rem"><div style="display:flex;align-items:center;gap:.6rem;margin-bottom:.5rem"><div style="flex:1;background:var(--bg3);border-radius:99px;height:6px;overflow:hidden"><div style="width:${s.pct}%;height:100%;background:var(--g-accent);border-radius:99px;transition:width .5s"></div></div><span style="font-size:.7rem;color:var(--muted)">${s.done}/${s.total} • ${s.pct}%</span></div></div>`;
    if(!tasks.length)html+=`<div class="empty-state"><div class="empty-icon">📋</div><div class="empty-title">لا توجد مهام</div><div class="empty-sub">ابدأ بإضافة مهمتك الأولى</div><button class="btn btn-primary" style="margin-top:.8rem" onclick="Tasks.openAdd('${pg.id}')">+ إضافة</button></div>`;
    else tasks.forEach(t=>{const due=t.due?`<span class="ti-due${t.due&&new Date(t.due)<new Date()&&!t.done?' overdue':''}">📅 ${t.due}</span>`:'';html+=`<div class="task-item${t.done?' done':''}" id="ti_${t.id}"><div class="ti-row"><div class="ti-check" onclick="event.stopPropagation();_toggleTaskItem('${pg.id}','${t.id}')">${t.done?'✓':''}</div><div onclick="Tasks.openEdit('${pg.id}','${t.id}')"><div class="ti-name"><span class="ti-prio ${t.priority||'low'}"></span>${esc(t.name)}</div><div class="ti-meta">${t.desc?esc(t.desc.slice(0,60))+' ':''}${due}</div></div></div></div>`;});
    el.innerHTML=html;
  };

  const renderTaskList=pg=>{
    const el=document.getElementById('taskListScroll');if(!el)return;
    let tasks=TaskManager.getTasks(pg.id);
    if(_taskFilter==='done')tasks=tasks.filter(t=>t.done);else if(_taskFilter==='pending')tasks=tasks.filter(t=>!t.done);
    if(!tasks.length){el.innerHTML=`<div style="text-align:center;padding:1.5rem;font-size:.72rem;color:var(--muted)">لا توجد مهام</div>`;return;}
    el.innerHTML=tasks.map(t=>`<div class="task-item${t.done?' done':''}" onclick="_toggleTaskItem('${pg.id}','${t.id}')"><div class="ti-row"><div class="ti-check">${t.done?'✓':''}</div><div class="ti-name" style="font-size:.7rem">${esc(t.name.slice(0,30))}${t.name.length>30?'...':''}</div></div></div>`).join('');
  };

  const filterTasks=q=>{_taskSearch=q;const pg=Pages.getCurrent();if(pg)renderTaskContent(pg);};
  const setTaskFilter=(f,pgId)=>{_taskFilter=f;document.querySelectorAll('.tf-btn').forEach(b=>b.classList.toggle('active',b.textContent.trim()===({all:'الكل',pending:'قيد',done:'منجز'}[f]||'')));const u=UserManager.getCurrent();const pg=(u?.pages||[]).find(p=>p.id===pgId);if(pg)renderTaskList(pg);};
  const toggleTaskSidebar=()=>{const sb=document.getElementById('taskSidebar');if(sb)sb.classList.toggle('collapsed-ts');};

  /* ══════════════════════════════════
     VISUAL VIEW — TOOLS DRAWER
  ══════════════════════════════════ */
  const _renderVisualView=pg=>{
    const s=GridManager.getStats(pg);
    const COLORS=GridManager.getColors();
    const numsOn=!!pg.showNums;
    const c=document.getElementById('content');

    const colorSwatches=COLORS.map((col,i)=>`<div class="color-sw" data-ci="${i+1}" style="background:${col}" onclick="selectColor(${i+1})" title="${col}"></div>`).join('');

    c.innerHTML=`
    <div class="visual-view-layout" id="visualLayout">

      <!-- ══ TOOLS DRAWER ══ -->
      <aside class="tools-drawer${_drawerOpen?'':' hidden-drawer'}" id="toolsDrawer">
        <div class="tools-drawer-inner">

          <div class="td-header">
            <span class="td-title">⚙️ الأدوات</span>
            <button class="btn btn-icon-sm btn-ghost" onclick="UI.toggleToolsDrawer()">✕</button>
          </div>

          <!-- الشكل -->
          <div class="td-section">
            <div class="td-section-label">الشكل</div>
            <div class="td-shape-grid">
              <button class="td-shape-btn${(pg.shape||'circle')==='circle'?' active':''}" onclick="selectShape('circle',this)"><span class="tds-icon">⬤</span><span>دائرة</span></button>
              <button class="td-shape-btn${pg.shape==='square'?' active':''}" onclick="selectShape('square',this)"><span class="tds-icon">■</span><span>مربع</span></button>
              <button class="td-shape-btn${pg.shape==='star'?' active':''}" onclick="selectShape('star',this)"><span class="tds-icon">★</span><span>نجمة</span></button>
              <button class="td-shape-btn${pg.shape==='hex'?' active':''}" onclick="selectShape('hex',this)"><span class="tds-icon">⬡</span><span>سداسي</span></button>
            </div>
          </div>

          <!-- لون التلوين -->
          <div class="td-section">
            <div class="td-section-label">لون التلوين</div>
            <div class="td-color-grid">${colorSwatches}</div>
            <div style="display:flex;align-items:center;gap:6px;margin-top:.4rem">
              <div class="td-color-cur" id="colorPrevDot" style="background:var(--c1)"></div>
              <span style="font-size:.6rem;color:var(--muted)">اللون المختار</span>
            </div>
          </div>

          <!-- حجم الشبكة -->
          <div class="td-section">
            <div class="td-section-label">حجم الشبكة</div>
            <div class="td-size-pills">
              <button class="td-sz-pill" onclick="GridManager.setSize(28,this)">XS</button>
              <button class="td-sz-pill active" onclick="GridManager.setSize(44,this)">S</button>
              <button class="td-sz-pill" onclick="GridManager.setSize(58,this)">M</button>
              <button class="td-sz-pill" onclick="GridManager.setSize(76,this)">L</button>
              <button class="td-sz-pill" onclick="GridManager.setSize(96,this)">XL</button>
            </div>
          </div>

          <!-- إجراءات سريعة -->
          <div class="td-section">
            <div class="td-section-label">إجراءات سريعة</div>
            <div class="td-actions-col">
              <button class="td-action-btn" onclick="document.getElementById('bulkFillCount').value=10;UI.openModal('modalBulkFill')">⚡ تلوين سريع</button>
              <button class="td-action-btn" onclick="_openAddCells()">＋ إضافة عناصر</button>
              <button class="td-action-btn" onclick="GridManager.undo()">↩ تراجع (Ctrl+Z)</button>
              <button class="td-action-btn" onclick="GridManager.redo()">↪ إعادة (Ctrl+Y)</button>
            </div>
          </div>

          <!-- 🔢 الأرقام -->
          <div class="td-section td-nums-section">
            <div class="td-section-label">🔢 الأرقام</div>
            <div id="numControlsWrap"></div>
          </div>

        </div>
      </aside>

      <!-- ══ GRID AREA ══ -->
      <div class="visual-grid-area">
        <div class="vga-topbar">
          <button class="btn btn-icon-sm btn-ghost" id="drawerToggleBtn" onclick="UI.toggleToolsDrawer()" title="الأدوات">☰</button>
          <div class="vga-prog-wrap">
            <div class="vga-prog-bg"><div class="vga-prog-fill" id="phBar" style="width:${s.pct}%"></div></div>
          </div>
          <div class="vga-pct" id="phPct">${s.pct}%</div>
          <div class="vga-sub" id="phSub">${s.filled}/${s.total}</div>
        </div>
        <div class="shape-grid${numsOn?' nums-on':''}" id="shapeGrid"></div>
      </div>

    </div>

    <div class="undo-bar" id="undoBar">
      <span id="undoMsg">تم التغيير</span>
      <button class="btn btn-sm btn-primary" onclick="GridManager.undo()">↩ تراجع</button>
    </div>`;

    GridManager.renderGrid(pg, document.getElementById('shapeGrid'));
    NumberControls.render(pg);
  };

  const updateVisualProgress=pg=>{
    if(!pg)return;const s=GridManager.getStats(pg);
    const pct=document.getElementById('phPct');if(pct)pct.textContent=s.pct+'%';
    const bar=document.getElementById('phBar');if(bar)bar.style.width=s.pct+'%';
    const sub=document.getElementById('phSub');if(sub)sub.textContent=`${s.filled}/${s.total}`;
    _setTopbarPage(pg);
  };

  const toggleToolsDrawer=()=>{
    _drawerOpen=!_drawerOpen;
    const drawer=document.getElementById('toolsDrawer');
    if(drawer)drawer.classList.toggle('hidden-drawer',!_drawerOpen);
  };

  /* EXAM VIEW */
  const _renderExamView=pg=>{
    const s=ExamManager.getStats(pg.id);const streak=pg.streak||0;
    const c=document.getElementById('content');
    c.innerHTML=`<div class="exam-view"><div class="exam-toolbar"><button class="btn btn-sm btn-primary" onclick="Exams.openAdd('${pg.id}')">+ ${I18n.t('addExam')}</button><button class="btn btn-sm" onclick="document.getElementById('bulkImportPgId').value='${pg.id}';document.getElementById('bulkImportText').value='';UI.openModal('modalBulkImport')">📥 ${I18n.t('bulkImport')}</button><div class="drop" id="sessionDrop"><button class="btn btn-sm" onclick="UI.toggleDrop('sessionDrop')">🧠 جلسة</button><div class="drop-menu" id="sessionDropMenu"><div class="drop-item" onclick="SmartSession.start('${pg.id}','weak');UI.closeAllDrops()">📉 ${I18n.t('weakFirst')}</div><div class="drop-item" onclick="SmartSession.start('${pg.id}','random');UI.closeAllDrops()">🎲 ${I18n.t('random')}</div><div class="drop-item" onclick="SmartSession.start('${pg.id}','spaced');UI.closeAllDrops()">🔁 تكرار متباعد</div><div class="drop-item" onclick="SmartSession.start('${pg.id}','all');UI.closeAllDrops()">📚 جميع المعلق</div></div></div><button class="btn btn-sm" onclick="UI.showExamAnalytics('${pg.id}')">📊 ${I18n.t('analytics')}</button><div style="margin-right:auto;display:flex;gap:4px"><button class="btn btn-sm btn-icon${_examView==='grid'?' btn-primary':''}" onclick="UI.setExamView('grid','${pg.id}')">⊞</button><button class="btn btn-sm btn-icon${_examView==='list'?' btn-primary':''}" onclick="UI.setExamView('list','${pg.id}')">☰</button></div></div>${streak>0?`<div class="exam-streak-banner">🔥 سلسلة ${streak} ${I18n.t('streak')}</div>`:''}<div class="exam-stats-bar"><div class="esb-item"><div class="esb-dot" style="background:var(--accent)"></div><span class="esb-val">${s.done}</span> مكتمل</div><div class="esb-item"><div class="esb-dot" style="background:var(--blue)"></div><span class="esb-val">${s.inProg}</span> جارٍ</div><div class="esb-item"><div class="esb-dot" style="background:var(--border2)"></div><span class="esb-val">${s.total-s.done-s.inProg}</span> لم يبدأ</div>${s.avg!==null?`<div class="esb-item" style="margin-right:auto"><span class="esb-val">${s.avg}%</span> متوسط</div>`:''}</div><div class="exam-grid" id="examGrid"></div></div>`;
    renderExamGrid(pg);
  };

  const renderExamGrid=pg=>{
    const el=document.getElementById('examGrid');if(!el)return;
    const exams=ExamManager.getExams(pg.id);
    if(!exams.length){el.innerHTML=`<div class="empty-state" style="width:100%"><div class="empty-icon">📝</div><div class="empty-title">${I18n.t('noExams')}</div><div class="empty-sub">${I18n.t('addFirstExam')}</div><button class="btn btn-primary" style="margin-top:.8rem" onclick="Exams.openAdd('${pg.id}')">+ ${I18n.t('addExam')}</button></div>`;return;}
    const isList=_examView==='list';
    let html=exams.map((e,idx)=>{const sc=e.score!==null?(e.score>=70?'':e.score>=50?' mid':' low'):'';return`<div class="exam-card${e.completed?' completed':''}${e.inProgress?' in-progress':''}${e.favorite?' favorite':''}${e.retry?' retry':''}${isList?' view-list':''}" data-diff="${e.difficulty||'medium'}" style="animation-delay:${Math.min(idx*.03,.4)}s" onclick="Exams.handleClick('${pg.id}','${e.id}')" oncontextmenu="UI.showExamCtx(event,'${pg.id}','${e.id}');return false" onmousedown="Exams.startLongPress('${pg.id}','${e.id}')" onmouseup="Exams.clearLongPress()" ontouchstart="Exams.startLongPress('${pg.id}','${e.id}')" ontouchend="Exams.clearLongPress()"><div class="ec-num">${e.num}</div><div class="ec-title">${esc(e.title)}</div>${e.score!==null?`<div class="ec-score${sc}">${e.score}%</div>`:''}</div>`;}).join('');
    html+=`<div class="exam-add-card${isList?' view-list':''}" onclick="Exams.openAdd('${pg.id}')"><div class="plus">+</div><div>${I18n.t('addExam')}</div></div>`;
    el.innerHTML=html;
  };

  const setExamView=(v,pgId)=>{_examView=v;const pg=Pages.getCurrent();if(pg&&pg.mode==='exam')renderExamGrid(pg);};

  const showExamCtx=(e,pgId,eid)=>{
    e.preventDefault();closeCtxMenu();
    const exam=ExamManager.getExams(pgId).find(ex=>ex.id===eid);if(!exam)return;
    const menu=document.createElement('div');menu.className='ctx-menu';menu.id='ctxMenuEl';
    const items=[
      {icon:'🔗',label:'فتح الاختبار',action:`Exams.handleClick('${pgId}','${eid}')`,cls:'accent'},
      {icon:'✅',label:exam.completed?'إلغاء الاكتمال':'اكتمل',action:`ExamManager.toggleState('${pgId}','${eid}','complete');UI.renderExamGrid(Pages.getCurrent());UI.closeCtxMenu()`},
      {icon:'⏳',label:exam.inProgress?'إيقاف':'جارٍ',action:`ExamManager.toggleState('${pgId}','${eid}','inProgress');UI.renderExamGrid(Pages.getCurrent());UI.closeCtxMenu()`},
      {icon:'★',label:exam.favorite?'إزالة المفضلة':'مفضلة',action:`ExamManager.toggleState('${pgId}','${eid}','favorite');UI.renderExamGrid(Pages.getCurrent());UI.closeCtxMenu()`},
      {icon:'🔄',label:exam.retry?'إلغاء الإعادة':'إعادة',action:`ExamManager.toggleState('${pgId}','${eid}','retry');UI.renderExamGrid(Pages.getCurrent());UI.closeCtxMenu()`},
      {icon:'✏️',label:'تعديل',action:`Exams.openEdit('${pgId}','${eid}');UI.closeCtxMenu()`},
      null,
      {icon:'🗑',label:'حذف',action:`Exams.deleteExam('${pgId}','${eid}')`,cls:'danger'},
    ];
    menu.innerHTML=items.map(it=>it===null?'<div class="ctx-separator"></div>':`<div class="ctx-item${it.cls?' '+it.cls:''}" onclick="${it.action}"><span class="ctx-icon">${it.icon}</span>${it.label}</div>`).join('');
    document.body.appendChild(menu);
    let x=e.clientX,y=e.clientY;
    const mw=menu.offsetWidth,mh=menu.offsetHeight;
    if(x+mw>window.innerWidth)x=window.innerWidth-mw-8;
    if(y+mh>window.innerHeight)y=window.innerHeight-mh-8;
    menu.style.left=x+'px';menu.style.top=y+'px';
    _ctxMenu=menu;
  };
  const closeCtxMenu=()=>{if(_ctxMenu){_ctxMenu.remove();_ctxMenu=null;}};

  const showExamAnalytics=pgId=>{
    const pg=Pages.getCurrent();if(!pg)return;
    const exams=ExamManager.getExams(pgId);const s=ExamManager.getStats(pgId);
    const scored=exams.filter(e=>e.score!==null&&e.completed);
    const barsHtml=scored.sort((a,b)=>b.score-a.score).slice(0,10).map(e=>{const col=e.score>=70?'var(--accent)':e.score>=50?'var(--amber)':'var(--red)';return`<div class="perf-bar-row"><div class="pb-label">${esc(e.title.slice(0,18))}</div><div class="pb-bg"><div class="pb-fill" style="width:${e.score}%;background:${col}"></div></div><div class="pb-val">${e.score}%</div></div>`;}).join('');
    let heat='';for(let i=48;i>=0;i--){const d=new Date(Date.now()-i*86400000);const key=dk(d);const val=(pg.activity||{})[key]||0;const lv=val===0?'':val<3?'lv1':val<6?'lv2':val<10?'lv3':'lv4';heat+=`<div class="hm-day${lv?' '+lv:''}" title="${key}: ${val}"></div>`;}
    const c=document.getElementById('content');
    c.innerHTML=`<div class="analytics-wrap"><div style="display:flex;align-items:center;gap:.7rem;margin-bottom:1.2rem"><button class="btn btn-sm" onclick="UI.openPage('${pgId}')">← رجوع</button><h2 style="font-family:var(--font-display);font-size:1rem;font-weight:800">تحليلات: ${esc(pg.name)}</h2></div><div class="stats-row"><div class="stat-card"><div class="stat-icon">📝</div><div class="stat-val">${s.total}</div><div class="stat-lbl">إجمالي</div></div><div class="stat-card"><div class="stat-icon">✅</div><div class="stat-val">${s.done}</div><div class="stat-lbl">مكتمل</div></div><div class="stat-card"><div class="stat-icon">📈</div><div class="stat-val">${s.pct}%</div><div class="stat-lbl">نسبة الإكمال</div></div>${s.avg!==null?`<div class="stat-card"><div class="stat-icon">🏅</div><div class="stat-val">${s.avg}%</div><div class="stat-lbl">متوسط النتائج</div></div>`:''}</div>${scored.length?`<div class="analytics-section"><h3>أفضل الأداءات</h3><div class="chart-card"><div class="perf-bars">${barsHtml}</div></div></div>`:''}<div class="analytics-section"><h3>خريطة النشاط</h3><div class="chart-card"><div class="heatmap-grid">${heat}</div></div></div></div>`;
  };

  /* STATS */
  const _renderStats=()=>{
    const pages=Pages.getAll();const rows=pages.map(pg=>{let s={done:0,total:0,pct:0};if(pg.mode==='task')s=TaskManager.getStats(pg.id);else if(pg.mode==='visual'){const vs=GridManager.getStats(pg);s={done:vs.filled,total:vs.total,pct:vs.pct};}else if(pg.mode==='exam'){const es=ExamManager.getStats(pg.id);s={done:es.done,total:es.total,pct:es.pct};}const sk=Pages.getStreak(pg);return`<div class="page-card" onclick="Pages.tryOpen('${pg.id}')"><div class="pc-mode pc-mode-${pg.mode}">${pg.mode==='task'?'📋':pg.mode==='visual'?'🎨':'📝'} ${pg.mode}</div><div class="pc-title">${esc(pg.name)}</div><div class="pc-bar-bg"><div class="pc-bar-fill" style="width:${s.pct}%"></div></div><div class="pc-bar-label"><span>${s.done}/${s.total}</span><span>${s.pct}%</span></div>${sk>0?`<div style="font-size:.6rem;color:var(--amber);margin-top:.3rem">🔥 ${sk} يوم</div>`:''}</div>`;}).join('');
    return`<div class="stats-wrap"><h2 style="font-family:var(--font-display);font-size:1rem;font-weight:800;margin-bottom:1rem">الإحصائيات</h2><div class="pages-grid">${rows||'<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">📊</div></div>'}</div></div>`;
  };

  /* ACHIEVEMENTS */
  const _renderAchievements=()=>{
    const list=Achievements.getList(),unlocked=Achievements.getUnlocked();
    const items=list.map(a=>`<div class="ach-card${unlocked[a.id]?' unlocked':' ach-locked'}"><div class="ach-icon">${a.icon}</div><div class="ach-name">${a.name}</div><div class="ach-desc">${a.desc}</div>${unlocked[a.id]?`<div style="font-size:.58rem;color:var(--accent);margin-top:.3rem">${new Date(unlocked[a.id]).toLocaleDateString('ar-SA')}</div>`:''}</div>`).join('');
    return`<div class="achievements-wrap"><h2 style="font-family:var(--font-display);font-size:1rem;font-weight:800;margin-bottom:1rem">الإنجازات (${Object.keys(unlocked).length}/${list.length})</h2><div class="ach-grid">${items}</div></div>`;
  };

  /* PAGE SETTINGS */
  const openPageSettings=()=>{const pg=Pages.getCurrent();if(!pg)return;document.getElementById('sheetPageName').value=pg.name;document.getElementById('sheetPageStats').textContent='';document.getElementById('sheetPageSettings').classList.add('open');};
  const savePageSettings=()=>{const pg=Pages.getCurrent();if(!pg)return;const name=document.getElementById('sheetPageName').value.trim();if(name)pg.name=name;UserManager.updateUser();document.getElementById('sheetPageSettings').classList.remove('open');renderPagesNav();_setTopbarPage(pg);toast('✅ تم الحفظ');};

  /* MODALS/SHEETS/DROPS */
  const openModal=id=>{const m=document.getElementById(id);if(m)m.classList.add('open');};
  const closeModal=id=>{const m=document.getElementById(id);if(m)m.classList.remove('open');};
  const toggleDrop=id=>{const menu=document.getElementById(id+'Menu');if(!menu)return;const was=menu.classList.contains('open');closeAllDrops();if(!was)menu.classList.add('open');};
  const closeAllDrops=()=>document.querySelectorAll('.drop-menu.open').forEach(m=>m.classList.remove('open'));

  /* TOAST */
  const toast=msg=>{let t=document.querySelector('.toast');if(t){t.classList.add('out');setTimeout(()=>t?.remove(),250);}t=document.createElement('div');t.className='toast';t.textContent=msg;document.body.appendChild(t);clearTimeout(_toastTimer);_toastTimer=setTimeout(()=>{if(t){t.classList.add('out');setTimeout(()=>t?.remove(),250);}},2800);};

  return{init,renderPagesNav,showView,openPage,setTopbar,renderTaskContent,renderTaskList,filterTasks,setTaskFilter,toggleTaskSidebar,updateVisualProgress,toggleToolsDrawer,renderExamGrid,setExamView,showExamCtx,closeCtxMenu,showExamAnalytics,openPageSettings,savePageSettings,openModal,closeModal,toggleDrop,closeAllDrops,toggleTheme,toggleSound,toggleLang,toggleSidebar,toggleMobileSidebar,closeMobileSidebar,toast};
})();

/* ══ TASKS UI ══ */
const Tasks=(()=>{
  let _pgId=null,_editId=null,_prio='low';
  const openAdd=pgId=>{_pgId=pgId;_editId=null;_prio='low';document.getElementById('taskModalTitle').textContent='+ مهمة جديدة';document.getElementById('etName').value='';document.getElementById('etDesc').value='';document.getElementById('etCat').value='';document.getElementById('etDue').value='';document.getElementById('deleteTaskBtn').style.display='none';selectPrio('low');UI.openModal('modalTask');};
  const openEdit=(pgId,tid)=>{_pgId=pgId;_editId=tid;const t=TaskManager.getTasks(pgId).find(t=>t.id===tid);if(!t)return;document.getElementById('taskModalTitle').textContent='✏️ تعديل المهمة';document.getElementById('etName').value=t.name;document.getElementById('etDesc').value=t.desc||'';document.getElementById('etCat').value=t.category||'';document.getElementById('etDue').value=t.due||'';document.getElementById('deleteTaskBtn').style.display='inline-flex';selectPrio(t.priority||'low');UI.openModal('modalTask');};
  const selectPrio=p=>{_prio=p;['low','med','high'].forEach(x=>{const b=document.querySelector(`.prio-btn[data-p="${x}"]`);if(b)b.className=`prio-btn${p===x?' sel-'+x:''}`;});};
  const saveEdit=()=>{const name=document.getElementById('etName').value.trim();if(!name){document.getElementById('etName').focus();return;}const data={name,desc:document.getElementById('etDesc').value,priority:_prio,category:document.getElementById('etCat').value,due:document.getElementById('etDue').value};if(_editId)TaskManager.updateTask(_pgId,_editId,data);else TaskManager.addTask(_pgId,data);UI.closeModal('modalTask');const pg=Pages.getCurrent();if(pg){UI.renderTaskContent(pg);UI.renderTaskList(pg);}if(UserManager.getSetting('soundEnabled',true))SoundEngine.add();UI.toast(_editId?'✅ تم التعديل':'✅ تمت الإضافة');Achievements.check();};
  const deleteFromModal=()=>{if(!_editId)return;TaskManager.deleteTask(_pgId,_editId);UI.closeModal('modalTask');const pg=Pages.getCurrent();if(pg){UI.renderTaskContent(pg);UI.renderTaskList(pg);}UI.toast('🗑 تم الحذف');};
  const confirmBulkAdd=()=>{const pg=Pages.getCurrent();if(!pg)return;const lines=document.getElementById('bulkText').value.split('\n').filter(l=>l.trim());TaskManager.bulkAdd(pg.id,lines);UI.closeModal('modalBulkTasks');UI.renderTaskContent(pg);UI.renderTaskList(pg);UI.toast(`✅ أضيف ${lines.length} مهمة`);Achievements.check();};
  const sortBy=by=>{const pg=Pages.getCurrent();if(!pg||pg.mode!=='task')return;const tasks=TaskManager.getTasks(pg.id);if(by==='priority'){const pw={high:0,med:1,low:2};tasks.sort((a,b)=>(pw[a.priority]||2)-(pw[b.priority]||2));}else if(by==='due'){tasks.sort((a,b)=>{if(!a.due&&!b.due)return 0;if(!a.due)return 1;if(!b.due)return-1;return new Date(a.due)-new Date(b.due);});}else if(by==='name'){tasks.sort((a,b)=>a.name.localeCompare(b.name,'ar'));}pg.tasks=tasks;UserManager.updateUser();UI.renderTaskContent(pg);UI.renderTaskList(pg);};
  const clearDone=pgId=>{const u=UserManager.getCurrent();const pg=(u?.pages||[]).find(p=>p.id===pgId);if(!pg)return;const before=pg.tasks.length;pg.tasks=pg.tasks.filter(t=>!t.done);UserManager.updateUser();UI.renderTaskContent(pg);UI.renderTaskList(pg);UI.toast(`🗑 حذف ${before-pg.tasks.length} مهمة مكتملة`);};
  return{openAdd,openEdit,selectPrio,saveEdit,deleteFromModal,confirmBulkAdd,sortBy,clearDone};
})();

/* ══ EXAMS UI ══ */
const Exams=(()=>{
  let _pgId=null,_eid=null,_lp=null;
  const openAdd=pgId=>{_pgId=pgId;_eid=null;document.getElementById('examModalTitle').textContent='+ '+I18n.t('addExam');document.getElementById('eeTitle').value='';document.getElementById('eeLink').value='';document.getElementById('eeNotes').value='';document.getElementById('eeScore').value='';document.getElementById('eeDiff').value='medium';document.getElementById('deleteExamBtn').style.display='none';UI.openModal('modalExam');};
  const openEdit=(pgId,eid)=>{_pgId=pgId;_eid=eid;const e=ExamManager.getExams(pgId).find(e=>e.id===eid);if(!e)return;document.getElementById('examModalTitle').textContent='✏️ '+I18n.t('edit');document.getElementById('eeTitle').value=e.title;document.getElementById('eeLink').value=e.link||'';document.getElementById('eeNotes').value=e.notes||'';document.getElementById('eeScore').value=e.score!==null?e.score:'';document.getElementById('eeDiff').value=e.difficulty||'medium';document.getElementById('deleteExamBtn').style.display='inline-flex';UI.openModal('modalExam');};
  const saveExam=()=>{const title=document.getElementById('eeTitle').value.trim()||'اختبار';const link=document.getElementById('eeLink').value.trim();const notes=document.getElementById('eeNotes').value.trim();const scoreRaw=document.getElementById('eeScore').value;const score=scoreRaw!==''?Math.max(0,Math.min(100,parseInt(scoreRaw))):null;const difficulty=document.getElementById('eeDiff').value||'medium';if(_eid)ExamManager.updateExam(_pgId,_eid,{title,link,notes,score,difficulty});else ExamManager.addExam(_pgId,{title,link,notes,score,difficulty});UI.closeModal('modalExam');const pg=Pages.getCurrent();if(pg)UI.renderExamGrid(pg);if(UserManager.getSetting('soundEnabled',true))SoundEngine.add();UI.toast(_eid?'✅ تم التعديل':'✅ تمت الإضافة');Achievements.check();};
  const deleteExam=(pgId,eid)=>{ExamManager.deleteExam(pgId,eid);UI.closeCtxMenu();const pg=Pages.getCurrent();if(pg)UI.renderExamGrid(pg);UI.toast('🗑 تم الحذف');};
  const deleteFromModal=()=>{if(!_eid)return;ExamManager.deleteExam(_pgId,_eid);UI.closeModal('modalExam');const pg=Pages.getCurrent();if(pg)UI.renderExamGrid(pg);UI.toast('🗑 تم الحذف');};
  const confirmBulkImport=()=>{const raw=document.getElementById('bulkImportText').value.trim();if(!raw)return;const pgId=document.getElementById('bulkImportPgId').value;const added=ExamManager.bulkImport(pgId,raw);UI.closeModal('modalBulkImport');const pg=Pages.getCurrent();if(pg)UI.renderExamGrid(pg);UI.toast(`📥 أضيف ${added} اختبار`);Achievements.check();};
  const handleClick=(pgId,eid)=>{ExamManager.openExam(pgId,eid);const pg=Pages.getCurrent();if(pg)UI.renderExamGrid(pg);};
  const startLongPress=(pgId,eid)=>{_lp=setTimeout(()=>{_lp=null;const el=document.querySelector(`[data-eid="${eid}"]`)||document.body;const r=el.getBoundingClientRect?el.getBoundingClientRect():{clientX:200,clientY:200};UI.showExamCtx({clientX:r.right,clientY:r.top,preventDefault:()=>{}},pgId,eid);},600);};
  const clearLongPress=()=>{clearTimeout(_lp);_lp=null;};
  return{openAdd,openEdit,saveExam,deleteExam,deleteFromModal,confirmBulkImport,handleClick,startLongPress,clearLongPress};
})();

/* ══ ONBOARDING ══ */
const Onboarding=(()=>{
  let _mode='task';
  const check=()=>{const users=UserManager.getUsers();if(!users.length){document.getElementById('existingUsers').classList.add('hidden');document.getElementById('scrName').classList.remove('hidden');return;}if(!UserManager.getCurrent()){const ul=document.getElementById('userList');ul.innerHTML=users.map(u=>`<div class="user-list-item" onclick="Onboarding.login('${u.id}')"><div class="uli-avatar" style="background:${u.color}">${u.avatar}</div><div><div class="uli-name">${esc(u.name)}</div><div class="uli-meta">${(u.pages||[]).length} مجلد • ${new Date(u.lastActive).toLocaleDateString('ar-SA')}</div></div><div class="uli-arrow">←</div></div>`).join('');document.getElementById('existingUsers').classList.remove('hidden');document.getElementById('scrName').classList.remove('hidden');}else{UI.init();}};
  const login=id=>{UserManager.switchUser(id);document.getElementById('scrName').classList.add('hidden');document.getElementById('scrMode').classList.add('hidden');UI.init();};
  const submitName=()=>{const name=document.getElementById('nameInput').value.trim();if(!name){document.getElementById('nameInput').focus();return;}UserManager.createUser(name);document.getElementById('scrName').classList.add('hidden');document.getElementById('scrMode').classList.remove('hidden');document.getElementById('firstPageName').value='';};
  const selectMode=(mode,el)=>{_mode=mode;document.querySelectorAll('.mode-card').forEach(c=>c.classList.remove('selected'));el.classList.add('selected');};
  const finishSetup=()=>{const pgName=document.getElementById('firstPageName').value.trim()||(_mode==='task'?'مهامي':_mode==='visual'?'تقدمي البصري':'اختباراتي');const opts=_mode==='visual'?{count:30,shape:'circle'}:{};Pages.create(pgName,_mode,opts);document.getElementById('scrName').classList.add('hidden');document.getElementById('scrMode').classList.add('hidden');UI.init();};
  return{check,login,submitName,selectMode,finishSetup};
})();

/* ══ GLOBAL HELPERS ══ */
function selectShape(sh,clickedEl){
  const pg=Pages.getCurrent();if(!pg)return;
  GridManager.setSize(parseInt(document.querySelector('.td-sz-pill.active')?.textContent?.trim()==='XS'?28:parseInt(document.querySelector('.td-sz-pill.active')?.getAttribute('onclick')?.match(/\d+/)?.[0])||44)||44,document.querySelector('.td-sz-pill.active'));
  const old=pg.shape;pg.shape=sh;if(old!==sh)UserManager.updateUser();
  document.querySelectorAll('.td-shape-btn').forEach(b=>b.classList.remove('active'));
  if(clickedEl)clickedEl.classList.add('active');
  const grid=document.getElementById('shapeGrid');if(grid)GridManager.renderGrid(pg,grid);
  if(UserManager.getSetting('soundEnabled',true))SoundEngine.nav();
}
function selectColor(ci){
  GridManager.setColor(ci);
  const COLORS=GridManager.getColors();
  document.querySelectorAll('.td-color-grid .color-sw').forEach(sw=>sw.classList.toggle('sel',parseInt(sw.dataset.ci)===ci));
  const dot=document.getElementById('colorPrevDot');if(dot)dot.style.background=COLORS[ci-1]||'var(--c1)';
  if(UserManager.getSetting('soundEnabled',true))SoundEngine.nav();
}
function _toggleTaskItem(pgId,tid){
  const done=TaskManager.toggleTask(pgId,tid);
  if(done){if(UserManager.getSetting('soundEnabled',true))SoundEngine.taskDone();confetti();Achievements.check();Goals.checkProgress(Pages.getCurrent());}
  else{if(UserManager.getSetting('soundEnabled',true))SoundEngine.unfill();}
  const pg=Pages.getCurrent();if(pg){UI.renderTaskContent(pg);UI.renderTaskList(pg);}
}
function _openAddCells(){
  const pg=Pages.getCurrent();if(!pg)return;
  const n=parseInt(prompt('عدد العناصر المراد إضافتها:','10')||'0');
  if(n>0)GridManager.addCells(pg,n);
}
function cdPreset(h,m,s){Countdown.cdPreset(h,m,s);}
function confirmDeletePage(){const pg=Pages.getCurrent();if(!pg)return;if(!confirm(`حذف "${pg.name}" نهائياً؟`))return;Pages.deletePage(pg.id);document.getElementById('sheetPageSettings').classList.remove('open');UI.renderPagesNav();UI.showView('home');UI.toast('🗑 تم حذف المجلد');}

/* ══ EVENTS ══ */
document.addEventListener('click',e=>{
  const btn=e.target.closest('.btn,.nav-item,.page-card');
  if(btn&&!btn.classList.contains('no-ripple')){const r=document.createElement('span');r.className='rpl';const rect=btn.getBoundingClientRect();const sz=Math.max(rect.width,rect.height);r.style.cssText=`width:${sz}px;height:${sz}px;left:${e.clientX-rect.left-sz/2}px;top:${e.clientY-rect.top-sz/2}px;`;btn.appendChild(r);setTimeout(()=>r.remove(),500);}
  if(!e.target.closest('.drop'))UI.closeAllDrops();
  if(!e.target.closest('.ctx-menu'))UI.closeCtxMenu();
});

document.addEventListener('keydown',e=>{
  if(e.key==='Escape'){document.querySelectorAll('.modal-overlay.open').forEach(m=>m.classList.remove('open'));document.querySelectorAll('.sheet-overlay.open').forEach(m=>m.classList.remove('open'));UI.closeAllDrops();UI.closeCtxMenu();closeCelebration();SmartSession.close();}
  if((e.ctrlKey||e.metaKey)&&e.key==='z'){e.preventDefault();GridManager.undo();}
  if((e.ctrlKey||e.metaKey)&&e.key==='y'){e.preventDefault();GridManager.redo();}
});

document.querySelectorAll('.modal-overlay').forEach(o=>o.addEventListener('click',e=>{if(e.target===o)o.classList.remove('open');}));
document.querySelectorAll('.sheet-overlay').forEach(o=>o.addEventListener('click',e=>{if(e.target===o)o.classList.remove('open');}));
document.getElementById('nameInput')?.addEventListener('keydown',e=>{if(e.key==='Enter')Onboarding.submitName();});

/* Switch user modal */
document.querySelector('.user-badge')?.addEventListener('click',()=>{
  const list=document.getElementById('switchUserList');if(!list)return;
  const users=UserManager.getUsers();
  list.innerHTML=users.map(u=>`<div class="user-list-item" onclick="UserManager.switchUser('${u.id}');UI.closeModal('modalSwitchUser');UI.init()"><div class="uli-avatar" style="background:${u.color}">${esc(u.avatar)}</div><div><div class="uli-name">${esc(u.name)}</div><div class="uli-meta">${(u.pages||[]).length} مجلد</div></div><div class="uli-arrow">←</div></div>`).join('');
});

/* Bulk import drag-drop */
window.addEventListener('DOMContentLoaded',()=>{
  Onboarding.check();
  const drop=document.getElementById('bulkDropArea');
  if(drop){
    drop.addEventListener('dragover',e=>{e.preventDefault();drop.style.borderColor='var(--accent)';});
    drop.addEventListener('dragleave',()=>{drop.style.borderColor='';});
    drop.addEventListener('drop',e=>{e.preventDefault();drop.style.borderColor='';const file=e.dataTransfer.files[0];if(!file)return;const r=new FileReader();r.onload=ev=>{document.getElementById('bulkImportText').value=ev.target.result;};r.readAsText(file);});
    drop.addEventListener('click',()=>{const inp=document.createElement('input');inp.type='file';inp.accept='.csv,.txt';inp.onchange=e=>{const file=e.target.files[0];if(!file)return;const r=new FileReader();r.onload=ev=>{document.getElementById('bulkImportText').value=ev.target.result;};r.readAsText(file);};inp.click();});
  }
  document.getElementById('menuBtn').style.display='';
});
