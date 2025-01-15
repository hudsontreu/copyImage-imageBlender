let sourceImage;
let currentTargetImage;
let nextTargetImage;
let targetImages = [];
let isProcessing = false;
let blendAmount = 100;
let transitionSpeed = 0.00001;
const NUM_TARGET_IMAGES = 5;
let glitchShader;
let glitchIntensity = 0.005;
let referenceGraphics;

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
    // Create WebGL canvas
    createCanvas(800, 900, WEBGL);
    noStroke();
    
    // Create graphics buffer for reference images
    referenceGraphics = createGraphics(800, 300);
    
    // Set initial target images
    currentTargetImage = targetImages[0];
    nextTargetImage = targetImages[1];
    
    // Initialize shader uniforms
    shader(glitchShader);
    glitchShader.setUniform('resolution', [width, height]);
    glitchShader.setUniform('sectionSize', 10.0);
}

function draw() {
    // Update blend amount for image transition
    blendAmount += transitionSpeed;
    if (blendAmount >= 1) {
        blendAmount = 0;
        currentTargetImage = nextTargetImage;
        let currentIndex = targetImages.indexOf(currentTargetImage);
        let nextIndex = (currentIndex + 1) % targetImages.length;
        nextTargetImage = targetImages[nextIndex];
    }
    
    // Draw reference images
    referenceGraphics.background(0);
    referenceGraphics.image(sourceImage, 0, 0, 400, 300);
    referenceGraphics.image(currentTargetImage, 400, 0, 400, 300);
    
    // Draw reference images at the top
    push();
    resetMatrix();
    translate(-width/2, -height/2);
    image(referenceGraphics, 0, 0);
    pop();
    
    // Move to the processing area
    translate(0, 150);
    
    // Set shader uniforms
    shader(glitchShader);
    glitchShader.setUniform('sourceTexture', sourceImage);
    glitchShader.setUniform('currentTarget', currentTargetImage);
    glitchShader.setUniform('nextTarget', nextTargetImage);
    glitchShader.setUniform('blendAmount', blendAmount);
    glitchShader.setUniform('time', millis() / 1000.0);
    glitchShader.setUniform('glitchIntensity', isProcessing ? glitchIntensity : 0.0);
    
    // Draw the shader output
    rect(-width/2, -height/2, width, height);
}

function keyPressed() {
    if (key === ' ') {
        isProcessing = !isProcessing;
    }
    if (key === 'ArrowUp') {
        glitchIntensity = min(glitchIntensity + 0.05, 1.0);
    }
    if (key === 'ArrowDown') {
        glitchIntensity = max(glitchIntensity - 0.05, 0.0);
    }
    if (key === '[') {
        transitionSpeed = max(transitionSpeed - 0.0001, 0.0001);
    }
    if (key === ']') {
        transitionSpeed = min(transitionSpeed + 0.0001, 0.01);
    }
}
