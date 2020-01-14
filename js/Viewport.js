class Viewport {
    constructor(app){
        this.app = app;
        this.$canvas = app.$canvas;
        this.ctx = this.$canvas.getContext("2d");
        this.ctx.lineCap = "round";

        this.lineWidth = 1;

        this.init(this.ctx);
    }

    takeMapImage(poses){
        return new Promise(res => {
            let $canvas = document.createElement("canvas");
            $canvas.width = this.app.outerWidth;
            $canvas.height = this.app.outerHeight;
    
            let ctx = $canvas.getContext("2d");
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, $canvas.width, $canvas.height);
            poses.forEach(pos => this.drawRect(ctx, pos[0], pos[1], 1, 1, {color: "#000"}));
            this.init(ctx, {padding: 0});
            
            let $image = document.createElement("img");
            $image.src = $canvas.toDataURL("image/jpeg");
            $image.onload = () => res($image);
        });
    }

}