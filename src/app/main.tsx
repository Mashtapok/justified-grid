import { createRoot } from 'react-dom/client';
import { FeedPage } from '@/pages/feed-page/ui/FeedPage';
import './styles/index.css';

const root = document.getElementById('root');

if (root === null) {
  throw new Error('Root element is missing');
}

createRoot(root).render(<FeedPage />);
