// js/visualizer.js
import { generateGraph, addEdge, hasEdge } from './graph.js';
import { bfs, dfs, dijkstra } from './algorithms.js';
import { updateStatsUI, setButtonState, updateQueueStackUI, setStepButtonState } from './ui.js';

class GraphTraversalVisualizer {
    constructor() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ 
            canvas: document.getElementById('canvas'),
            antialias: true,
            alpha: true
        });
        this.nodes = [];
        this.edges = [];
        this.nodeObjects = [];
        this.edgeObjects = [];
        this.graph = new Map();
        this.isRunningFlag = false;
        this.startNode = null;
        this.visitedNodes = new Set();
        this.currentNode = null;
        this.stepCount = 0;
        this.startTime = null;
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.manualStepResolve = null;
        this.init();
        this.generateGraph();
        this.setupEventListeners();
        this.animate();
    }
    init() {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setClearColor(0x000000, 0);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.camera.position.set(0, 0, 30);
        const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
        this.scene.add(ambientLight);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10, 10, 5);
        directionalLight.castShadow = true;
        this.scene.add(directionalLight);
        const pointLight = new THREE.PointLight(0x4ecdc4, 1, 100);
        pointLight.position.set(0, 0, 10);
        this.scene.add(pointLight);
    }
    generateGraph() {
        this.clearGraph();
        // Récupère la valeur du champ, ou 12 par défaut
        const nodeCountInput = document.getElementById('nodeCount');
        const nodeCount = nodeCountInput ? parseInt(nodeCountInput.value) : 12;
        const { nodes, edges, graph } = generateGraph(nodeCount);
        this.nodes = nodes;
        this.edges = edges;
        this.graph = graph;
        this.createVisualGraph();
        this.lastRedNode = undefined;
        updateQueueStackUI('queue', []);
        setStepButtonState(false);
    }
    createVisualGraph() {
        this.nodes.forEach(node => {
            const geometry = new THREE.SphereGeometry(0.5, 32, 32);
            const material = new THREE.MeshPhongMaterial({ 
                color: 0x007aff, // bleu vif
                shininess: 100,
                transparent: true,
                opacity: 0.95
            });
            const sphere = new THREE.Mesh(geometry, material);
            sphere.position.set(node.x, node.y, node.z);
            sphere.userData = { nodeId: node.id };
            sphere.castShadow = true;
            sphere.receiveShadow = true;
            const haloGeometry = new THREE.SphereGeometry(0.7, 32, 32);
            const haloMaterial = new THREE.MeshBasicMaterial({ 
                color: 0x00ffd0, // turquoise vif
                transparent: true,
                opacity: 0.15
            });
            const halo = new THREE.Mesh(haloGeometry, haloMaterial);
            halo.position.copy(sphere.position);
            this.scene.add(sphere);
            this.scene.add(halo);
            this.nodeObjects.push({ sphere, halo, originalColor: 0x007aff });
        });
        this.edges.forEach(edge => {
            const fromNode = this.nodes[edge.from];
            const toNode = this.nodes[edge.to];
            const geometry = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(fromNode.x, fromNode.y, fromNode.z),
                new THREE.Vector3(toNode.x, toNode.y, toNode.z)
            ]);
            const material = new THREE.LineBasicMaterial({ 
                color: 0x333333,
                transparent: true,
                opacity: 0.6
            });
            const line = new THREE.Line(geometry, material);
            this.scene.add(line);
            this.edgeObjects.push({ line, originalColor: 0x333333 });
        });
    }
    clearGraph() {
        this.nodeObjects.forEach(obj => {
            this.scene.remove(obj.sphere);
            this.scene.remove(obj.halo);
        });
        this.edgeObjects.forEach(obj => {
            this.scene.remove(obj.line);
        });
        this.nodes = [];
        this.edges = [];
        this.nodeObjects = [];
        this.edgeObjects = [];
        this.graph.clear && this.graph.clear();
        this.resetVisualization();
    }
    resetVisualization() {
        this.isRunningFlag = false;
        this.startNode = null;
        this.visitedNodes.clear();
        this.currentNode = null;
        this.stepCount = 0;
        this.startTime = null;
        this.lastRedNode = undefined;
        this.nodeObjects.forEach(obj => {
            obj.sphere.material.color.setHex(obj.originalColor);
            obj.sphere.material.opacity = 0.95;
            obj.halo.visible = true;
        });
        this.edgeObjects.forEach(obj => {
            obj.line.material.color.setHex(obj.originalColor);
            obj.line.material.opacity = 0.6;
        });
        this.updateStats();
        updateQueueStackUI('queue', []);
        setStepButtonState(false);
    }
    async startAlgorithm() {
        if (this.startNode === null || this.isRunningFlag) return;
        this.isRunningFlag = true;
        this.visitedNodes.clear();
        this.stepCount = 0;
        this.startTime = Date.now();
        const algorithm = document.getElementById('algorithm').value;
        const speed = () => parseInt(document.getElementById('speed').value);
        const mode = document.getElementById('mode').value;
        setButtonState('startBtn', false);
        setStepButtonState(mode === 'manual');
        // Gestion du mode pas-à-pas
        let waitForStep = null;
        if (mode === 'manual') {
            waitForStep = () => new Promise(resolve => {
                this.manualStepResolve = resolve;
                setStepButtonState(true);
            });
        }
        const updateQueueStack = (type, arr) => {
            updateQueueStackUI(type, arr);
        };
        const algoParams = {
            startNodeId: this.startNode,
            graph: this.graph,
            nodes: this.nodes,
            visitNode: (nodeId, isStart) => {
                this.visitedNodes.add(nodeId);
                this.currentNode = nodeId;
                this.stepCount++;
                this.updateNodeVisual(nodeId, isStart ? 0x00ffd0 : 0xff2d55);
            },
            highlightEdge: (from, to) => this.highlightEdge(from, to),
            updateStats: (visited, steps) => {
                const elapsed = this.startTime ? ((Date.now() - this.startTime) / 1000).toFixed(1) : '0.0';
                updateStatsUI(visited, steps, elapsed);
            },
            speed,
            isRunning: () => this.isRunningFlag,
            waitForStep,
            updateQueueStack
        };
        try {
            if (algorithm === 'bfs') await bfs(algoParams);
            else if (algorithm === 'dfs') await dfs(algoParams);
            else if (algorithm === 'dijkstra') await dijkstra(algoParams);
        } catch (error) {
            console.error('Erreur lors de l\'exécution de l\'algorithme:', error);
        }
        this.isRunningFlag = false;
        setButtonState('startBtn', true);
        setStepButtonState(false);
    }
    updateNodeVisual(nodeId, color) {
        const nodeObj = this.nodeObjects[nodeId];
        if (nodeObj) {
            // Si c'est le dernier nœud visité (rouge vif, opaque, sans halo)
            if (color === 0xff2d55) {
                if (this.lastRedNode !== undefined && this.lastRedNode !== nodeId) {
                    const prevObj = this.nodeObjects[this.lastRedNode];
                    if (prevObj) prevObj.halo.visible = true;
                }
                nodeObj.sphere.material.color.setHex(0xff0000); // rouge vif
                nodeObj.sphere.material.opacity = 1.0;
                nodeObj.halo.visible = false;
                this.lastRedNode = nodeId;
            } else if (color === 0xff6b6b) { // nœud déjà visité (sauf le dernier)
                nodeObj.sphere.material.color.setHex(0xff2d55); // même rose vif
                nodeObj.sphere.material.opacity = 0.4; // plus transparent
                nodeObj.halo.visible = true;
            } else {
                nodeObj.sphere.material.color.setHex(color);
                nodeObj.sphere.material.opacity = 0.95;
                nodeObj.halo.visible = true;
            }
            const originalScale = nodeObj.sphere.scale.clone();
            nodeObj.sphere.scale.multiplyScalar(1.3);
            setTimeout(() => {
                nodeObj.sphere.scale.copy(originalScale);
            }, 200);
        }
    }
    highlightEdge(fromId, toId) {
        const edge = this.edges.find(e => 
            (e.from === fromId && e.to === toId) || 
            (e.from === toId && e.to === fromId)
        );
        if (edge) {
            const edgeIndex = this.edges.indexOf(edge);
            const edgeObj = this.edgeObjects[edgeIndex];
            if (edgeObj) {
                edgeObj.line.material.color.setHex(0xffd600); // jaune vif
                edgeObj.line.material.opacity = 1;
            }
        }
    }
    updateStats() {
        const elapsed = this.startTime ? ((Date.now() - this.startTime) / 1000).toFixed(1) : '0.0';
        updateStatsUI(this.visitedNodes.size, this.stepCount, elapsed);
    }
    setupEventListeners() {
        document.getElementById('canvas').addEventListener('click', (event) => {
            if (this.isRunningFlag) return;
            this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
            this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
            this.raycaster.setFromCamera(this.mouse, this.camera);
            const intersects = this.raycaster.intersectObjects(
                this.nodeObjects.map(obj => obj.sphere)
            );
            if (intersects.length > 0) {
                const nodeId = intersects[0].object.userData.nodeId;
                this.setStartNode(nodeId);
            }
        });
        document.getElementById('startBtn').addEventListener('click', () => {
            this.startAlgorithm();
        });
        document.getElementById('resetBtn').addEventListener('click', () => {
            this.resetVisualization();
        });
        document.getElementById('generateBtn').addEventListener('click', () => {
            this.generateGraph();
        });
        document.getElementById('stepBtn').addEventListener('click', () => {
            if (this.manualStepResolve) {
                setStepButtonState(false);
                this.manualStepResolve();
                this.manualStepResolve = null;
            }
        });
        document.getElementById('mode').addEventListener('change', () => {
            setStepButtonState(document.getElementById('mode').value === 'manual');
        });
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }
    setStartNode(nodeId) {
        if (this.startNode !== null) {
            this.updateNodeVisual(this.startNode, 0x007aff); // bleu vif
        }
        this.startNode = nodeId;
        this.updateNodeVisual(nodeId, 0x00ffd0); // turquoise vif
    }
    animate() {
        requestAnimationFrame(() => this.animate());
        const time = Date.now() * 0.0005;
        // Rotation automatique de la caméra en continu
        this.camera.position.x = Math.cos(time) * 30;
        this.camera.position.z = Math.sin(time) * 30;
        this.camera.lookAt(0, 0, 0);
        // Animation des halos
        this.nodeObjects.forEach(obj => {
            obj.halo.rotation.x += 0.01;
            obj.halo.rotation.y += 0.01;
        });
        this.renderer.render(this.scene, this.camera);
    }
}

window.visualizer = new GraphTraversalVisualizer(); 