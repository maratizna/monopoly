/* ============ 1. ЗВУК (реалистичные эффекты + амбиент) ============ */
const Snd={ctx:null,noiseBuf:null,
  ensure(){
    if(!this.ctx){try{this.ctx=new (window.AudioContext||window.webkitAudioContext)();}catch(e){}}
    if(this.ctx&&this.ctx.state==='suspended'){this.ctx.resume().catch(()=>{});}
    if(this.ctx&&!this.noiseBuf){ // одноразовый буфер белого шума
      const len=this.ctx.sampleRate*1;const b=this.ctx.createBuffer(1,len,this.ctx.sampleRate);const d=b.getChannelData(0);
      for(let i=0;i<len;i++)d[i]=Math.random()*2-1;
      this.noiseBuf=b;
    }
    if(this.ctx)Ambient.ensure(); // амбиент стартует после первого жеста
  },
  // короткий шумовой всплеск через фильтр (основа «реалистичных» звуков)
  _noise(dur,vol,type,freq,q,delay){
    if(SETS.sound===false||!this.ctx||!this.noiseBuf)return;
    try{
      const ctx=this.ctx,t=ctx.currentTime+(delay||0);
      const src=ctx.createBufferSource();src.buffer=this.noiseBuf;
      const f=ctx.createBiquadFilter();f.type=type||'bandpass';f.frequency.value=freq||1200;f.Q.value=q||1;
      const g=ctx.createGain();g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(0.0008,t+dur);
      src.connect(f);f.connect(g);g.connect(ctx.destination);src.start(t);src.stop(t+dur+0.02);
    }catch(e){}
  },
  _tone(f,d,type,v,delay,f2){
    if(SETS.sound===false||!this.ctx)return;
    try{const ctx=this.ctx,t=ctx.currentTime+(delay||0);const o=ctx.createOscillator(),g=ctx.createGain();
      o.type=type||'sine';o.frequency.setValueAtTime(f,t);if(f2)o.frequency.exponentialRampToValueAtTime(f2,t+d);
      g.gain.setValueAtTime(v||.12,t);g.gain.exponentialRampToValueAtTime(0.0008,t+d);
      o.connect(g);g.connect(ctx.destination);o.start(t);o.stop(t+d);}catch(e){}
  },
  click(){this._noise(0.05,0.15,'highpass',2200,0.7);},
  dice(){this.ensure();for(let i=0;i<6;i++)this._noise(0.06,0.18,'bandpass',800+Math.random()*900,1.2,i*0.075);},
  coin(){this._tone(1180,0.09,'sine',0.13,0,1650);this._tone(1650,0.14,'sine',0.1,0.06,2100);this._noise(0.08,0.05,'highpass',4000,1,0.02);},
  build(){this._noise(0.12,0.2,'lowpass',600,0.8);this._tone(160,0.12,'square',0.1,0.02,90);},
  step(){this._noise(0.05,0.08,'lowpass',400,0.9);},
  bad(){this._tone(200,0.25,'sawtooth',0.12,0,90);this._noise(0.25,0.08,'lowpass',300,0.7);},
  win(){[523,659,784,1046,1318].forEach((f,i)=>this._tone(f,0.22,'triangle',0.14,i*0.12));},
};
function vibrate(ms){if(SETS.vibrate===false)return;try{if(navigator.vibrate)navigator.vibrate(ms);}catch(e){}}

/* --- Фоновый амбиент (меняется от Эры), создаётся один раз --- */
const Ambient={started:false,noiseSrc:null,noiseGain:null,filter:null,pad:[],padGain:null,lfo:null,era:null,
  ensure(){
    if(this.started||!Snd.ctx)return;
    const ctx=Snd.ctx;
    try{
      // городская «подложка» — зацикленный фильтрованный шум
      const src=ctx.createBufferSource();src.buffer=Snd.noiseBuf;src.loop=true;
      const filt=ctx.createBiquadFilter();filt.type='lowpass';filt.frequency.value=420;
      const ng=ctx.createGain();ng.gain.value=0;
      src.connect(filt);filt.connect(ng);ng.connect(ctx.destination);src.start();
      this.noiseSrc=src;this.filter=filt;this.noiseGain=ng;
      // тональная подложка (два детонированных осциллятора)
      const pg=ctx.createGain();pg.gain.value=0;pg.connect(ctx.destination);
      const o1=ctx.createOscillator(),o2=ctx.createOscillator();
      o1.type='sine';o2.type='triangle';o1.frequency.value=110;o2.frequency.value=164;
      const lfo=ctx.createOscillator(),lg=ctx.createGain();
      lfo.frequency.value=0.12;lg.gain.value=6;lfo.connect(lg);lg.connect(o2.frequency);lfo.start();
      o1.connect(pg);o2.connect(pg);o1.start();o2.start();
      this.pad=[o1,o2];this.padGain=pg;this.lfo=lfo;
      this.started=true;
      this.apply();
    }catch(e){}
  },
  apply(){
    if(!this.started)return;
    const on=(SETS.sound!==false);
    const vol=on?(SETS.ambientVol==null?0.3:SETS.ambientVol):0;
    const era=(G&&G.custom&&G.custom.eras)?G.era.phase:'stable';
    if(this.era===era&&this._lastVol===vol)return;
    this.era=era;this._lastVol=vol;
    const ctx=Snd.ctx,t=ctx.currentTime;
    let cut=420,ng=0.14,pg=0.06,f1=110,f2=164;
    if(era==='boom'){cut=760;ng=0.2;pg=0.11;f1=147;f2=220;}       // джазовый, светлый
    else if(era==='recession'){cut=230;ng=0.16;pg=0.09;f1=82;f2=110;} // мрачный синтвейв
    else if(era==='inflation'){cut=560;ng=0.18;pg=0.08;f1=98;f2=196;}
    try{
      this.filter.frequency.setTargetAtTime(cut,t,0.4);
      this.noiseGain.gain.setTargetAtTime(vol*ng,t,0.4);
      this.padGain.gain.setTargetAtTime(vol*pg,t,0.4);
      this.pad[0].frequency.setTargetAtTime(f1,t,0.5);
      this.pad[1].frequency.setTargetAtTime(f2,t,0.5);
    }catch(e){}
  }
};
