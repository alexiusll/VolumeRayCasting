#version 300 es
 
//* aspect 窗口比例 例如 16:9
//* var aspect = canvas.width / canvas.height;
uniform float aspect;
//uniform float zScale;
//uniform mat4 transform;

in vec2 coordinates;
out vec2 texCoord;

//out vec4 origin;
//out vec4 direction;
 
void main() {
   	texCoord = coordinates;
   	texCoord.x *= aspect;
    //texCoord.x = texCoord.x*(-1.0);
    //texCoord.y = texCoord.y*(-1.0);

	gl_Position = vec4(coordinates, 1.0, 1.0);
}
