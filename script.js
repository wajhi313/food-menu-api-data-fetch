const API = "https://www.themealdb.com/api/json/v1/1";
const mealGrid = document.getElementById("mealGrid");
const categoriesEl = document.getElementById("categories");
const statusEl = document.getElementById("status");
const emptyState = document.getElementById("emptyState");
const searchInput = document.getElementById("searchInput");

let allMeals = [];
let activeCategory = "All";

async function getJSON(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error("API request failed");
  return response.json();
}

async function loadMeals() {
  showLoading();

  try {
    const meals = [];

    for (let i = 0; i < 8; i++) {
      const data = await getJSON(`${API}/random.php`);
      if (data.meals?.[0]) meals.push(data.meals[0]);
    }

    allMeals = [
      ...new Map(meals.map(meal => [meal.idMeal, meal])).values()
    ];

    renderMeals(allMeals);
    renderCategories();
  } catch (error) {
    console.error("API Error:", error);
    showError();
  }
}

async function renderCategories() {
  try {
    const data = await getJSON(`${API}/list.php?c=list`);
    const categories = data.meals?.map(item => item.strCategory) || [];

    categoriesEl.innerHTML = `
      <button
        class="category-btn shrink-0 rounded-full bg-forest px-5 py-2.5 text-sm font-bold text-cream"
        data-category="All"
      >
        All
      </button>
      ${categories.slice(0, 10).map(category => `
        <button
          class="category-btn shrink-0 rounded-full border border-forest/15 bg-cream px-5 py-2.5 text-sm font-bold text-forest hover:border-sage hover:text-sage"
          data-category="${escapeHTML(category)}"
        >
          ${escapeHTML(category)}
        </button>
      `).join("")}
    `;

    document.querySelectorAll(".category-btn").forEach(button => {
      button.addEventListener("click", async () => {
        activeCategory = button.dataset.category;

        document.querySelectorAll(".category-btn").forEach(item => {
          item.classList.remove("bg-forest", "text-cream");
          item.classList.add("bg-cream", "text-forest");
        });

        button.classList.remove("bg-cream", "text-forest");
        button.classList.add("bg-forest", "text-cream");

        if (activeCategory === "All") {
          renderMeals(allMeals);
          return;
        }

        await loadCategory(activeCategory);
      });
    });
  } catch (error) {
    console.error("Category Error:", error);
    categoriesEl.innerHTML = "";
  }
}

async function loadCategory(category) {
  showLoading();

  try {
    const data = await getJSON(
      `${API}/filter.php?c=${encodeURIComponent(category)}`
    );

    const meals = data.meals || [];
    renderMeals(meals);
  } catch (error) {
    console.error("Category API Error:", error);
    showError();
  }
}

let searchTimer;

searchInput.addEventListener("input", () => {
  clearTimeout(searchTimer);

  searchTimer = setTimeout(async () => {
    const query = searchInput.value.trim();

    if (!query) {
      if (activeCategory === "All") {
        renderMeals(allMeals);
      } else {
        await loadCategory(activeCategory);
      }
      return;
    }

    showLoading();

    try {
      const data = await getJSON(
        `${API}/search.php?s=${encodeURIComponent(query)}`
      );

      renderMeals(data.meals || []);
    } catch (error) {
      console.error("Search Error:", error);
      showError();
    }
  }, 350);
});

function renderMeals(meals) {
  statusEl.classList.add("hidden");
  mealGrid.innerHTML = "";

  emptyState.classList.toggle("hidden", meals.length !== 0);

  if (!meals.length) return;

  mealGrid.innerHTML = meals.map(meal => `
    <article
      class="group overflow-hidden rounded-3xl border border-forest/10 bg-cream shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl"
    >
      <div class="relative overflow-hidden">
        <img
          src="${meal.strMealThumb || ""}"
          alt="${escapeHTML(meal.strMeal || "Meal")}"
          class="h-56 w-full object-cover transition duration-500 group-hover:scale-105"
          loading="lazy"
        />

        <span
          class="absolute left-4 top-4 rounded-full bg-cream/95 px-3 py-1.5 text-xs font-black text-forest shadow"
        >
          ${escapeHTML(meal.strCategory || "Meal")}
        </span>
      </div>

      <div class="p-5">
        <h3 class="line-clamp-1 text-lg font-black">
          ${escapeHTML(meal.strMeal || "Unnamed Meal")}
        </h3>

        <p class="mt-2 line-clamp-2 text-sm leading-6 text-forest/60">
          ${escapeHTML(
            meal.strArea
              ? `A delicious ${meal.strArea} style meal ready to explore.`
              : "Explore this delicious meal and discover something new."
          )}
        </p>

        <div class="mt-5 flex items-center justify-between">
          <span class="text-sm font-bold text-sage">
            ${escapeHTML(meal.strArea || "Worldwide")}
          </span>

          <button
            onclick="showMealDetails('${meal.idMeal}')"
            class="rounded-full bg-forest px-4 py-2 text-xs font-bold text-cream hover:bg-sage"
          >
            View Recipe
          </button>
        </div>
      </div>
    </article>
  `).join("");
}

