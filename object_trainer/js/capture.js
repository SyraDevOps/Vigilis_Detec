class ImageCapture {
    constructor() {
        this.video = document.getElementById('capture-video');
        this.canvas = document.getElementById('capture-canvas');
        this.ctx = this.canvas.getContext('2d');
        
        this.captureBtn = document.getElementById('capture-btn');
        this.objectNameInput = document.getElementById('object-name');
        this.objectSamplesGrid = document.getElementById('object-samples');
        this.backgroundSamplesGrid = document.getElementById('background-samples');
        
        this.classBtns = document.querySelectorAll('.class-btn');
        this.currentClass = 'object'; // 'object' ou 'background'
        
        this.objectSamples = [];
        this.backgroundSamples = [];
        
        this.stream = null;
        
        this.init();
    }
    
    async init() {
        // Inicializar a câmera
        try {
            this.stream = await navigator.mediaDevices.getUserMedia({ 
                video: { 
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    facingMode: 'environment' // Usar câmera traseira se disponível
                } 
            });
            this.video.srcObject = this.stream;
            
            // Ajustar o tamanho do canvas para corresponder ao vídeo
            this.video.addEventListener('loadedmetadata', () => {
                this.canvas.width = this.video.videoWidth;
                this.canvas.height = this.video.videoHeight;
            });
            
        } catch (err) {
            console.error('Erro ao acessar câmera:', err);
            alert('Não foi possível acessar a câmera. Verifique se você concedeu permissão.');
        }
        
        // Configurar eventos
        this.captureBtn.addEventListener('click', () => this.captureImage());
        
        this.classBtns.forEach(btn => {
            btn.addEventListener('click', () => this.changeClass(btn.dataset.class));
        });
        
        // Atualizar contagem de amostras
        this.updateSampleCount();
    }
    
    captureImage() {
        const objectName = this.objectNameInput.value.trim();
        
        if (!objectName) {
            alert('Por favor, digite um nome para o objeto.');
            return;
        }
        
        // Desenhar frame atual no canvas
        this.ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
        
        // Obter dados da imagem
        const imageData = this.canvas.toDataURL('image/jpeg', 0.8);
        
        // Adicionar à classe atual
        if (this.currentClass === 'object') {
            this.addObjectSample(imageData);
        } else {
            this.addBackgroundSample(imageData);
        }
        
        // Atualizar contagem
        this.updateSampleCount();
        
        // Efeito visual de captura
        this.showCaptureEffect();
    }
    
    addObjectSample(imageData) {
        const sampleId = `object-${Date.now()}`;
        this.objectSamples.push({
            id: sampleId,
            data: imageData
        });
        
        // Limpar mensagem de "vazio" se existir
        if (this.objectSamplesGrid.querySelector('.empty-state')) {
            this.objectSamplesGrid.innerHTML = '';
        }
        
        // Criar elemento da amostra
        const sampleElement = document.createElement('div');
        sampleElement.className = 'sample-item';
        sampleElement.id = sampleId;
        sampleElement.innerHTML = `
            <img src="${imageData}" alt="Amostra do objeto">
            <button class="sample-delete" data-id="${sampleId}">×</button>
        `;
        
        // Adicionar à grid
        this.objectSamplesGrid.appendChild(sampleElement);
        
        // Configurar evento de exclusão
        sampleElement.querySelector('.sample-delete').addEventListener('click', () => {
            this.deleteSample(sampleId, 'object');
        });
    }
    
    addBackgroundSample(imageData) {
        const sampleId = `bg-${Date.now()}`;
        this.backgroundSamples.push({
            id: sampleId,
            data: imageData
        });
        
        // Limpar mensagem de "vazio" se existir
        if (this.backgroundSamplesGrid.querySelector('.empty-state')) {
            this.backgroundSamplesGrid.innerHTML = '';
        }
        
        // Criar elemento da amostra
        const sampleElement = document.createElement('div');
        sampleElement.className = 'sample-item';
        sampleElement.id = sampleId;
        sampleElement.innerHTML = `
            <img src="${imageData}" alt="Amostra do fundo">
            <button class="sample-delete" data-id="${sampleId}">×</button>
        `;
        
        // Adicionar à grid
        this.backgroundSamplesGrid.appendChild(sampleElement);
        
        // Configurar evento de exclusão
        sampleElement.querySelector('.sample-delete').addEventListener('click', () => {
            this.deleteSample(sampleId, 'background');
        });
    }
    
    deleteSample(sampleId, sampleType) {
        // Remover elemento da UI
        document.getElementById(sampleId).remove();
        
        // Remover dados da amostra
        if (sampleType === 'object') {
            this.objectSamples = this.objectSamples.filter(sample => sample.id !== sampleId);
            
            // Mostrar mensagem de "vazio" se não houver mais amostras
            if (this.objectSamples.length === 0) {
                this.objectSamplesGrid.innerHTML = '<div class="empty-state">Nenhuma amostra do objeto capturada</div>';
            }
        } else {
            this.backgroundSamples = this.backgroundSamples.filter(sample => sample.id !== sampleId);
            
            // Mostrar mensagem de "vazio" se não houver mais amostras
            if (this.backgroundSamples.length === 0) {
                this.backgroundSamplesGrid.innerHTML = '<div class="empty-state">Nenhuma amostra do fundo capturada</div>';
            }
        }
        
        // Atualizar contagem
        this.updateSampleCount();
    }
    
    changeClass(className) {
        this.currentClass = className;
        
        // Atualizar botões
        this.classBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.class === className);
        });
        
        // Mostrar grid correspondente
        if (className === 'object') {
            this.objectSamplesGrid.classList.remove('hidden');
            this.backgroundSamplesGrid.classList.add('hidden');
        } else {
            this.objectSamplesGrid.classList.add('hidden');
            this.backgroundSamplesGrid.classList.remove('hidden');
        }
    }
    
    updateSampleCount() {
        // Atualizar contador no botão de captura
        const captureCount = document.querySelector('.capture-count');
        captureCount.textContent = `${this.objectSamples.length} objeto / ${this.backgroundSamples.length} fundo`;
        
        // Atualizar contagem na aba de treinamento
        const trainingSamplesCount = document.getElementById('training-samples-count');
        if (trainingSamplesCount) {
            trainingSamplesCount.textContent = `${this.objectSamples.length} objeto / ${this.backgroundSamples.length} fundo`;
        }
        
        // Atualizar nome do objeto na aba de treinamento
        const trainingObjectName = document.getElementById('training-object-name');
        if (trainingObjectName) {
            const objectName = this.objectNameInput.value.trim();
            trainingObjectName.textContent = objectName || 'Não definido';
        }
    }
    
    showCaptureEffect() {
        // Flash branco
        const flashOverlay = document.createElement('div');
        flashOverlay.style.position = 'absolute';
        flashOverlay.style.top = '0';
        flashOverlay.style.left = '0';
        flashOverlay.style.width = '100%';
        flashOverlay.style.height = '100%';
        flashOverlay.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
        flashOverlay.style.pointerEvents = 'none';
        flashOverlay.style.zIndex = '100';
        flashOverlay.style.opacity = '1';
        flashOverlay.style.transition = 'opacity 0.3s';
        
        this.video.parentElement.appendChild(flashOverlay);
        
        // Remover após o efeito
        setTimeout(() => {
            flashOverlay.style.opacity = '0';
            setTimeout(() => flashOverlay.remove(), 300);
        }, 100);
    }
    
    // Método para acessar amostras do treinador
    getSamples() {
        return {
            objectName: this.objectNameInput.value.trim(),
            objectSamples: this.objectSamples,
            backgroundSamples: this.backgroundSamples
        };
    }
}