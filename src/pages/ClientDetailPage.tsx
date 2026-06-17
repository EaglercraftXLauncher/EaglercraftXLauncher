// src/pages/ClientDetailPage.tsx
import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  Play, 
  Download, 
  RefreshCw, 
  Image as ImageIcon, 
  FileText, 
  GitBranch, 
  Plus, 
  ArrowLeft 
} from 'lucide-react';
import VersionUploadModal from '../components/VersionUploadModal';

interface Version {
  id: string;
  name: string;
  date: string;
  size: string;
  url: string;
  downloadCount?: number;
}

interface Screenshot {
  id: string;
  url: string;
  caption?: string;
}

interface Doc {
  id: string;
  name: string;
  url: string;
  type: string;
}

interface ClientData {
  contentId: string;
  name: string;
  description: string;
  githubRepo?: string;
  githubReleaseUrl?: string;
  versions: Version[];
  screenshots: Screenshot[];
  docs: Doc[];
  lastUpdated: string;
  autoSyncUrl?: string;
}

const ClientDetailPage = () => {
  const { contentId } = useParams<{ contentId: string }>();
  const navigate = useNavigate();

  const [client, setClient] = useState<ClientData | null>(null);
  const [activeVersion, setActiveVersion] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncUrl, setSyncUrl] = useState('');
  const [isVersionModalOpen, setIsVersionModalOpen] = useState(false);

  const fetchClientData = useCallback(async () => {
    if (!contentId) return;

    setIsLoading(true);
    setError(null);

    try {
      // TODO: Replace this mock with real API / GitHub fetch
      const mockData: ClientData = {
        contentId: contentId,
        name: "Example Optimized Client",
        description: "High-performance Eaglercraft X client with better FPS, custom shaders, and improved multiplayer stability.",
        githubRepo: "EaglercraftXLauncher/example-client",
        githubReleaseUrl: `https://github.com/EaglercraftXLauncher/example-client/releases`,
        versions: [
          {
            id: "v1.2",
            name: "1.8.8-r2",
            date: "2026-06-15",
            size: "9.1 MB",
            url: "#",
            downloadCount: 1243
          },
          {
            id: "v1.1",
            name: "1.8.8-r1",
            date: "2026-06-08",
            size: "8.7 MB",
            url: "#",
            downloadCount: 875
          },
          {
            id: "v1.0",
            name: "1.8.8",
            date: "2026-05-30",
            size: "8.2 MB",
            url: "#",
            downloadCount: 2150
          }
        ],
        screenshots: [
          { id: "1", url: "https://picsum.photos/id/1015/1280/720", caption: "Main Menu" },
          { id: "2", url: "https://picsum.photos/id/106/1280/720", caption: "In-game" },
          { id: "3", url: "https://picsum.photos/id/1074/1280/720", caption: "Settings" },
        ],
        docs: [
          { id: "1", name: "Installation Guide.md", url: "#", type: "markdown" },
          { id: "2", name: "Changelog.md", url: "#", type: "markdown" },
          { id: "3", name: "Troubleshooting.pdf", url: "#", type: "pdf" },
        ],
        lastUpdated: "2026-06-15T14:30:00Z",
        autoSyncUrl: ""
      };

      setClient(mockData);
      setActiveVersion(mockData.versions[0]?.name || '');
      setSyncUrl(mockData.autoSyncUrl || '');
    } catch (err) {
      setError("Failed to load client details. Please try again.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [contentId]);

  useEffect(() => {
    fetchClientData();
  }, [fetchClientData]);

  const handleVersionUploaded = (newVersion: Version) => {
    if (!client) return;
    setClient({
      ...client,
      versions: [newVersion, ...client.versions]
    });
    setActiveVersion(newVersion.name);
  };

  const handleAutoSync = async () => {
    if (!syncUrl || !client) return;

    setIsSyncing(true);
    try {
      // TODO: Replace with real backend / Cloudflare Worker call
      await new Promise(resolve => setTimeout(resolve, 1600));
      
      alert(`Auto-sync triggered successfully from:\n${syncUrl}`);
      fetchClientData(); // Refresh after sync
    } catch (err) {
      alert("Sync failed. Please check the URL.");
    } finally {
      setIsSyncing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="flex flex-col items-center">
          <RefreshCw className="w-10 h-10 animate-spin text-green-500 mb-4" />
          <p className="text-gray-400">Loading client details...</p>
        </div>
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950 text-center px-6">
        <div>
          <p className="text-red-400 mb-6 text-lg">{error || "Client not found"}</p>
          <button
            onClick={() => navigate('/')}
            className="px-8 py-3 bg-green-600 hover:bg-green-500 rounded-2xl font-medium"
          >
            ← Back to Browser
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-10">
        <Link
          to="/"
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to All Clients
        </Link>
        <div className="text-sm text-gray-500 font-medium">Eaglercraft X Launcher</div>
      </div>

      <div className="flex flex-col lg:flex-row gap-10">
        {/* Main Content */}
        <div className="flex-1 space-y-12">
          {/* Client Header */}
          <div>
            <div className="flex items-center gap-5 mb-6">
              <div className="w-20 h-20 bg-gradient-to-br from-green-500 via-emerald-500 to-teal-600 rounded-3xl flex items-center justify-center text-5xl font-black shadow-2xl">
                E
              </div>
              <div>
                <h1 className="text-5xl font-bold tracking-tighter">{client.name}</h1>
                <p className="text-gray-500 mt-1 font-mono">contentId: {client.contentId}</p>
              </div>
            </div>
            <p className="text-xl text-gray-300 leading-relaxed max-w-3xl">
              {client.description}
            </p>
          </div>

          {/* Versions Section */}
          <div className="bg-gray-900 border border-gray-800 rounded-3xl p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-semibold flex items-center gap-3">
                <GitBranch className="w-8 h-8 text-green-400" />
                Versions
              </h2>
              <button
                onClick={() => setIsVersionModalOpen(true)}
                className="flex items-center gap-2 px-6 py-3 bg-gray-800 hover:bg-gray-700 rounded-2xl text-sm font-medium transition-all"
              >
                <Plus className="w-5 h-5" />
                Add New Version
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {client.versions.map((version) => (
                <button
                  key={version.id}
                  onClick={() => setActiveVersion(version.name)}
                  className={`p-6 rounded-2xl border text-left transition-all group ${
                    activeVersion === version.name
                      ? 'border-green-500 bg-green-950/30'
                      : 'border-gray-700 hover:border-gray-600'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-mono text-2xl font-semibold">{version.name}</div>
                      <div className="text-gray-400 mt-1 text-sm">
                        {version.date} • {version.size}
                      </div>
                    </div>
                    {version.downloadCount && (
                      <div className="text-xs text-gray-500">↓ {version.downloadCount.toLocaleString()}</div>
                    )}
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-8 flex gap-4">
              <a
                href="#"
                className="flex-1 bg-green-600 hover:bg-green-500 active:bg-green-700 transition-all text-white font-semibold py-5 rounded-2xl flex items-center justify-center gap-3 text-lg shadow-lg shadow-green-900/50"
              >
                <Play className="w-6 h-6" />
                LAUNCH {activeVersion}
              </a>
              <a
                href="#"
                className="flex-1 border border-gray-600 hover:bg-gray-800 transition-all font-semibold py-5 rounded-2xl flex items-center justify-center gap-3"
              >
                <Download className="w-6 h-6" />
                DOWNLOAD
              </a>
            </div>
          </div>

          {/* Screenshots */}
          <div>
            <h2 className="text-3xl font-semibold mb-6 flex items-center gap-3">
              <ImageIcon className="w-8 h-8" /> Screenshots
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {client.screenshots.map((shot) => (
                <div key={shot.id} className="rounded-2xl overflow-hidden border border-gray-800 group">
                  <img
                    src={shot.url}
                    alt={shot.caption}
                    className="w-full aspect-video object-cover transition-transform group-hover:scale-105"
                  />
                  {shot.caption && (
                    <div className="p-4 bg-gray-900 text-sm text-gray-400">
                      {shot.caption}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Documentation */}
          <div>
            <h2 className="text-3xl font-semibold mb-6 flex items-center gap-3">
              <FileText className="w-8 h-8" /> Documentation
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {client.docs.map((doc) => (
                <a
                  key={doc.id}
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-4 p-6 bg-gray-900 border border-gray-800 rounded-2xl hover:border-green-600 group transition-colors"
                >
                  <FileText className="w-10 h-10 text-gray-400 group-hover:text-green-400" />
                  <div>
                    <div className="font-medium text-lg">{doc.name}</div>
                    <div className="text-sm text-gray-500 capitalize">{doc.type}</div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar - Auto Sync */}
        <div className="lg:w-96 flex-shrink-0">
          <div className="bg-gray-900 border border-gray-800 rounded-3xl p-8 sticky top-8">
            <h3 className="font-semibold text-xl mb-5">Auto Sync</h3>
            <p className="text-gray-400 text-sm mb-5">
              Provide a URL to automatically sync the latest game files.
            </p>

            <div className="space-y-4">
              <input
                type="url"
                value={syncUrl}
                onChange={(e) => setSyncUrl(e.target.value)}
                placeholder="https://your-domain.com/latest/index.html"
                className="w-full bg-black border border-gray-700 focus:border-green-500 rounded-2xl px-5 py-4 text-sm font-mono focus:outline-none"
              />
              <button
                onClick={handleAutoSync}
                disabled={isSyncing || !syncUrl.trim()}
                className="w-full py-4 bg-gradient-to-r from-green-600 to-emerald-600 disabled:opacity-60 hover:from-green-500 hover:to-emerald-500 rounded-2xl font-semibold flex items-center justify-center gap-3 transition-all"
              >
                {isSyncing ? (
                  <>Syncing <RefreshCw className="w-5 h-5 animate-spin" /></>
                ) : (
                  <>Trigger Auto Sync <RefreshCw className="w-5 h-5" /></>
                )}
              </button>
            </div>

            {client.githubReleaseUrl && (
              <div className="mt-10 pt-6 border-t border-gray-800">
                <p className="text-xs uppercase tracking-widest text-gray-500 mb-2">GitHub Release</p>
                <a
                  href={client.githubReleaseUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-green-400 hover:underline break-all text-sm"
                >
                  {client.githubReleaseUrl}
                </a>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Version Upload Modal */}
      <VersionUploadModal
        isOpen={isVersionModalOpen}
        onClose={() => setIsVersionModalOpen(false)}
        contentId={client.contentId}
        onVersionUploaded={handleVersionUploaded}
      />
    </div>
  );
};

export default ClientDetailPage;
