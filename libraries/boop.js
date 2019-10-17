
const DEGRESS_TO_RADIANS = (2 * Math.PI) / 360

const Boop = class {
	constructor(onDisplayCallback=null){
		this._updateSize = this._updateSize.bind(this)
		this._render = this._render.bind(this)

		this._camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.5, 100)

		this._scene = new THREE.Scene()
		this._scene.add(this._camera)

		this._renderer = new THREE.WebGLRenderer({
			antialias: true
		})
		this._renderer.vr.enabled = true
		this._renderer.domElement.setAttribute('class', 'webvr-display')
		this._renderer.setSize(window.innerWidth, window.innerHeight)
		this._renderer.setAnimationLoop(this._render)

		this._modelGroup = new THREE.Group()
		this._modelGroup.name = 'ModelGroup'
		this._scene.add(this._modelGroup)

		THREE.RectAreaLightUniformsLib.init()

		document.body.appendChild(THREE.WEBVR.createButton(this._renderer))
		window.addEventListener('resize', this._updateSize, false)

		this._fetchConfiguration()
	}

	get el(){
		return this._renderer.domElement
	}

	_render() {
		this._renderer.render(this._scene, this._camera)
	}

	_updateSize() {
		this._camera.aspect = window.innerWidth / window.innerHeight
		this._camera.updateProjectionMatrix()
		this._renderer.setSize(window.innerWidth, window.innerHeight)
		this._renderer.setPixelRatio(window.devicePixelRatio)
	}

	async _fetchConfiguration(){
		const response = await fetch('settings.txt')
		const body = await response.text()
		if(!body) throw new Error('Could not read the settings file')
		const lines = body.split('\n')
		for(let line of lines){
			if(line.startsWith('#') || line.trim().length === 0) continue
			const tokens = line.split(': ')
			if(tokens.length !== 2){
				console.error('Could not parse a settings line:', line)
				continue
			}
			const key = tokens[0]
			const value = tokens[1]
			switch(key){
				case 'background-color':
					this._renderer.setClearColor(new THREE.Color(value))
					break
				case 'model-glb':
					this._loadGLTF(value).then(model => {
						this._modelGroup.add(model)
					}).catch(err => {
						console.error('Could not load glTF', err)
					})
					break					
				case 'model-obj':
					this._loadOBJ(value).then(obj =>{
						this._modelGroup.add(obj)
					}).catch(err => {
						console.error('Could not load OBJ', err)
					})
					break
				case 'model-translation':
					this._modelGroup.position.set(..._parseNumberArray(value))
					break
				case 'model-rotation':
					this._modelGroup.quaternion.setFromEuler(new THREE.Euler(
						...value.split(' ').map(val => val * DEGRESS_TO_RADIANS)
					))
					break
				case 'model-scale':
					this._modelGroup.scale.set(..._parseNumberArray(value))
					break
				case 'camera-translation':
					this._camera.position.set(..._parseNumberArray(value))
					break
				case 'camera-rotation':
					this._camera.quaternion.setFromEuler(new THREE.Euler(
						..._parseNumberArray(value).map(val => val * DEGRESS_TO_RADIANS)
					))
					break
				case 'ambient-light':
					const ambientValueTokens = value.split(' ')
					const ambientIntensity = _parseNumber(ambientValueTokens[0])
					const ambientColor = _parseHex(ambientValueTokens[1])
					this._scene.add(new THREE.AmbientLight(
						ambientColor,
						ambientIntensity
					))
					break
				case 'area-light':
					// shape location(x y z) euler(x y z) color(r g b) size(w, h) intensity name
					const areaLightValueTokens = value.split(' ')
					const areaShape = areaLightValueTokens[0]
					const areaLocation = [
						_parseNumber(areaLightValueTokens[1]),
						_parseNumber(areaLightValueTokens[2]),
						_parseNumber(areaLightValueTokens[3])
					]
					const areaEuler = [
						_parseNumber(areaLightValueTokens[4]),
						_parseNumber(areaLightValueTokens[5]),
						_parseNumber(areaLightValueTokens[6])
					]
					const areaColor = [
						_parseNumber(areaLightValueTokens[7]),
						_parseNumber(areaLightValueTokens[8]),
						_parseNumber(areaLightValueTokens[9])
					]
					const areaWidth = areaLightValueTokens[10]
					const areaHeight = areaLightValueTokens[11]
					const areaIntensity = _parseNumber(areaLightValueTokens[12])
					const areaName = areaLightValueTokens.slice(13, areaLightValueTokens.length).join(' ')

					const rectAreaLight = new THREE.RectAreaLight(
						new THREE.Color(`rgb(${areaColor[0]}, ${areaColor[1]}, ${areaColor[2]})`),
						areaIntensity, areaWidth, areaHeight
					)
					rectAreaLight.name = areaName
					rectAreaLight.position.set(...areaLocation)
					rectAreaLight.quaternion.setFromEuler(new THREE.Euler(...areaEuler))
					this._scene.add(rectAreaLight)
					break
				case 'directional-light':
					const valueTokens = value.split(' ')
					const intensity = _parseNumber(valueTokens[0])
					const color = _parseHex(valueTokens[1])
					const targetTranslation = _parseNumberArray(valueTokens.slice(2).join(' '))
					const directionalLight = new THREE.DirectionalLight(color, intensity)
					directionalLight.target.position.set(...targetTranslation)
					this._scene.add(directionalLight)
					this._scene.add(directionalLight.target)
					break
				default:
					console.error('Unknown setting:', key)
			}
		}
	}

	_loadOBJ(objPath) {
		const objName = objPath.split('/')[objPath.split('/').length - 1]
		const baseURL = objPath.substring(0, objPath.length - objName.length)
		const mtlName = objName.split('.')[objName.split(':').length - 1] + '.mtl'
		const mtlPath = baseURL + mtlName

		return new Promise((resolve, reject) => {
			//mtlLoader.setPath(baseURL)
			mtlLoader.load(
				mtlPath,
				materials => {
					materials.preload()
					objLoader.setMaterials(materials)
					objLoader.load(
						objPath,
						obj => {
							obj.name = 'OBJ'
							resolve(obj)
						},
						() => {},
						(...params) => {
							console.error('Failed to load obj', ...params)
							reject(...params)
						}
					)
				},
				() => {},
				(...params) => {
					console.error('Failed to load mtl', ...params)
					reject(...params)
				}
			)
		})
	}

	_loadGLTF(gltfPath) {
		const fileName = gltfPath.split('/')[gltfPath.split('/').length - 1]
		const baseURL = gltfPath.substring(0, gltfPath.length - fileName.length)
		console.log(fileName, baseURL)
		return new Promise((resolve, reject) => {
			let loader = new THREE.GLTFLoader().setPath(baseURL)
			gltfLoader.load(
				gltfPath,
				gltf => {
					gltf.scene.name = 'GLTF'
					resolve(gltf.scene)
				},
				() => {},
				(...params) => {
					reject(...params)
				}
			)
		})
	}
}

const _parseNumberArray = function(str){
	return str.split(' ').map(s => _parseNumber(s))
}

const _parseHex = function(str){
	if(str.startsWith('#')) str = str.substring(1)
	const number = Number.parseInt(str, 16)
	if(Number.isNaN(number)){
		console.error('Error parsing setting hex number:', str)
		return 0
	}
	return number
}

const _parseNumber = function(str){
	const number = Number.parseFloat(str)
	if(Number.isNaN(number)){
		console.log('Error parsing setting number:', str)
		return 0
	}
	return number
}

export default Boop

const gltfLoader = new THREE.GLTFLoader()
const mtlLoader = new THREE.MTLLoader()
const objLoader = new THREE.OBJLoader()

