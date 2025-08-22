import { Container, Graphics, Sprite, Texture } from "pixi.js";

export function createRoundedCard(
  w: number,
  h: number,
  radius: number,
  fill: number, // e.g. 0x33aaff
  stroke: number // e.g. 0x1f2a44
) {
  const card = new Container();

  // Body: fast sprite fill
  const body = new Sprite({ texture: Texture.WHITE });
  body.tint = fill;
  body.width = w;
  body.height = h;
  body.position.set(0, 0); // local to the container

  // Mask: rounded rect (Graphics stencil)
  const mask = new Graphics().roundRect(0, 0, w, h, radius).fill(0xffffff);
  body.mask = mask;

  // Border on top (center-aligned stroke for crispness)
  const border = new Graphics()
    .roundRect(0, 0, w, h, radius)
    .stroke({ width: 2, color: stroke, alpha: 1, alignment: 0.5 });

  card.addChild(body, mask, border);
  return card;
}
