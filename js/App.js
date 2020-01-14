String.prototype.name2rgb = function(){
    let div = document.createElement("div");
    div.style.backgroundColor = this;
    document.body.append(div);

    let color = getComputedStyle(div).getPropertyValue("background-color");
    let matches = color.match(/rgb\((?<r>[0-9]{1,3}), (?<g>[0-9]{1,3}), (?<b>[0-9]{1,3})\)/);
    return Object.values(matches.groups).map(x => parseInt(x));;
}

class App {
    constructor(app_id){
        this.selectionColor = "#76b6f7aa";

        this.$root = document.querySelector(app_id);
        this.$saveList = this.$root.querySelector("#save-line .list");
        this.$typeList = this.$root.querySelector("#type-line .list");

        this.$boothSelect = this.$root.querySelector("#booth-select");
        this.$viewColor = this.$root.querySelector("#view-color");
        this.$areaSize = this.$root.querySelector("#area-size");
        this.$saveBtn = this.$root.querySelector("#save-btn");
        this.$deleteBtn = this.$root.querySelector("#delete-btn");

        this.$viewport = this.$root.querySelector("#viewport");
        this.$canvas = this.$root.querySelector("#viewport canvas");
        this.$canvas.width = this.$viewport.offsetWidth;

        this.ctx = this.$canvas.getContext("2d");

        this.selection = null;
        this.typeList = [];
        this.colorList = [];
        this.saveList = [];
        this.current_view = null;

        this.fillColor = "#000000";

        this.loadData().then(() => {  
            this.mouseEvents();
            this.subLineEvents();
            this.buttonEvents();
            this.frame();
        });
    }

    get boothName(){
        let selected = Array.from(this.$boothSelect.querySelectorAll("option")).find(x => x.selected);
        return selected.innerText;
    }

    set color(value){
        this.fillColor = value;
        this.$viewColor.style.backgroundColor = value;
    }

    /**
     * Load Data
     */
    async loadData(){
        // 타입 템플릿 준비
        this.loadTypeData();
        // 색상 템플릿 준비
        this.loadColorData();

        // 로컬 스토리지 로드
        this.load();
    }

    loadTypeData(){
        return new Promise(res => {
            this.roadList = [
                json_data["road1"],
                json_data["road2"],
                json_data["road3"],
            ];
    
            this.roadList.forEach((x, i) => {
                let typePrint = new Blueprint(this, i);
                typePrint.label = false;
                this.typeList.push(typePrint);
                
                // 타입 DOM
                let img = document.createElement("img");
                img.src = typePrint.toURL();
                img.addEventListener("click", () => this.current_view = new Blueprint(this, i));
                img.onload = () => this.$typeList.append(img);
            });
    
            // 빈 도면
            this.current_view = new Blueprint(this);
            res();
        });
    }

    loadColorData(){
        this.colorList = Object.assign(json_data.color);
        for(let boothName in this.colorList){
            let color = this.colorList[boothName];
            let option = document.createElement("option");
            option.value = color;
            option.innerText = boothName;
            this.$boothSelect.append(option);
        }
        this.color = this.$boothSelect.value;
    }

    /**
     * Events
     */
    mouseEvents(){
        this.$canvas.addEventListener("mousedown", e => {
            if(e.which !== 1) return;
            let [ux, uy] = this.current_view.findUnitByEvent(e);
            
            const find = this.current_view.whatIsThat(ux, uy);
            
            if(!find){
                this.current_view.selection = {x: ux, y: uy, width: 1, height: 1, color: this.selectionColor};  
                this.current_view.fx = ux;
                this.current_view.fy = uy;
            }
            else {
                let [px, py] = this.current_view.findPixel(find.x, find.y);
                let [ox, oy] = this.current_view.offset(e);

                this.current_view.movement = find;
                find.prevX = find.x;
                find.prevY = find.y;

                this.current_view.fx = ox - px;
                this.current_view.fy = oy - py;
            }
        });

        // 새롭게 선택할 때
        window.addEventListener("mousemove", e => {
            if(!this.current_view.selection || e.which !== 1) return;
            const {fx, fy} = this.current_view;

            let [ux, uy] = this.current_view.findUnitByEvent(e);
            let cx = fx, cy = fy;
            let cw = ux - fx, ch = uy - fy;

            if(cw < 0) {
                cx += cw;
                cw *= -1;
            }
            if(ch < 0){
                cy += ch;
                ch *= -1;
            }
            
            this.current_view.selection.x = cx;
            this.current_view.selection.y = cy;
            this.current_view.selection.width = cw + 1;
            this.current_view.selection.height = ch + 1;
            
        });
        window.addEventListener("mouseup", e => {
            if(e.which !== 1 || !this.current_view.selection) return;
            // 선택 영역 때문에 색상이 생기기 때문에 복사한 뒤 지워준다.
            const {x, y, width, height} = this.current_view.selection;
            this.current_view.selection = null;
            this.current_view.render();

            let empty = this.current_view.isEmpty(x, y, width, height, this.fillColor);

            if(width * height < 2) alert("부스의 면적은 2㎡ 이상이여야 합니다.");
            else if(!empty) alert("다른 영역과 겹치지 않도록 하여야 합니다.");
            else {
                const boothList = this.current_view.boothList;
                let booth = boothList.find(booth => booth.text === this.boothName);
                if(!booth){
                    booth = new Booth(this, this.current_view);
                    booth.text = this.boothName;
                    booth.color = this.fillColor;
                    boothList.push(booth);
                }
                booth.width = width;
                booth.height = height;
                booth.x = x;
                booth.y = y;
            }
            
            this.$areaSize.innerText = width * height;

            delete this.current_view.fx;
            delete this.current_view.fy;
            this.save();
        });


        // 기존 부스를 옮길 때
        window.addEventListener("mousemove", e => {
            const {movement, fx, fy, width, height} = this.current_view;

            if(e.which !== 1 || !movement) return;

            let [ox, oy] = this.current_view.offset(e);
            let [ux, uy] = this.current_view.findUnit(ox - fx, oy - fy);

            movement.x = ux < 1 ? 1 : ux >= width - movement.width + 1 ? width - movement.width + 1 : ux;
            movement.y = uy < 1 ? 1 : uy >= height - movement.height + 1 ? height - movement.height + 1 : uy;
        });
        window.addEventListener("mouseup", e => {
            if(e.which !== 1 || this.current_view.movement === null) return;

            const {movement} = this.current_view
            const {x, y, width, height, color} = movement;
            movement.hidden = true;
            
            this.current_view.render();
            let empty = this.current_view.isEmpty(x, y, width, height, color);
            movement.hidden = false;

            if(!empty){
                alert("다른 영역과 공간이 중복되어선 안됩니다.");
                movement.x = movement.prevX;                
                movement.y = movement.prevY;
            }
            this.current_view.movement = null;
            delete this.current_view.fx;
            delete this.current_view.fy;
            this.save();
        });
     
        window.addEventListener("resize", e => {
            this.$canvas.width = this.$viewport.offsetWidth;
        });
    }

