const categories = [
  {
    title: 'PROPERTY_CATEGORIES.HOUSE',
    description: 'Houses and residential properties for sale, rent, or booking.',
    media: 'https://images.unsplash.com/photo-1484154218962-4197022b5858?auto=format&fit=crop&w=800&q=80'
  },
  {
    title: 'PROPERTY_CATEGORIES.PLOTS',
    description: 'Residential and commercial plots across Pakistan.',
    media: 'https://images.unsplash.com/photo-1500382017468-90403fe7el7?auto=format&fit=crop&w=800&q=80'
  },
  {
    title: 'PROPERTY_CATEGORIES.HOSTELS',
    description: 'Hostels and shared stays with flexible booking.',
    media: 'https://images.unsplash.com/photo-1505691938895-1758d76fb511?auto=format&fit=crop&w=800&q=80'
  }
];

export default function HomePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [featuredProperties, setFeaturedProperties] = useState([]);
  const [allListings, setAllListings] = useState([]);
  const [favorites, setFavorites] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [priceRange, setPriceRange] = useState([50000, 80000000]);
  const [typeFilter, setTypeFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [pendingPriceRange, setPendingPriceRange] = useState([50000, 80000000]);
  const [pendingType, setPendingType] = useState('All');
  const [pendingSearch, setPendingSearch] = useState('');
  const [detailProperty, setDetailProperty] = useState(null);
  const [tourProperty, setTourProperty] = useState(null);

  const loadFavorites = useCallback(async () => {
    if (!user || (user.role !== 'user' && user.role !== 'admin')) return;
    try {
      const ids = await api.getFavoriteIds();
      setFavorites(new Set(ids));
    } catch (err) {
      // catch
    }
  }, [user]);

  const loadListings = useCallback(async () => {
    setLoading(true);
    try {
      const [featured, listings] = await Promise.all([
        api.getFeatured(),
        api.getProperties({
          minPrice: priceRange[0],
          maxPrice: priceRange[1],
          type: typeFilter,
          sort: sortBy
        })
      ]);
      setFeaturedProperties(featured.properties);
      setAllListings(listings.properties);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [priceRange, typeFilter, sortBy, showToast]);

  useEffect(() => {
    loadListings();
  }, [loadListings]);

  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  useEffect(() => {
    if (window.location.hash) {
      const id = window.location.hash.replace('#', '');
      setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 300);
    }
  }, []);

  useEffect(() => {
    const openId = location.state?.openPropertyId;
    if (!openId || loading) return;
    const property =
      allListings.find((p) => p.id === openId) || featuredProperties.find((p) => p.id === openId);
    if (property) {
      setDetailProperty(property);
      navigate('/', { replace: true, state: {} });
    }
  }, [location.state, allListings, featuredProperties, loading, navigate]);

  const filteredListings = useMemo(() => {
    if (!searchQuery.trim()) return allListings;
    const q = searchQuery.toLowerCase();
    return allListings.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.location.toLowerCase().includes(q) ||
        p.type.toLowerCase().includes(q)
    );
  }, [allListings, searchQuery]);

  const handleSave = async (listing) => {
    if (!user) {
      showToast('Please sign in to save properties', 'info');
      navigate('/login?portal=user');
      return;
    }

    if (user.role !== 'seller') {
      const saved = favorites.has(listing.id);
      try {
        if (saved) {
          await api.removeFavorite(listing.id);
          setFavorites((prev) => {
            const next = new Set(prev);
            next.delete(listing.id);
            return next;
          });
          showToast('Removed from favorites', 'success');
        } else {
          await api.addFavorite(listing.id);
          setFavorites((prev) => new Set(prev).add(listing.id));
          showToast('Saved to favorites', 'success');
        }
      } catch (err) {
        showToast(err.message, 'error');
      }
    } else {
      showToast('Switch to a customer account to save favorites', 'info');
      navigate('/login?portal=user');
      return;
    }
  };

  const handleBooking = (listing) => {
    if (!user) {
      showToast('Please sign in to continue', 'info');
      navigate('/login?portal=user');
      return;
    }
    if (user.role === 'seller') {
      showToast('Sign in with a customer account to submit requests', 'info');
      navigate('/login?portal=user');
      return;
    }
    setTourProperty(listing);
  };

  const submitBooking = async (payload) => {
    const { message } = await api.bookTour(payload);
    showToast(message, 'success');
  };

  const applyFilters = () => {
    setPriceRange(pendingPriceRange);
    setTypeFilter(pendingType);
    setSearchQuery(pendingSearch);
    showToast('Search updated', 'success');
    scrollToListings();
  };

  const scrollToListings = () => {
    document.getElementById('listings')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const applyType = (type) => {
    setPendingType(type);
    setSearchQuery(pendingSearch);
    scrollToListings();
  };

  const goLogin = (portal = 'user') => navigate(`/login?portal=${portal}`);

  return (
    <div className="app-shell">
      <SiteHeader />

      <section id="home" className="hero-section">
        <div className="hero-copy">
          <p className="ai-chip">Real Estate & Hostel Rental Platform</p>
          <h1>Find properties for sale, rent, and hostel stays.</h1>
          <p>
            Search verified listings across Pakistan. Save favorites, view details, and submit
            booking or inquiry requests in a few steps.
          </p>
          <div className="hero-actions">
            <button
              type="button"
              className="primary-btn"
              onClick={scrollToListings}
            >
              Browse properties
            </button>
            <button
              type="button"
              className="ghost-btn"
              onClick={() => (user ? navigate(getDashboardPath(user.role)) : goLogin('user'))}
            >
              {user ? getDashboardLabel(user.role) : 'Login'}
            </button>
          </div>
        </div>
        <div className="hero-stats">
          <div>
            <strong>{loading ? 'â€\x9d' : allListings.length}</strong>
            <span>Active listings</span>
          </div>
          <div>
            <strong>3+</strong>
            <span>Property types</span>
          </div>
          <div>
            <strong>100%</strong>
            <span>Local pricing</span>
          </div>
        </div>
      </section>

      <FilterPanel
        search={pendingSearch}
        onSearchChange={setPendingSearch}
        priceRange={pendingPriceRange}
        onPriceChange={(value, index) => {
          const next = [...pendingPriceRange];
          next[index] = Number(value);
          if (next[0] > next[1]) next.sort((a, b) => a - b);
          setPendingPriceRange(next);
        }}
        typeFilter={pendingType}
        onTypeSelect={setPendingType}
        onApply={applyFilters}
      />

      <section className="categories-section">
        <div className="section-heading">
          <p className="eyebrow">Browse by type</p>
          <h2>Hostel â€¢ Rent â€¢ Property For Sale</h2>
        </div>
        <div className="categories-grid">
          {categories.map((category) => (
            <article
              key={category.title}
              className="category-card clickable"
              onClick={() => applyType(category.title)}
              onKeyDown={(e) => e.key === 'Enter' && applyType(category.title)}
              role="button"
              tabIndex={0}
            >
              <img src={category.media} alt={category.title} loading="lazy" />
              <div>
                <h3>{category.title}</h3>
                <p>{category.description}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="featured-section">
        <div className="section-heading">
          <p className="eyebrow">Featured</p>
          <h2>Highlighted properties</h2>
        </div>
        {featuredProperties.length === 0 && loading ? (
          <EmptyState title="No featured listings" message="Check back soon for new highlights." />
        ) : (
          <div className="featured-grid">
            {featuredProperties.map((property) => (
              <article
                key={property.id}
                className="featured-card clickable"
                onClick={() => setDetailProperty(property)}
                onKeyDown={(e) => e.key === 'Enter' && setDetailProperty(property)}
                role="button"
                tabIndex={0}
              >
                <img src={property.image_media} alt={property.title} loading="lazy" />
                <div className="featured-card-body">
                  <span className="pill">{property.type}</span>
                  <h3>{property.title}</h3>
                  <p className="location">{property.location}</p>
                  <div className="price-row">
                    <strong>{formatCurrency(property.price)}</strong>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section id="about" className="about-section">
        <div className="section-heading">
          <p className="eyebrow">About us</p>
          <h2>One platform for sale, rent, and hostel stays</h2>
        </div>
        <div className="about-grid">
          <div className="how-card">
            <h3>For customers</h3>
            <ul>
              <li>Search and filter by price and property type</li>
              <li>Save favorites and submit booking requests</li>
              <li>Track bookings from your dashboard</li>
            </ul>
          </div>
          <div className="how-card">
            <h3>For property owners</h3>
            <ul>
              <li>Add sale, rent, or hostel listings with photos</li>
              <li>Receive and respond to booking requests</li>
              <li>Listings go live after admin approval</li>
            </ul>
          </div>
        </div>
      </section>

      <section id="listings" className="listings-section">
        <div className="section-heading">
          <p className="eyebrow">Browse properties</p>
          <h2>
            Search, filter, and view details
            {searchQuery && ` for "${searchQuery}"`}
          </h2>
        </div>
        <div className="filter-meta">
          <p>
            {loading ? 'Loading...' : `${filteredListings.length} results`}Â·{'Â'}
            {formatCurrency(priceRange[0])} â€“ {formatCurrency(priceRange[1])} Â· {typeFilter}
          </p>
          <label>
            Sort by
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="newest">Newest</option>
              <option value="price_asc">Price (low to high)</option>
              <option value="price_desc">Price (high to low)</option>
            </select>
          </label>
        </div>

        {loading ? (
          <LoadingBlock label="Loading properties..." />
        ) : filteredListings.length === 0 ? (
          <EmptyState
            title="No properties found"
            message="Try widening your price range, changing the type, or clearing your search."
            action={
              <button
                type="button"
                className="primary-btn"
                onClick={() => {
                  setPendingPriceRange([50000, 80000000]);
                  setPendingType('All');
                  setPendingSearch('');
                  setSearchQuery('');
                }}
              >
                Reset search
              </button>
            }
          />
        ) : (
          <div className="listings-grid">
            {filteredListings.map((listing) => (
              <PropertyCard
                key={listing.id}
                listing={listing}
                isSaved={favorites.has(listing.id)}
                onView={setDetailProperty}
                onSave={handleSave}
                onBook={handleBooking}
              />
            ))}
          </div>
        )}
      </section>

      <SiteFooter />

      {detailProperty && (
        <PropertyDetailModal
          property={detailProperty}
          onClose={() => setDetailProperty(null)}
          onSave={handleSave}
          isSaved={favorites.has(detailProperty.id)}
          onBook={handleBooking}
        />
      )}

      {tourProperty && (
        <BookingModal
          property={tourProperty}
          onClose={() => setTourProperty(null)}
          onSubmit={submitBooking}
        />
      )}
    </div>
  );
}

function FilterPanel({ search, onSearchChange, priceRange, onPriceChange, typeFilter, onTypeSelect, onApply }) {
  return (
    <div className="filter-panel">
      <label className="filter-label">Search properties</label>
      <input
        className="search-input"
        type="search"
        placeholder="Title, city, or location..."
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && onApply()}
      />

      <div className="filter-row">
        <label className="filter-label">Price range (PKR)</label>
        <div className="range-inputs">
          <div>
            <span>Min</span>
            <input
              type="number"
              value={priceRange[0]}
              onChange={(e) => onPriceChange(e.target.value, 0)}
            />
          </div>
          <div>
            <span>Max</span>
            <input
              type="number"
              value={priceRange[1]}
              onChange={(e) => onPriceChange(e.target.value, 1)}
            />
          </div>
        </div>
      </div>

      <label className="filter-label">Property type</label>
      <div className="chip-row">
        {TYPE_FILTER_OPTIONS.map((type) => (
          <button
            key={type}
            type="button"
            className={`chip ${typeFilter === type ? 'active' : ''}`}
            onClick={() => onTypeSelect(type)}
          >
            {type}
          </button>
        ))}
      </div>

      <div className="filter-footer">
        <button className="primary-btn full" type="button" onClick={onApply}>
          Search
        </button>
      </div>
    </div>
  );
}