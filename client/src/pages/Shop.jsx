import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { ShoppingCart, Filter, Search, Tag, ArrowRight } from 'lucide-react';
import './Shop.css';

const categories = ['All', 'Supplements', 'Gym Wear', 'Accessories', 'Equipments'];

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
      <header className="shop-header">
        <h1 className="page-title"><ShoppingCart className="inline-icon text-accent" /> Gym Store</h1>
        <p className="text-secondary">Premium gear and supplements to fuel your performance.</p>
      </header>

      <div className="shop-filters mb-6">
        <div className="glass-card mb-4" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px' }}>
          <Search size={18} className="text-secondary" />
          <input 
            type="text" 
            placeholder="Search products..." 
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
          <p className="text-secondary">Loading inventory...</p>
        </div>
      ) : (
        <div className="products-grid">
          {filteredProducts.length > 0 ? (
            filteredProducts.map(product => (
              <div key={product.id} className="glass-card product-card">
                <div className="product-image-wrapper">
                  <img src={product.image} alt={product.name} className="product-image" />
                  <div className="product-category-tag">{product.category}</div>
                </div>
                <div className="product-info">
                  <h3 className="product-name">{product.name}</h3>
                  <p className="product-description">{product.description}</p>
                  <div className="product-footer">
                    <span className="product-price">${product.price.toFixed(2)}</span>
                    <button className="btn btn-primary btn-buy" onClick={() => handleBuy(product)}>
                      Buy Now
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="glass-card text-center py-10" style={{ gridColumn: '1 / -1' }}>
              <Filter size={48} className="text-secondary mb-3 mx-auto" />
              <h3>No products found</h3>
              <p className="text-secondary">Try adjusting your filters or search term.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Shop;
