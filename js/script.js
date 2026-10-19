/* CJ Bakes JavaScript
   Handles page interactions, form validation, animation and two API integrations.
   API documentation: TheMealDB (https://www.themealdb.com/api.php).
*/
'use strict';

document.addEventListener('DOMContentLoaded', () => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Scroll reveals. Content stays visible if the browser lacks IntersectionObserver.
  const revealItems = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !reduceMotion) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    revealItems.forEach(item => observer.observe(item));
  } else {
    revealItems.forEach(item => item.classList.add('visible'));
  }

  // Back-to-top control and current year.
  const backTop = document.getElementById('backTop');
  window.addEventListener('scroll', () => backTop.classList.toggle('show', window.scrollY > 500), { passive: true });
  backTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' }));
  document.getElementById('year').textContent = new Date().getFullYear();

  // Shared recipe API helpers. User input is encoded before it is sent to the API.
  const API_BASE = 'https://www.themealdb.com/api/json/v1/1/';
  const dessertButton = document.getElementById('dessertButton');
  const dessertStatus = document.getElementById('dessertStatus');
  const dessertImage = document.getElementById('dessertImage');
  const dessertPlaceholder = document.getElementById('dessertPlaceholder');
  const dessertName = document.getElementById('dessertName');
  const dessertCategory = document.getElementById('dessertCategory');
  const dessertInstructions = document.getElementById('dessertInstructions');
  const dessertSource = document.getElementById('dessertSource');

  async function fetchJson(url) {
    const response = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`API request failed (${response.status})`);
    return response.json();
  }

  function clearRecipe() {
    dessertImage.hidden = true;
    dessertImage.removeAttribute('src');
    dessertPlaceholder.hidden = false;
    dessertName.textContent = '';
    dessertCategory.textContent = '';
    dessertInstructions.textContent = '';
    dessertSource.hidden = true;
    dessertSource.removeAttribute('href');
  }

  function showRecipe(recipe) {
    dessertName.textContent = recipe.strMeal || 'A sweet surprise';
    dessertCategory.textContent = `Category: ${recipe.strCategory || 'Dessert'}${recipe.strArea ? ` · ${recipe.strArea}` : ''}`;
    dessertInstructions.textContent = recipe.strInstructions || 'No instructions are available.';
    if (recipe.strMealThumb) {
      dessertImage.src = recipe.strMealThumb;
      dessertImage.alt = `Photo of ${recipe.strMeal || 'dessert'}`;
      dessertImage.hidden = false;
      dessertPlaceholder.hidden = true;
    }
    if (recipe.strSource && /^https?:\/\//i.test(recipe.strSource)) {
      dessertSource.href = recipe.strSource;
      dessertSource.hidden = false;
    }
  }

  async function getRecipeById(id) {
    const data = await fetchJson(`${API_BASE}lookup.php?i=${encodeURIComponent(id)}`);
    if (!data.meals || !data.meals.length) throw new Error('Recipe details were unavailable.');
    return data.meals[0];
  }

  dessertButton.addEventListener('click', async () => {
    dessertButton.disabled = true;
    dessertButton.innerHTML = '<span class="loader" aria-hidden="true"></span> Finding something lovely…';
    dessertStatus.textContent = 'Looking for a delicious idea…';
    clearRecipe();
    try {
      // Endpoint 1: retrieve dessert options; endpoint 2: retrieve selected recipe details.
      const data = await fetchJson(`${API_BASE}filter.php?c=Dessert`);
      if (!data.meals || !data.meals.length) throw new Error('No desserts were found.');
      const selected = data.meals[Math.floor(Math.random() * data.meals.length)];
      showRecipe(await getRecipeById(selected.idMeal));
      dessertStatus.textContent = 'A little dessert inspiration, just for you!';
    } catch (error) {
      console.error('TheMealDB dessert request:', error);
      dessertStatus.textContent = 'We couldn’t load a dessert just now. Check your connection and try again.';
    } finally {
      dessertButton.disabled = false;
      dessertButton.innerHTML = '<i class="bi bi-shuffle me-2"></i>Surprise me';
    }
  });

  // API feature 2: search TheMealDB by ingredient entered by the user.
  const ingredientForm = document.getElementById('ingredientForm');
  const ingredientInput = document.getElementById('ingredientInput');
  const ingredientButton = document.getElementById('ingredientButton');
  const ingredientResults = document.getElementById('ingredientResults');

  ingredientForm.addEventListener('submit', async event => {
    event.preventDefault();
    const ingredient = ingredientInput.value.trim();
    if (!ingredient) {
      ingredientInput.focus();
      return;
    }
    ingredientResults.replaceChildren();
    ingredientButton.disabled = true;
    ingredientButton.innerHTML = '<span class="loader loader-dark" aria-hidden="true"></span> Searching…';
    const status = document.createElement('p');
    status.className = 'col-12 text-secondary';
    status.setAttribute('role', 'status');
    status.textContent = `Searching recipes containing “${ingredient}”…`;
    ingredientResults.appendChild(status);
    try {
      // Search TheMealDB for recipes matching the entered ingredient.
      const mealDbData = await fetchJson(`${API_BASE}filter.php?i=${encodeURIComponent(ingredient)}`);
      ingredientResults.replaceChildren();
      let displayed = 0;

      if (mealDbData.meals?.length) {
        const heading = document.createElement('h3');
        heading.className = 'col-12 h5 mt-2';
        heading.textContent = 'TheMealDB · ingredient matches';
        ingredientResults.appendChild(heading);
        mealDbData.meals.slice(0, 4).forEach(meal => {
          const col = document.createElement('div');
          col.className = 'col-sm-6 col-lg-3';
          const card = document.createElement('article');
          card.className = 'ingredient-result';
          const button = document.createElement('button');
          button.type = 'button';
          button.className = 'btn p-0 w-100';
          button.textContent = meal.strMeal;
          button.setAttribute('aria-label', `View TheMealDB recipe for ${meal.strMeal}`);
          button.addEventListener('click', async () => {
            dessertStatus.textContent = `Loading ${meal.strMeal}…`;
            clearRecipe();
            try {
              showRecipe(await getRecipeById(meal.idMeal));
              dessertStatus.textContent = `Recipe selected from TheMealDB ingredient search: ${ingredient}.`;
              document.getElementById('dessert-inspiration').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
            } catch (error) {
              console.error('TheMealDB recipe detail request:', error);
              dessertStatus.textContent = 'That recipe could not be loaded. Please try another result.';
            }
          });
          card.appendChild(button); col.appendChild(card); ingredientResults.appendChild(col); displayed++;
        });
      }


      if (!displayed) {
        const empty = document.createElement('p');
        empty.className = 'col-12';
        empty.textContent = `TheMealDB returned no matches for “${ingredient}”. Try another ingredient, such as chocolate or strawberry.`;
        ingredientResults.appendChild(empty);
      }
    } catch (error) {
      console.error('TheMealDB ingredient search:', error);
      ingredientResults.replaceChildren();
      const message = document.createElement('p');
      message.className = 'col-12 text-danger';
      message.setAttribute('role', 'alert');
      message.textContent = 'Recipe search is unavailable right now. Please try again later.';
      ingredientResults.appendChild(message);
    } finally {
      ingredientButton.disabled = false;
      ingredientButton.innerHTML = '<i class="bi bi-search me-2"></i>Search ingredient';
    }
  });

  // Cake enquiry summary. This is a local preview and does not send personal data.
  const cakeForm = document.getElementById('cakeForm');
  const cakeDate = document.getElementById('cakeDate');
  const formResult = document.getElementById('formResult');
  const detailsInput = document.getElementById('cakeDetails');
  const today = new Date();
  cakeDate.min = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  detailsInput.addEventListener('input', () => {
    document.getElementById('charCount').textContent = detailsInput.value.length;
  });

  cakeForm.addEventListener('submit', event => {
    event.preventDefault();
    event.stopPropagation();
    const occasion = cakeForm.querySelector('input[name="occasion"]:checked');
    document.getElementById('occasionError').hidden = Boolean(occasion);
    if (!cakeForm.checkValidity() || !occasion) {
      cakeForm.classList.add('was-validated');
      if (!occasion) document.getElementById('occasionError').hidden = false;
      const firstInvalid = cakeForm.querySelector(':invalid');
      if (firstInvalid) firstInvalid.focus();
      return;
    }

    const customerName = document.getElementById('customerName').value.trim();
    const cakeType = document.getElementById('cakeType').value;
    const servings = document.getElementById('servings').value;
    const flavour = document.getElementById('flavour').value;
    const selectedDate = new Date(`${cakeDate.value}T12:00:00`);
    const formattedDate = selectedDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

    formResult.replaceChildren();
    const heading = document.createElement('h3');
    heading.textContent = 'Your cake enquiry summary ✨';
    const intro = document.createElement('p');
    intro.textContent = `Thanks, ${customerName}! Here’s your sweet plan so far:`;
    const list = document.createElement('ul');
    [['Cake design', cakeType], ['Occasion', occasion.value], ['Servings', servings], ['Preferred date', formattedDate], ['Flavour / ingredient', flavour]].forEach(([label, value]) => {
      const item = document.createElement('li');
      item.textContent = `${label}: ${value}`;
      list.appendChild(item);
    });
    formResult.append(heading, intro, list);
    if (detailsInput.value.trim()) {
      const notes = document.createElement('p');
      notes.textContent = `Your ideas: ${detailsInput.value.trim()}`;
      formResult.appendChild(notes);
    }
    const apiNote = document.createElement('p');
    apiNote.textContent = `You chose ${flavour}. You can use the ingredient search above to find recipe inspiration for that ingredient.`;
    formResult.appendChild(apiNote);
    const note = document.createElement('p');
    note.className = 'small mb-0';
    note.textContent = 'Preview only: your enquiry has not been sent and no cake has been booked.';
    formResult.appendChild(note);
    formResult.hidden = false;
    formResult.focus();
    if (!reduceMotion) launchConfetti();
  });

  // Short, decorative confetti burst after creating the preview.
  function launchConfetti() {
    const colours = ['#8e3458', '#e8a7b7', '#f4c8ad', '#dce5d5', '#e9b84c'];
    for (let i = 0; i < 42; i++) {
      const piece = document.createElement('span');
      piece.className = 'confetti-piece';
      piece.style.left = `${Math.random() * 100}vw`;
      piece.style.backgroundColor = colours[Math.floor(Math.random() * colours.length)];
      piece.style.borderRadius = Math.random() > .5 ? '50%' : '2px';
      piece.style.setProperty('--drift', `${(Math.random() - .5) * 220}px`);
      piece.style.animationDelay = `${Math.random() * .35}s`;
      document.body.appendChild(piece);
      piece.addEventListener('animationend', () => piece.remove(), { once: true });
    }
  }
});
