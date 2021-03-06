var model;
var canvas;
var classNames = [];
var canvas;
var coords = [];
var mousePressed = false;
var k = 0;

//prepare the drawing canvas 
$(function() {
    canvas = window._canvas = new fabric.Canvas('canvas');
    canvas.backgroundColor = '#ffffff';
    canvas.isDrawingMode = 0;
    canvas.freeDrawingBrush.color = "black";
    canvas.freeDrawingBrush.width = 4;
    canvas.renderAll();
    //setup listeners 
    canvas.on('mouse:up', function(e) {
        mousePressed = false
    });
    canvas.on('mouse:down', function(e) {
        mousePressed = true
    });
    canvas.on('mouse:move', function(e) {
        recordCoor(e)
    });
})

//set the table of the predictions 
function setTable(result, probs) {
      
    //loop over result of prediction
    for (var i = 0; i < result.length; i++) {
        if (k == 0 && result[i] == "hand"){
            document.getElementById('prob1').innerHTML = (((probs[i] * 100).toFixed(2)) * 17 / 100).toFixed(3)
        } else if (k == 1 && result[i] == "face"){
             document.getElementById('prob2').innerHTML = (((probs[i] * 100).toFixed(2)) * 17 / 100).toFixed(3)
        } else if (k == 2 && result[i] == "foot"){
             document.getElementById('prob3').innerHTML = (((probs[i] * 100).toFixed(2)) * 17 / 100).toFixed(3)
        }
    }

}

//record the current drawing coordinates
function recordCoor(event) {
    var pointer = canvas.getPointer(event.e);
    var posX = pointer.x;
    var posY = pointer.y;

    if (posX >= 0 && posY >= 0 && mousePressed) {
        coords.push(pointer)
    }
}

/*
get the best bounding box by trimming around the drawing
*/
function getMinBox() {
    //get coordinates 
    var coorX = coords.map(function(p) {
        return p.x
    });
    var coorY = coords.map(function(p) {
        return p.y
    });

    //find top left and bottom right corners 
    var min_coords = {
        x: Math.min.apply(null, coorX),
        y: Math.min.apply(null, coorY)
    }
    var max_coords = {
        x: Math.max.apply(null, coorX),
        y: Math.max.apply(null, coorY)
    }

    //return as strucut 
    return {
        min: min_coords,
        max: max_coords
    }
}

//get the current image data 
function getImageData() {
        //get the minimum bounding box around the drawing 
        const mbb = getMinBox()

        //get image data according to dpi 
        const dpi = window.devicePixelRatio
        const imgData = canvas.contextContainer.getImageData(mbb.min.x * dpi, mbb.min.y * dpi,
                                                      (mbb.max.x - mbb.min.x) * dpi, (mbb.max.y - mbb.min.y) * dpi);
        return imgData
    }

//get the prediction 
function getFrame() {
    //make sure we have at least two recorded coordinates 
    if (coords.length >= 2) {

        //get the image data from the canvas 
        const imgData = getImageData()

        //get the prediction 
        const pred = model.predict(preprocess(imgData)).dataSync()

        //find the top 5 predictions 
        const indices = findIndices(pred)
        const names = getClassNames(pred, indices, 1)
        const probs = getClassNames(pred, indices, 2)

        //set the table 
        setTable(names, probs)
    }

}

function drawingResult(){
    if (k < 3){  
        getFrame()
        erase()
        
        if (k == 0)
            document.getElementById('drawStat').innerText = 'Draw Face'
        else if (k == 1){
            document.getElementById('drawStat').innerText = 'Draw Foot'
        } else if (k == 2)
            document.getElementById("nextButton").textContent = "Done"
        
        k = k + 1
    }
    else if (k == 3){
        var score1 = document.getElementById('prob1').innerHTML;
        var score2 = document.getElementById('prob2').innerHTML;
        var score3 = document.getElementById('prob3').innerHTML;
        
        var total = Number(score1) + Number(score2) + Number(score3);
        document.getElementById('prob4').innerHTML = total;
        document.getElementById('scoringModal').innerText = "The total score of 3 drawings = " + total;
    }
}

//get the the class names 
function getClassNames(inp, indices, choice) {
    var outp = []
    var probso = []
    var temp = ""
    var j=0;
    
    for (var i = 0; i < indices.length; i++){
        temp = classNames[indices[i]]
        
        if (temp == "hand" || temp == "face" || temp == "foot"){
            outp[j] = temp
            probso[j] = inp[indices[i]]
            j++
        }
    }        
    if (choice == 1)
        return outp
    else if (choice == 2)
        return probso
        
}

//load the class names 
async function loadClassNames() {
 
    loc = 'model/class_names.txt'
    
    await $.ajax({
        url: loc,
        dataType: 'text',
    }).done(success);
}

//load the class names
function success(data) {
    const lst = data.split(/\n/)
    for (var i = 0; i < lst.length - 1; i++) {
        let symbol = lst[i]
        classNames[i] = symbol
    }
}

//get indices of the top probs
function findIndices(inp) {
    var outp = [];
    for (var i = 0; i < inp.length; i++) {
        outp.push(i); // add index to output array
    }
    return outp;
}


//preprocess the data
function preprocess(imgData) {
    return tf.tidy(() => {
        //convert to a tensor 
        let tensor = tf.fromPixels(imgData, numChannels = 1)
        
        //resize 
        const resized = tf.image.resizeBilinear(tensor, [28, 28]).toFloat()
        
        //normalize 
        const offset = tf.scalar(255.0);
        const normalized = tf.scalar(1.0).sub(resized.div(offset));

        //We add a dimension to get a batch shape 
        const batched = normalized.expandDims(0)
        return batched
    })
}

//load the model
async function start() {
        
    //load the model 
    model = await tf.loadModel('model/model.json')
    
    //warm up 
    model.predict(tf.zeros([1, 28, 28, 1]))
    
    //allow drawing on the canvas 
    allowDrawing()
    
    //load the class names
    await loadClassNames()
}

//allow drawing on canvas
function allowDrawing() {
    canvas.isDrawingMode = 1;
    
    document.getElementById('status').innerHTML = 'Start Drawing!';
    document.getElementById('drawStat').innerText = 'Draw Hand';
   
    $('button').prop('disabled', false);
    /*var slider = document.getElementById('myRange');
    slider.oninput = function() {
        canvas.freeDrawingBrush.width = this.value;
    };*/
}

function startAgain(){
    canvas.clear();
    canvas.backgroundColor = '#ffffff';
    coords = [];
    k = 0;
    
    document.getElementById('drawStat').innerText = 'Draw Hand';
    document.getElementById("nextButton").textContent = "Next"
    
     for (var i = 0; i < 4; i++) 
        document.getElementById('prob' + (i + 1)).innerHTML = ""
}

//clear the canvas 
function erase() {
    canvas.clear();
    canvas.backgroundColor = '#ffffff';
    coords = [];
}
