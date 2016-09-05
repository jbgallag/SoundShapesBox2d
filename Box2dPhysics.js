var Physics = window.Physics = function(element,scale) {
    var gravity = new b2Vec2(0,4.8);
    this.world = new b2World(gravity, true);
    this.element = element;
    this.context = element.getContext("2d");
    this.scale = scale || 30;
    this.dtRemaining = 0;
    this.stepAmount = 1/60;
    this.diffSumTol = 500;
};

Physics.prototype.step = function (dt,imgData,oldData) {
 
    this.dtRemaining += dt;
    while (this.dtRemaining > this.stepAmount) {
        this.dtRemaining -= this.stepAmount;
        this.world.Step(this.stepAmount,
                        8, // velocity iterations
                        3); // position iterations
    }
    this.RenderWorld(imgData,oldData);
};

Physics.prototype.RenderWorld = function(imgData,oldData) {
   // this.context.clearRect(0, 0, this.element.width, this.element.height);
    
    var obj = this.world.GetBodyList();
    
    this.context.save();
    this.context.scale(this.scale, this.scale);
    while (obj) {
        var body = obj.GetUserData();
        if (body) {
            this.HitCenterOfMass(imgData,oldData,body);
            body.draw(this.context);
        }
        
        obj = obj.GetNext();
    }
    this.context.restore();
};

Physics.prototype.click = function(callback) {
    var self = this;
    
    function handleClick(e) {
        e.preventDefault();
        var point = {
        x: (e.offsetX || e.layerX) / self.scale,
        y: (e.offsetY || e.layerY) / self.scale
        };
        console.log("Click point: ",point.x,point.y);
        self.world.QueryPoint(function(fixture) {
                              callback(fixture.GetBody(),
                                       fixture,
                                       point);
                              },point);
    }
    
    this.element.addEventListener("click",handleClick);
    this.element.addEventListener("touchstart",handleClick);
};

Physics.prototype.HitTest = function(imgData,oldData,body) {
    var sum = 0;
    if(body.details.type != "static") {
    var yStart = Math.round(body.body.GetWorldCenter().y*2 - body.details.radius)
    var yEnd  = Math.round(body.body.GetWorldCenter().y*2 + body.details.radius);
    var xStart = Math.round(body.body.GetWorldCenter().x*2 - body.details.radius);
    var xEnd  = Math.round(body.body.GetWorldCenter().x*2 + body.details.radius);
    for(var i=yStart; i<yEnd; i++) {
        for(var j=xStart; j<xEnd; j++) {
            var idx = (j + (i * 640))*4;
            if (this.isIn(j,i,body)) {
                
                sum += ((imgData.data[idx]-oldData.data[idx])*(imgData.data[idx]-oldData.data[idx]));
            }
        }
    }
    sum = Math.sqrt(sum);
    if(sum > 0 && !isNaN(sum)) {
        if(sum > this.diffSumTol) {
            var xNeg = Math.random();
            var yNeg = Math.random();
            if(xNeg < 0.5 && yNeg < 0.5)
                body.body.ApplyImpulse({ x: sum*10000, y: sum*10000}, body.body.GetWorldCenter());
            if(xNeg > 0.5 && yNeg < 0.5)
                body.body.ApplyImpulse({ x: -1.0*sum*10000, y: sum*10000}, body.body.GetWorldCenter());
            if(xNeg < 0.5 && yNeg > 0.5)
                body.body.ApplyImpulse({ x: sum*10000, y: -1.0*sum*10000}, body.body.GetWorldCenter());
            if(xNeg > 0.5 && yNeg > 0.5)
                body.body.ApplyImpulse({ x: -1.0*sum*10000, y: -1.0*sum*10000}, body.body.GetWorldCenter());

        }
    }
    }
};

Physics.prototype.HitCenterOfMass = function(imgData,oldData,body) {
    var sum = 0;
    var densSumX = 0;
    var massSumX = 0;
    var densSumY = 0;
    var massSumY = 0;
    var xCenter = 0;
    var yCenter = 0;
    var xNorm = 0;
    var yNorm = 0;
    var xSqr = 0;
    var ySqr = 0;
    var diffMag = 0;
    if(body.details.type != "static") {
        var yStart = Math.round(body.body.GetWorldCenter().y*2 - body.details.radius)
        var yEnd  = Math.round(body.body.GetWorldCenter().y*2 + body.details.radius);
        var xStart = Math.round(body.body.GetWorldCenter().x*2 - body.details.radius);
        var xEnd  = Math.round(body.body.GetWorldCenter().x*2 + body.details.radius);
        for(var i=yStart; i<yEnd; i++) {
            for(var j=xStart; j<xEnd; j++) {
                var idx = (j + (i * 640))*4;
                if (this.isIn(j,i,body)) {
                    diffMag = Math.sqrt(((imgData.data[idx]-oldData.data[idx])*(imgData.data[idx]-oldData.data[idx])));
                    densSumX = (diffMag*j)+densSumX;
                    densSumY = (diffMag*i)+densSumY;
                    massSumX = diffMag+massSumX;
                    massSumY = diffMag+massSumY;
                    //console.log("massSumX: ",massSumX)
                }
            }
        }
        
        if(massSumX > 0 && !isNaN(massSumX) && massSumX > 15000) {
            xCenter = densSumX/massSumX;
            yCenter = densSumY/massSumY;
        
            xSqr = (xCenter - (body.body.GetWorldCenter().x*2))*(xCenter - (body.body.GetWorldCenter().x*2));
            ySqr = (yCenter - (body.body.GetWorldCenter().y*2))*(yCenter - (body.body.GetWorldCenter().y*2));
        
        
            xNorm = (xCenter - (body.body.GetWorldCenter().x*2))/Math.sqrt(xSqr+ySqr);
            yNorm = (yCenter - (body.body.GetWorldCenter().y*2))/Math.sqrt(xSqr+ySqr);
        
            xNorm = xNorm*-1;
            yNorm = yNorm*-1;
            
            if(!isNaN(xNorm) && !isNaN(yNorm)) {
                body.body.ApplyImpulse({ x: (xNorm*500000), y: (yNorm*500000)}, body.body.GetWorldCenter());
            }
        }
    }
};

Physics.prototype.isIn = function(x,y,body) {
    
    var xDiff  = x - body.body.GetWorldCenter().x*2;
    var yDiff = y - body.body.GetWorldCenter().y*2;
    var dist = Math.sqrt((xDiff*xDiff)+(yDiff*yDiff));
    if(dist <= body.details.radius) {
        return true;
    } else {
        return false;
    }
}
