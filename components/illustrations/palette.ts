/**
 * Drawing palette for the illustrations in this folder.
 *
 * PLAIN ENGLISH: the little drawings used to be painted in the old teal/sage
 * colours. Rather than repeating hex codes in every SVG, they all read from
 * this one list, which is built from the app's theme. Change a line here and
 * every drawing changes with it.
 *
 * Palette discipline (Section 2 of the brief): orange is the drawing's subject,
 * warm neutrals are the paper, and green / amber / red appear only when they
 * carry real meaning — a completed check, a planned wait, a gentle caution.
 */
import { Colors } from "@/lib/theme";

export const art = {
  /** Outlines and the darkest strokes. */
  outline: Colors.orangeDeep,
  /** The main filled shape. */
  solid: Colors.orange,
  /** Soft halo behind a subject. */
  wash: Colors.orangeTint,
  /** A slightly stronger wash, for shapes sitting on top of `wash`. */
  washDeep: Colors.orangeTintDeep,
  /** Warm paper / highlight. */
  paper: Colors.white,
  /** Quiet inset surfaces (calendar cells, door panels). */
  surface: Colors.cloud,
  /** Hairlines and quiet secondary strokes. */
  quiet: Colors.faint,

  /** Completion only — a finished check, a done milestone. */
  done: Colors.green,
  doneWash: Colors.greenTint,
  /** A planned wait — sand in an hourglass, a future date. */
  waiting: Colors.amber,
  /** Gentle caution. Never used as a large fill. */
  caution: Colors.red,
  cautionWash: Colors.redTint,
} as const;
