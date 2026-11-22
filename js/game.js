{
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const rand=(a,b)=>a+Math.random()*(b-a), pick=a=>a[Math.floor(Math.random()*a.length)], clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
function hash(x,z){const s=Math.sin(x*127.1+z*311.7)*43758.5453;return s-Math.floor(s);}
function vnoise(x,z){const xi=Math.floor(x),zi=Math.floor(z),xf=x-xi,zf=z-zi,u=xf*xf*(3-2*xf),v=zf*zf*(3-2*zf);const a=hash(xi,zi),b=hash(xi+1,zi),c=hash(xi,zi+1),d=hash(xi+1,zi+1);return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v;}
function shoreAt(an){return 62+Math.sin(an*3+1)*6+Math.sin(an*7+2)*3+(vnoise(Math.cos(an)*2.5+5,Math.sin(an)*2.5+5)-.5)*12;}
function landDist(x,z){return shoreAt(Math.atan2(z,x))-Math.hypot(x,z);}
function rng(seed){let s=(seed>>>0)||1;return()=>{s^=s<<13;s^=s>>>17;s^=s<<5;return((s>>>0)%100000)/100000;};}

/* ---------- renderer & scene ---------- */
const canvas=$('#c');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,preserveDrawingBuffer:true});
const LOW=matchMedia('(pointer:coarse)').matches||(navigator.hardwareConcurrency||8)<=4;
renderer.setPixelRatio(Math.min(devicePixelRatio,LOW?1.5:2));
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
const scene=new THREE.Scene();
scene.fog=new THREE.Fog('#a8d8ea',140,330);
const camera=new THREE.PerspectiveCamera(40,1,.5,900);
const hemi=new THREE.HemisphereLight('#dff1ff','#7a6a4a',.55);scene.add(hemi);
const sun=new THREE.DirectionalLight('#fff3dc',1);sun.castShadow=true;
sun.shadow.mapSize.set(LOW?1024:2048,LOW?1024:2048);Object.assign(sun.shadow.camera,{left:-70,right:70,top:70,bottom:-70,near:1,far:300});sun.shadow.bias=-.0006;
scene.add(sun);scene.add(sun.target);
function resize(){const w=canvas.clientWidth||innerWidth,h=canvas.clientHeight||innerHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.fov=camera.aspect<1?56:40;camera.updateProjectionMatrix();}
addEventListener('resize',resize);resize();try{new ResizeObserver(()=>resize()).observe(canvas);}catch(e){}

/* ---------- voxel geometry ---------- */
const FACES=[[[1,0,0],[[1,0,1],[1,0,0],[1,1,0],[1,1,1]]],[[-1,0,0],[[0,0,0],[0,0,1],[0,1,1],[0,1,0]]],[[0,1,0],[[0,1,1],[1,1,1],[1,1,0],[0,1,0]]],[[0,-1,0],[[0,0,0],[1,0,0],[1,0,1],[0,0,1]]],[[0,0,1],[[0,0,1],[1,0,1],[1,1,1],[0,1,1]]],[[0,0,-1],[[1,0,0],[0,0,0],[0,1,0],[1,1,0]]]];
class Vox{constructor(){this.b=[];this.g=[];this.ox=0;this.oy=0;this.oz=0;}
  box(x,y,z,w,h,d,col,glow){const c=new THREE.Color(col);const j=1+(Math.random()-.5)*.07;c.r*=j;c.g*=j;c.b*=j;(glow?this.g:this.b).push([this.ox+x-w/2,this.oy+y,this.oz+z-d/2,w,h,d,c]);}
  at(x,z,fn,y=0){const a=this.ox,b=this.oy,c=this.oz;this.ox+=x;this.oy+=y;this.oz+=z;fn();this.ox=a;this.oy=b;this.oz=c;}}
function toGeo(list){const n=list.length*36,P=new Float32Array(n*3),N=new Float32Array(n*3),C=new Float32Array(n*3);let k=0;
  for(const [x,y,z,w,h,d,c] of list)for(const [nn,cs] of FACES)for(const i of [0,1,2,0,2,3]){const q=cs[i];P[k*3]=x+q[0]*w;P[k*3+1]=y+q[1]*h;P[k*3+2]=z+q[2]*d;N[k*3]=nn[0];N[k*3+1]=nn[1];N[k*3+2]=nn[2];C[k*3]=c.r;C[k*3+1]=c.g;C[k*3+2]=c.b;k++;}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(P,3));g.setAttribute('normal',new THREE.BufferAttribute(N,3));g.setAttribute('color',new THREE.BufferAttribute(C,3));return g;}
const matBody=new THREE.MeshLambertMaterial({vertexColors:true});
const matGlow=new THREE.MeshLambertMaterial({vertexColors:true,emissive:new THREE.Color('#ffb24d'),emissiveIntensity:0});
const haloMat=new THREE.SpriteMaterial({map:(()=>{const c=document.createElement('canvas');c.width=c.height=64;const g=c.getContext('2d');const r=g.createRadialGradient(32,32,0,32,32,32);r.addColorStop(0,'rgba(255,214,140,1)');r.addColorStop(.35,'rgba(255,190,100,.45)');r.addColorStop(1,'rgba(255,170,80,0)');g.fillStyle=r;g.fillRect(0,0,64,64);return new THREE.CanvasTexture(c);})(),blending:THREE.AdditiveBlending,depthWrite:false,transparent:true,opacity:0});
const ghostMat=new THREE.MeshLambertMaterial({vertexColors:true,transparent:true,opacity:.62,depthWrite:false,emissive:new THREE.Color('#1f6b33')});

/* ---------- palette ---------- */
const C={stone:'#d3c8b0',stone2:'#a99f8a',trim:'#f1ead8',win:'#2b3550',door:'#6b3f26',wood:'#8a5a36',wood2:'#6e4428',lamp:'#ffd98a',dark:'#33393d'};
const ROOFS=['#b9532f','#c8663a','#a8472a'],SHUT=['#2f7a78','#3d74a8','#5a8a46','#8e3b3b','#2f5d50'],LEAF=['#6f9b4f','#7fab5a','#5f8c46'],OLIVE=['#8aa36c','#7c9660','#9bb27c'],FLOW=['#e85d75','#f2c14e','#f7f3e8','#b07cd8','#ff8a5b'];
const WALLS=['#efe2c4','#e8b86b','#e8907a','#d9825e','#9cc7d8','#a9d2b4','#e9a9b2','#f3efe6','#f0cf6a','#c4b3dc'];
function shade(hex,k){const c=new THREE.Color(hex);c.offsetHSL(0,0,k);return '#'+c.getHexString();}

/* ---------- models ---------- */
function house(v,R,o){const {w,d,fl}=o,fh=2.1,wall=o.wall,sh=pick2(R,SHUT),roof=pick2(R,ROOFS);
  v.box(0,0,0,w+.3,.35,d+.3,C.stone);v.box(0,.35,0,w,fl*fh,d,wall);
  for(let f=1;f<fl;f++)v.box(0,.35+f*fh-.08,0,w+.14,.16,d+.14,C.trim);
  const row=(f,len,ax,side)=>{const n=Math.max(1,Math.floor((len-.4)/1.45)),st=len/n;
    for(let k=0;k<n;k++){const p=-len/2+st*(k+.5),y=.35+f*fh+.62;
      if(f===0&&ax==='x'&&side>0&&k===Math.floor(n/2)&&o.door!==false){v.box(p,.35,d/2+.04,.85,1.55,.12,C.door);v.box(p,1.9,d/2+.05,1.05,.15,.16,C.trim);v.box(p,1.62,d/2+.06,.5,.2,.08,C.lamp,1);continue;}
      if(ax==='x'){const z=side*(d/2+.04);v.box(p,y,z,.6,.85,.1,C.win,1);v.box(p-.44,y-.02,z+side*.03,.22,.9,.08,sh);v.box(p+.44,y-.02,z+side*.03,.22,.9,.08,sh);v.box(p,y-.12,z+side*.05,.8,.1,.16,C.trim);
        if(R()<.3){v.box(p,y-.3,z+side*.14,.7,.16,.22,C.wood2);for(let q=0;q<3;q++)v.box(p-.22+q*.22,y-.16,z+side*.14,.15,.15,.15,pick2(R,FLOW));}}
      else{const x=side*(w/2+.04);v.box(x,y,p,.1,.85,.6,C.win,1);v.box(x+side*.03,y-.02,p-.44,.08,.9,.22,sh);v.box(x+side*.03,y-.02,p+.44,.08,.9,.22,sh);}}};
  for(let f=0;f<fl;f++){row(f,w,'x',1);row(f,w,'x',-1);row(f,d,'z',1);row(f,d,'z',-1);}
  if(o.balcony){const y=.35+fh-.05;v.box(0,y,d/2+.4,w*.55,.12,.8,C.trim);v.box(0,y+.12,d/2+.75,w*.55,.5,.08,C.dark);}
  let y=.35+fl*fh;v.box(0,y,0,w+.5,.18,d+.5,C.trim);y+=.18;let rw=w+.4,rd=d+.4,i=0;
  while(rd>.5&&rw>.5&&i<14){v.box(0,y,0,rw,.4,rd,i%2?roof:shade(roof,-.05));y+=.4;rd-=.85;if(o.hip)rw-=.85;i++;}
  if(o.chim)v.box(w*.28,.35+fl*fh,-d*.18,.5,i*.4+.9,.5,C.stone);
  return y;}
function pick2(R,a){return a[Math.floor(R()*a.length)];}
function tree(v,R,kind){const t=kind||(R()<.5?'olive':'pine');
  if(t==='olive'){v.box(0,0,0,.4,1.3,.4,C.wood2);for(let i=0;i<4;i++)v.box(rand(-.5,.5),1.1+R()*.5,rand(-.5,.5),1.4+R()*.5,.9,1.4+R()*.5,pick2(R,OLIVE));}
  else if(t==='pine'){v.box(0,0,0,.45,2.6,.45,C.wood2);v.box(0,2.4,0,3.2,.8,3.2,'#4d7a43');v.box(0,3.1,0,2.2,.6,2.2,'#5a8a4d');}
  else{v.box(0,0,0,.35,.6,.35,C.wood2);let w=1.2;for(let y=.5;y<4.6;y+=.55){v.box(0,y,0,w,.6,w,'#3f6b3a');w=Math.max(.35,w-.12);}}}
const MODELS={
  casa:(v,R,c)=>house(v,R,{w:2.8+R()*.8,d:2.8+R()*.5,fl:1,wall:c,hip:R()<.5,chim:R()<.6}),
  sobrado:(v,R,c)=>house(v,R,{w:3.8+R()*.6,d:3.4,fl:2,wall:c,hip:R()<.5,chim:R()<.5,balcony:true}),
  vila:(v,R,c)=>{const w=6.2,d=5;house(v,R,{w,d,fl:3,wall:c,hip:true,balcony:true});const dome=R()<.5?'#6a8fb0':'#6f9c8a';
    for(const sx of [-1,1])v.at(sx*w/2,d/2-.6,()=>{const H=.35+3*2.1+1.2;v.box(0,0,0,1.8,H,1.8,c);for(let f=0;f<3;f++)v.box(0,.35+f*2.1+.6,.92,.5,.8,.08,C.win,1);let s=2.1,y=H;for(let i=0;i<5;i++){v.box(0,y,0,s,.35,s,dome);y+=.35;s-=.42;}v.box(0,y,0,.12,.6,.12,C.dark);});},
  fazenda:(v,R)=>{v.box(-1.4,0,0,5.4,.22,7,'#7a5a3a');for(let x=-3.6;x<=.9;x+=.9)v.box(x,.22,0,.55,.45+R()*.15,6.4,R()<.5?'#d9b44a':'#7aa346');
    v.at(2.6,-1.6,()=>house(v,R,{w:2.6,d:2.6,fl:1,wall:'#d9825e',hip:false}));v.at(2.6,1.9,()=>{v.box(0,0,0,1.6,.9,1.4,'#e3c35e');v.box(0,.9,0,1,.5,.9,'#d9b44a');});
    for(let z=-3.4;z<=3.4;z+=1.7){v.box(-4.3,0,z,.15,.8,.15,C.wood);}v.box(-4.3,.55,0,.08,.1,7,C.wood);},
  serraria:(v,R)=>{v.box(0,0,0,5,.2,4,'#8a7a5c');for(const [x,z] of [[-2.2,-1.7],[2.2,-1.7],[-2.2,1.7],[2.2,1.7]])v.box(x,.2,z,.3,2.6,.3,C.wood2);
    v.box(0,2.8,-.9,5.2,.25,2.2,ROOFS[0]);v.box(0,2.6,.9,5.2,.25,2.2,shade(ROOFS[0],-.05));
    for(let i=0;i<3;i++)for(let j=0;j<3-i;j++)v.box(-1+j*.62+i*.31,.2+i*.5,-.6,.5,.5,3,j%2?'#9b6a40':C.wood);v.box(1.5,.2,.6,1.2,.9,1.6,C.wood2);v.box(1.5,1.1,.6,.08,.7,.7,'#c9cfd2');},
  moinho:(v,R,c,ex)=>{let s=3.2;for(let y=0;y<6;y+=.6){v.box(0,y,0,s,.6,s,'#f2ede0');s-=.1;}v.box(0,0,1.3,.9,1.5,.2,C.door);v.box(0,3,1.12,.5,.7,.1,C.win,1);
    let r=2.8;for(let y=6;y<8;y+=.4){v.box(0,y,0,r,.4,r,ROOFS[1]);r-=.55;}
    const s2=new Vox();s2.box(0,-3.3,0,.25,6.6,.15,C.wood);s2.box(0,-.12,0,6.6,.25,.15,C.wood);for(const [x,y,w,h] of [[.55,1.6,.8,2.6],[-.55,-4.2,.8,2.6],[1.6,-.7,2.6,.8],[-4.2,.1,2.6,.8]])s2.box(x,y,0,w,h,.08,'#f3ead2');
    ex.spin=s2;ex.spinPos=[0,6.1,1.75];},
  oficina:(v,R,c)=>{const d=3.4;house(v,R,{w:4,d,fl:1,wall:c,hip:false,chim:true});for(let i=0;i<6;i++)v.box(-1.5+i*.6,2,d/2+.7,.6,.12,1.4,i%2?'#d9534f':'#f3efe6');v.box(-1.5,2,d/2+1.35,.1,-2,.1,C.wood);
    for(let i=0;i<3;i++)v.box(1.4-i*.7,.35,d/2+1,.6,.6,.6,C.wood);},
  cais:(v,R)=>{v.box(0,-.2,3,3,.25,9,C.wood);for(let z=-1;z<=7.5;z+=2.1)for(const x of [-1.4,1.4])v.box(x,-1.6,z,.3,1.7,.3,C.wood2);
    v.at(0,-2.6,()=>house(v,R,{w:3.6,d:2.6,fl:1,wall:'#efe2c4',hip:false}));for(let i=0;i<4;i++)v.box(-.8+(i%2)*.7,.05+Math.floor(i/2)*.6,4+i*.3,.6,.6,.6,i%2?C.wood:'#b58a5a');
    v.at(2.8,5,()=>{v.box(0,-.5,0,1.4,.6,3.6,'#3d74a8');v.box(0,.1,0,1.6,.12,3.8,C.trim);v.box(0,.2,0,.1,2.6,.1,C.wood2);v.box(.3,.9,.2,.05,1.4,1.4,'#f3ead2');});},
  poco:(v,R)=>{v.box(0,0,0,1.9,.8,1.9,C.stone);v.box(0,.8,0,1.5,.05,1.5,'#2f6b80');for(const x of [-.75,.75])v.box(x,.8,0,.18,1.5,.18,C.wood2);v.box(0,2.3,0,2.2,.2,1.2,ROOFS[0]);v.box(0,2.5,0,1.4,.2,.8,ROOFS[1]);v.box(.3,1.2,.2,.3,.35,.3,C.wood);},
  mercado:(v,R)=>{v.box(0,0,0,6.5,.12,5.5,'#d8cbb0');const aw=[['#d9534f','#f3efe6'],['#3d74a8','#f3efe6'],['#5a8a46','#f0cf6a']];
    [[-2,-1.2],[2,-1.2],[0,1.4]].forEach(([x,z],i)=>v.at(x,z,()=>{v.box(0,.12,0,1.8,.8,1,C.wood);for(const px of [-.85,.85])v.box(px,.12,-.45,.12,2,.12,C.wood2);for(let k=0;k<5;k++)v.box(-.8+k*.4,2.1,0,.4,.12,1.6,aw[i][k%2]);
      for(let k=0;k<4;k++)v.box(-.6+k*.4,.92,.1,.3,.25,.3,pick2(R,['#e85d3a','#f2c14e','#7aa346','#c0392b','#e8b86b']));}));},
  capela:(v,R)=>{house(v,R,{w:3.6,d:6.2,fl:2,wall:'#f3efe6',hip:false});v.at(-1.3,2.4,()=>{v.box(0,0,0,1.7,8.2,1.7,'#efe2c4');v.box(0,6.6,.86,.6,.9,.08,C.dark);let s=2,y=8.2;for(let i=0;i<5;i++){v.box(0,y,0,s,.4,s,ROOFS[0]);y+=.4;s-=.4;}v.box(0,y,0,.1,.8,.1,C.dark);v.box(0,y+.45,0,.45,.1,.1,C.dark);});},
  escola:(v,R)=>{house(v,R,{w:5,d:3.6,fl:2,wall:'#efe2c4',hip:true});v.box(0,3.3,1.85,.8,.8,.08,C.trim);v.at(3,2.2,()=>{v.box(0,0,0,.1,5,.1,C.dark);v.box(.45,4.2,0,.8,.55,.05,'#2f7a78');});},
  cafe:(v,R,c)=>{house(v,R,{w:3.4,d:3.2,fl:2,wall:c,hip:false});v.box(0,0,2.9,4,.1,2.4,'#d8cbb0');for(const x of [-1,1])v.at(x,2.9,()=>{v.box(0,.1,0,.6,.7,.6,C.trim);v.box(0,.8,0,.08,1.3,.08,C.dark);v.box(0,2.1,0,1.6,.12,1.6,x<0?'#d9534f':'#2f7a78');v.box(0,2.2,0,1,.1,1,x<0?'#d9534f':'#2f7a78');});},
  praca:(v,R)=>{for(let x=-4;x<=4;x++)for(let z=-4;z<=4;z++)if(Math.hypot(x,z)<4.4)v.box(x,0,z,1,.1,1,(x+z)%2?'#d8cbb0':'#cbbd9f');
    for(let i=0;i<10;i++){const a=i/10*Math.PI*2;v.box(Math.cos(a)*1.6,.1,Math.sin(a)*1.6,.9,.55,.9,C.stone);}v.box(0,.1,0,2.6,.45,2.6,'#5ec3d8');v.box(0,.1,0,.5,1.6,.5,C.stone);v.box(0,1.7,0,1.2,.2,1.2,C.stone);v.box(0,1.9,0,.5,.4,.5,'#7fd3e6');
    for(const [x,z] of [[3,3],[-3,3],[3,-3],[-3,-3]])v.at(x,z,()=>tree(v,R,'olive'));},
  teatro:(v,R)=>{const w=8,d=6;house(v,R,{w,d,fl:3,wall:'#efe2c4',hip:true,door:false});for(let i=0;i<6;i++)v.box(-3.2+i*1.28,.35,d/2+.9,.5,6.3,.5,'#f7f2e6');v.box(0,6.65,d/2+.9,w+.2,.4,1.2,C.trim);
    let pw=w;for(let y=7.05;pw>1;y+=.35){v.box(0,y,d/2+.9,pw,.35,1,'#f1ead8');pw-=1.3;}v.box(0,0,d/2+1.8,w,.2,1.2,C.stone);v.box(0,.35,d/2+.05,1.6,2.4,.1,C.door);v.box(0,3,d/2+1.52,2.4,.6,.08,'#8e3b3b');},
  oliveira:(v,R)=>tree(v,R,'olive'),
  cipreste:(v,R)=>tree(v,R,'cypress'),
  arbusto:(v,R)=>{for(let i=0;i<3;i++)v.box(rand(-.3,.3),0,rand(-.3,.3),.8+R()*.4,.6+R()*.3,.8+R()*.4,pick2(R,LEAF));for(let i=0;i<3;i++)v.box(rand(-.4,.4),.7,rand(-.4,.4),.15,.15,.15,pick2(R,FLOW));},
  flores:(v,R)=>{v.box(0,0,0,1.7,.3,1.1,C.stone);v.box(0,.3,0,1.5,.05,.9,'#6b4a2f');const fc=pick2(R,FLOW);for(let i=0;i<9;i++){const x=-.55+(i%3)*.55,z=-.28+Math.floor(i/3)*.28;v.box(x,.35,z,.2,.25,.2,LEAF[1]);v.box(x,.6,z,.22,.18,.22,R()<.7?fc:pick2(R,FLOW));}},
  poste:(v)=>{v.box(0,0,0,.35,.3,.35,C.dark);v.box(0,.3,0,.14,2.8,.14,C.dark);v.box(0,3.1,0,.45,.5,.45,C.lamp,1);v.box(0,3.6,0,.55,.12,.55,C.dark);},
  banco:(v)=>{for(const x of [-.6,.6])v.box(x,0,0,.12,.45,.45,C.dark);v.box(0,.45,0,1.6,.1,.5,C.wood);v.box(0,.55,-.22,1.6,.45,.08,C.wood);},
};

