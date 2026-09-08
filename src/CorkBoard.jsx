import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { surface, paperTexture, labelTexture, noteTexture, fiberTexture, flagTexture } from './boardMaterials'

// The DOM contains only transparent, keyboard-accessible hit areas; every visible
// control is a lit mesh in the same scene as the documents.
export default function CorkBoard(props) {
  const { columns, documents, demo } = props
  const host = useRef(null), actions = useRef(props)
  actions.current = props
  // Cork, wood and fiber textures are expensive to load/generate; keep them for
  // the component lifetime and only rebuild scene geometry when props change.
  const sharedRef = useRef(null)
  if (!sharedRef.current) sharedRef.current = {cork: surface('cork'), wood: surface('wood'), fibers: fiberTexture()}
  useEffect(() => () => {
    const {cork, wood, fibers} = sharedRef.current
    ;[cork, wood].forEach(m => {Object.values(m).forEach(v => {if(v?.isTexture) v.dispose()}); m.dispose()})
    fibers.dispose()
  }, [])
  const [failed, setFailed] = useState(false)
  const [viewport, setViewport] = useState(() => ({width: innerWidth, height: innerHeight}))
  useEffect(() => {
    let timer
    const observer = new ResizeObserver(([entry]) => {
      clearTimeout(timer)
      timer = setTimeout(() => setViewport(old => {
        const {width, height} = entry.contentRect
        return old.width === width && old.height === height ? old : {width, height}
      }), 120)
    })
    observer.observe(host.current)
    return () => {clearTimeout(timer); observer.disconnect()}
  }, [])
  useEffect(() => {
    const mount = host.current
    const width = Math.max(1, viewport.width), height = Math.max(1, viewport.height)
    const isMobile = width < 700
    let renderer
    try { renderer = new THREE.WebGLRenderer({antialias: !isMobile, powerPreference: 'high-performance', precision: isMobile ? 'mediump' : 'highp'}) }
    catch {setFailed(true); return}
    setFailed(false)
    renderer.setSize(width, height)
    // Supersample even on 1x screens. Bound total pixels for laptops and phones.
    const pixelBudget = isMobile ? 3_000_000 : 9_000_000
    const renderScale = Math.max(1, Math.min(2, Math.max(devicePixelRatio, 1.5), Math.sqrt(pixelBudget / (width * height))))
    renderer.setPixelRatio(renderScale)
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap; renderer.shadowMap.autoUpdate = false
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.04
    renderer.domElement.setAttribute('aria-hidden', 'true')
    mount.prepend(renderer.domElement)

    const scene = new THREE.Scene(), group = new THREE.Group(); scene.add(group)
    scene.background = new THREE.Color('#66503a')
    const camera = new THREE.PerspectiveCamera(36, width / height, .1, 80)
    const pmrem = new THREE.PMREMGenerator(renderer), room = new RoomEnvironment()
    const environment = pmrem.fromScene(room, .04)
    scene.environment = environment.texture; scene.environmentIntensity = .19
    room.dispose(); pmrem.dispose()
    const boardHeight = 12, boardWidth = boardHeight * width / height
    const {cork, wood, fibers} = sharedRef.current
    for (const k of ['map', 'normalMap', 'roughnessMap']) cork[k].repeat.set(boardWidth / 4.5, boardHeight / 4.5)
    cork.color.set('#aca28b'); cork.normalScale.set(.8, .8)
    const bronze = new THREE.MeshStandardMaterial({color: '#8d7650', metalness: .9, roughness: .26})
    const steel = new THREE.MeshStandardMaterial({color: '#b0aaa0', metalness: .94, roughness: .24})
    const green = new THREE.MeshStandardMaterial({color: '#26392c', roughness: .33, metalness: .18})
    const red = new THREE.MeshStandardMaterial({color: '#702e20', roughness: .34, metalness: .1})
    const paperBack = new THREE.MeshStandardMaterial({color: '#ddd3bb', bumpMap: fibers, bumpScale: .012, roughness: 1, side: THREE.DoubleSide})
    const tapeMaterial = new THREE.MeshStandardMaterial({color: '#c7b484', transparent: true, opacity: .78, bumpMap: fibers, bumpScale: .012, roughness: 1, side: THREE.DoubleSide})
    const thread = new THREE.MeshStandardMaterial({color: '#433320', roughness: .92})
    const objects = [], buttons = []
    function mesh(geo, mat, x, y, z, parent = group) {
      const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z)
      m.castShadow = m.receiveShadow = true; parent.add(m); return m
    }
    function box(w, h, d, mat, x, y, z, radius = .02) {
      return mesh(new RoundedBoxGeometry(w, h, d, 3, radius), mat, x, y, z)
    }
    box(boardWidth + 2, boardHeight + 2, .3, cork, 0, 0, -.14)
    // A narrow recessed frame remains at the very edge of the viewport.
    const trim = new THREE.MeshStandardMaterial({color: '#281c12', roughness: .76})
    for (const x of [-boardWidth / 2 + .10, boardWidth / 2 - .10]) {
      box(.20, boardHeight + .2, .26, wood, x, 0, .02)
      box(.035, boardHeight, .04, trim, x + Math.sign(x) * -.13, 0, .005, .006)
    }
    for (const y of [-5.91, 5.91]) {
      box(boardWidth, .18, .26, wood, 0, y, .02)
      box(boardWidth, .03, .04, trim, 0, y + Math.sign(y) * -.12, .005, .006)
    }
    scene.add(new THREE.HemisphereLight('#d6e1e9', '#554027', .54))
    const keyLight = new THREE.DirectionalLight('#ffe3b4', 1.7)
    keyLight.position.set(-boardWidth * .4, 8, 6); keyLight.castShadow = true
    keyLight.shadow.mapSize.set(isMobile ? 2048 : 4096, isMobile ? 2048 : 4096)
    keyLight.shadow.bias = -.000025; keyLight.shadow.normalBias = .004; keyLight.shadow.radius = 2
    scene.add(keyLight)
    // Fit the shadow camera in light space, rather than spending most texels
    // outside the board. This sharpens pin contact and removes stepped edges.
    keyLight.updateMatrixWorld(); keyLight.target.updateMatrixWorld(); keyLight.shadow.updateMatrices(keyLight)
    const shadowBounds = new THREE.Box3(
      new THREE.Vector3(-boardWidth / 2 - .3, -6.3, -.1),
      new THREE.Vector3(boardWidth / 2 + .3, 6.3, .7),
    ).applyMatrix4(keyLight.shadow.camera.matrixWorldInverse)
    Object.assign(keyLight.shadow.camera, {
      left: shadowBounds.min.x, right: shadowBounds.max.x,
      bottom: shadowBounds.min.y, top: shadowBounds.max.y,
      near: Math.max(.1, -shadowBounds.max.z - .5), far: -shadowBounds.min.z + .5,
    })
    keyLight.shadow.camera.updateProjectionMatrix()
    const pool = new THREE.SpotLight('#ffd493', 100, 35, .88, 1, 2)
    pool.position.set(-boardWidth * .26, 7.5, 4.4); pool.target.position.set(-boardWidth * .18, .6, 0)
    scene.add(pool, pool.target)
    // Pointer-guided highlight: warm point light that tracks the mouse,
    // casting live specular glints on metallic pins and diffuse warmth on paper.
    const pointerLight = new THREE.PointLight('#fff5e6', 7, 20, 2)
    pointerLight.position.set(0, 0, 5.5)
    scene.add(pointerLight)

    function pin(parent, x, y, mat = bronze) {
      const stem = mesh(new THREE.CylinderGeometry(.014, .014, .15, 12), steel, x, y, .055, parent)
      stem.rotation.x = Math.PI / 2
      const collar = mesh(new THREE.CylinderGeometry(.045, .033, .065, 20), mat, x, y, .135, parent)
      collar.rotation.x = Math.PI / 2
      const cap = mesh(new THREE.SphereGeometry(.067, 24, 16), mat, x, y, .18, parent); cap.scale.z = .47
    }
    function clip(parent, x, y) {
      const points = [[-.07,-.17],[-.07,.11],[-.03,.16],[.06,.16],[.10,.10],[.10,-.22],[.05,-.27],[-.01,-.27],[-.04,-.22],[-.04,.06],[0,.10],[.05,.06],[.05,-.14]].map(([a,b]) => new THREE.Vector3(x+a,y+b,.065))
      mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 64, .012, 7, false), steel, 0, 0, 0, parent)
    }
    function paper(w, h, map, x, y, angle = 0, style = 'pin', seed = 0) {
      const p = new THREE.Group(); p.position.set(x, y, .065); p.rotation.z = angle; group.add(p)
      const geo = new THREE.PlaneGeometry(w, h, 40, 48), pos = geo.attributes.position
      for (let i = 0; i < pos.count; i++) {
        const u = pos.getX(i) / w + .5, v = .5 - pos.getY(i) / h
        const curl = style === 'tape' ? .014 : .10 + (seed % 3) * .025
        const corner = seed % 2 ? 1 - u : u
        pos.setZ(i, .015 + Math.sin(u * Math.PI) * .012 + v * v * (curl * Math.pow(corner, 4) + .025) + Math.sin(u * 7 + seed) * Math.sin(v * 4) * .004)
        // Subtle continuous edge wear; high-frequency sawteeth read as aliasing.
        if (i % 41 === 0 || i % 41 === 40) pos.setX(i, pos.getX(i) + Math.sin(v * 21 + seed) * .0015)
      }
      geo.computeVertexNormals()
      if (map) map.anisotropy = renderer.capabilities.getMaxAnisotropy()
      const material = new THREE.MeshStandardMaterial({map, bumpMap: fibers, bumpScale: .003, roughness: 1, side: THREE.DoubleSide})
      const sheet = mesh(geo, material, 0, 0, 0, p)
      if (style === 'tape') {
        for (const tx of [-w * .3, w * .3]) {
          const tape = mesh(new THREE.PlaneGeometry(.42, .22, 4, 1), tapeMaterial, tx, h / 2 - .025, .065, p)
          tape.rotation.z = tx < 0 ? -.14 : .11
        }
      } else if (style === 'clip') {clip(p, -.15, h / 2 - .03); pin(p, -.13, h / 2 + .05)}
      else pin(p, .025, h / 2 - .12, seed % 4 === 0 ? green : seed % 4 === 2 ? red : bronze)
      return {p, sheet, w, h, baseZ: .065}
    }
    function flagPin(countryId, px, py) {
      const stemH = .36
      const stemMat = new THREE.MeshStandardMaterial({color:'#b0a890', metalness:.78, roughness:.28})
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(.0045,.0045,stemH,8), stemMat)
      stem.position.set(px, py, .07); stem.castShadow = true; group.add(stem)
      // Sphere at pin base — the point entering the cork
      const tip = new THREE.Mesh(new THREE.SphereGeometry(.014,12,8), steel)
      tip.position.set(px, py-stemH/2+.005, .065); tip.castShadow = true; group.add(tip)
      // Flag with subtle horizontal wave
      const fw = .40, fh = .24
      const fGeo = new THREE.PlaneGeometry(fw, fh, 8, 4)
      const fPos = fGeo.attributes.position
      for(let i=0;i<fPos.count;i++){const u=fPos.getX(i)/fw+.5;fPos.setZ(i,Math.sin(u*Math.PI)*.013+Math.sin(u*Math.PI*2.5)*.004)}
      fGeo.computeVertexNormals()
      const fTex = flagTexture(countryId); fTex.anisotropy = renderer.capabilities.getMaxAnisotropy()
      const fMesh = new THREE.Mesh(fGeo, new THREE.MeshStandardMaterial({map:fTex, roughness:.70, side:THREE.DoubleSide}))
      fMesh.position.set(px+fw/2, py+stemH/2, .078); fMesh.castShadow = fMesh.receiveShadow = true; group.add(fMesh)
    }
    function interactive(item, name, callback, className = '', enabled = true) {
      const button = document.createElement('button')
      button.className = 'paper-hit ' + className; button.setAttribute('aria-label', name)
      button.title = name; button.disabled = !enabled
      button.onclick = callback
      button.onpointerenter = button.onfocus = () => {item.p.userData.hover = true}
      button.onpointerleave = button.onblur = () => {item.p.userData.hover = false}
      mount.append(button); buttons.push(button); objects.push({...item, button})
      return button
    }
    const margin = isMobile ? .85 : 1.15, usable = boardWidth - margin * 2
    const colWidth = usable / Math.max(1, columns.length)
    const originalWidth = Math.min(colWidth * .86, 3.65)
    const docWidth = originalWidth * .88
    const docHeight = Math.min(3.22, originalWidth * 1.32) * .88
    const docCenters = [2.30, -1.37]
    columns.forEach((country, col) => {
      const x = -usable / 2 + colWidth * (col + .5)
      const docs = documents.filter(d => d.country === country.id)
      const labelW = Math.min(colWidth * .93, 4), labelY = 4.35 + Math.sin(col * 3) * .055
      flagPin(country.id, x - labelW / 2 + .05, labelY + .70)
      paper(labelW, .70, labelTexture(country.name, '', false), x, labelY, Math.sin(col * 8 + 2) * .025, 'tape')
      if (col < columns.length - 1) {
        const tx = x + colWidth / 2
        const path = new THREE.CatmullRomCurve3([new THREE.Vector3(tx,4.12,.025),new THREE.Vector3(tx+.025,.8,.018),new THREE.Vector3(tx-.025,-3.55,.028)])
        // Keep a continuous ~1.8 CSS-pixel diameter at every viewport height.
        const radius = Math.max(.010, boardHeight / height * .9)
        mesh(new THREE.TubeGeometry(path, 64, radius, 12, false), thread, 0, 0, 0)
      }
      if (!docs.length) paper(Math.min(docWidth, 2.5), 1.25, noteTexture('Todo al día', 'Sin documentos', 'cream'), x, 2.3, -.04, 'pin', col)
      const sheets = []
      docs.forEach((doc, index) => {
        const row = index % 2
        const angle = Math.sin(col * 13 + row * 7 + 1) * .042
        const y = docCenters[row] + Math.sin(col * 4 + row) * .12
        const item = paper(docWidth, docHeight, null, x + Math.sin(col * 6 + row) * .055, y, angle, index % 3 === 1 ? 'clip' : 'pin', col + index)
        const back = mesh(item.sheet.geometry.clone(), paperBack, .035, -.035, -.017, item.p); back.rotation.z = -.008
        const button = interactive(item, country.name + ': ' + doc.account + ', ' + doc.title, () => actions.current.onOpen(doc), 'document-hit')
        sheets.push({item, button, doc, index, page: Math.floor(index / 2)})
      })
      let stackPage = 0
      const pages = Math.ceil(docs.length / 2)
      function showStack() {
        sheets.forEach(({item, button, doc, index, page}) => {
          const visible = page === stackPage, material = item.sheet.material
          item.p.visible = visible; button.hidden = !visible
          // Only keep high-resolution printing for the two exposed sheets.
          if (visible && !material.map) {
            material.map = paperTexture(doc, index)
            material.map.anisotropy = renderer.capabilities.getMaxAnisotropy()
            material.needsUpdate = true
          } else if (!visible && material.map) {
            material.map.dispose(); material.map = null; material.needsUpdate = true
          }
        })
      }
      showStack()
      if (pages > 1) {
        const item = paper(Math.min(docWidth, 2.2), .48, noteTexture('Más documentos →', '1 / ' + pages, 'cream'), x, -3.72, -.025, 'tape')
        interactive(item, 'Más documentos de ' + country.name, () => {
          stackPage = (stackPage + 1) % pages; showStack()
          const old = item.sheet.material.map
          item.sheet.material.map = noteTexture('Más documentos →', (stackPage + 1) + ' / ' + pages, 'cream')
          old.dispose()
        })
      }
    })

    // Pins, paper notes and a brass pencil replace all application chrome.
    const small = isMobile
    const controlsY = -4.45
    const noteH = small ? .84 : .94
    const noteW = small ? Math.min(1.35, usable / 3.15) : 2.2
    const addX = small ? usable / 2 - noteW / 2 : boardWidth / 2 - 3.2
    const searchX = addX - noteW - (small ? .10 : .35)
    const demoX = small ? searchX - noteW - .10 : -boardWidth / 2 + 3.2
    interactive(paper(noteW, noteH, noteTexture('+ Documento', 'Colocar una hoja', 'yellow'), addX, controlsY, -.07, 'pin', 1), 'Cargar documento', () => actions.current.onAdd(), 'add-hit')
    interactive(paper(noteW, noteH, noteTexture('Buscar', 'Consultar el fichero', 'cream'), searchX, controlsY+.03, .045, 'pin', 0), 'Buscar documentos', () => actions.current.onSearch(), 'search-hit')
    interactive(paper(noteW, noteH, noteTexture(demo ? 'Muestra' : 'Mis documentos', demo ? 'Ver mis documentos ↗' : 'Ver muestra visual ↗', 'green'), demoX, controlsY+.035, -.035, 'pin', 3), demo ? 'Ver mis documentos' : 'Ver muestra visual', () => actions.current.onToggleDemo(), 'mode-hit')
    if (actions.current.onPrevious || actions.current.onNext) {
      const y = -3.85
      if (actions.current.onPrevious) interactive(paper(.72,.45,noteTexture('←','','cream'), -usable/2+.4,y,-.03,'tape'), 'Países anteriores', () => actions.current.onPrevious?.())
      if (actions.current.onNext) interactive(paper(.72,.45,noteTexture('→','','cream'), usable/2-.4,y,.03,'tape'), 'Países siguientes', () => actions.current.onNext?.())
    }
    if (!small && boardWidth > 14) {
      const pencil = new THREE.Group(); group.add(pencil); pencil.position.set(0,-4.93,.15); pencil.rotation.z = -.11
      const barrel = mesh(new THREE.CylinderGeometry(.045,.045,2.2,6),green,0,0,0,pencil); barrel.rotation.z = Math.PI/2
      const tip = mesh(new THREE.ConeGeometry(.045,.23,6),wood,1.2,0,0,pencil); tip.rotation.z = -Math.PI/2
      const graphite = mesh(new THREE.ConeGeometry(.012,.055,8),trim,1.335,0,0,pencil); graphite.rotation.z = -Math.PI/2
      const ferrule = mesh(new THREE.CylinderGeometry(.047,.047,.18,16),bronze,-1.15,0,0,pencil); ferrule.rotation.z = Math.PI/2
    }
    // A few abandoned pinholes add small-scale wear. Single InstancedMesh = 1 draw call.
    const holeMaterial = new THREE.MeshBasicMaterial({color:'#382414', transparent:true, opacity:.55})
    const holes = new THREE.InstancedMesh(new THREE.CircleGeometry(.012, 8), holeMaterial, 34)
    holes.castShadow = true; holes.receiveShadow = true; group.add(holes)
    const _m = new THREE.Matrix4(), _hp = new THREE.Vector3(), _hq = new THREE.Quaternion(), _hs = new THREE.Vector3()
    const holeScales = [.75, 1, 1.25]
    for (let i = 0; i < 34; i++) {
      const hx = Math.sin(i*53.1)*usable*.48, hy = Math.cos(i*17.2)*5.5
      holes.setMatrixAt(i, _m.compose(_hp.set(hx,hy,.021), _hq, _hs.set(holeScales[i%3],holeScales[i%3],1)))
    }
    holes.instanceMatrix.needsUpdate = true

    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
    const distance = boardHeight / (2 * Math.tan(THREE.MathUtils.degToRad(18)))
    camera.position.set(0,0,distance)
    const pointer = new THREE.Vector2(), target = new THREE.Vector3()
    const move = e => {pointer.set(e.clientX / width - .5, e.clientY / height - .5)}
    const leave = () => pointer.set(0,0)
    mount.addEventListener('pointermove',move); mount.addEventListener('pointerleave',leave)
    const center = new THREE.Vector3(), corner = new THREE.Vector3()
    const lookTarget = new THREE.Vector3(), focusPoint = new THREE.Vector3(), hoverWP = new THREE.Vector3()
    // Static scene: compute shadows once after full setup, then disable auto-update.
    renderer.shadowMap.needsUpdate = true
    let animFov = 36, last = 0
    function render(time = 0) {
      if(document.hidden || time-last < 30) return
      const dt = Math.min((time-last)/1000,.05); last = time
      const ease = reduced ? 1 : 1-Math.exp(-8*dt)
      // Zoom uses a much gentler ease so the forward pull reads as cinematic, not a snap.
      const easeZ = reduced ? 1 : 1-Math.exp(-0.75*dt)
      // Detect hovered paper (one-frame world-position lag is imperceptible)
      let hoverPos = null
      if(!reduced) for(const {p,sheet} of objects){if(p.userData.hover&&p.visible){sheet.getWorldPosition(hoverWP);hoverPos=hoverWP;break}}
      // Pointer light tracks mouse across the board — live glints on metallic pins
      pointerLight.position.set(pointer.x*boardWidth, -pointer.y*boardHeight, 5.5)
      // Camera: pointer parallax + gentle pull toward hovered paper.
      // XY follows the pointer quickly; Z (zoom) uses the slower easeZ.
      const tx = (reduced?0:pointer.x*.10)+(hoverPos?hoverPos.x*.05:0)
      const ty = (reduced?0:-pointer.y*.07)+(hoverPos?hoverPos.y*.025:0)
      const tz = distance-(hoverPos?2.5:0)
      camera.position.x = THREE.MathUtils.lerp(camera.position.x, tx, ease)
      camera.position.y = THREE.MathUtils.lerp(camera.position.y, ty, ease)
      camera.position.z = THREE.MathUtils.lerp(camera.position.z, tz, easeZ)
      // Look-at: subtle drift toward hovered
      focusPoint.set(hoverPos?hoverPos.x*.08:0,hoverPos?hoverPos.y*.05:0,0)
      lookTarget.lerp(focusPoint,ease*.40)
      camera.lookAt(lookTarget)
      // FOV: very slight narrowing on hover, slow transition
      const nextFov = hoverPos?34.8:36
      if(Math.abs(camera.fov-nextFov)>.01){camera.fov=THREE.MathUtils.lerp(camera.fov,nextFov,ease*.25);camera.updateProjectionMatrix()}
      camera.updateMatrixWorld()
      objects.forEach(({p,sheet,button,w,h,baseZ}) => {
        if(!p.visible) return
        const hov=p.userData.hover
        p.position.z = THREE.MathUtils.lerp(p.position.z,hov?baseZ+.26:baseZ,ease)
        p.rotation.x = THREE.MathUtils.lerp(p.rotation.x,hov&&!reduced?-.05:0,ease*.8)
        p.updateWorldMatrix(true,true)
        sheet.getWorldPosition(center); center.project(camera)
        corner.set(w/2,h/2,0); sheet.localToWorld(corner); corner.project(camera)
        Object.assign(button.style,{left: ((center.x+1)*width/2)+'px', top: ((1-center.y)*height/2)+'px', width: Math.abs(corner.x-center.x)*width+'px', height: Math.abs(corner.y-center.y)*height+'px', transform:'translate(-50%,-50%) rotate('+(-p.rotation.z)+'rad)'})
      })
      renderer.render(scene,camera)
    }
    renderer.setAnimationLoop(render)
    return () => {
      renderer.setAnimationLoop(null)
      mount.removeEventListener('pointermove',move); mount.removeEventListener('pointerleave',leave)
      buttons.forEach(b => b.remove())
      // Exclude shared cork/wood materials and the fibers texture from disposal;
      // they persist for the component lifetime and are cleaned up on unmount.
      const shared = new Set([cork, wood])
      const sharedTex = new Set([fibers])
      const textures = new Set(), mats = new Set(), geometries = new Set()
      scene.traverse(o => {if(o.geometry) geometries.add(o.geometry); if(o.material && !shared.has(o.material)) mats.add(o.material)})
      mats.forEach(m => {Object.values(m).forEach(v => {if(v?.isTexture && !sharedTex.has(v)) textures.add(v)}); m.dispose()})
      geometries.forEach(g => g.dispose()); textures.forEach(t => t.dispose()); environment.dispose(); keyLight.shadow.dispose()
      renderer.dispose(); renderer.domElement.remove()
    }
  }, [columns, documents, demo, viewport])
  return <div className="board-canvas" ref={host} aria-label="Tablero de corcho tridimensional">{failed && <div className="render-fallback"><p>No se pudo iniciar la vista 3D.</p><button onClick={props.onAdd}>Cargar documento</button><button onClick={props.onSearch}>Buscar documentos</button>{documents.map(doc => <button key={doc.id} onClick={() => props.onOpen(doc)}>{doc.account} · {doc.title}</button>)}</div>}</div>
}
