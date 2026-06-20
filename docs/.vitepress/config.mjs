export default {
  title: "HaxBall UI Framework",
  description: "Lightweight and extensible UI framework for HaxBall.",

  themeConfig: {
    logo: "/banner.png",

    nav: [
      { text: "Getting Started", link: "/getting-started" },
      { text: "Architecture", link: "/architecture" },
      { text: "API", link: "/api/haxui" },
      {
        text: "GitHub",
        link: "https://github.com/mcvn2wrgx2-cpu/haxball-ui-framework"
      }
    ],

    sidebar: [
      {
        text: "Guide",
        items: [
          {
            text: "Getting Started",
            link: "/getting-started"
          },
          {
            text: "Architecture",
            link: "/architecture"
          }
        ]
      },

      {
        text: "API Reference",
        items: [
          {
            text: "HaxUI",
            link: "/api/haxui"
          },
          {
            text: "Window",
            link: "/api/window"
          },
          {
            text: "Button",
            link: "/api/button"
          },
          {
            text: "Themes",
            link: "/api/themes"
          }
        ]
      },

      {
        text: "Advanced",
        items: [
          {
            text: "Roadmap",
            link: "/roadmap"
          },
          {
            text: "Philosophy",
            link: "/philosophy"
          }
        ]
      }
    ],

    socialLinks: [
      {
        icon: "github",
        link: "https://github.com/mcvn2wrgx2-cpu/haxball-ui-framework"
      }
    ],

    footer: {
      message: "Released under the MIT License.",
      copyright: "Copyright © 2026 HaxBall UI Framework"
    }
  }
};
