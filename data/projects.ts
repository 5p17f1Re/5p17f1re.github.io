export type Project = {
  slug?: string;
  tag: string;
  title: string;
  description: string;
  image?: string;
  width?: number;
  height?: number;
  video?: string;
  poster?: string;
  extraImages?: string[];
};

export const projects: Project[] = [
  {
    tag: "b2b",
    title: "Yandex Eats Panel",
    image: "yandex-eats-panel",
    width: 1600,
    height: 1200,
    description:
      "Helped restaurants understand their guests, retain them and forecast revenue through an analytics dashboard in the partner panel.",
  },
  {
    tag: "product",
    title: "Foodhalls for Starter",
    image: "starter-foodhalls",
    width: 1600,
    height: 1600,
    description:
      "Food courts and food halls are a large and fast-growing part of the catering market. We had to figure out how to build support for food halls into the current solution so we could take the client into a new market.",
  },
  {
    tag: "promo",
    title: "Samokat",
    video: "/media/videos/samokat-cover.mp4",
    poster: "samokat-1",
    extraImages: ["samokat-2", "samokat-3"],
    description:
      "Samokat is #1 online grocery delivery service in Russia. In 2022 I led the redesign of their promo landing system and campaign pages.",
  },
  {
    tag: "place",
    title: "Sevcableport",
    image: "sevcableport",
    width: 1600,
    height: 2000,
    description:
      "A magazine-style editorial platform for Sevcableport — a cultural waterfront venue in Saint Petersburg with a strong local identity.",
  },
  {
    tag: "web",
    title: "Arxel",
    image: "arxl",
    width: 1600,
    height: 1000,
    description:
      "Online platform for urban planning professionals and city-building teams. Clean service design with a strong information hierarchy.",
  },
  {
    tag: "mag",
    title: "Re.View",
    image: "review",
    width: 1600,
    height: 1600,
    description:
      "A digital beauty and culture magazine with bold editorial voice and a mood-heavy visual system built for long-form content.",
  },
  {
    tag: "app",
    title: "PYE",
    image: "pye-web",
    width: 1600,
    height: 2000,
    description:
      "Home try-on app for premium eyewear. Soft editorial feel, warm golden visual identity, and a focus on reducing purchase anxiety.",
  },
  {
    tag: "product",
    title: "Yandex Eats: Big Orders",
    image: "yandex-eats",
    width: 1600,
    height: 1600,
    description:
      "Redesigned the large-order flow in Yandex Eats, reducing friction for bulk grocery purchases and group orders.",
  },
];
