class Viewport {
    constructor(app){
        this.app = app;
        this.$canvas = app.$canvas;
        this.ctx = this.$canvas.getContext("2d");
        this.ctx.lineCap = "round";

        this.lineWidth = 1;
        this.width = 60;
        this.height = 30;
        this.padding = 30;

        this.unit = (this.app.outerWidth - this.padding) / this.width;

        this.init(this.ctx);
    }

    init(ctx, option = {}){
        let padding = typeof option.padding === "undefined" ? this.padding : option .padding;
        let unit = (this.app.outerWidth - padding) / this.width;

        ctx.strokeStyle = "#666";
        
        ctx.lineWidth = this.lineWidth;

        ctx.beginPath();
        ctx.strokeRect(padding, padding, this.app.outerWidth - padding - this.lineWidth / 2, this.app.outerHeight - padding - this.lineWidth / 2);
        ctx.stroke();


        // X축 그리기
        for(let i = 1; i <= this.height; i++){
            let y = padding + i * unit;

            ctx.beginPath();
            ctx.moveTo(padding, y);
            ctx.lineTo(this.app.outerWidth, y);
            ctx.stroke();

            const {width} = ctx.measureText(i);
            ctx.fillText(i, padding - width - 5, y - 3);
        }

        // Y축 그리기
        for(let i = 1; i <= this.width; i++){
            let x = padding + i * unit;
            
            ctx.beginPath();
            ctx.moveTo(x, padding);
            ctx.lineTo(x, this.app.outerHeight);
            ctx.stroke();
            const {width} = ctx.measureText(i);
            ctx.fillText(i, x - unit, padding - 5, unit);
        }
    }

    takeRoadList(){
        const result = [[], [], []];
        const roadList = [
            window.json_data['road1'],
            window.json_data['road2'],
            window.json_data['road3'],
        ]
        roadList.forEach((roadData, index) => {
            roadData.forEach( pos => {
                let page = result[index];
                let around = page.find(group => group.some(fp => {
                    if(fp[0] === pos[0]) return (fp[1] + 1 >= pos[1] && pos[1] >= fp[1] - 1)
                    else if(fp[1] === pos[1]) return (fp[0] + 1 >= pos[0] && pos[0] >= fp[0] - 1)
                    else return false;
                }));
                    
                if(around) around.push(pos);
                else page.push([pos]);
            });
        });
        return roadList;
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


    // Method

    drawRect(ctx, x, y, w = 1, h = 1, option = {}){
        let color = typeof option.color == "undefined" ? "#ffffff" : option.color;
        let name = typeof option.name == "undefined" ? "#ffffff" : option.name;
        let padding = typeof option.padding == "undefined" ? 0 : this.padding;

        let s_pos = this.findPixel(x, y); //start position
        let [width, height] = this.findPixel(w, h);
        width -= padding - this.unit;
        height -= padding - this.unit;

        ctx.fillStyle = color;
        ctx.fillRect(s_pos[0], s_pos[1], width, height);
    }

    findPixel(x, y){
        x = (x-1) * this.unit + this.padding;
        y = (y-1) * this.unit + this.padding;
        return [x, y];
    }

    findUnit(x, y){
        x = Math.ceil((x - this.padding) / this.unit);
        y = Math.ceil((y - this.padding) / this.unit);
        return [x, y];
    }

    findUnitByEvent(e){
        const {left, top} = $(this.$canvas).offset();
        let x = Math.ceil((e.pageX - left - this.padding) / this.unit);
        x = x < 1 ? 1 : x > this.width ? this.width : x;
        let y = Math.ceil((e.pageY - top - this.padding) / this.unit);
        y = y < 1 ? 1 : y > this.height ? this.height : y;

        return [x, y];
    }
}