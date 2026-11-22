{
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const rand=(a,b)=>a+Math.random()*(b-a), pick=a=>a[Math.floor(Math.random()*a.length)], clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
function hash(x,z){const s=Math.sin(x*127.1+z*311.7)*43758.5453;return s-Math.floor(s);}
function vnoise(x,z){const xi=Math.floor(x),zi=Math.floor(z),xf=x-xi,zf=z-zi,u=xf*xf*(3-2*xf),v=zf*zf*(3-2*zf);const a=hash(xi,zi),b=hash(xi+1,zi),c=hash(xi,zi+1),d=hash(xi+1,zi+1);return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v;}
const MAPB=150;
/* Litoral inspirado no Rio: praias em arco entre pontas de pedra, baía a leste com ilhas, lagoa atrás da praia,
   morros de granito colados no mar (tipo Pão de Açúcar e Dois Irmãos), serra com mata ao norte e ilhas ao largo. */
const HEADS=[[-300,76],[-190,82],[-112,84],[-38,80],[66,78],[150,82],[300,76]];
function coastZ(x){let i=0;while(i<HEADS.length-2&&x>HEADS[i+1][0])i++;const [ax,az]=HEADS[i],[bx,bz]=HEADS[i+1],t=clamp((x-ax)/(bx-ax),0,1),w=bx-ax;
  const dep=Math.min(24,w*.22);return az+(bz-az)*t-dep*Math.pow(Math.sin(Math.PI*t),.75)+(vnoise(x*.05,1.7)-.5)*2.4;}
// morros: x, z, altura, raio, curva (e), ombro (p), pedra (1 = paredão de granito tipo Pão de Açúcar)
const MORROS=[
  [84,66,27,11.5,1.4,3,1],[72,55,13,9,1.3,2.6,1],                  // Pão de Açúcar e Urca na boca da baía
  [127,73,20,12,1,2,0],[141,60,12,10,1,2,0],                   // Niterói, do outro lado da boca
  [-118,72,30,13,1.5,2.2,1],[-104,62,21,10.5,1.5,2.2,1],          // Dois Irmãos
  [-38,82,7,6,1.2,2.5,1],                                         // pedra do Arpoador
  [-190,84,22,12,1.3,2.4,1],[-207,70,16,12,1,2,0],                // ponta oeste
  [-62,-106,50,30,1.25,2,0],[-64,-104,12,7,1.2,2.5,1],[-114,-126,42,32,1.3,2,0],[-160,-98,34,28,1.3,2,0],[-16,-142,38,30,1.3,2,0],[-205,-132,40,34,1.3,2,0], // serra com mata (Corcovado/Tijuca)
  [34,-62,11,14,1.4,2,0],                                      // morrinho verde no meio da cidade
  [-72,124,11,7,1.2,2.5,1],[-53,131,7,5,1.2,2.5,1],[-88,134,5,4,1.1,2.5,1],[12,162,13,10,1.3,2.4,1], // ilhas ao largo
  [122,-34,7,9,1,2,0],[100,-54,5,6,1,2,0],[140,8,6,6,1.2,2.5,1]    // ilhas dentro da baía
];
let HR=0;// pedra do morro dominante no último hillAt
function hillAt(x,z){let y=0;HR=0;for(const k of MORROS){const dx=x-k[0],dz=z-k[1];if(Math.abs(dx)>k[3]*1.1||Math.abs(dz)>k[3]*1.1)continue;const d=Math.hypot(dx,dz)/(k[3]*1.08);
    if(d<1){const v=k[2]*Math.pow(1-Math.pow(d,k[5]),k[4]);if(v>y){y=v;HR=k[6];}}}
  if(y>0)y*=.9+vnoise(x*.11,z*.11)*.2;return y;}
function morroLand(x,z){let m=-99;for(const k of MORROS){const v=k[3]-Math.hypot(x-k[0],z-k[1]);if(v>m)m=v;}return m;}
function bayWater(x,z){const e=(1-Math.hypot((x-114)/42,(z+16)/62))*36;      // baía (tipo Guanabara)
  const mouth=z>18&&z<104?10.5-Math.abs(x-(104-4*clamp((z-24)/70,0,1))):-99;  // canal estreito ligando a baía ao mar
  const lag=(1-Math.hypot((x+74)/19,(z-6)/12))*11;                         // lagoa atrás da praia
  return Math.max(e,mouth,lag);}
function landDist(x,z){const c=coastZ(x),dc=(coastZ(x+1)-coastZ(x-1))/2,sea=(c-z)/Math.sqrt(1+dc*dc);
  return Math.max(Math.min(sea,-bayWater(x,z)),morroLand(x,z));}
function shoreAt(){return 0;}
function rng(seed){let s=(seed>>>0)||1;return()=>{s^=s<<13;s^=s>>>17;s^=s<<5;return((s>>>0)%100000)/100000;};}

/* ---------- renderer & scene ---------- */
const canvas=$('#c');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,preserveDrawingBuffer:true});
const LOW=matchMedia('(pointer:coarse)').matches||(navigator.hardwareConcurrency||8)<=4;
renderer.setPixelRatio(Math.min(devicePixelRatio,LOW?1.5:2));
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
const scene=new THREE.Scene();
scene.fog=new THREE.Fog('#a8d8ea',170,460);
const camera=new THREE.PerspectiveCamera(40,1,.5,900);
const hemi=new THREE.HemisphereLight('#dff1ff','#7a6a4a',.55);scene.add(hemi);
const sun=new THREE.DirectionalLight('#fff3dc',1);sun.castShadow=true;
sun.shadow.mapSize.set(LOW?1024:2048,LOW?1024:2048);Object.assign(sun.shadow.camera,{left:-70,right:70,top:70,bottom:-70,near:1,far:300});sun.shadow.bias=-.0006;
scene.add(sun);scene.add(sun.target);
function resize(){const w=canvas.clientWidth||innerWidth,h=canvas.clientHeight||innerHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.fov=camera.aspect<1?56:40;camera.updateProjectionMatrix();}
addEventListener('resize',resize);resize();try{new ResizeObserver(()=>resize()).observe(canvas);}catch(e){}

/* ---------- voxel geometry ---------- */
const FACES=[[[1,0,0],[[1,0,1],[1,0,0],[1,1,0],[1,1,1]]],[[-1,0,0],[[0,0,0],[0,0,1],[0,1,1],[0,1,0]]],[[0,1,0],[[0,1,1],[1,1,1],[1,1,0],[0,1,0]]],[[0,-1,0],[[0,0,0],[1,0,0],[1,0,1],[0,0,1]]],[[0,0,1],[[0,0,1],[1,0,1],[1,1,1],[0,1,1]]],[[0,0,-1],[[1,0,0],[0,0,0],[0,1,0],[1,1,0]]]];
class Vox{constructor(){this.b=[];this.g=[];this.t=[];this.tg=[];this.ox=0;this.oy=0;this.oz=0;}
  box(x,y,z,w,h,d,col,glow){const c=new THREE.Color(col);const j=1+(Math.random()-.5)*.07;c.r*=j;c.g*=j;c.b*=j;(glow?this.g:this.b).push([this.ox+x-w/2,this.oy+y,this.oz+z-d/2,w,h,d,c]);}
  at(x,z,fn,y=0){const a=this.ox,b=this.oy,c=this.oz;this.ox+=x;this.oy+=y;this.oz+=z;fn();this.ox=a;this.oy=b;this.oz=c;}
  col(col,k=.06){const c=new THREE.Color(col);const j=1+(Math.random()-.5)*k;c.r*=j;c.g*=j;c.b*=j;return c;}
  tri(a,b,c,col,glow){const o=[this.ox,this.oy,this.oz];(glow?this.tg:this.t).push([a[0]+o[0],a[1]+o[1],a[2]+o[2],b[0]+o[0],b[1]+o[1],b[2]+o[2],c[0]+o[0],c[1]+o[1],c[2]+o[2],col]);}
  quad(a,b,c,d,col,glow){this.tri(a,b,c,col,glow);this.tri(a,c,d,col,glow);}
  /* telhado de duas águas (cumeeira no eixo mais longo) */
  gable(x,y,z,w,h,d,col,end){const c=this.col(col),e=this.col(end||col),Z=d>w;const L=(Z?d:w)/2,D=(Z?w:d)/2,yt=y+h;
    const P=(u,yy,v)=>Z?[x+v,yy,z+u]:[x+u,yy,z+v],T=(p,q,r,cc)=>Z?this.tri(p,r,q,cc):this.tri(p,q,r,cc);
    T(P(-L,y,D),P(L,y,D),P(L,yt,0),c);T(P(-L,y,D),P(L,yt,0),P(-L,yt,0),c);T(P(L,y,-D),P(-L,y,-D),P(-L,yt,0),c);T(P(L,y,-D),P(-L,yt,0),P(L,yt,0),c);
    T(P(-L,y,-D),P(-L,y,D),P(-L,yt,0),e);T(P(L,y,D),P(L,y,-D),P(L,yt,0),e);}
  /* telhado de quatro águas */
  hip(x,y,z,w,h,d,col){const c=this.col(col),c2=this.col(shade(col,-.06)),Z=d>w;const L=(Z?d:w)/2,D=(Z?w:d)/2,yt=y+h,rl=Math.max(0,L-D);
    const P=(u,yy,v)=>Z?[x+v,yy,z+u]:[x+u,yy,z+v],T=(p,q,r,cc)=>Z?this.tri(p,r,q,cc):this.tri(p,q,r,cc);
    T(P(-L,y,D),P(L,y,D),P(rl,yt,0),c);T(P(-L,y,D),P(rl,yt,0),P(-rl,yt,0),c);T(P(L,y,-D),P(-L,y,-D),P(-rl,yt,0),c);T(P(L,y,-D),P(-rl,yt,0),P(rl,yt,0),c);
    T(P(-L,y,-D),P(-L,y,D),P(-rl,yt,0),c2);T(P(L,y,D),P(L,y,-D),P(rl,yt,0),c2);}
  /* cilindro vertical (r2 = raio do topo; 0 = cone) */
  cyl(x,y,z,r,h,col,seg=10,r2,glow,cap=true){r2=r2===undefined?r:r2;const c=this.col(col),yt=y+h,P=(a,rr,yy)=>[x+Math.cos(a)*rr,yy,z+Math.sin(a)*rr];
    for(let i=0;i<seg;i++){const a0=i/seg*6.2832,a1=(i+1)/seg*6.2832;this.quad(P(a1,r,y),P(a0,r,y),P(a0,r2,yt),P(a1,r2,yt),c,glow);if(cap&&r2>0)this.tri([x,yt,z],P(a1,r2,yt),P(a0,r2,yt),c,glow);}}
  /* cilindro deitado no eixo x (rodas, canos) */
  cylX(x,y,z,r,len,col,seg=10){const c=this.col(col),x0=x-len/2,x1=x+len/2,P=(xx,a)=>[xx,y+Math.cos(a)*r,z+Math.sin(a)*r];
    for(let i=0;i<seg;i++){const a0=i/seg*6.2832,a1=(i+1)/seg*6.2832;this.quad(P(x0,a0),P(x1,a0),P(x1,a1),P(x0,a1),c);this.tri([x1,y,z],P(x1,a1),P(x1,a0),c);this.tri([x0,y,z],P(x0,a0),P(x0,a1),c);}}
  /* esfera orgânica (copas de árvore, cabeças, cúpulas) */
  ball(x,y,z,r,col,sy=1,det=1,jit=.14){const g=BALLG[det]||(BALLG[det]=new THREE.IcosahedronGeometry(1,det).toNonIndexed().attributes.position.array);const base=new THREE.Color(col);
    const J=(px,py,pz)=>1+(hash(px*13.1+py*7.7,pz*5.3+py*2.1)-.5)*jit;
    for(let i=0;i<g.length;i+=9){const v=[];for(let k=0;k<3;k++){const px=g[i+k*3],py=g[i+k*3+1],pz=g[i+k*3+2],j=J(px,py,pz);v.push([x+px*r*j,y+py*r*sy*j,z+pz*r*j]);}
      const ny=(g[i+1]+g[i+4]+g[i+7])/3,c=base.clone();c.multiplyScalar(.78+.3*(ny+1)/2*(1+(Math.random()-.5)*.08));this.tri(v[0],v[1],v[2],c);}}}
const BALLG=[];
function toGeo(list,tris=[]){const n=list.length*36+tris.length*3,P=new Float32Array(n*3),N=new Float32Array(n*3),C=new Float32Array(n*3);let k=0;
  for(const [x,y,z,w,h,d,c] of list)for(const [nn,cs] of FACES)for(const i of [0,1,2,0,2,3]){const q=cs[i];P[k*3]=x+q[0]*w;P[k*3+1]=y+q[1]*h;P[k*3+2]=z+q[2]*d;N[k*3]=nn[0];N[k*3+1]=nn[1];N[k*3+2]=nn[2];C[k*3]=c.r;C[k*3+1]=c.g;C[k*3+2]=c.b;k++;}
  const va=new THREE.Vector3(),vb=new THREE.Vector3(),vc=new THREE.Vector3();
  for(const t of tris){va.set(t[0],t[1],t[2]);vb.set(t[3],t[4],t[5]);vc.set(t[6],t[7],t[8]);const nrm=vb.clone().sub(va).cross(vc.clone().sub(va)).normalize();const c=t[9];
    for(let q=0;q<3;q++){P[k*3]=t[q*3];P[k*3+1]=t[q*3+1];P[k*3+2]=t[q*3+2];N[k*3]=nrm.x;N[k*3+1]=nrm.y;N[k*3+2]=nrm.z;C[k*3]=c.r;C[k*3+1]=c.g;C[k*3+2]=c.b;k++;}}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(P,3));g.setAttribute('normal',new THREE.BufferAttribute(N,3));g.setAttribute('color',new THREE.BufferAttribute(C,3));return g;}
const matBody=new THREE.MeshLambertMaterial({vertexColors:true,side:THREE.DoubleSide});
const matLight=new THREE.MeshBasicMaterial({vertexColors:true});
const matNeon=new THREE.MeshBasicMaterial({vertexColors:true,transparent:true,opacity:.4});
const matGlow=new THREE.MeshLambertMaterial({vertexColors:true,side:THREE.DoubleSide,emissive:new THREE.Color('#ffb24d'),emissiveIntensity:0});
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
  let y=.35+fl*fh;v.box(0,y,0,w+.5,.18,d+.5,C.trim);y+=.18;const rh=Math.min(w,d)*.42+.25;
  if(o.flat){v.box(0,y,0,w+.3,.35,d+.3,C.trim);return y+.35;}
  if(o.hip)v.hip(0,y,0,w+.7,rh,d+.7,roof);else v.gable(0,y,0,w+.7,rh,d+.7,roof,wall);
  if(o.chim){v.box(w*.28,y-.2,-d*.18,.5,rh*.75+.8,.5,C.stone);v.box(w*.28,y+rh*.75+.6,-d*.18,.62,.14,.62,C.stone2);}
  return y+rh;}
function pick2(R,a){return a[Math.floor(R()*a.length)];}
function tree(v,R,kind){const t=kind||(R()<.5?'olive':'pine');
  if(t==='olive'){v.cyl(0,0,0,.17,1.5,C.wood2,7,.12);v.ball(.25,1.75,.1,.95,pick2(R,OLIVE),.8);v.ball(-.35,1.95,-.2,.8,pick2(R,OLIVE),.85);v.ball(.05,2.25,.3,.7,pick2(R,OLIVE),.8);}
  else if(t==='pine'){v.cyl(0,0,0,.2,2.9,C.wood2,7,.14);v.ball(0,3.15,0,1.8,'#4f7d43',.42);v.ball(.4,3.55,-.2,1.2,'#5d8f4c',.4);}
  else if(t==='round'){v.cyl(0,0,0,.18,1.7,C.wood2,7,.13);v.ball(0,2.6,0,1.35,pick2(R,LEAF));v.ball(.6,2.2,.3,.9,pick2(R,LEAF));v.ball(-.5,2.3,-.4,.85,pick2(R,LEAF));}
  else if(t==='fruit'){v.cyl(0,0,0,.14,1.1,C.wood2,7,.11);v.ball(0,1.75,0,1,'#5f9a45',.9);for(let i=0;i<7;i++){const a=R()*6.28,h=1.4+R()*.9;v.ball(Math.cos(a)*.85,h,Math.sin(a)*.85,.13,R()<.5?'#e2462c':'#f0a032',1,0,0);}}
  else if(t==='palm'){for(let i=0;i<6;i++)v.cyl(Math.sin(i*.25)*.15*i,i*.6,0,.17-i*.01,.62,'#9b7650',6,.16-i*.01);const tx=.9,ty=3.6;v.ball(tx,ty,0,.28,'#7a5a36');
    for(let i=0;i<7;i++){const a=i/7*6.28;v.quad([tx,ty+.1,0],[tx+Math.cos(a)*1.9,ty-.5,Math.sin(a)*1.9+.25],[tx+Math.cos(a)*2.1,ty-.75,Math.sin(a)*2.1],[tx+Math.cos(a+.3)*.2,ty,Math.sin(a+.3)*.2],v.col('#4f9a48'));}}
  else{v.cyl(0,0,0,.13,.7,C.wood2,6,.1);v.ball(0,2.4,0,.72,'#3f6b3a',2.4);}}
