import type { Product } from '../../data/products';

function ProductImage({ product }: { product: Product }) {
  const url = product.images[0]?.url;

  if (url) {
    return <img src={url} alt={product.name} loading="lazy" />;
  }

  return <span aria-hidden="true">🛍️</span>;
}

export default ProductImage;