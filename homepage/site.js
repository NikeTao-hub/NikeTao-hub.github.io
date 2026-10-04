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
      const date = document.createElement("small");

      link.className = "writing-row";
      link.href = item.link;
      image.src = writingImages[index % writingImages.length];
      image.alt = "";
      image.loading = "lazy";
      image.width = 1400;
      image.height = 1050;
      title.textContent = item.title;
      date.textContent = formatDate(item.date);

      content.append(title, date);
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

    blogItems = [...documentNode.querySelectorAll("item")].map((item) => ({
      title: item.querySelector("title")?.textContent?.trim() || "未命名文章",
      link: item.querySelector("link")?.textContent?.trim() || "/blog/",
      date: new Date(item.querySelector("pubDate")?.textContent || Date.now()),
    }));

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
