import Phaser from "phaser";

class TilemapScene extends Phaser.Scene {
  // referene to animatable tiles so we can update them every frame
  private animatedTiles: AnimatedTile[];

  private player: Player;

  /**
   * This is called only once when you start the game. Every time a scene is
   * created using methods like `scene.start()`, `constructor()` will not be
   * called (`init()` will still be called though).
   */
  constructor() {
    super("TilemapScene");
  }

  /**
   * Scenes can have a init method, which is always called before the Scenes
   * preload method, allowing you to initialize data that the Scene may need.
   *
   * The data is passed when the scene is started/launched by the scene manager.
   *
   * @see {@link https://photonstorm.github.io/phaser3-docs/Phaser.Scenes.SceneManager.html}
   * @param {any} data - the data being passed when the scene manager starts this scene
   */
  public init(data: any): void {
    this.animatedTiles = [];
  }

  /**
   * Scenes can have a preload method, which is always called before the Scenes
   * create method, allowing you to preload assets that the Scene may need.
   */
  public preload(): void {
    this.load.image("tiles", "images/tiles.png");
    this.load.tilemapTiledJSON("map", "maps/map.json");
    this.load.atlas("elf_f", "images/elf_f.png", "images/elf_f.json");
  }

  /**
   * Scenes can have a create method, which is always called after the Scenes
   * init and preload methods, allowing you to create assets that the Scene may need.
   *
   * The data is passed when the scene is started/launched by the scene manager.
   *
   * @see {@link https://photonstorm.github.io/phaser3-docs/Phaser.Scenes.SceneManager.html}
   * @param {any} data - the data being passed when the scene manager starts this scene
   */
  public create(data: any): void {
    // parse tilemap json data to phaser tile map object
    const tilemap = this.make.tilemap({ key: "map" });

    // parse tileset image
    const tileset = tilemap.addTilesetImage("tiles", "tiles");

    // create bottom layer
    const bottomLayer = tilemap.createDynamicLayer("BottomLayer", tileset);
    bottomLayer.setCollisionByProperty({ collision: true });

    // create middle layer
    const middleLayer = tilemap.createDynamicLayer("MiddleLayer", tileset);
    middleLayer.setCollisionByProperty({ collision: true });

    this.player = new Player(this, 200, 200);
    this.physics.add.collider(this.player, middleLayer);
    this.physics.add.collider(this.player, bottomLayer);

    // create top layer
    const topLayer = tilemap.createDynamicLayer("TopLayer", tileset);

    // create animated tiles
    // loop through every tile and check if its id is animated tile's id
    const tileData = tileset.tileData as TilesetTileData;
    for (let tileid in tileData) {
      tilemap.layers.forEach(layer => {
        if (layer.tilemapLayer.type === "StaticTilemapLayer") return;
        layer.data.forEach(tileRow => {
          tileRow.forEach(tile => {
            // Typically `firstgid` is 1, which means tileid starts from 1.
            // Tiled's tileid starts from 0.
            if (tile.index - tileset.firstgid === parseInt(tileid, 10)) {
              this.animatedTiles.push(
                new AnimatedTile(
                  tile,
                  tileData[tileid].animation,
                  tileset.firstgid
                )
              );
            }
          });
        });
      });
    }

    // set world bounds
    this.physics.world.bounds.width = tilemap.widthInPixels;
    this.physics.world.bounds.height = tilemap.heightInPixels;

    // configure camera
    this.cameras.main.setBounds(
      0,
      0,
      tilemap.widthInPixels,
      tilemap.heightInPixels
    );
    this.cameras.main.setZoom(2);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
  }

  /**
   * This method is called once per game step while the scene is running.
   * @param {number} time - the current time
   * @param {number} delta - the delta time in ms since the last frame
   */
  public update(time: number, delta: number): void {
    this.player.update();
    this.animatedTiles.forEach(tile => tile.update(delta));
  }

}

export default TilemapScene;

/**
 * Tileset-specific data per tile that are typically defined in the Tiled editor, e.g. within
 * the Tileset collision editor. This is where collision objects and terrain are stored.
 */
type TilesetTileData = { [key: number]: { animation?: TileAnimationData } };

/**
 * Tile animation data created by Tiled program for animated tile. This can be
 * found in {@link TilesetTileData}.
 */
type TileAnimationData = Array<{ duration: number; tileid: number }>;

