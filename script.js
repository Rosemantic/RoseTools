// 全局变量
let sitesData = { categories: [], sites: [] };
let currentSearchTerm = "";
let currentTheme =
  localStorage.getItem("theme") ||
  (window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light");
let expandedCategories = new Set(); // 跟踪展开的分类
let favorites = JSON.parse(localStorage.getItem("favorites") || "[]"); // 收藏列表

// DOM 加载完成后初始化
document.addEventListener("DOMContentLoaded", function () {
  initializeTheme();
  initializeApp();
  setupEventListeners();
});

// 初始化主题
function initializeTheme() {
  // 应用主题
  applyTheme(currentTheme);

  // 监听系统主题变化
  window
    .matchMedia("(prefers-color-scheme: dark)")
    .addEventListener("change", (e) => {
      if (!localStorage.getItem("theme")) {
        currentTheme = e.matches ? "dark" : "light";
        applyTheme(currentTheme);
      }
    });
}

// 应用主题
function applyTheme(theme) {
  const html = document.documentElement;
  const body = document.body;
  const themeIcon = document.getElementById("theme-icon");
  const themeText = document.getElementById("theme-text");

  // 添加过渡动画类
  body.classList.add("theme-transition");

  if (theme === "dark") {
    html.classList.add("dark");
    if (themeIcon) {
      themeIcon.className = "fas fa-sun mr-3 text-sm";
    }
    if (themeText) {
      themeText.textContent = "切换到浅色模式";
    }
  } else {
    html.classList.remove("dark");
    if (themeIcon) {
      themeIcon.className = "fas fa-moon mr-3 text-sm";
    }
    if (themeText) {
      themeText.textContent = "切换到深色模式";
    }
  }

  // 移除过渡动画类
  setTimeout(() => {
    body.classList.remove("theme-transition");
  }, 300);
}

// 切换主题
function toggleTheme() {
  currentTheme = currentTheme === "dark" ? "light" : "dark";
  localStorage.setItem("theme", currentTheme);
  applyTheme(currentTheme);

  // 添加图标旋转动画
  const themeIcon = document.getElementById("theme-icon");
  if (themeIcon) {
    themeIcon.style.transform = "rotate(360deg)";
    setTimeout(() => {
      themeIcon.style.transform = "rotate(0deg)";
    }, 300);
  }
}

// 初始化应用
function initializeApp() {
  try {
    loadSitesData();
    renderCategories();
    renderAllSites();
    updateSiteCount();
  } catch (error) {
    console.error("初始化失败:", error);
    showError("数据加载失败，请刷新页面重试。");
  }
}

// 加载网站数据
const loadSitesData = () => {
  try {
    // 从 sites-data.js 加载数据（已通过 script 标签引入）
    if (typeof SITES_DATA !== "undefined") {
      sitesData = SITES_DATA;
    } else {
      throw new Error("SITES_DATA 未定义");
    }

    // 验证数据格式
    if (!sitesData.categories || !sitesData.sites) {
      throw new Error("数据格式错误");
    }
  } catch (error) {
    console.error("加载数据失败:", error);
    // 使用备用数据
    sitesData = {
      categories: [
        {
          name: "学习",
          subcategories: ["在线课程", "编程学习"],
        },
        {
          name: "工具",
          subcategories: ["开发工具"],
        },
      ],
      sites: [
        {
          name: "GitHub",
          url: "https://github.com",
          category: "工具",
          subcategory: "开发工具",
          description: "代码托管平台",
        },
      ],
    };
  }
};

// 设置事件监听器
function setupEventListeners() {
  // 搜索功能
  const searchInput = document.getElementById("search-input");
  searchInput.addEventListener("input", debounce(handleSearch, 300));

  // 移动端菜单
  const mobileMenuBtn = document.getElementById("mobile-menu-btn");
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("sidebar-overlay");

  mobileMenuBtn.addEventListener("click", toggleSidebar);
  overlay.addEventListener("click", closeSidebar);

  // 侧边栏关闭按钮
  const sidebarCloseBtn = document.getElementById("sidebar-close-btn");
  if (sidebarCloseBtn) {
    sidebarCloseBtn.addEventListener("click", closeSidebar);
  }

  // 主题切换按钮
  const themeToggle = document.getElementById("theme-toggle");
  if (themeToggle) {
    themeToggle.addEventListener("click", toggleTheme);
  }

  // 键盘快捷键
  document.addEventListener("keydown", function (e) {
    // Ctrl/Cmd + K 聚焦搜索框
    if ((e.ctrlKey || e.metaKey) && e.key === "k") {
      e.preventDefault();
      searchInput.focus();
    }
    // ESC 关闭侧边栏
    if (e.key === "Escape") {
      closeSidebar();
    }
    // Ctrl/Cmd + D 切换主题
    if ((e.ctrlKey || e.metaKey) && e.key === "d") {
      e.preventDefault();
      toggleTheme();
    }
  });
}

// 防抖函数
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// 处理搜索
function handleSearch(e) {
  currentSearchTerm = e.target.value.trim().toLowerCase();

  if (currentSearchTerm === "") {
    // 清空搜索，显示所有网站
    renderAllSites();
    hideSearchResults();
  } else {
    // 执行搜索
    performSearch(currentSearchTerm);
    showSearchResults();
  }
}

// 执行搜索
function performSearch(searchTerm) {
  const filteredSites = sitesData.sites.filter((site) => {
    return (
      site.name.toLowerCase().includes(searchTerm) ||
      site.description.toLowerCase().includes(searchTerm) ||
      site.category.toLowerCase().includes(searchTerm) ||
      (site.subcategory && site.subcategory.toLowerCase().includes(searchTerm))
    );
  });

  renderSearchResults(filteredSites);
  updateSearchCount(filteredSites.length);
}

// 渲染搜索结果
function renderSearchResults(sites) {
  const container = document.getElementById("categories-container");
  const noResults = document.getElementById("no-results");

  if (sites.length === 0) {
    container.style.display = "none";
    noResults.classList.remove("hidden");
    // 确保无结果提示是搜索专用的
    restoreDefaultNoResults();
    return;
  }

  container.style.display = "block";
  noResults.classList.add("hidden");

  container.innerHTML = `
        <div class="mb-8">
            <h2 class="text-xl font-bold text-gray-800 dark:text-gray-100 mb-6 category-title">搜索结果</h2>
            <div class="sites-grid grid gap-6">
                ${sites.map((site) => createSiteCard(site)).join("")}
            </div>
        </div>
    `;
}

// 显示搜索结果信息
function showSearchResults() {
  document.getElementById("search-results-info").classList.remove("hidden");
}

// 隐藏搜索结果信息
function hideSearchResults() {
  document.getElementById("search-results-info").classList.add("hidden");
}

// 更新搜索计数
function updateSearchCount(count) {
  document.getElementById("search-count").textContent = count;
}

// 渲染分类导航
function renderCategories() {
  const nav = document.getElementById("category-nav");

  // 添加"全部"选项
  let navHTML = `
        <a href="#" class="category-item flex items-center px-4 py-3 text-gray-700 dark:text-gray-300 rounded-lg active" data-category="all">
            <i class="fas fa-th-large w-5 text-center mr-3 text-sm"></i>
            <span>全部网站</span>
            <span class="ml-auto text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded-full">${sitesData.sites.length}</span>
        </a>
        <a href="#favorites" class="category-item flex items-center px-4 py-3 text-gray-700 dark:text-gray-300 rounded-lg" data-category="favorites">
            <i class="fas fa-heart w-5 text-center mr-3 text-sm"></i>
            <span>我的收藏</span>
            <span class="ml-auto text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded-full favorites-count">${favorites.length}</span>
        </a>
    `;

  // 添加分类选项
  sitesData.categories.forEach((categoryObj) => {
    const categoryName = categoryObj.name;
    const count = sitesData.sites.filter(
      (site) => site.category === categoryName
    ).length;
    const icon = getCategoryIcon(categoryName);
    const hasSubcategories =
      categoryObj.subcategories && categoryObj.subcategories.length > 0;
    const isExpanded = expandedCategories.has(categoryName);
    const expandIcon = isExpanded
      ? "fas fa-chevron-down"
      : "fas fa-chevron-right";

    navHTML += `
            <div class="category-group">
                <a href="#${categoryName}" class="category-item main-category flex items-center px-4 py-3 text-gray-700 dark:text-gray-300 rounded-lg" data-category="${categoryName}" data-type="main">
                    <i class="${icon} w-5 text-center mr-3 text-sm"></i>
                    <span>${categoryName}</span>
                    <span class="ml-auto flex items-center">
                        <span class="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded-full mr-2">${count}</span>
                        ${
                          hasSubcategories
                            ? `<i class="${expandIcon} expand-icon text-xs transition-transform duration-200"></i>`
                            : ""
                        }
                    </span>
                </a>
                ${
                  hasSubcategories
                    ? `<div class="subcategories-container ${
                        isExpanded ? "expanded" : "collapsed"
                      }" data-category="${categoryName}">`
                    : ""
                }
        `;

    // 添加子分类
    if (hasSubcategories) {
      categoryObj.subcategories.forEach((subcategory) => {
        const subCount = sitesData.sites.filter(
          (site) =>
            site.category === categoryName && site.subcategory === subcategory
        ).length;

        if (subCount > 0) {
          navHTML += `
                    <a href="#${categoryName}-${subcategory}" class="category-item subcategory-item flex items-center px-8 py-2 text-gray-600 dark:text-gray-400 rounded-lg ml-4" data-category="${categoryName}" data-subcategory="${subcategory}" data-type="sub">
                        <i class="fas fa-circle w-4 text-center mr-3 text-xs opacity-50"></i>
                        <span class="text-sm">${subcategory}</span>
                        <span class="ml-auto text-xs bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-2 py-1 rounded-full">${subCount}</span>
                    </a>
                `;
        }
      });
      navHTML += `</div>`;
    }

    if (!hasSubcategories) {
      navHTML += `</div>`;
    }
  });

  nav.innerHTML = navHTML;

  // 添加分类导航点击事件
  nav.querySelectorAll(".category-item").forEach((item) => {
    item.addEventListener("click", function (e) {
      e.preventDefault();
      const category = this.dataset.category;
      const subcategory = this.dataset.subcategory;
      const type = this.dataset.type;

      const isMobile = window.innerWidth < 768;
      const hasSubcategories =
        type === "main" &&
        sitesData.categories.find((cat) => cat.name === category)?.subcategories
          ?.length > 0;

      if (hasSubcategories) {
        // 主分类点击 - 切换展开/收缩状态
        if (isMobile) {
          // 移动端：只展开/收起子分类，不更新内容，不关闭侧边栏
          toggleCategoryExpansion(category);
        } else {
          // 桌面端：展开并显示该分类内容
          toggleCategoryExpansion(category);
          handleCategoryClick(category, this, subcategory, false);
        }
      } else {
        // 子分类点击或无子分类的主分类 - 显示内容
        // 在移动端关闭侧边栏
        handleCategoryClick(category, this, subcategory, isMobile);
      }
    });
  });
}

// 切换分类展开/收缩状态
function toggleCategoryExpansion(category) {
  const container = document.querySelector(
    `.subcategories-container[data-category="${category}"]`
  );
  const expandIcon = document.querySelector(
    `.main-category[data-category="${category}"] .expand-icon`
  );

  if (!container || !expandIcon) return;

  if (expandedCategories.has(category)) {
    // 收缩
    expandedCategories.delete(category);
    container.classList.remove("expanded");
    container.classList.add("collapsed");
    expandIcon.classList.remove("fa-chevron-down");
    expandIcon.classList.add("fa-chevron-right");
  } else {
    // 展开
    expandedCategories.add(category);
    container.classList.remove("collapsed");
    container.classList.add("expanded");
    expandIcon.classList.remove("fa-chevron-right");
    expandIcon.classList.add("fa-chevron-down");
  }
}

// 处理分类点击
function handleCategoryClick(
  category,
  element,
  subcategory = null,
  shouldCloseSidebar = true
) {
  // 检查是否从收藏夹切换到其他分类
  const previousActive = document.querySelector(".category-item.active");
  const isLeavingFavorites =
    previousActive &&
    previousActive.dataset.category === "favorites" &&
    category !== "favorites";

  // 更新活跃状态
  document.querySelectorAll(".category-item").forEach((item) => {
    item.classList.remove("active");
  });
  element.classList.add("active");

  // 清空搜索
  document.getElementById("search-input").value = "";
  currentSearchTerm = "";
  hideSearchResults();

  // 重置容器状态，确保从任何状态都能正确切换
  const container = document.getElementById("categories-container");
  const noResults = document.getElementById("no-results");

  // 如果从收藏夹切换到其他分类，恢复默认的无结果提示
  if (isLeavingFavorites) {
    restoreDefaultNoResults();
    container.style.display = "block";
    noResults.classList.add("hidden");
  }

  // 渲染对应分类的网站
  if (category === "all") {
    renderAllSites();
  } else if (category === "favorites") {
    renderFavorites();
  } else if (subcategory) {
    renderSubcategorySites(category, subcategory);
  } else {
    renderCategorySites(category);
    // 滚动到对应分类（如果在显示所有网站的模式下）
    const categorySection = document.getElementById(`category-${category}`);
    if (categorySection) {
      categorySection.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  // 根据参数决定是否关闭侧边栏
  if (shouldCloseSidebar) {
    closeSidebar();
  }
}

// 获取分类图标
function getCategoryIcon(category) {
  const icons = {
    学习: "fas fa-graduation-cap",
    工具: "fas fa-tools",
    娱乐: "fas fa-gamepad",
    设计: "fas fa-palette",
    开发: "fas fa-code",
    新闻: "fas fa-newspaper",
    社交: "fas fa-users",
    购物: "fas fa-shopping-cart",
    音乐: "fas fa-music",
    视频: "fas fa-video",
  };
  return icons[category] || "fas fa-folder";
}

// 渲染所有网站（按分类分组）
function renderAllSites() {
  const container = document.getElementById("categories-container");
  const noResults = document.getElementById("no-results");

  container.style.display = "block";
  noResults.classList.add("hidden");

  let html = "";

  sitesData.categories.forEach((categoryObj) => {
    const categoryName = categoryObj.name;
    const categorySites = sitesData.sites.filter(
      (site) => site.category === categoryName
    );

    if (categorySites.length > 0) {
      html += `
                <div class="mb-12" id="category-${categoryName}">
                    <h2 class="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6 category-title">${categoryName}</h2>
            `;

      // 按子分类分组显示
      categoryObj.subcategories.forEach((subcategory) => {
        const subcategorySites = categorySites.filter(
          (site) => site.subcategory === subcategory
        );

        if (subcategorySites.length > 0) {
          html += `
                    <div class="mb-8">
                        <h3 class="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-4 ml-4">${subcategory}</h3>
                        <div class="sites-grid grid gap-6">
                            ${subcategorySites
                              .map((site) => createSiteCard(site))
                              .join("")}
                        </div>
                    </div>
                `;
        }
      });

      html += `</div>`;
    }
  });

  container.innerHTML = html;
}

// 渲染特定分类的网站
function renderCategorySites(category) {
  const container = document.getElementById("categories-container");
  const noResults = document.getElementById("no-results");

  // 确保容器状态正确
  container.style.display = "block";
  noResults.classList.add("hidden");

  const categorySites = sitesData.sites.filter(
    (site) => site.category === category
  );

  // 获取分类对象以获取子分类信息
  const categoryObj = sitesData.categories.find((cat) => cat.name === category);

  let html = `
        <div class="mb-8">
            <h2 class="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6 category-title">${category}</h2>
    `;

  if (categoryObj && categoryObj.subcategories) {
    // 按子分类分组显示
    categoryObj.subcategories.forEach((subcategory) => {
      const subcategorySites = categorySites.filter(
        (site) => site.subcategory === subcategory
      );

      if (subcategorySites.length > 0) {
        html += `
                <div class="mb-8">
                    <h3 class="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-4 ml-4">${subcategory}</h3>
                    <div class="sites-grid grid gap-6">
                        ${subcategorySites
                          .map((site) => createSiteCard(site))
                          .join("")}
                    </div>
                </div>
            `;
      }
    });
  } else {
    // 如果没有子分类，直接显示所有网站
    html += `
            <div class="sites-grid grid gap-6">
                ${categorySites.map((site) => createSiteCard(site)).join("")}
            </div>
        `;
  }

  html += `</div>`;
  container.innerHTML = html;
}

// 渲染特定子分类的网站
function renderSubcategorySites(category, subcategory) {
  const container = document.getElementById("categories-container");
  const noResults = document.getElementById("no-results");

  // 确保容器状态正确
  container.style.display = "block";
  noResults.classList.add("hidden");

  const subcategorySites = sitesData.sites.filter(
    (site) => site.category === category && site.subcategory === subcategory
  );

  container.innerHTML = `
        <div class="mb-8">
            <div class="flex items-center mb-6">
                <h2 class="text-2xl font-bold text-gray-800 dark:text-gray-100 category-title">${category}</h2>
                <span class="mx-3 text-gray-400">/</span>
                <h3 class="text-xl font-semibold text-gray-600 dark:text-gray-400">${subcategory}</h3>
            </div>
            <div class="sites-grid grid gap-6">
                ${subcategorySites.map((site) => createSiteCard(site)).join("")}
            </div>
        </div>
    `;
}

// 创建网站卡片
function createSiteCard(site) {
  const faviconUrl = getFaviconUrl(site.url);
  const domain = new URL(site.url).hostname;
  const siteId = `${site.name}-${site.url}`.replace(/[^a-zA-Z0-9]/g, "-");
  const isFavorited = favorites.some(
    (fav) => fav.name === site.name && fav.url === site.url
  );

  return `
        <div class="website-card bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 relative">
            <!-- 收藏按钮 -->
            <button 
                class="favorite-btn absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 ${
                  isFavorited
                    ? "text-red-500 bg-red-50 dark:bg-red-900/30"
                    : "text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30"
                }"
                onclick="toggleFavorite('${siteId}', '${site.name.replace(
    /'/g,
    "\\'"
  )}', '${site.url}', '${site.category}', '${
    site.subcategory || ""
  }', '${site.description.replace(/'/g, "\\'")}', this)"
                title="${isFavorited ? "取消收藏" : "添加到收藏"}"
            >
                <i class="fas fa-heart text-sm"></i>
            </button>
            
            <div class="flex items-start space-x-4 h-full">
                <div class="site-icon w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0">
                    <img 
                        src="${faviconUrl}" 
                        alt="${site.name}" 
                        class="w-8 h-8 rounded-md"
                        onerror="this.style.display='none'; this.nextElementSibling.style.display='flex'"
                    >
                    <div class="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-md hidden items-center justify-center">
                        <span class="text-white text-sm font-semibold">${site.name.charAt(
                          0
                        )}</span>
                    </div>
                </div>
                
                <div class="flex-1 min-w-0 flex flex-col">
                    <h3 class="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-1 truncate pr-8">${
                      site.name
                    }</h3>
                    <div class="flex-1">
                        <p class="text-gray-600 dark:text-gray-300 text-sm line-clamp-2 h-10 leading-5">${
                          site.description
                        }</p>
                    </div>
                    <div class="flex items-center justify-between mt-3">
                        <span class="text-xs text-gray-400 dark:text-gray-500">${domain}</span>
                        <a 
                            href="${site.url}" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            class="btn-primary inline-flex items-center px-4 py-2 text-sm font-medium text-white rounded-lg hover:shadow-lg transition-all duration-200"
                        >
                            访问
                            <i class="fas fa-external-link-alt ml-2 text-xs"></i>
                        </a>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// 获取网站favicon URL
function getFaviconUrl(url) {
  try {
    const domain = new URL(url).hostname;
    // 使用多个备选方案确保可靠性
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
  } catch (error) {
    console.error("Invalid URL:", url);
    return 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>';
  }
}

// 更新网站总数
function updateSiteCount() {
  document.getElementById("total-sites").textContent = sitesData.sites.length;
}

// 切换侧边栏（移动端）
function toggleSidebar() {
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("sidebar-overlay");
  const btn = document.getElementById("mobile-menu-btn");

  if (sidebar.classList.contains("open")) {
    closeSidebar();
  } else {
    sidebar.classList.add("open");
    overlay.classList.remove("hidden");
    // 隐藏汉堡菜单按钮避免遮挡logo
    btn.classList.add("hidden");
  }
}

// 关闭侧边栏（移动端）
function closeSidebar() {
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("sidebar-overlay");
  const btn = document.getElementById("mobile-menu-btn");

  sidebar.classList.remove("open");
  overlay.classList.add("hidden");
  // 显示汉堡菜单按钮
  btn.classList.remove("hidden");
}

// 显示错误信息
function showError(message) {
  const container = document.getElementById("categories-container");
  container.innerHTML = `
        <div class="text-center py-16">
            <div class="text-red-400 dark:text-red-300">
                <i class="fas fa-exclamation-triangle text-6xl mb-4"></i>
                <p class="text-xl mb-2">加载失败</p>
                <p class="text-gray-500 dark:text-gray-400">${message}</p>
            </div>
        </div>
    `;
}

// 处理窗口大小变化
window.addEventListener("resize", function () {
  if (window.innerWidth >= 768) {
    // 桌面端自动显示侧边栏
    const sidebar = document.getElementById("sidebar");
    const overlay = document.getElementById("sidebar-overlay");
    sidebar.classList.remove("open");
    overlay.classList.add("hidden");
  }
});

// 收藏功能相关函数

// 切换收藏状态
function toggleFavorite(
  siteId,
  name,
  url,
  category,
  subcategory,
  description,
  buttonElement
) {
  const site = {
    name: name,
    url: url,
    category: category,
    subcategory: subcategory || null,
    description: description,
  };

  const existingIndex = favorites.findIndex(
    (fav) => fav.name === name && fav.url === url
  );

  if (existingIndex >= 0) {
    // 取消收藏
    favorites.splice(existingIndex, 1);
    buttonElement.classList.remove(
      "text-red-500",
      "bg-red-50",
      "dark:bg-red-900/30"
    );
    buttonElement.classList.add("text-gray-400");
    buttonElement.title = "添加到收藏";
    showNotification("已从收藏夹移除");
  } else {
    // 添加收藏
    favorites.push(site);
    buttonElement.classList.remove("text-gray-400");
    buttonElement.classList.add(
      "text-red-500",
      "bg-red-50",
      "dark:bg-red-900/30"
    );
    buttonElement.title = "取消收藏";
    showNotification("已添加到收藏夹");
  }

  // 保存到localStorage
  localStorage.setItem("favorites", JSON.stringify(favorites));

  // 如果当前正在显示收藏夹，重新渲染
  const activeCategory = document.querySelector(".category-item.active");
  if (activeCategory && activeCategory.dataset.category === "favorites") {
    renderFavorites();
  }

  // 更新侧边栏收藏数量
  updateFavoritesCount();
}

// 显示通知
function showNotification(message) {
  // 创建通知元素
  const notification = document.createElement("div");
  notification.className =
    "fixed top-4 right-4 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 px-6 py-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 z-50 transform translate-x-full transition-transform duration-300";
  notification.innerHTML = `
    <div class="flex items-center space-x-2">
      <i class="fas fa-heart text-red-500 text-sm"></i>
      <span class="text-sm font-medium">${message}</span>
    </div>
  `;

  document.body.appendChild(notification);

  // 显示动画
  setTimeout(() => {
    notification.classList.remove("translate-x-full");
  }, 100);

  // 自动移除
  setTimeout(() => {
    notification.classList.add("translate-x-full");
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }, 2000);
}

// 渲染收藏夹
function renderFavorites() {
  const container = document.getElementById("categories-container");
  const noResults = document.getElementById("no-results");

  if (favorites.length === 0) {
    container.style.display = "none";
    noResults.classList.remove("hidden");
    // 修改无结果提示为收藏夹专用
    noResults.innerHTML = `
      <div class="text-center py-16">
        <div class="text-gray-400 dark:text-gray-500">
          <i class="fas fa-heart text-6xl mb-4"></i>
          <p class="text-xl mb-2">还没有收藏任何网站</p>
          <p class="text-gray-500 dark:text-gray-400">点击网站卡片上的心形图标来收藏你喜欢的网站吧</p>
        </div>
      </div>
    `;
    return;
  }

  container.style.display = "block";
  noResults.classList.add("hidden");

  container.innerHTML = `
    <div class="mb-8">
      <h2 class="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6 category-title">我的收藏</h2>
      <div class="sites-grid grid gap-6">
        ${favorites.map((site) => createSiteCard(site)).join("")}
      </div>
    </div>
  `;
}

// 恢复默认的无结果提示
function restoreDefaultNoResults() {
  const noResults = document.getElementById("no-results");
  noResults.innerHTML = `
    <div class="text-center py-16">
      <div class="text-gray-400 dark:text-gray-500">
        <i class="fas fa-search text-6xl mb-4"></i>
        <p class="text-xl mb-2">没有找到相关网站</p>
        <p class="text-gray-500 dark:text-gray-400">试试其他关键词吧</p>
      </div>
    </div>
  `;
}

// 更新收藏数量显示
function updateFavoritesCount() {
  const favoritesNavItem = document.querySelector(
    '.category-item[data-category="favorites"] .favorites-count'
  );
  if (favoritesNavItem) {
    favoritesNavItem.textContent = favorites.length;
  }
}

// 调试函数
function debugState() {
  const container = document.getElementById("categories-container");
  const noResults = document.getElementById("no-results");
  const activeCategory = document.querySelector(".category-item.active");

  console.log("=== 当前状态调试信息 ===");
  console.log("容器显示状态:", container.style.display);
  console.log("无结果提示是否隐藏:", noResults.classList.contains("hidden"));
  console.log(
    "当前激活分类:",
    activeCategory ? activeCategory.dataset.category : "无"
  );
  console.log("收藏列表长度:", favorites.length);
  console.log("收藏列表内容:", favorites);
  console.log("容器内容长度:", container.innerHTML.length);
  console.log("========================");
}

// 将调试函数添加到全局，便于在控制台调用
window.debugState = debugState;

// 添加一些实用功能
document.addEventListener("DOMContentLoaded", function () {
  // 为搜索框添加快捷键提示
  const searchInput = document.getElementById("search-input");
  if (navigator.userAgent.indexOf("Mac") > 0) {
    searchInput.placeholder = "搜索网站... (⌘K)";
  } else {
    searchInput.placeholder = "搜索网站... (Ctrl+K)";
  }
});
