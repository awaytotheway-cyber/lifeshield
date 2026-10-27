/**
 * The one axis a choice control still varies on.
 *
 * This used to be a palette: four named sets of thumb, track, fill, text and
 * border hexes, from the blue-glass era. Moss needs none of it — a platform
 * `Switch` is ink on `hairline` with a white thumb (see the settings
 * screens), and a `ChoiceToggle` segment is bare until chosen and then filled
 * with `mossTint`. Both read their colours straight from `lib/design-tokens`,
 * so the hexes are gone rather than remapped.
 *
 * What survives is the name, because `ChoiceToggle` still takes it: only
 * `"warning"` changes anything, tinting the chosen segment clay for the
 * symptom questions where "Yes" routes someone to a clinician.
 */
export type SwitchColor = "primary" | "secondary" | "warning" | "default";