/**
 * Tile with animation.
 * @class
 * @classdesc
 * As of Phaser 3.23.0, animted tile is not supported. This is a simple implementation
 * of animating {@link Phaser.Tilemaps.Tile} and probably does not cover all
 * the edge cases. Assume the duration of animation is uniform for simplicity.
 */
class AnimatedTile {
  // reference to the tilemap tile to animate
  private tile: Phaser.Tilemaps.Tile;

  // the data needed for animating the tile
  private tileAnimationData: TileAnimationData;

  // the starting index of the first tile index the tileset of the tile contains
  private firstgid: number;

  // the elapsed time that loops between 0 and max animation duration
  private elapsedTime: number;

  // the length of animation in ms
  private animationDuration: number;

  /**
   * @param {Phaser.Tilemaps.Tile} tile - the tile to animate
   * @param {TileAnimationData} tileAnimationData  - the animation data
   * @param {number} firstgid - the starting index of the first tile index the tileset of the tile contains
   */
  constructor(
    tile: Phaser.Tilemaps.Tile,
    tileAnimationData: TileAnimationData,
    firstgid: number
  ) {
    this.tile = tile;
    this.tileAnimationData = tileAnimationData;
    this.firstgid = firstgid;
    this.elapsedTime = 0;
    // assuming the duration is uniform across all frames
    this.animationDuration =
      tileAnimationData[0].duration * tileAnimationData.length;
  }

  /**
   * Update the tile if necessary. This method should be called every frame.
   * @param {number} delta - the delta time in ms since the last frame
   */
  public update(delta: number): void {
    this.elapsedTime += delta;
    this.elapsedTime %= this.animationDuration;

    const animatonFrameIndex = Math.floor(
      this.elapsedTime / this.tileAnimationData[0].duration
    );

    this.tile.index =
      this.tileAnimationData[animatonFrameIndex].tileid + this.firstgid;
  }
}

class Player extends Phaser.GameObjects.Sprite {
  // keyboard key for moving up
  private keyW: Phaser.Input.Keyboard.Key;

  // keyboard key for moving left
  private keyA: Phaser.Input.Keyboard.Key;

  // keyboard key for moving down
  private keyS: Phaser.Input.Keyboard.Key;

  // keyboard key for moving right
  private keyD: Phaser.Input.Keyboard.Key;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, "elf_f");

    // add player to the scene
    this.scene.add.existing(this);
    this.scene.physics.add.existing(this);
    this.getBody().setCollideWorldBounds(true);

    // get references to the keyboard
    this.keyW = this.scene.input.keyboard.addKey("W");
    this.keyA = this.scene.input.keyboard.addKey("A");
    this.keyS = this.scene.input.keyboard.addKey("S");
    this.keyD = this.scene.input.keyboard.addKey("D");

    // register animations
    this.scene.anims.create({
      key: "idle",
      frames: this.scene.anims.generateFrameNames("elf_f", {
        prefix: "idle_anim_f",
        end: 3
      }),
      frameRate: 8
    });

    this.scene.anims.create({
      key: "run",
      frames: this.scene.anims.generateFrameNames("elf_f", {
        prefix: "run_anim_f",
        end: 3
      }),
      frameRate: 8
    });

    // set collision bounds
    this.getBody().setSize(16, 16);
    this.getBody().setOffset(0, 12);
  }

  /**
   * This should be called every frame.
   */
  public update(): void {
    // update velocity
    if (this.keyW.isDown) {
      this.getBody().setVelocity(0, -64);
    } else if (this.keyA.isDown) {
      this.getBody().setVelocity(-64, 0);
    } else if (this.keyS.isDown) {
      this.getBody().setVelocity(0, 64);
    } else if (this.keyD.isDown) {
      this.getBody().setVelocity(64, 0);
    } else {
      this.getBody().setVelocity(0, 0);
    }

    // update flip x
    if (this.getBody().velocity.x > 0) {
      this.setFlipX(false);
    } else if (this.getBody().velocity.x < 0) {
      this.setFlipX(true);
    }

    // update frame and physics body
    if (this.getBody().velocity.x === 0 && this.getBody().velocity.y === 0) {
      this.anims.play("idle", true);
    } else {
      this.anims.play("run", true);
    }
  }

  /**
   * Get the physics body
   * @return {Phaser.Physics.Arcade.Body} - the physics body
   */
  private getBody(): Phaser.Physics.Arcade.Body {
    return this.body as Phaser.Physics.Arcade.Body;
  }
}
