const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const revealElements = document.querySelectorAll(".reveal");

if (prefersReducedMotion || !("IntersectionObserver" in window)) {
  revealElements.forEach((element) => element.classList.add("is-visible"));
} else {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.08 }
  );

  revealElements.forEach((element) => observer.observe(element));
}

document.getElementById("year").textContent = String(new Date().getFullYear());

const menuButton = document.querySelector(".menu-button");
const mobileNav = document.getElementById("mobile-nav");

menuButton.addEventListener("click", () => {
  const isOpen = menuButton.getAttribute("aria-expanded") === "true";
  menuButton.setAttribute("aria-expanded", String(!isOpen));
  mobileNav.hidden = isOpen;
});

mobileNav.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    menuButton.setAttribute("aria-expanded", "false");
    mobileNav.hidden = true;
  });
});

const createIcon = (name) => {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
  use.setAttribute("href", `#${name}`);
  svg.append(use);
  return svg;
};

const normalizeUrl = (value, fallback, imageOnly = false) => {
  if (typeof value !== "string" || !value.trim()) return fallback;

  try {
    const url = new URL(value, window.location.origin);
    if (!['http:', 'https:'].includes(url.protocol)) return fallback;
    if (imageOnly && url.origin !== window.location.origin && url.hostname !== "res.cloudinary.com") {
      return fallback;
    }
    return url.origin === window.location.origin
      ? `${url.pathname}${url.search}${url.hash}`
      : url.href;
  } catch {
    return fallback;
  }
};

const setMultilineText = (element, value) => {
  if (!element || typeof value !== "string") return;

  const lines = value.split(/\r?\n/);
  const nodes = [];

  lines.forEach((line, index) => {
    if (index) nodes.push(document.createElement("br"));
    if (element.classList.contains("hero-note") && index === 1) {
      const span = document.createElement("span");
      span.textContent = line;
      nodes.push(span);
    } else {
      nodes.push(document.createTextNode(line));
    }
  });

  element.replaceChildren(...nodes);
};

const renderProjects = (projects) => {
  const projectGrid = document.querySelector(".project-grid");
  if (!projectGrid || !Array.isArray(projects) || !projects.length) return;

  projectGrid.replaceChildren(
    ...projects.slice(0, 3).map((project) => {
      const link = document.createElement("a");
      const imageContainer = document.createElement("div");
      const image = document.createElement("img");
      const type = document.createElement("span");
      const title = document.createElement("h3");
      const description = document.createElement("p");

      link.className = "project-card";
      link.href = normalizeUrl(project.url, "#projects");
      imageContainer.className = "project-image";
      image.src = normalizeUrl(project.image, "/assets/workspace.jpg", true);
      image.alt = project.title || "项目图片";
      image.loading = "lazy";
      type.className = "project-type";
      type.textContent = project.type || "Project";
      title.append(document.createTextNode(project.title || "Untitled"), createIcon("icon-arrow"));
      description.textContent = project.description || "";
      imageContainer.append(image);
      link.append(imageContainer, type, title, description);
      return link;
    })
  );
};

const renderPhotos = (photos) => {
  const photoGrid = document.querySelector(".photo-grid");
  if (!photoGrid || !Array.isArray(photos) || !photos.length) return;

  photoGrid.replaceChildren(
    ...photos.slice(0, 6).map((photo) => {
      const figure = document.createElement("figure");
      const image = document.createElement("img");
      image.src = normalizeUrl(photo.image, "/assets/hero.jpg", true);
      image.alt = photo.alt || "生活照片";
      image.loading = "lazy";
      figure.append(image);
      return figure;
    })
  );
};