const MODELS={
  casa:(v,R,c)=>house(v,R,{w:2.8+R()*.8,d:2.8+R()*.5,fl:1,wall:c,hip:R()<.5,chim:R()<.6}),
  sobrado:(v,R,c)=>house(v,R,{w:3.8+R()*.6,d:3.4,fl:2,wall:c,hip:R()<.5,chim:R()<.5,balcony:true}),
  vila:(v,R,c)=>{const w=6.2,d=5;house(v,R,{w,d,fl:3,wall:c,hip:true,balcony:true});const dome=R()<.5?'#6a8fb0':'#6f9c8a';
    for(const sx of [-1,1])v.at(sx*w/2,d/2-.6,()=>{const H=.35+3*2.1+1.2;v.cyl(0,0,0,.95,H,c,14);for(let f=0;f<3;f++)v.box(0,.35+f*2.1+.6,.94,.5,.8,.08,C.win,1);v.box(0,H,0,2.2,.15,2.2,C.trim);v.ball(0,H+.1,0,1.05,dome,.85,1,.02);v.cyl(0,H+.9,0,.06,.8,C.dark,5);});},
  fazenda:(v,R)=>{v.box(-1.4,0,0,5.4,.22,7,'#7a5a3a');for(let x=-3.6;x<=.9;x+=.9)v.box(x,.22,0,.55,.45+R()*.15,6.4,R()<.5?'#d9b44a':'#7aa346');
    v.at(2.6,-1.6,()=>house(v,R,{w:2.6,d:2.6,fl:1,wall:'#d9825e',hip:false}));v.at(2.6,1.9,()=>{v.box(0,0,0,1.6,.9,1.4,'#e3c35e');v.box(0,.9,0,1,.5,.9,'#d9b44a');});
    for(let z=-3.4;z<=3.4;z+=1.7){v.box(-4.3,0,z,.15,.8,.15,C.wood);}v.box(-4.3,.55,0,.08,.1,7,C.wood);},
  serraria:(v,R)=>{v.box(0,0,0,5,.2,4,'#8a7a5c');for(const [x,z] of [[-2.2,-1.7],[2.2,-1.7],[-2.2,1.7],[2.2,1.7]])v.box(x,.2,z,.3,2.6,.3,C.wood2);
    v.gable(0,2.8,0,5.4,1.1,4.2,ROOFS[0],C.wood);
    for(let i=0;i<3;i++)for(let j=0;j<3-i;j++)v.at(-1+j*.62+i*.31,-.6,()=>{v.cyl(0,.45+i*.5,-1.5,.25,0,C.wood,8);for(let q=0;q<1;q++)v.box(0,.2+i*.5,0,.5,.5,3,j%2?'#9b6a40':C.wood);});v.box(1.5,.2,.6,1.2,.9,1.6,C.wood2);v.box(1.5,1.1,.6,.08,.7,.7,'#c9cfd2');},
  moinho:(v,R,c,ex)=>{v.cyl(0,0,0,1.6,6,'#f2ede0',16,1.2);v.box(0,0,1.45,.9,1.5,.2,C.door);v.box(0,3,1.33,.5,.7,.1,C.win,1);
    v.cyl(0,6,0,1.4,1.9,ROOFS[1],16,0);
    const s2=new Vox();s2.box(0,-3.3,0,.25,6.6,.15,C.wood);s2.box(0,-.12,0,6.6,.25,.15,C.wood);for(const [x,y,w,h] of [[.55,1.6,.8,2.6],[-.55,-4.2,.8,2.6],[1.6,-.7,2.6,.8],[-4.2,.1,2.6,.8]])s2.box(x,y,0,w,h,.08,'#f3ead2');
    ex.spin=s2;ex.spinPos=[0,6.1,1.75];},
  oficina:(v,R,c)=>{const d=3.4;house(v,R,{w:4,d,fl:1,wall:c,hip:false,chim:true});for(let i=0;i<6;i++)v.box(-1.5+i*.6,2,d/2+.7,.6,.12,1.4,i%2?'#d9534f':'#f3efe6');v.box(-1.5,2,d/2+1.35,.1,-2,.1,C.wood);
    for(let i=0;i<3;i++)v.box(1.4-i*.7,.35,d/2+1,.6,.6,.6,C.wood);},
  cais:(v,R)=>{v.box(0,-.2,3,3,.25,9,C.wood);for(let z=-1;z<=7.5;z+=2.1)for(const x of [-1.4,1.4])v.box(x,-1.6,z,.3,1.7,.3,C.wood2);
    v.at(0,-2.6,()=>house(v,R,{w:3.6,d:2.6,fl:1,wall:'#efe2c4',hip:false}));for(let i=0;i<4;i++)v.box(-.8+(i%2)*.7,.05+Math.floor(i/2)*.6,4+i*.3,.6,.6,.6,i%2?C.wood:'#b58a5a');
    v.at(2.8,5,()=>{v.box(0,-.5,0,1.4,.6,3.6,'#3d74a8');v.box(0,.1,0,1.6,.12,3.8,C.trim);v.box(0,.2,0,.1,2.6,.1,C.wood2);v.box(.3,.9,.2,.05,1.4,1.4,'#f3ead2');});},
  poco:(v,R)=>{v.cyl(0,0,0,.95,.8,C.stone,12);v.cyl(0,.8,0,.75,.02,'#2f6b80',12);for(const x of [-.78,.78])v.box(x,.8,0,.16,1.5,.16,C.wood2);v.gable(0,2.25,0,2.2,.7,1.3,ROOFS[0]);v.cylX(0,1.9,0,.08,1.5,C.wood);v.cyl(.15,1.2,.15,.16,.3,C.wood,8);},
  mercado:(v,R)=>{v.box(0,0,0,6.5,.12,5.5,'#d8cbb0');const aw=[['#d9534f','#f3efe6'],['#3d74a8','#f3efe6'],['#5a8a46','#f0cf6a']];
    [[-2,-1.2],[2,-1.2],[0,1.4]].forEach(([x,z],i)=>v.at(x,z,()=>{v.box(0,.12,0,1.8,.8,1,C.wood);for(const px of [-.85,.85])v.box(px,.12,-.45,.12,2,.12,C.wood2);for(let k=0;k<5;k++)v.box(-.8+k*.4,2.1,0,.4,.12,1.6,aw[i][k%2]);
      for(let k=0;k<4;k++)v.box(-.6+k*.4,.92,.1,.3,.25,.3,pick2(R,['#e85d3a','#f2c14e','#7aa346','#c0392b','#e8b86b']));}));},
  capela:(v,R)=>{house(v,R,{w:3.6,d:6.2,fl:2,wall:'#f3efe6',hip:false});v.at(-1.3,2.4,()=>{v.box(0,0,0,1.7,8.2,1.7,'#efe2c4');v.box(0,6.6,.86,.6,.9,.08,C.dark);v.box(0,8.2,0,2,.15,2,C.trim);v.hip(0,8.35,0,2,2.2,2,ROOFS[0]);v.box(0,10.5,0,.1,.8,.1,C.dark);v.box(0,10.95,0,.45,.1,.1,C.dark);});},
  escola:(v,R)=>{house(v,R,{w:5,d:3.6,fl:2,wall:'#efe2c4',hip:true});v.box(0,3.3,1.85,.8,.8,.08,C.trim);v.at(3,2.2,()=>{v.box(0,0,0,.1,5,.1,C.dark);v.box(.45,4.2,0,.8,.55,.05,'#2f7a78');});},
  cafe:(v,R,c)=>{house(v,R,{w:3.4,d:3.2,fl:2,wall:c,hip:false});v.box(0,0,2.9,4,.1,2.4,'#d8cbb0');for(const x of [-1,1])v.at(x,2.9,()=>{v.box(0,.1,0,.6,.7,.6,C.trim);v.box(0,.8,0,.08,1.3,.08,C.dark);v.box(0,2.1,0,1.6,.12,1.6,x<0?'#d9534f':'#2f7a78');v.box(0,2.2,0,1,.1,1,x<0?'#d9534f':'#2f7a78');});},
  praca:(v,R)=>{for(let x=-4;x<=4;x++)for(let z=-4;z<=4;z++)if(Math.hypot(x,z)<4.4)v.box(x,0,z,1,.1,1,(x+z)%2?'#d8cbb0':'#cbbd9f');
    for(let i=0;i<10;i++){const a=i/10*Math.PI*2;v.box(Math.cos(a)*1.6,.1,Math.sin(a)*1.6,.9,.55,.9,C.stone);}v.cyl(0,.1,0,1.9,.5,C.stone,16);v.cyl(0,.12,0,1.6,.45,'#5ec3d8',16);v.cyl(0,.1,0,.28,1.6,C.stone,10);v.cyl(0,1.7,0,.7,.2,C.stone,12);v.ball(0,2,0,.32,'#8fdcec',1.3,1,.05);
    for(const [x,z] of [[3,3],[-3,3],[3,-3],[-3,-3]])v.at(x,z,()=>tree(v,R,'olive'));},
  teatro:(v,R)=>{const w=8,d=6;house(v,R,{w,d,fl:3,wall:'#efe2c4',hip:true,door:false});for(let i=0;i<6;i++)v.cyl(-3.2+i*1.28,.35,d/2+.9,.26,6.3,'#f7f2e6',10);v.box(0,6.65,d/2+.9,w+.2,.4,1.2,C.trim);
    let pw=w;for(let y=7.05;pw>1;y+=.35){v.box(0,y,d/2+.9,pw,.35,1,'#f1ead8');pw-=1.3;}v.box(0,0,d/2+1.8,w,.2,1.2,C.stone);v.box(0,.35,d/2+.05,1.6,2.4,.1,C.door);v.box(0,3,d/2+1.52,2.4,.6,.08,'#8e3b3b');},
  oliveira:(v,R)=>tree(v,R,'olive'),
  cipreste:(v,R)=>tree(v,R,'cypress'),
  arbusto:(v,R)=>{for(let i=0;i<3;i++)v.ball(rand(-.35,.35),.4,rand(-.35,.35),.5+R()*.2,pick2(R,LEAF),.8);for(let i=0;i<5;i++)v.ball(rand(-.45,.45),.65+R()*.2,rand(-.45,.45),.09,pick2(R,FLOW),1,0,0);},
  palmeira:(v,R)=>tree(v,R,'palm'),
  predio:(v,R,c)=>{const w=5.2,d=5.2,fl=8,fh=1.9;v.box(0,0,0,w+.4,.4,d+.4,C.stone2);v.box(0,.4,0,w,1.9,d,'#e8e2d6');v.box(0,.4,d/2+.02,2.2,1.6,.08,'#3a4a5a',1);
    v.box(0,2.3,0,w,fl*fh,d,c);for(let f=0;f<fl;f++){const y=2.3+f*fh+.45;for(let k=-1;k<=1;k++){v.box(k*1.6,y,d/2+.03,1,1.05,.08,C.win,1);v.box(k*1.6,y,-d/2-.03,1,1.05,.08,C.win,1);v.box(w/2+.03,y,k*1.6,.08,1.05,1,C.win,1);v.box(-w/2-.03,y,k*1.6,.08,1.05,1,C.win,1);}
      if(f%2===0)v.box(0,y-.5,d/2+.45,w*.85,.12,.9,C.trim);v.box(0,y-.5,d/2+.86,w*.85,.42,.06,'#c9d6dd');}
    const top=2.3+fl*fh;v.box(0,top,0,w+.2,.35,d+.2,C.trim);v.cyl(1.3,top+.35,1.1,.55,1.2,'#9aa4ad',10);v.cyl(1.3,top+1.55,1.1,.6,.25,'#7d868f',10,0);v.box(-1.2,top+.35,-1,1.4,.6,1.2,'#b9c1c8');},
  escritorio:(v,R)=>{const w=5,d=5,fl=11,fh=1.8;v.box(0,0,0,w+.6,.6,d+.6,'#cfd6dc');v.box(0,.6,0,w,fl*fh,d,'#7f8fa0');
    for(let f=0;f<fl;f++){const y=.6+f*fh+.25;v.box(0,y,d/2+.02,w-.2,1.3,.06,'#4b6b8a',1);v.box(0,y,-d/2-.02,w-.2,1.3,.06,'#4b6b8a',1);v.box(w/2+.02,y,0,.06,1.3,d-.2,'#4b6b8a',1);v.box(-w/2-.02,y,0,.06,1.3,d-.2,'#4b6b8a',1);}
    const top=.6+fl*fh;v.box(0,top,0,w-1,1.2,d-1,'#a6b2bd');v.cyl(1.4,top+1.2,1.4,.08,2.6,C.dark,6);v.box(1.4,top+3.8,1.4,.2,.2,.2,'#ff4d4d',1);},
  pasto:(v,R)=>{v.cyl(0,0,0,4.3,.06,'#7fae4f',20);for(let i=0;i<22;i++){const a=i/22*6.283;v.box(Math.cos(a)*4.2,0,Math.sin(a)*4.2,.14,.9,.14,C.wood);}
    for(let i=0;i<22;i++){const a=(i+.5)/22*6.283,a0=i/22*6.283,a1=(i+1)/22*6.283;const x0=Math.cos(a0)*4.2,z0=Math.sin(a0)*4.2,x1=Math.cos(a1)*4.2,z1=Math.sin(a1)*4.2;for(const h of [.4,.7])v.quad([x0,h,z0],[x1,h,z1],[x1,h+.08,z1],[x0,h+.08,z0],v.col(C.wood));}
    v.at(2.2,-2,()=>{v.box(0,0,0,1.8,.5,.6,C.wood2);v.box(0,.45,0,1.6,.08,.45,'#c8b46a');});v.ball(-2,.6,1.6,.7,'#d9b44a',.9);},
  galinheiro:(v,R)=>{v.box(0,0,0,4.6,.05,4,'#a89870');house(v,R,{w:2.2,d:1.8,fl:1,wall:'#c0573f',hip:false});for(let i=0;i<14;i++){const t=i/14;v.box(-2.3+4.6*(i%7)/6,0,i<7?1.95:-1.95,.08,.7,.08,C.wood);}v.box(0,.6,1.95,4.6,.05,.05,C.wood);v.box(0,.6,-1.95,4.6,.05,.05,C.wood);},
  pomar:(v,R)=>{v.box(0,0,0,8,.05,7,'#86a650');for(let i=0;i<3;i++)for(let j=0;j<3;j++)v.at(-2.6+i*2.6,-2.3+j*2.3,()=>tree(v,R,'fruit'));},
  silo:(v,R)=>{v.cyl(0,0,0,1.5,6,'#c9ccd0',16);for(let y=1;y<6;y+=1.2)v.cyl(0,y,0,1.53,.08,'#9aa0a6',16);v.ball(0,6,0,1.5,'#b6bbc1',.6,1,.02);v.box(1.5,0,0,.1,6,.5,C.dark);},
  solar:(v,R)=>{v.box(0,0,0,7,.05,6.4,'#b9b19a');for(let i=0;i<3;i++)for(let j=0;j<4;j++)v.at(-2.2+i*2.2,-2.4+j*1.6,()=>{v.box(0,0,0,.1,.6,.1,'#8c9296');
      const y=.55,col=v.col('#1f3d6b'),fr=v.col('#c4cad0');v.quad([-.95,y,.55],[.95,y,.55],[.95,y+.5,-.55],[-.95,y+.5,-.55],col);v.quad([-1,y-.02,.6],[1,y-.02,.6],[1,y+.48,-.6],[-1,y+.48,-.6],fr);});
    v.box(3.1,0,2.8,.9,1,.7,'#d8dde2');v.box(3.1,.6,3.16,.3,.2,.02,'#5fd16a',1);},
  eolica:(v,R,c,ex)=>{v.cyl(0,0,0,.95,.3,'#c9cfd4',12);v.cyl(0,.3,0,.42,11.5,'#f2f4f5',12,.24);v.box(0,11.6,.1,.7,.65,1.5,'#e9edf0');
    const s2=new Vox(),bl=v.col('#f7f8f9');for(let i=0;i<3;i++){const a=i/3*6.283,ca=Math.cos(a),sa=Math.sin(a),pr=(r,w)=>[ca*r-sa*w,sa*r+ca*w,0];s2.quad(pr(.3,-.22),pr(4.6,-.08),pr(4.6,.1),pr(.3,.22),bl);}s2.ball(0,0,0,.32,'#e1e5e8',1.2,1,0);
    ex.spin=s2;ex.spinPos=[0,11.95,.95];ex.spinRate=2.6;},
  termica:(v,R,c,ex)=>{v.box(0,0,0,7,.3,6,C.stone2);house(v,R,{w:4.6,d:3.6,fl:2,wall:'#9aa3ab',flat:true,door:true});v.at(-.6,-2,()=>{});
    for(const [x,z] of [[-2.4,-2],[2.4,-2]]){v.cyl(x,.3,z,.8,8,'#e8e4dc',12,.6);for(const y of [5.5,7])v.cyl(x,.3+y,z,.66-y*.02,.6,'#c9453b',12,.64-y*.02,false,false);}
    v.cylX(0,1.2,2.5,.25,6,'#7d868f');ex.smoke=[[-2.4,8.5,-2],[2.4,8.5,-2]];},
  caixa:(v,R)=>{for(const [x,z] of [[-.9,-.9],[.9,-.9],[.9,.9],[-.9,.9]])v.cyl(x,0,z,.12,4,'#8c9296',6,.1);v.box(0,2,0,2,.1,.1,'#8c9296');v.box(0,2,0,.1,.1,2,'#8c9296');
    v.cyl(0,4,0,1.4,2.3,'#7fc3e0',14);v.cyl(0,6.3,0,1.5,.9,'#5a9fc0',14,.2);v.box(0,4.9,1.42,.9,.5,.04,'#ffffff');},
  bomba:(v,R)=>{v.box(0,0,0,6,.3,4.6,C.stone2);house(v,R,{w:3.4,d:2.8,fl:1,wall:'#dfe6ea',hip:false});v.cyl(2.2,.3,1,.9,2.2,'#4fa3d1',14);v.cylX(1.2,.7,-1.8,.3,4,'#6e7a85');v.cyl(-2.5,.3,-1.6,.35,1.6,'#6e7a85',10);},
  estadio:(v,R,c,ex)=>{const A=8.6,Bz=7;v.cyl(0,0,0,1,0,'#000',3);v.box(0,0,0,11,.12,8,'#4c9a4a');
    for(let i=0;i<6;i++)v.box(-4.4+i*1.76,.13,0,.88,.01,8,'#5aab55');v.box(0,.14,0,10.4,.02,.08,'#ffffff');v.box(0,.14,0,.08,.02,7.6,'#ffffff');v.cyl(0,.14,0,1.1,.02,'#ffffff',16,1.1,false,false);
    for(let ring=0;ring<4;ring++){const ra=A-.3+ring*.9,rb=Bz-.3+ring*.9,y=ring*1.1;for(let i=0;i<28;i++){const a0=i/28*6.283,a1=(i+1)/28*6.283,p=(a,dr,yy)=>[Math.cos(a)*(ra+dr),yy,Math.sin(a)*(rb+dr)];
      const col=v.col(ring%2?'#d6d9dd':'#c94a3d');v.quad(p(a0,0,y+.9),p(a1,0,y+.9),p(a1,.9,y+1.1),p(a0,.9,y+1.1),col);v.quad(p(a0,.9,y+1.1),p(a1,.9,y+1.1),p(a1,.9,0),p(a0,.9,0),v.col('#9aa0a6'));}}
    for(const [x,z] of [[A+3,Bz+2.5],[-A-3,Bz+2.5],[A+3,-Bz-2.5],[-A-3,-Bz-2.5]]){v.cyl(x*.86,0,z*.86,.18,9,'#8c9296',6,.12);v.box(x*.86,9,z*.86,1.6,.7,.4,'#eef2f5',1);}ex.crowd={a:A+.6,b:Bz+.6};},
  balada:(v,R,c,ex)=>{v.box(0,0,0,5.6,.3,4.6,'#2b2b35');v.box(0,.3,0,5,3.4,4,'#2d2140');v.box(0,3.7,0,5.2,.3,4.2,'#1c1426');
    v.box(0,.3,2.02,1.2,2,.08,'#120c18');const n=new Vox();for(let i=0;i<5;i++)n.box(0,.9+i*.55,2.06,4.6,.1,.04,i%2?'#ff3dc8':'#36e7ff');n.box(0,3.1,2.1,3.2,.55,.05,'#ffe14d');
    n.box(2.52,.6,0,.04,2.8,3.4,'#a64dff');n.box(-2.52,.6,0,.04,2.8,3.4,'#36e7ff');ex.neon=n;for(let i=0;i<4;i++)v.box(-2+i*.5,.3,2.6,.08,.8,.08,'#c9a227');v.box(-1.25,1.05,2.6,1.6,.05,.05,'#b03030');},
  estaleiro:(v,R,c,ex)=>{v.box(0,-.25,2.5,4.4,.3,9,'#8f8a80');v.box(0,-.25,-2.6,6,.3,3,C.stone2);for(const x of [-2.3,2.3])v.box(x,.05,1,.3,6,.3,'#e0b22e');v.box(0,6,1,5,.5,.5,'#e0b22e');v.box(0,5,1,.6,1,.6,'#e0b22e');
    v.at(0,3,()=>{v.box(0,-.3,0,1.8,1.2,5,'#b5482f');v.box(0,.9,0,1.9,.2,5.2,'#e8e2d6');v.box(0,1.1,-1.6,1.4,1.2,1.4,'#f2f2f2');});v.at(0,-2.8,()=>house(v,R,{w:3,d:2.2,fl:1,wall:'#c9d0d6',flat:true}));},
  praia:(v,R)=>{v.cyl(0,-.18,3,4.4,.24,'#efdcae',20);v.cyl(0,-.18,0,3.6,.24,'#efdcae',20);const U=['#e8505b','#f6c344','#3db6c4','#ffffff'];
    for(let i=0;i<4;i++)v.at(-2.4+i*1.6,1.6+(i%2)*1.4,()=>{v.cyl(0,0,0,.05,1.9,'#f4f4f4',5);v.cyl(0,1.75,0,1,.45,pick2(R,U),10,0);v.box(.5,.02,-.6,.6,.03,1.2,pick2(R,U));});
    v.at(2.8,-1.6,()=>{for(const [x,z] of [[-.4,-.4],[.4,-.4],[.4,.4],[-.4,.4]])v.box(x,0,z,.1,1.8,.1,C.wood);v.box(0,1.8,0,1.2,.1,1.2,C.wood);v.box(0,1.9,0,1.1,.9,1.1,'#f2f2f2');v.gable(0,2.8,0,1.4,.5,1.4,'#e8505b');});
    v.at(-3,-1.4,()=>tree(v,R,'palm'));},
  lagoa:(v,R)=>{v.cyl(0,0,0,3.7,.08,'#c9bd94',22);v.cyl(0,.02,0,3.3,.08,'#3fa7c4',22);for(let i=0;i<12;i++){const a=i/12*6.283+R()*.3;v.ball(Math.cos(a)*3.5,.12,Math.sin(a)*3.5,.32+R()*.2,'#a29d92',.6);}
    for(let i=0;i<9;i++){const a=R()*6.28,r=2.6+R()*.6;v.cyl(Math.cos(a)*r,0,Math.sin(a)*r,.04,.9+R()*.5,'#5c8a3a',4,.01);}v.at(-1,.6,()=>{v.ball(0,.25,0,.22,'#f4f1e8',.8);v.ball(.17,.42,0,.12,'#2f6b3a');v.box(.3,.4,0,.1,.04,.06,'#f0a030');});},

  arvore:(v,R)=>tree(v,R,'round'),
  flores:(v,R)=>{v.box(0,0,0,1.7,.3,1.1,C.stone);v.box(0,.3,0,1.5,.05,.9,'#6b4a2f');const fc=pick2(R,FLOW);for(let i=0;i<9;i++){const x=-.55+(i%3)*.55,z=-.28+Math.floor(i/3)*.28;v.box(x,.35,z,.2,.25,.2,LEAF[1]);v.box(x,.6,z,.22,.18,.22,R()<.7?fc:pick2(R,FLOW));}},
  poste:(v)=>{v.cyl(0,0,0,.2,.3,C.dark,8);v.cyl(0,.3,0,.08,2.9,C.dark,8,.06);v.cyl(0,3.1,0,.26,.45,C.lamp,8,.2,1);v.cyl(0,3.55,0,.34,.25,C.dark,8,0);},
  banco:(v)=>{for(const x of [-.6,.6])v.box(x,0,0,.12,.45,.45,C.dark);v.box(0,.45,0,1.6,.1,.5,C.wood);v.box(0,.55,-.22,1.6,.45,.08,C.wood);},
};

