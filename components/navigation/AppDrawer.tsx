/**
 * ⚠️ LEGACY NAME. The drawer now lives in components/navigation/MenuDrawer.tsx.
 *
 * PLAIN ENGLISH: the old side drawer was called AppDrawer. The redesign's
 * drawer is MenuDrawer (slides in from the right, warm panel, roomy rows).
 * This file just forwards to it so older imports keep working.
 */
export { MenuDrawer as AppDrawer, MenuDrawer } from "@/components/navigation/MenuDrawer";
