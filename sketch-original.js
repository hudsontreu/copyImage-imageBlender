let sourceImage;
let currentTargetImage;
let nextTargetImage;
let targetImages = [];
let canvas;
let isProcessing = false;
const SECTION_SIZE = 10;
let processedPixels = [];
let sectionsPerFrame = 50; // Default speed - sections processed per frame
let blendAmount = 0;
let transitionSpeed = 0.0005;
const NUM_TARGET_IMAGES = 5;
let blendedTarget;
let processedLayer;

function preload() {
    // Load source image and multiple target images
    sourceImage = loadImage('https://picsum.photos/800/600?random=1');
    for(let i = 0; i < NUM_TARGET_IMAGES; i++) {
        targetImages.push(loadImage(`https://picsum.photos/800/600?random=${i+2}`));
    }
}

function setup() {
    // Create canvas tall enough for all three images
    canvas = createCanvas(800, 900);
    background(0);
    
    // Set initial target images
    currentTargetImage = targetImages[0];
    nextTargetImage = targetImages[1];
    
    // Draw source and initial target images at the top
    image(sourceImage, 0, 0, 400, 300);
    image(currentTargetImage, 400, 0, 400, 300);
    
    // Initialize processing grid for the bottom canvas area
    for (let y = 0; y < 600; y += SECTION_SIZE) {
        for (let x = 0; x < 800; x += SECTION_SIZE) {
            processedPixels.push({x, y: y + 300, processed: false});
        }
    }
    
    // Create graphics buffers
    blendedTarget = createGraphics(800, 600);
    processedLayer = createGraphics(800, 600);
    noTint();

    // Create button
    let loadButton = createButton('Load New Source');
    loadButton.position(20, 20);
    loadButton.class('loadButton');
    loadButton.mousePressed(() => {
        sourceImage = loadImage('https://picsum.photos/800/600?random=' + floor(random(1000)), () => {
            // Reset processing state
            processedPixels.forEach(p => p.processed = false);
            processedLayer.clear();
            isProcessing = false;
            // Redraw top images
            image(sourceImage, 0, 0, 400, 300);
            image(currentTargetImage, 400, 0, 400, 300);
        });
    });
}

function updateTargetBlend() {
    // Update blend amount
    blendAmount += transitionSpeed;
    
    // When transition is complete, switch to next image
    if (blendAmount >= 1) {
        blendAmount = 0;
        currentTargetImage = nextTargetImage;
        let currentIndex = targetImages.indexOf(currentTargetImage);
        let nextIndex = (currentIndex + 1) % targetImages.length;
        nextTargetImage = targetImages[nextIndex];
    }
    
    // Clear the blend buffer
    blendedTarget.clear();
    
    // Draw current and next target images with alpha blending
    blendedTarget.tint(255, 255 * (1 - blendAmount));
    blendedTarget.image(currentTargetImage, 0, 0, 800, 600);
    blendedTarget.tint(255, 255 * blendAmount);
    blendedTarget.image(nextTargetImage, 0, 0, 800, 600);
    
    // Update the display of current blended target
    image(sourceImage, 0, 0, 400, 300);
    image(blendedTarget, 400, 0, 400, 300);
}

