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

varying vec2 vTexCoord;

// Hash function for pseudo-random numbers
float hash(vec2 p) {
    float h = dot(p, vec2(127.1, 311.7));
    return fract(sin(h) * 43758.5453123);
}

// Get average color in a section
vec4 getSectionAverage(sampler2D tex, vec2 uv, float size) {
    vec4 total = vec4(0.0);
    float count = 0.0;
    float halfSize = size * 0.5;
    
    for(float x = -halfSize; x < halfSize; x += 1.0) {
        for(float y = -halfSize; y < halfSize; y += 1.0) {
            vec2 offset = vec2(x, y) / resolution;
            total += texture2D(tex, uv + offset);
            count += 1.0;
        }
    }
    
    return total / count;
}

// Find best matching section from source
vec2 findBestMatch(vec2 uv) {
    vec4 targetColor = getSectionAverage(currentTarget, uv, sectionSize);
    vec4 nextColor = getSectionAverage(nextTarget, uv, sectionSize);
    vec4 blendedTarget = mix(targetColor, nextColor, blendAmount);
    
    float bestDiff = 1000000.0;
    vec2 bestPos = uv;
    
    // Sample random positions to find best match
    for(float i = 0.0; i < 10.0; i++) {
        vec2 testPos = vec2(
            hash(uv + vec2(i, time)),
            hash(uv + vec2(time, i))
        );
        
        vec4 sourceColor = getSectionAverage(sourceTexture, testPos, sectionSize);
        float diff = length(sourceColor - blendedTarget);
        
        if(diff < bestDiff) {
            bestDiff = diff;
            bestPos = testPos;
        }
    }
    
    return bestPos;
}

void main() {
    vec2 uv = vTexCoord;
    uv.y = 1.0 - uv.y; // Flip Y coordinate
    
    // Calculate section coordinates
    vec2 sectionUV = floor(uv * resolution / sectionSize) * sectionSize / resolution;
    
    // Add some randomization to section sampling
    vec2 randOffset = vec2(
        hash(sectionUV + time) * 2.0 - 1.0,
        hash(sectionUV + time + 1.0) * 2.0 - 1.0
    ) * glitchIntensity / resolution;
    
    // Find best matching section from source
    vec2 sourceUV = findBestMatch(sectionUV) + randOffset;
    
    // Sample the source with some RGB shifting
    vec4 color = texture2D(sourceTexture, sourceUV);
    float shift = glitchIntensity * 5.0 / resolution.x;
    
    if(hash(sectionUV + time) > 0.9) {
        color.r = texture2D(sourceTexture, sourceUV + vec2(shift, 0.0)).r;
        color.b = texture2D(sourceTexture, sourceUV - vec2(shift, 0.0)).b;
    }
    
    // Apply some hue rotation based on time
    float hueShift = sin(time * 0.1) * 0.5 + 0.5;
    vec3 hsl = rgb2hsl(color.rgb);
    hsl.x = fract(hsl.x + hueShift);
    color.rgb = hsl2rgb(hsl);
    
    gl_FragColor = color;
}

// RGB to HSL conversion
vec3 rgb2hsl(vec3 color) {
    float maxColor = max(max(color.r, color.g), color.b);
    float minColor = min(min(color.r, color.g), color.b);
    float delta = maxColor - minColor;
    
    vec3 hsl = vec3(0.0, 0.0, (maxColor + minColor) / 2.0);
    
    if(delta > 0.0) {
        hsl.y = hsl.z < 0.5 ? delta / (maxColor + minColor) : delta / (2.0 - maxColor - minColor);
        
        if(maxColor == color.r) {
            hsl.x = (color.g - color.b) / delta + (color.g < color.b ? 6.0 : 0.0);
        } else if(maxColor == color.g) {
            hsl.x = (color.b - color.r) / delta + 2.0;
        } else {
            hsl.x = (color.r - color.g) / delta + 4.0;
        }
        hsl.x /= 6.0;
    }
    
    return hsl;
}

// HSL to RGB conversion
vec3 hsl2rgb(vec3 hsl) {
    vec3 rgb = vec3(hsl.z);
    
    if(hsl.y > 0.0) {
        float h = hsl.x * 6.0;
        float f = h - floor(h);
        float p = hsl.z * (1.0 - hsl.y);
        float q = hsl.z * (1.0 - hsl.y * f);
        float t = hsl.z * (1.0 - hsl.y * (1.0 - f));
        
        if(h < 1.0) {
            rgb = vec3(hsl.z, t, p);
        } else if(h < 2.0) {
            rgb = vec3(q, hsl.z, p);
        } else if(h < 3.0) {
            rgb = vec3(p, hsl.z, t);
        } else if(h < 4.0) {
            rgb = vec3(p, q, hsl.z);
        } else if(h < 5.0) {
            rgb = vec3(t, p, hsl.z);
        } else {
            rgb = vec3(hsl.z, p, q);
        }
    }
    
    return rgb;
}
