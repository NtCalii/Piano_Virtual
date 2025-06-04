let audioContext;
// activeOscillators agora armazena { oscillator, gainNode } para cada nota ativa
let activeOscillators = {}; 
let activeKeys = {};       // Objeto para controlar quais teclas do teclado estão pressionadas

const noteFrequencies = {
    // Oitava 2
    "C2": 65.41,
    "C#2": 69.30,
    "D2": 73.42,
    "D#2": 77.78,
    "E2": 82.41,
    "F2": 87.31,
    "F#2": 92.50,
    "G2": 98.00,
    "G#2": 103.83,
    "A2": 110.00,
    "A#2": 116.54,
    "B2": 123.47,

    // Oitava 3
    "C3": 130.81,
    "C#3": 138.59,
    "D3": 146.83,
    "D#3": 155.56,
    "E3": 164.81,
    "F3": 174.61,
    "F#3": 185.00,
    "G3": 196.00,
    "G#3": 207.65,
    "A3": 220.00,
    "A#3": 233.08,
    "B3": 246.94,

    // Oitava 4 (Dó Central)
    "C4": 261.63,
    "C#4": 277.18,
    "D4": 293.66,
    "D#4": 311.13,
    "E4": 329.63,
    "F4": 349.23,
    "F#4": 369.99,
    "G4": 392.00,
    "G#4": 415.30,
    "A4": 440.00,
    "A#4": 466.16,
    "B4": 493.88
};

const keyboardMap = {
    // Linha numérica e de símbolos superior (1-0, q-p, [, ], \)
    '1': 'C2',
    '2': 'C#2',
    '3': 'D2',
    '4': 'D#2',
    '5': 'E2',
    '6': 'F2',
    '7': 'F#2',
    '8': 'G2',
    '9': 'G#2',
    '0': 'A2',
    '-': 'A#2',
    '=': 'B2',
    'q': 'C3',
    'w': 'C#3',
    'e': 'D3',
    'r': 'D#3',
    't': 'E3',
    'y': 'F3',
    'u': 'F#3',
    'i': 'G3',
    'o': 'G#3',
    'p': 'A3',
    '[': 'A#3',
    ']': 'B3',
    '\\': 'C4', // Início da 3ª oitava do teclado físico

    // Linha ASDF (a-l, ;, ')
    'a': 'C#4',
    's': 'D4',
    'd': 'D#4',
    'f': 'E4',
    'g': 'F4',
    'h': 'F#4',
    'j': 'G4',
    'k': 'G#4',
    'l': 'A4',
    ';': 'A#4',
    "'": 'B4',

    // Linha ZXCV (z-m, ,, ., /)
    'z': 'C5', // C5 é a primeira nota da próxima oitava (além das que você mapeou no HTML)
    'x': 'C#5',
    'c': 'D5',
    'v': 'D#5',
    'b': 'E5',
    'n': 'F5',
    'm': 'F#5',
    ',': 'G5',
    '.': 'G#5',
    '/': 'A5',

    // Exemplo de mapeamento para Numpad (se o teclado tiver)
    // Para usar Numpad, você precisaria adicionar mais notas à `noteFrequencies` se quiser ir mais alto
    'numpad1': 'A#5', 
    'numpad2': 'B5',
    'numpad3': 'C6', // C6, D6 etc. não estão no seu noteFrequencies atual, você precisaria adicionar
};


// Função para inicializar o AudioContext
function initializeAudioContext() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        console.log("AudioContext inicializado.");
    }
}

// Função para tocar uma nota, aceitando o nome da nota diretamente
function playNote(noteName) {
    initializeAudioContext();

    const frequency = noteFrequencies[noteName];

    if (typeof frequency === 'undefined') {
        console.warn(`Frequência para a nota "${noteName}" não encontrada.`);
        return;
    }

    if (activeOscillators[noteName]) {
        // Se a nota já estiver tocando, não faz nada (mantém o som contínuo)
        return;
    }

    const oscillator = audioContext.createOscillator();
    oscillator.type = 'sawtooth'; // Altere para 'sawtooth' para um som mais encorpado

    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);

    const gainNode = audioContext.createGain();
    gainNode.gain.setValueAtTime(0.5, audioContext.currentTime); // Volume inicial

    // Adicionar um pequeno decaimento (sustain) para simular o som do piano
    // Isso faz com que o som diminua gradualmente mesmo enquanto a tecla está pressionada
    // gainNode.gain.linearRampToValueAtTime(0.2, audioContext.currentTime + 0.3); // Exemplo de sustain

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.start();

    // Armazena o oscilador e o gainNode para esta nota para controle posterior
    activeOscillators[noteName] = { oscillator, gainNode };

    console.log(`Tocando nota: ${noteName}`);
}

