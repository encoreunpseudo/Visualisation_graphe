// js/algorithms.js
// Algorithmes de parcours de graphe

export async function bfs({ startNodeId, graph, visitNode, highlightEdge, updateStats, speed, isRunning, waitForStep, updateQueueStack }) {
    const queue = [startNodeId];
    const visited = new Set();
    let stepCount = 0;
    while (queue.length > 0 && isRunning()) {
        const nodeId = queue.shift();
        if (visited.has(nodeId)) continue;
        visited.add(nodeId);
        visitNode(nodeId, stepCount === 0);
        stepCount++;
        const neighbors = graph.get(nodeId);
        for (const neighbor of neighbors) {
            if (!visited.has(neighbor.node)) {
                queue.push(neighbor.node);
                highlightEdge(nodeId, neighbor.node);
            }
        }
        updateStats(visited.size, stepCount);
        if (updateQueueStack) updateQueueStack('queue', queue);
        if (waitForStep) {
            await waitForStep();
        } else {
            await sleep(speed());
        }
    }
}

export async function dfs({ startNodeId, graph, visitNode, highlightEdge, updateStats, speed, isRunning, waitForStep, updateQueueStack }) {
    const stack = [startNodeId];
    const visited = new Set();
    let stepCount = 0;
    while (stack.length > 0 && isRunning()) {
        const nodeId = stack.pop();
        if (visited.has(nodeId)) continue;
        visited.add(nodeId);
        visitNode(nodeId, stepCount === 0);
        stepCount++;
        const neighbors = graph.get(nodeId);
        for (const neighbor of neighbors) {
            if (!visited.has(neighbor.node)) {
                stack.push(neighbor.node);
                highlightEdge(nodeId, neighbor.node);
            }
        }
        updateStats(visited.size, stepCount);
        if (updateQueueStack) updateQueueStack('stack', stack);
        if (waitForStep) {
            await waitForStep();
        } else {
            await sleep(speed());
        }
    }
}

export async function dijkstra({ startNodeId, graph, nodes, visitNode, highlightEdge, updateStats, speed, isRunning, waitForStep, updateQueueStack }) {
    const distances = new Map();
    const visited = new Set();
    const priorityQueue = [];
    let stepCount = 0;
    nodes.forEach(node => {
        distances.set(node.id, node.id === startNodeId ? 0 : Infinity);
    });
    priorityQueue.push({ node: startNodeId, distance: 0 });
    while (priorityQueue.length > 0 && isRunning()) {
        priorityQueue.sort((a, b) => a.distance - b.distance);
        const current = priorityQueue.shift();
        if (visited.has(current.node)) continue;
        visited.add(current.node);
        visitNode(current.node, stepCount === 0);
        stepCount++;
        const neighbors = graph.get(current.node);
        for (const neighbor of neighbors) {
            if (!visited.has(neighbor.node)) {
                const newDistance = distances.get(current.node) + neighbor.weight;
                if (newDistance < distances.get(neighbor.node)) {
                    distances.set(neighbor.node, newDistance);
                    priorityQueue.push({ node: neighbor.node, distance: newDistance });
                    highlightEdge(current.node, neighbor.node);
                }
            }
        }
        updateStats(visited.size, stepCount);
        if (updateQueueStack) updateQueueStack('queue', priorityQueue.map(e => e.node));
        if (waitForStep) {
            await waitForStep();
        } else {
            await sleep(speed());
        }
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
} 