// Configuração inicial para rastreamento de mãos com MediaPipe

class HandTracker {
    constructor() {
        this.videoElement = document.getElementById('video');
        this.canvasElement = document.getElementById('handCanvas');
        this.canvasContext = this.canvasElement.getContext('2d');
        this.recognitionResult = document.getElementById('recognition-result');
        
        // Configurações do usuário
        this.showLandmarks = document.getElementById('show-landmarks').checked;
        this.showConnections = document.getElementById('show-connections').checked;
        this.detectionConfidence = parseFloat(document.getElementById('detection-confidence').value);
        
        // Rastreamento de mãos
        this.hands = null;
        this.camera = null;
        
        // Variável para armazenar os pontos da mão
        this.currentHandLandmarks = null;
        
        // Inicializar
        this.init();
        this.setupEventListeners();
    }
    
    init() {
        // Inicializar o MediaPipe Hands
        this.hands = new Hands({
            locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
            }
        });
        
        // Configurar as opções do MediaPipe Hands
        this.hands.setOptions({
            maxNumHands: 1,  // Começamos rastreando apenas uma mão para simplificar
            modelComplexity: 1,
            minDetectionConfidence: this.detectionConfidence,
            minTrackingConfidence: this.detectionConfidence
        });
        
        // Configurar o callback para resultados
        this.hands.onResults((results) => this.onHandResults(results));
        
        // Inicializar a câmera
        this.camera = new Camera(this.videoElement, {
            onFrame: async () => {
                await this.hands.send({image: this.videoElement});
            },
            width: 640,
            height: 480
        });
        
        this.camera.start();
        
        // Ajustar o tamanho do canvas para corresponder ao contêiner
        this.resizeCanvas();
    }
    
    onHandResults(results) {
        // Limpar o canvas
        this.canvasContext.save();
        this.canvasContext.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);
        
        // Desenhar o feed da câmera no canvas
        this.canvasContext.drawImage(
            results.image, 0, 0, this.canvasElement.width, this.canvasElement.height);
        
        // Armazenar os landmarks da mão para uso no reconhecimento de gestos
        this.currentHandLandmarks = results.multiHandLandmarks && results.multiHandLandmarks.length > 0 
            ? results.multiHandLandmarks[0] 
            : null;
            
        // Se detectou mãos, desenhar os landmarks e conexões
        if (results.multiHandLandmarks) {
            for (const landmarks of results.multiHandLandmarks) {
                // Desenhar conexões entre os landmarks
                if (this.showConnections) {
                    drawConnectors(
                        this.canvasContext, landmarks, HAND_CONNECTIONS,
                        {color: '#00FF00', lineWidth: 2}
                    );
                }
                
                // Desenhar os landmarks
                if (this.showLandmarks) {
                    drawLandmarks(
                        this.canvasContext, landmarks,
                        {color: '#FF0000', lineWidth: 1, radius: 3}
                    );
                }
            }
        }
        
        this.canvasContext.restore();
        
        // Durante a gravação, enviar landmarks diretamente para o gravador
        if (window.gestureRecorder && window.gestureRecorder.isRecording && this.currentHandLandmarks) {
            window.gestureRecorder.addRecordingFrame(this.currentHandLandmarks);
        }
        
        // Notificar o reconhecedor de gestos sobre novos dados
        if (window.gestureRecognizer && this.currentHandLandmarks) {
            window.gestureRecognizer.processHandLandmarks(this.currentHandLandmarks);
        }
    }
    
    resizeCanvas() {
        const container = this.canvasElement.parentElement;
        this.canvasElement.width = container.clientWidth;
        this.canvasElement.height = container.clientHeight;
    }
    
    setupEventListeners() {
        // Atualizar configurações quando alteradas pelo usuário
        document.getElementById('show-landmarks').addEventListener('change', (e) => {
            this.showLandmarks = e.target.checked;
        });
        
        document.getElementById('show-connections').addEventListener('change', (e) => {
            this.showConnections = e.target.checked;
        });
        
        document.getElementById('detection-confidence').addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            document.getElementById('confidence-value').textContent = value.toFixed(1);
            this.detectionConfidence = value;
            
            // Atualizar a configuração do MediaPipe Hands
            if (this.hands) {
                this.hands.setOptions({
                    minDetectionConfidence: this.detectionConfidence,
                    minTrackingConfidence: this.detectionConfidence
                });
            }
        });
        
        // Redimensionar o canvas quando a janela for redimensionada
        window.addEventListener('resize', () => this.resizeCanvas());
    }
    
    // Método para exibir o resultado de reconhecimento
    showRecognition(gestureName) {
        this.recognitionResult.textContent = gestureName;
        this.recognitionResult.classList.add('show');
        
        // Ocultar após 2 segundos
        setTimeout(() => {
            this.recognitionResult.classList.remove('show');
        }, 2000);
    }
}

// Inicializar o rastreador de mãos quando o documento estiver carregado
document.addEventListener('DOMContentLoaded', () => {
    window.handTracker = new HandTracker();
});