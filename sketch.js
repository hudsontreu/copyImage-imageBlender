let sourceImage;
let currentTargetImage;
let nextTargetImage;
let targetImages = [];
let canvas;
let isProcessing = false;
let sectionSize = 10;  
let sectionsPerFrame = 1;
let blendAmount = 100;
let transitionSpeed = 0.01;
const NUM_TARGET_IMAGES = 10;
let maxCoverage = 0.9;  
let glitchShader; 
let processedAmount = 0;
let pendingSourceImage = null;
let isTargetPaused = false;
let regionUpdateSpeed = 0.005; 
let fillRate = 0.01;

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
    
    // Create UI container
    let uiContainer = createDiv('');
    uiContainer.position(20, 20);
    uiContainer.style('display', 'flex');
    uiContainer.style('gap', '10px');
    uiContainer.style('flex-wrap', 'wrap');
    
    // Create buttons container
    let buttonsContainer = createDiv('');
    buttonsContainer.parent(uiContainer);
    buttonsContainer.style('display', 'flex');
    buttonsContainer.style('gap', '10px');
    buttonsContainer.style('margin-bottom', '10px');
    
    // Create load button
    let loadButton = createButton('Load New Source');
    loadButton.parent(buttonsContainer);
    loadButton.mousePressed(() => {
        // Start loading new source image while keeping the old one active
        pendingSourceImage = loadImage('https://picsum.photos/800/600?random=' + floor(random(1000)), () => {
            sourceImage = pendingSourceImage;
            pendingSourceImage = null;
            if (!isProcessing) {
                processedAmount = 0;
            }
        });
    });
    
    // Create start/pause button
    let startButton = createButton('Start Process');
    startButton.parent(buttonsContainer);
    startButton.mousePressed(() => {
        isProcessing = !isProcessing;
        startButton.html(isProcessing ? 'Pause Process' : 'Start Process');
    });
    
    // Create reset button
    let resetButton = createButton('Reset');
    resetButton.parent(buttonsContainer);
    resetButton.mousePressed(() => {
        processedAmount = 0;
        isProcessing = false;
        startButton.html('Start Process');
    });
    
    // Create target pause button
    let pauseTargetButton = createButton('Pause Target');
    pauseTargetButton.parent(buttonsContainer);
    pauseTargetButton.mousePressed(() => {
        isTargetPaused = !isTargetPaused;
        pauseTargetButton.html(isTargetPaused ? 'Resume Target' : 'Pause Target');
    });
    
    // Create sliders container
    let slidersContainer = createDiv('');
    slidersContainer.parent(uiContainer);
    slidersContainer.style('display', 'flex');
    slidersContainer.style('gap', '20px');
    slidersContainer.style('align-items', 'center');
    slidersContainer.style('flex-wrap', 'wrap');
    
    // Section Size slider
    createSpan('Section Size: ').parent(slidersContainer);
    let sectionSizeSlider = createSlider(2, 50, sectionSize, 1);
    sectionSizeSlider.parent(slidersContainer);
    sectionSizeSlider.input(() => {
        sectionSize = sectionSizeSlider.value();
    });
    
    // Max Coverage slider
    createSpan('Max Coverage: ').parent(slidersContainer);
    let maxCoverageSlider = createSlider(0.1, 1.0, maxCoverage, 0.05);
    maxCoverageSlider.parent(slidersContainer);
    maxCoverageSlider.input(() => {
        maxCoverage = maxCoverageSlider.value();
    });
    
    // Region Update Speed slider
    createSpan('Region Change Speed: ').parent(slidersContainer);
    let updateSpeedSlider = createSlider(0.0001, 0.01, regionUpdateSpeed, 0.0001);
    updateSpeedSlider.parent(slidersContainer);
    updateSpeedSlider.input(() => {
        regionUpdateSpeed = updateSpeedSlider.value();
    });
    
    // Fill Rate slider
    createSpan('Fill Rate: ').parent(slidersContainer);
    let fillRateSlider = createSlider(0.0005, 0.02, fillRate, 0.0005);
    fillRateSlider.parent(slidersContainer);
    fillRateSlider.input(() => {
        fillRate = fillRateSlider.value();
    });
}

function draw() {
    // Update blend amount for target transition
    if (!isTargetPaused) {
        blendAmount += transitionSpeed;
        if (blendAmount >= 1) {
            blendAmount = 0;
            currentTargetImage = nextTargetImage;
            let currentIndex = targetImages.indexOf(currentTargetImage);
            let nextIndex = (currentIndex + 1) % targetImages.length;
            nextTargetImage = targetImages[nextIndex];
        }
    }
    
    // Use the glitch shader
    shader(glitchShader);
    
    // Set shader uniforms
    glitchShader.setUniform('sourceTexture', sourceImage);
    glitchShader.setUniform('currentTarget', currentTargetImage);
    glitchShader.setUniform('nextTarget', nextTargetImage);
    glitchShader.setUniform('blendAmount', blendAmount);
    glitchShader.setUniform('time', frameCount * regionUpdateSpeed);
    glitchShader.setUniform('resolution', [width, height]);
    glitchShader.setUniform('sectionSize', float(sectionSize));
    glitchShader.setUniform('glitchIntensity', 0.1);
    glitchShader.setUniform('processedAmount', processedAmount);
    
    // Draw fullscreen quad
    rect(-width/2, -height/2, width, height);
    
    // Update processed amount if processing
    if (isProcessing) {
        processedAmount = min(processedAmount + fillRate, maxCoverage);
    }
}

function keyPressed() {
    if (key === 'r' || key === 'R') {
        // Reset processing
        processedAmount = 0;
        isProcessing = false;
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