async function showMealDetails(id) {
  try {
    const data = await getJSON(`${API}/lookup.php?i=${id}`);
    const meal = data.meals?.[0];

    if (!meal) return;

    const ingredients = [];

    for (let i = 1; i <= 20; i++) {
      const ingredient = meal[`strIngredient${i}`];
      const measure = meal[`strMeasure${i}`];

      if (ingredient?.trim()) {
        ingredients.push(`${measure || ""} ${ingredient}`.trim());
      }
    }

    const modal = document.createElement("div");

    modal.className =
      "fixed inset-0 z-[100] grid place-items-center bg-forest/70 p-5 backdrop-blur-sm";

    modal.innerHTML = `
      <div
        class="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-cream shadow-2xl"
      >
        <div class="relative">
          <img
            src="${meal.strMealThumb}"
            alt="${escapeHTML(meal.strMeal)}"
            class="h-64 w-full object-cover"
          />

          <button
            id="closeModal"
            class="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-cream text-xl font-black text-forest shadow"
          >
            ×
          </button>
        </div>

        <div class="p-6 md:p-8">
          <p class="text-sm font-bold uppercase tracking-widest text-sage">
            ${escapeHTML(meal.strCategory || "Meal")}
            •
            ${escapeHTML(meal.strArea || "Worldwide")}
          </p>

          <h2 class="mt-2 text-3xl font-black">
            ${escapeHTML(meal.strMeal)}
          </h2>

          <h3 class="mt-7 text-lg font-black">
            Ingredients
          </h3>

          <ul class="mt-3 grid gap-2 sm:grid-cols-2">
            ${ingredients.map(item => `
              <li
                class="rounded-xl bg-white px-4 py-3 text-sm font-semibold"
              >
                ${escapeHTML(item)}
              </li>
            `).join("")}
          </ul>

          <h3 class="mt-7 text-lg font-black">
            Instructions
          </h3>

          <p class="mt-3 whitespace-pre-line text-sm leading-7 text-forest/70">
            ${escapeHTML(
              meal.strInstructions || "Recipe instructions unavailable."
            )}
          </p>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector("#closeModal").onclick = () => modal.remove();

    modal.addEventListener("click", event => {
      if (event.target === modal) modal.remove();
    });
  } catch (error) {
    console.error("Recipe Error:", error);
    alert("Unable to load recipe details.");
  }
}

document.getElementById("randomBtn").addEventListener("click", async () => {
  try {
    const data = await getJSON(`${API}/random.php`);
    const meal = data.meals?.[0];

    if (meal) showMealDetails(meal.idMeal);
  } catch (error) {
    console.error("Random Meal Error:", error);
    alert("Unable to load a random meal.");
  }
});

function scrollToMenu() {
  document.getElementById("menu").scrollIntoView({
    behavior: "smooth"
  });
}

document.getElementById("scrollMenuBtn").addEventListener(
  "click",
  scrollToMenu
);

document.getElementById("heroMenuBtn").addEventListener(
  "click",
  scrollToMenu
);

function showLoading() {
  statusEl.classList.remove("hidden");

  statusEl.innerHTML = `
    <div
      class="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-forest/15 border-t-sage"
    ></div>

    <p class="mt-3 font-semibold text-forest/60">
      Loading delicious meals...
    </p>
  `;

  mealGrid.innerHTML = "";
  emptyState.classList.add("hidden");
}

function showError() {
  statusEl.classList.remove("hidden");

  statusEl.innerHTML = `
    <div class="text-4xl">😕</div>

    <p class="mt-3 font-bold">
      Something went wrong.
    </p>

    <p class="mt-1 text-sm text-forest/60">
      Please check your internet connection and try again.
    </p>
  `;

  mealGrid.innerHTML = "";
  emptyState.classList.add("hidden");
}

function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

loadMeals();