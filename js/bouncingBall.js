(function() {

  // Customizable state values
  var spheres = [],
    sphereRadius,
    gravity,
    // acceleration,
    velocity,
    position,
    stepSize,
    coefficient_of_friction,
    coefficient_of_restitution,
    airResistanceConstant,
    sphereMass;

  var camera, scene, renderer, spheres = [], planes = {}, player = null,
      windowWidth = window.innerWidth-100,
      windowHeight = window.innerHeight-100,
      windowDepth = 1000,
      maxwidth = windowWidth/2,
      maxheight = windowHeight/2,
      maxdepth = windowDepth/2,
      planeStartTime = 400,
      planeStartOpacity = 0.4,
      animating = false;

  var planeLocation = {
      LEFT: 0,
      RIGHT: 1,
      TOP: 2,
      BOTTOM: 3,
      BACK: 4,
      FRONT: 5
  };

  var leftPlaneX, rightPlaneX, bottomPlaneY, topPlaneY, frontPlaneZ, backPlaneZ;

  function plane( mesh ) {
    this.mesh = mesh;
    this.timeleft = planeStartTime;

    this.reset = function () {
        this.timeleft = planeStartTime;
        this.mesh.material.opacity = planeStartOpacity;
    }

    this.updateMesh = function( elapsed ) {
      // First check if there is still time left in the animation
      if (this.timeleft > 0)
        this.timeleft -= elapsed;
      // After potential subtraction of the elapsed time, check again
      if (this.timeleft > 0) {
        // Opacity is a linear function of the time that is left of the animation
        // opacity = originalOpacity * timeleft / starttime
        this.mesh.material.opacity = planeStartOpacity + (1.0 - planeStartOpacity) * (this.timeleft / planeStartTime);
      }
      else {
        this.mesh.material.opacity = planeStartOpacity;
      }
    }
  }

  function sphere( mesh ) {
    this.mesh = mesh;
    this.velocity = velocity;
    this.mesh.position.set(position[0], position[1], position[2]);
    this.getNextPosition = function(stepSize, velocity) {
      var nextX = this.mesh.position.x + stepSize * velocity[0]
      var nextY = this.mesh.position.y + stepSize * velocity[1]
      var nextZ = this.mesh.position.z + stepSize * velocity[2]

      return [
        nextX,
        nextY,
        nextZ
      ]
    }

    this.getNextVelocity = function(stepSize, acceleration, collision = null) {
      if (collision) {
        switch(collision) {
          case 'leftPlaneX':
          case 'rightPlaneX':
            return [
              -coefficient_of_restitution * this.velocity[0],
              (1 - coefficient_of_friction) * this.velocity[1],
              this.velocity[2]
            ]
          case 'topPlaneY':
          case 'bottomPlaneY':
            return [
              (1 - coefficient_of_friction) * this.velocity[0],
              -coefficient_of_restitution * this.velocity[1],
              this.velocity[2]
            ]
          case 'frontPlaneZ':
          case 'backPlaneZ':
            return [
              this.velocity[0],
              (1 - coefficient_of_friction) * this.velocity[1],
              -coefficient_of_restitution * this.velocity[2]
            ]
        }
      }
      return [
        this.velocity[0] + stepSize * acceleration[0],
        this.velocity[1] + stepSize * acceleration[1],
        this.velocity[2] + stepSize * acceleration[2]
      ]
    }

    this.updatePosition = function (nextPosition) {
      this.mesh.position.x = nextPosition[0]
      this.mesh.position.y = nextPosition[1]
      this.mesh.position.z = nextPosition[2]
    }

    this.updateVelocity = function (nextVelocity) {
      this.velocity[0] = nextVelocity[0]
      this.velocity[1] = nextVelocity[1]
      this.velocity[2] = nextVelocity[2]
    }

    this.willCollide = function(nextPosition) {
      var collision = false
      var x = nextPosition[0]
      var y = nextPosition[1]
      var z = nextPosition[2]
      var collisions = []

      var differentSigns = function (plane, before, after) {
        return (Math.sign(before - plane) !== Math.sign(after - plane)) || ((before - plane) === 0)
      }

      if (differentSigns(rightPlaneX, this.mesh.position.x, x)) {
        hitPlane(planeLocation.RIGHT);
        var f = ((rightPlaneX - this.mesh.position.x)/(x - this.mesh.position.x + 1))
        collisions.push([isNaN(f) ? 0 : f, 'rightPlaneX'])
      }
      else if (differentSigns(leftPlaneX, this.mesh.position.x, x)) {
        hitPlane(planeLocation.LEFT);
        var v = ((leftPlaneX - this.mesh.position.x)/(x - this.mesh.position.x + 1))
        collisions.push([isNaN(f) ? 0 : f, 'leftPlaneX'])
      }

      if (differentSigns(topPlaneY, this.mesh.position.y, y)) {
        hitPlane(planeLocation.TOP);
        var f = ((topPlaneY - this.mesh.position.y)/(y - this.mesh.position.y + 1))
        collisions.push([isNaN(f) ? 0 : f, 'topPlaneY'])
      } else if (differentSigns(bottomPlaneY, this.mesh.position.y, y)) {
        hitPlane(planeLocation.BOTTOM);
        var f = ((bottomPlaneY - this.mesh.position.y)/(y - this.mesh.position.y )) 
        collisions.push([isNaN(f) ? 0 : f, 'bottomPlaneY'])
      }
      // TODO :: Seems like the z-coordiante is flipped, not sure why...hmmm...
      if (differentSigns(frontPlaneZ, this.mesh.position.z, z)) {
        hitPlane(planeLocation.FRONT);
        var f = ((frontPlaneZ - this.mesh.position.z)/(z - this.mesh.position.z))
        collisions.push([isNaN(f) ? 0 : f, 'frontPlaneZ'])
      }
      else if (differentSigns(backPlaneZ, this.mesh.position.z, z)) {
        hitPlane(planeLocation.BACK);
        var f = ((backPlaneZ - this.mesh.position.z)/(z - this.mesh.position.z)) 
        collisions.push([isNaN(f) ? 0 : f, 'backPlaneZ'])
      }
      return collisions
    }

    this.handleCollisionEdgeCases = function() {
	if (this.mesh.position.x >= (maxwidth-sphereRadius)) {
	    hitPlane(planeLocation.RIGHT);
	    this.velocity[0] *= -1;
	    this.mesh.position.x = maxwidth - sphereRadius - 1;
	}
	else if (this.mesh.position.x <= -(maxwidth-sphereRadius)) {
	    hitPlane(planeLocation.LEFT);
	    this.velocity[0] *= 1;
	    this.mesh.position.x = -(maxwidth - sphereRadius - 1);
	}

	if (this.mesh.position.y >= (maxheight-sphereRadius)) {
	    hitPlane(planeLocation.TOP);
	    this.velocity[1] *= -1;
	    this.mesh.position.y = (maxheight - sphereRadius - 1);
	}
	else if (this.mesh.position.y <= -(maxheight-sphereRadius)) {
	    hitPlane(planeLocation.BOTTOM);
	    this.velocity[1] *= 1;
	    this.mesh.position.y = -(maxheight - sphereRadius - 1);
	}

	if (this.mesh.position.z >= (maxdepth-sphereRadius)) {
	    this.velocity[2] *= -1;
	    this.mesh.position.z = (maxdepth - sphereRadius - 1);
	}
	else if (this.mesh.position.z <= -(maxdepth-sphereRadius)) {
	    hitPlane(planeLocation.BACK);
	    this.velocity[2] *= 1;
	    this.mesh.position.z = -(maxdepth - sphereRadius - 1);
	}
    }

    this.updateSphereState = function () {
      var velocity = this.velocity;
      var currentAcceleration = [
        -airResistanceConstant * this.velocity[0],
        (-airResistanceConstant * this.velocity[1] + gravity),
        -airResistanceConstant * this.velocity[2]
      ]
      var nextPosition = this.getNextPosition(stepSize, velocity)
      var nextVelocity = this.getNextVelocity(stepSize, currentAcceleration)
      var collisions = this.willCollide(nextPosition)
      if (collisions.length > 0) {
        // TODO :: Deal with simultaneous collisions
        var [f, planeLabel] = collisions[0]
        this.updatePosition(this.getNextPosition(0.99 * f * stepSize, velocity))
        this.updateVelocity(this.getNextVelocity(stepSize, currentAcceleration, planeLabel))
        // }
      } else {
        this.updatePosition(nextPosition)
        this.updateVelocity(nextVelocity)
      }
      this.handleCollisionEdgeCases();
    }
  }

  function Player() {
      this.forward = false;
      this.backward = false;
      this.left = false;
      this.right = false;

      this.toggleMovement = function (keyCode, directionBool) {
          switch (keyCode) {
              case 37:  // Leftarrow
              case 65:  // Leftarrow
                  this.left = directionBool;
                  break;
              case 38:  // Up arrow
              case 87:  // Up arrow
                  this.forward = directionBool;
                  break;
              case 39:  // Right arrow
              case 68:  // Right arrow
                  this.right = directionBool;
                  break;
              case 40:  // Down arrow
              case 83:  // Down arrow
                  this.backward = directionBool;
                  break;

          }
      }

      this.updatePosition = function (elapsed) {
          var curPosX = camera.position.x;
          var curPosZ = camera.position.z;
          var curRot = camera.rotation.y;

          var tr = 10.0;
          var rot = 0.025;


          if (this.forward) {
              curPosX -= Math.sin(-curRot) * -tr;
              curPosZ -= Math.cos(-curRot) * tr;
          }
          else if (this.backward) {
              curPosX -= Math.sin(curRot) * -tr;
              curPosZ += Math.cos(curRot) * tr;
          }

          if (this.left) {
              curRot += rot;
          }
          else if (this.right) {
              curRot -= rot;
          }

          camera.rotation.y = curRot;
          camera.position.x = curPosX;
          camera.position.z = curPosZ;
      }

      // Register the player for key events.
      var closure = this;
      var startMoveEvent = function(keyEvent) {
          closure.toggleMovement(keyEvent.keyCode, true);
      }

      var endMoveEvent = function(keyEvent) {
          closure.toggleMovement(keyEvent.keyCode, false);
      }

      document.addEventListener('keydown', startMoveEvent);
      document.addEventListener('keyup', endMoveEvent);
  }

  function init() {
    spheres = [],
    sphereRadius = parseFloat($("#sphere-radius").val())
    leftPlaneX = -(maxwidth - sphereRadius)
    rightPlaneX = (maxwidth - sphereRadius)
    bottomPlaneY = -(maxheight - sphereRadius)
    topPlaneY = (maxheight - sphereRadius)
    frontPlaneZ = (maxdepth - sphereRadius)
    backPlaneZ = -(maxdepth - sphereRadius)
    gravity = parseFloat($("#gravity").val())
    coefficient_of_friction = parseFloat($("#friction").val());
    coefficient_of_restitution = parseFloat($("#restitution").val());
    // acceleration = [0, gravity, 0]
    stepSize = parseFloat($("#step-size").val())
    sphereMass = parseFloat($("#sphere-mass").val())
    airResistanceConstant = parseFloat($("#air-resistance").val())/sphereMass
    velocity = [
      parseFloat($("#velocity-x").val() || 20 + Math.random() * 100),
      parseFloat($("#velocity-y").val() || 20 + Math.random() * 100),
      parseFloat($("#velocity-z").val() || 20 + Math.random() * 100)
    ]
    position = [
      parseFloat($("#position-x").val()),
      parseFloat($("#position-y").val()),
      parseFloat($("#position-z").val())
    ]
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, windowWidth / windowHeight, 1, 10000);
    camera.position.z = 2000;

    // The light is at the upper right corner of the room.
    var pointLight = new THREE.PointLight(0xffffff);
    pointLight.position.x = maxwidth - 50;
    pointLight.position.y = maxheight - 50;
    pointLight.position.z = maxdepth - 50;
    scene.add( pointLight );

    var geometry = new THREE.SphereGeometry( sphereRadius, 10, 10);
    var material = new THREE.MeshLambertMaterial( { color: 0xff0000 } );

    spheres[0] = new sphere ( new THREE.Mesh( geometry, material ) );

    scene.add( spheres[0].mesh );
    initPlanes();

    player = new Player();

    renderer = new THREE.WebGLRenderer({ alpha: true });
    renderer.setSize( windowWidth, windowHeight );
    renderer.setClearColor( 'lightsalmon');

    var renderarea = document.getElementById('render-area');
    // Remove all existing nodes.
    while (renderarea.firstChild) {
        renderarea.removeChild(renderarea.firstChild);
    }

    renderarea.appendChild( renderer.domElement );

    lastTime = new Date();
  }

  function initPlanes() {
      initPlane(planeLocation.TOP);
      initPlane(planeLocation.BOTTOM);
      initPlane(planeLocation.RIGHT);
      initPlane(planeLocation.LEFT);
      initPlane(planeLocation.BACK);
      initPlane(planeLocation.FRONT);
  }

  function initPlane( planeLoc ) {
      var w, h, posx = 0, posy = 0, posz = 0, rotx = 0, roty = 0, rotz = 0;

      switch (planeLoc) {
          case planeLocation.BACK:
              w = windowWidth;
              h = windowHeight;
              posz = -maxdepth;
              break;
          // case planeLocation.FRONT:
          //     w = windowWidth;
          //     h = windowHeight;
          //     posz = -maxdepth;
          //     break;
          case planeLocation.LEFT:
              w = windowDepth;
              h = windowHeight;
              posx = -maxwidth;
              roty = Math.PI/2;
              break;
          case planeLocation.RIGHT:
              w = windowDepth;
              h = windowHeight;
              posx = maxwidth;
              roty = -Math.PI/2;
              break;
          case planeLocation.BOTTOM:
              w = windowWidth;
              h = windowDepth;
              posy = -maxheight;
              rotx = -Math.PI/2;
              break;
          case planeLocation.TOP:
              w = windowWidth;
              h = windowDepth;
              posy = maxheight;
              rotx = Math.PI/2;
              break;
      }

      geometry = new THREE.PlaneGeometry( w, h );
      material = new THREE.MeshLambertMaterial( { color: 0xd4ff00, opacity: planeStartOpacity, transparent: true } );
      planeMesh = new THREE.Mesh( geometry, material );
      planeMesh.position.x = posx;
      planeMesh.position.y = posy;
      planeMesh.position.z = posz;
      planeMesh.rotation.x = rotx;
      planeMesh.rotation.y = roty;
      planeMesh.rotation.z = rotz;

      var thePlane = new plane ( planeMesh );
      planes[planeLoc] = thePlane;

      scene.add( thePlane.mesh );
  }


  function hitPlane(planeLoc) {
    planes[planeLoc].reset();
  }

  var lastTime = 0;

  function animate() {
    if (animating) {
      // note: three.js includes requestAnimationFrame shim
      var now = new Date();
      var elapsed = now.getTime() - lastTime.getTime();
      lastTime = now;

      for (var i = 0; i < spheres.length; i++) {
        spheres[i].updateSphereState();
      }

      for (var i in planes) {
          planes[i].updateMesh( elapsed );
      }

      player.updatePosition(elapsed);

      window.animationId = requestAnimationFrame( animate );
      render();
    }
  }

  function render() {
    renderer.render(scene, camera)
  }

  var BouncingBall = function() {};

  BouncingBall.prototype.start = function() {
    if (window.animationId !== null)
      cancelAnimationFrame(window.animationId);
    init();
    animating = true;
    animate();
  }

  BouncingBall.prototype.stop = function() {
    animating = false;
  }

  window.BouncingBall = new BouncingBall();
})()
