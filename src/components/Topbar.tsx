import React, { useState } from 'react';

interface TopbarProps {
  title: string;
  onSearch?: (query: string) => void;
}

const Topbar: React.FC<TopbarProps> = ({ title, onSearch }) => {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch?.(searchQuery);
  };

  return (
    <div className="topbar">
      <h2 className="topbar-title">{title}</h2>
      <form className="search-form" onSubmit={handleSearch}>
        <input
          type="text"
          placeholder="Search..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />
        <button type="submit" className="search-btn">
          🔍
        </button>
      </form>
    </div>
  );
};

export default Topbar;