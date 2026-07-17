type ProjectBase = {
  slug?: string;
  transitionId?: string;
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
    slug: "yandex-eats-smartreserve",
    transitionId: "yandex-eats-smartreserve",
    mediaType: "image",
    tag: "b2b",
    title: "Yandex Eats Partner Analytics",
    image: "yandex-eats-panel",
    description:
      "Designed partner analytics that help restaurants understand guest behavior, track retention and forecast revenue",
  },
  {
    mediaType: "image",
    tag: "b2b",
    title: "Starter Food Halls",
    image: "starter-foodhalls",
    description:
      "Extended Starter’s restaurant platform to support food halls, helping the product enter a new market without rebuilding its core system",
  },
  {
    slug: "starter-stories",
    transitionId: "starter-stories",
    mediaType: "video",
    tag: "product",
    title: "Starter Stories",
    video: "/media/videos/starter-stories/16-web-demo.mp4",
    poster: "starter-stories/16-video-poster",
    description:
      "Designed stories across restaurant apps, websites and admin tools, giving brands a simple way to communicate with guests",
  },
  {
    mediaType: "image",
    tag: "ecom",
    title: "Avgvst Jewelry",
    image: "avgvst-jewelry",
    description:
      "Designed and built the Avgvst e-commerce site, combining catalog, collections, brand storytelling and service flows in one storefront",
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
    tag: "platform",
    title: "Arxel",
    image: "arxl",
    description:
      "Designed a platform that helps urban-planning teams organize complex project information and collaborate across disciplines",
  },
  {
    mediaType: "image",
    tag: "editorial",
    title: "Re.View",
    image: "review",
    description:
      "Created an editorial system for a digital beauty and culture magazine, supporting distinctive storytelling and long-form reading",
  },
  {
    mediaType: "image",
    tag: "app",
    title: "PYE Home Try-On",
    image: "pye-home-tryon",
    description:
      "Designed a home try-on experience for premium eyewear, reducing the uncertainty of buying glasses online",
  },
  {
    mediaType: "image",
    tag: "place",
    title: "Sevcableport",
    image: "sevcableport",
    description:
      "Designed a public website for Sevcableport, helping visitors navigate events, residents, territory and practical information about the space",
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
