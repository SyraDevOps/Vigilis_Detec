# Vigilis - Toolkit de Visão Computacional e Reconhecimento

Vigilis é uma coleção abrangente de ferramentas de visão computacional, rastreamento e reconhecimento baseadas em navegador. Este toolkit utiliza tecnologias web modernas como MediaPipe, TensorFlow.js e Web APIs para fornecer capacidades avançadas de visão diretamente no seu navegador, sem necessidade de processamento no servidor.

## Visão Geral

Este toolkit inclui vários módulos que oferecem diferentes capacidades de visão computacional:

1. **Treinador de Objetos** - Detecção e rastreamento personalizado de objetos
2. **Reconhecimento de Gestos** - Gravação e reconhecimento de gestos manuais
3. **Demonstrações MediaPipe** - Rastreamento facial, de mãos, íris e detecção de objetos
4. **Reconhecimento de Fala** - Reconhecimento de voz em inglês e português

## Ferramentas e Componentes

### Treinador de Objetos

Localizado em object_trainer, esta ferramenta permite:

- **Capturar amostras** de objetos e fundos usando sua webcam
- **Treinar modelos personalizados** usando TensorFlow.js e transfer learning com MobileNet
- **Rastrear objetos** em tempo real com pontuações de confiança
- **Salvar, carregar, importar e exportar** modelos para uso posterior

### Rastreamento Facial

face_tracking.html oferece demonstração de rastreamento facial usando MediaPipe:

- Rastreia 468 pontos faciais que cobrem olhos, nariz, lábios, contorno facial
- Visualização em tempo real do rastreamento e da malha facial
- Informações detalhadas sobre os pontos de referência faciais

### Rastreamento de Mãos

hand_tracking.html demonstra o rastreamento de mãos:

- Rastreamento das articulações e dedos das mãos
- Visualização do esqueleto da mão
- Suporte ao reconhecimento de duas mãos simultaneamente

### Rastreamento de Íris

iris_tracking.html demonstra rastreamento dos olhos e íris:

- Detecção e rastreamento preciso da íris
- Visualização ampliada dos olhos
- Métricas de abertura ocular e direção do olhar

### Detecção de Objetos

object_detection.html utiliza o modelo COCO-SSD para:

- Detectar mais de 80 tipos de objetos comuns (pessoas, carros, animais, etc.)
- Mostrar caixas delimitadoras e rótulos em tempo real
- Exibição de lista de detecções com códigos de cores

### Reconhecimento de Fala

O toolkit inclui duas versões de reconhecimento de fala:

- speech_recognition.html - Versão em inglês
- reconhecimento_voz_portugues.html - Versão em português

Ambas as versões oferecem:
- Transcrição de fala em tempo real
- Visualização de áudio
- Destacamento de palavras-chave

## Requisitos Técnicos

- Navegador moderno (Chrome, Edge, Firefox) com suporte a WebGL e WebAssembly
- Webcam e microfone
- Conexão com a internet para carregar as bibliotecas necessárias
- Recomendado: Hardware razoável para processamento em tempo real

## Como Usar

1. Abra os arquivos HTML em um servidor web local ou hospede-os em um servidor
2. Conceda permissões de acesso à câmera e microfone quando solicitado
3. Cada ferramenta possui instruções específicas na interface

## Tecnologias Utilizadas

- **MediaPipe** - Biblioteca do Google para soluções de ML em visão computacional
- **TensorFlow.js** - Biblioteca de machine learning para JavaScript
- **Web Speech API** - API do navegador para reconhecimento de fala
- **Web Audio API** - API para processamento e visualização de áudio
- **HTML5 Canvas** - Para renderização de gráficos e visualizações

## Privacidade

Todas as ferramentas funcionam inteiramente no navegador - nenhum dado de vídeo, áudio ou imagem é enviado para servidores remotos.
