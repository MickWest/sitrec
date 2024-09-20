import {BufferAttribute, BufferGeometry, Color, Points, PointsMaterial, TextureLoader} from "three";
import {CNode3DGroup} from "./CNode3DGroup";
import {guiMenus} from "../Globals";
import * as LAYER from "../LayerMasks";
import {radians} from "../utils";

export class CNodeSpriteGroup extends CNode3DGroup {
    constructor(v) {
        super(v);
        
        // we are going to have a lot of sprites. They use this texture:
        // TextureLoader().load('data/images/nightsky/MickStar.png')

        this.size = v.size ?? 5;
        this.near = v.near ?? 0.1;
        this.far = v.far ?? 100;
        this.oldNear = this.near;
        this.oldFar = this.far;

        // TODO - when they change, stretch the positions of the sprites
        // by finding the distance from the camera along camera forward
        // and scaling the positions based on the change in near and far

        this.texture =  new TextureLoader().load('data/images/nightsky/MickStar.png');
        this.material = new PointsMaterial({
            size:this.size,
            map: this.texture,
            color: 0xffffff,
            sizeAttenuation: true,
            alphaTest: 0.5
        });

        this.guiMenu = v.gui ?? guiMenus.effects;
        this.gui = this.guiMenu.addFolder("Flow Orbs");

        this.visible = v.visible ?? false;
        this.gui.add(this, "visible").name("Visible").onChange(() => {
            this.group.visible = this.visible;
        })


        this.geometry = new BufferGeometry();

        this.nSprites = v.nSprites ?? 1000;

        this.positions = new Float32Array(this.nSprites * 3); // x, y, z for each satellite
        this.colors = new Float32Array(this.nSprites * 3); // r, g, b for each satellite

        
        for (let i = 0; i < this.nSprites; i++) {
            this.positions[i * 3] = Math.random() * 100000 - 5000;
            this.positions[i * 3 + 1] = Math.random() * 100000 - 5000;
            this.positions[i * 3 + 2] = Math.random() * 100000 - 5000;
        }
       
        // sizes 
        // this.sizes = new Float32Array(this.nSprites);
        // for (let i = 0; i < this.nSprites; i++) {
        //     this.sizes[i] = 40;
        // }
        //
        // and colors
        for (let i = 0; i < this.nSprites; i++) {
            const colorHex = Math.random() * 0x808080 + 0x808080;
            const color = new Color(colorHex);
            this.colors[i*3] = color.r;
            this.colors[i*3+1] = color.g;
            this.colors[i*3+2] = color.b;
        }



        // Attach data to geometry
        this.geometry.setAttribute('position', new BufferAttribute(this.positions, 3));
      //  this.geometry.setAttribute('color', new BufferAttribute(this.colors, 3));
        // this.geometry.setAttribute('size', new BufferAttribute(this.sizes, 1));

        this.geometry.computeBoundingBox();
        this.geometry.computeBoundingSphere();

        // Create point cloud for sprites
        this.sprites = new Points(this.geometry, this.material);

        this.sprites.updateMatrix();
        this.sprites.updateMatrixWorld();

        this.group.add(this.sprites);
        this.group.layers.mask = LAYER.MASK_LOOKRENDER;
        this.propagateLayerMask()



        this.gui.add(this, "size", 0.1, 100).name("Size").onChange(() => {
            //this.size = this.size;
        }).elastic(1, 100);




    }


    preViewportUpdate(view) {

        // scale the material size based on the viewport's FOV
        this.material.size = this.size / Math.tan(radians(view.camera.fov/2)) * view.widthPx/1600;

    }

}

