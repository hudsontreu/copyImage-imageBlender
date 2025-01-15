let sourceImage;
let currentTargetImage;
let nextTargetImage;
let targetImages = [];
let canvas;
let isProcessing = false;
const SECTION_SIZE = 20;
let sectionsPerFrame = 1;
let blendAmount = 100;
let transitionSpeed = 0.01;
const NUM_TARGET_IMAGES = 5;
let glitchShader; 
let processedAmount = 0;

function preload() {
    // Load shader files
    glitchShader = loadShader('shader.vert', 'shader.frag');
    
    // Load source image and multiple target images
    sourceImage = loadImage('https://picsum.photos/800/600?random=1');
    for(let i = 0; i < NUM_TARGET_IMAGES; i++) {
        targetImages.push(loadImage(`https://picsum.photos/800/600?random=${i+2}`));
    }
}

function setup() {
    // Create canvas tall enough for all three images
    canvas = createCanvas(800, 900, WEBGL);
    
    // Set initial target images
    currentTargetImage = targetImages[0];
    nextTargetImage = targetImages[1];
    
    // Create button
    let loadButton = createButton('Load New Source');
    loadButton.position(20, 20);
    loadButton.class('loadButton');
    loadButton.mousePressed(() => {
        sourceImage = loadImage('https://picsum.photos/800/600?random=' + floor(random(1000)), () => {
            processedAmount = 0;
            isProcessing = false;
        });
    });
}

function draw() {
    // Update blend amount for target transition
    blendAmount += transitionSpeed;
    if (blendAmount >= 1) {
        blendAmount = 0;
        currentTargetImage = nextTargetImage;
        let currentIndex = targetImages.indexOf(currentTargetImage);
        let nextIndex = (currentIndex + 1) % targetImages.length;
        nextTargetImage = targetImages[nextIndex];
    }
    
    // Use the glitch shader
    shader(glitchShader);
    
    // Set shader uniforms
    glitchShader.setUniform('sourceTexture', sourceImage);
    glitchShader.setUniform('currentTarget', currentTargetImage);
    glitchShader.setUniform('nextTarget', nextTargetImage);
    glitchShader.setUniform('blendAmount', blendAmount);
    glitchShader.setUniform('time', frameCount * 0.01);
    glitchShader.setUniform('resolution', [width, height]);
    glitchShader.setUniform('sectionSize', float(SECTION_SIZE));
    glitchShader.setUniform('glitchIntensity', 0.1);
    glitchShader.setUniform('processedAmount', processedAmount);
    
    // Draw fullscreen quad
    rect(-width/2, -height/2, width, height);
    
    // Update processed amount if processing
    if (isProcessing) {
        processedAmount = min(processedAmount + 0.01, 1.0);
    }
}

function keyPressed() {
    if (key === 'r' || key === 'R') {
        // Reset processing
        processedAmount = 0;
        isProcessing = false;
    }
    if (key === ' ') {
        // Toggle processing
        isProcessing = !isProcessing;
    }
    // Speed controls
    if (keyCode === UP_ARROW) {
        transitionSpeed = min(transitionSpeed * 1.5, 0.01);
        console.log('Speed:', transitionSpeed);
    }
    if (keyCode === DOWN_ARROW) {
        transitionSpeed = max(transitionSpeed * 0.75, 0.0001);
        console.log('Speed:', transitionSpeed);
    }
}
