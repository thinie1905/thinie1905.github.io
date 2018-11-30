    // Variables for referencing the canvas and 2dcanvas context
    var canvas, ctx;

    // Variables to keep track of the mouse position and left-button status 
    var mouseX,mouseY,mouseDown=0;

    // Variables to keep track of the touch position
    var touchX,touchY;

    var model;
    var coords = [];  //getting coordinate
    var classNames = [];
    var f = 0;
	
    // Clear the canvas context using the canvas width and height
    function clearCanvas(canvas,ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
	coords = [];
    }
	
    //4. Preprocess data
    function preprocess(imgData) {
	    return tf.tidy(()=>{
    		    //convert the image data to a tensor 
    		    let tensor = tf.fromPixels(imgData, numChannels= 1)
    
		    //resize to 28 x 28 
    		    const resized = tf.image.resizeBilinear(tensor, [28, 28]).toFloat()
    
		    // Normalize the image 
    		    const offset = tf.scalar(255.0);
    		    const normalized = tf.scalar(1.0).sub(resized.div(offset));
    
		    //We add a dimension to get a batch shape 
    		    const batched = normalized.expandDims(0)
    		    return batched
	    })
    }

    //3. get the best bounding box by finding the top left and bottom right cornders    
    function getMinBox(){
	    var coorX = coords.map(function(p) {return p.posX});
   	    var coorY = coords.map(function(p) {return p.posY});
   
	    //find top left corner 
   	    var min_coords = {
    		    x : Math.min.apply(null, coorX),
    		    y : Math.min.apply(null, coorY)
   	    }
   
	    //find right bottom corner 
   	    var max_coords = {
    		    x : Math.max.apply(null, coorX),
    		    y : Math.max.apply(null, coorY)
	    }
   
	    return {
		    min : min_coords,
		    max : max_coords
	    }
    }

    //2. Get current image data
    function getImageData() {
	    // the minimum bounding box around the current drawing
	    const mbb = getMinBox(); 

	    //calculate the dpi of the current window (stretch crop of the canvas) 
	    const dpi = window.devicePixelRatio;

	    //extract the image data 
	    const imgData = ctx.getImageData(mbb.min.x, mbb.min.y,
						       (mbb.max.x - mbb.min.x), (mbb.max.y - mbb.min.y));
	    return imgData;
    }	

    //1. Get prediction
    function getFrame() {
	   
    	if (coords.length >= 2) { //at least there is 2 coordinates recorded
				
        	//get the image data from the canvas 
        	const imgData = getImageData();

        	//get the prediction 
        	const pred = model.predict(preprocess(imgData)).dataSync();

        	//find the top 3 predictions 
        	const indices = findIndicesOfMax(pred, 3);
		const probs = findTopValues(pred, 5);
        	const names = getClassNames(indices);
		
		//set result
		setResult(names, probs);
    	}
    }

    function setResult(top3, probs) {
	    document.getElementById('status').innerHTML = 'Nak display result'; 
	    
	    document.getElementById('desc1').innerHTML = top3[0];
	    document.getElementById('res1').innerHTML = probs[0];
    }

    //get class name
    function getClassNames(indices) {
    	    var outp = []
    
	    for (var i = 0; i < indices.length; i++)
        	    outp[i] = classNames[indices[i]]
    
	    return outp
    }

    //get indices of the top probs
    function findIndicesOfMax(inp, count) {
   	    var outp = [];
    
	    for (var i = 0; i < inp.length; i++) {
		    outp.push(i); // add index to output array
        	    if (outp.length > count) {
            		    outp.sort(function(a, b) {
                		    return inp[b] - inp[a];
			    }); // descending sort the output array
            		    outp.pop(); // remove the last index (index of smallest element in output array)
        	    }
    	    }
    	    return outp;
    }
	
    function findTopValues(inp, count) {
    	var outp = [];
    	let indices = findIndicesOfMax(inp, count)
    
	// show 5 greatest scores
    	for (var i = 0; i < indices.length; i++)
        	outp[i] = inp[indices[i]]
    	return outp
    }



    // Keep track of the mouse button being pressed and draw a dot at current location
    function sketchpad_mouseDown() {
        mouseDown=1;
		
		//Create line drawing start
		ctx.beginPath();
		ctx.moveTo(mouseX, mouseY);
    }

    // Keep track of the mouse button being released
    function sketchpad_mouseUp() {
        mouseDown=0;
    }

    // Keep track of the mouse position and draw a dot if mouse button is currently pressed
    function sketchpad_mouseMove(e) { 
        // Update the mouse co-ordinates when moved		
        getMousePos(e);

		//Draw line stroke
		if(mouseDown==1 && mouseX >=0 && mouseY >=0){
			var pointer = {
				posX: 0,
				posY: 0
			};
			
			pointer.posX = mouseX;
			pointer.posY = mouseY;
						
		     	coords.push(pointer);
	     		
			ctx.lineTo(mouseX, mouseY);
			ctx.stroke();
		
		}
    }

    // Get the current mouse position during mousemove
    function getMousePos(e) {	    
	if (!e)
            var e = event;

        if (e.offsetX) {
            mouseX = e.offsetX;
            mouseY = e.offsetY;
        }
        else if (e.layerX) {
            mouseX = e.layerX;
            mouseY = e.layerY;
        } 
	    
	    //document.getElementById('status').innerHTML = 'mouseX = ' + mouseX;
     }

    // Get the touch position relative to the top-left of the canvas
    // When we get the raw values of pageX and pageY below, they take into account the scrolling on the page
    // but not the position relative to our target div. We'll adjust them using "target.offsetLeft" and
    // "target.offsetTop" to get the correct values in relation to the top left of the canvas.
    function getTouchPos(e) {
        var pointer;
	    
	if (!e)
            var e = event;

        if(e.touches) {
            if (e.touches.length == 1) { // Only deal with one finger
                var touch = e.touches[0]; // Get the information for finger #1
                touchX=touch.pageX-touch.target.offsetLeft;
                touchY=touch.pageY-touch.target.offsetTop;
            }
	}   
    }

    // Draw something when a touch start is detected
    function sketchpad_touchStart() {
	    //Update the touch coordinates
	    getTouchPos();
	    
	    ctx.beginPath();
	    ctx.moveTo(touchX, touchY);
	    
	    //Prevents scrolling action - result to touchmove triggering
	    event.preventDefault();
    }
  

     function sketchpad_touchMove(e) { 
        // Update the touch co-ordinates
        getTouchPos(e);

	//Draw line stroke
	ctx.lineTo(touchX, touchY);
	ctx.stroke();
		
		
        // Prevent a scrolling action as a result of this touchmove triggering.
        event.preventDefault();
    }

    async function loadClassNames(){
	    loc = 'model1/class_names.txt'
	    
	    await $.ajax({
		    url: loc,
		    dataTpe: 'text',
	    }).done(success);
    }
	    
    //load the class names
    function success(data){
	    const listNames = data.split(/\n/);
	    
	    for(var i = 0; i < listNames.length - 1;  i++){
		    let symbol = listNames[i];
		    classNames[i] = symbol;
	    }
	    
	    
	    document.getElementById('desc2').innerHTML = classNames[1];
	    document.getElementById('status').innerHTML = 'Class Name Loaded';
    }

    async function start(){	    
	//Load the model into browser
	model = await tf.loadModel('model1/model.json');
	    
	//warm up
	model.predict(tf.zeros([1, 28, 28, 1]));
	    
	document.getElementById('status').innerHTML = 'load model?';
	    
	//start
	init();
	    
	//load name
	await loadClassNames();
    }  
	 

   
    // Set-up the canvas and add our event handlers after the page has loaded
    function init() {
        // Get the specific canvas element from the HTML document
        canvas = document.getElementById('sketchpad');

        // If the browser supports the canvas tag, get the 2d drawing context for this canvas
        if (canvas.getContext)
            ctx = canvas.getContext('2d');
	    
	document.getElementById('status').innerHTML = 'Model Loaded D';

        // Check that we have a valid context to draw on/with before adding event handlers
        if (ctx) {
            // React to mouse events on the canvas, and mouseup on the entire document
            canvas.addEventListener('mousedown', sketchpad_mouseDown, false);
            canvas.addEventListener('mousemove', sketchpad_mouseMove, false);
            window.addEventListener('mouseup', sketchpad_mouseUp, false);

            // React to touch events on the canvas
            canvas.addEventListener('touchstart', sketchpad_touchStart, false);
            canvas.addEventListener('touchmove', sketchpad_touchMove, false);
        }
    }
