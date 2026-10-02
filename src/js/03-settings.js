/* ============ 2. ДАННЫЕ ============ */
const GROUPS={
  brown:{c:'#9C5A32',n:'Коричневая'}, sky:{c:'#57B8E6',n:'Голубая'},
  pink:{c:'#D93A96',n:'Розовая'}, orange:{c:'#F07818',n:'Оранжевая'},
  red:{c:'#E23B3B',n:'Красная'}, yellow:{c:'#F2C500',n:'Жёлтая'},
  green:{c:'#2AA84F',n:'Зелёная'}, navy:{c:'#2A5CAA',n:'Синяя'},
};
const ST=(name,g,price,rents,hc)=>({t:'street',name,g,price,rents,hc});
const CELLS=[
 {t:'go',name:'СТАРТ'},
 ST('Житная улица','brown',60,[2,10,30,90,160,250],50),
 {t:'chest',name:'Казна'},
 ST('Нагатинская улица','brown',60,[4,20,60,180,320,450],50),
 {t:'tax',name:'Налог',amount:200},
 {t:'rr',name:'Рижская ж/д',price:200},
 ST('1-я Парковая улица','sky',100,[6,30,90,270,400,550],50),
 {t:'chance',name:'Шанс'},
 ST('Полевая улица','sky',100,[6,30,90,270,400,550],50),
 ST('Мясницкая улица','sky',120,[8,40,100,300,450,600],50),
 {t:'jail',name:'Тюрьма'},
 ST('Полянка','pink',140,[10,50,150,450,625,750],100),
 {t:'util',name:'Электростанция',price:150},
 ST('Сретенка','pink',140,[10,50,150,450,625,750],100),
 ST('Ростовская набережная','pink',160,[12,60,180,500,700,900],100),
 {t:'rr',name:'Курская ж/д',price:200},
 ST('Рязанский проспект','orange',180,[14,70,200,550,750,950],100),
 {t:'chest',name:'Казна'},
 ST('Улица Вавилова','orange',180,[14,70,200,550,750,950],100),
 ST('Рублёвское шоссе','orange',200,[16,80,220,600,800,1000],100),
 {t:'parking',name:'Бесплатная парковка'},
 ST('Тверская улица','red',220,[18,90,250,700,875,1050],150),
 {t:'chance',name:'Шанс'},
 ST('Пушкинская улица','red',220,[18,90,250,700,875,1050],150),
 ST('Площадь Маяковского','red',240,[20,100,300,750,925,1100],150),
 {t:'rr',name:'Казанская ж/д',price:200},
 ST('Грузинский Вал','yellow',260,[22,110,330,800,975,1150],150),
 ST('Улица Чайковского','yellow',260,[22,110,330,800,975,1150],150),
 {t:'util',name:'Водопровод',price:150},
 ST('Смоленская площадь','yellow',280,[24,120,360,850,1025,1200],150),
 {t:'gotojail',name:'В тюрьму'},
 ST('Улица Щусева','green',300,[26,130,390,900,1100,1275],200),
 ST('Гоголевский переулок','green',300,[26,130,390,900,1100,1275],200),
 {t:'chest',name:'Казна'},
 ST('Кутузовский проспект','green',320,[28,150,450,1000,1200,1400],200),
 {t:'rr',name:'Ленинградская ж/д',price:200},
 {t:'chance',name:'Шанс'},
 ST('Малая Бронная','navy',350,[35,175,500,1100,1300,1500],200),
 {t:'tax',name:'Сверхналог',amount:100},
 ST('Арбат','navy',400,[50,200,600,1400,1700,2000],200),
];
const GROUP_CELLS={};
CELLS.forEach((c,i)=>{if(c.t==='street'){(GROUP_CELLS[c.g]=GROUP_CELLS[c.g]||[]).push(i);}});
const TOKENS=[{n:'Цилиндр',e:'🎩'},{n:'Авто',e:'🚗'},{n:'Собака',e:'🐶'},{n:'Корабль',e:'⛵'},{n:'Ботинок',e:'👞'},{n:'Кубок',e:'🏆'}];
const COLORS=['#E23B3B','#2A7DE1','#3FA34D','#F2B705','#B44AE0','#FF7A1A'];
const COLOR_NAMES=['Красный','Синий','Зелёный','Жёлтый','Фиолетовый','Оранжевый'];

/* --- Биржа: 4 вымышленные корпорации --- */
const STOCK_CORPS=[
 {key:'tech', name:'ТехТех', color:'#57B8E6', icon:'💠'},
 {key:'steel',name:'СтальПром', color:'#9aa4b8', icon:'🏗'},
 {key:'energy',name:'ЭнергоГрупп', color:'#F2C500', icon:'⚡'},
 {key:'logi', name:'ЛогистикЛайн', color:'#2AA84F', icon:'🚆'},
];
/* --- Карьера: перки и доп. цвета --- */
const CAREER_PERKS=[
 {id:'capital',name:'Стартовый капитал',desc:'Начать с $2000, но ипотека запрещена',cost:3},
 {id:'freestreet',name:'Наследство',desc:'Начать с 1 случайной свободной улицей',cost:5},
 {id:'jailcard',name:'Связи',desc:'+1 карточка выхода из тюрьмы на старте',cost:2},
];
const CAREER_COLORS=[
 {id:'teal',color:'#16A6A6',name:'Бирюзовый',cost:2},
 {id:'lime',color:'#9ACD32',name:'Лаймовый',cost:3},
 {id:'rose',color:'#FF4D8D',name:'Розовый',cost:4},
];

