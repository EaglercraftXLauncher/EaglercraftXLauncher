import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import ContentCard, { ContentItem } from '../components/ContentCard';
import { useToast } from '../hooks/useToast';
import { API_ENDPOINTS } from '../lib/constants';

interface BrowserPageProps {
  contentType: 'clients' | 'mods' | 'skins';
}

const BrowserPage: React.FC<BrowserPageProps> = ({ contentType }) => {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<ContentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const { addToast } = useToast();

  const itemsPerPage = 12;
  const categories = ['all', 'popular', 'trending', 'newest'];

  useEffect(() => {
    fetchItems();
  }, [contentType]);

  useEffect(() => {
    filterItems();
  }, [items, selectedCategory]);

  const fetchItems = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}${API_ENDPOINTS[contentType]}`
      );
      if (response.ok) {
        const data = await response.json();
        setItems(data);
      } else {
        addToast('Failed to load content', 'error');
      }
    } catch (error) {
      console.error('Fetch error:', error);
      addToast('Error loading content', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const filterItems = () => {
    let filtered = items;

    if (selectedCategory !== 'all') {
      filtered = items.filter((item) => item.type === contentType);
    }

    setFilteredItems(filtered);
    setCurrentPage(1);
  };

  const handleSearch = (query: string) => {
    const searchResults = items.filter(
      (item) =>
        item.title.toLowerCase().includes(query.toLowerCase()) ||
        item.description.toLowerCase().includes(query.toLowerCase())
    );
    setFilteredItems(searchResults);
    setCurrentPage(1);
  };

  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);

  const title = contentType.charAt(0).toUpperCase() + contentType.slice(1);

  return (
    <div className="browser-layout">
      <Sidebar />
      <main className="browser-main">
        <Topbar title={title} onSearch={handleSearch} />

        <div className="browser-container">
          <div className="category-tabs">
            {categories.map((cat) => (
              <button
                key={cat}
                className={`tab ${selectedCategory === cat ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
          </div>

          {isLoading ? (
            <div className="loading">Loading...</div>
          ) : paginatedItems.length === 0 ? (
            <div className="empty-state">No {contentType} found</div>
          ) : (
            <>
              <div className="content-grid">
                {paginatedItems.map((item) => (
                  <ContentCard key={item.id} item={item} />
                ))}
              </div>

              {totalPages > 1 && (
                <div className="pagination">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="pagination-btn"
                  >
                    ← Previous
                  </button>
                  <span className="page-info">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="pagination-btn"
                  >
                    Next →
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default BrowserPage;