/* ---------- catalog ---------- */
const B={
  casa:{n:'Casinha',cat:'mor',cost:{m:30,w:10},r:2.3,cap:4,tier:0,paint:1,d:'Lar de camponeses. Precisa de água e comida.'},
  sobrado:{n:'Sobrado',cat:'mor',cost:{m:80,w:25},r:2.8,cap:8,tier:1,paint:1,req:'alvenaria',d:'Artesãos. Pedem também mercado e capela.'},
  vila:{n:'Casa burguesa',cat:'mor',cost:{m:220,w:60},r:4.4,cap:12,tier:2,paint:1,req:'arquitetura',d:'Burguesia. Exigente, mas paga muito imposto.'},
  fazenda:{n:'Fazenda',cat:'trab',cost:{m:50,w:15},r:4.6,jobs:4,food:2.2,d:'Produz comida: grãos e verduras.'},
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
  predio:{n:'Prédio residencial',cat:'mor',cost:{m:420,w:90},r:3.4,cap:30,tier:3,paint:1,req:'urbanismo',d:'Moradia da cidade grande. Precisa de energia, água, mercado, café e lazer.'},
  pasto:{n:'Pasto com vacas',cat:'trab',cost:{m:70,w:20},r:4.4,jobs:2,food:1.8,d:'Produz comida: leite e queijo.'},
  galinheiro:{n:'Galinheiro',cat:'trab',cost:{m:45,w:15},r:2.8,jobs:1,food:1.1,d:'Produz comida: ovos.'},
  pomar:{n:'Pomar',cat:'trab',cost:{m:60,w:10},r:4.4,jobs:2,food:1.7,d:'Produz comida: frutas.'},
  silo:{n:'Silo',cat:'trab',cost:{m:80,w:30},r:1.7,req:'moagem',rad:18,d:'Fazendas, pastos e pomares num raio de 18 produzem +30%.'},
  escritorio:{n:'Escritórios',cat:'trab',cost:{m:360,w:60},r:3.2,jobs:10,req:'urbanismo',d:'Empresas pagam impostos: gera moedas.'},
  estaleiro:{n:'Estaleiro',cat:'trab',cost:{m:300,w:120},r:3.6,jobs:8,coast:1,req:'naval',d:'Constrói navios que fazem comércio: gera moedas.'},
  solar:{n:'Usina solar',cat:'util',cost:{m:80},r:3.6,pw:6,d:'Gera 6 MW de dia e 2 MW à noite (baterias).'},
  eolica:{n:'Turbina eólica',cat:'util',cost:{m:120,w:20},r:1.4,pw:4,req:'engenharia',d:'Gera cerca de 4 MW com o vento, dia e noite.'},
  termica:{n:'Termelétrica',cat:'util',cost:{m:260,w:60},r:3.8,pw:20,jobs:6,req:'industria',d:'Gera 20 MW, mas polui a vizinhança (raio 20).'},
  caixa:{n:"Caixa d'água",cat:'util',cost:{m:60,w:10},r:1.6,wt:40,d:'Água encanada para 40 moradores.'},
  bomba:{n:'Estação de água',cat:'util',cost:{m:180,w:40},r:3.2,wt:160,jobs:3,req:'engenharia',nearWater:1,d:'Bombeia água do mar ou de uma lagoa: abastece 160 moradores.'},
  estadio:{n:'Estádio',cat:'lazer',cost:{m:800,w:200},r:9.2,rad:45,serv:'lazer',jobs:8,beauty:2,req:'lazer',d:'Jogos à noite com torcida e refletores. Atende um raio de 45.'},
  balada:{n:'Balada',cat:'lazer',cost:{m:220,w:40},r:3.2,rad:24,serv:'lazer',jobs:4,req:'lazer',d:'Vida noturna com luzes neon e fila na porta.'},
  praia:{n:'Praia',cat:'lazer',cost:{m:60},r:3.8,rad:30,serv:'lazer',beauty:3,coast:1,d:'Guarda-sóis, salva-vidas e banhistas. Na beira do mar.'},
  lagoa:{n:'Lagoa',cat:'lazer',cost:{m:50},r:3.8,beauty:4,d:'Água, juncos e patos. Pode abastecer uma estação de água.'},
  oliveira:{n:'Oliveira',cat:'dec',cost:{m:3},r:.9,beauty:1.2},
  arvore:{n:'Árvore frondosa',cat:'dec',cost:{m:4},r:1.2,beauty:1.4},
  palmeira:{n:'Palmeira',cat:'dec',cost:{m:5},r:.9,beauty:1.3},
  cipreste:{n:'Cipreste',cat:'dec',cost:{m:4},r:.6,beauty:1.2,req:'paisagismo'},
  arbusto:{n:'Arbusto florido',cat:'dec',cost:{m:2},r:.6,beauty:.7},
  flores:{n:'Canteiro de flores',cat:'dec',cost:{m:4},r:.9,beauty:1.6},
  poste:{n:'Poste de luz',cat:'dec',cost:{m:6},r:.35,beauty:.8},
  banco:{n:'Banco',cat:'dec',cost:{m:5},r:.8,beauty:.6},
};
const TIERS=['Camponeses','Artesãos','Burguesia','Metropolitanos'],TAX=[.06,.13,.32,.42];
const NEEDS=[['agua','comida'],['agua','comida','energia','mercado','capela'],['agua','comida','energia','mercado','capela','cafe','teatro'],['agua','comida','energia','mercado','cafe','lazer']];
const NEEDN={agua:'Água (poço ou encanada)',energia:'Energia elétrica',lazer:'Lazer (praia, balada ou estádio)',comida:'Comida',mercado:'Mercado',capela:'Capela',cafe:'Café',teatro:'Teatro'};
const RS={
  alvenaria:{n:'Alvenaria',cost:25,req:[],d:'Libera Sobrado e Capela.'},
  paisagismo:{n:'Paisagismo',cost:20,req:[],d:'Libera Praça com fonte e Cipreste.'},
  moagem:{n:'Moagem',cost:40,req:['alvenaria'],d:'Libera o Moinho e o Silo.'},
  engenharia:{n:'Engenharia',cost:50,req:['alvenaria'],d:'Libera Turbina eólica e Estação de água.'},
  industria:{n:'Indústria',cost:110,req:['engenharia'],d:'Libera a Termelétrica.'},
  lazer:{n:'Lazer e eventos',cost:100,req:['oficios'],d:'Libera Estádio e Balada.'},
  naval:{n:'Engenharia naval',cost:120,req:['comercio'],d:'Libera o Estaleiro.'},
  urbanismo:{n:'Urbanismo',cost:220,req:['arquitetura','engenharia'],d:'Libera Prédio residencial e Escritórios.'},
  oficios:{n:'Ofícios',cost:60,req:['alvenaria'],d:'Libera Oficina de artesão e Café.'},
  comercio:{n:'Comércio marítimo',cost:90,req:['oficios'],d:'Libera o Cais do porto.'},
  arquitetura:{n:'Arquitetura',cost:130,req:['oficios','paisagismo'],d:'Libera Casa burguesa e Teatro.'},
  turismo:{n:'Turismo',cost:180,req:['comercio','arquitetura'],d:'Cais, praças e teatros atraem visitantes que gastam moedas.'},
};
const FAM=['Moretti','Russo','Bianchi','Costa','Ferreira','Lopes','Marino','Greco','Conti','Ricci','Santos','Rocha','Vidal','Navarro','Serra','Lombardi','Esposito','Duarte','Pires','Mancini','Galli','Barros','Coelho','Caruso','Fontana','Leone','Valente','Amato','Sardo','Morais'];
const FIRST=['Giulia','Marco','Inês','Tomás','Lucia','Pietro','Clara','Rafael','Sofia','Matteo','Beatriz','Elena','Dona Rosa','Seu Aldo'];

/* ---------- terreno liso (sem quadradinhos) e mar com ondas ---------- */
const TER=700,TSEG=LOW?210:320;
function terrH(x,z,ld){let y=0;if(ld<1.6)y=ld>-1.5?-.75*(1.6-ld)/3.1:-.75-Math.min(7,(-ld-1.5)*.32);
  const hill=clamp((-z-MAPB-8)/60,0,1);if(hill>0&&ld>4)y+=hill*hill*(10+vnoise(x*.02,z*.02)*26);return y+hillAt(x,z);}
/* estações: um só "relógio do ano" tinge mato, árvores e flores (verão, outono, inverno, primavera) */
const seasonU={uSeas:{value:new THREE.Vector4(0,0,0,1)},uBloom:{value:1}};
function seasonize(mat,kind){const fol=kind==='fol',flower=kind==='flower';mat.onBeforeCompile=sh=>{sh.uniforms.uSeas=seasonU.uSeas;sh.uniforms.uBloom=seasonU.uBloom;
  sh.vertexShader='varying vec3 vSP;varying vec2 vTP;uniform float uBloom;\n'+sh.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
${flower?'transformed*=.18+.82*uBloom;':''}
{vec4 sp=vec4(transformed,1.);vTP=vec2(0.);
#ifdef USE_INSTANCING
sp=instanceMatrix*sp;vTP=instanceMatrix[3].xz;
#endif
vSP=(modelMatrix*sp).xyz;}`);
  // chão: tons suaves e contínuos (sem manchas quadradas); árvores: cada árvore ganha sua cor
  sh.fragmentShader='varying vec3 vSP;varying vec2 vTP;uniform vec4 uSeas;\n'+sh.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
{vec3 c=diffuseColor.rgb;float gr=clamp((c.g-max(c.r,c.b))*5.,0.,1.),L=dot(c,vec3(.3,.59,.11));vec3 aut,win,spr;
${fol?`float nz=fract(sin(dot(floor(vTP*1.7+.5),vec2(12.9898,78.233)))*43758.5453);
 aut=nz>.68?vec3(L*1.75,L*.6,L*.26):nz>.36?vec3(L*1.5,L*1.02,L*.3):mix(c,vec3(L*1.25,L*1.08,L*.42),.6);
 win=mix(vec3(L),c,.45)*vec3(1.04,1.,.88)+vec3(.02,.02,0.);
 spr=nz>.84?vec3(.97,.6,.82):nz>.74?vec3(1.,.85,.3):c*vec3(1.,1.08,.95);`
:`float w=sin(vSP.x*.045+sin(vSP.z*.03)*2.)*sin(vSP.z*.05+1.3)*.5+.5;
 aut=mix(c,vec3(L*1.32,L*1.1,L*.5),.42+.2*w);
 win=mix(vec3(L),c,.42)*vec3(1.05,1.,.86)+vec3(.03,.025,0.);
 spr=c*vec3(.98,1.06,.95);`}
 vec3 t=c*uSeas.w+aut*uSeas.x+win*uSeas.y+spr*uSeas.z;diffuseColor.rgb=mix(c,t,gr);}`);};
  mat.customProgramCacheKey=()=>'seas-'+(kind||'g');return mat;}
const terrMat=seasonize(new THREE.MeshLambertMaterial({vertexColors:true}));
const TC={G1:new THREE.Color('#78a84e'),G2:new THREE.Color('#8fb85a'),G3:new THREE.Color('#6a9a45'),DRY:new THREE.Color('#aeb064'),SAND:new THREE.Color('#ecdcae'),WET:new THREE.Color('#cdb683'),
  BED:new THREE.Color('#5b8f8a'),ROCK:new THREE.Color('#8d8a7a'),FOR:new THREE.Color('#3d7233'),FOR2:new THREE.Color('#4e8a3b'),GRAN:new THREE.Color('#8e8c86'),GRAN2:new THREE.Color('#6f6d68')};
const sstep=(a,b,v)=>{const t=clamp((v-a)/(b-a),0,1);return t*t*(3-2*t);};
function terrColor(x,z,ld,y,c){const n=vnoise(x*.045,z*.045),n2=vnoise(x*.075+9,z*.075),hh=hillAt(x,z),rock=HR;
  if(hh>.4){const e=.8,sl=Math.hypot(hillAt(x+e,z)-hillAt(x-e,z),hillAt(x,z+e)-hillAt(x,z-e))/(2*e);
    c.copy(TC.FOR).lerp(TC.FOR2,n);c.lerp(TC.G3,clamp(1-hh/2.5,0,.6));
    const g=rock?sstep(1.05,2.1,sl)*(1-sstep(.58,.74,vnoise(x*.28+y*.15,z*.28))*.85):sstep(2.2,3.2,sl)*.6;if(g>0)c.lerp(TC.GRAN2,g*.95).lerp(TC.GRAN,g*sstep(.3,.7,vnoise((x+z)*.22,y*.12))*.8);c.offsetHSL(0,0,(n2-.5)*.07);}
  else if(ld>3.6){c.copy(TC.G3).lerp(TC.G1,sstep(.25,.5,n)).lerp(TC.G2,sstep(.55,.75,n));c.lerp(TC.DRY,sstep(.62,.86,n2)*.45);if(y>6)c.lerp(TC.ROCK,clamp((y-6)/18,0,.7));c.offsetHSL(0,0,(n2-.5)*.04);}
  else if(hh>.12&&ld>-1.6)c.copy(TC.GRAN2).lerp(TC.FOR,clamp(hh/3,0,.5));
  else if(ld>.4)c.copy(TC.SAND).lerp(TC.G1,sstep(2.2,3.6,ld));else if(ld>-1.6)c.copy(TC.WET).lerp(TC.SAND,clamp((ld+1.6)/2,0,1));else c.copy(TC.WET).lerp(TC.BED,clamp((-ld-1.6)/10,0,1));
  return c;}
{const g=new THREE.PlaneGeometry(TER,TER,TSEG,TSEG);g.rotateX(-Math.PI/2);const pa=g.attributes.position,cols=new Float32Array(pa.count*3),c=new THREE.Color();
  for(let i=0;i<pa.count;i++){const x=pa.getX(i),z=pa.getZ(i),ld=landDist(x,z);let y=terrH(x,z,ld);terrColor(x,z,ld,y,c);
    {const hh0=hillAt(x,z);if(hh0>0)y-=hh0+1.2;} // o morro detalhado (abaixo) cobre esta parte
    pa.setY(i,y);cols[i*3]=c.r;cols[i*3+1]=c.g;cols[i*3+2]=c.b;}
  g.setAttribute('color',new THREE.BufferAttribute(cols,3));g.computeVertexNormals();const t=new THREE.Mesh(g,terrMat);t.receiveShadow=true;scene.add(t);}
// morros em malha fina e arredondada (sem facetas), cada um com mata e paredões de pedra
MORROS.forEach((k,mi)=>{const R=k[3]*1.08+3.6,seg=Math.round(clamp(R*(LOW?3:4.4),36,LOW?72:120)),rings=Math.round(clamp(R*(LOW?1.1:1.7),14,LOW?32:56));
  const P=[],C=[],I=[],c=new THREE.Color();const put=(x,z)=>{const ld=landDist(x,z),y=terrH(x,z,ld);terrColor(x,z,ld,y,c);P.push(x,y+.012*(mi%5+1),z);C.push(c.r,c.g,c.b);};
  put(k[0],k[1]);for(let r=1;r<=rings;r++){const rr=R*Math.pow(r/rings,.62);for(let a=0;a<seg;a++){const q=a/seg*6.2832;put(k[0]+Math.cos(q)*rr,k[1]+Math.sin(q)*rr);}}
  for(let a=0;a<seg;a++)I.push(0,1+(a+1)%seg,1+a);
  for(let r=1;r<rings;r++){const o=1+(r-1)*seg,o2=o+seg;for(let a=0;a<seg;a++){const b=(a+1)%seg;I.push(o+a,o+b,o2+a,o+b,o2+b,o2+a);}}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(P,3));g.setAttribute('color',new THREE.Float32BufferAttribute(C,3));g.setIndex(I);g.computeVertexNormals();
  const m=new THREE.Mesh(g,terrMat);m.receiveShadow=true;m.castShadow=k[2]>9;scene.add(m);});
const waterU={value:0};
const waterMat=new THREE.ShaderMaterial({fog:true,uniforms:THREE.UniformsUtils.merge([THREE.UniformsLib.fog,{uTime:{value:0},uSun:{value:new THREE.Vector3(.5,.8,.3)},uSunCol:{value:new THREE.Color('#fff4e0')},uSky:{value:new THREE.Color('#a8d8ea')},uNight:{value:0},
    uShallow:{value:new THREE.Color('#4fd0cf')},uMid:{value:new THREE.Color('#1f9cc2')},uDeep:{value:new THREE.Color('#0f4f86')}}]),
  vertexShader:`uniform float uTime;attribute float aDepth;varying float vDepth;varying vec3 vW;varying vec3 vN;
#include <fog_pars_vertex>
void main(){vec3 p=position;float h=0.;vec2 g=vec2(0.);float amp=.35+.65*aDepth;
#define W(dx,dz,f,a,s) {vec2 D=normalize(vec2(dx,dz));float ph=dot(D,p.xz)*f+uTime*s;h+=a*amp*sin(ph);g+=a*amp*f*cos(ph)*D;}
W(1.,.35,.32,.16,1.0) W(-.45,1.,.47,.10,1.3) W(.75,-.6,.83,.05,2.0) W(-1.,-.25,1.5,.025,2.7) W(.2,1.,2.4,.012,3.6)
p.y+=h;vDepth=aDepth;vN=normalize(vec3(-g.x,1.,-g.y));vec4 wp=modelMatrix*vec4(p,1.);vW=wp.xyz;vec4 mvPosition=viewMatrix*wp;gl_Position=projectionMatrix*mvPosition;
#include <fog_vertex>
}`,
  fragmentShader:`uniform float uTime;uniform vec3 uSun;uniform vec3 uSunCol;uniform vec3 uSky;uniform float uNight;uniform vec3 uShallow;uniform vec3 uMid;uniform vec3 uDeep;varying float vDepth;varying vec3 vW;varying vec3 vN;
#include <fog_pars_fragment>
void main(){vec3 V=normalize(cameraPosition-vW);vec3 N=vN;float r1=sin(vW.x*1.9+uTime*1.7)*sin(vW.z*2.3-uTime*1.4),r2=sin(vW.x*3.7-uTime*2.3+vW.z*1.1);N=normalize(N+vec3(r1*.05+r2*.025,0.,r1*.04-r2*.03));
float fres=pow(1.-max(dot(N,V),0.),3.);vec3 base=vDepth<.18?mix(uShallow,uMid,vDepth/.18):mix(uMid,uDeep,clamp((vDepth-.18)/.6,0.,1.));
vec3 col=mix(base,uSky*1.05,clamp(fres*.65,0.,.75));vec3 H=normalize(normalize(uSun)+V);float sp=pow(max(dot(N,H),0.),140.);col+=uSunCol*sp*1.6*(1.-uNight*.8);
float fz=smoothstep(.06,0.,vDepth);float band=.5+.5*sin(vDepth*260.-uTime*2.2+sin(vW.x*.3)*2.);col=mix(col,vec3(1.),fz*(.35+.45*band));
col*=mix(1.,.32,uNight);col+=vec3(.02,.04,.08)*uNight;gl_FragColor=vec4(col,1.);
#include <fog_fragment>
}`});
waterMat.uniforms.uTime=waterU;
const water=new THREE.Mesh(new THREE.PlaneGeometry(TER+200,TER+200,LOW?150:220,LOW?150:220),waterMat);
{const g=water.geometry;g.rotateX(-Math.PI/2);const pa=g.attributes.position,dep=new Float32Array(pa.count);for(let i=0;i<pa.count;i++)dep[i]=clamp(-landDist(pa.getX(i),pa.getZ(i))/45,0,1);g.setAttribute('aDepth',new THREE.BufferAttribute(dep,1));}
water.position.y=-.3;scene.add(water);
/* wild trees */
const matFol=seasonize(matBody.clone(),'fol');
const wild=[];const wildMesh={};
{const kinds=['olive','pine','cypress','round'];const pos={olive:[],pine:[],cypress:[],round:[]};
  for(let i=0;i<9000&&pos.olive.length+pos.pine.length+pos.cypress.length+pos.round.length<(LOW?480:900);i++){const x=rand(-230,230),z=rand(-240,170),ld=landDist(x,z),hh=hillAt(x,z);if(ld<1.2||Math.hypot(x,z)<22)continue;if(hh>.3)continue;if(ld<3||z>110)continue;if(vnoise(x*.06+9,z*.06+3)<.48)continue;const k=ld<8?'pine':pick(kinds);pos[k].push([x,z,terrH(x,z,ld)]);}
  // mata atlântica cobrindo os morros (menos nos paredões de pedra)
  for(const k of MORROS){const n=Math.min(LOW?70:170,Math.round(k[3]*k[3]*(LOW?.22:.4)));for(let j=0,got=0;j<n*3&&got<n;j++){const q=Math.random()*6.283,rr=Math.sqrt(Math.random())*k[3]*.97,x=k[0]+Math.cos(q)*rr,z=k[1]+Math.sin(q)*rr;
      const hh=hillAt(x,z),rock=HR;if(hh<.4)continue;const e=.8,sl=Math.hypot(hillAt(x+e,z)-hillAt(x-e,z),hillAt(x,z+e)-hillAt(x,z-e))/(2*e);if(sl>(rock?.8:2.4))continue;
      pos[Math.random()<.68?'round':'pine'].push([x,z,terrH(x,z,landDist(x,z))-.25]);got++;}}
  for(const k of kinds){const v=new Vox();tree(v,rng(3),k);const im=new THREE.InstancedMesh(toGeo(v.b,v.t),matFol,pos[k].length);im.castShadow=im.receiveShadow=true;const m=new THREE.Matrix4();
    pos[k].forEach(([x,z,y],i)=>{const s=.8+Math.random()*.5;m.compose(new THREE.Vector3(x,y||0,z),new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),Math.random()*6),new THREE.Vector3(s,s,s));im.setMatrixAt(i,m);wild.push({x,z,k,i,alive:true});});
    wildMesh[k]=im;scene.add(im);}}
