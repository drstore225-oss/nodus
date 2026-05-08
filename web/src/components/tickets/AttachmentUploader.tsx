import React, { useState, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { Camera, Upload, X, Loader2, CheckCircle2 } from 'lucide-react';

interface AttachmentUploaderProps {
  ticketId: string;
  onUploaded?: () => void;
  compact?: boolean;
  /** Se true, faz upload automático assim que o arquivo é selecionado (sem botão extra) */
  autoUpload?: boolean;
}

async function uploadFile(ticketId: string, file: File): Promise<void> {
  const ext = file.name.split('.').pop() ?? 'jpg';
  const path = `tickets/${ticketId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;

  const { error: storageError } = await supabase.storage
    .from('attachments')
    .upload(path, file, { cacheControl: '3600', upsert: false });

  if (storageError) throw new Error(`Storage: ${storageError.message}`);

  const { data: urlData } = supabase.storage.from('attachments').getPublicUrl(path);

  const { error: dbError } = await supabase.from('attachments').insert({
    ticket_id: ticketId,
    file_url: urlData.publicUrl,
    file_name: file.name,
  });

  if (dbError) throw new Error(`DB: ${dbError.message}`);
}

export const AttachmentUploader: React.FC<AttachmentUploaderProps> = ({
  ticketId,
  onUploaded,
  compact = false,
  autoUpload = false,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadedCount, setUploadedCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const validFiles = files.filter((f) => f.type.startsWith('image/'));
    if (validFiles.length !== files.length) {
      setError('Apenas imagens (JPG, PNG, WEBP) são aceitas.');
    } else {
      setError(null);
    }

    if (fileInputRef.current) fileInputRef.current.value = '';

    if (autoUpload) {
      // Upload imediato — sem preview pendente
      setIsUploading(true);
      try {
        for (const file of validFiles) {
          // Gerar preview local
          const previewUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = (ev) => resolve(ev.target?.result as string);
            reader.readAsDataURL(file);
          });
          setPreviewUrls((prev) => [...prev, previewUrl]);
          await uploadFile(ticketId, file);
          setUploadedCount((c) => c + 1);
        }
        onUploaded?.();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Erro ao enviar foto.';
        setError(message);
        console.error('Upload error:', err);
      } finally {
        setIsUploading(false);
      }
    } else {
      // Modo manual: acumula arquivos e mostra botão de enviar
      setSelectedFiles((prev) => [...prev, ...validFiles]);
      validFiles.forEach((file) => {
        const reader = new FileReader();
        reader.onload = (ev) => {
          setPreviewUrls((prev) => [...prev, ev.target?.result as string]);
        };
        reader.readAsDataURL(file);
      });
    }
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
        await uploadFile(ticketId, file);
        setUploadedCount((c) => c + 1);
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
      {/* Fotos enviadas com sucesso */}
      {uploadedCount > 0 && (
        <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
          <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
          {uploadedCount} foto{uploadedCount > 1 ? 's' : ''} enviada{uploadedCount > 1 ? 's' : ''} com sucesso
        </div>
      )}

      {/* Área de preview */}
      {previewUrls.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {previewUrls.map((url, i) => (
            <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-slate-200 bg-slate-100">
              <img src={url} alt={`Preview ${i + 1}`} className="w-full h-full object-cover" />
              {/* Só mostra botão de remover no modo manual e se não estiver enviando */}
              {!autoUpload && !isUploading && (
                <button
                  type="button"
                  onClick={() => removeFile(i)}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
              {/* Overlay de loading no modo autoUpload */}
              {autoUpload && isUploading && i === previewUrls.length - 1 && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <Loader2 className="h-5 w-5 text-white animate-spin" />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Botões de seleção */}
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
        <button
          type="button"
          disabled={isUploading}
          onClick={() => {
            if (fileInputRef.current) {
              fileInputRef.current.setAttribute('capture', 'environment');
              fileInputRef.current.click();
            }
          }}
          className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-slate-300 text-sm text-slate-600 hover:bg-slate-50 hover:border-blue-400 transition-colors disabled:opacity-60"
        >
          {isUploading ? <Loader2 className="h-4 w-4 animate-spin text-blue-500" /> : <Camera className="h-4 w-4 text-blue-500" />}
          {compact ? 'Câmera' : 'Tirar Foto (Câmera)'}
        </button>
        <button
          type="button"
          disabled={isUploading}
          onClick={() => {
            if (fileInputRef.current) {
              fileInputRef.current.removeAttribute('capture');
              fileInputRef.current.click();
            }
          }}
          className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-slate-300 text-sm text-slate-600 hover:bg-slate-50 hover:border-blue-400 transition-colors disabled:opacity-60"
        >
          <Upload className="h-4 w-4 text-slate-400" />
          {compact ? 'Galeria' : 'Selecionar da Galeria'}
        </button>

        {/* Botão de upload manual (apenas quando não é autoUpload) */}
        {!autoUpload && selectedFiles.length > 0 && (
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

      {error && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
          ⚠️ {error}
        </p>
      )}
    </div>
  );
};
