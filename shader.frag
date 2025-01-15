#ifdef GL_ES
precision mediump float;
#endif

uniform sampler2D sourceTexture;
uniform sampler2D currentTarget;
uniform sampler2D nextTarget;
uniform float blendAmount;
uniform float time;
uniform vec2 resolution;
uniform float sectionSize;
uniform float glitchIntensity;
uniform float processedAmount;

varying vec2 vTexCoord;

// Hash function for pseudo-random numbers
float hash(vec2 p) {
    float h = dot(p, vec2(127.1, 311.7));
    return fract(sin(h) * 43758.5453123);
}

// Get average color of a region
vec4 getAverageColor(sampler2D tex, vec2 uv, float size) {
    vec4 sum = vec4(0.0);
    float count = 0.0;
    
    // Use fixed loop bounds for WebGL compatibility
    for(int x = -5; x <= 5; x++) {
        for(int y = -5; y <= 5; y++) {
            vec2 offset = vec2(float(x), float(y)) * (size / 10.0) / resolution;
            sum += texture2D(tex, uv + offset);
            count += 1.0;
        }
    }
    
    return sum / count;
}

// Find best matching section from source
vec2 findBestMatch(vec2 targetUV, vec4 targetColor) {
    float bestDiff = 999999.0;
    vec2 bestUV = targetUV;
    
    // Use fixed number of samples for WebGL compatibility
    for(int i = 0; i < 10; i++) {
        vec2 randomUV = vec2(
            hash(vec2(targetUV.x + float(i), time * 10.0)), // Increased time influence
            hash(vec2(targetUV.y + float(i), time * 10.0))  // Increased time influence
        );
        vec4 sampleColor = getAverageColor(sourceTexture, randomUV, sectionSize);
        float diff = length(targetColor - sampleColor);
        
        if(diff < bestDiff) {
            bestDiff = diff;
            bestUV = randomUV;
        }
    }
    
    return bestUV;
}

void main() {
    vec2 uv = vTexCoord;
    uv.y = 1.0 - uv.y;
    
    // Get the current grid cell with time-based offset
    vec2 cell = floor(uv * resolution / sectionSize);
    float timeOffset = time * 20.0; // Increased time scale for more noticeable movement
    vec2 animatedCell = cell + vec2(cos(timeOffset + hash(cell) * 6.28), sin(timeOffset + hash(cell.yx) * 6.28));
    float cellHash = hash(animatedCell);
    
    // Get colors from current and next target
    vec4 currentColor = texture2D(currentTarget, uv);
    vec4 nextColor = texture2D(nextTarget, uv);
    
    // Find best matches for both current and next target
    vec2 currentSourceUV = findBestMatch(uv, currentColor);
    vec2 nextSourceUV = findBestMatch(uv, nextColor);
    
    // Animate the threshold with time
    float animatedThreshold = processedAmount * (1.0 + 0.2 * sin(timeOffset + hash(cell) * 6.28));
    
    if(cellHash < animatedThreshold) {
        vec2 sourceUV = mix(currentSourceUV, nextSourceUV, blendAmount);
        
        // Add time-based glitch effects
        float glitchOffset = sin(timeOffset * 0.5 + hash(uv) * 6.28) * glitchIntensity;
        sourceUV += vec2(glitchOffset) / resolution;
        
        // RGB shift with time-based animation
        if(hash(animatedCell) > 0.9) {
            float shiftAmount = (1.0 + sin(timeOffset)) * 2.0;
            vec4 shifted = vec4(
                texture2D(sourceTexture, sourceUV + vec2(shiftAmount, 0.0) / resolution).r,
                texture2D(sourceTexture, sourceUV).g,
                texture2D(sourceTexture, sourceUV - vec2(shiftAmount, 0.0) / resolution).b,
                1.0
            );
            gl_FragColor = shifted;
        } else {
            gl_FragColor = texture2D(sourceTexture, sourceUV);
        }
    } else {
        gl_FragColor = mix(currentColor, nextColor, blendAmount);
    }
}
