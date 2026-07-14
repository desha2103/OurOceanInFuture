import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import "./OceanFutureSimulator.css";

import fish1Src        from "./assets/fish1.png";
import fish2Src        from "./assets/fish2.png";
import deadFishSrc     from "./assets/dead-fish.png";
import healthyCoralSrc from "./assets/healthy-coral.png";
import deadCoralSrc    from "./assets/dead-coral.png";
import plasticSrc      from "./assets/plastic-bottle1.png";
import netSrc          from "./assets/fishing-net.png";
import turtleSrc       from "./assets/turtle.png";
import whaleSrc        from "./assets/whale.png";
import sharkSrc        from "./assets/shark.png";

function rand(a: number, b: number) { return a + Math.random() * (b - a); }
function randInt(a: number, b: number) { return Math.floor(rand(a, b)); }
function loadImg(src: string) { const i = new Image(); i.src = src; return i; }

type Fish    = { id:number; x:number; y:number; spd:number; sz:number; dir:number; wb:number; type:0|1; flee:number; depth:number };
type Bubble  = { id:number; x:number; y:number; sz:number; spd:number; wb:number; alpha:number };
type Plastic = { id:number; x:number; y:number; vx:number; vy:number; rot:number; sc:number; wobble:number };
type Coral   = { id:number; x:number; y:number; color:string; sz:number; grown:number };
type Jelly   = { id:number; x:number; y:number; phase:number; sz:number; col:string; vx:number };
type Special = { type:"turtle"|"whale"|"shark"; x:number; y:number; spd:number; dir:number; sz:number; wb:number; depth:number };
type Particle= { x:number; y:number; vx:number; vy:number; life:number; col:string; sz:number };

const CORAL_COLS = ["#FF6450","#FF9050","#FF50B4","#50C8FF","#FFDC50","#50FFB4","#C850FF","#50FF80"];
const JELLY_COLS = ["#C850FF","#50B4FF","#FF78B4","#78D4FF","#A0FF78","#FFD450"];

