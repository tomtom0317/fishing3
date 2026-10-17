(function(){'use strict';
var $=function(id){return document.getElementById(id)};
var canvas=$('scene'),ctx=canvas.getContext('2d');var mode=null,stage=1,score=0,baitLeft=5,phase='menu',selectedBait=0,selectedPoint=1,fish=null,fishDistance=100,tension=15,escapeTime=0,castElapsed=0,frameLast=0,seed=Math.random()*1000,casts=0,lastReel=0;
var baitData={boat:[['🪱','イソメ'],['🦐','エビ'],['🐟','小魚'],['🦑','イカ']],offshore:[['🦑','イカ'],['🐟','小魚'],['🦐','エビ'],['✨','ルアー']]};
var points={boat:['⚓ 港のそば','🪸 サンゴ・岩','🌊 深いところ'],offshore:['🌊 潮目','🐟 魚の群れ','🌑 深い海']};
var fishData={
boat:[
{name:'アジ',emoji:'🐟',weight:27,score:42,baits:[0,1],spots:[0,1]},
{name:'サバ',emoji:'🐟',weight:38,score:56,baits:[0,2],spots:[0,2]},
{name:'マダイ',emoji:'🐠',weight:65,score:125,baits:[1,3],spots:[1,2]},
{name:'カサゴ',emoji:'🐟',weight:33,score:75,baits:[0,1,3],spots:[1,2]},
{name:'シロギス',emoji:'🐟',weight:25,score:52,baits:[0,1],spots:[0,1]},
{name:'ヒラメ',emoji:'🐟',weight:78,score:155,baits:[2,3],spots:[0,2]},
{name:'長靴',emoji:'🥾',weight:40,score:0,baits:[0,1,2,3],spots:[0,1,2],junk:true},
{name:'クエ',emoji:'🐟',weight:145,score:230,bonus:450,baits:[2,3],spots:[1,2],rare:true}
],
offshore:[
{name:'カジキマグロ',emoji:'🐟',weight:225,score:300,baits:[1,3],spots:[0,2]},
{name:'シイラ',emoji:'🐠',weight:110,score:160,baits:[0,1,3],spots:[0,1]},
{name:'エイ',emoji:'🐟',weight:125,score:115,baits:[0,2],spots:[1,2]},
{name:'カツオ',emoji:'🐟',weight:85,score:120,baits:[1,3],spots:[0,1]},
{name:'キハダマグロ',emoji:'🐟',weight:175,score:255,baits:[1,3],spots:[0,2]},
{name:'サワラ',emoji:'🐟',weight:105,score:140,baits:[0,1,3],spots:[0,1]},
{name:'シュモクザメ',emoji:'🦈',weight:170,score:0,baits:[0,1,2,3],spots:[0,1,2],junk:true},
{name:'クロマグロ',emoji:'🐟',weight:290,score:370,bonus:600,baits:[1,3],spots:[0,2],rare:true}
]};
var reelLevel='easy';var reelSettings={easy:{normal:6,rapid:9,rapidMs:90,progress:10.5,decay:.044,escape:.005},normal:{normal:8,rapid:13,rapidMs:105,progress:8.7,decay:.036,escape:.007},challenge:{normal:12,rapid:21,rapidMs:145,progress:6.5,decay:.027,escape:.011}};
var goal={boat:[80,170,290,420,570],offshore:[100,260,460,700,980]};var collection={};var audio=null,soundOn=true,musicTimer=null;
function today(){var d=new Date();return ''+d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate()}
function countKey(m){return 'oceanFishing.daily.'+m+'.'+today()}
function getCount(m){try{return Math.max(0,parseInt(localStorage.getItem(countKey(m))||'0',10)||0)}catch(e){return 0}}
function addCount(m){try{localStorage.setItem(countKey(m),''+(getCount(m)+1))}catch(e){}}
function updateCounts(){$('boatCount').textContent='のこり '+Math.max(0,3-getCount('boat'))+' 回';$('offshoreCount').textContent='のこり '+Math.max(0,3-getCount('offshore'))+' 回'}
function loadCollection(){try{collection=JSON.parse(localStorage.getItem('oceanFishing.fishes')||'{}')||{}}catch(e){collection={}}renderCollection()}
function recordCatch(name){collection[mode+':'+name]=(collection[mode+':'+name]||0)+1;try{localStorage.setItem('oceanFishing.fishes',JSON.stringify(collection))}catch(e){}renderCollection()}
function renderCollection(){var html='';['boat','offshore'].forEach(function(m){html+='<div class="fishGroup"><b>'+(m==='boat'?'🚤 ボート':'🌊 外洋')+'</b><div class="fishRow">';fishData[m].forEach(function(f){var count=collection[m+':'+f.name]||0;var hidden=f.rare&&!count;html+='<span class="fishChip '+(hidden?'unknown':f.rare?'rare':'')+'">'+(hidden?'❔ ？':f.emoji+' '+f.name)+(count?' ×'+count:'')+'</span>'});html+='</div></div>'});$('collection').innerHTML=html}
function sound(){if(!soundOn)return;try{var AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;if(!audio)audio=new AC();if(audio.state==='suspended')audio.resume()}catch(e){audio=null}}
function beep(freq,duration,volume,type){if(!soundOn||!audio)return;try{var o=audio.createOscillator(),g=audio.createGain(),t=audio.currentTime;o.type=type||'sine';o.frequency.value=freq;g.gain.setValueAtTime(volume||.025,t);g.gain.exponentialRampToValueAtTime(.001,t+duration);o.connect(g);g.connect(audio.destination);o.start(t);o.stop(t+duration+.02)}catch(e){}}
var melody=[392,440,523,440,349,392,440,0,330,392,440,392,294,330,392,0],note=0;
function startMusic(){sound();if(musicTimer)return;musicTimer=setInterval(function(){if(soundOn&&audio&&phase!=='menu'){var f=melody[note%melody.length];if(f)beep(f,.24,.014,'triangle');note++}},330)}
function stopMusic(){if(musicTimer){clearInterval(musicTimer);musicTimer=null}}
function announce(s){$('notice').textContent=s}
function setPhase(p){phase=p;$('setup').className=p==='choose'?'':'hidden';$('cast').className=p==='choose'?'primary':'primary hidden';$('reel').className=p==='fight'?'primary':'primary hidden';$('meter').className=p==='fight'?'':'hidden';$('next').className=p==='result'?'primary':'primary hidden';}
function start(m){updateCounts();if(getCount(m)>=3){announce('このコースは きょう3回あそんだよ。あした またきてね！');return}addCount(m);updateCounts();mode=m;stage=1;score=0;casts=0;seed=Math.random()*1000;$('select').className='panel hidden';$('game').className='';startMusic();initStage()}
function initStage(){baitLeft=5;casts=0;fish=null;selectedBait=0;selectedPoint=1;renderOptions();setPhase('choose');$('catchbox').className='hidden';announce('ステージ '+stage+'！ えさと ポイントを えらぼう！');updateStats()}
function updateStats(){$('modeLabel').textContent=mode==='boat'?'🚤 ボート':'🌊 がいよう';$('stageLabel').textContent=stage+' / 5 めん';$('scoreLabel').textContent='⭐ '+score+'点';$('baitLabel').textContent='🪱 のこり '+baitLeft+'こ'}
function renderOptions(){var a=$('baitOptions'),b=$('pointOptions');a.innerHTML='';b.innerHTML='';baitData[mode].forEach(function(z,i){var n=document.createElement('button');n.textContent=z[0]+' '+z[1];n.className=i===selectedBait?'selected':'';n.onclick=function(){selectedBait=i;renderOptions();beep(550,.08)};a.appendChild(n)});points[mode].forEach(function(z,i){var n=document.createElement('button');n.textContent=z;n.className=i===selectedPoint?'selected':'';n.onclick=function(){selectedPoint=i;renderOptions();beep(480,.08)};b.appendChild(n)})}
function chooseFish(){var all=fishData[mode];var valid=all.filter(function(f){return f.baits.indexOf(selectedBait)>=0&&f.spots.indexOf(selectedPoint)>=0});var common=valid.filter(function(f){return !f.rare&&!f.junk});var junk=valid.filter(function(f){return f.junk});var rare=valid.filter(function(f){return f.rare});var rand=Math.random(),f;
// レアはステージ3以降、対応する餌・ポイントで約8%の確率
if(stage>=3&&rare.length&&rand<.08)f=rare[0];
else if(junk.length&&rand<.22)f=junk[0];
else if(common.length)f=common[Math.floor(Math.random()*common.length)];
else f=valid[Math.floor(Math.random()*valid.length)]||all[0];
var size=Math.round(f.weight*(.7+Math.random()*.62));return {name:f.name,emoji:f.emoji,size:size,points:f.junk?0:Math.round(f.score*(size/f.weight))+(f.bonus||0),bonus:f.bonus||0,rare:!!f.rare,junk:!!f.junk,power:Math.min(2.1,.6+f.weight/180),x:570,y:270}}
function cast(){if(phase!=='choose'||baitLeft<1)return;sound();baitLeft--;casts++;fish=chooseFish();castElapsed=0;setPhase('casting');announce('🎣 キャスト！ うきを みていてね…');updateStats();beep(400,.13,.04,'triangle');setTimeout(function(){if(phase==='casting'){setPhase('waiting');announce('じっと まとう… うきが動いたらヒット！')}},850);setTimeout(function(){if(phase==='waiting'||phase==='casting'){fishDistance=100;tension=20;escapeTime=0;lastReel=0;setPhase('fight');announce('❗ ヒット！ リールを まこう！');beep(740,.17,.05);setTimeout(function(){beep(960,.25,.04)},180)}},1900+Math.floor(Math.random()*1100))}
function reel(){if(phase!=='fight')return;sound();var cfg=reelSettings[reelLevel],now=Date.now(),rapid=lastReel>0&&now-lastReel<cfg.rapidMs;lastReel=now;tension+=rapid?cfg.rapid:cfg.normal;fishDistance-=cfg.progress/(.88+fish.power*.16);fish.x=435+fishDistance*1.3;beep(350+Math.round(tension*3),.055,.016,'sine');checkFight();renderMeter()}
function checkFight(){if(phase!=='fight')return;if(tension>=100){lose('💥 まきすぎ！ 糸がきれちゃった！')}else if(fishDistance<=0){win()}else if(escapeTime>=100){lose('💨 ゆっくりすぎた！ 魚がにげた！')}}
function renderMeter(){if(phase!=='fight')return;var t=Math.max(0,Math.min(100,tension)),d=Math.max(0,Math.min(100,fishDistance));$('tensionFill').style.width=t+'%';$('tensionFill').style.background=t>77?'#ee4b45':t>35?'#ffbd38':'#3cba8b';$('distanceFill').style.width=d+'%';$('tensionLabel').textContent=Math.round(t)+'%';$('distanceLabel').textContent=Math.round(d)+'%'}
function win(){var gained=fish.points;score+=gained;recordCatch(fish.name);beep(660,.22,.05);setTimeout(function(){beep(880,.3,.05)},150);$('catchbox').className='';$('catchbox').textContent=fish.emoji+' '+fish.name+' '+(fish.junk?'':fish.size+'cm ')+'を つった！ ＋'+gained+'点'+(fish.rare?' 🎊 レアボーナス ＋'+fish.bonus+'点こみ！':gained===0?'（0点）':'');announce(fish.rare?'🌟 レア発見！ '+fish.name+'！':gained===0?'おしい！ 0点だった！':'やった！ '+fish.name+'を つった！');setPhase('result');updateStats();endIfNeeded()}
function lose(msg){announce(msg);$('catchbox').className='';$('catchbox').textContent='ざんねん！ えさを1こ つかったよ';setPhase('result');beep(220,.3,.04,'sawtooth');endIfNeeded()}
function endIfNeeded(){if(baitLeft===0){$('next').textContent=score>=goal[mode][stage-1]?'つぎへ ▶':'結果をみる ▶'}else $('next').textContent='つづけて つる ▶'}
function nextStage(){if(phase!=='result')return;if(baitLeft>0){setPhase('choose');$('catchbox').className='hidden';announce('つぎの魚をねらおう！');return}if(score>=goal[mode][stage-1]){if(stage===5){finish(true);return}stage++;initStage()}else finish(false)}
function finish(cleared){setPhase('end');$('setup').className='hidden';$('cast').className='primary hidden';$('next').className='primary hidden';$('catchbox').className='';$('catchbox').textContent=cleared?'🏆 全5ステージ クリア！ 合計 '+score+'点！':'🎯 今回のスコア '+score+'点！ ステージ'+stage+'で終了';announce(cleared?'🎉 おめでとう！ つり名人だ！':'またちょうせんしてね！');beep(cleared?784:300,.35,.05)}
function home(){mode=null;setPhase('menu');$('game').className='hidden';$('select').className='panel';stopMusic();updateCounts()}
function polygon(points,color){ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(points[0],points[1]);for(var i=2;i<points.length;i+=2)ctx.lineTo(points[i],points[i+1]);ctx.closePath();ctx.fill()}
function scene(ts){if(!frameLast)frameLast=ts;var delta=Math.min(65,ts-frameLast);frameLast=ts;var t=ts/1000,w=800,h=400;ctx.clearRect(0,0,w,h);var boat=mode!=='offshore',waterY=boat?205:178;
var sky=ctx.createLinearGradient(0,0,0,waterY);sky.addColorStop(0,boat?'#84d8ff':'#447fce');sky.addColorStop(1,boat?'#e2f9ff':'#d2e7fc');ctx.fillStyle=sky;ctx.fillRect(0,0,w,waterY);
ctx.fillStyle='#ffe991';ctx.beginPath();ctx.arc(670,65,31,0,7);ctx.fill();
if(boat){polygon([0,165,75,142,141,160,225,149,300,189,800,187,800,213,0,213],'#9bb6a6');polygon([0,188,84,164,159,188,260,176,800,198,800,214,0,214],'#6daaa6');ctx.fillStyle='#f9fcfc';ctx.fillRect(56,140,55,24);ctx.fillStyle='#b44f38';ctx.fillRect(71,130,14,10)}
else{polygon([0,172,110,169,230,173,360,170,800,173,800,191,0,191],'#668ab4')}
var water=ctx.createLinearGradient(0,waterY,0,h);water.addColorStop(0,boat?'#36b8d5':'#1568ac');water.addColorStop(1,boat?'#178cae':'#083c84');ctx.fillStyle=water;ctx.fillRect(0,waterY,w,h-waterY);
for(var i=0;i<13;i++){var yy=waterY+14+i*16;ctx.strokeStyle='rgba(255,255,255,'+(boat?'.24':'.17')+')';ctx.lineWidth=2;ctx.beginPath();for(var xx=0;xx<=800;xx+=16){var wave=Math.sin(xx/34+t*1.5+i)*4;if(xx===0)ctx.moveTo(xx,yy+wave);else ctx.lineTo(xx,yy+wave)}ctx.stroke()}
// 釣り船と釣り人
ctx.save();ctx.translate(0,Math.sin(t*1.5)*2);polygon([45,220,269,220,241,272,88,270],boat?'#f7e5a8':'#efeff6');polygon([59,221,260,221,240,253,81,253],boat?'#d37a48':'#df6150');ctx.fillStyle='#fdf5df';ctx.fillRect(85,177,89,45);ctx.fillStyle='#5384b6';ctx.fillRect(105,185,27,20);ctx.fillStyle='#58667e';ctx.fillRect(162,172,7,53);
ctx.fillStyle='#234e73';ctx.fillRect(212,204,14,30);ctx.fillRect(233,206,12,28);ctx.fillStyle='#ff8b38';ctx.fillRect(209,163,39,47);ctx.fillStyle='#ffd3a6';ctx.beginPath();ctx.arc(230,145,19,0,7);ctx.fill();polygon([209,135,249,132,241,122,217,123],'#f7c24a');ctx.strokeStyle='#ffe1b7';ctx.lineWidth=8;ctx.beginPath();ctx.moveTo(238,176);ctx.lineTo(273,188);ctx.stroke();ctx.strokeStyle='#604431';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(273,188);ctx.lineTo(405,59);ctx.stroke();ctx.restore();
if(phase!=='choose'&&phase!=='menu'&&phase!=='end'){ctx.strokeStyle='#f1f7fa';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(405,59);var bx=phase==='fight'?Math.max(405,fish.x):540;var by=waterY+14+Math.sin(t*4)*4;ctx.lineTo(bx,by);ctx.stroke();ctx.fillStyle='#f7eb63';ctx.beginPath();ctx.ellipse(bx,by,8,12,0,0,7);ctx.fill();ctx.fillStyle='#e95544';ctx.fillRect(bx-7,by-3,14,5)}
if(phase==='fight'&&fish){var fx=fish.x,fy=waterY+108+Math.sin(t*5)*14;ctx.save();ctx.translate(fx,fy);ctx.scale(-1,1);ctx.font='58px serif';ctx.fillText(fish.rare?'❔':fish.emoji,-30,19);ctx.restore();ctx.strokeStyle='rgba(255,255,255,.5)';ctx.beginPath();ctx.arc(fx+24,fy-20,9+Math.sin(t*4)*3,0,7);ctx.stroke()}
if(phase==='result'&&fish){ctx.font='73px serif';ctx.textAlign='center';ctx.fillText(fish.emoji,580,298);ctx.textAlign='left'}
if(phase==='choose'){ctx.font='bold 23px sans-serif';ctx.fillStyle='white';ctx.textAlign='center';ctx.fillText(boat?'🚤 ボートから キャスト！':'🌊 大海原に キャスト！',580,299);ctx.textAlign='left'}
if(phase==='fight'){var cfg=reelSettings[reelLevel];tension=Math.max(0,tension-delta*cfg.decay);escapeTime+=delta*(cfg.escape+fish.power*.0006);if(tension>80)escapeTime+=delta*.008;renderMeter();checkFight()}
requestAnimationFrame(scene)}
$('reelLevel').onchange=function(){reelLevel=this.value;announce('リールの むずかしさ：'+this.options[this.selectedIndex].text+'。タップして つってみよう！')};
$('boat').onclick=function(){sound();start('boat')};$('offshore').onclick=function(){sound();start('offshore')};$('cast').onclick=cast;$('reel').onclick=reel;$('next').onclick=nextStage;$('home').onclick=home;$('sound').onclick=function(){soundOn=!soundOn;if(soundOn){sound();startMusic()}$('sound').textContent=soundOn?'♪ BGM ON':'♪ BGM OFF'};updateCounts();loadCollection();requestAnimationFrame(scene);
})();
