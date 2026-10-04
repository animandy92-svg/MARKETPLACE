import categoryData from './categories.json';
export const categories = categoryData;
export const categoryLabel = (id: string) => categories.find((category) => category.id === id)?.name || id;