/* ---------- catalog ---------- */
const B={
  casa:{n:'Casinha',cat:'mor',cost:{m:30,w:10},r:2.3,cap:4,tier:0,paint:1,d:'Lar de camponeses. Precisa de água e comida.'},
  sobrado:{n:'Sobrado',cat:'mor',cost:{m:80,w:25},r:2.8,cap:8,tier:1,paint:1,req:'alvenaria',d:'Artesãos. Pedem também mercado e capela.'},
  vila:{n:'Casa burguesa',cat:'mor',cost:{m:220,w:60},r:4.4,cap:12,tier:2,paint:1,req:'arquitetura',d:'Burguesia. Exigente, mas paga muito imposto.'},
  fazenda:{n:'Fazenda',cat:'trab',cost:{m:50,w:15},r:4.6,jobs:4,d:'Produz comida.'},
  serraria:{n:'Serraria',cat:'trab',cost:{m:40},r:3.2,jobs:3,d:'Produz madeira.'},
  moinho:{n:'Moinho',cat:'trab',cost:{m:90,w:30},r:2.2,jobs:2,req:'moagem',rad:18,d:'Fazendas num raio de 18 produzem +50%.'},
  oficina:{n:'Oficina de artesão',cat:'trab',cost:{m:100,w:30},r:3,jobs:4,paint:1,req:'oficios',d:'Produz mercadorias.'},
  cais:{n:'Cais do porto',cat:'trab',cost:{m:160,w:60},r:3.4,jobs:4,req:'comercio',coast:1,d:'Na costa. Vende mercadorias por moedas.'},
  poco:{n:'Poço',cat:'com',cost:{m:20,w:5},r:1.3,rad:14,serv:'agua',d:'Água para casas num raio de 14.'},
  mercado:{n:'Mercado',cat:'com',cost:{m:60,w:20},r:3.4,rad:22,serv:'mercado',jobs:2,d:'Atende casas num raio de 22.'},
  capela:{n:'Capela',cat:'com',cost:{m:120,w:40},r:3.4,rad:28,serv:'capela',req:'alvenaria',d:'Atende casas num raio de 28.'},
  escola:{n:'Escola',cat:'com',cost:{m:100,w:30},r:3,jobs:2,d:'Gera pontos de pesquisa.'},
  cafe:{n:'Café',cat:'com',cost:{m:110,w:25},r:3,rad:18,serv:'cafe',jobs:2,paint:1,req:'oficios',d:'Atende casas num raio de 18.'},
  praca:{n:'Praça com fonte',cat:'com',cost:{m:90},r:4.3,rad:24,serv:'praca',beauty:5,req:'paisagismo',d:'Bonita e muito querida.'},
  teatro:{n:'Teatro',cat:'com',cost:{m:300,w:80},r:5,rad:32,serv:'teatro',jobs:4,req:'arquitetura',d:'Atende casas num raio de 32.'},
  oliveira:{n:'Oliveira',cat:'dec',cost:{m:3},r:.9,beauty:1.2},
  cipreste:{n:'Cipreste',cat:'dec',cost:{m:4},r:.6,beauty:1.2,req:'paisagismo'},
  arbusto:{n:'Arbusto florido',cat:'dec',cost:{m:2},r:.6,beauty:.7},
  flores:{n:'Canteiro de flores',cat:'dec',cost:{m:4},r:.9,beauty:1.6},
  poste:{n:'Poste de luz',cat:'dec',cost:{m:6},r:.35,beauty:.8},
  banco:{n:'Banco',cat:'dec',cost:{m:5},r:.8,beauty:.6},
};
const TIERS=['Camponeses','Artesãos','Burguesia'],TAX=[.06,.13,.32];
const NEEDS=[['agua','comida'],['agua','comida','mercado','capela'],['agua','comida','mercado','capela','cafe','teatro']];
const NEEDN={agua:'Água (poço)',comida:'Comida',mercado:'Mercado',capela:'Capela',cafe:'Café',teatro:'Teatro'};
const RS={
  alvenaria:{n:'Alvenaria',cost:25,req:[],d:'Libera Sobrado e Capela.'},
  paisagismo:{n:'Paisagismo',cost:20,req:[],d:'Libera Praça com fonte e Cipreste.'},
  moagem:{n:'Moagem',cost:40,req:['alvenaria'],d:'Libera o Moinho.'},
  oficios:{n:'Ofícios',cost:60,req:['alvenaria'],d:'Libera Oficina de artesão e Café.'},
  comercio:{n:'Comércio marítimo',cost:90,req:['oficios'],d:'Libera o Cais do porto.'},
  arquitetura:{n:'Arquitetura',cost:130,req:['oficios','paisagismo'],d:'Libera Casa burguesa e Teatro.'},
  turismo:{n:'Turismo',cost:180,req:['comercio','arquitetura'],d:'Cais, praças e teatros atraem visitantes que gastam moedas.'},
};
const FAM=['Moretti','Russo','Bianchi','Costa','Ferreira','Lopes','Marino','Greco','Conti','Ricci','Santos','Rocha','Vidal','Navarro','Serra','Lombardi','Esposito','Duarte','Pires','Mancini','Galli','Barros','Coelho','Caruso','Fontana','Leone','Valente','Amato','Sardo','Morais'];
const FIRST=['Giulia','Marco','Inês','Tomás','Lucia','Pietro','Clara','Rafael','Sofia','Matteo','Beatriz','Elena','Dona Rosa','Seu Aldo'];

/* ---------- terrain ---------- */
const waterU={value:0};
const waterMat=new THREE.MeshPhongMaterial({color:'#4fb3c8',transparent:true,opacity:.88,flatShading:true,shininess:70,specular:new THREE.Color('#cfeff5')});
waterMat.onBeforeCompile=sh=>{sh.uniforms.uTime=waterU;sh.vertexShader='uniform float uTime;\n'+sh.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nfloat wv=sin(position.x*.33+uTime*1.1)*.13+cos(position.y*.27+uTime*.8)*.11+sin((position.x+position.y)*.55+uTime*1.7)*.05;transformed.z+=wv;');};
const water=new THREE.Mesh(new THREE.PlaneGeometry(700,700,LOW?90:140,LOW?90:140),waterMat);
water.rotation.x=-Math.PI/2;water.position.y=-.3;scene.add(water);
{const tiles=[];for(let x=-86;x<86;x+=2)for(let z=-86;z<86;z+=2){const cx=x+1,cz=z+1,ld=landDist(cx,cz);if(ld<-22)continue;let y,col;const n=vnoise(cx*.08,cz*.08),n2=hash(cx,cz);
    if(ld>2.5){y=0;col=new THREE.Color(n>.62?'#a9ae5c':n>.4?'#86b357':'#74a24c');col.offsetHSL(0,0,(n2-.5)*.04);}
    else if(ld>-1.5){y=-.12;col=new THREE.Color('#e6d3a0');col.offsetHSL(0,0,(n2-.5)*.04);}
    else{y=-1.2+clamp(ld/22,-1,0)*1.6;col=new THREE.Color('#c9b27f');}
    tiles.push([cx,y,cz,col]);}
  const im=new THREE.InstancedMesh(new THREE.BoxGeometry(2,1,2),new THREE.MeshLambertMaterial({color:'#fff'}),tiles.length);const m=new THREE.Matrix4();
  tiles.forEach((t,i)=>{m.makeTranslation(t[0],t[1]-.5,t[2]);im.setMatrixAt(i,m);im.setColorAt(i,t[3]);});im.receiveShadow=true;scene.add(im);}
/* wild trees */
const wild=[];const wildMesh={};
{const kinds=['olive','pine','cypress'];const pos={olive:[],pine:[],cypress:[]};
  for(let i=0;i<900&&wild.length<330;i++){const x=rand(-70,70),z=rand(-70,70),ld=landDist(x,z);if(ld<3||Math.hypot(x,z)<16)continue;if(vnoise(x*.06+9,z*.06+3)<.48)continue;const k=ld<8?'pine':pick(kinds);pos[k].push([x,z]);}
  for(const k of kinds){const v=new Vox();tree(v,rng(3),k);const im=new THREE.InstancedMesh(toGeo(v.b),matBody,pos[k].length);im.castShadow=im.receiveShadow=true;const m=new THREE.Matrix4();
    pos[k].forEach(([x,z],i)=>{const s=.8+Math.random()*.5;m.compose(new THREE.Vector3(x,0,z),new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),Math.random()*6),new THREE.Vector3(s,s,s));im.setMatrixAt(i,m);wild.push({x,z,k,i,alive:true});});
    wildMesh[k]=im;scene.add(im);}}
function clearWild(x,z,r){let n=0;const m=new THREE.Matrix4().makeScale(0,0,0);for(const t of wild)if(t.alive&&Math.hypot(t.x-x,t.z-z)<r+.6){t.alive=false;wildMesh[t.k].setMatrixAt(t.i,m);wildMesh[t.k].instanceMatrix.needsUpdate=true;n++;}return n;}

/* ---------- state ---------- */
let cityName='';try{cityName=localStorage.getItem('ps-city')||'';}catch(e){}
let rev=0,savedRev=-1,localTs=0;const DEV=(()=>{try{let d=localStorage.getItem('vc-dev');if(!d){d=Math.random().toString(36).slice(2,10);localStorage.setItem('vc-dev',d);}return d;}catch(e){return 'x'+Math.random().toString(36).slice(2,8);}})();
let S,buildings=[],roads=[],dirty=true,nextId=1;
function freshState(mode){return{mode,m:500,w:150,f:80,g:0,rp:0,cur:null,done:new Set(),time:0,tod:8/24,day:1,speed:1,obj:0,pop:0,hap:0,staff:1,rates:{},req:null,nextReq:60,sold:0,won:false};}
const sand=()=>S&&S.mode==='sandbox';
const researched=k=>sand()||S.done.has(k);
const unlocked=t=>!B[t].req||researched(B[t].req);
const newFam=()=>{const used=new Set(buildings.map(b=>b.fam));const free=FAM.filter(f=>!used.has(f));return free.length?pick(free):pick(FAM)+' '+pick(['Jr.','II','da Costa','do Porto']);};
const houses=()=>buildings.filter(b=>B[b.t].cap);
const count=(t,conn)=>buildings.filter(b=>b.t===t&&(!conn||b.conn)).length;
function afford(c){if(sand())return true;return S.m>=(c.m||0)&&S.w>=(c.w||0);}
function pay(c,k=1){if(sand())return;S.m-=(c.m||0)*k;S.w-=(c.w||0)*k;}
const costTxt=c=>[c.m?`${c.m} moedas`:'',c.w?`${c.w} madeira`:''].filter(Boolean).join(' · ');