    subLineEvents(){
        this.$boothSelect.addEventListener("change", e => this.color = e.target.value);
    }

    buttonEvents(){
        this.$deleteBtn.addEventListener("click", () => {
            this.current_view.boothList = [];
            this.$areaSize.innerText = 0;
            this.save();
        });

        this.$saveBtn.addEventListener("click", () => {
            this.current_view.label = false;
            this.current_view.$image.src = this.current_view.toURL();
            this.current_view.$image.onload = () => {
                this.saveList.push(this.current_view);
                this.$saveList.append(this.current_view.$saveItem);
                this.current_view = new Blueprint(this);
                this.save();
            }
        });
    }

    /**
     * Frames Render
     */


    frame(){
        this.ctx.clearRect(0, 0, this.$canvas.width, this.$canvas.height);

        if(this.current_view !== null){
            let sel_color =  this.$boothSelect.value;

            let boothName = Object.keys(this.colorList).find(boothName => this.colorList[boothName] === sel_color);

            let booth = this.current_view.boothList.find(booth => booth.text === boothName);
            this.$areaSize.innerText = booth ? booth.width * booth.height : 0;

            this.current_view.render();
        }

        
        requestAnimationFrame(() => {
            this.frame();
        });
    }


    /**
     * Storage
     */


     save(){
         // template
        let printTemplate = {
            type: null,
            booths: [],
        }
        let boothTemplate = { x: 0, y: 0, w: 0, h: 0, text: "" };

        // save
        let save_cv = {};
        save_cv.type = this.current_view.typeIdx;
        save_cv.booths = this.current_view.boothList.map(booth => {
            let b = {}
            b.x = booth.x; b.y = booth.y;
            b.width = booth.width; b.height = booth.height;
            b.text = booth.text;
            return b;
        });
        localStorage.setItem("current_view", JSON.stringify(save_cv));

        let save_sl = this.saveList.map(print => {
            let p = {}
            p.type = print.typeIdx;
            p.booths = print.boothList.map(booth => {
                let b = {}
                b.x = booth.x; b.y = booth.y;
                b.width = booth.width; b.height = booth.height;
                b.text = booth.text;
                return b;
            });
            console.log(print.boothList, p.booths);

            return p;
        });
        localStorage.setItem("save_list", JSON.stringify(save_sl));
     }

     load(){
         let current_view = localStorage.getItem("current_view");
         let save_list = localStorage.getItem("save_list");
         
         if(current_view){
            current_view = JSON.parse(current_view);

            let print = new Blueprint(this, current_view.type);
            print.boothList = current_view.booths.map(booth => {
                let b = new Booth(this, print);
                b.x = booth.x; b.y = booth.y;
                b.width = booth.width; b.height = booth.height;
                b.text = booth.text; b.color = this.colorList[b.text];
                return b;
            }); 

            this.current_view = print;
         }

         if(save_list){
            save_list = JSON.parse(save_list);

            save_list.forEach(item => {
                console.log(item);
                let print = new Blueprint(this, item.type);
                print.label = false;
                print.boothList = item.booths.map(booth => {
                    let b = new Booth(this, print);
                    b.x = booth.x; b.y = booth.y;
                    b.width = booth.width; b.height = booth.height;
                    b.text = booth.text; b.color = this.colorList[b.text];
                    return b;
                }); 
                print.$image.src = print.toURL();
                print.$image.onload = () => {
                    this.saveList.push(print);
                    this.$saveList.append(print.$saveItem);
                }   
                console.log(print);                   
            });
         }
     }
}