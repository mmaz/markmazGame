function Canvas(canvas, context, width, height) {
    this.canvas = canvas;
    this.ctx = context;
    this.width = width;
    this.height = height;
    this.background = null;
    this.intervalID = null;
    this.begin_game = false;
}
var g_canvas = null;
var g_resources = null;
var g_pbar = null;
var g_ichigo = null;

/*      Characters     */
function Character() {
    this.spritesheet = null;
    this.states = {STANCE: 0, RUN: 1, ATTACK1: 2, TURN: 3, JUMP: 4};
    this.animation_slow_factor = 3;
    this.animation_slow = 0;
    this.cur_state = 0;
    this.cur_frame = 0;
    this.attack_in_progress = function() { return this.cur_state === this.states.ATTACK1 && this.cur_frame != (this.getSI()[3] - 1); };
    this.attack_complete = function() { return this.cur_state === this.states.ATTACK1 && this.cur_frame === (this.getSI()[3] - 1); };
    this.face_left = false;
    this.xpos_bl = 70;  /* bottom left */
    this.ypos_bl = 330; /* bottom left */
                          /* [y_from_top, width, height, number_of_animation_frames] might modify this to not index properties by integer for style consistency*/
    this.state_indices = { 0: [0, 100, 110, 6], 1: [110, 100, 110, 6], 2: [220, 115, 150, 5], 3: [370, 70, 120, 1], 4: [18,100,110,3] };
    this.getSI = function() {
        return this.state_indices[this.cur_state];
    };
    this.draw = function(canvas) {
        canvas.ctx.save();
        if (this.face_left) {
            canvas.ctx.translate(this.xpos_bl + this.getSI()[1], this.ypos_bl);
            canvas.ctx.scale(-1, 1);
        }
        else {
            canvas.ctx.translate(this.xpos_bl, this.ypos_bl);
        }
        /* (image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight) */
        canvas.ctx.drawImage(this.spritesheet, this.getSI()[1] *
                this.cur_frame, this.getSI()[0], this.getSI()[1],
                this.getSI()[2], 0, 0, this.getSI()[1],  -
                (this.getSI()[2]));
        this.animation_slow = ( this.animation_slow + 1 ) % this.animation_slow_factor
        if (!(this.animation_slow)) {
            /*Freeze attack animation on last frame*/
            if (!(this.attack_complete())) {
                this.cur_frame += 1;
                this.cur_frame %= this.getSI()[3];
            }
        }
        canvas.ctx.restore();
    };
}
/*      Progress Bar   */

function progressBorder(x, y, rad, len, doFill, ctx) {
    ctx.strokeStyle = '#f00';
    ctx.fillStyle = "#BFBFBF";
    ctx.lineWidth   = 2;
    ctx.beginPath();
    ctx.moveTo(x,y);
    ctx.lineTo(x + len, y);
    ctx.arc(x + len, y + rad, rad, -Math.PI/2, Math.PI / 2, false);
    ctx.lineTo(x, y + rad * 2);
    ctx.arc(x, y + rad, rad, Math.PI/2, -Math.PI/2, false);
    ctx.closePath();
    if (doFill) {
        ctx.fill();
    }
    ctx.stroke();
    
}

function progressFilling(amt, top_left_x, y, rad, center_len, ctx) {
    var bar_width, x_start, x_end, len;
    ctx.strokeStyle = "#00f";
    ctx.fillStyle = "#BFBFBF";
    x_start = top_left_x - rad;
    x_end = top_left_x + center_len + rad;
    len = x_end - x_start;
    bar_width = Math.floor(len * amt);
    if (!(bar_width > 0 && bar_width <= len)) {
        return;
    }
    //ctx.fillRect(x_start, y, barWidth, rad);
    ctx.beginPath();
    if (bar_width < rad) {
        rt_angle = Math.acos((rad - bar_width) / rad);
        ctx.arc(top_left_x, y + rad, rad, -Math.PI - rt_angle, -Math.PI + rt_angle, false);
        ctx.lineTo(x_start + bar_width, y + rad - (Math.sin(rt_angle) * rad));
        ctx.lineTo(x_start + bar_width, y + rad + (Math.sin(rt_angle) * rad));
    }
    else if (bar_width < rad + center_len) {
        ctx.arc(top_left_x, y + rad, rad, Math.PI/2, 3 * Math.PI/2, false);
        ctx.lineTo(x_start + bar_width, y);
        ctx.lineTo(x_start + bar_width, y + 2 * rad);
    }
    else {
        rt_angle = Math.acos((rad - (len - bar_width)) / rad);
        ctx.arc(top_left_x, y + rad, rad, Math.PI/2, 3 * Math.PI/2, false);
        ctx.lineTo(top_left_x + center_len, y);
        ctx.arc(top_left_x + center_len, 
                y + rad, 
                rad, 
                3 * Math.PI/2, 
                3 * Math.PI/2 + Math.PI/2 - rt_angle, 
                false);
        ctx.lineTo(x_start + bar_width, y + rad + (Math.sin(rt_angle) * rad));
        ctx.arc(top_left_x + center_len, 
                y + rad,
                rad,
                rt_angle,
                Math.PI/2,
                false);
    }
    ctx.closePath();
    ctx.fill();
}

