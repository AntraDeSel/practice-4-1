// src/mock-api.ts
import { Book } from './task1-types';

/**
 * Имитация задержки сети.
 */
export function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Асинхронная загрузка книг. В 20% случаев выбрасывает ошибку.
 */
export async function fetchBooks(): Promise<Book[]> {
  await delay(800); // Ждем 800 мс

  // 20% шанс ошибки
    if (Math.random() < 0.2) {
    throw new Error('Сбой сети. Не удалось загрузить книги.');
    }

  // Чтение из localStorage
    const data = localStorage.getItem('catalog');
    if (!data) return [];

    try {
    const parsed = JSON.parse(data);
    // Поддерживаем как старый формат { id, books }, так и просто массив
    return Array.isArray(parsed) ? parsed : (parsed.books || []);
    } catch (e) {
    return [];
    }
}

/**
 * Асинхронное сохранение книг.
 */
export async function saveBooks(books: Book[]): Promise<void> {
  await delay(500); // Ждем 500 мс
    localStorage.setItem('catalog', JSON.stringify({ id: 'main', books }));
}