// ════════════════════════════════════════════════════════
//  CANVAS
// ════════════════════════════════════════════════════════
function OceanCanvas({ health, pollution, fishing, temperature }: {
  health:number; pollution:number; fishing:number; temperature:number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const S = useRef({
    fish:[]as Fish[], bubbles:[]as Bubble[], plastics:[]as Plastic[],
    corals:[]as Coral[], jellies:[]as Jelly[], specials:[]as Special[],
    particles:[]as Particle[],
    drawn:[]as Coral[], colorIdx:0,
    net:{ x:-400, active:false, spd:2.5, cooldown:0 },
    tick:0, mx:-999, my:-999,
    health:87, pollution:15, fishing:12, temperature:10,
    rafId:0, imgs:{} as Record<string,HTMLImageElement>,
  });

  useEffect(()=>{
    const s=S.current;
    s.imgs={
      fish1:loadImg(fish1Src), fish2:loadImg(fish2Src),
      dead:loadImg(deadFishSrc),
      hcoral:loadImg(healthyCoralSrc), dcoral:loadImg(deadCoralSrc),
      plastic:loadImg(plasticSrc), net:loadImg(netSrc),
      turtle:loadImg(turtleSrc), whale:loadImg(whaleSrc), shark:loadImg(sharkSrc),
    };

    // fish — dir decides image: dir=1 → fish1 faces RIGHT, dir=-1 → fish2 faces LEFT naturally
    s.fish = Array.from({length:22},(_,i)=>({
  id:i, x:rand(-300,1600), y:rand(55,520),
      spd:rand(0.7,2.0), sz:randInt(38,68),
      dir: i%2===0 ? 1 : -1,   // alternating directions
      wb:rand(0,Math.PI*2),
      type:(i%2===0?0:1) as 0|1,  // type0=fish1 (faces right), type1=fish2 (faces left)
      flee:0, depth:rand(0.6,1.0),
    }));

    s.bubbles = Array.from({length:55},(_,i)=>({
  id:i, x:rand(0,1600), y:rand(40,600),
      sz:rand(3,11), spd:rand(0.3,1.0),
      wb:rand(0,Math.PI*2), alpha:rand(0.25,0.65),
    }));

    s.plastics = Array.from({length:90},(_,i)=>({
  id:i, x:rand(0,1600), y:rand(45,550),
      vx:rand(-0.25,0.25), vy:rand(-0.12,0.12),
      rot:rand(0,360), sc:rand(0.35,0.9), wobble:rand(0,Math.PI*2),
    }));

    s.jellies = Array.from({length:8},(_,i)=>({
  id:i, x:rand(100,1500), y:rand(60,420),
      phase:rand(0,Math.PI*2), sz:randInt(24,44),
      col:JELLY_COLS[i%JELLY_COLS.length],
      vx:rand(-0.3,0.3),
    }));

    s.specials=[
      {type:"whale",  x:-250, y:rand(160,300), spd:rand(0.35,0.6), dir:1,  sz:180, wb:0, depth:0.7},
      {type:"turtle", x:rand(100,1400), y:rand(180,400), spd:rand(0.35,0.65),dir:1,sz:100,wb:0,depth:0.75},
      {type:"shark",  x:rand(100,1400), y:rand(180,380), spd:rand(1.1,1.8), dir:-1, sz:130, wb:0, depth:0.8},
      {type:"turtle", x:rand(100,1400), y:rand(300,480), spd:rand(0.3,0.55),dir:-1,sz:85, wb:0, depth:0.65},
    ];

    // bottom coral positions
    s.corals = Array.from({length:14},(_,i)=>({
      id:i, x:(i/(14-1))*1580+10, y:0,
      color:CORAL_COLS[i%CORAL_COLS.length],
      sz:50+randInt(0,30), grown:0,
    }));
  },[]);

  useEffect(()=>{
    const s=S.current;
    s.health=health; s.pollution=pollution;
    s.fishing=fishing; s.temperature=temperature;
  },[health,pollution,fishing,temperature]);

  const onMove = useCallback((e:React.MouseEvent<HTMLCanvasElement>)=>{
    const r=canvasRef.current?.getBoundingClientRect();
    if(!r) return;
    S.current.mx=e.clientX-r.left; S.current.my=e.clientY-r.top;
  },[]);
  const onLeave = useCallback(()=>{ S.current.mx=-999; S.current.my=-999; },[]);
  const onClick = useCallback((e:React.MouseEvent<HTMLCanvasElement>)=>{
    const r=canvasRef.current?.getBoundingClientRect();
    if(!r) return;
    const x=e.clientX-r.left, y=e.clientY-r.top;
    const s=S.current;
    if(y<120) return;
    // spawn particles for visual feedback
    for(let i=0;i<12;i++){
      s.particles.push({x,y,vx:rand(-2,2),vy:rand(-3,-0.5),life:60,col:CORAL_COLS[s.colorIdx%CORAL_COLS.length],sz:rand(3,7)});
    }
    s.drawn.push({id:Date.now(),x,y,color:CORAL_COLS[s.colorIdx%CORAL_COLS.length],sz:randInt(28,50),grown:0});
    s.colorIdx++;
  },[]);

  useEffect(()=>{
    const canvas=canvasRef.current;
    if(!canvas) return;
    const ctx=canvas.getContext("2d")!;

    function lerp(a:number[],b:number[],t:number){ return a.map((v,i)=>Math.round(v+(b[i]-v)*t)); }
    function rgb(c:number[]){ return `rgb(${c[0]},${c[1]},${c[2]})`; }
    function rgba(c:number[],a:number){ return `rgba(${c[0]},${c[1]},${c[2]},${a})`; }

    function drawFrame(){
      const s=S.current;
      s.tick++;
      const tk=s.tick;
      const W=canvas.width, H=canvas.height;
      const h=s.health;

      // ── SKY ──────────────────────────────────────
      const skyH=12;
      const skyG=ctx.createLinearGradient(0,0,0,skyH);
      if(h>=70){skyG.addColorStop(0,"#04101E");skyG.addColorStop(1,"#0A3060");}
      else if(h>=40){skyG.addColorStop(0,"#141420");skyG.addColorStop(1,"#303828");}
      else{skyG.addColorStop(0,"#0A0608");skyG.addColorStop(1,"#281410");}
      ctx.fillStyle=skyG; ctx.fillRect(0,0,W,skyH);

      // sun
      if(h>40){
        const sg=ctx.createRadialGradient(W/2,8,0,W/2,8,220);
        sg.addColorStop(0,`rgba(255,245,160,${h/350})`);
        sg.addColorStop(1,"transparent");
        ctx.fillStyle=sg; ctx.fillRect(0,0,W,skyH);
      }

      // ── WATER ────────────────────────────────────
      const wT=h>=70?[14,90,170]: h>=40?[35,72,80]: [30,22,18];
      const wB=h>=70?[3,18,55]:  h>=40?[12,30,36]: [6,6,6];
      // temperature tint
      const tintStr=Math.max(0,(s.temperature-40)/100);
      const wTa=lerp(wT,[180,60,20],tintStr);
      const wBa=lerp(wB,[90,20,8],tintStr);
      const wG=ctx.createLinearGradient(0,skyH,0,H);
      wG.addColorStop(0,rgb(wTa)); wG.addColorStop(1,rgb(wBa));
      ctx.fillStyle=wG; ctx.fillRect(0,skyH,W,H-skyH);

      // ── WAVE SURFACE ──────────────────────────────
      ctx.beginPath(); ctx.moveTo(0,skyH);
      for(let x=0;x<=W;x+=2){
        const wy=skyH+Math.sin(x*0.014+tk*0.038)*7+Math.sin(x*0.007+tk*0.02)*4;
        ctx.lineTo(x,wy);
      }
      ctx.lineTo(W,0); ctx.lineTo(0,0); ctx.closePath();
      ctx.fillStyle=`rgba(${wTa[0]},${wTa[1]},${wTa[2]},0.45)`; ctx.fill();

      // ── GOD RAYS ─────────────────────────────────
      if(h>18){
        for(let r=0;r<8;r++){
          const rx=W*0.08+r*(W*0.12)+Math.sin(tk*0.011+r*1.3)*28;
          const rw=16+r*5;
          const rG=ctx.createLinearGradient(rx,skyH,rx,H);
          const al=(h/100)*0.075;
          rG.addColorStop(0,`rgba(190,235,255,${al*2})`);
          rG.addColorStop(0.5,`rgba(190,235,255,${al*0.6})`);
          rG.addColorStop(1,"transparent");
          ctx.beginPath();
          ctx.moveTo(rx-rw/2,skyH); ctx.lineTo(rx+rw/2,skyH);
          ctx.lineTo(rx+rw+60,H);   ctx.lineTo(rx-rw-60,H);
          ctx.closePath(); ctx.fillStyle=rG; ctx.fill();
        }
      }

      // ── CAUSTICS (light patterns on floor) ───────
      if(h>50){
        ctx.save(); ctx.globalAlpha=0.06*(h/100);
        for(let c=0;c<12;c++){
          const cx=((c*180+tk*0.4)%W);
          const cy=H-60-Math.sin(tk*0.02+c)*30;
          const cg=ctx.createRadialGradient(cx,cy,0,cx,cy,40+c*5);
          cg.addColorStop(0,"rgba(200,240,255,1)");
          cg.addColorStop(1,"transparent");
          ctx.fillStyle=cg; ctx.beginPath();
          ctx.ellipse(cx,cy,40+c*3,20,0,0,Math.PI*2); ctx.fill();
        }
        ctx.restore();
      }

      // ── PLASTIC BOTTLES ──────────────────────────
      const visP=Math.floor(s.plastics.length*(s.pollution/100));
      const imgP=s.imgs.plastic;
      if(imgP?.complete){
        s.plastics.slice(0,visP).forEach(p=>{
          p.wobble+=0.018;
          p.x=(p.x+p.vx+W)%W;
          p.y=Math.max(skyH+10,Math.min(H-40,p.y+Math.sin(p.wobble)*0.3+p.vy));
          p.rot+=0.25;
          ctx.save();
          ctx.translate(p.x,p.y); ctx.rotate(p.rot*Math.PI/180);
          ctx.globalAlpha=0.72;
          const pw=52*p.sc, ph=30*p.sc;
          ctx.drawImage(imgP,-pw/2,-ph/2,pw,ph);
          ctx.globalAlpha=1; ctx.restore();
        });
      }

      // ── BUBBLES ──────────────────────────────────
      const visB=Math.max(8,Math.floor(s.bubbles.length*(h/100)));
      s.bubbles.slice(0,visB).forEach(b=>{
        b.y-=b.spd; b.wb+=0.032;
        b.x+=Math.sin(b.wb)*0.55;
        if(b.y<skyH+15){b.y=rand(H*0.5,H-40);b.x=rand(0,W);}
        const grad=ctx.createRadialGradient(b.x-b.sz*0.3,b.y-b.sz*0.3,b.sz*0.1,b.x,b.y,b.sz);
        grad.addColorStop(0,`rgba(255,255,255,${b.alpha*0.8})`);
        grad.addColorStop(0.5,`rgba(180,230,255,${b.alpha*0.3})`);
        grad.addColorStop(1,"transparent");
        ctx.beginPath(); ctx.arc(b.x,b.y,b.sz,0,Math.PI*2);
        ctx.fillStyle=grad; ctx.fill();
        ctx.strokeStyle=`rgba(180,230,255,${b.alpha*0.5})`; ctx.lineWidth=1; ctx.stroke();
      });

      // ── BOTTOM CORAL PNG ─────────────────────────
      const imgHC=s.imgs.hcoral, imgDC=s.imgs.dcoral;
      s.corals.forEach((c,i)=>{
        const targetGrow=h/100;
        c.grown+=(targetGrow-c.grown)*0.015;
        const sway=Math.sin(tk*0.018+i*0.6)*4;
        const cw=c.sz+20, ch=(c.sz+30)*c.grown;
        if(ch<2) return;
        ctx.save(); ctx.translate(c.x+sway,H-18);
        const bleach=Math.max(0,(50-h)/50);
        if(imgHC?.complete && c.grown>0.05){
          ctx.globalAlpha=c.grown*(1-bleach*0.9);
          ctx.drawImage(imgHC,-cw/2,-ch,cw,ch);
        }
        if(imgDC?.complete && bleach>0.05){
          ctx.globalAlpha=bleach*c.grown;
          ctx.drawImage(imgDC,-cw/2,-ch,cw,ch);
        }
        ctx.globalAlpha=1; ctx.restore();
      });

      // ── DRAWN CORAL (realistic branching) ────────
      s.drawn.forEach(dc=>{
        if(dc.grown<1) dc.grown=Math.min(1,dc.grown+0.02);
        const col=h<30?"#B0B0A0":dc.color;
        const g=dc.grown;
        ctx.save(); ctx.translate(dc.x,dc.y);
        // main stem with taper
        const stemH=dc.sz*g;
        const stemGrad=ctx.createLinearGradient(0,0,0,-stemH);
        stemGrad.addColorStop(0,col+"CC"); stemGrad.addColorStop(1,col);
        ctx.strokeStyle=stemGrad; ctx.lineWidth=4; ctx.lineCap="round";
        ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(0,-stemH); ctx.stroke();
        // branches at different heights
        const branches=[[0.4,-28,18],[0.55,25,16],[0.7,-22,14],[0.85,20,12]];
        branches.forEach(([frac,angle,len])=>{
          if(g<frac as number) return;
          const branchG=(g-( frac as number))/(1-( frac as number));
          const bLen=( len as number)*branchG;
          const bAngle=(angle as number)*Math.PI/180;
          const by=-stemH*(frac as number);
          ctx.save(); ctx.translate(0,by);
          ctx.beginPath(); ctx.moveTo(0,0);
          ctx.lineTo(Math.sin(bAngle)*bLen,-Math.cos(bAngle)*bLen);
          ctx.strokeStyle=col; ctx.lineWidth=2.5; ctx.stroke();
          // tip circle
          if(branchG>0.7){
            ctx.beginPath();
            ctx.arc(Math.sin(bAngle)*bLen,-Math.cos(bAngle)*bLen,4,0,Math.PI*2);
            ctx.fillStyle=col; ctx.fill();
          }
          ctx.restore();
        });
        // polyp dots on stem
        for(let p=0;p<5;p++){
          const py=-stemH*(p/5)*g;
          const px=Math.sin(tk*0.04+p+dc.id)*6;
          ctx.beginPath(); ctx.arc(px,py,3,0,Math.PI*2);
          ctx.fillStyle=col+"CC"; ctx.fill();
        }
        ctx.restore();
      });

      // ── JELLYFISH ─────────────────────────────────
      if(h>45){
        s.jellies.forEach(j=>{
          j.phase+=0.02; j.vx+=Math.sin(j.phase*0.3)*0.02;
          j.vx=Math.max(-0.5,Math.min(0.5,j.vx));
          j.x+=j.vx; j.y+=Math.sin(j.phase)*0.32;
          j.x=((j.x+W)%W); j.y=Math.max(skyH+20,Math.min(H-130,j.y));
          const pulse=0.82+Math.sin(j.phase*2.8)*0.18;
          ctx.save(); ctx.translate(j.x,j.y);
          // glow
          const glow=ctx.createRadialGradient(0,0,0,0,0,j.sz*1.8);
          glow.addColorStop(0,j.col+"33"); glow.addColorStop(1,"transparent");
          ctx.fillStyle=glow; ctx.beginPath(); ctx.arc(0,0,j.sz*1.8,0,Math.PI*2); ctx.fill();
          // dome
          ctx.beginPath(); ctx.ellipse(0,0,j.sz*pulse,j.sz*0.6*pulse,0,Math.PI,0);
          const dg=ctx.createRadialGradient(0,-j.sz*0.2,j.sz*0.1,0,0,j.sz);
          dg.addColorStop(0,j.col+"EE"); dg.addColorStop(0.6,j.col+"88"); dg.addColorStop(1,j.col+"33");
          ctx.fillStyle=dg; ctx.fill();
          ctx.strokeStyle=j.col+"AA"; ctx.lineWidth=1.5; ctx.stroke();
          // inner structure
          ctx.beginPath(); ctx.ellipse(0,-j.sz*0.1,j.sz*0.4*pulse,j.sz*0.22*pulse,0,Math.PI,0);
          ctx.fillStyle=j.col+"44"; ctx.fill();
          // tentacles
          for(let k=0;k<7;k++){
            const tx=-j.sz*0.9*pulse+(k/6)*j.sz*1.8*pulse;
            const tw1=Math.sin(j.phase*1.4+k*0.8)*12;
            const tw2=Math.sin(j.phase*1.1+k*1.2)*8;
            ctx.beginPath(); ctx.moveTo(tx,0);
            ctx.bezierCurveTo(tx+tw1,j.sz*0.8,tx+tw2,j.sz*1.5,tx+tw1*0.4,j.sz*2.4);
            ctx.strokeStyle=j.col+"55"; ctx.lineWidth=1.5; ctx.stroke();
          }
          ctx.restore();
        });
      }

      // ── FISHING NET ──────────────────────────────
      const n=s.net;
      n.cooldown=Math.max(0,n.cooldown-1);
      if(s.fishing>25 && !n.active && n.cooldown===0){
        n.active=true; n.x=-280; n.spd=2.2+s.fishing/35;
      }
      if(n.active){
        n.x+=n.spd;
        const imgN=s.imgs.net;
        if(imgN?.complete){
          ctx.save(); ctx.globalAlpha=0.82;
          ctx.drawImage(imgN,n.x,skyH+10,160,H-skyH-40);
          ctx.globalAlpha=1; ctx.restore();
        }
        // rope at top
        ctx.beginPath(); ctx.moveTo(n.x+80,skyH+10);
        ctx.lineTo(n.x+80,-10); ctx.strokeStyle="rgba(200,160,80,0.7)"; ctx.lineWidth=3; ctx.stroke();

        // fish flee net
        s.fish.forEach(f=>{
          if(Math.abs(f.x-n.x)<200){ f.flee=90; f.dir=1; }
        });
        if(n.x>W+320){ n.active=false; n.cooldown=Math.max(60,220-Math.floor(s.fishing*1.8)); }
      }

      // ── SPECIAL CREATURES ────────────────────────
      s.specials.forEach(sp=>{
        sp.wb+=0.018;
        sp.x+=sp.dir*sp.spd;
        sp.y+=Math.sin(sp.wb)*0.35;
        sp.y=Math.max(skyH+15,Math.min(H-sp.sz-10,sp.y));
        if(sp.x>W+sp.sz+100){ sp.x=-sp.sz-50; sp.y=rand(skyH+20,H-90); }
        if(sp.x<-sp.sz-200){  sp.x=W+sp.sz+50; sp.y=rand(skyH+20,H-90); }

        const img=s.imgs[sp.type];
        if(!img?.complete) return;
        ctx.save();
        ctx.translate(sp.x,sp.y);
        // depth fade
        ctx.globalAlpha=sp.depth*(h<40?0.45:0.9);
        // flip: whale/turtle face right natively, shark faces left natively
        // so if dir=-1 for whale/turtle → flip; if dir=1 for shark → flip
        const needFlip =
          (sp.type==="shark"  && sp.dir===1) ||
          (sp.type!=="shark"  && sp.dir===-1);
        if(needFlip) ctx.scale(-1,1);
        ctx.drawImage(img,-sp.sz/2,-sp.sz/4,sp.sz,sp.sz/2);
        ctx.globalAlpha=1; ctx.restore();
      });

      // ── FISH (correct direction) ──────────────────
      const visF=Math.max(2,Math.floor(s.fish.length*(h/100)));
      s.fish.slice(0,visF).forEach(f=>{
        f.wb+=0.028;
        // mouse flee
        const dx=f.x-s.mx, dy=f.y-s.my;
        if(Math.hypot(dx,dy)<130){ f.flee=60; f.dir=dx>0?1:-1; }
        if(f.flee>0) f.flee--;
        const spd=f.flee>0 ? Math.min(5.5,f.spd*3.2) : f.spd;
        f.x+=f.dir*spd;
        f.y+=Math.sin(f.wb)*0.42+Math.sin(f.wb*0.3)*0.2;
        f.y=Math.max(skyH+15,Math.min(H-45,f.y));
        if(f.x>W+200){ f.x=-60; f.y=rand(skyH+20,H-60); }
        if(f.x<-200){  f.x=W+60; f.y=rand(skyH+20,H-60); }

        let img: HTMLImageElement;
        if(h<35) img=s.imgs.dead;
        else img = f.type===0 ? s.imgs.fish1 : s.imgs.fish2;
        if(!img?.complete) return;

        ctx.save();
        ctx.translate(f.x,f.y);
        ctx.globalAlpha=f.depth*(h<30?0.5:1);

        if(h<35){
          // dead fish float upside down
          ctx.rotate(Math.PI);
        } else {
          // KEY FIX:
          // fish1.png faces RIGHT  → dir=1 (right) = no flip, dir=-1 (left) = flip
          // fish2.png faces LEFT   → dir=-1 (left) = no flip, dir=1 (right) = flip
          const isFlipped=
            (f.type===0 && f.dir===-1) ||  // fish1 going left → flip
            (f.type===1 && f.dir===1);      // fish2 going right → flip
          if(isFlipped) ctx.scale(-1,1);
        }

        // slight up/down wobble using rotate
        ctx.rotate(Math.sin(f.wb*2)*0.08);
        ctx.drawImage(img,-f.sz/2,-f.sz/4,f.sz,f.sz/2);

        // shadow below fish
        ctx.globalAlpha*=0.3;
        ctx.scale(1,-0.3);
        ctx.drawImage(img,-f.sz/2,-f.sz/4,f.sz,f.sz/2);

        ctx.globalAlpha=1; ctx.restore();
      });

      // ── PARTICLES (coral click feedback) ─────────
      s.particles=s.particles.filter(p=>{
        p.x+=p.vx; p.y+=p.vy; p.vy+=0.08; p.life--;
        if(p.life<=0) return false;
        ctx.beginPath(); ctx.arc(p.x,p.y,p.sz,0,Math.PI*2);
        ctx.fillStyle=p.col+Math.round((p.life/60)*255).toString(16).padStart(2,"0");
        ctx.fill(); return true;
      });

      // ── DEPTH DARKNESS ───────────────────────────
      if(h<65){
        const dk=(65-h)/65;
        const dg=ctx.createLinearGradient(0,H*0.42,0,H);
        dg.addColorStop(0,"transparent"); dg.addColorStop(1,`rgba(0,0,0,${0.8*dk})`);
        ctx.fillStyle=dg; ctx.fillRect(0,H*0.42,W,H);
      }

      // ── FLOOR ────────────────────────────────────
      const fg=ctx.createLinearGradient(0,H-22,0,H);
      fg.addColorStop(0,"#1A1008"); fg.addColorStop(1,"#080604");
      ctx.fillStyle=fg; ctx.fillRect(0,H-22,W,22);

      // ── CENTER MESSAGE ────────────────────────────
      const msgs:[number,number,string,string][]=[
        [85,101,"The Ocean is Alive 🌊","#40DCBE"],
        [70, 85,"The Ocean Needs Care 💙","#4090DC"],
        [55, 70,"Warning Signs Growing ⚠️","#DC9830"],
        [35, 55,"Ocean Under Threat 🔴","#DC5020"],
        [ 0, 35,"CRITICAL — Act Now! ☠️","#DC2020"],
      ];
      for(const [lo,hi,msg,col] of msgs){
        if(h>=lo&&h<hi){
          const al=0.52+Math.sin(tk*0.04)*0.2;
          ctx.save();
          ctx.font="bold 28px Arial";
          ctx.textAlign="center";
          ctx.shadowColor=col; ctx.shadowBlur=22;
          ctx.fillStyle=col+Math.round(al*255).toString(16).padStart(2,"0");
          ctx.fillText(msg,W/2,H/2-20);
          ctx.shadowBlur=0; ctx.restore();
          break;
        }
      }

      // ── NET WARNING ───────────────────────────────
      if(n.active){
        ctx.save(); ctx.font="bold 13px Arial"; ctx.textAlign="center";
        ctx.fillStyle="rgba(255,200,40,0.9)";
        ctx.fillText("⚠ Fishing net sweeping — fish are fleeing!",W/2,skyH+16);
        ctx.restore();
      }

      S.current.rafId=requestAnimationFrame(drawFrame);
    }

    S.current.rafId=requestAnimationFrame(drawFrame);
    return ()=>cancelAnimationFrame(S.current.rafId);
  },[]);

  return (
    <canvas
      ref={canvasRef}
      width={1400} height={620}
      style={{width:"100%",height:"100%",display:"block",cursor:"crosshair"}}
      onMouseMove={onMove} onMouseLeave={onLeave} onClick={onClick}
    />
  );
}

// ══════════════════════════════════════════════════════════
//  LIFECYCLE / ANIMALS / TIPS (unchanged logic)
// ══════════════════════════════════════════════════════════
const LIFECYCLE=[
  {stage:"Stage 1",name:"Coral Polyp",    desc:"A single polyp attaches to rock. Takes 3 years in real life.",threshold:85},
  {stage:"Stage 2",name:"First Fish",     desc:"Small fish return, bringing vital nutrients to new coral.", threshold:70},
  {stage:"Stage 3",name:"Colony Forms",   desc:"A full colony grows, home to hundreds of species.",        threshold:55},
  {stage:"Stage 4",name:"Reef Ecosystem", desc:"25% of all ocean species live here. A complete world.",    threshold:35},
  {stage:"Stage 5",name:"Bleaching Risk", desc:"Warming water causes coral to expel its colour and die.",  threshold:0},
];
const ANIMALS=[
  {name:"Sea Turtle 🐢",threshold:55},{name:"Dolphin 🐬",threshold:40},
  {name:"Shark 🦈",threshold:30},{name:"Octopus 🐙",threshold:45},{name:"Blue Whale 🐋",threshold:25},
];
const TIPS:Record<string,string[]>={
  pollution:  ["♻ Avoid single-use plastic","🛍 Use reusable bags","🚯 Never litter near water"],
  temperature:["💡 Switch to renewable energy","🚲 Cycle instead of driving","🌱 Plant trees"],
  fishing:    ["🐟 Choose sustainable seafood","📋 Check MSC labels","🎣 Support fishing limits"],
};

// ══════════════════════════════════════════════════════════
//  MAIN
// ══════════════════════════════════════════════════════════
type Scenario={status:string;coral:string;fish:string;plastic:string;outlook:string;moodClass:string};

export default function OceanFutureSimulator(){
  const [pollution,   setPollution]   = useState(15);
  const [temperature, setTemperature] = useState(10);
  const [fishing,     setFishing]     = useState(12);
  const [year,        setYear]        = useState(2024);
  const [toast,       setToast]       = useState("");

  const health=useMemo(()=>
    Math.max(0,Math.round(100-pollution*0.45-temperature*0.35-fishing*0.25)),
    [pollution,temperature,fishing]
  );

  useEffect(()=>{
    if(health>90){ setToast("🏆 Challenge Complete! Ocean health above 90%!"); setTimeout(()=>setToast(""),4500); }
  },[health]);

  const scenario:Scenario=useMemo(()=>{
    if(health>=85) return {status:"Healthy",coral:"Colorful and stable",fish:"Thriving population",plastic:"Minimal impact",outlook:"The ocean is healthy and vibrant.",moodClass:"healthy"};
    if(health>=70) return {status:"Mostly Stable",coral:"Mostly healthy",fish:"Stable population",plastic:"Visible pollution",outlook:"Life is active, but protection is needed.",moodClass:"warning"};
    if(health>=40) return {status:"Warning",coral:"Bleaching increasing",fish:"Population decreasing",plastic:"Significant impact",outlook:"Many marine species are struggling.",moodClass:"warning-low"};
    return {status:"Critical",coral:"Dead zones spreading",fish:"Collapse risk",plastic:"Severe pollution",outlook:"The ecosystem is close to collapse.",moodClass:"critical"};
  },[health]);

  const riskLevels=[
    {min:85,max:100,label:"Healthy Ocean",  note:"Ocean systems functioning well."},
    {min:70,max:84, label:"Mostly Stable",  note:"Stable but early warning signs exist."},
    {min:55,max:69, label:"Warning Signs",  note:"Visible stress from pollution or warming."},
    {min:35,max:54, label:"Ocean at Risk",  note:"Marine ecosystems under strong pressure."},
    {min:0, max:34, label:"Critical State", note:"Severe damage and collapse risk."},
  ];

  function handleYear(v:number){
    setYear(v);
    const extra=Math.floor((v-2024)/10);
    setPollution(Math.min(100,15+extra*4));
    setTemperature(Math.min(100,10+extra*5));
    setFishing(Math.min(100,12+extra*3));
  }
  function reset(){ setPollution(15);setTemperature(10);setFishing(12);setYear(2024); }

  const activeTips=[
    ...(pollution>40?TIPS.pollution:[]),
    ...(temperature>40?TIPS.temperature:[]),
    ...(fishing>40?TIPS.fishing:[]),
  ].slice(0,5);

  return(
    <main className={`ocean-page ${scenario.moodClass}`}>
      <div className="water-overlay"/><div className="bubble-layer"/>
      {toast&&<div className="challenge-toast" onClick={()=>setToast("")}>{toast} ×</div>}

      <section className="hero">
        <h1>Ocean in Future</h1>
        <p>An Ocean Future Simulator</p>
        <div className="wave-line">〰</div>
      </section>

      {/* SIDE BY SIDE */}
      <section className="main-layout glass">
        <div className="sliders-col">
          <Slider icon="♻"  title="Plastic Pollution"  desc="Plastic entering the ocean"   v={pollution}   onChange={setPollution}/>
          <Slider icon="🌡" title="Temperature Rise"   desc="Increase in ocean temperature" v={temperature} onChange={setTemperature}/>
          <Slider icon="🐟" title="Overfishing"        desc="Level of overfishing"          v={fishing}     onChange={setFishing}/>
          <Slider icon="📅" title={`Year: ${year}`}    desc="Jump into the future"          v={year} min={2024} max={2100} onChange={handleYear} isYear/>
          <div className="mini-health">
            <div className="mh-label">Ocean Health</div>
            <div className="mh-bar"><div className="mh-fill" style={{width:`${health}%`,background:health>=70?"#27f5ff":health>=40?"#FFB430":"#FF4040"}}/></div>
            <div className="mh-pct" style={{color:health>=70?"#27f5ff":health>=40?"#FFB430":"#FF4040"}}>{health}%</div>
          </div>
          <button className="reset-btn" onClick={reset}>↺ Reset</button>
        </div>

        <div className="canvas-col">
          <section className="animals-panel glass">
        <h2>Marine Life Status</h2>
        <div className="animals-grid">
          {ANIMALS.map(a=>(
            <div key={a.name} className={`animal-card ${health>=a.threshold?"alive":"atrisk"}`}>
              <span className="animal-name">{a.name}</span>
              <span className="animal-status">{health>=a.threshold?"✅ Safe":"⚠️ At Risk"}</span>
              <div className="animal-bar"><div style={{width:`${Math.min(100,(health/a.threshold)*100)}%`}}/></div>
            </div>
          ))}
        </div>
      </section>

          <OceanCanvas health={health} pollution={pollution} fishing={fishing} temperature={temperature}/>
          {year>2024&&<div className="year-badge">🔮 {year-2024} years into the future</div>}
        </div>
      </section>

      {/* RESULT PANEL */}

  <section className="result-panel glass">
  <div className="result-top">
    <div className="health-circle">
      <div
        className="health-ring"
        style={{
          background: `conic-gradient(#27f5ff ${
            health * 3.6
          }deg, rgba(255,255,255,0.1) ${health * 3.6}deg)`,
        }}
      >
        <div className="health-inner">
          <span className="health-title">Ocean Health Index</span>
          <strong>{health}%</strong>
          <em>
            {health >= 85
              ? "Healthy"
              : health >= 70
              ? "Mostly Stable"
              : health >= 55
              ? "Warning Signs"
              : health >= 35
              ? "At Risk"
              : "Critical"}
          </em>
        </div>
      </div>
    </div>

    <div className="ohi-risk-box">
      <h3>OHI-Inspired Score</h3>

      <div className="ohi-scale-list">
        {riskLevels.map((l) => (
          <div
            key={l.label}
            className={`ohi-scale-row ${
              health >= l.min && health <= l.max ? "active" : ""
            }`}
          >
            <span className="range">
              {l.min}–{l.max}%
            </span>
            <div>
              <strong>{l.label}</strong>
              <p>{l.note}</p>
            </div>
          </div>
        ))}
      </div>
    </div>

    <div className="lifecycle-panel">
      <h3 className="lifecycle-title">🪸 Coral Life Cycle</h3>

      {LIFECYCLE.map((lc, i) => {
        const active = health >= lc.threshold;
        const current =
          health >= lc.threshold &&
          (i === 0 || health < LIFECYCLE[i - 1].threshold + 1);

        return (
          <div
            key={lc.stage}
            className={`lifecycle-row ${active ? "lc-active" : "lc-dead"} ${
              current ? "lc-current" : ""
            }`}
          >
            <span>{active ? "🟢" : "🔴"}</span>
            <div>
              <strong>
                {lc.stage}: {lc.name}
              </strong>
              <p>{lc.desc}</p>
            </div>
          </div>
        );
      })}
    </div>

    <div className="scenario-info">
      <h2>Future Ocean Scenario</h2>
      <InfoRow icon="🪸" title="Coral Reef" value={scenario.coral} />
      <InfoRow icon="🐠" title="Fish Population" value={scenario.fish} />
      <InfoRow icon="🧴" title="Plastic" value={scenario.plastic} />
      <InfoRow icon="🌍" title="Outlook" value={scenario.outlook} />
    </div>

    
  </div>
</section>

      

      {activeTips.length>0&&(
        <section className="tips-panel glass">
          <h2>💡 What You Can Do</h2>
          <div className="tips-grid">{activeTips.map(tip=><div key={tip} className="tip-card">{tip}</div>)}</div>
        </section>
      )}

      <section className="ocean-visual glass">
        <h2>How This Impacts Human Life</h2>
        <div className="impact-grid">
          {pollution>70&&<div className="impact-card danger"><h3>Plastic Pollution Crisis</h3><p>Microplastics enter the food chain through fish and sea salt.</p></div>}
          {temperature>60&&<div className="impact-card warning"><h3>Ocean Temperature Rising</h3><p>Warmer oceans trigger more storms and coral death.</p></div>}
          {fishing>50&&<div className="impact-card danger"><h3>Overfishing Crisis</h3><p>Fish populations collapsing causes food shortages worldwide.</p></div>}
          {health<35&&<div className="impact-card critical"><h3>Critical Ecosystem State</h3><p>The ocean is approaching collapse. Marine life is at risk.</p></div>}
          {health>=35&&health<55&&<div className="impact-card danger"><h3>Human Impact Increasing</h3><p>Food security and coastal communities threatened.</p></div>}
          {health>=55&&health<70&&<div className="impact-card warning"><h3>Warning Signs Increasing</h3><p>Immediate action can still prevent serious damage.</p></div>}
          {health>=70&&<div className="impact-card healthy-card"><h3>Hopeful Future 🌱</h3><p>Sustainable actions can protect marine ecosystems.</p></div>}
        </div>
        <p className="bottom-text">Small changes today, big impact tomorrow. The ocean's future is in our hands.</p>
      </section>
    </main>
  );
}

function Slider({icon,title,desc,v,onChange,min=0,max=100,isYear=false}:{icon:string;title:string;desc:string;v:number;onChange:(n:number)=>void;min?:number;max?:number;isYear?:boolean}){
  const level=isYear?"":(v>70?"High":v>35?"Medium":"Low");
  return(
    <div className="slider-row">
      <div className="slider-icon">{icon}</div>
      <div className="slider-main">
        <div className="slider-head">
          <div><h3>{title}</h3><p>{desc}</p></div>
          <div className="slider-value">
            <strong>{isYear?v:`${v}%`}</strong>
            {!isYear&&<span>{level}</span>}
          </div>
        </div>
        <input type="range" min={min} max={max} value={v} onChange={e=>onChange(Number(e.target.value))}/>
      </div>
    </div>
  );
}

function InfoRow({icon,title,value}:{icon:string;title:string;value:string}){
  return(
    <div className="info-row">
      <span>{icon}</span>
      <div><h4>{title}</h4><p>{value}</p></div>
    </div>
  );
}
