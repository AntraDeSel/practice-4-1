import './styles.css';
import { Book } from './task1-types';
import { applyFilters, filterByAuthor, filterByMinYear } from './task3-filters';
import { createBookFromForm } from "./task4-integration";
import { filterByTitle, sortBooks } from './task5-utils';
import { BookCatalog } from './task6-classes';
import { Wishlist } from './task7-wishlist';
import { fetchBooks, saveBooks } from './mock-api';

type AsyncState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; message: string };

let state: AsyncState<Book[]> = { status: 'loading' };
let errorMessage: string = '';

// ============================================================
// ИСХОДНОЕ СОСТОЯНИЕ
// ============================================================
let catalog = new BookCatalog('main', []);
let wishlist = new Wishlist();

// Загрузка из localStorage (в практике 4-1 переедет в mock-api.ts)
const savedWishlist = localStorage.getItem('wishlist');
if (savedWishlist) {
  wishlist = new Wishlist(JSON.parse(savedWishlist));
}

// ============================================================
// СОХРАНЕНИЕ (в практике 4-1 переедет в mock-api.ts)
// ============================================================
function saveWishlist() {
  localStorage.setItem('wishlist', JSON.stringify(wishlist.getFavoriteIds()));
}

// ============================================================
// DOM-элементы
// ============================================================
const bookList = document.querySelector('#bookList') as HTMLDivElement;
const wishlistContainer = document.querySelector('#wishlistContainer') as HTMLDivElement;
const form = document.querySelector('#bookForm') as HTMLFormElement;
const filterBtn = document.querySelector('#applyFilters') as HTMLButtonElement;
const authorInput = document.querySelector('#filterAuthor') as HTMLInputElement;
const yearInput = document.querySelector('#filterYear') as HTMLInputElement;
const errorMessageEl = document.querySelector('#errorMessage') as HTMLDivElement;
const searchInput = document.querySelector('#searchInput') as HTMLInputElement;
const sortBySelect = document.querySelector('#sortBy') as HTMLSelectElement;

// ============================================================
// СОЗДАНИЕ КАРТОЧКИ
// ============================================================
function createBookCard(book: Book): HTMLDivElement {
  const card = document.createElement('div');
  card.className = 'book-card fade-in';

  const titleEl = document.createElement('h3');
  titleEl.textContent = `${book.title} — ${book.authors.join(', ')}${book.year ? `, ${book.year}` : ''}`;
  card.append(titleEl);

  if (book.rating !== undefined) {
    const ratingEl = document.createElement('p');
    ratingEl.textContent = `Рейтинг: ${book.rating}`;
    card.append(ratingEl);
  }

  // Кнопка «Удалить»
  const deleteBtn = document.createElement('button');
  deleteBtn.textContent = 'Удалить';
  deleteBtn.addEventListener('click', async () => {
    if (state.status !== 'success') return;
    
    const newBooks = state.data.filter(b => b.id !== book.id);
    
    try {
      await saveBooks(newBooks);
      state = { status: 'success', data: newBooks };
      render();
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : 'Ошибка удаления';
      render();
      setTimeout(() => { errorMessage = ''; render(); }, 3000);
    }
  });
  card.append(deleteBtn);

  // Кнопка «Избранное»
  const favBtn = document.createElement('button');
  favBtn.textContent = wishlist.has(book.id) ? '❤️ В избранном' : '🤍 В избранное';
  favBtn.addEventListener('click', () => {
    wishlist.toggle(book.id);
    saveWishlist();
    render();
  });
  card.append(favBtn);

  return card;
}

// ============================================================
// ОТРИСОВКА
// ============================================================
function renderBooks(books: Book[]) {
  bookList.innerHTML = '';

  if (books.length === 0) {
    bookList.textContent = 'Книги не найдены. Попробуйте изменить фильтры.';
    return;
  }

  books.forEach(book => {
    bookList.append(createBookCard(book));
  });
}

function renderWishlist() {
  wishlistContainer.innerHTML = '';
  const favBooks = wishlist.getFavorites(catalog);

  if (favBooks.length === 0) {
    wishlistContainer.textContent = 'Пока ничего не добавлено';
    return;
  }

  favBooks.forEach(book => {
    wishlistContainer.append(createBookCard(book));
  });
}

// Единая функция обновления вида
function render() {
  errorMessageEl.textContent = errorMessage;

  switch (state.status) {
    case 'idle':
      bookList.textContent = 'Приложение готово к работе.';
      break;
      
    case 'loading':
      bookList.innerHTML = '<div style="padding: 20px; font-size: 18px; color: #2563eb;">⏳ Загрузка данных...</div>';
      break;
      
    case 'success':
      catalog = new BookCatalog('main', state.data);
      
      const filters: ((book: Book) => boolean)[] = [];
      if (authorInput.value.trim()) filters.push(filterByAuthor(authorInput.value.trim()));
      if (yearInput.value) filters.push(filterByMinYear(parseInt(yearInput.value, 10)));
      if (searchInput.value.trim()) filters.push(filterByTitle(searchInput.value.trim()));

      const filtered = applyFilters(state.data, filters);
      const sorted = sortBooks(filtered, sortBySelect.value as 'year' | 'rating');

      renderBooks(sorted);
      break;
      
    case 'error':
      bookList.innerHTML = `
        <div style="color: #991b1b; background: #fee2e2; padding: 20px; border-radius: 8px;">
          <p style="margin-bottom: 10px; font-weight: bold;">Ошибка: ${state.message}</p>
          <button id="retryBtn" style="background: #dc2626; color: white; padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer;">
            Повторить попытку
          </button>
        </div>
      `;
      document.getElementById('retryBtn')?.addEventListener('click', initApp);
      break;
  }
  
  renderWishlist();
}

// ============================================================
// ОБРАБОТЧИК ФОРМЫ
// ============================================================
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorMessage = '';
  render();

  if (state.status !== 'success') return;

  try {
    const formData = new FormData(form);
    const newBook = createBookFromForm(formData);
    
    const newBooksArray = [...state.data, newBook];
    await saveBooks(newBooksArray);
    
    state = { status: 'success', data: newBooksArray };
    form.reset();
    render();
    
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
    render();
    
    setTimeout(() => {
      errorMessage = '';
      render();
    }, 3000);
  }
});

// ============================================================
// ФИЛЬТРЫ И СОРТИРОВКА
// ============================================================
filterBtn.addEventListener('click', render);
searchInput.addEventListener('input', render);
sortBySelect.addEventListener('change', render);

// ============================================================
// ИНИЦИАЛИЗАЦИЯ
// ============================================================
async function initApp() {
  state = { status: 'loading' };
  render();

  try {
    const books = await fetchBooks();
    state = { status: 'success', data: books };
  } catch (error) {
    state = { 
      status: 'error', 
      message: error instanceof Error ? error.message : 'Неизвестная ошибка' 
    };
  }
  
  render();
}

initApp();