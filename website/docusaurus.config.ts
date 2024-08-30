import { themes as prismThemes } from "prism-react-renderer";
import type { Config } from "@docusaurus/types";
import type * as Preset from "@docusaurus/preset-classic";

const config: Config = {
  title: "DX",
  tagline: "Welcome to the DX documentation!",
  favicon: "img/favicon.ico",

  // Set the production url of your site here
  url: "https://pagopa.github.io",
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: "/dx/",

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: "pagopa", // Usually your GitHub org/user name.
  projectName: "dx", // Usually your repo name.

  onBrokenLinks: "throw",
  onBrokenMarkdownLinks: "warn",

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: "en",
    locales: ["en"],
  },

  presets: [
    [
      "classic",
      {
        docs: {
          sidebarPath: "./sidebars.ts",
          sidebarCollapsible: false,
          sidebarCollapsed: false,
          // Remove this to remove the "edit this page" links.
          editUrl: "https://github.com/pagopa/dx/tree/main/website/",
        },
        blog: {
          showReadingTime: true,
          // Remove this to remove the "edit this page" links.
          editUrl: "https://github.com/pagopa/dx/tree/main/website/",
        },
        theme: {
          customCss: "./src/css/custom.css",
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    colorMode: {
      defaultMode: "dark",
      disableSwitch: false,
      respectPrefersColorScheme: true,
    },
    // Replace with your project's social card
    image: "img/pagopa-logo.jpg",
    navbar: {
      title: "DX",
      logo: {
        alt: "DX Logo",
        src: "img/pagopa-logo.jpg",
      },
      items: [
        // {
        //   type: "docSidebar",
        //   sidebarId: "tutorialSidebar",
        //   position: "left",
        //   label: "Tutorial",
        // },
        // { to: "/blog", label: "Blog", position: "left" },
        {
          href: "https://github.com/pagopa/dx",
          label: "GitHub",
          position: "right",
        },
      ],
    },
    footer: {
      style: "dark",
      links: [
        {
          title: "Docs",
          items: [
            {
              label: "Start here",
              to: "/docs/",
            },
          ],
        },
        {
          title: "Blog",
          items: [
            {
              label: "Read announcements",
              to: "/blog/",
            },
          ],
        },
      ],
      // copyright: `Copyright © ${new Date().getFullYear()} PagoPA. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ["hcl", "bash"],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
