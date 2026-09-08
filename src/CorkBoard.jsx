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
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.04
    renderer.domElement.setAttribute('aria-hidden', 'true')
    mount.prepend(renderer.domElement)

    const scene = new THREE.Scene(), group = new THREE.Group(); scene.add(group)
    scene.background = new THREE.Color('#b8b09a')
    const camera = new THREE.PerspectiveCamera(60, width / height, .1, 80)
    const pmrem = new THREE.PMREMGenerator(renderer), room = new RoomEnvironment()
    const environment = pmrem.fromScene(room, .04)
    scene.environment = environment.texture; scene.environmentIntensity = .19
    room.dispose(); pmrem.dispose()
    const boardHeight = 12, boardWidth = boardHeight * width / height
    const deskY = -6.22, deskZ = 2.2
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
    const searchX = small ? usable / 2 - noteW / 2 : boardWidth / 2 - 3.2
    const demoX = small ? searchX - noteW - .10 : -boardWidth / 2 + 3.2
    interactive(paper(noteW, noteH, noteTexture('Buscar', 'Consultar el fichero', 'cream'), searchX, controlsY+.03, .045, 'pin', 0), 'Buscar documentos', () => actions.current.onSearch(), 'search-hit')
    interactive(paper(noteW, noteH, noteTexture(demo ? 'Muestra' : 'Mis documentos', demo ? 'Ver mis documentos ↗' : 'Ver muestra visual ↗', 'green'), demoX, controlsY+.035, -.035, 'pin', 3), demo ? 'Ver mis documentos' : 'Ver muestra visual', () => actions.current.onToggleDemo(), 'mode-hit')
    if (actions.current.onPrevious || actions.current.onNext) {
      const y = -3.85
      if (actions.current.onPrevious) interactive(paper(.72,.45,noteTexture('←','','cream'), -usable/2+.4,y,-.03,'tape'), 'Países anteriores', () => actions.current.onPrevious?.())
      if (actions.current.onNext) interactive(paper(.72,.45,noteTexture('→','','cream'), usable/2-.4,y,.03,'tape'), 'Países siguientes', () => actions.current.onNext?.())
    }
    if (!small && boardWidth > 14) {
      const pencil = new THREE.Group(); group.add(pencil); pencil.position.set(boardWidth*.06, deskY+.155, deskZ-1.05); pencil.rotation.z = -.11
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

    // ── Office environment ────────────────────────────────────────────────
    // Painted wall behind the board — cream/beige, slightly yellowed like the 90s
    const wallMat = new THREE.MeshStandardMaterial({color:'#cfc3a0', roughness:.97})
    const wallMesh = new THREE.Mesh(new THREE.PlaneGeometry(boardWidth+26, boardHeight+16), wallMat)
    wallMesh.position.z = -.50; wallMesh.receiveShadow = true; group.add(wallMesh)

    // Floor — linoleum/parquet, extends forward toward camera
    const floorMat2 = new THREE.MeshStandardMaterial({color:'#7a5c3a', roughness:.78, metalness:.03})
    const floorMesh = new THREE.Mesh(new THREE.PlaneGeometry(boardWidth+26, 22), floorMat2)
    floorMesh.rotation.x = -Math.PI/2; floorMesh.position.set(0,-7.1,4)
    floorMesh.receiveShadow = true; group.add(floorMesh)

    // Zócalo / baseboard
    mesh(new THREE.BoxGeometry(boardWidth+26,.30,.20), new THREE.MeshStandardMaterial({color:'#5a3c22',roughness:.78}), 0,-6.97,-.42)

    // Ceiling strip
    mesh(new THREE.BoxGeometry(boardWidth+26,.16,1.4), new THREE.MeshStandardMaterial({color:'#d8cfb8',roughness:.95}), 0,7.12,.12)

    // ── Desk ─────────────────────────────────────────────────────────────
    const deskW = boardWidth+6, deskD = 5
    mesh(new THREE.BoxGeometry(deskW,.22,deskD), wood, 0, deskY, deskZ)
    mesh(new THREE.BoxGeometry(deskW,.54,.09), wood, 0, deskY-.37, deskZ+deskD*.5-.06) // front apron

    // ── Fan — 90s desk fan, large ─────────────────────────────────────────
    // Positioned at the right edge of the desk to stay clear of document cards
    const fanX = boardWidth*.48, fanBaseZ = deskZ-.90
    const fanBaseY = deskY+.17

    // Base disc + collar + pole + neck joint (scaled ~1.4×)
    mesh(new THREE.CylinderGeometry(.88,1.06,.20,24), steel, fanX, fanBaseY, fanBaseZ)
    mesh(new THREE.CylinderGeometry(.19,.16,.18,14), steel, fanX, fanBaseY+.19, fanBaseZ)
    mesh(new THREE.CylinderGeometry(.105,.105,2.60,10), steel, fanX, fanBaseY+1.49, fanBaseZ)
    mesh(new THREE.CylinderGeometry(.19,.14,.22,14), steel, fanX, fanBaseY+2.90, fanBaseZ)

    const fanHead = new THREE.Group()
    fanHead.position.set(fanX, fanBaseY+3.14, fanBaseZ); group.add(fanHead)

    // Housing cylinder facing forward (Z axis)
    const housing = new THREE.Mesh(new THREE.CylinderGeometry(1.0,1.0,.36,30), steel)
    housing.rotation.x = Math.PI/2; housing.castShadow = true; fanHead.add(housing)
    // Front rim ring
    const rimRing = new THREE.Mesh(new THREE.TorusGeometry(1.0,.044,8,36), steel)
    rimRing.position.z = .18; fanHead.add(rimRing)

    // Blade shape — realistic propeller profile
    const bladeShape = new THREE.Shape()
    bladeShape.moveTo(0, 0.10)
    bladeShape.bezierCurveTo( 0.28, 0.13,  0.38, 0.44,  0.34, 0.82)
    bladeShape.bezierCurveTo( 0.27, 0.96,  0.08, 0.96,  0, 0.90)
    bladeShape.bezierCurveTo(-0.16, 0.93, -0.28, 0.79, -0.19, 0.45)
    bladeShape.bezierCurveTo(-0.09, 0.18, -0.04, 0.10,  0, 0.10)

    const fanBlades = new THREE.Group()
    // Push blades in front of housing so they're not hidden inside it
    fanBlades.position.z = .18
    fanHead.add(fanBlades)
    const bladeMat2 = new THREE.MeshStandardMaterial({color:'#cbb890', roughness:.38, metalness:.07, side:THREE.DoubleSide})
    const bladeGeo = new THREE.ShapeGeometry(bladeShape, 18)
    for(let i=0;i<4;i++){
      const blade = new THREE.Mesh(bladeGeo, bladeMat2)
      blade.rotation.order = 'ZYX'
      blade.rotation.z = i * Math.PI / 2
      blade.rotation.y = .40   // airfoil pitch
      blade.castShadow = true; fanBlades.add(blade)
    }
    // Hub cap (cylinder, Z-facing)
    const hubMesh = new THREE.Mesh(new THREE.CylinderGeometry(.13,.13,.14,16), new THREE.MeshStandardMaterial({color:'#d2c8b0',roughness:.36,metalness:.10}))
    hubMesh.rotation.x = Math.PI/2; hubMesh.position.z = .09; hubMesh.castShadow = true; fanHead.add(hubMesh)

    // Wire guard — 3 concentric rings + 8 radial spokes on front face
    for(const r of [.90,.62,.30]){
      const ring = new THREE.Mesh(new THREE.TorusGeometry(r,.016,7,32), steel)
      ring.position.z = .38; fanHead.add(ring)
    }
    for(let i=0;i<8;i++){
      const a = i*Math.PI/4
      const spoke = new THREE.Mesh(new THREE.CylinderGeometry(.009,.009,.92,4), steel)
      spoke.rotation.x = Math.PI/2; spoke.rotation.z = a
      spoke.position.set(Math.cos(a)*.42, Math.sin(a)*.42, .38); fanHead.add(spoke)
    }
    // Back guard
    const backRing = new THREE.Mesh(new THREE.TorusGeometry(.90,.016,7,32), steel)
    backRing.position.z = -.38; fanHead.add(backRing)

    // ── Telephone (90s desk phone) ─────────────────────────────────────────
    const phoneX = -boardWidth*.32, phoneZ = deskZ-1.20
    const phoneMat = new THREE.MeshStandardMaterial({color:'#1c1c1c', roughness:.65})
    mesh(new THREE.BoxGeometry(.80,.10,.54), phoneMat, phoneX, deskY+.16, phoneZ)
    mesh(new THREE.BoxGeometry(.52,.07,.35), new THREE.MeshStandardMaterial({color:'#242424',roughness:.55}), phoneX, deskY+.215, phoneZ+.04)
    const btnMat = new THREE.MeshStandardMaterial({color:'#e5ddc8', roughness:.55, metalness:.06})
    for(let r=0;r<4;r++) for(let c=0;c<3;c++)
      mesh(new THREE.CylinderGeometry(.024,.024,.013,8), btnMat, phoneX-.07+c*.075, deskY+.228, phoneZ+.14-r*.079)
    for(let i=0;i<5;i++)
      mesh(new THREE.CylinderGeometry(.006,.006,.012,6), new THREE.MeshStandardMaterial({color:'#050505'}), phoneX+.405, deskY+.178+i*.016, phoneZ-.04)
    const hsCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(phoneX-.30,deskY+.29,phoneZ-.17),
      new THREE.Vector3(phoneX-.12,deskY+.38,phoneZ-.20),
      new THREE.Vector3(phoneX+.04,deskY+.40,phoneZ-.18),
      new THREE.Vector3(phoneX+.22,deskY+.32,phoneZ-.13),
      new THREE.Vector3(phoneX+.32,deskY+.25,phoneZ-.09),
    ])
    const hsTube = new THREE.Mesh(new THREE.TubeGeometry(hsCurve,20,.040,8,false), phoneMat)
    hsTube.castShadow = true; group.add(hsTube)
    const capMat = new THREE.MeshStandardMaterial({color:'#080808',roughness:.82})
    const hs0=hsCurve.getPoint(0), hs1=hsCurve.getPoint(1)
    mesh(new THREE.SphereGeometry(.052,8,6), capMat, hs0.x,hs0.y,hs0.z)
    mesh(new THREE.SphereGeometry(.052,8,6), capMat, hs1.x,hs1.y,hs1.z)
    const coilPts=[]
    for(let i=0;i<=40;i++){const t=i/40;coilPts.push(new THREE.Vector3(phoneX-.22+t*.12+Math.cos(t*Math.PI*9)*.022,deskY+.19+Math.sin(t*Math.PI*9)*.018,phoneZ-.10+t*.05))}
    group.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(coilPts),80,.008,5,false),phoneMat))

    // ── Notepad with spiral binding ───────────────────────────────────────
    const padX=-boardWidth*.14, padZ=deskZ-1.32
    mesh(new THREE.BoxGeometry(.64,.030,.82), new THREE.MeshStandardMaterial({color:'#f2ebe0',roughness:.93}), padX, deskY+.126, padZ)
    mesh(new THREE.BoxGeometry(.64,.006,.82), new THREE.MeshStandardMaterial({color:'#b33a2e',roughness:.78}), padX, deskY+.108, padZ)
    mesh(new THREE.BoxGeometry(.64,.003,.82), new THREE.MeshStandardMaterial({color:'#c94030',roughness:.72}), padX, deskY+.143, padZ)
    const ringMat=new THREE.MeshStandardMaterial({color:'#aaaaaa',roughness:.35,metalness:.65})
    for(let i=0;i<11;i++){
      const ring=new THREE.Mesh(new THREE.TorusGeometry(.020,.007,6,12),ringMat)
      ring.rotation.x=Math.PI/2; ring.position.set(padX-.28+i*.057, deskY+.138, padZ-.42); group.add(ring)
    }
    for(let i=0;i<5;i++) mesh(new THREE.BoxGeometry(.52,.001,.002), new THREE.MeshStandardMaterial({color:'#5580a8',roughness:.98}), padX, deskY+.148, padZ-.14+i*.10)

    // ── Pencil cup with colored pencils ──────────────────────────────────
    const cupX=boardWidth*.14, cupZ=deskZ-1.08
    mesh(new THREE.CylinderGeometry(.090,.082,.30,14), new THREE.MeshStandardMaterial({color:'#c8a870',roughness:.65}), cupX, deskY+.26, cupZ)
    mesh(new THREE.CylinderGeometry(.078,.078,.008,14), new THREE.MeshStandardMaterial({color:'#0c0805',roughness:.98}), cupX, deskY+.413, cupZ)
    const pColors=['#e84040','#2860c8','#28a840','#d49010','#9428c0']
    const pAngZ=[.0,.30,-.26,.16,-.14], pAngX=[.10,.07,-.09,.06,-.07]
    for(let i=0;i<5;i++){
      const pg=new THREE.Group()
      pg.position.set(cupX+Math.sin(pAngZ[i])*.038, deskY+.29, cupZ+Math.sin(pAngX[i])*.02)
      pg.rotation.z=pAngZ[i]*.55; pg.rotation.x=pAngX[i]; group.add(pg)
      mesh(new THREE.CylinderGeometry(.018,.018,.92,6),new THREE.MeshStandardMaterial({color:pColors[i],roughness:.55}),0,.39,0,pg)
      mesh(new THREE.ConeGeometry(.018,.12,6),new THREE.MeshStandardMaterial({color:'#c8a878',roughness:.62}),0,.91,0,pg)
      mesh(new THREE.ConeGeometry(.006,.028,6),new THREE.MeshStandardMaterial({color:'#1a1a1a'}),0,.975,0,pg)
      mesh(new THREE.CylinderGeometry(.019,.019,.04,10),new THREE.MeshStandardMaterial({color:'#c8b060',roughness:.3,metalness:.7}),0,-.085,0,pg)
      mesh(new THREE.CylinderGeometry(.017,.017,.05,10),new THREE.MeshStandardMaterial({color:'#d07878',roughness:.6}),0,-.130,0,pg)
    }

    // ── Post-it "+ Documento" (interactive, standing near pencil cup) ─────
    const addW=1.4, addH=1.0, addBaseZ=deskZ-.98
    const addP=new THREE.Group()
    addP.position.set(cupX+.26, deskY+.62, addBaseZ); addP.userData.hover=false; group.add(addP)
    const addTex=noteTexture('+ Documento','Agregar al tablero','yellow')
    addTex.anisotropy=renderer.capabilities.getMaxAnisotropy()
    const addSheet=new THREE.Mesh(new THREE.PlaneGeometry(addW,addH,4,4),new THREE.MeshStandardMaterial({map:addTex,bumpMap:fibers,bumpScale:.003,roughness:1,side:THREE.DoubleSide}))
    addSheet.castShadow=addSheet.receiveShadow=true; addP.add(addSheet)
    interactive({p:addP,sheet:addSheet,w:addW,h:addH,baseZ:addBaseZ},'Cargar documento',()=>actions.current.onAdd(),'add-hit')

    // ── Plant (cactus in terracotta pot) ──────────────────────────────────
    const plantX=boardWidth*.26, plantZ=deskZ-.82
    const terraMat2=new THREE.MeshStandardMaterial({color:'#a85230',roughness:.88})
    const cactusMat=new THREE.MeshStandardMaterial({color:'#3a6828',roughness:.72})
    mesh(new THREE.CylinderGeometry(.14,.18,.22,14),terraMat2,plantX,deskY+.22,plantZ)
    mesh(new THREE.TorusGeometry(.150,.014,6,18),terraMat2,plantX,deskY+.33,plantZ)
    mesh(new THREE.CylinderGeometry(.132,.132,.004,14),new THREE.MeshStandardMaterial({color:'#1e0f05',roughness:.97}),plantX,deskY+.334,plantZ)
    mesh(new THREE.CylinderGeometry(.060,.072,.58,10),cactusMat,plantX,deskY+.62,plantZ)
    mesh(new THREE.SphereGeometry(.062,10,6,0,Math.PI*2,0,Math.PI/2),cactusMat,plantX,deskY+.91,plantZ)
    const larm=mesh(new THREE.CylinderGeometry(.038,.038,.24,8),cactusMat,plantX-.12,deskY+.52,plantZ)
    larm.rotation.z=Math.PI/2.8
    mesh(new THREE.CylinderGeometry(.038,.038,.16,8),cactusMat,plantX-.24,deskY+.67,plantZ)
    const rarm=mesh(new THREE.CylinderGeometry(.036,.036,.20,8),cactusMat,plantX+.11,deskY+.55,plantZ)
    rarm.rotation.z=-Math.PI/3.2
    mesh(new THREE.CylinderGeometry(.036,.036,.14,8),cactusMat,plantX+.20,deskY+.68,plantZ)
    const spineMat2=new THREE.MeshStandardMaterial({color:'#e8d5a8',roughness:.5})
    for(let i=0;i<8;i++){const a=i*Math.PI/4,r=.072;mesh(new THREE.CylinderGeometry(.002,.002,.042,4),spineMat2,plantX+Math.cos(a)*r,deskY+.62+i*.035,plantZ+Math.sin(a)*r)}

    // Warm desk lamp light — downward SpotLight
    const lampLight = new THREE.SpotLight('#ffeaa0', 22, 9, .62, .55, 2)
    lampLight.position.set(fanX-2.2, deskY+3.2, deskZ)
    lampLight.target.position.set(fanX-2.2, deskY, deskZ-1)
    scene.add(lampLight, lampLight.target)

    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
    const distance = boardHeight / (2 * Math.tan(THREE.MathUtils.degToRad(22)))
    camera.position.set(0, 0, distance)
    const pointer = new THREE.Vector2(), target = new THREE.Vector3()
    const move = e => {pointer.set(e.clientX / width - .5, e.clientY / height - .5)}
    const leave = () => pointer.set(0,0)
    mount.addEventListener('pointermove',move); mount.addEventListener('pointerleave',leave)
    const center = new THREE.Vector3(), corner = new THREE.Vector3()
    const lookTarget = new THREE.Vector3(0,-1.5,0), focusPoint = new THREE.Vector3(), hoverWP = new THREE.Vector3()
    let animFov = 60, last = 0
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
      const tz = distance
      camera.position.x = THREE.MathUtils.lerp(camera.position.x, tx, ease)
      camera.position.y = THREE.MathUtils.lerp(camera.position.y, ty, ease)
      camera.position.z = THREE.MathUtils.lerp(camera.position.z, tz, easeZ)
      // Look-at: subtle drift toward hovered
      focusPoint.set(hoverPos?hoverPos.x*.08:0,-1.5+(hoverPos?hoverPos.y*.05:0),0)
      lookTarget.lerp(focusPoint,ease*.40)
      camera.lookAt(lookTarget)
      // FOV: very slight narrowing on hover, slow transition
      const nextFov = hoverPos?58.5:60
      if(Math.abs(camera.fov-nextFov)>.01){camera.fov=THREE.MathUtils.lerp(camera.fov,nextFov,ease*.06);camera.updateProjectionMatrix()}
      camera.updateMatrixWorld()
      objects.forEach(({p,sheet,button,w,h,baseZ}) => {
        if(!p.visible) return
        const hov=p.userData.hover
        p.position.z = THREE.MathUtils.lerp(p.position.z,hov?baseZ+.26:baseZ,ease*.06)
        p.rotation.x = THREE.MathUtils.lerp(p.rotation.x,hov&&!reduced?-.05:0,ease*.06)
        p.updateWorldMatrix(true,true)
        sheet.getWorldPosition(center); center.project(camera)
        corner.set(w/2,h/2,0); sheet.localToWorld(corner); corner.project(camera)
        Object.assign(button.style,{left: ((center.x+1)*width/2)+'px', top: ((1-center.y)*height/2)+'px', width: Math.abs(corner.x-center.x)*width+'px', height: Math.abs(corner.y-center.y)*height+'px', transform:'translate(-50%,-50%) rotate('+(-p.rotation.z)+'rad)'})
      })
      // Fan animation — blades spin, head oscillates slowly
      if (!reduced) {
        fanBlades.rotation.z += 11 * dt
        fanHead.rotation.y = Math.sin(time * 0.00045) * 0.38
      }
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