function clearWild(x,z,r){let n=0;const m=new THREE.Matrix4().makeScale(0,0,0);for(const t of wild)if(t.alive&&Math.hypot(t.x-x,t.z-z)<r+.6){t.alive=false;wildMesh[t.k].setMatrixAt(t.i,m);wildMesh[t.k].instanceMatrix.needsUpdate=true;n++;}return n;}

/* ---------- state ---------- */
let cityName='';try{cityName=localStorage.getItem('ps-city')||'';}catch(e){}
let rev=0,savedRev=-1,localTs=0;const DEV=(()=>{try{let d=localStorage.getItem('vc-dev');if(!d){d=Math.random().toString(36).slice(2,10);localStorage.setItem('vc-dev',d);}return d;}catch(e){return 'x'+Math.random().toString(36).slice(2,8);}})();
let S,buildings=[],roads=[],dirty=true,nextId=1;
function freshState(mode){return{tut:99,mode,m:500,w:150,f:80,g:0,rp:0,cur:null,done:new Set(),time:0,tod:8/24,day:1,speed:1,obj:0,pop:0,hap:0,staff:1,rates:{},req:null,nextReq:60,sold:0,won:false};}
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
  const body=new THREE.Mesh(toGeo(v.b,v.t),matBody);body.castShadow=body.receiveShadow=true;g.add(body);
  if(v.g.length||v.tg.length){const gl=new THREE.Mesh(toGeo(v.g,v.tg),matGlow);gl.castShadow=true;g.add(gl);}
  if(ex.spin){const s=new THREE.Mesh(toGeo(ex.spin.b,ex.spin.t),matBody);s.position.set(...ex.spinPos);s.castShadow=true;g.add(s);g.userData.spin=s;g.userData.spinRate=ex.spinRate||.6;}
  if(ex.neon){const n=new THREE.Mesh(toGeo(ex.neon.b,ex.neon.t),matNeon);n.raycast=()=>{};g.add(n);}
  if(ex.smoke)g.userData.smoke=ex.smoke;if(ex.crowd)g.userData.crowd=ex.crowd;
  if(t==='poste'){const h=new THREE.Sprite(haloMat);h.scale.set(4.2,4.2,1);h.position.y=3.35;h.raycast=()=>{};g.add(h);}
  if(t==='estadio')for(const [x,z] of [[11.6,9.5],[-11.6,9.5],[11.6,-9.5],[-11.6,-9.5]]){const h=new THREE.Sprite(haloMat);h.scale.set(9,9,1);h.position.set(x*.86,9.35,z*.86);h.raycast=()=>{};g.add(h);}
  g.userData.h=new THREE.Box3().setFromObject(g).max.y;return g;}
function addBuilding(o){const d=B[o.t];if(!d)return null;const b={id:o.id||nextId++,t:o.t,x:o.x,z:o.z,a:o.a||0,r:d.r,seed:o.seed||Math.floor(Math.random()*1e9),color:o.color||null,res:o.res||0,fam:o.fam||null,conn:false,hap:0,beauty:0,met:{}};
  nextId=Math.max(nextId,b.id+1);if(d.paint&&!b.color)b.color=WALLS[Math.floor(Math.random()*WALLS.length)];
  b.obj=makeModel(b.t,b.seed,b.color);b.obj.position.set(b.x,0,b.z);b.obj.rotation.y=b.a;b.obj.traverse(m=>m.userData.b=b);scene.add(b.obj);buildings.push(b);clearWild(b.x,b.z,b.r);dirty=true;rev++;if(o.anim)popIn(b);return b;}
function removeBuilding(b){rev++;scene.remove(b.obj);if(b.icon)scene.remove(b.icon);buildings=buildings.filter(x=>x!==b);if(S.req&&S.req.id===b.id)clearReq();if(sel===b)select(null);dirty=true;}
function recolor(b,col){rev++;b.color=col;scene.remove(b.obj);b.obj=makeModel(b.t,b.seed,col);b.obj.position.set(b.x,0,b.z);b.obj.rotation.y=b.a;b.obj.traverse(m=>m.userData.b=b);scene.add(b.obj);}

/* ---------- roads: asfalto, calçada, faixa central, cruzamentos automáticos e pontes ---------- */
const roadMat=new THREE.MeshLambertMaterial({vertexColors:true});
const RW=1.5,SW=2.25,BRIDGE_Y=1.5;
function ribbon(samples,w,y,cols,ys){const P=[],N=[],Cc=[];for(let i=0;i<samples.length-1;i++){const a=samples[i],b=samples[i+1],pa=samples[Math.max(0,i-1)],nb=samples[Math.min(samples.length-1,i+2)];
    const t0=new THREE.Vector2(b.x-pa.x,b.z-pa.z).normalize(),t1=new THREE.Vector2(nb.x-a.x,nb.z-a.z).normalize();const ya=y+(ys?a.y:0),yb=y+(ys?b.y:0);
    const l0=[a.x-t0.y*w,ya,a.z+t0.x*w],r0=[a.x+t0.y*w,ya,a.z-t0.x*w],l1=[b.x-t1.y*w,yb,b.z+t1.x*w],r1=[b.x+t1.y*w,yb,b.z-t1.x*w];
    const c=new THREE.Color(cols[i%cols.length]);c.offsetHSL(0,0,(Math.random()-.5)*.03);
    for(const p of [l0,r1,r0,l0,l1,r1]){P.push(p[0],p[1],p[2]);N.push(0,1,0);Cc.push(c.r,c.g,c.b);}}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(P,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(N,3));g.setAttribute('color',new THREE.Float32BufferAttribute(Cc,3));return g;}
function sampleCurve(pts){if(pts.length<2)return pts.map(p=>({x:p.x,z:p.z,y:0}));const cv=new THREE.CatmullRomCurve3(pts.map(p=>new THREE.Vector3(p.x,0,p.z)),false,'centripetal');const n=Math.max(2,Math.ceil(cv.getLength()));
  const s=cv.getSpacedPoints(n).map(v=>({x:v.x,z:v.z,y:0,w:landDist(v.x,v.z)<.6}));
  for(let i=0;i<s.length;i++){let d=99;for(let k=-6;k<=6;k++){const q=s[i+k];if(q&&q.w)d=Math.min(d,Math.abs(k));}s[i].y=s[i].w?BRIDGE_Y:d<6?BRIDGE_Y*(1-d/6):0;}return s;}
function lineMarks(s){const P=[],N=[],Cc=[],c=new THREE.Color('#f4f1e6');for(let i=0;i<s.length-1;i+=2){const a=s[i],b=s[i+1],tx=b.x-a.x,tz=b.z-a.z,l=Math.hypot(tx,tz)||1,nx=-tz/l*.07,nz=tx/l*.07,e={x:a.x+tx*.6,z:a.z+tz*.6,y:a.y+(b.y-a.y)*.6};
    for(const p of [[a.x-nx,a.y,a.z-nz],[e.x+nx,e.y,e.z+nz],[a.x+nx,a.y,a.z+nz],[a.x-nx,a.y,a.z-nz],[e.x-nx,e.y,e.z-nz],[e.x+nx,e.y,e.z+nz]]){P.push(p[0],p[1]+.152,p[2]);N.push(0,1,0);Cc.push(c.r,c.g,c.b);}}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(P,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(N,3));g.setAttribute('color',new THREE.Float32BufferAttribute(Cc,3));return g;}
function bridgeParts(s){const v=new Vox();let run=0;for(let i=0;i<s.length-1;i++){const a=s[i],b=s[i+1];if(a.y<.2&&b.y<.2)continue;const tx=b.x-a.x,tz=b.z-a.z,l=Math.hypot(tx,tz)||1,nx=-tz/l,nz=tx/l;
    for(const sd of [-1,1]){const ox=nx*SW*sd,oz=nz*SW*sd;v.quad([a.x+ox,a.y+.15,a.z+oz],[b.x+ox,b.y+.15,b.z+oz],[b.x+ox,b.y+.75,b.z+oz],[a.x+ox,a.y+.75,a.z+oz],v.col('#d9dde0'));
      v.quad([a.x+ox*.98,a.y+.12,a.z+oz*.98],[b.x+ox*.98,b.y+.12,b.z+oz*.98],[b.x+ox*.98,b.y-.45,b.z+oz*.98],[a.x+ox*.98,a.y-.45,a.z+oz*.98],v.col('#b9bdc1'));}
    v.quad([a.x-nx*SW,a.y-.45,a.z-nz*SW],[a.x+nx*SW,a.y-.45,a.z+nz*SW],[b.x+nx*SW,b.y-.45,b.z+nz*SW],[b.x-nx*SW,b.y-.45,b.z-nz*SW],v.col('#a7abb0'));
    if(a.w&&(run++%6===0))for(const sd of [-1,1])v.cyl(a.x+nx*1.3*sd,-3,a.z+nz*1.3*sd,.35,a.y+2.6,'#c7cbcf',8);}
  return toGeo(v.b,v.t);}
function roadBBox(s){let a=1e9,b=-1e9,c=1e9,d=-1e9;for(const p of s){a=Math.min(a,p.x);b=Math.max(b,p.x);c=Math.min(c,p.z);d=Math.max(d,p.z);}return[a-3,b+3,c-3,d+3];}
function addRoad(pts){const s=sampleCurve(pts);const g=new THREE.Group();const k=roads.length%20*.002;
  const side=new THREE.Mesh(ribbon(s,SW,.11+k,['#cfcac0','#c7c2b8'],1),roadMat);const top=new THREE.Mesh(ribbon(s,RW,.135+k,['#4a4f56','#474c53','#4d5259'],1),roadMat);const ln=new THREE.Mesh(lineMarks(s),roadMat);
  side.receiveShadow=top.receiveShadow=ln.receiveShadow=true;g.add(side,top,ln);if(s.some(p=>p.y>.05)){const br=new THREE.Mesh(bridgeParts(s),matBody);br.castShadow=br.receiveShadow=true;g.add(br);}
  scene.add(g);const r={pts,s,obj:g,len:s.length,bb:roadBBox(s),conns:[]};roads.push(r);rev++;
  for(const p of s){clearWild(p.x,p.z,2.4);for(const b of buildings.slice())if(B[b.t].cat==='dec'&&Math.hypot(b.x-p.x,b.z-p.z)<2.3)removeBuilding(b);}dirty=true;graphDirty=true;return r;}
function removeRoad(r){rev++;scene.remove(r.obj);roads=roads.filter(x=>x!==r);dirty=true;graphDirty=true;}
function nearestRoad(x,z,skip){let best=null,bd=1e9;for(const r of roads){if(r===skip)continue;if(x<r.bb[0]-40||x>r.bb[1]+40||z<r.bb[2]-40||z>r.bb[3]+40)continue;for(let i=0;i<r.s.length;i++){const p=r.s[i],d=(p.x-x)**2+(p.z-z)**2;if(d<bd){bd=d;best={x:p.x,z:p.z,r,i};}}}if(best)best.d=Math.sqrt(bd);return best;}
function nearestOn(r,p){let bi=0,bd=1e9;for(let i=0;i<r.len;i++){const q=r.s[i],d=(q.x-p.x)**2+(q.z-p.z)**2;if(d<bd){bd=d;bi=i;}}return{i:bi,d:Math.sqrt(bd)};}
/* rede viária: liga pontas e cruzamentos para carros e pedestres, e desenha os cruzamentos arredondados */
let graphDirty=true;const junctionG=new THREE.Group();scene.add(junctionG);
const jSide=new THREE.CircleGeometry(SW,24),jTop=new THREE.CircleGeometry(RW+.08,24);jSide.rotateX(-Math.PI/2);jTop.rotateX(-Math.PI/2);
const jSideM=new THREE.MeshLambertMaterial({color:'#cbc6bc'}),jTopM=new THREE.MeshLambertMaterial({color:'#4a4f56'});
function rebuildGraph(){for(const r of roads)r.conns=[];while(junctionG.children.length)junctionG.remove(junctionG.children[0]);
  for(let a=0;a<roads.length;a++)for(let b=a+1;b<roads.length;b++){const A=roads[a],Bq=roads[b];if(A.bb[1]<Bq.bb[0]||Bq.bb[1]<A.bb[0]||A.bb[3]<Bq.bb[2]||Bq.bb[3]<A.bb[2])continue;
    const pairs=[];for(const e of [0,A.len-1]){const n=nearestOn(Bq,A.s[e]);if(n.d<2.8)pairs.push([e,n.i]);}for(const e of [0,Bq.len-1]){const n=nearestOn(A,Bq.s[e]);if(n.d<2.8)pairs.push([n.i,e]);}
    for(let i=0;i<A.len;i++){const n=nearestOn(Bq,A.s[i]);if(n.d<1.3)pairs.push([i,n.i]);}
    pairs.sort((p,q)=>p[0]-q[0]);let last=-99;for(const [i,j] of pairs){if(i-last<6)continue;last=i;A.conns.push({i,r:Bq,j});Bq.conns.push({i:j,r:A,j:i});
      const p=A.s[i],q=Bq.s[j],y=Math.max(p.y,q.y);const s1=new THREE.Mesh(jSide,jSideM),s2=new THREE.Mesh(jTop,jTopM);s1.position.set((p.x+q.x)/2,y+.118,(p.z+q.z)/2);s2.position.set((p.x+q.x)/2,y+.142,(p.z+q.z)/2);s1.receiveShadow=s2.receiveShadow=true;junctionG.add(s1,s2);}}
  graphDirty=false;}
function recompute(){if(graphDirty)rebuildGraph();for(const b of buildings)b.conn=B[b.t].cat==='dec'?true:(()=>{const n=nearestRoad(b.x,b.z);return !!n&&n.d<=b.r+4.4;})();dirty=false;}
function roadPoint(r,s,off){const i=clamp(Math.floor(s),0,r.len-1),j=Math.min(i+1,r.len-1),f=clamp(s-i,0,1),a=r.s[i],b=r.s[j];let tx=b.x-a.x,tz=b.z-a.z;if(i===j){const c=r.s[Math.max(0,i-1)];tx=a.x-c.x;tz=a.z-c.z;}
  const l=Math.hypot(tx,tz)||1;return{x:a.x+(b.x-a.x)*f+(-tz/l)*off,y:a.y+(b.y-a.y)*f,z:a.z+(b.z-a.z)*f+(tx/l)*off,tx:tx/l,tz:tz/l};}
/* ---------- vida: pessoas arredondadas, carros com rodas, animais ---------- */
const SKIN=['#f1c9a5','#e0ac86','#c68a62','#8d5a3b','#5e3b26'],HAIR=['#2b1d14','#5a3a22','#a8743f','#d8b46a','#1a1a1a','#8a8a8a'],
  SHIRT=['#d9534f','#3d74a8','#f3efe6','#5a8a46','#e8b86b','#8e3b3b','#c4b3dc','#2f7a78','#f08a3c','#ffffff','#2b2f36','#e06a9a'],PANTS=['#2e3a4f','#3b3b3b','#6b5a45','#24497a','#7a6a5a','#e8e2d6'];
const PGEO=[];
function mkPerson(i,hat){const R=rng(i*977+13),skin=pick2(R,SKIN),hair=pick2(R,HAIR),shirt=hat?'#f08a3c':pick2(R,SHIRT),pants=pick2(R,PANTS),dress=!hat&&R()<.25;
  const u=new Vox();u.cyl(0,0,0,.17,.5,shirt,8,.15);if(dress)u.cyl(0,-.2,0,.25,.32,shirt,8,.17,false,false);u.cyl(0,.5,0,.06,.07,skin,6);u.ball(0,.68,0,.15,skin,1.05,1,.04);u.ball(0,.735,-.02,.157,hair,.72,1,.05);
  if(hat){u.cyl(0,.79,0,.2,.04,'#f2c230',10);u.ball(0,.8,0,.16,'#f2c230',.65,1,0);}else if(R()<.15)u.cyl(0,.82,0,.17,.1,pick2(R,['#ffffff','#3d74a8','#d9534f']),10,.15);
  const l=new Vox();l.cyl(0,-.43,0,.065,.43,dress?skin:pants,6,.07);l.box(0,-.47,.04,.12,.06,.2,'#2b2b2b');
  const a=new Vox();a.cyl(0,-.38,0,.05,.38,shirt,6,.055);a.ball(0,-.41,0,.055,skin,1,0,0);
  return{up:toGeo(u.b,u.t),leg:toGeo(l.b,l.t),arm:toGeo(a.b,a.t)};}
for(let i=0;i<16;i++)PGEO.push(mkPerson(i,false));const PHAT=[mkPerson(91,true),mkPerson(92,true)];
const blobG=new THREE.CircleGeometry(.3,10);blobG.rotateX(-Math.PI/2);const blobM=new THREE.MeshBasicMaterial({color:'#000',transparent:true,opacity:.2,depthWrite:false});
const crateG=(()=>{const v=new Vox();v.box(0,-.14,0,.36,.28,.3,'#a8763f');return toGeo(v.b);})();
const lifeG=new THREE.Group();scene.add(lifeG);
function newPerson(k,hat){const P=hat?PHAT[k%2]:PGEO[k%PGEO.length],g=new THREE.Group(),M=x=>new THREE.Mesh(x,matBody),up=M(P.up),l1=M(P.leg),l2=M(P.leg),a1=M(P.arm),a2=M(P.arm),bl=new THREE.Mesh(blobG,blobM);
  up.position.y=.47;l1.position.set(-.08,.47,0);l2.position.set(.08,.47,0);a1.position.set(-.22,.92,0);a2.position.set(.22,.92,0);bl.position.y=.03;g.add(up,l1,l2,a1,a2,bl);
  const cr=M(crateG);cr.position.set(0,.8,.32);cr.visible=false;g.add(cr);g.userData={up,l1,l2,a1,a2,cr};lifeG.add(g);return g;}