function progressText(text, x, y, ctx) {
    ctx.fillStyle = "#000";
    ctx.font = "bolder 12px \"Helvetica Neue\", Helvetica, Arial, sans-serif, default";
    ctx.textAlign = "center";
    ctx.fillText(text, x, y);
}

function progressDraw(progbar) {
    progbar.context.clearRect(0, 0, 600, 540);
    if (progbar.amt >= 0.999) { 
        progressBorder(progbar.x, progbar.y, progbar.rad, progbar.len, true, progbar.context);
        progressText("PRESS ARROW KEYS", progbar.tx, progbar.ty, progbar.context);
        return;
    }
    progressFilling(progbar.amt, progbar.x, progbar.y, progbar.rad, progbar.len, progbar.context);
    progressBorder(progbar.x, progbar.y, progbar.rad, progbar.len, false, progbar.context);
    progressText("GET EXCITED", progbar.tx, progbar.ty, progbar.context);
}

function ProgressBar (context) {
    this.context = context;
    this.amt = 0;  /* set from 0 to 1 */
    this.x = 40;
    this.y = 20;
    this.len = 300;
    this.rad = 10;
    this.tx = this.len / 2 + this.x;
    this.ty =  55;
    this.draw = progressDraw; 
}


/*       Background    */



function BkgdImg(img, y_pos, z_order, dx) {
    this.img = img;
    this.x_pos = 0;
    this.y_pos = y_pos;
    this.z_order = z_order;
    this.dx = dx;
}

function Background() {
    this.states = {STILL: 0, LEFT: 1, RIGHT: 2}
    this.cur_state = this.states.STILL;
    this.base_color = "#478aa8";
    this.bkgd_arr = new Array();
    this.sortBackgrounds = function() {
        var cmp = function(a,b) { 
            if (a.z_order < b.z_order)
                return -1;
            else if (a.z_order > b.z_order)
                return 1;
            return 0;
        }
        this.bkgd_arr.sort(cmp);
    };
    this.registerLayer = function(img, y_pos, z_order, dx) {
        var bim = new BkgdImg(img, y_pos, z_order, dx);
        this.bkgd_arr.push(bim);
        this.sortBackgrounds();
    };
    this.draw = function(canvas) {
        if (this.cur_state != this.states.STILL) {
            this.step(this.cur_state, canvas);
        }
        canvas.ctx.clearRect(0, 0, canvas.width, canvas.height);
        canvas.ctx.fillStyle = this.base_color;
        canvas.ctx.fillRect(0, 0, canvas.width, canvas.height);
        for (var ix in this.bkgd_arr) {
           canvas.ctx.drawImage(this.bkgd_arr[ix].img,
                   this.bkgd_arr[ix].x_pos, 0, canvas.width,
                   this.bkgd_arr[ix].img.height, 0,
                   this.bkgd_arr[ix].y_pos, canvas.width,
                   this.bkgd_arr[ix].img.height);
        }
    };
    this.step = function(state, canvas) {
        var direction = 0;
        if (state == this.states.LEFT)
            direction = -1;
        else if (state == this.states.RIGHT)
            direction = 1;
        else if (state == this.states.JUMP){
            console.log("jumping");
        }
        else
            return;
        for (var ix in this.bkgd_arr) {
            var newpos = this.bkgd_arr[ix].x_pos + (this.bkgd_arr[ix].dx * direction);
            if (newpos >= (this.bkgd_arr[ix].img.width - canvas.width)) 
                newpos %= (this.bkgd_arr[ix].img.width - canvas.width);
            else if (newpos < 0) 
                newpos += (this.bkgd_arr[ix].img.width - canvas.width);
            this.bkgd_arr[ix].x_pos = newpos;
        }
    };
}

