// Gerenciamento de gravação de gestos

class GestureRecorder {
    constructor() {
        this.isRecording = false;
        this.recordingFrames = [];
        this.recordingTimeout = null;
        this.recordingDuration = 3000; // 3 segundos de gravação
        this.recordingInterval = null; // Novo: Intervalo para verificação periódica
        this.frameCheckFrequency = 100; // Verificar a cada 100ms
        
        // Elementos da interface
        this.startRecordingBtn = document.getElementById('start-recording');
        this.cancelRecordingBtn = document.getElementById('cancel-recording');
        this.gestureNameInput = document.getElementById('gesture-name');
        this.recordingStatusText = document.getElementById('recording-status-text');
        this.statusIndicator = document.querySelector('.status-indicator');
        
        // Gerenciamento de abas
        this.tabs = document.querySelectorAll('.tab-btn');
        this.tabContents = document.querySelectorAll('.tab-content');
        
        this.init();
    }
    
    init() {
        // Configurar eventos da interface
        this.startRecordingBtn.addEventListener('click', () => this.startRecording());
        this.cancelRecordingBtn.addEventListener('click', () => this.cancelRecording());
        
        // Configurar eventos das abas
        this.tabs.forEach(tab => {
            tab.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });
        
        // Carregar gestos salvos
        this.loadGestures();
    }
    
    startRecording() {
        // Verificar se nome do gesto está preenchido
        const gestureName = this.gestureNameInput.value.trim();
        if (!gestureName) {
            alert('Por favor, digite um nome para o gesto.');
            return;
        }
        
        // Verificar se já existe um gesto com este nome
        const gestures = this.loadGesturesFromStorage();
        if (gestures.find(g => g.name.toLowerCase() === gestureName.toLowerCase())) {
            alert(`Já existe um gesto chamado "${gestureName}". Por favor, escolha outro nome.`);
            return;
        }
        
        // Iniciar gravação
        this.isRecording = true;
        this.recordingFrames = [];
        this.startRecordingBtn.disabled = true;
        this.cancelRecordingBtn.disabled = false;
        this.gestureNameInput.disabled = true;
        
        // Atualizar status
        this.recordingStatusText.textContent = 'Gravando...';
        this.statusIndicator.classList.add('recording');
        
        // NOVO: Verificar periódicamente se estamos recebendo frames
        this.recordingInterval = setInterval(() => {
            // Capturar o frame atual diretamente do handTracker se disponível
            if (window.handTracker && window.handTracker.currentHandLandmarks) {
                this.addRecordingFrame(window.handTracker.currentHandLandmarks);
            }
            
            // Atualizar status de progresso
            const framesCollected = this.recordingFrames.length;
            this.recordingStatusText.textContent = `Gravando... (${framesCollected} frames)`;
        }, this.frameCheckFrequency);
        
        // Configurar temporizador para finalizar a gravação
        this.recordingTimeout = setTimeout(() => {
            this.finishRecording();
        }, this.recordingDuration);
    }
    
    cancelRecording() {
        // Cancelar gravação
        this.isRecording = false;
        this.recordingFrames = [];
        this.startRecordingBtn.disabled = false;
        this.cancelRecordingBtn.disabled = true;
        this.gestureNameInput.disabled = false;
        
        // Atualizar status
        this.recordingStatusText.textContent = 'Pronto para gravar';
        this.statusIndicator.classList.remove('recording');
        
        // Limpar temporizadores
        if (this.recordingTimeout) {
            clearTimeout(this.recordingTimeout);
            this.recordingTimeout = null;
        }
        
        // NOVO: Limpar intervalo de verificação
        if (this.recordingInterval) {
            clearInterval(this.recordingInterval);
            this.recordingInterval = null;
        }
    }
    
    finishRecording() {
        // MODIFICADO: Reduzir o mínimo de frames necessários
        if (this.recordingFrames.length < 5) {
            alert('Não foi possível detectar a mão durante a gravação. Tente novamente e certifique-se que sua mão está visível na câmera.');
            this.cancelRecording();
            return;
        }
        
        // NOVO: Limpar intervalo de verificação
        if (this.recordingInterval) {
            clearInterval(this.recordingInterval);
            this.recordingInterval = null;
        }
        
        // Salvar o gesto
        const gestureName = this.gestureNameInput.value.trim();
        const gestureData = {
            name: gestureName,
            frames: this.recordingFrames,
            createdAt: new Date().toISOString()
        };
        
        // Adicionar à lista de gestos
        this.saveGesture(gestureData);
        
        // Resetar interface
        this.cancelRecording();
        this.gestureNameInput.value = '';
        this.recordingStatusText.textContent = 'Gesto salvo com sucesso!';
        
        // Recarregar lista de gestos
        this.loadGestures();
        
        // Mudar para a aba de biblioteca após salvar
        setTimeout(() => {
            this.switchTab('library');
        }, 1000);
        
        // NOVO: Notificar o reconhecedor para recarregar os gestos
        if (window.gestureRecognizer) {
            window.gestureRecognizer.reloadGestures();
        }
    }
    