function animPerson(g,mode,t,ph){const u=g.userData;let lg=0,ar=0,bend=0,y=0,arz=0,a2x=null;
  if(mode==='walk'){const s=Math.sin(t*7+ph);lg=s*.55;ar=-s*.45;y=Math.abs(Math.cos(t*7+ph))*.04;}
  else if(mode==='hoe'){const s=Math.sin(t*3+ph);bend=.38+s*.14;ar=-1.05+s*.55;}
  else if(mode==='carry'){const s=Math.sin(t*7+ph);lg=s*.5;ar=-1.2;y=Math.abs(Math.cos(t*7+ph))*.03;}
  else if(mode==='dance'){const s=Math.sin(t*6+ph);y=Math.abs(s)*.14;ar=-2.5+Math.sin(t*6+ph+1)*.45;arz=s*.3;lg=s*.25;}
  else if(mode==='cheer'){y=Math.max(0,Math.sin(t*5+ph))*.12;ar=-2.7;}
  else if(mode==='sit'){lg=-1.45;ar=-.25;y=-.32;}
  else{ar=Math.sin(t*1.3+ph)*.06;if(Math.sin(t*.7+ph)>.93)a2x=-2.4+Math.sin(t*9)*.3;}
  u.l1.rotation.x=lg;u.l2.rotation.x=mode==='sit'?lg:-lg;u.a1.rotation.x=ar;u.a2.rotation.x=a2x!==null?a2x:(mode==='walk'?-ar:ar);u.a1.rotation.z=-arz;u.a2.rotation.z=arz;
  u.up.rotation.x=bend;u.up.position.y=.47+y;u.l1.position.y=u.l2.position.y=.47+y;u.a1.position.y=u.a2.position.y=.92+y-bend*.12;u.cr.visible=mode==='carry';}
const loc=(b,px,pz)=>({x:b.x+px*Math.cos(b.a)+pz*Math.sin(b.a),z:b.z-px*Math.sin(b.a)+pz*Math.cos(b.a)});
const door=b=>loc(b,0,b.r+.3);
/* trabalhadores em cada lugar */
const JOBS={fazenda:{m:'hoe',pts:[[-3,1.5],[-1.4,-2],[-2.6,-.8]]},pomar:{m:'hoe',pts:[[-1.3,1.1],[1.3,-1.1]]},pasto:{m:'idle',pts:[[2.2,-1.1]]},galinheiro:{m:'idle',pts:[[1.4,1.2]]},
  serraria:{m:'carry',path:[[-1.6,1.7],[1.6,1.7]]},cais:{m:'carry',path:[[-.6,.4],[-.6,6]]},estaleiro:{m:'carry',path:[[1.4,-1.4],[1.4,5]],n:3},oficina:{m:'carry',path:[[1.4,2.4],[-1.4,2.4]]},
  mercado:{m:'idle',pts:[[-2,-.35],[2,-.35],[0,2.25]]},cafe:{m:'idle',pts:[[-1,3.7],[1,3.7]]},escola:{m:'idle',pts:[[-1.1,2.7],[1.1,2.7]]},capela:{m:'idle',pts:[[0,3.9]]},
  termica:{m:'idle',pts:[[-1,2.7],[1.8,2.7]],hat:1},bomba:{m:'idle',pts:[[0,2.2]],hat:1},solar:{m:'idle',pts:[[2.6,2.4]],hat:1},silo:{m:'idle',pts:[[1.2,1.6]]},
  balada:{m:'dance',pts:[[-1.6,3.1],[-.8,3.5],[0,3.2],[.8,3.6],[1.6,3.1],[0,4.1]],h:[20,4]},
  praia:{m:'sit',pts:[[-2.2,2.3],[-.6,3.1],[1,2.5],[2.2,3.3],[-1.4,4.1],[.4,4.5]],h:[8,18]}};
const workers=new Map();let pedSeq=0;
const inHours=(h,a,b)=>a<b?h>=a&&h<b:h>=a||h<b;
function syncWorkers(){const h=S.tod*24,alive=new Set();
  for(const b of buildings){const J=JOBS[b.t];if(!J||!b.conn)continue;const hr=J.h||[7,19];if(!inHours(h,hr[0],hr[1]))continue;alive.add(b.id);if(workers.has(b.id))continue;
    const list=[],n=J.path?(J.n||2):J.pts.length;for(let i=0;i<n;i++){const g=newPerson(b.id*7+i,J.hat&&i%2===0);const w={g,b,J,i,ph:Math.random()*9,t:Math.random()};list.push(w);}workers.set(b.id,list);}
  for(const [id,list] of workers)if(!alive.has(id)){for(const w of list)lifeG.remove(w.g);workers.delete(id);}}
function stepWorkers(dt,t){for(const list of workers.values())for(const w of list){const {b,J}=w;
  if(J.path){w.t+=dt*.18;const k=(Math.sin(w.t*Math.PI*2+w.i*2)+1)/2,p0=J.path[0],p1=J.path[1],q=loc(b,p0[0]+(p1[0]-p0[0])*k+w.i*.5,p0[1]+(p1[1]-p0[1])*k);
    const dir=Math.cos(w.t*Math.PI*2+w.i*2);w.g.position.set(q.x,0,q.z);w.g.rotation.y=b.a+Math.atan2(p1[0]-p0[0],p1[1]-p0[1])+(dir<0?Math.PI:0);animPerson(w.g,Math.abs(dir)>.15?'carry':'idle',t,w.ph);}
  else{const p=J.pts[w.i],q=loc(b,p[0],p[1]);w.g.position.set(q.x,0,q.z);w.g.rotation.y=b.a+(J.m==='hoe'?w.i*1.7:J.m==='sit'?Math.PI+w.i*.4:Math.PI+Math.sin(t*.3+w.ph)*.6);animPerson(w.g,J.m,t,w.ph);}}}
/* pedestres: saem das casas, andam pelas calçadas e entram em outros lugares */
const peds=[];
function pedTarget(){const h=S.tod*24,f=h<5?.08:h<7?.35:h<9.5?1:h<16?.7:h<20?1:h<23?.5:.18;return roads.length?Math.round(Math.min(LOW?28:56,S.pop/2)*f):0;}
function spawnPed(){const occ=buildings.filter(b=>b.conn&&(B[b.t].cap?b.res>0:B[b.t].jobs));if(!occ.length)return;const b=pick(occ),d=door(b),n=nearestRoad(d.x,d.z);if(!n||n.d>9)return;
  const r=n.r,side=((d.x-n.x)*(-roadPoint(r,n.i,0).tz)+(d.z-n.z)*roadPoint(r,n.i,0).tx)>=0?1:-1,g=newPerson(pedSeq++);g.scale.setScalar(.01);
  peds.push({g,ph:'out',a:d,c:roadPoint(r,n.i,1.85*side),r,s:n.i,side,dir:Math.random()<.5?1:-1,spd:rand(1.1,1.6),left:rand(18,60),t:0,k:Math.random()*9,lastC:-1});}
function stepPeds(dt,t){const want=pedTarget();if(peds.length<want&&Math.random()<.15)spawnPed();
  for(let i=peds.length-1;i>=0;i--){const p=peds[i],g=p.g;if(!roads.includes(p.r)&&p.ph==='walk')p.ph='gone';
    if(p.ph==='out'||p.ph==='in'){const L=Math.hypot(p.c.x-p.a.x,p.c.z-p.a.z)||1;p.t+=dt*p.spd/L;const k=Math.min(1,p.t),x=p.a.x+(p.c.x-p.a.x)*k,z=p.a.z+(p.c.z-p.a.z)*k;
      g.position.set(x,(p.a.y||0)+((p.c.y||0)-(p.a.y||0))*k,z);g.rotation.y=Math.atan2(p.c.x-p.a.x,p.c.z-p.a.z);g.scale.setScalar(p.ph==='out'?Math.min(1,p.t*5+.01):Math.max(.01,(1-k)*5));animPerson(g,'walk',t,p.k);
      if(k>=1){if(p.ph==='out'){p.ph='walk';}else p.ph='gone';}}
    else if(p.ph==='walk'){const r=p.r;p.s+=p.dir*p.spd*dt;p.left-=p.spd*dt;const fi=Math.floor(p.s);
      if(fi!==p.lastC){p.lastC=fi;const c=r.conns.find(c=>c.i===fi);if(c&&Math.random()<.35){p.r=c.r;p.s=c.j;p.dir=c.j<2?1:c.j>c.r.len-3?-1:(Math.random()<.5?1:-1);p.lastC=c.j;}}
      if(p.s<0||p.s>p.r.len-1){p.dir*=-1;p.s=clamp(p.s,0,p.r.len-1);}
      const q=roadPoint(p.r,p.s,1.85*p.side);g.position.set(q.x,q.y+.1,q.z);g.rotation.y=Math.atan2(q.tx*p.dir,q.tz*p.dir);animPerson(g,'walk',t,p.k);
      if(p.left<=0){let best=null,bd=9;for(const b of buildings){if(B[b.t].cat==='dec')continue;const dd=Math.hypot(b.x-q.x,b.z-q.z)-b.r;if(dd<bd){bd=dd;best=b;}}
        if(best){p.ph='in';p.a={x:q.x,y:q.y,z:q.z};p.c=door(best);p.t=0;}else p.left=rand(10,30);}}
    if(p.ph==='gone'){lifeG.remove(g);peds.splice(i,1);}}
  while(peds.length>want+6){const p=peds.pop();lifeG.remove(p.g);}}
/* carros: vários modelos, rodas girando, mão direita, respeitam o carro da frente e escolhem caminhos nos cruzamentos */
const CAR_COL=['#c93a3a','#2f5fa8','#e8e8e8','#2b2f36','#9aa3ab','#2f7a5a','#e0a030','#7a3fa0','#d96a2c','#5a7fa8'];
const wheelG=(()=>{const v=new Vox();v.cylX(0,0,0,.2,.15,'#1d1f22',10);v.cylX(0,0,0,.1,.17,'#b9bfc6',8);return toGeo(v.b,v.t);})();
function carModel(type,col){const v=new Vox(),L=new Vox(),G='#22303c';let len=2,w=.92,wz=.62;
  const lights=(zf,zr,y)=>{for(const sx of [-1,1]){L.box(sx*.3,y,zf,.2,.1,.04,'#fff5c8');L.box(sx*.32,y+.02,zr,.18,.1,.04,'#ff3a2e');}};
  if(type==='bus'){len=4.4;w=1.06;wz=1.4;v.box(0,.2,0,w,1.35,len,col);v.box(0,.85,0,w+.02,.5,len-.6,G);v.box(0,.85,len/2+.005,w-.2,.55,.02,G);v.box(0,1.55,0,w-.1,.1,len-.4,'#d9dde0');lights(len/2+.01,-len/2-.01,.4);}
  else if(type==='truck'){len=4;w=1.04;wz=1.3;v.box(0,.2,1.35,w,1.1,1.25,col);v.box(0,.8,1.99,w-.1,.4,.02,G);v.box(0,.3,-.55,w+.02,1.35,2.85,pick(['#e8e8e8','#f2c230','#3d74a8']));lights(2.0,-2,.42);}
  else if(type==='van'){len=2.2;w=.96;wz=.7;v.box(0,.2,0,w,1.05,len,col);v.box(0,.78,.62,w+.02,.36,.9,G);v.box(0,.78,1.105,w-.12,.36,.02,G);lights(1.11,-1.11,.38);}
  else if(type==='pickup'){len=2.15;wz=.68;v.box(0,.22,0,w,.4,len,col);v.box(0,.62,.35,.86,.42,.95,col);v.box(0,.66,.35,.88,.3,.85,G);for(const sx of [-1,1])v.box(sx*.43,.62,-.6,.06,.22,.9,col);v.box(0,.62,-1.04,.92,.22,.06,col);lights(1.08,-1.08,.36);}
  else{const hatch=type==='hatch',suv=type==='suv';len=hatch?1.75:suv?2.1:2;const bh=suv?.5:.38,ch=suv?.46:.37,cl=hatch?1:suv?1.35:1.05,cz=hatch?-.18:-.08;wz=len*.32;
    v.box(0,.2,0,w,bh,len,col);v.box(0,.2+bh,cz,w-.1,ch,cl,col);v.box(0,.24+bh,cz,w-.08,ch-.1,cl-.12,G);v.box(0,.2,len/2+.02,w-.05,.14,.05,'#2a2a2a');v.box(0,.2,-len/2-.02,w-.05,.14,.05,'#2a2a2a');
    lights(len/2+.01,-len/2-.01,.2+bh*.6);if(type==='taxi')L.box(0,.2+bh+ch+.05,cz,.32,.12,.2,'#fff1a0');}
  return{body:toGeo(v.b,v.t),light:toGeo(L.b,L.t),len,w,wz};}
const CTYPES=['sedan','sedan','hatch','hatch','suv','pickup','van','taxi','bus','truck'],CGEO=[];
for(let i=0;i<22;i++){const t=CTYPES[i%CTYPES.length];CGEO.push({t,...carModel(t,t==='taxi'?'#f2c230':t==='bus'?pick(['#d9534f','#2f7a78','#3d74a8']):CAR_COL[i%CAR_COL.length])});}
const carBlob=new THREE.CircleGeometry(.6,12);carBlob.rotateX(-Math.PI/2);
const cars=[];
function carTarget(){const h=S.tod*24,f=h<5?.3:h<7?.6:h<20?1:h<23?.7:.45;const ok=roads.filter(r=>r.len>=6).length;return ok?Math.round(Math.min(LOW?12:26,2+S.pop/5)*f):0;}
function spawnCar(){const rs=roads.filter(r=>r.len>=6);if(!rs.length)return;const r=pick(rs),M=pick(CGEO),g=new THREE.Group(),body=new THREE.Mesh(M.body,matBody),lt=new THREE.Mesh(M.light,matLight),bl=new THREE.Mesh(carBlob,blobM);
  body.castShadow=true;bl.scale.set(M.w*1.2,1,M.len*.62);bl.position.y=.03;g.add(body,lt,bl);const wh=[];for(const sx of [-1,1])for(const sz of [-1,1]){const m=new THREE.Mesh(wheelG,matBody);m.position.set(sx*(M.w/2),.2,sz*M.wz);g.add(m);wh.push(m);}
  g.traverse(m=>m.raycast=()=>{});lifeG.add(g);const max=M.t==='bus'||M.t==='truck'?rand(2.4,3):rand(3.4,5);cars.push({g,wh,r,s:2+Math.random()*(r.len-4),dir:Math.random()<.5?1:-1,spd:0,max,len:M.len,lastC:-1,cool:0});}
function stepCars(dt){const want=carTarget();if(cars.length<want&&Math.random()<.08)spawnCar();if(cars.length>want&&Math.random()<.02){const c=cars.shift();lifeG.remove(c.g);}
  for(let i=cars.length-1;i>=0;i--){const c=cars[i];if(!roads.includes(c.r)){lifeG.remove(c.g);cars.splice(i,1);continue;}
    let tgt=c.max;for(const o of cars){if(o===c||o.r!==c.r||o.dir!==c.dir)continue;const gap=(o.s-c.s)*c.dir;if(gap>0&&gap<(c.len+o.len)/2+1.6)tgt=Math.min(tgt,o.spd*.9,(gap-(c.len+o.len)/2)*1.2);}
    c.spd+=(Math.max(0,tgt)-c.spd)*Math.min(1,dt*2.2);c.s+=c.dir*c.spd*dt;c.cool-=dt;const fi=Math.floor(c.s);
    if(fi!==c.lastC&&c.cool<=0){c.lastC=fi;const cn=c.r.conns.find(k=>k.i===fi);if(cn&&cn.r.len>=6&&Math.random()<.45){c.r=cn.r;c.s=clamp(cn.j,.5,cn.r.len-1.5);c.dir=cn.j<2?1:cn.j>cn.r.len-3?-1:(Math.random()<.5?1:-1);c.cool=1.2;c.lastC=Math.floor(c.s);}}
    if(c.s<.5||c.s>c.r.len-1.5){const end=c.s<.5?0:c.r.len-1,cn=c.r.conns.find(k=>Math.abs(k.i-end)<2);
      if(cn&&cn.r.len>=6&&c.cool<=0){c.r=cn.r;c.s=clamp(cn.j,.5,cn.r.len-1.5);c.dir=cn.j<2?1:cn.j>cn.r.len-3?-1:(Math.random()<.5?1:-1);c.cool=1.2;}else{c.dir*=-1;c.s=clamp(c.s,.5,c.r.len-1.5);}}
    const q=roadPoint(c.r,c.s,.72*c.dir);c.g.position.set(q.x,q.y+.14,q.z);c.g.rotation.y=Math.atan2(q.tx*c.dir,q.tz*c.dir);for(const w of c.wh)w.rotation.x+=c.spd*dt/.2;}}
/* animais: vacas no pasto, galinhas, patos na lagoa */
const ANIM={cow:(()=>{const v=new Vox();v.ball(0,.75,0,.55,'#f4f1ea',.75,1,.08);v.ball(.15,.85,.1,.22,'#2b2b2b',.6,0,0);v.ball(-.2,.7,-.2,.2,'#2b2b2b',.7,0,0);v.ball(0,.9,.62,.24,'#f4f1ea',1,1,.05);v.box(0,.82,.86,.2,.14,.08,'#e9a9a0');
    for(const [x,z] of [[-.22,-.3],[.22,-.3],[-.22,.3],[.22,.3]])v.cyl(x,0,z,.07,.5,'#e8e4dc',6);return toGeo(v.b,v.t);})(),
  hen:(()=>{const v=new Vox();v.ball(0,.22,0,.16,'#f7f4ec',1,1,.05);v.ball(0,.36,.1,.08,'#f7f4ec',1,0,0);v.box(0,.45,.1,.03,.06,.08,'#d8352a');v.box(0,.35,.19,.04,.03,.06,'#f0a030');for(const x of [-.05,.05])v.cyl(x,0,0,.015,.08,'#f0a030',4);return toGeo(v.b,v.t);})(),
  duck:(()=>{const v=new Vox();v.ball(0,.12,0,.2,'#f4f1e8',.7,1,.04);v.ball(0,.3,.14,.1,'#2f6b3a',1,0,0);v.box(0,.28,.26,.05,.03,.1,'#f0a030');return toGeo(v.b,v.t);})()};
const critters=new Map();
function syncCritters(){const alive=new Set();for(const b of buildings){const kind=b.t==='pasto'?'cow':b.t==='galinheiro'?'hen':b.t==='lagoa'?'duck':null;if(!kind)continue;alive.add(b.id);if(critters.has(b.id))continue;
    const n=kind==='cow'?3:kind==='hen'?5:2,list=[];for(let i=0;i<n;i++){const m=new THREE.Mesh(ANIM[kind],matBody);m.castShadow=kind==='cow';m.raycast=()=>{};lifeG.add(m);list.push({m,kind,b,x:rand(-1,1),z:rand(-1,1),tx:0,tz:0,t:Math.random()*5,ph:Math.random()*9});}critters.set(b.id,list);}
  for(const [id,list] of critters)if(!alive.has(id)){for(const c of list)lifeG.remove(c.m);critters.delete(id);}}
function stepCritters(dt,t){for(const list of critters.values())for(const c of list){const R0=c.kind==='cow'?3:c.kind==='hen'?1.5:2.3;
  if(c.kind==='duck'){const a=t*.3+c.ph;c.x=Math.cos(a)*R0*.7;c.z=Math.sin(a)*R0*.7;const q=loc(c.b,c.x,c.z);c.m.position.set(q.x,.06+Math.sin(t*2+c.ph)*.02,q.z);c.m.rotation.y=-a+c.b.a;continue;}
  c.t-=dt;if(c.t<=0){c.t=rand(2,6);const a=Math.random()*6.28,r=Math.random()*R0;c.tx=Math.cos(a)*r;c.tz=Math.sin(a)*r;}
  const dx=c.tx-c.x,dz=c.tz-c.z,d=Math.hypot(dx,dz),sp=c.kind==='cow'?.35:.6;if(d>.05){c.x+=dx/d*Math.min(d,sp*dt);c.z+=dz/d*Math.min(d,sp*dt);c.m.rotation.y=Math.atan2(dx,dz)+c.b.a;}
  const q=loc(c.b,c.x,c.z+(c.kind==='hen'?-.5:0));c.m.position.set(q.x,c.kind==='hen'?Math.max(0,Math.sin(t*9+c.ph))*.05:0,q.z);}}
function syncLife(){syncWorkers();syncCritters();}
function stepLife(dt,t){if(dt>0){stepPeds(dt,t);stepCars(dt);}stepWorkers(dt,t);stepCritters(dt,t);}
function clearLife(){for(const p of peds)lifeG.remove(p.g);peds.length=0;for(const c of cars)lifeG.remove(c.g);cars.length=0;for(const l of workers.values())for(const w of l)lifeG.remove(w.g);workers.clear();for(const l of critters.values())for(const c of l)lifeG.remove(c.m);critters.clear();}

