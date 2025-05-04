class ObjectTrainer {
    constructor() {
        this.startTrainingBtn = document.getElementById('start-training-btn');
        this.trainingEpochs = document.getElementById('training-epochs');
        this.progressBar = document.getElementById('training-progress-bar');
        this.progressText = document.getElementById('training-progress-text');
        this.trainingStatus = document.getElementById('training-status');
        
        this.modelsList = document.getElementById('models-list');
        
        // Modelo MobileNet como extrator de características
        this.featureExtractor = null;
        this.classifier = null;
        
        this.init();
    }
    
    async init() {
        this.startTrainingBtn.addEventListener('click', () => this.startTraining());
        
        try {
            // Inicializar KNN classifier
            this.classifier = knnClassifier.create();
            
            // Carregar modelo MobileNet
            this.trainingStatus.textContent = "Carregando modelo base...";
            this.featureExtractor = await mobilenet.load();
            this.trainingStatus.textContent = "Modelo base carregado";
            this.startTrainingBtn.disabled = false;
            
        } catch (error) {
            console.error('Erro ao carregar modelo:', error);
            this.trainingStatus.textContent = "Erro ao carregar modelo";
        }
    }
    
    async startTraining() {
        // Obter amostras do capturador
        if (!window.imageCapture) {
            alert('Erro ao acessar o módulo de captura');
            return;
        }
        
        const samples = window.imageCapture.getSamples();
        
        if (samples.objectSamples.length < 10 || samples.backgroundSamples.length < 10) {
            alert('É necessário pelo menos 10 amostras do objeto e 10 do fundo');
            return;
        }
        
        if (!samples.objectName) {
            alert('Digite um nome para o objeto');
            return;
        }
        
        // Configurar treinamento
        const epochs = parseInt(this.trainingEpochs.value) || 10;
        
        // Desabilitar botão durante treinamento
        this.startTrainingBtn.disabled = true;
        
        // Inicializar progresso
        this.progressBar.style.width = '0%';
        this.progressText.textContent = '0%';
        this.trainingStatus.textContent = 'Processando amostras...';
        
        // Processar amostras
        await this.processImages(samples, epochs);
    }
    
    async processImages(samples, epochs) {
        try {
            // Resetar classifier
            this.classifier.clearAllClasses();
            
            // Número total de amostras
            const totalSamples = samples.objectSamples.length + samples.backgroundSamples.length;
            let processed = 0;
            
            // Processar amostras do objeto
            this.trainingStatus.textContent = 'Extraindo características das amostras do objeto...';
            for (const sample of samples.objectSamples) {
                await this.processSample(sample.data, 'object');
                processed++;
                this.updateProgress(processed / totalSamples * 50); // 50% do progresso para processamento
            }
            
            // Processar amostras do fundo
            this.trainingStatus.textContent = 'Extraindo características das amostras do fundo...';
            for (const sample of samples.backgroundSamples) {
                await this.processSample(sample.data, 'background');
                processed++;
                this.updateProgress(50 + processed / totalSamples * 25); // 75% do progresso para processamento
            }
            
            // Treinamento com épocas
            this.trainingStatus.textContent = 'Treinando modelo...';
            for (let epoch = 0; epoch < epochs; epoch++) {
                // Simular uma época de treinamento (o KNN não precisa de training epochs de verdade)
                await new Promise(resolve => setTimeout(resolve, 100));
                
                const progress = 75 + (epoch + 1) / epochs * 25;
                this.updateProgress(progress);
            }
            
            // Treino concluído
            this.trainingStatus.textContent = 'Treinamento concluído!';
            this.updateProgress(100);
            
            // Salvar modelo
            await this.saveModel(samples.objectName);
            
            setTimeout(() => {
                this.startTrainingBtn.disabled = false;
            }, 1000);
            
        } catch (error) {
            console.error('Erro no treinamento:', error);
            this.trainingStatus.textContent = `Erro no treinamento: ${error.message}`;
            this.startTrainingBtn.disabled = false;
        }
    }
    
    async processSample(imageData, className) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = async () => {
                try {
                    // Extrair features usando MobileNet
                    const features = this.featureExtractor.infer(img, true);
                    
                    // Adicionar exemplo ao classificador
                    this.classifier.addExample(features, className);
                    resolve();
                } catch (error) {
                    reject(error);
                }
            };
            img.onerror = () => reject(new Error('Falha ao carregar imagem'));
            img.src = imageData;
        });
    }
    
    updateProgress(percent) {
        const roundedPercent = Math.round(percent);
        this.progressBar.style.width = `${roundedPercent}%`;
        this.progressText.textContent = `${roundedPercent}%`;
    }
    
    async saveModel(objectName) {
        try {
            // Verificar se há exemplos suficientes
            if (this.classifier.getNumClasses() <= 0) {
                throw new Error('Nenhuma classe no classificador');
            }
            
            // Serializar o modelo
            const dataset = this.classifier.getClassifierDataset();
            
            // Verificar se dataset está definido
            if (!dataset) {
                throw new Error('Dataset vazio ou indefinido');
            }
            
            // Log para debug
            console.log("Dataset a ser salvo:", dataset);
            
            // Converter tensores para arrays para serialização segura
            const serializedDataset = {};
            Object.keys(dataset).forEach((key) => {
                const tensorData = dataset[key];
                serializedDataset[key] = {
                    data: Array.from(tensorData.dataSync()),
                    shape: tensorData.shape
                };
            });
            
            // Criar objeto do modelo com dados serializados
            const modelInfo = {
                id: Date.now().toString(), // Usar string para ID
                name: objectName,
                date: new Date().toISOString(),
                data: JSON.stringify(serializedDataset),
                sampleCounts: {
                    object: this.classifier.getClassExampleCount()['object'] || 0,
                    background: this.classifier.getClassExampleCount()['background'] || 0
                }
            };
            
            console.log("Modelo serializado:", modelInfo);
            
            // Salvar no armazenamento
            if (window.modelStorage) {
                await window.modelStorage.saveModel(modelInfo);
                
                // Atualizar lista de modelos
                window.modelStorage.loadModels();
                
                this.trainingStatus.textContent = `Modelo para "${objectName}" salvo com sucesso!`;
            } else {
                throw new Error('Módulo de armazenamento de modelos não disponível');
            }
            
        } catch (error) {
            console.error('Erro ao salvar modelo:', error);
            this.trainingStatus.textContent = `Erro ao salvar modelo: ${error.message}`;
        }
    }
}