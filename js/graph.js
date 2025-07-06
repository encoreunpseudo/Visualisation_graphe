// js/graph.js
// Gestion du graphe et génération

export function generateGraph(nodeCount = 20, radius = 10) {
    const nodes = [];
    const edges = [];
    const graph = new Map();

    for (let i = 0; i < nodeCount; i++) {
        const angle = (i / nodeCount) * Math.PI * 2;
        const nodeRadius = radius + (Math.random() - 0.5) * 3;
        const x = Math.cos(angle) * nodeRadius;
        const y = Math.sin(angle) * nodeRadius;
        const z = (Math.random() - 0.5) * 2;
        nodes.push({ id: i, x, y, z });
        graph.set(i, []);
    }
    for (let i = 0; i < nodeCount; i++) {
        const next = (i + 1) % nodeCount;
        const weight = Math.random() * 5 + 1;
        addEdge(graph, edges, i, next, weight);
        if (Math.random() < 0.4) {
            const target = Math.floor(Math.random() * nodeCount);
            if (target !== i && !hasEdge(graph, i, target)) {
                const weight = Math.random() * 5 + 1;
                addEdge(graph, edges, i, target, weight);
            }
        }
        if (Math.random() < 0.3) {
            const target = (i + 2) % nodeCount;
            if (!hasEdge(graph, i, target)) {
                const weight = Math.random() * 5 + 1;
                addEdge(graph, edges, i, target, weight);
            }
        }
    }
    return { nodes, edges, graph };
}

export function addEdge(graph, edges, from, to, weight) {
    graph.get(from).push({ node: to, weight });
    graph.get(to).push({ node: from, weight });
    edges.push({ from, to, weight });
}

export function hasEdge(graph, from, to) {
    return graph.get(from).some(edge => edge.node === to);
} 