/* ---------- camera ---------- */
const cam={x:0,z:0,yaw:.8,pitch:.72,dist:80,tx:0,tz:0,tyaw:.8,tpitch:.72,tdist:80};
function camVecs(){const f={x:-Math.sin(cam.yaw),z:-Math.cos(cam.yaw)};return{f,r:{x:-f.z,z:f.x}};}
function updateCam(dt){const k=clamp(1-Math.pow(.0005,dt),0,1);for(const p of ['x','z','yaw','pitch','dist']){cam[p]+=(cam['t'+p]-cam[p])*k;if(!isFinite(cam[p])||!isFinite(cam['t'+p])){Object.assign(cam,{x:0,z:8,yaw:.8,pitch:.75,dist:60,tx:0,tz:8,tyaw:.8,tpitch:.75,tdist:60});break;}}
  const cp=Math.cos(cam.pitch);camera.position.set(cam.x+Math.sin(cam.yaw)*cp*cam.dist,Math.sin(cam.pitch)*cam.dist,cam.z+Math.cos(cam.yaw)*cp*cam.dist);camera.lookAt(cam.x,0,cam.z);}
function panBy(dx,dz){cam.tx=clamp(cam.tx+dx,-MAPB,MAPB);cam.tz=clamp(cam.tz+dz,-MAPB,MAPB);}

/* ---------- time & light ---------- */
const SKY=[[0,'#0c1a30'],[5,'#1d2a4a'],[6.3,'#f0b48c'],[8,'#a8d8ea'],[16.5,'#a8d8ea'],[18.3,'#f29e74'],[19.6,'#3a3560'],[21,'#0c1a30'],[24,'#0c1a30']];
function skyAt(h){for(let i=0;i<SKY.length-1;i++)if(h>=SKY[i][0]&&h<=SKY[i+1][0]){const t=(h-SKY[i][0])/(SKY[i+1][0]-SKY[i][0]);return new THREE.Color(SKY[i][1]).lerp(new THREE.Color(SKY[i+1][1]),t);}return new THREE.Color(SKY[0][1]);}
let nightK=0;
/* ---------- estações do ano e clima ---------- */
const SEAS=['Verão','Outono','Inverno','Primavera'],SEAS_DAYS=6,SEAS_FOOD=[1,1.15,.85,1.05],SEAS_DAYLEN=[13.4,12,10.6,12.1];
const SEAS_MSG=['Dias longos, praia cheia e pancadas de chuva no fim da tarde.','As árvores ficam douradas e é tempo de colheita: +15% de comida.','Frente fria: dias curtos, névoa de manhã e garoa. As fazendas rendem menos.','As árvores florescem em rosa e amarelo e o mato fica verdinho.'];
const W={rain:0,target:0,storm:false,timer:40,flash:0,w:[1,0,0,0],idx:0,fog:1};
function seasonW(day,tod){const y=((day-1+tod)/SEAS_DAYS)%4,i=Math.floor(y),f=y-i,bl=sstep(1-.8/SEAS_DAYS,1,f),w=[0,0,0,0];w[i]=1-bl;w[(i+1)%4]+=bl;return{w,i};}
const sMix=a=>a[0]*W.w[0]+a[1]*W.w[1]+a[2]*W.w[2]+a[3]*W.w[3];
function seasonFood(){return sMix(SEAS_FOOD);}
function updateSeason(dt,sp){const r=seasonW(S.day,S.tod);W.w=r.w;if(W.sref!==S){W.sref=S;W.idx=r.i;}
  seasonU.uSeas.value.set(W.w[1],W.w[2],W.w[3],W.w[0]);seasonU.uBloom.value=sMix([.8,.42,.15,1.25]);
  if(r.i!==W.idx){W.idx=r.i;if(!inMenu&&S.time>5){toast(`Chegou o ${SEAS[r.i]}`);log(`<b>${SEAS[r.i]}</b>: ${SEAS_MSG[r.i]}`);}}
  // clima: sorteia chuva conforme a estação (verão: temporal à tarde; inverno: garoa)
  if(!inMenu&&sp){W.timer-=dt*sp;if(W.timer<=0){const h=S.tod*24,si=r.i,pm=h>13&&h<20;
      const p=[pm?.42:.1,.2,.34,.16][si];if(W.target>0||Math.random()>p){W.target=0;W.storm=false;W.timer=rand(60,150);}
      else{W.storm=si===0||(si!==2&&Math.random()<.3);W.target=si===2&&!W.storm?.55:rand(.75,1);W.timer=rand(35,90);}}}
  if(inMenu){W.target=0;}
  W.rain+=(W.target-W.rain)*Math.min(1,dt*.35);if(W.rain<.004)W.rain=0;
  if(W.storm&&W.rain>.6&&Math.random()<dt*.09){W.flash=1;setTimeout(()=>sfx('thunder'),300+Math.random()*1200);}W.flash=Math.max(0,W.flash-dt*3.5);
  const h=S.tod*24;W.fog=1-W.rain*.38-W.w[2]*sstep(4.5,6.5,h)*(1-sstep(8.5,10.5,h))*.55;}
function applyLight(tod){const D=sMix(SEAS_DAYLEN),h0=tod*24,h=clamp(12+(h0-12)*12/D,0,24);
  const el=Math.sin((h-6)/12*Math.PI),az=(h-6)/12*Math.PI;const sky=skyAt(h),rn=W.rain;
  if(rn>0)sky.lerp(new THREE.Color(nightK>.5?'#1a2230':'#7f8b96'),rn*.62);if(W.flash>0)sky.lerp(new THREE.Color('#e8eefc'),W.flash*.7);
  scene.background=sky;scene.fog.color.copy(sky);scene.fog.near=170*W.fog;scene.fog.far=460*(.55+.45*W.fog);
  const day=clamp(el*1.6,0,1);nightK=clamp((.12-el)*3.5,0,1);
  let dir;if(el>-.05){dir=new THREE.Vector3(Math.cos(az)*.9,Math.max(.12,el)*(1-W.w[2]*.25),Math.sin(az)*.55+.35).normalize();
    sun.color.set('#ffb36b').lerp(new THREE.Color('#fff4e0'),clamp(el*1.8,0,1));if(W.w[1]>0)sun.color.lerp(new THREE.Color('#ffd29a'),W.w[1]*.35);if(W.w[2]>0)sun.color.lerp(new THREE.Color('#e4ecff'),W.w[2]*.35);
    sun.intensity=(.25+.8*day)*(1-rn*.62);}
  else{dir=new THREE.Vector3(-.4,.85,.35).normalize();sun.color.set('#7d93cf');sun.intensity=.32*(1-rn*.5);}
  sun.position.set(cam.x+dir.x*120,dir.y*120,cam.z+dir.z*120);sun.target.position.set(cam.x,0,cam.z);
  hemi.intensity=(.3+.35*day)*(1+rn*.15)+W.flash*1.6;hemi.color.set(sky).lerp(new THREE.Color('#ffffff'),.5);
  {const U=waterMat.uniforms;U.uSun.value.copy(dir);U.uSunCol.value.copy(sun.color).multiplyScalar(1-rn*.7);U.uSky.value.copy(sky);U.uNight.value=nightK;}matGlow.emissiveIntensity=nightK*1.1;}

/* ---------- UI helpers ---------- */
let toastT;function toast(t){const e=$('#toast');e.textContent=t;e.style.opacity=1;clearTimeout(toastT);toastT=setTimeout(()=>e.style.opacity=0,2600);}
const logs=[];function log(t){logs.unshift(`<div><b>Dia ${S.day}</b> · ${t}</div>`);logs.length=Math.min(logs.length,14);$('#log').innerHTML=logs.join('');}
const fmt=n=>sand()?'∞':Math.floor(n).toLocaleString('pt-BR');
function rate(el,v){el.textContent=sand()||!v?'':(v>=0?'+':'')+v.toFixed(1)+'/s';el.style.color=v<0?'var(--bad)':'var(--ok)';}
function hud(){if(S.pw){const e=$('#rE'),a=$('#rA');e.textContent=`${Math.round(S.pw.p)}/${Math.round(S.pw.d)}`;a.textContent=`${Math.round(S.wt.p)}/${Math.round(S.wt.d)}`;e.parentNode.classList.toggle('low',S.pw.p+.01<S.pw.d);a.parentNode.classList.toggle('low',S.wt.p+.01<S.wt.d);}$('#rM').textContent=fmt(S.m);$('#rW').textContent=fmt(S.w);$('#rF').textContent=fmt(S.f);$('#rG').textContent=fmt(S.g);$('#rP').textContent=S.pop;$('#rH').textContent=S.hap+'%';
  rate($('#dM'),S.rates.m||0);rate($('#dF'),S.rates.f||0);const h=S.tod*24;$('#clock').textContent=`${SEAS[W.idx]} · Dia ${S.day} · ${String(Math.floor(h)).padStart(2,'0')}:${String(Math.floor(h%1*60)).padStart(2,'0')}`;
  $('#rR').textContent=sand()?'':S.cur?`· ${RS[S.cur].n} ${Math.floor(S.rp/RS[S.cur].cost*100)}%`:'· escolha';}

/* ---------- tools ---------- */
const ICON={rua:'<path d="M7 21c1-6 9-8 10-18" stroke="currentColor" stroke-width="2.4" fill="none" stroke-linecap="round"/><path d="M12 6v2M11 12v2M9 17v2" stroke="currentColor" stroke-width="1.6"/>',mor:'<path d="M3 11 12 4l9 7v9H3z" fill="currentColor"/>',trab:'<path d="M3 20V9l5 3V9l5 3V5h4l1 15z" fill="currentColor"/>',com:'<path d="M12 3c3 4 5 6 5 9a5 5 0 0 1-10 0c0-3 2-5 5-9z" fill="currentColor"/>',dec:'<circle cx="12" cy="9" r="6" fill="currentColor"/><rect x="11" y="14" width="2" height="7" fill="currentColor"/>',dem:'<path d="M5 5l14 14M19 5 5 19" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/>'};
ICON.util='<path d="M13 2L5 13h6l-1 9 8-11h-6z" fill="currentColor"/>';ICON.lazer='<path d="M12 2l2.9 6.2 6.6.8-4.9 4.6 1.3 6.6L12 17l-5.9 3.2 1.3-6.6L2.5 9l6.6-.8z" fill="currentColor"/>';
const CATS=[['rua','Ruas'],['mor','Moradia'],['trab','Trabalho'],['com','Serviços'],['util','Energia e água'],['lazer','Lazer'],['dec','Decoração'],['dem','Demolir']];
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
  else if(align&&d.cat!=='dec'){const n=nearestRoad(x,z);if(n&&n.d<d.r+6&&n.d>.01){const dx=n.x-x,dz=n.z-z;a=Math.atan2(dx,dz);const want=d.r+2.7;x=n.x-dx/n.d*want;z=n.z-dz/n.d*want;}}
  if(d.coast){const ld=landDist(x,z);if(ld<-2.5||ld>4)bad='Precisa ficar na beira do mar';else if(landDist(x+Math.sin(a)*6,z+Math.cos(a)*6)>-1)bad='A ponta do cais precisa alcançar a água';}
  else{if(Math.abs(x)>MAPB-d.r||Math.abs(z)>MAPB-d.r)bad='Fora da área da cidade';else if(landDist(x,z)<d.r*.6+1)bad='Na água ou muito perto dela';else if(hillAt(x,z)>.5||hillAt(x+d.r,z)>.6||hillAt(x-d.r,z)>.6||hillAt(x,z+d.r)>.6||hillAt(x,z-d.r)>.6)bad='Terreno de morro: íngreme demais';else for(let i=0;i<8;i++){const q=i/8*6.283;if(landDist(x+Math.cos(q)*d.r,z+Math.sin(q)*d.r)<.4){bad='Muito perto da água';break;}}}
  if(!bad)for(const b of buildings){const k=(B[b.t].cat==='dec'&&d.cat==='dec')?.75:.9;if(Math.hypot(b.x-x,b.z-z)<(d.r+b.r)*k){bad='Espaço ocupado';break;}}
  if(!bad){const n=nearestRoad(x,z);if(n&&n.d<d.r*.85+2.1)bad='Em cima da rua';if(d.cat!=='dec'&&(!n||n.d>d.r+4.4))warn='Sem rua por perto: não vai funcionar';}
  if(!bad&&d.nearWater&&landDist(x,z)>9&&!buildings.some(b=>b.t==='lagoa'&&dist(b,{x,z})<12))bad='Precisa ficar perto do mar ou de uma lagoa';
  if(!bad&&!unlocked(t))bad='Precisa de pesquisa';if(!bad&&!afford(d.cost))bad='Recursos insuficientes';
  return{x,z,a,bad,warn};}
function tryPlace(gp){const t=placeT,p=placement(t,gp);if(p.bad){toast(p.bad);return;}pay(B[t].cost);const b=addBuilding({t,x:p.x,z:p.z,a:p.a,anim:true});sfx(B[t].cat==='dec'?'pop':'build');
  if(B[t].cat==='dec')manualRot=Math.random()*6.28;checkReqDone(b);recompute();hud();}
function roadCost(pts){const s=sampleCurve(pts);return{s,m:Math.ceil(s.length*1.2+s.filter(p=>p.w).length*6)};}
function roadCheck(s){if(s[0].w||s[s.length-1].w)return 'A rua precisa começar e terminar em terra (pontes ligam dois lados)';let run=0,mx=0;for(const p of s){run=p.w?run+1:0;mx=Math.max(mx,run);if(landDist(p.x,p.z)<-26)return 'Muito longe da costa para uma ponte';}
  if(mx>48)return 'Ponte longa demais (máximo 48 m sobre a água)';if(s.some(p=>!p.w&&hillAt(p.x,p.z)>.7))return 'A rua não sobe o morro: contorne pela base';for(const p of s)for(const b of buildings)if(B[b.t].cat!=='dec'&&Math.hypot(b.x-p.x,b.z-p.z)<b.r*.85+1.9)return 'A rua passa por cima de uma construção';return '';}
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
const c1=t=>count(t,1),has=t=>c1(t)?1:0;
const OBJ=[
  {t:'Trace sua primeira rua',f:()=>roads.length>0,p:()=>[roads.length,1],r:50},
  {t:'Construa 3 Casinhas ao lado de uma rua',f:()=>c1('casa')>=3,p:()=>[c1('casa'),3],r:60},
  {t:"Construa uma Caixa d'água",f:()=>c1('caixa')>=1,p:()=>[c1('caixa'),1],r:60},
  {t:'Construa uma Fazenda e uma Usina solar',f:()=>has('fazenda')&&has('solar'),p:()=>[has('fazenda')+has('solar'),2],r:80},
  {t:'Alcance 15 moradores',f:()=>S.pop>=15,p:()=>[S.pop,15],r:100},
  {t:'Construa uma Serraria para ter madeira',f:()=>c1('serraria')>=1,p:()=>[c1('serraria'),1],r:60},
  {t:'Pesquise Alvenaria (botão de pesquisa)',f:()=>researched('alvenaria'),p:()=>[researched('alvenaria')?1:0,1],r:80},
  {t:'Construa um Mercado e uma Capela',f:()=>has('mercado')&&has('capela'),p:()=>[has('mercado')+has('capela'),2],r:150},
  {t:'Monte a fazenda completa: Pasto, Galinheiro e Pomar',f:()=>has('pasto')&&has('galinheiro')&&has('pomar'),p:()=>[has('pasto')+has('galinheiro')+has('pomar'),3],r:150},
  {t:'Embeleze a cidade com 12 decorações',f:()=>decorN()>=12,p:()=>[decorN(),12],r:100},
  {t:'Chegue a 50 moradores com 60% de felicidade',f:()=>S.pop>=50&&S.hap>=60,p:()=>[Math.min(S.pop,50),50],r:200},
  {t:'Pesquise Engenharia e erga uma Turbina eólica',f:()=>c1('eolica')>=1,p:()=>[c1('eolica'),1],r:150},
  {t:'Abra uma Praia na beira do mar',f:()=>c1('praia')>=1,p:()=>[c1('praia'),1],r:100},
  {t:'Pesquise Ofícios e construa um Café',f:()=>c1('cafe')>=1,p:()=>[c1('cafe'),1],r:150},
  {t:'Construa o Cais e venda 20 mercadorias',f:()=>c1('cais')&&S.sold>=20,p:()=>[Math.min(20,Math.floor(S.sold)),20],r:250},
  {t:'Ligue duas margens com uma ponte',f:()=>roads.some(r=>r.s.some(q=>q.w)),p:()=>[roads.some(r=>r.s.some(q=>q.w))?1:0,1],r:120},
  {t:'Pesquise Lazer e abra uma Balada',f:()=>c1('balada')>=1,p:()=>[c1('balada'),1],r:200},
  {t:'Construa 2 Casas burguesas e um Teatro',f:()=>c1('vila')>=2&&c1('teatro')>=1,p:()=>[Math.min(2,c1('vila'))+has('teatro'),3],r:300},
  {t:'Construa um Estádio',f:()=>c1('estadio')>=1,p:()=>[c1('estadio'),1],r:400},
  {t:'Pesquise Urbanismo e erga 2 Prédios residenciais',f:()=>c1('predio')>=2,p:()=>[c1('predio'),2],r:500},
  {t:'Chegue a 300 moradores e 8.000 moedas',f:()=>S.pop>=300&&S.m>=8000,p:()=>[Math.min(S.pop,300),300],r:0},
];
function objBar(){const el=$('#objBar');if(!el)return;if(sand()||S.obj>=OBJ.length){el.parentNode.classList.add('hide');return;}el.parentNode.classList.remove('hide');const [c,t]=OBJ[S.obj].p();el.style.width=Math.min(100,c/t*100)+'%';$('#objN').textContent=`${Math.min(c,t)|0}/${t}`;}
function showObj(){if(sand()){$('#objH').textContent='Modo sandbox';$('#objT').textContent='Tudo liberado e recursos infinitos. Construa à vontade.';$('#objR').textContent='';return;}
  if(S.obj>=OBJ.length){$('#objH').textContent='Campanha concluída';$('#objT').textContent='Continue expandindo sua cidade.';$('#objR').textContent='';return;}
  $('#objH').textContent=`Missão ${S.obj+1} de ${OBJ.length}`;$('#objT').textContent=OBJ[S.obj].t;$('#objR').textContent=OBJ[S.obj].r?`Recompensa: ${OBJ[S.obj].r} moedas`:'Objetivo final';}

