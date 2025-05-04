// Reconhecimento de gestos cadastrados

class GestureRecognizer {
    constructor() {
        this.gestures = [];
        this.currentHandLandmarks = null;
        
        // Configurações de reconhecimento
        this.matchThreshold = 0.85; // Limiar para considerar um gesto reconhecido (0-1)
        this.steadyFrameCount = 0; // Contador de frames com o mesmo gesto
        this.requiredSteadyFrames = 10; // Número de frames necessários para confirmar um gesto
        this.lastRecognizedGesture = null;
        this.cooldownTimer = null;
        this.cooldownPeriod = 1000; // Tempo para evitar reconhecimentos repetidos (ms)
        
        // Carregar gestos salvos
        this.loadGestures();
    }
    
    // Carregar gestos do armazenamento
    loadGestures() {
        const storedGestures = localStorage.getItem('handGestures');
        this.gestures = storedGestures ? JSON.parse(storedGestures) : [];
    }
    
    // Processar novos landmarks da mão
    processHandLandmarks(handLandmarks) {
        // Atualizar landmarks atuais
        this.currentHandLandmarks = handLandmarks;
        
        // Verificar se já carregamos gestos e se temos landmarks válidos
        if (this.gestures.length === 0 || !this.currentHandLandmarks) {
            return;
        }
        
        // Registrar frame para gravação
        if (window.gestureRecorder && window.gestureRecorder.isRecording) {
            window.gestureRecorder.addRecordingFrame(this.currentHandLandmarks);
            return; // Durante gravação, não fazemos reconhecimento
        }
        
        // Normalizar landmarks da mão atual
        const normalizedLandmarks = this.normalizeHandLandmarks(this.currentHandLandmarks);
        
        // Comparar com gestos salvos
        const recognizedGesture = this.recognizeGesture(normalizedLandmarks);
        
        // Processar resultado
        if (recognizedGesture) {
            this.steadyFrameCount++;
            
            if (this.steadyFrameCount >= this.requiredSteadyFrames && 
                this.lastRecognizedGesture !== recognizedGesture.name && 
                !this.cooldownTimer) {
                
                // Gesto reconhecido
                this.lastRecognizedGesture = recognizedGesture.name;
                
                // Exibir resultado
                if (window.handTracker) {
                    window.handTracker.showRecognition(recognizedGesture.name);
                }
                
                // Configurar temporizador para evitar reconhecimentos repetidos
                this.cooldownTimer = setTimeout(() => {
                    this.cooldownTimer = null;
                    this.lastRecognizedGesture = null;
                }, this.cooldownPeriod);
            }
        } else {
            // Resetar contador se não reconheceu nenhum gesto
            this.steadyFrameCount = 0;
        }
    }
    
    // Normalizar landmarks para torná-los independentes da posição/escala
    normalizeHandLandmarks(landmarks) {
        // Fazer uma cópia profunda dos landmarks
        const normalizedLandmarks = JSON.parse(JSON.stringify(landmarks));
        
        // Encontrar os valores mínimos e máximos para x, y, z
        let minX = Infinity, minY = Infinity, minZ = Infinity;
        let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
        
        for (const landmark of normalizedLandmarks) {
            minX = Math.min(minX, landmark.x);
            minY = Math.min(minY, landmark.y);
            minZ = Math.min(minZ, landmark.z);
            maxX = Math.max(maxX, landmark.x);
            maxY = Math.max(maxY, landmark.y);
            maxZ = Math.max(maxZ, landmark.z);
        }
        
        // Calcular o tamanho da caixa delimitadora
        const width = maxX - minX || 1; // Evitar divisão por zero
        const height = maxY - minY || 1;
        const depth = maxZ - minZ || 1;
        
        // Normalizar para que todos os valores estejam entre 0 e 1
        for (let i = 0; i < normalizedLandmarks.length; i++) {
            normalizedLandmarks[i].x = (normalizedLandmarks[i].x - minX) / width;
            normalizedLandmarks[i].y = (normalizedLandmarks[i].y - minY) / height;
            normalizedLandmarks[i].z = (normalizedLandmarks[i].z - minZ) / depth;
        }
        
        return normalizedLandmarks;
    }
    
    // Reconhecer gesto
    recognizeGesture(normalizedLandmarks) {
        let bestMatch = null;
        let bestScore = 0;
        
        // Comparar com cada gesto salvo
        for (const gesture of this.gestures) {
            // Para simplicidade, usamos apenas o primeiro frame do gesto
            const gestureFrame = gesture.frames[0];
            
            // Calcular pontuação de similaridade
            const similarity = this.calculateSimilarity(normalizedLandmarks, gestureFrame);
            
            // Verificar se é a melhor correspondência até agora
            if (similarity > bestScore) {
                bestScore = similarity;
                bestMatch = gesture;
            }
        }
        
        // Verificar se a pontuação ultrapassa o limiar
        if (bestScore >= this.matchThreshold) {
            return bestMatch;
        }
        
        return null;
    }
    
    // Calcular similaridade entre dois conjuntos de landmarks
    calculateSimilarity(landmarks1, landmarks2) {
        if (!landmarks1 || !landmarks2 || landmarks1.length !== landmarks2.length) {
            return 0;
        }
        
        let totalDistance = 0;
        
        for (let i = 0; i < landmarks1.length; i++) {
            // Calcular distância euclidiana 3D
            const dx = landmarks1[i].x - landmarks2[i].x;
            const dy = landmarks1[i].y - landmarks2[i].y;
            const dz = landmarks1[i].z - landmarks2[i].z;
            
            totalDistance += Math.sqrt(dx*dx + dy*dy + dz*dz);
        }
        
        // Calcular distância média
        const avgDistance = totalDistance / landmarks1.length;
        
        // Converter distância em pontuação de similaridade (0-1)
        // Quanto menor a distância, maior a similaridade
        return Math.max(0, 1 - (avgDistance / 0.5));
    }
    
    // Método para recarregar gestos (chamado quando novos gestos são adicionados)
    reloadGestures() {
        this.loadGestures();
    }
}

// Inicializar o reconhecedor de gestos quando o documento estiver carregado
document.addEventListener('DOMContentLoaded', () => {
    window.gestureRecognizer = new GestureRecognizer();
});