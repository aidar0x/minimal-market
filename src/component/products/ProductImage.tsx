import type { Product } from '../../data/products';

function ProductImage({ product }: { product: Product }) {
  if (product.image_url) {
    return <img src={product.image_url} alt={product.name} loading="lazy" />;
  }

  return <span>{product.emoji}</span>;
}

export default ProductImage;