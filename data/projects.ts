type ProjectBase = {
  slug?: string;
  tag: string;
  title: string;
  description: string;
};

type ImageProject = ProjectBase & {
  mediaType: "image";
  image: string;
};

type VideoProject = ProjectBase & {
  mediaType: "video";
  video: string;
  poster: string;
  extraImages?: string[];
};

type TextProject = ProjectBase & {
  mediaType: "text";
};

export type Project = ImageProject | VideoProject | TextProject;

export const projects: Project[] = [
  {
    mediaType: "image",
    tag: "b2b",
    title: "Yandex Eats Panel",
    image: "yandex-eats-panel",
    description:
      "Helped restaurants understand their guests, retain them and forecast revenue through an analytics dashboard in the partner panel.",
  },
  {
    mediaType: "image",
    tag: "product",
    title: "Foodhalls for Starter",
    image: "starter-foodhalls",
    description:
      "Food courts and food halls are a large and fast-growing part of the catering market. We had to figure out how to build support for food halls into the current solution so we could take the client into a new market.",
  },
  {
    mediaType: "video",
    tag: "promo",
    title: "Samokat",
    video: "/media/videos/samokat-cover.mp4",
    poster: "samokat-1",
    extraImages: ["samokat-2", "samokat-3"],
    description:
      "Samokat is #1 online grocery delivery service in Russia. In 2022 I led the redesign of their promo landing system and campaign pages.",
  },
  {
    mediaType: "image",
    tag: "place",
    title: "Sevcableport",
    image: "sevcableport",
    description:
      "A magazine-style editorial platform for Sevcableport — a cultural waterfront venue in Saint Petersburg with a strong local identity.",
  },
  {
    mediaType: "image",
    tag: "web",
    title: "Arxel",
    image: "arxl",
    description:
      "Online platform for urban planning professionals and city-building teams. Clean service design with a strong information hierarchy.",
  },
  {
    mediaType: "image",
    tag: "mag",
    title: "Re.View",
    image: "review",
    description:
      "A digital beauty and culture magazine with bold editorial voice and a mood-heavy visual system built for long-form content.",
  },
  {
    mediaType: "image",
    tag: "app",
    title: "PYE",
    image: "pye-web",
    description:
      "Home try-on app for premium eyewear. Soft editorial feel, warm golden visual identity, and a focus on reducing purchase anxiety.",
  },
  {
    mediaType: "image",
    tag: "product",
    title: "Yandex Eats: Big Orders",
    image: "yandex-eats",
    description:
      "Redesigned the large-order flow in Yandex Eats, reducing friction for bulk grocery purchases and group orders.",
  },
];
