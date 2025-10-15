The event's are kind of complicated because, they need to be able to be larger than
a single cell, and they also need to be pinned to the screen occasionally.

The pinning logic is pretty crazy. So I just created another grid in the dashboard that
overlaps the main grid perfectly, but it only has one column and so each cell stretches
to the same width as the grid and you can't scroll left or right. It's like another
sticky left column.

Then I created another cell renderer for that grid that only renders the pinned events.
I wrote a little util class called EventsUtil that has some helpful methods for
determining which events should be pinned and which cells have events.

So then we have some components to render an event span.