/* ---------- buildings ---------- */
function makeModel(t,seed,color){const v=new Vox(),R=rng(seed),ex={};MODELS[t](v,R,color||WALLS[Math.floor(R()*WALLS.length)],ex);const g=new THREE.Group();
  const body=new THREE.Mesh(toGeo(v.b),matBody);body.castShadow=body.receiveShadow=true;g.add(body);
  if(v.g.length){const gl=new THREE.Mesh(toGeo(v.g),matGlow);gl.castShadow=true;g.add(gl);}
  if(ex.spin){const s=new THREE.Mesh(toGeo(ex.spin.b),matBody);s.position.set(...ex.spinPos);s.castShadow=true;g.add(s);g.userData.spin=s;}
  if(t==='poste'){const h=new THREE.Sprite(haloMat);h.scale.set(4.2,4.2,1);h.position.y=3.35;h.raycast=()=>{};g.add(h);}
  g.userData.h=new THREE.Box3().setFromObject(g).max.y;return g;}
function addBuilding(o){const d=B[o.t];if(!d)return null;const b={id:o.id||nextId++,t:o.t,x:o.x,z:o.z,a:o.a||0,r:d.r,seed:o.seed||Math.floor(Math.random()*1e9),color:o.color||null,res:o.res||0,fam:o.fam||null,conn:false,hap:0,beauty:0,met:{}};
  nextId=Math.max(nextId,b.id+1);if(d.paint&&!b.color)b.color=WALLS[Math.floor(Math.random()*WALLS.length)];
  b.obj=makeModel(b.t,b.seed,b.color);b.obj.position.set(b.x,0,b.z);b.obj.rotation.y=b.a;b.obj.traverse(m=>m.userData.b=b);scene.add(b.obj);buildings.push(b);clearWild(b.x,b.z,b.r);dirty=true;rev++;if(o.anim)popIn(b);return b;}
function removeBuilding(b){rev++;scene.remove(b.obj);if(b.icon)scene.remove(b.icon);buildings=buildings.filter(x=>x!==b);if(S.req&&S.req.id===b.id)clearReq();if(sel===b)select(null);dirty=true;}
function recolor(b,col){rev++;b.color=col;scene.remove(b.obj);b.obj=makeModel(b.t,b.seed,col);b.obj.position.set(b.x,0,b.z);b.obj.rotation.y=b.a;b.obj.traverse(m=>m.userData.b=b);scene.add(b.obj);}

/* ---------- roads ---------- */
const roadMat=new THREE.MeshLambertMaterial({vertexColors:true});
function ribbon(samples,w,y,cols){const P=[],N=[],Cc=[];for(let i=0;i<samples.length-1;i++){const a=samples[i],b=samples[i+1],pa=samples[Math.max(0,i-1)],nb=samples[Math.min(samples.length-1,i+2)];
    const t0=new THREE.Vector2(b.x-pa.x,b.z-pa.z).normalize(),t1=new THREE.Vector2(nb.x-a.x,nb.z-a.z).normalize();
    const l0=[a.x-t0.y*w,a.z+t0.x*w],r0=[a.x+t0.y*w,a.z-t0.x*w],l1=[b.x-t1.y*w,b.z+t1.x*w],r1=[b.x+t1.y*w,b.z-t1.x*w];
    const c=new THREE.Color(cols[i%cols.length]);c.offsetHSL(0,0,(Math.random()-.5)*.04);
    for(const p of [l0,r1,r0,l0,l1,r1]){P.push(p[0],y,p[1]);N.push(0,1,0);Cc.push(c.r,c.g,c.b);}}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(P,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(N,3));g.setAttribute('color',new THREE.Float32BufferAttribute(Cc,3));return g;}
function sampleCurve(pts){if(pts.length<2)return pts.map(p=>({x:p.x,z:p.z}));const cv=new THREE.CatmullRomCurve3(pts.map(p=>new THREE.Vector3(p.x,0,p.z)),false,'centripetal');const n=Math.max(2,Math.ceil(cv.getLength()));return cv.getSpacedPoints(n).map(v=>({x:v.x,z:v.z}));}
function addRoad(pts){const s=sampleCurve(pts);const g=new THREE.Group();const k=roads.length%20*.002;
  const edge=new THREE.Mesh(ribbon(s,1.75,.03+k,['#a99f8a','#b5ab95']),roadMat);const top=new THREE.Mesh(ribbon(s,1.4,.06+k,['#d9ccb0','#cfc1a3','#e0d4ba']),roadMat);
  edge.receiveShadow=top.receiveShadow=true;g.add(edge,top);scene.add(g);const r={pts,s,obj:g,len:s.length};roads.push(r);rev++;
  for(const p of s){clearWild(p.x,p.z,1.6);for(const b of buildings.slice())if(B[b.t].cat==='dec'&&Math.hypot(b.x-p.x,b.z-p.z)<1.7)removeBuilding(b);}dirty=true;return r;}
function removeRoad(r){rev++;scene.remove(r.obj);roads=roads.filter(x=>x!==r);walkers.forEach(w=>{if(w.road===r)w.road=null;});dirty=true;}
function nearestRoad(x,z,skip){let best=null,bd=1e9;for(const r of roads){if(r===skip)continue;for(let i=0;i<r.s.length;i++){const p=r.s[i],d=(p.x-x)**2+(p.z-z)**2;if(d<bd){bd=d;best={x:p.x,z:p.z,r,i};}}}if(best)best.d=Math.sqrt(bd);return best;}
function recompute(){for(const b of buildings)b.conn=B[b.t].cat==='dec'?true:(()=>{const n=nearestRoad(b.x,b.z);return !!n&&n.d<=b.r+3.6;})();dirty=false;}

/* ---------- walkers ---------- */
const walkers=[];const wGeos=[];
for(let i=0;i<10;i++){const v=new Vox();const R=rng(i*31+5);v.box(-.09,0,0,.12,.45,.16,C.dark);v.box(.09,0,0,.12,.45,.16,C.dark);v.box(0,.45,0,.38,.55,.24,pick2(R,['#d9534f','#3d74a8','#f3efe6','#5a8a46','#e8b86b','#8e3b3b','#c4b3dc']));
  v.box(0,1,0,.28,.28,.26,pick2(R,['#f1c9a5','#d9a57a','#a8724a','#e8bfa0']));v.box(0,1.24,-.02,.3,.1,.3,pick2(R,['#3b2a1e','#6b4a2f','#d8c08a','#222']));if(R()<.3)v.box(0,1.32,0,.5,.06,.5,'#e3c35e');wGeos.push(toGeo(v.b));}
function syncWalkers(){const want=roads.length?Math.min(60,Math.floor(S.pop/2.5)):0;
  while(walkers.length<want){const m=new THREE.Mesh(pick(wGeos),matBody);m.castShadow=true;scene.add(m);walkers.push({m,road:null,s:0,dir:1,spd:rand(.9,1.4),side:pick([-.8,.8]),ph:Math.random()*9});}
  while(walkers.length>want){const w=walkers.pop();scene.remove(w.m);}}
function stepWalkers(dt,t){for(const w of walkers){if(!w.road||!roads.includes(w.road)){w.road=pick(roads);w.s=Math.random()*(w.road.len-1);}
    const r=w.road;w.s+=w.dir*w.spd*dt;if(w.s>r.len-1.01){w.s=r.len-1.01;w.dir=-1;if(Math.random()<.5){const n=nearestRoad(r.s[r.len-1].x,r.s[r.len-1].z,r);if(n&&n.d<2.5){w.road=n.r;w.s=n.i;w.dir=n.i>n.r.len/2?-1:1;}}}
    if(w.s<0){w.s=0;w.dir=1;}const i=Math.floor(w.s),f=w.s-i,a=r.s[i],b=r.s[Math.min(i+1,r.len-1)];const tx=b.x-a.x,tz=b.z-a.z,l=Math.hypot(tx,tz)||1;
    w.m.position.set(a.x+tx*f+(-tz/l)*w.side*w.dir,.06+Math.abs(Math.sin(t*8+w.ph))*(dt?.06:0),a.z+tz*f+(tx/l)*w.side*w.dir);w.m.rotation.y=Math.atan2(tx*w.dir,tz*w.dir);}}

/* ---------- camera ---------- */
const cam={x:0,z:0,yaw:.8,pitch:.72,dist:80,tx:0,tz:0,tyaw:.8,tpitch:.72,tdist:80};
function camVecs(){const f={x:-Math.sin(cam.yaw),z:-Math.cos(cam.yaw)};return{f,r:{x:-f.z,z:f.x}};}
function updateCam(dt){const k=clamp(1-Math.pow(.0005,dt),0,1);for(const p of ['x','z','yaw','pitch','dist']){cam[p]+=(cam['t'+p]-cam[p])*k;if(!isFinite(cam[p])||!isFinite(cam['t'+p])){Object.assign(cam,{x:0,z:8,yaw:.8,pitch:.75,dist:60,tx:0,tz:8,tyaw:.8,tpitch:.75,tdist:60});break;}}
  const cp=Math.cos(cam.pitch);camera.position.set(cam.x+Math.sin(cam.yaw)*cp*cam.dist,Math.sin(cam.pitch)*cam.dist,cam.z+Math.cos(cam.yaw)*cp*cam.dist);camera.lookAt(cam.x,0,cam.z);}
function panBy(dx,dz){cam.tx=clamp(cam.tx+dx,-80,80);cam.tz=clamp(cam.tz+dz,-80,80);}

/* ---------- time & light ---------- */
const SKY=[[0,'#0c1a30'],[5,'#1d2a4a'],[6.3,'#f0b48c'],[8,'#a8d8ea'],[16.5,'#a8d8ea'],[18.3,'#f29e74'],[19.6,'#3a3560'],[21,'#0c1a30'],[24,'#0c1a30']];
function skyAt(h){for(let i=0;i<SKY.length-1;i++)if(h>=SKY[i][0]&&h<=SKY[i+1][0]){const t=(h-SKY[i][0])/(SKY[i+1][0]-SKY[i][0]);return new THREE.Color(SKY[i][1]).lerp(new THREE.Color(SKY[i+1][1]),t);}return new THREE.Color(SKY[0][1]);}
let nightK=0;
function applyLight(tod){const h=tod*24,el=Math.sin((h-6)/12*Math.PI),az=(h-6)/12*Math.PI;const sky=skyAt(h);scene.background=sky;scene.fog.color.copy(sky);
  const day=clamp(el*1.6,0,1);nightK=clamp((.12-el)*3.5,0,1);
  let dir;if(el>-.05){dir=new THREE.Vector3(Math.cos(az)*.9,Math.max(.12,el),Math.sin(az)*.55+.35).normalize();sun.color.set('#ffb36b').lerp(new THREE.Color('#fff4e0'),clamp(el*1.8,0,1));sun.intensity=.25+.8*day;}
  else{dir=new THREE.Vector3(-.4,.85,.35).normalize();sun.color.set('#7d93cf');sun.intensity=.32;}
  sun.position.set(cam.x+dir.x*120,dir.y*120,cam.z+dir.z*120);sun.target.position.set(cam.x,0,cam.z);
  hemi.intensity=.3+.35*day;hemi.color.set(sky).lerp(new THREE.Color('#ffffff'),.5);
  water.material.color.set('#4fb3c8').lerp(new THREE.Color('#1b3654'),nightK*.85);matGlow.emissiveIntensity=nightK*1.1;}

/* ---------- UI helpers ---------- */
let toastT;function toast(t){const e=$('#toast');e.textContent=t;e.style.opacity=1;clearTimeout(toastT);toastT=setTimeout(()=>e.style.opacity=0,2600);}
const logs=[];function log(t){logs.unshift(`<div><b>Dia ${S.day}</b> · ${t}</div>`);logs.length=Math.min(logs.length,14);$('#log').innerHTML=logs.join('');}
const fmt=n=>sand()?'∞':Math.floor(n).toLocaleString('pt-BR');
function rate(el,v){el.textContent=sand()||!v?'':(v>=0?'+':'')+v.toFixed(1)+'/s';el.style.color=v<0?'var(--bad)':'var(--ok)';}
function hud(){$('#rM').textContent=fmt(S.m);$('#rW').textContent=fmt(S.w);$('#rF').textContent=fmt(S.f);$('#rG').textContent=fmt(S.g);$('#rP').textContent=S.pop;$('#rH').textContent=S.hap+'%';
  rate($('#dM'),S.rates.m||0);rate($('#dF'),S.rates.f||0);const h=S.tod*24;$('#clock').textContent=`Dia ${S.day} · ${String(Math.floor(h)).padStart(2,'0')}:${String(Math.floor(h%1*60)).padStart(2,'0')}`;
  $('#rR').textContent=sand()?'':S.cur?`· ${RS[S.cur].n} ${Math.floor(S.rp/RS[S.cur].cost*100)}%`:'· escolha';}

/* ---------- tools ---------- */
const ICON={rua:'<path d="M7 21c1-6 9-8 10-18" stroke="currentColor" stroke-width="2.4" fill="none" stroke-linecap="round"/><path d="M12 6v2M11 12v2M9 17v2" stroke="currentColor" stroke-width="1.6"/>',mor:'<path d="M3 11 12 4l9 7v9H3z" fill="currentColor"/>',trab:'<path d="M3 20V9l5 3V9l5 3V5h4l1 15z" fill="currentColor"/>',com:'<path d="M12 3c3 4 5 6 5 9a5 5 0 0 1-10 0c0-3 2-5 5-9z" fill="currentColor"/>',dec:'<circle cx="12" cy="9" r="6" fill="currentColor"/><rect x="11" y="14" width="2" height="7" fill="currentColor"/>',dem:'<path d="M5 5l14 14M19 5 5 19" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/>'};
const CATS=[['rua','Ruas'],['mor','Moradia'],['trab','Trabalho'],['com','Comodidades'],['dec','Decoração'],['dem','Demolir']];
$('#cats').innerHTML=CATS.map(([k,n])=>`<button class="cat" data-c="${k}"><svg viewBox="0 0 24 24">${ICON[k]}</svg>${n}</button>`).join('');
let tool='select',openCat=null,placeT=null,manualRot=0,align=true,roadPts=[],sel=null;
const thumbs={};
function refreshTray(){if(!openCat)return;const items=Object.keys(B).filter(t=>B[t].cat===openCat);
  $('#tray').innerHTML=items.map(t=>{const d=B[t],lk=!unlocked(t);return `<button class="item${lk?' lock':''}${placeT===t?' on':''}" data-t="${t}" ${lk?`data-lock="Pesquise ${RS[d.req].n}"`:''} title="${d.d||''}"><img src="${thumbs[t]||''}" alt=""><b>${d.n}</b><small>${sand()?'grátis':costTxt(d.cost)}</small></button>`;}).join('');}
function setCatUI(){$$('.cat').forEach(b=>b.classList.toggle('on',b.dataset.c===openCat||(b.dataset.c==='rua'&&tool==='road')||(b.dataset.c==='dem'&&tool==='demolish')));$('#tray').classList.toggle('hide',!openCat);refreshTray();}
$('#cats').addEventListener('click',e=>{const b=e.target.closest('.cat');if(!b)return;const c=b.dataset.c;
  if(c==='rua'){setTool(tool==='road'?'select':'road');openCat=null;}else if(c==='dem'){setTool(tool==='demolish'?'select':'demolish');openCat=null;}else{openCat=openCat===c?null:c;if(tool!=='place')setTool('select');}setCatUI();});
$('#tray').addEventListener('click',e=>{const b=e.target.closest('.item');if(!b)return;const t=b.dataset.t;if(!unlocked(t)){toast(`Requer pesquisa: ${RS[B[t].req].n}`);openResearch();return;}placeT=t;setTool('place');setCatUI();canvas.focus();});
let ghost=null;const hoverRing=new THREE.Mesh(new THREE.RingGeometry(.88,1,48),new THREE.MeshBasicMaterial({color:'#ffffff',transparent:true,opacity:.45,depthWrite:false}));hoverRing.rotation.x=-Math.PI/2;hoverRing.position.y=.13;hoverRing.visible=false;scene.add(hoverRing);const ring=new THREE.Mesh(new THREE.RingGeometry(.92,1,72),new THREE.MeshBasicMaterial({color:'#ffe08a',transparent:true,opacity:.55,depthWrite:false}));ring.rotation.x=-Math.PI/2;ring.position.y=.12;ring.visible=false;scene.add(ring);
const selRing=new THREE.Mesh(new THREE.RingGeometry(.85,1,48),new THREE.MeshBasicMaterial({color:'#f4c95d',transparent:true,opacity:.9,depthWrite:false}));selRing.rotation.x=-Math.PI/2;selRing.position.y=.14;selRing.visible=false;scene.add(selRing);
let roadPrev=null;
function setTool(t){tool=t;if(ghost){scene.remove(ghost);ghost=null;}if(roadPrev){scene.remove(roadPrev);roadPrev=null;}roadPts=[];ring.visible=false;
  if(t==='place'){ghost=makeModel(placeT,7,null);ghost.traverse(m=>{if(m.isMesh){m.material=ghostMat;m.castShadow=false;}});scene.add(ghost);manualRot=B[placeT].cat==='dec'?Math.random()*6.28:0;}
  if(t!=='place')placeT=null;$('#tip').classList.add('hide');setCatUI();}
