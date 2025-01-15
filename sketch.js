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
let uiVisible = true;

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
    uiContainer.class('ui-container');
    
    // Create UI toggle buttons (one for shown state, one for hidden state)
    let hiddenToggle = createButton('<span>+</span>');
    hiddenToggle.class('ui-toggle standalone');
    hiddenToggle.style('display', 'none');
    
    let visibleToggle = createButton('<span>−</span>');
    visibleToggle.class('ui-toggle');
    visibleToggle.parent(uiContainer);
    
    // Setup toggle functionality
    hiddenToggle.mousePressed(() => {
        uiVisible = true;
        uiContainer.class('ui-container');
        hiddenToggle.style('display', 'none');
        visibleToggle.style('display', 'block');
    });
    
    visibleToggle.mousePressed(() => {
        uiVisible = false;
        uiContainer.class('ui-container hidden');
        hiddenToggle.style('display', 'block');
        visibleToggle.style('display', 'none');
    });
    
    // Create buttons group
    let buttonGroup = createDiv('');
    buttonGroup.class('button-group');
    buttonGroup.parent(uiContainer);
    
    // Create load button
    let loadButton = createButton('[ + ] Load New Source');
    loadButton.parent(buttonGroup);
    loadButton.mousePressed(() => {
        pendingSourceImage = loadImage('https://picsum.photos/800/600?random=' + floor(random(1000)), () => {
            sourceImage = pendingSourceImage;
            pendingSourceImage = null;
            if (!isProcessing) {
                processedAmount = 0;
            }
        });
    });
    
    // Create start/pause button
    let startButton = createButton('[ > ] Start Process');
    startButton.parent(buttonGroup);
    startButton.mousePressed(() => {
        isProcessing = !isProcessing;
        startButton.html(isProcessing ? '[ || ] Pause Process' : '[ > ] Start Process');
    });
    
    // Create target pause button
    let pauseTargetButton = createButton('[ || ] Pause Target');
    pauseTargetButton.parent(buttonGroup);
    pauseTargetButton.mousePressed(() => {
        isTargetPaused = !isTargetPaused;
        pauseTargetButton.html(isTargetPaused ? '[ > ] Resume Target' : '[ || ] Pause Target');
    });
    
    // Create reset button
    let resetButton = createButton('[ x ] Reset');
    resetButton.parent(buttonGroup);
    resetButton.mousePressed(() => {
        processedAmount = 0;
        isProcessing = false;
        startButton.html('[ > ] Start Process');
    });
    
    // Add separator
    let separator = createDiv('');
    separator.class('separator');
    separator.parent(uiContainer);
    
    // Create sliders
    let sectionSizeSlider = createSliderControl(uiContainer, 'Section Size', 2, 50, sectionSize, 1, (value) => {
        sectionSize = value;
    });
    
    let maxCoverageSlider = createSliderControl(uiContainer, 'Max Coverage', 0.1, 1.0, maxCoverage, 0.05, (value) => {
        maxCoverage = value;
    });
    
    let updateSpeedSlider = createSliderControl(uiContainer, 'Region Speed', 0.0001, 0.01, regionUpdateSpeed, 0.0001, (value) => {
        regionUpdateSpeed = value;
    });
    
    let fillRateSlider = createSliderControl(uiContainer, 'Fill Rate', 0.0005, 0.02, fillRate, 0.0005, (value) => {
        fillRate = value;
    });
}

// Helper function to create slider controls
function createSliderControl(parent, label, min, max, value, step, callback) {
    let container = createDiv('');
    container.class('slider-container');
    container.parent(parent);
    
    let labelElement = createDiv(label);
    labelElement.class('slider-label');
    labelElement.parent(container);
    
    let slider = createSlider(min, max, value, step);
    slider.parent(container);
    slider.input(() => callback(slider.value()));
    
    return slider;
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
