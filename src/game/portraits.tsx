const load = (g: Record<string, string>) => Object.fromEntries(Object.entries(g).map(([k, v]) => [k.split("/").pop()!.replace(".jpg", ""), v]));
export const NPC_IMG: Record<string, string> = load(import.meta.glob("@/assets/npcs/*.jpg", { eager: true, import: "default" }) as Record<string, string>);
export const CREATURE_IMG: Record<string, string> = load(import.meta.glob("@/assets/enemies/*.jpg", { eager: true, import: "default" }) as Record<string, string>);
export const BASE_IMG: Record<string, string> = load(import.meta.glob("@/assets/base/*.jpg", { eager: true, import: "default" }) as Record<string, string>);

/** Pixel-art portrait for an NPC ("part", "liis", ...) or creature id; falls back to the emoji icon. */
export function Portrait({ id, icon, alt, size = "md" }: { id: string; icon?: string; alt: string; size?: "sm" | "md" | "lg" }) {
  const src = NPC_IMG[id] ?? CREATURE_IMG[id];
  const cls = size === "sm" ? "h-12 w-12" : size === "lg" ? "h-40 w-40" : "h-20 w-20";
  if (!src) return <span className={`inline-flex ${cls} shrink-0 items-center justify-center border-2 border-border text-4xl`}>{icon}</span>;
  return <img src={src} alt={alt} loading="lazy" className={`${cls} shrink-0 border-2 border-border object-cover`} style={{ imageRendering: "pixelated" }} />;
}