function placement(t,gp){const d=B[t];let x=gp.x,z=gp.z,a=manualRot,warn='',bad='';
  if(d.coast){const e=1.5,gx=landDist(x+e,z)-landDist(x-e,z),gz=landDist(x,z+e)-landDist(x,z-e);a=Math.atan2(-gx,-gz);}
  else if(align&&d.cat!=='dec'){const n=nearestRoad(x,z);if(n&&n.d<d.r+6&&n.d>.01){const dx=n.x-x,dz=n.z-z;a=Math.atan2(dx,dz);const want=d.r+1.75;x=n.x-dx/n.d*want;z=n.z-dz/n.d*want;}}
  if(d.coast){const ld=landDist(x,z);if(ld<-2.5||ld>4)bad='Precisa ficar na beira do mar';else if(landDist(x+Math.sin(a)*6,z+Math.cos(a)*6)>-1)bad='A ponta do cais precisa alcançar a água';}
  else{if(landDist(x,z)<d.r*.6+1)bad='Fora da ilha';else for(let i=0;i<8;i++){const q=i/8*6.283;if(landDist(x+Math.cos(q)*d.r,z+Math.sin(q)*d.r)<.4){bad='Muito perto da água';break;}}}
  if(!bad)for(const b of buildings){const k=(B[b.t].cat==='dec'&&d.cat==='dec')?.75:.9;if(Math.hypot(b.x-x,b.z-z)<(d.r+b.r)*k){bad='Espaço ocupado';break;}}
  if(!bad){const n=nearestRoad(x,z);if(n&&n.d<d.r*.85+1.25)bad='Em cima da rua';if(d.cat!=='dec'&&(!n||n.d>d.r+3.6))warn='Sem rua por perto: não vai funcionar';}
  if(!bad&&!unlocked(t))bad='Precisa de pesquisa';if(!bad&&!afford(d.cost))bad='Recursos insuficientes';
  return{x,z,a,bad,warn};}
function tryPlace(gp){const t=placeT,p=placement(t,gp);if(p.bad){toast(p.bad);return;}pay(B[t].cost);const b=addBuilding({t,x:p.x,z:p.z,a:p.a,anim:true});sfx(B[t].cat==='dec'?'pop':'build');
  if(B[t].cat==='dec')manualRot=Math.random()*6.28;checkReqDone(b);recompute();hud();}
function roadCost(pts){const s=sampleCurve(pts);return{s,m:Math.ceil(s.length*1.2)};}
function roadCheck(s){for(const p of s){if(landDist(p.x,p.z)<.6)return 'A rua não pode entrar no mar';for(const b of buildings)if(B[b.t].cat!=='dec'&&Math.hypot(b.x-p.x,b.z-p.z)<b.r*.85+1.2)return 'A rua passa por cima de uma construção';}return '';}
function snapPt(gp){const n=nearestRoad(gp.x,gp.z);return n&&n.d<2.6?{x:n.x,z:n.z}:{x:gp.x,z:gp.z};}
function finishRoad(){if(roadPts.length<2){setTool('road');return;}const {s,m}=roadCost(roadPts),bad=roadCheck(s);if(bad){toast(bad);return;}if(!sand()&&S.m<m){toast('Moedas insuficientes');return;}
  if(!sand())S.m-=m;addRoad(roadPts.slice());roadPts=[];if(roadPrev){scene.remove(roadPrev);roadPrev=null;}recompute();hud();}

/* ---------- selection & info ---------- */
const ray=new THREE.Raycaster(),mouse=new THREE.Vector2(),plane=new THREE.Plane(new THREE.Vector3(0,1,0),0);
function groundPt(){ray.setFromCamera(mouse,camera);const v=new THREE.Vector3();return ray.ray.intersectPlane(plane,v)?{x:v.x,z:v.z}:null;}
function pickB(){ray.setFromCamera(mouse,camera);const hit=ray.intersectObjects(buildings.map(b=>b.obj),true)[0];return hit?hit.object.userData.b:null;}
function select(b){sel=b;selRing.visible=!!b;$('#info').classList.toggle('hide',!b);if(b){selRing.scale.setScalar(b.r+.6);selRing.position.x=b.x;selRing.position.z=b.z;info();}}
function info(){if(!sel)return;const b=sel,d=B[b.t];let h=`<h2>${d.n}</h2><div class="sub">${d.d||'Decoração: deixa a vizinhança mais bonita.'}</div>`;
  if(d.cat!=='dec'&&!b.conn)h+=`<div class="need" style="color:var(--bad)"><i style="background:var(--bad)"></i>Sem rua por perto: não funciona</div>`;
  if(d.cap){h+=`<div class="row"><span>Classe</span><span>${TIERS[d.tier]}</span></div><div class="row"><span>Família</span><span>${b.fam?b.fam:'Ninguém ainda'}</span></div><div class="row"><span>Moradores</span><span>${b.res} / ${d.cap}</span></div>`;
    h+=`<div class="row"><span>Felicidade</span><span>${b.hap}%</span></div><div class="bar"><div style="width:${b.hap}%;background:${b.hap<35?'var(--bad)':b.hap<60?'var(--sun)':'var(--ok)'}"></div></div>`;
    h+=NEEDS[d.tier].map(n=>`<div class="need"><i style="background:${b.met[n]?'var(--ok)':'var(--bad)'}"></i>${NEEDN[n]}</div>`).join('');h+=`<div class="row"><span>Beleza ao redor</span><span>${b.beauty.toFixed(1)} / 10</span></div>`;}
  if(d.jobs)h+=`<div class="row"><span>Vagas de trabalho</span><span>${d.jobs}</span></div><div class="row"><span>Equipe da vila</span><span>${Math.round(S.staff*100)}%</span></div>`;
  if(d.rad)h+=`<div class="row"><span>Raio de alcance</span><span>${d.rad}</span></div>`;
  if(d.paint)h+=`<div class="sub" style="margin:10px 0 0">Cor da fachada</div><div class="sw">${WALLS.map(c=>`<button style="background:${c}" data-col="${c}" aria-label="Cor ${c}"></button>`).join('')}</div>`;
  h+=`<div class="btnrow"><button class="btn warn" id="iDem">Demolir (+50%)</button><button class="btn" id="iClose">Fechar</button></div>`;$('#info').innerHTML=h;}
$('#info').addEventListener('click',e=>{if(e.target.dataset.col){recolor(sel,e.target.dataset.col);return;}if(e.target.id==='iDem'){demolish(sel);}if(e.target.id==='iClose')select(null);});
function demolish(b){if(!b)return;sfx('demolish');dust(b.x,b.z,b.r,16);pay(B[b.t].cost,-.5);log(`${B[b.t].n} demolido(a).`);removeBuilding(b);recompute();hud();}

/* ---------- requests ---------- */
let reqMark=null;
function clearReq(){S.req=null;if(reqMark){scene.remove(reqMark);reqMark=null;}$('#req').classList.add('hide');}
function showReq(){const r=S.req;if(!r)return;$('#req').classList.remove('hide');$('#reqT').innerHTML=`<b>${r.who}</b> gostaria de ${r.want} perto de casa.`;$('#reqR').textContent=`Recompensa: 60 moedas · marcador amarelo sobre a casa`;
  if(!reqMark){reqMark=new THREE.Mesh(new THREE.OctahedronGeometry(.55,0),new THREE.MeshBasicMaterial({color:'#ffd24d'}));scene.add(reqMark);}}
const WANT={flores:'um canteiro de flores',banco:'um banco para descansar',poste:'um poste de luz',oliveira:'uma oliveira',arbusto:'um arbusto florido',cipreste:'um cipreste',praca:'uma praça com fonte'};
function checkReqDone(b){const r=S.req;if(!r||b.t!==r.t)return;const h=buildings.find(x=>x.id===r.id);if(h&&dist(h,b)<12){if(!sand())S.m+=60;log(`<b>${r.who}</b> adorou o novo ${B[b.t].n.toLowerCase()}. +60 moedas`);toast('Pedido atendido! +60 moedas');clearReq();S.nextReq=S.time+rand(60,110);}}

/* ---------- objectives ---------- */
const decorN=()=>buildings.filter(b=>B[b.t].cat==='dec').length;
const OBJ=[
  {t:'Trace sua primeira rua (botão Ruas)',f:()=>roads.length>0,r:50},
  {t:'Construa 3 Casinhas ao lado de uma rua',f:()=>count('casa',1)>=3,r:60},
  {t:'Construa um Poço e uma Fazenda perto das ruas',f:()=>count('poco',1)&&count('fazenda',1),r:80},
  {t:'Alcance 15 moradores',f:()=>S.pop>=15,r:100},
  {t:'Construa uma Serraria para produzir madeira',f:()=>count('serraria',1)>=1,r:60},
  {t:'Pesquise Alvenaria (botão Pesquisa)',f:()=>researched('alvenaria'),r:80},
  {t:'Construa um Mercado e uma Capela',f:()=>count('mercado',1)&&count('capela',1),r:150},
  {t:'Embeleze a vila com 12 decorações',f:()=>decorN()>=12,r:100},
  {t:'Chegue a 50 moradores com 60% de felicidade',f:()=>S.pop>=50&&S.hap>=60,r:200},
  {t:'Pesquise Ofícios e construa um Café',f:()=>count('cafe',1)>=1,r:150},
  {t:'Construa o Cais e venda 20 mercadorias',f:()=>count('cais',1)&&S.sold>=20,r:250},
  {t:'Construa 2 Casas burguesas e um Teatro',f:()=>count('vila',1)>=2&&count('teatro',1)>=1,r:300},
  {t:'Chegue a 150 moradores e 3.000 moedas',f:()=>S.pop>=150&&S.m>=3000,r:0},
];
function showObj(){if(sand()){$('#objH').textContent='Modo sandbox';$('#objT').textContent='Tudo liberado e recursos infinitos. Construa à vontade.';$('#objR').textContent='';return;}
  if(S.obj>=OBJ.length){$('#objH').textContent='Campanha concluída';$('#objT').textContent='Continue expandindo sua cidade.';$('#objR').textContent='';return;}
  $('#objH').textContent=`Objetivo ${S.obj+1} de ${OBJ.length}`;$('#objT').textContent=OBJ[S.obj].t;$('#objR').textContent=OBJ[S.obj].r?`Recompensa: ${OBJ[S.obj].r} moedas`:'Objetivo final';}

/* ---------- simulation ---------- */
function tick(){rev++;if(dirty)recompute();const sb=sand();let pop=0;const hs=houses();for(const h of hs)pop+=h.res;
  let jobs=0;for(const b of buildings)if(B[b.t].jobs&&b.conn)jobs+=B[b.t].jobs;const staff=jobs?Math.min(1,pop*.7/jobs):1;S.staff=staff;S.pop=pop;
  let df=0,dw=0,dg=0,dm=0;const mills=buildings.filter(b=>b.t==='moinho'&&b.conn);
  for(const b of buildings){if(!b.conn)continue;if(b.t==='fazenda')df+=2.2*staff*(mills.some(m=>dist(m,b)<18)?1.5:1);else if(b.t==='serraria')dw+=1.3*staff;else if(b.t==='oficina')dg+=.9*staff;}
  const docks=count('cais',1);const sell=Math.min(S.g+dg,docks*1.4*staff);dg-=sell;dm+=sell*7;S.sold+=sell;
  if(researched('turismo'))dm+=docks*1.5+count('praca',1)*.6+count('teatro',1)*1.2;df-=pop*.035;
  const servs=buildings.filter(b=>B[b.t].serv&&b.conn),beaut=buildings.filter(b=>B[b.t].beauty);let hs2=0,hn=0;
  for(const h of hs){const d=B[h.t],needs=NEEDS[d.tier],met={};for(const n of needs)met[n]=n==='comida'?(S.f>.5||sb):servs.some(s=>B[s.t].serv===n&&dist(s,h)<=B[s.t].rad);
    let be=0;for(const o of beaut){const dd=dist(o,h);if(dd<12)be+=B[o.t].beauty*(1-dd/12);}h.beauty=Math.min(10,be);h.met=met;
    const mc=needs.filter(n=>met[n]).length;h.hap=h.conn?Math.round(mc/needs.length*75+Math.min(25,h.beauty*2.5)):0;if(h.res){hs2+=h.hap*h.res;hn+=h.res;}dm+=h.res*TAX[d.tier]*h.hap/100;
    if(h.conn&&h.hap>=35&&h.res<d.cap&&Math.random()<.03+h.hap/100*.08){if(!h.res){h.fam=newFam();h.res=Math.min(d.cap,2);log(`A família <b>${h.fam}</b> chegou e se mudou para um(a) ${d.n.toLowerCase()}.`);}else h.res++;}
    else if(h.res&&h.hap<25&&Math.random()<.04){h.res--;if(!h.res){log(`A família <b>${h.fam}</b> deixou a vila.`);h.fam=null;}}}
  S.hap=hn?Math.round(hs2/hn):0;if(!sb){S.f=Math.max(0,S.f+df);S.w+=dw;S.g=Math.max(0,S.g+dg);S.m+=dm;}S.rates={f:df,m:dm};
  if(S.cur&&!sb){S.rp+=.25+Math.sqrt(pop)*.06+count('escola',1)*.9*staff;if(S.rp>=RS[S.cur].cost){S.done.add(S.cur);toast(`Pesquisa concluída: ${RS[S.cur].n}`);log(`Pesquisa concluída: <b>${RS[S.cur].n}</b>.`);S.rp=0;S.cur=null;refreshTray();}}
  if(!S.req&&S.time>S.nextReq){const occ=hs.filter(h=>h.res);if(occ.length){const h=pick(occ),opts=['flores','banco','poste','oliveira','arbusto'];if(unlocked('praca'))opts.push('praca');if(unlocked('cipreste'))opts.push('cipreste');
      const t=pick(opts);S.req={id:h.id,t,want:WANT[t],until:S.time+180,who:`${pick(FIRST)} ${h.fam}`};log(`<b>${S.req.who}</b> fez um pedido.`);showReq();}S.nextReq=S.time+rand(70,120);}
  if(S.req){const h=buildings.find(x=>x.id===S.req.id);if(!h)clearReq();else if(S.time>S.req.until){log(`<b>${S.req.who}</b> ficou um pouco decepcionado(a).`);clearReq();}}
  if(!sb&&S.obj<OBJ.length&&OBJ[S.obj].f()){const o=OBJ[S.obj];S.m+=o.r;toast(o.r?`Objetivo concluído! +${o.r} moedas`:'Objetivo concluído!');sfx('coin');log(`Objetivo concluído: ${o.t}.`);S.obj++;if(S.obj>=OBJ.length&&!S.won){S.won=true;$('#win').classList.remove('hide');}showObj();}
  syncWalkers();updateIcons();if(sel)info();hud();}

/* ---------- research UI ---------- */
function openResearch(){if(sand()){toast('No sandbox tudo já está liberado');return;}$('#research').classList.remove('hide');drawResearch();}
function drawResearch(){$('#rtree').innerHTML=Object.entries(RS).map(([k,r])=>{const done=S.done.has(k),ok=r.req.every(q=>S.done.has(q)),cur=S.cur===k;
  return `<button class="rnode${done?' done':''}${cur?' cur':''}${!ok&&!done?' lock':''}" data-k="${k}"><b>${r.n}</b><small>${r.d}</small><small>${done?'Concluída':!ok?'Requer: '+r.req.map(q=>RS[q].n).join(', '):cur?`Estudando · ${Math.floor(S.rp)}/${r.cost}`:`Custo: ${r.cost} pontos`}</small></button>`;}).join('');}
