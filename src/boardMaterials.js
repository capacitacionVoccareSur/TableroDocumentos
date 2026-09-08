import * as THREE from 'three'

// Seeded grain keeps materials stable when switching countries or filtering.
function random(seed = 418) {
  return () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 4294967296 }
}
function canvas(width, height = width) {
  const el = document.createElement('canvas'); el.width = width; el.height = height
  return [el, el.getContext('2d')]
}
function texture(el, color = true, repeat = 1) {
  const map = new THREE.CanvasTexture(el)
  if (color) map.colorSpace = THREE.SRGBColorSpace
  map.wrapS = map.wrapT = THREE.RepeatWrapping
  map.repeat.set(repeat, repeat); map.anisotropy = 8
  return map
}
export function surface(kind) {
  if (kind === 'cork' || kind === 'wood') {
    const asset = kind === 'cork' ? 'Cork001' : 'Wood049'
    const loader = new THREE.TextureLoader()
    const load = (name, color = false) => {
      const map = loader.load(`/textures/${kind}/${asset}_1K-JPG_${name}.jpg`)
      map.wrapS = map.wrapT = THREE.RepeatWrapping; map.repeat.set(kind === 'cork' ? 2.5 : 1, kind === 'cork' ? 1.8 : .18); map.anisotropy = 8
      if (color) map.colorSpace = THREE.SRGBColorSpace
      return map
    }
    return new THREE.MeshStandardMaterial({map: load('Color', true), normalMap: load('NormalGL'), normalScale: new THREE.Vector2(.55, .55), roughnessMap: load('Roughness'), roughness: kind === 'cork' ? 1 : .7, color: kind === 'cork' ? '#b4b09b' : '#ad855b'})
  }
  const [el, ctx] = canvas(1024), rand = random()
  ctx.fillStyle = kind === 'cork' ? '#9f7045' : kind === 'wood' ? '#765037' : '#aba393'
  ctx.fillRect(0, 0, 1024, 1024)
  if (kind === 'cork') {
    for (let i = 0; i < 34000; i++) {
      const x = rand() * 1024, y = rand() * 1024, radius = 1 + rand() * 6
      const shade = 29 + rand() * 32
      ctx.fillStyle = `hsl(${29 + rand() * 9} 35% ${shade}%)`
      ctx.beginPath()
      for (let j = 0; j < 6; j++) {
        const a = j * Math.PI / 3, r = radius * (.5 + rand())
        ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r)
      }
      ctx.closePath(); ctx.fill()
      ctx.strokeStyle = 'rgba(45,25,12,.14)'; ctx.lineWidth = .7; ctx.stroke()
    }
  } else if (kind === 'wood') {
    for (let i = 0; i < 3200; i++) {
      const y = rand() * 1024
      ctx.strokeStyle = `rgba(${rand() > .5 ? '220,169,103' : '36,19,10'},${.03 + rand() * .18})`
      ctx.lineWidth = .3 + rand() * 2; ctx.beginPath(); ctx.moveTo(0, y)
      for (let x = 0; x <= 1024; x += 8) ctx.lineTo(x, y + Math.sin(x * .007 + y * .015) * 8 + Math.sin(x * .019) * 2)
      ctx.stroke()
    }
  }
  const pixels = ctx.getImageData(0, 0, 1024, 1024)
  for (let i = 0; i < pixels.data.length; i += 4) {
    const n = (rand() - .5) * (kind === 'wall' ? 16 : 24)
    for (let c = 0; c < 3; c++) pixels.data[i + c] += n
  }
  ctx.putImageData(pixels, 0, 0)
  return new THREE.MeshStandardMaterial({map: texture(el, true, kind === 'cork' ? 2 : 1), bumpMap: texture(el, false, kind === 'cork' ? 2 : 1), bumpScale: kind === 'cork' ? .065 : .018, roughness: kind === 'wood' ? .48 : .95})
}
function paperCanvas(w, h, color, resolution = 1) {
  const [el, ctx] = canvas(w * resolution, h * resolution), rand = random(83)
  ctx.scale(resolution, resolution)
  ctx.fillStyle = color; ctx.fillRect(0, 0, w, h)
  for (let i = 0; i < 45000; i++) {
    ctx.fillStyle = `rgba(80,61,35,${rand() * .045})`
    ctx.fillRect(rand() * w, rand() * h, 1 + rand() * 2, .5)
  }
  const edge = ctx.createLinearGradient(0, 0, w, h)
  edge.addColorStop(0, '#ffffff16'); edge.addColorStop(.85, '#8b703000'); edge.addColorStop(1, '#8b703018')
  ctx.fillStyle = edge; ctx.fillRect(0, 0, w, h)
  return [el, ctx]
}
function wrap(ctx, text, x, y, width, lineHeight, max = 3) {
  const words = text.split(/\s+/); let line = '', row = 0
  for (let i = 0; i < words.length; i++) {
    const next = line + words[i] + ' '
    if (ctx.measureText(next).width > width && line) {
      ctx.fillText(row === max - 1 ? line.trim() + '…' : line.trim(), x, y + row * lineHeight)
      if (++row >= max) return
      line = words[i] + ' '
    } else line = next
  }
  if (row < max) ctx.fillText(line.trim(), x, y + row * lineHeight, width)
}
export function paperTexture(item, index) {
  const [el, ctx] = paperCanvas(768, 1024, index % 3 === 1 ? '#e9e0c9' : '#f4f0e3', 2)
  ctx.fillStyle = '#272c23'; ctx.font = '26px monospace'
  ctx.fillText(item.demo ? 'MUESTRA / SIN VALIDEZ' : 'VOCCARE / NODO SUR', 58, 116)
  ctx.fillStyle = '#252b21'; ctx.font = '43px Georgia'; ctx.fillText(item.account, 58, 217, 650)
  ctx.fillStyle = '#10170f'; ctx.font = '75px Georgia'
  wrap(ctx, item.title, 56, 330, 648, 86, 4)
  ctx.fillStyle = '#8d856f'; ctx.fillRect(58, 630, 650, 3)
  ctx.fillStyle = '#444637'; ctx.font = '26px sans-serif'
  ctx.fillText('DOCUMENTACIÓN', 58, 688)
  // Quiet ruled area evokes the physical document without inventing its contents.
  for (let i = 0; i < 4; i++) { ctx.fillStyle = '#a69c84'; ctx.fillRect(58, 727 + i * 27, i === 3 ? 460 : 650, 3) }
  const done = item.status === 'done'
  ctx.strokeStyle = done ? '#26442c' : '#623918'; ctx.lineWidth = 4
  ctx.strokeRect(58, 894, 610, 66)
  ctx.fillStyle = ctx.strokeStyle; ctx.font = '33px monospace'
  ctx.fillText(done ? 'COMPLETADO' : item.status === 'review' ? 'EN REVISIÓN' : item.status === 'new' ? 'NUEVA CUENTA' : 'PENDIENTE DE FIRMA', 77, 937)
  ctx.fillStyle = '#33392a'; ctx.font = '54px Georgia'; ctx.fillText('↗', 676, 943)
  return texture(el)
}
export function labelTexture(title, subtitle, dark = false) {
  const [el, ctx] = paperCanvas(768, 260, dark ? '#35453a' : '#e5dcc3', 2)
  ctx.fillStyle = dark ? '#f5eedc' : '#18231a'; ctx.font = '72px "Segoe Print", cursive'; ctx.textAlign = 'center'
  ctx.fillText(title, 384, subtitle ? 133 : 171, 680)
  if(subtitle) {ctx.font = '25px monospace'; ctx.fillText(subtitle, 384, 217, 680)}
  return texture(el)
}

