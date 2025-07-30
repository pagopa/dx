import type * as Preset from "@docusaurus/preset-classic";
import type { Config } from "@docusaurus/types";

import { themes as prismThemes } from "prism-react-renderer";

const config: Config = {
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: "/dx/",
  favicon: "img/favicon.ico",
  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: "en",
    locales: ["en"],
  },

  onBrokenLinks: "throw",
  onBrokenMarkdownLinks: "warn",

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  // organizationName: "pagopa", // Usually your GitHub org/user name.
  plugins: [
    [
      "@docusaurus/plugin-client-redirects",
      {
        redirects: [],
      },
    ],
    [
      "@easyops-cn/docusaurus-search-local",
      {
        blogRouteBasePath: "/blog",
        docsRouteBasePath: "/docs",
        hashed: true,
        indexBlog: true,
        indexDocs: true,
        language: ["en"],
      },
    ],
  ],

  presets: [
    [
      "classic",
      {
        blog: {
          // Remove this to remove the "edit this page" links.
          editUrl: "https://github.com/pagopa/dx/tree/main/website/",
          showReadingTime: true,
        },
        docs: {
          // Remove this to remove the "edit this page" links.
          editUrl: "https://github.com/pagopa/dx/tree/main/website/",
          sidebarCollapsed: true,
          sidebarCollapsible: true,
          sidebarPath: "./sidebars.ts",
        },
        theme: {
          customCss: "./src/css/custom.css",
        },
      } satisfies Preset.Options,
    ],
  ],
  // projectName: "dx", // Usually your repo name.

  tagline: "Welcome to the DX documentation!",

  themeConfig: {
    colorMode: {
      defaultMode: "dark",
      disableSwitch: false,
      respectPrefersColorScheme: true,
    },
    footer: {
      links: [
        {
          items: [
            {
              label: "Start here",
              to: "/docs/",
            },
          ],
          title: "Docs",
        },
        {
          items: [
            {
              label: "Read announcements",
              to: "/blog/",
            },
          ],
          title: "Blog",
        },
      ],
      style: "dark",
      // copyright: `Copyright © ${new Date().getFullYear()} PagoPA. Built with Docusaurus.`,
    },
    // Replace with your project's social card
    image: "img/pagopa-logo.png",
    navbar: {
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
      logo: {
        alt: "DX Logo",
        src: "img/pagopa-logo.png",
      },
      title: "DX",
    },
    prism: {
      additionalLanguages: ["hcl", "bash"],
      darkTheme: prismThemes.dracula,
      theme: prismThemes.github,
    },
  } satisfies Preset.ThemeConfig,
  title: "DX",

  // Set the production url of your site here
  url: "https://blue-pond-091797b03.2.azurestaticapps.net", // "https://pagopa.github.io",
};

export default config;
