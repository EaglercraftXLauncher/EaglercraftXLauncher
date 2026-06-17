// src/pages/ClientDetailPage.tsx
import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Play, Download, RefreshCw, Image, FileText, GitBranch, Plus } from 'lucide-react';
import VersionUploadModal from '../components/VersionUploadModal';

interface Version {
  id: string;
  name: string;
  date: string;
  size: string;
  url: string;
}

function ClientDetailPage() {
  const { contentId } = useParams<{ contentId: string }>();
  const [activeVersion, setActiveVersion] = useState('1.8.8');
  const [syncUrl, setSyncUrl] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isVersionModalOpen, setIsVersionModalOpen] = useState(false);
  const [versions, setVersions] = useState<Version[]>([
    { id: 'v1.0', name: '1.8.8 Stable', date: '2026-06-01', size: '8.2 MB', url: '#' },
    { id: 'v1.1', name: '1.8.8 Beta', date: '2026-06-10', size: '8.5 MB', url: '#' },
  ]);

  const client = {
    name: 'Example Client',
    description: 'High-performance Eaglercraft client with advanced features.',
    screenshots: [
      'https://picsum.photos/id/1015/800/450',
      'https://picsum.photos/id/106/800/450',
      'https://picsum.photos/id/1074/800/450',
    ],
    docs: [
      { name: 'Installation Guide.md', url: '#' },
      { name: 'Changelog.txt', url: '#' },
    ],
    githubRelease: 'https://github.com/EaglercraftXLauncher/example-client/releases',
  };

  const handleVersionUploaded = (newVersion: Version) => {
    setVersions([newVersion, ...versions]);
    setActiveVersion(newVersion.name);
  };

  const handleSync = async () => {
    if (!syncUrl) return;
    setIsSyncing(true);
    setTimeout(() => {
      alert(`Auto-synced game files from: ${syncUrl}`);
      setIsSyncing(false);
      setSyncUrl('');
    }, 1500);
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <Link to="/" className="inline-flex items-center text-green-400 hover:text-green-500 mb-6">
        ← Back to Browser
      </Link>
      <VersionUploadModal
        isOpen={isVersionModalOpen}
        onClose={() => setIsVersionModalOpen(false)}
        contentId={contentId!}
        onVersionUploaded={handleVersionUploaded}
      />
    </div>
  );
}

export default ClientDetailPage;