const applyHomepageContent = (content) => {
  if (!content || typeof content !== "object") return;

  const hero = content.hero || {};
  document.getElementById("hero-title").textContent = hero.name || "Nike Tao";
  setMultilineText(document.querySelector(".hero-tagline"), hero.tagline);
  setMultilineText(document.querySelector(".hero-intro"), hero.intro);
  setMultilineText(document.querySelector(".hero-note"), hero.note);
  setMultilineText(document.querySelector(".hero-location span"), hero.location);
  document.querySelector(".hero-photo").src = normalizeUrl(hero.image, "/assets/hero-mountain.jpg", true);

  document.getElementById("currently-updated").textContent = content.currentlyUpdated || "Updated recently";
  if (Array.isArray(content.currently)) {
    document.querySelectorAll(".currently-grid article").forEach((article, index) => {
      const item = content.currently[index];
      if (!item) return;
      article.querySelector("p").textContent = item.label || "";
      article.querySelector("strong").textContent = item.title || "";
      article.querySelector("div > span").textContent = item.description || "";
    });
  }

  renderProjects(content.projects);
  renderPhotos(content.photos);

  const book = content.book || {};
  setMultilineText(document.getElementById("book-cover-title"), book.coverTitle);
  document.getElementById("book-title").textContent = book.title || "";
  document.getElementById("book-author").textContent = book.author || "";
  const progress = Math.min(100, Math.max(0, Number(book.progress) || 0));
  document.getElementById("book-progress-bar").style.width = `${progress}%`;
  document.getElementById("book-progress").textContent = `${progress}%`;

  const music = content.music || {};
  document.getElementById("music-title").textContent = music.title || "";
  document.getElementById("music-artist").textContent = music.artist || "";
  const musicCover = document.getElementById("music-cover");
  musicCover.src = normalizeUrl(music.cover, "/assets/moon.jpg", true);
  musicCover.alt = music.title ? `${music.title} 专辑视觉` : "专辑视觉";

  const stats = content.stats || {};
  document.getElementById("stats-since").textContent = stats.since || "";
  document.getElementById("stats-status").textContent = stats.status || "";
  document.getElementById("stats-books").textContent = stats.books || "0";
  document.getElementById("stats-photos").textContent = stats.photos || "0";
};

fetch("/content.json", { cache: "no-store" })
  .then((response) => {
    if (!response.ok) throw new Error(`Homepage content request failed: ${response.status}`);
    return response.json();
  })
  .then(applyHomepageContent)
  .catch(() => {});

const writingList = document.getElementById("writing-list");
const postCount = document.getElementById("post-count");
const randomPostButton = document.getElementById("random-post");
const writingImages = ["/assets/workspace.jpg", "/assets/moon.jpg", "/assets/hero.jpg"];
let blogItems = [];

const formatDate = (value) =>
  new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);

const renderWriting = (items) => {
  writingList.replaceChildren(
    ...items.slice(0, 3).map((item, index) => {
      const link = document.createElement("a");
      const image = document.createElement("img");
      const content = document.createElement("span");
      const title = document.createElement("strong");
      const summary = document.createElement("p");
      const meta = document.createElement("em");
      const category = document.createElement("span");

      link.className = "writing-row";
      link.href = item.link;
      image.src = item.image || writingImages[index % writingImages.length];
      image.alt = "";
      image.loading = "lazy";
      image.width = 1400;
      image.height = 1050;
      title.textContent = item.title;
      summary.textContent = item.summary;
      meta.textContent = formatDate(item.date);
      category.textContent = `# ${item.category}`;
      meta.append(category);

      content.append(title, summary, meta);
      link.append(image, content);
      return link;
    })
  );
};

fetch("/blog/index.xml")
  .then((response) => {
    if (!response.ok) throw new Error(`RSS request failed: ${response.status}`);
    return response.text();
  })
  .then((xml) => {
    const documentNode = new DOMParser().parseFromString(xml, "application/xml");
    if (documentNode.querySelector("parsererror")) throw new Error("RSS parse failed");

    blogItems = [...documentNode.querySelectorAll("item")].map((item) => {
      const descriptionSource = item.querySelector("description")?.textContent || "";
      const descriptionDocument = new DOMParser().parseFromString(descriptionSource, "text/html");
      const feedImage = descriptionDocument.querySelector("img")?.getAttribute("src") || "";

      return {
        title: item.querySelector("title")?.textContent?.trim() || "未命名文章",
        link: item.querySelector("link")?.textContent?.trim() || "/blog/",
        date: new Date(item.querySelector("pubDate")?.textContent || Date.now()),
        summary: (descriptionDocument.body.textContent || "记录最近的思考与生活片段。")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 42),
        category: item.querySelector("category")?.textContent?.trim() || "记录",
        image: normalizeUrl(feedImage, "", true),
      };
    });

    if (blogItems.length) {
      renderWriting(blogItems);
      postCount.textContent = String(blogItems.length);
    }
  })
  .catch(() => {
    postCount.textContent = "29";
  });

randomPostButton.addEventListener("click", () => {
  if (!blogItems.length) {
    window.location.href = "/blog/";
    return;
  }

  const item = blogItems[Math.floor(Math.random() * blogItems.length)];
  window.location.href = item.link;
});