    // Adicionar um frame à gravação atual
    addRecordingFrame(handLandmarks) {
        if (this.isRecording && handLandmarks) {
            try {
                // NOVO: Verificar se já temos um frame muito similar para evitar duplicações
                const normalizedLandmarks = this.normalizeHandLandmarks(handLandmarks);
                
                // Só adicionamos se for diferente o suficiente do último frame gravado
                if (this.recordingFrames.length === 0 || 
                    !this.isSimilarToLastFrame(normalizedLandmarks)) {
                    this.recordingFrames.push(normalizedLandmarks);
                }
            } catch (error) {
                console.error("Erro ao adicionar frame:", error);
            }
        }
    }
    
    // NOVO: Verificar se um novo frame é muito similar ao último gravado
    isSimilarToLastFrame(normalizedLandmarks) {
        if (this.recordingFrames.length === 0) return false;
        
        const lastFrame = this.recordingFrames[this.recordingFrames.length - 1];
        let totalDistance = 0;
        
        for (let i = 0; i < normalizedLandmarks.length; i++) {
            const dx = normalizedLandmarks[i].x - lastFrame[i].x;
            const dy = normalizedLandmarks[i].y - lastFrame[i].y;
            const dz = normalizedLandmarks[i].z - lastFrame[i].z;
            
            totalDistance += Math.sqrt(dx*dx + dy*dy + dz*dz);
        }
        
        const avgDistance = totalDistance / normalizedLandmarks.length;
        // Se a distância média for menor que 0.01, consideramos muito similar
        return avgDistance < 0.01;
    }
    
    // Normalizar landmarks para torná-los independentes da posição/escala
    normalizeHandLandmarks(landmarks) {
        try {
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
        } catch (error) {
            console.error("Erro na normalização dos landmarks:", error);
            return null;
        }
    }
    
    // Salvar gesto no armazenamento local
    saveGesture(gestureData) {
        const gestures = this.loadGesturesFromStorage();
        gestures.push(gestureData);
        localStorage.setItem('handGestures', JSON.stringify(gestures));
    }
    
    // Carregar gestos do armazenamento local
    loadGesturesFromStorage() {
        const storedGestures = localStorage.getItem('handGestures');
        return storedGestures ? JSON.parse(storedGestures) : [];
    }
    
    // Carregar e exibir gestos na interface
    loadGestures() {
        const gestures = this.loadGesturesFromStorage();
        const gestureList = document.getElementById('gesture-list');
        
        // Limpar lista atual
        gestureList.innerHTML = '';
        
        if (gestures.length === 0) {
            gestureList.innerHTML = '<div class="empty-state">Nenhum gesto cadastrado</div>';
            return;
        }
        
        // Adicionar cada gesto à lista
        gestures.forEach((gesture, index) => {
            const gestureCard = document.createElement('div');
            gestureCard.className = 'gesture-card';
            gestureCard.innerHTML = `
                <h4>${gesture.name}</h4>
                <div class="gesture-thumbnail">
                    <svg width="50" height="50" viewBox="0 0 100 100">
                        <path d="M20,50 C20,30 40,20 50,20 C60,20 80,30 80,50 C80,70 60,80 50,80 C40,80 20,70 20,50 Z" 
                            fill="none" stroke="#3498db" stroke-width="2" />
                    </svg>
                </div>
                <div class="gesture-actions">
                    <button class="gesture-btn delete" data-index="${index}" title="Excluir">
                        <i>🗑️</i>
                    </button>
                </div>
            `;
            
            // Adicionar evento para excluir gesto
            gestureList.appendChild(gestureCard);
            gestureCard.querySelector('.delete').addEventListener('click', () => {
                this.deleteGesture(index);
            });
        });
    }
    
    // Excluir um gesto
    deleteGesture(index) {
        if (confirm('Tem certeza que deseja excluir este gesto?')) {
            const gestures = this.loadGesturesFromStorage();
            gestures.splice(index, 1);
            localStorage.setItem('handGestures', JSON.stringify(gestures));
            this.loadGestures();
            
            // Notificar o reconhecedor para recarregar os gestos
            if (window.gestureRecognizer) {
                window.gestureRecognizer.reloadGestures();
            }
        }
    }
    
    // Alternar entre abas
    switchTab(tabId) {
        this.tabs.forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabId);
        });
        
        this.tabContents.forEach(content => {
            const isTargetTab = content.id === `${tabId}-tab`;
            content.classList.toggle('active', isTargetTab);
        });
    }
}

// Inicializar o gravador de gestos quando o documento estiver carregado
document.addEventListener('DOMContentLoaded', () => {
    window.gestureRecorder = new GestureRecorder();
});