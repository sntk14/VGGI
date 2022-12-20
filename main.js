'use strict';

let gl;                         // The webgl context.
let surface;                    // A surface model
let shProgram;                  // A shader program
let spaceball;                  // A SimpleRotator object that lets the user rotate the view by mouse.
let lightPositionEl;

function deg2rad(angle) {
    return angle * Math.PI / 180;
}


// Constructor
function Model(name) {
    this.name = name;
    this.iVertexBuffer = gl.createBuffer();
    this.count = 0;

    this.BufferData = function (vertices) {

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STREAM_DRAW);

        this.count = vertices.length / 3;
    }

    this.Draw = function () {

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.vertexAttribPointer(shProgram.iAttribVertex, 3, gl.FLOAT, true, 0, 0);
        gl.enableVertexAttribArray(shProgram.iAttribVertex);

        gl.vertexAttribPointer(shProgram.iNormal, 3, gl.FLOAT, true, 0, 0);
        gl.enableVertexAttribArray(shProgram.iNormal);

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, this.count);
    }
}


// Constructor
function ShaderProgram(name, program) {

    this.name = name;
    this.prog = program;

    // Location of the attribute variable in the shader program.
    this.iAttribVertex = -1;
    // Location of the uniform specifying a color for the primitive.
    this.iColor = -1;
    // Location of the uniform matrix representing the combined transformation.
    this.iModelViewProjectionMatrix = -1;

    // Normals
    this.iNormal = -1;
    this.iNormalMatrix = -1;

    this.iLightColor = -1;

    // Shininess
    this.iShininess = -1;

    // Light position
    this.iLightPos = -1;
    this.iLightVec = -1;

    this.iWorldLocation = -1;

    this.Use = function () {
        gl.useProgram(this.prog);
    }
}


/* Draws a colored cube, along with a set of coordinate axes.
 * (Note that the use of the above drawPrimitive function is not an efficient
 * way to draw with WebGL.  Here, the geometry is so simple that it doesn't matter.)
 */
