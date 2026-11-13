const $ = id => document.getElementById(id);
const key = 'xiaoban-bichon-v1';
const bichon = {id:'bichon', name:'棉花糖', image:'bichon.jpg', detail:'白色比熊 · 默认陪伴'};
const state = Object.assign({
  tasks:[], templates:[], sessions:[], timer:null, activePet:bichon.id, voice:false, quote:0,
  pet:{fedAt:'', meals:0, foodXp:0, focusMs:0, hat:''}
}, JSON.parse(localStorage.getItem(key) || '{}'));
const save = () => localStorage.setItem(key, JSON.stringify(state));
const activePet = () => state.activePet==='custom' ? (state.customPet ?? bichon) : bichon;
const petName = () => activePet()?.name ?? '陪伴物';
const dateKey = (d = new Date()) => [d.getFullYear(), d.getMonth()+1, d.getDate()].map(x => String(x).padStart(2,'0')).join('-');
const dateAt = d => new Date(d+'T12:00:00');
const id = () => globalThis.crypto?.randomUUID?.() || Date.now()+'-'+Math.random();
const focusMs = () => state.sessions.reduce((total, session) => total + session.ms, 0);
const completedTasks = () => state.tasks.filter(task=>task.done).length;
const levelFocusMs = 5*3600000;
const customUnlockLevel = 10;
const userLevel = () => 1+Math.floor(completedTasks()/10)+Math.floor(focusMs()/levelFocusMs);
const balance = () => Math.floor(completedTasks()/2)+Math.floor(focusMs()/3600000)-(state.pet.foodBought??0);
const quotes = [
  '今天也有在好好努力，给自己点个赞！',
  '慢慢来，比较快。',
  '不用很厉害才开始，开始了才会变厉害。',
  '小小的进步，也值得大大的夸奖。',
  '把大目标拆成小步，一步一步来。',
  '累了就歇一会儿，休息也是在充电。',
  '做完比做得完美更重要。',
  '今天的你，比昨天又进步了一点。',
  '别忘了给认真努力的自己一朵小红花。',
  '遇到难题就先做一点点，剩下的慢慢来。',
  '哪怕今天只完成一件事，也值得庆祝。',
  '加油！小小的坚持，也会有大大的收获。',
  '先伸个懒腰，再做下一件小事。',
  '今天的进度，值得一枚小爪印！',
  '再难的事，也可以先做五分钟。',
  '给认真专注的你，送一颗草莓味的星星。',
  '忙完这一件，就喝口水歇一歇吧。',
  '就算慢一点，你也在往前走。',
  '把打完的勾当成小奖章，今天又攒了一枚。',
  '没做完的明天再来，今天已经做得很好啦。'
];
let day = dateKey(), editing = null, toastTimeout, lastNudge = 0;
function toast(message){
  $('toast').textContent = message;
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(()=>$('toast').textContent='',3200);
}
function button(label, style, action, description){
  const el = document.createElement('button');
  el.type='button'; el.className=style; el.textContent=label;
  if(description) el.setAttribute('aria-label',description);
  el.onclick=action; return el;
}
function node(tag, label, cls){
  const el=document.createElement(tag); el.textContent=label; if(cls) el.className=cls; return el;
}
function chooseDay(value){day=value; renderPlan();}
function openEditor(task, template){
  editing=task?.id || null;
  $('editorTitle').textContent=task?'编辑任务':template?'从模板新建':'新任务';
  $('taskName').value=task?.name || template?.name || '';
  $('taskDate').value=task?.date || day;
  $('taskTime').value=task?.time || template?.time || '09:00';
  $('editor').showModal();
}
function renderPlan(){
  const current=dateAt(day);
  $('todayLabel').textContent=new Intl.DateTimeFormat('zh-CN',{month:'long',day:'numeric',weekday:'long'}).format(current);
  $('datePick').value=day;
  $('week').replaceChildren();
  const monday=dateAt(day);
  monday.setDate(current.getDate()-(current.getDay()+6)%7);
  for(let i=0;i<7;i++){
    const date=new Date(monday); date.setDate(monday.getDate()+i);
    const value=dateKey(date), el=button('', '',()=>chooseDay(value));
    el.append(node('small','一二三四五六日'[i]),node('strong',date.getDate()));
    el.setAttribute('aria-label',value); el.setAttribute('aria-pressed',String(value===day));
    $('week').append(el);
  }
  const tasks=state.tasks.filter(t=>t.date===day).sort((a,b)=>a.time.localeCompare(b.time));
  const done=tasks.filter(t=>t.done).length;
  $('summary').textContent=done+' / '+tasks.length+' 已完成 · 每 2 项得 1 积分';
  $('progress').style.width=(tasks.length?100*done/tasks.length:0)+'%';
  $('tasks').replaceChildren();
  if(!tasks.length) $('tasks').append(node('p','这天还没有任务，给自己安排一件小事吧。','empty'));
  for(const task of tasks){
    const row=node('article','','task'), info=node('div','','info');
    info.append(node('b',task.name),node('p',task.time+(task.done?' · 已完成':'')));
    const check=button(task.done?'✓':'○','check'+(task.done?' checked':''),()=>{
      if(task.done){toast('这项任务已完成');return;}
      const before=balance(), previousLevel=userLevel();
      task.done=true; save(); render();
      toast('任务完成'+(balance()>before?' · +1 积分':'')+levelNotice(previousLevel));
      newQuote(true);
    },task.done?'已完成 '+task.name:'完成 '+task.name);
    check.disabled=task.done;
    row.append(check, info, button('存模板','quiet',()=>{
      if(state.templates.some(t=>t.name===task.name&&t.time===task.time)){toast('已有相同模板');return;}
      state.templates.push({id:id(),name:task.name,time:task.time}); save(); renderPlan(); toast('已保存为模板');
    }),button('编辑','quiet',()=>openEditor(task)));
    if(!task.done) row.append(button('删除','quiet',()=>{
      if(confirm('删除这项任务？')){state.tasks=state.tasks.filter(t=>t.id!==task.id);save();render();}
    }));
    $('tasks').append(row);
  }
  $('templates').replaceChildren();
  if(!state.templates.length) $('templates').append(node('p','点任务旁的「存模板」，下次可以直接套用。','empty'));
  for(const template of state.templates){
    const row=node('div','','task'), info=node('div','','info');
    info.append(node('b',template.name),node('p',template.time));
    row.append(info,button('套用','quiet',()=>openEditor(null,template)),button('删除','quiet',()=>{
      state.templates=state.templates.filter(t=>t.id!==template.id); save(); renderPlan();
    }));
    $('templates').append(row);
  }
}
const elapsed = () => state.timer ? state.timer.ms + (state.timer.start ? Math.max(0,Date.now()-state.timer.start):0) : 0;
function format(ms){
  const s=Math.floor(ms/1000);
  return [Math.floor(s/3600),Math.floor(s/60)%60,s%60].map(n=>String(n).padStart(2,'0')).join(':');
}
function tick(){
  const ms=elapsed();
  $('elapsed').textContent=format(ms);
  if(activePet() && state.timer?.start && !document.hidden && Math.floor(ms/300000)>lastNudge){
    lastNudge=Math.floor(ms/300000); newQuote(true);
  }
}
function renderFocus(){
  tick();
  const timer=state.timer;
  $('mode').textContent=timer?.start?'专注中':timer?'已暂停':'准备开始';
  $('timerActions').replaceChildren();
  $('timerActions').append(button(timer?.start?'暂停':timer?'继续':'开始专注','primary',()=>{
    if(timer?.start) state.timer={ms:elapsed(),start:null};
    else if(timer) state.timer={ms:timer.ms,start:Date.now()};
    else {state.timer={ms:0,start:Date.now()};lastNudge=0;}
    save(); renderFocus();
    renderPetShop();
  }));
  if(timer) $('timerActions').append(button('结束并结算','quiet',()=>{
    const before=balance(), previousLevel=userLevel(), ms=elapsed();
    const beforeXp = affection();
    if(ms>=1000) {
      state.sessions.unshift({at:Date.now(),ms});
      if(activePet()) state.pet.focusMs += ms;
    }
    state.timer=null; save(); render();
    const gain=balance()-before;
    const petGain = affection()-beforeXp;
    toast('专注结束 · '+format(ms)+(gain?' · +'+gain+' 积分':'')+(petGain?' · 好感度 +'+petGain:'')+levelNotice(previousLevel));
    newQuote(true);
  }));
  $('focusTotal').textContent='累计专注 '+format(focusMs());
  $('history').replaceChildren();
  if(state.sessions.length) $('history').append(node('h2','最近的专注记录'));
  for(const session of state.sessions.slice(0,8)){
    const row=node('div','','task');
    row.append(node('b',format(session.ms),'info'),node('p',new Date(session.at).toLocaleString('zh-CN')));
    $('history').append(row);
  }
}
function speakText(text){
  if(!('speechSynthesis' in window)){toast('此设备暂不支持朗读');return;}
  speechSynthesis.cancel();
  const speech=new SpeechSynthesisUtterance(text);
  speech.lang='zh-CN'; speech.rate=.9; speechSynthesis.speak(speech);
}
function readQuote(){speakText('主人，'+quotes[state.quote]);}
function showQuote(){
  $('quote').textContent='主人，'+quotes[state.quote];
}
function newQuote(automatic=false){
  if(!activePet())return;
  state.quote=(state.quote+1+Math.floor(Math.random()*(quotes.length-1)))%quotes.length;
  save(); showQuote();
  if(automatic){toast([$('toast').textContent, petName()+'：主人，'+quotes[state.quote]].filter(Boolean).join(' · '));if(state.voice)readQuote();}
}
const hats = [
  {name:'不戴', icon:'', level:1},
  {name:'蝴蝶结', icon:'🎀', level:1},
  {name:'小花', icon:'🌸', level:2},
  {name:'小皇冠', icon:'👑', level:3}
];
const affection = () => state.pet.foodXp + Math.floor(state.pet.focusMs/300000);
const petLevel = () => 1+Math.floor(affection()/10);
const mealsLeft = () => state.pet.fedAt===dateKey() ? 3-state.pet.meals : 3;
const foodStock = () => (state.pet.foodBought??0)-(state.pet.foodUsed??0);
const clickMoves=['pet-hop','pet-wiggle','pet-spin'];
const idleMoves=['pet-tilt','pet-stretch','pet-bob'];
const moveClasses=[...clickMoves,...idleMoves];
let lastMotion=0;
let previousClick=-1;
function animatePet(target, move){
  const image=target.querySelector('img');
  image.classList.remove(...moveClasses);
  void image.offsetWidth;
  image.classList.add(move);
  lastMotion=Date.now();
}
function visiblePetTargets(){
  return Array.from(document.querySelectorAll('[data-pet-action]')).filter(el=>{
    const bounds=el.getBoundingClientRect();
    return bounds.height>0 && bounds.top>=0 && bounds.bottom<=window.innerHeight;
  });
}
function react(message, target, move='pet-hop'){
  const visible=target ?? visiblePetTargets()[0];
  if(visible)animatePet(visible,move);
  toast(petName()+'：'+message);
  if(state.voice)speakText(message);
}
function renderPet(){
  const pet = activePet();
  $('care').hidden=!pet;
  $('petFloat').hidden=!pet;
  if(!pet)return;
  document.querySelectorAll('[data-pet-image]').forEach(img=>{
    img.src=pet.image;
    if(img.dataset.petImage==='named')img.alt=pet.name;
  });
  document.querySelectorAll('[data-pet-action]').forEach(el=>el.setAttribute('aria-label','摸摸'+pet.name));
  $('careName').textContent=pet.name+'的陪伴';
  $('quoteName').textContent=pet.name+'说';
  $('petLevel').textContent='Lv. '+petLevel();
  $('petXp').textContent='好感度 '+affection()+' · 距下一级 '+(10-affection()%10);
  $('petProgress').style.width=(affection()%10)*10+'%';
  $('feed').disabled=mealsLeft()<=0||foodStock()<=0;
  $('feedCount').textContent='库存 '+foodStock()+' 颗 · 今天还可喂 '+mealsLeft()+' 次 · 每次 +2 好感度';
  $('foodLink').hidden=foodStock()>0;
  document.querySelectorAll('.pet-hat').forEach(el=>el.textContent=state.pet.hat);
  $('hats').replaceChildren(...hats.map(hat=>{
    const unlocked=petLevel()>=hat.level;
    const el=button(hat.icon+' '+hat.name+(unlocked?'':' · Lv. '+hat.level),'hat-choice',()=>{
      state.pet.hat=hat.icon;
      save();renderPet();
      react(hat.icon?'主人，新头饰好看吗？':'主人，今天就这样陪你吧！');
    });
    el.disabled=!unlocked;
    el.setAttribute('aria-pressed',String(state.pet.hat===hat.icon));
    return el;
  }));
}
function switchPet(pet){
  if(state.activePet===pet.id)return;
  const {foodXp, focusMs, hat}=state.pet;
  state.petProgress ??= {};
  state.petProgress[state.activePet]={foodXp,focusMs,hat};
  Object.assign(state.pet,state.petProgress[pet.id]??{foodXp:0,focusMs:0,hat:''});
  state.activePet=pet.id;
  save();render();
  react('主人，我来陪你啦！');
}
function petCard(pet, label, action){
  const card=node('article','','pet-card');
  const image=node('img','');
  image.src=pet.image;
  image.alt='';
  const choose=button(label,'primary',action);
  card.append(image,node('h3',pet.name),node('p',pet.detail),choose);
  return {card,choose};
}
function renderPetShop(){
  const active=activePet().id===bichon.id;
  const {card,choose}=petCard(bichon,active?'陪伴中':'设为陪伴',()=>{
    if(state.timer){toast('请先结束本次专注，再切换陪伴物');return;}
    switchPet(bichon);
  });
  choose.disabled=active;
  $('petShop').replaceChildren(card);
}
function levelNotice(previousLevel){
  const level=userLevel();
  if(level===previousLevel)return '';
  return ' · 用户升到 '+level+' 级'+(previousLevel<customUnlockLevel&&level>=customUnlockLevel?'，已解锁自定义宠物':'');
}
function renderUserLevel(){
  const level=userLevel();
  const unlocked=level>=customUnlockLevel;
  $('userLevel').textContent='用户 Lv. '+level;
  $('taskLevelProgress').textContent='任务 '+completedTasks()%10+' / 10';
  $('focusLevelProgress').textContent='专注 '+format(focusMs()%levelFocusMs)+' / 05:00:00';
  $('customStatus').textContent=unlocked?'上传一张图片，给你的专属陪伴物取个名字。':'用户达到 10 级后解锁 · 当前 Lv. '+level;
  $('editCustom').disabled=!unlocked;
  $('editCustom').textContent=state.customPet?'编辑宠物':'创建宠物';
  $('customSlot').replaceChildren();
  if(state.customPet){
    const active=state.activePet==='custom';
    const {card,choose}=petCard(state.customPet,active?'陪伴中':'设为陪伴',()=>{
      if(state.timer){toast('请先结束本次专注，再切换陪伴物');return;}
      switchPet(state.customPet);
    });
    choose.disabled=active;
    $('customSlot').append(card);
  }
}
async function preparePetImage(file){
  if(!/^image\/(png|jpeg|webp|gif|heic|heif|avif)$/.test(file.type)||file.size>20*1024*1024){
    throw new Error('请选择不超过 20 MB 的图片。');
  }
  const url=URL.createObjectURL(file);
  try{
    const image=new Image();
    image.src=url;
    await image.decode();
    const scale=Math.min(1,384/Math.max(image.naturalWidth,image.naturalHeight));
    const canvas=document.createElement('canvas');
    canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));
    canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
    canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);
    return canvas.toDataURL('image/webp',.88);
  }finally{
    URL.revokeObjectURL(url);
  }
}
function render(){
  renderPlan(); renderFocus();
  const points=balance();
  $('points').textContent=points;
  $('foodBuy').disabled=points<1;
  $('foodStock').textContent='库存 '+foodStock()+' 颗'+(points<1?' · 积分不足':'');
  renderPetShop();
  renderUserLevel();
  $('companion').hidden=!activePet();
  $('voice').checked=state.voice;
  renderPet();
  showQuote();
}
document.querySelectorAll('[data-tab]').forEach(el=>el.onclick=()=>{
  const view=el.dataset.tab;
  for(const tab of ['plan','focus','shop']) $(tab).hidden=tab!==view;
  document.querySelectorAll('nav button').forEach(b=>{
    if(b.dataset.tab===view)b.setAttribute('aria-current','page');
    else b.removeAttribute('aria-current');
  });
  window.scrollTo(0,0);
});
$('today').onclick=()=>chooseDay(dateKey());
$('datePick').onchange=e=>{if(e.target.value)chooseDay(e.target.value);};
$('add').onclick=()=>openEditor();
$('close').onclick=()=>$('editor').close();
$('form').onsubmit=e=>{
  e.preventDefault();
  const name=$('taskName').value.trim();
  if(!name){toast('请输入任务内容');return;}
  const task={name,date:$('taskDate').value,time:$('taskTime').value};
  if(editing) Object.assign(state.tasks.find(t=>t.id===editing),task);
  else state.tasks.push({...task,id:id(),done:false});
  day=task.date; save(); $('editor').close(); render(); toast('任务已保存');
};
$('shuffle').onclick=()=>{newQuote();if(state.voice)readQuote();};
$('speak').onclick=readQuote;
$('voice').onchange=e=>{state.voice=e.target.checked;save();if(state.voice)readQuote();else window.speechSynthesis?.cancel();};
$('feed').onclick=()=>{
  if(!activePet()||mealsLeft()<=0||foodStock()<=0)return;
  const previous=petLevel(), today=dateKey();
  if(state.pet.fedAt!==today){state.pet.fedAt=today;state.pet.meals=0;}
  state.pet.meals++;
  state.pet.foodUsed=(state.pet.foodUsed??0)+1;
  state.pet.foodXp+=2;
  save();render();
  react('谢谢主人，草莓真好吃！'+(petLevel()>previous?' 我升到 '+petLevel()+' 级啦！':' 好感度 +2'));
};
$('foodBuy').onclick=()=>{
  if(balance()<1)return;
  state.pet.foodBought=(state.pet.foodBought??0)+1;
  save();render();toast('已用 1 积分兑换 1 颗草莓');
};
$('editCustom').onclick=()=>{
  if(userLevel()<customUnlockLevel)return;
  $('customName').value=state.customPet?.name??'';
  $('customImage').value='';
  $('customImage').required=!state.customPet;
  $('customError').textContent='';
  $('customEditor').showModal();
};
$('closeCustom').onclick=()=>$('customEditor').close();
$('customForm').onsubmit=async event=>{
  event.preventDefault();
  if(userLevel()<customUnlockLevel||$('saveCustom').disabled)return;
  const name=$('customName').value.trim();
  const file=$('customImage').files[0];
  if(!name){$('customError').textContent='请给宠物取个名字。';return;}
  $('customError').textContent='';
  $('saveCustom').disabled=true;
  $('closeCustom').disabled=true;
  const previous=state.customPet;
  try{
    const image=file?await preparePetImage(file):previous?.image;
    if(!image)throw new Error('请上传一张宠物图片。');
    if(!$('customEditor').open)return;
    state.customPet={id:'custom',name,image,detail:'你的专属宠物'};
    save();
    $('customEditor').close();
    render();
    toast('已保存「'+name+'」');
  }catch(error){
    state.customPet=previous;
    $('customError').textContent=error.name==='QuotaExceededError'?'设备存储空间不足，请换一张较小的图片。':error.name==='EncodingError'?'这张图片无法打开，请试试 PNG 或 JPG。':error.message;
  }finally{
    $('saveCustom').disabled=false;
    $('closeCustom').disabled=false;
  }
};
const greetings=[
  '主人，摸摸头！我最喜欢这一招啦。',
  '主人，你看，我会原地转圈！',
  '主人，汪！今天也一起加油吧。',
  '主人，别忘了喝水，我也要去舔一口。',
  '主人，我帮你守着今天的小目标！',
  '主人，摸一下攒一点好心情。',
  '主人，我的尾巴摇得停不下来啦！',
  '主人，做累了就休息一下，我在这儿等你。'
];
let previousGreeting=-1;
function nextIndex(previous, size){
  return (previous+1+Math.floor(Math.random()*(size-(previous>=0?1:0))))%size;
}
document.querySelectorAll('[data-pet-action]').forEach(el=>el.onclick=()=>{
  previousGreeting=nextIndex(previousGreeting,greetings.length);
  previousClick=nextIndex(previousClick,clickMoves.length);
  react(greetings[previousGreeting],el,clickMoves[previousClick]);
});
function scheduleIdleMotion(){
  setTimeout(()=>{
    const modalOpen=document.querySelector('dialog[open]');
    if(!document.hidden&&!modalOpen&&Date.now()-lastMotion>2500){
      const target=visiblePetTargets()[0];
      if(target)animatePet(target,idleMoves[Math.floor(Math.random()*idleMoves.length)]);
    }
    scheduleIdleMotion();
  },9000+Math.random()*10000);
}
document.addEventListener('visibilitychange',()=>{tick();renderPet();});
setInterval(tick,500);
render();
scheduleIdleMotion();
if(location.protocol!=='file:' && 'serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(console.warn);