function draw() {
    updateTargetBlend();
    
    // Draw the blended target image in the background of the processing area
    image(blendedTarget, 0, 300, 800, 600);
    
    // Draw the processed layer on top
    image(processedLayer, 0, 300);
    
    if (!isProcessing) return;
    
    // Process multiple sections per frame based on speed
    for (let i = 0; i < sectionsPerFrame; i++) {
        let unprocessed = processedPixels.filter(p => !p.processed);
        if (unprocessed.length === 0) {
            processedPixels.forEach(p => p.processed = false);
            processedLayer.clear();
            continue;
        }
        
        // Pick a random unprocessed section
        let randomIndex = floor(random(unprocessed.length));
        let currentPixel = unprocessed[randomIndex];
        
        // Get the average color of this region in the blended target image
        let targetColor = getAverageColor(blendedTarget, 
            currentPixel.x, 
            currentPixel.y - 300, // Adjust for offset
            SECTION_SIZE);
        
        // Find the best matching section from the source image
        let bestMatch = findBestMatch(sourceImage, targetColor);
        
        // Copy and paste the matching section
        let sourceSection = sourceImage.get(bestMatch.x, bestMatch.y, SECTION_SIZE, SECTION_SIZE);
        
        // Add some glitch effects to the processed layer
        processedLayer.push();
        processedLayer.translate(currentPixel.x, currentPixel.y - 300);
        
        // Random slight rotation
        processedLayer.rotate(random(-0.1, 0.1));
        
        // Random slight scale
        let scale = random(0.95, 1.05);
        processedLayer.image(sourceSection, -SECTION_SIZE/2, -SECTION_SIZE/2, SECTION_SIZE * scale, SECTION_SIZE * scale);
        
        // Occasional RGB shift
        if (random() > 0.9) {
            processedLayer.tint(255, 0, 0, 50);
            processedLayer.image(sourceSection, random(-2, 2), random(-2, 2), SECTION_SIZE * scale, SECTION_SIZE * scale);
            processedLayer.tint(0, 255, 0, 50);
            processedLayer.image(sourceSection, random(-2, 2), random(-2, 2), SECTION_SIZE * scale, SECTION_SIZE * scale);
            processedLayer.tint(0, 0, 255, 50);
            processedLayer.image(sourceSection, random(-2, 2), random(-2, 2), SECTION_SIZE * scale, SECTION_SIZE * scale);
            processedLayer.noTint();
        }
        
        processedLayer.pop();
        
        // Mark this pixel as processed
        currentPixel.processed = true;
    }
}

function getAverageColor(img, x, y, size) {
    let r = 0, g = 0, b = 0;
    let count = 0;
    
    img.loadPixels();
    for (let i = x; i < x + size && i < img.width; i++) {
        for (let j = y; j < y + size && j < img.height; j++) {
            let idx = 4 * (j * img.width + i);
            r += img.pixels[idx];
            g += img.pixels[idx + 1];
            b += img.pixels[idx + 2];
            count++;
        }
    }
    
    return {
        r: r/count,
        g: g/count,
        b: b/count
    };
}

function findBestMatch(sourceImg, targetColor) {
    let bestDiff = Infinity;
    let bestX = 0;
    let bestY = 0;
    
    // Sample random positions to find a good match
    for (let i = 0; i < 50; i++) {
        let x = floor(random(sourceImg.width - SECTION_SIZE));
        let y = floor(random(sourceImg.height - SECTION_SIZE));
        let avgColor = getAverageColor(sourceImg, x, y, SECTION_SIZE);
        
        let diff = colorDifference(avgColor, targetColor);
        if (diff < bestDiff) {
            bestDiff = diff;
            bestX = x;
            bestY = y;
        }
    }
    
    return {x: bestX, y: bestY};
}

function colorDifference(c1, c2) {
    return Math.abs(c1.r - c2.r) + Math.abs(c1.g - c2.g) + Math.abs(c1.b - c2.b);
}

function keyPressed() {
    if (key === 'r' || key === 'R') {
        // Reset and start processing
        processedPixels.forEach(p => p.processed = false);
        processedLayer.clear();
        isProcessing = false;
    }
    if (key === ' ') {
        // Toggle processing
        isProcessing = !isProcessing;
    }
    // Speed controls
    if (key === 'ArrowUp') {
        sectionsPerFrame = min(sectionsPerFrame + 5, 50);
        console.log('Speed:', sectionsPerFrame, 'sections per frame');
    }
    if (key === 'ArrowDown') {
        sectionsPerFrame = max(sectionsPerFrame - 5, 1);
        console.log('Speed:', sectionsPerFrame, 'sections per frame');
    }
}
