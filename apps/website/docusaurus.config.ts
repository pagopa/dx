import type * as Preset from "@docusaurus/preset-classic";
import type { Config } from "@docusaurus/types";

import { themes as prismThemes } from "prism-react-renderer";

const config: Config = {
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: "/",
  favicon: "img/favicon.ico",
  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: "en",
    locales: ["en"],
  },
  markdown: {
    mermaid: true,
  },
  onBrokenLinks: "throw",
  onBrokenMarkdownLinks: "warn",

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: "pagopa", // Usually your GitHub org/user name.
  plugins: [
    [
      "@docusaurus/plugin-client-redirects",
      {
        redirects: [
          {
            from: "/docs/getting-started",
            to: "/docs/",
          },
        ],
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
    [
      require.resolve("./src/plugins/analytics-with-consent.ts"),
      {
        config: {
          disableFetchTracking: false,
          disableTelemetry: false, // Will be controlled by cookie consent
          enableAjaxErrorStatusText: true,
          enableAjaxPerfTracking: true,
          enableAutoRouteTracking: true,
          enableCookieSuggestion: false,
          enableCorsCorrelation: true,
          enableRequestHeaderTracking: true,
          enableResponseHeaderTracking: true,
          enableUnhandledPromiseRejectionTracking: true,
          instrumentationKey: "e0ff8094-78fa-45e5-a21d-e62b453dc5d1",
        },
        enableClickAnalytics: false,
      },
    ],
    [
      "docusaurus-plugin-llms",
      {
        customLLMFiles: [],
        description: "Complete reference documentation for My Project",
        docsDir: "docs",
        excludeImports: true,
        generateLLMsFullTxt: true,
        generateLLMsTxt: true,
        // Generate individual markdown files following llmstxt.org specification
        generateMarkdownFiles: true,
        ignoreFiles: [],
        includeBlog: true,
        includeUnmatchedLast: true,
        removeDuplicateHeadings: true,
        title: "PagoPA DevEx Documentation",
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
  projectName: "dx", // Usually your repo name.

  tagline: "Welcome to the DX documentation!",

  themeConfig: {
    colorMode: {
      defaultMode: "dark",
      disableSwitch: false,
      respectPrefersColorScheme: false,
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
        {
          items: [
            {
              label: "Privacy Notice",
              to: "/privacy-notice",
            },
            {
              label: "Legal Notes",
              to: "/legal-notes",
            },
            {
              html: '<div id="cookie-preferences-link"></div>',
            },
          ],
          title: "Legal",
        },
      ],
      style: "dark",
      // copyright: `Copyright © ${new Date().getFullYear()} PagoPA. Built with Docusaurus.`,
    },
    // Replace with your project's social card
    image: "img/pagopa-logo.png",
    navbar: {
      items: [
        { label: "Docs", position: "left", to: "/docs" },
        { label: "Blog", position: "left", to: "/blog" },
        {
          className: "navbar-support-link",
          label: "Support",
          position: "left",
          to: "/docs/support",
        },
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
      title: "DX PagoPA",
    },
    prism: {
      additionalLanguages: ["hcl", "bash"],
      darkTheme: prismThemes.dracula,
      theme: prismThemes.github,
    },
  } satisfies Preset.ThemeConfig,
  themes: ["@docusaurus/theme-mermaid"],
  title: "DX",

  // Set the production url of your site here
  url: "https://dx.pagopa.it",
};

export default config;
