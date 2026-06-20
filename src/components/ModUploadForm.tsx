// src/components/ModUploadForm.tsx
import { useState } from 'react';

interface ModUploadProps {
  onSuccess: () => void;
}

export default function ModUploadForm({ onSuccess }: ModUploadProps) {
  const [mcVersion, setMcVersion] = useState<"1.8" | "1.12">("1.8");
  const [file, setFile] = useState<File | null>(null);
  // ... other fields

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("kind", "mod");
    formData.append("minecraftVersion", mcVersion);
    formData.append("loader", "eaglerforge");
    // append name, description, etc.

    const res = await fetch('/api/mods', { method: 'POST', body: formData });
    if (res.ok) onSuccess();
  };

  return (
    <form onSubmit={handleSubmit}>
      <input type="file" accept=".js" onChange={e => setFile(e.target.files?.[0] || null)} />
      <select value={mcVersion} onChange={e => setMcVersion(e.target.value as any)}>
        <option value="1.8">Minecraft 1.8</option>
        <option value="1.12">Minecraft 1.12</option>
      </select>
      <button type="submit">Upload Mod (EaglerForge only)</button>
    </form>
  );
}
