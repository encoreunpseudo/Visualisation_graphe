// js/ui.js
// Fonctions utilitaires pour la gestion de l'UI

export function updateStatsUI(visitedCount, stepCount, timeElapsed) {
    document.getElementById('visitedCount').textContent = visitedCount;
    document.getElementById('stepCount').textContent = stepCount;
    document.getElementById('timeElapsed').textContent = timeElapsed + 's';
}

export function setButtonState(id, enabled) {
    document.getElementById(id).disabled = !enabled;
}

export function updateQueueStackUI(type, arr) {
    document.getElementById('queueStackTitle').textContent = type === 'queue' ? 'File (BFS)' : 'Pile (DFS)';
    document.getElementById('queueStackContent').textContent = arr.join(', ');
}

export function setStepButtonState(enabled) {
    document.getElementById('stepBtn').disabled = !enabled;
} 