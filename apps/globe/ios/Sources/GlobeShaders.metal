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
    /// The mark a lifted country leaves behind, and where it lies.
    float4 shadowColor;
    float shadowRadius;
    /// The colour over the deepest trench; `oceanColor` is the shallow end.
    float4 deepOceanColor;
    int hasBathymetry;
};

struct OceanVertex {
    packed_float3 position;
};

struct LandVertex {
    packed_float3 position;
    float country;
    float color;
    float shade;
    /// Straight out of the globe on a country's face, sideways along its cut
    /// edge. Not the same thing as the position: the horizon still has to be
    /// worked out from where the vertex is, not from which way it looks.
    packed_float3 normal;
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
    /// Radial, for the horizon test.
    float3 normal;
    /// Which way the surface faces, for the light.
    float3 facing;
    float4 tint;
    float shade;
};

struct LineInOut {
    float4 position [[position]];
    float3 normal;
    float selected;
};

/// A modelled toy under a soft studio light, which is the look being aimed at:
/// bright and even across the face, falling away gently towards the far side,
/// with a wide highlight sitting on top. Deliberately not a lit planet — a real
/// terminator turns half the countries muddy and the map stops being readable.
///
/// `gloss` is how tight the highlight is and `sheen` how strong: a glazed ocean
/// takes a small bright one, clay takes a wide faint one.
static inline float3 clay(float3 baseColour, float3 normal, float shade,
                          constant Uniforms &uniforms, float gloss, float sheen) {
    float3 surface = normalize(normal);
    float3 light = normalize(uniforms.lightDirection);
    float3 eye = normalize(uniforms.cameraDirection);

    // Wrapped all the way round, so what faces away darkens rather than
    // switching off. The range is narrow on purpose: this is shaping, not night.
    float wrapped = saturate(dot(surface, light) * 0.5 + 0.5);
    float lit = mix(0.82, 1.07, pow(wrapped, 1.15));

    // A dim fill from the other side, the way a second softbox stops the shadow
    // side of a model going flat.
    lit += saturate(dot(surface, normalize(eye - light))) * 0.05;

    // Roundness comes from the edge, not from a terminator across the middle:
    // the far rim rolls off where it is also turned away from the light, and
    // the face of the map — where the countries are — stays bright and readable.
    float facing = saturate(dot(surface, eye));
    float rolloff = 1.0 - pow(1.0 - facing, 2.5) * 0.42 * (1.0 - wrapped);

    float highlight = pow(saturate(dot(surface, normalize(light + eye))), gloss) * sheen;
    return baseColour * lit * rolloff * shade + highlight;
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

/// Where a point on the globe lands on an equirectangular image. The date line
/// is a place, not an edge, so the sampler wraps there.
static inline float2 equirectangular(float3 normal) {
    return float2(atan2(normal.x, normal.z) / (2.0 * M_PI_F) + 0.5,
                  0.5 - asin(clamp(normal.y, -1.0, 1.0)) / M_PI_F);
}

fragment float4 ocean_fragment(OceanInOut in [[stage_in]],
                               constant Uniforms &uniforms [[buffer(1)]],
                               texture2d<float> seaFloor [[texture(0)]]) {
    float3 normal = normalize(in.normal);
    float3 water = uniforms.oceanColor.rgb;

    if (uniforms.hasBathymetry != 0) {
        constexpr sampler soundings(address::repeat, filter::linear, mip_filter::none);
        float2 uv = equirectangular(normal);
        float depth = seaFloor.sample(soundings, uv).r;

        // Most of the sea floor is between three and five kilometres down, so a
        // straight ramp spends its whole range on water that all looks the same.
        // The curve puts the contrast on the shelf, where a child is looking.
        // Held deliberately short of the deep colour. A wide band of water in a
        // markedly different blue, with an edge to it, does not read as deeper
        // water — it reads as land showing through from the other side, and the
        // globe stops looking solid.
        float shade = 1.0 - pow(1.0 - saturate(depth), 2.2);
        water = mix(uniforms.oceanColor.rgb, uniforms.deepOceanColor.rgb, shade * 0.42);

        // Ridges and trenches, lit rather than drawn: the slope of the depth
        // field tilts the surface, and the same light that shapes the globe
        // picks the shape out. Nothing here is invented — every rise is one
        // somebody surveyed.
        float2 step = 1.0 / float2(seaFloor.get_width(), seaFloor.get_height());
        float east = seaFloor.sample(soundings, uv + float2(step.x, 0.0)).r;
        float west = seaFloor.sample(soundings, uv - float2(step.x, 0.0)).r;
        float south = seaFloor.sample(soundings, uv + float2(0.0, step.y)).r;
        float north = seaFloor.sample(soundings, uv - float2(0.0, step.y)).r;

        float3 up = normal;
        float3 eastward = normalize(cross(float3(0.0, 1.0, 0.0), up));
        float3 northward = cross(up, eastward);
        // Deeper is further in, so the gradient is subtracted.
        float relief = 3.2;
        normal = normalize(up
            - eastward * (east - west) * relief
            - northward * (north - south) * relief);
    }

    // Glazed rather than matte: the tight highlight up in the corner is most of
    // what says "ball" before a single country is drawn.
    float3 ocean = clay(water, normal, 1.0, uniforms, 16.0, 0.34);
    // Measured against the direction to the camera, not the globe's own +z
    // axis: anchored to the globe it becomes a dark patch sitting on the ocean
    // that slides around as the child spins the Earth.
    float facing = saturate(dot(normalize(in.normal), uniforms.cameraDirection));
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
    out.facing = normalize(float3(source.normal));
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
    float pad = in.shade != 1.0 ? (1.0 - uniforms.horizonCosine) * 0.30 : 0.0;
    if (beyondTheHorizon(in.normal, uniforms, pad)) discard_fragment();
    // Barely glossy: clay holds a wide, faint sheen and nothing sharper.
    float3 colour = clay(in.tint.rgb, in.facing, in.shade, uniforms, 10.0, 0.085);
    return float4(colour, 1.0);
}

/// A country that has popped out has to have come from somewhere, and the hole
/// it left says so. Its own outline, laid on the water it was sitting on and
/// pushed away from the light, the way a shadow falls.
vertex LandInOut shadow_vertex(uint vertexID [[vertex_id]],
                               const device LandVertex *vertices [[buffer(0)]],
                               constant Uniforms &uniforms [[buffer(1)]]) {
    float3 surface = normalize(float3(vertices[vertexID].position));
    float3 alongTheSurface = uniforms.lightDirection - surface * dot(uniforms.lightDirection, surface);
    float reach = length(alongTheSurface);
    float3 away = reach > 1e-4 ? alongTheSurface / reach : float3(0.0);
    float step = uniforms.selectionLiftDistance * uniforms.selectionLift * 0.9;
    float3 position = normalize(surface - away * step) * uniforms.shadowRadius;

    LandInOut out;
    out.position = uniforms.viewProjection * float4(position, 1.0);
    out.normal = surface;
    out.facing = surface;
    out.tint = uniforms.shadowColor;
    out.shade = 1.0;
    return out;
}

fragment float4 shadow_fragment(LandInOut in [[stage_in]],
                                constant Uniforms &uniforms [[buffer(1)]]) {
    if (beyondTheHorizon(in.normal, uniforms)) discard_fragment();
    // Deepens as the country rises, so the two read as one movement.
    return float4(uniforms.shadowColor.rgb, uniforms.shadowColor.a * uniforms.selectionLift);
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
