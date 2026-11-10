/* Story and original-asset bindings. Index is the canonical event order. */
window.CaseComic={};
if(typeof ASSETS!=='undefined'&&!ASSETS.bg_manor_study_before)ASSETS.bg_manor_study_before='assets/scenes/study-before.jpg';
CaseComic.Data={
 pixels:{doctor:'assets/pixels/pixel_doctor_idle.png',victim:'assets/pixels/pixel_victim_idle.png',mechanic:'assets/pixels/pixel_mechanic_idle.png',butler:'assets/pixels/pixel_butler_idle.png',body:'assets/pixels/pixel_victim_body_idle.png'},
 movable:[1,2,4,5,6],pages:[[0,1],[2,3,4],[5,6,7]],
 questions:['争执之后，书房里留下了什么？','灯灭前后，他怎样回到人群？','灯重新亮起以前，那些纸去了哪里？'],
 events:[
 {title:'旧账争执',bg:'bg_manor_study_before',actors:['doctor','victim'],paper:true,line:'旧账即将公开。陆衡与沈崇山在书房发生争执。'},
 {title:'袖扣落地',bg:'bg_manor_study_before',actors:['doctor','victim'],prop:'item_cufflink_clean',detail:'item_fire_poker',line:'袭击与拉扯留下了扭曲的袖扣，扣杆上还缠着袖口纤维。'},
 {title:'携纸离开',bg:'bg_manor_study_before',actors:['doctor'],paper:true,line:'他带走账页，从书房侧门进入服务通道，前往配电间。'},
 {title:'拉下主闸',time:'20:43',bg:'bg_manor_electrical',actors:['doctor'],prop:'item_main_switch',dark:true,line:'主闸被拉下。袭击已发生，黑暗掩护的是他之后的行动。'},
 {title:'藏起外衣',bg:'bg_manor_covered_passage',actors:[],prop:'item_hidden_coat',line:'他在有顶连廊藏下外衣。缺失的袖扣，仍将它与书房联系在一起。'},
 {title:'纸页入火',bg:'bg_manor_lounge_lit',actors:[],prop:'item_burned_ledger',dark:true,line:'他携纸从后门返回，将账页投入壁炉。人影、纸张与灰烬接上了。'},
 {title:'恢复供电',time:'20:49',bg:'bg_manor_electrical',actors:['mechanic'],prop:'item_main_switch',line:'贺川重新合闸，灯光恢复。修复供电与制造断电，是两个动作。'},
 {title:'发现死者',time:'20:51',bg:'bg_manor_study_crime',actors:['butler','body'],line:'周肃推开书房门。发现尸体的时刻，并不是凶案的起点。'}
 ]
};

CaseComic.Data.artworks=[{"event":0,"source":"余烬映着门缝冷光-2.png","path":"assets/comic/embers.webp","focus":"50% 50%","duration":4200},{"event":1,"source":"庄园书房：撕裂的袖口-6.png","path":"assets/comic/struggle.webp","focus":"50% 47%","duration":3800},{"event":2,"source":"医生携账页离开书房-1.png","path":"assets/comic/departure.webp","focus":"27% 48%","duration":4200},{"event":3,"source":"医生拉下旧式总闸-4.png","path":"assets/comic/blackout.webp","focus":"45% 48%","duration":3200},{"event":4,"source":"停电回廊中藏起的外套-3.png","path":"assets/comic/coat.webp","focus":"44% 50%","duration":4400},{"event":5,"source":"壁炉前焚烧账页的医生-7.png","path":"assets/comic/burn.webp","focus":"53% 48%","duration":4800},{"event":6,"source":"机械师扳起电闸，灯光重燃-5.png","path":"assets/comic/power.webp","focus":"42% 48%","duration":3200},{"event":7,"source":"管家惊见倒地主人-8.png","path":"assets/comic/discovery.webp","focus":"50% 52%","duration":6000}];

CaseComic.Data.artworks[0].duration=7670;
CaseComic.Data.artworks[1].duration=9230;
CaseComic.Data.artworks[2].duration=8510;
CaseComic.Data.artworks[3].duration=9110;
CaseComic.Data.artworks[4].duration=8580;
CaseComic.Data.artworks[5].duration=10020;
CaseComic.Data.artworks[6].duration=9810;
CaseComic.Data.artworks[7].duration=12810;