$('#rtree').addEventListener('click',e=>{const b=e.target.closest('.rnode');if(!b)return;const k=b.dataset.k,r=RS[k];if(S.done.has(k)||!r.req.every(q=>S.done.has(q)))return;if(S.cur!==k){S.cur=k;S.rp=0;rev++;}drawResearch();hud();});
$('#bRes').onclick=openResearch;
$$('[data-close]').forEach(b=>b.onclick=()=>b.closest('.modal').classList.add('hide'));

/* ---------- save/load ---------- */
const KEY='porto-serena-save-v1';
function snapshot(){return {v:2,ts:localTs,dev:DEV,owner:user?user.id:null,city:cityName,S:{...S,done:[...S.done],req:null},b:buildings.map(b=>({id:b.id,t:b.t,x:b.x,z:b.z,a:b.a,seed:b.seed,color:b.color,res:b.res,fam:b.fam})),r:roads.map(r=>r.pts),cam:{x:cam.tx,z:cam.tz,yaw:cam.tyaw,pitch:cam.tpitch,dist:cam.tdist}};}
function save(){if(!S||inMenu||rev===savedRev)return;localTs=Date.now();savedRev=rev;try{localStorage.setItem(KEY,JSON.stringify(snapshot()));}catch(e){}}
function hasSave(){try{return !!localStorage.getItem(KEY);}catch(e){return false;}}
function clearWorld(){for(const b of buildings.slice())scene.remove(b.obj);buildings=[];for(const r of roads)scene.remove(r.obj);roads=[];for(const w of walkers)scene.remove(w.m);walkers.length=0;
  const m=new THREE.Matrix4();for(const t of wild)if(!t.alive){t.alive=true;m.compose(new THREE.Vector3(t.x,0,t.z),new THREE.Quaternion(),new THREE.Vector3(1,1,1));wildMesh[t.k].setMatrixAt(t.i,m);wildMesh[t.k].instanceMatrix.needsUpdate=true;}
  if(reqMark){scene.remove(reqMark);reqMark=null;}select(null);logs.length=0;$('#log').innerHTML='';}
function load(obj){try{const o=obj||JSON.parse(localStorage.getItem(KEY));if(o.city)cityName=o.city;clearWorld();S=Object.assign(freshState(o.S.mode),o.S,{done:new Set(o.S.done),req:null});
  for(const p of o.r)addRoad(p);for(const b of o.b)addBuilding(b);Object.assign(cam,{tx:o.cam.x,tz:o.cam.z,tyaw:o.cam.yaw,tpitch:o.cam.pitch,tdist:o.cam.dist});localTs=o.ts||0;savedRev=rev;return true;}catch(e){return false;}}

/* ---------- demo village (menu backdrop & starting town) ---------- */
function demoVillage(){const p=[{x:-26,z:10},{x:-12,z:4},{x:0,z:6},{x:12,z:0},{x:26,z:-6}];addRoad(p);addRoad([{x:0,z:6},{x:2,z:18},{x:-4,z:30}]);
  const r=roads[0];const types=['casa','casa','sobrado','casa','mercado','casa','sobrado','casa','cafe','casa','casa','sobrado'];let i=3;
  for(const t of types){const s=r.s[Math.min(i,r.len-1)],n=r.s[Math.min(i+1,r.len-1)],tx=n.x-s.x,tz=n.z-s.z,l=Math.hypot(tx,tz)||1;const side=(i/5|0)%2?1:-1,off=B[t].r+1.75;
    const x=s.x+(-tz/l)*off*side,z=s.z+(tx/l)*off*side;addBuilding({t,x,z,a:Math.atan2(s.x-x,s.z-z),res:B[t].cap?2:0,fam:B[t].cap?newFam():null});i+=Math.ceil(B[t].r*2+1.2);if(i>=r.len-2)break;}
  addBuilding({t:'praca',x:8,z:16});addBuilding({t:'capela',x:-8,z:22,a:Math.PI/2});for(let k=0;k<14;k++){const a=k/14*6.28;addBuilding({t:pick(['oliveira','flores','poste','cipreste','arbusto']),x:8+Math.cos(a)*7,z:16+Math.sin(a)*7});}
  addBuilding({t:'fazenda',x:-20,z:-6,a:.3});addBuilding({t:'moinho',x:-12,z:-8});addBuilding({t:'poco',x:-4,z:-1});}

/* ---------- flow ---------- */
let inMenu=true,photo=false;
function startGame(mode,cont,obj){lockLandscape();$('#menu').classList.add('hide');$('#ui').classList.remove('hide');inMenu=false;
  if(cont&&load(obj)){}else{clearWorld();S=freshState(mode);if(mode==='sandbox'){S.m=S.w=S.f=1e9;}cam.tx=0;cam.tz=8;cam.tdist=60;cam.tpitch=.8;
    log(mode==='sandbox'?'Modo sandbox: construa livremente.':'Bem-vindo(a) a Vice City! Comece traçando uma rua.');}
  dirty=true;tick();if(cont)savedRev=rev;showObj();setTool('select');openCat=null;setCatUI();
  if(!cont&&!hasSave())$('#help').classList.remove('hide');save();}
$('#mCont').onclick=()=>startGame(null,true);$('#mHelp').onclick=()=>$('#help').classList.remove('hide');
$('#bMenu').onclick=()=>{save();cloudPush();inMenu=true;$('#ui').classList.add('hide');$('#menu').classList.remove('hide');$('#mCont').classList.toggle('hide',!hasSave());setTool('select');};
$('#speed').addEventListener('click',e=>{const b=e.target.closest('button');if(b)setSpeed(+b.dataset.s);});
function setSpeed(s){S.speed=s;$$('#speed button').forEach(b=>b.classList.toggle('on',+b.dataset.s===s));}
function setAlign(v){align=v;$('#bAlign').classList.toggle('on',v);$('#bAlign').title='Alinhar à rua (F): '+(v?'ligado':'desligado');}
$('#bAlign').onclick=()=>setAlign(!align);

/* ---------- photo mode ---------- */
const FILT={none:'none',gold:'sepia(.25) saturate(1.3) contrast(1.05) brightness(1.05)',blue:'hue-rotate(-12deg) saturate(.8) brightness(.92) contrast(1.12)',sepia:'sepia(.8) contrast(1.1)'};
let pf='none',tilt=true,savedTod=0;
function setPhoto(v){photo=v;$('#ui').classList.toggle('hide',v);$('#photo').classList.toggle('hide',!v);$('#tiltT').classList.toggle('hide',!v||!tilt);$('#tiltB').classList.toggle('hide',!v||!tilt);
  if(v){savedTod=S.tod;$('#pTime').value=(S.tod*24).toFixed(1);setTool('select');select(null);}else{S.tod=savedTod;canvas.style.filter='none';}}
$('#bPhoto').onclick=()=>setPhoto(true);$('#pExit').onclick=()=>setPhoto(false);
$$('#photo [data-f]').forEach(b=>b.onclick=()=>{pf=b.dataset.f;canvas.style.filter=FILT[pf];});
$('#pTime').oninput=e=>{S.tod=(+e.target.value%24)/24;};
$('#pTilt').onclick=()=>{tilt=!tilt;$('#pTilt').textContent='Miniatura: '+(tilt?'sim':'não');$('#tiltT').classList.toggle('hide',!tilt);$('#tiltB').classList.toggle('hide',!tilt);};
$('#pShot').onclick=()=>{renderer.render(scene,camera);const W=canvas.width,H=canvas.height,o=document.createElement('canvas');o.width=W;o.height=H;const c=o.getContext('2d');c.filter=FILT[pf];c.drawImage(canvas,0,0);c.filter='none';
  if(tilt){const t=document.createElement('canvas');t.width=W;t.height=H;const tc=t.getContext('2d');tc.filter=`blur(${Math.round(W/400)}px) ${FILT[pf]==='none'?'':FILT[pf]}`;tc.drawImage(canvas,0,0);tc.filter='none';tc.globalCompositeOperation='destination-in';
    const g=tc.createLinearGradient(0,0,0,H);g.addColorStop(0,'#000');g.addColorStop(.34,'rgba(0,0,0,0)');g.addColorStop(.66,'rgba(0,0,0,0)');g.addColorStop(1,'#000');tc.fillStyle=g;tc.fillRect(0,0,W,H);c.drawImage(t,0,0);}
  const v=c.createRadialGradient(W/2,H/2,H*.35,W/2,H/2,H*.85);v.addColorStop(0,'rgba(0,0,0,0)');v.addColorStop(1,'rgba(0,0,0,.35)');c.fillStyle=v;c.fillRect(0,0,W,H);
  $('#shotImg').src=o.toDataURL('image/png');$('#shot').classList.remove('hide');};

/* ---------- music (procedural) ---------- */
let actx=null,mGain=null,mTimer=null,musicOn=false,nextChord=0,nextPluck=0,ci=0;
const CHORDS=[[60,64,67,71],[57,60,64,67],[53,57,60,64],[55,59,62,67]],PENTA=[72,74,76,79,81,84,86];const mf=n=>440*2**((n-69)/12);
function note(freq,t,dur,vol,type){const o=actx.createOscillator(),g=actx.createGain();o.type=type;o.frequency.value=freq;g.gain.setValueAtTime(0,t);
  if(type==='sine'){g.gain.linearRampToValueAtTime(vol,t+.02);g.gain.exponentialRampToValueAtTime(.0001,t+dur);}else{g.gain.linearRampToValueAtTime(vol,t+1.2);g.gain.linearRampToValueAtTime(vol*.8,t+dur-1);g.gain.linearRampToValueAtTime(0,t+dur);}
  o.connect(g);g.connect(mGain);o.start(t);o.stop(t+dur+.1);}
function schedule(){const now=actx.currentTime;while(nextChord<now+1){const ch=CHORDS[ci++%4];for(const n of ch)note(mf(n-12),nextChord,4.4,.035,'triangle');nextChord+=4;}
  while(nextPluck<now+1){if(Math.random()<.7)note(mf(pick(PENTA)),nextPluck,1.6,.07,'sine');nextPluck+=pick([.5,.5,1,1.5]);}}
function toggleMusic(){try{if(!actx){actx=new (window.AudioContext||window.webkitAudioContext)();mGain=actx.createGain();mGain.gain.value=.5;const lp=actx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=2400;
      const dl=actx.createDelay(),fb=actx.createGain();dl.delayTime.value=.42;fb.gain.value=.32;mGain.connect(lp);lp.connect(actx.destination);lp.connect(dl);dl.connect(fb);fb.connect(dl);dl.connect(actx.destination);nextChord=nextPluck=actx.currentTime+.1;}
    musicOn=!musicOn;if(musicOn){actx.resume();nextChord=nextPluck=actx.currentTime+.1;mTimer=setInterval(schedule,250);}else{clearInterval(mTimer);actx.suspend();}$('#bMusic').classList.toggle('on',musicOn);}catch(e){toast('Áudio indisponível neste navegador');}}
$('#bMusic').onclick=toggleMusic;

/* ---------- input (mouse + touch) ---------- */
let down=null,keys={},lastClick=0,touchMode=matchMedia('(pointer:coarse)').matches;const ptrs=new Map();let pinch=null,drawing=false;
canvas.addEventListener('contextmenu',e=>e.preventDefault());
function setMouse(e){const rc=canvas.getBoundingClientRect();mouse.x=(e.clientX-rc.left)/rc.width*2-1;mouse.y=-((e.clientY-rc.top)/rc.height)*2+1;mx=e.clientX;my=e.clientY;}
function pinchInfo(){const [a,b]=[...ptrs.values()];return{d:Math.hypot(a.x-b.x,a.y-b.y),ang:Math.atan2(b.y-a.y,b.x-a.x),cx:(a.x+b.x)/2,cy:(a.y+b.y)/2};}
const angDiff=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
function camPan(dx,dy){const {f,r}=camVecs(),k=cam.dist*.0017;panBy(-dx*r.x*k+dy*f.x*k,-dx*r.z*k+dy*f.z*k);}
/* câmera ancorada: o ponto da cidade sob o dedo (ou cursor) continua sob o dedo ao dar zoom, girar ou arrastar */
const tcam=new THREE.PerspectiveCamera(),tray=new THREE.Raycaster();
const tgt=()=>({x:cam.tx,z:cam.tz,yaw:cam.tyaw,pitch:cam.tpitch,dist:cam.tdist});
function groundAt(sx,sy,p){const rc=canvas.getBoundingClientRect();Object.assign(tcam,{fov:camera.fov,aspect:camera.aspect,near:camera.near,far:camera.far});tcam.updateProjectionMatrix();
  const cp=Math.cos(p.pitch);tcam.position.set(p.x+Math.sin(p.yaw)*cp*p.dist,Math.sin(p.pitch)*p.dist,p.z+Math.cos(p.yaw)*cp*p.dist);tcam.lookAt(p.x,0,p.z);tcam.updateMatrixWorld();
  tray.setFromCamera(new THREE.Vector2((sx-rc.left)/rc.width*2-1,-((sy-rc.top)/rc.height)*2+1),tcam);const o=new THREE.Vector3();
  if(!tray.ray.intersectPlane(plane,o))return null;return Math.hypot(o.x-p.x,o.z-p.z)>220?null:o;}
function snapCam(){cam.x=cam.tx;cam.z=cam.tz;cam.yaw=cam.tyaw;cam.pitch=cam.tpitch;cam.dist=cam.tdist;}
function anchored(ox,oy,nx,ny,change){const P=groundAt(ox,oy,tgt());change();const Q=groundAt(nx,ny,tgt());
  if(P&&Q){cam.tx=clamp(cam.tx+P.x-Q.x,-85,85);cam.tz=clamp(cam.tz+P.z-Q.z,-85,85);}snapCam();}
canvas.addEventListener('pointerdown',e=>{canvas.focus();touchMode=e.pointerType==='touch';ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});try{canvas.setPointerCapture(e.pointerId);}catch(_){}
  if(ptrs.size===2){const p=pinchInfo();pinch={...p,d0:p.d,a0:p.ang,x0:p.cx,y0:p.cy,mode:null};if(drawing)cancelDraw();if(down)down.moved=true;return;}if(ptrs.size>2)return;
  setMouse(e);down={b:e.button,x:e.clientX,y:e.clientY,moved:false,touch:touchMode};
  if(tool==='road'&&e.button===0&&!inMenu&&!photo){const gp=groundPt();if(gp){down.road=true;down.startPt=snapPt(gp);down.before=roadPts.length;}}});
canvas.addEventListener('pointermove',e=>{const pp=ptrs.get(e.pointerId);if(pp){pp.x=e.clientX;pp.y=e.clientY;}
  if(ptrs.size===2&&pinch){const n=pinchInfo();
    // gesto inteligente: decide uma única ação (zoom, girar ou mover) e mantém até soltar os dedos
    if(!pinch.mode){const sc=Math.abs(Math.log(n.d/pinch.d0)),an=Math.abs(angDiff(n.ang,pinch.a0)),mv=Math.hypot(n.cx-pinch.x0,n.cy-pinch.y0);
      if(an>.32&&sc<.06)pinch.mode='rot';else if(sc>.05||mv>14)pinch.mode='zoom';}
    if(pinch.mode==='zoom'){const f=Math.max(24,pinch.d)/Math.max(24,n.d);anchored(pinch.cx,pinch.cy,n.cx,n.cy,()=>{cam.tdist=clamp(cam.tdist*f,14,160);});}
    else if(pinch.mode==='rot'){const da=angDiff(n.ang,pinch.ang);anchored(pinch.cx,pinch.cy,n.cx,n.cy,()=>{cam.tyaw-=da;});}
    Object.assign(pinch,{d:n.d,ang:n.ang,cx:n.cx,cy:n.cy});return;}
  const dx=e.clientX-mx,dy=e.clientY-my;setMouse(e);
  if(!down)return;if(Math.hypot(e.clientX-down.x,e.clientY-down.y)>(down.touch?10:5))down.moved=true;if(!down.moved)return;
  if(down.road&&tool==='road'){drawRoadMove();return;}
  if(down.b===2||inMenu){cam.tyaw-=dx*.006;cam.tpitch=clamp(cam.tpitch+dy*.004,.35,1.45);}
  else if(down.b===1||(down.b===0&&(tool==='select'||tool==='demolish')))anchored(e.clientX-dx,e.clientY-dy,e.clientX,e.clientY,()=>{});});
