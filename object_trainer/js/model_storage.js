class ModelStorage {
    constructor() {
        this.models = [];
        this.modelSelect = document.getElementById('model-select');
        this.modelsList = document.getElementById('models-list');
        this.storageUsage = document.getElementById('storage-usage');
        
        // Novos elementos
        this.exportAllBtn = document.getElementById('export-all-models');
        this.importModelBtn = document.getElementById('import-model-btn');
        this.importModelInput = document.getElementById('import-model-input');
        this.clearAllModelsBtn = document.getElementById('clear-all-models');
        
        // Carregar modelos salvos
        this.loadModels();
        
        // Gerenciar abas
        this.tabButtons = document.querySelectorAll('.tab-btn');
        this.tabContents = document.querySelectorAll('.tab-content');
        
        this.setupTabs();
        this.setupEventListeners();
    }
    
    setupTabs() {
        this.tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const tabId = button.dataset.tab;
                this.switchTab(tabId);
                
                // Se alternar para a aba de treinamento, atualizar informações
                if (tabId === 'train' && window.imageCapture) {
                    const samples = window.imageCapture.getSamples();
                    const trainingObjectName = document.getElementById('training-object-name');
                    const trainingSamplesCount = document.getElementById('training-samples-count');
                    
                    trainingObjectName.textContent = samples.objectName || 'Não definido';
                    trainingSamplesCount.textContent = `${samples.objectSamples.length} objeto / ${samples.backgroundSamples.length} fundo`;
                }
                
                // Se alternar para a aba de rastreamento, garantir que os modelos estejam carregados
                if (tabId === 'track') {
                    this.loadModelOptions();
                }
            });
        });
    }
    
    setupEventListeners() {
        // Exportar todos os modelos
        if (this.exportAllBtn) {
            this.exportAllBtn.addEventListener('click', () => this.exportAllModels());
        }
        
        // Importar modelo
        if (this.importModelBtn) {
            this.importModelBtn.addEventListener('click', () => this.importModelInput.click());
        }
        
        if (this.importModelInput) {
            this.importModelInput.addEventListener('change', (e) => this.importModel(e));
        }
        
        // Limpar todos os modelos
        if (this.clearAllModelsBtn) {
            this.clearAllModelsBtn.addEventListener('click', () => this.confirmClearAllModels());
        }
    }
    
    switchTab(tabId) {
        this.tabButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabId);
        });
        
        this.tabContents.forEach(content => {
            const isTarget = content.id === `${tabId}-tab`;
            content.classList.toggle('active', isTarget);
        });
    }
    
    loadModelOptions() {
        // Limpar opções atuais
        this.modelSelect.innerHTML = '<option value="">Selecione um modelo treinado</option>';
        
        // Adicionar modelos disponíveis
        this.models.forEach(model => {
            const option = document.createElement('option');
            option.value = model.id;
            option.textContent = `${model.name} (${this.formatDate(model.date)})`;
            this.modelSelect.appendChild(option);
        });
    }
    
    loadModels() {
        try {
            // Carregar do localStorage
            const storedModels = localStorage.getItem('object_trainer_models');
            console.log("Modelos armazenados (bruto):", storedModels);
            
            if (storedModels) {
                try {
                    this.models = JSON.parse(storedModels);
                    console.log("Modelos carregados:", this.models);
                } catch (parseError) {
                    console.error("Erro ao analisar modelos salvos:", parseError);
                    this.models = [];
                    // Limpar os dados inválidos
                    localStorage.removeItem('object_trainer_models');
                }
            } else {
                console.log("Nenhum modelo encontrado no localStorage");
                this.models = [];
            }
            
            // Atualizar UI na lista de modelos
            this.updateModelsList();
            
            // Atualizar seletor de modelos
            this.loadModelOptions();
            
            // Atualizar informações de armazenamento
            this.updateStorageInfo();
            
        } catch (error) {
            console.error('Erro ao carregar modelos:', error);
            this.models = [];
        }
    }
    
    updateModelsList() {
        if (!this.modelsList) return;
        
        // Limpar lista atual
        this.modelsList.innerHTML = '';
        
        if (this.models.length === 0) {
            this.modelsList.innerHTML = '<div class="empty-state">Nenhum modelo treinado</div>';
            return;
        }
        
        // Adicionar cada modelo à lista
        this.models.forEach(model => {
            const modelCard = document.createElement('div');
            modelCard.className = 'model-card';
            modelCard.innerHTML = `
                <h4>${model.name}</h4>
                <div class="model-stats">
                    <div>Data: ${this.formatDate(model.date)}</div>
                    <div>Amostras: ${model.sampleCounts.object} objeto / ${model.sampleCounts.background} fundo</div>
                </div>
                <div class="model-card-actions">
                    <div class="model-action-buttons">
                        <button class="action-btn small-btn load-btn" data-id="${model.id}" title="Carregar modelo">Carregar</button>
                        <a class="model-download-link" download="${model.name.replace(/\s+/g, '_')}.json">
                            <button class="action-btn small-btn export-btn" data-id="${model.id}" title="Exportar modelo">
                                Exportar
                            </button>
                        </a>
                    </div>
                    <button class="action-btn small-btn danger-btn delete-btn" data-id="${model.id}" title="Excluir modelo">
                        Excluir
                    </button>
                </div>
            `;
            
            // Adicionar à lista
            this.modelsList.appendChild(modelCard);
            
            // Configurar eventos
            modelCard.querySelector('.load-btn').addEventListener('click', () => {
                this.switchTab('track');
                setTimeout(() => {
                    this.modelSelect.value = model.id;
                    document.getElementById('load-model-btn').click();
                }, 100);
            });
            
            // Exportar modelo individual
            const exportBtn = modelCard.querySelector('.export-btn');
            const downloadLink = modelCard.querySelector('.model-download-link');
            
            exportBtn.addEventListener('click', (e) => {
                const blob = new Blob([JSON.stringify(model)], { type: 'application/json' });
                downloadLink.href = URL.createObjectURL(blob);
                // O download acontecerá automaticamente pelo atributo "download" do link
            });
            
            // Excluir modelo
            modelCard.querySelector('.delete-btn').addEventListener('click', () => {
                this.confirmDeleteModel(model);
            });
        });
    }
    
    formatDate(dateString) {
        const date = new Date(dateString);
        return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
    }
    
    async saveModel(modelInfo) {
        try {
            if (!modelInfo || !modelInfo.id) {
                throw new Error('Dados do modelo inválidos');
            }
            
            console.log("Salvando modelo:", modelInfo.name);
            
            // Verificar se já existe um modelo com o mesmo ID
            const existingIndex = this.models.findIndex(m => m.id === modelInfo.id);
            
            if (existingIndex >= 0) {
                // Atualizar modelo existente
                this.models[existingIndex] = modelInfo;
                console.log("Atualizando modelo existente:", modelInfo.id);
            } else {
                // Adicionar novo modelo
                this.models.push(modelInfo);
                console.log("Adicionando novo modelo:", modelInfo.id);
            }
            
            // Verificar se o modelo é muito grande para localStorage
            const serializedModels = JSON.stringify(this.models);
            const sizeInMB = new Blob([serializedModels]).size / (1024 * 1024);
            console.log(`Tamanho dos modelos serializados: ${sizeInMB.toFixed(2)} MB`);
            
            if (sizeInMB > 4) { // 4MB é um limite seguro para a maioria dos navegadores
                console.warn("Aviso: Os modelos armazenados estão se aproximando do limite de tamanho do localStorage");
                alert("Aviso: O armazenamento está ficando cheio.\nConsidere exportar e excluir modelos antigos.");
            }
            
            // Salvar no localStorage
            try {
                localStorage.setItem('object_trainer_models', serializedModels);
                console.log("Modelos salvos com sucesso!");
            } catch (storageError) {
                console.error("Erro ao salvar no localStorage:", storageError);
                
                if (storageError.name === 'QuotaExceededError' || 
                    storageError.toString().includes('exceeded') || 
                    storageError.toString().includes('quota')) {
                    
                    // Oferecer a opção de exportar o modelo antes de mostrar o erro
                    const shouldExport = confirm('O armazenamento do navegador está cheio. Deseja exportar o modelo para um arquivo antes de continuar?');
                    
                    if (shouldExport) {
                        this.exportModelById(modelInfo.id);
                    }
                    
                    alert('O modelo é muito grande para ser armazenado. Tente remover alguns modelos antigos.');
                    
                    // Remover o modelo que acabamos de adicionar para evitar estado inconsistente
                    if (existingIndex < 0) {
                        this.models.pop();
                    }
                } else {
                    throw storageError; // Propagar outros erros
                }
            }
            
            // Atualizar UI
            this.updateModelsList();
            this.loadModelOptions();
            this.updateStorageInfo();
            
        } catch (error) {
            console.error('Erro ao salvar modelo:', error);
            alert(`Erro ao salvar modelo: ${error.message}`);
            throw error;
        }
    }
    
    // Método para confirmar exclusão de modelo com diálogo
    confirmDeleteModel(model) {
        this.showConfirmDialog(
            'Excluir Modelo',
            `Tem certeza que deseja excluir o modelo "${model.name}"?`,
            () => this.deleteModel(model.id)
        );
    }
    
    // Método para confirmar limpeza de todos os modelos
    confirmClearAllModels() {
        this.showConfirmDialog(
            'Limpar Todos os Modelos',
            'Tem certeza que deseja excluir TODOS os modelos? Esta ação não pode ser desfeita.',
            () => this.clearAllModels()
        );
    }
    
    // Criar diálogo de confirmação
    showConfirmDialog(title, message, confirmCallback) {
        // Remover diálogo existente se houver
        const existingDialog = document.querySelector('.confirm-dialog');
        if (existingDialog) {
            existingDialog.remove();
        }
        
        // Criar elemento de diálogo
        const dialog = document.createElement('div');
        dialog.className = 'confirm-dialog';
        dialog.innerHTML = `
            <div class="confirm-dialog-content">
                <div class="confirm-dialog-header">${title}</div>
                <div class="confirm-dialog-message">${message}</div>
                <div class="confirm-dialog-buttons">
                    <button class="cancel-btn">Cancelar</button>
                    <button class="confirm-btn">Confirmar</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(dialog);
        
        // Configurar eventos
        dialog.querySelector('.cancel-btn').addEventListener('click', () => {
            dialog.remove();
        });
        
        dialog.querySelector('.confirm-btn').addEventListener('click', () => {
            confirmCallback();
            dialog.remove();
        });
    }
    
    deleteModel(modelId) {
        try {
            console.log("Excluindo modelo:", modelId);
            this.models = this.models.filter(model => model.id !== modelId);
            localStorage.setItem('object_trainer_models', JSON.stringify(this.models));
            
            // Atualizar UI
            this.updateModelsList();
            this.loadModelOptions();
            this.updateStorageInfo();
            
        } catch (error) {
            console.error('Erro ao excluir modelo:', error);
            alert(`Erro ao excluir modelo: ${error.message}`);
        }
    }
    
    clearAllModels() {
        try {
            this.models = [];
            localStorage.removeItem('object_trainer_models');
            
            // Atualizar UI
            this.updateModelsList();
            this.loadModelOptions();
            this.updateStorageInfo();
            
            alert('Todos os modelos foram excluídos');
            
        } catch (error) {
            console.error('Erro ao limpar modelos:', error);
            alert(`Erro ao limpar modelos: ${error.message}`);
        }
    }
    
    exportAllModels() {
        if (this.models.length === 0) {
            alert('Não há modelos para exportar');
            return;
        }
        
        try {
            const exportData = {
                version: '1.0',
                exportDate: new Date().toISOString(),
                models: this.models
            };
            
            const blob = new Blob([JSON.stringify(exportData)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const downloadLink = document.createElement('a');
            downloadLink.href = url;
            downloadLink.download = `object_models_export_${new Date().toISOString().slice(0,10)}.json`;
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
            
            // Limpar URL após o download
            setTimeout(() => {
                URL.revokeObjectURL(url);
            }, 1000);
            
        } catch (error) {
            console.error('Erro ao exportar modelos:', error);
            alert(`Erro ao exportar modelos: ${error.message}`);
        }
    }
    
    exportModelById(modelId) {
        const model = this.getModelById(modelId);
        
        if (!model) {
            alert(`Modelo com ID ${modelId} não encontrado`);
            return;
        }
        
        try {
            const blob = new Blob([JSON.stringify(model)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const downloadLink = document.createElement('a');
            downloadLink.href = url;
            downloadLink.download = `${model.name.replace(/\s+/g, '_')}.json`;
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
            
            setTimeout(() => {
                URL.revokeObjectURL(url);
            }, 1000);
            
        } catch (error) {
            console.error('Erro ao exportar modelo:', error);
            alert(`Erro ao exportar modelo: ${error.message}`);
        }
    }
    
    importModel(event) {
        const file = event.target.files[0];
        
        if (!file) {
            return;
        }
        
        const reader = new FileReader();
        
        reader.onload = (e) => {
            try {
                const importedData = JSON.parse(e.target.result);
                
                // Verificar se é um arquivo de exportação múltipla ou modelo único
                if (importedData.version && importedData.models) {
                    // Importação de múltiplos modelos
                    const importCount = this.importMultipleModels(importedData.models);
                    alert(`${importCount} modelo(s) importado(s) com sucesso`);
                } else {
                    // Importação de modelo único
                    this.importSingleModel(importedData);
                    alert(`Modelo "${importedData.name}" importado com sucesso`);
                }
                
                // Atualizar UI
                this.updateModelsList();
                this.loadModelOptions();
                this.updateStorageInfo();
                
            } catch (error) {
                console.error('Erro ao importar modelo:', error);
                alert(`Erro ao importar: ${error.message}`);
            }
        };
        
        reader.onerror = (error) => {
            console.error('Erro ao ler arquivo:', error);
            alert('Erro ao ler arquivo');
        };
        
        reader.readAsText(file);
        
        // Limpar o campo de arquivo para permitir importar o mesmo arquivo novamente
        event.target.value = '';
    }
    
    importSingleModel(modelData) {
        // Verificar se o modelo tem todas as propriedades necessárias
        if (!modelData.id || !modelData.name || !modelData.data) {
            throw new Error('Formato de modelo inválido');
        }
        
        // Verificar se já existe um modelo com o mesmo ID
        const existingIndex = this.models.findIndex(m => m.id === modelData.id);
        
        if (existingIndex >= 0) {
            // Perguntar se deve substituir
            const shouldReplace = confirm(`Já existe um modelo com o nome "${modelData.name}". Deseja substituí-lo?`);
            
            if (!shouldReplace) {
                return false;
            }
            
            // Substituir modelo existente
            this.models[existingIndex] = modelData;
        } else {
            // Adicionar novo modelo
            this.models.push(modelData);
        }
        
        // Salvar no localStorage
        localStorage.setItem('object_trainer_models', JSON.stringify(this.models));
        return true;
    }
    
    importMultipleModels(models) {
        if (!Array.isArray(models) || models.length === 0) {
            throw new Error('Nenhum modelo encontrado no arquivo');
        }
        
        let importCount = 0;
        
        models.forEach(model => {
            try {
                if (this.importSingleModel(model)) {
                    importCount++;
                }
            } catch (error) {
                console.error(`Erro ao importar modelo ${model.name}:`, error);
            }
        });
        
        return importCount;
    }
    
    getModelById(modelId) {
        console.log("Buscando modelo com ID:", modelId);
        console.log("Modelos disponíveis:", this.models);
        
        const model = this.models.find(model => model.id === modelId);
        
        if (!model) {
            console.warn(`Modelo com ID ${modelId} não encontrado`);
        } else {
            console.log("Modelo encontrado:", model.name);
        }
        
        return model;
    }
    
    updateStorageInfo() {
        if (this.storageUsage) {
            try {
                const serializedModels = JSON.stringify(this.models);
                const sizeInMB = new Blob([serializedModels]).size / (1024 * 1024);
                this.storageUsage.textContent = `Espaço utilizado: ${sizeInMB.toFixed(2)} MB`;
            } catch (error) {
                console.error('Erro ao calcular uso de armazenamento:', error);
                this.storageUsage.textContent = 'Espaço utilizado: Erro ao calcular';
            }
        }
    }
}

// Inicializar os componentes quando o documento estiver carregado
document.addEventListener('DOMContentLoaded', () => {
    window.modelStorage = new ModelStorage();
    window.imageCapture = new ImageCapture();
    window.objectTrainer = new ObjectTrainer();
    window.objectTracker = new ObjectTracker();
});