function Resources() {
    this.callback = null;
    this.pbar = null;
    this.total_loads = null;
    this.images = new Array();
    this.pending_loads = null; /* REQUIRES PROTECTION if porting this to multithread asynchronous loading */
    this.preloadImage = function(source) {
        var im = new Image();
        im.onload = Resources.prototype.addResource;
        im.onerror = Resources.prototype.failcakes;        
        im.onabort = Resources.prototype.failcakes;        
        im.parent_resource = this;
        im.src = source;
        this.images.push(im);
    }

    this.preload = function(sources, callback, progress_bar) {
        this.callback = callback;
        this.pending_loads = sources.length;
        if (progress_bar) {
            this.pbar = progress_bar;
            this.total_loads = this.pending_loads;
            this.pbar.amt = 0;
            this.pbar.draw(this.pbar);
        }
        for (var ix in sources) {
            this.preloadImage(sources[ix]);
        }
    }
}
Resources.prototype.failcakes = function() { alert("...I'm in the middle of fixing that");};
Resources.prototype.addResource = function() {
        var x = 0;
        var pr = this.parent_resource;
        pr.pending_loads -= 1;
        if (pr.pbar) {
            pr.pbar.amt = (pr.total_loads - pr.pending_loads) / pr.total_loads;
            pr.pbar.draw(pr.pbar);
        }
        if (pr.pending_loads === 0) {
            pr.callback(pr.images);
        }
    };

function initResourcesAndCanvas() {
    var image_sources = [ "resources/mountains.png", "resources/clouds.png", "resources/buildings.png", "resources/ichigo.png"];
    var elem = document.getElementById("canvas_ele");
    var context = elem.getContext('2d'); 
    g_canvas = new Canvas(elem, context, 600, 540); /*reference store*/
    g_resources = new Resources();
    g_pbar = new ProgressBar(g_canvas.ctx);
    g_resources.preload(image_sources, gameInit, g_pbar);
}

function draw() {
    g_canvas.background.draw(g_canvas);
    g_ichigo.draw(g_canvas);
}

function gameInit(im_arr) {
    g_canvas.background = new Background();
    g_ichigo = new Character();
    g_canvas.background.registerLayer(im_arr[0], 354, 0, 3);
    g_canvas.background.registerLayer(im_arr[1], 0, 2, 7) ;
    g_canvas.background.registerLayer(im_arr[2], 425, 1, 5);
    g_ichigo.spritesheet = im_arr[3];
    //g_canvas.background.draw(g_canvas);
    window.addEventListener('keydown', function(event) { keyDownHandler(event, g_canvas); }, true);
    window.addEventListener('keyup', function(event) { keyUpHandler(event, g_canvas); }, true);
}


function keyUpHandler(event, canvas) {
    //console.log(event.keyCode);
    if (!(g_ichigo.attack_in_progress())) {
        g_ichigo.cur_state = g_ichigo.states.STANCE; 
    }
    /*switch(event.keyCode) {
        case 88:
            g_ichigo.cur_frame = 0;
            break;
    }
    */

    canvas.background.cur_state = canvas.background.states.STILL;
}

function keyDownHandler(event, canvas) {
    if (!canvas.begin_game) {
        canvas.begin_game = true;
        canvas.intervalID = setInterval(draw, 30);
    }
    switch (event.keyCode) {
        case 39: //right arrow
            g_ichigo.face_left = false;
            canvas.background.cur_state = canvas.background.states.RIGHT;
            g_ichigo.cur_state = g_ichigo.states.RUN;
            break;
        case 37: //left arrow
            g_ichigo.face_left = true;
            canvas.background.cur_state = canvas.background.states.LEFT;
            g_ichigo.cur_state = g_ichigo.states.RUN;
            break;
        case 38: //up arrow
            g_ichigo.cur_state = g_ichigo.states.JUMP;
            console.log('jump');
            break;
        case 88: //x
            canvas.background.cur_state = canvas.background.states.STILL;
            if (!(g_ichigo.attack_in_progress())) { 
                g_ichigo.cur_frame = 0;
                g_ichigo.cur_state = g_ichigo.states.ATTACK1;
            }
            break;
    }

}
window.onload = initResourcesAndCanvas;
