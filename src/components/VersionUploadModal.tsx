// src/components/VersionUploadModal.tsx
import { useState } from 'react';
import { X, Upload, GitBranch } from 'lucide-react';

interface VersionUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  contentId: string;
  onVersionUploaded: (version: any) => void;
}

export default function VersionUploadModal({
  isOpen,
  onClose,
  contentId,
  onVersionUploaded,
}: VersionUploadModalProps) {
  const [versionName, setVersionName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  if (!isOpen) return null;

  const handleUpload = async () => {
    if (!versionName || !file) return;

    setIsUploading(true);
    // Simulate upload (replace with real GitHub release asset upload)
    setTimeout(() => {
      const newVersion = {
        id: `v${Date.now()}`,
        name: versionName,
        date: new Date().toISOString().split('T')[0],
        size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
        url: URL.createObjectURL(file),
      };

      onVersionUploaded(newVersion);
      alert(`Version ${versionName} uploaded successfully to ${contentId}!`);
      onClose();
      setVersionName('');
      setFile(null);
      setIsUploading(false);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-lg">
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <GitBranch className="w-6 h-6 text-green-400" />
            <h2 className="text-2xl font-semibold">Upload New Version</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm text-gray-400 mb-2">Version Name (e.g. 1.8.8-r2)</label>
            <input
              type="text"
              value={versionName}
              onChange={(e) => setVersionName(e.target.value)}
              className="w-full bg-black border border-gray-700 rounded-lg px-4 py-3 focus:outline-none focus:border-green-500"
              placeholder="1.8.8-stable"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Game File (index.html / .js / .zip)</label>
            <div className="border-2 border-dashed border-gray-700 rounded-xl p-8 text-center hover:border-green-500 transition-colors">
              <Upload className="w-12 h-12 mx-auto text-gray-500 mb-3" />
              <p className="text-gray-400">Drag & drop or click to upload</p>
              <input
                type="file"
                onChange={(e) => e.target.files && setFile(e.target.files[0])}
                className="hidden"
                id="version-file"
              />
              <label
                htmlFor="version-file"
                className="mt-4 inline-block px-6 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg cursor-pointer text-sm"
              >
                Choose File
              </label>
              {file && <p className="mt-3 text-green-400 text-sm">{file.name}</p>}
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-800 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-gray-700 hover:bg-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={!versionName || !file || isUploading}
            className="flex-1 py-3 bg-green-600 hover:bg-green-500 disabled:opacity-50 rounded-xl font-semibold flex items-center justify-center gap-2"
          >
            {isUploading ? 'Uploading...' : 'Upload Version'}
          </button>
        </div>
      </div>
    </div>
  );
}
