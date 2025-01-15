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
            hash(vec2(targetUV.x + float(i), time)),
            hash(vec2(targetUV.y + float(i), time))
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
    uv.y = 1.0 - uv.y; // Flip Y coordinate
    
    // Get the current grid cell
    vec2 cell = floor(uv * resolution / sectionSize);
    float cellHash = hash(cell);
    
    // Get colors from current and next target
    vec4 currentColor = texture2D(currentTarget, uv);
    vec4 nextColor = texture2D(nextTarget, uv);
    
    // Find best matches for both current and next target
    vec2 currentSourceUV = findBestMatch(uv, currentColor);
    vec2 nextSourceUV = findBestMatch(uv, nextColor);
    
    // Only process if within processed amount
    if(cellHash < processedAmount) {
        // Get source colors for both matches
        vec4 currentSourceColor = texture2D(sourceTexture, currentSourceUV);
        vec4 nextSourceColor = texture2D(sourceTexture, nextSourceUV);
        
        // Blend between the two source matches
        vec2 sourceUV = mix(currentSourceUV, nextSourceUV, blendAmount);
        
        // Add some glitch effects
        float glitchOffset = (hash(uv + time) * 2.0 - 1.0) * glitchIntensity;
        sourceUV += vec2(glitchOffset) / resolution;
        
        // RGB shift
        if(hash(cell + time) > 0.9) {
            vec4 shifted = vec4(
                texture2D(sourceTexture, sourceUV + vec2(2.0, 0.0) / resolution).r,
                texture2D(sourceTexture, sourceUV).g,
                texture2D(sourceTexture, sourceUV - vec2(2.0, 0.0) / resolution).b,
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
