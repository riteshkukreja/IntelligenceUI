var Intelligence = function(config) {

	"use strict";

	/***************************************************************************/
	/***************************** Configurations ******************************/
	/***************************************************************************/

	// If config object is provided then use it otherwise use default values
	config = config || {};

	// Get Canvas element from the configurations if exists otherwise create one and append to body
	var canvas;
	if(!config.canvas) {
		canvas = document.createElement("canvas");
		document.body.appendChild(canvas);
	} else {
		canvas = config.canvas;
	}

	// Retrieve context object
	var context = canvas.getContext("2d");

	// set canvas width and height
	canvas.width = config.width || window.innerWidth;
	canvas.height = config.height || window.innerHeight;

	// boolean defining whether to use custom framerate or predefined by browser
	const frameRate = config.frameRate || -1;

	// Holds all the visible points on the canvas
	var points = [];

	// The time period between the points and lines can be added
	const minTime = config.minTime || 500;
	const maxTime = config.maxTime || 2000;

	// A unique id to refer any given line
	var lineId = 0;

	// All the possible colors for the points and lines
	const colors = config.colors || [
		"rgba(180, 50, 60, .5)", 
		"rgba(30, 60, 200, .5)",
		"rgba(26,188,156 , 1)",
		"rgba(46,204,113 ,1)",
		"rgba(52,152,219 ,1)",
		"rgba(155,89,182 ,1)",
		"rgba(241,196,15 ,1)",
		"rgba(230,126,34 ,1)",
		"rgba(231,76,60 ,1)",
		"rgba(149,165,166 ,1)",
		"rgba(236,240,241 ,1)"
	];

	// Background color of the canvas
	const background = config.background || "rgba(11,13,20,1)";

	// smaller box inside the canvas in which the points will be created
	const box = config.box || [100, 100, canvas.width - 100, canvas.height - 100];

	// Point size
	const randomizePoint = config.randomizePoint || false;
	const minPointSize = config.minPointSize || 3;
	const maxPointSize = config.maxPointSize || 10;
	const pointSize = config.pointSize || 5;

	// boolean determining if different colors can be connected
	const connectAll = config.connectAll || false;


	/***************************************************************************/
	/********************************* Methods *********************************/
	/***************************************************************************/

	/**
	 *	RANDOM()
	 *	Returns a random integer inside a range
	 *
	 *	@Param: min - lowest number possible
	 *	@Param: max - highest number possible
	**/
	var random = function(min, max) {
		// return a random integer between min and max 
		return Math.floor(Math.random() * (max - min)) + min;
	};

	/**
	 *	ADDAGE()
	 *	Returns a rgba string denoting the color with alpha/opacity defined by the age
	 *
	 *	@Param: rgba - original rgba string
	 *	@Param: age - number between 0 and 1 denoting the opacity
	**/
	var addAge = function(rgba, age) {
		// Set opacity in a rgba string
		var splitted = rgba.split(",");

		// return rgba string with fourth part of the string changed according to age
		return splitted[0] + "," + splitted[1] + "," + splitted[2] + ", " + age + ")";
	};

	/**
	 *	MINAGE()
	 *	Returns a minimum age between two points depending upon if they are newBorn or not
	 *
	 *	@Param: a - first point object
	 *	@Param: b - second point object
	**/
	var minAge = function(a, b) {
		// if both of them are not newBorn ( with decreasing opacity)
		if(!a.newBorn && !b.newBorn)
			// then choose the minimum one
			return (a.age < b.age ? a.age : b.age);
		// if one is increasing and other is decreasing then choose the one decreasing
		if(!a.newBorn)
			return a.age;
		if(!b.newBorn)
			return b.age;

		// if both of them increasing then set 1 as maximum
		return 1;
	};

	/**
	 *	POINT()
	 *	Constructor of Point Object
	 *
	 *	@Param: x - x position of the point on the canvas
	 *	@Param: y - y position of the point on the canvas
	 *	@Param: r - Radius of the point
	 *	@Param: color - color of the point
	**/
	var Point = function(x, y, r, color) {
		// Position of the point inside the canvas
		this.x = x;
		this.y = y;

		// Radius of the point
		this.r = r;

		// Color of the point
		this.color = color;

		// All connected points using line object
		this.lines = [];

		// Age of the line - determines the opacity / alpha of the color
		this.age = 0;

		// Determines the increase/decrease in age 
		// true - age is increasing
		// false - age is decreasing
		this.newBorn = true;

		// Add a given line as connected point
		this.add = function(line) {
			this.lines.push(line);
		};

		// Remove a line from the array using unique Id
		this.remove = function(id) {
			for(var i = this.lines.length-1; i >= 0; i--) {
				if(this.lines.id == id) {
					this.lines.splice(i, 1);
					break;
				}
			}
		};

		// Draw method for the point
		this.draw = function() {
			// Only draw if the line is visible
			if(this.age < 0) return;

			// if newly generate - increase its age/opacity until it reaches 1
			if(this.newBorn) {
				// repeaditely increase the age
				this.age += .005;
				if(this.age >= 1)
					// if grown up - change newBorn to false
					this.newBorn = false;
			} else {
				// Decrease age slower
				this.age -= .001;
			}

			// Give shadow with the same color but hiher opacity for dramatic effect
			context.shadowBlur = 50;
			context.shadowColor = addAge(this.color, 0.8);

			// set color according to opacity
			context.fillStyle = addAge(this.color, this.age);

			// Start drawing - create a circle on the given position with the given color
			context.beginPath();
			context.arc(this.x, this.y, this.r, 0, 2*Math.PI);
			context.fill();

			// draw all the connected lines
			// @TODO: figure out a way to draw a line once, right now this draws a line twice because a line is connected to two end points
			// Removing from one end point will not allow to remove line if that end point dies
			for(var i = 0; i < this.lines.length; i++) {
				this.lines[i].draw();
			}
		};
	};

	/**
	 *	LINE()
	 *	Constructor of Line Object
	 *
	 *	@Param: id - Unique ID of the line for identification
	 *	@Param: p1 - first point object
	 *	@Param: p2 - second point object
	 *	@Param: color - color of the line
	**/
	var Line = function(id, p1, p2, color) {
		// Track both end points
		this.prev = p1;
		this.next = p2;

		// Color of the line
		this.color = color;

		// Unique identifier of the line
		this.id = id;

		// Age of the line - determines the opacity / alpha of the color
		this.age = 0;

		// Determines the increase/decrease in age 
		// true - age is increasing
		// false - age is decreasing
		this.newBorn = true;

		// Draw method for the line
		this.draw = function() {
			// Only draw if the line is visible
			if(this.age < 0) return;

			// if newly generate - increase its age/opacity until it reaches 1 or minimum among its endpoints
			if(this.newBorn) {
				// repeaditely increase the age
				this.age += .005;
				if(this.age >= minAge(this.prev , this.next))
					// if grown up - change newBorn to false
					this.newBorn = false;
			} else {
				// Decrease age slower
				this.age -= .0005;
			}

			// set color according to opacity
			context.strokeStyle = addAge(this.color, this.age);

			// Give lineWidth to make it visible enough
			context.lineWidth = 2;

			// Give shadow with the same color but hiher opacity for dramatic effect
			context.shadowBlur = 20;
			context.shadowColor = addAge(this.color, 0.8);

			// Start drawing - create a line from one end point to another and stroke it
			context.beginPath();
			context.moveTo(this.prev.x, this.prev.y);
			context.lineTo(this.next.x, this.next.y);
			context.stroke();
		};
	};

	/**
	 *	ADDPOINT()
	 *	Utlity Method to generate point and a line connecting the two points
	 *
	 *	@Param: x - x position of the point on the canvas
	 *	@Param: y - y position of the point on the canvas
	 *	@Param: r - Radius of the point
	 *	@Param: color - color of the point
	**/
	var addPoint = function(x, y, r, color) {
		// create a new point
		var p = new Point(x, y, r, color);

		// Get another random point from the list
		var pos = random(0, points.length);

		// if there is another point
		if(pos > -1 && points[pos]) {
			// if both of them are of same color then connect else leave them be
			// or if configuration set all colors to be connected
			if(p.color === points[pos].color || connectAll) {
				var line = new Line(lineId++, p, points[pos], color);
				p.add(line);
				points[pos].add(line);
			}
		}

		// add point to the list
		points.push(p);
	};

	/**
	 *	REMOVEPOINT()
	 *	Utlity Method to remove the given point and lines connected to the point
	 *
	 *	@Param: id - Position of the point inside the points array
	**/
	var removePoint = function(id) {
		// Make sure its a valid point
		if(id < 0 || points.length <= id) return;

		// iterate over the point and remove all lines going through it
		for(var i = 0; i < points[id].lines.length; i++) {
			for(var j = 0; j < points.length; j++) {
				if(j == id) continue;

				points[j].remove(points[id].lines[i].id);
			}
		}

		// Remove the point from the list
		points.splice(id, 1);
	};

	/**
	 *	CLEAR()
	 *	Utlity Method to clear the canvas and fill it using given color
	 *
	 *	@Param: color - Background color of the canvas
	**/
	var clear = function(color) {
		// Clear the canvas by drawing over with the given color
		context.fillStyle = color;
		context.fillRect(0, 0, canvas.width, canvas.height);
	};

	/**
	 *	UPDATEADD()
	 *	Utlity Method to generate point and/or a line connecting the two random points
	**/
	var updateAdd = function() {
		// Randomly create new points or connect olders
		setTimeout(updateAdd, random(minTime, maxTime));

		// two random events
		// 1. draw one new point
		// 2. connect two existing points

		// Create a new point if available points are less than 5 or randomly
		if(random(1, 10) <= 3 || points.length < 5) {
			// draw one point and connect it with one another
			/*var xPos = random(0, canvas.width);
			var yPos = random(0, canvas.height);*/
			var xPos = random(box[0], box[2]);
			var yPos = random(box[1], box[3]);

			// Handle random size condition
			var r;
			if(randomizePoint) r = random(minPointSize, maxPointSize);
			else  r = pointSize;

			// Get a random color from the colors array
			var color = colors[random(0, colors.length)];

			// Add the point to the list
			addPoint(xPos, yPos, r, color);
		} else {
			// connect two existing points
			var p1 = points[random(0, points.length)];
			var p2 = points[random(0, points.length)];

			// Connect both points only if both are different
			if(p2 != p1 && (p1.color === p2.color || connectAll)) {
				var line = new Line(lineId++, p1, p2, p1.color);
				p1.add(line);
				p2.add(line);
			} else {
				// Do nothing for now
			} 
		}		
	};

	/**
	 *	UPDATEREMOVE()
	 *	Utlity Method to remove all the invisible points and lines from the canvas
	**/
	var updateRemove = function() {
		// Remove points which are no longer visible
		for(var i = points.length-1; i >= 0; i--) {
			if(points[i].age < 0)
				removePoint(i);
		}
	};

	/**
	 *	DRAW()
	 *	Utlity Method to draw all the points and lines on the canvas
	**/
	var draw = function() {
		// Handle custom framerate condition
		// if user specified famerate then use it
		if(frameRate > -1) {
			setTimeout(draw, 1000 / frameRate);
		} else {
			requestAnimationFrame(draw);
		}

		// Remove all the hidden points
		updateRemove();

		// Clear the canvas using background color
		clear(background);

		// Draw all the points
		for(var p of points) {
			p.draw();
		}
	};


	/***************************************************************************/
	/************************** Self Invoked Scripts ***************************/
	/***************************************************************************/

	// Call the updateAdd() to add points on the canvas
	updateAdd();

	// Call the draw() to show all the points and lines on the canvas
	draw();
};