/* desenhar rua arrastando: o dedo (ou mouse) traça a curva, a câmera fica parada */
function drawRoadMove(){const gp=groundPt();if(!gp)return;
  if(!drawing){drawing=true;const l=roadPts[roadPts.length-1];if(!l||Math.hypot(l.x-down.startPt.x,l.z-down.startPt.z)>1.5)roadPts.push(down.startPt);}
  const l=roadPts[roadPts.length-1];if(Math.hypot(l.x-gp.x,l.z-gp.z)>3.2){roadPts.push({x:gp.x,z:gp.z});ctxKey='';}}
function cancelDraw(){drawing=false;if(down&&down.road)roadPts.length=down.before;}
function endPtr(e){ptrs.delete(e.pointerId);if(ptrs.size<2)pinch=null;}
canvas.addEventListener('pointercancel',e=>{endPtr(e);if(drawing)cancelDraw();down=null;drawing=false;});
canvas.addEventListener('pointerup',e=>{endPtr(e);if(!down||ptrs.size)return;const d=down;down=null;
  if(drawing){drawing=false;setMouse(e);const gp=groundPt();if(gp){const p=snapPt(gp),l=roadPts[roadPts.length-1];if(!l||Math.hypot(l.x-p.x,l.z-p.z)>1.2)roadPts.push(p);}if(roadPts.length>=2)finishRoad();return;}
  if(d.moved||inMenu||photo)return;setMouse(e);const gp=groundPt();
  if(d.b===2){if(tool==='road'&&roadPts.length>=2)finishRoad();else if(tool==='road'&&roadPts.length)setTool('road');else{setTool('select');openCat=null;setCatUI();}return;}
  if(d.b!==0)return;const now=performance.now(),dbl=now-lastClick<320;lastClick=now;
  if(tool==='place'&&gp)tryPlace(gp);
  else if(tool==='road'&&gp){if(dbl&&roadPts.length>=2&&!d.touch){finishRoad();return;}const p=snapPt(gp);const l=roadPts[roadPts.length-1];if(!l||Math.hypot(l.x-p.x,l.z-p.z)>1.5){roadPts.push(p);sfx('tick');}}
  else if(tool==='demolish'){const b=pickB();if(b)demolish(b);else if(gp){const n=nearestRoad(gp.x,gp.z);if(n&&n.d<1.8){if(!sand())S.m+=Math.floor(n.r.len*.6);sfx('demolish');removeRoad(n.r);recompute();log('Rua removida.');hud();}}}
  else if(tool==='select'){const b=pickB();select(b);if(b)sfx('tick');}});
canvas.addEventListener('wheel',e=>{e.preventDefault();const dy=e.deltaMode===1?e.deltaY*16:e.deltaY,f=Math.exp(clamp(dy,-120,120)*.0018);anchored(e.clientX,e.clientY,e.clientX,e.clientY,()=>{cam.tdist=clamp(cam.tdist*f,14,160);});},{passive:false});
/* a página não dá zoom nem escorrega: os menus ficam parados */
['gesturestart','gesturechange','gestureend'].forEach(t=>document.addEventListener(t,e=>e.preventDefault(),{passive:false}));
document.addEventListener('dblclick',e=>e.preventDefault(),{passive:false});
document.addEventListener('touchmove',e=>{if(e.touches.length>1||!e.target.closest('#tray,.hud-res,#cats,.mcard,.modal .panel,#log,#info,#side,.a-step,.rank,.rtree'))e.preventDefault();},{passive:false});
document.addEventListener('touchend',e=>{if(!e.touches.length&&ptrs.size){ptrs.clear();pinch=null;}},{passive:true});
let mx=0,my=0;
addEventListener('keydown',e=>{if(e.target.tagName==='INPUT')return;keys[e.code]=true;if(inMenu)return;const k=e.code;
  if(k==='Escape'){if(photo)setPhoto(false);else if(!$$('.modal:not(.hide)').every(m=>m.id==='menu')){$$('.modal').forEach(m=>{if(m.id!=='menu')m.classList.add('hide');});}else if(tool==='road'&&roadPts.length)setTool('road');else{setTool('select');openCat=null;select(null);setCatUI();}}
  if(photo)return;
  if((k==='KeyQ'||k==='KeyE')&&tool==='place'){if(align&&B[placeT].cat!=='dec'){setAlign(false);toast('Alinhamento automático desligado (F liga de novo)');}manualRot+=(k==='KeyQ'?1:-1)*(e.shiftKey?3:15)*Math.PI/180;}
  else if(k==='KeyQ')cam.tyaw+=.3;else if(k==='KeyE')cam.tyaw-=.3;
  if(k==='KeyF')setAlign(!align);if(k==='KeyP')setPhoto(true);if(k==='KeyB'){setTool('demolish');openCat=null;setCatUI();}
  if(k==='Space'){e.preventDefault();setSpeed(S.speed?0:1);}if(k==='Digit1')setSpeed(1);if(k==='Digit2')setSpeed(2);if(k==='Digit3')setSpeed(3);
  if(k==='Enter'&&tool==='road')finishRoad();if(k==='KeyH')$('#help').classList.remove('hide');});
addEventListener('keyup',e=>{keys[e.code]=false;});

/* ---------- per-frame tool preview ---------- */
function previewFrame(){const tip=$('#tip');ctxBar();if(inMenu||photo){tip.classList.add('hide');return;}const gp=groundPt();let html='';
  if(tool==='place'&&ghost&&gp){const p=placement(placeT,gp),d=B[placeT];ghost.position.set(p.x,0,p.z);ghost.rotation.y=p.a;ghostMat.emissive.set(p.bad?'#8b1e1e':p.warn?'#7a5c10':'#1f6b33');
    ring.visible=!!d.rad;if(d.rad){ring.scale.setScalar(d.rad);ring.position.x=p.x;ring.position.z=p.z;}
    const cov=d.cap?'<br>'+NEEDS[d.tier].map(n=>{const ok=n==='comida'?(S.f>.5||sand()):buildings.some(s=>B[s.t].serv===n&&s.conn&&Math.hypot(s.x-p.x,s.z-p.z)<=B[s.t].rad);return `<span style="color:${ok?'var(--ok)':'var(--bad)'}">${ok?'✓':'✗'} ${NEEDN[n]}</span>`;}).join(' · '):'';
    html=`<b>${d.n}</b><br>${sand()?'grátis':costTxt(d.cost)}${cov}${p.bad?`<br><span class="bad">${p.bad}</span>`:p.warn?`<br><span class="warn">${p.warn}</span>`:''}<br><small>Q/E gira · F alinha à rua · Esc sai</small>`;}
  else if(tool==='road'&&gp){const pts=[...roadPts,snapPt(gp)];if(roadPrev){scene.remove(roadPrev);roadPrev.geometry.dispose();roadPrev=null;}
    if(pts.length>=2){const {s,m}=roadCost(pts),bad=roadCheck(s);roadPrev=new THREE.Mesh(ribbon(s,1.4,.09,[bad?'#e06a5a':'#f4e3b0']),new THREE.MeshBasicMaterial({vertexColors:true,transparent:true,opacity:.75,side:THREE.DoubleSide,depthWrite:false}));scene.add(roadPrev);
      html=`<b>Rua</b><br>${sand()?'grátis':m+' moedas'}${bad?`<br><span class="bad">${bad}</span>`:''}<br><small>Arraste para desenhar · ou clique nos pontos e Enter para concluir</small>`;}
    else html='<b>Rua</b><br>Arraste para desenhar a rua, ou clique ponto a ponto. Encoste numa rua existente para conectar.';}
  else if(tool==='select'&&!touchMode){const b=pickB();hoverRing.visible=!!b&&b!==sel;if(b){hoverRing.scale.setScalar(b.r+.6);hoverRing.position.x=b.x;hoverRing.position.z=b.z;canvas.style.cursor='pointer';}else canvas.style.cursor='';}
  if(tool!=='select')hoverRing.visible=false;
  if(tool==='demolish'){const b=pickB();html=b?`<b>Demolir ${B[b.t].n}</b><br>Devolve 50% do custo`:'<b>Demolir</b><br>Clique numa construção ou numa rua';}
  ctxBar();if(touchMode&&html)html=html.replace(/<br><small>.*<\/small>/,'');tip.classList.toggle('hide',!html);if(html){tip.innerHTML=html;tip.style.left=Math.min(innerWidth-270,mx+18)+'px';tip.style.top=Math.min(innerHeight-120,my+18)+'px';}}

/* ---------- thumbnails ---------- */
{const tr=new THREE.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true});tr.setSize(168,168);const ts=new THREE.Scene();ts.add(new THREE.HemisphereLight('#ffffff','#8a7a60',.75));
  const tl=new THREE.DirectionalLight('#fff4e0',.75);tl.position.set(6,10,8);ts.add(tl);const tc=new THREE.PerspectiveCamera(28,1,.1,300);
  for(const t of Object.keys(B)){const m=makeModel(t,11,null);ts.add(m);const bx=new THREE.Box3().setFromObject(m),c=bx.getCenter(new THREE.Vector3()),sz=bx.getSize(new THREE.Vector3()).length();
    tc.position.set(c.x+sz*1.05,c.y+sz*.85,c.z+sz*1.45);tc.lookAt(c);tr.render(ts,tc);thumbs[t]=tr.domElement.toDataURL();ts.remove(m);}
  tr.dispose();}

/* ---------- loop ---------- */
S=freshState('campaign');demoVillage();recompute();S.pop=houses().reduce((a,h)=>a+h.res,0);syncWalkers();
$('#mCont').classList.toggle('hide',!hasSave());
let last=performance.now(),acc=0,T=0,saveT=0,cloudT=0;
function frame(now){const rdt=clamp((now-last)/1000,0,.1);last=Math.max(last,now);T+=rdt;
  if(inMenu){cam.tyaw+=rdt*.05;cam.tx=0;cam.tz=8;cam.tdist=62;cam.tpitch=.62;S.tod=(S.tod+rdt/200)%1;}
  else if(!photo){const sp=S.speed;const {f,r}=camVecs(),k=cam.tdist*.9*rdt;
    if(keys.KeyW||keys.ArrowUp)panBy(f.x*k,f.z*k);if(keys.KeyS||keys.ArrowDown)panBy(-f.x*k,-f.z*k);if(keys.KeyA||keys.ArrowLeft)panBy(-r.x*k,-r.z*k);if(keys.KeyD||keys.ArrowRight)panBy(r.x*k,r.z*k);
    const h=S.tod*24,night=h<6||h>=20;S.tod+=rdt*sp/240*(night?2.5:1);if(S.tod>=1){S.tod-=1;S.day++;}
    acc+=rdt*sp;while(acc>=1){acc-=1;S.time+=1;tick();}saveT+=rdt;if(saveT>5){saveT=0;save();}}
  updateCam(rdt);applyLight(S.tod);const wsp=inMenu?1:photo?0:S.speed;stepWalkers(rdt*wsp,T);
  for(const b of buildings)if(b.obj.userData.spin)b.obj.userData.spin.rotation.z+=rdt*.6*(inMenu?1:S.speed);
  if(reqMark&&S.req){const h=buildings.find(x=>x.id===S.req.id);if(h){reqMark.position.set(h.x,(h.obj.userData.h||6)+2.2+Math.sin(T*3)*.4,h.z);reqMark.rotation.y=T*2;}}
  updateFX(rdt,inMenu?1:photo?0:S.speed);previewFrame();renderer.render(scene,camera);requestAnimationFrame(frame);}
requestAnimationFrame(frame);
addEventListener('beforeunload',save);

/* ---------- context bar (touch-friendly actions) ---------- */
const ctx=document.createElement('div');ctx.id='ctx';ctx.className='panel hide';document.body.appendChild(ctx);
let ctxKey='';
function ctxBar(){const k=inMenu||photo?'':tool==='place'?'place':tool==='road'?(roadPts.length>=2?'road2':'road'):tool==='demolish'?'dem':'';
  if(k===ctxKey)return;ctxKey=k;ctx.classList.toggle('hide',!k);
  ctx.innerHTML=k==='place'?`<button class="btn" data-x="rl">Girar ⟲</button><button class="btn" data-x="rr">Girar ⟳</button><button class="btn" data-x="al">Alinhar à rua</button><button class="btn" data-x="no">Cancelar</button>`
    :k==='road2'?`<button class="btn pri" data-x="ok">Concluir rua</button><button class="btn" data-x="undo">Desfazer ponto</button><button class="btn" data-x="no">Cancelar</button>`
    :k==='road'?`<span class="objp" style="margin:0 6px">Arraste para desenhar a rua ou toque nos pontos</span><button class="btn" data-x="no">Cancelar</button>`
    :k==='dem'?`<span class="objp" style="margin:0 6px">Toque numa construção ou rua</span><button class="btn" data-x="no">Sair</button>`:'';}
ctx.addEventListener('click',e=>{const x=e.target.dataset.x;if(!x)return;
  if(x==='rl'||x==='rr'){if(align&&B[placeT].cat!=='dec')setAlign(false);manualRot+=(x==='rl'?1:-1)*Math.PI/12;}
  if(x==='al')setAlign(!align);if(x==='ok')finishRoad();if(x==='undo'){roadPts.pop();ctxKey='';}
  if(x==='no'){setTool('select');openCat=null;setCatUI();}});

/* ---------- ambient FX: clouds, boats, gulls, ground scatter, halos, dust ---------- */
const clouds=[];
{const cm=new THREE.MeshLambertMaterial({color:'#ffffff',transparent:true,opacity:.92});
  for(let i=0;i<11;i++){const v=new Vox(),R=rng(i*97+3);const n=3+Math.floor(R()*4);for(let k=0;k<n;k++)v.box(k*2.6-n*1.3+R()*1.2,R()*1.4,R()*3-1.5,3+R()*3,1.6+R()*1.4,3+R()*2.5,'#ffffff');
    const m=new THREE.Mesh(toGeo(v.b),cm.clone());m.castShadow=true;m.position.set(rand(-160,160),rand(52,64),rand(-120,120));m.userData.v=rand(1.2,2.4);scene.add(m);clouds.push(m);}}
const boats=[];
for(let i=0;i<4;i++){const v=new Vox();v.box(0,-.45,0,1.6,.55,4.2,pick(['#3d74a8','#8e3b3b','#2f7a78','#e8b86b']));v.box(0,.1,0,1.8,.12,4.4,C.trim);v.box(0,.2,0,.12,3.4,.12,C.wood2);v.box(.08,.9,.4,.06,2.4,1.9,'#f6efe0');v.box(.08,.9,-.9,.06,1.6,.9,'#f6efe0');
  const m=new THREE.Mesh(toGeo(v.b),matBody);m.castShadow=true;scene.add(m);boats.push({m,a:i/4*6.28+rand(0,1),sp:rand(.012,.022)*(i%2?1:-1),off:rand(10,22)});}