/* ---------- simulation ---------- */
function tick(){rev++;if(dirty)recompute();const sb=sand();let pop=0;const hs=houses();for(const h of hs)pop+=h.res;
  let jobs=0;for(const b of buildings)if(B[b.t].jobs&&b.conn)jobs+=B[b.t].jobs;const staff=jobs?Math.min(1,pop*.7/jobs):1;S.staff=staff;S.pop=pop;
  let df=0,dw=0,dg=0,dm=0;const mills=buildings.filter(b=>b.t==='moinho'&&b.conn);
  const silos=buildings.filter(b=>b.t==='silo'&&b.conn);
  for(const b of buildings){if(!b.conn)continue;const bd=B[b.t];if(bd.food){let k=1;if(b.t==='fazenda'&&mills.some(m=>dist(m,b)<18))k+=.5;if(silos.some(m=>dist(m,b)<18))k+=.3;df+=bd.food*staff*k*seasonFood();}
    else if(b.t==='serraria')dw+=1.3*staff;else if(b.t==='oficina')dg+=.9*staff;else if(b.t==='escritorio')dm+=2.6*staff;else if(b.t==='estaleiro'){dm+=3*staff;dg+=.4*staff;}}
  /* energia e água: produção x consumo; os mais antigos são atendidos primeiro */
  const hour=S.tod*24,dayL=clamp(Math.sin((hour-6)/12*Math.PI)*1.6,0,1);let pP=0,pW=0;
  for(const b of buildings){if(!b.conn)continue;const bd=B[b.t];if(bd.pw)pP+=b.t==='solar'?6*dayL+2*(1-dayL):b.t==='eolica'?4*(.75+.25*Math.sin(S.time/37+b.id)):bd.pw*(bd.jobs?staff:1);if(bd.wt)pW+=bd.wt*(bd.jobs?Math.max(.4,staff):1);}
  let uP=0,uW=0,tP=0,tW=0;const pOK=new Set(),wOK=new Set();
  for(const b of buildings.filter(b=>b.conn&&(B[b.t].cap?b.res>0:B[b.t].jobs)).sort((a,b)=>a.id-b.id)){const bd=B[b.t],pn=bd.cap?b.res*.2:bd.jobs*.3,wn=bd.cap?b.res:bd.jobs*.3;tP+=pn;tW+=wn;
    if(uP+pn<=pP+1e-6){uP+=pn;pOK.add(b.id);}if(uW+wn<=pW+1e-6){uW+=wn;wOK.add(b.id);}}
  S.pw={p:pP,d:tP};S.wt={p:pW,d:tW};const polls=buildings.filter(b=>b.t==='termica'&&b.conn);
  const docks=count('cais',1);const sell=Math.min(S.g+dg,docks*1.4*staff);dg-=sell;dm+=sell*7;S.sold+=sell;
  if(researched('turismo'))dm+=docks*1.5+count('praca',1)*.6+count('teatro',1)*1.2;df-=pop*.035;
  const servs=buildings.filter(b=>B[b.t].serv&&b.conn),beaut=buildings.filter(b=>B[b.t].beauty);let hs2=0,hn=0;
  for(const h of hs){const d=B[h.t],needs=NEEDS[d.tier],met={};for(const n of needs)met[n]=sb||(n==='comida'?S.f>.5:n==='energia'?pOK.has(h.id):n==='agua'?(wOK.has(h.id)||servs.some(s=>B[s.t].serv==='agua'&&dist(s,h)<=B[s.t].rad)):servs.some(s=>B[s.t].serv===n&&dist(s,h)<=B[s.t].rad));
    let be=0;for(const o of beaut){const dd=dist(o,h);if(dd<12)be+=B[o.t].beauty*(1-dd/12);}for(const o of polls){const dd=dist(o,h);if(dd<20)be-=4*(1-dd/20);}h.beauty=clamp(be,-5,10);h.met=met;
    const mc=needs.filter(n=>met[n]).length;h.hap=h.conn?clamp(Math.round(mc/needs.length*75+Math.min(25,h.beauty*2.5)),0,100):0;if(h.res){hs2+=h.hap*h.res;hn+=h.res;}dm+=h.res*TAX[d.tier]*h.hap/100;
    if(h.conn&&h.hap>=35&&h.res<d.cap&&Math.random()<.03+h.hap/100*.08){if(!h.res){h.fam=newFam();h.res=Math.min(d.cap,2);log(`A família <b>${h.fam}</b> chegou e se mudou para um(a) ${d.n.toLowerCase()}.`);}else h.res++;}
    else if(h.res&&h.hap<25&&Math.random()<.04){h.res--;if(!h.res){log(`A família <b>${h.fam}</b> deixou a vila.`);h.fam=null;}}}
  S.hap=hn?Math.round(hs2/hn):0;if(!sb){S.f=Math.max(0,S.f+df);S.w+=dw;S.g=Math.max(0,S.g+dg);S.m+=dm;}S.rates={f:df,m:dm};
  if(S.cur&&!sb){S.rp+=.25+Math.sqrt(pop)*.06+count('escola',1)*.9*staff;if(S.rp>=RS[S.cur].cost){S.done.add(S.cur);toast(`Pesquisa concluída: ${RS[S.cur].n}`);log(`Pesquisa concluída: <b>${RS[S.cur].n}</b>.`);S.rp=0;S.cur=null;refreshTray();}}
  if(!S.req&&S.time>S.nextReq){const occ=hs.filter(h=>h.res);if(occ.length){const h=pick(occ),opts=['flores','banco','poste','oliveira','arbusto'];if(unlocked('praca'))opts.push('praca');if(unlocked('cipreste'))opts.push('cipreste');
      const t=pick(opts);S.req={id:h.id,t,want:WANT[t],until:S.time+180,who:`${pick(FIRST)} ${h.fam}`};log(`<b>${S.req.who}</b> fez um pedido.`);showReq();}S.nextReq=S.time+rand(70,120);}
  if(S.req){const h=buildings.find(x=>x.id===S.req.id);if(!h)clearReq();else if(S.time>S.req.until){log(`<b>${S.req.who}</b> ficou um pouco decepcionado(a).`);clearReq();}}
  if(!sb&&S.obj<OBJ.length&&OBJ[S.obj].f()){const o=OBJ[S.obj];S.m+=o.r;toast(o.r?`Objetivo concluído! +${o.r} moedas`:'Objetivo concluído!');sfx('coin');log(`Objetivo concluído: ${o.t}.`);S.obj++;if(S.obj>=OBJ.length&&!S.won){S.won=true;$('#win').classList.remove('hide');}showObj();}
  syncLife();updateIcons();objBar();if(sel)info();hud();}

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
function clearWorld(){graphDirty=true;while(junctionG.children.length)junctionG.remove(junctionG.children[0]);for(const b of buildings.slice())scene.remove(b.obj);buildings=[];for(const r of roads)scene.remove(r.obj);roads=[];clearLife();
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
  if(cont&&load(obj)){}else{clearWorld();S=freshState(mode);if(mode==='sandbox'){S.m=S.w=S.f=1e9;}cam.tx=8;cam.tz=30;cam.tdist=74;cam.tpitch=.8;
    log(mode==='sandbox'?'Modo sandbox: construa livremente.':'Bem-vindo(a) a Vice City! Comece traçando uma rua.');if(mode==='campaign')S.tut=0;}
  dirty=true;tick();if(cont)savedRev=rev;showObj();setTool('select');openCat=null;setCatUI();
  save();}
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
/* com o celular em pé o jogo inteiro é girado 90°: converte o toque da tela para as coordenadas do jogo */
let ROT=false;const AX=e=>ROT?e.clientY:e.clientX,AY=e=>ROT?innerWidth-e.clientX:e.clientY;
const appW=()=>ROT?innerHeight:innerWidth,appH=()=>ROT?innerWidth:innerHeight;
const appRect=()=>({left:0,top:0,width:canvas.clientWidth||appW(),height:canvas.clientHeight||appH()});
function toApp(r){return ROT?{left:r.top,top:innerWidth-r.right,width:r.height,height:r.width}:{left:r.left,top:r.top,width:r.width,height:r.height};}
let down=null,keys={},lastClick=0,touchMode=matchMedia('(pointer:coarse)').matches;const ptrs=new Map();let pinch=null,drawing=false;
canvas.addEventListener('contextmenu',e=>e.preventDefault());
function setMouse(e){const rc=appRect();mouse.x=(AX(e)-rc.left)/rc.width*2-1;mouse.y=-((AY(e)-rc.top)/rc.height)*2+1;mx=AX(e);my=AY(e);}
function pinchInfo(){const [a,b]=[...ptrs.values()];return{d:Math.hypot(a.x-b.x,a.y-b.y),ang:Math.atan2(b.y-a.y,b.x-a.x),cx:(a.x+b.x)/2,cy:(a.y+b.y)/2};}
const angDiff=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
function camPan(dx,dy){const {f,r}=camVecs(),k=cam.dist*.0017;panBy(-dx*r.x*k+dy*f.x*k,-dx*r.z*k+dy*f.z*k);}
/* câmera ancorada: o ponto da cidade sob o dedo (ou cursor) continua sob o dedo ao dar zoom, girar ou arrastar */
const tcam=new THREE.PerspectiveCamera(),tray=new THREE.Raycaster();
const tgt=()=>({x:cam.tx,z:cam.tz,yaw:cam.tyaw,pitch:cam.tpitch,dist:cam.tdist});
function groundAt(sx,sy,p){const rc=appRect();Object.assign(tcam,{fov:camera.fov,aspect:camera.aspect,near:camera.near,far:camera.far});tcam.updateProjectionMatrix();
  const cp=Math.cos(p.pitch);tcam.position.set(p.x+Math.sin(p.yaw)*cp*p.dist,Math.sin(p.pitch)*p.dist,p.z+Math.cos(p.yaw)*cp*p.dist);tcam.lookAt(p.x,0,p.z);tcam.updateMatrixWorld();
  tray.setFromCamera(new THREE.Vector2((sx-rc.left)/rc.width*2-1,-((sy-rc.top)/rc.height)*2+1),tcam);const o=new THREE.Vector3();
  if(!tray.ray.intersectPlane(plane,o))return null;return Math.hypot(o.x-p.x,o.z-p.z)>220?null:o;}
function snapCam(){cam.x=cam.tx;cam.z=cam.tz;cam.yaw=cam.tyaw;cam.pitch=cam.tpitch;cam.dist=cam.tdist;}
function anchored(ox,oy,nx,ny,change){const P=groundAt(ox,oy,tgt());change();const Q=groundAt(nx,ny,tgt());
  if(P&&Q){cam.tx=clamp(cam.tx+P.x-Q.x,-MAPB,MAPB);cam.tz=clamp(cam.tz+P.z-Q.z,-MAPB,MAPB);}snapCam();}
canvas.addEventListener('pointerdown',e=>{canvas.focus();touchMode=e.pointerType==='touch';ptrs.set(e.pointerId,{x:AX(e),y:AY(e)});try{canvas.setPointerCapture(e.pointerId);}catch(_){}
  if(ptrs.size===2){const p=pinchInfo();pinch={...p,d0:p.d,a0:p.ang,x0:p.cx,y0:p.cy,mode:null};if(drawing)cancelDraw();if(down)down.moved=true;return;}if(ptrs.size>2)return;
  setMouse(e);down={b:e.button,x:AX(e),y:AY(e),moved:false,touch:touchMode};
  if(tool==='road'&&e.button===0&&!inMenu&&!photo){const gp=groundPt();if(gp){down.road=true;down.startPt=snapPt(gp);down.before=roadPts.length;}}});
canvas.addEventListener('pointermove',e=>{const pp=ptrs.get(e.pointerId);if(pp){pp.x=AX(e);pp.y=AY(e);}
  if(ptrs.size===2&&pinch){const n=pinchInfo();
    // gesto inteligente: decide uma única ação (zoom, girar ou mover) e mantém até soltar os dedos
    if(!pinch.mode){const sc=Math.abs(Math.log(n.d/pinch.d0)),an=Math.abs(angDiff(n.ang,pinch.a0)),mv=Math.hypot(n.cx-pinch.x0,n.cy-pinch.y0);
      if(an>.32&&sc<.06)pinch.mode='rot';else if(sc>.05||mv>14)pinch.mode='zoom';}
    if(pinch.mode==='zoom'){const f=Math.max(24,pinch.d)/Math.max(24,n.d);anchored(pinch.cx,pinch.cy,n.cx,n.cy,()=>{cam.tdist=clamp(cam.tdist*f,14,230);});}
    else if(pinch.mode==='rot'){const da=angDiff(n.ang,pinch.ang);anchored(pinch.cx,pinch.cy,n.cx,n.cy,()=>{cam.tyaw-=da;});}
    Object.assign(pinch,{d:n.d,ang:n.ang,cx:n.cx,cy:n.cy});return;}
  const dx=AX(e)-mx,dy=AY(e)-my;setMouse(e);
  if(!down)return;if(Math.hypot(AX(e)-down.x,AY(e)-down.y)>(down.touch?10:5))down.moved=true;if(!down.moved)return;
  if(down.road&&tool==='road'){drawRoadMove();return;}
  if(down.b===2||inMenu){cam.tyaw-=dx*.006;cam.tpitch=clamp(cam.tpitch+dy*.004,.35,1.45);}
  else if(down.b===1||(down.b===0&&(tool==='select'||tool==='demolish')))anchored(AX(e)-dx,AY(e)-dy,AX(e),AY(e),()=>{});});
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
canvas.addEventListener('wheel',e=>{e.preventDefault();const dy=e.deltaMode===1?e.deltaY*16:e.deltaY,f=Math.exp(clamp(dy,-120,120)*.0018);anchored(AX(e),AY(e),AX(e),AY(e),()=>{cam.tdist=clamp(cam.tdist*f,14,230);});},{passive:false});
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
  ctxBar();if(touchMode&&html)html=html.replace(/<br><small>.*<\/small>/,'');tip.classList.toggle('hide',!html);if(html){tip.innerHTML=html;tip.style.left=Math.min(appW()-270,mx+18)+'px';tip.style.top=Math.min(appH()-120,my+18)+'px';}}

/* ---------- thumbnails ---------- */
{const tr=new THREE.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true});tr.setSize(168,168);const ts=new THREE.Scene();ts.add(new THREE.HemisphereLight('#ffffff','#8a7a60',.75));
  const tl=new THREE.DirectionalLight('#fff4e0',.75);tl.position.set(6,10,8);ts.add(tl);const tc=new THREE.PerspectiveCamera(28,1,.1,300);
  for(const t of Object.keys(B)){const m=makeModel(t,11,null);ts.add(m);const bx=new THREE.Box3().setFromObject(m),c=bx.getCenter(new THREE.Vector3()),sz=bx.getSize(new THREE.Vector3()).length();
    tc.position.set(c.x+sz*1.05,c.y+sz*.85,c.z+sz*1.45);tc.lookAt(c);tr.render(ts,tc);thumbs[t]=tr.domElement.toDataURL();ts.remove(m);}
  tr.dispose();}

/* ---------- loop ---------- */
S=freshState('campaign');demoVillage();recompute();S.pop=houses().reduce((a,h)=>a+h.res,0);syncLife();
$('#mCont').classList.toggle('hide',!hasSave());
let last=performance.now(),acc=0,T=0,saveT=0,cloudT=0;
function frame(now){const rdt=clamp((now-last)/1000,0,.1);last=Math.max(last,now);T+=rdt;
  if(inMenu){cam.tyaw+=rdt*.05;cam.tx=0;cam.tz=24;cam.tdist=78;cam.tpitch=.6;S.tod=(S.tod+rdt/200)%1;}
  else if(!photo){const sp=S.speed;const {f,r}=camVecs(),k=cam.tdist*.9*rdt;
    if(keys.KeyW||keys.ArrowUp)panBy(f.x*k,f.z*k);if(keys.KeyS||keys.ArrowDown)panBy(-f.x*k,-f.z*k);if(keys.KeyA||keys.ArrowLeft)panBy(-r.x*k,-r.z*k);if(keys.KeyD||keys.ArrowRight)panBy(r.x*k,r.z*k);
    S.tod+=rdt*sp/420;if(S.tod>=1){S.tod-=1;S.day++;}
    acc+=rdt*sp;while(acc>=1){acc-=1;S.time+=1;tick();}saveT+=rdt;if(saveT>5){saveT=0;save();}}
  updateCam(rdt);updateSeason(rdt,inMenu?0:photo?0:S.speed);applyLight(S.tod);const wsp=inMenu?1:photo?0:Math.min(S.speed,2);stepLife(rdt*wsp,T);
  for(const b of buildings)if(b.obj.userData.spin)b.obj.userData.spin.rotation.z+=rdt*(b.obj.userData.spinRate||.6)*(inMenu?1:Math.max(.15,Math.min(S.speed,2)));
  if(reqMark&&S.req){const h=buildings.find(x=>x.id===S.req.id);if(h){reqMark.position.set(h.x,(h.obj.userData.h||6)+2.2+Math.sin(T*3)*.4,h.z);reqMark.rotation.y=T*2;}}
  updateFX(rdt,inMenu?1:photo?0:S.speed);previewFrame();renderer.render(scene,camera);requestAnimationFrame(frame);}
requestAnimationFrame(frame);
addEventListener('beforeunload',save);

/* ---------- context bar (touch-friendly actions) ---------- */
const ctx=document.createElement('div');ctx.id='ctx';ctx.className='panel hide';$('#app').appendChild(ctx);
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
  for(let i=0;i<16;i++){const v=new Vox(),R=rng(i*97+3);const n=4+Math.floor(R()*4);for(let k=0;k<n;k++)v.ball(k*2.4-n*1.2+R()*1.2,R()*1.2,R()*2.6-1.3,2+R()*1.6,'#ffffff',.62,1,.1);
    const m=new THREE.Mesh(toGeo(v.b,v.t),cm.clone());m.castShadow=true;m.position.set(rand(-220,220),rand(56,70),rand(-200,140));m.userData.v=rand(1.2,2.4);scene.add(m);clouds.push(m);}}
const boats=[];
function sailboat(col){const v=new Vox(),c=v.col(col),w=.75,L=2.2;const P=[[0,.05,L+.6],[w,.05,L*.4],[w,.05,-L],[-w,.05,-L],[-w,.05,L*.4]],Q=P.map(p=>[p[0]*.55,-.55,p[2]*.85]);
  for(let i=0;i<5;i++){const j=(i+1)%5;v.quad(Q[i],Q[j],P[j],P[i],c);}v.tri(P[0],P[1],P[4],v.col('#e8e2d6'));v.quad(P[1],P[2],P[3],P[4],v.col('#e8e2d6'));
  v.box(0,.05,-.4,.9,.45,1.3,'#ffffff');v.box(0,.32,-.4,.95,.12,1.35,'#2f3a46');v.cyl(0,.05,.5,.06,4.2,'#d9d9d9',5);
  v.tri([.02,.5,.5],[.02,4.1,.5],[.02,.6,-1.7],v.col('#fbf8f0'));v.tri([.02,.6,.65],[.02,3.6,.6],[.02,.55,2.2],v.col('#f2ede2'));return toGeo(v.b,v.t);}
function cargoShip(){const v=new Vox(),L=5.4,w=1.25;const top=[[0,.6,L+1.6],[w,.6,L],[w,.6,-L],[-w,.6,-L],[-w,.6,L]],bot=top.map(p=>[p[0]*.8,-.9,p[2]*.95]),mid=top.map(p=>[p[0]*.97,-.35,p[2]*.98]);
  const hull=v.col('#23364a'),red=v.col('#b8332a');for(let i=0;i<5;i++){const j=(i+1)%5;v.quad(mid[i],mid[j],top[j],top[i],hull);v.quad(bot[i],bot[j],mid[j],mid[i],red);}v.tri(top[0],top[1],top[4],v.col('#56636f'));v.quad(top[1],top[2],top[3],top[4],v.col('#56636f'));
  const CC=['#c9453b','#3d74a8','#e0a030','#2f7a5a','#e8e8e8','#7a3fa0'];for(let i=0;i<6;i++)for(let j=0;j<2;j++)for(let k=0;k<(i+j)%3+1;k++)v.box(-.55+j*1.1,.6+k*.55,L-1.6-i*1.25,1,.52,1.15,CC[(i*3+j+k)%6]);
  v.box(0,.6,-L+1,2.2,2.4,1.6,'#f2f2f2');v.box(0,2.6,-L+1.2,2.5,.15,1.2,'#e0e0e0');v.box(0,2.1,-L+1.81,2,.4,.02,'#22303c',1);v.cyl(0,3,-L+.5,.32,1.2,'#b8332a',10);return toGeo(v.b,v.t);}
const wakeM=new THREE.MeshBasicMaterial({color:'#ffffff',transparent:true,opacity:.35,depthWrite:false});const wakeG=new THREE.PlaneGeometry(1,1);wakeG.rotateX(-Math.PI/2);
for(let i=0;i<7;i++){const cargo=i>=5,m=new THREE.Mesh(cargo?cargoShip():sailboat(pick(['#3d74a8','#8e3b3b','#2f7a78','#e8b86b','#ffffff'])),matBody);m.castShadow=true;
  const wk=new THREE.Mesh(wakeG,wakeM);wk.scale.set(cargo?2.4:1.2,1,cargo?7:3.5);wk.position.set(0,.12,cargo?-9:-4.2);m.add(wk);scene.add(m);
  boats.push({m,a:i/7*6.28+rand(0,.6),sp:(cargo?rand(.006,.009):rand(.012,.022))*(i%2?1:-1),off:cargo?rand(186,200):rand(100,108)});}
const gulls=[];
{const v=new Vox();v.box(0,0,0,.25,.2,.7,'#f7f5ef');v.box(-.55,.05,0,.9,.06,.35,'#e8e6df');v.box(.55,.05,0,.9,.06,.35,'#e8e6df');const g=toGeo(v.b);
  for(let i=0;i<7;i++){const m=new THREE.Mesh(g,matBody);scene.add(m);gulls.push({m,a:rand(0,6.28),r:rand(25,70),h:rand(14,24),sp:rand(.08,.16),ph:rand(0,9)});}}
{ // grass tufts and wildflowers, cleared with the wild trees
  const tuft=new Vox();tuft.box(0,0,0,.14,.38,.14,'#ffffff');tuft.box(.16,0,.06,.12,.28,.12,'#ffffff');
  const flower=new Vox();flower.box(0,0,0,.08,.3,.08,'#5f8c46');flower.box(0,.3,0,.2,.16,.2,'#ffffff');
  const mk=(vox,k,count,colors,test)=>{const pts=[];for(let i=0;i<count*4&&pts.length<count;i++){const x=rand(-MAPB,MAPB),z=rand(-MAPB,90);if(landDist(x,z)>3&&hillAt(x,z)<.2&&test(x,z))pts.push([x,z]);}
    const g=toGeo(vox.b);const im=new THREE.InstancedMesh(g,seasonize(new THREE.MeshLambertMaterial({vertexColors:true}),k==='flower'?'flower':''),pts.length);const m=new THREE.Matrix4();
    pts.forEach(([x,z],i)=>{const s=.8+Math.random()*.7;m.compose(new THREE.Vector3(x,0,z),new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),Math.random()*6),new THREE.Vector3(s,s,s));im.setMatrixAt(i,m);im.setColorAt(i,new THREE.Color(pick(colors)));wild.push({x,z,k,i,alive:true,s:1});});
    im.receiveShadow=true;wildMesh[k]=im;scene.add(im);};
  mk(tuft,'tuft',LOW?1400:3000,['#5f8f3f','#6e9e48','#7fae54','#9db85c'],()=>true);
  mk(flower,'flower',LOW?400:800,FLOW,(x,z)=>vnoise(x*.09+40,z*.09)>.55);}
