class Blueprint {
    constructor(app, type = null){
        this.app = app;
        this.typeIdx = type;

        this.label = true;
        this.width = 80;
        this.height = 40;

        this.ctx = this.app.ctx;

        this.lineWidth = 1;
        this.boothList = [];
        this.selection = null;
        this.movement = null;

        this.$saveItem = document.createElement("div");
        this.$delete_btn = document.createElement("button");
        this.$delete_btn.classList.add("closed");
        this.$image = document.createElement("img");
        this.$saveItem.append(this.$image);
        this.$saveItem.append(this.$delete_btn);
        
        this.saveItemEvents();
    }

    get padding(){
        const value = 30;
        return this.label ? value : 0;
    }

    get unit(){
        const {width} = this.ctx.canvas;
        return this.label ? (width - this.padding) / this.width : width / this.width;
    }


    render(){
        this.app.$canvas.height = this.unit * this.height + this.padding;
        this.app.roadList[this.typeIdx] && this.drawRoad();

        this.init();

        this.boothList.forEach(booth => {
            booth.hidden || this.drawRect(booth);
        });

        if(this.selection !== null){
            this.drawRect(this.selection);
        }

    }


    init(){
        const {width, height} = this.ctx.canvas;

        this.ctx.strokeStyle = "#666";
        this.ctx.font = "11px Arial, sans-serif";
        this.ctx.fillStyle = "#000";
        this.ctx.lineWidth = this.lineWidth;

        this.ctx.beginPath();
        this.ctx.strokeRect(this.padding + this.lineWidth / 2, this.padding + this.lineWidth / 2, width - this.padding - this.lineWidth, height - this.padding - this.lineWidth);

        // X축 그리기
        for(let i = 1; i <= this.height; i++){
            let y = this.padding + i * this.unit;

            this.ctx.beginPath();
            this.ctx.moveTo(this.padding, y);
            this.ctx.lineTo(width, y);
            this.ctx.stroke();

            if(this.label){
                const text_w = (this.ctx.measureText(i)).width;
                this.ctx.fillText(i, this.padding - text_w - 5, y - 3);
            }
        }

        // Y축 그리기
        for(let i = 1; i <= this.width; i++){
            let x = this.padding + i * this.unit;
            
            this.ctx.beginPath();
            this.ctx.moveTo(x, this.padding);
            this.ctx.lineTo(x, height);
            this.ctx.stroke();
            
            if(this.label) {
                this.ctx.fillText(i, x - this.unit, this.padding - 5, this.unit);
            }
        }

        
    }

    drawRoad(){
        const roadmap = this.app.roadList[this.typeIdx];
        roadmap.forEach(pos => {
            const [X, Y] = pos;
            this.drawRect({x: X, y: Y, width: 1, height: 1, color: "#000000"});
        });
    }


    // Utility
    toURL(){
        let temp_ctx = this.ctx;
        let canvas = document.createElement("canvas");
        canvas.width = 250;
        canvas.height = 125;

        this.ctx = canvas.getContext("2d");
        this.render();

        this.ctx = temp_ctx;
        return canvas.toDataURL("images/jpeg");
    }

    offset(e){
        const {pageX, pageY} = e;
        const {left, top} = $(this.ctx.canvas).offset()
        const {offsetWidth, offsetHeight} = this.ctx.canvas;

        let x = pageX - left;
        x = x < 0 + this.padding ? 0 + this.padding : x > offsetWidth ? offsetWidth : x;

        let y = pageY - top;
        y = y < 0 + this.padding ? 0 + this.padding : y > offsetHeight ? offsetHeight : y;

        return [x, y];
    }

    drawRect(data){
        let {color, text, width, height, x, y} = data;
        text = text ? text : "";

        let [sx, sy] = this.findPixel(x, y);
        let [w, h] = this.findPixel(x + width,  y + height);

        this.ctx.fillStyle = color;
        this.ctx.fillRect(sx, sy, w - sx, h - sy);

        this.ctx.font = this.label ? "16px Arial, sans-serif" : "5px Arial, sans-serif";
        this.ctx.fillStyle = "#ffffff";

        let measure = this.ctx.measureText(text);
        let text_width = measure.width;
        let text_ascent = measure.actualBoundingBoxAscent;
        this.ctx.fillText(text, sx + (w - sx) / 2 - text_width / 2, sy + (h - sy) / 2 + text_ascent / 2);   
    }

    findPixel(x, y){
        let px = (x-1) * this.unit + this.padding;
        let py = (y-1) * this.unit + this.padding;
        return [px, py];
    }

    findUnitByEvent(e){
        const {left, top} = $(this.app.$canvas).offset();

        let x = Math.ceil((e.pageX - left - this.padding) / this.unit);
        x = x < 1 ? 1 : x > this.width ? this.width : x;
        let y = Math.ceil((e.pageY - top - this.padding) / this.unit);
        y = y < 1 ? 1 : y > this.height ? this.height : y;

        return [x, y];
    }

    findUnit(x, y){
        x = Math.ceil((x - this.padding) / this.unit);
        y = Math.ceil((y - this.padding) / this.unit);
        return [x, y];
    }

    isEmpty(x, y, w, h, allowed_color = null){
        // 예외처리 색상이 배열이 아니면 RGB 배열로 변환
        if(allowed_color !== null && typeof allowed_color === "string") allowed_color = allowed_color.name2rgb();
        
        
        for(let cx = x; cx < x + w; cx++){
            for(let cy = y; cy < y + h; cy++){
                let [px, py] = this.findPixel(cx, cy);

                let filled = this.ctx.getImageData(px + this.unit / 2, py + this.unit / 2, 1, 1);

                // 생성할 부스 색상과 일치하면 패스
                if(allowed_color !== null && allowed_color[0] === filled.data[0] && allowed_color[1] === filled.data[1] && allowed_color[2] === filled.data[2]) continue;
                else if(filled === 255 && filled === 255 && filled === 255) continue;
                
                
                if(filled.data[3] !== 0) return false;
            }
        }
        return true;
    }

    // UNIT 단위의 X, Y가 필요하다
    whatIsThat(ux, uy){
        return this.boothList.find(booth => {
            const { x, y, width, height } = booth;
            return x <= ux && ux < x + width && y <= uy && uy < y + height;
        });
    }


    /**
     * Events
     */

     saveItemEvents(){
         this.$image.addEventListener("click", () => {
            let print = new Blueprint(this.app, this.typeIdx);
            print.boothList = this.boothList.map(x => Object.assign(x));

            this.app.current_view = print;
            
            this.app.save();
         });

         this.$delete_btn.addEventListener("click", () => {
            this.$saveItem.remove();
            
            let idx = this.app.saveList.findIndex(x => x === this);
            if(idx >= 0) this.app.saveList.splice(idx, 1);

            if(this.app.current_view == this) this.app.current_view = new Blueprint(this.app);
            this.app.save();
         });
     }
}