const CHANCE_MASTER=[
 {txt:'Отправляйтесь на СТАРТ и получите зарплату.',fn:async i=>{await moveToCell(i,0,true);}},
 {txt:'Банк выплачивает вам дивиденд $50.',fn:async i=>{G.players[i].money+=50;updHUD();}},
 {txt:'Штраф за превышение скорости — $15.',fn:async i=>payTo(i,15,-1,true)},
 {txt:'Отправляйтесь в тюрьму! Не проходите СТАРТ.',fn:async i=>{sendToJail(i);}},
 {txt:'Карточка: выход из тюрьмы бесплатно.',fn:async i=>{G.players[i].jailCards++;}},
 {txt:'Продвиньтесь до ближайшей железной дороги.',fn:async i=>{const p=G.players[i];let t=(p.pos+1)%40;while(CELLS[t].t!=='rr')t=(t+1)%40;await moveToCell(i,t,true);}},
 {txt:'Ремонт недвижимости: $25 за дом, $100 за отель/спецпостройку.',fn:async i=>{let s=0;ownedCells(i).forEach(x=>{const h=G.houses[x];if(h>=5)s+=100;else s+=h*25;});if(s>0)await payTo(i,s,-1,true);}},
 {txt:'Вы получили наследство — $100.',fn:async i=>{G.players[i].money+=100;updHUD();}},
 {txt:'Вернитесь на 3 клетки назад.',fn:async i=>{const p=G.players[i];p.pos=(p.pos+37)%40;placeTokenInstant(i);await resolveCell(i);}},
 {txt:'Отправляйтесь на Арбат!',fn:async i=>{await moveToCell(i,39,true);}},
];
const CHEST_MASTER=[
 {txt:'Банковская ошибка в вашу пользу: +$200.',fn:async i=>{G.players[i].money+=200;updHUD();}},
 {txt:'Оплата лечения: −$50.',fn:async i=>payTo(i,50,-1,true)},
 {txt:'Продажа акций: +$50.',fn:async i=>{G.players[i].money+=50;updHUD();}},
 {txt:'Карточка: выход из тюрьмы бесплатно.',fn:async i=>{G.players[i].jailCards++;}},
 {txt:'День рождения! Каждый игрок платит вам $10.',fn:async i=>{G.players.forEach((q,j)=>{if(j!==i&&q.alive){q.money-=10;G.players[i].money+=10;}});updHUD();}},
 {txt:'Возврат налога: +$20.',fn:async i=>{G.players[i].money+=20;updHUD();}},
 {txt:'Отправляйтесь в тюрьму!',fn:async i=>{sendToJail(i);}},
 {txt:'Страховая выплата: +$100.',fn:async i=>{G.players[i].money+=100;updHUD();}},
 {txt:'Школьный сбор: −$50.',fn:async i=>payTo(i,50,-1,true)},
 {txt:'Второе место на конкурсе красоты: +$10.',fn:async i=>{G.players[i].money+=10;updHUD();}},
];
const SHADOW_MASTER=[
 {e:'🧾',txt:'Налоговая проверка: заплатите $100 за каждый ваш отель.',fn:async i=>{const n=ownedCells(i).filter(x=>G.houses[x]===5||G.houses[x]===6).length;if(n>0)await payTo(i,100*n,-1,true);else toast('Отелей нет — обошлось');}},
 {e:'💼',txt:'Взятка: заплатите $50 ближайшему впереди идущему игроку и переместитесь на любую свободную клетку в радиусе 3 шагов.',fn:'bribe'},
 {e:'📦',txt:'Контрабанда: получите $200 сейчас. Но если в следующий ход выпадет дубль — отправитесь в тюрьму!',fn:async i=>{G.players[i].money+=200;G.players[i].contraband=true;Snd.coin();updHUD();}},
 {e:'🕶',txt:'Крышевание: каждый соперник платит вам $25.',fn:async i=>{for(const q of G.players){if(q.id!==i&&q.alive){await payTo(q.id,25,i,false);if(!okG(G.id))return;}}}},
 {e:'💳',txt:'Подставной счёт: +$100.',fn:async i=>{G.players[i].money+=100;Snd.coin();updHUD();}},
 {e:'🧯',txt:'Грязные делишки пошли не так: −$75.',fn:async i=>payTo(i,75,-1,true)},
 {e:'🧺',txt:'Отмывание: одна ваша заложенная клетка выкупается бесплатно.',fn:async i=>{const ms=ownedCells(i).filter(x=>G.mortgaged[x]);if(ms.length){ms.sort((a,b)=>CELLS[b].price-CELLS[a].price);G.mortgaged[ms[0]]=false;updateHouseMesh(ms[0]);log('🧺 Бесплатный выкуп: «'+CELLS[ms[0]].name+'»');}else{G.players[i].money+=25;toast('Заложенных нет: +$25');}updHUD();}},
 {e:'🗞',txt:'Инсайдерская информация: богатейший соперник платит вам $50 (или банк).',fn:async i=>{let r=-1,best=-1;G.players.forEach((q,j)=>{if(j!==i&&q.alive&&q.money>best){best=q.money;r=j;}});if(r>=0){await payTo(r,50,i,false);}else{G.players[i].money+=50;updHUD();}}},
];
