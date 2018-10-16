
const DEGRESS_TO_RADIANS = (2 * Math.PI) / 360

const Boop = class {
	constructor(onDisplayCallback=null){
		this._onDisplayCallback = onDisplayCallback
		this._render = this._render.bind(this)
		this._renderFlat = this._renderFlat.bind(this)
		this._renderVR = this._renderVR.bind(this)

 		this._vrDisplay = null
		this._getVRDisplay()

		// Render size
		this._width = 1
		this._height = 1

		this._isStarted = false
		this._vrFrameData = new VRFrameData()

		this._camera = new THREE.PerspectiveCamera(45, 1, 0.5, 10000)

		this._scene = new THREE.Scene()
		this._scene.matrixAutoUpdate = false

		this._renderer = new THREE.WebGLRenderer({
			antialias: true
		})
		this._renderer.domElement.setAttribute('class', 'webvr-display')
		this._renderer.setClearColor(0x99DDff)
		//this._renderer.shadowMap.enabled = true
		//this._renderer.shadowMap.type = THREE.PCFShadowMap

		this._modelGroup = new THREE.Group()
		this._modelGroup.name = 'ModelGroup'
		this._scene.add(this._modelGroup)

		window.addEventListener('vrdisplaypresentchange', ev => {
			if (this._vrDisplay === null) return
			if(this._vrDisplay.isPresenting){
				console.log('Presenting')
			} else {
				console.log('No longer presenting')
			}
		})

		setTimeout(() => {
			this._updateSize()
			this._render()
		}, 500)

		this._fetchConfiguration()
	}

	/**
	@return {HTMLElement} the canvas element that displays the scene
	*/
	get el(){
		return this._renderer.domElement
	}

	/**
	@return {bool} true if the scene is being rendered in VR
	*/
	get isStarted() {
		return this._isStarted
	}

	/**
	Start rendering in VR
	*/
	start() {
		if (this._isStarted) return Promise.reject('Already started')
		if(this._vrDisplay === null){
			return Promise.reject('No vr display was found')
		}
		this._isStarted = true
		return new Promise((resolve, reject) => {
			document.body.appendChild(this._renderer.domElement)
			this._vrDisplay
				.requestPresent([
					{
						source: this._renderer.domElement
					}
				])
				.then(() => {
					this._updateSize()
					this._vrDisplay.requestAnimationFrame(this._render)
					resolve()
				})
				.catch(err => {
					this._isStarted = false
					this._updateSize()
					console.error('Error starting WebVR', err)
					reject(err)
				})
		})
	}

	/**
	Stop rendering in VR
	*/
	stop() {
		if (this._isStarted === false) return Promise.resolve()
		this._isStarted = false
		this._updateSize()
		if (this._vrDisplay.isPresenting === false) return Promise.resolve()
		return this._vrDisplay.exitPresent()
	}

	async _getVRDisplay(){
		let displays = await navigator.getVRDisplays()
		displays = displays.filter(display => display.capabilities.canPresent)
		if (displays.length > 0) {
			this._vrDisplay = displays[0]
		}
		if(this._onDisplayCallback){
			this._onDisplayCallback(this._vrDisplay)
		}
	}

	_render() {
		if(this._isStarted){
			this._renderVR()
		} else {
			this._renderFlat()
		}
	}

	_renderFlat(){
		if(this._isStarted) return
		window.requestAnimationFrame(this._renderFlat)
		this._renderer.clear()
		this._renderer.setViewport(0, 0, this._width, this._height)
		this._scene.updateMatrixWorld(true)
		this._renderer.render(this._scene, this._camera)
	}

	_renderVR(){
		if (this._isStarted === false) return
		if (this._vrDisplay === null) return
		if (this._vrDisplay.isPresenting === false) return
		this._vrDisplay.requestAnimationFrame(this._renderVR)

		this._vrDisplay.getFrameData(this._vrFrameData)

		this._renderer.autoClear = false
		this._scene.matrixAutoUpdate = false

		// The view is assumed to be full-window in VR because the canvas element fills the entire HMD screen[s]
		this._renderer.clear()
		this._renderer.setViewport(0, 0, this._width * 0.5, this._height)

		// Render left eye
		this._camera.projectionMatrix.fromArray(this._vrFrameData.leftProjectionMatrix)
		this._scene.matrix.fromArray(this._vrFrameData.leftViewMatrix)
		this._scene.updateMatrixWorld(true)
		this._renderer.render(this._scene, this._camera)

		// Prep for right eye
		this._renderer.clearDepth()
		this._renderer.setViewport(this._width * 0.5, 0, this._width * 0.5, this._height)

		// Render right eye
		this._camera.projectionMatrix.fromArray(this._vrFrameData.rightProjectionMatrix)
		this._scene.matrix.fromArray(this._vrFrameData.rightViewMatrix)
		this._scene.updateMatrixWorld(true)
		this._renderer.render(this._scene, this._camera)

		this._vrDisplay.submitFrame()
	}

	_updateSize() {
		if (this._isStarted){
			// VR mode
			const eyeParams = this._vrDisplay.getEyeParameters('left')
			this._width = eyeParams.renderWidth * 2
			this._height = eyeParams.renderHeight
			this._renderer.setPixelRatio(1)
			this._camera.aspect = this._width / this._height
			this._camera.updateProjectionMatrix()
			this._renderer.setSize(this._width, this._height, false)
		} else {
			// flat mode
			this._width = this.el.clientWidth
			this._height = this.el.clientHeight
			this._renderer.setPixelRatio(window.devicePixelRatio)
			this._camera.aspect = this._width / this._height
			this._camera.updateProjectionMatrix()
			this._renderer.setSize(this._width, this._height, false)
		}
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
			mtlLoader.setTexturePath(baseURL)
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

const mtlLoader = new THREE.MTLLoader()
const objLoader = new THREE.OBJLoader()

