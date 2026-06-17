// src/pages/ClientDetailPage.tsx
import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Play,
  Download,
  RefreshCw,
  Image as ImageIcon,
  FileText,
  GitBranch,
  Plus,
} from 'lucide-react';
import VersionUploadModal from '../components/VersionUploadModal';

interface Version {
  id: string;
  name: string;
  date: string;
  size: string;
  url: string;
}

interface Document {
  name: string;
  url: string;
}

interface Client {
  name: string;
  description: string;
  screenshots: string[];
  docs: Document[];
  githubRelease?: string;
}

export default function ClientDetailPage() {
  const { contentId } = useParams<{ contentId: string }>();

  const [activeVersion, setActiveVersion] = useState('1.8.8 Stable');
  const [syncUrl, setSyncUrl] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isVersionModalOpen, setIsVersionModalOpen] = useState(false);

  const [versions, setVersions] = useState<Version[]>([
    {
      id: 'v1.0',
      name: '1.8.8 Stable',
      date: '2026-06-01',
      size: '8.2 MB',
      url: '#',
    },
    {
      id: 'v1.1',
      name: '1.8.8 Beta',
      date: '2026-06-10',
      size: '8.5 MB',
      url: '#',
    },
  ]);

  const client: Client = useMemo(
    () => ({
      name: 'Example Client',
      description:
        'High-performance Eaglercraft client with advanced features.',
      screenshots: [
        'https://picsum.photos/id/1015/800/450',
        'https://picsum.photos/id/106/800/450',
        'https://picsum.photos/id/1074/800/450',
      ],
      docs: [
        {
          name: 'Installation Guide.md',
          url: '#',
        },
        {
          name: 'Changelog.txt',
          url: '#',
        },
      ],
      githubRelease:
        'https://github.com/EaglercraftXLauncher/example-client/releases',
    }),
    []
  );

  const selectedVersion =
    versions.find((v) => v.name === activeVersion) ?? versions[0];

  const handleVersionUploaded = (newVersion: Version) => {
    setVersions((prev) => [newVersion, ...prev]);
    setActiveVersion(newVersion.name);
  };

  const handleSync = async () => {
    const trimmed = syncUrl.trim();

    if (!trimmed) return;

    try {
      setIsSyncing(true);

      // Replace with real API call
      await new Promise((resolve) => setTimeout(resolve, 1500));

      setSyncUrl('');
    } finally {
      setIsSyncing(false);
    }
  };

  if (!contentId) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <p className="text-red-400">Invalid client ID.</p>

        <Link
          to="/"
          className="mt-4 inline-flex text-green-400 hover:text-green-300"
        >
          ← Back to Browser
        </Link>
      </div>
    );
  }

  return (
    <>
      <VersionUploadModal
        isOpen={isVersionModalOpen}
        onClose={() => setIsVersionModalOpen(false)}
        contentId={contentId}
        onVersionUploaded={handleVersionUploaded}
      />

      <div className="max-w-6xl mx-auto p-6 space-y-8">
        <Link
          to="/"
          className="inline-flex items-center text-green-400 hover:text-green-300"
        >
          ← Back to Browser
        </Link>

        {/* Header */}
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <h1 className="text-3xl font-bold">{client.name}</h1>

          <p className="mt-3 text-zinc-400">
            {client.description}
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 hover:bg-green-500"
              disabled={!selectedVersion}
            >
              <Play size={18} />
              Launch
            </button>

            {selectedVersion && (
              <a
                href={selectedVersion.url}
                className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 px-4 py-2 hover:bg-zinc-800"
              >
                <Download size={18} />
                Download
              </a>
            )}

            <button
              onClick={() => setIsVersionModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 px-4 py-2 hover:bg-zinc-800"
            >
              <Plus size={18} />
              Upload Version
            </button>
          </div>
        </section>

        {/* Versions */}
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="mb-4 text-xl font-semibold">
            Available Versions
          </h2>

          <div className="space-y-3">
            {versions.map((version) => (
              <button
                key={version.id}
                onClick={() => setActiveVersion(version.name)}
                className={`w-full rounded-xl border p-4 text-left transition ${
                  activeVersion === version.name
                    ? 'border-green-500 bg-zinc-800'
                    : 'border-zinc-800 hover:bg-zinc-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">
                    {version.name}
                  </span>

                  <span className="text-sm text-zinc-400">
                    {version.size}
                  </span>
                </div>

                <div className="mt-2 text-sm text-zinc-500">
                  Released {version.date}
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Sync */}
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold">
            <RefreshCw size={20} />
            Auto Sync
          </h2>

          <div className="flex flex-col gap-3 md:flex-row">
            <input
              type="url"
              value={syncUrl}
              onChange={(e) => setSyncUrl(e.target.value)}
              placeholder="GitHub release URL..."
              className="flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-2 outline-none focus:border-green-500"
            />

            <button
              onClick={handleSync}
              disabled={isSyncing}
              className="rounded-lg bg-green-600 px-5 py-2 disabled:opacity-50"
            >
              {isSyncing ? 'Syncing...' : 'Sync'}
            </button>
          </div>
        </section>

        {/* Screenshots */}
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold">
            <ImageIcon size={20} />
            Screenshots
          </h2>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {client.screenshots.map((src) => (
              <img
                key={src}
                src={src}
                alt={client.name}
                loading="lazy"
                className="aspect-video rounded-xl object-cover"
              />
            ))}
          </div>
        </section>

        {/* Documentation */}
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold">
            <FileText size={20} />
            Documentation
          </h2>

          <div className="space-y-2">
            {client.docs.map((doc) => (
              <a
                key={doc.name}
                href={doc.url}
                className="block rounded-lg border border-zinc-800 p-3 hover:bg-zinc-800"
              >
                {doc.name}
              </a>
            ))}
          </div>
        </section>

        {/* GitHub */}
        {client.githubRelease && (
          <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
            <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold">
              <GitBranch size={20} />
              GitHub Releases
            </h2>

            <a
              href={client.githubRelease}
              target="_blank"
              rel="noreferrer"
              className="text-green-400 hover:text-green-300"
            >
              Open Releases →
            </a>
          </section>
        )}
      </div>
    </>
  );
}
