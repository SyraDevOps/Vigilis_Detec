class ObjectTracker {
    constructor() {
        this.video = document.getElementById('tracking-video');
        this.canvas = document.getElementById('tracking-canvas');
        this.ctx = this.canvas.getContext('2d');
        
        this.modelSelect = document.getElementById('model-select');
        this.loadModelBtn = document.getElementById('load-model-btn');
        this.trackingActive = document.getElementById('tracking-active');
        this.confidenceThreshold = document.getElementById('confidence-threshold');
        this.thresholdValue = document.getElementById('threshold-value');
        
        this.trackingObjectName = document.getElementById('tracking-object-name');
        this.trackingConfidence = document.getElementById('tracking-confidence');
        this.trackingPosition = document.getElementById('tracking-position');
        
        // Estado de rastreamento
        this.isTracking = false;
        this.loadedModelName = null;
        this.stream = null;
        this.animationFrame = null;
        
        // Modelo e classificador
        this.featureExtractor = null;
        this.classifier = null;
        
        // Inicializar
        this.init();
    }
    
    async init() {
        try {
            // Inicializar câmera
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
            
            // Inicializar os modelos
            console.log("Carregando MobileNet...");
            this.featureExtractor = await mobilenet.load();
            console.log("MobileNet carregado!");
            this.classifier = knnClassifier.create();
            console.log("KNN Classifier criado!");
            
            // Configurar eventos
            this.loadModelBtn.addEventListener('click', () => this.loadSelectedModel());
            this.trackingActive.addEventListener('change', () => this.toggleTracking());
            this.confidenceThreshold.addEventListener('input', () => {
                this.thresholdValue.textContent = this.confidenceThreshold.value;
            });
            
            // Ativar botão de carregamento
            this.loadModelBtn.disabled = false;
            
        } catch (error) {
            console.error('Erro na inicialização do rastreador:', error);
            alert(`Erro na inicialização: ${error.message}`);
        }
    }
    
    async loadSelectedModel() {
        const modelId = this.modelSelect.value;
        
        if (!modelId) {
            alert('Selecione um modelo para carregar');
            return;
        }
        
        try {
            this.loadModelBtn.disabled = true;
            
            // Carregar modelo do armazenamento
            const modelInfo = await window.modelStorage.getModelById(modelId);
            
            if (!modelInfo) {
                throw new Error('Modelo não encontrado');
            }
            
            console.log("Carregando modelo:", modelInfo.name);
            console.log("Dados do modelo:", modelInfo);
            
            // Resetar o classificador
            this.classifier.clearAllClasses();
            
            try {
                // Carregar os dados do modelo
                const serializedDataset = JSON.parse(modelInfo.data);
                console.log("Dataset serializado:", serializedDataset);
                
                // Reconstruir tensores a partir dos dados serializados
                const dataset = {};
                Object.keys(serializedDataset).forEach((key) => {
                    const { data, shape } = serializedDataset[key];
                    dataset[key] = tf.tensor(data, shape);
                });
                
                // Definir o dataset no classificador
                this.classifier.setClassifierDataset(dataset);
                this.loadedModelName = modelInfo.name;
                
                // Atualizar UI
                this.trackingObjectName.textContent = modelInfo.name;
                
                // Se o tracking estiver ativado, iniciar o loop
                if (this.trackingActive.checked && !this.isTracking) {
                    this.startTracking();
                }
                
                console.log("Modelo carregado com sucesso!");
                alert(`Modelo "${modelInfo.name}" carregado com sucesso!`);
                
            } catch (parseError) {
                console.error("Erro ao processar dados do modelo:", parseError);
                throw new Error(`Erro ao processar dados do modelo: ${parseError.message}`);
            }
            
        } catch (error) {
            console.error('Erro ao carregar modelo:', error);
            alert(`Erro ao carregar modelo: ${error.message}`);
        } finally {
            this.loadModelBtn.disabled = false;
        }
    }
    
    toggleTracking() {
        if (this.trackingActive.checked) {
            if (!this.loadedModelName) {
                alert('Carregue um modelo antes de iniciar o rastreamento');
                this.trackingActive.checked = false;
                return;
            }
            this.startTracking();
        } else {
            this.stopTracking();
        }
    }
    
    startTracking() {
        if (this.isTracking) return;
        
        console.log("Iniciando rastreamento para:", this.loadedModelName);
        this.isTracking = true;
        this.trackFrame();
    }
    
    stopTracking() {
        if (!this.isTracking) return;
        
        this.isTracking = false;
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
        
        // Limpar canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Resetar informações
        this.trackingConfidence.textContent = '-';
        this.trackingPosition.textContent = '-';
    }
    
    async trackFrame() {
        if (!this.isTracking) return;
        
        try {
            // Verificar se o vídeo está pronto
            if (this.video.readyState < 2) {
                this.animationFrame = requestAnimationFrame(() => this.trackFrame());
                return;
            }
            
            // Extrair features do frame atual
            const features = this.featureExtractor.infer(this.video, true);
            
            // Classificar usando KNN
            const result = await this.classifier.predictClass(features);
            console.log("Resultado da predição:", result);
            
            // Obter limiar de confiança configurado
            const threshold = parseFloat(this.confidenceThreshold.value);
            
            // Limpar canvas
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            
            // Verificar se é o objeto com confiança suficiente
            if (result.label === 'object' && result.confidences[result.label] >= threshold) {
                // Calcular posição aproximada (centro da tela por enquanto)
                const x = this.canvas.width / 2;
                const y = this.canvas.height / 2;
                
                // Desenhar retângulo ao redor do objeto
                const boxSize = Math.min(this.canvas.width, this.canvas.height) * 0.3;
                this.ctx.strokeStyle = '#2ecc71';
                this.ctx.lineWidth = 4;
                this.ctx.strokeRect(
                    x - boxSize/2, 
                    y - boxSize/2, 
                    boxSize, 
                    boxSize
                );
                
                // Desenhar rótulo
                this.ctx.fillStyle = 'rgba(46, 204, 113, 0.8)';
                this.ctx.fillRect(
                    x - boxSize/2, 
                    y - boxSize/2 - 30,
                    boxSize,
                    30
                );
                
                this.ctx.font = '16px Arial';
                this.ctx.fillStyle = 'white';
                this.ctx.textAlign = 'center';
                this.ctx.fillText(
                    `${this.loadedModelName} (${Math.round(result.confidences[result.label] * 100)}%)`,
                    x,
                    y - boxSize/2 - 10
                );
                
                // Atualizar informações
                this.trackingConfidence.textContent = `${(result.confidences[result.label] * 100).toFixed(1)}%`;
                this.trackingPosition.textContent = `x: ${Math.round(x)}, y: ${Math.round(y)}`;
            } else {
                // Sem detecção
                this.trackingConfidence.textContent = result.label === 'object' ? 
                    `${(result.confidences[result.label] * 100).toFixed(1)}% (abaixo do limiar)` : 
                    'Não detectado';
                this.trackingPosition.textContent = '-';
            }
            
        } catch (error) {
            console.error('Erro no rastreamento:', error);
        }
        
        // Continuar o loop
        this.animationFrame = requestAnimationFrame(() => this.trackFrame());
    }
}