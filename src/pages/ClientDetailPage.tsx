// src/pages/ClientDetailPage.tsx
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Play, Download, RefreshCw, Image, FileText, GitBranch, Clock, Plus } from 'lucide-react';
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

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Main Content */}
        <div className="flex-1">
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center text-3xl font-bold">E</div>
              <div>
                <h1 className="text-5xl font-bold tracking-tight">{client.name}</h1>
                <p className="text-xl text-gray-400 mt-1">contentId: {contentId}</p>
              </div>
            </div>
            <p className="text-xl text-gray-300 max-w-2xl">{client.description}</p>
          </div>

          {/* Versions Section */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-semibold flex items-center gap-3">
                <GitBranch className="w-6 h-6" /> Versions
              </h3>
              <button
                onClick={() => setIsVersionModalOpen(true)}
                className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 px-5 py-2 rounded-xl text-sm font-medium"
              >
                <Plus className="w-4 h-4" /> New Version
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
              {versions.map((version) => (
                <button
                  key={version.id}
                  onClick={() => setActiveVersion(version.name)}
                  className={`p-5 rounded-xl border text-left transition-all ${
                    activeVersion === version.name 
                      ? 'border-green-500 bg-green-950/50' 
                      : 'border-gray-700 hover:border-gray-600'
                  }`}
                >
                  <div className="font-mono text-lg font-medium">{version.name}</div>
                  <div className="text-sm text-gray-400 mt-1">{version.date} • {version.size}</div>
                </button>
              ))}
            </div>

            <div className="flex gap-4">
              <a
                href="#"
                className="flex-1 bg-green-600 hover:bg-green-500 transition-colors text-white font-semibold py-4 px-8 rounded-xl flex items-center justify-center gap-3 text-lg"
              >
                <Play className="w-6 h-6" /> LAUNCH {activeVersion}
              </a>
              <a
                href="#"
                className="flex-1 border border-gray-600 hover:bg-gray-900 transition-colors font-semibold py-4 px-8 rounded-xl flex items-center justify-center gap-3"
              >
                <Download className="w-6 h-6" /> DOWNLOAD
              </a>
            </div>
          </div>

          {/* Screenshots & Docs (same as before) */}
          <div className="mb-8">
            <h3 className="text-2xl font-semibold mb-4 flex items-center gap-3">
              <Image className="w-6 h-6" /> Screenshots
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {client.screenshots.map((url, idx) => (
                <div key={idx} className="rounded-xl overflow-hidden border border-gray-800">
                  <img src={url} alt={`Screenshot ${idx}`} className="w-full h-auto" />
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-2xl font-semibold mb-4 flex items-center gap-3">
              <FileText className="w-6 h-6" /> Documentation
            </h3>
            {/* ... docs list same as before ... */}
          </div>
        </div>

        {/* Sidebar with Auto Sync */}
        <div className="lg:w-96 flex-shrink-0">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 sticky top-6">
            <h3 className="font-semibold mb-4">Auto Sync</h3>
            {/* Auto sync UI same as before */}
            <div className="space-y-4">
              <input
                type="url"
                placeholder="https://example.com/latest/index.html"
                value={syncUrl}
                onChange={(e) => setSyncUrl(e.target.value)}
                className="w-full bg-black border border-gray-700 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-green-500 font-mono"
              />
              <button
                onClick={handleSync}
                disabled={isSyncing || !syncUrl}
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 disabled:opacity-50 py-3 rounded-lg font-semibold flex items-center justify-center gap-2"
              >
                {isSyncing ? <>Syncing <RefreshCw className="w-4 h-4 animate-spin" /></> : <>Sync Files <RefreshCw className="w-4 h-4" /></>}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Version Upload Modal */}
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
