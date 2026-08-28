CMS.registerEditorComponent({
  id: "custom-image",
  label: "图片（可调整大小）",

  fields: [
    {
      name: "src",
      label: "图片",
      widget: "image"
    },
    {
      name: "alt",
      label: "图片说明",
      widget: "string",
      required: false
    },
    {
      name: "width",
      label: "图片宽度",
      widget: "select",
      options: [
        "auto",
        "25%",
        "50%",
        "75%",
        "100%",
        "400px",
        "500px",
        "600px",
        "800px",
        "1000px"
      ],
      default: "auto"
    },
    {
      name: "align",
      label: "图片位置",
      widget: "select",
      options: [
        {
          label: "左对齐",
          value: "left"
        },
        {
          label: "居中",
          value: "center"
        },
        {
          label: "右对齐",
          value: "right"
        }
      ],
      default: "center"
    }
  ],

  pattern: /^<div class="custom-image ([^"]+)">\s*<img src="([^"]+)" alt="([^"]*)"([^>]*)>\s*<\/div>$/,

  fromBlock: function(match) {
    const widthMatch = match[4].match(/data-width="([^"]+)"/);
    const alignMatch = match[4].match(/data-align="([^"]+)"/);

    return {
      src: match[2],
      alt: match[3],
      width: widthMatch ? widthMatch[1] : "auto",
      align: alignMatch ? alignMatch[1] : "center"
    };
  },

  toBlock: function(obj) {
    const width = obj.width || "auto";
    const align = obj.align || "center";
    const alt = obj.alt || "";

    let style = "";

    if (width !== "auto") {
      style += `width:${width};`;
    }

    if (align === "center") {
      style += "display:block;margin-left:auto;margin-right:auto;";
    } else if (align === "right") {
      style += "display:block;margin-left:auto;margin-right:0;";
    } else {
      style += "display:block;margin-left:0;margin-right:auto;";
    }

    return `<div class="custom-image ${align}"><img src="${obj.src}" alt="${alt}" style="${style}" data-width="${width}" data-align="${align}"></div>`;
  },

  toPreview: function(obj) {
    const width = obj.width && obj.width !== "auto"
      ? obj.width
      : "100%";

    const align = obj.align || "center";

    let margin = "0 auto";

    if (align === "left") {
      margin = "0 auto 0 0";
    } else if (align === "right") {
      margin = "0 0 0 auto";
    }

    return `
      <div style="width:100%;">
        <img
          src="${obj.src}"
          alt="${obj.alt || ""}"
          style="
            width:${width};
            max-width:100%;
            height:auto;
            display:block;
            margin:${margin};
          "
        >
      </div>
    `;
  }
});
