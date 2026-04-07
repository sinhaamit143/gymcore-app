import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { ShoppingCart, Filter, Search, Tag, ChevronLeft, ChevronRight, Package } from 'lucide-react';
import './Shop.css';

const categories = ['All', 'Supplements', 'Gym Wear', 'Accessories', 'Equipments'];

const ImageCarousel = ({ images, name, category }) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const displayImages = images && images.length > 0 ? images : ['https://via.placeholder.com/400x400?text=No+Image'];

  const next = (e) => {
    e.stopPropagation();
    setCurrentIdx((prev) => (prev + 1) % displayImages.length);
  };

  const prev = (e) => {
    e.stopPropagation();
    setCurrentIdx((prev) => (prev - 1 + displayImages.length) % displayImages.length);
  };

  return (
    <div className="product-image-wrapper">
      <img src={displayImages[currentIdx]} alt={name} className="product-image" />
      <div className="product-category-tag">{category}</div>
      
      {displayImages.length > 1 && (
        <>
          <button className="carousel-btn prev" onClick={prev}><ChevronLeft size={16} /></button>
          <button className="carousel-btn next" onClick={next}><ChevronRight size={16} /></button>
          <div className="carousel-dots">
            {displayImages.map((_, i) => (
              <div key={i} className={`dot ${i === currentIdx ? 'active' : ''}`} />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

const Shop = () => {
  const { token } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/products', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setProducts(await res.json());
      }
    } catch (err) {
      console.error('Fetch products error:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(p => {
    const matchesCategory = activeCategory === 'All' || p.category === activeCategory;
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         p.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleBuy = (product) => {
    alert(`Order placed for ${product.name}! This is a mock purchase for the GymCore prototype.`);
  };

  return (
    <div className="page shop-page animate-fade-in">
      <header className="shop-header mb-6">
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ background: 'var(--accent-color)', padding: '12px', borderRadius: '15px', color: '#000' }}>
            <ShoppingCart size={28} />
          </div>
          <div>
            <h1 className="page-title mb-1" style={{ margin: 0 }}>GYMCORE <span className="text-accent">STORE</span></h1>
            <p className="text-secondary" style={{ margin: 0, fontSize: '0.9rem' }}>Elite equipment for serious athletes.</p>
          </div>
        </div>
      </header>

      <div className="shop-filters mb-8">
        <div className="glass-card mb-4" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '15px', border: '1px solid rgba(255,255,255,0.05)' }}>
          <Search size={18} className="text-secondary" />
          <input 
            type="text" 
            placeholder="Search our catalog..." 
            style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '16px', outline: 'none', width: '100%' }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="category-nav">
          {categories.map(cat => (
            <button 
              key={cat} 
              className={`category-btn ${activeCategory === cat ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-10">
          <div className="spinner mb-3" style={{ margin: '0 auto', width: '32px', height: '32px', border: '3px solid rgba(0,255,170,0.3)', borderTop: '3px solid #00ffaa', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
          <p className="text-secondary">Syncing with warehouse...</p>
        </div>
      ) : (
        <div className="products-grid">
          {filteredProducts.length > 0 ? (
            filteredProducts.map(product => (
              <div key={product._id} className="glass-card product-card">
                <ImageCarousel images={product.images || [product.image]} name={product.name} category={product.category} />
                <div className="product-info">
                  <h3 className="product-name">{product.name}</h3>
                  <p className="product-description">{product.description}</p>
                  <div className="product-footer">
                    <span className="product-price">${product.price.toFixed(2)}</span>
                    <button className="btn btn-primary btn-buy" onClick={() => handleBuy(product)}>
                      Add to Cart
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="glass-card text-center py-12" style={{ gridColumn: '1 / -1', background: 'rgba(0,0,0,0.2)' }}>
              <Package size={48} className="text-secondary mb-3 mx-auto" />
              <h3 style={{ color: 'var(--text-secondary)' }}>No items match your search</h3>
              <p className="text-secondary" style={{ fontSize: '14px' }}>Try a different category or broader keywords.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Shop;