const dustGeo=new THREE.BoxGeometry(.35,.35,.35),dustMat=new THREE.MeshBasicMaterial({color:'#efe4c8',transparent:true,depthWrite:false});const dusts=[];
function dust(x,z,r,n=10){for(let i=0;i<n;i++){const m=new THREE.Mesh(dustGeo,dustMat.clone());const a=Math.random()*6.28;m.position.set(x+Math.cos(a)*r*.7,.3,z+Math.sin(a)*r*.7);scene.add(m);dusts.push({m,vx:Math.cos(a)*rand(1,2.5),vz:Math.sin(a)*rand(1,2.5),vy:rand(1,2.4),t:0});}}
const pops=[];
function popIn(b){const big=B[b.t].cat!=='dec'&&b.r>1.3;b.obj.scale.set(big?1:.9,.02,big?1:.9);const p={b,t:0,big};
  if(big){const h=Math.max(3,b.obj.userData.h||4),s=b.r*.82,v=new Vox();for(const [x,z] of [[-s,-s],[s,-s],[s,s],[-s,s]])v.box(x,0,z,.12,h+.6,.12,'#9aa0a6');
    for(let y=1.4;y<h+.6;y+=1.6){v.box(0,y,s,2*s,.08,.35,'#b5874a');v.box(0,y,-s,2*s,.08,.35,'#b5874a');v.box(s,y,0,.35,.08,2*s,'#b5874a');v.box(-s,y,0,.35,.08,2*s,'#b5874a');}
    const sc=new THREE.Mesh(toGeo(v.b,v.t),matBody);sc.position.set(b.x,0,b.z);sc.rotation.y=b.a;scene.add(sc);
    const cr=new THREE.Group(),mv=new Vox();mv.box(0,0,0,.4,h+3.4,.4,'#e0b22e');const mast=new THREE.Mesh(toGeo(mv.b),matBody),jv=new Vox();jv.box(-s*1.2,0,0,s*3.2,.3,.3,'#e0b22e');jv.box(s*.9,-.3,0,.9,.6,.6,'#6e7a85');jv.box(-s*2.4,-1.2,0,.06,1.2,.06,'#333');
    const jib=new THREE.Mesh(toGeo(jv.b),matBody);jib.position.y=h+3.3;cr.add(mast,jib);const q=loc(b,s+.9,s+.9);cr.position.set(q.x,0,q.z);mast.castShadow=jib.castShadow=true;scene.add(cr);Object.assign(p,{sc,cr,jib});}
  pops.push(p);dust(b.x,b.z,b.r,B[b.t].cat==='dec'?4:12);}
const easeBack=t=>1+2.2*Math.pow(t-1,3)+1.2*Math.pow(t-1,2);
const smokes=[];let smokeT=0;const smokeMat=new THREE.SpriteMaterial({map:(()=>{const c=document.createElement('canvas');c.width=c.height=64;const g=c.getContext('2d');const r=g.createRadialGradient(32,32,0,32,32,32);r.addColorStop(0,'rgba(220,220,220,.9)');r.addColorStop(1,'rgba(200,200,200,0)');g.fillStyle=r;g.fillRect(0,0,64,64);return new THREE.CanvasTexture(c);})(),transparent:true,depthWrite:false,opacity:.5});
const crowdG=(()=>{const v=new Vox();v.box(0,0,0,.34,.42,.3,'#ffffff');v.ball(0,.55,0,.13,'#e0ac86',1,0,0);return toGeo(v.b,v.t);})();
/* chuva (riscos caindo em volta da câmera) e folhas / pétalas voando no outono e na primavera */
const RAIN_N=LOW?700:1700,rainPos=new Float32Array(RAIN_N*6),rainSeed=[];
for(let i=0;i<RAIN_N;i++)rainSeed.push({x:rand(-70,70),y:rand(0,60),z:rand(-70,70),v:rand(38,52)});
const rainGeo=new THREE.BufferGeometry();rainGeo.setAttribute('position',new THREE.BufferAttribute(rainPos,3));
const rainMat=new THREE.LineBasicMaterial({color:'#d9e7f2',transparent:true,opacity:0,depthWrite:false});
const rainMesh=new THREE.LineSegments(rainGeo,rainMat);rainMesh.frustumCulled=false;rainMesh.visible=false;scene.add(rainMesh);
const LEAF_N=LOW?90:220,leafG=new THREE.PlaneGeometry(.42,.28);
const leafMesh=new THREE.InstancedMesh(leafG,new THREE.MeshLambertMaterial({side:THREE.DoubleSide}),LEAF_N);leafMesh.frustumCulled=false;scene.add(leafMesh);
const leaves=[],AUT_C=['#d9772b','#c4452c','#e3b23c','#a8642a','#e08a2e'],SPR_C=['#f2a7c8','#ffffff','#f7d24a','#e889b5','#fbe3ee'];
for(let i=0;i<LEAF_N;i++){leaves.push({x:0,y:-9,z:0,vy:0,ph:rand(0,9),sp:rand(.6,1.4),on:false});leafMesh.setColorAt(i,new THREE.Color('#fff'));}
const _lm=new THREE.Matrix4(),_lq=new THREE.Quaternion(),_le=new THREE.Euler(),_lv=new THREE.Vector3(),_ls=new THREE.Vector3();
function updateWeatherFX(dt,sp){const cx=cam.x,cz=cam.z,rn=W.rain;
  rainMesh.visible=rn>.01;if(rainMesh.visible){rainMat.opacity=.55*rn;const n=Math.floor(RAIN_N*Math.min(1,rn*1.2)),wind=W.storm?.28:.12;
    for(let i=0;i<RAIN_N;i++){const r=rainSeed[i],o=i*6;if(i>=n){rainPos[o+1]=rainPos[o+4]=-99;continue;}r.y-=r.v*dt;if(r.y<0){r.y=rand(45,60);r.x=rand(-70,70);r.z=rand(-70,70);}
      const x=cx+r.x+r.y*wind,z=cz+r.z;rainPos[o]=x;rainPos[o+1]=r.y;rainPos[o+2]=z;rainPos[o+3]=x-wind*1.6;rainPos[o+4]=r.y+1.6;rainPos[o+5]=z;}
    rainGeo.attributes.position.needsUpdate=true;}
  const want=inMenu?0:Math.round(LEAF_N*clamp(Math.max(W.w[1],W.w[3]*.85)*(1-rn*.7),0,1)),pal=W.w[1]>=W.w[3]?AUT_C:SPR_C;let any=false;
  for(let i=0;i<LEAF_N;i++){const l=leaves[i];
    if(!l.on){if(i<want&&Math.random()<dt*1.5){const a=Math.random()*6.28,r=Math.sqrt(Math.random())*Math.min(60,cam.dist*.7);l.x=cx+Math.cos(a)*r;l.z=cz+Math.sin(a)*r;l.y=rand(4,13);l.on=true;leafMesh.setColorAt(i,new THREE.Color(pick(pal)));any=true;}
      else{_lm.makeScale(0,0,0);leafMesh.setMatrixAt(i,_lm);continue;}}
    l.ph+=dt*l.sp*2.4;l.y-=dt*(.9+Math.sin(l.ph*1.3)*.35)*(sp?1:.4);l.x+=dt*(1.4+Math.sin(l.ph)*1.2);l.z+=dt*Math.cos(l.ph*.8)*.9;
    if(l.y<.05){l.y=.05;l.sp*=.96;if(Math.random()<dt*.4||i>=want)l.on=false;}
    _le.set(Math.sin(l.ph)*1.2,l.ph*.7,Math.cos(l.ph*1.1));_lq.setFromEuler(_le);_lv.set(l.x,l.y,l.z);_ls.set(1,1,1);_lm.compose(_lv,_lq,_ls);leafMesh.setMatrixAt(i,_lm);}
  leafMesh.instanceMatrix.needsUpdate=true;if(any&&leafMesh.instanceColor)leafMesh.instanceColor.needsUpdate=true;
  for(const c of clouds){const k=1-rn*.55;c.material.color.setRGB(k,k,k*1.02);}}
function updateFX(dt,sp){waterU.value+=dt;updateWeatherFX(dt,sp);
  for(const c of clouds){c.position.x+=c.userData.v*dt*(sp?1:.3);if(c.position.x>230)c.position.x=-230;const dc=c.position.distanceTo(camera.position);c.material.opacity=.92*clamp((dc-14)/26,0,1);c.visible=c.material.opacity>.02;}
  for(const b of boats){b.u=(b.u===undefined?(b.a/6.28-.5)*340:b.u)+b.sp*dt*(sp?1:.3)*300;if(b.u>190)b.u=-190;if(b.u<-190)b.u=190;const z=b.off,z2=b.off;b.m.position.set(b.u,Math.sin(T*1.3+b.u)*.12,z);b.m.rotation.y=Math.atan2(2*Math.sign(b.sp),z2-z);b.m.rotation.z=Math.sin(T*.9+b.a)*.05;}
  for(const g of gulls){g.a+=g.sp*dt;g.m.position.set(Math.cos(g.a)*g.r,g.h+Math.sin(T+g.ph)*1.2,Math.sin(g.a)*g.r);g.m.rotation.y=-g.a;g.m.scale.y=1+Math.sin(T*7+g.ph)*.6;}
  for(let i=pops.length-1;i>=0;i--){const p=pops[i];
    if(p.big){p.t+=dt/2.6;const k=Math.min(1,p.t),e=1-Math.pow(1-k,3);p.b.obj.scale.set(1,Math.max(.02,e),1);p.jib.rotation.y=Math.sin(T*1.2)*1.2;if(Math.random()<dt*6)dust(p.b.x,p.b.z,p.b.r,1);
      if(k>=1){p.b.obj.scale.set(1,1,1);scene.remove(p.sc,p.cr);dust(p.b.x,p.b.z,p.b.r,14);sfx('coin');pops.splice(i,1);}continue;}
    p.t+=dt/.5;const k=Math.min(1,p.t),e=easeBack(k);p.b.obj.scale.set(.9+.1*k,Math.max(.02,e),.9+.1*k);if(k>=1){p.b.obj.scale.set(1,1,1);pops.splice(i,1);}}
  /* fumaça da termelétrica */
  smokeT-=dt;if(smokeT<=0){smokeT=.18;for(const b of buildings){if(b.t!=='termica'||!b.conn||!b.obj.userData.smoke)continue;for(const q0 of b.obj.userData.smoke){if(smokes.length>70)break;const q=loc(b,q0[0],q0[2]),sp=new THREE.Sprite(smokeMat.clone());sp.position.set(q.x,q0[1],q.z);sp.scale.setScalar(1.2);scene.add(sp);smokes.push({sp,t:0,vx:rand(.3,.8),vz:rand(-.3,.3)});}}}
  for(let i=smokes.length-1;i>=0;i--){const m=smokes[i];m.t+=dt;m.sp.position.y+=dt*1.6;m.sp.position.x+=m.vx*dt;m.sp.position.z+=m.vz*dt;m.sp.scale.setScalar(1.2+m.t*1.8);m.sp.material.opacity=Math.max(0,.55-m.t*.12)*(1-nightK*.5);if(m.t>4.5){scene.remove(m.sp);m.sp.material.dispose();smokes.splice(i,1);}}
  /* torcida no estádio em dia de jogo (18h–23h) */
  const hr=S?S.tod*24:12,match=hr>=18&&hr<23;for(const b of buildings){if(b.t!=='estadio')continue;const cw=b.obj.userData.crowd;if(!cw)continue;
    if(match&&b.conn&&!b.crowdM){const N=LOW?90:170,im=new THREE.InstancedMesh(crowdG,matBody,N),m4=new THREE.Matrix4(),pos=[];for(let i=0;i<N;i++){const a=Math.random()*6.283,row=Math.floor(Math.random()*4),ra=cw.a-.6+row*.9,rb=cw.b-.6+row*.9;pos.push([Math.cos(a)*ra,row*1.1+1.1,Math.sin(a)*rb,Math.random()*9]);im.setColorAt(i,new THREE.Color(pick(SHIRT)));}
      im.userData.pos=pos;b.obj.add(im);b.crowdM=im;}
    if(b.crowdM&&!match){b.obj.remove(b.crowdM);b.crowdM=null;}
    if(b.crowdM){const m4=new THREE.Matrix4(),P=b.crowdM.userData.pos;for(let i=0;i<P.length;i++){const q=P[i];m4.makeTranslation(q[0],q[1]+Math.max(0,Math.sin(T*5+q[3]))*.25,q[2]);b.crowdM.setMatrixAt(i,m4);}b.crowdM.instanceMatrix.needsUpdate=true;}}
  matNeon.opacity=.3+nightK*.7*(.65+.35*Math.sin(T*5));
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
  else if(kind==='thunder'){o.disconnect();g.disconnect();const n=a.createBufferSource(),bf=a.createBuffer(1,a.sampleRate*2.2,a.sampleRate),d=bf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/d.length,2);n.buffer=bf;const lp=a.createBiquadFilter();lp.type='lowpass';lp.frequency.value=260;const gg=a.createGain();gg.gain.value=.5;n.connect(lp);lp.connect(gg);gg.connect(a.destination);n.start(t);return;}
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
  const D=document.documentElement,port=innerHeight>innerWidth,authOn=!$('#auth').classList.contains('hide');
  // celular em pé: gira o jogo inteiro para a horizontal (o login continua em pé por causa do teclado)
  const was=ROT;ROT=isTouch&&port&&!authOn;D.classList.toggle('rot',ROT);
  if(ROT&&!was){D.classList.add('rotin');setTimeout(()=>D.classList.remove('rotin'),500);}
  const scr=port?Math.max(screen.height,screen.width):Math.min(screen.height,screen.width),full=isTouch&&(st||ROT&&!navigator.userAgent.includes('CriOS')&&scr-innerHeight<70)?scr:0;
  const ph=Math.max(innerHeight,full||0),pw=innerWidth,big=!ROT&&ph>innerHeight;
  const aw=ROT?ph:pw,ah=ROT?pw:ph;
  D.style.setProperty('--appH',ROT||big?ah+'px':'100%');D.style.setProperty('--gap',big?(ph-innerHeight)+'px':'0px');
  D.style.setProperty('--ph',ph+'px');D.style.setProperty('--aw',aw+'px');D.style.setProperty('--ah',ah+'px');D.style.setProperty('--vw',aw/100+'px');D.style.setProperty('--vh',ah/100+'px');
  // as regras de layout seguem o tamanho do jogo (não o da tela física)
  const C={w1320:aw<=1320,w900:aw<=900,w700:aw<=700,w600:aw<=600,w430:aw<=430,w380:aw<=380,s700:aw<=700&&ah<=700,x1200:aw>=1200,lc:ah<=520&&aw>ah};
  for(const k in C)D.classList.toggle(k,C[k]);
  resize();}
addEventListener('resize',fitApp);addEventListener('orientationchange',()=>setTimeout(fitApp,250));fitApp();
new MutationObserver(fitApp).observe($('#auth'),{attributes:true,attributeFilter:['class']});
function lockLandscape(){if(!isTouch)return;try{const o=screen.orientation;if(o&&o.lock)o.lock('landscape').catch(()=>{});}catch(e){}}
['pointerdown'].forEach(ev=>document.addEventListener(ev,e=>{const t=e.target.closest('.btn,.tbtn,.cat,.item,.mrow,.mhero,.speed button,.a-pill,.a-opt,.rnode');if(!t)return;
  const r=toApp(t.getBoundingClientRect()),d=Math.max(r.width,r.height)*2.2,s=document.createElement('span');s.className='rip';s.style.cssText=`width:${d}px;height:${d}px;left:${AX(e)-r.left-d/2}px;top:${AY(e)-r.top-d/2}px`;
  t.appendChild(s);setTimeout(()=>s.remove(),650);try{if(isTouch&&navigator.vibrate)navigator.vibrate(6);}catch(_){}} ,{passive:true}));

/* ---------- tutorial: a urbanista Lia mostra o caminho ---------- */
const TUT=[
  {t:'Oi! Eu sou a Lia, urbanista de Vice City. Vou te mostrar como erguer sua cidade, passo a passo.',btn:'Vamos lá'},
  {t:'Toque em Ruas para começar.',el:'[data-c=rua]',ok:()=>tool==='road'},
  {t:'Arraste o dedo no chão para desenhar uma rua. Quando soltar, ela fica pronta. Se encostar em outra rua, elas se conectam sozinhas.',ok:()=>roads.length>0},
  {t:'Agora abra Moradia e escolha a Casinha.',el:'[data-c=mor]',ok:()=>placeT==='casa'||count('casa')>0},
  {t:'Toque perto da rua para construir. A casa se vira para a calçada sozinha.',el:'.item[data-t=casa]',ok:()=>count('casa')>0},
  {t:"Toda casa precisa de água. Em Energia e água, construa uma Caixa d'água perto da rua.",el:'[data-c=util]',ok:()=>count('caixa')>0},
  {t:'E de comida! Em Trabalho, construa uma Fazenda. Logo aparecem trabalhadores cuidando da plantação.',el:'[data-c=trab]',ok:()=>count('fazenda')>0},
  {t:'Perfeito! Agora as famílias chegam, os carros circulam e a cidade ganha vida, de dia e de noite. Siga as missões no canto da tela. Boa construção!',btn:'Começar'}];
let tutStep=-1;
function tutTick(){const g=$('#guide'),hl=$('#hl');if(!S||inMenu||photo||sand()||S.tut>=TUT.length){g.classList.add('hide');hl.classList.add('hide');return;}
  const st=TUT[S.tut];if(tutStep!==S.tut){tutStep=S.tut;g.classList.remove('hide');g.classList.remove('pop');void g.offsetWidth;g.classList.add('pop');$('#gText').textContent=st.t;
    $('#gNext').classList.toggle('hide',!st.btn);$('#gNext').textContent=st.btn||'';$('#gStep').textContent=`${S.tut+1}/${TUT.length}`;}
  if(st.ok&&st.ok()){S.tut++;sfx('pop');return;}
  const el=st.el&&[...document.querySelectorAll(st.el)].find(e=>e.offsetParent);if(el){const r=toApp(el.getBoundingClientRect());Object.assign(hl.style,{left:r.left-6+'px',top:r.top-6+'px',width:r.width+12+'px',height:r.height+12+'px'});hl.classList.remove('hide');}else hl.classList.add('hide');}
$('#gNext').onclick=()=>{S.tut++;};$('#gSkip').onclick=()=>{S.tut=99;save();};
setInterval(tutTick,250);

/* ---------- layout: panels sit below the real top-bar height ---------- */
const dockRO=new ResizeObserver(()=>{document.documentElement.style.setProperty('--dockH',$('#dock').offsetHeight+'px');});dockRO.observe($('#dock'));
const topRO=new ResizeObserver(()=>{document.documentElement.style.setProperty('--topH',$('#top').offsetHeight+'px');});topRO.observe($('#top'));

/* ---------- PWA ---------- */
let installEvt=null;
addEventListener('beforeinstallprompt',e=>{e.preventDefault();installEvt=e;$('#bInstall').classList.remove('hide');$('#mInstall').classList.remove('hide');});
async function doInstall(){if(!installEvt)return;installEvt.prompt();try{await installEvt.userChoice;}catch(e){}installEvt=null;$('#bInstall').classList.add('hide');$('#mInstall').classList.add('hide');}
$('#bInstall').onclick=doInstall;$('#mInstall').onclick=doInstall;
addEventListener('appinstalled',()=>toast('Vice City instalado!'));
if('serviceWorker' in navigator&&/^https?:$/.test(location.protocol)){
  // Atualização automática: busca SW novo ao abrir/voltar ao app e recarrega uma vez quando ele assume.
  const hadCtl=!!navigator.serviceWorker.controller;let reloading=false;
  navigator.serviceWorker.addEventListener('controllerchange',()=>{if(!hadCtl||reloading)return;reloading=true;try{save(true);}catch(e){}location.reload();});
  addEventListener('load',()=>navigator.serviceWorker.register('/sw.js',{updateViaCache:'none'}).then(reg=>{
    const up=()=>reg.update().catch(()=>{});
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)up();});
    setInterval(up,5*60*1000);
    if(reg.waiting)reg.waiting.postMessage('skip');
  }).catch(()=>{}));
}

boot();
}