function draw() {
    gl.clearColor(0,0,0,1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    /* Set the values of the projection transformation */
    let projection = m4.perspective(Math.PI/8, 1, 8, 12);

    /* Get the view matrix from the SimpleRotator object.*/
    let modelView = spaceball.getViewMatrix();

    let rotateToPointZero = m4.axisRotation([0.707,0.707,0], 0.7);
    let translateToPointZero = m4.translation(0,0,-10);

    let matAccum0 = m4.multiply(rotateToPointZero, modelView );
    let matAccum1 = m4.multiply(translateToPointZero, matAccum0 );

    const modelViewInv = m4.inverse(matAccum1, new Float32Array(16));
    const normalMatrix = m4.transpose(modelViewInv, new Float32Array(16));

    /* Multiply the projection matrix times the modelview matrix to give the
       combined transformation matrix, and send that to the shader program. */
    let modelViewProjection = m4.multiply(projection, matAccum1);

    gl.uniformMatrix4fv(shProgram.iModelViewProjectionMatrix, false, modelViewProjection);

    gl.uniformMatrix4fv(shProgram.iNormalMatrix, false, normalMatrix);

    gl.uniformMatrix4fv(shProgram.iWorldLocation, false, modelViewProjection);
    const lightPos = Array.from(lightPositionEl.getElementsByTagName('input')).map(el => +el.value);
    gl.uniform3fv(shProgram.iLightPos, lightPos);
    gl.uniform3fv(shProgram.iLightVec, new Float32Array(3));

    gl.uniform1f(shProgram.iShininess, 1.0);

    gl.uniform3fv(shProgram.iAmbientColor, [0, 0, 0.5]);
    gl.uniform4fv(shProgram.iLightColor, [0, 1, 1, 1]);
    gl.uniform4fv(shProgram.iSpecularColor, [1, 0, 0, 1]);

    /* Draw the six faces of a cube, with different colors. */
    gl.uniform4fv(shProgram.iColor, [0,1,1,1] );

    surface.Draw();
}

function CreateSurfaceData() {
    let vertexList = [];

    const l = 1;
    const r1 = 0.3;
    const r2 = 2;

    for (let b = 0; b <= 360; b += 5) {
        for (let z = 0; z <= 2 * l; z += 0.2) {
            let r = (((r2 - r1)) * (1 - Math.cos(deg2rad((Math.PI * z) / (2 * l))))) * 100 + r1;

            let x = r * Math.cos(deg2rad(b));
            let y = r * Math.sin(deg2rad(b));
            vertexList.push(x, y, z);

            x = r * Math.cos(deg2rad(b + 10));
            y = r * Math.sin(deg2rad(b + 10));
            vertexList.push(x, y, z);
        }

        for (let z = 2 * l; z >= 0; z -= 0.2) {
            let r = (((r2 - r1)) * (1 - Math.cos(deg2rad((Math.PI * z) / (2 * l))))) * 100 + r1;

            let x = r * Math.cos(deg2rad(b));
            let y = r * Math.sin(deg2rad(b));
            vertexList.push(x, y, z);

            x = r * Math.cos(deg2rad(b + 10));
            y = r * Math.sin(deg2rad(b + 10));
            vertexList.push(x, y, z);
        }
    }

    return vertexList;
}


/* Initialize the WebGL context. Called from init() */
function initGL() {
    let prog = createProgram(gl, vertexShaderSource, fragmentShaderSource);

    shProgram = new ShaderProgram('Basic', prog);
    shProgram.Use();

    shProgram.iAttribVertex              = gl.getAttribLocation(prog, "vertex");
    shProgram.iModelViewProjectionMatrix = gl.getUniformLocation(prog, "ModelViewProjectionMatrix");
    shProgram.iColor = gl.getUniformLocation(prog, "color");
    shProgram.iNormal = gl.getAttribLocation(prog, 'normal');
    shProgram.iNormalMatrix = gl.getUniformLocation(prog, 'normalMat');
    shProgram.iLightColor = gl.getUniformLocation(prog, 'lightColor');
    shProgram.iShininess = gl.getUniformLocation(prog, 'shininess');
    shProgram.iLightPos = gl.getUniformLocation(prog, 'lightPosition');
    shProgram.iLightVec = gl.getUniformLocation(prog, 'lightVec');
    shProgram.iWorldLocation = gl.getUniformLocation(prog, "world");
    surface = new Model('Surface');
    surface.BufferData(CreateSurfaceData());

    gl.enable(gl.DEPTH_TEST);
}


/* Creates a program for use in the WebGL context gl, and returns the
 * identifier for that program.  If an error occurs while compiling or
 * linking the program, an exception of type Error is thrown.  The error
 * string contains the compilation or linking error.  If no error occurs,
 * the program identifier is the return value of the function.
 * The second and third parameters are strings that contain the
 * source code for the vertex shader and for the fragment shader.
 */
function createProgram(gl, vShader, fShader) {
    let vsh = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vsh, vShader);
    gl.compileShader(vsh);
    if (!gl.getShaderParameter(vsh, gl.COMPILE_STATUS)) {
        throw new Error("Error in vertex shader:  " + gl.getShaderInfoLog(vsh));
    }
    let fsh = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fsh, fShader);
    gl.compileShader(fsh);
    if (!gl.getShaderParameter(fsh, gl.COMPILE_STATUS)) {
        throw new Error("Error in fragment shader:  " + gl.getShaderInfoLog(fsh));
    }
    let prog = gl.createProgram();
    gl.attachShader(prog, vsh);
    gl.attachShader(prog, fsh);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        throw new Error("Link error in program:  " + gl.getProgramInfoLog(prog));
    }
    return prog;
}


/**
 * initialization function that will be called when the page has loaded
 */
function init() {
    lightPositionEl = document.getElementById('lightSettings');

    let canvas;
    try {
        canvas = document.getElementById("webglcanvas");
        gl = canvas.getContext("webgl");
        if (!gl) {
            throw "Browser does not support WebGL";
        }
    } catch (e) {
        document.getElementById("canvas-holder").innerHTML =
            "<p>Sorry, could not get a WebGL graphics context.</p>";
        return;
    }
    try {
        initGL();
    } catch (e) {
        document.getElementById("canvas-holder").innerHTML =
            "<p>Sorry, could not initialize the WebGL graphics context: " + e + "</p>";
        return;
    }

    spaceball = new TrackballRotator(canvas, draw, 0);

    draw();
}

function update() {
    surface.BufferData(CreateSurfaceData());
    draw();
}