export function noteTexture(title, subtitle = '', tone = 'cream') {
  const dark = tone === 'green'
  const [el, ctx] = paperCanvas(768, 340, dark ? '#374737' : tone === 'yellow' ? '#d9c476' : '#eae2ce', 2)
  ctx.fillStyle = dark ? '#ece6cb' : '#23291d'; ctx.textAlign = 'center'
  if(title === '←' || title === '→') {
    ctx.strokeStyle = '#252d1e'; ctx.lineWidth = 17; ctx.lineCap = 'round'; ctx.lineJoin = 'round'
    const direction = title === '→' ? 1 : -1
    ctx.beginPath(); ctx.moveTo(384-direction*190,185); ctx.lineTo(384+direction*190,185)
    ctx.moveTo(384+direction*100,105); ctx.lineTo(384+direction*190,185); ctx.lineTo(384+direction*100,265); ctx.stroke()
    return texture(el)
  }
  ctx.font = '70px "Segoe Print", cursive'; ctx.fillText(title, 384, subtitle ? 159 : 220, 670)
  if(subtitle) {ctx.font = '30px Georgia'; ctx.fillText(subtitle,384,252,685)}
  return texture(el)
}

export function fiberTexture() {
  const [el, ctx] = canvas(512), rand = random(614)
  ctx.fillStyle = '#a5a5a5'; ctx.fillRect(0,0,512,512)
  for(let i=0;i<30000;i++) {
    const shade = 95 + rand()*100
    ctx.strokeStyle = 'rgba('+shade+','+shade+','+shade+',.3)'; ctx.lineWidth = .4
    const x=rand()*512,y=rand()*512; ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x+rand()*5,y+rand()*2); ctx.stroke()
  }
  return texture(el,false,2)
}

