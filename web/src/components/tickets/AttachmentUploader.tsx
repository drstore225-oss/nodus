import React, { useState, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { Camera, Upload, X, Loader2 } from 'lucide-react';

interface AttachmentUploaderProps {
  ticketId: string;
  onUploaded?: () => void;
  compact?: boolean;
}

export const AttachmentUploader: React.FC<AttachmentUploaderProps> = ({
  ticketId,
  onUploaded,
  compact = false,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const validFiles = files.filter((f) => f.type.startsWith('image/'));
    if (validFiles.length !== files.length) {
      setError('Apenas imagens (JPG, PNG, WEBP) são aceitas.');
    } else {
      setError(null);
    }

    setSelectedFiles((prev) => [...prev, ...validFiles]);
    validFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setPreviewUrls((prev) => [...prev, ev.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });

    // Reset input so same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviewUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (!selectedFiles.length) return;
    setIsUploading(true);
    setError(null);

    try {
      for (const file of selectedFiles) {
        const ext = file.name.split('.').pop() ?? 'jpg';
        const path = `tickets/${ticketId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;

        const { error: storageError } = await supabase.storage
          .from('attachments')
          .upload(path, file, { cacheControl: '3600', upsert: false });

        if (storageError) throw storageError;

        const { data: urlData } = supabase.storage
          .from('attachments')
          .getPublicUrl(path);

        const { error: dbError } = await supabase.from('attachments').insert({
          ticket_id: ticketId,
          file_url: urlData.publicUrl,
          file_name: file.name,
        });

        if (dbError) throw dbError;
      }

      setSelectedFiles([]);
      setPreviewUrls([]);
      onUploaded?.();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao enviar foto.';
      setError(message);
      console.error('Upload error:', err);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Área de preview */}
      {previewUrls.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {previewUrls.map((url, i) => (
            <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-slate-200 bg-slate-100">
              <img src={url} alt={`Preview ${i + 1}`} className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => removeFile(i)}
                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Botões */}
      <div className={`flex ${compact ? 'gap-2' : 'flex-col sm:flex-row gap-3'}`}>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFileSelect}
          capture={undefined}
        />
        {/* Botão câmera (mobile: abre câmera diretamente) */}
        <button
          type="button"
          onClick={() => {
            if (fileInputRef.current) {
              fileInputRef.current.setAttribute('capture', 'environment');
              fileInputRef.current.click();
            }
          }}
          className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-slate-300 text-sm text-slate-600 hover:bg-slate-50 hover:border-blue-400 transition-colors"
        >
          <Camera className="h-4 w-4 text-blue-500" />
          {compact ? 'Câmera' : 'Tirar Foto (Câmera)'}
        </button>
        {/* Botão galeria */}
        <button
          type="button"
          onClick={() => {
            if (fileInputRef.current) {
              fileInputRef.current.removeAttribute('capture');
              fileInputRef.current.click();
            }
          }}
          className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-slate-300 text-sm text-slate-600 hover:bg-slate-50 hover:border-blue-400 transition-colors"
        >
          <Upload className="h-4 w-4 text-slate-400" />
          {compact ? 'Galeria' : 'Selecionar da Galeria'}
        </button>

        {selectedFiles.length > 0 && (
          <button
            type="button"
            onClick={handleUpload}
            disabled={isUploading}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-60"
          >
            {isUploading ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Enviando...</>
            ) : (
              <><Upload className="h-4 w-4" /> Enviar {selectedFiles.length} foto{selectedFiles.length > 1 ? 's' : ''}</>
            )}
          </button>
        )}
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
};