const gulls=[];
{const v=new Vox();v.box(0,0,0,.25,.2,.7,'#f7f5ef');v.box(-.55,.05,0,.9,.06,.35,'#e8e6df');v.box(.55,.05,0,.9,.06,.35,'#e8e6df');const g=toGeo(v.b);
  for(let i=0;i<7;i++){const m=new THREE.Mesh(g,matBody);scene.add(m);gulls.push({m,a:rand(0,6.28),r:rand(25,70),h:rand(14,24),sp:rand(.08,.16),ph:rand(0,9)});}}
{ // grass tufts and wildflowers, cleared with the wild trees
  const tuft=new Vox();tuft.box(0,0,0,.14,.38,.14,'#ffffff');tuft.box(.16,0,.06,.12,.28,.12,'#ffffff');
  const flower=new Vox();flower.box(0,0,0,.08,.3,.08,'#5f8c46');flower.box(0,.3,0,.2,.16,.2,'#ffffff');
  const mk=(vox,k,count,colors,test)=>{const pts=[];for(let i=0;i<count*4&&pts.length<count;i++){const x=rand(-68,68),z=rand(-68,68);if(landDist(x,z)>3&&test(x,z))pts.push([x,z]);}
    const g=toGeo(vox.b);const im=new THREE.InstancedMesh(g,new THREE.MeshLambertMaterial({vertexColors:true}),pts.length);const m=new THREE.Matrix4();
    pts.forEach(([x,z],i)=>{const s=.8+Math.random()*.7;m.compose(new THREE.Vector3(x,0,z),new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),Math.random()*6),new THREE.Vector3(s,s,s));im.setMatrixAt(i,m);im.setColorAt(i,new THREE.Color(pick(colors)));wild.push({x,z,k,i,alive:true,s:1});});
    im.receiveShadow=true;wildMesh[k]=im;scene.add(im);};
  mk(tuft,'tuft',LOW?900:1600,['#5f8f3f','#6e9e48','#7fae54','#9db85c'],()=>true);
  mk(flower,'flower',LOW?250:450,FLOW,(x,z)=>vnoise(x*.09+40,z*.09)>.55);}
const dustGeo=new THREE.BoxGeometry(.35,.35,.35),dustMat=new THREE.MeshBasicMaterial({color:'#efe4c8',transparent:true,depthWrite:false});const dusts=[];
function dust(x,z,r,n=10){for(let i=0;i<n;i++){const m=new THREE.Mesh(dustGeo,dustMat.clone());const a=Math.random()*6.28;m.position.set(x+Math.cos(a)*r*.7,.3,z+Math.sin(a)*r*.7);scene.add(m);dusts.push({m,vx:Math.cos(a)*rand(1,2.5),vz:Math.sin(a)*rand(1,2.5),vy:rand(1,2.4),t:0});}}
const pops=[];
function popIn(b){b.obj.scale.set(.9,.02,.9);pops.push({b,t:0});dust(b.x,b.z,b.r,B[b.t].cat==='dec'?4:12);}
const easeBack=t=>1+2.2*Math.pow(t-1,3)+1.2*Math.pow(t-1,2);
function updateFX(dt,sp){waterU.value+=dt;
  for(const c of clouds){c.position.x+=c.userData.v*dt*(sp?1:.3);if(c.position.x>170)c.position.x=-170;const dc=c.position.distanceTo(camera.position);c.material.opacity=.92*clamp((dc-14)/26,0,1);c.visible=c.material.opacity>.02;}
  for(const b of boats){b.a+=b.sp*dt*(sp?1:.3);const r=shoreAt(b.a)+b.off;b.m.position.set(Math.cos(b.a)*r,Math.sin(T*1.3+b.a*5)*.12,Math.sin(b.a)*r);b.m.rotation.y=-b.a+(b.sp>0?Math.PI:0);b.m.rotation.z=Math.sin(T*.9+b.a)*.05;}
  for(const g of gulls){g.a+=g.sp*dt;g.m.position.set(Math.cos(g.a)*g.r,g.h+Math.sin(T+g.ph)*1.2,Math.sin(g.a)*g.r);g.m.rotation.y=-g.a;g.m.scale.y=1+Math.sin(T*7+g.ph)*.6;}
  for(let i=pops.length-1;i>=0;i--){const p=pops[i];p.t+=dt/.5;const k=Math.min(1,p.t),e=easeBack(k);p.b.obj.scale.set(.9+.1*k,Math.max(.02,e),.9+.1*k);if(k>=1){p.b.obj.scale.set(1,1,1);pops.splice(i,1);}}
  for(let i=dusts.length-1;i>=0;i--){const d=dusts[i];d.t+=dt;d.m.position.x+=d.vx*dt;d.m.position.z+=d.vz*dt;d.m.position.y+=d.vy*dt;d.vy-=3*dt;d.m.material.opacity=Math.max(0,1-d.t/.7);d.m.rotation.y+=dt*3;if(d.t>.7){scene.remove(d.m);d.m.material.dispose();dusts.splice(i,1);}}
  haloMat.opacity=nightK*.85;}

/* ---------- status icons over houses ---------- */
function iconTex(bg,txt){const c=document.createElement('canvas');c.width=c.height=64;const g=c.getContext('2d');g.fillStyle='rgba(0,0,0,.25)';g.beginPath();g.arc(33,35,26,0,7);g.fill();g.fillStyle=bg;g.beginPath();g.arc(32,32,26,0,7);g.fill();g.fillStyle='#fff';g.font='bold 36px Nunito,sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText(txt,32,34);return new THREE.CanvasTexture(c);}
const ICONM={road:new THREE.SpriteMaterial({map:iconTex('#e0624f','!'),depthTest:false}),sad:new THREE.SpriteMaterial({map:iconTex('#d9a03a','?'),depthTest:false})};
function updateIcons(){for(const h of houses()){const kind=!h.conn?'road':(h.res&&h.hap<40)||(!h.res&&h.hap<35)?'sad':null;
  if(!kind){if(h.icon){scene.remove(h.icon);h.icon=null;}continue;}
  if(!h.icon||h.icon.material!==ICONM[kind]){if(h.icon)scene.remove(h.icon);h.icon=new THREE.Sprite(ICONM[kind]);h.icon.scale.set(1.6,1.6,1);h.icon.renderOrder=5;h.icon.raycast=()=>{};scene.add(h.icon);}
  h.icon.position.set(h.x,(h.obj.userData.h||4)+1.4,h.z);}}

/* ---------- sound effects ---------- */
let sfxCtx=null;
function sfx(kind){try{if(!sfxCtx)sfxCtx=actx||new (window.AudioContext||window.webkitAudioContext)();const a=sfxCtx,t=a.currentTime,o=a.createOscillator(),g=a.createGain();g.connect(a.destination);o.connect(g);
  const env=(v,d)=>{g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v,t+.01);g.gain.exponentialRampToValueAtTime(.0001,t+d);o.start(t);o.stop(t+d+.05);};
  if(kind==='build'){o.type='triangle';o.frequency.setValueAtTime(330,t);o.frequency.exponentialRampToValueAtTime(660,t+.12);env(.12,.35);}
  else if(kind==='pop'){o.type='sine';o.frequency.setValueAtTime(880,t);o.frequency.exponentialRampToValueAtTime(1320,t+.06);env(.08,.18);}
  else if(kind==='tick'){o.type='sine';o.frequency.value=1200;env(.04,.06);}
  else if(kind==='demolish'){o.type='sawtooth';o.frequency.setValueAtTime(180,t);o.frequency.exponentialRampToValueAtTime(50,t+.3);env(.08,.35);}
  else if(kind==='coin'){o.type='square';o.frequency.setValueAtTime(988,t);o.frequency.setValueAtTime(1319,t+.09);env(.05,.4);}}catch(e){}}

/* ---------- conta (Supabase): login inteligente, sincronização entre aparelhos, ranking ---------- */
const CFG=window.PS_CONFIG||{};let sb=null,user=null;
try{if(window.supabase&&CFG.supabaseUrl)sb=window.supabase.createClient(CFG.supabaseUrl,CFG.supabaseKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});}catch(e){sb=null;}
const esc=x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const LS={get:k=>{try{return localStorage.getItem(k);}catch(e){return null;}},set:(k,v)=>{try{localStorage.setItem(k,v);}catch(e){}},del:k=>{try{localStorage.removeItem(k);}catch(e){}}};
function trad(e){const m=String(e&&e.message||e).toLowerCase();if(m.includes('invalid login'))return 'E-mail ou senha incorretos.';if(m.includes('not confirmed'))return 'Confirme seu e-mail pelo link que enviamos.';
  if(m.includes('already registered'))return 'Este e-mail já tem conta.';if(m.includes('rate limit')||m.includes('security purposes'))return 'Muitas tentativas seguidas. Espere um minuto e tente de novo.';
  if(m.includes('failed to fetch')||m.includes('network'))return 'Sem internet no momento.';if(m.includes('password should'))return 'Escolha uma senha mais forte (6+ caracteres).';return 'Algo deu errado: '+(e.message||e);}
function readLocal(){try{return JSON.parse(localStorage.getItem(KEY));}catch(e){return null;}}
function writeLocal(o){try{localStorage.setItem(KEY,JSON.stringify(o));}catch(e){}}

/* --- tela de login --- */
const AU=$('#auth');let aStep='',aEmail=LS.get('vc-email')||'',aPw='',pollT=null;
const ORDER=['1','2','3','mail','reset','choose','ok'];
function buildDeck(){const types=['vila','casa','teatro','sobrado','cafe','moinho','praca'],cols=['#e8907a','#9cc7d8','#f0cf6a','#a9d2b4','#c4b3dc','#f3e3c8','#e9a9b2'];
  $('#aDeck').innerHTML=types.map((t,i)=>`<div class="a-card${i===3?' c':''}" style="--i:${i-3};--d:${Math.abs(i-3)};transition-delay:${Math.abs(i-3)*55}ms"><div class="a-in" style="background:${cols[i]}"><img src="${thumbs[t]||''}" alt=""></div></div>`).join('')
   +'<span class="a-tag t1">@familia.moretti</span><span class="a-tag t2">+60 moedas</span><span class="a-tag t3">Dia 12 · 48 moradores</span>';}
function reveal(el){if(!el)return;if(!el.dataset.split){el.innerHTML=el.innerHTML.split(/(<em>.*?<\/em>)/).map(p=>p.startsWith('<em>')?p.slice(4,-5).split(' ').filter(Boolean).map(w=>`<span class="w acc">${w}</span>`).join(' '):p.split(' ').filter(Boolean).map(w=>`<span class="w">${w}</span>`).join(' ')).join(' ');el.dataset.split='1';}
  el.querySelectorAll('.w').forEach((w,i)=>{w.style.transitionDelay=(i*65)+'ms';});el.classList.remove('go');void el.offsetWidth;el.classList.add('go');}
function playIntro(){const d=$('#aDeck');d.classList.remove('fan');reveal($('#aH1'));setTimeout(()=>d.classList.add('fan'),620);}
function showAuth(step){if(photo)setPhoto(false);$('#menu').classList.add('hide');$('#ui').classList.add('hide');$$('.modal').forEach(m=>{if(m.id!=='menu')m.classList.add('hide');});inMenu=true;
  AU.classList.remove('hide');document.documentElement.classList.add('authbg');themeColor('#f3f2ee');if(!$('#aDeck').children.length)buildDeck();aStep='';AU.querySelectorAll('.a-step').forEach(s=>s.classList.remove('on'));goStep(step||'1');}
function hideAuth(){AU.classList.add('hide');document.documentElement.classList.remove('authbg');themeColor('#151b3c');stopPoll();}
function themeColor(c){const m=document.querySelector('meta[name=theme-color]');if(m)m.content=c;}
function goStep(s){const cur=AU.querySelector('.a-step.on'),nx=AU.querySelector(`.a-step[data-s="${s}"]`);if(!nx||cur===nx)return;const fwd=ORDER.indexOf(s)>=ORDER.indexOf(aStep||'1');
  if(cur){cur.classList.remove('on');cur.classList.add(fwd?'out-f':'out-b');setTimeout(()=>cur.classList.remove('out-f','out-b'),700);}
  nx.classList.remove('out-f','out-b');nx.classList.add(fwd?'in-f':'in-b');void nx.offsetWidth;nx.classList.remove('in-f','in-b');nx.classList.add('on');aStep=s;AU.dataset.step=s;
  const n=s==='1'?1:s==='2'?2:3;$$('.a-dots i').forEach((d,i)=>{d.classList.toggle('on',i<n);d.classList.toggle('cur',i===n-1);});
  $('#aBack').classList.toggle('hide',!['2','3','mail','reset'].includes(s));
  if(s==='1')playIntro();if(s==='2'){$('#aEmail').value=aEmail;$('#aErr2').textContent='';emailHint();}
  if(s==='3'){$('#aWho').textContent=aEmail;$('#aPass').value='';$('#aPass').type='password';$('#aErr3').textContent='';$('#aErr3').classList.remove('ok');$('#aForgot').classList.remove('hl');meter();}
  reveal(nx.querySelector('.a-h2'));const f=nx.querySelector('input');if(f&&!matchMedia('(pointer:coarse)').matches)setTimeout(()=>f.focus({preventScroll:true}),450);
  try{navigator.vibrate&&navigator.vibrate(8);}catch(e){}}
$('#aBack').onclick=()=>{stopPoll();goStep(aStep==='2'?'1':'2');};
$('#aStart').onclick=()=>goStep('2');
function guest(){LS.set('vc-guest','1');hideAuth();showMenu();}
$('#aGuest').onclick=guest;$('#aGuest2').onclick=guest;
{const deck=$('#aDeck');AU.addEventListener('pointermove',e=>{if(aStep!=='1'||e.pointerType!=='mouse')return;const x=e.clientX/innerWidth-.5,y=e.clientY/innerHeight-.5;deck.style.transform=`rotateX(${-y*6}deg) rotateY(${x*8}deg)`;});}
/* e-mail */
const TYPO={'gmial.com':'gmail.com','gmai.com':'gmail.com','gmal.com':'gmail.com','gmail.co':'gmail.com','gmail.con':'gmail.com','gnail.com':'gmail.com','gamil.com':'gmail.com','hotmial.com':'hotmail.com','hotmai.com':'hotmail.com','hotmail.co':'hotmail.com','hotmal.com':'hotmail.com','outlok.com':'outlook.com','outloo.com':'outlook.com','outlook.co':'outlook.com','yaho.com':'yahoo.com','yahoo.com.b':'yahoo.com.br','iclod.com':'icloud.com','icloud.co':'icloud.com','uol.com':'uol.com.br'};
const okEmail=e=>/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);
function emailHint(){const v=$('#aEmail').value.trim().toLowerCase(),d=v.split('@')[1],fix=d&&TYPO[d],b=$('#aFix');b.classList.toggle('hide',!fix);
  if(fix){b.dataset.v=v.split('@')[0]+'@'+fix;b.innerHTML=`Você quis dizer <b>${esc(b.dataset.v)}</b>?`;}$('#aNext2').disabled=!okEmail(v);}
$('#aEmail').addEventListener('input',()=>{$('#aErr2').textContent='';emailHint();});
$('#aFix').onclick=()=>{$('#aEmail').value=$('#aFix').dataset.v;emailHint();$('#aEmail').focus();};
function next2(){const v=$('#aEmail').value.trim().toLowerCase();if(!okEmail(v)){$('#aErr2').textContent='Confira o e-mail digitado.';shake('#aEmail');return;}
  aEmail=v;LS.set('vc-email',v);if(!sb){$('#aErr2').textContent='Sem conexão com o servidor agora. Você pode jogar sem conta.';return;}goStep('3');}
$('#aNext2').onclick=next2;$('#aEmail').addEventListener('keydown',e=>{if(e.key==='Enter')next2();});
/* senha */
function meter(){const v=$('#aPass').value;let sc=0;if(v.length>=6)sc++;if(v.length>=10)sc++;if(/[A-Z]/.test(v)&&/[a-z]/.test(v))sc++;if(/\d/.test(v)&&/[^A-Za-z0-9]/.test(v))sc++;
  const m=$('#aMeter');m.style.setProperty('--p',v?Math.max(.12,sc/4):0);m.dataset.l=v?(v.length<6?'muito curta':['fraca','razoável','boa','forte','forte'][Math.max(0,sc-1)]):'';m.dataset.s=v.length<6?0:sc;$('#aNext3').disabled=v.length<6;}