export function flagTexture(countryId) {
  const W = 192, H = 128
  const [el, ctx] = canvas(W, H)
  function star5(cx, cy, r1, r2) {
    ctx.beginPath()
    for(let i=0;i<5;i++){const a=i*4*Math.PI/5-Math.PI/2;ctx.lineTo(cx+Math.cos(a)*r1,cy+Math.sin(a)*r1);const b=a+2*Math.PI/5;ctx.lineTo(cx+Math.cos(b)*r2,cy+Math.sin(b)*r2)}
    ctx.closePath(); ctx.fill()
  }
  function sunRays(cx, cy, r, rays = 16) {
    for(let i=0;i<rays;i++){ctx.save();ctx.translate(cx,cy);ctx.rotate(i*Math.PI/(rays/2));ctx.fillRect(-2.2,-(i%2?r+12:r+8),4.4,i%2?11:7);ctx.restore()}
    ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.fill()
  }
  switch(countryId) {
    case 'argentina': {
      const lb='#74acdf'
      ctx.fillStyle=lb; ctx.fillRect(0,0,W,H/3)
      ctx.fillStyle='#fff'; ctx.fillRect(0,H/3,W,H/3)
      ctx.fillStyle=lb; ctx.fillRect(0,H*2/3,W,H/3)
      ctx.fillStyle='#f6b40e'; sunRays(W/2,H/2,17)
      ctx.fillStyle='#843511'; ctx.beginPath();ctx.arc(W/2-5,H/2-3,3,0,Math.PI*2);ctx.fill()
      ctx.beginPath();ctx.arc(W/2+5,H/2-3,3,0,Math.PI*2);ctx.fill()
      ctx.beginPath();ctx.arc(W/2,H/2+5,5,0,Math.PI);ctx.fill()
      break
    }
    case 'bolivia':
      ctx.fillStyle='#d52b1e'; ctx.fillRect(0,0,W,H/3)
      ctx.fillStyle='#f4e400'; ctx.fillRect(0,H/3,W,H/3)
      ctx.fillStyle='#007a3d'; ctx.fillRect(0,H*2/3,W,H/3)
      break
    case 'chile':
      ctx.fillStyle='#d52b1e'; ctx.fillRect(0,0,W,H)
      ctx.fillStyle='#fff'; ctx.fillRect(0,H/2,W,H/2)
      ctx.fillStyle='#0033a0'; ctx.fillRect(0,0,W/3,H/2)
      ctx.fillStyle='#fff'; star5(W/6,H/4,17,7)
      break
    case 'ecuador':
      ctx.fillStyle='#ffd100'; ctx.fillRect(0,0,W,H/2)
      ctx.fillStyle='#003087'; ctx.fillRect(0,H/2,W,H/4)
      ctx.fillStyle='#ce1126'; ctx.fillRect(0,H*3/4,W,H/4)
      break
    case 'paraguay':
      ctx.fillStyle='#d52b1e'; ctx.fillRect(0,0,W,H/3)
      ctx.fillStyle='#fff'; ctx.fillRect(0,H/3,W,H/3)
      ctx.fillStyle='#0038a8'; ctx.fillRect(0,H*2/3,W,H/3)
      ctx.fillStyle='#009b3a'; star5(W/2,H/2,13,6)
      break
    case 'peru':
      ctx.fillStyle='#d91023'; ctx.fillRect(0,0,W,H)
      ctx.fillStyle='#fff'; ctx.fillRect(W/3,0,W/3,H)
      break
    case 'uruguay': {
      ctx.fillStyle='#fff'; ctx.fillRect(0,0,W,H)
      const sh=H/9
      for(let i=0;i<9;i+=2){ctx.fillStyle='#74acdf';ctx.fillRect(0,(i+1)*sh,W,sh)}
      ctx.fillStyle='#fff'; ctx.fillRect(0,0,W*4/9,H*4/9)
      ctx.fillStyle='#f6b40e'; sunRays(W*2/9,H*2/9,13,16)
      break
    }
    default:
      ctx.fillStyle='#888'; ctx.fillRect(0,0,W,H)
  }
  // Light grain for printed-paper feel
  const rand = random(countryId.charCodeAt(0)*31), px = ctx.getImageData(0,0,W,H)
  for(let i=0;i<px.data.length;i+=4){const n=(rand()-.5)*14;for(let c=0;c<3;c++)px.data[i+c]=Math.max(0,Math.min(255,px.data[i+c]+n))}
  ctx.putImageData(px,0,0)
  return texture(el)
}
