class App {
    constructor(app_id){
        this.$root = document.querySelector(app_id);
        this.$saveList = this.$root.querySelector("#save-line .list");
        this.$typeList = this.$root.querySelector("#type-line .list");


        this.$boothSelect = this.$root.querySelector("#booth-selector");
        this.$viewColor = this.$root.querySelector("#view-color");
        this.$areaSize = this.$root.querySelector("#area-size");
        this.$saveBtn = this.$root.querySelector("#save-btn");
        this.$deleteBtn = this.$root.querySelector("#delete-btn");

        this.$canvas = this.$root.querySelector("#viewport canvas");
        this.outerWidth = this.$canvas.width;
        this.outerHeight = this.$canvas.height;
        this.viewport = new Viewport(this);

        
        

        this.loadData().then(() => {  
            this.mouseEvents();
        });
    }

    async loadData(){
        this.roadList = await this.loadRoadList();
        console.log(this.roadList);
    }

    loadRoadList(){
        return new Promise(async res => {
            let result = [];
            let roadList = this.viewport.takeRoadList();
            document.body.append(await this.viewport.takeMapImage(roadList[0]));
            // for(let groups of roadList){
            //     let img = await this.viewport.takeMapImage(groups);
            //     result.push(img);
            // }   
            
            // res(result);
        });
    }

    mouseEvents(){
        window.addEventListener("mousedown", e => {
            let result = this.viewport.findUnitByEvent(e);
        });
    }
}