import React from 'react';

export interface ContentItem {
  id: string;
  title: string;
  description: string;
  image: string;
  author: string;
  downloads?: number;
  rating?: number;
  type: 'client' | 'mod' | 'skin';
}

interface ContentCardProps {
  item: ContentItem;
  onClick?: () => void;
}

const ContentCard: React.FC<ContentCardProps> = ({ item, onClick }) => {
  return (
    <div className="content-card" onClick={onClick}>
      <div className="card-image">
        <img src={item.image} alt={item.title} />
      </div>
      <div className="card-content">
        <h3 className="card-title">{item.title}</h3>
        <p className="card-description">{item.description}</p>
        <div className="card-meta">
          <span className="card-author">By {item.author}</span>
          {item.downloads && (
            <span className="card-downloads">📥 {item.downloads.toLocaleString()}</span>
          )}
          {item.rating && (
            <span className="card-rating">⭐ {item.rating.toFixed(1)}</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContentCard;