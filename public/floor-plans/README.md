# Floor plan references

The generated PNGs are visual references for later interactive floor layers. They are not measured drawings or an authoritative evacuation plan. Verify room boundaries and door locations against the source building plan before implementing clickable shapes.

## Classification from the annotated references

- Green check: schedulable classroom or laboratory.
- Red X: room not dedicated to classes; not schedulable in the classroom workflow.
- Purple X: staircase; never a schedulable room.
- Unmarked corridors, central ramp or courtyard, and service areas must not become schedulable rooms by inference.

First/ground floor: the three top rooms are CISC Room 3, CISC Room 2 and CISC Room 1 from left to right. The bottom-left classroom is CISC Laboratory 11. The projecting room on the left is the Conference Room, used for defenses and presentations; it is labeled as a landmark, without inventing a booking capacity. The large bottom-middle faculty office remains outside classroom scheduling. The three small rooms in the bottom band open downward into the gray area, not upward into the hallway.

Second floor: top rooms are CISC Laboratories 26, 25 and 24 from left to right; bottom labs are CISC Laboratories 23, 22 and 21 from left to right. The left projecting room is the CISC Training Room. It does not have the first floor's three small bottom-band rooms.

Room IDs remain stable: `g1` = CISC Room 3, `g2` = CISC Room 2, `g3` = CISC Room 1, `g4` = CISC Laboratory 11; `s1`–`s6` = CISC Laboratories 26–21 and `s7` = CISC Training Room. Existing bookings stay attached to their physical room. Names are confirmed by the user; existing capacities and boundaries still require verification. The reviewed `20261118090000_cisc_room_names.sql` migration updates persisted names and unsent notification labels; apply it to the confirmed Supabase target through the normal migration workflow. It has not been applied to a live database by this change.

Both floors have four marked stair zones, at the upper and lower ends of the left and right circulation paths. The interactive implementation should share a common coordinate system across floors, with doors and room selection regions represented separately from the raster reference.
