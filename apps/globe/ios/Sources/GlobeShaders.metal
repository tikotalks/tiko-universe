#include <metal_stdlib>
using namespace metal;

struct Uniforms {
    float4x4 viewProjection;
    float3 lightDirection;
    int selectedCountry;
    /// Everything beyond the horizon is on the far side of the planet.
    float horizonCosine;
    /// How far the selected country is lifted off the surface, 0…1 of the
    /// distance below.
    float selectionLift;
    /// How far a fully lifted country rises, in globe radii. Sized per frame
    /// from the camera distance: a lift that looks right around the whole
    /// planet would shove a country past the camera when zoomed into it.
    float selectionLiftDistance;
    /// Half the border thickness in world units, sized each frame so the lines
    /// keep the same weight on screen at every zoom level.
    float borderHalfWidth;
    /// Where the camera is, in globe space.
    float3 cameraDirection;
    float4 oceanColor;
    float4 atmosphereColor;
    float4 borderColor;
    float4 highlightColor;
    float4 selectedBorderColor;
};

struct OceanVertex {
    packed_float3 position;
};

struct LandVertex {
    packed_float3 position;
    float country;
    float color;
    float shade;
};

/// Borders are ribbons, not lines: a one-pixel primitive cannot be made thicker,
/// and Tiko's Earth is drawn rather than plotted. Each vertex carries the
/// direction to push it sideways and which side it is on.
struct BorderVertex {
    packed_float3 position;
    packed_float3 perpendicular;
    float side;
    float country;
};

struct OceanInOut {
    float4 position [[position]];
    float3 normal;
};

struct LandInOut {
    float4 position [[position]];
    float3 normal;
    float4 tint;
    float shade;
};

struct LineInOut {
    float4 position [[position]];
    float3 normal;
    float selected;
};

/// Almost flat. The Earth here is a drawing, not a lit sphere: a strong terminator
/// turns half the countries muddy and makes the globe read as a shaded ball
/// rather than a map a child can look at. All that is left is a whisper of
/// shaping so the sphere does not go completely dead.
static inline float daylight(float3 normal, float3 lightDirection) {
    float lambert = dot(normalize(normal), normalize(lightDirection));
    return clamp(lambert * 0.07 + 0.965, 0.90, 1.04);
}

/// The ocean sphere sits a hair inside the surface that land and borders are
/// drawn on, so around the limb it stops covering them and the far side of the
/// planet shows through as speckle. Depth cannot fix that — the far-side
/// geometry really is unoccluded there — so the horizon does the culling.
static inline bool beyondTheHorizon(float3 normal, constant Uniforms &uniforms, float pad = 0.0) {
    return dot(normalize(normal), uniforms.cameraDirection) < uniforms.horizonCosine + pad;
}

/// Where a vertex sits once selection has lifted it off the surface.
static inline float3 lifted(float3 position, bool selected, constant Uniforms &uniforms) {
    return selected ? position * (1.0 + uniforms.selectionLiftDistance * uniforms.selectionLift) : position;
}

vertex OceanInOut ocean_vertex(uint vertexID [[vertex_id]],
                               const device OceanVertex *vertices [[buffer(0)]],
                               constant Uniforms &uniforms [[buffer(1)]]) {
    float3 position = float3(vertices[vertexID].position);
    OceanInOut out;
    out.position = uniforms.viewProjection * float4(position, 1.0);
    out.normal = normalize(position);
    return out;
}

fragment float4 ocean_fragment(OceanInOut in [[stage_in]],
                               constant Uniforms &uniforms [[buffer(1)]]) {
    float3 normal = normalize(in.normal);
    float3 ocean = uniforms.oceanColor.rgb * daylight(normal, uniforms.lightDirection);
    // Measured against the direction to the camera, not the globe's own +z
    // axis: anchored to the globe it becomes a dark patch sitting on the ocean
    // that slides around as the child spins the Earth.
    float facing = saturate(dot(normal, uniforms.cameraDirection));
    float rim = pow(1.0 - facing, 3.0);
    float3 colour = mix(ocean, uniforms.atmosphereColor.rgb, rim * uniforms.atmosphereColor.a);
    return float4(colour, 1.0);
}

vertex LandInOut land_vertex(uint vertexID [[vertex_id]],
                             const device LandVertex *vertices [[buffer(0)]],
                             constant Uniforms &uniforms [[buffer(1)]],
                             const device float4 *countryColors [[buffer(2)]]) {
    LandVertex source = vertices[vertexID];
    float3 position = float3(source.position);
    bool selected = uniforms.selectedCountry >= 0 && int(source.country) == uniforms.selectedCountry;
    LandInOut out;
    out.position = uniforms.viewProjection * float4(lifted(position, selected, uniforms), 1.0);
    out.normal = normalize(position);
    out.tint = selected ? uniforms.highlightColor : countryColors[int(source.color)];
    out.shade = source.shade;
    return out;
}

fragment float4 land_fragment(LandInOut in [[stage_in]],
                              constant Uniforms &uniforms [[buffer(1)]]) {
    // The cut edges stop a little before the silhouette does. Seen exactly
    // edge-on they are a row of separate quads with daylight between them, and
    // that reads as a comb around the planet rather than as thickness.
    // A fraction of the headroom above the horizon, not a constant: zoomed in
    // the horizon cosine is nearly 1 and a constant would cull the whole world.
    float pad = in.shade < 0.99 ? (1.0 - uniforms.horizonCosine) * 0.12 : 0.0;
    if (beyondTheHorizon(in.normal, uniforms, pad)) discard_fragment();
    float3 colour = in.tint.rgb * daylight(in.normal, uniforms.lightDirection) * in.shade;
    return float4(colour, 1.0);
}

vertex LineInOut border_vertex(uint vertexID [[vertex_id]],
                               const device BorderVertex *vertices [[buffer(0)]],
                               constant Uniforms &uniforms [[buffer(1)]]) {
    BorderVertex source = vertices[vertexID];
    float3 position = float3(source.position);
    bool selected = uniforms.selectedCountry >= 0 && int(source.country) == uniforms.selectedCountry;
    float3 base = lifted(position, selected, uniforms);
    // Widened along the surface, never outwards: a border lifted off the fill
    // slides away from it as soon as the globe turns.
    float3 edge = base + float3(source.perpendicular) * (source.side * uniforms.borderHalfWidth);
    LineInOut out;
    out.position = uniforms.viewProjection * float4(edge, 1.0);
    out.normal = normalize(position);
    out.selected = selected ? 1.0 : 0.0;
    return out;
}

fragment float4 border_fragment(LineInOut in [[stage_in]],
                                constant Uniforms &uniforms [[buffer(1)]]) {
    if (beyondTheHorizon(in.normal, uniforms)) discard_fragment();
    // The lifted country gets a firmer outline, which is what sells the step
    // between it and the surface it came off.
    return in.selected > 0.5 ? uniforms.selectedBorderColor : uniforms.borderColor;
}
