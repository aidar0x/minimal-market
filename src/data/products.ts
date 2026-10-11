
export type Product = {
  id: number;
  name: string;
  category: string;
  price: number;
  emoji: string;
  description: string;
  user_id?: string | null;
  image_url?: string | null;
};

export const products: Product[] = [
  {
    id: 1,
    name: 'Наушники',
    category: 'Электроника',
    price: 4990,
    emoji: '🎧',
    description: 'Удобные наушники для музыки и повседневного использования.',
  },
  {
    id: 2,
    name: 'Городской рюкзак',
    category: 'Аксессуары',
    price: 3290,
    emoji: '🎒',
    description: 'Практичный рюкзак для города, учёбы и путешествий.',
  },
  {
    id: 3,
    name: 'Настольная лампа',
    category: 'Для дома',
    price: 2190,
    emoji: '💡',
    description: 'Минималистичная лампа для рабочего стола.',
  },
  {
    id: 4,
    name: 'Плёночный фотоаппарат',
    category: 'Электроника',
    price: 6790,
    emoji: '📷',
    description: 'Фотоаппарат для любителей аналоговой фотографии.',
  },
];
