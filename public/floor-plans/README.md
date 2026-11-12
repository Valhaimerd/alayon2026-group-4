# Floor plan references

The generated PNGs are visual references for later interactive floor layers. They are not measured drawings or an authoritative evacuation plan. Verify room boundaries and door locations against the source building plan before implementing clickable shapes.

## Classification from the annotated references

- Green check: schedulable classroom or laboratory.
- Red X: room not dedicated to classes; not schedulable in the classroom workflow.
- Purple X: staircase; never a schedulable room.
- Unmarked corridors, central ramp or courtyard, and service areas must not become schedulable rooms by inference.

Ground floor: four checked rooms (three across the top and one at bottom left). The left projecting room and large bottom-middle faculty office are not classrooms. The three small rooms in the bottom band open downward into the gray area, not upward into the hallway.

Second floor: seven checked rooms (three across the top, three large computer labs across the bottom, and the left projecting room). It does not have the ground floor's three small bottom-band rooms.

Both floors have four marked stair zones, at the upper and lower ends of the left and right circulation paths. The interactive implementation should share a common coordinate system across floors, with doors and room selection regions represented separately from the raster reference.