// Função para parar uma nota específica (com decaimento)
function releaseNote(noteName) {
    if (activeOscillators[noteName]) {
        const { oscillator, gainNode } = activeOscillators[noteName];
        
        // Cancela qualquer automação de ganho anterior e inicia um decaimento rápido
        gainNode.gain.cancelScheduledValues(audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.0001, audioContext.currentTime + 0.1); // Decaimento rápido em 0.1s
        
        // Para o oscilador um pouco depois do decaimento para evitar cliques
        oscillator.stop(audioContext.currentTime + 0.11); 
        
        // Quando o oscilador parar, desconecta os nós e remove-os de activeOscillators
        oscillator.onended = () => {
            oscillator.disconnect();
            gainNode.disconnect();
            delete activeOscillators[noteName];
            console.log(`Parando nota: ${noteName} após decaimento.`);
        };
    }
}

// Função chamada quando uma tecla do piano (HTML) é clicada/pressionada
function handlePianoKeyMouseDown(event) {
    const noteName = event.target.getAttribute('name');
    if (noteName) {
        playNote(noteName);
        // Adiciona classes para estilo de "pressionado"
        event.target.classList.add('active-key');
    }
}

// Função chamada quando o mouse é solto de uma tecla do piano (HTML)
function handlePianoKeyMouseUp(event) {
    const noteName = event.target.getAttribute('name');
    if (noteName) {
        releaseNote(noteName);
        // Remove classes de estilo
        event.target.classList.remove('active-key');
    }
}

// Função chamada quando uma tecla do teclado é pressionada
function handleKeyboardKeyDown(event) {
    const keyboardKey = event.key.toLowerCase(); // Converte para minúsculas
    const noteName = keyboardMap[keyboardKey];

    if (noteName && !activeKeys[keyboardKey]) { // Verifica se a tecla não está já pressionada
        // Para evitar o comportamento padrão do navegador para algumas teclas (ex: barra de espaço rola)
        event.preventDefault(); 
        playNote(noteName);
        activeKeys[keyboardKey] = true; // Marca a tecla como pressionada

        // Opcional: Adiciona classe visual à tecla do piano virtual
        // Verifica se a nota existe no seu HTML para dar feedback visual
        const pianoKeyElement = document.querySelector(`.tecla_branca[name="${noteName}"], .tecla_preta[name="${noteName}"]`);
        if (pianoKeyElement) {
            pianoKeyElement.classList.add('active-key');
        }
    }
}

// Função chamada quando uma tecla do teclado é liberada
function handleKeyboardKeyUp(event) {
    const keyboardKey = event.key.toLowerCase();
    const noteName = keyboardMap[keyboardKey];

    if (noteName && activeKeys[keyboardKey]) { // Verifica se a tecla estava pressionada
        event.preventDefault(); // Evita comportamento padrão
        releaseNote(noteName);
        delete activeKeys[keyboardKey]; // Marca a tecla como liberada

        // Opcional: Remove classe visual da tecla do piano virtual
        const pianoKeyElement = document.querySelector(`.tecla_branca[name="${noteName}"], .tecla_preta[name="${noteName}"]`);
        if (pianoKeyElement) {
            pianoKeyElement.classList.remove('active-key');
        }
    }
}

// Adiciona event listeners a todas as teclas do piano e ao documento
document.addEventListener('DOMContentLoaded', () => {
    const whiteKeys = document.querySelectorAll('.tecla_branca');
    const blackKeys = document.querySelectorAll('.tecla_preta');

    // Event listeners para cliques do mouse nas teclas do piano
    whiteKeys.forEach(key => {
        key.addEventListener('mousedown', handlePianoKeyMouseDown);
        key.addEventListener('mouseup', handlePianoKeyMouseUp);
        key.addEventListener('mouseleave', handlePianoKeyMouseUp); // Para quando o mouse sai da tecla
        key.addEventListener('touchstart', handlePianoKeyMouseDown, { passive: true });
        key.addEventListener('touchend', handlePianoKeyMouseUp);
        key.addEventListener('touchcancel', handlePianoKeyMouseUp);
    });

    blackKeys.forEach(key => {
        key.addEventListener('mousedown', handlePianoKeyMouseDown);
        key.addEventListener('mouseup', handlePianoKeyMouseUp);
        key.addEventListener('mouseleave', handlePianoKeyMouseUp); // Para quando o mouse sai da tecla
        key.addEventListener('touchstart', handlePianoKeyMouseDown, { passive: true });
        key.addEventListener('touchend', handlePianoKeyMouseUp);
        key.addEventListener('touchcancel', handlePianoKeyMouseUp);
    });

    // Event listeners para o teclado
    document.addEventListener('keydown', handleKeyboardKeyDown);
    document.addEventListener('keyup', handleKeyboardKeyUp);
});