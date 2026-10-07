import { createFileRoute } from "@tanstack/react-router";
import Game from "@/game/Game";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Tuhk — Ellujäämine pärast lõppu" },
      { name: "description", content: "Postapokalüptiline pixel-art survival-fantaasia tekstimäng: kogu, ehita, võitle ja avasta maailmalõpu saladus." },
      { property: "og:title", content: "Tuhk — Ellujäämine pärast lõppu" },
      { property: "og:description", content: "Postapokalüptiline pixel-art survival-fantaasia tekstimäng brauseris." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Game,
});
