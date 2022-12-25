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
    this.count = 0;

    this.BufferData = function (vertices, uvs) {
        const vBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STREAM_DRAW);
        gl.enableVertexAttribArray(shProgram.iAttribVertex);
        gl.vertexAttribPointer(shProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);

        const tBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, tBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(uvs), gl.STREAM_DRAW);
        gl.enableVertexAttribArray(shProgram.iTexCoord);
        gl.vertexAttribPointer(shProgram.iTexCoord, 2, gl.FLOAT, false, 0, 0);

        this.count = vertices.length / 3;
    }

    this.Draw = function () {
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

    const lightPos = Array.from(lightPositionEl.getElementsByTagName('input')).map(el => +el.value);
    gl.uniform3fv(shProgram.iLightPos, lightPos);
    gl.uniform3fv(shProgram.iLightVec, new Float32Array(3));

    gl.uniform1f(shProgram.iShininess, 1.0);

    gl.uniform3fv(shProgram.iLightColor, [0, 1, 1]);

    /* Draw the six faces of a cube, with different colors. */
    gl.uniform4fv(shProgram.iColor, [0,1,1,1] );

    surface.Draw();
}

function CreateSurfaceData() {
    let vertices = [];
    let uvs = [];

    const l = 1;
    const r1 = 0.5;
    const r2 = 4;

    function normUv(b, z) {
        return [b / 360, z / (2 * l)];
    }

    function r(a) {
        a = deg2rad(a);
        return (r2 - r1) * Math.pow(Math.sin((Math.PI * a) / (4 * l)), 2) * 100 + r1;
    }

    for (let b = 0; b <= 360; b += 1) {
        for (let a = 0; a <= 2 * l; a += 0.1) {
            const x = r(a) * Math.cos(deg2rad(b));
            const y = r(a) * Math.sin(deg2rad(b));
            const z = a;
            vertices.push(x, y, z);
            uvs.push(...normUv(b, a));

            const a1 = a + 0.2;
            const b1 = b + 5;
            const x1 = r(a1) * Math.cos(deg2rad(b1));
            const y1 = r(a1) * Math.sin(deg2rad(b1));
            const z1 = a1;
            vertices.push(x1, y1, z1);
            uvs.push(...normUv(b1, a1));
        }

        for (let a = 2*l; a > 0; a -= 0.1) {
            const x = r(a) * Math.cos(deg2rad(b));
            const y = r(a) * Math.sin(deg2rad(b));
            const z = a;
            vertices.push(x, y, z);
            uvs.push(...normUv(b, a));

            const a1 = a + 0.2;
            const b1 = b + 5;
            const x1 = r(a1) * Math.cos(deg2rad(b1));
            const y1 = r(a1) * Math.sin(deg2rad(b1));
            const z1 = a1;
            vertices.push(x1, y1, z1);
            uvs.push(...normUv(b1, a1));
        }
    }

    return {vertices, uvs};
}


/* Initialize the WebGL context. Called from init() */
function initGL() {
    let prog = createProgram(gl, vertexShaderSource, fragmentShaderSource);

    shProgram = new ShaderProgram('Basic', prog);
    shProgram.Use();

    shProgram.iAttribVertex              = gl.getAttribLocation(prog, "vertex");
    shProgram.iTexCoord                  = gl.getAttribLocation(prog, "texcoord");
    shProgram.iModelViewProjectionMatrix = gl.getUniformLocation(prog, "ModelViewProjectionMatrix");
    shProgram.iColor = gl.getUniformLocation(prog, "color");
    shProgram.iNormal = gl.getAttribLocation(prog, 'normal');
    shProgram.iNormalMatrix = gl.getUniformLocation(prog, 'normalMat');
    shProgram.iLightColor = gl.getUniformLocation(prog, 'lightColor');
    shProgram.iShininess = gl.getUniformLocation(prog, 'shininess');
    shProgram.iLightPos = gl.getUniformLocation(prog, 'lightPosition');
    shProgram.iLightVec = gl.getUniformLocation(prog, 'lightVec');
    shProgram.iTexScale = gl.getUniformLocation(prog, 'texScale');
    shProgram.iTexCenter = gl.getUniformLocation(prog, 'texCenter');

    surface = new Model('Surface');
    const {vertices, uvs} = CreateSurfaceData();
    surface.BufferData(vertices, uvs);

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

    gl.uniform2fv(shProgram.iTexScale, [1, 1]);
    gl.uniform2fv(shProgram.iTexCenter, [0, 0]);
    const scaleUInput = document.getElementById("scaleU");
    const scaleVInput = document.getElementById("scaleV");
    const centerUInput = document.getElementById("centerU");
    const centerVInput = document.getElementById("centerV");

    function setSpanValue (id, value) {
        document.getElementById('scale_value_'+id).innerHTML = value;
    }
    const scale = () => {
        const scaleU = parseFloat(scaleUInput.value);
        const scaleV = parseFloat(scaleVInput.value);

        setSpanValue("V", scaleV)
        setSpanValue("U", scaleU)
        gl.uniform2fv(shProgram.iTexScale, [scaleU, scaleV]);
        draw();
    };
    const center = () => {
        const centerU = parseFloat(centerUInput.value);
        const centerV = parseFloat(centerVInput.value);
        gl.uniform2fv(shProgram.iTexCenter, [centerU, centerV]);
        draw();
    };
    scaleUInput.addEventListener("input", scale);
    scaleVInput.addEventListener("input", scale);
    centerUInput.addEventListener("input", center);
    centerVInput.addEventListener("input", center);

  
    const teximage = new Image();
    teximage.crossOrigin = "anonymous";
    teximage.src = "https://www.the3rdsequence.com/texturedb/download/236/texture/jpg/1024/rough+stone+rock-1024x1024.jpg";
    teximage.onload = () => {
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, teximage);

        draw();
    }

    draw();
}


function validateMin(value, minValue = 0)
{
    return value < minValue ? minValue : value;
}

function getCurrentValue(id)
{
    return document.getElementById(id).value
}

function setCurrentValue(id, value)
{
    value = validateMin(value);

    document.getElementById(id).value = value;
    document.getElementById(id+'_span').innerHTML = value;
}

const setCenter = (centerU = false, centerV = false) => {
    console.log(centerU, centerV)
    gl.uniform2fv(shProgram.iTexCenter, [centerU, centerV]);
    draw();
};


const Vpoint = 'centerV'
const Upoint = 'centerU'

document.onkeydown = (e) => {
    if (e.key === "ArrowUp" || e.key === "w") {
        setCurrentValue(
            Vpoint,
            parseFloat(getCurrentValue(Vpoint)) + 0.5
        )
    } else if (e.key === "ArrowDown" || e.key === "s") {
        setCurrentValue(
            Vpoint,
            parseFloat(getCurrentValue(Vpoint)) - 0.5
        )
    } else if (e.key === "ArrowLeft" || e.key === "a") {
        setCurrentValue(
            Upoint,
            parseFloat(getCurrentValue(Upoint)) - 0.5
        )
    } else if (e.key === "ArrowRight" || e.key === "d") {
        setCurrentValue(
            Upoint,
            parseFloat(getCurrentValue(Upoint)) + 0.5
        )
    }


    setCenter(getCurrentValue(Upoint), getCurrentValue(Vpoint))
    console.log(getCurrentValue(Vpoint), getCurrentValue(Upoint))
};