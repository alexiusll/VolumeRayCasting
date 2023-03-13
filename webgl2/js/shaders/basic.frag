#version 300 es
// ==== 全局默认精度 ====
precision highp float;
precision highp int;
precision highp sampler3D;
// ==== ====

// ==== 输入纹理 ====
uniform sampler3D tex; // 三维纹理
uniform sampler3D normals; // 法线
uniform sampler2D colorMap; // 颜色 映射表
// uniform samplerCube skybox; //! 不使用
// ==== ====

uniform mat4 transform; // 模型的转换矩阵 (平移 旋转 缩放)
uniform mat4 inverseTransform; // 模型的转换矩阵 的 逆
uniform int depthSampleCount; // 光线投射算法：射线的采样数量
uniform float zScale; //? 可能是层厚
uniform float brightness; // 整体的亮度

// uniform vec3 lightPosition; //! 不使用
// uniform vec4 opacitySettings;
// x: minLevel
// y: maxLevel
// z: lowNode
// w: highNode

in vec2 texCoord; //* 窗口的坐标

//in vec4 origin;
//in vec4 direction;

out vec4 color;

// const vec3 ambientLight = vec3(0.34, 0.32, 0.32);
// const vec3 ambientLight = vec3(0.0, 0.0, 0.0);
// const vec3 directionalLight = vec3(0.5, 0.5, 0.5);
// const vec3 lightVector = normalize(vec3(-1.0, 0.0, 0.0));
// const vec3 specularColor = vec3(0.5, 0.5, 0.5);
// const float specularIntensity = 0.2;
// const float shinyness = 5.0;
// const float scatterFactor = 2.0;
// const float reflectScattering = 1.0;

vec3 aabb[2] = vec3[2](
	vec3(0.0, 0.0, 0.0),
	vec3(1.0, 1.0, 1.0)
);

//* 光线的数据结构
struct Ray {
    vec3 origin;
    vec3 direction;
    vec3 inv_direction;
    int sign[3];
};

Ray makeRay(vec3 origin, vec3 direction) {
    vec3 inv_direction = vec3(1.0) / direction;
    
    return Ray(
        origin,
        direction,
        inv_direction,
        int[3](
			((inv_direction.x < 0.0) ? 1 : 0),
			((inv_direction.y < 0.0) ? 1 : 0),
			((inv_direction.z < 0.0) ? 1 : 0)
		)
    );
}

/*
	From: https://github.com/hpicgs/cgsee/wiki/Ray-Box-Intersection-on-the-GPU
*/
void intersect(
    in Ray ray, in vec3 aabb[2],
    out float tmin, out float tmax
){
    float tymin, tymax, tzmin, tzmax;
    tmin = (aabb[ray.sign[0]].x - ray.origin.x) * ray.inv_direction.x;
    tmax = (aabb[1-ray.sign[0]].x - ray.origin.x) * ray.inv_direction.x;
    tymin = (aabb[ray.sign[1]].y - ray.origin.y) * ray.inv_direction.y;
    tymax = (aabb[1-ray.sign[1]].y - ray.origin.y) * ray.inv_direction.y;
    tzmin = (aabb[ray.sign[2]].z - ray.origin.z) * ray.inv_direction.z;
    tzmax = (aabb[1-ray.sign[2]].z - ray.origin.z) * ray.inv_direction.z;
    tmin = max(max(tmin, tymin), tzmin);
    tmax = min(min(tmax, tymax), tzmax);
}

void main(){
	
	//transform = inverse(transform);
	
	vec4 origin = vec4(0.0, 0.0, 2.0, 1.0);
	origin = transform * origin;
	origin = origin / origin.w;
	origin.z = origin.z / zScale;
	origin = origin + 0.5;

	vec4 image = vec4(texCoord, 4.0, 1.0);
	image = transform * image;
	//image = image / image.w;
	image.z = image.z / zScale;
	image = image + 0.5;
	//vec4 direction = vec4(0.0, 0.0, 1.0, 0.0);
	vec4 direction = normalize(origin-image);
	//direction = transform * direction;

	Ray ray = makeRay(origin.xyz, direction.xyz);
	float tmin = 0.0;
	float tmax = 0.0;
	intersect(ray, aabb, tmin, tmax);

	vec4 value = vec4(0.0, 0.0, 0.0, 0.0);

	//vec4 background = texture(skybox, direction.xyz);

	if(tmin > tmax){
		color = value;
		return;
	}

	vec3 start = origin.xyz + tmin*direction.xyz;
	vec3 end = origin.xyz + tmax*direction.xyz;
	
	float len = distance(end, start);
	int sampleCount = int(float(depthSampleCount)*len);
	vec3 increment = (end-start)/float(sampleCount);
	float incLength = length(increment);
	increment = normalize(increment);
	vec3 pos = start;
	//vec3 originOffset = mod((start-origin.xyz), increment);

	float s = 0.0;
	float px = 0.0;
	vec4 pxColor = vec4(0.0, 0.0, 0.0, 0.0);
	vec3 texCo = vec3(0.0, 0.0, 0.0);
	vec3 normal = vec3(0.0, 0.0, 0.0);
	vec4 zero = vec4(0.0);

	float last = 0.0;
	
	for(int count = 0; count < sampleCount; count++){

		texCo = mix(start, end, float(count)/float(sampleCount));// - originOffset;

		px = texture(tex, texCo).r;
		
		pxColor = texture(colorMap, vec2(px, 0.0));
		
		px = px*px;
		
		value = value + pxColor - pxColor*value.a;
		
		if(value.a >= 0.95){
			value.a = 1.0;
			break;
		}
	}

	//background = texture(skybox, normalize(direction.xyz));
	//color = mix(background, value, value.a);
	color = value*brightness;
}