$('#aPass').addEventListener('input',()=>{$('#aErr3').textContent='';meter();});
$('#aPass').addEventListener('keydown',e=>{$('#aCaps').classList.toggle('hide',!(e.getModifierState&&e.getModifierState('CapsLock')));if(e.key==='Enter')submitPw();});
$('#aEye').onclick=()=>{const p=$('#aPass'),sh=p.type==='password';p.type=sh?'text':'password';$('#aEye').setAttribute('aria-label',sh?'Esconder senha':'Mostrar senha');$('#aEye').classList.toggle('on',sh);};
$('#aNext3').onclick=()=>submitPw();
function busy(b,id){const el=$(id);el.disabled=b;el.classList.toggle('busy',b);}
function shake(sel){const e=$(sel);e.classList.remove('shake');void e.offsetWidth;e.classList.add('shake');}
async function submitPw(){const pw=$('#aPass').value;if(pw.length<6){$('#aErr3').textContent='A senha precisa de pelo menos 6 caracteres.';return;}if($('#aNext3').classList.contains('busy'))return;busy(true,'#aNext3');
  try{const r=await sb.auth.signInWithPassword({email:aEmail,password:pw});
    if(!r.error){busy(false,'#aNext3');return afterLogin();}
    const m=String(r.error.message).toLowerCase();
    if(m.includes('not confirmed')){aPw=pw;try{await sb.auth.resend({type:'signup',email:aEmail,options:{emailRedirectTo:location.origin}});}catch(e){}busy(false,'#aNext3');return goMail();}
    if(m.includes('invalid login')){const s=await sb.auth.signUp({email:aEmail,password:pw,options:{emailRedirectTo:location.origin}});
      if(s.error){$('#aErr3').textContent=trad(s.error);shake('#aPass');}
      else if(s.data.user&&Array.isArray(s.data.user.identities)&&!s.data.user.identities.length){$('#aErr3').textContent='Essa conta já existe e a senha não confere.';$('#aForgot').classList.add('hl');shake('#aPass');}
      else if(s.data.session){busy(false,'#aNext3');return afterLogin();}
      else{aPw=pw;busy(false,'#aNext3');return goMail();}}
    else $('#aErr3').textContent=trad(r.error);
  }catch(e){$('#aErr3').textContent=trad(e);}
  busy(false,'#aNext3');}
function goMail(){$('#aMailTo').textContent=aEmail;const d=aEmail.split('@')[1]||'';const link=/gmail/.test(d)?'https://mail.google.com':/(outlook|hotmail|live)/.test(d)?'https://outlook.live.com/mail':/yahoo/.test(d)?'https://mail.yahoo.com':/(icloud|me\.com)/.test(d)?'https://www.icloud.com/mail':'';
  const a=$('#aOpenMail');a.classList.toggle('hide',!link);if(link)a.href=link;goStep('mail');startPoll();}
function startPoll(){stopPoll();const t0=Date.now();pollT=setInterval(async()=>{if(Date.now()-t0>20*60e3){stopPoll();return;}
  try{const r=await sb.auth.signInWithPassword({email:aEmail,password:aPw});if(!r.error){stopPoll();afterLogin();}}catch(e){}},4000);}
function stopPoll(){if(pollT){clearInterval(pollT);pollT=null;}}
$('#aResend').onclick=async()=>{try{const {error}=await sb.auth.resend({type:'signup',email:aEmail,options:{emailRedirectTo:location.origin}});toast(error?trad(error):'Link reenviado');}catch(e){toast(trad(e));}};
$('#aForgot').onclick=async()=>{if(!sb)return;const el=$('#aErr3');try{const {error}=await sb.auth.resetPasswordForEmail(aEmail,{redirectTo:location.origin});el.textContent=error?trad(error):'Enviamos um link para você criar uma senha nova.';el.classList.toggle('ok',!error);}catch(e){el.textContent=trad(e);}};
$('#aNew').addEventListener('keydown',e=>{if(e.key==='Enter')$('#aSaveNew').click();});
$('#aSaveNew').onclick=async()=>{const pw=$('#aNew').value;if(pw.length<6){$('#aErrR').textContent='Use pelo menos 6 caracteres.';return;}busy(true,'#aSaveNew');
  try{const {error}=await sb.auth.updateUser({password:pw});busy(false,'#aSaveNew');if(error){$('#aErrR').textContent=trad(error);return;}toast('Senha atualizada');recovering=false;afterLogin();}catch(e){busy(false,'#aSaveNew');$('#aErrR').textContent=trad(e);}};

/* --- depois de entrar: decidir qual cidade abrir --- */
const summ=o=>`${esc(o.city||'Cidade sem nome')}<small>${(o.S&&o.S.pop)||0} moradores · Dia ${(o.S&&o.S.day)||1} · ${(o.b||[]).length} construções${o.ts?' · '+new Date(o.ts).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}):''}</small>`;
let pendingChoice=null;
async function afterLogin(){stopPoll();aPw='';try{const {data}=await sb.auth.getUser();user=data.user;}catch(e){}if(!user)return;LS.del('vc-guest');accUI();
  const cloud=await cloudFetch(),raw=readLocal(),local=raw&&(!raw.owner||raw.owner===user.id)?raw:null;
  if(local&&local.owner!==user.id&&cloud&&local.ts!==cloud.ts&&(local.b||[]).length){pendingChoice={local,cloud};$('#aOptL').innerHTML='<b>Neste aparelho</b>'+summ(local);$('#aOptC').innerHTML='<b>Na sua conta</b>'+summ(cloud);if(AU.classList.contains('hide'))showAuth('choose');else goStep('choose');return;}
  if(local&&local.owner!==user.id&&!cloud){local.owner=user.id;local.ts=Date.now();writeLocal(local);}
  welcome(cloud);}
function welcome(cloud){lockLandscape();if(AU.classList.contains('hide')){enterBest(cloud,true);return;}$('#aOkCity').textContent=user&&user.email?`Conectado como ${user.email}`:'';goStep('ok');setTimeout(()=>{hideAuth();enterBest(cloud,true);},1400);}
$('#aOptL').onclick=()=>{const {local}=pendingChoice;local.owner=user.id;local.ts=Date.now();writeLocal(local);setSynced(0);welcome(null);cloudPush(true);};
$('#aOptC').onclick=()=>{const {cloud}=pendingChoice;writeLocal(cloud);setSynced(cloud.ts||0);welcome(cloud);};
function enterBest(cloud,greet){const local=readLocal();const mine=local&&user&&local.owner===user.id?local:null;let best=null;
  if(cloud&&mine)best=(cloud.ts||0)>=(mine.ts||0)?cloud:mine;else best=cloud||mine;
  if(best){if(best===cloud){writeLocal(cloud);setSynced(cloud.ts||0);}startGame(null,true,best);lastFocus=Date.now();if(greet)toast(best===cloud&&cloud.dev&&cloud.dev!==DEV?'Continuando de onde você parou no outro aparelho':'Bem-vindo de volta!');if(best!==cloud)cloudPush();}
  else showMenu();}

/* --- sincronização --- */
let syncedTs=Number(LS.get('vc-synced')||0),pushing=false,lastFocus=Date.now(),syncErr=false;
function setSynced(t){syncedTs=t;LS.set('vc-synced',String(t));syncErr=false;syncUI();}
async function cloudFetch(){if(!sb||!user)return null;try{const {data,error}=await sb.from('saves').select('data').eq('user_id',user.id).maybeSingle();if(error)throw error;return data?data.data:null;}catch(e){return null;}}
async function cloudTs(){const {data,error}=await sb.from('saves').select('ts:data->ts').eq('user_id',user.id).maybeSingle();if(error)throw error;return data?Number(data.ts)||0:0;}
async function cloudPush(force){if(!sb||!user||pushing)return;const local=readLocal();if(!local||local.owner!==user.id)return;if(!force&&(local.ts||0)<=syncedTs)return;pushing=true;
  try{const ct=await cloudTs();if(!force&&ct>syncedTs&&ct>(local.ts||0)){pushing=false;return applyCloud();}
    const {error}=await sb.from('saves').upsert({user_id:user.id,data:local});if(error)throw error;setSynced(local.ts||Date.now());
    if(local.S&&local.S.mode==='campaign')await sb.from('ranking').upsert({user_id:user.id,city:(local.city||'Cidade sem nome').slice(0,32),pop:clamp(local.S.pop|0,0,100000),happiness:clamp(local.S.hap|0,0,100),day:Math.max(1,local.S.day|0),buildings:(local.b||[]).length,goals:clamp(local.S.obj|0,0,100)});
  }catch(e){syncErr=true;syncUI();}pushing=false;}
async function cloudCheck(){if(!sb||!user||pushing||!AU.classList.contains('hide'))return;try{const ct=await cloudTs(),local=readLocal(),lt=local&&local.owner===user.id?(local.ts||0):0;
  if(ct>Math.max(lt,syncedTs))await applyCloud();else if(lt>syncedTs)cloudPush();}catch(e){}}
async function applyCloud(){const c=await cloudFetch();if(!c)return;writeLocal(c);setSynced(c.ts||0);
  if(!inMenu&&!photo){const handoff=Date.now()-lastFocus>4000;startGame(null,true,c);
    if(handoff&&c.dev!==DEV){setSpeed(0);$('#handoff').classList.remove('hide');}else toast('Continuando de onde você parou no outro aparelho');}
  else $('#mCont').classList.toggle('hide',!hasSave());}
$('#hoTake').onclick=()=>{$('#handoff').classList.add('hide');setSpeed(1);};
function syncUI(){const t=syncedTs?new Date(syncedTs).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}):'';const txt=!user?'':syncErr?'Sem conexão: salvando neste aparelho e sincronizando quando voltar a internet.':syncedTs?`Sincronizado às ${t}. Abra em outro aparelho e continue de onde parou.`:'Sincronizando…';
  const el=$('#accSync');if(el)el.textContent=txt;$('#bAcc').classList.toggle('cloud',!!user&&!syncErr);$('#bAcc').title=txt;}
setInterval(()=>{if(document.hidden||!user)return;save();cloudPush();},8000);
setInterval(()=>{if(!document.hidden&&user)cloudCheck();},15000);
document.addEventListener('visibilitychange',()=>{if(document.hidden){save();cloudPush();}else{lastFocus=Date.now();cloudCheck();}});
addEventListener('focus',()=>{lastFocus=Date.now();cloudCheck();});
addEventListener('pagehide',()=>{save();cloudPush();});
addEventListener('online',()=>{cloudCheck();});

/* --- conta, menu e início --- */
function accUI(){$('#bAccL').textContent=user?'Conta':'Entrar';$('#mAcc .lb').textContent=user?'Sua conta':'Entrar e sincronizar';if(user){$('#accWho').textContent=user.email;$('#accCity').value=cityName;}syncUI();}
function openAcc(){if(!user){showAuth(sb?'2':'1');return;}accUI();$('#acc').classList.remove('hide');}
$('#bAcc').onclick=openAcc;$('#mAcc').onclick=openAcc;
$('#accCity').addEventListener('change',e=>{cityName=e.target.value.trim().slice(0,32);LS.set('ps-city',cityName);rev++;save();cloudPush();});
$('#cSync').onclick=async()=>{save();await cloudPush(true);await cloudCheck();toast(syncErr?'Sem conexão agora':'Sincronizado');};
$('#accOutBtn').onclick=async()=>{save();await cloudPush();try{await sb.auth.signOut();}catch(e){}user=null;LS.del('vc-synced');syncedTs=0;LS.del('vc-guest');accUI();showAuth('1');};
if(sb)sb.auth.onAuthStateChange((ev,ss)=>{if(ev==='PASSWORD_RECOVERY'){recovering=true;user=ss?ss.user:null;showAuth('reset');return;}if(ev==='SIGNED_OUT'){user=null;accUI();}else if(ss&&ss.user)user=ss.user;});
function showMenu(){hideAuth();$('#ui').classList.add('hide');$('#menu').classList.remove('hide');inMenu=true;$('#mCont').classList.toggle('hide',!hasSave());accUI();}
let recovering=false;
async function boot(){let s=null;if(sb){try{s=(await sb.auth.getSession()).data.session;}catch(e){}}user=s?s.user:null;accUI();
  if(recovering||/type=recovery/.test(location.hash)){recovering=true;return showAuth('reset');}
  if(user){await afterLogin();return;}
  if(LS.get('vc-guest'))showMenu();else showAuth('1');}
async function openRank(){$('#rank').classList.remove('hide');const L=$('#rankList');if(!sb){L.innerHTML='<p class="objp">Sem conexão com o servidor.</p>';return;}L.innerHTML='<p class="objp">Carregando…</p>';
  try{const {data,error}=await sb.from('ranking').select('user_id,city,pop,happiness,day,goals').order('pop',{ascending:false}).limit(20);if(error)throw error;
    L.innerHTML=data.length?data.map((r,i)=>`<div class="rk${user&&r.user_id===user.id?' me':''}"><span class="pos">${i+1}</span><span><b>${esc(r.city)}</b><small>Dia ${r.day} · ${r.goals} objetivos · ${r.happiness}% de felicidade</small></span><span class="num">${r.pop.toLocaleString('pt-BR')} moradores</span></div>`).join('')
      :'<p class="objp">Ninguém no ranking ainda. Entre na sua conta e jogue a campanha para ser o primeiro.</p>';}catch(e){L.innerHTML=`<p class="objp">${esc(trad(e))}</p>`;}}
$('#bRank').onclick=openRank;$('#mRank').onclick=openRank;
function confirmNew(btn,mode){const lb=btn.querySelector('.lb')||btn;if(hasSave()&&btn.dataset.arm!=='1'){btn.dataset.arm='1';btn.classList.add('warn');const t=btn.dataset.t||(btn.dataset.t=lb.textContent);lb.textContent='Apagar a cidade atual? Toque de novo';setTimeout(()=>{btn.dataset.arm='';btn.classList.remove('warn');lb.textContent=t;},3500);return;}
  btn.dataset.arm='';btn.classList.remove('warn');if(btn.dataset.t)lb.textContent=btn.dataset.t;startGame(mode);}
$('#mCamp').onclick=e=>confirmNew(e.currentTarget,'campaign');$('#mSand').onclick=e=>confirmNew(e.currentTarget,'sandbox');


/* ---------- tela cheia no iPhone, retrato e toque com animação ---------- */
const isTouch=matchMedia('(pointer:coarse)').matches;
function fitApp(){const st=navigator.standalone||matchMedia('(display-mode: standalone)').matches||matchMedia('(display-mode: fullscreen)').matches;
  const port=innerHeight>=innerWidth,full=st&&isTouch?(port?Math.max(screen.height,screen.width):Math.min(screen.height,screen.width)):0;
  const big=full&&full>innerHeight;document.documentElement.style.setProperty('--appH',big?full+'px':'100%');document.documentElement.style.setProperty('--gap',big?(full-innerHeight)+'px':'0px');resize();}
addEventListener('resize',fitApp);addEventListener('orientationchange',()=>setTimeout(fitApp,250));fitApp();
function lockLandscape(){if(!isTouch)return;try{const o=screen.orientation;if(o&&o.lock)o.lock('landscape').catch(()=>{});}catch(e){}}
['pointerdown'].forEach(ev=>document.addEventListener(ev,e=>{const t=e.target.closest('.btn,.tbtn,.cat,.item,.mrow,.mhero,.speed button,.a-pill,.a-opt,.rnode');if(!t)return;
  const r=t.getBoundingClientRect(),d=Math.max(r.width,r.height)*2.2,s=document.createElement('span');s.className='rip';s.style.cssText=`width:${d}px;height:${d}px;left:${e.clientX-r.left-d/2}px;top:${e.clientY-r.top-d/2}px`;
  t.appendChild(s);setTimeout(()=>s.remove(),650);try{if(isTouch&&navigator.vibrate)navigator.vibrate(6);}catch(_){}} ,{passive:true}));

/* ---------- layout: panels sit below the real top-bar height ---------- */
const topRO=new ResizeObserver(()=>{document.documentElement.style.setProperty('--topH',$('#top').getBoundingClientRect().height+'px');});topRO.observe($('#top'));

/* ---------- PWA ---------- */
let installEvt=null;
addEventListener('beforeinstallprompt',e=>{e.preventDefault();installEvt=e;$('#bInstall').classList.remove('hide');$('#mInstall').classList.remove('hide');});
async function doInstall(){if(!installEvt)return;installEvt.prompt();try{await installEvt.userChoice;}catch(e){}installEvt=null;$('#bInstall').classList.add('hide');$('#mInstall').classList.add('hide');}
$('#bInstall').onclick=doInstall;$('#mInstall').onclick=doInstall;
addEventListener('appinstalled',()=>toast('Vice City instalado!'));
if('serviceWorker' in navigator&&/^https?:$/.test(location.protocol))addEventListener('load',()=>navigator.serviceWorker.register('/sw.js').catch(()=>{}));

boot();
}
