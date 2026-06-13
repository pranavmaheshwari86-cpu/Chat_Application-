import { useEffect, useState } from 'react';
import axios from 'axios';
import Image from 'next/image';
import { ExternalLink } from 'lucide-react';

interface LinkPreviewProps {
  url: string;
}

interface PreviewData {
  url: string;
  title: string;
  description: string;
  image: string;
}

export default function LinkPreview({ url }: LinkPreviewProps) {
  const [data, setData] = useState<PreviewData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchPreview = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
        const res = await axios.get(`${apiUrl}/messages/preview/link`, {
          params: { url }
        });
        if (isMounted && res.data && (res.data.title || res.data.description || res.data.image)) {
          setData(res.data);
        }
      } catch {
        // Silently fail if preview cannot be fetched
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchPreview();
    return () => { isMounted = false; };
  }, [url]);

  if (loading) return null;
  if (!data) return null;

  return (
    <a 
      href={url} 
      target="_blank" 
      rel="noopener noreferrer"
      className="mt-2 block max-w-[400px] overflow-hidden rounded-xl border border-[#40484b]/60 bg-[#191c1e]/40 transition-colors hover:bg-[#191c1e]/60 hover:border-[#40484b]"
    >
      {data.image && (
        <div className="relative h-[200px] w-full bg-black/20">
          <Image 
            src={data.image} 
            alt={data.title || "Link preview"} 
            fill 
            className="object-cover"
            unoptimized
          />
        </div>
      )}
      <div className="p-3">
        <h4 className="line-clamp-1 text-[14px] font-semibold text-[#e1e3e4] mb-1 flex items-center gap-1">
          {data.title || url}
          <ExternalLink className="h-3 w-3 text-[#8a9296]" />
        </h4>
        {data.description && (
          <p className="line-clamp-2 text-[12px] text-[#8a9296]">
            {data.description}
          </p>
        )}
      </div>
    </a>
  );
}
