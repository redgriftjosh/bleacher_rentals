The ui directoy should only contain pixi components that can be rendered in a cell.
I'm pretty sure that each component should be a Container that can contain as many
Grpahics, Sprites, etc. as needed. You can also write the logic for each one here as
well like click handlers and hover animations etc.

The CellRenderes will reference these containers to render them as needed in the grid.
The Grid should take care of virtualization, scrolling, and baking logic.